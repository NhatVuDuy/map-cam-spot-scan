import { browserScan } from "./browserScan.js";
import { writeWardGeometry } from "../utils/wardGeometryDB.js";
import { DEFAULT_BLOCKS, BLOCKS, CAM_TYPES } from "../config/blocks.js";
const DELAY_MS = 3000;
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
  const byBlock = {};
  const byCam = {};   // ITS1, ITS2, P2, P1, B3, B2, B1
  let poiCount = 0, completed = 0, errors = 0;
  for (const w of wards) {
    if (w.error) { errors++; continue; }
    completed++;
    for (const [k, v] of Object.entries(w.byCat || {})) byBlock[k] = (byBlock[k] || 0) + v;
  }
  // Estimate camera counts from block × cam ratios
  let camCount = 0;
  for (const [blockId, cnt] of Object.entries(byBlock)) {
    poiCount += cnt;
    const block = BLOCKS[blockId];
    if (!block) continue;
    for (const camType of CAM_TYPES) {
      const n = (block.cams[camType] || 0) * cnt;
      byCam[camType] = (byCam[camType] || 0) + n;
      camCount += n;
    }
  }
  return { camCount, poiCount, byCam, byBlock, byCat: byBlock, completed, errors };
}

/* ── scan a single ward ─────────────────────────────────────────── */
async function scanWard(ward) {
  const { name, code } = ward.properties;
  const center = wardCenter(ward.geometry);
  const result = await browserScan(
    { area: center, blocks: DEFAULT_BLOCKS, boundary: ward, options: {} },
    () => {}
  );
  // Persist full geometry to IndexedDB (async, non-blocking for count return)
  writeWardGeometry(code, {
    points:            result.points            || [],
    cameras:           result.cameras           || [],
    roads:             result.roads             || [],
    rawIntersections:  result.rawIntersections  || [],
    rawWays:           result.rawWays           || [],
    rawSignalNodes:    result.rawSignalNodes     || [],
  }).catch(() => {}); // silently ignore IDB errors — counts are always returned

  return {
    name, code,
    byCat: result.meta.byCategory || {},
    durationMs: result.meta.durationMs,
    error: null,
  };
}

/* ── load ward features from geojson ───────────────────────────── */
export async function loadWardFeatures({ geojsonPath, geojsonData } = {}) {
  const geojson = geojsonData
    ? geojsonData
    : await fetch(geojsonPath || "/data/hcm-boundaries.geojson").then(r => r.json());
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
  const wards = await loadWardFeatures({ geojsonPath: "/data/hcm-boundaries.geojson" });

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
        byCat: {},
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

/* ── generic batch scan (city-agnostic, uses IDB geometry keys) ─── */
/**
 * Like batchScanCity but works with any city GeoJSON and stores
 * geometry under scanId-scoped IDB keys.
 *
 * @param {Object} opts
 * @param {string}   opts.scanId         - unique scan ID (used as geometry key prefix)
 * @param {string}   opts.cityId
 * @param {string}   [opts.geojsonPath]  - fetch URL for GeoJSON
 * @param {Object}   [opts.geojsonData]  - pre-loaded GeoJSON object
 * @param {string[]} [opts.onlyCodes]
 * @param {Object[]} [opts.existingResults]
 * @param {Function} opts.onProgress
 * @param {Function} opts.onWardDone
 * @param {Function} opts.onWriteGeometry  - (scanId, wardCode, data) => Promise
 * @param {AbortSignal} opts.signal
 */
export async function batchScanCityGeneric({
  scanId, cityId, geojsonPath, geojsonData,
  onlyCodes, existingResults = [],
  onProgress, onWardDone, onWriteGeometry,
  blocks: configBlocks,
  maxResults: configMaxResults,
  signal,
} = {}) {
  const wards = await loadWardFeatures({ geojsonPath, geojsonData });
  const resultMap = {};
  for (const r of existingResults) resultMap[r.code] = r;

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
      current: i + 1, total,
      wardName: name,
      pct: Math.round((i / total) * 100),
      overallDone: Object.keys(resultMap).filter(k => !resultMap[k].error).length,
      overallTotal: wards.length,
    });

    try {
      const center = wardCenter(ward.geometry);
      const result = await browserScan(
        {
          area: center,
          blocks: configBlocks || DEFAULT_BLOCKS,
          boundary: ward,
          options: { maxResults: configMaxResults ?? Infinity },
          signal,
        },
        () => {}
      );

      // Write geometry under scanId-scoped key — awaited so data is available immediately
      if (onWriteGeometry) {
        await onWriteGeometry(scanId, code, {
          points:           result.points           || [],
          cameras:          result.cameras          || [],
          roads:            result.roads            || [],
          rawIntersections: result.rawIntersections || [],
          rawWays:          result.rawWays          || [],
          rawSignalNodes:   result.rawSignalNodes   || [],
        }).catch(err => console.warn(`[cityDB] geometry write failed for ${code}:`, err));
      }

      resultMap[code] = {
        name, code,
        byCat:      result.meta.byCategory || {},
        durationMs: result.meta.durationMs,
        error: null,
      };
    } catch (err) {
      resultMap[code] = {
        name, code, error: err.message,
        byCat: {},
      };
    }

    const allOrdered = wards.map(w => resultMap[w.properties.code]).filter(Boolean);
    await onWardDone?.(resultMap[code], overallIdx, allOrdered);

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

export function exportScanFileJSON(scanFile) {
  const payload = {
    meta: { exportedAt: new Date().toISOString(), scanId: scanFile.id, cityId: scanFile.cityId, name: scanFile.name, createdAt: scanFile.createdAt, totalWards: scanFile.wardCounts?.length || 0, completed: (scanFile.wardCounts || []).filter(w => !w.error).length },
    aggregate: aggregateWards(scanFile.wardCounts || []),
    wards: scanFile.wardCounts || [],
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${scanFile.cityId}-scan-${scanFile.id}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
}

export function exportScanFileCSV(scanFile) {
  exportCSV(scanFile.wardCounts || []);
}

export function exportCSV(wards) {
  const BLOCK_IDS = ["B01","B02","B03","B04","B05","B06","B07","B07-S","B08","B09","B10","B11","B12","B13"];
  const header = ["Phường/xã", "Mã", ...BLOCK_IDS, "Ghi chú"];
  const rows = wards.map(w => [
    w.name, w.code,
    ...BLOCK_IDS.map(b => w.byCat?.[b] || 0),
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
