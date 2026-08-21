"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import type { AppNotification } from "@kenji-government/shared";
import { cn } from "@/lib/utils";
import { getNotifications } from "@/lib/api";
import { getStoredAuth } from "@/lib/auth";
import {
  countUnreadNotificationIds,
  getReadNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-read-state";

const SEVERITY_DOT: Record<AppNotification["severity"], string> = {
  info: "bg-[#00a551]",
  warning: "bg-amber-500",
  danger: "bg-[#c12d31]",
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) {
    const futureDays = Math.ceil(-diffMs / 86_400_000);
    if (futureDays <= 0) return "Today";
    if (futureDays === 1) return "Tomorrow";
    if (futureDays < 7) return `In ${futureDays}d`;
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
    });
  }

  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationsBell() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readRevision, setReadRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const auth = getStoredAuth();
    if (!auth) return;

    if (options?.silent) {
      setRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setInitialLoading(true);
    }

    try {
      const data = await getNotifications(auth.access_token);
      setItems(data.items);
      setError(null);
      hasLoadedRef.current = true;
    } catch (err) {
      if (!hasLoadedRef.current) {
        setItems([]);
      }
      setError(
        err instanceof Error ? err.message : "Failed to load notifications",
      );
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ silent: true }), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    load({ silent: true });
  }, [pathname, load]);

  useEffect(() => {
    const onReadChange = () => setReadRevision((value) => value + 1);
    window.addEventListener("gra-notifications-read", onReadChange);
    return () =>
      window.removeEventListener("gra-notifications-read", onReadChange);
  }, []);

  useEffect(() => {
    if (!open) return;

    load({ silent: true });

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, load]);

  const readIds = getReadNotificationIds();
  void readRevision;
  const unreadCount = countUnreadNotificationIds(items.map((item) => item.id));

  function handleOpenItem(item: AppNotification) {
    markNotificationRead(item.id);
    setOpen(false);
  }

  function handleMarkAllRead() {
    markAllNotificationsRead(items.map((item) => item.id));
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c12d31] px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications menu"
          className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => load({ silent: true })}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Refresh notifications"
                disabled={refreshing}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
                />
              </button>
              {items.length > 0 && unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {initialLoading ? (
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="animate-pulse space-y-2">
                    <div className="h-3 w-28 rounded bg-slate-200" />
                    <div className="h-2.5 w-full rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-danger">{error}</p>
                <button
                  type="button"
                  onClick={() => load()}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No active alerts. You are all caught up.
              </div>
            ) : (
              <ul>
                {items.map((item) => {
                  const isUnread = !readIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <Link
                        href={item.href}
                        role="menuitem"
                        onClick={() => handleOpenItem(item)}
                        className={cn(
                          "flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-slate-50",
                          isUnread && "bg-primary/[0.03]",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              SEVERITY_DOT[item.severity],
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={cn(
                                  "text-sm text-slate-900",
                                  isUnread ? "font-semibold" : "font-medium",
                                )}
                              >
                                {item.title}
                              </p>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {formatWhen(item.created_at)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                              {item.message}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border bg-slate-50/80 px-4 py-2.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-primary hover:underline"
            >
              View dashboard alerts
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
