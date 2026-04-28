/**
 * operatorInbox.ts — D-236 Operator Inbox / Queue v1
 *
 * Read-only Telegram queue surface. Backs /inbox + sub-commands:
 *   /inbox          → mixed overview (counts + top items per bucket)
 *   /inbox pending  → operator-action queue
 *   /inbox publish  → publish-ready waiting for activation
 *   /inbox stock    → soldout / low-stock urgency
 *   /inbox failed   → workflow failures + recent failure bot-events
 *   /inbox today    → today's snapshot
 *
 * All filters use existing schema fields — see Products.ts:
 *   workflow.workflowStatus      ∈ {draft, visual_pending, visual_ready,
 *                                   confirmation_pending, confirmed,
 *                                   content_pending, content_ready,
 *                                   audit_pending, publish_ready, active,
 *                                   soldout, archived}
 *   workflow.visualStatus        ∈ {pending, generating, preview, approved, rejected}
 *   workflow.confirmationStatus  ∈ {pending, confirmed, blocked}
 *   workflow.contentStatus       ∈ {pending, commerce_generated, discovery_generated, ready, failed}
 *   workflow.auditStatus         ∈ {not_required, pending, approved, approved_with_warning, needs_revision, failed}
 *   workflow.stockState          ∈ {in_stock, low_stock, sold_out, restocked}
 *   workflow.sellable            : boolean
 *   status                       ∈ {draft, active, soldout, ...}
 *   sourceMeta.shopierSyncStatus ∈ {not_synced, queued, syncing, synced, error}
 *
 * No mutations. Every helper here is a read.
 */

const LIST_LIMIT = 10
const FAILED_EVENT_TYPES = [
  'content.failed',
  'pi.auto_trigger_failed',
  'audit.failed',
  'audit.needs_revision',
  'dispatch.failed',
  'shopier.sync.failed',
  'shopier.error',
]

// ── Shared formatters ────────────────────────────────────────────────────────

