"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CategoryLabel } from "@/components/admin/category-icon";
import { ProductActions } from "@/components/admin/product-actions";
import { SortHeader } from "@/components/admin/sort-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { WhatsAppLink } from "@/components/admin/whatsapp-link";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { nextSortState, sortBy, type SortState } from "@/lib/admin/sort";

export type ProductTableRow = {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  vendorName: string;
  vendorWhatsapp?: string | null;
  categoryName: string;
  categorySlug?: string | null;
  area: string;
  priceLabel: string;
  price: number;
  stockLabel: string;
  stock: number;
  status: string;
  imageUrl: string | null;
  createdLabel: string;
  updatedLabel: string;
  updatedAt: string;
};

const COLUMNS = [
  { key: "name", label: "Product" },
  { key: "vendorName", label: "Vendor" },
  { key: "status", label: "Status" },
  { key: "price", label: "Price" },
] as const;

type ProductSortKey = (typeof COLUMNS)[number]["key"];

function sortValue(product: ProductTableRow, key: ProductSortKey): string | number {
  return product[key];
}

export function ProductTable({
  products,
  showActions,
  empty,
}: {
  products: ProductTableRow[];
  showActions: boolean;
  empty: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState<ProductSortKey>>({
    key: "name",
    dir: "asc",
  });
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);
  const rows = useMemo(
    () => sortBy(products, (product) => sortValue(product, sort.key), sort.dir),
    [products, sort],
  );

  if (products.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-ink-muted)]">{empty}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-ink)] shadow-sm [color-scheme:light]">
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
            {rows.map((product) => (
              <tr
                key={product.id}
                tabIndex={0}
                role="button"
                aria-label={`View ${product.name}`}
                className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                onClick={() => setSelectedId(product.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(product.id);
                  }
                }}
              >
                <td className="px-4 py-3 font-medium text-[var(--color-brand-dark)]">{product.name}</td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-ink)]">
                  <span className="flex items-center gap-2">
                    {product.vendorName}
                    {product.vendorWhatsapp ? (
                      <span
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <WhatsAppLink phone={product.vendorWhatsapp} variant="button" />
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge>{product.status}</StatusBadge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--color-ink)]">{product.priceLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(selected)} title={selected?.name ?? "Product"} onClose={close}>
        {selected ? <ProductDetail product={selected} showActions={showActions} /> : null}
      </Modal>
    </>
  );
}

function ProductDetail({
  product,
  showActions,
}: {
  product: ProductTableRow;
  showActions: boolean;
}) {
  return (
    <div className="space-y-4">
      <StatusBadge>{product.status}</StatusBadge>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="max-h-48 w-full rounded-lg object-cover"
        />
      ) : null}
      {product.description !== "—" ? (
        <p className="text-sm text-[var(--color-ink)]">{product.description}</p>
      ) : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Detail label="Vendor" value={product.vendorName} />
        <div>
          <dt className="text-xs text-[var(--color-ink-muted)]">WhatsApp</dt>
          <dd className="mt-1 font-medium">
            {product.vendorWhatsapp ? (
              <WhatsAppLink phone={product.vendorWhatsapp} variant="button" />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <Detail label="Category" value={<CategoryLabel name={product.categoryName} slug={product.categorySlug} />} />
        <Detail label="Area" value={product.area} />
        <Detail label="Price" value={product.priceLabel} />
        <Detail label="Stock" value={product.stockLabel} />
        <Detail label="Created" value={product.createdLabel} />
        <Detail label="Updated" value={product.updatedLabel} />
      </dl>
      {showActions ? (
        <div className="border-t border-[var(--color-border)] pt-4">
          <ProductActions id={product.id} status={product.status} />
        </div>
      ) : null}
      <Link
        href={`/admin/vendors/${product.vendorId}`}
        className="inline-block text-sm text-[var(--color-brand-dark)] hover:underline"
      >
        Open vendor
      </Link>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="mt-1 font-medium text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
