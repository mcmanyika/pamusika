import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { VendorActions } from "@/components/admin/vendor-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { displayPhone, formatDate, formatMoney, locationLabel, personName } from "@/lib/admin/format";
import { loadVendorDetail } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageCommerce, canViewPii } from "@/lib/auth/roles";
import { parseDecimal } from "@/lib/commerce/money";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();
  const detail = await loadVendorDetail(supabase, id);
  if (!detail) {
    notFound();
  }

  const { vendor, categoryName, products, orders, tickets, events } = detail;
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const gmv = completed.reduce((sum, order) => sum + parseDecimal(order.total, "total"), 0);

  return (
    <div>
      <PageHeader
        title={vendor.business_name ?? vendor.vendor_code}
        description={`${vendor.vendor_code} · ${locationLabel(vendor.area, vendor.city)}`}
      >
        <div className="flex items-center gap-3">
          <StatusBadge>{vendor.status}</StatusBadge>
          {canManageCommerce(profile.role) ? (
            <VendorActions id={vendor.id} status={vendor.status} />
          ) : null}
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-[var(--color-ink-muted)]">Owner</p>
          <p className="mt-1 font-medium">{personName(vendor.first_name, vendor.last_name)}</p>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">WhatsApp</p>
          <p className="mt-1 font-medium">{displayPhone(vendor.whatsapp_number, canViewPii(profile.role))}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-ink-muted)]">Category</p>
          <p className="mt-1 font-medium">{categoryName ?? "—"}</p>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">Verification</p>
          <p className="mt-1 font-medium">{vendor.verification_status}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-ink-muted)]">Completed sales</p>
          <p className="mt-1 font-medium">{completed.length}</p>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">Gross merchandise</p>
          <p className="mt-1 font-medium">{formatMoney(gmv)}</p>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Products</h2>
      <DataTable
        columns={["Product", "Price", "Stock", "Status"]}
        empty="This vendor has no products yet."
        rows={products.map((product) => [
          product.name,
          `${formatMoney(product.price)}/${product.unit}`,
          `${product.quantity} ${product.unit}`,
          <StatusBadge key={product.id}>{product.status}</StatusBadge>,
        ])}
      />

      <h2 className="mb-3 mt-8 text-sm font-semibold">Recent orders</h2>
      <DataTable
        columns={["Order", "Total", "Status", "Created"]}
        empty="No orders for this vendor."
        rows={orders.slice(0, 10).map((order) => [
          <Link key={order.id} href="/admin/orders" className="text-[var(--color-brand-dark)] hover:underline">
            {order.order_number}
          </Link>,
          formatMoney(order.total),
          <StatusBadge key={`${order.id}-status`}>{order.status}</StatusBadge>,
          formatDate(order.created_at),
        ])}
      />

      <h2 className="mb-3 mt-8 text-sm font-semibold">Support tickets</h2>
      <DataTable
        columns={["Opened", "Status", "Description"]}
        empty="No support tickets for this vendor."
        rows={tickets.map((ticket) => [
          formatDate(ticket.created_at),
          <StatusBadge key={ticket.id}>{ticket.status}</StatusBadge>,
          ticket.description,
        ])}
      />

      <h2 className="mb-3 mt-8 text-sm font-semibold">Activity</h2>
      <DataTable
        columns={["When", "Event"]}
        empty="No recorded activity yet."
        rows={events.map((event) => [formatDate(event.created_at), event.event_name])}
      />
    </div>
  );
}
