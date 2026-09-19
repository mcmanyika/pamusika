import { CommerceError } from "@/lib/commerce/errors";
import { normalizePhoneNumber } from "@/lib/commerce/phone";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import { applyReferralSchema, type ApplyReferralInput } from "@/lib/validation/commerce";
import type { ReferralOwnerType } from "@/types/commerce";
import type { Referral, ReferralCode } from "@/types/database";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type ReferralStore = {
  findCode(code: string): Promise<ReferralCode | null>;
  findCodeByOwner(ownerType: ReferralOwnerType, ownerId: string): Promise<ReferralCode | null>;
  createCode(code: ReferralCode): Promise<ReferralCode>;
  findReferralByPhone(phone: string): Promise<Referral | null>;
  createReferral(referral: Referral): Promise<Referral>;
  updateReferral(id: string, patch: Partial<Referral>): Promise<Referral>;
  listByReferrer(ownerType: ReferralOwnerType, ownerId: string): Promise<Referral[]>;
  listAll(): Promise<Referral[]>;
};

export type ReferralOwnerLookup = {
  ownerPhone(ownerType: ReferralOwnerType, ownerId: string): Promise<string | null>;
  isRegistered(phone: string): Promise<boolean>;
};

export type ApplyReferralResult =
  | { status: "applied"; referral: Referral }
  | { status: "already"; referral: Referral }
  | { status: "invalid" }
  | { status: "self" }
  | { status: "registered" };

export class ReferralService {
  constructor(
    private readonly store: ReferralStore,
    private readonly owners: ReferralOwnerLookup,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
  ) {}

  async getOrCreateCode(ownerType: ReferralOwnerType, ownerId: string): Promise<ReferralCode> {
    const existing = await this.store.findCodeByOwner(ownerType, ownerId);
    if (existing) {
      return existing;
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateReferralCode();
      if (await this.store.findCode(code)) {
        continue;
      }
      return this.store.createCode({
        id: crypto.randomUUID(),
        code,
        owner_type: ownerType,
        owner_id: ownerId,
        created_at: new Date().toISOString(),
      });
    }

    throw new CommerceError("REFERRAL_CODE_FAILED", "Could not create a referral code.");
  }

  async applyCode(input: ApplyReferralInput): Promise<ApplyReferralResult> {
    const parsed = applyReferralSchema.parse(input);
    const phone = normalizePhoneNumber(parsed.phoneNumber);
    const code = normalizeReferralCode(parsed.code);
    const owned = await this.store.findCode(code);
    if (!owned) {
      return { status: "invalid" };
    }

    const existing = await this.store.findReferralByPhone(phone);
    if (existing) {
      return { status: "already", referral: existing };
    }

    const ownerPhone = await this.owners.ownerPhone(
      owned.owner_type as ReferralOwnerType,
      owned.owner_id,
    );
    if (ownerPhone && ownerPhone === phone) {
      return { status: "self" };
    }

    if (await this.owners.isRegistered(phone)) {
      return { status: "registered" };
    }

    const now = new Date().toISOString();
    const referral = await this.store.createReferral({
      id: crypto.randomUUID(),
      code_id: owned.id,
      referrer_type: owned.owner_type,
      referrer_id: owned.owner_id,
      referee_phone: phone,
      referee_type: null,
      referee_id: null,
      status: "PENDING",
      qualified_at: null,
      created_at: now,
      updated_at: now,
    });

    await this.analytics.track({
      eventName: "REFERRAL_APPLIED",
      metadata: { referralId: referral.id, code: owned.code },
    });

    return { status: "applied", referral };
  }

  async attachReferee(
    phoneNumber: string,
    refereeType: ReferralOwnerType,
    refereeId: string,
  ): Promise<Referral | null> {
    const referral = await this.store.findReferralByPhone(normalizePhoneNumber(phoneNumber));
    if (!referral) {
      return null;
    }
    if (referral.referee_id === refereeId && referral.referee_type === refereeType) {
      return referral;
    }
    return this.store.updateReferral(referral.id, {
      referee_type: refereeType,
      referee_id: refereeId,
    });
  }

