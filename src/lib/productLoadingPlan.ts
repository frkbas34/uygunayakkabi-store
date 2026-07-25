import { buildCatalogQaReport, type CatalogQaReport, type CatalogQaProduct } from './catalogQa'
import {
  buildCategoryFillReport,
  type CategoryFillCategoryReport,
  type CategoryFillReport,
  type CategoryFillTarget,
} from './categoryFill'
import { scanProductBrandSafety } from './brandSafety'
import { evaluateImageQualityGate } from './imageQualityGate'
import { countUsableMediaRows } from './productMedia'
import { deriveProductLifecycle } from './productLifecycle'
import { isPublicStorefrontProduct } from './merchandising'
import { resolveConfiguredTargets } from './productChannels'
import { summarizeProductStock } from './productStock'

export type LoadingPlanPriority = 'critical' | 'high' | 'medium' | 'low'
export type LoadingPlanActionKind =
  | 'brand_safety'
  | 'image_qc'
  | 'shopier_errors'
  | 'finish_backlog'
  | 'load_more'
  | 'publish_ready_backlog'
  | 'catalog_hygiene'
  | 'stale_drafts'
  | 'live_smoke'

export interface ProductLoadingPlanAction {
  kind: LoadingPlanActionKind
  priority: LoadingPlanPriority
  title: string
  count?: number
  category?: string
  reason: string
  suggestedCommand?: string
}

export type LoadingWorkItemReason =
  | 'brand_safety'
  | 'image_qc_failed'
  | 'image_qc_pending'
  | 'shopier_error'
  | 'missing_core'
  | 'stale_draft'
  | 'publish_ready_backlog'
  | 'category_backlog'

export interface ProductLoadingWorkItem {
  id: string
  ref: string
  title: string
  status: string
  category: string
  priority: LoadingPlanPriority
  reasons: LoadingWorkItemReason[]
  operatorLinks: {
    adminUrl: string | null
    productUrl: string | null
  }
  flowCommand: string
  runtimeFlowCommand: string
  suggestedCommand: string
}

export interface ProductLoadingBatchSummary {
  totalCandidates: number
  priorityCounts: Record<LoadingPlanPriority, number>
  blockerCounts: {
    brandSafety: number
    imageQc: number
    shopierErrors: number
    missingCore: number
    staleDrafts: number
    backlog: number
  }
  firstCommand: string | null
  firstFlowCommand: string | null
  firstRuntimeFlowCommand: string | null
  focus: {
    kind:
      | 'brand_safety'
      | 'image_qc'
      | 'shopier_errors'
      | 'core_fields'
      | 'stale_drafts'
      | 'backlog'
      | 'live_smoke'
    label: string
    reason: string
    nextSafeRead: string
    refs: string[]
    nextSafeReads: string[]
    queue: Array<{
      ref: string
      command: string
      reasons: LoadingWorkItemReason[]
    }>
  }
}

export interface ProductLoadingPlan {
  generatedAt: string
  sampleSize: number
  sampleLimit?: number
  totalProducts?: number
  catalog: CatalogQaReport
  categoryFill: CategoryFillReport
  actions: ProductLoadingPlanAction[]
  worklist: ProductLoadingWorkItem[]
  batchSummary: ProductLoadingBatchSummary
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function compactDate(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function displayValue(value: unknown, fallback = 'missing'): string {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    for (const key of ['stockNumber', 'sku', 'slug', 'title', 'name', 'id']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate)
    }
  }
  return fallback
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function positiveNumber(value: unknown): boolean {
  const n = Number(value ?? 0)
  return Number.isFinite(n) && n > 0
}

function ageDays(value: unknown, now: Date): number | null {
  if (!nonEmptyString(value)) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, Math.floor((now.getTime() - time) / MS_PER_DAY))
}

function priorityRank(priority: LoadingPlanPriority): number {
  switch (priority) {
    case 'critical': return 0
    case 'high': return 1
    case 'medium': return 2
    case 'low': return 3
  }
}

