function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('os-browser-mini', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('cache');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOffline(key: string, data: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').put(data, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadOffline(key: string): Promise<any | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readonly');
    const req = tx.objectStore('cache').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOffline(key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearOffline(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cache', 'readwrite');
    tx.objectStore('cache').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
