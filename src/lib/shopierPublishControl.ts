import { formatBrandSafetyReason, scanProductBrandSafety } from './brandSafety'
import { evaluateImageQualityGate } from './imageQualityGate'
import { countUsableMediaRows } from './productMedia'
import { findProductChannelSelectionIssues } from './productChannels'
import { summarizeProductStock } from './productStock'
import { evaluatePublishReadiness } from './publishReadiness'

type ProductLike = Record<string, any>

type PayloadLike = {
  update(args: {
    collection: 'products'
    id: number | string
    data: Record<string, any>
    context?: Record<string, unknown>
  }): Promise<Record<string, any>>
  jobs: {
    queue(args: {
      task: 'shopier-sync'
      input: Record<string, unknown>
      overrideAccess?: boolean
    }): Promise<unknown>
  }
}

export interface ShopierPublishEvaluation {
  ok: boolean
  productId: number | string | null
  title: string
  stockNumber: string | null
  blockers: string[]
  warnings: string[]
  readinessScore: string
  alreadySynced: boolean
  queueStatus: string
}

export interface ShopierQueueResult {
  ok: boolean
  queued: boolean
  evaluation: ShopierPublishEvaluation
  message: string
}

export type ShopierErrorKind = 'retryable' | 'product_data' | 'configuration' | 'remote_state' | 'unknown'

export interface ShopierErrorEntry {
  productId: number | string | null
  stockNumber: string | null
  title: string
  error: string
  kind: ShopierErrorKind
  retryable: boolean
  nextAction: string
}

export interface ShopierRetryPlanEntry {
  product: ProductLike
  error: ShopierErrorEntry
  evaluation: ShopierPublishEvaluation
  queueable: boolean
  blockers: string[]
}

export interface ShopierDashboardSummary {
  checked: number
  readyToQueue: number
  blocked: number
  alreadySyncedWarnings: number
  topBlockers: Array<{ reason: string; count: number }>
  errors: {
    total: number
    retryable: number
    productData: number
    configuration: number
    remoteState: number
    unknown: number
    safeToRetry: number
    blockedRetries: number
  }
}

export type ShopierAdminGateState = 'not_targeted' | 'ready' | 'blocked' | 'queued' | 'synced'

export interface ShopierAdminGateSummary {
  state: ShopierAdminGateState
  label: string
  detail: string
}

function productLabel(product: ProductLike): string {
  return product.stockNumber ? String(product.stockNumber) : `ID:${product.id ?? '?'}`
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
}

export function hasShopierIntent(product: ProductLike): boolean {
  const targets = Array.isArray(product.channelTargets) ? product.channelTargets : []
  const channels = product.channels && typeof product.channels === 'object' ? product.channels : {}
  return targets.includes('shopier') || channels.publishShopier === true
}

export function summarizeShopierAdminGate(
  evaluation: ShopierPublishEvaluation,
  options: { hasIntent: boolean },
): ShopierAdminGateSummary {
  if (!options.hasIntent) {
    return {
      state: 'not_targeted',
      label: 'Not targeted',
      detail: 'Shopier is not selected for this product. This is OK for website/social-only products.',
    }
  }

  if (evaluation.queueStatus === 'queued' || evaluation.queueStatus === 'syncing') {
    return {
      state: 'queued',
      label: evaluation.queueStatus === 'syncing' ? 'Syncing' : 'Queued',
      detail: 'A Shopier sync is already in progress; do not queue this product again yet.',
    }
  }

  if (evaluation.alreadySynced || evaluation.queueStatus === 'synced') {
    return {
      state: 'synced',
      label: 'Synced',
      detail: evaluation.warnings[0] ?? 'This product already has a Shopier product record.',
    }
  }

  if (evaluation.ok) {
    return {
      state: 'ready',
      label: 'Ready to queue',
      detail: 'The shared Shopier/Web gate passes. Queue only through operator-approved commands.',
    }
  }

  return {
    state: 'blocked',
    label: 'Blocked',
    detail: evaluation.blockers[0] ?? 'Shopier queue gate did not pass.',
  }
}

