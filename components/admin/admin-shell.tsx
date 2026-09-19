"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV } from "@/components/admin/nav";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils/cn";

export function AdminShell({
  children,
  fullName,
  email,
  role,
}: {
  children: ReactNode;
  fullName: string | null;
  email: string | undefined;
  role: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const displayName = fullName || email || "Staff";

  return (
    <div className="min-h-full bg-[var(--color-canvas)]">
      <div className="mx-auto flex min-h-full max-w-7xl">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-20 w-64 border-r border-[var(--color-border)] bg-white p-4 md:static md:block",
            open ? "block" : "hidden md:block",
          )}
        >
          <div className="mb-6">
            <p className="text-lg font-semibold text-[var(--color-ink)]">PaySell</p>
            <p className="text-xs text-[var(--color-ink-muted)]">Admin console</p>
          </div>
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)]"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-full flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-4 py-3">
            <button
              type="button"
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm md:hidden"
              onClick={() => setOpen((value) => !value)}
            >
              Menu
            </button>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {displayName}
                </p>
                <p className="text-xs text-[var(--color-ink-muted)]">{role}</p>
              </div>
              <form action={logout}>
                <Button variant="secondary" type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
