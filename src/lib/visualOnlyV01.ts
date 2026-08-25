import { createHash } from 'node:crypto'

import { GENERATED_SLOT_KEYS } from './imageSlotContract'
import {
  VISUAL_LOCK_V01_PROFILE_VERSION,
  type VisualLockContext,
} from './imageVisualLockV01'

export const VISUAL_ONLY_V01_MODE = 'visual-only-v0.1' as const
export const VISUAL_ONLY_V01_BOUNDARY_VERSION = 'visual-only-boundary/v1' as const
export const VISUAL_ONLY_V01_PREVIEW_VERSION = 'visual-only-preview/v1' as const
export const VISUAL_ONLY_V01_OWNER_CONFIRMATION = 'OWNER_CONFIRMED_VISUAL_ONLY_V0_1' as const

export type VisualOnlyV01Family = 'loafer' | 'generic'

export type VisualOnlyV01BoundaryManifest = {
  version: typeof VISUAL_ONLY_V01_BOUNDARY_VERSION
  mode: typeof VISUAL_ONLY_V01_MODE
  profileVersion: typeof VISUAL_LOCK_V01_PROFILE_VERSION
  productId: number
  stockNumber: string
  productFamily: VisualOnlyV01Family
  jobId: string
  reviewChatId: string
  reviewerUserId: string
  ownerConfirmation: typeof VISUAL_ONLY_V01_OWNER_CONFIRMATION
  canonicalSlotOrder: readonly string[]
  initialVisualStatus: 'pending'
  productIsolationFingerprint: string
  nonce: string
  digest: string
}

export type VisualOnlyV01PreviewBinding = {
  version: typeof VISUAL_ONLY_V01_PREVIEW_VERSION
  mode: typeof VISUAL_ONLY_V01_MODE
  boundaryDigest: string
  productId: number
  jobId: string
  rootAttemptId: string
  packDigest: string
  callbackToken: string
}

export type VisualOnlyProductAssessment = {
  eligible: boolean
  productId: number | null
  stockNumber: string | null
  imageRelationshipIds: Array<string | number>
  codes: string[]
  isolationFingerprint: string | null
}

type RecordValue = Record<string, unknown>

const SHA256_PATTERN = /^[0-9a-f]{64}$/
const NONCE_PATTERN = /^[0-9a-f]{32}$/
const CALLBACK_TOKEN_PATTERN = /^[0-9a-f]{20}$/
const ATTEMPT_ID_PATTERN = /^iga_[0-9a-f-]{36}$/i
const STOCK_NUMBER_PATTERN = /^SN\d{4}$/
const CHANNEL_FIELDS = [
  'publishWebsite',
  'publishInstagram',
  'publishFacebook',
  'publishX',
  'publishShopier',
] as const

function positiveIntegerText(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return false
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0
}

function isPlainRecord(value: unknown): value is RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  )
}

function digestValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function relationshipId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (isPlainRecord(value)) return relationshipId(value.id)
  return null
}

function relationshipArray(value: unknown, childKey?: string): Array<string | number> | null {
  if (!Array.isArray(value)) return null
  const result: Array<string | number> = []
  for (const entry of value) {
    const candidate = childKey && isPlainRecord(entry) ? entry[childKey] : entry
    const id = relationshipId(candidate)
    if (id === null) return null
    result.push(id)
  }
  return result
}

function parsedStringArray(value: unknown): string[] | null {
  let candidate = value
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!Array.isArray(candidate) || candidate.some((entry) => typeof entry !== 'string')) return null
  return candidate.map((entry) => entry.trim())
}

function optionalEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function isolationProjection(product: RecordValue): { projection: RecordValue | null; codes: string[] } {
  const codes: string[] = []
  const productId = relationshipId(product.id)
  const numericProductId = typeof productId === 'number'
    ? productId
    : typeof productId === 'string' && /^\d+$/.test(productId) ? Number(productId) : null
  const stockNumber = typeof product.stockNumber === 'string' ? product.stockNumber.trim().toUpperCase() : ''
  const workflow = isPlainRecord(product.workflow) ? product.workflow : null
  const channels = isPlainRecord(product.channels) ? product.channels : null
  const sourceMeta = isPlainRecord(product.sourceMeta) ? product.sourceMeta : null
  const merchandising = product.merchandising == null
    ? {}
    : isPlainRecord(product.merchandising) ? product.merchandising : null
  const imageIds = relationshipArray(product.images, 'image')
  const galleryIds = relationshipArray(product.generativeGallery, 'image')
  const channelTargets = parsedStringArray(product.channelTargets)
  const dispatchedChannels = sourceMeta ? parsedStringArray(sourceMeta.dispatchedChannels) : null

  if (!Number.isSafeInteger(numericProductId) || Number(numericProductId) <= 0) codes.push('PRODUCT_IDENTITY_INVALID')
  if (!STOCK_NUMBER_PATTERN.test(stockNumber)) codes.push('PRODUCT_STOCK_NUMBER_INVALID')
  if (product.status !== 'draft') codes.push('PRODUCT_NOT_DRAFT')
  if (!workflow) codes.push('PRODUCT_WORKFLOW_MALFORMED')
  if (workflow && workflow.workflowStatus !== 'draft' && workflow.workflowStatus !== 'visual_pending') {
    codes.push('PRODUCT_WORKFLOW_NOT_ISOLATED')
  }
  if (workflow?.visualStatus !== 'pending') codes.push('PRODUCT_VISUAL_STATE_NOT_FRESH')
  if (workflow?.confirmationStatus !== 'pending') codes.push('PRODUCT_CONFIRMATION_STATE_NOT_FRESH')
  if (workflow?.sellable !== false) codes.push('PRODUCT_SELLABLE_STATE_UNSAFE')
  if (workflow?.publishStatus !== 'not_requested') codes.push('PRODUCT_PUBLISH_STATE_UNSAFE')
  if (!imageIds || imageIds.length < 1 || imageIds.length > 8) codes.push('PRODUCT_IMAGE_RELATIONSHIPS_INVALID')
  if (imageIds && new Set(imageIds.map(String)).size !== imageIds.length) codes.push('PRODUCT_IMAGE_RELATIONSHIPS_DUPLICATED')
  if (!galleryIds || galleryIds.length !== 0) codes.push('PRODUCT_GENERATED_GALLERY_NOT_EMPTY')
  if (!channels || CHANNEL_FIELDS.some((field) => channels[field] !== false)) codes.push('PRODUCT_CHANNEL_STATE_UNSAFE')
  if (!channelTargets || channelTargets.length !== 0) codes.push('PRODUCT_CHANNEL_TARGETS_NOT_EMPTY')
  if (!sourceMeta) codes.push('PRODUCT_SOURCE_META_MALFORMED')
  if (!dispatchedChannels || dispatchedChannels.length !== 0) codes.push('PRODUCT_DISPATCH_HISTORY_PRESENT')
  if (sourceMeta?.shopierSyncStatus !== 'not_synced') codes.push('PRODUCT_SHOPIER_STATE_UNSAFE')
  if (sourceMeta?.storyStatus !== 'none') codes.push('PRODUCT_STORY_STATE_UNSAFE')
  if (sourceMeta?.forceRedispatch !== false || sourceMeta?.previewDispatch !== false) {
    codes.push('PRODUCT_DISPATCH_CONTROL_UNSAFE')
  }
  if (
    sourceMeta
    && [
      sourceMeta.externalSyncId,
      sourceMeta.lastDispatchedAt,
      sourceMeta.shopierProductId,
      sourceMeta.shopierProductUrl,
      sourceMeta.shopierLastSyncAt,
      sourceMeta.storyQueuedAt,
      sourceMeta.storyPublishedAt,
    ].some((entry) => !optionalEmpty(entry))
  ) codes.push('PRODUCT_DOWNSTREAM_MARKER_PRESENT')
  if (!merchandising || !optionalEmpty(merchandising.publishedAt)) codes.push('PRODUCT_MERCHANDISING_PUBLICATION_PRESENT')
  if (product.postToInstagram !== false) codes.push('PRODUCT_LEGACY_PUBLICATION_STATE_UNSAFE')

  if (codes.length > 0 || numericProductId === null || !workflow || !channels || !sourceMeta || !merchandising || !imageIds || !galleryIds || !channelTargets || !dispatchedChannels) {
    return { projection: null, codes: [...new Set(codes)].sort() }
  }

  return {
    projection: {
      productId: numericProductId,
      stockNumber,
      status: product.status,
      imageRelationshipIds: imageIds,
      galleryRelationshipIds: galleryIds,
      workflow: {
        workflowStatus: workflow.workflowStatus,
        visualStatus: 'pending',
        confirmationStatus: workflow.confirmationStatus,
        sellable: workflow.sellable,
        publishStatus: workflow.publishStatus,
      },
      channels: Object.fromEntries(CHANNEL_FIELDS.map((field) => [field, channels[field]])),
      channelTargets,
      sourceMeta: {
        dispatchedChannels,
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
      merchandisingPublishedAt: merchandising.publishedAt ?? null,
      postToInstagram: product.postToInstagram,
    },
    codes: [],
  }
}

export function assessVisualOnlyProductState(product: unknown): VisualOnlyProductAssessment {
  if (!isPlainRecord(product)) {
    return {
      eligible: false,
      productId: null,
      stockNumber: null,
      imageRelationshipIds: [],
      codes: ['PRODUCT_RECORD_MALFORMED'],
      isolationFingerprint: null,
    }
  }
  const result = isolationProjection(product)
  const id = relationshipId(product.id)
  const numericId = typeof id === 'number' ? id : typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : null
  const stockNumber = typeof product.stockNumber === 'string' && STOCK_NUMBER_PATTERN.test(product.stockNumber.trim().toUpperCase())
    ? product.stockNumber.trim().toUpperCase()
    : null
  const imageIds = relationshipArray(product.images, 'image') ?? []
  return {
    eligible: Boolean(result.projection),
    productId: Number.isSafeInteger(numericId) ? numericId : null,
    stockNumber,
    imageRelationshipIds: imageIds,
    codes: result.codes,
    isolationFingerprint: result.projection ? digestValue(result.projection) : null,
  }
}

export function verifyVisualOnlyProductState(
  product: unknown,
  manifest: VisualOnlyV01BoundaryManifest,
  phase: 'execution' | 'approval',
): { ok: true } | { ok: false; code: string } {
  if (!isPlainRecord(product)) return { ok: false, code: 'VISUAL_ONLY_PRODUCT_RECORD_MALFORMED' }
  const currentVisualStatus = isPlainRecord(product.workflow) ? product.workflow.visualStatus : undefined
  const normalized = {
    ...product,
    workflow: isPlainRecord(product.workflow)
      ? { ...product.workflow, visualStatus: manifest.initialVisualStatus }
      : product.workflow,
  }
  const assessment = assessVisualOnlyProductState(normalized)
  if (
    !assessment.eligible
    || assessment.productId !== manifest.productId
    || assessment.stockNumber !== manifest.stockNumber
    || assessment.isolationFingerprint !== manifest.productIsolationFingerprint
  ) return { ok: false, code: 'VISUAL_ONLY_PRODUCT_STATE_DRIFT' }
  if (phase === 'execution' && currentVisualStatus !== 'pending' && currentVisualStatus !== 'generating') {
    return { ok: false, code: 'VISUAL_ONLY_EXECUTION_STATE_INVALID' }
  }
  if (phase === 'approval' && currentVisualStatus !== 'preview') {
    return { ok: false, code: 'VISUAL_ONLY_APPROVAL_STATE_INVALID' }
  }
  return { ok: true }
}

function manifestDigest(value: Omit<VisualOnlyV01BoundaryManifest, 'digest'>): string {
  return digestValue(value)
}

export function createVisualOnlyV01BoundaryManifest(params: {
  product: unknown
  productId: number
  stockNumber: string
  productFamily: VisualOnlyV01Family
  jobId: string | number
  reviewChatId: string | number
  reviewerUserId: string | number
  nonce: string
}): VisualOnlyV01BoundaryManifest {
  const assessment = assessVisualOnlyProductState(params.product)
  const stockNumber = params.stockNumber.trim().toUpperCase()
  if (
    !assessment.eligible
    || assessment.productId !== params.productId
    || assessment.stockNumber !== stockNumber
    || !assessment.isolationFingerprint
    || (params.productFamily !== 'loafer' && params.productFamily !== 'generic')
    || !positiveIntegerText(String(params.jobId))
    || !String(params.reviewChatId).trim()
    || !String(params.reviewerUserId).trim()
    || !NONCE_PATTERN.test(params.nonce)
  ) throw new Error('VISUAL_ONLY_BOUNDARY_INPUT_INVALID')

  const unsigned: Omit<VisualOnlyV01BoundaryManifest, 'digest'> = {
    version: VISUAL_ONLY_V01_BOUNDARY_VERSION,
    mode: VISUAL_ONLY_V01_MODE,
    profileVersion: VISUAL_LOCK_V01_PROFILE_VERSION,
    productId: params.productId,
    stockNumber,
    productFamily: params.productFamily,
    jobId: String(params.jobId),
    reviewChatId: String(params.reviewChatId),
    reviewerUserId: String(params.reviewerUserId),
    ownerConfirmation: VISUAL_ONLY_V01_OWNER_CONFIRMATION,
    canonicalSlotOrder: [...GENERATED_SLOT_KEYS],
    initialVisualStatus: 'pending',
    productIsolationFingerprint: assessment.isolationFingerprint,
    nonce: params.nonce,
  }
  return { ...unsigned, digest: manifestDigest(unsigned) }
}

export function sanitizeVisualOnlyV01BoundaryManifest(value: unknown): VisualOnlyV01BoundaryManifest | null {
  if (!isPlainRecord(value)) return null
  const keys = [
    'version', 'mode', 'profileVersion', 'productId', 'stockNumber', 'productFamily', 'jobId',
    'reviewChatId', 'reviewerUserId', 'ownerConfirmation', 'canonicalSlotOrder', 'initialVisualStatus',
    'productIsolationFingerprint', 'nonce', 'digest',
  ].sort()
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) return null
  if (
    value.version !== VISUAL_ONLY_V01_BOUNDARY_VERSION
    || value.mode !== VISUAL_ONLY_V01_MODE
    || value.profileVersion !== VISUAL_LOCK_V01_PROFILE_VERSION
    || typeof value.productId !== 'number' || !Number.isSafeInteger(value.productId) || value.productId <= 0
    || typeof value.stockNumber !== 'string' || !STOCK_NUMBER_PATTERN.test(value.stockNumber)
    || (value.productFamily !== 'loafer' && value.productFamily !== 'generic')
    || !positiveIntegerText(value.jobId)
    || typeof value.reviewChatId !== 'string' || !value.reviewChatId
    || typeof value.reviewerUserId !== 'string' || !value.reviewerUserId
    || value.ownerConfirmation !== VISUAL_ONLY_V01_OWNER_CONFIRMATION
    || !Array.isArray(value.canonicalSlotOrder)
    || JSON.stringify(value.canonicalSlotOrder) !== JSON.stringify(GENERATED_SLOT_KEYS)
    || value.initialVisualStatus !== 'pending'
    || typeof value.productIsolationFingerprint !== 'string' || !SHA256_PATTERN.test(value.productIsolationFingerprint)
    || typeof value.nonce !== 'string' || !NONCE_PATTERN.test(value.nonce)
    || typeof value.digest !== 'string' || !SHA256_PATTERN.test(value.digest)
  ) return null
  const { digest, ...unsigned } = value as unknown as VisualOnlyV01BoundaryManifest
  if (manifestDigest(unsigned) !== digest) return null
  return { ...unsigned, canonicalSlotOrder: [...GENERATED_SLOT_KEYS], digest }
}

