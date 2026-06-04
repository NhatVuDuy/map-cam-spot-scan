import fetch from "node-fetch";
import { BaseAdapter } from "./index.js";
import { config as appConfig } from "../config/index.js";
import { CATEGORIES } from "@camera-scanner/shared";

// Map category to Overpass QL filter fragments
function buildOverpassFilters(categories, bbox) {
  const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
  const parts = [];

  for (const cat of categories) {
    if (cat === "intersection") continue; // detected algorithmically
    const catDef = CATEGORIES[cat];
    if (!catDef) continue;

    for (const [tagKey, tagValues] of Object.entries(catDef.osmTags)) {
      const valuesRegex = tagValues.join("|");
      parts.push(`  node["${tagKey}"~"${valuesRegex}"](${bboxStr});`);
      parts.push(`  way["${tagKey}"~"${valuesRegex}"](${bboxStr});`);
    }
  }

  return parts;
}

function buildRoadFilters(bbox) {
  const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
  return [
    `  way["highway"~"primary|secondary|tertiary|residential|trunk|unclassified"](${bboxStr});`,
  ];
}

function buildQuery(filters) {
  return `[out:json][timeout:30];\n(\n${filters.join("\n")}\n);\nout center tags;`;
}

async function postOverpass(endpoint, query, timeoutMs) {
  const body = new URLSearchParams({ data: query });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}`);
  }
  return res.json();
}

async function withRetry(fn, retries = 3, delayMs = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delayMs * Math.pow(2, attempt);
      console.warn(`[overpass] Attempt ${attempt + 1} failed: ${err.message}. Retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

function normalizeElement(el) {
  let lat, lng;

  if (el.type === "node") {
    lat = el.lat;
    lng = el.lon;
  } else if (el.center) {
    lat = el.center.lat;
    lng = el.center.lon;
  } else {
    return null;
  }

  return {
    id: `osm-${el.type}-${el.id}`,
    lat,
    lng,
    tags: el.tags || {},
    source: "osm",
    rawType: el.type,
  };
}

function normalizeWay(el) {
  if (el.type !== "way") return null;
  const coords = (el.geometry || []).map((pt) => [pt.lon, pt.lat]);
  return {
    id: `osm-way-${el.id}`,
    geometry: coords,
    highway: el.tags?.highway || "",
    tags: el.tags || {},
  };
}

export class OverpassAdapter extends BaseAdapter {
  constructor(cfg = {}) {
    super();
    this.endpoints = cfg.endpoints || appConfig.overpass.endpoints;
    this.timeoutMs = cfg.timeoutMs || appConfig.overpass.timeoutMs;
  }

  async fetchPOI(bbox, categories) {
    const filters = buildOverpassFilters(categories, bbox);
    if (filters.length === 0) return [];

    const query = buildQuery(filters);
    const data = await this._runQuery(query);
    return (data.elements || [])
      .map(normalizeElement)
      .filter(Boolean);
  }

  async fetchRoads(bbox) {
    // Use geom output to get node coordinates for intersection detection
    const bboxStr = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
    const query = `[out:json][timeout:30];\n(\n  way["highway"~"primary|secondary|tertiary|residential|trunk|unclassified"](${bboxStr});\n);\nout geom tags;`;
    const data = await this._runQuery(query);
    return (data.elements || [])
      .map(normalizeWay)
      .filter(Boolean);
  }

  async _runQuery(query) {
    for (let i = 0; i < this.endpoints.length; i++) {
      const endpoint = this.endpoints[i];
      try {
        return await withRetry(
          () => postOverpass(endpoint, query, this.timeoutMs),
          3,
          1000
        );
      } catch (err) {
        console.warn(`[overpass] Endpoint ${endpoint} failed: ${err.message}`);
        if (i === this.endpoints.length - 1) {
          console.error("[overpass] All endpoints failed, returning empty");
          return { elements: [] };
        }
      }
    }
    return { elements: [] };
  }
}
