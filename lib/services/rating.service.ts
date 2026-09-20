import { CommerceError } from "@/lib/commerce/errors";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import { submitRatingSchema, type SubmitRatingInput } from "@/lib/validation/commerce";
import type { RatingRaterType } from "@/types/commerce";
import type { Order, Rating } from "@/types/database";

export type RatingOrderLookup = {
  getById(
    id: string,
  ): Promise<Pick<Order, "id" | "order_number" | "status" | "customer_id" | "vendor_id"> | null>;
};

export type RatingStore = {
  findByOrderAndRater(orderId: string, raterType: RatingRaterType): Promise<Rating | null>;
  listByOrder(orderId: string): Promise<Rating[]>;
  listByRatee(rateeType: RatingRaterType, rateeId: string): Promise<Rating[]>;
  create(rating: Rating): Promise<Rating>;
};

export type RatingSummary = {
  average: number;
  count: number;
};

export class RatingService {
  constructor(
    private readonly store: RatingStore,
    private readonly orders: RatingOrderLookup,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
  ) {}

  async getByOrderAndRater(orderId: string, raterType: RatingRaterType): Promise<Rating | null> {
    return this.store.findByOrderAndRater(orderId, raterType);
  }

  async listByOrder(orderId: string): Promise<Rating[]> {
    return this.store.listByOrder(orderId);
  }

  async summaryFor(rateeType: RatingRaterType, rateeId: string): Promise<RatingSummary> {
    const rows = await this.store.listByRatee(rateeType, rateeId);
    if (rows.length === 0) {
      return { average: 0, count: 0 };
    }
    const total = rows.reduce((sum, row) => sum + row.score, 0);
    return {
      average: Math.round((total / rows.length) * 10) / 10,
      count: rows.length,
    };
  }

  async submit(input: SubmitRatingInput): Promise<{ rating: Rating; created: boolean }> {
    const parsed = submitRatingSchema.parse(input);
    const order = await this.orders.getById(parsed.orderId);
    if (!order) {
      throw new CommerceError("ORDER_NOT_FOUND", "Order not found");
    }
    if (order.status !== "COMPLETED") {
      throw new CommerceError(
        "ORDER_NOT_COMPLETED",
        "Ratings can only be submitted after the order is completed",
      );
    }

    const parties = partiesFor(order, parsed.raterType);
    const existing = await this.store.findByOrderAndRater(order.id, parsed.raterType);
    if (existing) {
      return { rating: existing, created: false };
    }

    const rating = await this.store.create({
      id: crypto.randomUUID(),
      order_id: order.id,
      rater_type: parsed.raterType,
      rater_id: parties.raterId,
      ratee_type: parties.rateeType,
      ratee_id: parties.rateeId,
      score: parsed.score,
      created_at: new Date().toISOString(),
    });

    await this.analytics.track({
      eventName: "RATING_SUBMITTED",
      userType: parsed.raterType,
      userId: parties.raterId,
      metadata: {
        orderId: order.id,
        orderNumber: order.order_number,
        score: parsed.score,
        rateeType: parties.rateeType,
      },
    });

    return { rating, created: true };
  }
}

function partiesFor(
  order: Pick<Order, "customer_id" | "vendor_id">,
  raterType: RatingRaterType,
): { raterId: string; rateeType: RatingRaterType; rateeId: string } {
  if (raterType === "CUSTOMER") {
    return {
      raterId: order.customer_id,
      rateeType: "VENDOR",
      rateeId: order.vendor_id,
    };
  }

  return {
    raterId: order.vendor_id,
    rateeType: "CUSTOMER",
    rateeId: order.customer_id,
  };
}

export function createRatingService(
  client: CommerceClient,
  orders: RatingOrderLookup,
  analytics: AnalyticsTracker = silentAnalytics,
): RatingService {
  const store: RatingStore = {
    async findByOrderAndRater(orderId, raterType) {
      const { data, error } = await client
        .from("ratings")
        .select("*")
        .eq("order_id", orderId)
        .eq("rater_type", raterType)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async listByOrder(orderId) {
      const { data, error } = await client
        .from("ratings")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async listByRatee(rateeType, rateeId) {
      const { data, error } = await client
        .from("ratings")
        .select("*")
        .eq("ratee_type", rateeType)
        .eq("ratee_id", rateeId);
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async create(rating) {
      const { data, error } = await client.from("ratings").insert(rating).select("*").single();
      if (error || !data) throwStoreError(error);
      return data;
    },
  };

  return new RatingService(store, orders, analytics);
}
