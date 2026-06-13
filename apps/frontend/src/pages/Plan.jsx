import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useScanStore from "../store/scanStore.js";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#060d1a", bg2: "#0b1425", bg3: "#0d1829",
  card:   "#0d1829", card2: "#0f1f35",
  border: "#1a2e4a", border2: "#1e3a56",
  cyan:   "#38BDF8", violet: "#A78BFA", green: "#34D399",
  amber:  "#FBBF24", pink:   "#F472B6", red:   "#F87171",
  orange: "#FB923C", lime:   "#86efac", gold:  "#fcd34d",
  text:   "#e2e8f0", muted:  "#64748b", dim:   "#94a3b8",
};

/* ─── city reference data ──────────────────────────────────────────────────── */
const LOC_CAM = { intersection: 4, school: 10, hospital: 30, market: 20, hotel: 8, park: 10, conference: 15, government: 12 };
const AREAS = { hcm: 2095, hcmNew: 6772 };
const PLAN = {
  total: 1_100_000,
  byLoc: { intersection: 200_000, road: 92_500, school: 50_000, hospital: 20_000, market: 50_000, industrial: 120_000, park: 30_000, transport: 80_000, ai: 100_000 },
};

/* ─── helpers ─────────────────────────────────────────────────────────────── */
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

function Counter({ to, duration = 1400 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || ran.current) return;
      ran.current = true; obs.disconnect();
      let start = null;
      const step = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * to));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString("vi-VN")}</span>;
}

function Bar({ pct, color, height = 7, delay = 0 }) {
  const [w, setW] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
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

function Donut({ slices, size = 130, label, sub }) {
  const r = size * 0.32, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.v, 0);
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={size * 0.135} />
      {slices.map((s, i) => {
        const len = (s.v / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={size * 0.135}
            strokeDasharray={`${len - 1.5} ${circ - len + 1.5}`} strokeDashoffset={-off}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }} />
        );
        off += len; return el;
      })}
      {label && <>
        <text x={cx} y={cy - 4} textAnchor="middle" fill={C.text} fontSize={size * 0.13} fontWeight="900">{label}</text>
        {sub && <text x={cx} y={cy + 13} textAnchor="middle" fill={C.muted} fontSize={size * 0.075}>{sub}</text>}
      </>}
    </svg>
  );
}

