import { randomUUID } from 'node:crypto'

import {
  GENERATED_SLOT_KEYS,
  IMAGE_SLOT_CONTRACT_VERSION,
  IMAGE_SLOT_REGISTRY,
  getSlotByKey,
  isValidSlotKey,
  type SlotKey,
} from './imageSlotContract'
import {
  isVisualLockV01ComponentTopologyReasonCode,
  isVisualLockV01MaterialReasonCode,
  type VisualLockV01ComponentTopologyReasonCode,
  type VisualLockV01MaterialReasonCode,
  type VisualGeometryGateResultV01,
  type VisualGeometryMeasurementV01,
  type VisualQualityTriState,
  type VisualQualityGateSummaryV01,
} from './imageVisualLockV01'
import type {
  NormalizedVisualBoundingBoxV01,
  VisualCanvasDimensionsV01,
  VisualFramingCorrectionEvidenceV01,
  VisualFramingCorrectionOutcomeV01,
  VisualFramingCorrectionReasonV01,
} from './imageFramingCorrectionV01'
import {
  VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
  sanitizeVisualQualityRetryEvidenceV01,
  type VisualQualityRetryEvidenceV01,
} from './imageQualityRetryV01'
import {
  sanitizeVisualOnlyV01BoundaryManifest,
  VISUAL_ONLY_V01_MODE,
  type VisualOnlyV01BoundaryManifest,
} from './visualOnlyV01'

export type ImageGenerationContractVersion = typeof IMAGE_SLOT_CONTRACT_VERSION
export type ImageSlotId = SlotKey
export type ImageGenerationAttemptId = `iga_${string}`

export type ImageSlotResultStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'provider_failed'
  | 'media_save_failed'
  | 'persisted'
  | 'skipped'

export type ImageGenerationAttemptStatus = 'running' | 'completed' | 'partial' | 'failed'
export type ImageGenerationAttemptKind = 'initial' | 'quality_retry'
export type ImageGenerationAttemptOrdinal = 1 | 2

export const IMAGE_GENERATION_PACK_SELECTION_VERSION = 'image-generation-pack-selection/v1' as const

export type ImageGenerationPackSelectionSlot = {
  slotId: ImageSlotId
  displayOrder: number
  sourceAttemptId: ImageGenerationAttemptId
  sourceAttemptOrdinal: ImageGenerationAttemptOrdinal
  mediaId: string | number
  mediaUrl?: string | null
}

export type ImageGenerationPackSelection = {
  version: typeof IMAGE_GENERATION_PACK_SELECTION_VERSION
  rootAttemptId: ImageGenerationAttemptId
  slots: ImageGenerationPackSelectionSlot[]
  /** Required on packs produced by the explicit visual-only execution mode. */
  visualOnlyMode?: typeof VISUAL_ONLY_V01_MODE
  visualOnlyBoundaryDigest?: string
}

export type ImageSlotFailure = {
  code:
    | 'input_unavailable'
    | 'input_rejected'
    | 'provider_failed'
    | 'empty_provider_response'
    | 'quality_gate_failed'
    | 'media_save_failed'
    | 'internal_error'
  summary: string
}

export type ImageSlotProviderMetadata = {
  provider: string
  attempts: number
  colorCheckPass?: boolean
  brandFidelityPass?: boolean
  brandFidelityScore?: string
  shotCompliancePass?: boolean
  detectedShot?: string
  qualityEvaluatorVersion?: string
  qualityEvaluatorState?: 'pass' | 'fail' | 'unknown'
  qualityEvaluatorReasonCodes?: string[]
  colorEvaluatorState?: 'pass' | 'fail' | 'unknown'
  componentTopologyEvaluatorState?: 'pass' | 'fail' | 'unknown'
  componentTopologyEvaluatorReasonCodes?: VisualLockV01ComponentTopologyReasonCode[]
  orientationEvaluatorState?: 'pass' | 'fail' | 'unknown'
  studioEvaluatorState?: 'pass' | 'fail' | 'unknown'
  materialEvaluatorState?: 'pass' | 'fail' | 'unknown'
  materialEvaluatorReasonCodes?: VisualLockV01MaterialReasonCode[]
  geometryGateVersion?: string
  geometryGateState?: 'pass' | 'fail' | 'unknown'
  geometryClippingState?: 'pass' | 'fail' | 'unknown'
  geometryGateReasonCodes?: string[]
  geometryMeasurement?: {
    occupancyPercent: number
    centerOffsetXPercent: number
    centerOffsetYPercent: number
    maximumCenterOffsetPercent: number
    clippingDetected: boolean
  } | null
  framingCorrection?: VisualFramingCorrectionEvidenceV01
}

export type ImageSlotResult = {
  contractVersion: ImageGenerationContractVersion
  attemptId: ImageGenerationAttemptId
  slotId: ImageSlotId
  displayOrder: number
  purposeIdentifier: ImageSlotId
  operatorLabel: string
  status: ImageSlotResultStatus
  provider?: ImageSlotProviderMetadata
  mediaId?: string | number | null
  mediaUrl?: string | null
  warnings: string[]
  failure?: ImageSlotFailure
  /** Sanitized V0.1 quality-retry evidence. Absent on historical attempts. */
  qualityRetry?: VisualQualityRetryEvidenceV01
}

export type ImageSlotExecutionEnvelope<TOutput> = ImageSlotResult & {
  output?: TOutput
}

export type ImageGenerationAttemptMetadata = {
  contractVersion: ImageGenerationContractVersion
  attemptId: ImageGenerationAttemptId
  jobId: string
  status: ImageGenerationAttemptStatus
  requestedSlotIds: ImageSlotId[]
  slots: ImageSlotResult[]
  startedAt: string
  completedAt?: string
  /** Existing JSON metadata carrier; absent for the unchanged default profile. */
  qualityProfile?: string
  productFamily?: string
  identityAnchorHash?: string
  profileContractVersions?: {
    profile: string
    identityAnchor: string
    framing: string
    familyLock: string | null
    componentTopology?: string
    evaluator?: string
    geometryGate?: string
    framingCorrection?: string
    materialFidelity?: string
  }
  qualityGateSummary?: VisualQualityGateSummaryV01
  /** Optional so historical attempt JSON remains byte-for-byte readable. */
  attemptKind?: ImageGenerationAttemptKind
  attemptOrdinal?: ImageGenerationAttemptOrdinal
  parentAttemptId?: ImageGenerationAttemptId | null
  retryPolicyVersion?: typeof VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
  /** Root-only, deterministic approval-pack lineage. */
  packSelection?: ImageGenerationPackSelection
  /** Persisted, non-forgeable-without-the-job manifest binding for visual-only runs. */
  visualOnlyBoundary?: VisualOnlyV01BoundaryManifest
}

export type LegacySlotProjection = {
  slotId: ImageSlotId | null
  displayOrder: number
  operatorLabel: string
  mediaId: string | number
  legacy: true
  warning?: string
}

export type ApprovalCandidate = {
  slotId: ImageSlotId | null
  displayOrder: number
  operatorLabel: string
  mediaId: string | number
}

type LegacyProviderSlotLog = {
  slot?: unknown
  provider?: unknown
  attempts?: unknown
  success?: unknown
  colorCheckPass?: unknown
  brandFidelityPass?: unknown
  brandFidelityScore?: unknown
  shotCompliancePass?: unknown
  detectedShot?: unknown
  qualityEvaluatorVersion?: unknown
  qualityEvaluatorState?: unknown
  qualityEvaluatorReasonCodes?: unknown
  colorEvaluatorState?: unknown
  componentTopologyEvaluatorState?: unknown
  componentTopologyEvaluatorReasonCodes?: unknown
  orientationEvaluatorState?: unknown
  studioEvaluatorState?: unknown
  materialEvaluatorState?: unknown
  materialEvaluatorReasonCodes?: unknown
  framingCorrection?: unknown
  rejectionReason?: unknown
}

