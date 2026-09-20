import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export function OverviewPanel({
  title,
  href,
  hrefLabel,
  count,
  empty,
  children,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  count?: number;
  empty: string;
  children: ReactNode;
}) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];

  return (
    <Card className="col-span-12 flex h-full flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{title}</h2>
          {count !== undefined ? (
            <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]">
              {count}
            </span>
          ) : null}
        </div>
        <Link href={href} className="text-xs font-medium text-[var(--color-brand-dark)] hover:underline">
          {hrefLabel}
        </Link>
      </div>
      {rows.length > 0 ? (
        <ul className="divide-y divide-[var(--color-border)]">{rows}</ul>
      ) : (
        <p className="px-5 py-8 text-sm text-[var(--color-ink-muted)]">{empty}</p>
      )}
    </Card>
  );
}

export function OverviewRow({
  title,
  subtitle,
  trailing,
}: {
  title: ReactNode;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--color-ink)]">{title}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">{subtitle}</p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </li>
  );
}
