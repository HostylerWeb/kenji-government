"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { EnforcementPanel } from "@/components/enforcement-panel";
import { useAuth } from "@/lib/use-auth";
import {
  getEnforcementCases,
  getEnforcementWarnings,
  type EnforcementCase,
  type EnforcementWarning,
} from "@/lib/api";

export default function EnforcementPage() {
  const { user, token } = useAuth();
  const [cases, setCases] = useState<EnforcementCase[]>([]);
  const [warnings, setWarnings] = useState<EnforcementWarning[]>([]);
  const [error, setError] = useState("");

  const canAct =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "supervisor";

  const refresh = useCallback(async () => {
    if (!token) return;
    const [casesData, warningsData] = await Promise.all([
      getEnforcementCases(token),
      getEnforcementWarnings(token),
    ]);
    setCases(casesData);
    setWarnings(warningsData);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refresh().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load"),
    );
  }, [token, refresh]);

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

        <EnforcementPanel
          token={token}
          canAct={canAct}
          cases={cases}
          warnings={warnings}
          onRefresh={refresh}
          showOperatorOnWarnings
          title="Enforcement Centre"
          subtitle="Open investigations, resolved cases, and formal warnings across all operators"
        />
      </div>
    </AppShell>
  );
}