const MAX_SAFE_SUMMARY_LENGTH = 240
const IMAGE_GENERATION_ATTEMPT_ID_PATTERN = /^iga_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VISUAL_FRAMING_CORRECTION_VERSION = 'visual-framing-correction/v1' as const
const VISUAL_GEOMETRY_GATE_VERSION = 'visual-geometry-gate/v0.1' as const
const VISUAL_FRAMING_CORRECTION_OUTCOMES: ReadonlySet<VisualFramingCorrectionOutcomeV01> = new Set([
  'not_required',
  'applied',
  'unsafe_existing_clipping',
  'transform_outside_allowed_bounds',
  'unsafe_background_extension',
  'insufficient_geometry_evidence',
  'final_geometry_failed',
])
const VISUAL_FRAMING_CORRECTION_REASONS: ReadonlySet<VisualFramingCorrectionReasonV01> = new Set([
  'detail_slot_exempt',
  'geometry_already_compliant',
  'framing_correction_applied',
  'geometry_measurement_unavailable',
  'foreground_bounds_unavailable',
  'additional_product_suspected',
  'existing_edge_clipping',
  'insufficient_real_margin',
  'required_scale_above_1_15',
  'required_scale_below_reciprocal_1_15',
  'translation_above_12_percent',
  'background_not_warm_neutral',
  'background_nonuniform',
  'protected_bounds_would_crop',
  'final_geometry_unavailable',
  'final_geometry_not_pass',
  'transform_failed',
])
const VISUAL_GEOMETRY_REASON_CODES = new Set([
  'detail_slot_exempt',
  'geometry_measurement_unavailable',
  'occupancy_below_72',
  'occupancy_above_82',
  'center_offset_above_3',
  'clipping_detected',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isVisualQualityTriState(value: unknown): value is VisualQualityTriState {
  return value === 'pass' || value === 'fail' || value === 'unknown'
}

function sanitizeNormalizedBoundingBox(value: unknown): NormalizedVisualBoundingBoxV01 | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  const { x, y, width, height } = value
  if (![x, y, width, height].every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))) {
    return undefined
  }
  if (
    (x as number) < 0 || (y as number) < 0 || (width as number) <= 0 || (height as number) <= 0
    || (x as number) + (width as number) > 1.000001
    || (y as number) + (height as number) > 1.000001
  ) return undefined
  return { x: x as number, y: y as number, width: width as number, height: height as number }
}

function sanitizeCanvasDimensions(value: unknown): VisualCanvasDimensionsV01 | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  const { width, height } = value
  if (
    typeof width !== 'number' || !Number.isSafeInteger(width) || width <= 0
    || typeof height !== 'number' || !Number.isSafeInteger(height) || height <= 0
  ) return undefined
  return { width, height }
}

function sanitizeVisualGeometryMeasurement(value: unknown): VisualGeometryMeasurementV01 | null | undefined {
  if (value === null) return null
  if (!isRecord(value)) return undefined
  const {
    occupancyPercent,
    centerOffsetXPercent,
    centerOffsetYPercent,
    maximumCenterOffsetPercent,
    clippingDetected,
  } = value
  if (
    ![occupancyPercent, centerOffsetXPercent, centerOffsetYPercent, maximumCenterOffsetPercent]
      .every((measurement) => typeof measurement === 'number' && Number.isFinite(measurement))
    || typeof clippingDetected !== 'boolean'
  ) return undefined
  return {
    occupancyPercent: occupancyPercent as number,
    centerOffsetXPercent: centerOffsetXPercent as number,
    centerOffsetYPercent: centerOffsetYPercent as number,
    maximumCenterOffsetPercent: maximumCenterOffsetPercent as number,
    clippingDetected,
  }
}

function sanitizeVisualGeometryGate(value: unknown): VisualGeometryGateResultV01 | undefined {
  if (!isRecord(value)) return undefined
  const measurement = sanitizeVisualGeometryMeasurement(value.measurement)
  if (
    value.version !== VISUAL_GEOMETRY_GATE_VERSION
    || !isValidSlotKey(value.slotId)
    || typeof value.applicable !== 'boolean'
    || !isVisualQualityTriState(value.state)
    || !isVisualQualityTriState(value.clippingState)
    || measurement === undefined
    || !Array.isArray(value.reasonCodes)
    || value.reasonCodes.length > 8
    || !value.reasonCodes.every((reason) => typeof reason === 'string' && VISUAL_GEOMETRY_REASON_CODES.has(reason))
  ) return undefined
  return {
    version: VISUAL_GEOMETRY_GATE_VERSION,
    slotId: value.slotId,
    applicable: value.applicable,
    state: value.state,
    clippingState: value.clippingState,
    measurement,
    reasonCodes: [...value.reasonCodes] as string[],
  }
}

function sanitizeVisualFramingCorrectionEvidence(value: unknown): VisualFramingCorrectionEvidenceV01 | undefined {
  if (!isRecord(value)) return undefined
  const originalBoundingBox = sanitizeNormalizedBoundingBox(value.originalBoundingBox)
  const finalBoundingBox = sanitizeNormalizedBoundingBox(value.finalBoundingBox)
  const originalCanvas = sanitizeCanvasDimensions(value.originalCanvas)
  const finalCanvas = sanitizeCanvasDimensions(value.finalCanvas)
  const originalGeometry = sanitizeVisualGeometryGate(value.originalGeometry)
  const finalGeometry = sanitizeVisualGeometryGate(value.finalGeometry)
  const padding = isRecord(value.padding) ? value.padding : undefined
  const numericFields = [
    value.appliedScale,
    value.plannedScale,
    value.appliedTranslationXPercent,
    value.appliedTranslationYPercent,
    value.plannedTranslationXPercent,
    value.plannedTranslationYPercent,
  ]
  if (
    value.version !== VISUAL_FRAMING_CORRECTION_VERSION
    || !isValidSlotKey(value.slotId)
    || !isVisualQualityTriState(value.state)
    || typeof value.outcome !== 'string'
    || !VISUAL_FRAMING_CORRECTION_OUTCOMES.has(value.outcome as VisualFramingCorrectionOutcomeV01)
    || !Array.isArray(value.reasonCodes)
    || value.reasonCodes.length < 1
    || value.reasonCodes.length > 16
    || !value.reasonCodes.every((reason) => typeof reason === 'string'
      && VISUAL_FRAMING_CORRECTION_REASONS.has(reason as VisualFramingCorrectionReasonV01))
    || originalBoundingBox === undefined
    || finalBoundingBox === undefined
    || originalCanvas === undefined
    || finalCanvas === undefined
    || !numericFields.every((number) => typeof number === 'number' && Number.isFinite(number))
    || typeof value.appliedScale !== 'number' || value.appliedScale <= 0
    || typeof value.plannedScale !== 'number' || value.plannedScale <= 0
    || typeof value.paddingUsed !== 'boolean'
    || !padding
    || !['top', 'right', 'bottom', 'left'].every((side) => {
      const pixels = padding?.[side]
      return typeof pixels === 'number' && Number.isSafeInteger(pixels) && pixels >= 0
    })
    || value.rotationDegrees !== 0
    || value.aspectRatioChange !== 0
    || value.mirrored !== false
    || !isVisualQualityTriState(value.finalGeometryState)
    || !originalGeometry
    || !finalGeometry
    || value.finalGeometryState !== finalGeometry.state
    || originalGeometry.slotId !== value.slotId
    || finalGeometry.slotId !== value.slotId
  ) return undefined

  const outcome = value.outcome as VisualFramingCorrectionOutcomeV01
  const isApplied = outcome === 'applied'
  if (
    isApplied
      ? value.state !== 'pass'
        || value.appliedScale < (1 / 1.15) - 1e-6 || value.appliedScale > 1.15 + 1e-6
        || Math.abs(value.appliedTranslationXPercent as number) > 12
        || Math.abs(value.appliedTranslationYPercent as number) > 12
        || finalGeometry.state !== 'pass'
        || !finalBoundingBox || !finalCanvas || finalCanvas.width !== finalCanvas.height
      : value.appliedScale !== 1
        || value.appliedTranslationXPercent !== 0
        || value.appliedTranslationYPercent !== 0
        || value.paddingUsed !== false
  ) return undefined
  if (
    (outcome === 'not_required' && value.state !== 'pass')
    || ((outcome === 'unsafe_existing_clipping' || outcome === 'transform_outside_allowed_bounds') && value.state !== 'fail')
    || ((outcome === 'unsafe_background_extension' || outcome === 'insufficient_geometry_evidence') && value.state !== 'unknown')
    || (outcome === 'final_geometry_failed' && value.state === 'pass')
  ) return undefined

  return {
    version: VISUAL_FRAMING_CORRECTION_VERSION,
    slotId: value.slotId,
    state: value.state,
    outcome,
    reasonCodes: [...value.reasonCodes] as VisualFramingCorrectionReasonV01[],
    originalBoundingBox,
    finalBoundingBox,
    originalCanvas,
    finalCanvas,
    appliedScale: value.appliedScale,
    plannedScale: value.plannedScale,
    appliedTranslationXPercent: value.appliedTranslationXPercent as number,
    appliedTranslationYPercent: value.appliedTranslationYPercent as number,
    plannedTranslationXPercent: value.plannedTranslationXPercent as number,
    plannedTranslationYPercent: value.plannedTranslationYPercent as number,
    paddingUsed: value.paddingUsed,
    padding: {
      top: padding.top as number,
      right: padding.right as number,
      bottom: padding.bottom as number,
      left: padding.left as number,
    },
    rotationDegrees: 0,
    aspectRatioChange: 0,
    mirrored: false,
    originalGeometry,
    finalGeometry,
    finalGeometryState: value.finalGeometryState,
  }
}

