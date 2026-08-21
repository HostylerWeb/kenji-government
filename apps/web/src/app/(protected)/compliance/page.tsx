"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { SkeletonCard } from "@/components/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  ComplianceAlertsSection,
  ComplianceCalendarSection,
} from "@/components/compliance-calendar";
import { useAuth } from "@/lib/use-auth";
import { getComplianceOverview, type ComplianceOverview } from "@/lib/api";
import { cn, formatKsh } from "@/lib/utils";

type OperatorRow = ComplianceOverview["operators"][number];
type SortKey = "operator" | "status" | "tax_outstanding" | "licence";
type SortDir = "asc" | "desc";

const COMPLIANCE_ORDER: Record<string, number> = {
  compliant: 0,
  at_risk: 1,
  non_compliant: 2,
};

const NUMERIC_SORT_DEFAULTS: Partial<Record<SortKey, SortDir>> = {
  tax_outstanding: "desc",
  licence: "desc",
};

function compareValues(a: OperatorRow, b: OperatorRow, key: SortKey): number {
  switch (key) {
    case "operator":
      return a.trading_name.localeCompare(b.trading_name, "en-KE");
    case "status":
      return (
        (COMPLIANCE_ORDER[a.compliance_status] ?? 99) -
        (COMPLIANCE_ORDER[b.compliance_status] ?? 99)
      );
    case "tax_outstanding":
      return Number(a.tax_outstanding ?? 0) - Number(b.tax_outstanding ?? 0);
    case "licence":
      return Number(a.licence_expiring) - Number(b.licence_expiring);
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

function OperatorComplianceTiersTable({ operators }: { operators: OperatorRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(NUMERIC_SORT_DEFAULTS[key] ?? "asc");
  }

  const sortedOperators = useMemo(() => {
    if (!sortKey) return operators;
    const sorted = [...operators].sort((a, b) => compareValues(a, b, sortKey));
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [operators, sortKey, sortDir]);

  return (
    <Card>
      <CardHeader><CardTitle>Operator Compliance Tiers</CardTitle></CardHeader>
      <CardContent className="p-0">
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
                  label="Status"
                  sortKey="status"
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
                  label="Licence"
                  sortKey="licence"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedOperators.map((op) => (
                <tr
                  key={op.external_id}
                  className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/operators/${op.external_id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {op.trading_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={complianceBadgeVariant(op.compliance_status)} dot>
                      {complianceLabel(op.compliance_status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 tabular-nums">
                    {formatKsh(op.tax_outstanding)}
                  </td>
                  <td className="px-5 py-3.5">
                    {op.licence_expiring ? (
                      <Badge variant="warning" dot>Expiring soon</Badge>
                    ) : (
                      <Badge variant="success" dot>Active</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CompliancePage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<ComplianceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getComplianceOverview(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Compliance Calendar">
      <div className="space-y-5">
        <PageHeader
          title="Compliance Calendar"
          subtitle="Track filing deadlines, licence renewals, and operator compliance tiers"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Compliance" }]}
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          </div>
        ) : data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Compliant"
                value={String(data.tiers.compliant)}
                icon={<ShieldCheck className="h-5 w-5" />}
                variant="success"
              />
              <StatCard
                title="At Risk"
                value={String(data.tiers.at_risk)}
                icon={<AlertTriangle className="h-5 w-5" />}
                variant="warning"
              />
              <StatCard
                title="Non-Compliant"
                value={String(data.tiers.non_compliant)}
                icon={<XCircle className="h-5 w-5" />}
                variant="danger"
              />
              <StatCard
                title="Total Arrears"
                value={formatKsh(data.total_arrears)}
                icon={<DollarSign className="h-5 w-5" />}
                variant={Number(data.total_arrears) > 0 ? "danger" : "default"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Upcoming Deadlines"
                value={String(data.calendar_summary.upcoming_deadlines)}
                icon={<Calendar className="h-5 w-5" />}
              />
              <StatCard
                title="Overdue Filings"
                value={String(data.calendar_summary.overdue_filings)}
                icon={<AlertTriangle className="h-5 w-5" />}
                variant={data.calendar_summary.overdue_filings > 0 ? "danger" : "default"}
              />
              <StatCard
                title="Pending Review"
                value={String(data.calendar_summary.pending_review)}
                icon={<Clock className="h-5 w-5" />}
                variant={data.calendar_summary.pending_review > 0 ? "warning" : "default"}
              />
              <StatCard
                title="Expiring Licences"
                value={String(data.calendar_summary.expiring_licences)}
                icon={<FileText className="h-5 w-5" />}
                variant={data.calendar_summary.expiring_licences > 0 ? "warning" : "default"}
              />
            </div>

            <ComplianceCalendarSection data={data} />
            <ComplianceAlertsSection data={data} />
            <OperatorComplianceTiersTable operators={data.operators} />
          </>
        )}
      </div>
    </AppShell>
  );
}
