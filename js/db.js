// Everything is stored on this device in IndexedDB. Nothing is sent anywhere.
let DB_NAME = 'walters-home-check';
// Version 1: meta, inspections, photos. Version 2 adds the "My Home" stores
// (homes, logs, logPhotos). Upgrades only ever ADD stores, so older data stays as it is.
export const DB_VERSION = 2;

let dbPromise = null;

// Only for the self-tests page: work on a separate test database.
export function _useDatabase(name) {
  DB_NAME = name;
  dbPromise = null;
}

export function upgradeDB(db) {
  if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  if (!db.objectStoreNames.contains('inspections')) db.createObjectStore('inspections', { keyPath: 'id' });
  if (!db.objectStoreNames.contains('photos')) {
    const photos = db.createObjectStore('photos', { keyPath: 'id' });
    photos.createIndex('inspectionId', 'inspectionId');
  }
  // v2 — My Home
  if (!db.objectStoreNames.contains('homes')) db.createObjectStore('homes', { keyPath: 'id' });
  if (!db.objectStoreNames.contains('logs')) {
    const logs = db.createObjectStore('logs', { keyPath: 'id' });
    logs.createIndex('homeId', 'homeId');
  }
  if (!db.objectStoreNames.contains('logPhotos')) {
    const lp = db.createObjectStore('logPhotos', { keyPath: 'id' });
    lp.createIndex('logId', 'logId');
    lp.createIndex('homeId', 'homeId');
  }
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => upgradeDB(req.result);
    req.onsuccess = () => {
      const db = req.result;
      // A newer version of the app (in another tab) needs to upgrade: step aside.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
    // An older copy of the app is still open in another tab. The upgrade waits until it's closed.
    req.onblocked = () => {
      if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('whc-db-blocked'));
    };
  });
  return dbPromise;
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(stores, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result;
    Promise.resolve(fn(t)).then((r) => { result = r; }, reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Saving was cancelled. Your device may be out of storage space.'));
  });
}

export const getMeta = (key) => tx('meta', 'readonly', (t) => promisify(t.objectStore('meta').get(key)));
export const setMeta = (key, value) => tx('meta', 'readwrite', (t) => { t.objectStore('meta').put(value, key); });

export const listInspections = () => tx('inspections', 'readonly', (t) => promisify(t.objectStore('inspections').getAll()));
export const getInspection = (id) => tx('inspections', 'readonly', (t) => promisify(t.objectStore('inspections').get(id)));
export const putInspection = (insp) => tx('inspections', 'readwrite', (t) => { t.objectStore('inspections').put(insp); });

export async function deleteInspection(id) {
  return tx(['inspections', 'photos'], 'readwrite', async (t) => {
    t.objectStore('inspections').delete(id);
    const keys = await promisify(t.objectStore('photos').index('inspectionId').getAllKeys(id));
    keys.forEach((k) => t.objectStore('photos').delete(k));
  });
}

export const putPhoto = (photo) => tx('photos', 'readwrite', (t) => { t.objectStore('photos').put(photo); });
export const getPhoto = (id) => tx('photos', 'readonly', (t) => promisify(t.objectStore('photos').get(id)));
export const deletePhoto = (id) => tx('photos', 'readwrite', (t) => { t.objectStore('photos').delete(id); });
export const getPhotosForInspection = (inspectionId) =>
  tx('photos', 'readonly', (t) => promisify(t.objectStore('photos').index('inspectionId').getAll(inspectionId)));

// ----- My Home -----

export const listHomes = () => tx('homes', 'readonly', (t) => promisify(t.objectStore('homes').getAll()));
export const getHome = (id) => tx('homes', 'readonly', (t) => promisify(t.objectStore('homes').get(id)));
export const putHome = (home) => tx('homes', 'readwrite', (t) => { t.objectStore('homes').put(home); });

export async function deleteHome(id) {
  return tx(['homes', 'logs', 'logPhotos'], 'readwrite', async (t) => {
    t.objectStore('homes').delete(id);
    const [logKeys, photoKeys] = await Promise.all([
      promisify(t.objectStore('logs').index('homeId').getAllKeys(id)),
      promisify(t.objectStore('logPhotos').index('homeId').getAllKeys(id)),
    ]);
    logKeys.forEach((k) => t.objectStore('logs').delete(k));
    photoKeys.forEach((k) => t.objectStore('logPhotos').delete(k));
  });
}

