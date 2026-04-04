/**
 * storyTargets.ts — Phase 3: Story Target Resolution
 *
 * Pure helper functions for resolving and filtering story publish targets.
 * Centralizes all target-related logic:
 *   - Which targets are configured and enabled?
 *   - Which are supported (Telegram) vs blocked (WhatsApp official)?
 *   - How to merge global targets with product-level overrides?
 *
 * Design goals:
 *   - No side effects — takes config + product, returns target lists
 *   - WhatsApp official story/status is always blocked_officially
 *   - Telegram is the primary supported story target
 *   - Safe defaults when settings are null/undefined
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Single story target configuration from AutomationSettings */
export type StoryTargetConfig = {
  id: string
  platform: string               // 'telegram' | 'instagram' | 'whatsapp'
  label?: string | null
  enabled?: boolean | null
  mode?: string | null            // 'story' | 'status' | 'reel'
  businessConnectionId?: string | null
  defaultAudience?: string | null
  defaultLink?: string | null
  defaultCaptionTemplate?: string | null
  priority?: number | null
  requiresApproval?: boolean | null
}

/** Resolved target with support status */
export type ResolvedTarget = {
  id: string
  platform: string
  label: string
  enabled: boolean
  supported: boolean              // false for whatsapp official
  blockReason?: string            // 'blocked_officially' for whatsapp
  requiresApproval: boolean
  priority: number
  config: StoryTargetConfig
}

/** Product-level story settings (from Products.storySettings) */
export type ProductStorySettings = {
  enabled?: boolean | null
  autoOnPublish?: boolean | null
  skipApproval?: boolean | null
  captionMode?: string | null
  primaryAsset?: string | null
  storyTargets?: string[] | null  // ['telegram', 'instagram', 'whatsapp']
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platforms with no official story/status API support.
 * WhatsApp Business API does not support posting to Status/Stories.
 * This is a Meta API limitation, not a project decision.
 */
const BLOCKED_PLATFORMS: Record<string, string> = {
  whatsapp: 'blocked_officially',
}

/** Default target if nothing is configured */
const DEFAULT_TARGETS: StoryTargetConfig[] = [
  {
    id: 'telegram-default',
    platform: 'telegram',
    label: 'Telegram Story',
    enabled: true,
    mode: 'story',
    priority: 1,
    requiresApproval: false,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Core Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve all configured story targets from AutomationSettings.
 *
 * Returns a list of ResolvedTarget with support status.
 * Blocked platforms (WhatsApp) are included but marked as unsupported.
 */
export function resolveTargets(
  globalTargets?: StoryTargetConfig[] | null,
): ResolvedTarget[] {
  const targets = globalTargets && globalTargets.length > 0
    ? globalTargets
    : DEFAULT_TARGETS

  return targets.map((t) => {
    const blockReason = BLOCKED_PLATFORMS[t.platform]
    return {
      id: t.id,
      platform: t.platform,
      label: t.label ?? `${t.platform} story`,
      enabled: t.enabled !== false,
      supported: !blockReason,
      ...(blockReason ? { blockReason } : {}),
      requiresApproval: t.requiresApproval === true,
      priority: t.priority ?? 10,
      config: t,
    }
  })
}

/**
 * Filter targets to only enabled and supported ones.
 * This is what the actual story publish pipeline should use.
 */
export function getPublishableTargets(
  globalTargets?: StoryTargetConfig[] | null,
): ResolvedTarget[] {
  return resolveTargets(globalTargets)
    .filter((t) => t.enabled && t.supported)
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Filter targets to only blocked ones.
 * Used for logging and status tracking.
 */
export function getBlockedTargets(
  globalTargets?: StoryTargetConfig[] | null,
): ResolvedTarget[] {
  return resolveTargets(globalTargets)
    .filter((t) => !t.supported)
}

/**
 * Merge product-level target preferences with global targets.
 *
 * If product has storyTargets set, only include matching global targets.
 * If product has no storyTargets, use all enabled global targets.
 */
export function resolveProductTargets(
  productStorySettings?: ProductStorySettings | null,
  globalTargets?: StoryTargetConfig[] | null,
): ResolvedTarget[] {
  const all = resolveTargets(globalTargets)

  // If product has specific target preferences, filter to those platforms
  const productTargetPlatforms = productStorySettings?.storyTargets
  if (productTargetPlatforms && productTargetPlatforms.length > 0) {
    return all.filter((t) => productTargetPlatforms.includes(t.platform))
  }

  // Otherwise return all enabled targets
  return all.filter((t) => t.enabled)
}

/**
 * Check if a platform is officially blocked for story publishing.
 */
export function isPlatformBlocked(platform: string): boolean {
  return platform in BLOCKED_PLATFORMS
}

/**
 * Check if a product should participate in story pipeline.
 */
export function isStoryEligible(
  product: {
    status?: string | null
    storySettings?: ProductStorySettings | null
  },
): boolean {
  // Product must be active
  if (product.status !== 'active') return false

  // Story must be enabled on this product
  if (product.storySettings?.enabled !== true) return false

  return true
}

/**
 * Check if story should auto-trigger on product publish.
 */
export function shouldAutoTriggerStory(
  product: {
    status?: string | null
    storySettings?: ProductStorySettings | null
  },
): boolean {
  if (!isStoryEligible(product)) return false
  return product.storySettings?.autoOnPublish === true
}
