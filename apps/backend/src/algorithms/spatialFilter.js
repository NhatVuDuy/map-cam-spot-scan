import { haversine } from './geo.js';

/**
 * Filters points to those within radiusM of center, attaches distanceM.
 */
export function withinRadius(points, center, radiusM) {
  const result = [];
  for (const p of points) {
    const distanceM = haversine(center.lat, center.lng, p.lat, p.lng);
    if (distanceM <= radiusM) {
      result.push({ ...p, distanceM: Math.round(distanceM) });
    }
  }
  return result;
}

/**
 * Removes near-duplicate points within thresholdM of each other.
 * Keeps the first occurrence (adapters should return highest-quality first).
 * Algorithm: sort by lat, then sliding-window distance check.
 */
export function deduplicatePoints(points, thresholdM = 20) {
  const sorted = [...points].sort((a, b) => a.lat - b.lat);
  const kept = [];
  for (const p of sorted) {
    let duplicate = false;
    for (let i = kept.length - 1; i >= 0; i--) {
      const q = kept[i];
      // Early exit: if lat diff alone exceeds threshold, no need to check further back
      if ((p.lat - q.lat) * 111_000 > thresholdM) break;
      if (haversine(p.lat, p.lng, q.lat, q.lng) <= thresholdM) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) kept.push(p);
  }
  return kept;
}

/**
 * Scores points for camera placement priority.
 * Returns points sorted by score descending.
 */
export function scorePoints(points) {
  const scored = points.map((p) => {
    let score = 0;

    if (p.category === 'intersection') {
      score += p.wayCount >= 4 ? 10 : p.wayCount === 3 ? 7 : 4;
    }

    if (p.category === 'hospital') score += 5;
    if (p.category === 'school') score += 4;
    if (p.category === 'market') score += 3;
    if (p.category === 'government') score += 3;
    if (p.category === 'park') score += 2;
    if (p.category === 'conference') score += 2;
    if (p.category === 'hotel') score += 1;

    if (p.distanceM !== undefined && p.distanceM < 200) score += 3;

    return { ...p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
