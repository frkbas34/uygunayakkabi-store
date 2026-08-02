import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  adaptLegacyProviderOutput,
  areGenerationAttemptHistoriesSemanticallyEqual,
  buildImageGenerationPackSelection,
  createImageGenerationAttempt,
  finishImageGenerationAttempt,
  parseGenerationAttemptHistory,
  persistGeneratedSlotEnvelopes,
  projectLegacySlots,
  requestedSlotIdsForStage,
  resolveApprovalCandidates,
  safeImageFailureSummary,
  selectApprovalMediaIds,
  serializeSlotEnvelopes,
  upsertGenerationAttemptHistory,
  validateImageGenerationPackSelection,
  validateImageSlotRegistry,
} from './imageGenerationContracts'
import {
  VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
  VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
  VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
  type VisualQualityRetryEvidenceV01,
} from './imageQualityRetryV01'
import {
  GENERATED_SCENES,
  IMAGE_SLOT_CONTRACT_VERSION,
  IMAGE_SLOT_REGISTRY,
  SLOT_PROMPT_VERSION,
} from './imageSlotContract'

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed += 1
    console.log(`✓ ${name}`)
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(error)
    process.exitCode = 1
  }
}

const fiveSlotIds = requestedSlotIdsForStage('standard')

const retryRootAttemptId = 'iga_11111111-1111-4111-8111-111111111111' as const
const retryChildAttemptId = 'iga_22222222-2222-4222-8222-222222222222' as const

function passingRetryEvidence(): VisualQualityRetryEvidenceV01 {
  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    jobId: 'retry-job',
    slotId: 'top',
    decision: 'retry_authorized',
    authorized: true,
    targets: ['ANGLE', 'STUDIO'],
    normalizedFailureReasons: ['ANGLE_FAIL', 'STUDIO_FAIL'],
    nonRetryReason: null,
    parentAttemptId: retryRootAttemptId,
    retryAttemptId: retryChildAttemptId,
    attemptOrdinal: 2,
    promptTemplateVersion: VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
    promptDigestScope: VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
    promptDigest: 'a'.repeat(64),
    generationAttempts: 1,
    evaluatorExecutions: 1,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: {
      evaluator: 'pass',
      color: 'pass',
      angle: 'pass',
      studio: 'pass',
      material: 'pass',
      topology: 'pass',
      framing: 'pass',
      geometry: 'pass',
    },
    finalCombinedGateState: 'pass',
    terminalOutcome: 'retry_passed',
    startedAt: '2026-08-02T00:00:01.000Z',
    completedAt: '2026-08-02T00:00:02.000Z',
    durationMs: 1000,
  }
}

function passingRootEvidence(slotId: (typeof fiveSlotIds)[number]): VisualQualityRetryEvidenceV01 {
  return {
    version: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    jobId: 'retry-job',
    slotId,
    decision: 'retry_not_authorized',
    authorized: false,
    targets: [],
    normalizedFailureReasons: [],
    nonRetryReason: 'SLOT_ALREADY_PASSING',
    parentAttemptId: retryRootAttemptId,
    retryAttemptId: null,
    attemptOrdinal: 1,
    promptTemplateVersion: VISUAL_QUALITY_RETRY_TEMPLATE_V01_VERSION,
    promptDigestScope: VISUAL_QUALITY_RETRY_PROMPT_DIGEST_SCOPE_V01,
    promptDigest: null,
    generationAttempts: 0,
    evaluatorExecutions: 0,
    framingCorrectionOutcome: 'not_required',
    finalDimensionStates: {
      evaluator: 'pass',
      color: 'pass',
      angle: 'pass',
      studio: 'pass',
      material: 'pass',
      topology: 'pass',
      framing: 'pass',
      geometry: 'pass',
    },
    finalCombinedGateState: 'pass',
    terminalOutcome: 'not_authorized',
    startedAt: '2026-08-02T00:00:00.000Z',
  }
}

