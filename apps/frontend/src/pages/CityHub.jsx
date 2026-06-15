/**
 * City Scan Hub — primary interface for city-wide batch scanning.
 * Route: /city
 *
 * Replaces /plan as the main destination. Shows scan status, live progress,
 * and the full stats dashboard when done. Also links to CityMap choropleth.
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useScanStore from "../store/scanStore.js";
import useCityStore from "../store/cityStore.js";
import { aggregateWards, exportJSON, exportCSV } from "../services/cityBatchScan.js";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg: "#060d1a", bg2: "#0b1425", bg3: "#0d1829",
  card: "#0d1829", card2: "#0f1f35",
  border: "#1a2e4a", border2: "#1e3a56",
  cyan: "#38BDF8", violet: "#A78BFA", green: "#34D399",
  amber: "#FBBF24", pink: "#F472B6", red: "#F87171",
  orange: "#FB923C", lime: "#86efac", gold: "#fcd34d",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
};

const LOC_CAM = { intersection: 4, school: 10, hospital: 30, market: 20, hotel: 8, park: 10, conference: 15, government: 12 };
const PLAN_TOTAL = 1_100_000;

function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }
function fmtK(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : fmt(n); }

function Tag({ children, color = C.cyan }) {
  return (
    <span style={{
      display: "inline-block", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.1em",
      textTransform: "uppercase", padding: "3px 10px", borderRadius: "100px",
      border: `1px solid ${color}55`, background: `${color}18`, color,
    }}>{children}</span>
  );
}

function Bar({ pct, color, height = 7, delay = 0 }) {
  const [w, setW] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    setW(0);
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      setTimeout(() => setW(Math.max(0, Math.min(100, pct))), delay);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct, delay]);
  return (
    <div ref={ref} style={{ height, background: C.border, borderRadius: 100, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 100, transition: "width 1.1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

/* ── Progress view ─────────────────────────────────────────────── */
function ScanProgress({ progress, scanMode, wardResults, onStop }) {
  const agg = wardResults ? aggregateWards(wardResults) : null;
  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗺️</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.text }}>
            {scanMode === "retry" ? "Đang thử lại phường lỗi" : scanMode === "resume" ? "Tiếp tục quét TP.HCM" : "Đang quét toàn TP.HCM"}
          </div>
          <div style={{ fontSize: "0.8rem", color: C.dim, marginTop: "0.3rem" }}>
            Phường {progress.current}/{progress.total} — {progress.wardName}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: C.muted, marginBottom: "0.4rem" }}>
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

        {agg && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.7rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Camera tính được", val: fmt(agg.camCount),                  color: C.cyan },
              { label: "Giao lộ",           val: fmt(agg.byCat.intersection || 0),  color: C.amber },
              { label: "Đường (km)",         val: agg.roadKm.toFixed(1),             color: C.violet },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderRadius: "8px", padding: "0.7rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color }}>{val}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: "0.2rem" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {wardResults && wardResults.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "0.8rem 1rem", marginBottom: "1.5rem", maxHeight: "200px", overflowY: "auto" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>Vừa quét</div>
            {[...wardResults].reverse().slice(0, 15).map((w, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", padding: "0.2rem 0", borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: w.error ? C.red : C.dim }}>{w.error ? "❌" : "✓"} {w.name}</span>
                <span style={{ color: w.error ? C.red : C.text, fontWeight: 600 }}>
                  {w.error ? w.error.slice(0, 40) : `${w.camCount} cam · ${w.roadKm.toFixed(1)} km`}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <button onClick={onStop} style={{
            background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: "8px",
            padding: "0.6rem 1.5rem", color: C.red, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>⏹ Dừng</button>
        </div>
        <div style={{ textAlign: "center", fontSize: "0.68rem", color: C.muted, marginTop: "0.8rem" }}>
          Quét tuần tự mỗi 1.6s · Geometry được lưu vào IndexedDB sau mỗi phường
        </div>
      </div>
    </div>
  );
}

/* ── Idle / Resumable panel ─────────────────────────────────────── */
function IdlePanel({ status, wardResults, aggregate, onStartFresh, onResume, onRetryFailed, onViewPartial, navigate }) {
  const isResumable = status === "resumable";
  const failedCount = wardResults ? wardResults.filter(w => w.error).length : 0;
  const doneCount   = wardResults ? wardResults.filter(w => !w.error).length : 0;

  return (
    <div style={{ minHeight: "72vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem" }}>
      <div style={{ fontSize: "3.5rem" }}>{isResumable ? "⏸️" : "🗺️"}</div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: C.text, marginBottom: "0.5rem" }}>
          {isResumable ? "Đã tạm dừng" : "City Scan Hub"}
        </div>
        <div style={{ fontSize: "0.85rem", color: C.dim, maxWidth: "500px", lineHeight: 1.7 }}>
          {isResumable ? (
            <>
              Đã quét <strong style={{ color: C.green }}>{doneCount} phường</strong> thành công
              {failedCount > 0 && <>, <strong style={{ color: C.red }}>{failedCount} lỗi</strong></>}.
              Geometry được lưu vào <strong style={{ color: C.cyan }}>IndexedDB</strong> — click phường bất kỳ trên bản đồ để xem ngay không cần quét lại.
            </>
          ) : (
            <>
              Quét toàn bộ <strong style={{ color: C.cyan }}>168 phường/xã TP.HCM</strong> từ OpenStreetMap.
              Camera, đường, giao lộ được lưu vào <strong style={{ color: C.cyan }}>IndexedDB</strong> (~30MB) —
              sau khi quét, click bất kỳ phường nào trên bản đồ để xem chi tiết ngay lập tức.
            </>
          )}
        </div>
      </div>

      {isResumable && wardResults && (
        <div style={{ width: "100%", maxWidth: "500px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: C.muted, marginBottom: "0.4rem" }}>
            <span>{doneCount}/{168} phường hoàn tất · Geometry trong IDB</span>
            {failedCount > 0 && <span style={{ color: C.red }}>{failedCount} lỗi</span>}
          </div>
          <div style={{ height: "8px", background: C.border, borderRadius: "100px", overflow: "hidden", display: "flex" }}>
            <div style={{ flex: doneCount, background: C.green }} />
            <div style={{ flex: failedCount, background: C.red, opacity: 0.6 }} />
            <div style={{ flex: Math.max(168 - doneCount - failedCount, 0) }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        {isResumable ? (
          <>
            {doneCount + failedCount < 168 && (
              <button onClick={onResume} style={{
                background: `linear-gradient(135deg,${C.green},${C.cyan})`,
                border: "none", borderRadius: "10px", padding: "0.75rem 2rem",
                color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
              }}>▶ Tiếp tục ({168 - doneCount - failedCount} còn lại)</button>
            )}
            {failedCount > 0 && (
              <button onClick={onRetryFailed} style={{
                background: `linear-gradient(135deg,${C.amber},${C.orange})`,
                border: "none", borderRadius: "10px", padding: "0.75rem 1.75rem",
                color: "#000", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
              }}>🔁 Thử lại {failedCount} lỗi</button>
            )}
            {aggregate && doneCount > 0 && (
              <button onClick={onViewPartial} style={{
                background: C.card2, border: `1px solid ${C.border}`, borderRadius: "10px",
                padding: "0.75rem 1.5rem", color: C.dim, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              }}>📊 Xem kết quả ({doneCount} phường)</button>
            )}
          </>
        ) : (
          <button onClick={onStartFresh} style={{
            background: `linear-gradient(135deg,${C.cyan},${C.violet})`,
            border: "none", borderRadius: "10px", padding: "0.75rem 2rem",
            color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
          }}>🚀 Bắt đầu quét TP.HCM</button>
        )}
        {isResumable && (
          <button onClick={onStartFresh} style={{
            background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: "10px",
            padding: "0.75rem 1.25rem", color: C.red, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
          }}>🔄 Quét lại từ đầu</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.6rem", width: "100%", maxWidth: "580px" }}>
        {[
          { icon: "🗺️", text: "168 phường/xã" },
          { icon: "💾", text: "Lưu IDB sau mỗi phường" },
          { icon: "⚡", text: "Click xem ngay, no re-scan" },
          { icon: "🔁", text: "Resume & retry" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "0.6rem", textAlign: "center", fontSize: "0.7rem", color: C.dim }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{icon}</div>
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Aggregate dashboard (compact) ─────────────────────────────── */
const CAT_META = [
  { key: "intersection", icon: "🔀", label: "Giao lộ",     color: C.cyan,   cam: 4 },
  { key: "school",       icon: "🏫", label: "Trường học",   color: C.violet, cam: 10 },
  { key: "hospital",     icon: "🏥", label: "Bệnh viện",    color: C.green,  cam: 30 },
  { key: "market",       icon: "🏪", label: "Chợ/TTTM",     color: C.amber,  cam: 20 },
  { key: "park",         icon: "🌳", label: "Công viên",    color: C.lime,   cam: 10 },
  { key: "hotel",        icon: "🏨", label: "Khách sạn",    color: C.pink,   cam: 8 },
  { key: "conference",   icon: "🏢", label: "Hội nghị",     color: "#f9a8d4", cam: 15 },
  { key: "government",   icon: "🏛️", label: "Cơ quan",      color: C.gold,   cam: 12 },
];

function Dashboard({ agg, wardResults }) {
  const diff = agg.camCount - PLAN_TOTAL;
  const diffColor = Math.abs(diff) < 150_000 ? C.green : diff > 0 ? C.amber : C.red;
  const topWards = [...wardResults].filter(w => !w.error).sort((a, b) => b.camCount - a.camCount).slice(0, 8);
  const maxCam = topWards[0]?.camCount || 1;

  return (
    <div>
      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.7rem", marginBottom: "1rem" }}>
        {[
          { icon: "📹", label: "Camera OSM", val: fmt(agg.camCount), sub: `KH: ${fmt(PLAN_TOTAL)}`, color: C.cyan },
          { icon: "🔀", label: "Giao lộ",    val: fmt(agg.byCat.intersection || 0), sub: `${fmt((agg.byCat.intersection||0)*4)} cam giao lộ`, color: C.amber },
          { icon: "🛣️", label: "Đường (km)", val: fmt(agg.roadKm),  sub: `${(agg.roadKm/2095).toFixed(1)} km/km²`, color: C.violet },
          { icon: "✅", label: "Phường xong", val: `${agg.completed}/168`, sub: `${agg.errors} lỗi`, color: C.green },
        ].map(({ icon, label, val, sub, color }) => (
          <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: "10px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>{icon}</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color, lineHeight: 1.1 }}>{val}</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.text, margin: "0.15rem 0 0.1rem" }}>{label}</div>
            <div style={{ fontSize: "0.62rem", color: C.muted }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>
        {/* Camera types */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
            Loại camera — {fmt(agg.camCount)} tổng · KH {fmt(PLAN_TOTAL)} · Chênh <span style={{ color: diffColor }}>{diff > 0 ? "+" : ""}{fmt(diff)}</span>
          </div>
          {[
            { label: "CAM1 — Đường dài",       v: agg.cam1,     color: C.cyan },
            { label: "CAM2/2.2 — Giao lộ đèn", v: agg.cam2,     color: C.amber },
            { label: "CAM2.1/2.3 — Không đèn", v: agg.cam21,    color: C.orange },
            { label: "CAM_alley — Đầu hẻm",    v: agg.camAlley, color: C.green },
          ].filter(r => r.v > 0).map((r, i) => (
            <div key={i} style={{ marginBottom: "0.45rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.15rem" }}>
                <span style={{ color: C.dim }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color }}>{fmt(r.v)}</span>
              </div>
              <Bar pct={Math.round((r.v / Math.max(agg.camCount, 1)) * 100)} color={r.color} height={5} delay={i * 100} />
            </div>
          ))}
        </div>

        {/* Top wards */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Top 8 phường</div>
          {topWards.map((w, i) => (
            <div key={w.code} style={{ marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "0.1rem" }}>
                <span style={{ color: i < 3 ? C.amber : C.dim }}>{i + 1}. {w.name}</span>
                <span style={{ color: C.text, fontWeight: 700 }}>{fmtK(w.camCount)}</span>
              </div>
              <Bar pct={(w.camCount / maxCam) * 100} color={i < 3 ? C.amber : C.violet} height={4} delay={i * 50} />
            </div>
          ))}
        </div>
      </div>

      {/* Category table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "0.75rem 1.1rem", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 800, fontSize: "0.82rem" }}>Theo loại địa điểm</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg2 }}>
              {["Địa điểm", "POI", "Cam/node", "Camera"].map((h, i) => (
                <th key={h} style={{ padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: i > 0 ? "right" : "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAT_META.map((cat) => {
              const poi = agg.byCat[cat.key] || 0;
              const cam = Math.round(poi * cat.cam);
              return (
                <tr key={cat.key} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "0.45rem 0.7rem", fontSize: "0.74rem", color: C.text }}>{cat.icon} {cat.label}</td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right", fontSize: "0.74rem", color: poi > 0 ? C.text : C.muted }}>{poi > 0 ? fmt(poi) : "—"}</td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right" }}><Tag color={cat.color}>{cat.cam}×</Tag></td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right", fontSize: "0.82rem", fontWeight: 900, color: cat.color }}>{cam > 0 ? fmt(cam) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function CityHub() {
  const navigate = useNavigate();
  const {
    status, scanMode, progress, wardResults, errorMsg,
    startFresh, resume, retryFailed, stop, reset, initFromCache,
  } = useCityStore();

  const aggregate = useMemo(() => wardResults ? aggregateWards(wardResults) : null, [wardResults]);
  const [viewPartial, setViewPartial] = useState(false);

  useEffect(() => { initFromCache(); }, []);

  const showDashboard = (status === "done" || viewPartial) && aggregate;
  const failedCount   = wardResults ? wardResults.filter(w => w.error).length : 0;
  const savedAt = useCityStore(s => s.savedAt);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 1.25rem", height: "48px",
        background: `${C.bg}f4`, borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span onClick={() => navigate("/")} style={{ cursor: "pointer", fontSize: "1.1rem" }}>📹</span>
          <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>City Scan Hub</span>
          <Tag color={C.amber}>TP.HCM · 168 PHƯỜNG</Tag>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {savedAt && <span style={{ fontSize: "0.62rem", color: C.muted }}>Lưu lúc {new Date(savedAt).toLocaleString("vi-VN")}</span>}

          {showDashboard && failedCount > 0 && (
            <button onClick={retryFailed} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.amber}18`, border: `1px solid ${C.amber}44`, color: C.amber }}>🔁 Retry {failedCount}</button>
          )}
          {(showDashboard || status === "resumable") && (
            <button onClick={() => navigate("/city-map")} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.green}18`, border: `1px solid ${C.green}44`, color: C.green }}>🗺 Bản đồ</button>
          )}
          {showDashboard && wardResults && (
            <>
              <button onClick={() => exportCSV(wardResults)} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet }}>⬇ CSV</button>
              <button onClick={() => exportJSON(wardResults)} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet }}>⬇ JSON</button>
              <button onClick={() => window.print()} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.amber}18`, border: `1px solid ${C.amber}44`, color: C.amber }}>🖨 PDF</button>
            </>
          )}
          {showDashboard && (
            <button onClick={() => { setViewPartial(false); reset(); }} style={{ fontSize: "0.7rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.red}18`, border: `1px solid ${C.red}44`, color: C.red }}>🔄 Quét lại</button>
          )}
          <button onClick={() => navigate("/scan")} style={{ fontSize: "0.74rem", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700, background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`, color: C.cyan }}>
            🔍 Quét thủ công
          </button>
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {status === "running" ? (
        <ScanProgress progress={progress} scanMode={scanMode} wardResults={wardResults} onStop={stop} />
      ) : showDashboard ? (
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.25rem 1.25rem 3rem" }}>
          {(viewPartial || failedCount > 0) && (
            <div style={{ marginBottom: "1rem", padding: "0.55rem 1rem", background: `${C.amber}0d`, border: `1px solid ${C.amber}33`, borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.78rem" }}>
              <span>⚠️</span>
              <span style={{ color: C.amber, fontWeight: 600 }}>
                {viewPartial ? `Kết quả tạm — ${aggregate.completed}/168 phường. ` : `${failedCount} phường lỗi. `}
                <button onClick={() => { setViewPartial(false); retryFailed(); }} style={{ background: "none", border: "none", color: C.cyan, cursor: "pointer", fontWeight: 700, textDecoration: "underline" }}>Thử lại →</button>
              </span>
            </div>
          )}
          <Dashboard agg={aggregate} wardResults={wardResults} />
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/city-map")} style={{ background: `linear-gradient(135deg,${C.green},${C.cyan})`, border: "none", borderRadius: "9px", padding: "0.6rem 1.5rem", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
              🗺 Mở bản đồ choropleth →
            </button>
          </div>
        </div>
      ) : status === "error" ? (
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>❌</div>
          <div style={{ color: C.red, fontWeight: 700 }}>Lỗi khi quét</div>
          <div style={{ fontSize: "0.8rem", color: C.muted, maxWidth: "400px", textAlign: "center" }}>{errorMsg}</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={resume} style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}44`, borderRadius: "8px", padding: "0.6rem 1.5rem", color: C.amber, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>▶ Tiếp tục</button>
            <button onClick={reset} style={{ background: `${C.muted}18`, border: `1px solid ${C.muted}44`, borderRadius: "8px", padding: "0.6rem 1rem", color: C.muted, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>Xóa & quét lại</button>
          </div>
        </div>
      ) : (
        <IdlePanel
          status={status}
          wardResults={wardResults}
          aggregate={aggregate}
          onStartFresh={startFresh}
          onResume={resume}
          onRetryFailed={retryFailed}
          onViewPartial={() => setViewPartial(true)}
          navigate={navigate}
        />
      )}

      <style>{`
        @media print {
          nav, button { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
