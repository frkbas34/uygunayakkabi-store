/**
 * publishDesk.ts — D-237 Publish Desk / Approval Gate v1
 *
 * Telegram-first publish surface. Every operator publish action stays
 * explicit; nothing is auto-published. This module wraps the EXISTING
 * publishReadiness + activation logic into a queue+decision view that
 * fits the Telegram operator workflow.
 *
 * SEMANTICS (smallest correct):
 *
 *   approve  ≡  activate
 *     /approvepublish <sn-or-id> emits a `publish.approved` bot-event
 *     and then runs the same activation path as /activate. The added
 *     event is an audit-trail marker — it does not change product
 *     state. /activate alone is also a complete approval+activation
 *     gesture; the alias just makes the operator's intent explicit
 *     in the events log.
 *
 *   reject  =  recorded refusal, no state mutation
 *     /rejectpublish <sn-or-id> emits a `publish.rejected` bot-event.
 *     The product stays in publish_ready limbo. The publish desk hides
 *     items with a recent rejection (last 30 days) so they do not keep
 *     cluttering the queue. Operator can still /activate or
 *     /approvepublish later — that overrides the rejection because the
 *     newer affirmative event is what counts.
 *
 *   activate  =  the actual state transition
 *     The existing /activate command (route.ts) does the work. This
 *     module gives operators a faster path TO that command via the
 *     Publish Desk listing + buttons, plus an audit-trail wrapper.
 *
 * NO SCHEMA CHANGE. Decision state is journaled via bot-events; the
 * "current decision" is whichever publish.* event is most recent for
 * the product. Mirrors how stockState is derived from stock events.
 */

const REJECTION_WINDOW_DAYS = 30
const LIST_LIMIT = 10

// ── Listing ──────────────────────────────────────────────────────────────────

export interface PublishReadyEntry {
  product: any
  /** From evaluatePublishReadiness — true only when all 6 dimensions pass. */
  isFullyReady: boolean
  /** When the readiness signal landed (best-effort timestamp). */
  readyAt?: string
}

