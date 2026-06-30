import { deriveProductLifecycle, type ProductLifecycleStage } from './productLifecycle'
import { evaluatePublishReadiness } from './publishReadiness'

type CountMap = Record<string, number>

export type CategoryFillProduct = Record<string, any>
export type CategoryFillPriority = 'core' | 'seasonal' | 'optional'
export type CategoryFillAction = 'maintain' | 'publish_ready_backlog' | 'finish_backlog' | 'load_more' | 'optional_watch'

export interface CategoryFillTarget {
  category: string
  label: string
  priority: CategoryFillPriority
  targetMin: number
  targetMax: number | null
  note: string
}

export interface CategoryFillCategoryReport {
  category: string
  label: string
  priority: CategoryFillPriority
  targetMin: number
  targetMax: number | null
  note: string
  total: number
  active: number
  publishReady: number
  needsReview: number
  draft: number
  soldOut: number
  blocked: number
  gapToMin: number
  loadNeededAfterReady: number
  action: CategoryFillAction
}

export interface CategoryFillReport {
  generatedAt: string
  sampleSize: number
  sampleLimit?: number
  totalProducts?: number
  categories: CategoryFillCategoryReport[]
  loadingOrder: CategoryFillCategoryReport[]
  missingCategory: number
  legacyOrUnknownCategories: CountMap
  totals: {
    active: number
    publishReady: number
    needsReview: number
    draft: number
    soldOut: number
    blocked: number
  }
}

export const CATEGORY_FILL_TARGETS: CategoryFillTarget[] = [
  {
    category: 'Klasik',
    label: 'Classic / loafer',
    priority: 'core',
    targetMin: 40,
    targetMax: 60,
    note: 'core ad-ready depth',
  },
  {
    category: 'Spor',
    label: 'Sneaker / sport',
    priority: 'core',
    targetMin: 30,
    targetMax: 50,
    note: 'core ad-ready depth',
  },
  {
    category: 'Günlük',
    label: 'Daily',
    priority: 'core',
    targetMin: 30,
    targetMax: 50,
    note: 'core ad-ready depth',
  },
  {
    category: 'Bot',
    label: 'Boot / winter',
    priority: 'seasonal',
    targetMin: 10,
    targetMax: 25,
    note: 'seasonal baseline before winter push',
  },
  {
    category: 'Terlik',
    label: 'Slipper / sandal',
    priority: 'seasonal',
    targetMin: 8,
    targetMax: 20,
    note: 'seasonal baseline before warm-weather push',
  },
  {
    category: 'Cüzdan',
    label: 'Wallet',
    priority: 'optional',
    targetMin: 0,
    targetMax: 15,
    note: 'optional add-on category',
  },
]

const CATEGORY_SET = new Set(CATEGORY_FILL_TARGETS.map((target) => target.category))

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function increment(map: CountMap, key: string): void {
  map[key] = (map[key] ?? 0) + 1
}

function emptyCategoryReport(target: CategoryFillTarget): CategoryFillCategoryReport {
  return {
    ...target,
    total: 0,
    active: 0,
    publishReady: 0,
    needsReview: 0,
    draft: 0,
    soldOut: 0,
    blocked: 0,
    gapToMin: target.targetMin,
    loadNeededAfterReady: target.targetMin,
    action: target.priority === 'optional' ? 'optional_watch' : 'load_more',
  }
}

function isPublishReadyBacklog(product: CategoryFillProduct, lifecycle: ProductLifecycleStage): boolean {
  if (lifecycle === 'active' || lifecycle === 'sold_out') return false
  const readiness = evaluatePublishReadiness({ ...product, id: product.id ?? 'unknown' })
  return readiness.level === 'ready'
}

function resolveAction(report: CategoryFillCategoryReport): CategoryFillAction {
  if (report.priority === 'optional' && report.targetMin === 0) return 'optional_watch'
  if (report.active >= report.targetMin) return 'maintain'
  if (report.active + report.publishReady >= report.targetMin) return 'publish_ready_backlog'
  if (report.active + report.publishReady + report.needsReview + report.draft >= report.targetMin) {
    return 'finish_backlog'
  }
  return 'load_more'
}

function priorityRank(priority: CategoryFillPriority): number {
  if (priority === 'core') return 0
  if (priority === 'seasonal') return 1
  return 2
}

function actionRank(action: CategoryFillAction): number {
  switch (action) {
    case 'load_more': return 0
    case 'finish_backlog': return 1
    case 'publish_ready_backlog': return 2
    case 'maintain': return 3
    case 'optional_watch': return 4
  }
}

