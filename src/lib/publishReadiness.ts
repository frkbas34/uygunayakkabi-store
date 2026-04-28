/**
 * publishReadiness.ts — Central Publish Readiness Evaluation
 *
 * Phase 12 (D-113): Evaluates whether a product has satisfied all required
 * dimensions to be considered publish-ready. Does NOT auto-publish.
 *
 * Readiness dimensions:
 *  1. Confirmation — product confirmed by operator
 *  2. Visuals — acceptable visual assets exist
 *  3. Content — commerce + discovery packs generated
 *  4. Audit — Mentix audit approved or approved_with_warning
 *  5. Sellable — stock exists and product is sellable
 *  6. Publish targets — at least one channel target configured
 *
 * Truthfulness rule: never mark ready if any dimension is not satisfied.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ReadinessLevel = 'not_ready' | 'partially_ready' | 'ready'

export interface DimensionCheck {
  name: string
  passed: boolean
  status: string
  detail?: string
}

export interface PublishReadinessResult {
  level: ReadinessLevel
  dimensions: DimensionCheck[]
  passedCount: number
  totalCount: number
  blockers: string[]
  summary: string
}

// Minimal product shape — only the fields we actually read
export interface ReadinessProduct {
  id: number | string
  title?: string
  status?: string
  price?: number
  images?: any[]
  channelTargets?: string[]
  workflow?: {
    workflowStatus?: string
    visualStatus?: string
    confirmationStatus?: string
    contentStatus?: string
    auditStatus?: string
    publishStatus?: string
    stockState?: string
    sellable?: boolean
  }
  content?: {
    commercePack?: {
      websiteDescription?: string
      instagramCaption?: string
      shopierCopy?: string
    }
    discoveryPack?: {
      articleTitle?: string
      articleBody?: string
      metaTitle?: string
      metaDescription?: string
    }
  }
  auditResult?: {
    overallResult?: string
    approvedForPublish?: boolean
  }
  generativeGallery?: any[]
  stockQuantity?: number
}

// ─── Dimension Checkers ──────────────────────────────────────────────

function checkConfirmation(product: ReadinessProduct): DimensionCheck {
  const status = product.workflow?.confirmationStatus ?? 'pending'
  const passed = status === 'confirmed'
  return {
    name: 'confirmation',
    passed,
    status,
    detail: passed ? 'Operator confirmed' : status === 'blocked' ? 'Blocked by operator' : 'Awaiting confirmation',
  }
}

function checkVisuals(product: ReadinessProduct): DimensionCheck {
  const visualStatus = product.workflow?.visualStatus ?? 'pending'
  const hasOriginals = Array.isArray(product.images) && product.images.length > 0
  const hasGenerative = Array.isArray(product.generativeGallery) && product.generativeGallery.length > 0
  const hasAnyImages = hasOriginals || hasGenerative

  // Visual is acceptable if: images exist (original or AI) and status is not 'rejected'
  const passed = hasAnyImages && visualStatus !== 'rejected'
  let detail = ''
  if (!hasAnyImages) detail = 'No images (original or AI-generated)'
  else if (visualStatus === 'rejected') detail = 'Visuals rejected'
  else if (visualStatus === 'approved') detail = 'Visuals approved'
  else if (visualStatus === 'preview') detail = 'Visuals in preview (acceptable)'
  else detail = `Images exist (${hasOriginals ? 'original' : 'AI'})${visualStatus === 'pending' ? ' — visual review pending' : ''}`

  return { name: 'visuals', passed, status: visualStatus, detail }
}

function checkContent(product: ReadinessProduct): DimensionCheck {
  const contentStatus = product.workflow?.contentStatus ?? 'pending'
  const passed = contentStatus === 'ready'
  let detail = ''
  switch (contentStatus) {
    case 'ready': detail = 'Commerce + discovery packs complete'; break
    case 'commerce_generated': detail = 'Commerce pack done, discovery pending'; break
    case 'discovery_generated': detail = 'Discovery pack done, commerce pending'; break
    case 'failed': detail = 'Content generation failed'; break
    default: detail = 'Content not yet generated'
  }
  return { name: 'content', passed, status: contentStatus, detail }
}

function checkAudit(product: ReadinessProduct): DimensionCheck {
  const auditStatus = product.workflow?.auditStatus ?? 'not_required'
  const overallResult = product.auditResult?.overallResult ?? 'not_reviewed'
  const approvedForPublish = product.auditResult?.approvedForPublish === true

  // Audit passes if: approved or approved_with_warning (approvedForPublish=true)
  // Also passes if auditStatus='not_required' (legacy products without audit)
  const passed = approvedForPublish || auditStatus === 'not_required'
  let detail = ''
  if (approvedForPublish) {
    detail = overallResult === 'approved' ? 'Audit passed' : 'Audit passed with warnings'
  } else if (auditStatus === 'not_required') {
    detail = 'Audit not required (legacy)'
  } else if (overallResult === 'needs_revision') {
    detail = 'Audit needs revision'
  } else if (overallResult === 'failed') {
    detail = 'Audit failed'
  } else {
    detail = 'Audit not yet run'
  }

  return { name: 'audit', passed, status: auditStatus, detail }
}

function checkSellable(product: ReadinessProduct): DimensionCheck {
  const stockState = product.workflow?.stockState ?? 'in_stock'
  const sellable = product.workflow?.sellable
  const stockQty = product.stockQuantity ?? 0

  // Sellable check: stock exists and sellable flag is not explicitly false
  // Legacy compat: sellable=null/undefined + status=active is acceptable
  const isSoldOut = stockState === 'sold_out'
  const isSellable = sellable !== false && !isSoldOut
  const hasStock = stockQty > 0 || stockState === 'in_stock' || stockState === 'low_stock'

  const passed = isSellable && hasStock
  let detail = ''
  if (isSoldOut) detail = 'Product is sold out'
  else if (sellable === false) detail = 'Marked as not sellable'
  else if (!hasStock) detail = 'No stock available'
  else detail = `In stock (${stockQty} units, state: ${stockState})`

  return { name: 'sellable', passed, status: stockState, detail }
}

function checkPublishTargets(product: ReadinessProduct): DimensionCheck {
  const targets = product.channelTargets
  const hasTargets = Array.isArray(targets) && targets.length > 0
  return {
    name: 'publish_targets',
    passed: hasTargets,
    status: hasTargets ? `${targets.length} target(s)` : 'none',
    detail: hasTargets ? `Targets: ${targets.join(', ')}` : 'No publish targets configured',
  }
}

// ─── Main Evaluation ─────────────────────────────────────────────────

/**
 * Evaluates full publish readiness across all 6 dimensions.
 * Returns: not_ready (0-2 passed), partially_ready (3-5 passed), ready (all 6 passed).
 */