  async qualify(
    phoneNumber: string,
    refereeType: ReferralOwnerType,
    refereeId: string,
  ): Promise<Referral | null> {
    const attached = await this.attachReferee(phoneNumber, refereeType, refereeId);
    if (!attached) {
      return null;
    }
    if (attached.status === "QUALIFIED") {
      return attached;
    }

    const updated = await this.store.updateReferral(attached.id, {
      referee_type: refereeType,
      referee_id: refereeId,
      status: "QUALIFIED",
      qualified_at: new Date().toISOString(),
    });

    await this.analytics.track({
      eventName: "REFERRAL_QUALIFIED",
      userType: refereeType,
      userId: refereeId,
      metadata: { referralId: updated.id },
    });

    return updated;
  }

  async stats(ownerType: ReferralOwnerType, ownerId: string): Promise<{
    code: ReferralCode;
    total: number;
    qualified: number;
  }> {
    const code = await this.getOrCreateCode(ownerType, ownerId);
    const listed = await this.store.listByReferrer(ownerType, ownerId);
    return {
      code,
      total: listed.length,
      qualified: listed.filter((referral) => referral.status === "QUALIFIED").length,
    };
  }

  async listAll(): Promise<Referral[]> {
    return this.store.listAll();
  }
}

export function normalizeReferralCode(value: string): string {
  const compact = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (compact.startsWith("PSR") && compact.length >= 8) {
    return `PS-R${compact.slice(3)}`;
  }
  return compact;
}

export function parseReferralCode(value: string): string | null {
  const match = /(?:^|\b)(?:ref(?:er(?:ral)?)?[\s:-]*)?(ps[-]?r[a-z0-9]{5,8})\b/i.exec(
    value.trim(),
  );
  if (!match?.[1]) {
    return null;
  }
  return normalizeReferralCode(match[1]);
}

export function generateReferralCode(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let body = "";
  for (const byte of bytes) {
    body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `PS-R${body}`;
}

export function createReferralService(
  client: CommerceClient,
  analytics: AnalyticsTracker = silentAnalytics,
): ReferralService {
  const store: ReferralStore = {
    async findCode(code) {
      const { data, error } = await client
        .from("referral_codes")
        .select("*")
        .eq("code", code)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findCodeByOwner(ownerType, ownerId) {
      const { data, error } = await client
        .from("referral_codes")
        .select("*")
        .eq("owner_type", ownerType)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async createCode(code) {
      const { data, error } = await client.from("referral_codes").insert(code).select("*").single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async findReferralByPhone(phone) {
      const { data, error } = await client
        .from("referrals")
        .select("*")
        .eq("referee_phone", phone)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async createReferral(referral) {
      const { data, error } = await client.from("referrals").insert(referral).select("*").single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async updateReferral(id, patch) {
      const { data, error } = await client
        .from("referrals")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async listByReferrer(ownerType, ownerId) {
      const { data, error } = await client
        .from("referrals")
        .select("*")
        .eq("referrer_type", ownerType)
        .eq("referrer_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async listAll() {
      const { data, error } = await client
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throwStoreError(error);
      return data ?? [];
    },
  };

  const owners: ReferralOwnerLookup = {
    async ownerPhone(ownerType, ownerId) {
      if (ownerType === "VENDOR") {
        const { data, error } = await client
          .from("vendors")
          .select("whatsapp_number")
          .eq("id", ownerId)
          .maybeSingle();
        if (error) throwStoreError(error);
        return data?.whatsapp_number ?? null;
      }
      const { data, error } = await client
        .from("customers")
        .select("whatsapp_number")
        .eq("id", ownerId)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data?.whatsapp_number ?? null;
    },
    async isRegistered(phone) {
      const vendor = await client
        .from("vendors")
        .select("id")
        .eq("whatsapp_number", phone)
        .maybeSingle();
      if (vendor.error) throwStoreError(vendor.error);
      if (vendor.data) {
        return true;
      }
      const customer = await client
        .from("customers")
        .select("id")
        .eq("whatsapp_number", phone)
        .maybeSingle();
      if (customer.error) throwStoreError(customer.error);
      return Boolean(customer.data);
    },
  };

  return new ReferralService(store, owners, analytics);
}
