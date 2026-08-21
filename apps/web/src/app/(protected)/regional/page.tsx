"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  MapPin,
  Users,
  Banknote,
  TrendingUp,
  ShieldCheck,
  MousePointerClick,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import {
  KenyaCountyChoropleth,
  type ChoroplethMetric,
} from "@/components/kenya-county-choropleth";
import { RegionalTopCounties } from "@/components/regional-top-counties";
import {
  PerformanceDateFilter,
  PerformanceDateLabel,
} from "@/components/performance-date-filter";
import { useAuth } from "@/lib/use-auth";
import {
  exportRegionalDataset,
  getRegionalOverview,
  type RegionalCountyPerformance,
  type RegionalOverview,
} from "@/lib/api";
import {
  type DatePreset,
  resolveDateRange,
} from "@/lib/date-range";
import { formatKsh, formatNumber } from "@/lib/utils";

type TabId = "commercial" | "player_safety" | "behaviour" | "spend";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "commercial", label: "Commercial" },
  { id: "player_safety", label: "Player Safety" },
  { id: "behaviour", label: "Behaviour" },
  { id: "spend", label: "Spend Patterns" },
];

const MAP_METRICS: Array<{ id: ChoroplethMetric; label: string }> = [
  { id: "annual_ggr", label: "GGR" },
  { id: "sessions", label: "Player sessions" },
  { id: "play_safe", label: "Play Safe" },
];

const GRA_GREEN = "hsl(152, 100%, 21%)";
const GRA_NAVY = "hsl(214, 54%, 23%)";
const GRA_RED = "hsl(3, 81%, 40%)";
const PURPLE = "#6B4C9A";

function formatChangePct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <Badge variant="muted" size="sm">—</Badge>;
  }
  return (
    <Badge
      variant={value > 0 ? "success" : value < 0 ? "danger" : "muted"}
      size="sm"
    >
      {formatChangePct(value)}
    </Badge>
  );
}

