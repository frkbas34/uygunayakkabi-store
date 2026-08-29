import {
  CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS,
  CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION,
  controlledFreshCandidateDigest,
  controlledFreshCandidateMediaMatches,
  controlledFreshCandidateProductMatches,
  createControlledFreshCandidateOperationScope,
  fixedControlledFreshCandidateProduct,
  type ControlledFreshCandidatePublicCounts,
} from './controlledFreshCandidateCreation'
import {
  captureFreshVisualStrictTargetSnapshot,
  FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID,
  type FreshVisualStrictTargetDependencies,
  type FreshVisualStrictTargetSnapshot,
} from './freshVisualProductDiscovery'
import {
  readControlledFreshCandidateCapability,
  type ControlledFreshCandidateCleanupStatus,
  type ControlledFreshCandidateCommitCertainty,
  type ControlledFreshCandidatePhase,
  type ControlledFreshCandidateQuarantineCertainty,
  type ControlledFreshCandidateTargetCapability,
} from './controlledFreshCandidateReceipt'

export type ControlledFreshCandidateStrictVerdict =
  | 'STRICT_FRESH_TARGET_READY'
  | 'STRICT_FRESH_TARGET_BLOCKED'
  | 'STRICT_FRESH_TARGET_UNSUPPORTED'

export type ControlledFreshCandidateStrictReasonCode =
  | 'STRICT_TARGET_READY'
  | 'RECEIPT_CAPABILITY_INVALID'
  | 'RECEIPT_CONSTRUCTION_INCOMPLETE'
  | 'RECEIPT_TARGET_INVALID'
  | 'STRICT_TARGET_CAPTURE_UNSUPPORTED'
  | 'STRICT_TARGET_STATE_DRIFTED'
  | 'STRICT_TARGET_PRODUCT_MATRIX_MISMATCH'
  | 'STRICT_TARGET_MEDIA_COUNT_INVALID'
  | 'STRICT_TARGET_ORDERED_ORIGINAL_INVALID'
  | 'STRICT_TARGET_MEDIA_OWNERSHIP_INVALID'
  | 'STRICT_TARGET_GENERATION_HISTORY_PRESENT'
  | 'STRICT_TARGET_QUEUE_RECEIPT_PRESENT'
  | 'STRICT_TARGET_BOT_EVENT_PRESENT'
  | 'STRICT_TARGET_STORY_JOB_PRESENT'
  | 'STRICT_TARGET_MANIFEST_MISMATCH'
  | 'STRICT_TARGET_ORIGINAL_EVIDENCE_INVALID'
  | 'STRICT_TARGET_TEARDOWN_FAILED'

export type ControlledFreshCandidateStrictTargetReport = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION
  verdict: ControlledFreshCandidateStrictVerdict
  reasonCodes: ControlledFreshCandidateStrictReasonCode[]
  counts: ControlledFreshCandidatePublicCounts
  phase: ControlledFreshCandidatePhase | 'not_started'
  quarantineCertainty: ControlledFreshCandidateQuarantineCertainty
  commitCertainty: ControlledFreshCandidateCommitCertainty
  cleanupStatus: ControlledFreshCandidateCleanupStatus
  ownerInputManifestMatch: boolean
  eligibleForPublishing: false
  eligibleForVisualOnlyGeneration: boolean
}

export type ControlledFreshCandidateStrictTargetDependencies = FreshVisualStrictTargetDependencies & {
  teardown(): Promise<{ ok: true } | { ok: false }>
}

const STRICT_REASON_CODES = new Set<ControlledFreshCandidateStrictReasonCode>([
  'STRICT_TARGET_READY', 'RECEIPT_CAPABILITY_INVALID', 'RECEIPT_CONSTRUCTION_INCOMPLETE',
  'RECEIPT_TARGET_INVALID', 'STRICT_TARGET_CAPTURE_UNSUPPORTED', 'STRICT_TARGET_STATE_DRIFTED',
  'STRICT_TARGET_PRODUCT_MATRIX_MISMATCH', 'STRICT_TARGET_MEDIA_COUNT_INVALID',
  'STRICT_TARGET_ORDERED_ORIGINAL_INVALID', 'STRICT_TARGET_MEDIA_OWNERSHIP_INVALID',
  'STRICT_TARGET_GENERATION_HISTORY_PRESENT', 'STRICT_TARGET_QUEUE_RECEIPT_PRESENT',
  'STRICT_TARGET_BOT_EVENT_PRESENT', 'STRICT_TARGET_STORY_JOB_PRESENT',
  'STRICT_TARGET_MANIFEST_MISMATCH', 'STRICT_TARGET_ORIGINAL_EVIDENCE_INVALID',
  'STRICT_TARGET_TEARDOWN_FAILED',
])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function relationshipId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value
  if (isPlainRecord(value)) return relationshipId(value.id)
  return null
}