export function safeImageFailureSummary(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback
  const redacted = raw
    .replace(/(?:bearer\s+)[a-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/(?:sk-|AIza)[a-z0-9_-]{12,}/gi, '[redacted-credential]')
    .replace(/([?&](?:key|token|sig|signature)=)[^\s&]+/gi, '$1[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
  return (redacted || fallback).slice(0, MAX_SAFE_SUMMARY_LENGTH)
}

export function requestedSlotIdsForStage(stage: 'standard' | 'premium'): ImageSlotId[] {
  return IMAGE_SLOT_REGISTRY
    .filter((slot) => slot.activeStages.includes(stage))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((slot) => slot.slotId)
}

export function createImageGenerationAttempt(params: {
  jobId: string | number
  requestedSlotIds: readonly ImageSlotId[]
  now?: string
  attemptId?: ImageGenerationAttemptId
  attemptKind?: ImageGenerationAttemptKind
  attemptOrdinal?: ImageGenerationAttemptOrdinal
  parentAttemptId?: ImageGenerationAttemptId | null
  retryPolicyVersion?: typeof VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
  visualOnlyBoundary?: VisualOnlyV01BoundaryManifest
}): ImageGenerationAttemptMetadata {
  const attemptId = params.attemptId ?? `iga_${randomUUID()}`
  const requested = [...params.requestedSlotIds]
  if (new Set(requested).size !== requested.length) {
    throw new Error('Requested image slot IDs must be unique')
  }
  for (const slotId of requested) {
    if (!isValidSlotKey(slotId)) throw new Error(`Unknown image slot ID: ${String(slotId)}`)
  }

  const hasRetryLineage = params.attemptKind !== undefined
    || params.attemptOrdinal !== undefined
    || params.parentAttemptId !== undefined
    || params.retryPolicyVersion !== undefined
  const visualOnlyBoundary = params.visualOnlyBoundary === undefined
    ? undefined
    : sanitizeVisualOnlyV01BoundaryManifest(params.visualOnlyBoundary)
  if (params.visualOnlyBoundary !== undefined && !visualOnlyBoundary) {
    throw new Error('Visual-only attempt boundary is malformed.')
  }
  if (hasRetryLineage) {
    if (
      params.retryPolicyVersion !== VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
      || (params.attemptKind !== 'initial' && params.attemptKind !== 'quality_retry')
      || (params.attemptOrdinal !== 1 && params.attemptOrdinal !== 2)
      || !IMAGE_GENERATION_ATTEMPT_ID_PATTERN.test(attemptId)
    ) {
      throw new Error('Quality-retry attempt lineage must use the complete V0.1 contract.')
    }
    if (
      params.attemptKind === 'initial'
        ? params.attemptOrdinal !== 1 || params.parentAttemptId !== null
        : params.attemptOrdinal !== 2
          || typeof params.parentAttemptId !== 'string'
          || !IMAGE_GENERATION_ATTEMPT_ID_PATTERN.test(params.parentAttemptId)
          || requested.length !== 1
    ) {
      throw new Error('Quality-retry attempt kind, ordinal, parent, or durable slot is invalid.')
    }
  }

  return {
    contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
    attemptId,
    jobId: String(params.jobId),
    status: 'running',
    requestedSlotIds: requested,
    slots: requested.map((slotId) => {
      const slot = getSlotByKey(slotId)
      if (!slot) throw new Error(`Missing canonical image slot: ${slotId}`)
      return {
        contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
        attemptId,
        slotId,
        displayOrder: slot.displayOrder,
        purposeIdentifier: slot.purposeIdentifier,
        operatorLabel: slot.operatorLabel,
        status: 'pending',
        mediaId: null,
        mediaUrl: null,
        warnings: [],
      }
    }),
    startedAt: params.now ?? new Date().toISOString(),
    ...(hasRetryLineage ? {
      attemptKind: params.attemptKind,
      attemptOrdinal: params.attemptOrdinal,
      parentAttemptId: params.parentAttemptId,
      retryPolicyVersion: params.retryPolicyVersion,
    } : {}),
    ...(visualOnlyBoundary ? { visualOnlyBoundary } : {}),
  }
}

export function setAttemptSlotStatus(
  attempt: ImageGenerationAttemptMetadata,
  slotId: ImageSlotId,
  patch: Partial<Omit<ImageSlotResult, 'attemptId' | 'slotId' | 'contractVersion'>>,
): ImageGenerationAttemptMetadata {
  let found = false
  const slots = attempt.slots.map((slot) => {
    if (slot.slotId !== slotId) return slot
    found = true
    return { ...slot, ...patch }
  })
  if (!found) throw new Error(`Attempt ${attempt.attemptId} did not request slot ${slotId}`)
  return { ...attempt, slots }
}

export function markAttemptSlotsGenerating(
  attempt: ImageGenerationAttemptMetadata,
): ImageGenerationAttemptMetadata {
  return {
    ...attempt,
    slots: attempt.slots.map((slot) => ({ ...slot, status: 'generating' })),
  }
}

export function markAttemptSlotsSkipped(
  attempt: ImageGenerationAttemptMetadata,
  code: 'input_unavailable' | 'input_rejected' | 'internal_error',
  summary: string,
): ImageGenerationAttemptMetadata {
  const safeSummary = safeImageFailureSummary(summary, 'Image generation could not start.')
  return finishImageGenerationAttempt({
    ...attempt,
    slots: attempt.slots.map((slot) => ({
      ...slot,
      status: 'skipped',
      failure: { code, summary: safeSummary },
    })),
  })
}

function providerMetadata(log: LegacyProviderSlotLog, fallbackProvider: string): ImageSlotProviderMetadata {
  const framingCorrection = sanitizeVisualFramingCorrectionEvidence(log.framingCorrection)
  return {
    provider: typeof log.provider === 'string' ? log.provider : fallbackProvider,
    attempts: typeof log.attempts === 'number' && log.attempts > 0 ? log.attempts : 1,
    ...(typeof log.colorCheckPass === 'boolean' ? { colorCheckPass: log.colorCheckPass } : {}),
    ...(typeof log.brandFidelityPass === 'boolean' ? { brandFidelityPass: log.brandFidelityPass } : {}),
    ...(typeof log.brandFidelityScore === 'string' ? { brandFidelityScore: log.brandFidelityScore } : {}),
    ...(typeof log.shotCompliancePass === 'boolean' ? { shotCompliancePass: log.shotCompliancePass } : {}),
    ...(typeof log.detectedShot === 'string' ? { detectedShot: log.detectedShot.slice(0, 120) } : {}),
    ...(typeof log.qualityEvaluatorVersion === 'string' ? { qualityEvaluatorVersion: log.qualityEvaluatorVersion.slice(0, 120) } : {}),
    ...(isVisualQualityTriState(log.qualityEvaluatorState) ? { qualityEvaluatorState: log.qualityEvaluatorState } : {}),
    ...(Array.isArray(log.qualityEvaluatorReasonCodes) ? {
      qualityEvaluatorReasonCodes: log.qualityEvaluatorReasonCodes.filter((value): value is string => typeof value === 'string').map((value) => value.slice(0, 120)),
    } : {}),
    ...(isVisualQualityTriState(log.colorEvaluatorState) ? { colorEvaluatorState: log.colorEvaluatorState } : {}),
    ...(isVisualQualityTriState(log.componentTopologyEvaluatorState) ? { componentTopologyEvaluatorState: log.componentTopologyEvaluatorState } : {}),
    ...(Array.isArray(log.componentTopologyEvaluatorReasonCodes) ? {
      componentTopologyEvaluatorReasonCodes: log.componentTopologyEvaluatorReasonCodes.filter(isVisualLockV01ComponentTopologyReasonCode),
    } : {}),
    ...(isVisualQualityTriState(log.orientationEvaluatorState) ? { orientationEvaluatorState: log.orientationEvaluatorState } : {}),
    ...(isVisualQualityTriState(log.studioEvaluatorState) ? { studioEvaluatorState: log.studioEvaluatorState } : {}),
    ...(isVisualQualityTriState(log.materialEvaluatorState) ? { materialEvaluatorState: log.materialEvaluatorState } : {}),
    ...(Array.isArray(log.materialEvaluatorReasonCodes) ? {
      materialEvaluatorReasonCodes: log.materialEvaluatorReasonCodes.filter(isVisualLockV01MaterialReasonCode),
    } : {}),
    ...(framingCorrection && framingCorrection.slotId === log.slot ? { framingCorrection } : {}),
  }
}

/**
 * Compatibility adapter for the two current providers. Their byte arrays are
 * compacted, but their SlotLog entries retain semantic slot identity. Bytes are
 * consumed only for logs that explicitly report success, so a failed middle
 * slot can never transfer its identity to a later successful slot.
 */
export function adaptLegacyProviderOutput<TOutput>(params: {
  attempt: ImageGenerationAttemptMetadata
  provider: string
  buffers: readonly TOutput[]
  slotLogs: readonly LegacyProviderSlotLog[]
}): ImageSlotExecutionEnvelope<TOutput>[] {
  const logsBySlot = new Map<ImageSlotId, LegacyProviderSlotLog>()
  for (const log of params.slotLogs) {
    if (isValidSlotKey(log.slot) && !logsBySlot.has(log.slot)) logsBySlot.set(log.slot, log)
  }

  let successfulBufferIndex = 0
  return params.attempt.slots.map((slot) => {
    const log = logsBySlot.get(slot.slotId)
    const metadata = log ? providerMetadata(log, params.provider) : {
      provider: params.provider,
      attempts: 1,
    }

    if (log?.success === true) {
      const output = params.buffers[successfulBufferIndex]
      successfulBufferIndex += 1
      if (output !== undefined) {
        const warnings: string[] = []
        if (log.colorCheckPass === false) warnings.push('color_fidelity_review')
        if (log.brandFidelityPass === false) warnings.push('visible_identity_fidelity_review')
        if (log.shotCompliancePass === false) warnings.push('shot_compliance_review')
        return {
          ...slot,
          status: 'generated',
          provider: metadata,
          warnings,
          failure: undefined,
          output,
        }
      }
      return {
        ...slot,
        status: 'provider_failed',
        provider: metadata,
        failure: {
          code: 'empty_provider_response',
          summary: 'Provider reported success but returned no image output for this slot.',
        },
      }
    }

    return {
      ...slot,
      status: 'provider_failed',
      provider: metadata,
      failure: {
        code: 'provider_failed',
        summary: safeImageFailureSummary(
          log?.rejectionReason,
          log ? 'Provider did not produce an image for this slot.' : 'Provider returned no semantic result for this slot.',
        ),
      },
    }
  })
}

export function blockImageSlotEnvelopesForQualityGate<TOutput>(params: {
  slots: readonly ImageSlotExecutionEnvelope<TOutput>[]
  state: 'fail' | 'unknown'
  reasonCodes: readonly string[]
}): ImageSlotExecutionEnvelope<TOutput>[] {
  const summary = safeImageFailureSummary(
    `Visual Lock V0.1 quality gate ${params.state}: ${params.reasonCodes.join(',') || 'evidence_unavailable'}`,
    'Visual Lock V0.1 quality evidence did not pass.',
  )
  return params.slots.map((slot) => {
    if (slot.status !== 'generated') return { ...slot, output: undefined }
    return {
      ...slot,
      status: 'provider_failed',
      output: undefined,
      failure: { code: 'quality_gate_failed', summary },
    }
  })
}

export async function persistGeneratedSlotEnvelopes<TOutput>(params: {
  slots: readonly ImageSlotExecutionEnvelope<TOutput>[]
  persist: (slot: ImageSlotExecutionEnvelope<TOutput> & { output: TOutput }) => Promise<{
    mediaId: string | number
    mediaUrl?: string | null
  }>
  /** Opt-in for final-pack persistence. Historical behavior remains best-effort. */
  failFast?: boolean
}): Promise<ImageSlotExecutionEnvelope<TOutput>[]> {
  const persisted: ImageSlotExecutionEnvelope<TOutput>[] = []
  let mediaSaveFailed = false
  for (const slot of params.slots) {
    if (params.failFast === true && mediaSaveFailed) {
      persisted.push({ ...slot })
      continue
    }
    if (slot.status !== 'generated' || slot.output === undefined) {
      persisted.push({ ...slot })
      continue
    }
    try {
      const media = await params.persist(slot as ImageSlotExecutionEnvelope<TOutput> & { output: TOutput })
      persisted.push({
        ...slot,
        status: 'persisted',
        mediaId: media.mediaId,
        mediaUrl: media.mediaUrl ?? null,
        failure: undefined,
      })
    } catch (error) {
      mediaSaveFailed = true
      persisted.push({
        ...slot,
        status: 'media_save_failed',
        mediaId: null,
        mediaUrl: null,
        failure: {
          code: 'media_save_failed',
          summary: safeImageFailureSummary(error, 'Generated image could not be saved.'),
        },
      })
    }
  }
  return persisted
}

export function finishImageGenerationAttempt(
  attempt: ImageGenerationAttemptMetadata,
  slots: readonly ImageSlotResult[] = attempt.slots,
  now: string = new Date().toISOString(),
): ImageGenerationAttemptMetadata {
  const persistedCount = slots.filter((slot) => slot.status === 'persisted').length
  const failedCount = slots.filter((slot) =>
    ['provider_failed', 'media_save_failed', 'skipped'].includes(slot.status),
  ).length
  const status: ImageGenerationAttemptStatus = persistedCount === slots.length
    ? 'completed'
    : persistedCount > 0 && failedCount > 0
      ? 'partial'
      : 'failed'
  return { ...attempt, status, slots: slots.map((slot) => ({ ...slot })), completedAt: now }
}

export function serializeSlotEnvelopes<TOutput>(
  slots: readonly ImageSlotExecutionEnvelope<TOutput>[],
): ImageSlotResult[] {
  return slots.map((slot) => {
    const serializable: Partial<ImageSlotExecutionEnvelope<TOutput>> = { ...slot }
    delete serializable.output
    return serializable as ImageSlotResult
  })
}

function canonicalizeGenerationAttemptEvidence(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeGenerationAttemptEvidence)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeGenerationAttemptEvidence(entry)]),
    )
  }
  return value
}

