export const GENERATED_MEDIA_RETENTION_POLICY_VERSION = 'generated-media-retention/v1' as const

export type GeneratedMediaLifecycle =
  | 'original_asset'
  | 'approved_attached'
  | 'approved_unattached'
  | 'preview_pending'
  | 'rejected'
  | 'partially_approved_unselected'
  | 'superseded'
  | 'failure_evidence'
  | 'smoke_evidence'
  | 'orphan_suspected'
  | 'reconciliation_required'
  | 'legacy_unclassified'

export type GeneratedMediaRetentionClass =
  | 'PERMANENT_BUSINESS_ASSET'
  | 'PENDING_OPERATOR_DECISION'
  | 'REJECTED_RECOVERABLE'
  | 'SUPERSEDED_RECOVERABLE'
  | 'FAILURE_EVIDENCE'
  | 'SMOKE_EVIDENCE'
  | 'ORPHAN_REVIEW'
  | 'LEGACY_MANUAL_REVIEW'
  | 'PHYSICAL_CLEANUP_CANDIDATE'

export type GeneratedMediaHold =
  | 'operator_hold'
  | 'business_asset_hold'
  | 'gallery_hold'
  | 'public_or_published_hold'
  | 'shopier_hold'
  | 'image_qc_hold'
  | 'smoke_evidence_hold'
  | 'failure_evidence_hold'
  | 'regression_fixture_hold'
  | 'legal_or_audit_hold'
  | 'legacy_ambiguity_hold'
  | 'active_job_hold'
  | 'pending_decision_hold'
  | 'recent_activity_hold'
  | 'recovery_window_hold'

export type GeneratedMediaReasonCode =
  | 'ORIGINAL_MEDIA'
  | 'APPROVED_BUSINESS_ASSET'
  | 'GALLERY_REFERENCE'
  | 'PUBLIC_OR_PUBLISHED_REFERENCE'
  | 'SHOPIER_OR_EXTERNAL_REFERENCE'
  | 'ORDER_OR_CAMPAIGN_REFERENCE'
  | 'IMAGE_QC_DEPENDENCY'
  | 'PENDING_OPERATOR_DECISION'
  | 'ACTIVE_JOB'
  | 'REJECTED_WITH_RECOVERY_WINDOW'
  | 'SUPERSEDED_BY_ACCEPTED_ATTEMPT'
  | 'SUPERSESSION_NOT_PROVEN'
  | 'FAILURE_EVIDENCE'
  | 'SMOKE_EVIDENCE'
  | 'REGRESSION_FIXTURE'
  | 'LEGAL_OR_AUDIT_EVIDENCE'
  | 'OPERATOR_HOLD'
  | 'MISSING_JOB_ID'
  | 'MISSING_ATTEMPT_ID'
  | 'MISSING_SLOT_ID'
  | 'LEGACY_LINEAGE_AMBIGUOUS'
  | 'JOB_RECORD_MISSING'
  | 'ORPHAN_SUSPECTED_REQUIRES_REVIEW'
  | 'BLOB_STATE_UNKNOWN'
  | 'BLOB_MISSING_RECONCILIATION_REQUIRED'
  | 'RECENT_RELATIONSHIP_CHANGE'
  | 'RECOVERY_WINDOW_ACTIVE'
  | 'QUARANTINE_NOT_IMPLEMENTED'
  | 'PHYSICAL_DELETE_NEVER_AUTHORIZED_BY_CLASSIFIER'

export interface GeneratedMediaRetentionProfile {
  name: 'conservative' | 'balanced' | 'aggressive'
  rejectedRecoveryDays: number
  supersededRecoveryDays: number
  orphanReviewDays: number
  quarantineGraceDays: number
  recentActivityDays: number
}

export const GENERATED_MEDIA_RETENTION_PROFILES: Record<GeneratedMediaRetentionProfile['name'], GeneratedMediaRetentionProfile> = {
  conservative: {
    name: 'conservative',
    rejectedRecoveryDays: 180,
    supersededRecoveryDays: 120,
    orphanReviewDays: 90,
    quarantineGraceDays: 90,
    recentActivityDays: 30,
  },
  balanced: {
    name: 'balanced',
    rejectedRecoveryDays: 90,
    supersededRecoveryDays: 60,
    orphanReviewDays: 60,
    quarantineGraceDays: 60,
    recentActivityDays: 14,
  },
  aggressive: {
    name: 'aggressive',
    rejectedRecoveryDays: 30,
    supersededRecoveryDays: 14,
    orphanReviewDays: 30,
    quarantineGraceDays: 30,
    recentActivityDays: 7,
  },
}

