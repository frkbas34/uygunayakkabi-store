/**
 * supplierScout/telegram.ts
 *
 * Telegram API helpers for SupplierScout bot.
 * Uses SUPPLIER_SCOUT_BOT_TOKEN env var — completely separate from
 * TELEGRAM_BOT_TOKEN (Uygunops) and GEOBOT_TOKEN (GeoBot).
 *
 * STATUS: IMPLEMENTED (D-278)
 */

const SCOUT_TOKEN = () => process.env.SUPPLIER_SCOUT_BOT_TOKEN ?? ''

/** Send a plain text message. */
export async function scoutSendMessage(
  chatId: number,
  text: string,
  keyboard?: Array<Array<{ text: string; callback_data: string }>>,
): Promise<number | null> {
  const token = SCOUT_TOKEN()
  if (!token) {
    console.warn('[SupplierScout/telegram] SUPPLIER_SCOUT_BOT_TOKEN not set')
    return null
  }

  const safeText = text.length > 4000
    ? text.substring(0, 4000) + '\n\n⚠️ (mesaj kesildi)'
    : text

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: safeText,
    parse_mode: 'HTML',
  }
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error(`[SupplierScout/telegram] sendMessage FAILED ${res.status}: ${err.substring(0, 200)}`)
      return null
    }
    const data = await res.json()
    return (data as any).result?.message_id ?? null
  } catch (err) {
    console.error('[SupplierScout/telegram] sendMessage error:', err)
    return null
  }
}

/** Answer a callback query (prevents spinner in Telegram UI). */
export async function scoutAnswerCallback(callbackQueryId: string, text?: string): Promise<void> {
  const token = SCOUT_TOKEN()
  if (!token) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    })
  } catch { /* non-critical */ }
}

/** Get file info from Telegram to build download URL. */
export async function scoutGetFileUrl(fileId: string): Promise<string | null> {
  const token = SCOUT_TOKEN()
  if (!token) return null
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`)
    if (!res.ok) return null
    const data = await res.json()
    const filePath = (data as any).result?.file_path
    if (!filePath) return null
    return `https://api.telegram.org/file/bot${token}/${filePath}`
  } catch {
    return null
  }
}

