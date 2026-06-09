# NEXUSAGRI — SETUP GUIDE

Platform Ekosistem Hayati Indonesia  
Born in Mojosari · Built for the World

---

## STACK

```
Frontend  : HTML/CSS/JS single-file (index.html) — no bundler
Backend   : Vercel Serverless Functions (api/)
Database  : Firebase Firestore (asia-southeast2)
Auth      : Firebase Authentication
Storage   : Firebase Storage
AI        : OpenRouter API → Claude Sonnet/Haiku (via /api/chat proxy)
Payments  : Midtrans
Hosting   : Vercel
```

---

## ENVIRONMENT VARIABLES (Vercel Dashboard)

| Variable | Nilai | Wajib |
|----------|-------|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` dari openrouter.ai | ✅ |
| `OPENROUTER_MONTHLY_BUDGET` | `50` (USD per bulan, default 50) | - |
| `MIDTRANS_SERVER_KEY` | `Mid-server-...` dari dashboard Midtrans | ✅ |
| `MIDTRANS_ENV` | `sandbox` atau `production` | ✅ |
| `CRON_SECRET` | string random 32 karakter | ✅ |
| `APP_URL` | `https://nexusagri.id` | - |
| `FIREBASE_PROJECT_ID` | dari Firebase console | ✅ (farmScore) |
| `FIREBASE_CLIENT_EMAIL` | service account email | ✅ (farmScore) |
| `FIREBASE_PRIVATE_KEY` | service account private key | ✅ (farmScore) |

**Tidak diperlukan lagi:** `ANTHROPIC_API_KEY` (diganti OpenRouter)

---

## SETUP CEPAT

### 1. OpenRouter
1. Daftar di [openrouter.ai](https://openrouter.ai)
2. Buat API key
3. Set di Vercel: `OPENROUTER_API_KEY=sk-or-v1-...`
4. Set budget opsional: `OPENROUTER_MONTHLY_BUDGET=50`

OpenRouter secara otomatis route ke:
- `anthropic/claude-sonnet-4-5` → request CRITICAL_HEALTH dan HIGH
- `anthropic/claude-haiku-4-5`  → request NORMAL dan LOW (lebih hemat)
- Fallback ke `openai/gpt-4o-mini` jika semua model Anthropic down

### 2. Firebase
1. Buat project di [console.firebase.google.com](https://console.firebase.google.com)
2. **Region:** `asia-southeast2` (wajib — UU PDP)
3. Aktifkan: Authentication (Email/Password), Firestore, Storage
4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
5. Copy Firebase config ke `index.html` dan `admin/index.html` bagian `FIREBASE_CONFIG`
6. Untuk farmScore Cloud Function: buat Service Account → download JSON → set env vars

### 3. Midtrans
1. Daftar di [midtrans.com](https://midtrans.com)
2. Ambil `Server Key` dari Dashboard
3. Set `MIDTRANS_ENV=sandbox` untuk testing, `production` saat go-live
4. Set Notification URL di Midtrans Dashboard: `https://nexusagri.id/api/webhook-midtrans`

### 4. Vercel Deploy
```bash
vercel --prod
```

---

## STRUKTUR FOLDER

```
nexusagri/
├── index.html                      ← Platform utama (3035+ baris, single-file)
├── sw.js                           ← Service Worker (offline-first)
├── vercel.json                     ← Deployment + cron config
├── README.md
├── PHASE_ACCEPTANCE_CRITERIA.md    ← 41 test cases semua fase
│
├── admin/
│   └── index.html                  ← Nexus Core internal dashboard
│
├── api/
│   ├── chat.js                     ← OpenRouter proxy (SEMUA AI req lewat sini)
│   ├── farmScore.js                ← Cloud Function — hitung Farm Score tiap malam
│   ├── create-payment.js           ← Buat Midtrans transaction token
│   ├── webhook-midtrans.js         ← Payment webhook (anti-spoofing + idempotency)
│   └── health.js                   ← Health check endpoint
│
├── adapters/
│   ├── DatabaseAdapter.js
│   ├── AuthAdapter.js
│   └── StorageAdapter.js
│
├── implementations/
│   ├── FirestoreImpl.js
│   ├── FirebaseAuthImpl.js
│   └── FirebaseStorageImpl.js
│
├── config/
│   ├── biologicalReference.js      ← BIO_REF 9 spesies (Trust Pyramid)
│   ├── pricing.js                  ← Tier limits + harga (single source of truth)
│   └── omegaPrompts.js             ← System prompts modular per konteks
│
├── utils/
│   ├── circuitBreaker.js
│   ├── trustValidator.js
│   ├── anomalyWatcher.js
│   └── offlineSync.js              ← IndexedDB offline queue management
│
├── schemas/
│   ├── FIRESTORE_SCHEMA.md
│   └── API_SCHEMA.md
│
└── rules/
    ├── firestore.rules
    └── storage.rules
```

---

## CARA KERJA AI (OpenRouter)

```
User action di browser
    ↓
index.html → callOmega()
    ↓
fetch('/api/chat', { Authorization: Bearer token })
    ↓
api/chat.js (Vercel serverless)
    ├── Verifikasi auth token
    ├── Check priority (CRITICAL_HEALTH / HIGH / NORMAL / LOW)
    ├── Route ke model yang tepat:
    │   CRITICAL_HEALTH → claude-sonnet-4-5
    │   HIGH            → claude-sonnet-4-5
    │   NORMAL          → claude-haiku-4-5   (lebih hemat)
    │   LOW             → claude-haiku-4-5
    ├── Sliding window: maks 10 turn history
    ↓
OpenRouter API (openrouter.ai)
    ├── Primary: anthropic/claude-sonnet-4-5 atau haiku
    └── Fallback: openai/gpt-4o-mini jika Anthropic down
    ↓
Response → sanitize → return ke client
```

**Critical Health Reserve:** Request CRITICAL_HEALTH tidak pernah di-block oleh budget check. 10% dari budget selalu terisolasi untuk ini.

---

## BUILD ORDER

```
Fase 0 — Fondasi          ✅ Selesai
Fase 1 — Loop Farm MVP    ✅ Selesai (auth, registry, log, health, score, QR)
Fase 2 — Trust & Retention  ⬜ Test 7 cases
Fase 3 — Organic Credit Lite ⬜ Test 6 cases
Fase 4 — Marketplace        ⬜ Test 6 cases
Fase 5 — Monetisasi         ⬜ Test 5 cases
Fase 6 — Ops & Scale        ⬜ Test 7 cases
```

Jalankan `PHASE_ACCEPTANCE_CRITERIA.md` sebelum setiap deploy.

---

## CHECKLIST SEBELUM GO-LIVE

```
[ ] OPENROUTER_API_KEY set di Vercel
[ ] MIDTRANS_SERVER_KEY set di Vercel + Notification URL di Midtrans dashboard
[ ] FIREBASE_CONFIG diisi di index.html dan admin/index.html
[ ] Firebase Security Rules di-deploy
[ ] Service Worker: test offline mode di browser
[ ] Test di HP Android RAM 2GB + 3G
[ ] Semua 41 test cases di PHASE_ACCEPTANCE_CRITERIA.md lulus
[ ] ADMIN_WHITELIST di admin/index.html diisi email tim
```

---

*NexusAgri — Fase 0-6 Complete*  
*AI: OpenRouter → Claude Sonnet/Haiku with automatic fallback*  
*Lahir di Mojosari. Dibangun untuk dunia.*
