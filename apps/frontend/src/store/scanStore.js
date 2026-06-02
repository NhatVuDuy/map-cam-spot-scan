import { create } from 'zustand';
import { runScan as apiRunScan } from '../services/api.js';
import { CATEGORY_LIST } from '../utils/categories.js';

const DEFAULT_CATEGORIES = CATEGORY_LIST.map((c) => c.id);

export const useScanStore = create((set, get) => ({
  // Input
  source: { id: 'overpass', config: {} },
  area: { lat: 10.7726, lng: 106.677, radiusM: 1000 },
  categories: DEFAULT_CATEGORIES,

  // Results
  points: [],
  roads: [],
  bbox: null,
  stats: {},
  scanId: null,

  // UI
  loading: false,
  progress: '',
  error: null,
  filter: null,
  hoveredPoint: null,

  // Actions
  setSource: (source) => set({ source }),
  setArea: (area) => set({ area }),
  setCategories: (categories) => set({ categories }),
  setFilter: (filter) => set({ filter }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),

  resetResults: () =>
    set({ points: [], roads: [], bbox: null, stats: {}, error: null, scanId: null }),

  runScan: async () => {
    const { source, area, categories } = get();
    set({ loading: true, error: null, progress: 'Đang quét...', points: [], roads: [] });
    try {
      const result = await apiRunScan({ source, area, categories, options: { includeRoads: true } });
      set({
        points: result.points ?? [],
        roads: result.roads ?? [],
        bbox: result.meta?.bbox ?? null,
        stats: result.meta?.byCategory ?? {},
        scanId: result.meta?.scanId ?? null,
        progress: `Tìm thấy ${result.meta?.totalFound ?? 0} địa điểm`,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err.message, progress: '' });
    }
  },
}));
