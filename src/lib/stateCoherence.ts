/**
 * stateCoherence.ts — D-238 State Coherence Sweep + Repair
 *
 * Read-only detection lives in publishReadiness.ts::detectStateIncoherence
 * (extended in D-238 with rules #8 and #9). This module adds the *repair*
 * path: deterministic, idempotent normalization that aligns state fields
 * to their ground-truth values.
 *
 * Design rules (smallest correct):
 *
 * 1. Ground truth precedence:
 *      product.status            — customer-facing state (active|soldout|draft)
 *      product.workflow.stockState  — derived from variants/stockQuantity
 *      product.workflow.contentStatus / .auditStatus — set by their pipelines
 *    Other fields (workflowStatus, publishStatus, sellable) are DERIVED
 *    from these and must follow them.
 *
 * 2. Normalization is non-destructive: only fields that disagree with
 *    ground truth get rewritten. If everything's already coherent,
 *    nothing happens.
 *
 * 3. Idempotent: running twice in a row produces the same result as
 *    running once. The second run is a no-op (`changed: false`).
 *
 * 4. Operator-explicit: /repair <sn-or-id> defaults to dry-run. The
 *    operator passes `confirm` to actually apply.
 *
 * 5. Does NOT touch:
 *      - PI / GeoBot / wizard fields
 *      - image-pipeline fields
 *      - external publishing channels (no dispatch)
 *      - audit/approval state (just status & workflow)
 *      - archived products (left alone)
 */

const ARCHIVED_WORKFLOW = 'archived'

export interface NormalizeReport {
  productId: number | string
  changed: boolean
  patches: Array<{
    field: string
    from: unknown
    to: unknown
    reason: string
  }>
  skipped?: 'archived' | 'product_not_found'
  message: string
}

/** Compute the workflowStatus that SHOULD apply, based on ground truth. */
function deriveWorkflowStatus(p: any): string | null {
  const status = p.status as string | undefined
  const wf = p.workflow ?? {}
  const contentStatus = wf.contentStatus as string | undefined
  const auditStatus = wf.auditStatus as string | undefined
  const stockState = wf.stockState as string | undefined
  const confirmationStatus = wf.confirmationStatus as string | undefined

  // Customer-facing soldout takes precedence over publish progression.
  if (status === 'soldout' || stockState === 'sold_out') return 'soldout'
  // Customer-facing active overrides any earlier workflow stage.
  if (status === 'active') return 'active'

  // Pre-active progression — derive from the latest pipeline signal.
  // Order matches the documented sequence in detectStateIncoherence.
  if (auditStatus === 'approved' || auditStatus === 'approved_with_warning') {
    return 'publish_ready'
  }
  if (auditStatus === 'pending') return 'audit_pending'
  if (auditStatus === 'failed' || auditStatus === 'needs_revision') {
    return 'audit_pending'
  }
  if (contentStatus === 'ready') return 'content_ready'
  if (contentStatus === 'commerce_generated' || contentStatus === 'discovery_generated') {
    return 'content_pending'
  }
  if (contentStatus === 'failed') return 'content_pending'
  if (confirmationStatus === 'confirmed') return 'confirmed'
  if (confirmationStatus === 'pending' && wf.visualStatus === 'approved') {
    return 'confirmation_pending'
  }
  if (wf.visualStatus === 'approved') return 'visual_ready'
  if (wf.visualStatus === 'preview' || wf.visualStatus === 'generating') {
    return 'visual_pending'
  }
  return 'draft'
}

/** Compute publishStatus from status. */
function derivePublishStatus(p: any): string | null {
  if (p.status === 'active') return 'published'
  // For draft / soldout / not-yet-active: leave as-is unless caller explicitly
  // wants to reset. We do NOT downgrade 'published' → 'pending' just because
  // status is no longer active — that would lose audit information.
  return null
}

