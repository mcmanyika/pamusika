"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { sendStaffWhatsAppAction, type WhatsAppSendState } from "@/lib/admin/actions";
import { STAFF_WHATSAPP_MAX_CHARS } from "@/lib/admin/staff-whatsapp";
import { WhatsAppLink } from "@/components/admin/whatsapp-link";

const initialState: WhatsAppSendState = {};

export function WhatsAppCompose({
  phone,
  name,
}: {
  phone: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(sendStaffWhatsAppAction, initialState);

  return (
    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <WhatsAppLink phone={phone} variant="button" />
        <p className="text-xs text-[var(--color-ink-muted)]">
          Chat from your phone, or send from PaySell below.
        </p>
      </div>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="phone" value={phone} />
        <label className="block text-sm text-[var(--color-ink-muted)]">
          Message {name}
          <textarea
            name="message"
            required
            maxLength={STAFF_WHATSAPP_MAX_CHARS}
            rows={4}
            placeholder="Type a WhatsApp message"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none ring-[var(--color-brand)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-brand)] focus:ring-2"
          />
        </label>
        {state.error ? (
          <p className="text-sm text-red-700" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-[var(--color-brand-dark)]" role="status">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="h-8 px-3 text-xs">
          {pending ? "Sending..." : "Send from PaySell"}
        </Button>
      </form>
    </div>
  );
}
