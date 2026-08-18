import {
  IMAGE_GENERATION_PACK_SELECTION_VERSION,
  parseGenerationAttemptHistory,
  resolveApprovalCandidates,
  type ImageGenerationAttemptMetadata,
} from './imageGenerationContracts'
import { GENERATED_SLOT_KEYS, IMAGE_SLOT_CONTRACT_VERSION, getSlotByKey } from './imageSlotContract'
import { VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION } from './imageFramingCorrectionV01'
import {
  LOAFER_IDENTITY_LOCK_V0_VERSION,
  PRODUCT_IDENTITY_ANCHOR_V0_VERSION,
  VISUAL_FRAMING_LOCK_V0_VERSION,
} from './imageVisualLockV0'
import {
  COMPONENT_TOPOLOGY_LOCK_V01_VERSION,
  VISUAL_GEOMETRY_GATE_V01_VERSION,
  VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION,
  VISUAL_LOCK_V01_PROFILE_VERSION,
  VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION,
  VISUAL_QUALITY_EVALUATOR_V01_VERSION,
} from './imageVisualLockV01'
import {
  readVisualPilotMediaEvidence,
  type VisualPilotMediaReadDependencies,
} from './visualPilotMediaEvidence'

export const VISUAL_PILOT_TARGET_VERIFIER_VERSION = 'visual-pilot-target-verifier/v1' as const
export const VISUAL_PILOT_TARGET_PAGE_SIZE = 50

export type VisualPilotTargetVerdict =
  | 'TARGET_READY_FOR_PILOT_APPROVAL'
  | 'TARGET_BLOCKED'
  | 'TARGET_EVIDENCE_UNSUPPORTED'

export type VisualPilotTargetReason = {
  code: string
  kind: 'blocked' | 'unsupported'
}

export type VisualPilotPage = {
  docs: unknown[]
  totalDocs: number
  page: number
  totalPages: number
  hasNextPage: boolean
  limit: number
}

export type VisualPilotTargetReadGateway = {
  findProductCandidates(reference: string): Promise<unknown[]>
  findMediaById(id: string | number): Promise<unknown | null>
  readImageJobPage(productId: string | number, page: number, limit: number): Promise<VisualPilotPage>
  readPayloadJobPage(imageJobIds: readonly (string | number)[], page: number, limit: number): Promise<VisualPilotPage>
  readBotEventPage(productId: string | number, page: number, limit: number): Promise<VisualPilotPage>
  readStoryJobPage(productId: string | number, page: number, limit: number): Promise<VisualPilotPage>
  /** Optional only when backed by a durable product-correlated receipt authority. */
  readTelegramPreviewReceiptPage?(productId: string | number, page: number, limit: number): Promise<VisualPilotPage>
  /** Optional only when backed by authoritative external advertising history. */
  readAdvertisingHistoryPage?(productId: string | number, page: number, limit: number): Promise<VisualPilotPage>
}

export type VisualPilotOriginalEvidence = {
  ordinal: number
  state: 'verified' | 'blocked'
  sourceClassification: 'original' | 'ambiguous'
  accessibility: 'accessible_decodable' | 'blocked'
  width: number | null
  height: number | null
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null
}

export type VisualPilotTargetReport = {
  verifierContractVersion: typeof VISUAL_PILOT_TARGET_VERIFIER_VERSION
  productReference: string
  product: {
    id: string | number | null
    title: string | null
    stockNumber: string | null
    lifecycle: string
    workflowStatus: string
    active: boolean | null
    sellable: boolean | null
    reviewStatus: string
    confirmationStatus: string
    visualStatus: string
    protectedBrand: boolean | null
    galleryRelationshipCount: number | null
  }
  productIsolationState: 'pass' | 'fail' | 'unknown'
  originals: {
    count: number
    evidence: VisualPilotOriginalEvidence[]
    distinctState: 'pass' | 'fail' | 'unknown'
    orderedState: 'pass' | 'fail' | 'unknown'
    semanticSuitability: 'operator_review_required'
  }
  jobs: {
    exhaustiveCount: number
    paginationReconciled: boolean
    terminalCount: number
    nonterminalCount: number
    byContractProfile: Record<string, number>
    byPreviewApprovalState: Record<string, number>
    byMediaPersistence: { zero: number; partial: number; complete: number; other: number }
  }
  attempts: {
    count: number
    lineageIntegrityState: 'pass' | 'fail' | 'unknown'
    activeAttemptState: 'clear' | 'terminal_reconciled' | 'blocked' | 'unknown'
    slotOrder: readonly string[]
  }
  queueReceipts: {
    count: number
    paginationReconciled: boolean
    state: 'clear' | 'blocked' | 'unknown'
  }
  telegramPreviewState: 'clear' | 'blocked' | 'unsupported'
  packApprovalManifestState: 'complete_or_not_applicable' | 'blocked' | 'unknown'
  downstreamExposure: {
    state: 'clear' | 'blocked' | 'unsupported'
    shopier: 'clear' | 'exposed' | 'unknown'
    publishing: 'clear' | 'exposed' | 'unknown'
    advertising: 'clear' | 'exposed' | 'unsupported'
    dispatch: 'clear' | 'exposed' | 'unknown'
  }
  blockingReasons: VisualPilotTargetReason[]
  finalVerdict: VisualPilotTargetVerdict
}

export type VisualPilotTargetVerifierDependencies = {
  gateway: VisualPilotTargetReadGateway
  mediaRead?: VisualPilotMediaReadDependencies
}

export type VisualPilotTargetCliParseResult =
  | { ok: true; productReference: string; helpRequested: false }
  | { ok: true; productReference: null; helpRequested: true }
  | { ok: false; code: string }

export type VisualPilotTargetCommandResult = {
  exitCode: number
  report?: VisualPilotTargetReport
  refusalCode?: string
}

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function relationshipId(value: unknown): string | number | null {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (isRecord(value)) return relationshipId(value.id)
  return null
}

function sameId(left: unknown, right: unknown): boolean {
  const a = relationshipId(left)
  const b = relationshipId(right)
  return a !== null && b !== null && String(a) === String(b)
}

function canonicalProductId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function safeEnum(value: unknown, allowed: readonly string[], fallback = 'unknown'): string {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback
}

function safeTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\b[a-z][a-z0-9+.-]{1,31}:\/\/\S+/gi, '[redacted]')
    .replace(/\b(?:sk|ghp|github_pat|xox[a-z]?)[-_][a-z0-9_-]{12,}\b/gi, '[redacted]')
    .replace(/\bAIza[a-z0-9_-]{20,}\b/gi, '[redacted]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return cleaned || null
}

const DOWNSTREAM_EXPOSURE_EVENT_PREFIXES = [
  'publish',
  'dispatch',
  'shopier',
  'story',
  'advert',
  'campaign',
] as const

function isDownstreamExposureEvent(eventType: string): boolean {
  if (eventType === 'product.activated') return true
  return DOWNSTREAM_EXPOSURE_EVENT_PREFIXES.some((prefix) =>
    eventType === prefix
    || eventType.startsWith(`${prefix}.`)
    || eventType.startsWith(`${prefix}_`)
    || eventType.startsWith(`${prefix}-`))
}

function safeStockNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return /^SN\d+$/.test(normalized) ? normalized : null
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) return null
  const normalized = value.map((entry) => entry.trim().toLowerCase())
  return normalized.some((entry) => !entry) ? null : normalized
}

function dateIsValid(value: unknown): boolean {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function relationArray(value: unknown, nestedKey?: string): (string | number)[] | null {
  if (!Array.isArray(value)) return null
  const ids: (string | number)[] = []
  for (const entry of value) {
    const candidate = nestedKey && isRecord(entry) ? entry[nestedKey] : entry
    const id = relationshipId(candidate)
    if (id === null) return null
    ids.push(id)
  }
  return ids
}

function hasGeneratedLineage(media: RecordValue): boolean {
  if (!isRecord(media.generationLineage)) return false
  const lineage = media.generationLineage
  return ['contractVersion', 'jobId', 'attemptId', 'slotId']
    .some((key) => lineage[key] !== undefined && lineage[key] !== null && lineage[key] !== '')
}

function sortedReasons(reasons: VisualPilotTargetReason[]): VisualPilotTargetReason[] {
  const byKey = new Map<string, VisualPilotTargetReason>()
  for (const reason of reasons) byKey.set(`${reason.kind}:${reason.code}`, reason)
  return [...byKey.values()].sort((left, right) =>
    left.code.localeCompare(right.code) || left.kind.localeCompare(right.kind),
  )
}

function canonicalEvidence(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalEvidence)
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalEvidence(entry)]),
    )
  }
  return value
}

