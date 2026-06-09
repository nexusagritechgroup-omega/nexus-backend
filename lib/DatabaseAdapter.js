// adapters/DatabaseAdapter.js
// Abstraksi database — semua kode lain gunakan ini, bukan Firestore langsung.
// Jika suatu hari pindah dari Firestore, hanya file ini dan implementasinya yang berubah.

export class DatabaseAdapter {
  constructor(implementation) {
    if (!implementation) throw new Error('DatabaseAdapter membutuhkan implementation');
    this._impl = implementation;
  }

  // ─── CORE CRUD ────────────────────────────────────────────────────

  async get(collection, docId) {
    return this._impl.get(collection, docId);
  }

  async set(collection, docId, data) {
    return this._impl.set(collection, docId, data);
  }

  async update(collection, docId, data) {
    return this._impl.update(collection, docId, data);
  }

  async delete(collection, docId) {
    return this._impl.delete(collection, docId);
  }

  async exists(collection, docId) {
    return this._impl.exists(collection, docId);
  }

  // ─── QUERY ────────────────────────────────────────────────────────

  async query(collection, filters = [], orderBy = null, limit = 50) {
    return this._impl.query(collection, filters, orderBy, limit);
  }

  async queryOne(collection, filters = []) {
    const results = await this._impl.query(collection, filters, null, 1);
    return results[0] || null;
  }

  // ─── BATCH & TRANSACTION ──────────────────────────────────────────

  async runTransaction(fn) {
    return this._impl.runTransaction(fn);
  }

  async batchWrite(operations) {
    // operations: [{ type: 'set'|'update'|'delete', collection, docId, data }]
    return this._impl.batchWrite(operations);
  }

  // ─── REALTIME ─────────────────────────────────────────────────────

  subscribe(collection, docId, callback) {
    return this._impl.subscribe(collection, docId, callback);
  }

  subscribeQuery(collection, filters, callback) {
    return this._impl.subscribeQuery(collection, filters, callback);
  }

  // ─── AUDIT LOG (immutable) ────────────────────────────────────────
  // Audit log menggunakan metode terpisah untuk menekankan immutability.
  // Tidak ada update atau delete untuk audit log.

  async writeAuditLog(entry) {
    const logId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const fullEntry = {
      ...entry,
      timestamp: Date.now(),
      _immutable: true,
    };
    return this._impl.set('auditLog', logId, fullEntry);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────

  generateId() {
    return this._impl.generateId();
  }

  serverTimestamp() {
    return this._impl.serverTimestamp();
  }
}
