import { throwStoreError } from "@/lib/services/idempotency";
import type { CommerceClient } from "@/lib/supabase/database";
import type { OrderStatus, ProductStatus, TicketStatus, VendorStatus } from "@/types/commerce";
import type {
  AnalyticsEvent,
  Category,
  Customer,
  Order,
  OrderItem,
  Product,
  SupportTicket,
  Vendor,
} from "@/types/database";

export type VendorListRow = Vendor & {
  categoryName: string | null;
  productCount: number;
  orderCount: number;
};

export type ProductListRow = Product & {
  vendorName: string | null;
  vendorArea: string | null;
  categoryName: string | null;
};

export type OrderListRow = Order & {
  items: OrderItem[];
  customerName: string | null;
  vendorName: string | null;
};

export type VendorFilters = {
  q?: string;
  status?: VendorStatus;
  categoryId?: string;
  area?: string;
  verification?: string;
};

export type ProductFilters = {
  q?: string;
  status?: ProductStatus;
};

export type OrderFilters = {
  q?: string;
  status?: OrderStatus;
};

async function allVendors(client: CommerceClient): Promise<Vendor[]> {
  const { data, error } = await client
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throwStoreError(error);
  return data ?? [];
}

async function allProducts(client: CommerceClient): Promise<Product[]> {
  const { data, error } = await client
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throwStoreError(error);
  return data ?? [];
}

async function allOrders(client: CommerceClient): Promise<Order[]> {
  const { data, error } = await client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throwStoreError(error);
  return data ?? [];
}

async function allCustomers(client: CommerceClient): Promise<Customer[]> {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throwStoreError(error);
  return data ?? [];
}

async function allCategories(client: CommerceClient): Promise<Category[]> {
  const { data, error } = await client
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throwStoreError(error);
  return data ?? [];
}

async function allTickets(client: CommerceClient): Promise<SupportTicket[]> {
  const { data, error } = await client
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throwStoreError(error);
  return data ?? [];
}

async function allEvents(client: CommerceClient): Promise<AnalyticsEvent[]> {
  const { data, error } = await client
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throwStoreError(error);
  return data ?? [];
}

async function itemsForOrders(client: CommerceClient, orderIds: string[]): Promise<OrderItem[]> {
  if (orderIds.length === 0) {
    return [];
  }
  const { data, error } = await client.from("order_items").select("*").in("order_id", orderIds);
  if (error) throwStoreError(error);
  return data ?? [];
}

function matchesQuery(haystack: Array<string | null | undefined>, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return haystack.some((value) => (value ?? "").toLowerCase().includes(needle));
}

export async function loadVendors(
  client: CommerceClient,
  filters: VendorFilters = {},
): Promise<{ rows: VendorListRow[]; categories: Category[] }> {
  const [vendors, products, orders, categories] = await Promise.all([
    allVendors(client),
    allProducts(client),
    allOrders(client),
    allCategories(client),
  ]);
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const productCount = countBy(products.filter((product) => product.status !== "REMOVED"), "vendor_id");
  const orderCount = countBy(orders, "vendor_id");

  const rows = vendors
    .filter((vendor) => {
      if (filters.status && vendor.status !== filters.status) return false;
      if (filters.categoryId && vendor.primary_category_id !== filters.categoryId) return false;
      if (filters.verification && vendor.verification_status !== filters.verification) return false;
      if (filters.area && !(vendor.area ?? "").toLowerCase().includes(filters.area.toLowerCase())) {
        return false;
      }
      return matchesQuery(
        [vendor.vendor_code, vendor.business_name, vendor.first_name, vendor.last_name, vendor.whatsapp_number],
        filters.q ?? "",
      );
    })
    .map((vendor) => ({
      ...vendor,
      categoryName: vendor.primary_category_id
        ? categoryName.get(vendor.primary_category_id) ?? null
        : null,
      productCount: productCount.get(vendor.id) ?? 0,
      orderCount: orderCount.get(vendor.id) ?? 0,
    }));

  return { rows, categories };
}

