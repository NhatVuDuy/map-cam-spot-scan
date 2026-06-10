/**
 * OPFS (Origin Private File System) wrapper for session storage.
 * All sessions live in: OPFS root / "cam-scan-sessions" / <name>.json
 *
 * OPFS is sandboxed per-origin, persists across page reloads, and is
 * invisible to the user's Downloads folder — perfect for an app-managed
 * project folder.
 */

import { SESSION_VERSION } from "./sessionFile.js";

const SESSION_DIR = "cam-scan-sessions";

async function getDir() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(SESSION_DIR, { create: true });
}

function safeName(name) {
  // Sanitise to a valid filename; keep extension
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\.json$/i, "") + ".json";
}

/** List all sessions, newest first. Returns [] if OPFS unavailable. */
export async function listSessions() {
  if (!navigator.storage?.getDirectory) return [];
  try {
    const dir = await getDir();
    const out = [];
    for await (const [filename, handle] of dir.entries()) {
      if (handle.kind !== "file" || !filename.endsWith(".json")) continue;
      try {
        const file = await handle.getFile();
        const data = JSON.parse(await file.text());
        out.push({
          filename,
          displayName:  data._name      || filename.replace(/\.json$/, ""),
          savedAt:      data.savedAt    || new Date(file.lastModified).toISOString(),
          pointCount:   data.points?.length   || 0,
          cameraCount:  data.cameras?.length  || 0,
          areaLabel:    data._areaLabel || "",
        });
      } catch { /* skip corrupt files */ }
    }
    return out.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch {
    return [];
  }
}

/** Read and parse a session by filename. */
export async function readSession(filename) {
  const dir = await getDir();
  const fh  = await dir.getFileHandle(filename);
  const file = await fh.getFile();
  return JSON.parse(await file.text());
}

/** Write state to OPFS under the given filename. */
export async function writeSession(filename, state, displayName) {
  const dir = await getDir();
  const fn  = safeName(filename);
  const fh  = await dir.getFileHandle(fn, { create: true });
  const writable = await fh.createWritable();
  const payload = {
    _v:        SESSION_VERSION,
    _name:     displayName || fn.replace(/\.json$/, ""),
    _areaLabel: state._areaLabel || buildAreaLabel(state.area),
    savedAt:   new Date().toISOString(),
    area:      state.area,
    boundary:  state.boundary ?? null,
    points:    state.points,
    roads:     state.roads,
    cameras:   state.cameras,
    bbox:      state.bbox,
    stats:     state.stats,
    rawIntersections:      state.rawIntersections,
    rawWays:               state.rawWays,
    rawSignalNodes:        state.rawSignalNodes,
    intersectionOverrides: state.intersectionOverrides,
  };
  await writable.write(JSON.stringify(payload));
  await writable.close();
  return fn;
}

/** Delete a session file from OPFS. */
export async function deleteSession(filename) {
  const dir = await getDir();
  await dir.removeEntry(filename);
}

/** Rename a session (rewrites file with new _name + new filename). */
export async function renameSession(oldFilename, newDisplayName) {
  const data = await readSession(oldFilename);
  const newFilename = safeName(newDisplayName);
  const dir = await getDir();

  // Write under new name
  const fh = await dir.getFileHandle(newFilename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(JSON.stringify({ ...data, _name: newDisplayName }));
  await writable.close();

  // Remove old if different
  if (newFilename !== oldFilename) await dir.removeEntry(oldFilename);
  return newFilename;
}

/** Trigger a browser download of a session from OPFS. */
export async function downloadSession(filename) {
  const data = await readSession(filename);
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildAreaLabel(area) {
  if (!area) return "";
  return `${area.lat?.toFixed(4)},${area.lng?.toFixed(4)} r=${area.radiusM}m`;
}

export const opfsAvailable = () => !!navigator.storage?.getDirectory;
