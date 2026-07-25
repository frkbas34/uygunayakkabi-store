import type { LeadEntry, LeadOperatorLinks, LeadStatus } from './leadDesk'
import { buildLeadOperatorLinks, escapeHtml, formatLeadLine } from './leadDesk'

export type LeadFollowupAction =
  | 'call_now'
  | 'follow_up_due'
  | 'check_contacted'
  | 'fresh_new'
  | 'monitor'

export interface LeadFollowupPlanItem {
  lead: LeadEntry
  action: LeadFollowupAction
  priority: number
  ageDays: number
  ageSource: 'createdAt' | 'lastContactedAt'
  reason: string
  suggestedCommand: string
  operatorLinks: LeadOperatorLinks
}

export interface LeadFollowupPlan {
  generatedAt: string
  staleDays: number
  totalOpen: number
  sampledOpen: number
  counts: Record<LeadFollowupAction, number>
  items: LeadFollowupPlanItem[]
  guardrails: string[]
}

const ACTION_LABELS: Record<LeadFollowupAction, string> = {
  call_now: 'Call now',
  follow_up_due: 'Follow-up due',
  check_contacted: 'Check contacted',
  fresh_new: 'Fresh new',
  monitor: 'Monitor',
}

function statusRank(status: LeadStatus): number {
  switch (status) {
    case 'new': return 0
    case 'follow_up': return 1
    case 'contacted': return 2
    default: return 3
  }
}

function safeTime(iso?: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

function ageDaysFrom(nowMs: number, thenMs: number | null): number {
  if (thenMs === null) return 0
  return Math.max(0, Math.floor((nowMs - thenMs) / (24 * 60 * 60 * 1000)))
}

function sourceLabel(lead: LeadEntry): string {
  return lead.utmCampaign || lead.utmSource || lead.source || 'unknown'
}

function classifyLead(
  lead: LeadEntry,
  nowMs: number,
  staleDays: number,
): Omit<LeadFollowupPlanItem, 'lead' | 'operatorLinks'> {
  const lastContactMs = safeTime(lead.lastContactedAt)
  const createdMs = safeTime(lead.createdAt)
  const ageSource = lastContactMs === null ? 'createdAt' : 'lastContactedAt'
  const ageDays = ageDaysFrom(nowMs, lastContactMs ?? createdMs)
  const source = sourceLabel(lead)

  if (lead.status === 'new' && ageDays >= staleDays) {
    return {
      action: 'call_now',
      priority: 100 + ageDays,
      ageDays,
      ageSource,
      reason: `Never touched for ${ageDays} day(s); source ${source}.`,
      suggestedCommand: `/contacted ${lead.id}`,
    }
  }

  if (lead.status === 'follow_up' && ageDays >= staleDays) {
    return {
      action: 'follow_up_due',
      priority: 80 + ageDays,
      ageDays,
      ageSource,
      reason: `Follow-up is overdue by ${ageDays} day(s); source ${source}.`,
      suggestedCommand: `/followup ${lead.id}`,
    }
  }

  if (lead.status === 'contacted' && ageDays >= staleDays) {
    return {
      action: 'check_contacted',
      priority: 60 + ageDays,
      ageDays,
      ageSource,
      reason: `Contacted lead has been quiet for ${ageDays} day(s); decide follow-up, won, or lost.`,
      suggestedCommand: `/followup ${lead.id}`,
    }
  }

  if (lead.status === 'new') {
    return {
      action: 'fresh_new',
      priority: 40 + ageDays,
      ageDays,
      ageSource,
      reason: `Fresh lead; call before it becomes stale. Source ${source}.`,
      suggestedCommand: `/contacted ${lead.id}`,
    }
  }

  return {
    action: 'monitor',
    priority: 10 + ageDays,
    ageDays,
    ageSource,
    reason: `Recent open lead; keep it visible.`,
    suggestedCommand: `/lead ${lead.id}`,
  }
}

export function buildLeadFollowupPlanFromLeads(
  leads: LeadEntry[],
  options: {
    totalOpen?: number
    staleDays?: number
    limit?: number
    now?: Date
  } = {},
): LeadFollowupPlan {
  const staleDays = Math.max(1, Math.floor(options.staleDays ?? 3))
  const limit = Math.max(1, Math.floor(options.limit ?? 8))
  const now = options.now ?? new Date()
  const nowMs = now.getTime()

  const items = leads.map((lead) => ({
    lead,
    ...classifyLead(lead, nowMs, staleDays),
    operatorLinks: buildLeadOperatorLinks(lead),
  }))

  items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const statusDelta = statusRank(a.lead.status) - statusRank(b.lead.status)
    if (statusDelta !== 0) return statusDelta
    return a.lead.id - b.lead.id
  })

  const counts: Record<LeadFollowupAction, number> = {
    call_now: 0,
    follow_up_due: 0,
    check_contacted: 0,
    fresh_new: 0,
    monitor: 0,
  }
  for (const item of items) counts[item.action] += 1

  return {
    generatedAt: now.toISOString(),
    staleDays,
    totalOpen: options.totalOpen ?? leads.length,
    sampledOpen: leads.length,
    counts,
    items: items.slice(0, limit),
    guardrails: [
      'Read-only: uses existing Payload leads only.',
      'No lead status writes.',
      'No customer messages are sent.',
      'No ad campaign, pixel, provider, Shopier, SupplierScout, or retired-channel action.',
    ],
  }
}

