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
    ).toBe("Choose an option.");
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message,
    ).toMatchObject({
      header: "PaySell Musika",
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
        (reply) => reply.kind === "interactive" && reply.message.header === "Vendor menu",
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
    await say(engine, "1");
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
    expect(products[0]?.category_id).toBe("cat-produce");
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
    await say(engine, "1");
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
    await say(engine, "1");
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

  it("returns the clickable home menu when the user sends Menu", async () => {
    const { engine } = createConversationHarness();
    await say(engine, "Buyer", { type: "interactive", choiceId: "buyer" });
    const result = await say(engine, "Menu");

    expect(result.session.current_state).toBe("MAIN_MENU");
    expect(result.replies[0]?.kind === "interactive" && result.replies[0].message).toMatchObject({
      header: "PaySell Musika",
      body: "Choose an option.",
      buttons: [
        { id: "buyer", title: "Buyer" },
        { id: "vendor", title: "Vendor" },
      ],
    });
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
    expect(result.replies).toHaveLength(1);
    expect(
      result.replies[0]?.kind === "interactive" && result.replies[0].message,
    ).toMatchObject({
      header: "Buyer menu",
      list: {
        button: "Choose",
        sections: [
          {
            title: "Menu",
            rows: [
              { id: "1", title: "Find products" },
              { id: "2", title: "Browse categories" },
              { id: "3", title: "Vendors near me" },
              { id: "4", title: "My orders" },
              { id: "5", title: "My addresses" },
              { id: "6", title: "Help / Support" },
              { id: "7", title: "Invite" },
              { id: "menu", title: "Main menu" },
            ],
          },
        ],
      },
    });
  });

  it("returns to the main menu from buyer and vendor menus", async () => {
    const { engine } = createConversationHarness();
    await say(engine, "hi");
    await say(engine, "Buyer", { type: "interactive", choiceId: "buyer" });

    const fromBuyer = await say(engine, "Main Menu", {
      type: "interactive",
      choiceId: "menu",
    });
    expect(fromBuyer.session.current_state).toBe("MAIN_MENU");
    expect(fromBuyer.replies[0]?.kind === "interactive" && fromBuyer.replies[0].message.buttons).toEqual([
      { id: "buyer", title: "Buyer" },
      { id: "vendor", title: "Vendor" },
    ]);

    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { choiceId: "yes" });
    expect((await say(engine, "hello")).session.current_state).toBe("MAIN_MENU");

    await say(engine, "Vendor", { type: "interactive", choiceId: "vendor" });
    const fromVendor = await say(engine, "Main Menu", {
      type: "interactive",
      choiceId: "menu",
    });
    expect(fromVendor.session.current_state).toBe("MAIN_MENU");
    expect(fromVendor.replies[0]?.kind === "interactive" && fromVendor.replies[0].message.buttons).toEqual([
      { id: "buyer", title: "Buyer" },
      { id: "vendor", title: "Vendor" },
    ]);
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
    expect(vendor.replies).toHaveLength(1);
    expect(
      vendor.replies[0]?.kind === "interactive" && vendor.replies[0].message.list?.sections[0]?.rows,
    ).toEqual(
      expect.arrayContaining([
        { id: "1", title: "Sell a product" },
        { id: "8", title: "Harvest plans" },
        { id: "menu", title: "Main menu" },
      ]),
    );
  });

  it("lets a customer search, order, and a vendor complete the sale", async () => {
    const { engine, products, orders, ratings } = createConversationHarness();
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
    await say(engine, "1", vendor);
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
    const completed = await say(engine, "COMPLETE", { ...vendor, choiceId: completeButton?.id });

    expect(orders[0]?.status).toBe("COMPLETED");
    expect(products[0]?.quantity).toBe("17");
    expect(completed.session.current_state).toBe("RATE_ORDER");
    expect(
      completed.replies[0]?.kind === "interactive" && completed.replies[0].message.header,
    ).toBe("Rate the buyer");
    expect(completed.notifications[0]?.phoneNumber).toBe(buyer.phoneNumber);

    const vendorRated = await say(engine, "5", vendor);
    expect(vendorRated.session.current_state).toBe("VENDOR_MENU");
    expect(ratings).toHaveLength(1);
    expect(ratings[0]?.rater_type).toBe("VENDOR");
    expect(ratings[0]?.score).toBe(5);

    const buyerRated = await say(engine, "4", buyer);
    expect(buyerRated.session.current_state).toBe("CUSTOMER_MENU");
    expect(ratings).toHaveLength(2);
    expect(ratings[1]?.rater_type).toBe("CUSTOMER");
    expect(ratings[1]?.score).toBe(4);
  });

  it("lets a buyer save more than one delivery address", async () => {
    const { engine, customers, addresses } = createConversationHarness();
    await say(engine, "Buyer", { type: "interactive", choiceId: "buyer" });
    const opened = await say(engine, "5");
    expect(opened.session.current_state).toBe("CUSTOMER_ADDRESSES");
    const adding = await say(engine, "Add address", { type: "interactive", choiceId: "add" });
    expect(adding.session.current_state).toBe("CUSTOMER_ADDRESS_LABEL");
    const labeled = await say(engine, "Home", { type: "interactive", choiceId: "home" });
    expect(labeled.session.current_state).toBe("CUSTOMER_ADDRESS_LINE");
    const lined = await say(engine, "Stand 14, Mbare Musika");
    expect(lined.session.current_state).toBe("CUSTOMER_ADDRESS_LOCATION");
    const located = await say(engine, "Harare, Mbare");
    expect(located.session.current_state).toBe("CUSTOMER_ADDRESS_CONFIRM");
    const saved = await say(engine, "YES", { choiceId: "yes" });
    expect(saved.session.current_state).toBe("CUSTOMER_ADDRESSES");
    expect(addresses).toHaveLength(1);

    await say(engine, "Add address", { type: "interactive", choiceId: "add" });
    await say(engine, "Work", { type: "interactive", choiceId: "work" });
    await say(engine, "Joina City");
    await say(engine, "Harare, CBD");
    const result = await say(engine, "YES", { choiceId: "yes" });

    expect(customers).toHaveLength(1);
    expect(addresses).toHaveLength(2);
    expect(addresses.filter((address) => address.is_default)).toHaveLength(1);
    expect(addresses[0]?.line1).toBe("Stand 14, Mbare Musika");
    expect(addresses[1]?.label).toBe("Work");
    expect(result.session.current_state).toBe("CUSTOMER_ADDRESSES");
    expect(result.identity.userType).toBe("CUSTOMER");
  });

  it("lets a vendor invite a new number with a referral code", async () => {
    const { engine, referrals } = createConversationHarness();
    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { choiceId: "yes" });

    const invite = await say(engine, "7");
    const inviteText = invite.replies[0]?.kind === "text" ? invite.replies[0].text : "";
    const code = /PS-R[A-Z0-9]+/.exec(inviteText)?.[0];
    expect(code).toMatch(/^PS-R[A-Z0-9]{5}$/);

    const guest = { phoneNumber: "+263779999999", waId: "263779999999" };
    const applied = await say(engine, `REF ${code}`, guest);
    expect(applied.replies[0]?.kind === "text" && applied.replies[0].text).toMatch(/Referral saved/i);
    expect(referrals[0]?.status).toBe("PENDING");

    await say(engine, "2", guest);
    await say(engine, "Rudo", guest);
    await say(engine, "Rudo Greens", guest);
    await say(engine, "1", guest);
    await say(engine, "Harare, CBD", guest);
    await say(engine, "1", guest);
    await say(engine, "YES", { ...guest, choiceId: "yes" });

    expect(referrals[0]?.status).toBe("QUALIFIED");
    expect(referrals[0]?.referee_type).toBe("VENDOR");
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

  it("blocks a suspended buyer from using WhatsApp commerce", async () => {
    const { engine, customers } = createConversationHarness();
    await say(engine, "Buyer", { type: "interactive", choiceId: "buyer" });
    await say(engine, "5");
    await say(engine, "Add address", { type: "interactive", choiceId: "add" });
    await say(engine, "Home", { type: "interactive", choiceId: "home" });
    await say(engine, "Stand 14, Mbare Musika");
    await say(engine, "Harare, Mbare");
    await say(engine, "YES", { choiceId: "yes" });
    expect(customers[0]?.status).toBe("ACTIVE");
    customers[0]!.status = "SUSPENDED";

    const result = await say(engine, "1");
    expect(result.replies[0]).toMatchObject({
      kind: "text",
      text: "Your PaySell buyer account is suspended. Reply HELP if you need support.",
    });

    const help = await say(engine, "help");
    expect(help.session.current_state).toBe("SUPPORT");
  });

  it("blocks a suspended vendor from using WhatsApp commerce", async () => {
    const { engine, vendors } = createConversationHarness();
    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { type: "interactive", choiceId: "yes" });
    vendors[0]!.status = "SUSPENDED";

    const result = await say(engine, "1");
    expect(result.replies[0]).toMatchObject({
      kind: "text",
      text: "Your PaySell vendor account is suspended. Reply HELP if you need support.",
    });
  });

  it("lets a vendor record and cancel an expected harvest", async () => {
    const { engine, harvestPlans } = createConversationHarness();
    await say(engine, "2");
    await say(engine, "Tariro");
    await say(engine, "Tariro Fresh Produce");
    await say(engine, "1");
    await say(engine, "Harare, Mbare");
    await say(engine, "1");
    await say(engine, "YES", { type: "interactive", choiceId: "yes" });

    const menu = await say(engine, "8");
    expect(menu.session.current_state).toBe("HARVEST_MENU");

    await say(engine, "1");
    await say(engine, "Tomatoes");
    await say(engine, "1");
    await say(engine, "200");
    await say(engine, "kg");
    await say(engine, "April 2027");
    const saved = await say(engine, "YES", { type: "interactive", choiceId: "yes" });

    expect(saved.session.current_state).toBe("HARVEST_MENU");
    expect(harvestPlans).toHaveLength(1);
    expect(harvestPlans[0]?.crop_name).toBe("Tomatoes");
    expect(harvestPlans[0]?.harvest_month).toBe(4);
    expect(harvestPlans[0]?.harvest_year).toBe(2027);
    expect(harvestPlans[0]?.status).toBe("PLANNED");
    expect(harvestPlans[0]?.area).toBe("Mbare");

    await say(engine, "2");
    await say(engine, "1");
    const cancelled = await say(engine, "YES", { type: "interactive", choiceId: "yes" });
    expect(cancelled.session.current_state).toBe("HARVEST_MENU");
    expect(harvestPlans[0]?.status).toBe("CANCELLED");
  });
});
