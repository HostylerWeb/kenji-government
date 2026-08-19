"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Download,
  AlertTriangle,
  PauseCircle,
  FolderPlus,
  Building2,
  FileText,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Tabs } from "@/components/tabs";
import { EmptyState } from "@/components/empty-state";
import { SkeletonCard } from "@/components/skeleton";
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
import { PageHeader } from "@/components/page-header";
import { GgrChart } from "@/components/ggr-chart";
import { LiveActivityTicker } from "@/components/live-activity-ticker";
import { useLiveStream } from "@/hooks/use-live-stream";
import { useAuth } from "@/lib/use-auth";
import {
  getOperator,
  getOperatorSubmissions,
  getOperatorEnforcement,
  getOperatorDocuments,
  getLiveActivity,
  getLiveCounters,
  operatorWarning,
  operatorSuspend,
  createEnforcementCase,
  downloadWithAuth,
  uploadOperatorDocument,
  type OperatorDetail,
  type SubmissionItem,
  type EnforcementCase,
  type DocumentItem,
  type LiveFeedItem,
  type LiveCounters,
} from "@/lib/api";
import { formatKsh, formatNumber } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "live", label: "Live Activity" },
  { id: "submissions", label: "Submissions" },
  { id: "enforcement", label: "Enforcement" },
  { id: "documents", label: "Documents" },
];

function submissionBadge(status: string): "success" | "danger" | "warning" | "muted" {
  switch (status) {
    case "approved": return "success";
    case "rejected": return "danger";
    case "revision_requested": return "warning";
    default: return "muted";
  }
}

type ActionType = "warning" | "suspend" | "case";