export function areGenerationAttemptHistoriesSemanticallyEqual(
  left: readonly ImageGenerationAttemptMetadata[],
  right: readonly ImageGenerationAttemptMetadata[],
): boolean {
  const byAttemptId = (attempts: readonly ImageGenerationAttemptMetadata[]) =>
    [...attempts].sort((a, b) => a.attemptId.localeCompare(b.attemptId))
  return JSON.stringify(canonicalizeGenerationAttemptEvidence(byAttemptId(left)))
    === JSON.stringify(canonicalizeGenerationAttemptEvidence(byAttemptId(right)))
}

export function upsertGenerationAttemptHistory(
  value: unknown,
  attempt: ImageGenerationAttemptMetadata,
): ImageGenerationAttemptMetadata[] {
  const parsed = parseGenerationAttemptHistory(value)
  if (!parsed.ok) throw new Error(parsed.error)
  const existing = parsed.attempts
  const index = existing.findIndex((item) => item.attemptId === attempt.attemptId)
  const next = index < 0
    ? [...existing, attempt]
    : existing.map((item, i) => i === index ? attempt : item)
  const verified = parseGenerationAttemptHistory(next)
  if (!verified.ok) throw new Error(verified.error)
  return verified.attempts
}

function hasRetryMetadata(attempt: Partial<ImageGenerationAttemptMetadata>): boolean {
  return attempt.attemptKind !== undefined
    || attempt.attemptOrdinal !== undefined
    || attempt.parentAttemptId !== undefined
    || attempt.retryPolicyVersion !== undefined
    || attempt.packSelection !== undefined
    || attempt.visualOnlyBoundary !== undefined
    || (Array.isArray(attempt.slots) && attempt.slots.some((slot) =>
      Boolean(slot) && typeof slot === 'object' && 'qualityRetry' in slot,
    ))
}

