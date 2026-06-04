/**
 * Pure geodetic functions — no I/O, no side effects.
 */

const R = 6_371_000; // Earth radius in metres

/**
 * Compute bounding box around a center point.
 * @param {number} lat - center latitude
 * @param {number} lng - center longitude
 * @param {number} radiusM - radius in metres
 * @returns {[number, number, number, number]} [south, west, north, east]
 */
export function getBBox(lat, lng, radiusM) {
  const dLat = (radiusM / R) * (180 / Math.PI);
  const dLng = (radiusM / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/**
 * Haversine distance between two coordinates.
 * @returns {number} distance in metres
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert lat/lng to canvas pixel coordinates.
 * @param {number} lat
 * @param {number} lng
 * @param {number[]} bbox - [south, west, north, east]
 * @param {number} canvasW
 * @param {number} canvasH
 * @returns {{ x: number, y: number }}
 */
export function toXY(lat, lng, bbox, canvasW, canvasH) {
  const [south, west, north, east] = bbox;
  const x = ((lng - west) / (east - west)) * canvasW;
  const y = ((north - lat) / (north - south)) * canvasH;
  return { x, y };
}
