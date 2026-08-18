import assert from 'node:assert/strict'

import { getSlotByKey, GENERATED_SLOT_KEYS, IMAGE_SLOT_CONTRACT_VERSION } from './imageSlotContract'
import {
  executeVisualPilotTargetCommand,
  formatVisualPilotTargetSummary,
  parseVisualPilotTargetArgs,
  verifyVisualPilotTarget,
  type VisualPilotPage,
  type VisualPilotTargetReadGateway,
} from './visualPilotTargetVerifier'

let passed = 0

async function check(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

const startedAt = '2026-08-18T10:00:00.000Z'
const completedAt = '2026-08-18T10:01:00.000Z'

function product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 349,
    title: 'Safe pilot loafer',
    stockNumber: 'SN0117',
    status: 'draft',
    brandSensitive: false,
    images: [{ image: 1001 }, { image: 1002 }, { image: 1003 }],
    generativeGallery: [],
    imageQuality: { status: 'pending' },
    channels: {
      publishWebsite: false,
      publishInstagram: false,
      publishFacebook: false,
      publishX: false,
      publishShopier: false,
    },
    channelTargets: [],
    workflow: {
      workflowStatus: 'draft',
      visualStatus: 'rejected',
      confirmationStatus: 'pending',
      publishStatus: 'not_requested',
      sellable: false,
    },
    sourceMeta: {
      dispatchedChannels: [],
      shopierSyncStatus: 'not_synced',
      storyStatus: 'none',
      forceRedispatch: false,
      previewDispatch: false,
    },
    ...overrides,
  }
}

function originalMedia(id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    product: 349,
    type: 'original',
    url: `https://fixture.public.blob.vercel-storage.com/${id}.jpg`,
    filename: `${id}.jpg`,
    mimeType: 'image/jpeg',
    ...overrides,
  }
}

function attempt(attemptId: string, jobId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
    attemptId,
    jobId,
    status: 'failed',
    requestedSlotIds: [...GENERATED_SLOT_KEYS],
    slots: GENERATED_SLOT_KEYS.map((slotId) => {
      const slot = getSlotByKey(slotId)!
      return {
        contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
        attemptId,
        slotId,
        displayOrder: slot.displayOrder,
        purposeIdentifier: slot.purposeIdentifier,
        operatorLabel: slot.operatorLabel,
        status: 'provider_failed',
        warnings: [],
        failure: { code: 'provider_failed', summary: 'provider response incomplete' },
      }
    }),
    startedAt,
    completedAt,
    qualityProfile: 'visual-lock/v0.1',
    attemptKind: 'initial',
    attemptOrdinal: 1,
    parentAttemptId: null,
    retryPolicyVersion: 'visual-quality-retry-policy/v1',
    identityAnchorHash: 'a'.repeat(64),
    profileContractVersions: {
      profile: 'visual-lock/v0.1',
      identityAnchor: 'product-identity-anchor/v0',
      framing: 'visual-framing-lock/v0',
      familyLock: 'loafer-identity-lock/v0',
      componentTopology: 'component-topology-lock/v0.1',
      evaluator: 'visual-quality-evaluator/v0.1',
      geometryGate: 'visual-geometry-gate/v0.1',
      framingCorrection: 'visual-framing-correction/v1',
      materialFidelity: 'material-zone-fidelity-contract/v1',
    },
    ...overrides,
  }
}

function imageJob(id: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const attemptId = `iga_00000000-0000-4000-8000-${String(id).padStart(12, '0')}`
  return {
    id,
    product: 349,
    status: 'failed',
    generatedImages: [],
    generationContractVersion: IMAGE_SLOT_CONTRACT_VERSION,
    activeAttemptId: attemptId,
    generationAttempts: [attempt(attemptId, String(id))],
    generationCompletedAt: completedAt,
    imageCount: 0,
    ...overrides,
  }
}

function queueReceipt(jobId: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `queue-${jobId}`,
    taskSlug: 'image-gen',
    input: { jobId: String(jobId) },
    processing: false,
    completedAt,
    hasError: false,
    totalTried: 1,
    ...overrides,
  }
}

