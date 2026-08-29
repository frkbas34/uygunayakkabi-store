import {
  createHash,
  randomBytes as nodeRandomBytes,
} from 'node:crypto'

import {
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
  resealControlledFreshCandidateReceipt,
  sealControlledFreshCandidateReceipt,
  serializeControlledFreshCandidateReceipt,
  type ControlledFreshCandidateCleanupStatus,
  type ControlledFreshCandidateCommitCertainty,
  type ControlledFreshCandidateManifestEvidence,
  type ControlledFreshCandidateMutationBudget,
  type ControlledFreshCandidatePhase,
  type ControlledFreshCandidatePrivateReceipt,
  type ControlledFreshCandidateQuarantineCertainty,
} from './controlledFreshCandidateReceipt'

export const CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION = 'controlled-fresh-candidate-public/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS = 45_000
export const CONTROLLED_FRESH_CANDIDATE_RESERVED_PRODUCT_ID = 349

export const CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS = [
  'stockCandidates',
  'stockLookups',
  'productCreates',
  'mediaCreates',
  'productRelationshipUpdates',
  'productFinalizationUpdates',
  'explicitMediaUpdates',
  'canonicalMediaMetadataUpdates',
  'logicalStorageUploads',
] as const

export type ControlledFreshCandidatePublicCounts = Pick<
  ControlledFreshCandidateMutationBudget,
  (typeof CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS)[number]
>

export type ControlledFreshCandidateCreationVerdict =
  | 'CREATION_COMMITTED_QUARANTINED'
  | 'CREATION_BLOCKED'
  | 'CREATION_RECOVERY_REQUIRED'
  | 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED'
  | 'CREATION_TEARDOWN_FAILED_RECOVERY_REQUIRED'

export type ControlledFreshCandidateCreationReasonCode =
  | 'CREATION_COMPLETE'
  | 'EXECUTION_AUTHORIZATION_REJECTED'
  | 'PRIVATE_RECEIPT_PERSIST_FAILED'
  | 'STOCK_COLLISION'
  | 'STOCK_LOOKUP_FAILED'
  | 'TRANSACTION_UNAVAILABLE'
  | 'PRODUCT_CREATE_FAILED'
  | 'PRODUCT_IDENTITY_INVALID'
  | 'PRODUCT_IDENTITY_RESERVED'
  | 'PRODUCT_COMMIT_UNCERTAIN'
  | 'PRODUCT_STATE_MISMATCH'
  | 'MEDIA_CREATE_FAILED'
  | 'STORAGE_OUTCOME_UNCERTAIN'
  | 'MEDIA_STATE_MISMATCH'
  | 'RELATIONSHIP_UPDATE_FAILED'
  | 'PREFINALIZATION_STATE_MISMATCH'
  | 'FINALIZATION_FAILED'
  | 'FINALIZATION_READBACK_UNCERTAIN'
  | 'TEARDOWN_FAILED'
  | 'DEADLINE_EXCEEDED'
  | 'MUTATION_CAPABILITY_INVALID'
  | 'CONTROLLED_INPUT_INVALID'

export type ControlledFreshCandidatePublicReport = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION
  verdict: ControlledFreshCandidateCreationVerdict
  reasonCodes: ControlledFreshCandidateCreationReasonCode[]
  counts: ControlledFreshCandidatePublicCounts
  phase: ControlledFreshCandidatePhase | 'not_started'
  quarantineCertainty: ControlledFreshCandidateQuarantineCertainty
  commitCertainty: ControlledFreshCandidateCommitCertainty
  cleanupStatus: ControlledFreshCandidateCleanupStatus
  ownerInputManifestMatch: boolean
  eligibleForPublishing: false
}

export type ControlledFreshCandidateManifestInput = {
  identity: string
  title: string
  positivePrice: number
  provenanceStatement: string
  stockCandidate: string
  original: {
    bytes: Uint8Array
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
    width: number
    height: number
  }
}

export type ControlledFreshCandidateCreationInput = {
  executionAuthorization: {
    identity: string
    token: Uint8Array
  }
  executionId: string
  manifest: ControlledFreshCandidateManifestInput
  receiptKey: Uint8Array
}

export type ControlledFreshCandidateUploadCallbacks = {
  beforeUpload(filename: string): Promise<void>
  afterUpload(filename: string): Promise<void>
  uploadUncertain(filename: string): Promise<void>
}

export type ControlledFreshCandidateCreationDependencies = {
  consumeExecutionAuthorization(identity: string, token: Uint8Array): Promise<boolean>
  stockExists(stockCandidate: string): Promise<boolean>
  createTransactionRequest(): Promise<unknown>
  beginProductTransaction(request: unknown): Promise<boolean>
  createProduct(request: unknown, data: Record<string, unknown>): Promise<unknown>
  commitProductTransaction(request: unknown): Promise<void>
  rollbackProductTransaction(request: unknown): Promise<void>
  readProduct(productId: number): Promise<unknown>
  createMedia(params: {
    productId: number
    data: Record<string, unknown>
    file: { name: string; data: Buffer; mimetype: string; size: number }
    overwriteExistingFiles: false
    uploads: ControlledFreshCandidateUploadCallbacks
  }): Promise<unknown>
  readMedia(mediaId: number): Promise<unknown>
  updateProductRelationship(productId: number, mediaId: number): Promise<unknown>
  finalizeProduct(productId: number): Promise<unknown>
  persistPrivateReceipt(serialized: string): Promise<void>
  revokeMutationCapability(): Promise<void>
  teardown(): Promise<{ ok: true } | { ok: false }>
  randomBytes(size: number): Uint8Array
  now(): number
}

