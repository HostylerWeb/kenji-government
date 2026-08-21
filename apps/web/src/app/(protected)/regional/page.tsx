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
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { TableScroll } from "@/components/table-scroll";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import {
  KenyaCountyChoropleth,
  type ChoroplethMetric,
} from "@/components/kenya-county-choropleth";
import { useAuth } from "@/lib/use-auth";
import {
  exportRegionalDataset,
  getRegionalOverview,
  type RegionalOverview,
} from "@/lib/api";
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
  const [overview, setOverview] = useState<RegionalOverview | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token) return;
    getRegionalOverview(token, 30)
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token]);

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    try {
      await exportRegionalDataset(token, 30);
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

  if (!user) return null;

  return (
    <AppShell user={user} title="Regional & Player Safety">
      <div className="space-y-5">
        <PageHeader
          title="Regional Analysis"
          subtitle="Geographical distribution of player activity and commercial performance across Kenya"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Regional" }]}
          action={
            <Button
              variant="outline"
              size="sm"
              loading={exporting}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExport}
            >
              Export CSV
            </Button>
          }
        />

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

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
                  : undefined
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
              subLabel={
                summary.ggr_recent_change_pct !== null
                  ? `${formatChangePct(summary.ggr_recent_change_pct)} ${summary.ggr_recent_change_label}`
                  : summary.ggr_ytd > 0
                    ? `YTD GGR: ${formatKsh(summary.ggr_ytd)}`
                    : "Across active operators"
              }
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

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>National Heatmap</CardTitle>
                  <CardDescription>
                    County regions shaded by intensity. Click a county to see detail and where it sits on the scale.
                  </CardDescription>
                </div>
                <Tabs
                  tabs={MAP_METRICS.map((item) => ({ id: item.id, label: item.label }))}
                  active={mapMetric}
                  onChange={(id) => setMapMetric(id as ChoroplethMetric)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <KenyaCountyChoropleth
                data={countyPerformance}
                metric={mapMetric}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Counties</CardTitle>
              <CardDescription>Ranked by annual GGR with session growth</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <TableScroll className="max-h-[460px] overflow-y-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-border bg-secondary/80 backdrop-blur">
                    <tr>
                      {["County", "Sessions", "Change", "GGR", "GGR YTD Δ"].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {countyPerformance.slice(0, 12).map((row) => (
                      <tr
                        key={row.county}
                        className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/regional/${encodeURIComponent(row.county)}`}
                            className="font-medium hover:text-primary"
                          >
                            {row.county}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-muted-foreground">
                          {formatNumber(row.sessions)}
                        </td>
                        <td className="px-4 py-3">
                          <GrowthBadge value={row.sessions_change_pct} />
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {formatKsh(row.annual_ggr)}
                        </td>
                        <td className="px-4 py-3">
                          <GrowthBadge value={row.ggr_ytd_change_pct} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </CardContent>
          </Card>
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
                <CardDescription>Annual GGR (KES)</CardDescription>
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
                  title="Sessions (30 days)"
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
                  title="Play Safe (30 days)"
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
                  <CardDescription>By county (30 days)</CardDescription>
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
                  <CardDescription>By county (30 days)</CardDescription>
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
                <CardDescription>Session volume and % change vs prior 30 days</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <TableScroll>
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/50">
                      <tr>
                        {["County", "Sessions", "Change", "Play Safe", "Play Safe Δ"].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...countyPerformance]
                        .sort((a, b) => b.sessions - a.sessions)
                        .slice(0, 15)
                        .map((row) => (
                          <tr
                            key={row.county}
                            className="border-b border-border/50 last:border-0 hover:bg-secondary/30"
                          >
                            <td className="px-4 py-3 font-medium">
                              <Link
                                href={`/regional/${encodeURIComponent(row.county)}`}
                                className="hover:text-primary"
                              >
                                {row.county}
                              </Link>
                            </td>
                            <td className="px-4 py-3 tabular-nums">{formatNumber(row.sessions)}</td>
                            <td className="px-4 py-3">
                              <GrowthBadge value={row.sessions_change_pct} />
                            </td>
                            <td className="px-4 py-3 tabular-nums">{formatNumber(row.play_safe)}</td>
                            <td className="px-4 py-3">
                              <GrowthBadge value={row.play_safe_change_pct} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </TableScroll>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "behaviour" && (
          <Card>
            <CardHeader>
              <CardTitle>Peak Play Time</CardTitle>
              <CardDescription>Session intensity heatmap (hour × day of week)</CardDescription>
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
                <CardDescription>Anonymised spend bands (KES)</CardDescription>
              </CardHeader>
              <CardContent>
                <StakeBandChart data={overview?.stake_band_distribution ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Age Band Distribution</CardTitle>
                <CardDescription>Anonymised session age buckets</CardDescription>
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
    </AppShell>
  );
}
