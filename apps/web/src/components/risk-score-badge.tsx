import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
}

const RISK_STYLES: Record<
  RiskLevel,
  { label: string; badge: string; bar: string; text: string }
> = {
  low: {
    label: "Low",
    badge: "bg-success-subtle text-success border-success/20",
    bar: "bg-success",
    text: "text-success",
  },
  medium: {
    label: "Medium",
    badge: "bg-warning-subtle text-warning border-warning/20",
    bar: "bg-warning",
    text: "text-warning",
  },
  high: {
    label: "High",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    bar: "bg-orange-500",
    text: "text-orange-700",
  },
  critical: {
    label: "Critical",
    badge: "bg-danger-subtle text-danger border-danger/20",
    bar: "bg-danger",
    text: "text-danger",
  },
};

export function RiskScoreBadge({
  score,
  showBar = true,
  className,
}: {
  score: number;
  showBar?: boolean;
  className?: string;
}) {
  const level = getRiskLevel(score);
  const styles = RISK_STYLES[level];

  return (
    <div className={cn("min-w-[7rem]", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
          styles.badge,
        )}
      >
        <span className={cn("font-semibold tabular-nums", styles.text)}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wide opacity-80">
          {styles.label}
        </span>
      </div>
      {showBar && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", styles.bar)}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function RiskScoreInline({ score }: { score: number }) {
  const level = getRiskLevel(score);
  const styles = RISK_STYLES[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles.badge,
      )}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-80">Risk</span>
      <span className={cn("font-semibold tabular-nums", styles.text)}>
        {score}
      </span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">
        · {styles.label}
      </span>
    </span>
  );
}