export interface GeneratedMediaRetentionEvidence {
  now: string
  mediaKind: 'original' | 'generated'
  createdAt: string
  updatedAt: string
  decisionAt?: string | null
  supersededAt?: string | null
  relationshipChangedAt?: string | null
  quarantinedAt?: string | null
  lineage: {
    contractVersion?: string | null
    jobId?: string | null
    attemptId?: string | null
    slotId?: string | null
    legacy?: boolean
  }
  jobRecordExists: boolean | 'unknown'
  jobStatus?: 'queued' | 'generating' | 'preview' | 'review' | 'approved' | 'rejected' | 'failed' | 'unknown'
  attemptStatus?: 'running' | 'completed' | 'partial' | 'failed' | 'unknown'
  decision: 'approved' | 'rejected' | 'pending' | 'partial_unselected' | 'superseded' | 'none'
  replacementAttemptAccepted?: boolean
  galleryAttached: boolean
  originalImagesAttached: boolean
  publicOrPublished: boolean
  shopierOrExternalUse: boolean
  orderOrCampaignUse: boolean
  imageQcDependency: boolean
  activeJob: boolean
  smokeEvidence: boolean
  failureEvidence: boolean
  regressionFixture: boolean
  legalOrAuditHold: boolean
  operatorHold: boolean
  orphanSuspected: boolean
  blobState: 'present' | 'missing' | 'unknown'
}

export interface GeneratedMediaRetentionDecision {
  policyVersion: typeof GENERATED_MEDIA_RETENTION_POLICY_VERSION
  lifecycle: GeneratedMediaLifecycle
  retentionClass: GeneratedMediaRetentionClass
  holds: GeneratedMediaHold[]
  reasonCodes: GeneratedMediaReasonCode[]
  missingEvidence: string[]
  quarantineEligibility: 'ineligible' | 'future_candidate' | 'proposal_candidate'
  physicalCleanupEligibility: 'ineligible' | 'future_candidate' | 'candidate_after_quarantine'
  physicalDeleteAuthorization: false
  earliestPossibleQuarantineAt: string | null
  earliestPossiblePhysicalCleanupAt: string | null
  manualReviewRequired: boolean
  safeNextAction: string
}

const DAY_MS = 86_400_000

function parseUtc(value: string | null | undefined, field: string, missing: string[]): number | null {
  if (!value) {
    missing.push(field)
    return null
  }
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    missing.push(`${field}:invalid`)
    return null
  }
  return parsed
}

