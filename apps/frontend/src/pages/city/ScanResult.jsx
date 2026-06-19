import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppLayout, { NavBtn, BackBtn } from "../../components/layout/AppLayout.jsx";
import { getScanFile, getCity, seedBuiltInCities } from "../../utils/cityDB.js";
import { aggregateWards, exportScanFileJSON, exportScanFileCSV } from "../../services/cityBatchScan.js";
import { BLOCKS, BLOCK_KEYS, CAM_TYPES, CAM_COLORS, camTotal } from "../../config/blocks.js";
import {
  loadCamConfig, saveCamConfig, resetCamConfig,
  effectiveCams, hasOverride,
} from "../../config/camConfig.js";

const C = {
  bg: "#060d1a", bg2: "#0b1425", card: "#0d1829", card2: "#0f1f35", border: "#1a2e4a",
  cyan: "#38BDF8", violet: "#A78BFA", green: "#34D399", amber: "#FBBF24",
  red: "#F87171", orange: "#FB923C",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
};

const CAM_LABELS = {
  ITS1: "ITS1 — Camera giao thông đô thị",
  ITS2: "ITS2 — Camera đếm xe / phân luồng",
  P2:   "P2 — PTZ bùng binh / ngã năm",
  P1:   "P1 — PTZ cổng vào trọng điểm",
  B3:   "B3 — Thân box lớn (chống mất cắp)",
  B2:   "B2 — Thân box chuẩn",
  B1:   "B1 — Thân box nhỏ (hẻm/nội bộ)",
};

function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }

