"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
      <h1 className="text-lg font-semibold text-[var(--color-ink)]">Could not load this page</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
        The admin console hit an unexpected error. Try again, or go back to Overview.
      </p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