function addDaysUtc(timestamp: number, days: number): string {
  return new Date(timestamp + days * DAY_MS).toISOString()
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

export function classifyGeneratedMediaRetention(
  evidence: GeneratedMediaRetentionEvidence,
  profile: GeneratedMediaRetentionProfile = GENERATED_MEDIA_RETENTION_PROFILES.balanced,
): GeneratedMediaRetentionDecision {
  const holds: GeneratedMediaHold[] = []
  const reasons: GeneratedMediaReasonCode[] = ['PHYSICAL_DELETE_NEVER_AUTHORIZED_BY_CLASSIFIER']
  const missingEvidence: string[] = []
  const now = parseUtc(evidence.now, 'now', missingEvidence)
  const updatedAt = parseUtc(evidence.updatedAt, 'updatedAt', missingEvidence)

  if (evidence.operatorHold) {
    holds.push('operator_hold')
    reasons.push('OPERATOR_HOLD')
  }
  if (evidence.regressionFixture) {
    holds.push('regression_fixture_hold')
    reasons.push('REGRESSION_FIXTURE')
  }
  if (evidence.legalOrAuditHold) {
    holds.push('legal_or_audit_hold')
    reasons.push('LEGAL_OR_AUDIT_EVIDENCE')
  }
  if (evidence.galleryAttached) {
    holds.push('gallery_hold', 'business_asset_hold')
    reasons.push('GALLERY_REFERENCE')
  }
  if (evidence.publicOrPublished) {
    holds.push('public_or_published_hold', 'business_asset_hold')
    reasons.push('PUBLIC_OR_PUBLISHED_REFERENCE')
  }
  if (evidence.shopierOrExternalUse) {
    holds.push('shopier_hold', 'business_asset_hold')
    reasons.push('SHOPIER_OR_EXTERNAL_REFERENCE')
  }
  if (evidence.orderOrCampaignUse) {
    holds.push('business_asset_hold')
    reasons.push('ORDER_OR_CAMPAIGN_REFERENCE')
  }
  if (evidence.imageQcDependency) {
    holds.push('image_qc_hold')
    reasons.push('IMAGE_QC_DEPENDENCY')
  }
  if (evidence.activeJob) {
    holds.push('active_job_hold')
    reasons.push('ACTIVE_JOB')
  }
  if (evidence.smokeEvidence) {
    holds.push('smoke_evidence_hold')
    reasons.push('SMOKE_EVIDENCE')
  }
  if (evidence.failureEvidence) {
    holds.push('failure_evidence_hold')
    reasons.push('FAILURE_EVIDENCE')
  }

  if (evidence.mediaKind === 'original' || evidence.originalImagesAttached) {
    holds.push('business_asset_hold')
    reasons.push('ORIGINAL_MEDIA')
    return finish('original_asset', 'PERMANENT_BUSINESS_ASSET', 'ineligible', 'ineligible', null, null, false,
      'Preserve as original product identity evidence.')
  }

  if (evidence.blobState !== 'present') {
    if (evidence.blobState === 'missing') reasons.push('BLOB_MISSING_RECONCILIATION_REQUIRED')
    else reasons.push('BLOB_STATE_UNKNOWN')
    holds.push('legacy_ambiguity_hold')
    return finish('reconciliation_required', 'LEGACY_MANUAL_REVIEW', 'ineligible', 'ineligible', null, null, true,
      'Reconcile record/object state manually; do not delete or detach anything.')
  }

  const lineageMissing = [
    ['jobId', evidence.lineage.jobId, 'MISSING_JOB_ID'],
    ['attemptId', evidence.lineage.attemptId, 'MISSING_ATTEMPT_ID'],
    ['slotId', evidence.lineage.slotId, 'MISSING_SLOT_ID'],
  ] as const
  for (const [field, value, reason] of lineageMissing) {
    if (!value) {
      missingEvidence.push(`lineage.${field}`)
      reasons.push(reason)
    }
  }
  if (evidence.lineage.legacy) reasons.push('LEGACY_LINEAGE_AMBIGUOUS')
  if (evidence.jobRecordExists !== true) {
    if (evidence.jobRecordExists === false) reasons.push('JOB_RECORD_MISSING')
    else missingEvidence.push('jobRecordExists')
  }

  const hasBusinessUse = evidence.galleryAttached || evidence.publicOrPublished || evidence.shopierOrExternalUse || evidence.orderOrCampaignUse
  if (hasBusinessUse || evidence.decision === 'approved') {
    holds.push('business_asset_hold')
    reasons.push('APPROVED_BUSINESS_ASSET')
    return finish(evidence.galleryAttached ? 'approved_attached' : 'approved_unattached', 'PERMANENT_BUSINESS_ASSET',
      'ineligible', 'ineligible', null, null, false, 'Preserve as a business asset; changes require exact operator review.')
  }

  if (evidence.smokeEvidence) {
    return finish('smoke_evidence', 'SMOKE_EVIDENCE', 'ineligible', 'ineligible', null, null, false,
      'Retain until the controlled smoke evidence is explicitly released.')
  }
  if (evidence.failureEvidence || evidence.regressionFixture) {
    return finish('failure_evidence', 'FAILURE_EVIDENCE', 'ineligible', 'ineligible', null, null, false,
      'Retain until issue closure and explicit evidence release.')
  }

  if (evidence.decision === 'pending' || evidence.jobStatus === 'preview' || evidence.jobStatus === 'review') {
    holds.push('pending_decision_hold')
    reasons.push('PENDING_OPERATOR_DECISION')
    return finish('preview_pending', 'PENDING_OPERATOR_DECISION', 'ineligible', 'ineligible', null, null, false,
      'Reconcile through the operator decision flow before any retention clock can start.')
  }

  if (lineageMissing.some(([, value]) => !value) || evidence.lineage.legacy || evidence.jobRecordExists !== true) {
    holds.push('legacy_ambiguity_hold')
    return finish('legacy_unclassified', 'LEGACY_MANUAL_REVIEW', 'ineligible', 'ineligible', null, null, true,
      'Resolve lineage and historical references manually; no automatic cleanup.')
  }

  if (evidence.activeJob) {
    return finish('preview_pending', 'PENDING_OPERATOR_DECISION', 'ineligible', 'ineligible', null, null, false,
      'Wait for the active job to become terminal, then reclassify.')
  }

  if (evidence.orphanSuspected) {
    holds.push('legacy_ambiguity_hold')
    reasons.push('ORPHAN_SUSPECTED_REQUIRES_REVIEW')
    return finish('orphan_suspected', 'ORPHAN_REVIEW', 'ineligible', 'ineligible', null, null, true,
      'Investigate all relationships and lineage before proposing quarantine.')
  }

  let lifecycle: GeneratedMediaLifecycle
  let retentionClass: GeneratedMediaRetentionClass
  let clockValue: string | null | undefined
  let recoveryDays: number
  if (evidence.decision === 'superseded') {
    if (!evidence.replacementAttemptAccepted) {
      holds.push('legacy_ambiguity_hold')
      reasons.push('SUPERSESSION_NOT_PROVEN')
      return finish('legacy_unclassified', 'LEGACY_MANUAL_REVIEW', 'ineligible', 'ineligible', null, null, true,
        'Prove the accepted replacement attempt before starting a supersession clock.')
    }
    lifecycle = 'superseded'
    retentionClass = 'SUPERSEDED_RECOVERABLE'
    clockValue = evidence.supersededAt || evidence.decisionAt
    recoveryDays = profile.supersededRecoveryDays
    reasons.push('SUPERSEDED_BY_ACCEPTED_ATTEMPT')
  } else if (evidence.decision === 'rejected' || evidence.decision === 'partial_unselected') {
    lifecycle = evidence.decision === 'partial_unselected' ? 'partially_approved_unselected' : 'rejected'
    retentionClass = 'REJECTED_RECOVERABLE'
    clockValue = evidence.decisionAt
    recoveryDays = profile.rejectedRecoveryDays
    reasons.push('REJECTED_WITH_RECOVERY_WINDOW')
  } else {
    holds.push('legacy_ambiguity_hold')
    return finish('legacy_unclassified', 'LEGACY_MANUAL_REVIEW', 'ineligible', 'ineligible', null, null, true,
      'Obtain an explicit operator decision before retention classification.')
  }

  const clock = parseUtc(clockValue, lifecycle === 'superseded' ? 'supersededAt' : 'decisionAt', missingEvidence)
  if (clock === null || now === null) {
    holds.push('legacy_ambiguity_hold')
    return finish('legacy_unclassified', 'LEGACY_MANUAL_REVIEW', 'ineligible', 'ineligible', null, null, true,
      'Repair missing or invalid retention-clock evidence before any proposal.')
  }

  const relationshipClock = evidence.relationshipChangedAt
    ? parseUtc(evidence.relationshipChangedAt, 'relationshipChangedAt', missingEvidence)
    : null
  const effectiveClock = relationshipClock !== null && relationshipClock > clock ? relationshipClock : clock
  if (relationshipClock !== null && relationshipClock > clock) reasons.push('RECENT_RELATIONSHIP_CHANGE')
  const quarantineAt = addDaysUtc(effectiveClock, recoveryDays)
  const isRecent = updatedAt !== null && now - updatedAt < profile.recentActivityDays * DAY_MS
  if (isRecent) {
    holds.push('recent_activity_hold')
    reasons.push('RECENT_RELATIONSHIP_CHANGE')
  }
  if (now < Date.parse(quarantineAt)) {
    holds.push('recovery_window_hold')
    reasons.push('RECOVERY_WINDOW_ACTIVE')
  }

  const blockingHolds = unique(holds)
  const quarantineEligibility = blockingHolds.length === 0 ? 'proposal_candidate' : 'future_candidate'
  const quarantinedAt = evidence.quarantinedAt ? parseUtc(evidence.quarantinedAt, 'quarantinedAt', missingEvidence) : null
  let physicalAt: string | null = null
  let physicalEligibility: GeneratedMediaRetentionDecision['physicalCleanupEligibility'] = 'future_candidate'
  if (quarantinedAt !== null) {
    physicalAt = addDaysUtc(quarantinedAt, profile.quarantineGraceDays)
    if (now >= Date.parse(physicalAt) && blockingHolds.length === 0) physicalEligibility = 'candidate_after_quarantine'
  } else {
    reasons.push('QUARANTINE_NOT_IMPLEMENTED')
  }
  if (physicalEligibility === 'candidate_after_quarantine') retentionClass = 'PHYSICAL_CLEANUP_CANDIDATE'
  return finish(lifecycle, retentionClass, quarantineEligibility, physicalEligibility, quarantineAt, physicalAt, false,
    quarantineEligibility === 'proposal_candidate'
      ? 'Include only in an immutable quarantine proposal; do not mutate or delete.'
      : 'Preserve and reclassify after all holds and recovery windows are resolved.')

  function finish(
    lifecycle: GeneratedMediaLifecycle,
    retentionClass: GeneratedMediaRetentionClass,
    quarantineEligibility: GeneratedMediaRetentionDecision['quarantineEligibility'],
    physicalCleanupEligibility: GeneratedMediaRetentionDecision['physicalCleanupEligibility'],
    earliestPossibleQuarantineAt: string | null,
    earliestPossiblePhysicalCleanupAt: string | null,
    manualReviewRequired: boolean,
    safeNextAction: string,
  ): GeneratedMediaRetentionDecision {
    return {
      policyVersion: GENERATED_MEDIA_RETENTION_POLICY_VERSION,
      lifecycle,
      retentionClass,
      holds: unique(holds),
      reasonCodes: unique(reasons),
      missingEvidence: unique(missingEvidence),
      quarantineEligibility,
      physicalCleanupEligibility,
      physicalDeleteAuthorization: false,
      earliestPossibleQuarantineAt,
      earliestPossiblePhysicalCleanupAt,
      manualReviewRequired,
      safeNextAction,
    }
  }
}
