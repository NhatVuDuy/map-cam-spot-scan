import React, { useEffect, useRef, Component } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";
import { circleGeoJSON } from "../../utils/geo.js";
import Legend from "./Legend.jsx";

// ─── Error Boundary ──────────────────────────────────────────────────────────

class MapErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#FF6B6B", flexDirection: "column", gap: "0.5rem", background: "#0f172a" }}>
          <span style={{ fontSize: "2rem" }}>Map Error</span>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{this.state.error?.message}</span>
          <button style={{ padding: "0.4rem 1rem", background: "#334155", color: "#e2e8f0", border: "none", borderRadius: "4px", cursor: "pointer" }} onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Map overlays ─────────────────────────────────────────────────────────────

function ReturnToAreaButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Về vùng đang chọn"
      style={{
        position: "absolute",
        bottom: "80px",
        right: "10px",
        zIndex: 10,
        width: "36px",
        height: "36px",
        background: "#1e293b",
        border: "1px solid #475569",
        borderRadius: "6px",
        color: "#e2e8f0",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      ⊙
    </button>
  );
}

// ─── Main map component ───────────────────────────────────────────────────────

function MapViewInner() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);   // draggable center marker
  const popupRef = useRef(null);    // selected-point popup

  const area          = useScanStore((s) => s.area);
  const points        = useScanStore((s) => s.points);
  const roads         = useScanStore((s) => s.roads);
  const bbox          = useScanStore((s) => s.bbox);
  const filter        = useScanStore((s) => s.filter);
  const selectedPoint = useScanStore((s) => s.selectedPoint);
  const setArea       = useScanStore((s) => s.setArea);

  // ── 1. Initialize map ─────────────────────────────────────────────────────
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
      // ── Radius circle ──
      map.addSource("radius", { type: "geojson", data: circleGeoJSON(area.lat, area.lng, area.radiusM) });
      map.addLayer({ id: "radius-fill", type: "fill",   source: "radius", paint: { "fill-color": "#38BDF8", "fill-opacity": 0.12 } });
      map.addLayer({ id: "radius-line", type: "line",   source: "radius", paint: { "line-color": "#38BDF8", "line-width": 2.5, "line-opacity": 0.9 } });

      // ── Roads ──
      map.addSource("roads", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "road-layer", type: "line", source: "roads", paint: { "line-color": "#94a3b8", "line-width": 1, "line-opacity": 0.5 } });

      // ── Points ──
      map.addSource("points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "points-circle",
        type: "circle",
        source: "points",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 16, 11],
          "circle-opacity": 0.9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      map.addLayer({
        id: "points-selected",
        type: "circle",
        source: "points",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": "#fff",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 9, 16, 18],
          "circle-opacity": 0,
          "circle-stroke-width": 4,
          "circle-stroke-color": "#FACC15",
          "circle-stroke-opacity": 1,
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
          "text-offset": [0, 1.3],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#f1f5f9",
          "text-halo-color": "#0f172a",
          "text-halo-width": 1.5,
        },
      });

      // Popup on click
      map.on("click", "points-circle", (e) => {
        const props = e.features[0].properties;
        const cat = CATEGORIES[props.category];
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font-size:0.82rem;line-height:1.6;min-width:160px">
              <strong style="font-size:0.9rem">${props.name || props.id}</strong><br/>
              <span style="color:${cat?.color || "#888"}">${cat?.label || props.category}</span><br/>
              Khoảng cách: <strong>${props.distanceM}m</strong>
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", "points-circle", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "points-circle", () => { map.getCanvas().style.cursor = ""; });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Draggable center marker ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const initMarker = () => {
      if (markerRef.current) {
        markerRef.current.setLngLat([area.lng, area.lat]);
        return;
      }

      // Custom marker element
      const el = document.createElement("div");
      el.style.cssText = `
        width: 20px; height: 20px;
        border: 3px solid #38BDF8;
        border-radius: 50%;
        background: rgba(56,189,248,0.25);
        cursor: grab;
        box-shadow: 0 0 0 3px rgba(56,189,248,0.2);
      `;

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([area.lng, area.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        setArea({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
      });

      markerRef.current = marker;
    };

    if (map.isStyleLoaded()) initMarker();
    else map.once("load", initMarker);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Sync marker + radius when area changes ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([area.lng, area.lat]);
    }

    const update = () => {
      if (map.getSource("radius")) {
        map.getSource("radius").setData(circleGeoJSON(area.lat, area.lng, area.radiusM));
      }
    };

    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [area.lat, area.lng, area.radiusM]);

  // ── 4. Update roads ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const fc = {
      type: "FeatureCollection",
      features: roads.map((r) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: r.geometry },
        properties: { highway: r.highway },
      })),
    };

    const update = () => { if (map.getSource("roads")) map.getSource("roads").setData(fc); };
    if (map.isStyleLoaded()) update(); else map.once("load", update);
  }, [roads]);

  // ── 5. Update points ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
          score: p.score,
          color: CATEGORIES[p.category]?.color || "#888",
        },
      })),
    };

    const update = () => { if (map.getSource("points")) map.getSource("points").setData(fc); };
    if (map.isStyleLoaded()) update(); else map.once("load", update);
  }, [points]);

  // ── 6. Update filter opacity ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer("points-circle")) return;

    map.setPaintProperty(
      "points-circle",
      "circle-opacity",
      filter ? ["case", ["==", ["get", "category"], filter], 1, 0.12] : 0.9
    );
    map.setPaintProperty(
      "points-label",
      "text-opacity",
      filter ? ["case", ["==", ["get", "category"], filter], 1, 0.1] : 1
    );
  }, [filter]);

  // ── 7. Highlight selected point ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Close previous popup
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    if (!map.getLayer("points-selected")) return;

    if (!selectedPoint) {
      map.setFilter("points-selected", ["==", ["get", "id"], ""]);
      return;
    }

    map.setFilter("points-selected", ["==", ["get", "id"], selectedPoint.id]);

    map.flyTo({ center: [selectedPoint.lng, selectedPoint.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 });

    const cat = CATEGORIES[selectedPoint.category];
    const popup = new maplibregl.Popup({ offset: 14, closeButton: true })
      .setLngLat([selectedPoint.lng, selectedPoint.lat])
      .setHTML(
        `<div style="font-size:0.82rem;line-height:1.6;min-width:160px">
          <strong style="font-size:0.9rem">${selectedPoint.name || selectedPoint.id}</strong><br/>
          <span style="color:${cat?.color || "#888"}">${cat?.label || selectedPoint.category}</span><br/>
          Khoảng cách: <strong>${selectedPoint.distanceM}m</strong>
          ${selectedPoint.score != null ? `<br/>Score: <strong>${selectedPoint.score}</strong>` : ""}
        </div>`
      )
      .addTo(map);

    popupRef.current = popup;
  }, [selectedPoint]);

  // ── 8. Fit bbox after scan ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bbox) return;
    map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: 60, maxZoom: 16, duration: 800 });
  }, [bbox]);

  const handleReturnToArea = () => {
    const map = mapRef.current;
    if (!map) return;
    const { lat, lng, radiusM } = area;
    // Pick zoom level based on radius
    const zoom = radiusM <= 500 ? 15 : radiusM <= 2000 ? 14 : radiusM <= 5000 ? 13 : 12;
    map.flyTo({ center: [lng, lat], zoom, duration: 700 });
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <ReturnToAreaButton onClick={handleReturnToArea} />
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
