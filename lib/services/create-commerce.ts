import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { AnalyticsService } from "@/lib/services/analytics.service";
import { createCategoryService } from "@/lib/services/category.service";
import { createCustomerService } from "@/lib/services/customer.service";
import { createOrderService } from "@/lib/services/order.service";
import { createProductService } from "@/lib/services/product.service";
import { createSupportService } from "@/lib/services/support.service";
import { createReferralService } from "@/lib/services/referral.service";
import { createRatingService } from "@/lib/services/rating.service";
import { createHarvestService } from "@/lib/services/harvest.service";
import { createVendorService } from "@/lib/services/vendor.service";
import type { CommerceClient } from "@/lib/supabase/database";

export function createCommerceServices(
  client: CommerceClient,
  analytics?: AnalyticsTracker,
) {
  const tracker = analytics ?? new AnalyticsService(client);
  const vendors = createVendorService(client, tracker);
  const orders = createOrderService(client, tracker);

  return {
    analytics: tracker,
    vendors,
    customers: createCustomerService(client, tracker),
    products: createProductService(client, tracker),
    orders,
    categories: createCategoryService(client),
    support: createSupportService(client, tracker),
    referrals: createReferralService(client, tracker),
    ratings: createRatingService(client, orders, tracker),
    harvest: createHarvestService(client, vendors, tracker),
  };
}
