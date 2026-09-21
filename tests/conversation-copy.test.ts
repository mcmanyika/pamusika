import { describe, expect, it } from "vitest";
import {
  productListText,
  ratingPromptReplies,
  searchResultsReply,
  searchResultsText,
  vendorChatReply,
} from "@/lib/conversation/copy";
import type { ProductSearchHit } from "@/lib/services/product.service";
import type { Product } from "@/types/database";

function product(overrides: Partial<Product> = {}): Product {
  const now = new Date().toISOString();
  return {
    id: "prod-1",
    vendor_id: "vendor-1",
    category_id: "cat-produce",
    name: "Tomatoes",
    description: null,
    price: "1",
    currency: "USD",
    quantity: "20",
    unit: "kg",
    image_url: null,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function hit(overrides: Partial<ProductSearchHit> = {}): ProductSearchHit {
  return {
    ...product(),
    vendor: {
      id: "vendor-1",
      vendor_code: "PS-HRE-000001",
      business_name: "Tariro Fresh Produce",
      area: "Mbare",
      city: "Harare",
      status: "ACTIVE",
      whatsapp_number: "+263771234567",
    },
    category: { id: "cat-produce", name: "Produce", slug: "produce" },
    ...overrides,
  };
}

describe("WhatsApp product listings", () => {
  it("formats the vendor product list as cards", () => {
    const text = productListText([
      product(),
      product({ id: "prod-2", name: "Onions", quantity: "8", unit: "bag", price: "12", status: "PAUSED" }),
    ]);

    expect(text).toContain("*Your products* · 2");
    expect(text).toContain("*1. Tomatoes*");
    expect(text).toContain("20 kg · $1.00/kg");
    expect(text).toContain("Active");
    expect(text).toContain("*2. Onions*");
    expect(text).toContain("8 bag · $12.00/bag");
    expect(text).toContain("Paused");
    expect(text).not.toContain(" — ");
  });

  it("formats buyer search results as cards and a picker", () => {
    const results = [hit(), hit({ id: "prod-2", name: "Rape", quantity: "40", unit: "bundle", price: "0.5" })];
    const text = searchResultsText(results);
    const replies = searchResultsReply(results);

    expect(text).toContain("*Products found* · 2");
    expect(text).toContain("*1. Tomatoes*");
    expect(text).toContain("$1.00/kg · 20 kg left");
    expect(text).toContain("Tariro Fresh Produce · Mbare");
    expect(text).not.toContain("Here's what I found");

    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({
      kind: "interactive",
      message: {
        header: "Products found",
        footer: "Tap a product to order",
        buttons: [
          { id: "1", title: "Tomatoes" },
          { id: "2", title: "Rape" },
          { id: "menu", title: "Main menu" },
        ],
      },
    });
  });

  it("offers a 1-5 rating picker after a completed order", () => {
    const replies = ratingPromptReplies({
      orderId: "order-1",
      orderNumber: "PS-10001",
      raterType: "CUSTOMER",
      rateeName: "Tariro Fresh Produce",
    });

    expect(replies[0]).toMatchObject({
      kind: "interactive",
      message: {
        header: "Rate the vendor",
        list: {
          button: "Rate",
        },
      },
    });
    expect(replies[0]?.kind === "interactive" && replies[0].message.body).toContain(
      "How was Tariro Fresh Produce?",
    );
  });

  it("links Chat with Vendor to the vendor WhatsApp chat", () => {
    expect(vendorChatReply("How much Tomatoes would you like?", "+263771234567")).toMatchObject({
      kind: "interactive",
      message: {
        body: "How much Tomatoes would you like?",
        ctaUrl: {
          displayText: "Chat with Vendor",
          url: "https://wa.me/263771234567",
        },
      },
    });
  });
});
