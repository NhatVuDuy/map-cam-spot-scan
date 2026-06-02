import { OverpassAdapter } from './overpassAdapter.js';
import { GoongAdapter } from './goongAdapter.js';
import { GeoJSONAdapter } from './geojsonAdapter.js';
import { PostGISAdapter } from './postgisAdapter.js';

const registry = {
  overpass: OverpassAdapter,
  goong: GoongAdapter,
  geojson: GeoJSONAdapter,
  postgis: PostGISAdapter,
};

/**
 * Returns an adapter instance for the given sourceId.
 * Throws if the sourceId is not registered.
 */
export function adapterFactory(sourceId) {
  const Cls = registry[sourceId];
  if (!Cls) throw new Error(`Unknown data source: "${sourceId}"`);
  return new Cls();
}

export { OverpassAdapter, GoongAdapter, GeoJSONAdapter, PostGISAdapter };
