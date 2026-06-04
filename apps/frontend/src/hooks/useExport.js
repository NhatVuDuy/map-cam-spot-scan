import { scanAPI } from "../services/api.js";
import useScanStore from "../store/scanStore.js";

/**
 * useExport — provides export functions for scan results.
 */
export function useExport() {
  const points = useScanStore((s) => s.points);

  const exportCSV = () => {
    if (!points.length) return;
    const headers = ["id", "lat", "lng", "category", "name", "distanceM", "source"];
    const rows = points.map((p) =>
      headers.map((h) => {
        const v = p[h] ?? "";
        return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    downloadBlob(csv, "scan-results.csv", "text/csv");
  };

  const exportGeoJSON = () => {
    if (!points.length) return;
    const fc = {
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { id: p.id, category: p.category, name: p.name, distanceM: p.distanceM },
      })),
    };
    downloadBlob(JSON.stringify(fc, null, 2), "scan-results.geojson", "application/geo+json");
  };

  return { exportCSV, exportGeoJSON };
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
