/** Mapbox public access token — set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in env. */
export function getMapboxAccessToken(): string | undefined {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  return token || undefined;
}

export const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

/** GRA-aligned choropleth ramp (low → high). */
export const CHOROPLETH_COLORS = [
  "#eef6f0",
  "#c8e6cc",
  "#7bc47f",
  "#00a551",
  "#006b35",
] as const;
