import { moneyString, parseDecimal, quantityString } from "@/lib/commerce/money";
import { buttonReply, singleMenuReplies } from "@/lib/conversation/replies";
import { PRODUCT_UNITS } from "@/types/commerce";
import type { CustomerAddress, Product, Vendor } from "@/types/database";
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
  vendorSuspended:
    "Your PaySell vendor account is suspended. Reply HELP if you need support.",
  customerSuspended:
    "Your PaySell buyer account is suspended. Reply HELP if you need support.",
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
  askAddressLabel: "What should we call this address?",
  askAddressLine: "Street, stand, or landmark?",
  askAddressLocation: "Which city and area?\n\nExample: Harare, Mbare",
  invalidAddressLine: "Please send a street, stand, or landmark.",
  invalidAddressLocation: "Please send a city and area. Example: Harare, Mbare",
  addressSaved: "Delivery address saved.",
  addressSetDefault: "This is now your default delivery address.",
  noAddresses: "You have no saved delivery addresses yet.",
  addressLimit: "You already have 8 saved addresses. Choose one to make it the default.",
  referralApplied: "Referral saved. Welcome to PaySell.",
  referralAlready: "This number already used a referral code.",
  referralInvalid: "I could not find that referral code.",
  referralSelf: "You cannot use your own referral code.",
  referralRegistered: "Referral codes can only be used when you first join PaySell.",
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
  { id: "7", title: "📣 Invite" },
  { id: "menu", title: "🏠 Main Menu" },
];

const CUSTOMER_MENU_BUTTONS = [
  { id: "1", title: "🔎 Find Products" },
  { id: "2", title: "📂 Browse Categories" },
  { id: "3", title: "📍 Vendors Near Me" },
  { id: "4", title: "📦 My Orders" },
  { id: "5", title: "📍 My Addresses" },
  { id: "6", title: "❓ Help / Support" },
  { id: "7", title: "📣 Invite" },
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

export function productCategoryMenuReplies(categories: Array<{ name: string }>): EngineReply[] {
  return singleMenuReplies(
    categories.slice(0, 10).map((category, index) => ({
      id: String(index + 1),
      title: category.name,
    })),
    {
      header: "Product category",
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
${draft.categoryName ?? "Uncategorised"}
${quantity} ${unit}
$${price}/${unit}

Publish?`;
}

export function productListText(products: Product[]): string {
  if (products.length === 0) {
    return COPY.noProducts;
  }

  const shown = products.slice(0, 10);
  const cards = shown.map((product, index) =>
    productCard(index + 1, product.name, [
      `${stockLabel(product.quantity, product.unit)} · ${priceLabel(product.price, product.unit)}`,
      statusLabel(product.status),
    ]),
  );
  const more =
    products.length > shown.length ? `\nShowing ${shown.length} of ${products.length}.` : "";

  return `🛒 *Your products* · ${products.length}

${cards.join("\n\n")}${more}

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
  const cards = results.slice(0, 10).map((hit, index) => {
    const place = [hit.vendor.business_name, hit.vendor.area].filter(Boolean).join(" · ");
    return productCard(index + 1, hit.name, [
      `${priceLabel(hit.price, hit.unit)} · ${stockLabel(hit.quantity, hit.unit)} left`,
      place,
    ]);
  });

  return `🔎 *Products found* · ${results.length}

${cards.join("\n\n")}`;
}

export function searchResultsReply(results: ProductSearchHit[]): EngineReply[] {
  const rows = results.slice(0, 10).map((hit, index) => ({
    id: String(index + 1),
    title: hit.name,
    description: [
      priceLabel(hit.price, hit.unit),
      `${stockLabel(hit.quantity, hit.unit)} left`,
      hit.vendor.area || hit.vendor.business_name || "",
    ]
      .filter(Boolean)
      .join(" · "),
  }));
  rows.push({ id: "menu", title: "🏠 Main Menu", description: "Go back" });

  return singleMenuReplies(rows, {
    header: "Products found",
    body: searchResultsText(results),
    footer: "Tap a product to order",
    button: "View products",
  });
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

export function addressLabelReplies(): EngineReply[] {
  return singleMenuReplies(
    [
      { id: "home", title: "Home" },
      { id: "work", title: "Work" },
      { id: "other", title: "Other" },
    ],
    { header: "Address label" },
  );
}

export function addressListReplies(addresses: CustomerAddress[]): EngineReply[] {
  const rows = addresses.slice(0, 8).map((address, index) => ({
    id: String(index + 1),
    title: address.is_default ? `${address.label} (default)` : address.label,
    description: [address.line1, address.area, address.city].filter(Boolean).join(", "),
  }));

  if (addresses.length < 8) {
    rows.push({ id: "add", title: "➕ Add address", description: "Save a new delivery address" });
  }
  rows.push({ id: "menu", title: "🏠 Main Menu", description: "Go back to Buyer or Vendor" });

  return singleMenuReplies(rows, {
    header: "My addresses",
    body: addresses.length === 0 ? COPY.noAddresses : "Choose an address or add a new one.",
  });
}

export function addressConfirmText(draft: {
  label?: string;
  line1?: string;
  city?: string;
  area?: string;
}): string {
  const place = [draft.area, draft.city].filter(Boolean).join(", ") || "Area not set";
  return `Please confirm:

${draft.label ?? "Home"}
${draft.line1 ?? ""}
${place}

Save this delivery address?`;
}

export function addressSavedText(address: CustomerAddress): string {
  const place = [address.area, address.city].filter(Boolean).join(", ");
  return `${COPY.addressSaved}

${address.label}
${address.line1}${place ? `\n${place}` : ""}${address.is_default ? "\nDefault" : ""}`;
}

export function inviteText(code: string, qualified: number, total: number): string {
  return `Invite friends to PaySell.

Your code: ${code}

They should send:
REF ${code}

People referred: ${qualified}${total !== qualified ? ` qualified / ${total} total` : ""}`;
}

function productCard(index: number, title: string, details: string[]): string {
  return [`*${index}. ${title}*`, ...details.filter(Boolean)].join("\n");
}

function priceLabel(value: string | number, unit: string): string {
  return `$${moneyString(parseDecimal(value, "price"))}/${unit}`;
}

function stockLabel(value: string | number, unit: string): string {
  return `${quantityString(parseDecimal(value, "quantity"))} ${unit}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "OUT_OF_STOCK":
      return "Out of stock";
    case "PAUSED":
      return "Paused";
    case "DRAFT":
      return "Draft";
    case "REMOVED":
      return "Removed";
    default:
      return status;
  }
}
