import React, { useEffect, useRef, Component } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useScanStore from "../../store/scanStore.js";
import { CATEGORIES } from "../../utils/categories.js";
import { circleGeoJSON } from "../../utils/geo.js";
import Legend from "./Legend.jsx";

// Error boundary for MapLibre crashes
class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#FF6B6B", flexDirection: "column", gap: "0.5rem", background: "#0f172a" }}>
          <span style={{ fontSize: "2rem" }}>Map Error</span>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{this.state.error?.message}</span>
          <button
            style={{ padding: "0.4rem 1rem", background: "#334155", color: "#e2e8f0", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MapViewInner() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const { points, roads, bbox, area, filter } = useScanStore();

  // Initialize map
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
        layers: [
          { id: "osm-tiles", type: "raster", source: "osm-tiles" },
        ],
      },
      center: [area.lng, area.lat],
      zoom: 13,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-right");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const updateRadius = () => {
      const circleData = circleGeoJSON(area.lat, area.lng, area.radiusM);
      if (map.getSource("radius")) {
        map.getSource("radius").setData(circleData);
      } else {
        map.addSource("radius", { type: "geojson", data: circleData });
        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius",
          paint: { "fill-color": "#3B82F6", "fill-opacity": 0.06 },
        });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: { "line-color": "#3B82F6", "line-width": 1.5, "line-dasharray": [4, 3] },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRadius();
    } else {
      map.once("load", updateRadius);
    }
  }, [area.lat, area.lng, area.radiusM]);

  // Update roads layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const roadFC = {
      type: "FeatureCollection",
      features: roads.map((r) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: r.geometry },
        properties: { highway: r.highway },
      })),
    };

    const update = () => {
      if (map.getSource("roads")) {
        map.getSource("roads").setData(roadFC);
      } else {
        map.addSource("roads", { type: "geojson", data: roadFC });
        map.addLayer({
          id: "road-layer",
          type: "line",
          source: "roads",
          paint: { "line-color": "#94a3b8", "line-width": 1, "line-opacity": 0.5 },
        });
      }
    };

    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [roads]);

  // Update points layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pointFC = {
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          category: p.category,
          name: p.name,
          distanceM: p.distanceM,
          color: CATEGORIES[p.category]?.color || "#888",
        },
      })),
    };

    const update = () => {
      if (map.getSource("points")) {
        map.getSource("points").setData(pointFC);
      } else {
        map.addSource("points", { type: "geojson", data: pointFC });

        map.addLayer({
          id: "points-circle",
          type: "circle",
          source: "points",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 9],
            "circle-opacity": filter
              ? ["case", ["==", ["get", "category"], filter], 1, 0.2]
              : 0.85,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#fff",
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
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#f1f5f9",
            "text-halo-color": "#0f172a",
            "text-halo-width": 1,
          },
        });

        // Popup on click
        map.on("click", "points-circle", (e) => {
          const props = e.features[0].properties;
          const cat = CATEGORIES[props.category];
          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:0.85rem;line-height:1.5">
                <strong>${props.name || props.id}</strong><br/>
                <span style="color:${cat?.color}">${cat?.label || props.category}</span><br/>
                Distance: ${props.distanceM}m
              </div>`
            )
            .addTo(map);
        });

        map.on("mouseenter", "points-circle", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "points-circle", () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Update opacity based on filter
      if (map.getLayer("points-circle")) {
        map.setPaintProperty(
          "points-circle",
          "circle-opacity",
          filter
            ? ["case", ["==", ["get", "category"], filter], 1, 0.15]
            : 0.85
        );
      }
    };

    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [points, filter]);

  // Fit bbox when results arrive
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bbox) return;
    map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: 50, maxZoom: 16 });
  }, [bbox]);

  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
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
