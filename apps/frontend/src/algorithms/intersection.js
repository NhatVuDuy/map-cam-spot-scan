import { haversine } from "../utils/geo.js";

/**
 * Detect road intersections using node-sharing algorithm.
 * Requires ways with full geometry (from Overpass "out geom tags").
 * Returns ALL intersections sorted by wayCount desc — caller applies the cap.
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
  }

  // Sort by importance before returning so callers can safely slice
  return results.sort((a, b) => b.wayCount - a.wayCount || a.distanceM - b.distanceM);
}
