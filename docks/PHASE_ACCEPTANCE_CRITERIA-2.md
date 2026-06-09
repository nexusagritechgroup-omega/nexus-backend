# NEXUSAGRI — PHASE ACCEPTANCE CRITERIA (COMPLETE v2)
**Status:** Fase 0–6 lengkap | 41 test cases total
**Aturan:** Tidak ada deploy sebelum semua test di fase tersebut lulus.

Status: ⬜ Belum | ✅ Lulus | ❌ Gagal

---

# FASE 0 & 1 — FONDASI + LOOP FARM MVP
*(Detail lengkap lihat PHASE_ACCEPTANCE_CRITERIA_v1.md — 10 test cases)*

**Gate Fase 0:** Security Rules, API proxy, circuit breaker, offline baseline
**Gate Fase 1:** Auth, registry, daily log, health check, Farm Score, QR, tier limit, performance

---

# FASE 2 — TRUST & RETENTION

## Acceptance Criteria
```
AC-2.1 TRUST SCAFFOLDING
[ ] Export JSON berjalan dalam < 30 detik, berisi semua koleksi user
[ ] Farm Score panel: 6 dimensi dengan nilai + bobot + penjelasan
[ ] Privacy consents update tersimpan ke Firestore
[ ] Settings menampilkan tanggal bergabung dan info akun dengan benar

AC-2.2 OMEGA CONFIDENCE
[ ] Setiap health diagnosis tampilkan confidence (Tinggi/Sedang/Rendah)
[ ] Confidence < 70% → disclaimer "konsultasi drh" tampil
[ ] Omega tidak pernah menyebut diagnosis zoonosis atau dosis obat keras

AC-2.3 RETENTION
[ ] Banner re-engagement muncul setelah 3+ hari tanpa log
[ ] Banner tidak muncul jika sudah log hari ini
[ ] Grace period 30 hari aktif setelah subscription expired
[ ] Notif "X hari lagi berakhir" tampil jika < 7 hari
```

## Test Cases (7)
```
TEST-2-001: Export data JSON ⬜
  Profil → Data & Privasi → Export → file JSON terdownload lengkap

TEST-2-002: Farm Score panel ⬜
  Tap Farm Score di Profil → 6 dimensi tampil dengan breakdown benar

TEST-2-003: Omega confidence tinggi ⬜
  Health check gejala jelas + suhu terukur → "Keyakinan: Tinggi (>80%)"

TEST-2-004: Omega confidence rendah ⬜
  Health check satu gejala ambigu → disclaimer drh tampil

TEST-2-005: Re-engagement banner ⬜
  Tidak log 3 hari → banner muncul di Command Center

TEST-2-006: Grace period ⬜
  subscriptionExpiresAt kemarin → tier masih aktif + toast grace period

TEST-2-007: Privacy consent ⬜
  Toggle consent → Firestore settings.privacyConsents terupdate
```

---

# FASE 3 — ORGANIC CREDIT LITE

## Acceptance Criteria
```
AC-3.1 SUBMISSION FLOW
[ ] Form bisa diisi dengan 5+ pilihan material type
[ ] Foto wajib — tidak bisa submit tanpa foto
[ ] Submission tersimpan status 'pending' + audit log dibuat
[ ] User mendapat konfirmasi submit berhasil

AC-3.2 STATUS TRACKING
[ ] Riwayat submission tampil di screen Organic Credit
[ ] Status label jelas (Menunggu / Disetujui / Ditolak)
[ ] Rejected → alasan tampil di UI user
[ ] Approved → jumlah credit tampil

AC-3.3 ADMIN REVIEW (Nexus Core)
[ ] Antrian tampil di Nexus Core sidebar dengan count
[ ] Approve: credit diberikan + audit log + notif ke user
[ ] Reject: alasan wajib diisi + status berubah

AC-3.4 CREDIT LEDGER
[ ] Total OC Coin tampil di Financial Hub dan screen Organic Credit
```