function retryRootAndChildFixture() {
  const rootSeed = createImageGenerationAttempt({
    jobId: 'retry-job',
    requestedSlotIds: fiveSlotIds,
    attemptId: retryRootAttemptId,
    attemptKind: 'initial',
    attemptOrdinal: 1,
    parentAttemptId: null,
    retryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    now: '2026-08-02T00:00:00.000Z',
  })
  const root = {
    ...finishImageGenerationAttempt(
      rootSeed,
      rootSeed.slots.map((slot) => slot.slotId === 'top'
        ? {
            ...slot,
            status: 'provider_failed' as const,
            failure: { code: 'quality_gate_failed' as const, summary: 'Synthetic retryable quality failure.' },
            qualityRetry: passingRetryEvidence(),
          }
        : {
            ...slot,
            status: 'persisted' as const,
            mediaId: 101 + slot.displayOrder,
            mediaUrl: `/media/root-${slot.slotId}.jpg`,
            qualityRetry: passingRootEvidence(slot.slotId),
          }),
      '2026-08-02T00:00:01.000Z',
    ),
    qualityGateSummary: { packResults: { qualityGateStatus: 'pass' } },
  }
  const childSeed = createImageGenerationAttempt({
    jobId: 'retry-job',
    requestedSlotIds: ['top'],
    attemptId: retryChildAttemptId,
    attemptKind: 'quality_retry',
    attemptOrdinal: 2,
    parentAttemptId: retryRootAttemptId,
    retryPolicyVersion: VISUAL_QUALITY_RETRY_POLICY_V01_VERSION,
    now: '2026-08-02T00:00:01.000Z',
  })
  const child = finishImageGenerationAttempt(
    childSeed,
    [{
      ...childSeed.slots[0],
      status: 'persisted',
      mediaId: 203,
      mediaUrl: '/media/retry-top.jpg',
      qualityRetry: passingRetryEvidence(),
    }],
    '2026-08-02T00:00:02.000Z',
  )
  return { root, child }
}

