"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="min-h-full bg-[var(--color-canvas)]">
        <div className="flex min-h-full items-center justify-center px-4 py-16">
          <div className="max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <h1 className="text-xl font-semibold text-[var(--color-ink)]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Please try again. If this continues, contact PaySell support.
            </p>
            <Button className="mt-6" onClick={reset}>
              Try again
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
