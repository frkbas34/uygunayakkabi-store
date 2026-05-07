/**
 * campaignDesk.ts — D-255 Campaign Review / Attribution QA Surface v1
 *
 * Provides:
 *   - getCampaignSnapshot()    — loads leads in window, aggregates by campaign
 *   - getCampaignDetail()      — single-campaign breakdown
 *   - formatCampaignSnapshot() — Telegram HTML output for /campaigns
 *   - formatCampaignDetail()   — Telegram HTML output for /campaign <name>
 *
 * QA signals:
 *   - unknown source values  (not in APPROVED_SOURCES — heuristic)
 *   - unknown medium values  (not in APPROVED_MEDIUMS — heuristic)
 *   - odd campaign names      (don't match D-254 CAMPAIGN_PATTERN — heuristic)
 *   - singleton campaigns     (count=1, flagged only when total campaigns >= 3)
 *
 * Read-only. No schema change. No mutation.
 */

import { APPROVED_SOURCES, APPROVED_MEDIUMS, CAMPAIGN_PATTERN } from './utmBuilder'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CampaignEntry {
  name: string
  leadCount: number
  wonCount: number
  /** Distinct utm_source values seen in this campaign. */
  sources: string[]
  /** Distinct utm_medium values seen in this campaign. */
  mediums: string[]
}

export interface CampaignQA {
  /** utm_source values not in APPROVED_SOURCES (heuristic). */
  unknownSources: string[]
  /** utm_medium values not in APPROVED_MEDIUMS (heuristic). */
  unknownMediums: string[]
  /** Campaign names that don't match D-254 CAMPAIGN_PATTERN (heuristic). */
  oddCampaigns: string[]
  /**
   * Campaigns with exactly 1 lead. Only flagged when there are >= 3 distinct
   * campaigns so it doesn't noisily flag sparse-but-valid windows.
   */
  singletonCount: number
}

export interface CampaignSnapshot {
  windowLabel: string
  windowStartISO: string
  /** All campaigns seen in window, sorted by leadCount desc. */
  campaigns: CampaignEntry[]
  /** Top utm_source values across all UTM-tagged leads. */
  topSources: Array<{ value: string; count: number }>
  /** Top utm_medium values. */
  topMediums: Array<{ value: string; count: number }>
  /** Top referrer hostnames. */
  topReferrers: Array<{ value: string; count: number }>
  /** Leads with at least one UTM/referrer field set. */
  coveredLeads: number
  /** All leads loaded in window. */
  totalLeads: number
  qa: CampaignQA
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function startOfTodayUTC(): Date {
  const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d
}

function startOfPastDaysUTC(days: number): Date {
  const d = startOfTodayUTC(); d.setUTCDate(d.getUTCDate() - (days - 1)); return d
}

function countByField(leads: any[], field: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of leads) {
    const v = l[field]
    if (v && typeof v === 'string' && v.trim()) m.set(v, (m.get(v) ?? 0) + 1)
  }
  return m
}

