import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminCustomersPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        description="Lightweight WhatsApp buyer records. Phone numbers are hidden from analyst roles."
      />
      <EmptyState
        title="No customers yet"
        description="Buyers are created automatically when they start a WhatsApp conversation."
      />
    </div>
  );
}
