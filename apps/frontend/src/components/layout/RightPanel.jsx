import React, { useState, useRef, useEffect } from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { useExport } from "../../hooks/useExport.js";
import { BLOCKS, BLOCK_KEYS, SQUARE_BLOCKS, CAM_TYPES, CAM_COLORS, camTotal } from "../../config/blocks.js";
import { loadCamConfig, effectiveCams } from "../../config/camConfig.js";
import ConfirmDialog from "../common/ConfirmDialog.jsx";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#0a1628",
  bg2:    "#0f1f35",
  card:   "#0d1829",
  border: "#1a2e4a",
  text:   "#e2e8f0",
  dim:    "#94a3b8",
  muted:  "#475569",
  cyan:   "#38BDF8",
  green:  "#34D399",
  amber:  "#FBBF24",
  red:    "#F87171",
};

const btnStyle = {
  fontSize: "0.65rem", padding: "2px 8px",
  background: "none", border: `1px solid ${C.border}`,
  color: C.muted, borderRadius: "4px", cursor: "pointer",
};

/* ─── stat badge ──────────────────────────────────────────────────────────── */
function StatBadge({ label, value, color = C.cyan }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: `${color}0e`, border: `1px solid ${color}28`,
      borderRadius: "8px", padding: "0.5rem 0.75rem", flex: 1,
    }}>
      <span style={{ fontSize: "1.2rem", fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: "2px", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

/* ─── mini bar ────────────────────────────────────────────────────────────── */
function MiniBar({ label, labelColor, value, max, color, total }) {
  const pct   = max > 0 ? (value / max) * 100 : 0;
  const share = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.35rem" }}>
      <div style={{ fontSize: "0.7rem", color: labelColor || color, width: "auto", minWidth: 0, flex: "0 1 130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: "5px", background: `${color}20`, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: "3px", transition: "width 0.6s ease" }} />
      </div>
      <div style={{ fontSize: "0.68rem", color: "#e2e8f0", width: "24px", textAlign: "right", flexShrink: 0, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: "0.62rem", color, width: "26px", textAlign: "right", flexShrink: 0 }}>{share}%</div>
    </div>
  );
}

/* ─── block visibility filter (Lọc tab) ──────────────────────────────────── */
function BlockFilter() {
  const { points, hiddenBlocks, toggleBlockVisibility } = useScanner();

  // Count per block from actual points
  const counts = {};
  for (const p of points) {
    const k = p.blockId || p.category;
    counts[k] = (counts[k] || 0) + 1;
  }

  const hasResults = points.length > 0;
  if (!hasResults) {
    return (
      <div style={{ padding: "2rem 1rem", textAlign: "center", color: C.muted, fontSize: "0.8rem" }}>
        Chưa có kết quả scan.<br />
        <span style={{ fontSize: "0.72rem" }}>Kết quả sẽ hiện ở đây sau khi quét.</span>
      </div>
    );
  }

  return (
    <div style={{ padding: "0.6rem 0.85rem" }}>
      <div style={{ fontSize: "0.67rem", color: C.muted, marginBottom: "0.75rem", lineHeight: 1.5 }}>
        Bật/tắt hiển thị từng loại trên bản đồ và danh sách.
      </div>
      {BLOCK_KEYS.map((key) => {
        const block   = BLOCKS[key];
        const count   = counts[key] || 0;
        if (!count) return null;
        const hidden   = hiddenBlocks.includes(key);
        const isSquare = block.shape === "square";
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: "0.45rem",
            padding: "0.35rem 0.5rem", marginBottom: "3px",
            borderRadius: "7px",
            background: hidden ? `${block.color}05` : `${block.color}09`,
            border: `1px solid ${block.color}20`,
            opacity: hidden ? 0.5 : 1,
            transition: "all 0.15s",
          }}>
            {/* eye toggle */}
            <button
              onClick={() => toggleBlockVisibility(key)}
              title={hidden ? "Hiện" : "Ẩn"}
              style={{
                flexShrink: 0, background: "none", border: "none",
                cursor: "pointer", fontSize: "0.85rem", lineHeight: 1,
                color: hidden ? C.muted : block.color, padding: "0 2px",
              }}
            >{hidden ? "🙈" : "👁"}</button>
            {/* shape indicator */}
            <span style={{ fontSize: "0.65rem", color: block.color, flexShrink: 0, lineHeight: 1 }}>{isSquare ? "■" : "●"}</span>
            {/* block code + name */}
            <span style={{ flex: 1, fontSize: "0.74rem", color: C.dim, userSelect: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <strong style={{ color: block.color, marginRight: "3px" }}>{key}</strong>{block.name}
            </span>
            <span style={{
              fontSize: "0.62rem", padding: "1px 6px",
              background: `${block.color}20`, border: `1px solid ${block.color}40`,
              borderRadius: "100px", color: block.color, fontWeight: 700, flexShrink: 0,
            }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── results list ────────────────────────────────────────────────────────── */
function ResultsList() {
  const { points, filter, hiddenBlocks, selectedPoint, setSelectedPoint, removePoint } = useScanner();
  const [confirmId, setConfirmId] = useState(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (selectedPoint) {
      itemRefs.current[selectedPoint.id]?.scrollIntoView({ behavior: "instant", block: "nearest" });
    }
  }, [selectedPoint]);
  const confirmPoint = confirmId ? points.find(p => p.id === confirmId) : null;
  const { exportCSV, exportGeoJSON } = useExport();

  const filtered = points.filter(p => {
    const blockId = p.blockId || p.category;
    if (hiddenBlocks.includes(blockId)) return false;
    if (filter && blockId !== filter && p.category !== filter) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.45rem 0.85rem",
        background: C.bg2, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Kết quả {filtered.length > 0 && <span style={{ color: C.cyan }}>({filtered.length})</span>}
        </span>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button style={btnStyle} onClick={exportCSV} title="Tải CSV">⬇ CSV</button>
          <button style={btnStyle} onClick={exportGeoJSON} title="Tải GeoJSON">⬇ GeoJSON</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: C.muted, fontSize: "0.8rem" }}>
            Chưa có kết quả.<br />
            <span style={{ fontSize: "0.72rem" }}>Nhấn Scan để tìm vị trí.</span>
          </div>
        ) : (
          filtered.map((p) => {
            const blockId  = p.blockId || p.category;
            const block    = BLOCKS[blockId];
            const color    = block?.color || "#888";
            const isSelected = selectedPoint?.id === p.id;
            return (
              <div
                key={p.id}
                ref={el => { itemRefs.current[p.id] = el; }}
                onClick={() => setSelectedPoint(isSelected ? null : p)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderBottom: `1px solid ${C.border}22`,
                  cursor: "pointer",
                  background: isSelected ? `${C.amber}12` : "transparent",
                  borderLeft: isSelected ? `3px solid ${C.amber}` : "3px solid transparent",
                  transition: "background 0.12s",
                  display: "flex", alignItems: "flex-start", gap: "0.5rem",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${color}08`; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "5px" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.78rem", color: isSelected ? C.amber : C.text,
                    fontWeight: isSelected ? 600 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {block && <span style={{ color, fontWeight: 700, marginRight: "4px", fontSize: "0.7rem" }}>[{blockId}]</span>}
                    {p.name}
                    {p.source === "custom" && (
                      <span style={{ marginLeft: "5px", fontSize: "0.6rem", padding: "1px 4px", background: `${C.green}22`, color: C.green, borderRadius: "3px" }}>thủ công</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.67rem", color: C.muted, marginTop: "2px" }}>
                    {block?.name || p.category} · {p.distanceM >= 1000 ? `${(p.distanceM / 1000).toFixed(1)}km` : `${p.distanceM}m`}
                  </div>
                </div>
                <button
                  title="Xóa điểm"
                  onClick={e => { e.stopPropagation(); setConfirmId(p.id); }}
                  style={{ flexShrink: 0, background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: "0.85rem", padding: "2px 4px", borderRadius: "3px", lineHeight: 1, opacity: 0.5 }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.opacity = "1"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.dim; e.currentTarget.style.opacity = "0.5"; }}
                >✕</button>
              </div>
            );
          })
        )}
      </div>

      {confirmPoint && (
        <ConfirmDialog
          title="Xóa địa điểm"
          message={<>Xóa <strong style={{ color: "#e2e8f0" }}>{confirmPoint.name}</strong> khỏi danh sách kết quả?</>}
          confirmLabel="Xóa"
          onConfirm={() => { removePoint(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

/* ─── stats tab ───────────────────────────────────────────────────────────── */
function StatsTab() {
  const { points, loading } = useScanner();
  const total = points.length;

  const [camConfig, setCamConfig] = useState(() => loadCamConfig());
  useEffect(() => {
    const onFocus = () => setCamConfig(loadCamConfig());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Count per block
  const blockCounts = {};
  for (const p of points) {
    const k = p.blockId || p.category;
    blockCounts[k] = (blockCounts[k] || 0) + 1;
  }

  // Calculate camera estimates per cam type (respects camConfig overrides)
  const camEstimates = {};
  let totalCams = 0;
  for (const [blockId, count] of Object.entries(blockCounts)) {
    if (!BLOCKS[blockId]) continue;
    const eff = effectiveCams(blockId, camConfig);
    for (const camType of CAM_TYPES) {
      const perSite = eff[camType] || 0;
      if (perSite > 0) {
        camEstimates[camType] = (camEstimates[camType] || 0) + count * perSite;
        totalCams += count * perSite;
      }
    }
  }

  const activeBlocks = BLOCK_KEYS.filter(k => blockCounts[k] > 0);
  const maxCount = Math.max(...activeBlocks.map(k => blockCounts[k] || 0), 1);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* summary */}
      <div style={{ padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <StatBadge label="Tổng vị trí" value={loading ? "…" : total} color={C.cyan} />
          <StatBadge label="Cam đề xuất" value={loading ? "…" : totalCams} color={C.amber} />
        </div>
      </div>

      {/* block distribution */}
      {total > 0 && (
        <div style={{ padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>Phân bố theo loại</div>
          {activeBlocks.map(k => {
            const b = BLOCKS[k];
            const shape = SQUARE_BLOCKS.includes(k) ? "■" : "●";
            return (
              <MiniBar
                key={k}
                label={<><span style={{ color: b.color }}>{shape}</span> <strong style={{ color: b.color }}>[{k}]</strong> {b.name}</>}
                labelColor="#94a3b8"
                value={blockCounts[k] || 0}
                max={maxCount}
                color={b.color}
                total={total}
              />
            );
          })}
        </div>
      )}

      {/* cam estimates by type */}
      {totalCams > 0 && (
        <div style={{ padding: "0.6rem 0.75rem", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Camera Đề xuất</div>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: C.amber }}>{totalCams}</span>
          </div>
          {CAM_TYPES.map(t => {
            const count = camEstimates[t] || 0;
            if (!count) return null;
            const camColor = CAM_COLORS[t] || C.cyan;
            return (
              <MiniBar
                key={t}
                label={<strong style={{ color: camColor }}>{t}</strong>}
                labelColor={camColor}
                value={count}
                max={Math.max(...Object.values(camEstimates), 1)}
                color={camColor}
                total={totalCams}
              />
            );
          })}
        </div>
      )}

      {/* per-block cam breakdown */}
      {total > 0 && (
        <div style={{ padding: "0.6rem 0.75rem" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Chi tiết theo vị trí</div>
          {activeBlocks.map(blockId => {
            const block = BLOCKS[blockId];
            const cnt   = blockCounts[blockId] || 0;
            const eff   = effectiveCams(blockId, camConfig);
            const effTotal = CAM_TYPES.reduce((s, t) => s + (eff[t] || 0), 0);
            const totalBlockCams = effTotal * cnt;
            if (!totalBlockCams) return null;
            const shape = SQUARE_BLOCKS.includes(blockId) ? "■" : "●";
            return (
              <div key={blockId} style={{
                marginBottom: "0.5rem", padding: "0.4rem 0.55rem",
                background: `${block.color}0a`, border: `1px solid ${block.color}22`,
                borderRadius: "6px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span style={{ fontSize: "0.73rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: block.color }}>{shape}</span>
                    <span style={{ color: block.color }}>{blockId}</span>
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#94a3b8", flexShrink: 0 }}>
                    {cnt}×{effTotal} = <strong style={{ color: C.amber }}>{totalBlockCams}</strong>
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {CAM_TYPES.filter(t => (eff[t] || 0) > 0).map(t => (
                    <span key={t} style={{
                      fontSize: "0.6rem", padding: "1px 5px",
                      background: `${CAM_COLORS[t] || C.cyan}18`,
                      border: `1px solid ${CAM_COLORS[t] || C.cyan}44`,
                      borderRadius: "3px", color: CAM_COLORS[t] || C.cyan,
                    }}>{t}×{eff[t]}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total === 0 && !loading && (
        <div style={{ padding: "2rem 1rem", textAlign: "center", color: C.muted, fontSize: "0.8rem" }}>
          Chưa có dữ liệu.<br />
          <span style={{ fontSize: "0.72rem" }}>Nhấn Scan để tìm vị trí.</span>
        </div>
      )}
    </div>
  );
}

/* ─── right panel ─────────────────────────────────────────────────────────── */
export default function RightPanel({ fullscreen = false, onCollapse }) {
  const { loading } = useScanner();
  const [tab, setTab] = useState("results");

  return (
    <div style={{
      width: fullscreen ? "100%" : "min(280px, 100vw)", flexShrink: 0,
      background: C.bg,
      borderLeft: fullscreen ? "none" : `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      height: fullscreen ? "auto" : undefined,
      minHeight: fullscreen ? "100%" : undefined,
    }}>

      {/* ── tab bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", background: C.bg2,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, alignItems: "stretch",
      }}>
        {onCollapse && (
          <button onClick={onCollapse} title="Thu nhỏ panel" style={{
            background: `${C.cyan}18`, border: "none", borderRight: `1px solid ${C.border}`,
            color: C.cyan, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
            padding: "0 8px", flexShrink: 0, display: "flex", alignItems: "center", gap: "3px",
          }}>Ẩn ›</button>
        )}
        {[
          { key: "results",    label: "Kết quả", icon: "📋" },
          { key: "stats",      label: "Thống kê", icon: "📊" },
          { key: "categories", label: "Lọc",       icon: "🏷" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "0.55rem 0",
            background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.key ? C.cyan : "transparent"}`,
            color: tab === t.key ? C.cyan : C.muted,
            fontSize: "0.72rem", fontWeight: tab === t.key ? 700 : 400,
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
          }}>
            <span style={{ fontSize: "0.9rem" }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── content ─────────────────────────────────────────────────────── */}
      {tab === "results" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ResultsList />
        </div>
      )}

      {tab === "stats" && <StatsTab />}

      {tab === "categories" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <BlockFilter />
        </div>
      )}
    </div>
  );
}