function validMediaId(value: unknown): value is string | number {
  return (typeof value === 'string' && value.length > 0)
    || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
}

function retryLineageError(attemptId: string, detail: string): string {
  return `Generation attempt ${attemptId} has invalid quality-retry lineage: ${detail}`
}

function sanitizeRetryAwareAttempt(
  attempt: ImageGenerationAttemptMetadata,
): { ok: true; attempt: ImageGenerationAttemptMetadata } | { ok: false; error: string } {
  const visualOnlyBoundary = attempt.visualOnlyBoundary === undefined
    ? undefined
    : sanitizeVisualOnlyV01BoundaryManifest(attempt.visualOnlyBoundary)
  if (
    attempt.visualOnlyBoundary !== undefined
    && (!visualOnlyBoundary || visualOnlyBoundary.jobId !== attempt.jobId)
  ) {
    return { ok: false, error: retryLineageError(attempt.attemptId, 'the visual-only boundary is malformed or belongs to another job.') }
  }
  if (
    attempt.retryPolicyVersion !== VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
    || (attempt.attemptKind !== 'initial' && attempt.attemptKind !== 'quality_retry')
    || (attempt.attemptOrdinal !== 1 && attempt.attemptOrdinal !== 2)
    || !['running', 'completed', 'partial', 'failed'].includes(attempt.status)
    || typeof attempt.startedAt !== 'string'
    || Number.isNaN(Date.parse(attempt.startedAt))
    || (attempt.completedAt !== undefined
      && (typeof attempt.completedAt !== 'string' || Number.isNaN(Date.parse(attempt.completedAt))))
    || !IMAGE_GENERATION_ATTEMPT_ID_PATTERN.test(attempt.attemptId)
  ) {
    return { ok: false, error: retryLineageError(attempt.attemptId, 'the version, kind, ordinal, status, or timestamps are malformed.') }
  }

  if (
    attempt.requestedSlotIds.length < 1
    || new Set(attempt.requestedSlotIds).size !== attempt.requestedSlotIds.length
    || !attempt.requestedSlotIds.every(isValidSlotKey)
    || attempt.slots.length !== attempt.requestedSlotIds.length
  ) {
    return { ok: false, error: retryLineageError(attempt.attemptId, 'durable requested slots are incomplete or duplicated.') }
  }

  const sortedRequested = [...attempt.requestedSlotIds].sort((left, right) =>
    (getSlotByKey(left)?.displayOrder ?? Number.MAX_SAFE_INTEGER)
      - (getSlotByKey(right)?.displayOrder ?? Number.MAX_SAFE_INTEGER),
  )
  if (sortedRequested.some((slotId, index) => slotId !== attempt.requestedSlotIds[index])) {
    return { ok: false, error: retryLineageError(attempt.attemptId, 'requested slots are not in canonical order.') }
  }

  const sanitizedSlots: ImageSlotResult[] = []
  for (let index = 0; index < attempt.slots.length; index += 1) {
    const slot = attempt.slots[index]
    const slotId = attempt.requestedSlotIds[index]
    const canonical = getSlotByKey(slotId)
    if (
      !canonical
      || slot.slotId !== slotId
      || slot.displayOrder !== canonical.displayOrder
      || slot.purposeIdentifier !== canonical.purposeIdentifier
      || slot.operatorLabel !== canonical.operatorLabel
      || !['pending', 'generating', 'generated', 'provider_failed', 'media_save_failed', 'persisted', 'skipped'].includes(slot.status)
      || !Array.isArray(slot.warnings)
      || !slot.warnings.every((warning) => typeof warning === 'string')
      || (slot.status === 'persisted' && !validMediaId(slot.mediaId))
    ) {
      return { ok: false, error: retryLineageError(attempt.attemptId, `slot ${slotId} is malformed or positionally compacted.`) }
    }

    let qualityRetry: VisualQualityRetryEvidenceV01 | undefined
    if (slot.qualityRetry !== undefined) {
      qualityRetry = sanitizeVisualQualityRetryEvidenceV01(slot.qualityRetry)
      if (
        !qualityRetry
        || qualityRetry.jobId !== attempt.jobId
        || qualityRetry.slotId !== slotId
        || (attempt.attemptKind === 'initial' && qualityRetry.parentAttemptId !== attempt.attemptId)
      ) {
        return { ok: false, error: retryLineageError(attempt.attemptId, `slot ${slotId} has malformed or mismatched retry evidence.`) }
      }
    }
    sanitizedSlots.push({
      ...slot,
      ...(qualityRetry ? { qualityRetry } : {}),
    })
  }

  if (
    attempt.attemptKind === 'initial'
      ? attempt.attemptOrdinal !== 1 || attempt.parentAttemptId !== null
      : attempt.attemptOrdinal !== 2
        || typeof attempt.parentAttemptId !== 'string'
        || !IMAGE_GENERATION_ATTEMPT_ID_PATTERN.test(attempt.parentAttemptId)
        || attempt.requestedSlotIds.length !== 1
  ) {
    return { ok: false, error: retryLineageError(attempt.attemptId, 'the kind, ordinal, parent, or retry slot is invalid.') }
  }

  if (attempt.attemptKind === 'quality_retry') {
    const retryEvidence = sanitizedSlots[0]?.qualityRetry
    const failureReasonByTarget = {
      ANGLE: 'ANGLE_FAIL',
      STUDIO: 'STUDIO_FAIL',
      MATERIAL: 'MATERIAL_FAIL',
      TOPOLOGY: 'TOPOLOGY_FAIL',
      FRAMING: 'FRAMING_FAIL',
      PRODUCT_COUNT: 'PRODUCT_COUNT_FAIL',
    } as const
    const expectedReasons = retryEvidence?.targets.map((target) => failureReasonByTarget[target]) ?? []
    if (
      !retryEvidence
      || retryEvidence.authorized !== true
      || retryEvidence.parentAttemptId !== attempt.parentAttemptId
      || retryEvidence.retryAttemptId !== attempt.attemptId
      || retryEvidence.attemptOrdinal !== 2
      || retryEvidence.promptDigest === null
      || retryEvidence.targets.length < 1
      || JSON.stringify(retryEvidence.normalizedFailureReasons) !== JSON.stringify(expectedReasons)
    ) {
      return { ok: false, error: retryLineageError(attempt.attemptId, 'the retry evidence, digest, targets, or parent identifiers are invalid.') }
    }
  }

  return {
    ok: true,
    attempt: {
      ...attempt,
      slots: sanitizedSlots,
      ...(visualOnlyBoundary ? { visualOnlyBoundary } : {}),
    },
  }
}

