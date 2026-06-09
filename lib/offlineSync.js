// utils/offlineSync.js
// Manajemen antrian offline lengkap menggunakan IndexedDB
// Lebih reliable dari localStorage untuk data penting

const DB_NAME    = 'nexusagri_offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

// ─── INDEXEDDB SETUP ─────────────────────────────────────────────
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db    = e.target.result;
      const store = db.createObjectStore(STORE_NAME, { keyPath:'id' });
      store.createIndex('status', 'status', { unique: false });
      store.createIndex('createdAt', 'createdAt', { unique: false });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ─── ENQUEUE ──────────────────────────────────────────────────────
export async function enqueueOffline(item) {
  // item: { collection, operation: 'add'|'update', data, docId? }
  const db    = await openOfflineDB();
  const entry = {
    id:           `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    ...item,
    status:       'pending',
    createdAt:    Date.now(),
    syncAttempts: 0,
    lastError:    null,
  };
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror   = e => reject(e.target.error);
  });
}

// ─── GET PENDING ─────────────────────────────────────────────────
export async function getPendingItems() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const index   = store.index('status');
    const req     = index.getAll('pending');
    req.onsuccess = e => resolve(e.target.result || []);
    req.onerror   = e => reject(e.target.error);
  });
}

// ─── UPDATE ITEM STATUS ───────────────────────────────────────────
export async function updateItemStatus(id, status, error = null) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = e => {
      const item = e.target.result;
      if (!item) return resolve(null);
      item.status       = status;
      item.syncAttempts = (item.syncAttempts || 0) + 1;
      item.lastError    = error;
      item.lastAttempt  = Date.now();
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve(item);
      putReq.onerror   = e => reject(e.target.error);
    };
    getReq.onerror = e => reject(e.target.error);
  });
}

// ─── CLEAR SYNCED ────────────────────────────────────────────────
export async function clearSyncedItems() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const index   = store.index('status');
    const req     = index.getAll('synced');
    req.onsuccess = e => {
      const items = e.target.result || [];
      let deleted = 0;
      items.forEach(item => {
        store.delete(item.id);
        deleted++;
      });
      resolve(deleted);
    };
    req.onerror = e => reject(e.target.error);
  });
}

// ─── MAIN SYNC FUNCTION ───────────────────────────────────────────
export async function syncQueue(firestoreAddFn, firestoreUpdateFn) {
  // firestoreAddFn: (collection, data) => Promise
  // firestoreUpdateFn: (collection, docId, data) => Promise

  const pending = await getPendingItems();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0, failed = 0;

  for (const item of pending) {
    if (item.syncAttempts >= 3) {
      await updateItemStatus(item.id, 'failed', 'Max retry exceeded');
      failed++;
      continue;
    }

    try {
      if (item.operation === 'add') {
        await firestoreAddFn(item.collection, {
          ...item.data,
          _offlinePending: false,
          _syncedAt: Date.now(),
        });
      } else if (item.operation === 'update' && item.docId) {
        await firestoreUpdateFn(item.collection, item.docId, {
          ...item.data,
          _offlinePending: false,
          _syncedAt: Date.now(),
        });
      }
      await updateItemStatus(item.id, 'synced');
      synced++;
    } catch (err) {
      await updateItemStatus(item.id, 'pending', err.message);
      failed++;
    }
  }

  // Bersihkan item yang sudah synced
  if (synced > 0) await clearSyncedItems();

  return { synced, failed, total: pending.length };
}

// ─── GET QUEUE STATS ─────────────────────────────────────────────
export async function getQueueStats() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const req     = store.getAll();
    req.onsuccess = e => {
      const all     = e.target.result || [];
      const stats   = { total: all.length, pending: 0, synced: 0, failed: 0 };
      all.forEach(item => { if (stats[item.status] !== undefined) stats[item.status]++; });
      resolve(stats);
    };
    req.onerror = e => reject(e.target.error);
  });
}
