import React from "react";
import { useScanner } from "../../hooks/useScanner.js";

const styles = {
  row: { display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.4rem" },
  label: { fontSize: "0.72rem", color: "#94a3b8" },
  input: {
    width: "100%",
    padding: "0.35rem 0.5rem",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "0.85rem",
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" },
};

export default function AreaSelector() {
  const { area, setArea } = useScanner();

  const handle = (field) => (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setArea({ [field]: val });
  };

  return (
    <div>
      <div style={styles.row2}>
        <div style={styles.row}>
          <label style={styles.label}>Latitude</label>
          <input
            style={styles.input}
            type="number"
            step="0.0001"
            value={area.lat}
            onChange={handle("lat")}
          />
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Longitude</label>
          <input
            style={styles.input}
            type="number"
            step="0.0001"
            value={area.lng}
            onChange={handle("lng")}
          />
        </div>
      </div>
      <div style={styles.row}>
        <label style={styles.label}>Radius (metres): {area.radiusM}m</label>
        <input
          style={{ ...styles.input, padding: "0.25rem 0" }}
          type="range"
          min={100}
          max={15000}
          step={100}
          value={area.radiusM}
          onChange={handle("radiusM")}
        />
      </div>
    </div>
  );
}
