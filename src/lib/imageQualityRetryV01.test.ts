import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  GENERATED_SCENES,
  GENERATED_SLOT_KEYS,
  type SlotKey,
} from './imageSlotContract'
import {
  buildVisualLockV01Context,
  buildVisualLockV01PromptFixture,
  VISUAL_LOCK_V01_PROFILE_VERSION,
} from './imageVisualLockV01'
import {
  buildProductIdentityAnchorV0,
  buildVisualLockV0PromptFixture,
} from './imageVisualLockV0'
import {
  VISUAL_QUALITY_RETRY_MAX_ATTEMPTS_PER_SLOT,
  VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
  VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
  VISUAL_QUALITY_RETRY_TARGET_ORDER,
  VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
  buildVisualQualityRetryDirectiveV01,
  buildVisualQualityRetryPromptV01,
  classifyVisualQualityRetryV01,
  createVisualQualityRetryEvidenceV01,
  digestVisualQualityRetryPromptV01,
  executeSingleVisualQualityRetryProviderV01,
  finalizeVisualQualityRetryEvidenceV01,
  hasSufficientSourceEvidenceForRetryV01,
  mergeVisualQualityRetrySlotV01,
  sanitizeVisualQualityRetryEvidenceV01,
  type VisualQualityRetryAuthorizedDecisionV01,
  type VisualQualityRetryClassifierInputV01,
  type VisualQualityRetryDimensionStatesV01,
} from './imageQualityRetryV01'

let passed = 0
const asyncChecks: Promise<void>[] = []

