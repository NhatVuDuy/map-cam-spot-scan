import React, { useEffect, useRef, useState, Component } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";
import { BLOCKS, SQUARE_BLOCKS, CIRCLE_BLOCKS } from "../../config/blocks.js";
import { circleGeoJSON } from "../../utils/geo.js";
import { bearingBetween } from "../../utils/bearing.js";
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

// ─── Block picker HTML (for popups — mirrors BlockPicker in MapContextMenu) ──

const PICKER_GROUPS = [
  { label: "Giao lộ & Đường",       keys: ["B01","B02","B03","B04","B05","B06","B07","B07-S"] },
  { label: "Địa điểm & Công trình", keys: ["B08","B09","B10","B11","B12","B13"] },
];

function buildBlockPickerHTML(pointId, currentBlockId) {
  let html = `<div data-block-picker-for="${pointId}" style="max-height:130px;overflow-y:auto;border:1px solid #1e3354;border-radius:5px;font-size:0.68rem;">`;
  for (const g of PICKER_GROUPS) {
    html += `<div style="padding:2px 8px;background:#060d1a;color:#475569;font-size:0.57rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #1e3354;position:sticky;top:0;">${g.label}</div>`;
    for (const k of g.keys) {
      const b = BLOCKS[k];
      if (!b) continue;
      const active = k === currentBlockId;
      const shape = b.shape === "square" ? "■" : "●";
      html += `<div data-pick-block="${k}" style="display:flex;align-items:center;gap:5px;padding:3px 8px;cursor:pointer;background:${active ? b.color + "20" : "transparent"};border-left:2px solid ${active ? b.color : "transparent"};">
        <span style="color:${b.color};font-size:0.62rem;flex-shrink:0">${shape}</span>
        <span style="color:${b.color};font-weight:700;font-size:0.6rem;flex-shrink:0;min-width:28px">${k}</span>
        <span style="color:${active ? "#e2e8f0" : "#64748b"};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.name}</span>
      </div>`;
    }
  }
  html += `</div>`;
  return html;
}

// ─── Intersection popup HTML ──────────────────────────────────────────────────