function statusEmoji(s?: string | null): string {
  return s === 'active' ? '🟢' : s === 'soldout' ? '🔴' : '⚪'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function lineFor(p: any, extra?: string): string {
  const sn = p.stockNumber ? `<code>${p.stockNumber}</code>` : `ID:${p.id}`
  const title = escapeHtml((p.title as string) || 'İsimsiz').slice(0, 40)
  const tag = extra ? ` · ${extra}` : ''
  return `${statusEmoji(p.status)} ${sn} · ${title}${tag}`
}

function header(label: string, count: number, total?: number): string {
  if (total !== undefined && total > count) {
    return `<b>${label}</b> — ${count}/${total}`
  }
  return `<b>${label}</b> — ${count}`
}

function startOfTodayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// ── Queries ──────────────────────────────────────────────────────────────────

interface InboxBucket {
  count: number
  items: any[]
  hasMore: boolean
  totalDocs: number
}

async function findBucket(payload: any, where: any, sort: string = '-updatedAt'): Promise<InboxBucket> {
  const { docs, totalDocs } = await payload.find({
    collection: 'products',
    where,
    sort,
    limit: LIST_LIMIT,
    depth: 0,
  })
  return {
    count: docs.length,
    items: docs,
    hasMore: totalDocs > docs.length,
    totalDocs,
  }
}

/** PENDING — products waiting for operator action. */
export async function getInboxPending(payload: any): Promise<{
  visualPreview: InboxBucket
  wizardIncomplete: InboxBucket
}> {
  // 1. Visuals generated, awaiting operator approval
  const visualPreview = await findBucket(payload, {
    'workflow.visualStatus': { equals: 'preview' },
  })

  // 2. Visuals approved, wizard not yet confirmed (operator must run /confirm)
  const wizardIncomplete = await findBucket(payload, {
    and: [
      { 'workflow.visualStatus': { equals: 'approved' } },
      { 'workflow.confirmationStatus': { not_equals: 'confirmed' } },
    ],
  })

  return { visualPreview, wizardIncomplete }
}

/** PUBLISH — confirmed + content ready, awaiting operator activation. */
export async function getInboxPublish(payload: any): Promise<{
  publishReady: InboxBucket
  contentReadyNotActive: InboxBucket
}> {
  const publishReady = await findBucket(payload, {
    'workflow.workflowStatus': { equals: 'publish_ready' },
  })
  // Wider net — content is ready but product hasn't been activated yet
  const contentReadyNotActive = await findBucket(payload, {
    and: [
      { 'workflow.contentStatus': { equals: 'ready' } },
      { status: { not_equals: 'active' } },
      { 'workflow.workflowStatus': { not_equals: 'publish_ready' } }, // exclude already-counted
    ],
  })
  return { publishReady, contentReadyNotActive }
}

/** STOCK — urgency buckets driven by stockState + status. */
export async function getInboxStock(payload: any): Promise<{
  soldout: InboxBucket
  lowStock: InboxBucket
}> {
  // Soldout = either status='soldout' OR stockState='sold_out'
  const soldout = await findBucket(payload, {
    or: [
      { status: { equals: 'soldout' } },
      { 'workflow.stockState': { equals: 'sold_out' } },
    ],
  })

  // Low-stock = active + stockState='low_stock'
  const lowStock = await findBucket(payload, {
    and: [
      { status: { equals: 'active' } },
      { 'workflow.stockState': { equals: 'low_stock' } },
    ],
  })

  return { soldout, lowStock }
}

/** FAILED — workflow failures + recent failure bot_events. */
export async function getInboxFailed(payload: any): Promise<{
  contentFailed: InboxBucket
  auditFailed: InboxBucket
  shopierError: InboxBucket
  recentEvents: { events: any[]; totalDocs: number }
}> {
  const contentFailed = await findBucket(payload, {
    'workflow.contentStatus': { equals: 'failed' },
  })
  const auditFailed = await findBucket(payload, {
    'workflow.auditStatus': { in: ['failed', 'needs_revision'] },
  })
  const shopierError = await findBucket(payload, {
    'sourceMeta.shopierSyncStatus': { equals: 'error' },
  })

  // Recent failure events — last 24h, capped at LIST_LIMIT
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let events: any[] = []
  let totalDocs = 0
  try {
    const res = await payload.find({
      collection: 'bot-events',
      where: {
        and: [
          { eventType: { in: FAILED_EVENT_TYPES } },
          { createdAt: { greater_than: since } },
        ],
      },
      sort: '-createdAt',
      limit: LIST_LIMIT,
      depth: 0,
    })
    events = res.docs
    totalDocs = res.totalDocs
  } catch {
    // bot-events query may fail if collection slug differs; non-fatal for inbox.
    events = []
    totalDocs = 0
  }

  return { contentFailed, auditFailed, shopierError, recentEvents: { events, totalDocs } }
}

/** TODAY — counts only (lists hidden by default since today's volume is usually small). */
export async function getInboxToday(payload: any): Promise<{
  createdToday: InboxBucket
  confirmedToday: InboxBucket
  contentReadyToday: InboxBucket
  activatedToday: InboxBucket
  soldoutToday: InboxBucket
  failedEventsToday: number
}> {
  const since = startOfTodayUTC().toISOString()

  const createdToday = await findBucket(payload, { createdAt: { greater_than: since } }, '-createdAt')
  const confirmedToday = await findBucket(payload, {
    and: [
      { 'workflow.confirmationStatus': { equals: 'confirmed' } },
      { 'workflow.productConfirmedAt': { greater_than: since } },
    ],
  })
  const contentReadyToday = await findBucket(payload, {
    and: [
      { 'workflow.contentStatus': { equals: 'ready' } },
      { 'content.lastContentGenerationAt': { greater_than: since } },
    ],
  })
  // activated/soldout don't have explicit timestamps everywhere — fall back to updatedAt + status
  const activatedToday = await findBucket(payload, {
    and: [
      { status: { equals: 'active' } },
      { updatedAt: { greater_than: since } },
    ],
  })
  const soldoutToday = await findBucket(payload, {
    and: [
      { status: { equals: 'soldout' } },
      { updatedAt: { greater_than: since } },
    ],
  })

  // Today's failure events count only (no list)
  let failedEventsToday = 0
  try {
    const res = await payload.find({
      collection: 'bot-events',
      where: {
        and: [
          { eventType: { in: FAILED_EVENT_TYPES } },
          { createdAt: { greater_than: since } },
        ],
      },
      limit: 1,
      depth: 0,
    })
    failedEventsToday = res.totalDocs ?? 0
  } catch {
    failedEventsToday = 0
  }

  return {
    createdToday,
    confirmedToday,
    contentReadyToday,
    activatedToday,
    soldoutToday,
    failedEventsToday,
  }
}

/** OVERVIEW — small mixed snapshot. */
export async function getInboxOverview(payload: any): Promise<{
  pending: { visualPreview: number; wizardIncomplete: number }
  publish: { publishReady: number; contentReadyNotActive: number }
  stock: { soldout: number; lowStock: number }
  failed: { contentFailed: number; auditFailed: number; shopierError: number; eventsLast24h: number }
}> {
  const [pending, publish, stock, failed] = await Promise.all([
    getInboxPending(payload),
    getInboxPublish(payload),
    getInboxStock(payload),
    getInboxFailed(payload),
  ])
  return {
    pending: {
      visualPreview: pending.visualPreview.totalDocs,
      wizardIncomplete: pending.wizardIncomplete.totalDocs,
    },
    publish: {
      publishReady: publish.publishReady.totalDocs,
      contentReadyNotActive: publish.contentReadyNotActive.totalDocs,
    },
    stock: {
      soldout: stock.soldout.totalDocs,
      lowStock: stock.lowStock.totalDocs,
    },
    failed: {
      contentFailed: failed.contentFailed.totalDocs,
      auditFailed: failed.auditFailed.totalDocs,
      shopierError: failed.shopierError.totalDocs,
      eventsLast24h: failed.recentEvents.totalDocs,
    },
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────

function bucketLines(bucket: InboxBucket, label: string, extraPicker?: (p: any) => string): string[] {
  if (bucket.totalDocs === 0) return [`✅ ${label}: yok`]
  const lines: string[] = [header(label, bucket.count, bucket.totalDocs)]
  for (const p of bucket.items) {
    lines.push(`  ${lineFor(p, extraPicker?.(p))}`)
  }
  if (bucket.hasMore) {
    lines.push(`  <i>+ ${bucket.totalDocs - bucket.count} daha</i>`)
  }
  return lines
}

export function formatInboxOverview(o: Awaited<ReturnType<typeof getInboxOverview>>): string {
  const tot =
    o.pending.visualPreview + o.pending.wizardIncomplete +
    o.publish.publishReady + o.publish.contentReadyNotActive +
    o.stock.soldout + o.stock.lowStock +
    o.failed.contentFailed + o.failed.auditFailed + o.failed.shopierError
  const lines: string[] = [
    `📋 <b>Operator Inbox</b>`,
    ``,
    `<b>👀 Bekleyen aksiyon</b>: ${o.pending.visualPreview + o.pending.wizardIncomplete}`,
    `  • Görsel onayı: ${o.pending.visualPreview}`,
    `  • Wizard/onay tamamlanmamış: ${o.pending.wizardIncomplete}`,
    ``,
    `<b>🚀 Yayına hazır</b>: ${o.publish.publishReady + o.publish.contentReadyNotActive}`,
    `  • publish_ready: ${o.publish.publishReady}`,
    `  • İçerik hazır, henüz aktif değil: ${o.publish.contentReadyNotActive}`,
    ``,
    `<b>📦 Stok</b>: ${o.stock.soldout + o.stock.lowStock}`,
    `  • Tükenmiş: ${o.stock.soldout}`,
    `  • Az kaldı: ${o.stock.lowStock}`,
    ``,
    `<b>❌ Hatalar</b>: ${o.failed.contentFailed + o.failed.auditFailed + o.failed.shopierError}`,
    `  • İçerik üretimi başarısız: ${o.failed.contentFailed}`,
    `  • Audit fail / revizyon: ${o.failed.auditFailed}`,
    `  • Shopier sync hatası: ${o.failed.shopierError}`,
    `  • Son 24sa hata olayları: ${o.failed.eventsLast24h}`,
    ``,
    `<i>Detay: /inbox pending · /inbox publish · /inbox stock · /inbox failed · /inbox today</i>`,
  ]
  if (tot === 0) {
    return `📋 <b>Operator Inbox</b>\n\n✅ Aksiyon gerektiren bir şey yok. Temiz.\n\n<i>/inbox today — bugünkü etkinliğe bak</i>`
  }
  return lines.join('\n')
}

export function formatInboxPending(d: Awaited<ReturnType<typeof getInboxPending>>): string {
  const lines = [
    `👀 <b>Bekleyen Aksiyon</b>`,
    ``,
    ...bucketLines(d.visualPreview, '🖼️ Görsel onayı bekliyor'),
    ``,
    ...bucketLines(d.wizardIncomplete, '✅ Wizard/onay tamamlanmamış'),
  ]
  return lines.join('\n')
}

export function formatInboxPublish(d: Awaited<ReturnType<typeof getInboxPublish>>): string {
  const lines = [
    `🚀 <b>Yayına Hazır</b>`,
    ``,
    ...bucketLines(d.publishReady, '🟢 publish_ready (operatör aktive etmeli)'),
    ``,
    ...bucketLines(d.contentReadyNotActive, '📝 İçerik hazır, henüz aktif değil'),
    ``,
    `<i>Aktivasyon için: /activate &lt;id&gt; (mevcut publish-approval politikası geçerli)</i>`,
  ]
  return lines.join('\n')
}

export function formatInboxStock(d: Awaited<ReturnType<typeof getInboxStock>>): string {
  const lines = [
    `📦 <b>Stok Aciliyeti</b>`,
    ``,
    ...bucketLines(d.soldout, '🔴 Tükenmiş'),
    ``,
    ...bucketLines(d.lowStock, '⚠️ Az kaldı (active + low_stock)'),
    ``,
    `<i>Aksiyon: /restock &lt;sn&gt; &lt;qty&gt; · /soldout &lt;sn&gt; · /restartsale &lt;sn&gt;</i>`,
  ]
  return lines.join('\n')
}

export function formatInboxFailed(d: Awaited<ReturnType<typeof getInboxFailed>>): string {
  const lines = [
    `❌ <b>Hata Kuyruğu</b>`,
    ``,
    ...bucketLines(d.contentFailed, '📝 İçerik üretimi başarısız'),
    ``,
    ...bucketLines(d.auditFailed, '🔍 Audit fail / revizyon gerekli', (p: any) => p.workflow?.auditStatus ?? ''),
    ``,
    ...bucketLines(d.shopierError, '🛒 Shopier sync hatası'),
    ``,
  ]
  if (d.recentEvents.totalDocs > 0) {
    lines.push(`<b>📡 Son 24sa hata olayları</b> — ${d.recentEvents.events.length}/${d.recentEvents.totalDocs}`)
    for (const e of d.recentEvents.events) {
      const when = new Date(e.createdAt).toLocaleString('tr-TR', {
        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
      })
      const pid = e.product ?? '—'
      lines.push(`  • ${when} · <code>${escapeHtml(String(e.eventType))}</code> · ürün=${pid}`)
    }
    if (d.recentEvents.totalDocs > d.recentEvents.events.length) {
      lines.push(`  <i>+ ${d.recentEvents.totalDocs - d.recentEvents.events.length} daha</i>`)
    }
  } else {
    lines.push(`<b>📡 Son 24sa hata olayları</b>: yok`)
  }
  lines.push(``)
  lines.push(`<i>Detay: /find &lt;sn-or-id&gt; veya /pipeline &lt;sn-or-id&gt;</i>`)
  return lines.join('\n')
}

export function formatInboxToday(d: Awaited<ReturnType<typeof getInboxToday>>): string {
  const lines = [
    `🗓️ <b>Bugünkü Operasyonel Görüntü</b> (UTC günü)`,
    ``,
    `📥 Oluşturulan: ${d.createdToday.totalDocs}`,
    `✅ Onaylanan: ${d.confirmedToday.totalDocs}`,
    `📝 İçerik hazır olan: ${d.contentReadyToday.totalDocs}`,
    `🟢 Aktive edilen: ${d.activatedToday.totalDocs}`,
    `🔴 Tükendi olarak işaretlenen: ${d.soldoutToday.totalDocs}`,
    `❌ Hata olayları: ${d.failedEventsToday}`,
    ``,
  ]
  // Show top 3 of created today + activated today (if any)
  if (d.createdToday.items.length > 0) {
    lines.push(`<b>Bugün Oluşturulan</b>`)
    for (const p of d.createdToday.items.slice(0, 3)) {
      lines.push(`  ${lineFor(p)}`)
    }
    if (d.createdToday.totalDocs > 3) lines.push(`  <i>+ ${d.createdToday.totalDocs - 3} daha</i>`)
    lines.push(``)
  }
  if (d.activatedToday.items.length > 0) {
    lines.push(`<b>Bugün Aktive Edilen</b>`)
    for (const p of d.activatedToday.items.slice(0, 3)) {
      lines.push(`  ${lineFor(p)}`)
    }
    if (d.activatedToday.totalDocs > 3) lines.push(`  <i>+ ${d.activatedToday.totalDocs - 3} daha</i>`)
  }
  return lines.join('\n')
}
