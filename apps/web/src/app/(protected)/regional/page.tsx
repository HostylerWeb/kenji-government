"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, MapPin } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/card";
import { Tabs } from "@/components/tabs";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import {
  CountyBarChart,
  PeakTimeHeatmap,
  StakeBandChart,
} from "@/components/regional-charts";
import { KenyaCountyMap } from "@/components/kenya-county-map";
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

// GRA palette – use CSS tokens for charts
const GRA_GREEN = "hsl(152, 100%, 21%)";
const GRA_NAVY = "hsl(214, 54%, 23%)";
const GRA_RED = "hsl(3, 81%, 40%)";
const PURPLE = "#6B4C9A";

export default function RegionalPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<TabId>("commercial");
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

  if (!user) return null;

  const ggrChartData = overview?.counties.map((row) => ({
    county: row.county,
    annual_ggr: row.annual_ggr,
  }));

  return (
    <AppShell user={user} title="Regional & Player Safety">
      <div className="space-y-5">
        <PageHeader
          title="Regional & Player Safety"
          subtitle="Anonymised aggregate data — no individual player identifiers are stored"
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
          <div className="rounded-lg bg-danger-subtle border border-danger/30 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="pb-0">
            <Tabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} variant="underline" />
          </CardContent>
        </Card>

        {tab === "commercial" && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Kenya — GGR by County</CardTitle>
                <CardDescription>Interactive map (circle size = annual GGR)</CardDescription>
              </CardHeader>
              <CardContent>
                <KenyaCountyMap
                  metric="annual_ggr"
                  data={(overview?.counties ?? []).map((row) => ({
                    county: row.county,
                    value: row.annual_ggr,
                    operator_count: row.operator_count,
                  }))}
                />
              </CardContent>
            </Card>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>GGR by County</CardTitle>
                  <CardDescription>Annual GGR (KES)</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart data={ggrChartData ?? []} dataKey="annual_ggr" label="Annual GGR (KES)" color={GRA_NAVY} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>County Snapshot</CardTitle>
                  <CardDescription>Top counties by GGR</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/50">
                    {(overview?.counties ?? []).slice(0, 8).map((row) => (
                      <li key={row.county}>
                        <Link
                          href={`/regional/${encodeURIComponent(row.county)}`}
                          className="flex flex-col gap-2 px-5 py-3 text-sm hover:bg-secondary/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="min-w-0 truncate font-medium">{row.county}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
                            {formatNumber(row.operator_count)} ops · {formatKsh(row.annual_ggr)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {tab === "player_safety" && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Play Safe Activations by County</CardTitle>
                <CardDescription>Kenya map (30 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <KenyaCountyMap
                  metric="play_safe"
                  data={(overview?.play_safe_by_county ?? []).map((row) => ({
                    county: row.county,
                    value: row.count,
                  }))}
                />
              </CardContent>
            </Card>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Play Safe Activations</CardTitle>
                  <CardDescription>By county (30 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart data={overview?.play_safe_by_county ?? []} dataKey="count" label="Activations" color={GRA_GREEN} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Self-Exclusion Requests</CardTitle>
                  <CardDescription>By county (30 days)</CardDescription>
                </CardHeader>
                <CardContent>
                  <CountyBarChart data={overview?.self_exclusion_by_county ?? []} dataKey="count" label="Requests" color={GRA_RED} />
                </CardContent>
              </Card>
            </div>
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
      </div>
    </AppShell>
  );
}
