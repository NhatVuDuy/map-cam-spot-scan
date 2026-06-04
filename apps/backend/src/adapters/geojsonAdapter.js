import { BaseAdapter } from "./baseAdapter.js";
import { classify } from "../algorithms/classifier.js";

/**
 * Compute centroid of a polygon ring.
 * @param {number[][]} coords - [[lng, lat], ...]
 */
function centroid(coords) {
  let lngSum = 0;
  let latSum = 0;
  const n = coords.length;
  for (const [lng, lat] of coords) {
    lngSum += lng;
    latSum += lat;
  }
  return { lat: latSum / n, lng: lngSum / n };
}

function getCenter(geometry) {
  const { type, coordinates } = geometry;
  switch (type) {
    case "Point":
      return { lat: coordinates[1], lng: coordinates[0] };
    case "Polygon": {
      const c = centroid(coordinates[0]);
      return c;
    }
    case "MultiPolygon": {
      // Use first polygon's outer ring
      const c = centroid(coordinates[0][0]);
      return c;
    }
    case "LineString": {
      // Midpoint
      const mid = Math.floor(coordinates.length / 2);
      return { lat: coordinates[mid][1], lng: coordinates[mid][0] };
    }
    default:
      return null;
  }
}

function inBBox(lat, lng, bbox) {
  // bbox: [south, west, north, east]
  return lat >= bbox[0] && lat <= bbox[2] && lng >= bbox[1] && lng <= bbox[3];
}

export class GeoJSONAdapter extends BaseAdapter {
  constructor(cfg = {}) {
    super();
    this.geojsonData = cfg.geojsonData || null;
  }

  /**
   * Synchronous in-memory processing (still wrapped in async to match interface).
   */
  async fetchPOI(bbox, categories, config = {}) {
    const data = config.geojsonData || this.geojsonData;
    if (!data) {
      console.warn("[geojson] No geojsonData provided — returning empty");
      return [];
    }

    const features = data.features || [];
    const results = [];

    for (const feature of features) {
      const geom = feature.geometry;
      if (!geom) continue;

      // LineStrings are roads, not POIs
      if (geom.type === "LineString" || geom.type === "MultiLineString") continue;

      const center = getCenter(geom);
      if (!center) continue;
      if (!inBBox(center.lat, center.lng, bbox)) continue;

      const props = feature.properties || {};
      const category = classify(props);
      if (!category) continue;
      if (!categories.includes(category)) continue;

      results.push({
        id: `geojson-${feature.id || Math.random().toString(36).slice(2)}`,
        lat: center.lat,
        lng: center.lng,
        tags: props,
        source: "geojson",
        category,
        name: props.name || props.ten || "",
      });
    }

    return results;
  }

  async fetchRoads(bbox, config = {}) {
    const data = config.geojsonData || this.geojsonData;
    if (!data) return [];

    const features = data.features || [];
    const roads = [];

    for (const feature of features) {
      const geom = feature.geometry;
      if (!geom) continue;
      if (geom.type !== "LineString") continue;

      const coords = geom.coordinates; // [[lng, lat], ...]
      if (!coords || coords.length < 2) continue;

      // Check if any point is in bbox
      const inBox = coords.some(([lng, lat]) => inBBox(lat, lng, bbox));
      if (!inBox) continue;

      roads.push({
        id: `geojson-road-${feature.id || Math.random().toString(36).slice(2)}`,
        geometry: coords,
        highway: feature.properties?.highway || "unclassified",
        tags: feature.properties || {},
      });
    }

    return roads;
  }
}
