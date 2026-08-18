"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card } from "@/components/card";
import { getOperators, type OperatorListItem } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { formatKsh } from "@/lib/utils";

export default function OperatorsPage() {
  const { user, token } = useAuth();
  const [operators, setOperators] = useState<OperatorListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    getOperators(token, { search: search || undefined })
      .then(setOperators)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load operators"))
      .finally(() => setLoading(false));
  }, [token, search]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Operators">
      <Card className="mb-6">
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                  <tr key={op.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
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