export function evaluateShopierPublishControl(product: ProductLike | null | undefined): ShopierPublishEvaluation {
  const p = product ?? {}
  const blockers: string[] = []
  const warnings: string[] = []
  const sourceMeta = p.sourceMeta && typeof p.sourceMeta === 'object' ? p.sourceMeta : {}
  const queueStatus = typeof sourceMeta.shopierSyncStatus === 'string'
    ? sourceMeta.shopierSyncStatus
    : 'not_synced'
  const alreadySynced = typeof sourceMeta.shopierProductId === 'string' && sourceMeta.shopierProductId.length > 0

  if (p.status !== 'active') {
    blockers.push(`active website visibility required (status=${p.status ?? 'missing'})`)
  }

  if (typeof p.slug !== 'string' || p.slug.trim().length === 0) {
    blockers.push('website slug required before Shopier publish')
  }

  const targets = Array.isArray(p.channelTargets) ? p.channelTargets : []
  const channels = p.channels && typeof p.channels === 'object' ? p.channels : {}
  if (!targets.includes('shopier') || channels.publishShopier !== true) {
    blockers.push('Shopier must be explicit in channelTargets and channels.publishShopier')
  }

  const channelIssues = findProductChannelSelectionIssues(p)
  for (const issue of channelIssues) {
    if (issue.channel === 'shopier' || issue.kind === 'unsupported_target') {
      blockers.push(issue.detail)
    }
  }

  if (typeof p.category !== 'string' || p.category.trim().length === 0) {
    blockers.push('category required for Shopier publish')
  }

  const aiMediaCount = countUsableMediaRows(p.generativeGallery)
  if (aiMediaCount === 0) {
    blockers.push('approved generated gallery image required for Shopier publish')
  }

  const imageQuality = evaluateImageQualityGate(p)
  if (!imageQuality.publishable) {
    blockers.push(`image QC required: ${imageQuality.detail}`)
  }

  const stock = summarizeProductStock(p)
  if (!stock.hasSellableStock) {
    blockers.push(`sellable stock required (${stock.detail})`)
  }

  const brandSafety = scanProductBrandSafety(p)
  if (!brandSafety.safe) {
    blockers.push(`brand safety blocked: ${formatBrandSafetyReason(brandSafety) || brandSafety.reasons.join('; ')}`)
  }

  const readiness = evaluatePublishReadiness(p as any)
  if (readiness.level !== 'ready') {
    for (const blocker of readiness.blockers) {
      blockers.push(`publish readiness: ${blocker}`)
    }
  }

  if (queueStatus === 'queued' || queueStatus === 'syncing') {
    blockers.push(`Shopier sync already ${queueStatus}`)
  }

  if (alreadySynced) {
    warnings.push(`already synced as ${sourceMeta.shopierProductId}`)
  }

  return {
    ok: blockers.length === 0,
    productId: p.id ?? null,
    title: typeof p.title === 'string' ? p.title : 'Untitled',
    stockNumber: typeof p.stockNumber === 'string' ? p.stockNumber : null,
    blockers: dedupe(blockers),
    warnings: dedupe(warnings),
    readinessScore: `${readiness.passedCount}/${readiness.totalCount}`,
    alreadySynced,
    queueStatus,
  }
}

export async function queueShopierSync(
  payload: PayloadLike,
  product: ProductLike,
  options: { notifyTelegramChatId?: number | string } = {},
): Promise<ShopierQueueResult> {
  const evaluation = evaluateShopierPublishControl(product)
  const label = productLabel(product)

  if (!evaluation.ok) {
    return {
      ok: false,
      queued: false,
      evaluation,
      message: formatShopierQueueResult({ ok: false, queued: false, evaluation, message: '' }),
    }
  }

  const sourceMeta = product.sourceMeta && typeof product.sourceMeta === 'object' ? product.sourceMeta : {}
  await payload.update({
    collection: 'products',
    id: product.id,
    data: { sourceMeta: { ...sourceMeta, shopierSyncStatus: 'queued' } },
    context: { isDispatchUpdate: true },
  })
  await payload.jobs.queue({
    task: 'shopier-sync',
    input: {
      productId: String(product.id),
      ...(options.notifyTelegramChatId !== undefined
        ? { notifyTelegramChatId: options.notifyTelegramChatId }
        : {}),
    },
    overrideAccess: true,
  })

  const queuedResult = {
    ok: true,
    queued: true,
    evaluation,
    message: `Shopier sync queued for ${label}`,
  }
  return {
    ...queuedResult,
    message: formatShopierQueueResult(queuedResult),
  }
}

export function formatShopierQueueResult(result: ShopierQueueResult): string {
  const evalResult = result.evaluation
  const label = evalResult.stockNumber ? `<code>${evalResult.stockNumber}</code>` : `ID:${evalResult.productId ?? '?'}`

  if (result.queued) {
    return [
      '<b>Shopier publish queued</b>',
      `${label} - ${evalResult.title}`,
      `Readiness: ${evalResult.readinessScore}`,
      '',
      '<i>Job runner will sync this product. No direct Shopier API call was made by the Telegram command.</i>',
    ].join('\n')
  }

  return [
    '<b>Shopier publish blocked</b>',
    `${label} - ${evalResult.title}`,
    `Readiness: ${evalResult.readinessScore}`,
    '',
    '<b>Blockers:</b>',
    ...evalResult.blockers.map((blocker) => `- ${blocker}`),
  ].join('\n')
}

