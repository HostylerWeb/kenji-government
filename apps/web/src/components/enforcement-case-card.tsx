import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/badge";
import type { EnforcementCase } from "@/lib/api";
import {
  CASE_NATURE_LABELS,
  CASE_PRIORITY_LABELS,
  CASE_TYPE_LABELS,
  formatActionDetails,
  getCaseNextSteps,
  parseEnforcementMetadata,
  priorityVariant,
} from "@/lib/enforcement";
import { cn } from "@/lib/utils";

export function EnforcementCaseCard({
  caseRecord,
  compact = false,
}: {
  caseRecord: EnforcementCase;
  compact?: boolean;
}) {
  const metadata = parseEnforcementMetadata(caseRecord.metadata);
  const nextSteps = getCaseNextSteps(metadata).slice(0, compact ? 2 : 4);

  return (
    <Link
      href={`/enforcement/${caseRecord.id}`}
      className={cn(
        "block rounded-lg border border-border bg-secondary/10 p-4 space-y-3 transition-colors",
        "hover:border-primary/40 hover:bg-secondary/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">
          {caseRecord.case_number}
        </span>
        <Badge variant="muted">{caseRecord.status}</Badge>
        <Badge variant="warning">
          {CASE_TYPE_LABELS[caseRecord.case_type as keyof typeof CASE_TYPE_LABELS] ??
            caseRecord.case_type}
        </Badge>
        {metadata && (
          <Badge variant={priorityVariant(metadata.priority)}>
            {CASE_PRIORITY_LABELS[metadata.priority]} priority
          </Badge>
        )}
        {metadata?.is_internal && <Badge variant="muted">Internal</Badge>}
        {metadata?.requires_operator_response && (
          <Badge variant="primary">Operator response required</Badge>
        )}
        {metadata?.pending_document_request && (
          <Badge variant="warning">Awaiting documents</Badge>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{caseRecord.title}</h3>
          {metadata && (
            <p className="mt-1 text-sm text-muted-foreground">
              {CASE_NATURE_LABELS[metadata.nature]}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />
      </div>

      {(metadata?.allegations_summary || caseRecord.description) && (
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
          {metadata?.has_allegations && metadata.allegations_summary
            ? metadata.allegations_summary
            : caseRecord.description}
        </p>
      )}

      {metadata?.has_financial_penalty && metadata.fine_amount && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Financial penalty</p>
          <p className="mt-1 text-muted-foreground">
            KES {metadata.fine_amount}
            {metadata.fine_due_by ? ` · due by ${metadata.fine_due_by}` : ""}
          </p>
        </div>
      )}

      {metadata?.requires_documents && metadata.required_documents && (
        <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">
          <p className="font-medium text-foreground">Documents / evidence required</p>
          <p className="mt-1 text-muted-foreground whitespace-pre-wrap line-clamp-2">
            {metadata.required_documents}
          </p>
        </div>
      )}

      {!compact && (
        <div className="rounded-lg border border-dashed border-border/70 bg-background px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next steps
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {nextSteps.map((step) => (
              <li key={step}>• {step}</li>
            ))}
          </ul>
        </div>
      )}

      {caseRecord.actions && caseRecord.actions.length > 0 && (
        <ul className="border-t border-border/50 pt-2 space-y-1">
          {caseRecord.actions.slice(0, compact ? 2 : 5).map((action) => (
            <li key={action.id} className="text-xs text-muted-foreground">
              {new Date(action.created_at).toLocaleDateString("en-KE")} — {action.action_type}:{" "}
              {formatActionDetails(action.details)}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs font-medium text-primary">Open case to take action →</p>
    </Link>
  );
}
