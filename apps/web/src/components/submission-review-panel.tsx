"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  FileCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { toast } from "@/components/toast";
import {
  downloadWithAuth,
  getSubmission,
  reviewSubmission,
  type SubmissionDetail,
} from "@/lib/api";
import { formatKsh, formatNumber } from "@/lib/utils";

import {
  submissionStatusLabel,
  submissionStatusVariant,
} from "@/lib/submissions";

type ReviewAction = "approved" | "rejected" | "revision_requested";

function documentLabel(type: string) {
  switch (type) {
    case "monthly_return":
      return "Monthly return";
    case "bank_statement":
      return "Bank statement";
    case "tax_certificate":
      return "Tax certificate";
    default:
      return type.replace(/_/g, " ");
  }
}

export function SubmissionReviewPanel({
  open,
  submissionId,
  token,
  canReview,
  userRole,
  onClose,
  onReviewed,
}: {
  open: boolean;
  submissionId: string | null;
  token: string | null;
  canReview: boolean;
  userRole?: string;
  onClose: () => void;
  onReviewed?: () => void;
}) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!open || !token || !submissionId) {
      setDetail(null);
      setReviewNotes("");
      return;
    }

    setLoading(true);
    getSubmission(token, submissionId)
      .then((data) => {
        setDetail(data);
        setReviewNotes(data.notes ?? "");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load submission");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, token, submissionId, onClose]);

  const reviewable =
    detail?.status === "pending" || detail?.status === "revision_requested";

  async function submitReview(action: ReviewAction) {
    if (!token || !detail) return;
    setActionLoading(true);
    try {
      const updated = await reviewSubmission(
        token,
        detail.id,
        action,
        reviewNotes || undefined,
      );
      setDetail(updated);
      toast.success(`Submission ${submissionStatusLabel(action).toLowerCase()}.`);
      onReviewed?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadDocument(documentId: string, title: string) {
    if (!token) return;
    try {
      const blob = await downloadWithAuth(token, `/documents/${documentId}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = title.replace(/\s+/g, "_");
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border/50">
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.operator?.trading_name ?? "Operator"} — ${detail.reporting_period?.label ?? "Period"}`
              : "Loading submission details…"}
          </DialogDescription>
        </DialogHeader>

        {loading || !detail ? (
          <DialogBody>
            <p className="text-sm text-muted-foreground">Loading…</p>
          </DialogBody>
        ) : (
          <DialogBody className="min-h-0 flex-1 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Current status
                </p>
                <Badge variant={submissionStatusVariant(detail.status)} dot className="mt-1">
                  {submissionStatusLabel(detail.status)}
                </Badge>
              </div>
              {detail.submitted_at && (
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Submitted
                  </p>
                  <p className="text-sm">
                    {new Date(detail.submitted_at).toLocaleDateString("en-KE")}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Financial summary
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryItem label="Tickets sold" value={formatNumber(detail.tickets_sold)} />
                <SummaryItem label="Gross revenue" value={formatKsh(detail.gross_revenue)} />
                <SummaryItem label="Prizes paid" value={formatKsh(detail.prizes_paid)} />
                <SummaryItem label="Expenses" value={formatKsh(detail.expenses)} />
                <SummaryItem label="Gross gaming revenue" value={formatKsh(detail.gross_gaming_revenue)} />
                <SummaryItem label="Tax due" value={formatKsh(detail.tax_due)} />
                <SummaryItem label="Tax paid" value={formatKsh(detail.tax_paid)} />
                <SummaryItem label="Tax outstanding" value={formatKsh(detail.tax_outstanding)} />
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Supporting documents
              </h4>
              {detail.documents && detail.documents.length > 0 ? (
                <div className="space-y-2">
                  {detail.documents.map((doc) => (
                    <Button
                      key={doc.id}
                      type="button"
                      variant="outline"
                      className="h-10 w-full justify-start text-sm"
                      leftIcon={<FileCheck className="h-4 w-4" />}
                      onClick={() => downloadDocument(doc.id, doc.title)}
                    >
                      <span className="truncate">{doc.title}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {documentLabel(doc.document_type)}
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No supporting documents attached to this submission yet.
                </p>
              )}
            </div>

            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Review notes
              </h4>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                readOnly={!canReview || !reviewable}
                placeholder="Add notes for the operator…"
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-secondary/40"
              />
              {detail.reviewer && detail.reviewed_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last reviewed by {detail.reviewer.full_name} on{" "}
                  {new Date(detail.reviewed_at).toLocaleDateString("en-KE")}
                </p>
              )}
            </div>
          </DialogBody>
        )}

        <DialogFooter className="shrink-0 border-t border-border/50 bg-card">
          {!canReview && userRole === "auditor" && detail && reviewable && (
            <p className="mr-auto text-xs text-muted-foreground sm:max-w-[14rem]">
              View only — auditors cannot approve or reject submissions.
            </p>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {canReview && detail && reviewable && (
            <>
              <Button
                variant="danger"
                size="sm"
                loading={actionLoading}
                leftIcon={<XCircle className="h-4 w-4" />}
                onClick={() => submitReview("rejected")}
              >
                Reject
              </Button>
              <Button
                variant="warning"
                size="sm"
                loading={actionLoading}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => submitReview("revision_requested")}
              >
                Request revision
              </Button>
              <Button
                variant="success"
                size="sm"
                loading={actionLoading}
                leftIcon={<CheckCircle className="h-4 w-4" />}
                onClick={() => submitReview("approved")}
              >
                Approve
              </Button>
            </>
          )}
          {detail && !reviewable && (
            <p className="text-xs text-muted-foreground">
              This submission is already {submissionStatusLabel(detail.status).toLowerCase()}.
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
