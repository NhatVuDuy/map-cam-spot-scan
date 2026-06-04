/**
 * Road intersection detection — pure function, no I/O.
 *
 * Uses node-sharing algorithm:
 * A point is an intersection if it appears in the geometry of >= 2 distinct road ways.
 */
import { haversine } from "./geo.js";

const MAX_RESULTS = 300;

/**
 * Detect intersections from an array of road ways.
 *
 * @param {Array<{id: string, geometry: [number, number][]}>} ways
 *   Each way has geometry as [[lng, lat], ...] pairs.
 * @param {{ lat: number, lng: number }} center
 * @param {number} radiusM
 * @returns {Array} IntersectionPoint[]
 */
export function detectIntersections(ways, center, radiusM) {
  // Build nodeMap: coordKey → { lat, lng, wayIds: Set }
  const nodeMap = new Map();

  for (const way of ways) {
    const wayId = way.id;
    const geometry = way.geometry || [];

    for (const coord of geometry) {
      // coord is [lng, lat]
      const lng = coord[0];
      const lat = coord[1];
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;

      if (!nodeMap.has(key)) {
        nodeMap.set(key, { lat, lng, wayIds: new Set() });
      }
      nodeMap.get(key).wayIds.add(wayId);
    }
  }

  const intersections = [];

  for (const node of nodeMap.values()) {
    if (node.wayIds.size < 2) continue;

    const dist = haversine(center.lat, center.lng, node.lat, node.lng);
    if (dist > radiusM) continue;

    const wayCount = node.wayIds.size;
    let name;
    if (wayCount >= 4) name = "Ngã tư";
    else if (wayCount >= 3) name = "Ngã ba";
    else name = "Giao cắt";

    intersections.push({
      id: `intersection-${node.lat.toFixed(5)}-${node.lng.toFixed(5)}`,
      lat: node.lat,
      lng: node.lng,
      category: "intersection",
      wayCount,
      name,
      distanceM: Math.round(dist),
      source: "algorithm",
      tags: { highway: "intersection" },
    });

    if (intersections.length >= MAX_RESULTS) break;
  }

  return intersections;
}
