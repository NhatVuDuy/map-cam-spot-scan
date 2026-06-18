import { useEffect } from "react";
import { BLOCKS } from "../../config/blocks.js";
import { CATEGORIES } from "../../utils/categories.js";

function pointColor(p) {
  if (p.blockId && BLOCKS[p.blockId]) return BLOCKS[p.blockId].color;
  return CATEGORIES[p.category]?.color || "#888";
}

export function usePointLayer(map, points, filter, hiddenBlocks = []) {
  useEffect(() => {
    if (!map) return;

    const visible = hiddenBlocks.length > 0
      ? points.filter(p => !hiddenBlocks.includes(p.blockId || p.category))
      : points;

    const fc = {
      type: "FeatureCollection",
      features: visible.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          category: p.category,
          blockId: p.blockId || p.category,
          name: p.name || "",
          distanceM: p.distanceM || 0,
          color: pointColor(p),
        },
      })),
    };

    if (map.getSource("points")) {
      map.getSource("points").setData(fc);
    }
  }, [map, points, hiddenBlocks]);

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
  return null;
}
