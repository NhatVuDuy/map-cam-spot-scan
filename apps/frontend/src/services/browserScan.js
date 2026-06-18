import { getBBox } from "../utils/geo.js";
import { classifyTagsToBlock } from "../algorithms/classifier.js";
import { detectIntersections } from "../algorithms/intersection.js";
import { planAllCameras, pickAlleyArmBearing } from "../algorithms/cameraPlacement.js";
import { withinRadius, deduplicatePoints, scorePoints } from "../algorithms/spatialFilter.js";
import { pointInPolygon, geometryBBox } from "../utils/pointInPolygon.js";
import { DEFAULT_BLOCKS, CATEGORY_TO_BLOCK, shapeToBlock } from "../config/blocks.js";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const HIGHWAY_TYPES = [
  "trunk", "primary", "secondary", "tertiary",
  "residential", "unclassified", "living_street", "service",
];

// Blocks that need road intersection detection
const INTERSECTION_BLOCKS = new Set(["B01","B02","B03","B07","B07-S"]);
// Blocks that need road ways (road segments, roundabouts, bridge/tunnel also from road data)
const ROAD_BLOCKS = new Set(["B01","B02","B03","B04","B05","B07","B07-S","B12"]);

// POI block → OSM tag filters
const BLOCK_POI_OSM = {
  B06: [
    `node["barrier"~"toll_booth|border_control"]`,
    `node["amenity"="customs"]`,
    `way["amenity"="customs"]`,
  ],
  B08: [
    `node["amenity"~"marketplace|conference_centre|events_venue|community_centre"]`,
    `way["amenity"~"marketplace|conference_centre|events_venue|community_centre"]`,
    `node["leisure"~"park|garden|stadium"]`,
    `way["leisure"~"park|garden|stadium"]`,
    `node["tourism"~"hotel|motel|hostel|guest_house|attraction"]`,
    `way["tourism"~"hotel|motel|hostel|guest_house|attraction"]`,
    `node["shop"~"supermarket|mall"]`,
    `way["shop"~"supermarket|mall"]`,
  ],
  B09: [
    `node["amenity"~"bus_station|ferry_terminal"]`,
    `way["amenity"~"bus_station|ferry_terminal"]`,
    `node["railway"~"station|halt|tram_stop"]`,
    `node["aeroway"~"terminal|aerodrome"]`,
    `way["aeroway"~"terminal|aerodrome"]`,
  ],
  B10: [
    `node["amenity"~"school|university|college|kindergarten|hospital|clinic|health_centre|townhall|police|fire_station|courthouse|embassy"]`,
    `way["amenity"~"school|university|college|kindergarten|hospital|clinic|health_centre|townhall|police|fire_station|courthouse|embassy"]`,
  ],
  B11: [
    `way["landuse"~"industrial|industrial_estate"]`,
    `relation["landuse"~"industrial|industrial_estate"]`,
  ],
};

function buildOverpassQuery(bbox, blocks) {
  const [s, w, n, e] = bbox;
  const bboxStr = `${s},${w},${n},${e}`;
  const parts = [`[out:json][timeout:30];`];

  // Road ways (needed for B01-B05, B07, B07-S, B12 and roundabout B04)
  const needsRoads = blocks.some(b => ROAD_BLOCKS.has(b));
  if (needsRoads) {
    parts.push(
      `way["highway"~"${HIGHWAY_TYPES.join("|")}"](${bboxStr})->.roads;\n.roads out geom tags;`,
      `node["highway"="traffic_signals"](${bboxStr});\nout body;`
    );
  }

  // POI queries per block
  for (const [blockId, filters] of Object.entries(BLOCK_POI_OSM)) {
    if (!blocks.includes(blockId)) continue;
    const tagged = filters.map(f => `${f}(${bboxStr});`).join("\n  ");
    parts.push(`(\n  ${tagged}\n)->.${blockId.replace("-","_")};\n.${blockId.replace("-","_")} out center tags;`);
  }

  return parts.join("\n");
}

