import assert from 'node:assert/strict'

import {
  discoverFreshVisualProducts,
  parseFreshVisualDiscoveryArgs,
  type FreshVisualDiscoveryGateway,
  type FreshVisualDiscoveryPage,
} from './freshVisualProductDiscovery'
import type { VisualPilotMediaReadResult } from './visualPilotMediaEvidence'

type RecordValue = Record<string, unknown>

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
    readGeneratedGalleryOwnerPage: async (_mediaIds, requestedPage, limit) => page(value.galleryOwners, requestedPage, limit),
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

async function main(): Promise<void> {
  assert.deepEqual(parseFreshVisualDiscoveryArgs([]), { ok: false, code: 'READ_ONLY_CONFIRMATION_REQUIRED' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--query=x']), { ok: false, code: 'UNKNOWN_ARGUMENT' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--confirm-read-only', '--confirm-read-only']), { ok: false, code: 'DUPLICATE_ARGUMENT' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--confirm-read-only']), { ok: true, helpRequested: false })

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
    assert.equal(report.snapshotsCompleted, 2)
  }
  {
    const value = fixture(
      [product(14, [141]), product(15, [151, 152]), product(16, [161, 162, 163])],
      [media(141, 14), media(151, 15), media(152, 15), media(161, 16), media(162, 16), media(163, 16)],
    )
    const report = await run(value)
    assert.deepEqual(report.candidates.map((entry) => [entry.productId, entry.usableOriginalCount]), [[16, 3], [15, 2], [14, 1]])
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

  for (const surface of ['jobs', 'receipts', 'events', 'stories'] as const) {
    const value = fixture([product(30, [301])], [media(301, 30)])
    const record = { id: 1, ...(surface === 'jobs' ? { generationAttempts: [{ attemptId: 'iga_x' }] } : {}) }
    if (surface === 'jobs') value.jobsByProduct.set(30, [record])
    if (surface === 'receipts') value.receiptsByProduct.set(30, [record])
    if (surface === 'events') value.eventsByProduct.set(30, [record])
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
  }

  {
    const docs = Array.from({ length: 101 }, (_, index) => product(index + 200, [7000 + index]))
    const base = fixture(docs, [])
    const report = await discoverFreshVisualProducts({ gateway: gateway(base), readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
    assert.ok(report.reasonCodes.includes('PRODUCT_PAGINATION_TRUNCATED'))
  }

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
  }

  {
    const base = fixture([product(90, [901])], [media(901, 90)])
    const failing: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async () => { throw new Error('postgres://secret-host/raw-password') },
    }
    const report = await discoverFreshVisualProducts({ gateway: failing, readMediaEvidence: async (entry) => goodEvidence(entry) })
    assert.equal(report.readiness, 'CANDIDATE_DISCOVERY_UNSUPPORTED')
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
