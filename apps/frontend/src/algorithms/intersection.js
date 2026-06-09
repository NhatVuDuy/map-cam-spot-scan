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

const MAJOR_CLASS = 2; // tertiary and above
const ALLEY_CLASS  = 0; // service / living_street

/**
 * Cluster {bearing, roadClass} pairs into distinct arm directions.
 * Uses 35° threshold — slightly wider than before to handle curved approach roads.
 * Each cluster takes the MAX roadClass of its members.
 */
function clusterArms(rawArms, threshold = 35) {
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
 * Classify the intersection shape from its arm road-class distribution.
 *
 *   "quad"  — 4+ arms, ALL arms major (class >= 2)
 *   "tri"   — 3 arms, ALL arms major
 *   "alley" — at least one major arm (class >= 2) + at least one minor arm (class <= 1)
 *             This covers both service/living_street (class 0) AND residential/unclassified
 *             (class 1) alleys, which is the common OSM tagging in Vietnam.
 *   "minor" — everything else (no major road involved, or all-minor crossings)
 */
function classifyShape(armRoadClasses, armCount) {
  const majorCount = armRoadClasses.filter(c => c >= MAJOR_CLASS).length;
  const minorCount = armRoadClasses.filter(c => c < MAJOR_CLASS).length;  // class 0 or 1
  const allMajor   = majorCount === armCount;

  if (allMajor && armCount >= 4) return "quad";
  if (allMajor && armCount === 3) return "tri";
  // Major road meeting a smaller road (any class < MAJOR_CLASS) → alley entrance
  if (majorCount >= 1 && minorCount >= 1) return "alley";
  return "minor";
}

/**
 * Detect road intersections using node-sharing algorithm.
 *
 * Each intersection result includes:
 *   armBearings[]     — bearing (degrees) of each distinct arm
 *   armRoadClasses[]  — road class of each arm (parallel array)
 *   intersectionShape — "quad" | "tri" | "alley" | "minor"
 *   alleyBearing      — bearing of the first alley arm (used to orient the alley rectangle icon)
 *
 * Sorted by road class desc, arm count desc.
 */
export function detectIntersections(ways, center, radiusM) {
  const nodeMap  = new Map();
  const wayClass = new Map();

  for (const way of ways) {
    const geom = way.geometry || [];
    wayClass.set(way.id, ROAD_CLASS[way.highway] ?? 0);

    for (let i = 0; i < geom.length; i++) {
      const node = geom[i];
      const key  = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { lat: node.lat, lng: node.lon, wayIds: new Set(), neighborsByWay: new Map() });
      }
      const entry = nodeMap.get(key);
      entry.wayIds.add(way.id);

      if (!entry.neighborsByWay.has(way.id)) entry.neighborsByWay.set(way.id, []);
      const neighbors = entry.neighborsByWay.get(way.id);
      if (i > 0)                  neighbors.push({ lat: geom[i - 1].lat, lng: geom[i - 1].lon });
      if (i < geom.length - 1)   neighbors.push({ lat: geom[i + 1].lat, lng: geom[i + 1].lon });
    }
  }

  const results = [];

  for (const node of nodeMap.values()) {
    if (node.wayIds.size < 2) continue;

    const dist = haversine(center.lat, center.lng, node.lat, node.lng);
    if (dist > radiusM) continue;

    // Build raw arms — one {bearing, roadClass} per neighbor direction
    const rawArms = [];
    for (const [wayId, neighbors] of node.neighborsByWay) {
      const cls = wayClass.get(wayId) ?? 0;
      for (const nb of neighbors) {
        rawArms.push({
          bearing: bearingBetween(node.lat, node.lng, nb.lat, nb.lng),
          roadClass: cls,
        });
      }
    }

    const arms           = clusterArms(rawArms);
    const armCount       = arms.length;
    const armBearings    = arms.map(a => a.bearing);
    const armRoadClasses = arms.map(a => a.roadClass);

    // Overall road class = max among connected ways
    let roadClass = 0;
    for (const wid of node.wayIds) {
      const cls = wayClass.get(wid) ?? 0;
      if (cls > roadClass) roadClass = cls;
    }

    const intersectionShape = classifyShape(armRoadClasses, armCount);

    // Bearing of the first alley arm (for orienting the alley rectangle icon)
    const alleyIdx    = armRoadClasses.findIndex(c => c === ALLEY_CLASS);
    const alleyBearing = alleyIdx >= 0 ? armBearings[alleyIdx] : 0;

    const shapeLabel = {
      quad: "Ngã tư",
      tri:  "Ngã ba",
      alley: "Đầu hẻm",
      minor: "Giao cắt",
    };

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
      intersectionShape,
      alleyBearing,
      // hasSignal is populated later in browserScan.js once signalNodes are known
      hasSignal: false,
      name: shapeLabel[intersectionShape] || "Giao cắt",
      distanceM: Math.round(dist),
      source: "algorithm",
      tags: { highway: "intersection" },
    });
  }

  return results.sort((a, b) =>
    b.roadClass - a.roadClass || b.armCount - a.armCount || a.distanceM - b.distanceM
  );
}
