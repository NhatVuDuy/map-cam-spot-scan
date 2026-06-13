import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:      "#060d1a",
  bg2:     "#0d1829",
  card:    "#0f1f35",
  border:  "#1e3354",
  cyan:    "#38BDF8",
  violet:  "#A78BFA",
  green:   "#34D399",
  amber:   "#FBBF24",
  pink:    "#F472B6",
  text:    "#e2e8f0",
  muted:   "#64748b",
  dim:     "#94a3b8",
};

/* ─── tiny helpers ────────────────────────────────────────────────────────── */
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

/* ─── animated counter ────────────────────────────────────────────────────── */
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

/* ─── feature card ────────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, color, delay = 0 }) {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: "12px",
      padding: "1.5rem",
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(24px)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${color}0a 0%, transparent 60%)`,
        borderRadius: "12px",
      }} />
      <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{icon}</div>
      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text, marginBottom: "0.4rem" }}>{title}</div>
      <div style={{ fontSize: "0.82rem", color: C.dim, lineHeight: 1.6 }}>{desc}</div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "2px", background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: "0 0 12px 12px",
      }} />
    </div>
  );
}

/* ─── step card ──────────────────────────────────────────────────────────── */
function StepCard({ num, title, desc, color, items = [] }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "0.75rem",
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: "12px", padding: "1.75rem",
      flex: 1,
    }}>
      <div style={{
        width: "40px", height: "40px",
        background: `${color}20`,
        border: `2px solid ${color}`,
        borderRadius: "10px",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1rem", fontWeight: 800, color,
      }}>{num}</div>
      <div style={{ fontWeight: 700, color: C.text, fontSize: "0.95rem" }}>{title}</div>
      <div style={{ fontSize: "0.82rem", color: C.dim, lineHeight: 1.6 }}>{desc}</div>
      {items.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {items.map((it, i) => (
            <li key={i} style={{ fontSize: "0.78rem", color: C.muted }}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── category badge ─────────────────────────────────────────────────────── */
const CAT_META = [
  { key: "intersection", label: "Giao lộ", icon: "🔀", color: C.cyan,   desc: "Ngã ba, ngã tư, đầu hẻm" },
  { key: "school",       label: "Trường học", icon: "🏫", color: C.violet, desc: "Trường, ĐH, CĐ, MG" },
  { key: "hospital",     label: "Bệnh viện",  icon: "🏥", color: C.green,  desc: "BV, phòng khám, y tế" },
  { key: "market",       label: "Chợ / TTTM", icon: "🏪", color: C.amber,  desc: "Chợ, siêu thị, TTTM" },
  { key: "hotel",        label: "Khách sạn",  icon: "🏨", color: C.pink,   desc: "Hotel, motel, homestay" },
  { key: "park",         label: "Công viên",  icon: "🌳", color: "#86efac", desc: "Công viên, vườn hoa" },
  { key: "conference",   label: "Hội nghị",   icon: "🏢", color: "#f9a8d4", desc: "Trung tâm hội nghị, sự kiện" },
  { key: "government",   label: "Cơ quan",    icon: "🏛️", color: "#fcd34d", desc: "UBND, công an, tòa án" },
];

/* ─── main landing ─────────────────────────────────────────────────────────── */
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

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
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
          <Tag color={C.cyan}>v2.5.5</Tag>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/plan")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.dim, fontSize: "0.85rem", padding: "0.3rem 0.6rem",
          }}>Kế hoạch</button>
          <button onClick={() => navigate("/sys")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.dim, fontSize: "0.85rem", padding: "0.3rem 0.6rem",
          }}>Architecture</button>
          <button onClick={() => navigate("/scan")} style={{
            background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
            border: "none", borderRadius: "8px",
            padding: "0.45rem 1.2rem",
            color: "#fff", fontWeight: 700, fontSize: "0.85rem",
            cursor: "pointer", letterSpacing: "0.02em",
          }}>Mở Scanner →</button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <Glow color={C.cyan}   style={{ width: "600px", height: "600px", top: "-100px", left: "-100px" }} />
        <Glow color={C.violet} style={{ width: "500px", height: "500px", bottom: "50px", right: "-50px" }} />

        {/* grid dots */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

        <div style={{ position: "relative", textAlign: "center", padding: "6rem 2rem 4rem", maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <Tag color={C.cyan}>Open Source · Browser-side · No Backend</Tag>
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 6vw, 4.5rem)",
            fontWeight: 900, lineHeight: 1.1, margin: "0 0 1.25rem",
            background: `linear-gradient(135deg, #fff 0%, ${C.cyan} 50%, ${C.violet} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Camera Placement<br />Scanner
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: C.dim, lineHeight: 1.7, marginBottom: "2.5rem" }}>
            Phân tích bản đồ thông minh để tìm vị trí lắp camera an ninh tối ưu.<br />
            Dựa trên dữ liệu OpenStreetMap thời gian thực, chạy hoàn toàn trên trình duyệt.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/scan")} style={{
              background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
              border: "none", borderRadius: "12px",
              padding: "0.85rem 2.2rem",
              color: "#fff", fontWeight: 800, fontSize: "1rem",
              cursor: "pointer", letterSpacing: "0.02em",
              boxShadow: `0 0 40px ${C.cyan}44`,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; e.target.style.boxShadow = `0 0 60px ${C.cyan}66`; }}
              onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = `0 0 40px ${C.cyan}44`; }}
            >🚀 Bắt đầu quét</button>
            <button onClick={() => navigate("/plan")} style={{
              background: `linear-gradient(135deg, ${C.amber}22, ${C.orange}11)`,
              border: `1px solid ${C.amber}55`,
              borderRadius: "12px", padding: "0.85rem 2.2rem",
              color: C.amber, fontWeight: 700, fontSize: "1rem", cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.amber; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.amber}55`; }}
            >📊 Ước lượng camera</button>
            <button onClick={() => navigate("/sys")} style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: "12px",
              padding: "0.85rem 2.2rem",
              color: C.dim, fontWeight: 600, fontSize: "1rem",
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = C.cyan; e.target.style.color = C.cyan; }}
              onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.dim; }}
            >📐 Kiến trúc hệ thống</button>
          </div>

          {/* mini stats */}
          <div style={{
            display: "flex", gap: "2.5rem", justifyContent: "center",
            marginTop: "4rem", flexWrap: "wrap",
          }}>
            {[
              { label: "Loại điểm quét",   val: 8,    suffix: "" },
              { label: "Endpoint Overpass", val: 3,    suffix: "" },
              { label: "Điểm tối đa/lần",  val: 500,  suffix: "+" },
              { label: "Camera tối đa",     val: 5000, suffix: "" },
              { label: "Backend cần thiết", val: 0,    suffix: "" },
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

      {/* ── CATEGORIES ───────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Tag color={C.violet}>8 loại điểm</Tag>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.75rem 0 0.5rem" }}>Quét những gì?</h2>
          <p style={{ color: C.dim, fontSize: "0.92rem" }}>Hệ thống phân loại tự động từ tags OpenStreetMap + nhận diện tên tiếng Việt</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
          {CAT_META.map((c, i) => (
            <FeatureCard
              key={c.key}
              icon={c.icon}
              title={c.label}
              desc={c.desc}
              color={c.color}
              delay={i * 60}
            />
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", background: C.bg2, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <Tag color={C.green}>Quy trình</Tag>
            <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.75rem 0 0.5rem" }}>Hoạt động thế nào?</h2>
            <p style={{ color: C.dim, fontSize: "0.92rem" }}>3 bước từ khi nhập địa chỉ đến khi có kết quả</p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <StepCard
              num="01"
              title="Xác định vùng quét"
              color={C.cyan}
              desc="Chọn tâm + bán kính hoặc search theo tên đơn vị hành chính (Nominatim API). Hệ thống tính toán bbox WGS84."
              items={["Nhập thủ công lat/lng + radiusM", "Tìm theo tên: Quận 1, Phường Bến Nghé…", "Hoặc chọn ranh giới polygon từ GeoJSON"]}
            />
            <div style={{ display: "flex", alignItems: "center", color: C.muted, fontSize: "1.5rem", padding: "1rem 0" }}>→</div>
            <StepCard
              num="02"
              title="Truy vấn Overpass API"
              color={C.violet}
              desc="Build Overpass QL query tự động, gửi đến 3 endpoint với fallback. POIs dùng 'out center tags', roads dùng 'out geom tags'."
              items={["3 endpoint fallback (overpass-api.de, kumi.systems, private.coffee)", "Timeout 45s / request", "Trả về JSON elements: nodes + ways"]}
            />
            <div style={{ display: "flex", alignItems: "center", color: C.muted, fontSize: "1.5rem", padding: "1rem 0" }}>→</div>
            <StepCard
              num="03"
              title="Xử lý & hiển thị"
              color={C.green}
              desc="Phân loại tag → lọc bán kính / polygon → phát hiện giao lộ bằng node-sharing → lên vị trí camera → score → render map + bảng."
              items={["Node-sharing algorithm: O(n)", "Phân loại ngã ba/ngã tư/đầu hẻm + nhận diện đèn tín hiệu", "Lên sơ đồ camera CAM1/CAM2/CAM_alley tự động", "Dedup 20m, score theo độ ưu tiên", "Lưu dự án vào IndexedDB, export JSON/CSV"]}
            />
          </div>
        </div>
      </section>

      {/* ── TECH TABLE ───────────────────────────────────────────────────── */}
      <section style={{ padding: "5rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Tag color={C.amber}>Stack</Tag>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.75rem 0 0.5rem" }}>Công nghệ sử dụng</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* frontend */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>🖥️</span>
              <span style={{ fontWeight: 700, color: C.cyan, fontSize: "0.9rem" }}>Frontend</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["React 18",        "UI framework, HashRouter"],
                  ["Vite 5",          "Build tool, HMR"],
                  ["MapLibre GL JS",  "Bản đồ vector tương tác"],
                  ["Zustand",         "Global state management"],
                  ["React Router v6", "SPA routing (Hash mode)"],
                  ["IndexedDB",       "Lưu dự án cục bộ (OPFS thay thế)"],
                ].map(([tech, desc]) => (
                  <tr key={tech} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "0.7rem 1.5rem", fontWeight: 600, color: C.text, fontSize: "0.84rem", width: "40%" }}>{tech}</td>
                    <td style={{ padding: "0.7rem 1.5rem", color: C.dim, fontSize: "0.82rem" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* data / api */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>🗄️</span>
              <span style={{ fontWeight: 700, color: C.violet, fontSize: "0.9rem" }}>Dữ liệu & API</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["OpenStreetMap", "Nguồn dữ liệu địa lý mở"],
                  ["Overpass API", "Query POIs + roads theo bbox"],
                  ["Nominatim API", "Geocoding tên đơn vị hành chính VN"],
                  ["dvhcvn GeoJSON", "Ranh giới hành chính TP.HCM"],
                  ["GitHub Pages", "Static hosting, CI/CD tự động"],
                ].map(([tech, desc]) => (
                  <tr key={tech} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "0.7rem 1.5rem", fontWeight: 600, color: C.text, fontSize: "0.84rem", width: "40%" }}>{tech}</td>
                    <td style={{ padding: "0.7rem 1.5rem", color: C.dim, fontSize: "0.82rem" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* algorithms */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>⚙️</span>
              <span style={{ fontWeight: 700, color: C.green, fontSize: "0.9rem" }}>Algorithms (browser-side)</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Node-sharing",      "Phát hiện giao lộ từ ways OSM"],
                  ["Ray-casting",       "Point-in-polygon (ranh giới)"],
                  ["Haversine",         "Tính khoảng cách chính xác"],
                  ["Camera placement",  "Lên sơ đồ CAM1/CAM2/CAM_alley theo giao lộ"],
                  ["Alley arm detect",  "Xác định hướng đầu hẻm (class + bearing)"],
                  ["Score ranking",     "Ưu tiên điểm theo loại + khoảng cách"],
                  ["Dedup 20m",         "Loại bỏ điểm trùng trong ~20m"],
                ].map(([tech, desc]) => (
                  <tr key={tech} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "0.7rem 1.5rem", fontWeight: 600, color: C.text, fontSize: "0.84rem", width: "40%" }}>{tech}</td>
                    <td style={{ padding: "0.7rem 1.5rem", color: C.dim, fontSize: "0.82rem" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* deployment */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>🚀</span>
              <span style={{ fontWeight: 700, color: C.amber, fontSize: "0.9rem" }}>Deployment & Infra</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["GitHub Actions",   "CI/CD: build → deploy Pages"],
                  ["Docker Compose",   "Backend stack (optional)"],
                  ["Node/Express",     "Backend API (graceful degrade)"],
                  ["PostGIS",          "Spatial DB (optional)"],
                  ["npm workspaces",   "Monorepo management"],
                ].map(([tech, desc]) => (
                  <tr key={tech} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "0.7rem 1.5rem", fontWeight: 600, color: C.text, fontSize: "0.84rem", width: "40%" }}>{tech}</td>
                    <td style={{ padding: "0.7rem 1.5rem", color: C.dim, fontSize: "0.82rem" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA FOOTER ───────────────────────────────────────────────────── */}
      <section style={{
        padding: "5rem 2rem",
        background: `linear-gradient(135deg, ${C.bg2}, ${C.bg})`,
        borderTop: `1px solid ${C.border}`,
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <Glow color={C.violet} style={{ width: "400px", height: "400px", top: "-100px", left: "50%", transform: "translateX(-50%)" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.75rem" }}>Sẵn sàng quét?</h2>
          <p style={{ color: C.dim, marginBottom: "2rem", fontSize: "0.95rem" }}>Không cần cài đặt, không cần tài khoản. Chạy ngay trên trình duyệt.</p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/scan")} style={{
              background: `linear-gradient(135deg, ${C.cyan}, ${C.violet})`,
              border: "none", borderRadius: "12px",
              padding: "0.85rem 2.5rem",
              color: "#fff", fontWeight: 800, fontSize: "1rem",
              cursor: "pointer",
              boxShadow: `0 0 40px ${C.violet}44`,
            }}>📹 Mở Scanner</button>
            <button onClick={() => navigate("/sys")} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: "12px",
              padding: "0.85rem 2.5rem",
              color: C.dim, fontWeight: 600, fontSize: "1rem",
              cursor: "pointer",
            }}>📐 Xem kiến trúc</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER BAR ───────────────────────────────────────────────────── */}
      <div style={{
        padding: "1.2rem 2rem",
        borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "0.78rem", color: C.muted, flexWrap: "wrap", gap: "0.5rem",
      }}>
        <span>© 2026 CamSpot · Camera Placement Scanner v2.5.5</span>
        <span>Data: OpenStreetMap contributors · dvhcvn · Nominatim</span>
      </div>

    </div>
  );
}
