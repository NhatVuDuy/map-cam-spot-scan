import { haversine } from './geo.js';

const CAP = 300;

/**
 * Detects road intersections from a list of road ways.
 *
 * @param {Array<{id:string, geometry: Array<{lat:number, lon:number}>}>} ways
 * @param {{lat:number, lng:number}} center
 * @param {number} radiusM
 * @returns {Array<{lat,lng,category,wayCount,name,distanceM}>}
 */
export function detectIntersections(ways, center, radiusM) {
  // nodeMap: coordKey → { lat, lng, wayIds: Set<string> }
  const nodeMap = new Map();

  for (const way of ways) {
    if (!Array.isArray(way.geometry)) continue;
    for (const node of way.geometry) {
      const key = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { lat: node.lat, lng: node.lon, wayIds: new Set() });
      }
      nodeMap.get(key).wayIds.add(way.id);
    }
  }

  const results = [];
  for (const [, node] of nodeMap) {
    if (node.wayIds.size < 2) continue;
    const distanceM = haversine(center.lat, center.lng, node.lat, node.lng);
    if (distanceM > radiusM) continue;

    const wayCount = node.wayIds.size;
    let name;
    if (wayCount >= 4) name = 'Ngã tư';
    else if (wayCount === 3) name = 'Ngã ba';
    else name = 'Giao cắt';

    results.push({
      id: `intersection-${node.lat.toFixed(5)}-${node.lng.toFixed(5)}`,
      lat: node.lat,
      lng: node.lng,
      category: 'intersection',
      wayCount,
      name,
      distanceM: Math.round(distanceM),
      source: 'computed',
      tags: {},
    });
  }

  results.sort((a, b) => b.wayCount - a.wayCount);
  return results.slice(0, CAP);
}
