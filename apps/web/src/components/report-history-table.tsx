"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { TableScroll } from "@/components/table-scroll";
import { cn } from "@/lib/utils";
import type { ReportRun } from "@/lib/api";

type SortKey = "title" | "format" | "status" | "requested_by" | "created_at";
type SortDir = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey | null;
  direction: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  const Icon = !isActive ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th className={cn("py-3 pr-4", className)}>
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

function statusVariant(status: string): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "completed":
      return "success";
    case "running":
    case "queued":
      return "warning";
    case "failed":
      return "danger";
    default:
      return "muted";
  }
}

export function ReportHistoryTable({
  runs,
  onDownload,
}: {
  runs: ReportRun[];
  onDownload: (runId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "created_at" ? "desc" : "asc");
  }

  const sortedRuns = useMemo(() => {
    if (!sortKey) return runs;
    const sorted = [...runs].sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title, "en-KE");
        case "format":
          return a.format.localeCompare(b.format);
        case "status":
          return a.status.localeCompare(b.status);
        case "requested_by":
          return (a.requested_by?.full_name ?? "System").localeCompare(
            b.requested_by?.full_name ?? "System",
            "en-KE",
          );
        case "created_at":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return 0;
      }
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [runs, sortKey, sortDir]);

  return (
    <TableScroll>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <SortableHeader
              label="Report"
              sortKey="title"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Format"
              sortKey="format"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Status"
              sortKey="status"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="Requested by"
              sortKey="requested_by"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label="When"
              sortKey="created_at"
              activeKey={sortKey}
              direction={sortDir}
              onSort={handleSort}
            />
            <th className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRuns.map((run) => (
            <tr key={run.id} className="border-b border-border/60 hover:bg-secondary/30">
              <td className="py-3 pr-4">
                <Link href={`/reports/${run.slug}`} className="font-medium hover:text-primary">
                  {run.title}
                </Link>
                {run.is_scheduled && (
                  <span className="ml-2 text-xs text-muted-foreground">scheduled</span>
                )}
              </td>
              <td className="py-3 pr-4 uppercase text-muted-foreground">{run.format}</td>
              <td className="py-3 pr-4">
                <Badge variant={statusVariant(run.status)} size="sm" dot>
                  {run.status}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                {run.requested_by?.full_name ?? "System"}
              </td>
              <td className="py-3 pr-4 text-muted-foreground tabular-nums">
                {new Date(run.created_at).toLocaleString("en-KE")}
              </td>
              <td className="py-3">
                {run.status === "completed" && (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onDownload(run.id)}>
                    Download
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}
