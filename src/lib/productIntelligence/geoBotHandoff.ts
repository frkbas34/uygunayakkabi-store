/**
 * geoBotHandoff.ts — D-220
 *
 * Hand off an approved Product Intelligence Report to the existing GeoBot
 * publishing pipeline.
 *
 * Design:
 *   - We DO NOT create a new publishing path. We reuse the existing
 *     product.content.{commercePack, discoveryPack} fields that GeoBot and
 *     the channel dispatch already know how to consume.
 *   - On approval we MERGE the report's seoPack + geoPack into the
 *     product's content groups, preserving any non-empty existing values.
 *     We never blind-overwrite: if the operator already had a curated
 *     metaDescription, it stays.
 *   - We emit a `bot-events` record (`eventType: 'pi.sent_to_geo'`) so the
 *     existing event feed surfaces the handoff. The Mentix auto-fix path
 *     (D-181) and audit flow (D-167) both read bot-events, so this plugs
 *     into the existing observability.
 *   - We mark the report `status = 'sent_to_geo'` with timestamp.
 *
 * Safety:
 *   - Never published directly. After this function runs, the normal
 *     operator-driven publish path (channelDispatch / /publish) is what
 *     actually pushes to IG / FB / X / Shopier.
 *   - If the product already has both commercePack.websiteDescription and
 *     discoveryPack.metaTitle populated, we only backfill empty fields.
 */

import type { PiGeoPack, PiSeoPack } from './types'

// NOTE: `data` is `any` so Payload's BasePayload (with collection-specific
// `data` typing) satisfies this shape directly.
type Payload = {
  findByID: (args: { collection: string; id: string | number; depth?: number }) => Promise<any>
  update: (args: { collection: string; id: string | number; data: any }) => Promise<any>
  create: (args: { collection: string; data: any }) => Promise<any>
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'string') return v.trim().length === 0
  if (Array.isArray(v)) return v.length === 0
  return false
}

/** Return `existing` unless it's empty, in which case return `next`. */
function preserve<T>(existing: T | null | undefined, next: T | null | undefined): T | null | undefined {
  return isEmpty(existing) ? next : existing
}

export interface HandoffResult {
  ok: boolean
  reportId: string | number
  productId: string | number
  fieldsUpdated: string[]
  eventId?: string | number
  error?: string
}

/**
 * Merge PI pack into product.content. Returns the field names that were
 * populated (i.e. were previously empty and got filled by the handoff).
 */
function mergeIntoContent(
  existingContent: any,
  seoPack: PiSeoPack,
  geoPack: PiGeoPack,
): { nextContent: any; filled: string[] } {
  const content = existingContent && typeof existingContent === 'object' ? { ...existingContent } : {}
  const commerce = content.commercePack && typeof content.commercePack === 'object' ? { ...content.commercePack } : {}
  const discovery = content.discoveryPack && typeof content.discoveryPack === 'object' ? { ...content.discoveryPack } : {}
  const filled: string[] = []

  // Commerce: websiteDescription <- seoPack.productDescription, shopierCopy <- shortDescription
  if (isEmpty(commerce.websiteDescription) && !isEmpty(seoPack.productDescription)) {
    commerce.websiteDescription = seoPack.productDescription
    filled.push('content.commercePack.websiteDescription')
  }
  if (isEmpty(commerce.shopierCopy) && !isEmpty(seoPack.shortDescription)) {
    commerce.shopierCopy = seoPack.shortDescription
    filled.push('content.commercePack.shopierCopy')
  }

  // Discovery: metaTitle, metaDescription, faq, keywordEntities, articleTitle
  if (isEmpty(discovery.metaTitle) && !isEmpty(seoPack.seoTitle)) {
    discovery.metaTitle = seoPack.seoTitle
    filled.push('content.discoveryPack.metaTitle')
  }
  if (isEmpty(discovery.metaDescription) && !isEmpty(seoPack.metaDescription)) {
    discovery.metaDescription = seoPack.metaDescription
    filled.push('content.discoveryPack.metaDescription')
  }
  if (isEmpty(discovery.faq) && Array.isArray(seoPack.faq) && seoPack.faq.length > 0) {
    discovery.faq = seoPack.faq
    filled.push('content.discoveryPack.faq')
  }
  if (isEmpty(discovery.keywordEntities) && Array.isArray(seoPack.keywords) && seoPack.keywords.length > 0) {
    discovery.keywordEntities = seoPack.keywords
    filled.push('content.discoveryPack.keywordEntities')
  }
  if (isEmpty(discovery.articleTitle) && !isEmpty(geoPack.blogDraftIdea)) {
    discovery.articleTitle = geoPack.blogDraftIdea
    filled.push('content.discoveryPack.articleTitle')
  }

  // Mark provenance so other systems know this came from PI Bot
  if (isEmpty(content.contentGenerationSource)) {
    content.contentGenerationSource = 'product_intelligence'
    filled.push('content.contentGenerationSource')
  }

  // Preserve everything else
  const nextContent = {
    ...content,
    commercePack: { ...content.commercePack, ...commerce },
    discoveryPack: { ...content.discoveryPack, ...discovery },
  }
  // Keep preserve() exported so future callers can reuse the semantic
  void preserve

  return { nextContent, filled }
}

