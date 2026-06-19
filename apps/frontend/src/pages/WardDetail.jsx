import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout, { BackBtn, NavBtn } from "../components/layout/AppLayout.jsx";
import MapView from "../components/map/MapView.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import useScanStore from "../store/scanStore.js";
import useCityStore from "../store/cityStore.js";
import useScanFileStore from "../store/scanFileStore.js";
import {
  readWardGeometry, writeWardGeometry,
  getScanFile, getScanFilesByCity, upsertScanFile,
} from "../utils/cityDB.js";
import { readWardGeometry as readWardGeometryLegacy } from "../utils/wardGeometryDB.js";

const C = {
  bg: "#060d1a", border: "#1e3354", muted: "#475569",
  cyan: "#38BDF8", amber: "#FBBF24", green: "#34D399", red: "#F87171",
  text: "#e2e8f0",
};

export default function WardDetail() {
  const wardCode   = sessionStorage.getItem("city-details-ward") || "";
  const navigate   = useNavigate();

  const [status, setStatus]       = useState("loading");
  const [wardName, setWardName]   = useState("");
  const [cachedStats, setCachedStats] = useState(null);
  const [rightOpen, setRightOpen] = useState(true);

  // Track which scan/ward we loaded so we can write back on user edits
  const loadedScanIdRef  = useRef(null);
  const loadedWardCodeRef = useRef(null);
  const loadedScanFileRef = useRef(null); // full scan file record
  const saveTimerRef     = useRef(null);

  const loadFromCache = useScanStore(s => s.loadFromCache);
  const setBoundary   = useScanStore(s => s.setBoundary);
  const initFromCache = useCityStore(s => s.initFromCache);

  // ── Debounced persist-back to IDB + scan file ──────────────────────
  const points    = useScanStore(s => s.points);
  const cameras   = useScanStore(s => s.cameras);
  const roads     = useScanStore(s => s.roads);
  const rawIntersections = useScanStore(s => s.rawIntersections);
  const rawWays          = useScanStore(s => s.rawWays);
  const rawSignalNodes   = useScanStore(s => s.rawSignalNodes);

  // Track whether initial load has completed (so we don't save the initial load)
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (!loadedScanIdRef.current || !loadedWardCodeRef.current) return;

    // Debounce 600ms
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const scanId   = loadedScanIdRef.current;
      const code     = loadedWardCodeRef.current;
      const scanFile = loadedScanFileRef.current;

      // 1. Write updated geometry back to IDB
      try {
        await writeWardGeometry(scanId, code, {
          points, cameras, roads,
          rawIntersections, rawWays, rawSignalNodes,
        });
      } catch (e) {
        console.warn("[WardDetail] geometry save failed:", e);
      }

      // 2. Update wardCounts byCat for this ward in the scan file
      if (scanFile) {
        try {
          const byCat = {};
          for (const p of points) {
            const k = p.blockId || p.category;
            if (k) byCat[k] = (byCat[k] || 0) + 1;
          }
          const updatedWardCounts = (scanFile.wardCounts || []).map(w =>
            w.code === code ? { ...w, byCat } : w
          );
          const updated = { ...scanFile, wardCounts: updatedWardCounts, savedAt: new Date().toISOString() };
          await upsertScanFile(updated);
          loadedScanFileRef.current = updated;
        } catch (e) {
          console.warn("[WardDetail] wardCounts update failed:", e);
        }
      }
    }, 600);

    return () => clearTimeout(saveTimerRef.current);
  }, [points, cameras, roads]);

  // ── Load ward data ──────────────────────────────────────────────────
  useEffect(() => {
    initFromCache();
    initialLoadDone.current = false;

    async function load() {
      setStatus("loading");

      const activeScanId = sessionStorage.getItem("city-report-scan");

      // --- Resolve scan file ---
      let scanFile = null;

      // 1. Try store (already in memory)
      const { scanFiles } = useScanFileStore.getState();
      if (activeScanId) {
        scanFile = scanFiles.find(f => f.id === activeScanId) || null;
      } else {
        scanFile = scanFiles[0] || null;
      }

      // 2. Fallback: load from IDB directly
      if (!scanFile && activeScanId) {
        scanFile = await getScanFile(activeScanId).catch(() => null);
      }

      // 3. Fallback: pick any scan for the city from IDB
      if (!scanFile) {
        const cityId = sessionStorage.getItem("city-report-city") || "hcm";
        const all = await getScanFilesByCity(cityId).catch(() => []);
        scanFile = all[0] || null;
        if (scanFile) {
          sessionStorage.setItem("city-report-scan", scanFile.id);
        }
      }

      // 4. Last resort: legacy localStorage-based city scan
      const wards = scanFile?.wardCounts || useCityStore.getState().wardResults || [];
      const wardStats = wards.find(w => w.code === wardCode);

      if (wards.length === 0) {
        setStatus("noscan");
        return;
      }

      if (wardStats) setCachedStats(wardStats);

      // --- Resolve geometry ---
      const scanId = activeScanId || scanFile?.id || null;
      let geo = scanId ? await readWardGeometry(scanId, wardCode).catch(() => null) : null;
      if (!geo) geo = await readWardGeometryLegacy(wardCode).catch(() => null);

      if (!geo) {
        setStatus("nogeom");
        return;
      }

      // --- Restore boundary from sessionStorage ---
      let boundary = null;
      try {
        const raw = sessionStorage.getItem("scanner-boundary");
        if (raw) {
          const feat = JSON.parse(raw);
          if (feat.properties?.code === wardCode) {
            boundary = feat;
            sessionStorage.removeItem("scanner-boundary");
          }
        }
      } catch {}
      if (boundary) setBoundary(boundary);

      loadFromCache({
        points:           geo.points           || [],
        cameras:          geo.cameras          || [],
        roads:            geo.roads            || [],
        rawIntersections: geo.rawIntersections || [],
        rawWays:          geo.rawWays          || [],
        rawSignalNodes:   geo.rawSignalNodes   || [],
        boundary,
      });

      // Store refs for save-back
      loadedScanIdRef.current   = scanId;
      loadedWardCodeRef.current = wardCode;
      loadedScanFileRef.current = scanFile;

      setWardName(wardStats?.name || wardCode);
      setStatus("loaded");

      // Allow save-back after a tick (avoid saving on initial load)
      setTimeout(() => { initialLoadDone.current = true; }, 300);
    }

    load();
  }, [wardCode]);

  // ── Status screens ──────────────────────────────────────────────────
  if (status === "noscan") return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontSize: "2rem" }}>📊</div>
      <div style={{ fontWeight: 700, color: C.text }}>Chưa có dữ liệu quét toàn TP.HCM</div>
      <div style={{ fontSize: "0.8rem", color: C.muted }}>Vào City Scan Hub để quét trước</div>
      <button onClick={() => navigate("/city")} style={{
        background: `linear-gradient(135deg,${C.cyan},${C.amber})`, border: "none",
        borderRadius: "8px", padding: "0.5rem 1.5rem", color: "#fff", fontWeight: 700, cursor: "pointer",
      }}>Đến City Scan Hub →</button>
    </div>
  );

  if (status === "nogeom") return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontSize: "2rem" }}>🔍</div>
      <div style={{ fontWeight: 700 }}>Phường <strong style={{ color: C.cyan }}>{cachedStats?.name || wardCode}</strong> chưa có geometry cache</div>
      {cachedStats && (
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          Đã có thống kê: {Object.values(cachedStats.byCat || {}).reduce((a,b)=>a+b,0)} điểm
        </div>
      )}
      <div style={{ fontSize: "0.75rem", color: C.muted, maxWidth: "400px", textAlign: "center" }}>
        Dùng "Export đầy đủ (bao gồm cache)" để chuyển máy với đầy đủ dữ liệu.
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
          padding: "0.5rem 1.25rem", color: C.muted, fontWeight: 600, cursor: "pointer",
        }}>← Quay lại</button>
        <button onClick={() => navigate("/city")} style={{
          background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`,
          borderRadius: "8px", padding: "0.5rem 1.25rem", color: C.cyan, fontWeight: 700, cursor: "pointer",
        }}>Quét lại</button>
      </div>
    </div>
  );

  const totalPoints = Object.values(cachedStats?.byCat || {}).reduce((a,b)=>a+b,0);

  return (
    <AppLayout
      featureName={status === "loading" ? "Đang tải..." : wardName}
      backButton={<BackBtn onClick={() => navigate("/city/map")}>← Bản đồ</BackBtn>}
      navButtons={
        <>
          {cachedStats && status === "loaded" && (
            <span style={{ fontSize: "0.65rem", color: C.green }}>✓ {totalPoints} điểm</span>
          )}
          {!rightOpen && (
            <NavBtn color={C.cyan} onClick={() => setRightOpen(true)}>Kết quả</NavBtn>
          )}
        </>
      }
      style={{ height: "100dvh" }}
    >
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
        <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
          {status === "loading" && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              color: C.cyan, fontSize: "0.85rem", fontWeight: 600,
            }}>⟳ Đang tải dữ liệu phường...</div>
          )}
          <MapView />
        </div>
        {rightOpen && <RightPanel onCollapse={() => setRightOpen(false)} />}
      </div>
    </AppLayout>
  );
}
