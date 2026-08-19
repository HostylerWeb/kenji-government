"use client";

import { useEffect, useState } from "react";
import { Download, ClipboardList } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/card";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { TableScroll } from "@/components/table-scroll";
import { useAuth } from "@/lib/use-auth";
import {
  getAuditLogs,
  getUsers,
  downloadWithAuth,
  type AuditLogItem,
  type StaffUser,
} from "@/lib/api";

export default function AuditPage() {
  const { user, token } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    getUsers(token).then(setStaff).catch(() => {});
  }, [token, user?.role]);

  useEffect(() => {
    if (!token) return;
    getAuditLogs(token, {
      action: action || undefined,
      user_id: userId || undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then(setLogs)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, action, userId, from, to]);

  if (!user) return null;

  const canExport = user.role === "admin" || user.role === "auditor";

  function handleExport() {
    if (!token) return;
    const qs = new URLSearchParams();
    if (action) qs.set("action", action);
    if (userId) qs.set("user_id", userId);
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const path = `/audit-logs/export${qs.toString() ? `?${qs}` : ""}`;
    downloadWithAuth(token, path).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <AppShell user={user} title="Audit Log">
      <div className="space-y-5">
        <PageHeader
          title="Audit Log"
          subtitle="Full tamper-evident history of all system actions"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit Log" }]}
          action={
            canExport ? (
              <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
                Export CSV
              </Button>
            ) : undefined
          }
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        <Card>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Action</label>
              <input
                type="search"
                placeholder="Filter by action…"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {user.role === "admin" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">User</label>
                <select value={userId} onChange={(e) => setUserId(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">All users</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          </CardContent>

          <CardContent className="p-0 border-t border-border/50">
            {logs.length === 0 ? (
              <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No audit logs" description="No actions match the current filter." className="py-10" />
            ) : (
              <TableScroll>
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      {["Timestamp", "User", "Action", "Entity", "IP"].map((h) => (
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
                          <span className="font-medium">{log.user?.full_name ?? "—"}</span>
                          <span className="block text-xs text-muted-foreground">{log.user?.email}</span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs">{log.action}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {log.entity_type}{log.entity_id && ` / ${log.entity_id.slice(0, 8)}…`}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{log.ip_address ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