function productReadSnapshot(product: RecordValue): unknown {
  return canonicalEvidence({
    id: relationshipId(product.id),
    stockNumber: safeStockNumber(product.stockNumber),
    status: product.status,
    workflow: product.workflow,
    imageQuality: product.imageQuality,
    images: relationArray(product.images, 'image'),
    generativeGallery: relationArray(product.generativeGallery, 'image'),
    channels: product.channels,
    channelTargets: product.channelTargets,
    sourceMeta: product.sourceMeta,
    updatedAt: product.updatedAt,
  })
}

function jobReadSnapshot(jobs: readonly RecordValue[]): unknown {
  return canonicalEvidence(jobs.map((job) => ({
    id: relationshipId(job.id),
    product: relationshipId(job.product),
    status: job.status,
    generationContractVersion: job.generationContractVersion,
    activeAttemptId: job.activeAttemptId,
    generationAttempts: job.generationAttempts,
    generatedImages: relationArray(job.generatedImages),
    imageCount: job.imageCount,
    generationCompletedAt: job.generationCompletedAt,
    updatedAt: job.updatedAt,
  })))
}

function emptyReport(reference: string): VisualPilotTargetReport {
  return {
    verifierContractVersion: VISUAL_PILOT_TARGET_VERIFIER_VERSION,
    productReference: reference,
    product: {
      id: null,
      title: null,
      stockNumber: null,
      lifecycle: 'unknown',
      workflowStatus: 'unknown',
      active: null,
      sellable: null,
      reviewStatus: 'unknown',
      confirmationStatus: 'unknown',
      visualStatus: 'unknown',
      protectedBrand: null,
      galleryRelationshipCount: null,
    },
    productIsolationState: 'unknown',
    originals: {
      count: 0,
      evidence: [],
      distinctState: 'unknown',
      orderedState: 'unknown',
      semanticSuitability: 'operator_review_required',
    },
    jobs: {
      exhaustiveCount: 0,
      paginationReconciled: false,
      terminalCount: 0,
      nonterminalCount: 0,
      byContractProfile: {},
      byPreviewApprovalState: {},
      byMediaPersistence: { zero: 0, partial: 0, complete: 0, other: 0 },
    },
    attempts: {
      count: 0,
      lineageIntegrityState: 'unknown',
      activeAttemptState: 'unknown',
      slotOrder: [...GENERATED_SLOT_KEYS],
    },
    queueReceipts: { count: 0, paginationReconciled: false, state: 'unknown' },
    telegramPreviewState: 'unsupported',
    packApprovalManifestState: 'unknown',
    downstreamExposure: {
      state: 'unsupported',
      shopier: 'unknown',
      publishing: 'unknown',
      advertising: 'unsupported',
      dispatch: 'unknown',
    },
    blockingReasons: [],
    finalVerdict: 'TARGET_EVIDENCE_UNSUPPORTED',
  }
}

function finishReport(report: VisualPilotTargetReport, reasons: VisualPilotTargetReason[]): VisualPilotTargetReport {
  report.blockingReasons = sortedReasons(reasons)
  report.finalVerdict = report.blockingReasons.some((reason) => reason.kind === 'unsupported')
    ? 'TARGET_EVIDENCE_UNSUPPORTED'
    : report.blockingReasons.length > 0
      ? 'TARGET_BLOCKED'
      : 'TARGET_READY_FOR_PILOT_APPROVAL'
  return report
}

export function parseVisualPilotTargetArgs(argv: readonly string[]): VisualPilotTargetCliParseResult {
  let productReference: string | null = null
  let confirmed = false
  let helpRequested = false
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      if (helpRequested) return { ok: false, code: 'CLI_DUPLICATE_ARGUMENT' }
      helpRequested = true
      continue
    }
    if (arg === '--confirm-read-only') {
      if (confirmed) return { ok: false, code: 'CLI_DUPLICATE_ARGUMENT' }
      confirmed = true
      continue
    }
    if (arg.startsWith('--product=')) {
      if (productReference !== null) return { ok: false, code: 'CLI_DUPLICATE_PRODUCT_ARGUMENT' }
      const value = arg.slice('--product='.length).trim().toUpperCase()
      if (!value || (!/^\d+$/.test(value) && !/^SN\d+$/.test(value))) {
        return { ok: false, code: 'CLI_PRODUCT_REFERENCE_INVALID' }
      }
      productReference = value
      continue
    }
    return { ok: false, code: 'CLI_UNKNOWN_ARGUMENT' }
  }
  if (helpRequested) {
    if (argv.length !== 1) return { ok: false, code: 'CLI_HELP_ARGUMENT_CONFLICT' }
    return { ok: true, productReference: null, helpRequested: true }
  }
  if (productReference === null) return { ok: false, code: 'CLI_PRODUCT_REQUIRED' }
  if (!confirmed) return { ok: false, code: 'CLI_READ_ONLY_CONFIRMATION_REQUIRED' }
  return { ok: true, productReference, helpRequested: false }
}

export async function executeVisualPilotTargetCommand(params: {
  argv: readonly string[]
  initialize: () => Promise<VisualPilotTargetVerifierDependencies>
}): Promise<VisualPilotTargetCommandResult> {
  const parsed = parseVisualPilotTargetArgs(params.argv)
  if (!parsed.ok) return { exitCode: 2, refusalCode: parsed.code }
  if (parsed.helpRequested) return { exitCode: 0 }
  const dependencies = await params.initialize()
  const report = await verifyVisualPilotTarget(parsed.productReference, dependencies)
  return {
    exitCode: report.finalVerdict === 'TARGET_READY_FOR_PILOT_APPROVAL'
      ? 0
      : report.finalVerdict === 'TARGET_BLOCKED'
        ? 3
        : 4,
    report,
  }
}

async function collectAllPages(params: {
  readPage: (page: number, limit: number) => Promise<VisualPilotPage>
  malformedCode: string
  unsupportedCode: string
  reasons: VisualPilotTargetReason[]
}): Promise<{ ok: boolean; docs: RecordValue[] }> {
  const docs: RecordValue[] = []
  const ids = new Set<string>()
  let expectedTotal: number | null = null
  let expectedTotalPages: number | null = null
  let page = 1
  const maxPages = 10_000
  while (page <= maxPages) {
    let result: VisualPilotPage
    try {
      result = await params.readPage(page, VISUAL_PILOT_TARGET_PAGE_SIZE)
    } catch {
      params.reasons.push({ code: params.unsupportedCode, kind: 'unsupported' })
      return { ok: false, docs: [] }
    }
    const valid = Array.isArray(result.docs)
      && Number.isSafeInteger(result.totalDocs) && result.totalDocs >= 0
      && Number.isSafeInteger(result.page) && result.page === page
      && Number.isSafeInteger(result.totalPages) && result.totalPages >= 0
      && typeof result.hasNextPage === 'boolean'
      && result.limit === VISUAL_PILOT_TARGET_PAGE_SIZE
      && result.docs.length <= result.limit
    const calculatedTotalPages = result.totalDocs === 0
      ? result.totalPages
      : Math.ceil(result.totalDocs / VISUAL_PILOT_TARGET_PAGE_SIZE)
    const expectedDocCount = result.totalDocs === 0
      ? 0
      : Math.min(
          VISUAL_PILOT_TARGET_PAGE_SIZE,
          Math.max(0, result.totalDocs - ((page - 1) * VISUAL_PILOT_TARGET_PAGE_SIZE)),
        )
    if (
      !valid
      || (expectedTotal !== null && expectedTotal !== result.totalDocs)
      || (expectedTotalPages !== null && expectedTotalPages !== result.totalPages)
      || (result.totalDocs > 0 && result.totalPages !== calculatedTotalPages)
      || (result.totalDocs === 0 && result.totalPages !== 0 && result.totalPages !== 1)
      || result.docs.length !== expectedDocCount
    ) {
      params.reasons.push({ code: params.malformedCode, kind: 'blocked' })
      return { ok: false, docs: [] }
    }
    expectedTotal ??= result.totalDocs
    expectedTotalPages ??= result.totalPages
    for (const raw of result.docs) {
      if (!isRecord(raw)) {
        params.reasons.push({ code: params.malformedCode, kind: 'blocked' })
        return { ok: false, docs: [] }
      }
      const id = relationshipId(raw.id)
      if (id === null || ids.has(String(id))) {
        params.reasons.push({ code: params.malformedCode, kind: 'blocked' })
        return { ok: false, docs: [] }
      }
      ids.add(String(id))
      docs.push(raw)
    }
    if (!result.hasNextPage) {
      const pagesMatch = expectedTotal === 0
        ? result.totalPages === 0 || result.totalPages === 1
        : result.totalPages === page
      if (docs.length !== expectedTotal || !pagesMatch) {
        params.reasons.push({ code: params.malformedCode, kind: 'blocked' })
        return { ok: false, docs: [] }
      }
      return { ok: true, docs }
    }
    if (result.docs.length === 0 || result.totalPages <= page) {
      params.reasons.push({ code: params.malformedCode, kind: 'blocked' })
      return { ok: false, docs: [] }
    }
    page += 1
  }
  params.reasons.push({ code: params.malformedCode, kind: 'blocked' })
  return { ok: false, docs: [] }
}

