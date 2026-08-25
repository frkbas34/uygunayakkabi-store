import assert from 'node:assert/strict'

import type { FreshVisualDiscoveryPage } from '../src/lib/freshVisualProductDiscovery'
import { runFreshVisualProductRuntimeSmoke } from './fresh-visual-product-runtime-smoke'
import { createFreshVisualDiscoveryRuntimeGateway } from './fresh-visual-product-runtime-resources'

function page(docs: unknown[], requestedPage: number, limit: number): FreshVisualDiscoveryPage {
  const totalDocs = docs.length
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  return {
    docs: docs.slice((requestedPage - 1) * limit, requestedPage * limit),
    totalDocs,
    page: requestedPage,
    totalPages,
    hasNextPage: requestedPage < totalPages,
    limit,
  }
}

function product() {
  return {
    id: 91,
    stockNumber: 'SN0091',
    status: 'draft',
    images: [{ image: 911 }],
    generativeGallery: [],
    workflow: { workflowStatus: 'draft', visualStatus: 'pending', confirmationStatus: 'pending', publishStatus: 'not_requested', sellable: false },
    channels: { publishWebsite: false, publishInstagram: false, publishFacebook: false, publishX: false, publishShopier: false },
    channelTargets: [],
    sourceMeta: {
      dispatchedChannels: '[]', shopierSyncStatus: 'not_synced', storyStatus: 'none',
      forceRedispatch: false, previewDispatch: false, externalSyncId: null, lastDispatchedAt: null,
      shopierProductId: null, shopierProductUrl: null, shopierLastSyncAt: null,
      storyQueuedAt: null, storyPublishedAt: null,
    },
    merchandising: { publishedAt: null },
    postToInstagram: false,
  }
}

async function main(): Promise<void> {
  const priorDbPush = process.env.PAYLOAD_DB_PUSH
  try {
    delete process.env.PAYLOAD_DB_PUSH
    let initializes = 0
    const refused = await runFreshVisualProductRuntimeSmoke({
      argv: ['--confirm-read-only'],
      initialize: async () => {
        initializes += 1
        throw new Error('must not initialize')
      },
      io: { stdout: () => undefined, stderr: () => undefined },
    })
    assert.equal(refused, 2)
    assert.equal(initializes, 0)

    process.env.PAYLOAD_DB_PUSH = 'false'
    for (const argv of [[], ['--query=x'], ['--confirm-read-only', '--confirm-read-only']]) {
      initializes = 0
      const code = await runFreshVisualProductRuntimeSmoke({
        argv,
        initialize: async () => { initializes += 1; throw new Error('must not initialize') },
        io: { stdout: () => undefined, stderr: () => undefined },
      })
      assert.equal(code, 2)
      assert.equal(initializes, 0)
    }

    const outputs: string[] = []
    let destroys = 0
    const target = product()
    const media = { id: 911, product: 91, type: 'original', generationLineage: null, mimeType: 'image/jpeg', url: 'https://www.uygunayakkabi.com/media/911.jpg' }
    const code = await runFreshVisualProductRuntimeSmoke({
      argv: ['--confirm-read-only'],
      initialize: async () => ({
        dependencies: {
          gateway: {
            readProductPage: async (requestedPage, limit) => page([target], requestedPage, limit),
            readMediaPage: async (_productId, requestedPage, limit) => page([media], requestedPage, limit),
            readGeneratedGalleryOwnerPage: async (_mediaIds, requestedPage, limit) => page([], requestedPage, limit),
            readImageJobPage: async (_productId, requestedPage, limit) => page([], requestedPage, limit),
            readQueueReceiptPage: async (_productId, requestedPage, limit) => page([], requestedPage, limit),
            readBotEventPage: async (_productId, requestedPage, limit) => page([], requestedPage, limit),
            readStoryJobPage: async (_productId, requestedPage, limit) => page([], requestedPage, limit),
          },
          readMediaEvidence: async () => ({
            ok: true as const, width: 1000, height: 1000, mimeType: 'image/jpeg' as const,
            byteSize: 1000, contentDigest: '9'.repeat(64), consumedByteCount: 1000, knownPixelCount: 1_000_000,
          }),
        },
        destroy: async () => { destroys += 1 },
      }),
      io: { stdout: (text) => outputs.push(text), stderr: () => undefined },
    })
    assert.equal(code, 0)
    assert.equal(destroys, 1)
    assert.match(outputs.join('\n'), /READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION/)
    assert.doesNotMatch(outputs.join('\n'), /media\/911\.jpg/)

    const findCalls: Record<string, unknown>[] = []
    const runtimeGateway = createFreshVisualDiscoveryRuntimeGateway(
      {
        find: async (args) => {
          findCalls.push(args)
          return { docs: [], totalDocs: 0, page: 1, totalPages: 0, hasNextPage: false, limit: 25 }
        },
      },
      { query: async () => ({ rows: [] }), end: async () => undefined },
    )
    await runtimeGateway.readProductPage(1, 25)
    assert.equal(findCalls.length, 1)
    assert.equal(findCalls[0].collection, 'products')
    assert.equal(findCalls[0].sort, 'id')
    assert.match(JSON.stringify(findCalls[0].where), /not_equals.*349/)
    assert.deepEqual(Object.keys(runtimeGateway).sort(), [
      'readBotEventPage', 'readGeneratedGalleryOwnerPage', 'readImageJobPage', 'readMediaPage', 'readProductPage', 'readQueueReceiptPage', 'readStoryJobPage',
    ])
  } finally {
    if (priorDbPush === undefined) delete process.env.PAYLOAD_DB_PUSH
    else process.env.PAYLOAD_DB_PUSH = priorDbPush
  }

  console.log('freshVisualProductRuntimeSmoke: ALL OK')
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