async function main() {
await check('canonical slot IDs, display order, purposes, and contract version are stable', () => {
  assert.deepEqual(fiveSlotIds, ['side', 'hero_3q', 'top', 'back', 'detail'])
  assert.deepEqual(IMAGE_SLOT_REGISTRY.map((slot) => slot.displayOrder), [0, 1, 2, 3, 4])
  assert.deepEqual(IMAGE_SLOT_REGISTRY.map((slot) => slot.meaning), [
    'Side presentation, single shoe — the main channel/hero image.',
    'Three-quarter matched pair — both shoes at a 3/4 angle.',
    'Top overview — the product seen from above (opening, topline, closure).',
    'Rear three-quarter — heel and one side visible together (dimensional, not a flat dead-back).',
    'Close detail of material / stitching / texture / sole edge.',
  ])
  assert.equal(IMAGE_SLOT_CONTRACT_VERSION, 'image-slot-contract/v1')
  assert.deepEqual(validateImageSlotRegistry(), [])
})

await check('unknown or duplicate requested slots fail safely', () => {
  assert.throws(() => createImageGenerationAttempt({
    jobId: 'job-1',
    requestedSlotIds: ['side', 'side'],
  }), /unique/)
  assert.throws(() => createImageGenerationAttempt({
    jobId: 'job-1',
    requestedSlotIds: ['side', 'unknown' as 'side'],
  }), /Unknown image slot ID/)
})

await check('one execution has one immutable attempt ID shared by every slot', () => {
  const first = createImageGenerationAttempt({ jobId: 'job-123', requestedSlotIds: fiveSlotIds })
  const second = createImageGenerationAttempt({ jobId: 'job-123', requestedSlotIds: fiveSlotIds })
  assert.match(first.attemptId, /^iga_[0-9a-f-]{36}$/)
  assert.notEqual(first.attemptId, second.attemptId)
  assert.notEqual(first.attemptId, first.jobId)
  assert.ok(first.slots.every((slot) => slot.attemptId === first.attemptId))
  assert.equal(new Set(first.slots.map((slot) => slot.attemptId)).size, 1)
})

await check('partial provider failure cannot relabel later successful slots', () => {
  const attempt = createImageGenerationAttempt({ jobId: 'provider-partial', requestedSlotIds: fiveSlotIds })
  const results = adaptLegacyProviderOutput({
    attempt,
    provider: 'fixture-provider',
    buffers: ['slot-1-bytes', 'slot-3-bytes', 'slot-4-bytes', 'slot-5-bytes'],
    slotLogs: [
      {
        slot: 'side',
        success: true,
        attempts: 1,
        studioEvaluatorState: 'pass',
        componentTopologyEvaluatorState: 'fail',
        componentTopologyEvaluatorReasonCodes: ['SOURCE_COMPONENT_REMOVAL', 'COMPONENT_RELOCATION'],
        materialEvaluatorState: 'fail',
        materialEvaluatorReasonCodes: ['UNSUPPORTED_MATERIAL_ADDITION', 'MATERIAL_ZONE_DRIFT'],
      },
      { slot: 'hero_3q', success: false, attempts: 2, rejectionReason: 'fixture provider failure' },
      { slot: 'top', success: true, attempts: 1 },
      { slot: 'back', success: true, attempts: 1 },
      { slot: 'detail', success: true, attempts: 1 },
    ],
  })
  assert.equal(results.length, 5)
  assert.equal(results[0].provider?.studioEvaluatorState, 'pass')
  assert.equal(results[0].provider?.componentTopologyEvaluatorState, 'fail')
  assert.deepEqual(results[0].provider?.componentTopologyEvaluatorReasonCodes, ['SOURCE_COMPONENT_REMOVAL', 'COMPONENT_RELOCATION'])
  assert.equal(results[0].provider?.materialEvaluatorState, 'fail')
  assert.deepEqual(results[0].provider?.materialEvaluatorReasonCodes, ['UNSUPPORTED_MATERIAL_ADDITION', 'MATERIAL_ZONE_DRIFT'])
  const serialized = serializeSlotEnvelopes(results)
  assert.equal(serialized[0].provider?.materialEvaluatorState, 'fail')
  assert.equal(serialized[0].provider?.componentTopologyEvaluatorState, 'fail')
  assert.deepEqual(serialized[0].provider?.componentTopologyEvaluatorReasonCodes, ['SOURCE_COMPONENT_REMOVAL', 'COMPONENT_RELOCATION'])
  assert.deepEqual(serialized[0].provider?.materialEvaluatorReasonCodes, ['UNSUPPORTED_MATERIAL_ADDITION', 'MATERIAL_ZONE_DRIFT'])
  assert.equal(results[1].slotId, 'hero_3q')
  assert.equal(results[1].status, 'provider_failed')
  assert.equal(results[1].output, undefined)
  assert.equal(results[2].slotId, 'top')
  assert.equal(results[2].output, 'slot-3-bytes')
  assert.equal(results[3].slotId, 'back')
  assert.equal(results[3].output, 'slot-4-bytes')
  assert.equal(results[4].slotId, 'detail')
  assert.equal(results[4].output, 'slot-5-bytes')
})

await check('framing-correction evidence is preserved only when its complete contract is valid', () => {
  const originalGeometry = {
    version: 'visual-geometry-gate/v0.1',
    slotId: 'side',
    applicable: true,
    state: 'fail',
    clippingState: 'pass',
    measurement: {
      occupancyPercent: 70,
      centerOffsetXPercent: 4,
      centerOffsetYPercent: 0,
      maximumCenterOffsetPercent: 4,
      clippingDetected: false,
    },
    reasonCodes: ['occupancy_below_72', 'center_offset_above_3'],
  } as const
  const finalGeometry = {
    version: 'visual-geometry-gate/v0.1',
    slotId: 'side',
    applicable: true,
    state: 'pass',
    clippingState: 'pass',
    measurement: {
      occupancyPercent: 76,
      centerOffsetXPercent: 0.5,
      centerOffsetYPercent: 0.25,
      maximumCenterOffsetPercent: 0.5,
      clippingDetected: false,
    },
    reasonCodes: [],
  } as const
  const evidence = {
    version: 'visual-framing-correction/v1',
    slotId: 'side',
    state: 'pass',
    outcome: 'applied',
    reasonCodes: ['framing_correction_applied'],
    originalBoundingBox: { x: 0.12, y: 0.2, width: 0.7, height: 0.5 },
    finalBoundingBox: { x: 0.11, y: 0.23, width: 0.78, height: 0.55 },
    originalCanvas: { width: 1024, height: 960 },
    finalCanvas: { width: 1024, height: 1024 },
    appliedScale: 1.1,
    plannedScale: 1.1,
    appliedTranslationXPercent: 1.5,
    appliedTranslationYPercent: -0.5,
    plannedTranslationXPercent: 1.5,
    plannedTranslationYPercent: -0.5,
    paddingUsed: true,
    padding: { top: 32, right: 0, bottom: 32, left: 0 },
    rotationDegrees: 0,
    aspectRatioChange: 0,
    mirrored: false,
    originalGeometry,
    finalGeometry,
    finalGeometryState: 'pass',
  } as const
  const attempt = createImageGenerationAttempt({ jobId: 'framing-evidence', requestedSlotIds: ['side'] })
  const [valid] = adaptLegacyProviderOutput({
    attempt,
    provider: 'fixture-provider',
    buffers: ['side-bytes'],
    slotLogs: [{ slot: 'side', success: true, attempts: 1, framingCorrection: evidence }],
  })
  assert.deepEqual(valid.provider?.framingCorrection, evidence)
  assert.deepEqual(serializeSlotEnvelopes([valid])[0].provider?.framingCorrection, evidence)

  for (const malformed of [
    { ...evidence, version: 'visual-framing-correction/unsupported' },
    { ...evidence, slotId: 'hero_3q' },
    { ...evidence, appliedTranslationXPercent: 12.01 },
    { ...evidence, reasonCodes: ['unsupported_reason'] },
    { ...evidence, finalGeometryState: 'fail' },
  ]) {
    const [blocked] = adaptLegacyProviderOutput({
      attempt,
      provider: 'fixture-provider',
      buffers: ['side-bytes'],
      slotLogs: [{ slot: 'side', success: true, attempts: 1, framingCorrection: malformed }],
    })
    assert.equal(blocked.provider?.framingCorrection, undefined)
  }
})

await check('a middle Media-save failure stays on that slot without compaction', async () => {
  const attempt = createImageGenerationAttempt({ jobId: 'media-partial', requestedSlotIds: fiveSlotIds })
  const generated = adaptLegacyProviderOutput({
    attempt,
    provider: 'fixture-provider',
    buffers: ['side', 'hero', 'top', 'back', 'detail'],
    slotLogs: fiveSlotIds.map((slot) => ({ slot, success: true, attempts: 1 })),
  })
  const persisted = await persistGeneratedSlotEnvelopes({
    slots: generated,
    persist: async (slot) => {
      if (slot.slotId === 'top') throw new Error('fixture Media failure')
      return { mediaId: 100 + slot.displayOrder, mediaUrl: `/media/${slot.slotId}.jpg` }
    },
  })
  assert.equal(persisted.length, 5)
  assert.equal(persisted[2].slotId, 'top')
  assert.equal(persisted[2].status, 'media_save_failed')
  assert.equal(persisted[2].mediaId, null)
  assert.equal(persisted[3].slotId, 'back')
  assert.equal(persisted[3].mediaId, 103)
  assert.equal(persisted[4].slotId, 'detail')
  assert.equal(persisted[4].mediaId, 104)
  const completed = finishImageGenerationAttempt(attempt, serializeSlotEnvelopes(persisted), '2026-07-26T00:00:01.000Z')
  assert.equal(completed.status, 'partial')
  assert.equal(completed.slots.length, 5)
})

await check('opt-in Media persistence fail-fast leaves every later durable slot envelope unchanged', async () => {
  const attempt = createImageGenerationAttempt({ jobId: 'media-fail-fast', requestedSlotIds: fiveSlotIds })
  const generated = adaptLegacyProviderOutput({
    attempt,
    provider: 'fixture-provider',
    buffers: ['side', 'hero', 'top', 'back', 'detail'],
    slotLogs: fiveSlotIds.map((slot) => ({ slot, success: true, attempts: 1 })),
  })
  const persistedSlotIds: string[] = []
  const persisted = await persistGeneratedSlotEnvelopes({
    slots: generated,
    failFast: true,
    persist: async (slot) => {
      persistedSlotIds.push(slot.slotId)
      if (slot.slotId === 'top') throw new Error('fixture Media failure')
      return { mediaId: 200 + slot.displayOrder, mediaUrl: `/media/${slot.slotId}.jpg` }
    },
  })

  assert.deepEqual(persistedSlotIds, ['side', 'hero_3q', 'top'])
  assert.equal(persisted.length, fiveSlotIds.length)
  assert.equal(persisted[2].status, 'media_save_failed')
  assert.deepEqual(persisted[3], generated[3])
  assert.deepEqual(persisted[4], generated[4])
  assert.equal(persisted[3].slotId, 'back')
  assert.equal(persisted[4].slotId, 'detail')
})

await check('complete success preserves the existing five-slot preview order and semantic Media IDs', async () => {
  const attempt = createImageGenerationAttempt({ jobId: 'complete', requestedSlotIds: fiveSlotIds })
  const generated = adaptLegacyProviderOutput({
    attempt,
    provider: 'fixture-provider',
    buffers: ['side', 'hero', 'top', 'back', 'detail'],
    slotLogs: fiveSlotIds.map((slot) => ({ slot, success: true, attempts: 1 })),
  })
  const persisted = await persistGeneratedSlotEnvelopes({
    slots: generated,
    persist: async (slot) => ({ mediaId: slot.displayOrder + 1 }),
  })
  const completed = finishImageGenerationAttempt(attempt, serializeSlotEnvelopes(persisted))
  const history = upsertGenerationAttemptHistory([], completed)
  const resolution = resolveApprovalCandidates({
    generationAttempts: history,
    activeAttemptId: completed.attemptId,
    legacyMediaIds: [],
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) return
  assert.equal(resolution.source, 'semantic')
  assert.deepEqual(resolution.candidates.map((candidate) => candidate.slotId), fiveSlotIds)
  assert.deepEqual(resolution.candidates.map((candidate) => candidate.mediaId), [1, 2, 3, 4, 5])
  assert.deepEqual(selectApprovalMediaIds(resolution.candidates, 'side,back'), [1, 4])
  assert.deepEqual(selectApprovalMediaIds(resolution.candidates, '1,4'), [1, 4])
})

await check('root pack selection preserves five-slot order while replacing only the retried durable slot', () => {
  const { root, child } = retryRootAndChildFixture()
  const packSelection = buildImageGenerationPackSelection({
    attempts: [root, child],
    rootAttemptId: retryRootAttemptId,
    sourcesBySlot: {
      side: retryRootAttemptId,
      hero_3q: retryRootAttemptId,
      top: retryChildAttemptId,
      back: retryRootAttemptId,
      detail: retryRootAttemptId,
    },
  })
  const rootWithSelection = { ...root, packSelection }
  const history = [rootWithSelection, child]
  const parsed = parseGenerationAttemptHistory(history)
  assert.equal(parsed.ok, true)

  const validated = validateImageGenerationPackSelection({
    attempts: history,
    rootAttempt: rootWithSelection,
  })
  assert.equal(validated.ok, true)
  if (!validated.ok) return
  assert.deepEqual(validated.selection.slots.map((slot) => slot.slotId), fiveSlotIds)
  assert.deepEqual(validated.selection.slots.map((slot) => slot.sourceAttemptId), [
    retryRootAttemptId,
    retryRootAttemptId,
    retryChildAttemptId,
    retryRootAttemptId,
    retryRootAttemptId,
  ])

  const resolution = resolveApprovalCandidates({
    generationAttempts: history,
    activeAttemptId: retryChildAttemptId,
    legacyMediaIds: [],
  })
  assert.equal(resolution.ok, true)
  if (!resolution.ok) return
  assert.deepEqual(resolution.candidates.map((candidate) => candidate.slotId), fiveSlotIds)
  assert.deepEqual(resolution.candidates.map((candidate) => candidate.mediaId), [101, 102, 203, 104, 105])
})

await check('retry-aware approval requires a complete manifest while historical partial reads remain compatible', () => {
  const { root, child } = retryRootAndChildFixture()
  for (const activeAttemptId of [root.attemptId, child.attemptId]) {
    const resolution = resolveApprovalCandidates({
      generationAttempts: [root, child],
      activeAttemptId,
      legacyMediaIds: [999],
    })
    assert.equal(resolution.ok, false)
    assert.deepEqual(resolution.candidates, [])
  }

  const historicalSeed = createImageGenerationAttempt({
    jobId: 'historical-partial',
    requestedSlotIds: fiveSlotIds,
  })
  const historicalPartial = finishImageGenerationAttempt(
    historicalSeed,
    historicalSeed.slots.map((slot, index) => index === 0
      ? { ...slot, status: 'persisted' as const, mediaId: 700 }
      : { ...slot, status: 'provider_failed' as const }),
  )
  const historicalResolution = resolveApprovalCandidates({
    generationAttempts: [historicalPartial],
    activeAttemptId: historicalPartial.attemptId,
    legacyMediaIds: [999],
  })
  assert.equal(historicalResolution.ok, true)
  if (!historicalResolution.ok) return
  assert.deepEqual(historicalResolution.candidates.map((candidate) => candidate.mediaId), [700])
})

await check('pack selection accepts only terminal passing roots and completed retry children', () => {
  const { root, child } = retryRootAndChildFixture()
  assert.equal(root.status, 'partial')
  assert.equal(child.status, 'completed')
  const packSelection = buildImageGenerationPackSelection({
    attempts: [root, child],
    rootAttemptId: retryRootAttemptId,
    sourcesBySlot: {
      side: retryRootAttemptId,
      hero_3q: retryRootAttemptId,
      top: retryChildAttemptId,
      back: retryRootAttemptId,
      detail: retryRootAttemptId,
    },
  })
  const validRoot = { ...root, packSelection }
  assert.equal(parseGenerationAttemptHistory([validRoot, child]).ok, true)

  const invalidHistories = [
    [{ ...validRoot, status: 'running' as const, completedAt: undefined }, child],
    [validRoot, { ...child, status: 'running' as const, completedAt: undefined }],
    [validRoot, { ...child, status: 'failed' as const }],
    [validRoot, { ...child, completedAt: undefined }],
    [{ ...validRoot, qualityGateSummary: { packResults: { qualityGateStatus: 'fail' } } }, child],
  ]
  for (const history of invalidHistories) {
    assert.equal(parseGenerationAttemptHistory(history).ok, false)
  }
})

await check('retry lineage and pack metadata fail closed without compacting or weakening historical reads', () => {
  const { root, child } = retryRootAndChildFixture()
  const packSelection = buildImageGenerationPackSelection({
    attempts: [root, child],
    rootAttemptId: retryRootAttemptId,
    sourcesBySlot: {
      side: retryRootAttemptId,
      hero_3q: retryRootAttemptId,
      top: retryChildAttemptId,
      back: retryRootAttemptId,
      detail: retryRootAttemptId,
    },
  })
  const rootWithSelection = { ...root, packSelection }
  const rootWithoutChildLink = {
    ...root,
    slots: root.slots.map((slot) => {
      if (slot.slotId !== 'top') return slot
      const withoutQualityRetry = { ...slot }
      delete withoutQualityRetry.qualityRetry
      return withoutQualityRetry
    }),
  }

  const pendingEvidence = passingRetryEvidence()
  pendingEvidence.terminalOutcome = 'authorized_pending'
  pendingEvidence.generationAttempts = 0
  pendingEvidence.evaluatorExecutions = 0
  pendingEvidence.finalDimensionStates = {
    ...pendingEvidence.finalDimensionStates,
    evaluator: 'fail',
    angle: 'fail',
    studio: 'fail',
  }
  pendingEvidence.finalCombinedGateState = 'fail'
  delete pendingEvidence.completedAt
  delete pendingEvidence.durationMs
  const pendingRoot = {
    ...root,
    slots: root.slots.map((slot) => slot.slotId === 'top'
      ? { ...slot, qualityRetry: pendingEvidence }
      : slot),
  }
  assert.equal(parseGenerationAttemptHistory([pendingRoot]).ok, true)

  assert.throws(
    () => upsertGenerationAttemptHistory([rootWithoutChildLink], child),
    /retry lineage/i,
  )
  let incrementalHistory = upsertGenerationAttemptHistory([rootWithoutChildLink], pendingRoot)
  incrementalHistory = upsertGenerationAttemptHistory(incrementalHistory, child)
  assert.equal(parseGenerationAttemptHistory(incrementalHistory).ok, true)

  for (const malformed of [
    [child, rootWithSelection],
    [rootWithoutChildLink, child],
    [{ ...pendingRoot, packSelection }, child],
    [rootWithSelection, { ...child, jobId: 'different-job' }],
    [rootWithSelection, child, { ...child, attemptId: 'iga_33333333-3333-4333-8333-333333333333' }],
    [
      rootWithSelection,
      {
        ...child,
        requestedSlotIds: ['top', 'back'],
        slots: [...child.slots, { ...root.slots[3], attemptId: child.attemptId }],
      },
    ],
    [
      rootWithSelection,
      {
        ...child,
        slots: [{
          ...child.slots[0],
          qualityRetry: { ...passingRetryEvidence(), promptDigest: 'not-a-digest' },
        }],
      },
    ],
    [
      {
        ...rootWithSelection,
        slots: rootWithSelection.slots.map((slot) => slot.slotId === 'side'
          ? {
              ...slot,
              qualityRetry: {
                ...slot.qualityRetry,
                parentAttemptId: 'iga_55555555-5555-4555-8555-555555555555',
              },
            }
          : slot),
      },
      child,
    ],
    [
      {
        ...rootWithSelection,
        packSelection: {
          ...packSelection,
          slots: packSelection.slots.map((slot) => slot.slotId === 'top'
            ? { ...slot, mediaId: 999 }
            : slot),
        },
      },
      child,
    ],
  ]) {
    const parsed = parseGenerationAttemptHistory(malformed)
    assert.equal(parsed.ok, false)
  }

  const historical = createImageGenerationAttempt({
    jobId: 'historical-compatible',
    requestedSlotIds: fiveSlotIds,
    attemptId: 'iga_44444444-4444-4444-8444-444444444444',
  })
  const historicalJson = JSON.stringify([historical])
  const historicalParsed = parseGenerationAttemptHistory(JSON.parse(historicalJson))
  assert.equal(historicalParsed.ok, true)
  if (!historicalParsed.ok) return
  assert.equal(JSON.stringify(historicalParsed.attempts), historicalJson)
})

await check('legacy complete and partial records remain readable without inventing partial slot identity', () => {
  const complete = projectLegacySlots({
    mediaIds: [11, 12, 13, 14, 15],
    promptsUsed: JSON.stringify({ stage: 'standard' }),
  })
  assert.deepEqual(complete.map((slot) => slot.slotId), fiveSlotIds)
  const partial = projectLegacySlots({
    mediaIds: [21, 23, 24, 25],
    promptsUsed: JSON.stringify({ stage: 'standard' }),
  })
  assert.ok(partial.every((slot) => slot.slotId === null))
  assert.ok(partial.every((slot) => slot.warning?.includes('cannot prove')))
  assert.deepEqual(selectApprovalMediaIds(partial, '2,4'), [23, 25])
})

await check('malformed semantic metadata fails visibly and reading does not mutate history', () => {
  const malformed = resolveApprovalCandidates({
    generationAttempts: [{ contractVersion: 'unknown/v9' }],
    activeAttemptId: 'iga_bad',
    legacyMediaIds: [1, 2, 3],
  })
  assert.equal(malformed.ok, false)

  const attempt = createImageGenerationAttempt({ jobId: 'immutable-read', requestedSlotIds: fiveSlotIds })
  const history = [attempt]
  const before = JSON.stringify(history)
  const parsed = parseGenerationAttemptHistory(history)
  assert.equal(parsed.ok, true)
  assert.equal(JSON.stringify(history), before)
})

await check('attempt-history equality tolerates jsonb object-key reordering but not evidence drift', () => {
  const attempt = createImageGenerationAttempt({
    jobId: 'jsonb-semantic-equality',
    requestedSlotIds: fiveSlotIds,
  })
  const reverseObjectKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(reverseObjectKeys)
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .reverse()
          .map(([key, entry]) => [key, reverseObjectKeys(entry)]),
      )
    }
    return value
  }
  const reordered = reverseObjectKeys(attempt) as typeof attempt
  assert.equal(areGenerationAttemptHistoriesSemanticallyEqual([attempt], [reordered]), true)
  assert.equal(areGenerationAttemptHistoriesSemanticallyEqual(
    [attempt],
    [{ ...reordered, status: 'failed' }],
  ), false)
})

