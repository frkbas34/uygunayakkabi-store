import { createHash } from 'node:crypto'

import {
  classifyGeneratedMediaRetention,
  GENERATED_MEDIA_RETENTION_PROFILES,
  type GeneratedMediaRetentionDecision,
  type GeneratedMediaRetentionEvidence,
  type GeneratedMediaRetentionProfile,
} from './generatedMediaRetentionPolicy'

export const GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION = 'generated-media-quarantine/v1' as const
export const GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION_V1 = 'generated-media-quarantine-manifest/v1' as const
export const GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION = 'generated-media-quarantine-manifest/v2' as const
export const GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION = 'generated-media-quarantine-schema/v1' as const
export const GENERATED_MEDIA_LEGACY_EVIDENCE_BRIDGE_VERSION = 'generated-media-legacy-evidence-bridge/v1' as const
export const GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION_V1 = 'generated-media-relationship-fingerprint/v1' as const
export const GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION = 'generated-media-relationship-fingerprint/v2' as const

export type Sha256Hex = string

export type GeneratedMediaExplicitLineage = {
  contractVersion: string | null
  jobId: string | null
  attemptId: string | null
  slotId: string | null
}

export type GeneratedMediaLegacyEvidenceBridge = {
  bridgeVersion: typeof GENERATED_MEDIA_LEGACY_EVIDENCE_BRIDGE_VERSION
  explicitLineage: GeneratedMediaExplicitLineage
  observedJobRelationshipIds: string[]
  completeness: 'complete_explicit_lineage' | 'legacy_incomplete_lineage'
  missingFields: Array<keyof GeneratedMediaExplicitLineage>
  manualReviewRequired: boolean
  inventedLineageFields: []
  safeNextAction: string
}

export type GeneratedMediaRelationshipSnapshot = {
  productId: string | null
  jobIds: string[]
  galleryPositions: number[]
  originalImagePositions: number[]
  publishedChannels: string[]
  shopierProductIds: string[]
  orderIds: string[]
  campaignIds: string[]
  activeJobIds: string[]
  pendingDecisionJobIds: string[]
  lastRelationshipChangeAt: string | null
}

export type GeneratedMediaEvidenceSignal = boolean | 'unknown'
export type GeneratedMediaBlobObjectState = 'present' | 'missing' | 'ambiguous' | 'unknown'

export type GeneratedMediaRawQuarantineEvidence = {
  evidenceCapturedAt: string | null
  latestRelationshipActivityAt: string | null
  originalMedia: GeneratedMediaEvidenceSignal
  productImagesRelationship: GeneratedMediaEvidenceSignal
  productGenerativeGalleryRelationship: GeneratedMediaEvidenceSignal
  approvedUsage: GeneratedMediaEvidenceSignal
  publicProductUsage: GeneratedMediaEvidenceSignal
  externalPublishingUsage: GeneratedMediaEvidenceSignal
  shopierUsage: GeneratedMediaEvidenceSignal
  orderDependency: GeneratedMediaEvidenceSignal
  durableBusinessDependency: GeneratedMediaEvidenceSignal
  campaignOrAdUsage: GeneratedMediaEvidenceSignal
  imageQcOrBusinessAssetHold: GeneratedMediaEvidenceSignal
  activeJob: GeneratedMediaEvidenceSignal
  queuedJob: GeneratedMediaEvidenceSignal
  generatingJob: GeneratedMediaEvidenceSignal
  pendingPreview: GeneratedMediaEvidenceSignal
  stalePreviewAwaitingDecision: GeneratedMediaEvidenceSignal
  pendingReviewOrApproval: GeneratedMediaEvidenceSignal
  smokeEvidenceHold: GeneratedMediaEvidenceSignal
  failureEvidenceHold: GeneratedMediaEvidenceSignal
  operatorHold: GeneratedMediaEvidenceSignal
  legalHold: GeneratedMediaEvidenceSignal
  auditHold: GeneratedMediaEvidenceSignal
  jobLineagePresent: GeneratedMediaEvidenceSignal
  attemptLineagePresent: GeneratedMediaEvidenceSignal
  slotLineagePresent: GeneratedMediaEvidenceSignal
  lineageConsistent: GeneratedMediaEvidenceSignal
  blobObjectState: GeneratedMediaBlobObjectState
}

export type GeneratedMediaContradictionOutcome =
  | 'proposal_eligible'
  | 'quarantine_ineligible'
  | 'manual_review'
  | 'evidence_changed_reauthorize'

export type GeneratedMediaContradictionCode =
  | 'ORIGINAL_MEDIA'
  | 'PRODUCT_IMAGES_RELATIONSHIP'
  | 'DURABLE_BUSINESS_DEPENDENCY'
  | 'PUBLIC_PRODUCT_USAGE'
  | 'EXTERNAL_PUBLISHING_USAGE'
  | 'SHOPIER_USAGE'
  | 'ORDER_DEPENDENCY'
  | 'CAMPAIGN_OR_AD_USAGE'
  | 'PRODUCT_GENERATIVE_GALLERY_RELATIONSHIP'
  | 'APPROVED_USAGE'
  | 'ACTIVE_JOB'
  | 'QUEUED_JOB'
  | 'GENERATING_JOB'
  | 'PENDING_PREVIEW'
  | 'STALE_PREVIEW_AWAITING_DECISION'
  | 'PENDING_REVIEW_OR_APPROVAL'
  | 'IMAGE_QC_OR_BUSINESS_ASSET_HOLD'
  | 'SMOKE_EVIDENCE_HOLD'
  | 'FAILURE_EVIDENCE_HOLD'
  | 'OPERATOR_HOLD'
  | 'LEGAL_HOLD'
  | 'AUDIT_HOLD'
  | 'MISSING_JOB_LINEAGE'
  | 'MISSING_ATTEMPT_LINEAGE'
  | 'MISSING_SLOT_LINEAGE'
  | 'CONFLICTING_LINEAGE'
  | 'AMBIGUOUS_BLOB_OBJECT_STATE'
  | 'MISSING_OR_INVALID_EVIDENCE_CAPTURE_TIME'
  | 'MISSING_OR_INVALID_RELATIONSHIP_ACTIVITY_TIME'
  | 'RELATIONSHIP_ACTIVITY_AFTER_EVIDENCE_CAPTURE'

export type GeneratedMediaContradictionResult = {
  outcome: GeneratedMediaContradictionOutcome
  precedence: number | null
  primaryCode: GeneratedMediaContradictionCode | null
  blockerCodes: GeneratedMediaContradictionCode[]
  quarantineAuthorization: false
  physicalDeleteAuthorization: false
  mutationPermission: false
}

