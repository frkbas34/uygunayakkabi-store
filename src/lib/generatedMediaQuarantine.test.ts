import assert from 'node:assert/strict'

import {
  bridgeLegacyGeneratedMediaEvidence,
  buildGeneratedMediaQuarantineManifest,
  buildGeneratedMediaRestoreProposal,
  canonicalJson,
  evaluateGeneratedMediaQuarantineContradictions,
  fingerprintGeneratedMediaRelationships,
  fingerprintGeneratedMediaRelationshipsV1,
  GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION,
  GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION_V1,
  GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
  GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION_V1,
  GENERATED_MEDIA_QUARANTINE_PERSISTENCE_CONTRACT,
  GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT,
  revalidateGeneratedMediaQuarantineManifest,
  sha256Canonical,
  verifyGeneratedMediaQuarantineManifestHash,
  type GeneratedMediaQuarantineEvidence,
  type GeneratedMediaQuarantineManifest,
  type GeneratedMediaQuarantineReceipt,
  type GeneratedMediaRawQuarantineEvidence,
} from './generatedMediaQuarantine'

const NOW = '2026-07-29T00:00:00.000Z'

function rawEvidence(overrides: Partial<GeneratedMediaRawQuarantineEvidence> = {}): GeneratedMediaRawQuarantineEvidence {
  return {
    evidenceCapturedAt: NOW,
    latestRelationshipActivityAt: '2026-01-01T00:00:00.000Z',
    originalMedia: false,
    productImagesRelationship: false,
    productGenerativeGalleryRelationship: false,
    approvedUsage: false,
    publicProductUsage: false,
    externalPublishingUsage: false,
    shopierUsage: false,
    orderDependency: false,
    durableBusinessDependency: false,
    campaignOrAdUsage: false,
    imageQcOrBusinessAssetHold: false,
    activeJob: false,
    queuedJob: false,
    generatingJob: false,
    pendingPreview: false,
    stalePreviewAwaitingDecision: false,
    pendingReviewOrApproval: false,
    smokeEvidenceHold: false,
    failureEvidenceHold: false,
    operatorHold: false,
    legalHold: false,
    auditHold: false,
    jobLineagePresent: true,
    attemptLineagePresent: true,
    slotLineagePresent: true,
    lineageConsistent: true,
    blobObjectState: 'present',
    ...overrides,
  }
}

