import { getEnv } from "@/lib/env";

const DEFAULT_GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_GRAPH_API_VERSION = "v25.0";
export const WHATSAPP_REQUEST_TIMEOUT_MS = 15_000;
export const WHATSAPP_MEDIA_TIMEOUT_MS = 20_000;

export function getWhatsAppConfig() {
  const env = getEnv();
  const version = env.metaGraphApiVersion || DEFAULT_GRAPH_API_VERSION;
  const baseUrl = DEFAULT_GRAPH_BASE_URL;

  return {
    baseUrl,
    version,
    phoneNumberId: env.metaPhoneNumberId,
    accessToken: env.metaAccessToken,
    businessAccountId: env.metaBusinessAccountId,
    webhookVerifyToken: env.metaWebhookVerifyToken,
    appSecret: env.metaAppSecret,
    timeoutMs: WHATSAPP_REQUEST_TIMEOUT_MS,
    mediaTimeoutMs: WHATSAPP_MEDIA_TIMEOUT_MS,
    graphUrl: `${baseUrl}/${version}`,
    isSendConfigured: Boolean(env.metaAccessToken && env.metaPhoneNumberId),
    isWebhookVerifyConfigured: Boolean(env.metaWebhookVerifyToken),
    isWebhookSignatureConfigured: Boolean(env.metaAppSecret),
  };
}

export function messagesEndpoint(phoneNumberId: string, graphUrl: string): string {
  return `${graphUrl}/${phoneNumberId}/messages`;
}

export function mediaEndpoint(mediaId: string, graphUrl: string, phoneNumberId: string): string {
  const url = new URL(`${graphUrl}/${mediaId}`);
  url.searchParams.set("phone_number_id", phoneNumberId);
  return url.toString();
}
