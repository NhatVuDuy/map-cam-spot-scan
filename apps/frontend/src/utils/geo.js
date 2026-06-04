/**
 * Client-side geo helpers.
 */

const R = 6_371_000;

export function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getBBox(lat, lng, radiusM) {
  const dLat = (radiusM / R) * (180 / Math.PI);
  const dLng = (radiusM / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

/**
 * Build a GeoJSON circle polygon for a given center + radius.
 * @returns {object} GeoJSON Polygon Feature
 */
export function circleGeoJSON(lat, lng, radiusM, steps = 64) {
  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusM * Math.cos(angle)) / R * (180 / Math.PI);
    const dLng = (radiusM * Math.sin(angle)) / (R * Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}
