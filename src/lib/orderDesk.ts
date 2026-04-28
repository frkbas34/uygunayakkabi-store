/**
 * orderDesk.ts — D-245 Order Fulfillment / Post-Sale Status Controls v1
 *
 * Telegram-first read+write surface on top of the EXISTING Orders
 * collection. No new collection, no schema change — every status flip
 * lands on an enum value the schema already supports
 * (new | confirmed | shipped | delivered | cancelled), and stamps the
 * existing shippedAt / deliveredAt date fields.
 *
 * Single source of truth: applyOrderStatus(payload, orderId, action).
 * Slash commands AND inline-button callbacks both converge on it so
 * idempotency, refusal rules, and audit-event emission stay identical.
 *
 * Stock side-effects:
 *   - On create, Orders.afterChange already decrements stock + writes
 *     inventory log + triggers stock reaction. We do NOT duplicate that.
 *   - On cancel, there is NO existing stock-restore path in the repo.
 *     We do NOT fake it. The cancel response surfaces a /restock pointer
 *     so the operator can restore stock explicitly via D-234 if needed.
 */

const LIST_LIMIT = 10

export type OrderStatus = 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
export type OrderAction = 'ship' | 'deliver' | 'cancel'

const ACTION_TO_STATUS: Record<OrderAction, OrderStatus> = {
  ship: 'shipped',
  deliver: 'delivered',
  cancel: 'cancelled',
}

const OPEN_STATUSES: OrderStatus[] = ['new', 'confirmed', 'shipped']
const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrderEntry {
  id: number | string
  orderNumber: string
  customerName: string
  customerPhone: string
  status: OrderStatus
  source: string
  productId: number | null
  productSn: string | null
  productTitle: string | null
  size: string | null
  quantity: number | null
  totalPrice: number | null
  paymentMethod: string | null
  isPaid: boolean
  notes: string | null
  shippingCompany: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
  relatedInquiryId: number | null
  createdAt: string
  updatedAt: string
}

export interface OrderStatusResult {
  ok: boolean
  idempotent: boolean
  orderId: number | string
  fromStatus?: OrderStatus
  toStatus?: OrderStatus
  refusalReason?:
    | 'order_not_found'
    | 'invalid_transition'
  message: string
  summary: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
    })
  } catch {
    return iso
  }
}

function fmtDay(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch { return iso }
}

function statusEmoji(s: OrderStatus | string | null | undefined): string {
  switch (s) {
    case 'new': return '🆕'
    case 'confirmed': return '✅'
    case 'shipped': return '📦'
    case 'delivered': return '🏠'
    case 'cancelled': return '❌'
    default: return '❓'
  }
}

