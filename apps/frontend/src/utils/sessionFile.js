export const SESSION_VERSION = 1;

function buildPayload(state) {
  return {
    _v: SESSION_VERSION,
    savedAt: new Date().toISOString(),
    area:   state.area,
    boundary: state.boundary ?? null,
    points: state.points,
    roads:  state.roads,
    cameras: state.cameras,
    bbox:   state.bbox,
    stats:  state.stats,
    rawIntersections:      state.rawIntersections,
    rawWays:               state.rawWays,
    rawSignalNodes:        state.rawSignalNodes,
    intersectionOverrides: state.intersectionOverrides,
  };
}

function fallbackDownload(json, filename) {
  const blob = new Blob([json], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestampedName() {
  const d = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  return `cam-scan-${d}.json`;
}

/**
 * Write state to an existing FileSystemFileHandle (Chrome/Edge).
 * Returns true on success, false if API unavailable or permission denied.
 */
export async function saveToHandle(handle, state) {
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(buildPayload(state)));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Open a Save File picker (Chrome/Edge) or fall back to a download.
 * Returns the FileSystemFileHandle on success, or null.
 */
export async function saveAsNew(state, suggestedName) {
  const json = JSON.stringify(buildPayload(state));
  const name = suggestedName ?? timestampedName();

  if (typeof window.showSaveFilePicker === "function") {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return handle;
    } catch {
      // User cancelled or no permission — fall through
    }
  }

  // Fallback: trigger browser download
  fallbackDownload(json, name);
  return null;
}

/**
 * Parse a session file (string or File object) and return store-compatible state.
 * Also returns the FileSystemFileHandle if the File came via File System Access API
 * (caller must pass handle separately — we just validate the JSON here).
 */
export async function importSession(file) {
  const text = typeof file === "string" ? file : await file.text();
  const data = JSON.parse(text);
  if (!data._v) throw new Error("File không hợp lệ hoặc không phải phiên làm việc của ứng dụng này.");
  return {
    _filename: file?.name ?? "session.json",
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
