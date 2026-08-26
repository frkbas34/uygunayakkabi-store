import assert from 'node:assert/strict'

import {
  classifyFreshCandidateProductElimination,
  discoverFreshVisualProducts,
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

async function main(): Promise<void> {
  assert.deepEqual(parseFreshVisualDiscoveryArgs([]), { ok: false, code: 'READ_ONLY_CONFIRMATION_REQUIRED' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--query=x']), { ok: false, code: 'UNKNOWN_ARGUMENT' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--confirm-read-only', '--confirm-read-only']), { ok: false, code: 'DUPLICATE_ARGUMENT' })
  assert.deepEqual(parseFreshVisualDiscoveryArgs(['--confirm-read-only']), { ok: true, helpRequested: false })
  assert.throws(
    () => classifyFreshCandidateProductElimination(['FUTURE_UNMAPPED_NORMAL_REJECTION']),
    /DIAGNOSTIC_PRIMARY_ELIMINATION_UNMAPPED/,
  )

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
      [5, 4, 4, 0],
    )
    assert.ok(!Object.keys(diagnostic.primaryEliminationCounts).some((key) => /TELEGRAM|ADVERTISING/.test(key)))
    assertReconciled(diagnostic)
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
    const eligible = product(82, [821])
    const firstEliminated = product(83, [831], { status: 'active' })
    const secondEliminated = product(83, [831, 831])
    const base = fixture([eligible, firstEliminated], [media(821, 82), media(831, 83)])
    let productReads = 0
    const diagnosticDrift: FreshVisualDiscoveryGateway = {
      ...gateway(base),
      readProductPage: async (requestedPage, limit) => {
        productReads += 1
        return page(productReads === 1 ? [eligible, firstEliminated] : [eligible, secondEliminated], requestedPage, limit)
      },
    }
    const report = await discoverFreshVisualProducts({
      gateway: diagnosticDrift,
      readMediaEvidence: async (entry) => goodEvidence(entry),
    })
    assert.equal(report.readiness, 'CANDIDATE_STATE_DRIFTED')
    assert.equal(report.diagnostics, undefined)
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