## Test Cases (6)
```
TEST-3-001: Submission happy path ⬜
  Form lengkap + foto → status 'pending' di Firestore

TEST-3-002: Submit tanpa foto ⬜
  Kosongkan foto → error "Foto wajib"

TEST-3-003: Submit tanpa material ⬜
  Kosongkan dropdown → error "Pilih jenis material"

TEST-3-004: Admin approve ⬜
  Nexus Core → Approve → status 'approved' + audit log

TEST-3-005: Admin reject dengan alasan ⬜
  Nexus Core → Reject + alasan → status 'rejected' + alasan tersimpan

TEST-3-006: Reject tanpa alasan ⬜
  Nexus Core → Reject tanpa isi alasan → tidak bisa proceed
```

---

# FASE 4 — MARKETPLACE & TRANSIT

## Acceptance Criteria
```
AC-4.1 MARKETPLACE LISTING
[ ] Listing menampilkan Farm Score penjual otomatis
[ ] Listing tidak tampilkan harga absolut (hanya priceHint)
[ ] Filter spesies berjalan
[ ] Listing expire 30 hari

AC-4.2 TRANSIT — OPTIMISTIC LOCKING
[ ] Klaim berhasil: transitLockUserId terisi, lockVersion++
[ ] Dua user klaim bersamaan: hanya satu berhasil (race condition aman)
[ ] Sold: status animal → 'sold'
[ ] Transit expire 72 jam

AC-4.3 DISPUTE
[ ] Reason wajib diisi
[ ] Dispute tampil di Nexus Core
[ ] Admin resolve → audit log

AC-4.4 TRADE SCORE
[ ] Dikalkulasi dari completed vs disputed transactions
```

## Test Cases (6)
```
TEST-4-001: Buat listing ⬜
  Pilih hewan → Listing tampil di Marketplace dengan Farm Score penjual

TEST-4-002: Klaim transit ⬜
  Klaim listing → listing menunjukkan "Sedang dalam transit"

TEST-4-003: Race condition ⬜
  Dua akun klaim listing yang sama bersamaan → hanya satu berhasil

TEST-4-004: Release transit sold ⬜
  Release sebagai sold → animal.status = 'sold', listing.status = 'sold'

TEST-4-005: Dispute submission ⬜
  Buka dispute → alasan tersimpan → tampil di Nexus Core

TEST-4-006: Listing expire ⬜
  Set expiresAt ke masa lalu → listing tidak tampil di Marketplace
```

---

# FASE 5 — MONETISASI

## Acceptance Criteria
```
AC-5.1 SUBSCRIPTION
[ ] Tier saat ini ditandai "Aktif"
[ ] Payment → webhook settlement → profile.tier terupdate
[ ] subscriptionExpiresAt = +30 hari dari payment

AC-5.2 WEBHOOK SECURITY
[ ] Signature salah → 403
[ ] Webhook duplikat → hanya diproses sekali
[ ] Audit log dibuat setiap payment event

AC-5.3 OMEGA COIN
[ ] Balance tampil di Financial Hub
[ ] Top-up → balance terupdate setelah webhook
[ ] Balance tidak bisa negatif

AC-5.4 FEATURE GATING
[ ] STARTER: AI Chat tidak accessible, maks 5 hewan
[ ] PETANI: AI Chat 100 msg/bln
[ ] PETERNAK_PRO: AI Chat unlimited
```

## Test Cases (5)
```
TEST-5-001: Subscription upgrade ⬜
  Simulate webhook settlement → profile.tier terupdate + expiresAt +30 hari

TEST-5-002: Webhook idempotency ⬜
  Kirim webhook 2x → respons kedua: { status: 'already_processed' }

TEST-5-003: Webhook signature invalid ⬜
  Kirim signature salah → HTTP 403, tidak ada transaksi dibuat

TEST-5-004: STARTER tier limit ⬜
  Daftarkan hewan ke-6 → error tier limit

TEST-5-005: Feature gating AI Chat ⬜
  STARTER coba aktifkan Omega → tidak bisa atau prompt upgrade
```

