import { PRODUCT_UNITS } from "@/types/commerce";
import { COPY, productConfirmText, unitMenuText } from "@/lib/conversation/copy";
import { withProduct } from "@/lib/conversation/context";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { parsePositiveNumber, parsePrice, parseUnit } from "@/lib/conversation/input";
import { confirmReply, skipReply, textReply } from "@/lib/conversation/replies";
import type { ConversationHandler, HandlerResult } from "@/lib/conversation/handlers/types";
import type { ProductDraft } from "@/types/conversation";

export const handleAddProduct: ConversationHandler = async (turn, deps) => {
  if (!turn.identity.userId) {
    return landingFor("UNKNOWN");
  }

  const vendor = await deps.vendors.getById(turn.identity.userId);
  if (!vendor || vendor.status !== "ACTIVE") {
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(COPY.vendorInactive)],
    };
  }

  const draft = turn.context.product ?? {};
  const state = turn.session.current_state;

  if (state === "ADD_PRODUCT_NAME") {
    const name = turn.input.raw.trim();
    if (name.length < 2 || turn.input.choice !== null) {
      return {
        state: "ADD_PRODUCT_NAME",
        context: turn.context,
        replies: [textReply(COPY.askProductName)],
      };
    }

    return {
      state: "ADD_PRODUCT_QUANTITY",
      context: withProduct(turn.context, { name }),
      replies: [textReply(COPY.askQuantity)],
    };
  }

  if (state === "ADD_PRODUCT_QUANTITY") {
    const quantity = parsePositiveNumber(turn.input.raw);
    if (!quantity) {
      return {
        state: "ADD_PRODUCT_QUANTITY",
        context: turn.context,
        replies: [textReply(COPY.invalidQuantity)],
      };
    }

    return {
      state: "ADD_PRODUCT_UNIT",
      context: withProduct(turn.context, { quantity }),
      replies: [textReply(unitMenuText())],
    };
  }

  if (state === "ADD_PRODUCT_UNIT") {
    const unit = parseUnit(turn.input.raw);
    if (!unit || !PRODUCT_UNITS.includes(unit)) {
      return {
        state: "ADD_PRODUCT_UNIT",
        context: turn.context,
        replies: [textReply(COPY.invalidUnit)],
      };
    }

    return {
      state: "ADD_PRODUCT_PRICE",
      context: withProduct(turn.context, { unit }),
      replies: [textReply(COPY.askPrice)],
    };
  }

  if (state === "ADD_PRODUCT_PRICE") {
    const price = parsePrice(turn.input.raw);
    if (!price) {
      return {
        state: "ADD_PRODUCT_PRICE",
        context: turn.context,
        replies: [textReply(COPY.invalidPrice)],
      };
    }

    return {
      state: "ADD_PRODUCT_IMAGE",
      context: withProduct(turn.context, { price }),
      replies: [skipReply(COPY.askImage)],
    };
  }

  if (state === "ADD_PRODUCT_IMAGE") {
    const skipped = turn.input.skip || turn.message.type === "image";
    if (!skipped) {
      return {
        state: "ADD_PRODUCT_IMAGE",
        context: turn.context,
        replies: [skipReply(COPY.askImage)],
      };
    }

    const next = withProduct(turn.context, { imageSkipped: true });
    const replies = [confirmReply(productConfirmText(next.product ?? {}))];
    if (turn.message.type === "image") {
      replies.unshift(textReply(COPY.photoLater));
    }

    return {
      state: "ADD_PRODUCT_CONFIRM",
      context: next,
      replies,
    };
  }

  if (state === "ADD_PRODUCT_CONFIRM") {
    if (turn.input.change) {
      return {
        state: "ADD_PRODUCT_NAME",
        context: {},
        replies: [textReply(COPY.askProductName)],
      };
    }

    if (!turn.input.yes) {
      return confirmProduct(draft);
    }

    const created = await deps.products.createDraft({
      vendorId: vendor.id,
      name: draft.name ?? "Product",
      quantity: draft.quantity ?? 1,
      unit: PRODUCT_UNITS.includes(draft.unit as (typeof PRODUCT_UNITS)[number])
        ? (draft.unit as (typeof PRODUCT_UNITS)[number])
        : "item",
      price: draft.price ?? 1,
      categoryId: vendor.primary_category_id ?? undefined,
      idempotencyKey: `product:${turn.session.id}:${draft.name}:${draft.quantity}:${draft.unit}:${draft.price}`,
    });

    const published = await deps.products.publish(created.product.id);

    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(`${COPY.published}\n\n${published.name} is now listed.`)],
    };
  }

  return landingFor("VENDOR");
};

export function continueProductDraft(draft: ProductDraft): HandlerResult {
  if (!draft.name) {
    return {
      state: "ADD_PRODUCT_NAME",
      context: { product: draft },
      replies: [textReply(COPY.askProductName)],
    };
  }

  if (draft.quantity == null) {
    return {
      state: "ADD_PRODUCT_QUANTITY",
      context: { product: draft },
      replies: [textReply(COPY.askQuantity)],
    };
  }

  if (!draft.unit) {
    return {
      state: "ADD_PRODUCT_UNIT",
      context: { product: draft },
      replies: [textReply(unitMenuText())],
    };
  }

  if (draft.price == null) {
    return {
      state: "ADD_PRODUCT_PRICE",
      context: { product: draft },
      replies: [textReply(COPY.askPrice)],
    };
  }

  const next = { ...draft, imageSkipped: true };
  return confirmProduct(next);
}

function confirmProduct(draft: ProductDraft): HandlerResult {
  return {
    state: "ADD_PRODUCT_CONFIRM",
    context: { product: draft },
    replies: [confirmReply(productConfirmText(draft))],
  };
}
