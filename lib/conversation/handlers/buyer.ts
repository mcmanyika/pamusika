import { parseProductNumbers } from "@/lib/services/product.service";
import {
  COPY,
  browseCategoryMenuReplies,
  customerMenuReplies,
  customerOrdersText,
  helpReplies,
  orderQuantityPrompt,
  orderSummaryText,
  searchResultsReply,
  vendorNewOrderText,
} from "@/lib/conversation/copy";
import { withOrder, withSearch } from "@/lib/conversation/context";
import { handleBuyerAddresses, showCustomerAddresses } from "@/lib/conversation/handlers/buyer-addresses";
import { qualifyReferral, showInvite, syncReferralIdentity } from "@/lib/conversation/handlers/referrals";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { parseLocation, parsePositiveNumber } from "@/lib/conversation/input";
import { orderButtonsReply, skipReply, textReply, yesNoReply } from "@/lib/conversation/replies";
import { toWhatsAppId } from "@/lib/commerce/phone";
import type {
  ConversationEngineDeps,
  ConversationHandler,
  EngineNotification,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { SearchDraft } from "@/types/conversation";

export const handleBuyer: ConversationHandler = async (turn, deps) => {
  const state = turn.session.current_state;

  if (state === "CUSTOMER_MENU" || state === "NEW") {
    return handleCustomerMenu(turn, deps);
  }

  if (state.startsWith("CUSTOMER_ADDRESS")) {
    return handleBuyerAddresses(turn, deps);
  }

  if (state === "SEARCH_PRODUCT_QUERY") {
    return handleSearchQuery(turn, deps);
  }

  if (state === "SEARCH_LOCATION") {
    return handleSearchLocation(turn, deps);
  }

  if (state === "SEARCH_RESULTS") {
    return handleSearchResults(turn, deps);
  }

  if (state === "ORDER_QUANTITY") {
    return handleOrderQuantity(turn);
  }

  if (state === "ORDER_CONFIRM") {
    return handleOrderConfirm(turn, deps);
  }

  if (state === "ORDER_WAITING_VENDOR") {
    return {
      state: "CUSTOMER_MENU",
      context: turn.context,
      replies: [textReply(COPY.orderPlaced), ...customerMenuReplies()],
    };
  }

  return landingFor("CUSTOMER");
};

async function handleCustomerMenu(
  turn: Parameters<ConversationHandler>[0],
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  const firstVisit = turn.session.current_state === "NEW";
  if (firstVisit && !turn.input.choice && !turn.input.help) {
    return landingFor("CUSTOMER");
  }

  if (turn.input.help || turn.input.choice === 6) {
    return {
      state: "SUPPORT",
      context: {},
      replies: helpReplies(),
    };
  }

  if (turn.input.choice === 1) {
    return {
      state: "SEARCH_PRODUCT_QUERY",
      context: { search: { mode: "query" } },
      replies: [textReply(COPY.askSearchQuery)],
    };
  }

  if (turn.input.choice === 2) {
    const categories = await deps.categories.listActive();
    if (categories.length === 0) {
      return {
        state: "CUSTOMER_MENU",
        context: {},
        replies: [textReply(COPY.noCategories)],
      };
    }
    return {
      state: "SEARCH_PRODUCT_QUERY",
      context: { search: { mode: "category" } },
      replies: browseCategoryMenuReplies(categories),
    };
  }

  if (turn.input.choice === 3) {
    return {
      state: "SEARCH_LOCATION",
      context: { search: { mode: "nearby" } },
      replies: [skipReply(COPY.askSearchLocation)],
    };
  }

  if (turn.input.choice === 4) {
    if (!turn.identity.userId) {
      return {
        state: "CUSTOMER_MENU",
        context: {},
        replies: [textReply(COPY.noOrders)],
      };
    }
    const orders = await deps.orders.listByCustomer(turn.identity.userId);
    return {
      state: "CUSTOMER_MENU",
      context: {},
      replies: [textReply(customerOrdersText(orders))],
    };
  }

  if (turn.input.choice === 5) {
    return showCustomerAddresses(turn, deps);
  }

  if (turn.input.choice === 7) {
    return showInvite(turn, deps, {
      state: "CUSTOMER_MENU",
      context: {},
      replies: customerMenuReplies(),
    });
  }

  if (turn.input.greeting || turn.input.menu) {
    return landingFor("CUSTOMER");
  }

  return {
    state: "CUSTOMER_MENU",
    context: {},
    replies: customerMenuReplies(),
  };
}

async function handleSearchQuery(
  turn: Parameters<ConversationHandler>[0],
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  const search = turn.context.search ?? { mode: "query" };

  if (search.mode === "category") {
    const categories = await deps.categories.listActive();
    const category = categories[(turn.input.choice ?? 0) - 1];
    if (!category) {
      return {
        state: "SEARCH_PRODUCT_QUERY",
        context: { search },
        replies: [textReply(COPY.invalidCategory), ...browseCategoryMenuReplies(categories)],
      };
    }

    return {
      state: "SEARCH_LOCATION",
      context: withSearch(turn.context, {
        mode: "category",
        categoryId: category.id,
        categoryName: category.name,
      }),
      replies: [skipReply(COPY.askSearchLocation)],
    };
  }

  const query = turn.input.raw.trim();
  if (query.length < 2 || turn.input.choice !== null) {
    return {
      state: "SEARCH_PRODUCT_QUERY",
      context: { search },
      replies: [textReply(COPY.invalidSearchQuery)],
    };
  }

  return {
    state: "SEARCH_LOCATION",
    context: withSearch(turn.context, { mode: "query", query }),
    replies: [skipReply(COPY.askSearchLocation)],
  };
}

async function handleSearchLocation(
  turn: Parameters<ConversationHandler>[0],
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  const search: SearchDraft = { ...turn.context.search };
  if (!turn.input.skip) {
    const location = parseLocation(turn.input.raw);
    if (!location.area && !location.city) {
      return {
        state: "SEARCH_LOCATION",
        context: { search },
        replies: [skipReply(COPY.askSearchLocation)],
      };
    }
    search.area = location.area;
    search.city = location.city;
  }

  return startProductSearch(deps, search);
}

export async function startProductSearch(
  deps: ConversationEngineDeps,
  search: SearchDraft,
): Promise<HandlerResult> {
  return runSearch(deps, search);
}

async function handleSearchResults(
  turn: Parameters<ConversationHandler>[0],
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  const ids = turn.context.search?.resultIds ?? [];
  const productId = ids[(turn.input.choice ?? 0) - 1];
  if (!productId) {
    return {
      state: "SEARCH_RESULTS",
      context: turn.context,
      replies: [textReply(COPY.invalidResultChoice)],
    };
  }

  const product = await deps.products.getById(productId);
  if (!product) {
    return {
      state: "SEARCH_RESULTS",
      context: turn.context,
      replies: [textReply(COPY.invalidResultChoice)],
    };
  }

  const numbers = parseProductNumbers(product);
  return {
    state: "ORDER_QUANTITY",
    context: withOrder(turn.context, {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      available: numbers.quantity,
      unitPrice: numbers.price,
    }),
    replies: [textReply(orderQuantityPrompt(product.name, product.unit, numbers.quantity))],
  };
}

async function handleOrderQuantity(
  turn: Parameters<ConversationHandler>[0],
): Promise<HandlerResult> {
  const draft = turn.context.order ?? {};
  const quantity = parsePositiveNumber(turn.input.raw);
  if (!quantity || (draft.available != null && quantity > draft.available)) {
    return {
      state: "ORDER_QUANTITY",
      context: turn.context,
      replies: [textReply(COPY.invalidOrderQuantity)],
    };
  }

  const next = withOrder(turn.context, { quantity });
  return {
    state: "ORDER_CONFIRM",
    context: next,
    replies: [yesNoReply(orderSummaryText(next.order ?? {}))],
  };
}

async function handleOrderConfirm(
  turn: Parameters<ConversationHandler>[0],
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (turn.input.change) {
    const search = turn.context.search ?? {};
    if ((search.resultIds ?? []).length > 0) {
      return runSearch(deps, search);
    }
    return {
      state: "CUSTOMER_MENU",
      context: {},
      replies: customerMenuReplies(),
    };
  }

  if (!turn.input.yes) {
    const next = turn.context;
    return {
      state: "ORDER_CONFIRM",
      context: next,
      replies: [yesNoReply(orderSummaryText(next.order ?? {}))],
    };
  }

  const draft = turn.context.order;
  if (!draft?.productId || !draft.quantity) {
    return landingFor("CUSTOMER");
  }

  const { customer } = await deps.customers.getOrCreate({
    whatsappNumber: turn.message.phoneNumber,
    displayName: turn.message.contactName ?? undefined,
    area: turn.context.search?.area,
    city: turn.context.search?.city,
  });
  await syncReferralIdentity(deps, turn.message.phoneNumber, "CUSTOMER", customer.id);

  const { order, created } = await deps.orders.create({
    customerId: customer.id,
    productId: draft.productId,
    quantity: draft.quantity,
    fulfilmentMethod: "COLLECTION",
    idempotencyKey: `order:${turn.session.id}:${draft.productId}:${draft.quantity}`,
  });

  const identity = { userType: "CUSTOMER" as const, userId: customer.id };
  const notifications: EngineNotification[] = [];

  if (created) {
    await qualifyReferral(deps, turn.message.phoneNumber, "CUSTOMER", customer.id);
    const vendor = await deps.vendors.getById(order.vendor_id);
    if (vendor) {
      notifications.push({
        waId: toWhatsAppId(vendor.whatsapp_number),
        phoneNumber: vendor.whatsapp_number,
        replies: [
          orderButtonsReply(vendorNewOrderText(order), order.id, ["accept", "decline"]),
        ],
      });
    }
  }

  return {
    state: "ORDER_WAITING_VENDOR",
    context: withOrder(turn.context, { orderId: order.id }),
    identity,
    notifications,
    replies: [
      textReply(created ? COPY.orderPlaced : COPY.orderAlreadyPlaced),
    ],
  };
}

async function runSearch(
  deps: ConversationEngineDeps,
  search: SearchDraft,
): Promise<HandlerResult> {
  const results = await deps.products.search({
    query: search.query,
    categoryId: search.categoryId,
    area: search.area,
    limit: 8,
  });

  if (results.length === 0) {
    return {
      state: "CUSTOMER_MENU",
      context: { search },
      replies: [textReply(COPY.noSearchResults)],
    };
  }

  return {
    state: "SEARCH_RESULTS",
    context: { search: { ...search, resultIds: results.map((hit) => hit.id) } },
    replies: searchResultsReply(results),
  };
}
