import { CommerceError } from "@/lib/commerce/errors";
import { assertSufficientInventory } from "@/lib/commerce/inventory";
import {
  calculateOrderTotals,
  moneyString,
  parseDecimal,
  quantityString,
} from "@/lib/commerce/money";
import {
  ORDER_TIMESTAMP_FIELDS,
  assertOrderTransition,
  isOrderStatus,
} from "@/lib/commerce/order-state";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import {
  createIdempotencyStore,
  throwStoreError,
  type IdempotencyStore,
} from "@/lib/services/idempotency";
import { parseProductNumbers } from "@/lib/services/product.service";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  createOrderSchema,
  type CreateOrderInput,
} from "@/lib/validation/commerce";
import type { OrderStatus } from "@/types/commerce";
import type {
  Customer,
  Order,
  OrderItem,
  Product,
  Vendor,
} from "@/types/database";

export type OrderRecord = Order & { items: OrderItem[] };

export type OrderPreview = {
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfilmentMethod: "COLLECTION" | "DELIVERY";
};

export type OrderStore = {
  findById(id: string): Promise<OrderRecord | null>;
  findCustomer(id: string): Promise<Customer | null>;
  findProductWithVendor(productId: string): Promise<{
    product: Product;
    vendor: Vendor;
  } | null>;
  generateOrderNumber(): Promise<string>;
  create(order: Order, items: OrderItem[]): Promise<OrderRecord>;
  update(id: string, patch: Partial<Order>): Promise<Order>;
  completeAndDecrementStock(orderId: string): Promise<Order>;
  listActionableByVendor(vendorId: string): Promise<OrderRecord[]>;
};

const CREATE_OPERATION = "CREATE_ORDER";

function asOrderStatus(value: string): OrderStatus {
  if (!isOrderStatus(value)) {
    throw new CommerceError("INVALID_ORDER_STATUS", `Unknown order status ${value}`);
  }
  return value;
}

export class OrderService {
  constructor(
    private readonly store: OrderStore,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
    private readonly idempotency?: IdempotencyStore,
  ) {}

  async preview(input: Pick<CreateOrderInput, "productId" | "quantity" | "deliveryFee" | "fulfilmentMethod">): Promise<OrderPreview> {
    const productId = input.productId;
    const quantity = input.quantity;
    const loaded = await this.requireSellableProduct(productId);
    const { price } = parseProductNumbers(loaded.product);
    assertSufficientInventory(parseProductNumbers(loaded.product).quantity, quantity);
    const totals = calculateOrderTotals({
      quantity,
      unitPrice: price,
      deliveryFee: input.deliveryFee ?? 0,
    });

    return {
      productName: loaded.product.name,
      quantity,
      unit: loaded.product.unit,
      unitPrice: price,
      currency: loaded.product.currency,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      fulfilmentMethod: input.fulfilmentMethod ?? "COLLECTION",
    };
  }

