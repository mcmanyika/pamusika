import { CommerceError } from "@/lib/commerce/errors";
import { quantityString, toQuantity } from "@/lib/commerce/money";
import { expectedOn } from "@/lib/harvest/month";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import {
  createIdempotencyStore,
  throwStoreError,
  type IdempotencyStore,
} from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  createHarvestPlanSchema,
  type CreateHarvestPlanInput,
} from "@/lib/validation/commerce";
import type { HarvestPlanStatus } from "@/types/commerce";
import type { HarvestPlan, Vendor } from "@/types/database";

export type HarvestVendorLookup = {
  getById(id: string): Promise<Vendor | null>;
};

export type HarvestStore = {
  findById(id: string): Promise<HarvestPlan | null>;
  listByVendor(vendorId: string): Promise<HarvestPlan[]>;
  listAll(): Promise<HarvestPlan[]>;
  create(plan: HarvestPlan): Promise<HarvestPlan>;
  update(id: string, patch: Partial<HarvestPlan>): Promise<HarvestPlan>;
};

const CREATE_OPERATION = "CREATE_HARVEST_PLAN";
const OPEN_STATUSES: HarvestPlanStatus[] = ["PLANNED", "READY"];

export class HarvestService {
  constructor(
    private readonly store: HarvestStore,
    private readonly vendors: HarvestVendorLookup,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
    private readonly idempotency?: IdempotencyStore,
  ) {}

  async create(input: CreateHarvestPlanInput): Promise<{ plan: HarvestPlan; created: boolean }> {
    const parsed = createHarvestPlanSchema.parse(input);

    if (parsed.idempotencyKey && this.idempotency) {
      const existingId = await this.idempotency.find(parsed.idempotencyKey, CREATE_OPERATION);
      if (existingId) {
        const existing = await this.requirePlan(existingId);
        return { plan: existing, created: false };
      }
    }

    const vendor = await this.vendors.getById(parsed.vendorId);
    if (!vendor) {
      throw new CommerceError("VENDOR_NOT_FOUND", "Vendor not found");
    }
    if (vendor.status !== "ACTIVE") {
      throw new CommerceError("VENDOR_INACTIVE", "This vendor account is not active");
    }

    const now = new Date().toISOString();
    const plan = await this.store.create({
      id: crypto.randomUUID(),
      vendor_id: vendor.id,
      category_id: parsed.categoryId ?? vendor.primary_category_id,
      crop_name: parsed.cropName,
      quantity: quantityString(toQuantity(parsed.quantity)),
      unit: parsed.unit,
      harvest_year: parsed.harvestYear,
      harvest_month: parsed.harvestMonth,
      expected_on: expectedOn(parsed.harvestYear, parsed.harvestMonth),
      city: parsed.city ?? vendor.city,
      area: parsed.area ?? vendor.area,
      status: "PLANNED",
      created_at: now,
      updated_at: now,
    });

    if (parsed.idempotencyKey && this.idempotency) {
      await this.idempotency.save(parsed.idempotencyKey, CREATE_OPERATION, "harvest_plans", plan.id);
    }

    await this.analytics.track({
      eventName: "HARVEST_PLAN_CREATED",
      userType: "VENDOR",
      userId: vendor.id,
      metadata: {
        harvestPlanId: plan.id,
        cropName: plan.crop_name,
        expectedOn: plan.expected_on,
      },
    });

    return { plan, created: true };
  }

  async listByVendor(vendorId: string, openOnly = true): Promise<HarvestPlan[]> {
    const rows = await this.store.listByVendor(vendorId);
    if (!openOnly) {
      return rows;
    }
    return rows.filter((row) => OPEN_STATUSES.includes(row.status as HarvestPlanStatus));
  }

  async listAll(): Promise<HarvestPlan[]> {
    return this.store.listAll();
  }

  async getById(id: string): Promise<HarvestPlan | null> {
    return this.store.findById(id);
  }

  async cancel(planId: string, vendorId: string): Promise<HarvestPlan> {
    const plan = await this.requirePlan(planId);
    if (plan.vendor_id !== vendorId) {
      throw new CommerceError("HARVEST_PLAN_FORBIDDEN", "That harvest plan does not belong to this business.");
    }
    if (plan.status === "CANCELLED") {
      return plan;
    }
    if (plan.status !== "PLANNED" && plan.status !== "READY") {
      throw new CommerceError("HARVEST_PLAN_LOCKED", "This harvest plan can no longer be cancelled.");
    }

    const updated = await this.store.update(plan.id, { status: "CANCELLED" });
    await this.analytics.track({
      eventName: "HARVEST_PLAN_CANCELLED",
      userType: "VENDOR",
      userId: vendorId,
      metadata: { harvestPlanId: plan.id, cropName: plan.crop_name },
    });
    return updated;
  }

  private async requirePlan(id: string): Promise<HarvestPlan> {
    const plan = await this.store.findById(id);
    if (!plan) {
      throw new CommerceError("HARVEST_PLAN_NOT_FOUND", "Harvest plan not found");
    }
    return plan;
  }
}

export function createHarvestService(
  client: CommerceClient,
  vendors: HarvestVendorLookup,
  analytics: AnalyticsTracker = silentAnalytics,
): HarvestService {
  const store: HarvestStore = {
    async findById(id) {
      const { data, error } = await client.from("harvest_plans").select("*").eq("id", id).maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async listByVendor(vendorId) {
      const { data, error } = await client
        .from("harvest_plans")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("expected_on", { ascending: true });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async listAll() {
      const { data, error } = await client
        .from("harvest_plans")
        .select("*")
        .order("expected_on", { ascending: true })
        .limit(200);
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async create(plan) {
      const { data, error } = await client.from("harvest_plans").insert(plan).select("*").single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("harvest_plans")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
  };

  return new HarvestService(store, vendors, analytics, createIdempotencyStore(client));
}
