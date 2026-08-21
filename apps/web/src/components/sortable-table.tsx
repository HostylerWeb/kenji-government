"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableScroll } from "@/components/table-scroll";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc";

function parseSortableValue(value: string | number | undefined): number | string {
  if (typeof value === "number") return value;
  if (value === undefined || value === "") return "";

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const dateMs = Date.parse(raw);
    if (!Number.isNaN(dateMs)) return dateMs;
  }

  const stripped = raw.replace(/,/g, "").replace(/[^\d.-]/g, "");
  if (stripped && /^-?\d+(\.\d+)?$/.test(stripped)) {
    return Number(stripped);
  }

  return raw.toLowerCase();
}

function compareSortValues(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), "en-KE", { numeric: true });
}

function compareRowValues(
  a: Record<string, string | number>,
  b: Record<string, string | number>,
  key: string,
): number {
  return compareSortValues(parseSortableValue(a[key]), parseSortableValue(b[key]));
}

export function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: string;
  activeKey: string | null;
  direction: SortDir;
  onSort: (key: string) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th className={cn("px-4 py-3", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </th>
  );
}

export type SortableColumn<T> = {
  id: string;
  label: string;
  sortValue: (row: T) => string | number;
  render: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export function SortableTable<T>({
  columns,
  rows,
  getRowKey,
  resetKey,
  scrollClassName,
  onRowMouseEnter,
  onRowMouseLeave,
  getRowClassName,
  emptyMessage = "No rows to display.",
}: {
  columns: SortableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  resetKey?: string;
  scrollClassName?: string;
  onRowMouseEnter?: (row: T) => void;
  onRowMouseLeave?: () => void;
  getRowClassName?: (row: T) => string;
  emptyMessage?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
  }, [resetKey]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((col) => col.id === sortKey);
    if (!column) return rows;

    const sorted = [...rows].sort((a, b) =>
      compareSortValues(column.sortValue(a), column.sortValue(b)),
    );
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [rows, sortKey, sortDir, columns]);

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <TableScroll className={scrollClassName}>
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-secondary/80 backdrop-blur">
          <tr>
            {columns.map((column) => (
              <SortableHeader
                key={column.id}
                label={column.label}
                sortKey={column.id}
                activeKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
                className={column.headerClassName}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, index) => (
            <tr
              key={getRowKey(row)}
              className={cn(
                "border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30",
                getRowClassName?.(row),
              )}
              onMouseEnter={() => onRowMouseEnter?.(row)}
              onMouseLeave={() => onRowMouseLeave?.()}
            >
              {columns.map((column) => (
                <td key={column.id} className={cn("px-4 py-3", column.cellClassName)}>
                  {column.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function SortableDataTable({
  headers,
  rows,
  scrollClassName,
  resetKey,
}: {
  headers: string[];
  rows: Array<Record<string, string | number>>;
  scrollClassName?: string;
  /** Change when data source changes to reset sort state. */
  resetKey?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
  }, [resetKey]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const sorted = [...rows].sort((a, b) => compareRowValues(a, b, sortKey));
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [rows, sortKey, sortDir]);

  return (
    <TableScroll className={scrollClassName}>
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-border bg-secondary/80 backdrop-blur">
          <tr>
            {headers.map((header) => (
              <SortableHeader
                key={header}
                label={header}
                sortKey={header}
                activeKey={sortKey}
                direction={sortDir}
                onSort={handleSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
            >
              {headers.map((header) => (
                <td key={header} className="px-4 py-3 tabular-nums">
                  {String(row[header] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
