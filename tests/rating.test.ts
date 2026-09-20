import { describe, expect, it } from "vitest";
import { CommerceError } from "@/lib/commerce/errors";
import { RatingService } from "@/lib/services/rating.service";
import { createMemoryRatingStore, trackedAnalytics } from "./helpers/memory";
import type { Order } from "@/types/database";

const completed: Order = {
  id: "order-1",
  order_number: "PS-10001",
  customer_id: "customer-1",
  vendor_id: "vendor-1",
  status: "COMPLETED",
  subtotal: "3.00",
  delivery_fee: "0.00",
  total: "3.00",
  currency: "USD",
  fulfilment_method: "COLLECTION",
  payment_method: null,
  payment_status: "UNPAID",
  created_at: "2026-09-19T10:00:00.000Z",
  updated_at: "2026-09-19T11:00:00.000Z",
  accepted_at: "2026-09-19T10:10:00.000Z",
  ready_at: "2026-09-19T10:30:00.000Z",
  completed_at: "2026-09-19T11:00:00.000Z",
  cancelled_at: null,
};

function createService(order: Order = completed) {
  const { events, tracker } = trackedAnalytics();
  const service = new RatingService(
    createMemoryRatingStore(),
    {
      async getById(id) {
        return id === order.id ? order : null;
      },
    },
    tracker,
  );
  return { service, events };
}

describe("ratings", () => {
  it("lets the buyer and vendor each rate a completed order once", async () => {
    const { service, events } = createService();

    const buyer = await service.submit({
      orderId: completed.id,
      raterType: "CUSTOMER",
      score: 5,
    });
    const vendor = await service.submit({
      orderId: completed.id,
      raterType: "VENDOR",
      score: 4,
    });

    expect(buyer.created).toBe(true);
    expect(buyer.rating.ratee_type).toBe("VENDOR");
    expect(buyer.rating.ratee_id).toBe("vendor-1");
    expect(vendor.created).toBe(true);
    expect(vendor.rating.ratee_type).toBe("CUSTOMER");
    expect(vendor.rating.ratee_id).toBe("customer-1");

    const again = await service.submit({
      orderId: completed.id,
      raterType: "CUSTOMER",
      score: 1,
    });
    expect(again.created).toBe(false);
    expect(again.rating.score).toBe(5);

    const summary = await service.summaryFor("VENDOR", "vendor-1");
    expect(summary).toEqual({ average: 5, count: 1 });
    expect(events).toContain("RATING_SUBMITTED");
  });

  it("rejects ratings before the order is completed", async () => {
    const { service } = createService({ ...completed, status: "READY" });

    await expect(
      service.submit({ orderId: completed.id, raterType: "CUSTOMER", score: 5 }),
    ).rejects.toMatchObject({ code: "ORDER_NOT_COMPLETED" });
    await expect(
      service.submit({ orderId: "missing", raterType: "VENDOR", score: 3 }),
    ).rejects.toBeInstanceOf(CommerceError);
  });
});
