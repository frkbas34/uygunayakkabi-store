import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto'

export const CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION = 'controlled-fresh-candidate-private/v4' as const
export const CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION = 'controlled-fresh-candidate-manifest/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY = 'controlled-fresh-candidate-runtime/v3' as const
export const CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY = 'controlled-fresh-candidate-contract/v3' as const
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_DOMAIN = 'uygunayakkabi:controlled-fresh-candidate:private-receipt:v4' as const
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_CONSUMPTION_DOMAIN = 'uygunayakkabi:controlled-fresh-candidate:receipt-consumption:v3' as const
export const CONTROLLED_FRESH_CANDIDATE_MAX_STORAGE_OBJECTS = 4
export const CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES = 65_536
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_MAX_AUTHORIZATION_WINDOW_MS = 30 * 60 * 1_000

export const CONTROLLED_FRESH_CANDIDATE_PHASES = [
  'authorization_consumed',
  'stock_qualified',
  'product_create_intended',
  'product_committed',
  'media_create_intended',
  'media_retained',
  'relationship_updated',
  'quarantine_observed',
  'finalization_intended',
  'finalization_observed',
  'teardown_observed',
] as const

export type ControlledFreshCandidatePhase = (typeof CONTROLLED_FRESH_CANDIDATE_PHASES)[number]
export type ControlledFreshCandidateQuarantineCertainty = 'unknown' | 'blocked_observed' | 'pending_observed' | 'not_blocked'
export type ControlledFreshCandidateCommitCertainty = 'unknown' | 'rollback_requested' | 'committed_observed'
export type ControlledFreshCandidateCleanupStatus = 'not_started' | 'complete' | 'failed' | 'unknown'
export type ControlledFreshCandidateIntentState = 'not_started' | 'persisted' | 'dispatched'
export type ControlledFreshCandidateObservedCertainty = 'unknown' | 'failed' | 'observed'
export type ControlledFreshCandidateStorageState = 'intended' | 'known_present' | 'uncertain'

export type ControlledFreshCandidateBlobMetadata = {
  key: string
  contentDigest: string
  byteSize: number
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  width: number
  height: number
}
export type ControlledFreshCandidateBlobDescriptor = ControlledFreshCandidateBlobMetadata & {
  candidateIdentity: string
  originalContentDigest: string
  operationId: string
  authorizationIdentity: string
  authorizationDigest: string
}

export function controlledFreshCandidateBlobDescriptor(
  receipt: ControlledFreshCandidatePrivateReceipt,
  metadata: ControlledFreshCandidateBlobMetadata,
): ControlledFreshCandidateBlobDescriptor {
  return { ...metadata, candidateIdentity: receipt.manifest.identity,
    originalContentDigest: receipt.manifest.original.contentDigest, operationId: receipt.executionId,
    authorizationIdentity: receipt.executionAuthorization.identity,
    authorizationDigest: receipt.executionAuthorization.digest }
}

export type ControlledFreshCandidateMutationBudget = {
  stockCandidates: number
  stockLookups: number
  productCreates: number
  mediaCreates: number
  productRelationshipUpdates: number
  productFinalizationUpdates: number
  explicitMediaUpdates: number
  canonicalMediaMetadataUpdates: number
  logicalStorageUploads: number
  productDeletes: number
  mediaDeletes: number
  variantMutations: number
  storageDeletes: number
  automaticMediaDetachUpdates: number
  automaticRequarantineUpdates: number
  otherRecordMutations: number
  operatorRetries: number
  replacementExecutions: number
}

export type ControlledFreshCandidateManifestEvidence = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION
  identity: string
  digest: string
  title: string
  positivePrice: number
  provenanceStatement: string
  stockCandidate: string
  visualFamily: 'generic'
  productFamily: 'shoes'
  productType: 'shoe'
  original: {
    filename: string
    contentDigest: string
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
    byteSize: number
    width: number
    height: number
  }
}

