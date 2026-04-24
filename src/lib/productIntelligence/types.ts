/**
 * productIntelligence/types.ts — D-220
 *
 * Shared types for the Product Intelligence Bot (PI Bot).
 *
 * The PI Bot:
 *   1. collects all available product images (original + AI gallery),
 *   2. asks Gemini vision to describe the product,
 *   3. attempts a reverse image search (falls back gracefully if no provider),
 *   4. generates an SEO + GEO content pack from the analysis + product data,
 *   5. stores everything in the `product-intelligence-reports` collection,
 *   6. waits for explicit operator approval in Telegram,
 *   7. hands off the approved pack to the existing GeoBot / publish pipeline.
 *
 * These types are used both server-side (library) and inside the Payload
 * collection's JSON fields. Field shapes are kept stable so the admin JSON
 * editor stays readable.
 */

// ── Match classification ────────────────────────────────────────────────────
// Matches the spec's classification logic. Never say "same product" unless
// matchType === 'exact_match'. `visual_only_no_external_search` means the
// reverse-search provider was unavailable (not a failure — a missing capability).
export type PiMatchType =
  | 'exact_match'
  | 'high_similarity'
  | 'similar_style'
  | 'low_confidence'
  | 'visual_only_no_external_search'

export type PiReportStatus =
  | 'draft'
  | 'ready'
  | 'approved'
  | 'sent_to_geo'
  | 'rejected'
  | 'failed'

export type PiTriggerSource = 'telegram' | 'manual' | 'product_page' | 'geo_auto'

// ── Detected attributes (from vision) ───────────────────────────────────────
export interface PiDetectedAttributes {
  productType?: string | null
  color?: string | null
  materialGuess?: string | null
  style?: string | null
  gender?: string | null
  useCases?: string[] | null
  category?: string | null
  visibleBrand?: string | null
  visualNotes?: string | null
}

// ── Reference products (from reverse search) ────────────────────────────────
export type PiReferenceClassification = PiMatchType

export interface PiReferenceProduct {
  title: string
  url: string
  source: string
  price?: string | null
  imageUrl?: string | null
  snippet?: string | null
  similarity?: number | null
  classification: PiReferenceClassification
  extractedAttributes?: Record<string, unknown> | null
}

// ── SEO + GEO packs (operator-approved, not yet on product) ─────────────────
export interface PiSeoPack {
  seoTitle?: string
  metaDescription?: string
  productDescription?: string
  shortDescription?: string
  tags?: string[]
  keywords?: string[]
  faq?: Array<{ q: string; a: string }>
}

export interface PiGeoPack {
  aiSearchSummary?: string
  buyerIntentKeywords?: string[]
  comparisonAngles?: string[]
  productComparisonText?: string
  blogDraftIdea?: string
  publishNotes?: string
}

// ── Image provenance notes ──────────────────────────────────────────────────
export interface PiImagesUsed {
  primaryImageSource: string | null
  supportingImageSources: string[]
  imageConfidenceNotes: string
  detectedConflicts: string
  // D-221: how many distinct images were actually sent to the reverse-search
  // provider (0 when no provider is configured). Lets the Telegram report be
  // explicit about the evidence base instead of inferring from results alone.
  searchedImageCount?: number
}

// ── Telegram context snapshot ───────────────────────────────────────────────
export interface PiTelegramContext {
  chatId?: string | number
  messageId?: string | number
  operatorUserId?: string | number
}

// ── Full report shape (mirrors the Payload collection JSON fields) ──────────
export interface PiReport {
  id: string | number
  product: string | number
  status: PiReportStatus
  triggerSource: PiTriggerSource
  matchType: PiMatchType
  matchConfidence: number
  exactProductFound: boolean
  detectedAttributes: PiDetectedAttributes
  referenceProducts: PiReferenceProduct[]
  seoPack: PiSeoPack
  geoPack: PiGeoPack
  riskWarnings: string[]
  imagesUsed: PiImagesUsed
  rawProviderData: Record<string, unknown>
  telegram: PiTelegramContext
  errorMessage?: string | null
}

// ── Image collection result ─────────────────────────────────────────────────
export interface PiCollectedImages {
  primary: { url: string; source: 'original' | 'generated' | 'enhanced'; mediaId?: string | number } | null
  supporting: Array<{ url: string; source: 'original' | 'generated' | 'enhanced'; mediaId?: string | number }>
  notes: string
  conflicts: string
}

// ── Reverse image search result ─────────────────────────────────────────────
export interface PiReverseSearchResult {
  available: boolean // false => no provider configured
  provider: string | null
  results: PiReferenceProduct[]
  raw: unknown
  error?: string
  // D-221: explicit, redundant-but-reliable signals for the report layer so
  // it never has to infer "did we actually search?" from other fields.
  externalSearchRan?: boolean
  searchedImageCount?: number
  onlineMatchesFound?: number
  // Which image sources ended up contributing results (useful for audit).
  searchedImageSources?: Array<{ url: string; source: 'original' | 'generated' | 'enhanced' }>
  // D-222: provider metadata so the Telegram report can print
  // "Provider: DataForSEO · Queue: standard · Depth: 10".
  providerDisplayName?: string | null
  providerQueue?: string | null
  providerDepth?: number | null
  // D-222: DataForSEO async — task ids that did NOT finish within the
  // poll budget. Operator can regen after the tasks complete.
  pendingTaskIds?: string[]
}

// ── Product data we need for prompting (compatible with GeobotProductContext) ─
export interface PiProductContext {
  id: string | number
  title: string
  category?: string | null
  price?: number | null
  originalPrice?: number | null
  description?: string | null
  brand?: string | null
  productType?: string | null
  variants?: Array<{ size?: string; stock?: number; color?: string }> | null
  stockQuantity?: number | null
  tags?: string[] | null
  existingMetaTitle?: string | null
  existingMetaDescription?: string | null
}
