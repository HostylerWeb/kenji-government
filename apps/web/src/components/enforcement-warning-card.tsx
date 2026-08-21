import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/badge";
import type { EnforcementWarning } from "@/lib/api";
import { formatActionDetails } from "@/lib/enforcement";

export function EnforcementWarningCard({
  warning,
  showOperator = false,
}: {
  warning: EnforcementWarning;
  showOperator?: boolean;
}) {
  const content = formatActionDetails(warning.details) || "No warning content recorded.";

  return (
    <article className="rounded-lg border border-warning/30 bg-warning-subtle/30 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" size="sm">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(warning.created_at).toLocaleString("en-KE")}
        </span>
        {warning.performer && (
          <span className="text-xs text-muted-foreground">
            — issued by {warning.performer.full_name}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{content}</p>

      {warning.case && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono bg-secondary px-1.5 py-0.5 rounded">
            {warning.case.case_number}
          </span>
          <Link href={`/enforcement/${warning.case.id}`} className="text-primary hover:underline">
            View case
          </Link>
          {showOperator && warning.case.operator && (
            <Link
              href={`/operators/${warning.case.operator.external_id}`}
              className="text-primary hover:underline"
            >
              {warning.case.operator.trading_name}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