await check('safe failure summaries redact credentials and signed-token query values', () => {
  const fakeApiKey = `sk-${'x'.repeat(24)}`
  const fakeBearer = 'fixture-bearer-value'
  const fakeQueryToken = 'fixture-query-value'
  const summary = safeImageFailureSummary(
    `Bearer ${fakeBearer} ${fakeApiKey} https://example.test/x?token=${fakeQueryToken}`,
    'failure',
  )
  assert.ok(!summary.includes(fakeBearer))
  assert.ok(!summary.includes(fakeApiKey))
  assert.ok(!summary.includes(fakeQueryToken))
  assert.match(summary, /redacted/)
})

await check('policy stability: prompts, slot count, provider choice, transforms, D-355M/D-355N, and brand access remain unchanged', () => {
  const promptDigest = createHash('sha256')
    .update(JSON.stringify(GENERATED_SCENES.map((scene) => scene.sceneInstructions)))
    .digest('hex')
  assert.equal(SLOT_PROMPT_VERSION, 'slotset-v1')
  assert.equal(promptDigest, '4050a83f01eae0c200b013ce9fc744b41890f49180cb1af0e2173e2a38adb810')
  assert.equal(requestedSlotIdsForStage('standard').length, 5)
  assert.deepEqual(requestedSlotIdsForStage('premium'), ['back', 'detail'])

  const taskSource = readFileSync(new URL('../jobs/imageGenTask.ts', import.meta.url), 'utf8')
  const providerSource = readFileSync(new URL('./imageProviders.ts', import.meta.url), 'utf8')
  assert.match(taskSource, /input\.provider \|\| 'gemini-pro'/)
  assert.match(taskSource, /provider === 'gemini-pro' \? generateByGeminiPro : generateByEditing/)
  assert.match(taskSource, /normalizeProductCentering/)
  assert.match(taskSource, /normalizeBackground/)
  assert.match(taskSource, /overlayStockNumber/)
  assert.doesNotMatch(taskSource, /from ['"].*imageBrandGate/)
  assert.match(providerSource, /MATERIAL_IDENTITY_LOCK_BLOCK/)
  assert.match(providerSource, /buildVisualFactLock\(visualFacts\)/)
})

console.log(`\nimageGenerationContracts: ${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ' — ALL OK'}`)
}

void main()
