import { haversine } from "../utils/geo.js";
import { bearingBetween } from "../utils/bearing.js";

const ROAD_CLASS = {
  trunk: 5, trunk_link: 5,
  primary: 4, primary_link: 4,
  secondary: 3, secondary_link: 3,
  tertiary: 2, tertiary_link: 2,
  residential: 1, unclassified: 1,
  living_street: 0, service: 0,
};

/**
 * Group bearings into clusters of similar direction.
 * Returns array of mean bearing per cluster (= one per arm).
 */
function clusterBearings(bearings, threshold = 30) {
  const groups = []; // [{sum, count, mean}]
  for (const b of bearings) {
    let merged = false;
    for (const g of groups) {
      const diff = Math.abs(((b - g.mean + 540) % 360) - 180);
      if (diff < threshold) {
        g.sum += b;
        g.count++;
        g.mean = g.sum / g.count;
        merged = true;
        break;
      }
    }
    if (!merged) groups.push({ sum: b, count: 1, mean: b });
  }
  return groups.map(g => g.mean);
}

/**
 * Detect road intersections using node-sharing algorithm.
 * Returns intersections sorted by road class desc, then arm count desc.
 * Each intersection has: armCount, armBearings[], roadClass.
 */
export function detectIntersections(ways, center, radiusM) {
  // key → { lat, lng, wayIds, neighborsByWay: Map<wayId, {lat,lng}[]> }
  const nodeMap = new Map();
  const wayClass = new Map(); // wayId → road class number

  for (const way of ways) {
    const geom = way.geometry || [];
    wayClass.set(way.id, ROAD_CLASS[way.highway] ?? 0);

    for (let i = 0; i < geom.length; i++) {
      const node = geom[i];
      const key = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { lat: node.lat, lng: node.lon, wayIds: new Set(), neighborsByWay: new Map() });
      }
      const entry = nodeMap.get(key);
      entry.wayIds.add(way.id);

      // Record adjacent nodes in this way (these define the arm directions)
      if (!entry.neighborsByWay.has(way.id)) entry.neighborsByWay.set(way.id, []);
      const neighbors = entry.neighborsByWay.get(way.id);
      if (i > 0) neighbors.push({ lat: geom[i - 1].lat, lng: geom[i - 1].lon });
      if (i < geom.length - 1) neighbors.push({ lat: geom[i + 1].lat, lng: geom[i + 1].lon });
    }
  }

  const results = [];

  for (const node of nodeMap.values()) {
    if (node.wayIds.size < 2) continue;

    const dist = haversine(center.lat, center.lng, node.lat, node.lng);
    if (dist > radiusM) continue;

    // Compute arm bearings from all adjacent neighbor positions
    const rawBearings = [];
    for (const neighbors of node.neighborsByWay.values()) {
      for (const nb of neighbors) {
        rawBearings.push(bearingBetween(node.lat, node.lng, nb.lat, nb.lng));
      }
    }

    const armBearings = clusterBearings(rawBearings);
    const armCount = armBearings.length;

    // Road class: max among connected ways
    let roadClass = 0;
    for (const wid of node.wayIds) {
      const cls = wayClass.get(wid) ?? 0;
      if (cls > roadClass) roadClass = cls;
    }

    const name = armCount >= 4 ? "Ngã tư" : armCount === 3 ? "Ngã ba" : "Giao cắt";

    results.push({
      id: `intersection-${node.lat.toFixed(5)}-${node.lng.toFixed(5)}`,
      lat: node.lat,
      lng: node.lng,
      category: "intersection",
      wayCount: node.wayIds.size,
      armCount,
      armBearings,
      roadClass,
      name,
      distanceM: Math.round(dist),
      source: "algorithm",
      tags: { highway: "intersection" },
    });
  }

  return results.sort((a, b) =>
    b.roadClass - a.roadClass || b.armCount - a.armCount || a.distanceM - b.distanceM
  );
}
