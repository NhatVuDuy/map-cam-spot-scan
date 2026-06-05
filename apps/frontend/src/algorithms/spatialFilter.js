import { haversine } from "../utils/geo.js";

export function withinRadius(points, center, radiusM) {
  return points
    .map((p) => ({ ...p, distanceM: Math.round(haversine(center.lat, center.lng, p.lat, p.lng)) }))
    .filter((p) => p.distanceM <= radiusM);
}

export function deduplicatePoints(points, thresholdM = 20) {
  const out = [];
  const sorted = [...points].sort((a, b) => a.lat - b.lat);
  for (const p of sorted) {
    const dupe = out.some((q) => haversine(p.lat, p.lng, q.lat, q.lng) < thresholdM);
    if (!dupe) out.push(p);
  }
  return out;
}

export function scorePoints(points, center) {
  return points
    .map((p) => {
      let score = 0;
      if (p.category === "intersection") score += p.wayCount >= 4 ? 10 : 6;
      if (p.distanceM < 200) score += 3;
      if (["hospital", "school"].includes(p.category)) score += 2;
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score);
}
