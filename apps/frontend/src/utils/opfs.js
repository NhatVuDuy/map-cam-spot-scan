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
    // Support older Chrome where .entries() is missing — fall back to .values()
    const iter = typeof dir.entries === "function" ? dir.entries() : null;
    if (iter) {
      for await (const [filename, handle] of iter) {
        if (handle.kind !== "file" || !filename.endsWith(".json")) continue;
        const meta = await readMeta(handle, filename);
        if (meta) out.push(meta);
      }
    } else {
      for await (const handle of dir.values()) {
        if (handle.kind !== "file" || !handle.name.endsWith(".json")) continue;
        const meta = await readMeta(handle, handle.name);
        if (meta) out.push(meta);
      }
    }
    return out.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch (e) {
    console.error("[opfs] listSessions failed:", e);
    return [];
  }
}

async function readMeta(handle, filename) {
  try {
    const file = await handle.getFile();
    const data = JSON.parse(await file.text());
    return {
      filename,
      displayName:  data._name      || filename.replace(/\.json$/, ""),
      savedAt:      data.savedAt    || new Date(file.lastModified).toISOString(),
      pointCount:   data.points?.length   || 0,
      cameraCount:  data.cameras?.length  || 0,
      areaLabel:    data._areaLabel || "",
    };
  } catch (e) {
    console.warn("[opfs] skipping corrupt file:", filename, e);
    return null;
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
  if (!navigator.storage?.getDirectory) {
    throw new Error("Trình duyệt không hỗ trợ lưu cục bộ (OPFS). Hãy dùng Chrome/Edge mới.");
  }
  const dir = await getDir();
  const fn  = safeName(filename);
  const payload = {
    _v:        SESSION_VERSION,
    _name:     displayName || fn.replace(/\.json$/, ""),
    _areaLabel: state._areaLabel || buildAreaLabel(state.area),
    savedAt:   new Date().toISOString(),
    area:      state.area,
    boundary:  state.boundary ?? null,
    points:    state.points        || [],
    roads:     state.roads         || [],
    cameras:   state.cameras       || [],
    bbox:      state.bbox          || null,
    stats:     state.stats         || {},
    rawIntersections:      state.rawIntersections   || [],
    rawWays:               state.rawWays            || [],
    rawSignalNodes:        state.rawSignalNodes      || [],
    intersectionOverrides: state.intersectionOverrides || {},
  };
  const json = JSON.stringify(payload);

  const fh = await dir.getFileHandle(fn, { create: true });

  // Prefer createWritable (Chrome/Edge/Safari 17+/Firefox 111+),
  // fall back to createSyncAccessHandle when only that is available.
  if (typeof fh.createWritable === "function") {
    const writable = await fh.createWritable();
    await writable.write(json);
    await writable.close();
  } else if (typeof fh.createSyncAccessHandle === "function") {
    const sah = await fh.createSyncAccessHandle();
    try {
      const buf = new TextEncoder().encode(json);
      sah.truncate(0);
      sah.write(buf, { at: 0 });
      sah.flush();
    } finally {
      sah.close();
    }
  } else {
    throw new Error("Trình duyệt không hỗ trợ ghi file vào OPFS.");
  }
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
