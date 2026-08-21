"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { StatCard } from "@/components/stat-card";
import { SortableDataTable } from "@/components/sortable-table";
import { ReportPreviewChartView } from "@/components/report-charts";
import { toast } from "@/components/toast";
import {
  downloadReportRun,
  getReportPreview,
  getReportRun,
  runReport,
  type ReportDefinition,
  type ReportPreview,
} from "@/lib/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayEatDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

function defaultParameters(report: ReportDefinition): Record<string, string> {
  const params: Record<string, string> = {};
  for (const field of report.parameters_schema.fields ?? []) {
    if (field.default !== undefined) {
      params[field.name] = String(field.default);
    }
  }
  if (report.slug === "payment_gateway_daily_volume" && !params.date) {
    params.date = todayEatDate();
  }
  return params;
}

export function ReportPreviewPanel({
  report,
  token,
  compact = false,
}: {
  report: ReportDefinition;
  token: string;
  compact?: boolean;
}) {
  const [parameters, setParameters] = useState<Record<string, string>>(() =>
    defaultParameters(report),
  );
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const parameterFields = useMemo(() => {
    const fields = [...(report.parameters_schema.fields ?? [])];
    if (report.slug === "payment_gateway_daily_volume") {
      const hasDate = fields.some((field) => field.name === "date");
      if (!hasDate) {
        fields.unshift({
          name: "date",
          type: "date",
          label: "Business date",
          default: todayEatDate(),
        });
      }
    }
    return fields;
  }, [report]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReportPreview(token, report.slug, parameters);
      setPreview(result.preview);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load preview");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [token, report.slug, parameters]);

  useEffect(() => {
    setParameters(defaultParameters(report));
  }, [report]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadPreview();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadPreview]);

  async function handleExport() {
    setExporting(true);
    setExportStatus("Queuing export…");
    try {
      const parsed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(parameters)) {
        const field = parameterFields.find((f) => f.name === key);
        parsed[key] = field?.type === "number" ? Number(value) : value;
      }

      const run = await runReport(token, report.slug, {
        format: exportFormat,
        parameters: parsed,
      });

      let latest = run;
      if (run.status === "queued" || run.status === "running") {
        setExportStatus("Generating file…");
        for (let i = 0; i < 30; i += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          latest = await getReportRun(token, run.id);
          if (latest.status === "completed" || latest.status === "failed") break;
        }
      }

      if (latest.status === "completed") {
        await downloadReportRun(token, latest.id);
        toast.success(`${exportFormat.toUpperCase()} downloaded`);
        setExportStatus(null);
      } else if (latest.status === "failed") {
        throw new Error(latest.error_message ?? "Export failed");
      } else {
        toast.success("Export queued — check History when ready");
        setExportStatus("Export still running — see History");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
      setExportStatus(null);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{report.title}</CardTitle>
              {report.description && (
                <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {report.is_scheduled && (
                <Badge variant="primary" size="sm">Scheduled</Badge>
              )}
              <Badge variant="muted" size="sm">{report.required_role}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {parameterFields.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-secondary/30 p-3">
              {parameterFields.map((field) => (
                <label key={field.name} className="min-w-[140px] text-sm">
                  <span className="mb-1 block font-medium text-foreground">{field.label}</span>
                  {field.name === "month" ? (
                    <select
                      value={parameters[field.name] ?? ""}
                      onChange={(e) =>
                        setParameters((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      {MONTHS.map((label, index) => (
                        <option key={label} value={String(index + 1)}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "date"
                            : "text"
                      }
                      min={field.min}
                      max={field.max}
                      value={parameters[field.name] ?? ""}
                      onChange={(e) =>
                        setParameters((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    />
                  )}
                </label>
              ))}
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={loadPreview}
                loading={loading}
              >
                Refresh
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Export view as</span>
              <Button
                variant={exportFormat === "pdf" ? "primary" : "outline"}
                size="sm"
                leftIcon={<FileText className="h-3.5 w-3.5" />}
                onClick={() => setExportFormat("pdf")}
              >
                PDF
              </Button>
              <Button
                variant={exportFormat === "csv" ? "primary" : "outline"}
                size="sm"
                leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                onClick={() => setExportFormat("csv")}
              >
                CSV
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-3.5 w-3.5" />}
              onClick={handleExport}
              loading={exporting}
            >
              Export {exportFormat.toUpperCase()}
            </Button>
          </div>

          {exportStatus && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {exportStatus}
            </p>
          )}
        </CardContent>
      </Card>

      {loading && !preview ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading preview…
        </div>
      ) : preview ? (
        <>
          {!compact && preview.summary.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {preview.summary.map((item) => (
                <StatCard
                  key={item.label}
                  title={item.label}
                  value={item.value}
                  variant={
                    item.tone === "danger"
                      ? "danger"
                      : item.tone === "warning"
                        ? "warning"
                        : item.tone === "success"
                          ? "success"
                          : "default"
                  }
                />
              ))}
            </div>
          )}

          {preview.chart && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{preview.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportPreviewChartView chart={preview.chart} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Detail table</CardTitle>
              <Badge variant="muted" size="sm">
                {preview.row_count} rows
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {preview.rows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">No rows for these filters.</p>
              ) : (
                <SortableDataTable
                  headers={preview.headers}
                  rows={preview.rows}
                  resetKey={`${report.slug}:${JSON.stringify(parameters)}`}
                  scrollClassName={
                    compact ? "max-h-80 overflow-y-auto" : "max-h-[32rem] overflow-y-auto"
                  }
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
