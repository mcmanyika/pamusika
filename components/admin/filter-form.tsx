import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FilterForm({
  action,
  query,
  children,
}: {
  action: string;
  query?: string;
  children?: ReactNode;
}) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="min-w-[12rem] flex-1 text-sm text-[var(--color-ink-muted)]">
        Search
        <Input name="q" defaultValue={query} placeholder="Search" className="mt-1" />
      </label>
      {children}
      <Button type="submit" variant="secondary">
        Filter
      </Button>
    </form>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="text-sm text-[var(--color-ink-muted)]">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-ink)] sm:w-44"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
