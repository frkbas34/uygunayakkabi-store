/**
 * /api/supplier-scout — SupplierScout Telegram Webhook Handler
 *
 * Separate from /api/telegram (Uygunops + GeoBot).
 * Uses SUPPLIER_SCOUT_BOT_TOKEN — never touches main bot flows.
 *
 * Entry points:
 *   POST /api/supplier-scout          — Telegram webhook (group messages + DM commands)
 *   GET  /api/supplier-scout?action=daily_report  — Cron trigger for daily report
 *   GET  /api/supplier-scout?action=register_webhook  — One-time webhook registration
 *   GET  /api/supplier-scout?action=health  — System health check
 *
 * Group message flow:
 *   1. Verify secret_token header
 *   2. Identify sender group → load SupplierGroupConfig
 *   3. Classify message (Gemini NLP)
 *   4. If new_product/product_update → parseProductOffer → checkAutoCreateGate → autoCreateProduct
 *   5. If sold_out/partial_sold_out → parseSoldOutSignal → matchSoldOutToProduct → applySoldOut or warn
 *   6. Log all actions to SupplierActionsLog + WholesaleOpportunities
 *   7. Update SupplierScoutSettings.lastWebhookReceivedAt
 *
 * DM command flow:
 *   1. Verify sender is Frank (frankChatId in SupplierScoutSettings)
 *   2. Route to commands.ts handler
 *   3. Return response
 *
 * SAFETY: No modification to main Uygunops/GeoBot flows.
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/lib/payload'
import type { TgUpdate, TgMessage, SupplierGroupConfig } from '@/lib/supplierScout/types'
import { classifySupplierMessage } from '@/lib/supplierScout/classifier'
import { parseProductOffer, parseSoldOutSignal } from '@/lib/supplierScout/parser'
import { matchSoldOutToProduct, applySoldOut } from '@/lib/supplierScout/soldoutMatcher'
import {
  checkAutoCreateGate,
  autoCreateProduct,
} from '@/lib/supplierScout/productCreator'
import {
  loadLanguageMemory,
  loadRecentCorrections,
  loadSellerMemory,
  incrementSellerStats,
  logAction,
} from '@/lib/supplierScout/memory'
import {
  buildDailyReport,
  formatDailyReport,
  saveDailyReport,
} from '@/lib/supplierScout/reportGenerator'
import {
  scoutSendMessage,
  registerScoutWebhook,
} from '@/lib/supplierScout/telegram'
import {
  handleDMCommand,
} from '@/lib/supplierScout/commands'

// Vercel timeout — Gemini calls can take 10–20s; give enough headroom
export const maxDuration = 60

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.SUPPLIER_SCOUT_WEBHOOK_SECRET
  if (!secret) return true // Local dev: allow all
  const incoming = req.headers.get('x-telegram-bot-api-secret-token')
  return incoming === secret
}

async function loadGroupConfig(
  telegramGroupId: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
): Promise<SupplierGroupConfig | null> {
  try {
    const result = await payload.find({
      collection: 'supplier-groups',
      where: { telegramGroupId: { equals: telegramGroupId } },
      limit: 1,
    })
    if (result.docs.length === 0) return null
    const d = result.docs[0] as Record<string, any>
    return {
      id: d.id,
      telegramGroupId: d.telegramGroupId,
      groupName: d.groupName,
      groupUsername: d.groupUsername,
      marginUSD: d.marginUSD ?? 15,
      currency: d.currency ?? 'USD',
      isActive: d.isActive ?? true,
      isBlocked: d.isBlocked ?? false,
      autoCreateEnabled: d.autoCreateEnabled ?? true,
      defaultCategory: d.defaultCategory,
      trustScore: d.trustScore ?? 70,
      notes: d.notes,
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Telegram Webhook
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Always respond 200 immediately to Telegram — processing happens after
  if (!verifySecret(req)) {
    console.warn('[SupplierScout] Invalid webhook secret')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: TgUpdate
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  // Fire-and-forget processing to stay within Vercel response window
  processUpdate(body).catch(err => {
    console.error('[SupplierScout] processUpdate error:', err)
  })

  return NextResponse.json({ ok: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Update Processor
// ─────────────────────────────────────────────────────────────────────────────

async function processUpdate(update: TgUpdate): Promise<void> {
  const payload = await getPayload()

  // ── DM command from Frank ───────────────────────────────────────────────
  const msg = update.message
  if (!msg) return

  const chatType = msg.chat.type
  const isPrivate = chatType === 'private'

  // Update webhook health timestamp
  try {
    await payload.updateGlobal({
      slug: 'supplier-scout-settings',
      data: {
        lastWebhookReceivedAt: new Date().toISOString(),
        totalMessagesAllTime: undefined, // let DB increment
      } as any,
    })
  } catch { /* non-critical */ }

  if (isPrivate) {
    await handlePrivateMessage(msg, payload)
    return
  }

  // ── Group message ───────────────────────────────────────────────────────
  if (chatType === 'group' || chatType === 'supergroup') {
    await handleGroupMessage(msg, payload)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private Message Handler (Frank's DMs)
// ─────────────────────────────────────────────────────────────────────────────

async function handlePrivateMessage(msg: TgMessage, payload: any): Promise<void> {
  const text = (msg.text ?? '').trim()
  const chatId = msg.chat.id

  // Check if it's a command
  if (!text.startsWith('/')) return

  const parts = text.split(/\s+/)
  const command = parts[0].toLowerCase().split('@')[0] // strip @botname suffix

  // Check if Frank (any DM user can /start, but other commands are Frank-only)
  const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any
  const frankChatId = settings?.frankChatId

  if (command !== '/start' && frankChatId && chatId !== frankChatId) {
    await scoutSendMessage(chatId, '⛔ Bu bot özel kullanım içindir.')
    return
  }

  const response = await handleDMCommand({
    chatId,
    userId: msg.from?.id ?? 0,
    command,
    args: parts.slice(1),
    rawText: text,
  }, payload)

  await scoutSendMessage(chatId, response)
}

// ─────────────────────────────────────────────────────────────────────────────
// Group Message Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleGroupMessage(msg: TgMessage, payload: any): Promise<void> {
  const groupTelegramId = msg.chat.id

  // Skip bot messages
  if (msg.from?.is_bot) return

  // Load group config
  const groupConfig = await loadGroupConfig(groupTelegramId, payload)
  if (!groupConfig) {
    // Unknown group — silently ignore (not configured in SupplierGroups)
    return
  }
  if (!groupConfig.isActive) return

  // Update group last message timestamp
  try {
    await payload.update({
      collection: 'supplier-groups',
      id: groupConfig.id as number,
      data: { lastMessageAt: new Date().toISOString() } as any,
    })
  } catch { /* non-critical */ }

  // Load memory context
  const [customTerms, recentCorrections] = await Promise.all([
    loadLanguageMemory(payload),
    loadRecentCorrections(payload, 10),
  ])

  // Load settings
  const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any
  const autoPauseActive = settings?.autoPauseActive ?? false
  const autoCreateMinScore = settings?.autoCreateMinScore ?? 75
  const soldOutAutoApplyMinScore = settings?.soldOutAutoApplyMinScore ?? 80
  const defaultStockQuantity = settings?.defaultStockQuantity ?? 10
  const usdToTryRate = settings?.usdToTryRate ?? 32
  const frankChatId = settings?.frankChatId

  // ── 1. Classify message ─────────────────────────────────────────────────
  const classification = await classifySupplierMessage(
    msg,
    groupConfig,
    recentCorrections,
    customTerms,
  )

  // Log classification
  await logAction({
    actionType: 'message_classified',
    confidence: classification.confidence,
    supplierGroupId: String(groupConfig.id),
    supplierGroupName: groupConfig.groupName,
    sellerUserId: msg.from?.id,
    sellerUsername: msg.from?.username,
    telegramMessageId: msg.message_id,
    details: `${classification.messageClass} (${classification.confidenceScore}) — ${classification.reasoning?.substring(0, 100)}`,
    isReversible: false,
  }, payload)

  // Increment seller post count
  if (msg.from?.id) {
    await incrementSellerStats(msg.from.id, 'totalPostsSeen', payload)
  }

  // ── 2. Not actionable → skip ────────────────────────────────────────────
  if (!classification.isActionable) return

  // ── 3. Product offer ────────────────────────────────────────────────────
  if (['new_product', 'product_update'].includes(classification.messageClass)) {
    await handleProductOffer(msg, groupConfig, payload, {
      autoPauseActive,
      autoCreateMinScore,
      defaultStockQuantity,
      usdToTryRate,
      frankChatId,
      customTerms: customTerms.map(t => ({ term: t.term, meaning: t.meaning })),
      marginUSD: groupConfig.marginUSD,
    })
    return
  }

  // ── 4. Sold-out signal ──────────────────────────────────────────────────
  if (['sold_out', 'partial_sold_out'].includes(classification.messageClass)) {
    await handleSoldOutSignal(msg, groupConfig, payload, {
      soldOutAutoApplyMinScore,
      frankChatId,
    })
    return
  }

  // ── 5. Still available → no action needed (logged above) ───────────────
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Offer Processing
// ─────────────────────────────────────────────────────────────────────────────

async function handleProductOffer(
  msg: TgMessage,
  groupConfig: SupplierGroupConfig,
  payload: any,
  opts: {
    autoPauseActive: boolean
    autoCreateMinScore: number
    defaultStockQuantity: number
    usdToTryRate: number
    frankChatId?: number
    customTerms: Array<{ term: string; meaning: string }>
    marginUSD: number
  },
): Promise<void> {
  // Parse offer
  const offer = await parseProductOffer(
    msg,
    groupConfig,
    opts.customTerms,
    opts.marginUSD,
    opts.usdToTryRate,
  )

  // Create WholesaleOpportunity record regardless of outcome
  let opportunityId: string | number = 0
  try {
    const opp = await payload.create({
      collection: 'wholesale-opportunities',
      data: {
        messageClass: 'new_product',
        status: 'pending',
        confidence: offer.parseConfidence,
        confidenceScore: offer.parseScore,
        productName: offer.productName,
        brand: offer.brand,
        model: offer.model,
        color: offer.color,
        category: offer.category,
        sizeMin: offer.sizeMin,
        sizeMax: offer.sizeMax,
        availableSizes: offer.availableSizes,
        wholesalePrice: offer.wholesalePrice,
        wholesaleCurrency: offer.wholesaleCurrency,
        marginApplied: opts.marginUSD,
        websitePrice: offer.computedWebsitePrice,
        supplierGroup: groupConfig.id,
        sellerTelegramId: offer.sellerUserId,
        sellerUsername: offer.sellerUsername,
        sellerDisplayName: offer.sellerName,
        telegramMessageId: offer.telegramMessageId,
        telegramMediaGroupId: offer.telegramMediaGroupId,
        hasPhoto: offer.hasPhoto,
        rawText: offer.rawText,
        missingFields: offer.missingFields,
        classificationReasoning: offer.parseWarnings?.join('; '),
        processedAt: new Date().toISOString(),
      } as any,
    })
    opportunityId = (opp as any).id
  } catch (err) {
    console.error('[SupplierScout] Failed to create WholesaleOpportunity:', err)
  }

  // ── Auto-create gate ──────────────────────────────────────────────────
  const gateResult = await checkAutoCreateGate(
    offer,
    groupConfig,
    { autoPauseActive: opts.autoPauseActive, autoCreateMinScore: opts.autoCreateMinScore },
    payload,
  )

  if (!gateResult.allowed) {
    // Determine skip status
    let skipStatus = 'skipped_low_confidence'
    if (gateResult.isDuplicate) skipStatus = 'skipped_duplicate'
    else if (gateResult.supplierBlocked) skipStatus = 'skipped_blocked'
    else if (gateResult.autoPaused) skipStatus = 'skipped_low_confidence' // still skipped

    const skipReason = gateResult.blockers.join('; ')

    // Update opportunity record
    if (opportunityId) {
      try {
        await payload.update({
          collection: 'wholesale-opportunities',
          id: opportunityId as number,
          data: {
            status: offer.parseScore >= opts.autoCreateMinScore - 15
              ? 'needs_review'
              : skipStatus,
            skipReason,
          } as any,
        })
      } catch { /* non-critical */ }
    }

    await logAction({
      actionType: 'product_skipped',
      confidence: offer.parseConfidence,
      supplierGroupId: String(groupConfig.id),
      supplierGroupName: groupConfig.groupName,
      sellerUserId: offer.sellerUserId,
      sellerUsername: offer.sellerUsername,
      telegramMessageId: offer.telegramMessageId,
      wholesalePrice: offer.wholesalePrice,
      websitePrice: offer.computedWebsitePrice,
      details: skipReason,
      isReversible: false,
      opportunityRef: opportunityId || undefined,
    }, payload)

    // DM Frank if needs_review
    if (
      !gateResult.isDuplicate &&
      !gateResult.supplierBlocked &&
      !gateResult.autoPaused &&
      opts.frankChatId &&
      offer.parseScore >= opts.autoCreateMinScore - 20
    ) {
      const reviewMsg = `📋 <b>İnceleme Gerekiyor</b>\n\n` +
        `Ürün: ${offer.productName ?? '?'}\n` +
        `Grup: ${groupConfig.groupName}\n` +
        `Fiyat: ${offer.wholesalePrice ? `$${offer.wholesalePrice}` : '?'}\n` +
        `Eksik: ${offer.missingFields.join(', ')}\n` +
        `Güven: ${offer.parseScore}/100`
      await scoutSendMessage(opts.frankChatId, reviewMsg)
    }

    return
  }

  // ── Auto-create product ──────────────────────────────────────────────
  const createResult = await autoCreateProduct(
    offer,
    groupConfig,
    opportunityId,
    { defaultStockQuantity: opts.defaultStockQuantity, usdToTryRate: opts.usdToTryRate },
    payload,
  )

  if (createResult.success) {
    // Update opportunity with created product
    if (opportunityId) {
      try {
        await payload.update({
          collection: 'wholesale-opportunities',
          id: opportunityId as number,
          data: {
            status: 'product_created',
            createdProduct: createResult.productId,
          } as any,
        })
      } catch { /* non-critical */ }
    }

    await logAction({
      actionType: 'product_created',
      confidence: offer.parseConfidence,
      productId: createResult.productId ? String(createResult.productId) : undefined,
      productTitle: createResult.productTitle,
      supplierGroupId: String(groupConfig.id),
      supplierGroupName: groupConfig.groupName,
      sellerUserId: offer.sellerUserId,
      sellerUsername: offer.sellerUsername,
      telegramMessageId: offer.telegramMessageId,
      wholesalePrice: offer.wholesalePrice,
      websitePrice: createResult.websitePrice,
      details: `Ürün oluşturuldu: ${createResult.productTitle} ($${offer.wholesalePrice} → ₺${createResult.websitePrice})`,
      isReversible: true,
    }, payload)

    // Increment group product count
    try {
      const grp = await payload.findByID({ collection: 'supplier-groups', id: groupConfig.id as number, depth: 0 }) as any
      await payload.update({
        collection: 'supplier-groups',
        id: groupConfig.id as number,
        data: { totalProductsCreated: ((grp.totalProductsCreated as number) ?? 0) + 1 } as any,
      })
    } catch { /* non-critical */ }

    if (offer.sellerUserId) await incrementSellerStats(offer.sellerUserId, 'productsCreated', payload)
  } else {
    // Create failed
    if (opportunityId) {
      try {
        await payload.update({
          collection: 'wholesale-opportunities',
          id: opportunityId as number,
          data: { status: 'error', skipReason: createResult.error } as any,
        })
      } catch { /* non-critical */ }
    }

    await logAction({
      actionType: 'error',
      confidence: 'none',
      supplierGroupId: String(groupConfig.id),
      supplierGroupName: groupConfig.groupName,
      details: `Ürün oluşturma hatası: ${createResult.error}`,
      isReversible: false,
    }, payload)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sold-Out Signal Processing
// ─────────────────────────────────────────────────────────────────────────────

async function handleSoldOutSignal(
  msg: TgMessage,
  groupConfig: SupplierGroupConfig,
  payload: any,
  opts: { soldOutAutoApplyMinScore: number; frankChatId?: number },
): Promise<void> {
  const signal = parseSoldOutSignal(msg)
  const matchResult = await matchSoldOutToProduct(signal, payload, opts.soldOutAutoApplyMinScore)

  if (!matchResult.matched) {
    await logAction({
      actionType: 'soldout_skipped',
      confidence: 'none',
      supplierGroupId: String(groupConfig.id),
      supplierGroupName: groupConfig.groupName,
      sellerUserId: msg.from?.id,
      sellerUsername: msg.from?.username,
      telegramMessageId: msg.message_id,
      details: `Tükendi sinyali eşleştirilemedi: ${matchResult.matchReasons.join(', ')}`,
      isReversible: false,
    }, payload)
    return
  }

  if (matchResult.action === 'auto_soldout') {
    // Apply sold-out
    const applied = await applySoldOut(matchResult.productId!, `SupplierScout: ${signal.detectedTerms.join(', ')}`, payload)
    if (applied) {
      await logAction({
        actionType: 'soldout_applied',
        confidence: matchResult.confidence,
        productId: String(matchResult.productId),
        productTitle: matchResult.productTitle,
        supplierGroupId: String(groupConfig.id),
        supplierGroupName: groupConfig.groupName,
        sellerUserId: msg.from?.id,
        sellerUsername: msg.from?.username,
        telegramMessageId: msg.message_id,
        details: `Tükendi uygulandı — ${matchResult.matchReasons.join('; ')} (skor: ${matchResult.matchScore})`,
        isReversible: true,
      }, payload)
    }
  } else if (matchResult.action === 'dm_warning' && opts.frankChatId) {
    // Warn Frank
    const warnMsg = `⚠️ <b>Tükendi Uyarısı — Onay Gerekiyor</b>\n\n` +
      `Ürün: <b>${matchResult.productTitle ?? '?'}</b>\n` +
      `Eşleşme skoru: ${matchResult.matchScore}/100 (orta güven)\n` +
      `Neden: ${matchResult.matchReasons.join(', ')}\n` +
      `Grup: ${groupConfig.groupName}\n\n` +
      `Mesaj: "${signal.rawText.substring(0, 100)}"\n\n` +
      `Ürün ID: ${matchResult.productId}\n` +
      `Otomatik uygulanmadı — istersen admin panelinden manuel değiştir.`
    await scoutSendMessage(opts.frankChatId, warnMsg)

    await logAction({
      actionType: 'soldout_warned',
      confidence: matchResult.confidence,
      productId: matchResult.productId ? String(matchResult.productId) : undefined,
      productTitle: matchResult.productTitle,
      supplierGroupId: String(groupConfig.id),
      supplierGroupName: groupConfig.groupName,
      details: `Tükendi uyarısı gönderildi — skor: ${matchResult.matchScore}, nedenler: ${matchResult.matchReasons.join(', ')}`,
      isReversible: false,
    }, payload)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Cron + Admin Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const action = req.nextUrl.searchParams.get('action')
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  // Protect cron endpoints
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also accept SUPPLIER_SCOUT_ADMIN_SECRET for manual triggers
    const adminSecret = process.env.SUPPLIER_SCOUT_ADMIN_SECRET
    const providedSecret = req.headers.get('x-admin-secret') ?? req.nextUrl.searchParams.get('secret')
    if (!adminSecret || providedSecret !== adminSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (action === 'daily_report') {
    return handleDailyReportCron()
  }

  if (action === 'register_webhook') {
    // Use www prefix to avoid redirect — bare domain 307-redirects to www
    const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').replace('https://uygunayakkabi.com', 'https://www.uygunayakkabi.com')
    const webhookUrl = `${baseUrl}/api/supplier-scout`
    const payload = await getPayload()
    void payload // satisfy linter
    const ok = await registerScoutWebhook(webhookUrl)
    return NextResponse.json({ ok, webhookUrl })
  }

  if (action === 'health') {
    const payload = await getPayload()
    const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any
    const lastWebhook = settings?.lastWebhookReceivedAt
    const webhookAge = lastWebhook ? Date.now() - new Date(lastWebhook).getTime() : null
    return NextResponse.json({
      ok: true,
      frankChatIdSet: Boolean(settings?.frankChatId),
      autoPauseActive: settings?.autoPauseActive ?? false,
      webhookAgeMs: webhookAge,
      webhookHealthy: webhookAge !== null ? webhookAge < 24 * 60 * 60 * 1000 : false,
      totalMessagesAllTime: settings?.totalMessagesAllTime ?? 0,
      totalProductsCreatedAllTime: settings?.totalProductsCreatedAllTime ?? 0,
    })
  }

  return NextResponse.json({ ok: true, message: 'SupplierScout API running' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Report Cron Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleDailyReportCron(): Promise<NextResponse> {
  try {
    const payload = await getPayload()
    const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any
    const frankChatId = settings?.frankChatId as number | undefined

    // Get Istanbul date
    const today = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).split(' ')[0]

    const report = await buildDailyReport(today, payload)
    const reportText = formatDailyReport(report)

    let messageId: number | undefined
    if (frankChatId) {
      const msgId = await scoutSendMessage(frankChatId, reportText)
      messageId = msgId ?? undefined
    } else {
      console.warn('[SupplierScout] daily_report: frankChatId not set — cannot deliver report')
    }

    await saveDailyReport(report, reportText, messageId, payload)

    return NextResponse.json({
      ok: true,
      date: today,
      productsAdded: report.stats.productsAdded,
      soldOutUpdates: report.stats.soldOutUpdates,
      delivered: Boolean(messageId),
    })
  } catch (err) {
    console.error('[SupplierScout] daily_report cron error:', err)
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
