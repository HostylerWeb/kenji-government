"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  MapPin,
  Receipt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import { Tabs } from "@/components/tabs";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import { KenyaCountyChoropleth } from "@/components/kenya-county-choropleth";
import {
  PerformanceDateFilter,
  PerformanceDateLabel,
} from "@/components/performance-date-filter";
import { useAuth } from "@/lib/use-auth";
import {
  getRegionalCounty,
  getRegionalOverview,
  type RegionalCountyDetail,
  type RegionalCountyOperatorPerformance,
  type RegionalOverview,
} from "@/lib/api";
import {
  type DatePreset,
  resolveDateRange,
} from "@/lib/date-range";
import { formatKsh, formatNumber } from "@/lib/utils";
import { DAY_LABELS } from "@kenji-government/shared";

type TabId = "commercial" | "player_safety" | "behaviour" | "spend";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "commercial", label: "Commercial" },
  { id: "player_safety", label: "Player Safety" },
  { id: "behaviour", label: "Behaviour" },
  { id: "spend", label: "Spend Patterns" },
];

const GRA_GREEN = "hsl(152, 100%, 21%)";
const GRA_NAVY = "hsl(214, 54%, 23%)";
const GRA_RED = "hsl(3, 81%, 40%)";
const PURPLE = "#6B4C9A";

