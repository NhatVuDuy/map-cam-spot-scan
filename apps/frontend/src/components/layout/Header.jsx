import React from "react";
import { useNavigate } from "react-router-dom";
import { version } from "../../../package.json";

const S = {
  header: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0 1rem", height: "48px",
    background: "#1e293b", borderBottom: "1px solid #334155", flexShrink: 0,
  },
  title: { fontSize: "1rem", fontWeight: 600, color: "#f1f5f9", letterSpacing: "0.02em" },
  version: {
    fontSize: "0.65rem", background: "#334155", color: "#94a3b8",
    padding: "2px 7px", borderRadius: "4px", fontWeight: 600, letterSpacing: "0.04em",
  },
  spacer: { flex: 1 },
  navBtn: {
    fontSize: "0.75rem", color: "#64748b", background: "none",
    border: "1px solid #334155", borderRadius: "6px",
    padding: "4px 10px", cursor: "pointer",
  },
};

export default function Header() {
  const navigate = useNavigate();
  return (
    <header style={S.header}>
      <span style={{ fontSize: "1.25rem" }}>📹</span>
      <span style={S.title}>Camera Placement Scanner</span>
      <span style={S.version}>v{version}</span>
      <div style={S.spacer} />
      <button style={S.navBtn} onClick={() => navigate("/sys")}
        onMouseEnter={e => e.target.style.color = "#A78BFA"}
        onMouseLeave={e => e.target.style.color = "#64748b"}
      >📐 Arch</button>
      <button style={S.navBtn} onClick={() => navigate("/")}
        onMouseEnter={e => e.target.style.color = "#38BDF8"}
        onMouseLeave={e => e.target.style.color = "#64748b"}
      >← Home</button>
    </header>
  );
}
