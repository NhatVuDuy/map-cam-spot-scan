import { OverpassAdapter } from "./overpassAdapter.js";
import { GoongAdapter } from "./goongAdapter.js";
import { GeoJSONAdapter } from "./geojsonAdapter.js";
import { PostGISAdapter } from "./postgisAdapter.js";
export { BaseAdapter } from "./baseAdapter.js";

/**
 * Factory — returns the correct adapter instance for a sourceId.
 * @param {string} sourceId - "overpass" | "goong" | "geojson" | "postgis"
 * @param {object} [adapterConfig] - optional extra config passed to constructor
 */
export function adapterFactory(sourceId, adapterConfig = {}) {
  switch (sourceId) {
    case "overpass":
      return new OverpassAdapter(adapterConfig);
    case "goong":
      return new GoongAdapter(adapterConfig);
    case "geojson":
      return new GeoJSONAdapter(adapterConfig);
    case "postgis":
      return new PostGISAdapter(adapterConfig);
    default:
      throw new Error(`Unknown source: ${sourceId}`);
  }
}
