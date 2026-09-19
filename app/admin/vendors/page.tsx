import Link from "next/link";
import { DataTable } from "@/components/admin/data-table";
import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { VendorActions } from "@/components/admin/vendor-actions";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, locationLabel, personName } from "@/lib/admin/format";
import { loadVendors } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageCommerce, canViewPii } from "@/lib/auth/roles";
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
  const showActions = canManageCommerce(profile.role);
  const showPhone = canViewPii(profile.role);

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Search and moderate vendor accounts."
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
      <DataTable
        columns={[
          "Vendor ID",
          "Business",
          "Owner",
          ...(showPhone ? ["WhatsApp"] : []),
          "Area",
          "Category",
          "Products",
          "Orders",
          "Status",
          "Joined",
          ...(showActions ? ["Actions"] : []),
        ]}
        empty="Vendor registration through WhatsApp will populate this table."
        rows={rows.map((vendor) => [
          <Link key={vendor.id} href={`/admin/vendors/${vendor.id}`} className="text-[var(--color-brand-dark)] hover:underline">
            {vendor.vendor_code}
          </Link>,
          vendor.business_name ?? "—",
          personName(vendor.first_name, vendor.last_name),
          ...(showPhone ? [vendor.whatsapp_number] : []),
          locationLabel(vendor.area, vendor.city),
          vendor.categoryName ?? "—",
          String(vendor.productCount),
          String(vendor.orderCount),
          <StatusBadge key={`${vendor.id}-status`}>{vendor.status}</StatusBadge>,
          formatDate(vendor.created_at),
          ...(showActions ? [<VendorActions key={`${vendor.id}-actions`} id={vendor.id} status={vendor.status} />] : []),
        ])}
      />
      {!showPhone ? (
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          WhatsApp numbers are hidden for this role.
        </p>
      ) : null}
    </div>
  );
}