function pageOf(values: unknown[], page: number, requestedLimit: number): VisualPilotPage {
  const limit = requestedLimit
  const totalDocs = values.length
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  const start = (page - 1) * limit
  return {
    docs: values.slice(start, start + limit),
    totalDocs,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    limit,
  }
}

type GatewayOptions = {
  products?: unknown[]
  media?: Record<string, Record<string, unknown>>
  jobs?: unknown[]
  queue?: unknown[]
  events?: unknown[]
  stories?: unknown[]
  telegramReceipts?: unknown[]
  advertisingHistory?: unknown[]
  telegramAuthority?: boolean
  advertisingAuthority?: boolean
}

function gateway(options: GatewayOptions = {}): VisualPilotTargetReadGateway {
  const media = options.media ?? {
    '1001': originalMedia(1001),
    '1002': originalMedia(1002),
    '1003': originalMedia(1003),
  }
  const value: VisualPilotTargetReadGateway = {
    async findProductCandidates() { return options.products ?? [product()] },
    async findMediaById(id) { return media[String(id)] ?? null },
    async readImageJobPage(_id, page, limit) { return pageOf(options.jobs ?? [], page, limit) },
    async readPayloadJobPage(_ids, page, limit) { return pageOf(options.queue ?? [], page, limit) },
    async readBotEventPage(_id, page, limit) { return pageOf(options.events ?? [], page, limit) },
    async readStoryJobPage(_id, page, limit) { return pageOf(options.stories ?? [], page, limit) },
  }
  if (options.telegramAuthority !== false) {
    value.readTelegramPreviewReceiptPage = async (_id, page, limit) => pageOf(options.telegramReceipts ?? [], page, limit)
  }
  if (options.advertisingAuthority !== false) {
    value.readAdvertisingHistoryPage = async (_id, page, limit) => pageOf(options.advertisingHistory ?? [], page, limit)
  }
  return value
}

