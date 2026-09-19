import { Button } from "@/components/ui/button";
import {
  pauseProductAction,
  reactivateProductAction,
  removeProductAction,
} from "@/lib/admin/actions";

export function ProductActions({ id, status }: { id: string; status: string }) {
  if (status === "REMOVED") {
    return <span className="text-xs text-[var(--color-ink-muted)]">Removed</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PAUSED" || status === "OUT_OF_STOCK" ? (
        <form action={reactivateProductAction}>
          <input type="hidden" name="productId" value={id} />
          <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
            Reactivate
          </Button>
        </form>
      ) : (
        <form action={pauseProductAction}>
          <input type="hidden" name="productId" value={id} />
          <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
            Pause
          </Button>
        </form>
      )}
      <form action={removeProductAction}>
        <input type="hidden" name="productId" value={id} />
        <Button type="submit" variant="danger" className="h-8 px-3 text-xs">
          Remove
        </Button>
      </form>
    </div>
  );
}
