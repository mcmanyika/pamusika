import { moneyString, parseDecimal } from "@/lib/commerce/money";
import { buttonReply, singleMenuReplies } from "@/lib/conversation/replies";
import { PRODUCT_UNITS } from "@/types/commerce";
import type { Product, Vendor } from "@/types/database";
import type { OrderRecord } from "@/lib/services/order.service";
import type { ProductSearchHit } from "@/lib/services/product.service";
import type { OrderDraft, ProductDraft, RegistrationDraft } from "@/types/conversation";
import type { EngineReply } from "@/types/whatsapp";

export const COPY = {
  unsupported:
    "I can only read text messages right now. Please send your request as text.",
  tryAgain: "I didn't catch that. Please try again, or reply MENU.",
  vendorInactive:
    "Your PaySell business is not active yet, so you cannot list products. Reply HELP if you need support.",
  photoLater:
    "Photo uploads are coming next. I'll continue without a photo for now.",
  askName: "What is your name?",
  askBusiness: "What is your business name?",
  askLocation: "Which city and area?\n\nExample: Harare, Mbare",
  askProductName: "What would you like to sell?",
  askQuantity: "How much do you have?",
  askPrice: "What is the price per unit? Example: 1 or $1.00",
  askImage: "Send a product photo, or reply SKIP to continue without one.",
  invalidName: "Please send your name as text.",
  invalidBusiness: "Please send a business name.",
  invalidCategory: "Reply with the number next to a category.",
  invalidLocation: "Please send a city and area. Example: Harare, Mbare",
  invalidLanguage: "Reply 1 for English, 2 for Shona, or 3 for Ndebele.",
  invalidQuantity: "Please send a quantity greater than 0. Example: 20",
  invalidUnit: "Reply with the number next to a unit, or type kg, item, bundle, bag, box, or other.",
  invalidPrice: "Please send a price greater than 0. Example: 1 or $1.00",
  noCategories: "No product categories are available yet. Reply MENU to go back.",
  noProducts: "You have no products yet.\n\nReply 1 to sell a product, or MENU to go back.",
  published: "Published. Customers can now find this product.",
  registered: "Your PaySell business is ready.",
  noSearchResults:
    "No products matched that search. Try another name or area, or reply MENU.",
  askSearchQuery: "What are you looking for? Example: tomatoes",
  askSearchLocation:
    "Which area should I search?\n\nExample: Mbare\nReply SKIP to search everywhere.",
  invalidSearchQuery: "Please send the product you want, like tomatoes.",
  invalidResultChoice: "Reply with the number next to a product, or MENU to go back.",
  invalidOrderQuantity:
    "Please send a quantity greater than 0, and not more than what is available.",
  noOrders: "You have no orders yet.\n\nReply 1 to find products, or MENU to go back.",
  noVendorOrders: "You have no open customer orders.\n\nReply MENU to go back.",
  orderPlaced: "Order placed. We'll message you when the vendor responds.",
  orderAlreadyPlaced: "This order was already placed.",
  supportCreated:
    "A support person will follow up on WhatsApp. Reply 1 for the main menu.",
} as const;

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sn", label: "Shona" },
  { code: "nd", label: "Ndebele" },
] as const;

export function mainMenuText(): string {
  return "Choose an option.";
}

export function helpText(): string {
  return `PaySell Help

Buyers can search products and place collection orders.
Vendors can list products and accept, ready, and complete orders.

What would you like to do?`;
}

const VENDOR_MENU_BUTTONS = [
  { id: "1", title: "➕ Sell a Product" },
  { id: "2", title: "📦 My Products" },
  { id: "3", title: "🛒 Customer Orders" },
  { id: "4", title: "📊 My Sales" },
  { id: "5", title: "🏪 My Business" },
  { id: "6", title: "❓ Help / Support" },
  { id: "menu", title: "🏠 Main Menu" },
];

const CUSTOMER_MENU_BUTTONS = [
  { id: "1", title: "🔎 Find Products" },
  { id: "2", title: "📂 Browse Categories" },
  { id: "3", title: "📍 Vendors Near Me" },
  { id: "4", title: "📦 My Orders" },
  { id: "5", title: "❓ Help / Support" },
  { id: "menu", title: "🏠 Main Menu" },
];

const HELP_MENU_BUTTONS = [
  { id: "1", title: "🏠 Main Menu" },
  { id: "2", title: "👤 Talk to Support" },
];

export function mainMenuReply(): EngineReply {
  return buttonReply(
    mainMenuText(),
    [
      { id: "buyer", title: "Buyer" },
      { id: "vendor", title: "Vendor" },
    ],
    {
      header: "PaySell Musika",
      footer: "Tap a button to continue",
    },
  );
}

export function vendorMenuReplies(): EngineReply[] {
  return singleMenuReplies(VENDOR_MENU_BUTTONS, {
    header: "Vendor menu",
    footer: "Tap Choose to continue",
  });
}

export function customerMenuReplies(): EngineReply[] {
  return singleMenuReplies(CUSTOMER_MENU_BUTTONS, {
    header: "Buyer menu",
    footer: "Tap Choose to continue",
  });
}

export function helpReplies(): EngineReply[] {
  return singleMenuReplies(HELP_MENU_BUTTONS, {
    header: "PaySell Help",
    body: helpText(),
    footer: "Tap a button to continue",
  });
}

export function categoryMenuReplies(categories: Array<{ name: string }>): EngineReply[] {
  return singleMenuReplies(
    categories.slice(0, 10).map((category, index) => ({
      id: String(index + 1),
      title: category.name,
    })),
    {
      header: "What do you sell?",
      footer: "Tap Choose to continue",
    },
  );
}

