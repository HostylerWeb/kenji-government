import { formatKsh, formatNumber } from "@/lib/utils";

export type ChoroplethMetric = "annual_ggr" | "sessions" | "play_safe";

export type CountyChoroplethRow = {
  county: string;
  annual_ggr: number;
  sessions: number;
  play_safe: number;
  operator_count?: number;
  sessions_change_pct?: number | null;
  play_safe_change_pct?: number | null;
  ggr_ytd_change_pct?: number | null;
};

export const METRIC_LABELS: Record<ChoroplethMetric, string> = {
  annual_ggr: "Annual GGR",
  sessions: "Player sessions",
  play_safe: "Play Safe activations",
};

export function metricValue(row: CountyChoroplethRow, metric: ChoroplethMetric): number {
  if (metric === "annual_ggr") return row.annual_ggr;
  if (metric === "sessions") return row.sessions;
  return row.play_safe;
}

export function formatMetricValue(metric: ChoroplethMetric, value: number): string {
  if (metric === "annual_ggr") return formatKsh(value);
  return formatNumber(value);
}

export type CountyFeatureProperties = {
  shapeName: string;
  metricValue: number;
  dbCounty: string;
  sessionsChangePct: number | null;
  isSelected: boolean;
  isHighlighted: boolean;
};

export type CountyFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  CountyFeatureProperties
>;