function actionRank(kind: LoadingPlanActionKind): number {
  switch (kind) {
    case 'brand_safety': return 0
    case 'image_qc': return 1
    case 'shopier_errors': return 2
    case 'finish_backlog': return 3
    case 'publish_ready_backlog': return 4
    case 'load_more': return 5
    case 'catalog_hygiene': return 6
    case 'stale_drafts': return 7
    case 'live_smoke': return 8
  }
}

function addAction(
  actions: ProductLoadingPlanAction[],
  action: ProductLoadingPlanAction | null,
): void {
  if (!action) return
  actions.push(action)
}

function actionFromCategory(category: CategoryFillCategoryReport): ProductLoadingPlanAction | null {
  if (category.action === 'maintain' || category.action === 'optional_watch') return null

  if (category.action === 'load_more') {
    return {
      kind: 'load_more',
      priority: category.priority === 'core' ? 'high' : 'medium',
      title: `Load more ${category.category}`,
      category: category.category,
      count: category.loadNeededAfterReady,
      reason: `${category.label} needs ${category.loadNeededAfterReady} more own-products after ready backlog.`,
      suggestedCommand: '/categoryfill',
    }
  }

  if (category.action === 'finish_backlog') {
    return {
      kind: 'finish_backlog',
      priority: 'high',
      title: `Finish ${category.category} backlog`,
      category: category.category,
      count: category.needsReview + category.draft,
      reason: `${category.category} can approach target by fixing existing drafts/backlog before loading more.`,
      suggestedCommand: '/catalogqa',
    }
  }

  return {
    kind: 'publish_ready_backlog',
    priority: 'medium',
    title: `Review ready ${category.category} backlog`,
    category: category.category,
    count: category.publishReady,
    reason: `${category.category} has publish-ready backlog that can reduce the category gap after operator review.`,
    suggestedCommand: '/productflow <sn-or-id>',
  }
}

function buildActions(catalog: CatalogQaReport, categoryFill: CategoryFillReport): ProductLoadingPlanAction[] {
  const actions: ProductLoadingPlanAction[] = []

  addAction(actions, catalog.pipeline.brandSafetyBlocked > 0 ? {
    kind: 'brand_safety',
    priority: 'critical',
    title: 'Clear brand-safety blockers',
    count: catalog.pipeline.brandSafetyBlocked,
    reason: 'Protected-brand or risky-claim products must be rewritten, drafted, or excluded before publishing.',
    suggestedCommand: '/brandplan',
  } : null)

  addAction(actions, catalog.pipeline.imageQcRejected > 0 ? {
    kind: 'image_qc',
    priority: 'high',
    title: 'Regenerate failed image QC products',
    count: catalog.pipeline.imageQcRejected,
    reason: 'Rejected generated images cannot become publish/ad candidates until fixed.',
    suggestedCommand: '/imageqc <sn-or-id>',
  } : null)

  addAction(actions, catalog.pipeline.imageQcPending > 0 ? {
    kind: 'image_qc',
    priority: 'high',
    title: 'Review pending generated images',
    count: catalog.pipeline.imageQcPending,
    reason: 'Generated images need explicit QC PASS before activation, Shopier queueing, or ad readiness.',
    suggestedCommand: '/imageqc <sn-or-id>',
  } : null)

  addAction(actions, catalog.shopier.error > 0 ? {
    kind: 'shopier_errors',
    priority: 'high',
    title: 'Triage Shopier sync errors',
    count: catalog.shopier.error,
    reason: 'Sync errors should be classified before loading more products into the same queue.',
    suggestedCommand: '/shopier errors',
  } : null)

  for (const category of categoryFill.loadingOrder.slice(0, 4)) {
    addAction(actions, actionFromCategory(category))
  }

  const missingCore =
    catalog.missing.price +
    catalog.missing.category +
    catalog.missing.usableMedia +
    catalog.missing.sellableStock +
    catalog.missing.stockNumber +
    catalog.missing.slug +
    catalog.missing.targets

  addAction(actions, missingCore > 0 ? {
    kind: 'catalog_hygiene',
    priority: 'medium',
    title: 'Fix catalog completeness gaps',
    count: missingCore,
    reason: 'Missing price, category, media, stock, stock number, slug, or active targets slow down product loading.',
    suggestedCommand: '/catalogqa',
  } : null)

  addAction(actions, catalog.draftAge.staleOver7Days > 0 ? {
    kind: 'stale_drafts',
    priority: 'medium',
    title: 'Triage stale drafts',
    count: catalog.draftAge.staleOver7Days,
    reason: 'Old drafts hide loading bottlenecks and should be finished, rejected, or explicitly parked.',
    suggestedCommand: '/catalogqa',
  } : null)

  if (actions.length === 0) {
    actions.push({
      kind: 'live_smoke',
      priority: 'low',
      title: 'Run operator live smoke',
      reason: 'No local loading blockers were found in this sample; the next proof is live operator-path smoke.',
      suggestedCommand: '/productflow <sn-or-id>',
    })
  }

  return actions.sort((a, b) =>
    priorityRank(a.priority) - priorityRank(b.priority) ||
    actionRank(a.kind) - actionRank(b.kind) ||
    (b.count ?? 0) - (a.count ?? 0) ||
    a.title.localeCompare(b.title),
  )
}

