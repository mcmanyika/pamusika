import { ConversationEngine } from "@/lib/conversation/engine";
import { CategoryService } from "@/lib/services/category.service";
import { ConversationService } from "@/lib/services/conversation.service";
import { CustomerService } from "@/lib/services/customer.service";
import { OrderService } from "@/lib/services/order.service";
import { ProductService } from "@/lib/services/product.service";
import { SupportService } from "@/lib/services/support.service";
import { ReferralService } from "@/lib/services/referral.service";
import { VendorService } from "@/lib/services/vendor.service";
import type { ConversationEngineDeps } from "@/lib/conversation/handlers/types";
import type { OrderRecord } from "@/lib/services/order.service";
import type {
  Category,
  Customer,
  CustomerAddress,
  Product,
  Referral,
  ReferralCode,
  SupportTicket,
  Vendor,
} from "@/types/database";
import type { WhatsAppInboundMessage } from "@/types/whatsapp";
import {
  createMemoryCategoryStore,
  createMemoryCustomerStore,
  createMemoryReferralOwners,
  createMemoryReferralStore,
  createMemoryIdempotencyStore,
  createMemoryOrderStore,
  createMemoryProductStore,
  createMemorySupportStore,
  createMemoryVendorStore,
} from "./memory";
import { createMemoryConversationStore } from "./whatsapp-memory";

export function testCategory(id = "cat-produce", name = "Fresh Produce"): Category {
  const now = new Date().toISOString();
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    parent_id: null,
    status: "ACTIVE",
    sort_order: 10,
    created_at: now,
    updated_at: now,
  };
}

export function inbound(
  text: string | null,
  options: Partial<WhatsAppInboundMessage> = {},
): WhatsAppInboundMessage {
  const from = options.waId ?? "263771234567";
  return {
    externalMessageId: options.externalMessageId ?? crypto.randomUUID(),
    waId: from,
    phoneNumber: options.phoneNumber ?? "+263771234567",
    timestamp: options.timestamp ?? "1690000000",
    type: options.type ?? "text",
    text,
    choiceId: options.choiceId ?? null,
    supported: options.supported ?? true,
    mediaId: options.mediaId ?? null,
    contactName: options.contactName ?? null,
  };
}

export function createConversationHarness(options?: {
  intent?: ConversationEngineDeps["intent"];
}) {
  const vendors: Vendor[] = [];
  const products: Product[] = [];
  const customers: Customer[] = [];
  const addresses: CustomerAddress[] = [];
  const referralCodes: ReferralCode[] = [];
  const referrals: Referral[] = [];
  const orders: OrderRecord[] = [];
  const tickets: SupportTicket[] = [];
  const categories = [testCategory(), testCategory("cat-other", "Other")];
  categories[1]!.sort_order = 20;

  const engine = new ConversationEngine({
    conversations: new ConversationService(createMemoryConversationStore()),
    vendors: new VendorService(
      createMemoryVendorStore(vendors),
      { async track() {} },
      createMemoryIdempotencyStore(),
    ),
    customers: new CustomerService(createMemoryCustomerStore(customers, addresses)),
    products: new ProductService(
      createMemoryProductStore({ vendors, products }),
      { async track() {} },
      createMemoryIdempotencyStore(),
    ),
    categories: new CategoryService(createMemoryCategoryStore(categories)),
    orders: new OrderService(
      createMemoryOrderStore({ vendors, customers, products, orders }),
      { async track() {} },
      createMemoryIdempotencyStore(),
    ),
    support: new SupportService(createMemorySupportStore(tickets), { async track() {} }),
    referrals: new ReferralService(
      createMemoryReferralStore(referralCodes, referrals),
      createMemoryReferralOwners(customers, vendors),
    ),
    intent: options?.intent,
  });

  return {
    engine,
    vendors,
    products,
    customers,
    addresses,
    referralCodes,
    referrals,
    orders,
    categories,
    tickets,
  };
}
