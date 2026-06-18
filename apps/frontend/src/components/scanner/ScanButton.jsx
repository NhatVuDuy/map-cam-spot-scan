import React, { useState, useEffect } from "react";
import { useScanner } from "../../hooks/useScanner.js";

if (typeof document !== "undefined" && !document.getElementById("scan-btn-anim")) {
  const s = document.createElement("style");
  s.id = "scan-btn-anim";
  s.textContent = `
    @keyframes scanSlide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes dotPulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.25; }
    }
  `;
  document.head.appendChild(s);
}

export default function ScanButton() {
  const { loading, progress, error, runScan, blocks } = useScanner();
  const disabled = loading || (blocks || []).length === 0;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  return (
    <div style={{ marginTop: "auto", paddingTop: "0.5rem" }}>
      <button
        disabled={disabled}
        onClick={runScan}
        style={{
          width: "100%", padding: "0.6rem",
          background: loading ? "#1e3a5f" : disabled ? "#334155" : "#3B82F6",
          color: loading ? "#93c5fd" : "#fff",
          border: loading ? "1px solid #3B82F644" : "none",
          borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
        }}
      >
        {loading && (
          <span style={{ animation: "dotPulse 1s step-end infinite", fontSize: "0.6rem", color: "#38BDF8" }}>●</span>
        )}
        {loading ? `Đang quét... ${elapsed}s` : "Quét khu vực"}
      </button>

      {/* Animated scan bar */}
      {loading && (
        <div style={{
          marginTop: "4px", height: "2px", borderRadius: "1px",
          background: "#1e293b", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: "40%",
            background: "linear-gradient(90deg, transparent, #38BDF8, #3B82F6, transparent)",
            animation: "scanSlide 1.4s ease-in-out infinite",
          }} />
        </div>
      )}

      {/* Progress step */}
      {loading && progress && (
        <div style={{
          marginTop: "5px", fontSize: "0.7rem", color: "#64748b",
          display: "flex", alignItems: "flex-start", gap: "4px", lineHeight: 1.4,
        }}>
          <span style={{ color: "#3B82F6", flexShrink: 0, marginTop: "1px" }}>›</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{progress}</span>
        </div>
      )}

      {/* Done message */}
      {progress && !loading && !error && (
        <div style={{
          marginTop: "0.4rem", fontSize: "0.72rem", color: "#22d3ee",
          textAlign: "center", lineHeight: 1.4,
        }}>
          {progress}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: "0.5rem", fontSize: "0.72rem", color: "#FF6B6B",
          textAlign: "center", wordBreak: "break-word",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
