import { CommerceError } from "@/lib/commerce/errors";
import type { CommerceClient } from "@/lib/supabase/database";

export type IdempotencyStore = {
  find(key: string, operation: string): Promise<string | null>;
  save(
    key: string,
    operation: string,
    entityType: string,
    entityId: string,
  ): Promise<void>;
};

export function throwStoreError(error: { message: string } | null): never {
  throw new CommerceError("STORE_ERROR", error?.message ?? "Database error");
}

export function createIdempotencyStore(client: CommerceClient): IdempotencyStore {
  return {
    async find(key, operation) {
      const { data, error } = await client
        .from("idempotency_keys")
        .select("entity_id")
        .eq("key", key)
        .eq("operation", operation)
        .maybeSingle();

      if (error) {
        throwStoreError(error);
      }

      return data?.entity_id ?? null;
    },
    async save(key, operation, entityType, entityId) {
      const { error } = await client.from("idempotency_keys").insert({
        key,
        operation,
        entity_type: entityType,
        entity_id: entityId,
      });

      if (error && error.code !== "23505") {
        throwStoreError(error);
      }
    },
  };
}
