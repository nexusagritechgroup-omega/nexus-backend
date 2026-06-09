// api/chat.js
// Proxy OpenRouter API — SEMUA AI request harus lewat sini.
// Tidak ada API key di client-side. Tidak pernah.
// OpenRouter mendukung Claude Sonnet, Haiku, dan fallback ke model lain.

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

// Model routing berdasarkan priority
const MODEL_MAP = {
  CRITICAL_HEALTH: 'anthropic/claude-sonnet-4-5',   // selalu pakai Sonnet untuk kesehatan
  HIGH:            'anthropic/claude-sonnet-4-5',
  NORMAL:          'anthropic/claude-haiku-4-5',     // Haiku untuk task normal — lebih hemat
  LOW:             'anthropic/claude-haiku-4-5',
};

// Fallback jika model utama tidak tersedia
const FALLBACK_MODEL = 'openai/gpt-4o-mini';

// Budget tracking — CRITICAL_HEALTH selalu lolos
const MONTHLY_BUDGET_USD  = parseFloat(process.env.OPENROUTER_MONTHLY_BUDGET || '50');
const CRITICAL_RESERVE_PCT = 0.10; // 10% selalu diisolasi untuk CRITICAL_HEALTH

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Hanya POST' } });
  }

  const requestId = crypto.randomUUID();

  try {
    // ─── AUTH GATE ──────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Token autentikasi diperlukan' },
        meta: { requestId },
      });
    }

    // ─── PARSE BODY ─────────────────────────────────────────────
    const {
      messages,
      systemPrompt,
      priority = 'NORMAL',
      maxTokens = 1000,
      context,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Field messages wajib ada dan tidak boleh kosong' },
        meta: { requestId },
      });
    }

    // ─── BUDGET CHECK (kecuali CRITICAL_HEALTH) ─────────────────
    if (priority !== 'CRITICAL_HEALTH') {
      const usable = MONTHLY_BUDGET_USD * (1 - CRITICAL_RESERVE_PCT);
      // TODO: fetch currentSpendUSD dari Firestore / Redis
      // const currentSpend = await getCurrentMonthSpend();
      // if (priority === 'LOW' && currentSpend >= usable * 0.90) {
      //   return res.status(503).json({ ... budget exceeded ... });
      // }
    }

    // ─── MODEL SELECTION ────────────────────────────────────────
    const model = MODEL_MAP[priority] || MODEL_MAP.NORMAL;

    // ─── SLIDING WINDOW — maks 10 turn ──────────────────────────
    const trimmedMessages = messages.slice(-10);

    // ─── BUILD OPENROUTER PAYLOAD ────────────────────────────────
    const payload = {
      model,
      max_tokens: Math.min(maxTokens, 2000),
      messages: [
        // System prompt sebagai message pertama jika ada
        ...(systemPrompt
          ? [{ role: 'system', content: systemPrompt }]
          : [{ role: 'system', content: buildDefaultSystem(context) }]
        ),
        ...trimmedMessages,
      ],
      // OpenRouter-specific headers
      route: 'fallback',           // auto-fallback ke model lain jika primary down
    };

    // ─── CALL OPENROUTER ────────────────────────────────────────
    const startTime = Date.now();
    const response  = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer':    process.env.APP_URL || 'https://nexusagri.id',
        'X-Title':         'NexusAgri Omega AI',
      },
      body: JSON.stringify(payload),
    });

    const processingMs = Date.now() - startTime;
    const data         = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || `OpenRouter error ${response.status}`;
      throw new Error(errMsg);
    }

    // ─── EXTRACT RESPONSE ────────────────────────────────────────
    const text = data.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('Empty response from model');

    // ─── SANITIZE OUTPUT ─────────────────────────────────────────
    const sanitized = sanitizeOutput(text);

    // ─── USAGE TRACKING ──────────────────────────────────────────
    const usage = data.usage || {};
    // TODO: await trackUsage(usage, priority, model);

    return res.status(200).json({
      success: true,
      data: {
        response:     sanitized,
        model:        data.model || model,
        inputTokens:  usage.prompt_tokens     || 0,
        outputTokens: usage.completion_tokens || 0,
        priority,
      },
      meta: {
        requestId,
        timestamp:    Date.now(),
        processingMs,
        omegaVersion: '1.0',
      },
    });

  } catch (err) {
    console.error('[api/chat] Error:', err?.message);

    // Circuit breaker hint untuk client
    const isServiceDown = err?.message?.includes('503') || err?.message?.includes('overloaded');
    return res.status(isServiceDown ? 503 : 500).json({
      success: false,
      error: {
        code:    isServiceDown ? 'CIRCUIT_OPEN' : 'INTERNAL_ERROR',
        message: 'Layanan AI sedang tidak tersedia. Fitur dasar tetap aktif.',
      },
      meta: { requestId, timestamp: Date.now() },
    });
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────

function buildDefaultSystem(context) {
  const ctx = context || {};
  return `Kamu adalah Omega, AI partner dari NexusAgri — platform ekosistem hayati Indonesia.
Kamu adalah partner operasional peternak dan petani, bukan asisten umum.
Bahasa: Indonesia yang hangat, lugas, dan manusiawi. Tidak menggurui.
Selalu akhiri dengan next action yang konkret.

DATA FARM USER:
- Nama: ${ctx.ownerName || 'Peternak'}
- Wilayah: ${ctx.region || 'Jawa Timur'}
- Spesies utama: ${ctx.primarySpecies || '-'}
- Jumlah hewan aktif: ${ctx.animalCount || 0}
- Farm Score: ${ctx.farmScore || 'belum terhitung'}
- Tier: ${ctx.tier || 'STARTER'}

ATURAN WAJIB:
- Tidak pernah sebut dosis obat/vaksin tanpa berat hewan yang diketahui
- Tidak pernah buat diagnosis penyakit zoonosis — selalu arahkan ke drh
- Tidak pernah prediksi harga yang "pasti" — selalu gunakan range dan disclaimer
- Confidence < 70% untuk diagnosis → tampilkan sebagai hipotesis, bukan fakta`.trim();
}

function sanitizeOutput(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}
