/**
 * funnelDesk.ts — D-249 Conversion Funnel / Source Performance Snapshot v1
 *
 * Groups demand by SOURCE (where the lead came from) and shows how
 * much of it moved through each stage. Read-only composition over
 * the existing CustomerInquiries + Orders collections.
 *
 * Attribution rule (the only judgement call here):
 *   - The funnel groups by **lead source** (`customer-inquiries.source`).
 *   - We use the LEAD's source (not the order's source) even though D-250
 *     now correctly preserves lead.source on converted orders. This is
 *     intentional: funnel attribution is about WHEN the lead entered the
 *     pipeline (lead.createdAt), not when the order was recorded. A lead
 *     from last week converted today should appear in its original window's
 *     funnel row, not today's. The relatedInquiry FK is the join that makes
 *     this window-correct attribution possible.
 *   - Orders are counted under the LEAD's source (via relatedInquiry FK).
 *   - Orders WITHOUT a relatedInquiry (direct Shopier / admin / future
 *     website-checkout orders that didn't go through the lead desk) are
 *     reported as a separate "Doğrudan Sipariş (lead-siz)" group —
 *     no funnel stages because there's no lead to stage.
 *
 * No schema change. No new collection. No mutations. Reuses existing
 * fields end-to-end.
 */

export interface FunnelStageCounts {
  new: number
  contacted: number
  follow_up: number
  closed_won: number
  closed_lost: number
  spam: number
  /** Legacy 'completed' rolled into closed_won for funnel display. */
  total: number
}

export interface FunnelSourceRow {
  source: string
  stages: FunnelStageCounts
  /** Orders where related_inquiry_id IN leads-of-this-source AND order created in window. */
  ordersConverted: number
  /** Sum of totalPrice for those orders. Defensively coerced — pg returns numeric as string. */
  revenue: number
}

