import { moneyString, parseDecimal } from "@/lib/commerce/money";
import { listReply } from "@/lib/conversation/replies";
import { PRODUCT_UNITS } from "@/types/commerce";
import type { Product, Vendor } from "@/types/database";
import type { OrderRecord } from "@/lib/services/order.service";
import type { ProductSearchHit } from "@/lib/services/product.service";
import type { OrderDraft, ProductDraft, RegistrationDraft } from "@/types/conversation";
import type { EngineReply, WhatsAppListRow } from "@/types/whatsapp";

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
  return `Welcome to PaySell 👋

You're in the main menu.
Here you can buy products, sell stock, and check your orders.

What would you like to do?`;
}

export function vendorMenuText(): string {
  return `Welcome to PaySell 👋

You're in the Vendor Menu.
Here you can manage your products, view orders and grow your business.

What would you like to do?`;
}

export function customerMenuText(): string {
  return `Welcome to PaySell 👋

You're in the Marketplace.
Here you can find products, place collection orders, and track them.

What would you like to do?`;
}

export function helpText(): string {
  return `PaySell Help

Buyers can search products and place collection orders.
Vendors can list products and accept, ready, and complete orders.

What would you like to do?`;
}

const MAIN_MENU_ROWS: WhatsAppListRow[] = [
  { id: "1", title: "🛒 Buy Something", description: "Search and order products near you" },
  { id: "2", title: "➕ Sell Something", description: "Register and list products for sale" },
  { id: "3", title: "📦 My Orders", description: "Track your collection orders" },
  { id: "4", title: "❓ Help / Support", description: "Get help or speak to our team" },
];

const VENDOR_MENU_ROWS: WhatsAppListRow[] = [
  { id: "1", title: "➕ Sell a Product", description: "List a new product for sale" },
  { id: "2", title: "📦 My Products", description: "View, update or remove your products" },
  { id: "3", title: "🛒 Customer Orders", description: "View and manage your orders" },
  { id: "4", title: "📊 My Sales", description: "See your sales summary" },
  { id: "5", title: "🏪 My Business", description: "View or update your business details" },
  { id: "6", title: "❓ Help / Support", description: "Get help or speak to our team" },
];

const CUSTOMER_MENU_ROWS: WhatsAppListRow[] = [
  { id: "1", title: "🔎 Find Products", description: "Search for something to buy" },
  { id: "2", title: "📂 Browse Categories", description: "Shop by product category" },
  { id: "3", title: "📍 Vendors Near Me", description: "Find sellers in your area" },
  { id: "4", title: "📦 My Orders", description: "View and track your orders" },
  { id: "5", title: "❓ Help / Support", description: "Get help or speak to our team" },
];

const HELP_MENU_ROWS: WhatsAppListRow[] = [
  { id: "1", title: "🏠 Main Menu", description: "Go back to the main menu" },
  { id: "2", title: "👤 Talk to Support", description: "Ask a person to follow up" },
];

export function mainMenuReply(): EngineReply {
  return listReply(mainMenuText(), MAIN_MENU_ROWS);
}

export function vendorMenuReply(): EngineReply {
  return listReply(vendorMenuText(), VENDOR_MENU_ROWS);
}

export function customerMenuReply(): EngineReply {
  return listReply(customerMenuText(), CUSTOMER_MENU_ROWS);
}

export function helpReply(): EngineReply {
  return listReply(helpText(), HELP_MENU_ROWS);
}

export function categoryMenuText(categories: Array<{ name: string }>): string {
  const lines = categories.map((category, index) => `${index + 1} — ${category.name}`);
  return `What do you sell?

${lines.join("\n")}`;
}

export function browseCategoryMenuText(categories: Array<{ name: string }>): string {
  const lines = categories.map((category, index) => `${index + 1} — ${category.name}`);
  return `Browse categories

${lines.join("\n")}`;
}

export function languageMenuText(): string {
  return `What language do you prefer?

1 — English
2 — Shona
3 — Ndebele`;
}

export function unitMenuText(): string {
  const lines = PRODUCT_UNITS.map((unit, index) => `${index + 1} — ${unit}`);
  return `What unit?

${lines.join("\n")}`;
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
