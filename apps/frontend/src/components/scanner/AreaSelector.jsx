import React from "react";
import { useScanner } from "../../hooks/useScanner.js";

const S = {
  row: { display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.4rem" },
  label: { fontSize: "0.72rem", color: "#94a3b8" },
  input: {
    width: "100%", padding: "0.35rem 0.5rem",
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: "4px", color: "#e2e8f0", fontSize: "0.85rem",
    boxSizing: "border-box",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" },
  hint: { fontSize: "0.68rem", color: "#475569", marginTop: "0.2rem" },
};

export default function AreaSelector() {
  const { area, setArea } = useScanner();

  const handle = (field) => (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setArea({ [field]: val });
  };

  return (
    <div>
      <div style={S.row2}>
        <div style={S.row}>
          <label style={S.label}>Latitude</label>
          <input style={S.input} type="number" step="0.0001" value={area.lat} onChange={handle("lat")} />
        </div>
        <div style={S.row}>
          <label style={S.label}>Longitude</label>
          <input style={S.input} type="number" step="0.0001" value={area.lng} onChange={handle("lng")} />
        </div>
      </div>
      <p style={S.hint}>Kéo ⊙ trên bản đồ để chọn tâm</p>
      <div style={S.row}>
        <label style={S.label}>Bán kính: {area.radiusM >= 1000 ? `${(area.radiusM / 1000).toFixed(1)}km` : `${area.radiusM}m`}</label>
        <input
          style={{ ...S.input, padding: "0.25rem 0", cursor: "pointer" }}
          type="range" min={100} max={15000} step={100}
          value={area.radiusM}
          onChange={handle("radiusM")}
        />
      </div>
    </div>
  );
}
