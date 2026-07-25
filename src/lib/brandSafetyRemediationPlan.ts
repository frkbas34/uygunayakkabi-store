import {
  formatBrandSafetyReason,
  scanProductBrandSafety,
  type BrandSafetySeverity,
} from './brandSafety'
import {
  BRAND_PROVENANCE_DECISIONS,
  BRAND_PROVENANCE_EVENT_TYPE,
  formatBrandProvenanceDecision,
  type BrandProvenanceDecision,
  type BrandProvenanceReview,
} from './brandProvenanceReview'
import { isPublicStorefrontProduct } from './merchandising'
import { deriveProductLifecycle } from './productLifecycle'
import {
  summarizeChannelDispatchResult,
  type DispatchChannelResultLike,
} from './channelDispatchStatus'

export type BrandSafetyPlanProduct = Record<string, any>
export type BrandProvenanceReviewEvent = Record<string, any>

const EXTERNAL_CHANNELS = new Set(['instagram', 'facebook', 'x', 'shopier'])

export interface BrandSafetyExternalExposure {
  published: string[]
  queued: string[]
  failed: string[]
}

export type BrandSafetyProvenanceState =
  | 'not_recorded'
  | BrandProvenanceDecision

export type BrandSafetyRemediationActionKind =
  | 'verify_external_records'
  | 'record_provenance'
  | 'collect_provenance_evidence'
  | 'correct_unbranded_copy'
  | 'keep_excluded'

export interface BrandSafetyNextSafeAction {
  kind: BrandSafetyRemediationActionKind
  summary: string
  previewCommand: string | null
}

export type BrandSafetyProvenanceCounts = Record<BrandSafetyProvenanceState, number>

export interface BrandSafetyRemediationItem {
  id: string
  ref: string
  title: string
  status: string
  lifecycle: string
  severity: BrandSafetySeverity
  blockedBrands: string[]
  riskyClaims: string[]
  matchedFields: string[]
  reason: string
  externalExposure: BrandSafetyExternalExposure
  provenanceReview: BrandProvenanceReview | null
  provenanceState: BrandSafetyProvenanceState
  nextSafeAction: BrandSafetyNextSafeAction
  operatorLinks: {
    adminUrl: string | null
    productUrl: string | null
  }
  flowCommand: string
  runtimeFlowCommand: string
  recommendation: string
}

export interface BrandSafetyRemediationPlan {
  generatedAt: string
  sampleSize: number
  sampleLimit?: number
  totalProducts?: number
  blockedCount: number
  severityCounts: Record<BrandSafetySeverity, number>
  brandCounts: Record<string, number>
  provenanceCounts: BrandSafetyProvenanceCounts
  externalExposureCount: number
  items: BrandSafetyRemediationItem[]
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function displayValue(value: unknown, fallback = 'missing'): string {
  if (nonEmptyString(value)) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const key of ['stockNumber', 'sku', 'slug', 'title', 'name', 'id']) {
      const candidate = record[key]
      if (nonEmptyString(candidate)) return candidate.trim()
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
    }
  }
  return fallback
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function siteBaseUrl(): string {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'https://www.uygunayakkabi.com',
  )
}

function buildOperatorLinks(product: BrandSafetyPlanProduct): BrandSafetyRemediationItem['operatorLinks'] {
  const baseUrl = siteBaseUrl()
  const id = product.id
  const slug = nonEmptyString(product.slug) ? product.slug.trim() : null

  return {
    adminUrl: id === null || id === undefined
      ? null
      : `${baseUrl}/admin/collections/products/${encodeURIComponent(String(id))}`,
    productUrl: slug && isPublicStorefrontProduct(product)
      ? `${baseUrl}/products/${encodeURIComponent(slug)}`
      : null,
  }
}

function severityRank(severity: BrandSafetySeverity): number {
  switch (severity) {
    case 'critical': return 0
    case 'high': return 1
    case 'medium': return 2
    case 'low': return 3
  }
}

function statusRank(status: string): number {
  if (status === 'active' || status === 'soldout' || status === 'sold_out') return 0
  if (status === 'draft') return 1
  return 2
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return entries.length === 0
    ? 'none'
    : entries.map(([key, count]) => `${escapeHtml(key)} ${count}`).join(', ')
}

