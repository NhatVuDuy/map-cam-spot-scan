import { create } from "zustand";
import { scanAPI } from "../services/api.js";
import { CATEGORIES } from "../utils/categories.js";

const DEFAULT_CATEGORIES = Object.keys(CATEGORIES);

const useScanStore = create((set, get) => ({
  // --- Input ---
  source: { id: "overpass", config: {} },
  area: { lat: 10.7726, lng: 106.677, radiusM: 1000 },
  categories: DEFAULT_CATEGORIES,

  // --- Results ---
  points: [],
  roads: [],
  bbox: null,
  stats: {},

  // --- UI ---
  loading: false,
  progress: "",
  error: null,
  filter: null,
  hoveredPoint: null,

  // --- Actions ---
  setSource: (source) => set({ source }),
  setArea: (area) => set({ area: { ...get().area, ...area } }),
  setCategories: (categories) => set({ categories }),

  runScan: async () => {
    const { source, area, categories } = get();
    set({ loading: true, error: null, progress: "Scanning...", points: [], roads: [] });

    try {
      const result = await scanAPI.scan({ source, area, categories, options: { maxResults: 500, includeRoads: true } });
      set({
        points: result.points || [],
        roads: result.roads || [],
        bbox: result.meta?.bbox || null,
        stats: result.meta?.byCategory || {},
        loading: false,
        progress: `Found ${result.meta?.totalFound || 0} locations`,
        error: null,
      });
    } catch (err) {
      set({
        loading: false,
        progress: "",
        error: err.response?.data?.message || err.message || "Scan failed",
      });
    }
  },

  resetResults: () =>
    set({ points: [], roads: [], bbox: null, stats: {}, error: null, progress: "" }),

  setFilter: (filter) => set({ filter }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),
}));

export default useScanStore;
