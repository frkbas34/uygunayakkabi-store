import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildGeneratedMediaRetentionReport } from '../../scripts/generated-media-retention-dry-run'
import {
  classifyGeneratedMediaRetention,
  GENERATED_MEDIA_RETENTION_PROFILES,
  type GeneratedMediaRetentionEvidence,
} from './generatedMediaRetentionPolicy'

const NOW = '2026-07-28T12:00:00.000Z'

function evidence(overrides: Partial<GeneratedMediaRetentionEvidence> = {}): GeneratedMediaRetentionEvidence {
  return {
    now: NOW,
    mediaKind: 'generated',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    decisionAt: '2026-01-01T00:00:00.000Z',
    lineage: {
      contractVersion: 'image-slot-contract/v1',
      jobId: '500',
      attemptId: 'iga_fixture',
      slotId: 'side',
    },
    jobRecordExists: true,
    jobStatus: 'rejected',
    attemptStatus: 'completed',
    decision: 'rejected',
    galleryAttached: false,
    originalImagesAttached: false,
    publicOrPublished: false,
    shopierOrExternalUse: false,
    orderOrCampaignUse: false,
    imageQcDependency: false,
    activeJob: false,
    smokeEvidence: false,
    failureEvidence: false,
    regressionFixture: false,
    legalOrAuditHold: false,
    operatorHold: false,
    orphanSuspected: false,
    blobState: 'present',
    ...overrides,
  }
}

function classify(overrides: Partial<GeneratedMediaRetentionEvidence> = {}) {
  return classifyGeneratedMediaRetention(evidence(overrides), GENERATED_MEDIA_RETENTION_PROFILES.balanced)
}

let tests = 0
function test(name: string, run: () => void): void {
  run()
  tests += 1
  console.log(`PASS ${tests}: ${name}`)
}

test('Original Media is never eligible', () => {
  const result = classify({ mediaKind: 'original' })
  assert.equal(result.retentionClass, 'PERMANENT_BUSINESS_ASSET')
  assert.equal(result.physicalCleanupEligibility, 'ineligible')
})

test('Approved gallery Media is never eligible', () => {
  const result = classify({ decision: 'approved', jobStatus: 'approved', galleryAttached: true })
  assert.equal(result.lifecycle, 'approved_attached')
  assert.ok(result.holds.includes('gallery_hold'))
})

test('Public or published Media is never eligible', () => {
  const result = classify({ publicOrPublished: true })
  assert.equal(result.retentionClass, 'PERMANENT_BUSINESS_ASSET')
})

test('Shopier or external-use Media is never eligible', () => {
  const result = classify({ shopierOrExternalUse: true })
  assert.ok(result.holds.includes('shopier_hold'))
  assert.equal(result.physicalCleanupEligibility, 'ineligible')
})

test('Pending preview is held', () => {
  const result = classify({ decision: 'pending', jobStatus: 'preview' })
  assert.equal(result.retentionClass, 'PENDING_OPERATOR_DECISION')
  assert.ok(result.holds.includes('pending_decision_hold'))
})

test('Active job is held', () => {
  const result = classify({ activeJob: true, jobStatus: 'generating', decision: 'none' })
  assert.ok(result.holds.includes('active_job_hold'))
  assert.equal(result.physicalCleanupEligibility, 'ineligible')
})

test('Rejected Media enters recoverable class, not immediate deletion', () => {
  const result = classify()
  assert.equal(result.retentionClass, 'REJECTED_RECOVERABLE')
  assert.equal(result.physicalDeleteAuthorization, false)
})

test('Superseded Media requires a valid replacement attempt', () => {
  const result = classify({ decision: 'superseded', replacementAttemptAccepted: false, supersededAt: NOW })
  assert.equal(result.retentionClass, 'LEGACY_MANUAL_REVIEW')
  assert.ok(result.reasonCodes.includes('SUPERSESSION_NOT_PROVEN'))
})

