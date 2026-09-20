"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteCategoryAction, renameCategoryAction } from "@/lib/admin/actions";

export function CategoryActions({ id, name }: { id: string; name: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={renameCategoryAction} className="flex items-center gap-2">
        <input type="hidden" name="categoryId" value={id} />
        <Input name="name" defaultValue={name} maxLength={24} className="h-8 w-40 text-xs" />
        <Button type="submit" variant="secondary" className="h-8 px-3 text-xs">
          Save
        </Button>
      </form>
      <form
        action={deleteCategoryAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Delete “${name}”? Products and vendors in this category stay listed without a category.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="categoryId" value={id} />
        <Button type="submit" variant="danger" className="h-8 px-3 text-xs">
          Delete
        </Button>
      </form>
    </div>
  );
}
