/**
 * supplierScout/types.ts
 *
 * Central type definitions for the SupplierScout autonomous supplier-monitoring bot.
 * SupplierScout monitors wholesaler Telegram groups, classifies messages using
 * Gemini NLP (with Turkish supplier slang support), and autonomously creates/updates
 * website products when confidence is high.
 *
 * STATUS: IMPLEMENTED (D-278)
 * AUTHOR: SupplierScout v1
 */

// ─────────────────────────────────────────────────────────────────────────────
// Message Classification Types
// ─────────────────────────────────────────────────────────────────────────────

/** All possible classifications for a supplier group message. */
export type MessageClass =
  | 'new_product'         // New product offer with price/size/photo
  | 'product_update'      // Update to an existing offer (photo/detail change)
  | 'price_update'        // Price change on existing product
  | 'size_update'         // New sizes or removed sizes
  | 'sold_out'            // Full sold-out signal ("bitti", "tükendi", etc.)
  | 'partial_sold_out'    // Some sizes gone ("42 kalmadı", "sadece 40 kaldı")
  | 'still_available'     // Re-availability signal ("devam", "aynısı var")
  | 'duplicate_repost'    // Same product reposted in same group
  | 'conversation_noise'  // Chit-chat, reactions, questions without product info
  | 'admin_announcement'  // Group admin announcement (price list, shipping info)
  | 'risk_warning'        // Message signals a risky/problematic situation

/** Confidence level for a classification or match decision. */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none'

/** Result of Gemini-based message classification. */
export interface ClassificationResult {
  messageClass: MessageClass
  confidence: ConfidenceLevel
  confidenceScore: number          // 0–100
  reasoning: string                // Short explanation from Gemini
  detectedLanguageTerms: string[]  // Turkish slang/shorthand terms found
  isActionable: boolean            // Should trigger product or soldout action
  requiresReview: boolean          // Flag for daily report "needs_review" bucket
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsed Product Offer
// ─────────────────────────────────────────────────────────────────────────────

/** A product offer extracted from a supplier group message. */
export interface ParsedProductOffer {
  // Core product fields
  productName?: string        // Full extracted name/model
  brand?: string              // Detected brand
  model?: string              // Model code/name
  color?: string              // Color description
  material?: string           // Material if mentioned
  category?: string           // Detected category (Spor / Klasik / Bot / etc.)
  gender?: 'erkek' | 'kadın' | 'unisex' | 'çocuk' | 'unknown'

  // Sizing
  sizeMin?: number            // e.g. 36
  sizeMax?: number            // e.g. 45
  availableSizes?: number[]   // Explicit sizes if listed

  // Pricing
  wholesalePrice?: number     // Detected wholesale price (USD or TRY)
  wholesaleCurrency?: 'USD' | 'TRY' | 'EUR'
  computedWebsitePrice?: number  // wholesalePrice + margin

  // Media
  hasPhoto: boolean
  telegramFileIds?: string[]  // Telegram file_id list from photo messages

  // Source metadata
  supplierGroupId?: string    // DB id of SupplierGroups record
  supplierGroupTelegramId?: number  // Telegram group chat_id
  sellerUserId?: number       // Telegram user_id of the poster
  sellerUsername?: string
  sellerName?: string
  telegramMessageId?: number
  telegramMediaGroupId?: string   // For multi-photo posts

  // Parsing quality
  parseConfidence: ConfidenceLevel
  parseScore: number          // 0–100
  missingFields: string[]     // Fields required for auto-create that are absent
  parseWarnings: string[]

