import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'
import { parseTelegramCaption, evaluatePublishReadiness } from '@/lib/telegram'
import {
  fetchAutomationSettings,
  resolveProductStatus,
  resolveChannelTargets,
  resolveContentDecision,
} from '@/lib/automationDecision'

/**
 * POST /api/automation/products
 * Internal automation endpoint for n8n → Payload product creation.
 * Uses Payload local API — no JWT needed, auth via shared secret header.
 *
 * Header: X-Automation-Secret: <AUTOMATION_SECRET env var>
 * Body: product fields (title required, price, sku, status, etc.)
 *
 * Step 11 additions:
 *   - Accepts rawCaption / messageText / caption and runs enhanced caption parser
 *   - Stores parseWarnings, parseConfidence, rawCaption in automationMeta
 *   - Returns parsed_fields, readiness, parse_confidence in response for n8n
 *
 * Step 12 additions:
 *   - Reads AutomationSettings global via decision layer
 *   - resolveProductStatus: status is now toggle-controlled, not hardcoded
 *   - resolveChannelTargets: effective channels respect global capability gates
 *   - resolveContentDecision: returns blog/image generation intent for n8n
 *   - autoDecision + autoDecisionReason stored in automationMeta for admin visibility
 *
 * Idempotency (Step 7):
 *   If automationMeta.telegramChatId + automationMeta.telegramMessageId are both
 *   present in the request body, we query for an existing product with the same
 *   pair before creating a new one.
 *   Response on duplicate: { status: "duplicate", product_id, title, slug, ... }
 */