function pushReason(
  reasons: LoadingWorkItemReason[],
  reason: LoadingWorkItemReason,
): void {
  if (!reasons.includes(reason)) reasons.push(reason)
}

function priorityForReasons(reasons: LoadingWorkItemReason[]): LoadingPlanPriority {
  if (reasons.includes('brand_safety')) return 'critical'
  if (
    reasons.includes('image_qc_failed') ||
    reasons.includes('image_qc_pending') ||
    reasons.includes('shopier_error')
  ) return 'high'
  if (
    reasons.includes('missing_core') ||
    reasons.includes('stale_draft') ||
    reasons.includes('publish_ready_backlog') ||
    reasons.includes('category_backlog')
  ) return 'medium'
  return 'low'
}

function brandSafetyExposureRank(item: ProductLoadingWorkItem): number {
  if (!item.reasons.includes('brand_safety')) return 3
  if (item.status === 'active') return 0
  if (item.status === 'soldout' || item.status === 'sold_out') return 1
  if (item.status === 'draft') return 2
  return 3
}

function commandForReasons(ref: string, reasons: LoadingWorkItemReason[]): string {
  if (reasons.includes('image_qc_failed') || reasons.includes('image_qc_pending')) return `/imageqc ${ref}`
  if (reasons.includes('shopier_error')) return '/shopier errors'
  return `/productflow ${ref}`
}

function productFlowCommand(ref: string): string {
  return `/productflow ${ref}`
}

