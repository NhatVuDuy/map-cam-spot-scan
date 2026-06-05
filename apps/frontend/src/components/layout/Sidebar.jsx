import React, { useState } from "react";
import BoundarySelector from "../scanner/BoundarySelector.jsx";
import AdminSearch from "../scanner/AdminSearch.jsx";
import AreaSelector from "../scanner/AreaSelector.jsx";
import ScanButton from "../scanner/ScanButton.jsx";
import useScanStore from "../../store/scanStore.js";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#0f172a",
  bg2:    "#1e293b",
  border: "#1e3354",
  text:   "#e2e8f0",
  dim:    "#94a3b8",
  muted:  "#475569",
  cyan:   "#38BDF8",
  violet: "#A78BFA",
};

/* ─── mode tab ────────────────────────────────────────────────────────────── */
function ModeTab({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "0.5rem 0.25rem",
      background: active ? `${active === "boundary" ? C.violet : C.cyan}18` : "transparent",
      border: "none",
      borderBottom: `2px solid ${active ? (active === "boundary" ? C.violet : C.cyan) : "transparent"}`,
      color: active ? (active === "boundary" ? C.violet : C.cyan) : C.muted,
      fontSize: "0.75rem", fontWeight: active ? 700 : 400,
      cursor: "pointer", transition: "all 0.15s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
    }}>
      <span>{icon}</span>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

/* ─── section label ───────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "0.62rem", fontWeight: 700, color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.1em",
      marginBottom: "0.5rem",
    }}>{children}</div>
  );
}

/* ─── separator ──────────────────────────────────────────────────────────── */
function Sep({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.75rem 0" }}>
      <div style={{ flex: 1, height: "1px", background: C.border }} />
      <span style={{ fontSize: "0.65rem", color: C.muted, whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: C.border }} />
    </div>
  );
}

/* ─── main sidebar ────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const [mode, setMode] = useState("radius"); // "boundary" | "radius"
  const boundary = useScanStore((s) => s.boundary);
  const setBoundary = useScanStore((s) => s.setBoundary);

  const switchToRadius = () => {
    setMode("radius");
  };
  const switchToBoundary = () => {
    setMode("boundary");
  };

  return (
    <aside style={{
      width: "250px", flexShrink: 0,
      background: C.bg,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>

      {/* ── mode toggle ─────────────────────────────────────────────────── */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ padding: "0.65rem 0.75rem 0.4rem", fontSize: "0.65rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Chế độ quét
        </div>
        <div style={{ display: "flex" }}>
          <ModeTab
            label="Địa giới HC"
            icon="🗺"
            active={mode === "boundary" ? "boundary" : false}
            onClick={switchToBoundary}
          />
          <ModeTab
            label="Điểm & Bán kính"
            icon="📍"
            active={mode === "radius" ? "radius" : false}
            onClick={switchToRadius}
          />
        </div>
      </div>

      {/* ── scroll area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.85rem 0.75rem", display: "flex", flexDirection: "column", gap: 0 }}>

        {mode === "boundary" ? (
          /* ── BOUNDARY MODE ──────────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{
              padding: "0.65rem 0.75rem",
              background: `${C.violet}10`,
              border: `1px solid ${C.violet}30`,
              borderRadius: "6px",
              fontSize: "0.74rem", color: C.dim, lineHeight: 1.5,
            }}>
              Tìm theo <strong style={{ color: C.violet }}>ranh giới hành chính</strong>.<br />
              Overpass sẽ lọc POI chính xác trong polygon.
            </div>

            <div>
              <SectionLabel>Chọn quận / huyện (HCM)</SectionLabel>
              <BoundarySelector />
            </div>

            {boundary && (
              <div style={{
                padding: "0.5rem 0.65rem",
                background: "#0f172a",
                border: `1px solid ${C.border}`,
                borderRadius: "6px",
                fontSize: "0.72rem", color: C.dim,
              }}>
                <div style={{ color: C.violet, fontWeight: 600, marginBottom: "0.25rem" }}>
                  ✓ Đã chọn: {boundary.properties.name}
                </div>
                <div style={{ color: C.muted }}>Scan sẽ giới hạn trong polygon ranh giới</div>
              </div>
            )}

            {!boundary && (
              <div style={{
                padding: "0.5rem 0.65rem",
                background: "#0f172a",
                border: `1px dashed ${C.border}`,
                borderRadius: "6px",
                fontSize: "0.72rem", color: C.muted, textAlign: "center",
              }}>
                Chưa chọn ranh giới
              </div>
            )}
          </div>
        ) : (
          /* ── RADIUS MODE ────────────────────────────────────────────── */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{
              padding: "0.65rem 0.75rem",
              background: `${C.cyan}0e`,
              border: `1px solid ${C.cyan}28`,
              borderRadius: "6px",
              fontSize: "0.74rem", color: C.dim, lineHeight: 1.5,
            }}>
              Quét trong <strong style={{ color: C.cyan }}>bán kính vòng tròn</strong>.<br />
              Kéo ⊙ trên map để đặt tâm.
            </div>

            <div>
              <SectionLabel>Tìm theo tên (Nominatim)</SectionLabel>
              <AdminSearch />
            </div>

            <Sep label="hoặc nhập thủ công" />

            <div>
              <SectionLabel>Tọa độ &amp; bán kính</SectionLabel>
              <AreaSelector />
            </div>
          </div>
        )}
      </div>

      {/* ── scan button ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0.75rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <ScanButton />
      </div>
    </aside>
  );
}
