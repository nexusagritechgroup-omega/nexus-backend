// utils/circuitBreaker.js
// Circuit breaker per integrasi eksternal.
// State: CLOSED (normal) → OPEN (gagal, block) → HALF_OPEN (coba lagi)

export class CircuitBreaker {
  constructor(name, options = {}) {
    this.name         = name;
    this.state        = 'CLOSED';
    this.failureCount = 0;
    this.threshold    = options.threshold    || 5;      // gagal berturut-turut sebelum OPEN
    this.timeout      = options.timeout      || 60000;  // ms sebelum coba HALF_OPEN
    this.lastFailure  = null;
    this._db          = options.db || null;  // opsional: simpan state ke Firestore
  }

  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        console.warn(`[CircuitBreaker] ${this.name} OPEN — menggunakan fallback`);
        return fallback ? fallback() : null;
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      if (fallback) return fallback();
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this._persistState();
  }

  _onFailure(err) {
    this.failureCount++;
    this.lastFailure = Date.now();
    console.error(`[CircuitBreaker] ${this.name} gagal (${this.failureCount}/${this.threshold}):`, err?.message);
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error(`[CircuitBreaker] ${this.name} OPEN — terlalu banyak kegagalan`);
    }
    this._persistState();
  }

  _persistState() {
    if (!this._db) return;
    this._db.set('system_status', this.name, {
      circuitBreakerState: this.state,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure,
      updatedAt: Date.now(),
    }).catch(() => {}); // silent fail — jangan block flow utama
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure,
    };
  }
}

// ─── SINGLETON INSTANCES ──────────────────────────────────────────────────
// Diinisialisasi di app.js setelah DB tersedia

export const CircuitBreakers = {
  anthropic:    new CircuitBreaker('anthropic',    { threshold: 5, timeout: 120_000 }),
  firebase:     new CircuitBreaker('firebase',     { threshold: 3, timeout: 30_000  }),
  midtrans:     new CircuitBreaker('midtrans',     { threshold: 3, timeout: 60_000  }),
  openMeteo:    new CircuitBreaker('openMeteo',    { threshold: 5, timeout: 300_000 }),
};

export function setCircuitBreakerDB(db) {
  Object.values(CircuitBreakers).forEach(cb => cb._db = db);
}
