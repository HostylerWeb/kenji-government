"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, CheckCircle, ArrowUpRight, Inbox } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { PaymentsNav } from "@/components/payments-nav";
import { toast } from "@/components/toast";
import { useAuth } from "@/lib/use-auth";
import {
  getAmlAlerts,
  updateAmlAlert,
  escalateAmlToEnforcement,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

type AmlAlert = Awaited<ReturnType<typeof getAmlAlerts>>[number];

function severityVariant(severity: string): "danger" | "warning" | "muted" {
  switch (severity) {
    case "high": return "danger";
    case "medium": return "warning";
    default: return "muted";
  }
}

export default function AmlQueuePage() {
  const { user, token } = useAuth();
  const [alerts, setAlerts] = useState<AmlAlert[]>([]);
  const [selected, setSelected] = useState<AmlAlert | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAmlAlerts(token, "open").then(setAlerts).catch(() => {});
  }, [token]);

  async function refresh() {
    if (!token) return;
    const rows = await getAmlAlerts(token, "open");
    setAlerts(rows);
    if (selected) {
      const updated = rows.find((a) => a.id === selected.id);
      setSelected(updated ?? null);
    }
  }

  async function handleReview() {
    if (!token || !selected) return;
    setActionLoading(true);
    try {
      await updateAmlAlert(token, selected.id, "reviewed");
      toast.success("Alert marked as reviewed.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose() {
    if (!token || !selected) return;
    setActionLoading(true);
    try {
      await updateAmlAlert(token, selected.id, "closed");
      toast.success("Alert closed.");
      setSelected(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEscalate() {
    if (!token || !selected) return;
    setActionLoading(true);
    try {
      const result = await escalateAmlToEnforcement(token, selected.id);
      toast.success(`Escalated to enforcement case ${result.case_number}`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Escalation failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="AML Queue">
      <PaymentsNav />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Alert list */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Open Alerts
              {alerts.length > 0 && (
                <Badge variant="warning" size="sm">{alerts.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {alerts.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-6 w-6" />}
                title="No open AML alerts"
                description="All alerts have been reviewed or closed."
                className="py-10"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      {["Operator", "Type", "Severity", "Transaction"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        onClick={() => setSelected(alert)}
                        className={`cursor-pointer border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30 ${
                          selected?.id === alert.id ? "bg-secondary/50" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5 font-medium">{alert.operator.trading_name}</td>
                        <td className="px-5 py-3.5 capitalize text-muted-foreground">{alert.alert_type}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={severityVariant(alert.severity)} dot>
                            {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                          {alert.payment_transaction?.external_transaction_id ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review panel */}
        <Card>
          <CardHeader>
            <CardTitle>Review Panel</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <EmptyState
                icon={<ShieldAlert className="h-5 w-5" />}
                title="No alert selected"
                description="Click an alert in the list to review it."
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Operator</span>
                    <span className="font-medium text-right">{selected.operator.trading_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{selected.alert_type}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Severity</span>
                    <Badge variant={severityVariant(selected.severity)} dot>
                      {selected.severity}
                    </Badge>
                  </div>
                  {selected.payment_transaction && (
                    <>
                      <hr className="border-border/50" />
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Payment</span>
                        <span className="font-mono text-xs text-right">{selected.payment_transaction.external_transaction_id}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{formatKsh(selected.payment_transaction.gross_amount)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">KYC</span>
                        <span>{selected.payment_transaction.kyc_status}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Risk score</span>
                        <span>{selected.payment_transaction.aml_risk_score}</span>
                      </div>
                    </>
                  )}
                  {selected.details &&
                    typeof selected.details === "object" &&
                    "enforcement_case_number" in (selected.details as object) && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Case</span>
                        <Link href="/enforcement" className="text-primary hover:underline flex items-center gap-1">
                          {(selected.details as { enforcement_case_number?: string }).enforcement_case_number}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  <Button size="sm" variant="success" leftIcon={<CheckCircle className="h-3.5 w-3.5" />} loading={actionLoading} onClick={handleReview}>
                    Mark reviewed
                  </Button>
                  <Button size="sm" variant="warning" leftIcon={<ArrowUpRight className="h-3.5 w-3.5" />} loading={actionLoading} onClick={handleEscalate}>
                    Escalate
                  </Button>
                  <Button size="sm" variant="outline" loading={actionLoading} onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