function exposureFromProduct(product: RecordValue): {
  shopier: boolean | null
  publishing: boolean | null
  dispatch: boolean | null
} {
  const channels = isRecord(product.channels) ? product.channels : null
  const workflow = isRecord(product.workflow) ? product.workflow : null
  const sourceMeta = isRecord(product.sourceMeta) ? product.sourceMeta : null
  const targets = asStringArray(product.channelTargets)
  if (!channels || !workflow || !sourceMeta || targets === null) {
    return { shopier: null, publishing: null, dispatch: null }
  }
  const channelFields = ['publishWebsite', 'publishInstagram', 'publishFacebook', 'publishX', 'publishShopier'] as const
  if (!channelFields.every((field) => typeof channels[field] === 'boolean')) {
    return { shopier: null, publishing: null, dispatch: null }
  }
  const knownTargets = new Set(['website', 'instagram', 'facebook', 'x', 'shopier'])
  if (targets.some((target) => !knownTargets.has(target)) || new Set(targets).size !== targets.length) {
    return { shopier: null, publishing: null, dispatch: null }
  }
  const dispatched = asStringArray(sourceMeta.dispatchedChannels)
  const shopierStatus = safeEnum(sourceMeta.shopierSyncStatus, ['not_synced', 'queued', 'syncing', 'synced', 'error'])
  const publishStatus = safeEnum(workflow.publishStatus, ['not_requested', 'pending', 'published', 'partial', 'failed'])
  const storyStatus = safeEnum(sourceMeta.storyStatus, [
    'none', 'queued', 'awaiting_approval', 'publishing', 'published', 'partial_success', 'failed', 'blocked_officially',
  ])
  if (
    dispatched === null
    || dispatched.some((target) => !knownTargets.has(target))
    || typeof sourceMeta.forceRedispatch !== 'boolean'
    || typeof sourceMeta.previewDispatch !== 'boolean'
    || shopierStatus === 'unknown'
    || publishStatus === 'unknown'
    || storyStatus === 'unknown'
  ) {
    return { shopier: null, publishing: null, dispatch: null }
  }
  const shopier = channels.publishShopier === true
    || targets.includes('shopier')
    || shopierStatus !== 'not_synced'
    || Boolean(sourceMeta.shopierProductId || sourceMeta.shopierProductUrl || sourceMeta.shopierLastSyncAt)
  const publishing = publishStatus !== 'not_requested'
    || targets.length > 0
    || channels.publishWebsite === true
    || channels.publishInstagram === true
    || channels.publishFacebook === true
    || channels.publishX === true
  const dispatch = (dispatched?.length ?? 0) > 0
    || Boolean(sourceMeta.lastDispatchedAt)
    || sourceMeta.forceRedispatch === true
    || sourceMeta.previewDispatch === true
    || Boolean(sourceMeta.storyQueuedAt || sourceMeta.storyPublishedAt)
    || storyStatus !== 'none'
  return { shopier, publishing, dispatch }
}

function attemptHasCanonicalSlots(attempt: ImageGenerationAttemptMetadata): boolean {
  const expected = attempt.attemptKind === 'quality_retry'
    ? attempt.requestedSlotIds
    : [...GENERATED_SLOT_KEYS]
  if (
    attempt.requestedSlotIds.length !== expected.length
    || attempt.slots.length !== expected.length
    || attempt.requestedSlotIds.some((slotId, index) => slotId !== expected[index])
  ) return false
  return attempt.slots.every((slot, index) => {
    const slotId = expected[index]
    const canonical = getSlotByKey(slotId)
    return Boolean(canonical)
      && slot.slotId === slotId
      && slot.displayOrder === canonical?.displayOrder
      && slot.purposeIdentifier === canonical?.purposeIdentifier
      && slot.operatorLabel === canonical?.operatorLabel
  })
}

const ATTEMPT_ID_PATTERN = /^iga_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ATTEMPT_STATUSES = new Set(['running', 'completed', 'partial', 'failed'])
const SLOT_TERMINAL_FAILURES = new Set(['provider_failed', 'media_save_failed', 'skipped'])

function derivedAttemptStatus(attempt: ImageGenerationAttemptMetadata): string {
  if (attempt.slots.some((slot) => slot.status === 'pending' || slot.status === 'generating' || slot.status === 'generated')) {
    return 'running'
  }
  const persistedCount = attempt.slots.filter((slot) => slot.status === 'persisted').length
  const failedCount = attempt.slots.filter((slot) => SLOT_TERMINAL_FAILURES.has(slot.status)).length
  if (persistedCount === attempt.slots.length) return 'completed'
  if (persistedCount > 0 && failedCount > 0) return 'partial'
  return 'failed'
}