function normalizeOrder(doc: any): OrderEntry {
  const product = (() => {
    if (!doc.product) return { id: null, sn: null, title: null }
    if (typeof doc.product === 'object') {
      return {
        id: doc.product.id ?? null,
        sn: (doc.product.stockNumber as string) ?? null,
        title: (doc.product.title as string) ?? null,
      }
    }
    return { id: doc.product as number, sn: null, title: null }
  })()
  const rel = doc.relatedInquiry ?? doc.relatedInquiryId
  const relId = (() => {
    if (!rel) return null
    if (typeof rel === 'object') return rel.id ?? null
    return rel
  })()
  return {
    id: doc.id,
    orderNumber: String(doc.orderNumber ?? `ORD-${doc.id}`),
    customerName: String(doc.customerName ?? ''),
    customerPhone: String(doc.customerPhone ?? ''),
    status: (doc.status as OrderStatus) ?? 'new',
    source: String(doc.source ?? 'website'),
    productId: product.id,
    productSn: product.sn,
    productTitle: product.title,
    size: doc.size ?? null,
    quantity: toNumber(doc.quantity) ?? 1,
    totalPrice: toNumber(doc.totalPrice),
    paymentMethod: doc.paymentMethod ?? null,
    isPaid: doc.isPaid === true,
    notes: doc.notes ?? null,
    shippingCompany: doc.shippingCompany ?? null,
    trackingNumber: doc.trackingNumber ?? null,
    shippedAt: doc.shippedAt ?? null,
    deliveredAt: doc.deliveredAt ?? null,
    relatedInquiryId: relId,
    createdAt: String(doc.createdAt),
    updatedAt: String(doc.updatedAt),
  }
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Open orders = anything not in {delivered, cancelled}. Sorted: new newest-first
 * → confirmed newest-first → shipped oldest-first (so old shipped-but-not-
 * delivered orders bubble up).
 */
export async function getOpenOrders(payload: any): Promise<{
  items: OrderEntry[]
  totalOpen: number
  counts: Record<OrderStatus, number>
}> {
  const res = await payload.find({
    collection: 'orders',
    where: { status: { in: OPEN_STATUSES } },
    sort: '-createdAt',
    limit: 100,
    depth: 1,
  })
  const all = (res.docs as any[]).map(normalizeOrder)
  const counts: Record<OrderStatus, number> = {
    new: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0,
  }
  for (const o of all) counts[o.status] = (counts[o.status] ?? 0) + 1
  const score = (o: OrderEntry): number => {
    if (o.status === 'new') return 0
    if (o.status === 'confirmed') return 1
    return 2 // shipped
  }
  const sorted = [...all].sort((a, b) => {
    const sa = score(a), sb = score(b)
    if (sa !== sb) return sa - sb
    if (a.status === 'shipped') {
      // oldest shipped first — encourages chasing late deliveries
      const at = new Date(a.shippedAt ?? a.createdAt).getTime()
      const bt = new Date(b.shippedAt ?? b.createdAt).getTime()
      return at - bt
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return {
    items: sorted.slice(0, LIST_LIMIT),
    totalOpen: all.length,
    counts,
  }
}

export async function getTodayOrders(payload: any): Promise<{
  createdToday: number
  shippedToday: number
  deliveredToday: number
  cancelledToday: number
  totalOpen: number
  recentCreated: OrderEntry[]
}> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const sinceISO = todayStart.toISOString()

  const created = await payload.find({
    collection: 'orders',
    where: { createdAt: { greater_than: sinceISO } },
    sort: '-createdAt',
    limit: 5,
    depth: 1,
  })
  const recentCreated = (created.docs as any[]).map(normalizeOrder)
  const createdToday = created.totalDocs as number

  // shipped today / delivered today / cancelled today via stamp + status
  const counted = async (statusVal: string, stampField: 'shippedAt' | 'deliveredAt' | null): Promise<number> => {
    const where: any = {
      and: [
        { status: { equals: statusVal } },
        { updatedAt: { greater_than: sinceISO } },
      ],
    }
    // For shipped/delivered we'd ideally use the stamp field, but updatedAt
    // is a reliable proxy and avoids a JSON-path query against a date column.
    void stampField
    const r = await payload.find({ collection: 'orders', where, limit: 1, depth: 0 })
    return (r.totalDocs as number) ?? 0
  }
  const [shippedToday, deliveredToday, cancelledToday, openTotalRes] = await Promise.all([
    counted('shipped', 'shippedAt'),
    counted('delivered', 'deliveredAt'),
    counted('cancelled', null),
    payload.find({ collection: 'orders', where: { status: { in: OPEN_STATUSES } }, limit: 1, depth: 0 }),
  ])

  return {
    createdToday,
    shippedToday,
    deliveredToday,
    cancelledToday,
    totalOpen: (openTotalRes.totalDocs as number) ?? 0,
    recentCreated,
  }
}

export async function getOrderById(payload: any, id: number | string): Promise<OrderEntry | null> {
  try {
    const doc = await payload.findByID({ collection: 'orders', id, depth: 1 })
    if (!doc) return null
    return normalizeOrder(doc)
  } catch {
    return null
  }
}

// ── Status writes — single source of truth ───────────────────────────────────

/**
 * Apply a status change. Idempotent — second press = no-op with a clear
 * "already" message. Refuses pathological transitions that would corrupt
 * the timeline:
 *   ship      from cancelled / delivered → refuse
 *   deliver   from cancelled             → refuse
 *               from new / confirmed     → ALLOW but auto-stamp shippedAt
 *                                          (operator may have skipped /ship
 *                                          for same-day local courier)
 *   cancel    from delivered             → refuse (admin handles refunds)
 *               from anything else       → allow
 *
 * Stamps the existing shippedAt / deliveredAt date fields.
 * Emits `order.status_changed` bot-event for audit trail.
 *
 * NO stock mutation on cancel. The repo has no order-cancel restore-stock
 * path; we don't fake it. The cancel message surfaces /restock so the
 * operator can restore stock explicitly via D-234 if needed.
 */
export async function applyOrderStatus(
  payload: any,
  orderId: number | string,
  action: OrderAction,
  source: 'telegram_command' | 'telegram_button' = 'telegram_command',
): Promise<OrderStatusResult> {
  let doc: any
  try {
    doc = await payload.findByID({ collection: 'orders', id: orderId, depth: 0 })
  } catch {
    return {
      ok: false,
      idempotent: false,
      orderId,
      refusalReason: 'order_not_found',
      message: `❌ Sipariş bulunamadı (ID: ${orderId})`,
      summary: `<code>O${orderId}</code> · bulunamadı`,
    }
  }
  if (!doc) {
    return {
      ok: false,
      idempotent: false,
      orderId,
      refusalReason: 'order_not_found',
      message: `❌ Sipariş bulunamadı (ID: ${orderId})`,
      summary: `<code>O${orderId}</code> · bulunamadı`,
    }
  }
  const fromStatus = (doc.status as OrderStatus) ?? 'new'
  const toStatus = ACTION_TO_STATUS[action]
  const orderTag = doc.orderNumber ? `<code>${doc.orderNumber}</code>` : `ID:${orderId}`

  // Idempotency
  if (fromStatus === toStatus) {
    return {
      ok: true,
      idempotent: true,
      orderId,
      fromStatus,
      toStatus,
      message:
        `🟰 ${orderTag} zaten <code>${toStatus}</code>.\n` +
        (fromStatus === 'shipped' && doc.shippedAt ? `📦 Kargo: ${fmtDay(doc.shippedAt)}\n` : '') +
        (fromStatus === 'delivered' && doc.deliveredAt ? `🏠 Teslim: ${fmtDay(doc.deliveredAt)}\n` : '') +
        `<i>Değişiklik yapılmadı.</i>`,
      summary: `<code>${doc.orderNumber ?? `ID:${orderId}`}</code> · zaten ${toStatus}`,
    }
  }

  // Refusal rules — protect timeline truthfulness
  const isRefused = (() => {
    if (action === 'ship' && (fromStatus === 'cancelled' || fromStatus === 'delivered')) return true
    if (action === 'deliver' && fromStatus === 'cancelled') return true
    if (action === 'cancel' && fromStatus === 'delivered') return true
    return false
  })()
  if (isRefused) {
    return {
      ok: false,
      idempotent: false,
      orderId,
      fromStatus,
      toStatus,
      refusalReason: 'invalid_transition',
      message:
        `⚠️ ${orderTag} · <code>${fromStatus}</code> → <code>${toStatus}</code> izin verilmiyor.\n\n` +
        (fromStatus === 'delivered' && action === 'cancel'
          ? `<i>Teslim edilmiş siparişi iptal edemezsiniz. İade için admin panelinden işlem yapın.</i>`
          : fromStatus === 'cancelled'
            ? `<i>İptal edilmiş sipariş yeniden işlenemez. Yeni sipariş için /convert &lt;lead-id&gt; kullanın.</i>`
            : `<i>Bu durumdan bu duruma geçiş geçersiz.</i>`),
      summary: `<code>${doc.orderNumber ?? `ID:${orderId}`}</code> · ${fromStatus} → ${toStatus} reddedildi`,
    }
  }

  // Build the patch
  const now = new Date().toISOString()
  const data: Record<string, unknown> = { status: toStatus }
  if (toStatus === 'shipped' && !doc.shippedAt) {
    data.shippedAt = now
  }
  if (toStatus === 'delivered') {
    if (!doc.deliveredAt) data.deliveredAt = now
    // If we're delivering an order that never got the shipped stamp,
    // backfill shippedAt (timeline truthfulness — can't deliver what
    // wasn't shipped).
    if (!doc.shippedAt) data.shippedAt = now
  }

  await payload.update({
    collection: 'orders',
    id: orderId,
    data,
    // Suppress the afterChange hook's stock decrement — that hook only
    // fires on operation==='create' anyway, but the dispatch flag also
    // covers the defensive case.
    context: { isDispatchUpdate: true },
  })

  // Audit-trail event (best-effort)
  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'order.status_changed',
        sourceBot: 'uygunops',
        status: 'processed',
        payload: {
          orderId,
          orderNumber: doc.orderNumber ?? null,
          fromStatus,
          toStatus,
          action,
          source,
          changedAt: now,
        },
        notes: `Order ${doc.orderNumber ?? orderId}: ${fromStatus} → ${toStatus} via ${source}.`,
        processedAt: now,
      },
    })
  } catch {
    /* non-fatal */
  }

  const lines = [`${statusEmoji(toStatus)} ${orderTag} · <code>${fromStatus}</code> → <code>${toStatus}</code>`]
  if (data.shippedAt) lines.push(`📦 Kargo zamanı: ${fmtDay(data.shippedAt as string)}`)
  if (data.deliveredAt) lines.push(`🏠 Teslim zamanı: ${fmtDay(data.deliveredAt as string)}`)
  if (toStatus === 'shipped' && !doc.shippingCompany) {
    lines.push(``, `<i>Kargo firması/takip no admin panelinden eklenebilir.</i>`)
  }
  if (toStatus === 'cancelled') {
    // Surface the /restock pointer so operator restores stock explicitly.
    const sn = (() => {
      // best-effort: doc.product is a number/object here (depth=0)
      if (typeof doc.product === 'object' && doc.product?.stockNumber) return doc.product.stockNumber
      return null
    })()
    const restockHint = sn
      ? `<code>/restock ${sn} ${doc.quantity ?? 1}</code>`
      : `<code>/restock &lt;sn&gt; &lt;qty&gt;</code>`
    lines.push(``, `<i>⚠️ Stok otomatik geri eklenmedi.</i>`, `<i>Gerekirse: ${restockHint}</i>`)
  }

  return {
    ok: true,
    idempotent: false,
    orderId,
    fromStatus,
    toStatus,
    message: lines.join('\n'),
    summary: `<code>${doc.orderNumber ?? `ID:${orderId}`}</code> · ${fromStatus} → ${toStatus}`,
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────

export function formatOrderLine(o: OrderEntry): string {
  const tag = `<code>${o.orderNumber}</code>`
  const who = escapeHtml(o.customerName).slice(0, 22) || '—'
  const product = o.productSn ? ` · <code>${o.productSn}</code>` : ''
  const amt = o.totalPrice ? ` · ${o.totalPrice}₺` : ''
  const when = (() => {
    if (o.status === 'shipped' && o.shippedAt) return `kargo ${fmtDate(o.shippedAt)}`
    return fmtDate(o.createdAt)
  })()
  return `${statusEmoji(o.status)} ${tag} · ${who}${product}${amt}\n   <i>${when}</i>`
}

export function formatOpenOrdersList(d: Awaited<ReturnType<typeof getOpenOrders>>): string {
  if (d.totalOpen === 0) {
    return `📦 <b>Sipariş Kuyruğu</b>\n\n✅ Açık sipariş yok.\n\n<i>/orders today — bugünkü etkinlik · /order &lt;id&gt; — detay</i>`
  }
  const summary = [
    d.counts.new > 0 ? `🆕 yeni: <b>${d.counts.new}</b>` : null,
    d.counts.confirmed > 0 ? `✅ onaylı: <b>${d.counts.confirmed}</b>` : null,
    d.counts.shipped > 0 ? `📦 kargoda: <b>${d.counts.shipped}</b>` : null,
  ].filter(Boolean).join(' · ')
  const lines = [
    `📦 <b>Sipariş Kuyruğu</b> — açık: ${d.totalOpen}`,
    summary,
    ``,
  ]
  for (const o of d.items) lines.push(formatOrderLine(o))
  if (d.totalOpen > d.items.length) {
    lines.push(``, `<i>+ ${d.totalOpen - d.items.length} daha (gizlendi) — /order &lt;id&gt; ile aç</i>`)
  }
  lines.push(``, `<i>Aksiyon: /order &lt;id&gt; · /ship &lt;id&gt; · /deliver &lt;id&gt; · /cancelorder &lt;id&gt;</i>`)
  return lines.join('\n')
}

export function formatOrdersToday(d: Awaited<ReturnType<typeof getTodayOrders>>): string {
  const lines = [
    `📊 <b>Bugünkü Sipariş Hareketi</b> (UTC günü)`,
    ``,
    `📥 Oluşturulan: ${d.createdToday}`,
    `📦 Kargolanan: ${d.shippedToday}`,
    `🏠 Teslim Edilen: ${d.deliveredToday}`,
    `❌ İptal Edilen: ${d.cancelledToday}`,
    ``,
    `📂 Açık Toplam: ${d.totalOpen}`,
    ``,
  ]
  if (d.recentCreated.length > 0) {
    lines.push(`<b>Bugün Oluşturulan</b>`)
    for (const o of d.recentCreated) lines.push(formatOrderLine(o))
  } else {
    lines.push(`<i>Bugün yeni sipariş yok.</i>`)
  }
  lines.push(``, `<i>/orders · /sales today · /leads summary</i>`)
  return lines.join('\n')
}

export function formatOrderCard(o: OrderEntry): string {
  const lines = [
    `${statusEmoji(o.status)} <b>Sipariş ${o.orderNumber}</b> — <code>${o.status}</code>`,
    ``,
    `👤 ${escapeHtml(o.customerName)}`,
    `📱 <code>${escapeHtml(o.customerPhone)}</code>`,
  ]
  if (o.productSn || o.productTitle) {
    const ptag = o.productSn ?? `ID:${o.productId}`
    const ptitle = o.productTitle ? ` — ${escapeHtml(o.productTitle).slice(0, 50)}` : ''
    lines.push(`🛍️ <code>${ptag}</code>${ptitle}`)
  }
  if (o.size) lines.push(`📐 Beden: ${escapeHtml(o.size)} · Adet: ${o.quantity ?? 1}`)
  else if (o.quantity && o.quantity > 1) lines.push(`🔢 Adet: ${o.quantity}`)
  if (o.totalPrice) lines.push(`💵 Tutar: <b>${o.totalPrice}</b> ₺` + (o.isPaid ? ' · ✅ ödendi' : ''))
  if (o.paymentMethod) lines.push(`💳 Ödeme: ${escapeHtml(o.paymentMethod)}`)
  if (o.shippingCompany || o.trackingNumber) {
    const co = o.shippingCompany ? `${escapeHtml(o.shippingCompany)}` : ''
    const tn = o.trackingNumber ? ` <code>${escapeHtml(o.trackingNumber)}</code>` : ''
    lines.push(`🚚 ${co}${tn}`.trim())
  }
  if (o.notes) {
    lines.push(``, `📝 <i>${escapeHtml(o.notes).slice(0, 280)}</i>`)
  }
  lines.push(``, `📅 Oluşturulma: ${fmtDate(o.createdAt)}`)
  if (o.shippedAt) lines.push(`📦 Kargo: ${fmtDate(o.shippedAt)}`)
  if (o.deliveredAt) lines.push(`🏠 Teslim: ${fmtDate(o.deliveredAt)}`)
  lines.push(`🌐 Kaynak: ${o.source}`)
  if (o.relatedInquiryId) lines.push(`🆔 Lead: <code>L#${o.relatedInquiryId}</code> · /lead ${o.relatedInquiryId}`)
  return lines.join('\n')
}

export function orderButtonsKeyboard(o: OrderEntry) {
  // Row 1: action triplet
  const row1: any[] = []
  // Suggest the next-step action first; offer cancel always (except for terminal).
  const isTerminal = TERMINAL_STATUSES.includes(o.status)
  if (!isTerminal) {
    row1.push({ text: '📦 Kargola', callback_data: `oract:${o.id}:ship` })
    row1.push({ text: '🏠 Teslim', callback_data: `oract:${o.id}:deliver` })
    row1.push({ text: '❌ İptal', callback_data: `oract:${o.id}:cancel` })
  }
  // Row 2: navigation links (if applicable)
  const row2: any[] = []
  if (o.relatedInquiryId) {
    row2.push({ text: `🆔 Lead #${o.relatedInquiryId}`, callback_data: `ldcard:${o.relatedInquiryId}` })
  }
  if (o.productId) {
    row2.push({ text: '🔍 Ürün', callback_data: `sn_card:${o.productId}` })
  }
  return [row1, row2].filter((r) => r.length > 0)
}

// ── D-247: Alerts + reminders + daily summary ───────────────────────────────

const STALE_DAYS_DEFAULT = 3

/**
 * D-247: Concise new-order Telegram card. Shorter than formatOrderCard.
 * Includes order number + customer + product/SN + size + qty + amount +
 * source + lead link if present. Pairs with orderButtonsKeyboard for
 * in-place action.
 */
export function formatNewOrderAlert(o: OrderEntry): string {
  const lines = [
    `🚨 <b>YENİ SİPARİŞ</b> · <code>${o.orderNumber}</code>`,
    ``,
    `👤 ${escapeHtml(o.customerName)}`,
    `📱 <code>${escapeHtml(o.customerPhone)}</code>`,
  ]
  if (o.productSn || o.productTitle) {
    const ptag = o.productSn ?? `ID:${o.productId}`
    const ptitle = o.productTitle ? ` — ${escapeHtml(o.productTitle).slice(0, 50)}` : ''
    lines.push(`🛍️ <code>${ptag}</code>${ptitle}`)
  }
  if (o.size || (o.quantity && o.quantity > 1)) {
    const parts: string[] = []
    if (o.size) parts.push(`Beden ${escapeHtml(o.size)}`)
    if (o.quantity && o.quantity > 1) parts.push(`Adet ${o.quantity}`)
    lines.push(`📐 ${parts.join(' · ')}`)
  }
  if (o.totalPrice) lines.push(`💵 Tutar: <b>${o.totalPrice}</b> ₺` + (o.isPaid ? ' · ✅ ödendi' : ''))
  lines.push(`🌐 ${o.source}`)
  if (o.relatedInquiryId) lines.push(`🆔 Lead: <code>L#${o.relatedInquiryId}</code>`)
  lines.push(``, `<i>Detay: /order ${o.id}</i>`)
  return lines.join('\n')
}

/**
 * D-247: Send new-order Telegram alert to the operator chat. Reuses the
 * same env (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) and fire-and-forget
 * pattern as src/lib/stockReaction.ts and src/lib/leadDesk.ts so dispatch
 * routing stays consistent across the codebase.
 *
 * Emits a `order.new_alert_sent` bot-event for audit + future cron/dedup.
 *
 * Errors are swallowed — alert failure must never block order persistence.
 */
export async function sendNewOrderAlert(payload: any, orderId: number | string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[orderDesk D-247] TELEGRAM env not set — new-order alert skipped')
    return
  }
  try {
    const order = await getOrderById(payload, orderId)
    if (!order) {
      console.warn(`[orderDesk D-247] new-order alert: order ${orderId} not found post-create`)
      return
    }
    const text = formatNewOrderAlert(order)
    const kb = orderButtonsKeyboard(order)
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: kb },
      }),
    })
    try {
      await payload.create({
        collection: 'bot-events',
        data: {
          eventType: 'order.new_alert_sent',
          sourceBot: 'uygunops',
          status: 'processed',
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            source: order.source,
            sentAt: new Date().toISOString(),
            chatId: String(chatId),
          },
          notes: `New order alert sent for ${order.orderNumber}.`,
          processedAt: new Date().toISOString(),
        },
      })
    } catch {
      /* non-fatal */
    }
  } catch (err) {
    console.error(
      `[orderDesk D-247] new-order alert failed (non-blocking):`,
      err instanceof Error ? err.message : String(err),
    )
  }
}

