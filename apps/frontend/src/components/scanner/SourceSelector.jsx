import React from "react";

const styles = {
  box: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "4px",
    padding: "0.4rem 0.6rem",
    color: "#e2e8f0",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#51CF66",
    flexShrink: 0,
  },
};

export default function SourceSelector() {
  return (
    <div style={styles.box}>
      <span style={styles.dot} />
      OpenStreetMap (Overpass API)
    </div>
  );
}