export type ControlledFreshCandidatePrivateReceipt = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION
  executionAuthorization: {
    identity: string
    digest: string
    issuedAt: string
    notBefore: string
    expiresAt: string
    consumed: true
  }
  executionId: string
  manifest: ControlledFreshCandidateManifestEvidence
  runtime: {
    identity: typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY
    contract: typeof CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY
    commit: string
    environment: string
    receiptDestinationDigest: string
  }
  stockCandidate: string
  expectedStateFingerprint: string
  product: {
    state: 'not_created' | 'create_dispatched' | 'retained' | 'identity_rejected'
    id: number | null
    fingerprint: string | null
  }
  media: {
    state: 'not_created' | 'create_dispatched' | 'retained' | 'uncertain'
    id: number | null
    productId: number | null
    expectedFilename: string
    actualFilename: string | null
  }
  storageLedger: Array<{
    ordinal: number
    filename: string
    state: ControlledFreshCandidateStorageState
    descriptor: ControlledFreshCandidateBlobDescriptor
  }>
  transactions: {
    productCreate: {
      intent: ControlledFreshCandidateIntentState
      certainty: ControlledFreshCandidateObservedCertainty
    }
    mediaCreate: {
      intent: ControlledFreshCandidateIntentState
      certainty: ControlledFreshCandidateObservedCertainty
    }
    relationshipUpdate: {
      intent: ControlledFreshCandidateIntentState
      certainty: ControlledFreshCandidateObservedCertainty
    }
    finalization: {
      intent: ControlledFreshCandidateIntentState
      certainty: ControlledFreshCandidateObservedCertainty
    }
  }
  phase: ControlledFreshCandidatePhase
  budgets: ControlledFreshCandidateMutationBudget
  quarantineCertainty: ControlledFreshCandidateQuarantineCertainty
  commitCertainty: ControlledFreshCandidateCommitCertainty
  finalization: {
    requested: boolean
    observed: boolean
  }
  mutationResourceTeardown: {
    attempted: boolean
    completed: boolean
    status: ControlledFreshCandidateCleanupStatus
  }
  authorityClosure: {
    status: 'pending_not_attested'
    boundary: 'outside_durable_receipt'
  }
  seal: string
}

type ReceiptCapabilityState = {
  receipt: ControlledFreshCandidatePrivateReceipt
}

const capabilityRegistry = new WeakMap<object, ReceiptCapabilityState>()

export type ControlledFreshCandidateTargetCapability = Readonly<{
  readonly __controlledFreshCandidateTargetCapability?: never
}>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])]),
  )
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

function exactSafeInteger(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && !Object.is(value, -0)
    && value >= minimum
    && value <= maximum
}

function exactDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function exactCanonicalUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false
  const millis = Date.parse(value)
  return Number.isSafeInteger(millis) && new Date(millis).toISOString() === value
}

function exactIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value)
}

function exactContextIdentity(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && value.length >= 1
    && value.length <= 160
    && /^[a-z0-9][a-z0-9._:/-]*$/i.test(value)
}

function exactStock(value: unknown): value is string {
  return typeof value === 'string' && /^SN\d{4}$/.test(value)
}

function exactFilename(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 16
    && value.length <= 160
    && /^[a-z0-9][a-z0-9._-]+$/i.test(value)
    && !value.includes('..')
}

function exactBudget(value: unknown): value is ControlledFreshCandidateMutationBudget {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'stockCandidates', 'stockLookups', 'productCreates', 'mediaCreates',
    'productRelationshipUpdates', 'productFinalizationUpdates', 'explicitMediaUpdates',
    'canonicalMediaMetadataUpdates', 'logicalStorageUploads', 'productDeletes',
    'mediaDeletes', 'variantMutations', 'storageDeletes', 'automaticMediaDetachUpdates',
    'automaticRequarantineUpdates', 'otherRecordMutations', 'operatorRetries',
    'replacementExecutions',
  ])) return false
  const budget = value as ControlledFreshCandidateMutationBudget
  return Object.values(budget).every((entry) => exactSafeInteger(entry, 0, 4))
    && budget.stockCandidates <= 1
    && budget.stockLookups <= 1
    && budget.productCreates <= 1
    && budget.mediaCreates <= 1
    && budget.productRelationshipUpdates <= 1
    && budget.productFinalizationUpdates <= 1
    && budget.explicitMediaUpdates === 0
    && budget.canonicalMediaMetadataUpdates <= 1
    && budget.logicalStorageUploads <= CONTROLLED_FRESH_CANDIDATE_MAX_STORAGE_OBJECTS
    && budget.productDeletes === 0
    && budget.mediaDeletes === 0
    && budget.variantMutations === 0
    && budget.storageDeletes === 0
    && budget.automaticMediaDetachUpdates === 0
    && budget.automaticRequarantineUpdates === 0
    && budget.otherRecordMutations === 0
    && budget.operatorRetries === 0
    && budget.replacementExecutions === 0
}