  async create(input: CreateOrderInput): Promise<{ order: OrderRecord; created: boolean }> {
    const parsed = createOrderSchema.parse(input);

    if (parsed.idempotencyKey && this.idempotency) {
      const existingId = await this.idempotency.find(
        parsed.idempotencyKey,
        CREATE_OPERATION,
      );
      if (existingId) {
        const existing = await this.requireOrder(existingId);
        return { order: existing, created: false };
      }
    }

    const customer = await this.store.findCustomer(parsed.customerId);
    if (!customer) {
      throw new CommerceError("CUSTOMER_NOT_FOUND", "Customer not found");
    }

    const loaded = await this.requireSellableProduct(parsed.productId);
    const numbers = parseProductNumbers(loaded.product);
    assertSufficientInventory(numbers.quantity, parsed.quantity);

    const totals = calculateOrderTotals({
      quantity: parsed.quantity,
      unitPrice: numbers.price,
      deliveryFee: parsed.deliveryFee,
    });

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const itemId = crypto.randomUUID();
    const order = await this.store.create(
      {
        id: orderId,
        order_number: await this.store.generateOrderNumber(),
        customer_id: customer.id,
        vendor_id: loaded.vendor.id,
        status: "PENDING_VENDOR",
        subtotal: moneyString(totals.subtotal),
        delivery_fee: moneyString(totals.deliveryFee),
        total: moneyString(totals.total),
        currency: loaded.product.currency,
        fulfilment_method: parsed.fulfilmentMethod,
        payment_method: parsed.paymentMethod ?? "CASH",
        payment_status: "UNPAID",
        created_at: now,
        updated_at: now,
        accepted_at: null,
        ready_at: null,
        completed_at: null,
        cancelled_at: null,
      },
      [
        {
          id: itemId,
          order_id: orderId,
          product_id: loaded.product.id,
          product_name_snapshot: loaded.product.name,
          quantity: quantityString(parsed.quantity),
          unit: loaded.product.unit,
          unit_price: moneyString(numbers.price),
          total: moneyString(totals.subtotal),
          created_at: now,
        },
      ],
    );

    if (parsed.idempotencyKey && this.idempotency) {
      await this.idempotency.save(
        parsed.idempotencyKey,
        CREATE_OPERATION,
        "orders",
        order.id,
      );
    }

    await this.analytics.track({
      eventName: "ORDER_CONFIRMED",
      userType: "CUSTOMER",
      userId: customer.id,
      metadata: { orderId: order.id, orderNumber: order.order_number },
    });

    return { order, created: true };
  }

  async accept(orderId: string): Promise<OrderRecord> {
    return this.transition(orderId, "ACCEPTED", "ORDER_ACCEPTED");
  }

  async decline(orderId: string): Promise<OrderRecord> {
    return this.transition(orderId, "DECLINED", "ORDER_DECLINED");
  }

  async startPreparing(orderId: string): Promise<OrderRecord> {
    return this.transition(orderId, "PREPARING");
  }

  async markReady(orderId: string): Promise<OrderRecord> {
    return this.transition(orderId, "READY", "ORDER_READY");
  }

  async cancel(orderId: string): Promise<OrderRecord> {
    return this.transition(orderId, "CANCELLED", "ORDER_CANCELLED");
  }

  async complete(orderId: string): Promise<OrderRecord> {
    const current = await this.requireOrder(orderId);
    const from = asOrderStatus(current.status);

    if (from === "COMPLETED") {
      return current;
    }

    assertOrderTransition(from, "COMPLETED");
    await this.store.completeAndDecrementStock(orderId);
    const completed = await this.requireOrder(orderId);

    await this.analytics.track({
      eventName: "ORDER_COMPLETED",
      userType: "VENDOR",
      userId: completed.vendor_id,
      metadata: { orderId: completed.id, orderNumber: completed.order_number },
    });

    return completed;
  }

  async getById(orderId: string): Promise<OrderRecord | null> {
    return this.store.findById(orderId);
  }

  async listActionableByVendor(vendorId: string): Promise<OrderRecord[]> {
    return this.store.listActionableByVendor(vendorId);
  }

  private async transition(
    orderId: string,
    next: OrderStatus,
    eventName?: "ORDER_ACCEPTED" | "ORDER_DECLINED" | "ORDER_READY" | "ORDER_CANCELLED",
  ): Promise<OrderRecord> {
    const current = await this.requireOrder(orderId);
    const from = asOrderStatus(current.status);

    if (from === next) {
      return current;
    }

    assertOrderTransition(from, next);

    const timestampField = ORDER_TIMESTAMP_FIELDS[next];
    const patch: Partial<Order> = { status: next };
    if (timestampField) {
      patch[timestampField] = new Date().toISOString();
    }

    await this.store.update(orderId, patch);
    const updated = await this.requireOrder(orderId);

    if (eventName) {
      await this.analytics.track({
        eventName,
        userType: "VENDOR",
        userId: updated.vendor_id,
        metadata: { orderId: updated.id, orderNumber: updated.order_number },
      });
    }

    return updated;
  }

