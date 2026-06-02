import { config } from '../config/index.js';

const BASE_URL = 'https://rsapi.goong.io/Place/nearbysearch';

const CATEGORY_TYPE_MAP = {
  school: 'school',
  hospital: 'hospital',
  hotel: 'lodging',
  market: 'supermarket',
  government: 'local_government_office',
  park: 'park',
  conference: 'establishment',
};

export class GoongAdapter {
  async fetchPOI(bbox, categories, cfg = {}) {
    const apiKey = cfg.apiKey || config.goong.apiKey;
    if (!apiKey) {
      console.warn('[GoongAdapter] No API key configured, skipping.');
      return [];
    }

    const lat = (bbox[0] + bbox[2]) / 2;
    const lng = (bbox[1] + bbox[3]) / 2;
    const radiusM = Math.round(
      Math.max(
        (bbox[2] - bbox[0]) * 111_000,
        (bbox[3] - bbox[1]) * 111_000 * Math.cos((lat * Math.PI) / 180),
      ) / 2,
    );

    const wanted = categories.filter((c) => c !== 'intersection' && CATEGORY_TYPE_MAP[c]);
    const { default: fetch } = await import('node-fetch');
    const features = [];

    for (const category of wanted) {
      const type = CATEGORY_TYPE_MAP[category];
      const url = `${BASE_URL}?location=${lat},${lng}&radius=${radiusM}&type=${type}&api_key=${apiKey}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) {
          console.warn(`[GoongAdapter] HTTP ${res.status} for category ${category}`);
          continue;
        }
        const data = await res.json();
        for (const place of data.results ?? []) {
          const loc = place.geometry?.location;
          if (!loc) continue;
          features.push({
            id: `goong-${place.place_id}`,
            lat: loc.lat,
            lng: loc.lng,
            name: place.name || '',
            tags: { goong_types: place.types || [] },
            category,
            source: 'goong',
          });
        }
      } catch (err) {
        console.warn(`[GoongAdapter] Failed to fetch ${category}:`, err.message);
      }
    }

    if (categories.includes('intersection')) {
      console.warn('[GoongAdapter] Intersection detection not supported by Goong API, skipping.');
    }

    return features;
  }

  async fetchRoads() {
    // Goong NearbySearch does not provide road geometry
    return [];
  }
}
