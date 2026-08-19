"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, XCircle, DollarSign, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonCard, SkeletonTable } from "@/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/use-auth";
import { getComplianceOverview, type ComplianceOverview } from "@/lib/api";
import { formatKsh } from "@/lib/utils";

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
    <AppShell user={user} title="Compliance Overview">
      <div className="space-y-5">
        <PageHeader
          title="Compliance Overview"
          subtitle="Operator compliance tiers, tax arrears and overdue submissions"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Compliance" }]}
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
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

            <Card>
              <CardHeader>
                <CardTitle>
                  Overdue Submissions
                  {data.overdue_submission_count > 0 && (
                    <Badge variant="danger" size="sm" className="ml-2">{data.overdue_submission_count}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.overdue_submissions.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    title="No overdue submissions"
                    description="All operators are up to date with their submissions."
                    className="py-8"
                  />
                ) : (
                  <ul className="divide-y divide-border/50">
                    {data.overdue_submissions.map((s) => (
                      <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <Link href={`/operators/${s.operator_external_id}`} className="min-w-0 text-sm font-medium break-words hover:text-primary transition-colors">
                          {s.operator_name} <span className="font-normal text-muted-foreground">— {s.period}</span>
                        </Link>
                        <span className="shrink-0 text-sm text-danger font-medium sm:text-right">
                          {formatKsh(s.tax_outstanding)} outstanding
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Operator Compliance Tiers</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/50">
                      <tr>
                        {["Operator", "Status", "Tax Outstanding", "Licence"].map((h) => (
                          <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.operators.map((op) => (
                        <tr key={op.external_id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                          <td className="px-5 py-3.5">
                            <Link href={`/operators/${op.external_id}`} className="font-medium hover:text-primary transition-colors">
                              {op.trading_name}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={complianceBadgeVariant(op.compliance_status)} dot>
                              {complianceLabel(op.compliance_status)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 tabular-nums">{formatKsh(op.tax_outstanding)}</td>
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
          </>
        )}
      </div>
    </AppShell>
  );
}
