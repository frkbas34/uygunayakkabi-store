import { countUsableMediaRows } from './productMedia'

export type ImageQualityStatus = 'pending' | 'pass' | 'review' | 'fail'
export type ImageQualityLevel = 'pass' | 'review' | 'fail'

export const IMAGE_QC_DEFECT_FLAGS = [
  'torn_or_cracked',
  'peeling_texture',
  'deformed_toe_or_heel',
  'wrong_stitching',
  'fake_stains',
  'distorted_sole_join',
  'color_drift',
  'invented_logo_or_brand',
  'background_drift',
  'crop_or_scale_issue',
  'other',
] as const

export type ImageQcDefectFlag = (typeof IMAGE_QC_DEFECT_FLAGS)[number]

export interface ImageQualityInput {
  id?: number | string | null
  title?: string | null
  images?: unknown
  generativeGallery?: unknown
  workflow?: {
    visualStatus?: string | null
    workflowStatus?: string | null
  } | null
  imageQuality?: {
    status?: string | null
    defectFlags?: string[] | null
    notes?: string | null
    checkedAt?: string | null
    checkedBy?: string | null
    source?: string | null
  } | null
}

export interface ImageQualityGateResult {
  level: ImageQualityLevel
  publishable: boolean
  status: ImageQualityStatus
  hasOriginals: boolean
  hasGenerated: boolean
  originalCount: number
  generatedCount: number
  defectFlags: string[]
  checkedAt: string | null
  checkedBy: string | null
  source: string | null
  detail: string
  blockers: string[]
}

type PayloadLike = {
  findByID(args: { collection: 'products'; id: number | string; depth?: number }): Promise<Record<string, any>>
  update(args: {
    collection: 'products'
    id: number | string
    data: Record<string, any>
    context?: Record<string, unknown>
  }): Promise<Record<string, any>>
}

function normalizeStatus(value: unknown): ImageQualityStatus {
  if (value === 'pass' || value === 'review' || value === 'fail') return value
  return 'pending'
}

function safeDefectFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((flag): flag is string => typeof flag === 'string' && flag.trim().length > 0)
}

function shortFlags(flags: string[]): string {
  return flags.length > 0 ? flags.join(', ') : 'no defect flags'
}

export function evaluateImageQualityGate(product: ImageQualityInput | null | undefined): ImageQualityGateResult {
  const p = product ?? {}
  const status = normalizeStatus(p.imageQuality?.status)
  const originalCount = countUsableMediaRows(p.images)
  const generatedCount = countUsableMediaRows(p.generativeGallery)
  const hasOriginals = originalCount > 0
  const hasGenerated = generatedCount > 0
  const visualStatus = p.workflow?.visualStatus ?? 'pending'
  const defectFlags = safeDefectFlags(p.imageQuality?.defectFlags)
  const checkedAt = p.imageQuality?.checkedAt ?? null
  const checkedBy = p.imageQuality?.checkedBy ?? null
  const source = p.imageQuality?.source ?? null

  if (status === 'pass') {
    return {
      level: 'pass',
      publishable: true,
      status,
      hasOriginals,
      hasGenerated,
      originalCount,
      generatedCount,
      defectFlags,
      checkedAt,
      checkedBy,
      source,
      detail: hasGenerated
        ? `QC PASS for ${generatedCount} generated image(s)`
        : 'QC PASS recorded',
      blockers: [],
    }
  }

  if (status === 'fail') {
    const detail = `QC FAIL: ${shortFlags(defectFlags)}`
    return {
      level: 'fail',
      publishable: false,
      status,
      hasOriginals,
      hasGenerated,
      originalCount,
      generatedCount,
      defectFlags,
      checkedAt,
      checkedBy,
      source,
      detail,
      blockers: [detail],
    }
  }

  if (visualStatus === 'rejected') {
    const detail = 'Visuals rejected by operator'
    return {
      level: 'fail',
      publishable: false,
      status,
      hasOriginals,
      hasGenerated,
      originalCount,
      generatedCount,
      defectFlags,
      checkedAt,
      checkedBy,
      source,
      detail,
      blockers: [detail],
    }
  }

  if (status === 'review') {
    const detail = `QC REVIEW: ${shortFlags(defectFlags)}`
    return {
      level: 'review',
      publishable: false,
      status,
      hasOriginals,
      hasGenerated,
      originalCount,
      generatedCount,
      defectFlags,
      checkedAt,
      checkedBy,
      source,
      detail,
      blockers: [detail],
    }
  }

  if (hasGenerated) {
    const detail = 'Generated images require explicit QC PASS'
    return {
      level: 'review',
      publishable: false,
      status,
      hasOriginals,
      hasGenerated,
      originalCount,
      generatedCount,
      defectFlags,
      checkedAt,
      checkedBy,
      source,
      detail,
      blockers: [detail],
    }
  }

  if (hasOriginals) {
    return {
      level: 'pass',
      publishable: true,
      status,
      hasOriginals,
      hasGenerated,
      originalCount,
      generatedCount,
      defectFlags,
      checkedAt,
      checkedBy,
      source,
      detail: 'Original-only media does not require generated-image QC',
      blockers: [],
    }
  }

  const detail = 'No usable media for image QC'
  return {
    level: 'review',
    publishable: false,
    status,
    hasOriginals,
    hasGenerated,
    originalCount,
    generatedCount,
    defectFlags,
    checkedAt,
    checkedBy,
    source,
    detail,
    blockers: [detail],
  }
}

