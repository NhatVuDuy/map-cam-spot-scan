import React from "react";
import SourceSelector from "../scanner/SourceSelector.jsx";
import AreaSelector from "../scanner/AreaSelector.jsx";
import CategoryFilter from "../scanner/CategoryFilter.jsx";
import ScanButton from "../scanner/ScanButton.jsx";

const styles = {
  sidebar: {
    width: "280px",
    flexShrink: 0,
    background: "#1e293b",
    borderRight: "1px solid #334155",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    padding: "0.75rem",
    gap: "0.75rem",
  },
  section: {
    background: "#0f172a",
    borderRadius: "6px",
    padding: "0.75rem",
  },
  sectionTitle: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "0.5rem",
  },
};

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Data Source</div>
        <SourceSelector />
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Area</div>
        <AreaSelector />
      </div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Categories</div>
        <CategoryFilter />
      </div>
      <ScanButton />
    </aside>
  );
}
