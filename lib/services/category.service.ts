import { CommerceError } from "@/lib/commerce/errors";
import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "@/lib/validation/commerce";
import type { Category } from "@/types/database";

export type CategoryStore = {
  listActive(): Promise<Category[]>;
  listAll(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  create(category: Category): Promise<Category>;
  update(id: string, patch: Partial<Category>): Promise<Category>;
  delete(id: string): Promise<Category>;
};

export class CategoryService {
  constructor(private readonly store: CategoryStore) {}

  async listActive(): Promise<Category[]> {
    return this.store.listActive();
  }

  async listAll(): Promise<Category[]> {
    return this.store.listAll();
  }

  async getById(id: string): Promise<Category | null> {
    return this.store.findById(id);
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const parsed = createCategorySchema.parse(input);
    const slug = await this.uniqueSlug(slugify(parsed.name));
    const existing = await this.store.listAll();
    const maxSort = existing.reduce((max, category) => Math.max(max, category.sort_order), 0);
    const now = new Date().toISOString();

    return this.store.create({
      id: crypto.randomUUID(),
      name: parsed.name,
      slug,
      parent_id: null,
      status: "ACTIVE",
      sort_order: parsed.sortOrder ?? maxSort + 10,
      created_at: now,
      updated_at: now,
    });
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const parsed = updateCategorySchema.parse(input);
    const current = await this.store.findById(id);
    if (!current) {
      throw new CommerceError("CATEGORY_NOT_FOUND", "Category not found");
    }

    const patch: Partial<Category> = {};
    if (parsed.name !== undefined) {
      patch.name = parsed.name;
      patch.slug = await this.uniqueSlug(slugify(parsed.name), id);
    }
    if (parsed.status !== undefined) {
      patch.status = parsed.status;
    }
    if (parsed.sortOrder !== undefined) {
      patch.sort_order = parsed.sortOrder;
    }

    return this.store.update(id, patch);
  }

  async delete(id: string): Promise<Category> {
    const current = await this.store.findById(id);
    if (!current) {
      throw new CommerceError("CATEGORY_NOT_FOUND", "Category not found");
    }
    return this.store.delete(id);
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let suffix = 2;
    while (suffix < 50) {
      const existing = await this.store.findBySlug(slug);
      if (!existing || existing.id === excludeId) {
        return slug;
      }
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    throw new CommerceError("CATEGORY_SLUG_FAILED", "Could not create a unique category slug.");
  }
}

export function slugifyCategoryName(name: string): string {
  return slugify(name);
}

export function createCategoryService(client: CommerceClient): CategoryService {
  const store: CategoryStore = {
    async listActive() {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .eq("status", "ACTIVE")
        .order("sort_order", { ascending: true });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async listAll() {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async findById(id) {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findBySlug(slug) {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async create(category) {
      const { data, error } = await client
        .from("categories")
        .insert(category)
        .select("*")
        .single();
      if (error) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("categories")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throwStoreError(error);
      return data;
    },
    async delete(id) {
      const { data, error } = await client
        .from("categories")
        .delete()
        .eq("id", id)
        .select("*")
        .single();
      if (error) throwStoreError(error);
      return data;
    },
  };

  return new CategoryService(store);
}

function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}