type RecordValue = Record<string, unknown>

const DEPENDENCY_KEYS = [
  'consumeExecutionAuthorization', 'stockExists', 'createTransactionRequest',
  'beginProductTransaction', 'createProduct', 'commitProductTransaction',
  'rollbackProductTransaction', 'readProduct', 'createMedia', 'readMedia',
  'updateProductRelationship', 'finalizeProduct', 'persistPrivateReceipt',
  'revokeMutationCapability', 'teardown', 'randomBytes', 'now',
] as const

const CHANNEL_FIELDS = [
  'publishWebsite',
  'publishInstagram',
  'publishFacebook',
  'publishX',
  'publishShopier',
] as const

const CREATION_REASON_CODES = new Set<ControlledFreshCandidateCreationReasonCode>([
  'CREATION_COMPLETE', 'EXECUTION_AUTHORIZATION_REJECTED', 'PRIVATE_RECEIPT_PERSIST_FAILED', 'STOCK_COLLISION',
  'STOCK_LOOKUP_FAILED', 'TRANSACTION_UNAVAILABLE', 'PRODUCT_CREATE_FAILED',
  'PRODUCT_IDENTITY_INVALID', 'PRODUCT_IDENTITY_RESERVED', 'PRODUCT_COMMIT_UNCERTAIN',
  'PRODUCT_STATE_MISMATCH', 'MEDIA_CREATE_FAILED', 'STORAGE_OUTCOME_UNCERTAIN',
  'MEDIA_STATE_MISMATCH', 'RELATIONSHIP_UPDATE_FAILED', 'PREFINALIZATION_STATE_MISMATCH',
  'FINALIZATION_FAILED', 'FINALIZATION_READBACK_UNCERTAIN', 'TEARDOWN_FAILED',
  'DEADLINE_EXCEEDED', 'MUTATION_CAPABILITY_INVALID', 'CONTROLLED_INPUT_INVALID',
])

function isPlainRecord(value: unknown): value is RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
}

export function controlledFreshCandidateDigest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function hasExactOwnKeys(value: RecordValue, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function canonicalPositiveId(value: unknown): number | null {
  const candidate = isPlainRecord(value) ? value.id : value
  if (typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0) return candidate
  return null
}

function relationshipId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value
  if (isPlainRecord(value)) return relationshipId(value.id)
  return null
}

function exactStringArray(value: unknown): string[] | null {
  let candidate = value
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate)
    } catch {
      return null
    }
  }
  if (!Array.isArray(candidate) || candidate.some((entry) => typeof entry !== 'string')) return null
  return candidate as string[]
}

function exactRelationshipArray(value: unknown, field: string): number[] | null {
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

function emptyBudget(): ControlledFreshCandidateMutationBudget {
  return {
    stockCandidates: 0,
    stockLookups: 0,
    productCreates: 0,
    mediaCreates: 0,
    productRelationshipUpdates: 0,
    productFinalizationUpdates: 0,
    explicitMediaUpdates: 0,
    canonicalMediaMetadataUpdates: 0,
    logicalStorageUploads: 0,
    productDeletes: 0,
    mediaDeletes: 0,
    variantMutations: 0,
    storageDeletes: 0,
    automaticMediaDetachUpdates: 0,
    automaticRequarantineUpdates: 0,
    otherRecordMutations: 0,
    operatorRetries: 0,
    replacementExecutions: 0,
  }
}

function publicCounts(budgets: ControlledFreshCandidateMutationBudget): ControlledFreshCandidatePublicCounts {
  return Object.fromEntries(
    CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.map((key) => [key, budgets[key]]),
  ) as ControlledFreshCandidatePublicCounts
}

function extensionForMime(mimeType: ControlledFreshCandidateManifestInput['original']['mimeType']): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  return 'webp'
}

function sanitizedExecutionNamespace(executionId: string): string {
  return executionId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64)
}

