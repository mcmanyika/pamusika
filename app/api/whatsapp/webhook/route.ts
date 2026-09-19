import { ConversationEngine } from "@/lib/conversation/engine";
import { getEnv } from "@/lib/env";
import { createCommerceServices } from "@/lib/services/create-commerce";
import { createConversationService } from "@/lib/services/conversation.service";
import { createMessageLogService } from "@/lib/services/message-log.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCorrelationId, logger } from "@/lib/utils/logger";
import { createWhatsAppClient } from "@/lib/whatsapp/client";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { parseWebhookPayload } from "@/lib/whatsapp/parser";
import { processInboundPayload } from "@/lib/whatsapp/processor";
import { WhatsAppSender } from "@/lib/whatsapp/sender";
import { verifyMetaSignature, verifyWebhookSubscription } from "@/lib/whatsapp/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getWhatsAppConfig();
  const url = new URL(request.url);
  const result = verifyWebhookSubscription({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
    expectedToken: config.webhookVerifyToken,
  });

  if (!config.isWebhookVerifyConfigured) {
    logger.warn({ operation: "whatsapp_verify", result: "not_configured" });
    return new Response("Webhook is not configured", { status: 503 });
  }

  if (!result.ok) {
    logger.warn({ operation: "whatsapp_verify", result: "rejected" });
    return new Response("Forbidden", { status: 403 });
  }

  logger.info({ operation: "whatsapp_verify", result: "ok" });
  return new Response(result.challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const started = Date.now();
  const correlationId = createCorrelationId();
  const config = getWhatsAppConfig();
  const env = getEnv();

  const rawBody = await request.text();

  if (!config.isWebhookSignatureConfigured) {
    logger.warn({
      operation: "whatsapp_webhook",
      result: "not_configured",
      correlationId,
    });
    return Response.json({ error: "Webhook signature is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyMetaSignature(rawBody, signature, config.appSecret)) {
    logger.warn({
      operation: "whatsapp_webhook",
      result: "invalid_signature",
      correlationId,
    });
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inbound = parseWebhookPayload(payload);
  if (inbound.messages.length === 0) {
    logger.info({
      operation: "whatsapp_webhook",
      result: "ignored",
      correlationId,
      durationMs: Date.now() - started,
    });
    return Response.json({
      ok: true,
      processed: 0,
      duplicates: 0,
      ignored: inbound.ignored,
    });
  }

  if (!env.isSupabaseAdminConfigured || !config.isSendConfigured) {
    logger.warn({
      operation: "whatsapp_webhook",
      result: "dependencies_missing",
      correlationId,
    });
    return Response.json({ error: "PaySell is not ready to process messages" }, { status: 503 });
  }

  try {
    const client = createAdminClient();
    const commerce = createCommerceServices(client);
    const logs = createMessageLogService(client);
    const conversations = createConversationService(client);
    const engine = new ConversationEngine(
      conversations,
      commerce.vendors,
      commerce.customers,
    );
    const sender = new WhatsAppSender(createWhatsAppClient(), logs);

    const result = await processInboundPayload(payload, { engine, logs, sender });

    logger.info({
      operation: "whatsapp_webhook",
      result: "ok",
      correlationId,
      durationMs: Date.now() - started,
    });

    return Response.json({
      ok: true,
      processed: result.processed,
      duplicates: result.duplicates,
      ignored: result.ignored,
    });
  } catch (error) {
    logger.error({
      operation: "whatsapp_webhook",
      result: "failed",
      correlationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Could not process webhook" }, { status: 500 });
  }
}
