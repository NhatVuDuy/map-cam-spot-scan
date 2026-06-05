import React from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { useExport } from "../../hooks/useExport.js";
import { CATEGORIES } from "../../utils/categories.js";

const S = {
  wrapper: { height: "100%", display: "flex", flexDirection: "column", background: "#0f172a" },
  toolbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0.35rem 0.75rem", background: "#1e293b",
    borderBottom: "1px solid #334155", flexShrink: 0,
  },
  title: { fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" },
  exportBtns: { display: "flex", gap: "0.4rem" },
  btn: { fontSize: "0.68rem", padding: "2px 8px", background: "#334155", color: "#cbd5e1", border: "none", borderRadius: "3px", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" },
  th: {
    padding: "0.3rem 0.5rem", background: "#1e293b", color: "#64748b",
    textAlign: "left", fontWeight: 600, position: "sticky", top: 0, zIndex: 1,
    fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em",
  },
  td: { padding: "0.25rem 0.5rem", color: "#cbd5e1", borderBottom: "1px solid #1e293b" },
  dot: (color) => ({ display: "inline-block", width: "7px", height: "7px", borderRadius: "50%", background: color, marginRight: "5px" }),
  empty: { padding: "1.5rem", color: "#475569", textAlign: "center", fontSize: "0.8rem" },
};

export default function ResultsTable() {
  const { points, filter, selectedPoint, setSelectedPoint } = useScanner();
  const { exportCSV, exportGeoJSON } = useExport();

  const filtered = filter ? points.filter((p) => p.category === filter) : points;

  const handleRowClick = (p) => {
    setSelectedPoint(selectedPoint?.id === p.id ? null : p);
  };

  return (
    <div style={S.wrapper}>
      <div style={S.toolbar}>
        <span style={S.title}>Kết quả ({filtered.length})</span>
        <div style={S.exportBtns}>
          <button style={S.btn} onClick={exportCSV}>CSV</button>
          <button style={S.btn} onClick={exportGeoJSON}>GeoJSON</button>
        </div>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={S.empty}>Chưa có kết quả. Bấm Scan để tìm vị trí lắp camera.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Loại</th>
                <th style={S.th}>Tên</th>
                <th style={S.th}>Cách</th>
                <th style={S.th}>Score</th>
                <th style={S.th}>Tọa độ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = CATEGORIES[p.category];
                const isSelected = selectedPoint?.id === p.id;
                return (
                  <tr
                    key={p.id}
                    onClick={() => handleRowClick(p)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#1e3a5f" : "transparent",
                      outline: isSelected ? "1px solid #FACC15" : "none",
                      outlineOffset: "-1px",
                    }}
                  >
                    <td style={S.td}>
                      <span style={S.dot(cat?.color || "#888")} />
                      {cat?.label || p.category}
                    </td>
                    <td style={S.td}>{p.name || "—"}</td>
                    <td style={S.td}>{p.distanceM}m</td>
                    <td style={S.td}>{p.score ?? "—"}</td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: "0.7rem", color: "#94a3b8" }}>
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
