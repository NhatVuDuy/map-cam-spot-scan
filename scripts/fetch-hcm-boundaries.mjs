/**
 * Fetch HCM district boundaries from daohoangson/dvhcvn and convert to
 * a standard GeoJSON FeatureCollection compatible with our boundarySearch.js.
 *
 * Run: node scripts/fetch-hcm-boundaries.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "../apps/frontend/public/data/hcm-boundaries.geojson");
const URL = "https://raw.githubusercontent.com/daohoangson/dvhcvn/master/data/gis/79.json";

async function main() {
  console.log("Fetching", URL);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const features = (data.level2s || []).map((d) => ({
    type: "Feature",
    properties: {
      name: d.name,
      level2_id: d.level2_id,
      type: "district",
    },
    geometry: {
      type: d.type,           // "MultiPolygon" or "Polygon"
      coordinates: d.coordinates,
    },
  }));

  const fc = {
    type: "FeatureCollection",
    metadata: {
      description: "Ranh giới hành chính TP. Hồ Chí Minh — nguồn: github.com/daohoangson/dvhcvn",
      source: URL,
      fetched: new Date().toISOString().slice(0, 10),
    },
    features,
  };

  writeFileSync(OUT, JSON.stringify(fc, null, 2));
  console.log(`Wrote ${features.length} features → ${OUT}`);
  features.forEach((f) => console.log(" •", f.properties.name));
}

main().catch((e) => { console.error(e); process.exit(1); });