function evidence(mediaId = '10', overrides: Partial<GeneratedMediaQuarantineEvidence> = {}): GeneratedMediaQuarantineEvidence {
  const relationships = {
    productId: '349',
    jobIds: ['500'],
    galleryPositions: [],
    originalImagePositions: [],
    publishedChannels: [],
    shopierProductIds: [],
    orderIds: [],
    campaignIds: [],
    activeJobIds: [],
    pendingDecisionJobIds: [],
    lastRelationshipChangeAt: '2026-01-01T00:00:00.000Z',
  }
  const explicitLineage = {
    contractVersion: 'image-slot-contract/v1',
    jobId: '500',
    attemptId: 'iga_fixture',
    slotId: 'side',
  }
  return {
    mediaId,
    mediaKind: 'generated',
    recordVersion: '2026-01-01T00:00:00.000Z',
    contentSha256: 'a'.repeat(64),
    storageLocatorDigest: 'b'.repeat(64),
    byteSize: 123_456,
    mimeType: 'image/jpeg',
    width: 1664,
    height: 1664,
    explicitLineage,
    observedJobRelationshipIds: ['500'],
    relationships,
    rawEvidence: rawEvidence(),
    retentionEvidence: {
      now: NOW,
      mediaKind: 'generated',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      decisionAt: '2026-01-01T00:00:00.000Z',
      relationshipChangedAt: '2026-01-01T00:00:00.000Z',
      quarantinedAt: null,
      lineage: { ...explicitLineage, legacy: false },
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
    evidenceReferenceIds: ['operator-decision:fixture'],
    ...overrides,
  }
}

function manifest(items = [evidence()]): GeneratedMediaQuarantineManifest {
  return buildGeneratedMediaQuarantineManifest({
    createdAt: NOW,
    expiresAt: '2026-07-30T00:00:00.000Z',
    runtimeCommit: 'fixture-commit',
    proposalSource: 'read_only_reporter',
    evidence: items,
  })
}

let tests = 0
function test(name: string, run: () => void): void {
  run()
  tests += 1
  console.log(`PASS ${tests}: ${name}`)
}

test('canonical JSON sorts object keys while preserving array order', () => {
  assert.equal(canonicalJson({ z: 1, a: [2, 1] }), '{"a":[2,1],"z":1}')
})

test('canonical SHA-256 is deterministic across object key order', () => {
  assert.equal(sha256Canonical({ b: 2, a: 1 }), sha256Canonical({ a: 1, b: 2 }))
})

test('canonical serialization rejects undefined instead of silently dropping it', () => {
  assert.throws(() => canonicalJson({ unsafe: undefined }), /Unsupported canonical value/)
})

test('relationship fingerprint normalizes set-like order', () => {
  const first = evidence().relationships
  const second = { ...first, jobIds: ['9', '500', '9'], publishedChannels: ['x', 'instagram'] }
  const third = { ...first, jobIds: ['500', '9'], publishedChannels: ['instagram', 'x'] }
  assert.equal(fingerprintGeneratedMediaRelationships(second, rawEvidence()), fingerprintGeneratedMediaRelationships(third, rawEvidence()))
})

test('Legacy Evidence Bridge preserves complete explicit lineage', () => {
  const bridged = bridgeLegacyGeneratedMediaEvidence({
    explicitLineage: evidence().explicitLineage,
    observedJobRelationshipIds: [500],
  })
  assert.equal(bridged.completeness, 'complete_explicit_lineage')
  assert.equal(bridged.manualReviewRequired, false)
  assert.deepEqual(bridged.inventedLineageFields, [])
})

test('Legacy Evidence Bridge never invents missing attempt or slot lineage', () => {
  const bridged = bridgeLegacyGeneratedMediaEvidence({
    explicitLineage: { contractVersion: null, jobId: null, attemptId: null, slotId: null },
    observedJobRelationshipIds: [500],
  })
  assert.equal(bridged.explicitLineage.jobId, null)
  assert.equal(bridged.explicitLineage.attemptId, null)
  assert.equal(bridged.explicitLineage.slotId, null)
  assert.equal(bridged.manualReviewRequired, true)
  assert.deepEqual(bridged.observedJobRelationshipIds, ['500'])
})

test('manifest is deterministic and targets use canonical Media order', () => {
  const first = manifest([evidence('20'), evidence('3')])
  const second = manifest([evidence('3'), evidence('20')])
  assert.equal(first.manifestHash, second.manifestHash)
  assert.deepEqual(first.targets.map((target) => target.mediaId), ['3', '20'])
})

test('manifest is immutable and its canonical hash verifies', () => {
  const result = manifest()
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.targets), true)
  assert.equal(verifyGeneratedMediaQuarantineManifestHash(result), true)
})

test('manifest creation is proposal-only and grants no mutation permission', () => {
  const result = manifest()
  assert.equal(result.quarantineProposal, true)
  assert.equal(result.quarantineAuthorization, false)
  assert.equal(result.restoreAuthorization, false)
  assert.equal(result.physicalDeleteAuthorization, false)
  assert.equal(result.mutationPermission, false)
})

test('original Media can never enter a quarantine proposal', () => {
  assert.throws(() => manifest([evidence('10', { mediaKind: 'original' })]), /original Media/)
})