function topN(counts: Map<string, number>, n: number): Array<{ value: string; count: number }> {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Build a campaign-level attribution snapshot for a time window.
 * Default: today (UTC day boundary). Pass period:'week' for trailing 7 days.
 */
export async function getCampaignSnapshot(
  payload: any,
  opts: { period?: 'today' | 'week' } = {},
): Promise<CampaignSnapshot> {
  const period = opts.period ?? 'today'
  const start = period === 'week' ? startOfPastDaysUTC(7) : startOfTodayUTC()
  const sinceISO = start.toISOString()
  const windowLabel = period === 'week' ? 'son 7 gün' : 'bugün'

  const res = await payload.find({
    collection: 'customer-inquiries',
    where: { createdAt: { greater_than: sinceISO } },
    limit: 1000,
    depth: 0,
  })
  const leads: any[] = res.docs

  // ── Per-campaign aggregation ─────────────────────────────────────────────
  const campaignMap = new Map<string, {
    leadCount: number; wonCount: number
    sources: Set<string>; mediums: Set<string>
  }>()

  let coveredLeads = 0
  const sourceAll   = new Map<string, number>()
  const mediumAll   = new Map<string, number>()
  const referrerAll = new Map<string, number>()

  for (const l of leads) {
    const hasCoverage = !!(l.utmSource || l.utmMedium || l.utmCampaign || l.referrer)
    if (hasCoverage) coveredLeads++

    // Global top-N tallies
    if (l.utmSource) sourceAll.set(l.utmSource,   (sourceAll.get(l.utmSource)   ?? 0) + 1)
    if (l.utmMedium) mediumAll.set(l.utmMedium,   (mediumAll.get(l.utmMedium)   ?? 0) + 1)
    if (l.referrer)  referrerAll.set(l.referrer,   (referrerAll.get(l.referrer)  ?? 0) + 1)

    // Campaign bucket — only for leads that have a campaign value
    if (l.utmCampaign) {
      let bucket = campaignMap.get(l.utmCampaign)
      if (!bucket) {
        bucket = { leadCount: 0, wonCount: 0, sources: new Set(), mediums: new Set() }
        campaignMap.set(l.utmCampaign, bucket)
      }
      bucket.leadCount++
      if (l.status === 'closed_won' || l.status === 'completed') bucket.wonCount++
      if (l.utmSource) bucket.sources.add(l.utmSource)
      if (l.utmMedium) bucket.mediums.add(l.utmMedium)
    }
  }

  const campaigns: CampaignEntry[] = Array.from(campaignMap.entries())
    .map(([name, b]) => ({
      name,
      leadCount: b.leadCount,
      wonCount: b.wonCount,
      sources: [...b.sources].sort(),
      mediums: [...b.mediums].sort(),
    }))
    .sort((a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name))

  // ── QA signals (all heuristic) ───────────────────────────────────────────
  const unknownSourcesSet = new Set<string>()
  const unknownMediumsSet = new Set<string>()
  const oddCampaignsSet   = new Set<string>()

  for (const l of leads) {
    if (l.utmSource && !APPROVED_SOURCES.has(l.utmSource)) unknownSourcesSet.add(l.utmSource)
    if (l.utmMedium && !APPROVED_MEDIUMS.has(l.utmMedium)) unknownMediumsSet.add(l.utmMedium)
    if (l.utmCampaign && !CAMPAIGN_PATTERN.test(l.utmCampaign)) oddCampaignsSet.add(l.utmCampaign)
  }

  const singletonCount = campaigns.length >= 3
    ? campaigns.filter(c => c.leadCount === 1).length
    : 0

  return {
    windowLabel,
    windowStartISO: sinceISO,
    campaigns,
    topSources:   topN(sourceAll, 5),
    topMediums:   topN(mediumAll, 5),
    topReferrers: topN(referrerAll, 5),
    coveredLeads,
    totalLeads: leads.length,
    qa: {
      unknownSources: [...unknownSourcesSet].sort(),
      unknownMediums: [...unknownMediumsSet].sort(),
      oddCampaigns:   [...oddCampaignsSet].sort(),
      singletonCount,
    },
  }
}

/**
 * Get a single campaign's leads from a given window for /campaign <name>.
 * Returns null when no leads with that campaign name exist in window.
 */
export async function getCampaignDetail(
  payload: any,
  campaignName: string,
  opts: { period?: 'today' | 'week' } = {},
): Promise<{ entry: CampaignEntry; windowLabel: string } | null> {
  const period = opts.period ?? 'today'
  const start = period === 'week' ? startOfPastDaysUTC(7) : startOfTodayUTC()
  const sinceISO = start.toISOString()
  const windowLabel = period === 'week' ? 'son 7 gün' : 'bugün'

  const res = await payload.find({
    collection: 'customer-inquiries',
    where: {
      and: [
        { createdAt: { greater_than: sinceISO } },
        { utmCampaign: { equals: campaignName } },
      ],
    },
    limit: 1000,
    depth: 0,
  })
  const leads: any[] = res.docs
  if (leads.length === 0) return null

  const sources  = new Set<string>()
  const mediums  = new Set<string>()
  let wonCount = 0

  for (const l of leads) {
    if (l.utmSource) sources.add(l.utmSource)
    if (l.utmMedium) mediums.add(l.utmMedium)
    if (l.status === 'closed_won' || l.status === 'completed') wonCount++
  }

  return {
    windowLabel,
    entry: {
      name: campaignName,
      leadCount: leads.length,
      wonCount,
      sources: [...sources].sort(),
      mediums: [...mediums].sort(),
    },
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCampaignSnapshot(d: CampaignSnapshot): string {
  const header = `📣 <b>Kampanya Özeti</b> (${d.windowLabel})`

  // Empty state — no leads in window at all
  if (d.totalLeads === 0) {
    return (
      header + '\n\n' +
      `Bu pencerede hiç lead yok.\n\n` +
      `<i>/leads · /funnel · /utm yardımı için /utm yazın</i>`
    )
  }

  // Leads exist but none have UTM coverage
  if (d.coveredLeads === 0) {
    return (
      header + '\n\n' +
      `${d.totalLeads} lead var ama hiçbirinde UTM/referrer verisi yok.\n` +
      `Kayıtlı kampanya verisi: sıfır.\n\n` +
      `Kampanya verisi toplamak için /utm komutuyla taglenmiş bağlantılar kullanın.\n\n` +
      `<i>/utm · /funnel · /leads</i>`
    )
  }

  const lines: string[] = [header, ``]

  // Coverage summary
  const uncovered = d.totalLeads - d.coveredLeads
  lines.push(
    `📊 ${d.coveredLeads}/${d.totalLeads} lead UTM/referrer ile kayıtlı` +
    (uncovered > 0 ? ` · ${uncovered} direkt/belirsiz` : ''),
  )
  lines.push(``)

  // Campaigns
  if (d.campaigns.length > 0) {
    lines.push(`<b>Kampanyalar</b>`)
    for (const c of d.campaigns) {
      const won = c.wonCount > 0 ? ` · ✅ ${c.wonCount} kazanıldı` : ''
      lines.push(`  • <code>${escapeHtml(c.name)}</code> — ${c.leadCount} lead${won}`)
    }
    lines.push(``)
  }

  // Top signals (compact inline format)
  if (d.topSources.length > 0) {
    lines.push(`UTM Kaynak:  ` + d.topSources.map(e => `${escapeHtml(e.value)} (${e.count})`).join(', '))
  }
  if (d.topMediums.length > 0) {
    lines.push(`UTM Medium:  ` + d.topMediums.map(e => `${escapeHtml(e.value)} (${e.count})`).join(', '))
  }
  if (d.topReferrers.length > 0) {
    lines.push(`Referrer:    ` + d.topReferrers.map(e => `${escapeHtml(e.value)} (${e.count})`).join(', '))
  }

  // QA section — only render if there's anything to say
  const qa = d.qa
  const hasQaIssues = qa.unknownSources.length > 0 || qa.unknownMediums.length > 0 || qa.oddCampaigns.length > 0
  const hasQaOk = qa.unknownSources.length === 0 && qa.unknownMediums.length === 0
  if (hasQaIssues || qa.singletonCount > 0 || hasQaOk) {
    lines.push(``, `<b>⚠️ QA</b> <i>(heuristik)</i>`)
    if (qa.unknownSources.length > 0)
      lines.push(`  • Onaysız source: ${qa.unknownSources.map(s => `<code>${escapeHtml(s)}</code>`).join(', ')}`)
    if (qa.unknownMediums.length > 0)
      lines.push(`  • Onaysız medium: ${qa.unknownMediums.map(s => `<code>${escapeHtml(s)}</code>`).join(', ')}`)
    if (qa.oddCampaigns.length > 0)
      lines.push(`  • Format dışı kampanya: ${qa.oddCampaigns.map(s => `<code>${escapeHtml(s)}</code>`).join(', ')}`)
    if (qa.singletonCount > 0)
      lines.push(`  • ${qa.singletonCount} tekil kampanya (1 lead — typo riski olabilir)`)
    if (hasQaOk)
      lines.push(`  • Tüm source/medium onaylı listede ✓`)
  }

  lines.push(``, `<i>/campaign &lt;isim&gt; · /funnel · /leads</i>`)
  return lines.join('\n')
}

export function formatCampaignDetail(
  entry: CampaignEntry,
  windowLabel: string,
): string {
  const lines = [
    `📣 <b>Kampanya: <code>${escapeHtml(entry.name)}</code></b> (${windowLabel})`,
    ``,
    `  • Lead: ${entry.leadCount}`,
  ]
  if (entry.wonCount > 0) lines.push(`  • Kazanıldı: ✅ ${entry.wonCount}`)
  if (entry.sources.length > 0)
    lines.push(`  • Kaynak: ${entry.sources.map(s => escapeHtml(s)).join(', ')}`)
  if (entry.mediums.length > 0)
    lines.push(`  • Medium: ${entry.mediums.map(s => escapeHtml(s)).join(', ')}`)
  lines.push(``, `<i>/campaigns · /leads · /funnel</i>`)
  return lines.join('\n')
}
