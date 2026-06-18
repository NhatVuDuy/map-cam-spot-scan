import React from "react";
import { aggregateWards } from "../../services/cityBatchScan.js";

const C = {
  bg: "#060d1a", card: "#0d1829", border: "#1a2e4a",
  cyan: "#38BDF8", violet: "#A78BFA", amber: "#FBBF24", red: "#F87171",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
};

function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }

export default function ScanProgress({ progress, scanMode, wardResults, onStop, runSince }) {
  const agg = wardResults?.length ? aggregateWards(wardResults) : null;

  const modeLabel = scanMode === "retry" ? "Đang thử lại phường lỗi"
    : scanMode === "resume" ? "Tiếp tục quét"
    : "Đang quét";

  const visibleWards = wardResults
    ? [...wardResults].slice(runSince || 0).reverse().slice(0, 15)
    : [];

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗺️</div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: C.text }}>{modeLabel}</div>
          <div style={{ fontSize: "0.78rem", color: C.dim, marginTop: "0.3rem" }}>
            Phường {progress.current}/{progress.total} — {progress.wardName}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: C.muted, marginBottom: "0.4rem" }}>
            <span>{progress.pct}% hoàn tất</span>
            <span>~{Math.ceil((progress.total - progress.current) * 1.6 / 60)} phút còn lại</span>
          </div>
          <div style={{ height: "10px", background: C.border, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${progress.pct}%`,
              background: `linear-gradient(90deg,${C.cyan},${C.violet})`,
              borderRadius: "100px", transition: "width 0.8s ease",
            }} />
          </div>
        </div>

        {/* Live stats — 2 tiles: Camera + Giao lộ */}
        {agg && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.7rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Địa điểm",         val: fmt(agg.poiCount || 0), color: C.amber },
              { label: "Camera (ước tính)", val: fmt(agg.camCount || 0), color: C.cyan },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderRadius: "8px", padding: "0.7rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.05rem", fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: "0.15rem" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Recent wards log — only show wards from current run */}
        {visibleWards.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1.5rem", maxHeight: "200px", overflowY: "auto" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>Vừa quét</div>
            {visibleWards.map((w, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", padding: "0.18rem 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: w.error ? C.red : C.dim }}>{w.error ? "❌" : "✓"} {w.name}</span>
                <span style={{ color: w.error ? C.red : C.text, fontWeight: 600 }}>
                  {w.error ? w.error.slice(0, 36) : `${Object.values(w.byCat || {}).reduce((s, v) => s + v, 0)} điểm`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <button onClick={onStop} style={{
            background: `${C.red}18`, border: `1px solid ${C.red}44`,
            borderRadius: "8px", padding: "0.6rem 1.5rem",
            color: C.red, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>⏹ Dừng</button>
        </div>
        <div style={{ textAlign: "center", fontSize: "0.65rem", color: C.muted, marginTop: "0.75rem" }}>
          Tuần tự mỗi 1.6s · Geometry lưu IndexedDB sau mỗi phường
        </div>
      </div>
    </div>
  );
}
