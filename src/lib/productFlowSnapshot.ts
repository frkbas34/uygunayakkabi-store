import { buildChannelDispatchOverview, summarizeChannelDispatchResult, type DispatchChannelResultLike } from './channelDispatchStatus'
import { evaluateImageQualityGate } from './imageQualityGate'
import { collectActivationBlockers, type ActivationStockResolver } from './productActivationGuard'
import { ACTIVE_PRODUCT_CHANNELS, findProductChannelSelectionIssues, resolveConfiguredTargets } from './productChannels'
import { PRODUCT_LIFECYCLE_LABELS, deriveProductLifecycle, type ProductLifecycleStage } from './productLifecycle'
import { summarizeProductStock } from './productStock'
import { detectStateIncoherence, evaluatePublishReadiness, type CoherenceIssue, type PublishReadinessResult } from './publishReadiness'
import { evaluateShopierPublishControl, hasShopierIntent, summarizeShopierAdminGate, type ShopierAdminGateSummary, type ShopierPublishEvaluation } from './shopierPublishControl'

type ProductLike = Record<string, any>
const ACTIVE_DISPATCH_CHANNELS = new Set<string>(ACTIVE_PRODUCT_CHANNELS)

export interface ProductFlowDispatchRow {
  channel: string
  state: string
  label: string
  reason: string | null
  canRedispatch: boolean
}

export interface ProductFlowSnapshot {
  productId: number | string | null
  ref: string
  title: string
  status: string
  lifecycle: ProductLifecycleStage
  lifecycleLabel: string
  readiness: PublishReadinessResult
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
  }
  coherenceIssues: CoherenceIssue[]
  nextActions: string[]
}

export interface ProductFlowSnapshotOptions {
  resolveStockSnapshot?: ActivationStockResolver
}

function productRef(product: ProductLike): string {
  const stockNumber = typeof product.stockNumber === 'string' && product.stockNumber.trim().length > 0
    ? product.stockNumber.trim()
    : null
  return stockNumber ?? String(product.id ?? '<product-id>')
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

function imageNextActions(snapshot: Omit<ProductFlowSnapshot, 'nextActions'>): string[] {
  const image = snapshot.imageQuality
  const ref = snapshot.ref

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

function buildNextActions(snapshot: Omit<ProductFlowSnapshot, 'nextActions'>): string[] {
  const actions: string[] = []
  const ref = snapshot.ref

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
  const lifecycle = deriveProductLifecycle(p)
  const activeTargets = resolveConfiguredTargets(p)
  const dispatchNotes = parseDispatchNotes(p.sourceMeta?.dispatchNotes)
  const dispatch = buildChannelDispatchOverview(activeTargets, dispatchNotes)
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

  const base = {
    productId: p.id ?? null,
    ref,
    title: typeof p.title === 'string' && p.title.trim().length > 0 ? p.title : 'Untitled',
    status: typeof p.status === 'string' ? p.status : 'draft',
    lifecycle,
    lifecycleLabel: PRODUCT_LIFECYCLE_LABELS[lifecycle],
    readiness: evaluatePublishReadiness(p as any),
    activationBlockers,
    imageQuality: evaluateImageQualityGate(p),
    shopier: {
      hasIntent,
      evaluation: shopierEvaluation,
      gate: summarizeShopierAdminGate(shopierEvaluation, { hasIntent }),
    },
    channels: {
      activeTargets,
      issues: findProductChannelSelectionIssues(p).map((issue) => issue.detail),
      dispatch,
    },
    coherenceIssues: detectStateIncoherence(p as any),
  }

  return {
    ...base,
    nextActions: buildNextActions(base),
  }
}

export function formatProductFlowSnapshot(snapshot: ProductFlowSnapshot): string {
  const lines: string[] = [
    `<b>Product Flow Snapshot - #${escapeHtml(snapshot.productId ?? snapshot.ref)}</b>`,
    `<b>${escapeHtml(snapshot.title)}</b>`,
    '<i>Read-only: no writes, no publish, no provider calls.</i>',
    '',
    `<b>State</b>: ${escapeHtml(snapshot.lifecycleLabel)} (status=${escapeHtml(snapshot.status)})`,
    `<b>Readiness</b>: ${escapeHtml(snapshot.readiness.level)} ${snapshot.readiness.passedCount}/${snapshot.readiness.totalCount}`,
    `<b>Activation guard</b>: ${snapshot.activationBlockers.length === 0 ? 'passes' : `${snapshot.activationBlockers.length} blocker(s)`}`,
    `<b>Image QC</b>: ${escapeHtml(snapshot.imageQuality.level)} - ${escapeHtml(snapshot.imageQuality.detail)}`,
    `<b>Targets</b>: ${snapshot.channels.activeTargets.length > 0 ? escapeHtml(snapshot.channels.activeTargets.join(', ')) : 'none'}`,
    `<b>Shopier gate</b>: ${escapeHtml(snapshot.shopier.gate.label)} - ${escapeHtml(snapshot.shopier.gate.detail)}`,
  ]

  if (snapshot.channels.dispatch.length > 0) {
    lines.push('')
    lines.push('<b>Dispatch</b>')
    for (const row of snapshot.channels.dispatch.slice(0, 6)) {
      const reason = row.reason ? ` - ${escapeHtml(row.reason)}` : ''
      lines.push(`- ${escapeHtml(row.channel)}: ${escapeHtml(row.label)}${reason}`)
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

  lines.push('')
  lines.push('<b>Next Actions</b>')
  for (const action of snapshot.nextActions) {
    lines.push(`- ${escapeHtml(action)}`)
  }

  return lines.join('\n')
}
