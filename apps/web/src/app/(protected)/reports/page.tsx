"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart2,
  ShieldCheck,
  MapPin,
  CreditCard,
  Users,
  Clock,
  Calendar,
  ChevronRight,
  FileBarChart,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { ReportPreviewPanel } from "@/components/report-preview-panel";
import { useAuth } from "@/lib/use-auth";
import { getReports, type ReportDefinition } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  commercial: {
    label: "Commercial",
    icon: <BarChart2 className="h-4 w-4" />,
    color: "bg-primary-subtle text-primary",
  },
  compliance: {
    label: "Compliance",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "bg-success-subtle text-success",
  },
  regional: {
    label: "Regional",
    icon: <MapPin className="h-4 w-4" />,
    color: "bg-warning-subtle text-warning",
  },
  payment: {
    label: "Payments",
    icon: <CreditCard className="h-4 w-4" />,
    color: "bg-secondary text-muted-foreground",
  },
  player_safety: {
    label: "Player Safety",
    icon: <Users className="h-4 w-4" />,
    color: "bg-danger-subtle text-danger",
  },
};

const CATEGORY_ORDER = [
  "commercial",
  "compliance",
  "payment",
  "regional",
  "player_safety",
];

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsPageContent />
    </Suspense>
  );
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const categories = useMemo(
    () =>
      CATEGORY_ORDER.filter((category) => (grouped.get(category)?.length ?? 0) > 0),
    [grouped],
  );

  const activeCategory =
    searchParams.get("category") && categories.includes(searchParams.get("category")!)
      ? searchParams.get("category")!
      : categories[0] ?? "commercial";

  const categoryReports = grouped.get(activeCategory) ?? [];

  const selectedSlug =
    searchParams.get("report") &&
    categoryReports.some((report) => report.slug === searchParams.get("report"))
      ? searchParams.get("report")!
      : categoryReports[0]?.slug ?? null;

  const selectedReport = categoryReports.find((report) => report.slug === selectedSlug) ?? null;

  function selectReport(category: string, slug: string) {
    router.replace(`/reports?category=${category}&report=${slug}`, { scroll: false });
  }

  function selectCategory(category: string) {
    const first = grouped.get(category)?.[0];
    if (first) {
      router.replace(`/reports?category=${category}&report=${first.slug}`, { scroll: false });
    } else {
      router.replace(`/reports?category=${category}`, { scroll: false });
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Reports">
      <div className="space-y-5">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Explore operator, tax, and compliance data interactively — then export what you see"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }]}
          action={
            <div className="flex items-center gap-3">
              <Link
                href="/reports/scheduled"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Calendar className="h-4 w-4" /> Scheduled
              </Link>
              <Link
                href="/reports/history"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Clock className="h-4 w-4" /> History
              </Link>
            </div>
          }
        />

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {categories.length > 0 && (
          <Tabs
            variant="underline"
            active={activeCategory}
            onChange={selectCategory}
            tabs={categories.map((category) => ({
              id: category,
              label: CATEGORY_META[category]?.label ?? category,
              count: grouped.get(category)?.length,
            }))}
          />
        )}

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {CATEGORY_META[activeCategory]?.label ?? activeCategory} reports
            </p>
            {categoryReports.map((report) => {
              const active = report.slug === selectedSlug;
              return (
                <button
                  key={report.slug}
                  type="button"
                  onClick={() => selectReport(activeCategory, report.slug)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                    active
                      ? "border-primary/40 bg-primary-subtle/40 shadow-sm"
                      : "border-border bg-card hover:border-primary/20 hover:bg-secondary/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("font-medium", active && "text-primary")}>
                        {report.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {report.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {report.is_scheduled && (
                          <Badge variant="primary" size="sm">Scheduled</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </aside>

          <section>
            {selectedReport && token ? (
              <ReportPreviewPanel
                key={selectedReport.slug}
                report={selectedReport}
                token={token}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileBarChart className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Select a report to preview charts and data.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
