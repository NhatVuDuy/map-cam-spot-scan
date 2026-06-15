/**
 * IndexedDB store for ward scan geometry.
 * Key: wardCode (string)
 * Value: { wardCode, points, cameras, roads, rawIntersections, rawWays, rawSignalNodes, scannedAt }
 *
 * Lives in the same DB as sessions but a separate object store added at DB v2.
 */

const DB_NAME  = "cam-scan-db";
const STORE    = "ward-geometry";
const DB_VER   = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // v1 already created "sessions" store — only create new store here
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "filename" });
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "wardCode" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Save full geometry for a ward. */
export async function writeWardGeometry(wardCode, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put({ wardCode, ...data, savedAt: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Read geometry for a ward. Returns null if not found. */
export async function readWardGeometry(wardCode) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(wardCode);
    req.onsuccess = (e) => resolve(e.target.result ?? null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** List all ward codes that have stored geometry. */
export async function listWardGeometryCodes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Delete geometry for a single ward. */
export async function deleteWardGeometry(wardCode) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(wardCode);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/** Clear all ward geometry (e.g. on fresh scan). */
export async function clearAllWardGeometry() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).clear();
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}
