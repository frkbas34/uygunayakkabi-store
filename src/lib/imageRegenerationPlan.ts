import { scanProductBrandSafety, type BrandSafetyResult } from './brandSafety'
import {
  buildBrandSafetyRemediationPlan,
  type BrandSafetyRemediationItem,
  type BrandProvenanceReviewEvent,
} from './brandSafetyRemediationPlan'
import { evaluateImageQualityGate, type ImageQualityInput } from './imageQualityGate'
import { countUsableMediaRows } from './productMedia'

export type ImageRegenerationPlanState =
  | 'brand_review_first'
  | 'pass_no_action'
  | 'needs_original_media'
  | 'generation_running'
  | 'preview_needs_operator'
  | 'qc_decision_needed'
  | 'review_needs_decision'
  | 'regenerate_recommended'

export type ImageRegenerationPlanSeverity = 'none' | 'low' | 'medium' | 'high' | 'blocked'

export interface ImageGenerationJobLike {
  id?: number | string | null
  status?: string | null
  generatedImages?: unknown
  updatedAt?: string | null
  createdAt?: string | null
}

export interface ImageRegenerationProductInput extends ImageQualityInput {
  stockNumber?: string | null
}

export interface ImageRegenerationPlan {
  productId: number | string | null
  ref: string
  title: string
  state: ImageRegenerationPlanState
  severity: ImageRegenerationPlanSeverity
  visualStatus: string
  brandSafety: BrandSafetyResult
  brandRemediation: BrandSafetyRemediationItem | null
  imageQuality: ReturnType<typeof evaluateImageQualityGate>
  latestJob: {
    id: number | string | null
    status: string | null
    generatedCount: number
    isActive: boolean
  } | null
  summary: string
  nextActions: string[]
  suggestedCommands: string[]
  guardrails: string[]
}

export interface ImageRegenerationPlanOptions {
  provenanceEvents?: BrandProvenanceReviewEvent[]
}

function productRef(product: ImageRegenerationProductInput): string {
  const stockNumber = typeof product.stockNumber === 'string' && product.stockNumber.trim().length > 0
    ? product.stockNumber.trim()
    : null
  return stockNumber ?? String(product.id ?? '<sn-or-id>')
}

function productTitle(product: ImageRegenerationProductInput): string {
  return typeof product.title === 'string' && product.title.trim().length > 0
    ? product.title.trim()
    : 'Untitled'
}

function normalizeJobStatus(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null
}

function latestRelevantJob(jobs: ImageGenerationJobLike[]): ImageRegenerationPlan['latestJob'] {
  if (!Array.isArray(jobs) || jobs.length === 0) return null
  const job = jobs[0] ?? null
  if (!job) return null
  const status = normalizeJobStatus(job.status)
  return {
    id: job.id ?? null,
    status,
    generatedCount: countUsableMediaRows(job.generatedImages),
    isActive: status === 'queued' || status === 'generating' || status === 'preview' || status === 'review',
  }
}

function baseGuardrails(): string[] {
  return [
    'Read-only diagnostic; no product writes.',
    'No provider calls, image-generation queues, publish jobs, Shopier calls, external dispatch, or ad spend.',
    'Use generated images only after operator approval and Image QC PASS.',
    'Original product photos remain the source of truth for product identity.',
  ]
}

