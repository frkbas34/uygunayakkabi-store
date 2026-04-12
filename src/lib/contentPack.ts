/**
 * contentPack.ts — Phase 6 Geobot Content Pack Foundation
 *
 * Helpers for content generation lifecycle:
 * - Content readiness checks
 * - Empty pack structure creation
 * - Content state transitions
 * - BotEvent emission for content pipeline
 * - Geobot trigger after product confirmation
 *
 * IMPORTANT: This is the FOUNDATION layer.
 * Actual AI content generation (Geobot runtime) is NOT yet wired.
 * All state transitions are truthful — content is never marked as
 * generated unless real output exists.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface CommercePack {
  websiteDescription?: string | null
  instagramCaption?: string | null
  xPost?: string | null
  facebookCopy?: string | null
  shopierCopy?: string | null
  highlights?: string[] | null
  confidence?: number | null
  warnings?: string[] | null
  generatedAt?: string | null
}

export interface DiscoveryPack {
  articleTitle?: string | null
  articleBody?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  faq?: Array<{ q: string; a: string }> | null
  keywordEntities?: string[] | null
  internalLinkTargets?: Array<{ slug: string; anchor: string }> | null
  confidence?: number | null
  warnings?: string[] | null
  generatedAt?: string | null
}

export interface ContentGroup {
  commercePack?: CommercePack | null
  discoveryPack?: DiscoveryPack | null
  linkedBlogPost?: number | string | null
  contentGenerationSource?: 'none' | 'geobot' | 'manual' | 'import' | null
  lastContentGenerationAt?: string | null
}

export interface ContentProduct {
  id: number | string
  title?: string | null
  category?: string | null
  price?: number | null
  description?: string | null
  brand?: number | string | null
  productType?: string | null
  status?: string | null
  content?: ContentGroup | null
  workflow?: {
    workflowStatus?: string | null
    visualStatus?: string | null
    confirmationStatus?: string | null
    contentStatus?: string | null
    lastHandledByBot?: string | null
  } | null
}

export type ContentStatus = 'pending' | 'commerce_generated' | 'discovery_generated' | 'ready' | 'failed'

export interface ContentReadinessResult {
  hasCommercePack: boolean
  hasDiscoveryPack: boolean
  commerceComplete: boolean
  discoveryComplete: boolean
  allReady: boolean
  missingCommerce: string[]
  missingDiscovery: string[]
  contentStatus: ContentStatus
}

export interface ContentTriggerResult {
  triggered: boolean
  eventCreated: boolean
  contentStatus: ContentStatus
  error?: string
}

// ── Constants ─────────────────────────────────────────────────────────

/** Minimum required commerce pack fields for commerce_generated status */
const REQUIRED_COMMERCE_FIELDS: (keyof CommercePack)[] = [
  'websiteDescription',
  'instagramCaption',
  'shopierCopy',
]

/** Minimum required discovery pack fields for discovery_generated status */
const REQUIRED_DISCOVERY_FIELDS: (keyof DiscoveryPack)[] = [
  'articleTitle',
  'articleBody',
  'metaTitle',
  'metaDescription',
]

// ── Empty pack structures ─────────────────────────────────────────────

export function createEmptyCommercePack(): CommercePack {
  return {
    websiteDescription: null,
    instagramCaption: null,
    xPost: null,
    facebookCopy: null,
    shopierCopy: null,
    highlights: null,
    confidence: null,
    warnings: null,
    generatedAt: null,
  }
}

export function createEmptyDiscoveryPack(): DiscoveryPack {
  return {
    articleTitle: null,
    articleBody: null,
    metaTitle: null,
    metaDescription: null,
    faq: null,
    keywordEntities: null,
    internalLinkTargets: null,
    confidence: null,
    warnings: null,
    generatedAt: null,
  }
}

// ── Content readiness checks ──────────────────────────────────────────

function hasNonEmptyString(val: unknown): boolean {
  return typeof val === 'string' && val.trim().length > 0
}

