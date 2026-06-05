import React, { useState, useEffect } from "react";
import Header from "../components/layout/Header.jsx";
import Sidebar from "../components/layout/Sidebar.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import MapView from "../components/map/MapView.jsx";

function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const C = { bg: "#060d1a", border: "#1e3354", text: "#e2e8f0", muted: "#475569", cyan: "#38BDF8", violet: "#A78BFA" };

function MobileTabBar({ tab, setTab }) {
  const tabs = [
    { id: "settings", icon: "⚙️", label: "Cài đặt" },
    { id: "map",      icon: "🗺",  label: "Bản đồ" },
    { id: "results",  icon: "📋", label: "Kết quả" },
  ];
  return (
    <div style={{
      display: "flex", borderTop: `1px solid ${C.border}`,
      background: "#0a1628", flexShrink: 0,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, padding: "0.6rem 0", border: "none", background: "transparent",
          borderTop: `2px solid ${tab === t.id ? C.cyan : "transparent"}`,
          color: tab === t.id ? C.cyan : C.muted,
          fontSize: "0.7rem", fontWeight: tab === t.id ? 700 : 400,
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
        }}>
          <span style={{ fontSize: "1.1rem" }}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Scanner() {
  const mobile = useMobile();
  const [mobileTab, setMobileTab] = useState("map");

  if (mobile) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", width: "100vw",
        overflow: "hidden", background: C.bg,
      }}>
        <Header />
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {/* Map always rendered (keeps state), hidden visually when not active */}
          <div style={{
            position: "absolute", inset: 0,
            visibility: mobileTab === "map" ? "visible" : "hidden",
            pointerEvents: mobileTab === "map" ? "auto" : "none",
          }}>
            <MapView />
          </div>
          {mobileTab === "settings" && (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <Sidebar />
            </div>
          )}
          {mobileTab === "results" && (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <RightPanel />
            </div>
          )}
        </div>
        <MobileTabBar tab={mobileTab} setTab={setMobileTab} />
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw",
      overflow: "hidden", background: C.bg,
    }}>
      <Header />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
          <MapView />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
