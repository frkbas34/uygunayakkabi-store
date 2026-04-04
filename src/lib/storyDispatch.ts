/**
 * storyDispatch.ts — Phase 3: Story Dispatch Pipeline
 *
 * Orchestrates the story publish pipeline:
 *   1. Check product story eligibility
 *   2. Resolve story asset (image)
 *   3. Resolve target list
 *   4. Generate caption
 *   5. Create StoryJob record
 *   6. Update product sourceMeta (non-blocking)
 *
 * Critical design rule:
 *   Story dispatch is NON-BLOCKING. If anything fails here,
 *   the product publish flow must still succeed. All errors
 *   are caught and logged, never thrown to the caller.
 *
 * Used by:
 *   - Future: Products afterChange hook (auto-trigger on publish)
 *   - Future: Telegram story commands
 *   - Future: Admin manual story trigger
 */

import type { StoryTargetConfig, ProductStorySettings, ResolvedTarget } from './storyTargets'
import {
  resolveProductTargets,
  getBlockedTargets,
  shouldAutoTriggerStory,
  isPlatformBlocked,
} from './storyTargets'

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal product shape for story dispatch */
export type StoryDispatchProduct = {
  id: string | number
  title?: string | null
  price?: number | null
  status?: string | null
  images?: Array<{ image?: { url?: string | null } | string | number | null }> | null
  generativeGallery?: Array<{ image?: { url?: string | null } | string | number | null }> | null
  variants?: Array<{ size?: string | null }> | null
  storySettings?: ProductStorySettings | null
  sourceMeta?: Record<string, unknown> | null
}

/** Story dispatch result */
export type StoryDispatchResult = {
  success: boolean
  jobCreated: boolean
  storyJobId?: string | number
  status: string             // 'queued' | 'awaiting_asset' | 'awaiting_approval' | 'blocked_officially' | 'skipped' | 'error'
  targets: string[]          // platforms targeted
  blockedTargets: string[]   // platforms blocked
  asset?: string | null      // resolved asset URL
  caption?: string | null    // generated caption
  error?: string             // error message if failed
}

