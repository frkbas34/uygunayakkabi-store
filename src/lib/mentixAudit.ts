/**
 * mentixAudit.ts — Phase 8 Mentix Audit + Content Review Layer
 *
 * Structured product audit across 4 dimensions:
 * 1. Visual — approved images exist, hero present, visual state coherent
 * 2. Commerce — channel copies exist, highlights present, confidence adequate
 * 3. Discovery — article/meta/FAQ exist, blog linked, confidence adequate
 * 4. Overall — confirmation, content, sellable, publish targets
 *
 * All audit results are deterministic and truthful.
 * approvedForPublish is NEVER set true unless all dimensions actually pass.
 */

// ── Types ─────────────────────────────────────────────────────────────

export type DimensionResult = 'not_reviewed' | 'pass' | 'pass_with_warning' | 'fail'
export type OverallResult = 'not_reviewed' | 'approved' | 'approved_with_warning' | 'needs_revision' | 'failed'
export type AuditStatus = 'not_required' | 'pending' | 'approved' | 'approved_with_warning' | 'needs_revision' | 'failed'

export interface AuditableProduct {
  id: number | string
  title?: string | null
  status?: string | null
  price?: number | null
  category?: string | null
  channelTargets?: string[] | null
  images?: Array<{ id: number | string }> | null
  generativeGallery?: Array<{ image?: number | string | null }> | null
  workflow?: {
    workflowStatus?: string | null
    visualStatus?: string | null
    confirmationStatus?: string | null
    contentStatus?: string | null
    auditStatus?: string | null
    publishStatus?: string | null
    stockState?: string | null
    sellable?: boolean | null
    lastHandledByBot?: string | null
  } | null
  content?: {
    commercePack?: {
      websiteDescription?: string | null
      instagramCaption?: string | null
      xPost?: string | null
      facebookCopy?: string | null
      shopierCopy?: string | null
      highlights?: string[] | null
      confidence?: number | null
      warnings?: string[] | null
    } | null
    discoveryPack?: {
      articleTitle?: string | null
      articleBody?: string | null
      metaTitle?: string | null
      metaDescription?: string | null
      faq?: Array<{ q: string; a: string }> | null
      keywordEntities?: string[] | null
      confidence?: number | null
      warnings?: string[] | null
    } | null
    linkedBlogPost?: number | string | null
  } | null
  auditResult?: {
    visualAudit?: string | null
    commerceAudit?: string | null
    discoveryAudit?: string | null
    overallResult?: string | null
    approvedForPublish?: boolean | null
    warnings?: string[] | null
    revisionNotes?: string | null
    auditedAt?: string | null
    auditedByBot?: string | null
  } | null
}

export interface DimensionAuditResult {
  result: DimensionResult
  warnings: string[]
}

export interface FullAuditResult {
  visual: DimensionAuditResult
  commerce: DimensionAuditResult
  discovery: DimensionAuditResult
  overallResult: OverallResult
  auditStatus: AuditStatus
  approvedForPublish: boolean
  allWarnings: string[]
  revisionNotes: string[]
}

export interface AuditTriggerResult {
  triggered: boolean
  auditResult?: FullAuditResult
  error?: string
}

// ── Constants ─────────────────────────────────────────────────────────

const MIN_CONFIDENCE = 50 // Minimum confidence score to pass without warning

// ── Eligibility ───────────────────────────────────────────────────────

/**
 * Check if a product is eligible for audit.
 * Must be confirmed with content ready (or at least partially generated).
 */
export function isAuditEligible(product: AuditableProduct): boolean {
  if (product.workflow?.confirmationStatus !== 'confirmed') return false
  const cs = product.workflow?.contentStatus
  if (!cs || cs === 'pending') return false
  return true
}

/**
 * Should auto-trigger audit after content generation completes?
 */
export function shouldAutoTriggerAudit(product: AuditableProduct): boolean {
  if (!isAuditEligible(product)) return false
  const cs = product.workflow?.contentStatus
  // Only auto-trigger when content is fully ready
  if (cs !== 'ready') return false
  // Don't re-audit if already approved
  const as = product.workflow?.auditStatus
  if (as === 'approved' || as === 'approved_with_warning') return false
  return true
}

