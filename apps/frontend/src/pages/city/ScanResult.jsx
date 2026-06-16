import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout, { NavBtn, BackBtn } from "../../components/layout/AppLayout.jsx";
import ChoroplethMap from "../../components/city/ChoroplethMap.jsx";
import { getScanFile, getCity, seedBuiltInCities } from "../../utils/cityDB.js";
import { aggregateWards, exportScanFileJSON, exportScanFileCSV } from "../../services/cityBatchScan.js";

const C = {
  bg: "#060d1a", bg2: "#0b1425", card: "#0d1829", card2: "#0f1f35", border: "#1a2e4a",
  cyan: "#38BDF8", violet: "#A78BFA", green: "#34D399", amber: "#FBBF24",
  red: "#F87171", orange: "#FB923C", lime: "#86efac", gold: "#fcd34d", pink: "#F472B6",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
};

function fmt(n) { return Math.round(n).toLocaleString("vi-VN"); }

const LOC_CAM  = { intersection: 4, school: 10, hospital: 30, market: 20, hotel: 8, park: 10, conference: 15, government: 12 };
const PLAN_HCM = 1_100_000;

const CAT_META = [
  { key: "intersection", icon: "🔀", label: "Giao lộ",    color: C.cyan,   cam: 4 },
  { key: "school",       icon: "🏫", label: "Trường học",  color: C.violet, cam: 10 },
  { key: "hospital",     icon: "🏥", label: "Bệnh viện",   color: C.green,  cam: 30 },
  { key: "market",       icon: "🏪", label: "Chợ/TTTM",    color: C.amber,  cam: 20 },
  { key: "park",         icon: "🌳", label: "Công viên",   color: C.lime,   cam: 10 },
  { key: "hotel",        icon: "🏨", label: "Khách sạn",   color: C.pink,   cam: 8 },
  { key: "conference",   icon: "🏢", label: "Hội nghị",    color: "#f9a8d4", cam: 15 },
  { key: "government",   icon: "🏛️", label: "Cơ quan",     color: C.gold,   cam: 12 },
];

