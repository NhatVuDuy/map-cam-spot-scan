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

// ─── Block type helpers ───────────────────────────────────────────────────────

const BLOCK_META = {
  quad_signal:    { label: "CAM2.2 — Ngã4 + đèn",       color: "#FBBF24" },
  quad_nosignal:  { label: "CAM2.3 — Ngã4 không đèn",    color: "#FB923C" },
  tri_signal:     { label: "CAM2 — Ngã3 + đèn",          color: "#FBBF24" },
  tri_nosignal:   { label: "CAM2.1 — Ngã3 không đèn",    color: "#FB923C" },
  alley:          { label: "CAM Hẻm",                     color: "#34D399" },
  minor:          { label: "Không có cam",                color: "#94a3b8" },
};

function blockKey(shape, hasSignal) {
  if (shape === "quad")  return hasSignal ? "quad_signal"  : "quad_nosignal";
  if (shape === "tri")   return hasSignal ? "tri_signal"   : "tri_nosignal";
  if (shape === "alley") return "alley";
  return "minor";
}

// ─── Intersection popup HTML ──────────────────────────────────────────────────

function buildIntersectionPopupHTML({ props, distFmt }) {
  const shape     = props.intersectionShape || "minor";
  const hasSignal = props.hasSignal === true || props.hasSignal === "true";
  const bk        = BLOCK_META[blockKey(shape, hasSignal)];

  return `
    <div style="min-width:220px;font-family:system-ui,sans-serif">
      <div style="padding:0.65rem 0.85rem 0.5rem;border-bottom:1px solid #1e3354">
        <div style="font-size:0.88rem;font-weight:700;color:#f1f5f9;margin-bottom:0.3rem">${props.name || "Giao lộ"}</div>
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          <span style="font-size:0.7rem;padding:2px 8px;border-radius:100px;background:${bk.color}20;border:1px solid ${bk.color}44;color:${bk.color};font-weight:600">${bk.label}</span>
          ${hasSignal ? `<span style="font-size:0.7rem;padding:2px 8px;border-radius:100px;background:#FBBF2420;border:1px solid #FBBF2444;color:#FBBF24">🚦 Đèn</span>` : ""}
        </div>
      </div>
      <div style="padding:0.55rem 0.85rem;display:flex;flex-direction:column;gap:0.35rem">
        <div style="display:flex;justify-content:space-between;font-size:0.78rem">
          <span style="color:#64748b">Cách tâm quét</span>
          <strong style="color:#38BDF8">${distFmt}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.78rem">
          <span style="color:#64748b">Cấp đường</span>
          <span style="color:#94a3b8">${props.roadClass ?? "—"}</span>
        </div>
        <div style="font-size:0.7rem;color:#64748b;margin-top:0.15rem">Loại giao lộ</div>
        <select data-ix-shape="${props.id}"
          style="width:100%;padding:4px 6px;background:#0f1f35;border:1px solid #1e3354;border-radius:5px;color:#e2e8f0;font-size:0.75rem;cursor:pointer">
          <option value="quad"  ${shape === "quad"  ? "selected" : ""}>■ Ngã tư đường lớn</option>
          <option value="tri"   ${shape === "tri"   ? "selected" : ""}>▲ Ngã ba đường lớn</option>
          <option value="alley" ${shape === "alley" ? "selected" : ""}>▬ Đầu hẻm</option>
          <option value="minor" ${shape === "minor" ? "selected" : ""}>· Giao cắt nhỏ</option>
        </select>
        ${shape !== "alley" && shape !== "minor" ? `
        <button data-ix-signal="${props.id}" data-ix-signal-cur="${hasSignal}"
          style="width:100%;padding:5px 0;margin-top:2px;background:${hasSignal ? "#FBBF2418" : "#1e3354"};border:1px solid ${hasSignal ? "#FBBF2444" : "#334155"};border-radius:6px;color:${hasSignal ? "#FBBF24" : "#94a3b8"};font-size:0.75rem;font-weight:600;cursor:pointer">
          ${hasSignal ? "🚦 Có đèn — Bấm để tắt" : "⭕ Không đèn — Bấm để bật"}
        </button>` : ""}
      </div>
      <div style="padding:0.4rem 0.85rem 0.65rem">
        <button data-delete-id="${props.id}"
          style="width:100%;padding:5px 0;background:#F8717118;border:1px solid #F8717144;border-radius:6px;color:#F87171;font-size:0.75rem;font-weight:600;cursor:pointer">
          🗑 Xóa điểm này
        </button>
      </div>
    </div>
  `;
}