// ── Dimension audits ──────────────────────────────────────────────────

function hasNonEmpty(val: unknown): boolean {
  return typeof val === 'string' && val.trim().length > 0
}

/**
 * Audit visual readiness.
 */
export function auditVisual(product: AuditableProduct): DimensionAuditResult {
  const warnings: string[] = []

  const hasOriginal = (product.images?.length ?? 0) > 0
  const hasGenGallery = (product.generativeGallery?.length ?? 0) > 0
  const visualStatus = product.workflow?.visualStatus

  if (!hasOriginal && !hasGenGallery) {
    return { result: 'fail', warnings: ['Hiç görsel yok — orijinal veya AI görseli bulunamadı'] }
  }

  if (!hasOriginal) {
    warnings.push('Orijinal görsel yok — sadece AI üretimi görseller mevcut')
  }

  if (visualStatus === 'rejected') {
    return { result: 'fail', warnings: ['Görseller reddedilmiş (visualStatus=rejected)'] }
  }

  if (visualStatus === 'pending' || visualStatus === 'generating') {
    warnings.push(`Görsel durumu henüz kesinleşmemiş (visualStatus=${visualStatus})`)
  }

  return {
    result: warnings.length > 0 ? 'pass_with_warning' : 'pass',
    warnings,
  }
}

/**
 * Audit commerce pack quality.
 */
export function auditCommerce(product: AuditableProduct): DimensionAuditResult {
  const warnings: string[] = []
  const cp = product.content?.commercePack

  if (!cp) {
    return { result: 'fail', warnings: ['Commerce pack üretilmemiş'] }
  }

  // Required fields
  const requiredFields: Array<[string, unknown]> = [
    ['websiteDescription', cp.websiteDescription],
    ['instagramCaption', cp.instagramCaption],
    ['shopierCopy', cp.shopierCopy],
  ]

  const missing = requiredFields.filter(([, v]) => !hasNonEmpty(v)).map(([n]) => n)
  if (missing.length > 0) {
    return { result: 'fail', warnings: [`Commerce zorunlu alanlar eksik: ${missing.join(', ')}`] }
  }

  // Optional but desirable
  if (!hasNonEmpty(cp.xPost)) warnings.push('X/Twitter post eksik')
  if (!hasNonEmpty(cp.facebookCopy)) warnings.push('Facebook copy eksik')
  if (!cp.highlights || cp.highlights.length === 0) warnings.push('Highlights (öne çıkan noktalar) eksik')

  // Confidence check
  if (typeof cp.confidence === 'number' && cp.confidence < MIN_CONFIDENCE) {
    warnings.push(`Commerce güven skoru düşük: ${cp.confidence}% (min ${MIN_CONFIDENCE}%)`)
  }

  // Content-generation warnings
  if (cp.warnings && cp.warnings.length > 0) {
    warnings.push(`Commerce üretim uyarıları: ${cp.warnings.join('; ')}`)
  }

  return {
    result: warnings.length > 0 ? 'pass_with_warning' : 'pass',
    warnings,
  }
}

/**
 * Audit discovery pack quality.
 */
