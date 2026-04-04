/**
 * merchandising.ts — Phase 2: Homepage Merchandising Logic
 *
 * Pure, stateless helper functions for resolving homepage section membership:
 *   - Yeni (new arrivals)
 *   - Popüler (manually flagged popular)
 *   - Çok Satanlar (bestsellers by score + pin/exclude)
 *   - Fırsatlar (manually flagged deals)
 *   - İndirimli Ürünler (automatic: originalPrice > price)
 *
 * Design goals:
 *   - No side effects — takes product data + settings, returns boolean/list
 *   - Legacy-safe: null/undefined workflow fields fall back to status-based checks
 *   - Soldout exclusion: central rule applied across all sections
 *   - Deterministic bestseller scoring from Phase 1 merchandising fields
 *
 * Used by:
 *   - Future: homepage API route, storefront data fetching
 *   - Future: Telegram merchandising commands
 *   - Future: merchandising sync cron job
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal product shape required by merchandising helpers.
 * Uses optional fields throughout for legacy compatibility —
 * products created before Phase 1 will have null workflow/merchandising groups.
 */
export type MerchandisableProduct = {
  id: string | number
  status?: string | null                 // 'active' | 'soldout' | 'draft'
  price?: number | null
  originalPrice?: number | null
  workflow?: {
    sellable?: boolean | null
    workflowStatus?: string | null
    stockState?: string | null
  } | null
  merchandising?: {
    publishedAt?: string | Date | null
    newUntil?: string | Date | null
    manualPopular?: boolean | null
    manualDeal?: boolean | null
    bestSellerPinned?: boolean | null
    bestSellerExcluded?: boolean | null
    homepageHidden?: boolean | null
    totalUnitsSold?: number | null
    recentUnitsSold7d?: number | null
    recentUnitsSold30d?: number | null
    bestSellerScore?: number | null
    lastMerchandisingSyncAt?: string | Date | null
  } | null
}

/**
 * Snapshot of HomepageMerchandisingSettings global.
 * All fields optional — absence treated as safe default.
 */
