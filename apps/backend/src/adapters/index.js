import { OverpassAdapter } from "./overpassAdapter.js";
import { GoongAdapter } from "./goongAdapter.js";
import { GeoJSONAdapter } from "./geojsonAdapter.js";
import { PostGISAdapter } from "./postgisAdapter.js";

/**
 * BaseAdapter — interface contract for all data source adapters.
 * All adapters must implement fetchPOI and fetchRoads.
 */
export class BaseAdapter {
  /**
   * Fetch points of interest within a bounding box for given categories.
   * @param {number[]} bbox - [south, west, north, east]
   * @param {string[]} categories - category keys
   * @param {object} config - adapter-specific config
   * @returns {Promise<RawFeature[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchPOI(bbox, categories, config) {
    throw new Error("fetchPOI() not implemented");
  }

  /**
   * Fetch road ways within a bounding box.
   * @param {number[]} bbox - [south, west, north, east]
   * @param {object} config - adapter-specific config
   * @returns {Promise<RawWay[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async fetchRoads(bbox, config) {
    throw new Error("fetchRoads() not implemented");
  }
}

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
