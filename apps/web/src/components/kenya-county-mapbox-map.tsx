"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Map, {
  AttributionControl,
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox";
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  Map as MapboxMap,
  MapMouseEvent,
} from "mapbox-gl";
import { CHOROPLETH_COLORS, MAPBOX_STYLE } from "@/lib/mapbox";
import {
  formatMetricValue,
  type ChoroplethMetric,
  type CountyFeatureCollection,
  type CountyFeatureProperties,
} from "@/lib/regional-map";

const GRA_NAVY = "#1A365D";
const GRA_GREEN = "#00A551";
const SOURCE_ID = "kenya-counties";

type HoverInfo = {
  county: string;
  dbCounty: string;
  value: number;
  change: number | null;
  longitude: number;
  latitude: number;
};

function hideBasemapLabels(map: MapboxMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    if (layer.type === "symbol") {
      map.setLayoutProperty(layer.id, "visibility", "none");
    }
  }
}

export function KenyaCountyMapboxMap({
  accessToken,
  geoJson,
  metric,
  maxValue,
  height = 480,
  onCountySelect,
  onCountyHover,
}: {
  accessToken: string;
  geoJson: CountyFeatureCollection;
  metric: ChoroplethMetric;
  maxValue: number;
  height?: number;
  onCountySelect?: (county: string) => void;
  onCountyHover?: (county: string | null) => void;
}) {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const hoveredFeatureId = useRef<string | number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [cursor, setCursor] = useState<string>("default");

  const fillPaint = useMemo(
    (): FillLayerSpecification["paint"] => ({
      "fill-color": [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "metricValue"], 0],
        0,
        CHOROPLETH_COLORS[0],
        maxValue * 0.1,
        CHOROPLETH_COLORS[1],
        maxValue * 0.25,
        CHOROPLETH_COLORS[2],
        maxValue * 0.5,
        CHOROPLETH_COLORS[3],
        maxValue * 0.8,
        CHOROPLETH_COLORS[4],
        maxValue,
        "#004d28",
      ],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.92,
        ["==", ["get", "isSelected"], true],
        0.88,
        ["==", ["get", "isHighlighted"], true],
        0.9,
        0.78,
      ],
    }),
    [maxValue],
  );

  const linePaint = useMemo(
    (): LineLayerSpecification["paint"] => ({
      "line-color": [
        "case",
        ["==", ["get", "isSelected"], true],
        GRA_NAVY,
        ["boolean", ["feature-state", "hover"], false],
        GRA_GREEN,
        ["==", ["get", "isHighlighted"], true],
        GRA_GREEN,
        "#ffffff",
      ],
      "line-width": [
        "case",
        ["==", ["get", "isSelected"], true],
        3,
        ["boolean", ["feature-state", "hover"], false],
        2.5,
        ["==", ["get", "isHighlighted"], true],
        2.5,
        1.2,
      ],
      "line-opacity": 0.95,
    }),
    [],
  );

  const clearHoverState = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || hoveredFeatureId.current === null) return;

    map.setFeatureState(
      { source: SOURCE_ID, id: hoveredFeatureId.current },
      { hover: false },
    );
    hoveredFeatureId.current = null;
  }, []);

  const onMouseMove = useCallback(
    (event: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      const feature = event.features?.[0];
      if (!map || !feature?.id) {
        clearHoverState();
        setHoverInfo(null);
        setCursor("default");
        onCountyHover?.(null);
        return;
      }

      if (hoveredFeatureId.current !== null && hoveredFeatureId.current !== feature.id) {
        map.setFeatureState(
          { source: SOURCE_ID, id: hoveredFeatureId.current },
          { hover: false },
        );
      }

      hoveredFeatureId.current = feature.id;
      map.setFeatureState({ source: SOURCE_ID, id: feature.id }, { hover: true });
      setCursor("pointer");

      const props = feature.properties as CountyFeatureProperties;
      onCountyHover?.(props.dbCounty ?? props.shapeName);
      setHoverInfo({
        county: props.shapeName,
        dbCounty: props.dbCounty,
        value: Number(props.metricValue ?? 0),
        change:
          props.sessionsChangePct !== null && props.sessionsChangePct !== undefined
            ? Number(props.sessionsChangePct)
            : null,
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      });
    },
    [clearHoverState, onCountyHover],
  );

  const onMouseLeave = useCallback(() => {
    clearHoverState();
    setHoverInfo(null);
    setCursor("default");
    onCountyHover?.(null);
  }, [clearHoverState, onCountyHover]);

  const onClick = useCallback(
    (event: MapMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature?.properties) return;

      const props = feature.properties as CountyFeatureProperties;
      const dbCounty = props.dbCounty ?? props.shapeName;
      onCountySelect?.(dbCounty);
      router.push(`/regional/${encodeURIComponent(dbCounty)}`);
    },
    [onCountySelect, router],
  );

  return (
    <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
      <Map
        ref={mapRef}
        mapboxAccessToken={accessToken}
        mapStyle={MAPBOX_STYLE}
        initialViewState={{
          bounds: [
            [33.85, -4.78],
            [41.95, 5.05],
          ],
          fitBoundsOptions: { padding: 52, maxZoom: 7.2 },
        }}
        style={{ width: "100%", height }}
        scrollZoom={false}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={false}
        cursor={cursor}
        interactiveLayerIds={["counties-fill"]}
        onLoad={(event) => hideBasemapLabels(event.target)}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <AttributionControl compact position="bottom-right" />
        <NavigationControl position="top-right" showCompass={false} visualizePitch={false} />

        <Source id={SOURCE_ID} type="geojson" data={geoJson} generateId>
          <Layer id="counties-fill" type="fill" source={SOURCE_ID} paint={fillPaint} />
          <Layer id="counties-line" type="line" source={SOURCE_ID} paint={linePaint} />
        </Source>

        {hoverInfo && (
          <Popup
            longitude={hoverInfo.longitude}
            latitude={hoverInfo.latitude}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={12}
            className="county-map-popup"
          >
            <div className="min-w-[180px] space-y-1.5 p-0.5">
              <p className="text-sm font-semibold text-foreground">{hoverInfo.county}</p>
              <p className="text-xs text-muted-foreground">
                {metric === "annual_ggr"
                  ? "Annual GGR"
                  : metric === "sessions"
                    ? "Player sessions"
                    : "Play Safe activations"}
                :{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {formatMetricValue(metric, hoverInfo.value)}
                </span>
              </p>
              {hoverInfo.change !== null && (
                <p className="text-xs text-muted-foreground">
                  Session change:{" "}
                  <span
                    className={
                      hoverInfo.change > 0
                        ? "font-medium text-success"
                        : hoverInfo.change < 0
                          ? "font-medium text-danger"
                          : "font-medium text-foreground"
                    }
                  >
                    {hoverInfo.change > 0 ? "+" : ""}
                    {hoverInfo.change}%
                  </span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/80">Click for county detail</p>
            </div>
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/40 to-transparent" />
    </div>
  );
}
