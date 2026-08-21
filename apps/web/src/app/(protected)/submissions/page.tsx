"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  FileText,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card, CardContent } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton";
import { Button } from "@/components/button";
import { SubmissionReviewPanel } from "@/components/submission-review-panel";
import { useAuth } from "@/lib/use-auth";
import {
  getSubmissions,
  getSubmissionStats,
  downloadWithAuth,
  type SubmissionItem,
} from "@/lib/api";
import {
  canReviewSubmissions,
  submissionStatusLabel,
  submissionStatusVariant,
  submissionTabTone,
} from "@/lib/submissions";
import { cn, formatKsh } from "@/lib/utils";

type SubmissionStatus = "approved" | "pending" | "revision_requested" | "rejected";
type SortKey =
  | "operator"
  | "period"
  | "ggr"
  | "tax_outstanding"
  | "documents"
  | "submitted";
type SortDir = "asc" | "desc";
type DocumentsFilter = "all" | "with_documents" | "missing_documents";

const STATUS_TABS: Array<{ id: SubmissionStatus; label: string }> = [
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "revision_requested", label: "Revision Requested" },
  { id: "rejected", label: "Rejected" },
];

const NUMERIC_SORT_DEFAULTS: Partial<Record<SortKey, SortDir>> = {
  ggr: "desc",
  tax_outstanding: "desc",
  documents: "desc",
  submitted: "desc",
  period: "desc",
};

const FILTER_SELECT_CLASS =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

function compareSubmissions(a: SubmissionItem, b: SubmissionItem, key: SortKey): number {
  switch (key) {
    case "operator":
      return (a.operator?.trading_name ?? "").localeCompare(
        b.operator?.trading_name ?? "",
        "en-KE",
      );
    case "period": {
      const periodA = a.reporting_period as
        | { year?: number; month?: number; label?: string }
        | undefined;
      const periodB = b.reporting_period as
        | { year?: number; month?: number; label?: string }
        | undefined;
      const yearDiff = (periodA?.year ?? 0) - (periodB?.year ?? 0);
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = (periodA?.month ?? 0) - (periodB?.month ?? 0);
      if (monthDiff !== 0) return monthDiff;
      return (periodA?.label ?? "").localeCompare(periodB?.label ?? "", "en-KE");
    }
    case "ggr":
      return Number(a.gross_gaming_revenue ?? 0) - Number(b.gross_gaming_revenue ?? 0);
    case "tax_outstanding":
      return Number(a.tax_outstanding ?? 0) - Number(b.tax_outstanding ?? 0);
    case "documents":
      return (a.documents?.length ?? 0) - (b.documents?.length ?? 0);
    case "submitted":
      return (
        new Date(a.submitted_at ?? 0).getTime() -
        new Date(b.submitted_at ?? 0).getTime()
      );
    default:
      return 0;
  }
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  direction: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th className={cn("px-5 py-3", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </th>
  );
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={null}>
      <SubmissionsPageContent />
    </Suspense>
  );
}

