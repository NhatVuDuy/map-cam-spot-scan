/**
 * Fetch HCM ward (phường/xã/thị trấn) boundaries from Overpass API.
 * OSM admin_level=8 = ward/phường/xã in Vietnam.
 * Merges with existing district data.
 *
 * Run: node scripts/fetch-hcm-wards.mjs
 */
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "../apps/frontend/public/data/hcm-boundaries.geojson");

const OVERPASS = "https://overpass-api.de/api/interpreter";

// Query: all admin boundaries (level 5=district, level 8=ward) in HCM
const QUERY = `
[out:json][timeout:120];
area["name"="Thành phố Hồ Chí Minh"]["admin_level"="4"]->.hcm;
(
  relation["boundary"="administrative"]["admin_level"="8"](area.hcm);
);
out tags geom;
`;

function relToFeature(rel) {
  const tags = rel.tags || {};
  const name = tags.name || tags["name:vi"] || `Relation ${rel.id}`;

  // Build MultiPolygon from outer/inner members
  const outers = rel.members?.filter(m => m.type === "way" && m.role === "outer") || [];
  const inners = rel.members?.filter(m => m.type === "way" && m.role === "inner") || [];

  // Collect outer rings
  const outerRings = outers
    .filter(m => m.geometry && m.geometry.length >= 2)
    .map(m => m.geometry.map(n => [n.lon, n.lat]));

  if (outerRings.length === 0) return null;

  // Simple: each outer ring + any matching inner rings = one polygon
  // For simplicity treat inners as holes in the first polygon
  const innerRings = inners
    .filter(m => m.geometry && m.geometry.length >= 2)
    .map(m => m.geometry.map(n => [n.lon, n.lat]));

  const geometry = outerRings.length === 1
    ? { type: "Polygon", coordinates: [outerRings[0], ...innerRings] }
    : { type: "MultiPolygon", coordinates: outerRings.map((r, i) => [r, ...(i === 0 ? innerRings : [])]) };

  return {
    type: "Feature",
    properties: {
      name,
      osm_id: rel.id,
      type: "ward",
      admin_level: tags.admin_level,
      place: tags.place,
    },
    geometry,
  };
}

async function main() {
  console.log("Fetching ward boundaries from Overpass API...");
  console.log("This may take 30-60 seconds...\n");

  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(QUERY)}`,
    signal: AbortSignal.timeout(130_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();

  const elements = data.elements || [];
  console.log(`Got ${elements.length} relations from Overpass`);

  const features = elements
    .map(relToFeature)
    .filter(Boolean);

  console.log(`Converted ${features.length} ward features`);

  // Load existing districts
  const existing = JSON.parse(readFileSync(OUT, "utf8"));
  const districts = existing.features.filter(f => f.properties.type === "district");

  const fc = {
    type: "FeatureCollection",
    metadata: {
      description: "Ranh giới hành chính TP. Hồ Chí Minh — quận từ dvhcvn, phường từ OpenStreetMap Overpass",
      sources: ["github.com/daohoangson/dvhcvn (districts)", "OpenStreetMap admin_level=8 (wards)"],
      fetched: new Date().toISOString().slice(0, 10),
    },
    features: [...districts, ...features],
  };

  writeFileSync(OUT, JSON.stringify(fc, null, 2));
  console.log(`\n✓ Wrote ${districts.length} districts + ${features.length} wards → ${OUT}`);
  features.slice(0, 10).forEach(f => console.log(" •", f.properties.name));
  if (features.length > 10) console.log(` ... and ${features.length - 10} more`);
}

main().catch(e => { console.error(e); process.exit(1); });
