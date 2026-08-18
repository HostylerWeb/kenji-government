"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { PaymentsNav } from "@/components/payments-nav";
import { useAuth } from "@/lib/use-auth";
import {
  getAmlAlerts,
  updateAmlAlert,
  escalateAmlToEnforcement,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

type AmlAlert = Awaited<ReturnType<typeof getAmlAlerts>>[number];

export default function AmlQueuePage() {
  const { user, token } = useAuth();
  const [alerts, setAlerts] = useState<AmlAlert[]>([]);
  const [selected, setSelected] = useState<AmlAlert | null>(null);
  const [message, setMessage] = useState("");

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
    await updateAmlAlert(token, selected.id, "reviewed");
    setMessage("Alert marked reviewed.");
    await refresh();
  }

  async function handleClose() {
    if (!token || !selected) return;
    await updateAmlAlert(token, selected.id, "closed");
    setMessage("Alert closed.");
    setSelected(null);
    await refresh();
  }

  async function handleEscalate() {
    if (!token || !selected) return;
    try {
      const result = await escalateAmlToEnforcement(token, selected.id);
      setMessage(`Escalated to case ${result.case_number}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Escalation failed");
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user} title="AML Queue">
      <PaymentsNav />
      {message && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{message}</p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr
                  key={alert.id}
                  onClick={() => setSelected(alert)}
                  className={`cursor-pointer border-b border-border last:border-0 hover:bg-secondary/50 ${
                    selected?.id === alert.id ? "bg-secondary" : ""
                  }`}
                >
                  <td className="px-3 py-2">{alert.operator.trading_name}</td>
                  <td className="px-3 py-2 capitalize">{alert.alert_type}</td>
                  <td className="px-3 py-2 capitalize">{alert.severity}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {alert.payment_transaction?.external_transaction_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Review panel</h2>
          {!selected ? (
            <p className="text-sm text-muted">Select an alert to review.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted">Operator:</span>{" "}
                {selected.operator.trading_name}
              </p>
              <p>
                <span className="text-muted">Type:</span>{" "}
                <span className="capitalize">{selected.alert_type}</span>
              </p>
              <p>
                <span className="text-muted">Severity:</span>{" "}
                <span className="capitalize">{selected.severity}</span>
              </p>
              {selected.payment_transaction && (
                <>
                  <p>
                    <span className="text-muted">Payment:</span>{" "}
                    {selected.payment_transaction.external_transaction_id}
                  </p>
                  <p>
                    <span className="text-muted">Amount:</span>{" "}
                    {formatKsh(selected.payment_transaction.gross_amount)}
                  </p>
                  <p>
                    <span className="text-muted">KYC:</span>{" "}
                    {selected.payment_transaction.kyc_status}
                  </p>
                  <p>
                    <span className="text-muted">Risk score:</span>{" "}
                    {selected.payment_transaction.aml_risk_score}
                  </p>
                </>
              )}
              {selected.details &&
                typeof selected.details === "object" &&
                "enforcement_case_number" in (selected.details as object) && (
                  <p>
                    <span className="text-muted">Enforcement:</span>{" "}
                    <Link
                      href="/enforcement"
                      className="text-primary hover:underline"
                    >
                      {(selected.details as { enforcement_case_number?: string })
                        .enforcement_case_number}
                    </Link>
                  </p>
                )}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleReview}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs text-white"
                >
                  Mark reviewed
                </button>
                <button
                  onClick={handleEscalate}
                  className="rounded-lg bg-warning px-3 py-1.5 text-xs text-white"
                >
                  Escalate to enforcement
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
