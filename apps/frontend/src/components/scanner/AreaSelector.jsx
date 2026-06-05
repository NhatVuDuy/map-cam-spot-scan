import React from "react";
import { useScanner } from "../../hooks/useScanner.js";

const C = {
  bg:     "#1e293b",
  border: "#334155",
  text:   "#e2e8f0",
  dim:    "#94a3b8",
  muted:  "#475569",
  cyan:   "#38BDF8",
};

const S = {
  label: { fontSize: "0.7rem", color: C.dim, marginBottom: "0.25rem", display: "block" },
  input: {
    width: "100%", padding: "0.35rem 0.5rem",
    background: C.bg, border: `1px solid ${C.border}`,
    borderRadius: "5px", color: C.text, fontSize: "0.83rem",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.6rem" },
  hint: { fontSize: "0.67rem", color: C.muted, marginTop: "0.2rem" },
};

function fmt(radiusM) {
  return radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`;
}

export default function AreaSelector() {
  const { area, setArea } = useScanner();

  const handleFloat = (field) => (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setArea({ [field]: val });
  };

  const handleRadius = (val) => {
    const v = Math.max(100, Math.min(15000, Number(val)));
    if (!isNaN(v)) setArea({ radiusM: v });
  };

  return (
    <div>
      {/* lat / lng */}
      <div style={S.row2}>
        <div>
          <label style={S.label}>Latitude</label>
          <input
            style={S.input}
            type="number" step="0.0001"
            value={area.lat}
            onChange={handleFloat("lat")}
            onFocus={e => e.target.style.borderColor = C.cyan}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
        <div>
          <label style={S.label}>Longitude</label>
          <input
            style={S.input}
            type="number" step="0.0001"
            value={area.lng}
            onChange={handleFloat("lng")}
            onFocus={e => e.target.style.borderColor = C.cyan}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
      </div>
      <p style={S.hint}>💡 Kéo ⊙ trên bản đồ để đặt tâm</p>

      {/* radius – slider + number input linked */}
      <div style={{ marginTop: "0.65rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
          <label style={S.label}>Bán kính</label>
          <span style={{ fontSize: "0.72rem", color: C.cyan, fontWeight: 600 }}>{fmt(area.radiusM)}</span>
        </div>

        {/* slider */}
        <input
          type="range" min={100} max={15000} step={100}
          value={area.radiusM}
          onChange={e => handleRadius(e.target.value)}
          style={{
            width: "100%", cursor: "pointer", accentColor: C.cyan,
            marginBottom: "0.45rem",
          }}
        />

        {/* number input */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input
            type="number" min={100} max={15000} step={100}
            value={area.radiusM}
            onChange={e => handleRadius(e.target.value)}
            onFocus={e => e.target.style.borderColor = C.cyan}
            onBlur={e => e.target.style.borderColor = C.border}
            style={{
              ...S.input,
              flex: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: C.muted, whiteSpace: "nowrap" }}>m</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
          <span style={{ fontSize: "0.65rem", color: C.muted }}>100 m</span>
          <span style={{ fontSize: "0.65rem", color: C.muted }}>15 km</span>
        </div>
      </div>
    </div>
  );
}
