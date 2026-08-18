"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card, CardHeader } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import { getComplianceOverview, type ComplianceOverview } from "@/lib/api";
import { formatKsh } from "@/lib/utils";

export default function CompliancePage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<ComplianceOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getComplianceOverview(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Compliance Overview">
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader title="Compliant" description={String(data.tiers.compliant)} />
            </Card>
            <Card>
              <CardHeader title="At Risk" description={String(data.tiers.at_risk)} />
            </Card>
            <Card>
              <CardHeader
                title="Non-Compliant"
                description={String(data.tiers.non_compliant)}
              />
            </Card>
            <Card>
              <CardHeader title="Total Arrears" description={formatKsh(data.total_arrears)} />
            </Card>
          </div>

          <Card className="mt-6">
            <h2 className="mb-4 text-base font-semibold">
              Overdue Submissions ({data.overdue_submission_count})
            </h2>
            {data.overdue_submissions.length === 0 ? (
              <p className="text-sm text-muted">No overdue submissions.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.overdue_submissions.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
                    <Link
                      href={`/operators/${s.operator_external_id}`}
                      className="hover:text-primary"
                    >
                      {s.operator_name} — {s.period}
                    </Link>
                    <span className="text-muted">
                      {formatKsh(s.tax_outstanding)} outstanding
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="mt-6">
            <h2 className="mb-4 text-base font-semibold">Operator Compliance Tiers</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-muted">
                  <tr>
                    <th className="px-3 py-2">Operator</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Tax Outstanding</th>
                    <th className="px-3 py-2">Licence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.operators.map((op) => (
                    <tr key={op.external_id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <Link
                          href={`/operators/${op.external_id}`}
                          className="font-medium hover:text-primary"
                        >
                          {op.trading_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={complianceBadgeVariant(op.compliance_status)}>
                          {complianceLabel(op.compliance_status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{formatKsh(op.tax_outstanding)}</td>
                      <td className="px-3 py-2">
                        {op.licence_expiring ? (
                          <Badge variant="warning">Expiring soon</Badge>
                        ) : (
                          <span className="text-muted">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}
