import { describe, expect, it } from "vitest";
import { createConversationHarness, inbound } from "./helpers/conversation";

async function say(
  engine: ReturnType<typeof createConversationHarness>["engine"],
  text: string,
  extras: Parameters<typeof inbound>[1] = {},
) {
  return engine.handle(inbound(text, extras));
}

describe("conversation engine", () => {
  it("shows the main menu to a new number", async () => {
    const { engine } = createConversationHarness();
    const result = await say(engine, "hello");

    expect(result.session.current_state).toBe("MAIN_MENU");
    expect(result.replies[0]).toMatchObject({ kind: "interactive" });
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message.body,
    ).toMatch(/Commerce through conversation/i);
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message,
    ).toMatchObject({
      header: "PaySell",
      footer: "Tap a button to continue",
      buttons: [
        { id: "buyer", title: "Buyer" },
        { id: "vendor", title: "Vendor" },
      ],
    });
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message.list,
    ).toBeUndefined();
  });

  it("registers a vendor through the menu and activates them on confirm", async () => {
    const { engine, vendors } = createConversationHarness();

    await say(engine, "hi");
    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    const result = await say(engine, "YES", { type: "interactive", choiceId: "yes" });

    expect(vendors).toHaveLength(1);
    expect(vendors[0]?.status).toBe("ACTIVE");
    expect(vendors[0]?.business_name).toBe("Tariro Fresh Produce");
    expect(vendors[0]?.area).toBe("Mbare");
    expect(result.identity.userType).toBe("VENDOR");
    expect(result.session.current_state).toBe("VENDOR_MENU");
    expect(
      result.replies.some(
        (reply) => reply.kind === "interactive" && /vendor menu/i.test(reply.message.body),
      ),
    ).toBe(true);
  });

  it("does not create a vendor when the user chooses CHANGE", async () => {
    const { engine, vendors } = createConversationHarness();

    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    const result = await say(engine, "CHANGE", { type: "interactive", choiceId: "change" });

    expect(vendors).toHaveLength(0);
    expect(result.session.current_state).toBe("VENDOR_REGISTRATION_NAME");
  });

  it("keeps products in draft until the vendor confirms publish", async () => {
    const { engine, products } = createConversationHarness();

    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { choiceId: "yes" });
    await say(engine, "1");
    await say(engine, "Tomatoes");
    await say(engine, "20");
    await say(engine, "1");
    await say(engine, "$1");
    const before = await say(engine, "SKIP", { choiceId: "skip" });

    expect(products).toHaveLength(0);
    expect(before.session.current_state).toBe("ADD_PRODUCT_CONFIRM");

    const published = await say(engine, "YES", { choiceId: "yes" });
    expect(products).toHaveLength(1);
    expect(products[0]?.status).toBe("ACTIVE");
    expect(products[0]?.name).toBe("Tomatoes");
    expect(published.session.current_state).toBe("VENDOR_MENU");
  });

  it("does not publish a product after CHANGE", async () => {
    const { engine, products } = createConversationHarness();

    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { choiceId: "yes" });
    await say(engine, "1");
    await say(engine, "Tomatoes");
    await say(engine, "20");
    await say(engine, "kg");
    await say(engine, "1");
    await say(engine, "SKIP", { choiceId: "skip" });
    const result = await say(engine, "CHANGE", { choiceId: "change" });

    expect(products).toHaveLength(0);
    expect(result.session.current_state).toBe("ADD_PRODUCT_NAME");
  });

  it("accepts an image during the photo step without creating a product yet", async () => {
    const { engine, products } = createConversationHarness();

    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Mbare");
    await say(engine, "1");
    await say(engine, "YES", { choiceId: "yes" });
    await say(engine, "1");
    await say(engine, "Tomatoes");
    await say(engine, "20");
    await say(engine, "1");
    await say(engine, "1");
    const result = await engine.handle(
      inbound(null, {
        type: "image",
        text: null,
        supported: false,
        mediaId: "media-9",
      }),
    );

    expect(products).toHaveLength(0);
    expect(result.session.current_state).toBe("ADD_PRODUCT_CONFIRM");
    expect(result.replies.some((reply) => reply.kind === "text" && /Photo uploads/.test(reply.text))).toBe(
      true,
    );
  });

  it("opens vendor registration from the Vendor Menu button", async () => {
    const { engine } = createConversationHarness();
    await say(engine, "hi");
    const result = await say(engine, "Vendor", {
      type: "interactive",
      choiceId: "vendor",
    });
    expect(result.session.current_state).toBe("VENDOR_REGISTRATION_NAME");
  });

  it("opens the buyer menu from the Buyer Menu button", async () => {
    const { engine } = createConversationHarness();
    await say(engine, "hi");
    const result = await say(engine, "Buyer", {
      type: "interactive",
      choiceId: "buyer",
    });
    expect(result.session.current_state).toBe("CUSTOMER_MENU");
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message.body,
    ).toMatch(/Buyer menu/i);
  });

  it("returns registered vendors to the two-button main menu", async () => {
    const { engine } = createConversationHarness();
    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { choiceId: "yes" });

    const home = await say(engine, "hello");
    expect(home.session.current_state).toBe("MAIN_MENU");
    expect(home.replies[0]?.kind === "interactive" && home.replies[0].message.buttons).toEqual([
      { id: "buyer", title: "Buyer" },
      { id: "vendor", title: "Vendor" },
    ]);

    const vendor = await say(engine, "Vendor", {
      type: "interactive",
      choiceId: "vendor",
    });
    expect(vendor.session.current_state).toBe("VENDOR_MENU");
    expect(
      vendor.replies[0]?.kind === "interactive" && vendor.replies[0].message.body,
    ).toMatch(/vendor menu/i);
  });

  it("lets a customer search, order, and a vendor complete the sale", async () => {
    const { engine, products, orders } = createConversationHarness();
    const vendor = { phoneNumber: "+263771234567", waId: "263771234567" };
    const buyer = { phoneNumber: "+263772222222", waId: "263772222222" };

    await say(engine, "2", vendor);
    await say(engine, "Tariro", vendor);
    await say(engine, "Tariro Fresh Produce", vendor);
    await say(engine, "1", vendor);
    await say(engine, "Harare, Mbare", vendor);
    await say(engine, "1", vendor);
    await say(engine, "YES", { ...vendor, choiceId: "yes" });
    await say(engine, "1", vendor);
    await say(engine, "Tomatoes", vendor);
    await say(engine, "20", vendor);
    await say(engine, "kg", vendor);
    await say(engine, "1", vendor);
    await say(engine, "SKIP", { ...vendor, choiceId: "skip" });
    await say(engine, "YES", { ...vendor, choiceId: "yes" });

    await say(engine, "hi", buyer);
    await say(engine, "1", buyer);
    await say(engine, "1", buyer);
    await say(engine, "tomatoes", buyer);
    await say(engine, "Mbare", buyer);
    await say(engine, "1", buyer);
    await say(engine, "3", buyer);
    const placed = await say(engine, "YES", { ...buyer, choiceId: "yes" });

    expect(orders).toHaveLength(1);
    expect(orders[0]?.status).toBe("PENDING_VENDOR");
    expect(placed.notifications).toHaveLength(1);
    expect(placed.identity.userType).toBe("CUSTOMER");

    const acceptButton =
      placed.notifications[0]?.replies[0]?.kind === "interactive"
        ? placed.notifications[0].replies[0].message.buttons?.[0]
        : null;
    expect(acceptButton?.id).toMatch(/^accept:/);

    const accepted = await say(engine, "ACCEPT", {
      ...vendor,
      choiceId: acceptButton?.id,
    });
    expect(orders[0]?.status).toBe("ACCEPTED");
    expect(accepted.notifications[0]?.phoneNumber).toBe(buyer.phoneNumber);

    const readyButton =
      accepted.replies[0]?.kind === "interactive"
        ? accepted.replies[0].message.buttons?.[0]
        : null;
    const readied = await say(engine, "READY", {
      ...vendor,
      choiceId: readyButton?.id,
    });
    expect(orders[0]?.status).toBe("READY");

    const completeButton =
      readied.replies[0]?.kind === "interactive"
        ? readied.replies[0].message.buttons?.[0]
        : null;
    await say(engine, "COMPLETE", { ...vendor, choiceId: completeButton?.id });

    expect(orders[0]?.status).toBe("COMPLETED");
    expect(products[0]?.quantity).toBe("17");
  });

  it("creates a support ticket when the user asks to talk to support", async () => {
    const { engine, tickets } = createConversationHarness();
    await say(engine, "help");
    const result = await say(engine, "2");

    expect(tickets).toHaveLength(1);
    expect(tickets[0]?.status).toBe("OPEN");
    expect(tickets[0]?.phone_number).toBe("+263771234567");
    expect(result.replies[0]?.kind === "text" && result.replies[0].text).toMatch(/support person/i);
  });
});
