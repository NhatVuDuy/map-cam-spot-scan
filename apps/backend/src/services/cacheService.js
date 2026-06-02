import NodeCache from 'node-cache';
import { config } from '../config/index.js';

const cache = new NodeCache({ stdTTL: config.cache.ttlSeconds, checkperiod: 60 });

export function cacheGet(key) {
  return cache.get(key) ?? null;
}

export function cacheSet(key, value, ttl = config.cache.ttlSeconds) {
  cache.set(key, value, ttl);
}

export function cacheKey(sourceId, bbox, categories) {
  return `${sourceId}:${bbox.join(',')}:${[...categories].sort().join(',')}`;
}
