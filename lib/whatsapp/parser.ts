import { z } from "zod";
import { CommerceError } from "@/lib/commerce/errors";
import { normalizePhoneNumber } from "@/lib/commerce/phone";
import type { Json } from "@/types/database";
import type { WhatsAppInboundMessage } from "@/types/whatsapp";

const unknownRecord = z.record(z.string(), z.unknown());

const webhookSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        id: z.string().optional(),
        changes: z
          .array(
            z.object({
              field: z.string().optional(),
              value: unknownRecord.optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function sanitizeMessage(message: Record<string, unknown>): Json {
  const type = asString(message.type) ?? "unknown";
  const sanitized: Record<string, Json | undefined> = {
    id: asString(message.id),
    type,
    timestamp: asString(message.timestamp),
    from: asString(message.from),
  };

  if (type === "text") {
    sanitized.text = asRecord(message.text)?.body
      ? { body: asString(asRecord(message.text)?.body) }
      : null;
  }

  if (type === "interactive") {
    sanitized.interactive = asRecord(message.interactive) as Json;
  }

  if (type === "image") {
    const image = asRecord(message.image);
    sanitized.image = image
      ? { id: asString(image.id), mime_type: asString(image.mime_type) }
      : null;
  }

  return sanitized;
}

function extractChoiceId(message: Record<string, unknown>, type: string): string | null {
  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const button = asRecord(interactive?.button_reply);
    const list = asRecord(interactive?.list_reply);
    return asString(button?.id) ?? asString(list?.id);
  }

  if (type === "button") {
    return asString(asRecord(message.button)?.payload);
  }

  return null;
}

function extractText(message: Record<string, unknown>, type: string): string | null {
  if (type === "text") {
    return asString(asRecord(message.text)?.body);
  }

  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const button = asRecord(interactive?.button_reply);
    const list = asRecord(interactive?.list_reply);
    return asString(button?.title) ?? asString(list?.title) ?? asString(button?.id);
  }

  if (type === "button") {
    return asString(asRecord(message.button)?.text);
  }

  const image = asRecord(message.image);
  return asString(image?.caption);
}

function isSupportedType(type: string): boolean {
  return type === "text" || type === "interactive" || type === "button";
}

export function parseWebhookPayload(payload: unknown): {
  object: string | null;
  messages: WhatsAppInboundMessage[];
  ignored: number;
} {
  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) {
    return { object: null, messages: [], ignored: 1 };
  }

  const object = parsed.data.object ?? null;
  if (object && object !== "whatsapp_business_account") {
    return { object, messages: [], ignored: 1 };
  }

  const messages: WhatsAppInboundMessage[] = [];
  let ignored = 0;

  for (const entry of parsed.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") {
        ignored += 1;
        continue;
      }

      const value = change.value ?? {};
      const rawMessages = Array.isArray(value.messages) ? value.messages : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contactName = asString(
        asRecord(asRecord(contacts[0])?.profile)?.name,
      );

      if (rawMessages.length === 0) {
        ignored += 1;
        continue;
      }

      for (const item of rawMessages) {
        const message = asRecord(item);
        if (!message) {
          ignored += 1;
          continue;
        }

        const externalMessageId = asString(message.id);
        const waId = asString(message.from);
        const type = asString(message.type) ?? "unknown";

        if (!externalMessageId || !waId) {
          ignored += 1;
          continue;
        }

        let phoneNumber: string;
        try {
          phoneNumber = normalizePhoneNumber(waId);
        } catch (error) {
          if (error instanceof CommerceError) {
            ignored += 1;
            continue;
          }
          throw error;
        }

        const media = asRecord(message.image) ?? asRecord(message.audio) ?? asRecord(message.document);
        messages.push({
          externalMessageId,
          waId,
          phoneNumber,
          timestamp: asString(message.timestamp),
          type,
          text: extractText(message, type),
          choiceId: extractChoiceId(message, type),
          supported: isSupportedType(type),
          mediaId: asString(media?.id),
          contactName,
        });
      }
    }
  }

  return { object, messages, ignored };
}

export function sanitizeInboundPayload(message: WhatsAppInboundMessage): Json {
  return {
    id: message.externalMessageId,
    type: message.type,
    waId: message.waId,
    timestamp: message.timestamp,
    supported: message.supported,
    choiceId: message.choiceId,
    mediaId: message.mediaId,
  };
}

export { sanitizeMessage };