export function evaluatePublishReadiness(product: ReadinessProduct): PublishReadinessResult {
  const dimensions: DimensionCheck[] = [
    checkConfirmation(product),
    checkVisuals(product),
    checkContent(product),
    checkAudit(product),
    checkSellable(product),
    checkPublishTargets(product),
  ]

  const passedCount = dimensions.filter(d => d.passed).length
  const totalCount = dimensions.length
  const blockers = dimensions.filter(d => !d.passed).map(d => `${d.name}: ${d.detail}`)

  let level: ReadinessLevel
  if (passedCount === totalCount) {
    level = 'ready'
  } else if (passedCount >= 3) {
    level = 'partially_ready'
  } else {
    level = 'not_ready'
  }

  const summary = level === 'ready'
    ? '✅ All dimensions satisfied — product is publish-ready'
    : `${passedCount}/${totalCount} dimensions passed — ${blockers.length} blocker(s)`

  return { level, dimensions, passedCount, totalCount, blockers, summary }
}

// ─── Formatting ──────────────────────────────────────────────────────

const LEVEL_EMOJI: Record<ReadinessLevel, string> = {
  ready: '🟢',
  partially_ready: '🟡',
  not_ready: '🔴',
}

const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  ready: 'READY',
  partially_ready: 'PARTIALLY READY',
  not_ready: 'NOT READY',
}

/**
 * Formats publish readiness as a compact Telegram HTML message.
 */
export function formatReadinessMessage(product: ReadinessProduct, result: PublishReadinessResult): string {
  const lines: string[] = [
    `<b>📋 Publish Readiness — #${product.id}</b>`,
    `<b>${product.title || 'Untitled'}</b>`,
    '',
    `${LEVEL_EMOJI[result.level]} <b>${LEVEL_LABEL[result.level]}</b> (${result.passedCount}/${result.totalCount})`,
    '',
  ]

  for (const dim of result.dimensions) {
    const icon = dim.passed ? '✅' : '❌'
    lines.push(`${icon} <b>${dim.name}</b>: ${dim.detail}`)
  }

  if (result.blockers.length > 0) {
    lines.push('')
    lines.push(`<b>Blockers:</b> ${result.blockers.length}`)
  }

  return lines.join('\n')
}

