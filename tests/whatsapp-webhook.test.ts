import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { ConversationEngine } from "@/lib/conversation/engine";
import { CategoryService } from "@/lib/services/category.service";
import { ConversationService } from "@/lib/services/conversation.service";
import { CustomerService } from "@/lib/services/customer.service";
import { MessageLogService } from "@/lib/services/message-log.service";
import { OrderService } from "@/lib/services/order.service";
import { ProductService } from "@/lib/services/product.service";
import { VendorService } from "@/lib/services/vendor.service";
import { parseWebhookPayload } from "@/lib/whatsapp/parser";
import { processInboundPayload } from "@/lib/whatsapp/processor";
import { WhatsAppSender } from "@/lib/whatsapp/sender";
import { verifyMetaSignature, verifyWebhookSubscription } from "@/lib/whatsapp/webhook";
import type { OrderRecord } from "@/lib/services/order.service";
import type { Customer, Product, Vendor } from "@/types/database";
import {
  createMemoryCategoryStore,
  createMemoryCustomerStore,
  createMemoryIdempotencyStore,
  createMemoryOrderStore,
  createMemoryProductStore,
  createMemoryVendorStore,
} from "./helpers/memory";
import { testCategory } from "./helpers/conversation";
import {
  createMemoryConversationStore,
  createMemoryMessageLogStore,
  createMockWhatsAppClient,
} from "./helpers/whatsapp-memory";

function textPayload(id: string, from = "263771234567", body = "Hello") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              messages: [
                {
                  from,
                  id,
                  timestamp: "1690000000",
                  type: "text",
                  text: { body },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function createProcessor() {
  const whatsapp = createMockWhatsAppClient();
  const vendors: Vendor[] = [];
  const products: Product[] = [];
  const customers: Customer[] = [];
  const orders: OrderRecord[] = [];
  const logs = new MessageLogService(createMemoryMessageLogStore());
  const engine = new ConversationEngine({
    conversations: new ConversationService(createMemoryConversationStore()),
    vendors: new VendorService(
      createMemoryVendorStore(vendors),
      { async track() {} },
      createMemoryIdempotencyStore(),
    ),
    customers: new CustomerService(createMemoryCustomerStore(customers)),
    products: new ProductService(
      createMemoryProductStore({ vendors, products }),
      { async track() {} },
      createMemoryIdempotencyStore(),
    ),
    categories: new CategoryService(createMemoryCategoryStore([testCategory()])),
    orders: new OrderService(
      createMemoryOrderStore({ vendors, customers, products, orders }),
      { async track() {} },
      createMemoryIdempotencyStore(),
    ),
  });
  const sender = new WhatsAppSender(whatsapp.client, logs);
  return { ...whatsapp, logs, engine, sender };
}

describe("Meta webhook verification", () => {
  it("echoes the challenge when the verify token matches", () => {
    const result = verifyWebhookSubscription({
      mode: "subscribe",
      token: "paysell-verify",
      challenge: "1158201444",
      expectedToken: "paysell-verify",
    });
    expect(result).toEqual({ ok: true, challenge: "1158201444" });
  });

  it("rejects a missing or wrong verify token", () => {
    expect(
      verifyWebhookSubscription({
        mode: "subscribe",
        token: "wrong",
        challenge: "1",
        expectedToken: "paysell-verify",
      }).ok,
    ).toBe(false);
  });

  it("accepts a valid X-Hub-Signature-256 and rejects a bad one", () => {
    const secret = "app-secret";
    const body = '{"object":"whatsapp_business_account"}';
    const hash = createHmac("sha256", secret).update(body, "utf8").digest("hex");

    expect(verifyMetaSignature(body, `sha256=${hash}`, secret)).toBe(true);
    expect(verifyMetaSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
  });
});

describe("WhatsApp payload parsing", () => {
  it("extracts inbound text messages", () => {
    const parsed = parseWebhookPayload(textPayload("wamid.1"));
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0]?.text).toBe("Hello");
    expect(parsed.messages[0]?.phoneNumber).toBe("+263771234567");
    expect(parsed.messages[0]?.supported).toBe(true);
  });

  it("ignores status-only webhooks", () => {
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [{ id: "wamid.out.1", status: "delivered" }],
              },
            },
          ],
        },
      ],
    });
    expect(parsed.messages).toHaveLength(0);
    expect(parsed.ignored).toBeGreaterThan(0);
  });

  it("flags unsupported inbound message types without dropping the event", () => {
    const parsed = parseWebhookPayload({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    from: "263771234567",
                    id: "wamid.sticker",
                    type: "sticker",
                    sticker: { id: "media-1" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0]?.supported).toBe(false);
  });
});

describe("webhook processing", () => {
  it("does not send twice for a duplicate inbound message id", async () => {
    const { engine, logs, sender, sent } = createProcessor();
    const payload = textPayload("wamid.same");

    const first = await processInboundPayload(payload, { engine, logs, sender });
    const second = await processInboundPayload(payload, { engine, logs, sender });

    expect(first.processed).toBe(1);
    expect(second.duplicates).toBe(1);
    expect(sent).toHaveLength(1);
  });

  it("replies to unsupported message types without creating commerce records", async () => {
    const { engine, logs, sender, sent } = createProcessor();
    const result = await processInboundPayload(
      {
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: {
                  messages: [
                    {
                      from: "263771234567",
                      id: "wamid.image",
                      type: "image",
                      image: { id: "media-9" },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
      { engine, logs, sender },
    );

    expect(result.processed).toBe(1);
    expect(sent[0]?.body).toMatch(/text messages/i);
  });

  it("replies with the main menu for supported text", async () => {
    const { engine, logs, sender, sent } = createProcessor();
    await processInboundPayload(textPayload("wamid.hello"), { engine, logs, sender });
    expect(sent[0]?.body).toMatch(/You're in the main menu/i);
    expect(sent[0]?.to).toBe("263771234567");
  });

  it("does not send stack traces when processing fails", async () => {
    const { logs, sender, sent } = createProcessor();
    const engine = {
      handle: async () => {
        throw new Error("secret inventory SQL TRACE");
      },
    } as unknown as ConversationEngine;

    await processInboundPayload(textPayload("wamid.fail"), { engine, logs, sender });

    expect(sent[0]?.body).toBe("Something went wrong. Please try again in a moment.");
    expect(JSON.stringify(sent)).not.toMatch(/TRACE|SQL/i);
  });

  it("opens a new conversation after the previous session expires", async () => {
    const now = new Date().toISOString();
    const store = createMemoryConversationStore([
      {
        id: "expired-session",
        phone_number: "+263771234567",
        user_type: "UNKNOWN",
        user_id: null,
        current_state: "MAIN_MENU",
        context_json: {},
        is_active: true,
        last_message_at: now,
        expires_at: new Date(Date.now() - 1000).toISOString(),
        created_at: now,
        updated_at: now,
      },
    ]);
    const conversations = new ConversationService(store);
    const session = await conversations.getOrCreateActive({
      phoneNumber: "+263771234567",
      userType: "UNKNOWN",
    });

    expect(session.id).not.toBe("expired-session");
    expect(session.current_state).toBe("NEW");
    expect(session.is_active).toBe(true);
    expect(await store.findActiveByPhone("+263771234567")).toMatchObject({ id: session.id });
  });
});
