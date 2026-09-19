import { describe, expect, it } from "vitest";
import { CommerceError } from "@/lib/commerce/errors";
import { ProductService } from "@/lib/services/product.service";
import {
  createMemoryIdempotencyStore,
  createMemoryProductStore,
  trackedAnalytics,
} from "./helpers/memory";
import type { Vendor } from "@/types/database";

function activeVendor(): Vendor {
  const now = new Date().toISOString();
  return {
    id: "vendor-1",
    vendor_code: "PS-HRE-000001",
    whatsapp_number: "+263771234567",
    first_name: "Tariro",
    last_name: null,
    business_name: "Tariro Fresh Produce",
    primary_category_id: "cat-produce",
    country: "Zimbabwe",
    province: "Harare",
    city: "Harare",
    area: "Mbare",
    market_name: "Mbare Musika",
    preferred_language: "en",
    profile_image_url: null,
    status: "ACTIVE",
    verification_status: "VERIFIED",
    created_at: now,
    updated_at: now,
  };
}

describe("product creation", () => {
  it("keeps a product in draft until it is confirmed", async () => {
    const vendors = [activeVendor()];
    const { events, tracker } = trackedAnalytics();
    const service = new ProductService(
      createMemoryProductStore({ vendors }),
      tracker,
      createMemoryIdempotencyStore(),
    );

    const { product } = await service.createDraft({
      vendorId: vendors[0].id,
      name: "Tomatoes",
      quantity: 20,
      unit: "kg",
      price: 1,
    });

    expect(product.status).toBe("DRAFT");
    expect(events).toContain("PRODUCT_CREATED");

    const published = await service.publish(product.id);
    expect(published.status).toBe("ACTIVE");
  });

  it("does not publish when the vendor is not active", async () => {
    const vendor = { ...activeVendor(), status: "PENDING" };
    const service = new ProductService(
      createMemoryProductStore({ vendors: [vendor] }),
      trackedAnalytics().tracker,
      createMemoryIdempotencyStore(),
    );

    const { product } = await service.createDraft({
      vendorId: vendor.id,
      name: "Tomatoes",
      quantity: 20,
      unit: "kg",
      price: 1,
    });

    await expect(service.publish(product.id)).rejects.toBeInstanceOf(CommerceError);
  });

  it("returns the same draft for a duplicate idempotency key", async () => {
    const vendors = [activeVendor()];
    const service = new ProductService(
      createMemoryProductStore({ vendors }),
      trackedAnalytics().tracker,
      createMemoryIdempotencyStore(),
    );

    const first = await service.createDraft({
      vendorId: vendors[0].id,
      name: "Tomatoes",
      quantity: 20,
      unit: "kg",
      price: 1,
      idempotencyKey: "add-product-1",
    });
    const second = await service.createDraft({
      vendorId: vendors[0].id,
      name: "Tomatoes",
      quantity: 20,
      unit: "kg",
      price: 1,
      idempotencyKey: "add-product-1",
    });

    expect(second.created).toBe(false);
    expect(second.product.id).toBe(first.product.id);
  });

  it("search returns only active in-stock products from active vendors", async () => {
    const vendors = [activeVendor(), { ...activeVendor(), id: "vendor-2", status: "SUSPENDED" }];
    const store = createMemoryProductStore({ vendors });
    const service = new ProductService(store, trackedAnalytics().tracker);

    const live = await service.createDraft({
      vendorId: "vendor-1",
      name: "Tomatoes",
      quantity: 20,
      unit: "kg",
      price: 1,
    });
    await service.publish(live.product.id);

    const paused = await service.createDraft({
      vendorId: "vendor-1",
      name: "Onions",
      quantity: 10,
      unit: "kg",
      price: 1,
    });
    await service.publish(paused.product.id);
    await service.pause(paused.product.id);

    await service.createDraft({
      vendorId: "vendor-2",
      name: "Tomatoes",
      quantity: 5,
      unit: "kg",
      price: 1,
    });

    const results = await service.search({ query: "tomato", area: "Mbare" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Tomatoes");
    expect(results[0].vendor.id).toBe("vendor-1");
  });

  it("removes a product by status instead of deleting it", async () => {
    const vendors = [activeVendor()];
    const service = new ProductService(
      createMemoryProductStore({ vendors }),
      trackedAnalytics().tracker,
      createMemoryIdempotencyStore(),
    );
    const { product } = await service.createDraft({
      vendorId: vendors[0]!.id,
      name: "Tomatoes",
      quantity: 20,
      unit: "kg",
      price: 1,
    });
    await service.publish(product.id);
    const removed = await service.remove(product.id);
    expect(removed.status).toBe("REMOVED");
    expect(await service.getById(product.id)).toMatchObject({ id: product.id, status: "REMOVED" });
  });
});
