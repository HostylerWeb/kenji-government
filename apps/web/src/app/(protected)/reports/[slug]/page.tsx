"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ReportPreviewPanel } from "@/components/report-preview-panel";
import { useAuth } from "@/lib/use-auth";
import { getReport, type ReportDefinition } from "@/lib/api";

function ReportDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, token } = useAuth();
  const [report, setReport] = useState<ReportDefinition | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getReport(token, slug)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, slug]);

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
      <Link
        href={`/reports?category=${report?.category ?? "commercial"}&report=${slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports hub
      </Link>

      {error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {report && token && (
        <ReportPreviewPanel report={report} token={token} />
      )}
    </AppShell>
  );
}

export default function ReportDetailPage() {
  return (
    <Suspense fallback={null}>
      <ReportDetailContent />
    </Suspense>
  );
}
