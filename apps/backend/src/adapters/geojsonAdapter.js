import { classify } from '../algorithms/classifier.js';

function centroid(coordinates) {
  const flat = coordinates.flat(Infinity);
  let latSum = 0, lngSum = 0, count = 0;
  for (let i = 0; i < flat.length; i += 2) {
    lngSum += flat[i];
    latSum += flat[i + 1];
    count++;
  }
  return count > 0 ? { lat: latSum / count, lng: lngSum / count } : null;
}

function inBBox(lat, lng, bbox) {
  const [south, west, north, east] = bbox;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export class GeoJSONAdapter {
  // geojsonData must be a parsed GeoJSON FeatureCollection
  async fetchPOI(bbox, categories, cfg = {}) {
    const geojsonData = cfg.geojsonData;
    if (!geojsonData?.features) return [];

    const features = [];
    for (const feature of geojsonData.features) {
      const geom = feature.geometry;
      const props = feature.properties || {};
      if (!geom) continue;

      let lat, lng;
      if (geom.type === 'Point') {
        [lng, lat] = geom.coordinates;
      } else if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        const c = centroid(geom.coordinates);
        if (!c) continue;
        ({ lat, lng } = c);
      } else {
        // LineString / MultiLineString → handled in fetchRoads
        continue;
      }

      if (!inBBox(lat, lng, bbox)) continue;

      const category = classify(props);
      if (category === 'unknown' && !categories.includes('unknown')) {
        // Only include if explicitly requested or classification succeeded
        if (categories.length > 0) continue;
      }
      if (categories.length > 0 && !categories.includes(category)) continue;

      features.push({
        id: `geojson-${feature.id ?? `${lat.toFixed(6)}-${lng.toFixed(6)}`}`,
        lat,
        lng,
        name: props.name ?? props.ten ?? '',
        tags: props,
        category,
        source: 'geojson',
      });
    }
    return features;
  }

  async fetchRoads(bbox, cfg = {}) {
    const geojsonData = cfg.geojsonData;
    if (!geojsonData?.features) return [];

    const roads = [];
    for (const feature of geojsonData.features) {
      const geom = feature.geometry;
      if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString')) continue;

      const lines =
        geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;

      for (const line of lines) {
        roads.push({
          id: `geojson-road-${roads.length}`,
          geometry: line.map(([lng, lat]) => ({ lat, lon: lng })),
          highway: feature.properties?.highway || 'unclassified',
        });
      }
    }
    return roads;
  }
}
