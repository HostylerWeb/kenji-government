"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  ShieldCheck,
  MapPin,
  CreditCard,
  Users,
  Clock,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/use-auth";
import { getReports, type ReportDefinition } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  commercial: "Commercial",
  compliance: "Compliance",
  regional: "Regional",
  payment: "Payments",
  player_safety: "Player Safety",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  commercial: <BarChart2 className="h-5 w-5" />,
  compliance: <ShieldCheck className="h-5 w-5" />,
  regional: <MapPin className="h-5 w-5" />,
  payment: <CreditCard className="h-5 w-5" />,
  player_safety: <Users className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  commercial: "bg-primary-subtle text-primary",
  compliance: "bg-success-subtle text-success",
  regional: "bg-warning-subtle text-warning",
  payment: "bg-secondary text-muted-foreground",
  player_safety: "bg-danger-subtle text-danger",
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
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Generate and schedule compliance and commercial reports"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]}
          action={
            <div className="flex items-center gap-3">
              <Link href="/reports/scheduled" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Calendar className="h-4 w-4" /> Scheduled
              </Link>
              <Link href="/reports/history" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Clock className="h-4 w-4" /> History
              </Link>
            </div>
          }
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {Array.from(grouped.entries()).map(([category, items]) => (
          <section key={category}>
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${CATEGORY_COLORS[category] ?? "bg-secondary text-muted-foreground"}`}>
                {CATEGORY_ICONS[category] ?? <BarChart2 className="h-4 w-4" />}
              </div>
              <h2 className="text-base font-semibold">{CATEGORY_LABELS[category] ?? category}</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((report) => (
                <Link key={report.slug} href={`/reports/${report.slug}`}>
                  <Card className="group h-full transition-shadow hover:shadow-card-hover">
                    <CardContent className="flex items-start justify-between gap-3 py-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {report.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge variant="muted" size="sm">
                            {report.required_role}
                          </Badge>
                          {report.is_scheduled && (
                            <Badge variant="primary" size="sm">
                              Scheduled
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary mt-0.5 transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