// ─── Regular POI popup HTML ───────────────────────────────────────────────────

function buildPopupHTML({ props, cat, distFmt, score }) {
  const lat   = props.lat  != null ? Number(props.lat).toFixed(6) : "—";
  const lon   = props.lon  != null ? Number(props.lon).toFixed(6)
              : props.lng  != null ? Number(props.lng).toFixed(6) : "—";
  const name  = props.name || props.id || "—";
  const color = cat?.color || "#94a3b8";
  const label = cat?.label || props.category || "—";

  return `
    <div style="min-width:200px;font-family:system-ui,sans-serif">
      <div style="padding:0.65rem 0.85rem 0.5rem;border-bottom:1px solid #1e3354">
        <div style="font-size:0.88rem;font-weight:700;color:#f1f5f9;margin-bottom:0.25rem;line-height:1.3">${name}</div>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.7rem;padding:2px 8px;border-radius:100px;background:${color}20;border:1px solid ${color}44;color:${color};font-weight:600">
          <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block"></span>
          ${label}
        </span>
      </div>
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
      <div style="padding:0.4rem 0.85rem 0.65rem">
        <button data-delete-id="${props.id}"
          style="width:100%;padding:5px 0;background:#F8717118;border:1px solid #F8717144;border-radius:6px;color:#F87171;font-size:0.75rem;font-weight:600;cursor:pointer">
          🗑 Xóa điểm này
        </button>
      </div>
    </div>
  `;
}

// ─── Camera icons (canvas ImageData, synchronous) ────────────────────────────

const CAM_ICONS = {
  cam1:      { color: "#38BDF8" },
  cam2:      { color: "#FBBF24" },
  cam22:     { color: "#FBBF24" },
  cam21:     { color: "#FB923C" },
  cam23:     { color: "#FB923C" },
  cam_alley: { color: "#34D399" },
};

/**
 * Camera icon: square base at TOP (= viewing direction), pointed tip at BOTTOM (= inward).
 * When two cams are back-to-back (opposite bearings), their tips touch and square bases face out.
 */
function makeCamImageData(color, size = 28) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const s = size;

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;

  // Square body at top — this face = direction of view
  ctx.fillRect(s * 0.16, 1, s * 0.68, s * 0.56);

  // White lens in the body
  ctx.fillStyle = "white";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.28, s * 0.10, 0, Math.PI * 2);
  ctx.fill();

  // Pointed tip at bottom — tips of back-to-back cams touch each other
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.moveTo(s * 0.16, s * 0.56);
  ctx.lineTo(s * 0.84, s * 0.56);
  ctx.lineTo(s * 0.50, s - 1);
  ctx.closePath();
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

function loadCamIcons(map) {
  for (const [type, { color }] of Object.entries(CAM_ICONS)) {
    try {
      const img = makeCamImageData(color);
      map.addImage(`cam-icon-${type}`, { width: img.width, height: img.height, data: img.data });
    } catch {
      // icon won't show but map still works
    }
  }
}

// ─── Intersection shape icons ─────────────────────────────────────────────────

const IX_COLOR = "#FF6B6B"; // intersection category colour

/**
 * Draw a shape icon for an intersection type.
 * shape: "quad" (square) | "tri" (triangle) | "alley" (tall rect) | "minor" (small dot)
 */