test('legacy incomplete lineage fails manifest creation closed', () => {
  const item = evidence('10', {
    explicitLineage: { contractVersion: null, jobId: null, attemptId: null, slotId: null },
  })
  assert.throws(() => manifest([item]), /raw contradiction gate returned manual_review \(MISSING_ATTEMPT_LINEAGE\)/)
})

test('missing content SHA-256 fails manifest creation closed', () => {
  assert.throws(() => manifest([evidence('10', { contentSha256: null })]), /contentSha256/)
})

test('current holds prevent manifest creation', () => {
  const item = evidence()
  item.retentionEvidence.operatorHold = true
  assert.throws(() => manifest([item]), /raw contradiction gate returned quarantine_ineligible \(OPERATOR_HOLD\)/)
})

const contradictionCases: Array<{
  name: string
  overrides: Partial<GeneratedMediaRawQuarantineEvidence>
  outcome: 'quarantine_ineligible' | 'manual_review' | 'evidence_changed_reauthorize'
  code: string
}> = [
  { name: 'gallery relationship', overrides: { productGenerativeGalleryRelationship: true }, outcome: 'quarantine_ineligible', code: 'PRODUCT_GENERATIVE_GALLERY_RELATIONSHIP' },
  { name: 'approved usage', overrides: { approvedUsage: true }, outcome: 'quarantine_ineligible', code: 'APPROVED_USAGE' },
  { name: 'Products.images relationship', overrides: { productImagesRelationship: true }, outcome: 'quarantine_ineligible', code: 'PRODUCT_IMAGES_RELATIONSHIP' },
  { name: 'public usage', overrides: { publicProductUsage: true }, outcome: 'quarantine_ineligible', code: 'PUBLIC_PRODUCT_USAGE' },
  { name: 'external publishing', overrides: { externalPublishingUsage: true }, outcome: 'quarantine_ineligible', code: 'EXTERNAL_PUBLISHING_USAGE' },
  { name: 'Shopier usage', overrides: { shopierUsage: true }, outcome: 'quarantine_ineligible', code: 'SHOPIER_USAGE' },
  { name: 'order dependency', overrides: { orderDependency: true }, outcome: 'quarantine_ineligible', code: 'ORDER_DEPENDENCY' },
  { name: 'durable business dependency', overrides: { durableBusinessDependency: true }, outcome: 'quarantine_ineligible', code: 'DURABLE_BUSINESS_DEPENDENCY' },
  { name: 'campaign or ad usage', overrides: { campaignOrAdUsage: true }, outcome: 'quarantine_ineligible', code: 'CAMPAIGN_OR_AD_USAGE' },
  { name: 'Image QC or business hold', overrides: { imageQcOrBusinessAssetHold: true }, outcome: 'quarantine_ineligible', code: 'IMAGE_QC_OR_BUSINESS_ASSET_HOLD' },
  { name: 'active job', overrides: { activeJob: true }, outcome: 'quarantine_ineligible', code: 'ACTIVE_JOB' },
  { name: 'queued job', overrides: { queuedJob: true }, outcome: 'quarantine_ineligible', code: 'QUEUED_JOB' },
  { name: 'generating job', overrides: { generatingJob: true }, outcome: 'quarantine_ineligible', code: 'GENERATING_JOB' },
  { name: 'pending preview', overrides: { pendingPreview: true }, outcome: 'quarantine_ineligible', code: 'PENDING_PREVIEW' },
  { name: 'stale preview awaiting decision', overrides: { stalePreviewAwaitingDecision: true }, outcome: 'quarantine_ineligible', code: 'STALE_PREVIEW_AWAITING_DECISION' },
  { name: 'pending operator review', overrides: { pendingReviewOrApproval: true }, outcome: 'quarantine_ineligible', code: 'PENDING_REVIEW_OR_APPROVAL' },
  { name: 'smoke evidence hold', overrides: { smokeEvidenceHold: true }, outcome: 'quarantine_ineligible', code: 'SMOKE_EVIDENCE_HOLD' },
  { name: 'failure evidence hold', overrides: { failureEvidenceHold: true }, outcome: 'quarantine_ineligible', code: 'FAILURE_EVIDENCE_HOLD' },
  { name: 'operator hold', overrides: { operatorHold: true }, outcome: 'quarantine_ineligible', code: 'OPERATOR_HOLD' },
  { name: 'legal hold', overrides: { legalHold: true }, outcome: 'quarantine_ineligible', code: 'LEGAL_HOLD' },
  { name: 'audit hold', overrides: { auditHold: true }, outcome: 'quarantine_ineligible', code: 'AUDIT_HOLD' },
  { name: 'missing job lineage', overrides: { jobLineagePresent: false }, outcome: 'manual_review', code: 'MISSING_JOB_LINEAGE' },
  { name: 'missing attempt lineage', overrides: { attemptLineagePresent: false }, outcome: 'manual_review', code: 'MISSING_ATTEMPT_LINEAGE' },
  { name: 'missing slot lineage', overrides: { slotLineagePresent: false }, outcome: 'manual_review', code: 'MISSING_SLOT_LINEAGE' },
  { name: 'conflicting job attempt slot evidence', overrides: { lineageConsistent: false }, outcome: 'manual_review', code: 'CONFLICTING_LINEAGE' },
  { name: 'ambiguous Blob state', overrides: { blobObjectState: 'ambiguous' }, outcome: 'manual_review', code: 'AMBIGUOUS_BLOB_OBJECT_STATE' },
  { name: 'relationship activity after capture', overrides: { latestRelationshipActivityAt: '2026-07-30T00:00:00.000Z' }, outcome: 'evidence_changed_reauthorize', code: 'RELATIONSHIP_ACTIVITY_AFTER_EVIDENCE_CAPTURE' },
  { name: 'unknown raw dependency', overrides: { orderDependency: 'unknown' }, outcome: 'manual_review', code: 'ORDER_DEPENDENCY' },
]

