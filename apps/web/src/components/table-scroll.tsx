import { cn } from "@/lib/utils";

/** Horizontal scroll wrapper for wide tables on small screens. */
export function TableScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableScroll className={className}>
      <table className="min-w-full text-left text-sm">{children}</table>
    </TableScroll>
  );
}
