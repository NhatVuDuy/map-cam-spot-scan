import React from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { useExport } from "../../hooks/useExport.js";
import { CATEGORIES } from "../../utils/categories.js";

const styles = {
  wrapper: { height: "100%", display: "flex", flexDirection: "column", background: "#0f172a" },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.35rem 0.75rem",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
  },
  title: { fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" },
  exportBtns: { display: "flex", gap: "0.4rem" },
  btn: {
    fontSize: "0.68rem",
    padding: "2px 8px",
    background: "#334155",
    color: "#cbd5e1",
    border: "none",
    borderRadius: "3px",
    cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" },
  th: {
    padding: "0.3rem 0.5rem",
    background: "#1e293b",
    color: "#64748b",
    textAlign: "left",
    fontWeight: 600,
    position: "sticky",
    top: 0,
    zIndex: 1,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  td: {
    padding: "0.25rem 0.5rem",
    color: "#cbd5e1",
    borderBottom: "1px solid #1e293b",
  },
  dot: (color) => ({
    display: "inline-block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: color,
    marginRight: "5px",
  }),
  empty: { padding: "1rem", color: "#475569", textAlign: "center", fontSize: "0.8rem" },
};

export default function ResultsTable() {
  const { points, filter, setHoveredPoint } = useScanner();
  const { exportCSV, exportGeoJSON } = useExport();

  const filtered = filter ? points.filter((p) => p.category === filter) : points;

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <span style={styles.title}>Results ({filtered.length})</span>
        <div style={styles.exportBtns}>
          <button style={styles.btn} onClick={exportCSV}>CSV</button>
          <button style={styles.btn} onClick={exportGeoJSON}>GeoJSON</button>
        </div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>No results. Run a scan to find camera installation spots.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Distance</th>
                <th style={styles.th}>Score</th>
                <th style={styles.th}>Lat/Lng</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = CATEGORIES[p.category];
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={styles.td}>
                      <span style={styles.dot(cat?.color || "#888")} />
                      {cat?.label || p.category}
                    </td>
                    <td style={styles.td}>{p.name || "—"}</td>
                    <td style={styles.td}>{p.distanceM}m</td>
                    <td style={styles.td}>{p.score ?? "—"}</td>
                    <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "0.7rem" }}>
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
