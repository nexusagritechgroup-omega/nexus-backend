// config/pricing.js
// Single source of truth untuk semua harga dan limit tier.
// Jangan hardcode harga di tempat lain — selalu import dari sini.

export const TIERS = {
  STARTER: {
    id: 'STARTER',
    label: 'Starter',
    price: 0,
    pricePerDay: 0,
    currency: 'IDR',
    limits: {
      animals: 5,
      healthChecksPerMonth: 3,
      omegaChatPerMonth: 0,
      aiVisionPerMonth: 0,
      marketplaceListings: 2,
      analyticsHistory: 0,       // hari
      weatherForecast: 1,        // hari ke depan
    },
    features: {
      hasOmegaChat: false,
      hasAiVision: false,
      hasQrBackup: false,
      hasCommunityChat: false,
      hasAiProactive: false,
      hasMarketplacePriority: false,
      showsAds: true,
      hardwareDiscount: 0,
    },
  },

  PETANI: {
    id: 'PETANI',
    label: 'Petani',
    price: 149_000,
    pricePerDay: 4_967,
    currency: 'IDR',
    limits: {
      animals: Infinity,
      healthChecksPerMonth: Infinity,
      omegaChatPerMonth: 100,
      aiVisionPerMonth: 5,
      marketplaceListings: 10,
      analyticsHistory: 7,
      weatherForecast: 3,
    },
    features: {
      hasOmegaChat: true,
      hasAiVision: true,
      hasQrBackup: true,
      hasCommunityChat: false,
      hasAiProactive: false,
      hasMarketplacePriority: false,
      showsAds: false,
      hardwareDiscount: 0,
    },
  },

  PETERNAK_PRO: {
    id: 'PETERNAK_PRO',
    label: 'Peternak Pro',
    price: 299_000,
    pricePerDay: 9_967,
    currency: 'IDR',
    limits: {
      animals: Infinity,
      healthChecksPerMonth: Infinity,
      omegaChatPerMonth: Infinity,
      aiVisionPerMonth: Infinity,
      marketplaceListings: Infinity,
      analyticsHistory: 15,
      weatherForecast: 5,
    },
    features: {
      hasOmegaChat: true,
      hasAiVision: true,
      hasQrBackup: true,
      hasCommunityChat: true,
      hasAiProactive: true,
      hasMarketplacePriority: false,
      showsAds: false,
      hardwareDiscount: 0.10,  // 10%
    },
  },

  OMEGA_ELITE: {
    id: 'OMEGA_ELITE',
    label: 'Omega Elite',
    price: 599_000,
    pricePerDay: 19_967,
    currency: 'IDR',
    limits: {
      animals: Infinity,
      healthChecksPerMonth: Infinity,
      omegaChatPerMonth: Infinity,
      aiVisionPerMonth: Infinity,
      marketplaceListings: Infinity,
      analyticsHistory: 30,
      weatherForecast: 7,
    },
    features: {
      hasOmegaChat: true,
      hasAiVision: true,
      hasQrBackup: true,
      hasCommunityChat: true,
      hasAiProactive: true,
      hasMarketplacePriority: true,
      showsAds: false,
      hardwareDiscount: 0.50,  // 50%
      freeQrTagsPerMonth: 5,
    },
  },

  TRADER: {
    id: 'TRADER',
    label: 'Trader',
    price: 99_000,
    pricePerDay: 3_300,
    currency: 'IDR',
    limits: {
      animals: 0,  // pedagang tidak punya ternak sendiri di platform
      quickAssessmentPerMonth: Infinity,
      marketplaceListings: Infinity,
      analyticsHistory: 14,
    },
    features: {
      hasTransitMode: true,
      hasTradeScore: true,
      hasMarketWisdom: true,
      hasTripCalculator: true,
      hasPriceArbitrage: true,
      showsAds: false,
    },
  },
};

export const TIER_ORDER = {
  STARTER: 0,
  PETANI: 1,
  PETERNAK_PRO: 2,
  OMEGA_ELITE: 3,
  TRADER: 1,  // setara PETANI untuk akses dasar
};

// Cek apakah user boleh akses fitur tertentu
export function canAccess(userTier, feature) {
  const tier = TIERS[userTier];
  if (!tier) return false;
  return tier.features[feature] === true || tier.limits[feature] === Infinity;
}

// Cek apakah user masih dalam limit
export function withinLimit(userTier, limitKey, currentCount) {
  const tier = TIERS[userTier];
  if (!tier) return false;
  const limit = tier.limits[limitKey];
  if (limit === undefined) return true;
  if (limit === Infinity) return true;
  return currentCount < limit;
}

// Hardware pricing
export const HARDWARE = {
  QR_EAR_TAG_5PCS:    { price: 125_000, recurringMonthly: 15_000, cogs: 15_000 },
  QR_PLANT_TAG_10PCS: { price: 200_000, recurringMonthly: 10_000, cogs: 20_000 },
  QR_AQUA_TAG_5PCS:   { price: 150_000, recurringMonthly: 15_000, cogs: 20_000 },
  SMART_MEASURE_TAPE: { price:  35_000, recurringMonthly: 0,      cogs:  8_000 },
  TRANSIT_TAG_5PCS:   { price:  35_000, recurringMonthly:  5_000, cogs: 10_000 },
  NUTRISI_BLOCK:      { price:  45_000, recurringMonthly: 0,      cogs: 15_000 },
  STARTER_KIT:        { price: 299_000, recurringMonthly: 15_000, cogs: 73_000 },
};
