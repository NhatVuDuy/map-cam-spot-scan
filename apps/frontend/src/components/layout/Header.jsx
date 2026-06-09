import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { version } from "../../../package.json";
import { useScanner } from "../../hooks/useScanner.js";

const S = {
  header: {
    display: "flex", alignItems: "center", gap: "0.5rem",
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
    padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap",
  },
  saveBtn: {
    fontSize: "0.75rem", color: "#34d399", background: "rgba(52,211,153,0.08)",
    border: "1px solid rgba(52,211,153,0.35)", borderRadius: "6px",
    padding: "4px 10px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
  },
  saveAsBtn: {
    fontSize: "0.75rem", color: "#94a3b8", background: "none",
    border: "1px solid #334155", borderRadius: "6px",
    padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap",
  },
  loadBtn: {
    fontSize: "0.75rem", color: "#fb923c", background: "rgba(251,146,60,0.08)",
    border: "1px solid rgba(251,146,60,0.35)", borderRadius: "6px",
    padding: "4px 10px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
  },
  fileName: {
    fontSize: "0.68rem", color: "#64748b", maxWidth: "160px",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    borderLeft: "1px solid #334155", paddingLeft: "0.5rem",
  },
};

export default function Header() {
  const navigate = useNavigate();
  const { points, sessionFileName, saveSession, saveSessionAs, loadSession } = useScanner();
  const fileInputRef = useRef(null);
  const hasData = points.length > 0;

  const handleLoad = (e) => {
    const file = e.target.files?.[0];
    if (file) loadSession(file);
    e.target.value = "";
  };

  return (
    <header style={S.header}>
      <span style={{ fontSize: "1.25rem" }}>📹</span>
      <span style={S.title}>Camera Placement Scanner</span>
      <span style={S.version}>v{version}</span>
      <div style={S.spacer} />

      {/* Active file name */}
      {sessionFileName && (
        <span style={S.fileName} title={sessionFileName}>
          📄 {sessionFileName}
        </span>
      )}

      {/* 💾 Save — writes back to same file if loaded via File System Access API,
          otherwise falls back to Save As dialog / download */}
      <button
        style={{ ...S.saveBtn, opacity: hasData ? 1 : 0.4 }}
        disabled={!hasData}
        onClick={saveSession}
        title={sessionFileName
          ? `Lưu đè vào "${sessionFileName}"`
          : "Lưu phiên làm việc ra file"}
      >
        💾 {sessionFileName ? "Lưu" : "Lưu"}
      </button>

      {/* ↗ Save As — always creates / prompts for a new file */}
      {hasData && (
        <button
          style={S.saveAsBtn}
          onClick={saveSessionAs}
          title="Lưu thành file mới"
        >↗ Lưu mới</button>
      )}

      {/* 📂 Load */}
      <button
        style={S.loadBtn}
        onClick={() => fileInputRef.current?.click()}
        title="Tải file phiên làm việc đã lưu"
      >📂 Tải</button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleLoad}
      />

      <button style={S.navBtn} onClick={() => navigate("/sys")}
        onMouseEnter={e => e.target.style.color = "#A78BFA"}
        onMouseLeave={e => e.target.style.color = "#64748b"}
      >📐 Arch</button>
      <button style={S.navBtn} onClick={() => navigate("/info")}
        onMouseEnter={e => e.target.style.color = "#38BDF8"}
        onMouseLeave={e => e.target.style.color = "#64748b"}
      >ℹ️ Info</button>
    </header>
  );
}
