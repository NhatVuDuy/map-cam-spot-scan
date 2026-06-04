import React from "react";

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0 1rem",
    height: "48px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
  },
  title: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#f1f5f9",
    letterSpacing: "0.02em",
  },
  badge: {
    fontSize: "0.65rem",
    background: "#FF6B6B",
    color: "#fff",
    padding: "1px 6px",
    borderRadius: "4px",
    fontWeight: 600,
  },
};

export default function Header() {
  return (
    <header style={styles.header}>
      <span style={{ fontSize: "1.25rem" }}>📹</span>
      <span style={styles.title}>Camera Placement Scanner</span>
      <span style={styles.badge}>v1.0</span>
    </header>
  );
}
