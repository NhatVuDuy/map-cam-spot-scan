/**
 * Session storage backed by IndexedDB.
 *
 * IndexedDB works on both HTTP and HTTPS, has generous storage quota
 * (hundreds of MB), and persists across page reloads — a better fit
 * than OPFS for apps that may be served without TLS.
 *
 * Public API mirrors the original OPFS module so no callers need changes.
 */

import { SESSION_VERSION } from "./sessionFile.js";

const DB_NAME   = "cam-scan-db";
const STORE     = "sessions";
const DB_VER    = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: "filename" });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t  = db.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    const req = fn(st);
    if (req) {
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    } else {
      t.oncomplete = () => resolve();
      t.onerror    = (e) => reject(e.target.error);
    }
  });
}

function safeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\.json$/i, "") + ".json";
}

function buildAreaLabel(area) {
  if (!area) return "";
  return `${area.lat?.toFixed(4)},${area.lng?.toFixed(4)} r=${area.radiusM}m`;
}

function buildRecord(filename, state, displayName) {
  return {
    filename,
    _v:        SESSION_VERSION,
    _name:     displayName || filename.replace(/\.json$/, ""),
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
}

/** List all sessions, newest first. */
export async function listSessions() {
  try {
    const db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror   = (e) => reject(e.target.error);
    });
    return records
      .map(r => ({
        filename:    r.filename,
        displayName: r._name      || r.filename.replace(/\.json$/, ""),
        savedAt:     r.savedAt    || "",
        pointCount:  r.points?.length   || 0,
        cameraCount: r.cameras?.length  || 0,
        areaLabel:   r._areaLabel || "",
      }))
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  } catch (e) {
    console.error("[idb] listSessions failed:", e);
    return [];
  }
}

/** Read a full session record by filename. */
export async function readSession(filename) {
  const db  = await openDB();
  const rec = await tx(db, "readonly", st => st.get(filename));
  if (!rec) throw new Error(`Không tìm thấy phiên "${filename}"`);
  return rec;
}

/** Save state to IndexedDB under the given filename. */
export async function writeSession(filename, state, displayName) {
  const fn  = safeName(filename);
  const rec = buildRecord(fn, state, displayName);
  const db  = await openDB();
  await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(rec);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
  return fn;
}

/** Delete a session. */
export async function deleteSession(filename) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(filename);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Rename a session (change _name + filename key). */
export async function renameSession(oldFilename, newDisplayName) {
  const old = await readSession(oldFilename);
  const newFilename = safeName(newDisplayName);
  const db  = await openDB();
  const t   = db.transaction(STORE, "readwrite");
  const st  = t.objectStore(STORE);
  await new Promise((res, rej) => {
    const req = st.put({ ...old, filename: newFilename, _name: newDisplayName });
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  });
  if (newFilename !== oldFilename) {
    await new Promise((res, rej) => {
      const req = st.delete(oldFilename);
      req.onsuccess = () => res();
      req.onerror   = (e) => rej(e.target.error);
    });
  }
  return newFilename;
}

/** Download a session from IndexedDB to the user's filesystem. */
export async function downloadSession(filename) {
  const data = await readSession(filename);
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const opfsAvailable = () => typeof indexedDB !== "undefined";
