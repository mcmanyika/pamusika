import Link from "next/link";
import { DataTable } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, formatMoney } from "@/lib/admin/format";
import { computeOverview, openTickets, recentItems } from "@/lib/admin/metrics";
import { loadOverviewData } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const supabase = await createClient();
  const data = await loadOverviewData(supabase);
  const stats = computeOverview(data);
  const recentOrders = recentItems(data.recentOrders);
  const newVendors = recentItems(data.vendors);
  const awaiting = data.recentOrders.filter((order) => order.status === "PENDING_VENDOR");
  const tickets = openTickets(data.tickets);

  return (
    <div>
      <PageHeader
        title="Overview"
        description="PaySell operations at a glance."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active vendors" value={String(stats.activeVendors)} />
        <StatCard label="Active products" value={String(stats.activeProducts)} />
        <StatCard label="Orders today" value={String(stats.ordersToday)} />
        <StatCard label="Sales today" value={formatMoney(stats.salesToday)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Recent orders</h2>
          <DataTable
            columns={["Order", "Vendor", "Total", "Status"]}
            empty="Orders will appear here after customers place them through WhatsApp."
            rows={recentOrders.map((order) => [
              order.order_number,
              order.vendorName ?? "—",
              formatMoney(order.total),
              <StatusBadge key={order.id}>{order.status}</StatusBadge>,
            ])}
          />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">New vendors</h2>
          {newVendors.length === 0 ? (
            <EmptyState
              title="New vendors"
              description="Newly registered vendors will appear here after WhatsApp onboarding."
            />
          ) : (
            <DataTable
              columns={["Code", "Business", "Joined"]}
              empty="No vendors yet."
              rows={newVendors.map((vendor) => [
                <Link key={vendor.id} href={`/admin/vendors/${vendor.id}`} className="text-[var(--color-brand-dark)] hover:underline">
                  {vendor.vendor_code}
                </Link>,
                vendor.business_name ?? "—",
                formatDate(vendor.created_at),
              ])}
            />
          )}
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Orders awaiting response</h2>
          <DataTable
            columns={["Order", "Vendor", "Created"]}
            empty="No orders are waiting on a vendor."
            rows={awaiting.map((order) => [
              order.order_number,
              order.vendorName ?? "—",
              formatDate(order.created_at),
            ])}
          />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Open support tickets</h2>
          <DataTable
            columns={["Opened", "Category", "Status"]}
            empty="No open support tickets."
            rows={tickets.map((ticket) => [
              formatDate(ticket.created_at),
              ticket.category,
              <StatusBadge key={ticket.id}>{ticket.status}</StatusBadge>,
            ])}
          />
        </section>
      </div>
    </div>
  );
}
