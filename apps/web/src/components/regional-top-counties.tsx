"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  formatMetricValue,
  METRIC_LABELS,
  metricValue,
  type ChoroplethMetric,
  type CountyChoroplethRow,
} from "@/lib/regional-map";
import { formatKsh, formatNumber, cn } from "@/lib/utils";

function formatChangePct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <Badge variant="muted" size="sm">
        —
      </Badge>
    );
  }
  return (
    <Badge variant={value > 0 ? "success" : value < 0 ? "danger" : "muted"} size="sm">
      {formatChangePct(value)}
    </Badge>
  );
}

function formatCompactMetric(metric: ChoroplethMetric, value: number): string {
  if (metric !== "annual_ggr") return formatMetricValue(metric, value);

  if (value >= 1_000_000_000) {
    return `Ksh ${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `Ksh ${(value / 1_000_000).toFixed(1)}M`;
  }
  return formatMetricValue(metric, value);
}

function rankRows(rows: CountyChoroplethRow[], metric: ChoroplethMetric) {
  return [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
}

const rankStyles = [
  "bg-primary text-primary-foreground",
  "bg-gra-navy text-white",
  "bg-secondary text-foreground",
] as const;

export function RegionalTopCounties({
  rows,
  metric,
  highlightCounty,
  onCountyHover,
}: {
  rows: CountyChoroplethRow[];
  metric: ChoroplethMetric;
  highlightCounty?: string | null;
  onCountyHover?: (county: string | null) => void;
}) {
  const ranked = rankRows(rows, metric);
  const topRows = ranked.slice(0, 6);

  const tableColumns = useMemo((): SortableColumn<CountyChoroplethRow>[] => {
    const metricLabel =
      metric === "annual_ggr"
        ? "Annual GGR"
        : metric === "sessions"
          ? "Sessions"
          : "Play Safe";

    return [
      {
        id: "county",
        label: "County",
        sortValue: (row) => row.county.toLowerCase(),
        render: (row) => (
          <Link
            href={`/regional/${encodeURIComponent(row.county)}`}
            className="group inline-flex items-center gap-1.5 font-medium hover:text-primary"
          >
            {row.county}
            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ),
      },
      {
        id: "map_metric",
        label: `Map metric (${metricLabel})`,
        sortValue: (row) => metricValue(row, metric),
        cellClassName: "tabular-nums font-medium",
        render: (row) => formatMetricValue(metric, metricValue(row, metric)),
      },
      {
        id: "sessions",
        label: "Sessions",
        sortValue: (row) => row.sessions,
        cellClassName: "tabular-nums text-muted-foreground",
        render: (row) => formatNumber(row.sessions),
      },
      {
        id: "sessions_change",
        label: "Change",
        sortValue: (row) => row.sessions_change_pct ?? -Infinity,
        render: (row) => {
          const change = row.sessions_change_pct;
          return (
            <span className="inline-flex items-center gap-1">
              {change !== null && change !== undefined && change !== 0 ? (
                change > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-danger" />
                )
              ) : null}
              <GrowthBadge value={change} />
            </span>
          );
        },
      },
      {
        id: "annual_ggr",
        label: "Annual GGR",
        sortValue: (row) => row.annual_ggr,
        cellClassName: "tabular-nums",
        render: (row) => formatKsh(row.annual_ggr),
      },
      {
        id: "ggr_ytd_change",
        label: "GGR YTD Δ",
        sortValue: (row) => row.ggr_ytd_change_pct ?? -Infinity,
        render: (row) => <GrowthBadge value={row.ggr_ytd_change_pct} />,
      },
    ];
  }, [metric]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Leading counties</CardTitle>
              <CardDescription>
                Top performers by {METRIC_LABELS[metric].toLowerCase()}. Hover to highlight on the map.
              </CardDescription>
            </div>
            <p className="text-xs text-muted-foreground">
              Top {topRows.length} of {rows.length} active counties
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/50">
            {topRows.map((row, index) => {
              const isHighlighted = highlightCounty === row.county;
              const change = row.sessions_change_pct;
              const value = metricValue(row, metric);
              const rankClass = rankStyles[index] ?? "bg-muted text-muted-foreground";

              return (
                <li key={row.county}>
                  <Link
                    href={`/regional/${encodeURIComponent(row.county)}`}
                    onMouseEnter={() => onCountyHover?.(row.county)}
                    onMouseLeave={() => onCountyHover?.(null)}
                    onFocus={() => onCountyHover?.(row.county)}
                    onBlur={() => onCountyHover?.(null)}
                    className={cn(
                      "group flex items-center gap-4 px-4 py-4 transition-colors sm:px-6",
                      isHighlighted
                        ? "bg-primary-subtle/50"
                        : "hover:bg-secondary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                        rankClass,
                      )}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                        {row.county}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatNumber(row.sessions)} sessions
                        {row.operator_count !== undefined
                          ? ` · ${formatNumber(row.operator_count)} operators`
                          : ""}
                      </p>
                    </div>

                    <div className="hidden shrink-0 sm:block">
                      <GrowthBadge value={change} />
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className="text-sm font-semibold tabular-nums text-foreground sm:text-base"
                        title={formatMetricValue(metric, value)}
                      >
                        {formatCompactMetric(metric, value)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                        <GrowthBadge value={change} />
                      </p>
                    </div>

                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">County performance table</CardTitle>
          <CardDescription>
            Sessions, GGR, and growth at a glance — click column headers to sort
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SortableTable
            columns={tableColumns}
            rows={ranked}
            getRowKey={(row) => row.county}
            resetKey={`${metric}:${rows.length}`}
            onRowMouseEnter={(row) => onCountyHover?.(row.county)}
            onRowMouseLeave={() => onCountyHover?.(null)}
            getRowClassName={(row) =>
              highlightCounty === row.county ? "bg-primary-subtle/50" : ""
            }
            scrollClassName="max-h-[28rem] overflow-y-auto"
          />
        </CardContent>
      </Card>
    </div>
  );
}