export function formatShopierBatchPlan(
  evaluations: ShopierPublishEvaluation[],
  options: { confirmed?: boolean; queued?: number; limit?: number } = {},
): string {
  const ready = evaluations.filter((entry) => entry.ok)
  const blocked = evaluations.filter((entry) => !entry.ok)
  const limit = options.limit ?? 12
  const lines = [
    '<b>Shopier/Web Batch Control (D-356)</b>',
    `Checked: ${evaluations.length}`,
    `Ready to queue: ${ready.length}`,
    `Blocked: ${blocked.length}`,
    options.confirmed ? `Queued: ${options.queued ?? 0}` : 'Mode: preview only',
    '',
  ]

  if (!options.confirmed && ready.length > 0) {
    lines.push('<i>To queue ready products, run:</i> <code>/shopier publish-ready confirm</code>', '')
  }

  if (ready.length > 0) {
    lines.push('<b>Ready:</b>')
    for (const entry of ready.slice(0, limit)) {
      const label = entry.stockNumber ? `<code>${entry.stockNumber}</code>` : `ID:${entry.productId}`
      lines.push(`+ ${label} - ${entry.title}`)
    }
    if (ready.length > limit) lines.push(`+ ${ready.length - limit} more ready products not shown`)
    lines.push('')
  }

  if (blocked.length > 0) {
    lines.push('<b>Blocked sample:</b>')
    for (const entry of blocked.slice(0, limit)) {
      const label = entry.stockNumber ? `<code>${entry.stockNumber}</code>` : `ID:${entry.productId}`
      const firstBlocker = entry.blockers[0] ?? 'unknown blocker'
      lines.push(`- ${label} - ${firstBlocker}`)
    }
    if (blocked.length > limit) lines.push(`- ${blocked.length - limit} more blocked products not shown`)
  }

  if (evaluations.length === 0) {
    lines.push('No active Shopier-targeted products need a new Shopier sync.')
  }

  return lines.join('\n')
}

function classifyShopierError(error: string): Pick<ShopierErrorEntry, 'kind' | 'retryable' | 'nextAction'> {
  const lower = error.toLowerCase()

  if (
    lower.includes('shopier_pat') ||
    lower.includes('401') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('403')
  ) {
    return {
      kind: 'configuration',
      retryable: false,
      nextAction: 'Check SHOPIER_PAT / Shopier API permission, then rerun /shopier republish <sn-or-id>.',
    }
  }

  if (
    lower.includes('missing required fields') ||
    lower.includes('no ai images') ||
    lower.includes('no valid price') ||
    lower.includes('missing title') ||
    lower.includes('media') ||
    lower.includes('category') ||
    lower.includes('generatedgallery')
  ) {
    return {
      kind: 'product_data',
      retryable: false,
      nextAction: 'Fix product data and Image QC first, then run /shopier publish <sn-or-id>.',
    }
  }

  if (lower.includes('404') || lower.includes('deleted') || lower.includes('not found')) {
    return {
      kind: 'remote_state',
      retryable: true,
      nextAction: 'Remote product may be missing. Run /shopier republish <sn-or-id> after checking Shopier.',
    }
  }

  if (
    lower.includes('timeout') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('429') ||
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504')
  ) {
    return {
      kind: 'retryable',
      retryable: true,
      nextAction: 'Likely transient. Run /shopier republish <sn-or-id>.',
    }
  }

  return {
    kind: 'unknown',
    retryable: false,
    nextAction: 'Inspect the product and Shopier status before retrying.',
  }
}

export function buildShopierErrorEntries(products: ProductLike[]): ShopierErrorEntry[] {
  return products.map((product) => {
    const sourceMeta = product.sourceMeta && typeof product.sourceMeta === 'object' ? product.sourceMeta : {}
    const rawError = typeof sourceMeta.shopierLastError === 'string' && sourceMeta.shopierLastError.trim().length > 0
      ? sourceMeta.shopierLastError.trim()
      : 'Unknown Shopier sync error'
    const classification = classifyShopierError(rawError)

    return {
      productId: product.id ?? null,
      stockNumber: typeof product.stockNumber === 'string' ? product.stockNumber : null,
      title: typeof product.title === 'string' ? product.title : 'Untitled',
      error: rawError,
      ...classification,
    }
  })
}