export interface FunnelSnapshot {
  /** Period label for the header, e.g. "bugün", "son 7 gün". */
  windowLabel: string
  /** ISO timestamp the window starts at. */
  windowStartISO: string
  /** Per-source rows with at least one lead in the window. */
  sources: FunnelSourceRow[]
  /** Aggregate over all sources (lead-attributed only). */
  totals: FunnelSourceRow
  /** Direct orders — created in window, NOT linked to any lead. */
  directOrders: { count: number; revenue: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emptyStages(): FunnelStageCounts {
  return { new: 0, contacted: 0, follow_up: 0, closed_won: 0, closed_lost: 0, spam: 0, total: 0 }
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function startOfTodayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function startOfPastDaysUTC(days: number): Date {
  const d = startOfTodayUTC()
  d.setUTCDate(d.getUTCDate() - (days - 1))
  return d
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Build the funnel snapshot for a time window. Default window is "today"
 * (UTC day boundary). Pass `period: 'week'` for the trailing 7 days.
 *
 * Implementation: two queries over real collections via payload.find —
 *   1. Leads created in window  (group by source, count by status)
 *   2. Orders created in window (link via related_inquiry_id back to those
 *      leads to attribute revenue/conversions; unlinked orders become the
 *      direct-orders bucket)
 *
 * In-memory aggregation keeps the implementation simple and avoids new SQL
 * paths. With typical operator volumes this is well under a Lambda's
 * latency budget.
 */
export async function getFunnelSnapshot(
  payload: any,
  opts: { period?: 'today' | 'week' } = {},
): Promise<FunnelSnapshot> {
  const period = opts.period ?? 'today'
  const start = period === 'week' ? startOfPastDaysUTC(7) : startOfTodayUTC()
  const sinceISO = start.toISOString()
  const windowLabel = period === 'week' ? 'son 7 gün' : 'bugün'

  // 1) Leads in window
  const leadsRes = await payload.find({
    collection: 'customer-inquiries',
    where: { createdAt: { greater_than: sinceISO } },
    limit: 1000,
    depth: 0,
  })
  const leads = leadsRes.docs as any[]
  // Map: source → { stages, leadIdSet }
  const bySource = new Map<string, { stages: FunnelStageCounts; leadIds: Set<number> }>()
  for (const l of leads) {
    const src = (l.source as string) || 'bilinmiyor'
    let bucket = bySource.get(src)
    if (!bucket) {
      bucket = { stages: emptyStages(), leadIds: new Set<number>() }
      bySource.set(src, bucket)
    }
    bucket.leadIds.add(l.id as number)
    bucket.stages.total += 1
    const status = (l.status as string) || 'new'
    // Roll legacy 'completed' into closed_won for funnel display
    const k = status === 'completed' ? 'closed_won' : status
    if (k === 'new' || k === 'contacted' || k === 'follow_up' ||
        k === 'closed_won' || k === 'closed_lost' || k === 'spam') {
      bucket.stages[k as keyof FunnelStageCounts] = (bucket.stages[k as keyof FunnelStageCounts] as number) + 1
    }
  }

  // 2) Orders in window
  const ordersRes = await payload.find({
    collection: 'orders',
    where: { createdAt: { greater_than: sinceISO } },
    limit: 1000,
    depth: 0,
  })
  const orders = ordersRes.docs as any[]
  // Build a leadId → source map (over leads in window only)
  const leadIdToSource = new Map<number, string>()
  for (const l of leads) {
    leadIdToSource.set(l.id as number, ((l.source as string) || 'bilinmiyor'))
  }

  // Per-source order/revenue counters (only attribute orders whose lead is in the window)
  const sourceOrders = new Map<string, { count: number; revenue: number }>()
  let directCount = 0
  let directRevenue = 0
  for (const o of orders) {
    const linkedLeadId = (() => {
      const r = o.relatedInquiry ?? o.relatedInquiryId
      if (!r) return null
      if (typeof r === 'object') return (r.id as number) ?? null
      return r as number
    })()
    const price = toNumber(o.totalPrice)
    if (linkedLeadId == null) {
      directCount += 1
      directRevenue += price
      continue
    }
    const src = leadIdToSource.get(linkedLeadId)
    if (!src) {
      // Lead exists but not in this window (e.g. lead created last week,
      // converted today). Treat as direct so the funnel-by-source numbers
      // stay truthful for the chosen window.
      directCount += 1
      directRevenue += price
      continue
    }
    let s = sourceOrders.get(src)
    if (!s) { s = { count: 0, revenue: 0 }; sourceOrders.set(src, s) }
    s.count += 1
    s.revenue += price
  }

  // Compose per-source rows. Include any source that has either leads OR
  // orders in window (a source might have orders today linked to a fresh
  // lead from today — both are in window).
  const sourceKeys = new Set<string>([...bySource.keys(), ...sourceOrders.keys()])
  const rows: FunnelSourceRow[] = Array.from(sourceKeys).map((src) => {
    const stages = bySource.get(src)?.stages ?? emptyStages()
    const ord = sourceOrders.get(src) ?? { count: 0, revenue: 0 }
    return {
      source: src,
      stages,
      ordersConverted: ord.count,
      revenue: ord.revenue,
    }
  })

  // Sort: most leads first, then most orders
  rows.sort((a, b) => {
    if (b.stages.total !== a.stages.total) return b.stages.total - a.stages.total
    if (b.ordersConverted !== a.ordersConverted) return b.ordersConverted - a.ordersConverted
    return a.source.localeCompare(b.source)
  })

  // Totals
  const totals: FunnelSourceRow = {
    source: 'TOPLAM',
    stages: emptyStages(),
    ordersConverted: 0,
    revenue: 0,
  }
  for (const r of rows) {
    for (const k of ['new', 'contacted', 'follow_up', 'closed_won', 'closed_lost', 'spam', 'total'] as const) {
      ;(totals.stages as any)[k] += (r.stages as any)[k]
    }
    totals.ordersConverted += r.ordersConverted
    totals.revenue += r.revenue
  }

  return {
    windowLabel,
    windowStartISO: sinceISO,
    sources: rows,
    totals,
    directOrders: { count: directCount, revenue: directRevenue },
  }
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtSourceLabel(src: string): string {
  // Map known source values to operator-friendly labels. Unknowns stay raw.
  const map: Record<string, string> = {
    website: 'Website',
    telegram: 'Telegram',
    instagram: 'Instagram',
    phone: 'Telefon',
    shopier: 'Shopier',
    manual_entry: 'Manuel',
    bilinmiyor: 'Bilinmeyen',
  }
  return map[src] ?? escapeHtml(src)
}

/**
 * Compose the per-source block. Lines that would render zero (e.g. "Spam: 0")
 * are omitted to keep the surface concise — operator only sees what
 * actually happened.
 */
function renderSourceBlock(r: FunnelSourceRow): string[] {
  const lines: string[] = [`<b>${fmtSourceLabel(r.source)}</b>`]
  const s = r.stages
  if (s.total > 0) lines.push(`  • Lead: ${s.total}`)
  if (s.contacted > 0) lines.push(`  • Arandı: ${s.contacted}`)
  if (s.follow_up > 0) lines.push(`  • Takip: ${s.follow_up}`)
  if (s.closed_won > 0) lines.push(`  • Kazanıldı: ${s.closed_won}`)
  if (s.closed_lost > 0) lines.push(`  • Kaybedildi: ${s.closed_lost}`)
  if (s.spam > 0) lines.push(`  • Spam: ${s.spam}`)
  if (r.ordersConverted > 0) lines.push(`  • Siparişe döndü: ${r.ordersConverted}`)
  if (r.revenue > 0) lines.push(`  • Ciro: ${r.revenue} ₺`)
  return lines
}

export function formatFunnelSnapshot(d: FunnelSnapshot): string {
  // Empty short-circuit
  const noActivity =
    d.sources.length === 0 &&
    d.directOrders.count === 0 &&
    d.totals.stages.total === 0 &&
    d.totals.ordersConverted === 0
  if (noActivity) {
    return (
      `📈 <b>Funnel Özeti</b> (${d.windowLabel})\n\n` +
      `✅ Bu pencerede lead/sipariş hareketi yok.\n\n` +
      `<i>/business · /leads summary · /sales today</i>`
    )
  }

  const lines: string[] = [`📈 <b>Funnel Özeti</b> (${d.windowLabel})`, ``]

  for (const r of d.sources) {
    lines.push(...renderSourceBlock(r))
    lines.push(``)
  }

  // Totals — always render when there's activity, even if only one source row
  lines.push(`<b>Toplam (lead-bazlı)</b>`)
  const t = d.totals.stages
  lines.push(`  • Lead: ${t.total}`)
  if (t.contacted > 0) lines.push(`  • Arandı: ${t.contacted}`)
  if (t.follow_up > 0) lines.push(`  • Takip: ${t.follow_up}`)
  if (t.closed_won > 0) lines.push(`  • Kazanıldı: ${t.closed_won}`)
  if (t.closed_lost > 0) lines.push(`  • Kaybedildi: ${t.closed_lost}`)
  if (t.spam > 0) lines.push(`  • Spam: ${t.spam}`)
  lines.push(`  • Sipariş: ${d.totals.ordersConverted}`)
  if (d.totals.revenue > 0) lines.push(`  • Ciro: ${d.totals.revenue} ₺`)

  // Direct orders (no lead) — only render when there are any
  if (d.directOrders.count > 0) {
    lines.push(``, `<b>Doğrudan Sipariş (lead-siz)</b>`)
    lines.push(`  • Sipariş: ${d.directOrders.count}`)
    if (d.directOrders.revenue > 0) lines.push(`  • Ciro: ${d.directOrders.revenue} ₺`)
    lines.push(``, `<i>Lead-siz siparişler bir lead'e bağlı olmadığı için kaynak kırılımına dahil değil.</i>`)
  }

  lines.push(``, `<i>/leads · /orders · /business · /sales today</i>`)
  return lines.join('\n')
}
