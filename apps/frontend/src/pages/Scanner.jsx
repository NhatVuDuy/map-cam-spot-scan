import React, { useState, useEffect } from "react";
import Header from "../components/layout/Header.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import MapView from "../components/map/MapView.jsx";

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
function FloatToggle({ side, icon, label, onClick }) {
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
        gap: "4px",
        width: "28px",
        padding: "14px 0",
        background: "rgba(10,22,40,0.92)",
        border: `1px solid ${C.border}`,
        [isLeft ? "borderLeft" : "borderRight"]: "none",
        borderRadius: isLeft ? "0 8px 8px 0" : "8px 0 0 8px",
        color: C.cyan,
        cursor: "pointer",
        backdropFilter: "blur(4px)",
        boxShadow: isLeft
          ? "2px 0 12px rgba(0,0,0,0.4)"
          : "-2px 0 12px rgba(0,0,0,0.4)",
        writingMode: "vertical-rl",
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ writingMode: "horizontal-tb", fontSize: "0.9rem" }}>
        {isLeft ? "›" : "‹"}
      </span>
      <span style={{ fontSize: "0.58rem", color: C.muted, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        {label}
      </span>
    </button>
  );
}

export default function Scanner() {
  const mobile = useMobile();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const openLeft = () => {
    if (mobile && !leftOpen) setRightOpen(false);
    setLeftOpen(true);
  };
  const closeLeft = () => setLeftOpen(false);

  const openRight = () => {
    if (mobile && !rightOpen) setLeftOpen(false);
    setRightOpen(true);
  };
  const closeRight = () => setRightOpen(false);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw",
      overflow: "hidden", background: C.bg,
    }}>
      <Header />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        {leftOpen && (
          <Sidebar onCollapse={closeLeft} />
        )}

        {/* ── Map center ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
          <MapView />

          {/* Float toggle buttons appear on map when panels are hidden */}
          {!leftOpen && (
            <FloatToggle side="left" icon="⚙" label="Cài đặt" onClick={openLeft} />
          )}
          {!rightOpen && (
            <FloatToggle side="right" icon="📋" label="Kết quả" onClick={openRight} />
          )}
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        {rightOpen && (
          <RightPanel onCollapse={closeRight} />
        )}

      </div>
    </div>
  );
}
