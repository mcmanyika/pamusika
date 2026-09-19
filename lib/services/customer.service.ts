import { CommerceError } from "@/lib/commerce/errors";
import { normalizePhoneNumber } from "@/lib/commerce/phone";
import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  upsertCustomerSchema,
  type UpsertCustomerInput,
} from "@/lib/validation/commerce";
import type { Customer } from "@/types/database";

export type CustomerStore = {
  findById(id: string): Promise<Customer | null>;
  findByWhatsapp(phone: string): Promise<Customer | null>;
  create(customer: Customer): Promise<Customer>;
  update(id: string, patch: Partial<Customer>): Promise<Customer>;
};

export class CustomerService {
  constructor(private readonly store: CustomerStore) {}

  async getOrCreate(input: UpsertCustomerInput): Promise<{
    customer: Customer;
    created: boolean;
  }> {
    const parsed = upsertCustomerSchema.parse(input);
    const phone = normalizePhoneNumber(parsed.whatsappNumber);
    const existing = await this.store.findByWhatsapp(phone);

    if (existing) {
      const patch: Partial<Customer> = {};
      if (parsed.displayName && parsed.displayName !== existing.display_name) {
        patch.display_name = parsed.displayName;
      }
      if (parsed.city && parsed.city !== existing.city) {
        patch.city = parsed.city;
      }
      if (parsed.area && parsed.area !== existing.area) {
        patch.area = parsed.area;
      }
      if (parsed.preferredLanguage && parsed.preferredLanguage !== existing.preferred_language) {
        patch.preferred_language = parsed.preferredLanguage;
      }

      if (Object.keys(patch).length > 0) {
        return { customer: await this.store.update(existing.id, patch), created: false };
      }

      return { customer: existing, created: false };
    }

    const now = new Date().toISOString();
    const customer = await this.store.create({
      id: crypto.randomUUID(),
      whatsapp_number: phone,
      display_name: parsed.displayName ?? null,
      country: parsed.country,
      city: parsed.city ?? null,
      area: parsed.area ?? null,
      preferred_language: parsed.preferredLanguage,
      created_at: now,
      updated_at: now,
    });

    return { customer, created: true };
  }

  async getById(customerId: string): Promise<Customer | null> {
    return this.store.findById(customerId);
  }

  async getByWhatsapp(phone: string): Promise<Customer | null> {
    return this.store.findByWhatsapp(normalizePhoneNumber(phone));
  }

  async requireCustomer(customerId: string): Promise<Customer> {
    const customer = await this.store.findById(customerId);
    if (!customer) {
      throw new CommerceError("CUSTOMER_NOT_FOUND", "Customer not found");
    }
    return customer;
  }
}

export function createCustomerService(client: CommerceClient): CustomerService {
  const store: CustomerStore = {
    async findById(id) {
      const { data, error } = await client
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findByWhatsapp(phone) {
      const { data, error } = await client
        .from("customers")
        .select("*")
        .eq("whatsapp_number", phone)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async create(customer) {
      const { data, error } = await client
        .from("customers")
        .insert(customer)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("customers")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
  };

  return new CustomerService(store);
}
