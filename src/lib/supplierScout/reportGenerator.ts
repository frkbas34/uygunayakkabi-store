/**
 * supplierScout/reportGenerator.ts
 *
 * Generates the daily private Telegram DM report for Frank.
 *
 * Report sections:
 *   📊 İstatistikler — messages/images processed, products added, sold-out updates
 *   ✅ Eklenen Ürünler — product title, supplier, wholesale/site price, stock
 *   ❌ Tükendi Güncellemeleri — which products went sold-out
 *   ⏭️ Atlananlar — duplicates, low confidence, blocked
 *   📋 İnceleme Gerekiyor — needs_review items
 *   🚨 Hatalar — errors
 *   💰 Marj Potansiyeli — estimated profit
 *   🧠 Öğrenme — new terms, seller patterns, corrections
 *   🔧 Sistem Sağlığı — webhook health, auto-pause state
 *
 * Delivered at 23:30 Europe/Istanbul (configurable in SupplierScoutSettings).
 * Triggered by GET /api/supplier-scout?action=daily_report (via Vercel Cron).
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type { FullDailyReport, DailyReportStats } from './types'
import type { Payload } from 'payload'

// ─────────────────────────────────────────────────────────────────────────────
// Data Aggregation
// ─────────────────────────────────────────────────────────────────────────────

/** Get Istanbul date string for a given UTC timestamp. */
function toIstanbulDate(ts: number = Date.now()): string {
  return new Date(ts).toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** Build a FullDailyReport from database records for a given date. */
export async function buildDailyReport(date: string, payload: Payload): Promise<FullDailyReport> {
  const today = date // YYYY-MM-DD format (Istanbul)

  // Date window: midnight-to-midnight Istanbul
  const startUtc = new Date(`${today}T00:00:00+03:00`).toISOString()
  const endUtc = new Date(`${today}T23:59:59+03:00`).toISOString()

  // Load today's action log entries
  const actionsResult = await payload.find({
    collection: 'supplier-actions-log',
    where: {
      and: [
        { createdAt: { greater_than_equal: startUtc } },
        { createdAt: { less_than_equal: endUtc } },
      ],
    },
    limit: 500,
    sort: 'createdAt',
  })

  const actions = actionsResult.docs as Array<Record<string, any>>

  // Load today's opportunities
  const oppsResult = await payload.find({
    collection: 'wholesale-opportunities',
    where: {
      and: [
        { processedAt: { greater_than_equal: startUtc } },
        { processedAt: { less_than_equal: endUtc } },
      ],
    },
    limit: 500,
    sort: 'processedAt',
  })

  const opps = oppsResult.docs as Array<Record<string, any>>

  // Load settings for health check
  const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any

  // Active groups
  const groupsResult = await payload.find({
    collection: 'supplier-groups',
    where: { isActive: { equals: true } },
    limit: 100,
  })

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const messagesProcessed = actions.filter(a => a.actionType === 'message_classified').length
  const imagesProcessed = opps.filter(o => o.hasPhoto).length
  const productsDetected = opps.filter(o =>
    ['new_product', 'product_update'].includes(o.messageClass)
  ).length
  const productsAdded = actions.filter(a => a.actionType === 'product_created').length
  const soldOutUpdates = actions.filter(a => a.actionType === 'soldout_applied').length
  const skippedDuplicates = opps.filter(o => o.status === 'skipped_duplicate').length
  const skippedLowConf = opps.filter(o => o.status === 'skipped_low_confidence').length
  const errors = actions.filter(a => a.actionType === 'error').length

  const marginPotential = actions
    .filter(a => a.actionType === 'product_created' && a.wholesalePrice && a.websitePrice)
    .reduce((sum, a) => {
      const margin = (a.websitePrice ?? 0) / ((settings?.usdToTryRate ?? 32)) - (a.wholesalePrice ?? 0)
      return sum + Math.max(0, margin)
    }, 0)

  const stats: DailyReportStats = {
    date: today,
    groupsMonitored: groupsResult.docs.length,
    messagesProcessed,
    imagesProcessed,
    productsDetected,
    productsAdded,
    soldOutUpdates,
    skippedDuplicates,
    skippedLowConfidence: skippedLowConf,
    errors,
    estimatedMarginPotential: Math.round(marginPotential),
  }

  // ── Products added ───────────────────────────────────────────────────────
  const productsAddedList = actions
    .filter(a => a.actionType === 'product_created')
    .map(a => ({
      title: a.productTitle ?? '?',
      supplier: a.sellerUsername ?? `ID:${a.sellerUserId}` ?? '?',
      supplierGroup: a.supplierGroupName ?? '?',
      wholesalePrice: a.wholesalePrice ?? 0,
      wholesaleCurrency: 'USD',
      websitePrice: a.websitePrice ?? 0,
      defaultStock: 10,
      telegramMessageId: a.telegramMessageId,
      createdProductId: a.productId,
      timestamp: a.createdAt,
    }))

  // ── Sold-out updates ────────────────────────────────────────────────────
  const soldOutList = actions
    .filter(a => a.actionType === 'soldout_applied')
    .map(a => ({
      productTitle: a.productTitle ?? '?',
      productId: a.productId,
      confidence: a.confidence ?? 'medium',
      supplier: a.sellerUsername ?? '?',
      supplierGroup: a.supplierGroupName ?? '?',
      timestamp: a.createdAt,
    }))

  // ── Skipped ──────────────────────────────────────────────────────────────
  const skippedList = opps
    .filter(o => o.status?.startsWith('skipped_'))
    .map(o => ({
      reason: o.skipReason ?? o.status ?? 'Bilinmiyor',
      productName: o.productName,
      supplierGroup: (o.supplierGroup as any)?.groupName ?? '?',
      missingFields: o.missingFields ?? [],
      timestamp: o.processedAt ?? o.createdAt,
    }))

  // ── Needs review ─────────────────────────────────────────────────────────
  const needsReviewList = opps
    .filter(o => o.status === 'needs_review')
    .map(o => ({
      reason: o.skipReason ?? 'Düşük güven',
      productName: o.productName,
      supplierGroup: (o.supplierGroup as any)?.groupName ?? '?',
      missingFields: o.missingFields ?? [],
      timestamp: o.processedAt ?? o.createdAt,
    }))

  // ── Errors ───────────────────────────────────────────────────────────────
  const errorList = actions
    .filter(a => a.actionType === 'error')
    .map(a => ({
      context: a.details?.toString().substring(0, 80) ?? '?',
      error: a.details ?? '?',
      timestamp: a.createdAt,
    }))

  // ── Learning (today's new terms) ─────────────────────────────────────────
  const newTerms = actions
    .filter(a => a.actionType === 'term_learned')
    .map(a => a.details as string)

  const lastReportLearning = await payload.find({
    collection: 'supplier-daily-reports',
    where: { reportDate: { not_equals: today } },
    sort: '-reportDate',
    limit: 1,
  })

  const learning = {
    newTermsLearned: newTerms,
    sellerBehaviorPatterns: [],
    groupLogicObservations: [],
    riskyInterpretations: actions
      .filter(a => a.confidence === 'low' && a.actionType !== 'product_skipped')
      .map(a => a.details?.toString().substring(0, 100) ?? ''),
    correctionsNeeded: needsReviewList.map(n => n.reason),
    confidenceChanges: [],
  }

  // ── Webhook health ───────────────────────────────────────────────────────
  const lastWebhook = settings?.lastWebhookReceivedAt
  const webhookHealth = lastWebhook
    ? (Date.now() - new Date(lastWebhook).getTime()) < 24 * 60 * 60 * 1000
    : false

  return {
    stats,
    productsAdded: productsAddedList,
    soldOutUpdates: soldOutList,
    skipped: skippedList,
    errors: errorList,
    needsReview: needsReviewList,
    learning,
    webhookHealth,
    autoPauseActive: settings?.autoPauseActive ?? false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Report as Telegram HTML
// ─────────────────────────────────────────────────────────────────────────────

export function formatDailyReport(report: FullDailyReport): string {
  const { stats, productsAdded, soldOutUpdates, skipped, errors, needsReview, learning, webhookHealth } = report
  const lines: string[] = []

  lines.push(`🤖 <b>SupplierScout Günlük Rapor</b>`)
  lines.push(`📅 ${stats.date} (Europe/Istanbul)\n`)

  // ── Stats ──────────────────────────────────────────────────────────────
  lines.push(`📊 <b>İstatistikler</b>`)
  lines.push(`├ Grup: ${stats.groupsMonitored}`)
  lines.push(`├ Mesaj İşlendi: ${stats.messagesProcessed}`)
  lines.push(`├ Görsel İşlendi: ${stats.imagesProcessed}`)
  lines.push(`├ Ürün Tespit: ${stats.productsDetected}`)
  lines.push(`├ Ürün Eklendi: ${stats.productsAdded}`)
  lines.push(`├ Tükendi Güncelleme: ${stats.soldOutUpdates}`)
  lines.push(`├ Atlanan (Duplicate): ${stats.skippedDuplicates}`)
  lines.push(`├ Atlanan (Düşük Güven): ${stats.skippedLowConfidence}`)
  lines.push(`└ Hata: ${stats.errors}\n`)

  // ── Products Added ─────────────────────────────────────────────────────
  if (productsAdded.length > 0) {
    lines.push(`✅ <b>Eklenen Ürünler (${productsAdded.length})</b>`)
    for (const p of productsAdded.slice(0, 10)) {
      lines.push(`  • <b>${p.title}</b>`)
      lines.push(`    Tedarikçi: ${p.supplier} | Grup: ${p.supplierGroup}`)
      lines.push(`    Toptan: $${p.wholesalePrice} → Site: ₺${p.websitePrice} | Stok: ${p.defaultStock}`)
    }
    if (productsAdded.length > 10) lines.push(`  ... ve ${productsAdded.length - 10} ürün daha`)
    lines.push('')
  }

  // ── Sold-Out Updates ───────────────────────────────────────────────────
  if (soldOutUpdates.length > 0) {
    lines.push(`❌ <b>Tükendi Güncellemeleri (${soldOutUpdates.length})</b>`)
    for (const s of soldOutUpdates.slice(0, 10)) {
      lines.push(`  • ${s.productTitle} (güven: ${s.confidence})`)
    }
    lines.push('')
  }

  // ── Needs Review ───────────────────────────────────────────────────────
  if (needsReview.length > 0) {
    lines.push(`📋 <b>İnceleme Gerekiyor (${needsReview.length})</b>`)
    for (const n of needsReview.slice(0, 5)) {
      lines.push(`  • ${n.productName ?? '?'}: ${n.reason}`)
      if (n.missingFields?.length) lines.push(`    Eksik: ${(n.missingFields as string[]).join(', ')}`)
    }
    lines.push('')
  }

  // ── Skipped ────────────────────────────────────────────────────────────
  if (skipped.length > 0) {
    lines.push(`⏭️ <b>Atlananlar (${skipped.length})</b>`)
    const byReason: Record<string, number> = {}
    for (const s of skipped) {
      byReason[s.reason] = (byReason[s.reason] ?? 0) + 1
    }
    for (const [reason, count] of Object.entries(byReason)) {
      lines.push(`  • ${reason}: ${count}x`)
    }
    lines.push('')
  }

  // ── Margin Potential ───────────────────────────────────────────────────
  if (stats.estimatedMarginPotential > 0) {
    lines.push(`💰 <b>Tahmini Marj Potansiyeli: ~$${stats.estimatedMarginPotential}</b>\n`)
  }

  // ── Learning Section ───────────────────────────────────────────────────
  const hasLearning =
    learning.newTermsLearned.length > 0 ||
    learning.riskyInterpretations.length > 0 ||
    learning.correctionsNeeded.length > 0

  if (hasLearning) {
    lines.push(`🧠 <b>Öğrenme</b>`)
    if (learning.newTermsLearned.length > 0) {
      lines.push(`  Yeni terimler: ${learning.newTermsLearned.slice(0, 5).join(', ')}`)
    }
    if (learning.riskyInterpretations.length > 0) {
      lines.push(`  ⚠️ Riskli yorum: ${learning.riskyInterpretations.length} adet`)
    }
    if (learning.correctionsNeeded.length > 0) {
      lines.push(`  📝 Düzeltme önerisi: ${learning.correctionsNeeded.length} adet`)
    }
    lines.push('')
  }

  // ── Errors ─────────────────────────────────────────────────────────────
  if (errors.length > 0) {
    lines.push(`🚨 <b>Hatalar (${errors.length})</b>`)
    for (const e of errors.slice(0, 3)) {
      lines.push(`  • ${e.context.substring(0, 80)}`)
    }
    lines.push('')
  }

  // ── System Health ──────────────────────────────────────────────────────
  const webhookStatus = webhookHealth ? '✅ Aktif' : '⚠️ 24s+ sinyal yok'
  const pauseStatus = report.autoPauseActive ? '⏸️ DURAKLATILDI' : '▶️ Aktif'
  lines.push(`🔧 <b>Sistem</b>`)
  lines.push(`├ Webhook: ${webhookStatus}`)
  lines.push(`└ Oto-Oluşturma: ${pauseStatus}`)

  // Total join
  const text = lines.join('\n')
  // Telegram limit: 4096 chars
  return text.length > 4000 ? text.substring(0, 4000) + '\n\n⚠️ Rapor kesildi.' : text
}

// ─────────────────────────────────────────────────────────────────────────────
// Save Report to DB
// ─────────────────────────────────────────────────────────────────────────────

export async function saveDailyReport(
  report: FullDailyReport,
  telegramText: string,
  telegramMessageId: number | undefined,
  payload: Payload,
): Promise<void> {
  try {
    const { stats } = report

    // Check if already exists for today
    const existing = await payload.find({
      collection: 'supplier-daily-reports',
      where: { reportDate: { equals: stats.date } },
      limit: 1,
    })

    const data: Record<string, unknown> = {
      reportDate: stats.date,
      groupsMonitored: stats.groupsMonitored,
      messagesProcessed: stats.messagesProcessed,
      imagesProcessed: stats.imagesProcessed,
      productsDetected: stats.productsDetected,
      productsAdded: stats.productsAdded,
      soldOutUpdates: stats.soldOutUpdates,
      skippedDuplicates: stats.skippedDuplicates,
      skippedLowConfidence: stats.skippedLowConfidence,
      errors: stats.errors,
      estimatedMarginPotential: stats.estimatedMarginPotential,
      reportData: report,
      telegramReportText: telegramText,
      sentAt: new Date().toISOString(),
      telegramMessageId,
      deliveryStatus: telegramMessageId ? 'sent' : 'failed',
    }

    if (existing.docs.length > 0) {
      await payload.update({ collection: 'supplier-daily-reports', id: (existing.docs[0] as any).id, data: data as any })
    } else {
      await payload.create({ collection: 'supplier-daily-reports', data: data as any })
    }

    // Update global lastReportSentAt
    await payload.updateGlobal({
      slug: 'supplier-scout-settings',
      data: { lastReportSentAt: new Date().toISOString() } as any,
    })
  } catch (err) {
    console.error('[SupplierScout/reportGenerator] saveDailyReport error:', err)
  }
}
