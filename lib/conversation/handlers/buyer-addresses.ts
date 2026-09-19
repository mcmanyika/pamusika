import {
  COPY,
  addressConfirmText,
  addressLabelReplies,
  addressListReplies,
  addressSavedText,
  customerMenuReplies,
} from "@/lib/conversation/copy";
import { withAddress } from "@/lib/conversation/context";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { parseLocation } from "@/lib/conversation/input";
import { confirmReply, textReply } from "@/lib/conversation/replies";
import type {
  ConversationEngineDeps,
  ConversationHandler,
  ConversationIdentity,
  ConversationTurn,
  HandlerResult,
} from "@/lib/conversation/handlers/types";

export async function showCustomerAddresses(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  const { customer, identity } = await ensureCustomer(turn, deps);
  const addresses = await deps.customers.listAddresses(customer.id);
  return {
    state: "CUSTOMER_ADDRESSES",
    context: { address: { ids: addresses.map((address) => address.id) } },
    identity,
    replies: addressListReplies(addresses),
  };
}

export const handleBuyerAddresses: ConversationHandler = async (turn, deps) => {
  const state = turn.session.current_state;

  if (state === "CUSTOMER_ADDRESSES") {
    return handleAddressList(turn, deps);
  }

  if (state === "CUSTOMER_ADDRESS_LABEL") {
    return handleAddressLabel(turn);
  }

  if (state === "CUSTOMER_ADDRESS_LINE") {
    return handleAddressLine(turn);
  }

  if (state === "CUSTOMER_ADDRESS_LOCATION") {
    return handleAddressLocation(turn);
  }

  if (state === "CUSTOMER_ADDRESS_CONFIRM") {
    return handleAddressConfirm(turn, deps);
  }

  return showCustomerAddresses(turn, deps);
};

async function handleAddressList(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (turn.input.choiceId === "add" || isAddAddress(turn.input.normalized)) {
    return startAddAddress();
  }

  const ids = turn.context.address?.ids ?? [];
  const selectedId =
    (turn.input.choice ? ids[turn.input.choice - 1] : null) ??
    (turn.input.choiceId && ids.includes(turn.input.choiceId) ? turn.input.choiceId : null);

  if (selectedId && turn.identity.userId) {
    await deps.customers.setDefaultAddress(turn.identity.userId, selectedId);
    const addresses = await deps.customers.listAddresses(turn.identity.userId);
    return {
      state: "CUSTOMER_ADDRESSES",
      context: { address: { ids: addresses.map((item) => item.id) } },
      replies: [textReply(COPY.addressSetDefault), ...addressListReplies(addresses)],
      identity: turn.identity,
    };
  }

  if (turn.input.greeting) {
    return {
      state: "CUSTOMER_MENU",
      context: {},
      replies: customerMenuReplies(),
    };
  }

  return showCustomerAddresses(turn, deps);
}

function handleAddressLabel(turn: ConversationTurn): HandlerResult {
  const label = parseAddressLabel(turn.input.choiceId, turn.input.raw);
  if (!label) {
    return {
      state: "CUSTOMER_ADDRESS_LABEL",
      context: turn.context,
      replies: [textReply(COPY.askAddressLabel), ...addressLabelReplies()],
    };
  }

  return {
    state: "CUSTOMER_ADDRESS_LINE",
    context: withAddress(turn.context, { label }),
    replies: [textReply(COPY.askAddressLine)],
  };
}

function handleAddressLine(turn: ConversationTurn): HandlerResult {
  const line1 = turn.input.raw.trim();
  if (line1.length < 3 || turn.input.choice !== null) {
    return {
      state: "CUSTOMER_ADDRESS_LINE",
      context: turn.context,
      replies: [textReply(COPY.invalidAddressLine)],
    };
  }

  return {
    state: "CUSTOMER_ADDRESS_LOCATION",
    context: withAddress(turn.context, { line1 }),
    replies: [textReply(COPY.askAddressLocation)],
  };
}

function handleAddressLocation(turn: ConversationTurn): HandlerResult {
  const location = parseLocation(turn.input.raw);
  if (!location.area && !location.city) {
    return {
      state: "CUSTOMER_ADDRESS_LOCATION",
      context: turn.context,
      replies: [textReply(COPY.invalidAddressLocation)],
    };
  }

  const next = withAddress(turn.context, location);
  return {
    state: "CUSTOMER_ADDRESS_CONFIRM",
    context: next,
    replies: [confirmReply(addressConfirmText(next.address ?? {}))],
  };
}

async function handleAddressConfirm(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (turn.input.change) {
    return startAddAddress();
  }

  if (!turn.input.yes) {
    return {
      state: "CUSTOMER_ADDRESS_CONFIRM",
      context: turn.context,
      replies: [confirmReply(addressConfirmText(turn.context.address ?? {}))],
    };
  }

  const { customer, identity } = await ensureCustomer(turn, deps);
  const draft = turn.context.address ?? {};
  const address = await deps.customers.addAddress({
    customerId: customer.id,
    label: draft.label ?? "Home",
    line1: draft.line1 ?? "Address",
    city: draft.city,
    area: draft.area,
  });
  const addresses = await deps.customers.listAddresses(customer.id);

  return {
    state: "CUSTOMER_ADDRESSES",
    context: { address: { ids: addresses.map((item) => item.id) } },
    identity,
    replies: [textReply(addressSavedText(address)), ...addressListReplies(addresses)],
  };
}

function startAddAddress(): HandlerResult {
  return {
    state: "CUSTOMER_ADDRESS_LABEL",
    context: { address: {} },
    replies: [textReply(COPY.askAddressLabel), ...addressLabelReplies()],
  };
}

async function ensureCustomer(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<{ customer: { id: string }; identity: ConversationIdentity }> {
  const { customer } = await deps.customers.getOrCreate({
    whatsappNumber: turn.message.phoneNumber,
    displayName: turn.message.contactName ?? undefined,
  });

  return {
    customer,
    identity: { userType: "CUSTOMER", userId: customer.id },
  };
}

function parseAddressLabel(choiceId: string | null, raw: string): string | null {
  const id = choiceId?.toLowerCase() ?? "";
  if (id === "home" || id === "work" || id === "other") {
    return id === "other" ? "Other" : id[0]!.toUpperCase() + id.slice(1);
  }

  const label = raw.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  if (label.length < 2 || /^\d+$/.test(label)) {
    return null;
  }
  return label.slice(0, 24);
}

function isAddAddress(value: string): boolean {
  const label = value.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  return label === "add" || label === "add address";
}
