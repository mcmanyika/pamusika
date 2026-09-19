import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Orders"
        description="Track the core sale: pending, accepted, ready, completed."
      />
      <EmptyState
        title="No orders yet"
        description="Customer orders will appear here once marketplace search and checkout are live."
      />
    </div>
  );
}
