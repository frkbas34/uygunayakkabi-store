import { scanProductBrandSafety } from './brandSafety'
import { countUsableMediaRows } from './productMedia'
import { resolveConfiguredTargets, findProductChannelSelectionIssues } from './productChannels'
import { deriveProductLifecycle, type ProductLifecycleStage } from './productLifecycle'
import { summarizeProductStock } from './productStock'
import { evaluatePublishReadiness, type ReadinessLevel } from './publishReadiness'
import { evaluateImageQualityGate } from './imageQualityGate'

type CountMap = Record<string, number>

export type CatalogQaProduct = Record<string, any>

export interface CatalogQaMissingCounts {
  price: number
  category: number
  usableMedia: number
  sellableStock: number
  stockNumber: number
  targets: number
  slug: number
  channelSelectionIssues: number
  unsupportedTargets: number
}

export interface CatalogQaPipelineCounts {
  contentPending: number
  auditPending: number
  imageQcPending: number
  imageQcRejected: number
  brandSafetyBlocked: number
}

export interface CatalogQaReadinessCounts {
  ready: number
  partiallyReady: number
  notReady: number
  blockersByDimension: CountMap
}

export interface CatalogQaShopierCounts {
  queued: number
  syncing: number
  synced: number
  error: number
  notSynced: number
  missing: number
  other: CountMap
}

export interface CatalogQaDraftAge {
  drafts: number
  staleOver2Days: number
  staleOver7Days: number
  oldestDraftAgeDays: number | null
}

export interface CatalogQaRecency {
  lastUpdatedAt: string | null
  oldestUpdatedAt: string | null
}

export interface CatalogQaReport {
  generatedAt: string
  sampleSize: number
  sampleLimit?: number
  totalProducts?: number
  distributions: {
    status: CountMap
    lifecycle: Record<ProductLifecycleStage, number>
    source: CountMap
    category: CountMap
  }
  missing: CatalogQaMissingCounts
  pipeline: CatalogQaPipelineCounts
  readiness: CatalogQaReadinessCounts
  shopier: CatalogQaShopierCounts
  draftAge: CatalogQaDraftAge
  recency: CatalogQaRecency
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

const EMPTY_LIFECYCLE_DISTRIBUTION: Record<ProductLifecycleStage, number> = {
  draft: 0,
  needs_review: 0,
  ready_to_publish: 0,
  active: 0,
  sold_out: 0,
}

function bump(map: CountMap, key: string): void {
  map[key] = (map[key] ?? 0) + 1
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function bucketValue(value: unknown, fallback = 'missing'): string {
  if (nonEmptyString(value)) return value.trim()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const key of ['name', 'title', 'slug', 'id']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
    }
  }
  return fallback
}

function positiveNumber(value: unknown): boolean {
  const n = Number(value ?? 0)
  return Number.isFinite(n) && n > 0
}

