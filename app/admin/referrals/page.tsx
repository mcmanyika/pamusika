import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { displayPhone, formatDate } from "@/lib/admin/format";
import { loadReferrals } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canViewPii } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminReferralsPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const referrals = await loadReferrals(supabase);
  const showPhone = canViewPii(profile.role);

  return (
    <div>
      <PageHeader
        title="Referrals"
        description="First-touch referral codes. A referral qualifies when the invited buyer saves an address or orders, or when an invited vendor is confirmed."
      />
      <DataTable
        columns={["Code", "Referrer", "Invited WhatsApp", "Status", "Applied", "Qualified"]}
        empty="Referral codes appear here after someone shares Invite and a new number uses REF."
        rows={referrals.map((referral) => [
          referral.code,
          referral.referrerName ?? referral.referrer_type,
          displayPhone(referral.referee_phone, showPhone),
          <StatusBadge key={`${referral.id}-status`}>{referral.status}</StatusBadge>,
          formatDate(referral.created_at),
          formatDate(referral.qualified_at),
        ])}
      />
    </div>
  );
}