export type GeneratedMediaQuarantineEvidence = {
  mediaId: string
  mediaKind: 'original' | 'generated'
  recordVersion: string
  contentSha256: Sha256Hex | null
  storageLocatorDigest: Sha256Hex | null
  byteSize: number | null
  mimeType: string | null
  width: number | null
  height: number | null
  explicitLineage: GeneratedMediaExplicitLineage
  observedJobRelationshipIds: string[]
  relationships: GeneratedMediaRelationshipSnapshot
  rawEvidence: GeneratedMediaRawQuarantineEvidence
  retentionEvidence: GeneratedMediaRetentionEvidence
  evidenceReferenceIds: string[]
}

export type GeneratedMediaQuarantineTarget = {
  mediaId: string
  recordVersion: string
  contentSha256: Sha256Hex
  storageLocatorDigest: Sha256Hex
  byteSize: number
  mimeType: string
  width: number
  height: number
  lineage: GeneratedMediaExplicitLineage
  relationshipFingerprintVersion: typeof GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION
  relationshipFingerprint: Sha256Hex
  evidenceFingerprint: Sha256Hex
  retentionPolicyVersion: string
  retentionClass: GeneratedMediaRetentionDecision['retentionClass']
  reasonCodes: string[]
  holds: string[]
  intendedTransition: 'proposal_only_to_quarantined_recoverable'
  restoreDeadline: string
  preconditions: readonly [
    'exact_manifest_hash_required',
    'fresh_relationship_fingerprint_required',
    'fresh_evidence_fingerprint_required',
    'explicit_operator_authorization_required',
    'blob_must_remain_retained',
  ]
}

export type GeneratedMediaQuarantineManifest = {
  contractVersion: typeof GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION
  manifestVersion: typeof GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION
  schemaContractVersion: typeof GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION
  manifestId: `gqm_${string}`
  manifestHash: Sha256Hex
  createdAt: string
  expiresAt: string
  runtimeCommit: string
  proposalSource: 'read_only_reporter' | 'operator_review'
  retentionProfile: GeneratedMediaRetentionProfile
  targets: GeneratedMediaQuarantineTarget[]
  targetCount: number
  quarantineProposal: true
  quarantineAuthorization: false
  restoreAuthorization: false
  physicalDeleteAuthorization: false
  mutationPermission: false
}

export type GeneratedMediaQuarantineRevalidationCode =
  | 'MANIFEST_HASH_MISMATCH'
  | 'TARGET_SET_CHANGED'
  | 'TARGET_EVIDENCE_MISSING'
  | 'ORIGINAL_MEDIA_FORBIDDEN'
  | 'LEGACY_LINEAGE_INCOMPLETE'
  | 'CONTENT_FINGERPRINT_CHANGED'
  | 'STORAGE_FINGERPRINT_CHANGED'
  | 'RELATIONSHIP_FINGERPRINT_CHANGED'
  | 'EVIDENCE_FINGERPRINT_CHANGED'
  | 'RETENTION_NO_LONGER_PROPOSAL_ELIGIBLE'
  | 'HOLD_PRESENT'
  | 'PHYSICAL_AUTHORIZATION_INVARIANT_BROKEN'
  | 'MANIFEST_EXPIRED'
  | 'RELATIONSHIP_FINGERPRINT_VERSION_MISMATCH'
  | 'RAW_CONTRADICTION_INELIGIBLE'
  | 'RAW_EVIDENCE_MANUAL_REVIEW'
  | 'RAW_EVIDENCE_CHANGED_REAUTHORIZE'

export type GeneratedMediaQuarantineRevalidation = {
  contractVersion: typeof GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION
  manifestId: string
  manifestHash: string
  checkedAt: string
  proposalStillEligible: boolean
  outcome: GeneratedMediaContradictionOutcome
  issues: Array<{ mediaId: string | null; code: GeneratedMediaQuarantineRevalidationCode }>
  quarantineAuthorization: false
  restoreAuthorization: false
  physicalDeleteAuthorization: false
  mutationPermission: false
  safeNextAction: string
}

export type GeneratedMediaQuarantineReceipt = {
  contractVersion: typeof GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION
  manifestId: string
  manifestHash: string
  mediaId: string
  quarantinedAt: string
  restoreDeadline: string
  blobRetained: true
  reversibleMetadataReceiptHash: Sha256Hex
  contentSha256: Sha256Hex
  storageLocatorDigest: Sha256Hex
  relationshipFingerprintVersion: typeof GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION
  priorRelationshipFingerprint: Sha256Hex
  priorEvidenceFingerprint: Sha256Hex
  holdsAtQuarantine: string[]
}

export type GeneratedMediaRestoreProposal = {
  contractVersion: typeof GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION
  manifestId: string
  manifestHash: string
  mediaId: string
  proposedAt: string
  restoreDeadline: string
  proposalEligible: boolean
  issues: string[]
  restoreAuthorization: false
  quarantineAuthorization: false
  physicalDeleteAuthorization: false
  mutationPermission: false
  safeNextAction: string
}

export type GeneratedMediaQuarantineProposalState =
  | 'not_proposed'
  | 'proposed_unauthorized'
  | 'expired'
  | 'invalidated_evidence_changed'
  | 'quarantine_ineligible'
  | 'manual_review'

export type GeneratedMediaQuarantineAuthorizationState =
  | 'not_authorized'
  | 'exact_manifest_authorization_required'
  | 'expired'
  | 'revoked'

export type GeneratedMediaQuarantineStatus = 'not_quarantined' | 'quarantined_recoverable' | 'restored'
export type GeneratedMediaRestoreStatus = 'not_requested' | 'proposed_unauthorized' | 'restored' | 'expired' | 'blocked'

export const GENERATED_MEDIA_QUARANTINE_PERSISTENCE_CONTRACT = deepFreeze({
  manifest: {
    currentVersion: GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION,
    historicalVersions: [GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION_V1],
    requiredFields: ['manifestVersion', 'manifestHash', 'manifestId', 'createdAt', 'expiresAt', 'canonicalManifest'],
  },
  relationshipFingerprint: {
    currentVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    historicalVersions: [GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION_V1],
    requiredFields: ['relationshipFingerprintVersion', 'relationshipFingerprint'],
  },
  proposalStates: [
    'not_proposed',
    'proposed_unauthorized',
    'expired',
    'invalidated_evidence_changed',
    'quarantine_ineligible',
    'manual_review',
  ] satisfies GeneratedMediaQuarantineProposalState[],
  authorizationStates: [
    'not_authorized',
    'exact_manifest_authorization_required',
    'expired',
    'revoked',
  ] satisfies GeneratedMediaQuarantineAuthorizationState[],
  evidenceChangeInvalidation: {
    required: true,
    invalidatesProposal: true,
    requiresFreshManifest: true,
    outcome: 'evidence_changed_reauthorize',
  },
  quarantineStatuses: ['not_quarantined', 'quarantined_recoverable', 'restored'] satisfies GeneratedMediaQuarantineStatus[],
  restoreStatuses: ['not_requested', 'proposed_unauthorized', 'restored', 'expired', 'blocked'] satisfies GeneratedMediaRestoreStatus[],
  immutableHistory: {
    eventHistoryRequired: true,
    receiptHistoryRequired: true,
    appendOnly: true,
  },
  authorizationDefaults: {
    quarantineAuthorization: false,
    restoreAuthorization: false,
    physicalDeleteAuthorization: false,
    mutationPermission: false,
  },
} as const)