function hasStrictV01ProfileEvidence(attempt: ImageGenerationAttemptMetadata): boolean {
  const versions = attempt.profileContractVersions
  const summary = attempt.qualityGateSummary
  const identityHash = typeof attempt.identityAnchorHash === 'string' && /^[a-f0-9]{64}$/i.test(attempt.identityAnchorHash)
  const versionsValid = versions?.profile === VISUAL_LOCK_V01_PROFILE_VERSION
    && versions.identityAnchor === PRODUCT_IDENTITY_ANCHOR_V0_VERSION
    && versions.framing === VISUAL_FRAMING_LOCK_V0_VERSION
    && (versions.familyLock === null || versions.familyLock === LOAFER_IDENTITY_LOCK_V0_VERSION)
    && versions.componentTopology === COMPONENT_TOPOLOGY_LOCK_V01_VERSION
    && versions.evaluator === VISUAL_QUALITY_EVALUATOR_V01_VERSION
    && versions.geometryGate === VISUAL_GEOMETRY_GATE_V01_VERSION
    && versions.framingCorrection === VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION
    && versions.materialFidelity === VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION
  if (!identityHash || !versionsValid) return false
  if (summary === undefined) return attempt.attemptKind === 'quality_retry' || attempt.status !== 'completed'
  const triState = (value: unknown): value is 'pass' | 'fail' | 'unknown' =>
    value === 'pass' || value === 'fail' || value === 'unknown'
  const stringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  const finiteOrNull = (value: unknown): boolean => value === null || (typeof value === 'number' && Number.isFinite(value))
  const combine = (states: readonly ('pass' | 'fail' | 'unknown')[]): 'pass' | 'fail' | 'unknown' =>
    states.includes('fail') ? 'fail' : states.includes('unknown') ? 'unknown' : 'pass'
  if (
    !isRecord(summary)
    || summary.profile !== VISUAL_LOCK_V01_PROFILE_VERSION
    || (summary.family !== 'loafer' && summary.family !== 'generic')
    || summary.identityAnchorHash !== attempt.identityAnchorHash
    || summary.topologyContractVersion !== COMPONENT_TOPOLOGY_LOCK_V01_VERSION
    || summary.evaluatorContractVersion !== VISUAL_QUALITY_EVALUATOR_V01_VERSION
    || summary.geometryGateVersion !== VISUAL_GEOMETRY_GATE_V01_VERSION
    || summary.framingCorrectionContractVersion !== VISUAL_LOCK_V01_FRAMING_CORRECTION_VERSION
    || summary.studioContractVersion !== VISUAL_LOCK_V01_STUDIO_CONTRACT_VERSION
    || summary.materialContractVersion !== VISUAL_LOCK_V01_MATERIAL_CONTRACT_VERSION
    || !Array.isArray(summary.slotResults)
    || summary.slotResults.length !== GENERATED_SLOT_KEYS.length
    || !isRecord(summary.packResults)
  ) return false
  const slotResults = summary.slotResults
  if (slotResults.some((value, index) => {
    if (!isRecord(value) || value.slot !== GENERATED_SLOT_KEYS[index]) return true
    const framing = isRecord(value.framingCorrectionResult) ? value.framingCorrectionResult : null
    const orientation = isRecord(value.orientationResult) ? value.orientationResult : null
    const topology = isRecord(value.topologyResult) ? value.topologyResult : null
    const studio = isRecord(value.studioResult) ? value.studioResult : null
    const material = isRecord(value.materialResult) ? value.materialResult : null
    return !framing
      || !orientation
      || !topology
      || !studio
      || !material
      || !triState(framing.status)
      || typeof framing.outcome !== 'string'
      || !stringArray(framing.reasonCodes)
      || !triState(value.evaluatorStatus)
      || !stringArray(value.evaluatorReasonCodes)
      || !triState(orientation.status)
      || typeof orientation.detectedView !== 'string'
      || !triState(topology.status)
      || !stringArray(topology.reasonCodes)
      || !triState(studio.status)
      || !triState(material.status)
      || !stringArray(material.reasonCodes)
      || !finiteOrNull(value.occupancyPercent)
      || !finiteOrNull(value.horizontalCenterOffsetPercent)
      || !finiteOrNull(value.verticalCenterOffsetPercent)
      || !finiteOrNull(value.maximumCenterOffsetPercent)
      || !triState(value.clippingState)
      || !triState(value.geometryStatus)
      || !stringArray(value.geometryReasonCodes)
  })) return false
  const pack = summary.packResults
  const gateFields = [
    'requiredEvaluatorCompleteness',
    'orientationGateStatus',
    'topologyGateStatus',
    'studioGateStatus',
    'materialGateStatus',
    'framingCorrectionGateStatus',
    'geometryGateStatus',
    'qualityGateStatus',
  ] as const
  if (
    gateFields.some((field) => !triState(pack[field]))
    || !finiteOrNull(pack.occupancyMinimumPercent)
    || !finiteOrNull(pack.occupancyMaximumPercent)
    || !finiteOrNull(pack.occupancySpreadPercent)
    || !stringArray(pack.reasonCodes)
  ) return false
  const expectedEvaluatorCompleteness = slotResults.every((value) =>
    isRecord(value) && (value.evaluatorStatus === 'pass' || value.evaluatorStatus === 'fail'),
  ) ? 'pass' : 'unknown'
  const expectedOrientation = combine(slotResults.map((value) => (value as RecordValue).orientationResult as RecordValue).map((value) => value.status as 'pass' | 'fail' | 'unknown'))
  const expectedTopology = combine(slotResults.map((value) => (value as RecordValue).topologyResult as RecordValue).map((value) => value.status as 'pass' | 'fail' | 'unknown'))
  const expectedStudio = combine(slotResults.map((value) => (value as RecordValue).studioResult as RecordValue).map((value) => value.status as 'pass' | 'fail' | 'unknown'))
  const expectedMaterial = combine(slotResults.map((value) => (value as RecordValue).materialResult as RecordValue).map((value) => value.status as 'pass' | 'fail' | 'unknown'))
  const expectedFraming = combine(slotResults.map((value) => (value as RecordValue).framingCorrectionResult as RecordValue).map((value) => value.status as 'pass' | 'fail' | 'unknown'))
  if (
    pack.requiredEvaluatorCompleteness !== expectedEvaluatorCompleteness
    || pack.orientationGateStatus !== expectedOrientation
    || pack.topologyGateStatus !== expectedTopology
    || pack.studioGateStatus !== expectedStudio
    || pack.materialGateStatus !== expectedMaterial
    || pack.framingCorrectionGateStatus !== expectedFraming
  ) return false
  const expectedQuality = combine(gateFields.slice(0, -1).map((field) => pack[field] as 'pass' | 'fail' | 'unknown'))
  if (pack.qualityGateStatus !== expectedQuality) return false
  if (pack.qualityGateStatus !== 'pass' && attempt.status === 'completed') return false
  if (
    pack.qualityGateStatus === 'pass'
    && attempt.status === 'failed'
    && !attempt.slots.some((slot) => slot.status === 'media_save_failed')
  ) return false
  return true
}

function supportedAttemptProfile(attempt: ImageGenerationAttemptMetadata): string | null {
  if (attempt.qualityProfile === undefined) return 'semantic-v1'
  if (attempt.qualityProfile === 'visual-lock/v0') return 'visual-lock/v0'
  if (attempt.qualityProfile === VISUAL_LOCK_V01_PROFILE_VERSION) return VISUAL_LOCK_V01_PROFILE_VERSION
  return null
}

function attemptCoreIsStrict(attempt: ImageGenerationAttemptMetadata, jobId: string): boolean {
  return attempt.contractVersion === IMAGE_SLOT_CONTRACT_VERSION
    && ATTEMPT_ID_PATTERN.test(attempt.attemptId)
    && attempt.jobId === jobId
    && ATTEMPT_STATUSES.has(attempt.status)
    && dateIsValid(attempt.startedAt)
    && (attempt.status === 'running' ? attempt.completedAt === undefined : dateIsValid(attempt.completedAt))
    && (!dateIsValid(attempt.completedAt) || Date.parse(attempt.completedAt as string) >= Date.parse(attempt.startedAt))
    && attemptHasCanonicalSlots(attempt)
    && attempt.slots.every((slot) =>
      ['pending', 'generating', 'generated', 'provider_failed', 'media_save_failed', 'persisted', 'skipped'].includes(slot.status)
      && Array.isArray(slot.warnings)
      && slot.warnings.every((warning) => typeof warning === 'string')
      && (
        slot.status === 'persisted'
          ? relationshipId(slot.mediaId) !== null
          : (slot.mediaId === undefined || slot.mediaId === null)
            && (slot.mediaUrl === undefined || slot.mediaUrl === null)
      ),
    )
    && derivedAttemptStatus(attempt) === attempt.status
}

function payloadJobInputIds(receipt: RecordValue): string[] | null {
  const ids: string[] = []
  const addInput = (value: unknown): boolean => {
    if (value === undefined || value === null) return true
    if (!isRecord(value)) return false
    if (value.jobId !== undefined) {
      const id = relationshipId(value.jobId)
      if (id === null) return false
      ids.push(String(id))
    }
    return true
  }
  if (!addInput(receipt.input)) return null
  if (receipt.log !== undefined) {
    if (!Array.isArray(receipt.log)) return null
    for (const entry of receipt.log) {
      if (!isRecord(entry) || !addInput(entry.input)) return null
    }
  }
  return [...new Set(ids)]
}

