import { CustomerActions } from "@/components/admin/customer-actions";
import { DataTable } from "@/components/admin/data-table";
import { FilterForm, FilterSelect } from "@/components/admin/filter-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { CustomerVerificationActions } from "@/components/admin/verification-actions";
import { WhatsAppLink } from "@/components/admin/whatsapp-link";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate, locationLabel } from "@/lib/admin/format";
import { loadCustomers } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canModerateAccounts, canVerifyUsers } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_STATUSES, VERIFICATION_STATUSES } from "@/types/commerce";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; verification?: string }>;
}) {
  const { profile } = await requireAdmin();
  const params = await searchParams;
  const supabase = await createClient();
  const customers = await loadCustomers(supabase, {
    q: params.q,
    status: params.status,
    verification: params.verification,
  });
  const showActions = canModerateAccounts(profile.role);
  const showVerification = canVerifyUsers(profile.role);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="WhatsApp buyers and their saved delivery addresses. Verify, activate, or suspend a buyer account."
      />
      <FilterForm action="/admin/customers" query={params.q}>
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          options={CUSTOMER_STATUSES.map((value) => ({ value, label: value }))}
        />
        <FilterSelect
          name="verification"
          label="Verification"
          value={params.verification}
          options={VERIFICATION_STATUSES.map((value) => ({ value, label: value }))}
        />
      </FilterForm>
      <DataTable
        columns={[
          "Name",
          "WhatsApp",
          "Addresses",
          "Default delivery",
          "Status",
          "Verification",
          "Joined",
          ...(showActions || showVerification ? ["Actions"] : []),
        ]}
        empty="Buyers are created automatically when they start a WhatsApp conversation."
        rows={customers.map((customer) => {
          const defaultAddress = customer.addresses.find((address) => address.is_default);
          return [
            customer.display_name ?? "—",
            <WhatsAppLink key={`${customer.id}-wa`} phone={customer.whatsapp_number} />,
            customer.addresses.length === 0 ? "—" : String(customer.addresses.length),
            defaultAddress
              ? [defaultAddress.label, defaultAddress.line1, locationLabel(defaultAddress.area, defaultAddress.city)]
                  .filter((part) => part && part !== "—")
                  .join(" · ")
              : "—",
            <StatusBadge key={`${customer.id}-status`}>{customer.status}</StatusBadge>,
            <StatusBadge key={`${customer.id}-verification`}>{customer.verification_status}</StatusBadge>,
            formatDate(customer.created_at),
            ...(showActions || showVerification
              ? [
                  <div key={`${customer.id}-actions`} className="flex flex-wrap items-center gap-2">
                    {showVerification ? (
                      <CustomerVerificationActions
                        id={customer.id}
                        status={customer.verification_status}
                      />
                    ) : null}
                    {showActions ? (
                      <CustomerActions id={customer.id} status={customer.status} />
                    ) : null}
                  </div>,
                ]
              : []),
          ];
        })}
      />
    </div>
  );
}