/**
 * D-247: Stale shipped orders — `status='shipped'` AND
 * `shippedAt` (or `createdAt` fallback) older than `staleDays`.
 * Reuses D-246 stale rule exactly. Returns oldest-first so the operator
 * sees the worst offenders first.
 */
export async function getStaleShippedOrders(
  payload: any,
  opts: { staleDays?: number; limit?: number } = {},
): Promise<{
  staleDays: number
  totalStale: number
  items: OrderEntry[]
}> {
  const staleDays = opts.staleDays ?? STALE_DAYS_DEFAULT
  const limit = opts.limit ?? 25
  const open = await getOpenOrders(payload)
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000

  type Aged = { order: OrderEntry; ageMs: number }
  const aged: Aged[] = []
  for (const o of open.items) {
    if (o.status !== 'shipped') continue
    const ts = o.shippedAt ?? o.createdAt
    const tms = new Date(ts).getTime()
    if (!Number.isFinite(tms) || tms >= cutoff) continue
    aged.push({ order: o, ageMs: Date.now() - tms })
  }
  aged.sort((a, b) => b.ageMs - a.ageMs)
  return {
    staleDays,
    totalStale: aged.length,
    items: aged.slice(0, limit).map((a) => a.order),
  }
}

/** D-247: header text for /orderreminders. Per-order cards are streamed
 *  separately by the route handler with orderButtonsKeyboard. */
