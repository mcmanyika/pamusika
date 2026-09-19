import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import type { ConversationState } from "@/types/conversation";
import type { ConversationSession, Json } from "@/types/database";
import type { UserType } from "@/types/commerce";

export type ConversationStore = {
  findActiveByPhone(phone: string): Promise<ConversationSession | null>;
  create(session: ConversationSession): Promise<ConversationSession>;
  update(id: string, patch: Partial<ConversationSession>): Promise<ConversationSession>;
  deactivateActive(phone: string): Promise<void>;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export class ConversationService {
  constructor(private readonly store: ConversationStore) {}

  async getOrCreateActive(input: {
    phoneNumber: string;
    userType: UserType;
    userId?: string | null;
  }): Promise<ConversationSession> {
    const existing = await this.store.findActiveByPhone(input.phoneNumber);
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

    const expired =
      existing?.expires_at != null && new Date(existing.expires_at).getTime() < now.getTime();

    if (existing && !expired) {
      return this.store.update(existing.id, {
        last_message_at: now.toISOString(),
        expires_at: expires,
        user_type: input.userType,
        user_id: input.userId ?? existing.user_id,
      });
    }

    await this.store.deactivateActive(input.phoneNumber);

    return this.store.create({
      id: crypto.randomUUID(),
      phone_number: input.phoneNumber,
      user_type: input.userType,
      user_id: input.userId ?? null,
      current_state: "NEW",
      context_json: {},
      is_active: true,
      last_message_at: now.toISOString(),
      expires_at: expires,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  }

  async setState(
    sessionId: string,
    state: ConversationState,
    context?: Json,
  ): Promise<ConversationSession> {
    return this.store.update(sessionId, {
      current_state: state,
      ...(context !== undefined ? { context_json: context } : {}),
    });
  }

  async attachUser(
    sessionId: string,
    userType: UserType,
    userId: string,
  ): Promise<ConversationSession> {
    return this.store.update(sessionId, {
      user_type: userType,
      user_id: userId,
    });
  }
}

export function createConversationService(client: CommerceClient): ConversationService {
  const store: ConversationStore = {
    async findActiveByPhone(phone) {
      const { data, error } = await client
        .from("conversation_sessions")
        .select("*")
        .eq("phone_number", phone)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async create(session) {
      const { data, error } = await client
        .from("conversation_sessions")
        .insert(session)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("conversation_sessions")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async deactivateActive(phone) {
      const { error } = await client
        .from("conversation_sessions")
        .update({ is_active: false })
        .eq("phone_number", phone)
        .eq("is_active", true);
      if (error) throwStoreError(error);
    },
  };

  return new ConversationService(store);
}
