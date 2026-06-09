# NEXUSAGRI — FIRESTORE SCHEMA v1.0
**Status:** FINAL untuk Fase 0–2. Fase 3+ akan menambahkan koleksi baru.
**Aturan:** Semua field baru harus didokumentasikan di sini sebelum diimplementasikan.

---

## KOLEKSI: users/{userId}

```
users/{userId}
├── profile
│   ├── name: string
│   ├── phone: string (format: +62...)
│   ├── email: string | null
│   ├── tier: 'STARTER'|'PETANI'|'PETERNAK_PRO'|'OMEGA_ELITE'|'TRADER'
│   ├── userType: 'peternak'|'petani'|'pembudidaya'|'pedagang'|'koperasi'
│   ├── region: string (nama kecamatan/kota)
│   ├── regionCode: string (kode wilayah)
│   ├── avatarUrl: string | null
│   └── createdAt: timestamp
│
├── scores
│   ├── farmScore: number (0–100, 1 desimal)
│   ├── tradeScore: number | null
│   ├── lastCalculated: timestamp
│   ├── dimensions
│   │   ├── health: number
│   │   ├── productivity: number
│   │   ├── consistency: number
│   │   ├── verification: number
│   │   ├── financial: number
│   │   └── community: number
│   └── dataPointsUsed: number
│
├── financial
│   ├── omegaCoinBalance: number
│   ├── kreditLevel: 'none'|'basic'|'standard'|'premium'
│   ├── totalOrgCreditSubmitted: number (gram)
│   └── subscriptionExpiresAt: timestamp | null
│
├── settings
│   ├── language: 'id'|'en'|'ms'
│   ├── notifPrefs
│   │   ├── healthAlerts: boolean
│   │   ├── marketUpdates: boolean
│   │   ├── communityUpdates: boolean
│   │   └── promotions: boolean
│   ├── engineMode: 'CORE'|'AI_ACTIVE'
│   └── privacyConsents
│       ├── shareWithBank: boolean
│       ├── shareWithGovernment: boolean
│       └── shareForResearch: boolean
│
└── _internal (tidak tampil ke user)
    ├── anomalyFlags: map
    ├── fraudScore: number | null
    └── lastAuditAt: timestamp
```

---

## KOLEKSI: animals/{animalId}

```
animals/{animalId}
├── ownerId: string (userId)
├── species: 'goat'|'cow'|'sheep'|'chicken_broiler'|'chicken_layer'|'duck'|'pig'|'fish_freshwater'|'shrimp'
├── breed: string
├── name: string | null (nama peliharaan opsional)
├── gender: 'male'|'female'|'unknown'
├── birthDate: timestamp | null
├── estimatedAge: string | null (jika birthDate tidak diketahui: '6 bulan', '2 tahun')
├── registryDate: timestamp
├── status: 'active'|'sold'|'dead'|'missing'
├── deathDate: timestamp | null
├── soldDate: timestamp | null
├── currentWeight: number | null (kg)
├── lastWeighDate: timestamp | null
├── healthStatus: 'normal'|'waspada'|'siaga'|'darurat'|'kritis'
├── lastHealthCheck: timestamp | null
├── vaccineHistory: [{ vaccine: string, date: timestamp, nextDue: timestamp }]
├── qrCode: string (format: NXA-{SPECIES_2}-{6_CHAR_ID})
├── qrTagStatus: 'active'|'inactive'|'transferred'
├── photos: [{ url: string, uploadedAt: timestamp }]
├── location
│   ├── region: string
│   ├── kandangId: string | null
│   └── gpsLat: number | null  ← RESTRICTED privacy tier
│   └── gpsLng: number | null  ← RESTRICTED privacy tier
└── _updatedAt: timestamp
```

---

## KOLEKSI: dailyLogs/{logId}

```
dailyLogs/{logId}
├── animalId: string
├── userId: string
├── timestamp: number (client time — Unix ms)
├── _serverTimestamp: timestamp (server time — untuk drift detection)
├── weight: number | null (kg)
├── feedAmount: number | null (kg)
├── feedType: string | null
├── waterConsumption: number | null (liter)
├── healthNotes: string | null
├── symptoms: [string] | null
├── temperature: number | null (°C)
├── behaviorNotes: string | null
├── photos: [string] (URLs)
├── source: 'manual'|'voice'|'ambassador'|'sensor'
├── region: string (denormalized untuk community benchmark)
├── species: string (denormalized untuk community benchmark)
├── _verified: boolean (default: false, diubah oleh system)
└── _offlinePending: boolean (true jika masih belum tersync)
```

---

## KOLEKSI: healthChecks/{checkId}