/** Download a Telegram photo as ArrayBuffer. */
export async function scoutDownloadPhoto(fileId: string): Promise<ArrayBuffer | null> {
  const url = await scoutGetFileUrl(fileId)
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ops Group Card (Phase 3B)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build and send a WholesaleOpportunity product card to the main ops group.
 *
 * Safety rules enforced:
 * - Never shows raw Telegram chat IDs or numeric user IDs
 * - Only shows sellerUsername (@handle) or sellerDisplayName — never sellerTelegramId
 * - Never shows group Telegram chat ID — only groupName label
 * - Returns the Telegram message_id so caller can store it for future card edits
 *
 * Called by /forward_wo <WO_id> in commands.ts.
 */
export async function sendOpsCard(
  wo: Record<string, unknown>,
  opsGroupChatId: number,
): Promise<{ messageId: number | null }> {
  // ── Confidence badge ────────────────────────────────────────────────────
  const score = (wo.confidenceScore as number | undefined) ?? 0
  const badge = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'

  // ── Resolve supplier group name (may be populated relationship or raw text) ──
  const groupName: string =
    (wo.supplierGroup && typeof wo.supplierGroup === 'object'
      ? (wo.supplierGroup as Record<string, unknown>).groupName
      : wo.supplierGroupName) as string ?? '?'

  // ── Sizes ───────────────────────────────────────────────────────────────
  let sizesStr = '—'
  const rawSizes = wo.availableSizes
  if (Array.isArray(rawSizes) && rawSizes.length > 0) {
    sizesStr = rawSizes.join(', ')
  } else if (wo.sizeMin != null && wo.sizeMax != null) {
    sizesStr = `${wo.sizeMin}–${wo.sizeMax}`
  }

  // ── Pricing ─────────────────────────────────────────────────────────────
  const wholesalePrice = wo.wholesalePrice as number | undefined
  const wholesaleCurrency = (wo.wholesaleCurrency as string | undefined) ?? 'USD'
  const websitePrice = wo.websitePrice as number | undefined

  const formatPrice = (n: number, currency: string): string => {
    if (currency === 'TRY') return `${n.toLocaleString('tr-TR')} ₺`
    if (currency === 'EUR') return `€${n}`
    return `$${n}` // USD
  }

  const wholesaleStr = wholesalePrice != null
    ? formatPrice(wholesalePrice, wholesaleCurrency)
    : '—'
  const websiteStr = websitePrice != null
    ? `~${formatPrice(websitePrice, 'TRY')}`
    : '—'

  // ── Seller display (no numeric IDs) ─────────────────────────────────────
  const sellerUsername = wo.sellerUsername as string | undefined
  const sellerDisplayName = wo.sellerDisplayName as string | undefined
  const sellerStr = sellerUsername
    ? `@${sellerUsername}`
    : sellerDisplayName
      ? sellerDisplayName
      : null

  // ── Created product status ───────────────────────────────────────────────
  const createdProduct = wo.createdProduct
  const hasCreatedProduct = createdProduct != null && createdProduct !== ''
  const createdProductId = hasCreatedProduct
    ? (typeof createdProduct === 'object'
        ? (createdProduct as Record<string, unknown>).id
        : createdProduct)
    : null

  const statusLine = hasCreatedProduct
    ? `✅ Taslak mevcut — Ürün #${createdProductId}`
    : `👁 Gözlemlendi — henüz ürün oluşturulmadı`

  // ── Warnings ────────────────────────────────────────────────────────────
  const warnings: string[] = []
  if (!wholesalePrice) warnings.push('⚠️ Fiyat eksik — manuel doğrula')
  if (!wo.productName) warnings.push('⚠️ Ürün adı eksik — parser tahmini kullanıldı')
  if (!wo.hasPhoto) warnings.push('⚠️ Fotoğraf yok')
  if (score < 75) warnings.push(`⚠️ Güven düşük (${score}/100) — skoru kontrol et`)
  if (wo.status === 'skipped_duplicate') warnings.push('⚠️ Olası duplicate — benzer kayıt var')

  // ── Assemble card ────────────────────────────────────────────────────────
  const woId = wo.id as number | string
  const lines: string[] = [
    `📦 <b>SupplierScout Fırsatı</b>`,
    `WO #${woId}`,
    ``,
    `<b>Ürün:</b> ${(wo.productName as string | undefined) ?? '—'}`,
  ]

  if (wo.brand || wo.model) {
    const bm = [wo.brand, wo.model].filter(Boolean).join(' / ')
    lines.push(`<b>Marka / Model:</b> ${bm}`)
  }
  if (wo.color) lines.push(`<b>Renk:</b> ${wo.color}`)

  lines.push(`<b>Bedenler:</b> ${sizesStr}`)
  lines.push(`<b>Toptan:</b> ${wholesaleStr}`)
  lines.push(`<b>Site fiyatı:</b> ${websiteStr}`)
  lines.push(`<b>Güven:</b> ${score}/100 ${badge}`)
  lines.push(`<b>Kaynak:</b> ${groupName}`)
  if (sellerStr) lines.push(`<b>Satıcı:</b> ${sellerStr}`)

  lines.push(``)
  lines.push(`<b>Durum:</b> ${statusLine}`)

  if (warnings.length > 0) {
    lines.push(``)
    lines.push(warnings.join('\n'))
  }

  if (!hasCreatedProduct) {
    lines.push(``)
    lines.push(`DM komutu: <code>/create_draft ${woId} confirm</code>`)
  }

  const text = lines.join('\n')
  const messageId = await scoutSendMessage(opsGroupChatId, text)
  return { messageId }
}

/** Register webhook for SupplierScout bot. */
export async function registerScoutWebhook(webhookUrl: string): Promise<boolean> {
  const token = SCOUT_TOKEN()
  if (!token) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.SUPPLIER_SCOUT_WEBHOOK_SECRET ?? '',
        allowed_updates: ['message', 'callback_query'],
      }),
    })
    const data = await res.json()
    console.log('[SupplierScout/telegram] setWebhook result:', JSON.stringify(data))
    return (data as any).ok === true
  } catch (err) {
    console.error('[SupplierScout/telegram] registerWebhook error:', err)
    return false
  }
}