export default function OperatorDetailPage() {
  const params = useParams();
  const externalId = params.id as string;
  const { user, token } = useAuth();
  const [tab, setTab] = useState("overview");
  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState<LiveFeedItem[]>([]);
  const [liveCounters, setLiveCounters] = useState<LiveCounters | null>(null);
  const { events: liveStreamEvents, connected: liveConnected } = useLiveStream(token, externalId);

  // Action dialog state
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [actionDetails, setActionDetails] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getOperator(token, externalId)
      .then(setOperator)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, externalId]);

  useEffect(() => {
    if (!token) return;
    if (tab === "submissions") getOperatorSubmissions(token, externalId).then(setSubmissions).catch(() => {});
    if (tab === "enforcement") getOperatorEnforcement(token, externalId).then(setCases).catch(() => {});
    if (tab === "documents") getOperatorDocuments(token, externalId).then(setDocuments).catch(() => {});
    if (tab === "live") {
      getLiveActivity(token, { operator_external_id: externalId, limit: 30 })
        .then((data) => setLiveActivity(data.items)).catch(() => {});
      getLiveCounters(token, externalId).then(setLiveCounters).catch(() => {});
    }
  }, [token, externalId, tab]);

  async function submitAction() {
    if (!token || !activeAction) return;
    if (activeAction === "suspend" && !actionDetails) {
      toast.error("Reason is required for suspension.");
      return;
    }
    setActionLoading(true);
    try {
      if (activeAction === "warning") {
        await operatorWarning(token, externalId, actionDetails || undefined);
        toast.success("Warning issued successfully.");
      } else if (activeAction === "suspend") {
        await operatorSuspend(token, externalId, actionDetails);
        const op = await getOperator(token, externalId);
        setOperator(op);
        toast.success("Operator suspended.");
      } else if (activeAction === "case") {
        if (!actionDetails) { toast.error("Case title is required."); return; }
        await createEnforcementCase(token, externalId, { title: actionDetails, case_type: "investigation" });
        const updated = await getOperatorEnforcement(token, externalId);
        setCases(updated);
        setTab("enforcement");
        toast.success("Enforcement case opened.");
      }
      setActiveAction(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) { toast.error("Select a file to upload."); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", (form.elements.namedItem("title") as HTMLInputElement)?.value || file.name);
    formData.append("document_type", (form.elements.namedItem("document_type") as HTMLSelectElement)?.value || "other");
    setUploading(true);
    try {
      await uploadOperatorDocument(token, externalId, formData);
      setDocuments(await getOperatorDocuments(token, externalId));
      form.reset();
      toast.success("Document uploaded successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(docId: string, title: string) {
    if (!token) return;
    try {
      const blob = await downloadWithAuth(token, `/documents/${docId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed — file may not exist yet.");
    }
  }

  const chartData = operator?.monthly_snapshots?.map((s) => ({
    label: s.reporting_period.label,
    value: s.gross_gaming_revenue,
  })) ?? [];

  const operatorLiveEvents = useMemo(() => {
    const map = new Map<string, LiveFeedItem>();
    for (const event of liveStreamEvents) map.set(event.id, event);
    for (const event of liveActivity) map.set(event.id, event);
    return [...map.values()].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 30);
  }, [liveStreamEvents, liveActivity]);

  if (!user) return null;

  const canAct = user.role === "admin" || user.role === "supervisor";

  const actionLabels: Record<ActionType, string> = {
    warning: "Issue Warning",
    suspend: "Suspend Operator",
    case: "Open Case",
  };
  const actionDescriptions: Record<ActionType, string> = {
    warning: "Provide a reason for the warning. This will be recorded in the enforcement log.",
    suspend: "Suspending this operator will immediately restrict their operations. This action requires a reason.",
    case: "Open a formal enforcement investigation case for this operator.",
  };
  const actionFieldLabels: Record<ActionType, string> = {
    warning: "Reason (optional)",
    suspend: "Reason (required)",
    case: "Case title (required)",
  };

  return (
    <AppShell
      user={user}
      title={operator?.trading_name ?? "Operator"}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Operators", href: "/operators" },
        { label: operator?.trading_name ?? externalId },
      ]}
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard /> <SkeletonCard /> <SkeletonCard /> <SkeletonCard />
        </div>
      ) : operator ? (
        <div className="space-y-5">
          {/* Page header */}
          <PageHeader
            title={operator.trading_name}
            subtitle={operator.legal_name}
            breadcrumbs={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Operators", href: "/operators" },
              { label: operator.trading_name },
            ]}
          />

          {/* Sticky action bar */}
          <div className="sticky top-[calc(var(--header-height)+3px)] z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-card">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <Badge variant={complianceBadgeVariant(operator.compliance_status)} dot>
                  {complianceLabel(operator.compliance_status)}
                </Badge>
                <Badge variant="muted">{operator.status}</Badge>
                <span className="text-xs text-muted-foreground">Risk: {operator.risk_score}</span>
              </div>
              {canAct && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => { setActionDetails(""); setActiveAction("warning"); }}>
                    Warn
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<PauseCircle className="h-4 w-4" />} onClick={() => { setActionDetails(""); setActiveAction("suspend"); }}>
                    Suspend
                  </Button>
                  <Button size="sm" variant="secondary" leftIcon={<FolderPlus className="h-4 w-4" />} onClick={() => { setActionDetails(""); setActiveAction("case"); }}>
                    Open Case
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Card>
            <CardContent className="pb-0">
              <Tabs tabs={TABS} active={tab} onChange={setTab} variant="underline" />
            </CardContent>
          </Card>

          {/* Tab content */}
          <div>
            {tab === "overview" && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard title="Annual GGR" value={formatKsh(operator.annual_ggr)} icon={<Building2 className="h-5 w-5" />} />
                  <StatCard title="Tax Paid" value={formatKsh(operator.tax_paid)} variant="success" icon={<CheckCircle2 className="h-5 w-5" />} />
                  <StatCard title="Tax Due" value={formatKsh(operator.tax_due)} variant={Number(operator.tax_due) > 0 ? "danger" : "default"} icon={<AlertTriangle className="h-5 w-5" />} />
                  <StatCard title="Monthly Tickets" value={formatNumber(operator.monthly_tickets)} icon={<Activity className="h-5 w-5" />} />
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle>GGR Trend (6 months)</CardTitle></CardHeader>
                    <CardContent>
                      {chartData.length > 0 ? (
                        <GgrChart data={chartData} />
                      ) : (
                        <EmptyState icon={<Activity className="h-5 w-5" />} title="No snapshot data" description="No monthly data available yet." className="py-8" />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Operator Details</CardTitle></CardHeader>
                    <CardContent>
                      <dl className="space-y-3 text-sm">
                        {[
                          ["Legal name", operator.legal_name, "break-words"],
                          ["Beneficial owner", operator.beneficial_owner ?? "—"],
                          ["County / Region", `${operator.county ?? "—"} / ${operator.region ?? "—"}`],
                          ["Email", operator.email ?? "—", "break-all"],
                        ].map(([label, value, extraClass]) => (
                          <div key={String(label)} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                            <dt className="text-muted-foreground shrink-0">{label}</dt>
                            <dd className={`font-medium sm:text-right ${extraClass ?? ""}`}>{value}</dd>
                          </div>
                        ))}
                        {operator.website && (
                          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
                            <dt className="text-muted-foreground shrink-0">Website</dt>
                            <dd className="break-all sm:text-right">
                              <a href={operator.website} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                                {operator.website}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                {operator.licences && operator.licences.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Licences</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {operator.licences.map((licence) => (
                          <div key={licence.licence_number} className="rounded-lg border border-border bg-secondary/30 p-3">
                            <p className="font-mono text-sm font-semibold">{licence.licence_number}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Expires {new Date(licence.expires_at).toLocaleDateString("en-KE")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {tab === "live" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard title="Tickets today" value={formatNumber(liveCounters?.tickets_today)} icon={<Activity className="h-5 w-5" />} />
                  <StatCard title="Revenue today" value={formatKsh(liveCounters?.revenue_today)} variant="success" icon={<Building2 className="h-5 w-5" />} />
                </div>
                <Card>
                  <CardContent className="p-0">
                    <LiveActivityTicker events={operatorLiveEvents} connected={liveConnected} showOperator={false} />
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "submissions" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Submission History</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={() => {
                        if (!token) return;
                        downloadWithAuth(token, `/operators/${externalId}/submissions/export`).then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `${externalId}-submissions.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                      }}
                    >
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {submissions.length === 0 ? (
                    <EmptyState icon={<FileText className="h-5 w-5" />} title="No submissions" description="No submission history found." className="py-10" />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-border bg-secondary/50">
                          <tr>
                            {["Period", "Status", "GGR", "Tax Due", "Outstanding"].map((h) => (
                              <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                              <td className="px-5 py-3.5">{s.reporting_period?.label ?? "—"}</td>
                              <td className="px-5 py-3.5"><Badge variant={submissionBadge(s.status)} dot>{s.status}</Badge></td>
                              <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.gross_gaming_revenue)}</td>
                              <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.tax_due)}</td>
                              <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.tax_outstanding)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "enforcement" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Enforcement Cases</CardTitle>
                    {canAct && (
                      <Button size="sm" variant="primary" leftIcon={<FolderPlus className="h-4 w-4" />} onClick={() => { setActionDetails(""); setActiveAction("case"); }}>
                        Open Case
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {cases.length === 0 ? (
                    <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No enforcement cases" description="This operator has no enforcement history." className="py-8" />
                  ) : (
                    <ul className="space-y-3">
                      {cases.map((c) => (
                        <li key={c.id} className="rounded-lg border border-border p-4 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{c.case_number}</span>
                            <Badge variant="muted">{c.status}</Badge>
                            <Badge variant="warning">{c.case_type}</Badge>
                          </div>
                          <p className="font-medium">
                            <Link href={`/enforcement/${c.id}`} className="hover:text-primary transition-colors">{c.title}</Link>
                          </p>
                          {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                          {c.actions && c.actions.length > 0 && (
                            <ul className="border-t border-border/50 pt-2 space-y-1">
                              {c.actions.map((a) => (
                                <li key={a.id} className="text-xs text-muted-foreground">
                                  {new Date(a.created_at).toLocaleDateString("en-KE")} — {a.action_type}: {a.details}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "documents" && (
              <Card>
                <CardHeader><CardTitle>Document Vault</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {(user.role === "admin" || user.role === "supervisor" || user.role === "analyst") && (
                    <form onSubmit={handleUpload} className="grid gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:grid-cols-2">
                      <input name="title" placeholder="Document title" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                      <select name="document_type" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" defaultValue="other">
                        <option value="licence">Licence</option>
                        <option value="submission">Submission</option>
                        <option value="enforcement">Enforcement</option>
                        <option value="correspondence">Correspondence</option>
                        <option value="other">Other</option>
                      </select>
                      <input name="file" type="file" required className="text-sm sm:col-span-2" />
                      <Button type="submit" loading={uploading} className="sm:col-span-2">{uploading ? "Uploading…" : "Upload document"}</Button>
                    </form>
                  )}
                  {documents.length === 0 ? (
                    <EmptyState icon={<FileText className="h-5 w-5" />} title="No documents" description="No documents uploaded yet." />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="rounded-lg border border-border p-4 space-y-1">
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                          <p className="text-xs text-muted-foreground">{doc.uploader?.full_name ?? "GRA"} · {new Date(doc.uploaded_at).toLocaleDateString("en-KE")}</p>
                          <button onClick={() => handleDownload(doc.id, doc.title)} className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline">
                            <Download className="h-3 w-3" /> Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Action Dialog ───────────────────────────────── */}
      <Dialog open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeAction ? actionLabels[activeAction] : ""}</DialogTitle>
            <DialogDescription>{activeAction ? actionDescriptions[activeAction] : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="mb-1.5 block text-sm font-medium">
              {activeAction ? actionFieldLabels[activeAction] : ""}
            </label>
            {activeAction === "case" ? (
              <input
                type="text"
                value={actionDetails}
                onChange={(e) => setActionDetails(e.target.value)}
                placeholder="e.g. Investigation into non-reporting"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            ) : (
              <textarea
                rows={3}
                value={actionDetails}
                onChange={(e) => setActionDetails(e.target.value)}
                placeholder="Enter reason…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              variant={activeAction === "suspend" ? "danger" : activeAction === "warning" ? "warning" : "primary"}
              size="sm"
              loading={actionLoading}
              onClick={submitAction}
            >
              {activeAction ? actionLabels[activeAction] : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
