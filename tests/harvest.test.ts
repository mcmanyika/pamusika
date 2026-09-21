import { describe, expect, it } from "vitest";
import { CommerceError } from "@/lib/commerce/errors";
import { parseHarvestMonth, upcomingHarvestMonths } from "@/lib/harvest/month";
import { HarvestService } from "@/lib/services/harvest.service";
import { createMemoryHarvestStore, trackedAnalytics } from "./helpers/memory";
import type { Vendor } from "@/types/database";

const now = "2026-09-21T00:00:00.000Z";

const vendor: Vendor = {
  id: "vendor-1",
  vendor_code: "PS-HRE-000001",
  whatsapp_number: "+263771111111",
  first_name: "Tariro",
  last_name: null,
  business_name: "Tariro Fresh Produce",
  primary_category_id: "cat-produce",
  country: "Zimbabwe",
  province: "Harare",
  city: "Harare",
  area: "Mbare",
  market_name: null,
  preferred_language: "en",
  profile_image_url: null,
  status: "ACTIVE",
  verification_status: "VERIFIED",
  created_at: now,
  updated_at: now,
};

function createService(status: Vendor["status"] = "ACTIVE") {
  const { events, tracker } = trackedAnalytics();
  const plans = createMemoryHarvestStore();
  const service = new HarvestService(
    plans,
    {
      async getById(id) {
        return id === vendor.id ? { ...vendor, status } : null;
      },
    },
    tracker,
  );
  return { service, events };
}

describe("harvest months", () => {
  it("lists the next 10 months including the current month", () => {
    const months = upcomingHarvestMonths(new Date("2026-09-21T00:00:00.000Z"));
    expect(months).toHaveLength(10);
    expect(months[0]).toMatchObject({ year: 2026, month: 9, label: "September 2026" });
    expect(months[4]).toMatchObject({ year: 2027, month: 1, label: "January 2027" });
  });

  it("parses a month name into this year or next year", () => {
    const from = new Date("2026-09-21T00:00:00.000Z");
    expect(parseHarvestMonth("October", from)?.label).toBe("October 2026");
    expect(parseHarvestMonth("April", from)?.label).toBe("April 2027");
    expect(parseHarvestMonth("April 2027", from)?.label).toBe("April 2027");
    expect(parseHarvestMonth("1", from)?.label).toBe("September 2026");
  });
});

describe("harvest plans", () => {
  it("saves an expected harvest against the vendor location", async () => {
    const { service, events } = createService();
    const { plan, created } = await service.create({
      vendorId: vendor.id,
      cropName: "Tomatoes",
      quantity: 200,
      unit: "kg",
      harvestYear: 2027,
      harvestMonth: 4,
      categoryId: "cat-produce",
    });

    expect(created).toBe(true);
    expect(plan.status).toBe("PLANNED");
    expect(plan.expected_on).toBe("2027-04-01");
    expect(plan.area).toBe("Mbare");
    expect(plan.city).toBe("Harare");
    expect(events).toContain("HARVEST_PLAN_CREATED");
  });

  it("cancels an open plan and rejects inactive vendors", async () => {
    const { service } = createService();
    const { plan } = await service.create({
      vendorId: vendor.id,
      cropName: "Rape",
      quantity: 40,
      unit: "bundle",
      harvestYear: 2026,
      harvestMonth: 10,
    });

    const cancelled = await service.cancel(plan.id, vendor.id);
    expect(cancelled.status).toBe("CANCELLED");
    await expect(service.cancel(plan.id, "other")).rejects.toMatchObject({
      code: "HARVEST_PLAN_FORBIDDEN",
    });

    const inactive = createService("SUSPENDED").service;
    await expect(
      inactive.create({
        vendorId: vendor.id,
        cropName: "Maize",
        quantity: 10,
        unit: "bag",
        harvestYear: 2027,
        harvestMonth: 5,
      }),
    ).rejects.toBeInstanceOf(CommerceError);
  });
});
