"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Ban,
  FolderOpen,
} from "lucide-react";
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
  resolveEnforcementCase,
  deleteEnforcementCase,
  requestEnforcementDocuments,
  type EnforcementCase,
} from "@/lib/api";
import {
  CASE_NATURE_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_TYPE_LABELS,
  formatActionDetails,
  getCaseNextSteps,
  parseEnforcementMetadata,
  priorityVariant,
} from "@/lib/enforcement";

type ActionType = "resolve" | "warning" | "fine" | "suspension" | "documents";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function EnforcementCaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const { user, token } = useAuth();
  const [caseRecord, setCaseRecord] = useState<
    (EnforcementCase & { operator?: { external_id: string; trading_name: string } }) | null
  >(null);
  const [error, setError] = useState("");

  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionDetails, setActionDetails] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [requestedDocuments, setRequestedDocuments] = useState("");
  const [documentDueBy, setDocumentDueBy] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canAct =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "supervisor";

  const isOpenCase =
    caseRecord?.status === "open" || caseRecord?.status === "escalated";

  async function reloadCase() {
    if (!token) return;
    setCaseRecord(await getEnforcementCase(token, caseId));
  }

  useEffect(() => {
    if (!token) return;
    getEnforcementCase(token, caseId)
      .then(setCaseRecord)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load case"));
  }, [token, caseId]);

  function closeActionDialog() {
    setActiveAction(null);
    setActionDetails("");
    setFineAmount("");
    setResolveNotes("");
    setRequestedDocuments("");
    setDocumentDueBy("");
    setDocumentNotes("");
  }

  async function submitAction() {
    if (!token || !activeAction) return;

    if (activeAction === "resolve") {
      setActionLoading(true);
      try {
        const updated = await resolveEnforcementCase(
          token,
          caseId,
          resolveNotes.trim() || undefined,
        );
        setCaseRecord(updated);
        toast.success("Case marked as resolved.");
        closeActionDialog();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to resolve case");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (activeAction === "documents") {
      if (requestedDocuments.trim().length < 3) return;
      setActionLoading(true);
      try {
        const updated = await requestEnforcementDocuments(token, caseId, {
          documents: requestedDocuments.trim(),
          due_by: documentDueBy.trim() || undefined,
          notes: documentNotes.trim() || undefined,
        });
        setCaseRecord(updated);
        toast.success("Document request recorded. Case remains open.");
        closeActionDialog();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to request documents");
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (
      (activeAction === "warning" || activeAction === "suspension") &&
      actionDetails.trim().length < 5
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await addEnforcementAction(token, caseId, {
        action_type: activeAction,
        details: actionDetails.trim() || undefined,
        fine_amount:
          activeAction === "fine" && fineAmount ? Number(fineAmount) : undefined,
      });
      await reloadCase();
      toast.success("Enforcement action recorded.");
      closeActionDialog();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add action");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    if (!window.confirm("Delete this case permanently? This cannot be undone.")) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteEnforcementCase(token, caseId);
      toast.success("Case deleted.");
      window.location.href = "/enforcement";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete case");
    } finally {
      setActionLoading(false);
    }
  }

  if (!user) return null;

  const metadata = caseRecord ? parseEnforcementMetadata(caseRecord.metadata) : null;
  const nextSteps = getCaseNextSteps(metadata);

  const actionDialogTitle: Record<ActionType, string> = {
    resolve: "Mark Case as Resolved",
    warning: "Issue Warning",
    fine: "Impose Fine",
    suspension: "Suspend Operator",
    documents: "Request Additional Documents",
  };

  const canSubmitAction =
    activeAction === "resolve" ||
    activeAction === "fine" ||
    (activeAction === "documents" && requestedDocuments.trim().length >= 3) ||
    ((activeAction === "warning" || activeAction === "suspension") &&
      actionDetails.trim().length >= 5);

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
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {caseRecord && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                {caseRecord.case_number}
              </span>
              <Badge variant="muted">{caseRecord.status}</Badge>
              <Badge variant="warning">
                {CASE_TYPE_LABELS[caseRecord.case_type as keyof typeof CASE_TYPE_LABELS] ??
                  caseRecord.case_type}
              </Badge>
              {metadata && (
                <Badge variant={priorityVariant(metadata.priority)}>
                  {CASE_PRIORITY_LABELS[metadata.priority]} priority
                </Badge>
              )}
              {metadata?.is_internal && <Badge variant="muted">Internal</Badge>}
              {metadata?.requires_operator_response && (
                <Badge variant="primary">Operator response required</Badge>
              )}
              {metadata?.pending_document_request && (
                <Badge variant="warning">Awaiting operator documents</Badge>
              )}
              {caseRecord.operator && (
                <Link
                  href={`/operators/${caseRecord.operator.external_id}`}
                  className="text-sm text-primary hover:underline ml-2"
                >
                  {caseRecord.operator.trading_name}
                </Link>
              )}
            </div>

            {metadata?.pending_document_request && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Pending document upload</p>
                <p className="mt-1 text-muted-foreground">
                  This case remains open until the operator uploads the requested documents
                  {metadata.document_request_due_by
                    ? ` (due by ${metadata.document_request_due_by})`
                    : ""}
                  .
                </p>
              </div>
            )}

            {canAct && isOpenCase && (
              <Card>
                <CardHeader>
                  <CardTitle>Case Actions</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    All enforcement actions are recorded on this case. Open the case from the list
                    to manage it here.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      onClick={() => setActiveAction("resolve")}
                    >
                      <span className="text-left">
                        <span className="block font-medium">Mark Resolved</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Close the case when the matter is complete
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="warning"
                      className="justify-start h-auto py-3"
                      leftIcon={<AlertTriangle className="h-4 w-4" />}
                      onClick={() => setActiveAction("warning")}
                    >
                      <span className="text-left">
                        <span className="block font-medium">Issue Warning</span>
                        <span className="block text-xs font-normal text-white/90">
                          Record a formal warning to the operator
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3"
                      leftIcon={<DollarSign className="h-4 w-4" />}
                      onClick={() => setActiveAction("fine")}
                    >
                      <span className="text-left">
                        <span className="block font-medium">Impose Fine</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Record a financial penalty on this case
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="danger"
                      className="justify-start h-auto py-3"
                      leftIcon={<Ban className="h-4 w-4" />}
                      onClick={() => setActiveAction("suspension")}
                    >
                      <span className="text-left">
                        <span className="block font-medium">Suspend Operator</span>
                        <span className="block text-xs font-normal text-white/90">
                          Immediately suspend operator operations
                        </span>
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 sm:col-span-2 lg:col-span-1"
                      leftIcon={<FolderOpen className="h-4 w-4" />}
                      onClick={() => setActiveAction("documents")}
                    >
                      <span className="text-left">
                        <span className="block font-medium">Request Documents</span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Request proofs or files — case stays open until uploaded
                        </span>
                      </span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Case Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {metadata && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nature of issue
                      </p>
                      <p className="mt-1 font-medium">{CASE_NATURE_LABELS[metadata.nature]}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Case summary
                    </p>
                    <p className="mt-1 leading-relaxed text-muted-foreground">
                      {caseRecord.description ?? "No summary recorded."}
                    </p>
                  </div>
                  {metadata?.has_allegations && metadata.allegations_summary && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Allegations
                      </p>
                      <p className="mt-1 leading-relaxed text-muted-foreground">
                        {metadata.allegations_summary}
                      </p>
                    </div>
                  )}
                  {metadata?.requires_documents && metadata.required_documents && (
                    <div className="rounded-lg border border-border bg-secondary/20 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Documents / evidence required
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {metadata.required_documents}
                      </p>
                    </div>
                  )}
                  {metadata?.has_financial_penalty && metadata.fine_amount && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Financial penalty
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        KES {metadata.fine_amount}
                        {metadata.fine_due_by ? ` · due by ${metadata.fine_due_by}` : ""}
                      </p>
                      {metadata.fine_payment_notes && (
                        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                          {metadata.fine_payment_notes}
                        </p>
                      )}
                    </div>
                  )}
                  {metadata?.has_supporting_evidence && metadata.supporting_evidence_notes && (
                    <div className="rounded-lg border border-border bg-secondary/20 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Evidence on file
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {metadata.supporting_evidence_notes}
                      </p>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Scope
                      </p>
                      <p className="mt-1">
                        {metadata?.is_internal
                          ? "Internal GRA investigation"
                          : "Operator-facing enforcement"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Operator response
                      </p>
                      <p className="mt-1">
                        {metadata?.requires_operator_response
                          ? "Required — issue notice and track response"
                          : "Not required at this stage"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Next Steps</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {nextSteps.map((step) => (
                      <li key={step}>• {step}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Case Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {caseRecord.actions && caseRecord.actions.length > 0 ? (
                  <ul className="space-y-3">
                    {caseRecord.actions.map((action) => (
                      <li
                        key={action.id}
                        className="rounded-lg border border-border bg-secondary/20 p-3.5 text-sm space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="muted" size="sm">{action.action_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.created_at).toLocaleString("en-KE")}
                          </span>
                          {action.performer && (
                            <span className="text-xs text-muted-foreground">
                              — {action.performer.full_name}
                            </span>
                          )}
                        </div>
                        {action.details && (
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                            {formatActionDetails(action.details)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<FileText className="h-5 w-5" />}
                    title="No actions recorded"
                    description="Use the case actions above to record enforcement steps."
                    className="py-8"
                  />
                )}
              </CardContent>
            </Card>

            {canAct && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  loading={actionLoading}
                  onClick={handleDelete}
                >
                  Delete case
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={!!activeAction} onOpenChange={(open) => !open && closeActionDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {activeAction ? actionDialogTitle[activeAction] : ""}
            </DialogTitle>
            <DialogDescription>
              {activeAction === "resolve" &&
                "Confirm that this enforcement matter is complete. Optional notes will be added to the timeline."}
              {activeAction === "warning" &&
                "Issue a formal warning. This will be recorded in the case timeline."}
              {activeAction === "fine" &&
                "Record a financial penalty against the operator on this case."}
              {activeAction === "suspension" &&
                "This will immediately suspend the operator and escalate the case."}
              {activeAction === "documents" &&
                "Request additional documents or proofs. The case will remain open until the operator uploads them."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
            {activeAction === "resolve" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Resolution notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Summarise how the case was resolved…"
                  className={`${INPUT_CLASS} resize-none`}
                />
              </div>
            )}

            {activeAction === "fine" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Fine amount (KES)</label>
                <input
                  type="number"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className={INPUT_CLASS}
                />
              </div>
            )}

            {activeAction === "documents" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Documents / proofs required
                  </label>
                  <textarea
                    rows={4}
                    value={requestedDocuments}
                    onChange={(e) => setRequestedDocuments(e.target.value)}
                    placeholder="e.g. Bank statements for Q2 2026, signed audit trail, proof of tax payment…"
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Upload due by <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={documentDueBy}
                    onChange={(e) => setDocumentDueBy(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Internal notes <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={documentNotes}
                    onChange={(e) => setDocumentNotes(e.target.value)}
                    placeholder="Any additional context for GRA staff…"
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
              </>
            )}

            {(activeAction === "warning" ||
              activeAction === "suspension" ||
              activeAction === "fine") && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Details{" "}
                  <span className="text-muted-foreground font-normal">
                    {activeAction === "fine" ? "(optional)" : "(required)"}
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  placeholder="Describe the enforcement action…"
                  className={`${INPUT_CLASS} resize-none`}
                />
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant={
                activeAction === "suspension"
                  ? "danger"
                  : activeAction === "warning"
                    ? "warning"
                    : "primary"
              }
              size="sm"
              loading={actionLoading}
              disabled={!canSubmitAction}
              onClick={submitAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
