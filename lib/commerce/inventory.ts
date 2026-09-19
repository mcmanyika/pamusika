import { CommerceError } from "@/lib/commerce/errors";
import { toQuantity } from "@/lib/commerce/money";
import type { ProductStatus } from "@/types/commerce";

export function assertSufficientInventory(available: number, requested: number): void {
  if (requested <= 0) {
    throw new CommerceError("INVALID_QUANTITY", "Quantity must be greater than 0");
  }

  if (available < requested) {
    throw new CommerceError(
      "INSUFFICIENT_INVENTORY",
      "There is not enough stock for this quantity",
    );
  }
}

export function decrementInventory(
  available: number,
  requested: number,
  currentStatus: ProductStatus = "ACTIVE",
): {
  remaining: number;
  status: ProductStatus;
} {
  assertSufficientInventory(available, requested);

  const remaining = toQuantity(available - requested);

  return {
    remaining,
    status: remaining <= 0 ? "OUT_OF_STOCK" : currentStatus,
  };
}
