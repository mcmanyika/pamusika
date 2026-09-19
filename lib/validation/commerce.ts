import { z } from "zod";
import { PRODUCT_UNITS } from "@/types/commerce";

export const registerVendorSchema = z.object({
  whatsappNumber: z.string().min(7),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().optional(),
  businessName: z.string().trim().min(1, "Business name is required"),
  categoryId: z.string().min(1).optional(),
  country: z.string().trim().min(1).default("Zimbabwe"),
  province: z.string().trim().optional(),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  marketName: z.string().trim().optional(),
  preferredLanguage: z.string().trim().min(2).default("en"),
  idempotencyKey: z.string().min(8).optional(),
});

export const updateVendorSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  businessName: z.string().trim().min(1).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  province: z.string().trim().optional(),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  marketName: z.string().trim().optional(),
  preferredLanguage: z.string().trim().min(2).optional(),
  profileImageUrl: z.string().min(1).nullable().optional(),
});

export const upsertCustomerSchema = z.object({
  whatsappNumber: z.string().min(7),
  displayName: z.string().trim().optional(),
  country: z.string().trim().min(1).default("Zimbabwe"),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  preferredLanguage: z.string().trim().min(2).default("en"),
});

export const createCustomerAddressSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().trim().min(1).max(24).default("Home"),
  line1: z.string().trim().min(3, "Address is required"),
  line2: z.string().trim().min(1).optional(),
  area: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  province: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).default("Zimbabwe"),
  isDefault: z.boolean().optional(),
});

export const createProductDraftSchema = z.object({
  vendorId: z.string().min(1),
  name: z.string().trim().min(1, "Product name is required"),
  description: z.string().trim().optional(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.enum(PRODUCT_UNITS),
  price: z.number().positive("Price must be greater than 0"),
  currency: z.string().trim().min(3).default("USD"),
  categoryId: z.string().min(1).optional(),
  imageUrl: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).optional(),
});

export const searchProductsSchema = z.object({
  query: z.string().trim().optional(),
  categoryId: z.string().min(1).optional(),
  area: z.string().trim().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive("Quantity must be greater than 0"),
  fulfilmentMethod: z.enum(["COLLECTION", "DELIVERY"]).default("COLLECTION"),
  deliveryFee: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "MOBILE_MONEY", "OTHER"]).optional(),
  idempotencyKey: z.string().min(8).optional(),
});

export type RegisterVendorInput = z.input<typeof registerVendorSchema>;
export type UpdateVendorInput = z.input<typeof updateVendorSchema>;
export type UpsertCustomerInput = z.input<typeof upsertCustomerSchema>;
export const applyReferralSchema = z.object({
  phoneNumber: z.string().min(7),
  code: z.string().trim().min(4),
});

export type CreateCustomerAddressInput = z.input<typeof createCustomerAddressSchema>;
export type ApplyReferralInput = z.input<typeof applyReferralSchema>;
export type CreateProductDraftInput = z.input<typeof createProductDraftSchema>;
export type SearchProductsInput = z.input<typeof searchProductsSchema>;
export type CreateOrderInput = z.input<typeof createOrderSchema>;
