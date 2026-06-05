import React, { useState } from "react";
import BoundarySelector from "../scanner/BoundarySelector.jsx";
import AdminSearch from "../scanner/AdminSearch.jsx";
import AreaSelector from "../scanner/AreaSelector.jsx";
import ScanButton from "../scanner/ScanButton.jsx";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";
import { useScanner } from "../../hooks/useScanner.js";

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

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "0.62rem", fontWeight: 700, color: C.muted,
      textTransform: "uppercase", letterSpacing: "0.1em",
      marginBottom: "0.5rem",
    }}>{children}</div>
  );
}

function Sep({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.65rem 0" }}>
      <div style={{ flex: 1, height: "1px", background: C.border }} />
      <span style={{ fontSize: "0.65rem", color: C.muted, whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: C.border }} />
    </div>
  );
}

/* ─── query category filter (what to scan) ────────────────────────────────── */
function QueryCategories() {
  const { categories, setCategories } = useScanner();
  const allKeys = Object.keys(CATEGORIES);

  const toggle = (key) => {
    if (categories.includes(key)) setCategories(categories.filter(k => k !== key));
    else setCategories([...categories, key]);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.45rem" }}>
        <button
          onClick={() => setCategories(allKeys)}
          style={{ fontSize: "0.62rem", padding: "2px 7px", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: "4px", cursor: "pointer" }}
        >Tất cả</button>
        <button
          onClick={() => setCategories([])}
          style={{ fontSize: "0.62rem", padding: "2px 7px", background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: "4px", cursor: "pointer" }}
        >Bỏ chọn</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.1rem 0.25rem" }}>
        {allKeys.map((key) => {
          const cat = CATEGORIES[key];
          const checked = categories.includes(key);
          return (
            <label key={key} style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.22rem 0.3rem", borderRadius: "4px",
              cursor: "pointer",
              background: checked ? `${cat.color}0e` : "transparent",
              transition: "background 0.12s",
            }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(key)}
                style={{ cursor: "pointer", accentColor: cat.color, margin: 0, flexShrink: 0 }}
              />
              <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
              <span style={{
                fontSize: "0.72rem",
                color: checked ? C.text : C.muted,
                userSelect: "none",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{cat.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* ─── main sidebar ────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const [mode, setMode] = useState("radius"); // "boundary" | "radius"
  const boundary = useScanStore((s) => s.boundary);

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
          <ModeTab label="Địa giới HC" icon="🗺" active={mode === "boundary" ? "boundary" : false} onClick={() => setMode("boundary")} />
          <ModeTab label="Điểm & Bán kính" icon="📍" active={mode === "radius" ? "radius" : false} onClick={() => setMode("radius")} />
        </div>
      </div>

      {/* ── scroll area ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: 0 }}>

        {/* ── area inputs ─────────────────────────────────────────────── */}
        {mode === "boundary" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "0.75rem" }}>
            <div style={{
              padding: "0.55rem 0.65rem",
              background: `${C.violet}10`, border: `1px solid ${C.violet}30`, borderRadius: "6px",
              fontSize: "0.73rem", color: C.dim, lineHeight: 1.5,
            }}>
              Tìm theo <strong style={{ color: C.violet }}>ranh giới hành chính</strong>.<br />
              Overpass lọc POI chính xác trong polygon.
            </div>
            <div>
              <SectionLabel>Chọn quận / huyện (HCM)</SectionLabel>
              <BoundarySelector />
            </div>
            {boundary ? (
              <div style={{
                padding: "0.4rem 0.6rem", background: C.bg, border: `1px solid ${C.border}`, borderRadius: "6px",
                fontSize: "0.71rem", color: C.dim,
              }}>
                <span style={{ color: C.violet, fontWeight: 600 }}>✓ {boundary.properties.name}</span>
                <span style={{ color: C.muted }}> — scan trong polygon</span>
              </div>
            ) : (
              <div style={{
                padding: "0.4rem 0.6rem", background: C.bg, border: `1px dashed ${C.border}`, borderRadius: "6px",
                fontSize: "0.71rem", color: C.muted, textAlign: "center",
              }}>Chưa chọn ranh giới</div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "0.75rem" }}>
            <div style={{
              padding: "0.55rem 0.65rem",
              background: `${C.cyan}0e`, border: `1px solid ${C.cyan}28`, borderRadius: "6px",
              fontSize: "0.73rem", color: C.dim, lineHeight: 1.5,
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

        {/* ── divider ─────────────────────────────────────────────────── */}
        <div style={{ height: "1px", background: C.border, margin: "0 -0.75rem 0.75rem" }} />

        {/* ── query categories (what to scan) ─────────────────────────── */}
        <div>
          <SectionLabel>Loại địa điểm cần quét</SectionLabel>
          <QueryCategories />
        </div>

      </div>

      {/* ── scan button ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0.65rem 0.75rem", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <ScanButton />
      </div>
    </aside>
  );
}
