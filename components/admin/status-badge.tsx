import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const TONE: Record<string, string> = {
  ACTIVE: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
  COMPLETED: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
  READY: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
  VERIFIED: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
  PENDING: "bg-amber-100 text-amber-900",
  PENDING_VENDOR: "bg-amber-100 text-amber-900",
  ACCEPTED: "bg-amber-100 text-amber-900",
  PREPARING: "bg-amber-100 text-amber-900",
  OPEN: "bg-amber-100 text-amber-900",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  DRAFT: "bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
  PAUSED: "bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
  UNVERIFIED: "bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
  SUSPENDED: "bg-red-100 text-red-800",
  INACTIVE: "bg-red-100 text-red-800",
  DECLINED: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
  REMOVED: "bg-red-100 text-red-800",
  OUT_OF_STOCK: "bg-red-100 text-red-800",
  RESOLVED: "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]",
  CLOSED: "bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
};

export function StatusBadge({ children }: { children: ReactNode }) {
  const value = String(children);
  return (
    <Badge className={cn("bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]", TONE[value])}>
      {children}
    </Badge>
  );
}