function relationshipArray(value: unknown, field: string): number[] | null {
  if (!Array.isArray(value)) return null
  const result: number[] = []
  for (const entry of value) {
    if (!isPlainRecord(entry)) return null
    const id = relationshipId(entry[field])
    if (!id) return null
    result.push(id)
  }
  return result
}

function publicCounts(budgets: Record<string, number>): ControlledFreshCandidatePublicCounts {
  return Object.fromEntries(
    CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.map((key) => [key, budgets[key] ?? 0]),
  ) as ControlledFreshCandidatePublicCounts
}

function report(params: {
  verdict: ControlledFreshCandidateStrictVerdict
  reasonCodes: ControlledFreshCandidateStrictReasonCode[]
  counts?: ControlledFreshCandidatePublicCounts
  phase?: ControlledFreshCandidatePhase
  quarantineCertainty?: ControlledFreshCandidateQuarantineCertainty
  commitCertainty?: ControlledFreshCandidateCommitCertainty
  cleanupStatus?: ControlledFreshCandidateCleanupStatus
  ownerInputManifestMatch?: boolean
  eligible?: boolean
}): ControlledFreshCandidateStrictTargetReport {
  return {
    version: CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION,
    verdict: params.verdict,
    reasonCodes: [...new Set(params.reasonCodes)].sort(),
    counts: params.counts ?? Object.fromEntries(
      CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.map((key) => [key, 0]),
    ) as ControlledFreshCandidatePublicCounts,
    phase: params.phase ?? 'not_started',
    quarantineCertainty: params.quarantineCertainty ?? 'unknown',
    commitCertainty: params.commitCertainty ?? 'unknown',
    cleanupStatus: params.cleanupStatus ?? 'not_started',
    ownerInputManifestMatch: params.ownerInputManifestMatch ?? false,
    eligibleForPublishing: false,
    eligibleForVisualOnlyGeneration: params.eligible === true,
  }
}

function receiptManifestIsInternallyConsistent(manifest: Record<string, unknown>): boolean {
  if (!hasExactOwnKeys(manifest, [
    'version', 'identity', 'digest', 'title', 'positivePrice', 'provenanceStatement',
    'stockCandidate', 'visualFamily', 'productFamily', 'productType', 'original',
  ])) return false
  const { digest, ...unsigned } = manifest
  return typeof digest === 'string' && controlledFreshCandidateDigest(unsigned) === digest
}

function receiptConstructionIsComplete(
  receipt: ReturnType<typeof readControlledFreshCandidateCapability>,
): boolean {
  const expectedOne = [
    receipt.budgets.stockCandidates,
    receipt.budgets.stockLookups,
    receipt.budgets.productCreates,
    receipt.budgets.mediaCreates,
    receipt.budgets.productRelationshipUpdates,
    receipt.budgets.productFinalizationUpdates,
    receipt.budgets.canonicalMediaMetadataUpdates,
  ]
  const transactionStages = [
    receipt.transactions.productCreate,
    receipt.transactions.mediaCreate,
    receipt.transactions.relationshipUpdate,
    receipt.transactions.finalization,
  ]
  return receipt.phase === 'teardown_observed'
    && receipt.stockCandidate === receipt.manifest.stockCandidate
    && receipt.product.state === 'retained'
    && receipt.product.fingerprint !== null
    && receipt.media.state === 'retained'
    && receipt.media.expectedFilename === receipt.manifest.original.filename
    && receipt.media.actualFilename === receipt.manifest.original.filename
    && receipt.storageLedger.length >= 1
    && receipt.storageLedger.length <= 4
    && receipt.storageLedger.every((entry) => entry.state === 'known_present')
    && receipt.storageLedger.some((entry) => entry.filename === receipt.manifest.original.filename)
    && receipt.budgets.logicalStorageUploads === receipt.storageLedger.length
    && expectedOne.every((count) => count === 1)
    && transactionStages.every((stage) => stage.intent === 'dispatched' && stage.certainty === 'observed')
    && receipt.budgets.explicitMediaUpdates === 0
    && receipt.budgets.productDeletes === 0
    && receipt.budgets.mediaDeletes === 0
    && receipt.budgets.variantMutations === 0
    && receipt.budgets.storageDeletes === 0
    && receipt.budgets.automaticMediaDetachUpdates === 0
    && receipt.budgets.automaticRequarantineUpdates === 0
    && receipt.budgets.otherRecordMutations === 0
    && receipt.budgets.operatorRetries === 0
    && receipt.budgets.replacementExecutions === 0
    && receipt.finalization.requested === true
    && receipt.finalization.observed === true
    && receipt.commitCertainty === 'committed_observed'
    && receipt.quarantineCertainty === 'pending_observed'
    && receipt.teardown.attempted === true
    && receipt.teardown.completed === true
    && receipt.cleanupStatus === 'complete'
}

