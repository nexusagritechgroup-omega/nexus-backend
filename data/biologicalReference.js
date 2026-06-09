// config/biologicalReference.js
// Referensi biologis per spesies untuk Trust Pyramid.
// Sumber: NHS (NexusAgri Health Standard) v1.0

export const BIO_REF = {
  // ─── KAMBING ───────────────────────────────────────────────────────
  goat: {
    weight: {
      min: 3,        // kg — anak yang baru lahir
      soft_max: 80,  // kg — normal dewasa
      hard_max: 120, // kg — batas absolut (sangat jarang)
      unit: 'kg',
    },
    temperature: { min: 38.0, soft_max: 39.5, hard_max: 41.0, unit: '°C' },
    heartRate:   { min: 70,   soft_max: 80,   hard_max: 120,  unit: 'bpm' },
    feedAmount:  { min: 0.5,  soft_max: 3.0,  hard_max: 5.0,  unit: 'kg/hari' },
  },

  // ─── SAPI ─────────────────────────────────────────────────────────
  cow: {
    weight: {
      min: 20,
      soft_max: 600,
      hard_max: 1000,
      unit: 'kg',
    },
    temperature: { min: 38.0, soft_max: 39.3, hard_max: 41.0, unit: '°C' },
    heartRate:   { min: 40,   soft_max: 70,   hard_max: 100,  unit: 'bpm' },
    feedAmount:  { min: 2,    soft_max: 20,   hard_max: 30,   unit: 'kg/hari' },
  },

  // ─── DOMBA ────────────────────────────────────────────────────────
  sheep: {
    weight: {
      min: 3,
      soft_max: 70,
      hard_max: 100,
      unit: 'kg',
    },
    temperature: { min: 38.5, soft_max: 39.5, hard_max: 41.0, unit: '°C' },
    heartRate:   { min: 70,   soft_max: 80,   hard_max: 120,  unit: 'bpm' },
    feedAmount:  { min: 0.5,  soft_max: 2.5,  hard_max: 4.0,  unit: 'kg/hari' },
  },

  // ─── AYAM BROILER ─────────────────────────────────────────────────
  chicken_broiler: {
    weight: {
      min: 0.04,  // DOC
      soft_max: 3.0,
      hard_max: 5.0,
      unit: 'kg',
    },
    feedAmount: { min: 0.01, soft_max: 0.15, hard_max: 0.25, unit: 'kg/hari' },
  },

  // ─── AYAM PETELUR ─────────────────────────────────────────────────
  chicken_layer: {
    weight: { min: 0.04, soft_max: 2.0, hard_max: 3.0, unit: 'kg' },
    feedAmount: { min: 0.05, soft_max: 0.12, hard_max: 0.2, unit: 'kg/hari' },
  },

  // ─── BEBEK ────────────────────────────────────────────────────────
  duck: {
    weight: { min: 0.05, soft_max: 3.5, hard_max: 5.0, unit: 'kg' },
    feedAmount: { min: 0.05, soft_max: 0.2, hard_max: 0.35, unit: 'kg/hari' },
  },

  // ─── BABI ─────────────────────────────────────────────────────────
  pig: {
    weight: { min: 0.5, soft_max: 120, hard_max: 250, unit: 'kg' },
    temperature: { min: 38.0, soft_max: 39.5, hard_max: 41.0, unit: '°C' },
    feedAmount: { min: 0.2, soft_max: 3.5, hard_max: 6.0, unit: 'kg/hari' },
  },

  // ─── IKAN (BUDIDAYA) ──────────────────────────────────────────────
  fish_freshwater: {
    weight: { min: 0.001, soft_max: 1.5, hard_max: 5.0, unit: 'kg' },
    feedAmount: { min: 0.001, soft_max: 0.05, hard_max: 0.1, unit: 'kg/ekor/hari' },
  },

  // ─── UDANG ────────────────────────────────────────────────────────
  shrimp: {
    weight: { min: 0.0001, soft_max: 0.05, hard_max: 0.1, unit: 'kg' },
  },
};

// Fungsi helper untuk cek apakah nilai dalam range normal
export function isInNormalRange(species, field, value) {
  const ref = BIO_REF[species]?.[field];
  if (!ref) return null; // tidak ada referensi untuk kombinasi ini
  return value >= ref.min && value <= ref.soft_max;
}

export function isInHardLimit(species, field, value) {
  const ref = BIO_REF[species]?.[field];
  if (!ref) return null;
  return value >= ref.min && value <= ref.hard_max;
}

// Alert level berdasarkan range
export function getAlertLevel(species, field, value) {
  const ref = BIO_REF[species]?.[field];
  if (!ref) return 'unknown';
  if (value < ref.min || value > ref.hard_max) return 'kritis';
  if (value > ref.soft_max) return 'siaga';
  return 'normal';
}
