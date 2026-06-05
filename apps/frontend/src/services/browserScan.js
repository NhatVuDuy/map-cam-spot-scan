import { getBBox } from "../utils/geo.js";
import { classifyTags } from "../algorithms/classifier.js";
import { detectIntersections } from "../algorithms/intersection.js";
import { withinRadius, deduplicatePoints, scorePoints } from "../algorithms/spatialFilter.js";
import { pointInPolygon, geometryBBox } from "../utils/pointInPolygon.js";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const CATEGORY_OSM = {
  school:     { amenity: ["school", "university", "college", "kindergarten"] },
  hospital:   { amenity: ["hospital", "clinic", "health_centre"] },
  park:       { leisure: ["park", "garden"] },
  market:     { amenity: ["marketplace"], shop: ["supermarket", "mall"] },
  hotel:      { tourism: ["hotel", "motel", "hostel", "guest_house"] },
  conference: { amenity: ["conference_centre", "events_venue", "community_centre"] },
  government: { amenity: ["townhall", "police", "fire_station", "courthouse", "embassy"] },
};

// Include service/living_street for alley entrances (đầu hẻm)
const HIGHWAY_TYPES = [
  "trunk", "primary", "secondary", "tertiary",
  "residential", "unclassified", "living_street", "service",
];

/**
 * Build Overpass QL query.
 * KEY FIX: POIs use "out center tags" (only need centroid),
 *          Roads use "out geom tags" (need ALL node coordinates for intersection detection).
 * Without "out geom", road ways only have a center point → no node-sharing possible.
 */
function buildOverpassQuery(bbox, categories, includeRoads) {
  const [s, w, n, e] = bbox;
  const bboxStr = `${s},${w},${n},${e}`;
  const poiCategories = categories.filter((c) => c !== "intersection");
  const needRoads = categories.includes("intersection") || includeRoads;

  const tagFilters = [];
  for (const cat of poiCategories) {
    const mapping = CATEGORY_OSM[cat];
    if (!mapping) continue;
    for (const [key, vals] of Object.entries(mapping)) {
      const regex = vals.join("|");
      tagFilters.push(`node["${key}"~"${regex}"](${bboxStr});`);
      tagFilters.push(`way["${key}"~"${regex}"](${bboxStr});`);
    }
  }

  const parts = [`[out:json][timeout:50];`];

  if (tagFilters.length > 0) {
    parts.push(`(\n  ${tagFilters.join("\n  ")}\n)->.pois;\n.pois out center tags;`);
  }

  if (needRoads) {
    // "out geom tags" returns full geometry (every node lat/lon) for each way
    // This is essential for intersection detection
    parts.push(`way["highway"~"${HIGHWAY_TYPES.join("|")}"](${bboxStr})->.roads;\n.roads out geom tags;`);
  }

  return parts.join("\n");
}

async function fetchOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try next endpoint
    }
  }
  throw new Error("Tất cả Overpass endpoints đều thất bại. Vui lòng thử lại.");
}

function normalizeElements(elements, categories) {
  const poiPoints = [];
  const ways = [];

  for (const el of elements) {
    const tags = el.tags || {};

    // Road way: has highway tag + geometry (from "out geom tags")
    if (el.type === "way" && tags.highway) {
      if (el.geometry && el.geometry.length >= 2) {
        ways.push({ id: el.id, geometry: el.geometry, highway: tags.highway });
      }
      continue;
    }

    // POI node or way (with center from "out center tags")
    let lat, lng;
    if (el.type === "node") {
      lat = el.lat; lng = el.lon;
    } else if (el.center) {
      lat = el.center.lat; lng = el.center.lon;
    } else {
      continue;
    }

    const category = classifyTags(tags);
    if (!category || !categories.includes(category)) continue;

    poiPoints.push({
      id: `osm-${el.type}-${el.id}`,
      lat, lng, category,
      name: tags.name || tags["name:vi"] || tags["name:en"] || `${category} (OSM)`,
      distanceM: 0,
      source: "osm",
      tags,
    });
  }

  return { poiPoints, ways };
}

function calcDistance(p, center) {
  const dLat = (p.lat - center.lat) * 111_320;
  const dLng = (p.lng - center.lng) * 111_320 * Math.cos(center.lat * Math.PI / 180);
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

export async function browserScan({ area, categories, boundary = null, options = {} }, onProgress) {
  const { lat, lng, radiusM } = area;
  const { maxResults = 500, includeRoads = true } = options;
  const center = { lat, lng };
  const t0 = Date.now();
  const useBoundary = !!(boundary?.geometry);

  onProgress?.("Tính toán vùng quét...");

  let bbox;
  if (useBoundary) {
    const [minLng, minLat, maxLng, maxLat] = geometryBBox(boundary.geometry);
    bbox = [minLat, minLng, maxLat, maxLng];
  } else {
    bbox = getBBox(lat, lng, radiusM);
  }

  onProgress?.("Gửi truy vấn đến Overpass API...");
  const query = buildOverpassQuery(bbox, categories, includeRoads);
  const data = await fetchOverpass(query);

  onProgress?.("Xử lý dữ liệu OSM...");
  const { poiPoints, ways } = normalizeElements(data.elements || [], categories);

  // Spatial filter
  let points;
  if (useBoundary) {
    onProgress?.("Lọc theo ranh giới hành chính...");
    points = poiPoints
      .filter((p) => pointInPolygon([p.lng, p.lat], boundary.geometry))
      .map((p) => ({ ...p, distanceM: calcDistance(p, center) }));
  } else {
    points = withinRadius(poiPoints, center, radiusM);
  }
  points = deduplicatePoints(points);

  // Intersection detection (now works: ways have geometry from "out geom tags")
  if (categories.includes("intersection") && ways.length > 0) {
    onProgress?.(`Phát hiện giao lộ từ ${ways.length} đoạn đường...`);
    const allIntersections = detectIntersections(ways, center, useBoundary ? 999_999 : radiusM);
    const filtered = useBoundary
      ? allIntersections.filter((p) => pointInPolygon([p.lng, p.lat], boundary.geometry))
      : allIntersections;
    points = deduplicatePoints([...points, ...filtered]);
  }

  points = scorePoints(points, center).slice(0, maxResults);

  const roads = includeRoads
    ? ways.map((w) => ({
        id: `osm-way-${w.id}`,
        geometry: w.geometry.map((n) => [n.lon, n.lat]),
        highway: w.highway,
      }))
    : [];

  const byCategory = {};
  for (const p of points) byCategory[p.category] = (byCategory[p.category] || 0) + 1;

  return {
    meta: {
      source: useBoundary ? "overpass-boundary" : "overpass-browser",
      boundaryName: boundary?.properties?.name,
      durationMs: Date.now() - t0,
      bbox,
      totalFound: points.length,
      byCategory,
    },
    points,
    roads,
  };
}
