import assert from 'node:assert/strict'

import {
  classifyFreshCandidateProductElimination,
  discoverFreshVisualProducts,
  finalizeFreshVisualDiscoveryReport,
  FRESH_CANDIDATE_ELIMINATION_DIAGNOSTICS_VERSION,
  FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES,
  parseFreshVisualDiscoveryArgs,
  type FreshCandidateEliminationDiagnostics,
  type FreshCandidatePrimaryEliminationCategory,
  type FreshVisualDiscoveryGateway,
  type FreshVisualDiscoveryPage,
  type FreshVisualDiscoveryReport,
} from './freshVisualProductDiscovery'
import type { VisualPilotMediaReadResult } from './visualPilotMediaEvidence'

type RecordValue = Record<string, unknown>
type SnapshotResult = Parameters<typeof finalizeFreshVisualDiscoveryReport>[0]
type Snapshot = Extract<SnapshotResult, { ok: true }>['snapshot']

function page(docs: unknown[], requestedPage: number, limit: number): FreshVisualDiscoveryPage {
  const totalDocs = docs.length
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  const start = (requestedPage - 1) * limit
  return {
    docs: docs.slice(start, start + limit),
    totalDocs,
    page: requestedPage,
    totalPages,
    hasNextPage: requestedPage < totalPages,
    limit,
  }
}

function product(id: number, imageIds: number[], overrides: RecordValue = {}): RecordValue {
  return {
    id,
    stockNumber: `SN${String(id).padStart(4, '0')}`,
    status: 'draft',
    images: imageIds.map((image) => ({ image })),
    generativeGallery: [],
    workflow: {
      workflowStatus: 'draft',
      visualStatus: 'pending',
      confirmationStatus: 'pending',
      publishStatus: 'not_requested',
      sellable: false,
    },
    channels: {
      publishWebsite: false,
      publishInstagram: false,
      publishFacebook: false,
      publishX: false,
      publishShopier: false,
    },
    channelTargets: [],
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
    merchandising: { publishedAt: null },
    postToInstagram: false,
    ...overrides,
  }
}

function media(id: number, productId: number, overrides: RecordValue = {}): RecordValue {
  return {
    id,
    product: productId,
    type: 'original',
    generationLineage: null,
    mimeType: 'image/jpeg',
    url: `https://www.uygunayakkabi.com/media/${id}.jpg`,
    ...overrides,
  }
}

type Fixture = {
  products: RecordValue[]
  mediaByProduct: Map<number, RecordValue[]>
  galleryOwners: RecordValue[]
  jobsByProduct: Map<number, RecordValue[]>
  receiptsByProduct: Map<number, RecordValue[]>
  eventsByProduct: Map<number, RecordValue[]>
  storiesByProduct: Map<number, RecordValue[]>
}

function fixture(products: RecordValue[], mediaRecords: RecordValue[]): Fixture {
  const mediaByProduct = new Map<number, RecordValue[]>()
  for (const entry of mediaRecords) {
    const productId = Number(entry.product)
    mediaByProduct.set(productId, [...(mediaByProduct.get(productId) ?? []), entry])
  }
  return {
    products,
    mediaByProduct,
    galleryOwners: [],
    jobsByProduct: new Map(),
    receiptsByProduct: new Map(),
    eventsByProduct: new Map(),
    storiesByProduct: new Map(),
  }
}

function gateway(value: Fixture): FreshVisualDiscoveryGateway {
  return {
    readProductPage: async (requestedPage, limit) => page(value.products, requestedPage, limit),
    readMediaPage: async (productId, requestedPage, limit) => page(value.mediaByProduct.get(productId) ?? [], requestedPage, limit),
    readGeneratedGalleryOwnerPage: async (mediaIds, requestedPage, limit) => {
      const ids = new Set(mediaIds.map(String))
      const owners = value.galleryOwners.filter((owner) =>
        Array.isArray(owner.generativeGallery)
        && owner.generativeGallery.some((entry) =>
          entry && typeof entry === 'object' && ids.has(String((entry as RecordValue).image))))
      return page(owners, requestedPage, limit)
    },
    readImageJobPage: async (productId, requestedPage, limit) => page(value.jobsByProduct.get(productId) ?? [], requestedPage, limit),
    readQueueReceiptPage: async (productId, requestedPage, limit) => page(value.receiptsByProduct.get(productId) ?? [], requestedPage, limit),
    readBotEventPage: async (productId, requestedPage, limit) => page(value.eventsByProduct.get(productId) ?? [], requestedPage, limit),
    readStoryJobPage: async (productId, requestedPage, limit) => page(value.storiesByProduct.get(productId) ?? [], requestedPage, limit),
  }
}

function goodEvidence(entry: RecordValue): VisualPilotMediaReadResult {
  const id = Number(entry.id)
  return {
    ok: true,
    width: 1000,
    height: 1000,
    mimeType: 'image/jpeg',
    byteSize: 1_000,
    contentDigest: id.toString(16).padStart(64, '0'),
    consumedByteCount: 1_000,
    knownPixelCount: 1_000_000,
  }
}

async function run(value: Fixture, read = goodEvidence) {
  return discoverFreshVisualProducts({
    gateway: gateway(value),
    readMediaEvidence: async (entry) => read(entry),
  })
}

function diagnostics(report: FreshVisualDiscoveryReport): FreshCandidateEliminationDiagnostics {
  assert.ok(report.diagnostics)
  return report.diagnostics
}

function primaryEliminationTotal(value: FreshCandidateEliminationDiagnostics): number {
  return FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES.reduce(
    (total, category) => total + value.primaryEliminationCounts[category],
    0,
  )
}

function assertReconciled(value: FreshCandidateEliminationDiagnostics): void {
  assert.equal(value.version, FRESH_CANDIDATE_ELIMINATION_DIAGNOSTICS_VERSION)
  assert.equal(value.assessedProductCount, value.eligibleCandidateCount + value.eliminatedProductCount)
  assert.equal(primaryEliminationTotal(value), value.eliminatedProductCount)
  assert.ok(value.assessedProductCount <= value.queriedProductCount)
  for (const count of [
    value.queriedProductCount,
    value.assessedProductCount,
    value.eligibleCandidateCount,
    value.eliminatedProductCount,
    ...Object.values(value.primaryEliminationCounts),
  ]) {
    assert.ok(Number.isSafeInteger(count) && count >= 0 && count <= 100)
  }
}

function eliminatedSnapshot(): Snapshot {
  return {
    candidates: [],
    observationDigest: 'c'.repeat(64),
    diagnostics: {
      version: FRESH_CANDIDATE_ELIMINATION_DIAGNOSTICS_VERSION,
      queriedProductCount: 1,
      assessedProductCount: 1,
      eligibleCandidateCount: 0,
      eliminatedProductCount: 1,
      primaryEliminationCounts: {
        ...Object.fromEntries(FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES.map((category) => [category, 0])),
        PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE: 1,
      } as FreshCandidateEliminationDiagnostics['primaryEliminationCounts'],
    },
  }
}

