import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-ink-muted)]">{empty}</p>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, index) => (
            <tr key={index} className="border-t border-[var(--color-border)]">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-[var(--color-ink)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
