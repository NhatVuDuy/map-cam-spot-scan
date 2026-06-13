import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useScanStore from "../store/scanStore.js";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:      "#060d1a",
  bg2:     "#0b1425",
  card:    "#0d1829",
  card2:   "#0f1f35",
  border:  "#1a2e4a",
  border2: "#1e3a56",
  cyan:    "#38BDF8",
  violet:  "#A78BFA",
  green:   "#34D399",
  amber:   "#FBBF24",
  pink:    "#F472B6",
  red:     "#F87171",
  orange:  "#FB923C",
  text:    "#e2e8f0",
  muted:   "#64748b",
  dim:     "#94a3b8",
};

/* ─── tiny helpers ────────────────────────────────────────────────────────── */
function Tag({ children, color = C.cyan }) {
  return (
    <span style={{
      display: "inline-block", fontSize: "0.6rem", fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: "100px",
      border: `1px solid ${color}44`, background: `${color}14`, color,
    }}>{children}</span>
  );
}

function SectionTitle({ tag, title, sub, color = C.cyan }) {
  return (
    <div style={{ marginBottom: "2rem" }}>
      <Tag color={color}>{tag}</Tag>
      <h2 style={{ fontSize: "1.55rem", fontWeight: 800, margin: "0.5rem 0 0.3rem", color: C.text }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: "0.85rem", margin: 0 }}>{sub}</p>}
    </div>
  );
}

/* ─── animated counter ────────────────────────────────────────────────────── */
function Counter({ to, suffix = "", prefix = "", duration = 1600, decimals = 0 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = null;
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(+(eased * to).toFixed(decimals));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration, decimals]);
  return <span ref={ref}>{prefix}{typeof val === "number" && decimals === 0 ? val.toLocaleString("vi-VN") : val}{suffix}</span>;
}

