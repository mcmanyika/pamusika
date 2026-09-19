import type { ConversationEngine } from "@/lib/conversation/engine";
import { logger } from "@/lib/utils/logger";
import { parseWebhookPayload, sanitizeInboundPayload } from "@/lib/whatsapp/parser";
import type { MessageLogService } from "@/lib/services/message-log.service";
import type { WhatsAppSender } from "@/lib/whatsapp/sender";
import type { WhatsAppInboundMessage } from "@/types/whatsapp";

export type InboundProcessorDeps = {
  engine: ConversationEngine;
  logs: MessageLogService;
  sender: WhatsAppSender;
};

export async function processInboundPayload(
  payload: unknown,
  deps: InboundProcessorDeps,
): Promise<{ processed: number; duplicates: number; ignored: number }> {
  const parsed = parseWebhookPayload(payload);
  let processed = 0;
  let duplicates = 0;

  for (const message of parsed.messages) {
    const result = await processOneMessage(message, deps);
    if (result === "duplicate") {
      duplicates += 1;
    } else {
      processed += 1;
    }
  }

  return { processed, duplicates, ignored: parsed.ignored };
}

async function processOneMessage(
  message: WhatsAppInboundMessage,
  deps: InboundProcessorDeps,
): Promise<"processed" | "duplicate"> {
  const claimed = await deps.logs.claimInbound({
    externalMessageId: message.externalMessageId,
    phoneNumber: message.phoneNumber,
    messageType: message.type,
    messageText: message.text,
    payload: sanitizeInboundPayload(message),
  });

  if (claimed.duplicate) {
    logger.info({
      operation: "whatsapp_inbound",
      result: "duplicate",
      externalMessageId: message.externalMessageId,
    });
    return "duplicate";
  }

  try {
    await deps.sender.markRead(message.externalMessageId);
    const result = await deps.engine.handle(message);
    await deps.sender.sendReplies({
      to: message.waId,
      phoneNumber: message.phoneNumber,
      replies: result.replies,
      replyToMessageId: message.externalMessageId,
    });
    await deps.logs.markProcessed(claimed.log.id);
    logger.info({
      operation: "whatsapp_inbound",
      result: "processed",
      externalMessageId: message.externalMessageId,
      userId: result.identity.userId ?? undefined,
    });
    return "processed";
  } catch (error) {
    await deps.logs.markFailed(claimed.log.id);
    logger.error({
      operation: "whatsapp_inbound",
      result: "failed",
      externalMessageId: message.externalMessageId,
      error: error instanceof Error ? error.message : "unknown",
    });
    await deps.sender.sendReplies({
      to: message.waId,
      phoneNumber: message.phoneNumber,
      replies: [
        {
          kind: "text",
          text: "Something went wrong. Please try again in a moment.",
        },
      ],
    });
    return "processed";
  }
}
