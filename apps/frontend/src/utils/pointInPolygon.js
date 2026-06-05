/**
 * Ray-casting point-in-polygon (handles Polygon + MultiPolygon).
 * @param {[number,number]} point  [lng, lat]
 * @param {object} geometry       GeoJSON Polygon or MultiPolygon geometry
 */
export function pointInPolygon(point, geometry) {
  if (geometry.type === "Polygon") {
    return ringContains(point, geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => ringContains(point, poly[0]));
  }
  return false;
}

function ringContains([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Get bounding box of a GeoJSON geometry. Returns [minLng, minLat, maxLng, maxLat]. */
export function geometryBBox(geometry) {
  const coords = flattenCoords(geometry);
  const lngs = coords.map(([lng]) => lng);
  const lats = coords.map(([, lat]) => lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

function flattenCoords(geometry) {
  if (geometry.type === "Polygon")      return geometry.coordinates.flat();
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}
