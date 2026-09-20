"use client";

import { Button } from "@/components/ui/button";
import { setProductStatusAction } from "@/lib/admin/actions";
import { PRODUCT_STATUSES } from "@/types/commerce";

export function ProductActions({ id, status }: { id: string; status: string }) {
  return (
    <form action={setProductStatusAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="productId" value={id} />
      <label className="text-xs text-[var(--color-ink-muted)]">
        Status
        <select
          name="status"
          defaultValue={status}
          key={status}
          className="mt-1 h-8 rounded-lg border border-[var(--color-border)] bg-white px-2 text-xs text-[var(--color-ink)]"
        >
          {PRODUCT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
        Save status
      </Button>
    </form>
  );
}