for (const scenario of contradictionCases) {
  test(`raw contradiction gate fails closed for ${scenario.name}`, () => {
    const result = evaluateGeneratedMediaQuarantineContradictions(rawEvidence(scenario.overrides))
    assert.equal(result.outcome, scenario.outcome)
    assert.ok(result.blockerCodes.includes(scenario.code as never))
    assert.equal(result.quarantineAuthorization, false)
    assert.equal(result.physicalDeleteAuthorization, false)
    assert.equal(result.mutationPermission, false)
  })
}

test('contradiction precedence chooses permanent relationship before active state and holds', () => {
  const result = evaluateGeneratedMediaQuarantineContradictions(rawEvidence({
    productImagesRelationship: true,
    activeJob: true,
    operatorHold: true,
  }))
  assert.equal(result.precedence, 1)
  assert.equal(result.primaryCode, 'PRODUCT_IMAGES_RELATIONSHIP')
})

test('contradictory raw evidence cannot enter a manifest even when summarized retention evidence is eligible', () => {
  const item = evidence('10', { rawEvidence: rawEvidence({ productGenerativeGalleryRelationship: true }) })
  assert.throws(() => manifest([item]), /raw contradiction gate returned quarantine_ineligible/)
})

test('relationship fingerprint v1 and v2 are domain-separated', () => {
  const relationships = evidence().relationships
  assert.equal(GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION_V1, 'generated-media-relationship-fingerprint/v1')
  assert.equal(GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION, 'generated-media-relationship-fingerprint/v2')
  assert.notEqual(
    fingerprintGeneratedMediaRelationshipsV1(relationships),
    fingerprintGeneratedMediaRelationships(relationships, rawEvidence()),
  )
})

test('material contradiction evidence changes the v2 relationship fingerprint', () => {
  const relationships = evidence().relationships
  assert.notEqual(
    fingerprintGeneratedMediaRelationships(relationships, rawEvidence()),
    fingerprintGeneratedMediaRelationships(relationships, rawEvidence({ campaignOrAdUsage: true })),
  )
})

