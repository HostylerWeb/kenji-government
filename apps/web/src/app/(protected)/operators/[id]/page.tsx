"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Card, CardHeader } from "@/components/card";
import { Tabs } from "@/components/tabs";
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
  { id: "live", label: "Live activity" },
  { id: "submissions", label: "Submissions" },
  { id: "enforcement", label: "Enforcement" },
  { id: "documents", label: "Documents" },
];

function submissionBadge(status: string) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    case "revision_requested":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export default function OperatorDetailPage() {
  const params = useParams();
  const externalId = params.id as string;
  const { user, token } = useAuth();
  const [tab, setTab] = useState("overview");
  const [operator, setOperator] = useState<OperatorDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState<LiveFeedItem[]>([]);
  const [liveCounters, setLiveCounters] = useState<LiveCounters | null>(null);
  const { events: liveStreamEvents, connected: liveConnected } = useLiveStream(
    token,
    externalId,
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    getOperator(token, externalId)
      .then(setOperator)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, externalId]);

  useEffect(() => {
    if (!token) return;
    if (tab === "submissions") {
      getOperatorSubmissions(token, externalId).then(setSubmissions).catch(() => {});
    }
    if (tab === "enforcement") {
      getOperatorEnforcement(token, externalId).then(setCases).catch(() => {});
    }
    if (tab === "documents") {
      getOperatorDocuments(token, externalId).then(setDocuments).catch(() => {});
    }
    if (tab === "live") {
      getLiveActivity(token, { operator_external_id: externalId, limit: 30 })
        .then((data) => setLiveActivity(data.items))
        .catch(() => {});
      getLiveCounters(token, externalId).then(setLiveCounters).catch(() => {});
    }
  }, [token, externalId, tab]);

  async function handleWarning() {
    if (!token) return;
    const details = prompt("Reason for warning (optional):");
    try {
      await operatorWarning(token, externalId, details ?? undefined);
      setActionMsg("Warning issued successfully.");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function handleSuspend() {
    if (!token) return;
    const details = prompt("Reason for suspension (required):");
    if (!details) return;
    if (!confirm("Confirm suspension of this operator?")) return;
    try {
      await operatorSuspend(token, externalId, details);
      setActionMsg("Operator suspended.");
      const op = await getOperator(token, externalId);
      setOperator(op);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Action failed");
    }
  }

  async function handleCreateCase() {
    if (!token) return;
    const title = prompt("Case title:");
    if (!title) return;
    try {
      await createEnforcementCase(token, externalId, {
        title,
        case_type: "investigation",
      });
      const updated = await getOperatorEnforcement(token, externalId);
      setCases(updated);
      setTab("enforcement");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Failed to create case");
    }
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setActionMsg("Select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    const title = (form.elements.namedItem("title") as HTMLInputElement)?.value;
    const documentType = (form.elements.namedItem("document_type") as HTMLSelectElement)?.value;
    formData.append("title", title || file.name);
    formData.append("document_type", documentType || "other");

    setUploading(true);
    setActionMsg("");
    try {
      await uploadOperatorDocument(token, externalId, formData);
      setDocuments(await getOperatorDocuments(token, externalId));
      form.reset();
      setActionMsg("Document uploaded successfully.");
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleOperatorAction(action: string) {
    if (action === "warning") await handleWarning();
    if (action === "suspend") await handleSuspend();
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
      setActionMsg("Download failed — file may not exist locally yet.");
    }
  }

  if (!user) return null;

  const chartData =
    operator?.monthly_snapshots?.map((s) => ({
      label: s.reporting_period.label,
      value: s.gross_gaming_revenue,
    })) ?? [];

  const operatorLiveEvents = useMemo(() => {
    const map = new Map<string, LiveFeedItem>();
    for (const event of liveStreamEvents) {
      map.set(event.id, event);
    }
    for (const event of liveActivity) {
      map.set(event.id, event);
    }
    return [...map.values()]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, 30);
  }, [liveStreamEvents, liveActivity]);

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
      {loading && <p className="text-sm text-muted">Loading operator...</p>}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {actionMsg && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{actionMsg}</p>
      )}

      {operator && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={complianceBadgeVariant(operator.compliance_status)}>
                {complianceLabel(operator.compliance_status)}
              </Badge>
              <Badge variant="muted">{operator.status}</Badge>
              <span className="text-sm text-muted">Risk: {operator.risk_score}</span>
            </div>
            {(user.role === "admin" || user.role === "supervisor") && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const action = e.target.value;
                  e.target.value = "";
                  if (action) handleOperatorAction(action);
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Operator actions</option>
                <option value="warning">Issue warning</option>
                <option value="suspend">Suspend operator</option>
              </select>
            )}
          </div>

          <Tabs tabs={TABS} active={tab} onChange={setTab} />

          <div className="mt-6">
            {tab === "overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader title="Annual GGR" description={formatKsh(operator.annual_ggr)} />
                  </Card>
                  <Card>
                    <CardHeader title="Tax Paid" description={formatKsh(operator.tax_paid)} />
                  </Card>
                  <Card>
                    <CardHeader title="Tax Due" description={formatKsh(operator.tax_due)} />
                  </Card>
                  <Card>
                    <CardHeader
                      title="Monthly Tickets"
                      description={formatNumber(operator.monthly_tickets)}
                    />
                  </Card>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Card>
                    <h2 className="mb-4 text-base font-semibold">GGR Trend (6 months)</h2>
                    {chartData.length > 0 ? (
                      <GgrChart data={chartData} />
                    ) : (
                      <p className="text-sm text-muted">No snapshot data.</p>
                    )}
                  </Card>
                  <Card>
                    <h2 className="mb-4 text-base font-semibold">Overview</h2>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Legal name</dt>
                        <dd className="font-medium">{operator.legal_name}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Beneficial owner</dt>
                        <dd>{operator.beneficial_owner ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">County / Region</dt>
                        <dd>{operator.county ?? "—"} / {operator.region ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Email</dt>
                        <dd>{operator.email ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Website</dt>
                        <dd>
                          {operator.website ? (
                            <a
                              href={operator.website}
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {operator.website}
                            </a>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </div>

                {operator.licences && operator.licences.length > 0 && (
                  <Card className="mt-6">
                    <h2 className="mb-4 text-base font-semibold">Licences</h2>
                    <ul className="space-y-3 text-sm">
                      {operator.licences.map((licence) => (
                        <li
                          key={licence.licence_number}
                          className="rounded-lg border border-border p-3"
                        >
                          <p className="font-mono font-medium">{licence.licence_number}</p>
                          <p className="text-muted">
                            Expires{" "}
                            {new Date(licence.expires_at).toLocaleDateString("en-KE")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}

            {tab === "live" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader
                      title="Tickets today"
                      description={formatNumber(liveCounters?.tickets_today)}
                    />
                  </Card>
                  <Card>
                    <CardHeader
                      title="Revenue today"
                      description={formatKsh(liveCounters?.revenue_today)}
                    />
                  </Card>
                </div>
                <Card>
                  <LiveActivityTicker
                    events={operatorLiveEvents}
                    connected={liveConnected}
                    showOperator={false}
                  />
                </Card>
              </div>
            )}

            {tab === "submissions" && (
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Submission History</h2>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/operators/${externalId}/submissions/export`}
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!token) return;
                      downloadWithAuth(
                        token,
                        `/operators/${externalId}/submissions/export`,
                      ).then((blob) => {
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
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border text-muted">
                      <tr>
                        <th className="px-3 py-2">Period</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">GGR</th>
                        <th className="px-3 py-2">Tax Due</th>
                        <th className="px-3 py-2">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((s) => (
                        <tr key={s.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">
                            {s.reporting_period?.label ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={submissionBadge(s.status)}>{s.status}</Badge>
                          </td>
                          <td className="px-3 py-2">{formatKsh(s.gross_gaming_revenue)}</td>
                          <td className="px-3 py-2">{formatKsh(s.tax_due)}</td>
                          <td className="px-3 py-2">{formatKsh(s.tax_outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === "enforcement" && (
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Enforcement Cases</h2>
                  {(user.role === "admin" || user.role === "supervisor") && (
                    <button
                      onClick={handleCreateCase}
                      className="rounded-lg bg-primary px-3 py-2 text-sm text-white"
                    >
                      Open Case
                    </button>
                  )}
                </div>
                {cases.length === 0 ? (
                  <p className="text-sm text-muted">No enforcement cases on record.</p>
                ) : (
                  <ul className="space-y-4">
                    {cases.map((c) => (
                      <li key={c.id} className="rounded-lg border border-border p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs">{c.case_number}</span>
                          <Badge variant="muted">{c.status}</Badge>
                          <Badge variant="warning">{c.case_type}</Badge>
                        </div>
                        <p className="mt-2 font-medium">
                          <Link
                            href={`/enforcement/${c.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {c.title}
                          </Link>
                        </p>
                        {c.description && (
                          <p className="mt-1 text-sm text-muted">{c.description}</p>
                        )}
                        {c.actions && c.actions.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted">
                            {c.actions.map((a) => (
                              <li key={a.id}>
                                {new Date(a.created_at).toLocaleDateString("en-KE")} —{" "}
                                {a.action_type}: {a.details}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {tab === "documents" && (
              <Card>
                <h2 className="mb-4 text-base font-semibold">Document Vault</h2>
                {(user.role === "admin" ||
                  user.role === "supervisor" ||
                  user.role === "analyst") && (
                  <form
                    onSubmit={handleUpload}
                    className="mb-6 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
                  >
                    <input
                      name="title"
                      placeholder="Document title"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <select
                      name="document_type"
                      className="rounded-lg border border-border px-3 py-2 text-sm"
                      defaultValue="other"
                    >
                      <option value="licence">Licence</option>
                      <option value="submission">Submission</option>
                      <option value="enforcement">Enforcement</option>
                      <option value="correspondence">Correspondence</option>
                      <option value="other">Other</option>
                    </select>
                    <input
                      name="file"
                      type="file"
                      required
                      className="text-sm sm:col-span-2"
                    />
                    <button
                      type="submit"
                      disabled={uploading}
                      className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50 sm:col-span-2"
                    >
                      {uploading ? "Uploading..." : "Upload document"}
                    </button>
                  </form>
                )}
                {documents.length === 0 ? (
                  <p className="text-sm text-muted">No documents uploaded.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-lg border border-border p-4"
                      >
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted">{doc.document_type}</p>
                        <p className="mt-1 text-xs text-muted">
                          {doc.uploader?.full_name ?? "GRA"} ·{" "}
                          {new Date(doc.uploaded_at).toLocaleDateString("en-KE")}
                        </p>
                        <button
                          onClick={() => handleDownload(doc.id, doc.title)}
                          className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
