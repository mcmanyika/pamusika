import { isCommerceError } from "@/lib/commerce/errors";
import { parseSessionContext, toSessionJson } from "@/lib/conversation/context";
import { COPY } from "@/lib/conversation/copy";
import { referralResultText } from "@/lib/conversation/handlers/referrals";
import { landingFor, showHelp } from "@/lib/conversation/handlers/shared";
import { normalizeInput, parseOrderAction } from "@/lib/conversation/input";
import { parseReferralCode } from "@/lib/services/referral.service";
import { applyInterpretedIntent, shouldInterpretIntent } from "@/lib/conversation/intent";
import { getHandler, resolveState } from "@/lib/conversation/router";
import { handleVendorOrderAction } from "@/lib/conversation/handlers/vendor-orders";
import { textReply } from "@/lib/conversation/replies";
import type {
  ConversationEngineDeps,
  ConversationIdentity,
  ConversationTurn,
  EngineNotification,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { ConversationSession } from "@/types/database";
import type { EngineReply, WhatsAppInboundMessage } from "@/types/whatsapp";

export type { ConversationIdentity, ConversationEngineDeps } from "@/lib/conversation/handlers/types";

export type ConversationEngineResult = {
  session: ConversationSession;
  identity: ConversationIdentity;
  replies: EngineReply[];
  notifications: EngineNotification[];
};

export class ConversationEngine {
  constructor(private readonly deps: ConversationEngineDeps) {}

  async handle(message: WhatsAppInboundMessage): Promise<ConversationEngineResult> {
    let identity = await this.identify(message.phoneNumber);
    let session = await this.deps.conversations.getOrCreateActive({
      phoneNumber: message.phoneNumber,
      userType: identity.userType,
      userId: identity.userId,
    });

    const state = resolveState(session.current_state, identity.userType);
    const allowImage = state === "ADD_PRODUCT_IMAGE" && message.type === "image";
    if (!message.supported && !allowImage) {
      return {
        session,
        identity,
        replies: [textReply(COPY.unsupported)],
        notifications: [],
      };
    }

    const input = normalizeInput(message);
    const context = parseSessionContext(session.context_json);
    const suspendedCopy = await this.suspendedAccountCopy(identity);

    if (suspendedCopy && input.help) {
      const landed = showHelp();
      session = await this.persist(session.id, landed, identity);
      return { session, identity, replies: landed.replies, notifications: [] };
    }

    if (suspendedCopy) {
      const blocked = {
        state,
        context,
        replies: [textReply(suspendedCopy)],
      };
      session = await this.persist(session.id, blocked, identity);
      return { session, identity, replies: blocked.replies, notifications: [] };
    }

    if (input.menu && state !== "NEW") {
      const landed = landingFor(identity.userType);
      session = await this.persist(session.id, landed, identity);
      return { session, identity, replies: landed.replies, notifications: [] };
    }

    if (input.help && !state.startsWith("VENDOR_REGISTRATION") && !state.startsWith("ADD_PRODUCT") && !state.startsWith("SEARCH") && !state.startsWith("ORDER_") && !state.startsWith("RATE_") && !state.startsWith("HARVEST")) {
      const landed = showHelp();
      session = await this.persist(session.id, landed, identity);
      return { session, identity, replies: landed.replies, notifications: [] };
    }

    const referralCode = parseReferralCode(input.raw);
    let referralNote: string | null = null;
    if (referralCode && this.deps.referrals) {
      const applied = await this.deps.referrals.applyCode({
        phoneNumber: message.phoneNumber,
        code: referralCode,
      });
      referralNote = referralResultText(applied);
      if (isReferralOnlyMessage(input.raw)) {
        const landed = landingFor();
        session = await this.persist(session.id, landed, identity);
        return {
          session,
          identity,
          replies: [textReply(referralNote), ...landed.replies],
          notifications: [],
        };
      }
    }

    const handler = getHandler(state);
    let result: HandlerResult;
    const orderAction =
      identity.userType === "VENDOR" ? parseOrderAction(input) : null;
    const turn: ConversationTurn = {
      message,
      session: { ...session, current_state: state },
      identity,
      context,
      input,
    };

    try {
      if (orderAction) {
        result = await handleVendorOrderAction(turn, this.deps, orderAction);
      } else {
        let applied: HandlerResult | null = null;
        if (this.deps.intent && shouldInterpretIntent(input, state)) {
          const interpreted = await this.deps.intent.interpret({
            text: input.raw,
            userType: identity.userType,
            state,
          });
          if (interpreted) {
            applied = await applyInterpretedIntent(turn, this.deps, interpreted);
          }
        }
        result = applied ?? (await handler(turn, this.deps));
      }
    } catch (error) {
      if (isCommerceError(error)) {
        result = {
          state,
          context,
          replies: [textReply(error.message)],
        };
      } else {
        throw error;
      }
    }

    if (result.identity) {
      identity = result.identity;
    }

    session = await this.persist(session.id, result, identity);
    return {
      session,
      identity,
      replies: referralNote ? [textReply(referralNote), ...result.replies] : result.replies,
      notifications: result.notifications ?? [],
    };
  }

  private async persist(
    sessionId: string,
    result: HandlerResult,
    identity: ConversationIdentity,
  ): Promise<ConversationSession> {
    let session = await this.deps.conversations.setState(
      sessionId,
      result.state,
      toSessionJson(result.context),
    );

    if (identity.userId) {
      session = await this.deps.conversations.attachUser(
        sessionId,
        identity.userType,
        identity.userId,
      );
    }

    return session;
  }

  private async identify(phoneNumber: string): Promise<ConversationIdentity> {
    const vendor = await this.deps.vendors.getByWhatsapp(phoneNumber);
    if (vendor) {
      return { userType: "VENDOR", userId: vendor.id };
    }

    const customer = await this.deps.customers.getByWhatsapp(phoneNumber);
    if (customer) {
      return { userType: "CUSTOMER", userId: customer.id };
    }

    return { userType: "UNKNOWN", userId: null };
  }

  private async suspendedAccountCopy(identity: ConversationIdentity): Promise<string | null> {
    if (identity.userType === "VENDOR" && identity.userId) {
      const vendor = await this.deps.vendors.getById(identity.userId);
      if (vendor && (vendor.status === "SUSPENDED" || vendor.status === "INACTIVE")) {
        return COPY.vendorSuspended;
      }
    }

    if (identity.userType === "CUSTOMER" && identity.userId) {
      const customer = await this.deps.customers.getById(identity.userId);
      if (customer?.status === "SUSPENDED") {
        return COPY.customerSuspended;
      }
    }

    return null;
  }
}

function isReferralOnlyMessage(value: string): boolean {
  return /^(ref(?:er(?:ral)?)?[\s:-]*)?ps[-]?r[a-z0-9]{5,8}$/i.test(value.trim());
}
