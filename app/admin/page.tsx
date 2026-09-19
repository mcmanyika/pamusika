import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const STATS = [
  { label: "Active vendors", value: "0" },
  { label: "Active products", value: "0" },
  { label: "Orders today", value: "0" },
  { label: "Sales today", value: "$0.00" },
];

export default function AdminOverviewPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="PaySell operations at a glance. Metrics stay at zero until commerce data exists."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-[var(--color-ink-muted)]">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
              {stat.value}
            </p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EmptyState
          title="Recent orders"
          description="Orders will appear here after customers start placing them through WhatsApp."
        />
        <EmptyState
          title="New vendors"
          description="Newly registered vendors will appear here after WhatsApp onboarding is live."
        />
        <EmptyState
          title="Orders awaiting response"
          description="Pending vendor acceptances will be listed here."
        />
        <EmptyState
          title="Open support tickets"
          description="Human escalations from WhatsApp will appear here."
        />
      </div>
    </div>
  );
}