function buildState(
  imageQuality: ReturnType<typeof evaluateImageQualityGate>,
  latestJob: ImageRegenerationPlan['latestJob'],
  visualStatus: string,
  brandSafety: BrandSafetyResult,
  brandRemediation: BrandSafetyRemediationItem | null,
): {
  state: ImageRegenerationPlanState
  severity: ImageRegenerationPlanSeverity
  summary: string
} {
  if (!brandSafety.safe) {
    return {
      state: 'brand_review_first',
      severity: 'blocked',
      summary: brandRemediation?.nextSafeAction.summary ?? `Protected brand detected: ${brandSafety.blockedBrands.join(', ')}. Review provenance before Image QC or generation.`,
    }
  }

  if (latestJob?.status === 'queued' || latestJob?.status === 'generating') {
    return {
      state: 'generation_running',
      severity: 'low',
      summary: `Image generation job ${latestJob.id ?? '?'} is ${latestJob.status}; wait for preview before QC.`,
    }
  }

  if (latestJob?.status === 'preview' || latestJob?.status === 'review') {
    return {
      state: 'preview_needs_operator',
      severity: 'medium',
      summary: `Image generation job ${latestJob.id ?? '?'} is awaiting operator approval or regeneration.`,
    }
  }

  if (!imageQuality.hasOriginals && !imageQuality.hasGenerated) {
    return {
      state: 'needs_original_media',
      severity: 'blocked',
      summary: 'No usable original or generated media exists; attach a real product photo first.',
    }
  }

  if (imageQuality.status === 'fail' || imageQuality.level === 'fail' || visualStatus === 'rejected') {
    return {
      state: 'regenerate_recommended',
      severity: 'high',
      summary: 'Current generated visuals are rejected or QC failed; regenerate or attach corrected media before publish.',
    }
  }

  if (imageQuality.status === 'review') {
    return {
      state: 'review_needs_decision',
      severity: 'medium',
      summary: 'Image QC is in REVIEW; operator must decide PASS, FAIL, or regenerate.',
    }
  }

  if (imageQuality.hasGenerated && !imageQuality.publishable) {
    return {
      state: 'qc_decision_needed',
      severity: 'medium',
      summary: 'Generated images exist but do not have explicit Image QC PASS.',
    }
  }

  return {
    state: 'pass_no_action',
    severity: 'none',
    summary: imageQuality.hasGenerated
      ? 'Generated images have Image QC PASS; no regeneration action is needed.'
      : 'No Image QC block is detected. Generate marketing images only if the channel plan needs them.',
  }
}

function buildNextActions(
  ref: string,
  state: ImageRegenerationPlanState,
  imageQuality: ReturnType<typeof evaluateImageQualityGate>,
  brandRemediation: BrandSafetyRemediationItem | null,
): string[] {
  switch (state) {
    case 'brand_review_first':
      return [
        brandRemediation?.nextSafeAction.summary ?? 'Review protected-brand provenance first.',
        ...(brandRemediation?.nextSafeAction.previewCommand
          ? [`Preview the provenance decision first: ${brandRemediation.nextSafeAction.previewCommand}.`]
          : []),
        'Do not record Image QC, regenerate, activate, publish, queue Shopier, or advertise until the brand-safety review is complete.',
      ]
    case 'generation_running':
      return [
        'Wait for the preview notification before approving, rejecting, or regenerating.',
        `Use /productflow ${ref} if lifecycle/readiness looks stale after the job finishes.`,
      ]
    case 'preview_needs_operator':
      return [
        'Inspect the Telegram preview images against the original product photo.',
        'Approve only acceptable slots, reject the preview, or regenerate before Image QC PASS.',
      ]
    case 'needs_original_media':
      return [
        'Attach at least one real product photo in Payload or Telegram intake.',
        'After original media exists, run generation only if marketing/Shopier needs generated images.',
      ]
    case 'regenerate_recommended':
      return [
        `Regenerate from the product reference if the original photo is correct: #gorsel ${ref}.`,
        `After a clean preview is approved, record Image QC again with /imageqc ${ref}.`,
      ]
    case 'review_needs_decision':
      return [
        `If defects are acceptable, record PASS: /imageqc pass ${ref} approved.`,
        `If defects are real, record FAIL and regenerate: /imageqc fail ${ref} reason, then #gorsel ${ref}.`,
      ]
    case 'qc_decision_needed':
      return [
        `Record a human QC decision before publish: /imageqc pass ${ref} approved or /imageqc fail ${ref} reason.`,
        'Do not activate, publish to Shopier, or use ads until generated-image QC passes.',
      ]
    case 'pass_no_action':
      return imageQuality.hasGenerated
        ? ['No image regeneration action is needed; continue product readiness checks.']
        : [`Optional only: run #gorsel ${ref} if Shopier/social marketing needs generated images.`]
  }
}

