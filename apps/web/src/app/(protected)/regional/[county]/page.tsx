"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, ShieldCheck, Users, Banknote } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import { KenyaCountyChoropleth } from "@/components/kenya-county-choropleth";
import { useAuth } from "@/lib/use-auth";
import {
  getRegionalCounty,
  getRegionalOverview,
  type RegionalCountyDetail,
  type RegionalOverview,
} from "@/lib/api";
import { formatKsh, formatNumber } from "@/lib/utils";
import { DAY_LABELS } from "@kenji-government/shared";

function formatChangePct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

export default function RegionalCountyPage() {
  const params = useParams();
  const county = decodeURIComponent(params.county as string);
  const { user, token } = useAuth();
  const [detail, setDetail] = useState<RegionalCountyDetail | null>(null);
  const [overview, setOverview] = useState<RegionalOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getRegionalCounty(token, county, 30),
      getRegionalOverview(token, 30),
    ])
      .then(([countyDetail, regionalOverview]) => {
        setDetail(countyDetail);
        setOverview(regionalOverview);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, county]);

  if (!user) return null;

  const stakeBandData = Object.entries(detail?.stake_band_distribution ?? {}).map(
    ([band, count]) => ({ band, count }),
  );

  const trendData =
    detail?.daily_trend.map((row) => ({
      county: row.date,
      count: row.play_safe_activations,
    })) ?? [];

  const countyPerformance = overview?.county_performance ?? [];

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
        <Link
          href="/regional"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to regional overview
        </Link>

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Operators"
            value={formatNumber(detail?.operator_count)}
            icon={<MapPin className="h-5 w-5" />}
          />
          <StatCard
            title="Annual GGR"
            value={formatKsh(detail?.annual_ggr_total)}
            icon={<Banknote className="h-5 w-5" />}
            variant="success"
            trend={
              detail?.ggr_ytd_change_pct !== null && detail?.ggr_ytd_change_pct !== undefined
                ? {
                    value: detail.ggr_ytd_change_pct,
                    label: detail.ggr_ytd_change_label,
                  }
                : undefined
            }
            subLabel={
              detail?.ggr_ytd !== undefined
                ? `YTD snapshot GGR: ${formatKsh(detail.ggr_ytd)}`
                : undefined
            }
          />
          <StatCard
            title="Play Safe Activations"
            value={formatNumber(detail?.play_safe_activations)}
            icon={<ShieldCheck className="h-5 w-5" />}
            variant="warning"
            trend={
              detail?.play_safe_change_pct !== null && detail?.play_safe_change_pct !== undefined
                ? { value: detail.play_safe_change_pct, label: "vs prior 30 days" }
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
                ? { value: detail.sessions_change_pct, label: "vs prior 30 days" }
                : undefined
            }
            subLabel={
              detail?.sessions_ytd_change_pct !== null &&
              detail?.sessions_ytd_change_pct !== undefined
                ? `${formatChangePct(detail.sessions_ytd_change_pct)} YTD vs last year`
                : undefined
            }
          />
        </div>

        {countyPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{county} on the national map</CardTitle>
              <CardDescription>
                Selected county highlighted — shaded by annual GGR relative to other counties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KenyaCountyChoropleth
                data={countyPerformance}
                metric="annual_ggr"
                selectedCounty={county}
              />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Operators in {county}</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/50">
                {(detail?.operators ?? []).map((op) => (
                  <li key={op.external_id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link
                      href={`/operators/${op.external_id}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {op.trading_name}
                    </Link>
                    <Badge variant={complianceBadgeVariant(op.compliance_status)} dot size="sm">
                      {complianceLabel(op.compliance_status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Play Safe Trend</CardTitle>
              <CardDescription>Daily activations (30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <CountyBarChart data={trendData} dataKey="count" label="Activations" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Peak Play Time</CardTitle></CardHeader>
            <CardContent>
              <PeakTimeHeatmap matrix={detail?.peak_time_heatmap ?? {}} dayLabels={[...DAY_LABELS]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Stake Bands</CardTitle></CardHeader>
            <CardContent>
              <StakeBandChart data={stakeBandData} />
            </CardContent>
          </Card>
        </div>

        {detail?.disclaimer && (
          <p className="text-sm text-muted-foreground">{detail.disclaimer}</p>
        )}
      </div>
    </AppShell>
  );
}
