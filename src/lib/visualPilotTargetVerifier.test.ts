import assert from 'node:assert/strict'

import { getSlotByKey, GENERATED_SLOT_KEYS, IMAGE_SLOT_CONTRACT_VERSION } from './imageSlotContract'
import {
  classifyVisualPilotBotEvent,
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
      dispatchedChannels: '[]',
      shopierSyncStatus: 'not_synced',
      storyStatus: 'none',
      forceRedispatch: false,
      previewDispatch: false,
    },
    merchandising: {},
    postToInstagram: false,
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

function mediaSet(extra: Record<string, Record<string, unknown>> = {}): Record<string, Record<string, unknown>> {
  return {
    '1001': originalMedia(1001),
    '1002': originalMedia(1002),
    '1003': originalMedia(1003),
    ...extra,
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

function v01QualitySummary(): Record<string, unknown> {
  return {
    profile: 'visual-lock/v0.1',
    family: 'loafer',
    identityAnchorHash: 'a'.repeat(64),
    topologyContractVersion: 'component-topology-lock/v0.1',
    evaluatorContractVersion: 'visual-quality-evaluator/v0.1',
    geometryGateVersion: 'visual-geometry-gate/v0.1',
    framingCorrectionContractVersion: 'visual-framing-correction/v1',
    studioContractVersion: 'visual-studio-contract/v1',
    materialContractVersion: 'material-zone-fidelity-contract/v1',
    slotResults: GENERATED_SLOT_KEYS.map((slot) => ({
      slot,
      framingCorrectionResult: { status: 'unknown', outcome: 'not_applied', reasonCodes: [] },
      orientationResult: { status: 'unknown', detectedView: 'unknown' },
      topologyResult: { status: 'unknown', reasonCodes: [] },
      studioResult: { status: 'unknown' },
      materialResult: { status: 'unknown', reasonCodes: [] },
      evaluatorStatus: 'unknown',
      evaluatorReasonCodes: [],
      occupancyPercent: null,
      horizontalCenterOffsetPercent: null,
      verticalCenterOffsetPercent: null,
      maximumCenterOffsetPercent: null,
      clippingState: 'unknown',
      geometryStatus: 'unknown',
      geometryReasonCodes: [],
    })),
    packResults: {
      requiredEvaluatorCompleteness: 'unknown',
      orientationGateStatus: 'unknown',
      topologyGateStatus: 'unknown',
      studioGateStatus: 'unknown',
      materialGateStatus: 'unknown',
      framingCorrectionGateStatus: 'unknown',
      geometryGateStatus: 'unknown',
      qualityGateStatus: 'unknown',
      occupancyMinimumPercent: null,
      occupancyMaximumPercent: null,
      occupancySpreadPercent: null,
      reasonCodes: [],
    },
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

function completedGeneratedFixture(jobIdNumber = 501): {
  job: Record<string, unknown>
  media: Record<string, Record<string, unknown>>
} {
  const jobId = String(jobIdNumber)
  const attemptId = `iga_00000000-0000-4000-8000-${String(jobIdNumber).padStart(12, '0')}`
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
  return {
    job: imageJob(jobIdNumber, {
      status: 'rejected',
      generatedImages: GENERATED_SLOT_KEYS.map((_slotId, index) => 2001 + index),
      imageCount: 5,
      activeAttemptId: attemptId,
      generationAttempts: [semantic],
    }),
    media: Object.fromEntries(GENERATED_SLOT_KEYS.map((slotId, index) => [
      String(2001 + index),
      {
        id: 2001 + index,
        type: 'generated',
        product: 349,
        generationLineage: { contractVersion: IMAGE_SLOT_CONTRACT_VERSION, jobId, attemptId, slotId },
      },
    ])),
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
    async readProductMediaPage(_id, page, limit) { return pageOf(Object.values(media), page, limit) },
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

await check('original count limit fails before any retrieval', async () => {
  const ids = Array.from({ length: 9 }, (_, index) => 1100 + index)
  let fetches = 0
  const report = await verifyVisualPilotTarget('349', {
    gateway: gateway({
      products: [product({ images: ids.map((id) => ({ image: id })) })],
      media: Object.fromEntries(ids.map((id) => [String(id), originalMedia(id)])),
    }),
    mediaRead: {
      ...mediaReadBodies(),
      fetchImpl: (async () => { fetches += 1; throw new Error('must not fetch') }) as typeof fetch,
    },
  })
  assert.ok(reasonCodes(report).includes('ORIGINAL_COUNT_LIMIT_EXCEEDED'))
  assert.equal(fetches, 0)
})

await check('aggregate byte budget stops before a fifth maximum-size original', async () => {
  const ids = [1201, 1202, 1203, 1204, 1205]
  let fetches = 0
  const report = await verifyVisualPilotTarget('349', {
    gateway: gateway({
      products: [product({ images: ids.map((id) => ({ image: id })) })],
      media: Object.fromEntries(ids.map((id) => [String(id), originalMedia(id)])),
    }),
    mediaRead: {
      ...mediaReadBodies(),
      fetchImpl: (async () => {
        fetches += 1
        return new Response(new Uint8Array(10_000_000).fill(fetches), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        })
      }) as typeof fetch,
    },
  })
  assert.ok(reasonCodes(report).includes('ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED'))
  assert.equal(fetches, 4)
})

await check('aggregate pixel budget stops before later originals', async () => {
  const ids = [1301, 1302, 1303, 1304, 1305]
  let fetches = 0
  const report = await verifyVisualPilotTarget('349', {
    gateway: gateway({
      products: [product({ images: ids.map((id) => ({ image: id })) })],
      media: Object.fromEntries(ids.map((id) => [String(id), originalMedia(id)])),
    }),
    mediaRead: {
      ...mediaReadBodies(),
      fetchImpl: (async () => { fetches += 1; return new Response(new Uint8Array([fetches]), { status: 200, headers: { 'content-type': 'image/jpeg' } }) }) as typeof fetch,
      decodeImage: async () => ({ width: 8_000, height: 5_000, format: 'jpeg', pages: 1 }),
    },
  })
  assert.ok(reasonCodes(report).includes('ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED'))
  assert.equal(fetches, 4)
})

await check('failed decodes consume aggregate bytes and stop before a fifth failure', async () => {
  const ids = [1351, 1352, 1353, 1354, 1355]
  let fetches = 0
  const secret = 'FAILED_DECODE_SECRET_MUST_NOT_LEAK'
  const report = await verifyVisualPilotTarget('349', {
    gateway: gateway({
      products: [product({ images: ids.map((id) => ({ image: id })) })],
      media: Object.fromEntries(ids.map((id) => [String(id), originalMedia(id, {
        url: `https://fixture.public.blob.vercel-storage.com/${id}.jpg?token=${secret}`,
      })])),
    }),
    mediaRead: {
      ...mediaReadBodies(),
      fetchImpl: (async () => {
        fetches += 1
        return new Response(new Uint8Array(10_000_000).fill(fetches), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        })
      }) as typeof fetch,
      decodeImage: async () => { throw new Error(`raw decode exception ${secret}`) },
    },
  })
  const serialized = JSON.stringify(report)
  assert.ok(reasonCodes(report).includes('ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED'))
  assert.ok(reasonCodes(report).includes('ORIGINAL_DECODE_FAILED'))
  assert.equal(fetches, 4)
  assert.equal(serialized.includes(secret), false)
  assert.equal(serialized.includes('https://'), false)
  assert.equal(serialized.includes('10000000'), false)
  assert.doesNotMatch(serialized, /[a-f0-9]{64}/)
})

await check('known dimensions on later multipage failures consume aggregate pixels', async () => {
  const ids = [1361, 1362, 1363, 1364, 1365]
  let fetches = 0
  const report = await verifyVisualPilotTarget('349', {
    gateway: gateway({
      products: [product({ images: ids.map((id) => ({ image: id })) })],
      media: Object.fromEntries(ids.map((id) => [String(id), originalMedia(id)])),
    }),
    mediaRead: {
      ...mediaReadBodies(),
      fetchImpl: (async () => {
        fetches += 1
        return new Response(new Uint8Array([fetches]), { status: 200, headers: { 'content-type': 'image/jpeg' } })
      }) as typeof fetch,
      decodeImage: async () => ({ width: 8_000, height: 5_000, format: 'jpeg', pages: 2 }),
    },
  })
  assert.ok(reasonCodes(report).includes('ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED'))
  assert.ok(reasonCodes(report).includes('ORIGINAL_MULTIPAGE_UNSUPPORTED'))
  assert.equal(fetches, 4)
})

await check('aggregate wall deadline aborts the current decode and skips later originals', async () => {
  const ids = [1401, 1402]
  let nowCalls = 0
  let fetches = 0
  const report = await verifyVisualPilotTarget('349', {
    gateway: gateway({
      products: [product({ images: ids.map((id) => ({ image: id })) })],
      media: Object.fromEntries(ids.map((id) => [String(id), originalMedia(id)])),
    }),
    now: () => (++nowCalls === 1 ? 0 : 44_995),
    mediaRead: {
      ...mediaReadBodies(),
      fetchImpl: (async () => { fetches += 1; return new Response(new Uint8Array([1]), { status: 200, headers: { 'content-type': 'image/jpeg' } }) }) as typeof fetch,
      decodeImage: async () => new Promise(() => undefined),
    },
  })
  assert.ok(reasonCodes(report).includes('ORIGINAL_AGGREGATE_TIMEOUT'))
  assert.equal(fetches, 1)
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

await check('product-scoped orphan generated Media is detected outside gallery and job arrays', async () => {
  const report = await run({
    media: mediaSet({
      '2999': {
        id: 2999,
        product: 349,
        type: 'generated',
        generationLineage: {
          contractVersion: IMAGE_SLOT_CONTRACT_VERSION,
          jobId: '999',
          attemptId: 'iga_00000000-0000-4000-8000-000000000999',
          slotId: 'side',
        },
      },
    }),
  })
  assert.ok(reasonCodes(report).includes('GENERATED_MEDIA_ORPHANED'))
  assert.equal(report.media.generatedCount, 1)
})

await check('complete generated Media lineage rejects wrong job or attempt links', async () => {
  const fixture = completedGeneratedFixture()
  const wrong = {
    ...fixture.media['2001'],
    generationLineage: {
      ...(fixture.media['2001'].generationLineage as Record<string, unknown>),
      attemptId: 'iga_ffffffff-ffff-4fff-8fff-ffffffffffff',
    },
  }
  const report = await run({
    jobs: [fixture.job],
    queue: [queueReceipt(501)],
    media: mediaSet({ ...fixture.media, '2001': wrong }),
  })
  assert.ok(reasonCodes(report).includes('GENERATED_MEDIA_LINEAGE_INVALID'))
})

await check('duplicate generated Media relationships across jobs fail closed', async () => {
  const first = completedGeneratedFixture(501)
  const second = completedGeneratedFixture(502)
  const report = await run({
    jobs: [first.job, second.job],
    queue: [queueReceipt(501), queueReceipt(502)],
    media: mediaSet(first.media),
  })
  assert.ok(reasonCodes(report).includes('GENERATED_MEDIA_JOB_RELATIONSHIP_DUPLICATED'))
})

await check('malformed and duplicate product-scoped Media pagination fails closed', async () => {
  const malformed = gateway()
  malformed.readProductMediaPage = async (_id, page, limit) => ({
    docs: [originalMedia(1001), originalMedia(1001)],
    totalDocs: 2,
    page,
    totalPages: 1,
    hasNextPage: false,
    limit,
  })
  const report = await verifyVisualPilotTarget('349', { gateway: malformed, mediaRead: mediaReadBodies() })
  assert.ok(reasonCodes(report).includes('MEDIA_PAGINATION_INCONSISTENT'))
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

await check('V0.1 contract diagnostics emit every sanitized field-family subreason', async () => {
  const base = imageJob(501)
  const root = (base.generationAttempts as Record<string, unknown>[])[0]
  const validAttempt = { ...root, qualityGateSummary: v01QualitySummary() }
  const validCodes = reasonCodes(await run({
    jobs: [{ ...base, generationAttempts: [validAttempt] }],
    queue: [queueReceipt(501)],
  }))
  assert.equal(validCodes.some((code) => code.startsWith('V01_')), false)

  const cases: Array<{
    code: string
    mutate: (candidate: Record<string, unknown>) => void
  }> = [
    {
      code: 'V01_ATTEMPT_IDENTITY_ORDINAL_RETRY_LINEAGE_INVALID',
      mutate: (candidate) => {
        delete candidate.attemptKind
        delete candidate.attemptOrdinal
        delete candidate.parentAttemptId
        delete candidate.retryPolicyVersion
      },
    },
    { code: 'V01_IDENTITY_ANCHOR_INVALID', mutate: (candidate) => { candidate.identityAnchorHash = 'invalid' } },
    {
      code: 'V01_CONTRACT_VERSION_FAMILY_INVALID',
      mutate: (candidate) => {
        candidate.profileContractVersions = {
          ...(candidate.profileContractVersions as Record<string, unknown>),
          evaluator: 'unsupported-version',
        }
      },
    },
    {
      code: 'V01_ORDERED_FIVE_SLOT_SUMMARY_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        summary.slotResults = (summary.slotResults as unknown[]).slice(1)
      },
    },
    {
      code: 'V01_EVALUATOR_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.evaluatorStatus = 'invalid'
      },
    },
    {
      code: 'V01_MATERIAL_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.materialResult = null
      },
    },
    {
      code: 'V01_TOPOLOGY_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.topologyResult = null
      },
    },
    {
      code: 'V01_GEOMETRY_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.geometryStatus = 'invalid'
      },
    },
    {
      code: 'V01_STUDIO_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.studioResult = null
      },
    },
    {
      code: 'V01_FRAMING_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.framingCorrectionResult = null
      },
    },
    {
      code: 'V01_ORIENTATION_STATE_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.orientationResult = null
      },
    },
    {
      code: 'V01_MEASUREMENT_VALIDITY_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.slotResults as Record<string, unknown>[])[0]!.occupancyPercent = 'invalid'
      },
    },
    {
      code: 'V01_PACK_GATE_CONSISTENCY_INVALID',
      mutate: (candidate) => {
        const summary = candidate.qualityGateSummary as Record<string, unknown>
        ;(summary.packResults as Record<string, unknown>).qualityGateStatus = 'pass'
      },
    },
    {
      code: 'V01_ATTEMPT_TERMINAL_STATE_INCONSISTENT',
      mutate: (candidate) => { candidate.status = 'completed' },
    },
  ]

  for (const testCase of cases) {
    const candidate = structuredClone(validAttempt)
    testCase.mutate(candidate)
    const codes = reasonCodes(await run({
      jobs: [{ ...base, generationAttempts: [candidate] }],
      queue: [queueReceipt(501)],
    }))
    assert.ok(codes.includes('V01_ATTEMPT_CONTRACT_INCOMPLETE'), testCase.code)
    assert.ok(codes.includes(testCase.code), testCase.code)
  }
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

await check('shared exact queue-receipt qualification governs both snapshots and missing semantics', async () => {
  const job = imageJob(501)
  type QueueSnapshot = unknown[] | 'unsupported'
  const runSnapshots = async (first: QueueSnapshot, second: QueueSnapshot) => {
    const snapshotGateway = gateway({ jobs: [job] })
    let queueReads = 0
    snapshotGateway.readPayloadJobPage = async (_ids, page, limit) => {
      queueReads += 1
      const selected = queueReads === 1 ? first : second
      if (selected === 'unsupported') throw new Error('synthetic queue discovery failure')
      return pageOf(selected, page, limit)
    }
    const report = await verifyVisualPilotTarget('349', {
      gateway: snapshotGateway,
      mediaRead: mediaReadBodies(),
    })
    assert.equal(queueReads, 2)
    return report
  }
  const has = (report: Awaited<ReturnType<typeof runSnapshots>>, code: string) => reasonCodes(report).includes(code)

  const qualifying = await runSnapshots([queueReceipt(501)], [queueReceipt(501)])
  assert.equal(has(qualifying, 'QUEUE_RECEIPT_MISSING'), false)

  const empty = await runSnapshots([], [])
  assert.equal(has(empty, 'QUEUE_RECEIPT_MISSING'), true)

  const nonImageReceipt = queueReceipt(501, { taskSlug: 'other-task' })
  const nonImage = await runSnapshots([nonImageReceipt], [nonImageReceipt])
  assert.equal(has(nonImage, 'QUEUE_RECEIPT_TASK_MISMATCH'), true)
  assert.equal(has(nonImage, 'QUEUE_RECEIPT_MISSING'), true)
  assert.notEqual(nonImage.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')

  const ambiguousReceipt = queueReceipt(501, { log: [{ input: { jobId: '502' } }] })
  const ambiguous = await runSnapshots([ambiguousReceipt], [ambiguousReceipt])
  assert.equal(has(ambiguous, 'QUEUE_RECEIPT_CORRELATION_AMBIGUOUS'), true)
  assert.equal(has(ambiguous, 'QUEUE_RECEIPT_MISSING'), true)
  assert.notEqual(ambiguous.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')

  const firstUnsupportedThenEmpty = await runSnapshots('unsupported', [])
  assert.equal(has(firstUnsupportedThenEmpty, 'QUEUE_RECEIPT_DISCOVERY_UNSUPPORTED'), true)
  assert.equal(has(firstUnsupportedThenEmpty, 'QUEUE_RECEIPT_MISSING'), true)
  assert.equal(has(firstUnsupportedThenEmpty, 'TARGET_STATE_CHANGED_DURING_READ'), true)

  const firstUnsupportedThenNonImage = await runSnapshots('unsupported', [nonImageReceipt])
  assert.equal(has(firstUnsupportedThenNonImage, 'QUEUE_RECEIPT_DISCOVERY_UNSUPPORTED'), true)
  assert.equal(has(firstUnsupportedThenNonImage, 'QUEUE_RECEIPT_TASK_MISMATCH'), true)
  assert.equal(has(firstUnsupportedThenNonImage, 'QUEUE_RECEIPT_MISSING'), true)
  assert.equal(has(firstUnsupportedThenNonImage, 'TARGET_STATE_CHANGED_DURING_READ'), true)

  const firstUnsupportedThenQualifying = await runSnapshots('unsupported', [queueReceipt(501)])
  assert.equal(has(firstUnsupportedThenQualifying, 'QUEUE_RECEIPT_DISCOVERY_UNSUPPORTED'), true)
  assert.equal(has(firstUnsupportedThenQualifying, 'QUEUE_RECEIPT_MISSING'), false)
  assert.equal(has(firstUnsupportedThenQualifying, 'TARGET_STATE_CHANGED_DURING_READ'), true)

  const bothUnsupported = await runSnapshots('unsupported', 'unsupported')
  assert.equal(has(bothUnsupported, 'QUEUE_RECEIPT_DISCOVERY_UNSUPPORTED'), true)
  assert.equal(has(bothUnsupported, 'QUEUE_RECEIPT_RECONCILIATION_DISCOVERY_UNSUPPORTED'), true)
  assert.equal(has(bothUnsupported, 'QUEUE_RECEIPT_MISSING'), false)

  const reconciliationUnsupported = await runSnapshots([queueReceipt(501)], 'unsupported')
  assert.equal(has(reconciliationUnsupported, 'QUEUE_RECEIPT_RECONCILIATION_DISCOVERY_UNSUPPORTED'), true)
  assert.equal(has(reconciliationUnsupported, 'QUEUE_RECEIPT_MISSING'), false)

  const disappears = await runSnapshots([queueReceipt(501)], [])
  assert.equal(has(disappears, 'QUEUE_RECEIPT_MISSING'), false)
  assert.equal(has(disappears, 'TARGET_STATE_CHANGED_DURING_READ'), true)

  const appearsDuringReconciliation = await runSnapshots([], [queueReceipt(501)])
  assert.equal(has(appearsDuringReconciliation, 'QUEUE_RECEIPT_MISSING'), false)
  assert.equal(has(appearsDuringReconciliation, 'TARGET_STATE_CHANGED_DURING_READ'), true)

  const changesIdentity = await runSnapshots(
    [queueReceipt(501)],
    [queueReceipt(501, { id: 'queue-501-changed' })],
  )
  assert.equal(has(changesIdentity, 'QUEUE_RECEIPT_MISSING'), false)
  assert.equal(has(changesIdentity, 'TARGET_STATE_CHANGED_DURING_READ'), true)
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

await check('a reused mutable Product object cannot rewrite the first captured snapshot', async () => {
  const sharedProduct = product()
  const changing = gateway({ products: [sharedProduct] })
  let productReads = 0
  changing.findProductCandidates = async () => {
    productReads += 1
    if (productReads === 2) sharedProduct.title = 'Mutated after first capture'
    return [sharedProduct]
  }
  const report = await verifyVisualPilotTarget('349', { gateway: changing, mediaRead: mediaReadBodies() })
  assert.equal(productReads, 2)
  assert.ok(reasonCodes(report).includes('TARGET_STATE_CHANGED_DURING_READ'))
  assert.notEqual(report.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL')
})

await check('every readiness-critical evidence surface is compared across two complete passes', async () => {
  for (const surface of ['jobs', 'media', 'queue', 'bot', 'story', 'telegram', 'advertising'] as const) {
    const changing = gateway()
    let calls = 0
    if (surface === 'jobs') changing.readImageJobPage = async (_id, page, limit) => pageOf(++calls === 1 ? [] : [imageJob(901)], page, limit)
    if (surface === 'media') changing.readProductMediaPage = async (_id, page, limit) => pageOf(
      ++calls === 1 ? Object.values(mediaSet()) : Object.values(mediaSet({ '1999': originalMedia(1999) })),
      page,
      limit,
    )
    if (surface === 'queue') changing.readPayloadJobPage = async (_ids, page, limit) => pageOf(++calls === 1 ? [] : [queueReceipt(901)], page, limit)
    if (surface === 'bot') changing.readBotEventPage = async (_id, page, limit) => pageOf(
      ++calls === 1 ? [] : [{ id: 1, product: 349, eventType: 'publish.approved', status: 'processed' }],
      page,
      limit,
    )
    if (surface === 'story') changing.readStoryJobPage = async (_id, page, limit) => pageOf(
      ++calls === 1 ? [] : [{ id: 1, product: 349, status: 'published' }],
      page,
      limit,
    )
    if (surface === 'telegram') changing.readTelegramPreviewReceiptPage = async (_id, page, limit) => pageOf(
      ++calls === 1 ? [] : [{ id: 'tg-1', product: 349, state: 'awaiting_approval' }],
      page,
      limit,
    )
    if (surface === 'advertising') changing.readAdvertisingHistoryPage = async (_id, page, limit) => pageOf(
      ++calls === 1 ? [] : [{ id: 'ad-1', product: 349 }],
      page,
      limit,
    )
    const report = await verifyVisualPilotTarget('349', { gateway: changing, mediaRead: mediaReadBodies() })
    assert.ok(reasonCodes(report).includes('TARGET_STATE_CHANGED_DURING_READ'), surface)
    assert.notEqual(report.finalVerdict, 'TARGET_READY_FOR_PILOT_APPROVAL', surface)
  }
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
      dispatchedChannels: '["instagram"]',
      shopierSyncStatus: 'queued',
      storyStatus: 'none',
      forceRedispatch: false,
      previewDispatch: false,
    },
  })
  const report = await run({
    products: [exposed],
    events: [{ id: 1, product: 349, eventType: 'publish.approved', status: 'pending' }],
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

await check('BotEvent classifier rejects inherited, unknown and malformed names without coercion', () => {
  for (const eventType of [
    'constructor', '__proto__', 'prototype', 'toString', 'valueOf', 'hasOwnProperty',
    'future.unknown', '', ' ', 'content.requested ', 'CONTENT.REQUESTED', '\u0000content.requested',
  ]) {
    for (const status of ['pending', 'processed', 'failed', 'ignored']) {
      assert.equal(classifyVisualPilotBotEvent(eventType, status), 'unknown', eventType)
    }
  }
  for (const eventType of [null, undefined, 1, {}, ['content.requested'], {
    toString() { throw new Error('BotEvent names must not be coerced') },
  }]) {
    assert.equal(classifyVisualPilotBotEvent(eventType as unknown as string, 'processed'), 'unknown')
  }
})

await check('every own BotEvent taxonomy entry preserves all status classifications', () => {
  const groups = {
    exposure: [
      'publish.approved', 'product.activated', 'product.soldout', 'product.restocked', 'lead.converted',
      'order.status_changed', 'order.new_alert_sent', 'order.refund_requested', 'order.refund_updated',
    ],
    non_exposure: ['publish.rejected', 'pi.auto_trigger_failed', 'content.failed', 'audit.needs_revision', 'audit.failed'],
    neutral: [
      'brand_safety.provenance_reviewed', 'pi.auto_triggered_by_geo', 'pi.sent_to_geo',
      'content.requested', 'content.commerce_generated', 'content.discovery_generated', 'content.ready',
      'audit.requested', 'audit.started', 'audit.approved', 'audit.approved_with_warning',
      'audit.auto_fix_requested', 'product.publish_ready', 'product.confirmed', 'state.repaired',
      'stock.changed', 'lead.status_changed', 'lead.new_alert_sent',
    ],
  }
  assert.equal(Object.values(groups).flat().length, 32)
  for (const [classification, eventTypes] of Object.entries(groups)) {
    for (const eventType of eventTypes) {
      for (const status of ['pending', 'processed', 'failed', 'ignored']) {
        const expected = classification === 'exposure' && (status === 'failed' || status === 'ignored')
          ? 'non_exposure' : classification
        assert.equal(classifyVisualPilotBotEvent(eventType, status), expected, `${eventType}/${status}`)
      }
    }
  }
})

await check('explicit BotEvent taxonomy separates exposure, non-exposure, neutral, and unknown events', async () => {
  const neutralTypes = [
    'brand_safety.provenance_reviewed', 'pi.auto_triggered_by_geo', 'pi.sent_to_geo',
    'content.requested', 'content.commerce_generated', 'content.discovery_generated', 'content.ready',
    'audit.requested', 'audit.started', 'audit.approved', 'audit.approved_with_warning',
    'audit.auto_fix_requested', 'product.publish_ready', 'product.confirmed', 'state.repaired',
    'stock.changed', 'lead.status_changed', 'lead.new_alert_sent',
  ]
  const neutral = await run({ events: neutralTypes.map((eventType, index) => ({ id: index + 1, product: 349, eventType, status: 'processed' })) })
  assert.equal(reasonCodes(neutral).includes('DOWNSTREAM_BOT_EVENT_EXPOSURE'), false)
  assert.equal(reasonCodes(neutral).includes('BOT_EVENT_TAXONOMY_UNSUPPORTED'), false)

  const nonExposureTypes = ['publish.rejected', 'pi.auto_trigger_failed', 'content.failed', 'audit.needs_revision', 'audit.failed']
  const nonExposure = await run({ events: nonExposureTypes.map((eventType, index) => ({ id: index + 100, product: 349, eventType, status: 'processed' })) })
  assert.equal(reasonCodes(nonExposure).includes('DOWNSTREAM_BOT_EVENT_EXPOSURE'), false)

  const exposureTypes = [
    'publish.approved', 'product.activated', 'product.soldout', 'product.restocked', 'lead.converted',
    'order.status_changed', 'order.new_alert_sent', 'order.refund_requested', 'order.refund_updated',
  ]
  const exposure = await run({ events: exposureTypes.map((eventType, index) => ({ id: index + 200, product: 349, eventType, status: 'processed' })) })
  assert.ok(reasonCodes(exposure).includes('DOWNSTREAM_BOT_EVENT_EXPOSURE'))

  const failedExposure = await run({ events: [{ id: 301, product: 349, eventType: 'product.activated', status: 'failed' }] })
  assert.equal(reasonCodes(failedExposure).includes('DOWNSTREAM_BOT_EVENT_EXPOSURE'), false)

  const unknown = await run({ events: [{ id: 401, product: 349, eventType: 'future.external_success', status: 'processed' }] })
  assert.ok(reasonCodes(unknown).includes('BOT_EVENT_TAXONOMY_UNSUPPORTED'))
  assert.equal(unknown.finalVerdict, 'TARGET_EVIDENCE_UNSUPPORTED')
})

await check('unknown downstream shape fails closed', async () => {
  const report = await run({ products: [product({ channels: null })] })
  assert.ok(reasonCodes(report).includes('DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS'))
  const blankTargets = await run({ products: [product({ channelTargets: ['   '] })] })
  assert.ok(reasonCodes(blankTargets).includes('DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS'))
})

await check('downstream ambiguity emits every sanitized Product field-family subreason', async () => {
  const baseProduct = product()
  const cases: Array<{ code: string; overrides: Record<string, unknown> }> = [
    { code: 'DOWNSTREAM_CHANNEL_FIELD_SHAPE_INVALID', overrides: { channels: null } },
    { code: 'DOWNSTREAM_CHANNEL_TARGET_VALIDATION_FAILED', overrides: { channelTargets: ['future-channel'] } },
    {
      code: 'DOWNSTREAM_WORKFLOW_PUBLISH_STATUS_INVALID',
      overrides: { workflow: { ...(baseProduct.workflow as Record<string, unknown>), publishStatus: 'unknown-status' } },
    },
    {
      code: 'DOWNSTREAM_SERIALIZED_DISPATCHED_CHANNELS_INVALID',
      overrides: { sourceMeta: { ...(baseProduct.sourceMeta as Record<string, unknown>), dispatchedChannels: 'not-json' } },
    },
    {
      code: 'DOWNSTREAM_SHOPIER_STATE_INVALID',
      overrides: { sourceMeta: { ...(baseProduct.sourceMeta as Record<string, unknown>), shopierSyncStatus: 'unknown-status' } },
    },
    {
      code: 'DOWNSTREAM_STORY_STATE_INVALID',
      overrides: { sourceMeta: { ...(baseProduct.sourceMeta as Record<string, unknown>), storyStatus: 'unknown-status' } },
    },
    {
      code: 'DOWNSTREAM_EXTERNAL_SYNC_MARKERS_INVALID',
      overrides: { sourceMeta: { ...(baseProduct.sourceMeta as Record<string, unknown>), externalSyncId: 7 } },
    },
    {
      code: 'DOWNSTREAM_DISPATCH_TIMESTAMPS_INVALID',
      overrides: { sourceMeta: { ...(baseProduct.sourceMeta as Record<string, unknown>), lastDispatchedAt: 'not-a-date' } },
    },
    { code: 'DOWNSTREAM_MERCHANDISING_PUBLICATION_MARKERS_INVALID', overrides: { merchandising: { publishedAt: 'not-a-date' } } },
    { code: 'DOWNSTREAM_LEGACY_PUBLICATION_MARKERS_INVALID', overrides: { postToInstagram: 'false' } },
  ]
  for (const testCase of cases) {
    const codes = reasonCodes(await run({ products: [product(testCase.overrides)] }))
    assert.ok(codes.includes('DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS'), testCase.code)
    assert.ok(codes.includes(testCase.code), testCase.code)
  }
})

await check('schema-correct dispatchedChannels text distinguishes empty, populated, malformed, and legacy arrays', async () => {
  const empty = await run({ products: [product({ sourceMeta: { ...(product().sourceMeta as Record<string, unknown>), dispatchedChannels: '[]' } })] })
  assert.equal(reasonCodes(empty).includes('DOWNSTREAM_DISPATCH_EXPOSURE'), false)
  const populated = await run({ products: [product({ sourceMeta: { ...(product().sourceMeta as Record<string, unknown>), dispatchedChannels: '["instagram"]' } })] })
  assert.ok(reasonCodes(populated).includes('DOWNSTREAM_DISPATCH_EXPOSURE'))
  for (const dispatchedChannels of ['not-json', '{"channel":"instagram"}', '["instagram",7]', ['instagram']]) {
    const malformed = await run({ products: [product({ sourceMeta: { ...(product().sourceMeta as Record<string, unknown>), dispatchedChannels } })] })
    assert.ok(reasonCodes(malformed).includes('DOWNSTREAM_PRODUCT_STATE_AMBIGUOUS'))
  }
})

await check('durable publication, external-sync, and legacy downstream markers cannot be cleared by current intent', async () => {
  const published = await run({ products: [product({ merchandising: { publishedAt: completedAt } })] })
  assert.ok(reasonCodes(published).includes('DOWNSTREAM_PUBLISHING_TARGET'))
  const external = await run({ products: [product({ sourceMeta: { ...(product().sourceMeta as Record<string, unknown>), externalSyncId: 'legacy-external-id' } })] })
  assert.ok(reasonCodes(external).includes('DOWNSTREAM_DISPATCH_EXPOSURE'))
  const legacyInstagram = await run({ products: [product({ postToInstagram: true })] })
  assert.ok(reasonCodes(legacyInstagram).includes('DOWNSTREAM_PUBLISHING_TARGET'))
  const dispatchedAt = await run({ products: [product({ sourceMeta: { ...(product().sourceMeta as Record<string, unknown>), lastDispatchedAt: completedAt } })] })
  assert.ok(reasonCodes(dispatchedAt).includes('DOWNSTREAM_DISPATCH_EXPOSURE'))
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
      id: index === 0 ? 9999 : 2001 + index,
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
  assert.ok(reasonCodes(report).includes('GENERATED_MEDIA_RECORD_MISSING'))
  assert.ok(reasonCodes(report).includes('GENERATED_MEDIA_ORPHANED'))
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
