"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FileText, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/dialog";
import { toast } from "@/components/toast";
import { useAuth } from "@/lib/use-auth";
import {
  getEnforcementCase,
  addEnforcementAction,
  type EnforcementCase,
} from "@/lib/api";

type ActionType = "notice" | "warning" | "fine" | "suspension";

const ACTION_LABELS: Record<ActionType, string> = {
  notice: "Issue Notice",
  warning: "Issue Warning",
  fine: "Impose Fine",
  suspension: "Suspend Operator",
};

export default function EnforcementCaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const { user, token } = useAuth();
  const [caseRecord, setCaseRecord] = useState<
    (EnforcementCase & { operator?: { external_id: string; trading_name: string } }) | null
  >(null);
  const [error, setError] = useState("");

  // Action dialog
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionDetails, setActionDetails] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canAct = user?.role === "admin" || user?.role === "supervisor";

  useEffect(() => {
    if (!token) return;
    getEnforcementCase(token, caseId)
      .then(setCaseRecord)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load case"));
  }, [token, caseId]);

  async function submitAction() {
    if (!token || !activeAction) return;
    setActionLoading(true);
    try {
      await addEnforcementAction(token, caseId, {
        action_type: activeAction,
        details: actionDetails || undefined,
        fine_amount: activeAction === "fine" && fineAmount ? Number(fineAmount) : undefined,
      });
      toast.success(`${ACTION_LABELS[activeAction]} recorded.`);
      setCaseRecord(await getEnforcementCase(token, caseId));
      setActiveAction(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add action");
    } finally {
      setActionLoading(false);
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
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        {caseRecord && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">{caseRecord.case_number}</span>
              <Badge variant="muted">{caseRecord.status}</Badge>
              <Badge variant="warning">{caseRecord.case_type}</Badge>
              {caseRecord.operator && (
                <Link href={`/operators/${caseRecord.operator.external_id}`} className="text-sm text-primary hover:underline ml-2">
                  {caseRecord.operator.trading_name}
                </Link>
              )}
            </div>

            {caseRecord.description && (
              <Card variant="flat">
                <CardContent>
                  <p className="text-sm text-muted-foreground">{caseRecord.description}</p>
                </CardContent>
              </Card>
            )}

            {canAct && (
              <Card>
                <CardHeader><CardTitle>Add Enforcement Action</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setActionDetails(""); setActiveAction("notice"); }}>Issue Notice</Button>
                    <Button variant="warning" size="sm" onClick={() => { setActionDetails(""); setActiveAction("warning"); }}>Issue Warning</Button>
                    <Button variant="outline" size="sm" onClick={() => { setActionDetails(""); setFineAmount(""); setActiveAction("fine"); }}>Impose Fine</Button>
                    <Button variant="danger" size="sm" onClick={() => { setActionDetails(""); setActiveAction("suspension"); }}>Suspend Operator</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Case Timeline</CardTitle></CardHeader>
              <CardContent>
                {caseRecord.actions && caseRecord.actions.length > 0 ? (
                  <ul className="space-y-3">
                    {caseRecord.actions.map((action) => (
                      <li key={action.id} className="rounded-lg border border-border bg-secondary/20 p-3.5 text-sm space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="muted" size="sm">{action.action_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.created_at).toLocaleString("en-KE")}
                          </span>
                          {action.performer && (
                            <span className="text-xs text-muted-foreground">— {action.performer.full_name}</span>
                          )}
                        </div>
                        {action.details && (
                          <p className="text-muted-foreground text-sm leading-relaxed">{action.details}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<FileText className="h-5 w-5" />}
                    title="No actions recorded"
                    description="Use the action buttons above to record enforcement steps."
                    className="py-8"
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeAction ? ACTION_LABELS[activeAction] : ""}</DialogTitle>
            <DialogDescription>
              This action will be recorded in the case timeline.
              {activeAction === "suspension" && " This will immediately suspend the operator's operations."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {activeAction === "fine" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Fine Amount (KES)</label>
                <input
                  type="number"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Details <span className="text-muted-foreground font-normal">{activeAction === "fine" ? "(optional)" : "(required)"}</span>
              </label>
              <textarea
                rows={3}
                value={actionDetails}
                onChange={(e) => setActionDetails(e.target.value)}
                placeholder="Describe the enforcement action…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              variant={activeAction === "suspension" ? "danger" : activeAction === "warning" ? "warning" : "primary"}
              size="sm"
              loading={actionLoading}
              onClick={submitAction}
            >
              {activeAction ? ACTION_LABELS[activeAction] : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
