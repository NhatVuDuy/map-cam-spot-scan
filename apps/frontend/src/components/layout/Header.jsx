import React from "react";
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
};

export default function Header() {
  return (
    <header style={S.header}>
      <span style={{ fontSize: "1.25rem" }}>📹</span>
      <span style={S.title}>Camera Placement Scanner</span>
      <span style={S.version}>v{version}</span>
    </header>
  );
}
