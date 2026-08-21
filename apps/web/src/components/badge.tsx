import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-secondary text-foreground border border-border/50",
        outline: "border border-border text-foreground bg-transparent",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-danger",
        primary: "bg-primary-subtle text-primary",
        muted: "bg-secondary text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      dot: false,
    },
  }
);

const dotColors: Record<string, string> = {
  default: "bg-muted-foreground",
  outline: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  primary: "bg-primary",
  muted: "bg-muted-foreground",
};

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant = "default", size, dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size, dot, className }))}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "block h-1.5 w-1.5 rounded-full shrink-0",
            dotColors[variant ?? "default"]
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };

// ─── Compliance helpers ──────────────────────────────────────
export function complianceBadgeVariant(
  status: string
): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "compliant":
      return "success";
    case "at_risk":
      return "warning";
    case "non_compliant":
      return "danger";
    default:
      return "muted";
  }
}

export function complianceLabel(status: string): string {
  switch (status) {
    case "compliant":
      return "Compliant";
    case "at_risk":
      return "At Risk";
    case "non_compliant":
      return "Non-Compliant";
    default:
      return status;
  }
}

export function operatorStatusBadgeVariant(
  status: string,
): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "suspended":
    case "revoked":
      return "danger";
    default:
      return "muted";
  }
}

export function operatorStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "revoked":
      return "Revoked";
    case "pending":
      return "Pending";
    default:
      return status.replace(/_/g, " ");
  }
}