export function browseCategoryMenuReplies(categories: Array<{ name: string }>): EngineReply[] {
  return singleMenuReplies(
    categories.slice(0, 10).map((category, index) => ({
      id: String(index + 1),
      title: category.name,
    })),
    {
      header: "Browse categories",
      footer: "Tap Choose to continue",
    },
  );
}

export function languageMenuReplies(): EngineReply[] {
  return singleMenuReplies(
    LANGUAGES.map((language, index) => ({
      id: String(index + 1),
      title: language.label,
    })),
    {
      header: "Language",
      footer: "Tap a language",
    },
  );
}

export function unitMenuReplies(): EngineReply[] {
  return singleMenuReplies(
    PRODUCT_UNITS.map((unit, index) => ({
      id: String(index + 1),
      title: unit,
    })),
    {
      header: "What unit?",
      footer: "Tap Choose to continue",
    },
  );
}

export function registrationConfirmText(draft: RegistrationDraft): string {
  const location = [draft.area, draft.city].filter(Boolean).join(", ") || "Not set";
  return `Please confirm:

Name: ${draft.firstName ?? ""}
Business: ${draft.businessName ?? ""}
Category: ${draft.categoryName ?? "Other"}
Location: ${location}
Language: ${draft.preferredLanguageLabel ?? "English"}

Create your PaySell business?`;
}

export function productConfirmText(draft: ProductDraft): string {
  const unit = draft.unit ?? "item";
  const quantity = draft.quantity ?? 0;
  const price = moneyString(draft.price ?? 0);
  return `Please confirm:

${draft.name ?? "Product"}
${quantity} ${unit}
$${price}/${unit}

Publish?`;
}

export function productListText(products: Product[]): string {
  if (products.length === 0) {
    return COPY.noProducts;
  }

  const lines = products.slice(0, 10).map((product, index) => {
    return `${index + 1}. ${product.name} — ${product.quantity} ${product.unit} — $${moneyString(parseDecimal(product.price, "price"))}/${product.unit} — ${product.status}`;
  });

  return `Your products

${lines.join("\n")}

Reply MENU to go back.`;
}

export function vendorProfileText(vendor: Vendor): string {
  const location = [vendor.area, vendor.city].filter(Boolean).join(", ") || "Not set";
  return `${vendor.vendor_code}

${vendor.business_name ?? "Your business"}
${location}
Status: ${vendor.status}

Reply MENU to go back.`;
}

export function searchResultsText(results: ProductSearchHit[]): string {
  const lines = results.map((hit, index) => {
    const place = [hit.vendor.area, hit.vendor.business_name].filter(Boolean).join(" · ");
    return `${index + 1}. ${hit.name} — $${moneyString(parseDecimal(hit.price, "price"))}/${hit.unit} — ${hit.quantity} ${hit.unit}\n   ${place}`;
  });

  return `Here's what I found:

${lines.join("\n")}

Reply with a number to order, or MENU to go back.`;
}

export function orderSummaryText(draft: OrderDraft): string {
  const unit = draft.unit ?? "item";
  const quantity = draft.quantity ?? 0;
  const unitPrice = moneyString(draft.unitPrice ?? 0);
  const total = moneyString(quantity * (draft.unitPrice ?? 0));
  return `Order Summary

${draft.productName ?? "Product"}
${quantity}${unit} × $${unitPrice}

Total: $${total}

Collection

Place order?`;
}

export function customerOrdersText(orders: OrderRecord[]): string {
  if (orders.length === 0) {
    return COPY.noOrders;
  }

  const lines = orders.slice(0, 8).map((order, index) => {
    const item = order.items[0];
    const itemLabel = item
      ? `${item.product_name_snapshot} ${item.quantity}${item.unit}`
      : "Order";
    return `${index + 1}. ${order.order_number} — ${itemLabel} — $${moneyString(parseDecimal(order.total, "total"))} — ${order.status}`;
  });

  return `Your orders

${lines.join("\n")}

Reply MENU to go back.`;
}

export function vendorOrdersText(orders: OrderRecord[]): string {
  if (orders.length === 0) {
    return COPY.noVendorOrders;
  }

  const lines = orders.slice(0, 8).map((order, index) => {
    const item = order.items[0];
    const itemLabel = item
      ? `${item.product_name_snapshot} ${item.quantity}${item.unit}`
      : "Order";
    return `${index + 1}. ${order.order_number} — ${itemLabel} — $${moneyString(parseDecimal(order.total, "total"))} — ${order.status}`;
  });

  return `Customer orders

${lines.join("\n")}

Reply with a number to manage one, or MENU to go back.`;
}

export function vendorSalesText(orders: OrderRecord[]): string {
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const total = completed.reduce(
    (sum, order) => sum + parseDecimal(order.total, "total"),
    0,
  );

  return `My Sales

Completed orders: ${completed.length}
Total: $${moneyString(total)}

Reply MENU to go back.`;
}

export function vendorNewOrderText(order: OrderRecord): string {
  const item = order.items[0];
  const itemLabel = item
    ? `${item.product_name_snapshot} — ${item.quantity}${item.unit}`
    : "New order";
  return `New PaySell Order 🔔

Order ${order.order_number}

${itemLabel}

Total: $${moneyString(parseDecimal(order.total, "total"))}`;
}

export function customerOrderUpdateText(order: OrderRecord, headline: string): string {
  return `${headline}

Order ${order.order_number}
Status: ${order.status}`;
}

export function orderQuantityPrompt(name: string, unit: string, available: number): string {
  return `How much ${name} would you like?

Available: ${available} ${unit}`;
}
