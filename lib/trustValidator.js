// utils/trustValidator.js
// Implementasi Trust Pyramid (REV-3A) — validasi tiga lapisan untuk data kritis.
// Layer 1: Format (sudah di-handle HTML5 + client)
// Layer 2: Context Triangulation (file ini)
// Layer 3: Post-Save Anomaly Watch (anomalyWatcher.js — async)

import { BIO_REF } from '../config/biologicalReference.js';

// Field yang wajib melalui Trust Pyramid
const CRITICAL_FIELDS = new Set([
  'weight', 'healthStatus', 'organicSubmission',
  'sellPrice', 'farmCoordinates', 'feedAmount',
]);

export async function triangulateData(field, value, context, db) {
  // context: { userId, species, region, animalId }

  if (!CRITICAL_FIELDS.has(field)) {
    return { valid: true, confidence: 1.0, requiresConfirmation: false };
  }

  const signals = [];

  // ─── SIGNAL 1: Historical Coherence ─────────────────────────────
  try {
    const logs = await db.query(
      'dailyLogs',
      [['animalId', '==', context.animalId]],
      ['timestamp', 'desc'],
      30
    );
    if (logs.length >= 3) {
      const values = logs
        .map(l => l[field])
        .filter(v => typeof v === 'number' && !isNaN(v));
      if (values.length >= 3) {
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const deviation = avg > 0 ? Math.abs(value - avg) / avg : 0;
        signals.push({
          source: 'history',
          score: deviation < 0.3 ? 1.0 : deviation < 0.6 ? 0.6 : 0.2,
        });
      }
    }
  } catch { /* silent — network/db issue */ }

  // ─── SIGNAL 2: Biological Reference ─────────────────────────────
  const bioRef = BIO_REF[context.species]?.[field];
  if (bioRef) {
    const inNormal = value >= bioRef.min && value <= bioRef.soft_max;
    const inRange  = value >= bioRef.min && value <= bioRef.hard_max;
    signals.push({
      source: 'biology',
      score: inNormal ? 1.0 : inRange ? 0.5 : 0.0,
    });
  }

  // ─── SIGNAL 3: Community Benchmark ──────────────────────────────
  try {
    const peers = await db.query(
      'dailyLogs',
      [['region', '==', context.region], ['species', '==', context.species]],
      null,
      100
    );
    if (peers.length >= 10) {
      const peerValues = peers
        .map(p => p[field])
        .filter(v => typeof v === 'number' && !isNaN(v))
        .sort((a, b) => a - b);
      const p25 = peerValues[Math.floor(peerValues.length * 0.25)];
      const p75 = peerValues[Math.floor(peerValues.length * 0.75)];
      const inBand = value >= p25 * 0.5 && value <= p75 * 2;
      signals.push({ source: 'community', score: inBand ? 1.0 : 0.3 });
    }
  } catch { /* silent */ }

  // ─── KALKULASI CONFIDENCE ────────────────────────────────────────
  const confidence = signals.length > 0
    ? signals.reduce((sum, s) => sum + s.score, 0) / signals.length
    : 0.5; // default neutral jika tidak ada sinyal

  return {
    valid:                confidence >= 0.4,
    confidence:           Math.round(confidence * 100) / 100,
    requiresConfirmation: confidence >= 0.4 && confidence < 0.7,
    signals,
    action: confidence >= 0.7
      ? 'ACCEPT'
      : confidence >= 0.4
        ? 'CONFIRM'   // Omega minta konfirmasi user
        : 'REJECT',   // tolak dengan penjelasan
  };
}
