import { getWhatsAppConfig, mediaEndpoint, messagesEndpoint } from "@/lib/whatsapp/config";
import { WhatsAppError } from "@/lib/whatsapp/errors";
import { logger } from "@/lib/utils/logger";
import type {
  WhatsAppClient,
  WhatsAppInteractiveMessage,
  WhatsAppMediaDownload,
  WhatsAppSendResult,
  WhatsAppTemplateMessage,
} from "@/types/whatsapp";

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
};

function isAllowedMediaHost(hostname: string): boolean {
  return (
    hostname === "graph.facebook.com" ||
    hostname.endsWith(".facebook.com") ||
    hostname.endsWith(".fbcdn.net") ||
    hostname.endsWith(".fbsbx.com")
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new WhatsAppError("INVALID_RESPONSE", "Meta returned a non-JSON response", response.status);
  }
}

export function whatsAppAuthFailedMessage(body: unknown): string {
  const message = (body as GraphErrorBody | null)?.error?.message ?? "";
  if (/session has expired|access token.*expir/i.test(message)) {
    return "WhatsApp token expired. Generate a new token in Meta Developer and update META_WHATSAPP_ACCESS_TOKEN. Until then, use Open WhatsApp.";
  }
  return "Meta authentication failed";
}

function graphErrorMessage(body: unknown, fallback: string): string {
  const error = (body as GraphErrorBody | null)?.error;
  if (error?.code === 190 || error?.type === "OAuthException") {
    return whatsAppAuthFailedMessage(body);
  }
  if (error?.message) {
    return error.message;
  }
  return fallback;
}

async function graphFetch(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    const body = await readJson(response);
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof WhatsAppError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new WhatsAppError("TIMEOUT", "Meta request timed out");
    }
    throw new WhatsAppError("NETWORK_ERROR", "Could not reach Meta");
  } finally {
    clearTimeout(timer);
  }
}

function assertOk(status: number, body: unknown, operation: string): void {
  if (status === 401 || status === 403) {
    logger.error({ operation, result: "auth_failed", status });
    throw new WhatsAppError("AUTH_FAILED", whatsAppAuthFailedMessage(body), status);
  }
  if (status === 429) {
    logger.warn({ operation, result: "rate_limited", status });
    throw new WhatsAppError("RATE_LIMITED", "Meta rate limit reached", status);
  }
  if (status >= 500) {
    logger.error({ operation, result: "meta_unavailable", status });
    throw new WhatsAppError("UPSTREAM_ERROR", "Meta is temporarily unavailable", status);
  }
  if (status < 200 || status >= 300) {
    throw new WhatsAppError(
      "INVALID_RESPONSE",
      graphErrorMessage(body, "Meta rejected the request"),
      status,
    );
  }
}

function extractMessageId(body: unknown): string {
  const payload = body as { messages?: Array<{ id?: string }> } | null;
  const id = payload?.messages?.[0]?.id;
  if (!id) {
    throw new WhatsAppError("INVALID_RESPONSE", "Meta did not return a message id");
  }
  return id;
}

function clamp(value: string, max: number): string {
  return [...value].slice(0, max).join("");
}

export function interactivePayload(message: WhatsAppInteractiveMessage): Record<string, unknown> {
  const header = message.header
    ? { header: { type: "text", text: clamp(message.header, 60) } }
    : {};
  const footer = message.footer ? { footer: { text: clamp(message.footer, 60) } } : {};
  const body = { text: message.body.trim() || "Choose an option." };

  if (message.list) {
    return {
      type: "list",
      ...header,
      body,
      ...footer,
      action: {
        button: clamp(message.list.button, 20),
        sections: message.list.sections.slice(0, 10).map((section) => ({
          title: clamp(section.title || "Menu", 24),
          rows: section.rows.slice(0, 10).map((row) => ({
            id: clamp(row.id, 200),
            title: clamp(row.title, 24),
            ...(row.description ? { description: clamp(row.description, 72) } : {}),
          })),
        })),
      },
    };
  }

  if (message.ctaUrl) {
    return {
      type: "cta_url",
      ...header,
      body,
      ...footer,
      action: {
        name: "cta_url",
        parameters: {
          display_text: clamp(message.ctaUrl.displayText, 20),
          url: message.ctaUrl.url,
        },
      },
    };
  }

  return {
    type: "button",
    ...header,
    body,
    ...footer,
    action: {
      buttons: (message.buttons ?? []).slice(0, 3).map((button) => ({
        type: "reply",
        reply: { id: clamp(button.id, 256), title: clamp(button.title, 20) },
      })),
    },
  };
}

export function createWhatsAppClient(): WhatsAppClient {
  const config = getWhatsAppConfig();

  if (!config.isSendConfigured) {
    throw new WhatsAppError("NOT_CONFIGURED", "WhatsApp sending is not configured");
  }

  const authHeaders = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
  };

  async function postMessage(payload: Record<string, unknown>): Promise<WhatsAppSendResult> {
    const { status, body } = await graphFetch(
      messagesEndpoint(config.phoneNumberId, config.graphUrl),
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(payload),
      },
      config.timeoutMs,
    );
    assertOk(status, body, "whatsapp_send");
    return { id: extractMessageId(body) };
  }

  return {
    async sendTextMessage(to, body, options) {
      return postMessage({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body, preview_url: false },
        ...(options?.replyToMessageId
          ? { context: { message_id: options.replyToMessageId } }
          : {}),
      });
    },

    async sendInteractiveMessage(to, message: WhatsAppInteractiveMessage) {
      return postMessage({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: interactivePayload(message),
      });
    },

    async sendTemplateMessage(to, template: WhatsAppTemplateMessage) {
      return postMessage({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.languageCode },
          ...(template.components ? { components: template.components } : {}),
        },
      });
    },

    async markMessageRead(messageId) {
      const { status, body } = await graphFetch(
        messagesEndpoint(config.phoneNumberId, config.graphUrl),
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
          }),
        },
        config.timeoutMs,
      );
      assertOk(status, body, "whatsapp_mark_read");
    },

    async downloadMedia(mediaId): Promise<WhatsAppMediaDownload> {
      const metaUrl = mediaEndpoint(mediaId, config.graphUrl, config.phoneNumberId);
      const { status, body } = await graphFetch(
        metaUrl,
        { method: "GET", headers: { Authorization: `Bearer ${config.accessToken}` } },
        config.timeoutMs,
      );
      assertOk(status, body, "whatsapp_media_meta");

      const url = (body as { url?: string; mime_type?: string } | null)?.url;
      const mimeType = (body as { mime_type?: string } | null)?.mime_type ?? "application/octet-stream";
      if (!url) {
        throw new WhatsAppError("INVALID_RESPONSE", "Meta did not return a media URL");
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new WhatsAppError("INVALID_RESPONSE", "Meta returned an invalid media URL");
      }

      if (!isAllowedMediaHost(parsed.hostname)) {
        throw new WhatsAppError("INVALID_RESPONSE", "Unexpected media host");
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.mediaTimeoutMs);
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${config.accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new WhatsAppError("UPSTREAM_ERROR", "Could not download WhatsApp media", response.status);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        return {
          bytes,
          mimeType: response.headers.get("content-type") ?? mimeType,
          fileName: mediaId,
        };
      } catch (error) {
        if (error instanceof WhatsAppError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new WhatsAppError("TIMEOUT", "Media download timed out");
        }
        throw new WhatsAppError("NETWORK_ERROR", "Could not download WhatsApp media");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