function validatePackSelectionInternal(params: {
  attempts: readonly ImageGenerationAttemptMetadata[]
  rootAttempt: ImageGenerationAttemptMetadata
  selection: unknown
}): { ok: true; selection: ImageGenerationPackSelection } | { ok: false; error: string } {
  const { rootAttempt } = params
  if (
    rootAttempt.attemptKind !== 'initial'
    || !isRecord(params.selection)
    || params.selection.version !== IMAGE_GENERATION_PACK_SELECTION_VERSION
    || params.selection.rootAttemptId !== rootAttempt.attemptId
    || !Array.isArray(params.selection.slots)
    || params.selection.slots.length !== rootAttempt.requestedSlotIds.length
  ) {
    return { ok: false, error: `Generation attempt ${rootAttempt.attemptId} has an invalid pack-selection manifest.` }
  }
  const rootVisualOnlyBoundary = sanitizeVisualOnlyV01BoundaryManifest(rootAttempt.visualOnlyBoundary)
  const visualOnlyMode = params.selection.visualOnlyMode
  const visualOnlyBoundaryDigest = params.selection.visualOnlyBoundaryDigest
  if (
    rootVisualOnlyBoundary
      ? visualOnlyMode !== VISUAL_ONLY_V01_MODE
        || visualOnlyBoundaryDigest !== rootVisualOnlyBoundary.digest
      : visualOnlyMode !== undefined || visualOnlyBoundaryDigest !== undefined
  ) {
    return { ok: false, error: `Generation attempt ${rootAttempt.attemptId} has an invalid visual-only pack binding.` }
  }
  const qualityGateSummary = isRecord(rootAttempt.qualityGateSummary)
    ? rootAttempt.qualityGateSummary
    : undefined
  const packResults = qualityGateSummary && isRecord(qualityGateSummary.packResults)
    ? qualityGateSummary.packResults
    : undefined
  const rootTerminal = rootAttempt.status !== 'running'
    && typeof rootAttempt.completedAt === 'string'
    && !Number.isNaN(Date.parse(rootAttempt.completedAt))
  const directChildren = params.attempts.filter((attempt) =>
    attempt.attemptKind === 'quality_retry' && attempt.parentAttemptId === rootAttempt.attemptId,
  )
  if (
    !rootTerminal
    || packResults?.qualityGateStatus !== 'pass'
    || directChildren.some((attempt) => attempt.status === 'running' || !attempt.completedAt)
  ) {
    return { ok: false, error: `Generation attempt ${rootAttempt.attemptId} cannot select a pack from non-terminal or non-passing evidence.` }
  }

  const sanitizedSlots: ImageGenerationPackSelectionSlot[] = []
  for (let index = 0; index < rootAttempt.requestedSlotIds.length; index += 1) {
    const slotId = rootAttempt.requestedSlotIds[index]
    const canonical = getSlotByKey(slotId)
    const rootSlotEvidence = rootAttempt.slots[index]?.qualityRetry
    const value = params.selection.slots[index]
    if (
      !canonical
      || !rootSlotEvidence
      || !isRecord(value)
      || value.slotId !== slotId
      || value.displayOrder !== canonical.displayOrder
      || typeof value.sourceAttemptId !== 'string'
      || !IMAGE_GENERATION_ATTEMPT_ID_PATTERN.test(value.sourceAttemptId)
      || (value.sourceAttemptOrdinal !== 1 && value.sourceAttemptOrdinal !== 2)
      || !validMediaId(value.mediaId)
      || (value.mediaUrl !== undefined && value.mediaUrl !== null && typeof value.mediaUrl !== 'string')
    ) {
      return { ok: false, error: `Pack selection for ${rootAttempt.attemptId} has malformed or reordered slot ${slotId}.` }
    }

    const sourceAttempt = params.attempts.find((attempt) => attempt.attemptId === value.sourceAttemptId)
    const sourceSlot = sourceAttempt?.slots.find((slot) => slot.slotId === slotId)
    const sourceIsRoot = sourceAttempt?.attemptId === rootAttempt.attemptId
    const sourceIsDirectRetry = sourceAttempt?.attemptKind === 'quality_retry'
      && sourceAttempt.parentAttemptId === rootAttempt.attemptId
      && sourceAttempt.status === 'completed'
      && typeof sourceAttempt.completedAt === 'string'
      && !Number.isNaN(Date.parse(sourceAttempt.completedAt))
      && sourceAttempt.requestedSlotIds.length === 1
      && sourceAttempt.requestedSlotIds[0] === slotId
      && sourceSlot?.qualityRetry?.finalCombinedGateState === 'pass'
      && sourceSlot.qualityRetry.terminalOutcome === 'retry_passed'
      && sourceSlot.qualityRetry.generationAttempts === 1
      && sourceSlot.qualityRetry.evaluatorExecutions === 1
    const rootEvidenceMatchesSelection = sourceIsRoot
      ? rootSlotEvidence.authorized === false
        && rootSlotEvidence.retryAttemptId === null
        && rootSlotEvidence.finalCombinedGateState === 'pass'
        && rootSlotEvidence.terminalOutcome === 'not_authorized'
      : sourceIsDirectRetry
        ? rootSlotEvidence.authorized === true
        && rootSlotEvidence.retryAttemptId === sourceAttempt?.attemptId
        && rootSlotEvidence.terminalOutcome === sourceSlot?.qualityRetry?.terminalOutcome
        && rootSlotEvidence.finalCombinedGateState === sourceSlot?.qualityRetry?.finalCombinedGateState
        && rootSlotEvidence.framingCorrectionOutcome === sourceSlot?.qualityRetry?.framingCorrectionOutcome
        && JSON.stringify(rootSlotEvidence.finalDimensionStates) === JSON.stringify(sourceSlot?.qualityRetry?.finalDimensionStates)
      : false
    if (
      !sourceAttempt
      || sourceAttempt.jobId !== rootAttempt.jobId
      || sourceAttempt.attemptOrdinal !== value.sourceAttemptOrdinal
      || (!sourceIsRoot && !sourceIsDirectRetry)
      || !rootEvidenceMatchesSelection
      || !sourceSlot
      || sourceSlot.status !== 'persisted'
      || sourceSlot.mediaId !== value.mediaId
      || (value.mediaUrl !== undefined && (sourceSlot.mediaUrl ?? null) !== value.mediaUrl)
    ) {
      return { ok: false, error: `Pack selection for ${rootAttempt.attemptId} has invalid Media lineage for slot ${slotId}.` }
    }

    sanitizedSlots.push({
      slotId,
      displayOrder: canonical.displayOrder,
      sourceAttemptId: sourceAttempt.attemptId,
      sourceAttemptOrdinal: sourceAttempt.attemptOrdinal as ImageGenerationAttemptOrdinal,
      mediaId: sourceSlot.mediaId as string | number,
      ...(value.mediaUrl !== undefined ? { mediaUrl: value.mediaUrl as string | null } : {}),
    })
  }

  return {
    ok: true,
    selection: {
      version: IMAGE_GENERATION_PACK_SELECTION_VERSION,
      rootAttemptId: rootAttempt.attemptId,
      slots: sanitizedSlots,
      ...(rootVisualOnlyBoundary ? {
        visualOnlyMode: VISUAL_ONLY_V01_MODE,
        visualOnlyBoundaryDigest: rootVisualOnlyBoundary.digest,
      } : {}),
    },
  }
}

