import { browserScan } from "./browserScan.js";

const CATEGORIES = ["intersection", "school", "hospital", "park", "market", "hotel", "conference", "government"];
const DELAY_MS = 1600;
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

/* ── scan a single ward ─────────────────────────────────────────── */
async function scanWard(ward) {
  const { name, code } = ward.properties;
  const center = wardCenter(ward.geometry);
  const result = await browserScan(
    { area: center, categories: CATEGORIES, boundary: ward, options: { maxResults: 800 } },
    () => {}
  );
  return {
    name, code,
    camCount: result.cameras.length,
    byCat: result.meta.byCategory || {},
    roadKm: calcRoadKm(result.roads),
    cam1:     result.cameras.filter(c => c.type === "cam1").length,
    cam2:     result.cameras.filter(c => ["cam2", "cam22"].includes(c.type)).length,
    cam21:    result.cameras.filter(c => ["cam21", "cam23"].includes(c.type)).length,
    camAlley: result.cameras.filter(c => c.type === "cam_alley").length,
    durationMs: result.meta.durationMs,
    error: null,
  };
}

/* ── load ward features from geojson ───────────────────────────── */
export async function loadWardFeatures() {
  const resp = await fetch("/data/hcm-boundaries.geojson");
  const geojson = await resp.json();
  return geojson.features.filter(f => f.properties.type === "ward");
}

/* ── main scan runner ───────────────────────────────────────────── */
/**
 * @param {Object} opts
 * @param {string[]} [opts.onlyCodes]  - if set, scan only these ward codes (for retry)
 * @param {Object[]} [opts.existingResults] - existing results map (to merge into)
 * @param {Function} opts.onProgress
 * @param {Function} opts.onWardDone  (wardResult, index, allResults)
 * @param {AbortSignal} opts.signal
 */
export async function batchScanCity({ onlyCodes, existingResults = [], onProgress, onWardDone, signal } = {}) {
  const wards = await loadWardFeatures();

  // Build a mutable result map: code → result
  const resultMap = {};
  for (const r of existingResults) resultMap[r.code] = r;

  // Decide which wards to scan
  const toScan = onlyCodes
    ? wards.filter(w => onlyCodes.includes(w.properties.code))
    : wards.filter(w => !resultMap[w.properties.code] || resultMap[w.properties.code].error);

  const total = toScan.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) break;

    const ward = toScan[i];
    const { name, code } = ward.properties;
    const overallIdx = wards.findIndex(w => w.properties.code === code);

    onProgress?.({
      current: i + 1,
      total,
      wardName: name,
      pct: Math.round((i / total) * 100),
      overallDone: Object.keys(resultMap).filter(k => !resultMap[k].error).length,
      overallTotal: wards.length,
    });

    try {
      const wardResult = await scanWard(ward);
      resultMap[code] = wardResult;
    } catch (err) {
      resultMap[code] = {
        name, code, error: err.message,
        camCount: 0, byCat: {}, roadKm: 0, cam1: 0, cam2: 0, cam21: 0, camAlley: 0,
      };
    }

    // Preserve original ward order
    const allOrdered = wards
      .map(w => resultMap[w.properties.code])
      .filter(Boolean);

    onWardDone?.(resultMap[code], overallIdx, allOrdered);

    if (i < total - 1 && !signal?.aborted) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return wards.map(w => resultMap[w.properties.code]).filter(Boolean);
}

/* ── export utilities ───────────────────────────────────────────── */
export function exportJSON(wards) {
  const cache = loadCityScanCache();
  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      city: "TP.HCM",
      totalWards: wards.length,
      completed: wards.filter(w => !w.error).length,
      errors: wards.filter(w => w.error).length,
    },
    aggregate: aggregateWards(wards),
    wards,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hcm-camera-scan-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(wards) {
  const header = ["Phường/xã", "Mã", "Camera", "CAM1", "CAM2", "CAM2.1", "CAM Hẻm", "Đường (km)",
    "Giao lộ", "Trường học", "Bệnh viện", "Chợ/TTTM", "Công viên", "Khách sạn", "Hội nghị", "Cơ quan", "Ghi chú"];
  const rows = wards.map(w => [
    w.name, w.code,
    w.camCount || 0, w.cam1 || 0, w.cam2 || 0, w.cam21 || 0, w.camAlley || 0,
    (w.roadKm || 0).toFixed(2),
    w.byCat?.intersection || 0, w.byCat?.school || 0, w.byCat?.hospital || 0,
    w.byCat?.market || 0, w.byCat?.park || 0, w.byCat?.hotel || 0,
    w.byCat?.conference || 0, w.byCat?.government || 0,
    w.error ? `Lỗi: ${w.error}` : "",
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hcm-camera-scan-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
