import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

type Failure = {
  dimension: string
  codes: string[]
  observation: string
}

type Slot = {
  slotId: string
  mediaId: number
  scores: Record<string, number>
  loaferScores?: Record<string, number>
  failures: Failure[]
}

type Pack = {
  productId: number
  jobId: number
  attemptId: string
  contractVersion: string
  terminalStatus: string
  newAttemptInThisTask: boolean
  slots: Slot[]
  packScores: Record<string, number>
  packFailures: Failure[]
  packMean: number
}

type Scorecard = {
  schemaVersion: string
  scoreScale: { minimum: number; maximum: number; lowScoreThreshold: number }
  canonicalSlots: string[]
  dimensions: { slot: string[]; pack: string[]; loafer: string[] }
  packs: Pack[]
  aggregate: {
    packCount: number
    newAttemptCount: number
    allPacksCompleteFiveSlot: boolean
    allMediaLineageComplete: boolean
    allNewPacksRejectedWithoutGalleryAttachment: boolean
    meanPackScore: number
  }
}

type Fixture = {
  productId: number
  stockNumber: string
  referenceMediaIds: number[]
  referenceValidation: {
    usable: boolean
    originalMediaOnly: boolean
    notScreenshot: boolean
    httpStatus: number
  }
  visualTruth: Record<string, unknown>
  baseline: null | { jobId: number; attemptId: string; mediaIds: number[] }
}

type MiniGoldenSet = {
  schemaVersion: string
  scope: {
    productCount: number
    evaluatedBaselinePackCount: number
    newProductionAttemptCount: number
    imageBinariesStoredInGit: boolean
  }
  fixtures: Fixture[]
}

const read = (path: string) => readFileSync(path, 'utf8')
const parse = <T>(path: string): T => JSON.parse(read(path)) as T

const root = 'project-control/visual-quality-fast-track-v1'
const miniText = read(`${root}/mini-golden-set-v0.json`)
const scorecardText = read(`${root}/baseline-scorecard-v1.json`)
const mini = JSON.parse(miniText) as MiniGoldenSet
const scorecard = JSON.parse(scorecardText) as Scorecard
const report = read('project-control/VISUAL_QUALITY_FAST_TRACK_BASELINE_V1.md')
const guide = read(`${root}/review-guide.md`)

assert.equal(mini.schemaVersion, 'visual-quality-mini-golden-set/v0')
assert.deepEqual(mini.fixtures.map((fixture) => fixture.productId), [349, 334, 337, 343, 366])
assert.equal(mini.scope.productCount, 5)
assert.equal(mini.scope.evaluatedBaselinePackCount, 3)
assert.equal(mini.scope.newProductionAttemptCount, 2)
assert.equal(mini.scope.imageBinariesStoredInGit, false)
assert.equal(new Set(mini.fixtures.map((fixture) => fixture.stockNumber)).size, 5)

for (const fixture of mini.fixtures) {
  assert.ok(fixture.referenceMediaIds.length > 0, `fixture ${fixture.productId} must have reference Media`)
  assert.equal(fixture.referenceValidation.usable, true, `fixture ${fixture.productId} reference must be usable`)
  assert.equal(fixture.referenceValidation.originalMediaOnly, true, `fixture ${fixture.productId} must use originals`)
  assert.equal(fixture.referenceValidation.notScreenshot, true, `fixture ${fixture.productId} must not use a screenshot`)
  assert.equal(fixture.referenceValidation.httpStatus, 200, `fixture ${fixture.productId} reference must be accessible`)
  assert.ok(Object.keys(fixture.visualTruth).length >= 12, `fixture ${fixture.productId} visual truth is incomplete`)
}

assert.deepEqual(
  mini.fixtures.filter((fixture) => fixture.baseline !== null).map((fixture) => fixture.productId),
  [349, 334, 343],
)
assert.equal(mini.fixtures.find((fixture) => fixture.productId === 337)?.baseline, null)
assert.equal(mini.fixtures.find((fixture) => fixture.productId === 366)?.baseline, null)