function parseTime(value: unknown): number | null {
  if (!nonEmptyString(value)) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function toIso(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString()
}

function ageDays(value: unknown, now: Date): number | null {
  const time = parseTime(value)
  if (time === null) return null
  return Math.max(0, Math.floor((now.getTime() - time) / MS_PER_DAY))
}

function readinessKey(level: ReadinessLevel): keyof Omit<CatalogQaReadinessCounts, 'blockersByDimension'> {
  if (level === 'ready') return 'ready'
  if (level === 'partially_ready') return 'partiallyReady'
  return 'notReady'
}

function auditLooksReady(product: CatalogQaProduct): boolean {
  const auditStatus = product.workflow?.auditStatus ?? 'not_required'
  return (
    product.auditResult?.approvedForPublish === true ||
    auditStatus === 'not_required' ||
    auditStatus === 'approved' ||
    auditStatus === 'approved_with_warning'
  )
}

function emptyReport(now: Date, sampleLimit?: number, totalProducts?: number): CatalogQaReport {
  return {
    generatedAt: now.toISOString(),
    sampleSize: 0,
    sampleLimit,
    totalProducts,
    distributions: {
      status: {},
      lifecycle: { ...EMPTY_LIFECYCLE_DISTRIBUTION },
      source: {},
      category: {},
    },
    missing: {
      price: 0,
      category: 0,
      usableMedia: 0,
      sellableStock: 0,
      stockNumber: 0,
      targets: 0,
      slug: 0,
      channelSelectionIssues: 0,
      unsupportedTargets: 0,
    },
    pipeline: {
      contentPending: 0,
      auditPending: 0,
      imageQcPending: 0,
      imageQcRejected: 0,
      brandSafetyBlocked: 0,
    },
    readiness: {
      ready: 0,
      partiallyReady: 0,
      notReady: 0,
      blockersByDimension: {},
    },
    shopier: {
      queued: 0,
      syncing: 0,
      synced: 0,
      error: 0,
      notSynced: 0,
      missing: 0,
      other: {},
    },
    draftAge: {
      drafts: 0,
      staleOver2Days: 0,
      staleOver7Days: 0,
      oldestDraftAgeDays: null,
    },
    recency: {
      lastUpdatedAt: null,
      oldestUpdatedAt: null,
    },
  }
}

export function buildCatalogQaReport(
  products: CatalogQaProduct[],
  options: {
    now?: Date
    sampleLimit?: number
    totalProducts?: number
  } = {},
): CatalogQaReport {
  const now = options.now ?? new Date()
  const report = emptyReport(now, options.sampleLimit, options.totalProducts)
  report.sampleSize = products.length

  let newestUpdated: number | null = null
  let oldestUpdated: number | null = null

  for (const product of products) {
    const status = bucketValue(product.status, 'draft')
    const source = bucketValue(product.source, 'missing')
    const category = bucketValue(product.category, 'missing')
    const lifecycle = deriveProductLifecycle(product)

    bump(report.distributions.status, status)
    report.distributions.lifecycle[lifecycle] += 1
    bump(report.distributions.source, source)
    bump(report.distributions.category, category)

    if (!positiveNumber(product.price)) report.missing.price += 1
    if (category === 'missing') report.missing.category += 1

    const usableMedia =
      countUsableMediaRows(product.images) +
      countUsableMediaRows(product.generativeGallery)
    if (usableMedia === 0) report.missing.usableMedia += 1

    const stock = summarizeProductStock(product)
    if (!stock.hasSellableStock) report.missing.sellableStock += 1
    if (!nonEmptyString(product.stockNumber)) report.missing.stockNumber += 1
    if (!nonEmptyString(product.slug)) report.missing.slug += 1

    const targets = resolveConfiguredTargets(product)
    if (targets.length === 0) report.missing.targets += 1

    const channelIssues = findProductChannelSelectionIssues(product)
    if (channelIssues.length > 0) report.missing.channelSelectionIssues += 1
    report.missing.unsupportedTargets += channelIssues.filter((issue) => issue.kind === 'unsupported_target').length

    const workflow = product.workflow ?? {}
    const imageQuality = evaluateImageQualityGate(product)
    if (imageQuality.level === 'fail') report.pipeline.imageQcRejected += 1
    else if (!imageQuality.publishable) report.pipeline.imageQcPending += 1

    if (workflow.contentStatus !== 'ready') report.pipeline.contentPending += 1
    if (!auditLooksReady(product)) report.pipeline.auditPending += 1

    const brandSafety = scanProductBrandSafety(product)
    if (!brandSafety.safe) report.pipeline.brandSafetyBlocked += 1

    const readiness = evaluatePublishReadiness({ ...product, id: product.id ?? 'unknown' })
    report.readiness[readinessKey(readiness.level)] += 1
    for (const blocker of readiness.blockers) {
      const dimension = blocker.split(':', 1)[0]?.trim() || 'unknown'
      bump(report.readiness.blockersByDimension, dimension)
    }

    const shopierStatus = bucketValue(product.sourceMeta?.shopierSyncStatus, 'missing')
    switch (shopierStatus) {
      case 'queued':
        report.shopier.queued += 1
        break
      case 'syncing':
        report.shopier.syncing += 1
        break
      case 'synced':
        report.shopier.synced += 1
        break
      case 'error':
        report.shopier.error += 1
        break
      case 'not_synced':
        report.shopier.notSynced += 1
        break
      case 'missing':
        report.shopier.missing += 1
        break
      default:
        bump(report.shopier.other, shopierStatus)
    }

    if (status === 'draft') {
      report.draftAge.drafts += 1
      const draftAge = ageDays(product.createdAt ?? product.updatedAt, now)
      if (draftAge !== null) {
        if (draftAge > 2) report.draftAge.staleOver2Days += 1
        if (draftAge > 7) report.draftAge.staleOver7Days += 1
        report.draftAge.oldestDraftAgeDays = Math.max(report.draftAge.oldestDraftAgeDays ?? 0, draftAge)
      }
    }

    const updatedAt = parseTime(product.updatedAt)
    if (updatedAt !== null) {
      newestUpdated = newestUpdated === null ? updatedAt : Math.max(newestUpdated, updatedAt)
      oldestUpdated = oldestUpdated === null ? updatedAt : Math.min(oldestUpdated, updatedAt)
    }
  }

  report.recency.lastUpdatedAt = toIso(newestUpdated)
  report.recency.oldestUpdatedAt = toIso(oldestUpdated)
  return report
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function sortedEntries(map: CountMap): Array<[string, number]> {
  return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function formatCounts(map: CountMap, maxItems = 6): string {
  const entries = sortedEntries(map).filter(([, count]) => count > 0)
  if (entries.length === 0) return 'none'

  const shown = entries.slice(0, maxItems)
  const hidden = entries.slice(maxItems).reduce((sum, [, count]) => sum + count, 0)
  const parts = shown.map(([key, count]) => `${escapeHtml(key)} ${count}`)
  if (hidden > 0) parts.push(`other ${hidden}`)
  return parts.join(', ')
}

function formatLifecycleCounts(map: Record<ProductLifecycleStage, number>): string {
  return formatCounts(map)
}

function compactDate(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : 'none'
}

export function formatCatalogQaReport(report: CatalogQaReport): string {
  const total = typeof report.totalProducts === 'number' ? report.totalProducts : null
  const coverage = total === null
    ? String(report.sampleSize)
    : `${report.sampleSize}/${total}`
  const limit = typeof report.sampleLimit === 'number' ? ` (limit ${report.sampleLimit})` : ''

  const lines: Array<string | null> = [
    '<b>Catalog QA (D-353)</b>',
    `Read-only sample: <b>${coverage}</b>${limit}`,
    `Generated: <code>${compactDate(report.generatedAt)}</code>`,
    '',
    `<b>Status:</b> ${formatCounts(report.distributions.status)}`,
    `<b>Lifecycle:</b> ${formatLifecycleCounts(report.distributions.lifecycle)}`,
    `<b>Source:</b> ${formatCounts(report.distributions.source)}`,
    `<b>Category:</b> ${formatCounts(report.distributions.category)}`,
    '',
    '<b>Missing / Incomplete</b>',
    `price ${report.missing.price}, category ${report.missing.category}, media ${report.missing.usableMedia}, stock ${report.missing.sellableStock}`,
    `stockNo ${report.missing.stockNumber}, slug ${report.missing.slug}, targets ${report.missing.targets}, channel issues ${report.missing.channelSelectionIssues}`,
    `unsupported/retired targets ${report.missing.unsupportedTargets}`,
    '',
    '<b>Pipeline</b>',
    `publish-ready ${report.readiness.ready}, partial ${report.readiness.partiallyReady}, not-ready ${report.readiness.notReady}`,
    `content pending ${report.pipeline.contentPending}, audit pending ${report.pipeline.auditPending}, image QC pending ${report.pipeline.imageQcPending}, image rejected ${report.pipeline.imageQcRejected}`,
    `brand-safety blocked ${report.pipeline.brandSafetyBlocked}`,
    `<b>Top blockers:</b> ${formatCounts(report.readiness.blockersByDimension, 6)}`,
    '',
    '<b>Shopier</b>',
    `queued ${report.shopier.queued}, syncing ${report.shopier.syncing}, synced ${report.shopier.synced}, error ${report.shopier.error}, not_synced ${report.shopier.notSynced}, missing ${report.shopier.missing}`,
    report.shopier.other && Object.keys(report.shopier.other).length > 0
      ? `other: ${formatCounts(report.shopier.other)}`
      : null,
    '',
    '<b>Draft Age</b>',
    `drafts ${report.draftAge.drafts}, &gt;2d ${report.draftAge.staleOver2Days}, &gt;7d ${report.draftAge.staleOver7Days}, oldest ${report.draftAge.oldestDraftAgeDays ?? 'none'}d`,
    `last updated ${compactDate(report.recency.lastUpdatedAt)}, oldest updated ${compactDate(report.recency.oldestUpdatedAt)}`,
    '',
    '<i>Read-only report. Batch mutation/publish remains deferred to D-356.</i>',
  ].filter((line): line is string => line !== null)

  return lines.join('\n')
}