/** Compute sellable boolean. */
function deriveSellable(p: any): boolean | null {
  const wf = p.workflow ?? {}
  if (p.status === 'soldout' || wf.stockState === 'sold_out') return false
  if (p.status === 'active' && wf.stockState !== 'sold_out') return true
  return null // ambiguous — leave alone
}

/**
 * D-238: Run a deterministic normalization pass on a single product.
 * Returns a report of what was (or would be) changed.
 *
 * dryRun=true (default): no DB write, just compute the diff.
 * dryRun=false: write the patch via payload.update.
 */
export async function normalizeProductState(
  payload: any,
  productId: number | string,
  opts: { dryRun?: boolean } = {},
): Promise<NormalizeReport> {
  const dryRun = opts.dryRun !== false // default: dry-run

  let product: any
  try {
    product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
  } catch {
    return {
      productId,
      changed: false,
      patches: [],
      skipped: 'product_not_found',
      message: `❌ Ürün bulunamadı (ID: ${productId})`,
    }
  }
  if (!product) {
    return {
      productId,
      changed: false,
      patches: [],
      skipped: 'product_not_found',
      message: `❌ Ürün bulunamadı (ID: ${productId})`,
    }
  }

  const wf = (product.workflow ?? {}) as Record<string, unknown>

  // Skip archived — operator presumably archived intentionally; leave alone.
  if (wf.workflowStatus === ARCHIVED_WORKFLOW) {
    return {
      productId,
      changed: false,
      patches: [],
      skipped: 'archived',
      message: `📦 Arşivlenmiş ürün — değişiklik yapılmadı.`,
    }
  }

  const patches: NormalizeReport['patches'] = []

  // Rule A: workflowStatus must match the derived value
  const wantWorkflow = deriveWorkflowStatus(product)
  if (wantWorkflow && wf.workflowStatus !== wantWorkflow) {
    patches.push({
      field: 'workflow.workflowStatus',
      from: wf.workflowStatus ?? null,
      to: wantWorkflow,
      reason: `derived from status='${product.status}', contentStatus='${wf.contentStatus ?? '—'}', auditStatus='${wf.auditStatus ?? '—'}', stockState='${wf.stockState ?? '—'}'`,
    })
  }

  // Rule B: publishStatus must match status (only set when we're confident)
  const wantPublish = derivePublishStatus(product)
  if (wantPublish && wf.publishStatus !== wantPublish) {
    patches.push({
      field: 'workflow.publishStatus',
      from: wf.publishStatus ?? null,
      to: wantPublish,
      reason: `status='active' implies publishStatus='published'`,
    })
  }

  // Rule C: sellable must match status + stockState
  const wantSellable = deriveSellable(product)
  if (wantSellable !== null && wf.sellable !== wantSellable) {
    patches.push({
      field: 'workflow.sellable',
      from: wf.sellable ?? null,
      to: wantSellable,
      reason: wantSellable
        ? `status='active' + stockState!='sold_out' → sellable=true`
        : `status='soldout' or stockState='sold_out' → sellable=false`,
    })
  }

  if (patches.length === 0) {
    return {
      productId,
      changed: false,
      patches: [],
      message: `✅ Tutarlı — düzeltilmesi gereken alan yok.`,
    }
  }

  const sn = product.stockNumber || `ID:${productId}`

  if (dryRun) {
    const lines = [`🔍 <b>Repair önizlemesi — ${sn}</b>`, '']
    for (const p of patches) {
      lines.push(`• <b>${p.field}</b>: <code>${String(p.from)}</code> → <code>${String(p.to)}</code>`)
      lines.push(`  <i>${p.reason}</i>`)
    }
    lines.push('')
    lines.push(`<i>Uygulamak için: /repair ${sn} confirm</i>`)
    return {
      productId,
      changed: true,
      patches,
      message: lines.join('\n'),
    }
  }

  // Build the update payload — minimal, only fields that need change
  const updateWorkflow: Record<string, unknown> = { ...wf }
  for (const p of patches) {
    if (p.field === 'workflow.workflowStatus') updateWorkflow.workflowStatus = p.to
    if (p.field === 'workflow.publishStatus') updateWorkflow.publishStatus = p.to
    if (p.field === 'workflow.sellable') updateWorkflow.sellable = p.to
  }

  await payload.update({
    collection: 'products',
    id: productId,
    data: { workflow: updateWorkflow },
    context: { isDispatchUpdate: true }, // suppress afterChange dispatch on a pure-coherence write
  })

  // Best-effort audit-trail event
  try {
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'state.repaired',
        product: productId,
        sourceBot: 'uygunops',
        status: 'processed',
        payload: {
          repairedAt: new Date().toISOString(),
          patches: patches.map((p) => ({ field: p.field, from: p.from, to: p.to, reason: p.reason })),
        },
        notes: `Coherence repair on product ${productId}: ${patches.map((p) => p.field).join(', ')}.`,
        processedAt: new Date().toISOString(),
      },
    })
  } catch {
    /* non-fatal */
  }

  const lines = [`🔧 <b>Repair uygulandı — ${sn}</b>`, '']
  for (const p of patches) {
    lines.push(`✅ <b>${p.field}</b>: <code>${String(p.from)}</code> → <code>${String(p.to)}</code>`)
  }
  lines.push('')
  lines.push(`<i>${patches.length} alan düzeltildi. /pipeline ${sn} ile doğrulayın.</i>`)
  return {
    productId,
    changed: true,
    patches,
    message: lines.join('\n'),
  }
}