// ─── Pipeline Status (Full Lifecycle) ────────────────────────────────

export interface PipelineStatus {
  productId: number | string
  title: string
  overallStatus: string
  stages: PipelineStage[]
}

export interface PipelineStage {
  name: string
  icon: string
  status: string
  detail: string
}

/**
 * Computes the full pipeline status for operator visibility.
 * Shows every lifecycle stage with its current state.
 */
export function computePipelineStatus(product: ReadinessProduct & {
  merchandising?: {
    isPopular?: boolean
    isDeal?: boolean
    bestSellerPinned?: boolean
    excludeFromMerchandising?: boolean
    publishedAt?: string
    newUntil?: string
  }
  sourceMeta?: {
    storyStatus?: string
    dispatchedChannels?: string
    shopierSyncStatus?: string
  }
}): PipelineStatus {
  const wf = product.workflow || {}
  const ar = product.auditResult || {}
  const merch = (product as any).merchandising || {}
  const sm = (product as any).sourceMeta || {}

  const stages: PipelineStage[] = []

  // 1. Intake
  const intakeStatus = product.status === 'draft' && !wf.confirmationStatus ? 'intake' : 'done'
  stages.push({
    name: 'Intake',
    icon: intakeStatus === 'done' ? '✅' : '📥',
    status: intakeStatus === 'done' ? 'complete' : 'in_progress',
    detail: intakeStatus === 'done' ? 'Product created' : 'Awaiting intake',
  })

  // 2. Visuals
  const vs = wf.visualStatus ?? 'pending'
  const hasImages = (Array.isArray(product.images) && product.images.length > 0) ||
    (Array.isArray(product.generativeGallery) && product.generativeGallery.length > 0)
  stages.push({
    name: 'Visuals',
    icon: vs === 'approved' ? '✅' : hasImages ? '🖼️' : '⏳',
    status: vs,
    detail: vs === 'approved' ? 'Approved' :
      vs === 'rejected' ? 'Rejected' :
        vs === 'preview' ? 'In preview' :
          hasImages ? `Images exist (status: ${vs})` : 'No images yet',
  })

  // 3. Confirmation
  const cs = wf.confirmationStatus ?? 'pending'
  stages.push({
    name: 'Confirmation',
    icon: cs === 'confirmed' ? '✅' : cs === 'blocked' ? '🚫' : '⏳',
    status: cs,
    detail: cs === 'confirmed' ? 'Operator confirmed' : cs === 'blocked' ? 'Blocked' : 'Pending',
  })

  // 4. Content
  const cts = wf.contentStatus ?? 'pending'
  stages.push({
    name: 'Content',
    icon: cts === 'ready' ? '✅' : cts === 'failed' ? '❌' : cts.includes('generated') ? '🟡' : '⏳',
    status: cts,
    detail: cts === 'ready' ? 'Commerce + discovery ready' :
      cts === 'commerce_generated' ? 'Commerce done, discovery pending' :
        cts === 'discovery_generated' ? 'Discovery done, commerce pending' :
          cts === 'failed' ? 'Generation failed' : 'Not generated',
  })

  // 5. Audit
  const aus = wf.auditStatus ?? 'not_required'
  const approvedForPublish = ar.approvedForPublish === true
  stages.push({
    name: 'Audit',
    icon: approvedForPublish ? '✅' : aus === 'not_required' ? '➖' : aus === 'failed' ? '❌' : aus === 'needs_revision' ? '🟠' : '⏳',
    status: aus,
    detail: approvedForPublish ? `Approved (${ar.overallResult})` :
      aus === 'not_required' ? 'Not required' :
        aus === 'failed' ? 'Failed' :
          aus === 'needs_revision' ? 'Needs revision' :
            aus === 'pending' ? 'In progress' : 'Not started',
  })

  // 6. Publish Readiness
  const readiness = evaluatePublishReadiness(product)
  stages.push({
    name: 'Readiness',
    icon: readiness.level === 'ready' ? '✅' : readiness.level === 'partially_ready' ? '🟡' : '🔴',
    status: readiness.level,
    detail: `${readiness.passedCount}/${readiness.totalCount} dimensions`,
  })

  // 7. Publish / Distribution
  const ps = wf.publishStatus ?? 'not_requested'
  const dispatched = sm.dispatchedChannels ? JSON.parse(sm.dispatchedChannels || '[]') : []
  stages.push({
    name: 'Publish',
    icon: ps === 'published' ? '✅' : ps === 'partial' ? '🟡' : ps === 'failed' ? '❌' : '⏳',
    status: ps,
    detail: ps === 'published' ? `Published to ${dispatched.length} channel(s)` :
      ps === 'partial' ? `Partial: ${dispatched.length} channel(s)` :
        ps === 'failed' ? 'Publish failed' :
          product.status === 'active' ? 'Active (legacy publish)' : 'Not published',
  })

  // 8. Stock
  const ss = wf.stockState ?? 'in_stock'
  stages.push({
    name: 'Stock',
    icon: ss === 'in_stock' ? '✅' : ss === 'low_stock' ? '🟡' : ss === 'sold_out' ? '🔴' : '🔄',
    status: ss,
    detail: `${product.stockQuantity ?? 0} units (${ss})`,
  })

  // 9. Merchandising (condensed)
  const merchFlags: string[] = []
  if (merch.isPopular) merchFlags.push('popular')
  if (merch.isDeal) merchFlags.push('deal')
  if (merch.bestSellerPinned) merchFlags.push('bestseller-pinned')
  if (merch.excludeFromMerchandising) merchFlags.push('excluded')
  stages.push({
    name: 'Merchandising',
    icon: merchFlags.length > 0 ? '🏷️' : '➖',
    status: merchFlags.length > 0 ? 'configured' : 'default',
    detail: merchFlags.length > 0 ? merchFlags.join(', ') : 'No special flags',
  })

  // 10. Story
  const storyStatus = sm.storyStatus ?? 'none'
  stages.push({
    name: 'Story',
    icon: storyStatus === 'published' ? '✅' : storyStatus === 'queued' || storyStatus === 'awaiting_approval' ? '⏳' : storyStatus === 'failed' ? '❌' : '➖',
    status: storyStatus,
    detail: storyStatus === 'published' ? 'Published' :
      storyStatus === 'awaiting_approval' ? 'Awaiting approval' :
        storyStatus === 'queued' ? 'Queued' :
          storyStatus === 'failed' ? 'Failed' :
            storyStatus === 'blocked_officially' ? 'Blocked (platform)' : 'Not dispatched',
  })

  // Overall status
  const overallStatus = product.status === 'active' ? '🟢 ACTIVE' :
    product.status === 'soldout' ? '🔴 SOLDOUT' :
      readiness.level === 'ready' ? '🟡 READY (not yet active)' :
        `⏳ IN PROGRESS (${wf.workflowStatus || 'draft'})`

  return {
    productId: product.id,
    title: product.title || 'Untitled',
    overallStatus,
    stages,
  }
}

