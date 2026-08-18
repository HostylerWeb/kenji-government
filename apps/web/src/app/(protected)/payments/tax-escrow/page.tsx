"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { PaymentsNav } from "@/components/payments-nav";
import { TableScroll } from "@/components/table-scroll";
import { useAuth } from "@/lib/use-auth";
import {
  getTaxEscrowSummary,
  getTaxEscrowEntries,
  initiateWithdrawal,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

export default function TaxEscrowPage() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState<
    Awaited<ReturnType<typeof getTaxEscrowSummary>> | null
  >(null);
  const [entries, setEntries] = useState<
    Awaited<ReturnType<typeof getTaxEscrowEntries>>
  >([]);
  const [message, setMessage] = useState("");

  const canSupervise =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "supervisor";

  useEffect(() => {
    if (!token) return;
    getTaxEscrowSummary(token).then(setSummary).catch(() => {});
    getTaxEscrowEntries(token, { status: "earmarked" }).then(setEntries).catch(() => {});
  }, [token]);

  async function handleWithdrawal() {
    if (!token) return;
    try {
      const result = await initiateWithdrawal(token);
      setMessage(`Withdrawal batch created — KES ${result.total_amount}`);
      setSummary(await getTaxEscrowSummary(token));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Withdrawal failed");
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Tax Escrow">
      <PaymentsNav />
      {message && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{message}</p>
      )}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted">Earmarked balance</p>
            <p className="text-2xl font-semibold text-gra-green">
              {formatKsh(summary.earmarked_balance)}
            </p>
            <p className="text-xs text-muted">{summary.earmarked_count} entries</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Withdrawn total</p>
            <p className="text-2xl font-semibold">
              {formatKsh(summary.withdrawn_total)}
            </p>
            <p className="text-xs text-muted">{summary.withdrawn_count} entries</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted">Reversed</p>
            <p className="text-2xl font-semibold">
              {formatKsh(summary.reversed_total)}
            </p>
          </Card>
        </div>
      )}

      {canSupervise && (
        <button
          onClick={handleWithdrawal}
          className="mb-4 rounded-lg bg-primary px-4 py-2 text-sm text-white"
        >
          Initiate manual withdrawal batch
        </button>
      )}

      {summary && summary.withdrawal_batches.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 text-base font-semibold">Withdrawal history</h2>
          <TableScroll>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-2">Business date</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Destination</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.withdrawal_batches.map((batch) => (
                <tr key={batch.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">
                    {new Date(batch.business_date).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">{formatKsh(batch.total_amount)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {batch.destination_account_ref}
                  </td>
                  <td className="px-3 py-2 capitalize">{batch.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-base font-semibold">Earmarked entries</h2>
        <TableScroll>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Tax</th>
              <th className="px-3 py-2">Earmarked at</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{row.operator_name}</td>
                <td className="px-3 py-2">{formatKsh(row.gross_amount)}</td>
                <td className="px-3 py-2">{formatKsh(row.tax_amount)}</td>
                <td className="px-3 py-2 text-xs">
                  {new Date(row.earmarked_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </TableScroll>
      </Card>
    </AppShell>
  );
}
