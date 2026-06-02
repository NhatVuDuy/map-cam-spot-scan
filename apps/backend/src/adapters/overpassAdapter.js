import { config } from '../config/index.js';
import { classify } from '../algorithms/classifier.js';

const CATEGORY_QUERIES = {
  school: `node["amenity"~"school|university|college|kindergarten"](bbox);way["amenity"~"school|university|college|kindergarten"](bbox);`,
  hospital: `node["amenity"~"hospital|clinic|health_centre"](bbox);way["amenity"~"hospital|clinic|health_centre"](bbox);`,
  market: `node["amenity"="marketplace"](bbox);way["amenity"="marketplace"](bbox);node["shop"~"supermarket|mall"](bbox);way["shop"~"supermarket|mall"](bbox);`,
  park: `node["leisure"~"park|garden"](bbox);way["leisure"~"park|garden"](bbox);`,
  hotel: `node["tourism"~"hotel|motel|hostel|guest_house"](bbox);way["tourism"~"hotel|motel|hostel|guest_house"](bbox);`,
  government: `node["amenity"~"townhall|police|fire_station|courthouse|embassy"](bbox);way["amenity"~"townhall|police|fire_station|courthouse|embassy"](bbox);`,
  conference: `node["amenity"~"conference_centre|events_venue|community_centre"](bbox);way["amenity"~"conference_centre|events_venue|community_centre"](bbox);`,
};

const ROAD_QUERY = `way["highway"~"primary|secondary|tertiary|residential|trunk|motorway"](bbox);`;

async function postOverpass(query, endpoint, timeoutMs) {
  const { default: fetch } = await import('node-fetch');
  const body = `data=${encodeURIComponent(query)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  return res.json();
}

async function fetchWithRetry(query, endpoints, timeoutMs) {
  let lastErr;
  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await postOverpass(query, endpoint, timeoutMs);
      } catch (err) {
        lastErr = err;
        const wait = 1000 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}

function elementToFeature(el) {
  const lat = el.type === 'node' ? el.lat : el.center?.lat;
  const lng = el.type === 'node' ? el.lon : el.center?.lon;
  if (lat == null || lng == null) return null;
  return {
    id: `osm-${el.type}-${el.id}`,
    lat,
    lng,
    name: el.tags?.name || '',
    tags: el.tags || {},
    category: classify(el.tags || {}),
    source: 'osm',
  };
}

export class OverpassAdapter {
  async fetchPOI(bbox, categories, cfg = {}) {
    const [south, west, north, east] = bbox;
    const bboxStr = `${south},${west},${north},${east}`;

    const wantedCats = categories.filter((c) => c !== 'intersection');
    if (wantedCats.length === 0) return [];

    const inner = wantedCats
      .map((c) => CATEGORY_QUERIES[c] ?? '')
      .join('\n')
      .replace(/\(bbox\)/g, `(${bboxStr})`);

    const query = `[out:json][timeout:30];\n(\n${inner}\n);\nout center tags;`;
    const endpoints = cfg.endpoint
      ? [cfg.endpoint, ...config.overpass.endpoints]
      : config.overpass.endpoints;

    let data;
    try {
      data = await fetchWithRetry(query, endpoints, config.overpass.timeoutMs);
    } catch (err) {
      console.warn('[OverpassAdapter] fetchPOI failed:', err.message);
      return [];
    }

    return (data.elements ?? []).map(elementToFeature).filter(Boolean);
  }

  async fetchRoads(bbox, cfg = {}) {
    const [south, west, north, east] = bbox;
    const bboxStr = `${south},${west},${north},${east}`;
    const query = `[out:json][timeout:30];\n(\n${ROAD_QUERY.replace(/\(bbox\)/g, `(${bboxStr})`)}\n);\nout geom tags;`;

    const endpoints = cfg.endpoint
      ? [cfg.endpoint, ...config.overpass.endpoints]
      : config.overpass.endpoints;

    let data;
    try {
      data = await fetchWithRetry(query, endpoints, config.overpass.timeoutMs);
    } catch (err) {
      console.warn('[OverpassAdapter] fetchRoads failed:', err.message);
      return [];
    }

    return (data.elements ?? [])
      .filter((el) => el.type === 'way' && Array.isArray(el.geometry))
      .map((el) => ({
        id: `osm-way-${el.id}`,
        geometry: el.geometry.map((n) => ({ lat: n.lat, lon: n.lon })),
        highway: el.tags?.highway || '',
      }));
  }
}
