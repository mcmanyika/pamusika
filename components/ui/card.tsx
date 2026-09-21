import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-white p-5 text-[var(--color-ink)] shadow-sm [color-scheme:light]",
        className,
      )}
      {...props}
    />
  );
}
