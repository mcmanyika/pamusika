import { handleAddProduct } from "@/lib/conversation/handlers/add-product";
import { handleBuyer } from "@/lib/conversation/handlers/buyer";
import { handleMainMenu } from "@/lib/conversation/handlers/main-menu";
import { handleSupport } from "@/lib/conversation/handlers/shared";
import { handleRating } from "@/lib/conversation/handlers/rating";
import { handleVendorMenu } from "@/lib/conversation/handlers/vendor-menu";
import { handleVendorRegistration } from "@/lib/conversation/handlers/vendor-registration";
import type { ConversationHandler } from "@/lib/conversation/handlers/types";
import { isConversationState, type ConversationState } from "@/types/conversation";

const REGISTRATION_STATES = new Set<ConversationState>([
  "VENDOR_REGISTRATION_NAME",
  "VENDOR_REGISTRATION_BUSINESS",
  "VENDOR_REGISTRATION_CATEGORY",
  "VENDOR_REGISTRATION_LOCATION",
  "VENDOR_REGISTRATION_LANGUAGE",
  "VENDOR_REGISTRATION_CONFIRM",
]);

const BUYER_STATES = new Set<ConversationState>([
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
]);

const PRODUCT_STATES = new Set<ConversationState>([
  "ADD_PRODUCT_NAME",
  "ADD_PRODUCT_CATEGORY",
  "ADD_PRODUCT_QUANTITY",
  "ADD_PRODUCT_UNIT",
  "ADD_PRODUCT_PRICE",
  "ADD_PRODUCT_IMAGE",
  "ADD_PRODUCT_CONFIRM",
]);

export function resolveState(raw: string, _userType?: string): ConversationState {
  if (!isConversationState(raw) || raw === "NEW") {
    return "MAIN_MENU";
  }

  return raw;
}

export function getHandler(state: ConversationState): ConversationHandler {
  if (state === "NEW" || state === "MAIN_MENU") {
    return handleMainMenu;
  }

  if (REGISTRATION_STATES.has(state)) {
    return handleVendorRegistration;
  }

  if (state === "VENDOR_MENU") {
    return handleVendorMenu;
  }

  if (PRODUCT_STATES.has(state)) {
    return handleAddProduct;
  }

  if (BUYER_STATES.has(state)) {
    return handleBuyer;
  }

  if (state === "RATE_ORDER") {
    return handleRating;
  }

  if (state === "SUPPORT") {
    return handleSupport;
  }

  return handleMainMenu;
}
