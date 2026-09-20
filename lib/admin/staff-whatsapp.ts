import { normalizePhoneNumber, toWhatsAppId } from "@/lib/commerce/phone";
import type { MessageLogService } from "@/lib/services/message-log.service";
import type { WhatsAppClient } from "@/types/whatsapp";

export const STAFF_WHATSAPP_MAX_CHARS = 1000;

export function whatsappChatHref(phone: string): string {
  return `https://wa.me/${toWhatsAppId(phone)}`;
}

export function staffWhatsAppText(message: string, staffLabel: string): string {
  const body = message.trim();
  const sender = staffLabel.trim() || "PaySell staff";
  return `PaySell staff (${sender}):\n\n${body}`;
}

export async function sendStaffWhatsApp(input: {
  client: WhatsAppClient;
  logs: MessageLogService;
  phone: string;
  message: string;
  staffLabel: string;
}): Promise<{ id: string; phone: string }> {
  const phone = normalizePhoneNumber(input.phone);
  const text = staffWhatsAppText(input.message, input.staffLabel);
  if (!text.trim() || input.message.trim().length > STAFF_WHATSAPP_MAX_CHARS) {
    throw new Error("Enter a message of 1 to 1000 characters.");
  }

  const result = await input.client.sendTextMessage(toWhatsAppId(phone), text);
  await input.logs.logOutbound({
    externalMessageId: result.id,
    phoneNumber: phone,
    messageType: "text",
    messageText: text,
    payload: { to: toWhatsAppId(phone), type: "text", source: "admin" },
  });
  return { id: result.id, phone };
}
