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
 * Cluster {bearing, roadClass} pairs into distinct arm directions.
 * Each cluster takes the max roadClass of its members.
 * Returns [{bearing, roadClass}]
 */
function clusterArms(rawArms, threshold = 30) {
  const groups = [];
  for (const { bearing, roadClass } of rawArms) {
    let merged = false;
    for (const g of groups) {
      const diff = Math.abs(((bearing - g.sumB / g.n + 540) % 360) - 180);
      if (diff < threshold) {
        g.sumB += bearing;
        g.n++;
        g.roadClass = Math.max(g.roadClass, roadClass);
        merged = true;
        break;
      }
    }
    if (!merged) groups.push({ sumB: bearing, n: 1, roadClass });
  }
  return groups.map(g => ({ bearing: g.sumB / g.n, roadClass: g.roadClass }));
}

/**
 * Detect road intersections using node-sharing algorithm.
 * Each intersection includes armBearings[] and armRoadClasses[] (parallel arrays).
 * Sorted by road class desc, arm count desc.
 */
export function detectIntersections(ways, center, radiusM) {
  const nodeMap = new Map();
  const wayClass = new Map();

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

    // Build raw arms with per-way road class
    const rawArms = [];
    for (const [wayId, neighbors] of node.neighborsByWay) {
      const cls = wayClass.get(wayId) ?? 0;
      for (const nb of neighbors) {
        rawArms.push({ bearing: bearingBetween(node.lat, node.lng, nb.lat, nb.lng), roadClass: cls });
      }
    }

    const arms = clusterArms(rawArms);
    const armCount = arms.length;
    const armBearings = arms.map(a => a.bearing);
    const armRoadClasses = arms.map(a => a.roadClass);

    // Overall road class = max among connected ways
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
      armRoadClasses,
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
