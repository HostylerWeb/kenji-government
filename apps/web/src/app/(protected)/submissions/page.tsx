"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import {
  getSubmissions,
  reviewSubmission,
  downloadWithAuth,
  type SubmissionItem,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

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

export default function SubmissionsPage() {
  const { user, token } = useAuth();
  const [status, setStatus] = useState("pending");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getSubmissions(token, status)
      .then(setSubmissions)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, status]);

  async function handleReview(
    id: string,
    newStatus: "approved" | "rejected" | "revision_requested",
  ) {
    if (!token) return;
    const notes = prompt("Notes (optional):");
    await reviewSubmission(token, id, newStatus, notes ?? undefined);
    const updated = await getSubmissions(token, status);
    setSubmissions(updated);
  }

  if (!user) return null;

  const canReview = user.role === "admin" || user.role === "supervisor";

  return (
    <AppShell user={user} title="Submissions Queue">
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2">
          {["pending", "approved", "rejected", "revision_requested"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                status === s
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted hover:text-foreground"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
          <button
            onClick={() => {
              if (!token) return;
              downloadWithAuth(token, `/submissions/export?status=${status}`).then(
                (blob) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "submissions.csv";
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-muted">
            <tr>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">GGR</th>
              <th className="px-4 py-3">Tax Outstanding</th>
              {canReview && status === "pending" && (
                <th className="px-4 py-3">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/operators/${s.operator?.external_id}`}
                    className="font-medium hover:text-primary"
                  >
                    {s.operator?.trading_name}
                  </Link>
                </td>
                <td className="px-4 py-3">{s.reporting_period?.label}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3">{formatKsh(s.gross_gaming_revenue)}</td>
                <td className="px-4 py-3">{formatKsh(s.tax_outstanding)}</td>
                {canReview && status === "pending" && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(s.id, "approved")}
                        className="text-xs text-success hover:underline"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(s.id, "rejected")}
                        className="text-xs text-danger hover:underline"
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
    </AppShell>
  );
}