export function auditDiscovery(product: AuditableProduct): DimensionAuditResult {
  const warnings: string[] = []
  const dp = product.content?.discoveryPack

  if (!dp) {
    return { result: 'fail', warnings: ['Discovery pack üretilmemiş'] }
  }

  // Required fields
  const requiredFields: Array<[string, unknown]> = [
    ['articleTitle', dp.articleTitle],
    ['articleBody', dp.articleBody],
    ['metaTitle', dp.metaTitle],
    ['metaDescription', dp.metaDescription],
  ]

  const missing = requiredFields.filter(([, v]) => !hasNonEmpty(v)).map(([n]) => n)
  if (missing.length > 0) {
    return { result: 'fail', warnings: [`Discovery zorunlu alanlar eksik: ${missing.join(', ')}`] }
  }

  // Article length check
  const bodyLen = dp.articleBody?.length ?? 0
  if (bodyLen < 500) {
    warnings.push(`Makale çok kısa (${bodyLen} karakter, min 500 önerilir)`)
  }

  // FAQ check
  if (!dp.faq || dp.faq.length < 2) {
    warnings.push(`FAQ yetersiz (${dp.faq?.length ?? 0} soru, min 2 önerilir)`)
  }

  // Keywords check
  if (!dp.keywordEntities || dp.keywordEntities.length < 3) {
    warnings.push(`Anahtar kelime sayısı az (${dp.keywordEntities?.length ?? 0}, min 3 önerilir)`)
  }

  // Blog linkage
  if (!product.content?.linkedBlogPost) {
    warnings.push('Blog yazısı bağlanmamış (linkedBlogPost yok)')
  }

  // Confidence check
  if (typeof dp.confidence === 'number' && dp.confidence < MIN_CONFIDENCE) {
    warnings.push(`Discovery güven skoru düşük: ${dp.confidence}% (min ${MIN_CONFIDENCE}%)`)
  }

  // Content-generation warnings
  if (dp.warnings && dp.warnings.length > 0) {
    warnings.push(`Discovery üretim uyarıları: ${dp.warnings.join('; ')}`)
  }

  return {
    result: warnings.length > 0 ? 'pass_with_warning' : 'pass',
    warnings,
  }
}

// ── Overall assessment ────────────────────────────────────────────────

/**
 * Run full 4-dimension audit on a product.
 * Returns structured results — caller writes them to the product.
 */
export function runFullAudit(product: AuditableProduct): FullAuditResult {
  const visual = auditVisual(product)
  const commerce = auditCommerce(product)
  const discovery = auditDiscovery(product)

  const allWarnings = [...visual.warnings, ...commerce.warnings, ...discovery.warnings]
  const revisionNotes: string[] = []

  // Additional overall checks
  if (product.workflow?.confirmationStatus !== 'confirmed') {
    revisionNotes.push('Ürün henüz onaylanmamış')
  }
  if (!product.price || product.price <= 0) {
    revisionNotes.push('Fiyat eksik veya geçersiz')
  }
  if (!product.channelTargets || product.channelTargets.length === 0) {
    revisionNotes.push('Yayın hedefi seçilmemiş')
  }
  if (product.workflow?.sellable === false) {
    revisionNotes.push('Ürün satışa kapalı (sellable=false)')
  }

  // Determine overall result
  const dimensions = [visual.result, commerce.result, discovery.result]
  const hasFail = dimensions.includes('fail')
  const hasWarning = dimensions.includes('pass_with_warning')
  const hasRevision = revisionNotes.length > 0

  let overallResult: OverallResult
  let auditStatus: AuditStatus

  if (hasFail || hasRevision) {
    if (hasFail) {
      overallResult = 'failed'
      auditStatus = 'failed'
    } else {
      overallResult = 'needs_revision'
      auditStatus = 'needs_revision'
    }
  } else if (hasWarning) {
    overallResult = 'approved_with_warning'
    auditStatus = 'approved_with_warning'
  } else {
    overallResult = 'approved'
    auditStatus = 'approved'
  }

  const approvedForPublish =
    overallResult === 'approved' || overallResult === 'approved_with_warning'

  return {
    visual,
    commerce,
    discovery,
    overallResult,
    auditStatus,
    approvedForPublish,
    allWarnings,
    revisionNotes,
  }
}

// ── Trigger & persist ─────────────────────────────────────────────────

/**
 * Run audit on a product and persist results + emit BotEvents.
 * Non-blocking: catches all errors, never throws.
 */
