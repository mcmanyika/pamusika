import { describe, expect, it } from "vitest";
import { displayPhone, formatMoney, formatPercent, vendorAddressLabel } from "@/lib/admin/format";
import {
  mergeStaffNotifications,
  staffNotificationHref,
  staffNotificationTitle,
  toStaffNotification,
  unreadStaffNotifications,
} from "@/lib/admin/notifications";
import { computeAnalytics, computeOverview } from "@/lib/admin/metrics";
import { canHandleSupport, canManageCategories, canManageCommerce, canMessageUsers, canModerateAccounts, canVerifyUsers, canViewPii } from "@/lib/auth/roles";
import { nextSortState, sortBy, sortByText } from "@/lib/admin/sort";
import { nextAccountStatus } from "@/types/commerce";
import { SupportService } from "@/lib/services/support.service";
import { createMemorySupportStore, trackedAnalytics } from "./helpers/memory";
import type { AnalyticsEvent, Order, Product, SupportTicket, Vendor } from "@/types/database";

const now = new Date("2026-09-19T12:00:00.000Z");

function vendor(id: string, status: Vendor["status"] = "ACTIVE"): Vendor {
  return {
    id,
    vendor_code: `PS-${id}`,
    whatsapp_number: `+26377${id}`,
    first_name: "Tariro",
    last_name: null,
    business_name: "Tariro Fresh",
    primary_category_id: null,
    country: "Zimbabwe",
    province: null,
    city: "Harare",
    area: "Mbare",
    market_name: null,
    preferred_language: "en",
    profile_image_url: null,
    status,
    verification_status: "UNVERIFIED",
    created_at: "2026-09-19T08:00:00.000Z",
    updated_at: "2026-09-19T08:00:00.000Z",
  };
}

function product(id: string, status: Product["status"] = "ACTIVE"): Product {
  return {
    id,
    vendor_id: "v1",
    category_id: null,
    name: "Tomatoes",
    description: null,
    price: "1.00",
    currency: "USD",
    quantity: "20",
    unit: "kg",
    image_url: null,
    status,
    created_at: "2026-09-19T09:00:00.000Z",
    updated_at: "2026-09-19T09:00:00.000Z",
  };
}

function order(patch: Partial<Order> & Pick<Order, "id" | "status" | "total" | "customer_id">): Order {
  return {
    order_number: patch.order_number ?? patch.id,
    vendor_id: "v1",
    subtotal: patch.total,
    delivery_fee: "0.00",
    currency: "USD",
    fulfilment_method: "COLLECTION",
    payment_method: null,
    payment_status: "UNPAID",
    created_at: "2026-09-19T10:00:00.000Z",
    updated_at: "2026-09-19T10:00:00.000Z",
    accepted_at: null,
    ready_at: null,
    completed_at: patch.status === "COMPLETED" ? "2026-09-19T11:00:00.000Z" : null,
    cancelled_at: null,
    ...patch,
  };
}

