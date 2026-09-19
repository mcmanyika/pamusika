import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { isStaffRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import type { Profile } from "@/types/database";

export async function requireAdmin(): Promise<{
  userId: string;
  email: string | undefined;
  profile: Profile;
}> {
  const env = getEnv();

  if (!env.isSupabaseBrowserConfigured) {
    redirect("/auth/login?error=not_configured");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.error({
      operation: "require_admin",
      result: "profile_lookup_failed",
      userId: user.id,
      error: profileError.message,
    });
    redirect("/auth/login?error=unauthorized");
  }

  if (!profile || !isStaffRole(profile.role)) {
    redirect("/auth/login?error=unauthorized");
  }

  return {
    userId: user.id,
    email: user.email,
    profile,
  };
}