export function checkCommercePackComplete(pack: CommercePack | null | undefined): {
  complete: boolean
  missing: string[]
} {
  if (!pack) return { complete: false, missing: [...REQUIRED_COMMERCE_FIELDS] }
  const missing: string[] = []
  for (const field of REQUIRED_COMMERCE_FIELDS) {
    if (!hasNonEmptyString(pack[field])) {
      missing.push(field)
    }
  }
  return { complete: missing.length === 0, missing }
}

export function checkDiscoveryPackComplete(pack: DiscoveryPack | null | undefined): {
  complete: boolean
  missing: string[]
} {
  if (!pack) return { complete: false, missing: [...REQUIRED_DISCOVERY_FIELDS] }
  const missing: string[] = []
  for (const field of REQUIRED_DISCOVERY_FIELDS) {
    if (!hasNonEmptyString(pack[field])) {
      missing.push(field)
    }
  }
  return { complete: missing.length === 0, missing }
}

/**
 * Evaluate full content readiness and determine the correct contentStatus.
 */
export function checkContentReadiness(product: ContentProduct): ContentReadinessResult {
  const commerce = checkCommercePackComplete(product.content?.commercePack)
  const discovery = checkDiscoveryPackComplete(product.content?.discoveryPack)

  const hasCommercePack = commerce.complete
  const hasDiscoveryPack = discovery.complete
  const allReady = hasCommercePack && hasDiscoveryPack

  let contentStatus: ContentStatus = 'pending'
  if (allReady) {
    contentStatus = 'ready'
  } else if (hasDiscoveryPack) {
    contentStatus = 'discovery_generated'
  } else if (hasCommercePack) {
    contentStatus = 'commerce_generated'
  }

  return {
    hasCommercePack,
    hasDiscoveryPack,
    commerceComplete: commerce.complete,
    discoveryComplete: discovery.complete,
    allReady,
    missingCommerce: commerce.missing,
    missingDiscovery: discovery.missing,
    contentStatus,
  }
}

// ── Product eligibility ───────────────────────────────────────────────

/**
 * Check if a product is eligible for content generation.
 * VF-4: Must have approved visuals, be confirmed, and not already fully generated.
 */
export function isContentEligible(product: ContentProduct): boolean {
  // VF-4: Must have operator-approved visuals
  if (product.workflow?.visualStatus !== 'approved') return false

  // Must be confirmed
  if (product.workflow?.confirmationStatus !== 'confirmed') return false

  // Must not be already fully ready
  if (product.workflow?.contentStatus === 'ready') return false

  return true
}

/**
 * Check if a product should auto-trigger content generation after confirmation.
 * Returns true if confirmed AND content is still pending.
 */
export function shouldAutoTriggerContent(product: ContentProduct): boolean {
  if (!isContentEligible(product)) return false

  // Only auto-trigger if content is still pending (not partially generated or failed)
  const contentStatus = product.workflow?.contentStatus
  return !contentStatus || contentStatus === 'pending'
}

/**
 * Check if a product can be retried for content generation.
 * Returns true if content is in a partial state (commerce_generated / discovery_generated)
 * or failed, meaning a retry could complete the missing pack.
 */
export function canRetriggerContent(product: ContentProduct): boolean {
  if (!isContentEligible(product)) return false
  const contentStatus = product.workflow?.contentStatus
  return contentStatus === 'commerce_generated' || contentStatus === 'discovery_generated' || contentStatus === 'failed'
}

// ── Geobot trigger ────────────────────────────────────────────────────

/**
 * Trigger content generation for a confirmed product.
 *
 * Phase 7: NOW CALLS REAL GEOBOT RUNTIME.
 * 1. Sets workflow to content_pending
 * 2. Emits BotEvent(content.requested)
 * 3. Calls geobotRuntime.generateFullContentPack() — REAL AI generation
 * 4. Writes results to product content fields
 * 5. Updates contentStatus truthfully (commerce_generated/discovery_generated/ready/failed)
 * 6. Emits appropriate BotEvents
 * 7. If discovery pack generated, creates/links BlogPost
 *
 * Non-blocking: catches all errors, never throws.
 */