export async function verifyVisualPilotTarget(
  productReference: string,
  dependencies: VisualPilotTargetVerifierDependencies,
): Promise<VisualPilotTargetReport> {
  const report = emptyReport(productReference)
  const reasons: VisualPilotTargetReason[] = []
  let candidates: unknown[]
  try {
    candidates = await dependencies.gateway.findProductCandidates(productReference)
  } catch {
    reasons.push({ code: 'PRODUCT_LOOKUP_UNSUPPORTED', kind: 'unsupported' })
    return finishReport(report, reasons)
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    reasons.push({ code: 'PRODUCT_NOT_FOUND', kind: 'blocked' })
    return finishReport(report, reasons)
  }
  if (candidates.length !== 1 || !isRecord(candidates[0])) {
    reasons.push({ code: candidates.length > 1 ? 'PRODUCT_REFERENCE_DUPLICATED' : 'PRODUCT_RECORD_MALFORMED', kind: 'blocked' })
    return finishReport(report, reasons)
  }
  const product = candidates[0]
  const productId = canonicalProductId(product.id)
  if (productId === null) {
    reasons.push({ code: 'PRODUCT_IDENTITY_AMBIGUOUS', kind: 'blocked' })
    return finishReport(report, reasons)
  }

  const resolvedStockNumber = safeStockNumber(product.stockNumber)
  const exactReferenceMatches = /^\d+$/.test(productReference)
    ? String(productId) === String(Number(productReference))
      || resolvedStockNumber === `SN${productReference.padStart(4, '0')}`
    : resolvedStockNumber === productReference.toUpperCase()
  if (!exactReferenceMatches) {
    reasons.push({ code: 'PRODUCT_REFERENCE_MISMATCH', kind: 'blocked' })
  }

  const workflow = isRecord(product.workflow) ? product.workflow : null
  const imageQuality = isRecord(product.imageQuality) ? product.imageQuality : null
  const title = safeTitle(product.title)
  const lifecycle = safeEnum(product.status, ['draft', 'active', 'soldout'])
  const workflowStatus = safeEnum(workflow?.workflowStatus, [
    'draft', 'visual_pending', 'visual_ready', 'confirmation_pending', 'confirmed', 'content_pending', 'content_ready',
    'audit_pending', 'publish_ready', 'active', 'soldout', 'archived',
  ])
  const visualStatus = safeEnum(workflow?.visualStatus, ['pending', 'generating', 'preview', 'approved', 'rejected'])
  const confirmationStatus = safeEnum(workflow?.confirmationStatus, ['pending', 'confirmed', 'blocked'])
  const reviewStatus = safeEnum(imageQuality?.status, ['pending', 'pass', 'review', 'fail'])
  const galleryIds = relationArray(product.generativeGallery, 'image')
  const sellable = typeof workflow?.sellable === 'boolean' ? workflow.sellable : null
  report.product = {
    id: productId,
    title,
    stockNumber: resolvedStockNumber,
    lifecycle,
    workflowStatus,
    active: lifecycle === 'unknown' || workflowStatus === 'unknown'
      ? null
      : lifecycle !== 'draft' || workflowStatus === 'active' || workflowStatus === 'soldout',
    sellable,
    reviewStatus,
    confirmationStatus,
    visualStatus,
    protectedBrand: typeof product.brandSensitive === 'boolean' ? product.brandSensitive : null,
    galleryRelationshipCount: galleryIds?.length ?? null,
  }
  if (
    title === null
    || resolvedStockNumber === null
  ) {
    reasons.push({ code: 'PRODUCT_IDENTITY_AMBIGUOUS', kind: 'blocked' })
  }
  if (
    lifecycle === 'unknown'
    || workflowStatus === 'unknown'
    || sellable === null
    || !workflow
    || galleryIds === null
    || visualStatus === 'unknown'
    || confirmationStatus === 'unknown'
    || reviewStatus === 'unknown'
  ) {
    reasons.push({ code: 'PRODUCT_LIFECYCLE_AMBIGUOUS', kind: 'blocked' })
  }
  if (lifecycle !== 'draft' || sellable === true) reasons.push({ code: 'PRODUCT_NOT_ISOLATED', kind: 'blocked' })
  if (['active', 'soldout', 'archived', 'publish_ready'].includes(workflowStatus)) reasons.push({ code: 'PRODUCT_NOT_ISOLATED', kind: 'blocked' })
  if (visualStatus === 'generating' || visualStatus === 'preview') reasons.push({ code: 'PRODUCT_VISUAL_STATE_ACTIVE', kind: 'blocked' })
  if (visualStatus === 'approved' && (galleryIds?.length ?? 0) === 0) reasons.push({ code: 'PRODUCT_VISUAL_STATE_CONTRADICTORY', kind: 'blocked' })
  if (confirmationStatus === 'blocked') reasons.push({ code: 'PRODUCT_CONFIRMATION_BLOCKED', kind: 'blocked' })
  if ((galleryIds?.length ?? 0) > 0) reasons.push({ code: 'PRODUCT_GENERATED_GALLERY_NOT_EMPTY', kind: 'blocked' })
  report.productIsolationState = reasons.some((reason) => reason.code.startsWith('PRODUCT_')) ? 'fail' : 'pass'

  const productExposure = exposureFromProduct(product)
  report.downstreamExposure.shopier = productExposure.shopier === null ? 'unknown' : productExposure.shopier ? 'exposed' : 'clear'
  report.downstreamExposure.publishing = productExposure.publishing === null ? 'unknown' : productExposure.publishing ? 'exposed' : 'clear'
  report.downstreamExposure.dispatch = productExposure.dispatch === null ? 'unknown' : productExposure.dispatch ? 'exposed' : 'clear'
  if (productExposure.shopier === null || productExposure.publishing === null || productExposure.dispatch === null) {
    reasons.push({ code: 'DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS', kind: 'blocked' })
  }
  if (productExposure.shopier) reasons.push({ code: 'DOWNSTREAM_SHOPIER_EXPOSURE', kind: 'blocked' })
  if (productExposure.publishing) reasons.push({ code: 'DOWNSTREAM_PUBLISHING_TARGET', kind: 'blocked' })
  if (productExposure.dispatch) reasons.push({ code: 'DOWNSTREAM_DISPATCH_EXPOSURE', kind: 'blocked' })

  const originalIds = relationArray(product.images, 'image')
  const originalEvidence: VisualPilotOriginalEvidence[] = []
  const contentDigests = new Set<string>()
  let originalsDistinct: 'pass' | 'fail' | 'unknown' = 'pass'
  let originalsOrdered = true
  if (!originalIds || originalIds.length === 0) {
    reasons.push({ code: originalIds ? 'ORIGINAL_RELATIONSHIP_MISSING' : 'ORIGINAL_RELATIONSHIP_MALFORMED', kind: 'blocked' })
    originalsDistinct = 'fail'
    originalsOrdered = false
  } else {
    const relationshipIds = new Set<string>()
    for (let index = 0; index < originalIds.length; index += 1) {
      const id = originalIds[index]
      const ordinal = index + 1
      if (relationshipIds.has(String(id))) {
        reasons.push({ code: 'ORIGINAL_RELATIONSHIP_DUPLICATE', kind: 'blocked' })
        originalsDistinct = 'fail'
        originalEvidence.push({
          ordinal,
          state: 'blocked',
          sourceClassification: 'ambiguous',
          accessibility: 'blocked',
          width: null,
          height: null,
          mimeType: null,
        })
        continue
      }
      relationshipIds.add(String(id))
      let rawMedia: unknown | null
      try {
        rawMedia = await dependencies.gateway.findMediaById(id)
      } catch {
        reasons.push({ code: 'ORIGINAL_MEDIA_LOOKUP_UNSUPPORTED', kind: 'unsupported' })
        if (originalsDistinct === 'pass') originalsDistinct = 'unknown'
        rawMedia = null
      }
      if (!isRecord(rawMedia) || !sameId(rawMedia.id, id)) {
        reasons.push({ code: 'ORIGINAL_MEDIA_NOT_FOUND', kind: 'blocked' })
        if (originalsDistinct === 'pass') originalsDistinct = 'unknown'
        originalEvidence.push({
          ordinal,
          state: 'blocked',
          sourceClassification: 'ambiguous',
          accessibility: 'blocked',
          width: null,
          height: null,
          mimeType: null,
        })
        continue
      }
      const classifiedOriginal = rawMedia.type === 'original'
        && sameId(rawMedia.product, productId)
        && !hasGeneratedLineage(rawMedia)
      if (!classifiedOriginal) {
        reasons.push({ code: 'ORIGINAL_SOURCE_CLASSIFICATION_AMBIGUOUS', kind: 'blocked' })
        if (originalsDistinct === 'pass') originalsDistinct = 'unknown'
        originalEvidence.push({
          ordinal,
          state: 'blocked',
          sourceClassification: 'ambiguous',
          accessibility: 'blocked',
          width: null,
          height: null,
          mimeType: null,
        })
        continue
      }
      const mediaRead = await readVisualPilotMediaEvidence(rawMedia, dependencies.mediaRead)
      if (!mediaRead.ok) {
        reasons.push({ code: mediaRead.code, kind: 'blocked' })
        if (originalsDistinct === 'pass') originalsDistinct = 'unknown'
        originalEvidence.push({
          ordinal,
          state: 'blocked',
          sourceClassification: 'original',
          accessibility: 'blocked',
          width: null,
          height: null,
          mimeType: null,
        })
        continue
      }
      if (contentDigests.has(mediaRead.contentDigest)) {
        reasons.push({ code: 'ORIGINAL_CONTENT_DUPLICATE', kind: 'blocked' })
        originalsDistinct = 'fail'
        originalEvidence.push({
          ordinal,
          state: 'blocked',
          sourceClassification: 'original',
          accessibility: 'accessible_decodable',
          width: mediaRead.width,
          height: mediaRead.height,
          mimeType: mediaRead.mimeType,
        })
        continue
      }
      contentDigests.add(mediaRead.contentDigest)
      originalEvidence.push({
        ordinal,
        state: 'verified',
        sourceClassification: 'original',
        accessibility: 'accessible_decodable',
        width: mediaRead.width,
        height: mediaRead.height,
        mimeType: mediaRead.mimeType,
      })
    }
    originalsOrdered = originalEvidence.length === originalIds.length
      && originalEvidence.every((entry, index) => entry.ordinal === index + 1)
  }
  report.originals = {
    count: originalIds?.length ?? 0,
    evidence: originalEvidence,
    distinctState: originalsDistinct,
    orderedState: originalsOrdered ? 'pass' : 'fail',
    semanticSuitability: 'operator_review_required',
  }

  const jobPages = await collectAllPages({
    readPage: (page, limit) => dependencies.gateway.readImageJobPage(productId, page, limit),
    malformedCode: 'IMAGE_JOB_PAGINATION_INCONSISTENT',
    unsupportedCode: 'IMAGE_JOB_DISCOVERY_UNSUPPORTED',
    reasons,
  })
  report.jobs.paginationReconciled = jobPages.ok
  const jobs = jobPages.docs
  report.jobs.exhaustiveCount = jobs.length
  const allAttemptIds = new Set<string>()
  const jobIds = jobs.map((job) => relationshipId(job.id)).filter((id): id is string | number => id !== null)
  let lineagePass = jobPages.ok
  let activeAttemptState: VisualPilotTargetReport['attempts']['activeAttemptState'] = 'clear'
  let packPass = true
  const terminalStatuses = new Set(['approved', 'rejected', 'failed'])
  const activeStatuses = new Set(['queued', 'generating', 'preview', 'review'])
  const persistedMediaById = new Map<string, { jobId: string; attemptId: string; slotId: string }>()

  for (const job of jobs) {
    const jobId = relationshipId(job.id)
    if (jobId === null || !sameId(job.product, productId)) {
      reasons.push({ code: 'IMAGE_JOB_PRODUCT_ASSOCIATION_MISMATCH', kind: 'blocked' })
      lineagePass = false
      continue
    }
    const status = safeEnum(job.status, [...terminalStatuses, ...activeStatuses])
    report.jobs.byPreviewApprovalState[status] = (report.jobs.byPreviewApprovalState[status] ?? 0) + 1
    if (terminalStatuses.has(status)) report.jobs.terminalCount += 1
    else report.jobs.nonterminalCount += 1
    if (activeStatuses.has(status)) reasons.push({ code: `IMAGE_JOB_${status.toUpperCase()}_ACTIVE`, kind: 'blocked' })
    if (status === 'unknown') reasons.push({ code: 'IMAGE_JOB_STATUS_UNKNOWN', kind: 'blocked' })
    if (terminalStatuses.has(status) && !dateIsValid(job.generationCompletedAt)) {
      reasons.push({ code: 'IMAGE_JOB_TERMINAL_EVIDENCE_INCOMPLETE', kind: 'blocked' })
      lineagePass = false
    }

    const generatedIds = relationArray(job.generatedImages)
    if (generatedIds === null) {
      reasons.push({ code: 'IMAGE_JOB_MEDIA_RELATIONSHIP_MALFORMED', kind: 'blocked' })
      lineagePass = false
      continue
    }
    const imageCount = job.imageCount
    if (
      typeof imageCount !== 'number'
      || !Number.isSafeInteger(imageCount)
      || imageCount < 0
      || imageCount !== generatedIds.length
      || new Set(generatedIds.map(String)).size !== generatedIds.length
    ) {
      reasons.push({ code: 'IMAGE_JOB_MEDIA_COUNT_INCONSISTENT', kind: 'blocked' })
      lineagePass = false
    }
    const mediaBucket = generatedIds.length === 0 ? 'zero' : generatedIds.length === 5 ? 'complete' : generatedIds.length < 5 ? 'partial' : 'other'
    report.jobs.byMediaPersistence[mediaBucket] += 1
    if (status === 'failed' && generatedIds.length > 0) {
      reasons.push({ code: 'FAILED_JOB_MEDIA_PERSISTENCE_AMBIGUOUS', kind: 'blocked' })
      lineagePass = false
    }
    if ((status === 'preview' || status === 'review' || status === 'rejected' || status === 'approved') && generatedIds.length !== GENERATED_SLOT_KEYS.length) {
      reasons.push({ code: 'IMAGE_JOB_TERMINAL_MEDIA_STATE_INCONSISTENT', kind: 'blocked' })
      lineagePass = false
    }
    if (status === 'approved' && generatedIds.length !== GENERATED_SLOT_KEYS.length) {
      reasons.push({ code: 'PARTIAL_APPROVAL_STATE', kind: 'blocked' })
      packPass = false
    }

    if (job.generationAttempts != null && job.generationContractVersion !== IMAGE_SLOT_CONTRACT_VERSION) {
      reasons.push({ code: 'IMAGE_JOB_CONTRACT_UNSUPPORTED', kind: 'blocked' })
      lineagePass = false
    }

    if (Array.isArray(job.generationAttempts)) {
      const rawAttemptIds = new Set<string>()
      const slotOrdinals = new Set<string>()
      for (const rawAttempt of job.generationAttempts) {
        if (!isRecord(rawAttempt)) continue
        if (typeof rawAttempt.attemptId === 'string') {
          if (!ATTEMPT_ID_PATTERN.test(rawAttempt.attemptId)) {
            reasons.push({ code: 'ATTEMPT_ID_MALFORMED', kind: 'blocked' })
            lineagePass = false
          }
          if (rawAttemptIds.has(rawAttempt.attemptId)) {
            reasons.push({ code: 'ATTEMPT_ID_DUPLICATED', kind: 'blocked' })
            lineagePass = false
          }
          rawAttemptIds.add(rawAttempt.attemptId)
        }
        if (rawAttempt.attemptOrdinal !== undefined && rawAttempt.attemptOrdinal !== 1 && rawAttempt.attemptOrdinal !== 2) {
          reasons.push({ code: 'ATTEMPT_ORDINAL_UNSUPPORTED', kind: 'blocked' })
          lineagePass = false
        }
        if ((rawAttempt.attemptOrdinal === 1 || rawAttempt.attemptOrdinal === 2) && Array.isArray(rawAttempt.requestedSlotIds)) {
          for (const rawSlotId of rawAttempt.requestedSlotIds) {
            if (typeof rawSlotId !== 'string') continue
            const key = `${rawSlotId}:${rawAttempt.attemptOrdinal}`
            if (slotOrdinals.has(key)) {
              reasons.push({ code: 'ATTEMPT_SLOT_ORDINAL_DUPLICATED', kind: 'blocked' })
              lineagePass = false
            }
            slotOrdinals.add(key)
          }
        }
      }
    }
    const parsed = parseGenerationAttemptHistory(job.generationAttempts)
    if (!parsed.ok || parsed.attempts.length === 0) {
      reasons.push({
        code: job.generationAttempts == null ? 'LEGACY_ATTEMPT_EVIDENCE_UNSUPPORTED' : 'ATTEMPT_METADATA_MALFORMED',
        kind: job.generationAttempts == null ? 'unsupported' : 'blocked',
      })
      lineagePass = false
      packPass = false
      activeAttemptState = activeAttemptState === 'blocked' ? 'blocked' : 'unknown'
      continue
    }
    report.attempts.count += parsed.attempts.length
    const profileKeys = parsed.attempts.map(supportedAttemptProfile)
    const profileKey = profileKeys[0] ?? 'unknown'
    report.jobs.byContractProfile[profileKey] = (report.jobs.byContractProfile[profileKey] ?? 0) + 1
    if (
      profileKeys.some((profile) => profile === null || profile !== profileKeys[0])
      || (profileKey === VISUAL_LOCK_V01_PROFILE_VERSION && parsed.attempts.some((attempt) => attempt.qualityProfile !== VISUAL_LOCK_V01_PROFILE_VERSION))
      || (profileKey !== VISUAL_LOCK_V01_PROFILE_VERSION && parsed.attempts.length > 1)
    ) {
      reasons.push({ code: 'ATTEMPT_PROFILE_UNSUPPORTED_OR_MIXED', kind: 'blocked' })
      lineagePass = false
    }
    for (const attempt of parsed.attempts) {
      if (allAttemptIds.has(attempt.attemptId)) {
        reasons.push({ code: 'ATTEMPT_ID_DUPLICATED', kind: 'blocked' })
        lineagePass = false
      }
      allAttemptIds.add(attempt.attemptId)
      if (!attemptCoreIsStrict(attempt, String(jobId))) {
        reasons.push({ code: 'ATTEMPT_TERMINAL_OUTCOME_INCONSISTENT', kind: 'blocked' })
        lineagePass = false
      }
      if (
        attempt.qualityProfile === VISUAL_LOCK_V01_PROFILE_VERSION
        && (
          (attempt.attemptKind !== 'initial' && attempt.attemptKind !== 'quality_retry')
          || (attempt.attemptOrdinal !== 1 && attempt.attemptOrdinal !== 2)
          || attempt.retryPolicyVersion !== 'visual-quality-retry-policy/v1'
          || !hasStrictV01ProfileEvidence(attempt)
        )
      ) {
        reasons.push({ code: 'V01_ATTEMPT_CONTRACT_INCOMPLETE', kind: 'blocked' })
        lineagePass = false
      }
      if (
        attempt.qualityProfile !== VISUAL_LOCK_V01_PROFILE_VERSION
        && (
          attempt.attemptKind !== undefined
          || attempt.attemptOrdinal !== undefined
          || attempt.parentAttemptId !== undefined
          || attempt.retryPolicyVersion !== undefined
          || attempt.packSelection !== undefined
          || attempt.slots.some((slot) => slot.qualityRetry !== undefined)
        )
      ) {
        reasons.push({ code: 'NON_V01_RETRY_METADATA_UNSUPPORTED', kind: 'blocked' })
        lineagePass = false
      }
      if (attempt.jobId !== String(jobId) || !attemptHasCanonicalSlots(attempt)) {
        reasons.push({ code: 'ATTEMPT_LINEAGE_ASSOCIATION_INVALID', kind: 'blocked' })
        lineagePass = false
      }
      if (terminalStatuses.has(status) && (attempt.status === 'running' || !dateIsValid(attempt.completedAt))) {
        reasons.push({ code: 'ATTEMPT_TERMINAL_STATE_INCOMPLETE', kind: 'blocked' })
        lineagePass = false
      }
      if (
        terminalStatuses.has(status)
        && dateIsValid(job.generationCompletedAt)
        && dateIsValid(attempt.completedAt)
        && Date.parse(String(job.generationCompletedAt)) < Date.parse(String(attempt.completedAt))
      ) {
        reasons.push({ code: 'JOB_ATTEMPT_TIME_INCONSISTENT', kind: 'blocked' })
        lineagePass = false
      }
      for (const slot of attempt.slots) {
        if (slot.status === 'persisted' && slot.mediaId !== undefined && slot.mediaId !== null) {
          const key = String(slot.mediaId)
          if (persistedMediaById.has(key)) {
            reasons.push({ code: 'DUPLICATE_SEMANTIC_SLOT_MEDIA', kind: 'blocked' })
            lineagePass = false
          }
          persistedMediaById.set(key, { jobId: String(jobId), attemptId: attempt.attemptId, slotId: slot.slotId })
        }
      }
    }

    const rawActiveAttemptId = job.activeAttemptId
    const activeAttemptId = typeof rawActiveAttemptId === 'string' && rawActiveAttemptId.trim()
      ? rawActiveAttemptId.trim()
      : null
    if (
      rawActiveAttemptId !== undefined
      && rawActiveAttemptId !== null
      && rawActiveAttemptId !== ''
      && (activeAttemptId === null || !ATTEMPT_ID_PATTERN.test(activeAttemptId))
    ) {
      reasons.push({ code: 'ACTIVE_ATTEMPT_ID_MALFORMED', kind: 'blocked' })
      activeAttemptState = 'blocked'
      lineagePass = false
    }
    if (activeAttemptId) {
      const activeAttempt = parsed.attempts.find((attempt) => attempt.attemptId === activeAttemptId)
      if (!activeAttempt || activeAttempt.status === 'running' || !dateIsValid(activeAttempt.completedAt)) {
        reasons.push({ code: 'ACTIVE_ATTEMPT_UNRESOLVED', kind: 'blocked' })
        activeAttemptState = 'blocked'
        lineagePass = false
      } else if (activeAttemptState !== 'blocked') {
        activeAttemptState = 'terminal_reconciled'
      }
    }

    const generatedSet = new Set(generatedIds.map(String))
    const persistedForJob = [...persistedMediaById.entries()].filter(([, value]) => value.jobId === String(jobId))
    if (
      persistedForJob.some(([mediaId]) => !generatedSet.has(mediaId))
      || generatedIds.some((mediaId) => !persistedForJob.some(([persistedId]) => persistedId === String(mediaId)))
    ) {
      reasons.push({ code: 'JOB_MEDIA_ATTEMPT_LINEAGE_MISMATCH', kind: 'blocked' })
      lineagePass = false
    }
    for (const mediaId of generatedIds) {
      const expected = persistedMediaById.get(String(mediaId))
      let media: unknown | null
      try {
        media = await dependencies.gateway.findMediaById(mediaId)
      } catch {
        reasons.push({ code: 'GENERATED_MEDIA_LOOKUP_UNSUPPORTED', kind: 'unsupported' })
        media = null
      }
      const lineage = isRecord(media) && isRecord(media.generationLineage) ? media.generationLineage : null
      if (
        !expected
        || !isRecord(media)
        || !sameId(media.id, mediaId)
        || media.type !== 'generated'
        || !sameId(media.product, productId)
        || !lineage
        || lineage.contractVersion !== IMAGE_SLOT_CONTRACT_VERSION
        || String(lineage.jobId ?? '') !== expected.jobId
        || lineage.attemptId !== expected.attemptId
        || lineage.slotId !== expected.slotId
      ) {
        reasons.push({ code: 'GENERATED_MEDIA_LINEAGE_INVALID', kind: 'blocked' })
        lineagePass = false
      }
    }

    if (status === 'approved' || status === 'preview' || status === 'review') {
      const resolution = resolveApprovalCandidates({
        generationAttempts: parsed.attempts,
        activeAttemptId: job.activeAttemptId,
        legacyMediaIds: generatedIds,
        promptsUsed: job.promptsUsed,
      })
      if (!resolution.ok || resolution.candidates.length !== GENERATED_SLOT_KEYS.length) {
        reasons.push({ code: 'APPROVAL_MANIFEST_INCOMPLETE', kind: 'blocked' })
        packPass = false
      }
      const retryAwareRoot = parsed.attempts.find((attempt) => attempt.attemptKind === 'initial' && attempt.retryPolicyVersion)
      if (retryAwareRoot && retryAwareRoot.packSelection?.version !== IMAGE_GENERATION_PACK_SELECTION_VERSION) {
        reasons.push({ code: 'PACK_SELECTION_INVALID', kind: 'blocked' })
        packPass = false
      }
    }

    if (status === 'approved' && galleryIds) {
      const gallerySet = new Set(galleryIds.map(String))
      if (generatedIds.some((mediaId) => !gallerySet.has(String(mediaId)))) {
        reasons.push({ code: 'APPROVED_GALLERY_ATTACHMENT_INCOMPLETE', kind: 'blocked' })
      }
    }
    if (status !== 'approved' && galleryIds) {
      const generatedSetForJob = new Set(generatedIds.map(String))
      if (galleryIds.some((mediaId) => generatedSetForJob.has(String(mediaId)))) {
        reasons.push({ code: 'UNAPPROVED_MEDIA_ATTACHED', kind: 'blocked' })
      }
    }
  }
  report.attempts.lineageIntegrityState = lineagePass ? 'pass' : 'fail'
  report.attempts.activeAttemptState = activeAttemptState
  report.packApprovalManifestState = packPass ? 'complete_or_not_applicable' : 'blocked'

  const queuePages = await collectAllPages({
    readPage: (page, limit) => dependencies.gateway.readPayloadJobPage(jobIds, page, limit),
    malformedCode: 'QUEUE_RECEIPT_PAGINATION_INCONSISTENT',
    unsupportedCode: 'QUEUE_RECEIPT_DISCOVERY_UNSUPPORTED',
    reasons,
  })
  report.queueReceipts.count = queuePages.docs.length
  report.queueReceipts.paginationReconciled = queuePages.ok
  let queueClear = queuePages.ok
  const receiptJobIds = new Set<string>()
  const receiptCountByJobId = new Map<string, number>()
  for (const receipt of queuePages.docs) {
    if (receipt.taskSlug !== 'image-gen') {
      reasons.push({ code: 'QUEUE_RECEIPT_TASK_MISMATCH', kind: 'blocked' })
      queueClear = false
      continue
    }
    const correlated = payloadJobInputIds(receipt)
    if (!correlated || correlated.length !== 1 || !jobIds.some((jobId) => String(jobId) === correlated[0])) {
      reasons.push({ code: 'QUEUE_RECEIPT_CORRELATION_AMBIGUOUS', kind: 'blocked' })
      queueClear = false
      continue
    }
    const receiptCount = (receiptCountByJobId.get(correlated[0]) ?? 0) + 1
    receiptCountByJobId.set(correlated[0], receiptCount)
    if (receiptCount > 1) {
      reasons.push({ code: 'QUEUE_RECEIPT_DUPLICATED', kind: 'blocked' })
      queueClear = false
    }
    receiptJobIds.add(correlated[0])
    if (
      typeof receipt.processing !== 'boolean'
      || typeof receipt.hasError !== 'boolean'
      || (receipt.completedAt !== undefined && receipt.completedAt !== null && !dateIsValid(receipt.completedAt))
      || (receipt.waitUntil !== undefined && receipt.waitUntil !== null && !dateIsValid(receipt.waitUntil))
    ) {
      reasons.push({ code: 'QUEUE_RECEIPT_STATE_AMBIGUOUS', kind: 'blocked' })
      queueClear = false
      continue
    }
    const processing = receipt.processing === true
    const complete = dateIsValid(receipt.completedAt) || receipt.hasError === true
    if (processing || !complete || (dateIsValid(receipt.waitUntil) && Date.parse(String(receipt.waitUntil)) > Date.now())) {
      reasons.push({ code: 'QUEUE_RECEIPT_NONTERMINAL', kind: 'blocked' })
      queueClear = false
    }
  }
  for (const jobId of jobIds) {
    if (!receiptJobIds.has(String(jobId))) {
      reasons.push({ code: 'QUEUE_RECEIPT_MISSING', kind: 'unsupported' })
      queueClear = false
    }
  }
  report.queueReceipts.state = queueClear ? 'clear' : queuePages.ok ? 'blocked' : 'unknown'

  const botPages = await collectAllPages({
    readPage: (page, limit) => dependencies.gateway.readBotEventPage(productId, page, limit),
    malformedCode: 'BOT_EVENT_PAGINATION_INCONSISTENT',
    unsupportedCode: 'BOT_EVENT_DISCOVERY_UNSUPPORTED',
    reasons,
  })
  if (botPages.ok) {
    for (const event of botPages.docs) {
      if (!sameId(event.product, productId)) {
        reasons.push({ code: 'DOWNSTREAM_BOT_EVENT_ASSOCIATION_MISMATCH', kind: 'blocked' })
        continue
      }
      const eventType = typeof event.eventType === 'string' ? event.eventType.toLowerCase() : ''
      const eventStatus = safeEnum(event.status, ['pending', 'processed', 'failed', 'ignored'])
      if (!eventType || eventStatus === 'unknown') {
        reasons.push({ code: 'BOT_EVENT_STATE_AMBIGUOUS', kind: 'blocked' })
        continue
      }
      const relevant = isDownstreamExposureEvent(eventType)
      if (relevant && (eventStatus === 'pending' || eventStatus === 'processed')) {
        reasons.push({ code: 'DOWNSTREAM_BOT_EVENT_EXPOSURE', kind: 'blocked' })
      }
    }
  }

  const storyPages = await collectAllPages({
    readPage: (page, limit) => dependencies.gateway.readStoryJobPage(productId, page, limit),
    malformedCode: 'STORY_JOB_PAGINATION_INCONSISTENT',
    unsupportedCode: 'STORY_JOB_DISCOVERY_UNSUPPORTED',
    reasons,
  })
  if (storyPages.ok) {
    for (const story of storyPages.docs) {
      if (!sameId(story.product, productId)) {
        reasons.push({ code: 'DOWNSTREAM_STORY_JOB_ASSOCIATION_MISMATCH', kind: 'blocked' })
      } else {
        reasons.push({ code: 'DOWNSTREAM_STORY_HISTORY_PRESENT', kind: 'blocked' })
      }
    }
  }

  if (!dependencies.gateway.readTelegramPreviewReceiptPage) {
    report.telegramPreviewState = 'unsupported'
    reasons.push({ code: 'TELEGRAM_PREVIEW_ABSENCE_UNSUPPORTED', kind: 'unsupported' })
  } else {
    const telegramPages = await collectAllPages({
      readPage: (page, limit) => dependencies.gateway.readTelegramPreviewReceiptPage!(productId, page, limit),
      malformedCode: 'TELEGRAM_PREVIEW_RECEIPT_PAGINATION_INCONSISTENT',
      unsupportedCode: 'TELEGRAM_PREVIEW_RECEIPT_DISCOVERY_UNSUPPORTED',
      reasons,
    })
    let telegramClear = telegramPages.ok
    for (const receipt of telegramPages.docs) {
      const state = safeEnum(receipt.state, ['pending', 'active', 'preview', 'awaiting_approval', 'consumed', 'revoked', 'expired'])
      if (!sameId(receipt.product, productId) || state === 'unknown') {
        reasons.push({ code: 'TELEGRAM_PREVIEW_RECEIPT_AMBIGUOUS', kind: 'blocked' })
        telegramClear = false
      } else if (['pending', 'active', 'preview', 'awaiting_approval'].includes(state)) {
        reasons.push({ code: 'TELEGRAM_PREVIEW_PENDING_OR_UNRECONCILED', kind: 'blocked' })
        telegramClear = false
      }
    }
    report.telegramPreviewState = telegramClear ? 'clear' : 'blocked'
  }

  if (!dependencies.gateway.readAdvertisingHistoryPage) {
    report.downstreamExposure.advertising = 'unsupported'
    reasons.push({ code: 'ADVERTISING_HISTORY_ABSENCE_UNSUPPORTED', kind: 'unsupported' })
  } else {
    const advertisingPages = await collectAllPages({
      readPage: (page, limit) => dependencies.gateway.readAdvertisingHistoryPage!(productId, page, limit),
      malformedCode: 'ADVERTISING_HISTORY_PAGINATION_INCONSISTENT',
      unsupportedCode: 'ADVERTISING_HISTORY_DISCOVERY_UNSUPPORTED',
      reasons,
    })
    let advertisingClear = advertisingPages.ok
    for (const record of advertisingPages.docs) {
      if (!sameId(record.product, productId)) {
        reasons.push({ code: 'DOWNSTREAM_ADVERTISING_HISTORY_ASSOCIATION_MISMATCH', kind: 'blocked' })
      } else {
        reasons.push({ code: 'DOWNSTREAM_ADVERTISING_HISTORY_PRESENT', kind: 'blocked' })
      }
      advertisingClear = false
    }
    report.downstreamExposure.advertising = advertisingClear ? 'clear' : advertisingPages.ok ? 'exposed' : 'unsupported'
  }

  let finalCandidates: unknown[] | null = null
  try {
    finalCandidates = await dependencies.gateway.findProductCandidates(productReference)
  } catch {
    reasons.push({ code: 'PRODUCT_RECONCILIATION_UNSUPPORTED', kind: 'unsupported' })
  }
  if (
    finalCandidates
    && (
      finalCandidates.length !== 1
      || !isRecord(finalCandidates[0])
      || JSON.stringify(productReadSnapshot(finalCandidates[0])) !== JSON.stringify(productReadSnapshot(product))
    )
  ) {
    reasons.push({ code: 'TARGET_STATE_CHANGED_DURING_READ', kind: 'blocked' })
  }
  const finalJobPages = await collectAllPages({
    readPage: (page, limit) => dependencies.gateway.readImageJobPage(productId, page, limit),
    malformedCode: 'IMAGE_JOB_RECONCILIATION_INCONSISTENT',
    unsupportedCode: 'IMAGE_JOB_RECONCILIATION_UNSUPPORTED',
    reasons,
  })
  if (!finalJobPages.ok) report.jobs.paginationReconciled = false
  if (
    finalJobPages.ok
    && JSON.stringify(jobReadSnapshot(finalJobPages.docs)) !== JSON.stringify(jobReadSnapshot(jobs))
  ) {
    reasons.push({ code: 'TARGET_STATE_CHANGED_DURING_READ', kind: 'blocked' })
  }
  const downstreamBlocked = reasons.some((reason) => reason.code.startsWith('DOWNSTREAM_'))
  const downstreamUnsupported = reasons.some((reason) =>
    reason.code === 'ADVERTISING_HISTORY_ABSENCE_UNSUPPORTED'
    || reason.code === 'ADVERTISING_HISTORY_DISCOVERY_UNSUPPORTED'
    || reason.code === 'BOT_EVENT_DISCOVERY_UNSUPPORTED'
    || reason.code === 'STORY_JOB_DISCOVERY_UNSUPPORTED',
  )
  report.downstreamExposure.state = downstreamUnsupported ? 'unsupported' : downstreamBlocked ? 'blocked' : 'clear'
  return finishReport(report, reasons)
}

