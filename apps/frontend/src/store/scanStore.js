import { create } from "zustand";
import { browserScan } from "../services/browserScan.js";
import { planAllCameras } from "../algorithms/cameraPlacement.js";
import { CATEGORIES } from "../utils/categories.js";
import { saveToHandle, saveAsNew, importSession } from "../utils/sessionFile.js";

const DEFAULT_CATEGORIES = Object.keys(CATEGORIES);

const SHAPE_LABEL = {
  quad:  "Ngã tư",
  tri:   "Ngã ba",
  alley: "Đầu hẻm",
  minor: "Giao cắt",
};

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
  cameras: [],
  bbox: null,
  stats: {},

  // --- Raw intersection data (kept for camera recomputation) ---
  rawIntersections: [],
  rawWays: [],
  rawSignalNodes: [],

  // --- Per-intersection user overrides: id → { intersectionShape?, hasSignal? } ---
  intersectionOverrides: {},

  // --- Session file tracking ---
  sessionFileHandle: null,   // FileSystemFileHandle | null
  sessionFileName:   null,   // string | null  (e.g. "cam-scan-2025-06-09.json")

  // --- UI ---
  loading: false,
  progress: "",
  error: null,
  filter: null,
  hoveredPoint: null,
  selectedPoint: null,
  showCameras: true,

  // --- Actions ---
  setSource: (source) => set({ source }),
  setShowCameras: (showCameras) => set({ showCameras }),
  setArea: (area) => set({ area: { ...get().area, ...area } }),
  setCategories: (categories) => set({ categories }),
  setBoundary: (boundary) => set({ boundary }),
  setMaxResults: (maxResults) => set({ maxResults: Number(maxResults) }),

  addPoint: (point) => {
    const points = [point, ...get().points];
    const stats = {};
    for (const p of points) stats[p.category] = (stats[p.category] || 0) + 1;
    set({ points, stats });
  },

  removePoint: (id) => {
    const points = get().points.filter(p => p.id !== id);
    const stats = {};
    for (const p of points) stats[p.category] = (stats[p.category] || 0) + 1;
    const sel = get().selectedPoint;
    set({ points, stats, selectedPoint: sel?.id === id ? null : sel });
  },

  /**
   * Override intersection shape and/or signal, then recompute cameras.
   * `override` can contain: { intersectionShape?, hasSignal? }
   */
  setIntersectionOverride: (id, override) => {
    const prevOverrides = get().intersectionOverrides;
    const newEntry = { ...(prevOverrides[id] || {}), ...override };
    const newOverrides = { ...prevOverrides, [id]: newEntry };

    // Patch points[] so the map layer and popup reflect the change immediately
    const points = get().points.map(p => {
      if (p.id !== id || p.category !== "intersection") return p;
      const patched = { ...p, ...newEntry };
      if (newEntry.intersectionShape) {
        patched.name = SHAPE_LABEL[newEntry.intersectionShape] || p.name;
      }
      return patched;
    });

    set({ intersectionOverrides: newOverrides, points });

    // Recompute cameras using overridden intersection data
    const { rawIntersections, rawWays, rawSignalNodes } = get();
    if (rawIntersections.length > 0) {
      const enriched = rawIntersections.map(ix =>
        newOverrides[ix.id] ? { ...ix, ...newOverrides[ix.id] } : ix
      );
      const cameras = planAllCameras({ intersections: enriched, ways: rawWays, signalNodes: rawSignalNodes });
      set({ cameras });
    }
  },

  runScan: async () => {
    const { area, categories, boundary, maxResults } = get();
    set({
      loading: true, error: null, progress: "Đang khởi động...",
      points: [], roads: [], cameras: [],
      rawIntersections: [], rawWays: [], rawSignalNodes: [],
      intersectionOverrides: {},
      sessionFileHandle: null, sessionFileName: null,
      selectedPoint: null,
    });

    try {
      const result = await browserScan(
        { area, categories, boundary, options: { maxResults, includeRoads: true } },
        (msg) => set({ progress: msg })
      );

      set({
        points:           result.points || [],
        roads:            result.roads  || [],
        cameras:          result.cameras || [],
        rawIntersections: result.rawIntersections || [],
        rawWays:          result.rawWays || [],
        rawSignalNodes:   result.rawSignalNodes || [],
        bbox:             result.meta?.bbox || null,
        stats:            result.meta?.byCategory || {},
        loading:          false,
        progress: (() => {
          const found = result.meta?.totalFound || 0;
          const total = result.meta?.totalBeforeCap || found;
          const ms    = result.meta?.durationMs;
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

  /**
   * Save to the currently open file (if any), otherwise open Save As dialog / download.
   */
  saveSession: async () => {
    const state = get();
    const { sessionFileHandle, sessionFileName } = state;
    if (sessionFileHandle) {
      const ok = await saveToHandle(sessionFileHandle, state);
      if (ok) return; // wrote in-place — done
    }
    // No handle or write failed → fall back to Save As / download
    const handle = await saveAsNew(state, sessionFileName ?? undefined);
    if (handle) set({ sessionFileHandle: handle, sessionFileName: handle.name });
  },

  /**
   * Always open a new Save As dialog / download (ignores current handle).
   */
  saveSessionAs: async () => {
    const state = get();
    const handle = await saveAsNew(state);
    if (handle) set({ sessionFileHandle: handle, sessionFileName: handle.name });
  },

  loadSession: async (file) => {
    set({ loading: true, error: null, progress: "Đang đọc file..." });
    try {
      const state = await importSession(file);
      const count = state.points.length;
      set({
        ...state,
        // Browsers give a File object from <input> — no FileSystemFileHandle.
        // showOpenFilePicker() would give one, but <input> is simpler for now.
        sessionFileHandle: null,
        sessionFileName:   state._filename ?? file.name ?? null,
        loading: false, error: null,
        progress: `Đã tải ${count} địa điểm từ "${state._filename ?? file.name}"`,
        selectedPoint: null, filter: null,
      });
    } catch (e) {
      set({ loading: false, error: e.message });
    }
  },

  resetResults: () =>
    set({
      points: [], roads: [], cameras: [], bbox: null, stats: {},
      rawIntersections: [], rawWays: [], rawSignalNodes: [],
      intersectionOverrides: {},
      sessionFileHandle: null, sessionFileName: null,
      error: null, progress: "", selectedPoint: null,
    }),

  setFilter: (filter) => set({ filter }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
}));

export default useScanStore;
