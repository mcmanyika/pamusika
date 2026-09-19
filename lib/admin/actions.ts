"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canHandleSupport, canManageCommerce } from "@/lib/auth/roles";
import { createAuditService } from "@/lib/services/audit.service";
import { createProductService } from "@/lib/services/product.service";
import { createSupportService } from "@/lib/services/support.service";
import { createVendorService } from "@/lib/services/vendor.service";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { parseUuid } from "@/lib/validation/ids";
import type { VendorStatus } from "@/types/commerce";

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

export async function setVendorStatusAction(formData: FormData): Promise<void> {
  try {
    const { profile, supabase, audit } = await adminWriteClient();
    if (!canManageCommerce(profile.role)) {
      deny("set_vendor_status", profile.id);
      return;
    }
    const vendorId = parseUuid(formData.get("vendorId"));
    const status = String(formData.get("status") ?? "") as VendorStatus;
    if (!vendorId || (status !== "ACTIVE" && status !== "SUSPENDED")) {
      return;
    }
    const vendors = createVendorService(supabase);
    const before = await vendors.getById(vendorId);
    const after = await vendors.setStatus(vendorId, status);
    await audit.record({
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
