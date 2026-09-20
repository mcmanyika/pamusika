import { describe, expect, it } from "vitest";
import { VendorService } from "@/lib/services/vendor.service";
import { CustomerService } from "@/lib/services/customer.service";
import {
  createMemoryCustomerStore,
  createMemoryIdempotencyStore,
  createMemoryVendorStore,
  trackedAnalytics,
} from "./helpers/memory";

describe("vendor registration", () => {
  it("creates a pending vendor with a human-readable code", async () => {
    const { events, tracker } = trackedAnalytics();
    const service = new VendorService(
      createMemoryVendorStore(),
      tracker,
      createMemoryIdempotencyStore(),
    );

    const { vendor, created } = await service.register({
      whatsappNumber: "0771234567",
      firstName: "Tariro",
      businessName: "Tariro Fresh Produce",
      city: "Harare",
      area: "Mbare",
    });

    expect(created).toBe(true);
    expect(vendor.status).toBe("PENDING");
    expect(vendor.verification_status).toBe("UNVERIFIED");
    expect(vendor.vendor_code).toMatch(/^PS-HRE-\d{6}$/);
    expect(vendor.whatsapp_number).toBe("+263771234567");
    expect(events).toContain("VENDOR_REGISTRATION_STARTED");

    const confirmed = await service.confirm(vendor.id);
    expect(confirmed.status).toBe("ACTIVE");
    expect(events).toContain("VENDOR_REGISTERED");
  });

  it("notifies staff when a vendor membership is suspended or reactivated", async () => {
    const { events, tracker } = trackedAnalytics();
    const service = new VendorService(
      createMemoryVendorStore(),
      tracker,
      createMemoryIdempotencyStore(),
    );
    const { vendor } = await service.register({
      whatsappNumber: "+263771234567",
      firstName: "Tariro",
      businessName: "Tariro Fresh Produce",
    });
    await service.confirm(vendor.id);
    await service.setStatus(vendor.id, "SUSPENDED");
    await service.setStatus(vendor.id, "ACTIVE");
    expect(events).toContain("VENDOR_SUSPENDED");
    expect(events).toContain("VENDOR_ACTIVATED");
  });

  it("lets staff verify or reject a vendor", async () => {
    const service = new VendorService(
      createMemoryVendorStore(),
      trackedAnalytics().tracker,
      createMemoryIdempotencyStore(),
    );
    const { vendor } = await service.register({
      whatsappNumber: "+263771234567",
      firstName: "Tariro",
      businessName: "Tariro Fresh Produce",
    });

    const verified = await service.setVerification(vendor.id, "VERIFIED");
    expect(verified.verification_status).toBe("VERIFIED");

    const rejected = await service.setVerification(vendor.id, "REJECTED");
    expect(rejected.verification_status).toBe("REJECTED");
  });

  it("is idempotent for the same WhatsApp number", async () => {
    const service = new VendorService(
      createMemoryVendorStore(),
      trackedAnalytics().tracker,
      createMemoryIdempotencyStore(),
    );

    const first = await service.register({
      whatsappNumber: "+263771234567",
      firstName: "Tariro",
      businessName: "Tariro Fresh Produce",
      city: "Harare",
      idempotencyKey: "vendor-register-1",
    });
    const second = await service.register({
      whatsappNumber: "0771234567",
      firstName: "Tariro",
      businessName: "Tariro Fresh Produce",
      city: "Harare",
      idempotencyKey: "vendor-register-1",
    });

    expect(second.created).toBe(false);
    expect(second.vendor.id).toBe(first.vendor.id);
  });
});

describe("customer onboarding", () => {
  it("creates a lightweight customer and reuses the same number", async () => {
    const { events, tracker } = trackedAnalytics();
    const service = new CustomerService(createMemoryCustomerStore(), tracker);

    const first = await service.getOrCreate({
      whatsappNumber: "0770001111",
      displayName: "Chipo",
      area: "Mbare",
    });
    const second = await service.getOrCreate({
      whatsappNumber: "+263770001111",
      displayName: "Chipo",
    });

    expect(first.created).toBe(true);
    expect(first.customer.verification_status).toBe("UNVERIFIED");
    expect(first.customer.status).toBe("ACTIVE");
    expect(second.created).toBe(false);
    expect(second.customer.id).toBe(first.customer.id);
    expect(second.customer.area).toBe("Mbare");
    expect(events).toEqual(["CUSTOMER_CREATED"]);
  });

  it("stores multiple delivery addresses and keeps one default", async () => {
    const service = new CustomerService(createMemoryCustomerStore());
    const { customer } = await service.getOrCreate({
      whatsappNumber: "+263770001111",
      displayName: "Chipo",
    });

    const home = await service.addAddress({
      customerId: customer.id,
      label: "Home",
      line1: "Stand 14, Mbare Musika",
      city: "Harare",
      area: "Mbare",
    });
    const work = await service.addAddress({
      customerId: customer.id,
      label: "Work",
      line1: "Joina City",
      city: "Harare",
      area: "CBD",
    });

    expect(home.is_default).toBe(true);
    expect(work.is_default).toBe(false);
    expect(await service.listAddresses(customer.id)).toHaveLength(2);

    const updated = await service.setDefaultAddress(customer.id, work.id);
    const listed = await service.listAddresses(customer.id);
    expect(updated.is_default).toBe(true);
    expect(listed.find((address) => address.id === home.id)?.is_default).toBe(false);
    expect(listed.find((address) => address.id === work.id)?.is_default).toBe(true);
  });

  it("lets staff verify or reject a buyer", async () => {
    const service = new CustomerService(createMemoryCustomerStore());
    const { customer } = await service.getOrCreate({
      whatsappNumber: "+263770001111",
      displayName: "Chipo",
    });

    const verified = await service.setVerification(customer.id, "VERIFIED");
    expect(verified.verification_status).toBe("VERIFIED");

    const rejected = await service.setVerification(customer.id, "REJECTED");
    expect(rejected.verification_status).toBe("REJECTED");
  });

  it("lets staff suspend or reactivate a buyer", async () => {
    const { events, tracker } = trackedAnalytics();
    const service = new CustomerService(createMemoryCustomerStore(), tracker);
    const { customer } = await service.getOrCreate({
      whatsappNumber: "+263770001111",
      displayName: "Chipo",
    });

    const suspended = await service.setStatus(customer.id, "SUSPENDED");
    expect(suspended.status).toBe("SUSPENDED");
    const activated = await service.setStatus(customer.id, "ACTIVE");
    expect(activated.status).toBe("ACTIVE");
    expect(events).toEqual(["CUSTOMER_CREATED", "CUSTOMER_SUSPENDED", "CUSTOMER_ACTIVATED"]);
  });
});
