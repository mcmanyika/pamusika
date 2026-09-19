import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import type { Json, MessageLog } from "@/types/database";
import type { MessageDirection } from "@/types/conversation";

export type MessageLogStore = {
  findByExternalId(externalMessageId: string): Promise<MessageLog | null>;
  insert(log: MessageLog): Promise<MessageLog>;
  update(id: string, patch: Partial<MessageLog>): Promise<MessageLog>;
};

export class MessageLogService {
  constructor(private readonly store: MessageLogStore) {}

  async claimInbound(input: {
    externalMessageId: string;
    phoneNumber: string;
    messageType: string;
    messageText: string | null;
    payload: Json;
  }): Promise<{ log: MessageLog; duplicate: boolean }> {
    const existing = await this.store.findByExternalId(input.externalMessageId);
    if (existing) {
      return { log: existing, duplicate: true };
    }

    try {
      const now = new Date().toISOString();
      const log = await this.store.insert({
        id: crypto.randomUUID(),
        external_message_id: input.externalMessageId,
        phone_number: input.phoneNumber,
        direction: "INBOUND",
        message_type: input.messageType,
        message_text: input.messageText,
        payload: input.payload,
        status: "RECEIVED",
        created_at: now,
      });
      return { log, duplicate: false };
    } catch (error) {
      const raced = await this.store.findByExternalId(input.externalMessageId);
      if (raced) {
        return { log: raced, duplicate: true };
      }
      throw error;
    }
  }

  async markProcessed(id: string): Promise<void> {
    await this.store.update(id, { status: "PROCESSED" });
  }

  async markFailed(id: string): Promise<void> {
    await this.store.update(id, { status: "FAILED" });
  }

  async logOutbound(input: {
    externalMessageId: string | null;
    phoneNumber: string;
    messageType: string;
    messageText: string | null;
    payload: Json;
    status?: string;
  }): Promise<MessageLog> {
    const now = new Date().toISOString();
    return this.store.insert({
      id: crypto.randomUUID(),
      external_message_id: input.externalMessageId,
      phone_number: input.phoneNumber,
      direction: "OUTBOUND" satisfies MessageDirection,
      message_type: input.messageType,
      message_text: input.messageText,
      payload: input.payload,
      status: input.status ?? "SENT",
      created_at: now,
    });
  }
}

export function createMessageLogService(client: CommerceClient): MessageLogService {
  const store: MessageLogStore = {
    async findByExternalId(externalMessageId) {
      const { data, error } = await client
        .from("message_logs")
        .select("*")
        .eq("external_message_id", externalMessageId)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async insert(log) {
      const { data, error } = await client
        .from("message_logs")
        .insert(log)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("message_logs")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
  };

  return new MessageLogService(store);
}
