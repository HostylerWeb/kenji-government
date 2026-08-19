"use client";

import { useEffect, useState } from "react";
import { Banknote, Download, ArrowUpCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/dialog";
import { toast } from "@/components/toast";
import { PaymentsNav } from "@/components/payments-nav";
import { TableScroll } from "@/components/table-scroll";
import { useAuth } from "@/lib/use-auth";
import {
  getTaxEscrowSummary,
  getTaxEscrowEntries,
  initiateWithdrawal,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

function batchStatusVariant(status: string): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "completed": return "success";
    case "processing": return "warning";
    case "failed": return "danger";
    default: return "muted";
  }
}

export default function TaxEscrowPage() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getTaxEscrowSummary>> | null>(null);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getTaxEscrowEntries>>>([]);
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const canSupervise = user?.role === "super_admin" || user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    if (!token) return;
    getTaxEscrowSummary(token).then(setSummary).catch(() => {});
    getTaxEscrowEntries(token, { status: "earmarked" }).then(setEntries).catch(() => {});
  }, [token]);

  async function handleWithdrawal() {
    if (!token) return;
    setWithdrawLoading(true);
    try {
      const result = await initiateWithdrawal(token);
      toast.success(`Withdrawal batch created — ${formatKsh(result.total_amount)}`);
      setSummary(await getTaxEscrowSummary(token));
      setWithdrawDialog(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="Tax Escrow">
      <PaymentsNav />

      <div className="space-y-5">
        {summary && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Earmarked Balance"
              value={formatKsh(summary.earmarked_balance)}
              subLabel={`${summary.earmarked_count} entries`}
              icon={<Banknote className="h-5 w-5" />}
              variant="success"
            />
            <StatCard
              title="Withdrawn Total"
              value={formatKsh(summary.withdrawn_total)}
              subLabel={`${summary.withdrawn_count} entries`}
              icon={<ArrowUpCircle className="h-5 w-5" />}
            />
            <StatCard
              title="Reversed"
              value={formatKsh(summary.reversed_total)}
              icon={<Download className="h-5 w-5" />}
              variant="warning"
            />
          </div>
        )}

        {canSupervise && (
          <div>
            <Button
              variant="primary"
              leftIcon={<ArrowUpCircle className="h-4 w-4" />}
              onClick={() => setWithdrawDialog(true)}
            >
              Initiate withdrawal batch
            </Button>
          </div>
        )}

        {summary && summary.withdrawal_batches.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Withdrawal History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <TableScroll>
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      {["Business Date", "Total", "Destination", "Status"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.withdrawal_batches.map((batch) => (
                      <tr key={batch.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                        <td className="px-5 py-3.5">{new Date(batch.business_date).toISOString().slice(0, 10)}</td>
                        <td className="px-5 py-3.5 tabular-nums font-medium">{formatKsh(batch.total_amount)}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{batch.destination_account_ref}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={batchStatusVariant(batch.status)} dot>
                            {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Earmarked Entries</CardTitle></CardHeader>
          <CardContent className="p-0">
            <TableScroll>
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/50">
                  <tr>
                    {["Operator", "Gross", "Tax Amount", "Earmarked At"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                      <td className="px-5 py-3.5 font-medium">{row.operator_name}</td>
                      <td className="px-5 py-3.5 tabular-nums">{formatKsh(row.gross_amount)}</td>
                      <td className="px-5 py-3.5 tabular-nums">{formatKsh(row.tax_amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(row.earmarked_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Withdrawal Batch</DialogTitle>
            <DialogDescription>
              This will create a new withdrawal batch for all earmarked tax escrow funds.
              Current earmarked balance: <strong>{formatKsh(summary?.earmarked_balance)}</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="sm" loading={withdrawLoading} onClick={handleWithdrawal}>
              Confirm Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