export type MerchandisingSettings = {
  sectionToggles?: {
    enableYeni?: boolean | null
    enablePopular?: boolean | null
    enableBestSellers?: boolean | null
    enableDeals?: boolean | null
    enableDiscounted?: boolean | null
  } | null
  itemLimits?: {
    yeniLimit?: number | null
    popularLimit?: number | null
    bestSellerLimit?: number | null
    dealLimit?: number | null
    discountedLimit?: number | null
  } | null
  timing?: {
    newWindowDays?: number | null
  } | null
  bestSellerScoring?: {
    bestSellerRecentWeight7d?: number | null
    bestSellerRecentWeight30d?: number | null
    bestSellerMinimumScore?: number | null
  } | null
  behavior?: {
    hideEmptySections?: boolean | null
    allowPinnedOverrides?: boolean | null
  } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  newWindowDays: 7,
  yeniLimit: 8,
  popularLimit: 8,
  bestSellerLimit: 8,
  dealLimit: 4,
  discountedLimit: 8,
  bestSellerRecentWeight7d: 3,
  bestSellerRecentWeight30d: 1,
  bestSellerMinimumScore: 1,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Core Eligibility — Soldout Exclusion + Homepage Visibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Central eligibility gate applied to ALL homepage merchandising sections.
 *
 * A product is eligible for homepage sections if:
 *   1. status === 'active' (not soldout, not draft)
 *   2. sellable is true (or null for legacy fallback — see below)
 *   3. not hidden from homepage (merchandising.homepageHidden !== true)
 *
 * Legacy compatibility:
 *   Products created before Phase 1 will have workflow.sellable === null/undefined.
 *   For these, we fall back to status === 'active' as the sellable indicator.
 *   This preserves existing active products in homepage sections without requiring
 *   a backfill migration.
 */
export function isHomepageEligible(product: MerchandisableProduct): boolean {
  // Must be active
  if (product.status !== 'active') return false

  // Soldout exclusion via workflow.stockState
  if (product.workflow?.stockState === 'sold_out') return false

  // Sellable check with legacy fallback
  // If workflow.sellable is explicitly false → exclude
  // If workflow.sellable is null/undefined → trust status === 'active' (legacy compat)
  if (product.workflow?.sellable === false) return false

  // Homepage hidden override
  if (product.merchandising?.homepageHidden === true) return false

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Membership Checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Yeni (New Arrivals)
 *
 * Rule:
 *   - Homepage eligible
 *   - merchandising.publishedAt exists
 *   - current date <= merchandising.newUntil
 *
 * If newUntil is not set, falls back to publishedAt + newWindowDays from settings.
 */
export function isNewProduct(
  product: MerchandisableProduct,
  settings?: MerchandisingSettings | null,
  now?: Date,
): boolean {
  if (!isHomepageEligible(product)) return false

  const publishedAt = product.merchandising?.publishedAt
  if (!publishedAt) return false

  const currentDate = now ?? new Date()

  // If newUntil is explicitly set, use it directly
  const newUntil = product.merchandising?.newUntil
  if (newUntil) {
    return currentDate <= new Date(newUntil)
  }

  // Fallback: calculate from publishedAt + newWindowDays
  const windowDays = settings?.timing?.newWindowDays ?? DEFAULTS.newWindowDays
  const publishedDate = new Date(publishedAt)
  const expiryDate = new Date(publishedDate)
  expiryDate.setDate(expiryDate.getDate() + windowDays)

  return currentDate <= expiryDate
}

/**
 * Popüler (Popular — manual flag)
 *
 * Rule:
 *   - Homepage eligible
 *   - merchandising.manualPopular === true
 */
export function isPopularProduct(product: MerchandisableProduct): boolean {
  if (!isHomepageEligible(product)) return false
  return product.merchandising?.manualPopular === true
}

/**
 * Çok Satanlar (Bestsellers — score-based + pin/exclude)
 *
 * Rule:
 *   - Homepage eligible
 *   - NOT bestSellerExcluded
 *   - Either bestSellerPinned === true (always qualifies)
 *   - Or bestSellerScore >= minimumScore from settings
 */
export function isBestSellerProduct(
  product: MerchandisableProduct,
  settings?: MerchandisingSettings | null,
): boolean {
  if (!isHomepageEligible(product)) return false
  if (product.merchandising?.bestSellerExcluded === true) return false

  // Pinned products always qualify
  if (product.merchandising?.bestSellerPinned === true) return true

  // Score-based qualification
  const score = product.merchandising?.bestSellerScore ?? 0
  const minScore = settings?.bestSellerScoring?.bestSellerMinimumScore ?? DEFAULTS.bestSellerMinimumScore
  return score >= minScore
}

/**
 * Fırsatlar (Deals — manual flag)
 *
 * Rule:
 *   - Homepage eligible
 *   - merchandising.manualDeal === true
 */
export function isDealProduct(product: MerchandisableProduct): boolean {
  if (!isHomepageEligible(product)) return false
  return product.merchandising?.manualDeal === true
}

/**
 * İndirimli Ürünler (Discounted — automatic)
 *
 * Rule:
 *   - Homepage eligible
 *   - originalPrice exists and is > price
 *   - price > 0 (safety — avoid division-by-zero edge cases downstream)
 */
export function isDiscountedProduct(product: MerchandisableProduct): boolean {
  if (!isHomepageEligible(product)) return false

  const price = product.price
  const originalPrice = product.originalPrice
  if (!price || price <= 0) return false
  if (!originalPrice || originalPrice <= price) return false

  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Bestseller Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate bestseller score for a product.
 *
 * Formula:
 *   score = totalUnitsSold
 *         + (recentUnitsSold7d * weight7d)
 *         + (recentUnitsSold30d * weight30d)
 *
 * Returns 0 for products with no sales data.
 * This is a pure calculation — does NOT write back to the product.
 */
export function calculateBestSellerScore(
  product: MerchandisableProduct,
  settings?: MerchandisingSettings | null,
): number {
  const total = product.merchandising?.totalUnitsSold ?? 0
  const recent7d = product.merchandising?.recentUnitsSold7d ?? 0
  const recent30d = product.merchandising?.recentUnitsSold30d ?? 0

  const weight7d = settings?.bestSellerScoring?.bestSellerRecentWeight7d ?? DEFAULTS.bestSellerRecentWeight7d
  const weight30d = settings?.bestSellerScoring?.bestSellerRecentWeight30d ?? DEFAULTS.bestSellerRecentWeight30d

  return total + (recent7d * weight7d) + (recent30d * weight30d)
}

// ─────────────────────────────────────────────────────────────────────────────
// New Window Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate publishedAt and newUntil for a product becoming active.
 *
 * Returns the two date values that should be written to product.merchandising
 * when a product transitions to active/published state.
 *
 * This is a pure helper — does NOT write to the database.
 * The caller (hook or command handler) is responsible for persisting.
 */
export function calculateNewWindow(
  settings?: MerchandisingSettings | null,
  publishDate?: Date,
): { publishedAt: string; newUntil: string } {
  const now = publishDate ?? new Date()
  const windowDays = settings?.timing?.newWindowDays ?? DEFAULTS.newWindowDays

  const newUntil = new Date(now)
  newUntil.setDate(newUntil.getDate() + windowDays)

  return {
    publishedAt: now.toISOString(),
    newUntil: newUntil.toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Membership Resolution — Homepage Section Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Yeni (new arrivals) products from a list.
 *
 * Sorted by publishedAt descending (newest first).
 * Respects section toggle and limit from settings.
 */
export function getYeniProducts(
  products: MerchandisableProduct[],
  settings?: MerchandisingSettings | null,
  now?: Date,
): MerchandisableProduct[] {
  if (settings?.sectionToggles?.enableYeni === false) return []

  const limit = settings?.itemLimits?.yeniLimit ?? DEFAULTS.yeniLimit

  return products
    .filter((p) => isNewProduct(p, settings, now))
    .sort((a, b) => {
      const dateA = a.merchandising?.publishedAt ? new Date(a.merchandising.publishedAt).getTime() : 0
      const dateB = b.merchandising?.publishedAt ? new Date(b.merchandising.publishedAt).getTime() : 0
      return dateB - dateA // newest first
    })
    .slice(0, limit)
}

/**
 * Get Popüler products from a list.
 *
 * No specific sort order — admin-flagged products appear in original order.
 * Respects section toggle and limit from settings.
 */
export function getPopularProducts(
  products: MerchandisableProduct[],
  settings?: MerchandisingSettings | null,
): MerchandisableProduct[] {
  if (settings?.sectionToggles?.enablePopular === false) return []

  const limit = settings?.itemLimits?.popularLimit ?? DEFAULTS.popularLimit

  return products
    .filter((p) => isPopularProduct(p))
    .slice(0, limit)
}

/**
 * Get Çok Satanlar (bestsellers) from a list.
 *
 * Pinned products appear first (if allowPinnedOverrides is true or unset),
 * then sorted by bestSellerScore descending.
 * Respects section toggle and limit from settings.
 */
export function getBestSellerProducts(
  products: MerchandisableProduct[],
  settings?: MerchandisingSettings | null,
): MerchandisableProduct[] {
  if (settings?.sectionToggles?.enableBestSellers === false) return []

  const limit = settings?.itemLimits?.bestSellerLimit ?? DEFAULTS.bestSellerLimit
  const allowPinned = settings?.behavior?.allowPinnedOverrides !== false

  const eligible = products.filter((p) => isBestSellerProduct(p, settings))

  // Sort: pinned first (if allowed), then by score descending
  eligible.sort((a, b) => {
    if (allowPinned) {
      const aPinned = a.merchandising?.bestSellerPinned === true ? 1 : 0
      const bPinned = b.merchandising?.bestSellerPinned === true ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned // pinned first
    }

    const scoreA = a.merchandising?.bestSellerScore ?? 0
    const scoreB = b.merchandising?.bestSellerScore ?? 0
    return scoreB - scoreA // highest score first
  })

  return eligible.slice(0, limit)
}

/**
 * Get Fırsatlar (deals) products from a list.
 *
 * Respects section toggle and limit from settings.
 */
export function getDealProducts(
  products: MerchandisableProduct[],
  settings?: MerchandisingSettings | null,
): MerchandisableProduct[] {
  if (settings?.sectionToggles?.enableDeals === false) return []

  const limit = settings?.itemLimits?.dealLimit ?? DEFAULTS.dealLimit

  return products
    .filter((p) => isDealProduct(p))
    .slice(0, limit)
}

/**
 * Get İndirimli Ürünler (discounted) from a list.
 *
 * Sorted by discount percentage descending (biggest discount first).
 * Respects section toggle and limit from settings.
 */
export function getDiscountedProducts(
  products: MerchandisableProduct[],
  settings?: MerchandisingSettings | null,
): MerchandisableProduct[] {
  if (settings?.sectionToggles?.enableDiscounted === false) return []

  const limit = settings?.itemLimits?.discountedLimit ?? DEFAULTS.discountedLimit

  return products
    .filter((p) => isDiscountedProduct(p))
    .sort((a, b) => {
      // Sort by discount percentage descending
      const discountA = getDiscountPercentage(a)
      const discountB = getDiscountPercentage(b)
      return discountB - discountA
    })
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate discount percentage for sorting purposes.
 * Returns 0 if no valid discount exists.
 */
function getDiscountPercentage(product: MerchandisableProduct): number {
  const price = product.price
  const originalPrice = product.originalPrice
  if (!price || price <= 0 || !originalPrice || originalPrice <= price) return 0
  return ((originalPrice - price) / originalPrice) * 100
}

/**
 * Resolve all homepage sections at once.
 *
 * Convenience wrapper that returns all five sections in a single call.
 * Useful for the homepage API route to fetch all sections in one pass.
 */
export function resolveHomepageSections(
  products: MerchandisableProduct[],
  settings?: MerchandisingSettings | null,
  now?: Date,
): {
  yeni: MerchandisableProduct[]
  popular: MerchandisableProduct[]
  bestSellers: MerchandisableProduct[]
  deals: MerchandisableProduct[]
  discounted: MerchandisableProduct[]
} {
  return {
    yeni: getYeniProducts(products, settings, now),
    popular: getPopularProducts(products, settings),
    bestSellers: getBestSellerProducts(products, settings),
    deals: getDealProducts(products, settings),
    discounted: getDiscountedProducts(products, settings),
  }
}
