"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { PaymentsNav } from "@/components/payments-nav";
import { useAuth } from "@/lib/use-auth";
import {
  getOperators,
  getPaymentTransactions,
  type PaymentTransaction,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

export default function PaymentTransactionsPage() {
  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [operators, setOperators] = useState<
    Array<{ external_id: string; trading_name: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [amlOnly, setAmlOnly] = useState(false);

  useEffect(() => {
    if (!token) return;
    getOperators(token).then((ops) =>
      setOperators(
        ops.map((o) => ({ external_id: o.external_id, trading_name: o.trading_name })),
      ),
    );
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      getPaymentTransactions(token, {
        limit: 200,
        status: status || undefined,
        operator_external_id: operatorId || undefined,
        search: search || undefined,
        aml_flag: amlOnly || undefined,
      }).then(setTransactions).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [token, search, status, operatorId, amlOnly]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Payment Transactions">
      <PaymentsNav />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference or ticket..."
            className="rounded-lg border border-border px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            value={operatorId}
            onChange={(e) => setOperatorId(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">All operators</option>
            {operators.map((op) => (
              <option key={op.external_id} value={op.external_id}>
                {op.trading_name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={amlOnly}
              onChange={(e) => setAmlOnly(e.target.checked)}
            />
            AML flagged only
          </label>
        </div>
      </Card>
      <Card>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Tax</th>
              <th className="px-3 py-2">KYC</th>
              <th className="px-3 py-2">AML</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-xs">
                  {tx.external_transaction_id}
                </td>
                <td className="px-3 py-2">{tx.operator_name}</td>
                <td className="px-3 py-2">{formatKsh(tx.gross_amount)}</td>
                <td className="px-3 py-2">{formatKsh(tx.tax_amount)}</td>
                <td className="px-3 py-2 capitalize">{tx.kyc_status}</td>
                <td className="px-3 py-2">
                  {tx.has_aml_alert || tx.aml_risk_score >= 50 ? (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 capitalize">{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
