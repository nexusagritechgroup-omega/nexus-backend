// api/health.js
// Health check endpoint — dipanggil setiap 5 menit oleh monitoring
// Menulis status ke Firestore system_status/{module}

export default async function handler(req, res) {
  const results = {};
  const checks  = await Promise.allSettled([
    checkAnthropic(),
    checkMidtrans(),
    checkOpenMeteo(),
  ]);

  const modules = ['anthropic', 'midtrans', 'openMeteo'];
  checks.forEach((result, i) => {
    results[modules[i]] = result.status === 'fulfilled'
      ? result.value
      : { ok: false, latencyMs: null, error: result.reason?.message };
  });

  const allOk = Object.values(results).every(r => r.ok);

  // Dalam production: tulis ke Firestore system_status via admin SDK
  // await updateSystemStatus(results);

  return res.status(allOk ? 200 : 207).json({
    ok: allOk,
    timestamp: Date.now(),
    services: results,
  });
}

async function checkAnthropic() {
  const start = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages:   [{ role:'user', content:'ping' }],
      }),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, latencyMs: Date.now()-start, statusCode: res.status };
  } catch(e) {
    return { ok: false, latencyMs: Date.now()-start, error: e.message };
  }
}

async function checkMidtrans() {
  const start = Date.now();
  try {
    // Midtrans ping — hanya cek koneksi ke base URL
    const isProduction = process.env.MIDTRANS_ENV === 'production';
    const url = isProduction
      ? 'https://app.midtrans.com/ping'
      : 'https://app.sandbox.midtrans.com/ping';
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return { ok: true, latencyMs: Date.now()-start };
  } catch(e) {
    return { ok: false, latencyMs: Date.now()-start, error: e.message };
  }
}

async function checkOpenMeteo() {
  const start = Date.now();
  try {
    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-7.5&longitude=112.5&current_weather=true',
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return { ok: res.ok && !!data.current_weather, latencyMs: Date.now()-start };
  } catch(e) {
    return { ok: false, latencyMs: Date.now()-start, error: e.message };
  }
}