export function buildShopierRetryPlan(products: ProductLike[]): ShopierRetryPlanEntry[] {
  const errors = buildShopierErrorEntries(products)

  return products.map((product, index) => {
    const error = errors[index]
    const evaluation = evaluateShopierPublishControl(product)
    const blockers: string[] = []

    if (!error.retryable) {
      blockers.push(`error class ${error.kind} is not safe for automatic retry`)
    }

    if (!evaluation.ok) {
      blockers.push(...evaluation.blockers)
    }

    return {
      product,
      error,
      evaluation,
      queueable: error.retryable && evaluation.ok,
      blockers: dedupe(blockers),
    }
  })
}

export function formatShopierErrorSummary(products: ProductLike[], options: { limit?: number } = {}): string {
  const entries = buildShopierErrorEntries(products)
  const limit = options.limit ?? 10

  if (entries.length === 0) {
    return '<b>Shopier Errors</b>\n\nNo Shopier sync errors found.'
  }

  const retryable = entries.filter((entry) => entry.retryable).length
  const productData = entries.filter((entry) => entry.kind === 'product_data').length
  const configuration = entries.filter((entry) => entry.kind === 'configuration').length

  const lines = [
    '<b>Shopier Errors</b>',
    `Total: ${entries.length}`,
    `Retryable: ${retryable} · Product data: ${productData} · Config: ${configuration}`,
    '',
  ]

  if (retryable > 0) {
    lines.push('<i>Preview safe retries:</i> <code>/shopier retry-errors</code>', '')
  }

  for (const entry of entries.slice(0, limit)) {
    const label = entry.stockNumber ? `<code>${entry.stockNumber}</code>` : `ID:${entry.productId ?? '?'}`
    lines.push(
      `- ${label} - ${entry.title}`,
      `  Kind: ${entry.kind}${entry.retryable ? ' (retryable)' : ''}`,
      `  Error: ${entry.error.slice(0, 140)}`,
      `  Next: ${entry.nextAction}`,
    )
  }

  if (entries.length > limit) {
    lines.push('', `+ ${entries.length - limit} more errors not shown`)
  }

  return lines.join('\n')
}

export function formatShopierRetryPlan(
  entries: ShopierRetryPlanEntry[],
  options: { confirmed?: boolean; queued?: number; limit?: number } = {},
): string {
  const queueable = entries.filter((entry) => entry.queueable)
  const blocked = entries.filter((entry) => !entry.queueable)
  const limit = options.limit ?? 10
  const lines = [
    '<b>Shopier Retry Plan (D-356)</b>',
    `Errors checked: ${entries.length}`,
    `Safe to retry: ${queueable.length}`,
    `Blocked: ${blocked.length}`,
    options.confirmed ? `Queued: ${options.queued ?? 0}` : 'Mode: preview only',
    '',
  ]

  if (!options.confirmed && queueable.length > 0) {
    lines.push('<i>To queue safe retries, run:</i> <code>/shopier retry-errors confirm</code>', '')
  }

  if (queueable.length > 0) {
    lines.push('<b>Safe retry:</b>')
    for (const entry of queueable.slice(0, limit)) {
      const label = entry.evaluation.stockNumber ? `<code>${entry.evaluation.stockNumber}</code>` : `ID:${entry.evaluation.productId ?? '?'}`
      lines.push(`+ ${label} - ${entry.evaluation.title} (${entry.error.kind})`)
    }
    if (queueable.length > limit) lines.push(`+ ${queueable.length - limit} more safe retries not shown`)
    lines.push('')
  }

  if (blocked.length > 0) {
    lines.push('<b>Blocked sample:</b>')
    for (const entry of blocked.slice(0, limit)) {
      const label = entry.evaluation.stockNumber ? `<code>${entry.evaluation.stockNumber}</code>` : `ID:${entry.evaluation.productId ?? '?'}`
      const firstBlocker = entry.blockers[0] ?? 'unknown blocker'
      lines.push(`- ${label} - ${firstBlocker}`)
    }
    if (blocked.length > limit) lines.push(`- ${blocked.length - limit} more blocked retries not shown`)
  }

  if (entries.length === 0) {
    lines.push('No Shopier sync errors found.')
  }

  return lines.join('\n')
}

function classifyBlocker(blocker: string): string {
  const lower = blocker.toLowerCase()

  if (lower.includes('active website visibility')) return 'Website visibility'
  if (lower.includes('website slug')) return 'Missing website slug'
  if (lower.includes('channeltargets') || lower.includes('publishshopier') || lower.includes('target')) return 'Shopier target/flag mismatch'
  if (lower.includes('category')) return 'Missing category'
  if (lower.includes('generated gallery')) return 'Generated gallery missing'
  if (lower.includes('image qc')) return 'Image QC not PASS'
  if (lower.includes('stock')) return 'No sellable stock'
  if (lower.includes('brand safety')) return 'Brand safety block'
  if (lower.includes('publish readiness')) return 'Publish readiness block'
  if (lower.includes('already queued') || lower.includes('already syncing')) return 'Shopier job already queued/syncing'
  return 'Other blocker'
}