  private async requireOrder(orderId: string): Promise<OrderRecord> {
    const order = await this.store.findById(orderId);
    if (!order) {
      throw new CommerceError("ORDER_NOT_FOUND", "Order not found");
    }
    return order;
  }

  private async requireSellableProduct(productId: string): Promise<{
    product: Product;
    vendor: Vendor;
  }> {
    const loaded = await this.store.findProductWithVendor(productId);
    if (!loaded) {
      throw new CommerceError("PRODUCT_NOT_FOUND", "Product not found");
    }
    if (loaded.product.status !== "ACTIVE") {
      throw new CommerceError("PRODUCT_NOT_AVAILABLE", "This product is not available");
    }
    if (loaded.vendor.status !== "ACTIVE") {
      throw new CommerceError("VENDOR_INACTIVE", "This vendor is not active");
    }
    return loaded;
  }
}

export function createOrderService(
  client: CommerceClient,
  analytics: AnalyticsTracker = silentAnalytics,
): OrderService {
  const store: OrderStore = {
    async findById(id) {
      const { data: order, error } = await client
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      if (!order) return null;
      const { data: items, error: itemError } = await client
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (itemError) throwStoreError(itemError);
      return { ...order, items: items ?? [] };
    },
    async findCustomer(id) {
      const { data, error } = await client
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findProductWithVendor(productId) {
      const { data: product, error } = await client
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      if (error) throwStoreError(error);
      if (!product) return null;
      const { data: vendor, error: vendorError } = await client
        .from("vendors")
        .select("*")
        .eq("id", product.vendor_id)
        .maybeSingle();
      if (vendorError) throwStoreError(vendorError);
      if (!vendor) return null;
      return { product, vendor };
    },
    async generateOrderNumber() {
      const { data, error } = await client.rpc("generate_order_number");
      if (error || !data) throwStoreError(error);
      return data;
    },
    async create(order, items) {
      const { error: orderError } = await client.from("orders").insert(order);
      if (orderError) throwStoreError(orderError);
      const { error: itemError } = await client.from("order_items").insert(items);
      if (itemError) {
        await client.from("orders").update({ status: "CANCELLED" }).eq("id", order.id);
        throwStoreError(itemError);
      }
      return { ...order, items };
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("orders")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async completeAndDecrementStock(orderId) {
      const { data, error } = await client.rpc("complete_order_and_decrement_stock", {
        p_order_id: orderId,
      });
      if (error) {
        const message = error.message ?? "";
        if (message.includes("INSUFFICIENT_INVENTORY")) {
          throw new CommerceError(
            "INSUFFICIENT_INVENTORY",
            "There is not enough stock to complete this order",
          );
        }
        if (message.includes("INVALID_ORDER_TRANSITION")) {
          throw new CommerceError("INVALID_ORDER_TRANSITION", message);
        }
        throwStoreError(error);
      }
      return data as Order;
    },
    async listActionableByVendor(vendorId) {
      const { data: orderRows, error } = await client
        .from("orders")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("status", "PENDING_VENDOR")
        .order("created_at", { ascending: true });
      if (error) throwStoreError(error);
      if (!orderRows?.length) return [];

      const orderIds = orderRows.map((order) => order.id);
      const { data: itemRows, error: itemError } = await client
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      if (itemError) throwStoreError(itemError);

      const itemsByOrder = new Map<string, OrderItem[]>();
      for (const item of itemRows ?? []) {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push(item);
        itemsByOrder.set(item.order_id, list);
      }

      return orderRows.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) ?? [],
      }));
    },
  };

  return new OrderService(store, analytics, createIdempotencyStore(client));
}

export function parseOrderTotals(order: Order): {
  subtotal: number;
  deliveryFee: number;
  total: number;
} {
  return {
    subtotal: parseDecimal(order.subtotal, "subtotal"),
    deliveryFee: parseDecimal(order.delivery_fee, "delivery_fee"),
    total: parseDecimal(order.total, "total"),
  };
}