function exactManifest(value: unknown): value is ControlledFreshCandidateManifestEvidence {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'identity', 'digest', 'title', 'positivePrice', 'provenanceStatement',
    'stockCandidate', 'visualFamily', 'productFamily', 'productType', 'original',
  ])) return false
  if (!isPlainRecord(value.original) || !hasExactOwnKeys(value.original, [
    'filename', 'contentDigest', 'mimeType', 'byteSize', 'width', 'height',
  ])) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION
    && exactIdentity(value.identity)
    && exactDigest(value.digest)
    && typeof value.title === 'string' && value.title.trim() === value.title && value.title.length >= 1 && value.title.length <= 160
    && typeof value.positivePrice === 'number' && Number.isFinite(value.positivePrice) && value.positivePrice > 0
    && typeof value.provenanceStatement === 'string' && value.provenanceStatement.trim() === value.provenanceStatement && value.provenanceStatement.length >= 1 && value.provenanceStatement.length <= 1_000
    && exactStock(value.stockCandidate)
    && value.visualFamily === 'generic'
    && value.productFamily === 'shoes'
    && value.productType === 'shoe'
    && exactFilename(value.original.filename)
    && exactDigest(value.original.contentDigest)
    && ['image/jpeg', 'image/png', 'image/webp'].includes(String(value.original.mimeType))
    && exactSafeInteger(value.original.byteSize, 1, 10_000_000)
    && exactSafeInteger(value.original.width, 1, 20_000)
    && exactSafeInteger(value.original.height, 1, 20_000)
    && value.original.width * value.original.height <= 40_000_000
}

function exactTransactionStage(value: unknown): boolean {
  return isPlainRecord(value)
    && hasExactOwnKeys(value, ['intent', 'certainty'])
    && ['not_started', 'persisted', 'dispatched'].includes(String(value.intent))
    && ['unknown', 'failed', 'observed'].includes(String(value.certainty))
}

