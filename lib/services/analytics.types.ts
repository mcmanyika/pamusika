import type { AnalyticsEventName } from "@/lib/commerce/events";
import type { Json } from "@/types/database";
import type { UserType } from "@/types/commerce";

export type AnalyticsTrackInput = {
  eventName: AnalyticsEventName;
  userType?: UserType | null;
  userId?: string | null;
  metadata?: Record<string, Json | undefined>;
};

export type AnalyticsTracker = {
  track(input: AnalyticsTrackInput): Promise<void>;
};

export const silentAnalytics: AnalyticsTracker = {
  async track() {},
};
