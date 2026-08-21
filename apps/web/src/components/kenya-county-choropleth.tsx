"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeoJSON, Layer, Map as LeafletMap } from "leaflet";
import { countyLookupKey } from "@/lib/county-names";
import { formatKsh, formatNumber } from "@/lib/utils";

export type ChoroplethMetric = "annual_ggr" | "sessions" | "play_safe";

export type CountyChoroplethRow = {
  county: string;
  annual_ggr: number;
  sessions: number;
  play_safe: number;
  operator_count?: number;
  sessions_change_pct?: number | null;
};

const METRIC_LABELS: Record<ChoroplethMetric, string> = {
  annual_ggr: "Annual GGR",
  sessions: "Player sessions",
  play_safe: "Play Safe activations",
};

const HEAT_COLORS = ["#e5f5e0", "#a1d99b", "#74c476", "#31a354", "#006837"];

function heatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return HEAT_COLORS[0];
  const ratio = value / max;
  if (ratio > 0.8) return HEAT_COLORS[4];
  if (ratio > 0.5) return HEAT_COLORS[3];
  if (ratio > 0.25) return HEAT_COLORS[2];
  if (ratio > 0.1) return HEAT_COLORS[1];
  return HEAT_COLORS[0];
}

function formatMetricValue(metric: ChoroplethMetric, value: number): string {
  if (metric === "annual_ggr") return formatKsh(value);
  return formatNumber(value);
}

export function KenyaCountyChoropleth({
  data,
  metric = "annual_ggr",
  selectedCounty,
  onCountySelect,
}: {
  data: CountyChoroplethRow[];
  metric?: ChoroplethMetric;
  selectedCounty?: string | null;
  onCountySelect?: (county: string) => void;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<GeoJSON | null>(null);
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);

  const valueByCounty = useMemo(() => {
    const map = new Map<string, CountyChoroplethRow>();
    for (const row of data) {
      map.set(countyLookupKey(row.county), row);
    }
    return map;
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(
      ...data.map((row) =>
        metric === "annual_ggr"
          ? row.annual_ggr
          : metric === "sessions"
            ? row.sessions
            : row.play_safe,
      ),
      1,
    );
  }, [data, metric]);

  useEffect(() => {
    fetch("/data/kenya-counties.geojson")
      .then((res) => res.json())
      .then(setGeoJson)
      .catch(() => setGeoJson(null));
  }, []);

  useEffect(() => {
    if (!containerRef.current || !geoJson) return;

    let cancelled = false;

    async function initMap() {
      const L = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [-0.5, 37.5],
        6,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const geoLayer = L.geoJSON(geoJson, {
        style: (feature) => {
          const shapeName = String(feature?.properties?.shapeName ?? "");
          const row = valueByCounty.get(countyLookupKey(shapeName));
          const value = row
            ? metric === "annual_ggr"
              ? row.annual_ggr
              : metric === "sessions"
                ? row.sessions
                : row.play_safe
            : 0;
          const isSelected =
            selectedCounty &&
            countyLookupKey(selectedCounty) === countyLookupKey(shapeName);

          return {
            fillColor: heatColor(value, maxValue),
            weight: isSelected ? 3 : 1.5,
            opacity: 1,
            color: isSelected ? "#0B3D91" : "#ffffff",
            fillOpacity: 0.75,
          };
        },
        onEachFeature: (feature, layer) => {
          const shapeName = String(feature?.properties?.shapeName ?? "");
          const row = valueByCounty.get(countyLookupKey(shapeName));
          const value = row
            ? metric === "annual_ggr"
              ? row.annual_ggr
              : metric === "sessions"
                ? row.sessions
                : row.play_safe
            : 0;
          const change =
            row?.sessions_change_pct !== undefined && row?.sessions_change_pct !== null
              ? `<br/>Session change: ${row.sessions_change_pct > 0 ? "+" : ""}${row.sessions_change_pct}%`
              : "";

          layer.bindTooltip(
            `<strong>${shapeName}</strong><br/>${METRIC_LABELS[metric]}: ${formatMetricValue(metric, value)}${change}<br/><span style="opacity:0.8">Click for county detail</span>`,
          );

          layer.on("click", () => {
            const dbCounty = row?.county ?? shapeName;
            onCountySelect?.(dbCounty);
            router.push(`/regional/${encodeURIComponent(dbCounty)}`);
          });

          layer.on("mouseover", (event) => {
            const target = event.target as Layer & { setStyle?: (style: object) => void };
            target.setStyle?.({ weight: 2.5, fillOpacity: 0.9 });
          });

          layer.on("mouseout", (event) => {
            const target = event.target as Layer & { setStyle?: (style: object) => void };
            geoLayer.resetStyle(target);
          });
        },
      }).addTo(map);

      layerRef.current = geoLayer;
      mapRef.current = map;
    }

    initMap().catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [geoJson, valueByCounty, metric, maxValue, selectedCounty, onCountySelect, router]);

  if (!geoJson) {
    return (
      <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground">
        Loading county map…
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="h-[420px] w-full rounded-lg border border-border z-0"
        aria-label="Kenya county heatmap"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Counties shaded by {METRIC_LABELS[metric].toLowerCase()}. Click a county to drill down.
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Low</span>
          {HEAT_COLORS.map((color) => (
            <span
              key={color}
              className="h-3 w-6 rounded-sm border border-white/80"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  );
}