export const GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT = deepFreeze({
  version: GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION,
  rollout: 'expand_before_runtime',
  automaticMigrationAllowed: false,
  productionApplyAuthorized: false,
  mediaProjectionFields: [
    'retentionLifecycle',
    'retentionClass',
    'retentionPolicyVersion',
    'contentSha256',
    'storageLocatorDigest',
    'holds',
    'proposalState',
    'authorizationState',
    'proposalExpiresAt',
    'evidenceInvalidatedAt',
    'evidenceInvalidationReason',
    'relationshipFingerprintVersion',
    'relationshipFingerprint',
    'evidenceFingerprint',
    'quarantineState',
    'quarantineManifestHash',
    'quarantinedAt',
    'restoreDeadline',
    'restoreStatus',
    'quarantineReceiptHash',
  ],
  immutableEventCollection: 'generated-media-retention-events',
  immutableBatchCollection: 'generated-media-quarantine-batches',
  requiredEventFields: [
    'eventId',
    'mediaId',
    'eventType',
    'policyVersion',
    'manifestVersion',
    'manifestHash',
    'relationshipFingerprintVersion',
    'relationshipFingerprint',
    'evidenceFingerprint',
    'actorTier',
    'reasonCodes',
    'occurredAt',
  ],
  requiredBatchFields: [
    'manifestId',
    'manifestHash',
    'manifestVersion',
    'relationshipFingerprintVersion',
    'canonicalManifest',
    'targetCount',
    'proposalCreatedAt',
    'proposalExpiresAt',
    'proposalState',
    'authorizationState',
  ],
  defaults: {
    quarantineAuthorization: false,
    restoreAuthorization: false,
    physicalDeleteAuthorization: false,
  },
} as const)

const SHA256_PATTERN = /^[a-f0-9]{64}$/
const DAY_MS = 86_400_000

function assertIso(value: string, field: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`${field} must be a valid ISO timestamp.`)
  return new Date(timestamp).toISOString()
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function uniqueSorted(values: readonly unknown[]): string[] {
  return [...new Set(values.map(cleanString).filter((value): value is string => Boolean(value)))].sort()
}

function uniqueSortedNumbers(values: readonly unknown[]): number[] {
  return [...new Set(values.filter((value): value is number => Number.isInteger(value) && Number(value) >= 0))].sort((a, b) => a - b)
}

function normalizeLineage(lineage: GeneratedMediaExplicitLineage): GeneratedMediaExplicitLineage {
  return {
    contractVersion: cleanString(lineage.contractVersion),
    jobId: cleanString(lineage.jobId),
    attemptId: cleanString(lineage.attemptId),
    slotId: cleanString(lineage.slotId),
  }
}

export function bridgeLegacyGeneratedMediaEvidence(input: {
  explicitLineage: GeneratedMediaExplicitLineage
  observedJobRelationshipIds?: readonly (string | number | null | undefined)[]
}): GeneratedMediaLegacyEvidenceBridge {
  const explicitLineage = normalizeLineage(input.explicitLineage)
  const observedJobRelationshipIds = uniqueSorted(
    (input.observedJobRelationshipIds ?? [])
      .filter((value): value is string | number => value !== null && value !== undefined)
      .map(String),
  )
  const fields: Array<keyof GeneratedMediaExplicitLineage> = ['contractVersion', 'jobId', 'attemptId', 'slotId']
  const missingFields = fields.filter((field) => !explicitLineage[field])
  const complete = missingFields.length === 0
  return deepFreeze({
    bridgeVersion: GENERATED_MEDIA_LEGACY_EVIDENCE_BRIDGE_VERSION,
    explicitLineage,
    observedJobRelationshipIds,
    completeness: complete ? 'complete_explicit_lineage' : 'legacy_incomplete_lineage',
    missingFields,
    manualReviewRequired: !complete,
    inventedLineageFields: [],
    safeNextAction: complete
      ? 'Use only the explicit durable lineage and independently observed relationships.'
      : 'Preserve as legacy evidence; do not infer attempt or slot identity from position, count, filename, or job recency.',
  })
}

export function normalizeGeneratedMediaRelationshipSnapshot(
  value: GeneratedMediaRelationshipSnapshot,
): GeneratedMediaRelationshipSnapshot {
  return {
    productId: cleanString(value.productId),
    jobIds: uniqueSorted(value.jobIds),
    galleryPositions: uniqueSortedNumbers(value.galleryPositions),
    originalImagePositions: uniqueSortedNumbers(value.originalImagePositions),
    publishedChannels: uniqueSorted(value.publishedChannels),
    shopierProductIds: uniqueSorted(value.shopierProductIds),
    orderIds: uniqueSorted(value.orderIds),
    campaignIds: uniqueSorted(value.campaignIds),
    activeJobIds: uniqueSorted(value.activeJobIds),
    pendingDecisionJobIds: uniqueSorted(value.pendingDecisionJobIds),
    lastRelationshipChangeAt: value.lastRelationshipChangeAt
      ? assertIso(value.lastRelationshipChangeAt, 'lastRelationshipChangeAt')
      : null,
  }
}

function normalizeSignal(value: unknown): GeneratedMediaEvidenceSignal {
  return value === true || value === false ? value : 'unknown'
}

