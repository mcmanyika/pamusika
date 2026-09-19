import { describe, expect, it, vi } from "vitest";
import { shouldInterpretIntent } from "@/lib/conversation/intent";
import { normalizeInput } from "@/lib/conversation/input";
import { createOpenAIIntentInterpreter } from "@/lib/openai/intent";
import type { IntentEntities, InterpretedIntent } from "@/lib/openai/schemas";
import type { ConversationState } from "@/types/conversation";
import { createConversationHarness, inbound } from "./helpers/conversation";
import type { WhatsAppInboundMessage } from "@/types/whatsapp";

function entities(patch: Partial<IntentEntities> = {}): IntentEntities {
  return {
    product_name: null,
    quantity: null,
    unit: null,
    price: null,
    currency: null,
    location: null,
    search_query: null,
    first_name: null,
    business_name: null,
    ...patch,
  };
}

function interpreted(
  patch: Partial<InterpretedIntent> & Pick<InterpretedIntent, "intent">,
): InterpretedIntent {
  return {
    confidence: 0.95,
    entities: entities(),
    ...patch,
  };
}

async function say(
  engine: ReturnType<typeof createConversationHarness>["engine"],
  text: string,
  extras: Parameters<typeof inbound>[1] = {},
) {
  return engine.handle(inbound(text, extras));
}

async function registerVendor(
  engine: ReturnType<typeof createConversationHarness>["engine"],
  extras: Parameters<typeof inbound>[1] = {},
) {
  await say(engine, "2", extras);
  await say(engine, "Tariro", extras);
  await say(engine, "Tariro Fresh Produce", extras);
  await say(engine, "1", extras);
  await say(engine, "Harare, Mbare", extras);
  await say(engine, "1", extras);
  await say(engine, "YES", { ...extras, choiceId: "yes" });
}

function mockClient(
  output: unknown,
  parse = vi.fn<(body: { model: string; input: string }) => Promise<{ output_parsed: unknown }>>(
    async () => ({ output_parsed: output }),
  ),
) {
  return {
    parse,
    client: {
      responses: {
        parse,
      },
    },
  };
}

describe("OpenAI intent interpreter", () => {
  it("returns a parsed intent from structured output", async () => {
    const output = interpreted({
      intent: "ADD_PRODUCT",
      entities: entities({
        product_name: "Tomatoes",
        quantity: 20,
        unit: "kg",
        price: 1,
      }),
    });
    const { parse, client } = mockClient(output);
    const interpreter = createOpenAIIntentInterpreter(client);

    const result = await interpreter.interpret({
      text: "I have 20kg tomatoes at $1",
      userType: "VENDOR",
      state: "VENDOR_MENU",
    });

    expect(result).toEqual(output);
    expect(parse).toHaveBeenCalledOnce();
    expect(parse.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        input: expect.stringContaining("I have 20kg tomatoes at $1"),
      }),
    );
    expect(JSON.stringify(parse.mock.calls[0]?.[0])).not.toMatch(/sk-/);
  });

  it("returns null when structured output fails Zod validation", async () => {
    const interpreter = createOpenAIIntentInterpreter(
      mockClient({ intent: "ADD_PRODUCT", confidence: 0.9 }).client,
    );

    await expect(
      interpreter.interpret({
        text: "I have tomatoes",
        userType: "UNKNOWN",
        state: "MAIN_MENU",
      }),
    ).resolves.toBeNull();
  });

  it("returns null when the OpenAI request fails", async () => {
    const interpreter = createOpenAIIntentInterpreter(
      mockClient(
        null,
        vi.fn<(body: { model: string; input: string }) => Promise<{ output_parsed: unknown }>>(
          async () => {
            throw new Error("upstream timeout");
          },
        ),
      ).client,
    );

    await expect(
      interpreter.interpret({
        text: "I have 20kg tomatoes at $1",
        userType: "VENDOR",
        state: "VENDOR_MENU",
      }),
    ).resolves.toBeNull();
  });

  it("returns null when no client is configured", async () => {
    const interpreter = createOpenAIIntentInterpreter(null);
    await expect(
      interpreter.interpret({
        text: "I have 20kg tomatoes at $1",
        userType: "VENDOR",
        state: "VENDOR_MENU",
      }),
    ).resolves.toBeNull();
  });
});

