import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminVendorsPage() {
  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Search and moderate vendor accounts. Full management arrives in Phase 7."
      />
      <EmptyState
        title="No vendors yet"
        description="Vendor registration through WhatsApp will populate this table."
      />
    </div>
  );
}