function buildIntersectionPopupHTML({ props, distFmt }) {
  const blockId   = props.blockId || "B03";
  const block     = BLOCKS[blockId] || {};
  const color     = block.color || "#94a3b8";
  const blockName = block.name || "Giao lộ";
  const shape     = block.shape === "square" ? "■" : "●";

  return `
    <div style="min-width:220px;font-family:system-ui,sans-serif">
      <div style="padding:0.65rem 0.85rem 0.5rem;border-bottom:1px solid #1e3354">
        <div style="font-size:0.88rem;font-weight:700;color:#f1f5f9;margin-bottom:0.3rem">${props.name || "Giao lộ"}</div>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.7rem;padding:2px 8px;border-radius:100px;background:${color}20;border:1px solid ${color}44;color:${color};font-weight:600">
          ${shape} <strong>${blockId}</strong> ${blockName}
        </span>
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
        <div style="display:flex;justify-content:space-between;font-size:0.78rem">
          <span style="color:#64748b">Lat / Lng</span>
          <code style="color:#94a3b8;font-size:0.72rem">${Number(props.lat||0).toFixed(6)}, ${Number(props.lon||props.lng||0).toFixed(6)}</code>
        </div>
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
  const lat     = props.lat  != null ? Number(props.lat).toFixed(6) : "—";
  const lon     = props.lon  != null ? Number(props.lon).toFixed(6)
                : props.lng  != null ? Number(props.lng).toFixed(6) : "—";
  const name    = props.name || props.id || "—";
  const blockId = props.blockId;
  const block   = blockId ? BLOCKS[blockId] : null;
  const color   = block?.color || cat?.color || "#94a3b8";
  const shape   = block?.shape === "square" ? "■" : "●";
  const label   = block ? `${shape} ${blockId} ${block.name}` : (cat?.label || props.category || "—");

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
      <div style="padding:0.3rem 0.85rem 0rem">
        <button data-toggle-picker="${props.id}" style="width:100%;padding:4px 8px;background:#1e293b;border:1px solid #334155;border-radius:5px;color:#94a3b8;font-size:0.7rem;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
          <span>Đổi loại…</span><span style="font-size:0.6rem">▾</span>
        </button>
        <div id="picker-${props.id}" style="display:none;margin-top:4px">
          ${buildBlockPickerHTML(props.id, props.blockId || '')}
        </div>
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
      map.addImage(`cam-icon-${type}`, {
        width:  img.width,
        height: img.height,
        data:   new Uint8Array(img.data.buffer),
      });
    } catch (e) {
      console.error(`[loadCamIcons] failed for type "${type}":`, e);
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

  } else if (shape === "alley_minor") {
    // Small cross for minor alley intersections
    const lw = s * 0.14;
    ctx.fillStyle = `#74C0FCcc`;
    ctx.fillRect((s - lw) / 2, s * 0.1, lw, s * 0.8);
    ctx.fillRect(s * 0.1, (s - lw) / 2, s * 0.8, lw);

  } else if (shape === "alley") {
    // Rectangle drawn in the TOP HALF of the canvas only.
    // The canvas centre (y = s/2) acts as the anchor — placed at the intersection node.
    // After icon-rotate(alleyBearing), the top of the canvas points into the alley,
    // so one edge of the rectangle sits exactly at the intersection and the other
    // extends into the alley.
    const w = s * 0.46;          // wider than before so the icon reads at a glance
    const h = s * 0.48;          // fills top half with a small gap
    const x = (s - w) / 2;
    const y = s * 0.02;          // top edge near top of canvas
    ctx.fillStyle = `${IX_COLOR}cc`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    // Arrowhead at top (into alley)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(s * 0.50, y + 2);
    ctx.lineTo(s * 0.50 - 7, y + 12);
    ctx.lineTo(s * 0.50 + 7, y + 12);
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
  for (const shape of ["quad", "tri", "alley", "alley_minor", "minor"]) {
    try {
      const img = makeIxImageData(shape);
      // MapLibre expects Uint8Array; getImageData returns Uint8ClampedArray — convert.
      map.addImage(`ix-${shape}`, {
        width:  img.width,
        height: img.height,
        data:   new Uint8Array(img.data.buffer),
      });
    } catch (e) {
      console.error(`[loadIxIcons] failed for shape "${shape}":`, e);
    }
  }
}

