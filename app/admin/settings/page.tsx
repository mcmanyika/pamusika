import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace configuration for the PaySell pilot."
      />
      <Card>
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
  );
}
