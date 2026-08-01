import { randomUUID } from 'node:crypto'

import {
  GENERATED_SLOT_KEYS,
  IMAGE_SLOT_CONTRACT_VERSION,
  IMAGE_SLOT_REGISTRY,
  getSlotByKey,
  isValidSlotKey,
  type SlotKey,
} from './imageSlotContract'

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
  orientationEvaluatorState?: 'pass' | 'fail' | 'unknown'
  geometryGateVersion?: string
  geometryGateState?: 'pass' | 'fail' | 'unknown'
  geometryGateReasonCodes?: string[]
  geometryMeasurement?: {
    occupancyPercent: number
    centerOffsetXPercent: number
    centerOffsetYPercent: number
    maximumCenterOffsetPercent: number
  } | null
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
  }
  qualityGateSummary?: {
    state: 'pass' | 'fail' | 'unknown'
    evaluatorVersion: string
    geometryGateVersion: string
    occupancySpreadPercent: number | null
    reasonCodes: string[]
  }
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
  orientationEvaluatorState?: unknown
  rejectionReason?: unknown
}

const MAX_SAFE_SUMMARY_LENGTH = 240

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
}): ImageGenerationAttemptMetadata {
  const attemptId = params.attemptId ?? `iga_${randomUUID()}`
  const requested = [...params.requestedSlotIds]
  if (new Set(requested).size !== requested.length) {
    throw new Error('Requested image slot IDs must be unique')
  }
  for (const slotId of requested) {
    if (!isValidSlotKey(slotId)) throw new Error(`Unknown image slot ID: ${String(slotId)}`)
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
  const triState = (value: unknown): value is 'pass' | 'fail' | 'unknown' =>
    value === 'pass' || value === 'fail' || value === 'unknown'
  return {
    provider: typeof log.provider === 'string' ? log.provider : fallbackProvider,
    attempts: typeof log.attempts === 'number' && log.attempts > 0 ? log.attempts : 1,
    ...(typeof log.colorCheckPass === 'boolean' ? { colorCheckPass: log.colorCheckPass } : {}),
    ...(typeof log.brandFidelityPass === 'boolean' ? { brandFidelityPass: log.brandFidelityPass } : {}),
    ...(typeof log.brandFidelityScore === 'string' ? { brandFidelityScore: log.brandFidelityScore } : {}),
    ...(typeof log.shotCompliancePass === 'boolean' ? { shotCompliancePass: log.shotCompliancePass } : {}),
    ...(typeof log.detectedShot === 'string' ? { detectedShot: log.detectedShot.slice(0, 120) } : {}),
    ...(typeof log.qualityEvaluatorVersion === 'string' ? { qualityEvaluatorVersion: log.qualityEvaluatorVersion.slice(0, 120) } : {}),
    ...(triState(log.qualityEvaluatorState) ? { qualityEvaluatorState: log.qualityEvaluatorState } : {}),
    ...(Array.isArray(log.qualityEvaluatorReasonCodes) ? {
      qualityEvaluatorReasonCodes: log.qualityEvaluatorReasonCodes.filter((value): value is string => typeof value === 'string').map((value) => value.slice(0, 120)),
    } : {}),
    ...(triState(log.colorEvaluatorState) ? { colorEvaluatorState: log.colorEvaluatorState } : {}),
    ...(triState(log.componentTopologyEvaluatorState) ? { componentTopologyEvaluatorState: log.componentTopologyEvaluatorState } : {}),
    ...(triState(log.orientationEvaluatorState) ? { orientationEvaluatorState: log.orientationEvaluatorState } : {}),
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

export async function persistGeneratedSlotEnvelopes<TOutput>(params: {
  slots: readonly ImageSlotExecutionEnvelope<TOutput>[]
  persist: (slot: ImageSlotExecutionEnvelope<TOutput> & { output: TOutput }) => Promise<{
    mediaId: string | number
    mediaUrl?: string | null
  }>
}): Promise<ImageSlotExecutionEnvelope<TOutput>[]> {
  const persisted: ImageSlotExecutionEnvelope<TOutput>[] = []
  for (const slot of params.slots) {
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

export function upsertGenerationAttemptHistory(
  value: unknown,
  attempt: ImageGenerationAttemptMetadata,
): ImageGenerationAttemptMetadata[] {
  const parsed = parseGenerationAttemptHistory(value)
  if (!parsed.ok) throw new Error(parsed.error)
  const existing = parsed.attempts
  const index = existing.findIndex((item) => item.attemptId === attempt.attemptId)
  if (index < 0) return [...existing, attempt]
  return existing.map((item, i) => i === index ? attempt : item)
}

export function parseGenerationAttemptHistory(value: unknown):
  | { ok: true; attempts: ImageGenerationAttemptMetadata[] }
  | { ok: false; attempts: []; error: string } {
  if (value == null) return { ok: true, attempts: [] }
  if (!Array.isArray(value)) return { ok: false, attempts: [], error: 'Generation attempt metadata is not an array.' }
  const attempts: ImageGenerationAttemptMetadata[] = []
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
    attempts.push(attempt as ImageGenerationAttemptMetadata)
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
