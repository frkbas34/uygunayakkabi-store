import { buildChannelDispatchOverview, summarizeChannelDispatchResult, type ChannelDispatchState, type DispatchChannelResultLike } from './channelDispatchStatus'
import { scanProductBrandSafety, type BrandSafetyResult } from './brandSafety'
import {
  buildBrandSafetyRemediationPlan,
  type BrandSafetyRemediationItem,
  type BrandProvenanceReviewEvent,
} from './brandSafetyRemediationPlan'
import { evaluateImageQualityGate } from './imageQualityGate'
import { collectActivationBlockers, type ActivationStockResolver } from './productActivationGuard'
import { isStorefrontProductSafe } from './merchandising'
import { ACTIVE_PRODUCT_CHANNELS, findProductChannelSelectionIssues, resolveConfiguredTargets } from './productChannels'
import { PRODUCT_LIFECYCLE_LABELS, deriveProductLifecycle, type ProductLifecycleStage } from './productLifecycle'
import { summarizeProductStock } from './productStock'
import { detectStateIncoherence, evaluatePublishReadiness, type CoherenceIssue, type PublishReadinessResult } from './publishReadiness'
import { evaluateShopierPublishControl, hasShopierIntent, summarizeShopierAdminGate, type ShopierAdminGateSummary, type ShopierPublishEvaluation } from './shopierPublishControl'

type ProductLike = Record<string, any>
const ACTIVE_DISPATCH_CHANNELS = new Set<string>(ACTIVE_PRODUCT_CHANNELS)

export interface ProductFlowDispatchRow {
  channel: string
  state: ChannelDispatchState
  label: string
  reason: string | null
  canRedispatch: boolean
  nextAction: string | null
}

export type ProductFlowDispatchSummary = Record<ChannelDispatchState, number> & {
  total: number
}

export type ProductFlowChecklistState = 'done' | 'needs_work' | 'blocked' | 'next'

export interface ProductFlowChecklistItem {
  key: string
  label: string
  state: ProductFlowChecklistState
  detail: string
  command?: string
}

export type ProductFlowChecklistSummary = Record<ProductFlowChecklistState, number> & {
  total: number
}

export interface ProductFlowSnapshot {
  productId: number | string | null
  ref: string
  commandRef: string
  title: string
  status: string
  operatorLinks: {
    adminUrl: string | null
    productUrl: string | null
  }
  lifecycle: ProductLifecycleStage
  lifecycleLabel: string
  readiness: PublishReadinessResult
  brandSafety: BrandSafetyResult
  brandRemediation: BrandSafetyRemediationItem | null
  activationBlockers: string[]
  imageQuality: ReturnType<typeof evaluateImageQualityGate>
  shopier: {
    hasIntent: boolean
    evaluation: ShopierPublishEvaluation
    gate: ShopierAdminGateSummary
  }
  channels: {
    activeTargets: string[]
    issues: string[]
    dispatch: ProductFlowDispatchRow[]
    dispatchSummary: ProductFlowDispatchSummary
  }
  coherenceIssues: CoherenceIssue[]
  operatorChecklist: ProductFlowChecklistItem[]
  checklistSummary: ProductFlowChecklistSummary
  primaryOperatorStep: ProductFlowChecklistItem | null
  nextActions: string[]
}

type ProductFlowSnapshotBase = Omit<ProductFlowSnapshot, 'operatorChecklist' | 'checklistSummary' | 'primaryOperatorStep' | 'nextActions'>

export interface ProductFlowSnapshotOptions {
  resolveStockSnapshot?: ActivationStockResolver
  provenanceEvents?: BrandProvenanceReviewEvent[]
}

function productRef(product: ProductLike): string {
  const stockNumber = typeof product.stockNumber === 'string' && product.stockNumber.trim().length > 0
    ? product.stockNumber.trim()
    : null
  return stockNumber ?? String(product.id ?? '<product-id>')
}