function normalizeNullableIso(value: unknown): string | null {
  const normalized = cleanString(value)
  if (!normalized) return null
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

export function normalizeGeneratedMediaRawQuarantineEvidence(
  value: GeneratedMediaRawQuarantineEvidence,
): GeneratedMediaRawQuarantineEvidence {
  const blobObjectState = ['present', 'missing', 'ambiguous', 'unknown'].includes(String(value.blobObjectState))
    ? value.blobObjectState
    : 'unknown'
  return {
    evidenceCapturedAt: normalizeNullableIso(value.evidenceCapturedAt),
    latestRelationshipActivityAt: normalizeNullableIso(value.latestRelationshipActivityAt),
    originalMedia: normalizeSignal(value.originalMedia),
    productImagesRelationship: normalizeSignal(value.productImagesRelationship),
    productGenerativeGalleryRelationship: normalizeSignal(value.productGenerativeGalleryRelationship),
    approvedUsage: normalizeSignal(value.approvedUsage),
    publicProductUsage: normalizeSignal(value.publicProductUsage),
    externalPublishingUsage: normalizeSignal(value.externalPublishingUsage),
    shopierUsage: normalizeSignal(value.shopierUsage),
    orderDependency: normalizeSignal(value.orderDependency),
    durableBusinessDependency: normalizeSignal(value.durableBusinessDependency),
    campaignOrAdUsage: normalizeSignal(value.campaignOrAdUsage),
    imageQcOrBusinessAssetHold: normalizeSignal(value.imageQcOrBusinessAssetHold),
    activeJob: normalizeSignal(value.activeJob),
    queuedJob: normalizeSignal(value.queuedJob),
    generatingJob: normalizeSignal(value.generatingJob),
    pendingPreview: normalizeSignal(value.pendingPreview),
    stalePreviewAwaitingDecision: normalizeSignal(value.stalePreviewAwaitingDecision),
    pendingReviewOrApproval: normalizeSignal(value.pendingReviewOrApproval),
    smokeEvidenceHold: normalizeSignal(value.smokeEvidenceHold),
    failureEvidenceHold: normalizeSignal(value.failureEvidenceHold),
    operatorHold: normalizeSignal(value.operatorHold),
    legalHold: normalizeSignal(value.legalHold),
    auditHold: normalizeSignal(value.auditHold),
    jobLineagePresent: normalizeSignal(value.jobLineagePresent),
    attemptLineagePresent: normalizeSignal(value.attemptLineagePresent),
    slotLineagePresent: normalizeSignal(value.slotLineagePresent),
    lineageConsistent: normalizeSignal(value.lineageConsistent),
    blobObjectState,
  }
}

type ContradictionCheck = {
  precedence: number
  code: GeneratedMediaContradictionCode
  signal: GeneratedMediaEvidenceSignal
  positiveOutcome: Exclude<GeneratedMediaContradictionOutcome, 'proposal_eligible' | 'evidence_changed_reauthorize'>
  positiveWhen: boolean
}

export function evaluateGeneratedMediaQuarantineContradictions(
  value: GeneratedMediaRawQuarantineEvidence,
): GeneratedMediaContradictionResult {
  const evidence = normalizeGeneratedMediaRawQuarantineEvidence(value)
  const checks: ContradictionCheck[] = [
    { precedence: 1, code: 'ORIGINAL_MEDIA', signal: evidence.originalMedia, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 1, code: 'PRODUCT_IMAGES_RELATIONSHIP', signal: evidence.productImagesRelationship, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 1, code: 'DURABLE_BUSINESS_DEPENDENCY', signal: evidence.durableBusinessDependency, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 2, code: 'PUBLIC_PRODUCT_USAGE', signal: evidence.publicProductUsage, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 2, code: 'EXTERNAL_PUBLISHING_USAGE', signal: evidence.externalPublishingUsage, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 2, code: 'SHOPIER_USAGE', signal: evidence.shopierUsage, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 2, code: 'ORDER_DEPENDENCY', signal: evidence.orderDependency, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 2, code: 'CAMPAIGN_OR_AD_USAGE', signal: evidence.campaignOrAdUsage, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 3, code: 'PRODUCT_GENERATIVE_GALLERY_RELATIONSHIP', signal: evidence.productGenerativeGalleryRelationship, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 3, code: 'APPROVED_USAGE', signal: evidence.approvedUsage, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 4, code: 'ACTIVE_JOB', signal: evidence.activeJob, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 4, code: 'QUEUED_JOB', signal: evidence.queuedJob, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 4, code: 'GENERATING_JOB', signal: evidence.generatingJob, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 4, code: 'PENDING_PREVIEW', signal: evidence.pendingPreview, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 4, code: 'STALE_PREVIEW_AWAITING_DECISION', signal: evidence.stalePreviewAwaitingDecision, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 4, code: 'PENDING_REVIEW_OR_APPROVAL', signal: evidence.pendingReviewOrApproval, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 5, code: 'IMAGE_QC_OR_BUSINESS_ASSET_HOLD', signal: evidence.imageQcOrBusinessAssetHold, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 5, code: 'SMOKE_EVIDENCE_HOLD', signal: evidence.smokeEvidenceHold, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 5, code: 'FAILURE_EVIDENCE_HOLD', signal: evidence.failureEvidenceHold, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 5, code: 'OPERATOR_HOLD', signal: evidence.operatorHold, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 5, code: 'LEGAL_HOLD', signal: evidence.legalHold, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 5, code: 'AUDIT_HOLD', signal: evidence.auditHold, positiveOutcome: 'quarantine_ineligible', positiveWhen: true },
    { precedence: 6, code: 'MISSING_JOB_LINEAGE', signal: evidence.jobLineagePresent, positiveOutcome: 'manual_review', positiveWhen: false },
    { precedence: 6, code: 'MISSING_ATTEMPT_LINEAGE', signal: evidence.attemptLineagePresent, positiveOutcome: 'manual_review', positiveWhen: false },
    { precedence: 6, code: 'MISSING_SLOT_LINEAGE', signal: evidence.slotLineagePresent, positiveOutcome: 'manual_review', positiveWhen: false },
    { precedence: 6, code: 'CONFLICTING_LINEAGE', signal: evidence.lineageConsistent, positiveOutcome: 'manual_review', positiveWhen: false },
  ]

  const blockers: Array<{ precedence: number; code: GeneratedMediaContradictionCode; outcome: GeneratedMediaContradictionOutcome }> = []
  for (const check of checks) {
    if (check.signal === 'unknown') {
      blockers.push({ precedence: check.precedence, code: check.code, outcome: 'manual_review' })
    } else if (check.signal === check.positiveWhen) {
      blockers.push({ precedence: check.precedence, code: check.code, outcome: check.positiveOutcome })
    }
  }

  if (evidence.blobObjectState !== 'present') {
    blockers.push({ precedence: 6, code: 'AMBIGUOUS_BLOB_OBJECT_STATE', outcome: 'manual_review' })
  }
  const capturedAt = evidence.evidenceCapturedAt ? Date.parse(evidence.evidenceCapturedAt) : Number.NaN
  const relationshipAt = evidence.latestRelationshipActivityAt ? Date.parse(evidence.latestRelationshipActivityAt) : Number.NaN
  if (!Number.isFinite(capturedAt)) {
    blockers.push({ precedence: 6, code: 'MISSING_OR_INVALID_EVIDENCE_CAPTURE_TIME', outcome: 'manual_review' })
  }
  if (!Number.isFinite(relationshipAt)) {
    blockers.push({ precedence: 6, code: 'MISSING_OR_INVALID_RELATIONSHIP_ACTIVITY_TIME', outcome: 'manual_review' })
  } else if (Number.isFinite(capturedAt) && relationshipAt > capturedAt) {
    blockers.push({ precedence: 6, code: 'RELATIONSHIP_ACTIVITY_AFTER_EVIDENCE_CAPTURE', outcome: 'evidence_changed_reauthorize' })
  }

  blockers.sort((a, b) => a.precedence - b.precedence || a.code.localeCompare(b.code))
  const primary = blockers[0]
  return deepFreeze({
    outcome: primary?.outcome ?? 'proposal_eligible',
    precedence: primary?.precedence ?? null,
    primaryCode: primary?.code ?? null,
    blockerCodes: blockers.map((blocker) => blocker.code),
    quarantineAuthorization: false,
    physicalDeleteAuthorization: false,
    mutationPermission: false,
  })
}

function mergePositiveSignal(signal: GeneratedMediaEvidenceSignal, observed: boolean): GeneratedMediaEvidenceSignal {
  return observed ? true : signal
}

function mergePresenceSignal(signal: GeneratedMediaEvidenceSignal, present: boolean): GeneratedMediaEvidenceSignal {
  if (!present || signal === false) return false
  return signal
}

function latestIsoTimestamp(values: Array<string | null | undefined>): string | null {
  const valid = values
    .map(normalizeNullableIso)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))
  return valid[0] ?? null
}

