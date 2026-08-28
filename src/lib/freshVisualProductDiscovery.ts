import { createHash } from 'node:crypto'

import {
  readVisualPilotMediaEvidence,
  VISUAL_PILOT_MEDIA_MAX_BYTES,
  VISUAL_PILOT_MEDIA_MAX_INPUT_PIXELS,
  VISUAL_PILOT_MEDIA_TIMEOUT_MS,
  type VisualPilotMediaReadDependencies,
  type VisualPilotMediaReadResult,
} from './visualPilotMediaEvidence'
import { assessVisualOnlyProductState } from './visualOnlyV01'
import { classifyVisualPilotBotEvent } from './visualPilotTargetVerifier'
import { classifyProductScopedMediaGenerationState } from './mediaGenerationState'

export const FRESH_VISUAL_DISCOVERY_VERSION = 'fresh-visual-product-discovery/v1' as const
export const FRESH_VISUAL_DISCOVERY_PAGE_SIZE = 25
export const FRESH_VISUAL_DISCOVERY_MAX_PAGES = 4
export const FRESH_VISUAL_DISCOVERY_MAX_PRODUCTS = FRESH_VISUAL_DISCOVERY_PAGE_SIZE * FRESH_VISUAL_DISCOVERY_MAX_PAGES
export const FRESH_VISUAL_DISCOVERY_MAX_SURFACE_PAGES = 20
export const FRESH_VISUAL_DISCOVERY_MAX_ORIGINALS = 8
export const FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_BYTES = 24_000_000
export const FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_PIXELS = 100_000_000
export const FRESH_VISUAL_DISCOVERY_OBSERVATION_TIMEOUT_MS = 45_000
export const FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID = 349
export const FRESH_CANDIDATE_ELIMINATION_DIAGNOSTICS_VERSION = 'fresh-candidate-elimination-diagnostics/v1' as const
export const FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES = [
  'PRODUCT_RECORD_OR_IDENTITY_INVALID',
  'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE',
  'PRODUCT_SELLABILITY_OR_PUBLISH_STATE_UNSAFE',
  'ORDERED_IMAGE_RELATIONSHIP_INVALID',
  'GENERATED_GALLERY_PRESENT',
  'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE',
  'SOURCE_METADATA_UNSAFE',
  'ORDERED_MEDIA_UNCLEAN',
  'PRODUCT_SCOPED_MEDIA_LINEAGE_OR_OWNERSHIP',
  'GENERATED_GALLERY_OWNERSHIP_PRESENT',
  'GENERATION_HISTORY_PRESENT',
  'DURABLE_QUEUE_RECEIPT_PRESENT',
  'STORY_JOB_HISTORY_PRESENT',
  'BOT_EVENT_HISTORY_UNSAFE',
  'ORIGINAL_EVIDENCE_UNAVAILABLE_OR_INVALID',
  'ORIGINAL_CONTENT_DUPLICATE',
  'AGGREGATE_EVIDENCE_BUDGET_EXCEEDED',
] as const

export type FreshCandidatePrimaryEliminationCategory =
  (typeof FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES)[number]

export type FreshCandidateEliminationDiagnostics = {
  version: typeof FRESH_CANDIDATE_ELIMINATION_DIAGNOSTICS_VERSION
  /** In-scope rows after the mandatory excluded-Product filter. */
  queriedProductCount: number
  assessedProductCount: number
  eligibleCandidateCount: number
  eliminatedProductCount: number
  primaryEliminationCounts: Record<FreshCandidatePrimaryEliminationCategory, number>
}

export type FreshVisualDiscoveryReadiness =
  | 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION'
  | 'NO_ELIGIBLE_FRESH_CANDIDATE'
  | 'CANDIDATE_DISCOVERY_UNSUPPORTED'
  | 'CANDIDATE_STATE_DRIFTED'

export type FreshVisualDiscoveryPage = {
  docs: unknown[]
  totalDocs: number
  page: number
  totalPages: number
  hasNextPage: boolean
  limit: number
}

export type FreshVisualDiscoveryGateway = {
  readProductPage(page: number, limit: number): Promise<FreshVisualDiscoveryPage>
  readMediaPage(productId: number, page: number, limit: number): Promise<FreshVisualDiscoveryPage>
  readGeneratedGalleryOwnerPage(mediaIds: readonly (string | number)[], page: number, limit: number): Promise<FreshVisualDiscoveryPage>
  readImageJobPage(productId: number, page: number, limit: number): Promise<FreshVisualDiscoveryPage>
  readQueueReceiptPage(productId: number, page: number, limit: number): Promise<FreshVisualDiscoveryPage>
  readBotEventPage(productId: number, page: number, limit: number): Promise<FreshVisualDiscoveryPage>
  readStoryJobPage(productId: number, page: number, limit: number): Promise<FreshVisualDiscoveryPage>
}

