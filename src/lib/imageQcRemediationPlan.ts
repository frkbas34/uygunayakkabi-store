import { scanProductBrandSafety } from './brandSafety'
import { evaluateImageQualityGate, type ImageQualityGateResult } from './imageQualityGate'
import { isPublicStorefrontProduct } from './merchandising'
import { deriveProductLifecycle } from './productLifecycle'

export type ImageQcRemediationProduct = Record<string, any>

export const IMAGE_QC_REMEDIATION_STATES = [
  'brand_review_first',
  'needs_original_media',
  'qc_failed',
  'qc_review',
  'qc_decision_needed',
] as const

export type ImageQcRemediationState = typeof IMAGE_QC_REMEDIATION_STATES[number]

export type ImageQcRemediationCounts = Record<ImageQcRemediationState, number>

export interface ImageQcRemediationItem {
  id: string
  ref: string
  title: string
  status: string
  lifecycle: string
  state: ImageQcRemediationState
  imageQuality: ImageQualityGateResult
  blockedBrands: string[]
  operatorLinks: {
    adminUrl: string | null
    productUrl: string | null
  }
  flowCommand: string
  imagePlanCommand: string
  runtimeImagePlanCommand: string
  nextSafeStep: string
}

export interface ImageQcRemediationPlan {
  generatedAt: string
  sampleSize: number
  sampleLimit?: number
  totalProducts?: number
  queueCount: number
  stateCounts: ImageQcRemediationCounts
  brandBlockedCount: number
  items: ImageQcRemediationItem[]
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

function buildOperatorLinks(product: ImageQcRemediationProduct): ImageQcRemediationItem['operatorLinks'] {
  const id = product.id
  const slug = nonEmptyString(product.slug) ? product.slug.trim() : null
  const baseUrl = siteBaseUrl()

  return {
    adminUrl: id === null || id === undefined
      ? null
      : `${baseUrl}/admin/collections/products/${encodeURIComponent(String(id))}`,
    productUrl: slug && isPublicStorefrontProduct(product)
      ? `${baseUrl}/products/${encodeURIComponent(slug)}`
      : null,
  }
}

function emptyCounts(): ImageQcRemediationCounts {
  return {
    brand_review_first: 0,
    needs_original_media: 0,
    qc_failed: 0,
    qc_review: 0,
    qc_decision_needed: 0,
  }
}

function classify(
  product: ImageQcRemediationProduct,
  imageQuality: ImageQualityGateResult,
): { state: ImageQcRemediationState; blockedBrands: string[]; nextSafeStep: string } | null {
  const brandSafety = scanProductBrandSafety(product)
  if (!brandSafety.safe) {
    return {
      state: 'brand_review_first',
      blockedBrands: brandSafety.blockedBrands,
      nextSafeStep: 'Resolve protected-brand provenance first. Do not generate or approve marketing images for this product.',
    }
  }

  if (!imageQuality.hasOriginals && !imageQuality.hasGenerated) {
    return {
      state: 'needs_original_media',
      blockedBrands: [],
      nextSafeStep: 'Attach at least one real product photo before any generation or Image QC decision.',
    }
  }

  if (imageQuality.level === 'fail') {
    return {
      state: 'qc_failed',
      blockedBrands: [],
      nextSafeStep: 'Inspect the failed visual and original media. Regenerate or replace only after the read-only image plan confirms the cause.',
    }
  }

  if (imageQuality.status === 'review') {
    return {
      state: 'qc_review',
      blockedBrands: [],
      nextSafeStep: 'Inspect the image against the original product photo, then make a human PASS, FAIL, or regeneration decision separately.',
    }
  }

  if (imageQuality.hasGenerated && !imageQuality.publishable) {
    return {
      state: 'qc_decision_needed',
      blockedBrands: [],
      nextSafeStep: 'Generated images need a human Image QC decision before activation, Shopier queueing, or ad use.',
    }
  }

  return null
}

function stateRank(state: ImageQcRemediationState): number {
  switch (state) {
    case 'brand_review_first': return 0
    case 'needs_original_media': return 1
    case 'qc_failed': return 2
    case 'qc_review': return 3
    case 'qc_decision_needed': return 4
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

function formatCounts(counts: ImageQcRemediationCounts): string {
  const labels: Record<ImageQcRemediationState, string> = {
    brand_review_first: 'brand review first',
    needs_original_media: 'no original media',
    qc_failed: 'QC failed',
    qc_review: 'QC review',
    qc_decision_needed: 'QC decision needed',
  }
  return IMAGE_QC_REMEDIATION_STATES
    .map((state) => [state, counts[state]] as const)
    .filter(([, count]) => count > 0)
    .map(([state, count]) => `${labels[state]} ${count}`)
    .join(', ') || 'none'
}

export function buildImageQcRemediationPlan(
  products: ImageQcRemediationProduct[],
  options: {
    now?: Date
    sampleLimit?: number
    totalProducts?: number
  } = {},
): ImageQcRemediationPlan {
  const stateCounts = emptyCounts()
  const items: ImageQcRemediationItem[] = []
  let brandBlockedCount = 0

  for (const product of products) {
    const imageQuality = evaluateImageQualityGate(product)
    const classification = classify(product, imageQuality)
    if (!classification) continue

    const id = displayValue(product.id)
    const ref = nonEmptyString(product.stockNumber) ? product.stockNumber.trim() : id
    const status = displayValue(product.status, 'draft')
    stateCounts[classification.state] += 1
    if (classification.state === 'brand_review_first') brandBlockedCount += 1

    items.push({
      id,
      ref,
      title: displayValue(product.title, `Product ${id}`),
      status,
      lifecycle: deriveProductLifecycle(product),
      state: classification.state,
      imageQuality,
      blockedBrands: classification.blockedBrands,
      operatorLinks: buildOperatorLinks(product),
      flowCommand: `/productflow ${ref}`,
      imagePlanCommand: `/imageplan ${ref}`,
      runtimeImagePlanCommand: `npm run smoke:image-plan:read -- --product=${ref} --confirm-read-only`,
      nextSafeStep: classification.nextSafeStep,
    })
  }

  items.sort((a, b) =>
    stateRank(a.state) - stateRank(b.state) ||
    statusRank(a.status) - statusRank(b.status) ||
    a.ref.localeCompare(b.ref),
  )

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    sampleSize: products.length,
    sampleLimit: options.sampleLimit,
    totalProducts: options.totalProducts,
    queueCount: items.length,
    stateCounts,
    brandBlockedCount,
    items,
  }
}

export function formatImageQcRemediationPlan(
  plan: ImageQcRemediationPlan,
  options: { maxItems?: number } = {},
): string {
  const maxItems = Math.max(1, Math.min(options.maxItems ?? 12, 25))
  const total = typeof plan.totalProducts === 'number' ? plan.totalProducts : null
  const coverage = total === null ? String(plan.sampleSize) : `${plan.sampleSize}/${total}`
  const limit = typeof plan.sampleLimit === 'number' ? ` (limit ${plan.sampleLimit})` : ''
  const shown = plan.items.slice(0, maxItems)
  const lines: string[] = [
    '<b>Image QC Remediation Queue (D-499)</b>',
    `Read-only sample: <b>${coverage}</b>${limit}`,
    `Queue items: <b>${plan.queueCount}</b>`,
    `States: ${formatCounts(plan.stateCounts)}`,
    `Brand review first: <b>${plan.brandBlockedCount}</b>`,
    '',
    '<b>Operator rule</b>',
    'This is triage only. Do not generate, approve, reject, activate, publish, queue Shopier, or advertise from this queue.',
    'Open the row image plan before any Image QC or generation command. Protected-brand rows require provenance review first.',
  ]

  if (shown.length === 0) {
    lines.push('', '<i>No Image QC remediation items were found in this sample.</i>')
    return lines.join('\n')
  }

  lines.push('', '<b>Priority review queue</b>')
  for (const item of shown) {
    lines.push(
      `<b>[${escapeHtml(item.state)}] ${escapeHtml(item.ref)}</b> ${escapeHtml(item.title)}`,
      `status ${escapeHtml(item.status)}, lifecycle ${escapeHtml(item.lifecycle)}`,
      `image QC ${escapeHtml(item.imageQuality.status)}; originals ${item.imageQuality.originalCount}; generated ${item.imageQuality.generatedCount}`,
      item.blockedBrands.length > 0 ? `protected brands ${escapeHtml(item.blockedBrands.join(', '))}` : '',
      `next safe step: ${escapeHtml(item.nextSafeStep)}`,
      `<code>${escapeHtml(item.imagePlanCommand)}</code>`,
      `<code>${escapeHtml(item.flowCommand)}</code>`,
    )
    const links: string[] = []
    if (item.operatorLinks.adminUrl) links.push(`<a href="${escapeHtml(item.operatorLinks.adminUrl)}">admin</a>`)
    if (item.operatorLinks.productUrl) links.push(`<a href="${escapeHtml(item.operatorLinks.productUrl)}">PDP</a>`)
    if (links.length > 0) lines.push(`links: ${links.join(' | ')}`)
  }

  if (plan.items.length > shown.length) {
    lines.push('', `<i>${plan.items.length - shown.length} more queue item(s) are not shown. Use a larger /imageqcplan sample to inspect them.</i>`)
  }

  lines.push('', '<i>Read-only queue. Image QC decisions and generation require a separate operator action.</i>')
  return lines.filter(Boolean).join('\n')
}
