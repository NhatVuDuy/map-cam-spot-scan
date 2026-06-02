import { adapterFactory } from '../adapters/index.js';
import { PostGISAdapter } from '../adapters/postgisAdapter.js';
import { getBBox } from '../algorithms/geo.js';
import { detectIntersections } from '../algorithms/intersection.js';
import { withinRadius, deduplicatePoints, scorePoints } from '../algorithms/spatialFilter.js';
import { cacheGet, cacheSet, cacheKey } from './cacheService.js';

export async function runScan({ source, area, categories, options = {} }) {
  const { lat, lng, radiusM } = area;
  const { maxResults = 500, includeRoads = true } = options;
  const bbox = getBBox(lat, lng, radiusM);
  const center = { lat, lng };

  const key = cacheKey(source.id, bbox, categories);
  const cached = cacheGet(key);
  if (cached) return cached;

  const start = Date.now();
  const adapter = adapterFactory(source.id);

  const wantIntersections = categories.includes('intersection');
  const poiCategories = categories.filter((c) => c !== 'intersection');

  // Fetch POI and roads in parallel
  const [rawPOI, rawRoads] = await Promise.all([
    poiCategories.length > 0
      ? adapter.fetchPOI(bbox, poiCategories, source.config ?? {})
      : Promise.resolve([]),
    includeRoads || wantIntersections
      ? adapter.fetchRoads(bbox, source.config ?? {})
      : Promise.resolve([]),
  ]);

  // Spatial filter + dedup + score POI
  let points = withinRadius(rawPOI, center, radiusM);
  points = deduplicatePoints(points);

  // Intersections
  if (wantIntersections) {
    let intersections;
    if (source.id === 'postgis') {
      intersections = await new PostGISAdapter().fetchIntersections(center, radiusM);
    } else {
      intersections = detectIntersections(rawRoads, center, radiusM);
    }
    points = [...points, ...intersections];
  }

  points = scorePoints(points).slice(0, maxResults);

  // Normalise road geometry for JSON response
  const roads = rawRoads.map((r) => ({
    id: r.id,
    geometry: r.geometry.map(({ lat, lon }) => [lon, lat]),
    highway: r.highway,
  }));

  // Build stats by category
  const byCategory = {};
  for (const p of points) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  }

  const result = {
    meta: {
      source: source.id,
      durationMs: Date.now() - start,
      bbox,
      totalFound: points.length,
      byCategory,
    },
    points,
    roads: includeRoads ? roads : [],
  };

  cacheSet(key, result);
  return result;
}