export type FreshVisualDiscoveryCandidate = {
  rank: number
  productId: number
  stockNumber: string
  usableOriginalCount: number
  evidenceClassification: 'COMPLETE_VISUAL_ONLY_EVIDENCE_DOWNSTREAM_AUTHORITY_UNAVAILABLE'
  reasonCodes: string[]
  eligibleForVisualOnlyGeneration: true
  eligibleForPublishing: false
}

export type FreshVisualDiscoveryReport = {
  version: typeof FRESH_VISUAL_DISCOVERY_VERSION
  readiness: FreshVisualDiscoveryReadiness
  primaryProductId: number | null
  candidates: FreshVisualDiscoveryCandidate[]
  reasonCodes: string[]
  snapshotsCompleted: 0 | 1 | 2
  publishingAuthority: {
    telegramPreviewHistory: 'unavailable'
    advertisingHistory: 'unavailable'
    eligibleForPublishing: false
  }
  diagnostics?: FreshCandidateEliminationDiagnostics
}

export type FreshVisualDiscoveryDependencies = {
  gateway: FreshVisualDiscoveryGateway
  mediaRead?: VisualPilotMediaReadDependencies
  readMediaEvidence?: (
    media: Record<string, unknown>,
    dependencies: VisualPilotMediaReadDependencies,
  ) => Promise<VisualPilotMediaReadResult>
  now?: () => number
}

type RecordValue = Record<string, unknown>

type CandidateSnapshot = {
  productId: number
  stockNumber: string
  usableOriginalCount: number
  evidenceClassification: FreshVisualDiscoveryCandidate['evidenceClassification']
  reasonCodes: string[]
  eligibleForVisualOnlyGeneration: true
  eligibleForPublishing: false
  stateDigest: string
}

type DiscoverySnapshot = {
  candidates: CandidateSnapshot[]
  observationDigest: string
  diagnostics: FreshCandidateEliminationDiagnostics
}

type DiscoverySnapshotResult =
  | { ok: true; snapshot: DiscoverySnapshot }
  | { ok: false; error: unknown }

type CandidateAssessmentResult =
  | { outcome: 'eligible'; candidate: CandidateSnapshot }
  | { outcome: 'eliminated'; category: FreshCandidatePrimaryEliminationCategory }
  | { outcome: 'excluded' }

class DiscoveryUnsupportedError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
  }
}

function assertObservationDeadline(deadline: number, now: () => number): void {
  if (now() >= deadline) throw new DiscoveryUnsupportedError('DISCOVERY_OBSERVATION_TIMEOUT')
}

