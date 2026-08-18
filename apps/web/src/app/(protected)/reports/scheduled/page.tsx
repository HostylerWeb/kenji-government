"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import { getScheduledReports, type ReportDefinition } from "@/lib/api";

export default function ScheduledReportsPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getScheduledReports(token)
      .then(setReports)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  if (!user) return null;

  return (
    <AppShell
      user={user}
      title="Scheduled Reports"
      breadcrumbs={[
        { label: "Reports", href: "/reports" },
        { label: "Scheduled" },
      ]}
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <Card>
        <p className="text-sm text-muted">
          Reports below run automatically at <strong>06:00 EAT</strong> (03:00 UTC) when the
          worker is running. Completed PDFs are emailed to configured stakeholders when SMTP is
          set, otherwise logged to the worker console.
        </p>
      </Card>

      <ul className="mt-6 space-y-3">
        {reports.map((report) => (
          <li key={report.slug} className="rounded-lg border border-border p-4">
            <Link
              href={`/reports/${report.slug}`}
              className="font-medium hover:text-primary"
            >
              {report.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{report.description}</p>
            <p className="mt-2 text-xs text-muted">
              Cadence: {report.schedule_cadence ?? "daily"} · Recipients:{" "}
              {(report.schedule_recipients as string[] | null)?.join(", ") ?? "—"}
            </p>
          </li>
        ))}
        {reports.length === 0 && (
          <p className="text-sm text-muted">No scheduled reports available for your role.</p>
        )}
      </ul>
    </AppShell>
  );
}
