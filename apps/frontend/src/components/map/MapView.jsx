import React, { useEffect, useRef, useState, Component } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";
import { circleGeoJSON } from "../../utils/geo.js";
import Legend from "./Legend.jsx";

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
  const bbox          = useScanStore((s) => s.bbox);
  const filter        = useScanStore((s) => s.filter);
  const selectedPoint = useScanStore((s) => s.selectedPoint);
  const setArea       = useScanStore((s) => s.setArea);

  // ── 1. Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
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
      // ── Radius circle ──────────────────────────────────────────────────────
      map.addSource("radius", { type: "geojson", data: circleGeoJSON(area.lat, area.lng, area.radiusM) });
      map.addLayer({ id: "radius-fill", type: "fill",   source: "radius", paint: { "fill-color": "#38BDF8", "fill-opacity": 0.12 } });
      map.addLayer({ id: "radius-line", type: "line",   source: "radius", paint: { "line-color": "#38BDF8", "line-width": 2.5, "line-opacity": 0.9 } });

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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 16, 11],
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

      // Click popup
      map.on("click", "points-circle", (e) => {
        const props = e.features[0].properties;
        const cat = CATEGORIES[props.category];
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-size:0.82rem;line-height:1.6;min-width:160px">
            <strong style="font-size:0.9rem">${props.name || props.id}</strong><br/>
            <span style="color:${cat?.color || "#888"}">${cat?.label || props.category}</span><br/>
            Khoảng cách: <strong>${props.distanceM}m</strong>
          </div>`)
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
        },
      })),
    };
    mapRef.current.getSource("points")?.setData(fc);
  }, [mapReady, points]);

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
    popupRef.current = new maplibregl.Popup({ offset: 14, closeButton: true })
      .setLngLat([selectedPoint.lng, selectedPoint.lat])
      .setHTML(`<div style="font-size:0.82rem;line-height:1.6;min-width:160px">
        <strong style="font-size:0.9rem">${selectedPoint.name || selectedPoint.id}</strong><br/>
        <span style="color:${cat?.color || "#888"}">${cat?.label || selectedPoint.category}</span><br/>
        Khoảng cách: <strong>${selectedPoint.distanceM}m</strong>
        ${selectedPoint.score != null ? `<br/>Score: <strong>${selectedPoint.score}</strong>` : ""}
      </div>`)
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
      <Legend />
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