export function parseVisualOnlyV01BoundaryText(value: unknown): VisualOnlyV01BoundaryManifest | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return sanitizeVisualOnlyV01BoundaryManifest(JSON.parse(value))
  } catch {
    return null
  }
}

export function manifestForVisualLockContext(
  manifest: VisualOnlyV01BoundaryManifest,
  context: VisualLockContext,
): boolean {
  return context.profileVersion === manifest.profileVersion && context.family === manifest.productFamily
}

export function visualOnlyPackDigest(packSelection: unknown): string {
  return digestValue(packSelection)
}

export function createVisualOnlyV01PreviewBinding(params: {
  manifest: VisualOnlyV01BoundaryManifest
  rootAttemptId: string
  packSelection: unknown
}): VisualOnlyV01PreviewBinding {
  if (!ATTEMPT_ID_PATTERN.test(params.rootAttemptId)) throw new Error('VISUAL_ONLY_ROOT_ATTEMPT_INVALID')
  const packDigest = visualOnlyPackDigest(params.packSelection)
  const callbackToken = digestValue({
    boundaryDigest: params.manifest.digest,
    rootAttemptId: params.rootAttemptId,
    packDigest,
    nonce: params.manifest.nonce,
  }).slice(0, 20)
  return {
    version: VISUAL_ONLY_V01_PREVIEW_VERSION,
    mode: VISUAL_ONLY_V01_MODE,
    boundaryDigest: params.manifest.digest,
    productId: params.manifest.productId,
    jobId: params.manifest.jobId,
    rootAttemptId: params.rootAttemptId,
    packDigest,
    callbackToken,
  }
}

