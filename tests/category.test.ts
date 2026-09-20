import { describe, expect, it } from "vitest";
import { CategoryService, slugifyCategoryName } from "@/lib/services/category.service";
import { createMemoryCategoryStore } from "./helpers/memory";
import { testCategory } from "./helpers/conversation";

describe("category service", () => {
  it("stores new categories with a slug and hides inactive rows from WhatsApp lists", async () => {
    const seed = [testCategory()];
    const service = new CategoryService(createMemoryCategoryStore(seed));

    const created = await service.create({ name: "Hardware" });
    expect(created.slug).toBe("hardware");
    expect(created.status).toBe("ACTIVE");
    expect(slugifyCategoryName("Mobile Accessories")).toBe("mobile-accessories");

    await service.update(created.id, { status: "INACTIVE" });
    const active = await service.listActive();
    expect(active.map((category) => category.name)).toEqual(["Fresh Produce"]);

    const all = await service.listAll();
    expect(all).toHaveLength(2);
  });

  it("deletes a category from the catalog", async () => {
    const service = new CategoryService(createMemoryCategoryStore([testCategory()]));
    const removed = await service.delete("cat-produce");
    expect(removed.id).toBe("cat-produce");
    expect(await service.listAll()).toEqual([]);
  });

  it("keeps slugs unique when two categories share a name", async () => {
    const service = new CategoryService(createMemoryCategoryStore());
    const first = await service.create({ name: "Other" });
    const second = await service.create({ name: "Other" });
    expect(first.slug).toBe("other");
    expect(second.slug).toBe("other-2");
  });
});