function SubmissionsPageContent() {
  const { user, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SubmissionStatus>("pending");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [documentsFilter, setDocumentsFilter] =
    useState<DocumentsFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey | null>("submitted");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function updateReviewInUrl(nextReviewId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextReviewId) {
      params.set("review", nextReviewId);
    } else {
      params.delete("review");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function openReview(id: string) {
    setReviewId(id);
    updateReviewInUrl(id);
  }

  function closeReview() {
    setReviewId(null);
    updateReviewInUrl(null);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(NUMERIC_SORT_DEFAULTS[key] ?? "asc");
  }

  function clearFilters() {
    setSearch("");
    setOperatorFilter("all");
    setPeriodFilter("all");
    setDocumentsFilter("all");
  }

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (
      statusParam === "approved" ||
      statusParam === "pending" ||
      statusParam === "revision_requested" ||
      statusParam === "rejected"
    ) {
      setStatus(statusParam);
    }
    const reviewParam = searchParams.get("review");
    if (reviewParam) {
      setReviewId(reviewParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    getSubmissionStats(token).then(setCounts).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    clearFilters();
    setSortKey("submitted");
    setSortDir("desc");
    getSubmissions(token, status)
      .then(setSubmissions)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, status]);

  const operatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const submission of submissions) {
      const externalId = submission.operator?.external_id;
      const name = submission.operator?.trading_name;
      if (externalId && name) {
        map.set(externalId, name);
      }
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "en-KE"));
  }, [submissions]);

  const periodOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const submission of submissions) {
      const period = submission.reporting_period as
        | { id?: string; label?: string; year?: number; month?: number }
        | undefined;
      if (!period?.label) continue;
      const value = period.id ?? period.label;
      map.set(value, period.label);
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.label.localeCompare(a.label, "en-KE"));
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const operatorName = submission.operator?.trading_name ?? "";
      const operatorId = submission.operator?.external_id ?? "";
      const period = submission.reporting_period as
        | { id?: string; label?: string }
        | undefined;
      const periodValue = period?.id ?? period?.label ?? "";
      const documentCount = submission.documents?.length ?? 0;

      if (operatorFilter !== "all" && operatorId !== operatorFilter) {
        return false;
      }

      if (periodFilter !== "all" && periodValue !== periodFilter) {
        return false;
      }

      if (documentsFilter === "with_documents" && documentCount === 0) {
        return false;
      }

      if (documentsFilter === "missing_documents" && documentCount > 0) {
        return false;
      }

      if (!query) return true;

      return (
        operatorName.toLowerCase().includes(query) ||
        operatorId.toLowerCase().includes(query) ||
        (period?.label ?? "").toLowerCase().includes(query)
      );
    });
  }, [submissions, search, operatorFilter, periodFilter, documentsFilter]);

  const visibleSubmissions = useMemo(() => {
    if (!sortKey) return filteredSubmissions;
    const sorted = [...filteredSubmissions].sort((a, b) =>
      compareSubmissions(a, b, sortKey),
    );
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [filteredSubmissions, sortKey, sortDir]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    operatorFilter !== "all" ||
    periodFilter !== "all" ||
    documentsFilter !== "all";

  async function refreshList() {
    if (!token) return;
    const [list, stats] = await Promise.all([
      getSubmissions(token, status),
      getSubmissionStats(token),
    ]);
    setSubmissions(list);
    setCounts(stats);
  }

  function handleExport() {
    if (!token) return;
    downloadWithAuth(token, `/submissions/export?status=${status}`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions-${status}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (!user) return null;
  const canReview = canReviewSubmissions(user.role);

  const tabs = STATUS_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: counts[tab.id] ?? 0,
    tone: submissionTabTone(tab.id),
  }));

  return (
    <AppShell user={user} title="Submissions Queue">
      <div className="space-y-5">
        <PageHeader
          title="Submissions Queue"
          subtitle="Review and process operator monthly returns"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Submissions" }]}
          action={
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="space-y-4 pb-0">
            <Tabs
              tabs={tabs}
              active={status}
              onChange={(id) => setStatus(id as SubmissionStatus)}
              variant="underline"
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search operator or period…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className={FILTER_SELECT_CLASS}
                aria-label="Filter by operator"
              >
                <option value="all">All operators</option>
                {operatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className={FILTER_SELECT_CLASS}
                aria-label="Filter by period"
              >
                <option value="all">All periods</option>
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={documentsFilter}
                onChange={(e) =>
                  setDocumentsFilter(e.target.value as DocumentsFilter)
                }
                className={FILTER_SELECT_CLASS}
                aria-label="Filter by documents"
              >
                <option value="all">All documents</option>
                <option value="with_documents">With documents</option>
                <option value="missing_documents">Missing documents</option>
              </select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  leftIcon={<X className="h-3.5 w-3.5" />}
                  className="self-center"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>

          {loading ? (
            <div className="border-t border-border/50 pt-2">
              <SkeletonTable rows={5} />
            </div>
          ) : submissions.length === 0 ? (
            <div className="border-t border-border/50">
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title={`No ${submissionStatusLabel(status).toLowerCase()} submissions`}
                description="Nothing to show for this status."
              />
            </div>
          ) : visibleSubmissions.length === 0 ? (
            <div className="border-t border-border/50">
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No matching submissions"
                description="Try adjusting your search or filters."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="border-t border-border/50 bg-secondary/30 px-5 py-2 text-xs text-muted-foreground">
                Showing {visibleSubmissions.length} of {submissions.length}{" "}
                {submissionStatusLabel(status).toLowerCase()} submission
                {submissions.length !== 1 ? "s" : ""}
                {hasActiveFilters ? " matching filters" : ""}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <SortableHeader
                        label="Operator"
                        sortKey="operator"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Period"
                        sortKey="period"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Status
                      </th>
                      <SortableHeader
                        label="GGR"
                        sortKey="ggr"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Tax Outstanding"
                        sortKey="tax_outstanding"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Documents"
                        sortKey="documents"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Submitted"
                        sortKey="submitted"
                        activeKey={sortKey}
                        direction={sortDir}
                        onSort={handleSort}
                      />
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubmissions.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30">
                        <td className="px-5 py-3.5">
                          <Link href={`/operators/${s.operator?.external_id}`} className="font-medium hover:text-primary transition-colors">
                            {s.operator?.trading_name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{s.reporting_period?.label ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={submissionStatusVariant(s.status)} dot>
                            {submissionStatusLabel(s.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.gross_gaming_revenue)}</td>
                        <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.tax_outstanding)}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {s.documents?.length ?? 0}
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {s.submitted_at
                            ? new Date(s.submitted_at).toLocaleDateString("en-KE", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <Button
                            size="xs"
                            variant="outline"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => openReview(s.id)}
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      <SubmissionReviewPanel
        open={!!reviewId}
        submissionId={reviewId}
        token={token}
        canReview={canReview}
        userRole={user.role}
        onClose={closeReview}
        onReviewed={refreshList}
      />
    </AppShell>
  );
}
