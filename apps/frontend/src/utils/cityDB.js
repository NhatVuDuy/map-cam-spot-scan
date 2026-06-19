/**
 * cityDB — central IndexedDB layer for the City Scan feature.
 * Upgrades cam-scan-db to v3, adding: cities, scan-files, folders.
 * Ward-geometry keys change from bare wardCode → `${scanId}_${wardCode}`.
 */

const DB_NAME = "cam-scan-db";
const DB_VER  = 3;
const STORES  = { cities: "cities", scanFiles: "scan-files", folders: "folders", wardGeo: "ward-geometry" };

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    req.onupgradeneeded = (e) => {
      const db  = e.target.result;
      const old = e.oldVersion;

      // v1 — sessions store
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "filename" });
      }
      // v2 — ward-geometry store
      if (!db.objectStoreNames.contains(STORES.wardGeo)) {
        db.createObjectStore(STORES.wardGeo, { keyPath: "id" });
      } else if (old < 3) {
        // v2→v3: clear old records keyed by bare wardCode (incompatible key scheme)
        e.target.transaction.objectStore(STORES.wardGeo).clear();
      }
      // v3 — new stores
      if (!db.objectStoreNames.contains(STORES.cities)) {
        db.createObjectStore(STORES.cities, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.scanFiles)) {
        const sf = db.createObjectStore(STORES.scanFiles, { keyPath: "id" });
        sf.createIndex("by-city", "cityId");
      }
      if (!db.objectStoreNames.contains(STORES.folders)) {
        const fo = db.createObjectStore(STORES.folders, { keyPath: "id" });
        fo.createIndex("by-city", "cityId");
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function get(db, store, key) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = (e) => res(e.target.result ?? null);
    req.onerror   = (e) => rej(e.target.error);
  });
}

function getAll(db, store) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  });
}

function getAllByIndex(db, store, indexName, value) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).index(indexName).getAll(value);
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  });
}

function put(db, store, record) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readwrite").objectStore(store).put(record);
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  });
}

function del(db, store, key) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readwrite").objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  });
}

function clearStore(db, store) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readwrite").objectStore(store).clear();
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  });
}

function getAllKeys(db, store) {
  return new Promise((res, rej) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAllKeys();
    req.onsuccess = (e) => res(e.target.result);
    req.onerror   = (e) => rej(e.target.error);
  });
}

/* ── Cities ──────────────────────────────────────────────────────── */

export async function getCities() {
  const db = await openDB();
  return getAll(db, STORES.cities);
}

export async function getCity(id) {
  const db = await openDB();
  return get(db, STORES.cities, id);
}

export async function addCity(city) {
  const db = await openDB();
  return put(db, STORES.cities, { addedAt: new Date().toISOString(), ...city });
}

export async function updateCity(id, patch) {
  const db   = await openDB();
  const existing = await get(db, STORES.cities, id);
  if (!existing) throw new Error(`City "${id}" not found`);
  return put(db, STORES.cities, { ...existing, ...patch });
}

export async function deleteCity(id) {
  const db = await openDB();
  // Delete all scan files (and their geometry) for this city
  const scanFiles = await getAllByIndex(db, STORES.scanFiles, "by-city", id);
  for (const sf of scanFiles) {
    await _deleteWardGeoForScan(db, sf.id);
    await del(db, STORES.scanFiles, sf.id);
  }
  // Delete folders
  const folders = await getAllByIndex(db, STORES.folders, "by-city", id);
  for (const f of folders) await del(db, STORES.folders, f.id);
  return del(db, STORES.cities, id);
}

/* ── Scan files ──────────────────────────────────────────────────── */

export async function getScanFilesByCity(cityId) {
  const db = await openDB();
  const files = await getAllByIndex(db, STORES.scanFiles, "by-city", cityId);
  return files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getScanFile(id) {
  const db = await openDB();
  return get(db, STORES.scanFiles, id);
}

export async function upsertScanFile(scanFile) {
  const db = await openDB();
  return put(db, STORES.scanFiles, scanFile);
}

export async function deleteScanFile(id) {
  const db = await openDB();
  await _deleteWardGeoForScan(db, id);
  return del(db, STORES.scanFiles, id);
}

/* ── Folders ─────────────────────────────────────────────────────── */

export async function getFoldersByCity(cityId) {
  const db = await openDB();
  return getAllByIndex(db, STORES.folders, "by-city", cityId);
}

export async function upsertFolder(folder) {
  const db = await openDB();
  return put(db, STORES.folders, folder);
}

export async function deleteFolder(folderId, reassignTo = null) {
  const db = await openDB();
  // Move scan files out of deleted folder
  const files = await getAllByIndex(db, STORES.scanFiles, "by-city", null);
  const inFolder = files.filter(f => f.folderId === folderId);
  for (const f of inFolder) await put(db, STORES.scanFiles, { ...f, folderId: reassignTo });
  return del(db, STORES.folders, folderId);
}

/* ── Ward geometry (scanId-scoped) ───────────────────────────────── */

export async function writeWardGeometry(scanId, wardCode, data) {
  const db = await openDB();
  return put(db, STORES.wardGeo, { id: `${scanId}_${wardCode}`, scanId, wardCode, ...data, savedAt: new Date().toISOString() });
}

export async function readWardGeometry(scanId, wardCode) {
  const db = await openDB();
  return get(db, STORES.wardGeo, `${scanId}_${wardCode}`);
}

export async function listWardGeometryCodes(scanId) {
  const db   = await openDB();
  const keys = await getAllKeys(db, STORES.wardGeo);
  const prefix = `${scanId}_`;
  return keys.filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
}

export async function readAllWardGeometryForScan(scanId) {
  const db    = await openDB();
  const keys  = await getAllKeys(db, STORES.wardGeo);
  const prefix = `${scanId}_`;
  const matching = keys.filter(k => k.startsWith(prefix));
  const result = [];
  for (const key of matching) {
    const rec = await get(db, STORES.wardGeo, key);
    if (rec) result.push(rec);
  }
  return result;
}

export async function writeWardGeometryBatch(records) {
  const db = await openDB();
  const tx = db.transaction(STORES.wardGeo, "readwrite");
  const store = tx.objectStore(STORES.wardGeo);
  await Promise.all(records.map(rec => new Promise((res, rej) => {
    const req = store.put(rec);
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  })));
}

export async function clearWardGeometryForScan(scanId) {
  const db   = await openDB();
  return _deleteWardGeoForScan(db, scanId);
}

async function _deleteWardGeoForScan(db, scanId) {
  const keys    = await getAllKeys(db, STORES.wardGeo);
  const prefix  = `${scanId}_`;
  const t       = db.transaction(STORES.wardGeo, "readwrite");
  const store   = t.objectStore(STORES.wardGeo);
  const toDelete = keys.filter(k => k.startsWith(prefix));
  await Promise.all(toDelete.map(k => new Promise((res, rej) => {
    const req = store.delete(k);
    req.onsuccess = () => res();
    req.onerror   = (e) => rej(e.target.error);
  })));
}

/* ── Seed built-in cities on first run ───────────────────────────── */
export async function seedBuiltInCities() {
  const cities = await getCities();
  if (!cities.find(c => c.id === "hcm")) {
    await addCity({
      id: "hcm",
      name: "TP.HCM",
      geojsonPath: "/data/hcm-boundaries.geojson",
      geojsonData: null,
      wardCount: 168,
    });
  }
}
