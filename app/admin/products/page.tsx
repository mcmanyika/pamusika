import { DataTable } from "@/components/admin/data-table";
import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { ProductActions } from "@/components/admin/product-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatMoney, locationLabel } from "@/lib/admin/format";
import { loadProducts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageCommerce } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_STATUSES, type ProductStatus } from "@/types/commerce";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { profile } = await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const status = PRODUCT_STATUSES.includes(params.status as ProductStatus)
    ? (params.status as ProductStatus)
    : undefined;
  const rows = await loadProducts(supabase, { q: params.q, status });
  const showActions = canManageCommerce(profile.role);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Moderate listed products without deleting transaction history."
      />
      <FilterForm action="/admin/products" query={params.q}>
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          options={PRODUCT_STATUSES.map((value) => ({ value, label: value }))}
        />
      </FilterForm>
      <DataTable
        columns={[
          "Product",
          "Vendor",
          "Category",
          "Area",
          "Price",
          "Stock",
          "Status",
          "Updated",
          ...(showActions ? ["Actions"] : []),
        ]}
        empty="Published products will appear here after vendors confirm listings."
        rows={rows.map((product) => [
          product.name,
          product.vendorName ?? "—",
          product.categoryName ?? "—",
          locationLabel(product.vendorArea),
          `${formatMoney(product.price)}/${product.unit}`,
          `${product.quantity} ${product.unit}`,
          <StatusBadge key={`${product.id}-status`}>{product.status}</StatusBadge>,
          formatDate(product.updated_at),
          ...(showActions
            ? [<ProductActions key={`${product.id}-actions`} id={product.id} status={product.status} />]
            : []),
        ])}
      />
    </div>
  );
}
