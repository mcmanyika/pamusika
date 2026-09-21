import { VendorDirectory } from "@/components/admin/vendor-directory";
import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, personName, vendorAddressLabel } from "@/lib/admin/format";
import { loadVendors } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canMessageUsers, canModerateAccounts, canVerifyUsers } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { VENDOR_STATUSES, VERIFICATION_STATUSES } from "@/types/commerce";
import type { VendorStatus } from "@/types/commerce";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; area?: string; verification?: string }>;
}) {
  const { profile } = await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const status = VENDOR_STATUSES.includes(params.status as VendorStatus)
    ? (params.status as VendorStatus)
    : undefined;
  const { rows, categories } = await loadVendors(supabase, {
    q: params.q,
    status,
    categoryId: params.category,
    area: params.area,
    verification: params.verification,
  });

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Click a vendor to see contact, address, and account actions."
      />
      <FilterForm action="/admin/vendors" query={params.q}>
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          options={VENDOR_STATUSES.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          name="verification"
          label="Verification"
          value={params.verification}
          options={VERIFICATION_STATUSES.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          name="category"
          label="Category"
          value={params.category}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />
        <label className="text-sm text-[var(--color-ink-muted)]">
          Area
          <input
            name="area"
            defaultValue={params.area}
            className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm sm:w-44"
          />
        </label>
      </FilterForm>
      <VendorDirectory
        canMessage={canMessageUsers(profile.role)}
        canVerify={canVerifyUsers(profile.role)}
        canModerate={canModerateAccounts(profile.role)}
        empty="Vendor registration through WhatsApp will populate this table."
        vendors={rows.map((vendor) => ({
          id: vendor.id,
          vendorCode: vendor.vendor_code,
          businessName: vendor.business_name ?? vendor.vendor_code,
          contactName: personName(vendor.first_name, vendor.last_name),
          whatsapp: vendor.whatsapp_number,
          address: vendorAddressLabel(vendor),
          categoryName: vendor.categoryName ?? "—",
          categorySlug: vendor.categorySlug,
          productCount: vendor.productCount,
          orderCount: vendor.orderCount,
          status: vendor.status,
          verification: vendor.verification_status,
          joined: formatDate(vendor.created_at),
        }))}
      />
    </div>
  );
}