assert.equal(scorecard.schemaVersion, 'visual-quality-baseline-scorecard/v1')
assert.deepEqual(scorecard.canonicalSlots, ['side', 'hero_3q', 'top', 'back', 'detail'])
assert.equal(scorecard.packs.length, 3)
assert.deepEqual(scorecard.packs.map((pack) => pack.productId), [349, 334, 343])
assert.equal(scorecard.packs.filter((pack) => pack.newAttemptInThisTask).length, 2)
assert.deepEqual(scorecard.packs.filter((pack) => pack.newAttemptInThisTask).map((pack) => pack.productId), [334, 343])
assert.deepEqual(
  scorecard.packs.map((pack) => ({ productId: pack.productId, jobId: pack.jobId, attemptId: pack.attemptId })),
  [
    { productId: 349, jobId: 428, attemptId: 'iga_dea1a935-683e-45b9-b876-8c8e3b74162a' },
    { productId: 334, jobId: 429, attemptId: 'iga_b5de1c30-9815-436b-b0cb-61eb5d252714' },
    { productId: 343, jobId: 430, attemptId: 'iga_b1a52f31-60d5-4362-ab81-493aa10c5519' },
  ],
)

const allowedFailureCodes = new Set([
  'IDENTITY_DRIFT',
  'CATEGORY_CONVERSION',
  'SILHOUETTE_DRIFT',
  'TOE_GEOMETRY_DRIFT',
  'VAMP_LENGTH_DRIFT',
  'OPENING_SHAPE_DRIFT',
  'HEEL_BACK_DRIFT',
  'SOLE_THICKNESS_DRIFT',
  'SEAM_PATH_DRIFT',
  'HARDWARE_INVENTED',
  'ORNAMENT_INVENTED',
  'MATERIAL_DRIFT',
  'COLOR_DRIFT',
  'SCALE_INCONSISTENT',
  'CENTERING_INCONSISTENT',
  'ORIENTATION_INCONSISTENT',
  'PERSPECTIVE_INCONSISTENT',
  'SLOT_REDUNDANT',
  'PACK_INCOHERENT',
  'PROVIDER_ARTIFACT',
])

function validateScores(
  label: string,
  scores: Record<string, number>,
  expectedDimensions: string[],
  failures: Failure[],
): void {
  assert.deepEqual(Object.keys(scores), expectedDimensions, `${label} score dimensions differ`)
  const failedDimensions = new Set(failures.map((failure) => failure.dimension))
  for (const [dimension, score] of Object.entries(scores)) {
    assert.ok(Number.isInteger(score), `${label}.${dimension} must be an integer`)
    assert.ok(score >= scorecard.scoreScale.minimum && score <= scorecard.scoreScale.maximum, `${label}.${dimension} is out of range`)
    if (score <= scorecard.scoreScale.lowScoreThreshold) {
      assert.ok(failedDimensions.has(dimension), `${label}.${dimension} low score needs a structured failure`)
    }
  }
  for (const failure of failures) {
    assert.ok(failure.observation.trim().length >= 12, `${label}.${failure.dimension} needs a direct observation`)
    assert.ok(failure.codes.length > 0, `${label}.${failure.dimension} needs a failure code`)
    for (const code of failure.codes) assert.ok(allowedFailureCodes.has(code), `${label} uses unknown failure code ${code}`)
  }
}

