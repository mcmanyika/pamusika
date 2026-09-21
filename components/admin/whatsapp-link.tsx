import type { ReactNode } from "react";
import { whatsappChatHref } from "@/lib/commerce/phone";
import { cn } from "@/lib/utils/cn";

export function WhatsAppLink({
  phone,
  children,
  className,
  variant = "text",
}: {
  phone: string;
  children?: ReactNode;
  className?: string;
  variant?: "text" | "button";
}) {
  return (
    <a
      href={whatsappChatHref(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        variant === "button"
          ? "inline-flex h-8 items-center rounded-lg border border-[var(--color-border)] bg-white px-3 text-xs font-medium text-[var(--color-ink)] no-underline hover:bg-[var(--color-surface-muted)] hover:no-underline"
          : "text-[var(--color-brand-dark)] hover:underline",
        className,
      )}
    >
      {children ?? phone}
    </a>
  );
}
