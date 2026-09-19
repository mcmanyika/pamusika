import { COPY, customerOrdersText, productListText } from "@/lib/conversation/copy";
import { withSearch } from "@/lib/conversation/context";
import { continueProductDraft } from "@/lib/conversation/handlers/add-product";
import { startProductSearch } from "@/lib/conversation/handlers/buyer";
import { landingFor, requestHumanSupport, showHelp } from "@/lib/conversation/handlers/shared";
import { startVendorRegistration } from "@/lib/conversation/handlers/vendor-registration";
import { listVendorOrders, listVendorSales } from "@/lib/conversation/handlers/vendor-orders";
import { parseLocation, parseOrderAction, parseUnit, type NormalizedInput } from "@/lib/conversation/input";
import { skipReply, textReply } from "@/lib/conversation/replies";
import { INTENT_CONFIDENCE_THRESHOLD, type InterpretedIntent } from "@/lib/openai/schemas";
import type {
  ConversationEngineDeps,
  ConversationTurn,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { ConversationState, ProductDraft, RegistrationDraft } from "@/types/conversation";

const INTENT_STATES = new Set<ConversationState>([
  "NEW",
  "MAIN_MENU",
  "CUSTOMER_MENU",
  "VENDOR_MENU",
  "SEARCH_PRODUCT_QUERY",
]);

export { INTENT_CONFIDENCE_THRESHOLD };

export function shouldInterpretIntent(
  input: NormalizedInput,
  state: ConversationState,
): boolean {
  if (!INTENT_STATES.has(state)) {
    return false;
  }
  if (input.choice !== null) {
    return false;
  }
  if (input.yes || input.change || input.skip || input.menu || input.help || input.greeting) {
    return false;
  }
  if (parseOrderAction(input)) {
    return false;
  }

  const words = input.raw.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

export async function applyInterpretedIntent(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  interpreted: InterpretedIntent,
): Promise<HandlerResult | null> {
  if (interpreted.confidence < INTENT_CONFIDENCE_THRESHOLD) {
    return null;
  }

  switch (interpreted.intent) {
    case "HELP":
      return showHelp();
    case "TALK_TO_HUMAN":
      return requestHumanSupport(turn, deps);
    case "REGISTER_VENDOR":
      return registerFromIntent(turn, deps, interpreted);
    case "ADD_PRODUCT":
      return addProductFromIntent(turn, deps, interpreted);
    case "SEARCH_PRODUCT":
    case "CREATE_ORDER":
      return searchFromIntent(turn, deps, interpreted);
    case "VIEW_PRODUCTS":
      return viewProductsFromIntent(turn, deps);
    case "VIEW_ORDER":
      return viewOrdersFromIntent(turn, deps);
    case "VIEW_SALES":
      if (turn.identity.userType !== "VENDOR") {
        return null;
      }
      return listVendorSales(turn, deps);
    default:
      return null;
  }
}

async function registerFromIntent(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  interpreted: InterpretedIntent,
): Promise<HandlerResult | null> {
  if (turn.identity.userType === "VENDOR") {
    return landingFor("VENDOR");
  }

  return startVendorRegistration(deps, registrationFromEntities(interpreted));
}

async function addProductFromIntent(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  interpreted: InterpretedIntent,
): Promise<HandlerResult> {
  const draft = productDraftFromEntities(interpreted);

  if (turn.identity.userType === "VENDOR" && turn.identity.userId) {
    const vendor = await deps.vendors.getById(turn.identity.userId);
    if (!vendor || vendor.status !== "ACTIVE") {
      return {
        state: "VENDOR_MENU",
        context: {},
        replies: [textReply(COPY.vendorInactive)],
      };
    }
    return continueProductDraft(draft);
  }

  if (turn.identity.userType === "CUSTOMER") {
    return searchFromIntent(turn, deps, interpreted);
  }

  return startVendorRegistration(
    deps,
    registrationFromEntities(interpreted),
    draft.name ? draft : undefined,
  );
}

async function searchFromIntent(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
  interpreted: InterpretedIntent,
): Promise<HandlerResult> {
  const query =
    cleanName(interpreted.entities.search_query) ??
    cleanName(interpreted.entities.product_name);
  if (!query) {
    return {
      state: "SEARCH_PRODUCT_QUERY",
      context: { search: { mode: "query" } },
      replies: [textReply(COPY.askSearchQuery)],
    };
  }

  const location = interpreted.entities.location
    ? parseLocation(interpreted.entities.location)
    : {};
  const search = {
    mode: "query" as const,
    query,
    ...location,
  };

  if (search.area || search.city) {
    return startProductSearch(deps, search);
  }

  return {
    state: "SEARCH_LOCATION",
    context: withSearch(turn.context, search),
    replies: [skipReply(COPY.askSearchLocation)],
  };
}

async function viewProductsFromIntent(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult | null> {
  if (turn.identity.userType !== "VENDOR" || !turn.identity.userId) {
    return null;
  }

  const products = await deps.products.listByVendor(turn.identity.userId);
  return {
    state: "VENDOR_MENU",
    context: {},
    replies: [textReply(productListText(products))],
  };
}

async function viewOrdersFromIntent(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult | null> {
  if (turn.identity.userType === "VENDOR") {
    return listVendorOrders(turn, deps);
  }

  if (turn.identity.userType === "CUSTOMER" && turn.identity.userId) {
    const orders = await deps.orders.listByCustomer(turn.identity.userId);
    return {
      state: "CUSTOMER_MENU",
      context: {},
      replies: [textReply(customerOrdersText(orders))],
    };
  }

  return {
    state: turn.identity.userType === "CUSTOMER" ? "CUSTOMER_MENU" : "MAIN_MENU",
    context: {},
    replies: [textReply(COPY.noOrders)],
  };
}

function registrationFromEntities(interpreted: InterpretedIntent): RegistrationDraft {
  const location = interpreted.entities.location
    ? parseLocation(interpreted.entities.location)
    : {};

  return {
    firstName: cleanName(interpreted.entities.first_name),
    businessName: cleanName(interpreted.entities.business_name),
    ...location,
  };
}

function productDraftFromEntities(interpreted: InterpretedIntent): ProductDraft {
  const name = cleanName(interpreted.entities.product_name);
  const quantity = interpreted.entities.quantity ?? undefined;
  const unit = interpreted.entities.unit
    ? (parseUnit(interpreted.entities.unit) ?? undefined)
    : undefined;
  const price = interpreted.entities.price ?? undefined;

  return {
    ...(name ? { name } : {}),
    ...(quantity != null ? { quantity } : {}),
    ...(unit ? { unit } : {}),
    ...(price != null ? { price } : {}),
    imageSkipped: true,
  };
}

function cleanName(value: string | null): string | undefined {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= 2 ? trimmed : undefined;
}
