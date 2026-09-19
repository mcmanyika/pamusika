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
        description="WhatsApp buyers and their saved delivery addresses. Phone numbers are hidden from analyst roles."
      />
      <DataTable
        columns={["Name", "WhatsApp", "Addresses", "Default delivery", "Joined"]}
        empty="Buyers are created automatically when they start a WhatsApp conversation."
        rows={customers.map((customer) => {
          const defaultAddress = customer.addresses.find((address) => address.is_default);
          return [
            customer.display_name ?? "—",
            displayPhone(customer.whatsapp_number, showPhone),
            customer.addresses.length === 0 ? "—" : String(customer.addresses.length),
            defaultAddress
              ? [defaultAddress.label, defaultAddress.line1, locationLabel(defaultAddress.area, defaultAddress.city)]
                  .filter((part) => part && part !== "—")
                  .join(" · ")
              : "—",
            formatDate(customer.created_at),
          ];
        })}
      />
    </div>
  );
}
