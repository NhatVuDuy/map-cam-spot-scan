import React, { useEffect, useRef, useState, Component } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";
import { circleGeoJSON } from "../../utils/geo.js";
import MapContextMenu from "./MapContextMenu.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";

// ─── Error Boundary ───────────────────────────────────────────────────────────

class MapErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#FF6B6B", flexDirection: "column", gap: "0.5rem", background: "#0f172a" }}>
          <span style={{ fontSize: "2rem" }}>Map Error</span>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{this.state.error?.message}</span>
          <button style={{ padding: "0.4rem 1rem", background: "#334155", color: "#e2e8f0", border: "none", borderRadius: "4px", cursor: "pointer" }} onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Return-to-area button ────────────────────────────────────────────────────

function ReturnBtn({ onClick }) {
  return (
    <button onClick={onClick} title="Về vùng đang chọn" style={{
      position: "absolute", bottom: "80px", right: "10px", zIndex: 10,
      width: "36px", height: "36px", background: "#1e293b", border: "1px solid #475569",
      borderRadius: "6px", color: "#e2e8f0", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    }}>⊙</button>
  );
}

// ─── Popup dark-theme style injection ────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("cam-popup-style")) {
  const s = document.createElement("style");
  s.id = "cam-popup-style";
  s.textContent = `
    .cam-popup .maplibregl-popup-content {
      background: #0d1829 !important;
      border: 1px solid #1e3354 !important;
      border-radius: 8px !important;
      padding: 0 !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
      color: #e2e8f0 !important;
    }
    .cam-popup .maplibregl-popup-tip {
      border-top-color: #1e3354 !important;
      border-bottom-color: #1e3354 !important;
    }
    .cam-popup .maplibregl-popup-close-button {
      color: #64748b !important;
      font-size: 1rem !important;
      padding: 4px 8px !important;
    }
    .cam-popup .maplibregl-popup-close-button:hover { color: #e2e8f0 !important; }
  `;
  document.head.appendChild(s);
}

// ─── Popup HTML builder ───────────────────────────────────────────────────────
function buildPopupHTML({ props, cat, distFmt, score }) {
  const lat = props.lat != null ? Number(props.lat).toFixed(6) : "—";
  const lon = props.lon != null ? Number(props.lon).toFixed(6)
            : props.lng != null ? Number(props.lng).toFixed(6) : "—";
  const name = props.name || props.id || "—";
  const color = cat?.color || "#94a3b8";
  const label = cat?.label || props.category || "—";

  return `
    <div style="min-width:200px;font-family:system-ui,sans-serif">
      <!-- header -->
      <div style="padding:0.65rem 0.85rem 0.5rem;border-bottom:1px solid #1e3354">
        <div style="font-size:0.88rem;font-weight:700;color:#f1f5f9;margin-bottom:0.25rem;line-height:1.3">${name}</div>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.7rem;padding:2px 8px;border-radius:100px;background:${color}20;border:1px solid ${color}44;color:${color};font-weight:600">
          <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block"></span>
          ${label}
        </span>
      </div>
      <!-- body -->
      <div style="padding:0.55rem 0.85rem;display:flex;flex-direction:column;gap:0.3rem">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem">
          <span style="color:#64748b">Cách tâm quét</span>
          <strong style="color:#38BDF8">${distFmt}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.78rem">
          <span style="color:#64748b">Lat / Lng</span>
          <code style="color:#94a3b8;font-size:0.72rem">${lat}, ${lon}</code>
        </div>
        ${score != null ? `<div style="display:flex;justify-content:space-between;font-size:0.78rem"><span style="color:#64748b">Điểm ưu tiên</span><strong style="color:#FBBF24">★ ${score}</strong></div>` : ""}
      </div>
      <!-- delete button -->
      <div style="padding:0.4rem 0.85rem 0.65rem">
        <button
          data-delete-id="${props.id}"
          style="width:100%;padding:5px 0;background:#F8717118;border:1px solid #F8717144;border-radius:6px;color:#F87171;font-size:0.75rem;font-weight:600;cursor:pointer"
        >🗑 Xóa điểm này</button>
      </div>
    </div>
  `;
}

// ─── Camera icons via canvas ImageData (synchronous, no fetch needed) ────────

const CAM_ICONS = {
  cam1:  { color: "#38BDF8" },
  cam2:  { color: "#FBBF24" },
  cam22: { color: "#FBBF24" },
  cam21: { color: "#FB923C" },
  cam23: { color: "#FB923C" },
};