export function buildGeneratedMediaContradictionGateEvidence(
  evidence: GeneratedMediaQuarantineEvidence,
): GeneratedMediaRawQuarantineEvidence {
  const raw = normalizeGeneratedMediaRawQuarantineEvidence(evidence.rawEvidence)
  const relationships = normalizeGeneratedMediaRelationshipSnapshot(evidence.relationships)
  const retention = evidence.retentionEvidence
  const lineage = normalizeLineage(evidence.explicitLineage)
  const observedJobIds = uniqueSorted(evidence.observedJobRelationshipIds)
  const lineageJobId = cleanString(lineage.jobId)
  const relationshipJobIds = uniqueSorted([...relationships.jobIds, ...observedJobIds])
  const lineageConflict = Boolean(
    lineageJobId
    && relationshipJobIds.length > 0
    && relationshipJobIds.some((jobId) => jobId !== lineageJobId),
  )
  const rawBlob = raw.blobObjectState
  const retentionBlob = retention.blobState
  const blobObjectState: GeneratedMediaBlobObjectState = rawBlob === 'present' && retentionBlob === 'present'
    ? 'present'
    : rawBlob === 'missing' || retentionBlob === 'missing'
      ? 'missing'
      : 'ambiguous'

  return {
    ...raw,
    latestRelationshipActivityAt: latestIsoTimestamp([
      raw.latestRelationshipActivityAt,
      relationships.lastRelationshipChangeAt,
      retention.relationshipChangedAt,
    ]),
    originalMedia: mergePositiveSignal(raw.originalMedia, evidence.mediaKind === 'original' || retention.mediaKind === 'original'),
    productImagesRelationship: mergePositiveSignal(
      raw.productImagesRelationship,
      relationships.originalImagePositions.length > 0 || retention.originalImagesAttached,
    ),
    productGenerativeGalleryRelationship: mergePositiveSignal(
      raw.productGenerativeGalleryRelationship,
      relationships.galleryPositions.length > 0 || retention.galleryAttached,
    ),
    approvedUsage: mergePositiveSignal(raw.approvedUsage, retention.decision === 'approved' || retention.jobStatus === 'approved'),
    publicProductUsage: mergePositiveSignal(raw.publicProductUsage, retention.publicOrPublished),
    externalPublishingUsage: mergePositiveSignal(raw.externalPublishingUsage, relationships.publishedChannels.length > 0),
    shopierUsage: mergePositiveSignal(raw.shopierUsage, relationships.shopierProductIds.length > 0 || retention.shopierOrExternalUse),
    orderDependency: mergePositiveSignal(raw.orderDependency, relationships.orderIds.length > 0 || retention.orderOrCampaignUse),
    campaignOrAdUsage: mergePositiveSignal(raw.campaignOrAdUsage, relationships.campaignIds.length > 0 || retention.orderOrCampaignUse),
    imageQcOrBusinessAssetHold: mergePositiveSignal(raw.imageQcOrBusinessAssetHold, retention.imageQcDependency),
    activeJob: mergePositiveSignal(raw.activeJob, relationships.activeJobIds.length > 0 || retention.activeJob),
    queuedJob: mergePositiveSignal(raw.queuedJob, retention.jobStatus === 'queued'),
    generatingJob: mergePositiveSignal(raw.generatingJob, retention.jobStatus === 'generating'),
    pendingPreview: mergePositiveSignal(raw.pendingPreview, retention.jobStatus === 'preview' || retention.decision === 'pending'),
    pendingReviewOrApproval: mergePositiveSignal(raw.pendingReviewOrApproval, retention.jobStatus === 'review'),
    smokeEvidenceHold: mergePositiveSignal(raw.smokeEvidenceHold, retention.smokeEvidence),
    failureEvidenceHold: mergePositiveSignal(raw.failureEvidenceHold, retention.failureEvidence || retention.regressionFixture),
    operatorHold: mergePositiveSignal(raw.operatorHold, retention.operatorHold),
    legalHold: mergePositiveSignal(raw.legalHold, retention.legalOrAuditHold),
    auditHold: mergePositiveSignal(raw.auditHold, retention.legalOrAuditHold),
    jobLineagePresent: mergePresenceSignal(raw.jobLineagePresent, Boolean(lineage.jobId)),
    attemptLineagePresent: mergePresenceSignal(raw.attemptLineagePresent, Boolean(lineage.attemptId)),
    slotLineagePresent: mergePresenceSignal(raw.slotLineagePresent, Boolean(lineage.slotId)),
    lineageConsistent: lineageConflict ? false : raw.lineageConsistent,
    blobObjectState,
  }
}

type CanonicalJson = null | boolean | number | string | CanonicalJson[] | { [key: string]: CanonicalJson }

function toCanonicalJson(value: unknown, path = '$'): CanonicalJson {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number at ${path}.`)
    return Object.is(value, -0) ? 0 : value
  }
  if (Array.isArray(value)) return value.map((item, index) => toCanonicalJson(item, `${path}[${index}]`))
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Non-plain object at ${path}.`)
    }
    const result: Record<string, CanonicalJson> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key]
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
        throw new Error(`Unsupported canonical value at ${path}.${key}.`)
      }
      result[key] = toCanonicalJson(item, `${path}.${key}`)
    }
    return result
  }
  throw new Error(`Unsupported canonical value at ${path}.`)
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(toCanonicalJson(value))
}

