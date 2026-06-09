// api/webhook-midtrans.js
// Midtrans payment webhook — anti-spoofing + idempotency

import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore }           from 'firebase-admin/firestore';

// Firebase Admin SDK init (serverless — lazy singleton)
function getAdminDb() {
  if (!getApps().length) {
    initializeApp({ credential: /* applicationDefault() atau explicit */ null });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const payload = req.body;
  const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;

  // ─── SIGNATURE VERIFICATION ───────────────────────────────────────
  const expected = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${process.env.MIDTRANS_SERVER_KEY}`)
    .digest('hex');

  if (signature_key !== expected) {
    console.warn('[webhook-midtrans] Signature mismatch — possible spoofing attempt');
    // Log suspicious activity (tanpa crash)
    return res.status(403).json({ error: 'Invalid signature' });
  }

  // ─── IDEMPOTENCY CHECK ────────────────────────────────────────────
  const db = getAdminDb();
  const processed = await db.collection('processed_webhooks').doc(order_id).get();
  if (processed.exists) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // ─── PROCESS PAYMENT ──────────────────────────────────────────────
  try {
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await processPaymentSuccess(db, order_id, payload);
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      await processPaymentFailed(db, order_id, payload);
    }

    // Mark as processed (idempotency)
    await db.collection('processed_webhooks').doc(order_id).set({
      processedAt: new Date(),
      status: transaction_status,
    });

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[webhook-midtrans] Processing error:', err);
    return res.status(500).json({ error: 'Processing failed' });
  }
}

async function processPaymentSuccess(db, orderId, payload) {
  // Parse orderId: format {userId}_{type}_{timestamp}
  const parts  = orderId.split('_');
  const userId = parts[0];
  const type   = parts[1]; // 'sub' | 'topup' | 'hardware'

  // Create transaction record
  await db.collection('transactions').add({
    type,
    fromUserId: userId,
    toUserId:   'system',
    amount:     parseFloat(payload.gross_amount),
    currency:   'IDR',
    status:     'completed',
    metadata:   { midtransOrderId: orderId, paymentType: payload.payment_type },
    _createdAt: new Date(),
    _updatedAt: new Date(),
  });

  // Handle by type
  if (type === 'sub') {
    const tierMap = { '149000': 'PETANI', '299000': 'PETERNAK_PRO', '599000': 'OMEGA_ELITE', '99000': 'TRADER' };
    const tier = tierMap[Math.round(parseFloat(payload.gross_amount)).toString()];
    if (tier) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      await db.collection('users').doc(userId).update({
        'profile.tier': tier,
        'financial.subscriptionExpiresAt': expiresAt,
        '_updatedAt': new Date(),
      });
    }
  } else if (type === 'topup') {
    // Omega Coin top-up — amount / 1000 = coins (Rp 1.000 = 1 Omega Coin)
    const coins = Math.floor(parseFloat(payload.gross_amount) / 1000);
    await db.collection('users').doc(userId).update({
      'financial.omegaCoinBalance': db.FieldValue.increment(coins),
      '_updatedAt': new Date(),
    });
  }

  // Audit log
  await db.collection('auditLog').add({
    actorId: 'system', actingFor: userId, action: 'PAYMENT_COMPLETED',
    collection: 'transactions', documentId: orderId,
    after: { amount: payload.gross_amount, status: 'completed' },
    source: 'system', timestamp: Date.now(), _immutable: true,
  });
}

async function processPaymentFailed(db, orderId, payload) {
  await db.collection('transactions').add({
    type: 'failed_payment',
    fromUserId: orderId.split('_')[0],
    toUserId:   'system',
    amount:     parseFloat(payload.gross_amount),
    currency:   'IDR',
    status:     'cancelled',
    metadata:   { midtransOrderId: orderId, reason: payload.transaction_status },
    _createdAt: new Date(),
    _updatedAt: new Date(),
  });
}