async function fetchOverpass(query, abortSignal) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {          // 1 retry per endpoint
      if (abortSignal?.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const timeoutSignal = AbortSignal.timeout(20_000);
        const signal = abortSignal
          ? AbortSignal.any([abortSignal, timeoutSignal])
          : timeoutSignal;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
          signal,
        });
        if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); break; } // non-2xx → skip endpoint
        return await res.json();
      } catch (err) {
        if (err.name === "AbortError") throw err;
        lastErr = err;
        // brief pause before retry
        if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  throw new Error("Tất cả Overpass endpoints đều thất bại. Vui lòng thử lại.");
}

function wayCentroid(geometry) {
  if (!geometry || geometry.length === 0) return null;
  const lat = geometry.reduce((s, n) => s + n.lat, 0) / geometry.length;
  const lon = geometry.reduce((s, n) => s + n.lon, 0) / geometry.length;
  return { lat, lon };
}

function normalizeElements(elements, blocks) {
  const poiPoints = [];
  const ways      = [];
  const signalNodes = [];
  const roundabouts = [];

  for (const el of elements) {
    const tags = el.tags || {};

    // Traffic signal
    if (el.type === "node" && tags.highway === "traffic_signals") {
      signalNodes.push({ lat: el.lat, lng: el.lon });
      continue;
    }

    // Road way
    if (el.type === "way" && tags.highway) {
      if (el.geometry && el.geometry.length >= 2) {
        ways.push({ id: el.id, geometry: el.geometry, highway: tags.highway, tags });
        // B04: roundabout
        if (tags.junction === "roundabout" && blocks.includes("B04")) {
          const c = wayCentroid(el.geometry);
          if (c) roundabouts.push({
            id: `osm-roundabout-${el.id}`,
            lat: c.lat, lng: c.lon, blockId: "B04",
            category: "roundabout",
            name: tags.name || "Vòng xuyến",
            distanceM: 0, source: "osm", tags,
          });
        }
        // B12: bridge or tunnel
        if ((tags.bridge === "yes" || tags.tunnel === "yes") && blocks.includes("B12")) {
          const c = wayCentroid(el.geometry);
          if (c) poiPoints.push({
            id: `osm-roadfeat-${el.id}`,
            lat: c.lat, lng: c.lon, blockId: "B12",
            category: tags.bridge === "yes" ? "bridge" : "tunnel",
            name: tags.name || (tags.bridge === "yes" ? "Cầu vượt" : "Hầm chui"),
            distanceM: 0, source: "osm", tags,
          });
        }
      }
      continue;
    }

    // POI node or way (center)
    let lat, lng;
    if (el.type === "node") { lat = el.lat; lng = el.lon; }
    else if (el.center) { lat = el.center.lat; lng = el.center.lon; }
    else continue;

    const blockId = classifyTagsToBlock(tags);
    if (!blockId || !blocks.includes(blockId)) continue;

    poiPoints.push({
      id: `osm-${el.type}-${el.id}`,
      lat, lng, blockId,
      category: blockId, // use blockId as category for display
      name: tags.name || tags["name:vi"] || tags["name:en"] || blockId,
      distanceM: 0, source: "osm", tags,
    });
  }

  return { poiPoints: [...poiPoints, ...roundabouts], ways, signalNodes };
}

function calcDistance(p, center) {
  const dLat = (p.lat - center.lat) * 111_320;
  const dLng = (p.lng - center.lng) * 111_320 * Math.cos(center.lat * Math.PI / 180);
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
}

