import { COPY, customerMenuReply, customerOrdersText, helpReply, mainMenuReply } from "@/lib/conversation/copy";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { handleVendorMenu } from "@/lib/conversation/handlers/vendor-menu";
import { textReply } from "@/lib/conversation/replies";
import type { ConversationHandler } from "@/lib/conversation/handlers/types";

export const handleMainMenu: ConversationHandler = async (turn, deps) => {
  if (turn.identity.userType === "VENDOR") {
    return handleVendorMenu(turn, deps);
  }

  const firstVisit = turn.session.current_state === "NEW";
  if (firstVisit && !turn.input.choice && !turn.input.help) {
    return landingFor("UNKNOWN");
  }

  if (turn.input.help || turn.input.choice === 4) {
    return {
      state: "SUPPORT",
      context: {},
        replies: [helpReply()],
    };
  }

  if (turn.input.choice === 1) {
    return {
      state: "CUSTOMER_MENU",
      context: {},
      replies: [customerMenuReply()],
    };
  }

  if (turn.input.choice === 2) {
    return {
      state: "VENDOR_REGISTRATION_NAME",
      context: {},
      replies: [textReply(COPY.askName)],
    };
  }

  if (turn.input.choice === 3) {
    if (turn.identity.userType === "CUSTOMER" && turn.identity.userId) {
      const orders = await deps.orders.listByCustomer(turn.identity.userId);
      return {
        state: "MAIN_MENU",
        context: {},
        replies: [textReply(customerOrdersText(orders))],
      };
    }

    return {
      state: "MAIN_MENU",
      context: {},
      replies: [textReply(COPY.noOrders)],
    };
  }

  if (turn.input.greeting || turn.input.menu) {
    return landingFor("UNKNOWN");
  }

  return {
    state: "MAIN_MENU",
    context: {},
    replies: [mainMenuReply()],
  };
};
