import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { version } from "../../../package.json";
import useScanStore from "../../store/scanStore.js";
import SessionsDrawer from "../sessions/SessionsDrawer.jsx";

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
  sessionChip: {
    fontSize: "0.7rem", color: "#34d399",
    background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
    borderRadius: "5px", padding: "3px 9px",
    maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    cursor: "pointer",
  },
  btn: (color) => ({
    fontSize: "0.75rem", color, background: `${color}14`,
    border: `1px solid ${color}44`, borderRadius: "6px",
    padding: "4px 10px", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
  }),
  navBtn: {
    fontSize: "0.75rem", color: "#64748b", background: "none",
    border: "1px solid #334155", borderRadius: "6px",
    padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap",
  },
};

export default function Header() {
  const navigate = useNavigate();
  const [showSessions, setShowSessions] = useState(false);
  const { sessionDisplayName, sessionFilename } = useScanStore();

  return (
    <>
      <header style={S.header}>
        <span style={{ fontSize: "1.25rem" }}>📹</span>
        <span style={S.title}>Camera Placement Scanner</span>
        <span style={S.version}>v{version}</span>
        <div style={S.spacer} />

        {/* Current session chip — click to open drawer */}
        {sessionDisplayName ? (
          <span
            style={S.sessionChip}
            title={sessionFilename
              ? `Đang mở: ${sessionDisplayName}`
              : `Chưa lưu: ${sessionDisplayName}`}
            onClick={() => setShowSessions(true)}
          >
            {sessionFilename ? "●" : "○"} {sessionDisplayName}
          </span>
        ) : null}

        {/* Sessions drawer toggle */}
        <button
          style={S.btn("#A78BFA")}
          onClick={() => setShowSessions(true)}
          title="Quản lý dự án"
        >🗂 Dự án</button>

        <button style={S.navBtn} onClick={() => navigate("/plan")}
          onMouseEnter={e => e.target.style.color = "#FBBF24"}
          onMouseLeave={e => e.target.style.color = "#64748b"}
        >📊 Kế hoạch</button>
        <button style={S.navBtn} onClick={() => navigate("/sys")}
          onMouseEnter={e => e.target.style.color = "#A78BFA"}
          onMouseLeave={e => e.target.style.color = "#64748b"}
        >📐 Arch</button>
        <button style={S.navBtn} onClick={() => navigate("/info")}
          onMouseEnter={e => e.target.style.color = "#38BDF8"}
          onMouseLeave={e => e.target.style.color = "#64748b"}
        >ℹ️ Info</button>
      </header>

      <SessionsDrawer open={showSessions} onClose={() => setShowSessions(false)} />
    </>
  );
}