export async function getLeadFollowupPlan(
  payload: any,
  options: { staleDays?: number; limit?: number; now?: Date } = {},
): Promise<LeadFollowupPlan> {
  const { getOpenLeads } = await import('./leadDesk')
  const open = await getOpenLeads(payload)
  return buildLeadFollowupPlanFromLeads(open.items, {
    totalOpen: open.totalOpen,
    staleDays: options.staleDays,
    limit: options.limit,
    now: options.now,
  })
}

function compactGeneratedAt(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function formatActionLabel(action: LeadFollowupAction): string {
  return ACTION_LABELS[action]
}

export function formatLeadFollowupPlan(plan: LeadFollowupPlan): string {
  if (plan.totalOpen === 0) {
    return [
      '<b>Lead Follow-up Plan</b>',
      `Generated: <code>${compactGeneratedAt(plan.generatedAt)}</code>`,
      '',
      'No open leads right now.',
      '',
      '<i>Read-only. Nothing was changed.</i>',
    ].join('\n')
  }

  const lines = [
    '<b>Lead Follow-up Plan</b>',
    `Generated: <code>${compactGeneratedAt(plan.generatedAt)}</code>`,
    `Open leads: <b>${plan.totalOpen}</b>` +
      (plan.totalOpen > plan.sampledOpen ? ` - sampled: ${plan.sampledOpen}` : ''),
    `Stale threshold: ${plan.staleDays} day(s)`,
    '',
    '<b>Priority Counts</b>',
    `- Call now: ${plan.counts.call_now}`,
    `- Follow-up due: ${plan.counts.follow_up_due}`,
    `- Check contacted: ${plan.counts.check_contacted}`,
    `- Fresh new: ${plan.counts.fresh_new}`,
    '',
    '<b>Next Leads</b>',
  ]

  if (plan.items.length === 0) {
    lines.push('No open lead rows in the current sample.')
  } else {
    for (const item of plan.items) {
      lines.push(
        `${formatLeadLine(item.lead)}`,
        `   <b>${formatActionLabel(item.action)}</b> - ${escapeHtml(item.reason)}`,
        `   Suggested: <code>${escapeHtml(item.suggestedCommand)}</code>`,
      )
      const links = [
        `<a href="${escapeHtml(item.operatorLinks.leadAdminUrl)}">lead admin</a>`,
      ]
      if (item.operatorLinks.productAdminUrl) {
        links.push(`<a href="${escapeHtml(item.operatorLinks.productAdminUrl)}">product admin</a>`)
      }
      if (item.operatorLinks.productUrl) {
        links.push(`<a href="${escapeHtml(item.operatorLinks.productUrl)}">PDP</a>`)
      }
      lines.push(`   Links: ${links.join(' / ')}`)
    }
  }

  lines.push('', '<b>Guardrails</b>')
  for (const guardrail of plan.guardrails) {
    lines.push(`- ${escapeHtml(guardrail)}`)
  }
  lines.push('', '<i>Read-only plan. Use the suggested lead commands manually when ready.</i>')
  return lines.join('\n')
}