export async function getPublishReadyList(
  payload: any,
  opts: { todayOnly?: boolean } = {},
): Promise<{ items: PublishReadyEntry[]; totalCandidates: number; hasMore: boolean; rejectedSkipped: number }> {
  const { evaluatePublishReadiness } = await import('./publishReadiness')

  // Broad pre-filter — same net /inbox publish uses, with one extra constraint:
  // status != 'active' (already-active products aren't in the desk).
  const where: Record<string, unknown> = {
    and: [
      { status: { not_equals: 'active' } },
      {
        or: [
          { 'workflow.workflowStatus': { equals: 'publish_ready' } },
          { 'workflow.contentStatus': { equals: 'ready' } },
        ],
      },
    ],
  }

  // Today-only — products whose content went ready today OR were confirmed today.
  if (opts.todayOnly) {
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const sinceISO = todayStart.toISOString()
    ;(where.and as any[]).push({
      or: [
        { 'content.lastContentGenerationAt': { greater_than: sinceISO } },
        { 'workflow.productConfirmedAt': { greater_than: sinceISO } },
      ],
    })
  }

  // Pull a generous window of candidates so we can filter rejected without
  // missing eligible items. Sort newest-confirmed first.
  const candidatesRes = await payload.find({
    collection: 'products',
    where,
    sort: '-updatedAt',
    limit: 50,
    depth: 1,
  })

  // Pull recent rejection events to filter out.
  const rejectedSet = new Set<number>()
  try {
    const since = new Date(Date.now() - REJECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const rejRes = await payload.find({
      collection: 'bot-events',
      where: {
        and: [
          { eventType: { equals: 'publish.rejected' } },
          { createdAt: { greater_than: since } },
        ],
      },
      sort: '-createdAt',
      limit: 200,
      depth: 0,
    })
    // Pull most-recent decision per product. We have approval events too;
    // the LATEST publish.* event is what wins. Build a per-product map.
    const latestDecision = new Map<number, 'approved' | 'rejected'>()
    for (const e of rejRes.docs as any[]) {
      const pid = typeof e.product === 'object' ? e.product?.id : e.product
      if (typeof pid === 'number' && !latestDecision.has(pid)) {
        latestDecision.set(pid, 'rejected')
      }
    }
    // Also fetch recent approvals so an approval after a rejection un-hides.
    const approvedRes = await payload.find({
      collection: 'bot-events',
      where: {
        and: [
          { eventType: { equals: 'publish.approved' } },
          { createdAt: { greater_than: since } },
        ],
      },
      sort: '-createdAt',
      limit: 200,
      depth: 0,
    })
    // Take per-product latest from BOTH sets — sort by createdAt and pick first.
    const merged = [
      ...(rejRes.docs as any[]).map((e) => ({ ...e, decision: 'rejected' as const })),
      ...(approvedRes.docs as any[]).map((e) => ({ ...e, decision: 'approved' as const })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    latestDecision.clear()
    for (const e of merged) {
      const pid = typeof e.product === 'object' ? e.product?.id : e.product
      if (typeof pid === 'number' && !latestDecision.has(pid)) {
        latestDecision.set(pid, e.decision)
      }
    }
    for (const [pid, decision] of latestDecision) {
      if (decision === 'rejected') rejectedSet.add(pid)
    }
  } catch {
    // bot-events query failure is non-fatal — we just don't filter out.
  }

  const filtered: PublishReadyEntry[] = []
  let rejectedSkipped = 0
  for (const p of candidatesRes.docs as any[]) {
    if (rejectedSet.has(p.id as number)) {
      rejectedSkipped++
      continue
    }
    const r = evaluatePublishReadiness(p)
    if (r.level !== 'ready') continue // gate to fully-ready only
    filtered.push({
      product: p,
      isFullyReady: true,
      readyAt:
        (p.content as any)?.lastContentGenerationAt ??
        (p.workflow as any)?.productConfirmedAt ??
        p.updatedAt,
    })
  }

  const items = filtered.slice(0, LIST_LIMIT)
  return {
    items,
    totalCandidates: filtered.length,
    hasMore: filtered.length > items.length,
    rejectedSkipped,
  }
}

// ── Decision recording ───────────────────────────────────────────────────────

export interface PublishDecisionResult {
  ok: boolean
  decision: 'approved' | 'rejected'
  productId: number | string
  message: string
}

export async function recordPublishDecision(
  payload: any,
  productId: number | string,
  decision: 'approved' | 'rejected',
  source: 'telegram_command' | 'telegram_button' = 'telegram_command',
): Promise<PublishDecisionResult> {
  let product: any
  try {
    product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
  } catch {
    return {
      ok: false,
      decision,
      productId,
      message: `❌ Ürün bulunamadı (ID: ${productId})`,
    }
  }
  if (!product) {
    return {
      ok: false,
      decision,
      productId,
      message: `❌ Ürün bulunamadı (ID: ${productId})`,
    }
  }
  const sn = product.stockNumber || `ID:${productId}`

  // Emit the audit-trail event. Best-effort — failure here doesn't block
  // any state transition because rejection isn't one and approval is
  // followed by /activate which has its own emit.
  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: decision === 'approved' ? 'publish.approved' : 'publish.rejected',
        product: productId,
        sourceBot: 'uygunops',
        status: 'processed',
        payload: {
          decision,
          source,
          decidedAt: new Date().toISOString(),
          productStatus: product.status,
          publishStatus: product.workflow?.publishStatus,
          workflowStatus: product.workflow?.workflowStatus,
        },
        notes: `Publish ${decision} via Telegram (${source}) for product ${productId}.`,
        processedAt: new Date().toISOString(),
      },
    })
  } catch (eErr) {
    console.warn(
      `[publishDesk D-237] bot-event emit failed for ${decision}=${productId}:`,
      eErr instanceof Error ? eErr.message : String(eErr),
    )
  }

  if (decision === 'rejected') {
    return {
      ok: true,
      decision,
      productId,
      message:
        `🚫 <b>Yayın reddedildi</b>\n` +
        `${sn} · ID: ${productId}\n\n` +
        `<i>Ürün durumu değiştirilmedi — sadece operatör kararı kaydedildi.</i>\n` +
        `<i>Publish Desk listesinden ${REJECTION_WINDOW_DAYS} gün boyunca filtrelenecek.</i>\n` +
        `<i>Geri çevirmek için: /approvepublish ${sn} veya /activate ${sn}</i>`,
    }
  }

  // Approve message — caller follows up with /activate.
  return {
    ok: true,
    decision,
    productId,
    message:
      `✅ <b>Yayın onaylandı</b>\n` +
      `${sn} · ID: ${productId}\n\n` +
      `<i>Audit trail kaydedildi (publish.approved). Aktivasyon için /activate ${sn} çalıştırılacak.</i>`,
  }
}