function exactReceiptShape(value: unknown, verifyBindings = true): value is ControlledFreshCandidatePrivateReceipt {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'executionAuthorization', 'executionId', 'manifest', 'runtime',
    'stockCandidate', 'expectedStateFingerprint', 'product', 'media', 'storageLedger',
    'transactions', 'phase', 'budgets', 'quarantineCertainty', 'commitCertainty',
    'finalization', 'mutationResourceTeardown', 'authorityClosure', 'seal',
  ])) return false
  if (!isPlainRecord(value.executionAuthorization) || !hasExactOwnKeys(value.executionAuthorization, [
    'identity', 'digest', 'issuedAt', 'notBefore', 'expiresAt', 'consumed',
  ])) return false
  if (!isPlainRecord(value.runtime) || !hasExactOwnKeys(value.runtime, [
    'identity', 'contract', 'commit', 'environment', 'receiptDestinationDigest',
  ])) return false
  if (!isPlainRecord(value.product) || !hasExactOwnKeys(value.product, ['state', 'id', 'fingerprint'])) return false
  if (!isPlainRecord(value.media) || !hasExactOwnKeys(value.media, ['state', 'id', 'productId', 'expectedFilename', 'actualFilename'])) return false
  if (!isPlainRecord(value.transactions) || !hasExactOwnKeys(value.transactions, ['productCreate', 'mediaCreate', 'relationshipUpdate', 'finalization'])) return false
  if (!isPlainRecord(value.finalization) || !hasExactOwnKeys(value.finalization, ['requested', 'observed'])) return false
  if (!isPlainRecord(value.mutationResourceTeardown) || !hasExactOwnKeys(value.mutationResourceTeardown, ['attempted', 'completed', 'status'])) return false
  if (!isPlainRecord(value.authorityClosure) || !hasExactOwnKeys(value.authorityClosure, ['status', 'boundary'])) return false
  if (!Array.isArray(value.storageLedger) || value.storageLedger.length > CONTROLLED_FRESH_CANDIDATE_MAX_STORAGE_OBJECTS) return false
  const ordinals = new Set<number>()
  const filenames = new Set<string>()
  for (const entry of value.storageLedger) {
    if (!isPlainRecord(entry) || !hasExactOwnKeys(entry, ['ordinal', 'filename', 'state', 'descriptor'])) return false
    if (!exactSafeInteger(entry.ordinal, 1, CONTROLLED_FRESH_CANDIDATE_MAX_STORAGE_OBJECTS) || ordinals.has(entry.ordinal)) return false
    if (!exactFilename(entry.filename) || !['intended', 'known_present', 'uncertain'].includes(String(entry.state))) return false
    const descriptor = entry.descriptor
    if (!isPlainRecord(descriptor) || !hasExactOwnKeys(descriptor, [
      'key', 'contentDigest', 'byteSize', 'mimeType', 'width', 'height', 'candidateIdentity',
      'originalContentDigest', 'operationId', 'authorizationIdentity', 'authorizationDigest',
    ]) || filenames.has(entry.filename) || descriptor.key !== entry.filename
      || !exactDigest(descriptor.contentDigest) || !exactSafeInteger(descriptor.byteSize, 1, 10_000_000)
      || !['image/jpeg', 'image/png', 'image/webp'].includes(String(descriptor.mimeType))
      || !exactSafeInteger(descriptor.width, 1, 20_000) || !exactSafeInteger(descriptor.height, 1, 20_000)
      || !isPlainRecord(value.manifest) || !isPlainRecord(value.manifest.original)
      || verifyBindings && (descriptor.candidateIdentity !== value.manifest.identity
      || descriptor.originalContentDigest !== value.manifest.original.contentDigest
      || descriptor.operationId !== value.executionId
      || descriptor.authorizationIdentity !== value.executionAuthorization.identity
      || descriptor.authorizationDigest !== value.executionAuthorization.digest)) return false
    const originalMetadata = value.manifest.original
    if (verifyBindings && entry.filename === originalMetadata.filename) {
      if (['contentDigest', 'byteSize', 'mimeType', 'width', 'height']
        .some((key) => descriptor[key] !== originalMetadata[key])) return false
    } else if (verifyBindings) {
      const original = String(value.manifest.original.filename)
      const extension = original.slice(original.lastIndexOf('.'))
      const stem = original.slice(0, -extension.length)
      if (![300, 600, 1200].some((size) => entry.filename === `${stem}-${size}x${size}${extension}`
        && descriptor.width === size && descriptor.height === size)
        || descriptor.mimeType !== value.manifest.original.mimeType) return false
    }
    ordinals.add(entry.ordinal)
    filenames.add(entry.filename)
  }
  const productId = value.product.id
  const mediaId = value.media.id
  const mediaProductId = value.media.productId
  const issuedAt = Date.parse(String(value.executionAuthorization.issuedAt))
  const notBefore = Date.parse(String(value.executionAuthorization.notBefore))
  const expiresAt = Date.parse(String(value.executionAuthorization.expiresAt))
  return value.version === CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION
    && exactIdentity(value.executionAuthorization.identity)
    && exactDigest(value.executionAuthorization.digest)
    && exactCanonicalUtcTimestamp(value.executionAuthorization.issuedAt)
    && exactCanonicalUtcTimestamp(value.executionAuthorization.notBefore)
    && exactCanonicalUtcTimestamp(value.executionAuthorization.expiresAt)
    && issuedAt <= notBefore
    && notBefore < expiresAt
    && expiresAt - issuedAt <= CONTROLLED_FRESH_CANDIDATE_RECEIPT_MAX_AUTHORIZATION_WINDOW_MS
    && value.executionAuthorization.consumed === true
    && exactIdentity(value.executionId)
    && exactManifest(value.manifest)
    && value.runtime.identity === CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY
    && value.runtime.contract === CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY
    && exactContextIdentity(value.runtime.commit)
    && exactContextIdentity(value.runtime.environment)
    && exactDigest(value.runtime.receiptDestinationDigest)
    && exactStock(value.stockCandidate)
    && exactDigest(value.expectedStateFingerprint)
    && ['not_created', 'create_dispatched', 'retained', 'identity_rejected'].includes(String(value.product.state))
    && (productId === null || exactSafeInteger(productId, 1, Number.MAX_SAFE_INTEGER))
    && (value.product.fingerprint === null || exactDigest(value.product.fingerprint))
    && ['not_created', 'create_dispatched', 'retained', 'uncertain'].includes(String(value.media.state))
    && (mediaId === null || exactSafeInteger(mediaId, 1, Number.MAX_SAFE_INTEGER))
    && (mediaProductId === null || exactSafeInteger(mediaProductId, 1, Number.MAX_SAFE_INTEGER))
    && exactFilename(value.media.expectedFilename)
    && (value.media.actualFilename === null || exactFilename(value.media.actualFilename))
    && exactTransactionStage(value.transactions.productCreate)
    && exactTransactionStage(value.transactions.mediaCreate)
    && exactTransactionStage(value.transactions.relationshipUpdate)
    && exactTransactionStage(value.transactions.finalization)
    && CONTROLLED_FRESH_CANDIDATE_PHASES.includes(value.phase as ControlledFreshCandidatePhase)
    && exactBudget(value.budgets)
    && ['unknown', 'blocked_observed', 'pending_observed', 'not_blocked'].includes(String(value.quarantineCertainty))
    && ['unknown', 'rollback_requested', 'committed_observed'].includes(String(value.commitCertainty))
    && typeof value.finalization.requested === 'boolean'
    && typeof value.finalization.observed === 'boolean'
    && typeof value.mutationResourceTeardown.attempted === 'boolean'
    && typeof value.mutationResourceTeardown.completed === 'boolean'
    && ['not_started', 'complete', 'failed', 'unknown'].includes(String(value.mutationResourceTeardown.status))
    && value.authorityClosure.status === 'pending_not_attested'
    && value.authorityClosure.boundary === 'outside_durable_receipt'
    && exactDigest(value.seal)
}

