"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { SortHeader } from "@/components/admin/sort-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { VendorActions } from "@/components/admin/vendor-actions";
import { VendorVerificationActions } from "@/components/admin/verification-actions";
import { WhatsAppCompose } from "@/components/admin/whatsapp-compose";
import { WhatsAppLink } from "@/components/admin/whatsapp-link";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { nextSortState, sortByText, type SortState } from "@/lib/admin/sort";

export type VendorDirectoryItem = {
  id: string;
  vendorCode: string;
  businessName: string;
  contactName: string;
  whatsapp: string;
  address: string;
  categoryName: string;
  productCount: number;
  orderCount: number;
  status: string;
  verification: string;
  joined: string;
};

const COLUMNS = [
  { key: "businessName", label: "Business" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "status", label: "Status" },
  { key: "verification", label: "Verification" },
] as const;

type VendorSortKey = (typeof COLUMNS)[number]["key"];

function sortValue(vendor: VendorDirectoryItem, key: VendorSortKey): string {
  if (key === "businessName") {
    return `${vendor.businessName} ${vendor.vendorCode}`;
  }
  return vendor[key];
}

export function VendorDirectory({
  vendors,
  canMessage,
  canVerify,
  canModerate,
  empty,
}: {
  vendors: VendorDirectoryItem[];
  canMessage: boolean;
  canVerify: boolean;
  canModerate: boolean;
  empty: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<VendorSortKey>>({
    key: "businessName",
    dir: "asc",
  });
  const selected = vendors.find((vendor) => vendor.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);
  const rows = useMemo(
    () => sortByText(vendors, (vendor) => sortValue(vendor, sort.key), sort.dir),
    [sort, vendors],
  );

  if (vendors.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-ink-muted)]">{empty}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
            <tr>
              {COLUMNS.map((column) => (
                <SortHeader
                  key={column.key}
                  label={column.label}
                  active={sort.key === column.key}
                  dir={sort.dir}
                  onClick={() => setSort((current) => nextSortState(current, column.key))}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((vendor) => (
              <tr
                key={vendor.id}
                tabIndex={0}
                role="button"
                aria-label={`View ${vendor.businessName}`}
                className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                onClick={() => setSelectedId(vendor.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(vendor.id);
                  }
                }}
              >
                <td className="px-4 py-3 text-[var(--color-ink)]">
                  <p className="font-medium text-[var(--color-brand-dark)]">{vendor.businessName}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{vendor.vendorCode}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-ink)]">
                  {vendor.whatsapp}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge>{vendor.status}</StatusBadge>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge>{vendor.verification}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(selected)}
        title={selected?.businessName ?? "Vendor"}
        onClose={close}
      >
        {selected ? (
          <VendorDetail
            vendor={selected}
            canMessage={canMessage}
            canVerify={canVerify}
            canModerate={canModerate}
          />
        ) : null}
      </Modal>
    </>
  );
}

function VendorDetail({
  vendor,
  canMessage,
  canVerify,
  canModerate,
}: {
  vendor: VendorDirectoryItem;
  canMessage: boolean;
  canVerify: boolean;
  canModerate: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge>{vendor.status}</StatusBadge>
        <StatusBadge>{vendor.verification}</StatusBadge>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Detail label="Vendor ID" value={vendor.vendorCode} />
        <Detail label="Contact" value={vendor.contactName} />
        <div>
          <dt className="text-xs text-[var(--color-ink-muted)]">WhatsApp</dt>
          <dd className="mt-1 font-medium">
            <WhatsAppLink phone={vendor.whatsapp} />
          </dd>
        </div>
        <Detail label="Address" value={vendor.address} />
        <Detail label="Category" value={vendor.categoryName} />
        <Detail label="Joined" value={vendor.joined} />
        <Detail label="Products" value={String(vendor.productCount)} />
        <Detail label="Orders" value={String(vendor.orderCount)} />
      </dl>
      {canVerify || canModerate ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-4">
          {canVerify ? (
            <VendorVerificationActions id={vendor.id} status={vendor.verification} />
          ) : null}
          {canModerate ? <VendorActions id={vendor.id} status={vendor.status} /> : null}
        </div>
      ) : null}
      {canMessage ? <WhatsAppCompose phone={vendor.whatsapp} name={vendor.contactName} /> : null}
      <Link
        href={`/admin/vendors/${vendor.id}`}
        className="inline-block text-sm text-[var(--color-brand-dark)] hover:underline"
      >
        Open full profile
      </Link>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="mt-1 font-medium text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
