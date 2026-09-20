"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canHandleSupport, canManageCategories, canManageCommerce, canMessageUsers, canModerateAccounts, canVerifyUsers } from "@/lib/auth/roles";
import { sendStaffWhatsApp, STAFF_WHATSAPP_MAX_CHARS } from "@/lib/admin/staff-whatsapp";
import { isCommerceError } from "@/lib/commerce/errors";
import { createAuditService } from "@/lib/services/audit.service";
import { createCategoryService } from "@/lib/services/category.service";
import { createCustomerService } from "@/lib/services/customer.service";
import { createMessageLogService } from "@/lib/services/message-log.service";
import { createProductService } from "@/lib/services/product.service";
import { createSupportService } from "@/lib/services/support.service";
import { createVendorService } from "@/lib/services/vendor.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { parseUuid } from "@/lib/validation/ids";
import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { isWhatsAppError } from "@/lib/whatsapp/errors";
import { isCustomerStatus, isProductStatus, isVerificationStatus, type CategoryStatus, type VendorStatus } from "@/types/commerce";

async function adminWriteClient() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  return { profile, supabase, audit: createAuditService(supabase) };
}

function deny(operation: string, userId: string) {
  logger.warn({ operation, result: "denied", userId });
}

function fail(operation: string, error: unknown) {
  unstable_rethrow(error);
  logger.error({
    operation,
    result: "failed",
    error: error instanceof Error ? error.message : "unknown",
  });
}

export async function setProductStatusAction(formData: FormData): Promise<void> {
  try {
    const { profile } = await requireAdmin();
    if (!canModerateAccounts(profile.role)) {
      deny("set_product_status", profile.id);
      return;
    }
    const productId = parseUuid(formData.get("productId"));
    const status = String(formData.get("status") ?? "");
    if (!productId || !isProductStatus(status)) {
      return;
    }
    const admin = createAdminClient();
    const products = createProductService(admin);
    const before = await products.getById(productId);
    const after = await products.setStatus(productId, status);
    await createAuditService(admin).record({
      adminUserId: profile.id,
      action: "SET_PRODUCT_STATUS",
      entityType: "products",
      entityId: productId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
  } catch (error) {
    fail("set_product_status", error);
  }
}

export async function pauseProductAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCommerce(profile.role)) {
      deny("pause_product", profile.id);
      return;
    }
    const productId = parseUuid(formData.get("productId"));
    if (!productId) {
      return;
    }
    const products = createProductService(supabase);
    const before = await products.getById(productId);
    const after = await products.pause(productId);
    await audit.record({
      adminUserId: profile.id,
      action: "PAUSE_PRODUCT",
      entityType: "products",
      entityId: productId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/products");
  } catch (error) {
    fail("pause_product", error);
  }
}

export async function reactivateProductAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCommerce(profile.role)) {
      deny("reactivate_product", profile.id);
      return;
    }
    const productId = parseUuid(formData.get("productId"));
    if (!productId) {
      return;
    }
    const products = createProductService(supabase);
    const before = await products.getById(productId);
    const after = await products.reactivate(productId);
    await audit.record({
      adminUserId: profile.id,
      action: "REACTIVATE_PRODUCT",
      entityType: "products",
      entityId: productId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/products");
  } catch (error) {
    fail("reactivate_product", error);
  }
}

export async function removeProductAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCommerce(profile.role)) {
      deny("remove_product", profile.id);
      return;
    }
    const productId = parseUuid(formData.get("productId"));
    if (!productId) {
      return;
    }
    const products = createProductService(supabase);
    const before = await products.getById(productId);
    const after = await products.remove(productId);
    await audit.record({
      adminUserId: profile.id,
      action: "REMOVE_PRODUCT",
      entityType: "products",
      entityId: productId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
  } catch (error) {
    fail("remove_product", error);
  }
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCategories(profile.role)) {
      deny("create_category", profile.id);
      return;
    }
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) {
      return;
    }
    const categories = createCategoryService(supabase);
    const created = await categories.create({ name });
    await audit.record({
      adminUserId: profile.id,
      action: "CREATE_CATEGORY",
      entityType: "categories",
      entityId: created.id,
      newValue: created,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
  } catch (error) {
    fail("create_category", error);
  }
}

