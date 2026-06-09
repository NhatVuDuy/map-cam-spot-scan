export const SESSION_VERSION = 1;

/**
 * Trigger a JSON download of the current scan session.
 * Includes raw data + overrides so the file can be loaded back
 * and edited exactly as if the scan just finished.
 */
export function exportSession(state) {
  const payload = {
    _v: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    area:   state.area,
    boundary: state.boundary ?? null,
    points: state.points,
    roads:  state.roads,
    cameras: state.cameras,
    bbox:   state.bbox,
    stats:  state.stats,
    rawIntersections:   state.rawIntersections,
    rawWays:            state.rawWays,
    rawSignalNodes:     state.rawSignalNodes,
    intersectionOverrides: state.intersectionOverrides,
  };

  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  a.href     = url;
  a.download = `cam-scan-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse a session file (string or already-parsed object) and return
 * a store-compatible state object ready to be spread into set().
 */
export function importSession(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  if (!data._v) throw new Error("File không hợp lệ hoặc không phải phiên làm việc của ứng dụng này.");
  return {
    area:   data.area   ?? { lat: 10.7726, lng: 106.677, radiusM: 1000 },
    boundary: data.boundary ?? null,
    points: data.points  || [],
    roads:  data.roads   || [],
    cameras: data.cameras || [],
    bbox:   data.bbox    || null,
    stats:  data.stats   || {},
    rawIntersections:      data.rawIntersections   || [],
    rawWays:               data.rawWays            || [],
    rawSignalNodes:        data.rawSignalNodes      || [],
    intersectionOverrides: data.intersectionOverrides || {},
  };
}
