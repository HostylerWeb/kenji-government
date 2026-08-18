"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import {
  getEnforcementCase,
  addEnforcementAction,
  type EnforcementCase,
} from "@/lib/api";

export default function EnforcementCaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const { user, token } = useAuth();
  const [caseRecord, setCaseRecord] = useState<
    EnforcementCase & { operator?: { external_id: string; trading_name: string } }
  | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canAct = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    if (!token) return;
    getEnforcementCase(token, caseId)
      .then(setCaseRecord)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load case"));
  }, [token, caseId]);

  async function handleAddAction(
    action_type: string,
    details?: string,
    fine_amount?: number,
  ) {
    if (!token) return;
    try {
      await addEnforcementAction(token, caseId, {
        action_type,
        details,
        fine_amount,
      });
      setMessage("Action recorded.");
      setCaseRecord(await getEnforcementCase(token, caseId));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to add action");
    }
  }

  if (!user) return null;

  return (
    <AppShell
      user={user}
      title={caseRecord?.title ?? "Enforcement Case"}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Enforcement", href: "/enforcement" },
        { label: caseRecord?.case_number ?? caseId },
      ]}
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{message}</p>
      )}

      {caseRecord && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <Badge variant="muted">{caseRecord.status}</Badge>
            <Badge variant="warning">{caseRecord.case_type}</Badge>
            <span className="font-mono text-xs text-muted">{caseRecord.case_number}</span>
          </div>

          {caseRecord.operator && (
            <Link
              href={`/operators/${caseRecord.operator.external_id}`}
              className="mb-4 block text-sm text-primary hover:underline"
            >
              {caseRecord.operator.trading_name}
            </Link>
          )}

          {caseRecord.description && (
            <Card className="mb-6">
              <p className="text-sm text-muted">{caseRecord.description}</p>
            </Card>
          )}

          {canAct && (
            <Card className="mb-6">
              <h2 className="mb-4 text-base font-semibold">Add Enforcement Action</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const d = prompt("Notice details:");
                    if (d) handleAddAction("notice", d);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
                >
                  Issue Notice
                </button>
                <button
                  onClick={() => {
                    const d = prompt("Warning details:");
                    if (d) handleAddAction("warning", d);
                  }}
                  className="rounded-lg border border-warning px-3 py-2 text-sm text-warning hover:bg-amber-50"
                >
                  Issue Warning
                </button>
                <button
                  onClick={() => {
                    const amount = prompt("Fine amount (Ksh):");
                    const d = prompt("Fine details:");
                    if (amount && d) handleAddAction("fine", d, Number(amount));
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
                >
                  Impose Fine
                </button>
                <button
                  onClick={() => {
                    const d = prompt("Suspension reason:");
                    if (d && confirm("Confirm suspension action?"))
                      handleAddAction("suspension", d);
                  }}
                  className="rounded-lg border border-danger px-3 py-2 text-sm text-danger hover:bg-red-50"
                >
                  Suspend Operator
                </button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-base font-semibold">Case Timeline</h2>
            {caseRecord.actions && caseRecord.actions.length > 0 ? (
              <ul className="space-y-3">
                {caseRecord.actions.map((action) => (
                  <li
                    key={action.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted">{action.action_type}</Badge>
                      <span className="text-xs text-muted">
                        {new Date(action.created_at).toLocaleString("en-KE")}
                      </span>
                      {action.performer && (
                        <span className="text-xs text-muted">
                          — {action.performer.full_name}
                        </span>
                      )}
                    </div>
                    {action.details && (
                      <p className="mt-2 text-muted">{action.details}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No actions recorded yet.</p>
            )}
          </Card>
        </>
      )}
    </AppShell>
  );
}
