import { CommerceError } from "@/lib/commerce/errors";
import { normalizePhoneNumber } from "@/lib/commerce/phone";
import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  createCustomerAddressSchema,
  upsertCustomerSchema,
  type CreateCustomerAddressInput,
  type UpsertCustomerInput,
} from "@/lib/validation/commerce";
import type { Customer, CustomerAddress } from "@/types/database";

export const MAX_CUSTOMER_ADDRESSES = 8;

export type CustomerStore = {
  findById(id: string): Promise<Customer | null>;
  findByWhatsapp(phone: string): Promise<Customer | null>;
  create(customer: Customer): Promise<Customer>;
  update(id: string, patch: Partial<Customer>): Promise<Customer>;
  listAddresses(customerId: string): Promise<CustomerAddress[]>;
  findAddress(id: string): Promise<CustomerAddress | null>;
  createAddress(address: CustomerAddress): Promise<CustomerAddress>;
  updateAddress(id: string, patch: Partial<CustomerAddress>): Promise<CustomerAddress>;
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

  async listAddresses(customerId: string): Promise<CustomerAddress[]> {
    return this.store.listAddresses(customerId);
  }

  async addAddress(input: CreateCustomerAddressInput): Promise<CustomerAddress> {
    const parsed = createCustomerAddressSchema.parse(input);
    await this.requireCustomer(parsed.customerId);

    const existing = await this.store.listAddresses(parsed.customerId);
    if (existing.length >= MAX_CUSTOMER_ADDRESSES) {
      throw new CommerceError(
        "ADDRESS_LIMIT",
        "You already have the maximum number of saved addresses.",
      );
    }

    const makeDefault = parsed.isDefault === true || existing.length === 0;
    if (makeDefault) {
      await this.clearDefault(existing);
    }

    const now = new Date().toISOString();
    return this.store.createAddress({
      id: crypto.randomUUID(),
      customer_id: parsed.customerId,
      label: parsed.label,
      line1: parsed.line1,
      line2: parsed.line2 ?? null,
      area: parsed.area ?? null,
      city: parsed.city ?? null,
      province: parsed.province ?? null,
      country: parsed.country,
      is_default: makeDefault,
      created_at: now,
      updated_at: now,
    });
  }

  async setDefaultAddress(customerId: string, addressId: string): Promise<CustomerAddress> {
    const address = await this.store.findAddress(addressId);
    if (!address || address.customer_id !== customerId) {
      throw new CommerceError("ADDRESS_NOT_FOUND", "Address not found");
    }

    if (!address.is_default) {
      const existing = await this.store.listAddresses(customerId);
      await this.clearDefault(existing);
      return this.store.updateAddress(addressId, { is_default: true });
    }

    return address;
  }

  private async clearDefault(addresses: CustomerAddress[]): Promise<void> {
    for (const address of addresses.filter((item) => item.is_default)) {
      await this.store.updateAddress(address.id, { is_default: false });
    }
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
    async listAddresses(customerId) {
      const { data, error } = await client
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async findAddress(id) {
      const { data, error } = await client
        .from("customer_addresses")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async createAddress(address) {
      const { data, error } = await client
        .from("customer_addresses")
        .insert(address)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async updateAddress(id, patch) {
      const { data, error } = await client
        .from("customer_addresses")
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
