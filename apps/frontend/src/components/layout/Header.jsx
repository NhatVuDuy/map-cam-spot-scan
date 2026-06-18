import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { version } from "../../../package.json";
import useScanStore from "../../store/scanStore.js";
import SessionsDrawer from "../sessions/SessionsDrawer.jsx";

const C = {
  bg2:    "#0b1425",
  border: "#1e3354",
  text:   "#e2e8f0",
  muted:  "#64748b",
  dim:    "#94a3b8",
  cyan:   "#38BDF8",
  violet: "#A78BFA",
  red:    "#F87171",
};

function ConfirmStopModal({ onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#0d1829", border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1.5rem", maxWidth: "340px", width: "90%", margin: "1rem" }}>
        <div style={{ fontSize: "0.88rem", color: C.text, marginBottom: "1.25rem", lineHeight: 1.6 }}>
          Dừng quét? Dữ liệu đã quét cho đến hiện tại sẽ được giữ lại.
        </div>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: "7px", padding: "0.45rem 1rem", color: C.muted, cursor: "pointer", fontSize: "0.82rem" }}>Tiếp tục quét</button>
          <button onClick={onConfirm} style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: "7px", padding: "0.45rem 1rem", color: C.red, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>⏹ Dừng ngay</button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const [showSessions, setShowSessions] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const { sessionDisplayName, sessionFilename, loading, cancelScan } = useScanStore();

  function handleStop() {
    cancelScan();
    setShowStopConfirm(false);
  }

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 200, flexShrink: 0,
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0 1rem", height: "48px",
        background: `${C.bg2}f4`,
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
      }}>
        {/* LEFT — logo + app name + version */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span onClick={() => navigate("/")} style={{ fontSize: "1.25rem", cursor: "pointer", flexShrink: 0 }}>📹</span>
          <div style={{ lineHeight: 1.2, cursor: "pointer", minWidth: 0 }} onClick={() => navigate("/")}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>CamSpot</div>
            <div style={{ fontSize: "0.58rem", color: C.muted, whiteSpace: "nowrap" }}>v{version}</div>
          </div>
        </div>

        {/* CENTER — feature name */}
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.dim, whiteSpace: "nowrap", textAlign: "center", padding: "0 1rem" }}>
          Quét vùng
        </div>

        {/* RIGHT — actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem" }}>
          {/* Session chip */}
          {sessionDisplayName && (
            <span
              onClick={() => setShowSessions(true)}
              title={sessionFilename ? `Đang mở: ${sessionDisplayName}` : `Chưa lưu: ${sessionDisplayName}`}
              style={{
                fontSize: "0.68rem", color: "#34d399",
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                borderRadius: "5px", padding: "3px 9px",
                maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >{sessionFilename ? "●" : "○"} {sessionDisplayName}</span>
          )}

          {/* Stop scan button — only when scanning */}
          {loading && (
            <button
              onClick={() => setShowStopConfirm(true)}
              style={{
                fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px",
                cursor: "pointer", fontWeight: 700,
                background: `${C.red}18`, border: `1px solid ${C.red}44`, color: C.red,
              }}
            >⏹ Dừng</button>
          )}

          {/* Sessions / projects */}
          <button
            onClick={() => setShowSessions(true)}
            style={{
              fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px",
              cursor: "pointer", fontWeight: 600,
              background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet,
            }}
          >🗂 Dự án</button>

          {/* Back to home */}
          <button
            onClick={() => navigate("/")}
            style={{
              fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px",
              cursor: "pointer", fontWeight: 600,
              background: "none", border: `1px solid ${C.border}`, color: C.muted,
            }}
          >← Home</button>
        </div>
      </nav>

      <SessionsDrawer open={showSessions} onClose={() => setShowSessions(false)} />
      {showStopConfirm && <ConfirmStopModal onConfirm={handleStop} onCancel={() => setShowStopConfirm(false)} />}
    </>
  );
}
