import React from "react";
import { useScanner } from "../../hooks/useScanner.js";

const styles = {
  wrapper: { marginTop: "auto", paddingTop: "0.5rem" },
  btn: (loading) => ({
    width: "100%",
    padding: "0.6rem",
    background: loading ? "#334155" : "#3B82F6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    transition: "background 0.2s",
  }),
  progress: {
    marginTop: "0.5rem",
    fontSize: "0.75rem",
    color: "#94a3b8",
    textAlign: "center",
  },
  error: {
    marginTop: "0.5rem",
    fontSize: "0.75rem",
    color: "#FF6B6B",
    textAlign: "center",
    wordBreak: "break-word",
  },
};

export default function ScanButton() {
  const { loading, progress, error, runScan, blocks } = useScanner();
  const disabled = loading || (blocks || []).length === 0;

  return (
    <div style={styles.wrapper}>
      <button style={styles.btn(disabled)} disabled={disabled} onClick={runScan}>
        {loading ? "Đang quét..." : "Quét khu vực"}
      </button>
      {progress && !error && <div style={styles.progress}>{progress}</div>}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