function productCommandRef(product: ProductLike): string {
  // Product-flow actions must work with legacy ID-only Telegram commands.
  const id = product.id
  if (typeof id === 'number' && Number.isInteger(id) && id > 0) return String(id)
  if (typeof id === 'string' && /^\d+$/.test(id.trim())) return id.trim()
  return productRef(product)
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

function buildOperatorLinks(product: ProductLike): ProductFlowSnapshot['operatorLinks'] {
  const baseUrl = siteBaseUrl()
  const productId = product.id ?? null
  const slug = typeof product.slug === 'string' && product.slug.trim().length > 0
    ? product.slug.trim()
    : null
  const status = typeof product.status === 'string' ? product.status : ''
  const publicStatus = status === 'active' || status === 'soldout' || status === 'sold_out'

  return {
    adminUrl: productId === null || productId === undefined
      ? null
      : `${baseUrl}/admin/collections/products/${encodeURIComponent(String(productId))}`,
    productUrl: slug && publicStatus && isStorefrontProductSafe(product)
      ? `${baseUrl}/products/${encodeURIComponent(slug)}`
      : null,
  }
}

function websiteVisibilityOptions(product: ProductLike) {
  const status = typeof product.status === 'string' && product.status.trim().length > 0
    ? product.status.trim()
    : 'draft'
  const isPublicStatus = status === 'active' || status === 'soldout' || status === 'sold_out'

  if (!isPublicStatus) {
    return {
      websitePublished: false,
      websiteUnavailableReason: `Website visibility requires active or sold-out status (status=${status}).`,
    }
  }

  if (!isStorefrontProductSafe(product)) {
    return {
      websitePublished: false,
      websiteUnavailableReason: 'Website visibility is blocked by public storefront safety policy.',
    }
  }

  return { websitePublished: true }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
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

function buildDefaultStockResolver(product: ProductLike): ActivationStockResolver {
  const stock = summarizeProductStock(product)
  return async () => ({
    effectiveStock: stock.effectiveStock,
    hasVariants: stock.hasVariantStockDetails,
  })
}

function imageNextActions(snapshot: ProductFlowSnapshotBase): string[] {
  const image = snapshot.imageQuality
  const ref = snapshot.commandRef

  if (!snapshot.brandSafety.safe) {
    return [
      'Protected-brand safety must be reviewed before any Image QC or generation action.',
      `/brandreview ${ref} needs-evidence`,
    ]
  }

  if (image.publishable) return []
  if (!image.hasOriginals && !image.hasGenerated) {
    return [
      'Attach at least one real product photo before QC, activation, or publish.',
      `/imageqc ${ref}`,
    ]
  }
  if (image.status === 'fail' || image.level === 'fail') {
    return [
      'Image QC failed or visuals were rejected; regenerate or attach corrected media before publish.',
      `#gorsel ${ref}`,
    ]
  }
  if (image.status === 'review') {
    return [
      'Human image review is required before publish.',
      `/imageqc pass ${ref} approved`,
      `#gorsel ${ref}`,
    ]
  }
  return [
    'Generated images need an explicit Image QC decision before publish.',
    `/imageqc pass ${ref} approved`,
    `/imageqc review ${ref} note`,
  ]
}

function firstCommand(actions: string[]): string | undefined {
  return actions.find((action) => action.startsWith('/') || action.startsWith('#'))
}

function contentCommand(status: string, ref: string): string {
  return status === 'failed' ? `/content ${ref} retry` : `/content ${ref} trigger`
}

function readinessCommand(name: string, status: string, ref: string): string | undefined {
  switch (name) {
    case 'confirmation':
      return status === 'confirmed' ? undefined : `/confirm ${ref}`
    case 'content':
      return contentCommand(status, ref)
    case 'audit':
      return `/audit ${ref} run`
    case 'sellable':
      return `/confirm ${ref}`
    case 'publish_targets':
      return `/confirm ${ref} force`
    default:
      return undefined
  }
}

function buildOperatorChecklist(snapshot: ProductFlowSnapshotBase): ProductFlowChecklistItem[] {
  const ref = snapshot.commandRef
  const items: ProductFlowChecklistItem[] = []
  const brandBlocked = !snapshot.brandSafety.safe
  const dimensionsByName = new Map(snapshot.readiness.dimensions.map((entry) => [entry.name, entry]))
  const confirmation = dimensionsByName.get('confirmation')
  const content = dimensionsByName.get('content')
  const confirmationPassed = confirmation?.passed === true
  const contentPassed = content?.passed === true
  const nextContentCommand = content && !content.passed ? contentCommand(content.status, ref) : undefined

  if (brandBlocked) {
    const nextSafeAction = snapshot.brandRemediation?.nextSafeAction
    items.push({
      key: 'brand_safety',
      label: 'Brand safety and provenance',
      state: 'blocked',
      detail: nextSafeAction?.summary ?? `Protected brand: ${snapshot.brandSafety.blockedBrands.join(', ')}. Review provenance before Image QC, generation, activation, or external publishing.`,
      command: nextSafeAction?.previewCommand ?? undefined,
    })
  }

  const imageCommand = brandBlocked ? undefined : firstCommand(imageNextActions(snapshot))
  items.push({
    key: 'visuals',
    label: 'Photos and Image QC',
    state: snapshot.imageQuality.publishable
      ? 'done'
      : brandBlocked
        ? 'blocked'
        : 'needs_work',
    detail: brandBlocked
      ? `Image QC actions wait for protected-brand provenance review. ${snapshot.imageQuality.detail}`
      : snapshot.imageQuality.detail,
    command: snapshot.imageQuality.publishable || brandBlocked ? undefined : imageCommand,
  })

  for (const name of ['confirmation', 'content', 'audit', 'sellable', 'publish_targets']) {
    const dimension = dimensionsByName.get(name)
    if (!dimension) continue
    let state: ProductFlowChecklistState = dimension.passed ? 'done' : 'needs_work'
    let detail = dimension.detail ?? dimension.status
    let command = dimension.passed ? undefined : readinessCommand(name, dimension.status, ref)

    if (!dimension.passed && name === 'content' && !confirmationPassed) {
      state = 'blocked'
      detail = `Confirm product details before content generation. ${detail}`
      command = `/confirm ${ref}`
    }

    if (!dimension.passed && name === 'audit') {
      if (!confirmationPassed) {
        state = 'blocked'
        detail = `Confirm product details before audit. ${detail}`
        command = `/confirm ${ref}`
      } else if (!contentPassed) {
        state = 'blocked'
        detail = content?.status === 'failed'
          ? `Retry content before audit. ${detail}`
          : `Complete content before audit. ${detail}`
        command = nextContentCommand
      }
    }

    items.push({
      key: name,
      label: name === 'publish_targets'
        ? 'Channel targets'
        : name === 'sellable'
          ? 'Price, size, and stock'
          : name[0].toUpperCase() + name.slice(1),
      state,
      detail,
      command,
    })
  }

  const activationReady = snapshot.status !== 'active' &&
    snapshot.readiness.level === 'ready' &&
    snapshot.activationBlockers.length === 0
  items.push({
    key: 'activation',
    label: 'Operator approval',
    state: snapshot.status === 'active'
      ? 'done'
      : activationReady
        ? 'next'
        : snapshot.activationBlockers.length > 0
          ? 'blocked'
          : 'needs_work',
    detail: snapshot.status === 'active'
      ? 'Product is active.'
      : activationReady
        ? 'All publish gates pass; operator can activate.'
        : snapshot.activationBlockers[0] ?? 'Complete the readiness checklist before activation.',
    command: activationReady ? `/activate ${ref}` : undefined,
  })

  if (snapshot.shopier.hasIntent) {
    items.push({
      key: 'shopier',
      label: 'Shopier queue',
      state: snapshot.shopier.gate.state === 'ready'
        ? 'next'
        : snapshot.shopier.gate.state === 'queued' || snapshot.shopier.gate.state === 'synced'
          ? 'done'
          : 'blocked',
      detail: snapshot.shopier.gate.detail,
      command: snapshot.shopier.gate.state === 'ready' ? `/shopier publish ${ref}` : undefined,
    })
  }

  return items.slice(0, 8)
}

function pickPrimaryOperatorStep(items: ProductFlowChecklistItem[]): ProductFlowChecklistItem | null {
  return items.find((item) => item.key === 'brand_safety') ??
    items.find((item) => item.state === 'next' && item.command) ??
    items.find((item) => item.state === 'needs_work' && item.command) ??
    items.find((item) => item.state === 'blocked' && item.command) ??
    items.find((item) => item.state !== 'done') ??
    null
}

function summarizeOperatorChecklist(items: ProductFlowChecklistItem[]): ProductFlowChecklistSummary {
  const summary: ProductFlowChecklistSummary = {
    total: items.length,
    done: 0,
    next: 0,
    needs_work: 0,
    blocked: 0,
  }

  for (const item of items) {
    summary[item.state] += 1
  }

  return summary
}

function summarizeDispatchRows(rows: ProductFlowDispatchRow[]): ProductFlowDispatchSummary {
  const summary: ProductFlowDispatchSummary = {
    total: rows.length,
    published: 0,
    queued: 0,
    failed: 0,
    blocked: 0,
    preview: 0,
    unrecorded: 0,
    not_configured: 0,
    skipped: 0,
  }

  for (const row of rows) {
    summary[row.state] += 1
  }

  return summary
}

function dispatchNextAction(
  row: Pick<ProductFlowDispatchRow, 'channel' | 'state' | 'canRedispatch'>,
  ref: string,
  shopierGate: ShopierAdminGateSummary,
): string | null {
  if (row.state === 'published') return null

  if (row.state === 'queued') {
    return row.channel === 'shopier'
      ? '/shopier dashboard - verify the queued sync before any retry'
      : `/productflow ${ref} - verify the queued dispatch state before retrying`
  }

  if (row.state === 'failed') {
    return row.canRedispatch
      ? `/redispatch ${row.channel} ${ref} - fix the recorded failure first`
      : `/productflow ${ref} - resolve the dispatch gate before retrying`
  }

  if (row.state === 'blocked') {
    return `/productflow ${ref} - resolve product or activation blockers before dispatch`
  }

  if (row.state === 'preview') {
    return `/productflow ${ref} - review the preview before real dispatch`
  }

  if (row.state === 'unrecorded') {
    if (row.channel === 'shopier' && shopierGate.state === 'ready') {
      return `/shopier publish ${ref} - shared Shopier/Web gate passes`
    }
    return row.canRedispatch
      ? `/redispatch ${row.channel} ${ref} - verify provider and product data first`
      : `/productflow ${ref} - verify the missing dispatch record`
  }

  if (row.state === 'not_configured') {
    return `/diagnostics - check ${row.channel} provider health before redispatch`
  }

  return row.canRedispatch
    ? `/redispatch ${row.channel} ${ref} - verify why dispatch was skipped first`
    : `/productflow ${ref} - review the skipped dispatch state`
}

function buildNextActions(snapshot: ProductFlowSnapshotBase): string[] {
  const actions: string[] = []
  const ref = snapshot.commandRef

  if (!snapshot.brandSafety.safe) {
    const nextSafeAction = snapshot.brandRemediation?.nextSafeAction
    return dedupe([
      `Protected-brand safety block: ${snapshot.brandSafety.blockedBrands.join(', ')}. Review provenance before any product or channel action.`,
      nextSafeAction?.summary ?? 'Review protected-brand provenance before any product or channel action.',
      ...(nextSafeAction?.previewCommand ? [nextSafeAction.previewCommand] : []),
      'Do not record Image QC, generate images, activate, queue Shopier, redispatch, or advertise until the protected-brand review is complete.',
      ...snapshot.readiness.blockers.slice(0, 3).map((blocker) => `Readiness: ${blocker}`),
      ...snapshot.activationBlockers.slice(0, 3).map((blocker) => `Activation guard: ${blocker}`),
    ]).slice(0, 8)
  }

  if (snapshot.coherenceIssues.length > 0) {
    actions.push(`/repair ${ref} - preview state-coherence repair before publishing`)
  }

  if (snapshot.channels.issues.length > 0) {
    actions.push('Fix channelTargets/channels.publish* drift in Payload before approval')
  }

  actions.push(...imageNextActions(snapshot))

  if (
    snapshot.status !== 'active' &&
    snapshot.readiness.level === 'ready' &&
    snapshot.activationBlockers.length === 0
  ) {
    actions.push(`/activate ${ref} - operator approval required`)
  }

  if (
    snapshot.status === 'active' &&
    snapshot.shopier.hasIntent &&
    snapshot.shopier.gate.state === 'ready'
  ) {
    actions.push(`/shopier publish ${ref} - shared Shopier/Web gate passes`)
  }

  for (const row of snapshot.channels.dispatch) {
    if (row.channel === 'shopier' && row.state === 'unrecorded' && snapshot.shopier.gate.state === 'ready') {
      continue
    }
    if (row.canRedispatch && (row.state === 'failed' || row.state === 'unrecorded' || row.state === 'not_configured')) {
      actions.push(`/redispatch ${row.channel} ${ref} - after config/data is fixed`)
    }
  }

  for (const blocker of snapshot.readiness.blockers.slice(0, 3)) {
    actions.push(`Readiness: ${blocker}`)
  }

  for (const blocker of snapshot.activationBlockers.slice(0, 3)) {
    actions.push(`Activation guard: ${blocker}`)
  }

  if (actions.length === 0) {
    actions.push(snapshot.status === 'active'
      ? 'No blocking next action detected; product is active. Monitor orders, leads, and stock.'
      : 'No blocking next action detected; review the operator approval path.')
  }

  return dedupe(actions).slice(0, 8)
}

export async function buildProductFlowSnapshot(
  product: ProductLike | null | undefined,
  options: ProductFlowSnapshotOptions = {},
): Promise<ProductFlowSnapshot> {
  const p = product ?? {}
  const ref = productRef(p)
  const commandRef = productCommandRef(p)
  const lifecycle = deriveProductLifecycle(p)
  const activeTargets = resolveConfiguredTargets(p)
  const dispatchNotes = parseDispatchNotes(p.sourceMeta?.dispatchNotes)
  const rawDispatch = buildChannelDispatchOverview(activeTargets, dispatchNotes, websiteVisibilityOptions(p))
    .filter((row) => ACTIVE_DISPATCH_CHANNELS.has(row.channel))
    .map((row) => {
      const summary = summarizeChannelDispatchResult(row)
      return {
        channel: row.channel,
        state: summary.state,
        label: summary.label,
        reason: summary.reason,
        canRedispatch: summary.canRedispatch,
      }
    })

  const activationBlockers = await collectActivationBlockers(p, {
    resolveStockSnapshot: options.resolveStockSnapshot ?? buildDefaultStockResolver(p),
  })
  const shopierEvaluation = evaluateShopierPublishControl(p)
  const hasIntent = hasShopierIntent(p)
  const shopierGate = summarizeShopierAdminGate(shopierEvaluation, { hasIntent })
  const brandSafety = scanProductBrandSafety(p)
  const brandRemediation = brandSafety.safe
    ? null
    : buildBrandSafetyRemediationPlan([p], {
      provenanceEvents: options.provenanceEvents ?? [],
    }).items[0] ?? null
  const dispatch = rawDispatch.map((row) => ({
    ...row,
    nextAction: dispatchNextAction(row, commandRef, shopierGate),
  }))

  const base = {
    productId: p.id ?? null,
    ref,
    commandRef,
    title: typeof p.title === 'string' && p.title.trim().length > 0 ? p.title : 'Untitled',
    status: typeof p.status === 'string' ? p.status : 'draft',
    operatorLinks: buildOperatorLinks(p),
    lifecycle,
    lifecycleLabel: PRODUCT_LIFECYCLE_LABELS[lifecycle],
    readiness: evaluatePublishReadiness(p as any),
    brandSafety,
    brandRemediation,
    activationBlockers,
    imageQuality: evaluateImageQualityGate(p),
    shopier: {
      hasIntent,
      evaluation: shopierEvaluation,
      gate: shopierGate,
    },
    channels: {
      activeTargets,
      issues: findProductChannelSelectionIssues(p).map((issue) => issue.detail),
      dispatch,
      dispatchSummary: summarizeDispatchRows(dispatch),
    },
    coherenceIssues: detectStateIncoherence(p as any),
  }

  const operatorChecklist = buildOperatorChecklist(base)

  return {
    ...base,
    operatorChecklist,
    checklistSummary: summarizeOperatorChecklist(operatorChecklist),
    primaryOperatorStep: pickPrimaryOperatorStep(operatorChecklist),
    nextActions: buildNextActions(base),
  }
}

export function formatProductFlowSnapshot(snapshot: ProductFlowSnapshot): string {
  const lines: string[] = [
    `<b>Product Flow Snapshot - #${escapeHtml(snapshot.productId ?? snapshot.ref)}</b>`,
    `<b>${escapeHtml(snapshot.title)}</b>`,
    '<i>Read-only: no writes, no publish, no provider calls.</i>',
    '',
    `<b>Reference</b>: ${escapeHtml(snapshot.ref)} (action id=${escapeHtml(snapshot.commandRef)})`,
    `<b>State</b>: ${escapeHtml(snapshot.lifecycleLabel)} (status=${escapeHtml(snapshot.status)})`,
    `<b>Readiness</b>: ${escapeHtml(snapshot.readiness.level)} ${snapshot.readiness.passedCount}/${snapshot.readiness.totalCount}`,
    `<b>Activation guard</b>: ${snapshot.activationBlockers.length === 0 ? 'passes' : `${snapshot.activationBlockers.length} blocker(s)`}`,
    `<b>Image QC</b>: ${escapeHtml(snapshot.imageQuality.level)} - ${escapeHtml(snapshot.imageQuality.detail)}`,
    `<b>Targets</b>: ${snapshot.channels.activeTargets.length > 0 ? escapeHtml(snapshot.channels.activeTargets.join(', ')) : 'none'}`,
    `<b>Shopier gate</b>: ${escapeHtml(snapshot.shopier.gate.label)} - ${escapeHtml(snapshot.shopier.gate.detail)}`,
    `<b>Checklist</b>: done ${snapshot.checklistSummary.done}/${snapshot.checklistSummary.total}, next ${snapshot.checklistSummary.next}, blocked ${snapshot.checklistSummary.blocked}, needs work ${snapshot.checklistSummary.needs_work}`,
    `<b>Dispatch summary</b>: published ${snapshot.channels.dispatchSummary.published}/${snapshot.channels.dispatchSummary.total}, queued ${snapshot.channels.dispatchSummary.queued}, failed ${snapshot.channels.dispatchSummary.failed}, blocked ${snapshot.channels.dispatchSummary.blocked}, not configured ${snapshot.channels.dispatchSummary.not_configured}, unrecorded ${snapshot.channels.dispatchSummary.unrecorded}`,
  ]

  if (snapshot.primaryOperatorStep) {
    const command = snapshot.primaryOperatorStep.command ? ` -> ${escapeHtml(snapshot.primaryOperatorStep.command)}` : ''
    lines.push(`<b>Primary operator step</b>: ${escapeHtml(snapshot.primaryOperatorStep.label)} - ${escapeHtml(snapshot.primaryOperatorStep.detail)}${command}`)
  }

  if (snapshot.operatorLinks.adminUrl || snapshot.operatorLinks.productUrl) {
    lines.push('')
    lines.push('<b>Operator Links</b>')
    if (snapshot.operatorLinks.adminUrl) {
      lines.push(`- Payload admin: <a href="${escapeHtml(snapshot.operatorLinks.adminUrl)}">open product</a>`)
    }
    if (snapshot.operatorLinks.productUrl) {
      lines.push(`- Product page: <a href="${escapeHtml(snapshot.operatorLinks.productUrl)}">open PDP</a>`)
    }
  }

  if (snapshot.channels.dispatch.length > 0) {
    lines.push('')
    lines.push('<b>Dispatch</b>')
    for (const row of snapshot.channels.dispatch.slice(0, 6)) {
      const reason = row.reason ? ` - ${escapeHtml(row.reason)}` : ''
      const nextAction = row.nextAction ? ` -> ${escapeHtml(row.nextAction)}` : ''
      lines.push(`- ${escapeHtml(row.channel)}: ${escapeHtml(row.label)}${reason}${nextAction}`)
    }
  }

  if (snapshot.channels.issues.length > 0 || snapshot.coherenceIssues.length > 0) {
    lines.push('')
    lines.push('<b>Diagnostics</b>')
    for (const issue of snapshot.channels.issues.slice(0, 3)) {
      lines.push(`- channel: ${escapeHtml(issue)}`)
    }
    for (const issue of snapshot.coherenceIssues.slice(0, 3)) {
      lines.push(`- ${escapeHtml(issue.severity)} ${escapeHtml(issue.field)}: ${escapeHtml(issue.actual)}`)
    }
  }

  if (snapshot.operatorChecklist.length > 0) {
    lines.push('')
    lines.push('<b>Operator Checklist</b>')
    for (const item of snapshot.operatorChecklist) {
      const command = item.command ? ` -> ${escapeHtml(item.command)}` : ''
      lines.push(`- ${escapeHtml(item.state)} ${escapeHtml(item.label)}: ${escapeHtml(item.detail)}${command}`)
    }
  }

  lines.push('')
  lines.push('<b>Next Actions</b>')
  for (const action of snapshot.nextActions) {
    lines.push(`- ${escapeHtml(action)}`)
  }

  return lines.join('\n')
}
