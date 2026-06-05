import { haversine } from "../utils/geo.js";

export function withinRadius(points, center, radiusM) {
  return points
    .map((p) => ({ ...p, distanceM: Math.round(haversine(center.lat, center.lng, p.lat, p.lng)) }))
    .filter((p) => p.distanceM <= radiusM);
}

export function deduplicatePoints(points, thresholdM = 20) {
  if (!points.length) return [];
  const sorted = [...points].sort((a, b) => a.lat - b.lat);
  const kept = [];
  for (const p of sorted) {
    let dup = false;
    for (let j = kept.length - 1; j >= 0; j--) {
      const q = kept[j];
      if ((p.lat - q.lat) * 111320 > thresholdM) break;
      if (haversine(p.lat, p.lng, q.lat, q.lng) <= thresholdM) { dup = true; break; }
    }
    if (!dup) kept.push(p);
  }
  return kept;
}

export function scorePoints(points, center) {
  const scored = points.map((p) => {
    let score = 0;
    if (p.category === "intersection") {
      score += p.wayCount >= 4 ? 10 : p.wayCount >= 3 ? 7 : 4;
    }
    if (p.category === "hospital") score += 5;
    if (p.category === "school") score += 4;
    if (p.category === "market") score += 3;
    if (p.category === "government") score += 3;
    if (p.distanceM < 200) score += 3;
    else if (p.distanceM < 500) score += 1;
    return { ...p, score };
  });

  for (let i = 0; i < scored.length; i++) {
    const a = scored[i];
    if (a.category !== "hospital" && a.category !== "park") continue;
    for (const b of scored) {
      if (a === b) continue;
      if ((a.category === "hospital" && b.category === "park") ||
          (a.category === "park" && b.category === "hospital")) {
        if (haversine(a.lat, a.lng, b.lat, b.lng) <= 300) { a.score += 5; break; }
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}
