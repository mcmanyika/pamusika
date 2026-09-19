import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminSupportPage() {
  return (
    <div>
      <PageHeader
        title="Support"
        description="Human escalation from WhatsApp conversations."
      />
      <EmptyState
        title="No open tickets"
        description="When PaySell cannot complete a conversation, tickets will show here."
      />
    </div>
  );
}
