"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/card";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import { useAuth } from "@/lib/use-auth";
import {
  getRegionalCounty,
  type RegionalCountyDetail,
} from "@/lib/api";
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
    ([band, count]) => ({ band, count }),
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
        { label: "Regional", href: "/regional" },
        { label: county },
      ]}
    >
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader
            title="Operators"
            description={formatNumber(detail?.operator_count)}
          />
        </Card>
        <Card>
          <CardHeader title="Annual GGR" description={formatKsh(detail?.annual_ggr_total)} />
        </Card>
        <Card>
          <CardHeader
            title="Play Safe"
            description={formatNumber(detail?.play_safe_activations)}
          />
        </Card>
        <Card>
          <CardHeader
            title="Sessions"
            description={formatNumber(detail?.session_count)}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Operators in County" />
          <ul className="space-y-2 text-sm">
            {(detail?.operators ?? []).map((op) => (
              <li key={op.external_id}>
                <Link
                  href={`/operators/${op.external_id}`}
                  className="hover:text-primary"
                >
                  {op.trading_name}
                </Link>
                <span className="ml-2 text-muted capitalize">
                  {op.compliance_status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Play Safe Trend" description="Daily activations (30 days)" />
          <CountyBarChart data={trendData} dataKey="count" label="Activations" />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Peak Play Time" />
          <PeakTimeHeatmap
            matrix={detail?.peak_time_heatmap ?? {}}
            dayLabels={[...DAY_LABELS]}
          />
        </Card>
        <Card>
          <CardHeader title="Stake Bands" />
          <StakeBandChart data={stakeBandData} />
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted">{detail?.disclaimer}</p>
    </AppShell>
  );
}