function validateCreationInput(input: ControlledFreshCandidateCreationInput): boolean {
  if (
    !isPlainRecord(input)
    || !hasExactOwnKeys(input, ['executionAuthorization', 'executionId', 'manifest', 'receiptKey'])
    || !isPlainRecord(input.executionAuthorization)
    || !hasExactOwnKeys(input.executionAuthorization, ['identity', 'token'])
    || !isPlainRecord(input.manifest)
    || !hasExactOwnKeys(input.manifest, [
      'identity', 'title', 'positivePrice', 'provenanceStatement', 'stockCandidate', 'original',
    ])
    || !isPlainRecord(input.manifest.original)
    || !hasExactOwnKeys(input.manifest.original, ['bytes', 'mimeType', 'width', 'height'])
    || typeof input.executionAuthorization.identity !== 'string'
    || !(input.executionAuthorization.token instanceof Uint8Array)
    || typeof input.executionId !== 'string'
    || typeof input.manifest.identity !== 'string'
    || typeof input.manifest.title !== 'string'
    || typeof input.manifest.positivePrice !== 'number'
    || typeof input.manifest.provenanceStatement !== 'string'
    || typeof input.manifest.stockCandidate !== 'string'
    || !(input.manifest.original.bytes instanceof Uint8Array)
    || !['image/jpeg', 'image/png', 'image/webp'].includes(input.manifest.original.mimeType)
    || !(input.receiptKey instanceof Uint8Array)
  ) return false
  const original = input.manifest.original
  return /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(input.executionAuthorization.identity)
    && input.executionAuthorization.token.byteLength >= 16
    && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(input.executionId)
    && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(input.manifest.identity)
    && input.manifest.title.trim() === input.manifest.title
    && input.manifest.title.length >= 1 && input.manifest.title.length <= 160
    && Number.isFinite(input.manifest.positivePrice) && input.manifest.positivePrice > 0
    && input.manifest.provenanceStatement.trim() === input.manifest.provenanceStatement
    && input.manifest.provenanceStatement.length >= 1 && input.manifest.provenanceStatement.length <= 1_000
    && /^SN\d{4}$/.test(input.manifest.stockCandidate)
    && original.bytes.byteLength >= 1 && original.bytes.byteLength <= 10_000_000
    && Number.isSafeInteger(original.width) && original.width > 0 && original.width <= 20_000
    && Number.isSafeInteger(original.height) && original.height > 0 && original.height <= 20_000
    && original.width * original.height <= 40_000_000
    && input.receiptKey.byteLength >= 32 && input.receiptKey.byteLength <= 128
}

export function createControlledFreshCandidateManifestEvidence(params: {
  input: ControlledFreshCandidateManifestInput
  expectedFilename: string
}): ControlledFreshCandidateManifestEvidence {
  const evidenceWithoutDigest = {
    version: CONTROLLED_FRESH_CANDIDATE_MANIFEST_VERSION,
    identity: params.input.identity,
    title: params.input.title,
    positivePrice: params.input.positivePrice,
    provenanceStatement: params.input.provenanceStatement,
    stockCandidate: params.input.stockCandidate,
    visualFamily: 'generic' as const,
    productFamily: 'shoes' as const,
    productType: 'shoe' as const,
    original: {
      filename: params.expectedFilename,
      contentDigest: createHash('sha256').update(params.input.original.bytes).digest('hex'),
      mimeType: params.input.original.mimeType,
      byteSize: params.input.original.bytes.byteLength,
      width: params.input.original.width,
      height: params.input.original.height,
    },
  }
  return {
    ...evidenceWithoutDigest,
    digest: controlledFreshCandidateDigest(evidenceWithoutDigest),
  }
}

export function fixedControlledFreshCandidateProduct(
  manifest: ControlledFreshCandidateManifestEvidence,
  confirmationStatus: 'blocked' | 'pending',
  mediaId?: number,
): Record<string, unknown> {
  return {
    title: manifest.title,
    description: manifest.provenanceStatement,
    price: manifest.positivePrice,
    brand: 'Generic',
    brandSensitive: false,
    productFamily: 'shoes',
    productType: 'shoe',
    stockNumber: manifest.stockCandidate,
    status: 'draft',
    featured: false,
    images: mediaId ? [{ image: mediaId }] : [],
    generativeGallery: [],
    variants: [],
    channels: Object.fromEntries(CHANNEL_FIELDS.map((field) => [field, false])),
    channelTargets: [],
    automationFlags: {
      autoActivate: false,
      generateBlog: false,
      generateExtraViews: false,
      enableTryOn: false,
    },
    source: 'api',
    sourceMeta: {
      dispatchedChannels: '[]',
      shopierSyncStatus: 'not_synced',
      storyStatus: 'none',
      forceRedispatch: false,
      previewDispatch: false,
      externalSyncId: null,
      lastDispatchedAt: null,
      shopierProductId: null,
      shopierProductUrl: null,
      shopierLastSyncAt: null,
      storyQueuedAt: null,
      storyPublishedAt: null,
    },
    workflow: {
      workflowStatus: 'draft',
      visualStatus: 'pending',
      confirmationStatus,
      contentStatus: 'pending',
      auditStatus: 'not_required',
      publishStatus: 'not_requested',
      stockState: 'in_stock',
      sellable: false,
    },
    merchandising: {
      publishedAt: null,
      manualPopular: false,
      manualDeal: false,
      bestSellerPinned: false,
      bestSellerExcluded: false,
      homepageHidden: false,
      totalUnitsSold: 0,
      recentUnitsSold7d: 0,
      recentUnitsSold30d: 0,
      bestSellerScore: 0,
    },
    postToInstagram: false,
    createdByAutomation: false,
  }
}

export function fixedControlledFreshCandidateMedia(
  manifest: ControlledFreshCandidateManifestEvidence,
  productId: number,
): Record<string, unknown> {
  return {
    product: productId,
    type: 'original',
    generationLineage: null,
    altText: manifest.title,
  }
}

