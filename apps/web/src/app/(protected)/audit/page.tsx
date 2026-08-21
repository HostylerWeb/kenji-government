"use client";

import { useEffect, useState } from "react";
import { Download, Shield, LogIn, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatAuditActionLabel, formatAuditSummary } from "@kenji-government/shared";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/card";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TableScroll } from "@/components/table-scroll";
import { Tabs } from "@/components/tabs";
import { toast } from "@/components/toast";
import { useAuth } from "@/lib/use-auth";
import {
  getAuditLogs,
  getUsers,
  downloadWithAuth,
  wipeAuditLogs,
  type AuditLogItem,
  type StaffUser,
} from "@/lib/api";

const PAGE_SIZE = 50;

const AUDIT_TABS = [
  { id: "platform", label: "Platform Activity" },
  { id: "auth", label: "Login & Security" },
];

export default function AuditPage() {
  const { user, token } = useAuth();
  const [category, setCategory] = useState<"auth" | "platform">("platform");
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [wiping, setWiping] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  useEffect(() => {
    if (!token || (user?.role !== "admin" && user?.role !== "super_admin")) return;
    getUsers(token).then(setStaff).catch(() => {});
  }, [token, user?.role]);

  useEffect(() => {
    setPage(1);
  }, [category, search, userId, from, to]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    getAuditLogs(token, {
      category,
      action: search || undefined,
      user_id: userId || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((result) => {
        setLogs(result.items);
        setTotal(result.total);
        setTotalPages(result.total_pages);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, category, search, userId, from, to, page]);

  if (!user) return null;

  const canExport =
    user.role === "admin" ||
    user.role === "super_admin" ||
    user.role === "auditor";

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  function handleExport() {
    if (!token) return;
    const qs = new URLSearchParams();
    qs.set("category", category);
    if (search) qs.set("action", search);
    if (userId) qs.set("user_id", userId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const path = `/audit-logs/export?${qs.toString()}`;
    downloadWithAuth(token, path).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${category}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function handleWipe() {
    if (!token || !isSuperAdmin) return;
    if (
      !window.confirm(
        "Permanently delete ALL audit log entries? This cannot be undone. A single record of this wipe will remain.",
      )
    ) {
      return;
    }
    setWiping(true);
    try {
      const result = await wipeAuditLogs(token);
      toast.success(`Cleared ${result.deleted_count} audit log entries.`);
      setPage(1);
      const refreshed = await getAuditLogs(token, {
        category,
        page: 1,
        page_size: PAGE_SIZE,
      });
      setLogs(refreshed.items);
      setTotal(refreshed.total);
      setTotalPages(refreshed.total_pages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to wipe audit logs");
    } finally {
      setWiping(false);
    }
  }

  return (
    <AppShell user={user} title="Audit Log">
      <div className="space-y-5">
        <PageHeader
          title="Audit Log"
          subtitle="Important user actions across the platform — enforcement, submissions, account security, and more"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit Log" }]}
          action={
            <div className="flex flex-wrap gap-2">
              {isSuperAdmin && (
                <Button
                  size="sm"
                  variant="danger"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  loading={wiping}
                  onClick={handleWipe}
                >
                  Wipe Logs
                </Button>
              )}
              {canExport ? (
                <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
                  Export CSV
                </Button>
              ) : null}
            </div>
          }
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        <Card>
          <CardContent className="space-y-4">
            <Tabs
              tabs={AUDIT_TABS}
              active={category}
              onChange={(id) => setCategory(id as "auth" | "platform")}
              variant="underline"
            />

            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Search activity</label>
                <input
                  type="search"
                  placeholder="Search by action or keyword…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              {user.role === "admin" || user.role === "super_admin" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">User</label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All users</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>
          </CardContent>

          <CardContent className="border-t border-border/50 p-0">
            {loading ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">Loading audit entries…</div>
            ) : logs.length === 0 ? (
              <EmptyState
                icon={category === "auth" ? <LogIn className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
                title={`No ${category === "auth" ? "login or security" : "platform"} activity`}
                description="No important actions match the current filters."
                className="py-10"
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-secondary/20 px-5 py-2.5 text-xs text-muted-foreground">
                  <span>
                    Showing {rangeStart}–{rangeEnd} of {total} entries
                  </span>
                  <span>Page {page} of {totalPages}</span>
                </div>
                <TableScroll>
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/50">
                      <tr>
                        {["Timestamp", "User", "Activity", "Details", "IP"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                          <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("en-KE")}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-medium">{log.user?.full_name ?? "System"}</span>
                            <span className="block text-xs text-muted-foreground">{log.user?.email ?? "—"}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="font-medium text-foreground">
                              {formatAuditActionLabel(log.action)}
                            </span>
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {log.entity_type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-md">
                            {formatAuditSummary(log.action, log.metadata ?? undefined)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {log.ip_address ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<ChevronLeft className="h-4 w-4" />}
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      rightIcon={<ChevronRight className="h-4 w-4" />}
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