export async function renameCategoryAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCategories(profile.role)) {
      deny("rename_category", profile.id);
      return;
    }
    const categoryId = parseUuid(formData.get("categoryId"));
    const name = String(formData.get("name") ?? "").trim();
    if (!categoryId || name.length < 2) {
      return;
    }
    const categories = createCategoryService(supabase);
    const before = await categories.getById(categoryId);
    const after = await categories.update(categoryId, { name });
    await audit.record({
      adminUserId: profile.id,
      action: "RENAME_CATEGORY",
      entityType: "categories",
      entityId: categoryId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
  } catch (error) {
    fail("rename_category", error);
  }
}

export async function setCategoryStatusAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCategories(profile.role)) {
      deny("set_category_status", profile.id);
      return;
    }
    const categoryId = parseUuid(formData.get("categoryId"));
    const status = String(formData.get("status") ?? "") as CategoryStatus;
    if (!categoryId || (status !== "ACTIVE" && status !== "INACTIVE")) {
      return;
    }
    const categories = createCategoryService(supabase);
    const before = await categories.getById(categoryId);
    const after = await categories.update(categoryId, { status });
    await audit.record({
      adminUserId: profile.id,
      action: status === "INACTIVE" ? "DEACTIVATE_CATEGORY" : "ACTIVATE_CATEGORY",
      entityType: "categories",
      entityId: categoryId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
  } catch (error) {
    fail("set_category_status", error);
  }
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCategories(profile.role)) {
      deny("delete_category", profile.id);
      return;
    }
    const categoryId = parseUuid(formData.get("categoryId"));
    if (!categoryId) {
      return;
    }
    const categories = createCategoryService(supabase);
    const before = await categories.getById(categoryId);
    const after = await categories.delete(categoryId);
    await audit.record({
      adminUserId: profile.id,
      action: "DELETE_CATEGORY",
      entityType: "categories",
      entityId: categoryId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
  } catch (error) {
    fail("delete_category", error);
  }
}

