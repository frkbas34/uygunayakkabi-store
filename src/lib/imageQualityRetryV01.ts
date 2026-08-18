import { createHash } from 'node:crypto'

import {
  VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES,
  VISUAL_LOCK_V01_MATERIAL_REASON_CODES,
  VISUAL_LOCK_V01_PROFILE_VERSION,
  buildVisualLockV01AngleContractPrompt,
  buildVisualLockV01ComponentTopologyContractPrompt,
  buildVisualLockV01MaterialContractPrompt,
  buildVisualLockV01StudioContractPrompt,
  type VisualLockV01ComponentTopologyReasonCode,
  type VisualLockV01Context,
  type VisualLockV01MaterialReasonCode,
  type VisualQualityTriState,
} from './imageVisualLockV01'
import {
  VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS,
  VISUAL_LOCK_V01_FRAMING_TARGETS,
  type VisualFramingCorrectionOutcomeV01,
  type VisualFramingCorrectionReasonV01,
} from './imageFramingCorrectionV01'
import { GENERATED_SLOT_KEYS, type SlotKey } from './imageSlotContract'

export const VISUAL_QUALITY_RETRY_POLICY_V01_VERSION = 'visual-quality-retry-policy/v1' as const
export const VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION = 'visual-quality-retry-template/v1' as const
export const VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01 =
  'visual-lock-v0.1-slot-block-plus-retry-directive/v1' as const
export const VISUAL_QUALITY_RETRY_MAX_ATTEMPTS_PER_SLOT = 2 as const

export const VISUAL_QUALITY_RETRY_TARGET_ORDER = [
  'ANGLE',
  'STUDIO',
  'MATERIAL',
  'TOPOLOGY',
  'FRAMING',
  'PRODUCT_COUNT',
] as const

export type VisualQualityRetryTargetV01 = (typeof VISUAL_QUALITY_RETRY_TARGET_ORDER)[number]

export const VISUAL_QUALITY_RETRY_NON_RETRY_REASONS = [
  'PROFILE_NOT_V0_1',
  'INVALID_JOB_STATE',
  'LINEAGE_UNCERTAIN',
  'PERSISTENCE_UNCERTAIN',
  'DUPLICATE_DELIVERY_UNCERTAIN',
  'PACK_ALREADY_UNRECOVERABLE',
  'QUALITY_RETRY_BUDGET_EXHAUSTED',
  'EVALUATOR_EVIDENCE_INCOMPLETE',
  'BLOCKING_DIMENSION_UNKNOWN',
  'SOURCE_EVIDENCE_INSUFFICIENT',
  'GEOMETRY_EVIDENCE_UNRELIABLE',
  'DETAIL_CROP_AMBIGUOUS',
  'SLOT_ALREADY_PASSING',
  'FRAMING_CORRECTION_ALREADY_PASSED',
  'NO_RETRYABLE_VISUAL_FAILURE',
  'NON_VISUAL_FAILURE',
] as const

export type VisualQualityRetryNonRetryReasonV01 =
  (typeof VISUAL_QUALITY_RETRY_NON_RETRY_REASONS)[number]

export const VISUAL_QUALITY_RETRY_TERMINAL_OUTCOMES = [
  'not_authorized',
  'authorized_pending',
  'execution_blocked',
  'retry_passed',
  'retry_failed',
  'retry_unknown',
  'generation_failed',
  'evaluation_failed',
  'persistence_failed',
] as const

export type VisualQualityRetryTerminalOutcomeV01 =
  (typeof VISUAL_QUALITY_RETRY_TERMINAL_OUTCOMES)[number]

export const VISUAL_QUALITY_RETRY_FAILURE_REASONS = [
  'ANGLE_FAIL',
  'STUDIO_FAIL',
  'MATERIAL_FAIL',
  'TOPOLOGY_FAIL',
  'FRAMING_FAIL',
  'PRODUCT_COUNT_FAIL',
] as const

export type VisualQualityRetryFailureReasonV01 =
  (typeof VISUAL_QUALITY_RETRY_FAILURE_REASONS)[number]

export const VISUAL_QUALITY_RETRY_GEOMETRY_REASONS = [
  'occupancy_below_72',
  'occupancy_above_82',
  'center_offset_above_3',
  'clipping_detected',
] as const

export type VisualQualityRetryGeometryReasonV01 =
  (typeof VISUAL_QUALITY_RETRY_GEOMETRY_REASONS)[number]

export type VisualQualityRetryDimensionStatesV01 = {
  evaluator: VisualQualityTriState
  color: VisualQualityTriState
  angle: VisualQualityTriState
  studio: VisualQualityTriState
  material: VisualQualityTriState
  topology: VisualQualityTriState
  framing: VisualQualityTriState
  geometry: VisualQualityTriState
}

export type VisualQualityRetryDetailCropEvidenceV01 =
  | 'not_applicable'
  | 'reliable_crop_local_defect'
  | 'ambiguous_intentional_crop'

export type VisualQualityRetryClassifierInputV01 = {
  profileVersion: string
  slotId: SlotKey
  attemptOrdinal: number
  qualityRetryCount: number
  jobState: 'ready' | 'invalid' | 'cancelled'
  packState: 'recoverable' | 'unrecoverable'
  lineageState: 'certain' | 'uncertain'
  persistenceState: 'certain' | 'uncertain'
  duplicateDeliveryState: 'clear' | 'uncertain'
  requestedSlotCount: number
  durableSlotCount: number
  providerCandidateCount: number
  evaluatorExecutionCount: number
  candidateProduced: boolean
  combinedGateState: VisualQualityTriState
  dimensions: VisualQualityRetryDimensionStatesV01
  evaluatorReasonCodes: readonly string[]
  topologyReasonCodes: readonly VisualLockV01ComponentTopologyReasonCode[]
  materialReasonCodes: readonly VisualLockV01MaterialReasonCode[]
  framingOutcome: VisualFramingCorrectionOutcomeV01
  framingReasonCodes: readonly VisualFramingCorrectionReasonV01[]
  geometryReasonCodes: readonly VisualQualityRetryGeometryReasonV01[]
  /**
   * Whether full-product geometry is a quality requirement for this semantic
   * slot. Measurement reliability answers a different question: whether a
   * measurement, if applicable, is trustworthy. The material-detail crop is
   * intentionally geometry-exempt.
   */
  geometryApplicable: boolean
  geometryReliable: boolean
  detailCropEvidence: VisualQualityRetryDetailCropEvidenceV01
  sourceEvidenceSufficientTargets: readonly VisualQualityRetryTargetV01[]
}

