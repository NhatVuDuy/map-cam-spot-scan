import React, { useState } from "react";
import { useScanner } from "../../hooks/useScanner.js";
import useScanStore from "../../store/scanStore.js";

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
  notice: {
    marginTop: "0.45rem",
    padding: "5px 8px",
    background: "rgba(251,146,60,0.08)",
    border: "1px solid rgba(251,146,60,0.3)",
    borderRadius: "5px",
    fontSize: "0.68rem",
    color: "#fb923c",
    lineHeight: 1.5,
  },
  noticeActions: {
    display: "flex", gap: "0.35rem", marginTop: "0.35rem",
  },
  noticeBtn: (color) => ({
    flex: 1, padding: "3px 0", fontSize: "0.68rem", cursor: "pointer",
    background: `${color}18`, border: `1px solid ${color}44`,
    borderRadius: "4px", color, fontWeight: 600,
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
  const { loading, progress, error, runScan, categories } = useScanner();
  const { sessionFilename, sessionDisplayName, saveToSystem, saveSessionAs } = useScanStore();
  const [pendingScan, setPendingScan] = useState(false);
  const disabled = loading || categories.length === 0;

  const handleScanClick = () => {
    // If a project is open and has data, ask what to do first
    if (sessionFilename) {
      setPendingScan(true);
      return;
    }
    runScan();
  };

  const handleSaveAndScan = async () => {
    setPendingScan(false);
    await saveToSystem(sessionDisplayName);
    runScan();
  };

  const handleSaveNewAndScan = async () => {
    setPendingScan(false);
    await saveSessionAs();
    runScan();
  };

  const handleScanWithoutSave = () => {
    setPendingScan(false);
    runScan();
  };

  return (
    <div style={styles.wrapper}>
      <button style={styles.btn(disabled)} disabled={disabled} onClick={handleScanClick}>
        {loading ? "Đang quét..." : "Quét khu vực"}
      </button>

      {/* Prompt when a project is open */}
      {pendingScan && !loading && (
        <div style={styles.notice}>
          <strong style={{ color: "#fb923c" }}>"{sessionDisplayName}"</strong> đang mở.
          Lưu trước khi quét mới?
          <div style={styles.noticeActions}>
            <button style={styles.noticeBtn("#34d399")} onClick={handleSaveAndScan}>💾 Lưu & Quét</button>
            <button style={styles.noticeBtn("#94a3b8")} onClick={handleScanWithoutSave}>↷ Quét không lưu</button>
          </div>
          <div style={{ ...styles.noticeActions, marginTop: "0.2rem" }}>
            <button style={styles.noticeBtn("#fb923c")} onClick={handleSaveNewAndScan}>↗ Lưu mới & Quét</button>
            <button style={styles.noticeBtn("#64748b")} onClick={() => setPendingScan(false)}>✕ Huỷ</button>
          </div>
        </div>
      )}

      {!pendingScan && progress && !error && <div style={styles.progress}>{progress}</div>}
      {!pendingScan && error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