function assessSnapshot(params: {
  snapshot: FreshVisualStrictTargetSnapshot
  productId: number
  mediaId: number
  receipt: ReturnType<typeof readControlledFreshCandidateCapability>
}): ControlledFreshCandidateStrictReasonCode[] {
  const reasons: ControlledFreshCandidateStrictReasonCode[] = []
  const { snapshot, productId, mediaId, receipt } = params
  if (!controlledFreshCandidateProductMatches({
    product: snapshot.product,
    manifest: receipt.manifest,
    confirmationStatus: 'pending',
    mediaId,
  })) reasons.push('STRICT_TARGET_PRODUCT_MATRIX_MISMATCH')

  const ordered = relationshipArray(snapshot.product.images, 'image')
  const gallery = relationshipArray(snapshot.product.generativeGallery, 'image')
  if (!ordered || ordered.length !== 1 || ordered[0] !== mediaId || !gallery || gallery.length !== 0) {
    reasons.push('STRICT_TARGET_ORDERED_ORIGINAL_INVALID')
  }
  if (snapshot.media.length !== 1) {
    reasons.push('STRICT_TARGET_MEDIA_COUNT_INVALID')
  } else if (!controlledFreshCandidateMediaMatches({
    media: snapshot.media[0],
    manifest: receipt.manifest,
    productId,
    mediaId,
  })) {
    reasons.push('STRICT_TARGET_MEDIA_OWNERSHIP_INVALID')
  }
  if (!snapshot.galleryOwnershipRead || snapshot.galleryOwners.length > 0) {
    reasons.push('STRICT_TARGET_MEDIA_OWNERSHIP_INVALID')
  }
  if (snapshot.jobs.length > 0) reasons.push('STRICT_TARGET_GENERATION_HISTORY_PRESENT')
  if (snapshot.receipts.length > 0) reasons.push('STRICT_TARGET_QUEUE_RECEIPT_PRESENT')
  if (snapshot.botEvents.length > 0) reasons.push('STRICT_TARGET_BOT_EVENT_PRESENT')
  if (snapshot.storyJobs.length > 0) reasons.push('STRICT_TARGET_STORY_JOB_PRESENT')

  const evidence = snapshot.originalEvidence
  if (
    !evidence
    || !evidence.ok
    || evidence.contentDigest !== receipt.manifest.original.contentDigest
    || evidence.mimeType !== receipt.manifest.original.mimeType
    || evidence.byteSize !== receipt.manifest.original.byteSize
    || evidence.width !== receipt.manifest.original.width
    || evidence.height !== receipt.manifest.original.height
  ) reasons.push('STRICT_TARGET_ORIGINAL_EVIDENCE_INVALID')
  return reasons
}

export function validateControlledFreshCandidateStrictTargetReport(
  value: unknown,
): value is ControlledFreshCandidateStrictTargetReport {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'verdict', 'reasonCodes', 'counts', 'phase', 'quarantineCertainty',
    'commitCertainty', 'cleanupStatus', 'ownerInputManifestMatch', 'eligibleForPublishing',
    'eligibleForVisualOnlyGeneration',
  ])) return false
  if (!isPlainRecord(value.counts) || !hasExactOwnKeys(value.counts, CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS)) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION
    && ['STRICT_FRESH_TARGET_READY', 'STRICT_FRESH_TARGET_BLOCKED', 'STRICT_FRESH_TARGET_UNSUPPORTED'].includes(String(value.verdict))
    && Array.isArray(value.reasonCodes)
    && value.reasonCodes.length >= 1
    && value.reasonCodes.every((code) => typeof code === 'string' && STRICT_REASON_CODES.has(code as ControlledFreshCandidateStrictReasonCode))
    && Object.values(value.counts).every((count) => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && count <= 4)
    && (value.phase === 'not_started' || [
      'authorization_consumed', 'stock_qualified', 'product_create_intended', 'product_committed',
      'media_create_intended', 'media_retained', 'relationship_updated', 'quarantine_observed',
      'finalization_intended', 'finalization_observed', 'teardown_observed',
    ].includes(String(value.phase)))
    && ['unknown', 'blocked_observed', 'pending_observed', 'not_blocked'].includes(String(value.quarantineCertainty))
    && ['unknown', 'rollback_requested', 'committed_observed'].includes(String(value.commitCertainty))
    && ['not_started', 'complete', 'failed', 'unknown'].includes(String(value.cleanupStatus))
    && typeof value.ownerInputManifestMatch === 'boolean'
    && value.eligibleForPublishing === false
    && typeof value.eligibleForVisualOnlyGeneration === 'boolean'
    && (value.eligibleForVisualOnlyGeneration === false || value.verdict === 'STRICT_FRESH_TARGET_READY')
}