export function buildCategoryFillReport(
  products: CategoryFillProduct[],
  options: {
    now?: Date
    sampleLimit?: number
    totalProducts?: number
    targets?: CategoryFillTarget[]
  } = {},
): CategoryFillReport {
  const now = options.now ?? new Date()
  const targets = options.targets ?? CATEGORY_FILL_TARGETS
  const reports = new Map<string, CategoryFillCategoryReport>()
  const legacyOrUnknownCategories: CountMap = {}
  let missingCategory = 0

  const totals = {
    active: 0,
    publishReady: 0,
    needsReview: 0,
    draft: 0,
    soldOut: 0,
    blocked: 0,
  }

  for (const target of targets) {
    reports.set(target.category, emptyCategoryReport(target))
  }

  for (const product of products) {
    const category = nonEmptyString(product.category) ? product.category.trim() : null
    if (!category) {
      missingCategory += 1
      continue
    }

    const report = reports.get(category)
    if (!report) {
      increment(legacyOrUnknownCategories, category)
      continue
    }

    const lifecycle = deriveProductLifecycle(product)
    const publishReady = isPublishReadyBacklog(product, lifecycle)

    report.total += 1
    if (lifecycle === 'active') {
      report.active += 1
      totals.active += 1
    } else if (lifecycle === 'sold_out') {
      report.soldOut += 1
      totals.soldOut += 1
    } else if (publishReady) {
      report.publishReady += 1
      totals.publishReady += 1
    } else if (lifecycle === 'needs_review') {
      report.needsReview += 1
      report.blocked += 1
      totals.needsReview += 1
      totals.blocked += 1
    } else {
      report.draft += 1
      report.blocked += 1
      totals.draft += 1
      totals.blocked += 1
    }
  }

  const categories = [...reports.values()].map((report) => {
    report.gapToMin = Math.max(0, report.targetMin - report.active)
    report.loadNeededAfterReady = Math.max(0, report.targetMin - report.active - report.publishReady)
    report.action = resolveAction(report)
    return report
  })

  const loadingOrder = [...categories]
    .filter((report) => report.action !== 'maintain' && report.action !== 'optional_watch')
    .sort((a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      actionRank(a.action) - actionRank(b.action) ||
      b.loadNeededAfterReady - a.loadNeededAfterReady ||
      a.category.localeCompare(b.category),
    )

  return {
    generatedAt: now.toISOString(),
    sampleSize: products.length,
    sampleLimit: options.sampleLimit,
    totalProducts: options.totalProducts,
    categories,
    loadingOrder,
    missingCategory,
    legacyOrUnknownCategories,
    totals,
  }
}

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

function formatTarget(report: CategoryFillCategoryReport): string {
  return report.targetMax === null
    ? `${report.targetMin}+`
    : `${report.targetMin}-${report.targetMax}`
}

function formatAction(action: CategoryFillAction): string {
  switch (action) {
    case 'maintain': return 'maintain'
    case 'publish_ready_backlog': return 'publish ready backlog'
    case 'finish_backlog': return 'finish backlog'
    case 'load_more': return 'load more'
    case 'optional_watch': return 'optional watch'
  }
}

function sortedCountEntries(map: CountMap): Array<[string, number]> {
  return Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function formatCountMap(map: CountMap): string {
  const entries = sortedCountEntries(map)
  if (entries.length === 0) return 'none'
  return entries.map(([key, count]) => `${escapeHtml(key)} ${count}`).join(', ')
}

export function formatCategoryFillReport(report: CategoryFillReport): string {
  const total = typeof report.totalProducts === 'number' ? report.totalProducts : null
  const coverage = total === null ? String(report.sampleSize) : `${report.sampleSize}/${total}`
  const limit = typeof report.sampleLimit === 'number' ? ` (limit ${report.sampleLimit})` : ''

  const core = report.categories.filter((category) => category.priority === 'core')
  const seasonal = report.categories.filter((category) => category.priority === 'seasonal')
  const optional = report.categories.filter((category) => category.priority === 'optional')
  const loadingOrder = report.loadingOrder.slice(0, 5)

  const lines: string[] = [
    '<b>Category Fill Strategy (D-354)</b>',
    `Read-only sample: <b>${coverage}</b>${limit}`,
    `Generated: <code>${compactDate(report.generatedAt)}</code>`,
    '',
    '<b>Next Load Order</b>',
  ]

  if (loadingOrder.length === 0) {
    lines.push('All core/seasonal minimums are covered in this sample.')
  } else {
    loadingOrder.forEach((category, index) => {
      lines.push(
        `${index + 1}. <b>${escapeHtml(category.category)}</b> ` +
          `gap ${category.gapToMin}, ready ${category.publishReady}, backlog ${category.needsReview + category.draft} ` +
          `-> ${formatAction(category.action)}`,
      )
    })
  }

  lines.push('')
  lines.push('<b>Core Categories</b>')
  for (const category of core) {
    lines.push(
      `- <b>${escapeHtml(category.category)}</b> (${escapeHtml(category.label)}, target ${formatTarget(category)}): ` +
        `active ${category.active}, ready ${category.publishReady}, backlog ${category.needsReview + category.draft}, ` +
        `gap ${category.gapToMin}, action ${formatAction(category.action)}`,
    )
  }

  lines.push('')
  lines.push('<b>Seasonal / Optional</b>')
  for (const category of [...seasonal, ...optional]) {
    lines.push(
      `- <b>${escapeHtml(category.category)}</b> (${escapeHtml(category.label)}, target ${formatTarget(category)}): ` +
        `active ${category.active}, ready ${category.publishReady}, backlog ${category.needsReview + category.draft}, ` +
        `gap ${category.gapToMin}, action ${formatAction(category.action)}`,
    )
  }

  lines.push('')
  lines.push('<b>Catalog Hygiene</b>')
  lines.push(`missing category ${report.missingCategory}, legacy/unknown: ${formatCountMap(report.legacyOrUnknownCategories)}`)
  lines.push(
    `totals: active ${report.totals.active}, publish-ready ${report.totals.publishReady}, ` +
      `blocked backlog ${report.totals.blocked}, sold-out ${report.totals.soldOut}`,
  )
  lines.push('')
  lines.push('<i>Read-only strategy. Ads stay paused until D-380+; no batch publish/mutation here.</i>')

  return lines.join('\n')
}

export function isActiveCategoryFillCategory(category: string): boolean {
  return CATEGORY_SET.has(category)
}
