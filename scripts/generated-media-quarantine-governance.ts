import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildGeneratedMediaQuarantineProposalReport,
  mapGeneratedMediaRetentionDetailToQuarantineEvidence,
} from './generated-media-quarantine-proposal'
import type {
  GeneratedMediaRetentionDryRunReport,
  GeneratedMediaRetentionPrivateDetail,
} from './generated-media-retention-dry-run'

const read = (path: string) => readFileSync(path, 'utf8')
const contract = read('src/lib/generatedMediaQuarantine.ts')
const tests = read('src/lib/generatedMediaQuarantine.test.ts')
const reporter = read('scripts/generated-media-quarantine-proposal.ts')
const retentionReporter = read('scripts/generated-media-retention-dry-run.ts')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

for (const required of [
  '--confirm-read-only',
  "process.env.PAYLOAD_DB_PUSH = 'false'",
  "process.env.PAYLOAD_DB_PUSH !== 'false'",
  "['.env.local', '.env']",
  'runGeneratedMediaRetentionReadOnlySnapshot',
  'mapGeneratedMediaRetentionDetailToQuarantineEvidence',
  'buildGeneratedMediaContradictionGateEvidence',
  'evaluateGeneratedMediaQuarantineContradictions',
  'rawInputsMapped',
  'exactManifestsCreated: 0',
  'productionBatchesCreated: 0',
  'productionSchemaApplied: false',
  'quarantineAuthorization: false',
  'restoreAuthorization: false',
  'physicalDeleteAuthorization: false',
  'mutationPermission: false',
  'NO MEDIA, BLOB, JOB, PRODUCT, GALLERY, BATCH, SCHEMA, PROVIDER, TELEGRAM, QUARANTINE, RESTORE, OR DELETE MUTATION OCCURRED',
]) {
  assert.ok(reporter.includes(required), `proposal reporter must contain ${required}`)
}

for (const required of [
  'BEGIN TRANSACTION READ ONLY',
  'SHOW transaction_read_only',
  'SELECT',
  'ROLLBACK',
  "options: '-c default_transaction_read_only=on",
]) {
  assert.ok(retentionReporter.includes(required), `composed read-only reporter must contain ${required}`)
}
for (const forbiddenQuery of ['INSERT INTO', 'UPDATE media', 'DELETE FROM media', 'ALTER TABLE', 'DROP TABLE', 'CREATE TABLE']) {
  assert.ok(!retentionReporter.includes(forbiddenQuery), `composed read-only reporter must not contain ${forbiddenQuery}`)
}

for (const forbidden of [
  "from 'payload'",
  'getPayload',
  'payload.update',
  'payload.delete',
  'fetch(',
  'axios',
  'BLOB_READ_WRITE_TOKEN',
  'TELEGRAM_BOT_TOKEN',
]) {
  assert.ok(!reporter.includes(forbidden), `proposal reporter must not contain ${forbidden}`)
}

for (const required of [
  'canonicalJson',
  'sha256Canonical',
  'bridgeLegacyGeneratedMediaEvidence',
  'fingerprintGeneratedMediaRelationships',
  'fingerprintGeneratedMediaRelationshipsV1',
  'generated-media-relationship-fingerprint/v2',
  'generated-media-quarantine-manifest/v2',
  'evaluateGeneratedMediaQuarantineContradictions',
  'buildGeneratedMediaContradictionGateEvidence',
  'GENERATED_MEDIA_QUARANTINE_PERSISTENCE_CONTRACT',
  'fingerprintGeneratedMediaEvidence',
  'buildGeneratedMediaQuarantineManifest',
  'verifyGeneratedMediaQuarantineManifestHash',
  'revalidateGeneratedMediaQuarantineManifest',
  'buildGeneratedMediaRestoreProposal',
  'inventedLineageFields: []',
  'quarantineAuthorization: false',
  'physicalDeleteAuthorization: false',
  'productionApplyAuthorized: false',
]) {
  assert.ok(contract.includes(required), `quarantine contract must contain ${required}`)
}

for (const forbiddenAuthorization of [
  'quarantineAuthorization: true',
  'restoreAuthorization: true',
  'physicalDeleteAuthorization: true',
  'mutationPermission: true',
  'applyGeneratedMediaQuarantine',
  'deleteGeneratedMediaBlob',
  'deleteGeneratedMediaRecord',
]) {
  assert.ok(!contract.includes(forbiddenAuthorization), `quarantine contract must not contain ${forbiddenAuthorization}`)
  assert.ok(!reporter.includes(forbiddenAuthorization), `proposal reporter must not contain ${forbiddenAuthorization}`)
}

assert.ok(tests.includes('assert.equal(tests, 56)'))
assert.equal(packageJson.scripts?.['test:generated-media-quarantine'], 'tsx src/lib/generatedMediaQuarantine.test.ts && tsx scripts/generated-media-quarantine-governance.ts')
assert.equal(packageJson.scripts?.['dryrun:generated-media-quarantine-proposal'], 'tsx scripts/generated-media-quarantine-proposal.ts')
assert.ok(packageJson.scripts?.['pretest:safe']?.includes('npm run test:generated-media-quarantine'))
assert.ok(!packageJson.scripts?.['test:safe']?.includes('dryrun:generated-media-quarantine-proposal'))

