import type { Json } from "@/types/database";
import type {
  AddressDraft,
  OrderDraft,
  ProductDraft,
  RegistrationDraft,
  SearchDraft,
  SessionContext,
  VendorOrderDraft,
} from "@/types/conversation";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseRegistration(value: unknown): RegistrationDraft | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return {
    firstName: asString(record.firstName),
    businessName: asString(record.businessName),
    categoryId: asString(record.categoryId),
    categoryName: asString(record.categoryName),
    city: asString(record.city),
    area: asString(record.area),
    preferredLanguage: asString(record.preferredLanguage),
    preferredLanguageLabel: asString(record.preferredLanguageLabel),
  };
}

function parseProduct(value: unknown): ProductDraft | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return {
    name: asString(record.name),
    categoryId: asString(record.categoryId),
    categoryName: asString(record.categoryName),
    quantity: asNumber(record.quantity),
    unit: asString(record.unit),
    price: asNumber(record.price),
    imageSkipped: asBoolean(record.imageSkipped),
    draftId: asString(record.draftId),
  };
}

export function parseSessionContext(value: Json | null | undefined): SessionContext {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  return {
    registration: parseRegistration(record.registration),
    product: parseProduct(record.product),
    pendingProduct: parseProduct(record.pendingProduct),
    search: parseSearch(record.search),
    order: parseOrder(record.order),
    vendorOrders: parseVendorOrders(record.vendorOrders),
    address: parseAddress(record.address),
  };
}

export function toSessionJson(context: SessionContext): Json {
  return JSON.parse(JSON.stringify(context)) as Json;
}

export function withRegistration(
  context: SessionContext,
  patch: RegistrationDraft,
): SessionContext {
  return {
    ...context,
    registration: { ...context.registration, ...patch },
  };
}

function parseSearch(value: unknown): SearchDraft | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const mode = asString(record.mode);
  const resultIds = Array.isArray(record.resultIds)
    ? record.resultIds.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    mode: mode === "category" || mode === "nearby" || mode === "query" ? mode : undefined,
    query: asString(record.query),
    categoryId: asString(record.categoryId),
    categoryName: asString(record.categoryName),
    city: asString(record.city),
    area: asString(record.area),
    resultIds,
  };
}

function parseOrder(value: unknown): OrderDraft | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return {
    productId: asString(record.productId),
    productName: asString(record.productName),
    unit: asString(record.unit),
    quantity: asNumber(record.quantity),
    available: asNumber(record.available),
    unitPrice: asNumber(record.unitPrice),
    orderId: asString(record.orderId),
  };
}

function parseVendorOrders(value: unknown): VendorOrderDraft | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const ids = Array.isArray(record.ids)
    ? record.ids.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    ids,
    selectedId: asString(record.selectedId),
  };
}

export function withSearch(context: SessionContext, patch: SearchDraft): SessionContext {
  return {
    ...context,
    search: { ...context.search, ...patch },
  };
}

export function withOrder(context: SessionContext, patch: OrderDraft): SessionContext {
  return {
    ...context,
    order: { ...context.order, ...patch },
  };
}

export function withVendorOrders(
  context: SessionContext,
  patch: VendorOrderDraft,
): SessionContext {
  return {
    ...context,
    vendorOrders: { ...context.vendorOrders, ...patch },
  };
}

export function withProduct(context: SessionContext, patch: ProductDraft): SessionContext {
  return {
    ...context,
    product: { ...context.product, ...patch },
  };
}

function parseAddress(value: unknown): AddressDraft | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const ids = Array.isArray(record.ids)
    ? record.ids.filter((id): id is string => typeof id === "string")
    : undefined;

  return {
    ids,
    label: asString(record.label),
    line1: asString(record.line1),
    line2: asString(record.line2),
    city: asString(record.city),
    area: asString(record.area),
  };
}

export function withAddress(context: SessionContext, patch: AddressDraft): SessionContext {
  return {
    ...context,
    address: { ...context.address, ...patch },
  };
}

export function clearDrafts(): SessionContext {
  return {};
}
