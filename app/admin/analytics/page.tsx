import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

const METRICS = [
  { label: "Registered vendors", value: "0" },
  { label: "Weekly active vendors", value: "0" },
  { label: "Active products", value: "0" },
  { label: "Customer searches", value: "0" },
  { label: "Orders created", value: "0" },
  { label: "Orders completed", value: "0" },
  { label: "Gross merchandise value", value: "$0.00" },
  { label: "Average order value", value: "$0.00" },
  { label: "Repeat customers", value: "0" },
  { label: "Vendor acceptance rate", value: "0%" },
  { label: "Cancellation rate", value: "0%" },
];

export default function AdminAnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Pilot metrics for additional completed sales. Values stay at zero until events exist."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-[var(--color-ink-muted)]">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              {metric.value}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
