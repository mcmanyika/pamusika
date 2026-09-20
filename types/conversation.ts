export const CONVERSATION_STATES = [
  "NEW",
  "MAIN_MENU",
  "VENDOR_REGISTRATION_NAME",
  "VENDOR_REGISTRATION_BUSINESS",
  "VENDOR_REGISTRATION_CATEGORY",
  "VENDOR_REGISTRATION_LOCATION",
  "VENDOR_REGISTRATION_LANGUAGE",
  "VENDOR_REGISTRATION_CONFIRM",
  "VENDOR_MENU",
  "ADD_PRODUCT_NAME",
  "ADD_PRODUCT_CATEGORY",
  "ADD_PRODUCT_QUANTITY",
  "ADD_PRODUCT_UNIT",
  "ADD_PRODUCT_PRICE",
  "ADD_PRODUCT_IMAGE",
  "ADD_PRODUCT_CONFIRM",
  "CUSTOMER_MENU",
  "CUSTOMER_ADDRESSES",
  "CUSTOMER_ADDRESS_LABEL",
  "CUSTOMER_ADDRESS_LINE",
  "CUSTOMER_ADDRESS_LOCATION",
  "CUSTOMER_ADDRESS_CONFIRM",
  "SEARCH_PRODUCT_QUERY",
  "SEARCH_LOCATION",
  "SEARCH_RESULTS",
  "ORDER_QUANTITY",
  "ORDER_CONFIRM",
  "ORDER_WAITING_VENDOR",
  "SUPPORT",
] as const;

export type ConversationState = (typeof CONVERSATION_STATES)[number];

export function isConversationState(value: string): value is ConversationState {
  return (CONVERSATION_STATES as readonly string[]).includes(value);
}

export type RegistrationDraft = {
  firstName?: string;
  businessName?: string;
  categoryId?: string;
  categoryName?: string;
  city?: string;
  area?: string;
  preferredLanguage?: string;
  preferredLanguageLabel?: string;
};

export type ProductDraft = {
  name?: string;
  categoryId?: string;
  categoryName?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  imageSkipped?: boolean;
  draftId?: string;
};

export type SearchDraft = {
  mode?: "query" | "category" | "nearby";
  query?: string;
  categoryId?: string;
  categoryName?: string;
  city?: string;
  area?: string;
  resultIds?: string[];
};

export type OrderDraft = {
  productId?: string;
  productName?: string;
  unit?: string;
  quantity?: number;
  available?: number;
  unitPrice?: number;
  orderId?: string;
};

export type VendorOrderDraft = {
  ids?: string[];
  selectedId?: string;
};

export type AddressDraft = {
  ids?: string[];
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  area?: string;
};

export type SessionContext = {
  registration?: RegistrationDraft;
  product?: ProductDraft;
  pendingProduct?: ProductDraft;
  search?: SearchDraft;
  order?: OrderDraft;
  vendorOrders?: VendorOrderDraft;
  address?: AddressDraft;
};

export const MESSAGE_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;

export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];
