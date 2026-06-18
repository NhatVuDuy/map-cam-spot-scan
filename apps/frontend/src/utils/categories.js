// Backward compat shim — new code should import from config/blocks.js
import { BLOCKS, BLOCK_KEYS } from "../config/blocks.js";

export const CATEGORIES = Object.fromEntries(
  BLOCK_KEYS.map(k => [k, {
    label: BLOCKS[k].name,
    color: BLOCKS[k].color,
    icon: k.toLowerCase().replace("-","_"),
    priority: 1,
  }])
);
export const CATEGORY_KEYS = BLOCK_KEYS;
