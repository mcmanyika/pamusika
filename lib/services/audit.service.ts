import { logger } from "@/lib/utils/logger";
import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import type { Json } from "@/types/database";

export type AuditInput = {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
};

export class AuditService {
  constructor(private readonly client: CommerceClient) {}

  async record(input: AuditInput): Promise<void> {
    const { error } = await this.client.from("audit_logs").insert({
      admin_user_id: input.adminUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      old_value: toJson(input.oldValue),
      new_value: toJson(input.newValue),
    });

    if (error) {
      logger.warn({
        operation: "audit_record",
        result: "failed",
        error: error.message,
      });
    }
  }

  async listForEntity(entityType: string, entityId: string, limit = 20) {
    const { data, error } = await this.client
      .from("audit_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throwStoreError(error);
    return data ?? [];
  }
}

export function createAuditService(client: CommerceClient): AuditService {
  return new AuditService(client);
}

function toJson(value: unknown): Json | null {
  if (value == null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as Json;
}