export function formatVisualPilotTargetSummary(report: VisualPilotTargetReport): string {
  return [
    'Visual Pilot Target Verifier',
    `  contract: ${report.verifierContractVersion}`,
    `  product: ${String(report.product.id ?? report.productReference)}${report.product.stockNumber ? ` / ${report.product.stockNumber}` : ''}`,
    `  isolation: ${report.productIsolationState}`,
    `  originals: ${report.originals.count} (distinct=${report.originals.distinctState}, ordered=${report.originals.orderedState})`,
    `  jobs: ${report.jobs.exhaustiveCount} (terminal=${report.jobs.terminalCount}, nonterminal=${report.jobs.nonterminalCount}, paginated=${report.jobs.paginationReconciled})`,
    `  job states: ${Object.entries(report.jobs.byPreviewApprovalState).map(([state, count]) => `${state}=${count}`).join(', ') || 'none'}`,
    `  attempts: ${report.attempts.count} (lineage=${report.attempts.lineageIntegrityState}, active=${report.attempts.activeAttemptState})`,
    `  Telegram preview evidence: ${report.telegramPreviewState}`,
    `  downstream: ${report.downstreamExposure.state}`,
    `  reasons: ${report.blockingReasons.length === 0 ? 'none' : report.blockingReasons.map((reason) => reason.code).join(', ')}`,
    `  verdict: ${report.finalVerdict}`,
  ].join('\n')
}