function parseDispatchNotes(raw: unknown): DispatchChannelResultLike[] {
  const parsed = typeof raw === 'string'
    ? (() => {
        try { return JSON.parse(raw) } catch { return [] }
      })()
    : raw

  if (!Array.isArray(parsed)) return []

  return parsed.filter((entry): entry is DispatchChannelResultLike => {
    return !!entry &&
      typeof entry === 'object' &&
      typeof entry.channel === 'string' &&
      typeof entry.eligible === 'boolean' &&
      typeof entry.dispatched === 'boolean' &&
      typeof entry.webhookConfigured === 'boolean'
  })
}

function buildExternalExposure(product: BrandSafetyPlanProduct): BrandSafetyExternalExposure {
  const exposure: BrandSafetyExternalExposure = {
    published: [],
    queued: [],
    failed: [],
  }

  for (const note of parseDispatchNotes(product.sourceMeta?.dispatchNotes)) {
    const channel = note.channel.trim().toLowerCase()
    if (!EXTERNAL_CHANNELS.has(channel)) continue

    const state = summarizeChannelDispatchResult(note).state
    if (state !== 'published' && state !== 'queued' && state !== 'failed') {
      continue
    }
    exposure[state].push(channel)
  }

  for (const channels of Object.values(exposure) as string[][]) {
    channels.sort((a, b) => a.localeCompare(b))
  }

  return exposure
}

function formatExternalExposure(exposure: BrandSafetyExternalExposure): string {
  const parts = (Object.entries(exposure) as Array<[keyof BrandSafetyExternalExposure, string[]]>)
    .filter(([, channels]) => channels.length > 0)
    .map(([state, channels]) => `${state}=${channels.join(',')}`)

  return parts.length > 0 ? parts.join('; ') : 'none recorded'
}

function hasRecordedExternalExposure(exposure: BrandSafetyExternalExposure): boolean {
  return exposure.published.length > 0 || exposure.queued.length > 0 || exposure.failed.length > 0
}

function createProvenanceCounts(): BrandSafetyProvenanceCounts {
  return {
    not_recorded: 0,
    needs_evidence: 0,
    unbranded_copy_fix: 0,
    not_approved_for_sale: 0,
  }
}

function nextSafeActionFor(
  ref: string,
  externalExposure: BrandSafetyExternalExposure,
  review: BrandProvenanceReview | null,
): BrandSafetyNextSafeAction {
  if (hasRecordedExternalExposure(externalExposure)) {
    return {
      kind: 'verify_external_records',
      summary: 'Manually verify the recorded external state before any cleanup decision. Stored notes do not prove a remote listing still exists.',
      previewCommand: review ? null : `/brandreview ${ref} needs-evidence`,
    }
  }

  if (!review) {
    return {
      kind: 'record_provenance',
      summary: 'Preview and record the appropriate provenance decision before changing any product copy or publication state.',
      previewCommand: `/brandreview ${ref} needs-evidence`,
    }
  }

  switch (review.decision) {
    case 'needs_evidence':
      return {
        kind: 'collect_provenance_evidence',
        summary: 'Collect ownership or provenance evidence; keep the product excluded until the operator records a final decision.',
        previewCommand: null,
      }
    case 'unbranded_copy_fix':
      return {
        kind: 'correct_unbranded_copy',
        summary: 'Manually correct stored protected-brand wording, then re-run Product Flow. This review does not lift the hard gate.',
        previewCommand: null,
      }
    case 'not_approved_for_sale':
      return {
        kind: 'keep_excluded',
        summary: 'Keep the product excluded. Do not publish, redispatch, advertise, or infer that a remote cleanup has happened.',
        previewCommand: null,
      }
  }
}

function recommendationFor(status: string, externalExposure: BrandSafetyExternalExposure): string {
  if (status === 'active' || status === 'soldout' || status === 'sold_out') {
    const recordedExposure = formatExternalExposure(externalExposure)
    return recordedExposure === 'none recorded'
      ? 'Verify provenance and any prior dispatch visibility first. The current storefront safety policy keeps protected-brand products off the public PDP. Do not redispatch or advertise this product.'
      : `Verify provenance and prior dispatch visibility (${recordedExposure}) before any manual cleanup. The current storefront safety policy keeps protected-brand products off the public PDP. Do not redispatch or advertise this product.`
  }

  return 'Verify provenance. Rewrite brand wording only for a confirmed unbranded own product; otherwise keep it excluded from publication.'
}

