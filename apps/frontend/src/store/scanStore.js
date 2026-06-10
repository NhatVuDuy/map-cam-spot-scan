import { create } from "zustand";
import { browserScan } from "../services/browserScan.js";
import { planAllCameras } from "../algorithms/cameraPlacement.js";
import { CATEGORIES } from "../utils/categories.js";
import { importSession } from "../utils/sessionFile.js";
import {
  listSessions, readSession, writeSession,
  deleteSession, renameSession, downloadSession,
} from "../utils/opfs.js";

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

  // --- Session (OPFS project folder) ---
  sessionFilename: null,   // current session filename in OPFS
  sessionDisplayName: null,
  sessions: [],            // list cache [{filename, displayName, savedAt, ...}]
  sessionsLoading: false,

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

  setIntersectionOverride: (id, override) => {
    const prevOverrides = get().intersectionOverrides;
    const newEntry = { ...(prevOverrides[id] || {}), ...override };
    const newOverrides = { ...prevOverrides, [id]: newEntry };

    const points = get().points.map(p => {
      if (p.id !== id || p.category !== "intersection") return p;
      const patched = { ...p, ...newEntry };
      if (newEntry.intersectionShape) {
        patched.name = SHAPE_LABEL[newEntry.intersectionShape] || p.name;
      }
      return patched;
    });

    set({ intersectionOverrides: newOverrides, points });

    const { rawIntersections, rawWays, rawSignalNodes } = get();
    if (rawIntersections.length > 0) {
      const enriched = rawIntersections.map(ix =>
        newOverrides[ix.id] ? { ...ix, ...newOverrides[ix.id] } : ix
      );
      const cameras = planAllCameras({ intersections: enriched, ways: rawWays, signalNodes: rawSignalNodes });
      set({ cameras });
    }
  },

  // ─── Scan ────────────────────────────────────────────────────────────────
  runScan: async () => {
    const { area, categories, boundary, maxResults } = get();
    set({
      loading: true, error: null, progress: "Đang khởi động...",
      points: [], roads: [], cameras: [],
      rawIntersections: [], rawWays: [], rawSignalNodes: [],
      intersectionOverrides: {},
      sessionFilename: null, sessionDisplayName: null,
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

  // ─── OPFS session management ──────────────────────────────────────────────

  /** Refresh the in-memory sessions list from OPFS. */
  refreshSessions: async () => {
    set({ sessionsLoading: true });
    const sessions = await listSessions();
    set({ sessions, sessionsLoading: false });
  },

  /**
   * Save current state to OPFS.
   * If sessionFilename exists → overwrite. Otherwise prompt for a name
   * (or auto-generate one) and create a new session.
   */
  saveToSystem: async (displayName) => {
    const state = get();
    const name = displayName
      || state.sessionDisplayName
      || `Phiên ${new Date().toLocaleString("vi-VN")}`;
    const filename = state.sessionFilename || null;

    try {
      const saved = await writeSession(filename || name, state, name);
      set({ sessionFilename: saved, sessionDisplayName: name });
      await get().refreshSessions();
      set({ progress: `Đã lưu "${name}"` });
    } catch (e) {
      set({ error: `Lưu thất bại: ${e.message}` });
    }
  },

  /** Open a session from OPFS and restore state. */
  loadFromSystem: async (filename) => {
    set({ loading: true, error: null, progress: "Đang mở phiên..." });
    try {
      const data = await readSession(filename);
      set({
        area:      data.area   ?? get().area,
        boundary:  data.boundary ?? null,
        points:    data.points  || [],
        roads:     data.roads   || [],
        cameras:   data.cameras || [],
        bbox:      data.bbox    || null,
        stats:     data.stats   || {},
        rawIntersections:      data.rawIntersections   || [],
        rawWays:               data.rawWays            || [],
        rawSignalNodes:        data.rawSignalNodes      || [],
        intersectionOverrides: data.intersectionOverrides || {},
        sessionFilename:    filename,
        sessionDisplayName: data._name || filename.replace(/\.json$/, ""),
        loading: false, error: null,
        progress: `Đã mở "${data._name || filename}"`,
        selectedPoint: null, filter: null,
      });
    } catch (e) {
      set({ loading: false, error: `Mở thất bại: ${e.message}` });
    }
  },

  /** Delete a session from OPFS. */
  deleteFromSystem: async (filename) => {
    try {
      await deleteSession(filename);
      const { sessionFilename } = get();
      if (sessionFilename === filename) {
        set({ sessionFilename: null, sessionDisplayName: null });
      }
      await get().refreshSessions();
    } catch (e) {
      set({ error: `Xoá thất bại: ${e.message}` });
    }
  },

  /** Rename a session in OPFS. */
  renameInSystem: async (filename, newName) => {
    try {
      const newFilename = await renameSession(filename, newName);
      const { sessionFilename } = get();
      if (sessionFilename === filename) {
        set({ sessionFilename: newFilename, sessionDisplayName: newName });
      }
      await get().refreshSessions();
    } catch (e) {
      set({ error: `Đổi tên thất bại: ${e.message}` });
    }
  },

  /** Download (export) a session from OPFS to the user's filesystem. */
  exportFromSystem: async (filename) => {
    try {
      await downloadSession(filename);
    } catch (e) {
      set({ error: `Xuất thất bại: ${e.message}` });
    }
  },

  /**
   * Load an external file (from outside OPFS).
   * Does NOT auto-add to OPFS — user can click "Lưu" afterward to add it.
   */
  loadExternalFile: async (file) => {
    set({ loading: true, error: null, progress: "Đang đọc file..." });
    try {
      const state = await importSession(file);
      const count = state.points.length;
      set({
        ...state,
        sessionFilename: null,      // not in OPFS yet
        sessionDisplayName: state._filename ?? file.name ?? null,
        loading: false, error: null,
        progress: `Đã tải "${state._filename ?? file.name}" (${count} địa điểm)`,
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
      sessionFilename: null, sessionDisplayName: null,
      error: null, progress: "", selectedPoint: null,
    }),

  setFilter: (filter) => set({ filter }),
  setHoveredPoint: (hoveredPoint) => set({ hoveredPoint }),
  setSelectedPoint: (selectedPoint) => set({ selectedPoint }),
}));

export default useScanStore;