export default function RegionalCountyPage() {
  const params = useParams();
  const county = decodeURIComponent(params.county as string);
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabId>("commercial");
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [detail, setDetail] = useState<RegionalCountyDetail | null>(null);
  const [overview, setOverview] = useState<RegionalOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getRegionalCounty(token, county, {
        from: dateRange.from,
        to: dateRange.to,
      }),
      getRegionalOverview(token, {
        from: dateRange.from,
        to: dateRange.to,
      }),
    ])
      .then(([countyDetail, regionalOverview]) => {
        setDetail(countyDetail);
        setOverview(regionalOverview);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, county, dateRange.from, dateRange.to]);

  const operatorColumns = useMemo((): SortableColumn<RegionalCountyOperatorPerformance>[] => [
    {
      id: "operator",
      label: "Operator",
      sortValue: (row) => row.trading_name.toLowerCase(),
      render: (row) => (
        <Link
          href={`/operators/${row.external_id}`}
          className="inline-flex items-center gap-1.5 font-medium hover:text-primary"
        >
          {row.trading_name}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "compliance",
      label: "Compliance",
      sortValue: (row) => row.compliance_status,
      render: (row) => (
        <Badge variant={complianceBadgeVariant(row.compliance_status)} dot size="sm">
          {complianceLabel(row.compliance_status)}
        </Badge>
      ),
    },
    {
      id: "period_ggr",
      label: "Period GGR",
      sortValue: (row) => row.period_ggr,
      cellClassName: "tabular-nums font-medium",
      render: (row) => formatKsh(row.period_ggr),
    },
    {
      id: "period_tax_paid",
      label: "Tax paid",
      sortValue: (row) => row.period_tax_paid,
      cellClassName: "tabular-nums",
      render: (row) => formatKsh(row.period_tax_paid),
    },
    {
      id: "tax_outstanding",
      label: "Tax outstanding",
      sortValue: (row) => row.tax_outstanding,
      cellClassName: "tabular-nums",
      render: (row) => formatKsh(row.tax_outstanding),
    },
    {
      id: "annual_ggr",
      label: "Annual GGR",
      sortValue: (row) => row.annual_ggr,
      cellClassName: "tabular-nums text-muted-foreground",
      render: (row) => formatKsh(row.annual_ggr),
    },
  ], []);

  if (!user) return null;

  const stakeBandData = Object.entries(detail?.stake_band_distribution ?? {}).map(
    ([band, count]) => ({ band, count }),
  );
  const ageBandData = Object.entries(detail?.age_band_distribution ?? {}).map(
    ([band, count]) => ({ band, count }),
  );

  const playSafeTrend =
    detail?.daily_trend.map((row) => ({
      county: row.date,
      count: row.play_safe_activations,
    })) ?? [];

  const selfExclusionTrend =
    detail?.daily_trend.map((row) => ({
      county: row.date,
      count: row.self_exclusion_requests,
    })) ?? [];

  const sessionTrend =
    detail?.daily_trend.map((row) => ({
      county: row.date,
      count: row.session_count,
    })) ?? [];

  const countyPerformance = overview?.county_performance ?? [];
  const operators = detail?.operator_performance ?? [];

  return (
    <AppShell
      user={user}
      title={county}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Regional", href: "/regional" },
        { label: county },
      ]}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/regional"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to regional overview
          </Link>
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
        </div>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{county} County</h1>
            <PerformanceDateLabel range={dateRange} />
          </div>
          {loading && (
            <span className="text-xs text-muted-foreground">Updating county metrics…</span>
          )}
        </div>

        <div
          className={loading ? "space-y-5 opacity-60 transition-opacity" : "space-y-5"}
          aria-busy={loading}
        >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Operators"
            value={formatNumber(detail?.operator_count)}
            icon={<MapPin className="h-5 w-5" />}
            subLabel="Active in this county"
          />
          <StatCard
            title="Period GGR"
            value={formatKsh(detail?.period_totals?.ggr)}
            icon={<Banknote className="h-5 w-5" />}
            variant="success"
            subLabel={`Reporting GGR for ${detail?.date_range.label ?? "selected period"}`}
          />
          <StatCard
            title="Play Safe Activations"
            value={formatNumber(detail?.play_safe_activations)}
            icon={<ShieldCheck className="h-5 w-5" />}
            variant="warning"
            trend={
              detail?.play_safe_change_pct !== null && detail?.play_safe_change_pct !== undefined
                ? {
                    value: detail.play_safe_change_pct,
                    label: detail.play_safe_change_label,
                  }
                : undefined
            }
          />
          <StatCard
            title="Player Sessions"
            value={formatNumber(detail?.session_count)}
            icon={<Users className="h-5 w-5" />}
            variant="primary"
            trend={
              detail?.sessions_change_pct !== null && detail?.sessions_change_pct !== undefined
                ? {
                    value: detail.sessions_change_pct,
                    label: detail.sessions_change_label,
                  }
                : undefined
            }
          />
        </div>

        {countyPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{county} on the national map</CardTitle>
              <CardDescription>
                Selected county highlighted against national GGR distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KenyaCountyChoropleth
                data={countyPerformance}
                metric="annual_ggr"
                selectedCounty={county}
                height={360}
                legendOverlay
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex flex-col gap-4 pb-0 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              tabs={TABS}
              active={tab}
              onChange={(id) => setTab(id as TabId)}
              variant="underline"
            />
          </CardContent>
        </Card>

        {tab === "commercial" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Period GGR"
                value={formatKsh(detail?.period_totals?.ggr)}
                icon={<Banknote className="h-5 w-5" />}
                variant="success"
              />
              <StatCard
                title="Tax Paid (period)"
                value={formatKsh(detail?.period_totals?.tax_paid)}
                icon={<Receipt className="h-5 w-5" />}
                variant="primary"
              />
              <StatCard
                title="Tax Outstanding"
                value={formatKsh(detail?.period_totals?.tax_outstanding)}
                icon={<Receipt className="h-5 w-5" />}
                variant="warning"
                subLabel="Current balance across operators"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Operators in {county}</CardTitle>
                <CardDescription>
                  Revenue and tax contributions for the selected date range
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SortableTable
                  columns={operatorColumns}
                  rows={operators}
                  getRowKey={(row) => row.external_id}
                  resetKey={`${dateRange.from}:${dateRange.to}:${operators.length}`}
                  emptyMessage="No operator commercial data for this period."
                />
              </CardContent>
            </Card>
          </div>
        )}

        {tab === "player_safety" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Player Sessions"
                value={formatNumber(detail?.session_count)}
                icon={<Users className="h-5 w-5" />}
                trend={
                  detail?.sessions_change_pct !== null && detail?.sessions_change_pct !== undefined
                    ? {
                        value: detail.sessions_change_pct,
                        label: detail.sessions_change_label,
                      }
                    : undefined
                }
              />
              <StatCard
                title="Play Safe Activations"
                value={formatNumber(detail?.play_safe_activations)}
                icon={<ShieldCheck className="h-5 w-5" />}
                variant="success"
                trend={
                  detail?.play_safe_change_pct !== null &&
                  detail?.play_safe_change_pct !== undefined
                    ? {
                        value: detail.play_safe_change_pct,
                        label: detail.play_safe_change_label,
                      }
                    : undefined
                }
              />
              <StatCard
                title="Self-Exclusion Requests"
                value={formatNumber(detail?.self_exclusion_requests)}
                icon={<ShieldCheck className="h-5 w-5" />}
                variant="warning"
                trend={
                  detail?.self_exclusion_change_pct !== null &&
                  detail?.self_exclusion_change_pct !== undefined
                    ? {
                        value: detail.self_exclusion_change_pct,
                        label: detail.self_exclusion_change_label,
                      }
                    : undefined
                }
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Play Safe Trend</CardTitle>
                  <CardDescription>Daily activations in {county}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart
                    data={playSafeTrend}
                    dataKey="count"
                    label="Activations"
                    color={GRA_GREEN}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Self-Exclusion Trend</CardTitle>
                  <CardDescription>Daily requests in {county}</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart
                    data={selfExclusionTrend}
                    dataKey="count"
                    label="Requests"
                    color={GRA_RED}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Session Volume</CardTitle>
                <CardDescription>Daily player sessions in {county}</CardDescription>
              </CardHeader>
              <CardContent>
                <CountyBarChart
                  data={sessionTrend}
                  dataKey="count"
                  label="Sessions"
                  color={GRA_NAVY}
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
                When players in {county} are most active (hour × day of week)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeakTimeHeatmap
                matrix={detail?.peak_time_heatmap ?? {}}
                dayLabels={[...DAY_LABELS]}
              />
            </CardContent>
          </Card>
        )}

        {tab === "spend" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stake Band Distribution</CardTitle>
                <CardDescription>Anonymised spend bands in {county}</CardDescription>
              </CardHeader>
              <CardContent>
                <StakeBandChart data={stakeBandData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Age Band Distribution</CardTitle>
                <CardDescription>Anonymised session age buckets in {county}</CardDescription>
              </CardHeader>
              <CardContent>
                <StakeBandChart data={ageBandData} color={PURPLE} />
              </CardContent>
            </Card>
          </div>
        )}

        {detail?.disclaimer && (
          <p className="text-xs text-muted-foreground">{detail.disclaimer}</p>
        )}
        </div>
      </div>
    </AppShell>
  );
}