function buildSuggestedCommands(
  ref: string,
  state: ImageRegenerationPlanState,
  brandRemediation: BrandSafetyRemediationItem | null,
): string[] {
  switch (state) {
    case 'brand_review_first':
      return [brandRemediation?.nextSafeAction.previewCommand, `/productflow ${ref}`].filter((command): command is string => Boolean(command))
    case 'generation_running':
      return [`/productflow ${ref}`]
    case 'preview_needs_operator':
      return ['onayla 1,2,3', 'yeniden uret', `#gorsel ${ref}`]
    case 'needs_original_media':
      return [`/imageqc ${ref}`, `/productflow ${ref}`]
    case 'regenerate_recommended':
      return [`#gorsel ${ref}`, `/imageqc ${ref}`, `/productflow ${ref}`]
    case 'review_needs_decision':
      return [`/imageqc pass ${ref} approved`, `/imageqc fail ${ref} reason`, `#gorsel ${ref}`]
    case 'qc_decision_needed':
      return [`/imageqc pass ${ref} approved`, `/imageqc review ${ref} note`, `/imageqc fail ${ref} reason`]
    case 'pass_no_action':
      return [`/productflow ${ref}`, `#gorsel ${ref}`]
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildImageRegenerationPlan(
  product: ImageRegenerationProductInput | null | undefined,
  jobs: ImageGenerationJobLike[] = [],
  options: ImageRegenerationPlanOptions = {},
): ImageRegenerationPlan {
  const p = product ?? {}
  const ref = productRef(p)
  const visualStatus = typeof p.workflow?.visualStatus === 'string' && p.workflow.visualStatus.trim().length > 0
    ? p.workflow.visualStatus.trim()
    : 'pending'
  const imageQuality = evaluateImageQualityGate(p)
  const brandSafety = scanProductBrandSafety(p as Record<string, any>)
  const brandRemediation = brandSafety.safe
    ? null
    : buildBrandSafetyRemediationPlan([p as Record<string, any>], {
      provenanceEvents: options.provenanceEvents ?? [],
    }).items[0] ?? null
  const latestJob = latestRelevantJob(jobs)
  const state = buildState(imageQuality, latestJob, visualStatus, brandSafety, brandRemediation)

  return {
    productId: p.id ?? null,
    ref,
    title: productTitle(p),
    visualStatus,
    brandSafety,
    brandRemediation,
    imageQuality,
    latestJob,
    ...state,
    nextActions: buildNextActions(ref, state.state, imageQuality, brandRemediation),
    suggestedCommands: buildSuggestedCommands(ref, state.state, brandRemediation),
    guardrails: baseGuardrails(),
  }
}

export function formatImageRegenerationPlan(plan: ImageRegenerationPlan): string {
  const jobLine = plan.latestJob
    ? `${plan.latestJob.status ?? 'unknown'} (#${plan.latestJob.id ?? '?'}, generated=${plan.latestJob.generatedCount})`
    : 'none'
  const lines: string[] = [
    `<b>Image Regeneration Plan (D-404) - #${escapeHtml(plan.productId ?? plan.ref)}</b>`,
    `<b>${escapeHtml(plan.title)}</b>`,
    '<i>Read-only: no writes, no provider calls, no queues, no publish.</i>',
    '',
    `<b>State</b>: ${escapeHtml(plan.state)} (${escapeHtml(plan.severity)})`,
    `<b>Visual status</b>: <code>${escapeHtml(plan.visualStatus)}</code>`,
    `<b>Image QC</b>: ${escapeHtml(plan.imageQuality.level)} - ${escapeHtml(plan.imageQuality.detail)}`,
    `<b>Media</b>: originals=${plan.imageQuality.originalCount}, generated=${plan.imageQuality.generatedCount}`,
    `<b>Latest job</b>: ${escapeHtml(jobLine)}`,
    `<b>Summary</b>: ${escapeHtml(plan.summary)}`,
  ]

  if (!plan.brandSafety.safe) {
    lines.push(`<b>Brand safety</b>: blocked - ${escapeHtml(plan.brandSafety.blockedBrands.join(', '))}`)
    if (plan.brandRemediation) {
      lines.push(`<b>Provenance</b>: ${escapeHtml(plan.brandRemediation.nextSafeAction.summary)}`)
    }
  }

  lines.push('')
  lines.push('<b>Next Actions</b>')

  for (const action of plan.nextActions) lines.push(`- ${escapeHtml(action)}`)

  lines.push('')
  lines.push('<b>Suggested Commands</b>')
  for (const command of plan.suggestedCommands) lines.push(`- <code>${escapeHtml(command)}</code>`)

  lines.push('')
  lines.push('<b>Guardrails</b>')
  for (const guardrail of plan.guardrails) lines.push(`- ${escapeHtml(guardrail)}`)

  return lines.join('\n')
}
