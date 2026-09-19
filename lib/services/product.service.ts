import { CommerceError } from "@/lib/commerce/errors";
import { moneyString, parseDecimal, quantityString, toMoney, toQuantity } from "@/lib/commerce/money";
import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { silentAnalytics } from "@/lib/services/analytics.types";
import {
  createIdempotencyStore,
  throwStoreError,
  type IdempotencyStore,
} from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import {
  createProductDraftSchema,
  searchProductsSchema,
  type CreateProductDraftInput,
  type SearchProductsInput,
} from "@/lib/validation/commerce";
import type { Product, Vendor } from "@/types/database";

export type ProductSearchHit = Product & {
  vendor: Pick<Vendor, "id" | "vendor_code" | "business_name" | "area" | "city" | "status">;
  category: { id: string; name: string; slug: string } | null;
};

export type ProductStore = {
  findById(id: string): Promise<Product | null>;
  findVendor(vendorId: string): Promise<Vendor | null>;
  listByVendor(vendorId: string): Promise<Product[]>;
  create(product: Product): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
  search(input: {
    query?: string;
    categoryId?: string;
    area?: string;
    limit: number;
  }): Promise<ProductSearchHit[]>;
};

const CREATE_OPERATION = "CREATE_PRODUCT";

export class ProductService {
  constructor(
    private readonly store: ProductStore,
    private readonly analytics: AnalyticsTracker = silentAnalytics,
    private readonly idempotency?: IdempotencyStore,
  ) {}

  async createDraft(input: CreateProductDraftInput): Promise<{ product: Product; created: boolean }> {
    const parsed = createProductDraftSchema.parse(input);

    if (parsed.idempotencyKey && this.idempotency) {
      const existingId = await this.idempotency.find(
        parsed.idempotencyKey,
        CREATE_OPERATION,
      );
      if (existingId) {
        return { product: await this.requireProduct(existingId), created: false };
      }
    }

    const vendor = await this.store.findVendor(parsed.vendorId);
    if (!vendor) {
      throw new CommerceError("VENDOR_NOT_FOUND", "Vendor not found");
    }

    const now = new Date().toISOString();
    const product = await this.store.create({
      id: crypto.randomUUID(),
      vendor_id: parsed.vendorId,
      category_id: parsed.categoryId ?? vendor.primary_category_id,
      name: parsed.name,
      description: parsed.description ?? null,
      price: moneyString(parsed.price),
      currency: parsed.currency,
      quantity: quantityString(parsed.quantity),
      unit: parsed.unit,
      image_url: parsed.imageUrl ?? null,
      status: "DRAFT",
      created_at: now,
      updated_at: now,
    });

    if (parsed.idempotencyKey && this.idempotency) {
      await this.idempotency.save(
        parsed.idempotencyKey,
        CREATE_OPERATION,
        "products",
        product.id,
      );
    }

    await this.analytics.track({
      eventName: "PRODUCT_CREATED",
      userType: "VENDOR",
      userId: vendor.id,
      metadata: { productId: product.id, status: "DRAFT" },
    });

    return { product, created: true };
  }

  async publish(productId: string): Promise<Product> {
    const product = await this.requireProduct(productId);

    if (product.status === "ACTIVE") {
      return product;
    }

    if (product.status === "REMOVED") {
      throw new CommerceError("PRODUCT_REMOVED", "Removed products cannot be published");
    }

    const vendor = await this.store.findVendor(product.vendor_id);
    if (!vendor || vendor.status !== "ACTIVE") {
      throw new CommerceError("VENDOR_INACTIVE", "The vendor must be active before publishing");
    }

    if (!product.name.trim()) {
      throw new CommerceError("PRODUCT_INVALID", "Product name is required");
    }

    if (parseDecimal(product.price, "price") <= 0) {
      throw new CommerceError("PRODUCT_INVALID", "Product price must be greater than 0");
    }

    if (parseDecimal(product.quantity, "quantity") <= 0) {
      throw new CommerceError("PRODUCT_INVALID", "Product quantity must be greater than 0");
    }

    return this.store.update(productId, { status: "ACTIVE" });
  }

  async pause(productId: string): Promise<Product> {
    const product = await this.requireProduct(productId);
    if (product.status === "REMOVED") {
      throw new CommerceError("PRODUCT_REMOVED", "Removed products cannot be paused");
    }
    return this.store.update(productId, { status: "PAUSED" });
  }

  async reactivate(productId: string): Promise<Product> {
    const product = await this.requireProduct(productId);
    if (product.status === "REMOVED") {
      throw new CommerceError("PRODUCT_REMOVED", "Removed products cannot be reactivated");
    }
    const quantity = parseDecimal(product.quantity, "quantity");
    return this.store.update(productId, {
      status: quantity > 0 ? "ACTIVE" : "OUT_OF_STOCK",
    });
  }

