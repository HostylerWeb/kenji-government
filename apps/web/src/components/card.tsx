import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      {description && (
        <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{description}</p>
      )}
    </div>
  );
}