function Bar({ pct, color, height = 6, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => { setW(0); const t = setTimeout(() => setW(Math.max(0, Math.min(100, pct))), delay + 100); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div style={{ height, background: C.border, borderRadius: 100, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 100, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

/* ── Stats dashboard ─────────────────────────────────────────────── */
function Dashboard({ agg, wardResults, city }) {
  const topWards = [...wardResults].filter(w => !w.error).sort((a, b) => b.camCount - a.camCount).slice(0, 10);
  const maxCam   = topWards[0]?.camCount || 1;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.25rem 1.25rem 3rem" }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.7rem", marginBottom: "1rem" }}>
        {[
          { icon: "📹", label: "Camera OSM",    val: fmt(agg.camCount),   sub: `KH: ${fmt(PLAN_HCM)}`, color: C.cyan },
          { icon: "🔀", label: "Giao lộ",         val: fmt(agg.byCat.intersection || 0), sub: `${fmt((agg.byCat.intersection||0)*4)} cam giao lộ`, color: C.amber },
          { icon: "🛣️", label: "Đường (km)",     val: fmt(agg.roadKm),     sub: `${(agg.roadKm / (city?.areaKm2 || 2095)).toFixed(2)} km/km²`, color: C.violet },
          { icon: "✅", label: "Phường hoàn tất", val: `${agg.completed}/${wardResults.length}`, sub: `${agg.errors} lỗi`, color: C.green },
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
        {/* Camera type bars */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.85rem" }}>
            Loại camera — {fmt(agg.camCount)} tổng
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
              <Bar pct={Math.round((r.v / Math.max(agg.camCount, 1)) * 100)} color={r.color} delay={i * 100} />
            </div>
          ))}
        </div>

        {/* Top wards */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1rem 1.1rem" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: C.violet, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>Top 10 phường</div>
          {topWards.map((w, i) => (
            <div key={w.code} style={{ marginBottom: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "0.1rem" }}>
                <span style={{ color: i < 3 ? C.amber : C.dim }}>{i + 1}. {w.name}</span>
                <span style={{ color: C.text, fontWeight: 700 }}>{fmt(w.camCount)}</span>
              </div>
              <Bar pct={(w.camCount / maxCam) * 100} color={i < 3 ? C.amber : C.violet} delay={i * 50} />
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
              {["Địa điểm","POI","Cam/node","Camera"].map((h,i) => (
                <th key={h} style={{ padding: "0.5rem 0.7rem", fontSize: "0.62rem", fontWeight: 700, color: C.dim, textAlign: i>0?"right":"left", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAT_META.map(cat => {
              const poi = agg.byCat[cat.key] || 0;
              const cam = Math.round(poi * cat.cam);
              return (
                <tr key={cat.key} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "0.45rem 0.7rem", fontSize: "0.74rem", color: C.text }}>{cat.icon} {cat.label}</td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right", fontSize: "0.74rem", color: poi>0?C.text:C.muted }}>{poi>0?fmt(poi):"—"}</td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right" }}>
                    <span style={{ fontSize: "0.6rem", padding: "2px 7px", borderRadius: "100px", border: `1px solid ${cat.color}44`, background: `${cat.color}18`, color: cat.color }}>{cat.cam}×</span>
                  </td>
                  <td style={{ padding: "0.45rem 0.7rem", textAlign: "right", fontSize: "0.82rem", fontWeight: 900, color: cat.color }}>{cam>0?fmt(cam):"—"}</td>
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
  const { cityId, scanId } = useParams();
  const navigate = useNavigate();

  const [scanFile, setScanFile] = useState(null);
  const [city, setCity]         = useState(null);
  const [tab, setTab]           = useState("dashboard"); // dashboard | map
  const [loading, setLoading]   = useState(true);

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

  const agg = useMemo(() => scanFile?.wardCounts?.length ? aggregateWards(scanFile.wardCounts) : null, [scanFile]);

  if (loading) return (
    <AppLayout featureName="Đang tải...">
      <div style={{ padding: "2rem", color: C.muted }}>Đang tải kết quả quét...</div>
    </AppLayout>
  );

  if (!scanFile) return (
    <AppLayout featureName="Không tìm thấy" backButton={<BackBtn onClick={() => navigate(`/city/${cityId}`)}>← Quay lại</BackBtn>}>
      <div style={{ padding: "2rem", color: C.red }}>File quét không tồn tại.</div>
    </AppLayout>
  );

  return (
    <AppLayout
      featureName={scanFile.name}
      backButton={<BackBtn onClick={() => navigate(`/city/${cityId}`)}>← {city?.name || cityId}</BackBtn>}
      navButtons={
        <>
          {/* Tab switcher */}
          <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: `1px solid ${C.border}` }}>
            {[["dashboard","📊 Thống kê"],["map","🗺 Bản đồ"]].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "4px 12px", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: "none",
                background: tab===key ? C.cyan : C.card, color: tab===key ? "#000" : C.dim,
              }}>{label}</button>
            ))}
          </div>
          <NavBtn color={C.violet} onClick={() => exportScanFileCSV(scanFile)}>⬇ CSV</NavBtn>
          <NavBtn color={C.violet} onClick={() => exportScanFileJSON(scanFile)}>⬇ JSON</NavBtn>
          <NavBtn color={C.amber} onClick={() => window.print()}>🖨 PDF</NavBtn>
        </>
      }
      style={tab === "map" ? { height: "100vh", overflow: "hidden" } : {}}
    >
      {tab === "dashboard" ? (
        agg ? <Dashboard agg={agg} wardResults={scanFile.wardCounts} city={city} /> : (
          <div style={{ padding: "2rem", color: C.muted }}>File này chưa có dữ liệu quét.</div>
        )
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <ChoroplethMap
            wardCounts={scanFile.wardCounts || []}
            geojsonPath={city?.geojsonPath || null}
            geojsonData={city?.geojsonData || null}
            cityCenter={city?.center || { lng: 106.66, lat: 10.77 }}
            onWardClick={(wardCode) => navigate(`/city/${cityId}/scan/${scanId}/ward/${wardCode}`)}
          />
        </div>
      )}

      <style>{`
        @media print {
          nav, button { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </AppLayout>
  );
}
