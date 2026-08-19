"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Badge, complianceBadgeVariant, complianceLabel } from "@/components/badge";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import { useAuth } from "@/lib/use-auth";
import { getRegionalCounty, type RegionalCountyDetail } from "@/lib/api";
import { formatKsh, formatNumber } from "@/lib/utils";
import { DAY_LABELS } from "@kenji-government/shared";

export default function RegionalCountyPage() {
  const params = useParams();
  const county = decodeURIComponent(params.county as string);
  const { user, token } = useAuth();
  const [detail, setDetail] = useState<RegionalCountyDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getRegionalCounty(token, county, 30)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [token, county]);

  if (!user) return null;

  const stakeBandData = Object.entries(detail?.stake_band_distribution ?? {}).map(
    ([band, count]) => ({ band, count })
  );

  const trendData =
    detail?.daily_trend.map((row) => ({
      county: row.date,
      count: row.play_safe_activations,
    })) ?? [];

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
        {error && (
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Operators" value={formatNumber(detail?.operator_count)} />
          <StatCard title="Annual GGR" value={formatKsh(detail?.annual_ggr_total)} variant="success" />
          <StatCard title="Play Safe Activations" value={formatNumber(detail?.play_safe_activations)} variant="warning" />
          <StatCard title="Sessions" value={formatNumber(detail?.session_count)} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Operators in {county}</CardTitle></CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/50">
                {(detail?.operators ?? []).map((op) => (
                  <li key={op.external_id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/operators/${op.external_id}`} className="text-sm font-medium hover:text-primary transition-colors">
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
