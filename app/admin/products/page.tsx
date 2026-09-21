import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { ProductTable } from "@/components/admin/product-table";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatMoney, locationLabel } from "@/lib/admin/format";
import { loadCategories, loadProducts } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canModerateAccounts } from "@/lib/auth/roles";
import { parseDecimal } from "@/lib/commerce/money";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_STATUSES, type ProductStatus } from "@/types/commerce";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}) {
  const { profile } = await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const status = PRODUCT_STATUSES.includes(params.status as ProductStatus)
    ? (params.status as ProductStatus)
    : undefined;
  const [rows, categories] = await Promise.all([
    loadProducts(supabase, { q: params.q, status, categoryId: params.category }),
    loadCategories(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Click a product to change its status, or to see stock and category."
      />
      <FilterForm action="/admin/products" query={params.q}>
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          options={PRODUCT_STATUSES.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          name="category"
          label="Category"
          value={params.category}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />
      </FilterForm>
      <ProductTable
        showActions={canModerateAccounts(profile.role)}
        empty="Published products will appear here after vendors confirm listings."
        products={rows.map((product) => ({
          id: product.id,
          vendorId: product.vendor_id,
          name: product.name,
          description: product.description?.trim() || "—",
          vendorName: product.vendorName ?? "—",
          vendorWhatsapp: product.vendorWhatsapp,
          categoryName: product.categoryName ?? "—",
          categorySlug: product.categorySlug,
          area: locationLabel(product.vendorArea),
          priceLabel: `${formatMoney(product.price)}/${product.unit}`,
          price: parseDecimal(product.price, "price"),
          stockLabel: `${product.quantity} ${product.unit}`,
          stock: parseDecimal(product.quantity, "quantity"),
          status: product.status,
          imageUrl: product.image_url,
          createdLabel: formatDate(product.created_at),
          updatedLabel: formatDate(product.updated_at),
          updatedAt: product.updated_at,
        }))}
      />
    </div>
  );
}
