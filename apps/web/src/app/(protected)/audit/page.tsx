"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
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

  return (
    <AppShell user={user} title="Audit Log">
      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Action</label>
            <input
              type="search"
              placeholder="Filter by action..."
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {user.role === "admin" && (
            <div>
              <label className="mb-1 block text-xs text-muted">User</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">All users</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-muted">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          {canExport && (
            <button
              onClick={() => {
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
              }}
              className="text-sm text-primary hover:underline"
            >
              Export CSV
            </button>
          )}
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-muted">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs">
                  {new Date(log.created_at).toLocaleString("en-KE")}
                </td>
                <td className="px-4 py-3">
                  {log.user?.full_name ?? "—"}
                  <span className="block text-xs text-muted">{log.user?.email}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                <td className="px-4 py-3 text-xs">
                  {log.entity_type}
                  {log.entity_id && ` / ${log.entity_id.slice(0, 8)}…`}
                </td>
                <td className="px-4 py-3 text-xs text-muted">{log.ip_address ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
