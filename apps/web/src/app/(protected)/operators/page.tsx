"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Building2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card, CardContent } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton";
import { getDashboardStats, getOperators, type OperatorListItem } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { formatKsh } from "@/lib/utils";

type ComplianceTab = "compliant" | "at_risk" | "non_compliant";

const COMPLIANCE_TABS: Array<{ id: ComplianceTab; label: string }> = [
  { id: "compliant", label: "Compliant" },
  { id: "at_risk", label: "At Risk" },
  { id: "non_compliant", label: "Non-Compliant" },
];

export default function OperatorsPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [operators, setOperators] = useState<OperatorListItem[]>([]);
  const [complianceTab, setComplianceTab] = useState<ComplianceTab>("compliant");
  const [counts, setCounts] = useState({ compliant: 0, at_risk: 0, non_compliant: 0 });
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    getDashboardStats(token)
      .then((stats) =>
        setCounts({
          compliant: stats.compliant_operators,
          at_risk: stats.at_risk_operators,
          non_compliant: stats.non_compliant_operators,
        })
      )
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    getOperators(token, { search: search || undefined, compliance_status: complianceTab })
      .then(setOperators)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load operators"))
      .finally(() => setLoading(false));
  }, [token, search, complianceTab]);

  if (!user) return null;

  const tabs = COMPLIANCE_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: counts[tab.id],
  }));

  return (
    <AppShell user={user} title="Operators">
      <div className="space-y-5">
        <PageHeader
          title="Operators"
          subtitle="Registry of all licensed raffle operators"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Operators" }]}
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="space-y-4">
            <Tabs
              tabs={tabs}
              active={complianceTab}
              onChange={(id) => setComplianceTab(id as ComplianceTab)}
              variant="underline"
            />
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search by name or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </CardContent>

          {loading ? (
            <div className="border-t border-border/50">
              <SkeletonTable rows={6} />
            </div>
          ) : operators.length === 0 ? (
            <div className="border-t border-border/50">
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title={`No ${complianceLabel(complianceTab).toLowerCase()} operators`}
                description={search ? `No results matching "${search}"` : "Try a different filter."}
              />
            </div>
          ) : (
            <>
              <div className="border-t border-border/50 bg-secondary/30 px-5 py-2 text-xs text-muted-foreground">
                Showing {operators.length} {complianceLabel(complianceTab).toLowerCase()} operator{operators.length !== 1 ? "s" : ""}
                {search ? ` matching "${search}"` : ""}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operator</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Region</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Annual GGR</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tax Due</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((op) => (
                      <tr key={op.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30">
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/operators/${op.external_id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {op.trading_name}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">{op.external_id}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{op.region ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={complianceBadgeVariant(op.compliance_status)} dot>
                            {complianceLabel(op.compliance_status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-sm">{formatKsh(op.annual_ggr)}</td>
                        <td className="px-5 py-3.5 tabular-nums text-sm">{formatKsh(op.tax_due)}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{op.risk_score}</span>
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
    </AppShell>
  );
}
