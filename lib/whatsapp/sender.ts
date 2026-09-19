import { isWhatsAppError } from "@/lib/whatsapp/errors";
import { logger } from "@/lib/utils/logger";
import type { MessageLogService } from "@/lib/services/message-log.service";
import type { EngineReply, WhatsAppClient } from "@/types/whatsapp";

export class WhatsAppSender {
  constructor(
    private readonly client: WhatsAppClient,
    private readonly logs: MessageLogService,
  ) {}

  async sendReplies(input: {
    to: string;
    phoneNumber: string;
    replies: EngineReply[];
    replyToMessageId?: string;
  }): Promise<void> {
    for (const reply of input.replies) {
      try {
        if (reply.kind === "text") {
          const result = await this.client.sendTextMessage(input.to, reply.text, {
            replyToMessageId: input.replyToMessageId,
          });
          await this.logs.logOutbound({
            externalMessageId: result.id,
            phoneNumber: input.phoneNumber,
            messageType: "text",
            messageText: reply.text,
            payload: { to: input.to, type: "text" },
          });
          continue;
        }

        const result = await this.client.sendInteractiveMessage(input.to, reply.message);
        await this.logs.logOutbound({
          externalMessageId: result.id,
          phoneNumber: input.phoneNumber,
          messageType: "interactive",
          messageText: reply.message.body,
          payload: { to: input.to, type: "interactive" },
        });
      } catch (error) {
        logger.error({
          operation: "whatsapp_send",
          result: "failed",
          error: isWhatsAppError(error) ? error.code : "unknown",
        });
        await this.logs.logOutbound({
          externalMessageId: null,
          phoneNumber: input.phoneNumber,
          messageType: reply.kind,
          messageText: reply.kind === "text" ? reply.text : reply.message.body,
          payload: { to: input.to, failed: true },
          status: "FAILED",
        });
      }
    }
  }

  async markRead(messageId: string): Promise<void> {
    try {
      await this.client.markMessageRead(messageId);
    } catch (error) {
      logger.warn({
        operation: "whatsapp_mark_read",
        result: "failed",
        error: isWhatsAppError(error) ? error.code : "unknown",
      });
    }
  }
}
