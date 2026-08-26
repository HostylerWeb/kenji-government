"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/card";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton";
import { useAuth } from "@/lib/use-auth";
import { getOperatorApplications, type OperatorApplicationItem } from "@/lib/api";

const STATUS_TABS = [
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

function statusVariant(status: string) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "rejected":
      return "danger" as const;
    case "under_review":
      return "warning" as const;
    default:
      return "default" as const;
  }
}

export default function ApplicationsPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState("submitted");
  const [rows, setRows] = useState<OperatorApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getOperatorApplications(token, tab === "all" ? undefined : tab)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [token, tab]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Operator applications">
      <PageHeader
        title="Operator applications"
        subtitle="Kenji platform operators requesting GRA connection and ingest credentials."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? "primary" : "outline"}
            size="sm"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <SkeletonTable rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState title="No applications" description="Nothing in this queue yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-slate-500">
                    <th className="px-4 py-3">Trading name</th>
                    <th className="px-4 py-3">External ID</th>
                    <th className="px-4 py-3">Staging</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="px-4 py-3 font-medium">{row.trading_name}</td>
                      <td className="px-4 py-3">
                        <code>{row.proposed_external_id}</code>
                      </td>
                      <td className="px-4 py-3">{row.staging_hostname}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(row.status)}>
                          {row.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/applications/${row.id}`}>
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
