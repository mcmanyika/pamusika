import { describe, expect, it } from "vitest";
import { CommerceError } from "@/lib/commerce/errors";
import { decrementInventory } from "@/lib/commerce/inventory";
import { calculateOrderTotals } from "@/lib/commerce/money";
import { assertOrderTransition } from "@/lib/commerce/order-state";
import { normalizePhoneNumber } from "@/lib/commerce/phone";

describe("order totals", () => {
  it("calculates a simple collection order on the server", () => {
    expect(calculateOrderTotals({ quantity: 3, unitPrice: 1 })).toEqual({
      subtotal: 3,
      deliveryFee: 0,
      total: 3,
    });
  });

  it("rounds money to two decimal places", () => {
    expect(calculateOrderTotals({ quantity: 3, unitPrice: 1.125, deliveryFee: 0.5 })).toEqual({
      subtotal: 3.38,
      deliveryFee: 0.5,
      total: 3.88,
    });
  });

  it("rejects non-positive quantities", () => {
    expect(() => calculateOrderTotals({ quantity: 0, unitPrice: 1 })).toThrow(CommerceError);
  });
});

describe("order transitions", () => {
  it("allows the happy path", () => {
    assertOrderTransition("PENDING_VENDOR", "ACCEPTED");
    assertOrderTransition("ACCEPTED", "PREPARING");
    assertOrderTransition("PREPARING", "READY");
    assertOrderTransition("READY", "COMPLETED");
  });

  it("allows collection to skip preparing", () => {
    assertOrderTransition("ACCEPTED", "READY");
  });

  it("allows a vendor to decline only before acceptance", () => {
    assertOrderTransition("PENDING_VENDOR", "DECLINED");
    expect(() => assertOrderTransition("ACCEPTED", "DECLINED")).toThrow(CommerceError);
  });

  it("blocks completing a pending order", () => {
    expect(() => assertOrderTransition("PENDING_VENDOR", "COMPLETED")).toThrow(
      CommerceError,
    );
  });

  it("does not allow cancelling a ready or completed order", () => {
    expect(() => assertOrderTransition("READY", "CANCELLED")).toThrow(CommerceError);
    expect(() => assertOrderTransition("COMPLETED", "CANCELLED")).toThrow(CommerceError);
  });
});

describe("inventory", () => {
  it("decrements stock and marks out of stock at zero", () => {
    expect(decrementInventory(20, 20)).toEqual({
      remaining: 0,
      status: "OUT_OF_STOCK",
    });
  });

  it("rejects a negative remainder", () => {
    expect(() => decrementInventory(2, 3)).toThrow(CommerceError);
  });
});

describe("phone normalization", () => {
  it("normalizes Zimbabwe local numbers", () => {
    expect(normalizePhoneNumber("0771234567")).toBe("+263771234567");
    expect(normalizePhoneNumber("+263 77 123 4567")).toBe("+263771234567");
  });
});
