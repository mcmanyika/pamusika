import { CategoryLabel } from "@/components/admin/category-icon";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatHarvestMonthLabel, locationLabel } from "@/lib/admin/format";
import { loadHarvestPlans } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHarvestPage() {
  await requireAdmin();
  const supabase = await createClient();
  const plans = await loadHarvestPlans(supabase);

  return (
    <div>
      <PageHeader
        title="Harvest"
        description="Expected harvests that vendors submitted on WhatsApp. These are not listed for sale until the vendor publishes a product."
      />
      <DataTable
        columns={["Vendor", "Crop", "Category", "Quantity", "Month", "Area", "Status"]}
        empty="Harvest plans appear here after a vendor records expected produce."
        rows={plans.map((plan) => [
          plan.vendorName ?? "—",
          plan.crop_name,
          <CategoryLabel key={`${plan.id}-category`} name={plan.categoryName} slug={plan.categorySlug} />,
          `${plan.quantity} ${plan.unit}`,
          formatHarvestMonthLabel(plan.harvest_year, plan.harvest_month),
          locationLabel(plan.area, plan.city),
          <StatusBadge key={`${plan.id}-status`}>{plan.status}</StatusBadge>,
        ])}
      />
    </div>
  );
}
