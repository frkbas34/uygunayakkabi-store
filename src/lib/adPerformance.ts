/**
 * adPerformance.ts - D-383 read-only manual ad performance summary.
 *
 * Aggregates existing Payload CustomerInquiries + Orders data by UTM source,
 * medium, and campaign. It never calls ad platforms, never creates campaigns,
 * never tracks pixels, and never spends. It is an operator visibility layer
 * for manual campaigns created outside the app.
 */

export type AdPerformancePeriod = 'today' | 'week' | 'month'

export interface AdPerformanceRow {
  source: string
  medium: string
  campaign: string
  leads: number
  openLeads: number
  staleOpenLeads: number
  wonLeads: number
  lostLeads: number
  spamLeads: number
  orders: number
  revenue: number
  conversionRate: number
  averageOrderValue: number
}

export interface AdPerformanceSnapshot {
  period: AdPerformancePeriod
  windowLabel: string
  windowStartISO: string
  staleDays: number
  rows: AdPerformanceRow[]
  totals: AdPerformanceRow
  untaggedLeads: number
  directOrders: { count: number; revenue: number }
  guardrails: string[]
}

function emptyRow(source: string, medium: string, campaign: string): AdPerformanceRow {
  return {
    source,
    medium,
    campaign,
    leads: 0,
    openLeads: 0,
    staleOpenLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    spamLeads: 0,
    orders: 0,
    revenue: 0,
    conversionRate: 0,
    averageOrderValue: 0,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function dimension(value: unknown, fallback: string): string {
  const clean = text(value).toLowerCase()
  return clean || fallback
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
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

function periodStart(period: AdPerformancePeriod): Date {
  if (period === 'today') return startOfTodayUTC()
  if (period === 'month') return startOfPastDaysUTC(30)
  return startOfPastDaysUTC(7)
}

function periodLabel(period: AdPerformancePeriod): string {
  if (period === 'today') return 'today'
  if (period === 'month') return 'last 30 days'
  return 'last 7 days'
}

function keyFor(source: string, medium: string, campaign: string): string {
  return `${source}\u0000${medium}\u0000${campaign}`
}

function hasUtmSignal(lead: Record<string, unknown>): boolean {
  return !!(text(lead.utmSource) || text(lead.utmMedium) || text(lead.utmCampaign))
}

function rowIdentity(lead: Record<string, unknown>): { source: string; medium: string; campaign: string } {
  return {
    source: dimension(lead.utmSource, 'unknown_source'),
    medium: dimension(lead.utmMedium, 'unknown_medium'),
    campaign: dimension(lead.utmCampaign, 'uncampaigned'),
  }
}

function relationId(value: unknown): number | string | null {
  if (!value) return null
  if (typeof value === 'object') {
    const id = (value as Record<string, unknown>).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return typeof value === 'number' || typeof value === 'string' ? value : null
}

function isWon(status: string): boolean {
  return status === 'closed_won' || status === 'completed'
}

function isOpen(status: string): boolean {
  return status === 'new' || status === 'contacted' || status === 'follow_up'
}

function ageDate(lead: Record<string, unknown>): Date | null {
  const raw = text(lead.lastContactedAt) || text(lead.updatedAt) || text(lead.createdAt)
  if (!raw) return null
  const d = new Date(raw)
  return Number.isFinite(d.getTime()) ? d : null
}

function finalizeRow(row: AdPerformanceRow): AdPerformanceRow {
  const conversionRate = row.leads > 0 ? row.orders / row.leads : 0
  const averageOrderValue = row.orders > 0 ? row.revenue / row.orders : 0
  return { ...row, conversionRate, averageOrderValue }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtMoney(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function fmtRate(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function parseAdPerformancePeriod(input: string | null | undefined): AdPerformancePeriod {
  const value = text(input).toLowerCase()
  if (value === 'today' || value === 'bugun' || value === 'bugün') return 'today'
  if (value === 'month' || value === '30d' || value === '30' || value === 'ay') return 'month'
  return 'week'
}

export async function getAdPerformanceSnapshot(
  payload: any,
  options: { period?: AdPerformancePeriod; staleDays?: number } = {},
): Promise<AdPerformanceSnapshot> {
  const period = options.period ?? 'week'
  const staleDays = Math.max(1, Math.floor(options.staleDays ?? 3))
  const start = periodStart(period)
  const sinceISO = start.toISOString()
  const staleCutoff = new Date()
  staleCutoff.setUTCDate(staleCutoff.getUTCDate() - staleDays)

  const [leadsRes, ordersRes] = await Promise.all([
    payload.find({
      collection: 'customer-inquiries',
      where: { createdAt: { greater_than: sinceISO } },
      limit: 1000,
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { createdAt: { greater_than: sinceISO } },
      limit: 1000,
      depth: 0,
    }),
  ])

  const leads = (leadsRes.docs ?? []) as Array<Record<string, unknown>>
  const orders = (ordersRes.docs ?? []) as Array<Record<string, unknown>>
  const rows = new Map<string, AdPerformanceRow>()
  const leadIdToKey = new Map<string, string>()
  let untaggedLeads = 0

  for (const lead of leads) {
    const leadId = relationId(lead.id)
    if (!hasUtmSignal(lead)) {
      untaggedLeads += 1
      continue
    }

    const id = rowIdentity(lead)
    const key = keyFor(id.source, id.medium, id.campaign)
    const row = rows.get(key) ?? emptyRow(id.source, id.medium, id.campaign)
    rows.set(key, row)
    if (leadId !== null) leadIdToKey.set(String(leadId), key)

    const status = dimension(lead.status, 'new')
    row.leads += 1
    if (isOpen(status)) {
      row.openLeads += 1
      const agedFrom = ageDate(lead)
      if (agedFrom && agedFrom.getTime() < staleCutoff.getTime()) row.staleOpenLeads += 1
    } else if (isWon(status)) {
      row.wonLeads += 1
    } else if (status === 'closed_lost') {
      row.lostLeads += 1
    } else if (status === 'spam') {
      row.spamLeads += 1
    }
  }

  let directCount = 0
  let directRevenue = 0
  for (const order of orders) {
    const linkedLeadId = relationId(order.relatedInquiry ?? order.relatedInquiryId)
    const price = toNumber(order.totalPrice)
    const key = linkedLeadId === null ? null : leadIdToKey.get(String(linkedLeadId))

    if (!key) {
      directCount += 1
      directRevenue += price
      continue
    }

    const row = rows.get(key)
    if (!row) {
      directCount += 1
      directRevenue += price
      continue
    }
    row.orders += 1
    row.revenue += price
  }

  const finalizedRows = Array.from(rows.values())
    .map(finalizeRow)
    .sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue
      if (b.orders !== a.orders) return b.orders - a.orders
      if (b.leads !== a.leads) return b.leads - a.leads
      return `${a.source}/${a.medium}/${a.campaign}`.localeCompare(`${b.source}/${b.medium}/${b.campaign}`)
    })

  const totals = finalizedRows.reduce((acc, row) => {
    acc.leads += row.leads
    acc.openLeads += row.openLeads
    acc.staleOpenLeads += row.staleOpenLeads
    acc.wonLeads += row.wonLeads
    acc.lostLeads += row.lostLeads
    acc.spamLeads += row.spamLeads
    acc.orders += row.orders
    acc.revenue += row.revenue
    return acc
  }, emptyRow('all', 'all', 'all_campaigns'))

  return {
    period,
    windowLabel: periodLabel(period),
    windowStartISO: sinceISO,
    staleDays,
    rows: finalizedRows,
    totals: finalizeRow(totals),
    untaggedLeads,
    directOrders: { count: directCount, revenue: directRevenue },
    guardrails: [
      'Read-only: uses existing Payload leads, UTM fields, and related orders only.',
      'No Pixel, CAPI, Ads API, campaign creation, external post, provider call, or ad spend.',
      'Revenue is attributed only when an order is linked to a tagged lead in the selected window.',
    ],
  }
}

export function formatAdPerformanceSnapshot(snapshot: AdPerformanceSnapshot): string {
  const lines: string[] = [
    `<b>Manual Ad Performance</b> (${escapeHtml(snapshot.windowLabel)})`,
    '',
  ]

  if (snapshot.rows.length === 0) {
    lines.push(
      'No tagged UTM leads in this window.',
      '',
      `Untagged leads: ${snapshot.untaggedLeads}`,
      `Direct/unattributed orders: ${snapshot.directOrders.count}` +
        (snapshot.directOrders.revenue > 0 ? ` (${fmtMoney(snapshot.directOrders.revenue)} TL)` : ''),
      '',
      '<i>Use /adpack or /utm before manual ads so leads can be attributed.</i>',
    )
  } else {
    const t = snapshot.totals
    lines.push(
      `<b>Total tagged traffic</b>`,
      `Leads: ${t.leads} | Open: ${t.openLeads} | Stale: ${t.staleOpenLeads}`,
      `Orders: ${t.orders} | Revenue: ${fmtMoney(t.revenue)} TL | CVR: ${fmtRate(t.conversionRate)}`,
      '',
      '<b>Campaign rows</b>',
    )

    for (const row of snapshot.rows.slice(0, 8)) {
      lines.push(
        `<b>${escapeHtml(row.source)} / ${escapeHtml(row.medium)} / ${escapeHtml(row.campaign)}</b>`,
        `  Leads: ${row.leads} | Open: ${row.openLeads} | Stale: ${row.staleOpenLeads}`,
        `  Won/Lost/Spam: ${row.wonLeads}/${row.lostLeads}/${row.spamLeads}`,
        `  Orders: ${row.orders} | Revenue: ${fmtMoney(row.revenue)} TL | CVR: ${fmtRate(row.conversionRate)}`,
      )
    }

    if (snapshot.rows.length > 8) {
      lines.push(`<i>${snapshot.rows.length - 8} more rows hidden.</i>`)
    }

    if (snapshot.untaggedLeads > 0 || snapshot.directOrders.count > 0) {
      lines.push(
        '',
        '<b>Unattributed activity</b>',
        `Untagged leads: ${snapshot.untaggedLeads}`,
        `Direct/unattributed orders: ${snapshot.directOrders.count}` +
          (snapshot.directOrders.revenue > 0 ? ` (${fmtMoney(snapshot.directOrders.revenue)} TL)` : ''),
      )
    }
  }

  lines.push('', '<b>Guardrails</b>')
  for (const guardrail of snapshot.guardrails) lines.push(`- ${escapeHtml(guardrail)}`)
  lines.push('', '<i>/adreport week | /adreport month | /funnel week | /adpack SN0001 campaign_name</i>')

  return lines.join('\n')
}