function projectionForControlledProduct(product: RecordValue): RecordValue | null {
  const workflow = isPlainRecord(product.workflow) ? product.workflow : null
  const channels = isPlainRecord(product.channels) ? product.channels : null
  const sourceMeta = isPlainRecord(product.sourceMeta) ? product.sourceMeta : null
  const automationFlags = isPlainRecord(product.automationFlags) ? product.automationFlags : null
  const merchandising = isPlainRecord(product.merchandising) ? product.merchandising : null
  const images = exactRelationshipArray(product.images, 'image')
  const gallery = exactRelationshipArray(product.generativeGallery, 'image')
  const targets = exactStringArray(product.channelTargets)
  const dispatched = sourceMeta ? exactStringArray(sourceMeta.dispatchedChannels) : null
  if (!workflow || !channels || !sourceMeta || !automationFlags || !merchandising || !images || !gallery || !targets || !dispatched) return null
  return {
    title: product.title,
    description: product.description,
    price: product.price,
    brand: product.brand,
    brandSensitive: product.brandSensitive,
    productFamily: product.productFamily,
    productType: product.productType,
    stockNumber: product.stockNumber,
    status: product.status,
    featured: product.featured,
    images,
    generativeGallery: gallery,
    variants: Array.isArray(product.variants) ? product.variants : null,
    channels: Object.fromEntries(CHANNEL_FIELDS.map((field) => [field, channels[field]])),
    channelTargets: targets,
    automationFlags: {
      autoActivate: automationFlags.autoActivate,
      generateBlog: automationFlags.generateBlog,
      generateExtraViews: automationFlags.generateExtraViews,
      enableTryOn: automationFlags.enableTryOn,
    },
    source: product.source,
    sourceMeta: {
      dispatchedChannels: dispatched,
      shopierSyncStatus: sourceMeta.shopierSyncStatus,
      storyStatus: sourceMeta.storyStatus,
      forceRedispatch: sourceMeta.forceRedispatch,
      previewDispatch: sourceMeta.previewDispatch,
      externalSyncId: sourceMeta.externalSyncId ?? null,
      lastDispatchedAt: sourceMeta.lastDispatchedAt ?? null,
      shopierProductId: sourceMeta.shopierProductId ?? null,
      shopierProductUrl: sourceMeta.shopierProductUrl ?? null,
      shopierLastSyncAt: sourceMeta.shopierLastSyncAt ?? null,
      storyQueuedAt: sourceMeta.storyQueuedAt ?? null,
      storyPublishedAt: sourceMeta.storyPublishedAt ?? null,
    },
    workflow: {
      workflowStatus: workflow.workflowStatus,
      visualStatus: workflow.visualStatus,
      confirmationStatus: workflow.confirmationStatus,
      contentStatus: workflow.contentStatus,
      auditStatus: workflow.auditStatus,
      publishStatus: workflow.publishStatus,
      stockState: workflow.stockState,
      sellable: workflow.sellable,
    },
    merchandising: {
      publishedAt: merchandising.publishedAt ?? null,
      manualPopular: merchandising.manualPopular,
      manualDeal: merchandising.manualDeal,
      bestSellerPinned: merchandising.bestSellerPinned,
      bestSellerExcluded: merchandising.bestSellerExcluded,
      homepageHidden: merchandising.homepageHidden,
      totalUnitsSold: merchandising.totalUnitsSold,
      recentUnitsSold7d: merchandising.recentUnitsSold7d,
      recentUnitsSold30d: merchandising.recentUnitsSold30d,
      bestSellerScore: merchandising.bestSellerScore,
    },
    postToInstagram: product.postToInstagram,
    createdByAutomation: product.createdByAutomation,
  }
}

export function controlledFreshCandidateProductMatches(params: {
  product: unknown
  manifest: ControlledFreshCandidateManifestEvidence
  confirmationStatus: 'blocked' | 'pending'
  mediaId?: number
}): boolean {
  if (!isPlainRecord(params.product)) return false
  const projection = projectionForControlledProduct(params.product)
  const expected = projectionForControlledProduct(
    fixedControlledFreshCandidateProduct(params.manifest, params.confirmationStatus, params.mediaId),
  )
  return projection !== null
    && expected !== null
    && controlledFreshCandidateDigest(projection) === controlledFreshCandidateDigest(expected)
}

export function controlledFreshCandidateMediaMatches(params: {
  media: unknown
  manifest: ControlledFreshCandidateManifestEvidence
  productId: number
  mediaId?: number
}): boolean {
  if (!isPlainRecord(params.media)) return false
  const id = canonicalPositiveId(params.media)
  const lineage = params.media.generationLineage
  return (!params.mediaId || id === params.mediaId)
    && relationshipId(params.media.product) === params.productId
    && params.media.type === 'original'
    && (lineage === null || lineage === undefined || (isPlainRecord(lineage) && Object.values(lineage).every((value) => value == null || value === '')))
    && params.media.altText === params.manifest.title
    && params.media.filename === params.manifest.original.filename
    && params.media.mimeType === params.manifest.original.mimeType
}

function assertDependencies(dependencies: ControlledFreshCandidateCreationDependencies): void {
  if (!isPlainRecord(dependencies) || !hasExactOwnKeys(dependencies, DEPENDENCY_KEYS)) {
    throw new Error('MUTATION_CAPABILITY_INVALID')
  }
  for (const key of DEPENDENCY_KEYS) {
    if (typeof dependencies[key] !== 'function') throw new Error('MUTATION_CAPABILITY_INVALID')
  }
}

