"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { PaymentsNav } from "@/components/payments-nav";
import { TableScroll } from "@/components/table-scroll";
import { useAuth } from "@/lib/use-auth";
import { getPaymentOperatorStats } from "@/lib/api";
import { formatKsh } from "@/lib/utils";

export default function PaymentOperatorsPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<
    Awaited<ReturnType<typeof getPaymentOperatorStats>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getPaymentOperatorStats(token)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Operator Payment Stats">
      <PaymentsNav />
      <Card>
        <CardHeader>
          <CardTitle>Operator gateway economics</CardTitle>
          <CardDescription>
            Gross sales via the payment gateway, gateway fees, tax earmarked for GRA, and operator net
            after fees
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="px-4 py-3 text-sm text-danger">{error}</p>
          )}
          {loading ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">Loading operator stats…</p>
          ) : stats.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No gateway payment activity recorded yet.
            </p>
          ) : (
            <TableScroll>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/50 text-muted">
                  <tr>
                    <th className="px-3 py-2">Operator</th>
                    <th className="px-3 py-2">Completed</th>
                    <th className="px-3 py-2">Failed</th>
                    <th className="px-3 py-2">Failure rate</th>
                    <th className="px-3 py-2">Gross sales</th>
                    <th className="px-3 py-2">Gateway fee %</th>
                    <th className="px-3 py-2">Gateway fees</th>
                    <th className="px-3 py-2">Tax to GRA</th>
                    <th className="px-3 py-2">Operator net</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr
                      key={row.operator_external_id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-3 py-2 font-medium">{row.trading_name}</td>
                      <td className="px-3 py-2 tabular-nums">{row.transaction_count}</td>
                      <td className="px-3 py-2 tabular-nums">{row.failed_count}</td>
                      <td className="px-3 py-2 tabular-nums">{row.failure_rate}%</td>
                      <td className="px-3 py-2 tabular-nums">{formatKsh(row.gross_total)}</td>
                      <td className="px-3 py-2 tabular-nums">{row.gateway_fee_rate}%</td>
                      <td className="px-3 py-2 tabular-nums">{formatKsh(row.gateway_fee_total)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatKsh(row.tax_total)}</td>
                      <td className="px-3 py-2 tabular-nums font-medium">
                        {formatKsh(row.operator_net_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
