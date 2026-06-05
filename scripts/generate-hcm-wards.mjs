/**
 * Generate approximate ward polygons for HCM City.
 *
 * Strategy:
 *  1. Load dvhcvn.json for ward names (works from any host)
 *  2. Load existing district GeoJSON for district polygons
 *  3. For each district, subdivide its bbox into a grid, clip by district polygon
 *  4. Assign one cell (or merged cells) per ward
 *
 * Result is approximate — good enough for the boundary-selector UI.
 * For accurate boundaries, run fetch-hcm-wards.mjs from a machine that can
 * reach Overpass API (overpass-api.de).
 *
 * Run: node scripts/generate-hcm-wards.mjs
 */
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, "../apps/frontend/public/data/hcm-boundaries.geojson");
const DVHCVN = "https://raw.githubusercontent.com/daohoangson/dvhcvn/master/data/dvhcvn.json";

/* ─── simple point-in-polygon (ray casting) ────────────────────────────────── */
function pip(point, ring) {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function pipGeom(point, geom) {
  if (geom.type === "Polygon")      return pip(point, geom.coordinates[0]);
  if (geom.type === "MultiPolygon") return geom.coordinates.some(p => pip(point, p[0]));
  return false;
}

/* ─── get outer ring coords ────────────────────────────────────────────────── */
function outerRing(geom) {
  if (geom.type === "Polygon") return geom.coordinates[0];
  // MultiPolygon: use the largest polygon
  return geom.coordinates.reduce((best, p) => p[0].length > best.length ? p[0] : best, geom.coordinates[0][0]);
}

/* ─── bbox of geometry ─────────────────────────────────────────────────────── */
function bbox(geom) {
  const ring = outerRing(geom);
  const lngs = ring.map(c => c[0]), lats = ring.map(c => c[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/* ─── subdivide district polygon into N approximately-equal sub-polygons ────── */
function subdivideDistrict(distFeature, wards) {
  const geom   = distFeature.geometry;
  const [minX, minY, maxX, maxY] = bbox(geom);
  const n      = wards.length;
  if (n === 0) return [];

  // Figure out grid dimensions (roughly square cells)
  const aspect = (maxX - minX) / (maxY - minY);
  const cols   = Math.max(1, Math.round(Math.sqrt(n * aspect)));
  const rows   = Math.max(1, Math.ceil(n / cols));

  const dX = (maxX - minX) / cols;
  const dY = (maxY - minY) / rows;

  // Build grid cells, keep only those whose center is inside the district
  const cells = [];
  for (let r = 0; r < rows && cells.length < n; r++) {
    for (let c = 0; c < cols && cells.length < n; c++) {
      const x0 = minX + c * dX, x1 = x0 + dX;
      const y0 = minY + r * dY, y1 = y0 + dY;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (!pipGeom([cx, cy], geom)) continue;
      cells.push([x0, y0, x1, y1]);
    }
  }

  // If we got fewer cells than wards, add remaining from a denser pass
  if (cells.length < n) {
    for (let r = 0; r < rows * 2 && cells.length < n; r++) {
      for (let c = 0; c < cols * 2 && cells.length < n; c++) {
        const x0 = minX + c * dX / 2, x1 = x0 + dX / 2;
        const y0 = minY + r * dY / 2, y1 = y0 + dY / 2;
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        if (!pipGeom([cx, cy], geom)) continue;
        if (cells.some(([a,b,d,e]) => Math.abs(a-x0)<1e-8 && Math.abs(b-y0)<1e-8)) continue;
        cells.push([x0, y0, x1, y1]);
      }
    }
  }

  // Map each ward to a cell
  return wards.map((ward, i) => {
    const cell = cells[i] || cells[cells.length - 1];
    const [x0, y0, x1, y1] = cell;

    // Add slight inset so adjacent ward polygons don't perfectly overlap
    const pad = Math.min(dX, dY) * 0.02;
    const coords = [
      [x0 + pad, y0 + pad],
      [x1 - pad, y0 + pad],
      [x1 - pad, y1 - pad],
      [x0 + pad, y1 - pad],
      [x0 + pad, y0 + pad],
    ];

    return {
      type: "Feature",
      properties: {
        name: ward.name,
        level3_id: ward.level3_id,
        type: "ward",
        parent: distFeature.properties.name,
        ward_type: ward.type, // Phường / Xã / Thị trấn
      },
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  });
}

async function main() {
  console.log("Fetching ward names from dvhcvn...");
  const res  = await fetch(DVHCVN, { headers: { "User-Agent": "CamSpot-Ward-Generator/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data } = await res.json();
  const hcm = data.find(p => p.level1_id === "79");
  if (!hcm) throw new Error("HCM not found in dvhcvn");

  const totalWards = hcm.level2s.reduce((s, d) => s + (d.level3s || []).length, 0);
  console.log(`HCM: ${hcm.level2s.length} districts, ${totalWards} wards`);

  // Load district GeoJSON
  const existing = JSON.parse(readFileSync(OUT, "utf8"));
  const districtFeatures = existing.features.filter(f => f.properties.type === "district");
  console.log(`Loaded ${districtFeatures.length} district polygons`);

  // Match dvhcvn districts to GeoJSON features by name similarity
  const wardFeatures = [];

  for (const dvDistrict of hcm.level2s) {
    const wards = dvDistrict.level3s || [];
    if (wards.length === 0) continue;

    // Find matching GeoJSON district feature
    let distFeat = districtFeatures.find(f => f.properties.name === dvDistrict.name);
    if (!distFeat) {
      // Fallback: partial match
      distFeat = districtFeatures.find(f =>
        f.properties.name?.includes(dvDistrict.name) ||
        dvDistrict.name?.includes(f.properties.name?.replace("Thành phố ", ""))
      );
    }

    if (!distFeat) {
      console.warn(`  ⚠ No polygon for "${dvDistrict.name}" — skipping ${wards.length} wards`);
      continue;
    }

    console.log(`  ${dvDistrict.name}: ${wards.length} wards → "${distFeat.properties.name}"`);
    const sub = subdivideDistrict(distFeat, wards);
    wardFeatures.push(...sub);
  }

  const fc = {
    type: "FeatureCollection",
    metadata: {
      description: "Ranh giới hành chính TP.HCM — quận từ dvhcvn/OSM, phường xấp xỉ từ subdivision",
      note: "Ward boundaries are APPROXIMATE grid subdivisions. For accurate boundaries, run fetch-hcm-wards.mjs from a machine with Overpass API access.",
      sources: [
        "github.com/daohoangson/dvhcvn (district polygons + ward names)",
        "Grid subdivision algorithm (approximate ward polygons)",
      ],
      fetched: new Date().toISOString().slice(0, 10),
      districtCount: districtFeatures.length,
      wardCount: wardFeatures.length,
    },
    features: [...districtFeatures, ...wardFeatures],
  };

  writeFileSync(OUT, JSON.stringify(fc, null, 2));
  console.log(`\n✓ Wrote ${districtFeatures.length} districts + ${wardFeatures.length} wards → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
