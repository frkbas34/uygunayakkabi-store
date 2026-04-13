/**
 * automationDecision.ts — Step 12: Automation control-plane decision layer
 *
 * Provides pure, stateless functions that resolve automation decisions
 * based on AutomationSettings (global) and per-product state.
 *
 * Design goals:
 *  - No side effects — only takes inputs, returns outputs
 *  - Safe fallback to conservative defaults when settings unavailable
 *  - Clear reason strings for auditability (stored in automationMeta)
 *  - Channel decisions respect: global capability AND product-level intent
 *  - Status decisions respect: requireAdminReview > autoActivate > confidence > readiness
 *
 * Used by:
 *  - src/app/api/automation/products/route.ts (product intake)
 *  - Future: automation triggers, n8n callbacks, admin bulk actions
 */

import type { PublishReadinessResult } from './telegram'

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot of AutomationSettings global.
 * All fields are optional — absence is treated as the safe default.
 */
export type AutomationSettingsSnapshot = {
  productIntake?: {
    autoActivateProducts?: boolean | null
    requireAdminReview?: boolean | null
    minConfidenceToActivate?: number | null
  }
  channelPublishing?: {
    publishWebsite?: boolean | null
    publishInstagram?: boolean | null
    publishShopier?: boolean | null
    publishDolap?: boolean | null
    publishX?: boolean | null
    publishFacebook?: boolean | null
    publishThreads?: boolean | null
  }
  contentGeneration?: {
    autoGenerateBlog?: boolean | null
    autoPublishBlog?: boolean | null
    autoGenerateExtraViews?: boolean | null
    enableTryOn?: boolean | null
  }
  /** Instagram + Facebook OAuth tokens — written by /api/auth/instagram/callback + admin */
  instagramTokens?: {
    accessToken?: string | null
    userId?: string | null
    expiresAt?: string | null
    connectedAt?: string | null
    /** Facebook Page numeric ID — set manually in AutomationSettings admin */
    facebookPageId?: string | null
  }
}

/** Input to the status decision function */
export type StatusDecisionInput = {
  /** Caption parser confidence score (0–100). Absent = treated as 0 (unknown) */
  parseConfidence?: number | null
  /** Publish-readiness evaluation from evaluatePublishReadiness() */
  readiness: PublishReadinessResult
  /** Per-product automationFlags.autoActivate override — takes effect only if global allows */
  productAutoActivateOverride?: boolean | null
  /**
   * Explicit status sent by n8n in the request body.
   * 'draft' → always kept as draft (n8n intent).
   * 'active' → treated as "request to activate" but still gated by readiness.
   * Absent → decision layer takes over.
   */
  explicitStatus?: string | null
}

/** Result of the status decision function */
export type StatusDecisionResult = {
  /** Resolved product status */
  status: 'active' | 'draft'
  /** Human-readable Turkish reason for the decision — stored in automationMeta */
  reason: string
  /** Machine-readable gate that caused a non-activation */
  blockedBy?: 'require_admin_review' | 'auto_activate_off' | 'confidence_below_threshold' | 'readiness_failed' | 'explicit_draft' | 'settings_unavailable'
}

/** Effective channel targets after global capability filtering */
export type ChannelDecisionResult = {
  /** Channels that are both globally enabled AND product-level targeted */
  effectiveTargets: string[]
  /** Channels the product wanted but were disabled globally */
  blockedByGlobal: string[]
  /** Summary for logging */
  summary: string
}

