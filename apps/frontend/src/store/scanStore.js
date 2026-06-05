import { create } from "zustand";
import { browserScan } from "../services/browserScan.js";
import { CATEGORIES } from "../utils/categories.js";

const DEFAULT_CATEGORIES = Object.keys(CATEGORIES);

const useScanStore = create((set, get) => ({
  // --- Input ---
  source: { id: "overpass", config: {} },
  area: { lat: 10.7726, lng: 106.677, radiusM: 1000 },
  categories: DEFAULT_CATEGORIES,
  boundary: null,
  maxResults: 500,

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
  setBoundary: (boundary) => set({ boundary }),
  setMaxResults: (maxResults) => set({ maxResults: Number(maxResults) }),

  runScan: async () => {
    const { area, categories, boundary, maxResults } = get();
    set({ loading: true, error: null, progress: "Đang khởi động...", points: [], roads: [], selectedPoint: null });

    try {
      const result = await browserScan(
        { area, categories, boundary, options: { maxResults, includeRoads: true } },
        (msg) => set({ progress: msg })
      );

      set({
        points: result.points || [],
        roads: result.roads || [],
        bbox: result.meta?.bbox || null,
        stats: result.meta?.byCategory || {},
        loading: false,
        progress: (() => {
          const found = result.meta?.totalFound || 0;
          const total = result.meta?.totalBeforeCap || found;
          const ms = result.meta?.durationMs;
          return total > found
            ? `Hiển thị ${found}/${total} địa điểm (${ms}ms) — tăng giới hạn để xem thêm`
            : `Tìm thấy ${found} địa điểm (${ms}ms)`;
        })(),
        error: null,
      });
    } catch (err) {
      set({ loading: false, progress: "", error: err.message || "Quét thất bại" });
    }
  },

  resetResults: () =>
    set({ points: [], roads: [], bbox: null, stats: {}, error: null, progress: "", selectedPoint: null }),

  setFilter: (filter) => set({ filter }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
}));

export default useScanStore;