export function sanitizeVisualOnlyV01PreviewBinding(value: unknown): VisualOnlyV01PreviewBinding | null {
  if (!isPlainRecord(value)) return null
  const keys = [
    'version', 'mode', 'boundaryDigest', 'productId', 'jobId', 'rootAttemptId', 'packDigest', 'callbackToken',
  ].sort()
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) return null
  if (
    value.version !== VISUAL_ONLY_V01_PREVIEW_VERSION
    || value.mode !== VISUAL_ONLY_V01_MODE
    || typeof value.boundaryDigest !== 'string' || !SHA256_PATTERN.test(value.boundaryDigest)
    || typeof value.productId !== 'number' || !Number.isSafeInteger(value.productId) || value.productId <= 0
    || !positiveIntegerText(value.jobId)
    || typeof value.rootAttemptId !== 'string' || !ATTEMPT_ID_PATTERN.test(value.rootAttemptId)
    || typeof value.packDigest !== 'string' || !SHA256_PATTERN.test(value.packDigest)
    || typeof value.callbackToken !== 'string' || !CALLBACK_TOKEN_PATTERN.test(value.callbackToken)
  ) return null
  return value as unknown as VisualOnlyV01PreviewBinding
}

export function parseVisualOnlyJobEvidence(job: unknown): {
  manifest: VisualOnlyV01BoundaryManifest
  preview: VisualOnlyV01PreviewBinding | null
} | null {
  if (!isPlainRecord(job) || typeof job.promptsUsed !== 'string') return null
  try {
    const prompts = JSON.parse(job.promptsUsed)
    if (!isPlainRecord(prompts)) return null
    if (prompts.executionMode !== VISUAL_ONLY_V01_MODE) return null
    const manifest = sanitizeVisualOnlyV01BoundaryManifest(prompts.visualOnlyBoundary)
    if (!manifest) return null
    const preview = prompts.visualOnlyPreview == null
      ? null
      : sanitizeVisualOnlyV01PreviewBinding(prompts.visualOnlyPreview)
    if (prompts.visualOnlyPreview != null && !preview) return null
    return { manifest, preview }
  } catch {
    return null
  }
}

export function hasVisualOnlyBoundaryMarker(job: unknown): boolean {
  if (!isPlainRecord(job)) return false
  if (
    Array.isArray(job.generationAttempts)
    && job.generationAttempts.some((attempt) => isPlainRecord(attempt)
      && (
        attempt.visualOnlyBoundary != null
        || (isPlainRecord(attempt.packSelection) && attempt.packSelection.visualOnlyMode != null)
      ))
  ) return true
  if (typeof job.promptsUsed !== 'string') return false
  try {
    const prompts = JSON.parse(job.promptsUsed)
    return isPlainRecord(prompts)
      && (prompts.executionMode === VISUAL_ONLY_V01_MODE || prompts.visualOnlyBoundary != null)
  } catch {
    return false
  }
}
