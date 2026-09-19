import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminProductsPage() {
  return (
    <div>
      <PageHeader
        title="Products"
        description="Moderate listed products without deleting transaction history."
      />
      <EmptyState
        title="No products yet"
        description="Published products will appear here after vendors confirm listings."
      />
    </div>
  );
}
