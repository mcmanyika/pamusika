import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] outline-none ring-[var(--color-brand)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-brand)] focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