const mediaIds = new Set<number>()
for (const pack of scorecard.packs) {
  assert.equal(pack.contractVersion, 'image-slot-contract/v1')
  assert.equal(pack.terminalStatus, 'rejected')
  assert.ok(pack.attemptId.startsWith('iga_'))
  assert.deepEqual(pack.slots.map((slot) => slot.slotId), scorecard.canonicalSlots)
  assert.equal(new Set(pack.slots.map((slot) => slot.slotId)).size, 5)
  for (const slot of pack.slots) {
    assert.ok(!mediaIds.has(slot.mediaId), `Media ${slot.mediaId} is reused across packs`)
    mediaIds.add(slot.mediaId)
    validateScores(`product ${pack.productId} ${slot.slotId}`, slot.scores, scorecard.dimensions.slot, slot.failures)
    if (pack.productId === 349) {
      assert.ok(slot.loaferScores, `Product 349 ${slot.slotId} needs loafer scores`)
      validateScores(`product 349 ${slot.slotId} loafer`, slot.loaferScores!, scorecard.dimensions.loafer, slot.failures)
    } else {
      assert.equal(slot.loaferScores, undefined, `Non-loafer Product ${pack.productId} must not have loafer scores`)
    }
  }
  validateScores(`product ${pack.productId} pack`, pack.packScores, scorecard.dimensions.pack, pack.packFailures)
  const computedPackMean = Object.values(pack.packScores).reduce((sum, score) => sum + score, 0) / scorecard.dimensions.pack.length
  assert.equal(pack.packMean, computedPackMean, `Product ${pack.productId} pack mean is stale`)

  const fixtureBaseline = mini.fixtures.find((fixture) => fixture.productId === pack.productId)?.baseline
  assert.ok(fixtureBaseline, `Product ${pack.productId} fixture is missing baseline linkage`)
  assert.equal(fixtureBaseline.jobId, pack.jobId)
  assert.equal(fixtureBaseline.attemptId, pack.attemptId)
  assert.deepEqual(fixtureBaseline.mediaIds, pack.slots.map((slot) => slot.mediaId))
}
assert.equal(mediaIds.size, 15)

assert.deepEqual(scorecard.aggregate, {
  ...scorecard.aggregate,
  packCount: 3,
  newAttemptCount: 2,
  allPacksCompleteFiveSlot: true,
  allMediaLineageComplete: true,
  allNewPacksRejectedWithoutGalleryAttachment: true,
})
const computedMeanPackScore = scorecard.packs.reduce((sum, pack) => sum + pack.packMean, 0) / scorecard.packs.length
assert.equal(scorecard.aggregate.meanPackScore, Number(computedMeanPackScore.toFixed(3)))

for (const required of [
  'Visual Lock V0 hypothesis',
  'Product 349 — dedicated loafer diagnosis',
  'Product 334',
  'Product 343',
  'Job 428',
  'Job 429',
  'Job 430',
  'No evidence justifies blaming Gemini alone',
  'The Source Pack was not changed',
  'VISUAL LOCK V0 — FIRST CONTROLLED QUALITY IMPLEMENTATION',
]) {
  assert.ok(report.includes(required), `baseline report must contain ${required}`)
}

for (const required of ['Every score of `3` or lower', 'Direct observation', 'Generated image binaries remain outside Git']) {
  assert.ok(guide.includes(required), `review guide must contain ${required}`)
}

for (const sensitivePattern of [
  /postgres(?:ql)?:\/\//i,
  /DATABASE_URI\s*=/,
  /TELEGRAM_BOT_TOKEN\s*=/,
  /BLOB_READ_WRITE_TOKEN\s*=/,
  /https?:\/\/[^\s"']+\/api\/media\/file/i,
]) {
  assert.ok(!sensitivePattern.test(miniText), `mini Golden Set contains forbidden URI or secret material: ${sensitivePattern}`)
  assert.ok(!sensitivePattern.test(scorecardText), `scorecard contains forbidden URI or secret material: ${sensitivePattern}`)
}

assert.doesNotThrow(() => parse<MiniGoldenSet>(`${root}/mini-golden-set-v0.json`))
assert.doesNotThrow(() => parse<Scorecard>(`${root}/baseline-scorecard-v1.json`))

console.log('Visual Quality Fast Track V1 governance passed')