function keyBuffer(key: Uint8Array): Buffer {
  const buffer = Buffer.from(key)
  if (buffer.byteLength < 32 || buffer.byteLength > 128) throw new Error('CONTROLLED_RECEIPT_KEY_INVALID')
  return buffer
}

function receiptSeal(
  unsigned: Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
  key: Uint8Array,
): string {
  return createHmac('sha256', keyBuffer(key))
    .update(CONTROLLED_FRESH_CANDIDATE_RECEIPT_DOMAIN)
    .update('\0')
    .update(canonicalJson(unsigned))
    .digest('hex')
}

export function sealControlledFreshCandidateReceipt(
  unsigned: Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
  key: Uint8Array,
): ControlledFreshCandidatePrivateReceipt {
  const candidate = { ...structuredClone(unsigned), seal: receiptSeal(unsigned, key) }
  if (!exactReceiptShape(candidate)) throw new Error('CONTROLLED_RECEIPT_SHAPE_INVALID')
  return candidate
}

export function serializeControlledFreshCandidateReceipt(
  receipt: ControlledFreshCandidatePrivateReceipt,
): string {
  if (!exactReceiptShape(receipt)) throw new Error('CONTROLLED_RECEIPT_SHAPE_INVALID')
  return canonicalJson(receipt)
}

export function authenticateControlledFreshCandidateReceipt(params: {
  serialized: string
  key: Uint8Array
  expectedRuntimeIdentity?: string
  expectedContractIdentity?: string
  expectedCommitIdentity: string
  expectedEnvironmentIdentity: string
  expectedReceiptDestinationDigest?: string
  consume(consumptionIdentity: string): boolean
}): ControlledFreshCandidateTargetCapability {
  let parsed: unknown
  try {
    parsed = JSON.parse(params.serialized)
  } catch {
    throw new Error('CONTROLLED_RECEIPT_MALFORMED')
  }
  if (params.serialized !== canonicalJson(parsed)) throw new Error('CONTROLLED_RECEIPT_NONCANONICAL')
  if (!exactReceiptShape(parsed, false)) throw new Error('CONTROLLED_RECEIPT_MALFORMED')
  if (
    parsed.runtime.identity !== (params.expectedRuntimeIdentity ?? CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY)
    || parsed.runtime.contract !== (params.expectedContractIdentity ?? CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY)
    || parsed.runtime.commit !== params.expectedCommitIdentity
    || parsed.runtime.environment !== params.expectedEnvironmentIdentity
    || (
      params.expectedReceiptDestinationDigest !== undefined
      && parsed.runtime.receiptDestinationDigest !== params.expectedReceiptDestinationDigest
    )
  ) throw new Error('CONTROLLED_RECEIPT_CONTEXT_MISMATCH')
  const { seal, ...unsigned } = parsed
  const expected = receiptSeal(unsigned, params.key)
  const suppliedSeal = Buffer.from(seal, 'hex')
  const expectedSeal = Buffer.from(expected, 'hex')
  if (suppliedSeal.byteLength !== expectedSeal.byteLength || !timingSafeEqual(suppliedSeal, expectedSeal)) {
    throw new Error('CONTROLLED_RECEIPT_AUTHENTICATION_FAILED')
  }
  if (!exactReceiptShape(parsed)) throw new Error('CONTROLLED_RECEIPT_MALFORMED')
  const completedTeardownEligible = (
    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'
  )
  if (!completedTeardownEligible) {
    throw new Error('CONTROLLED_RECEIPT_TEARDOWN_INCOMPLETE')
  }
  const consumptionIdentity = createHmac('sha256', keyBuffer(params.key))
    .update(CONTROLLED_FRESH_CANDIDATE_RECEIPT_CONSUMPTION_DOMAIN)
    .update('\0')
    .update(seal)
    .update('\0')
    .update(parsed.runtime.identity)
    .update('\0')
    .update(parsed.runtime.contract)
    .update('\0')
    .update(parsed.runtime.commit)
    .update('\0')
    .update(parsed.runtime.environment)
    .digest('hex')
  let consumed = false
  try {
    consumed = params.consume(consumptionIdentity)
  } catch {
    throw new Error('CONTROLLED_RECEIPT_CONSUMPTION_FAILED')
  }
  if (!consumed) throw new Error('CONTROLLED_RECEIPT_REPLAYED')
  const capability = Object.freeze(Object.create(null)) as ControlledFreshCandidateTargetCapability
  capabilityRegistry.set(capability, { receipt: structuredClone(parsed) })
  return capability
}