function makeCamImageData(color, size = 28) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const h = size;

  // Direction arrow (pointing north/up)
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(h * 0.5, 1);
  ctx.lineTo(h * 0.82, h * 0.42);
  ctx.lineTo(h * 0.18, h * 0.42);
  ctx.closePath();
  ctx.fill();

  // Camera body
  ctx.fillRect(h * 0.22, h * 0.42, h * 0.56, h * 0.42);

  // White lens
  ctx.fillStyle = "white";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(h * 0.5, h * 0.65, h * 0.1, 0, Math.PI * 2);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function loadCamIcons(map) {
  for (const [type, { color }] of Object.entries(CAM_ICONS)) {
    try {
      const img = makeCamImageData(color);
      map.addImage(`cam-icon-${type}`, { width: img.width, height: img.height, data: img.data });
    } catch (e) {
      // icon won't show but map still works
    }
  }
}

// ─── Main map inner ───────────────────────────────────────────────────────────

function MapViewInner() {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const popupRef     = useRef(null);
  const [mapReady, setMapReady] = useState(false); // true after map "load" fires

  const area          = useScanStore((s) => s.area);
  const points        = useScanStore((s) => s.points);
  const roads         = useScanStore((s) => s.roads);
  const cameras       = useScanStore((s) => s.cameras);
  const showCameras   = useScanStore((s) => s.showCameras);
  const bbox          = useScanStore((s) => s.bbox);
  const filter        = useScanStore((s) => s.filter);
  const selectedPoint = useScanStore((s) => s.selectedPoint);
  const boundary      = useScanStore((s) => s.boundary);
  const setArea       = useScanStore((s) => s.setArea);
  const addPoint      = useScanStore((s) => s.addPoint);
  const removePoint   = useScanStore((s) => s.removePoint);
  const [ctxMenu, setCtxMenu]         = useState(null); // { x, y, lat, lng }
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }

  // ── Popup delete button handler (delegate via document) ─────────────────────
  useEffect(() => {
    const handler = (e) => {
      const btn = e.target.closest("[data-delete-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-delete-id");
      const pt = useScanStore.getState().points.find(p => p.id === id);
      if (pt) setConfirmDelete({ id: pt.id, name: pt.name });
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── 1. Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
            maxzoom: 19,
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm-tiles" }],
      },
      center: [area.lng, area.lat],
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-right");

    map.on("load", () => {
      // Load camera icons (synchronous canvas draw)
      loadCamIcons(map);

      // ── Radius circle ──────────────────────────────────────────────────────
      map.addSource("radius", { type: "geojson", data: circleGeoJSON(area.lat, area.lng, area.radiusM) });
      map.addLayer({ id: "radius-fill", type: "fill",   source: "radius", paint: { "fill-color": "#38BDF8", "fill-opacity": 0.12 } });
      map.addLayer({ id: "radius-line", type: "line",   source: "radius", paint: { "line-color": "#38BDF8", "line-width": 2.5, "line-opacity": 0.9 } });

      // ── Boundary polygon (hành chính) ──────────────────────────────────────
      map.addSource("boundary", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "boundary-fill", type: "fill", source: "boundary", paint: { "fill-color": "#A78BFA", "fill-opacity": 0.12 } });
      map.addLayer({ id: "boundary-line", type: "line", source: "boundary", paint: { "line-color": "#A78BFA", "line-width": 2.5, "line-dasharray": [1, 0] } });

      // ── Roads ──────────────────────────────────────────────────────────────
      map.addSource("roads", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "road-layer", type: "line", source: "roads", paint: { "line-color": "#94a3b8", "line-width": 1, "line-opacity": 0.45 } });

      // ── Points ─────────────────────────────────────────────────────────────
      map.addSource("points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      // Shadow (halo under each point)
      map.addLayer({
        id: "points-halo",
        type: "circle",
        source: "points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 9, 16, 18],
          "circle-opacity": 0.22,
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "points-circle",
        type: "circle",
        source: "points",
        paint: {
          "circle-color": ["get", "color"],
          // Intersection markers sized by roadClass; others match POI size
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10,
            ["case",
              ["==", ["get", "category"], "intersection"],
              ["step", ["coalesce", ["get", "roadClass"], 0], 2, 1, 3, 2, 4, 3, 6, 4, 7, 5, 9],
              4
            ],
            16,
            ["case",
              ["==", ["get", "category"], "intersection"],
              ["step", ["coalesce", ["get", "roadClass"], 0], 4, 1, 6, 2, 8, 3, 12, 4, 15, 5, 18],
              10
            ],
          ],
          "circle-opacity": 0.95,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Highlight ring for selected point
      map.addLayer({
        id: "points-selected",
        type: "circle",
        source: "points",
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 11, 16, 20],
          "circle-color": "transparent",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#FACC15",
        },
      });

      map.addLayer({
        id: "points-label",
        type: "symbol",
        source: "points",
        minzoom: 14,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#f1f5f9",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.5,
        },
      });

      // ── Camera placement layer ─────────────────────────────────────────────
      map.addSource("cameras", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cameras-symbol",
        type: "symbol",
        source: "cameras",
        layout: {
          "icon-image": ["concat", "cam-icon-", ["get", "type"]],
          "icon-size": 0.85,
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Click popup
      map.on("click", "points-circle", (e) => {
        const props = e.features[0].properties;
        const cat = CATEGORIES[props.category];
        const distFmt = props.distanceM >= 1000
          ? `${(props.distanceM / 1000).toFixed(2)} km`
          : `${props.distanceM} m`;
        new maplibregl.Popup({ offset: 12, className: "cam-popup" })
          .setLngLat(e.lngLat)
          .setHTML(buildPopupHTML({ props, cat, distFmt }))
          .addTo(map);
      });
      map.on("mouseenter", "points-circle", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "points-circle", () => { map.getCanvas().style.cursor = ""; });

      // ── Draggable center marker ────────────────────────────────────────────
      const el = Object.assign(document.createElement("div"), { title: "Kéo để đổi tâm" });
      Object.assign(el.style, {
        width: "20px", height: "20px",
        border: "3px solid #38BDF8", borderRadius: "50%",
        background: "rgba(56,189,248,0.25)", cursor: "grab",
        boxShadow: "0 0 0 4px rgba(56,189,248,0.18)",
      });

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([area.lng, area.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        setArea({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
      });

      markerRef.current = marker;

      // Right-click context menu
      map.on("contextmenu", (e) => {
        e.preventDefault?.();
        const { x, y } = e.point;
        const rect = map.getCanvas().getBoundingClientRect();
        setCtxMenu({ x: rect.left + x, y: rect.top + y, lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // Signal React that map is ready — this triggers all data-sync effects
      setMapReady(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Sync radius circle + marker position when area changes ──────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    map.getSource("radius")?.setData(circleGeoJSON(area.lat, area.lng, area.radiusM));

    if (markerRef.current) {
      markerRef.current.setLngLat([area.lng, area.lat]);
    }
  }, [mapReady, area.lat, area.lng, area.radiusM]);

  // ── 2b. Sync boundary polygon — show polygon, hide radius circle ──────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (boundary?.geometry) {
      // Show polygon
      map.getSource("boundary")?.setData(boundary);
      map.setLayoutProperty("boundary-fill", "visibility", "visible");
      map.setLayoutProperty("boundary-line", "visibility", "visible");
      // Hide radius (polygon is the authoritative boundary)
      map.setLayoutProperty("radius-fill", "visibility", "none");
      map.setLayoutProperty("radius-line", "visibility", "none");
      // Fly to boundary
      const coords = boundary.geometry.type === "Polygon"
        ? boundary.geometry.coordinates[0]
        : boundary.geometry.coordinates[0][0];
      const lngs = coords.map(([lng]) => lng);
      const lats = coords.map(([, lat]) => lat);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 60, maxZoom: 16, duration: 700 }
      );
    } else {
      // Clear polygon, show radius again
      map.getSource("boundary")?.setData({ type: "FeatureCollection", features: [] });
      map.setLayoutProperty("boundary-fill", "visibility", "none");
      map.setLayoutProperty("boundary-line", "visibility", "none");
      map.setLayoutProperty("radius-fill", "visibility", "visible");
      map.setLayoutProperty("radius-line", "visibility", "visible");
    }
  }, [mapReady, boundary]);

  // ── 3. Update roads ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const fc = {
      type: "FeatureCollection",
      features: roads.map((r) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: r.geometry },
        properties: { highway: r.highway },
      })),
    };
    mapRef.current.getSource("roads")?.setData(fc);
  }, [mapReady, roads]);

  // ── 4. Update points ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const fc = {
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          category: p.category,
          name: p.name,
          distanceM: p.distanceM,
          score: p.score ?? 0,
          color: CATEGORIES[p.category]?.color || "#888888",
          roadClass: p.roadClass ?? null,
          lat: p.lat,
          lon: p.lng,
        },
      })),
    };
    mapRef.current.getSource("points")?.setData(fc);
  }, [mapReady, points]);

  // ── 4b. Update cameras ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const fc = {
      type: "FeatureCollection",
      features: cameras.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: { type: c.type, bearing: c.bearing },
      })),
    };
    mapRef.current.getSource("cameras")?.setData(fc);
  }, [mapReady, cameras]);

  // ── 4c. Toggle camera visibility ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setLayoutProperty("cameras-symbol", "visibility", showCameras ? "visible" : "none");
  }, [mapReady, showCameras]);

  // ── 5. Update filter opacity ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const opacity = filter
      ? ["case", ["==", ["get", "category"], filter], 0.95, 0.1]
      : 0.95;
    map.setPaintProperty("points-circle", "circle-opacity", opacity);
    map.setPaintProperty("points-halo",   "circle-opacity", filter ? ["case", ["==", ["get", "category"], filter], 0.22, 0.03] : 0.22);
    map.setPaintProperty("points-label",  "text-opacity",   filter ? ["case", ["==", ["get", "category"], filter], 1, 0.1] : 1);
  }, [mapReady, filter]);

  // ── 6. Highlight selected point ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    if (!selectedPoint) {
      map.setFilter("points-selected", ["==", ["get", "id"], "__none__"]);
      return;
    }

    map.setFilter("points-selected", ["==", ["get", "id"], selectedPoint.id]);
    map.flyTo({ center: [selectedPoint.lng, selectedPoint.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });

    const cat = CATEGORIES[selectedPoint.category];
    const distFmt = selectedPoint.distanceM >= 1000
      ? `${(selectedPoint.distanceM / 1000).toFixed(2)} km`
      : `${selectedPoint.distanceM} m`;
    popupRef.current = new maplibregl.Popup({ offset: 14, closeButton: true, className: "cam-popup" })
      .setLngLat([selectedPoint.lng, selectedPoint.lat])
      .setHTML(buildPopupHTML({ props: { ...selectedPoint, lat: selectedPoint.lat, lon: selectedPoint.lng }, cat, distFmt, score: selectedPoint.score }))
      .addTo(map);
  }, [mapReady, selectedPoint]);

  // ── 7. Fit bbox after scan ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !bbox) return;
    mapRef.current.fitBounds(
      [[bbox[1], bbox[0]], [bbox[3], bbox[2]]],
      { padding: 60, maxZoom: 16, duration: 800 }
    );
  }, [mapReady, bbox]);

  // ── Return to area ───────────────────────────────────────────────────────────
  const handleReturn = () => {
    if (!mapRef.current) return;
    const zoom = area.radiusM <= 500 ? 15 : area.radiusM <= 2000 ? 14 : area.radiusM <= 5000 ? 13 : 12;
    mapRef.current.flyTo({ center: [area.lng, area.lat], zoom, duration: 700 });
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <ReturnBtn onClick={handleReturn} />
      {confirmDelete && (
        <ConfirmDialog
          title="Xóa địa điểm"
          message={<>Xóa <strong style={{ color: "#e2e8f0" }}>{confirmDelete.name}</strong> khỏi kết quả?</>}
          confirmLabel="Xóa"
          onConfirm={() => {
            removePoint(confirmDelete.id);
            if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {ctxMenu && (
        <MapContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          lat={ctxMenu.lat} lng={ctxMenu.lng}
          onClose={() => setCtxMenu(null)}
          onMoveCenter={(lat, lng) => {
            setArea({ lat, lng });
            if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
          }}
          onAddPoint={(pt) => {
            const dist = (p, a) => {
              const dLat = (p.lat - a.lat) * 111_320;
              const dLng = (p.lng - a.lng) * 111_320 * Math.cos(a.lat * Math.PI / 180);
              return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
            };
            addPoint({ ...pt, distanceM: dist(pt, area) });
          }}
        />
      )}
    </div>
  );
}

export default function MapView() {
  return (
    <MapErrorBoundary>
      <MapViewInner />
    </MapErrorBoundary>
  );
}
