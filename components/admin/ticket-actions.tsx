import { Button } from "@/components/ui/button";
import { resolveTicketAction } from "@/lib/admin/actions";

export function TicketActions({ id, status }: { id: string; status: string }) {
  if (status === "RESOLVED" || status === "CLOSED") {
    return <span className="text-xs text-[var(--color-ink-muted)]">Closed</span>;
  }

  return (
    <form action={resolveTicketAction}>
      <input type="hidden" name="ticketId" value={id} />
      <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
        Resolve
      </Button>
    </form>
  );
}