/**
 * D-238: Detect coherence drift across the entire active corpus and
 * return a summary. Read-only — does not mutate.
 *
 * Used by /repair scan to give the operator the full drift picture before
 * targeted fixes.
 */
export async function scanCoherenceDrift(
  payload: any,
  opts: { limit?: number } = {},
): Promise<{
  totalScanned: number
  drifted: Array<{ id: number | string; sn: string | null; issues: number; sample: string[] }>
}> {
  const { detectStateIncoherence } = await import('./publishReadiness')
  const limit = opts.limit ?? 200
  const { docs } = await payload.find({
    collection: 'products',
    where: { 'workflow.workflowStatus': { not_equals: 'archived' } },
    limit,
    depth: 0,
    sort: '-updatedAt',
  })
  const drifted: Array<{ id: number | string; sn: string | null; issues: number; sample: string[] }> = []
  for (const p of docs as any[]) {
    const issues = detectStateIncoherence(p)
    if (issues.length > 0) {
      drifted.push({
        id: p.id,
        sn: (p.stockNumber as string) || null,
        issues: issues.length,
        sample: issues.slice(0, 3).map((i) => `${i.field}: ${i.actual} (want: ${i.expected})`),
      })
    }
  }
  return { totalScanned: docs.length, drifted }
}

export function formatScanReport(scan: Awaited<ReturnType<typeof scanCoherenceDrift>>): string {
  if (scan.drifted.length === 0) {
    return (
      `✅ <b>Coherence Scan</b>\n\n` +
      `${scan.totalScanned} ürün tarandı. Tutarsızlık yok.`
    )
  }
  const lines = [
    `⚠️ <b>Coherence Scan</b>`,
    ``,
    `${scan.totalScanned} ürün tarandı, <b>${scan.drifted.length}</b> ürün tutarsız.`,
    ``,
  ]
  for (const d of scan.drifted.slice(0, 10)) {
    const id = d.sn ?? `ID:${d.id}`
    lines.push(`🔴 <code>${id}</code> · ${d.issues} sorun`)
    for (const s of d.sample) lines.push(`    • ${s}`)
  }
  if (scan.drifted.length > 10) {
    lines.push(``, `<i>+ ${scan.drifted.length - 10} ürün daha — /repair &lt;sn&gt; ile tek tek kontrol edin.</i>`)
  } else {
    lines.push(``, `<i>Düzeltmek için: /repair &lt;sn&gt; (önizleme), /repair &lt;sn&gt; confirm (uygula)</i>`)
  }
  return lines.join('\n')
}
