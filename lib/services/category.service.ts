import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import type { Category } from "@/types/database";

export type CategoryStore = {
  listActive(): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
};

export class CategoryService {
  constructor(private readonly store: CategoryStore) {}

  async listActive(): Promise<Category[]> {
    return this.store.listActive();
  }

  async getById(id: string): Promise<Category | null> {
    return this.store.findById(id);
  }
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
    async findById(id) {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
  };

  return new CategoryService(store);
}
