import {
  COPY,
  helpReplies,
  productListText,
  vendorMenuReplies,
  vendorProfileText,
} from "@/lib/conversation/copy";
import { showInvite } from "@/lib/conversation/handlers/referrals";
import { openHarvestMenu } from "@/lib/conversation/handlers/harvest";
import { landingFor } from "@/lib/conversation/handlers/shared";
import {
  handleVendorOrderPick,
  listVendorOrders,
  listVendorSales,
} from "@/lib/conversation/handlers/vendor-orders";
import { textReply } from "@/lib/conversation/replies";
import type { ConversationHandler } from "@/lib/conversation/handlers/types";

export const handleVendorMenu: ConversationHandler = async (turn, deps) => {
  const picked = await handleVendorOrderPick(turn, deps);
  if (picked) {
    return picked;
  }

  if (turn.input.greeting || turn.input.menu) {
    return landingFor();
  }

  if (turn.input.help || turn.input.choice === 6) {
    return {
      state: "SUPPORT",
      context: {},
        replies: helpReplies(),
    };
  }

  if (turn.input.choice === 1) {
    const vendor = turn.identity.userId
      ? await deps.vendors.getById(turn.identity.userId)
      : null;
    if (!vendor || vendor.status !== "ACTIVE") {
      return {
        state: "VENDOR_MENU",
        context: {},
        replies: [textReply(COPY.vendorInactive)],
      };
    }

    const categories = await deps.categories.listActive();
    if (categories.length === 0) {
      return {
        state: "VENDOR_MENU",
        context: {},
        replies: [textReply(COPY.noCategories)],
      };
    }

    return {
      state: "ADD_PRODUCT_NAME",
      context: {},
      replies: [textReply(COPY.askProductName)],
    };
  }

  if (turn.input.choice === 2) {
    if (!turn.identity.userId) {
      return landingFor();
    }
    const products = await deps.products.listByVendor(turn.identity.userId);
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(productListText(products))],
    };
  }

  if (turn.input.choice === 3) {
    return listVendorOrders(turn, deps);
  }

  if (turn.input.choice === 4) {
    return listVendorSales(turn, deps);
  }

  if (turn.input.choice === 5) {
    const vendor = turn.identity.userId
      ? await deps.vendors.getById(turn.identity.userId)
      : null;
    if (!vendor) {
      return landingFor();
    }
    const rating = deps.ratings
      ? await deps.ratings.summaryFor("VENDOR", vendor.id)
      : { average: 0, count: 0 };
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(vendorProfileText(vendor, rating))],
    };
  }

  if (turn.input.choice === 7) {
    return showInvite(turn, deps, {
      state: "VENDOR_MENU",
      context: {},
      replies: vendorMenuReplies(),
    });
  }

  if (turn.input.choice === 8) {
    return openHarvestMenu();
  }

  return {
    state: "VENDOR_MENU",
    context: {},
    replies: vendorMenuReplies(),
  };
};
