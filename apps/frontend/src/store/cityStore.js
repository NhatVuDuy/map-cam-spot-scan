import { create } from "zustand";
import {
  batchScanCity, aggregateWards,
  loadCityScanCache, saveCityScanCache, clearCityScanCache,
} from "../services/cityBatchScan.js";
import { clearAllWardGeometry } from "../utils/wardGeometryDB.js";

const TOTAL_WARDS = 168;

function deriveStatus(wards) {
  if (!wards?.length) return "idle";
  const failedCount = wards.filter(w => w.error).length;
  if (wards.length < TOTAL_WARDS || failedCount > 0) return "resumable";
  return "done";
}

let _abortController = null;

const useCityStore = create((set, get) => ({
  // ── persistent state (ward counts + scan metadata) ────────────────
  wardResults: null,   // array of ward scan results (counts only)
  savedAt: null,       // ISO timestamp of last save

  // ── transient scan state ──────────────────────────────────────────
  status: "idle",      // idle | resumable | running | done | error
  scanMode: "full",    // full | resume | retry
  progress: { current: 0, total: TOTAL_WARDS, wardName: "", pct: 0 },
  errorMsg: "",

  // ── computed ──────────────────────────────────────────────────────
  get aggregate() {
    const { wardResults } = get();
    return wardResults ? aggregateWards(wardResults) : null;
  },

  // ── init: load from localStorage cache ───────────────────────────
  initFromCache() {
    const cache = loadCityScanCache();
    if (!cache?.wards?.length) return;
    set({
      wardResults: cache.wards,
      savedAt: cache.savedAt ?? null,
      status: deriveStatus(cache.wards),
    });
  },

  // ── internal scan runner ──────────────────────────────────────────
  async _runScan({ mode, existing = [] }) {
    const running = get().status;
    if (running === "running") return;

    set({ status: "running", scanMode: mode, errorMsg: "" });
    _abortController = new AbortController();

    if (mode === "full") {
      clearCityScanCache();
      await clearAllWardGeometry();
      set({ wardResults: null, savedAt: null });
    }

    const onlyCodes = mode === "retry"
      ? existing.filter(w => w.error).map(w => w.code)
      : undefined;

    try {
      await batchScanCity({
        onlyCodes,
        existingResults: mode === "full" ? [] : existing,
        signal: _abortController.signal,
        onProgress: p => set({ progress: p }),
        onWardDone: (_ward, _i, all) => {
          const savedAt = Date.now();
          saveCityScanCache({ wards: all, savedAt });
          set({ wardResults: [...all], savedAt });
        },
      });

      if (!_abortController.signal.aborted) {
        const cache = loadCityScanCache();
        set({ status: deriveStatus(cache?.wards), wardResults: cache?.wards ?? get().wardResults });
      } else {
        const cache = loadCityScanCache();
        set({ status: deriveStatus(cache?.wards) });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        const cache = loadCityScanCache();
        set({ status: cache?.wards?.length ? "resumable" : "idle" });
      } else {
        set({ status: "error", errorMsg: err.message });
      }
    }
  },

  // ── public actions ─────────────────────────────────────────────────
  startFresh() { get()._runScan({ mode: "full", existing: [] }); },

  resume() {
    const cache = loadCityScanCache();
    get()._runScan({ mode: "resume", existing: cache?.wards || [] });
  },

  retryFailed() {
    const cache = loadCityScanCache();
    get()._runScan({ mode: "retry", existing: cache?.wards || [] });
  },

  stop() { _abortController?.abort(); },

  reset() {
    _abortController?.abort();
    clearCityScanCache();
    clearAllWardGeometry().catch(() => {});
    set({
      wardResults: null, savedAt: null,
      status: "idle", scanMode: "full",
      progress: { current: 0, total: TOTAL_WARDS, wardName: "", pct: 0 },
      errorMsg: "",
    });
  },
}));

export default useCityStore;
