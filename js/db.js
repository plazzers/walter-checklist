// Everything is stored on this device in IndexedDB. Nothing is sent anywhere.
const DB_NAME = 'walters-home-check';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('inspections')) db.createObjectStore('inspections', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos')) {
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('inspectionId', 'inspectionId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('The database is open in another tab. Please close other tabs of this app.'));
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

// ----- Backup & restore -----

export async function exportAll() {
  const [inspections, photos] = await tx(['inspections', 'photos'], 'readonly', (t) =>
    Promise.all([promisify(t.objectStore('inspections').getAll()), promisify(t.objectStore('photos').getAll())])
  );
  return {
    app: 'walters-home-check',
    format: 1,
    exportedAt: new Date().toISOString(),
    inspections,
    photos,
  };
}

export function validateBackup(data) {
  if (!data || data.app !== 'walters-home-check' || !Array.isArray(data.inspections) || !Array.isArray(data.photos)) {
    throw new Error("This file isn't a Walter's Home Check backup.");
  }
  for (const i of data.inspections) {
    if (!i || typeof i.id !== 'string' || !i.mode || typeof i.answers !== 'object') throw new Error('The backup file looks damaged.');
  }
  for (const p of data.photos) {
    if (!p || typeof p.id !== 'string' || typeof p.dataUrl !== 'string' || !p.dataUrl.startsWith('data:image/')) {
      throw new Error('A photo in the backup file looks damaged.');
    }
  }
  return data;
}

export async function importAll(data) {
  validateBackup(data);
  const ids = new Set(data.inspections.map((i) => i.id));
  await tx(['inspections', 'photos'], 'readwrite', async (t) => {
    // Replace any check with the same id, including its old photos.
    for (const id of ids) {
      const keys = await promisify(t.objectStore('photos').index('inspectionId').getAllKeys(id));
      keys.forEach((k) => t.objectStore('photos').delete(k));
    }
    data.inspections.forEach((i) => t.objectStore('inspections').put(i));
    data.photos.filter((p) => ids.has(p.inspectionId)).forEach((p) => t.objectStore('photos').put(p));
  });
  return data.inspections.length;
}