/** Flags for content generation — what should be triggered post-intake */
export type ContentDecisionResult = {
  shouldGenerateBlog: boolean
  shouldAutoPublishBlog: boolean
  shouldGenerateExtraViews: boolean
  tryOnEnabled: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe defaults — conservative fallback when settings unavailable
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_DEFAULTS = {
  autoActivateProducts: false,
  requireAdminReview: true,
  minConfidenceToActivate: 60,
  publishWebsite: true,    // website is always on by default
  publishInstagram: false,
  publishShopier: false,
  publishDolap: false,
  publishX: false,
  publishFacebook: false,
  publishThreads: false,
  autoGenerateBlog: false,
  autoPublishBlog: false,
  autoGenerateExtraViews: false,
  enableTryOn: false,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Status decision
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolveProductStatus — Determine whether a product should be 'active' or 'draft'.
 *
 * Decision precedence (highest → lowest):
 *  1. explicitStatus === 'draft'  → always draft (n8n or automation explicitly requested draft)
 *  2. settings unavailable        → draft (safe fallback)
 *  3. requireAdminReview === true → draft (admin must review regardless of other settings)
 *  4. autoActivateProducts === false → draft (auto-activation disabled globally)
 *  5. parseConfidence < minConfidenceToActivate → draft (parser uncertain)
 *  6. readiness.isReady === false  → draft (critical fields missing)
 *  7. All gates passed            → active
 *
 * Per-product override (automationFlags.autoActivate) is respected only when:
 *  - requireAdminReview is false
 *  - It overrides the autoActivateProducts toggle (not the confidence/readiness gates)
 */
export function resolveProductStatus(
  input: StatusDecisionInput,
  settings: AutomationSettingsSnapshot | null | undefined,
): StatusDecisionResult {
  // 1. Explicit draft request — always honor
  if (input.explicitStatus === 'draft') {
    return {
      status: 'draft',
      reason: 'Taslak: n8n tarafından açıkça taslak olarak istendi.',
      blockedBy: 'explicit_draft',
    }
  }

  // 2. Settings unavailable — safe fallback
  if (!settings) {
    return {
      status: 'draft',
      reason: 'Taslak: Otomasyon ayarları yüklenemedi — güvenli varsayılan uygulandı.',
      blockedBy: 'settings_unavailable',
    }
  }

  const intake = settings.productIntake ?? {}
  const requireReview = intake.requireAdminReview ?? SAFE_DEFAULTS.requireAdminReview
  const autoActivate  = intake.autoActivateProducts ?? SAFE_DEFAULTS.autoActivateProducts
  const minConfidence = intake.minConfidenceToActivate ?? SAFE_DEFAULTS.minConfidenceToActivate

  // 3. Admin review required — overrides everything else
  if (requireReview) {
    return {
      status: 'draft',
      reason: 'Taslak: Admin onayı zorunlu (requireAdminReview=açık). Ürün inceleme kuyruğuna alındı.',
      blockedBy: 'require_admin_review',
    }
  }

  // 4. Auto-activate disabled globally (check per-product override first)
  const effectiveAutoActivate = input.productAutoActivateOverride ?? autoActivate
  if (!effectiveAutoActivate) {
    return {
      status: 'draft',
      reason: 'Taslak: Otomatik aktivasyon kapalı — ürün admin onayı bekliyor.',
      blockedBy: 'auto_activate_off',
    }
  }

  // 5. Confidence gate — parser must be sufficiently certain
  const confidence = input.parseConfidence ?? 0
  if (confidence < minConfidence) {
    return {
      status: 'draft',
      reason: `Taslak: Parser güveni yetersiz (${confidence}% < eşik ${minConfidence}%). Alanlar tamamlanmadan yayınlanamaz.`,
      blockedBy: 'confidence_below_threshold',
    }
  }

  // 6. Publish readiness gate — all critical fields must be present
  if (!input.readiness.isReady) {
    const missing = input.readiness.missingCritical.join(', ')
    return {
      status: 'draft',
      reason: `Taslak: Yayın için zorunlu alanlar eksik: ${missing}`,
      blockedBy: 'readiness_failed',
    }
  }

  // 7. All gates passed — activate
  return {
    status: 'active',
    reason: `Aktif: Tüm koşullar sağlandı (güven: ${confidence}%, zorunlu alanlar tam).`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel decision
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolveChannelTargets — Compute effective channel targets.
 *
 * A channel is effective only when:
 *   - The product explicitly targets it (channelTargets includes the channel)
 *   - AND the global capability toggle for that channel is enabled
 *
 * Global setting = capability gate (operator level)
 * Product channelTargets = intent gate (product level)
 * Both must be true for a channel to be effective.
 *
 * This does NOT trigger actual publishing — it only resolves which channels
 * are "cleared" for future publishing steps. Real publishing happens in Step 13+.
 */
export function resolveChannelTargets(
  productTargets: string[] | null | undefined,
  settings: AutomationSettingsSnapshot | null | undefined,
): ChannelDecisionResult {
  const targets = productTargets ?? ['website']
  const cp = settings?.channelPublishing ?? {}

  const CAPABILITY: Record<string, boolean> = {
    website:   !!(cp.publishWebsite   ?? SAFE_DEFAULTS.publishWebsite),
    instagram: !!(cp.publishInstagram ?? SAFE_DEFAULTS.publishInstagram),
    shopier:   !!(cp.publishShopier   ?? SAFE_DEFAULTS.publishShopier),
    dolap:     !!(cp.publishDolap     ?? SAFE_DEFAULTS.publishDolap),
    x:         !!(cp.publishX         ?? SAFE_DEFAULTS.publishX),
    facebook:  !!(cp.publishFacebook  ?? SAFE_DEFAULTS.publishFacebook),
    threads:   !!(cp.publishThreads   ?? SAFE_DEFAULTS.publishThreads),
  }

  const effectiveTargets: string[] = []
  const blockedByGlobal: string[] = []

  for (const ch of targets) {
    const chLower = ch.toLowerCase()
    if (CAPABILITY[chLower] === true) {
      effectiveTargets.push(chLower)
    } else if (CAPABILITY[chLower] === false) {
      blockedByGlobal.push(chLower)
    }
    // unknown channels (not in CAPABILITY map) are silently dropped
  }

  const summary = effectiveTargets.length > 0
    ? `Kanallar: [${effectiveTargets.join(', ')}] aktif` +
      (blockedByGlobal.length > 0 ? ` | [${blockedByGlobal.join(', ')}] global ayarda kapalı` : '')
    : `Hiçbir kanal aktif değil` +
      (blockedByGlobal.length > 0 ? ` | [${blockedByGlobal.join(', ')}] global ayarda kapalı` : '')

  return { effectiveTargets, blockedByGlobal, summary }
}

// ─────────────────────────────────────────────────────────────────────────────
// Content generation decision
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolveContentDecision — Determine which content generation tasks should run.
 *
 * Respects: global settings AND per-product automationFlags
 * Product flag = AND condition with global (both must be true)
 * seoRequested (from caption parser) is considered for blog generation.
 *
 * Currently returns intent only — no actual triggers implemented.
 * Used by route.ts to include in response for n8n downstream decisions.
 */
export function resolveContentDecision(
  productFlags: {
    generateBlog?: boolean | null
    generateExtraViews?: boolean | null
    enableTryOn?: boolean | null
  } | null | undefined,
  seoRequestedFromCaption: boolean,
  settings: AutomationSettingsSnapshot | null | undefined,
): ContentDecisionResult {
  const gen = settings?.contentGeneration ?? {}

  const globalBlog    = !!(gen.autoGenerateBlog       ?? SAFE_DEFAULTS.autoGenerateBlog)
  const globalPublish = !!(gen.autoPublishBlog         ?? SAFE_DEFAULTS.autoPublishBlog)
  const globalViews   = !!(gen.autoGenerateExtraViews  ?? SAFE_DEFAULTS.autoGenerateExtraViews)
  const globalTryOn   = !!(gen.enableTryOn             ?? SAFE_DEFAULTS.enableTryOn)

  const productBlog   = !!(productFlags?.generateBlog       ?? false)
  const productViews  = !!(productFlags?.generateExtraViews  ?? false)
  const productTryOn  = !!(productFlags?.enableTryOn         ?? false)

  return {
    // Blog: global on OR (seoRequested AND product flag) — global is the master gate
    shouldGenerateBlog: globalBlog && (productBlog || seoRequestedFromCaption),
    shouldAutoPublishBlog: globalPublish,
    // Extra views: both global and product flag must be on
    shouldGenerateExtraViews: globalViews && productViews,
    // Try-on: both global and product flag must be on
    tryOnEnabled: globalTryOn && productTryOn,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings fetcher helper (for use in route.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetchAutomationSettings — Safely fetch AutomationSettings from Payload.
 *
 * Returns null (with a logged warning) if the fetch fails, allowing
 * callers to fall back to SAFE_DEFAULTS via resolveProductStatus's null handling.
 *
 * @param payload — Payload instance from getPayload()
 */
export async function fetchAutomationSettings(
  payload: { findGlobal: (args: { slug: string }) => Promise<unknown> },
): Promise<AutomationSettingsSnapshot | null> {
  try {
    const settings = await payload.findGlobal({ slug: 'automation-settings' })
    return settings as AutomationSettingsSnapshot
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[automationDecision] Failed to fetch AutomationSettings:', msg, '— using safe defaults')
    return null
  }
}