export async function setVendorStatusAction(formData: FormData): Promise<void> {
  try {
    const { profile } = await requireAdmin();
    if (!canModerateAccounts(profile.role)) {
      deny("set_vendor_status", profile.id);
      return;
    }
    const vendorId = parseUuid(formData.get("vendorId"));
    const status = String(formData.get("status") ?? "") as VendorStatus;
    if (!vendorId || (status !== "ACTIVE" && status !== "SUSPENDED")) {
      return;
    }
    const admin = createAdminClient();
    const vendors = createVendorService(admin);
    const before = await vendors.getById(vendorId);
    const after = await vendors.setStatus(vendorId, status);
    await createAuditService(admin).record({
      adminUserId: profile.id,
      action: status === "SUSPENDED" ? "SUSPEND_VENDOR" : "ACTIVATE_VENDOR",
      entityType: "vendors",
      entityId: vendorId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/${vendorId}`);
  } catch (error) {
    fail("set_vendor_status", error);
  }
}

export async function setVendorVerificationAction(formData: FormData): Promise<void> {
  try {
    const { profile } = await requireAdmin();
    if (!canVerifyUsers(profile.role)) {
      deny("set_vendor_verification", profile.id);
      return;
    }
    const vendorId = parseUuid(formData.get("vendorId"));
    const status = String(formData.get("verification") ?? "");
    if (!vendorId || !isVerificationStatus(status)) {
      return;
    }
    const admin = createAdminClient();
    const vendors = createVendorService(admin);
    const before = await vendors.getById(vendorId);
    const after = await vendors.setVerification(vendorId, status);
    await createAuditService(admin).record({
      adminUserId: profile.id,
      action: "SET_VENDOR_VERIFICATION",
      entityType: "vendors",
      entityId: vendorId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/${vendorId}`);
  } catch (error) {
    fail("set_vendor_verification", error);
  }
}

export async function setCustomerVerificationAction(formData: FormData): Promise<void> {
  try {
    const { profile } = await requireAdmin();
    if (!canVerifyUsers(profile.role)) {
      deny("set_customer_verification", profile.id);
      return;
    }
    const customerId = parseUuid(formData.get("customerId"));
    const status = String(formData.get("verification") ?? "");
    if (!customerId || !isVerificationStatus(status)) {
      return;
    }
    const admin = createAdminClient();
    const customers = createCustomerService(admin);
    const before = await customers.getById(customerId);
    const after = await customers.setVerification(customerId, status);
    await createAuditService(admin).record({
      adminUserId: profile.id,
      action: "SET_CUSTOMER_VERIFICATION",
      entityType: "customers",
      entityId: customerId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/customers");
  } catch (error) {
    fail("set_customer_verification", error);
  }
}

export async function setCustomerStatusAction(formData: FormData): Promise<void> {
  try {
    const { profile } = await requireAdmin();
    if (!canModerateAccounts(profile.role)) {
      deny("set_customer_status", profile.id);
      return;
    }
    const customerId = parseUuid(formData.get("customerId"));
    const status = String(formData.get("status") ?? "");
    if (!customerId || !isCustomerStatus(status)) {
      return;
    }
    const admin = createAdminClient();
    const customers = createCustomerService(admin);
    const before = await customers.getById(customerId);
    const after = await customers.setStatus(customerId, status);
    await createAuditService(admin).record({
      adminUserId: profile.id,
      action: status === "SUSPENDED" ? "SUSPEND_CUSTOMER" : "ACTIVATE_CUSTOMER",
      entityType: "customers",
      entityId: customerId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/customers");
  } catch (error) {
    fail("set_customer_status", error);
  }
}

export async function resolveTicketAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canHandleSupport(profile.role)) {
      deny("resolve_ticket", profile.id);
      return;
    }
    const ticketId = parseUuid(formData.get("ticketId"));
    if (!ticketId) {
      return;
    }
    const support = createSupportService(supabase);
    const before = await support.getById(ticketId);
    const after = await support.update(ticketId, { status: "RESOLVED" });
    await audit.record({
      adminUserId: profile.id,
      action: "RESOLVE_TICKET",
      entityType: "support_tickets",
      entityId: ticketId,
      oldValue: before,
      newValue: after,
    });
    revalidatePath("/admin/support");
    revalidatePath("/admin");
  } catch (error) {
    fail("resolve_ticket", error);
  }
}

export type WhatsAppSendState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export async function sendStaffWhatsAppAction(
  _previous: WhatsAppSendState,
  formData: FormData,
): Promise<WhatsAppSendState> {
  try {
    const { profile } = await requireAdmin();
    if (!canMessageUsers(profile.role)) {
      return { error: "You cannot send WhatsApp messages." };
    }

    const phone = String(formData.get("phone") ?? "");
    const message = String(formData.get("message") ?? "");
    if (!message.trim()) {
      return { error: "Enter a message." };
    }
    if (message.trim().length > STAFF_WHATSAPP_MAX_CHARS) {
      return { error: "Message is too long." };
    }

    if (!getWhatsAppConfig().isSendConfigured) {
      return { error: "WhatsApp sending is not configured." };
    }

    const admin = createAdminClient();
    const sent = await sendStaffWhatsApp({
      client: createWhatsAppClient(),
      logs: createMessageLogService(admin),
      phone,
      message,
      staffLabel: profile.full_name || profile.email || profile.role,
    });
    await createAuditService(admin).record({
      adminUserId: profile.id,
      action: "SEND_WHATSAPP",
      entityType: "message_logs",
      entityId: sent.id,
      newValue: { phone: sent.phone, source: "admin" },
    });
    revalidatePath("/admin/vendors");
    revalidatePath("/admin/customers");
    revalidatePath("/admin/support");
    return { ok: true, message: "WhatsApp message sent." };
  } catch (error) {
    unstable_rethrow(error);
    if (isCommerceError(error) && error.code === "INVALID_PHONE") {
      return { error: "That WhatsApp number is not valid." };
    }
    if (isWhatsAppError(error)) {
      return { error: error.message };
    }
    logger.error({
      operation: "send_staff_whatsapp",
      result: "failed",
      error: error instanceof Error ? error.message : "unknown",
    });
    return { error: "Could not send the WhatsApp message." };
  }
}
