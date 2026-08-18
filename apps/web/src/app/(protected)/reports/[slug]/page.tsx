"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { useAuth } from "@/lib/use-auth";
import {
  getReport,
  runReport,
  getReportRun,
  downloadReportRun,
  type ReportDefinition,
  type ReportRun,
} from "@/lib/api";

export default function ReportDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, token } = useAuth();
  const [report, setReport] = useState<ReportDefinition | null>(null);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [lastRun, setLastRun] = useState<ReportRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    getReport(token, slug)
      .then((data) => {
        setReport(data);
        const defaults: Record<string, string> = {};
        for (const field of data.parameters_schema.fields ?? []) {
          if (field.default !== undefined) {
            defaults[field.name] = String(field.default);
          }
        }
        setParameters(defaults);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, slug]);

  async function handleGenerate() {
    if (!token || !report) return;
    setLoading(true);
    setError("");
    setMessage("");

    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parameters)) {
      const field = report.parameters_schema.fields?.find((f) => f.name === key);
      parsed[key] =
        field?.type === "number" ? Number(value) : value;
    }

    try {
      const run = await runReport(token, slug, { format, parameters: parsed });
      setLastRun(run);
      setMessage("Report queued. Waiting for completion…");

      if (run.status === "queued" || run.status === "running") {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const updated = await getReportRun(token, run.id);
          setLastRun(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            break;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!token || !lastRun) return;
    try {
      await downloadReportRun(token, lastRun.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  if (!user) return null;

  return (
    <AppShell
      user={user}
      title={report?.title ?? "Report"}
      breadcrumbs={[
        { label: "Reports", href: "/reports" },
        { label: report?.title ?? slug },
      ]}
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}
      {message && (
        <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{message}</p>
      )}

      {report && (
        <Card>
          <p className="text-sm text-muted">{report.description}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(report.parameters_schema.fields ?? []).map((field) => (
              <label key={field.name} className="block text-sm">
                <span className="font-medium">{field.label}</span>
                <input
                  type={field.type === "number" ? "number" : "text"}
                  min={field.min}
                  max={field.max}
                  value={parameters[field.name] ?? ""}
                  onChange={(e) =>
                    setParameters((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                />
              </label>
            ))}
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium">Export format</label>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={format === "pdf"}
                  onChange={() => setFormat("pdf")}
                />
                PDF
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                />
                CSV
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Generating…" : "Generate report"}
            </button>
            {lastRun?.status === "completed" && (
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                Download {lastRun.format.toUpperCase()}
              </button>
            )}
          </div>

          {lastRun && (
            <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">
              <p>
                Status: <strong>{lastRun.status}</strong>
              </p>
              {lastRun.error_message && (
                <p className="mt-1 text-danger">{lastRun.error_message}</p>
              )}
              {lastRun.completed_at && (
                <p className="mt-1 text-muted">
                  Completed: {new Date(lastRun.completed_at).toLocaleString("en-KE")}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      <p className="mt-4 text-sm text-muted">
        <Link href="/reports/history" className="text-primary hover:underline">
          View all report runs
        </Link>
      </p>
    </AppShell>
  );
}
