import { toWhatsAppId } from "@/lib/commerce/phone";
import {
  COPY,
  customerOrderUpdateText,
  vendorOrdersText,
  vendorSalesText,
} from "@/lib/conversation/copy";
import { withVendorOrders } from "@/lib/conversation/context";
import { startCompletedOrderRatings } from "@/lib/conversation/handlers/rating";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { orderButtonsReply, textReply } from "@/lib/conversation/replies";
import type { OrderAction } from "@/lib/conversation/input";
import type {
  ConversationEngineDeps,
  ConversationTurn,
  EngineNotification,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { OrderStatus } from "@/types/commerce";
import type { OrderRecord } from "@/lib/services/order.service";
import { isConversationState } from "@/types/conversation";

const OPEN_STATUSES: OrderStatus[] = [
  "PENDING_VENDOR",
  "ACCEPTED",
  "PREPARING",
  "READY",
];

export async function listVendorOrders(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (!turn.identity.userId) {
    return landingFor("VENDOR");
  }

  const orders = await deps.orders.listByVendor(turn.identity.userId, OPEN_STATUSES);
  if (orders.length === 0) {
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(COPY.noVendorOrders)],
    };
  }

  return {
    state: "VENDOR_MENU",
    context: withVendorOrders(turn.context, {
      ids: orders.map((order) => order.id),
      selectedId: undefined,
    }),
    replies: [textReply(vendorOrdersText(orders))],
  };
}

export async function listVendorSales(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (!turn.identity.userId) {
    return landingFor("VENDOR");
  }

  const orders = await deps.orders.listByVendor(turn.identity.userId, ["COMPLETED"]);
  return {
    state: "VENDOR_MENU",
    context: {},
    replies: [textReply(vendorSalesText(orders))],
  };
}

export async function handleVendorOrderPick(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult | null> {
  const ids = turn.context.vendorOrders?.ids ?? [];
  if (ids.length === 0 || turn.input.choice === null) {
    return null;
  }

  const orderId = ids[turn.input.choice - 1];
  if (!orderId) {
    return {
      state: "VENDOR_MENU",
      context: turn.context,
      replies: [textReply("Reply with the number next to an order, or MENU.")],
    };
  }

  const order = await deps.orders.getById(orderId);
  if (!order || order.vendor_id !== turn.identity.userId) {
    return listVendorOrders(turn, deps);
  }

  return {
    state: "VENDOR_MENU",
    context: withVendorOrders(turn.context, { selectedId: order.id }),
    replies: [orderButtonsFor(order)],
  };
}

export async function handleVendorOrderAction(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  action: OrderAction,
): Promise<HandlerResult> {
  if (!turn.identity.userId) {
    return landingFor("VENDOR");
  }

  const order = await resolveOrder(turn, deps, action);
  if (!order) {
    return listVendorOrders(turn, deps);
  }

  if (order.vendor_id !== turn.identity.userId) {
    return {
      state: currentState(turn),
      context: turn.context,
      replies: [textReply("That order does not belong to this business.")],
    };
  }

  let updated: OrderRecord;
  if (action.action === "accept") {
    updated = await deps.orders.accept(order.id);
  } else if (action.action === "decline") {
    updated = await deps.orders.decline(order.id);
  } else if (action.action === "ready") {
    updated = await deps.orders.markReady(order.id);
  } else {
    updated = await deps.orders.complete(order.id);
  }

  const customer = await deps.customers.getById(updated.customer_id);
  const vendor = await deps.vendors.getById(updated.vendor_id);
  const headline = customerHeadline(action.action);
  const notifications: EngineNotification[] = [];

  if (action.action === "complete") {
    const rating = await startCompletedOrderRatings(deps, updated, {
      vendor,
      customer,
      headline,
    });
    if (rating.buyerNotification) {
      notifications.push(rating.buyerNotification);
    } else if (customer) {
      notifications.push({
        waId: toWhatsAppId(customer.whatsapp_number),
        phoneNumber: customer.whatsapp_number,
        replies: [textReply(customerOrderUpdateText(updated, headline))],
      });
    }

    if (rating.vendor) {
      return {
        ...rating.vendor,
        notifications,
      };
    }
  } else if (customer) {
    notifications.push({
      waId: toWhatsAppId(customer.whatsapp_number),
      phoneNumber: customer.whatsapp_number,
      replies: [textReply(customerOrderUpdateText(updated, headline))],
    });
  }

  return {
    state: currentState(turn),
    context: withVendorOrders(turn.context, { selectedId: updated.id }),
    notifications,
    replies: [orderButtonsFor(updated)],
  };
}

async function resolveOrder(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  action: OrderAction,
): Promise<OrderRecord | null> {
  if (action.orderId) {
    return deps.orders.getById(action.orderId);
  }

  if (turn.context.vendorOrders?.selectedId) {
    return deps.orders.getById(turn.context.vendorOrders.selectedId);
  }

  const wanted = statusesFor(action.action);
  const matches = await deps.orders.listByVendor(turn.identity.userId ?? "", wanted);
  if (matches.length === 1) {
    return matches[0] ?? null;
  }

  return null;
}

function statusesFor(action: OrderAction["action"]): OrderStatus[] {
  if (action === "accept" || action === "decline") {
    return ["PENDING_VENDOR"];
  }
  if (action === "ready") {
    return ["ACCEPTED", "PREPARING"];
  }
  return ["READY"];
}

function customerHeadline(action: OrderAction["action"]): string {
  if (action === "accept") return "Your PaySell order was accepted.";
  if (action === "decline") return "Your PaySell order was declined.";
  if (action === "ready") return "Your PaySell order is ready for collection.";
  return "Your PaySell order is completed. Thank you.";
}

function orderButtonsFor(order: OrderRecord) {
  if (order.status === "PENDING_VENDOR") {
    return orderButtonsReply(
      `Order ${order.order_number} is waiting.\n\nACCEPT / DECLINE`,
      order.id,
      ["accept", "decline"],
    );
  }
  if (order.status === "ACCEPTED" || order.status === "PREPARING") {
    return orderButtonsReply(
      `Order ${order.order_number} accepted.\nReply READY when it is ready for collection.`,
      order.id,
      ["ready"],
    );
  }
  if (order.status === "READY") {
    return orderButtonsReply(
      `Order ${order.order_number} is ready.\nReply COMPLETE when the customer has collected it.`,
      order.id,
      ["complete"],
    );
  }
  return textReply(`Order ${order.order_number} is ${order.status}.`);
}

function currentState(turn: ConversationTurn) {
  return isConversationState(turn.session.current_state)
    ? turn.session.current_state
    : "VENDOR_MENU";
}
