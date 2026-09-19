import type { AnalyticsTracker } from "@/lib/services/analytics.types";
import { decrementInventory } from "@/lib/commerce/inventory";
import { parseDecimal } from "@/lib/commerce/money";
import { assertOrderTransition, isOrderStatus } from "@/lib/commerce/order-state";
import { CommerceError } from "@/lib/commerce/errors";
import type { IdempotencyStore } from "@/lib/services/idempotency";
import type { CustomerStore } from "@/lib/services/customer.service";
import type { OrderRecord, OrderStore } from "@/lib/services/order.service";
import type { ProductSearchHit, ProductStore } from "@/lib/services/product.service";
import type { VendorStore } from "@/lib/services/vendor.service";
import type { CategoryStore } from "@/lib/services/category.service";
import type { SupportStore } from "@/lib/services/support.service";
import type { Customer, Category, Product, SupportTicket, Vendor } from "@/types/database";
import type { OrderStatus, ProductStatus } from "@/types/commerce";

export function createMemoryIdempotencyStore(): IdempotencyStore {
  const rows = new Map<string, string>();

  return {
    async find(key, operation) {
      return rows.get(`${operation}:${key}`) ?? null;
    },
    async save(key, operation, _entityType, entityId) {
      rows.set(`${operation}:${key}`, entityId);
    },
  };
}

export function createMemoryVendorStore(seed: Vendor[] = []): VendorStore {
  const vendors = seed;
  let sequence = 1;

  return {
    async findById(id) {
      return vendors.find((vendor) => vendor.id === id) ?? null;
    },
    async findByWhatsapp(phone) {
      return vendors.find((vendor) => vendor.whatsapp_number === phone) ?? null;
    },
    async create(vendor) {
      if (vendors.some((row) => row.whatsapp_number === vendor.whatsapp_number)) {
        throw new CommerceError("STORE_ERROR", "duplicate whatsapp_number");
      }
      vendors.push(vendor);
      return vendor;
    },
    async update(id, patch) {
      const index = vendors.findIndex((vendor) => vendor.id === id);
      if (index === -1) {
        throw new CommerceError("VENDOR_NOT_FOUND", "Vendor not found");
      }
      vendors[index] = { ...vendors[index], ...patch, updated_at: new Date().toISOString() };
      return vendors[index];
    },
    async generateVendorCode(city) {
      const loc =
        city?.toLowerCase().includes("harare") || city?.toLowerCase().includes("mbare")
          ? "HRE"
          : "ZWE";
      return `PS-${loc}-${String(sequence++).padStart(6, "0")}`;
    },
  };
}

