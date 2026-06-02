const R = 6_371_000;

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

export function getBBox(lat, lng, radiusM) {
  const dLat = (radiusM / R) * (180 / Math.PI);
  const dLng = radiusM / (R * Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI);
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

export function formatDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}