function Bar({ pct, color, height = 6, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    setW(0);
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, pct))), delay + 100);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div style={{ height, background: C.border, borderRadius: 100, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 100, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

/* ── Cam Config Modal ─────────────────────────────────────────────── */
function CamConfigModal({ camConfig, onChange, onClose }) {
  const [local, setLocal] = useState(() => JSON.parse(JSON.stringify(camConfig)));

  function set(blockId, camType, val) {
    const n = Math.max(0, Math.round(Number(val)));
    setLocal(prev => ({
      ...prev,
      [blockId]: { ...(prev[blockId] || {}), [camType]: n },
    }));
  }

  function apply() {
    saveCamConfig(local);
    onChange(local);
    onClose();
  }

  function reset() {
    resetCamConfig();
    onChange({});
    onClose();
  }

  // Blocks that have POI data — show these first, greyed ones at bottom
  const activeBlocks = BLOCK_KEYS.filter(id => BLOCKS[id].detect !== "none");

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 700,
      display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
    }}>
      <div style={{
        width: "min(680px, 100vw)", height: "100dvh", background: C.bg,
        borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: C.text }}>⚙ Hệ số camera / block</div>
            <div style={{ fontSize: "0.7rem", color: C.muted, marginTop: "2px" }}>
              Điều chỉnh số lượng mỗi loại camera trên mỗi địa điểm (POI). Thay đổi áp dụng ngay cho toàn bộ thống kê.
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1.2rem", lineHeight: 1, padding: "4px 8px" }}>✕</button>
        </div>

        {/* Cam type legend */}
        <div style={{ padding: "0.6rem 1.25rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {CAM_TYPES.map(t => (
            <span key={t} style={{
              fontSize: "0.6rem", padding: "2px 7px", borderRadius: "100px",
              background: `${CAM_COLORS[t]}18`, border: `1px solid ${CAM_COLORS[t]}44`,
              color: CAM_COLORS[t], fontWeight: 700,
            }} title={CAM_LABELS[t]}>{t}</span>
          ))}
          <span style={{ fontSize: "0.6rem", color: C.muted, alignSelf: "center" }}>— hover để xem tên đầy đủ</span>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
              <tr style={{ background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: "0.5rem 1rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: "left" }}>Block</th>
                {CAM_TYPES.map(t => (
                  <th key={t} style={{ padding: "0.5rem 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: CAM_COLORS[t], textAlign: "center", minWidth: "46px" }}>{t}</th>
                ))}
                <th style={{ padding: "0.5rem 0.6rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: "right" }}>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {activeBlocks.map(blockId => {
                const block = BLOCKS[blockId];
                const over  = hasOverride(blockId, local);
                const eff   = effectiveCams(blockId, local);
                const total = CAM_TYPES.reduce((s, t) => s + (eff[t] || 0), 0);
                return (
                  <tr key={blockId} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "0.5rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ color: block.color, fontSize: "0.82rem" }}>{block.symbol}</span>
                        <div>
                          <div style={{ fontSize: "0.74rem", fontWeight: 700, color: over ? C.amber : C.text }}>
                            {blockId}
                            {over && <span style={{ marginLeft: "4px", fontSize: "0.58rem", color: C.amber, border: `1px solid ${C.amber}44`, padding: "1px 4px", borderRadius: "3px" }}>edited</span>}
                          </div>
                          <div style={{ fontSize: "0.62rem", color: C.muted, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{block.name}</div>
                        </div>
                      </div>
                    </td>
                    {CAM_TYPES.map(t => {
                      const def = block.cams[t] ?? 0;
                      const cur = local[blockId]?.[t] !== undefined ? local[blockId][t] : def;
                      const changed = cur !== def;
                      return (
                        <td key={t} style={{ padding: "0.35rem 0.3rem", textAlign: "center" }}>
                          <input
                            type="number" min="0" max="99" value={cur}
                            onChange={e => set(blockId, t, e.target.value)}
                            style={{
                              width: "40px", textAlign: "center",
                              background: changed ? `${C.amber}18` : C.card2,
                              border: `1px solid ${changed ? C.amber + "88" : C.border}`,
                              borderRadius: "5px", padding: "3px 2px",
                              color: changed ? C.amber : C.dim,
                              fontSize: "0.78rem", outline: "none",
                            }}
                          />
                        </td>
                      );
                    })}
                    <td style={{ padding: "0.35rem 0.6rem", textAlign: "right" }}>
                      <span style={{
                        fontSize: "0.8rem", fontWeight: 800,
                        color: hasOverride(blockId, local) ? C.amber : block.color,
                      }}>{total}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.85rem 1.25rem", borderTop: `1px solid ${C.border}`,
          display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexShrink: 0,
          background: C.bg2,
        }}>
          <button onClick={reset} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: "7px",
            padding: "0.45rem 1rem", color: C.muted, fontSize: "0.8rem", cursor: "pointer",
          }}>↺ Reset về mặc định</button>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: "7px",
            padding: "0.45rem 1rem", color: C.muted, fontSize: "0.8rem", cursor: "pointer",
          }}>Hủy</button>
          <button onClick={apply} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
            borderRadius: "7px", padding: "0.45rem 1.25rem",
            color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}>✓ Áp dụng</button>
        </div>
      </div>
    </div>
  );
}

