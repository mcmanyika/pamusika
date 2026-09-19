import { describe, expect, it } from "vitest";
import { CommerceError } from "@/lib/commerce/errors";
import { OrderService } from "@/lib/services/order.service";
import { parseDecimal } from "@/lib/commerce/money";
import {
  createMemoryIdempotencyStore,
  createMemoryOrderStore,
  trackedAnalytics,
} from "./helpers/memory";
import type { Customer, Product, Vendor } from "@/types/database";

const now = new Date().toISOString();

const vendor: Vendor = {
  id: "vendor-1",
  vendor_code: "PS-HRE-000001",
  whatsapp_number: "+263771111111",
  first_name: "Tariro",
  last_name: null,
  business_name: "Tariro Fresh Produce",
  primary_category_id: null,
  country: "Zimbabwe",
  province: "Harare",
  city: "Harare",
  area: "Mbare",
  market_name: null,
  preferred_language: "en",
  profile_image_url: null,
  status: "ACTIVE",
  verification_status: "VERIFIED",
  created_at: now,
  updated_at: now,
};

const customer: Customer = {
  id: "customer-1",
  whatsapp_number: "+263772222222",
  display_name: "Buyer",
  country: "Zimbabwe",
  city: "Harare",
  area: "Mbare",
  preferred_language: "en",
  created_at: now,
  updated_at: now,
};

function product(quantity = 20): Product {
  return {
    id: "product-1",
    vendor_id: vendor.id,
    category_id: null,
    name: "Tomatoes",
    description: null,
    price: "1.00",
    currency: "USD",
    quantity: quantity.toString(),
    unit: "kg",
    image_url: null,
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  };
}

function createService(stock = 20) {
  const products = [product(stock)];
  const vendors = [vendor];
  const customers = [customer];
  const { events, tracker } = trackedAnalytics();
  const store = createMemoryOrderStore({ vendors, customers, products });
  const service = new OrderService(store, tracker, createMemoryIdempotencyStore());
  return { service, products, events };
}

describe("order workflow", () => {
  it("creates an order with server-calculated totals and snapshots", async () => {
    const { service, events } = createService();

    const preview = await service.preview({
      productId: "product-1",
      quantity: 3,
    });
    expect(preview.total).toBe(3);

    const { order, created } = await service.create({
      customerId: "customer-1",
      productId: "product-1",
      quantity: 3,
    });

    expect(created).toBe(true);
    expect(order.status).toBe("PENDING_VENDOR");
    expect(order.total).toBe("3.00");
    expect(order.items[0].product_name_snapshot).toBe("Tomatoes");
    expect(order.items[0].unit_price).toBe("1.00");
    expect(events).toContain("ORDER_CONFIRMED");
  });

  it("follows accept -> ready -> completed and decrements inventory once", async () => {
    const { service, products } = createService(20);

    const { order } = await service.create({
      customerId: "customer-1",
      productId: "product-1",
      quantity: 3,
    });

    await service.accept(order.id);
    await service.markReady(order.id);
    const completed = await service.complete(order.id);

    expect(completed.status).toBe("COMPLETED");
    expect(parseDecimal(products[0].quantity, "quantity")).toBe(17);

    const again = await service.complete(order.id);
    expect(again.status).toBe("COMPLETED");
    expect(parseDecimal(products[0].quantity, "quantity")).toBe(17);
  });

  it("rejects completing when stock is no longer sufficient", async () => {
    const { service, products } = createService(3);
    const { order } = await service.create({
      customerId: "customer-1",
      productId: "product-1",
      quantity: 3,
    });

    products[0].quantity = "1";
    await service.accept(order.id);
    await service.markReady(order.id);

    await expect(service.complete(order.id)).rejects.toMatchObject({
      code: "INSUFFICIENT_INVENTORY",
    });
    expect(order.status).toBe("PENDING_VENDOR");
    const current = await service.getById(order.id);
    expect(current?.status).toBe("READY");
  });

  it("does not allow arbitrary status jumps", async () => {
    const { service } = createService();
    const { order } = await service.create({
      customerId: "customer-1",
      productId: "product-1",
      quantity: 1,
    });

    await expect(service.complete(order.id)).rejects.toBeInstanceOf(CommerceError);
    await expect(service.markReady(order.id)).rejects.toBeInstanceOf(CommerceError);
  });

  it("returns the existing order for a duplicate create key", async () => {
    const { service } = createService();
    const first = await service.create({
      customerId: "customer-1",
      productId: "product-1",
      quantity: 2,
      idempotencyKey: "create-order-1",
    });
    const second = await service.create({
      customerId: "customer-1",
      productId: "product-1",
      quantity: 2,
      idempotencyKey: "create-order-1",
    });

    expect(second.created).toBe(false);
    expect(second.order.id).toBe(first.order.id);
  });
});
