import { geometryBBox } from "../utils/pointInPolygon.js";

let cachedFeatures = null;

/** Load boundary GeoJSON from public/data/ (cached after first load). */
export async function loadBoundaries() {
  if (cachedFeatures) return cachedFeatures;
  const res = await fetch("/data/hcm-boundaries.geojson");
  if (!res.ok) throw new Error("Không tải được file ranh giới");
  const fc = await res.json();
  // Normalise: ensure every feature has a `level` field for display
  cachedFeatures = (fc.features || []).map((f) => {
    const p = f.properties;
    if (!p.level) p.level = p.type === "district" ? "district" : "ward";
    return f;
  });
  return cachedFeatures;
}

/** Normalize Vietnamese text for fuzzy matching (remove diacritics). */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

/**
 * Search boundary features by name query.
 * Returns features sorted: wards first when query matches ward, then districts.
 */
export function searchBoundaries(features, query) {
  if (!query || query.trim().length < 1) return [];
  const q = normalize(query);

  return features
    .map((f) => {
      const p = f.properties;
      const nameNorm = normalize(p.name);
      const parentNorm = normalize(p.parent || "");
      const fullNorm = normalize(`${p.name} ${p.parent || ""}`);

      let score = 0;
      if (nameNorm === q)            score = 100;
      else if (nameNorm.startsWith(q)) score = 80;
      else if (nameNorm.includes(q)) score = 60;
      else if (fullNorm.includes(q)) score = 40;
      else if (parentNorm.includes(q)) score = 20;

      return { feature: f, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.feature.properties.level === "ward" ? -1 : 1))
    .slice(0, 10)
    .map((r) => r.feature);
}

/** Compute center lat/lng + area radius from a feature's geometry bbox. */
export function featureToArea(feature) {
  const [minLng, minLat, maxLng, maxLat] = geometryBBox(feature.geometry);
  const lat = (minLat + maxLat) / 2;
  const lng = (minLng + maxLng) / 2;
  const latSpanM = (maxLat - minLat) * 111_320;
  const lngSpanM = (maxLng - minLng) * 111_320 * Math.cos((lat * Math.PI) / 180);
  const radiusM = Math.min(Math.max(Math.round((Math.max(latSpanM, lngSpanM) / 2 * 1.05) / 100) * 100, 200), 15_000);
  return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), radiusM };
}