export const getLogsForHome = (homeId) => tx('logs', 'readonly', (t) => promisify(t.objectStore('logs').index('homeId').getAll(homeId)));
export const getLog = (id) => tx('logs', 'readonly', (t) => promisify(t.objectStore('logs').get(id)));

// Saves a log entry together with any new photos, and removes photos that were taken off it.
export async function saveLog(log, newPhotos = [], removedPhotoIds = []) {
  return tx(['logs', 'logPhotos'], 'readwrite', (t) => {
    newPhotos.forEach((p) => t.objectStore('logPhotos').put(p));
    removedPhotoIds.forEach((id) => t.objectStore('logPhotos').delete(id));
    t.objectStore('logs').put(log);
  });
}

export async function deleteLog(id) {
  return tx(['logs', 'logPhotos'], 'readwrite', async (t) => {
    t.objectStore('logs').delete(id);
    const keys = await promisify(t.objectStore('logPhotos').index('logId').getAllKeys(id));
    keys.forEach((k) => t.objectStore('logPhotos').delete(k));
  });
}

export const getLogPhoto = (id) => tx('logPhotos', 'readonly', (t) => promisify(t.objectStore('logPhotos').get(id)));

// ----- Backup & restore -----
// format 1: inspections + photos. format 2 adds homes, logs and logPhotos.
// Old (format 1) backup files still restore fine.

export async function exportAll() {
  const stores = ['inspections', 'photos', 'homes', 'logs', 'logPhotos'];
  const [inspections, photos, homes, logs, logPhotos] = await tx(stores, 'readonly', (t) =>
    Promise.all(stores.map((s) => promisify(t.objectStore(s).getAll())))
  );
  return {
    app: 'walters-home-check',
    format: 2,
    exportedAt: new Date().toISOString(),
    inspections,
    photos,
    homes,
    logs,
    logPhotos,
  };
}

const isImage = (p) => p && typeof p.id === 'string' && typeof p.dataUrl === 'string' && p.dataUrl.startsWith('data:image/');

export function validateBackup(data) {
  if (!data || data.app !== 'walters-home-check' || !Array.isArray(data.inspections) || !Array.isArray(data.photos)) {
    throw new Error("This file isn't a Walter's Home Check backup.");
  }
  for (const i of data.inspections) {
    if (!i || typeof i.id !== 'string' || !i.mode || typeof i.answers !== 'object') throw new Error('The backup file looks damaged.');
  }
  for (const p of data.photos) {
    if (!isImage(p)) throw new Error('A photo in the backup file looks damaged.');
  }
  for (const k of ['homes', 'logs', 'logPhotos']) {
    if (data[k] !== undefined && !Array.isArray(data[k])) throw new Error('The backup file looks damaged.');
  }
  for (const h of data.homes || []) {
    if (!h || typeof h.id !== 'string') throw new Error('The backup file looks damaged.');
  }
  for (const l of data.logs || []) {
    if (!l || typeof l.id !== 'string' || typeof l.homeId !== 'string') throw new Error('The backup file looks damaged.');
  }
  for (const p of data.logPhotos || []) {
    if (!isImage(p) || typeof p.logId !== 'string') throw new Error('A photo in the backup file looks damaged.');
  }
  return data;
}

export async function importAll(data) {
  validateBackup(data);
  const ids = new Set(data.inspections.map((i) => i.id));
  const homes = data.homes || [];
  const logs = data.logs || [];
  const logIds = new Set(logs.map((l) => l.id));
  await tx(['inspections', 'photos', 'homes', 'logs', 'logPhotos'], 'readwrite', async (t) => {
    // Replace any check with the same id, including its old photos.
    for (const id of ids) {
      const keys = await promisify(t.objectStore('photos').index('inspectionId').getAllKeys(id));
      keys.forEach((k) => t.objectStore('photos').delete(k));
    }
    // Same for logbook entries.
    for (const id of logIds) {
      const keys = await promisify(t.objectStore('logPhotos').index('logId').getAllKeys(id));
      keys.forEach((k) => t.objectStore('logPhotos').delete(k));
    }
    data.inspections.forEach((i) => t.objectStore('inspections').put(i));
    data.photos.filter((p) => ids.has(p.inspectionId)).forEach((p) => t.objectStore('photos').put(p));
    homes.forEach((h) => t.objectStore('homes').put(h));
    logs.forEach((l) => t.objectStore('logs').put(l));
    (data.logPhotos || []).filter((p) => logIds.has(p.logId)).forEach((p) => t.objectStore('logPhotos').put(p));
  });
  return data.inspections.length;
}
