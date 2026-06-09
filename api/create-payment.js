// api/create-payment.js
// Membuat Midtrans transaction token untuk subscription, top-up, dan hardware
// Client menerima token lalu panggil window.snap.pay(token)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const requestId = crypto.randomUUID();

  // ─── AUTH ──────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success:false, error:{ code:'AUTH_REQUIRED', message:'Token diperlukan' }, meta:{ requestId } });
  }

  const { type, tierId, packageId, sku, userId } = req.body;
  if (!type || !userId) {
    return res.status(400).json({ success:false, error:{ code:'VALIDATION_ERROR', message:'type dan userId wajib diisi' }, meta:{ requestId } });
  }

  // ─── PRICE MAP ─────────────────────────────────────────────────
  const PRICES = {
    subscription: { PETANI:149_000, PETERNAK_PRO:299_000, OMEGA_ELITE:599_000, TRADER:99_000 },
    topup:        { small:10_000, medium:45_000, large:100_000 },
    hardware: {
      QR_EAR_TAG_5PCS:125_000, QR_PLANT_TAG_10PCS:200_000,
      QR_AQUA_TAG_5PCS:150_000, SMART_MEASURE_TAPE:35_000,
      TRANSIT_TAG_5PCS:35_000, NUTRISI_BLOCK:45_000, STARTER_KIT:299_000,
    },
  };

  let amount = 0;
  let orderId = '';
  let itemDetails = [];

  if (type === 'subscription' && tierId) {
    amount  = PRICES.subscription[tierId];
    orderId = `${userId}_sub_${tierId}_${Date.now()}`;
    itemDetails = [{ id: tierId, price: amount, quantity: 1, name: `NexusAgri ${tierId} - 1 Bulan` }];
  } else if (type === 'topup' && packageId) {
    amount  = PRICES.topup[packageId];
    orderId = `${userId}_topup_${packageId}_${Date.now()}`;
    const coinMap = { small:10, medium:50, large:120 };
    itemDetails = [{ id: packageId, price: amount, quantity: 1, name: `Omega Coin ${coinMap[packageId]} pcs` }];
  } else if (type === 'hardware' && sku) {
    amount  = PRICES.hardware[sku];
    orderId = `${userId}_hw_${sku}_${Date.now()}`;
    itemDetails = [{ id: sku, price: amount, quantity: 1, name: `NexusAgri Hardware: ${sku}` }];
  } else {
    return res.status(400).json({ success:false, error:{ code:'VALIDATION_ERROR', message:'Kombinasi type/id tidak valid' }, meta:{ requestId } });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ success:false, error:{ code:'VALIDATION_ERROR', message:'Harga tidak valid' }, meta:{ requestId } });
  }

  // ─── CREATE MIDTRANS TRANSACTION ──────────────────────────────
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_ENV === 'production';
    const baseUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const payload = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: itemDetails,
      customer_details: { customer_id: userId },
      expiry: { unit: 'hours', duration: 24 },
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(serverKey + ':').toString('base64'),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
      throw new Error(data.error_messages?.join(', ') || 'Midtrans error');
    }

    return res.status(200).json({
      success: true,
      data: { token: data.token, redirectUrl: data.redirect_url, orderId },
      meta: { requestId, timestamp: Date.now() },
    });
  } catch (err) {
    console.error('[create-payment] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: { code:'PAYMENT_CREATE_FAILED', message:'Gagal membuat transaksi. Coba lagi.' },
      meta: { requestId },
    });
  }
}
