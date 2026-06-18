import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg:     "#060d1a",
  bg2:    "#0d1829",
  card:   "#0f1f35",
  border: "#1e3354",
  cyan:   "#38BDF8",
  violet: "#A78BFA",
  green:  "#34D399",
  amber:  "#FBBF24",
  pink:   "#F472B6",
  text:   "#e2e8f0",
  muted:  "#64748b",
  dim:    "#94a3b8",
};

function Tag({ children, color = C.cyan }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", padding: "3px 10px",
      borderRadius: "100px",
      border: `1px solid ${color}44`,
      background: `${color}14`,
      color,
    }}>{children}</span>
  );
}

function Glow({ color = C.cyan, style = {} }) {
  return (
    <div style={{
      position: "absolute", borderRadius: "50%",
      background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
      pointerEvents: "none", ...style,
    }} />
  );
}

function Counter({ to, suffix = "", duration = 1800 }) {
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
        setVal(Math.round(p * to));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── Feature card (3 main features) ─────────────────────────────── */
function FeatureCard({ icon, title, badge, desc, bullets, color, cta, onClick, delay = 0 }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderTop: `3px solid ${color}`,
      borderRadius: "12px", padding: "1.75rem",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)`, borderRadius: "12px" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.75rem" }}>{icon}</span>
          {badge && <Tag color={color}>{badge}</Tag>}
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: C.text, marginBottom: "0.4rem" }}>{title}</div>
        <div style={{ fontSize: "0.82rem", color: C.dim, lineHeight: 1.6, marginBottom: "0.75rem" }}>{desc}</div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {bullets.map((b, i) => <li key={i} style={{ fontSize: "0.78rem", color: C.muted }}>{b}</li>)}
        </ul>
        {cta && (
          <button onClick={onClick} style={{
            marginTop: "1.1rem", width: "100%",
            background: `${color}18`, border: `1px solid ${color}44`,
            borderRadius: "8px", padding: "0.55rem",
            color, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
          }}>{cta}</button>
        )}
      </div>
    </div>
  );
}

/* ── Category badge grid ─────────────────────────────────────────── */
const CAT_META = [
  { key: "intersection", label: "Giao lộ",    icon: "🔀", color: C.cyan,   desc: "Ngã ba, ngã tư, đầu hẻm" },
  { key: "school",       label: "Trường học",  icon: "🏫", color: C.violet, desc: "Trường, ĐH, CĐ, MG" },
  { key: "hospital",     label: "Bệnh viện",   icon: "🏥", color: C.green,  desc: "BV, phòng khám, y tế" },
  { key: "market",       label: "Chợ / TTTM",  icon: "🏪", color: C.amber,  desc: "Chợ, siêu thị, TTTM" },
  { key: "hotel",        label: "Khách sạn",   icon: "🏨", color: C.pink,   desc: "Hotel, motel, homestay" },
  { key: "park",         label: "Công viên",   icon: "🌳", color: "#86efac", desc: "Công viên, vườn hoa" },
  { key: "conference",   label: "Hội nghị",    icon: "🏢", color: "#f9a8d4", desc: "Trung tâm hội nghị, sự kiện" },
  { key: "government",   label: "Cơ quan",     icon: "🏛️", color: "#fcd34d", desc: "UBND, công an, tòa án" },
];

/* ── Main ────────────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: scrollY > 10 ? `${C.bg2}ee` : "transparent",
        borderBottom: scrollY > 10 ? `1px solid ${C.border}` : "none",
        backdropFilter: scrollY > 10 ? "blur(12px)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.3rem" }}>📹</span>
          <span style={{ fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>CamSpot</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button onClick={() => navigate("/guide")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.dim, fontSize: "0.82rem", padding: "0.3rem 0.6rem",
          }}>Hướng dẫn</button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Glow color={C.cyan}   style={{ width: "600px", height: "600px", top: "-100px", left: "-100px" }} />
        <Glow color={C.violet} style={{ width: "500px", height: "500px", bottom: "50px", right: "-50px" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div style={{ position: "relative", textAlign: "center", padding: "6rem 2rem 4rem", maxWidth: "780px", margin: "0 auto" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <Tag color={C.cyan}>Browser-side · No Backend · OpenStreetMap</Tag>
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
            fontWeight: 900, lineHeight: 1.1, margin: "0 0 1.25rem",
            background: `linear-gradient(135deg, #fff 0%, ${C.cyan} 50%, ${C.violet} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Camera Placement<br />Scanner
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2vw, 1.15rem)", color: C.dim, lineHeight: 1.7, marginBottom: "2.5rem" }}>
            Phân tích bản đồ OSM để xác định vị trí lắp camera an ninh tối ưu.<br />
            Quét toàn TP.HCM 168 phường hoặc bất kỳ vùng nào — chạy hoàn toàn trên trình duyệt.
          </p>

          {/* CTA buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/city")} style={{
              background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
              border: "none", borderRadius: "12px",
              padding: "0.9rem 2.4rem",
              color: "#fff", fontWeight: 800, fontSize: "1rem",
              cursor: "pointer",
              boxShadow: `0 0 40px ${C.cyan}44`,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = `0 0 60px ${C.cyan}66`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 0 40px ${C.cyan}44`; }}
            >🏙️ Quét thành phố</button>

            <button onClick={() => navigate("/scan")} style={{
              background: `${C.amber}18`,
              border: `1px solid ${C.amber}55`,
              borderRadius: "12px", padding: "0.9rem 2.2rem",
              color: C.amber, fontWeight: 700, fontSize: "1rem", cursor: "pointer",
              transition: "border-color 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.amber}55`; }}
            >🔍 Quét một vùng</button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "2.5rem", justifyContent: "center", marginTop: "4rem", flexWrap: "wrap" }}>
            {[
              { label: "Phường/xã TP.HCM",  val: 168,  suffix: "" },
              { label: "Loại địa điểm",       val: 8,    suffix: "" },
              { label: "Overpass endpoints",   val: 3,    suffix: "" },
              { label: "Backend cần thiết",    val: 0,    suffix: "" },
            ].map(({ label, val, suffix }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: C.cyan }}>
                  <Counter to={val} suffix={suffix} />
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.2rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 FEATURES ───────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Tag color={C.violet}>Tính năng</Tag>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.75rem 0 0.5rem" }}>Ba tính năng chính</h2>
          <p style={{ color: C.dim, fontSize: "0.92rem" }}>Từ quét toàn thành phố đến xem chi tiết từng phường</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
          <FeatureCard
            icon="🗺"
            title="City Scan"
            badge="Primary"
            color={C.cyan}
            desc="Quét tự động toàn bộ 168 phường/xã TP.HCM. Kết quả lưu vào IndexedDB — sau khi quét xong, click bất kỳ phường nào trên bản đồ để xem chi tiết ngay lập tức, không cần quét lại."
            bullets={["168 phường/xã, tuần tự mỗi 3s delay", "Geometry lưu IDB ~30MB", "Resume/retry khi gián đoạn", "Export CSV / JSON / PDF"]}
            delay={0}
          />
          <FeatureCard
            icon="🔍"
            title="Quét vùng"
            badge="Local Scan"
            color={C.amber}
            desc="Quét thủ công một khu vực bất kỳ — nhập tọa độ, tìm tên, hoặc vẽ ranh giới. Lưu nhiều dự án, chỉnh sửa camera, xuất file."
            bullets={["Search theo tên hành chính (Nominatim)", "Ranh giới polygon tùy chỉnh", "Lưu/mở nhiều dự án (IndexedDB)", "Export JSON / CSV"]}
            delay={100}
          />
          <FeatureCard
            icon="📊"
            title="Bản đồ phân bổ"
            badge="Choropleth"
            color={C.violet}
            desc="Bản đồ nhiệt hiển thị mật độ camera theo từng phường. Click vào phường để xem chi tiết không cần quét lại (cần đã chạy City Scan)."
            bullets={["Choropleth theo số camera ước tính", "Toggle mật độ / km² bằng 1 checkbox", "Click phường → Ward Detail tức thì"]}
            delay={200}
          />
        </div>
      </section>

      {/* ── CATEGORIES ───────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 2rem", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <Tag color={C.green}>8 loại địa điểm</Tag>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.75rem 0 0.5rem" }}>Quét những gì?</h2>
            <p style={{ color: C.dim, fontSize: "0.88rem" }}>Phân loại tự động từ tags OpenStreetMap + nhận diện tên tiếng Việt</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.85rem" }}>
            {CAT_META.map((c) => (
              <div key={c.key} style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${c.color}`,
                borderRadius: "10px", padding: "1rem 1.1rem",
                display: "flex", alignItems: "flex-start", gap: "0.75rem",
              }}>
                <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: C.text }}>{c.label}</div>
                  <div style={{ fontSize: "0.75rem", color: C.dim, marginTop: "0.15rem" }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECH TABLE ───────────────────────────────────────────────── */}
      <section style={{ padding: "4rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <Tag color={C.amber}>Stack</Tag>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.75rem 0 0.5rem" }}>Công nghệ</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
          {[
            {
              icon: "🖥️", label: "Frontend", color: C.cyan,
              rows: [
                ["React 18 + Vite 5",    "UI framework, HMR build"],
                ["MapLibre GL JS",        "Bản đồ vector tương tác"],
                ["Zustand",               "State (scanStore + cityStore)"],
                ["React Router v6",       "SPA routing (Hash mode)"],
                ["IndexedDB",             "Sessions + ward geometry (~30MB)"],
              ],
            },
            {
              icon: "🗄️", label: "Dữ liệu & API", color: C.violet,
              rows: [
                ["OpenStreetMap",         "Nguồn dữ liệu địa lý mở"],
                ["Overpass API",          "Query POI + roads (3 endpoint fallback)"],
                ["Nominatim API",         "Geocoding tên đơn vị hành chính VN"],
                ["hcm-boundaries.geojson","Ranh giới 168 phường/xã TP.HCM"],
                ["GitHub Pages",          "Static hosting, CI/CD tự động"],
              ],
            },
          ].map(({ icon, label, color, rows }) => (
            <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1.25rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>{icon}</span>
                <span style={{ fontWeight: 700, color, fontSize: "0.88rem" }}>{label}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {rows.map(([tech, desc]) => (
                    <tr key={tech} style={{ borderBottom: `1px solid ${C.border}22` }}>
                      <td style={{ padding: "0.6rem 1.25rem", fontWeight: 600, color: C.text, fontSize: "0.82rem", width: "42%" }}>{tech}</td>
                      <td style={{ padding: "0.6rem 1.25rem", color: C.dim, fontSize: "0.8rem" }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────────────────── */}
      <section style={{
        padding: "5rem 2rem",
        background: `linear-gradient(135deg, ${C.bg2}, ${C.bg})`,
        borderTop: `1px solid ${C.border}`,
        textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <Glow color={C.violet} style={{ width: "400px", height: "400px", top: "-100px", left: "50%", transform: "translateX(-50%)" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem" }}>Bắt đầu ngay</h2>
          <p style={{ color: C.dim, marginBottom: "2rem", fontSize: "0.95rem" }}>Không cần cài đặt, không cần tài khoản. Chạy hoàn toàn trên trình duyệt.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/city")} style={{
              background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
              border: "none", borderRadius: "12px", padding: "0.85rem 2.5rem",
              color: "#fff", fontWeight: 800, fontSize: "1rem", cursor: "pointer",
              boxShadow: `0 0 40px ${C.violet}44`,
            }}>🏙️ Quét thành phố</button>
            <button onClick={() => navigate("/scan")} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: "12px", padding: "0.85rem 2rem",
              color: C.dim, fontWeight: 600, fontSize: "1rem", cursor: "pointer",
            }}>🔍 Quét một vùng</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER BAR ───────────────────────────────────────────────── */}
      <div style={{
        padding: "1.2rem 2rem", borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "0.78rem", color: C.muted, flexWrap: "wrap", gap: "0.5rem",
      }}>
        <span>© 2026 CamSpot · Camera Placement Scanner</span>
        <span>Data: OpenStreetMap · dvhcvn · Nominatim · Overpass API</span>
      </div>
    </div>
  );
}