export async function verifyControlledFreshCandidateTarget(params: {
  capability: ControlledFreshCandidateTargetCapability
  dependencies: ControlledFreshCandidateStrictTargetDependencies
}): Promise<ControlledFreshCandidateStrictTargetReport> {
  let receipt: ReturnType<typeof readControlledFreshCandidateCapability>
  try {
    receipt = readControlledFreshCandidateCapability(params.capability)
  } catch {
    try { await params.dependencies.teardown() } catch { /* sanitized report only */ }
    return report({ verdict: 'STRICT_FRESH_TARGET_BLOCKED', reasonCodes: ['RECEIPT_CAPABILITY_INVALID'] })
  }
  const counts = publicCounts(receipt.budgets)
  const operationScope = params.dependencies.operationScope ?? createControlledFreshCandidateOperationScope({
    now: params.dependencies.now,
  })
  const controlledDependencies = { ...params.dependencies, operationScope }
  const common = {
    counts,
    phase: receipt.phase,
    quarantineCertainty: receipt.quarantineCertainty,
    commitCertainty: receipt.commitCertainty,
    cleanupStatus: receipt.cleanupStatus,
  }
  const productId = receipt.product.id
  const mediaId = receipt.media.id
  let reasonCodes: ControlledFreshCandidateStrictReasonCode[] = []
  let unsupported = false
  const manifestRecord = receipt.manifest as unknown as Record<string, unknown>
  const manifestMatch = receiptManifestIsInternallyConsistent(manifestRecord)
    && receipt.expectedStateFingerprint === controlledFreshCandidateDigest(
      fixedControlledFreshCandidateProduct(receipt.manifest, 'pending'),
    )
  if (!manifestMatch) reasonCodes.push('STRICT_TARGET_MANIFEST_MISMATCH')
  if (!receiptConstructionIsComplete(receipt)) reasonCodes.push('RECEIPT_CONSTRUCTION_INCOMPLETE')
  if (
    !productId
    || !Number.isSafeInteger(productId)
    || productId <= 0
    || productId === FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID
    || !mediaId
    || !Number.isSafeInteger(mediaId)
    || mediaId <= 0
    || receipt.media.productId !== productId
  ) reasonCodes.push('RECEIPT_TARGET_INVALID')

  if (reasonCodes.length === 0 && productId && mediaId) {
    const first = await captureFreshVisualStrictTargetSnapshot({ productId, dependencies: controlledDependencies })
    const second = await captureFreshVisualStrictTargetSnapshot({ productId, dependencies: controlledDependencies })
    if (!first.ok || !second.ok) {
      reasonCodes.push('STRICT_TARGET_CAPTURE_UNSUPPORTED')
      unsupported = true
    } else if (first.snapshot.observationDigest !== second.snapshot.observationDigest) {
      reasonCodes.push('STRICT_TARGET_STATE_DRIFTED')
    } else {
      reasonCodes.push(...assessSnapshot({ snapshot: first.snapshot, productId, mediaId, receipt }))
      reasonCodes.push(...assessSnapshot({ snapshot: second.snapshot, productId, mediaId, receipt }))
    }
  }

  let teardownOk = false
  try { teardownOk = (await params.dependencies.teardown()).ok } catch { teardownOk = false }
  if (!params.dependencies.operationScope) operationScope.close()
  if (!teardownOk) reasonCodes.push('STRICT_TARGET_TEARDOWN_FAILED')
  reasonCodes = [...new Set(reasonCodes)].sort()
  const ready = reasonCodes.length === 0
  return report({
    verdict: ready ? 'STRICT_FRESH_TARGET_READY' : unsupported ? 'STRICT_FRESH_TARGET_UNSUPPORTED' : 'STRICT_FRESH_TARGET_BLOCKED',
    reasonCodes: ready ? ['STRICT_TARGET_READY'] : reasonCodes,
    ...common,
    cleanupStatus: teardownOk ? 'complete' : 'failed',
    ownerInputManifestMatch: manifestMatch,
    eligible: ready,
  })
}
