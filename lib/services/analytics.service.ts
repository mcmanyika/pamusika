import { logger } from "@/lib/utils/logger";
import type { CommerceClient } from "@/lib/supabase/database";
import type { Json } from "@/types/database";
import type { AnalyticsTrackInput, AnalyticsTracker } from "@/lib/services/analytics.types";

export class AnalyticsService implements AnalyticsTracker {
  constructor(private readonly client: CommerceClient) {}

  async track(input: AnalyticsTrackInput): Promise<void> {
    const { error } = await this.client.from("analytics_events").insert({
      event_name: input.eventName,
      user_type: input.userType ?? null,
      user_id: input.userId ?? null,
      metadata: (input.metadata ?? {}) as Json,
    });

    if (error) {
      logger.error({
        operation: "analytics_track",
        result: "failed",
        error: error.message,
      });
    }
  }
}

export function createAnalyticsService(client: CommerceClient): AnalyticsService {
  return new AnalyticsService(client);
}
