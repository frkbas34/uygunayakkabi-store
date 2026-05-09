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
    default:
      return `❓ Bilinmeyen komut: ${cmd}\n\nKullanılabilir komutlar:\n/today /pending /suppliers /soldout_today /profit_today\n/pause_auto /resume_auto\n/teach /memory /seller /group_logic /corrections /learning_today`
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
