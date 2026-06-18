import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout, { BackBtn, NavBtn } from "../components/layout/AppLayout.jsx";
import MapView from "../components/map/MapView.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import useScanStore from "../store/scanStore.js";
import useCityStore from "../store/cityStore.js";
import useScanFileStore from "../store/scanFileStore.js";
import { readWardGeometry as readWardGeometryCityDB } from "../utils/cityDB.js";
import { readWardGeometry as readWardGeometryLegacy } from "../utils/wardGeometryDB.js";

const C = {
  bg: "#060d1a", border: "#1e3354", muted: "#475569",
  cyan: "#38BDF8", amber: "#FBBF24", green: "#34D399", red: "#F87171",
  text: "#e2e8f0",
};

export default function WardDetail() {
  const code    = sessionStorage.getItem("city-details-ward") || "";
  const navigate  = useNavigate();
  const [status, setStatus] = useState("loading"); // loading | loaded | noscan | nogeom
  const [wardName, setWardName] = useState("");
  const [cachedStats, setCachedStats] = useState(null);
  const [rightOpen, setRightOpen] = useState(true);

  const loadFromCache = useScanStore(s => s.loadFromCache);
  const setBoundary   = useScanStore(s => s.setBoundary);
  const initFromCache = useCityStore(s => s.initFromCache);

  useEffect(() => {
    initFromCache();

    async function load() {
      setStatus("loading");

      // Try new scan file store first
      const { scanFiles } = useScanFileStore.getState();
      const activeScanId = sessionStorage.getItem("city-report-scan");
      const activeFile = activeScanId ? scanFiles.find(f => f.id === activeScanId) : scanFiles[0];
      const wards = activeFile?.wardCounts || useCityStore.getState().wardResults || [];
      const wardStats = wards?.find(w => w.code === code);

      if (!wardStats && (!wards || wards.length === 0)) {
        // No city scan at all
        setStatus("noscan");
        return;
      }

      if (wardStats) setCachedStats(wardStats);

      // Read geometry: try new cityDB (scanId-scoped) first, fallback to legacy wardGeometryDB
      const scanId = sessionStorage.getItem("city-report-scan");
      let geo = scanId ? await readWardGeometryCityDB(scanId, code).catch(() => null) : null;
      if (!geo) geo = await readWardGeometryLegacy(code).catch(() => null);
      if (!geo) {
        setStatus("nogeom");
        return;
      }

      // Attempt to recover boundary from sessionStorage (set by CityMap click)
      let boundary = null;
      try {
        const raw = sessionStorage.getItem("scanner-boundary");
        if (raw) {
          const feat = JSON.parse(raw);
          if (feat.properties?.code === code) {
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
        boundary:         boundary,
      });

      // Try to get ward name from scan results or fallback to code
      setWardName(wardStats?.name || code);
      setStatus("loaded");
    }

    load();
  }, [code]);

  if (status === "noscan") {
    return (
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
  }

  if (status === "nogeom") {
    return (
      <div style={{ background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "2rem" }}>🔍</div>
        <div style={{ fontWeight: 700 }}>Phường <strong style={{ color: C.cyan }}>{cachedStats?.name || code}</strong> chưa có geometry cache</div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          {cachedStats ? `Đã có thống kê: ${Object.values(cachedStats.byCat || {}).reduce((a,b)=>a+b,0)} điểm` : ""}
        </div>
        <div style={{ fontSize: "0.75rem", color: C.muted, maxWidth: "400px", textAlign: "center" }}>
          Geometry được lưu khi quét từ v2.8.0+. Nếu đã quét trước đó, vui lòng quét lại toàn bộ TP.HCM.
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => navigate(-1)} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: "8px",
            padding: "0.5rem 1.25rem", color: C.muted, fontWeight: 600, cursor: "pointer",
          }}>← Quay lại</button>
          <button onClick={() => navigate("/city")} style={{
            background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`,
            borderRadius: "8px", padding: "0.5rem 1.25rem", color: C.cyan, fontWeight: 700, cursor: "pointer",
          }}>Quét lại toàn TP.HCM</button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      featureName={status === "loading" ? "Đang tải..." : wardName}
      backButton={<BackBtn onClick={() => navigate("/city/map")}>← Bản đồ</BackBtn>}
      navButtons={
        <>
          {cachedStats && status === "loaded" && (
            <span style={{ fontSize: "0.65rem", color: C.green }}>✓ {Object.values(cachedStats.byCat || {}).reduce((a,b)=>a+b,0)} điểm</span>
          )}
          {!rightOpen && (
            <NavBtn color={C.cyan} onClick={() => setRightOpen(true)}>Kết quả</NavBtn>
          )}
        </>
      }
      style={{ height: "100dvh" }}
    >
      {/* ── Map + right panel ────────────────────────────────────────── */}
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
