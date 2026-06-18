import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { aggregateWards } from "../services/cityBatchScan.js";
import { BLOCKS } from "../config/blocks.js";
import { getScanFile } from "../utils/cityDB.js";
import useScanFileStore from "../store/scanFileStore.js";

const C = {
  bg: "#060d1a", card: "#0d1829", border: "#1a2e4a",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
  cyan: "#38BDF8", amber: "#FBBF24", green: "#34D399",
  violet: "#A78BFA", red: "#F87171", orange: "#FB923C",
};

/* ── polygon area (Shoelace, spherical approx, returns km²) ────── */
function polygonAreaKm2(coords) {
  // coords: array of [lng, lat] rings; use outer ring only
  const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    area += (x2 - x1) * (y2 + y1);
  }
  // Convert degrees² to km² (rough: 1° lat ≈ 111.32 km, 1° lng ≈ 111.32·cos(lat) km)
  const latRad = (ring[0][1] * Math.PI) / 180;
  const km2 = Math.abs(area / 2) * 111.32 * 111.32 * Math.cos(latRad);
  return km2;
}

function geometryAreaKm2(geometry) {
  if (geometry.type === "Polygon") return polygonAreaKm2(geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce((s, poly) => s + polygonAreaKm2(poly), 0);
  }
  return 0;
}

/* ── metrics definition ─────────────────────────────────────────── */
const METRIC_TYPES = [
  { key: "cam",          label: "Camera (ước tính)", icon: "📹", absKey: "camCount",    densKey: "camDensity",  absUnit: "cam",   densUnit: "cam/km²" },
  { key: "poi",          label: "Địa điểm",          icon: "📍", absKey: "poiCount",    densKey: "poiDensity",  absUnit: "điểm",  densUnit: "/km²"    },
  { key: "intersection", label: "Giao lộ",            icon: "🔀", absKey: "intersection",densKey: "ixDensity",   absUnit: "nút",   densUnit: "/km²"    },
];