test('Failure evidence is held', () => {
  const result = classify({ failureEvidence: true })
  assert.equal(result.retentionClass, 'FAILURE_EVIDENCE')
  assert.ok(result.holds.includes('failure_evidence_hold'))
})

test('Smoke evidence is held', () => {
  const result = classify({ smokeEvidence: true })
  assert.equal(result.retentionClass, 'SMOKE_EVIDENCE')
  assert.ok(result.holds.includes('smoke_evidence_hold'))
})

test('Missing job ID fails closed', () => {
  const result = classify({ lineage: { contractVersion: 'image-slot-contract/v1', attemptId: 'a', slotId: 'side' } })
  assert.equal(result.retentionClass, 'LEGACY_MANUAL_REVIEW')
  assert.ok(result.reasonCodes.includes('MISSING_JOB_ID'))
})

test('Missing attempt ID fails closed', () => {
  const result = classify({ lineage: { contractVersion: 'image-slot-contract/v1', jobId: '1', slotId: 'side' } })
  assert.ok(result.reasonCodes.includes('MISSING_ATTEMPT_ID'))
  assert.equal(result.quarantineEligibility, 'ineligible')
})

test('Missing slot ID fails closed', () => {
  const result = classify({ lineage: { contractVersion: 'image-slot-contract/v1', jobId: '1', attemptId: 'a' } })
  assert.ok(result.reasonCodes.includes('MISSING_SLOT_ID'))
})

test('Legacy lineage is manual review', () => {
  const result = classify({ lineage: { legacy: true } })
  assert.equal(result.lifecycle, 'legacy_unclassified')
  assert.equal(result.manualReviewRequired, true)
})

test('Orphan suspicion does not equal deletion eligibility', () => {
  const result = classify({ orphanSuspected: true })
  assert.equal(result.retentionClass, 'ORPHAN_REVIEW')
  assert.equal(result.physicalCleanupEligibility, 'ineligible')
})