export async function triggerContentGeneration(
  payload: any, // PayloadInstance
  product: ContentProduct,
  triggerSource: 'auto_confirmation' | 'telegram_command' | 'admin' | 'retry',
  req?: any,
): Promise<ContentTriggerResult> {
  const updateReq = req
    ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } }
    : { context: { isDispatchUpdate: true } }

  try {
    // 1. Set workflow to content_pending
    const workflowUpdate: Record<string, unknown> = {
      ...(product.workflow ?? {}),
      contentStatus: 'pending',
      lastHandledByBot: 'geobot',
    }
    if (product.workflow?.workflowStatus === 'confirmed') {
      workflowUpdate.workflowStatus = 'content_pending'
    }

    await payload.update({
      collection: 'products',
      id: product.id,
      data: {
        workflow: workflowUpdate,
        content: {
          ...(product.content ?? {}),
          contentGenerationSource: 'geobot',
          lastContentGenerationAt: new Date().toISOString(),
        },
      },
      req: updateReq,
    })

    // 2. Emit content.requested BotEvent
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'content.requested',
        product: product.id,
        sourceBot: 'uygunops',
        targetBot: 'geobot',
        status: 'pending',
        payload: {
          triggerSource,
          productTitle: product.title ?? null,
          category: product.category ?? null,
          price: product.price ?? null,
          previousContentStatus: product.workflow?.contentStatus ?? 'unknown',
          requestedAt: new Date().toISOString(),
        },
        notes: `Content generation requested for product ${product.id} (${product.title ?? 'untitled'}) via ${triggerSource}.`,
      },
    })

    // 3. Check GEMINI_API_KEY availability
    if (!process.env.GEMINI_API_KEY) {
      console.warn(`[contentPack] GEMINI_API_KEY not set — content generation deferred for product ${product.id}`)
      return {
        triggered: true,
        eventCreated: true,
        contentStatus: 'pending',
      }
    }

    // 4. Call real Geobot runtime
    const { generateFullContentPack } = await import('@/lib/geobotRuntime')

    // Build product context — resolve brand name if it's a relationship ID
    let brandName: string | null = null
    if (product.brand) {
      try {
        const brandDoc = await payload.findByID({ collection: 'brands', id: product.brand, depth: 0 })
        brandName = (brandDoc as any)?.name ?? null
      } catch {
        // Brand not resolved — continue without it
      }
    }

    // Resolve variants if not populated
    let variants = (product as any).variants ?? []
    if (variants.length > 0 && typeof variants[0] === 'number') {
      // Variants are IDs, need to resolve
      try {
        const { docs } = await payload.find({
          collection: 'variants',
          where: { product: { equals: product.id } },
          limit: 50,
          depth: 0,
        })
        variants = docs
      } catch {
        variants = []
      }
    }

    const productContext = {
      id: product.id,
      title: product.title ?? `Ürün #${product.id}`,
      category: product.category,
      price: product.price,
      originalPrice: (product as any).originalPrice ?? null,
      description: product.description,
      brand: brandName,
      productType: product.productType,
      variants,
      stockQuantity: (product as any).stockQuantity ?? null,
    }

    const result = await generateFullContentPack(productContext)

    // 5. Write results to product
    const contentUpdate: Record<string, unknown> = {
      ...(product.content ?? {}),
      contentGenerationSource: 'geobot',
      lastContentGenerationAt: new Date().toISOString(),
    }

    if (result.commercePack) {
      contentUpdate.commercePack = result.commercePack
    }
    if (result.discoveryPack) {
      contentUpdate.discoveryPack = result.discoveryPack
    }

    // 6. Determine truthful contentStatus
    // On retry, account for packs that already exist in the product (from a previous partial run)
    // so that e.g. existing commercePack + newly generated discoveryPack → 'ready'
    const hasCommerce = !!result.commercePack || !!(product.content?.commercePack?.websiteDescription)
    const hasDiscovery = !!result.discoveryPack || !!(product.content?.discoveryPack?.articleTitle)
    let finalContentStatus: ContentStatus = 'failed'
    if (hasCommerce && hasDiscovery) {
      finalContentStatus = 'ready'
    } else if (hasDiscovery) {
      finalContentStatus = 'discovery_generated'
    } else if (hasCommerce) {
      finalContentStatus = 'commerce_generated'
    }

    const finalWorkflowStatus = finalContentStatus === 'ready' ? 'content_ready' : undefined

    await payload.update({
      collection: 'products',
      id: product.id,
      data: {
        content: contentUpdate,
        workflow: {
          ...(product.workflow ?? {}),
          contentStatus: finalContentStatus,
          lastHandledByBot: 'geobot',
          ...(finalWorkflowStatus ? { workflowStatus: finalWorkflowStatus } : {}),
        },
      },
      req: updateReq,
    })

    // 7. Emit appropriate BotEvents
    if (result.commercePack) {
      await payload.create({
        collection: 'bot-events',
        data: {
          eventType: 'content.commerce_generated',
          product: product.id,
          sourceBot: 'geobot',
          status: 'processed',
          payload: {
            confidence: result.commercePack.confidence,
            warnings: result.commercePack.warnings,
            generatedAt: result.commercePack.generatedAt,
          },
          notes: `Commerce pack generated for product ${product.id}. Confidence: ${result.commercePack.confidence}%.`,
          processedAt: new Date().toISOString(),
        },
      })
    }

    if (result.discoveryPack) {
      await payload.create({
        collection: 'bot-events',
        data: {
          eventType: 'content.discovery_generated',
          product: product.id,
          sourceBot: 'geobot',
          status: 'processed',
          payload: {
            confidence: result.discoveryPack.confidence,
            warnings: result.discoveryPack.warnings,
            generatedAt: result.discoveryPack.generatedAt,
          },
          notes: `Discovery pack generated for product ${product.id}. Confidence: ${result.discoveryPack.confidence}%.`,
          processedAt: new Date().toISOString(),
        },
      })

      // 8. Create/link BlogPost from discovery pack
      try {
        const blogPost = await createBlogPostFromDiscovery(payload, product, result.discoveryPack)
        if (blogPost) {
          await payload.update({
            collection: 'products',
            id: product.id,
            data: {
              content: {
                ...contentUpdate,
                ...(result.commercePack ? { commercePack: result.commercePack } : {}),
                discoveryPack: result.discoveryPack,
                linkedBlogPost: blogPost.id,
              },
            },
            req: updateReq,
          })
          console.log(`[contentPack] BlogPost created — id=${blogPost.id} product=${product.id}`)
        }
      } catch (blogErr) {
        console.error(
          `[contentPack] BlogPost creation failed (non-blocking) — product=${product.id}:`,
          blogErr instanceof Error ? blogErr.message : String(blogErr),
        )
      }
    }

    // Emit content.ready if both packs succeeded
    if (finalContentStatus === 'ready') {
      await emitContentReady(payload, product.id)

      // Non-blocking: auto-trigger Mentix audit after content is ready
      try {
        const { shouldAutoTriggerAudit, triggerAudit } = await import('@/lib/mentixAudit')
        // Re-fetch product with updated content fields for accurate audit
        const updatedProduct = await payload.findByID({
          collection: 'products',
          id: product.id,
          depth: 1,
        })
        if (updatedProduct && shouldAutoTriggerAudit(updatedProduct)) {
          triggerAudit(payload, updatedProduct, 'auto_content_ready', req).catch((auditErr: unknown) => {
            console.error(
              `[contentPack] Auto-audit trigger failed (non-blocking) — product=${product.id}:`,
              auditErr instanceof Error ? auditErr.message : String(auditErr),
            )
          })
          console.log(`[contentPack] Auto-audit triggered for product=${product.id}`)
        }
      } catch (auditImportErr) {
        console.error(
          `[contentPack] Audit module import failed (non-blocking):`,
          auditImportErr instanceof Error ? auditImportErr.message : String(auditImportErr),
        )
      }
    }

    // Emit content.failed if neither succeeded
    if (!result.success) {
      await markContentFailed(payload, product.id, product, result.error ?? 'Unknown generation error', req)
    }

    return {
      triggered: true,
      eventCreated: true,
      contentStatus: finalContentStatus,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[contentPack] triggerContentGeneration failed for product ${product.id}:`, msg)

    // Try to mark as failed
    try {
      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          workflow: {
            ...(product.workflow ?? {}),
            contentStatus: 'failed',
            lastHandledByBot: 'geobot',
          },
        },
        req: updateReq,
      })
    } catch { /* best effort */ }

    return {
      triggered: false,
      eventCreated: false,
      contentStatus: 'failed',
      error: msg,
    }
  }
}

// ── BlogPost creation from discovery pack ─────────────────────────────

async function createBlogPostFromDiscovery(
  payload: any,
  product: ContentProduct,
  discoveryPack: import('@/lib/geobotRuntime').DiscoveryPackOutput,
): Promise<{ id: number | string } | null> {
  if (!discoveryPack.articleTitle || !discoveryPack.articleBody) {
    return null
  }

  // Generate slug from article title
  const slug = discoveryPack.articleTitle
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

  const blogPost = await payload.create({
    collection: 'blog-posts',
    data: {
      title: discoveryPack.articleTitle,
      slug: `${slug}-${product.id}`,
      excerpt: discoveryPack.metaDescription || discoveryPack.articleTitle,
      // BlogPosts uses richText for content — we pass the article body as a simple paragraph
      // Payload Lexical requires specific node structure; use a root with paragraph
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: discoveryPack.articleBody,
                  format: 0,
                  detail: 0,
                  mode: 'normal',
                  style: '',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      category: 'seo',
      status: 'draft', // Draft — operator can review and publish
      source: 'ai',
      author: 'Geobot',
      seo: {
        title: discoveryPack.metaTitle || discoveryPack.articleTitle,
        description: discoveryPack.metaDescription || '',
        keywords: (discoveryPack.keywordEntities || []).join(', '),
      },
      relatedProducts: [product.id],
      // publishedAt intentionally null — set when operator publishes the post
    },
  })

  return blogPost
}

// ── Content status update helpers ─────────────────────────────────────

/**
 * Update content status after commerce pack generation.
 * Called by future Geobot runtime after generating commerce content.
 */
export async function markCommerceGenerated(
  payload: any,
  productId: number | string,
  currentProduct: ContentProduct,
  req?: any,
): Promise<void> {
  const updateReq = req
    ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } }
    : { context: { isDispatchUpdate: true } }

  // Determine new contentStatus
  const discoveryDone = checkDiscoveryPackComplete(currentProduct.content?.discoveryPack).complete
  const newContentStatus: ContentStatus = discoveryDone ? 'ready' : 'commerce_generated'

  // Determine workflowStatus progression
  const newWorkflowStatus = newContentStatus === 'ready' ? 'content_ready' : undefined

  await payload.update({
    collection: 'products',
    id: productId,
    data: {
      workflow: {
        ...(currentProduct.workflow ?? {}),
        contentStatus: newContentStatus,
        lastHandledByBot: 'geobot',
        ...(newWorkflowStatus ? { workflowStatus: newWorkflowStatus } : {}),
      },
    },
    req: updateReq,
  })

  // Emit BotEvent
  await payload.create({
    collection: 'bot-events',
    data: {
      eventType: 'content.commerce_generated',
      product: productId,
      sourceBot: 'geobot',
      status: 'processed',
      payload: {
        newContentStatus,
        generatedAt: new Date().toISOString(),
      },
      notes: `Commerce pack generated for product ${productId}. contentStatus=${newContentStatus}.`,
      processedAt: new Date().toISOString(),
    },
  })
}

/**
 * Update content status after discovery pack generation.
 * Called by future Geobot runtime after generating discovery content.
 */
export async function markDiscoveryGenerated(
  payload: any,
  productId: number | string,
  currentProduct: ContentProduct,
  req?: any,
): Promise<void> {
  const updateReq = req
    ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } }
    : { context: { isDispatchUpdate: true } }

  const commerceDone = checkCommercePackComplete(currentProduct.content?.commercePack).complete
  const newContentStatus: ContentStatus = commerceDone ? 'ready' : 'discovery_generated'
  const newWorkflowStatus = newContentStatus === 'ready' ? 'content_ready' : undefined

  await payload.update({
    collection: 'products',
    id: productId,
    data: {
      workflow: {
        ...(currentProduct.workflow ?? {}),
        contentStatus: newContentStatus,
        lastHandledByBot: 'geobot',
        ...(newWorkflowStatus ? { workflowStatus: newWorkflowStatus } : {}),
      },
    },
    req: updateReq,
  })

  await payload.create({
    collection: 'bot-events',
    data: {
      eventType: 'content.discovery_generated',
      product: productId,
      sourceBot: 'geobot',
      status: 'processed',
      payload: {
        newContentStatus,
        generatedAt: new Date().toISOString(),
      },
      notes: `Discovery pack generated for product ${productId}. contentStatus=${newContentStatus}.`,
      processedAt: new Date().toISOString(),
    },
  })
}

/**
 * Mark content generation as failed.
 */
export async function markContentFailed(
  payload: any,
  productId: number | string,
  currentProduct: ContentProduct,
  error: string,
  req?: any,
): Promise<void> {
  const updateReq = req
    ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } }
    : { context: { isDispatchUpdate: true } }

  await payload.update({
    collection: 'products',
    id: productId,
    data: {
      workflow: {
        ...(currentProduct.workflow ?? {}),
        contentStatus: 'failed',
        lastHandledByBot: 'geobot',
      },
    },
    req: updateReq,
  })

  await payload.create({
    collection: 'bot-events',
    data: {
      eventType: 'content.failed',
      product: productId,
      sourceBot: 'geobot',
      status: 'failed',
      payload: {
        error,
        failedAt: new Date().toISOString(),
      },
      notes: `Content generation failed for product ${productId}: ${error}`,
      processedAt: new Date().toISOString(),
    },
  })
}

/**
 * Emit content.ready event when both packs are complete.
 * Called after the second pack is generated (whichever comes last).
 */
export async function emitContentReady(
  payload: any,
  productId: number | string,
): Promise<void> {
  await payload.create({
    collection: 'bot-events',
    data: {
      eventType: 'content.ready',
      product: productId,
      sourceBot: 'geobot',
      status: 'processed',
      payload: {
        readyAt: new Date().toISOString(),
      },
      notes: `All content packs ready for product ${productId}. Commerce + Discovery complete.`,
      processedAt: new Date().toISOString(),
    },
  })
}

// ── Content summary for Telegram ──────────────────────────────────────

export function formatContentStatusMessage(product: ContentProduct): string {
  const title = product.title ?? `Ürün #${product.id}`
  const readiness = checkContentReadiness(product)

  const lines = [
    `📝 <b>İçerik Durumu — ${title}</b> (ID: ${product.id})`,
    ``,
    `<b>contentStatus:</b> ${product.workflow?.contentStatus ?? 'pending'}`,
    `<b>contentGenerationSource:</b> ${product.content?.contentGenerationSource ?? 'none'}`,
    ``,
  ]

  // Commerce pack
  if (readiness.commerceComplete) {
    lines.push(`🛒 <b>Commerce Pack:</b> ✅ Hazır`)
    lines.push(`   Üretim: ${product.content?.commercePack?.generatedAt ?? '—'}`)
    lines.push(`   Güven: ${product.content?.commercePack?.confidence ?? '—'}`)
  } else {
    lines.push(`🛒 <b>Commerce Pack:</b> ❌ Eksik`)
    if (readiness.missingCommerce.length > 0) {
      lines.push(`   Eksik: ${readiness.missingCommerce.join(', ')}`)
    }
  }

  lines.push(``)

  // Discovery pack
  if (readiness.discoveryComplete) {
    lines.push(`🔍 <b>Discovery Pack:</b> ✅ Hazır`)
    lines.push(`   Üretim: ${product.content?.discoveryPack?.generatedAt ?? '—'}`)
    lines.push(`   Güven: ${product.content?.discoveryPack?.confidence ?? '—'}`)
  } else {
    lines.push(`🔍 <b>Discovery Pack:</b> ❌ Eksik`)
    if (readiness.missingDiscovery.length > 0) {
      lines.push(`   Eksik: ${readiness.missingDiscovery.join(', ')}`)
    }
  }

  lines.push(``)

  // Blog linkage
  if (product.content?.linkedBlogPost) {
    lines.push(`📰 <b>Blog:</b> Bağlı (ID: ${product.content.linkedBlogPost})`)
  } else {
    lines.push(`📰 <b>Blog:</b> Henüz bağlı değil`)
  }

  // Overall
  lines.push(``)
  if (readiness.allReady) {
    lines.push(`✅ <b>Tüm içerikler hazır!</b>`)
  } else {
    lines.push(`⏳ <b>İçerik üretimi devam ediyor...</b>`)
    lines.push(`⏳ İçerik üretimi beklemede veya devam ediyor (Gemini AI).`)
  }

  return lines.join('\n')
}

