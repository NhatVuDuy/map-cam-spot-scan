import { BLOCKS, CAM_TYPES } from "./blocks.js";

const STORAGE_KEY = "cam-config-v1";

/** Load saved overrides from localStorage. Returns {} if none saved. */
export function loadCamConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

/** Persist overrides to localStorage. */
export function saveCamConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Remove all overrides — revert to blocks.js defaults. */
export function resetCamConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get effective cam counts for a block, merging saved overrides with defaults.
 * @returns {{ ITS1: number, ITS2: number, P2: number, P1: number, B3: number, B2: number, B1: number }}
 */
export function effectiveCams(blockId, camConfig) {
  const block = BLOCKS[blockId];
  if (!block) return {};
  const over = camConfig?.[blockId] || {};
  const result = {};
  for (const t of CAM_TYPES) {
    result[t] = over[t] !== undefined ? over[t] : (block.cams[t] ?? 0);
  }
  return result;
}

/** True if the given blockId has any overrides from the default. */
export function hasOverride(blockId, camConfig) {
  const block = BLOCKS[blockId];
  if (!block || !camConfig?.[blockId]) return false;
  const over = camConfig[blockId];
  return CAM_TYPES.some(t => over[t] !== undefined && over[t] !== block.cams[t]);
}