const fixture: GeneratedMediaRetentionDryRunReport = {
  policyVersion: 'generated-media-retention/v1',
  runtimeCommit: 'fixture',
  profile: 'balanced-proposed-not-enforced',
  censusTimestamp: '2026-07-29T00:00:00.000Z',
  schemaState: {
    transactionReadOnly: true,
    lineageColumnsPresent: true,
    lifecycleColumnsPresent: false,
    quarantineColumnsPresent: false,
  },
  totals: {
    generatedMedia: 527,
    imageJobs: 127,
    jobsWithNoMedia: 8,
    jobsRepresentedByGeneratedMedia: 119,
    bytes: 106_666_309,
    quarantineProposalCandidates: 0,
    physicalCleanupCandidates: 0,
    physicalDeleteAuthorizations: 0,
    manualReview: 136,
    missingLineage: 513,
    approvedOrPublicIneligible: 174,
    smokeOrFailureEvidence: 14,
    pendingPreview: 203,
  },
  byLifecycle: {},
  byRetentionClass: {},
  byHold: {},
  byReason: {},
  bytesByRetentionClass: {},
  ageBands: {},
  knownCohorts: {
    job428: 'rejected;media=5',
    job425: 'rejected;media=4',
    job426: 'rejected;media=0',
    product406: 'failure_evidence_present',
    previewJobs: 44,
    previewMedia: 208,
  },
  noMutationStatement: 'fixture',
}
const report = buildGeneratedMediaQuarantineProposalReport(fixture)
assert.equal(report.classification, 'GENERATED_MEDIA_QUARANTINE_PROPOSAL_PASS_ZERO_CANDIDATES')
assert.equal(report.quarantineAuthorization, false)
assert.equal(report.physicalDeleteAuthorization, false)
assert.equal(report.proposalState.exactManifestsCreated, 0)

const mappedDetail: GeneratedMediaRetentionPrivateDetail = {
  mediaId: 10,
  productId: 349,
  jobId: 500,
  attemptId: 'iga_fixture',
  slotId: 'side',
  createdAt: '2026-01-01T00:00:00.000Z',
  bytes: 123_456,
  retentionEvidence: {
    now: fixture.censusTimestamp,
    mediaKind: 'generated',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    decisionAt: '2026-01-01T00:00:00.000Z',
    relationshipChangedAt: null,
    lineage: { contractVersion: 'image-slot-contract/v1', jobId: '500', attemptId: 'iga_fixture', slotId: 'side', legacy: false },
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
  },
  databaseFacts: {
    productImagesRelationship: false,
    productGenerativeGalleryRelationship: false,
    publicProductUsage: false,
    externalPublishingUsage: false,
    shopierUsage: false,
    imageQcOrBusinessAssetHold: false,
    jobStatus: 'rejected',
    orderDependency: 'unknown',
    durableBusinessDependency: false,
    campaignOrAdUsage: 'unknown',
    stalePreviewAwaitingDecision: 'unknown',
    operatorHold: 'unknown',
    legalHold: 'unknown',
    auditHold: 'unknown',
    lineageConsistent: true,
    blobObjectState: 'ambiguous',
  },
  decision: {
    policyVersion: 'generated-media-retention/v1',
    lifecycle: 'rejected',
    retentionClass: 'REJECTED_RECOVERABLE',
    holds: [],
    reasonCodes: ['PHYSICAL_DELETE_NEVER_AUTHORIZED_BY_CLASSIFIER', 'REJECTED_WITH_RECOVERY_WINDOW', 'QUARANTINE_NOT_IMPLEMENTED'],
    missingEvidence: [],
    quarantineEligibility: 'proposal_candidate',
    physicalCleanupEligibility: 'future_candidate',
    physicalDeleteAuthorization: false,
    earliestPossibleQuarantineAt: '2026-04-01T00:00:00.000Z',
    earliestPossiblePhysicalCleanupAt: null,
    manualReviewRequired: false,
    safeNextAction: 'fixture',
  },
}
const mapped = mapGeneratedMediaRetentionDetailToQuarantineEvidence(mappedDetail, fixture.censusTimestamp)
assert.equal(mapped.rawEvidence.orderDependency, 'unknown')
assert.equal(mapped.rawEvidence.campaignOrAdUsage, 'unknown')
assert.equal(mapped.rawEvidence.blobObjectState, 'ambiguous')
const mappedReport = buildGeneratedMediaQuarantineProposalReport(fixture, [mapped])
assert.equal(mappedReport.proposalState.rawInputsMapped, 1)
assert.equal(mappedReport.proposalState.contradictionGateProposalEligible, 0)
assert.equal(mappedReport.quarantineAuthorization, false)
assert.equal(mappedReport.physicalDeleteAuthorization, false)

console.log('GENERATED_MEDIA_QUARANTINE_FOUNDATION_GOVERNANCE_PASS')