/**
 * Send an approved PI report to the GeoBot handoff path.
 *
 * Preconditions:
 *   - Report status must be 'approved' OR 'ready' (we accept both so the
 *     operator can choose to skip the explicit approval step in an
 *     emergency, but we still require the status to exist).
 *
 * Postconditions:
 *   - Report status = 'sent_to_geo', sentToGeoAt = now.
 *   - product.content backfilled where empty.
 *   - bot-events row created with eventType 'pi.sent_to_geo'.
 */
export async function sendProductIntelligenceToGeoBot(
  payload: Payload,
  reportId: string | number,
): Promise<HandoffResult> {
  const report = await payload.findByID({
    collection: 'product-intelligence-reports',
    id: reportId,
    depth: 0,
  })
  if (!report) {
    return {
      ok: false,
      reportId,
      productId: '',
      fieldsUpdated: [],
      error: 'report_not_found',
    }
  }
  if (!['approved', 'ready'].includes(report.status)) {
    return {
      ok: false,
      reportId,
      productId: report.product,
      fieldsUpdated: [],
      error: `invalid_status_for_handoff: ${report.status}`,
    }
  }

  const productId = typeof report.product === 'object' ? report.product?.id : report.product
  if (!productId) {
    return {
      ok: false,
      reportId,
      productId: '',
      fieldsUpdated: [],
      error: 'report_has_no_product',
    }
  }

  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
  })
  if (!product) {
    return {
      ok: false,
      reportId,
      productId,
      fieldsUpdated: [],
      error: 'product_not_found',
    }
  }

  const seoPack: PiSeoPack = (report.seoPack ?? {}) as PiSeoPack
  const geoPack: PiGeoPack = (report.geoPack ?? {}) as PiGeoPack

  // 1. Merge into product.content (preserve existing non-empty values)
  const { nextContent, filled } = mergeIntoContent(product.content, seoPack, geoPack)

  try {
    await payload.update({
      collection: 'products',
      id: productId,
      data: {
        content: nextContent,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      reportId,
      productId,
      fieldsUpdated: [],
      error: `product_update_failed: ${msg}`,
    }
  }

  // 2. Emit bot-event (non-blocking if it fails)
  let eventId: string | number | undefined
  try {
    const event = await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'pi.sent_to_geo',
        product: productId,
        sourceBot: 'uygunops',
        targetBot: 'geobot',
        status: 'processed',
        payload: {
          reportId,
          fieldsUpdated: filled,
          matchType: report.matchType,
          matchConfidence: report.matchConfidence,
          sourcePolicy: 'reference_only_not_copied',
          approvedByOperator: report.status === 'approved',
        },
        notes: `PI report ${reportId} handed off to GeoBot. Fields backfilled: ${filled.join(', ') || '(none)'}.`,
        processedAt: new Date().toISOString(),
      },
    })
    eventId = event.id
  } catch (err) {
    console.warn('[geoBotHandoff] bot-event creation failed (non-blocking):', err)
  }

  // 3. Mark report as sent
  try {
    await payload.update({
      collection: 'product-intelligence-reports',
      id: reportId,
      data: {
        status: 'sent_to_geo',
        sentToGeoAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      reportId,
      productId,
      fieldsUpdated: filled,
      eventId,
      error: `report_mark_sent_failed: ${msg}`,
    }
  }

  return {
    ok: true,
    reportId,
    productId,
    fieldsUpdated: filled,
    eventId,
  }
}

/** Mark a report approved (pre-handoff step). */
export async function approveReport(
  payload: Payload,
  reportId: string | number,
  operatorUserId?: string | number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await payload.update({
      collection: 'product-intelligence-reports',
      id: reportId,
      data: {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        telegram: { operatorUserId: operatorUserId ?? null },
      },
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** Mark a report rejected. */
export async function rejectReport(
  payload: Payload,
  reportId: string | number,
  operatorUserId?: string | number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await payload.update({
      collection: 'product-intelligence-reports',
      id: reportId,
      data: {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        telegram: { operatorUserId: operatorUserId ?? null },
      },
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