export function sha256Canonical(value: unknown): Sha256Hex {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')
}

export function fingerprintGeneratedMediaRelationshipsV1(value: GeneratedMediaRelationshipSnapshot): Sha256Hex {
  return sha256Canonical(normalizeGeneratedMediaRelationshipSnapshot(value))
}

export function fingerprintGeneratedMediaRelationships(
  value: GeneratedMediaRelationshipSnapshot,
  rawEvidence: GeneratedMediaRawQuarantineEvidence,
): Sha256Hex {
  return sha256Canonical({
    relationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    relationships: normalizeGeneratedMediaRelationshipSnapshot(value),
    rawEvidence: normalizeGeneratedMediaRawQuarantineEvidence(rawEvidence),
  })
}

function normalizedRetentionDecision(decision: GeneratedMediaRetentionDecision) {
  return {
    policyVersion: decision.policyVersion,
    lifecycle: decision.lifecycle,
    retentionClass: decision.retentionClass,
    holds: [...decision.holds].sort(),
    reasonCodes: [...decision.reasonCodes].sort(),
    missingEvidence: [...decision.missingEvidence].sort(),
    quarantineEligibility: decision.quarantineEligibility,
    physicalCleanupEligibility: decision.physicalCleanupEligibility,
    physicalDeleteAuthorization: decision.physicalDeleteAuthorization,
    earliestPossibleQuarantineAt: decision.earliestPossibleQuarantineAt,
    earliestPossiblePhysicalCleanupAt: decision.earliestPossiblePhysicalCleanupAt,
    manualReviewRequired: decision.manualReviewRequired,
  }
}

export function fingerprintGeneratedMediaEvidence(params: {
  evidence: GeneratedMediaQuarantineEvidence
  decision: GeneratedMediaRetentionDecision
  bridge: GeneratedMediaLegacyEvidenceBridge
}): Sha256Hex {
  const contradictionGateEvidence = buildGeneratedMediaContradictionGateEvidence(params.evidence)
  return sha256Canonical({
    mediaId: cleanString(params.evidence.mediaId),
    mediaKind: params.evidence.mediaKind,
    recordVersion: assertIso(params.evidence.recordVersion, 'recordVersion'),
    contentSha256: params.evidence.contentSha256,
    storageLocatorDigest: params.evidence.storageLocatorDigest,
    byteSize: params.evidence.byteSize,
    mimeType: cleanString(params.evidence.mimeType),
    width: params.evidence.width,
    height: params.evidence.height,
    explicitLineage: params.bridge.explicitLineage,
    observedJobRelationshipIds: params.bridge.observedJobRelationshipIds,
    relationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    relationshipFingerprint: fingerprintGeneratedMediaRelationships(params.evidence.relationships, contradictionGateEvidence),
    rawContradictionEvidence: normalizeGeneratedMediaRawQuarantineEvidence(params.evidence.rawEvidence),
    contradictionGateEvidence,
    retentionDecision: normalizedRetentionDecision(params.decision),
    evidenceReferenceIds: uniqueSorted(params.evidence.evidenceReferenceIds),
  })
}

function assertSha256(value: string | null, field: string): asserts value is Sha256Hex {
  if (!value || !SHA256_PATTERN.test(value)) throw new Error(`${field} must be a lowercase SHA-256 hex digest.`)
}

function buildTarget(
  evidence: GeneratedMediaQuarantineEvidence,
  profile: GeneratedMediaRetentionProfile,
): GeneratedMediaQuarantineTarget {
  if (evidence.mediaKind !== 'generated') throw new Error(`Media ${evidence.mediaId}: original Media is never quarantine-proposal eligible.`)
  const contradictionGateEvidence = buildGeneratedMediaContradictionGateEvidence(evidence)
  const contradiction = evaluateGeneratedMediaQuarantineContradictions(contradictionGateEvidence)
  if (contradiction.outcome !== 'proposal_eligible') {
    throw new Error(
      `Media ${evidence.mediaId}: raw contradiction gate returned ${contradiction.outcome} (${contradiction.primaryCode ?? 'UNKNOWN'}).`,
    )
  }
  const bridge = bridgeLegacyGeneratedMediaEvidence({
    explicitLineage: evidence.explicitLineage,
    observedJobRelationshipIds: evidence.observedJobRelationshipIds,
  })
  if (bridge.manualReviewRequired) throw new Error(`Media ${evidence.mediaId}: complete explicit lineage is required.`)
  const decision = classifyGeneratedMediaRetention(evidence.retentionEvidence, profile)
  if (decision.quarantineEligibility !== 'proposal_candidate' || decision.holds.length > 0) {
    throw new Error(`Media ${evidence.mediaId}: current retention evidence is not quarantine-proposal eligible.`)
  }
  if (decision.physicalDeleteAuthorization !== false) {
    throw new Error(`Media ${evidence.mediaId}: physical-delete invariant failed.`)
  }
  assertSha256(evidence.contentSha256, `Media ${evidence.mediaId} contentSha256`)
  assertSha256(evidence.storageLocatorDigest, `Media ${evidence.mediaId} storageLocatorDigest`)
  if (!Number.isInteger(evidence.byteSize) || Number(evidence.byteSize) <= 0) throw new Error(`Media ${evidence.mediaId}: byteSize is required.`)
  if (!Number.isInteger(evidence.width) || Number(evidence.width) <= 0) throw new Error(`Media ${evidence.mediaId}: width is required.`)
  if (!Number.isInteger(evidence.height) || Number(evidence.height) <= 0) throw new Error(`Media ${evidence.mediaId}: height is required.`)
  const mimeType = cleanString(evidence.mimeType)
  if (!mimeType?.startsWith('image/')) throw new Error(`Media ${evidence.mediaId}: image MIME is required.`)
  const restoreDeadline = decision.earliestPossiblePhysicalCleanupAt
    ?? new Date(Date.parse(evidence.retentionEvidence.now) + profile.quarantineGraceDays * DAY_MS).toISOString()
  return {
    mediaId: String(evidence.mediaId),
    recordVersion: assertIso(evidence.recordVersion, 'recordVersion'),
    contentSha256: evidence.contentSha256,
    storageLocatorDigest: evidence.storageLocatorDigest,
    byteSize: Number(evidence.byteSize),
    mimeType,
    width: Number(evidence.width),
    height: Number(evidence.height),
    lineage: bridge.explicitLineage,
    relationshipFingerprintVersion: GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION,
    relationshipFingerprint: fingerprintGeneratedMediaRelationships(evidence.relationships, contradictionGateEvidence),
    evidenceFingerprint: fingerprintGeneratedMediaEvidence({ evidence, decision, bridge }),
    retentionPolicyVersion: decision.policyVersion,
    retentionClass: decision.retentionClass,
    reasonCodes: [...decision.reasonCodes].sort(),
    holds: [...decision.holds].sort(),
    intendedTransition: 'proposal_only_to_quarantined_recoverable',
    restoreDeadline,
    preconditions: [
      'exact_manifest_hash_required',
      'fresh_relationship_fingerprint_required',
      'fresh_evidence_fingerprint_required',
      'explicit_operator_authorization_required',
      'blob_must_remain_retained',
    ],
  }
}

