"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card, CardContent } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton";
import { Button } from "@/components/button";
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
  getSubmissions,
  getSubmissionStats,
  reviewSubmission,
  downloadWithAuth,
  type SubmissionItem,
} from "@/lib/api";
import { formatKsh } from "@/lib/utils";

type SubmissionStatus = "approved" | "pending" | "revision_requested" | "rejected";

const STATUS_TABS: Array<{ id: SubmissionStatus; label: string }> = [
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "revision_requested", label: "Revision Requested" },
  { id: "rejected", label: "Rejected" },
];

function statusVariant(status: string): "success" | "danger" | "warning" | "muted" {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "danger";
    case "revision_requested": return "warning";
    default: return "muted";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "approved": return "Approved";
    case "pending": return "Pending";
    case "revision_requested": return "Revision Requested";
    case "rejected": return "Rejected";
    default: return status;
  }
}

type ReviewAction = "approved" | "rejected" | "revision_requested";

export default function SubmissionsPage() {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<SubmissionStatus>("pending");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review dialog state
  const [reviewTarget, setReviewTarget] = useState<SubmissionItem | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    getSubmissionStats(token).then(setCounts).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    getSubmissions(token, status)
      .then(setSubmissions)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, status]);

  async function refreshList() {
    if (!token) return;
    const [list, stats] = await Promise.all([
      getSubmissions(token, status),
      getSubmissionStats(token),
    ]);
    setSubmissions(list);
    setCounts(stats);
  }

  function openReview(submission: SubmissionItem, action: ReviewAction) {
    setReviewTarget(submission);
    setReviewAction(action);
    setReviewNotes("");
  }

  async function submitReview() {
    if (!token || !reviewTarget || !reviewAction) return;
    setReviewLoading(true);
    try {
      await reviewSubmission(token, reviewTarget.id, reviewAction, reviewNotes || undefined);
      toast.success(`Submission ${statusLabel(reviewAction).toLowerCase()}.`);
      setReviewTarget(null);
      await refreshList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setReviewLoading(false);
    }
  }

  function handleExport() {
    if (!token) return;
    downloadWithAuth(token, `/submissions/export?status=${status}`).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submissions-${status}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (!user) return null;
  const canReview = user.role === "admin" || user.role === "supervisor";

  const tabs = STATUS_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: counts[tab.id] ?? 0,
  }));

  const actionLabel = {
    approved: "Approve",
    rejected: "Reject",
    revision_requested: "Request Revision",
  };

  const actionVariant: Record<ReviewAction, "success" | "danger" | "warning"> = {
    approved: "success",
    rejected: "danger",
    revision_requested: "warning",
  };

  return (
    <AppShell user={user} title="Submissions Queue">
      <div className="space-y-5">
        <PageHeader
          title="Submissions Queue"
          subtitle="Review and action operator compliance submissions"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Submissions" }]}
          action={
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
              Export CSV
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="pb-0">
            <Tabs
              tabs={tabs}
              active={status}
              onChange={(id) => setStatus(id as SubmissionStatus)}
              variant="underline"
            />
          </CardContent>

          {loading ? (
            <div className="border-t border-border/50 pt-2">
              <SkeletonTable rows={5} />
            </div>
          ) : submissions.length === 0 ? (
            <div className="border-t border-border/50">
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title={`No ${statusLabel(status).toLowerCase()} submissions`}
                description="Nothing to show for this status."
              />
            </div>
          ) : (
            <>
              <div className="border-t border-border/50 bg-secondary/30 px-5 py-2 text-xs text-muted-foreground">
                {submissions.length} {statusLabel(status).toLowerCase()} submission{submissions.length !== 1 ? "s" : ""}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operator</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Period</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">GGR</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tax Outstanding</th>
                      {canReview && status === "pending" && (
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30">
                        <td className="px-5 py-3.5">
                          <Link href={`/operators/${s.operator?.external_id}`} className="font-medium hover:text-primary transition-colors">
                            {s.operator?.trading_name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{s.reporting_period?.label ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant(s.status)} dot>
                            {statusLabel(s.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.gross_gaming_revenue)}</td>
                        <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.tax_outstanding)}</td>
                        {canReview && status === "pending" && (
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-2">
                              <Button size="xs" variant="success" leftIcon={<CheckCircle className="h-3.5 w-3.5" />} onClick={() => openReview(s, "approved")}>
                                Approve
                              </Button>
                              <Button size="xs" variant="warning" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => openReview(s, "revision_requested")}>
                                Revision
                              </Button>
                              <Button size="xs" variant="danger" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => openReview(s, "rejected")}>
                                Reject
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Review Dialog ───────────────────────────────── */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction ? actionLabel[reviewAction] : "Review"} Submission</DialogTitle>
            <DialogDescription>
              {reviewTarget?.operator?.trading_name} — {reviewTarget?.reporting_period?.label}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="mb-1.5 block text-sm font-medium">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes for the operator…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            {reviewAction && (
              <Button
                variant={actionVariant[reviewAction]}
                size="sm"
                loading={reviewLoading}
                onClick={submitReview}
              >
                {actionLabel[reviewAction]}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