  // Raw
  rawText: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Sold-Out Signal
// ─────────────────────────────────────────────────────────────────────────────

/** A sold-out signal extracted from a group message. */
export interface ParsedSoldOutSignal {
  isFull: boolean             // Full sold-out vs partial
  affectedSizes?: number[]    // If partial: which sizes are gone
  remainingSizes?: number[]   // If partial: which sizes remain
  rawText: string
  sellerUserId?: number
  sellerUsername?: string
  telegramMessageId?: number
  telegramGroupId?: number
  replyToMessageId?: number   // If this is a reply to a product post
  mediaGroupId?: string       // If media group relation
  detectedTerms: string[]     // e.g. ["bitti", "tükendi"]
  confidence: ConfidenceLevel
}

// ─────────────────────────────────────────────────────────────────────────────
// Sold-Out Match Result
// ─────────────────────────────────────────────────────────────────────────────

/** Result of attempting to match a sold-out signal to existing website products. */
export interface SoldOutMatchResult {
  matched: boolean
  confidence: ConfidenceLevel
  productId?: number | string
  productTitle?: string
  productSku?: string
  matchReasons: string[]      // Why we think this matches
  matchScore: number          // 0–100
  action: 'auto_soldout' | 'dm_warning' | 'report_only' | 'no_match'
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-Create Gate Result
// ─────────────────────────────────────────────────────────────────────────────

/** Result of the autonomous product creation gate check. */
export interface AutoCreateGateResult {
  allowed: boolean
  blockers: string[]          // Reasons creation was blocked
  isDuplicate: boolean
  existingProductId?: number | string
  supplierBlocked: boolean
  autoPaused: boolean
}

/** Result of the full autonomous product creation attempt. */
export interface AutoCreateResult {
  success: boolean
  productId?: number | string
  productTitle?: string
  websitePrice?: number
  wholesalePrice?: number
  error?: string
  skippedReason?: string      // Why skipped if !success && !error
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Report Structures
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyReportStats {
  date: string                // YYYY-MM-DD (Europe/Istanbul)
  groupsMonitored: number
  messagesProcessed: number
  imagesProcessed: number
  productsDetected: number
  productsAdded: number
  soldOutUpdates: number
  skippedDuplicates: number
  skippedLowConfidence: number
  errors: number
  estimatedMarginPotential: number  // Sum of (websitePrice - wholesalePrice) for created products
}

export interface DailyReportProduct {
  title: string
  supplier: string
  supplierGroup: string
  wholesalePrice: number
  wholesaleCurrency: string
  websitePrice: number
  defaultStock: number
  telegramMessageId?: number
  createdProductId?: number | string
  timestamp: string
}

export interface DailyReportSoldOut {
  productTitle: string
  productId?: number | string
  confidence: ConfidenceLevel
  supplier: string
  supplierGroup: string
  timestamp: string
}

export interface DailyReportSkipped {
  reason: string
  productName?: string
  supplierGroup: string
  missingFields?: string[]
  timestamp: string
}

export interface DailyReportError {
  context: string
  error: string
  timestamp: string
}

export interface DailyReportLearning {
  newTermsLearned: string[]
  sellerBehaviorPatterns: string[]
  groupLogicObservations: string[]
  riskyInterpretations: string[]
  correctionsNeeded: string[]
  confidenceChanges: string[]
}

export interface FullDailyReport {
  stats: DailyReportStats
  productsAdded: DailyReportProduct[]
  soldOutUpdates: DailyReportSoldOut[]
  skipped: DailyReportSkipped[]
  errors: DailyReportError[]
  needsReview: DailyReportSkipped[]
  learning: DailyReportLearning
  webhookHealth: boolean
  autoPauseActive: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Supplier Group Config (from SupplierGroups collection)
// ─────────────────────────────────────────────────────────────────────────────

export interface SupplierGroupConfig {
  id: number | string
  telegramGroupId: number
  groupName: string
  groupUsername?: string
  marginUSD: number           // Markup in USD to add to wholesale price
  currency: 'USD' | 'TRY' | 'EUR'
  isActive: boolean
  isBlocked: boolean
  trustScore: number          // 0–100
  autoCreateEnabled: boolean
  defaultCategory?: string
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Types (Learning Layer)
// ─────────────────────────────────────────────────────────────────────────────

export interface LanguageMemoryEntry {
  term: string                // Turkish slang term
  meaning: string             // What it means in context
  context: 'product' | 'soldout' | 'update' | 'noise' | 'size' | 'price' | 'general'
  examples: string[]          // Raw example sentences
  confidence: number          // How reliable this mapping is (0–100)
  teacherId?: string          // 'frank' if manually taught via /teach
  createdAt: string
  updatedAt: string
}

export interface SellerMemoryEntry {
  telegramUserId: number
  username?: string
  displayName?: string
  groupId?: number | string
  postingStyle: string        // Observation about how this seller writes
  reliabilityScore: number    // 0–100
  typicalCategories: string[]
  typicalPriceRange?: { min: number; max: number; currency: string }
  commonTerms: string[]       // Slang this seller uses
  flaggedBehaviors: string[]  // e.g. "often reposts same item"
  trustLevel: 'trusted' | 'normal' | 'watchlist' | 'blocked'
  teacherNotes?: string       // Manual notes from /seller command
  updatedAt: string
}

export interface CorrectionMemoryEntry {
  originalClassification: MessageClass
  correctedClassification: MessageClass
  originalText: string
  correctionReason: string
  appliedToFuture: boolean
  teacherId: string           // Always 'frank' for manual corrections
  createdAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbound Telegram Update Shape (minimal — only what SupplierScout needs)
// ─────────────────────────────────────────────────────────────────────────────

export interface TgUser {
  id: number
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
}

export interface TgChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
}

export interface TgPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface TgMessage {
  message_id: number
  from?: TgUser
  chat: TgChat
  date: number
  text?: string
  caption?: string
  photo?: TgPhotoSize[]
  media_group_id?: string
  reply_to_message?: TgMessage
  forward_from?: TgUser
  forward_from_chat?: TgChat
}

export interface TgUpdate {
  update_id: number
  message?: TgMessage
  callback_query?: {
    id: string
    from: TgUser
    message?: TgMessage
    data?: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock Mode (extends existing Products stockMode logic)
// ─────────────────────────────────────────────────────────────────────────────

export type StockMode = 'exact' | 'supplier_virtual_stock'

export interface SupplierVirtualStockMeta {
  stockMode: StockMode
  exactStockKnown: boolean
  supplierAvailabilityBased: boolean
  wholesalePrice?: number
  wholesaleCurrency?: string
  supplierGroupId?: string
  supplierSellerId?: string
  supplierSellerName?: string
  wholesaleOpportunityId?: string  // FK to WholesaleOpportunities record
  autoCreatedAt?: string
  autoCreateConfidence?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Context (DM commands from Frank)
// ─────────────────────────────────────────────────────────────────────────────

export interface CommandContext {
  chatId: number
  userId: number
  command: string
  args: string[]
  rawText: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Log Entry
// ─────────────────────────────────────────────────────────────────────────────

export interface ActionLogEntry {
  actionType:
    | 'product_created'
    | 'product_skipped'
    | 'soldout_applied'
    | 'soldout_skipped'
    | 'soldout_warned'
    | 'message_classified'
    | 'correction_applied'
    | 'term_learned'
    | 'auto_paused'
    | 'auto_resumed'
    | 'report_sent'
    | 'ops_forwarded'
    | 'auto_ops_forwarded'
    | 'error'
  confidence: ConfidenceLevel
  productId?: number | string
  productTitle?: string
  supplierGroupId?: string
  supplierGroupName?: string
  sellerUserId?: number
  sellerUsername?: string
  telegramMessageId?: number
  wholesalePrice?: number
  websitePrice?: number
  details: string
  isReversible: boolean
  reversedAt?: string
  reversedBy?: string
  createdAt: string
}
