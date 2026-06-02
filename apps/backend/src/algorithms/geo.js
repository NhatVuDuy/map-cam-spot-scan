const R = 6_371_000; // Earth radius in metres

/**
 * Returns [south, west, north, east] bounding box for a circle.
 */
export function getBBox(lat, lng, radiusM) {
  const dLat = (radiusM / R) * (180 / Math.PI);
  const dLng = radiusM / (R * Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/**
 * Haversine distance in metres between two WGS-84 points.
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Projects (lat, lng) onto a canvas pixel given a bbox and canvas dimensions.
 * Used for SVG/Canvas rendering fallback (not MapLibre).
 */
export function toXY(lat, lng, bbox, canvasW, canvasH) {
  const [south, west, north, east] = bbox;
  const x = ((lng - west) / (east - west)) * canvasW;
  const y = ((north - lat) / (north - south)) * canvasH;
  return { x, y };
}
