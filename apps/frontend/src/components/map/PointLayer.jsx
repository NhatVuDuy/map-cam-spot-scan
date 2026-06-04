/**
 * PointLayer — manages the MapLibre GL circle layer for POI points.
 * This is a headless component that manages map layers as a side effect.
 * It is used internally by MapView.jsx.
 */
import { useEffect } from "react";
import { CATEGORIES } from "../../utils/categories.js";

export function usePointLayer(map, points, filter) {
  useEffect(() => {
    if (!map) return;

    const fc = {
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          category: p.category,
          name: p.name || "",
          distanceM: p.distanceM || 0,
          color: CATEGORIES[p.category]?.color || "#888",
        },
      })),
    };

    if (map.getSource("points")) {
      map.getSource("points").setData(fc);
    }
  }, [map, points]);

  // Update filter opacity
  useEffect(() => {
    if (!map || !map.getLayer("points-circle")) return;
    map.setPaintProperty(
      "points-circle",
      "circle-opacity",
      filter ? ["case", ["==", ["get", "category"], filter], 1, 0.15] : 0.85
    );
  }, [map, filter]);
}

export default function PointLayer() {
  // Headless — rendering handled by MapView
  return null;
}
