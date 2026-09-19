import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand-dark)]",
        className,
      )}
      {...props}
    />
  );
}
