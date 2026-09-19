import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";

export async function GET(request: Request) {
  const env = getEnv();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!env.isSupabaseBrowserConfigured) {
    return NextResponse.redirect(`${origin}/auth/login?error=not_configured`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.error({
      operation: "auth_callback",
      result: "exchange_failed",
      error: error.message,
    });
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  const safeNext = next.startsWith("/") ? next : "/admin";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
