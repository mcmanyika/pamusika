import { LoginForm } from "@/components/admin/login-form";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.",
  unauthorized: "This account is not authorized for the admin console.",
  auth: "Sign-in could not be completed. Try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const env = getEnv();
  const params = await searchParams;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--color-canvas)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-[var(--color-brand)]">PaySell</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Staff access only. Vendors and customers use WhatsApp.
        </p>
        {errorMessage ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {!env.isSupabaseBrowserConfigured ? (
          <p className="mt-4 text-sm text-amber-800">
            Authentication is not configured yet. Copy `.env.example` to
            `.env.local` and add your Supabase keys.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm configured={env.isSupabaseBrowserConfigured} />
        </div>
      </div>
    </div>
  );
}