function targetSort(a: GeneratedMediaQuarantineTarget, b: GeneratedMediaQuarantineTarget): number {
  const numericA = /^\d+$/.test(a.mediaId) ? Number(a.mediaId) : Number.NaN
  const numericB = /^\d+$/.test(b.mediaId) ? Number(b.mediaId) : Number.NaN
  if (Number.isFinite(numericA) && Number.isFinite(numericB)) return numericA - numericB
  return a.mediaId.localeCompare(b.mediaId)
}

function manifestWithoutHash(manifest: GeneratedMediaQuarantineManifest): Omit<GeneratedMediaQuarantineManifest, 'manifestHash'> {
  return {
    contractVersion: manifest.contractVersion,
    manifestVersion: manifest.manifestVersion,
    schemaContractVersion: manifest.schemaContractVersion,
    manifestId: manifest.manifestId,
    createdAt: manifest.createdAt,
    expiresAt: manifest.expiresAt,
    runtimeCommit: manifest.runtimeCommit,
    proposalSource: manifest.proposalSource,
    retentionProfile: manifest.retentionProfile,
    targets: manifest.targets,
    targetCount: manifest.targetCount,
    quarantineProposal: manifest.quarantineProposal,
    quarantineAuthorization: manifest.quarantineAuthorization,
    restoreAuthorization: manifest.restoreAuthorization,
    physicalDeleteAuthorization: manifest.physicalDeleteAuthorization,
    mutationPermission: manifest.mutationPermission,
  }
}

export function buildGeneratedMediaQuarantineManifest(params: {
  createdAt: string
  expiresAt: string
  runtimeCommit: string
  proposalSource: GeneratedMediaQuarantineManifest['proposalSource']
  retentionProfile?: GeneratedMediaRetentionProfile
  evidence: GeneratedMediaQuarantineEvidence[]
}): GeneratedMediaQuarantineManifest {
  const createdAt = assertIso(params.createdAt, 'createdAt')
  const expiresAt = assertIso(params.expiresAt, 'expiresAt')
  if (Date.parse(expiresAt) <= Date.parse(createdAt)) throw new Error('expiresAt must be later than createdAt.')
  const runtimeCommit = cleanString(params.runtimeCommit)
  if (!runtimeCommit) throw new Error('runtimeCommit is required.')
  if (params.evidence.length === 0) throw new Error('A quarantine manifest requires at least one exact target.')
  const profile = params.retentionProfile ?? GENERATED_MEDIA_RETENTION_PROFILES.balanced
  const targets = params.evidence.map((evidence) => buildTarget(evidence, profile)).sort(targetSort)
  if (new Set(targets.map((target) => target.mediaId)).size !== targets.length) {
    throw new Error('Quarantine manifest target Media IDs must be unique.')
  }
  const identityHash = sha256Canonical({
    contractVersion: GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION,
    manifestVersion: GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION,
    schemaContractVersion: GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION,
    createdAt,
    expiresAt,
    runtimeCommit,
    proposalSource: params.proposalSource,
    retentionProfile: profile,
    targets,
  })
  const draft: GeneratedMediaQuarantineManifest = {
    contractVersion: GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION,
    manifestVersion: GENERATED_MEDIA_QUARANTINE_MANIFEST_VERSION,
    schemaContractVersion: GENERATED_MEDIA_QUARANTINE_SCHEMA_CONTRACT_VERSION,
    manifestId: `gqm_${identityHash.slice(0, 32)}`,
    manifestHash: '',
    createdAt,
    expiresAt,
    runtimeCommit,
    proposalSource: params.proposalSource,
    retentionProfile: { ...profile },
    targets,
    targetCount: targets.length,
    quarantineProposal: true,
    quarantineAuthorization: false,
    restoreAuthorization: false,
    physicalDeleteAuthorization: false,
    mutationPermission: false,
  }
  draft.manifestHash = sha256Canonical(manifestWithoutHash(draft))
  return deepFreeze(draft)
}

export function verifyGeneratedMediaQuarantineManifestHash(manifest: GeneratedMediaQuarantineManifest): boolean {
  return SHA256_PATTERN.test(manifest.manifestHash)
    && sha256Canonical(manifestWithoutHash(manifest)) === manifest.manifestHash
}