function loadSquareIcons(map) {
  for (const blockId of SQUARE_BLOCKS) {
    const block = BLOCKS[blockId];
    if (!block) continue;
    try {
      const size = 22;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      // White border
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(1, 1, size - 2, size - 2, 3);
      ctx.fill();
      // Colored fill
      ctx.fillStyle = block.color;
      ctx.beginPath();
      ctx.roundRect(3, 3, size - 6, size - 6, 2);
      ctx.fill();
      const imgData = ctx.getImageData(0, 0, size, size);
      map.addImage(`sq-${blockId}`, { width: size, height: size, data: new Uint8Array(imgData.data.buffer) });
    } catch (e) {
      console.error(`[loadSquareIcons] failed for "${blockId}":`, e);
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
  const hiddenBlocks  = useScanStore((s) => s.hiddenBlocks);
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
  const aimingRef = useRef(null);     // { ixId, lat, lng } while user is picking a direction

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

      // Toggle block picker visibility
      const toggleBtn = e.target.closest("[data-toggle-picker]");
      if (toggleBtn) {
        const id = toggleBtn.getAttribute("data-toggle-picker");
        const picker = document.getElementById(`picker-${id}`);
        if (picker) {
          const open = picker.style.display !== "none";
          picker.style.display = open ? "none" : "block";
          const arrow = toggleBtn.querySelector("span:last-child");
          if (arrow) arrow.textContent = open ? "▾" : "▴";
        }
        return;
      }

      // Block picker item click
      const pickBtn = e.target.closest("[data-pick-block]");
      if (pickBtn) {
        const newBlockId = pickBtn.getAttribute("data-pick-block");
        const container  = pickBtn.closest("[data-block-picker-for]");
        const id = container?.getAttribute("data-block-picker-for");
        if (id) useScanStore.getState().updatePointBlock(id, newBlockId);
        return;
      }

      // Signal toggle button
      const sigBtn = e.target.closest("[data-ix-signal]");
      if (sigBtn) {
        const id  = sigBtn.getAttribute("data-ix-signal");
        const cur = sigBtn.getAttribute("data-ix-signal-cur") === "true";
        useScanStore.getState().setIntersectionOverride(id, { hasSignal: !cur });
        return;
      }

      // Aim button (alley) — enter aiming mode
      const aimBtn = e.target.closest("[data-ix-aim]");
      if (aimBtn) {
        const id = aimBtn.getAttribute("data-ix-aim");
        const ix = useScanStore.getState().points.find(p => p.id === id);
        if (!ix) return;
        aimingRef.current = { ixId: id, lat: ix.lat, lng: ix.lng };
        // Visual feedback: change cursor + show banner
        if (mapRef.current) mapRef.current.getCanvas().style.cursor = "crosshair";
        aimBtn.textContent = "✓ Đang đợi… click vào hẻm";
        aimBtn.style.background = "#34D39933";
        // Close popup so it doesn't block the click
        popupRef.current?.remove();
        popupRef.current = null;
      }
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
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

    map.on("load", () => { try {
      // Load all icons synchronously (canvas → ImageData — no async fetch)
      loadCamIcons(map);
      loadIxIcons(map);
      loadSquareIcons(map);

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

      const squareLiteral = ["literal", SQUARE_BLOCKS];
      const circleLiteral = ["literal", CIRCLE_BLOCKS];
      // Circle markers: B01–B07-S (intersections, alleys, etc.)
      const circlePoiFilter = ["in", ["get", "blockId"], circleLiteral];
      // Square markers: B08–B13 (places & infrastructure)
      const squarePoiFilter = ["in", ["get", "blockId"], squareLiteral];

      map.addLayer({
        id: "points-halo",
        type: "circle",
        source: "points",
        filter: circlePoiFilter,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 6, 16, 12],
          "circle-opacity": 0.22,
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "points-circle",
        type: "circle",
        source: "points",
        filter: circlePoiFilter,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.7, 16, 6.7],
          "circle-opacity": 0.95,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Square POI markers (B08–B13) — half size vs previous
      map.addLayer({
        id: "points-sq-halo",
        type: "symbol",
        source: "points",
        filter: squarePoiFilter,
        layout: {
          "icon-image": ["concat", "sq-", ["get", "blockId"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.55, 16, 1.0],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: { "icon-opacity": 0.3 },
      });

      map.addLayer({
        id: "points-sq",
        type: "symbol",
        source: "points",
        filter: squarePoiFilter,
        layout: {
          "icon-image": ["concat", "sq-", ["get", "blockId"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.38, 16, 0.7],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: { "icon-opacity": 1 },
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

      // Label: only show [Bxx] at very high zoom
      map.addLayer({
        id: "points-label",
        type: "symbol",
        source: "points",
        minzoom: 18,
        layout: {
          "text-field": ["case", ["has", "blockId"], ["concat", "[", ["get", "blockId"], "]"], ""],
          "text-size": 10,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#111111",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
          "text-halo-blur": 0,
          "text-opacity": 1,
        },
      });

      // ── Legacy intersection layers kept for reference (never match) ──────────
      // Old system used category="intersection" + intersectionShape="quad/tri/alley"
      // New system uses blockId (B01-B07-S) for all points — these layers are inert.

      // ── Camera placement layer ─────────────────────────────────────────────
      map.addSource("cameras", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cameras-symbol",
        type: "symbol",
        source: "cameras",
        layout: {
          "icon-image": ["concat", "cam-icon-", ["get", "type"]],
          "icon-size": 0.85,
          "icon-anchor": "bottom",      // tip (canvas bottom) = anchor = where back-to-back tips touch
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // points-selected covers all point types (circle and square alike)

      // Aim-mode interceptor (for alley bearing — kept for future use)
      map.on("click", (e) => {
        const aim = aimingRef.current;
        if (!aim) return;
        e.preventDefault?.();
        const bearing = bearingBetween(aim.lat, aim.lng, e.lngLat.lat, e.lngLat.lng);
        useScanStore.getState().setIntersectionOverride(aim.ixId, { alleyArmBearing: bearing });
        aimingRef.current = null;
        map.getCanvas().style.cursor = "";
      });

      // ── Click: POI circle ──────────────────────────────────────────────────
      const openPoiPopup = (e) => {
        if (aimingRef.current) return;
        const props   = e.features[0].properties;
        // Trigger list scroll
        const pt = useScanStore.getState().points.find(p => p.id === props.id);
        if (pt) useScanStore.getState().setSelectedPoint(pt);
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
      };
      map.on("click", "points-circle", openPoiPopup);
      map.on("click", "points-sq",     openPoiPopup);
      map.on("mouseenter", "points-circle", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "points-circle", () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "points-sq",     () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "points-sq",     () => { map.getCanvas().style.cursor = ""; });

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
    } catch (err) {
      console.error("[MapView] map.on('load') setup error:", err);
    }});

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
      // Re-sync radius data in case area changed (e.g. after loading a project)
      map.getSource("radius")?.setData(circleGeoJSON(area.lat, area.lng, area.radiusM));
    }
  }, [mapReady, boundary, area.lat, area.lng, area.radiusM]);

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
    const visiblePoints = hiddenBlocks.length > 0
      ? points.filter(p => !hiddenBlocks.includes(p.blockId || p.category))
      : points;
    const fc = {
      type: "FeatureCollection",
      features: visiblePoints.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          category: p.blockId || p.category,
          name: p.name,
          distanceM: p.distanceM,
          score: p.score ?? 0,
          blockId: p.blockId || null,
          color: (p.blockId && BLOCKS[p.blockId]?.color) || CATEGORIES[p.category]?.color || "#888888",
          roadClass: p.roadClass ?? null,
          hasSignal: p.hasSignal === true,
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
  }, [mapReady, points, hiddenBlocks]);

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
      ? ["case", ["==", ["get", "blockId"], filter], 0.95, 0.15]
      : 0.95;
    map.setPaintProperty("points-circle", "circle-opacity", poiOpacity);
    map.setPaintProperty("points-halo",   "circle-opacity", filter ? ["case", ["==", ["get", "blockId"], filter], 0.22, 0.03] : 0.22);
    map.setPaintProperty("points-label",  "text-opacity",   filter ? ["case", ["==", ["get", "blockId"], filter], 0.9, 0.1] : 0.9);
  }, [mapReady, filter]);

  // ── 6. Highlight selected point ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (!selectedPoint) {
      if (popupRef.current && !activeIxRef.current) { popupRef.current.remove(); popupRef.current = null; }
      map.setFilter("points-selected", ["==", ["get", "id"], "__none__"]);
      return;
    }

    map.setFilter("points-selected", ["==", ["get", "id"], selectedPoint.id]);
    map.flyTo({ center: [selectedPoint.lng, selectedPoint.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });

    // If popup is already open for this point (opened by map click), keep it
    const alreadyOpen = popupRef.current && !activeIxRef.current;
    if (!alreadyOpen) {
      const cat     = CATEGORIES[selectedPoint.category];
      const distFmt = selectedPoint.distanceM >= 1000
        ? `${(selectedPoint.distanceM / 1000).toFixed(2)} km`
        : `${selectedPoint.distanceM} m`;
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      activeIxRef.current = null;
      popupRef.current = new maplibregl.Popup({ offset: 14, closeButton: true, className: "cam-popup" })
        .setLngLat([selectedPoint.lng, selectedPoint.lat])
        .setHTML(buildPopupHTML({ props: { ...selectedPoint, lat: selectedPoint.lat, lon: selectedPoint.lng, blockId: selectedPoint.blockId }, cat, distFmt, score: selectedPoint.score }))
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
