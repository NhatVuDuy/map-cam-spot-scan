import { create } from "zustand";
import {
  getScanFilesByCity, getScanFile, upsertScanFile, deleteScanFile as dbDeleteScanFile,
  getFoldersByCity, upsertFolder, deleteFolder as dbDeleteFolder,
  writeWardGeometry, clearWardGeometryForScan, seedBuiltInCities,
} from "../utils/cityDB.js";
import { batchScanCityGeneric } from "../services/cityBatchScan.js";

let _abort = null;

const useScanFileStore = create((set, get) => ({
  // ── City context ──────────────────────────────────────────────────
  activeCityId: null,
  activeCityMeta: null,   // { id, name, geojsonPath, geojsonData, wardCount }

  // ── File tree ─────────────────────────────────────────────────────
  scanFiles: [],
  folders:   [],
  loadingScanFiles: false,

  // ── Active scan ───────────────────────────────────────────────────
  activeScanId: null,
  status:   "idle",       // idle | running | resumable | done | error
  scanMode: "full",       // full | resume | retry
  progress: { current: 0, total: 0, wardName: "", pct: 0 },
  errorMsg: "",

  // ── Load city context ─────────────────────────────────────────────
  async setActiveCity(cityMeta) {
    set({ activeCityId: cityMeta.id, activeCityMeta: cityMeta, scanFiles: [], folders: [] });
    await get().loadScanFiles();
  },

  async loadScanFiles() {
    const { activeCityId } = get();
    if (!activeCityId) return;
    set({ loadingScanFiles: true });
    const [scanFiles, folders] = await Promise.all([
      getScanFilesByCity(activeCityId),
      getFoldersByCity(activeCityId),
    ]);
    set({ scanFiles, folders, loadingScanFiles: false });
  },

  // ── Folder management ─────────────────────────────────────────────
  async createFolder(name) {
    const { activeCityId } = get();
    const folder = { id: `folder_${activeCityId}_${Date.now()}`, cityId: activeCityId, name, createdAt: new Date().toISOString() };
    await upsertFolder(folder);
    await get().loadScanFiles();
  },

  async renameFolder(id, name) {
    const folders = get().folders;
    const f = folders.find(x => x.id === id);
    if (!f) return;
    await upsertFolder({ ...f, name });
    await get().loadScanFiles();
  },

  async deleteFolder(id) {
    await dbDeleteFolder(id, null);
    await get().loadScanFiles();
  },

  // ── Scan file management ──────────────────────────────────────────
  async renameScanFile(id, name) {
    const sf = await getScanFile(id);
    if (!sf) return;
    await upsertScanFile({ ...sf, name });
    await get().loadScanFiles();
  },

  async moveScanFileToFolder(scanFileId, folderId) {
    const sf = await getScanFile(scanFileId);
    if (!sf) return;
    await upsertScanFile({ ...sf, folderId: folderId ?? null });
    await get().loadScanFiles();
  },

  async deleteScanFile(id) {
    await dbDeleteScanFile(id);
    if (get().activeScanId === id) set({ activeScanId: null, status: "idle" });
    await get().loadScanFiles();
  },

  // ── Scan runner ───────────────────────────────────────────────────
  async _runScan({ scanId, mode, existingResults = [] }) {
    const { activeCityMeta } = get();
    if (!activeCityMeta) return;

    set({ status: "running", scanMode: mode, activeScanId: scanId, errorMsg: "",
          progress: { current: 0, total: activeCityMeta.wardCount || 168, wardName: "", pct: 0 } });
    _abort = new AbortController();

    const onWardDone = async (_ward, _i, all) => {
      const now = new Date().toISOString();
      await upsertScanFile({
        id: scanId, cityId: activeCityMeta.id,
        name: get().scanFiles.find(f => f.id === scanId)?.name || "Lần quét mới",
        folderId: get().scanFiles.find(f => f.id === scanId)?.folderId ?? null,
        createdAt: get().scanFiles.find(f => f.id === scanId)?.createdAt || now,
        savedAt: now, status: "running",
        wardCounts: all,
      });
      await get().loadScanFiles();
    };

    try {
      const results = await batchScanCityGeneric({
        scanId,
        cityId: activeCityMeta.id,
        geojsonPath: activeCityMeta.geojsonPath ?? null,
        geojsonData: activeCityMeta.geojsonData ?? null,
        onlyCodes: mode === "retry" ? existingResults.filter(w => w.error).map(w => w.code) : undefined,
        existingResults: mode === "full" ? [] : existingResults,
        signal: _abort.signal,
        onProgress: p => set({ progress: p }),
        onWardDone,
        onWriteGeometry: writeWardGeometry,
      });

      const finalStatus = deriveStatus(results, activeCityMeta.wardCount);
      await upsertScanFile({
        ...(await getScanFile(scanId)),
        status: finalStatus,
        savedAt: new Date().toISOString(),
        wardCounts: results,
      });
      set({ status: _abort.signal.aborted ? finalStatus : finalStatus });
    } catch (err) {
      if (err.name === "AbortError") {
        set({ status: "resumable" });
      } else {
        set({ status: "error", errorMsg: err.message });
      }
    }
    await get().loadScanFiles();
  },

  async startFresh() {
    const { activeCityMeta, activeCityId } = get();
    if (!activeCityMeta) return;
    const scanId = `${activeCityId}_${Date.now()}`;
    const now = new Date().toISOString();
    // Create scan file record immediately
    await upsertScanFile({ id: scanId, cityId: activeCityId, name: "Lần quét mới", folderId: null, createdAt: now, savedAt: now, status: "running", wardCounts: [] });
    await clearWardGeometryForScan(scanId);
    await get().loadScanFiles();
    await get()._runScan({ scanId, mode: "full", existingResults: [] });
  },

  async resume(scanId) {
    const sf = await getScanFile(scanId);
    if (!sf) return;
    await get()._runScan({ scanId, mode: "resume", existingResults: sf.wardCounts || [] });
  },

  async retryFailed(scanId) {
    const sf = await getScanFile(scanId);
    if (!sf) return;
    await get()._runScan({ scanId, mode: "retry", existingResults: sf.wardCounts || [] });
  },

  stopScan() { _abort?.abort(); },
}));

function deriveStatus(wards, total = 168) {
  if (!wards?.length) return "idle";
  const failed = wards.filter(w => w.error).length;
  if (wards.length < total || failed > 0) return "resumable";
  return "done";
}

export default useScanFileStore;
