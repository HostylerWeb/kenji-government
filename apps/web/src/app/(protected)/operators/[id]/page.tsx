"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  AlertTriangle,
  PauseCircle,
  FolderPlus,
  Building2,
  FileText,
  CheckCircle2,
  Activity,
  Eye,
  Shield,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel, operatorStatusBadgeVariant, operatorStatusLabel } from "@/components/badge";
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
import { RiskScoreInline } from "@/components/risk-score-badge";
import { LiveActivityTicker } from "@/components/live-activity-ticker";
import { SubmissionReviewPanel } from "@/components/submission-review-panel";
import { EnforcementPanel } from "@/components/enforcement-panel";
import { useLiveStream } from "@/hooks/use-live-stream";
import { useAuth } from "@/lib/use-auth";
import {
  getOperator,
  getOperatorSubmissions,
  getOperatorEnforcement,
  getOperatorEnforcementWarnings,
  getOperatorDocuments,
  getLiveActivity,
  getLiveCounters,
  operatorWarning,
  operatorSuspend,
  downloadWithAuth,
  uploadOperatorDocument,
  type OperatorDetail,
  type SubmissionItem,
  type EnforcementCase,
  type EnforcementWarning,
  type DocumentItem,
  type LiveFeedItem,
  type LiveCounters,
} from "@/lib/api";
import {
  canReviewSubmissions,
  submissionStatusLabel,
  submissionStatusVariant,
} from "@/lib/submissions";
import { isImportantLiveEvent } from "@kenji-government/shared";
import { filterEnforcementCases } from "@/lib/enforcement";
import { formatKsh, formatNumber } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "live", label: "Live Activity" },
  { id: "submissions", label: "Submissions" },
  { id: "enforcement", label: "Enforcement" },
  { id: "documents", label: "Documents" },
];

type ActionType = "warning" | "suspend";

export default function OperatorDetailPage() {
  return (
    <Suspense fallback={null}>
      <OperatorDetailPageContent />
    </Suspense>
  );
}

function OperatorDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const externalId = params.id as string;
  const { user, token } = useAuth();
  const [tab, setTab] = useState("overview");
  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [warnings, setWarnings] = useState<EnforcementWarning[]>([]);
  const [enforcementSubTab, setEnforcementSubTab] = useState("open");
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
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const enforcementParam = searchParams.get("enforcement");
    if (tabParam && TABS.some((item) => item.id === tabParam)) {
      setTab(tabParam);
    }
    if (
      enforcementParam === "open" ||
      enforcementParam === "resolved" ||
      enforcementParam === "warnings"
    ) {
      setEnforcementSubTab(enforcementParam);
    }
  }, [searchParams]);

  function changeTab(nextTab: string) {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

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
    getLiveActivity(token, { operator_external_id: externalId, limit: 30 })
      .then((data) => setLiveActivity(data.items))
      .catch(() => {});
    getLiveCounters(token, externalId).then(setLiveCounters).catch(() => {});
  }, [token, externalId]);

  async function refreshEnforcement() {
    if (!token) return;
    const [casesData, warningsData] = await Promise.all([
      getOperatorEnforcement(token, externalId),
      getOperatorEnforcementWarnings(token, externalId),
    ]);
    setCases(casesData);
    setWarnings(warningsData);
  }

  useEffect(() => {
    if (!token) return;
    refreshEnforcement().catch(() => {});
  }, [token, externalId]);

  useEffect(() => {
    if (!token) return;
    if (tab === "submissions") getOperatorSubmissions(token, externalId).then(setSubmissions).catch(() => {});
    if (tab === "documents") getOperatorDocuments(token, externalId).then(setDocuments).catch(() => {});
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
        await refreshEnforcement();
        changeTab("enforcement");
        setEnforcementSubTab("warnings");
        toast.success("Warning issued successfully.");
      } else if (activeAction === "suspend") {
        await operatorSuspend(token, externalId, actionDetails);
        const op = await getOperator(token, externalId);
        setOperator(op);
        toast.success("Operator suspended.");
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
    for (const event of liveStreamEvents) {
      if (isImportantLiveEvent(event.event_type)) map.set(event.id, event);
    }
    for (const event of liveActivity) {
      if (isImportantLiveEvent(event.event_type)) map.set(event.id, event);
    }
    return [...map.values()]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 30);
  }, [liveStreamEvents, liveActivity]);

  const openCasesCount =
    cases.length > 0 || warnings.length > 0
      ? filterEnforcementCases(cases, "open").length
      : (operator?.open_cases_count ?? 0);
  const warningsCount =
    warnings.length > 0 ? warnings.length : (operator?.warnings_count ?? 0);

  const pageTabs = useMemo(
    () =>
      TABS.map((item) =>
        item.id === "enforcement" && openCasesCount > 0
          ? { ...item, count: openCasesCount, tone: "danger" as const }
          : item,
      ),
    [openCasesCount],
  );

  if (!user) return null;

  const canAct =
    user.role === "admin" ||
    user.role === "super_admin" ||
    user.role === "supervisor";
  const canReview = canReviewSubmissions(user.role);

  const actionLabels: Record<ActionType, string> = {
    warning: "Issue Warning",
    suspend: "Suspend Operator",
  };
  const actionDescriptions: Record<ActionType, string> = {
    warning: "Provide a reason for the warning. This will be recorded in the enforcement log.",
    suspend: "Suspending this operator will immediately restrict their operations. This action requires a reason.",
  };
  const actionFieldLabels: Record<ActionType, string> = {
    warning: "Reason (optional)",
    suspend: "Reason (required)",
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
                <Badge variant={operatorStatusBadgeVariant(operator.status)} dot>
                  {operatorStatusLabel(operator.status)}
                </Badge>
                <RiskScoreInline score={operator.risk_score} />
              </div>
              {canAct && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" leftIcon={<AlertTriangle className="h-4 w-4" />} onClick={() => { setActionDetails(""); setActiveAction("warning"); }}>
                    Warn
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<PauseCircle className="h-4 w-4" />} onClick={() => { setActionDetails(""); setActiveAction("suspend"); }}>
                    Suspend
                  </Button>
                  <Button size="sm" variant="secondary" leftIcon={<FolderPlus className="h-4 w-4" />} onClick={() => changeTab("enforcement")}>
                    Open Case
                  </Button>
                </div>
              )}
            </div>
          </div>

          {(openCasesCount > 0 || warningsCount > 0) && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning-subtle/30 px-4 py-3">
              <Shield className="h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-foreground">Enforcement attention required</p>
                <p className="text-muted-foreground">
                  {openCasesCount > 0
                    ? `${openCasesCount} open case${openCasesCount === 1 ? "" : "s"} requiring review`
                    : null}
                  {openCasesCount > 0 && warningsCount > 0 ? " · " : null}
                  {warningsCount > 0
                    ? `${warningsCount} formal warning${warningsCount === 1 ? "" : "s"} on record`
                    : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {openCasesCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEnforcementSubTab("open");
                      changeTab("enforcement");
                    }}
                  >
                    View open cases
                  </Button>
                )}
                {warningsCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEnforcementSubTab("warnings");
                      changeTab("enforcement");
                    }}
                  >
                    View warnings
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Card>
            <CardContent className="pb-0">
              <Tabs tabs={pageTabs} active={tab} onChange={changeTab} variant="underline" />
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
                  <StatCard
                    title="Payments today"
                    value={formatNumber(liveCounters?.gateway_payments_today)}
                    subLabel={`Live — ${liveCounters?.date ?? "today"}`}
                    icon={<Activity className="h-5 w-5" />}
                  />
                  <StatCard
                    title="Revenue today"
                    value={formatKsh(liveCounters?.revenue_today)}
                    subLabel="Gateway payments (EAT)"
                    variant="success"
                    icon={<Building2 className="h-5 w-5" />}
                  />
                </div>
                <Card className="flex max-h-[min(32rem,55vh)] flex-col">
                  <CardHeader className="shrink-0 border-b border-border/50 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Live Activity
                      </CardTitle>
                      <Badge
                        variant={liveConnected ? "success" : "muted"}
                        dot
                        size="sm"
                      >
                        {liveConnected ? "Connected" : "Reconnecting…"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
                    <LiveActivityTicker
                      events={operatorLiveEvents}
                      connected={liveConnected}
                      showOperator={false}
                      compact
                      emptyMessage="Waiting for payments, failures, and operator changes…"
                    />
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
                            {["Period", "Status", "GGR", "Tax Due", "Outstanding", "Actions"].map((h) => (
                              <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                              <td className="px-5 py-3.5">{s.reporting_period?.label ?? "—"}</td>
                              <td className="px-5 py-3.5">
                                <Badge variant={submissionStatusVariant(s.status)} dot>
                                  {submissionStatusLabel(s.status)}
                                </Badge>
                              </td>
                              <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.gross_gaming_revenue)}</td>
                              <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.tax_due)}</td>
                              <td className="px-5 py-3.5 tabular-nums">{formatKsh(s.tax_outstanding)}</td>
                              <td className="px-5 py-3.5">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  leftIcon={<Eye className="h-3.5 w-3.5" />}
                                  onClick={() => setReviewSubmissionId(s.id)}
                                >
                                  Review
                                </Button>
                              </td>
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
              <EnforcementPanel
                token={token}
                externalId={externalId}
                canAct={canAct}
                cases={cases}
                warnings={warnings}
                onRefresh={refreshEnforcement}
                activeSubTab={enforcementSubTab}
                onSubTabChange={setEnforcementSubTab}
              />
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
            <textarea
              rows={3}
              value={actionDetails}
              onChange={(e) => setActionDetails(e.target.value)}
              placeholder="Enter reason…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
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

      <SubmissionReviewPanel
        open={!!reviewSubmissionId}
        submissionId={reviewSubmissionId}
        token={token}
        canReview={canReview}
        userRole={user.role}
        onClose={() => setReviewSubmissionId(null)}
        onReviewed={() => {
          if (!token) return;
          getOperatorSubmissions(token, externalId).then(setSubmissions).catch(() => {});
        }}
      />
    </AppShell>
  );
}