export async function loadProducts(
  client: CommerceClient,
  filters: ProductFilters = {},
): Promise<ProductListRow[]> {
  const [products, vendors, categories] = await Promise.all([
    allProducts(client),
    allVendors(client),
    allCategories(client),
  ]);
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));

  return products
    .filter((product) => {
      if (filters.status) return product.status === filters.status;
      return product.status !== "REMOVED";
    })
    .filter((product) => {
      const vendor = vendorById.get(product.vendor_id);
      return matchesQuery([product.name, vendor?.business_name, vendor?.vendor_code], filters.q ?? "");
    })
    .map((product) => {
      const vendor = vendorById.get(product.vendor_id);
      return {
        ...product,
        vendorName: vendor?.business_name ?? null,
        vendorArea: vendor?.area ?? null,
        categoryName: product.category_id ? categoryName.get(product.category_id) ?? null : null,
      };
    });
}

export async function loadOrders(
  client: CommerceClient,
  filters: OrderFilters = {},
): Promise<OrderListRow[]> {
  const [orders, vendors, customers] = await Promise.all([
    allOrders(client),
    allVendors(client),
    allCustomers(client),
  ]);
  const filtered = orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    const vendor = vendors.find((row) => row.id === order.vendor_id);
    const customer = customers.find((row) => row.id === order.customer_id);
    return matchesQuery(
      [order.order_number, vendor?.business_name, customer?.display_name],
      filters.q ?? "",
    );
  });
  const items = await itemsForOrders(
    client,
    filtered.map((order) => order.id),
  );
  const itemsByOrder = groupBy(items, "order_id");
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  return filtered.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
    vendorName: vendorById.get(order.vendor_id)?.business_name ?? null,
    customerName: customerById.get(order.customer_id)?.display_name ?? null,
  }));
}

export async function loadCustomers(client: CommerceClient): Promise<Customer[]> {
  return allCustomers(client);
}

export async function loadTickets(
  client: CommerceClient,
  status?: TicketStatus,
): Promise<SupportTicket[]> {
  const tickets = await allTickets(client);
  return status ? tickets.filter((ticket) => ticket.status === status) : tickets;
}

export async function loadOverviewData(client: CommerceClient) {
  const [vendors, products, orders, tickets] = await Promise.all([
    allVendors(client),
    allProducts(client),
    allOrders(client),
    allTickets(client),
  ]);
  const recentOrders = await loadOrders(client, {});
  return { vendors, products, orders, tickets, recentOrders };
}

export async function loadAnalyticsData(client: CommerceClient) {
  const [vendors, products, orders, events] = await Promise.all([
    allVendors(client),
    allProducts(client),
    allOrders(client),
    allEvents(client),
  ]);
  return { vendors, products, orders, events };
}

export async function loadVendorDetail(client: CommerceClient, vendorId: string) {
  const { data: vendor, error } = await client
    .from("vendors")
    .select("*")
    .eq("id", vendorId)
    .maybeSingle();
  if (error) throwStoreError(error);
  if (!vendor) {
    return null;
  }

  const [products, orders, tickets, events, categories] = await Promise.all([
    allProducts(client),
    loadOrders(client, {}),
    allTickets(client),
    allEvents(client),
    allCategories(client),
  ]);

  return {
    vendor,
    categoryName: vendor.primary_category_id
      ? categories.find((category) => category.id === vendor.primary_category_id)?.name ?? null
      : null,
    products: products.filter((product) => product.vendor_id === vendorId),
    orders: orders.filter((order) => order.vendor_id === vendorId),
    tickets: tickets.filter((ticket) => ticket.user_id === vendorId),
    events: events.filter((event) => event.user_id === vendorId).slice(0, 20),
  };
}

function countBy<T>(rows: T[], key: keyof T): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = String(row[key] ?? "");
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function groupBy<T>(rows: T[], key: keyof T): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const id = String(row[key] ?? "");
    const current = grouped.get(id) ?? [];
    current.push(row);
    grouped.set(id, current);
  }
  return grouped;
}
