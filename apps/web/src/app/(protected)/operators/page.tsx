"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card } from "@/components/card";
import { Tabs } from "@/components/tabs";
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
  const [operators, setOperators] = useState<OperatorListItem[]>([]);
  const [complianceTab, setComplianceTab] = useState<ComplianceTab>("compliant");
  const [counts, setCounts] = useState({
    compliant: 0,
    at_risk: 0,
    non_compliant: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getDashboardStats(token)
      .then((stats) =>
        setCounts({
          compliant: stats.compliant_operators,
          at_risk: stats.at_risk_operators,
          non_compliant: stats.non_compliant_operators,
        }),
      )
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    getOperators(token, {
      search: search || undefined,
      compliance_status: complianceTab,
    })
      .then(setOperators)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load operators"),
      )
      .finally(() => setLoading(false));
  }, [token, search, complianceTab]);

  if (!user) return null;

  const tabLabels = COMPLIANCE_TABS.map((tab) => ({
    id: tab.id,
    label: `${tab.label} (${counts[tab.id]})`,
  }));

  return (
    <AppShell user={user} title="Operators">
      <Card className="mb-6 space-y-4">
        <Tabs
          tabs={tabLabels}
          active={complianceTab}
          onChange={(id) => setComplianceTab(id as ComplianceTab)}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search operators by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading operators...</p>
      ) : operators.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted">
          No {complianceLabel(complianceTab).toLowerCase()} operators
          {search ? " match your search" : ""}.
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-secondary/30 px-4 py-2 text-xs text-muted">
            Showing {operators.length} {complianceLabel(complianceTab).toLowerCase()}{" "}
            operator{operators.length === 1 ? "" : "s"}
            {search ? ` matching “${search}”` : ""}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Compliance</th>
                  <th className="px-4 py-3 font-medium">Annual GGR</th>
                  <th className="px-4 py-3 font-medium">Tax Due</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr
                    key={op.id}
                    className="border-b border-border last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/operators/${op.external_id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {op.trading_name}
                      </Link>
                      <p className="text-xs text-muted">{op.external_id}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{op.region ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={complianceBadgeVariant(op.compliance_status)}>
                        {complianceLabel(op.compliance_status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{formatKsh(op.annual_ggr)}</td>
                    <td className="px-4 py-3">{formatKsh(op.tax_due)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{op.risk_score}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
