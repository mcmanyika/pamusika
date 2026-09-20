import { toWhatsAppId } from "@/lib/commerce/phone";
import {
  COPY,
  customerMenuReplies,
  ratingPromptReplies,
  ratingThanksText,
  vendorMenuReplies,
} from "@/lib/conversation/copy";
import { toSessionJson, withRating } from "@/lib/conversation/context";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { textReply } from "@/lib/conversation/replies";
import type {
  ConversationEngineDeps,
  ConversationHandler,
  EngineNotification,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { RatingDraft } from "@/types/conversation";
import type { Customer, Vendor } from "@/types/database";
import type { OrderRecord } from "@/lib/services/order.service";

export const handleRating: ConversationHandler = async (turn, deps) => {
  const draft = turn.context.rating;
  if (!draft?.orderId || !draft.raterType) {
    return landingFor(turn.identity.userType);
  }

  if (turn.input.skip) {
    return finishRating(draft.raterType, [textReply(COPY.ratingSkipped)]);
  }

  const score = turn.input.choice;
  if (!score || score < 1 || score > 5 || !deps.ratings) {
    return {
      state: "RATE_ORDER",
      context: withRating(turn.context, draft),
      replies: [textReply(COPY.invalidRating), ...ratingPromptReplies(draft)],
    };
  }

  const { created } = await deps.ratings.submit({
    orderId: draft.orderId,
    raterType: draft.raterType,
    score,
  });

  return finishRating(draft.raterType, [
    textReply(created ? ratingThanksText(score) : COPY.ratingThanks),
  ]);
};

export async function startCompletedOrderRatings(
  deps: ConversationEngineDeps,
  order: OrderRecord,
  extras: { vendor?: Vendor | null; customer?: Customer | null; headline: string },
): Promise<{
  vendor: HandlerResult | null;
  buyerNotification: EngineNotification | null;
}> {
  if (!deps.ratings) {
    return { vendor: null, buyerNotification: null };
  }

  const vendorDraft: RatingDraft = {
    orderId: order.id,
    orderNumber: order.order_number,
    raterType: "VENDOR",
    rateeName: extras.customer?.display_name || "this buyer",
  };
  const buyerDraft: RatingDraft = {
    orderId: order.id,
    orderNumber: order.order_number,
    raterType: "CUSTOMER",
    rateeName: extras.vendor?.business_name || extras.vendor?.vendor_code || "this vendor",
  };

  const [vendorRating, buyerRating] = await Promise.all([
    deps.ratings.getByOrderAndRater(order.id, "VENDOR"),
    deps.ratings.getByOrderAndRater(order.id, "CUSTOMER"),
  ]);

  let buyerNotification: EngineNotification | null = null;
  if (extras.customer && !buyerRating) {
    await openRatingSession(deps, extras.customer.whatsapp_number, "CUSTOMER", extras.customer.id, buyerDraft);
    buyerNotification = {
      waId: toWhatsAppId(extras.customer.whatsapp_number),
      phoneNumber: extras.customer.whatsapp_number,
      replies: ratingPromptReplies(buyerDraft, extras.headline),
    };
  }

  if (vendorRating) {
    return { vendor: null, buyerNotification };
  }

  return {
    vendor: {
      state: "RATE_ORDER",
      context: { rating: vendorDraft },
      replies: ratingPromptReplies(vendorDraft, `Order ${order.order_number} is completed.`),
    },
    buyerNotification,
  };
}

async function openRatingSession(
  deps: ConversationEngineDeps,
  phoneNumber: string,
  userType: "CUSTOMER" | "VENDOR",
  userId: string,
  draft: RatingDraft,
) {
  const session = await deps.conversations.getOrCreateActive({
    phoneNumber,
    userType,
    userId,
  });
  await deps.conversations.setState(session.id, "RATE_ORDER", toSessionJson({ rating: draft }));
}

function finishRating(raterType: "CUSTOMER" | "VENDOR", replies: HandlerResult["replies"]): HandlerResult {
  if (raterType === "VENDOR") {
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [...replies, ...vendorMenuReplies()],
    };
  }

  return {
    state: "CUSTOMER_MENU",
    context: {},
    replies: [...replies, ...customerMenuReplies()],
  };
}