export function formatOrderRemindersHeader(d: Awaited<ReturnType<typeof getStaleShippedOrders>>): string {
  if (d.totalStale === 0) {
    return (
      `⏰ <b>Sipariş Hatırlatıcıları</b>\n\n` +
      `✅ Geç teslim olan kargo yok (${d.staleDays} günden eski kargolanmış sipariş bulunamadı).\n\n` +
      `<i>Açık liste için /orders · özet için /orders summary</i>`
    )
  }
  return [
    `⏰ <b>Sipariş Hatırlatıcıları</b> — geç teslim: ${d.totalStale} (eşik: ${d.staleDays} gün kargoda)`,
    ``,
    `<i>Aşağıda en eski kargolar kartlar halinde — düğmelerle aksiyon alabilirsiniz.</i>`,
    `<i>Tüm açık liste: /orders · bugünkü etkinlik: /orders summary</i>`,
  ].join('\n')
}

/** D-247: Daily order summary — wraps getTodayOrders + open total + stale. */
export async function getDailyOrderSummary(payload: any): Promise<{
  createdToday: number
  shippedToday: number
  deliveredToday: number
  cancelledToday: number
  totalOpen: number
  totalStale: number
  staleDays: number
}> {
  const [today, open, stale] = await Promise.all([
    getTodayOrders(payload),
    getOpenOrders(payload),
    getStaleShippedOrders(payload),
  ])
  return {
    createdToday: today.createdToday,
    shippedToday: today.shippedToday,
    deliveredToday: today.deliveredToday,
    cancelledToday: today.cancelledToday,
    totalOpen: open.totalOpen,
    totalStale: stale.totalStale,
    staleDays: stale.staleDays,
  }
}

export function formatDailyOrderSummary(d: Awaited<ReturnType<typeof getDailyOrderSummary>>): string {
  const lines = [
    `📊 <b>Sipariş Özeti</b> (UTC günü)`,
    ``,
    `<b>Bugün</b>`,
    `  📥 Yeni: ${d.createdToday}`,
    `  📦 Kargolanan: ${d.shippedToday}`,
    `  🏠 Teslim Edilen: ${d.deliveredToday}`,
    `  ❌ İptal: ${d.cancelledToday}`,
    ``,
    `<b>Açık Toplam</b>: ${d.totalOpen}` + (d.totalStale > 0 ? ` · ⏰ Geç teslim (${d.staleDays}+gün): <b>${d.totalStale}</b>` : ''),
    ``,
    `<i>/orders · /orderreminders · /inbox orders</i>`,
  ]
  return lines.join('\n')
}