/* ── Stats dashboard ─────────────────────────────────────────────── */
function Dashboard({ agg, wardResults, city, camConfig, activeBlocks }) {
  function wardCamCount(w) {
    let total = 0;
    for (const [blockId, cnt] of Object.entries(w.byCat || {})) {
      const eff = effectiveCams(blockId, camConfig);
      total += CAM_TYPES.reduce((s, t) => s + (eff[t] || 0) * cnt, 0);
    }
    return total;
  }

  const topWards = [...wardResults].filter(w => !w.error)
    .sort((a, b) => wardCamCount(b) - wardCamCount(a))
    .slice(0, 10);
  const maxCam = topWards[0] ? wardCamCount(topWards[0]) : 1;

  const camRows = CAM_TYPES.map(t => ({ type: t, v: agg.byCam?.[t] || 0, color: CAM_COLORS[t], label: CAM_LABELS[t] })).filter(r => r.v > 0);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.25rem 1.25rem 3rem" }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.7rem", marginBottom: "1rem" }}>
        {[
          { label: "Camera (ước tính)", val: fmt(agg.camCount),   sub: "Từ hệ số × địa điểm", color: C.cyan },
          { label: "Địa điểm phát hiện", val: fmt(agg.poiCount),  sub: `${BLOCK_KEYS.filter(b => agg.byBlock?.[b]).length} loại`, color: C.amber },
          { label: "Phường hoàn tất",    val: `${agg.completed}/${wardResults.length}`, sub: `${agg.errors} lỗi`, color: C.green },
        ].map(({ label, val, sub, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: "10px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color, lineHeight: 1.1 }}>{val}</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.text, margin: "0.15rem 0 0.1rem" }}>{label}</div>
            <div style={{ fontSize: "0.62rem", color: C.muted }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>
        {/* Camera type bars */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
            Loại camera — {fmt(agg.camCount)} ước tính
          </div>
          {camRows.length === 0 ? (
            <div style={{ fontSize: "0.72rem", color: C.muted }}>Chưa có dữ liệu camera.</div>
          ) : camRows.map((r, i) => (
            <div key={r.type} style={{ marginBottom: "0.45rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.15rem" }}>
                <span style={{ color: C.dim }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color }}>{fmt(r.v)}</span>
              </div>
              <Bar pct={Math.round((r.v / Math.max(agg.camCount, 1)) * 100)} color={r.color} delay={i * 100} />
            </div>
          ))}
        </div>

        {/* Top wards */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Top 10 phường — theo camera</div>
          {topWards.map((w, i) => {
            const cam = wardCamCount(w);
            return (
              <div key={w.code} style={{ marginBottom: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "0.1rem" }}>
                  <span style={{ color: i < 3 ? C.amber : C.dim }}>{i + 1}. {w.name}</span>
                  <span style={{ color: C.cyan, fontWeight: 700 }}>📹 {fmt(cam)}</span>
                </div>
                <Bar pct={(cam / maxCam) * 100} color={i < 3 ? C.amber : C.violet} delay={i * 50} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Block table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1.1rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: "0.82rem" }}>Theo loại địa điểm (B01–B13)</span>
          {Object.keys(camConfig).length > 0 && (
            <span style={{ fontSize: "0.62rem", color: C.amber, border: `1px solid ${C.amber}44`, padding: "2px 8px", borderRadius: "100px", background: `${C.amber}10` }}>
              ⚙ Hệ số tùy chỉnh đang áp dụng
            </span>
          )}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg2 }}>
              <th style={{ padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: "left", borderBottom: `1px solid ${C.border}` }}>Loại</th>
              <th style={{ padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>POI</th>
              <th style={{ padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: "center", borderBottom: `1px solid ${C.border}` }}>Hệ số / node</th>
              <th style={{ padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>Camera ước tính</th>
            </tr>
          </thead>
          <tbody>
            {BLOCK_KEYS.map(blockId => {
              const block = BLOCKS[blockId];
              const poi   = agg.byBlock?.[blockId] || 0;
              const eff   = effectiveCams(blockId, camConfig);
              const camPerNode = CAM_TYPES.reduce((s, t) => s + (eff[t] || 0), 0);
              const cam   = poi * camPerNode;
              const shape = block.shape === "circle" ? "●" : "■";
              const over  = hasOverride(blockId, camConfig);
              return (
                <tr key={blockId} style={{ borderBottom: `1px solid ${C.border}22`, opacity: poi > 0 ? 1 : 0.4 }}>
                  <td style={{ padding: "0.45rem 0.7rem", fontSize: "0.74rem" }}>
                    <span style={{ color: block.color, marginRight: "0.4rem" }}>{shape} {blockId}</span>
                    <span style={{ color: C.dim, fontSize: "0.68rem" }}>{block.name}</span>
                  </td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right", fontSize: "0.74rem", color: poi > 0 ? C.text : C.muted }}>{poi > 0 ? fmt(poi) : "—"}</td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "center" }}>
                    <span style={{
                      fontSize: "0.6rem", padding: "2px 7px", borderRadius: "100px",
                      border: `1px solid ${over ? C.amber + "88" : block.color + "44"}`,
                      background: over ? `${C.amber}18` : `${block.color}18`,
                      color: over ? C.amber : block.color,
                    }}>{camPerNode}×{over ? " ✎" : ""}</span>
                  </td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right", fontSize: "0.82rem", fontWeight: 900, color: block.color }}>{cam > 0 ? fmt(cam) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ScanResult() {
  const navigate = useNavigate();
  const location = useLocation();

  const scanId = location.state?.scanId || sessionStorage.getItem("city-report-scan");
  const cityId = location.state?.cityId || sessionStorage.getItem("city-report-city") || "hcm";

  useEffect(() => {
    if (scanId) sessionStorage.setItem("city-report-scan", scanId);
    if (cityId) sessionStorage.setItem("city-report-city", cityId);
  }, [scanId, cityId]);

  const [scanFile, setScanFile]       = useState(null);
  const [city, setCity]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showCamConfig, setShowCamConfig] = useState(false);
  const [camConfig, setCamConfig]     = useState(() => loadCamConfig());

  useEffect(() => {
    async function load() {
      await seedBuiltInCities();
      const [sf, c] = await Promise.all([getScanFile(scanId), getCity(cityId)]);
      setScanFile(sf);
      setCity(c);
      setLoading(false);
    }
    load();
  }, [scanId, cityId]);

  const agg = useMemo(
    () => scanFile?.wardCounts?.length ? aggregateWards(scanFile.wardCounts, camConfig) : null,
    [scanFile, camConfig],
  );

  const hasCustomConfig = Object.keys(camConfig).length > 0;

  if (loading) return (
    <AppLayout featureName="Đang tải...">
      <div style={{ padding: "2rem", color: C.muted }}>Đang tải kết quả quét...</div>
    </AppLayout>
  );

  if (!scanFile) return (
    <AppLayout featureName="Không tìm thấy" backButton={<BackBtn onClick={() => navigate("/city")}>← Quay lại</BackBtn>}>
      <div style={{ padding: "2rem", color: C.red }}>File quét không tồn tại.</div>
    </AppLayout>
  );

  return (
    <AppLayout
      featureName={scanFile.name}
      backButton={<BackBtn onClick={() => navigate("/city")}>← {city?.name || cityId}</BackBtn>}
    >
      {/* ── Action bar ── */}
      <div style={{
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.4rem",
        padding: "0.5rem 1rem", borderBottom: `1px solid ${C.border}`,
        background: C.bg2, flexShrink: 0, flexWrap: "wrap",
      }}>
        <button onClick={() => setShowCamConfig(true)} style={{
          display: "flex", alignItems: "center", gap: "0.35rem",
          background: hasCustomConfig ? `${C.amber}18` : C.card,
          border: `1px solid ${hasCustomConfig ? C.amber + "88" : C.border}`,
          borderRadius: "7px", padding: "0.35rem 0.75rem",
          color: hasCustomConfig ? C.amber : C.dim,
          fontSize: "0.75rem", fontWeight: hasCustomConfig ? 700 : 400, cursor: "pointer",
        }}>
          ⚙ Hệ số cam{hasCustomConfig ? " ✎" : ""}
        </button>
        <NavBtn color={C.green} onClick={() => navigate("/city/map")}>🗺 Bản đồ</NavBtn>
        <NavBtn color={C.violet} onClick={() => exportScanFileCSV(scanFile)}>⬇ CSV</NavBtn>
        <NavBtn color={C.violet} onClick={() => exportScanFileJSON(scanFile)}>⬇ JSON</NavBtn>
        <NavBtn color={C.amber} onClick={() => window.print()}>🖨 PDF</NavBtn>
      </div>

      {agg ? (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Dashboard agg={agg} wardResults={scanFile.wardCounts} city={city} camConfig={camConfig} />
        </div>
      ) : (
        <div style={{ padding: "2rem", color: C.muted }}>File này chưa có dữ liệu quét.</div>
      )}

      {showCamConfig && (
        <CamConfigModal
          camConfig={camConfig}
          onChange={cfg => setCamConfig(cfg)}
          onClose={() => setShowCamConfig(false)}
        />
      )}

      <style>{`
        @media print { nav, button { display: none !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>
    </AppLayout>
  );
}
