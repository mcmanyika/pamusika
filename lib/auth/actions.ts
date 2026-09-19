"use server";

import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { isStaffRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { loginSchema } from "@/lib/validation/auth";

export type AuthFormState = {
  error?: string;
};

export async function login(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const env = getEnv();

  if (!env.isSupabaseBrowserConfigured) {
    return { error: "PaySell authentication is not configured yet." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logger.warn({
      operation: "admin_login",
      result: "invalid_credentials",
    });
    return { error: "Invalid email or password." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Could not verify this account." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || !isStaffRole(profile.role)) {
    await supabase.auth.signOut();
    logger.warn({
      operation: "admin_login",
      result: "unauthorized_role",
      userId: user.id,
    });
    return { error: "This account is not authorized for the admin console." };
  }

  logger.info({
    operation: "admin_login",
    result: "success",
    userId: user.id,
  });

  redirect("/admin");
}

export async function logout() {
  const env = getEnv();

  if (env.isSupabaseBrowserConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/auth/login");
}
