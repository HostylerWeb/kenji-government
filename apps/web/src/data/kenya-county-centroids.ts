/**
 * Approximate county centroids for Kenya map markers (WGS84).
 * Used for choropleth-style GGR visualization on the regional dashboard.
 */
export const KENYA_COUNTY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Nairobi: { lat: -1.2864, lng: 36.8172 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
  Kisumu: { lat: -0.1022, lng: 34.7617 },
  Nyeri: { lat: -0.4201, lng: 36.9476 },
  Kiambu: { lat: -1.0314, lng: 36.8682 },
  Nakuru: { lat: -0.3031, lng: 36.08 },
  Kakamega: { lat: 0.2827, lng: 34.7519 },
  Meru: { lat: 0.05, lng: 37.65 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
  Kilifi: { lat: -3.6309, lng: 39.8499 },
  Eldoret: { lat: 0.5143, lng: 35.2698 },
  UasinGishu: { lat: 0.5143, lng: 35.2698 },
  Turkana: { lat: 3.1191, lng: 35.5973 },
  Lamu: { lat: -2.2717, lng: 40.902 },
  Kwale: { lat: -4.1743, lng: 39.4521 },
  TanaRiver: { lat: -1.5, lng: 39.5 },
  Garissa: { lat: -0.4532, lng: 39.6461 },
  Wajir: { lat: 1.7471, lng: 40.0573 },
  Mandera: { lat: 3.9366, lng: 41.867 },
  Marsabit: { lat: 2.3344, lng: 37.99 },
  Isiolo: { lat: 0.3545, lng: 37.5822 },
  Samburu: { lat: 1.2155, lng: 36.9541 },
  Laikipia: { lat: 0.2036, lng: 36.8 },
  Nyandarua: { lat: -0.5411, lng: 36.4356 },
  Muranga: { lat: -0.724, lng: 37.1526 },
  Kirinyaga: { lat: -0.659, lng: 37.3827 },
  Embu: { lat: -0.5396, lng: 37.4574 },
  Kitui: { lat: -1.3667, lng: 38.0106 },
  Makueni: { lat: -2.2558, lng: 37.8939 },
  Kajiado: { lat: -1.8524, lng: 36.7762 },
  Narok: { lat: -1.0783, lng: 35.8691 },
  Bomet: { lat: -0.7813, lng: 35.3416 },
  Kericho: { lat: -0.3677, lng: 35.2831 },
  Baringo: { lat: 0.4667, lng: 35.9667 },
  WestPokot: { lat: 1.6219, lng: 35.1187 },
  TransNzoia: { lat: 1.0567, lng: 35.0 },
  Bungoma: { lat: 0.5635, lng: 34.5606 },
  Busia: { lat: 0.4601, lng: 34.1117 },
  Vihiga: { lat: 0.0769, lng: 34.7222 },
  Siaya: { lat: 0.0607, lng: 34.2881 },
  HomaBay: { lat: -0.5273, lng: 34.4572 },
  Migori: { lat: -1.0634, lng: 34.4731 },
  Kisii: { lat: -0.6773, lng: 34.7796 },
  Nyamira: { lat: -0.5669, lng: 34.934 },
  Nandi: { lat: 0.1833, lng: 35.1167 },
  ElgeyoMarakwet: { lat: 0.5167, lng: 35.5 },
  TharakaNithi: { lat: -0.3, lng: 37.65 },
  Unknown: { lat: -0.5, lng: 37.5 },
};

export function getCountyCentroid(county: string): { lat: number; lng: number } {
  const key = county.replace(/\s+/g, "");
  if (KENYA_COUNTY_CENTROIDS[county]) {
    return KENYA_COUNTY_CENTROIDS[county];
  }
  if (KENYA_COUNTY_CENTROIDS[key]) {
    return KENYA_COUNTY_CENTROIDS[key];
  }
  return KENYA_COUNTY_CENTROIDS.Unknown;
}
