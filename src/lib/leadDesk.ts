/**
 * leadDesk.ts — D-241 Lead Desk / Customer Inquiry Pipeline v1
 *
 * Telegram-first operator surface for the existing `customer-inquiries`
 * collection. No new collection — extends the schema with richer status
 * options + a few timestamps. Status writes converge on applyLeadStatus
 * so /contacted /followup /won /lost /spam, the inline buttons, and any
 * future button/automation paths are identical and idempotent.
 *
 * Status pipeline:
 *   new        — fresh inquiry from /api/inquiries
 *   contacted  — operator has reached out (sets lastContactedAt)
 *   follow_up  — needs another touchpoint (sets lastContactedAt)
 *   closed_won — converted (sets handledAt)
 *   closed_lost — operator gave up / customer declined (sets handledAt)
 *   spam       — junk record, kept for audit (sets handledAt)
 *
 * Legacy `completed` rows (pre-D-241) are surfaced as 🏁 Tamamlandı
 * and treated as equivalent to closed_won — operator can re-classify
 * with /won or /lost if needed.
 *
 * No new collection / no new bot. All audit lives in `bot-events` with
 * eventType='lead.status_changed' (product field stays null since the
 * subject is the lead, not a product).
 */

const OPEN_STATUSES = ['new', 'contacted', 'follow_up'] as const
const CLOSED_STATUSES = ['closed_won', 'closed_lost', 'spam', 'completed'] as const
const LIST_LIMIT = 10

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'follow_up'
  | 'closed_won'
  | 'closed_lost'
  | 'spam'
  | 'completed' // legacy

export type LeadAction =
  | 'contacted'
  | 'followup'
  | 'won'
  | 'lost'
  | 'spam'

const ACTION_TO_STATUS: Record<LeadAction, LeadStatus> = {
  contacted: 'contacted',
  followup: 'follow_up',
  won: 'closed_won',
  lost: 'closed_lost',
  spam: 'spam',
}

// ── Listing ──────────────────────────────────────────────────────────────────

export interface LeadEntry {
  id: number
  name: string
  phone: string
  status: LeadStatus
  message?: string | null
  size?: string | null
  source?: string | null
  product?: { id: number; title?: string | null; stockNumber?: string | null } | null
  lastContactedAt?: string | null
  handledAt?: string | null
  createdAt: string
  updatedAt: string
}

function normalizeLead(doc: any): LeadEntry {
  const product = (() => {
    if (!doc.product) return null
    if (typeof doc.product === 'object') {
      return {
        id: doc.product.id as number,
        title: (doc.product.title as string) ?? null,
        stockNumber: (doc.product.stockNumber as string) ?? null,
      }
    }
    return { id: doc.product as number, title: null, stockNumber: null }
  })()
  return {
    id: doc.id as number,
    name: String(doc.name ?? ''),
    phone: String(doc.phone ?? ''),
    status: (doc.status as LeadStatus) ?? 'new',
    message: doc.message ?? null,
    size: doc.size ?? null,
    source: doc.source ?? null,
    product,
    lastContactedAt: doc.lastContactedAt ?? null,
    handledAt: doc.handledAt ?? null,
    createdAt: String(doc.createdAt),
    updatedAt: String(doc.updatedAt),
  }
}

/**
 * Open leads = anything in OPEN_STATUSES. Sorted: new first (by createdAt
 * desc), then follow_up (by lastContactedAt asc — oldest follow-ups first),
 * then contacted (by lastContactedAt asc).
 */
export async function getOpenLeads(
  payload: any,
): Promise<{ items: LeadEntry[]; totalOpen: number; counts: Record<LeadStatus, number> }> {
  const res = await payload.find({
    collection: 'customer-inquiries',
    where: { status: { in: [...OPEN_STATUSES] } },
    sort: '-createdAt',
    limit: 100,
    depth: 1,
  })
  const all = (res.docs as any[]).map(normalizeLead)
  const counts: Record<LeadStatus, number> = {
    new: 0, contacted: 0, follow_up: 0,
    closed_won: 0, closed_lost: 0, spam: 0, completed: 0,
  }
  for (const l of all) counts[l.status] = (counts[l.status] ?? 0) + 1
  // Priority sort: new (newest first) → follow_up (oldest contact first) → contacted (oldest contact first)
  const score = (l: LeadEntry): number => {
    if (l.status === 'new') return 0
    if (l.status === 'follow_up') return 1
    return 2
  }
  const sorted = [...all].sort((a, b) => {
    const sa = score(a)
    const sb = score(b)
    if (sa !== sb) return sa - sb
    if (a.status === 'new') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    // follow_up / contacted: oldest contact first
    const at = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : new Date(a.createdAt).getTime()
    const bt = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : new Date(b.createdAt).getTime()
    return at - bt
  })
  return {
    items: sorted.slice(0, LIST_LIMIT),
    totalOpen: all.length,
    counts,
  }
}

