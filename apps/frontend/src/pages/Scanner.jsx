import React, { useState, useEffect } from "react";
import Header from "../components/layout/Header.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import MapView from "../components/map/MapView.jsx";
import useScanStore from "../store/scanStore.js";
import { readWardGeometry } from "../utils/wardGeometryDB.js";

const C = {
  bg: "#060d1a", border: "#1e3354", muted: "#475569",
  cyan: "#38BDF8", violet: "#A78BFA",
};

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

/* Floating pill button that appears on the map edge when a panel is hidden */
function FloatToggle({ side, label, onClick }) {
  const isLeft = side === "left";
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        position: "absolute",
        top: "50%",
        [isLeft ? "left" : "right"]: 0,
        transform: "translateY(-50%)",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "28px",
        padding: "16px 0",
        background: "rgba(10,22,40,0.9)",
        border: `1px solid ${C.border}`,
        [isLeft ? "borderLeft" : "borderRight"]: "none",
        borderRadius: isLeft ? "0 8px 8px 0" : "8px 0 0 8px",
        color: C.cyan,
        cursor: "pointer",
        backdropFilter: "blur(4px)",
        boxShadow: isLeft ? "2px 0 12px rgba(0,0,0,0.5)" : "-2px 0 12px rgba(0,0,0,0.5)",
      }}
    >
      <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{isLeft ? "›" : "‹"}</span>
      {label.split("").map((ch, i) => (
        <span key={i} style={{ fontSize: "0.52rem", color: C.muted, lineHeight: 1.2 }}>{ch}</span>
      ))}
    </button>
  );
}

export default function Scanner() {
  const mobile = useMobile();
  const [leftOpen, setLeftOpen]   = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [wardBanner, setWardBanner] = useState(null); // { name, cachedStats }
  const setBoundary   = useScanStore(s => s.setBoundary);
  const runScan       = useScanStore(s => s.runScan);
  const loading       = useScanStore(s => s.loading);
  const loadFromCache = useScanStore(s => s.loadFromCache);

  // Pick up ward boundary passed from CityMap via sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("scanner-boundary");
    if (!raw) return;
    sessionStorage.removeItem("scanner-boundary");

    async function load() {
      try {
        const feature = JSON.parse(raw);
        // Load cached stats for the banner (from batch scan)
        let cachedStats = null;
        try {
          const cache = JSON.parse(localStorage.getItem("hcm-city-scan-v1") || "null");
          const wardData = cache?.wards?.find(w => w.code === feature.properties.code);
          if (wardData && !wardData.error) cachedStats = wardData;
        } catch {}

        const wardName = `${feature.properties.ward_type || ""} ${feature.properties.name}`.trim();
        setWardBanner({ name: wardName, cachedStats });
        setBoundary(feature);

        // Try to load geometry from IDB (saved by batch city scan) → skip re-scan
        const code = feature.properties.code;
        const cached = code ? await readWardGeometry(code).catch(() => null) : null;
        if (cached && cached.cameras?.length > 0) {
          loadFromCache({
            points:           cached.points           || [],
            cameras:          cached.cameras          || [],
            roads:            cached.roads            || [],
            rawIntersections: cached.rawIntersections || [],
            rawWays:          cached.rawWays          || [],
            rawSignalNodes:   cached.rawSignalNodes   || [],
            boundary:         feature,
          });
        } else {
          setTimeout(() => runScan(), 300);
        }
      } catch {}
    }

    load();
  }, []);

  // Clear banner once scan finishes
  useEffect(() => {
    if (!loading && wardBanner) {
      setTimeout(() => setWardBanner(null), 2000);
    }
  }, [loading]);

  const openLeft = () => {
    if (mobile) setRightOpen(false);
    setLeftOpen(true);
  };
  const openRight = () => {
    if (mobile) setLeftOpen(false);
    setRightOpen(true);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "var(--app-h, 100dvh)", width: "100vw",
      overflow: "hidden", background: C.bg,
    }}>
      <Header />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        {leftOpen && <Sidebar onCollapse={() => setLeftOpen(false)} />}

        {/* ── Map center ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
          {/* Ward drill-down banner */}
          {wardBanner && (
            <div style={{
              position: "absolute", top: "0.6rem", left: "50%", transform: "translateX(-50%)",
              zIndex: 30, background: "#0d1829ee", border: "1px solid #38BDF844",
              borderRadius: "8px", padding: "0.45rem 1rem",
              display: "flex", alignItems: "center", gap: "0.6rem",
              fontSize: "0.75rem", color: "#e2e8f0", whiteSpace: "nowrap",
              backdropFilter: "blur(8px)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}>
              {loading
                ? <span style={{ color: "#38BDF8" }}>⟳ Đang tải chi tiết vị trí —</span>
                : <span style={{ color: "#34D399" }}>✓ Đã tải —</span>}
              <strong style={{ color: "#FBBF24" }}>{wardBanner.name}</strong>
              {wardBanner.cachedStats && (
                <span style={{ color: "#64748b" }}>
                  · {wardBanner.cachedStats.camCount} cam · {wardBanner.cachedStats.roadKm.toFixed(1)} km đường
                  {" "}(từ dữ liệu quét toàn TP.HCM)
                </span>
              )}
              {!loading && (
                <button onClick={() => setWardBanner(null)} style={{
                  background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.9rem", padding: "0 2px",
                }}>×</button>
              )}
            </div>
          )}
          <MapView />
          {!leftOpen && (
            <FloatToggle side="left" label="Cài đặt" onClick={openLeft} />
          )}
          {!rightOpen && (
            <FloatToggle side="right" label="Kết quả" onClick={openRight} />
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        {rightOpen && <RightPanel onCollapse={() => setRightOpen(false)} />}

      </div>
    </div>
  );
}
