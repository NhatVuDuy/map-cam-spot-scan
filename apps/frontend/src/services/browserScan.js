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

const HIGHWAY_TYPES = ["primary", "secondary", "tertiary", "residential", "trunk", "unclassified"];

function buildOverpassQuery(bbox, categories, includeRoads) {
  const [s, w, n, e] = bbox;
  const bboxStr = `${s},${w},${n},${e}`;

  const poiCategories = categories.filter((c) => c !== "intersection");
  const needIntersections = categories.includes("intersection");

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

  const roadFilter =
    needIntersections || includeRoads
      ? `way["highway"~"${HIGHWAY_TYPES.join("|")}"](${bboxStr});`
      : "";

  return `
[out:json][timeout:45];
(
  ${tagFilters.join("\n  ")}
  ${roadFilter}
);
out center tags;
`.trim();
}

async function fetchOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(40_000),
      });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // try next endpoint
    }
  }
  throw new Error("Tất cả Overpass endpoints đều thất bại. Vui lòng thử lại.");
}

function normalizeElements(elements, center, radiusM, categories) {
  const poiPoints = [];
  const ways = [];

  for (const el of elements) {
    const tags = el.tags || {};

    if (el.type === "way" && tags.highway) {
      // Road way — collect for intersection detection
      if (el.geometry) {
        ways.push({ id: el.id, geometry: el.geometry, highway: tags.highway });
      }
      continue;
    }

    // Determine lat/lng
    let lat, lng;
    if (el.type === "node") {
      lat = el.lat;
      lng = el.lon;
    } else if (el.center) {
      lat = el.center.lat;
      lng = el.center.lon;
    } else {
      continue;
    }

    const category = classifyTags(tags);
    if (!category || !categories.includes(category)) continue;

    poiPoints.push({
      id: `osm-${el.type}-${el.id}`,
      lat,
      lng,
      category,
      name: tags.name || tags["name:vi"] || tags["name:en"] || `${category} (OSM)`,
      distanceM: 0,
      source: "osm",
      tags,
    });
  }

  return { poiPoints, ways };
}

export async function browserScan({ area, categories, boundary = null, options = {} }, onProgress) {
  const { lat, lng, radiusM } = area;
  const { maxResults = 500, includeRoads = true } = options;
  const center = { lat, lng };
  const t0 = Date.now();
  const useBoundary = !!(boundary?.geometry);

  onProgress?.("Tính toán vùng quét...");

  // If boundary polygon provided: use its bbox for Overpass (superset), filter with PIP after
  let bbox, overpassBbox;
  if (useBoundary) {
    const [minLng, minLat, maxLng, maxLat] = geometryBBox(boundary.geometry);
    bbox = [minLat, minLng, maxLat, maxLng]; // [s, w, n, e] for our meta
    overpassBbox = bbox;
  } else {
    bbox = getBBox(lat, lng, radiusM);
    overpassBbox = bbox;
  }

  onProgress?.("Gửi truy vấn đến Overpass API...");
  const query = buildOverpassQuery(overpassBbox, categories, includeRoads);
  const data = await fetchOverpass(query);

  onProgress?.("Xử lý dữ liệu OSM...");
  const { poiPoints, ways } = normalizeElements(data.elements || [], center, radiusM, categories);

  // Spatial filter: polygon PIP (exact) OR radius (approximate)
  let points;
  if (useBoundary) {
    onProgress?.("Lọc theo ranh giới hành chính...");
    points = poiPoints.filter((p) => pointInPolygon([p.lng, p.lat], boundary.geometry));
    // Add distanceM from center for display
    points = points.map((p) => {
      const dLat = (p.lat - center.lat) * 111320;
      const dLng = (p.lng - center.lng) * 111320 * Math.cos(center.lat * Math.PI / 180);
      return { ...p, distanceM: Math.round(Math.sqrt(dLat * dLat + dLng * dLng)) };
    });
  } else {
    points = withinRadius(poiPoints, center, radiusM);
  }

  points = deduplicatePoints(points);

  // Intersection detection
  if (categories.includes("intersection") && ways.length > 0) {
    onProgress?.("Phát hiện giao lộ...");
    const filterFn = useBoundary
      ? (p) => pointInPolygon([p.lng, p.lat], boundary.geometry)
      : (p) => p.distanceM <= radiusM;
    const intersections = detectIntersections(ways, center, useBoundary ? 999_999 : radiusM)
      .filter(filterFn);
    points = deduplicatePoints([...points, ...intersections]);
  }

  points = scorePoints(points, center).slice(0, maxResults);

  const roads = includeRoads
    ? ways.map((w) => ({
        id: `osm-way-${w.id}`,
        geometry: (w.geometry || []).map((n) => [n.lon, n.lat]),
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