/** Payload instance interface — minimal shape for story job creation */
type PayloadInstance = {
  create: (args: {
    collection: string
    data: Record<string, unknown>
    req?: unknown
  }) => Promise<{ id: string | number }>
  update: (args: {
    collection: string
    id: string | number
    data: Record<string, unknown>
    req?: unknown
  }) => Promise<unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the best available story asset for a product.
 *
 * Priority:
 *   1. If primaryAsset === 'custom' — future: custom story image (not yet implemented)
 *   2. If primaryAsset === 'generative' — first image from generativeGallery
 *   3. Default ('main_image') — first image from product.images
 *   4. Fallback to generativeGallery if main images empty
 *   5. null if no usable asset found
 */
export function resolveStoryAsset(product: StoryDispatchProduct): string | null {
  const preference = product.storySettings?.primaryAsset ?? 'main_image'

  // Helper to extract URL from image array
  const getFirstUrl = (
    arr?: Array<{ image?: { url?: string | null } | string | number | null }> | null,
  ): string | null => {
    if (!arr || arr.length === 0) return null
    const first = arr[0]
    if (!first?.image) return null
    if (typeof first.image === 'object' && 'url' in first.image) {
      return first.image.url || null
    }
    return null
  }

  if (preference === 'generative') {
    return getFirstUrl(product.generativeGallery) ?? getFirstUrl(product.images)
  }

  // 'main_image' or 'custom' (custom falls back to main for now)
  return getFirstUrl(product.images) ?? getFirstUrl(product.generativeGallery)
}

// ─────────────────────────────────────────────────────────────────────────────
// Caption Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a short, sales-oriented story caption.
 *
 * Template:
 *   {title}
 *   {price}₺ {sizeRange}
 *   {CTA}
 *
 * Kept intentionally simple for Phase 3 foundation.
 * Future: template engine, AI-generated captions, target-specific formatting.
 */
export function generateStoryCaption(product: StoryDispatchProduct): string {
  const parts: string[] = []

  // Product name
  const title = product.title ?? 'Yeni Ürün'
  parts.push(title)

  // Price
  if (product.price && product.price > 0) {
    parts.push(`${product.price}₺`)
  }

  // Size range from variants
  const sizes = extractSizeRange(product)
  if (sizes) {
    parts.push(`Beden: ${sizes}`)
  }

  // CTA
  parts.push('🛒 Hemen Al → uygunayakkabi.com')

  return parts.join('\n')
}

/**
 * Extract a compact size range string from product variants.
 * Returns "38-44" style range or null if no sizes.
 */
function extractSizeRange(
  product: StoryDispatchProduct,
): string | null {
  if (!product.variants || product.variants.length === 0) return null

  const sizes = product.variants
    .map((v) => v.size)
    .filter((s): s is string => !!s)
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b)

  if (sizes.length === 0) return null
  if (sizes.length === 1) return String(sizes[0])
  return `${sizes[0]}-${sizes[sizes.length - 1]}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Story Job Creation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a story for a product.
 *
 * NON-BLOCKING: This function catches all errors internally.
 * It never throws. The caller's publish flow is never interrupted.
 *
 * Steps:
 *   1. Resolve targets (filter blocked platforms)
 *   2. Resolve asset
 *   3. Generate caption
 *   4. Create StoryJob
 *   5. Update product sourceMeta with story status
 *
 * @param product - Product data
 * @param globalTargets - Story targets from AutomationSettings
 * @param payload - Payload CMS instance for DB operations
 * @param triggerSource - What triggered this dispatch
 * @param req - Optional Payload request (for context)
 */
export async function dispatchStory(
  product: StoryDispatchProduct,
  globalTargets: StoryTargetConfig[] | undefined | null,
  payload: PayloadInstance,
  triggerSource: 'auto_publish' | 'telegram_command' | 'admin' | 'retry' = 'auto_publish',
  req?: unknown,
): Promise<StoryDispatchResult> {
  try {
    // 1. Resolve targets for this product
    const resolvedTargets = resolveProductTargets(product.storySettings, globalTargets)
    const publishable = resolvedTargets.filter((t) => t.supported && t.enabled)
    const blocked = resolvedTargets.filter((t) => !t.supported)

    const targetPlatforms = publishable.map((t) => t.platform)
    const blockedPlatforms = blocked.map((t) => t.platform)

    // If ALL targets are blocked, mark as blocked_officially
    if (publishable.length === 0 && blocked.length > 0) {
      await safeUpdateSourceMeta(payload, product, {
        storyStatus: 'blocked_officially',
        storyQueuedAt: new Date().toISOString(),
        storyTargetsFailed: JSON.stringify(blockedPlatforms),
        lastStoryError: 'All targets are officially blocked (no supported API)',
      }, req)

      return {
        success: false,
        jobCreated: false,
        status: 'blocked_officially',
        targets: [],
        blockedTargets: blockedPlatforms,
        error: 'All targets are officially blocked',
      }
    }

    // If no targets at all, skip silently
    if (publishable.length === 0) {
      return {
        success: false,
        jobCreated: false,
        status: 'skipped',
        targets: [],
        blockedTargets: blockedPlatforms,
      }
    }

    // 2. Resolve asset
    const assetUrl = resolveStoryAsset(product)

    // 3. Generate caption
    const caption = generateStoryCaption(product)

    // 4. Determine initial status
    const needsApproval = !product.storySettings?.skipApproval &&
      publishable.some((t) => t.requiresApproval)
    let initialStatus: string

    if (!assetUrl) {
      initialStatus = 'awaiting_asset'
    } else if (needsApproval) {
      initialStatus = 'awaiting_approval'
    } else {
      initialStatus = 'queued'
    }

    // Determine approval state
    const approvalState = needsApproval ? 'pending' : 'not_required'

    // 5. Create StoryJob
    const job = await payload.create({
      collection: 'story-jobs',
      data: {
        product: product.id,
        status: initialStatus,
        triggerSource,
        targets: targetPlatforms,
        assetUrl: assetUrl ?? undefined,
        caption,
        approvalState,
        attemptCount: 0,
      },
      ...(req ? { req } : {}),
    })

    // 6. Update product sourceMeta
    await safeUpdateSourceMeta(payload, product, {
      storyStatus: initialStatus === 'queued' ? 'queued' : initialStatus,
      storyQueuedAt: new Date().toISOString(),
      storyTargetsPublished: '[]',
      storyTargetsFailed: blockedPlatforms.length > 0 ? JSON.stringify(blockedPlatforms) : '[]',
      lastStoryAsset: assetUrl ?? '',
      lastStoryCaption: caption,
    }, req)

    console.log(
      `[StoryDispatch] Job created — product=${product.id} ` +
      `job=${job.id} status=${initialStatus} ` +
      `targets=[${targetPlatforms.join(',')}] ` +
      `blocked=[${blockedPlatforms.join(',')}]`,
    )

    return {
      success: true,
      jobCreated: true,
      storyJobId: job.id,
      status: initialStatus,
      targets: targetPlatforms,
      blockedTargets: blockedPlatforms,
      asset: assetUrl,
      caption,
    }
  } catch (err) {
    // NON-BLOCKING: catch everything, log, return error result
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[StoryDispatch] Failed — product=${product.id}: ${message}`)

    // Best-effort sourceMeta update
    try {
      await safeUpdateSourceMeta(payload, product, {
        storyStatus: 'failed',
        lastStoryError: message,
      }, req)
    } catch {
      // Double-fault: even sourceMeta update failed. Just log.
      console.error(`[StoryDispatch] sourceMeta update also failed — product=${product.id}`)
    }

    return {
      success: false,
      jobCreated: false,
      status: 'error',
      targets: [],
      blockedTargets: [],
      error: message,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe sourceMeta Update
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely update product sourceMeta with story tracking fields.
 *
 * Uses the same isDispatchUpdate context pattern as the existing
 * channel dispatch hook to prevent re-trigger loops.
 */
async function safeUpdateSourceMeta(
  payload: PayloadInstance,
  product: StoryDispatchProduct,
  storyFields: Record<string, unknown>,
  req?: unknown,
): Promise<void> {
  const currentMeta = product.sourceMeta ?? {}

  const updateReq = req as Record<string, unknown> | undefined
  if (updateReq && !updateReq.context) {
    updateReq.context = {}
  }
  if (updateReq?.context && typeof updateReq.context === 'object') {
    (updateReq.context as Record<string, unknown>).isDispatchUpdate = true
  }

  await payload.update({
    collection: 'products',
    id: product.id as string | number,
    data: {
      sourceMeta: {
        ...currentMeta,
        ...storyFields,
      },
    },
    ...(updateReq ? { req: updateReq } : {}),
  })
}
