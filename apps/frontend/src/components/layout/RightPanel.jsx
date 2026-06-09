import React, { useState } from "react";
import { useScanner } from "../../hooks/useScanner.js";
import { useExport } from "../../hooks/useExport.js";
import { CATEGORIES } from "../../utils/categories.js";
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

/* ─── tiny helpers ────────────────────────────────────────────────────────── */
function PanelSection({ title, action, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.55rem 0.85rem",
        background: C.bg2,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: "0.6rem 0.85rem" }}>{children}</div>
    </div>
  );
}

/* ─── stat badge ──────────────────────────────────────────────────────────── */
function StatBadge({ label, value, color = C.cyan }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      background: `${color}0e`, border: `1px solid ${color}28`,
      borderRadius: "8px", padding: "0.5rem 0.75rem", flex: 1,
    }}>
      <span style={{ fontSize: "1.2rem", fontWeight: 800, color }}>{value}</span>
      <span style={{ fontSize: "0.62rem", color: C.muted, marginTop: "2px", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

/* ─── mini bar chart ──────────────────────────────────────────────────────── */
function MiniBar({ label, value, max, color, total }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const share = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
      <div style={{ fontSize: "0.72rem", color: C.dim, width: "90px", flexShrink: 0, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: "6px", background: `${color}20`, borderRadius: "3px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}99)`,
          borderRadius: "3px",
          transition: "width 0.6s ease",
        }} />
      </div>
      <div style={{ fontSize: "0.68rem", color: C.muted, width: "26px", textAlign: "right", flexShrink: 0 }}>{value}</div>
      <div style={{ fontSize: "0.62rem", color: `${color}aa`, width: "28px", textAlign: "right", flexShrink: 0 }}>{share}%</div>
    </div>
  );
}

/* ─── camera type info ────────────────────────────────────────────────────── */
const CAM_TYPE_META = {
  cam1:      { label: "CAM1 — Đường dài",       color: "#38BDF8" },
  cam2:      { label: "CAM2 — Ngã3 + đèn",      color: "#FBBF24" },
  cam22:     { label: "CAM2.2 — Ngã4 + đèn",    color: "#FBBF24" },
  cam21:     { label: "CAM2.1 — Ngã3 không đèn", color: "#FB923C" },
  cam23:     { label: "CAM2.3 — Ngã4 không đèn", color: "#FB923C" },
  cam_alley: { label: "CAM Hẻm — Đầu hẻm",      color: "#34D399" },
};

/* ─── camera display toggle (used in Lọc tab) ────────────────────────────── */
function CameraToggle() {
  const { cameras, showCameras, setShowCameras } = useScanner();
  if (!cameras || cameras.length === 0) return null;

  return (
    <div style={{
      padding: "0.65rem 0.85rem",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: "0.67rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
        Vị trí Camera
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
        <div
          onClick={() => setShowCameras(!showCameras)}
          style={{
            width: "36px", height: "20px", borderRadius: "10px", position: "relative",
            background: showCameras ? C.cyan : C.muted,
            transition: "background 0.2s", flexShrink: 0, cursor: "pointer",
          }}
        >
          <div style={{
            position: "absolute", top: "3px",
            left: showCameras ? "18px" : "3px",
            width: "14px", height: "14px", borderRadius: "50%",
            background: "white", transition: "left 0.2s",
          }} />
        </div>
        <span style={{ fontSize: "0.77rem", color: showCameras ? C.text : C.muted, userSelect: "none" }}>
          {showCameras ? "Đang hiển thị" : "Đã ẩn"} · <span style={{ color: C.cyan }}>{cameras.length} camera</span>
        </span>
      </label>
    </div>
  );
}

/* ─── result legend (filter by category in results) ──────────────────────── */
function ResultLegend() {
  const { stats, filter, setFilter, points } = useScanner();
  const allKeys = Object.keys(CATEGORIES);
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
        Click vào loại để lọc danh sách kết quả.
        {filter && (
          <button onClick={() => setFilter(null)} style={{
            marginLeft: "0.5rem", fontSize: "0.62rem", padding: "1px 7px",
            background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`,
            borderRadius: "100px", color: C.cyan, cursor: "pointer",
          }}>✕ Bỏ lọc</button>
        )}
      </div>
      {allKeys.map((key) => {
        const cat = CATEGORIES[key];
        const count = stats[key] || 0;
        if (!count) return null;
        const isActive = filter === key;
        return (
          <div
            key={key}
            onClick={() => setFilter(isActive ? null : key)}
            style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              padding: "0.45rem 0.6rem", marginBottom: "0.25rem",
              borderRadius: "7px", cursor: "pointer",
              background: isActive ? `${cat.color}18` : `${cat.color}07`,
              border: `1px solid ${isActive ? cat.color + "55" : cat.color + "20"}`,
              transition: "all 0.15s",
            }}
          >
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: "0.78rem", color: isActive ? C.text : C.dim, fontWeight: isActive ? 600 : 400 }}>
              {cat.label}
            </span>
            <span style={{
              fontSize: "0.68rem", padding: "1px 7px",
              background: `${cat.color}22`, border: `1px solid ${cat.color}44`,
              borderRadius: "100px", color: cat.color, fontWeight: 700,
            }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── category filter ─────────────────────────────────────────────────────── */
function CategoryFilter() {
  const { categories, setCategories, filter, setFilter, stats } = useScanner();
  const allKeys = Object.keys(CATEGORIES);

  const toggle = (key) => {
    if (categories.includes(key)) setCategories(categories.filter(k => k !== key));
    else setCategories([...categories, key]);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.55rem" }}>
        <button style={btnStyle} onClick={() => setCategories(allKeys)}>Tất cả</button>
        <button style={btnStyle} onClick={() => setCategories([])}>Bỏ chọn</button>
        {filter && (
          <button style={{ ...btnStyle, color: C.cyan, borderColor: `${C.cyan}44` }} onClick={() => setFilter(null)}>✕ Bỏ lọc</button>
        )}
      </div>
      {allKeys.map((key) => {
        const cat = CATEGORIES[key];
        const count = stats[key] || 0;
        const isActive = categories.includes(key);
        const isFiltered = filter === key;
        return (
          <div key={key} style={{
            display: "flex", alignItems: "center", gap: "0.45rem",
            padding: "0.28rem 0.35rem",
            borderRadius: "5px",
            background: isFiltered ? `${cat.color}14` : "transparent",
            cursor: "pointer",
            marginBottom: "1px",
            transition: "background 0.12s",
          }}
            onMouseEnter={e => { if (!isFiltered) e.currentTarget.style.background = `${cat.color}0a`; }}
            onMouseLeave={e => { if (!isFiltered) e.currentTarget.style.background = "transparent"; }}
          >
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => toggle(key)}
              style={{ cursor: "pointer", accentColor: cat.color, margin: 0 }}
              onClick={e => e.stopPropagation()}
            />
            <div style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: cat.color, flexShrink: 0,
            }} />
            <span
              style={{ flex: 1, fontSize: "0.77rem", color: isActive ? C.text : C.muted, userSelect: "none" }}
              onClick={() => setFilter(isFiltered ? null : key)}
            >{cat.label}</span>
            {count > 0 && (
              <span style={{
                fontSize: "0.62rem", padding: "1px 6px",
                background: `${cat.color}20`, border: `1px solid ${cat.color}40`,
                borderRadius: "100px", color: cat.color, fontWeight: 700,
              }}>{count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const btnStyle = {
  fontSize: "0.65rem", padding: "2px 8px",
  background: "none", border: `1px solid ${C.border}`,
  color: C.muted, borderRadius: "4px", cursor: "pointer",
};

/* ─── results list ────────────────────────────────────────────────────────── */
function ResultsList() {
  const { points, filter, selectedPoint, setSelectedPoint, removePoint } = useScanner();
  const [confirmId, setConfirmId] = useState(null);
  const confirmPoint = confirmId ? points.find(p => p.id === confirmId) : null;
  const { exportCSV, exportGeoJSON } = useExport();

  const filtered = filter ? points.filter(p => p.category === filter) : points;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* toolbar */}
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

      {/* list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "2rem 1rem", textAlign: "center", color: C.muted, fontSize: "0.8rem" }}>
            Chưa có kết quả.<br />
            <span style={{ fontSize: "0.72rem" }}>Nhấn Scan để tìm vị trí.</span>
          </div>
        ) : (
          filtered.map((p) => {
            const cat = CATEGORIES[p.category];
            const isSelected = selectedPoint?.id === p.id;
            return (
              <div
                key={p.id}
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
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = `${cat?.color || C.cyan}08`; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: "7px", height: "7px", borderRadius: "50%",
                  background: cat?.color || C.cyan, flexShrink: 0, marginTop: "5px",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.78rem", color: isSelected ? C.amber : C.text,
                    fontWeight: isSelected ? 600 : 400,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{p.name}
                    {p.source === "custom" && (
                      <span style={{ marginLeft: "5px", fontSize: "0.6rem", padding: "1px 4px", background: `${C.green}22`, color: C.green, borderRadius: "3px" }}>thủ công</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.67rem", color: C.muted, marginTop: "2px" }}>
                    {cat?.label} · {p.distanceM >= 1000 ? `${(p.distanceM / 1000).toFixed(1)}km` : `${p.distanceM}m`}
                    {p.score !== undefined && <span style={{ color: `${C.amber}99`, marginLeft: "4px" }}>★{p.score}</span>}
                  </div>
                </div>
                <button
                  title="Xóa điểm"
                  onClick={e => { e.stopPropagation(); setConfirmId(p.id); }}
                  style={{
                    flexShrink: 0, background: "none", border: "none",
                    color: C.dim, cursor: "pointer", fontSize: "0.85rem",
                    padding: "2px 4px", borderRadius: "3px", lineHeight: 1,
                    opacity: 0.5,
                  }}
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

/* ─── right panel ─────────────────────────────────────────────────────────── */
export default function RightPanel({ fullscreen = false, onCollapse }) {
  const { points, stats, loading, cameras } = useScanner();
  const [tab, setTab] = useState("results"); // "results" | "stats"

  const allKeys = Object.keys(CATEGORIES);
  const total = points.length;
  const maxCount = Math.max(...allKeys.map(k => stats[k] || 0), 1);

  const intersectionPct = total > 0 ? Math.round(((stats.intersection || 0) / total) * 100) : 0;

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

      {/* ── tab bar + collapse button ────────────────────────────────────── */}
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

      {tab === "stats" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* summary badges */}
          <div style={{ padding: "0.75rem 0.85rem", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <StatBadge label="Tổng điểm" value={loading ? "…" : total} color={C.cyan} />
              <StatBadge label="Giao lộ" value={loading ? "…" : (stats.intersection || 0)} color="#FF6B6B" />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <StatBadge label="Trường học" value={stats.school || 0} color="#339AF0" />
              <StatBadge label="Bệnh viện" value={stats.hospital || 0} color="#FF8787" />
            </div>
          </div>

          {/* donut-style ratio */}
          {total > 0 && (
            <div style={{ padding: "0.75rem 0.85rem", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>Tỉ lệ</div>
              <div style={{ height: "8px", borderRadius: "4px", overflow: "hidden", display: "flex", marginBottom: "0.6rem" }}>
                {allKeys.map(k => {
                  const cnt = stats[k] || 0;
                  if (!cnt) return null;
                  return (
                    <div key={k} title={`${CATEGORIES[k].label}: ${cnt}`} style={{
                      flex: cnt, background: CATEGORIES[k].color,
                      transition: "flex 0.5s ease",
                    }} />
                  );
                })}
              </div>
              {/* legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem 0.5rem" }}>
                {allKeys.filter(k => stats[k] > 0).map(k => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "0.64rem", color: C.muted }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: CATEGORIES[k].color, flexShrink: 0 }} />
                    {CATEGORIES[k].label.split(" ")[0]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* bar chart */}
          <div style={{ padding: "0.75rem 0.85rem", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.7rem" }}>Phân bố theo loại</div>
            {total === 0 ? (
              <div style={{ color: C.muted, fontSize: "0.78rem", textAlign: "center", padding: "1rem 0" }}>Chưa có dữ liệu</div>
            ) : (
              allKeys.map(k => (
                <MiniBar
                  key={k}
                  label={CATEGORIES[k].label}
                  value={stats[k] || 0}
                  max={maxCount}
                  color={CATEGORIES[k].color}
                  total={total}
                />
              ))
            )}
          </div>

          {/* camera stats */}
          {cameras && cameras.length > 0 && (() => {
            const camByType = {};
            for (const c of cameras) camByType[c.type] = (camByType[c.type] || 0) + 1;
            const camMax = Math.max(...Object.values(camByType), 1);
            return (
              <div style={{ padding: "0.75rem 0.85rem" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.7rem" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Camera đề xuất</div>
                  <span style={{ fontSize: "1rem", fontWeight: 800, color: C.cyan }}>{cameras.length}</span>
                </div>
                {Object.entries(CAM_TYPE_META).map(([type, meta]) => {
                  const count = camByType[type] || 0;
                  if (!count) return null;
                  return (
                    <MiniBar
                      key={type}
                      label={meta.label.split(" — ")[0]}
                      value={count}
                      max={camMax}
                      color={meta.color}
                      total={cameras.length}
                    />
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {tab === "categories" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <CameraToggle />
          <ResultLegend />
        </div>
      )}

    </div>
  );
}
