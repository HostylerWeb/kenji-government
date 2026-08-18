"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Map as LeafletMap } from "leaflet";
import { getCountyCentroid } from "@/data/kenya-county-centroids";
import { formatKsh, formatNumber } from "@/lib/utils";

export type CountyMapPoint = {
  county: string;
  value: number;
  operator_count?: number;
};

type Metric = "annual_ggr" | "play_safe";

export function KenyaCountyMap({
  data,
  metric = "annual_ggr",
}: {
  data: CountyMapPoint[];
  metric?: Metric;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    let cancelled = false;

    async function initMap() {
      const L = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
      }).setView([-0.5, 37.5], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const maxValue = Math.max(...data.map((d) => d.value), 1);

      for (const point of data) {
        const { lat, lng } = getCountyCentroid(point.county);
        const intensity = point.value / maxValue;
        const radius = 8 + Math.sqrt(intensity) * 22;

        const marker = L.circleMarker([lat, lng], {
          radius,
          fillColor: metric === "annual_ggr" ? "#0B3D91" : "#1B7F4E",
          color: "#ffffff",
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.35 + intensity * 0.55,
        }).addTo(map);

        const valueLabel =
          metric === "annual_ggr"
            ? formatKsh(point.value)
            : formatNumber(point.value);

        marker.bindPopup(
          `<strong>${point.county}</strong><br/>${
            metric === "annual_ggr" ? "Annual GGR" : "Play Safe activations"
          }: ${valueLabel}${
            point.operator_count !== undefined
              ? `<br/>Operators: ${point.operator_count}`
              : ""
          }<br/><a href="/regional/${encodeURIComponent(point.county)}">View county</a>`,
        );
      }

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
  }, [data, metric]);

  if (data.length === 0) {
    return <p className="text-sm text-muted">No county data for this period.</p>;
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="h-80 w-full rounded-lg border border-border z-0"
        aria-label="Kenya counties map"
      />
      <p className="mt-2 text-xs text-muted">
        Circle size reflects {metric === "annual_ggr" ? "annual GGR" : "Play Safe activations"}.
        Click a marker for details.{" "}
        <Link href="/regional" className="text-primary hover:underline">
          Regional overview
        </Link>
      </p>
    </div>
  );
}