export function authenticateControlledFreshCandidateReceiptBytes(params: {
  bytes: Uint8Array
  key: Uint8Array
  expectedRuntimeIdentity?: string
  expectedContractIdentity?: string
  expectedCommitIdentity: string
  expectedEnvironmentIdentity: string
  expectedReceiptDestinationDigest?: string
  consume(consumptionIdentity: string): boolean
}): ControlledFreshCandidateTargetCapability {
  if (
    !(params.bytes instanceof Uint8Array)
    || params.bytes.byteLength > CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES
  ) throw new Error('CONTROLLED_RECEIPT_BYTES_INVALID')
  const bytes = Buffer.from(params.bytes)
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error('CONTROLLED_RECEIPT_BYTES_INVALID')
  }
  let serialized: string
  try {
    serialized = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
  } catch {
    throw new Error('CONTROLLED_RECEIPT_BYTES_INVALID')
  }
  if (!Buffer.from(serialized, 'utf8').equals(bytes)) {
    throw new Error('CONTROLLED_RECEIPT_BYTES_INVALID')
  }
  return authenticateControlledFreshCandidateReceipt({
    serialized,
    key: params.key,
    expectedRuntimeIdentity: params.expectedRuntimeIdentity,
    expectedContractIdentity: params.expectedContractIdentity,
    expectedCommitIdentity: params.expectedCommitIdentity,
    expectedEnvironmentIdentity: params.expectedEnvironmentIdentity,
    expectedReceiptDestinationDigest: params.expectedReceiptDestinationDigest,
    consume: params.consume,
  })
}

export function readControlledFreshCandidateCapability(
  capability: ControlledFreshCandidateTargetCapability,
): ControlledFreshCandidatePrivateReceipt {
  if (!capability || typeof capability !== 'object') throw new Error('CONTROLLED_TARGET_CAPABILITY_INVALID')
  const state = capabilityRegistry.get(capability as object)
  if (!state) throw new Error('CONTROLLED_TARGET_CAPABILITY_INVALID')
  return structuredClone(state.receipt)
}

export function phaseIndex(phase: ControlledFreshCandidatePhase): number {
  return CONTROLLED_FRESH_CANDIDATE_PHASES.indexOf(phase)
}

export function resealControlledFreshCandidateReceipt(
  receipt: ControlledFreshCandidatePrivateReceipt,
  key: Uint8Array,
  transform: (draft: ControlledFreshCandidatePrivateReceipt) => void,
): ControlledFreshCandidatePrivateReceipt {
  if (!exactReceiptShape(receipt)) throw new Error('CONTROLLED_RECEIPT_SHAPE_INVALID')
  const draft = structuredClone(receipt)
  const previousPhase = phaseIndex(draft.phase)
  transform(draft)
  if (phaseIndex(draft.phase) < previousPhase) throw new Error('CONTROLLED_RECEIPT_PHASE_REGRESSION')
  const unsigned = structuredClone(draft) as Partial<ControlledFreshCandidatePrivateReceipt>
  delete unsigned.seal
  return sealControlledFreshCandidateReceipt(
    unsigned as Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
    key,
  )
}
