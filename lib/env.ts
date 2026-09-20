function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function readPublicEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isPresent(value: string): boolean {
  return value.length > 0;
}

export function getEnv() {
  const supabaseUrl = readPublicEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey = readPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const supabaseServiceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const openaiApiKey = readEnv("OPENAI_API_KEY");
  const openaiModel = readEnv("OPENAI_MODEL") || "gpt-4.1-mini";
  const metaAccessToken = readEnv("META_WHATSAPP_ACCESS_TOKEN");
  const metaPhoneNumberId = readEnv("META_WHATSAPP_PHONE_NUMBER_ID");
  const metaBusinessAccountId = readEnv("META_WHATSAPP_BUSINESS_ACCOUNT_ID");
  const metaWebhookVerifyToken = readEnv("META_WEBHOOK_VERIFY_TOKEN");
  const metaAppSecret = readEnv("META_APP_SECRET");
  const metaGraphApiVersion = readEnv("META_GRAPH_API_VERSION");
  const appUrl = readPublicEnv(process.env.NEXT_PUBLIC_APP_URL) || "http://localhost:3000";

  return {
    appUrl,
    supabaseUrl,
    supabasePublishableKey,
    supabaseServiceRoleKey,
    openaiApiKey,
    openaiModel,
    metaAccessToken,
    metaPhoneNumberId,
    metaBusinessAccountId,
    metaWebhookVerifyToken,
    metaAppSecret,
    metaGraphApiVersion,
    isSupabaseBrowserConfigured:
      isPresent(supabaseUrl) && isPresent(supabasePublishableKey),
    isSupabaseAdminConfigured:
      isPresent(supabaseUrl) && isPresent(supabaseServiceRoleKey),
    isOpenAIConfigured: isPresent(openaiApiKey),
    isMetaWhatsAppConfigured:
      isPresent(metaAccessToken) &&
      isPresent(metaPhoneNumberId) &&
      isPresent(metaWebhookVerifyToken),
    isMetaWebhookSignatureConfigured: isPresent(metaAppSecret),
  };
}

export function getPublicIntegrationStatus() {
  const env = getEnv();

  return {
    supabase: env.isSupabaseBrowserConfigured,
    openai: env.isOpenAIConfigured,
    whatsapp: env.isMetaWhatsAppConfigured,
    whatsappSignature: env.isMetaWebhookSignatureConfigured,
  };
}