export function validateImageGenerationPackSelection(params: {
  attempts: readonly ImageGenerationAttemptMetadata[]
  rootAttempt: ImageGenerationAttemptMetadata
  selection?: unknown
}): { ok: true; selection: ImageGenerationPackSelection } | { ok: false; error: string } {
  return validatePackSelectionInternal({
    attempts: params.attempts,
    rootAttempt: params.rootAttempt,
    selection: params.selection ?? params.rootAttempt.packSelection,
  })
}

export function buildImageGenerationPackSelection(params: {
  attempts: readonly ImageGenerationAttemptMetadata[]
  rootAttemptId: ImageGenerationAttemptId
  sourcesBySlot: Readonly<Partial<Record<ImageSlotId, ImageGenerationAttemptId>>>
}): ImageGenerationPackSelection {
  const parsed = parseGenerationAttemptHistory(params.attempts)
  if (!parsed.ok) throw new Error(parsed.error)
  const rootAttempt = parsed.attempts.find((attempt) => attempt.attemptId === params.rootAttemptId)
  if (!rootAttempt || rootAttempt.attemptKind !== 'initial') {
    throw new Error(`Root generation attempt ${params.rootAttemptId} is unavailable or invalid.`)
  }
  const selection: ImageGenerationPackSelection = {
    version: IMAGE_GENERATION_PACK_SELECTION_VERSION,
    rootAttemptId: rootAttempt.attemptId,
    slots: rootAttempt.requestedSlotIds.map((slotId) => {
      const sourceAttemptId = params.sourcesBySlot[slotId]
      const sourceAttempt = parsed.attempts.find((attempt) => attempt.attemptId === sourceAttemptId)
      const sourceSlot = sourceAttempt?.slots.find((slot) => slot.slotId === slotId)
      const canonical = getSlotByKey(slotId)
      if (!sourceAttempt || !sourceSlot || !canonical || !validMediaId(sourceSlot.mediaId)) {
        throw new Error(`A complete persisted source is required for pack slot ${slotId}.`)
      }
      return {
        slotId,
        displayOrder: canonical.displayOrder,
        sourceAttemptId: sourceAttempt.attemptId,
        sourceAttemptOrdinal: sourceAttempt.attemptOrdinal as ImageGenerationAttemptOrdinal,
        mediaId: sourceSlot.mediaId,
        ...(sourceSlot.mediaUrl !== undefined ? { mediaUrl: sourceSlot.mediaUrl } : {}),
      }
    }),
    ...(rootAttempt.visualOnlyBoundary ? {
      visualOnlyMode: VISUAL_ONLY_V01_MODE,
      visualOnlyBoundaryDigest: rootAttempt.visualOnlyBoundary.digest,
    } : {}),
  }
  const validated = validatePackSelectionInternal({ attempts: parsed.attempts, rootAttempt, selection })
  if (!validated.ok) throw new Error(validated.error)
  return validated.selection
}

export function parseGenerationAttemptHistory(value: unknown):
  | { ok: true; attempts: ImageGenerationAttemptMetadata[] }
  | { ok: false; attempts: []; error: string } {
  if (value == null) return { ok: true, attempts: [] }
  if (!Array.isArray(value)) return { ok: false, attempts: [], error: 'Generation attempt metadata is not an array.' }
  const attempts: ImageGenerationAttemptMetadata[] = []
  const retryAwareIds = new Set<string>()
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') {
      return { ok: false, attempts: [], error: 'Generation attempt metadata contains a non-object entry.' }
    }
    const attempt = candidate as Partial<ImageGenerationAttemptMetadata>
    if (
      attempt.contractVersion !== IMAGE_SLOT_CONTRACT_VERSION ||
      typeof attempt.attemptId !== 'string' ||
      !attempt.attemptId.startsWith('iga_') ||
      typeof attempt.jobId !== 'string' ||
      !Array.isArray(attempt.slots) ||
      !Array.isArray(attempt.requestedSlotIds)
    ) {
      return { ok: false, attempts: [], error: 'Generation attempt metadata uses an unknown or malformed contract.' }
    }
    if (attempt.slots.some((slot) =>
      !slot || slot.contractVersion !== IMAGE_SLOT_CONTRACT_VERSION ||
      slot.attemptId !== attempt.attemptId || !isValidSlotKey(slot.slotId),
    )) {
      return { ok: false, attempts: [], error: `Generation attempt ${attempt.attemptId} contains malformed slot results.` }
    }
    const typedAttempt = attempt as ImageGenerationAttemptMetadata
    if (hasRetryMetadata(attempt)) {
      const sanitized = sanitizeRetryAwareAttempt(typedAttempt)
      if (!sanitized.ok) return { ok: false, attempts: [], error: sanitized.error }
      attempts.push(sanitized.attempt)
      retryAwareIds.add(sanitized.attempt.attemptId)
    } else {
      attempts.push(typedAttempt)
    }
  }

  if (retryAwareIds.size > 0) {
    const attemptIndex = new Map<string, number>()
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index]
      if (attemptIndex.has(attempt.attemptId)) {
        return { ok: false, attempts: [], error: `Generation attempt ${attempt.attemptId} is duplicated.` }
      }
      attemptIndex.set(attempt.attemptId, index)
    }

    const childByParentAndSlot = new Set<string>()
    for (const attempt of attempts) {
      if (!retryAwareIds.has(attempt.attemptId) || attempt.attemptKind !== 'quality_retry') continue
      const parent = attempts.find((candidate) => candidate.attemptId === attempt.parentAttemptId)
      const parentIndex = parent ? attemptIndex.get(parent.attemptId) : undefined
      const childIndex = attemptIndex.get(attempt.attemptId)
      const slotId = attempt.requestedSlotIds[0]
      const childKey = `${attempt.parentAttemptId}:${slotId}`
      const parentEvidence = parent?.slots.find((slot) => slot.slotId === slotId)?.qualityRetry
      const childEvidence = attempt.slots[0]?.qualityRetry
      if (
        !parent
        || parent.attemptKind !== 'initial'
        || parent.jobId !== attempt.jobId
        || !parent.requestedSlotIds.includes(slotId)
        || parentIndex === undefined
        || childIndex === undefined
        || parentIndex >= childIndex
        || childByParentAndSlot.has(childKey)
        || parentEvidence === undefined
        || (
          parentEvidence.authorized !== true
          || parentEvidence.retryAttemptId !== attempt.attemptId
          || parentEvidence.promptDigest !== childEvidence?.promptDigest
          || JSON.stringify(parentEvidence.targets) !== JSON.stringify(childEvidence?.targets)
          || JSON.stringify(parentEvidence.normalizedFailureReasons) !== JSON.stringify(childEvidence?.normalizedFailureReasons)
        )
      ) {
        return { ok: false, attempts: [], error: retryLineageError(attempt.attemptId, 'its parent, job, order, or one-child-per-slot invariant is invalid.') }
      }
      childByParentAndSlot.add(childKey)
    }

    for (const root of attempts) {
      if (!retryAwareIds.has(root.attemptId) || root.attemptKind !== 'initial') continue
      for (const slot of root.slots) {
        const evidence = slot.qualityRetry
        if (!evidence) continue
        const child = evidence.retryAttemptId === null
          ? undefined
          : attempts.find((attempt) => attempt.attemptId === evidence.retryAttemptId)
        const matchingChild = child?.attemptKind === 'quality_retry'
          && child.parentAttemptId === root.attemptId
          && child.jobId === root.jobId
          && child.requestedSlotIds.length === 1
          && child.requestedSlotIds[0] === slot.slotId
        if (
          evidence.retryAttemptId === null
            ? childByParentAndSlot.has(`${root.attemptId}:${slot.slotId}`)
            : child
              ? !matchingChild
              : evidence.terminalOutcome !== 'authorized_pending'
        ) {
          return { ok: false, attempts: [], error: retryLineageError(root.attemptId, `slot ${slot.slotId} has an invalid retry-child link.`) }
        }
      }
    }

    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index]
      if (!retryAwareIds.has(attempt.attemptId) || attempt.packSelection === undefined) continue
      if (attempt.attemptKind !== 'initial') {
        return { ok: false, attempts: [], error: retryLineageError(attempt.attemptId, 'only an initial root may own packSelection.') }
      }
      const validated = validatePackSelectionInternal({ attempts, rootAttempt: attempt, selection: attempt.packSelection })
      if (!validated.ok) return { ok: false, attempts: [], error: validated.error }
      attempts[index] = { ...attempt, packSelection: validated.selection }
    }
  }
  return { ok: true, attempts }
}

