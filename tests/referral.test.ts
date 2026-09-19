import { describe, expect, it } from "vitest";
import { ReferralService, parseReferralCode } from "@/lib/services/referral.service";
import { CustomerService } from "@/lib/services/customer.service";
import { VendorService } from "@/lib/services/vendor.service";
import type { Customer, Vendor } from "@/types/database";
import {
  createMemoryCustomerStore,
  createMemoryIdempotencyStore,
  createMemoryReferralOwners,
  createMemoryReferralStore,
  createMemoryVendorStore,
  trackedAnalytics,
} from "./helpers/memory";

describe("parseReferralCode", () => {
  it("reads REF codes from chat text", () => {
    expect(parseReferralCode("REF PS-R7K2MQ")).toBe("PS-R7K2MQ");
    expect(parseReferralCode("psr7k2mq")).toBe("PS-R7K2MQ");
    expect(parseReferralCode("hello")).toBeNull();
  });
});

describe("referral service", () => {
  it("applies a first-touch code and rejects self-referral", async () => {
    const customers: Parameters<typeof createMemoryReferralOwners>[0] = [];
    const vendors: Parameters<typeof createMemoryReferralOwners>[1] = [];
    const { events, tracker } = trackedAnalytics();
    const customerService = new CustomerService(createMemoryCustomerStore(customers));
    const { customer } = await customerService.getOrCreate({
      whatsappNumber: "+263770001111",
      displayName: "Chipo",
    });
    const referrals = new ReferralService(
      createMemoryReferralStore(),
      createMemoryReferralOwners(customers, vendors),
      tracker,
    );

    const code = await referrals.getOrCreateCode("CUSTOMER", customer.id);
    const applied = await referrals.applyCode({
      phoneNumber: "+263770002222",
      code: code.code,
    });
    expect(applied.status).toBe("applied");
    expect(events).toContain("REFERRAL_APPLIED");

    const again = await referrals.applyCode({
      phoneNumber: "+263770002222",
      code: code.code,
    });
    expect(again.status).toBe("already");

    const self = await referrals.applyCode({
      phoneNumber: "+263770001111",
      code: code.code,
    });
    expect(self.status).toBe("self");
  });

  it("qualifies when the referred vendor is confirmed", async () => {
    const customers: Customer[] = [];
    const vendors: Vendor[] = [];
    const { events, tracker } = trackedAnalytics();
    const vendorService = new VendorService(
      createMemoryVendorStore(vendors),
      tracker,
      createMemoryIdempotencyStore(),
    );
    const referrer = await vendorService.register({
      whatsappNumber: "+263771111111",
      firstName: "Tariro",
      businessName: "Tariro Fresh",
      city: "Harare",
    });
    await vendorService.confirm(referrer.vendor.id);

    const referrals = new ReferralService(
      createMemoryReferralStore(),
      createMemoryReferralOwners(customers, vendors),
      tracker,
    );
    const code = await referrals.getOrCreateCode("VENDOR", referrer.vendor.id);
    await referrals.applyCode({ phoneNumber: "+263772222222", code: code.code });

    const invited = await vendorService.register({
      whatsappNumber: "+263772222222",
      firstName: "Rudo",
      businessName: "Rudo Greens",
      city: "Harare",
    });
    const confirmed = await vendorService.confirm(invited.vendor.id);
    const qualified = await referrals.qualify(
      "+263772222222",
      "VENDOR",
      confirmed.id,
    );

    expect(qualified?.status).toBe("QUALIFIED");
    expect(events).toContain("REFERRAL_QUALIFIED");
    const stats = await referrals.stats("VENDOR", referrer.vendor.id);
    expect(stats.qualified).toBe(1);
  });
});
