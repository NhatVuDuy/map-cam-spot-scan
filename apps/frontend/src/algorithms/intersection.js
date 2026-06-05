import { haversine } from "../utils/geo.js";

export function detectIntersections(ways, center, radiusM, cap = 300) {
  const nodeMap = new Map();

  for (const way of ways) {
    const nodes = way.geometry || [];
    for (const node of nodes) {
      const key = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
      if (!nodeMap.has(key)) nodeMap.set(key, { lat: node.lat, lng: node.lon, wayIds: new Set() });
      nodeMap.get(key).wayIds.add(way.id);
    }
  }

  const results = [];
  for (const [, node] of nodeMap) {
    if (node.wayIds.size < 2) continue;
    const dist = haversine(center.lat, center.lng, node.lat, node.lng);
    if (dist > radiusM) continue;
    const wc = node.wayIds.size;
    const name = wc >= 4 ? "Ngã tư lớn" : wc === 3 ? "Ngã ba" : "Giao cắt";
    results.push({
      id: `int-${node.lat.toFixed(5)}-${node.lng.toFixed(5)}`,
      lat: node.lat,
      lng: node.lng,
      category: "intersection",
      name,
      distanceM: Math.round(dist),
      wayCount: wc,
      source: "osm",
      tags: {},
    });
    if (results.length >= cap) break;
  }

  return results.sort((a, b) => b.wayCount - a.wayCount);
}