function eventProductId(event: BrandProvenanceReviewEvent): string | null {
  const product = event.product
  if (typeof product === 'string' && product.trim()) return product.trim()
  if (typeof product === 'number' && Number.isFinite(product)) return String(product)
  if (product && typeof product === 'object') {
    return displayValue((product as Record<string, unknown>).id, '').trim() || null
  }
  return null
}

function reviewFromEvent(event: BrandProvenanceReviewEvent): BrandProvenanceReview | null {
  if (event.eventType !== BRAND_PROVENANCE_EVENT_TYPE) return null
  const payload = event.payload
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const record = payload as Record<string, unknown>
  const decision = record.decision
  if (!BRAND_PROVENANCE_DECISIONS.includes(decision as BrandProvenanceDecision)) return null
  const recordedAt = displayValue(record.recordedAt, displayValue(event.createdAt, ''))
  if (!recordedAt) return null
  const note = typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null
  return {
    decision: decision as BrandProvenanceDecision,
    recordedAt,
    note,
  }
}

function buildProvenanceReviewMap(events: BrandProvenanceReviewEvent[]): Map<string, BrandProvenanceReview> {
  const reviews = new Map<string, BrandProvenanceReview>()
  for (const event of events) {
    const productId = eventProductId(event)
    const review = reviewFromEvent(event)
    if (!productId || !review) continue
    const existing = reviews.get(productId)
    if (!existing || review.recordedAt > existing.recordedAt) reviews.set(productId, review)
  }
  return reviews
}

export function buildBrandSafetyRemediationPlan(
  products: BrandSafetyPlanProduct[],
  options: {
    now?: Date
    sampleLimit?: number
    totalProducts?: number
    provenanceEvents?: BrandProvenanceReviewEvent[]
  } = {},
): BrandSafetyRemediationPlan {
  const severityCounts: Record<BrandSafetySeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }
  const brandCounts: Record<string, number> = {}
  const provenanceCounts = createProvenanceCounts()
  const items: BrandSafetyRemediationItem[] = []
  let externalExposureCount = 0
  const provenanceReviews = buildProvenanceReviewMap(options.provenanceEvents ?? [])

  for (const product of products) {
    const result = scanProductBrandSafety(product)
    if (result.safe) continue

    const id = displayValue(product.id)
    const ref = nonEmptyString(product.stockNumber) ? product.stockNumber.trim() : id
    const status = displayValue(product.status, 'draft')
    const lifecycle = deriveProductLifecycle(product)
    const externalExposure = buildExternalExposure(product)
    const provenanceReview = provenanceReviews.get(id) ?? null
    const provenanceState: BrandSafetyProvenanceState = provenanceReview?.decision ?? 'not_recorded'
    const nextSafeAction = nextSafeActionFor(ref, externalExposure, provenanceReview)

    severityCounts[result.severity] += 1
    provenanceCounts[provenanceState] += 1
    if (hasRecordedExternalExposure(externalExposure)) externalExposureCount += 1
    for (const brand of result.blockedBrands) {
      brandCounts[brand] = (brandCounts[brand] ?? 0) + 1
    }

    items.push({
      id,
      ref,
      title: displayValue(product.title, `Product ${id}`),
      status,
      lifecycle,
      severity: result.severity,
      blockedBrands: result.blockedBrands,
      riskyClaims: result.riskyClaims,
      matchedFields: result.matchedFields,
      reason: formatBrandSafetyReason(result),
      externalExposure,
      provenanceReview,
      provenanceState,
      nextSafeAction,
      operatorLinks: buildOperatorLinks(product),
      flowCommand: `/productflow ${ref}`,
      runtimeFlowCommand: `npm run smoke:product-flow:read -- --product=${ref} --confirm-read-only`,
      recommendation: recommendationFor(status, externalExposure),
    })
  }

  items.sort((a, b) =>
    severityRank(a.severity) - severityRank(b.severity) ||
    statusRank(a.status) - statusRank(b.status) ||
    Number(hasRecordedExternalExposure(b.externalExposure)) - Number(hasRecordedExternalExposure(a.externalExposure)) ||
    a.ref.localeCompare(b.ref),
  )

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    sampleSize: products.length,
    sampleLimit: options.sampleLimit,
    totalProducts: options.totalProducts,
    blockedCount: items.length,
    severityCounts,
    brandCounts,
    provenanceCounts,
    externalExposureCount,
    items,
  }
}