test('Quarantine and physical cleanup are distinct', () => {
  const result = classify({ decisionAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' })
  assert.equal(result.quarantineEligibility, 'proposal_candidate')
  assert.notEqual(result.physicalCleanupEligibility, 'candidate_after_quarantine')
})

test('Recovery-window clock is deterministic', () => {
  const result = classify({ decisionAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' })
  assert.equal(result.earliestPossibleQuarantineAt, '2026-04-01T00:00:00.000Z')
})

test('A hold blocks otherwise eligible Media', () => {
  const result = classify({ decisionAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z', operatorHold: true })
  assert.notEqual(result.quarantineEligibility, 'proposal_candidate')
  assert.ok(result.holds.includes('operator_hold'))
})

test('Recent relationship changes reset eligibility', () => {
  const result = classify({
    decisionAt: '2025-01-01T00:00:00Z',
    relationshipChangedAt: '2026-07-27T12:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  })
  assert.equal(result.earliestPossibleQuarantineAt, '2026-10-25T12:00:00.000Z')
  assert.ok(result.reasonCodes.includes('RECENT_RELATIONSHIP_CHANGE'))
})

test('Partial approval preserves selected and separately classifies unselected Media', () => {
  const selected = classify({ decision: 'approved', jobStatus: 'approved', galleryAttached: true })
  const unselected = classify({ decision: 'partial_unselected', jobStatus: 'approved' })
  assert.equal(selected.retentionClass, 'PERMANENT_BUSINESS_ASSET')
  assert.equal(unselected.lifecycle, 'partially_approved_unselected')
  assert.equal(unselected.retentionClass, 'REJECTED_RECOVERABLE')
})

test('Blob missing with Media record becomes reconciliation-required', () => {
  const result = classify({ blobState: 'missing' })
  assert.equal(result.lifecycle, 'reconciliation_required')
  assert.equal(result.physicalCleanupEligibility, 'ineligible')
})

test('Media present but job missing becomes manual review', () => {
  const result = classify({ jobRecordExists: false })
  assert.equal(result.retentionClass, 'LEGACY_MANUAL_REVIEW')
  assert.ok(result.reasonCodes.includes('JOB_RECORD_MISSING'))
})

test('Job 428 fixture classifies as smoke evidence', () => {
  const result = classify({
    lineage: { contractVersion: 'image-slot-contract/v1', jobId: '428', attemptId: 'iga_smoke', slotId: 'detail' },
    smokeEvidence: true,
  })
  assert.equal(result.retentionClass, 'SMOKE_EVIDENCE')
})

test('Job 425 partial fixture preserves failure and rejected evidence', () => {
  const result = classify({
    lineage: { contractVersion: 'image-slot-contract/v1', jobId: '425', attemptId: 'iga_partial', slotId: 'top' },
    attemptStatus: 'partial',
    failureEvidence: true,
  })
  assert.equal(result.retentionClass, 'FAILURE_EVIDENCE')
  assert.ok(result.holds.includes('failure_evidence_hold'))
})

test('Job 426 with no Media produces no cleanup candidate', () => {
  const fixtureJob = {
    job_id: 426, product_id: 342, status: 'failed', created_at: NOW, updated_at: NOW,
    image_count: 0, active_attempt_id: 'iga_input', generation_contract_version: 'image-slot-contract/v1',
    generation_attempts: [], related_media_count: 0, lineage_media_count: 0,
  }
  const result = buildGeneratedMediaRetentionReport([], [fixtureJob] as never[], NOW).report
  assert.equal(result.totals.generatedMedia, 0)
  assert.equal(result.totals.physicalCleanupCandidates, 0)
})

test('Product 406 fixture classifies as failure evidence', () => {
  const result = classify({ failureEvidence: true, jobStatus: 'preview', decision: 'rejected' })
  assert.equal(result.retentionClass, 'FAILURE_EVIDENCE')
})

test('No path returns physical-delete authorization', () => {
  const variants = [
    evidence(),
    evidence({ decisionAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' }),
    evidence({ decision: 'superseded', replacementAttemptAccepted: true, supersededAt: '2025-01-01T00:00:00Z', quarantinedAt: '2025-05-01T00:00:00Z' }),
    evidence({ mediaKind: 'original' }),
    evidence({ decision: 'approved', galleryAttached: true }),
  ]
  assert.ok(variants.every((item) => classifyGeneratedMediaRetention(item).physicalDeleteAuthorization === false))
})

test('Dry run cannot call mutation methods', () => {
  const source = readFileSync(resolve(process.cwd(), 'scripts/generated-media-retention-dry-run.ts'), 'utf8')
  assert.ok(source.includes('BEGIN TRANSACTION READ ONLY'))
  assert.ok(source.includes("await client.query('ROLLBACK')"))
  assert.ok(!source.includes('getPayload'))
  assert.ok(!source.includes('payload.update'))
  assert.ok(!source.includes('payload.delete'))
  assert.ok(!source.includes('fetch('))
})

test('Policy output does not expose credentials or PII', () => {
  const serialized = JSON.stringify(classify())
  for (const forbidden of ['DATABASE_URI', 'TELEGRAM_BOT_TOKEN', 'customer', '@', 'password']) {
    assert.ok(!serialized.includes(forbidden))
  }
})

test('Timezone input does not change UTC eligibility result', () => {
  const utc = classify({ decisionAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' })
  const offset = classify({ decisionAt: '2026-01-01T03:00:00+03:00', updatedAt: '2026-01-01T03:00:00+03:00' })
  assert.equal(utc.earliestPossibleQuarantineAt, offset.earliestPossibleQuarantineAt)
})

assert.equal(tests, 30)
console.log(`Generated Media retention policy: ${tests}/30 deterministic scenarios passed.`)