function assertUnsupported(report: FreshVisualDiscoveryReport, code: string, snapshotsCompleted: 0 | 1 | 2): void {
  assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
  assert.deepEqual(report.reasonCodes, [code])
  assert.equal(report.snapshotsCompleted, snapshotsCompleted)
  assert.equal(report.diagnostics, undefined)
  assert.equal(Object.prototype.hasOwnProperty.call(report, 'diagnostics'), false)
  assert.equal(report.primaryProductId, null)
  assert.deepEqual(report.candidates, [])
}

type TerminalRead = 'empty-product-page' | 'original-success' | 'story-history'
  | 'original-failure' | 'product-read-failure' | 'original-read-failure'

async function assertTerminalReadDeadline(surface: TerminalRead, targetPass: 0 | 1, finishedAt: number): Promise<void> {
  const empty = surface === 'empty-product-page' || surface === 'product-read-failure'
  const base = fixture(empty ? [] : [product(630, [6301, 6302])], [media(6301, 630), media(6302, 630)])
  let clock = 0
  let productReads = 0
  let imageReads = 0
  let storyReads = 0
  const completeRead = () => {
    if (productReads === targetPass + 1) clock = finishedAt
  }
  const report = await discoverFreshVisualProducts({
    now: () => clock,
    gateway: {
      ...gateway(base),
      readProductPage: async (requestedPage, limit) => {
        productReads += 1
        if (empty) completeRead()
        if (surface === 'product-read-failure' && productReads === targetPass + 1) {
          throw new Error('synthetic terminal Product read failure')
        }
        return page(base.products, requestedPage, limit)
      },
      readStoryJobPage: async (_productId, requestedPage, limit) => {
        storyReads += 1
        if (surface === 'story-history') completeRead()
        return page(surface === 'story-history' ? [{ id: 1, product: 630 }] : [], requestedPage, limit)
      },
    },
    readMediaEvidence: async (entry) => {
      imageReads += 1
      // The last original has no subsequent loop iteration to enforce the deadline.
      if (entry.id === 6302) {
        completeRead()
        if (surface === 'original-read-failure' && productReads === targetPass + 1) {
          throw new Error('synthetic terminal original read failure')
        }
        if (surface === 'original-failure') {
          return { ok: false, code: 'ORIGINAL_AGGREGATE_TIMEOUT', consumedByteCount: 0, knownPixelCount: 0 }
        }
      }
      return goodEvidence(entry)
    },
  })
  const label = `${surface}, snapshot ${targetPass + 1}, completion ${finishedAt}`
  const timeout = finishedAt >= 45_000
  const readFailure = surface === 'product-read-failure' || surface === 'original-read-failure'
  if (timeout || readFailure) {
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED', label)
    assertUnsupported(report, timeout ? 'DISCOVERY_OBSERVATION_TIMEOUT'
      : surface === 'product-read-failure' ? 'PRODUCT_READ_FAILED' : 'MEDIA_EVIDENCE_READ_FAILED', targetPass)
    assert.doesNotMatch(JSON.stringify(report), /diagnostics|queriedProductCount|eligibleCandidateCount|primaryEliminationCounts|SN0630|"productId":630/)
  } else {
    assert.equal(report.readiness, surface === 'original-success'
      ? 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION' : 'NO_ELIGIBLE_FRESH_CANDIDATE', label)
    assert.equal(report.snapshotsCompleted, 2)
    const value = diagnostics(report)
    assertReconciled(value)
    assert.equal(value.queriedProductCount, empty ? 0 : 1)
    assert.equal(value.eligibleCandidateCount, surface === 'original-success' ? 1 : 0)
    if (surface === 'story-history') assert.equal(value.primaryEliminationCounts.STORY_JOB_HISTORY_PRESENT, 1)
    if (surface === 'original-failure') assert.equal(value.primaryEliminationCounts.AGGREGATE_EVIDENCE_BUDGET_EXCEEDED, 1)
  }
  const passes = timeout || readFailure ? targetPass + 1 : 2
  assert.equal(productReads, passes, label)
  assert.equal(storyReads, empty ? 0 : passes, label)
  assert.equal(imageReads, empty || surface === 'story-history' ? 0 : passes * 2, label)
}

async function assertCompletionDeadline(boundary: 'snapshot' | 'report', targetPass: 0 | 1): Promise<void> {
  let productReads = 0
  let terminalReadReturned = false
  // The read itself is timely; advance at snapshot acceptance or report return.
  let timelyPostReadChecks = boundary === 'snapshot' ? 1 : 2
  const report = await discoverFreshVisualProducts({
    now: () => !terminalReadReturned ? 0 : timelyPostReadChecks-- > 0 ? 44_999 : 45_000,
    gateway: {
      ...gateway(fixture([], [])),
      readProductPage: async (requestedPage, limit) => {
        productReads += 1
        if (productReads === targetPass + 1) terminalReadReturned = true
        return page([], requestedPage, limit)
      },
    },
    readMediaEvidence: async () => { throw new Error('empty snapshot must not read images') },
  })
  assertUnsupported(report, 'DISCOVERY_OBSERVATION_TIMEOUT', boundary === 'snapshot' ? targetPass : 2)
  assert.equal(productReads, targetPass + 1)
}

async function assertUnknownBotEvent(eventType: string, failedPass: 0 | 1): Promise<void> {
  const base = fixture([product(32, [321])], [media(321, 32)])
  let eventReads = 0
  let imageReads = 0
  const report = await discoverFreshVisualProducts({
    now: () => 0,
    gateway: {
      ...gateway(base),
      readBotEventPage: async (_productId, requestedPage, limit) => page([{
        id: 1,
        product: 32,
        eventType: eventReads++ === failedPass ? eventType : 'content.requested',
        status: 'processed',
      }], requestedPage, limit),
    },
    readMediaEvidence: async (entry) => {
      imageReads += 1
      return goodEvidence(entry)
    },
  })
  assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED', `unknown BotEvent: ${eventType}`)
  assertUnsupported(report, 'BOT_EVENT_TAXONOMY_UNSUPPORTED', failedPass)
  const output = JSON.stringify(report)
  assert.equal(output.includes(eventType), false, 'raw BotEvent name must not escape')
  assert.doesNotMatch(output, /eligibleCandidateCount|primaryEliminationCounts|BOT_EVENT_HISTORY_UNSAFE|SN0032|"productId":32/)
  assert.equal(eventReads, failedPass + 1)
  assert.equal(imageReads, failedPass, 'unsupported events must stop original-evidence reads')
}

type HistoryCondition = 'gallery' | 'jobs' | 'receipts' | 'stories'
  | 'active' | 'association' | 'lineage' | 'ordered-media'

const HISTORY_PRIORITY: ReadonlyArray<readonly [HistoryCondition, FreshCandidatePrimaryEliminationCategory]> = [
  ['gallery', 'GENERATED_GALLERY_OWNERSHIP_PRESENT'],
  ['jobs', 'GENERATION_HISTORY_PRESENT'],
  ['receipts', 'DURABLE_QUEUE_RECEIPT_PRESENT'],
  ['stories', 'STORY_JOB_HISTORY_PRESENT'],
  ['active', 'BOT_EVENT_HISTORY_UNSAFE'],
  ['association', 'BOT_EVENT_HISTORY_UNSAFE'],
  ['lineage', 'PRODUCT_SCOPED_MEDIA_LINEAGE_OR_OWNERSHIP'],
  ['ordered-media', 'ORDERED_MEDIA_UNCLEAN'],
]

function historyFixture(conditions: readonly HistoryCondition[]): Fixture {
  const value = fixture([product(32, [321])], [media(321, 32)])
  if (conditions.includes('gallery')) value.galleryOwners = [{ id: 1, generativeGallery: [{ image: 321 }] }]
  if (conditions.includes('jobs')) value.jobsByProduct.set(32, [{ id: 1, product: 32 }])
  if (conditions.includes('receipts')) value.receiptsByProduct.set(32, [{ id: 1 }])
  if (conditions.includes('stories')) value.storiesByProduct.set(32, [{ id: 1, product: 32 }])
  const events: RecordValue[] = []
  if (conditions.includes('active')) events.push({ id: 1, product: 32, eventType: 'product.activated', status: 'processed' })
  if (conditions.includes('association')) events.push({ id: 2, product: 99, eventType: 'content.requested', status: 'processed' })
  value.eventsByProduct.set(32, events)
  const originals = conditions.includes('ordered-media') ? [] : [media(321, 32)]
  value.mediaByProduct.set(32, conditions.includes('lineage') ? [...originals, media(322, 32, { type: 'generated' })] : originals)
  return value
}

async function assertCompleteBotEventValidation(): Promise<void> {
  const conditions = HISTORY_PRIORITY.map(([condition]) => condition)
  const histories: HistoryCondition[][] = [[], ...conditions.map((condition) => [condition]), conditions]
  const unknown = { id: 3, product: 32, eventType: 'constructor', status: 'processed' }
  const malformed = { id: 4, product: 32, eventType: 'content.requested', status: 'unsupported-status' }
  const invalidSets: Array<{ events: RecordValue[]; code: string }> = [
    { events: [unknown], code: 'BOT_EVENT_TAXONOMY_UNSUPPORTED' },
    { events: [{ ...unknown, eventType: 'future.unknown', product: 99 }], code: 'BOT_EVENT_TAXONOMY_UNSUPPORTED' },
    { events: [{ id: 3 }], code: 'BOT_EVENT_STATE_MALFORMED' },
    { events: [{ ...unknown, eventType: {} }], code: 'BOT_EVENT_STATE_MALFORMED' },
    { events: [malformed], code: 'BOT_EVENT_STATE_MALFORMED' },
    { events: [unknown, malformed], code: 'BOT_EVENT_STATE_MALFORMED' },
  ]
  let checked = 0
  for (const history of histories) {
    for (const invalid of invalidSets) {
      for (const failedPass of [0, 1] as const) {
        // Both Product orders include a healthy row, including one assessed before failure.
        for (const productOrder of [[32], [32, 33], [33, 32]]) {
          let forwardOutput: string | undefined
          for (const reverse of [false, true]) {
            const base = historyFixture(history)
            base.products = productOrder.map((id) => product(id, [id * 10 + 1]))
            base.mediaByProduct.set(33, [media(331, 33)])
            let productReads = 0
            const eventReads: number[] = []
            const storyReads: number[] = []
            const imageReads: number[] = []
            const report = await discoverFreshVisualProducts({
              now: () => 0,
              gateway: {
                ...gateway(base),
                readProductPage: async (requestedPage, limit) => {
                  productReads += 1
                  return page(base.products, requestedPage, limit)
                },
                readBotEventPage: async (productId, requestedPage, limit) => {
                  eventReads.push(productId)
                  const events = [...(base.eventsByProduct.get(productId) ?? [])]
                  if (productId === 32 && productReads === failedPass + 1) events.push(...invalid.events)
                  return page(reverse ? events.reverse() : events, requestedPage, limit)
                },
                readStoryJobPage: async (productId, requestedPage, limit) => {
                  storyReads.push(productId)
                  return page(base.storiesByProduct.get(productId) ?? [], requestedPage, limit)
                },
              },
              readMediaEvidence: async (entry) => {
                imageReads.push(Number(entry.product))
                return goodEvidence(entry)
              },
            })
            const label = `captured BotEvent validation: ${history.join('+') || 'alone'}, ${invalid.code}, snapshot ${failedPass + 1}, ${productOrder.join('/')}, reverse=${reverse}`
            assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED', label)
            assertUnsupported(report, invalid.code, failedPass)
            const output = JSON.stringify(report)
            assert.deepEqual(Object.keys(report).sort(), [
              'candidates', 'primaryProductId', 'publishingAuthority', 'readiness',
              'reasonCodes', 'snapshotsCompleted', 'version',
            ])
            assert.doesNotMatch(output, /diagnostics|recommendation|[Cc]ount|eventType|stockNumber|"productId"|SN003[23]|349/)
            for (const event of invalid.events) {
              for (const name of [event.eventType, event.status]) {
                if (typeof name === 'string') assert.equal(output.includes(name), false, 'raw BotEvent values must not escape')
              }
            }
            if (reverse) assert.equal(output, forwardOutput, 'event order must not alter unsupported output')
            else forwardOutput = output
            const expectedReads = [
              ...(failedPass === 1 ? productOrder : []),
              ...productOrder.slice(0, productOrder.indexOf(32) + 1),
            ]
            assert.equal(productReads, failedPass + 1)
            assert.deepEqual(eventReads, expectedReads, 'no extra Product or BotEvent read')
            assert.deepEqual(storyReads, expectedReads, 'existing bounded history capture remains complete')
            assert.equal(imageReads.filter((id) => id === 32).length, history.length === 0 ? failedPass : 0)
            assert.equal(imageReads.filter((id) => id === 33).length,
              (failedPass === 1 && productOrder.includes(33) ? 1 : 0) + (productOrder[0] === 33 ? 1 : 0))
            checked += 1
          }
        }
      }
    }
  }
  assert.equal(checked, 720)

  // A normal unsafe event on page one must not hide unknown evidence on the last bounded page.
  for (const reverse of [false, true]) {
    const base = historyFixture(['active'])
    const events = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1, product: 32, eventType: index === 499 ? 'constructor' : 'product.activated', status: 'processed',
    }))
    const pages: number[] = []
    const report = await discoverFreshVisualProducts({
      gateway: {
        ...gateway(base),
        readBotEventPage: async (_productId, requestedPage, limit) => {
          pages.push(requestedPage)
          assert.equal(limit, 25)
          return page(reverse ? [...events].reverse() : events, requestedPage, limit)
        },
      },
      readMediaEvidence: async () => { throw new Error('unsupported history must not read originals') },
    })
    assertUnsupported(report, 'BOT_EVENT_TAXONOMY_UNSUPPORTED', 0)
    assert.deepEqual(pages, Array.from({ length: 20 }, (_, index) => index + 1))
  }
}

