import { CommerceError } from "@/lib/commerce/errors";
import type { ConversationStore } from "@/lib/services/conversation.service";
import type { MessageLogStore } from "@/lib/services/message-log.service";
import type { ConversationSession, MessageLog } from "@/types/database";
import type { WhatsAppClient, WhatsAppSendResult } from "@/types/whatsapp";

export function createMemoryConversationStore(
  seed: ConversationSession[] = [],
): ConversationStore {
  const sessions = [...seed];

  return {
    async findActiveByPhone(phone) {
      return sessions.find((session) => session.phone_number === phone && session.is_active) ?? null;
    },
    async create(session) {
      sessions.push(session);
      return session;
    },
    async update(id, patch) {
      const index = sessions.findIndex((session) => session.id === id);
      if (index === -1) {
        throw new CommerceError("STORE_ERROR", "Session not found");
      }
      sessions[index] = {
        ...sessions[index],
        ...patch,
        updated_at: new Date().toISOString(),
      };
      return sessions[index];
    },
    async deactivateActive(phone) {
      for (const session of sessions) {
        if (session.phone_number === phone && session.is_active) {
          session.is_active = false;
        }
      }
    },
  };
}

export function createMemoryMessageLogStore(seed: MessageLog[] = []): MessageLogStore {
  const logs = [...seed];

  return {
    async findByExternalId(externalMessageId) {
      return (
        logs.find((log) => log.external_message_id === externalMessageId) ?? null
      );
    },
    async insert(log) {
      if (
        log.external_message_id &&
        logs.some((row) => row.external_message_id === log.external_message_id)
      ) {
        throw new CommerceError("STORE_ERROR", "duplicate external_message_id");
      }
      logs.push(log);
      return log;
    },
    async update(id, patch) {
      const index = logs.findIndex((log) => log.id === id);
      if (index === -1) {
        throw new CommerceError("STORE_ERROR", "Message log not found");
      }
      logs[index] = { ...logs[index], ...patch };
      return logs[index];
    },
  };
}

export function createMockWhatsAppClient() {
  const sent: Array<{ to: string; body: string }> = [];
  const read: string[] = [];
  let sequence = 1;

  const client: WhatsAppClient = {
    async sendTextMessage(to, body) {
      sent.push({ to, body });
      return { id: `wamid.out.${sequence++}` } satisfies WhatsAppSendResult;
    },
    async sendInteractiveMessage(to, message) {
      sent.push({ to, body: message.body });
      return { id: `wamid.out.${sequence++}` };
    },
    async sendTemplateMessage(to, template) {
      sent.push({ to, body: template.name });
      return { id: `wamid.out.${sequence++}` };
    },
    async markMessageRead(messageId) {
      read.push(messageId);
    },
    async downloadMedia() {
      return {
        bytes: new Uint8Array(),
        mimeType: "image/jpeg",
        fileName: "media",
      };
    },
  };

  return { client, sent, read };
}