  async remove(productId: string): Promise<Product> {
    await this.requireProduct(productId);
    return this.store.update(productId, { status: "REMOVED" });
  }

  async listByVendor(vendorId: string): Promise<Product[]> {
    return this.store.listByVendor(vendorId);
  }

  async getById(productId: string): Promise<Product | null> {
    return this.store.findById(productId);
  }

  async search(input: SearchProductsInput): Promise<ProductSearchHit[]> {
    const parsed = searchProductsSchema.parse(input);
    const results = await this.store.search({
      query: parsed.query,
      categoryId: parsed.categoryId,
      area: parsed.area,
      limit: parsed.limit,
    });

    await this.analytics.track({
      eventName: "PRODUCT_SEARCHED",
      userType: "CUSTOMER",
      metadata: {
        query: parsed.query ?? null,
        categoryId: parsed.categoryId ?? null,
        area: parsed.area ?? null,
        resultCount: results.length,
      },
    });

    return results;
  }

  async requireSellable(productId: string): Promise<{ product: Product; vendor: Vendor }> {
    const product = await this.requireProduct(productId);
    if (product.status !== "ACTIVE") {
      throw new CommerceError("PRODUCT_NOT_AVAILABLE", "This product is not available");
    }

    const vendor = await this.store.findVendor(product.vendor_id);
    if (!vendor || vendor.status !== "ACTIVE") {
      throw new CommerceError("VENDOR_INACTIVE", "This vendor is not active");
    }

    return { product, vendor };
  }

  private async requireProduct(productId: string): Promise<Product> {
    const product = await this.store.findById(productId);
    if (!product) {
      throw new CommerceError("PRODUCT_NOT_FOUND", "Product not found");
    }
    return product;
  }
}

export function createProductService(
  client: CommerceClient,
  analytics: AnalyticsTracker = silentAnalytics,
): ProductService {
  const store: ProductStore = {
    async findById(id) {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async findVendor(vendorId) {
      const { data, error } = await client
        .from("vendors")
        .select("*")
        .eq("id", vendorId)
        .maybeSingle();
      if (error) throwStoreError(error);
      return data;
    },
    async listByVendor(vendorId) {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("vendor_id", vendorId)
        .neq("status", "REMOVED")
        .order("updated_at", { ascending: false });
      if (error) throwStoreError(error);
      return data ?? [];
    },
    async create(product) {
      const { data, error } = await client
        .from("products")
        .insert(product)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async update(id, patch) {
      const { data, error } = await client
        .from("products")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error || !data) throwStoreError(error);
      return data;
    },
    async search(input) {
      let query = client
        .from("products")
        .select("*")
        .eq("status", "ACTIVE")
        .gt("quantity", 0);

      if (input.query) {
        query = query.ilike("name", `%${input.query}%`);
      }
      if (input.categoryId) {
        query = query.eq("category_id", input.categoryId);
      }

      const { data: productRows, error } = await query
        .order("updated_at", { ascending: false })
        .limit(Math.max(input.limit * 3, input.limit));

      if (error) throwStoreError(error);
      if (!productRows?.length) return [];

      const vendorIds = [...new Set(productRows.map((row) => row.vendor_id))];
      const { data: vendorRows, error: vendorError } = await client
        .from("vendors")
        .select("id, vendor_code, business_name, area, city, status")
        .in("id", vendorIds)
        .eq("status", "ACTIVE");
      if (vendorError) throwStoreError(vendorError);

      const vendorsById = new Map((vendorRows ?? []).map((vendor) => [vendor.id, vendor]));
      const categoryIds = [
        ...new Set(
          productRows
            .map((row) => row.category_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const categoriesById = new Map<string, { id: string; name: string; slug: string }>();
      if (categoryIds.length > 0) {
        const { data: categoryRows, error: categoryError } = await client
          .from("categories")
          .select("id, name, slug")
          .in("id", categoryIds);
        if (categoryError) throwStoreError(categoryError);
        for (const category of categoryRows ?? []) {
          categoriesById.set(category.id, category);
        }
      }

      return productRows
        .map((product) => {
          const vendor = vendorsById.get(product.vendor_id);
          if (!vendor) return null;
          if (
            input.area &&
            !(vendor.area ?? "").toLowerCase().includes(input.area.toLowerCase())
          ) {
            return null;
          }
          return {
            ...product,
            vendor,
            category: product.category_id
              ? (categoriesById.get(product.category_id) ?? null)
              : null,
          };
        })
        .filter((row): row is ProductSearchHit => row !== null)
        .slice(0, input.limit);
    },
  };

  return new ProductService(store, analytics, createIdempotencyStore(client));
}

export function parseProductNumbers(product: Product): {
  price: number;
  quantity: number;
} {
  return {
    price: toMoney(parseDecimal(product.price, "price")),
    quantity: toQuantity(parseDecimal(product.quantity, "quantity")),
  };
}
