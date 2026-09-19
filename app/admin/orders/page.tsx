import { DataTable } from "@/components/admin/data-table";
import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatMoney } from "@/lib/admin/format";
import { loadOrders } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, type OrderStatus } from "@/types/commerce";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const status = ORDER_STATUSES.includes(params.status as OrderStatus)
    ? (params.status as OrderStatus)
    : undefined;
  const rows = await loadOrders(supabase, { q: params.q, status });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track the core sale: pending, accepted, ready, completed."
      />
      <FilterForm action="/admin/orders" query={params.q}>
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          options={ORDER_STATUSES.map((value) => ({ value, label: value }))}
        />
      </FilterForm>
      <DataTable
        columns={["Order", "Customer", "Vendor", "Items", "Total", "Status", "Created", "Updated"]}
        empty="Customer orders will appear here once marketplace checkout is used."
        rows={rows.map((order) => [
          order.order_number,
          order.customerName ?? "—",
          order.vendorName ?? "—",
          order.items
            .map((item) => `${item.product_name_snapshot} ${item.quantity}${item.unit}`)
            .join(", ") || "—",
          formatMoney(order.total),
          <StatusBadge key={order.id}>{order.status}</StatusBadge>,
          formatDate(order.created_at),
          formatDate(order.updated_at),
        ])}
      />
    </div>
  );
}