export function revalidateGeneratedMediaQuarantineManifest(params: {
  manifest: GeneratedMediaQuarantineManifest
  checkedAt: string
  evidence: GeneratedMediaQuarantineEvidence[]
}): GeneratedMediaQuarantineRevalidation {
  const issues: GeneratedMediaQuarantineRevalidation['issues'] = []
  let contradictionOutcome: GeneratedMediaContradictionOutcome = 'proposal_eligible'
  if (!verifyGeneratedMediaQuarantineManifestHash(params.manifest)) {
    issues.push({ mediaId: null, code: 'MANIFEST_HASH_MISMATCH' })
  }
  if (Date.parse(assertIso(params.checkedAt, 'checkedAt')) > Date.parse(params.manifest.expiresAt)) {
    issues.push({ mediaId: null, code: 'MANIFEST_EXPIRED' })
  }
  const currentById = new Map(params.evidence.map((evidence) => [String(evidence.mediaId), evidence]))
  const manifestIds = params.manifest.targets.map((target) => target.mediaId).sort()
  const currentIds = [...currentById.keys()].sort()
  if (canonicalJson(manifestIds) !== canonicalJson(currentIds)) {
    issues.push({ mediaId: null, code: 'TARGET_SET_CHANGED' })
  }
  for (const target of params.manifest.targets) {
    const evidence = currentById.get(target.mediaId)
    if (!evidence) {
      issues.push({ mediaId: target.mediaId, code: 'TARGET_EVIDENCE_MISSING' })
      continue
    }
    if (evidence.mediaKind !== 'generated') issues.push({ mediaId: target.mediaId, code: 'ORIGINAL_MEDIA_FORBIDDEN' })
    const contradictionGateEvidence = buildGeneratedMediaContradictionGateEvidence(evidence)
    const contradiction = evaluateGeneratedMediaQuarantineContradictions(contradictionGateEvidence)
    if (contradiction.outcome !== 'proposal_eligible') {
      contradictionOutcome = contradiction.outcome
      const code = contradiction.outcome === 'quarantine_ineligible'
        ? 'RAW_CONTRADICTION_INELIGIBLE'
        : contradiction.outcome === 'evidence_changed_reauthorize'
          ? 'RAW_EVIDENCE_CHANGED_REAUTHORIZE'
          : 'RAW_EVIDENCE_MANUAL_REVIEW'
      issues.push({ mediaId: target.mediaId, code })
    }
    const bridge = bridgeLegacyGeneratedMediaEvidence({
      explicitLineage: evidence.explicitLineage,
      observedJobRelationshipIds: evidence.observedJobRelationshipIds,
    })
    if (bridge.manualReviewRequired) issues.push({ mediaId: target.mediaId, code: 'LEGACY_LINEAGE_INCOMPLETE' })
    const decision = classifyGeneratedMediaRetention(evidence.retentionEvidence, params.manifest.retentionProfile)
    if (decision.physicalDeleteAuthorization !== false) {
      issues.push({ mediaId: target.mediaId, code: 'PHYSICAL_AUTHORIZATION_INVARIANT_BROKEN' })
    }
    if (decision.quarantineEligibility !== 'proposal_candidate') {
      issues.push({ mediaId: target.mediaId, code: 'RETENTION_NO_LONGER_PROPOSAL_ELIGIBLE' })
    }
    if (decision.holds.length > 0) issues.push({ mediaId: target.mediaId, code: 'HOLD_PRESENT' })
    if (evidence.contentSha256 !== target.contentSha256) issues.push({ mediaId: target.mediaId, code: 'CONTENT_FINGERPRINT_CHANGED' })
    if (evidence.storageLocatorDigest !== target.storageLocatorDigest) issues.push({ mediaId: target.mediaId, code: 'STORAGE_FINGERPRINT_CHANGED' })
    if (target.relationshipFingerprintVersion !== GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION) {
      issues.push({ mediaId: target.mediaId, code: 'RELATIONSHIP_FINGERPRINT_VERSION_MISMATCH' })
    }
    if (fingerprintGeneratedMediaRelationships(evidence.relationships, contradictionGateEvidence) !== target.relationshipFingerprint) {
      issues.push({ mediaId: target.mediaId, code: 'RELATIONSHIP_FINGERPRINT_CHANGED' })
    }
    if (fingerprintGeneratedMediaEvidence({ evidence, decision, bridge }) !== target.evidenceFingerprint) {
      issues.push({ mediaId: target.mediaId, code: 'EVIDENCE_FINGERPRINT_CHANGED' })
    }
  }
  const proposalStillEligible = issues.length === 0
  const evidenceChanged = issues.some((issue) => [
    'TARGET_SET_CHANGED',
    'TARGET_EVIDENCE_MISSING',
    'CONTENT_FINGERPRINT_CHANGED',
    'STORAGE_FINGERPRINT_CHANGED',
    'RELATIONSHIP_FINGERPRINT_CHANGED',
    'EVIDENCE_FINGERPRINT_CHANGED',
    'RELATIONSHIP_FINGERPRINT_VERSION_MISMATCH',
  ].includes(issue.code))
  const outcome: GeneratedMediaContradictionOutcome = proposalStillEligible
    ? 'proposal_eligible'
    : contradictionOutcome !== 'proposal_eligible'
      ? contradictionOutcome
      : evidenceChanged
        ? 'evidence_changed_reauthorize'
        : 'manual_review'
  return deepFreeze({
    contractVersion: GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION,
    manifestId: params.manifest.manifestId,
    manifestHash: params.manifest.manifestHash,
    checkedAt: assertIso(params.checkedAt, 'checkedAt'),
    proposalStillEligible,
    outcome,
    issues,
    quarantineAuthorization: false,
    restoreAuthorization: false,
    physicalDeleteAuthorization: false,
    mutationPermission: false,
    safeNextAction: proposalStillEligible
      ? 'The unchanged proposal may be presented for a separate exact-hash operator authorization; do not mutate from this result.'
      : 'Discard the stale proposal and perform a fresh read-only review; do not quarantine or detach anything.',
  })
}

export function buildGeneratedMediaRestoreProposal(params: {
  receipt: GeneratedMediaQuarantineReceipt
  proposedAt: string
  currentContentSha256: string
  currentStorageLocatorDigest: string
  currentRelationshipFingerprintVersion: string
  currentRelationshipFingerprint: string
  currentEvidenceFingerprint: string
  currentHolds: string[]
}): GeneratedMediaRestoreProposal {
  const proposedAt = assertIso(params.proposedAt, 'proposedAt')
  const restoreDeadline = assertIso(params.receipt.restoreDeadline, 'restoreDeadline')
  const issues: string[] = []
  if (!SHA256_PATTERN.test(params.receipt.manifestHash)) issues.push('manifest_hash_invalid')
  if (!SHA256_PATTERN.test(params.receipt.reversibleMetadataReceiptHash)) issues.push('metadata_receipt_hash_invalid')
  if (!params.receipt.blobRetained) issues.push('blob_not_retained')
  if (Date.parse(proposedAt) > Date.parse(restoreDeadline)) issues.push('restore_deadline_elapsed')
  if (params.currentContentSha256 !== params.receipt.contentSha256) issues.push('content_fingerprint_changed')
  if (params.currentStorageLocatorDigest !== params.receipt.storageLocatorDigest) issues.push('storage_fingerprint_changed')
  if (params.currentRelationshipFingerprintVersion !== GENERATED_MEDIA_RELATIONSHIP_FINGERPRINT_VERSION) {
    issues.push('relationship_fingerprint_version_mismatch')
  }
  if (params.currentRelationshipFingerprint !== params.receipt.priorRelationshipFingerprint) {
    issues.push('relationship_fingerprint_changed')
  }
  if (params.currentEvidenceFingerprint !== params.receipt.priorEvidenceFingerprint) issues.push('evidence_fingerprint_changed')
  if (uniqueSorted(params.currentHolds).length > 0) issues.push('blocking_restore_hold_present')
  const proposalEligible = issues.length === 0
  return deepFreeze({
    contractVersion: GENERATED_MEDIA_QUARANTINE_CONTRACT_VERSION,
    manifestId: params.receipt.manifestId,
    manifestHash: params.receipt.manifestHash,
    mediaId: params.receipt.mediaId,
    proposedAt,
    restoreDeadline,
    proposalEligible,
    issues,
    restoreAuthorization: false,
    quarantineAuthorization: false,
    physicalDeleteAuthorization: false,
    mutationPermission: false,
    safeNextAction: proposalEligible
      ? 'Present the exact receipt and current relationship snapshot for separate operator restore authorization.'
      : 'Keep the asset quarantined and reconcile the failed restore preconditions manually.',
  })
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item)
  }
  return value
}