export default function CityMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const popupRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [metricType, setMetricType] = useState("cam");    // cam | road | intersection
  const [densityMode, setDensityMode] = useState(false);  // false = absolute, true = per km²
  const [hoveredWard, setHoveredWard] = useState(null);

  const currentMT  = METRIC_TYPES.find(m => m.key === metricType) || METRIC_TYPES[0];
  const metricKey  = densityMode ? currentMT.densKey : currentMT.absKey;
  const metricUnit = densityMode ? currentMT.densUnit : currentMT.absUnit;

  const [wards, setWards] = useState([]);
  useEffect(() => {
    async function load() {
      const scanId = sessionStorage.getItem("city-report-scan");
      if (!scanId) return;
      try { const sf = await getScanFile(scanId); if (sf?.wardCounts) setWards(sf.wardCounts); } catch {}
    }
    load();
  }, []);
  const agg = useMemo(() => aggregateWards(wards), [wards]);
  const hasData = wards.filter(w => !w.error).length > 0;

  const wardMap = useMemo(() => {
    const m = {};
    for (const w of wards) m[w.code] = w;
    return m;
  }, [wards]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm-tiles", paint: { "raster-opacity": 0.22 } }],
      },
      center: [106.66, 10.77],
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstance.current = map;

    map.on("load", async () => {
      const resp = await fetch("/data/hcm-boundaries.geojson");
      const geojson = await resp.json();

      // Enrich ward features with scan data + computed density
      const wardFeatures = geojson.features
        .filter(f => f.properties.type === "ward")
        .map(f => {
          const w = wardMap[f.properties.code];
          const areaKm2 = geometryAreaKm2(f.geometry);
          const byCat = w?.byCat || {};
          // Intersection blocks B01-B03, B07, B07-S
          const ix = (byCat.B01||0)+(byCat.B02||0)+(byCat.B03||0)+(byCat.B07||0)+(byCat["B07-S"]||0);
          const poiCount = Object.values(byCat).reduce((a,b)=>a+b,0);
          // Camera estimate per ward from block ratios
          let camCount = 0;
          for (const [blockId, cnt] of Object.entries(byCat)) {
            const block = BLOCKS[blockId];
            if (block) camCount += cnt * Object.values(block.cams).reduce((a,b)=>a+b,0);
          }
          return {
            ...f,
            properties: {
              ...f.properties,
              areaKm2:      Math.round(areaKm2 * 100) / 100,
              camCount,
              camDensity:   areaKm2 > 0 ? Math.round(camCount / areaKm2) : 0,
              poiCount,
              poiDensity:   areaKm2 > 0 ? Math.round(poiCount / areaKm2) : 0,
              intersection: ix,
              ixDensity:    areaKm2 > 0 ? Math.round(ix / areaKm2) : 0,
              hasError:     !!(w?.error),
              hasData:      !!(w && !w.error),
            },
          };
        });

      // Compute max for each metric key (both abs and density)
      const maxes = {};
      for (const m of METRIC_TYPES) {
        maxes[m.absKey]  = Math.max(...wardFeatures.map(f => f.properties[m.absKey]  || 0), 1);
        maxes[m.densKey] = Math.max(...wardFeatures.map(f => f.properties[m.densKey] || 0), 1);
      }
      map._maxes = maxes;

      const colorExpr = (prop, maxVal) => [
        "interpolate", ["linear"],
        ["get", prop],
        0,            "#0f172a",
        maxVal * 0.05, "#1e3a8a",
        maxVal * 0.2,  "#1d4ed8",
        maxVal * 0.4,  "#38BDF8",
        maxVal * 0.65, "#FBBF24",
        maxVal,        "#ef4444",
      ];
      map._colorExpr = colorExpr;

      map.addSource("wards", {
        type: "geojson",
        data: { type: "FeatureCollection", features: wardFeatures },
        generateId: true,
      });

      map.addLayer({
        id: "wards-fill",
        type: "fill",
        source: "wards",
        paint: {
          "fill-color": colorExpr("camCount", maxes.camCount),
          "fill-opacity": ["case", ["get", "hasData"], 0.78, 0.12],
        },
      });

      map.addLayer({
        id: "wards-outline",
        type: "line",
        source: "wards",
        paint: {
          "line-color": ["case",
            ["boolean", ["feature-state", "hover"], false], C.amber,
            "#253855",
          ],
          "line-width": ["case",
            ["boolean", ["feature-state", "hover"], false], 2.5,
            0.7,
          ],
        },
      });

      map.addLayer({
        id: "wards-label",
        type: "symbol",
        source: "wards",
        minzoom: 12.5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": C.text,
          "text-halo-color": "#060d1a",
          "text-halo-width": 1.5,
        },
      });

      // Hover state
      let hoveredId = null;
      map.on("mousemove", "wards-fill", e => {
        if (hoveredId !== null) map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
        hoveredId = e.features[0].id;
        map.setFeatureState({ source: "wards", id: hoveredId }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
        setHoveredWard(e.features[0].properties);
      });
      map.on("mouseleave", "wards-fill", () => {
        if (hoveredId !== null) map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
        hoveredId = null;
        map.getCanvas().style.cursor = "";
        setHoveredWard(null);
      });

      // Click → show popup + option to open in Scanner
      map.on("click", "wards-fill", e => {
        const p = e.features[0].properties;
        // Store the clicked ward feature in sessionStorage for Scanner to pick up
        const feature = geojson.features.find(f => f.properties.code === p.code);

        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, className: "city-popup", maxWidth: "240px" })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="padding:0.75rem 1rem;font-family:Inter,sans-serif">
              <div style="font-weight:800;font-size:0.85rem;color:#e2e8f0;margin-bottom:0.5rem">
                ${p.ward_type || ""} ${p.name}
              </div>
              ${p.hasData ? `
                <div style="display:flex;flex-direction:column;gap:0.28rem;font-size:0.73rem;margin-bottom:0.65rem">
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#64748b">Diện tích</span>
                    <strong style="color:#94a3b8">${p.areaKm2} km²</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#64748b">Camera (ước tính)</span>
                    <strong style="color:#FBBF24">${Number(p.camCount).toLocaleString("vi-VN")}</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#64748b">Mật độ cam</span>
                    <strong style="color:#FBBF24">${Number(p.camDensity).toLocaleString("vi-VN")} /km²</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#64748b">Địa điểm</span>
                    <strong style="color:#38BDF8">${Number(p.poiCount).toLocaleString("vi-VN")} điểm</strong>
                  </div>
                  <div style="display:flex;justify-content:space-between">
                    <span style="color:#64748b">Giao lộ</span>
                    <strong style="color:#34D399">${Number(p.intersection).toLocaleString("vi-VN")} · ${p.ixDensity}/km²</strong>
                  </div>
                </div>
                <button id="open-in-scanner"
                  style="width:100%;padding:0.45rem;background:linear-gradient(135deg,#38BDF8,#A78BFA);
                    border:none;border-radius:7px;color:#fff;font-weight:800;font-size:0.75rem;cursor:pointer">
                  ⚡ Xem chi tiết phường →
                </button>
              ` : `<div style="color:#F87171;font-size:0.75rem;margin-bottom:0.5rem">Chưa có dữ liệu quét</div>`}
            </div>
          `)
          .addTo(map);

        // Wire up the button after popup renders
        setTimeout(() => {
          const btn = document.getElementById("open-in-scanner");
          if (btn && feature) {
            btn.onclick = () => {
              const code = p.code || feature.properties.code;
              sessionStorage.setItem("city-details-ward", code);
              sessionStorage.setItem("scanner-boundary", JSON.stringify(feature));
              navigate("/city/details");
            };
          }
        }, 50);
      });

      setLoaded(true);
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, [wardMap, navigate]);

  // Switch metric color when type or density mode changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !loaded || !map._maxes || !map._colorExpr) return;
    const maxVal = map._maxes[metricKey] || 1;
    map.setPaintProperty("wards-fill", "fill-color", map._colorExpr(metricKey, maxVal));
  }, [metricKey, loaded]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "Inter,system-ui,sans-serif" }}>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1rem", height: "48px", flexShrink: 0,
        background: "#0b1425", borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span onClick={() => navigate("/")} style={{ cursor: "pointer", fontSize: "1rem" }}>📹</span>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: C.text }}>Bản đồ Camera TP.HCM</span>
          {hasData && (
            <span style={{ fontSize: "0.65rem", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "2px 7px" }}>
              {agg.completed}/168 phường · {Math.round(agg.camCount).toLocaleString("vi-VN")} cam
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          {METRIC_TYPES.map(m => (
            <button key={m.key} onClick={() => setMetricType(m.key)} style={{
              fontSize: "0.68rem", padding: "4px 10px", borderRadius: "5px", cursor: "pointer", fontWeight: 600,
              background: metricType === m.key ? C.amber : C.card,
              color: metricType === m.key ? "#000" : C.dim,
              border: `1px solid ${metricType === m.key ? C.amber : C.border}`,
            }}>{m.icon} {m.label}</button>
          ))}
          <div style={{ width: "1px", height: "18px", background: C.border, margin: "0 2px" }} />
          <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "0.68rem", color: densityMode ? C.violet : C.dim, fontWeight: densityMode ? 700 : 400 }}>
            <input type="checkbox" checked={densityMode} onChange={e => setDensityMode(e.target.checked)}
              style={{ accentColor: C.violet, cursor: "pointer", width: "13px", height: "13px" }} />
            Mật độ / km²
          </label>
          <div style={{ width: "1px", height: "18px", background: C.border }} />
          <button onClick={() => navigate("/city/report")} style={{
            fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
            background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`, color: C.cyan,
          }}>📊 Thống kê</button>
          <button onClick={() => navigate("/city")} style={{
            fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
            background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet,
          }}>← Quét thành phố</button>
        </div>
      </nav>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 48px)" }} />

        {/* Legend + hover info */}
        <div style={{
          position: "absolute", bottom: "2rem", left: "1rem", zIndex: 10,
          background: `${C.bg}ee`, border: `1px solid ${C.border}`, borderRadius: "10px",
          padding: "0.7rem 1rem", minWidth: "180px",
        }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 800, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            {currentMT.icon} {currentMT.label}
            {densityMode && <span style={{ color: C.violet, marginLeft: "0.3rem" }}>/ km²</span>}
          </div>
          <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", marginBottom: "0.25rem" }}>
            {["#1e3a8a","#1d4ed8","#38BDF8","#FBBF24","#ef4444"].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: C.muted }}>
            <span>Ít</span><span>TB</span><span>Nhiều</span>
          </div>

          {/* Hover tooltip */}
          {hoveredWard && hoveredWard.hasData && (
            <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.text, marginBottom: "0.25rem" }}>
                {hoveredWard.ward_type} {hoveredWard.name}
              </div>
              <div style={{ fontSize: "0.7rem", color: C.amber, fontWeight: 700 }}>
                {Number(hoveredWard[metricKey] || 0).toLocaleString("vi-VN")} {metricUnit}
              </div>
              <div style={{ fontSize: "0.65rem", color: C.muted, marginTop: "0.15rem" }}>
                {hoveredWard.areaKm2} km² · {Number(hoveredWard.camDensity).toLocaleString("vi-VN")} cam/km²
              </div>
              <div style={{ fontSize: "0.63rem", color: C.dim, marginTop: "0.1rem" }}>
                Click để xem chi tiết + mở Scanner
              </div>
            </div>
          )}
        </div>

        {/* Density note */}
        {densityMode && (
          <div style={{
            position: "absolute", top: "0.75rem", left: "50%", transform: "translateX(-50%)", zIndex: 10,
            background: `${C.violet}22`, border: `1px solid ${C.violet}44`, borderRadius: "7px",
            padding: "0.3rem 0.9rem", fontSize: "0.7rem", color: C.violet, fontWeight: 600, whiteSpace: "nowrap",
          }}>
            ⊞ Mật độ / km² — so sánh chính xác hơn giữa các phường có kích thước khác nhau
          </div>
        )}

        {/* No data */}
        {!hasData && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: `${C.bg}f0`, border: `1px solid ${C.border}`, borderRadius: "12px",
            padding: "1.5rem 2rem", textAlign: "center", zIndex: 10,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: "0.4rem" }}>Chưa có dữ liệu quét</div>
            <div style={{ fontSize: "0.8rem", color: C.dim, marginBottom: "1rem" }}>Vào trang Thống kê để quét toàn TP.HCM trước</div>
            <button onClick={() => navigate("/city")} style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
              borderRadius: "8px", padding: "0.5rem 1.25rem", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}>Đến Quét thành phố →</button>
          </div>
        )}
      </div>

      <style>{`
        .city-popup .maplibregl-popup-content {
          background: #0d1829 !important; border: 1px solid #1e3354 !important;
          border-radius: 10px !important; padding: 0 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important; color: #e2e8f0 !important;
        }
        .city-popup .maplibregl-popup-close-button { color: #64748b; font-size: 1.1rem; padding: 4px 8px; }
        .city-popup .maplibregl-popup-tip { border-top-color: #1e3354 !important; }
      `}</style>
    </div>
  );
}