export async function browserScan({ area, blocks, categories, boundary = null, options = {}, signal = null }, onProgress) {
  // Backward compat: if old `categories` passed, convert to blocks
  if (!blocks && categories) {
    const mapped = new Set();
    for (const cat of categories) {
      if (cat === "intersection") {
        ["B01","B02","B03","B07","B07-S"].forEach(b => mapped.add(b));
      } else {
        const b = CATEGORY_TO_BLOCK[cat];
        if (b) mapped.add(b);
      }
    }
    blocks = [...mapped];
  }
  blocks = blocks || DEFAULT_BLOCKS;

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
  const query  = buildOverpassQuery(bbox, blocks);
  const data   = await fetchOverpass(query, signal);

  onProgress?.("Xử lý dữ liệu OSM...");
  const { poiPoints, ways, signalNodes } = normalizeElements(data.elements || [], blocks);

  // Spatial filter POIs
  let points;
  if (useBoundary) {
    onProgress?.("Lọc theo ranh giới hành chính...");
    points = poiPoints
      .filter(p => pointInPolygon([p.lng, p.lat], boundary.geometry))
      .map(p => ({ ...p, distanceM: calcDistance(p, center) }));
  } else {
    points = withinRadius(poiPoints, center, radiusM);
  }

  // Intersection detection (B01/B02/B03/B07/B07-S)
  let detectedIntersections = [];
  const needsIntersections = blocks.some(b => INTERSECTION_BLOCKS.has(b));
  if (needsIntersections && ways.length > 0) {
    onProgress?.(`Phát hiện giao lộ từ ${ways.length} đoạn đường...`);
    const allIntersections = detectIntersections(ways, center, useBoundary ? 999_999 : radiusM);
    detectedIntersections = useBoundary
      ? allIntersections.filter(p => pointInPolygon([p.lng, p.lat], boundary.geometry))
      : allIntersections;

    // Pre-compute hasSignal
    const SIGNAL_RADIUS = 60;
    for (const ix of detectedIntersections) {
      ix.hasSignal = signalNodes.some(
        sn => Math.hypot((ix.lat - sn.lat) * 111320, (ix.lng - sn.lng) * 111320 * Math.cos(ix.lat * Math.PI / 180)) <= SIGNAL_RADIUS
      );
      // Assign blockId
      ix.blockId = shapeToBlock(ix.intersectionShape, ix.hasSignal, ix.roadClass);
    }

    // Filter to only selected intersection blocks
    const filteredIntersections = detectedIntersections.filter(ix =>
      ix.blockId && blocks.includes(ix.blockId)
    );
    points = deduplicatePoints([...points, ...filteredIntersections]);
  } else {
    points = deduplicatePoints(points);
  }

  const allScoredPoints = scorePoints(points, center);
  const totalBeforeCap  = allScoredPoints.length;
  if (maxResults === Infinity) console.log("[scan] maxResults=Infinity, returning all", allScoredPoints.length, "points");
  points = allScoredPoints.slice(0, maxResults);

  // Road ways for rendering + CAM1 placement
  const rawRoads = ways.map(w => ({
    id: w.id,
    geometry: w.geometry.map(n => [n.lon, n.lat]),
    highway: w.highway,
  }));

  const cameras = []; // planAllCameras disabled — kept in cameraPlacement.js for future use

  const roads = includeRoads
    ? rawRoads.map(w => ({ id: `osm-way-${w.id}`, geometry: w.geometry, highway: w.highway }))
    : [];

  const byBlock = {};
  for (const p of points) {
    const k = p.blockId || p.category;
    byBlock[k] = (byBlock[k] || 0) + 1;
  }

  return {
    meta: {
      source: useBoundary ? "overpass-boundary" : "overpass-browser",
      boundaryName: boundary?.properties?.name,
      durationMs: Date.now() - t0,
      bbox, totalFound: points.length, totalBeforeCap,
      byCategory: byBlock,  // keep key name for backward compat
      signalCount: signalNodes.length, cameraCount: cameras.length,
    },
    points, roads, cameras,
    rawIntersections: detectedIntersections,
    rawWays: rawRoads,
    rawSignalNodes: signalNodes,
  };
}