export function createMemoryCustomerStore(seed: Customer[] = []): CustomerStore {
  const customers = seed;

  return {
    async findById(id) {
      return customers.find((customer) => customer.id === id) ?? null;
    },
    async findByWhatsapp(phone) {
      return customers.find((customer) => customer.whatsapp_number === phone) ?? null;
    },
    async create(customer) {
      customers.push(customer);
      return customer;
    },
    async update(id, patch) {
      const index = customers.findIndex((customer) => customer.id === id);
      if (index === -1) {
        throw new CommerceError("CUSTOMER_NOT_FOUND", "Customer not found");
      }
      customers[index] = {
        ...customers[index],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      return customers[index];
    },
  };
}

export function createMemoryProductStore(input: {
  vendors: Vendor[];
  products?: Product[];
}): ProductStore {
  const vendors = input.vendors;
  const products = input.products ?? [];

  return {
    async findById(id) {
      return products.find((product) => product.id === id) ?? null;
    },
    async findVendor(vendorId) {
      return vendors.find((vendor) => vendor.id === vendorId) ?? null;
    },
    async listByVendor(vendorId) {
      return products.filter(
        (product) => product.vendor_id === vendorId && product.status !== "REMOVED",
      );
    },
    async create(product) {
      products.push(product);
      return product;
    },
    async update(id, patch) {
      const index = products.findIndex((product) => product.id === id);
      if (index === -1) {
        throw new CommerceError("PRODUCT_NOT_FOUND", "Product not found");
      }
      products[index] = {
        ...products[index],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      return products[index];
    },
    async search(filters) {
      return products
        .filter((product) => {
          const vendor = vendors.find((row) => row.id === product.vendor_id);
          if (!vendor || vendor.status !== "ACTIVE" || product.status !== "ACTIVE") {
            return false;
          }
          if (parseDecimal(product.quantity, "quantity") <= 0) {
            return false;
          }
          if (
            filters.query &&
            !product.name.toLowerCase().includes(filters.query.toLowerCase())
          ) {
            return false;
          }
          if (filters.categoryId && product.category_id !== filters.categoryId) {
            return false;
          }
          if (
            filters.area &&
            !(vendor.area ?? "").toLowerCase().includes(filters.area.toLowerCase())
          ) {
            return false;
          }
          return true;
        })
        .slice(0, filters.limit)
        .map((product) => {
          const vendor = vendors.find((row) => row.id === product.vendor_id)!;
          return {
            ...product,
            vendor: {
              id: vendor.id,
              vendor_code: vendor.vendor_code,
              business_name: vendor.business_name,
              area: vendor.area,
              city: vendor.city,
              status: vendor.status,
            },
            category: null,
          } satisfies ProductSearchHit;
        });
    },
  };
}

export function createMemoryOrderStore(input: {
  vendors: Vendor[];
  customers: Customer[];
  products: Product[];
  orders?: OrderRecord[];
}): OrderStore {
  const vendors = input.vendors;
  const customers = input.customers;
  const products = input.products;
  const orders = input.orders ?? [];
  let sequence = 18472;

  return {
    async findById(id) {
      const found = orders.find((order) => order.id === id);
      return found ? { ...found, items: [...found.items] } : null;
    },
    async findCustomer(id) {
      return customers.find((customer) => customer.id === id) ?? null;
    },
    async findProductWithVendor(productId) {
      const product = products.find((row) => row.id === productId);
      if (!product) return null;
      const vendor = vendors.find((row) => row.id === product.vendor_id);
      if (!vendor) return null;
      return { product, vendor };
    },
    async generateOrderNumber() {
      return `PS-${sequence++}`;
    },
    async create(order, items) {
      const record = { ...order, items };
      orders.push(record);
      return record;
    },
    async update(id, patch) {
      const index = orders.findIndex((order) => order.id === id);
      if (index === -1) {
        throw new CommerceError("ORDER_NOT_FOUND", "Order not found");
      }
      if (patch.status && patch.status !== orders[index].status) {
        if (!isOrderStatus(orders[index].status) || !isOrderStatus(patch.status)) {
          throw new CommerceError("INVALID_ORDER_STATUS", "Unknown order status");
        }
        assertOrderTransition(orders[index].status, patch.status);
      }
      orders[index] = {
        ...orders[index],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      return orders[index];
    },
    async completeAndDecrementStock(orderId) {
      const index = orders.findIndex((order) => order.id === orderId);
      if (index === -1) {
        throw new CommerceError("ORDER_NOT_FOUND", "Order not found");
      }
      const current = orders[index];
      if (current.status === "COMPLETED") {
        return current;
      }
      if (!isOrderStatus(current.status)) {
        throw new CommerceError("INVALID_ORDER_STATUS", "Unknown order status");
      }
      assertOrderTransition(current.status, "COMPLETED");

      for (const item of current.items) {
        if (!item.product_id) continue;
        const productIndex = products.findIndex((product) => product.id === item.product_id);
        if (productIndex === -1) {
          throw new CommerceError("PRODUCT_NOT_FOUND", "Product not found");
        }
        const product = products[productIndex];
        const result = decrementInventory(
          parseDecimal(product.quantity, "quantity"),
          parseDecimal(item.quantity, "quantity"),
          product.status as ProductStatus,
        );
        products[productIndex] = {
          ...product,
          quantity: result.remaining.toString(),
          status: result.status,
        };
      }

      orders[index] = {
        ...current,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return orders[index];
    },
    async listActionableByVendor(vendorId) {
      return orders.filter(
        (order) => order.vendor_id === vendorId && order.status === "PENDING_VENDOR",
      );
    },
    async listByVendor(vendorId, statuses) {
      return orders.filter((order) => {
        if (order.vendor_id !== vendorId) {
          return false;
        }
        if (!statuses || statuses.length === 0) {
          return true;
        }
        return statuses.includes(order.status as OrderStatus);
      });
    },
    async listByCustomer(customerId) {
      return orders.filter((order) => order.customer_id === customerId);
    },
  };
}

export function trackedAnalytics() {
  const events: string[] = [];
  const tracker: AnalyticsTracker = {
    async track(input) {
      events.push(input.eventName);
    },
  };
  return { events, tracker };
}

export function createMemoryCategoryStore(seed: Category[] = []): CategoryStore {
  const categories = seed;

  return {
    async listActive() {
      return categories
        .filter((category) => category.status === "ACTIVE")
        .slice()
        .sort((left, right) => left.sort_order - right.sort_order);
    },
    async findById(id) {
      return categories.find((category) => category.id === id) ?? null;
    },
  };
}

export function createMemorySupportStore(seed: SupportTicket[] = []): SupportStore {
  const tickets = seed;

  return {
    async findById(id) {
      return tickets.find((ticket) => ticket.id === id) ?? null;
    },
    async findOpenByPhone(phone) {
      return (
        tickets
          .filter((ticket) => ticket.phone_number === phone && ticket.status === "OPEN")
          .sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null
      );
    },
    async list(filters) {
      return tickets
        .filter((ticket) => {
          if (filters?.status && ticket.status !== filters.status) return false;
          if (filters?.userId && ticket.user_id !== filters.userId) return false;
          return true;
        })
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(0, filters?.limit ?? 100);
    },
    async create(ticket) {
      tickets.push(ticket);
      return ticket;
    },
    async update(id, patch) {
      const index = tickets.findIndex((ticket) => ticket.id === id);
      if (index === -1) {
        throw new CommerceError("STORE_ERROR", "Support ticket not found");
      }
      tickets[index] = { ...tickets[index], ...patch, updated_at: new Date().toISOString() };
      return tickets[index]!;
    },
  };
}
