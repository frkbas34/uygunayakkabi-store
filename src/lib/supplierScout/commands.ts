/**
 * supplierScout/commands.ts
 *
 * Private DM command handlers for SupplierScout.
 * Only works when Frank sends commands in a DM with the SupplierScout bot.
 *
 * Available commands:
 *   /start           — Register Frank's chat_id, enable DM reports
 *   /today           — Today's live stats snapshot
 *   /pending         — Products pending review
 *   /suppliers       — List monitored supplier groups with stats
 *   /soldout_today   — Sold-out events today
 *   /profit_today    — Today's margin potential
 *   /pause_auto      — Pause autonomous product creation
 *   /resume_auto     — Resume autonomous product creation
 *   /teach <term> = <meaning>  — Teach a new Turkish slang term
 *   /memory [term]   — Show language memory entries
 *   /seller <id> <note> — Add note to a seller's memory
 *   /group_logic <group_id> <note> — Add group observation
 *   /corrections     — List recent corrections
 *   /learning_today  — Today's learning summary
 *
 * STATUS: IMPLEMENTED (D-278)
 */

import type { Payload } from 'payload'
import type { CommandContext } from './types'
import {
  teachTerm,
  loadLanguageMemory,
  loadRecentCorrections,
  teachSellerNote,
  logAction,
} from './memory'
import { previewManualDraft, executeManualDraft } from './productCreator'
import { sendOpsCard } from './telegram'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toIstanbulDate(): string {
  return new Date().toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function toIstanbulDateISO(): string {
  // Returns YYYY-MM-DD for use in DB queries
  const d = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' })
  return d.split(' ')[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Router
// ─────────────────────────────────────────────────────────────────────────────

export async function handleDMCommand(
  ctx: CommandContext,
  payload: Payload,
): Promise<string> {
  const cmd = ctx.command.toLowerCase()
  const args = ctx.args

  switch (cmd) {
    case '/start':
      return handleStart(ctx, payload)
    case '/today':
      return handleToday(payload)
    case '/pending':
      return handlePending(payload)
    case '/suppliers':
      return handleSuppliers(payload)
    case '/soldout_today':
      return handleSoldOutToday(payload)
    case '/profit_today':
      return handleProfitToday(payload)
    case '/pause_auto':
      return handlePauseAuto(ctx.rawText, payload)
    case '/resume_auto':
      return handleResumeAuto(payload)
    case '/teach':
      return handleTeach(args, ctx.rawText, payload)
    case '/memory':
      return handleMemory(args, payload)
    case '/seller':
      return handleSeller(args, payload)
    case '/group_logic':
      return handleGroupLogic(args, payload)
    case '/corrections':
      return handleCorrections(payload)
    case '/learning_today':
      return handleLearningToday(payload)
    case '/create_draft':
      return handleCreateDraft(args, payload)
    case '/forward_wo':
      return handleForwardWo(args, payload)
    default:
      return `❓ Bilinmeyen komut: ${cmd}\n\nKullanılabilir komutlar:\n/today /pending /suppliers /soldout_today /profit_today\n/pause_auto /resume_auto\n/create_draft /forward_wo\n/teach /memory /seller /group_logic /corrections /learning_today`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /start
// ─────────────────────────────────────────────────────────────────────────────

async function handleStart(ctx: CommandContext, payload: Payload): Promise<string> {
  try {
    await payload.updateGlobal({
      slug: 'supplier-scout-settings',
      data: {
        frankChatId: ctx.chatId,
        frankChatIdRegisteredAt: new Date().toISOString(),
      } as any,
    })
    return `✅ <b>SupplierScout aktif!</b>\n\nChat ID'n kaydedildi: <code>${ctx.chatId}</code>\n\nArtık günlük raporlar sana özel DM olarak gelecek (23:30 Istanbul).\n\nHızlı başlangıç:\n• /suppliers — izlenen grupları gör\n• /today — bugünün özetini gör\n• /teach RC = Rain Cloud for New Balance — terim öğret`
  } catch (err) {
    return `❌ Kayıt hatası: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /today
// ─────────────────────────────────────────────────────────────────────────────

async function handleToday(payload: Payload): Promise<string> {
  const today = toIstanbulDateISO()
  const startUtc = new Date(`${today}T00:00:00+03:00`).toISOString()
  const endUtc = new Date(`${today}T23:59:59+03:00`).toISOString()

  try {
    const [actionsResult, oppsResult] = await Promise.all([
      payload.find({
        collection: 'supplier-actions-log',
        where: { and: [{ createdAt: { greater_than_equal: startUtc } }, { createdAt: { less_than_equal: endUtc } }] },
        limit: 500,
      }),
      payload.find({
        collection: 'wholesale-opportunities',
        where: { and: [{ processedAt: { greater_than_equal: startUtc } }, { processedAt: { less_than_equal: endUtc } }] },
        limit: 500,
      }),
    ])

    const actions = actionsResult.docs as Array<Record<string, any>>
    const opps = oppsResult.docs as Array<Record<string, any>>

    const created = actions.filter(a => a.actionType === 'product_created').length
    const soldout = actions.filter(a => a.actionType === 'soldout_applied').length
    const errors = actions.filter(a => a.actionType === 'error').length
    const classified = actions.filter(a => a.actionType === 'message_classified').length
    const needsReview = opps.filter(o => o.status === 'needs_review').length
    const skipped = opps.filter(o => o.status?.startsWith('skipped_')).length

    return `📊 <b>Bugün (${toIstanbulDate()})</b>\n\n` +
      `✅ Ürün eklendi: <b>${created}</b>\n` +
      `❌ Tükendi güncelleme: <b>${soldout}</b>\n` +
      `🔍 Mesaj işlendi: <b>${classified}</b>\n` +
      `📋 İnceleme gerekiyor: <b>${needsReview}</b>\n` +
      `⏭️ Atlanan: <b>${skipped}</b>\n` +
      `🚨 Hata: <b>${errors}</b>`
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /pending
// ─────────────────────────────────────────────────────────────────────────────

async function handlePending(payload: Payload): Promise<string> {
  try {
    const result = await payload.find({
      collection: 'wholesale-opportunities',
      where: { status: { equals: 'needs_review' } },
      sort: '-processedAt',
      limit: 10,
    })

    if (result.docs.length === 0) return '✅ İnceleme bekleyen ürün yok.'

    const lines = [`📋 <b>İnceleme Gerekiyor (${result.totalDocs})</b>\n`]
    for (const doc of result.docs as Array<Record<string, any>>) {
      const groupName = (doc.supplierGroup as any)?.groupName ?? '?'
      lines.push(`• <b>${doc.productName ?? '?'}</b>`)
      lines.push(`  Grup: ${groupName} | Fiyat: ${doc.wholesalePrice ? `$${doc.wholesalePrice}` : '?'}`)
      lines.push(`  Neden: ${doc.skipReason ?? 'Düşük güven'}\n`)
    }
    if (result.totalDocs > 10) lines.push(`\n... ve ${result.totalDocs - 10} daha`)
    return lines.join('\n')
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /suppliers
// ─────────────────────────────────────────────────────────────────────────────

async function handleSuppliers(payload: Payload): Promise<string> {
  try {
    const result = await payload.find({
      collection: 'supplier-groups',
      sort: '-totalProductsCreated',
      limit: 20,
    })

    if (result.docs.length === 0) return '📭 Henüz tedarikçi grubu eklenmemiş.\n\nEklemek için Payload Admin → SupplierScout → Supplier Groups.'

    const lines = [`🏭 <b>İzlenen Tedarikçi Grupları (${result.totalDocs})</b>\n`]
    for (const doc of result.docs as Array<Record<string, any>>) {
      const status = doc.isBlocked ? '🔴 Blok' : doc.isActive ? '🟢 Aktif' : '⚫ Pasif'
      lines.push(`${status} <b>${doc.groupName}</b>`)
      lines.push(`  Marj: $${doc.marginUSD} | Güven: ${doc.trustScore}/100 | Ürün: ${doc.totalProductsCreated ?? 0}`)
      if (doc.lastMessageAt) {
        lines.push(`  Son mesaj: ${new Date(doc.lastMessageAt).toLocaleDateString('tr-TR')}`)
      }
      lines.push('')
    }
    return lines.join('\n')
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /soldout_today
// ─────────────────────────────────────────────────────────────────────────────

async function handleSoldOutToday(payload: Payload): Promise<string> {
  const today = toIstanbulDateISO()
  const startUtc = new Date(`${today}T00:00:00+03:00`).toISOString()
  const endUtc = new Date(`${today}T23:59:59+03:00`).toISOString()

  try {
    const result = await payload.find({
      collection: 'supplier-actions-log',
      where: {
        and: [
          { actionType: { equals: 'soldout_applied' } },
          { createdAt: { greater_than_equal: startUtc } },
          { createdAt: { less_than_equal: endUtc } },
        ],
      },
      limit: 20,
    })

    if (result.docs.length === 0) return `✅ Bugün tükendi güncellemesi yok.`

    const lines = [`❌ <b>Bugün Tükendi (${result.docs.length})</b>\n`]
    for (const doc of result.docs as Array<Record<string, any>>) {
      lines.push(`• ${doc.productTitle ?? '?'} (güven: ${doc.confidence})`)
      lines.push(`  Satıcı: ${doc.sellerUsername ?? doc.sellerUserId ?? '?'}`)
    }
    return lines.join('\n')
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /profit_today
// ─────────────────────────────────────────────────────────────────────────────

async function handleProfitToday(payload: Payload): Promise<string> {
  const today = toIstanbulDateISO()
  const startUtc = new Date(`${today}T00:00:00+03:00`).toISOString()
  const endUtc = new Date(`${today}T23:59:59+03:00`).toISOString()

  try {
    const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any
    const rate = settings?.usdToTryRate ?? 32

    const result = await payload.find({
      collection: 'supplier-actions-log',
      where: {
        and: [
          { actionType: { equals: 'product_created' } },
          { createdAt: { greater_than_equal: startUtc } },
          { createdAt: { less_than_equal: endUtc } },
        ],
      },
      limit: 100,
    })

    if (result.docs.length === 0) return `💰 Bugün eklenen ürün yok.`

    let totalMarginUSD = 0
    const lines = [`💰 <b>Bugün Marj Potansiyeli</b> (${result.docs.length} ürün)\n`]
    for (const doc of result.docs as Array<Record<string, any>>) {
      const w = doc.wholesalePrice ?? 0
      const s = (doc.websitePrice ?? 0) / rate
      const margin = s - w
      totalMarginUSD += Math.max(0, margin)
      lines.push(`• ${doc.productTitle ?? '?'}: $${w} → $${s.toFixed(0)} (+$${Math.max(0, margin).toFixed(0)})`)
    }
    lines.push(`\n<b>Toplam: ~$${totalMarginUSD.toFixed(0)} (${result.docs.length} ürün × $${(totalMarginUSD / result.docs.length).toFixed(0)} ortalama)</b>`)
    lines.push(`\n⚠️ Bu tahminidir — gerçek satışa bağlı.`)
    return lines.join('\n')
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /pause_auto / /resume_auto
// ─────────────────────────────────────────────────────────────────────────────

async function handlePauseAuto(rawText: string, payload: Payload): Promise<string> {
  const reason = rawText.replace('/pause_auto', '').trim() || 'Operatör isteği'
  try {
    await payload.updateGlobal({
      slug: 'supplier-scout-settings',
      data: {
        autoPauseActive: true,
        autoPausedAt: new Date().toISOString(),
        autoPauseReason: reason,
      } as any,
    })
    await logAction({
      actionType: 'auto_paused',
      confidence: 'high',
      details: `Otonom oluşturma durduruldu: ${reason}`,
      isReversible: true,
    }, payload)
    return `⏸️ <b>Otonom oluşturma durduruldu.</b>\n\nNeden: ${reason}\n\nSınıflandırma ve loglama devam ediyor.\nDevam ettirmek için: /resume_auto`
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

async function handleResumeAuto(payload: Payload): Promise<string> {
  try {
    await payload.updateGlobal({
      slug: 'supplier-scout-settings',
      data: {
        autoPauseActive: false,
        autoPauseReason: null,
      } as any,
    })
    await logAction({
      actionType: 'auto_resumed',
      confidence: 'high',
      details: 'Otonom oluşturma devam ettirildi',
      isReversible: false,
    }, payload)
    return `▶️ <b>Otonom oluşturma devam ettildi.</b>\n\nYeni gelen mesajlar tekrar işlenecek.`
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /teach
// ─────────────────────────────────────────────────────────────────────────────

async function handleTeach(args: string[], rawText: string, payload: Payload): Promise<string> {
  // Format: /teach TERM = MEANING [for SCOPE]
  // Example: /teach RC = Rain Cloud for New Balance products
  const content = rawText.replace(/^\/teach\s*/i, '').trim()
  const eqIdx = content.indexOf('=')
  if (eqIdx === -1) {
    return `❓ Format: <code>/teach TERİM = ANLAMI</code>\n\nÖrnek:\n<code>/teach RC = Rain Cloud rengi (New Balance)</code>\n<code>/teach tam seri = 36-45 arası tam numara</code>`
  }

  const term = content.substring(0, eqIdx).trim()
  let meaningFull = content.substring(eqIdx + 1).trim()

  // Extract scope from "for X" suffix
  let scope: string | undefined
  const forMatch = meaningFull.match(/\s+for\s+(.+)$/i)
  if (forMatch) {
    scope = forMatch[1]
    meaningFull = meaningFull.replace(forMatch[0], '').trim()
  }

  // Detect context from meaning
  const contextMap: Record<string, string> = {
    tükend: 'soldout', bitt: 'soldout', kalmad: 'soldout', sold: 'soldout',
    beden: 'size', numara: 'size', seri: 'size',
    fiyat: 'price', dolar: 'price', lira: 'price',
    renk: 'product', model: 'product', marka: 'product',
  }
  let context = 'general'
  for (const [key, ctx] of Object.entries(contextMap)) {
    if (meaningFull.toLowerCase().includes(key) || term.toLowerCase().includes(key)) {
      context = ctx
      break
    }
  }

  const result = await teachTerm(term, meaningFull, context, scope, payload)
  await logAction({
    actionType: 'term_learned',
    confidence: 'high',
    details: `Öğretilen: "${term}" = ${meaningFull}${scope ? ` (${scope})` : ''}`,
    isReversible: true,
  }, payload)

  return result.message
}

// ─────────────────────────────────────────────────────────────────────────────
// /memory
// ─────────────────────────────────────────────────────────────────────────────

async function handleMemory(args: string[], payload: Payload): Promise<string> {
  const terms = await loadLanguageMemory(payload)
  if (terms.length === 0) return '📚 Dil hafızası boş.\n\n/teach komutuyla terim ekle.'

  const filter = args.join(' ').toLowerCase()
  const filtered = filter
    ? terms.filter(t => t.term.includes(filter) || t.meaning.toLowerCase().includes(filter))
    : terms.slice(0, 20)

  const lines = [`📚 <b>Dil Hafızası</b> (${terms.length} terim)\n`]
  for (const t of filtered.slice(0, 20)) {
    lines.push(`• <code>${t.term}</code> → ${t.meaning} <i>[${t.context}]</i>`)
  }
  if (filtered.length > 20) lines.push(`... ve ${filtered.length - 20} daha`)
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// /seller
// ─────────────────────────────────────────────────────────────────────────────

async function handleSeller(args: string[], payload: Payload): Promise<string> {
  if (args.length < 2) {
    return `❓ Format: <code>/seller &lt;telegram_id&gt; &lt;not&gt;</code>\n\nÖrnek:\n<code>/seller 123456789 Her zaman tam seri gönderir, güvenilir</code>`
  }

  const sellerId = parseInt(args[0])
  if (isNaN(sellerId)) return `❌ Geçersiz Telegram ID: ${args[0]}`

  const note = args.slice(1).join(' ')
  const result = await teachSellerNote(sellerId, note, payload)
  return result.message
}

// ─────────────────────────────────────────────────────────────────────────────
// /group_logic
// ─────────────────────────────────────────────────────────────────────────────

async function handleGroupLogic(args: string[], payload: Payload): Promise<string> {
  if (args.length < 2) {
    return `❓ Format: <code>/group_logic &lt;grup_id&gt; &lt;gözlem&gt;</code>\n\nGrup ID'yi /suppliers ile öğren.`
  }

  const groupId = args[0]
  const observation = args.slice(1).join(' ')

  try {
    await payload.create({
      collection: 'supplier-group-memory',
      data: {
        supplierGroup: groupId,
        observationType: 'general_note',
        observation,
        confidence: 90,
        isManual: true,
        updatedAt: new Date().toISOString(),
      } as any,
    })
    return `✅ Grup gözlemi kaydedildi: ${observation}`
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /corrections
// ─────────────────────────────────────────────────────────────────────────────

async function handleCorrections(payload: Payload): Promise<string> {
  const corrections = await loadRecentCorrections(payload, 10)
  if (corrections.length === 0) return '✅ Henüz düzeltme kaydı yok.'

  const lines = [`📝 <b>Son Düzeltmeler (${corrections.length})</b>\n`]
  for (const c of corrections) {
    lines.push(`• ${c.original} → ${c.corrected}`)
    lines.push(`  <i>${c.reason.substring(0, 80)}</i>\n`)
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// /learning_today
// ─────────────────────────────────────────────────────────────────────────────

async function handleLearningToday(payload: Payload): Promise<string> {
  const today = toIstanbulDateISO()
  const startUtc = new Date(`${today}T00:00:00+03:00`).toISOString()
  const endUtc = new Date(`${today}T23:59:59+03:00`).toISOString()

  try {
    const termsLearned = await payload.find({
      collection: 'supplier-actions-log',
      where: {
        and: [
          { actionType: { equals: 'term_learned' } },
          { createdAt: { greater_than_equal: startUtc } },
          { createdAt: { less_than_equal: endUtc } },
        ],
      },
      limit: 20,
    })

    const lines = [`🧠 <b>Bugün Öğrenme (${toIstanbulDate()})</b>\n`]
    if (termsLearned.docs.length > 0) {
      lines.push(`📚 <b>Yeni Terimler (${termsLearned.docs.length})</b>`)
      for (const d of termsLearned.docs as Array<Record<string, any>>) {
        lines.push(`  • ${d.details}`)
      }
      lines.push('')
    } else {
      lines.push('📚 Bugün yeni terim öğrenilmedi.\n')
    }

    lines.push('/corrections — son düzeltmeleri gör')
    lines.push('/memory — tüm dil hafızasını gör')
    return lines.join('\n')
  } catch (err) {
    return `❌ Hata: ${(err as Error).message}`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// /create_draft  (Phase 3A — manual operator-triggered draft creation)
//
// Two-step flow:
//   Step 1 — preview:  /create_draft <wo_id>
//   Step 2 — execute:  /create_draft <wo_id> confirm
//
// Currency ambiguity detected at preview → requires "confirm" suffix.
// autoPauseActive and autoCreateEnabled gates are bypassed (explicit action).
// Products are always created as status='draft'. No publishing occurs.
// ─────────────────────────────────────────────────────────────────────────────

async function handleCreateDraft(args: string[], payload: Payload): Promise<string> {
  // ── Usage guard ──────────────────────────────────────────────────────────
  if (args.length === 0) {
    return (
      '❓ <b>/create_draft kullanımı:</b>\n\n' +
      '1. Önizleme:  <code>/create_draft &lt;WO_id&gt;</code>\n' +
      '2. Oluştur:   <code>/create_draft &lt;WO_id&gt; confirm</code>\n\n' +
      'WO ID listesi için /pending komutunu kullanın.'
    )
  }

  const opportunityId = parseInt(args[0], 10)
  if (isNaN(opportunityId)) {
    return `❌ Geçersiz WO ID: <code>${args[0]}</code> — sayısal bir değer giriniz.`
  }

  const isConfirm = args[1]?.toLowerCase() === 'confirm'

  // ── Step 1: Preview (no side effects) ───────────────────────────────────
  if (!isConfirm) {
    const preview = await previewManualDraft(opportunityId, payload)

    // Hard error from loader/validator
    if ('error' in preview) {
      return `❌ ${preview.error}`
    }

    // Duplicate — hard block
    if (preview.isDuplicate) {
      const pid = preview.duplicateProductId
      return (
        `🔁 <b>Duplicate Tespit Edildi</b>\n\n` +
        `WO #${opportunityId} için ürün zaten mevcut${pid ? ` (Ürün ID: ${pid})` : ''}.\n` +
        `Taslak oluşturulmaz.`
      )
    }

    // Format preview card
    const lines: string[] = [
      `📦 <b>Taslak Önizleme — WO #${opportunityId}</b>\n`,
      `Ürün:    <b>${preview.productName ?? '—'}</b>`,
    ]
    if (preview.brand) lines.push(`Marka:   ${preview.brand}`)
    if (preview.model) lines.push(`Model:   ${preview.model}`)
    if (preview.color) lines.push(`Renk:    ${preview.color}`)
    lines.push(`Beden:   ${preview.sizeSummary}`)

    const priceStr =
      preview.wholesalePrice
        ? `$${preview.wholesalePrice}${preview.wholesaleCurrency ? ` (${preview.wholesaleCurrency})` : ' (belirsiz döviz)'}`
        : '? (fiyat yok)'
    const sitePriceStr = preview.websitePrice ? ` → ₺${preview.websitePrice}` : ''
    lines.push(`Fiyat:   ${priceStr}${sitePriceStr}`)
    lines.push(`Güven:   ${preview.parseScore}/100`)
    lines.push(`Grup:    ${preview.groupName}`)

    if (preview.missingFields.length > 0) {
      lines.push(`\n⚠️ Eksik alanlar: ${preview.missingFields.join(', ')}`)
    }

    if (preview.warnings.length > 0) {
      lines.push('')
      for (const w of preview.warnings) {
        lines.push(`⚠️ ${w}`)
      }
    }

    lines.push(`\nDurum sonrası: <b>Taslak</b> — yayınlanmaz, otonom oluşturma bypass edilmez`)
    lines.push(`\nOnaylamak için:`)
    lines.push(`<code>/create_draft ${opportunityId} confirm</code>`)

    return lines.join('\n')
  }

  // ── Step 2: Execute (creates draft product) ──────────────────────────────
  const result = await executeManualDraft(opportunityId, payload)

  if (!result.success) {
    return `❌ <b>Taslak oluşturulamadı:</b> ${result.error ?? 'Bilinmeyen hata'}`
  }

  // Log the manual creation action
  await logAction(
    {
      actionType: 'product_created',
      confidence: 'high',
      productId: result.productId ? String(result.productId) : undefined,
      productTitle: result.productTitle,
      details: `[MANUEL] WO #${opportunityId} → Taslak: ${result.productTitle ?? '?'}`,
      isReversible: true,
      opportunityRef: opportunityId,
    },
    payload,
  )

  const adminPath = result.productId
    ? `\n\n🔗 Payload Admin: /admin/collections/products/${result.productId}`
    : ''

  return (
    `✅ <b>Taslak oluşturuldu!</b>\n\n` +
    `Ürün:        <b>${result.productTitle ?? '?'}</b>\n` +
    `Site Fiyatı: ₺${result.websitePrice ?? '?'}\n` +
    `Durum:       Taslak (yayınlanmadı)` +
    adminPath
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// /forward_wo  (Phase 3B — manual ops group forwarding)
//
// Sends a WholesaleOpportunity product card to the main Mentix/Uygunops group.
//
// Usage:        /forward_wo <WO_id>
//
// Safety rules:
//   - No product is created (read-only on Products collection)
//   - No publishing, no stock changes, no channel triggers
//   - Refuses to forward the same WO twice (dedup via opsForwardStatus)
//   - opsGroupChatId must be set in SupplierScoutSettings
//   - Card contains no raw Telegram IDs or secrets
// ─────────────────────────────────────────────────────────────────────────────

async function handleForwardWo(args: string[], payload: Payload): Promise<string> {
  // ── Usage guard ──────────────────────────────────────────────────────────
  if (args.length === 0) {
    return (
      '❓ <b>/forward_wo kullanımı:</b>\n\n' +
      '<code>/forward_wo &lt;WO_id&gt;</code>\n\n' +
      "Seçilen WholesaleOpportunity'yi ops grubuna kart olarak iletir.\n" +
      'WO ID listesi için /pending kullanın.'
    )
  }

  const woId = parseInt(args[0], 10)
  if (isNaN(woId)) {
    return `❌ Geçersiz WO ID: <code>${args[0]}</code> — sayısal bir değer giriniz.`
  }

  // ── Load settings — need opsGroupChatId ─────────────────────────────────
  let opsGroupChatId: number | undefined
  try {
    const settings = await payload.findGlobal({ slug: 'supplier-scout-settings' }) as any
    opsGroupChatId = settings?.opsGroupChatId
  } catch (err) {
    return `❌ Ayarlar yüklenemedi: ${(err as Error).message}`
  }

  if (!opsGroupChatId) {
    return (
      `⛔ <b>Ops grubu yapılandırılmamış</b>\n\n` +
      `SupplierScoutSettings → Ops Grubu Chat ID'si doldurulmalı.\n` +
      `Önce @SupplierScout_bot'u ops grubuna ekle, sonra admin panelinden Chat ID'yi ayarla.`
    )
  }

  // ── Load WO ──────────────────────────────────────────────────────────────
  let wo: Record<string, any>
  try {
    wo = await payload.findByID({
      collection: 'wholesale-opportunities',
      id: woId,
      depth: 1, // populate supplierGroup relationship
    }) as Record<string, any>
  } catch {
    return `❌ WO #${woId} bulunamadı. ID'yi kontrol et.`
  }

  // ── Deduplication guard ──────────────────────────────────────────────────
  if (wo.opsForwardStatus === 'forwarded') {
    const forwardedAt = wo.forwardedToOpsAt
      ? new Date(wo.forwardedToOpsAt as string).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
      : '?'
    return (
      `🔁 <b>Zaten İletildi</b>\n\n` +
      `WO #${woId} daha önce ops grubuna iletildi (${forwardedAt}).\n` +
      `Tekrar iletmek için önce opsForwardStatus'ü admin panelinden sıfırla.`
    )
  }

  // ── Soft warnings (don't block, just inform) ─────────────────────────────
  const softWarnings: string[] = []
  if (!wo.productName) softWarnings.push('ürün adı eksik')
  if (!wo.wholesalePrice) softWarnings.push('fiyat eksik')
  if (!wo.availableSizes || (Array.isArray(wo.availableSizes) && wo.availableSizes.length === 0)) {
    softWarnings.push('beden listesi boş')
  }

  // ── Send card to ops group ────────────────────────────────────────────────
  let messageId: number | null = null
  try {
    const result = await sendOpsCard(wo, opsGroupChatId)
    messageId = result.messageId
  } catch (err) {
    return `❌ Kart gönderilemedi: ${(err as Error).message}`
  }

  if (messageId === null) {
    return (
      `❌ <b>Gönderim Başarısız</b>\n\n` +
      `Kart ops grubuna gönderilemedi. Olası nedenler:\n` +
      `• @SupplierScout_bot gruba eklenmemiş\n` +
      `• Ops grubu Chat ID hatalı\n` +
      `• SUPPLIER_SCOUT_BOT_TOKEN geçersiz\n\n` +
      `Vercel loglarını kontrol et.`
    )
  }

  // ── Update WO forwarding status ───────────────────────────────────────────
  try {
    await payload.update({
      collection: 'wholesale-opportunities',
      id: woId,
      data: {
        opsForwardStatus: 'forwarded',
        forwardedToOpsAt: new Date().toISOString(),
        forwardedToOpsMessageId: messageId,
      } as any,
    })
  } catch (err) {
    // Non-fatal: card was sent successfully, just log the update failure
    console.error('[SupplierScout/forward_wo] WO forward-status update failed (non-fatal):', err)
  }

  // ── Log action ────────────────────────────────────────────────────────────
  try {
    await logAction(
      {
        actionType: 'ops_forwarded',
        confidence: wo.confidence ?? 'none',
        details: `[MANUEL] WO #${woId} ops grubuna iletildi — mesaj ID: ${messageId}`,
        isReversible: false,
        opportunityRef: woId,
      },
      payload,
    )
  } catch { /* non-critical */ }

  // ── Response to Frank ─────────────────────────────────────────────────────
  const productName = (wo.productName as string | undefined) ?? '?'
  let reply =
    `✅ <b>Ops grubuna iletildi!</b>\n\n` +
    `WO #${woId} — ${productName}\n` +
    `Mesaj ID: ${messageId}`

  if (softWarnings.length > 0) {
    reply += `\n\n⚠️ Uyarı: ${softWarnings.join(', ')} — kart yine de gönderildi`
  }

  reply += `\n\nTaslak için: <code>/create_draft ${woId} confirm</code>`

  return reply
}