describe("admin metrics", () => {
  it("counts live overview totals from stored records", () => {
    const stats = computeOverview({
      vendors: [vendor("v1"), vendor("v2", "PENDING")],
      products: [product("p1"), product("p2", "PAUSED")],
      orders: [
        order({ id: "o1", status: "COMPLETED", total: "3.00", customer_id: "c1" }),
        order({ id: "o2", status: "PENDING_VENDOR", total: "2.00", customer_id: "c2" }),
      ],
      now,
    });

    expect(stats).toEqual({
      activeVendors: 1,
      activeProducts: 1,
      ordersToday: 2,
      salesToday: 3,
    });
  });

  it("computes analytics rates without fabricating data", () => {
    const events: AnalyticsEvent[] = [
      {
        id: "e1",
        event_name: "PRODUCT_SEARCHED",
        user_type: "CUSTOMER",
        user_id: "c1",
        metadata: {},
        created_at: "2026-09-18T12:00:00.000Z",
      },
      {
        id: "e2",
        event_name: "ORDER_ACCEPTED",
        user_type: "VENDOR",
        user_id: "v1",
        metadata: {},
        created_at: "2026-09-18T12:00:00.000Z",
      },
    ];

    const snapshot = computeAnalytics({
      vendors: [vendor("v1")],
      products: [product("p1")],
      orders: [
        order({ id: "o1", status: "COMPLETED", total: "3.00", customer_id: "c1" }),
        order({ id: "o2", status: "COMPLETED", total: "5.00", customer_id: "c1" }),
        order({ id: "o3", status: "DECLINED", total: "1.00", customer_id: "c2" }),
        order({ id: "o4", status: "CANCELLED", total: "1.00", customer_id: "c3" }),
      ],
      events,
      now,
    });

    expect(snapshot.registeredVendors).toBe(1);
    expect(snapshot.weeklyActiveVendors).toBe(1);
    expect(snapshot.customerSearches).toBe(1);
    expect(snapshot.ordersCompleted).toBe(2);
    expect(snapshot.grossMerchandiseValue).toBe(8);
    expect(snapshot.averageOrderValue).toBe(4);
    expect(snapshot.repeatCustomers).toBe(1);
    expect(snapshot.vendorAcceptanceRate).toBe(2 / 3);
    expect(snapshot.cancellationRate).toBe(0.25);
    expect(formatPercent(snapshot.vendorAcceptanceRate)).toBe("67%");
    expect(formatMoney(snapshot.grossMerchandiseValue)).toBe("$8.00");
  });
});

describe("admin authorization helpers", () => {
  it("hides phone numbers from analyst roles", () => {
    expect(canViewPii("ANALYST")).toBe(false);
    expect(displayPhone("+263771234567", canViewPii("ANALYST"))).toBe("Hidden");
    expect(displayPhone("+263771234567", canViewPii("SUPPORT"))).toBe("+263771234567");
    expect(
      vendorAddressLabel({
        area: "Warren Park",
        city: "Harare",
        province: null,
        market_name: null,
        country: "Zimbabwe",
      }),
    ).toBe("Warren Park, Harare · Zimbabwe");
  });

  it("restricts product moderation and ticket resolution by role", () => {
    expect(canManageCommerce("OPERATIONS")).toBe(true);
    expect(canManageCommerce("ANALYST")).toBe(false);
    expect(canHandleSupport("SUPPORT")).toBe(true);
    expect(canHandleSupport("ANALYST")).toBe(false);
    expect(canManageCategories("ANALYST")).toBe(true);
    expect(canManageCategories("SUPPORT")).toBe(true);
    expect(canMessageUsers("ANALYST")).toBe(true);
    expect(canMessageUsers("SUPPORT")).toBe(true);
    expect(canVerifyUsers("ANALYST")).toBe(true);
    expect(canVerifyUsers("SUPPORT")).toBe(true);
    expect(canVerifyUsers("CUSTOMER")).toBe(false);
    expect(canModerateAccounts("ANALYST")).toBe(true);
    expect(canModerateAccounts("SUPPORT")).toBe(true);
    expect(nextAccountStatus("ACTIVE")).toBe("SUSPENDED");
    expect(nextAccountStatus("PENDING")).toBe("ACTIVE");
    expect(nextAccountStatus("SUSPENDED")).toBe("ACTIVE");
  });
});