describe("intent routing", () => {
  it("skips interpretation for menu numbers, confirmations, and greetings", () => {
    const cases: Array<[string, ConversationState, Partial<WhatsAppInboundMessage>]> = [
      ["1", "MAIN_MENU", {}],
      ["yes", "VENDOR_MENU", { choiceId: "yes" }],
      ["hello", "NEW", {}],
      ["help", "CUSTOMER_MENU", {}],
      ["menu", "VENDOR_MENU", {}],
      ["Add / Sell a Product", "VENDOR_MENU", { type: "interactive", choiceId: "1" }],
    ];

    for (const [text, state, extras] of cases) {
      expect(shouldInterpretIntent(normalizeInput(inbound(text, extras)), state)).toBe(false);
    }

    expect(
      shouldInterpretIntent(
        normalizeInput(inbound("I have 20kg tomatoes at $1")),
        "VENDOR_MENU",
      ),
    ).toBe(true);
  });

  it("does not call OpenAI for numbered menu replies", async () => {
    const interpret = vi.fn(async () => interpreted({ intent: "SEARCH_PRODUCT" }));
    const { engine } = createConversationHarness({ intent: { interpret } });

    await say(engine, "hi");
    await say(engine, "1");

    expect(interpret).not.toHaveBeenCalled();
  });

  it("asks the vendor to confirm an NL listing and does not write until YES", async () => {
    const { engine, products } = createConversationHarness({
      intent: {
        interpret: async () =>
          interpreted({
            intent: "ADD_PRODUCT",
            entities: entities({
              product_name: "Tomatoes",
              quantity: 20,
              unit: "kg",
              price: 1,
            }),
          }),
      },
    });

    await registerVendor(engine);
    const confirm = await say(engine, "I have 20kg tomatoes at $1");

    expect(products).toHaveLength(0);
    expect(confirm.session.current_state).toBe("ADD_PRODUCT_CONFIRM");
    expect(confirm.replies.some((reply) => reply.kind === "interactive")).toBe(true);

    const published = await say(engine, "YES", { choiceId: "yes" });
    expect(products).toHaveLength(1);
    expect(products[0]?.name).toBe("Tomatoes");
    expect(products[0]?.status).toBe("ACTIVE");
    expect(published.session.current_state).toBe("VENDOR_MENU");
  });

  it("asks for the first missing product field instead of guessing", async () => {
    const { engine, products } = createConversationHarness({
      intent: {
        interpret: async () =>
          interpreted({
            intent: "ADD_PRODUCT",
            entities: entities({ product_name: "Tomatoes", quantity: 20 }),
          }),
      },
    });

    await registerVendor(engine);
    const result = await say(engine, "I want to sell 20 tomatoes");

    expect(products).toHaveLength(0);
    expect(result.session.current_state).toBe("ADD_PRODUCT_UNIT");
  });

  it("falls back to the menu when confidence is low", async () => {
    const { engine } = createConversationHarness({
      intent: {
        interpret: async () =>
          interpreted({
            intent: "ADD_PRODUCT",
            confidence: 0.4,
            entities: entities({ product_name: "Tomatoes", quantity: 20, unit: "kg", price: 1 }),
          }),
      },
    });

    await registerVendor(engine);
    const result = await say(engine, "maybe tomatoes or something");

    expect(result.session.current_state).toBe("VENDOR_MENU");
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message.body,
    ).toMatch(/Vendor Menu/);
  });

  it("searches instead of creating an order from CREATE_ORDER", async () => {
    const vendor = { phoneNumber: "+263771234567", waId: "263771234567" };
    const buyer = { phoneNumber: "+263772222222", waId: "263772222222" };
    const { engine, products, orders } = createConversationHarness({
      intent: {
        interpret: async () =>
          interpreted({
            intent: "CREATE_ORDER",
            entities: entities({
              product_name: "tomatoes",
              quantity: 3,
              location: "Mbare",
            }),
          }),
      },
    });

    await registerVendor(engine, vendor);
    await say(engine, "1", vendor);
    await say(engine, "Tomatoes", vendor);
    await say(engine, "20", vendor);
    await say(engine, "kg", vendor);
    await say(engine, "1", vendor);
    await say(engine, "SKIP", { ...vendor, choiceId: "skip" });
    await say(engine, "YES", { ...vendor, choiceId: "yes" });
    expect(products).toHaveLength(1);

    await say(engine, "hi", buyer);
    const result = await say(engine, "I want 3kg tomatoes in Mbare", buyer);

    expect(orders).toHaveLength(0);
    expect(result.session.current_state).toBe("SEARCH_RESULTS");
    expect(result.replies[0]?.kind === "text" && result.replies[0].text).toMatch(/Tomatoes/);
  });

  it("starts vendor registration and keeps a pending listing for an unknown seller", async () => {
    const { engine, vendors, products } = createConversationHarness({
      intent: {
        interpret: async () =>
          interpreted({
            intent: "ADD_PRODUCT",
            entities: entities({
              product_name: "Tomatoes",
              quantity: 20,
              unit: "kg",
              price: 1,
              first_name: "Tariro",
              business_name: "Tariro Fresh Produce",
              location: "Harare, Mbare",
            }),
          }),
      },
    });

    const started = await say(engine, "I have 20kg tomatoes at $1 in Mbare");
    expect(vendors).toHaveLength(0);
    expect(products).toHaveLength(0);
    expect(started.session.current_state).toBe("VENDOR_REGISTRATION_CATEGORY");

    await say(engine, "1");
    await say(engine, "1");
    const registered = await say(engine, "YES", { choiceId: "yes" });

    expect(vendors).toHaveLength(1);
    expect(vendors[0]?.status).toBe("ACTIVE");
    expect(products).toHaveLength(0);
    expect(registered.session.current_state).toBe("ADD_PRODUCT_CONFIRM");

    await say(engine, "YES", { choiceId: "yes" });
    expect(products).toHaveLength(1);
    expect(products[0]?.name).toBe("Tomatoes");
  });

  it("falls back to the deterministic menu when OpenAI returns nothing", async () => {
    const interpret = vi.fn(async () => null);
    const { engine } = createConversationHarness({ intent: { interpret } });

    const result = await say(engine, "I would like some help finding food");
    expect(interpret).toHaveBeenCalledOnce();
    expect(result.session.current_state).toBe("MAIN_MENU");
  });
});
