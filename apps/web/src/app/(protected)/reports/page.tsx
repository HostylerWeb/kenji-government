"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import { getReports, type ReportDefinition } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "Commercial",
  compliance: "Compliance",
  regional: "Regional",
  payment: "Payments",
  player_safety: "Player Safety",
};

export default function ReportsPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getReports(token)
      .then(setReports)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportDefinition[]>();
    for (const report of reports) {
      const list = map.get(report.category) ?? [];
      list.push(report);
      map.set(report.category, list);
    }
    return map;
  }, [reports]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Reports">
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link href="/reports/scheduled" className="text-primary hover:underline">
          Scheduled reports
        </Link>
        <span className="text-muted">·</span>
        <Link href="/reports/history" className="text-primary hover:underline">
          Report history
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="mb-3 text-base font-semibold">
            {CATEGORY_LABELS[category] ?? category}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((report) => (
              <Link key={report.slug} href={`/reports/${report.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <h3 className="font-medium">{report.title}</h3>
                  <p className="mt-2 text-sm text-muted line-clamp-2">
                    {report.description}
                  </p>
                  <p className="mt-3 text-xs text-muted capitalize">
                    Min role: {report.required_role}
                    {report.is_scheduled ? " · Scheduled" : ""}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </AppShell>
  );
}
