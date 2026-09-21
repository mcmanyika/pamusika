import {
  isStaffNotificationEvent,
  type StaffNotificationEvent,
} from "@/lib/commerce/events";
import type { AnalyticsEvent, Json } from "@/types/database";

export const STAFF_NOTIFICATION_LIMIT = 30;
export const STAFF_NOTIFICATION_POLL_MS = 20_000;
export const STAFF_NOTIFICATION_SEEN_KEY = "paysell.admin.notifications.seenAt";

export type StaffNotification = {
  id: string;
  eventName: StaffNotificationEvent;
  title: string;
  href: string;
  createdAt: string;
};

export function toStaffNotification(
  event: Pick<AnalyticsEvent, "id" | "event_name" | "created_at" | "metadata">,
): StaffNotification | null {
  if (!isStaffNotificationEvent(event.event_name)) {
    return null;
  }

  return {
    id: event.id,
    eventName: event.event_name,
    title: staffNotificationTitle(event.event_name, event.metadata),
    href: staffNotificationHref(event.event_name),
    createdAt: event.created_at,
  };
}

export function staffNotificationTitle(
  eventName: StaffNotificationEvent,
  metadata: Json | null,
): string {
  const orderNumber = metadataString(metadata, "orderNumber");
  const cropName = metadataString(metadata, "cropName");

  switch (eventName) {
    case "VENDOR_REGISTERED":
      return "New vendor membership";
    case "VENDOR_ACTIVATED":
      return "Vendor membership activated";
    case "VENDOR_SUSPENDED":
      return "Vendor membership suspended";
    case "CUSTOMER_CREATED":
      return "New buyer membership";
    case "CUSTOMER_ACTIVATED":
      return "Buyer account activated";
    case "CUSTOMER_SUSPENDED":
      return "Buyer account suspended";
    case "PRODUCT_CREATED":
      return "New product listed";
    case "ORDER_CONFIRMED":
      return orderNumber ? `New order ${orderNumber}` : "New order";
    case "ORDER_ACCEPTED":
      return orderNumber ? `Order ${orderNumber} accepted` : "Order accepted";
    case "ORDER_DECLINED":
      return orderNumber ? `Order ${orderNumber} declined` : "Order declined";
    case "ORDER_READY":
      return orderNumber ? `Order ${orderNumber} ready` : "Order ready for collection";
    case "ORDER_COMPLETED":
      return orderNumber ? `Order ${orderNumber} completed` : "Order completed";
    case "ORDER_CANCELLED":
      return orderNumber ? `Order ${orderNumber} cancelled` : "Order cancelled";
    case "SUPPORT_REQUESTED":
      return "New support request";
    case "REFERRAL_APPLIED":
      return "Referral code used";
    case "REFERRAL_QUALIFIED":
      return "Referral qualified";
    case "HARVEST_PLAN_CREATED":
      return cropName ? `Harvest plan: ${cropName}` : "New harvest plan";
  }
}

export function staffNotificationHref(eventName: StaffNotificationEvent): string {
  switch (eventName) {
    case "ORDER_CONFIRMED":
    case "ORDER_ACCEPTED":
    case "ORDER_DECLINED":
    case "ORDER_READY":
    case "ORDER_COMPLETED":
    case "ORDER_CANCELLED":
      return "/admin/orders";
    case "VENDOR_REGISTERED":
    case "VENDOR_ACTIVATED":
    case "VENDOR_SUSPENDED":
      return "/admin/vendors";
    case "CUSTOMER_CREATED":
    case "CUSTOMER_ACTIVATED":
    case "CUSTOMER_SUSPENDED":
      return "/admin/customers";
    case "PRODUCT_CREATED":
      return "/admin/products";
    case "SUPPORT_REQUESTED":
      return "/admin/support";
    case "REFERRAL_APPLIED":
    case "REFERRAL_QUALIFIED":
      return "/admin/referrals";
    case "HARVEST_PLAN_CREATED":
      return "/admin/harvest";
  }
}

export function unreadStaffNotifications(
  notifications: StaffNotification[],
  seenAt: string | null,
): StaffNotification[] {
  if (!seenAt) {
    return notifications;
  }
  const seen = Date.parse(seenAt);
  if (Number.isNaN(seen)) {
    return notifications;
  }
  return notifications.filter((notification) => Date.parse(notification.createdAt) > seen);
}

export function mergeStaffNotifications(
  current: StaffNotification[],
  incoming: StaffNotification[],
): StaffNotification[] {
  const byId = new Map<string, StaffNotification>();
  for (const notification of [...incoming, ...current]) {
    byId.set(notification.id, notification);
  }
  return [...byId.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, STAFF_NOTIFICATION_LIMIT);
}

function metadataString(metadata: Json | null, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
