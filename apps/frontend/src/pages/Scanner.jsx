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
      height: "100vh", width: "100vw",
      overflow: "hidden", background: C.bg,
    }}>
      <Header />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        {leftOpen && <Sidebar onCollapse={() => setLeftOpen(false)} />}

        {/* ── Map center ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, position: "relative", minWidth: 0, overflow: "hidden" }}>
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
