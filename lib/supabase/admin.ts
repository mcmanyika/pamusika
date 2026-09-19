import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const env = getEnv();

  if (!env.isSupabaseAdminConfigured) {
    throw new Error("Supabase admin client is not configured");
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