export function formatBrandSafetyRemediationPlan(
  plan: BrandSafetyRemediationPlan,
  options: { maxItems?: number } = {},
): string {
  const maxItems = Math.max(1, Math.min(options.maxItems ?? 12, 25))
  const total = typeof plan.totalProducts === 'number' ? plan.totalProducts : null
  const coverage = total === null ? String(plan.sampleSize) : `${plan.sampleSize}/${total}`
  const limit = typeof plan.sampleLimit === 'number' ? ` (limit ${plan.sampleLimit})` : ''
  const shown = plan.items.slice(0, maxItems)

  const lines: string[] = [
    '<b>Brand-Safety Remediation Plan (D-466)</b>',
    `Read-only sample: <b>${coverage}</b>${limit}`,
    `Blocked products: <b>${plan.blockedCount}</b>`,
    `Severity: ${formatCounts(plan.severityCounts)}`,
    `Brands: ${formatCounts(plan.brandCounts)}`,
    `Provenance: ${formatCounts(plan.provenanceCounts)}`,
    `Recorded external exposure: <b>${plan.externalExposureCount}</b> (manual remote verification required)`,
    '',
    '<b>Operator rule</b>',
    'Do not auto-rewrite, activate, publish, redispatch, or advertise a protected-brand product. Verify provenance first.',
    '<code>/brandreview &lt;id-or-sn&gt; needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]</code>',
  ]

  if (shown.length === 0) {
    lines.push('', '<i>No protected-brand blockers were found in this sample.</i>')
    return lines.join('\n')
  }

  lines.push('', '<b>Priority review queue</b>')
  for (const item of shown) {
    lines.push(
      `<b>[${escapeHtml(item.severity)}] ${escapeHtml(item.ref)}</b> ${escapeHtml(item.title)}`,
      `status ${escapeHtml(item.status)}, lifecycle ${escapeHtml(item.lifecycle)}`,
      `brands ${escapeHtml(item.blockedBrands.join(', ') || 'none')}; claims ${escapeHtml(item.riskyClaims.join(', ') || 'none')}`,
      `fields ${escapeHtml(item.matchedFields.join(', ') || 'none')}`,
      `external dispatch record: ${escapeHtml(formatExternalExposure(item.externalExposure))}`,
      item.provenanceReview
        ? `review ${escapeHtml(formatBrandProvenanceDecision(item.provenanceReview.decision))} at ${escapeHtml(item.provenanceReview.recordedAt.slice(0, 16))}`
        : 'review not recorded',
      `next safe step: ${escapeHtml(item.nextSafeAction.summary)}`,
      item.nextSafeAction.previewCommand
        ? `<code>${escapeHtml(item.nextSafeAction.previewCommand)}</code> <i>(preview only; add confirm only after an operator decision)</i>`
        : '',
      `<code>${escapeHtml(item.flowCommand)}</code>`,
      escapeHtml(item.recommendation),
    )

    const links: string[] = []
    if (item.operatorLinks.adminUrl) {
      links.push(`<a href="${escapeHtml(item.operatorLinks.adminUrl)}">admin</a>`)
    }
    if (item.operatorLinks.productUrl) {
      links.push(`<a href="${escapeHtml(item.operatorLinks.productUrl)}">PDP</a>`)
    }
    if (links.length > 0) lines.push(`links: ${links.join(' | ')}`)
  }

  if (plan.items.length > shown.length) {
    lines.push('', `<i>${plan.items.length - shown.length} more blocked product(s) are not shown. Use a larger /brandplan sample to inspect them.</i>`)
  }

  lines.push('', '<i>Read-only plan. Product changes require a separate operator decision.</i>')
  return lines.join('\n')
}
