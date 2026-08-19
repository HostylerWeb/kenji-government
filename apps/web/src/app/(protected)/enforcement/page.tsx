"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Clock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Card, CardContent } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/lib/use-auth";
import { getEnforcementCases, type EnforcementCase } from "@/lib/api";

const STATUS_TABS = [
  { id: "open", label: "Open" },
  { id: "escalated", label: "Escalated" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
];

function caseStatusVariant(status: string): "danger" | "warning" | "success" | "muted" {
  switch (status) {
    case "open": return "danger";
    case "escalated": return "warning";
    case "resolved": return "success";
    default: return "muted";
  }
}

function caseTypeVariant(type: string): "warning" | "danger" | "primary" | "muted" {
  switch (type) {
    case "warning": return "warning";
    case "suspension": return "danger";
    default: return "primary";
  }
}

export default function EnforcementPage() {
  const { user, token } = useAuth();
  const [status, setStatus] = useState("open");
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getEnforcementCases(token, { status })
      .then(setCases)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, status]);

  if (!user) return null;

  return (
    <AppShell user={user} title="Enforcement Centre">
      <div className="space-y-5">
        <PageHeader
          title="Enforcement Centre"
          subtitle="Manage enforcement cases, warnings and suspensions"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Enforcement" }]}
        />

        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="pb-0">
            <Tabs
              tabs={STATUS_TABS}
              active={status}
              onChange={setStatus}
              variant="underline"
            />
          </CardContent>
        </Card>

        {!loading && cases.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            title={`No ${status} cases`}
            description="No enforcement cases match this status."
          />
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card key={c.id} className="transition-shadow hover:shadow-card-hover">
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                      {c.case_number}
                    </span>
                    <Badge variant={caseStatusVariant(c.status)} dot>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                    <Badge variant={caseTypeVariant(c.case_type)}>
                      {c.case_type}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      <Link href={`/enforcement/${c.id}`} className="hover:text-primary transition-colors">
                        {c.title}
                      </Link>
                    </h3>
                    {c.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                    )}
                    {c.operator && (
                      <Link
                        href={`/operators/${c.operator.external_id}`}
                        className="mt-1.5 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {c.operator.trading_name}
                      </Link>
                    )}
                  </div>

                  {c.actions && c.actions.length > 0 && (
                    <div className="border-t border-border/50 pt-3 space-y-1">
                      {c.actions.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>
                            {new Date(a.created_at).toLocaleDateString("en-KE")} —{" "}
                            <span className="font-medium">{a.action_type}</span>: {a.details}
                            {a.performer && ` (${a.performer.full_name})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
