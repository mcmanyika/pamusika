import { StatCard } from "@/components/admin/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { formatMoney, formatPercent } from "@/lib/admin/format";
import { computeAnalytics } from "@/lib/admin/metrics";
import { loadAnalyticsData } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const data = await loadAnalyticsData(supabase);
  const metrics = computeAnalytics(data);

  const cards = [
    { label: "Registered vendors", value: String(metrics.registeredVendors) },
    { label: "Weekly active vendors", value: String(metrics.weeklyActiveVendors) },
    { label: "Active products", value: String(metrics.activeProducts) },
    { label: "Customer searches", value: String(metrics.customerSearches) },
    { label: "Orders created", value: String(metrics.ordersCreated) },
    { label: "Orders completed", value: String(metrics.ordersCompleted) },
    { label: "Gross merchandise value", value: formatMoney(metrics.grossMerchandiseValue) },
    { label: "Average order value", value: formatMoney(metrics.averageOrderValue) },
    { label: "Repeat customers", value: String(metrics.repeatCustomers) },
    { label: "Vendor acceptance rate", value: formatPercent(metrics.vendorAcceptanceRate) },
    { label: "Cancellation rate", value: formatPercent(metrics.cancellationRate) },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Pilot metrics for additional completed sales. Values stay at zero until events exist."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </div>
    </div>
  );
}