export function formatImageQualityMessage(product: ImageQualityInput, result = evaluateImageQualityGate(product)): string {
  const levelLabel = result.level === 'pass'
    ? 'PASS'
    : result.level === 'fail'
      ? 'FAIL'
      : 'REVIEW'
  const icon = result.level === 'pass' ? '✅' : result.level === 'fail' ? '❌' : '⚠️'
  const lines = [
    `<b>Image QC (D-355) — #${product.id ?? '?'}</b>`,
    `<b>${product.title ?? 'Untitled'}</b>`,
    '',
    `${icon} <b>${levelLabel}</b>`,
    `Originals: ${result.originalCount} · Generated: ${result.generatedCount}`,
    `Stored status: <code>${result.status}</code>`,
    `Detail: ${result.detail}`,
  ]

  if (result.defectFlags.length > 0) lines.push(`Defects: ${result.defectFlags.join(', ')}`)
  if (result.checkedAt) lines.push(`Checked: ${result.checkedAt}`)
  if (result.checkedBy) lines.push(`By: ${result.checkedBy}`)
  if (result.source) lines.push(`Source: ${result.source}`)
  lines.push('')
  lines.push('<i>PASS is required for AI-generated images before publish/activation. No external publish or ad action is performed here.</i>')
  return lines.join('\n')
}

export async function applyImageQualityDecision(
  payload: PayloadLike,
  productId: number | string,
  decision: Exclude<ImageQualityStatus, 'pending'>,
  options: {
    defectFlags?: string[]
    notes?: string
    checkedBy?: string
    source?: string
    now?: Date
  } = {},
): Promise<{ product: Record<string, any>; result: ImageQualityGateResult; message: string }> {
  const product = await payload.findByID({ collection: 'products', id: productId, depth: 0 })
  const wf = product.workflow && typeof product.workflow === 'object' ? product.workflow : {}
  const now = options.now ?? new Date()
  const imageQuality = {
    ...(product.imageQuality && typeof product.imageQuality === 'object' ? product.imageQuality : {}),
    status: decision,
    defectFlags: options.defectFlags ?? [],
    notes: options.notes ?? '',
    checkedAt: now.toISOString(),
    checkedBy: options.checkedBy ?? 'telegram_operator',
    source: options.source ?? 'telegram',
  }

  const data: Record<string, any> = { imageQuality }
  if (decision === 'fail') {
    data.workflow = {
      ...wf,
      visualStatus: 'rejected',
    }
  } else if (decision === 'pass' && (wf.visualStatus === 'pending' || wf.visualStatus === 'preview')) {
    data.workflow = {
      ...wf,
      visualStatus: 'approved',
      workflowStatus: wf.workflowStatus === 'draft' || wf.workflowStatus === 'visual_pending'
        ? 'visual_ready'
        : wf.workflowStatus,
    }
  }

  const updated = await payload.update({
    collection: 'products',
    id: productId,
    data,
    context: { isDispatchUpdate: true },
  })

  const result = evaluateImageQualityGate(updated as ImageQualityInput)
  return {
    product: updated,
    result,
    message: formatImageQualityMessage(updated as ImageQualityInput, result),
  }
}