function makeIxImageData(shape, size = 40) {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const s = size;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, s * 0.045);

  if (shape === "quad") {
    // Filled square
    const pad = s * 0.12;
    ctx.fillStyle = `${IX_COLOR}cc`;
    ctx.fillRect(pad, pad, s - 2 * pad, s - 2 * pad);
    ctx.strokeRect(pad, pad, s - 2 * pad, s - 2 * pad);

  } else if (shape === "tri") {
    // Equilateral triangle pointing up
    ctx.fillStyle = `${IX_COLOR}cc`;
    ctx.beginPath();
    ctx.moveTo(s * 0.50, s * 0.06);
    ctx.lineTo(s * 0.94, s * 0.92);
    ctx.lineTo(s * 0.06, s * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

  } else if (shape === "alley") {
    // Rectangle drawn in the TOP HALF of the canvas only.
    // The canvas centre (y = s/2) acts as the anchor — placed at the intersection node.
    // After icon-rotate(alleyBearing), the top of the canvas points into the alley,
    // so one edge of the rectangle sits exactly at the intersection and the other
    // extends into the alley.
    const w = s * 0.32;
    const h = s * 0.46;          // fills top half with a small gap
    const x = (s - w) / 2;
    const y = s * 0.02;          // top edge near top of canvas
    ctx.fillStyle = `${IX_COLOR}cc`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    // Arrowhead at top (into alley)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(s * 0.50, y);
    ctx.lineTo(s * 0.50 - 5, y + 9);
    ctx.lineTo(s * 0.50 + 5, y + 9);
    ctx.closePath();
    ctx.fill();

  } else {
    // "minor" — small hollow circle
    ctx.strokeStyle = `${IX_COLOR}88`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}

function loadIxIcons(map) {
  for (const shape of ["quad", "tri", "alley", "minor"]) {
    try {
      const img = makeIxImageData(shape);
      map.addImage(`ix-${shape}`, { width: img.width, height: img.height, data: img.data });
    } catch {
      // non-fatal
    }
  }
}

// ─── Main map inner ───────────────────────────────────────────────────────────

function MapViewInner() {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markerRef     = useRef(null);
  const popupRef      = useRef(null);  // active popup (POI or intersection)
  const activeIxRef   = useRef(null);  // { id, lngLat } of open intersection popup
  const [mapReady, setMapReady] = useState(false);

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

  const [ctxMenu, setCtxMenu]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Document event delegation (delete / intersection controls) ───────────────
  useEffect(() => {
    const onClick = (e) => {
      // Delete button (POI or intersection)
      const deleteBtn = e.target.closest("[data-delete-id]");
      if (deleteBtn) {
        const id = deleteBtn.getAttribute("data-delete-id");
        const pt = useScanStore.getState().points.find(p => p.id === id);
        if (pt) setConfirmDelete({ id: pt.id, name: pt.name });
        return;
      }

      // Signal toggle button
      const sigBtn = e.target.closest("[data-ix-signal]");
      if (sigBtn) {
        const id  = sigBtn.getAttribute("data-ix-signal");
        const cur = sigBtn.getAttribute("data-ix-signal-cur") === "true";
        useScanStore.getState().setIntersectionOverride(id, { hasSignal: !cur });
        // Popup will refresh via the points useEffect below
      }
    };

    const onChange = (e) => {
      // Intersection shape selector
      const select = e.target.closest("[data-ix-shape]");
      if (!select) return;
      const id = select.getAttribute("data-ix-shape");
      useScanStore.getState().setIntersectionOverride(id, { intersectionShape: select.value });
    };

    document.addEventListener("click",  onClick);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("click",  onClick);
      document.removeEventListener("change", onChange);
    };
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
      // Load all icons synchronously (canvas → ImageData — no async fetch)
      loadCamIcons(map);
      loadIxIcons(map);

      // ── Radius circle ──────────────────────────────────────────────────────
      map.addSource("radius", { type: "geojson", data: circleGeoJSON(area.lat, area.lng, area.radiusM) });
      map.addLayer({ id: "radius-fill", type: "fill",   source: "radius", paint: { "fill-color": "#38BDF8", "fill-opacity": 0.12 } });
      map.addLayer({ id: "radius-line", type: "line",   source: "radius", paint: { "line-color": "#38BDF8", "line-width": 2.5, "line-opacity": 0.9 } });

      // ── Boundary polygon ───────────────────────────────────────────────────
      map.addSource("boundary", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "boundary-fill", type: "fill", source: "boundary", paint: { "fill-color": "#A78BFA", "fill-opacity": 0.12 } });
      map.addLayer({ id: "boundary-line", type: "line", source: "boundary", paint: { "line-color": "#A78BFA", "line-width": 2.5 } });

      // ── Roads ──────────────────────────────────────────────────────────────
      map.addSource("roads", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "road-layer", type: "line", source: "roads", paint: { "line-color": "#94a3b8", "line-width": 1, "line-opacity": 0.45 } });

      // ── Points (POIs only, intersections excluded) ─────────────────────────
      map.addSource("points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      const poiFilter = ["!=", ["get", "category"], "intersection"];

      map.addLayer({
        id: "points-halo",
        type: "circle",
        source: "points",
        filter: poiFilter,
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
        filter: poiFilter,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 10],
          "circle-opacity": 0.95,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

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
        filter: poiFilter,
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

      // ── Intersection shape icons (quad / tri / alley only — minor uses circles) ──
      const ixFilter        = ["==", ["get", "category"], "intersection"];
      const ixShapeFilter   = ["all", ixFilter, ["!=", ["coalesce", ["get", "intersectionShape"], "minor"], "minor"]];
      const ixMinorFilter   = ["all", ixFilter, ["==", ["coalesce", ["get", "intersectionShape"], "minor"], "minor"]];

      // Minor intersections: filled circles (same style as before)
      map.addLayer({
        id: "intersections-minor",
        type: "circle",
        source: "points",
        filter: ixMinorFilter,
        paint: {
          "circle-color": "#FF6B6B",
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            10, ["step", ["coalesce", ["get", "roadClass"], 0], 2, 1, 3, 2, 4, 3, 6, 4, 7, 5, 9],
            16, ["step", ["coalesce", ["get", "roadClass"], 0], 4, 1, 6, 2, 8, 3, 12, 4, 15, 5, 18],
          ],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "intersections-symbol",
        type: "symbol",
        source: "points",
        filter: ixShapeFilter,
        layout: {
          "icon-image": ["concat", "ix-", ["coalesce", ["get", "intersectionShape"], "minor"]],
          // Size by road class
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            10,
            ["step", ["coalesce", ["get", "roadClass"], 0], 0.35, 1, 0.45, 2, 0.55, 3, 0.65, 4, 0.75, 5, 0.85],
            16,
            ["step", ["coalesce", ["get", "roadClass"], 0], 0.55, 1, 0.70, 2, 0.85, 3, 1.00, 4, 1.15, 5, 1.30],
          ],
          // Rotate alley rectangle toward the alley arm
          "icon-rotate": [
            "case",
            ["==", ["coalesce", ["get", "intersectionShape"], ""], "alley"],
            ["coalesce", ["get", "alleyBearing"], 0],
            0,
          ],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Traffic signal dot: yellow filled circle (only on quad/tri with signal)
      map.addLayer({
        id: "intersections-signal",
        type: "circle",
        source: "points",
        filter: ["all", ixShapeFilter, ["==", ["get", "hasSignal"], true]],
        paint: {
          "circle-color": "#FBBF24",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 6],
          "circle-opacity": 1,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0d1829",
        },
      });

      // Label for intersections (shown at higher zoom)
      map.addLayer({
        id: "intersections-label",
        type: "symbol",
        source: "points",
        filter: ixFilter,
        minzoom: 15,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#FF6B6B",
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

      // ── Click: intersection icons (both shape symbols and minor circles) ────
      const openIxPopup = (props, lngLat) => {
        const distFmt = props.distanceM >= 1000
          ? `${(props.distanceM / 1000).toFixed(2)} km`
          : `${props.distanceM} m`;
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        activeIxRef.current = { id: props.id, lngLat };
        popupRef.current = new maplibregl.Popup({ offset: 12, className: "cam-popup", maxWidth: "260px" })
          .setLngLat(lngLat)
          .setHTML(buildIntersectionPopupHTML({ props, distFmt }))
          .addTo(map);
        popupRef.current.on("close", () => { popupRef.current = null; activeIxRef.current = null; });
      };

      // Reuse same handler for both symbol and circle layers
      map.on("click", "intersections-symbol", (e) => openIxPopup(e.features[0].properties, e.lngLat));
      map.on("click", "intersections-minor",  (e) => openIxPopup(e.features[0].properties, e.lngLat));
      map.on("mouseenter", "intersections-minor",  () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "intersections-minor",  () => { map.getCanvas().style.cursor = ""; });

      // ── Click: POI circle ──────────────────────────────────────────────────
      map.on("click", "points-circle", (e) => {
        const props   = e.features[0].properties;
        const cat     = CATEGORIES[props.category];
        const distFmt = props.distanceM >= 1000
          ? `${(props.distanceM / 1000).toFixed(2)} km`
          : `${props.distanceM} m`;
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        activeIxRef.current = null;
        popupRef.current = new maplibregl.Popup({ offset: 12, className: "cam-popup" })
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

      map.on("contextmenu", (e) => {
        e.preventDefault?.();
        const { x, y } = e.point;
        const rect = map.getCanvas().getBoundingClientRect();
        setCtxMenu({ x: rect.left + x, y: rect.top + y, lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      setMapReady(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Sync radius circle + marker ──────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.getSource("radius")?.setData(circleGeoJSON(area.lat, area.lng, area.radiusM));
    if (markerRef.current) markerRef.current.setLngLat([area.lng, area.lat]);
  }, [mapReady, area.lat, area.lng, area.radiusM]);

  // ── 2b. Sync boundary polygon ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (boundary?.geometry) {
      map.getSource("boundary")?.setData(boundary);
      map.setLayoutProperty("boundary-fill", "visibility", "visible");
      map.setLayoutProperty("boundary-line", "visibility", "visible");
      map.setLayoutProperty("radius-fill",   "visibility", "none");
      map.setLayoutProperty("radius-line",   "visibility", "none");
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
      map.getSource("boundary")?.setData({ type: "FeatureCollection", features: [] });
      map.setLayoutProperty("boundary-fill", "visibility", "none");
      map.setLayoutProperty("boundary-line", "visibility", "none");
      map.setLayoutProperty("radius-fill",   "visibility", "visible");
      map.setLayoutProperty("radius-line",   "visibility", "visible");
    }
  }, [mapReady, boundary]);

  // ── 3. Update roads ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.getSource("roads")?.setData({
      type: "FeatureCollection",
      features: roads.map((r) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: r.geometry },
        properties: { highway: r.highway },
      })),
    });
  }, [mapReady, roads]);

  // ── 4. Update points (POIs + intersections in one source) ───────────────────
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
          // Intersection-specific
          intersectionShape: p.intersectionShape ?? null,
          alleyBearing:      p.alleyBearing ?? 0,
          hasSignal:         p.hasSignal === true,
          lat: p.lat,
          lon: p.lng,
        },
      })),
    };
    mapRef.current.getSource("points")?.setData(fc);

    // Refresh intersection popup if one is open (user changed shape/signal)
    if (activeIxRef.current && popupRef.current) {
      const { id } = activeIxRef.current;
      const pt = points.find(p => p.id === id);
      if (pt) {
        const distFmt = pt.distanceM >= 1000
          ? `${(pt.distanceM / 1000).toFixed(2)} km`
          : `${pt.distanceM} m`;
        popupRef.current.setHTML(buildIntersectionPopupHTML({
          props: { ...pt, lat: pt.lat, lon: pt.lng },
          distFmt,
        }));
      }
    }
  }, [mapReady, points]);

  // ── 4b. Update cameras ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.getSource("cameras")?.setData({
      type: "FeatureCollection",
      features: cameras.map((c) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: { type: c.type, bearing: c.bearing },
      })),
    });
  }, [mapReady, cameras]);

  // ── 4c. Toggle camera visibility ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setLayoutProperty("cameras-symbol", "visibility", showCameras ? "visible" : "none");
  }, [mapReady, showCameras]);

  // ── 5. Update filter opacity ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const poiOpacity = filter
      ? ["case", ["==", ["get", "category"], filter], 0.95, 0.1]
      : 0.95;
    const ixOpacity = filter === "intersection" ? 1 : (filter ? 0.15 : 1);
    map.setPaintProperty("points-circle",       "circle-opacity", poiOpacity);
    map.setPaintProperty("points-halo",         "circle-opacity", filter ? ["case", ["==", ["get", "category"], filter], 0.22, 0.03] : 0.22);
    map.setPaintProperty("points-label",        "text-opacity",   filter ? ["case", ["==", ["get", "category"], filter], 1, 0.1] : 1);
    map.setPaintProperty("intersections-signal", "circle-opacity", ixOpacity);
    map.setPaintProperty("intersections-minor",  "circle-opacity", ixOpacity);
    map.setLayoutProperty("intersections-symbol", "visibility", ixOpacity > 0 ? "visible" : "none");
  }, [mapReady, filter]);

  // ── 6. Highlight selected point ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (popupRef.current && !activeIxRef.current) {
      popupRef.current.remove(); popupRef.current = null;
    }

    if (!selectedPoint) {
      map.setFilter("points-selected", ["==", ["get", "id"], "__none__"]);
      return;
    }

    map.setFilter("points-selected", ["==", ["get", "id"], selectedPoint.id]);
    map.flyTo({ center: [selectedPoint.lng, selectedPoint.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });

    if (selectedPoint.category !== "intersection") {
      const cat     = CATEGORIES[selectedPoint.category];
      const distFmt = selectedPoint.distanceM >= 1000
        ? `${(selectedPoint.distanceM / 1000).toFixed(2)} km`
        : `${selectedPoint.distanceM} m`;
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      activeIxRef.current = null;
      popupRef.current = new maplibregl.Popup({ offset: 14, closeButton: true, className: "cam-popup" })
        .setLngLat([selectedPoint.lng, selectedPoint.lat])
        .setHTML(buildPopupHTML({ props: { ...selectedPoint, lat: selectedPoint.lat, lon: selectedPoint.lng }, cat, distFmt, score: selectedPoint.score }))
        .addTo(map);
    }
  }, [mapReady, selectedPoint]);

  // ── 7. Fit bbox after scan ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !bbox) return;
    mapRef.current.fitBounds(
      [[bbox[1], bbox[0]], [bbox[3], bbox[2]]],
      { padding: 60, maxZoom: 16, duration: 800 }
    );
  }, [mapReady, bbox]);

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
            activeIxRef.current = null;
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