const PRODUCT_ASSESSMENT_ELIMINATION_PRIORITY: ReadonlyArray<readonly [
  string,
  FreshCandidatePrimaryEliminationCategory,
]> = [
  ['PRODUCT_RECORD_MALFORMED', 'PRODUCT_RECORD_OR_IDENTITY_INVALID'],
  ['PRODUCT_IDENTITY_INVALID', 'PRODUCT_RECORD_OR_IDENTITY_INVALID'],
  ['PRODUCT_STOCK_NUMBER_INVALID', 'PRODUCT_RECORD_OR_IDENTITY_INVALID'],
  ['PRODUCT_NOT_DRAFT', 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE'],
  ['PRODUCT_WORKFLOW_MALFORMED', 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE'],
  ['PRODUCT_WORKFLOW_NOT_ISOLATED', 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE'],
  ['PRODUCT_VISUAL_STATE_NOT_FRESH', 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE'],
  ['PRODUCT_CONFIRMATION_STATE_NOT_FRESH', 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE'],
  ['PRODUCT_SELLABLE_STATE_UNSAFE', 'PRODUCT_SELLABILITY_OR_PUBLISH_STATE_UNSAFE'],
  ['PRODUCT_PUBLISH_STATE_UNSAFE', 'PRODUCT_SELLABILITY_OR_PUBLISH_STATE_UNSAFE'],
  ['PRODUCT_IMAGE_RELATIONSHIPS_INVALID', 'ORDERED_IMAGE_RELATIONSHIP_INVALID'],
  ['PRODUCT_IMAGE_RELATIONSHIPS_DUPLICATED', 'ORDERED_IMAGE_RELATIONSHIP_INVALID'],
  ['PRODUCT_GENERATED_GALLERY_NOT_EMPTY', 'GENERATED_GALLERY_PRESENT'],
  ['PRODUCT_CHANNEL_STATE_UNSAFE', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_CHANNEL_TARGETS_NOT_EMPTY', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_SOURCE_META_MALFORMED', 'SOURCE_METADATA_UNSAFE'],
  ['PRODUCT_DISPATCH_HISTORY_PRESENT', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_SHOPIER_STATE_UNSAFE', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_STORY_STATE_UNSAFE', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_DISPATCH_CONTROL_UNSAFE', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_DOWNSTREAM_MARKER_PRESENT', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_MERCHANDISING_PUBLICATION_PRESENT', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
  ['PRODUCT_LEGACY_PUBLICATION_STATE_UNSAFE', 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE'],
]

const PRODUCT_ASSESSMENT_ELIMINATION_CODES = new Set(
  PRODUCT_ASSESSMENT_ELIMINATION_PRIORITY.map(([code]) => code),
)

const AGGREGATE_EVIDENCE_FAILURE_CODES = new Set([
  'ORIGINAL_AGGREGATE_TIMEOUT',
  'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED',
  'ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED',
])

export function classifyFreshCandidateProductElimination(
  codes: readonly string[],
): FreshCandidatePrimaryEliminationCategory {
  const codeSet = new Set(codes)
  if (codes.some((code) => !PRODUCT_ASSESSMENT_ELIMINATION_CODES.has(code))) {
    throw new DiscoveryUnsupportedError('DIAGNOSTIC_PRIMARY_ELIMINATION_UNMAPPED')
  }
  for (const [code, category] of PRODUCT_ASSESSMENT_ELIMINATION_PRIORITY) {
    if (codeSet.has(code)) return category
  }
  throw new DiscoveryUnsupportedError('DIAGNOSTIC_PRIMARY_ELIMINATION_UNMAPPED')
}

function emptyPrimaryEliminationCounts(): Record<FreshCandidatePrimaryEliminationCategory, number> {
  return Object.fromEntries(
    FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES.map((category) => [category, 0]),
  ) as Record<FreshCandidatePrimaryEliminationCategory, number>
}

function reconciledDiagnostics(params: {
  queriedProductCount: number
  assessedProductCount: number
  eligibleCandidateCount: number
  eliminatedProductCount: number
  primaryEliminationCounts: Record<FreshCandidatePrimaryEliminationCategory, number>
}): FreshCandidateEliminationDiagnostics {
  const counts = [
    params.queriedProductCount,
    params.assessedProductCount,
    params.eligibleCandidateCount,
    params.eliminatedProductCount,
    ...FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES.map((category) =>
      params.primaryEliminationCounts[category]),
  ]
  const primaryCount = FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES.reduce(
    (total, category) => total + params.primaryEliminationCounts[category],
    0,
  )
  if (
    counts.some((count) => !Number.isSafeInteger(count) || count < 0 || count > FRESH_VISUAL_DISCOVERY_MAX_PRODUCTS)
    || params.assessedProductCount > params.queriedProductCount
    || params.assessedProductCount !== params.eligibleCandidateCount + params.eliminatedProductCount
    || primaryCount !== params.eliminatedProductCount
  ) {
    throw new DiscoveryUnsupportedError('DIAGNOSTIC_RECONCILIATION_FAILED')
  }
  return {
    version: FRESH_CANDIDATE_ELIMINATION_DIAGNOSTICS_VERSION,
    queriedProductCount: params.queriedProductCount,
    assessedProductCount: params.assessedProductCount,
    eligibleCandidateCount: params.eligibleCandidateCount,
    eliminatedProductCount: params.eliminatedProductCount,
    primaryEliminationCounts: Object.fromEntries(
      FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES.map((category) => [
        category,
        params.primaryEliminationCounts[category],
      ]),
    ) as Record<FreshCandidatePrimaryEliminationCategory, number>,
  }
}

function eliminated(
  category: FreshCandidatePrimaryEliminationCategory,
): CandidateAssessmentResult {
  return { outcome: 'eliminated', category }
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  )
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function relationshipId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (isRecord(value)) return relationshipId(value.id)
  return null
}

function numericId(value: unknown): number | null {
  const id = relationshipId(value)
  if (typeof id === 'number') return id
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    const parsed = Number(id)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

function relationshipArray(value: unknown, childKey?: string): Array<string | number> | null {
  if (!Array.isArray(value)) return null
  const ids: Array<string | number> = []
  for (const entry of value) {
    const id = relationshipId(childKey && isRecord(entry) ? entry[childKey] : entry)
    if (id === null) return null
    ids.push(id)
  }
  return ids
}

function pageIsExact(value: unknown, page: number, limit: number): value is FreshVisualDiscoveryPage {
  if (!isRecord(value)) return false
  const totalDocs = value.totalDocs
  const totalPages = value.totalPages
  if (
    !Array.isArray(value.docs)
    || !Number.isSafeInteger(totalDocs) || Number(totalDocs) < 0
    || value.page !== page
    || !Number.isSafeInteger(totalPages) || Number(totalPages) < 0
    || typeof value.hasNextPage !== 'boolean'
    || value.limit !== limit
  ) return false
  const normalizedTotalDocs = Number(totalDocs)
  const normalizedTotalPages = Number(totalPages)
  const expectedPages = normalizedTotalDocs === 0 ? normalizedTotalPages : Math.ceil(normalizedTotalDocs / limit)
  const emptyPagesValid = normalizedTotalDocs === 0 && (normalizedTotalPages === 0 || normalizedTotalPages === 1)
  const expectedCount = normalizedTotalDocs === 0
    ? 0
    : Math.min(limit, Math.max(0, normalizedTotalDocs - ((page - 1) * limit)))
  return (emptyPagesValid || normalizedTotalPages === expectedPages)
    && (normalizedTotalDocs === 0 || page <= normalizedTotalPages)
    && value.docs.length === expectedCount
    && value.hasNextPage === (page < normalizedTotalPages)
}

async function readExhaustive(params: {
  readPage: (page: number, limit: number) => Promise<FreshVisualDiscoveryPage>
  limit: number
  maxPages: number
  maxDocs: number
  surface: string
  deadline: number
  now: () => number
}): Promise<RecordValue[]> {
  const docs: RecordValue[] = []
  const seen = new Set<string>()
  let expectedTotal: number | null = null
  let expectedPages: number | null = null
  for (let page = 1; page <= params.maxPages; page += 1) {
    if (params.now() >= params.deadline) throw new DiscoveryUnsupportedError('DISCOVERY_OBSERVATION_TIMEOUT')
    let result: FreshVisualDiscoveryPage
    try {
      result = await params.readPage(page, params.limit)
    } catch {
      throw new DiscoveryUnsupportedError(`${params.surface}_READ_FAILED`)
    } finally {
      // Late success and late failure both invalidate the observation.
      assertObservationDeadline(params.deadline, params.now)
    }
    if (!pageIsExact(result, page, params.limit)) {
      throw new DiscoveryUnsupportedError(`${params.surface}_PAGINATION_MALFORMED`)
    }
    if (expectedTotal === null) {
      expectedTotal = result.totalDocs
      expectedPages = result.totalPages
      if (expectedTotal > params.maxDocs || expectedPages > params.maxPages) {
        throw new DiscoveryUnsupportedError(`${params.surface}_PAGINATION_TRUNCATED`)
      }
    } else if (result.totalDocs !== expectedTotal || result.totalPages !== expectedPages) {
      throw new DiscoveryUnsupportedError(`${params.surface}_TOTAL_DRIFT`)
    }
    for (const raw of result.docs) {
      if (!isRecord(raw)) throw new DiscoveryUnsupportedError(`${params.surface}_RECORD_MALFORMED`)
      const id = relationshipId(raw.id)
      if (id === null) throw new DiscoveryUnsupportedError(`${params.surface}_RECORD_ID_MALFORMED`)
      const key = String(id)
      if (seen.has(key)) throw new DiscoveryUnsupportedError(`${params.surface}_DUPLICATE_ID`)
      seen.add(key)
      docs.push(structuredClone(raw) as RecordValue)
    }
    if (!result.hasNextPage) {
      if (docs.length !== expectedTotal) throw new DiscoveryUnsupportedError(`${params.surface}_TERMINATION_INVALID`)
      return docs
    }
  }
  throw new DiscoveryUnsupportedError(`${params.surface}_PAGINATION_TRUNCATED`)
}

function botEventsAreFresh(events: readonly RecordValue[], productId: number): boolean {
  let fresh = true
  let malformed = false
  let unsupported = false
  for (const event of events) {
    const eventType = typeof event.eventType === 'string' ? event.eventType.trim().toLowerCase() : ''
    const status = typeof event.status === 'string' ? event.status.trim().toLowerCase() : ''
    if (!eventType || !['pending', 'processed', 'failed', 'ignored'].includes(status)) {
      malformed = true
      continue
    }
    const classification = classifyVisualPilotBotEvent(eventType, status)
    if (classification === 'unknown') unsupported = true
    if (
      String(relationshipId(event.product)) !== String(productId)
      || (classification === 'exposure' && (status === 'pending' || status === 'processed'))
    ) fresh = false
  }
  // Validate the complete captured set; fixed failure precedence is order-independent.
  if (malformed) throw new DiscoveryUnsupportedError('BOT_EVENT_STATE_MALFORMED')
  if (unsupported) throw new DiscoveryUnsupportedError('BOT_EVENT_TAXONOMY_UNSUPPORTED')
  return fresh
}

function candidateStateProjection(product: RecordValue): RecordValue {
  return {
    id: product.id,
    stockNumber: product.stockNumber,
    status: product.status,
    images: product.images,
    generativeGallery: product.generativeGallery,
    workflow: product.workflow,
    channels: product.channels,
    channelTargets: product.channelTargets,
    sourceMeta: product.sourceMeta,
    merchandising: product.merchandising,
    postToInstagram: product.postToInstagram,
  }
}

async function assessCandidate(params: {
  product: RecordValue
  dependencies: FreshVisualDiscoveryDependencies
  deadline: number
  now: () => number
  observations: RecordValue[]
}): Promise<CandidateAssessmentResult> {
  const productId = numericId(params.product.id)
  if (productId === FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID) return { outcome: 'excluded' }
  if (!productId) throw new DiscoveryUnsupportedError('PRODUCT_IDENTITY_MALFORMED')
  const assessment = assessVisualOnlyProductState(params.product)
  if (!assessment.eligible) return eliminated(classifyFreshCandidateProductElimination(assessment.codes))
  if (assessment.productId !== productId || !assessment.stockNumber) {
    return eliminated('PRODUCT_RECORD_OR_IDENTITY_INVALID')
  }

  const surface = async (
    name: string,
    reader: (page: number, limit: number) => Promise<FreshVisualDiscoveryPage>,
  ) => readExhaustive({
    readPage: reader,
    limit: FRESH_VISUAL_DISCOVERY_PAGE_SIZE,
    maxPages: FRESH_VISUAL_DISCOVERY_MAX_SURFACE_PAGES,
    maxDocs: FRESH_VISUAL_DISCOVERY_PAGE_SIZE * FRESH_VISUAL_DISCOVERY_MAX_SURFACE_PAGES,
    surface: name,
    deadline: params.deadline,
    now: params.now,
  })

  const media = await surface('MEDIA', (page, limit) => params.dependencies.gateway.readMediaPage(productId, page, limit))
  const orderedImageIds = relationshipArray(params.product.images, 'image')
  if (!orderedImageIds || orderedImageIds.length < 1 || orderedImageIds.length > FRESH_VISUAL_DISCOVERY_MAX_ORIGINALS) {
    return eliminated('ORDERED_IMAGE_RELATIONSHIP_INVALID')
  }
  const productScopedMedia: RecordValue[] = []
  let productScopedGenerationStatePresent = false
  for (const entry of media) {
    const associatedProductId = relationshipId(entry.product)
    if (associatedProductId === null) {
      throw new DiscoveryUnsupportedError('MEDIA_PRODUCT_ASSOCIATION_AMBIGUOUS')
    }
    if (String(associatedProductId) !== String(productId)) continue
    productScopedMedia.push(entry)
    const state = classifyProductScopedMediaGenerationState(entry)
    if (state.state === 'unsupported') throw new DiscoveryUnsupportedError(state.code)
    if (state.state === 'generation-state-present') productScopedGenerationStatePresent = true
  }
  const productScopedMediaIds = productScopedMedia.map((entry) => relationshipId(entry.id))
  if (productScopedMediaIds.some((id) => id === null)) {
    throw new DiscoveryUnsupportedError('MEDIA_RECORD_ID_MALFORMED')
  }
  const galleryOwnershipMediaIds = [...new Map(
    [...productScopedMediaIds, ...orderedImageIds]
      .map((id) => [String(id), id] as const),
  ).values()] as Array<string | number>
  const galleryOwners = await surface('GENERATED_GALLERY_OWNER', (page, limit) =>
    params.dependencies.gateway.readGeneratedGalleryOwnerPage(
      galleryOwnershipMediaIds,
      page,
      limit,
    ))
  const jobs = await surface('IMAGE_JOB', (page, limit) => params.dependencies.gateway.readImageJobPage(productId, page, limit))
  const receipts = await surface('QUEUE_RECEIPT', (page, limit) => params.dependencies.gateway.readQueueReceiptPage(productId, page, limit))
  const botEvents = await surface('BOT_EVENT', (page, limit) => params.dependencies.gateway.readBotEventPage(productId, page, limit))
  const storyJobs = await surface('STORY_JOB', (page, limit) => params.dependencies.gateway.readStoryJobPage(productId, page, limit))

  const mediaEvidence: RecordValue[] = []
  params.observations.push({
    product: candidateStateProjection(params.product),
    media,
    galleryOwners,
    jobs,
    receipts,
    botEvents,
    storyJobs,
    mediaEvidence,
  })

  // Support validation precedes every normal category without collecting more evidence.
  const botEventsFresh = botEventsAreFresh(botEvents, productId)
  if (galleryOwners.length > 0) return eliminated('GENERATED_GALLERY_OWNERSHIP_PRESENT')
  if (jobs.length > 0) return eliminated('GENERATION_HISTORY_PRESENT')
  if (receipts.length > 0) return eliminated('DURABLE_QUEUE_RECEIPT_PRESENT')
  if (storyJobs.length > 0) return eliminated('STORY_JOB_HISTORY_PRESENT')
  if (!botEventsFresh) return eliminated('BOT_EVENT_HISTORY_UNSAFE')
  if (productScopedGenerationStatePresent) {
    return eliminated('PRODUCT_SCOPED_MEDIA_LINEAGE_OR_OWNERSHIP')
  }
  const mediaById = new Map(productScopedMedia.map((entry) => [String(relationshipId(entry.id)), entry]))
  const considered: RecordValue[] = []
  for (const imageId of orderedImageIds) {
    const entry = mediaById.get(String(imageId))
    if (
      !entry
      || String(relationshipId(entry.product)) !== String(productId)
      || entry.type !== 'original'
      || classifyProductScopedMediaGenerationState(entry).state !== 'clean-original'
    ) return eliminated('ORDERED_MEDIA_UNCLEAN')
    considered.push(entry)
  }
  if (new Set(considered.map((entry) => String(relationshipId(entry.id)))).size !== considered.length) {
    return eliminated('ORDERED_IMAGE_RELATIONSHIP_INVALID')
  }

  let aggregateBytes = 0
  let aggregatePixels = 0
  const contentDigests = new Set<string>()
  for (const entry of considered) {
    if (params.now() >= params.deadline) throw new DiscoveryUnsupportedError('DISCOVERY_OBSERVATION_TIMEOUT')
    const remainingBytes = FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_BYTES - aggregateBytes
    const remainingPixels = FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_PIXELS - aggregatePixels
    if (remainingBytes <= 0 || remainingPixels <= 0) {
      return eliminated('AGGREGATE_EVIDENCE_BUDGET_EXCEEDED')
    }
    let evidence: VisualPilotMediaReadResult
    try {
      evidence = await (params.dependencies.readMediaEvidence ?? readVisualPilotMediaEvidence)(entry, {
        ...params.dependencies.mediaRead,
        timeoutMs: Math.max(1, Math.min(
          VISUAL_PILOT_MEDIA_TIMEOUT_MS,
          params.deadline - params.now(),
        )),
        timeoutFailureCode: 'ORIGINAL_AGGREGATE_TIMEOUT',
        maxBytes: Math.min(VISUAL_PILOT_MEDIA_MAX_BYTES, remainingBytes),
        byteLimitFailureCode: 'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED',
        maxInputPixels: Math.min(VISUAL_PILOT_MEDIA_MAX_INPUT_PIXELS, remainingPixels),
        pixelLimitFailureCode: 'ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED',
      })
    } catch {
      throw new DiscoveryUnsupportedError('MEDIA_EVIDENCE_READ_FAILED')
    } finally {
      assertObservationDeadline(params.deadline, params.now)
    }
    aggregateBytes += evidence.consumedByteCount
    aggregatePixels += evidence.knownPixelCount
    if (!evidence.ok) {
      mediaEvidence.push({ id: relationshipId(entry.id), ok: false, code: evidence.code })
      return eliminated(AGGREGATE_EVIDENCE_FAILURE_CODES.has(evidence.code)
        ? 'AGGREGATE_EVIDENCE_BUDGET_EXCEEDED'
        : 'ORIGINAL_EVIDENCE_UNAVAILABLE_OR_INVALID')
    }
    if (aggregateBytes > FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_BYTES || aggregatePixels > FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_PIXELS) {
      return eliminated('AGGREGATE_EVIDENCE_BUDGET_EXCEEDED')
    }
    if (contentDigests.has(evidence.contentDigest)) return eliminated('ORIGINAL_CONTENT_DUPLICATE')
    contentDigests.add(evidence.contentDigest)
    mediaEvidence.push({
      id: relationshipId(entry.id),
      mimeType: evidence.mimeType,
      width: evidence.width,
      height: evidence.height,
      byteSize: evidence.byteSize,
      contentDigest: evidence.contentDigest,
    })
  }

  const usableOriginalCount = considered.length
  const reasonCodes = [
    'ADVERTISING_HISTORY_AUTHORITY_UNAVAILABLE',
    'PUBLISHING_AUTHORITY_UNAVAILABLE',
    'TELEGRAM_PREVIEW_HISTORY_AUTHORITY_UNAVAILABLE',
  ]
  return {
    outcome: 'eligible',
    candidate: {
      productId,
      stockNumber: assessment.stockNumber,
      usableOriginalCount,
      evidenceClassification: 'COMPLETE_VISUAL_ONLY_EVIDENCE_DOWNSTREAM_AUTHORITY_UNAVAILABLE',
      reasonCodes,
      eligibleForVisualOnlyGeneration: true,
      eligibleForPublishing: false,
      stateDigest: digest({
        product: candidateStateProjection(params.product),
        media: media.map((entry) => ({
          id: entry.id,
          product: entry.product,
          type: entry.type,
          generationLineage: entry.generationLineage,
          mimeType: entry.mimeType,
          filename: entry.filename,
          url: entry.url,
        })),
        mediaEvidence,
        jobs,
        receipts,
        botEvents,
        storyJobs,
      }),
    },
  }
}

async function captureSnapshot(
  dependencies: FreshVisualDiscoveryDependencies,
  deadline: number,
  now: () => number,
): Promise<DiscoverySnapshot> {
  const products = (await readExhaustive({
    readPage: (page, limit) => dependencies.gateway.readProductPage(page, limit),
    limit: FRESH_VISUAL_DISCOVERY_PAGE_SIZE,
    maxPages: FRESH_VISUAL_DISCOVERY_MAX_PAGES,
    maxDocs: FRESH_VISUAL_DISCOVERY_MAX_PRODUCTS,
    surface: 'PRODUCT',
    deadline,
    now,
  })).filter((product) => numericId(product.id) !== FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID)
  const candidates: CandidateSnapshot[] = []
  const observations: RecordValue[] = []
  const primaryEliminationCounts = emptyPrimaryEliminationCounts()
  let assessedProductCount = 0
  let eliminatedProductCount = 0
  for (const product of products) {
    const result = await assessCandidate({ product, dependencies, deadline, now, observations })
    if (result.outcome === 'excluded') continue
    assessedProductCount += 1
    if (result.outcome === 'eligible') {
      candidates.push(result.candidate)
    } else {
      eliminatedProductCount += 1
      primaryEliminationCounts[result.category] += 1
    }
  }
  const sortedCandidates = candidates.sort((left, right) => left.productId - right.productId)
  return {
    candidates: sortedCandidates,
    observationDigest: digest({
      products: products.map(candidateStateProjection),
      observations,
    }),
    diagnostics: reconciledDiagnostics({
      queriedProductCount: products.length,
      assessedProductCount,
      eligibleCandidateCount: sortedCandidates.length,
      eliminatedProductCount,
      primaryEliminationCounts,
    }),
  }
}

function emptyReport(
  readiness: FreshVisualDiscoveryReadiness,
  reasonCodes: string[],
  snapshotsCompleted: 0 | 1 | 2,
  diagnostics?: FreshCandidateEliminationDiagnostics,
): FreshVisualDiscoveryReport {
  return {
    version: FRESH_VISUAL_DISCOVERY_VERSION,
    readiness,
    primaryProductId: null,
    candidates: [],
    reasonCodes: [...new Set(reasonCodes)].sort(),
    snapshotsCompleted,
    publishingAuthority: {
      telegramPreviewHistory: 'unavailable',
      advertisingHistory: 'unavailable',
      eligibleForPublishing: false,
    },
    ...(diagnostics ? { diagnostics } : {}),
  }
}

function requireReconciledSnapshot(result: DiscoverySnapshotResult | undefined): DiscoverySnapshot {
  if (!result) throw new DiscoveryUnsupportedError('DISCOVERY_READ_FAILED')
  if (!result.ok) throw result.error
  return {
    ...result.snapshot,
    diagnostics: reconciledDiagnostics(result.snapshot.diagnostics),
  }
}

/** Pure report boundary: accepts captured data only, with no readers or runtime overrides. */
export function finalizeFreshVisualDiscoveryReport(
  firstResult: DiscoverySnapshotResult,
  secondResult?: DiscoverySnapshotResult,
): FreshVisualDiscoveryReport {
  let first: DiscoverySnapshot
  try {
    first = requireReconciledSnapshot(firstResult)
  } catch (error) {
    return emptyReport(
      'CANDIDATE_DISCOVERY_UNSUPPORTED',
      [error instanceof DiscoveryUnsupportedError ? error.code : 'DISCOVERY_READ_FAILED'],
      0,
    )
  }
  let second: DiscoverySnapshot
  try {
    second = requireReconciledSnapshot(secondResult)
  } catch (error) {
    return emptyReport(
      'CANDIDATE_DISCOVERY_UNSUPPORTED',
      [error instanceof DiscoveryUnsupportedError ? error.code : 'DISCOVERY_READ_FAILED'],
      1,
    )
  }
  const firstDigest = digest(first)
  const secondDigest = digest(second)
  if (firstDigest !== secondDigest) {
    return emptyReport('CANDIDATE_STATE_DRIFTED', ['CANDIDATE_RELEVANT_STATE_CHANGED'], 2)
  }
  if (second.candidates.length === 0) {
    return emptyReport(
      'NO_ELIGIBLE_FRESH_CANDIDATE',
      ['NO_COMPLETE_VISUAL_ONLY_CANDIDATE'],
      2,
      second.diagnostics,
    )
  }

  const ranked = [...second.candidates]
    .sort((left, right) =>
      Math.min(3, right.usableOriginalCount) - Math.min(3, left.usableOriginalCount)
        || left.productId - right.productId,
    )
    .slice(0, 3)
    .map((candidate, index): FreshVisualDiscoveryCandidate => ({
      rank: index + 1,
      productId: candidate.productId,
      stockNumber: candidate.stockNumber,
      usableOriginalCount: candidate.usableOriginalCount,
      evidenceClassification: candidate.evidenceClassification,
      reasonCodes: candidate.reasonCodes,
      eligibleForVisualOnlyGeneration: true,
      eligibleForPublishing: false,
    }))
  return {
    version: FRESH_VISUAL_DISCOVERY_VERSION,
    readiness: 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION',
    primaryProductId: ranked[0].productId,
    candidates: ranked,
    reasonCodes: ['PUBLISHING_AUTHORITY_UNAVAILABLE'],
    snapshotsCompleted: 2,
    publishingAuthority: {
      telegramPreviewHistory: 'unavailable',
      advertisingHistory: 'unavailable',
      eligibleForPublishing: false,
    },
    diagnostics: second.diagnostics,
  }
}

export async function discoverFreshVisualProducts(
  dependencies: FreshVisualDiscoveryDependencies,
): Promise<FreshVisualDiscoveryReport> {
  const now = dependencies.now ?? Date.now
  const deadline = now() + FRESH_VISUAL_DISCOVERY_OBSERVATION_TIMEOUT_MS
  let first: DiscoverySnapshot
  try {
    first = await captureSnapshot(dependencies, deadline, now)
    // Count a snapshot only after every terminal path has returned within scope.
    assertObservationDeadline(deadline, now)
  } catch (error) {
    return finalizeFreshVisualDiscoveryReport({ ok: false, error })
  }
  let second: DiscoverySnapshot
  try {
    second = await captureSnapshot(dependencies, deadline, now)
    assertObservationDeadline(deadline, now)
  } catch (error) {
    return finalizeFreshVisualDiscoveryReport({ ok: true, snapshot: first }, { ok: false, error })
  }
  const report = finalizeFreshVisualDiscoveryReport(
    { ok: true, snapshot: first },
    { ok: true, snapshot: second },
  )
  try {
    assertObservationDeadline(deadline, now)
  } catch (error) {
    return emptyReport(
      'CANDIDATE_DISCOVERY_UNSUPPORTED',
      [error instanceof DiscoveryUnsupportedError ? error.code : 'DISCOVERY_READ_FAILED'],
      2,
    )
  }
  return report
}

export type FreshVisualDiscoveryArgDecision =
  | { ok: true; helpRequested: boolean }
  | { ok: false; code: 'UNKNOWN_ARGUMENT' | 'DUPLICATE_ARGUMENT' | 'READ_ONLY_CONFIRMATION_REQUIRED' }

export function parseFreshVisualDiscoveryArgs(argv: readonly string[]): FreshVisualDiscoveryArgDecision {
  const allowed = new Set(['--confirm-read-only', '--help'])
  const seen = new Set<string>()
  for (const arg of argv) {
    if (!allowed.has(arg)) return { ok: false, code: 'UNKNOWN_ARGUMENT' }
    if (seen.has(arg)) return { ok: false, code: 'DUPLICATE_ARGUMENT' }
    seen.add(arg)
  }
  if (seen.has('--help')) {
    if (seen.size !== 1) return { ok: false, code: 'UNKNOWN_ARGUMENT' }
    return { ok: true, helpRequested: true }
  }
  if (!seen.has('--confirm-read-only')) return { ok: false, code: 'READ_ONLY_CONFIRMATION_REQUIRED' }
  return { ok: true, helpRequested: false }
}
