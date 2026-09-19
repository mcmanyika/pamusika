import { DataTable } from "@/components/admin/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { displayPhone, formatDate, locationLabel } from "@/lib/admin/format";
import { loadCustomers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canViewPii } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const customers = await loadCustomers(supabase);
  const showPhone = canViewPii(profile.role);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Lightweight WhatsApp buyer records. Phone numbers are hidden from analyst roles."
      />
      <DataTable
        columns={["Name", "WhatsApp", "Area", "Joined"]}
        empty="Buyers are created automatically when they start a WhatsApp conversation."
        rows={customers.map((customer) => [
          customer.display_name ?? "—",
          displayPhone(customer.whatsapp_number, showPhone),
          locationLabel(customer.area, customer.city),
          formatDate(customer.created_at),
        ])}
      />
    </div>
  );
}
