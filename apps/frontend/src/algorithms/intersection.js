import { haversine } from "../utils/geo.js";

const MAX_RESULTS = 500;

/**
 * Detect road intersections using node-sharing algorithm.
 * Requires ways with full geometry (from Overpass "out geom tags").
 *
 * @param {Array<{id: number, geometry: Array<{lat:number,lon:number}>, highway: string}>} ways
 * @param {{ lat: number, lng: number }} center
 * @param {number} radiusM
 */
export function detectIntersections(ways, center, radiusM) {
  const nodeMap = new Map();

  for (const way of ways) {
    const geom = way.geometry || [];
    for (const node of geom) {
      const key = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { lat: node.lat, lng: node.lon, wayIds: new Set() });
      }
      nodeMap.get(key).wayIds.add(way.id);
    }
  }

  const results = [];

  for (const node of nodeMap.values()) {
    if (node.wayIds.size < 2) continue;

    const dist = haversine(center.lat, center.lng, node.lat, node.lng);
    if (dist > radiusM) continue;

    const wc = node.wayIds.size;
    const name = wc >= 4 ? "Ngã tư lớn" : wc === 3 ? "Ngã ba" : "Giao cắt";

    results.push({
      id: `intersection-${node.lat.toFixed(5)}-${node.lng.toFixed(5)}`,
      lat: node.lat,
      lng: node.lng,
      category: "intersection",
      wayCount: wc,
      name,
      distanceM: Math.round(dist),
      source: "algorithm",
      tags: { highway: "intersection" },
    });

    if (results.length >= MAX_RESULTS) break;
  }

  return results;
}
