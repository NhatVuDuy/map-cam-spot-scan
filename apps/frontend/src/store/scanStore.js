import { create } from "zustand";
import { browserScan } from "../services/browserScan.js";
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
  selectedPoint: null,

  // --- Actions ---
  setSource: (source) => set({ source }),
  setArea: (area) => set({ area: { ...get().area, ...area } }),
  setCategories: (categories) => set({ categories }),

  runScan: async () => {
    const { area, categories } = get();
    set({ loading: true, error: null, progress: "Đang khởi động...", points: [], roads: [], selectedPoint: null });

    try {
      const result = await browserScan(
        { area, categories, options: { maxResults: 500, includeRoads: true } },
        (msg) => set({ progress: msg })
      );

      set({
        points: result.points || [],
        roads: result.roads || [],
        bbox: result.meta?.bbox || null,
        stats: result.meta?.byCategory || {},
        loading: false,
        progress: `Tìm thấy ${result.meta?.totalFound || 0} địa điểm (${result.meta?.durationMs}ms)`,
        error: null,
      });
    } catch (err) {
      set({
        loading: false,
        progress: "",
        error: err.message || "Quét thất bại",
      });
    }
  },

  resetResults: () =>
    set({ points: [], roads: [], bbox: null, stats: {}, error: null, progress: "", selectedPoint: null }),

  setFilter: (filter) => set({ filter }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
}));

export default useScanStore;