function check(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

async function checkAsync(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
    passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

const identityEvidence = {
  productClass: 'mesh slip-on sneaker',
  mainColor: 'light grey',
  material: 'matte mesh upper',
  toeShape: 'rounded toe',
  soleProfile: 'sculpted white sole with repeated cavities',
  heelProfile: 'closed heel with source-supported pull tab',
  closureType: 'elastic slip-on',
  distinctiveFeatures: 'instep patch, curved side overlay, toe cap, pull tab',
  constructionNotes: 'curved overlay seam and visible instep patch boundary',
  visualNotes: 'instep patch and curved overlay are the only ornaments; no visible metal hardware, laces, or eyelets; repeated sole cavity rhythm',
}

const loaferEvidence = {
  productClass: 'closed-back slip-on',
  mainColor: 'charcoal',
  accentColor: 'off-white',
  material: 'matte suede-like upper',
  toeShape: 'soft square-round toe',
  soleProfile: 'low flat sole',
  heelProfile: 'closed low heel',
  closureType: 'slip-on',
  distinctiveFeatures: 'continuous apron seam',
  constructionNotes: 'continuous apron seam with tonal stitching',
  visualNotes: 'low oval opening; no visible metal',
  colorAccents: ['off-white sole'],
}

const loaferFacts =
  'vamp proportions: long low vamp; opening shape: low oval opening; hardware: absent; ' +
  'ornament: stitched same-material motif; laces and eyelets: absent'

const context = buildVisualLockV01Context({ family: 'generic', identityEvidence })
const incompleteMaterialContext = buildVisualLockV01Context({
  family: 'generic',
  identityEvidence: {
    productClass: 'shoe',
    distinctiveFeatures: 'single source-supported upper panel',
  },
})

const allSufficientTargets = VISUAL_QUALITY_RETRY_TARGET_ORDER.filter((target) =>
  hasSufficientSourceEvidenceForRetryV01(context, target),
)

const passingDimensions: VisualQualityRetryDimensionStatesV01 = {
  evaluator: 'pass',
  color: 'pass',
  angle: 'pass',
  studio: 'pass',
  material: 'pass',
  topology: 'pass',
  framing: 'pass',
  geometry: 'pass',
}

type InputOverrides = Omit<Partial<VisualQualityRetryClassifierInputV01>, 'dimensions'> & {
  dimensions?: Partial<VisualQualityRetryDimensionStatesV01>
}

function classifierInput(overrides: InputOverrides = {}): VisualQualityRetryClassifierInputV01 {
  const base: VisualQualityRetryClassifierInputV01 = {
    profileVersion: VISUAL_LOCK_V01_PROFILE_VERSION,
    slotId: 'side',
    attemptOrdinal: 1,
    qualityRetryCount: 0,
    jobState: 'ready',
    packState: 'recoverable',
    lineageState: 'certain',
    persistenceState: 'certain',
    duplicateDeliveryState: 'clear',
    requestedSlotCount: 5,
    durableSlotCount: 5,
    providerCandidateCount: 1,
    evaluatorExecutionCount: 1,
    candidateProduced: true,
    combinedGateState: 'pass',
    dimensions: passingDimensions,
    evaluatorReasonCodes: [],
    topologyReasonCodes: [],
    materialReasonCodes: [],
    framingOutcome: 'not_required',
    framingReasonCodes: ['geometry_already_compliant'],
    geometryReasonCodes: [],
    geometryReliable: true,
    detailCropEvidence: 'not_applicable',
    sourceEvidenceSufficientTargets: allSufficientTargets,
  }
  return {
    ...base,
    ...overrides,
    dimensions: { ...base.dimensions, ...overrides.dimensions },
  }
}

function failureInput(
  dimension: 'angle' | 'studio' | 'material' | 'topology',
  overrides: InputOverrides = {},
): VisualQualityRetryClassifierInputV01 {
  const materialReasonCodes = overrides.materialReasonCodes ?? ['MATERIAL_ZONE_DRIFT']
  const topologyReasonCodes = overrides.topologyReasonCodes ?? ['COMPONENT_SHAPE_DRIFT']
  const evaluatorReasonCodes = dimension === 'angle'
    ? ['orientation_failed']
    : dimension === 'studio'
      ? ['studio_failed']
      : dimension === 'material'
        ? ['material_fidelity_failed', ...materialReasonCodes]
        : ['component_topology_failed', ...topologyReasonCodes]
  return classifierInput({
    combinedGateState: 'fail',
    dimensions: { evaluator: 'fail', [dimension]: 'fail' },
    ...(dimension === 'material' ? { materialReasonCodes } : {}),
    ...(dimension === 'topology' ? { topologyReasonCodes } : {}),
    evaluatorReasonCodes,
    ...overrides,
    dimensions: {
      evaluator: 'fail',
      [dimension]: 'fail',
      ...overrides.dimensions,
    },
    evaluatorReasonCodes: overrides.evaluatorReasonCodes ?? evaluatorReasonCodes,
  })
}

function framingFailureInput(overrides: InputOverrides = {}): VisualQualityRetryClassifierInputV01 {
  return classifierInput({
    combinedGateState: 'fail',
    dimensions: { framing: 'fail', geometry: 'fail' },
    framingOutcome: 'unsafe_existing_clipping',
    framingReasonCodes: ['existing_edge_clipping'],
    geometryReasonCodes: ['clipping_detected'],
    ...overrides,
    dimensions: { framing: 'fail', geometry: 'fail', ...overrides.dimensions },
  })
}

function requireAuthorized(input: VisualQualityRetryClassifierInputV01): VisualQualityRetryAuthorizedDecisionV01 {
  const decision = classifyVisualQualityRetryV01(input)
  assert.equal(decision.authorized, true)
  assert.equal(decision.decision, 'retry_authorized')
  assert.ok(decision.targets.length > 0)
  return decision as VisualQualityRetryAuthorizedDecisionV01
}

function deniedReason(input: VisualQualityRetryClassifierInputV01): string | null {
  const decision = classifyVisualQualityRetryV01(input)
  assert.equal(decision.authorized, false)
  assert.equal(decision.decision, 'retry_not_authorized')
  assert.deepEqual(decision.targets, [])
  return decision.nonRetryReason
}

const PARENT_ATTEMPT_ID = 'iga_11111111-1111-4111-8111-111111111111'
const RETRY_ATTEMPT_ID = 'iga_22222222-2222-4222-8222-222222222222'
const FINISHED_AT = '2026-08-02T08:05:00.000Z'

check('1 passing slot receives no quality retry', () => {
  assert.equal(deniedReason(classifierInput()), 'SLOT_ALREADY_PASSING')
})

check('2 successfully framing-corrected passing slot receives no retry', () => {
  assert.equal(deniedReason(classifierInput({
    framingOutcome: 'applied',
    framingReasonCodes: ['framing_correction_applied'],
  })), 'FRAMING_CORRECTION_ALREADY_PASSED')
})

check('3 explicit angle failure receives exactly one slot-specific retry', () => {
  const decision = requireAuthorized(failureInput('angle', { slotId: 'back' }))
  assert.equal(decision.slotId, 'back')
  assert.deepEqual(decision.targets, ['ANGLE'])
  assert.deepEqual(decision.normalizedFailureReasons, ['ANGLE_FAIL'])
})

check('4 explicit studio failure receives exactly one retry', () => {
  const decision = requireAuthorized(failureInput('studio'))
  assert.deepEqual(decision.targets, ['STUDIO'])
})

check('5 explicit material failure receives exactly one retry', () => {
  const decision = requireAuthorized(failureInput('material'))
  assert.deepEqual(decision.targets, ['MATERIAL'])
})

check('6 explicit topology failure receives exactly one retry', () => {
  const decision = requireAuthorized(failureInput('topology'))
  assert.deepEqual(decision.targets, ['TOPOLOGY'])
})

check('7 reliable uncorrectable framing failure receives exactly one retry', () => {
  const decision = requireAuthorized(framingFailureInput())
  assert.deepEqual(decision.targets, ['FRAMING'])
})

check('8 product-count drift receives one product-count/topology-directed retry', () => {
  const decision = requireAuthorized(failureInput('topology', {
    topologyReasonCodes: ['PRODUCT_COUNT_DRIFT'],
  }))
  assert.deepEqual(decision.targets, ['PRODUCT_COUNT'])
  const directive = buildVisualQualityRetryDirectiveV01({ context, decision })
  assert.match(directive, /COMPONENT TOPOLOGY CONTRACT VERSION:/)
  assert.match(directive, /PRODUCT COUNT CORRECTION: render exactly one/)
  assert.doesNotMatch(directive, /PRESERVE EVERY PASSING DIMENSION:[^\n]*topology/i)
})

check('9 multiple retryable failures produce one combined retry', () => {
  const decision = requireAuthorized(classifierInput({
    combinedGateState: 'fail',
    dimensions: {
      evaluator: 'fail',
      angle: 'fail',
      studio: 'fail',
      material: 'fail',
      topology: 'fail',
      framing: 'fail',
      geometry: 'fail',
    },
    evaluatorReasonCodes: [
      'component_topology_failed',
      'orientation_failed',
      'studio_failed',
      'material_fidelity_failed',
      'COMPONENT_RELOCATION',
      'PRODUCT_COUNT_DRIFT',
      'UNSUPPORTED_MATERIAL_ADDITION',
      'MATERIAL_ZONE_DRIFT',
    ],
    materialReasonCodes: ['UNSUPPORTED_MATERIAL_ADDITION', 'MATERIAL_ZONE_DRIFT'],
    topologyReasonCodes: ['COMPONENT_RELOCATION', 'PRODUCT_COUNT_DRIFT'],
    framingOutcome: 'transform_outside_allowed_bounds',
    framingReasonCodes: ['required_scale_above_1_15'],
    geometryReasonCodes: ['occupancy_below_72'],
  }))
  assert.deepEqual(decision.targets, VISUAL_QUALITY_RETRY_TARGET_ORDER)
  assert.equal(decision.attemptOrdinal, 1)
  assert.equal(VISUAL_QUALITY_RETRY_MAX_ATTEMPTS_PER_SLOT, 2)
})

check('10 combined corrective sections are deduplicated and stable', () => {
  const input = classifierInput({
    combinedGateState: 'fail',
    dimensions: { evaluator: 'fail', angle: 'fail', topology: 'fail' },
    evaluatorReasonCodes: [
      'component_topology_failed',
      'orientation_failed',
      'COMPONENT_RELOCATION',
      'PRODUCT_COUNT_DRIFT',
    ],
    topologyReasonCodes: ['COMPONENT_RELOCATION', 'PRODUCT_COUNT_DRIFT'],
  })
  const decision = requireAuthorized(input)
  const rebuiltDecision = requireAuthorized({
    ...input,
    topologyReasonCodes: ['PRODUCT_COUNT_DRIFT', 'COMPONENT_RELOCATION'],
  })
  const shuffled = { ...decision, targets: [...decision.targets].reverse() } as VisualQualityRetryAuthorizedDecisionV01
  const canonical = buildVisualQualityRetryDirectiveV01({ context, decision })
  const rebuilt = buildVisualQualityRetryDirectiveV01({ context, decision: rebuiltDecision })
  assert.equal(rebuilt, canonical)
  assert.throws(() => buildVisualQualityRetryDirectiveV01({ context, decision: shuffled }))
  assert.equal(canonical.match(/COMPONENT TOPOLOGY CONTRACT VERSION:/g)?.length, 1)
  assert.ok(canonical.indexOf('ANGLE CONTRACT VERSION:') < canonical.indexOf('COMPONENT TOPOLOGY CONTRACT VERSION:'))
  assert.ok(canonical.indexOf('COMPONENT TOPOLOGY CONTRACT VERSION:') < canonical.indexOf('PRODUCT COUNT CORRECTION:'))
})

check('11 retry instruction explicitly preserves every passing dimension', () => {
  const decision = requireAuthorized(failureInput('angle'))
  const directive = buildVisualQualityRetryDirectiveV01({ context, decision })
  assert.match(directive, /PRESERVE EVERY PASSING DIMENSION:/)
  for (const passing of ['color', 'studio', 'material', 'topology', 'framing', 'geometry', 'product count']) {
    assert.match(directive.toLowerCase(), new RegExp(`\\b${passing.replace(' ', '\\s+')}\\b`))
  }
})

check('12 evaluator prose and arbitrary provider text never enter retry prompt', () => {
  const decision = {
    ...requireAuthorized(failureInput('studio')),
    evaluatorProse: 'RAW_EVALUATOR_PROSE_DO_NOT_COPY',
    providerMessage: 'RAW_PROVIDER_MESSAGE_DO_NOT_COPY',
  } as VisualQualityRetryAuthorizedDecisionV01 & { evaluatorProse: string; providerMessage: string }
  const prompt = buildVisualQualityRetryPromptV01({ basePrompt: 'CANONICAL_BASE', context, decision })
  assert.ok(prompt.startsWith('CANONICAL_BASE'))
  assert.doesNotMatch(prompt, /RAW_EVALUATOR_PROSE_DO_NOT_COPY|RAW_PROVIDER_MESSAGE_DO_NOT_COPY/)
})

check('13 any blocking unknown prevents quality retry', () => {
  for (const dimension of Object.keys(passingDimensions) as Array<keyof VisualQualityRetryDimensionStatesV01>) {
    const evaluatorDimension = ['color', 'angle', 'studio', 'material', 'topology'].includes(dimension)
    assert.equal(deniedReason(classifierInput({
      combinedGateState: 'unknown',
      dimensions: dimension === 'evaluator'
        ? { evaluator: 'unknown', angle: 'unknown' }
        : {
            [dimension]: 'unknown',
            ...(evaluatorDimension ? { evaluator: 'unknown' as const } : {}),
          },
    })), 'BLOCKING_DIMENSION_UNKNOWN')
  }
  assert.equal(deniedReason(classifierInput({
    combinedGateState: 'unknown',
    dimensions: { evaluator: 'unknown', angle: 'unknown' },
  })), 'BLOCKING_DIMENSION_UNKNOWN')
})

check('14 insufficient source evidence prevents retry', () => {
  assert.equal(hasSufficientSourceEvidenceForRetryV01(incompleteMaterialContext, 'MATERIAL'), false)
  assert.equal(deniedReason(failureInput('material', {
    sourceEvidenceSufficientTargets: allSufficientTargets.filter((target) => target !== 'MATERIAL'),
  })), 'SOURCE_EVIDENCE_INSUFFICIENT')
})

check('15 malformed partial missing unsupported or errored evaluator evidence remains unknown', () => {
  for (const dimension of ['angle', 'studio', 'material', 'topology'] as const) {
    assert.equal(deniedReason(classifierInput({
      combinedGateState: 'unknown',
      dimensions: { evaluator: 'unknown', [dimension]: 'unknown' },
    })), 'BLOCKING_DIMENSION_UNKNOWN')
  }
  assert.equal(deniedReason(failureInput('angle', { evaluatorExecutionCount: 0 })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', {
    evaluatorReasonCodes: ['orientation_failed', 'provider wrote arbitrary prose'],
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', {
    dimensions: { evaluator: 'pass' },
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('material', {
    evaluatorReasonCodes: ['MATERIAL_ZONE_DRIFT'],
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('topology', {
    evaluatorReasonCodes: ['component_topology_failed'],
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', {
    framingOutcome: 'unsafe_existing_clipping',
    framingReasonCodes: ['existing_edge_clipping'],
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', {
    geometryReasonCodes: ['occupancy_below_72'],
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', { qualityRetryCount: -2 })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', {
    requestedSlotCount: 4.5,
    durableSlotCount: 4.5,
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', {
    geometryReliable: 'yes' as unknown as boolean,
  })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
})

check('16 missing or unreliable geometry prevents framing retry', () => {
  assert.equal(deniedReason(framingFailureInput({ geometryReliable: false })), 'GEOMETRY_EVIDENCE_UNRELIABLE')
  assert.equal(deniedReason(framingFailureInput({ geometryReasonCodes: [] })), 'GEOMETRY_EVIDENCE_UNRELIABLE')
  assert.equal(deniedReason(failureInput('angle', {
    dimensions: { geometry: 'fail' },
    geometryReasonCodes: ['occupancy_below_72'],
  })), 'NO_RETRYABLE_VISUAL_FAILURE')
})

check('17 persistence lineage and duplicate-delivery uncertainty prevent retry', () => {
  assert.equal(deniedReason(failureInput('angle', { persistenceState: 'uncertain' })), 'PERSISTENCE_UNCERTAIN')
  assert.equal(deniedReason(failureInput('angle', { lineageState: 'uncertain' })), 'LINEAGE_UNCERTAIN')
  assert.equal(deniedReason(failureInput('angle', { requestedSlotCount: 5, durableSlotCount: 4 })), 'LINEAGE_UNCERTAIN')
  assert.equal(deniedReason(failureInput('angle', { duplicateDeliveryState: 'uncertain' })), 'DUPLICATE_DELIVERY_UNCERTAIN')
  assert.equal(deniedReason(failureInput('angle', { providerCandidateCount: 2 })), 'DUPLICATE_DELIVERY_UNCERTAIN')
  assert.equal(deniedReason(failureInput('angle', { packState: 'unrecoverable' })), 'PACK_ALREADY_UNRECOVERABLE')
})

check('18 a retry attempt never receives another quality retry', () => {
  assert.equal(deniedReason(failureInput('angle', { attemptOrdinal: 2 })), 'QUALITY_RETRY_BUDGET_EXHAUSTED')
  assert.equal(deniedReason(failureInput('angle', { qualityRetryCount: 1 })), 'QUALITY_RETRY_BUDGET_EXHAUSTED')
})

check('19 maximum quality-generation attempts are two per slot', () => {
  assert.equal(VISUAL_QUALITY_RETRY_MAX_ATTEMPTS_PER_SLOT, 2)
  assert.equal(requireAuthorized(failureInput('angle')).attemptOrdinal + 1, 2)
  assert.equal(deniedReason(failureInput('angle', { attemptOrdinal: 3 })), 'QUALITY_RETRY_BUDGET_EXHAUSTED')
})

check('20 evaluator executes no more than once per attempt', () => {
  assert.equal(deniedReason(failureInput('angle', { evaluatorExecutionCount: 0 })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(deniedReason(failureInput('angle', { evaluatorExecutionCount: 2 })), 'EVALUATOR_EVIDENCE_INCOMPLETE')
  assert.equal(requireAuthorized(failureInput('angle', { evaluatorExecutionCount: 1 })).authorized, true)
})

check('21 a failed retry is terminal and cannot create a third attempt', () => {
  const decision = requireAuthorized(failureInput('angle'))
  const promptDigest = digestVisualQualityRetryPromptV01(buildVisualQualityRetryPromptV01({ basePrompt: 'BASE', context, decision }))
  const created = createVisualQualityRetryEvidenceV01({
    decision,
    jobId: 434,
    parentAttemptId: PARENT_ATTEMPT_ID,
    retryAttemptId: RETRY_ATTEMPT_ID,
    promptDigest,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: failureInput('angle').dimensions,
    finalCombinedGateState: 'fail',
  })
  const failed = finalizeVisualQualityRetryEvidenceV01(created, {
    terminalOutcome: 'retry_failed',
    generationAttempts: 1,
    evaluatorExecutions: 1,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: failureInput('angle').dimensions,
    finalCombinedGateState: 'fail',
    completedAt: FINISHED_AT,
    durationMs: 250,
  })
  assert.equal(failed.terminalOutcome, 'retry_failed')
  assert.equal(deniedReason(failureInput('angle', { attemptOrdinal: 2, qualityRetryCount: 1 })), 'QUALITY_RETRY_BUDGET_EXHAUSTED')
})

check('22 retry infrastructure failure is terminal without a third attempt', () => {
  const decision = requireAuthorized(failureInput('studio'))
  const created = createVisualQualityRetryEvidenceV01({
    decision,
    jobId: 434,
    parentAttemptId: PARENT_ATTEMPT_ID,
    retryAttemptId: RETRY_ATTEMPT_ID,
    promptDigest: 'a'.repeat(64),
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: failureInput('studio').dimensions,
    finalCombinedGateState: 'fail',
  })
  const failed = finalizeVisualQualityRetryEvidenceV01(created, {
    terminalOutcome: 'generation_failed',
    generationAttempts: 1,
    evaluatorExecutions: 0,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: {
      evaluator: 'unknown',
      color: 'unknown',
      angle: 'unknown',
      studio: 'unknown',
      material: 'unknown',
      topology: 'unknown',
      framing: 'unknown',
      geometry: 'unknown',
    },
    finalCombinedGateState: 'unknown',
    completedAt: FINISHED_AT,
    durationMs: 100,
  })
  assert.equal(failed.terminalOutcome, 'generation_failed')
  assert.equal(failed.evaluatorExecutions, 0)
  const blocked = finalizeVisualQualityRetryEvidenceV01(created, {
    terminalOutcome: 'execution_blocked',
    generationAttempts: 0,
    evaluatorExecutions: 0,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: {
      evaluator: 'unknown',
      color: 'unknown',
      angle: 'unknown',
      studio: 'unknown',
      material: 'unknown',
      topology: 'unknown',
      framing: 'unknown',
      geometry: 'unknown',
    },
    finalCombinedGateState: 'unknown',
    completedAt: FINISHED_AT,
    durationMs: 50,
  })
  assert.equal(blocked.terminalOutcome, 'execution_blocked')
  assert.equal(blocked.generationAttempts, 0)
  assert.equal(deniedReason(failureInput('studio', { attemptOrdinal: 2 })), 'QUALITY_RETRY_BUDGET_EXHAUSTED')
})

asyncChecks.push(checkAsync('22a provider execution records only actual one-shot generation candidate and evaluator events', async () => {
  let providerCalls = 0
  let evaluatorCalls = 0
  const successful = await executeSingleVisualQualityRetryProviderV01(async (execution) => {
    execution.onGenerationCallStarted()
    providerCalls += 1
    execution.onCandidateProduced()
    execution.onEvaluatorCallStarted()
    evaluatorCalls += 1
    return 'candidate'
  })
  assert.equal(successful.ok, true)
  assert.deepEqual(successful.usage, {
    generationCalls: 1,
    candidatesProduced: 1,
    evaluatorCalls: 1,
  })
  assert.equal(providerCalls, 1)
  assert.equal(evaluatorCalls, 1)

  const preCallFailure = await executeSingleVisualQualityRetryProviderV01(async () => {
    throw new Error('local pre-call setup failed')
  })
  assert.equal(preCallFailure.ok, false)
  assert.deepEqual(preCallFailure.usage, {
    generationCalls: 0,
    candidatesProduced: 0,
    evaluatorCalls: 0,
  })

  let secondProviderCallReached = false
  const duplicate = await executeSingleVisualQualityRetryProviderV01(async (execution) => {
    execution.onGenerationCallStarted()
    execution.onGenerationCallStarted()
    secondProviderCallReached = true
    return 'impossible'
  })
  assert.equal(duplicate.ok, false)
  assert.equal(secondProviderCallReached, false)
  assert.deepEqual(duplicate.usage, {
    generationCalls: 1,
    candidatesProduced: 0,
    evaluatorCalls: 0,
  })
}))

type SyntheticSlot = { slotId: SlotKey; bytes: object; status: 'pass' | 'fail' }
const originalSlots: SyntheticSlot[] = GENERATED_SLOT_KEYS.map((slotId) => ({
  slotId,
  bytes: { slotId },
  status: slotId === 'top' ? 'fail' : 'pass',
}))
const retryTop: SyntheticSlot = { slotId: 'top', bytes: { retry: true }, status: 'pass' }

check('23 passing slots remain byte/reference-identical and are not regenerated', () => {
  const merged = mergeVisualQualityRetrySlotV01({ slots: originalSlots, slotId: 'top', replacement: retryTop, slotKey: (slot) => slot.slotId })
  for (const slotId of ['side', 'hero_3q', 'back', 'detail'] as SlotKey[]) {
    assert.strictEqual(merged.find((slot) => slot.slotId === slotId), originalSlots.find((slot) => slot.slotId === slotId))
  }
})

check('24 failed slot retains its durable semantic identity', () => {
  const merged = mergeVisualQualityRetrySlotV01({ slots: originalSlots, slotId: 'top', replacement: retryTop, slotKey: (slot) => slot.slotId })
  assert.strictEqual(merged[2], retryTop)
  assert.equal(merged[2].slotId, 'top')
  assert.throws(() => mergeVisualQualityRetrySlotV01({
    slots: originalSlots,
    slotId: 'top',
    replacement: { ...retryTop, slotId: 'back' },
    slotKey: (slot) => slot.slotId,
  }))
})

check('25 partial results cannot compact or mislabel later slots', () => {
  const merged = mergeVisualQualityRetrySlotV01({ slots: originalSlots, slotId: 'top', replacement: retryTop, slotKey: (slot) => slot.slotId })
  assert.strictEqual(merged[3], originalSlots[3])
  assert.equal(merged[3].slotId, 'back')
  assert.strictEqual(merged[4], originalSlots[4])
  assert.equal(merged[4].slotId, 'detail')
  assert.throws(() => mergeVisualQualityRetrySlotV01({
    slots: originalSlots.filter((slot) => slot.slotId !== 'top'),
    slotId: 'top',
    replacement: retryTop,
    slotKey: (slot) => slot.slotId,
  }))
})

check('26 canonical five-slot ordering remains exact after retry', () => {
  const merged = mergeVisualQualityRetrySlotV01({ slots: originalSlots, slotId: 'top', replacement: retryTop, slotKey: (slot) => slot.slotId })
  assert.deepEqual(merged.map((slot) => slot.slotId), GENERATED_SLOT_KEYS)
})

check('27 detail preserves intentional material-crop semantics', () => {
  const decision = requireAuthorized(failureInput('material', {
    slotId: 'detail',
    dimensions: { geometry: 'pass', framing: 'pass' },
    framingOutcome: 'not_required',
    framingReasonCodes: ['detail_slot_exempt'],
    geometryReasonCodes: [],
    geometryReliable: false,
    detailCropEvidence: 'ambiguous_intentional_crop',
  }))
  const directive = buildVisualQualityRetryDirectiveV01({ context, decision })
  assert.match(directive, /preserve the existing material_detail crop/i)
  assert.match(directive, /never convert the detail into a hardware, logo, ornament, or branding close-up/i)
  assert.doesNotMatch(directive, /FRAMING CORRECTION:.*complete product/i)
})

check('28 detail crop exception cannot leak to a full-product slot', () => {
  const ambiguousDetailFraming = classifierInput({
    slotId: 'detail',
    combinedGateState: 'fail',
    dimensions: { framing: 'fail', geometry: 'pass' },
    framingOutcome: 'unsafe_existing_clipping',
    framingReasonCodes: ['existing_edge_clipping'],
    geometryReasonCodes: [],
    geometryReliable: false,
    detailCropEvidence: 'ambiguous_intentional_crop',
  })
  assert.equal(deniedReason(ambiguousDetailFraming), 'DETAIL_CROP_AMBIGUOUS')
  const reliableDetailDecision = requireAuthorized({
    ...ambiguousDetailFraming,
    detailCropEvidence: 'reliable_crop_local_defect',
  })
  const detailDirective = buildVisualQualityRetryDirectiveV01({ context, decision: reliableDetailDecision })
  assert.match(detailDirective, /preserve the intentional material_detail crop/i)
  assert.match(detailDirective, /Do not reveal the whole shoe/i)
  const sideDecision = requireAuthorized(framingFailureInput({ slotId: 'side' }))
  const sideDirective = buildVisualQualityRetryDirectiveV01({ context, decision: sideDecision })
  assert.match(sideDirective, /complete product inside the canvas/)
  assert.doesNotMatch(sideDirective, /Do not reveal the whole shoe/)
})

check('29 decision and parent-child retry evidence persist through JSON metadata', () => {
  const decision = requireAuthorized(failureInput('angle', { slotId: 'back' }))
  const prompt = buildVisualQualityRetryPromptV01({ basePrompt: 'BASE', context, decision })
  const evidence = createVisualQualityRetryEvidenceV01({
    decision,
    jobId: 434,
    parentAttemptId: PARENT_ATTEMPT_ID,
    retryAttemptId: RETRY_ATTEMPT_ID,
    promptDigest: digestVisualQualityRetryPromptV01(prompt),
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: failureInput('angle').dimensions,
    finalCombinedGateState: 'fail',
    startedAt: '2026-08-02T08:00:00.000Z',
  })
  const finalized = finalizeVisualQualityRetryEvidenceV01(evidence, {
    terminalOutcome: 'retry_passed',
    generationAttempts: 1,
    evaluatorExecutions: 1,
    framingCorrectionOutcome: 'applied',
    finalDimensionStates: passingDimensions,
    finalCombinedGateState: 'pass',
    completedAt: FINISHED_AT,
    durationMs: 300000,
  })
  const roundTrip = sanitizeVisualQualityRetryEvidenceV01(JSON.parse(JSON.stringify(finalized)))
  assert.ok(roundTrip)
  assert.equal(roundTrip.version, VISUAL_QUALITY_RETRY_POLICY_V01_VERSION)
  assert.equal(roundTrip.parentAttemptId, PARENT_ATTEMPT_ID)
  assert.equal(roundTrip.retryAttemptId, RETRY_ATTEMPT_ID)
  assert.equal(roundTrip.attemptOrdinal, 2)
  assert.equal(roundTrip.promptDigestScope, VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01)
  assert.equal(roundTrip.slotId, 'back')
  assert.deepEqual(roundTrip.targets, ['ANGLE'])
  assert.equal(roundTrip.terminalOutcome, 'retry_passed')
})

check('30 persisted retry evidence is strictly sanitized and contradiction-closed', () => {
  const decision = requireAuthorized(failureInput('angle'))
  const pending = createVisualQualityRetryEvidenceV01({
    decision,
    jobId: 434,
    parentAttemptId: PARENT_ATTEMPT_ID,
    retryAttemptId: RETRY_ATTEMPT_ID,
    promptDigest: 'b'.repeat(64),
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: failureInput('angle').dimensions,
    finalCombinedGateState: 'fail',
  })
  assert.ok(sanitizeVisualQualityRetryEvidenceV01(pending))
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...pending,
    finalDimensionStates: passingDimensions,
    finalCombinedGateState: 'pass',
  }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...pending,
    finalDimensionStates: { ...pending.finalDimensionStates, evaluator: 'pass' },
  }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...pending,
    finalDimensionStates: { ...pending.finalDimensionStates, studio: 'fail' },
  }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...pending,
    finalDimensionStates: { ...pending.finalDimensionStates, color: 'fail' },
  }), undefined)
  const valid = finalizeVisualQualityRetryEvidenceV01(pending, {
    terminalOutcome: 'retry_passed',
    generationAttempts: 1,
    evaluatorExecutions: 1,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: passingDimensions,
    finalCombinedGateState: 'pass',
    completedAt: FINISHED_AT,
    durationMs: 10,
  })
  assert.ok(sanitizeVisualQualityRetryEvidenceV01(valid))
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({ ...valid, providerRaw: 'secret provider prose' }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({ ...valid, promptDigestScope: 'full-provider-prompt/v1' }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({ ...valid, framingCorrectionOutcome: 'provider said maybe' }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({ ...valid, normalizedFailureReasons: ['MATERIAL_FAIL'] }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({ ...valid, terminalOutcome: 'retry_passed', finalCombinedGateState: 'fail' }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({ ...valid, generationAttempts: 0, evaluatorExecutions: 0 }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...valid,
    framingCorrectionOutcome: 'unsafe_existing_clipping',
  }), undefined)

  const notAuthorized = createVisualQualityRetryEvidenceV01({
    decision: classifyVisualQualityRetryV01(classifierInput()),
    jobId: 434,
    parentAttemptId: PARENT_ATTEMPT_ID,
    retryAttemptId: null,
    promptDigest: null,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: passingDimensions,
    finalCombinedGateState: 'pass',
  })
  assert.ok(sanitizeVisualQualityRetryEvidenceV01(notAuthorized))
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...notAuthorized,
    normalizedFailureReasons: ['ANGLE_FAIL'],
  }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...notAuthorized,
    finalDimensionStates: failureInput('angle').dimensions,
    finalCombinedGateState: 'fail',
  }), undefined)
  assert.equal(sanitizeVisualQualityRetryEvidenceV01({
    ...notAuthorized,
    nonRetryReason: 'NON_VISUAL_FAILURE',
  }), undefined)
  assert.ok(sanitizeVisualQualityRetryEvidenceV01({
    ...notAuthorized,
    nonRetryReason: 'NON_VISUAL_FAILURE',
    framingCorrectionOutcome: 'insufficient_geometry_evidence',
    finalDimensionStates: {
      evaluator: 'unknown',
      color: 'unknown',
      angle: 'unknown',
      studio: 'unknown',
      material: 'unknown',
      topology: 'unknown',
      framing: 'unknown',
      geometry: 'unknown',
    },
    finalCombinedGateState: 'unknown',
  }))
})

const moduleSource = readFileSync(new URL('./imageQualityRetryV01.ts', import.meta.url), 'utf8')

check('31 no deletion or automatic Media cleanup is introduced', () => {
  assert.doesNotMatch(moduleSource, /\.(?:delete|unlink|rm)\s*\(/)
  assert.doesNotMatch(moduleSource, /(?:deleteMedia|deleteBlob|physicalDelete|cleanupWorker)/i)
})

check('32 no automatic approval attachment publishing Shopier or dispatch action is introduced', () => {
  assert.doesNotMatch(moduleSource, /(?:autoApprove|generativeGallery|queueShopier|publishProduct|dispatchExternally|sendTelegram)/)
  assert.doesNotMatch(moduleSource, /payload\.(?:create|update|delete)|fetch\s*\(/)
})

check('33 default and Visual Lock V0 behavior remain compatible', () => {
  assert.equal(deniedReason(failureInput('angle', { profileVersion: 'visual-lock/v0' })), 'PROFILE_NOT_V0_1')
  assert.equal(deniedReason(failureInput('angle', { profileVersion: 'default' })), 'PROFILE_NOT_V0_1')
  assert.match(moduleSource, /profileVersion !== VISUAL_LOCK_V01_PROFILE_VERSION/)
})

check('34 all three initial-attempt prompt digests remain unchanged', () => {
  const defaultDigest = createHash('sha256')
    .update(JSON.stringify(GENERATED_SCENES.map((scene) => scene.sceneInstructions)))
    .digest('hex')
  const v0Digest = createHash('sha256')
    .update(JSON.stringify(buildVisualLockV0PromptFixture(buildProductIdentityAnchorV0({
      family: 'loafer',
      identityEvidence: loaferEvidence,
      operatorVisualFacts: loaferFacts,
    }))))
    .digest('hex')
  const v01Digest = createHash('sha256')
    .update(JSON.stringify(buildVisualLockV01PromptFixture(context)))
    .digest('hex')
  assert.equal(defaultDigest, '4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810')
  assert.equal(v0Digest, 'f6d25f7e4980c731c9e191bd6bfd7f9ee3ae104ac927f67bdb64ac77ae00238d')
  assert.equal(v01Digest, 'e8c1becfcb7d04528a22cdb40584088b0b455589170a3c6bb1376ef05eccdb47')
})

check('35 representative retry template and prompt digests are pinned', () => {
  const decision = requireAuthorized(classifierInput({
    combinedGateState: 'fail',
    dimensions: { evaluator: 'fail', angle: 'fail', material: 'fail', topology: 'fail' },
    evaluatorReasonCodes: [
      'component_topology_failed',
      'orientation_failed',
      'material_fidelity_failed',
      'COMPONENT_RELOCATION',
      'PRODUCT_COUNT_DRIFT',
      'MATERIAL_ZONE_DRIFT',
    ],
    materialReasonCodes: ['MATERIAL_ZONE_DRIFT'],
    topologyReasonCodes: ['COMPONENT_RELOCATION', 'PRODUCT_COUNT_DRIFT'],
  }))
  const directive = buildVisualQualityRetryDirectiveV01({ context, decision })
  const prompt = buildVisualQualityRetryPromptV01({ basePrompt: 'PINNED_V0.1_BASE_PROMPT', context, decision })
  assert.equal(digestVisualQualityRetryPromptV01(directive), '4f5804058213f09b087b4043aaf5fc21b7e3dce52540a5d6684bd6580cdc152e')
  assert.equal(digestVisualQualityRetryPromptV01(prompt), '089781a84f25b046d5bcc8ab25f54f3e08fb6b85323b2bc22289fbd593f8019d')
  assert.equal(VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION, 'visual-quality-retry-template/v1')
})

check('36 retry layer reuses canonical evaluator angle studio material topology framing and slot contracts', () => {
  for (const symbol of [
    'buildVisualLockV01AngleContractPrompt',
    'buildVisualLockV01StudioContractPrompt',
    'buildVisualLockV01MaterialContractPrompt',
    'buildVisualLockV01ComponentTopologyContractPrompt',
    'VISUAL_LOCK_V01_FRAMING_TARGETS',
    'VISUAL_LOCK_V01_FRAMING_CORRECTION_LIMITS',
    'GENERATED_SLOT_KEYS',
  ]) assert.match(moduleSource, new RegExp(`\\b${symbol}\\b`))
  assert.deepEqual(VISUAL_QUALITY_RETRY_TARGET_ORDER, ['ANGLE', 'STUDIO', 'MATERIAL', 'TOPOLOGY', 'FRAMING', 'PRODUCT_COUNT'])
})

void Promise.all(asyncChecks).then(() => {
  if (!process.exitCode) console.log(`\n${passed} image quality retry V0.1 checks passed`)
})