export function buildShopierDashboardSummary(
  publishEvaluations: ShopierPublishEvaluation[],
  errorProducts: ProductLike[],
): ShopierDashboardSummary {
  const blockedEvaluations = publishEvaluations.filter((entry) => !entry.ok)
  const blockerCounts = new Map<string, number>()

  for (const evaluation of blockedEvaluations) {
    const reasons = dedupe(evaluation.blockers.map(classifyBlocker))
    for (const reason of reasons) {
      blockerCounts.set(reason, (blockerCounts.get(reason) ?? 0) + 1)
    }
  }

  const topBlockers = [...blockerCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))

  const errorEntries = buildShopierErrorEntries(errorProducts)
  const retryPlan = buildShopierRetryPlan(errorProducts)

  return {
    checked: publishEvaluations.length,
    readyToQueue: publishEvaluations.filter((entry) => entry.ok).length,
    blocked: blockedEvaluations.length,
    alreadySyncedWarnings: publishEvaluations.filter((entry) => entry.alreadySynced).length,
    topBlockers,
    errors: {
      total: errorEntries.length,
      retryable: errorEntries.filter((entry) => entry.kind === 'retryable').length,
      productData: errorEntries.filter((entry) => entry.kind === 'product_data').length,
      configuration: errorEntries.filter((entry) => entry.kind === 'configuration').length,
      remoteState: errorEntries.filter((entry) => entry.kind === 'remote_state').length,
      unknown: errorEntries.filter((entry) => entry.kind === 'unknown').length,
      safeToRetry: retryPlan.filter((entry) => entry.queueable).length,
      blockedRetries: retryPlan.filter((entry) => !entry.queueable).length,
    },
  }
}

export function formatShopierOperatorDashboard(
  summary: ShopierDashboardSummary,
  options: { blockerLimit?: number; shopierPatConfigured?: boolean } = {},
): string {
  const blockerLimit = options.blockerLimit ?? 5
  const lines = [
    '<b>Shopier Operator Dashboard (D-356)</b>',
    `SHOPIER_PAT configured: ${options.shopierPatConfigured === false ? 'no' : 'yes'}`,
    '',
    '<b>New publish queue</b>',
    `Checked: ${summary.checked}`,
    `Ready to queue: ${summary.readyToQueue}`,
    `Blocked: ${summary.blocked}`,
  ]

  if (summary.alreadySyncedWarnings > 0) {
    lines.push(`Already synced warnings: ${summary.alreadySyncedWarnings}`)
  }

  lines.push('')

  if (summary.topBlockers.length > 0) {
    lines.push('<b>Top blockers</b>')
    for (const blocker of summary.topBlockers.slice(0, blockerLimit)) {
      lines.push(`- ${blocker.reason}: ${blocker.count}`)
    }
    if (summary.topBlockers.length > blockerLimit) {
      lines.push(`- ${summary.topBlockers.length - blockerLimit} more blocker groups not shown`)
    }
    lines.push('')
  }

  lines.push(
    '<b>Sync errors</b>',
    `Total errors: ${summary.errors.total}`,
    `Retryable: ${summary.errors.retryable}`,
    `Product data: ${summary.errors.productData}`,
    `Configuration: ${summary.errors.configuration}`,
    `Remote state: ${summary.errors.remoteState}`,
    `Unknown: ${summary.errors.unknown}`,
    `Safe to retry now: ${summary.errors.safeToRetry}`,
    `Blocked retries: ${summary.errors.blockedRetries}`,
    '',
    '<b>Next actions</b>',
  )

  if (summary.readyToQueue > 0) {
    lines.push('- New products: /shopier publish-ready confirm')
  } else {
    lines.push('- New products: fix blockers before queueing')
  }

  if (summary.errors.safeToRetry > 0) {
    lines.push('- Error retries: /shopier retry-errors confirm')
  } else if (summary.errors.total > 0) {
    lines.push('- Error retries: inspect /shopier errors and fix blockers first')
  } else {
    lines.push('- Error retries: no Shopier sync errors found')
  }

  if (options.shopierPatConfigured === false) {
    lines.push('- Configure SHOPIER_PAT before queueing or retrying Shopier jobs')
  }

  return lines.join('\n')
}