export async function POST(req: NextRequest) {
  // Auth: shared secret header check
  const secret = req.headers.get('X-Automation-Secret')
  if (!process.env.AUTOMATION_SECRET || secret !== process.env.AUTOMATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // ── Step 11: Caption parsing ─────────────────────────────────────────────
  const captionText =
    (body.rawCaption as string | undefined) ||
    (body.messageText as string | undefined) ||
    (body.caption as string | undefined) ||
    null

  let parsedFromCaption: ReturnType<typeof parseTelegramCaption> = null
  if (captionText) {
    parsedFromCaption = parseTelegramCaption(captionText)
  }

  // Merge: body fields take priority, parser fills gaps
  const mergedTitle =
    (body.title as string | undefined) ||
    parsedFromCaption?.title ||
    undefined

  const mergedPrice = (() => {
    if (typeof body.price === 'number') return body.price
    if (parsedFromCaption?.price !== undefined) return parsedFromCaption.price
    return undefined
  })()

  const mergedSku =
    (body.sku as string | undefined) ||
    parsedFromCaption?.sku ||
    undefined

  const mergedCategory =
    (body.category as string | undefined) ||
    parsedFromCaption?.category ||
    undefined

  const mergedBrand =
    (body.brand as string | undefined) ||
    parsedFromCaption?.brand ||
    undefined

  const mergedProductFamily =
    (body.productFamily as string | undefined) ||
    parsedFromCaption?.productFamily ||
    undefined

  const mergedProductType =
    (body.productType as string | undefined) ||
    parsedFromCaption?.productType ||
    undefined

  // Validate required field
  if (!mergedTitle || typeof mergedTitle !== 'string') {
    return NextResponse.json(
      {
        error: 'title is required (provide explicitly or in caption)',
        parseWarnings: parsedFromCaption?.parseWarnings ?? [],
        parseConfidence: parsedFromCaption?.parseConfidence ?? 0,
      },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload()

    // ── Step 12: Load AutomationSettings ────────────────────────────────────
    const automationSettings = await fetchAutomationSettings(payload)

    // ── Idempotency check ────────────────────────────────────────────────────
    const meta = body.automationMeta as Record<string, string> | undefined
    const tgChatId = meta?.telegramChatId
    const tgMsgId = meta?.telegramMessageId

    if (tgChatId && tgMsgId) {
      const existing = await payload.find({
        collection: 'products',
        where: {
          and: [
            { 'automationMeta.telegramChatId': { equals: tgChatId } },
            { 'automationMeta.telegramMessageId': { equals: tgMsgId } },
          ],
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        const dup = existing.docs[0]
        console.log(
          `[automation/products] duplicate blocked — chat_id=${tgChatId} msg_id=${tgMsgId} existing_id=${dup.id}`,
        )
        return NextResponse.json(
          {
            status: 'duplicate',
            product_id: dup.id,
            title: dup.title,
            slug: (dup as Record<string, unknown>).slug,
            workflow: 'n8n-automation',
            message: 'Bu Telegram mesajından zaten bir ürün oluşturulmuş. Tekrar oluşturulmadı.',
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        )
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Stock quantity: body > parser > default 1
    const stockQty = (() => {
      const rawBody = body.stockQuantity ?? body.quantity
      if (rawBody !== undefined) {
        const n = typeof rawBody === 'number' ? rawBody : Number(rawBody)
        if (!isNaN(n) && n >= 0) return n
      }
      if (parsedFromCaption?.quantity !== undefined) return parsedFromCaption.quantity
      return 1
    })()

    // ── Step 11: Publish readiness evaluation ────────────────────────────────
    // NOTE: hasImages is false at creation time (images come via attach-media)
    const readiness = evaluatePublishReadiness({
      title: mergedTitle,
      price: mergedPrice,
      sku: mergedSku,
      hasImages: false,
      category: mergedCategory,
      brand: mergedBrand,
      stockQuantity: stockQty,
    })

    // ── Step 12: Status decision via decision layer ──────────────────────────
    // Per-product override: body may include automationFlags.autoActivate
    const automationFlags = body.automationFlags as Record<string, boolean> | undefined
    const productAutoActivateOverride = automationFlags?.autoActivate ?? null

    const statusDecision = resolveProductStatus(
      {
        parseConfidence: parsedFromCaption?.parseConfidence ?? null,
        readiness,
        productAutoActivateOverride,
        explicitStatus: (body.status as string | undefined) ?? null,
      },
      automationSettings,
    )

    // ── Step 12: Channel targets via decision layer ──────────────────────────
    const rawChannelTargets =
      (body.channelTargets as string[] | undefined) ||
      parsedFromCaption?.channelTargets ||
      ['website']

    const channelDecision = resolveChannelTargets(rawChannelTargets, automationSettings)

    // ── Step 12: Content generation decision ─────────────────────────────────
    const contentDecision = resolveContentDecision(
      automationFlags ?? null,
      parsedFromCaption?.seoRequested ?? false,
      automationSettings,
    )

    // ── Build automationMeta ─────────────────────────────────────────────────
    const telegram = body.telegram as Record<string, string> | undefined
    const mergedMeta: Record<string, unknown> = {
      ...(meta ?? {}),
      ...(telegram?.from_user_id ? { telegramFromUserId: telegram.from_user_id } : {}),
      ...(telegram?.chat_type    ? { telegramChatType:   telegram.chat_type }    : {}),
      ...(telegram?.chat_id && !meta?.telegramChatId
          ? { telegramChatId: telegram.chat_id } : {}),
      ...(telegram?.message_id && !meta?.telegramMessageId
          ? { telegramMessageId: telegram.message_id } : {}),
      // Step 11: parser metadata
      ...(parsedFromCaption ? {
        rawCaption: parsedFromCaption.rawCaption,
        parseWarnings: JSON.stringify(parsedFromCaption.parseWarnings),
        parseConfidence: parsedFromCaption.parseConfidence,
      } : {}),
      // Step 12: decision metadata — visible in admin ReviewPanel
      autoDecision: statusDecision.status,
      autoDecisionReason: statusDecision.reason,
    }

    // ── channels group: sync with effective channel targets ──────────────────
    const channelsGroup = {
      publishWebsite: channelDecision.effectiveTargets.includes('website'),
      publishInstagram: channelDecision.effectiveTargets.includes('instagram'),
      publishShopier: channelDecision.effectiveTargets.includes('shopier'),
      publishDolap: channelDecision.effectiveTargets.includes('dolap'),
      // Merge with any explicit channels from body (explicit wins)
      ...(body.channels ? (body.channels as Record<string, boolean>) : {}),
    }

    const product = await payload.create({
      collection: 'products',
      data: {
        title: mergedTitle,
        price: typeof mergedPrice === 'number' ? mergedPrice : 0,
        status: statusDecision.status,
        source: (body.source as string) || 'n8n',
        stockQuantity: stockQty,
        ...(mergedSku ? { sku: mergedSku } : {}),
        ...(mergedCategory ? { category: mergedCategory } : {}),
        ...(mergedBrand ? { brand: mergedBrand } : {}),
        ...(mergedProductFamily ? { productFamily: mergedProductFamily } : {}),
        ...(mergedProductType ? { productType: mergedProductType } : {}),
        channelTargets: channelDecision.effectiveTargets as any,
        channels: channelsGroup,
        ...(automationFlags ? { automationFlags } : {}),
        automationMeta: mergedMeta,
      },
    })

    const productData = product as Record<string, unknown>

    console.log(
      `[automation/products] created — id=${product.id} title="${product.title}" ` +
      `status=${statusDecision.status} confidence=${parsedFromCaption?.parseConfidence ?? 'N/A'} ` +
      `channels=[${channelDecision.effectiveTargets.join(',')}] ` +
      `reason="${statusDecision.reason}"`,
    )

    return NextResponse.json(
      {
        status: 'created',
        product_id: product.id,
        title: product.title,
        slug: productData.slug,
        sku: productData.sku,
        stock_quantity: productData.stockQuantity ?? stockQty,
        product_status: statusDecision.status,
        // Step 11: parser info
        parsed_fields: parsedFromCaption ? {
          title: parsedFromCaption.title,
          price: parsedFromCaption.price,
          sku: parsedFromCaption.sku,
          quantity: parsedFromCaption.quantity,
          category: parsedFromCaption.category,
          brand: parsedFromCaption.brand,
          productFamily: parsedFromCaption.productFamily,
          publishRequested: parsedFromCaption.publishRequested,
          seoRequested: parsedFromCaption.seoRequested,
        } : null,
        parse_confidence: parsedFromCaption?.parseConfidence ?? null,
        parse_warnings: parsedFromCaption?.parseWarnings ?? [],
        // Step 12: decision info (useful for n8n to log or branch on)
        decision: {
          status: statusDecision.status,
          reason: statusDecision.reason,
          blocked_by: statusDecision.blockedBy ?? null,
        },
        channels: {
          effective: channelDecision.effectiveTargets,
          blocked_by_global: channelDecision.blockedByGlobal,
          summary: channelDecision.summary,
        },
        content_intent: {
          generate_blog: contentDecision.shouldGenerateBlog,
          auto_publish_blog: contentDecision.shouldAutoPublishBlog,
          generate_extra_views: contentDecision.shouldGenerateExtraViews,
          try_on_enabled: contentDecision.tryOnEnabled,
        },
        readiness: {
          is_ready: readiness.isReady,
          missing_critical: readiness.missingCritical,
          score: readiness.score,
        },
        workflow: 'n8n-automation',
        timestamp: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const cause = (err as Record<string, unknown>)?.cause
    const causeMsg = cause instanceof Error ? cause.message : (typeof cause === 'string' ? cause : '')
    console.error('[automation/products] create failed:', message, causeMsg)
    return NextResponse.json({ error: message, cause: causeMsg }, { status: 500 })
  }
}