/**
 * Formats pipeline status as a compact Telegram HTML message.
 */
export function formatPipelineMessage(pipeline: PipelineStatus): string {
  const lines: string[] = [
    `<b>🔄 Pipeline — #${pipeline.productId}</b>`,
    `<b>${pipeline.title}</b>`,
    `Status: ${pipeline.overallStatus}`,
    '',
  ]

  for (const stage of pipeline.stages) {
    lines.push(`${stage.icon} <b>${stage.name}</b>: ${stage.detail}`)
  }

  return lines.join('\n')
}

// ─── State Coherence Validation ──────────────────────────────────────

export interface CoherenceIssue {
  field: string
  expected: string
  actual: string
  severity: 'warning' | 'error'
}

/**
 * Detects contradictory or incoherent product states.
 * Returns empty array if all states are coherent.
 * This is a diagnostic tool — it does NOT fix states.
 *
 * Valid state progression:
 *   draft → visual_pending → visual_ready → confirmation_pending → confirmed
 *   → content_pending → content_ready → audit_pending → publish_ready → active → soldout → archived
 */
export function detectStateIncoherence(product: ReadinessProduct): CoherenceIssue[] {
  const issues: CoherenceIssue[] = []
  const wf = product.workflow || {}
  const ar = product.auditResult || {}

  // 1. status=active but workflowStatus is pre-publish stage
  if (product.status === 'active' && wf.workflowStatus &&
    ['draft', 'visual_pending', 'confirmation_pending', 'content_pending', 'audit_pending'].includes(wf.workflowStatus)) {
    issues.push({
      field: 'workflowStatus',
      expected: 'active or publish_ready',
      actual: wf.workflowStatus,
      severity: 'warning',
    })
  }

  // 2. status=soldout but stockState is not sold_out
  if (product.status === 'soldout' && wf.stockState && wf.stockState !== 'sold_out') {
    issues.push({
      field: 'stockState',
      expected: 'sold_out',
      actual: wf.stockState,
      severity: 'error',
    })
  }

  // 3. status=soldout but sellable=true
  if (product.status === 'soldout' && wf.sellable === true) {
    issues.push({
      field: 'sellable',
      expected: 'false',
      actual: 'true',
      severity: 'error',
    })
  }

  // 4. auditResult.approvedForPublish=true but auditStatus is failed/needs_revision
  if (ar.approvedForPublish === true && wf.auditStatus &&
    ['failed', 'needs_revision'].includes(wf.auditStatus)) {
    issues.push({
      field: 'auditStatus vs approvedForPublish',
      expected: 'approved or approved_with_warning',
      actual: wf.auditStatus,
      severity: 'error',
    })
  }

  // 5. workflowStatus=publish_ready but confirmationStatus is not confirmed
  if (wf.workflowStatus === 'publish_ready' && wf.confirmationStatus !== 'confirmed') {
    issues.push({
      field: 'confirmationStatus',
      expected: 'confirmed',
      actual: wf.confirmationStatus || 'pending',
      severity: 'error',
    })
  }

  // 6. contentStatus=ready but workflowStatus still before content_ready
  if (wf.contentStatus === 'ready' && wf.workflowStatus &&
    ['draft', 'visual_pending', 'visual_ready', 'confirmation_pending', 'confirmed', 'content_pending'].includes(wf.workflowStatus)) {
    issues.push({
      field: 'workflowStatus vs contentStatus',
      expected: 'content_ready or later',
      actual: wf.workflowStatus,
      severity: 'warning',
    })
  }

  // 7. sellable=true but stockState=sold_out
  if (wf.sellable === true && wf.stockState === 'sold_out') {
    issues.push({
      field: 'sellable vs stockState',
      expected: 'sellable=false when sold_out',
      actual: 'sellable=true + sold_out',
      severity: 'error',
    })
  }

  // 8. D-238: workflowStatus='active' but status is not 'active'.
  // Observed in production on SN0032 (workflow.workflowStatus stuck at 'active'
  // after status was rolled back to draft via some path that didn't realign
  // workflowStatus). Inverse of rule #1 — same coherence concern, opposite
  // direction.
  if (wf.workflowStatus === 'active' && product.status !== 'active') {
    issues.push({
      field: 'status vs workflowStatus',
      expected: `status='active' (because workflowStatus='active')`,
      actual: `status='${product.status ?? 'draft'}'`,
      severity: 'error',
    })
  }

  // 9. D-238: status=active but publishStatus is pre-publish.
  // Observed on legacy activations (SN0013, SN0002, SN0033) where the
  // /activate path didn't set publishStatus or earlier paths reset it.
  // Severity warning rather than error: customer-facing state is correct
  // (status=active means visible on storefront), but the publishStatus
  // signal misleads /pipeline / /inbox.
  if (
    product.status === 'active' &&
    wf.publishStatus &&
    ['not_requested', 'pending'].includes(wf.publishStatus)
  ) {
    issues.push({
      field: 'publishStatus',
      expected: `'published' (status is 'active')`,
      actual: wf.publishStatus,
      severity: 'warning',
    })
  }

  return issues
}

/**
 * Formats coherence issues for Telegram display.
 */
export function formatCoherenceMessage(product: ReadinessProduct, issues: CoherenceIssue[]): string {
  if (issues.length === 0) {
    return `✅ <b>State Coherence — #${product.id}</b>\nNo contradictions detected.`
  }
  const lines = [
    `⚠️ <b>State Coherence — #${product.id}</b>`,
    `${issues.length} issue(s) detected:`,
    '',
  ]
  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '🔴' : '🟡'
    lines.push(`${icon} <b>${issue.field}</b>: expected ${issue.expected}, got ${issue.actual}`)
  }
  return lines.join('\n')
}