export type VisualQualityRetryDecisionV01 = {
  version: typeof VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
  slotId: SlotKey
  attemptOrdinal: number
  decision: 'retry_authorized' | 'retry_not_authorized'
  authorized: boolean
  targets: VisualQualityRetryTargetV01[]
  normalizedFailureReasons: VisualQualityRetryFailureReasonV01[]
  nonRetryReason: VisualQualityRetryNonRetryReasonV01 | null
}

export type VisualQualityRetryAuthorizedDecisionV01 = VisualQualityRetryDecisionV01 & {
  decision: 'retry_authorized'
  authorized: true
  targets: [VisualQualityRetryTargetV01, ...VisualQualityRetryTargetV01[]]
  nonRetryReason: null
}

export type VisualQualityRetryEvidenceV01 = {
  version: typeof VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
  jobId: string
  slotId: SlotKey
  decision: 'retry_authorized' | 'retry_not_authorized'
  authorized: boolean
  targets: VisualQualityRetryTargetV01[]
  normalizedFailureReasons: VisualQualityRetryFailureReasonV01[]
  nonRetryReason: VisualQualityRetryNonRetryReasonV01 | null
  parentAttemptId: string
  retryAttemptId: string | null
  attemptOrdinal: 1 | 2
  promptTemplateVersion: typeof VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION
  promptDigestScope: typeof VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01
  promptDigest: string | null
  generationAttempts: 0 | 1
  evaluatorExecutions: 0 | 1
  framingCorrectionOutcome: VisualFramingCorrectionOutcomeV01
  finalDimensionStates: VisualQualityRetryDimensionStatesV01
  finalCombinedGateState: VisualQualityTriState
  terminalOutcome: VisualQualityRetryTerminalOutcomeV01
  startedAt?: string
  completedAt?: string
  durationMs?: number
}

export type VisualQualityRetryExecutionCallbacksV01 = {
  onGenerationCallStarted: () => void
  onCandidateProduced: () => void
  onEvaluatorCallStarted: () => void
}

export type VisualQualityRetryExecutionUsageV01 = {
  generationCalls: 0 | 1
  candidatesProduced: 0 | 1
  evaluatorCalls: 0 | 1
}

export type VisualQualityRetryProviderExecutionV01<T> =
  | { ok: true; value: T; usage: VisualQualityRetryExecutionUsageV01 }
  | { ok: false; error: unknown; usage: VisualQualityRetryExecutionUsageV01 }

export async function executeSingleVisualQualityRetryProviderV01<T>(
  invoke: (callbacks: VisualQualityRetryExecutionCallbacksV01) => Promise<T>,
): Promise<VisualQualityRetryProviderExecutionV01<T>> {
  let generationCalls = 0
  let candidatesProduced = 0
  let evaluatorCalls = 0
  let protocolError: Error | null = null
  const incrementOnce = (kind: 'generation' | 'candidate' | 'evaluator'): void => {
    const current = kind === 'generation'
      ? generationCalls
      : kind === 'candidate'
        ? candidatesProduced
        : evaluatorCalls
    if (current !== 0) {
      protocolError = new Error(`Visual quality retry attempted more than one ${kind} event.`)
      throw protocolError
    }
    if (kind === 'generation') generationCalls = 1
    else if (kind === 'candidate') candidatesProduced = 1
    else evaluatorCalls = 1
  }
  const usage = (): VisualQualityRetryExecutionUsageV01 => ({
    generationCalls: generationCalls as 0 | 1,
    candidatesProduced: candidatesProduced as 0 | 1,
    evaluatorCalls: evaluatorCalls as 0 | 1,
  })
  try {
    const value = await invoke({
      onGenerationCallStarted: () => incrementOnce('generation'),
      onCandidateProduced: () => {
        if (generationCalls !== 1) {
          protocolError = new Error('A retry candidate cannot exist before its provider call starts.')
          throw protocolError
        }
        incrementOnce('candidate')
      },
      onEvaluatorCallStarted: () => {
        if (candidatesProduced !== 1) {
          protocolError = new Error('The retry evaluator cannot start before a candidate exists.')
          throw protocolError
        }
        incrementOnce('evaluator')
      },
    })
    if (protocolError) return { ok: false, error: protocolError, usage: usage() }
    return { ok: true, value, usage: usage() }
  } catch (error) {
    return { ok: false, error: protocolError ?? error, usage: usage() }
  }
}