export default function RegionalPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabId>("commercial");
  const [mapMetric, setMapMetric] = useState<ChoroplethMetric>("annual_ggr");
  const [highlightCounty, setHighlightCounty] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [overview, setOverview] = useState<RegionalOverview | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getRegionalOverview(token, {
      from: dateRange.from,
      to: dateRange.to,
    })
      .then((data) => {
        setOverview(data);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, dateRange.from, dateRange.to]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      await exportRegionalDataset(token, {
        from: dateRange.from,
        to: dateRange.to,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const summary = overview?.national_summary;
  const countyPerformance = overview?.county_performance ?? [];

  const ggrChartData = useMemo(
    () =>
      overview?.counties.map((row) => ({
        county: row.county,
        annual_ggr: row.annual_ggr,
      })) ?? [],
    [overview?.counties],
  );

  const playerActivityColumns = useMemo((): SortableColumn<RegionalCountyPerformance>[] => [
    {
      id: "county",
      label: "County",
      sortValue: (row) => row.county.toLowerCase(),
      render: (row) => (
        <Link
          href={`/regional/${encodeURIComponent(row.county)}`}
          className="font-medium hover:text-primary"
        >
          {row.county}
        </Link>
      ),
    },
    {
      id: "sessions",
      label: "Sessions",
      sortValue: (row) => row.sessions,
      cellClassName: "tabular-nums",
      render: (row) => formatNumber(row.sessions),
    },
    {
      id: "sessions_change",
      label: "Change",
      sortValue: (row) => row.sessions_change_pct ?? -Infinity,
      render: (row) => <GrowthBadge value={row.sessions_change_pct} />,
    },
    {
      id: "play_safe",
      label: "Play Safe",
      sortValue: (row) => row.play_safe,
      cellClassName: "tabular-nums",
      render: (row) => formatNumber(row.play_safe),
    },
    {
      id: "play_safe_change",
      label: "Play Safe Δ",
      sortValue: (row) => row.play_safe_change_pct ?? -Infinity,
      render: (row) => <GrowthBadge value={row.play_safe_change_pct} />,
    },
  ], []);

  if (!user) return null;

  return (
    <AppShell user={user} title="Regional & Player Safety">
      <div className="space-y-5">
        <PageHeader
          title="Regional Analysis"
          subtitle="Geographical distribution of player activity and commercial performance across Kenya"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Regional" }]}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <PerformanceDateFilter
                preset={datePreset}
                customFrom={customFrom}
                customTo={customTo}
                onPresetChange={setDatePreset}
                onCustomApply={(from, to) => {
                  setCustomFrom(from);
                  setCustomTo(to);
                  setDatePreset("custom");
                }}
              />
              <Button
                variant="outline"
                size="sm"
                loading={exporting}
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <PerformanceDateLabel range={dateRange} />
          {loading && (
            <span className="text-xs text-muted-foreground">Updating regional data…</span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div
          className={loading ? "space-y-5 opacity-60 transition-opacity" : "space-y-5"}
          aria-busy={loading}
        >
        {summary && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Player Sessions"
              value={formatNumber(summary.total_sessions)}
              icon={<Users className="h-5 w-5" />}
              variant="primary"
              trend={
                summary.sessions_change_pct !== null
                  ? { value: summary.sessions_change_pct, label: summary.sessions_change_label }
                  : undefined
              }
              subLabel={
                summary.sessions_ytd_change_pct !== null
                  ? `${formatChangePct(summary.sessions_ytd_change_pct)} ${summary.sessions_ytd_change_label}`
                  : `For ${dateRange.label}`
              }
            />
            <StatCard
              title="Total Annual GGR"
              value={formatKsh(summary.total_annual_ggr)}
              icon={<Banknote className="h-5 w-5" />}
              variant="success"
              trend={
                summary.ggr_ytd_change_pct !== null
                  ? {
                      value: summary.ggr_ytd_change_pct,
                      label: summary.ggr_ytd_change_label,
                    }
                  : undefined
              }
              subLabel="Annual operator totals (not filtered by date range)"
            />
            <StatCard
              title="Active Counties"
              value={`${summary.active_counties} / ${summary.total_counties}`}
              icon={<MapPin className="h-5 w-5" />}
              variant="warning"
              subLabel="Counties with operator activity"
            />
            <StatCard
              title="Highest Growth"
              value={summary.highest_growth_county?.county ?? "—"}
              icon={<TrendingUp className="h-5 w-5" />}
              variant="danger"
              subLabel={
                summary.highest_growth_county?.change_pct !== null &&
                summary.highest_growth_county?.change_pct !== undefined
                  ? `${formatChangePct(summary.highest_growth_county.change_pct)} ${summary.highest_growth_county.metric}`
                  : "No prior-period comparison"
              }
            />
          </div>
        )}

        <div className="space-y-5">
          <Card>
            <CardHeader className="space-y-4 border-b border-border/60 pb-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-2xl space-y-2">
                  <CardTitle>National county map</CardTitle>
                  <CardDescription>
                    Explore performance across all 47 counties. Switch the metric, hover for quick stats,
                    or click through to a full county profile.
                  </CardDescription>
                  <p className="inline-flex items-center gap-2 rounded-md bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
                    <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-primary" />
                    Hover counties on the map or in the list below to cross-highlight
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Map metric
                  </p>
                  <Tabs
                    tabs={MAP_METRICS.map((item) => ({ id: item.id, label: item.label }))}
                    active={mapMetric}
                    onChange={(id) => setMapMetric(id as ChoroplethMetric)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-5 pt-4 sm:px-6">
              <KenyaCountyChoropleth
                data={countyPerformance}
                metric={mapMetric}
                highlightCounty={highlightCounty}
                onCountyHover={setHighlightCounty}
                height={500}
                legendOverlay
              />
            </CardContent>
          </Card>

          {countyPerformance.length > 0 && (
            <RegionalTopCounties
              rows={countyPerformance}
              metric={mapMetric}
              highlightCounty={highlightCounty}
              onCountyHover={setHighlightCounty}
            />
          )}
        </div>

        <Card>
          <CardContent className="pb-0">
            <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} variant="underline" />
          </CardContent>
        </Card>

        {tab === "commercial" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>GGR by County</CardTitle>
                <CardDescription>Annual GGR by county ({dateRange.label} activity in table below)</CardDescription>
              </CardHeader>
              <CardContent>
                <CountyBarChart
                  data={ggrChartData}
                  dataKey="annual_ggr"
                  label="Annual GGR (KES)"
                  color={GRA_NAVY}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>County Snapshot</CardTitle>
                <CardDescription>Operators and GGR by county</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border/50">
                  {countyPerformance.slice(0, 10).map((row) => (
                    <li key={row.county}>
                      <Link
                        href={`/regional/${encodeURIComponent(row.county)}`}
                        className="flex flex-col gap-2 px-5 py-3 text-sm hover:bg-secondary/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="min-w-0 truncate font-medium">{row.county}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                          {formatNumber(row.operator_count)} ops · {formatKsh(row.annual_ggr)}
                          <span className="hidden sm:inline">
                            · {formatNumber(row.sessions)} sessions
                          </span>
                          <GrowthBadge value={row.sessions_change_pct} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "player_safety" && (
          <div className="space-y-5">
            {summary && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  title={`Sessions (${dateRange.label})`}
                  value={formatNumber(summary.total_sessions)}
                  icon={<Users className="h-5 w-5" />}
                  trend={
                    summary.sessions_change_pct !== null
                      ? { value: summary.sessions_change_pct, label: summary.sessions_change_label }
                      : undefined
                  }
                />
                <StatCard
                  title="Sessions YTD"
                  value={formatNumber(summary.total_sessions_ytd)}
                  icon={<ShieldCheck className="h-5 w-5" />}
                  variant="success"
                  trend={
                    summary.sessions_ytd_change_pct !== null
                      ? { value: summary.sessions_ytd_change_pct, label: summary.sessions_ytd_change_label }
                      : undefined
                  }
                />
                <StatCard
                  title={`Play Safe (${dateRange.label})`}
                  value={formatNumber(
                    countyPerformance.reduce((sum, row) => sum + row.play_safe, 0),
                  )}
                  icon={<ShieldCheck className="h-5 w-5" />}
                  variant="primary"
                  subLabel="National activations"
                />
              </div>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Play Safe Activations</CardTitle>
                  <CardDescription>By county ({dateRange.label})</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart
                    data={overview?.play_safe_by_county ?? []}
                    dataKey="count"
                    label="Activations"
                    color={GRA_GREEN}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Self-Exclusion Requests</CardTitle>
                  <CardDescription>By county ({dateRange.label})</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart
                    data={overview?.self_exclusion_by_county ?? []}
                    dataKey="count"
                    label="Requests"
                    color={GRA_RED}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>County Player Activity</CardTitle>
                <CardDescription>
                  Session volume and % change vs prior period ({dateRange.label})
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SortableTable
                  columns={playerActivityColumns}
                  rows={countyPerformance}
                  getRowKey={(row) => row.county}
                  resetKey={`${dateRange.from}:${dateRange.to}:${countyPerformance.length}`}
                  emptyMessage="No county activity for this period."
                />
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "behaviour" && (
          <Card>
            <CardHeader>
              <CardTitle>Peak Play Time</CardTitle>
              <CardDescription>
                Session intensity heatmap for {dateRange.label} (hour × day of week)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeakTimeHeatmap
                matrix={overview?.peak_time_heatmap.matrix ?? {}}
                dayLabels={overview?.peak_time_heatmap.day_labels ?? []}
              />
            </CardContent>
          </Card>
        )}

        {tab === "spend" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stake Band Distribution</CardTitle>
                <CardDescription>Anonymised spend bands for {dateRange.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <StakeBandChart data={overview?.stake_band_distribution ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Age Band Distribution</CardTitle>
                <CardDescription>Anonymised session age buckets for {dateRange.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <StakeBandChart data={overview?.age_band_distribution ?? []} color={PURPLE} />
              </CardContent>
            </Card>
          </div>
        )}

        {overview?.disclaimer && (
          <p className="text-xs text-muted-foreground">{overview.disclaimer}</p>
        )}
        </div>
      </div>
    </AppShell>
  );
}
