"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, MapPin } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/card";
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
      <div className="mb-6 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
        <p className="font-medium">Anonymised aggregate data</p>
        <p className="mt-1 text-muted">
          {overview?.disclaimer ??
            "No individual player identifiers are stored or exported."}
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export anonymised dataset (CSV)"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "bg-primary text-white"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "commercial" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Kenya — GGR by County"
              description="Interactive map (circle size = annual GGR)"
            />
            <KenyaCountyMap
              metric="annual_ggr"
              data={(overview?.counties ?? []).map((row) => ({
                county: row.county,
                value: row.annual_ggr,
                operator_count: row.operator_count,
              }))}
            />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="GGR by County" description="Bar chart — annual GGR" />
              <CountyBarChart
                data={ggrChartData ?? []}
                dataKey="annual_ggr"
                label="Annual GGR (KES)"
                color="#0B3D91"
              />
            </Card>
            <Card>
              <CardHeader title="County Snapshot" description="Top counties by GGR" />
              <div className="space-y-2">
                {(overview?.counties ?? []).slice(0, 8).map((row) => (
                  <Link
                    key={row.county}
                    href={`/regional/${encodeURIComponent(row.county)}`}
                    className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{row.county}</span>
                    </span>
                    <span className="shrink-0 text-muted text-xs sm:text-sm">
                      {formatNumber(row.operator_count)} ops · {formatKsh(row.annual_ggr)}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "player_safety" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Play Safe Activations by County"
              description="Kenya map (30 days)"
            />
            <KenyaCountyMap
              metric="play_safe"
              data={(overview?.play_safe_by_county ?? []).map((row) => ({
                county: row.county,
                value: row.count,
              }))}
            />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Play Safe Activations" description="By county (30 days)" />
              <CountyBarChart
                data={overview?.play_safe_by_county ?? []}
                dataKey="count"
                label="Activations"
              />
            </Card>
            <Card>
              <CardHeader title="Self-Exclusion Requests" description="By county (30 days)" />
              <CountyBarChart
                data={overview?.self_exclusion_by_county ?? []}
                dataKey="count"
                label="Requests"
                color="#C0392B"
              />
            </Card>
          </div>
        </div>
      )}

      {tab === "behaviour" && (
        <Card>
          <CardHeader
            title="Peak Play Time"
            description="Session intensity heatmap (hour × day of week)"
          />
          <PeakTimeHeatmap
            matrix={overview?.peak_time_heatmap.matrix ?? {}}
            dayLabels={overview?.peak_time_heatmap.day_labels ?? []}
          />
        </Card>
      )}

      {tab === "spend" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Stake Band Distribution"
              description="Anonymised spend bands (KES)"
            />
            <StakeBandChart data={overview?.stake_band_distribution ?? []} />
          </Card>
          <Card>
            <CardHeader
              title="Age Band Distribution"
              description="Anonymised session age buckets"
            />
            <StakeBandChart
              data={overview?.age_band_distribution ?? []}
              color="#6B4C9A"
            />
          </Card>
        </div>
      )}
    </AppShell>
  );
}
