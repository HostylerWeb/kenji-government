"use client";

import { useEffect, useMemo, useState } from "react";
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

  const stripped = raw.replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(stripped)) {
    return Number(stripped);
  }

  return raw.toLowerCase();
}

function compareRowValues(
  a: Record<string, string | number>,
  b: Record<string, string | number>,
  key: string,
): number {
  const left = parseSortableValue(a[key]);
  const right = parseSortableValue(b[key]);

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), "en-KE", { numeric: true });
}

function SortableHeader({
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
