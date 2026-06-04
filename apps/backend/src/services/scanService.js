import { adapterFactory } from "../adapters/index.js";
import { getBBox } from "../algorithms/geo.js";
import { detectIntersections } from "../algorithms/intersection.js";
import { classifyOSM } from "../algorithms/classifier.js";
import { withinRadius, deduplicatePoints, scorePoints } from "../algorithms/spatialFilter.js";
import { buildCacheKey, cacheGet, cacheSet } from "./cacheService.js";
import { config } from "../config/index.js";

/**
 * Orchestrate scan: adapter → classify → filter → intersections → score → cache.
 *
 * @param {object} params
 * @param {object} params.source - { id, config }
 * @param {object} params.area - { lat, lng, radiusM }
 * @param {string[]} params.categories
 * @param {object} params.options - { maxResults, includeRoads }
 * @returns {Promise<object>} { meta, points, roads }
 */
export async function runScan(params) {
  const { source, area, categories, options = {} } = params;
  const { lat, lng, radiusM } = area;
  const { maxResults = 500, includeRoads = true } = options;

  const startMs = Date.now();

  // Cache check
  const cacheKey = buildCacheKey(source.id, lat, lng, radiusM, categories);
  const cached = cacheGet(cacheKey);
  if (cached) {
    return { ...cached, meta: { ...cached.meta, cached: true } };
  }

  const bbox = getBBox(lat, lng, radiusM);
  const adapter = adapterFactory(source.id, source.config || {});
  const center = { lat, lng };

  // Fetch POIs via adapter (scanService only calls adapter methods)
  let rawPOIs = [];
  try {
    rawPOIs = await adapter.fetchPOI(bbox, categories, source.config || {});
  } catch (err) {
    console.error(`[scanService] fetchPOI error (${source.id}):`, err.message);
    rawPOIs = [];
  }

  // Classify raw features
  const classifiedPOIs = rawPOIs.map((f) => {
    const category = f.category || classifyOSM(f.tags || {});
    return { ...f, category };
  }).filter((f) => f.category && categories.includes(f.category));

  // Spatial filter
  const filtered = withinRadius(classifiedPOIs, center, radiusM);

  // Fetch roads + detect intersections
  let roads = [];
  let intersections = [];

  if (includeRoads || categories.includes("intersection")) {
    try {
      roads = await adapter.fetchRoads(bbox, source.config || {});
    } catch (err) {
      console.error(`[scanService] fetchRoads error (${source.id}):`, err.message);
      roads = [];
    }

    if (categories.includes("intersection")) {
      // PostGIS adapter returns pre-computed intersections from fetchRoads
      if (source.id === "postgis") {
        intersections = roads; // fetchRoads returns intersection points for postgis
        roads = []; // no road geometries for postgis
      } else {
        intersections = detectIntersections(roads, center, radiusM);
      }
    }
  }

  // Merge intersections into points
  const allPoints = [...filtered, ...intersections];

  // Deduplicate
  const deduped = deduplicatePoints(allPoints, 20);

  // Score and sort
  const scored = scorePoints(deduped);

  // Limit results
  const limited = scored.slice(0, maxResults);

  // Build response shape (matches arch doc section 6)
  const byCategory = {};
  for (const p of limited) {
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  }

  const result = {
    meta: {
      source: source.id,
      scanId: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      durationMs: Date.now() - startMs,
      bbox,
      totalFound: limited.length,
      byCategory,
      cached: false,
    },
    points: limited.map((p) => ({
      id: p.id,
      lat: p.lat,
      lng: p.lng,
      category: p.category,
      name: p.name || "",
      distanceM: p.distanceM || 0,
      source: p.source || source.id,
      tags: p.tags || {},
      score: p.score,
      wayCount: p.wayCount,
    })),
    roads: includeRoads && source.id !== "postgis"
      ? roads.map((r) => ({
          id: r.id,
          geometry: r.geometry,
          highway: r.highway || "",
        }))
      : [],
  };

  // Cache result
  cacheSet(cacheKey, result, config.cache.ttlSeconds);

  return result;
}
