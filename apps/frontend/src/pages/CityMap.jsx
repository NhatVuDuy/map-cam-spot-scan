import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadCityScanCache, aggregateWards } from "../services/cityBatchScan.js";

const C = {
  bg: "#060d1a", card: "#0d1829", border: "#1a2e4a",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
  cyan: "#38BDF8", amber: "#FBBF24", green: "#34D399",
  violet: "#A78BFA", red: "#F87171", orange: "#FB923C",
};

/* ── colour scale: blue→yellow→red by camCount ─────────────────── */
function camColor(count, max) {
  const t = Math.sqrt(count / Math.max(max, 1));
  if (t < 0.33) {
    const u = t / 0.33;
    return `rgb(${Math.round(56 + u * 96)},${Math.round(189 + u * 30)},${Math.round(248 - u * 120)})`;
  } else if (t < 0.66) {
    const u = (t - 0.33) / 0.33;
    return `rgb(${Math.round(152 + u * 99)},${Math.round(219 - u * 32)},${Math.round(128 - u * 128)})`;
  } else {
    const u = (t - 0.66) / 0.34;
    return `rgb(${Math.round(251)},${Math.round(187 - u * 116)},${Math.round(36 - u * 36)})`;
  }
}

export default function CityMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const popupRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [metric, setMetric] = useState("camCount"); // camCount | roadKm | intersection
  const [hoveredWard, setHoveredWard] = useState(null);

  const cache = useMemo(() => loadCityScanCache(), []);
  const wards = cache?.wards || [];
  const agg = useMemo(() => aggregateWards(wards), [wards]);
  const hasData = wards.filter(w => !w.error).length > 0;

  // Build code→result map
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
        layers: [{ id: "osm", type: "raster", source: "osm-tiles", paint: { "raster-opacity": 0.25 } }],
      },
      center: [106.66, 10.77],
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstance.current = map;

    map.on("load", async () => {
      // Load ward boundaries
      const resp = await fetch("/data/hcm-boundaries.geojson");
      const geojson = await resp.json();

      // Enrich features with scan data
      const wardFeatures = geojson.features
        .filter(f => f.properties.type === "ward")
        .map(f => {
          const w = wardMap[f.properties.code];
          return {
            ...f,
            properties: {
              ...f.properties,
              camCount: w?.camCount || 0,
              roadKm: w ? Math.round(w.roadKm * 10) / 10 : 0,
              intersection: w?.byCat?.intersection || 0,
              cam1: w?.cam1 || 0,
              camAlley: w?.camAlley || 0,
              hasError: !!(w?.error),
              hasData: !!(w && !w.error),
            },
          };
        });

      const maxCam = Math.max(...wardFeatures.map(f => f.properties.camCount), 1);
      const maxRoad = Math.max(...wardFeatures.map(f => f.properties.roadKm), 1);
      const maxIx = Math.max(...wardFeatures.map(f => f.properties.intersection), 1);

      // Add expression-based color for each metric
      function makeColorExpr(prop, maxVal) {
        return [
          "interpolate", ["linear"],
          ["get", prop],
          0, "#1a2e4a",
          maxVal * 0.1, "#1d4ed8",
          maxVal * 0.33, "#38BDF8",
          maxVal * 0.6, "#FBBF24",
          maxVal, "#ef4444",
        ];
      }

      map.addSource("wards", {
        type: "geojson",
        data: { type: "FeatureCollection", features: wardFeatures },
      });

      map.addLayer({
        id: "wards-fill",
        type: "fill",
        source: "wards",
        paint: {
          "fill-color": makeColorExpr("camCount", maxCam),
          "fill-opacity": ["case", ["get", "hasData"], 0.72, 0.15],
        },
      });

      map.addLayer({
        id: "wards-outline",
        type: "line",
        source: "wards",
        paint: {
          "line-color": ["case",
            ["boolean", ["feature-state", "hover"], false], C.amber,
            "#334155",
          ],
          "line-width": ["case",
            ["boolean", ["feature-state", "hover"], false], 2.5,
            0.8,
          ],
        },
      });

      map.addLayer({
        id: "wards-label",
        type: "symbol",
        source: "wards",
        minzoom: 12,
        layout: {
          "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "camCount"]], " cam"],
          "text-size": 10,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        },
        paint: {
          "text-color": C.text,
          "text-halo-color": "#0d1829",
          "text-halo-width": 1.5,
        },
      });

      // Store maxes for metric switching
      map._maxCam = maxCam; map._maxRoad = maxRoad; map._maxIx = maxIx;
      map._makeColorExpr = makeColorExpr;

      // Hover
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

      // Click popup
      map.on("click", "wards-fill", e => {
        const p = e.features[0].properties;
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, className: "city-popup" })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="padding:0.75rem 1rem;min-width:180px;font-family:Inter,sans-serif">
              <div style="font-weight:800;font-size:0.85rem;color:#e2e8f0;margin-bottom:0.5rem">${p.ward_type || ""} ${p.name}</div>
              ${p.hasData ? `
                <div style="display:flex;flex-direction:column;gap:0.3rem;font-size:0.75rem">
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Camera</span><strong style="color:#FBBF24">${Number(p.camCount).toLocaleString("vi-VN")}</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Đường</span><strong style="color:#38BDF8">${p.roadKm} km</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Giao lộ</span><strong style="color:#34D399">${Number(p.intersection).toLocaleString("vi-VN")}</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">CAM1 đường</span><strong style="color:#94a3b8">${Number(p.cam1).toLocaleString("vi-VN")}</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">CAM hẻm</span><strong style="color:#86efac">${Number(p.camAlley).toLocaleString("vi-VN")}</strong></div>
                </div>
              ` : `<div style="color:#F87171;font-size:0.75rem">Chưa có dữ liệu</div>`}
            </div>
          `)
          .addTo(map);
      });

      setLoaded(true);
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, [wardMap]);

  // Switch metric
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !loaded || !map._makeColorExpr) return;
    const propMap = { camCount: [map._maxCam, "camCount"], roadKm: [map._maxRoad, "roadKm"], intersection: [map._maxIx, "intersection"] };
    const [maxVal, prop] = propMap[metric];
    map.setPaintProperty("wards-fill", "fill-color", map._makeColorExpr(prop, maxVal));
  }, [metric, loaded]);

  const metricLabel = { camCount: "Camera", roadKm: "Đường (km)", intersection: "Giao lộ" };

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
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Metric toggle */}
          {["camCount", "roadKm", "intersection"].map(m => (
            <button key={m} onClick={() => setMetric(m)} style={{
              fontSize: "0.68rem", padding: "3px 9px", borderRadius: "5px", cursor: "pointer", fontWeight: 600,
              background: metric === m ? C.amber : C.card, color: metric === m ? "#000" : C.dim,
              border: `1px solid ${metric === m ? C.amber : C.border}`,
            }}>{metricLabel[m]}</button>
          ))}
          <button onClick={() => navigate("/plan")} style={{
            fontSize: "0.72rem", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontWeight: 700,
            background: `${C.violet}18`, border: `1px solid ${C.violet}44`, color: C.violet,
          }}>← Thống kê</button>
        </div>
      </nav>

      {/* Map container */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 48px)" }} />

        {/* Legend */}
        <div style={{
          position: "absolute", bottom: "2rem", left: "1rem", zIndex: 10,
          background: `${C.bg}ee`, border: `1px solid ${C.border}`, borderRadius: "10px",
          padding: "0.7rem 1rem", minWidth: "160px",
        }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 800, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            {metricLabel[metric]}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ flex: 1, height: "8px", borderRadius: "4px", background: "linear-gradient(90deg,#1d4ed8,#38BDF8,#FBBF24,#ef4444)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: C.muted, marginTop: "0.2rem" }}>
            <span>Ít</span><span>Nhiều</span>
          </div>
          {hoveredWard && hoveredWard.hasData && (
            <div style={{ marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.text, marginBottom: "0.2rem" }}>
                {hoveredWard.ward_type} {hoveredWard.name}
              </div>
              <div style={{ fontSize: "0.68rem", color: C.amber }}>
                {metric === "camCount" && `${Number(hoveredWard.camCount).toLocaleString("vi-VN")} camera`}
                {metric === "roadKm" && `${hoveredWard.roadKm} km đường`}
                {metric === "intersection" && `${Number(hoveredWard.intersection).toLocaleString("vi-VN")} giao lộ`}
              </div>
            </div>
          )}
        </div>

        {/* No data warning */}
        {!hasData && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            background: `${C.bg}f0`, border: `1px solid ${C.border}`, borderRadius: "12px",
            padding: "1.5rem 2rem", textAlign: "center", zIndex: 10,
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: "0.4rem" }}>Chưa có dữ liệu quét</div>
            <div style={{ fontSize: "0.8rem", color: C.dim, marginBottom: "1rem" }}>Vào trang Thống kê để quét toàn TP.HCM trước</div>
            <button onClick={() => navigate("/plan")} style={{
              background: `linear-gradient(135deg,${C.cyan},${C.violet})`, border: "none",
              borderRadius: "8px", padding: "0.5rem 1.25rem", color: "#fff", fontWeight: 700, cursor: "pointer",
            }}>Đến trang Thống kê →</button>
          </div>
        )}
      </div>

      <style>{`
        .city-popup .maplibregl-popup-content {
          background: #0d1829 !important;
          border: 1px solid #1e3354 !important;
          border-radius: 10px !important;
          padding: 0 !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
          color: #e2e8f0 !important;
        }
        .city-popup .maplibregl-popup-close-button {
          color: #64748b; font-size: 1.1rem; padding: 4px 8px;
        }
        .city-popup .maplibregl-popup-tip { border-top-color: #1e3354 !important; }
      `}</style>
    </div>
  );
}
