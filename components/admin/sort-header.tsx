"use client";

import type { SortDirection } from "@/lib/admin/sort";

export function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDirection;
  onClick: () => void;
}) {
  return (
    <th
      className="whitespace-nowrap px-4 py-3 font-medium"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-[var(--color-ink)]"
        onClick={onClick}
      >
        {label}
        <span className={active ? "text-[var(--color-ink)]" : "opacity-40"} aria-hidden="true">
          {active && dir === "desc" ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );
}
