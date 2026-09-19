import type { ConversationService } from "@/lib/services/conversation.service";
import type { CustomerService } from "@/lib/services/customer.service";
import type { VendorService } from "@/lib/services/vendor.service";
import type { ConversationSession } from "@/types/database";
import type { UserType } from "@/types/commerce";
import type { EngineReply, WhatsAppInboundMessage } from "@/types/whatsapp";

export type ConversationIdentity = {
  userType: UserType;
  userId: string | null;
};

export type ConversationEngineResult = {
  session: ConversationSession;
  identity: ConversationIdentity;
  replies: EngineReply[];
};

const PHASE_3_TEXT = `Welcome to PaySell 👋

We've received your message. Buying and selling through WhatsApp is coming online next.`;

const UNSUPPORTED_TEXT =
  "I can only read text messages right now. Please send your request as text.";

export class ConversationEngine {
  constructor(
    private readonly conversations: ConversationService,
    private readonly vendors: VendorService,
    private readonly customers: CustomerService,
  ) {}

  async handle(message: WhatsAppInboundMessage): Promise<ConversationEngineResult> {
    const identity = await this.identify(message.phoneNumber);
    const session = await this.conversations.getOrCreateActive({
      phoneNumber: message.phoneNumber,
      userType: identity.userType,
      userId: identity.userId,
    });

    if (!message.supported) {
      return {
        session,
        identity,
        replies: [{ kind: "text", text: UNSUPPORTED_TEXT }],
      };
    }

    return {
      session,
      identity,
      replies: [{ kind: "text", text: PHASE_3_TEXT }],
    };
  }

  private async identify(phoneNumber: string): Promise<ConversationIdentity> {
    const vendor = await this.vendors.getByWhatsapp(phoneNumber);
    if (vendor) {
      return { userType: "VENDOR", userId: vendor.id };
    }

    const customer = await this.customers.getByWhatsapp(phoneNumber);
    if (customer) {
      return { userType: "CUSTOMER", userId: customer.id };
    }

    return { userType: "UNKNOWN", userId: null };
  }
}
