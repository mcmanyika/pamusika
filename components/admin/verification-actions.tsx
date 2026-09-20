"use client";

import { Button } from "@/components/ui/button";
import {
  setCustomerVerificationAction,
  setVendorVerificationAction,
} from "@/lib/admin/actions";

function VerificationButton({
  action,
  idField,
  id,
  status,
  label,
  variant,
}: {
  action: (formData: FormData) => Promise<void>;
  idField: "vendorId" | "customerId";
  id: string;
  status: string;
  label: string;
  variant: "secondary" | "danger";
}) {
  return (
    <form action={action}>
      <input type="hidden" name={idField} value={id} />
      <input type="hidden" name="verification" value={status} />
      <Button type="submit" variant={variant} className="h-8 px-3 text-xs">
        {label}
      </Button>
    </form>
  );
}

export function VendorVerificationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "VERIFIED" ? (
        <VerificationButton
          action={setVendorVerificationAction}
          idField="vendorId"
          id={id}
          status="VERIFIED"
          label="Verify"
          variant="secondary"
        />
      ) : null}
      {status !== "REJECTED" ? (
        <VerificationButton
          action={setVendorVerificationAction}
          idField="vendorId"
          id={id}
          status="REJECTED"
          label="Reject"
          variant="danger"
        />
      ) : null}
    </div>
  );
}

export function CustomerVerificationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "VERIFIED" ? (
        <VerificationButton
          action={setCustomerVerificationAction}
          idField="customerId"
          id={id}
          status="VERIFIED"
          label="Verify"
          variant="secondary"
        />
      ) : null}
      {status !== "REJECTED" ? (
        <VerificationButton
          action={setCustomerVerificationAction}
          idField="customerId"
          id={id}
          status="REJECTED"
          label="Reject"
          variant="danger"
        />
      ) : null}
    </div>
  );
}