```
healthChecks/{checkId}
├── animalId: string
├── userId: string
├── timestamp: timestamp
├── symptoms: [string]
├── photos: [string] (URLs untuk AI vision)
├── userDescription: string | null
├── omegaDiagnosis: string | null
├── omegaConfidence: number | null (0–1)
├── omegaHypotheses: [{ condition: string, probability: number }] | null
├── recommendedAction: string | null
├── alertLevel: 'normal'|'waspada'|'siaga'|'darurat'|'kritis'
├── nexusVetRequested: boolean
├── resolvedAt: timestamp | null
└── _updatedAt: timestamp
```

---

## KOLEKSI: organicCredits/{creditId}

```
organicCredits/{creditId}
├── userId: string
├── materialType: 'kotoran_sapi'|'kotoran_kambing'|'kotoran_ayam'|'sisa_pakan'|'biomassa_lain'
├── submittedWeight: number (gram — estimasi user)
├── finalWeight: number | null (gram — ditimbang pabrik)
├── photos: [{ url: string, capturedAt: timestamp, hasWatermark: boolean }]
├── gpsLocation: { lat: number, lng: number } | null
├── locationVerified: 'gps'|'network'|'manual'|'pending'
├── status: 'pending'|'ai_review'|'manual_queue'|'approved'|'rejected'
├── aiReviewResult: string | null
├── aiConfidence: number | null
├── estimatedCredit: number | null (Omega Coin)
├── finalCredit: number | null (Omega Coin)
├── reviewedBy: string | null (userId admin)
├── rejectionReason: string | null
├── disputeStatus: 'none'|'open'|'resolved'
├── disputeNotes: string | null
└── _createdAt: timestamp
```

---

## KOLEKSI: transactions/{txId}

```
transactions/{txId}
├── type: 'subscription'|'hardware'|'organic_credit'|'marketplace'|'top_up'|'referral'
├── fromUserId: string
├── toUserId: string | 'system'
├── amount: number
├── currency: 'IDR'|'OMEGA_COIN'
├── status: 'pending'|'completed'|'disputed'|'refunded'|'cancelled'
├── metadata: {
│   ├── marketplaceListingId: string | null
│   ├── creditId: string | null
│   ├── hardwareSku: string | null
│   ├── tierUpgradedTo: string | null
│   └── midtransOrderId: string | null
│   }
├── _createdAt: timestamp
└── _updatedAt: timestamp
```

---

## KOLEKSI: marketplaceListings/{listingId}

```
marketplaceListings/{listingId}
├── sellerId: string
├── animalId: string
├── askingMethod: 'negotiate' (selalu negotiate — tidak ada fixed price)
├── priceHint: 'low'|'market'|'premium' | null (petunjuk harga tanpa angka)
├── healthSummary: string
├── vaccineHistory: [{ vaccine: string, date: timestamp }]
├── farmScoreAtListing: number
├── photos: [string]
├── description: string | null
├── status: 'active'|'sold'|'withdrawn'|'expired'
├── views: number
├── contacts: number
├── expiresAt: timestamp (30 hari dari createdAt)
├── transitLockUserId: string | null  ← Transit Mode
├── transitLockExpiry: timestamp | null
├── lockVersion: number (optimistic locking — increment setiap update)
└── _createdAt: timestamp
```

---

## KOLEKSI: auditLog/{logId}

> **IMMUTABLE — Tidak ada update, tidak ada delete, tidak ada pengecualian.**

```
auditLog/{logId}
├── actorId: string (userId atau 'system')
├── actingFor: string | null (jika bertindak atas nama user lain)
├── action: string (contoh: 'ANIMAL_REGISTERED', 'FARM_SCORE_CALCULATED', 'ANOMALY_DETECTED')
├── collection: string
├── documentId: string
├── before: map | null (state sebelum perubahan)
├── after: map | null (state setelah perubahan)
├── source: 'user'|'system'|'admin'|'omega'
├── timestamp: number (Unix ms)
└── _immutable: true (marker)
```

---

## KOLEKSI: system_status/{module}

```
system_status/{module}
├── circuitBreakerState: 'CLOSED'|'OPEN'|'HALF_OPEN'
├── failureCount: number
├── lastFailure: number | null
├── lastCheck: timestamp
├── lastError: string | null
└── updatedAt: timestamp
```

---

## ATURAN SCHEMA

1. Tidak ada field yang bisa dihapus dari schema yang sudah production — hanya bisa deprecated dengan prefix `_deprecated_`
2. Field baru harus nullable dengan default `null` untuk backward compatibility
3. Tidak ada nested array di dalam array (Firestore limitation)
4. Timestamp yang penting: selalu simpan dua versi — client (`timestamp`) dan server (`_serverTimestamp`)
5. Privacy fields (GPS, identitas sensitif): hanya dalam field yang punya Privacy Tier RESTRICTED atau lebih tinggi