/**
 * D-172g: Format a content preview message for Telegram — shows all generated
 * commerce pack fields (Instagram, Facebook, Website, Shopier, X, highlights)
 * in a compact, operator-readable preview format.
 */
export function formatContentPreviewMessage(product: ContentProduct): string | null {
  const cp = product.content?.commercePack
  if (!cp) return null

  const hasAny = cp.instagramCaption || cp.websiteDescription || cp.facebookCopy || cp.shopierCopy || cp.xPost
  if (!hasAny) return null

  const title = product.title ?? `Ürün #${product.id}`
  const truncate = (s: string | null | undefined, max: number): string => {
    if (!s) return '—'
    return s.length > max ? s.substring(0, max) + '…' : s
  }

  const lines = [
    `👁️ <b>İçerik Önizleme — ${title}</b> (ID: ${product.id})`,
    ``,
  ]

  if (cp.instagramCaption) {
    lines.push(`📸 <b>Instagram:</b>`)
    lines.push(`<pre>${truncate(cp.instagramCaption, 300)}</pre>`)
    lines.push(``)
  }

  if (cp.facebookCopy) {
    lines.push(`📘 <b>Facebook:</b>`)
    lines.push(`<pre>${truncate(cp.facebookCopy, 300)}</pre>`)
    lines.push(``)
  }

  if (cp.websiteDescription) {
    lines.push(`🌐 <b>Website:</b>`)
    lines.push(`<pre>${truncate(cp.websiteDescription, 250)}</pre>`)
    lines.push(``)
  }

  if (cp.shopierCopy) {
    lines.push(`🛍️ <b>Shopier:</b>`)
    lines.push(`<pre>${truncate(cp.shopierCopy, 200)}</pre>`)
    lines.push(``)
  }

  if (cp.xPost) {
    lines.push(`🐦 <b>X / Twitter:</b>`)
    lines.push(`<pre>${truncate(cp.xPost, 280)}</pre>`)
    lines.push(``)
  }

  if (cp.highlights && cp.highlights.length > 0) {
    lines.push(`✨ <b>Öne Çıkanlar:</b>`)
    for (const h of cp.highlights.slice(0, 5)) {
      lines.push(`  • ${h}`)
    }
    lines.push(``)
  }

  // Discovery pack summary (title + meta only — article body is too long)
  const dp = product.content?.discoveryPack
  if (dp?.articleTitle || dp?.metaTitle) {
    lines.push(`📰 <b>SEO / Discovery:</b>`)
    if (dp.articleTitle) lines.push(`  Makale: <i>${truncate(dp.articleTitle, 80)}</i>`)
    if (dp.metaTitle) lines.push(`  Meta Title: <i>${truncate(dp.metaTitle, 80)}</i>`)
    if (dp.metaDescription) lines.push(`  Meta Desc: <i>${truncate(dp.metaDescription, 120)}</i>`)
    lines.push(``)
  }

  return lines.join('\n')
}
