import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, email } = await requireAdmin();

  return (
    <AdminShell
      fullName={profile.full_name}
      email={email ?? profile.email ?? undefined}
      role={profile.role}
    >
      {children}
    </AdminShell>
  );
}
