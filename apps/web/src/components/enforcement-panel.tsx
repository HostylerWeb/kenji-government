"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, FolderPlus } from "lucide-react";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { Tabs } from "@/components/tabs";
import { EnforcementCaseCard } from "@/components/enforcement-case-card";
import { EnforcementWarningCard } from "@/components/enforcement-warning-card";
import { OpenEnforcementCaseDialog } from "@/components/open-enforcement-case-dialog";
import { toast } from "@/components/toast";
import type { CreateEnforcementCaseInput, EnforcementCaseType } from "@kenji-government/shared";
import { ENFORCEMENT_CASE_TYPES } from "@kenji-government/shared";
import {
  createEnforcementCase,
  type EnforcementCase,
  type EnforcementWarning,
} from "@/lib/api";
import { CASE_TYPE_LABELS, filterEnforcementCases } from "@/lib/enforcement";
import { cn } from "@/lib/utils";

export function EnforcementPanel({
  token,
  externalId,
  canAct,
  cases,
  warnings,
  onRefresh,
  showOperatorOnWarnings = false,
  title = "Enforcement Cases",
  subtitle = "Warnings, investigations, penalties, and operator compliance actions",
  activeSubTab,
  onSubTabChange,
}: {
  token: string | null;
  externalId?: string;
  canAct: boolean;
  cases: EnforcementCase[];
  warnings: EnforcementWarning[];
  onRefresh: () => Promise<void>;
  showOperatorOnWarnings?: boolean;
  title?: string;
  subtitle?: string;
  activeSubTab?: string;
  onSubTabChange?: (tab: string) => void;
}) {
  const [internalSubTab, setInternalSubTab] = useState("open");
  const subTab = activeSubTab ?? internalSubTab;
  const setSubTab = onSubTabChange ?? setInternalSubTab;
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseTypeFilter, setCaseTypeFilter] = useState<EnforcementCaseType | "all">("all");

  const openCases = useMemo(
    () => filterEnforcementCases(cases, "open", caseTypeFilter),
    [cases, caseTypeFilter],
  );
  const resolvedCases = useMemo(
    () => filterEnforcementCases(cases, "resolved", caseTypeFilter),
    [cases, caseTypeFilter],
  );

  const tabCounts = useMemo(
    () => ({
      open: filterEnforcementCases(cases, "open", caseTypeFilter).length,
      resolved: filterEnforcementCases(cases, "resolved", caseTypeFilter).length,
      warnings: warnings.length,
    }),
    [cases, warnings, caseTypeFilter],
  );

  const enforcementTabs = useMemo(
    () => [
      {
        id: "open",
        label: "Open Cases",
        count: tabCounts.open,
        tone: "primary" as const,
      },
      {
        id: "resolved",
        label: "Resolved Cases",
        count: tabCounts.resolved,
        tone: "success" as const,
      },
      {
        id: "warnings",
        label: "Warnings",
        count: tabCounts.warnings,
        tone: "warning" as const,
      },
    ],
    [tabCounts],
  );

  function countForCaseType(type: EnforcementCaseType | "all") {
    const bucket = subTab === "resolved" ? "resolved" : "open";
    return filterEnforcementCases(cases, bucket, type).length;
  }

  async function handleOpenCase(input: CreateEnforcementCaseInput) {
    if (!token || !externalId) return;
    setCaseLoading(true);
    try {
      await createEnforcementCase(token, externalId, input);
      await onRefresh();
      setCaseDialogOpen(false);
      setSubTab("open");
      toast.success("Enforcement case opened.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open case");
    } finally {
      setCaseLoading(false);
    }
  }

  const visibleCases = subTab === "resolved" ? resolvedCases : openCases;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            {canAct && externalId && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<FolderPlus className="h-4 w-4" />}
                onClick={() => setCaseDialogOpen(true)}
              >
                Open Case
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            tabs={enforcementTabs}
            active={subTab}
            onChange={setSubTab}
            variant="underline"
          />

          {subTab !== "warnings" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCaseTypeFilter("all")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  caseTypeFilter === "all"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                All types
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    caseTypeFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {countForCaseType("all")}
                </span>
              </button>
              {ENFORCEMENT_CASE_TYPES.map((type) => {
                const typeCount = countForCaseType(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCaseTypeFilter(type)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      caseTypeFilter === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {CASE_TYPE_LABELS[type]}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        caseTypeFilter === type
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {typeCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {subTab === "warnings" ? (
            warnings.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-5 w-5" />}
                title="No warnings issued"
                description="Warnings sent to this operator will appear here with date and content."
                className="py-8"
              />
            ) : (
              <ul className="space-y-3">
                {warnings.map((warning) => (
                  <li key={warning.id}>
                    <EnforcementWarningCard
                      warning={warning}
                      showOperator={showOperatorOnWarnings}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : visibleCases.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title={subTab === "open" ? "No open cases" : "No resolved cases"}
              description={
                subTab === "open"
                  ? "Open a case to start a formal investigation or enforcement action."
                  : "Resolved cases will appear here once closed."
              }
              className="py-8"
            />
          ) : (
            <ul className="space-y-3">
              {visibleCases.map((caseRecord) => (
                <li key={caseRecord.id}>
                  <EnforcementCaseCard caseRecord={caseRecord} compact />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {externalId && (
        <OpenEnforcementCaseDialog
          open={caseDialogOpen}
          onOpenChange={setCaseDialogOpen}
          loading={caseLoading}
          onSubmit={handleOpenCase}
        />
      )}
    </>
  );
}