function basePublicReport(
  budgets: ControlledFreshCandidateMutationBudget,
  overrides: Partial<ControlledFreshCandidatePublicReport> = {},
): ControlledFreshCandidatePublicReport {
  return {
    version: CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION,
    verdict: 'CREATION_BLOCKED',
    reasonCodes: ['CONTROLLED_INPUT_INVALID'],
    counts: publicCounts(budgets),
    phase: 'not_started',
    quarantineCertainty: 'unknown',
    commitCertainty: 'unknown',
    cleanupStatus: 'not_started',
    ownerInputManifestMatch: false,
    eligibleForPublishing: false,
    ...overrides,
  }
}

export function validateControlledFreshCandidatePublicReport(value: unknown): value is ControlledFreshCandidatePublicReport {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'verdict', 'reasonCodes', 'counts', 'phase', 'quarantineCertainty',
    'commitCertainty', 'cleanupStatus', 'ownerInputManifestMatch', 'eligibleForPublishing',
  ])) return false
  if (!isPlainRecord(value.counts) || !hasExactOwnKeys(value.counts, CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS)) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION
    && ['CREATION_COMMITTED_QUARANTINED', 'CREATION_BLOCKED', 'CREATION_RECOVERY_REQUIRED', 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED', 'CREATION_TEARDOWN_FAILED_RECOVERY_REQUIRED'].includes(String(value.verdict))
    && Array.isArray(value.reasonCodes)
    && value.reasonCodes.length >= 1
    && value.reasonCodes.every((code) => typeof code === 'string' && CREATION_REASON_CODES.has(code as ControlledFreshCandidateCreationReasonCode))
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
}

class ControlledCreationFailure extends Error {
  readonly code: ControlledFreshCandidateCreationReasonCode
  readonly verdict: ControlledFreshCandidateCreationVerdict

  constructor(code: ControlledFreshCandidateCreationReasonCode, verdict: ControlledFreshCandidateCreationVerdict = 'CREATION_BLOCKED') {
    super(code)
    this.code = code
    this.verdict = verdict
  }
}

function initialReceipt(params: {
  input: ControlledFreshCandidateCreationInput
  manifest: ControlledFreshCandidateManifestEvidence
  expectedStateFingerprint: string
}): Omit<ControlledFreshCandidatePrivateReceipt, 'seal'> {
  return {
    version: CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
    executionAuthorization: {
      identity: params.input.executionAuthorization.identity,
      digest: controlledFreshCandidateDigest(Buffer.from(params.input.executionAuthorization.token).toString('base64')),
      consumed: true,
    },
    executionId: params.input.executionId,
    manifest: params.manifest,
    runtime: {
      identity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      contract: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
    },
    stockCandidate: params.manifest.stockCandidate,
    expectedStateFingerprint: params.expectedStateFingerprint,
    product: { state: 'not_created', id: null, fingerprint: null },
    media: {
      state: 'not_created',
      id: null,
      productId: null,
      expectedFilename: params.manifest.original.filename,
      actualFilename: null,
    },
    storageLedger: [],
    transactions: {
      productCreate: { intent: 'not_started', certainty: 'unknown' },
      mediaCreate: { intent: 'not_started', certainty: 'unknown' },
      relationshipUpdate: { intent: 'not_started', certainty: 'unknown' },
      finalization: { intent: 'not_started', certainty: 'unknown' },
    },
    phase: 'authorization_consumed',
    budgets: emptyBudget(),
    quarantineCertainty: 'unknown',
    commitCertainty: 'unknown',
    cleanupStatus: 'not_started',
    finalization: { requested: false, observed: false },
    teardown: { attempted: false, completed: false },
  }
}

