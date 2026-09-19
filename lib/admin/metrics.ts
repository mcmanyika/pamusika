import { parseDecimal } from "@/lib/commerce/money";
import type { AnalyticsEvent, Order, Product, SupportTicket, Vendor } from "@/types/database";

export type OverviewStats = {
  activeVendors: number;
  activeProducts: number;
  ordersToday: number;
  salesToday: number;
};

export type AnalyticsSnapshot = {
  registeredVendors: number;
  weeklyActiveVendors: number;
  activeProducts: number;
  customerSearches: number;
  ordersCreated: number;
  ordersCompleted: number;
  grossMerchandiseValue: number;
  averageOrderValue: number;
  repeatCustomers: number;
  vendorAcceptanceRate: number;
  cancellationRate: number;
};

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function computeOverview(input: {
  vendors: Vendor[];
  products: Product[];
  orders: Array<Pick<Order, "created_at" | "status" | "total" | "completed_at">>;
  now?: Date;
}): OverviewStats {
  const now = input.now ?? new Date();
  const today = startOfUtcDay(now).toISOString();

  const ordersToday = input.orders.filter((order) => order.created_at >= today);
  const salesToday = input.orders.filter(
    (order) => order.status === "COMPLETED" && (order.completed_at ?? "") >= today,
  );

  return {
    activeVendors: input.vendors.filter((vendor) => vendor.status === "ACTIVE").length,
    activeProducts: input.products.filter((product) => product.status === "ACTIVE").length,
    ordersToday: ordersToday.length,
    salesToday: salesToday.reduce((sum, order) => sum + parseDecimal(order.total, "total"), 0),
  };
}

export function computeAnalytics(input: {
  vendors: Vendor[];
  products: Product[];
  orders: Array<Pick<Order, "id" | "customer_id" | "status" | "total">>;
  events: AnalyticsEvent[];
  now?: Date;
}): AnalyticsSnapshot {
  const now = input.now ?? new Date();
  const weekStart = daysAgo(now, 7).toISOString();
  const completed = input.orders.filter((order) => order.status === "COMPLETED");
  const gmv = completed.reduce((sum, order) => sum + parseDecimal(order.total, "total"), 0);
  const declined = input.orders.filter((order) => order.status === "DECLINED").length;
  const accepted = input.orders.filter((order) =>
    ["ACCEPTED", "PREPARING", "READY", "COMPLETED"].includes(order.status),
  ).length;
  const decided = accepted + declined;
  const cancelled = input.orders.filter((order) => order.status === "CANCELLED").length;
  const completedByCustomer = new Map<string, number>();
  for (const order of completed) {
    completedByCustomer.set(order.customer_id, (completedByCustomer.get(order.customer_id) ?? 0) + 1);
  }

  const weeklyVendorIds = new Set(
    input.events
      .filter((event) => event.user_type === "VENDOR" && event.user_id && event.created_at >= weekStart)
      .map((event) => event.user_id as string),
  );

  return {
    registeredVendors: input.vendors.length,
    weeklyActiveVendors: weeklyVendorIds.size,
    activeProducts: input.products.filter((product) => product.status === "ACTIVE").length,
    customerSearches: input.events.filter((event) => event.event_name === "PRODUCT_SEARCHED").length,
    ordersCreated: input.orders.length,
    ordersCompleted: completed.length,
    grossMerchandiseValue: gmv,
    averageOrderValue: completed.length > 0 ? gmv / completed.length : 0,
    repeatCustomers: [...completedByCustomer.values()].filter((count) => count >= 2).length,
    vendorAcceptanceRate: decided > 0 ? accepted / decided : 0,
    cancellationRate: input.orders.length > 0 ? cancelled / input.orders.length : 0,
  };
}

export function recentItems<T extends { created_at: string }>(items: T[], limit = 8): T[] {
  return [...items]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export function openTickets(tickets: SupportTicket[]): SupportTicket[] {
  return tickets.filter((ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS");
}
