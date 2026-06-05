/**
 * Ray-casting point-in-polygon test.
 * @param {[number, number]} point - [lng, lat]
 * @param {{ type: string, coordinates: any }} geometry - GeoJSON Polygon or MultiPolygon
 */
export function pointInPolygon(point, geometry) {
  if (geometry.type === "Polygon") {
    return _pipRing(point, geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => _pipRing(point, poly[0]));
  }
  return false;
}

function _pipRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * @param {{ type: string, coordinates: any }} geometry
 * @returns {[number, number, number, number]} [minLng, minLat, maxLng, maxLat]
 */
export function geometryBBox(geometry) {
  const coords = _flatCoords(geometry);
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function _flatCoords(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}