export async function createControlledFreshCandidate(
  input: ControlledFreshCandidateCreationInput,
  dependencies: ControlledFreshCandidateCreationDependencies,
): Promise<ControlledFreshCandidatePublicReport> {
  const initialBudgets = emptyBudget()
  if (!validateCreationInput(input)) return basePublicReport(initialBudgets)
  try {
    assertDependencies(dependencies)
  } catch {
    return basePublicReport(initialBudgets, { reasonCodes: ['MUTATION_CAPABILITY_INVALID'] })
  }

  const namespace = sanitizedExecutionNamespace(input.executionId)
  if (!namespace) return basePublicReport(initialBudgets)
  const random = Buffer.from(dependencies.randomBytes(16))
  if (random.byteLength !== 16) return basePublicReport(initialBudgets)
  const expectedFilename = `cfc-${namespace}-${random.toString('hex')}.${extensionForMime(input.manifest.original.mimeType)}`
  const manifest = createControlledFreshCandidateManifestEvidence({ input: input.manifest, expectedFilename })
  const expectedStateFingerprint = controlledFreshCandidateDigest(
    fixedControlledFreshCandidateProduct(manifest, 'pending'),
  )
  let receipt: ControlledFreshCandidatePrivateReceipt | null = null
  let persistChain: Promise<void> = Promise.resolve()
  let deadlineRevoked = false
  let failure: ControlledCreationFailure | null = null
  const deadline = dependencies.now() + CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS

  const bounded = async <T>(operation: Promise<T>): Promise<T> => {
    const remaining = Math.max(1, deadline - dependencies.now())
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(() => {
            deadlineRevoked = true
            void Promise.resolve(dependencies.revokeMutationCapability()).catch(() => undefined)
            reject(new ControlledCreationFailure('DEADLINE_EXCEEDED', 'CREATION_RECOVERY_REQUIRED'))
          }, remaining)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  const assertDeadline = async (): Promise<void> => {
    if (deadlineRevoked || dependencies.now() >= deadline) {
      if (!deadlineRevoked) {
        deadlineRevoked = true
        try { await dependencies.revokeMutationCapability() } catch { /* fixed public failure only */ }
      }
      throw new ControlledCreationFailure('DEADLINE_EXCEEDED', 'CREATION_RECOVERY_REQUIRED')
    }
  }

  const persistCurrent = async (): Promise<void> => {
    if (!receipt) throw new ControlledCreationFailure('PRIVATE_RECEIPT_PERSIST_FAILED')
    const serialized = serializeControlledFreshCandidateReceipt(receipt)
    persistChain = persistChain.then(() => bounded(dependencies.persistPrivateReceipt(serialized)))
    try {
      await persistChain
    } catch {
      throw new ControlledCreationFailure('PRIVATE_RECEIPT_PERSIST_FAILED', 'CREATION_RECOVERY_REQUIRED')
    }
  }

  const mutateReceipt = async (
    transform: (draft: ControlledFreshCandidatePrivateReceipt) => void,
  ): Promise<void> => {
    if (!receipt) throw new ControlledCreationFailure('PRIVATE_RECEIPT_PERSIST_FAILED')
    receipt = resealControlledFreshCandidateReceipt(receipt, input.receiptKey, transform)
    await persistCurrent()
  }

  const rollback = async (request: unknown): Promise<void> => {
    try { await dependencies.rollbackProductTransaction(request) } catch { /* rollback acknowledgement is not inferred */ }
    if (receipt) {
      await mutateReceipt((draft) => { draft.commitCertainty = 'rollback_requested' })
    }
  }

  try {
    await assertDeadline()
    const consumed = await bounded(dependencies.consumeExecutionAuthorization(
      input.executionAuthorization.identity,
      Buffer.from(input.executionAuthorization.token),
    ))
    if (!consumed) throw new ControlledCreationFailure('EXECUTION_AUTHORIZATION_REJECTED')
    receipt = sealControlledFreshCandidateReceipt(
      initialReceipt({ input, manifest, expectedStateFingerprint }),
      input.receiptKey,
    )
    receipt.budgets.stockCandidates = 1
    receipt = resealControlledFreshCandidateReceipt(receipt, input.receiptKey, () => undefined)
    await persistCurrent()

    await assertDeadline()
    receipt.budgets.stockLookups = 1
    receipt = resealControlledFreshCandidateReceipt(receipt, input.receiptKey, () => undefined)
    let stockCollision: boolean
    try {
      stockCollision = await bounded(dependencies.stockExists(manifest.stockCandidate))
    } catch {
      throw new ControlledCreationFailure('STOCK_LOOKUP_FAILED')
    }
    if (stockCollision) throw new ControlledCreationFailure('STOCK_COLLISION')
    await mutateReceipt((draft) => { draft.phase = 'stock_qualified' })

    const request = await bounded(dependencies.createTransactionRequest())
    await mutateReceipt((draft) => {
      draft.phase = 'product_create_intended'
      draft.transactions.productCreate.intent = 'persisted'
      draft.budgets.productCreates = 1
    })
    await assertDeadline()
    let began = false
    try { began = await bounded(dependencies.beginProductTransaction(request)) } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      began = false
    }
    if (!began) throw new ControlledCreationFailure('TRANSACTION_UNAVAILABLE')

    let createdProduct: unknown
    try {
      if (receipt) receipt.transactions.productCreate.intent = 'dispatched'
      createdProduct = await bounded(dependencies.createProduct(
        request,
        fixedControlledFreshCandidateProduct(manifest, 'blocked'),
      ))
    } catch (error) {
      await rollback(request)
      if (error instanceof ControlledCreationFailure) throw error
      throw new ControlledCreationFailure('PRODUCT_CREATE_FAILED')
    }
    const productId = canonicalPositiveId(createdProduct)
    if (!productId) {
      if (receipt) await mutateReceipt((draft) => { draft.product.state = 'identity_rejected' })
      await rollback(request)
      throw new ControlledCreationFailure('PRODUCT_IDENTITY_INVALID')
    }
    if (productId === CONTROLLED_FRESH_CANDIDATE_RESERVED_PRODUCT_ID) {
      if (receipt) await mutateReceipt((draft) => { draft.product.state = 'identity_rejected' })
      await rollback(request)
      throw new ControlledCreationFailure('PRODUCT_IDENTITY_RESERVED')
    }
    if (receipt) {
      await mutateReceipt((draft) => {
        draft.product = {
          state: 'create_dispatched',
          id: productId,
          fingerprint: controlledFreshCandidateDigest(createdProduct),
        }
      })
    }
    try {
      await bounded(dependencies.commitProductTransaction(request))
    } catch (error) {
      try { await rollback(request) } catch { /* certainty remains unknown */ }
      if (error instanceof ControlledCreationFailure) throw error
      throw new ControlledCreationFailure('PRODUCT_COMMIT_UNCERTAIN', 'CREATION_RECOVERY_REQUIRED')
    }

    let committedProduct: unknown
    try { committedProduct = await bounded(dependencies.readProduct(productId)) } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      committedProduct = null
    }
    if (!controlledFreshCandidateProductMatches({ product: committedProduct, manifest, confirmationStatus: 'blocked' })) {
      throw new ControlledCreationFailure('PRODUCT_COMMIT_UNCERTAIN', 'CREATION_RECOVERY_REQUIRED')
    }
    await mutateReceipt((draft) => {
      draft.phase = 'product_committed'
      draft.product.state = 'retained'
      draft.product.fingerprint = controlledFreshCandidateDigest(committedProduct)
      draft.transactions.productCreate.certainty = 'observed'
      draft.commitCertainty = 'committed_observed'
      draft.quarantineCertainty = 'blocked_observed'
    })

    await mutateReceipt((draft) => {
      draft.phase = 'media_create_intended'
      draft.transactions.mediaCreate.intent = 'persisted'
      draft.budgets.mediaCreates = 1
      draft.budgets.canonicalMediaMetadataUpdates = 1
      draft.media.state = 'create_dispatched'
      draft.media.productId = productId
    })
    const uploads: ControlledFreshCandidateUploadCallbacks = {
      beforeUpload: async (filename) => {
        await assertDeadline()
        if (!receipt) throw new ControlledCreationFailure('PRIVATE_RECEIPT_PERSIST_FAILED')
        const ordinal = receipt.storageLedger.length + 1
        if (
          ordinal > 4
          || !/^[a-z0-9][a-z0-9._-]+$/i.test(filename)
          || filename.includes('..')
        ) {
          throw new ControlledCreationFailure('STORAGE_OUTCOME_UNCERTAIN', 'CREATION_RECOVERY_REQUIRED')
        }
        await mutateReceipt((draft) => {
          draft.budgets.logicalStorageUploads = ordinal
          draft.storageLedger.push({ ordinal, filename, state: 'intended' })
        })
      },
      afterUpload: async (filename) => {
        await mutateReceipt((draft) => {
          const entry = draft.storageLedger.find((item) => item.filename === filename && item.state === 'intended')
          if (!entry) throw new ControlledCreationFailure('STORAGE_OUTCOME_UNCERTAIN', 'CREATION_RECOVERY_REQUIRED')
          entry.state = 'known_present'
        })
      },
      uploadUncertain: async (filename) => {
        await mutateReceipt((draft) => {
          const entry = draft.storageLedger.find((item) => item.filename === filename && item.state === 'intended')
          if (entry) entry.state = 'uncertain'
        })
      },
    }

    await assertDeadline()
    let createdMedia: unknown
    try {
      if (receipt) receipt.transactions.mediaCreate.intent = 'dispatched'
      createdMedia = await bounded(dependencies.createMedia({
        productId,
        data: fixedControlledFreshCandidateMedia(manifest, productId),
        file: {
          name: manifest.original.filename,
          data: Buffer.from(input.manifest.original.bytes),
          mimetype: manifest.original.mimeType,
          size: manifest.original.byteSize,
        },
        overwriteExistingFiles: false,
        uploads,
      }))
    } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      const hasStorageIntent = Boolean(receipt?.storageLedger.length)
      throw new ControlledCreationFailure(
        hasStorageIntent ? 'STORAGE_OUTCOME_UNCERTAIN' : 'MEDIA_CREATE_FAILED',
        hasStorageIntent ? 'CREATION_RECOVERY_REQUIRED' : 'CREATION_BLOCKED',
      )
    }
    const mediaId = canonicalPositiveId(createdMedia)
    if (!mediaId) throw new ControlledCreationFailure('MEDIA_STATE_MISMATCH', 'CREATION_RECOVERY_REQUIRED')
    const actualFilename = isPlainRecord(createdMedia) && typeof createdMedia.filename === 'string'
      ? createdMedia.filename
      : null
    if (actualFilename !== manifest.original.filename) {
      throw new ControlledCreationFailure('MEDIA_STATE_MISMATCH', 'CREATION_RECOVERY_REQUIRED')
    }
    let retainedMedia: unknown
    try { retainedMedia = await bounded(dependencies.readMedia(mediaId)) } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      retainedMedia = null
    }
    if (!controlledFreshCandidateMediaMatches({ media: retainedMedia, manifest, productId, mediaId })) {
      throw new ControlledCreationFailure('MEDIA_STATE_MISMATCH', 'CREATION_RECOVERY_REQUIRED')
    }
    await mutateReceipt((draft) => {
      draft.phase = 'media_retained'
      draft.media = {
        state: 'retained',
        id: mediaId,
        productId,
        expectedFilename: manifest.original.filename,
        actualFilename,
      }
      draft.transactions.mediaCreate.certainty = 'observed'
    })

    await mutateReceipt((draft) => {
      draft.transactions.relationshipUpdate.intent = 'persisted'
      draft.budgets.productRelationshipUpdates = 1
    })
    await assertDeadline()
    try {
      if (receipt) receipt.transactions.relationshipUpdate.intent = 'dispatched'
      await bounded(dependencies.updateProductRelationship(productId, mediaId))
    } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      throw new ControlledCreationFailure('RELATIONSHIP_UPDATE_FAILED', 'CREATION_RECOVERY_REQUIRED')
    }
    let relatedProduct: unknown
    try { relatedProduct = await bounded(dependencies.readProduct(productId)) } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      relatedProduct = null
    }
    if (!controlledFreshCandidateProductMatches({ product: relatedProduct, manifest, confirmationStatus: 'blocked', mediaId })) {
      throw new ControlledCreationFailure('PREFINALIZATION_STATE_MISMATCH', 'CREATION_RECOVERY_REQUIRED')
    }
    await mutateReceipt((draft) => {
      draft.phase = 'quarantine_observed'
      draft.transactions.relationshipUpdate.certainty = 'observed'
      draft.quarantineCertainty = 'blocked_observed'
    })

    await mutateReceipt((draft) => {
      draft.phase = 'finalization_intended'
      draft.transactions.finalization.intent = 'persisted'
      draft.budgets.productFinalizationUpdates = 1
      draft.finalization.requested = true
    })
    await assertDeadline()
    try {
      if (receipt) receipt.transactions.finalization.intent = 'dispatched'
      await bounded(dependencies.finalizeProduct(productId))
    } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      throw new ControlledCreationFailure('FINALIZATION_FAILED', 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED')
    }
    let finalProduct: unknown
    try { finalProduct = await bounded(dependencies.readProduct(productId)) } catch (error) {
      if (error instanceof ControlledCreationFailure) throw error
      finalProduct = null
    }
    if (!controlledFreshCandidateProductMatches({ product: finalProduct, manifest, confirmationStatus: 'pending', mediaId })) {
      if (receipt) {
        await mutateReceipt((draft) => {
          draft.quarantineCertainty = 'unknown'
          draft.transactions.finalization.certainty = 'unknown'
        })
      }
      throw new ControlledCreationFailure('FINALIZATION_READBACK_UNCERTAIN', 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED')
    }
    await mutateReceipt((draft) => {
      draft.phase = 'finalization_observed'
      draft.finalization.observed = true
      draft.transactions.finalization.certainty = 'observed'
      draft.quarantineCertainty = 'pending_observed'
      draft.commitCertainty = 'committed_observed'
    })
  } catch (error) {
    failure = error instanceof ControlledCreationFailure
      ? error
      : new ControlledCreationFailure('PRODUCT_STATE_MISMATCH', 'CREATION_RECOVERY_REQUIRED')
  }

  let teardownOk = false
  try {
    if (receipt) {
      await mutateReceipt((draft) => { draft.teardown.attempted = true })
    }
    const teardown = await dependencies.teardown()
    teardownOk = teardown.ok
  } catch {
    teardownOk = false
  }
  if (receipt) {
    try {
      await mutateReceipt((draft) => {
        draft.phase = 'teardown_observed'
        draft.teardown.completed = teardownOk
        draft.cleanupStatus = teardownOk ? 'complete' : 'failed'
      })
    } catch {
      teardownOk = false
      failure = failure ?? new ControlledCreationFailure('PRIVATE_RECEIPT_PERSIST_FAILED', 'CREATION_RECOVERY_REQUIRED')
    }
  }

  const finalBudgets = receipt?.budgets ?? initialBudgets
  const finalPhase = receipt?.phase ?? 'not_started'
  const quarantineCertainty = receipt?.quarantineCertainty ?? 'unknown'
  const commitCertainty = receipt?.commitCertainty ?? 'unknown'
  const cleanupStatus = receipt?.cleanupStatus ?? (teardownOk ? 'complete' : 'failed')
  if (!teardownOk) {
    const knownFinal = receipt?.finalization.observed === true && commitCertainty === 'committed_observed'
    return basePublicReport(finalBudgets, {
      verdict: knownFinal
        ? 'CREATION_TEARDOWN_FAILED_RECOVERY_REQUIRED'
        : failure?.verdict ?? 'CREATION_RECOVERY_REQUIRED',
      reasonCodes: [knownFinal ? 'TEARDOWN_FAILED' : failure?.code ?? 'TEARDOWN_FAILED'],
      phase: finalPhase,
      quarantineCertainty,
      commitCertainty,
      cleanupStatus,
      ownerInputManifestMatch: true,
    })
  }
  if (failure) {
    return basePublicReport(finalBudgets, {
      verdict: failure.verdict,
      reasonCodes: [failure.code],
      phase: finalPhase,
      quarantineCertainty,
      commitCertainty,
      cleanupStatus,
      ownerInputManifestMatch: true,
    })
  }
  return basePublicReport(finalBudgets, {
    verdict: 'CREATION_COMMITTED_QUARANTINED',
    reasonCodes: ['CREATION_COMPLETE'],
    phase: finalPhase,
    quarantineCertainty,
    commitCertainty,
    cleanupStatus,
    ownerInputManifestMatch: true,
  })
}

export function defaultControlledFreshCandidateCreationDependenciesRandomBytes(size: number): Uint8Array {
  return nodeRandomBytes(size)
}
