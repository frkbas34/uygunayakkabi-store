import { formatBrandSafetyReason, scanProductBrandSafety } from './brandSafety'

export const BRAND_PROVENANCE_EVENT_TYPE = 'brand_safety.provenance_reviewed'

export const BRAND_PROVENANCE_DECISIONS = [
  'needs_evidence',
  'unbranded_copy_fix',
  'not_approved_for_sale',
] as const

export type BrandProvenanceDecision = typeof BRAND_PROVENANCE_DECISIONS[number]

export interface BrandProvenanceReview {
  decision: BrandProvenanceDecision
  recordedAt: string
  note: string | null
}

export interface BrandProvenanceReviewRecordResult {
  review: BrandProvenanceReview
  alreadyRecorded: boolean
}

export interface ParsedBrandProvenanceReviewCommand {
  ref: string | null
  decision: BrandProvenanceDecision | null
  confirmed: boolean
  note: string | null
  error: string | null
}

const DECISION_TOKENS: Record<string, BrandProvenanceDecision> = {
  'needs-evidence': 'needs_evidence',
  needs_evidence: 'needs_evidence',
  'unbranded-copy-fix': 'unbranded_copy_fix',
  unbranded_copy_fix: 'unbranded_copy_fix',
  'not-approved': 'not_approved_for_sale',
  not_approved_for_sale: 'not_approved_for_sale',
}

