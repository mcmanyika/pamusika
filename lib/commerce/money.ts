import { CommerceError } from "@/lib/commerce/errors";

export function parseDecimal(value: string | number, field = "value"): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new CommerceError("INVALID_NUMBER", `${field} must be a valid number`);
  }

  return parsed;
}

export function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function moneyString(value: number): string {
  return toMoney(value).toFixed(2);
}

export function quantityString(value: number): string {
  return toQuantity(value).toString();
}

export function calculateLineTotal(quantity: number, unitPrice: number): number {
  if (quantity <= 0) {
    throw new CommerceError("INVALID_QUANTITY", "Quantity must be greater than 0");
  }

  if (unitPrice < 0) {
    throw new CommerceError("INVALID_PRICE", "Price cannot be negative");
  }

  return toMoney(quantity * unitPrice);
}

export function calculateOrderTotals(input: {
  quantity: number;
  unitPrice: number;
  deliveryFee?: number;
}): {
  subtotal: number;
  deliveryFee: number;
  total: number;
} {
  const subtotal = calculateLineTotal(input.quantity, input.unitPrice);
  const deliveryFee = toMoney(input.deliveryFee ?? 0);

  if (deliveryFee < 0) {
    throw new CommerceError("INVALID_PRICE", "Delivery fee cannot be negative");
  }

  return {
    subtotal,
    deliveryFee,
    total: toMoney(subtotal + deliveryFee),
  };
}
