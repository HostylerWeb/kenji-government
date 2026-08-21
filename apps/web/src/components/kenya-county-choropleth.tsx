"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { countyLookupKey } from "@/lib/county-names";
import {
  CHOROPLETH_COLORS,
  getMapboxAccessToken,
} from "@/lib/mapbox";
import {
  formatMetricValue,
  METRIC_LABELS,
  metricValue,
  type ChoroplethMetric,
  type CountyChoroplethRow,
  type CountyFeatureCollection,
} from "@/lib/regional-map";

export type { ChoroplethMetric, CountyChoroplethRow };

function ChoroplethLegend({ metric, overlay }: { metric: ChoroplethMetric; overlay?: boolean }) {
  const content = (
    <>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Low
      </span>
      <div className="flex overflow-hidden rounded-sm border border-white/80 shadow-inner">
        {CHOROPLETH_COLORS.map((color) => (
          <span key={color} className="h-3 w-7" style={{ backgroundColor: color }} />
        ))}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        High
      </span>
    </>
  );

  if (overlay) {
    return (
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border border-border/70 bg-card/95 px-3 py-2 shadow-md backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Shaded by {METRIC_LABELS[metric].toLowerCase()}. Hover for detail — click any county to drill down.
      </p>
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-2.5 py-1.5 shadow-sm">
        {content}
      </div>
    </div>
  );
}

function MapLoading({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-border bg-secondary/30 text-sm text-muted-foreground"
      style={{ height }}
    >
      Loading county map…
    </div>
  );
}

function MapUnavailable({ reason, height = 480 }: { reason: string; height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-6 text-center"
      style={{ height }}
    >
      <p className="text-sm font-medium text-foreground">County map unavailable</p>
      <p className="max-w-md text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}

const KenyaCountyMapboxMap = dynamic(
  () => import("./kenya-county-mapbox-map").then((mod) => mod.KenyaCountyMapboxMap),
  {
    ssr: false,
    loading: () => <MapLoading height={480} />,
  },
);

export function KenyaCountyChoropleth({
  data,
  metric = "annual_ggr",
  selectedCounty,
  highlightCounty,
  onCountySelect,
  onCountyHover,
  height = 480,
  legendOverlay = true,
}: {
  data: CountyChoroplethRow[];
  metric?: ChoroplethMetric;
  selectedCounty?: string | null;
  highlightCounty?: string | null;
  onCountySelect?: (county: string) => void;
  onCountyHover?: (county: string | null) => void;
  height?: number;
  legendOverlay?: boolean;
}) {
  const token = getMapboxAccessToken();
  const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const valueByCounty = useMemo(() => {
    const map = new Map<string, CountyChoroplethRow>();
    for (const row of data) {
      map.set(countyLookupKey(row.county), row);
    }
    return map;
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(...data.map((row) => metricValue(row, metric)), 1);
  }, [data, metric]);

  const enrichedGeoJson = useMemo((): CountyFeatureCollection | null => {
    if (!geoJson) return null;

    return {
      type: "FeatureCollection",
      features: geoJson.features.map((feature) => {
        const shapeName = String(feature.properties?.shapeName ?? "");
        const row = valueByCounty.get(countyLookupKey(shapeName));
        const value = row ? metricValue(row, metric) : 0;
        const isSelected = Boolean(
          selectedCounty && countyLookupKey(selectedCounty) === countyLookupKey(shapeName),
        );
        const isHighlighted = Boolean(
          highlightCounty && countyLookupKey(highlightCounty) === countyLookupKey(shapeName),
        );

        return {
          ...feature,
          properties: {
            shapeName,
            metricValue: value,
            dbCounty: row?.county ?? shapeName,
            sessionsChangePct: row?.sessions_change_pct ?? null,
            isSelected,
            isHighlighted,
          },
        };
      }),
    };
  }, [geoJson, valueByCounty, metric, selectedCounty, highlightCounty]);

  useEffect(() => {
    setGeoLoading(true);
    setLoadError(false);
    fetch("/data/kenya-counties.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load counties");
        return res.json();
      })
      .then(setGeoJson)
      .catch(() => {
        setGeoJson(null);
        setLoadError(true);
      })
      .finally(() => setGeoLoading(false));
  }, []);

  if (!token) {
    return (
      <div>
        <MapUnavailable reason="Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment to enable the interactive map." height={height} />
        <ChoroplethLegend metric={metric} overlay={false} />
      </div>
    );
  }

  if (geoLoading) {
    return <MapLoading height={height} />;
  }

  if (loadError || !enrichedGeoJson) {
    return (
      <div>
        <MapUnavailable reason="Could not load Kenya county boundaries. Try refreshing the page." height={height} />
        <ChoroplethLegend metric={metric} overlay={false} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <KenyaCountyMapboxMap
          accessToken={token}
          geoJson={enrichedGeoJson}
          metric={metric}
          maxValue={maxValue}
          height={height}
          onCountySelect={onCountySelect}
          onCountyHover={onCountyHover}
        />
        {legendOverlay && <ChoroplethLegend metric={metric} overlay />}
      </div>
      {!legendOverlay && <ChoroplethLegend metric={metric} />}
    </div>
  );
}

export { formatMetricValue, METRIC_LABELS };