const COMMAND_TOKENS: Record<BrandProvenanceDecision, string> = {
  needs_evidence: 'needs-evidence',
  unbranded_copy_fix: 'unbranded-copy-fix',
  not_approved_for_sale: 'not-approved',
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function displayValue(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function normalizeNote(value: string): string | null {
  const note = value.trim()
  return note ? note : null
}

export function parseBrandProvenanceReviewCommand(parts: string[]): ParsedBrandProvenanceReviewCommand {
  const ref = parts[0]?.trim() || null
  const rawDecision = parts[1]?.trim().toLowerCase() || ''
  const decision = DECISION_TOKENS[rawDecision] ?? null
  const confirmed = parts[2]?.trim().toLowerCase() === 'confirm'
  const note = normalizeNote(parts.slice(confirmed ? 3 : 2).join(' '))

  if (!ref || !decision) {
    return {
      ref,
      decision,
      confirmed,
      note,
      error: 'Usage: /brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]',
    }
  }

  if (note && note.length > 500) {
    return {
      ref,
      decision,
      confirmed,
      note: null,
      error: 'Review note must be 500 characters or fewer.',
    }
  }

  return { ref, decision, confirmed, note, error: null }
}

export function formatBrandProvenanceDecision(decision: BrandProvenanceDecision): string {
  switch (decision) {
    case 'needs_evidence': return 'needs provenance evidence'
    case 'unbranded_copy_fix': return 'confirmed unbranded; copy fix still required'
    case 'not_approved_for_sale': return 'not approved for sale'
  }
}

export function commandTokenForBrandProvenanceDecision(decision: BrandProvenanceDecision): string {
  return COMMAND_TOKENS[decision]
}

export function reviewRecommendation(decision: BrandProvenanceDecision): string {
  switch (decision) {
    case 'needs_evidence':
      return 'Keep the product excluded until ownership/provenance evidence is reviewed.'
    case 'unbranded_copy_fix':
      return 'Correct the stored brand wording manually, then re-run Product Flow. This record does not lift the brand-safety gate.'
    case 'not_approved_for_sale':
      return 'Keep the product excluded. Do not publish, redispatch, or advertise it from this record alone.'
  }
}

export function evaluateBrandProvenanceReview(product: Record<string, any>): {
  ok: boolean
  reason: string | null
} {
  const brandSafety = scanProductBrandSafety(product)
  if (brandSafety.safe) {
    return { ok: false, reason: 'This product does not currently have a protected-brand blocker.' }
  }
  return { ok: true, reason: null }
}

export function formatBrandProvenanceReviewPreview(
  product: Record<string, any>,
  parsed: Pick<ParsedBrandProvenanceReviewCommand, 'ref' | 'decision' | 'note'>,
): string {
  if (!parsed.ref || !parsed.decision) {
    return '<b>Brand provenance review</b>\n\n' +
      '<code>/brandreview &lt;id-or-sn&gt; needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]</code>\n\n' +
      '<i>This records an operator decision only. It never changes product data or publishing state.</i>'
  }

  const eligibility = evaluateBrandProvenanceReview(product)
  if (!eligibility.ok) {
    return `<b>Brand provenance review blocked</b>\n\n${escapeHtml(eligibility.reason)}`
  }

  const ref = displayValue(product.stockNumber, displayValue(product.id, parsed.ref))
  const title = displayValue(product.title, `Product ${ref}`)
  const safety = scanProductBrandSafety(product)
  const notePart = parsed.note ? ` ${parsed.note}` : ''
  const confirmCommand = `/brandreview ${ref} ${commandTokenForBrandProvenanceDecision(parsed.decision)} confirm${notePart}`

  return [
    '<b>Brand provenance review preview</b>',
    `<b>${escapeHtml(ref)}</b> ${escapeHtml(title)}`,
    `blocker: ${escapeHtml(formatBrandSafetyReason(safety))}`,
    `decision: <b>${escapeHtml(formatBrandProvenanceDecision(parsed.decision))}</b>`,
    escapeHtml(reviewRecommendation(parsed.decision)),
    '',
    `<code>${escapeHtml(confirmCommand)}</code>`,
    '<i>Confirmation creates one BotEvents audit record only. It does not edit the product, clear the safety block, publish, redispatch, or spend.</i>',
  ].join('\n')
}

export function formatRecordedBrandProvenanceReview(
  product: Record<string, any>,
  review: BrandProvenanceReview,
  options: { alreadyRecorded?: boolean } = {},
): string {
  const ref = displayValue(product.stockNumber, displayValue(product.id, 'product'))
  return [
    options.alreadyRecorded
      ? '<b>Brand provenance review already recorded</b>'
      : '<b>Brand provenance review recorded</b>',
    `<b>${escapeHtml(ref)}</b> - ${escapeHtml(formatBrandProvenanceDecision(review.decision))}`,
    escapeHtml(reviewRecommendation(review.decision)),
    `<code>/productflow ${escapeHtml(ref)}</code>`,
    '<i>The protected-brand gate remains in force until the stored product data is manually corrected and passes review.</i>',
  ].join('\n')
}

export async function findProductForBrandProvenanceReview(payload: any, ref: string): Promise<Record<string, any> | null> {
  const normalized = ref.trim()
  if (!normalized) return null

  if (/^\d+$/.test(normalized)) {
    try {
      const product = await payload.findByID({ collection: 'products', id: normalized, depth: 1 })
      if (product) return product as Record<string, any>
    } catch {
      // Fall through to stock number lookup for a numeric stock reference.
    }
  }

  const result = await payload.find({
    collection: 'products',
    where: { stockNumber: { equals: normalized } },
    limit: 1,
    depth: 1,
  })
  return (result.docs?.[0] as Record<string, any> | undefined) ?? null
}

function reviewFromRecordedEvent(event: Record<string, any>): BrandProvenanceReview | null {
  if (event.eventType !== BRAND_PROVENANCE_EVENT_TYPE) return null
  const payload = event.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const record = payload as Record<string, unknown>
  if (!BRAND_PROVENANCE_DECISIONS.includes(record.decision as BrandProvenanceDecision)) return null

  const recordedAt = displayValue(record.recordedAt, displayValue(event.createdAt, ''))
  if (!recordedAt) return null

  return {
    decision: record.decision as BrandProvenanceDecision,
    recordedAt,
    note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null,
  }
}

async function findRecordedBrandProvenanceReview(
  payload: any,
  productId: unknown,
  idempotencyKey: string,
): Promise<BrandProvenanceReview | null> {
  const result = await payload.find({
    collection: 'bot-events',
    where: {
      and: [
        { eventType: { equals: BRAND_PROVENANCE_EVENT_TYPE } },
        { product: { equals: productId } },
      ],
    },
    limit: 100,
    depth: 0,
    sort: '-createdAt',
  })

  for (const event of result.docs ?? []) {
    const eventPayload = event?.payload
    if (!eventPayload || typeof eventPayload !== 'object' || Array.isArray(eventPayload)) continue
    if ((eventPayload as Record<string, unknown>).idempotencyKey !== idempotencyKey) continue
    const review = reviewFromRecordedEvent(event as Record<string, any>)
    if (review) return review
  }

  return null
}

export async function recordBrandProvenanceReview(
  payload: any,
  product: Record<string, any>,
  input: Pick<ParsedBrandProvenanceReviewCommand, 'decision' | 'note'>,
  now = new Date(),
  options: { idempotencyKey?: string | null } = {},
): Promise<BrandProvenanceReviewRecordResult> {
  if (!input.decision) throw new Error('A provenance decision is required.')

  const idempotencyKey = options.idempotencyKey?.trim() || null
  if (idempotencyKey) {
    const existing = await findRecordedBrandProvenanceReview(payload, product.id, idempotencyKey)
    if (existing) return { review: existing, alreadyRecorded: true }
  }

  const eligibility = evaluateBrandProvenanceReview(product)
  if (!eligibility.ok) throw new Error(eligibility.reason ?? 'Product is not eligible for provenance review.')

  const safety = scanProductBrandSafety(product)
  const review: BrandProvenanceReview = {
    decision: input.decision,
    recordedAt: now.toISOString(),
    note: input.note,
  }

  await payload.create({
    collection: 'bot-events',
    data: {
      eventType: BRAND_PROVENANCE_EVENT_TYPE,
      product: product.id,
      sourceBot: 'uygunops',
      status: 'processed',
      payload: {
        decision: review.decision,
        recordedAt: review.recordedAt,
        note: review.note,
        severity: safety.severity,
        blockedBrands: safety.blockedBrands,
        matchedFields: safety.matchedFields,
        idempotencyKey,
      },
      notes: reviewRecommendation(review.decision),
      processedAt: review.recordedAt,
    },
  })

  return { review, alreadyRecorded: false }
}
