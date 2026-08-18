import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
  className?: string;
}) {
  const variants = {
    default: "bg-secondary text-foreground",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    muted: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function complianceBadgeVariant(status: string) {
  switch (status) {
    case "compliant":
      return "success" as const;
    case "at_risk":
      return "warning" as const;
    case "non_compliant":
      return "danger" as const;
    default:
      return "muted" as const;
  }
}

export function complianceLabel(status: string) {
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
