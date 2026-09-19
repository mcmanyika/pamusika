import { DataTable } from "@/components/admin/data-table";
import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { TicketActions } from "@/components/admin/ticket-actions";
import { PageHeader } from "@/components/layout/page-header";
import { displayPhone, formatDate } from "@/lib/admin/format";
import { loadTickets } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canHandleSupport, canViewPii } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { TICKET_STATUSES, type TicketStatus } from "@/types/commerce";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const status = TICKET_STATUSES.includes(params.status as TicketStatus)
    ? (params.status as TicketStatus)
    : undefined;
  const tickets = await loadTickets(supabase, status);
  const showActions = canHandleSupport(profile.role);
  const showPhone = canViewPii(profile.role);

  return (
    <div>
      <PageHeader
        title="Support"
        description="Human escalation from WhatsApp conversations."
      />
      <FilterForm action="/admin/support">
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          options={TICKET_STATUSES.map((value) => ({ value, label: value }))}
        />
      </FilterForm>
      <DataTable
        columns={[
          "Opened",
          "Type",
          "WhatsApp",
          "Category",
          "Priority",
          "Status",
          "Description",
          ...(showActions ? ["Actions"] : []),
        ]}
        empty="When PaySell cannot complete a conversation, tickets will show here."
        rows={tickets.map((ticket) => [
          formatDate(ticket.created_at),
          ticket.user_type ?? "UNKNOWN",
          displayPhone(ticket.phone_number, showPhone),
          ticket.category,
          ticket.priority,
          <StatusBadge key={`${ticket.id}-status`}>{ticket.status}</StatusBadge>,
          ticket.description,
          ...(showActions
            ? [<TicketActions key={`${ticket.id}-actions`} id={ticket.id} status={ticket.status} />]
            : []),
        ])}
      />
    </div>
  );
}
