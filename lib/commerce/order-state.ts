import { CommerceError } from "@/lib/commerce/errors";
import type { OrderStatus } from "@/types/commerce";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_VENDOR: ["ACCEPTED", "DECLINED", "CANCELLED"],
  ACCEPTED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

export const ORDER_TIMESTAMP_FIELDS: Partial<
  Record<OrderStatus, "accepted_at" | "ready_at" | "completed_at" | "cancelled_at">
> = {
  ACCEPTED: "accepted_at",
  READY: "ready_at",
  COMPLETED: "completed_at",
  DECLINED: "cancelled_at",
  CANCELLED: "cancelled_at",
};

export function isOrderStatus(value: string): value is OrderStatus {
  return value in ALLOWED_TRANSITIONS;
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) {
    return;
  }

  if (!canTransitionOrder(from, to)) {
    throw new CommerceError(
      "INVALID_ORDER_TRANSITION",
      `Order cannot move from ${from} to ${to}`,
    );
  }
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
