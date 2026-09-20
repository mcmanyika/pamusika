import type { ReactNode } from "react";
import { whatsappChatHref } from "@/lib/admin/staff-whatsapp";
import { cn } from "@/lib/utils/cn";

export function WhatsAppLink({
  phone,
  children,
  className,
}: {
  phone: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={whatsappChatHref(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-[var(--color-brand-dark)] hover:underline", className)}
    >
      {children ?? phone}
    </a>
  );
}