test('manifest v2 pins relationship fingerprint v2 while v1 remains historical', () => {
  const result = manifest()
  assert.equal(GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION_V1, 'generated-media-quarantine-manifest/v1')
  assert.equal(result.manifestVersion, GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION)
  assert.equal(result.targets[0]?.relationshipFingerprintVersion, GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION)
})

test('unchanged manifest revalidation remains proposal eligible but unauthorized', () => {
  const item = evidence()
  const result = revalidateGeneratedMediaQuarantineManifest({ manifest: manifest([item]), checkedAt: NOW, evidence: [item] })
  assert.equal(result.proposalStillEligible, true)
  assert.equal(result.quarantineAuthorization, false)
  assert.equal(result.mutationPermission, false)
})

test('tampered manifest hash fails revalidation', () => {
  const item = evidence()
  const changed = { ...manifest([item]), manifestHash: 'c'.repeat(64) }
  const result = revalidateGeneratedMediaQuarantineManifest({ manifest: changed, checkedAt: NOW, evidence: [item] })
  assert.ok(result.issues.some((issue) => issue.code === 'MANIFEST_HASH_MISMATCH'))
})

test('expired manifest fails revalidation and grants no authorization', () => {
  const item = evidence()
  const result = revalidateGeneratedMediaQuarantineManifest({
    manifest: manifest([item]),
    checkedAt: '2026-07-31T00:00:00.000Z',
    evidence: [item],
  })
  assert.ok(result.issues.some((issue) => issue.code === 'MANIFEST_EXPIRED'))
  assert.equal(result.proposalStillEligible, false)
  assert.equal(result.quarantineAuthorization, false)
})

test('relationship drift fails revalidation closed', () => {
  const item = evidence()
  const original = manifest([item])
  const changed = evidence('10', { relationships: { ...item.relationships, galleryPositions: [0] } })
  const result = revalidateGeneratedMediaQuarantineManifest({ manifest: original, checkedAt: NOW, evidence: [changed] })
  assert.ok(result.issues.some((issue) => issue.code === 'RELATIONSHIP_FINGERPRINT_CHANGED'))
  assert.equal(result.proposalStillEligible, false)
})

test('evidence changed after manifest creation requires reauthorization', () => {
  const item = evidence()
  const original = manifest([item])
  const changed = evidence('10', {
    rawEvidence: rawEvidence({ latestRelationshipActivityAt: '2026-02-01T00:00:00.000Z' }),
  })
  const result = revalidateGeneratedMediaQuarantineManifest({ manifest: original, checkedAt: NOW, evidence: [changed] })
  assert.equal(result.outcome, 'evidence_changed_reauthorize')
  assert.ok(result.issues.some((issue) => issue.code === 'RELATIONSHIP_FINGERPRINT_CHANGED'))
  assert.equal(result.quarantineAuthorization, false)
  assert.equal(result.physicalDeleteAuthorization, false)
})

test('content drift fails revalidation closed', () => {
  const item = evidence()
  const original = manifest([item])
  const changed = evidence('10', { contentSha256: 'd'.repeat(64) })
  const result = revalidateGeneratedMediaQuarantineManifest({ manifest: original, checkedAt: NOW, evidence: [changed] })
  assert.ok(result.issues.some((issue) => issue.code === 'CONTENT_FINGERPRINT_CHANGED'))
})

test('target-set drift fails revalidation closed', () => {
  const first = evidence('10')
  const second = evidence('11')
  const result = revalidateGeneratedMediaQuarantineManifest({ manifest: manifest([first]), checkedAt: NOW, evidence: [first, second] })
  assert.ok(result.issues.some((issue) => issue.code === 'TARGET_SET_CHANGED'))
})

