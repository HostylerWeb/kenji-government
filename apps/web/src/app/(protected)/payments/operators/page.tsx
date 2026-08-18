"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
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

  useEffect(() => {
    if (!token) return;
    getPaymentOperatorStats(token).then(setStats).catch(() => {});
  }, [token]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Operator Payment Stats">
      <PaymentsNav />
      <Card>
        <TableScroll>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Failed</th>
              <th className="px-3 py-2">Failure rate</th>
              <th className="px-3 py-2">Gross total</th>
              <th className="px-3 py-2">Tax total</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row) => (
              <tr key={row.operator_external_id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{row.trading_name}</td>
                <td className="px-3 py-2">{row.transaction_count}</td>
                <td className="px-3 py-2">{row.failed_count}</td>
                <td className="px-3 py-2">{row.failure_rate}%</td>
                <td className="px-3 py-2">{formatKsh(row.gross_total)}</td>
                <td className="px-3 py-2">{formatKsh(row.tax_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </TableScroll>
      </Card>
    </AppShell>
  );
}
