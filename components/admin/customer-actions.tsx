"use client";

import { Button } from "@/components/ui/button";
import { setCustomerStatusAction } from "@/lib/admin/actions";
import { nextAccountStatus } from "@/types/commerce";

export function CustomerActions({ id, status }: { id: string; status: string }) {
  const next = nextAccountStatus(status);
  const label = next === "SUSPENDED" ? "Suspend" : "Activate";

  return (
    <form action={setCustomerStatusAction}>
      <input type="hidden" name="customerId" value={id} />
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
