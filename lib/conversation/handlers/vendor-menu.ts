import {
  COPY,
  helpText,
  productListText,
  vendorMenuText,
  vendorProfileText,
} from "@/lib/conversation/copy";
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

  const firstVisit =
    turn.session.current_state === "NEW" || turn.session.current_state === "MAIN_MENU";
  if (firstVisit && !turn.input.choice && !turn.input.help) {
    return landingFor("VENDOR");
  }

  if (turn.input.help || turn.input.choice === 6) {
    return {
      state: "SUPPORT",
      context: {},
        replies: [textReply(helpText())],
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

    return {
      state: "ADD_PRODUCT_NAME",
      context: {},
      replies: [textReply(COPY.askProductName)],
    };
  }

  if (turn.input.choice === 2) {
    if (!turn.identity.userId) {
      return landingFor("VENDOR");
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
      return landingFor("UNKNOWN");
    }
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(vendorProfileText(vendor))],
    };
  }

  if (turn.input.greeting || turn.input.menu) {
    return landingFor("VENDOR");
  }

  return {
    state: "VENDOR_MENU",
    context: {},
    replies: [textReply(vendorMenuText())],
  };
};
