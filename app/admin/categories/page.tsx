import { CategoryActions } from "@/components/admin/category-actions";
import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCategoryAction } from "@/lib/admin/actions";
import { loadCategories } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canManageCategories } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const rows = await loadCategories(supabase);
  const showActions = canManageCategories(profile.role);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Add or delete categories used in WhatsApp vendor registration, product listing, and buyer browse. WhatsApp menus show the first 10 active rows by sort order."
      />
      {showActions ? (
        <Card className="mb-4">
          <form action={createCategoryAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-[12rem] flex-1 text-sm text-[var(--color-ink-muted)]">
              New category
              <Input name="name" maxLength={24} placeholder="e.g. Hardware" className="mt-1" />
            </label>
            <Button type="submit">Add category</Button>
          </form>
        </Card>
      ) : null}
      <DataTable
        columns={[
          "Name",
          "Slug",
          "Status",
          "Sort",
          "Products",
          ...(showActions ? ["Actions"] : []),
        ]}
        empty="Add a category to use it in vendor registration, product listing, and buyer browse."
        rows={rows.map((category) => [
          category.name,
          category.slug,
          <StatusBadge key={`${category.id}-status`}>{category.status}</StatusBadge>,
          String(category.sort_order),
          String(category.productCount),
          ...(showActions
            ? [
                <CategoryActions
                  key={`${category.id}-actions`}
                  id={category.id}
                  name={category.name}
                />,
              ]
            : []),
        ])}
      />
    </div>
  );
}