describe("admin table sorting", () => {
  it("toggles direction on the same column and starts ascending on a new column", () => {
    expect(nextSortState({ key: "businessName", dir: "asc" }, "businessName")).toEqual({
      key: "businessName",
      dir: "desc",
    });
    expect(nextSortState({ key: "businessName", dir: "desc" }, "status")).toEqual({
      key: "status",
      dir: "asc",
    });
  });

  it("sorts text columns without mutating the original rows", () => {
    const rows = [{ name: "Tariro" }, { name: "Mbare Market" }, { name: "PaySell Store" }];
    expect(sortByText(rows, (row) => row.name, "asc").map((row) => row.name)).toEqual([
      "Mbare Market",
      "PaySell Store",
      "Tariro",
    ]);
    expect(sortByText(rows, (row) => row.name, "desc").map((row) => row.name)).toEqual([
      "Tariro",
      "PaySell Store",
      "Mbare Market",
    ]);
    expect(rows.map((row) => row.name)).toEqual(["Tariro", "Mbare Market", "PaySell Store"]);
  });

  it("sorts numeric columns by value", () => {
    const rows = [{ price: 10 }, { price: 2 }, { price: 4 }];
    expect(sortBy(rows, (row) => row.price, "asc").map((row) => row.price)).toEqual([2, 4, 10]);
    expect(sortBy(rows, (row) => row.price, "desc").map((row) => row.price)).toEqual([10, 4, 2]);
  });
});

describe("admin notifications", () => {
  it("routes order, membership, and support events to the matching admin pages", () => {
    expect(staffNotificationHref("ORDER_CONFIRMED")).toBe("/admin/orders");
    expect(staffNotificationHref("VENDOR_REGISTERED")).toBe("/admin/vendors");
    expect(staffNotificationHref("CUSTOMER_CREATED")).toBe("/admin/customers");
    expect(staffNotificationHref("CUSTOMER_SUSPENDED")).toBe("/admin/customers");
    expect(staffNotificationTitle("CUSTOMER_SUSPENDED", {})).toBe("Buyer account suspended");
    expect(staffNotificationHref("SUPPORT_REQUESTED")).toBe("/admin/support");
    expect(staffNotificationTitle("ORDER_CONFIRMED", { orderNumber: "PS-1001" })).toBe(
      "New order PS-1001",
    );
    expect(staffNotificationTitle("VENDOR_REGISTERED", {})).toBe("New vendor membership");
    expect(toStaffNotification({
      id: "e1",
      event_name: "PRODUCT_SEARCHED",
      created_at: "2026-09-19T12:00:00.000Z",
      metadata: {},
    })).toBeNull();

    const unread = unreadStaffNotifications(
      [
        {
          id: "n1",
          eventName: "ORDER_CONFIRMED",
          title: "New order",
          href: "/admin/orders",
          createdAt: "2026-09-19T13:00:00.000Z",
        },
        {
          id: "n2",
          eventName: "CUSTOMER_CREATED",
          title: "New buyer membership",
          href: "/admin/customers",
          createdAt: "2026-09-19T11:00:00.000Z",
        },
      ],
      "2026-09-19T12:00:00.000Z",
    );
    expect(unread.map((row) => row.id)).toEqual(["n1"]);

    const merged = mergeStaffNotifications(
      unread,
      [
        {
          id: "n1",
          eventName: "ORDER_CONFIRMED",
          title: "New order",
          href: "/admin/orders",
          createdAt: "2026-09-19T13:00:00.000Z",
        },
      ],
    );
    expect(merged).toHaveLength(1);
  });
});

describe("support tickets", () => {
  it("reuses an open ticket for the same phone instead of duplicating", async () => {
    const tickets: SupportTicket[] = [];
    const { events, tracker } = trackedAnalytics();
    const service = new SupportService(createMemorySupportStore(tickets), tracker);

    const first = await service.open({
      phoneNumber: "+263771234567",
      userType: "UNKNOWN",
      description: "Need help",
    });
    const second = await service.open({
      phoneNumber: "+263771234567",
      userType: "UNKNOWN",
      description: "Still need help",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.ticket.id).toBe(first.ticket.id);
    expect(tickets).toHaveLength(1);
    expect(events).toEqual(["SUPPORT_REQUESTED"]);
  });

  it("marks a ticket resolved", async () => {
    const service = new SupportService(createMemorySupportStore());
    const { ticket } = await service.open({
      phoneNumber: "+263771111111",
      description: "Need help",
    });
    const resolved = await service.update(ticket.id, { status: "RESOLVED" });
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolved_at).toBeTruthy();
  });
});