/* ─── progress bar ────────────────────────────────────────────────────────── */
function ProgressBar({ value, max, color, label, sublabel, animate = true }) {
  const [width, setWidth] = useState(0);
  const ref = useRef(null);
  const pct = Math.round((value / max) * 100);
  useEffect(() => {
    if (!animate) { setWidth(pct); return; }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setTimeout(() => setWidth(pct), 100);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct, animate]);
  return (
    <div ref={ref} style={{ marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.78rem", color: C.dim }}>{sublabel}</span>
      </div>
      <div style={{ height: "8px", background: C.border, borderRadius: "100px", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: "100px",
          background: `linear-gradient(90deg, ${color}, ${color}bb)`,
          width: `${width}%`, transition: animate ? "width 1.2s cubic-bezier(0.4,0,0.2,1)" : "none",
        }} />
      </div>
    </div>
  );
}

/* ─── donut chart ─────────────────────────────────────────────────────────── */
function DonutChart({ slices, size = 160 }) {
  const r = 54, cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="22" />
      {slices.map((s, i) => {
        const len = (s.value / total) * circumference;
        const gap = 2;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth="22"
            strokeDasharray={`${len - gap} ${circumference - len + gap}`}
            strokeDashoffset={-offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={C.text} fontSize="18" fontWeight="800">1.1M</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={C.muted} fontSize="9">cameras</text>
    </svg>
  );
}

/* ─── year card ───────────────────────────────────────────────────────────── */
function YearCard({ year, label, count, delta, spacing, color, items = [], active = false }) {
  return (
    <div style={{
      flex: 1, minWidth: "200px",
      background: active ? `${color}12` : C.card,
      border: `1px solid ${active ? color : C.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: "12px", padding: "1.25rem",
      position: "relative",
    }}>
      {active && (
        <div style={{
          position: "absolute", top: "-1px", right: "12px",
          background: color, color: "#000", fontSize: "0.6rem",
          fontWeight: 800, padding: "2px 10px", borderRadius: "0 0 6px 6px",
          letterSpacing: "0.06em",
        }}>HIỆN TẠI</div>
      )}
      <div style={{ fontSize: "0.68rem", color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>Năm {year}</div>
      <div style={{ fontSize: "0.78rem", color: C.dim, marginBottom: "0.75rem" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1, marginBottom: "0.25rem" }}>
        {(count / 1000).toFixed(0)}K
      </div>
      {delta && <div style={{ fontSize: "0.72rem", color: C.dim, marginBottom: "0.75rem" }}>+{(delta / 1000).toFixed(0)}K camera</div>}
      <div style={{ fontSize: "0.71rem", color: C.muted, marginBottom: "0.85rem" }}>Khoảng cách TB: <strong style={{ color: C.dim }}>{spacing}</strong></div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {items.map((it, i) => (
          <div key={i} style={{ fontSize: "0.71rem", color: C.dim, display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
            <span style={{ color, flexShrink: 0 }}>›</span>{it}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── stat card ───────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color = C.cyan }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: "12px", padding: "1.25rem 1.5rem",
      display: "flex", flexDirection: "column", gap: "0.4rem",
    }}>
      <div style={{ fontSize: "1.4rem" }}>{icon}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.text }}>{label}</div>
      {sub && <div style={{ fontSize: "0.74rem", color: C.muted }}>{sub}</div>}
    </div>
  );
}

/* ─── location type row ───────────────────────────────────────────────────── */
function LocationRow({ icon, label, nodes, camsPerNode, total, color, pct }) {
  return (
    <tr style={{ borderBottom: `1px solid ${C.border}22` }}>
      <td style={{ padding: "0.6rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{icon}</span>
          <span style={{ fontSize: "0.82rem", color: C.text }}>{label}</span>
        </div>
      </td>
      <td style={{ padding: "0.6rem 1rem", textAlign: "right" }}>
        <span style={{ fontSize: "0.8rem", color: C.dim }}>{nodes?.toLocaleString("vi-VN") ?? "—"}</span>
      </td>
      <td style={{ padding: "0.6rem 1rem", textAlign: "right" }}>
        <span style={{ fontSize: "0.8rem", color: C.dim }}>{camsPerNode ?? "—"}</span>
      </td>
      <td style={{ padding: "0.6rem 1rem", textAlign: "right" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>{total.toLocaleString("vi-VN")}</span>
      </td>
      <td style={{ padding: "0.6rem 1rem", width: "120px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ flex: 1, height: "6px", background: C.border, borderRadius: "100px", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "100px" }} />
          </div>
          <span style={{ fontSize: "0.7rem", color: C.muted, minWidth: "32px", textAlign: "right" }}>{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

/* ─── scan area estimator ─────────────────────────────────────────────────── */
function ScanAreaEstimator() {
  const points    = useScanStore(s => s.points);
  const cameras   = useScanStore(s => s.cameras);
  const area      = useScanStore(s => s.area);
  const stats     = useScanStore(s => s.stats);

  if (points.length === 0) return (
    <div style={{ textAlign: "center", padding: "2.5rem", color: C.muted, fontSize: "0.85rem" }}>
      Chưa có dữ liệu quét. Mở Scanner và quét một khu vực để xem ước tính.
    </div>
  );

  const radiusKm    = (area.radiusM / 1000).toFixed(2);
  const areaKm2     = (Math.PI * (area.radiusM / 1000) ** 2).toFixed(2);
  const totalCams   = cameras.length;
  const cam1        = cameras.filter(c => c.type === "cam1").length;
  const cam2Group   = cameras.filter(c => ["cam2","cam22","cam21","cam23"].includes(c.type)).length;
  const camAlley    = cameras.filter(c => c.type === "cam_alley").length;

  const ixPoints    = points.filter(p => p.category === "intersection");
  const quadTri     = ixPoints.filter(p => ["quad","tri"].includes(p.intersectionShape)).length;
  const alley       = ixPoints.filter(p => p.intersectionShape === "alley").length;
  const minor       = ixPoints.filter(p => !p.intersectionShape || p.intersectionShape === "minor").length;

  const densityPerKm2 = areaKm2 > 0 ? (totalCams / areaKm2).toFixed(1) : 0;

  const camTypes = [
    { label: "CAM1 — Đường dài", count: cam1, color: C.cyan },
    { label: "CAM2/2.x — Ngã ba/tư", count: cam2Group, color: C.amber },
    { label: "CAM_alley — Đầu hẻm", count: camAlley, color: C.green },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* header stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Bán kính quét",    value: `${radiusKm} km`,     color: C.cyan },
          { label: "Diện tích",         value: `~${areaKm2} km²`,   color: C.violet },
          { label: "Điểm quét được",   value: points.length,        color: C.green },
          { label: "Camera ước tính",  value: totalCams,            color: C.amber },
          { label: "Mật độ",            value: `${densityPerKm2}/km²`, color: C.pink },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.card2, border: `1px solid ${color}33`, borderRadius: "10px", padding: "0.9rem 1rem" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color }}>{typeof value === "number" ? value.toLocaleString("vi-VN") : value}</div>
            <div style={{ fontSize: "0.73rem", color: C.muted, marginTop: "0.2rem" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* camera breakdown */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.amber, marginBottom: "0.9rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Phân loại camera</div>
          {camTypes.map(({ label, count, color }) => (
            <ProgressBar key={label} label={label} sublabel={`${count.toLocaleString("vi-VN")} cam`}
              value={count} max={Math.max(totalCams, 1)} color={color} />
          ))}
        </div>

        {/* intersection breakdown */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.cyan, marginBottom: "0.9rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>Phân loại giao lộ</div>
          {[
            { label: "Ngã ba/tư lớn",     count: quadTri, color: C.amber },
            { label: "Đầu hẻm",            count: alley,   color: C.green },
            { label: "Giao cắt nhỏ",       count: minor,   color: C.muted },
          ].map(({ label, count, color }) => (
            <ProgressBar key={label} label={label} sublabel={`${count.toLocaleString("vi-VN")} điểm`}
              value={count} max={Math.max(ixPoints.length, 1)} color={color} />
          ))}
          {Object.entries(stats).filter(([k]) => k !== "intersection").map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.77rem", color: C.dim, paddingTop: "0.3rem" }}>
              <span>{k}</span><strong style={{ color: C.text }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* scale projection */}
      <div style={{ background: `${C.amber}0a`, border: `1px solid ${C.amber}30`, borderRadius: "10px", padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.amber, marginBottom: "0.75rem", textTransform: "uppercase" }}>Quy chiếu toàn TP.HCM (6.772 km²)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { label: "Nếu toàn TP cùng mật độ",  value: Math.round(densityPerKm2 * 6772), color: C.amber },
            { label: "Kế hoạch thực tế TP.HCM",  value: 1_100_000,                         color: C.cyan },
            { label: "Chênh lệch ước tính",       value: Math.abs(Math.round(densityPerKm2 * 6772) - 1_100_000), color: C.violet },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color }}>{value.toLocaleString("vi-VN")}</div>
              <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.2rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────────────────── */
export default function Plan() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const DENSITY_ROWS = [
    { zone: "Trung tâm, CBD, thương mại",         pct: 5,  areaKm2: 125,  spacing: "50m",        cams: 50_000,  color: C.red },
    { zone: "Đô thị dày, khu dân cư hẹp",         pct: 25, areaKm2: 625,  spacing: "75m",        cams: 112_500, color: C.orange },
    { zone: "Đô thị vừa, khu dân cư thưa",        pct: 40, areaKm2: 1000, spacing: "100m",       cams: 100_000, color: C.amber },
    { zone: "Ngoại thành, nông thôn, KCN ngoại",  pct: 30, areaKm2: 750,  spacing: "150–200m",   cams: 30_000,  color: C.green },
  ];

  const LOCATION_ROWS = [
    { icon: "🔀", label: "Ngã giao, ngã ba, vòng xoay",   nodes: 50_000,  camsPerNode: 4,  total: 200_000, color: C.cyan,   pct: 31 },
    { icon: "🛣️", label: "Đường phố, hẻm, ngõ giao",       nodes: null,    camsPerNode: null, total: 92_500, color: C.violet, pct: 14 },
    { icon: "🏫", label: "Trường học, cơ sở giáo dục",     nodes: 4_000,   camsPerNode: 10, total: 40_000,  color: C.pink,   pct: 6 },
    { icon: "🏥", label: "Bệnh viện, cơ sở y tế",          nodes: 500,     camsPerNode: 30, total: 20_000,  color: C.green,  pct: 3 },
    { icon: "🏪", label: "Chợ, TTTM, thương mại",          nodes: 1_000,   camsPerNode: 20, total: 50_000,  color: C.amber,  pct: 8 },
    { icon: "🏭", label: "KCN, KCX, logistics",             nodes: 300,     camsPerNode: 15, total: 120_000, color: C.orange, pct: 18 },
    { icon: "🌳", label: "Công viên, quảng trường",         nodes: 2_000,   camsPerNode: 15, total: 30_000,  color: "#86efac", pct: 5 },
    { icon: "✈️", label: "Bến xe, cảng, sân bay, Metro",   nodes: 300,     camsPerNode: null, total: 80_000, color: C.cyan,  pct: 12 },
    { icon: "🤖", label: "Camera AI chuyên dụng (ANPR…)",  nodes: null,    camsPerNode: null, total: 100_000, color: C.violet, pct: 15 },
  ];

  const CAMERA_TYPES = [
    { type: "Cố định",      count: 850_000, pct: 77, color: C.cyan,   desc: "Giám sát liên tục, độ phân giải 2–8 MP, ngoài trời IP66+" },
    { type: "PTZ",          count: 150_000, pct: 13, color: C.violet, desc: "Xoay 360°, zoom xa, theo dõi đối tượng di chuyển" },
    { type: "AI chuyên dụng", count: 100_000, pct: 10, color: C.amber, desc: "ANPR, nhận diện khuôn mặt, phân tích hành vi, đếm người" },
  ];

  const YEAR_CARDS = [
    {
      year: "1 (2026)", label: "Phủ xương sống đô thị", count: 100_000, delta: null,
      spacing: "200–300m/camera", color: C.cyan,
      items: ["Quốc lộ, cao tốc, cửa ngõ", "Trung tâm hành chính", "Điểm nóng ANTT", "Điểm nút giao thông chính"],
    },
    {
      year: "2 (2027)", label: "Phủ mật độ vừa", count: 300_000, delta: 200_000,
      spacing: "150–200m/camera", color: C.violet,
      items: ["Toàn bộ tuyến đường chính", "Khu dân cư lớn", "Chợ, TTTM, trường học", "Bệnh viện trọng điểm", "KCN trong điểm"],
    },
    {
      year: "3 (2028)", label: "Phủ mật độ cao", count: 700_000, delta: 400_000,
      spacing: "75–100m/camera", color: C.amber,
      items: ["Toàn bộ đường phố chính", "Hẻm, ngõ, hẻm lớn", "Khu đô thị, khu dân cư", "Trường học, bệnh viện, chợ", "Công viên, quảng trường"],
    },
    {
      year: "4 (2029)", label: "Phủ đầy toàn diện", count: 1_100_000, delta: 400_000,
      spacing: "50–100m/camera", color: C.green, active: true,
      items: ["Đường chính, hẻm nhỏ, tắc hẻm", "Toa điểm công cộng", "Toàn bộ địa điểm đặc thù", "Camera AI chuyên dụng", "Cổng vào, quảng trường"],
    },
  ];

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh" }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "52px",
        background: scrollY > 10 ? `${C.bg2}f0` : `${C.bg}f0`,
        borderBottom: `1px solid ${C.border}`,
        backdropFilter: "blur(12px)",
        transition: "background 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.85rem" }}>← Scanner</button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>📊</span>
            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Kế hoạch Camera TP.HCM Mới</span>
            <Tag color={C.amber}>1.100.000 CAM</Tag>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => navigate("/info")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.82rem" }}>Thông tin</button>
          <button onClick={() => navigate("/sys")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.82rem" }}>Kiến trúc</button>
          <button onClick={() => navigate("/")} style={{
            background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
            border: "none", borderRadius: "8px", padding: "0.4rem 1.1rem",
            color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}>Mở Scanner →</button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 2rem 3rem", maxWidth: "1100px", margin: "0 auto" }}>
        <Tag color={C.amber}>Quy hoạch 2026–2029</Tag>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 900, lineHeight: 1.15,
          margin: "0.75rem 0 0.5rem",
          background: `linear-gradient(135deg, #fff 0%, ${C.amber} 60%, ${C.orange} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Thuyết minh sizing 1.100.000 Camera<br />TP.HCM Mới
        </h1>
        <p style={{ color: C.dim, fontSize: "0.95rem", lineHeight: 1.7, maxWidth: "640px", marginBottom: "2.5rem" }}>
          TP.HCM + Bình Dương + Bà Rịa–Vũng Tàu · Khoảng cách trung bình 50–100m/camera ·
          Phủ giám sát an ninh toàn diện · Triển khai 4 năm (2026–2029).
        </p>

        {/* key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <StatCard icon="📹" label="Tổng camera mục tiêu" value={<Counter to={1100000} />} sub="Toàn vùng TP.HCM Mới" color={C.amber} />
          <StatCard icon="📐" label="Tổng diện tích" value="6.772 km²" sub="TP.HCM + BD + BRVT" color={C.cyan} />
          <StatCard icon="👥" label="Dân số phục vụ" value="~14 triệu" sub="168 phường/xã/đặc khu" color={C.violet} />
          <StatCard icon="🛣️" label="Chiều dài đường bộ" value="~50.000 km" sub="Tổng phạm vi quản lý" color={C.green} />
          <StatCard icon="💰" label="Tổng đầu tư ước tính" value="25–35 nghìn tỷ" sub="VNĐ (x tay cầu hình & hạ tầng)" color={C.pink} />
          <StatCard icon="📅" label="Thời gian hoàn thành" value="4 năm" sub="2026 → 2029" color={C.orange} />
        </div>
      </section>

      {/* ── SIZING BY DENSITY ─────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <SectionTitle tag="Phần 2" title="Cơ sở sizing theo diện tích & mật độ" sub="Phân vùng đô thị TP.HCM Mới theo 4 cấp mật độ, tính số camera theo khoảng cách trung bình." color={C.cyan} />
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg2 }}>
                {["Khu vực", "% diện tích", "Diện tích (km²)", "Khoảng cách TB", "Camera ước tính"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: C.dim, textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DENSITY_ROWS.map(r => (
                <tr key={r.zone} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: r.color, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.83rem", color: C.text }}>{r.zone}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: `${r.pct * 2}px`, height: "8px", background: r.color, borderRadius: "100px", opacity: 0.7 }} />
                      <span style={{ fontSize: "0.8rem", color: C.dim }}>{r.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: C.dim }}>{r.areaKm2.toLocaleString("vi-VN")}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <Tag color={r.color}>{r.spacing}</Tag>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", fontSize: "0.9rem", fontWeight: 700, color: r.color }}>
                    ~{r.cams.toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
              <tr style={{ background: C.bg2 }}>
                <td colSpan={4} style={{ padding: "0.7rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: C.text }}>Tổng camera theo mật độ đường phố</td>
                <td style={{ padding: "0.7rem 1rem", fontSize: "1rem", fontWeight: 900, color: C.amber }}>~292.500</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: "0.85rem 1.1rem", background: `${C.cyan}0a`, border: `1px solid ${C.cyan}22`, borderRadius: "8px", fontSize: "0.78rem", color: C.dim, lineHeight: 1.7 }}>
          <strong style={{ color: C.text }}>Lưu ý:</strong> Đây là camera trực tiếp trên tuyến đường (trực tuyến, ngã giao, ngõ). Chưa bao gồm camera tại các địa điểm đặc thù (trường, bệnh viện, chợ…) được tính riêng ở phần 3.
        </div>
      </section>

      {/* ── BY LOCATION TYPE ──────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <SectionTitle tag="Phần 3" title="Cộng thêm theo nhóm địa điểm đặc thù" sub="Camera cổng/khu vực đặc thù — tính theo số lượng node × camera/node trung bình." color={C.violet} />
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", marginBottom: "1.5rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg2 }}>
                  {["Nhóm địa điểm", "Số lượng node", "Cam/node TB", "Camera (ước tính)", "Tỉ trọng"].map(h => (
                    <th key={h} style={{ padding: "0.65rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: C.dim, textAlign: "left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LOCATION_ROWS.map(r => <LocationRow key={r.label} {...r} />)}
                <tr style={{ background: C.bg2 }}>
                  <td colSpan={3} style={{ padding: "0.7rem 1rem", fontSize: "0.82rem", fontWeight: 700, color: C.text }}>Tổng camera theo địa điểm đặc thù</td>
                  <td style={{ padding: "0.7rem 1rem", fontSize: "1rem", fontWeight: 900, color: C.violet }}>~445.000</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* tong hop */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Camera theo mật độ đường phố (A1)", value: "~292.500", color: C.cyan, sub: "Dọc tuyến + ngã giao" },
              { label: "Camera theo địa điểm đặc thù (A2)",  value: "~445.000", color: C.violet, sub: "Trường, BV, chợ, KCN…" },
              { label: "Tổng A = A1 + A2 (lý thuyết)",      value: "~737.500", color: C.amber, sub: "Trước khi nhân hệ số" },
            ].map(({ label, value, color, sub }) => (
              <div key={label} style={{ background: C.card, border: `1px solid ${color}44`, borderRadius: "10px", padding: "1rem 1.25rem" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: C.text, margin: "0.25rem 0 0.2rem" }}>{label}</div>
                <div style={{ fontSize: "0.73rem", color: C.muted }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAFETY FACTOR ─────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <SectionTitle tag="Phần 4–5" title="Tổng hợp hệ số dự phòng → 1.100.000" sub="Áp dụng hệ số dự phòng 1.5× (1.3–1.6x) cho điểm mù, di chuyển, bổ sung sau này." color={C.amber} />
        <div style={{
          display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap",
          background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1.75rem 2rem",
        }}>
          {[
            { label: "Tổng A (lý thuyết)", val: "~737.500", color: C.cyan },
            { label: "×", val: "1,5×", color: C.dim, big: false },
            { label: "Hệ số dự phòng", val: "1,5 lần", color: C.violet, sub: "(1,3–1,6×)" },
            { label: "=", val: "=", color: C.dim, big: false },
            { label: "LÀM TRÒN", val: "~1.106.000", color: C.amber },
            { label: "→", val: "→", color: C.dim, big: false },
            { label: "MỤC TIÊU CUỐI CÙNG", val: "1.100.000", color: C.green, big: true },
          ].map(({ label, val, color, sub, big }, i) => (
            <div key={i} style={{ textAlign: "center", flex: val === "×" || val === "=" || val === "→" ? "none" : 1 }}>
              {val === "×" || val === "=" || val === "→"
                ? <span style={{ fontSize: "1.5rem", color }}>{val}</span>
                : (
                  <>
                    <div style={{ fontSize: big ? "2rem" : "1.4rem", fontWeight: 900, color, lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.3rem" }}>{label}</div>
                    {sub && <div style={{ fontSize: "0.68rem", color: C.dim }}>{sub}</div>}
                  </>
                )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {["Điểm mù camera (góc khuất, hẻm cong)", "Di chuyển phương tiện tốc độ cao", "Nhu cầu tăng thêm sau triển khai", "Bảo hành / thay thế dự phòng (5–10%)"].map(note => (
            <div key={note} style={{ fontSize: "0.75rem", color: C.dim, padding: "3px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "100px" }}>
              ✓ {note}
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <SectionTitle tag="Phần 7" title="Lộ trình triển khai 4 năm (2026–2029)" sub="Phủ dần từ xương sống đô thị đến phủ đầy toàn diện." color={C.green} />

          {/* progress overview */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
            {[
              { year: "2026", count: 100_000,  color: C.cyan },
              { year: "2027", count: 300_000,  color: C.violet },
              { year: "2028", count: 700_000,  color: C.amber },
              { year: "2029", count: 1_100_000,color: C.green },
            ].map(({ year, count, color }) => (
              <ProgressBar key={year} label={`Năm ${year}`}
                sublabel={`${count.toLocaleString("vi-VN")} camera tích lũy`}
                value={count} max={1_100_000} color={color} />
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {YEAR_CARDS.map(y => <YearCard key={y.year} {...y} />)}
          </div>
        </div>
      </section>

      {/* ── CAMERA TYPES ──────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <SectionTitle tag="Phần 8" title="Phân loại camera triển khai" sub="Tổng 1.100.000 camera gồm 3 loại chính theo chức năng và công nghệ." color={C.cyan} />
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2rem", alignItems: "start" }}>
          <DonutChart slices={CAMERA_TYPES} size={180} />
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {CAMERA_TYPES.map(ct => (
              <div key={ct.type} style={{ background: C.card, border: `1px solid ${ct.color}33`, borderLeft: `3px solid ${ct.color}`, borderRadius: "10px", padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: ct.color }}>Camera {ct.type}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 900, color: C.text }}>{ct.count.toLocaleString("vi-VN")} ({ct.pct}%)</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: C.dim, lineHeight: 1.5, marginBottom: "0.5rem" }}>{ct.desc}</div>
                <div style={{ height: "6px", background: C.border, borderRadius: "100px", overflow: "hidden" }}>
                  <div style={{ width: `${ct.pct}%`, height: "100%", background: ct.color, borderRadius: "100px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* technical specs */}
        <div style={{ marginTop: "1.5rem", background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.dim, marginBottom: "1rem", textTransform: "uppercase" }}>Thông số kỹ thuật chính</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {[
              { label: "Khoảng cách trung bình mục tiêu", val: "50 – 100m" },
              { label: "Độ phân giải tối thiểu",          val: "2MP, khuyến nghị 4–8MP" },
              { label: "Góc nhìn tối thiểu",              val: "120° (camera cố định)" },
              { label: "Camera AI: tỉ lệ",                val: "1 AI per 4 cam = ~4 camera khu vực" },
              { label: "SLA hoạt động",                   val: "≥ 99,9%" },
              { label: "Lưu trữ tối thiểu",               val: "30 ngày / camera" },
            ].map(({ label, val }) => (
              <div key={label} style={{ fontSize: "0.78rem", color: C.dim }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
                <div style={{ fontSize: "0.71rem", color: C.muted }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ──────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <SectionTitle tag="Kiến trúc" title="Hệ thống tổng thể" sub="Camera hiện trường → truyền dẫn → nền tảng camera platform → trung tâm điều hành." color={C.violet} />
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            {[
              { icon: "📹", label: "Camera hiện trường", sub: "Cố định / PTZ / AI", color: C.cyan },
              { arrow: "→ Truyền dẫn\n(Fiber, 4G/5G, Microwave)" },
              { icon: "🖥️", label: "Nền tảng camera platform", sub: "Storage, quản lý, live view", color: C.violet },
              { arrow: "→ AI & Phân tích" },
              { icon: "🏢", label: "Trung tâm điều hành ANTT", sub: "TTGSANĐT tập trung", color: C.amber },
            ].map((item, i) =>
              item.arrow ? (
                <div key={i} style={{ color: C.muted, fontSize: "0.75rem", whiteSpace: "pre-line", textAlign: "center", lineHeight: 1.5 }}>{item.arrow}</div>
              ) : (
                <div key={i} style={{ flex: 1, minWidth: "160px", background: C.card, border: `1px solid ${item.color}44`, borderRadius: "10px", padding: "1.1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.4rem" }}>{item.icon}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: "0.72rem", color: C.muted, marginTop: "0.2rem" }}>{item.sub}</div>
                </div>
              )
            )}
          </div>
          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {[
              { icon: "👤", label: "Nhận diện khuôn mặt" },
              { icon: "🚗", label: "Nhận diện biển số (ANPR)" },
              { icon: "🎯", label: "Phân tích hành vi" },
              { icon: "📊", label: "Đếm người, đếm xe" },
              { icon: "🚨", label: "Cảnh báo thông minh" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: C.card, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "0.65rem 0.85rem", fontSize: "0.8rem", color: C.dim }}>
                <span>{icon}</span>{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCAN AREA ESTIMATOR ───────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <SectionTitle tag="Khu vực đang quét" title="Ước tính camera cho vùng quét hiện tại" sub="Dựa trên kết quả Scanner — so sánh mật độ với kế hoạch toàn TP.HCM." color={C.green} />
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1.5rem" }}>
          <ScanAreaEstimator />
        </div>
      </section>

      {/* ── INVESTMENT ────────────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 2rem", background: C.bg2, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <SectionTitle tag="Đầu tư" title="Tổng mức đầu tư ước tính" sub="Bao gồm thiết bị, hạ tầng, lắp đặt, phần mềm platform và vận hành năm đầu." color={C.pink} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div style={{ background: C.card, border: `1px solid ${C.pink}44`, borderRadius: "12px", padding: "1.75rem" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: C.pink, lineHeight: 1 }}>25.000 – 35.000</div>
              <div style={{ fontSize: "0.9rem", color: C.text, fontWeight: 600, marginTop: "0.4rem" }}>tỷ đồng</div>
              <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: "0.5rem" }}>x tay cầu hình & hạ tầng</div>
              <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {[
                  ["Thiết bị camera (1.1M cam)",      "~12.000–15.000 tỷ"],
                  ["Hạ tầng truyền dẫn & server",     "~5.000–8.000 tỷ"],
                  ["Phần mềm platform & AI",           "~3.000–5.000 tỷ"],
                  ["Lắp đặt, thi công, cột đèn",      "~3.000–5.000 tỷ"],
                  ["Vận hành năm đầu + dự phòng",     "~2.000–3.000 tỷ"],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: C.dim }}>{label}</span>
                    <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { icon: "📈", label: "Hiệu quả kỳ vọng", items: ["Nâng cao an ninh trật tự", "Phòng ngừa và xử lý tội phạm", "Quản lý giao thông thông minh", "Truy vết, hỗ trợ điều tra", "Nâng cao hiệu quả phản án"] },
                { icon: "⚡", label: "Yếu tố rủi ro", items: ["Chi phí bảo trì dài hạn (5–10%/năm)", "Yêu cầu băng thông mạng lớn", "Vấn đề bảo mật dữ liệu camera", "Khả năng tích hợp hệ thống cũ"] },
              ].map(({ icon, label, items }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "1.1rem 1.25rem", flex: 1 }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.text, marginBottom: "0.6rem" }}>{icon} {label}</div>
                  {items.map(it => (
                    <div key={it} style={{ fontSize: "0.76rem", color: C.dim, paddingLeft: "0.75rem", borderLeft: `2px solid ${C.border}`, marginBottom: "0.3rem", lineHeight: 1.4 }}>{it}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: "1.2rem 2rem", borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "0.78rem", color: C.muted, flexWrap: "wrap", gap: "0.5rem",
      }}>
        <span>© 2026 CamSpot · Kế hoạch Camera TP.HCM Mới · Nguồn: Thuyết minh sizing nội bộ</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.78rem" }}>← Scanner</button>
          <button onClick={() => navigate("/info")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.78rem" }}>Thông tin</button>
          <button onClick={() => navigate("/sys")} style={{ background: "none", border: "none", cursor: "pointer", color: C.dim, fontSize: "0.78rem" }}>Kiến trúc</button>
        </div>
      </div>
    </div>
  );
}
