import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createClient() {
  const env = getEnv();

  if (!env.isSupabaseBrowserConfigured) {
    throw new Error("Supabase browser client is not configured");
  }

  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
  );
}

export function tryCreateBrowserClient() {
  const env = getEnv();
  if (!env.isSupabaseBrowserConfigured) {
    return null;
  }
  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
  );
}
