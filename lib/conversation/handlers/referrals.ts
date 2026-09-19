import { COPY, inviteText } from "@/lib/conversation/copy";
import { textReply } from "@/lib/conversation/replies";
import type {
  ConversationEngineDeps,
  ConversationIdentity,
  ConversationTurn,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { ApplyReferralResult } from "@/lib/services/referral.service";
import type { ReferralOwnerType } from "@/types/commerce";

export function referralResultText(result: ApplyReferralResult): string {
  if (result.status === "applied") {
    return COPY.referralApplied;
  }
  if (result.status === "already") {
    return COPY.referralAlready;
  }
  if (result.status === "self") {
    return COPY.referralSelf;
  }
  if (result.status === "registered") {
    return COPY.referralRegistered;
  }
  return COPY.referralInvalid;
}

export async function showInvite(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  back: HandlerResult,
): Promise<HandlerResult> {
  if (!deps.referrals) {
    return back;
  }

  const owner = await resolveInviteOwner(turn, deps);
  if (!owner) {
    return {
      ...back,
      replies: [textReply("Start as a buyer or vendor first, then invite friends.")],
    };
  }

  if (owner.userType === "UNKNOWN" || !owner.userId) {
    return {
      ...back,
      replies: [textReply("Start as a buyer or vendor first, then invite friends.")],
    };
  }

  const stats = await deps.referrals.stats(owner.userType, owner.userId);
  return {
    ...back,
    identity: owner,
    replies: [textReply(inviteText(stats.code.code, stats.qualified, stats.total))],
  };
}

export async function syncReferralIdentity(
  deps: ConversationEngineDeps,
  phoneNumber: string,
  userType: ReferralOwnerType,
  userId: string,
): Promise<void> {
  await deps.referrals?.attachReferee(phoneNumber, userType, userId);
}

export async function qualifyReferral(
  deps: ConversationEngineDeps,
  phoneNumber: string,
  userType: ReferralOwnerType,
  userId: string,
): Promise<void> {
  await deps.referrals?.qualify(phoneNumber, userType, userId);
}

async function resolveInviteOwner(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<ConversationIdentity | null> {
  if (turn.identity.userType === "VENDOR" && turn.identity.userId) {
    return { userType: "VENDOR", userId: turn.identity.userId };
  }

  const { customer } = await deps.customers.getOrCreate({
    whatsappNumber: turn.message.phoneNumber,
    displayName: turn.message.contactName ?? undefined,
  });
  await syncReferralIdentity(deps, turn.message.phoneNumber, "CUSTOMER", customer.id);
  return { userType: "CUSTOMER", userId: customer.id };
}
