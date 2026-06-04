import NodeCache from "node-cache";
import { config } from "../config/index.js";

const cache = new NodeCache({
  stdTTL: config.cache.ttlSeconds,
  checkperiod: 60,
  useClones: false,
});

/**
 * Build a deterministic cache key from scan parameters.
 */
export function buildCacheKey(sourceId, lat, lng, radiusM, categories) {
  const catKey = [...categories].sort().join(",");
  return `scan:${sourceId}:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusM}:${catKey}`;
}

export function cacheGet(key) {
  return cache.get(key) ?? null;
}

export function cacheSet(key, value, ttlSeconds) {
  cache.set(key, value, ttlSeconds ?? config.cache.ttlSeconds);
}

export function cacheDel(key) {
  cache.del(key);
}

export function cacheStats() {
  return cache.getStats();
}
