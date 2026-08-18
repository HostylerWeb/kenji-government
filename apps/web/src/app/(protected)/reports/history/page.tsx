"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { TableScroll } from "@/components/table-scroll";
import { useAuth } from "@/lib/use-auth";
import {
  getReportRuns,
  downloadReportRun,
  type ReportRun,
} from "@/lib/api";

export default function ReportHistoryPage() {
  const { user, token } = useAuth();
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getReportRuns(token, 100)
      .then(setRuns)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  if (!user) return null;

  return (
    <AppShell
      user={user}
      title="Report History"
      breadcrumbs={[
        { label: "Reports", href: "/reports" },
        { label: "History" },
      ]}
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <Card>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No report runs yet.</p>
        ) : (
          <TableScroll>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-4">Report</th>
                <th className="py-2 pr-4">Format</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Requested by</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-border/60">
                  <td className="py-3 pr-4">
                    <Link href={`/reports/${run.slug}`} className="hover:text-primary">
                      {run.title}
                    </Link>
                    {run.is_scheduled && (
                      <span className="ml-2 text-xs text-muted">scheduled</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 uppercase">{run.format}</td>
                  <td className="py-3 pr-4 capitalize">{run.status}</td>
                  <td className="py-3 pr-4">
                    {run.requested_by?.full_name ?? "System"}
                  </td>
                  <td className="py-3 pr-4 text-muted">
                    {new Date(run.created_at).toLocaleString("en-KE")}
                  </td>
                  <td className="py-3">
                    {run.status === "completed" && token && (
                      <button
                        type="button"
                        onClick={() => downloadReportRun(token, run.id)}
                        className="text-primary hover:underline"
                      >
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
        )}
      </Card>
    </AppShell>
  );
}
