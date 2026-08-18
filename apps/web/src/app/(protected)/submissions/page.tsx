"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { useAuth } from "@/lib/use-auth";
import {
  getSubmissions,
  getSubmissionStats,
  reviewSubmission,
  downloadWithAuth,
  type SubmissionItem,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

type SubmissionStatus = "approved" | "pending" | "revision_requested" | "rejected";

const STATUS_TABS: Array<{ id: SubmissionStatus; label: string }> = [
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "revision_requested", label: "Revision Requested" },
  { id: "rejected", label: "Rejected" },
];

function statusVariant(status: string) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    case "revision_requested":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "revision_requested":
      return "Revision Requested";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

export default function SubmissionsPage() {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<SubmissionStatus>("approved");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getSubmissionStats(token).then(setCounts).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    getSubmissions(token, status)
      .then(setSubmissions)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, status]);

  async function refreshList() {
    if (!token) return;
    const [list, stats] = await Promise.all([
      getSubmissions(token, status),
      getSubmissionStats(token),
    ]);
    setSubmissions(list);
    setCounts(stats);
  }

  async function handleReview(
    id: string,
    newStatus: "approved" | "rejected" | "revision_requested",
  ) {
    if (!token) return;
    const notes = prompt("Notes (optional):");
    await reviewSubmission(token, id, newStatus, notes ?? undefined);
    await refreshList();
  }

  if (!user) return null;

  const canReview = user.role === "admin" || user.role === "supervisor";
  const tabLabels = STATUS_TABS.map((tab) => ({
    id: tab.id,
    label: `${tab.label} (${counts[tab.id] ?? 0})`,
  }));

  return (
    <AppShell user={user} title="Submissions Queue">
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <Tabs
            tabs={tabLabels}
            active={status}
            onChange={(id) => setStatus(id as SubmissionStatus)}
          />
          <button
            onClick={() => {
              if (!token) return;
              downloadWithAuth(token, `/submissions/export?status=${status}`).then(
                (blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `submissions-${status}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                },
              );
            }}
            className="ml-auto text-sm text-primary hover:underline"
          >
            Export CSV
          </button>
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted">
          No {statusLabel(status).toLowerCase()} submissions.
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-secondary/30 px-4 py-2 text-xs text-muted">
            {submissions.length} {statusLabel(status).toLowerCase()} submission
            {submissions.length === 1 ? "" : "s"}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">GGR</th>
                  <th className="px-4 py-3 font-medium">Tax Outstanding</th>
                  {canReview && status === "pending" && (
                    <th className="px-4 py-3 font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/operators/${s.operator?.external_id}`}
                        className="font-medium hover:text-primary"
                      >
                        {s.operator?.trading_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.reporting_period?.label ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(s.status)}>
                        {statusLabel(s.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatKsh(s.gross_gaming_revenue)}</td>
                    <td className="px-4 py-3">{formatKsh(s.tax_outstanding)}</td>
                    {canReview && status === "pending" && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleReview(s.id, "approved")}
                            className="text-xs font-medium text-success hover:underline"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(s.id, "revision_requested")}
                            className="text-xs font-medium text-warning hover:underline"
                          >
                            Request revision
                          </button>
                          <button
                            onClick={() => handleReview(s.id, "rejected")}
                            className="text-xs font-medium text-danger hover:underline"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
