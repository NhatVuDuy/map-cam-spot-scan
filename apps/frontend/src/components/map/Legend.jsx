import React from "react";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";

const styles = {
  legend: {
    position: "absolute",
    bottom: "40px",
    left: "10px",
    background: "rgba(15, 23, 42, 0.9)",
    border: "1px solid #334155",
    borderRadius: "6px",
    padding: "0.6rem 0.75rem",
    minWidth: "160px",
    backdropFilter: "blur(4px)",
    zIndex: 10,
  },
  title: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.4rem",
  },
  row: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.15rem 0.3rem",
    borderRadius: "3px",
    cursor: "pointer",
    background: active ? "rgba(59,130,246,0.15)" : "transparent",
    transition: "background 0.15s",
  }),
  dot: (color) => ({
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  }),
  label: { fontSize: "0.75rem", color: "#cbd5e1" },
  count: { fontSize: "0.7rem", color: "#64748b", marginLeft: "auto" },
};

export default function Legend() {
  const { stats, filter, setFilter } = useScanStore();

  const hasStats = Object.keys(stats).length > 0;
  if (!hasStats) return null;

  return (
    <div style={styles.legend}>
      <div style={styles.title}>Categories</div>
      {Object.entries(CATEGORIES).map(([key, cat]) => {
        const count = stats[key] || 0;
        if (count === 0) return null;
        const isActive = filter === key;
        return (
          <div
            key={key}
            style={styles.row(isActive)}
            onClick={() => setFilter(isActive ? null : key)}
            title={isActive ? "Click to show all" : `Filter to ${cat.label}`}
          >
            <span style={styles.dot(cat.color)} />
            <span style={styles.label}>{cat.label}</span>
            <span style={styles.count}>{count}</span>
          </div>
        );
      })}
      {filter && (
        <div
          style={{ ...styles.row(false), marginTop: "0.3rem", borderTop: "1px solid #334155", paddingTop: "0.3rem" }}
          onClick={() => setFilter(null)}
        >
          <span style={{ fontSize: "0.72rem", color: "#3B82F6", cursor: "pointer" }}>Clear filter</span>
        </div>
      )}
    </div>
  );
}
