import { describe, expect, it } from "vitest";
import { sendStaffWhatsApp, staffWhatsAppText, whatsappChatHref } from "@/lib/admin/staff-whatsapp";
import { MessageLogService } from "@/lib/services/message-log.service";
import { createMemoryMessageLogStore, createMockWhatsAppClient } from "./helpers/whatsapp-memory";

describe("staff WhatsApp", () => {
  it("opens a wa.me chat for a stored number", () => {
    expect(whatsappChatHref("+263771234567")).toBe("https://wa.me/263771234567");
    expect(staffWhatsAppText("Please confirm stock.", "Ada")).toBe(
      "PaySell staff (Ada):\n\nPlease confirm stock.",
    );
  });

  it("sends a staff message through the WhatsApp client and logs it", async () => {
    const whatsapp = createMockWhatsAppClient();
    const store = createMemoryMessageLogStore();
    const sent = await sendStaffWhatsApp({
      client: whatsapp.client,
      logs: new MessageLogService(store),
      phone: "0771234567",
      message: "We received your listing.",
      staffLabel: "Ada",
    });

    expect(sent.phone).toBe("+263771234567");
    expect(whatsapp.sent).toEqual([
      {
        to: "263771234567",
        body: "PaySell staff (Ada):\n\nWe received your listing.",
      },
    ]);
    expect(await store.findByExternalId(sent.id)).toMatchObject({
      phone_number: "+263771234567",
      direction: "OUTBOUND",
      status: "SENT",
    });
  });
});