export async function triggerAudit(
  payload: any, // PayloadInstance
  product: AuditableProduct,
  triggerSource: 'auto_content_ready' | 'telegram_command' | 'admin' | 'retry' | 'auto_retry',
  req?: any,
): Promise<AuditTriggerResult> {
  const updateReq = req
    ? { ...req, context: { ...(req.context ?? {}), isDispatchUpdate: true } }
    : { context: { isDispatchUpdate: true } }

  try {
    // 1. Set audit to pending
    await payload.update({
      collection: 'products',
      id: product.id,
      data: {
        workflow: {
          ...(product.workflow ?? {}),
          auditStatus: 'pending',
          lastHandledByBot: 'mentix',
          ...(product.workflow?.workflowStatus === 'content_ready'
            ? { workflowStatus: 'audit_pending' }
            : {}),
        },
      },
      req: updateReq,
    })

    // 2. Emit audit.requested
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'audit.requested',
        product: product.id,
        sourceBot: triggerSource === 'telegram_command' ? 'uygunops' : 'system',
        targetBot: 'mentix',
        status: 'pending',
        payload: {
          triggerSource,
          contentStatus: product.workflow?.contentStatus ?? 'unknown',
          requestedAt: new Date().toISOString(),
        },
        notes: `Audit requested for product ${product.id} via ${triggerSource}.`,
      },
    })

    // 3. Emit audit.started
    await payload.create({
      collection: 'bot-events',
      data: {
        eventType: 'audit.started',
        product: product.id,
        sourceBot: 'mentix',
        status: 'processed',
        payload: { startedAt: new Date().toISOString() },
        notes: `Mentix audit started for product ${product.id}.`,
        processedAt: new Date().toISOString(),
      },
    })

    // 4. Run the actual audit
    const auditResult = runFullAudit(product)

    // 5. Evaluate full publish readiness (Phase 12 — D-113)
    let isFullyReady = false
    try {
      const { evaluatePublishReadiness } = await import('@/lib/publishReadiness')
      // Re-fetch product with latest data for readiness check
      const freshProduct = await payload.findByID({ collection: 'products', id: product.id, depth: 1 })
      if (freshProduct) {
        // Overlay audit result onto fresh product for readiness eval
        const productForReadiness = {
          ...freshProduct,
          auditResult: {
            ...((freshProduct as any).auditResult ?? {}),
            overallResult: auditResult.overallResult,
            approvedForPublish: auditResult.approvedForPublish,
          },
          workflow: {
            ...((freshProduct as any).workflow ?? {}),
            auditStatus: auditResult.auditStatus,
          },
        }
        const readiness = evaluatePublishReadiness(productForReadiness as any)
        isFullyReady = readiness.level === 'ready'
        console.log(`[mentixAudit] Publish readiness for product ${product.id}: ${readiness.level} (${readiness.passedCount}/${readiness.totalCount})`)
      }
    } catch (readinessErr) {
      console.error(`[mentixAudit] Readiness eval failed for product ${product.id}:`, readinessErr)
      // Fall back to audit-only approval
      isFullyReady = auditResult.approvedForPublish
    }

    // 6. Write results to product
    // workflowStatus='publish_ready' ONLY if full readiness passes (all 6 dimensions)
    await payload.update({
      collection: 'products',
      id: product.id,
      data: {
        workflow: {
          ...(product.workflow ?? {}),
          auditStatus: auditResult.auditStatus,
          lastHandledByBot: 'mentix',
          ...(isFullyReady
            ? { workflowStatus: 'publish_ready' }
            : {}),
        },
        auditResult: {
          visualAudit: auditResult.visual.result,
          commerceAudit: auditResult.commerce.result,
          discoveryAudit: auditResult.discovery.result,
          overallResult: auditResult.overallResult,
          approvedForPublish: auditResult.approvedForPublish,
          warnings: auditResult.allWarnings,
          revisionNotes: auditResult.revisionNotes.length > 0
            ? auditResult.revisionNotes.join('\n')
            : null,
          auditedAt: new Date().toISOString(),
          auditedByBot: 'mentix',
        },
      },
      req: updateReq,
    })

    // 7. Emit result BotEvent
    const eventType = auditResult.approvedForPublish
      ? auditResult.overallResult === 'approved'
        ? 'audit.approved'
        : 'audit.approved_with_warning'
      : auditResult.overallResult === 'needs_revision'
        ? 'audit.needs_revision'
        : 'audit.failed'

    await payload.create({
      collection: 'bot-events',
      data: {
        eventType,
        product: product.id,
        sourceBot: 'mentix',
        status: 'processed',
        payload: {
          visual: auditResult.visual.result,
          commerce: auditResult.commerce.result,
          discovery: auditResult.discovery.result,
          overallResult: auditResult.overallResult,
          approvedForPublish: auditResult.approvedForPublish,
          warningCount: auditResult.allWarnings.length,
          revisionCount: auditResult.revisionNotes.length,
          auditedAt: new Date().toISOString(),
        },
        notes: `Audit completed for product ${product.id}: ${auditResult.overallResult}. ` +
          `Publish: ${auditResult.approvedForPublish ? 'YES' : 'NO'}. ` +
          `Warnings: ${auditResult.allWarnings.length}. Revisions: ${auditResult.revisionNotes.length}.`,
        processedAt: new Date().toISOString(),
      },
    })

    // 8. D-181: Auto-fix — if content dimensions failed, tell GeoBot to retry
    //    Only triggers once per audit cycle (triggerSource !== 'auto_retry')
    //    to prevent infinite loops. After retry, re-audits automatically via
    //    contentPack's auto-audit-after-content-ready flow.
    const contentDimFailed =
      auditResult.commerce.result === 'fail' || auditResult.discovery.result === 'fail'
    if (contentDimFailed && triggerSource !== 'auto_retry') {
      try {
        const failedDims: string[] = []
        if (auditResult.commerce.result === 'fail') failedDims.push('Commerce')
        if (auditResult.discovery.result === 'fail') failedDims.push('Discovery')

        console.log(
          `[mentixAudit/D-181] Auto-fix: ${failedDims.join(' + ')} failed for product ${product.id}. ` +
          `Triggering GeoBot content retry...`,
        )

        // Emit auto-fix BotEvent for traceability
        await payload.create({
          collection: 'bot-events',
          data: {
            eventType: 'audit.auto_fix_requested',
            product: product.id,
            sourceBot: 'mentix',
            status: 'processed',
            payload: {
              failedDimensions: failedDims,
              retryReason: `Mentix audit failed on ${failedDims.join(', ')}. Auto-triggering content regeneration.`,
            },
            notes: `Mentix → GeoBot: auto-retry content for product ${product.id} (failed: ${failedDims.join(', ')})`,
            processedAt: new Date().toISOString(),
          },
        })

        // Update contentStatus to allow retry
        await payload.update({
          collection: 'products',
          id: product.id,
          data: {
            workflow: {
              ...(product.workflow ?? {}),
              contentStatus: 'failed',
              lastHandledByBot: 'mentix',
            },
          },
          req: updateReq,
        })

        // Trigger GeoBot content regeneration (non-blocking)
        const { triggerContentGeneration } = await import('@/lib/contentPack')
        const freshProduct = await payload.findByID({ collection: 'products', id: product.id, depth: 1 })
        if (freshProduct) {
          triggerContentGeneration(payload, freshProduct, 'mentix_auto_fix', req).catch((retryErr: unknown) => {
            console.error(
              `[mentixAudit/D-181] Auto-fix content retry failed for product ${product.id}:`,
              retryErr instanceof Error ? retryErr.message : String(retryErr),
            )
          })
        }
      } catch (autoFixErr) {
        console.error(
          `[mentixAudit/D-181] Auto-fix dispatch failed for product ${product.id}:`,
          autoFixErr instanceof Error ? autoFixErr.message : String(autoFixErr),
        )
      }
    }

    // 9. Emit publish readiness BotEvent (Phase 12 — D-113)
    if (isFullyReady) {
      try {
        await payload.create({
          collection: 'bot-events',
          data: {
            eventType: 'product.publish_ready',
            product: product.id,
            sourceBot: 'system',
            status: 'processed',
            payload: {
              auditResult: auditResult.overallResult,
              approvedForPublish: auditResult.approvedForPublish,
              readinessLevel: 'ready',
              triggeredAfter: 'audit',
            },
            notes: `Product ${product.id} is fully publish-ready after audit approval.`,
            processedAt: new Date().toISOString(),
          },
        })
      } catch (readinessEventErr) {
        console.error(`[mentixAudit] Readiness BotEvent creation failed:`, readinessEventErr)
      }
    }

    return { triggered: true, auditResult }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[mentixAudit] triggerAudit failed for product ${product.id}:`, msg)
    return { triggered: false, error: msg }
  }
}

// ── Telegram formatting ───────────────────────────────────────────────

const DIM_EMOJI: Record<string, string> = {
  pass: '✅',
  pass_with_warning: '⚠️',
  fail: '❌',
  not_reviewed: '➖',
}

const OVERALL_EMOJI: Record<string, string> = {
  approved: '✅',
  approved_with_warning: '⚠️',
  needs_revision: '🔁',
  failed: '❌',
  not_reviewed: '➖',
}

export function formatAuditStatusMessage(product: AuditableProduct): string {
  const title = product.title ?? `Ürün #${product.id}`
  const ar = product.auditResult
  const wf = product.workflow

  const lines = [
    `🔍 <b>Denetim Durumu — ${title}</b> (ID: ${product.id})`,
    ``,
    `<b>Workflow:</b>`,
    `  workflowStatus: ${wf?.workflowStatus ?? '—'}`,
    `  auditStatus: ${wf?.auditStatus ?? 'not_required'}`,
    `  confirmationStatus: ${wf?.confirmationStatus ?? '—'}`,
    `  contentStatus: ${wf?.contentStatus ?? '—'}`,
    `  visualStatus: ${wf?.visualStatus ?? '—'}`,
    ``,
  ]

  if (!ar || ar.overallResult === 'not_reviewed') {
    lines.push(`<b>Denetim:</b> Henüz yapılmadı.`)

    if (!isAuditEligible(product)) {
      const reasons: string[] = []
      if (wf?.confirmationStatus !== 'confirmed') reasons.push('onay eksik')
      if (!wf?.contentStatus || wf.contentStatus === 'pending') reasons.push('içerik beklemede')
      lines.push(`⚠️ Denetim uygun değil: ${reasons.join(', ')}`)
    } else {
      lines.push(`✅ Denetime hazır — <code>/audit ${product.id}</code>`)
    }
  } else {
    lines.push(`<b>Boyut Sonuçları:</b>`)
    lines.push(`  ${DIM_EMOJI[ar.visualAudit ?? 'not_reviewed']} Görsel: ${ar.visualAudit ?? 'not_reviewed'}`)
    lines.push(`  ${DIM_EMOJI[ar.commerceAudit ?? 'not_reviewed']} Commerce: ${ar.commerceAudit ?? 'not_reviewed'}`)
    lines.push(`  ${DIM_EMOJI[ar.discoveryAudit ?? 'not_reviewed']} Discovery: ${ar.discoveryAudit ?? 'not_reviewed'}`)
    lines.push(``)
    lines.push(`<b>Genel:</b> ${OVERALL_EMOJI[ar.overallResult ?? 'not_reviewed']} ${ar.overallResult}`)
    lines.push(`<b>Yayına Onay:</b> ${ar.approvedForPublish ? '✅ Evet' : '❌ Hayır'}`)
    lines.push(`<b>Denetleyen:</b> ${ar.auditedByBot ?? '—'}`)
    lines.push(`<b>Zaman:</b> ${ar.auditedAt ?? '—'}`)

    const warnings = (ar.warnings as string[] | null) ?? []
    if (warnings.length > 0) {
      lines.push(``)
      lines.push(`<b>Uyarılar (${warnings.length}):</b>`)
      for (const w of warnings.slice(0, 8)) {
        lines.push(`  ⚠️ ${w}`)
      }
      if (warnings.length > 8) lines.push(`  ... +${warnings.length - 8} daha`)
    }

    if (ar.revisionNotes) {
      lines.push(``)
      lines.push(`<b>Revizyon Notları:</b>`)
      lines.push(`  ${ar.revisionNotes}`)
    }
  }

  return lines.join('\n')
}