function VBar({ bars, height = 150 }) {
  const max = Math.max(...bars.map(b => b.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height }}>
      {bars.map((b, i) => {
        const h = Math.max((b.v / max) * (height - 32), 4);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ fontSize: "0.56rem", color: C.dim, textAlign: "center" }}>{fmtK(b.v)}</div>
            <div style={{ width: "100%", height: h, background: b.color, borderRadius: "4px 4px 0 0", opacity: 0.88 }} />
            <div style={{ fontSize: "0.56rem", color: C.muted, textAlign: "center", lineHeight: 1.2 }}>{b.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── compute estimates from scan data ────────────────────────────────────── */
function useEstimate() {
  const points  = useScanStore(s => s.points);
  const cameras = useScanStore(s => s.cameras);
  const area    = useScanStore(s => s.area);
  const roads   = useScanStore(s => s.roads);

  return useMemo(() => {
    const areaKm2 = Math.PI * (area.radiusM / 1000) ** 2;
    if (areaKm2 < 0.01 || cameras.length === 0) return null;

    const cam1     = cameras.filter(c => c.type === "cam1").length;
    const cam2     = cameras.filter(c => ["cam2","cam22"].includes(c.type)).length;
    const cam21    = cameras.filter(c => ["cam21","cam23"].includes(c.type)).length;
    const camAlley = cameras.filter(c => c.type === "cam_alley").length;
    const totalCam = cameras.length;

    const bycat = {};
    for (const p of points) bycat[p.category] = (bycat[p.category] || 0) + 1;

    const ixShapes = {};
    for (const p of points.filter(p => p.category === "intersection")) {
      const sh = p.intersectionShape || "minor";
      ixShapes[sh] = (ixShapes[sh] || 0) + 1;
    }

    let roadKm = 0;
    for (const r of roads) {
      const g = r.geometry;
      for (let i = 1; i < g.length; i++) {
        const dx = (g[i][0] - g[i-1][0]) * 111320 * Math.cos(g[i][1] * Math.PI / 180);
        const dy = (g[i][1] - g[i-1][1]) * 111320;
        roadKm += Math.sqrt(dx*dx + dy*dy) / 1000;
      }
    }

    const camPerKm2   = totalCam / areaKm2;
    const cam1PerRoadKm = cam1 / Math.max(roadKm, 0.1);
    const spacingM    = cam1PerRoadKm > 0 ? Math.round(1000 / cam1PerRoadKm) : 0;

    function scaleToArea(n, targetKm2) { return Math.round((n / areaKm2) * targetKm2); }

    function buildForArea(km2) {
      const catEst = {};
      for (const [k, v] of Object.entries(bycat)) catEst[k] = scaleToArea(v, km2);
      const camByCat = {};
      for (const [k, v] of Object.entries(catEst)) camByCat[k] = Math.round(v * (LOC_CAM[k] || 4));
      return {
        total:    Math.round(camPerKm2 * km2),
        cam1:     Math.round(cam1PerRoadKm * scaleToArea(roadKm, km2)),
        cam2:     scaleToArea(cam2, km2),
        cam21:    scaleToArea(cam21, km2),
        camAlley: scaleToArea(camAlley, km2),
        roadKm:   Math.round(scaleToArea(roadKm, km2)),
        bycat:    catEst,
        camByCat,
      };
    }

    return {
      sample: { areaKm2, totalCam, cam1, cam2, cam21, camAlley, roadKm, spacingM, camPerKm2, bycat, ixShapes },
      hcm:    buildForArea(AREAS.hcm),
      hcmNew: buildForArea(AREAS.hcmNew),
    };
  }, [points, cameras, area, roads]);
}

function NoData({ navigate }) {
  return (
    <div style={{ minHeight: "72vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
      <div style={{ fontSize: "3.5rem" }}>🗺️</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: C.text, marginBottom: "0.5rem" }}>Chưa có dữ liệu quét</div>
        <div style={{ fontSize: "0.85rem", color: C.dim, maxWidth: "360px", lineHeight: 1.7 }}>
          Mở Scanner, quét một khu vực TP.HCM — trang này sẽ tự động ước lượng số camera cần thiết cho toàn thành phố dựa trên mật độ thực tế.
        </div>
      </div>
      <button onClick={() => navigate("/scan")} style={{
        background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
        border: "none", borderRadius: "10px", padding: "0.7rem 2rem",
        color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
      }}>→ Mở Scanner</button>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */
export default function Plan() {
  const navigate = useNavigate();
  const est = useEstimate();
  const [tab, setTab] = useState("hcm");
  const target = tab === "hcm" ? est?.hcm : est?.hcmNew;
  const areaKm2Label = tab === "hcm" ? "TP.HCM · 2.095 km²" : "TP.HCM Mới · 6.772 km²";

  const diff = target ? target.total - PLAN.total : 0;
  const diffSign = diff > 0 ? "+" : "";
  const diffColor = Math.abs(diff) < 150_000 ? C.green : diff > 0 ? C.amber : C.red;

  const CAT_META = [
    { key: "intersection", icon: "🔀", label: "Giao lộ (ngã ba/tư/hẻm)", color: C.cyan,   planRef: PLAN.byLoc.intersection },
    { key: "school",       icon: "🏫", label: "Trường học, giáo dục",     color: C.violet, planRef: PLAN.byLoc.school },
    { key: "hospital",     icon: "🏥", label: "Bệnh viện, y tế",          color: C.green,  planRef: PLAN.byLoc.hospital },
    { key: "market",       icon: "🏪", label: "Chợ, TTTM",                color: C.amber,  planRef: PLAN.byLoc.market },
    { key: "park",         icon: "🌳", label: "Công viên, quảng trường",   color: C.lime,   planRef: PLAN.byLoc.park },
    { key: "hotel",        icon: "🏨", label: "Khách sạn, lưu trú",       color: C.pink,   planRef: null },
    { key: "conference",   icon: "🏢", label: "Hội nghị, trung tâm",      color: "#f9a8d4",planRef: null },
    { key: "government",   icon: "🏛️", label: "Cơ quan nhà nước",         color: C.gold,   planRef: null },
  ];

  const camTypeSlices = est ? [
    { v: est.sample.cam1,     color: C.cyan,   label: "CAM1" },
    { v: est.sample.cam2,     color: C.amber,  label: "CAM2" },
    { v: est.sample.cam21,    color: C.orange, label: "CAM2.1" },
    { v: est.sample.camAlley, color: C.green,  label: "Hẻm" },
  ].filter(s => s.v > 0) : [];

  const speedLabel = est
    ? est.sample.spacingM <= 75  ? "Rất dày · Năm 4 (2029)"
    : est.sample.spacingM <= 100 ? "Dày · Năm 3 (2028)"
    : est.sample.spacingM <= 200 ? "Vừa · Năm 2 (2027)"
    : "Thưa · Năm 1 (2026)"
    : "—";

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 1.25rem", height: "48px",
        background: `${C.bg}f4`, borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span onClick={() => navigate("/")} style={{ cursor: "pointer", fontSize: "1.1rem" }}>📹</span>
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Ước lượng Camera</span>
          <Tag color={C.amber}>TP.HCM · 1.1M KẾ HOẠCH</Tag>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {["hcm", "hcmNew"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontSize: "0.7rem", padding: "4px 11px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
              background: tab === t ? C.amber : C.card2, color: tab === t ? "#000" : C.dim,
              border: `1px solid ${tab === t ? C.amber : C.border}`,
            }}>{t === "hcm" ? "TP.HCM" : "TP.HCM Mới"}</button>
          ))}
          <button onClick={() => navigate("/scan")} style={{
            fontSize: "0.74rem", padding: "4px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
            background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`, color: C.cyan,
          }}>← Scanner</button>
        </div>
      </nav>

      {!est ? <NoData navigate={navigate} /> : (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.25rem 1.25rem 3rem" }}>

          {/* ── ROW 1: SAMPLE METRICS ────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.7rem", marginBottom: "1rem" }}>
            {[
              { icon: "📍", label: "Diện tích mẫu quét",  val: `${est.sample.areaKm2.toFixed(2)} km²`,  sub: `R = ${(est.sample.areaKm2 / Math.PI) ** 0.5 * 1000 | 0}m`,  color: C.cyan },
              { icon: "📹", label: "Camera trong mẫu",    val: fmt(est.sample.totalCam),                  sub: `${est.sample.camPerKm2.toFixed(1)} cam/km²`,               color: C.amber },
              { icon: "🛣️", label: "Đường trong mẫu",    val: `${est.sample.roadKm.toFixed(1)} km`,      sub: `KC TB ~${est.sample.spacingM}m/cam`,                        color: C.violet },
              { icon: "🔀", label: "Giao lộ trong mẫu",  val: fmt(est.sample.bycat.intersection || 0),   sub: Object.entries(est.sample.ixShapes).map(([k,v]) => `${v} ${k}`).join(" · "), color: C.green },
            ].map(({ icon, label, val, sub, color }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: "10px", padding: "0.85rem 1rem" }}>
                <div style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>{icon}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 900, color, lineHeight: 1.1 }}>{val}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, color: C.text, margin: "0.2rem 0 0.12rem" }}>{label}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* ── ROW 2: TỔNG QUAN KẾT QUẢ + DONUT + MẬT ĐỘ ─────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>

            {/* Kết quả chính */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
                Ước tính camera — {areaKm2Label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "1rem" }}>
                {[
                  { label: "Ước tính (từ mẫu)",   val: target?.total,  color: C.cyan,    big: true },
                  { label: "Kế hoạch chính thức", val: PLAN.total,      color: C.amber,   big: true },
                  { label: "Chênh lệch",           val: null,           color: diffColor, big: true,
                    display: `${diffSign}${fmt(diff)}` },
                ].map(({ label, val, color, display }) => (
                  <div key={label} style={{ background: C.card2, border: `1px solid ${color}33`, borderRadius: "9px", padding: "0.85rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.45rem", fontWeight: 900, color, lineHeight: 1 }}>
                      {display ?? (val != null ? <Counter to={val} /> : "—")}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: "0.35rem" }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Camera type breakdown bars */}
              {[
                { label: "CAM1 — Đường dài",       v: est.sample.cam1,     est: target?.cam1,     color: C.cyan },
                { label: "CAM2/2.2 — Giao lộ đèn", v: est.sample.cam2,     est: target?.cam2,     color: C.amber },
                { label: "CAM2.1/2.3 — Không đèn", v: est.sample.cam21,    est: target?.cam21,    color: C.orange },
                { label: "CAM_alley — Đầu hẻm",    v: est.sample.camAlley, est: target?.camAlley, color: C.green },
              ].filter(r => r.v > 0).map((r, i) => (
                <div key={i} style={{ marginBottom: "0.45rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "0.18rem" }}>
                    <span style={{ color: C.dim }}>{r.label}</span>
                    <span style={{ color: C.text }}>
                      {fmt(r.v)} → <strong style={{ color: r.color }}>{fmtK(r.est || 0)}</strong>
                    </span>
                  </div>
                  <Bar pct={Math.round((r.v / Math.max(est.sample.totalCam, 1)) * 100)} color={r.color} height={5} delay={i * 100} />
                </div>
              ))}
            </div>

            {/* Donut */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em" }}>Phân loại (mẫu)</div>
              <Donut size={140} slices={camTypeSlices}
                label={fmtK(est.sample.totalCam)} sub="camera" />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {camTypeSlices.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ color: C.dim, flex: 1 }}>{s.label}</span>
                    <span style={{ color: s.color, fontWeight: 700 }}>{Math.round(s.v / est.sample.totalCam * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mật độ */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em" }}>Thông số vùng mẫu</div>
              {[
                { label: "Cam/km²",       val: est.sample.camPerKm2.toFixed(1), color: C.cyan },
                { label: "KC TB",         val: `~${est.sample.spacingM}m`,      color: C.amber },
                { label: "Giai đoạn",     val: speedLabel,                       color: C.violet },
                { label: "Đường/km²",     val: `${(est.sample.roadKm / est.sample.areaKm2).toFixed(2)} km`, color: C.green },
                { label: "Ngã 3/4 lớn",  val: fmt((est.sample.ixShapes.quad||0)+(est.sample.ixShapes.tri||0)), color: C.amber },
                { label: "Đầu hẻm",      val: fmt(est.sample.ixShapes.alley||0), color: C.green },
                { label: "Giao cắt nhỏ", val: fmt(est.sample.ixShapes.minor||0), color: C.muted },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.border}44`, paddingBottom: "0.3rem" }}>
                  <span style={{ fontSize: "0.7rem", color: C.muted }}>{label}</span>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ROW 3: BẢNG PHÂN LOẠI ĐỊA ĐIỂM ─────────────────────────── */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "0.8rem 1.25rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>Ước tính theo loại địa điểm — {areaKm2Label}</span>
              <Tag color={C.violet}>Nội suy từ mật độ mẫu</Tag>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg2 }}>
                  {["Địa điểm", "Mẫu (thực)", "Ước tính TP", "Cam/node", "Camera ước tính", "KH tham chiếu", "So sánh"].map((h, i) => (
                    <th key={h} style={{ padding: "0.55rem 0.7rem", fontSize: "0.63rem", fontWeight: 700, color: C.dim, textAlign: i > 0 ? "right" : "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAT_META.map((cat, i) => {
                  const inSample = est.sample.bycat[cat.key] || 0;
                  const inCity   = target?.bycat?.[cat.key] || 0;
                  const camEst   = target?.camByCat?.[cat.key] || 0;
                  const ratio    = cat.planRef ? (camEst / cat.planRef) : null;
                  return (
                    <tr key={cat.key} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: "0.55rem 0.7rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "6px", height: "26px", background: cat.color, borderRadius: "3px", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.76rem", color: C.text }}>{cat.icon} {cat.label}</div>
                            <Bar pct={camEst > 0 ? Math.min(100, (camEst / Math.max(target?.total||1,1)) * 100) : 0} color={cat.color} height={3} delay={i * 50} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.78rem", color: inSample > 0 ? C.text : C.muted }}>{inSample > 0 ? fmt(inSample) : "—"}</td>
                      <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.dim }}>{inCity > 0 ? fmt(inCity) : "—"}</td>
                      <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}><Tag color={cat.color}>{LOC_CAM[cat.key] || 4}×</Tag></td>
                      <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.88rem", fontWeight: 900, color: cat.color }}>{camEst > 0 ? fmt(camEst) : "—"}</td>
                      <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.muted }}>{cat.planRef ? fmt(cat.planRef) : "—"}</td>
                      <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}>
                        {ratio != null ? (
                          <span style={{ fontSize: "0.74rem", fontWeight: 700, color: ratio > 1.5 ? C.amber : ratio < 0.5 ? C.red : C.green }}>
                            {ratio > 1.5 ? "↑" : ratio < 0.5 ? "↓" : "≈"} {(ratio * 100).toFixed(0)}%
                          </span>
                        ) : <span style={{ color: C.muted, fontSize: "0.7rem" }}>N/A</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* Road row */}
                <tr style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "0.55rem 0.7rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "6px", height: "26px", background: C.cyan, borderRadius: "3px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.76rem", color: C.text }}>🛣️ Đường dài (CAM1)</div>
                        <Bar pct={Math.min(100, ((target?.cam1||0) / Math.max(target?.total||1,1)) * 100)} color={C.cyan} height={3} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.dim }}>{est.sample.roadKm.toFixed(1)} km</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.dim }}>{fmt(target?.roadKm||0)} km</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}><Tag color={C.cyan}>1/3km</Tag></td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.88rem", fontWeight: 900, color: C.cyan }}>{fmt(target?.cam1||0)}</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right", fontSize: "0.76rem", color: C.muted }}>{fmt(PLAN.byLoc.road)}</td>
                  <td style={{ padding: "0.55rem 0.7rem", textAlign: "right" }}>
                    {target?.cam1 ? (
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: (target.cam1/PLAN.byLoc.road) > 1.5 ? C.amber : C.green }}>
                        {((target.cam1/PLAN.byLoc.road)*100).toFixed(0)}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
                {/* Total */}
                <tr style={{ background: `${C.amber}0a` }}>
                  <td style={{ padding: "0.75rem 0.7rem", fontWeight: 900, color: C.text, fontSize: "0.82rem" }}>TỔNG CAMERA ƯỚC TÍNH</td>
                  <td colSpan={3} />
                  <td style={{ padding: "0.75rem 0.7rem", textAlign: "right", fontSize: "1.05rem", fontWeight: 900, color: C.amber }}>{fmt(target?.total || 0)}</td>
                  <td style={{ padding: "0.75rem 0.7rem", textAlign: "right", fontSize: "0.88rem", color: C.cyan, fontWeight: 700 }}>{fmt(PLAN.total)}</td>
                  <td style={{ padding: "0.75rem 0.7rem", textAlign: "right", fontSize: "0.85rem", fontWeight: 800, color: diffColor }}>
                    {diffSign}{fmt(diff)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── ROW 4: BIỂU ĐỒ + LỘ TRÌNH ──────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.7rem", marginBottom: "1rem" }}>

            {/* Bar chart so sánh */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
                Biểu đồ so sánh ước tính vs kế hoạch — {areaKm2Label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "center" }}>
                <VBar height={160} bars={[
                  { v: target?.cam1    || 0, color: C.cyan,   label: "CAM1" },
                  { v: target?.cam2    || 0, color: C.amber,  label: "CAM2" },
                  { v: target?.cam21   || 0, color: C.orange, label: "2.1" },
                  { v: target?.camAlley|| 0, color: C.green,  label: "Hẻm" },
                  { v: Math.max(0, (target?.total||0) - (target?.cam1||0) - (target?.cam2||0) - (target?.cam21||0) - (target?.camAlley||0)), color: C.muted, label: "Khác" },
                ].filter(b => b.v > 0)} />
                <div>
                  {[
                    { label: "Giao lộ + hẻm", est: (target?.cam2||0)+(target?.cam21||0)+(target?.camAlley||0), plan: PLAN.byLoc.intersection, color: C.amber },
                    { label: "Đường dài",      est: target?.cam1||0,  plan: PLAN.byLoc.road,       color: C.cyan },
                    { label: "Trường học",     est: target?.camByCat?.school||0,   plan: PLAN.byLoc.school,     color: C.violet },
                    { label: "Bệnh viện",      est: target?.camByCat?.hospital||0, plan: PLAN.byLoc.hospital,   color: C.green },
                    { label: "Chợ / TTTM",    est: target?.camByCat?.market||0,   plan: PLAN.byLoc.market,     color: C.amber },
                    { label: "Công viên",      est: target?.camByCat?.park||0,     plan: PLAN.byLoc.park,       color: C.lime },
                    { label: "KCN / CN",       est: 0,                             plan: PLAN.byLoc.industrial, color: C.orange },
                    { label: "Camera AI",      est: 0,                             plan: PLAN.byLoc.ai,         color: C.violet },
                  ].map((r, i) => {
                    const maxV = Math.max(r.est, r.plan, 1);
                    return (
                      <div key={i} style={{ marginBottom: "0.45rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "0.15rem" }}>
                          <span style={{ color: C.dim }}>{r.label}</span>
                          <span>
                            <strong style={{ color: r.color }}>{fmtK(r.est)}</strong>
                            <span style={{ color: C.muted }}> / {fmtK(r.plan)} KH</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: C.border }}>
                          <div style={{ flex: r.est, background: r.color, opacity: 0.9 }} />
                          <div style={{ flex: Math.max(0, r.plan - r.est), background: `${r.color}25` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lộ trình */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>Lộ trình kế hoạch 2026–2029</div>
              {[
                { year: "2026", count: 100_000,   pct: 9,  color: C.cyan,   note: "200–300m/cam · Xương sống đô thị" },
                { year: "2027", count: 300_000,   pct: 27, color: C.violet, note: "150–200m/cam · Tuyến đường chính" },
                { year: "2028", count: 700_000,   pct: 64, color: C.amber,  note: "75–100m/cam · Phủ mật độ cao" },
                { year: "2029", count: 1_100_000, pct: 100, color: C.green,  note: "50–100m/cam · Phủ đầy toàn diện" },
              ].map((y, i) => (
                <div key={y.year} style={{ marginBottom: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 700, color: y.color }}>Năm {y.year}</span>
                    <span style={{ color: C.text, fontWeight: 900 }}>{(y.count/1000).toFixed(0)}K cam</span>
                  </div>
                  <Bar pct={y.pct} color={y.color} height={8} delay={i * 150} />
                  <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: "0.2rem" }}>{y.note}</div>
                </div>
              ))}

              {/* Vị trí vùng quét trong lộ trình */}
              <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.7rem", background: `${C.cyan}0d`, border: `1px solid ${C.cyan}22`, borderRadius: "7px" }}>
                <div style={{ fontSize: "0.65rem", color: C.cyan, fontWeight: 700, marginBottom: "0.2rem" }}>Vùng đang quét tương đương</div>
                <div style={{ fontSize: "0.72rem", color: C.text, fontWeight: 700 }}>{speedLabel}</div>
                <div style={{ fontSize: "0.65rem", color: C.muted }}>Khoảng cách TB ~{est.sample.spacingM}m/cam</div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ───────────────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.7rem", color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: "1rem" }}>
            <span>Ước lượng từ dữ liệu quét thực tế · Tham chiếu kế hoạch TP.HCM Mới 2026–2029 · CamSpot v2.5.5</span>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.7rem" }}>Home</button>
              <button onClick={() => navigate("/scan")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.7rem" }}>Scanner</button>
              <button onClick={() => navigate("/sys")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "0.7rem" }}>Kiến trúc</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
