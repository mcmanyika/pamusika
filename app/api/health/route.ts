import { getPublicIntegrationStatus } from "@/lib/env";
import { createCorrelationId, logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const correlationId = createCorrelationId();
  const status = getPublicIntegrationStatus();

  logger.info({
    operation: "health",
    result: "ok",
    correlationId,
    durationMs: Date.now() - started,
  });

  return Response.json(
    {
      ok: true,
      service: "paysell",
      correlationId,
      checks: {
        supabase: status.supabase,
        openai: status.openai,
        whatsapp: status.whatsapp,
        whatsappSignature: status.whatsappSignature,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
