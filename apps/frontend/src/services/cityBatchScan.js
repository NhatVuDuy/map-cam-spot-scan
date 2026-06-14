import { browserScan } from "./browserScan.js";

const CATEGORIES = ["intersection", "school", "hospital", "park", "market", "hotel", "conference", "government"];
const DELAY_MS = 1600; // stay under Overpass rate-limit (~1 req/s)
const STORAGE_KEY = "hcm-city-scan-v1";

function wardCenter(geometry) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  function walk(c) {
    if (typeof c[0] === "number") {
      if (c[0] < minLng) minLng = c[0]; if (c[0] > maxLng) maxLng = c[0];
      if (c[1] < minLat) minLat = c[1]; if (c[1] > maxLat) maxLat = c[1];
    } else c.forEach(walk);
  }
  walk(geometry.coordinates);
  const lat = (minLat + maxLat) / 2, lng = (minLng + maxLng) / 2;
  const dLat = (maxLat - minLat) * 111320;
  const dLng = (maxLng - minLng) * 111320 * Math.cos(lat * Math.PI / 180);
  const radiusM = Math.max(dLat, dLng) / 2 * 1.25;
  return { lat, lng, radiusM: Math.max(radiusM, 500) };
}

function calcRoadKm(roads) {
  let km = 0;
  for (const r of roads) {
    const g = r.geometry;
    for (let i = 1; i < g.length; i++) {
      const dx = (g[i][0] - g[i-1][0]) * 111320 * Math.cos(g[i][1] * Math.PI / 180);
      const dy = (g[i][1] - g[i-1][1]) * 111320;
      km += Math.sqrt(dx * dx + dy * dy) / 1000;
    }
  }
  return km;
}

/* ── persistence ────────────────────────────────────────────────── */
export function loadCityScanCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveCityScanCache(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function clearCityScanCache() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ── aggregate helper ───────────────────────────────────────────── */
export function aggregateWards(wards) {
  const byCat = {};
  let camCount = 0, roadKm = 0, cam1 = 0, cam2 = 0, cam21 = 0, camAlley = 0;
  let completed = 0, errors = 0;
  for (const w of wards) {
    if (w.error) { errors++; continue; }
    completed++;
    camCount += w.camCount || 0;
    roadKm += w.roadKm || 0;
    cam1 += w.cam1 || 0;
    cam2 += w.cam2 || 0;
    cam21 += w.cam21 || 0;
    camAlley += w.camAlley || 0;
    for (const [k, v] of Object.entries(w.byCat || {})) byCat[k] = (byCat[k] || 0) + v;
  }
  return { camCount, roadKm, cam1, cam2, cam21, camAlley, byCat, completed, errors };
}

/* ── main scan runner ───────────────────────────────────────────── */
export async function batchScanCity({ onProgress, onWardDone, signal } = {}) {
  const resp = await fetch("/data/hcm-boundaries.geojson");
  const geojson = await resp.json();
  const wards = geojson.features.filter(f => f.properties.type === "ward");

  const results = [];

  for (let i = 0; i < wards.length; i++) {
    if (signal?.aborted) break;

    const ward = wards[i];
    const { name, code } = ward.properties;

    onProgress?.({ current: i + 1, total: wards.length, wardName: name, pct: Math.round((i / wards.length) * 100) });

    try {
      const center = wardCenter(ward.geometry);
      const result = await browserScan(
        { area: center, categories: CATEGORIES, boundary: ward, options: { maxResults: 800 } },
        () => {}
      );

      const cam1 = result.cameras.filter(c => c.type === "cam1").length;
      const cam2 = result.cameras.filter(c => ["cam2", "cam22"].includes(c.type)).length;
      const cam21 = result.cameras.filter(c => ["cam21", "cam23"].includes(c.type)).length;
      const camAlley = result.cameras.filter(c => c.type === "cam_alley").length;

      const wardResult = {
        name, code,
        camCount: result.cameras.length,
        byCat: result.meta.byCategory || {},
        roadKm: calcRoadKm(result.roads),
        cam1, cam2, cam21, camAlley,
        durationMs: result.meta.durationMs,
        error: null,
      };

      results.push(wardResult);
      onWardDone?.(wardResult, i, results);
    } catch (err) {
      const wardResult = { name, code, error: err.message, camCount: 0, byCat: {}, roadKm: 0, cam1: 0, cam2: 0, cam21: 0, camAlley: 0 };
      results.push(wardResult);
      onWardDone?.(wardResult, i, results);
    }

    if (i < wards.length - 1 && !signal?.aborted) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}
