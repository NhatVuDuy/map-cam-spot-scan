/**
 * Reusable choropleth map component.
 * Renders ward fill colors based on scan metric, with density toggle.
 *
 * Props:
 *   wardCounts  – array of ward result objects (from scan file)
 *   geojsonPath – URL to fetch ward boundaries GeoJSON
 *   geojsonData – pre-loaded GeoJSON object (alternative to geojsonPath)
 *   cityCenter  – { lng, lat } default map center
 *   onWardClick – (wardCode, feature) => void  (optional)
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const C = {
  bg: "#060d1a", card: "#0d1829", border: "#1a2e4a",
  text: "#e2e8f0", muted: "#64748b", dim: "#94a3b8",
  cyan: "#38BDF8", amber: "#FBBF24", violet: "#A78BFA",
};

const METRIC_TYPES = [
  { key: "cam",          label: "Camera",  icon: "📹", absKey: "camCount",    densKey: "camDensity",  absUnit: "cam",    densUnit: "cam/km²" },
  { key: "road",         label: "Đường",   icon: "🛣️", absKey: "roadKm",      densKey: "roadDensity", absUnit: "km",     densUnit: "km/km²"  },
  { key: "intersection", label: "Giao lộ", icon: "🔀", absKey: "intersection", densKey: "ixDensity",  absUnit: "nút",    densUnit: "/km²"    },
];

function polygonAreaKm2(coords) {
  const ring = Array.isArray(coords[0][0]) ? coords[0] : coords;
  let area = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    area += (x2 - x1) * (y2 + y1);
  }
  const latRad = (ring[0][1] * Math.PI) / 180;
  return Math.abs(area / 2) * 111.32 * 111.32 * Math.cos(latRad);
}

function geometryAreaKm2(geometry) {
  if (geometry.type === "Polygon") return polygonAreaKm2(geometry.coordinates);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.reduce((s, p) => s + polygonAreaKm2(p), 0);
  return 0;
}

export default function ChoroplethMap({
  wardCounts = [],
  geojsonPath,
  geojsonData,
  cityCenter = { lng: 106.66, lat: 10.77 },
  onWardClick,
}) {
  const mapRef      = useRef(null);
  const mapInstance = useRef(null);
  const popupRef    = useRef(null);
  const [loaded, setLoaded]           = useState(false);
  const [metricType, setMetricType]   = useState("cam");
  const [densityMode, setDensityMode] = useState(false);
  const [hoveredWard, setHoveredWard] = useState(null);

  const wardMap = useMemo(() => {
    const m = {};
    for (const w of wardCounts) m[w.code] = w;
    return m;
  }, [wardCounts]);

  const currentMT  = METRIC_TYPES.find(m => m.key === metricType) || METRIC_TYPES[0];
  const metricKey  = densityMode ? currentMT.densKey : currentMT.absKey;
  const metricUnit = densityMode ? currentMT.densUnit : currentMT.absUnit;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        sources: { "osm-tiles": { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm", type: "raster", source: "osm-tiles", paint: { "raster-opacity": 0.22 } }],
      },
      center: [cityCenter.lng, cityCenter.lat],
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapInstance.current = map;

    map.on("load", async () => {
      const geojson = geojsonData || await fetch(geojsonPath || "/data/hcm-boundaries.geojson").then(r => r.json());

      const wardFeatures = geojson.features
        .filter(f => f.properties.type === "ward")
        .map(f => {
          const w = wardMap[f.properties.code];
          const areaKm2 = geometryAreaKm2(f.geometry);
          const camCount = w?.camCount || 0;
          const roadKm   = w ? Math.round(w.roadKm * 10) / 10 : 0;
          const ix       = w?.byCat?.intersection || 0;
          return {
            ...f,
            properties: {
              ...f.properties,
              areaKm2:      Math.round(areaKm2 * 100) / 100,
              camCount,
              camDensity:   areaKm2 > 0 ? Math.round(camCount / areaKm2) : 0,
              roadKm,
              roadDensity:  areaKm2 > 0 ? Math.round((roadKm / areaKm2) * 100) / 100 : 0,
              intersection: ix,
              ixDensity:    areaKm2 > 0 ? Math.round(ix / areaKm2) : 0,
              cam1:         w?.cam1 || 0,
              camAlley:     w?.camAlley || 0,
              byCatSchool:  w?.byCat?.school || 0,
              byCatHosp:    w?.byCat?.hospital || 0,
              byCatMarket:  w?.byCat?.market || 0,
              hasError:     !!(w?.error),
              hasData:      !!(w && !w.error),
            },
          };
        });

      const maxes = {};
      for (const m of METRIC_TYPES) {
        maxes[m.absKey]  = Math.max(...wardFeatures.map(f => f.properties[m.absKey]  || 0), 1);
        maxes[m.densKey] = Math.max(...wardFeatures.map(f => f.properties[m.densKey] || 0), 1);
      }
      map._maxes = maxes;

      const colorExpr = (prop, maxVal) => ["interpolate", ["linear"], ["get", prop],
        0, "#0f172a", maxVal * 0.05, "#1e3a8a", maxVal * 0.2, "#1d4ed8",
        maxVal * 0.4, "#38BDF8", maxVal * 0.65, "#FBBF24", maxVal, "#ef4444"];
      map._colorExpr = colorExpr;

      map.addSource("wards", { type: "geojson", data: { type: "FeatureCollection", features: wardFeatures }, generateId: true });

      map.addLayer({ id: "wards-fill", type: "fill", source: "wards",
        paint: { "fill-color": colorExpr("camCount", maxes.camCount), "fill-opacity": ["case", ["get", "hasData"], 0.78, 0.12] } });

      map.addLayer({ id: "wards-outline", type: "line", source: "wards",
        paint: {
          "line-color": ["case", ["boolean", ["feature-state", "hover"], false], C.amber, "#253855"],
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 0.7],
        } });

      map.addLayer({ id: "wards-label", type: "symbol", source: "wards", minzoom: 12.5,
        layout: { "text-field": ["get", "name"], "text-size": 10, "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"] },
        paint: { "text-color": C.text, "text-halo-color": "#060d1a", "text-halo-width": 1.5 } });

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

      map.on("click", "wards-fill", e => {
        const p       = e.features[0].properties;
        const feature = geojson.features.find(f => f.properties.code === p.code);
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({ closeButton: true, className: "city-popup", maxWidth: "240px" })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="padding:0.75rem 1rem;font-family:Inter,sans-serif">
              <div style="font-weight:800;font-size:0.85rem;color:#e2e8f0;margin-bottom:0.5rem">${p.ward_type || ""} ${p.name}</div>
              ${p.hasData ? `
                <div style="display:flex;flex-direction:column;gap:0.28rem;font-size:0.72rem;margin-bottom:0.65rem">
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Diện tích</span><strong style="color:#94a3b8">${p.areaKm2} km²</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Camera</span><strong style="color:#FBBF24">${Number(p.camCount).toLocaleString("vi-VN")}</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Mật độ</span><strong style="color:#FBBF24">${Number(p.camDensity).toLocaleString("vi-VN")} cam/km²</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Đường</span><strong style="color:#38BDF8">${p.roadKm} km</strong></div>
                  <div style="display:flex;justify-content:space-between"><span style="color:#64748b">Giao lộ</span><strong style="color:#34D399">${Number(p.intersection).toLocaleString("vi-VN")}</strong></div>
                </div>
                ${onWardClick ? `<button id="ward-detail-btn" style="width:100%;padding:0.45rem;background:linear-gradient(135deg,#38BDF8,#A78BFA);border:none;border-radius:7px;color:#fff;font-weight:800;font-size:0.75rem;cursor:pointer">⚡ Xem chi tiết →</button>` : ""}
              ` : `<div style="color:#F87171;font-size:0.75rem">Chưa có dữ liệu</div>`}
            </div>`)
          .addTo(map);
        popupRef.current = popup;

        if (onWardClick) {
          setTimeout(() => {
            const btn = document.getElementById("ward-detail-btn");
            if (btn && feature) btn.onclick = () => { popup.remove(); onWardClick(p.code, feature); };
          }, 50);
        }
      });

      setLoaded(true);
    });

    return () => { map.remove(); mapInstance.current = null; };
  }, [wardMap, geojsonPath, geojsonData]);

  // Switch color when metric or density changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !loaded || !map._maxes || !map._colorExpr) return;
    const maxVal = map._maxes[metricKey] || 1;
    map.setPaintProperty("wards-fill", "fill-color", map._colorExpr(metricKey, maxVal));
  }, [metricKey, loaded]);

  const hasData = wardCounts.filter(w => !w.error).length > 0;

  return (
    <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
      {/* Metric controls */}
      <div style={{
        position: "absolute", top: "0.75rem", left: "50%", transform: "translateX(-50%)",
        zIndex: 10, display: "flex", alignItems: "center", gap: "0.4rem",
        background: `${C.bg}ee`, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "5px 10px",
        backdropFilter: "blur(8px)",
      }}>
        {METRIC_TYPES.map(m => (
          <button key={m.key} onClick={() => setMetricType(m.key)} style={{
            fontSize: "0.68rem", padding: "3px 9px", borderRadius: "5px", cursor: "pointer", fontWeight: 600,
            background: metricType === m.key ? C.amber : "transparent",
            color: metricType === m.key ? "#000" : C.dim,
            border: `1px solid ${metricType === m.key ? C.amber : C.border}`,
          }}>{m.icon} {m.label}</button>
        ))}
        <div style={{ width: "1px", height: "16px", background: C.border, margin: "0 2px" }} />
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "0.68rem", color: densityMode ? C.violet : C.dim, fontWeight: densityMode ? 700 : 400 }}>
          <input type="checkbox" checked={densityMode} onChange={e => setDensityMode(e.target.checked)} style={{ accentColor: C.violet, cursor: "pointer", width: "12px", height: "12px" }} />
          /km²
        </label>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: "2rem", left: "1rem", zIndex: 10,
        background: `${C.bg}ee`, border: `1px solid ${C.border}`, borderRadius: "10px", padding: "0.65rem 0.9rem", minWidth: "170px",
      }}>
        <div style={{ fontSize: "0.58rem", fontWeight: 800, color: C.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
          {currentMT.icon} {currentMT.label}{densityMode ? <span style={{ color: C.violet }}> / km²</span> : ""}
        </div>
        <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "0.2rem" }}>
          {["#1e3a8a","#1d4ed8","#38BDF8","#FBBF24","#ef4444"].map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: C.muted }}>
          <span>Ít</span><span>Nhiều</span>
        </div>
        {hoveredWard?.hasData && (
          <div style={{ marginTop: "0.5rem", paddingTop: "0.45rem", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.text, marginBottom: "0.2rem" }}>
              {hoveredWard.ward_type} {hoveredWard.name}
            </div>
            <div style={{ fontSize: "0.7rem", color: C.amber, fontWeight: 700 }}>
              {Number(hoveredWard[metricKey] || 0).toLocaleString("vi-VN")} {metricUnit}
            </div>
            <div style={{ fontSize: "0.62rem", color: C.muted, marginTop: "0.1rem" }}>
              {hoveredWard.areaKm2} km² · {Number(hoveredWard.camDensity).toLocaleString("vi-VN")} cam/km²
            </div>
          </div>
        )}
      </div>

      {!hasData && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: `${C.bg}f0`, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "1.5rem 2rem", textAlign: "center", zIndex: 10 }}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: "0.4rem" }}>Chưa có dữ liệu</div>
          <div style={{ fontSize: "0.8rem", color: C.dim }}>Chọn một file quét để xem bản đồ</div>
        </div>
      )}

      <style>{`
        .city-popup .maplibregl-popup-content { background: #0d1829 !important; border: 1px solid #1e3354 !important; border-radius: 10px !important; padding: 0 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important; color: #e2e8f0 !important; }
        .city-popup .maplibregl-popup-close-button { color: #64748b; font-size: 1.1rem; padding: 4px 8px; }
        .city-popup .maplibregl-popup-tip { border-top-color: #1e3354 !important; }
      `}</style>
    </div>
  );
}