function productFlowRuntimeCommand(ref: string): string {
  return `npm run smoke:product-flow:read -- --product=${ref} --confirm-read-only`
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

function buildOperatorLinks(product: CatalogQaProduct): ProductLoadingWorkItem['operatorLinks'] {
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

function hasMissingCore(product: CatalogQaProduct): boolean {
  const category = displayValue(product.category)
  const usableMedia =
    countUsableMediaRows(product.images) +
    countUsableMediaRows(product.generativeGallery)
  const stock = summarizeProductStock(product)
  return (
    !positiveNumber(product.price) ||
    category === 'missing' ||
    usableMedia === 0 ||
    !stock.hasSellableStock ||
    !nonEmptyString(product.stockNumber) ||
    !nonEmptyString(product.slug) ||
    resolveConfiguredTargets(product).length === 0
  )
}

function buildWorklist(
  products: CatalogQaProduct[],
  categoryFill: CategoryFillReport,
  now: Date,
): ProductLoadingWorkItem[] {
  const categoriesNeedingBacklog = new Set(
    categoryFill.loadingOrder
      .filter((category) => category.action === 'finish_backlog')
      .map((category) => category.category),
  )
  const categoriesWithReadyBacklog = new Set(
    categoryFill.loadingOrder
      .filter((category) => category.action === 'publish_ready_backlog')
      .map((category) => category.category),
  )

  const items: ProductLoadingWorkItem[] = []

  for (const product of products) {
    const reasons: LoadingWorkItemReason[] = []
    const category = displayValue(product.category)
    const lifecycle = deriveProductLifecycle(product)
    const brandSafety = scanProductBrandSafety(product)
    const imageQuality = evaluateImageQualityGate(product)
    const shopierStatus = displayValue(product.sourceMeta?.shopierSyncStatus)

    if (!brandSafety.safe) pushReason(reasons, 'brand_safety')
    if (imageQuality.level === 'fail') pushReason(reasons, 'image_qc_failed')
    else if (!imageQuality.publishable) pushReason(reasons, 'image_qc_pending')
    if (shopierStatus === 'error') pushReason(reasons, 'shopier_error')
    if (hasMissingCore(product)) pushReason(reasons, 'missing_core')
    if (displayValue(product.status, 'draft') === 'draft') {
      const draftAge = ageDays(product.createdAt ?? product.updatedAt, now)
      if (draftAge !== null && draftAge > 7) pushReason(reasons, 'stale_draft')
    }
    if (categoriesNeedingBacklog.has(category) && (lifecycle === 'draft' || lifecycle === 'needs_review')) {
      pushReason(reasons, 'category_backlog')
    }
    if (categoriesWithReadyBacklog.has(category) && lifecycle === 'ready_to_publish') {
      pushReason(reasons, 'publish_ready_backlog')
    }

    if (reasons.length === 0) continue

    const id = displayValue(product.id)
    const ref = nonEmptyString(product.stockNumber) ? product.stockNumber.trim() : id
    const priority = priorityForReasons(reasons)
    const status = displayValue(product.status, 'draft')

    items.push({
      id,
      ref,
      title: displayValue(product.title, `Product ${id}`),
      status,
      category,
      priority,
      reasons,
      operatorLinks: buildOperatorLinks(product),
      flowCommand: productFlowCommand(ref),
      runtimeFlowCommand: productFlowRuntimeCommand(ref),
      suggestedCommand: commandForReasons(ref, reasons),
    })
  }

  return items
    .sort((a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      brandSafetyExposureRank(a) - brandSafetyExposureRank(b) ||
      b.reasons.length - a.reasons.length ||
      a.category.localeCompare(b.category) ||
      a.title.localeCompare(b.title),
    )
    .slice(0, 8)
}

function buildBatchSummary(worklist: ProductLoadingWorkItem[]): ProductLoadingBatchSummary {
  const priorityCounts: Record<LoadingPlanPriority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }
  const blockerCounts: ProductLoadingBatchSummary['blockerCounts'] = {
    brandSafety: 0,
    imageQc: 0,
    shopierErrors: 0,
    missingCore: 0,
    staleDrafts: 0,
    backlog: 0,
  }

  for (const item of worklist) {
    priorityCounts[item.priority] += 1
    if (item.reasons.includes('brand_safety')) blockerCounts.brandSafety += 1
    if (item.reasons.includes('image_qc_failed') || item.reasons.includes('image_qc_pending')) {
      blockerCounts.imageQc += 1
    }
    if (item.reasons.includes('shopier_error')) blockerCounts.shopierErrors += 1
    if (item.reasons.includes('missing_core')) blockerCounts.missingCore += 1
    if (item.reasons.includes('stale_draft')) blockerCounts.staleDrafts += 1
    if (item.reasons.includes('category_backlog') || item.reasons.includes('publish_ready_backlog')) {
      blockerCounts.backlog += 1
    }
  }

  const first = worklist[0] ?? null
  const firstProductFlow = first?.flowCommand ?? '/productflow <sn-or-id>'
  const firstImageCommand = first?.suggestedCommand.startsWith('/imageqc')
    ? first.suggestedCommand
    : '/imageqc <sn-or-id>'
  const focusItems = (kind: ProductLoadingBatchSummary['focus']['kind']): ProductLoadingWorkItem[] => {
    switch (kind) {
      case 'brand_safety':
        return worklist.filter((item) => item.reasons.includes('brand_safety'))
      case 'image_qc':
        return worklist.filter((item) =>
          item.reasons.includes('image_qc_failed') || item.reasons.includes('image_qc_pending'),
        )
      case 'shopier_errors':
        return worklist.filter((item) => item.reasons.includes('shopier_error'))
      case 'core_fields':
        return worklist.filter((item) => item.reasons.includes('missing_core'))
      case 'stale_drafts':
        return worklist.filter((item) => item.reasons.includes('stale_draft'))
      case 'backlog':
        return worklist.filter((item) =>
          item.reasons.includes('category_backlog') || item.reasons.includes('publish_ready_backlog'),
        )
      case 'live_smoke':
        return []
    }
  }
  const withQueue = <T extends Omit<ProductLoadingBatchSummary['focus'], 'refs' | 'nextSafeReads' | 'queue'>>(
    focus: T,
  ): ProductLoadingBatchSummary['focus'] => {
    const related = focusItems(focus.kind).slice(0, 3)
    return {
      ...focus,
      refs: related.map((item) => item.ref),
      nextSafeReads: related.map((item) =>
        focus.kind === 'image_qc' && item.suggestedCommand.startsWith('/imageqc')
          ? item.suggestedCommand
          : item.flowCommand,
      ),
      queue: related.map((item) => ({
        ref: item.ref,
        command: focus.kind === 'image_qc' && item.suggestedCommand.startsWith('/imageqc')
          ? item.suggestedCommand
          : item.flowCommand,
        reasons: item.reasons,
      })),
    }
  }
  const focus = (() => {
    if (blockerCounts.brandSafety > 0) {
      return withQueue({
        kind: 'brand_safety' as const,
        label: 'Brand-safety cleanup',
        reason: `${blockerCounts.brandSafety} worklist product(s) need protected-brand or risky-claim review before publish or external dispatch.`,
        nextSafeRead: firstProductFlow,
      })
    }
    if (blockerCounts.imageQc > 0) {
      return withQueue({
        kind: 'image_qc' as const,
        label: 'Image QC',
        reason: `${blockerCounts.imageQc} worklist product(s) need generated-image PASS/FAIL/regen decisions before publish readiness.`,
        nextSafeRead: firstImageCommand,
      })
    }
    if (blockerCounts.shopierErrors > 0) {
      return withQueue({
        kind: 'shopier_errors' as const,
        label: 'Shopier error triage',
        reason: `${blockerCounts.shopierErrors} worklist product(s) have Shopier sync errors that should be classified before queueing more products.`,
        nextSafeRead: '/shopier errors',
      })
    }
    if (blockerCounts.missingCore > 0) {
      return withQueue({
        kind: 'core_fields' as const,
        label: 'Core product fields',
        reason: `${blockerCounts.missingCore} worklist product(s) are missing price, media, stock, slug, category, stock number, or channel targets.`,
        nextSafeRead: firstProductFlow,
      })
    }
    if (blockerCounts.staleDrafts > 0) {
      return withQueue({
        kind: 'stale_drafts' as const,
        label: 'Stale draft triage',
        reason: `${blockerCounts.staleDrafts} worklist draft(s) are older than 7 days and should be finished, parked, or rejected by the operator.`,
        nextSafeRead: firstProductFlow,
      })
    }
    if (blockerCounts.backlog > 0) {
      return withQueue({
        kind: 'backlog' as const,
        label: 'Category backlog',
        reason: `${blockerCounts.backlog} worklist product(s) can help category coverage after product-flow review.`,
        nextSafeRead: firstProductFlow,
      })
    }
    return {
      kind: 'live_smoke' as const,
      label: 'Live smoke',
      reason: 'No product-specific loading blockers were found in this sample; use the operator smoke path for the next proof.',
      nextSafeRead: '/smokeplan',
      refs: [],
      nextSafeReads: [],
      queue: [],
    }
  })()

  return {
    totalCandidates: worklist.length,
    priorityCounts,
    blockerCounts,
    firstCommand: first?.suggestedCommand ?? null,
    firstFlowCommand: first?.flowCommand ?? null,
    firstRuntimeFlowCommand: first?.runtimeFlowCommand ?? null,
    focus,
  }
}

export function buildProductLoadingPlan(
  products: CatalogQaProduct[],
  options: {
    now?: Date
    sampleLimit?: number
    totalProducts?: number
    categoryTargets?: CategoryFillTarget[]
  } = {},
): ProductLoadingPlan {
  const now = options.now ?? new Date()
  const catalog = buildCatalogQaReport(products, {
    now,
    sampleLimit: options.sampleLimit,
    totalProducts: options.totalProducts,
  })
  const categoryFill = buildCategoryFillReport(products, {
    now,
    sampleLimit: options.sampleLimit,
    totalProducts: options.totalProducts,
    targets: options.categoryTargets,
  })
  const worklist = buildWorklist(products, categoryFill, now)

  return {
    generatedAt: now.toISOString(),
    sampleSize: products.length,
    sampleLimit: options.sampleLimit,
    totalProducts: options.totalProducts,
    catalog,
    categoryFill,
    actions: buildActions(catalog, categoryFill),
    worklist,
    batchSummary: buildBatchSummary(worklist),
  }
}

function formatPriority(priority: LoadingPlanPriority): string {
  switch (priority) {
    case 'critical': return 'critical'
    case 'high': return 'high'
    case 'medium': return 'medium'
    case 'low': return 'low'
  }
}

function formatReason(reason: LoadingWorkItemReason): string {
  switch (reason) {
    case 'brand_safety': return 'brand'
    case 'image_qc_failed': return 'image fail'
    case 'image_qc_pending': return 'image review'
    case 'shopier_error': return 'Shopier error'
    case 'missing_core': return 'missing core'
    case 'stale_draft': return 'stale draft'
    case 'publish_ready_backlog': return 'ready backlog'
    case 'category_backlog': return 'category backlog'
  }
}

export function formatProductLoadingPlan(plan: ProductLoadingPlan): string {
  const total = typeof plan.totalProducts === 'number' ? plan.totalProducts : null
  const coverage = total === null ? String(plan.sampleSize) : `${plan.sampleSize}/${total}`
  const limit = typeof plan.sampleLimit === 'number' ? ` (limit ${plan.sampleLimit})` : ''
  const topActions = plan.actions.slice(0, 8)

  const lines: string[] = [
    '<b>Product Loading Plan (D-387/D-457)</b>',
    `Read-only sample: <b>${coverage}</b>${limit}`,
    `Generated: <code>${compactDate(plan.generatedAt)}</code>`,
    '',
    '<b>Today Focus</b>',
  ]

  topActions.forEach((action, index) => {
    const count = typeof action.count === 'number' ? ` (${action.count})` : ''
    const command = action.suggestedCommand ? ` -> <code>${escapeHtml(action.suggestedCommand)}</code>` : ''
    lines.push(
      `${index + 1}. <b>${escapeHtml(action.title)}</b>${count} ` +
        `[${formatPriority(action.priority)}]${command}`,
    )
    lines.push(`   ${escapeHtml(action.reason)}`)
  })

  lines.push('')
  lines.push('<b>Batch Summary</b>')
  lines.push(
    `candidates ${plan.batchSummary.totalCandidates}, critical ${plan.batchSummary.priorityCounts.critical}, ` +
      `high ${plan.batchSummary.priorityCounts.high}, medium ${plan.batchSummary.priorityCounts.medium}`,
  )
  lines.push(
    `blockers: brand ${plan.batchSummary.blockerCounts.brandSafety}, image ${plan.batchSummary.blockerCounts.imageQc}, ` +
      `Shopier ${plan.batchSummary.blockerCounts.shopierErrors}, core ${plan.batchSummary.blockerCounts.missingCore}, ` +
      `stale ${plan.batchSummary.blockerCounts.staleDrafts}, backlog ${plan.batchSummary.blockerCounts.backlog}`,
  )
  lines.push(
    `focus: <b>${escapeHtml(plan.batchSummary.focus.label)}</b> - ` +
      `${escapeHtml(plan.batchSummary.focus.reason)}`,
  )
  lines.push(`next safe read: <code>${escapeHtml(plan.batchSummary.focus.nextSafeRead)}</code>`)
  if (plan.batchSummary.focus.refs.length > 0) {
    lines.push(`focus refs: ${plan.batchSummary.focus.refs.map((ref) => `<code>${escapeHtml(ref)}</code>`).join(', ')}`)
    lines.push(
      `focus queue: ${plan.batchSummary.focus.nextSafeReads
        .map((command) => `<code>${escapeHtml(command)}</code>`)
        .join(' | ')}`,
    )
    for (const item of plan.batchSummary.focus.queue) {
      const reasons = item.reasons.map(formatReason).join(', ')
      lines.push(
        `focus detail: <b>${escapeHtml(item.ref)}</b> - ${escapeHtml(reasons)} -> ` +
          `<code>${escapeHtml(item.command)}</code>`,
      )
    }
  }
  if (plan.batchSummary.firstCommand) {
    lines.push(
      `first: <code>${escapeHtml(plan.batchSummary.firstCommand)}</code>; flow ` +
        `<code>${escapeHtml(plan.batchSummary.firstFlowCommand ?? '')}</code>; smoke ` +
        `<code>${escapeHtml(plan.batchSummary.firstRuntimeFlowCommand ?? '')}</code>`,
    )
  } else {
    lines.push('first: no product-specific command in this sample')
  }

  const loadingOrder = plan.categoryFill.loadingOrder.slice(0, 3)
  lines.push('')
  lines.push('<b>Category Load Order</b>')
  if (loadingOrder.length === 0) {
    lines.push('Core/seasonal minimums are covered in this sample.')
  } else {
    for (const category of loadingOrder) {
      lines.push(
        `- <b>${escapeHtml(category.category)}</b>: active ${category.active}, ready ${category.publishReady}, ` +
          `backlog ${category.needsReview + category.draft}, gap ${category.gapToMin}`,
      )
    }
  }

  lines.push('')
  lines.push('<b>First Product Worklist</b>')
  if (plan.worklist.length === 0) {
    lines.push('No specific product fix candidates in this sample.')
  } else {
    plan.worklist.slice(0, 5).forEach((item, index) => {
      const reasons = item.reasons.map(formatReason).join(', ')
      lines.push(
        `${index + 1}. <b>${escapeHtml(item.ref)}</b> ${escapeHtml(item.title)} ` +
          `[${formatPriority(item.priority)}; ${escapeHtml(item.status)}]`,
      )
      lines.push(
        `   ${escapeHtml(item.category)} - ${escapeHtml(reasons)} -> ` +
          `<code>${escapeHtml(item.suggestedCommand)}</code>; flow ` +
          `<code>${escapeHtml(item.flowCommand)}</code>; smoke ` +
          `<code>${escapeHtml(item.runtimeFlowCommand)}</code>`,
      )
      const links: string[] = []
      if (item.operatorLinks.adminUrl) {
        links.push(`<a href="${escapeHtml(item.operatorLinks.adminUrl)}">admin</a>`)
      }
      if (item.operatorLinks.productUrl) {
        links.push(`<a href="${escapeHtml(item.operatorLinks.productUrl)}">PDP</a>`)
      }
      if (links.length > 0) lines.push(`   links: ${links.join(' / ')}`)
    })
  }

  lines.push('')
  lines.push('<b>Blocker Snapshot</b>')
  lines.push(
    `brand ${plan.catalog.pipeline.brandSafetyBlocked}, image pending ${plan.catalog.pipeline.imageQcPending}, ` +
      `image fail ${plan.catalog.pipeline.imageQcRejected}, Shopier errors ${plan.catalog.shopier.error}`,
  )
  lines.push(
    `missing: price ${plan.catalog.missing.price}, category ${plan.catalog.missing.category}, ` +
      `media ${plan.catalog.missing.usableMedia}, stock ${plan.catalog.missing.sellableStock}, targets ${plan.catalog.missing.targets}`,
  )
  lines.push(
    `ready ${plan.catalog.readiness.ready}, partial ${plan.catalog.readiness.partiallyReady}, ` +
      `not-ready ${plan.catalog.readiness.notReady}, stale drafts &gt;7d ${plan.catalog.draftAge.staleOver7Days}`,
  )
  lines.push('')
  lines.push('<i>Read-only plan. Own-products-only. No SupplierScout, no retired channels, no publish, no Shopier queue, no provider call, no ads.</i>')

  return lines.join('\n')
}
