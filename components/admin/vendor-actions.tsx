"use client";

import { Button } from "@/components/ui/button";
import { setVendorStatusAction } from "@/lib/admin/actions";
import { nextAccountStatus } from "@/types/commerce";

export function VendorActions({ id, status }: { id: string; status: string }) {
  const next = nextAccountStatus(status);
  const label = next === "SUSPENDED" ? "Suspend" : "Activate";

  return (
    <form action={setVendorStatusAction}>
      <input type="hidden" name="vendorId" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button
        type="submit"
        variant={next === "SUSPENDED" ? "danger" : "secondary"}
        className="h-8 px-3 text-xs"
      >
        {label}
      </Button>
    </form>
  );
}