test('restore proposal is reversible-contract-only and never authorization', () => {
  const item = evidence()
  const relationshipFingerprint = fingerprintGeneratedMediaRelationships(
    item.relationships,
    rawEvidence(),
  )
  const receipt: GeneratedMediaQuarantineReceipt = {
    contractVersion: 'generated-media-quarantine/v1',
    manifestId: 'gqm_fixture',
    manifestHash: 'a'.repeat(64),
    mediaId: '10',
    quarantinedAt: '2026-07-29T00:00:00.000Z',
    restoreDeadline: '2026-09-27T00:00:00.000Z',
    blobRetained: true,
    reversibleMetadataReceiptHash: 'b'.repeat(64),
    contentSha256: 'c'.repeat(64),
    storageLocatorDigest: 'd'.repeat(64),
    relationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    priorRelationshipFingerprint: relationshipFingerprint,
    priorEvidenceFingerprint: 'e'.repeat(64),
    holdsAtQuarantine: [],
  }
  const result = buildGeneratedMediaRestoreProposal({
    receipt,
    proposedAt: NOW,
    currentContentSha256: receipt.contentSha256,
    currentStorageLocatorDigest: receipt.storageLocatorDigest,
    currentRelationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    currentRelationshipFingerprint: relationshipFingerprint,
    currentEvidenceFingerprint: receipt.priorEvidenceFingerprint,
    currentHolds: [],
  })
  assert.equal(result.proposalEligible, true)
  assert.equal(result.restoreAuthorization, false)
  assert.equal(result.physicalDeleteAuthorization, false)
  assert.equal(result.mutationPermission, false)
})

test('expired restore window fails closed', () => {
  const item = evidence()
  const relationshipFingerprint = fingerprintGeneratedMediaRelationships(item.relationships, rawEvidence())
  const receipt: GeneratedMediaQuarantineReceipt = {
    contractVersion: 'generated-media-quarantine/v1',
    manifestId: 'gqm_fixture',
    manifestHash: 'a'.repeat(64),
    mediaId: '10',
    quarantinedAt: '2026-01-01T00:00:00.000Z',
    restoreDeadline: '2026-02-01T00:00:00.000Z',
    blobRetained: true,
    reversibleMetadataReceiptHash: 'b'.repeat(64),
    contentSha256: 'c'.repeat(64),
    storageLocatorDigest: 'd'.repeat(64),
    relationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    priorRelationshipFingerprint: relationshipFingerprint,
    priorEvidenceFingerprint: 'e'.repeat(64),
    holdsAtQuarantine: [],
  }
  const result = buildGeneratedMediaRestoreProposal({
    receipt,
    proposedAt: NOW,
    currentContentSha256: receipt.contentSha256,
    currentStorageLocatorDigest: receipt.storageLocatorDigest,
    currentRelationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    currentRelationshipFingerprint: relationshipFingerprint,
    currentEvidenceFingerprint: receipt.priorEvidenceFingerprint,
    currentHolds: [],
  })
  assert.equal(result.proposalEligible, false)
  assert.ok(result.issues.includes('restore_deadline_elapsed'))
})

test('schema contract is expand-first and authorizes no production apply', () => {
  assert.equal(GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT.rollout, 'expand_before_runtime')
  assert.equal(GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT.automaticMigrationAllowed, false)
  assert.equal(GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT.productionApplyAuthorized, false)
  assert.equal(GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT.defaults.physicalDeleteAuthorization, false)
  assert.equal(GENERATED_MEDIA_QUARANTINE_PERSISTENCE_CONTRACT.authorizationDefaults.quarantineAuthorization, false)
  assert.equal(GENERATED_MEDIA_QUARANTINE_PERSISTENCE_CONTRACT.immutableHistory.appendOnly, true)
})

assert.equal(tests, 56)
console.log(`Generated Media quarantine foundation: ${tests}/56 deterministic scenarios passed.`)
