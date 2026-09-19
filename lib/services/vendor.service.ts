import { CommerceError } from "@/lib/commerce/errors";
import { normalizePhoneNumber } from "@/lib/commerce/phone";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import {
  createIdempotencyStore,
  throwStoreError,
  type IdempotencyStore,
} from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  registerVendorSchema,
  updateVendorSchema,
  type RegisterVendorInput,
  type UpdateVendorInput,
} from "@/lib/validation/commerce";
import type { Vendor } from "@/types/database";
import type { VendorStatus } from "@/types/commerce";

export type VendorStore = {
  findById(id: string): Promise<Vendor | null>;
  findByWhatsapp(phone: string): Promise<Vendor | null>;
  create(vendor: Vendor): Promise<Vendor>;
  update(id: string, patch: Partial<Vendor>): Promise<Vendor>;
  generateVendorCode(city?: string | null): Promise<string>;
};

const REGISTER_OPERATION = "REGISTER_VENDOR";

export class VendorService {
  constructor(
    private readonly store: VendorStore,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
    private readonly idempotency?: IdempotencyStore,
  ) {}

  async register(input: RegisterVendorInput): Promise<{ vendor: Vendor; created: boolean }> {
    const parsed = registerVendorSchema.parse(input);
    const phone = normalizePhoneNumber(parsed.whatsappNumber);

    if (parsed.idempotencyKey && this.idempotency) {
      const existingId = await this.idempotency.find(
        parsed.idempotencyKey,
        REGISTER_OPERATION,
      );
      if (existingId) {
        const vendor = await this.requireVendor(existingId);
        return { vendor, created: false };
      }
    }

    const existing = await this.store.findByWhatsapp(phone);
    if (existing) {
      if (parsed.idempotencyKey && this.idempotency) {
        await this.idempotency.save(
          parsed.idempotencyKey,
          REGISTER_OPERATION,
          "vendors",
          existing.id,
        );
      }
      return { vendor: existing, created: false };
    }

    const now = new Date().toISOString();
    const vendor = await this.store.create({
      id: crypto.randomUUID(),
      vendor_code: await this.store.generateVendorCode(parsed.city),
      whatsapp_number: phone,
      first_name: parsed.firstName,
      last_name: parsed.lastName ?? null,
      business_name: parsed.businessName,
      primary_category_id: parsed.categoryId ?? null,
      country: parsed.country,
      province: parsed.province ?? null,
      city: parsed.city ?? null,
      area: parsed.area ?? null,
      market_name: parsed.marketName ?? null,
      preferred_language: parsed.preferredLanguage,
      profile_image_url: null,
      status: "PENDING",
      verification_status: "UNVERIFIED",
      created_at: now,
      updated_at: now,
    });

    if (parsed.idempotencyKey && this.idempotency) {
      await this.idempotency.save(
        parsed.idempotencyKey,
        REGISTER_OPERATION,
        "vendors",
        vendor.id,
      );
    }

    await this.analytics.track({
      eventName: "VENDOR_REGISTRATION_STARTED",
      userType: "VENDOR",
      userId: vendor.id,
    });

    return { vendor, created: true };
  }

  async confirm(vendorId: string): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);

    if (vendor.status === "ACTIVE") {
      return vendor;
    }

    if (vendor.status !== "PENDING") {
      throw new CommerceError(
        "VENDOR_NOT_CONFIRMABLE",
        "Only pending vendors can be confirmed",
      );
    }

    const updated = await this.store.update(vendorId, { status: "ACTIVE" });
    await this.analytics.track({
      eventName: "VENDOR_REGISTERED",
      userType: "VENDOR",
      userId: vendorId,
    });
    return updated;
  }

  async updateProfile(vendorId: string, input: UpdateVendorInput): Promise<Vendor> {
    await this.requireVendor(vendorId);
    const parsed = updateVendorSchema.parse(input);
    const patch: Partial<Vendor> = {};
    if (parsed.firstName !== undefined) patch.first_name = parsed.firstName;
    if (parsed.lastName !== undefined) patch.last_name = parsed.lastName;
    if (parsed.businessName !== undefined) patch.business_name = parsed.businessName;
    if (parsed.categoryId !== undefined) patch.primary_category_id = parsed.categoryId;
    if (parsed.province !== undefined) patch.province = parsed.province;
    if (parsed.city !== undefined) patch.city = parsed.city;
    if (parsed.area !== undefined) patch.area = parsed.area;
    if (parsed.marketName !== undefined) patch.market_name = parsed.marketName;
    if (parsed.preferredLanguage !== undefined) {
      patch.preferred_language = parsed.preferredLanguage;
    }
    if (parsed.profileImageUrl !== undefined) {
      patch.profile_image_url = parsed.profileImageUrl;
    }
    return this.store.update(vendorId, patch);
  }

  async setStatus(vendorId: string, status: VendorStatus): Promise<Vendor> {
    await this.requireVendor(vendorId);
    return this.store.update(vendorId, { status });
  }

  async getById(vendorId: string): Promise<Vendor | null> {
    return this.store.findById(vendorId);
  }

  async getByWhatsapp(phone: string): Promise<Vendor | null> {
    return this.store.findByWhatsapp(normalizePhoneNumber(phone));
  }

  async requireActive(vendorId: string): Promise<Vendor> {
    const vendor = await this.requireVendor(vendorId);
    if (vendor.status !== "ACTIVE") {
      throw new CommerceError("VENDOR_INACTIVE", "This vendor is not active");
    }
    return vendor;
  }

  private async requireVendor(vendorId: string): Promise<Vendor> {
    const vendor = await this.store.findById(vendorId);
    if (!vendor) {
      throw new CommerceError("VENDOR_NOT_FOUND", "Vendor not found");
    }
    return vendor;
  }
}

export function createVendorService(
  client: CommerceClient,
  analytics: AnalyticsTracker = silentAnalytics,
): VendorService {
  const store: VendorStore = {
    async findById(id) {
      const { data, error } = await client
        .from("vendors")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findByWhatsapp(phone) {
      const { data, error } = await client
        .from("vendors")
        .select("*")
        .eq("whatsapp_number", phone)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async create(vendor) {
      const { data, error } = await client
        .from("vendors")
        .insert(vendor)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("vendors")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async generateVendorCode(city) {
      const { data, error } = await client.rpc("generate_vendor_code", {
        p_city: city ?? undefined,
      });
      if (error || !data) throwStoreError(error);
      return data;
    },
  };

  return new VendorService(store, analytics, createIdempotencyStore(client));
}
