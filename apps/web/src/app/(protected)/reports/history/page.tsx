"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { ReportHistoryTable } from "@/components/report-history-table";
import { useAuth } from "@/lib/use-auth";
import { getReportRuns, downloadReportRun, type ReportRun } from "@/lib/api";

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
    <AppShell user={user} title="Report History">
      <PageHeader
        title="Report History"
        subtitle="Past exports — sort columns to find runs quickly"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "History" },
        ]}
      />

      {error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="py-4">
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No report runs yet.{" "}
              <Link href="/reports" className="text-primary hover:underline">
                Explore reports
              </Link>
            </p>
          ) : (
            <ReportHistoryTable
              runs={runs}
              onDownload={(runId) => {
                if (token) downloadReportRun(token, runId);
              }}
            />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