const TARGET_SET = new Set<string>(VISUAL_QUALITY_RETRY_TARGET_ORDER)
const NON_RETRY_SET = new Set<string>(VISUAL_QUALITY_RETRY_NON_RETRY_REASONS)
const TERMINAL_SET = new Set<string>(VISUAL_QUALITY_RETRY_TERMINAL_OUTCOMES)
const FAILURE_SET = new Set<string>(VISUAL_QUALITY_RETRY_FAILURE_REASONS)
const GEOMETRY_SET = new Set<string>(VISUAL_QUALITY_RETRY_GEOMETRY_REASONS)
const TOPOLOGY_REASON_SET = new Set<string>(VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES)
const MATERIAL_REASON_SET = new Set<string>(VISUAL_LOCK_V01_MATERIAL_REASON_CODES)
const EVALUATOR_FAILURE_REASON_SET = new Set<string>([
  'color_failed',
  'component_topology_failed',
  'orientation_failed',
  'studio_failed',
  'material_fidelity_failed',
  'back_not_true_rear',
  'orientation_view_mismatch',
  ...VISUAL_LOCK_V01_COMPONENT_TOPOLOGY_REASON_CODES,
  ...VISUAL_LOCK_V01_MATERIAL_REASON_CODES,
])
const FRAMING_REASON_SET = new Set<string>([
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
const RETRYABLE_FRAMING_REASON_SET = new Set<string>([
  'existing_edge_clipping',
  'insufficient_real_margin',
  'required_scale_above_1_15',
  'required_scale_below_reciprocal_1_15',
  'translation_above_12_percent',
  'background_not_warm_neutral',
  'background_nonuniform',
  'protected_bounds_would_crop',
  'final_geometry_not_pass',
])
const FRAMING_OUTCOME_SET = new Set<string>([
  'not_required',
  'applied',
  'unsafe_existing_clipping',
  'transform_outside_allowed_bounds',
  'unsafe_background_extension',
  'insufficient_geometry_evidence',
  'final_geometry_failed',
])
const DETAIL_CROP_EVIDENCE_SET = new Set<string>([
  'not_applicable',
  'reliable_crop_local_defect',
  'ambiguous_intentional_crop',
])
const ATTEMPT_ID_PATTERN = /^iga_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DIGEST_PATTERN = /^[0-9a-f]{64}$/

const isTriState = (value: unknown): value is VisualQualityTriState =>
  value === 'pass' || value === 'fail' || value === 'unknown'

function combineTriStates(states: readonly VisualQualityTriState[]): VisualQualityTriState {
  if (states.length === 0) return 'unknown'
  if (states.includes('fail')) return 'fail'
  if (states.includes('unknown')) return 'unknown'
  return 'pass'
}

function stableTargets(values: readonly VisualQualityRetryTargetV01[]): VisualQualityRetryTargetV01[] {
  const present = new Set(values)
  return VISUAL_QUALITY_RETRY_TARGET_ORDER.filter((target) => present.has(target))
}

function stableFailureReasons(targets: readonly VisualQualityRetryTargetV01[]): VisualQualityRetryFailureReasonV01[] {
  const map: Record<VisualQualityRetryTargetV01, VisualQualityRetryFailureReasonV01> = {
    ANGLE: 'ANGLE_FAIL',
    STUDIO: 'STUDIO_FAIL',
    MATERIAL: 'MATERIAL_FAIL',
    TOPOLOGY: 'TOPOLOGY_FAIL',
    FRAMING: 'FRAMING_FAIL',
    PRODUCT_COUNT: 'PRODUCT_COUNT_FAIL',
  }
  return stableTargets(targets).map((target) => map[target])
}

const FRAMING_REASON_CONTRACT: Readonly<Record<VisualFramingCorrectionOutcomeV01, ReadonlySet<string>>> = {
  not_required: new Set(['detail_slot_exempt', 'geometry_already_compliant']),
  applied: new Set(['framing_correction_applied']),
  unsafe_existing_clipping: new Set(['existing_edge_clipping', 'insufficient_real_margin', 'protected_bounds_would_crop']),
  transform_outside_allowed_bounds: new Set([
    'required_scale_above_1_15',
    'required_scale_below_reciprocal_1_15',
    'translation_above_12_percent',
  ]),
  unsafe_background_extension: new Set(['background_not_warm_neutral', 'background_nonuniform']),
  insufficient_geometry_evidence: new Set([
    'geometry_measurement_unavailable',
    'foreground_bounds_unavailable',
    'additional_product_suspected',
    'final_geometry_unavailable',
    'transform_failed',
  ]),
  final_geometry_failed: new Set(['final_geometry_not_pass']),
}

function framingOutcomeMatchesState(
  state: VisualQualityTriState,
  outcome: VisualFramingCorrectionOutcomeV01,
): boolean {
  if (outcome === 'not_required' || outcome === 'applied') return state === 'pass'
  if (outcome === 'unsafe_existing_clipping' || outcome === 'transform_outside_allowed_bounds') {
    return state === 'fail'
  }
  if (outcome === 'unsafe_background_extension' || outcome === 'insufficient_geometry_evidence') {
    return state === 'unknown'
  }
  return state === 'fail' || state === 'unknown'
}

function framingEvidenceIsCoherent(
  state: VisualQualityTriState,
  outcome: VisualFramingCorrectionOutcomeV01,
  reasonCodes: readonly VisualFramingCorrectionReasonV01[],
): boolean {
  const allowedReasons = FRAMING_REASON_CONTRACT[outcome]
  return framingOutcomeMatchesState(state, outcome)
    && reasonCodes.length === 1
    && allowedReasons.has(reasonCodes[0])
}

function geometryEvidenceIsCoherent(input: VisualQualityRetryClassifierInputV01): boolean {
  const reasons = input.geometryReasonCodes
  if (new Set(reasons).size !== reasons.length) return false
  const stableReasons = VISUAL_QUALITY_RETRY_GEOMETRY_REASONS.filter((reason) => reasons.includes(reason))
  if (JSON.stringify(stableReasons) !== JSON.stringify(reasons)) return false
  if (!input.geometryApplicable) {
    return input.dimensions.geometry === 'pass'
      && reasons.length === 0
  }
  if (input.slotId === 'detail') {
    return false
  }
  if (input.dimensions.geometry === 'pass') return reasons.length === 0 && input.geometryReliable
  if (input.dimensions.geometry === 'fail') return reasons.length > 0 && input.geometryReliable
  return reasons.length === 0 && input.geometryReliable === false
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function deny(
  input: VisualQualityRetryClassifierInputV01,
  nonRetryReason: VisualQualityRetryNonRetryReasonV01,
): VisualQualityRetryDecisionV01 {
  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    slotId: input.slotId,
    attemptOrdinal: input.attemptOrdinal,
    decision: 'retry_not_authorized',
    authorized: false,
    targets: [],
    normalizedFailureReasons: [],
    nonRetryReason,
  }
}

function isExplicitTopologyFail(code: VisualLockV01ComponentTopologyReasonCode): boolean {
  return code !== 'COMPONENT_EVIDENCE_INSUFFICIENT' && code !== 'PRODUCT_COUNT_DRIFT'
}

function isDefinitiveTopologyFail(code: VisualLockV01ComponentTopologyReasonCode): boolean {
  return code !== 'COMPONENT_EVIDENCE_INSUFFICIENT'
}

const RETRYABLE_FRAMING_OUTCOMES = new Set<VisualFramingCorrectionOutcomeV01>([
  'unsafe_existing_clipping',
  'transform_outside_allowed_bounds',
  'unsafe_background_extension',
  'final_geometry_failed',
])

export function hasSufficientSourceEvidenceForRetryV01(
  context: VisualLockV01Context,
  target: VisualQualityRetryTargetV01,
): boolean {
  if (target === 'ANGLE' || target === 'STUDIO' || target === 'FRAMING' || target === 'PRODUCT_COUNT') {
    return true
  }
  if (target === 'MATERIAL') {
    const zones = context.identityAnchor.facts.materialZones
    return zones.some(({ value }) => {
      const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase()
      return normalized.length > 0 && normalized !== 'unknown'
    })
  }
  return Object.values(context.componentTopology.sourceSupported)
    .some((value) => value.trim().toLowerCase() !== 'unknown')
}

export function classifyVisualQualityRetryV01(
  input: VisualQualityRetryClassifierInputV01,
): VisualQualityRetryDecisionV01 {
  if (input.profileVersion !== VISUAL_LOCK_V01_PROFILE_VERSION) return deny(input, 'PROFILE_NOT_V0_1')
  const dimensionKeys = ['evaluator', 'color', 'angle', 'studio', 'material', 'topology', 'framing', 'geometry'] as const
  if (
    !GENERATED_SLOT_KEYS.includes(input.slotId as SlotKey)
    || !isNonNegativeSafeInteger(input.attemptOrdinal)
    || !isNonNegativeSafeInteger(input.qualityRetryCount)
    || !isNonNegativeSafeInteger(input.requestedSlotCount)
    || !isNonNegativeSafeInteger(input.durableSlotCount)
    || !isNonNegativeSafeInteger(input.providerCandidateCount)
    || !isNonNegativeSafeInteger(input.evaluatorExecutionCount)
    || typeof input.candidateProduced !== 'boolean'
    || typeof input.geometryApplicable !== 'boolean'
    || typeof input.geometryReliable !== 'boolean'
    || !isRecord(input.dimensions)
    || Object.keys(input.dimensions).length !== dimensionKeys.length
    || !dimensionKeys.every((key) => isTriState(input.dimensions[key]))
    || typeof input.framingOutcome !== 'string'
    || !FRAMING_OUTCOME_SET.has(input.framingOutcome)
    || typeof input.detailCropEvidence !== 'string'
    || !DETAIL_CROP_EVIDENCE_SET.has(input.detailCropEvidence)
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  if (input.jobState !== 'ready') return deny(input, 'INVALID_JOB_STATE')
  if (input.packState !== 'recoverable') return deny(input, 'PACK_ALREADY_UNRECOVERABLE')
  if (input.lineageState !== 'certain' || input.requestedSlotCount !== input.durableSlotCount) {
    return deny(input, 'LINEAGE_UNCERTAIN')
  }
  if (input.persistenceState !== 'certain') return deny(input, 'PERSISTENCE_UNCERTAIN')
  if (
    input.requestedSlotCount <= 0
    || input.durableSlotCount <= 0
    || input.duplicateDeliveryState !== 'clear'
    || input.providerCandidateCount > 1
  ) {
    return deny(input, 'DUPLICATE_DELIVERY_UNCERTAIN')
  }
  if (input.attemptOrdinal !== 1 || input.qualityRetryCount >= 1) {
    return deny(input, 'QUALITY_RETRY_BUDGET_EXHAUSTED')
  }
  if (input.evaluatorExecutionCount !== 1) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  if (!input.candidateProduced || input.providerCandidateCount !== 1) return deny(input, 'NON_VISUAL_FAILURE')
  const dimensionValues = dimensionKeys.map((key) => input.dimensions[key])
  if (
    dimensionValues.length !== 8
    || !dimensionValues.every(isTriState)
    || !isTriState(input.combinedGateState)
    || !Array.isArray(input.evaluatorReasonCodes)
    || !Array.isArray(input.topologyReasonCodes)
    || !Array.isArray(input.materialReasonCodes)
    || !Array.isArray(input.framingReasonCodes)
    || !Array.isArray(input.geometryReasonCodes)
    || !Array.isArray(input.sourceEvidenceSufficientTargets)
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')

  const expectedEvaluatorState = combineTriStates([
    input.dimensions.color,
    input.dimensions.topology,
    input.dimensions.angle,
    input.dimensions.studio,
    input.dimensions.material,
  ])
  const expectedGeometryApplicable = input.slotId !== 'detail'
  if (input.geometryApplicable !== expectedGeometryApplicable) {
    return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  }
  const expectedCombinedState = combineTriStates([
    input.dimensions.evaluator,
    input.dimensions.color,
    input.dimensions.angle,
    input.dimensions.studio,
    input.dimensions.material,
    input.dimensions.topology,
    input.dimensions.framing,
    ...(input.geometryApplicable ? [input.dimensions.geometry] : []),
  ])
  if (
    input.dimensions.evaluator !== expectedEvaluatorState
    || input.combinedGateState !== expectedCombinedState
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  const blockingDimensionStates = dimensionKeys
    .filter((key) => input.geometryApplicable || key !== 'geometry')
    .map((key) => input.dimensions[key])
  if (blockingDimensionStates.includes('unknown') || input.combinedGateState === 'unknown') {
    return deny(input, 'BLOCKING_DIMENSION_UNKNOWN')
  }
  if (
    input.evaluatorReasonCodes.some((reason) => typeof reason !== 'string' || !EVALUATOR_FAILURE_REASON_SET.has(reason))
    || input.topologyReasonCodes.some((reason) => typeof reason !== 'string' || !TOPOLOGY_REASON_SET.has(reason))
    || input.materialReasonCodes.some((reason) => typeof reason !== 'string' || !MATERIAL_REASON_SET.has(reason))
    || input.framingReasonCodes.some((reason) => typeof reason !== 'string' || !FRAMING_REASON_SET.has(reason))
    || input.geometryReasonCodes.some((reason) => typeof reason !== 'string' || !GEOMETRY_SET.has(reason))
    || input.sourceEvidenceSufficientTargets.some((target) => typeof target !== 'string' || !TARGET_SET.has(target))
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  if (
    input.slotId !== 'detail'
    && (
      (input.dimensions.geometry !== 'unknown' && !input.geometryReliable)
      || (input.dimensions.framing === 'fail' && input.geometryReasonCodes.length === 0)
    )
  ) return deny(input, 'GEOMETRY_EVIDENCE_UNRELIABLE')
  if (
    JSON.stringify(input.sourceEvidenceSufficientTargets)
      !== JSON.stringify(stableTargets(input.sourceEvidenceSufficientTargets))
    || !framingEvidenceIsCoherent(
      input.dimensions.framing,
      input.framingOutcome,
      input.framingReasonCodes,
    )
    || !geometryEvidenceIsCoherent(input)
    || (input.slotId === 'detail'
      ? input.detailCropEvidence === 'not_applicable'
      : input.detailCropEvidence !== 'not_applicable')
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  if (
    (input.dimensions.evaluator === 'pass' && input.evaluatorReasonCodes.length > 0)
    || (input.dimensions.evaluator === 'fail' && input.evaluatorReasonCodes.length === 0)
    || (input.dimensions.topology === 'pass' && input.topologyReasonCodes.length > 0)
    || (input.dimensions.material === 'pass' && input.materialReasonCodes.length > 0)
    || (input.dimensions.topology === 'fail' && !input.topologyReasonCodes.some(isDefinitiveTopologyFail))
    || (input.dimensions.material === 'fail'
      && !input.materialReasonCodes.some((reason) => reason !== 'MATERIAL_EVIDENCE_INSUFFICIENT'))
    || input.framingReasonCodes.length === 0
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  const evaluatorReasons = new Set(input.evaluatorReasonCodes)
  const aggregateReasonMatches = (
    dimension: VisualQualityTriState,
    reason: string,
  ) => dimension === 'fail' ? evaluatorReasons.has(reason) : !evaluatorReasons.has(reason)
  const topologyReasonsMatch = input.topologyReasonCodes.every((reason) => evaluatorReasons.has(reason))
    && input.evaluatorReasonCodes
      .filter((reason) => TOPOLOGY_REASON_SET.has(reason))
      .every((reason) => input.topologyReasonCodes.includes(reason as VisualLockV01ComponentTopologyReasonCode))
  const materialReasonsMatch = input.materialReasonCodes.every((reason) => evaluatorReasons.has(reason))
    && input.evaluatorReasonCodes
      .filter((reason) => MATERIAL_REASON_SET.has(reason))
      .every((reason) => input.materialReasonCodes.includes(reason as VisualLockV01MaterialReasonCode))
  const orientationDetailsPresent = evaluatorReasons.has('back_not_true_rear')
    || evaluatorReasons.has('orientation_view_mismatch')
  if (
    !aggregateReasonMatches(input.dimensions.color, 'color_failed')
    || !aggregateReasonMatches(input.dimensions.topology, 'component_topology_failed')
    || !aggregateReasonMatches(input.dimensions.angle, 'orientation_failed')
    || !aggregateReasonMatches(input.dimensions.studio, 'studio_failed')
    || !aggregateReasonMatches(input.dimensions.material, 'material_fidelity_failed')
    || (input.dimensions.angle !== 'fail' && orientationDetailsPresent)
    || !topologyReasonsMatch
    || !materialReasonsMatch
  ) return deny(input, 'EVALUATOR_EVIDENCE_INCOMPLETE')
  if (input.combinedGateState === 'pass') {
    return deny(
      input,
      input.framingOutcome === 'applied'
        ? 'FRAMING_CORRECTION_ALREADY_PASSED'
        : 'SLOT_ALREADY_PASSING',
    )
  }
  if (input.dimensions.color === 'fail') return deny(input, 'NO_RETRYABLE_VISUAL_FAILURE')

  const candidates: VisualQualityRetryTargetV01[] = []
  if (input.dimensions.angle === 'fail' && evaluatorReasons.has('orientation_failed')) candidates.push('ANGLE')
  if (input.dimensions.studio === 'fail' && evaluatorReasons.has('studio_failed')) candidates.push('STUDIO')
  if (
    input.dimensions.material === 'fail'
    && input.materialReasonCodes.some((code) => code !== 'MATERIAL_EVIDENCE_INSUFFICIENT')
  ) candidates.push('MATERIAL')
  if (
    input.dimensions.topology === 'fail'
    && input.topologyReasonCodes.some(isExplicitTopologyFail)
  ) candidates.push('TOPOLOGY')
  if (
    input.dimensions.topology === 'fail'
    && input.topologyReasonCodes.includes('PRODUCT_COUNT_DRIFT')
  ) candidates.push('PRODUCT_COUNT')

  const framingFailed = input.dimensions.framing === 'fail'
    || (input.geometryApplicable && input.dimensions.geometry === 'fail')
  if (framingFailed) {
    if (input.slotId === 'detail') {
      if (input.detailCropEvidence !== 'reliable_crop_local_defect') {
        return deny(input, 'DETAIL_CROP_AMBIGUOUS')
      }
      if (
        RETRYABLE_FRAMING_OUTCOMES.has(input.framingOutcome)
        && input.framingReasonCodes.some((reason) => RETRYABLE_FRAMING_REASON_SET.has(reason))
      ) candidates.push('FRAMING')
    } else {
      if (!input.geometryReliable || input.geometryReasonCodes.length === 0) {
        return deny(input, 'GEOMETRY_EVIDENCE_UNRELIABLE')
      }
      if (
        RETRYABLE_FRAMING_OUTCOMES.has(input.framingOutcome)
        && input.framingReasonCodes.some((reason) => RETRYABLE_FRAMING_REASON_SET.has(reason))
      ) candidates.push('FRAMING')
    }
    if (!candidates.includes('FRAMING')) return deny(input, 'NO_RETRYABLE_VISUAL_FAILURE')
  }

  const targets = stableTargets(candidates)
  const evaluatorFailureAttributed = input.dimensions.evaluator !== 'fail'
    || ['ANGLE', 'STUDIO', 'MATERIAL', 'TOPOLOGY', 'PRODUCT_COUNT'].some((target) => targets.includes(target as VisualQualityRetryTargetV01))
  if (targets.length === 0 || !evaluatorFailureAttributed) return deny(input, 'NO_RETRYABLE_VISUAL_FAILURE')

  const sufficient = new Set(input.sourceEvidenceSufficientTargets)
  if (targets.some((target) => !sufficient.has(target))) return deny(input, 'SOURCE_EVIDENCE_INSUFFICIENT')

  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    slotId: input.slotId,
    attemptOrdinal: input.attemptOrdinal,
    decision: 'retry_authorized',
    authorized: true,
    targets: targets as [VisualQualityRetryTargetV01, ...VisualQualityRetryTargetV01[]],
    normalizedFailureReasons: stableFailureReasons(targets),
    nonRetryReason: null,
  }
}

function buildFramingDirective(slotId: SlotKey): string {
  if (slotId === 'detail') {
    return (
      `FRAMING CORRECTION: preserve the intentional material_detail crop and its source-supported material zone. ` +
      `Do not reveal the whole shoe, apply full-product clipping/contact-shadow rules, or turn the crop into another slot.`
    )
  }
  const target = VISUAL_LOCK_V01_FRAMING_TARGETS[slotId]
  if (!target) throw new Error(`Missing V0.1 framing target for ${slotId}`)
  return (
    `FRAMING CORRECTION: preserve the exact ${slotId} semantic view while keeping the complete product inside the canvas; ` +
    `occupancy ${target.minimumOccupancyPercent}-${target.maximumOccupancyPercent}%; ` +
    `maximum center offset ${target.maximumCenterOffsetPercent}%; ` +
    `real margin at least ${VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS.minimumRealMarginPercent}%; ` +
    `never crop protected content, extend an unsafe background, mirror, rotate, warp, or change aspect ratio.`
  )
}

export function buildVisualQualityRetryDirectiveV01(params: {
  context: VisualLockV01Context
  decision: VisualQualityRetryAuthorizedDecisionV01
}): string {
  const { context, decision } = params
  const targets = stableTargets(decision.targets)
  if (
    decision.version !== VISUAL_QUALITY_RETRY_POLICY_V01_VERSION
    || decision.decision !== 'retry_authorized'
    || decision.authorized !== true
    || decision.attemptOrdinal !== 1
    || decision.nonRetryReason !== null
    || targets.length === 0
    || JSON.stringify(targets) !== JSON.stringify(decision.targets)
    || JSON.stringify(stableFailureReasons(targets)) !== JSON.stringify(decision.normalizedFailureReasons)
  ) {
    throw new Error('Invalid quality-retry decision')
  }
  const targetSet = new Set(targets)
  const sections: string[] = []
  if (targetSet.has('ANGLE')) sections.push(buildVisualLockV01AngleContractPrompt(decision.slotId))
  if (targetSet.has('STUDIO')) sections.push(buildVisualLockV01StudioContractPrompt(decision.slotId))
  if (targetSet.has('MATERIAL')) sections.push(buildVisualLockV01MaterialContractPrompt(context, decision.slotId))
  if (targetSet.has('TOPOLOGY') || targetSet.has('PRODUCT_COUNT')) {
    sections.push(buildVisualLockV01ComponentTopologyContractPrompt(context, decision.slotId))
  }
  if (targetSet.has('FRAMING')) sections.push(buildFramingDirective(decision.slotId))
  if (targetSet.has('PRODUCT_COUNT')) {
    sections.push('PRODUCT COUNT CORRECTION: render exactly one source-supported shoe; never add a pair, second shoe, duplicate, reflection, or mirrored product.')
  }

  const preserved = (['COLOR', ...VISUAL_QUALITY_RETRY_TARGET_ORDER, 'GEOMETRY'] as const)
    .filter((target) => {
      if (target === 'COLOR') return true
      if (target === 'GEOMETRY') return !targetSet.has('FRAMING')
      if (target === 'TOPOLOGY') return !targetSet.has('TOPOLOGY') && !targetSet.has('PRODUCT_COUNT')
      return !targetSet.has(target)
    })
    .map((target) => target.toLowerCase().replace('_', ' '))
  return (
    `\n\n=== TARGETED VISUAL QUALITY RETRY (${VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION}) ===\n` +
    `This is the single corrective regeneration of the same requested slot (${decision.slotId}); it is not a new slot or a new product.\n` +
    `AUTHORIZED TARGETS (stable order): ${targets.join(', ')}.\n` +
    `${sections.join('\n')}\n` +
    `PRESERVE EVERY PASSING DIMENSION: ${preserved.join(', ') || 'none'}; always preserve product identity, handedness, source-supported facts, and every contract not named above.\n` +
    `Do not solve one defect by changing identity, handedness, angle, material, topology, studio consistency, framing, or product count outside the authorized targets.\n` +
    `=== END TARGETED VISUAL QUALITY RETRY ===\n`
  )
}

export function buildVisualQualityRetryPromptV01(params: {
  basePrompt: string
  context: VisualLockV01Context
  decision: VisualQualityRetryAuthorizedDecisionV01
}): string {
  return params.basePrompt + buildVisualQualityRetryDirectiveV01({
    context: params.context,
    decision: params.decision,
  })
}

export function digestVisualQualityRetryPromptV01(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex')
}

export function createVisualQualityRetryEvidenceV01(params: {
  decision: VisualQualityRetryDecisionV01
  jobId: string | number
  parentAttemptId: string
  retryAttemptId: string | null
  promptDigest: string | null
  framingCorrectionOutcome: VisualFramingCorrectionOutcomeV01
  finalDimensionStates: VisualQualityRetryDimensionStatesV01
  finalCombinedGateState: VisualQualityTriState
  startedAt?: string
}): VisualQualityRetryEvidenceV01 {
  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    jobId: String(params.jobId),
    slotId: params.decision.slotId,
    decision: params.decision.decision,
    authorized: params.decision.authorized,
    targets: [...params.decision.targets],
    normalizedFailureReasons: [...params.decision.normalizedFailureReasons],
    nonRetryReason: params.decision.nonRetryReason,
    parentAttemptId: params.parentAttemptId,
    retryAttemptId: params.retryAttemptId,
    attemptOrdinal: params.decision.authorized ? 2 : 1,
    promptTemplateVersion: VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
    promptDigestScope: VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
    promptDigest: params.promptDigest,
    generationAttempts: 0,
    evaluatorExecutions: 0,
    framingCorrectionOutcome: params.framingCorrectionOutcome,
    finalDimensionStates: { ...params.finalDimensionStates },
    finalCombinedGateState: params.finalCombinedGateState,
    terminalOutcome: params.decision.authorized ? 'authorized_pending' : 'not_authorized',
    ...(params.startedAt ? { startedAt: params.startedAt } : {}),
  }
}

export function finalizeVisualQualityRetryEvidenceV01(
  evidence: VisualQualityRetryEvidenceV01,
  patch: {
    terminalOutcome: Exclude<VisualQualityRetryTerminalOutcomeV01, 'authorized_pending' | 'not_authorized'>
    generationAttempts: 0 | 1
    evaluatorExecutions: 0 | 1
    framingCorrectionOutcome: VisualFramingCorrectionOutcomeV01
    finalDimensionStates: VisualQualityRetryDimensionStatesV01
    finalCombinedGateState: VisualQualityTriState
    completedAt: string
    durationMs: number
  },
): VisualQualityRetryEvidenceV01 {
  if (!evidence.authorized || evidence.terminalOutcome !== 'authorized_pending') {
    throw new Error('Only an authorized pending retry can be finalized.')
  }
  const finalized: VisualQualityRetryEvidenceV01 = {
    ...evidence,
    ...patch,
    finalDimensionStates: { ...patch.finalDimensionStates },
  }
  const sanitized = sanitizeVisualQualityRetryEvidenceV01(finalized)
  if (!sanitized) throw new Error('Final quality-retry evidence is contradictory or incomplete.')
  return sanitized
}

export function failVisualQualityRetryPersistenceV01(
  evidence: VisualQualityRetryEvidenceV01,
  params: { completedAt: string; durationMs: number },
): VisualQualityRetryEvidenceV01 {
  if (!evidence.authorized || evidence.terminalOutcome !== 'retry_passed') {
    throw new Error('Only a quality-passing retry can transition to persistence_failed.')
  }
  const failed: VisualQualityRetryEvidenceV01 = {
    ...evidence,
    terminalOutcome: 'persistence_failed',
    completedAt: params.completedAt,
    durationMs: params.durationMs,
  }
  const sanitized = sanitizeVisualQualityRetryEvidenceV01(failed)
  if (!sanitized) throw new Error('Persistence-failure evidence is contradictory or incomplete.')
  return sanitized
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isDimensions(value: unknown): value is VisualQualityRetryDimensionStatesV01 {
  if (!isRecord(value)) return false
  const keys = ['evaluator', 'color', 'angle', 'studio', 'material', 'topology', 'framing', 'geometry'] as const
  return Object.keys(value).length === keys.length && keys.every((key) => isTriState(value[key]))
}

export function sanitizeVisualQualityRetryEvidenceV01(value: unknown): VisualQualityRetryEvidenceV01 | undefined {
  if (!isRecord(value)) return undefined
  const allowedKeys = new Set([
    'version', 'jobId', 'slotId', 'decision', 'authorized', 'targets', 'normalizedFailureReasons', 'nonRetryReason',
    'parentAttemptId', 'retryAttemptId', 'attemptOrdinal', 'promptTemplateVersion', 'promptDigestScope', 'promptDigest',
    'generationAttempts', 'evaluatorExecutions', 'framingCorrectionOutcome', 'finalDimensionStates',
    'finalCombinedGateState', 'terminalOutcome', 'startedAt', 'completedAt', 'durationMs',
  ])
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return undefined
  if (value.version !== VISUAL_QUALITY_RETRY_POLICY_V01_VERSION) return undefined
  if (typeof value.jobId !== 'string' || value.jobId.length === 0 || value.jobId.length > 120) return undefined
  if (!GENERATED_SLOT_KEYS.includes(value.slotId as SlotKey)) return undefined
  if (value.decision !== 'retry_authorized' && value.decision !== 'retry_not_authorized') return undefined
  if (typeof value.authorized !== 'boolean' || value.authorized !== (value.decision === 'retry_authorized')) return undefined
  if (!Array.isArray(value.targets) || value.targets.some((target) => typeof target !== 'string' || !TARGET_SET.has(target))) return undefined
  const targets = value.targets as VisualQualityRetryTargetV01[]
  if (JSON.stringify(targets) !== JSON.stringify(stableTargets(targets))) return undefined
  if (!Array.isArray(value.normalizedFailureReasons) || value.normalizedFailureReasons.some((reason) => typeof reason !== 'string' || !FAILURE_SET.has(reason))) return undefined
  const failures = value.normalizedFailureReasons as VisualQualityRetryFailureReasonV01[]
  if (new Set(failures).size !== failures.length) return undefined
  if (value.nonRetryReason !== null && (typeof value.nonRetryReason !== 'string' || !NON_RETRY_SET.has(value.nonRetryReason))) return undefined
  if (typeof value.parentAttemptId !== 'string' || !ATTEMPT_ID_PATTERN.test(value.parentAttemptId)) return undefined
  if (value.retryAttemptId !== null && (typeof value.retryAttemptId !== 'string' || !ATTEMPT_ID_PATTERN.test(value.retryAttemptId))) return undefined
  if (value.attemptOrdinal !== 1 && value.attemptOrdinal !== 2) return undefined
  if (value.promptTemplateVersion !== VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION) return undefined
  if (value.promptDigestScope !== VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01) return undefined
  if (value.promptDigest !== null && (typeof value.promptDigest !== 'string' || !DIGEST_PATTERN.test(value.promptDigest))) return undefined
  if (value.generationAttempts !== 0 && value.generationAttempts !== 1) return undefined
  if (value.evaluatorExecutions !== 0 && value.evaluatorExecutions !== 1) return undefined
  if (typeof value.framingCorrectionOutcome !== 'string' || !FRAMING_OUTCOME_SET.has(value.framingCorrectionOutcome)) return undefined
  if (!isDimensions(value.finalDimensionStates) || !isTriState(value.finalCombinedGateState)) return undefined
  const finalDimensionStates = value.finalDimensionStates as VisualQualityRetryDimensionStatesV01
  if (combineTriStates(Object.values(finalDimensionStates)) !== value.finalCombinedGateState) return undefined
  if (
    finalDimensionStates.evaluator !== combineTriStates([
      finalDimensionStates.color,
      finalDimensionStates.topology,
      finalDimensionStates.angle,
      finalDimensionStates.studio,
      finalDimensionStates.material,
    ])
  ) return undefined
  if (typeof value.terminalOutcome !== 'string' || !TERMINAL_SET.has(value.terminalOutcome)) return undefined
  if (value.startedAt !== undefined && (typeof value.startedAt !== 'string' || Number.isNaN(Date.parse(value.startedAt)))) return undefined
  if (value.completedAt !== undefined && (typeof value.completedAt !== 'string' || Number.isNaN(Date.parse(value.completedAt)))) return undefined
  if (value.durationMs !== undefined && (typeof value.durationMs !== 'number' || !Number.isFinite(value.durationMs) || value.durationMs < 0)) return undefined
  if (value.authorized) {
    if (
      targets.length === 0
      || value.retryAttemptId === null
      || value.retryAttemptId === value.parentAttemptId
      || value.nonRetryReason !== null
      || value.promptDigest === null
      || value.attemptOrdinal !== 2
      || JSON.stringify(failures) !== JSON.stringify(stableFailureReasons(targets))
    ) return undefined
  } else if (
    targets.length !== 0
    || failures.length !== 0
    || value.retryAttemptId !== null
    || value.nonRetryReason === null
    || value.promptDigest !== null
    || value.attemptOrdinal !== 1
  ) {
    return undefined
  }
  const terminal = value.terminalOutcome as VisualQualityRetryTerminalOutcomeV01
  const allFinalDimensionsUnknown = Object.values(finalDimensionStates)
    .every((state) => state === 'unknown')
  const framingObservationUnavailable = allFinalDimensionsUnknown
    && (terminal === 'execution_blocked'
      || terminal === 'generation_failed'
      || terminal === 'evaluation_failed')
  const topologyTargeted = targets.includes('TOPOLOGY') || targets.includes('PRODUCT_COUNT')
  const framingTargeted = targets.includes('FRAMING')
  const pendingTargetsExactlyCoverFailedDimensions = (
    finalDimensionStates.color === 'pass'
    && !Object.values(finalDimensionStates).includes('unknown')
    && (finalDimensionStates.angle === 'fail') === targets.includes('ANGLE')
    && (finalDimensionStates.studio === 'fail') === targets.includes('STUDIO')
    && (finalDimensionStates.material === 'fail') === targets.includes('MATERIAL')
    && (finalDimensionStates.topology === 'fail') === topologyTargeted
    && (finalDimensionStates.framing === 'fail' || finalDimensionStates.geometry === 'fail') === framingTargeted
  )
  if (
    !framingObservationUnavailable
    && !framingOutcomeMatchesState(
      finalDimensionStates.framing,
      value.framingCorrectionOutcome as VisualFramingCorrectionOutcomeV01,
    )
  ) return undefined
  if (terminal === 'not_authorized') {
    if (value.authorized || value.generationAttempts !== 0 || value.evaluatorExecutions !== 0) return undefined
    if (
      (value.nonRetryReason === 'SLOT_ALREADY_PASSING'
        && (value.finalCombinedGateState !== 'pass' || value.framingCorrectionOutcome === 'applied'))
      || (value.nonRetryReason === 'FRAMING_CORRECTION_ALREADY_PASSED'
        && (value.finalCombinedGateState !== 'pass' || value.framingCorrectionOutcome !== 'applied'))
      || (value.nonRetryReason === 'BLOCKING_DIMENSION_UNKNOWN'
        && value.finalCombinedGateState !== 'unknown')
      || (value.nonRetryReason === 'NON_VISUAL_FAILURE'
        && (value.finalCombinedGateState !== 'unknown' || !allFinalDimensionsUnknown))
      || (['SOURCE_EVIDENCE_INSUFFICIENT', 'GEOMETRY_EVIDENCE_UNRELIABLE', 'DETAIL_CROP_AMBIGUOUS', 'NO_RETRYABLE_VISUAL_FAILURE']
        .includes(value.nonRetryReason as string)
        && value.finalCombinedGateState !== 'fail')
    ) return undefined
  } else if (terminal === 'authorized_pending') {
    if (
      !value.authorized
      || value.generationAttempts !== 0
      || value.evaluatorExecutions !== 0
      || value.completedAt !== undefined
      || value.finalCombinedGateState !== 'fail'
      || !pendingTargetsExactlyCoverFailedDimensions
      || (targets.includes('FRAMING')
        && !RETRYABLE_FRAMING_OUTCOMES.has(value.framingCorrectionOutcome as VisualFramingCorrectionOutcomeV01))
    ) return undefined
  } else {
    if (!value.authorized || value.completedAt === undefined || value.durationMs === undefined) return undefined
    if (terminal === 'execution_blocked') {
      if (
        value.generationAttempts !== 0
        || value.evaluatorExecutions !== 0
        || value.finalCombinedGateState !== 'unknown'
        || Object.values(value.finalDimensionStates).some((state) => state !== 'unknown')
      ) return undefined
    } else if (terminal === 'generation_failed') {
      if (
        (value.generationAttempts !== 0 && value.generationAttempts !== 1)
        || value.evaluatorExecutions !== 0
        || value.finalCombinedGateState !== 'unknown'
        || Object.values(value.finalDimensionStates).some((state) => state !== 'unknown')
      ) return undefined
    } else if (terminal === 'evaluation_failed') {
      if (
        value.generationAttempts !== 1
        || (value.evaluatorExecutions !== 0 && value.evaluatorExecutions !== 1)
        || value.finalCombinedGateState !== 'unknown'
        || value.finalDimensionStates.evaluator !== 'unknown'
      ) return undefined
    } else if (terminal === 'persistence_failed') {
      if (value.generationAttempts !== 1 || value.evaluatorExecutions !== 1 || value.finalCombinedGateState !== 'pass') return undefined
    } else if (
      value.generationAttempts !== 1
      || value.evaluatorExecutions !== 1
      || (terminal === 'retry_passed' && value.finalCombinedGateState !== 'pass')
      || (terminal === 'retry_failed' && value.finalCombinedGateState !== 'fail')
      || (terminal === 'retry_unknown' && value.finalCombinedGateState !== 'unknown')
    ) return undefined
  }

  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    jobId: value.jobId,
    slotId: value.slotId as SlotKey,
    decision: value.decision,
    authorized: value.authorized,
    targets: [...targets],
    normalizedFailureReasons: [...failures],
    nonRetryReason: value.nonRetryReason as VisualQualityRetryNonRetryReasonV01 | null,
    parentAttemptId: value.parentAttemptId,
    retryAttemptId: value.retryAttemptId as string | null,
    attemptOrdinal: value.attemptOrdinal,
    promptTemplateVersion: VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
    promptDigestScope: VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
    promptDigest: value.promptDigest as string | null,
    generationAttempts: value.generationAttempts,
    evaluatorExecutions: value.evaluatorExecutions,
    framingCorrectionOutcome: value.framingCorrectionOutcome as VisualFramingCorrectionOutcomeV01,
    finalDimensionStates: { ...value.finalDimensionStates },
    finalCombinedGateState: value.finalCombinedGateState,
    terminalOutcome: value.terminalOutcome as VisualQualityRetryTerminalOutcomeV01,
    ...(value.startedAt !== undefined ? { startedAt: value.startedAt as string } : {}),
    ...(value.completedAt !== undefined ? { completedAt: value.completedAt as string } : {}),
    ...(value.durationMs !== undefined ? { durationMs: value.durationMs as number } : {}),
  }
}

export function mergeVisualQualityRetrySlotV01<T>(params: {
  slots: readonly T[]
  slotId: SlotKey
  replacement: T
  slotKey: (slot: T) => SlotKey
}): T[] {
  let matches = 0
  const merged = params.slots.map((slot) => {
    if (params.slotKey(slot) !== params.slotId) return slot
    matches += 1
    return params.replacement
  })
  if (matches !== 1 || params.slotKey(params.replacement) !== params.slotId) {
    throw new Error(`Quality retry requires exactly one durable ${params.slotId} slot`)
  }
  return merged
}

export function isVisualQualityRetryGeometryReasonV01(value: unknown): value is VisualQualityRetryGeometryReasonV01 {
  return typeof value === 'string' && GEOMETRY_SET.has(value)
}
