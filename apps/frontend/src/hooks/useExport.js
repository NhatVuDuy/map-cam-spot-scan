import { useScanStore } from '../store/scanStore.js';
import { exportUrl } from '../services/api.js';

export function useExport() {
  const { points, scanId } = useScanStore();

  function download(format) {
    if (scanId) {
      window.open(exportUrl(format, scanId), '_blank');
      return;
    }
    // Client-side fallback for geojson when no scanId
    if (format === 'geojson') {
      const geojson = {
        type: 'FeatureCollection',
        features: points.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { ...p },
        })),
      };
      const blob = new Blob([JSON.stringify(geojson)], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scan-results.geojson';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return { download, hasResults: points.length > 0 };
}
