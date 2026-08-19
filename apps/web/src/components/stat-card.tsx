import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  subLabel?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
  loading?: boolean;
  className?: string;
}

const variantStyles = {
  default: {
    icon: "bg-secondary text-muted-foreground",
    badge: "",
  },
  primary: {
    icon: "bg-primary-subtle text-primary",
    badge: "",
  },
  success: {
    icon: "bg-success-subtle text-success",
    badge: "text-success",
  },
  warning: {
    icon: "bg-warning-subtle text-warning",
    badge: "text-warning",
  },
  danger: {
    icon: "bg-danger-subtle text-danger",
    badge: "text-danger",
  },
};

export function StatCard({
  title,
  value,
  subLabel,
  trend,
  icon,
  variant = "default",
  loading,
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  if (loading) {
    return (
      <div className={cn("rounded-xl border bg-card p-5 shadow-card space-y-3", className)}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  const trendSign = trend && trend.value > 0 ? "+" : "";
  const TrendIcon =
    trend?.value === 0 ? Minus : trend && trend.value > 0 ? TrendingUp : TrendingDown;
  const trendColor =
    trend?.value === 0
      ? "text-muted-foreground"
      : trend && trend.value > 0
      ? "text-success"
      : "text-danger";

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">
            {value}
          </p>
          {(subLabel || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    trendColor
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  {trendSign}
                  {trend.value}%
                </span>
              )}
              {subLabel && (
                <span className="text-xs text-muted-foreground">{subLabel}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              styles.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
