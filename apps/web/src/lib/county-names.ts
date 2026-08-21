/** Normalize county names for matching DB values to GeoJSON shapeName. */
export function normalizeCountyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTY_ALIASES: Record<string, string> = {
  eldoret: "uasin gishu",
  "tharaka nithi": "tharaka",
  "taita taveta": "taita taveta",
  muranga: "murang'a",
};

export function countyLookupKey(name: string): string {
  const key = normalizeCountyKey(name);
  return COUNTY_ALIASES[key] ?? key;
}

export function countiesMatch(a: string, b: string): boolean {
  return countyLookupKey(a) === countyLookupKey(b);
}
