import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  adaptLegacyProviderOutput,
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
  validateImageSlotRegistry,
} from './imageGenerationContracts'
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
      { slot: 'side', success: true, attempts: 1 },
      { slot: 'hero_3q', success: false, attempts: 2, rejectionReason: 'fixture provider failure' },
      { slot: 'top', success: true, attempts: 1 },
      { slot: 'back', success: true, attempts: 1 },
      { slot: 'detail', success: true, attempts: 1 },
    ],
  })
  assert.equal(results.length, 5)
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
