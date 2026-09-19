import type { UserType } from "@/types/commerce";
import type { ConversationState, SessionContext } from "@/types/conversation";
import type { ConversationSession } from "@/types/database";
import type { EngineReply, WhatsAppInboundMessage } from "@/types/whatsapp";
import type { CategoryService } from "@/lib/services/category.service";
import type { ConversationService } from "@/lib/services/conversation.service";
import type { CustomerService } from "@/lib/services/customer.service";
import type { OrderService } from "@/lib/services/order.service";
import type { ProductService } from "@/lib/services/product.service";
import type { SupportService } from "@/lib/services/support.service";
import type { VendorService } from "@/lib/services/vendor.service";
import type { IntentInterpreter } from "@/lib/openai/intent";
import type { NormalizedInput } from "@/lib/conversation/input";

export type ConversationIdentity = {
  userType: UserType;
  userId: string | null;
};

export type ConversationEngineDeps = {
  conversations: ConversationService;
  vendors: VendorService;
  customers: CustomerService;
  products: ProductService;
  categories: CategoryService;
  orders: OrderService;
  support?: SupportService;
  intent?: IntentInterpreter;
};

export type EngineNotification = {
  waId: string;
  phoneNumber: string;
  replies: EngineReply[];
};

export type ConversationTurn = {
  message: WhatsAppInboundMessage;
  session: ConversationSession;
  identity: ConversationIdentity;
  context: SessionContext;
  input: NormalizedInput;
};

export type HandlerResult = {
  state: ConversationState;
  context: SessionContext;
  replies: EngineReply[];
  identity?: ConversationIdentity;
  notifications?: EngineNotification[];
};

export type ConversationHandler = (
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
) => Promise<HandlerResult>;