async function main(): Promise<void> {
  assert.deepEqual(parseFreshVisualDiscoveryArgs([]), { ok: false, code: 'READ_ONLY_CONFIRMATION_REQUIRED' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--query=x']), { ok: false, code: 'UNKNOWN_ARGUMENT' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--confirm-read-only', '--confirm-read-only']), { ok: false, code: 'DUPLICATE_ARGUMENT' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--confirm-read-only']), { ok: true, helpRequested: false })
  for (const codes of [
    ['FUTURE_UNMAPPED_NORMAL_REJECTION'],
    ['PRODUCT_NOT_DRAFT', 'FUTURE_UNMAPPED_NORMAL_REJECTION'],
    ['FUTURE_UNMAPPED_NORMAL_REJECTION', 'PRODUCT_NOT_DRAFT'],
  ]) {
    let failure: unknown
    assert.throws(() => {
      try {
        classifyFreshCandidateProductElimination(codes)
      } catch (error) {
        failure = error
        throw error
      }
    }, /DIAGNOSTIC_PRIMARY_ELIMINATION_UNMAPPED/, 'every unknown code must fail closed')
    for (const failedPass of [0, 1] as const) {
      const failed: SnapshotResult = { ok: false, error: failure }
      const report = failedPass === 0
        ? finalizeFreshVisualDiscoveryReport(failed)
        : finalizeFreshVisualDiscoveryReport({ ok: true, snapshot: eliminatedSnapshot() }, failed)
      assertUnsupported(report, 'DIAGNOSTIC_PRIMARY_ELIMINATION_UNMAPPED', failedPass)
      assert.doesNotMatch(JSON.stringify(report), /FUTURE_UNMAPPED_NORMAL_REJECTION/)
    }
  }
  for (const codes of [
    ['PRODUCT_IMAGE_RELATIONSHIPS_DUPLICATED', 'PRODUCT_NOT_DRAFT', 'PRODUCT_SOURCE_META_MALFORMED'],
    ['PRODUCT_SOURCE_META_MALFORMED', 'PRODUCT_NOT_DRAFT', 'PRODUCT_IMAGE_RELATIONSHIPS_DUPLICATED'],
    ['PRODUCT_NOT_DRAFT', 'PRODUCT_NOT_DRAFT'],
  ]) {
    assert.equal(classifyFreshCandidateProductElimination(codes), 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE')
  }
  {
    const report = await run(fixture([product(8, [81, 81], { status: 'active', sourceMeta: null })], []))
    const value = diagnostics(report)
    assert.equal(value.eliminatedProductCount, 1)
    assert.equal(value.primaryEliminationCounts.PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE, 1)
    assert.equal(primaryEliminationTotal(value), 1)
    assertReconciled(value)
  }

  {
    const report = await run(fixture([], []))
    assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE')
    const value = diagnostics(report)
    assert.deepEqual(
      {
        queriedProductCount: value.queriedProductCount,
        assessedProductCount: value.assessedProductCount,
        eligibleCandidateCount: value.eligibleCandidateCount,
        eliminatedProductCount: value.eliminatedProductCount,
      },
      {
        queriedProductCount: 0,
        assessedProductCount: 0,
        eligibleCandidateCount: 0,
        eliminatedProductCount: 0,
      },
    )
    assertReconciled(value)
    for (const excludedPasses of [[true, true], [true, false], [false, true]]) {
      let productReads = 0
      let downstreamReads = 0
      const forbiddenRead = async (): Promise<never> => {
        downstreamReads += 1
        throw new Error('excluded Product must not reach a scoped reader')
      }
      const excludedReport = await discoverFreshVisualProducts({
        gateway: {
          readProductPage: async (requestedPage, limit) => page(
            excludedPasses[productReads++] ? [product(349, [3491])] : [], requestedPage, limit,
          ),
          readMediaPage: forbiddenRead,
          readGeneratedGalleryOwnerPage: forbiddenRead,
          readImageJobPage: forbiddenRead,
          readQueueReceiptPage: forbiddenRead,
          readBotEventPage: forbiddenRead,
          readStoryJobPage: forbiddenRead,
        },
        readMediaEvidence: forbiddenRead,
      })
      assert.equal(productReads, 2)
      assert.equal(downstreamReads, 0)
      assert.deepEqual(excludedReport.diagnostics, value)
      assert.equal(JSON.stringify(excludedReport), JSON.stringify(report), 'excluded presence must not change serialized output')
    }
  }

  {
    const report = await run(fixture([product(9, [91])], [media(91, 9)]))
    assert.equal(report.readiness, 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    const value = diagnostics(report)
    assert.deepEqual(
      [value.queriedProductCount, value.assessedProductCount, value.eligibleCandidateCount, value.eliminatedProductCount],
      [1, 1, 1, 0],
    )
    assertReconciled(value)
  }

  {
    const value = fixture(
      [
        product(349, [3491, 3492, 3493]),
        product(13, [131]),
        product(12, [121, 122]),
        product(11, [111, 112, 113]),
        product(10, [101, 102, 103]),
      ],
      [
        media(3491, 349), media(3492, 349), media(3493, 349),
        media(131, 13), media(121, 12), media(122, 12),
        media(111, 11), media(112, 11), media(113, 11),
        media(101, 10), media(102, 10), media(103, 10),
      ],
    )
    const report = await run(value)
    assert.equal(report.readiness, 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    assert.equal(report.primaryProductId, 10)
    assert.deepEqual(report.candidates.map((entry) => [entry.productId, entry.usableOriginalCount, entry.rank]), [
      [10, 3, 1], [11, 3, 2], [12, 2, 3],
    ])
    assert.ok(report.candidates.every((entry) => entry.eligibleForVisualOnlyGeneration && !entry.eligibleForPublishing))
    assert.equal(report.publishingAuthority.telegramPreviewHistory, 'unavailable')
    assert.equal(report.publishingAuthority.advertisingHistory, 'unavailable')
    assert.ok(!report.candidates.some((entry) => entry.productId === 349))
    assert.doesNotMatch(JSON.stringify(report), /"productId":349|SN0349/)
    assert.equal(report.snapshotsCompleted, 2)
    const diagnostic = diagnostics(report)
    assert.deepEqual(
      [diagnostic.queriedProductCount, diagnostic.assessedProductCount, diagnostic.eligibleCandidateCount, diagnostic.eliminatedProductCount],
      [4, 4, 4, 0],
    )
    assert.ok(!Object.keys(diagnostic.primaryEliminationCounts).some((key) => /TELEGRAM|ADVERTISING/.test(key)))
    assertReconciled(diagnostic)
    value.products = value.products.filter((entry) => entry.id !== 349)
    assert.equal(JSON.stringify(await run(value)), JSON.stringify(report), 'mixed input must not disclose the excluded row')
  }
  {
    const value = fixture(
      [product(14, [141]), product(15, [151, 152]), product(16, [161, 162, 163])],
      [media(141, 14), media(151, 15), media(152, 15), media(161, 16), media(162, 16), media(163, 16)],
    )
    const report = await run(value)
    assert.deepEqual(report.candidates.map((entry) => [entry.productId, entry.usableOriginalCount]), [[16, 3], [15, 2], [14, 1]])
  }

  {
    const sellabilityProduct = product(502, [5021])
    ;(sellabilityProduct.workflow as RecordValue).sellable = true
    const channelProduct = product(506, [5061])
    ;(channelProduct.channels as RecordValue).publishWebsite = true
    const orderedMedia = fixture([product(508, [5081])], [])
    orderedMedia.mediaByProduct.set(508, [media(5081, 999)])
    const galleryOwnership = fixture([product(510, [5101])], [media(5101, 510)])
    galleryOwnership.galleryOwners = [{ id: 1, generativeGallery: [{ image: 5101 }] }]
    const generationHistory = fixture([product(511, [5111])], [media(5111, 511)])
    generationHistory.jobsByProduct.set(511, [{ id: 1 }])
    const queueHistory = fixture([product(512, [5121])], [media(5121, 512)])
    queueHistory.receiptsByProduct.set(512, [{ id: 1 }])
    const storyHistory = fixture([product(513, [5131])], [media(5131, 513)])
    storyHistory.storiesByProduct.set(513, [{ id: 1 }])
    const botHistory = fixture([product(514, [5141])], [media(5141, 514)])
    botHistory.eventsByProduct.set(514, [{ id: 1, product: 514, eventType: 'product.activated', status: 'processed' }])

    const categoryCases: Array<{
      category: FreshCandidatePrimaryEliminationCategory
      value: Fixture
      read?: typeof goodEvidence
    }> = [
      {
        category: 'PRODUCT_RECORD_OR_IDENTITY_INVALID',
        value: fixture([product(500, [5001], { stockNumber: 'INVALID' })], [media(5001, 500)]),
      },
      {
        category: 'PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE',
        value: fixture([product(501, [5011], { status: 'active' })], [media(5011, 501)]),
      },
      {
        category: 'PRODUCT_SELLABILITY_OR_PUBLISH_STATE_UNSAFE',
        value: fixture([sellabilityProduct], [media(5021, 502)]),
      },
      {
        category: 'ORDERED_IMAGE_RELATIONSHIP_INVALID',
        value: fixture([product(503, [5031, 5031])], [media(5031, 503)]),
      },
      {
        category: 'GENERATED_GALLERY_PRESENT',
        value: fixture([product(504, [5041], { generativeGallery: [{ image: 999 }] })], [media(5041, 504)]),
      },
      {
        category: 'CHANNEL_OR_DOWNSTREAM_STATE_UNSAFE',
        value: fixture([channelProduct], [media(5061, 506)]),
      },
      {
        category: 'SOURCE_METADATA_UNSAFE',
        value: fixture([product(507, [5071], { sourceMeta: null })], [media(5071, 507)]),
      },
      { category: 'ORDERED_MEDIA_UNCLEAN', value: orderedMedia },
      {
        category: 'PRODUCT_SCOPED_MEDIA_LINEAGE_OR_OWNERSHIP',
        value: fixture([product(509, [5091])], [media(5091, 509, { type: 'generated' })]),
      },
      { category: 'GENERATED_GALLERY_OWNERSHIP_PRESENT', value: galleryOwnership },
      { category: 'GENERATION_HISTORY_PRESENT', value: generationHistory },
      { category: 'DURABLE_QUEUE_RECEIPT_PRESENT', value: queueHistory },
      { category: 'STORY_JOB_HISTORY_PRESENT', value: storyHistory },
      { category: 'BOT_EVENT_HISTORY_UNSAFE', value: botHistory },
      {
        category: 'ORIGINAL_EVIDENCE_UNAVAILABLE_OR_INVALID',
        value: fixture([product(515, [5151])], [media(5151, 515)]),
        read: () => ({ ok: false, code: 'ORIGINAL_BODY_EMPTY', consumedByteCount: 0, knownPixelCount: 0 }),
      },
      {
        category: 'ORIGINAL_CONTENT_DUPLICATE',
        value: fixture([product(516, [5161, 5162])], [media(5161, 516), media(5162, 516)]),
        read: () => ({ ...goodEvidence({ id: 5161 }), contentDigest: 'b'.repeat(64) }),
      },
      {
        category: 'AGGREGATE_EVIDENCE_BUDGET_EXCEEDED',
        value: fixture([product(517, [5171])], [media(5171, 517)]),
        read: () => ({
          ok: false,
          code: 'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED',
          consumedByteCount: 0,
          knownPixelCount: 0,
        }),
      },
    ]
    assert.deepEqual(
      categoryCases.map((entry) => entry.category),
      [...FRESH_CANDIDATE_PRIMARY_ELIMINATION_CATEGORIES],
    )
    for (const entry of categoryCases) {
      const report = await run(entry.value, entry.read)
      assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE', entry.category)
      const value = diagnostics(report)
      assert.equal(value.queriedProductCount, 1)
      assert.equal(value.assessedProductCount, 1)
      assert.equal(value.eligibleCandidateCount, 0)
      assert.equal(value.eliminatedProductCount, 1)
      assert.equal(value.primaryEliminationCounts[entry.category], 1)
      assert.equal(Object.values(value.primaryEliminationCounts).filter((count) => count !== 0).length, 1)
      assertReconciled(value)
    }
  }

  {
    const values = fixture(
      [
        product(520, [5201], { status: 'active' }),
        product(521, [5211, 5211]),
        product(522, [5221]),
        product(523, [5231]),
      ],
      [media(5201, 520), media(5211, 521), media(5221, 522), media(5231, 523)],
    )
    values.receiptsByProduct.set(522, [{ id: 1 }])
    values.storiesByProduct.set(523, [{ id: 1 }])
    const value = diagnostics(await run(values))
    assert.equal(value.queriedProductCount, 4)
    assert.equal(value.eliminatedProductCount, 4)
    assert.equal(value.primaryEliminationCounts.PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE, 1)
    assert.equal(value.primaryEliminationCounts.ORDERED_IMAGE_RELATIONSHIP_INVALID, 1)
    assert.equal(value.primaryEliminationCounts.DURABLE_QUEUE_RECEIPT_PRESENT, 1)
    assert.equal(value.primaryEliminationCounts.STORY_JOB_HISTORY_PRESENT, 1)
    assertReconciled(value)
  }

  const rejectedCases: Array<{ name: string; value: Fixture; read?: typeof goodEvidence }> = []
  rejectedCases.push({
    name: 'wrong state',
    value: fixture([product(21, [211], { status: 'active' })], [media(211, 21)]),
  })
  rejectedCases.push({
    name: 'generated media',
    value: fixture([product(22, [221])], [media(221, 22, { type: 'generated' })]),
  })
  {
    const value = fixture([product(23, [231])], [media(231, 99)])
    value.mediaByProduct.set(23, [media(231, 99)])
    rejectedCases.push({ name: 'foreign media', value })
  }
  rejectedCases.push({
    name: 'duplicate media identity',
    value: fixture([product(24, [241, 241])], [media(241, 24)]),
  })
  rejectedCases.push({
    name: 'duplicate decoded content',
    value: fixture([product(25, [251, 252])], [media(251, 25), media(252, 25)]),
    read: () => ({ ...goodEvidence({ id: 251 }), contentDigest: 'a'.repeat(64) }),
  })
  rejectedCases.push({
    name: 'generated gallery',
    value: fixture([product(26, [261], { generativeGallery: [{ image: 999 }] })], [media(261, 26)]),
  })
  {
    const value = fixture([product(28, [281])], [media(281, 28)])
    value.galleryOwners = [{ id: 999, generativeGallery: [{ image: 281 }] }]
    rejectedCases.push({ name: 'foreign generated gallery ownership', value })
  }
  for (const code of [
    'ORIGINAL_BODY_EMPTY',
    'ORIGINAL_MIME_MISMATCH',
    'ORIGINAL_AGGREGATE_BYTE_LIMIT_EXCEEDED',
    'ORIGINAL_AGGREGATE_PIXEL_LIMIT_EXCEEDED',
    'ORIGINAL_AGGREGATE_TIMEOUT',
    'ORIGINAL_DECODE_FAILED',
    'ORIGINAL_MULTIPAGE_UNSUPPORTED',
  ] as const) {
    rejectedCases.push({
      name: code,
      value: fixture([product(27, [271])], [media(271, 27)]),
      read: () => ({ ok: false, code, consumedByteCount: 0, knownPixelCount: 0 }),
    })
  }
  for (const entry of rejectedCases) {
    const report = await run(entry.value, entry.read)
    assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE', entry.name)
  }

  // Product 77 reviewer reproduction: removing historical generated Media from
  // Product.images cannot manufacture freshness because the complete
  // Product-scoped Media census still carries the lineage evidence.
  {
    const cleanOriginal = media(771, 77)
    const reviewerScenario = fixture(
      [product(77, [771])],
      [
        cleanOriginal,
        media(772, 77, {
          type: 'enhanced',
          generationLineage: {
            contractVersion: 'image-slot-contract/v1',
            jobId: '7',
            attemptId: 'iga_77777777-7777-4777-8777-777777777777',
            slotId: 'side',
          },
        }),
      ],
    )
    assert.equal((await run(reviewerScenario)).readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE')

    const exactCases: Array<{ name: string; media: RecordValue[]; owners?: RecordValue[]; readiness?: string }> = [
      {
        name: 'referenced clean original',
        media: [cleanOriginal],
        readiness: 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION',
      },
      {
        name: 'unreferenced original lineage',
        media: [cleanOriginal, media(773, 77, { generationLineage: { jobId: '7' } })],
      },
      {
        name: 'unreferenced generated Media',
        media: [cleanOriginal, media(774, 77, { type: 'generated' })],
      },
      {
        name: 'unreferenced generated ownership',
        media: [cleanOriginal, media(775, 77)],
        owners: [{ id: 900, generativeGallery: [{ image: 775 }] }],
      },
      {
        name: 'malformed lineage',
        media: [cleanOriginal, media(776, 77, { generationLineage: 'malformed' })],
        readiness: 'CANDIDATE_DISCOVERY_UNSUPPORTED',
      },
      {
        name: 'contradictory original provenance',
        media: [cleanOriginal, media(777, 77, { generationProvenance: { jobId: '7' } })],
        readiness: 'CANDIDATE_DISCOVERY_UNSUPPORTED',
      },
    ]
    for (const entry of exactCases) {
      const value = fixture([product(77, [771])], entry.media)
      value.galleryOwners = entry.owners ?? []
      const report = await run(value)
      assert.equal(report.readiness, entry.readiness ?? 'NO_ELIGIBLE_FRESH_CANDIDATE', entry.name)
      assert.notEqual(report.readiness, entry.name === 'referenced clean original'
        ? 'NO_ELIGIBLE_FRESH_CANDIDATE'
        : 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    }
  }

  {
    const value = fixture([product(78, [781])], [media(781, 78)])
    value.mediaByProduct.set(78, [media(781, 78), media(881, 88)])
    assert.equal((await run(value)).readiness, 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
  }

  {
    const value = fixture([product(79, [791])], [media(791, 79)])
    value.mediaByProduct.set(79, [media(791, 79), media(792, 79, { product: {} })])
    const report = await run(value)
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.deepEqual(report.reasonCodes, ['MEDIA_PRODUCT_ASSOCIATION_AMBIGUOUS'])
    assert.equal(report.diagnostics, undefined)
  }

  for (const surface of ['jobs', 'receipts', 'events', 'stories'] as const) {
    const value = fixture([product(30, [301])], [media(301, 30)])
    const record = { id: 1, ...(surface === 'jobs' ? { generationAttempts: [{ attemptId: 'iga_x' }] } : {}) }
    if (surface === 'jobs') value.jobsByProduct.set(30, [record])
    if (surface === 'receipts') value.receiptsByProduct.set(30, [record])
    if (surface === 'events') value.eventsByProduct.set(30, [{ ...record, product: 99, eventType: 'content.requested', status: 'processed' }])
    if (surface === 'stories') value.storiesByProduct.set(30, [record])
    const report = await run(value)
    assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE', surface)
  }

  {
    const value = fixture([product(31, [311])], [media(311, 31)])
    value.eventsByProduct.set(31, [{ id: 1, product: 31, eventType: 'content.requested', status: 'processed' }])
    assert.equal((await run(value)).readiness, 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    value.eventsByProduct.set(31, [{ id: 2, product: 31, eventType: 'product.activated', status: 'processed' }])
    assert.equal((await run(value)).readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE')
  }

  for (const status of ['pending', 'processed', 'failed', 'ignored']) {
    const value = fixture([product(31, [311])], [media(311, 31)])
    value.eventsByProduct.set(31, [{ id: 1, product: 31, eventType: 'product.activated', status }])
    const report = await run(value)
    const active = status === 'pending' || status === 'processed'
    assert.equal(report.readiness, active ? 'NO_ELIGIBLE_FRESH_CANDIDATE' : 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    const counts = diagnostics(report)
    assert.equal(counts.eligibleCandidateCount, active ? 0 : 1)
    assert.equal(counts.primaryEliminationCounts.BOT_EVENT_HISTORY_UNSAFE, active ? 1 : 0)
    assertReconciled(counts)
  }

  for (const eventType of ['constructor', '__proto__', 'prototype', 'toString', 'valueOf', 'hasOwnProperty', 'future.unknown']) {
    for (const failedPass of [0, 1] as const) await assertUnknownBotEvent(eventType, failedPass)
  }

  await assertCompleteBotEventValidation()

  for (let index = 0; index < HISTORY_PRIORITY.length; index += 1) {
    const [condition, category] = HISTORY_PRIORITY[index]
    for (const history of [[condition], HISTORY_PRIORITY.slice(index).map(([entry]) => entry)]) {
      for (const reverse of [false, true]) {
        const value = historyFixture(history)
        const events = [
          ...(value.eventsByProduct.get(32) ?? []),
          { id: 3, product: 32, eventType: 'content.requested', status: 'processed' },
        ]
        value.eventsByProduct.set(32, reverse ? events.reverse() : events)
        const report = await run(value)
        assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE', `recognized history: ${history.join('+')}`)
        const counts = diagnostics(report)
        assert.equal(counts.primaryEliminationCounts[category], 1, 'normal history priority must remain unchanged')
        assert.equal(primaryEliminationTotal(counts), 1)
        assertReconciled(counts)
      }
    }
  }

  for (const eventType of ['content.requested', 'publish.rejected', 'product.activated']) {
    for (const status of ['pending', 'processed', 'failed', 'ignored']) {
      if (eventType === 'product.activated' && (status === 'pending' || status === 'processed')) continue
      const value = historyFixture([])
      value.eventsByProduct.set(32, [{ id: 1, product: 32, eventType, status }])
      assert.equal((await run(value)).readiness, 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    }
  }

  {
    const value = fixture([product(32, [321])], [media(321, 32)])
    value.eventsByProduct.set(32, [{ id: 1, product: 32, eventType: 'future.unknown', status: 'processed' }])
    const report = await run(value)
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.deepEqual(report.reasonCodes, ['BOT_EVENT_TAXONOMY_UNSUPPORTED'])
    assert.equal(report.diagnostics, undefined)
  }

  {
    const base = fixture([product(40, [401])], [media(401, 40)])
    const malformed: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async (_requestedPage, limit) => ({
        docs: [base.products[0]], totalDocs: 2, page: 1, totalPages: 1, hasNextPage: false, limit,
      }),
    }
    const report = await discoverFreshVisualProducts({ gateway: malformed, readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.ok(report.reasonCodes.includes('PRODUCT_PAGINATION_MALFORMED'))
    assert.equal(report.diagnostics, undefined)
  }

  {
    const docs = Array.from({ length: 26 }, (_, index) => product(index + 50, [5000 + index]))
    const base = fixture(docs, docs.map((entry, index) => media(5000 + index, Number(entry.id))))
    const driftingTotals: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async (requestedPage, limit) => {
        const current = requestedPage === 2 ? [...base.products, product(76, [5026])] : base.products
        return page(current, requestedPage, limit)
      },
    }
    const report = await discoverFreshVisualProducts({ gateway: driftingTotals, readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.ok(report.reasonCodes.includes('PRODUCT_TOTAL_DRIFT'))
    assert.equal(report.diagnostics, undefined)
  }

  {
    const docs = Array.from({ length: 26 }, (_, index) => product(index + 100, [6000 + index]))
    const base = fixture(docs, [])
    const duplicateAcrossPages: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async (requestedPage, limit) => {
        const result = page(base.products, requestedPage, limit)
        return requestedPage === 2 ? { ...result, docs: [base.products[0]] } : result
      },
    }
    const report = await discoverFreshVisualProducts({ gateway: duplicateAcrossPages, readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.ok(report.reasonCodes.includes('PRODUCT_DUPLICATE_ID'))
    assert.equal(report.diagnostics, undefined)
  }

  {
    const docs = Array.from({ length: 101 }, (_, index) => product(index + 200, [7000 + index]))
    const base = fixture(docs, [])
    const report = await discoverFreshVisualProducts({ gateway: gateway(base), readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.ok(report.reasonCodes.includes('PRODUCT_PAGINATION_TRUNCATED'))
    assert.equal(report.diagnostics, undefined)
  }

  {
    const docs = Array.from({ length: 100 }, (_, index) => product(index + 1000, [8000 + index], { status: 'active' }))
    const base = fixture(docs, [])
    const pages: number[] = []
    const report = await discoverFreshVisualProducts({
      gateway: {
        ...gateway(base),
        readProductPage: async (requestedPage, limit) => {
          assert.equal(limit, 25)
          pages.push(requestedPage)
          return page(docs, requestedPage, limit)
        },
      },
      readMediaEvidence: async () => { throw new Error('eliminated rows must not read images') },
    })
    assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE')
    assert.deepEqual(pages, [1, 2, 3, 4, 1, 2, 3, 4])
    const value = diagnostics(report)
    assert.deepEqual(
      [value.queriedProductCount, value.assessedProductCount, value.eligibleCandidateCount, value.eliminatedProductCount],
      [100, 100, 0, 100],
    )
    assert.equal(value.primaryEliminationCounts.PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE, 100)
    assertReconciled(value)
  }

  for (const budget of [
    { name: 'byte exhaustion', bytes: 8_000_000, pixels: 1_000_000, byteLimits: [10_000_000, 10_000_000, 8_000_000], pixelLimits: [40_000_000, 40_000_000, 40_000_000] },
    { name: 'byte overflow defense', bytes: 10_000_000, pixels: 1_000_000, byteLimits: [10_000_000, 10_000_000, 4_000_000], pixelLimits: [40_000_000, 40_000_000, 40_000_000] },
    { name: 'pixel exhaustion', bytes: 1_000, pixels: 25_000_000, byteLimits: [10_000_000, 10_000_000, 10_000_000, 10_000_000], pixelLimits: [40_000_000, 40_000_000, 40_000_000, 25_000_000] },
    { name: 'pixel overflow defense', bytes: 1_000, pixels: 40_000_000, byteLimits: [10_000_000, 10_000_000, 10_000_000], pixelLimits: [40_000_000, 40_000_000, 20_000_000] },
  ]) {
    // Overflow must occur on the final original, so the next-iteration
    // exhaustion guard cannot hide removal of the immediate overflow guard.
    const imageIds = [6101, 6102, 6103, 6104, 6105].slice(0, budget.name.includes('overflow') ? 3 : 5)
    const base = fixture([product(610, imageIds)], imageIds.map((id) => media(id, 610)))
    const reads: number[] = []
    const byteLimits: number[] = []
    const pixelLimits: number[] = []
    const report = await discoverFreshVisualProducts({
      gateway: gateway(base),
      now: () => 0,
      readMediaEvidence: async (entry, limits) => {
        reads.push(Number(entry.id))
        byteLimits.push(limits.maxBytes!)
        pixelLimits.push(limits.maxInputPixels!)
        assert.equal(limits.timeoutMs, 15_000)
        // Successful synthetic reads accumulate real counters. No final failure
        // code is injected; overflow cases additionally exercise the caller's guard.
        return {
          ...goodEvidence(entry),
          width: budget.pixels === 1_000_000 ? 1000 : budget.pixels / 5000,
          height: budget.pixels === 1_000_000 ? 1000 : 5000,
          byteSize: budget.bytes,
          consumedByteCount: budget.bytes,
          knownPixelCount: budget.pixels,
        }
      },
    })
    assert.equal(report.readiness, 'NO_ELIGIBLE_FRESH_CANDIDATE', budget.name)
    const value = diagnostics(report)
    assert.equal(value.primaryEliminationCounts.AGGREGATE_EVIDENCE_BUDGET_EXCEEDED, 1, budget.name)
    assert.equal(value.eliminatedProductCount, 1)
    assertReconciled(value)
    const expectedReads = imageIds.slice(0, budget.byteLimits.length)
    assert.deepEqual(reads, [...expectedReads, ...expectedReads], `${budget.name}: no later original may be read`)
    assert.deepEqual(byteLimits, [...budget.byteLimits, ...budget.byteLimits])
    assert.deepEqual(pixelLimits, [...budget.pixelLimits, ...budget.pixelLimits])
  }

  for (const failedPass of [0, 1] as const) {
    const base = fixture([product(620, [6201, 6202])], [media(6201, 620), media(6202, 620)])
    let clock = 0
    let productReads = 0
    let imageReads = 0
    const report = await discoverFreshVisualProducts({
      now: () => clock,
      gateway: {
        ...gateway(base),
        readProductPage: async (requestedPage, limit) => {
          productReads += 1
          if (failedPass === 1 && productReads === 2) clock = 45_000
          return page(base.products, requestedPage, limit)
        },
      },
      readMediaEvidence: async (entry) => {
        imageReads += 1
        if (failedPass === 0) clock = 45_000
        return goodEvidence(entry)
      },
    })
    assertUnsupported(report, 'DISCOVERY_OBSERVATION_TIMEOUT', failedPass)
    assert.equal(imageReads, failedPass === 0 ? 1 : 2, 'deadline must stop subsequent image reads')
    assert.equal(productReads, failedPass + 1)
  }

  for (const surface of ['empty-product-page', 'original-success', 'story-history', 'original-failure', 'product-read-failure', 'original-read-failure'] as const) {
    for (const targetPass of [0, 1] as const) {
      for (const finishedAt of [44_999, 45_000, 90_000]) {
        await assertTerminalReadDeadline(surface, targetPass, finishedAt)
      }
    }
  }
  await assertCompletionDeadline('snapshot', 0)
  await assertCompletionDeadline('snapshot', 1)
  await assertCompletionDeadline('report', 1)

  {
    const base = fixture([product(80, [801])], [media(801, 80)])
    let productReads = 0
    const drifting: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async (requestedPage, limit) => {
        productReads += 1
        const current = productReads === 1 ? base.products : [product(80, [801], { stockNumber: 'SN0081' })]
        return page(current, requestedPage, limit)
      },
    }
    const report = await discoverFreshVisualProducts({ gateway: drifting, readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_STATE_DRIFTED')
    assert.equal(report.diagnostics, undefined)
  }

  {
    const first = eliminatedSnapshot()
    first.candidates = [{
      productId: 82,
      stockNumber: 'SN0082',
      usableOriginalCount: 1,
      evidenceClassification: 'COMPLETE_VISUAL_ONLY_EVIDENCE_DOWNSTREAM_AUTHORITY_UNAVAILABLE',
      reasonCodes: ['PUBLISHING_AUTHORITY_UNAVAILABLE'],
      eligibleForVisualOnlyGeneration: true,
      eligibleForPublishing: false,
      stateDigest: 'd'.repeat(64),
    }]
    first.diagnostics.queriedProductCount = 2
    first.diagnostics.assessedProductCount = 2
    first.diagnostics.eligibleCandidateCount = 1
    const second = structuredClone(first)
    second.diagnostics.primaryEliminationCounts.PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE = 0
    second.diagnostics.primaryEliminationCounts.ORDERED_IMAGE_RELATIONSHIP_INVALID = 1
    // The pure production finalizer receives identical pre-diagnostic state.
    // No Product field, candidate digest, observation digest, or reader changes.
    const { diagnostics: firstDiagnostics, ...firstOrdinaryState } = first
    const { diagnostics: secondDiagnostics, ...secondOrdinaryState } = second
    assert.deepEqual(firstOrdinaryState, secondOrdinaryState)
    assert.notDeepEqual(firstDiagnostics, secondDiagnostics)
    assertReconciled(firstDiagnostics)
    assertReconciled(secondDiagnostics)
    const report = finalizeFreshVisualDiscoveryReport(
      { ok: true, snapshot: first }, { ok: true, snapshot: second },
    )
    assert.equal(report.readiness, 'CANDIDATE_STATE_DRIFTED', 'diagnostic-only drift must be detected')
    assert.deepEqual(report.reasonCodes, ['CANDIDATE_RELEVANT_STATE_CHANGED'])
    assert.equal(report.snapshotsCompleted, 2)
    assert.equal(report.diagnostics, undefined)
    const stable = structuredClone(first)
    stable.diagnostics.primaryEliminationCounts = Object.fromEntries(
      Object.entries(stable.diagnostics.primaryEliminationCounts).reverse(),
    ) as FreshCandidateEliminationDiagnostics['primaryEliminationCounts']
    const accepted = finalizeFreshVisualDiscoveryReport(
      { ok: true, snapshot: first }, { ok: true, snapshot: stable },
    )
    assert.equal(accepted.readiness, 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION')
    assert.deepEqual(accepted.diagnostics, first.diagnostics)
    assert.equal(accepted.candidates[0].productId, 82)
    assert.equal(accepted.candidates[0].eligibleForPublishing, false)
  }

  {
    const invalidCases: Array<[string, (value: FreshCandidateEliminationDiagnostics) => void]> = [
      ['assessed sum', (value) => { value.assessedProductCount = 0 }],
      ['primary sum', (value) => { value.primaryEliminationCounts.PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE = 0 }],
      ['assessed exceeds queried', (value) => { value.queriedProductCount = 0 }],
      ['negative count', (value) => {
        value.primaryEliminationCounts.PRODUCT_LIFECYCLE_OR_WORKFLOW_UNSAFE = -1
        value.primaryEliminationCounts.ORDERED_IMAGE_RELATIONSHIP_INVALID = 2
      }],
      ['non-integer count', (value) => { value.queriedProductCount = 1.5 }],
      ['unsafe integer', (value) => { value.queriedProductCount = Number.MAX_SAFE_INTEGER + 1 }],
      ['Product bound exceeded', (value) => { value.queriedProductCount = 101 }],
      ['nonfinite count', (value) => { value.queriedProductCount = Number.POSITIVE_INFINITY }],
    ]
    for (const [name, invalidate] of invalidCases) {
      const invalid = eliminatedSnapshot()
      invalidate(invalid.diagnostics)
      for (const failedPass of [0, 1] as const) {
        const report = finalizeFreshVisualDiscoveryReport(
          { ok: true, snapshot: failedPass === 0 ? invalid : eliminatedSnapshot() },
          { ok: true, snapshot: invalid },
        )
        assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED', name)
        assertUnsupported(report, 'DIAGNOSTIC_RECONCILIATION_FAILED', failedPass)
      }
    }
  }

  {
    const base = fixture([product(90, [901])], [media(901, 90)])
    const failing: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async () => { throw new Error('postgres://secret-host/raw-password') },
    }
    const report = await discoverFreshVisualProducts({ gateway: failing, readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.equal(report.diagnostics, undefined)
    assert.ok(!JSON.stringify(report).includes('secret-host'))
    assert.deepEqual(Object.keys(gateway(base)).sort(), [
      'readBotEventPage', 'readGeneratedGalleryOwnerPage', 'readImageJobPage', 'readMediaPage', 'readProductPage', 'readQueueReceiptPage', 'readStoryJobPage',
    ])
  }

  console.log('freshVisualProductDiscovery: ALL OK')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