export async function getTodayLeads(
  payload: any,
): Promise<{
  createdToday: LeadEntry[]
  totalCreatedToday: number
  contactedToday: number
  wonToday: number
  lostToday: number
  spamToday: number
}> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const sinceISO = todayStart.toISOString()

  const createdRes = await payload.find({
    collection: 'customer-inquiries',
    where: { createdAt: { greater_than: sinceISO } },
    sort: '-createdAt',
    limit: LIST_LIMIT,
    depth: 1,
  })
  const createdToday = (createdRes.docs as any[]).map(normalizeLead)
  const totalCreatedToday = createdRes.totalDocs as number

  // Counts via separate small queries — limit:1 + totalDocs is the cheap pattern
  const countWhere = (status: string) =>
    payload.find({
      collection: 'customer-inquiries',
      where: {
        and: [
          { status: { equals: status } },
          { updatedAt: { greater_than: sinceISO } },
        ],
      },
      limit: 1,
      depth: 0,
    })

  const [c, w, l, s] = await Promise.all([
    countWhere('contacted'),
    countWhere('closed_won'),
    countWhere('closed_lost'),
    countWhere('spam'),
  ])

  return {
    createdToday,
    totalCreatedToday,
    contactedToday: (c.totalDocs as number) ?? 0,
    wonToday: (w.totalDocs as number) ?? 0,
    lostToday: (l.totalDocs as number) ?? 0,
    spamToday: (s.totalDocs as number) ?? 0,
  }
}

export async function getLeadById(payload: any, id: number | string): Promise<LeadEntry | null> {
  try {
    const doc = await payload.findByID({ collection: 'customer-inquiries', id, depth: 1 })
    if (!doc) return null
    return normalizeLead(doc)
  } catch {
    return null
  }
}

// ── Status writes — single source of truth ───────────────────────────────────

export interface LeadStatusResult {
  ok: boolean
  idempotent: boolean
  leadId: number | string
  fromStatus?: LeadStatus
  toStatus?: LeadStatus
  message: string
  summary: string
}

/**
 * Apply a status change. Idempotent — if the lead is already in the target
 * status, returns ok+idempotent without writing. Stamps lastContactedAt on
 * contacted/follow_up; stamps handledAt on closed_won, closed_lost, spam.
 * Emits a `lead.status_changed` bot-event for audit trail.
 *
 * Rules around closed → open reopens:
 *   - We don't block reopens. Operator may want to revisit a closed lead.
 *   - On reopen we clear handledAt to keep the timeline truthful.
 */