---

# FASE 6 — OPS INTERNAL & SCALE

## Acceptance Criteria
```
AC-6.1 NEXUS CORE ADMIN
[ ] /admin diblokir untuk non-admin
[ ] Stats dashboard memuat: MAU, paying, MRR, hewan
[ ] OC queue: filter per status + approve + reject
[ ] Audit log viewer dengan filter action
[ ] Circuit breaker status tampil

AC-6.2 SERVICE WORKER
[ ] SW terdaftar saat platform pertama dibuka
[ ] Offline: platform tetap buka dari cache
[ ] Offline: offline banner tampil
[ ] Online kembali: sync queue otomatis

AC-6.3 OUTBREAK DETECTION
[ ] 5+ kasus DARURAT/KRITIS di wilayah dalam 7 hari → outbreak banner

AC-6.4 MARKET INTELLIGENCE
[ ] Cuaca hari ini dari Open-Meteo tampil (angka nyata)
[ ] 4+ komoditas harga tampil
[ ] AI mode: Market Wisdom Omega tampil

AC-6.5 NEXUS LEARN
[ ] 6 artikel tersedia dan bisa dibaca penuh
```

## Test Cases (7)
```
TEST-6-001: Nexus Core akses tidak sah ⬜
  Login user biasa → buka /admin → "Akses ditolak"

TEST-6-002: Nexus Core approve OC ⬜
  Admin approve → status approved + audit log

TEST-6-003: Service Worker offline shell ⬜
  Visit → Network offline → Refresh → halaman masih tampil

TEST-6-004: Offline log sync ⬜
  Offline → isi log → Online → log ada di Firestore

TEST-6-005: Market Intelligence cuaca ⬜
  Buka Harga & Cuaca → suhu tampil (angka nyata, bukan NaN)

TEST-6-006: Nexus Learn baca artikel ⬜
  Tap artikel → konten lengkap terbaca di modal

TEST-6-007: Market Wisdom AI ⬜
  AI mode aktif → Harga & Cuaca → Omega Market Wisdom tampil
```

---

# DEPLOYMENT GATE CHECKLIST

```
DEPLOYMENT GATE — NexusAgri
Tanggal    : _______________   Fase: _______________
Deployer   : _______________

WAJIB SEMUA ✅
[ ] Semua test cases fase ini lulus
[ ] Tidak ada API key di client-side code
[ ] Firebase Security Rules di-test dengan Emulator
[ ] Tidak ada console.error di Vercel logs
[ ] Platform jalan di HP Android 2GB + 3G 1Mbps

FINANSIAL (Fase 5+)
[ ] Webhook idempotency lulus (TEST-5-002)
[ ] Webhook signature lulus (TEST-5-003)
[ ] MIDTRANS_SERVER_KEY di Vercel env, bukan di code

ADMIN (Fase 6)
[ ] ADMIN_WHITELIST hardcoded (bukan dari Firestore)
[ ] Semua admin actions di audit log
[ ] Reject OC tanpa alasan tidak bisa

APPROVAL
[ ] Tech Lead : _______________________
[ ] Founder   : _______________________ (payment/prinsip)
```

---

# RINGKASAN

| Fase | Fitur | Tests | Status |
|------|-------|-------|--------|
| 0 | Fondasi, Security | 4 | ⬜ |
| 1 | Loop Farm MVP | 10 | ⬜ |
| 2 | Trust & Retention | 7 | ⬜ |
| 3 | Organic Credit Lite | 6 | ⬜ |
| 4 | Marketplace & Transit | 6 | ⬜ |
| 5 | Monetisasi | 5 | ⬜ |
| 6 | Ops & Scale | 7 | ⬜ |
| **Total** | | **41** | |
