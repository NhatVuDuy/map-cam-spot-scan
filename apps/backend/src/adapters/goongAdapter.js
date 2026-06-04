import fetch from "node-fetch";
import { BaseAdapter } from "./baseAdapter.js";
import { config as appConfig } from "../config/index.js";

const GOONG_NEARBY_URL = "https://rsapi.goong.io/Place/nearbysearch";

const CATEGORY_TYPE_MAP = {
  school: "school",
  hotel: "lodging",
  hospital: "hospital",
  market: "supermarket",
  government: "local_government_office",
  park: "park",
  conference: "establishment",
};

function normalizeGoongResult(result, category) {
  const loc = result.geometry?.location;
  if (!loc) return null;
  return {
    id: `goong-${result.place_id || Math.random().toString(36).slice(2)}`,
    lat: loc.lat,
    lng: loc.lng,
    tags: { name: result.name, types: result.types?.join(",") || "" },
    source: "goong",
    category,
    name: result.name || "",
  };
}

export class GoongAdapter extends BaseAdapter {
  constructor(cfg = {}) {
    super();
    this.apiKey = cfg.apiKey || appConfig.goong.apiKey;
  }

  async fetchPOI(bbox, categories, config = {}) {
    const apiKey = config.apiKey || this.apiKey;
    if (!apiKey) {
      console.warn("[goong] No API key configured — returning empty");
      return [];
    }

    // Derive center from bbox
    const lat = (bbox[0] + bbox[2]) / 2;
    const lng = (bbox[1] + bbox[3]) / 2;
    // Rough radius from bbox
    const radiusM = Math.min(
      ((bbox[2] - bbox[0]) * 111320) / 2,
      50000
    );

    const results = [];

    for (const cat of categories) {
      if (cat === "intersection") {
        console.warn("[goong] 'intersection' not supported by Goong API — skipping");
        continue;
      }
      const type = CATEGORY_TYPE_MAP[cat];
      if (!type) continue;

      try {
        const url = new URL(GOONG_NEARBY_URL);
        url.searchParams.set("location", `${lat},${lng}`);
        url.searchParams.set("radius", String(Math.round(radiusM)));
        url.searchParams.set("type", type);
        url.searchParams.set("api_key", apiKey);
        if (cat === "conference") {
          url.searchParams.set("keyword", "hội nghị trung tâm hội");
        }

        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          console.warn(`[goong] HTTP ${res.status} for category ${cat}`);
          continue;
        }
        const data = await res.json();
        for (const item of data.results || []) {
          const feature = normalizeGoongResult(item, cat);
          if (feature) results.push(feature);
        }
      } catch (err) {
        console.warn(`[goong] Error fetching category ${cat}:`, err.message);
      }
    }

    return results;
  }

  async fetchRoads(_bbox, _config) {
    // Goong does not expose road network data
    console.warn("[goong] fetchRoads not supported — returning empty");
    return [];
  }
}
