/**
 * Spatial filter functions — pure, no I/O.
 */
import { haversine } from "./geo.js";

/**
 * Filter points within a radius and add distanceM.
 * @param {object[]} points
 * @param {{ lat: number, lng: number }} center
 * @param {number} radiusM
 * @returns {object[]}
 */
export function withinRadius(points, center, radiusM) {
  return points
    .map((p) => ({
      ...p,
      distanceM: Math.round(haversine(center.lat, center.lng, p.lat, p.lng)),
    }))
    .filter((p) => p.distanceM <= radiusM);
}

/**
 * Remove duplicate points within thresholdM of each other.
 * Uses a simple sliding-window approach after sorting by lat.
 * @param {object[]} points
 * @param {number} [thresholdM=20]
 * @returns {object[]}
 */
export function deduplicatePoints(points, thresholdM = 20) {
  if (points.length === 0) return [];

  // Sort by lat for sliding window
  const sorted = [...points].sort((a, b) => a.lat - b.lat);
  const kept = [];

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    let isDuplicate = false;

    // Only compare against recently added points (sliding window)
    for (let j = kept.length - 1; j >= 0; j--) {
      const q = kept[j];
      // If lat difference exceeds threshold, no more possible duplicates
      if ((p.lat - q.lat) * 111320 > thresholdM) break;
      if (haversine(p.lat, p.lng, q.lat, q.lng) <= thresholdM) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) kept.push(p);
  }

  return kept;
}

/**
 * Score points for camera installation priority and sort descending.
 * @param {object[]} points
 * @returns {object[]} sorted by score desc
 */
export function scorePoints(points) {
  // Group by proximity for combo detection
  const scored = points.map((p) => {
    let score = 0;

    // Intersection priority
    if (p.category === "intersection") {
      if (p.wayCount >= 4) score += 10;
      else if (p.wayCount >= 3) score += 7;
      else score += 4;
    }

    // High-priority categories
    if (p.category === "hospital") score += 5;
    if (p.category === "school") score += 4;
    if (p.category === "market") score += 3;
    if (p.category === "government") score += 3;

    // Close to center
    if (p.distanceM !== undefined && p.distanceM < 200) score += 3;
    else if (p.distanceM !== undefined && p.distanceM < 500) score += 1;

    return { ...p, score };
  });

  // Hospital + park combo bonus (nearby within 300m)
  for (let i = 0; i < scored.length; i++) {
    if (scored[i].category === "hospital" || scored[i].category === "park") {
      for (let j = 0; j < scored.length; j++) {
        if (i === j) continue;
        const other = scored[j];
        if (
          (scored[i].category === "hospital" && other.category === "park") ||
          (scored[i].category === "park" && other.category === "hospital")
        ) {
          const dist = haversine(scored[i].lat, scored[i].lng, other.lat, other.lng);
          if (dist <= 300) {
            scored[i].score += 5;
            break;
          }
        }
      }
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}
