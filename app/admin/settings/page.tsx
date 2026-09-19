import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getPublicIntegrationStatus } from "@/lib/env";

export default async function AdminSettingsPage() {
  const { profile, email } = await requireAdmin();
  const status = getPublicIntegrationStatus();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace configuration for the PaySell pilot."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="font-medium text-[var(--color-ink)]">Signed-in staff</p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            {profile.full_name || email || profile.email}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink)]">{profile.role}</p>
        </Card>
        <Card>
          <p className="font-medium text-[var(--color-ink)]">Integrations</p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--color-ink-muted)]">
            <li>Supabase: {status.supabase ? "configured" : "missing"}</li>
            <li>OpenAI: {status.openai ? "configured" : "missing"}</li>
            <li>WhatsApp: {status.whatsapp ? "configured" : "missing"}</li>
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <p className="font-medium text-[var(--color-ink)]">Staff access</p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Create staff users in Supabase Auth, then promote the first operator
            with:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-ink)]">
            {`UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE email = 'you@example.com';`}
          </pre>
        </Card>
      </div>
    </div>
  );
}
