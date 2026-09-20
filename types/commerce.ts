export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "OPERATIONS",
  "SUPPORT",
  "ANALYST",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const VENDOR_STATUSES = [
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE",
] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const CUSTOMER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export function isCustomerStatus(value: string): value is CustomerStatus {
  return CUSTOMER_STATUSES.includes(value as CustomerStatus);
}

export function nextAccountStatus(status: string): "ACTIVE" | "SUSPENDED" {
  return status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
}

export const VERIFICATION_STATUSES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export function isVerificationStatus(value: string): value is VerificationStatus {
  return VERIFICATION_STATUSES.includes(value as VerificationStatus);
}

export const PRODUCT_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "OUT_OF_STOCK",
  "PAUSED",
  "REMOVED",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export function isProductStatus(value: string): value is ProductStatus {
  return PRODUCT_STATUSES.includes(value as ProductStatus);
}

export const CATEGORY_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const ORDER_STATUSES = [
  "PENDING_VENDOR",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FULFILMENT_METHODS = ["COLLECTION", "DELIVERY"] as const;

export type FulfilmentMethod = (typeof FULFILMENT_METHODS)[number];

export const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "OTHER"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PRODUCT_UNITS = [
  "kg",
  "item",
  "bundle",
  "bag",
  "box",
  "other",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const USER_TYPES = ["VENDOR", "CUSTOMER", "UNKNOWN"] as const;

export type UserType = (typeof USER_TYPES)[number];

export const REFERRAL_OWNER_TYPES = ["CUSTOMER", "VENDOR"] as const;

export type ReferralOwnerType = (typeof REFERRAL_OWNER_TYPES)[number];

export const REFERRAL_STATUSES = ["PENDING", "QUALIFIED", "REJECTED"] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];