function mediaReadBodies(equal = false) {
  return {
    dnsLookup: async () => [{ address: '93.184.216.34', family: 4 }],
    fetchImpl: (async (input: URL | RequestInfo) => {
      const id = /\/(\d+)\.jpg/.exec(String(input))?.[1] ?? '0'
      const byte = equal ? 1 : Number(id) % 251
      return new Response(new Uint8Array([byte, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      })
    }) as typeof fetch,
    decodeImage: async () => ({ width: 1536, height: 1024, format: 'jpeg' as const, pages: 1 }),
  }
}

async function run(options: GatewayOptions = {}, equalBodies = false) {
  return verifyVisualPilotTarget('349', {
    gateway: gateway(options),
    mediaRead: mediaReadBodies(equalBodies),
  })
}

function reasonCodes(report: Awaited<ReturnType<typeof run>>): string[] {
  return report.blockingReasons.map((reason) => reason.code)
}

async function main(): Promise<void> {
await check('strict CLI requires one product and literal confirmation', () => {
  assert.equal(parseVisualPilotTargetArgs(['--product=349', '--confirm-read-only']).ok, true)
  assert.deepEqual(parseVisualPilotTargetArgs(['--product=349']), { ok: false, code: 'CLI_READ_ONLY_CONFIRMATION_REQUIRED' })
  assert.deepEqual(parseVisualPilotTargetArgs(['--confirm-read-only']), { ok: false, code: 'CLI_PRODUCT_REQUIRED' })
})

await check('unknown and duplicate CLI arguments are refused', () => {
  assert.deepEqual(parseVisualPilotTargetArgs(['--product=349', '--confirm-read-only', '--publish']), { ok: false, code: 'CLI_UNKNOWN_ARGUMENT' })
  assert.deepEqual(parseVisualPilotTargetArgs(['--product=349', '--product=SN0117', '--confirm-read-only']), { ok: false, code: 'CLI_DUPLICATE_PRODUCT_ARGUMENT' })
  assert.deepEqual(parseVisualPilotTargetArgs(['--product=349', '--confirm-read-only', '--confirm-read-only']), { ok: false, code: 'CLI_DUPLICATE_ARGUMENT' })
})

await check('missing confirmation stops before initializer', async () => {
  let initialized = false
  const result = await executeVisualPilotTargetCommand({
    argv: ['--product=349'],
    initialize: async () => { initialized = true; return { gateway: gateway(), mediaRead: mediaReadBodies() } },
  })
  assert.equal(result.exitCode, 2)
  assert.equal(initialized, false)
})

await check('clean synthetic target reaches ready-for-human-approval verdict', async () => {
  const report = await run()
  assert.equal(report.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')
  assert.deepEqual(report.blockingReasons, [])
  assert.deepEqual(report.attempts.slotOrder, ['side', 'hero_3q', 'top', 'back', 'detail'])
})

await check('missing, malformed, and duplicated products fail closed', async () => {
  assert.ok(reasonCodes(await run({ products: [] })).includes('PRODUCT_NOT_FOUND'))
  assert.ok(reasonCodes(await run({ products: [null] })).includes('PRODUCT_RECORD_MALFORMED'))
  assert.ok(reasonCodes(await run({ products: [product(), product({ id: 350 })] })).includes('PRODUCT_REFERENCE_DUPLICATED'))
})

await check('resolved product must match the exact numeric or stock-number reference', async () => {
  const mismatched = await run({ products: [product({ id: 350 })] })
  assert.ok(reasonCodes(mismatched).includes('PRODUCT_REFERENCE_MISMATCH'))
  const stockMatched = await verifyVisualPilotTarget('SN0117', {
    gateway: gateway(),
    mediaRead: mediaReadBodies(),
  })
  assert.equal(stockMatched.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')
})

await check('unknown lifecycle review and workflow states fail closed', async () => {
  const report = await run({
    products: [product({
      imageQuality: { status: 'mystery' },
      workflow: {
        workflowStatus: 'draft',
        visualStatus: 'mystery',
        confirmationStatus: 'mystery',
        publishStatus: 'not_requested',
        sellable: false,
      },
    })],
  })
  assert.ok(reasonCodes(report).includes('PRODUCT_LIFECYCLE_AMBIGUOUS'))
  assert.equal(report.product.visualStatus, 'unknown')
  assert.equal(report.product.confirmationStatus, 'unknown')
  assert.equal(report.product.reviewStatus, 'unknown')
})

await check('protected-brand classification is reported but never blocks verification', async () => {
  const report = await run({ products: [product({ brandSensitive: true })] })
  assert.equal(report.product.protectedBrand, true)
  assert.equal(report.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')
})

await check('missing and malformed original relationships block', async () => {
  assert.ok(reasonCodes(await run({ products: [product({ images: [] })] })).includes('ORIGINAL_RELATIONSHIP_MISSING'))
  assert.ok(reasonCodes(await run({ products: [product({ images: [{ image: null }] })] })).includes('ORIGINAL_RELATIONSHIP_MALFORMED'))
})

await check('generated Media can never be classified as an original', async () => {
  const media = { '1001': originalMedia(1001, { type: 'generated' }), '1002': originalMedia(1002), '1003': originalMedia(1003) }
  const report = await run({ media })
  assert.ok(reasonCodes(report).includes('ORIGINAL_SOURCE_CLASSIFICATION_AMBIGUOUS'))
  assert.equal(report.originals.distinctState, 'unknown')
})

await check('duplicate relationship identity blocks before a duplicate network read', async () => {
  const report = await run({ products: [product({ images: [{ image: 1001 }, { image: 1001 }] })] })
  assert.ok(reasonCodes(report).includes('ORIGINAL_RELATIONSHIP_DUPLICATE'))
  assert.equal(report.originals.distinctState, 'fail')
})

await check('duplicate original bytes block while order remains explicit', async () => {
  const report = await run({}, true)
  assert.ok(reasonCodes(report).includes('ORIGINAL_CONTENT_DUPLICATE'))
  assert.deepEqual(report.originals.evidence.map((entry) => entry.ordinal), [1, 2, 3])
})

await check('all paginated job pages are consumed and totals reconcile', async () => {
  const jobs = Array.from({ length: 104 }, (_, index) => imageJob(501 + index))
  const queue = jobs.map((job) => queueReceipt(Number(job.id)))
  const report = await run({ jobs, queue })
  assert.equal(report.jobs.exhaustiveCount, 104)
  assert.equal(report.jobs.paginationReconciled, true)
  assert.equal(report.queueReceipts.paginationReconciled, true)
})

await check('pagination mismatch fails closed', async () => {
  const bad = gateway()
  bad.readImageJobPage = async (_id, page, limit) => ({ docs: [], totalDocs: 2, page, totalPages: 1, hasNextPage: false, limit })
  const report = await verifyVisualPilotTarget('349', { gateway: bad, mediaRead: mediaReadBodies() })
  assert.ok(reasonCodes(report).includes('IMAGE_JOB_PAGINATION_INCONSISTENT'))
})

await check('pagination limit drift fails closed', async () => {
  const bad = gateway()
  bad.readImageJobPage = async (_id, page) => ({ docs: [], totalDocs: 0, page, totalPages: 0, hasNextPage: false, limit: 49 })
  const report = await verifyVisualPilotTarget('349', { gateway: bad, mediaRead: mediaReadBodies() })
  assert.ok(reasonCodes(report).includes('IMAGE_JOB_PAGINATION_INCONSISTENT'))
})

await check('active job outside the former three-job window is detected', async () => {
  const jobs = [imageJob(501), imageJob(502), imageJob(503), imageJob(504, { status: 'queued', generationCompletedAt: null })]
  const report = await run({ jobs, queue: jobs.map((job) => queueReceipt(Number(job.id))) })
  assert.ok(reasonCodes(report).includes('IMAGE_JOB_QUEUED_ACTIVE'))
})

await check('queued, generating, preview, and review jobs block', async () => {
  for (const status of ['queued', 'generating', 'preview', 'review']) {
    const job = imageJob(501, { status, generationCompletedAt: null })
    const report = await run({ jobs: [job], queue: [queueReceipt(501)] })
    assert.ok(reasonCodes(report).includes(`IMAGE_JOB_${status.toUpperCase()}_ACTIVE`))
  }
})

await check('unknown job status blocks', async () => {
  const report = await run({ jobs: [imageJob(501, { status: 'mystery' })], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('IMAGE_JOB_STATUS_UNKNOWN'))
})

await check('complete terminal failed job with zero Media is safe', async () => {
  const report = await run({ jobs: [imageJob(501)], queue: [queueReceipt(501)] })
  assert.equal(report.jobs.terminalCount, 1)
  assert.equal(report.jobs.byMediaPersistence.zero, 1)
  assert.equal(report.attempts.lineageIntegrityState, 'pass')
  assert.equal(report.attempts.activeAttemptState, 'terminal_reconciled')
  assert.equal(report.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')
})

await check('job contract, Media count, and attempt terminal outcome contradictions block', async () => {
  const base = imageJob(501)
  const contradictoryAttempt = {
    ...(base.generationAttempts as Record<string, unknown>[])[0],
    status: 'completed',
  }
  const report = await run({
    jobs: [{
      ...base,
      generationContractVersion: 'wrong-contract',
      imageCount: 5,
      generationAttempts: [contradictoryAttempt],
    }],
    queue: [queueReceipt(501)],
  })
  const codes = reasonCodes(report)
  assert.ok(codes.includes('IMAGE_JOB_CONTRACT_UNSUPPORTED'))
  assert.ok(codes.includes('IMAGE_JOB_MEDIA_COUNT_INCONSISTENT'))
  assert.ok(codes.includes('ATTEMPT_TERMINAL_OUTCOME_INCONSISTENT'))
})

await check('unknown profiles and incomplete V0.1 profile evidence block', async () => {
  const base = imageJob(501)
  const root = (base.generationAttempts as Record<string, unknown>[])[0]
  const unknownProfile = { ...root, qualityProfile: 'mystery/v99' }
  const missingVersions = { ...root, profileContractVersions: undefined }
  const malformedSummary = { ...root, qualityGateSummary: { gate: 'pass' } }
  assert.ok(reasonCodes(await run({ jobs: [{ ...base, generationAttempts: [unknownProfile] }], queue: [queueReceipt(501)] })).includes('ATTEMPT_PROFILE_UNSUPPORTED_OR_MIXED'))
  assert.ok(reasonCodes(await run({ jobs: [{ ...base, generationAttempts: [missingVersions] }], queue: [queueReceipt(501)] })).includes('V01_ATTEMPT_CONTRACT_INCOMPLETE'))
  assert.ok(reasonCodes(await run({ jobs: [{ ...base, generationAttempts: [malformedSummary] }], queue: [queueReceipt(501)] })).includes('V01_ATTEMPT_CONTRACT_INCOMPLETE'))
})

await check('malformed immutable attempt identity blocks', async () => {
  const base = imageJob(501)
  const malformed = { ...(base.generationAttempts as Record<string, unknown>[])[0], attemptId: 'iga_not_immutable' }
  const report = await run({ jobs: [{ ...base, activeAttemptId: 'iga_not_immutable', generationAttempts: [malformed] }], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('ATTEMPT_ID_MALFORMED'))
})

await check('duplicate attempt IDs and duplicate slot ordinals block', async () => {
  const base = imageJob(501)
  const first = (base.generationAttempts as Record<string, unknown>[])[0]
  const duplicate = { ...first }
  const report = await run({ jobs: [{ ...base, generationAttempts: [first, duplicate] }], queue: [queueReceipt(501)] })
  const codes = reasonCodes(report)
  assert.ok(codes.includes('ATTEMPT_ID_DUPLICATED'))
  assert.ok(codes.includes('ATTEMPT_SLOT_ORDINAL_DUPLICATED'))
})

await check('invalid retry parent-child lineage blocks', async () => {
  const base = imageJob(501)
  const child = attempt('iga_10000000-0000-4000-8000-000000000002', '501', {
    attemptKind: 'quality_retry',
    attemptOrdinal: 2,
    parentAttemptId: 'iga_10000000-0000-4000-8000-000000000099',
    requestedSlotIds: ['side'],
    slots: [(attempt('iga_10000000-0000-4000-8000-000000000002', '501').slots as unknown[])[0]],
  })
  const report = await run({ jobs: [{ ...base, generationAttempts: [...(base.generationAttempts as unknown[]), child] }], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('ATTEMPT_METADATA_MALFORMED'))
})

await check('attempt ordinal greater than two blocks with stable code', async () => {
  const base = imageJob(501)
  const malformed = { ...(base.generationAttempts as Record<string, unknown>[])[0], attemptOrdinal: 3 }
  const report = await run({ jobs: [{ ...base, generationAttempts: [malformed] }], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('ATTEMPT_ORDINAL_UNSUPPORTED'))
})

await check('unresolved activeAttemptId blocks', async () => {
  const report = await run({ jobs: [imageJob(501, { activeAttemptId: 'iga_ffffffff-ffff-4fff-8fff-ffffffffffff' })], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('ACTIVE_ATTEMPT_UNRESOLVED'))
})

await check('malformed attempt metadata blocks', async () => {
  const report = await run({ jobs: [imageJob(501, { generationAttempts: [{ malformed: true }] })], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('ATTEMPT_METADATA_MALFORMED'))
})

await check('partial approved pack and missing V0.1 manifest block', async () => {
  const report = await run({ jobs: [imageJob(501, { status: 'approved' })], queue: [queueReceipt(501)] })
  const codes = reasonCodes(report)
  assert.ok(codes.includes('PARTIAL_APPROVAL_STATE'))
  assert.ok(codes.includes('APPROVAL_MANIFEST_INCOMPLETE'))
})

await check('legacy positional attempt ambiguity is unsupported, never reinterpreted', async () => {
  const report = await run({ jobs: [imageJob(501, { generationAttempts: null, activeAttemptId: null })], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('LEGACY_ATTEMPT_EVIDENCE_UNSUPPORTED'))
  assert.equal(report.finalVerdict, 'TARGET_EVIDENCE_UNSUPPORTED')
})

await check('exact durable slot order is enforced', async () => {
  const base = imageJob(501)
  const rawAttempt = { ...(base.generationAttempts as Record<string, unknown>[])[0] }
  rawAttempt.requestedSlotIds = ['hero_3q', 'side', 'top', 'back', 'detail']
  const report = await run({ jobs: [{ ...base, generationAttempts: [rawAttempt] }], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(report).includes('ATTEMPT_METADATA_MALFORMED'))
  assert.deepEqual(report.attempts.slotOrder, ['side', 'hero_3q', 'top', 'back', 'detail'])
})

await check('queue processing, missing receipt, and receipt correlation ambiguity fail closed', async () => {
  const job = imageJob(501)
  assert.ok(reasonCodes(await run({ jobs: [job], queue: [queueReceipt(501, { processing: true, completedAt: null })] })).includes('QUEUE_RECEIPT_NONTERMINAL'))
  assert.ok(reasonCodes(await run({ jobs: [job], queue: [] })).includes('QUEUE_RECEIPT_MISSING'))
  assert.ok(reasonCodes(await run({ jobs: [job], queue: [queueReceipt(501, { input: { jobId: '999' } })] })).includes('QUEUE_RECEIPT_CORRELATION_AMBIGUOUS'))
  assert.ok(reasonCodes(await run({ jobs: [job], queue: [queueReceipt(501, { processing: 'false' })] })).includes('QUEUE_RECEIPT_STATE_AMBIGUOUS'))
  assert.ok(reasonCodes(await run({
    jobs: [job],
    queue: [queueReceipt(501), queueReceipt(501, { id: 'queue-501-duplicate' })],
  })).includes('QUEUE_RECEIPT_DUPLICATED'))
})

await check('a product or job change during bounded reads fails reconciliation', async () => {
  const changing = gateway()
  let productReads = 0
  changing.findProductCandidates = async () => {
    productReads += 1
    return [product(productReads === 1 ? {} : { status: 'active' })]
  }
  const report = await verifyVisualPilotTarget('349', { gateway: changing, mediaRead: mediaReadBodies() })
  assert.ok(reasonCodes(report).includes('TARGET_STATE_CHANGED_DURING_READ'))
})

await check('pending Telegram preview blocks when durable receipt authority exists', async () => {
  const job = imageJob(501, { status: 'preview', generationCompletedAt: null })
  const report = await run({
    jobs: [job],
    queue: [queueReceipt(501)],
    telegramAuthority: true,
    telegramReceipts: [{ id: 'tg-501', product: 349, state: 'awaiting_approval' }],
  })
  assert.equal(report.telegramPreviewState, 'blocked')
  assert.ok(reasonCodes(report).includes('TELEGRAM_PREVIEW_PENDING_OR_UNRECONCILED'))
})

await check('missing Telegram receipt authority returns evidence unsupported', async () => {
  const report = await run({ telegramAuthority: false })
  assert.equal(report.telegramPreviewState, 'unsupported')
  assert.equal(report.finalVerdict, 'TARGET_EVIDENCE_UNSUPPORTED')
  assert.ok(reasonCodes(report).includes('TELEGRAM_PREVIEW_ABSENCE_UNSUPPORTED'))
})

await check('authoritative advertising history records block rather than a capability boolean clearing them', async () => {
  const report = await run({ advertisingHistory: [{ id: 'ad-1', product: 349 }] })
  assert.ok(reasonCodes(report).includes('DOWNSTREAM_ADVERTISING_HISTORY_PRESENT'))
  assert.equal(report.downstreamExposure.advertising, 'exposed')
})

await check('Shopier, publishing, dispatch, BotEvent, StoryJob, and ad authority gates are isolated', async () => {
  const exposed = product({
    channels: { publishWebsite: false, publishInstagram: false, publishFacebook: false, publishX: false, publishShopier: true },
    channelTargets: ['shopier'],
    sourceMeta: {
      dispatchedChannels: ['instagram'],
      shopierSyncStatus: 'queued',
      storyStatus: 'none',
      forceRedispatch: false,
      previewDispatch: false,
    },
  })
  const report = await run({
    products: [exposed],
    events: [{ id: 1, product: 349, eventType: 'publish_requested', status: 'pending' }],
    stories: [{ id: 1, product: 349, status: 'queued' }],
    advertisingAuthority: false,
  })
  const codes = reasonCodes(report)
  assert.ok(codes.includes('DOWNSTREAM_SHOPIER_EXPOSURE'))
  assert.ok(codes.includes('DOWNSTREAM_DISPATCH_EXPOSURE'))
  assert.ok(codes.includes('DOWNSTREAM_BOT_EVENT_EXPOSURE'))
  assert.ok(codes.includes('DOWNSTREAM_STORY_HISTORY_PRESENT'))
  assert.ok(codes.includes('ADVERTISING_HISTORY_ABSENCE_UNSUPPORTED'))
})

await check('canonical product activation history blocks downstream isolation', async () => {
  const report = await run({
    events: [{ id: 1, product: 349, eventType: 'product.activated', status: 'processed' }],
  })
  assert.ok(reasonCodes(report).includes('DOWNSTREAM_BOT_EVENT_EXPOSURE'))
  assert.equal(report.downstreamExposure.state, 'blocked')
})

await check('unknown downstream shape fails closed', async () => {
  const report = await run({ products: [product({ channels: null })] })
  assert.ok(reasonCodes(report).includes('DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS'))
  const blankTargets = await run({ products: [product({ channelTargets: ['   '] })] })
  assert.ok(reasonCodes(blankTargets).includes('DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS'))
})

await check('malformed active attempt, temporal order, and failed-slot Media identity block', async () => {
  const base = imageJob(501)
  const rawRoot = (base.generationAttempts as Record<string, unknown>[])[0]
  const rootWithMedia = {
    ...rawRoot,
    slots: (rawRoot.slots as Record<string, unknown>[]).map((slot, index) => index === 0
      ? { ...slot, mediaId: 999, mediaUrl: 'https://fixture.invalid/999.jpg' }
      : slot),
  }
  const malformedActive = await run({ jobs: [{ ...base, activeAttemptId: 42 }], queue: [queueReceipt(501)] })
  assert.ok(reasonCodes(malformedActive).includes('ACTIVE_ATTEMPT_ID_MALFORMED'))
  const temporal = await run({
    jobs: [{ ...base, generationCompletedAt: '2026-08-18T09:00:00.000Z' }],
    queue: [queueReceipt(501)],
  })
  assert.ok(reasonCodes(temporal).includes('JOB_ATTEMPT_TIME_INCONSISTENT'))
  const failedSlotMedia = await run({
    jobs: [{ ...base, generationAttempts: [rootWithMedia] }],
    queue: [queueReceipt(501)],
  })
  assert.ok(reasonCodes(failedSlotMedia).includes('ATTEMPT_TERMINAL_OUTCOME_INCONSISTENT'))
})

await check('generated Media records must match their requested relationship IDs exactly', async () => {
  const jobId = '501'
  const attemptId = 'iga_00000000-0000-4000-8000-000000000501'
  const semantic = attempt(attemptId, jobId) as Record<string, unknown>
  for (const key of [
    'qualityProfile', 'attemptKind', 'attemptOrdinal', 'parentAttemptId', 'retryPolicyVersion',
    'identityAnchorHash', 'profileContractVersions', 'qualityGateSummary', 'packSelection',
  ]) delete semantic[key]
  semantic.status = 'completed'
  semantic.slots = GENERATED_SLOT_KEYS.map((slotId, index) => {
    const slot = getSlotByKey(slotId)!
    return {
      contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
      attemptId,
      slotId,
      displayOrder: slot.displayOrder,
      purposeIdentifier: slot.purposeIdentifier,
      operatorLabel: slot.operatorLabel,
      status: 'persisted',
      mediaId: 2001 + index,
      warnings: [],
    }
  })
  const generated = Object.fromEntries(GENERATED_SLOT_KEYS.map((slotId, index) => [
    String(2001 + index),
    {
      id: 9999,
      type: 'generated',
      product: 349,
      generationLineage: { contractVersion: IMAGE_SLOT_CONTRACT_VERSION, jobId, attemptId, slotId },
    },
  ]))
  const media = {
    '1001': originalMedia(1001),
    '1002': originalMedia(1002),
    '1003': originalMedia(1003),
    ...generated,
  }
  const rejectedJob = imageJob(501, {
    status: 'rejected',
    generatedImages: GENERATED_SLOT_KEYS.map((_slotId, index) => 2001 + index),
    imageCount: 5,
    activeAttemptId: attemptId,
    generationAttempts: [semantic],
  })
  const report = await run({ jobs: [rejectedJob], queue: [queueReceipt(501)], media })
  assert.ok(reasonCodes(report).includes('GENERATED_MEDIA_LINEAGE_INVALID'))
})

await check('no provider, evaluator, mutation, queue, Telegram, or approval method can be invoked', async () => {
  const forbidden = new Proxy({}, { get() { throw new Error('forbidden method accessed') } })
  const readGateway = gateway() as VisualPilotTargetReadGateway & Record<string, unknown>
  readGateway.create = forbidden
  readGateway.update = forbidden
  readGateway.delete = forbidden
  readGateway.provider = forbidden
  readGateway.telegram = forbidden
  const report = await verifyVisualPilotTarget('349', { gateway: readGateway, mediaRead: mediaReadBodies() })
  assert.equal(report.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')
})

await check('report and summary never expose URL, query, secret, digest, or unrestricted records', async () => {
  const secret = 'sk-abcdefghijklmnopqrstuvwxyz123456'
  const databaseSecret = 'DatabaseCredentialMustNotLeak'
  const databaseUri = `postgresql://admin:${databaseSecret}@localhost/prod`
  const report = await run({
    products: [product({ title: `Pilot ${secret} https://secret.example/?token=${secret} ${databaseUri}` })],
    media: {
      '1001': originalMedia(1001, { url: `https://fixture.public.blob.vercel-storage.com/1001.jpg?token=${secret}` }),
      '1002': originalMedia(1002),
      '1003': originalMedia(1003),
    },
  })
  const output = `${JSON.stringify(report)}\n${formatVisualPilotTargetSummary(report)}`
  assert.equal(output.includes(secret), false)
  assert.equal(output.includes('https://'), false)
  assert.equal(output.includes('postgresql://'), false)
  assert.equal(output.includes(databaseSecret), false)
  assert.equal(output.includes('?token='), false)
  assert.equal(/[a-f0-9]{64}/.test(output), false)

  const malformedId = await run({
    products: [product({ id: databaseUri, stockNumber: 'SN0349' })],
  })
  const malformedOutput = `${JSON.stringify(malformedId)}\n${formatVisualPilotTargetSummary(malformedId)}`
  assert.ok(reasonCodes(malformedId).includes('PRODUCT_IDENTITY_AMBIGUOUS'))
  assert.equal(malformedOutput.includes('postgresql://'), false)
  assert.equal(malformedOutput.includes(databaseSecret), false)
})

await check('verdict and stable reason ordering are deterministic', async () => {
  const options: GatewayOptions = { products: [product({ status: 'active', images: [] })], telegramAuthority: false, advertisingAuthority: false }
  const first = await run(options)
  const second = await run(options)
  assert.equal(JSON.stringify(first), JSON.stringify(second))
  assert.deepEqual(reasonCodes(first), [...reasonCodes(first)].sort())
  assert.equal(first.finalVerdict, 'TARGET_EVIDENCE_UNSUPPORTED')
})

console.log(`\n${passed} visual pilot target verifier tests passed.`)
if (process.exitCode) process.exit(process.exitCode)
}

void main()
