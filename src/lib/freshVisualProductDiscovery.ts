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

export const FRESH_VISUAL_DISCOVERY_VERSION = 'fresh-visual-product-discovery/v1' as const
export const FRESH_VISUAL_DISCOVERY_PAGE_SIZE = 25
export const FRESH_VISUAL_DISCOVERY_MAX_PAGES = 4
export const FRESH_VISUAL_DISCOVERY_MAX_PRODUCTS = FRESH_VISUAL_DISCOVERY_PAGE_SIZE * FRESH_VISUAL_DISCOVERY_MAX_PAGES
export const FRESH_VISUAL_DISCOVERY_MAX_SURFACE_PAGES = 20
export const FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_BYTES = 24_000_000
export const FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_PIXELS = 100_000_000
export const FRESH_VISUAL_DISCOVERY_OBSERVATION_TIMEOUT_MS = 45_000
export const FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID = 349

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
}

class DiscoveryUnsupportedError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.code = code
  }
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

function noGenerationLineage(media: RecordValue): boolean {
  if (media.generationLineage === undefined || media.generationLineage === null) return true
  if (!isRecord(media.generationLineage)) return false
  return Object.values(media.generationLineage).every((value) => value === undefined || value === null || value === '')
}

function botEventsAreFresh(events: readonly RecordValue[], productId: number): boolean {
  for (const event of events) {
    if (String(relationshipId(event.product)) !== String(productId)) return false
    const eventType = typeof event.eventType === 'string' ? event.eventType.trim().toLowerCase() : ''
    const status = typeof event.status === 'string' ? event.status.trim().toLowerCase() : ''
    if (!eventType || !['pending', 'processed', 'failed', 'ignored'].includes(status)) {
      throw new DiscoveryUnsupportedError('BOT_EVENT_STATE_MALFORMED')
    }
    const classification = classifyVisualPilotBotEvent(eventType, status)
    if (classification === 'unknown') throw new DiscoveryUnsupportedError('BOT_EVENT_TAXONOMY_UNSUPPORTED')
    if (classification === 'exposure' && (status === 'pending' || status === 'processed')) return false
  }
  return true
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
}): Promise<CandidateSnapshot | null> {
  const productId = numericId(params.product.id)
  if (productId === FRESH_VISUAL_DISCOVERY_EXCLUDED_PRODUCT_ID) return null
  if (!productId) throw new DiscoveryUnsupportedError('PRODUCT_IDENTITY_MALFORMED')
  const assessment = assessVisualOnlyProductState(params.product)
  if (!assessment.eligible || assessment.productId !== productId || !assessment.stockNumber) return null

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
  if (!orderedImageIds || orderedImageIds.length < 1) return null
  const galleryOwners = await surface('GENERATED_GALLERY_OWNER', (page, limit) =>
    params.dependencies.gateway.readGeneratedGalleryOwnerPage(orderedImageIds, page, limit))
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

  if (galleryOwners.length > 0 || jobs.length > 0 || receipts.length > 0 || storyJobs.length > 0) return null
  if (!botEventsAreFresh(botEvents, productId)) return null
  if (jobs.some((job) => Array.isArray(job.generationAttempts) && job.generationAttempts.length > 0)) return null
  if (media.some((entry) => entry.type === 'generated')) return null

  const mediaById = new Map(media.map((entry) => [String(relationshipId(entry.id)), entry]))
  const considered: RecordValue[] = []
  for (const imageId of orderedImageIds) {
    const entry = mediaById.get(String(imageId))
    if (
      !entry
      || String(relationshipId(entry.product)) !== String(productId)
      || entry.type !== 'original'
      || !noGenerationLineage(entry)
    ) return null
    considered.push(entry)
  }
  if (new Set(considered.map((entry) => String(relationshipId(entry.id)))).size !== considered.length) return null

  let aggregateBytes = 0
  let aggregatePixels = 0
  const contentDigests = new Set<string>()
  for (const entry of considered) {
    if (params.now() >= params.deadline) throw new DiscoveryUnsupportedError('DISCOVERY_OBSERVATION_TIMEOUT')
    const remainingBytes = FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_BYTES - aggregateBytes
    const remainingPixels = FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_PIXELS - aggregatePixels
    if (remainingBytes <= 0 || remainingPixels <= 0) return null
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
    }
    aggregateBytes += evidence.consumedByteCount
    aggregatePixels += evidence.knownPixelCount
    if (!evidence.ok) {
      mediaEvidence.push({ id: relationshipId(entry.id), ok: false, code: evidence.code })
      return null
    }
    if (aggregateBytes > FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_BYTES || aggregatePixels > FRESH_VISUAL_DISCOVERY_MAX_AGGREGATE_PIXELS) return null
    if (contentDigests.has(evidence.contentDigest)) return null
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
  }
}

async function captureSnapshot(
  dependencies: FreshVisualDiscoveryDependencies,
  deadline: number,
  now: () => number,
): Promise<DiscoverySnapshot> {
  const products = await readExhaustive({
    readPage: (page, limit) => dependencies.gateway.readProductPage(page, limit),
    limit: FRESH_VISUAL_DISCOVERY_PAGE_SIZE,
    maxPages: FRESH_VISUAL_DISCOVERY_MAX_PAGES,
    maxDocs: FRESH_VISUAL_DISCOVERY_MAX_PRODUCTS,
    surface: 'PRODUCT',
    deadline,
    now,
  })
  const candidates: CandidateSnapshot[] = []
  const observations: RecordValue[] = []
  for (const product of products) {
    const candidate = await assessCandidate({ product, dependencies, deadline, now, observations })
    if (candidate) candidates.push(candidate)
  }
  return {
    candidates: candidates.sort((left, right) => left.productId - right.productId),
    observationDigest: digest({
      products: products.map(candidateStateProjection),
      observations,
    }),
  }
}

function emptyReport(
  readiness: FreshVisualDiscoveryReadiness,
  reasonCodes: string[],
  snapshotsCompleted: 0 | 1 | 2,
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
  } catch (error) {
    return emptyReport(
      'CANDIDATE_DISCOVERY_UNSUPPORTED',
      [error instanceof DiscoveryUnsupportedError ? error.code : 'DISCOVERY_READ_FAILED'],
      0,
    )
  }
  let second: DiscoverySnapshot
  try {
    second = await captureSnapshot(dependencies, deadline, now)
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
    return emptyReport('NO_ELIGIBLE_FRESH_CANDIDATE', ['NO_COMPLETE_VISUAL_ONLY_CANDIDATE'], 2)
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
  }
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