export async function applyLeadStatus(
  payload: any,
  leadId: number | string,
  action: LeadAction,
  source: 'telegram_command' | 'telegram_button' = 'telegram_command',
): Promise<LeadStatusResult> {
  let lead: any
  try {
    lead = await payload.findByID({ collection: 'customer-inquiries', id: leadId, depth: 0 })
  } catch {
    return {
      ok: false,
      idempotent: false,
      leadId,
      message: `❌ Lead bulunamadı (ID: ${leadId})`,
      summary: `<code>L${leadId}</code> · bulunamadı`,
    }
  }
  if (!lead) {
    return {
      ok: false,
      idempotent: false,
      leadId,
      message: `❌ Lead bulunamadı (ID: ${leadId})`,
      summary: `<code>L${leadId}</code> · bulunamadı`,
    }
  }
  const fromStatus = (lead.status as LeadStatus) ?? 'new'
  const toStatus = ACTION_TO_STATUS[action]

  // Idempotent — also treat 'completed' as equivalent to 'closed_won' for the
  // /won short-circuit so legacy rows don't churn.
  const isAlready =
    fromStatus === toStatus ||
    (toStatus === 'closed_won' && fromStatus === 'completed')
  if (isAlready) {
    return {
      ok: true,
      idempotent: true,
      leadId,
      fromStatus,
      toStatus,
      message:
        `🟰 <b>Lead #${leadId}</b> zaten <code>${toStatus}</code>.\n` +
        `<i>Değişiklik yapılmadı.</i>`,
      summary: `<code>L${leadId}</code> · zaten ${toStatus}`,
    }
  }

  const now = new Date().toISOString()
  const data: Record<string, unknown> = { status: toStatus }
  if (toStatus === 'contacted' || toStatus === 'follow_up') {
    data.lastContactedAt = now
  }
  if (toStatus === 'closed_won' || toStatus === 'closed_lost' || toStatus === 'spam') {
    data.handledAt = now
  }
  // Reopen path — clear handledAt if moving from closed → open
  if (
    (CLOSED_STATUSES as readonly string[]).includes(fromStatus) &&
    !(CLOSED_STATUSES as readonly string[]).includes(toStatus)
  ) {
    data.handledAt = null
  }

  try {
    await payload.update({
      collection: 'customer-inquiries',
      id: leadId,
      data,
    })
  } catch (uErr) {
    const msg = uErr instanceof Error ? uErr.message : String(uErr)
    // Detect the "enum value not in DB" case — see feedback_push_true_drift.md.
    // The Neon DDL one-liner lives in the CustomerInquiries.ts comment block.
    if (/invalid input value for enum|invalid_text_representation/i.test(msg)) {
      return {
        ok: false,
        idempotent: false,
        leadId,
        fromStatus,
        toStatus,
        message:
          `❌ <b>Lead #${leadId}</b> — yeni durum (<code>${toStatus}</code>) Neon enumunda yok.\n\n` +
          `<i>Operatör Neon konsolunda şu DDL'i çalıştırmalı:</i>\n` +
          `<code>ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS '${toStatus}';</code>\n\n` +
          `<i>Lead durumu değiştirilmedi.</i>`,
        summary: `<code>L${leadId}</code> · enum eksik (${toStatus})`,
      }
    }
    throw uErr
  }

  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'lead.status_changed',
        sourceBot: 'uygunops',
        status: 'processed',
        payload: {
          leadId,
          fromStatus,
          toStatus,
          action,
          source,
          changedAt: now,
        },
        notes: `Lead ${leadId}: ${fromStatus} → ${toStatus} via ${source}.`,
        processedAt: now,
      },
    })
  } catch {
    /* non-fatal — audit is best-effort */
  }

  const emoji = statusEmoji(toStatus)
  return {
    ok: true,
    idempotent: false,
    leadId,
    fromStatus,
    toStatus,
    message:
      `${emoji} <b>Lead #${leadId}</b> · <code>${fromStatus}</code> → <code>${toStatus}</code>\n` +
      (data.lastContactedAt ? `📞 İletişim: ${(data.lastContactedAt as string).split('T')[0]}\n` : '') +
      (data.handledAt ? `🏁 Kapanış: ${(data.handledAt as string).split('T')[0]}\n` : ''),
    summary: `<code>L${leadId}</code> · ${fromStatus} → ${toStatus}`,
  }
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function statusEmoji(s: LeadStatus | string | null | undefined): string {
  switch (s) {
    case 'new': return '🆕'
    case 'contacted': return '📞'
    case 'follow_up': return '🔁'
    case 'closed_won': return '🏆'
    case 'closed_lost': return '❌'
    case 'spam': return '🚮'
    case 'completed': return '🏁'
    default: return '❓'
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtPhone(p: string): string {
  return `<code>${escapeHtml(p)}</code>`
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

export function formatLeadLine(l: LeadEntry): string {
  const name = escapeHtml(l.name).slice(0, 28) || '—'
  const product = l.product
    ? ` · <code>${l.product.stockNumber ?? `ID:${l.product.id}`}</code>`
    : ''
  const size = l.size ? ` · ⌀${escapeHtml(l.size)}` : ''
  const lastT = l.lastContactedAt ? fmtDate(l.lastContactedAt) : fmtDate(l.createdAt)
  return `${statusEmoji(l.status)} <b>#${l.id}</b> · ${name} · ${fmtPhone(l.phone)}${product}${size}\n   <i>${lastT}</i>`
}

export function formatOpenLeadsList(d: Awaited<ReturnType<typeof getOpenLeads>>): string {
  if (d.totalOpen === 0) {
    return `📋 <b>Lead Desk</b>\n\n✅ Açık lead yok.\n\n<i>/leads today — bugünkü etkinlik · /lead &lt;id&gt; — detay</i>`
  }
  const counts = d.counts
  const summary = [
    counts.new > 0 ? `🆕 yeni: <b>${counts.new}</b>` : null,
    counts.follow_up > 0 ? `🔁 takip: <b>${counts.follow_up}</b>` : null,
    counts.contacted > 0 ? `📞 arandı: <b>${counts.contacted}</b>` : null,
  ].filter(Boolean).join(' · ')

  const lines = [
    `📋 <b>Lead Desk</b> — açık: ${d.totalOpen}`,
    summary,
    ``,
  ]
  for (const l of d.items) lines.push(formatLeadLine(l))
  if (d.totalOpen > d.items.length) {
    lines.push(``, `<i>+ ${d.totalOpen - d.items.length} daha (gizlendi) — /lead &lt;id&gt; ile aç</i>`)
  }
  lines.push(``, `<i>Aksiyon: /lead &lt;id&gt; · /contacted &lt;id&gt; · /followup &lt;id&gt; · /won &lt;id&gt; · /lost &lt;id&gt; · /spam &lt;id&gt;</i>`)
  return lines.join('\n')
}

export function formatLeadsToday(d: Awaited<ReturnType<typeof getTodayLeads>>): string {
  const lines = [
    `🗓️ <b>Bugünkü Lead Hareketi</b> (UTC günü)`,
    ``,
    `📥 Yeni gelen: ${d.totalCreatedToday}`,
    `📞 İletişim kuruldu: ${d.contactedToday}`,
    `🏆 Kazanıldı: ${d.wonToday}`,
    `❌ Kaybedildi: ${d.lostToday}`,
    `🚮 Spam: ${d.spamToday}`,
    ``,
  ]
  if (d.createdToday.length > 0) {
    lines.push(`<b>Bugün gelen ilk ${d.createdToday.length}</b>`)
    for (const l of d.createdToday) lines.push(formatLeadLine(l))
    if (d.totalCreatedToday > d.createdToday.length) {
      lines.push(`<i>+ ${d.totalCreatedToday - d.createdToday.length} daha</i>`)
    }
  } else {
    lines.push(`<i>Bugün yeni lead yok.</i>`)
  }
  return lines.join('\n')
}

export function formatLeadCard(l: LeadEntry): string {
  const lines = [
    `${statusEmoji(l.status)} <b>Lead #${l.id}</b> — <code>${l.status}</code>`,
    ``,
    `👤 ${escapeHtml(l.name)}`,
    `📱 ${fmtPhone(l.phone)}`,
  ]
  if (l.product) {
    const ptag = l.product.stockNumber ?? `ID:${l.product.id}`
    const ptitle = l.product.title ? ` — ${escapeHtml(l.product.title).slice(0, 60)}` : ''
    lines.push(`🛍️ <code>${ptag}</code>${ptitle}`)
  }
  if (l.size) lines.push(`📐 Beden: ${escapeHtml(l.size)}`)
  if (l.message) {
    const m = escapeHtml(l.message).slice(0, 280)
    lines.push(``, `💬 <i>${m}</i>`)
  }
  lines.push(``, `📅 Oluşturulma: ${fmtDate(l.createdAt)}`)
  if (l.lastContactedAt) lines.push(`📞 Son iletişim: ${fmtDate(l.lastContactedAt)}`)
  if (l.handledAt) lines.push(`🏁 Kapanış: ${fmtDate(l.handledAt)}`)
  if (l.source) lines.push(`🌐 Kaynak: ${escapeHtml(l.source)}`)
  return lines.join('\n')
}

export function leadButtonsKeyboard(leadId: number | string) {
  return [
    [
      { text: '📞 Arandı', callback_data: `ldact:${leadId}:contacted` },
      { text: '🔁 Takip', callback_data: `ldact:${leadId}:followup` },
    ],
    [
      { text: '🏆 Kazanıldı', callback_data: `ldact:${leadId}:won` },
      { text: '❌ Kaybedildi', callback_data: `ldact:${leadId}:lost` },
      { text: '🚮 Spam', callback_data: `ldact:${leadId}:spam` },
    ],
  ]
}

// ── D-243: Alerts + reminders + daily summary ───────────────────────────────

const STALE_DAYS_DEFAULT = 3

/**
 * D-243: Concise new-lead notification card. Shorter than formatLeadCard so
 * the operator can act fast without scrolling. Includes lead id + name +
 * phone + product (if linked) + size + message preview + source. Pairs with
 * leadButtonsKeyboard for in-place action.
 */
export function formatNewLeadAlert(l: LeadEntry): string {
  const lines = [
    `🚨 <b>YENİ LEAD</b> · #${l.id}`,
    ``,
    `👤 ${escapeHtml(l.name)}`,
    `📱 ${fmtPhone(l.phone)}`,
  ]
  if (l.product) {
    const ptag = l.product.stockNumber ?? `ID:${l.product.id}`
    const ptitle = l.product.title ? ` — ${escapeHtml(l.product.title).slice(0, 50)}` : ''
    lines.push(`🛍️ <code>${ptag}</code>${ptitle}`)
  }
  if (l.size) lines.push(`📐 Beden: ${escapeHtml(l.size)}`)
  if (l.message) {
    const m = escapeHtml(l.message).slice(0, 200)
    lines.push(``, `💬 <i>${m}</i>`)
  }
  if (l.source) lines.push(`🌐 ${escapeHtml(l.source)}`)
  lines.push(``, `<i>Detay: /lead ${l.id}</i>`)
  return lines.join('\n')
}

/**
 * D-243: Send the new-lead Telegram alert to the operator chat. Reuses the
 * same env (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) and fire-and-forget
 * pattern as src/lib/stockReaction.ts so dispatch routing stays consistent.
 *
 * Emits a `lead.new_alert_sent` bot-event for audit trail (and to give
 * future cron / dedup layers something to read against).
 *
 * Errors are swallowed — alert failure must never block lead creation.
 */
export async function sendNewLeadAlert(payload: any, leadId: number | string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[leadDesk D-243] TELEGRAM env not set — new-lead alert skipped')
    return
  }
  try {
    const lead = await getLeadById(payload, leadId)
    if (!lead) {
      console.warn(`[leadDesk D-243] new-lead alert: lead ${leadId} not found post-create`)
      return
    }
    const text = formatNewLeadAlert(lead)
    const kb = leadButtonsKeyboard(lead.id)
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
    // Audit-trail event (best-effort)
    try {
      await payload.create({
        collection: 'bot-events',
        data: {
          eventType: 'lead.new_alert_sent',
          sourceBot: 'uygunops',
          status: 'processed',
          payload: {
            leadId: lead.id,
            sentAt: new Date().toISOString(),
            chatId: String(chatId),
          },
          notes: `New lead alert sent for lead ${lead.id}.`,
          processedAt: new Date().toISOString(),
        },
      })
    } catch {
      /* non-fatal */
    }
  } catch (err) {
    console.error(
      `[leadDesk D-243] new-lead alert failed (non-blocking):`,
      err instanceof Error ? err.message : String(err),
    )
  }
}

/**
 * D-243: Stale-open leads. Reuses D-242's stale rule: status ∈
 * {contacted, follow_up} AND (lastContactedAt ?? createdAt) older than
 * staleDays. Also surfaces "never-touched" leads — status='new' AND
 * createdAt older than staleDays — which are the loudest signal that
 * nothing has been done.
 *
 * Returns priority-sorted (oldest first) so the operator sees the worst
 * offenders at the top.
 */
export async function getStaleLeads(
  payload: any,
  opts: { staleDays?: number; limit?: number } = {},
): Promise<{
  staleDays: number
  totalStale: number
  neverTouchedCount: number
  needsFollowupCount: number
  items: LeadEntry[]
}> {
  const staleDays = opts.staleDays ?? STALE_DAYS_DEFAULT
  const limit = opts.limit ?? 25
  const open = await getOpenLeads(payload)
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000

  type Aged = { lead: LeadEntry; ageMs: number; isNeverTouched: boolean }
  const aged: Aged[] = []
  for (const l of open.items) {
    const ts = l.lastContactedAt ?? l.createdAt
    const tms = new Date(ts).getTime()
    if (!Number.isFinite(tms) || tms >= cutoff) continue
    aged.push({
      lead: l,
      ageMs: Date.now() - tms,
      isNeverTouched: l.status === 'new',
    })
  }
  aged.sort((a, b) => b.ageMs - a.ageMs) // oldest first

  const neverTouchedCount = aged.filter((a) => a.isNeverTouched).length
  const needsFollowupCount = aged.length - neverTouchedCount
  return {
    staleDays,
    totalStale: aged.length,
    neverTouchedCount,
    needsFollowupCount,
    items: aged.slice(0, limit).map((a) => a.lead),
  }
}

/** D-243: header text for /leadreminders. Per-lead cards are sent
 *  separately by the route handler with leadButtonsKeyboard. */
export function formatLeadRemindersHeader(d: Awaited<ReturnType<typeof getStaleLeads>>): string {
  if (d.totalStale === 0) {
    return (
      `⏰ <b>Lead Hatırlatıcıları</b>\n\n` +
      `✅ Bayat lead yok (${d.staleDays} günden eski açık lead bulunamadı).\n\n` +
      `<i>Açık liste için /leads · özet için /leads summary</i>`
    )
  }
  const summary = [
    d.neverTouchedCount > 0 ? `🆕 hiç dokunulmamış: <b>${d.neverTouchedCount}</b>` : null,
    d.needsFollowupCount > 0 ? `🔁 takip gecikti: <b>${d.needsFollowupCount}</b>` : null,
  ].filter(Boolean).join(' · ')
  return [
    `⏰ <b>Lead Hatırlatıcıları</b> — bayat: ${d.totalStale} (eşik: ${d.staleDays} gün)`,
    summary,
    ``,
    `<i>Aşağıda en eski leadler kartlar halinde — düğmelerle aksiyon alabilirsiniz.</i>`,
    `<i>Tüm açık liste: /leads · bugünkü etkinlik: /leads summary</i>`,
  ].join('\n')
}

/** D-243: Daily lead summary — wraps getTodayLeads (D-241) and getOpenLeads
 *  + getStaleLeads for a single concise snapshot. */
export async function getDailyLeadSummary(payload: any): Promise<{
  newToday: number
  contactedToday: number
  wonToday: number
  lostToday: number
  spamToday: number
  totalOpen: number
  totalStale: number
  staleDays: number
}> {
  const [today, open, stale] = await Promise.all([
    getTodayLeads(payload),
    getOpenLeads(payload),
    getStaleLeads(payload),
  ])
  return {
    newToday: today.totalCreatedToday,
    contactedToday: today.contactedToday,
    wonToday: today.wonToday,
    lostToday: today.lostToday,
    spamToday: today.spamToday,
    totalOpen: open.totalOpen,
    totalStale: stale.totalStale,
    staleDays: stale.staleDays,
  }
}

export function formatDailyLeadSummary(d: Awaited<ReturnType<typeof getDailyLeadSummary>>): string {
  const lines = [
    `📊 <b>Lead Özeti</b> (UTC günü)`,
    ``,
    `<b>Bugün</b>`,
    `  📥 Yeni: ${d.newToday}`,
    `  📞 Arandı: ${d.contactedToday}`,
    `  🏆 Kazanıldı: ${d.wonToday}`,
    `  ❌ Kaybedildi: ${d.lostToday}`,
    `  🚮 Spam: ${d.spamToday}`,
    ``,
    `<b>Açık Toplam</b>: ${d.totalOpen}` + (d.totalStale > 0 ? ` · ⏰ Bayat (${d.staleDays}+gün): <b>${d.totalStale}</b>` : ''),
    ``,
    `<i>/leads · /leadreminders · /inbox leads</i>`,
  ]
  return lines.join('\n')
}