function parseLegacyStage(promptsUsed: unknown): 'standard' | 'premium' {
  if (typeof promptsUsed !== 'string') return 'standard'
  try {
    const parsed = JSON.parse(promptsUsed) as { stage?: unknown }
    return parsed.stage === 'premium' ? 'premium' : 'standard'
  } catch {
    return 'standard'
  }
}

export function projectLegacySlots(params: {
  mediaIds: readonly (string | number)[]
  promptsUsed?: unknown
}): LegacySlotProjection[] {
  const expectedIds = requestedSlotIdsForStage(parseLegacyStage(params.promptsUsed))
  const complete = params.mediaIds.length === expectedIds.length
  return params.mediaIds.map((mediaId, index) => {
    const slotId = complete ? expectedIds[index] : null
    const slot = slotId ? getSlotByKey(slotId) : undefined
    return {
      slotId,
      displayOrder: slot?.displayOrder ?? index,
      operatorLabel: slot?.operatorLabel ?? `Legacy image ${index + 1} (slot unknown)`,
      mediaId,
      legacy: true,
      ...(complete ? {} : { warning: 'Legacy partial metadata cannot prove semantic slot identity.' }),
    }
  })
}

export function resolveApprovalCandidates(params: {
  generationAttempts: unknown
  activeAttemptId?: unknown
  legacyMediaIds: readonly (string | number)[]
  promptsUsed?: unknown
}):
  | { ok: true; source: 'semantic' | 'legacy'; candidates: ApprovalCandidate[]; warning?: string }
  | { ok: false; source: 'semantic'; candidates: []; error: string } {
  if (params.generationAttempts != null) {
    const parsed = parseGenerationAttemptHistory(params.generationAttempts)
    if (!parsed.ok) return { ok: false, source: 'semantic', candidates: [], error: parsed.error }
    const activeId = typeof params.activeAttemptId === 'string' ? params.activeAttemptId : undefined
    const attempt = (activeId ? parsed.attempts.find((item) => item.attemptId === activeId) : undefined)
      ?? parsed.attempts.at(-1)
    if (!attempt) return { ok: false, source: 'semantic', candidates: [], error: 'No semantic generation attempt is available.' }
    const rootAttempt = attempt.attemptKind === 'quality_retry'
      ? parsed.attempts.find((item) => item.attemptId === attempt.parentAttemptId)
      : attempt
    if (rootAttempt?.packSelection !== undefined) {
      const validated = validatePackSelectionInternal({
        attempts: parsed.attempts,
        rootAttempt,
        selection: rootAttempt.packSelection,
      })
      if (!validated.ok) return { ok: false, source: 'semantic', candidates: [], error: validated.error }
      return {
        ok: true,
        source: 'semantic',
        candidates: validated.selection.slots.map((slot) => {
          const canonical = getSlotByKey(slot.slotId)
          return {
            slotId: slot.slotId,
            displayOrder: slot.displayOrder,
            operatorLabel: canonical?.operatorLabel ?? slot.slotId,
            mediaId: slot.mediaId,
          }
        }),
      }
    }
    if (
      rootAttempt?.attemptKind === 'initial'
      && rootAttempt.retryPolicyVersion === VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
    ) {
      return {
        ok: false,
        source: 'semantic',
        candidates: [],
        error: 'Retry-aware approval requires a complete validated pack-selection manifest.',
      }
    }
    const candidates = attempt.slots
      .filter((slot) => slot.status === 'persisted' && (typeof slot.mediaId === 'number' || typeof slot.mediaId === 'string'))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((slot) => ({
        slotId: slot.slotId,
        displayOrder: slot.displayOrder,
        operatorLabel: slot.operatorLabel,
        mediaId: slot.mediaId as string | number,
      }))
    return { ok: true, source: 'semantic', candidates }
  }

  const projected = projectLegacySlots({ mediaIds: params.legacyMediaIds, promptsUsed: params.promptsUsed })
  return {
    ok: true,
    source: 'legacy',
    candidates: projected,
    ...(projected.some((slot) => slot.slotId === null)
      ? { warning: 'Legacy partial metadata is readable, but its semantic slot identity is unknown.' }
      : {}),
  }
}

export function selectApprovalMediaIds(
  candidates: readonly ApprovalCandidate[],
  selection: string,
): Array<string | number> {
  if (!selection || selection === 'all') return candidates.map((candidate) => candidate.mediaId)
  const tokens = selection.split(/[,\s]+/).map((token) => token.trim()).filter(Boolean)
  const selected = new Set<string | number>()
  for (const token of tokens) {
    if (isValidSlotKey(token)) {
      const candidate = candidates.find((item) => item.slotId === token)
      if (candidate) selected.add(candidate.mediaId)
      continue
    }
    const ordinal = Number.parseInt(token, 10)
    if (!Number.isInteger(ordinal) || ordinal < 1) continue
    const semantic = candidates.find((item) => item.slotId !== null && item.displayOrder === ordinal - 1)
    const positional = candidates[ordinal - 1]
    const candidate = semantic ?? positional
    if (candidate) selected.add(candidate.mediaId)
  }
  return [...selected]
}

export function validateImageSlotRegistry(): string[] {
  const errors: string[] = []
  const ids = IMAGE_SLOT_REGISTRY.map((slot) => slot.slotId)
  if (new Set(ids).size !== ids.length) errors.push('Canonical image slot IDs are not unique.')
  if (ids.join('|') !== GENERATED_SLOT_KEYS.join('|')) errors.push('Canonical image slot order changed.')
  IMAGE_SLOT_REGISTRY.forEach((slot, index) => {
    if (slot.contractVersion !== IMAGE_SLOT_CONTRACT_VERSION) errors.push(`Slot ${slot.key} has the wrong contract version.`)
    if (slot.displayOrder !== index) errors.push(`Slot ${slot.key} has non-deterministic display order.`)
    if (slot.slotId !== slot.key || slot.purposeIdentifier !== slot.key) errors.push(`Slot ${slot.key} has inconsistent semantic identity.`)
  })
  return errors
}
