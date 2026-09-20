"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate } from "@/lib/admin/format";
import {
  mergeStaffNotifications,
  STAFF_NOTIFICATION_POLL_MS,
  STAFF_NOTIFICATION_SEEN_KEY,
  toStaffNotification,
  unreadStaffNotifications,
  type StaffNotification,
} from "@/lib/admin/notifications";
import { tryCreateBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsEvent } from "@/types/database";

export function NotificationBell() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StaffNotification[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const unread = useMemo(() => unreadStaffNotifications(items, seenAt), [items, seenAt]);

  const rememberSeen = useCallback((value: string) => {
    setSeenAt(value);
    window.localStorage.setItem(STAFF_NOTIFICATION_SEEN_KEY, value);
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { notifications?: StaffNotification[] };
      setItems(body.notifications ?? []);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    setSeenAt(window.localStorage.getItem(STAFF_NOTIFICATION_SEEN_KEY));
    void load();
    const poll = window.setInterval(() => {
      void load();
    }, STAFF_NOTIFICATION_POLL_MS);

    const supabase = tryCreateBrowserClient();
    if (!supabase) {
      return () => window.clearInterval(poll);
    }

    const channel = supabase
      .channel("admin-staff-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        (payload) => {
          const incoming = toStaffNotification(payload.new as AnalyticsEvent);
          if (!incoming) {
            return;
          }
          setItems((current) => mergeStaffNotifications(current, [incoming]));
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function markAllRead() {
    rememberSeen(new Date().toISOString());
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <BellIcon />
        {unread.length > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-5 text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Recent updates"
          className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--color-ink)]">Updates</p>
            <button
              type="button"
              className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              onClick={markAllRead}
            >
              Mark as read
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-[var(--color-ink-muted)]">
              No orders, membership, or support updates yet.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => {
                const isUnread = unread.some((row) => row.id === item.id);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        rememberSeen(new Date().toISOString());
                        setOpen(false);
                      }}
                      className={cn(
                        "block px-3 py-2.5 hover:bg-[var(--color-surface-muted)]",
                        isUnread && "bg-[var(--color-brand-soft)]/40",
                      )}
                    >
                      <p className="text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        {formatDate(item.createdAt)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
      />
    </svg>
  );
}
