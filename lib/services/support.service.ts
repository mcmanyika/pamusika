import { throwStoreError } from "@/lib/services/idempotency";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  openSupportTicketSchema,
  updateSupportTicketSchema,
  type OpenSupportTicketInput,
  type UpdateSupportTicketInput,
} from "@/lib/validation/support";
import type { TicketStatus } from "@/types/commerce";
import type { SupportTicket } from "@/types/database";

export type SupportStore = {
  findById(id: string): Promise<SupportTicket | null>;
  findOpenByPhone(phone: string): Promise<SupportTicket | null>;
  list(filters?: { status?: TicketStatus; userId?: string; limit?: number }): Promise<SupportTicket[]>;
  create(ticket: SupportTicket): Promise<SupportTicket>;
  update(id: string, patch: Partial<SupportTicket>): Promise<SupportTicket>;
};

export class SupportService {
  constructor(
    private readonly store: SupportStore,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
  ) {}

  async open(input: OpenSupportTicketInput): Promise<{ ticket: SupportTicket; created: boolean }> {
    const parsed = openSupportTicketSchema.parse(input);
    if (parsed.phoneNumber) {
      const existing = await this.store.findOpenByPhone(parsed.phoneNumber);
      if (existing) {
        return { ticket: existing, created: false };
      }
    }

    const now = new Date().toISOString();
    const ticket = await this.store.create({
      id: crypto.randomUUID(),
      user_type: parsed.userType ?? null,
      user_id: parsed.userId ?? null,
      phone_number: parsed.phoneNumber ?? null,
      category: parsed.category,
      priority: parsed.priority,
      status: "OPEN",
      description: parsed.description,
      assigned_to: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
    });

    await this.analytics.track({
      eventName: "SUPPORT_REQUESTED",
      userType: parsed.userType,
      userId: parsed.userId,
      metadata: { ticketId: ticket.id, category: ticket.category },
    });

    return { ticket, created: true };
  }

  async list(filters?: { status?: TicketStatus; userId?: string; limit?: number }): Promise<SupportTicket[]> {
    return this.store.list(filters);
  }

  async getById(id: string): Promise<SupportTicket | null> {
    return this.store.findById(id);
  }

  async update(id: string, input: UpdateSupportTicketInput): Promise<SupportTicket> {
    const parsed = updateSupportTicketSchema.parse(input);
    const patch: Partial<SupportTicket> = {};
    if (parsed.status !== undefined) {
      patch.status = parsed.status;
      patch.resolved_at =
        parsed.status === "RESOLVED" || parsed.status === "CLOSED"
          ? new Date().toISOString()
          : null;
    }
    if (parsed.priority !== undefined) patch.priority = parsed.priority;
    if (parsed.assignedTo !== undefined) patch.assigned_to = parsed.assignedTo;
    return this.store.update(id, patch);
  }
}

export function createSupportService(
  client: CommerceClient,
  analytics: AnalyticsTracker = silentAnalytics,
): SupportService {
  const store: SupportStore = {
    async findById(id) {
      const { data, error } = await client
        .from("support_tickets")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findOpenByPhone(phone) {
      const { data, error } = await client
        .from("support_tickets")
        .select("*")
        .eq("phone_number", phone)
        .eq("status", "OPEN")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async list(filters) {
      let query = client
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters?.limit ?? 100);
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.userId) {
        query = query.eq("user_id", filters.userId);
      }
      const { data, error } = await query;
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async create(ticket) {
      const { data, error } = await client
        .from("support_tickets")
        .insert(ticket)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("support_tickets")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
  };

  return new SupportService(store, analytics);
}
