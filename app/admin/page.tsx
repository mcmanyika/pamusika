import Link from "next/link";
import { OverviewPanel, OverviewRow } from "@/components/admin/overview-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card } from "@/components/ui/card";
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

  const today = [
    { label: "Active vendors", value: String(stats.activeVendors), href: "/admin/vendors" },
    { label: "Active products", value: String(stats.activeProducts), href: "/admin/products" },
    { label: "Orders today", value: String(stats.ordersToday), href: "/admin/orders" },
    { label: "Sales today", value: formatMoney(stats.salesToday), href: "/admin/orders" },
  ];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="What needs a response, then what changed."
      />

      <div className="grid grid-cols-12 gap-4">
        {today.map((stat) => (
          <Card key={stat.label} className="col-span-12 sm:col-span-6 lg:col-span-3 p-0">
            <Link href={stat.href} className="block px-5 py-4 hover:bg-[var(--color-surface-muted)]">
              <p className="text-xs text-[var(--color-ink-muted)]">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{stat.value}</p>
            </Link>
          </Card>
        ))}

        <OverviewPanel
          title="Awaiting vendor"
          href="/admin/orders"
          hrefLabel="View orders"
          count={awaiting.length}
          empty="No orders are waiting on a vendor."
        >
          {awaiting.slice(0, 8).map((order) => (
            <OverviewRow
              key={order.id}
              title={order.order_number}
              subtitle={order.vendorName ?? "Unknown vendor"}
              trailing={
                <span className="text-xs text-[var(--color-ink-muted)]">{formatDate(order.created_at)}</span>
              }
            />
          ))}
        </OverviewPanel>
        <OverviewPanel
          title="Recent orders"
          href="/admin/orders"
          hrefLabel="View orders"
          count={recentOrders.length}
          empty="Orders will appear here after customers place them through WhatsApp."
        >
          {recentOrders.map((order) => (
            <OverviewRow
              key={order.id}
              title={order.order_number}
              subtitle={`${order.vendorName ?? "Unknown vendor"} · ${formatMoney(order.total)}`}
              trailing={<StatusBadge>{order.status}</StatusBadge>}
            />
          ))}
        </OverviewPanel>
        <OverviewPanel
          title="New vendors"
          href="/admin/vendors"
          hrefLabel="View vendors"
          count={newVendors.length}
          empty="Newly registered vendors will appear here after WhatsApp onboarding."
        >
          {newVendors.map((vendor) => (
            <OverviewRow
              key={vendor.id}
              title={vendor.business_name ?? vendor.vendor_code}
              subtitle={vendor.vendor_code}
              trailing={
                <span className="text-xs text-[var(--color-ink-muted)]">{formatDate(vendor.created_at)}</span>
              }
            />
          ))}
        </OverviewPanel>
        <OverviewPanel
          title="Open support"
          href="/admin/support"
          hrefLabel="View support"
          count={tickets.length}
          empty="No open support tickets."
        >
          {tickets.slice(0, 8).map((ticket) => (
            <OverviewRow
              key={ticket.id}
              title={ticket.category}
              subtitle={formatDate(ticket.created_at)}
              trailing={<StatusBadge>{ticket.status}</StatusBadge>}
            />
          ))}
        </OverviewPanel>
      </div>
    </div>
  );
}