// ── Formatting + buttons ─────────────────────────────────────────────────────

function statusEmoji(s?: string | null): string {
  return s === 'active' ? '🟢' : s === 'soldout' ? '🔴' : '⚪'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function publishDeskButtons(productId: number | string) {
  return [
    [
      { text: '🚀 Aktif Et', callback_data: `pdesk_act:${productId}` },
      { text: '🚫 Reddet', callback_data: `pdesk_rej:${productId}` },
      { text: '🔍 Bul', callback_data: `sn_card:${productId}` },
    ],
  ]
}

export function formatPublishReadyHeader(
  list: Awaited<ReturnType<typeof getPublishReadyList>>,
  todayOnly: boolean,
): string {
  const lines = [
    `🚀 <b>Publish Desk</b>${todayOnly ? ' — bugün' : ''}`,
    ``,
    `Yayına hazır: <b>${list.totalCandidates}</b>` +
      (list.hasMore ? ` <i>(ilk ${list.items.length} gösteriliyor)</i>` : ''),
    list.rejectedSkipped > 0
      ? `<i>(${list.rejectedSkipped} ürün son ${REJECTION_WINDOW_DAYS} gün içinde reddedildiği için listede yok)</i>`
      : '',
    ``,
    `<i>Her ürün için aşağıdaki kart üzerinden:</i>`,
    `<i>🚀 Aktif Et · 🚫 Reddet · 🔍 Bul</i>`,
    ``,
  ].filter((l) => l.length > 0)
  return lines.join('\n')
}

export function formatPublishReadyEntry(entry: PublishReadyEntry): string {
  const p = entry.product
  const sn = p.stockNumber ? `<code>${p.stockNumber}</code>` : `ID:${p.id}`
  const title = escapeHtml((p.title as string) || 'İsimsiz').slice(0, 48)
  const audit = (p.workflow?.auditStatus as string) || '—'
  const wf = (p.workflow?.workflowStatus as string) || '—'
  const auditEmoji =
    audit === 'approved' ? '✅' : audit === 'approved_with_warning' ? '⚠️' : audit === 'pending' ? '⏳' : audit === 'failed' || audit === 'needs_revision' ? '❌' : '➖'
  return (
    `${statusEmoji(p.status)} ${sn} · ${title}\n` +
    `   audit: ${auditEmoji} ${audit} · workflow: ${wf}`
  )
}

export function formatPublishReadyEmpty(todayOnly: boolean): string {
  return (
    `🚀 <b>Publish Desk</b>${todayOnly ? ' — bugün' : ''}\n\n` +
    `✅ Yayına hazır bir şey yok.\n\n` +
    `<i>Aday bulmak için: /inbox publish</i>`
  )
}
