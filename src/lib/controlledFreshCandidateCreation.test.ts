import assert from 'node:assert/strict'

import {
  createControlledFreshCandidate,
  type ControlledFreshCandidateCreationDependencies,
  type ControlledFreshCandidateCreationInput,
} from './controlledFreshCandidateCreation'
import {
  authenticateControlledFreshCandidateReceipt,
  readControlledFreshCandidateCapability,
  resealControlledFreshCandidateReceipt,
} from './controlledFreshCandidateReceipt'

const RECEIPT_KEY = new Uint8Array(32).fill(17)

function input(seed = 0): ControlledFreshCandidateCreationInput {
  return {
    executionAuthorization: {
      identity: `owner-auth-${1000 + seed}`,
      token: new Uint8Array(24).fill(23 + seed),
    },
    executionId: `execution-${1000 + seed}`,
    manifest: {
      identity: `manifest-${1000 + seed}`,
      title: `Synthetic controlled shoe ${seed}`,
      positivePrice: 999.5,
      provenanceStatement: 'Owner supplied synthetic offline evidence.',
      stockCandidate: `SN${String(1000 + seed).padStart(4, '0')}`,
      original: {
        bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, seed]),
        mimeType: 'image/png',
        width: 32,
        height: 24,
      },
    },
    receiptKey: RECEIPT_KEY,
  }
}

type FixtureOptions = {
  authorization?: boolean
  stockCollision?: boolean
  productId?: unknown
  failAt?: 'stock' | 'begin' | 'create-product' | 'commit' | 'product-readback'
    | 'create-media' | 'media-readback' | 'relationship' | 'relationship-readback'
    | 'finalize' | 'final-readback' | 'persist'
  upload?: 'success' | 'uncertain'
  mediaMismatch?: boolean
  mediaHang?: boolean
  teardown?: boolean
  now?: () => number
  consume?: () => Promise<boolean>
}

function fixture(options: FixtureOptions = {}) {
  const events: string[] = []
  const receipts: string[] = []
  let product: Record<string, unknown> | null = null
  let media: Record<string, unknown> | null = null
  let productReads = 0
  let syntheticNow = 1_000
  const productId = options.productId === undefined ? 77 : options.productId
  const mediaId = 501
  const dependencies: ControlledFreshCandidateCreationDependencies = {
    consumeExecutionAuthorization: async () => {
      events.push('consume-auth')
      if (options.consume) return options.consume()
      return options.authorization ?? true
    },
    stockExists: async () => {
      events.push('stock-lookup')
      if (options.failAt === 'stock') throw new Error('synthetic stock error')
      return options.stockCollision ?? false
    },
    createTransactionRequest: async () => {
      events.push('transaction-request')
      return { id: 'synthetic-request' }
    },
    beginProductTransaction: async () => {
      events.push('transaction-begin')
      return options.failAt !== 'begin'
    },
    createProduct: async (_request, data) => {
      events.push('product-create')
      if (options.failAt === 'create-product') throw new Error('synthetic create error')
      product = { ...structuredClone(data), id: productId }
      return structuredClone(product)
    },
    commitProductTransaction: async () => {
      events.push('transaction-commit')
      if (options.failAt === 'commit') throw new Error('synthetic commit uncertainty')
    },
    rollbackProductTransaction: async () => { events.push('transaction-rollback') },
    readProduct: async (id) => {
      events.push(`product-read:${id}`)
      productReads += 1
      if (
        options.failAt === 'product-readback'
        || (options.failAt === 'relationship-readback' && productReads >= 2)
        || (options.failAt === 'final-readback' && productReads >= 3)
      ) throw new Error('synthetic readback error')
      return structuredClone(product)
    },
    createMedia: async ({ data, file, uploads }) => {
      events.push('media-create')
      if (options.failAt === 'create-media') throw new Error('synthetic media create error')
      if (options.mediaHang) {
        syntheticNow = 46_000
        return new Promise<never>(() => undefined)
      }
      await uploads.beforeUpload(file.name)
      if (options.upload === 'uncertain') {
        await uploads.uploadUncertain(file.name)
        throw new Error('synthetic transport uncertainty')
      }
      await uploads.afterUpload(file.name)
      media = {
        ...structuredClone(data),
        id: mediaId,
        filename: options.mediaMismatch ? `changed-${file.name}` : file.name,
        mimeType: file.mimetype,
      }
      return structuredClone(media)
    },
    readMedia: async (id) => {
      events.push(`media-read:${id}`)
      if (options.failAt === 'media-readback') throw new Error('synthetic media readback error')
      return structuredClone(media)
    },
    updateProductRelationship: async (id, imageId) => {
      events.push('relationship-update')
      if (options.failAt === 'relationship') throw new Error('synthetic relationship error')
      if (product) product.images = [{ image: imageId }]
      return { id }
    },
    finalizeProduct: async (id) => {
      events.push('product-finalize')
      if (options.failAt === 'finalize') throw new Error('synthetic finalization error')
      if (product && typeof product.workflow === 'object' && product.workflow) {
        ;(product.workflow as Record<string, unknown>).confirmationStatus = 'pending'
      }
      return { id }
    },
    persistPrivateReceipt: async (serialized) => {
      events.push('receipt-persist')
      if (options.failAt === 'persist') throw new Error('synthetic persistence error')
      receipts.push(serialized)
    },
    revokeMutationCapability: async () => { events.push('mutation-revoke') },
    teardown: async () => {
      events.push('teardown')
      return options.teardown === false ? { ok: false } : { ok: true }
    },
    randomBytes: () => new Uint8Array(16).fill(31),
    now: options.now ?? (() => syntheticNow),
  }
  return {
    dependencies,
    events,
    receipts,
    getProduct: () => product,
  }
}

function assertPublicReportIsSanitized(report: unknown, sentinels: readonly string[]): void {
  const serialized = JSON.stringify(report)
  assert.deepEqual(Object.keys(report as object).sort(), [
    'cleanupStatus', 'commitCertainty', 'counts', 'eligibleForPublishing', 'ownerInputManifestMatch',
    'phase', 'quarantineCertainty', 'reasonCodes', 'verdict', 'version',
  ].sort())
  for (const sentinel of sentinels) assert.equal(serialized.includes(sentinel), false)
  assert.equal((report as { eligibleForPublishing: boolean }).eligibleForPublishing, false)
}

async function main(): Promise<void> {
  {
    const state = fixture()
    const candidate = input(1)
    const result = await createControlledFreshCandidate(candidate, state.dependencies)
    assert.equal(result.verdict, 'CREATION_COMMITTED_QUARANTINED')
    assert.deepEqual(result.reasonCodes, ['CREATION_COMPLETE'])
    assert.equal(result.phase, 'teardown_observed')
    assert.equal(result.quarantineCertainty, 'pending_observed')
    assert.equal(result.commitCertainty, 'committed_observed')
    assert.equal(result.cleanupStatus, 'complete')
    assert.deepEqual(result.counts, {
      stockCandidates: 1,
      stockLookups: 1,
      productCreates: 1,
      mediaCreates: 1,
      productRelationshipUpdates: 1,
      productFinalizationUpdates: 1,
      explicitMediaUpdates: 0,
      canonicalMediaMetadataUpdates: 1,
      logicalStorageUploads: 1,
    })
    assertPublicReportIsSanitized(result, [
      candidate.manifest.title,
      candidate.manifest.stockCandidate,
      candidate.manifest.provenanceStatement,
      'cfc-execution',
      '501',
    ])
    const product = state.getProduct()
    assert.ok(product)
    assert.equal(product.status, 'draft')
    assert.equal((product.workflow as Record<string, unknown>).sellable, false)
    assert.equal((product.workflow as Record<string, unknown>).confirmationStatus, 'pending')
    assert.deepEqual(product.generativeGallery, [])
    assert.deepEqual(product.channelTargets, [])
    assert.deepEqual(product.channels, {
      publishWebsite: false,
      publishInstagram: false,
      publishFacebook: false,
      publishX: false,
      publishShopier: false,
    })
    assert.equal(state.events.filter((event) => event === 'product-create').length, 1)
    assert.equal(state.events.filter((event) => event === 'media-create').length, 1)

    const finalSerialized = state.receipts.at(-1)
    assert.ok(finalSerialized)
    const capability = authenticateControlledFreshCandidateReceipt({ serialized: finalSerialized, key: RECEIPT_KEY })
    const receipt = readControlledFreshCandidateCapability(capability)
    assert.equal(receipt.product.id, 77)
    assert.equal(receipt.media.id, 501)
    assert.equal(receipt.storageLedger.length, 1)
    assert.equal(receipt.storageLedger[0]?.state, 'known_present')
    assert.equal(receipt.teardown.completed, true)
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({ serialized: finalSerialized, key: RECEIPT_KEY }),
      /REPLAYED/,
    )
    assert.throws(
      () => readControlledFreshCandidateCapability(Object.freeze(Object.create(null))),
      /CAPABILITY_INVALID/,
    )
    assert.throws(
      () => resealControlledFreshCandidateReceipt(receipt, RECEIPT_KEY, (draft) => {
        draft.phase = 'authorization_consumed'
      }),
      /PHASE_REGRESSION/,
    )
  }

  {
    const state = fixture()
    const candidate = input(2)
    const result = await createControlledFreshCandidate(candidate, state.dependencies)
    const serialized = state.receipts.at(-1)
    assert.ok(serialized)
    const edited = JSON.parse(serialized) as Record<string, unknown>
    edited.executionId = 'execution-tampered'
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({ serialized: JSON.stringify(edited), key: RECEIPT_KEY }),
      /AUTHENTICATION_FAILED/,
    )
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({ serialized, key: new Uint8Array(32).fill(99) }),
      /AUTHENTICATION_FAILED/,
    )
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({ serialized: '{', key: RECEIPT_KEY }),
      /MALFORMED/,
    )
    const polluted = JSON.parse(serialized) as Record<string, unknown>
    polluted.unexpected = true
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({ serialized: JSON.stringify(polluted), key: RECEIPT_KEY }),
      /MALFORMED/,
    )
    assert.equal(result.eligibleForPublishing, false)
  }

  {
    const state = fixture({ stockCollision: true })
    const result = await createControlledFreshCandidate(input(3), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['STOCK_COLLISION'])
    assert.equal(state.events.includes('product-create'), false)
    assert.equal(state.events.includes('media-create'), false)
  }

  for (const [productId, expected] of [
    [null, 'PRODUCT_IDENTITY_INVALID'],
    ['77', 'PRODUCT_IDENTITY_INVALID'],
    [-1, 'PRODUCT_IDENTITY_INVALID'],
    [349, 'PRODUCT_IDENTITY_RESERVED'],
  ] as const) {
    const state = fixture({ productId })
    const result = await createControlledFreshCandidate(input(10 + state.events.length), state.dependencies)
    assert.deepEqual(result.reasonCodes, [expected])
    assert.equal(state.events.includes('transaction-rollback'), true)
    assert.equal(state.events.includes('transaction-commit'), false)
    assert.equal(state.events.includes('media-create'), false)
    assert.equal(state.events.includes('product-read:349'), false)
    assert.equal(state.events.filter((event) => event === 'product-create').length, 1)
  }

  {
    const state = fixture({ failAt: 'create-product' })
    const result = await createControlledFreshCandidate(input(20), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['PRODUCT_CREATE_FAILED'])
    assert.equal(state.events.filter((event) => event === 'product-create').length, 1)
    assert.equal(state.events.includes('transaction-rollback'), true)
    assert.equal(state.events.includes('transaction-commit'), false)
  }

  {
    const state = fixture({ failAt: 'begin' })
    const result = await createControlledFreshCandidate(input(27), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['TRANSACTION_UNAVAILABLE'])
    assert.equal(state.events.includes('product-create'), false)
    assert.equal(state.events.includes('transaction-commit'), false)
  }

  {
    const state = fixture({ failAt: 'commit' })
    const result = await createControlledFreshCandidate(input(28), state.dependencies)
    assert.equal(result.verdict, 'CREATION_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['PRODUCT_COMMIT_UNCERTAIN'])
    assert.equal(result.commitCertainty, 'rollback_requested')
    assert.equal(state.events.includes('transaction-rollback'), true)
    assert.equal(state.events.includes('media-create'), false)
  }

  {
    const state = fixture({ failAt: 'create-media' })
    const result = await createControlledFreshCandidate(input(29), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['MEDIA_CREATE_FAILED'])
    assert.equal(result.quarantineCertainty, 'blocked_observed')
    assert.equal(result.counts.logicalStorageUploads, 0)
    assert.equal(state.events.includes('relationship-update'), false)
  }

  {
    const state = fixture({ upload: 'uncertain' })
    const result = await createControlledFreshCandidate(input(21), state.dependencies)
    assert.equal(result.verdict, 'CREATION_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['STORAGE_OUTCOME_UNCERTAIN'])
    assert.equal(result.counts.logicalStorageUploads, 1)
    assert.equal(state.events.includes('relationship-update'), false)
    assert.equal(state.events.some((event) => /delete|detach|replace|retry/i.test(event)), false)
    const receipt = JSON.parse(state.receipts.at(-1) ?? '{}') as { storageLedger?: Array<{ state: string }> }
    assert.equal(receipt.storageLedger?.[0]?.state, 'uncertain')
  }

  {
    const state = fixture({ failAt: 'relationship' })
    const result = await createControlledFreshCandidate(input(22), state.dependencies)
    assert.equal(result.verdict, 'CREATION_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['RELATIONSHIP_UPDATE_FAILED'])
    assert.equal(state.events.includes('product-finalize'), false)
  }

  {
    const state = fixture({ mediaMismatch: true })
    const result = await createControlledFreshCandidate(input(33), state.dependencies)
    assert.equal(result.verdict, 'CREATION_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['MEDIA_STATE_MISMATCH'])
    assert.equal(result.counts.canonicalMediaMetadataUpdates, 1)
    assert.equal(state.events.includes('relationship-update'), false)
  }

  {
    const state = fixture({ failAt: 'relationship-readback' })
    const result = await createControlledFreshCandidate(input(34), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['PREFINALIZATION_STATE_MISMATCH'])
    assert.equal(result.quarantineCertainty, 'blocked_observed')
    assert.equal(state.events.includes('product-finalize'), false)
  }

  {
    const state = fixture({ failAt: 'finalize' })
    const result = await createControlledFreshCandidate(input(35), state.dependencies)
    assert.equal(result.verdict, 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['FINALIZATION_FAILED'])
    assert.equal(result.quarantineCertainty, 'blocked_observed')
    assert.equal(state.events.filter((event) => event === 'product-finalize').length, 1)
    assert.equal(state.events.some((event) => /requarantine|retry/i.test(event)), false)
  }

  {
    const state = fixture({ failAt: 'final-readback' })
    const result = await createControlledFreshCandidate(input(23), state.dependencies)
    assert.equal(result.verdict, 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['FINALIZATION_READBACK_UNCERTAIN'])
    assert.equal(result.quarantineCertainty, 'unknown')
    assert.equal(state.events.filter((event) => event === 'product-finalize').length, 1)
    assert.equal(state.events.filter((event) => event === 'relationship-update').length, 1)
  }

  {
    const state = fixture({ teardown: false })
    const result = await createControlledFreshCandidate(input(24), state.dependencies)
    assert.equal(result.verdict, 'CREATION_TEARDOWN_FAILED_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['TEARDOWN_FAILED'])
    assert.equal(result.cleanupStatus, 'failed')
  }

  {
    let nowCalls = 0
    const state = fixture({
      consume: () => new Promise<boolean>(() => undefined),
      now: () => {
        nowCalls += 1
        return nowCalls >= 3 ? 45_000 : 0
      },
    })
    const result = await createControlledFreshCandidate(input(25), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['DEADLINE_EXCEEDED'])
    assert.equal(state.events.includes('mutation-revoke'), true)
    assert.equal(state.events.includes('stock-lookup'), false)
    assert.equal(state.events.at(-1), 'teardown')
  }

  {
    const state = fixture({ mediaHang: true })
    const result = await createControlledFreshCandidate(input(36), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['DEADLINE_EXCEEDED'])
    assert.equal(state.events.includes('mutation-revoke'), true)
    assert.equal(state.events.includes('relationship-update'), false)
    assert.equal(state.events.filter((event) => event === 'teardown').length, 1)
  }

  {
    const state = fixture({ authorization: false })
    const result = await createControlledFreshCandidate(input(37), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['EXECUTION_AUTHORIZATION_REJECTED'])
    assert.equal(state.events.includes('stock-lookup'), false)
    assert.equal(state.events.includes('product-create'), false)
  }

  {
    const state = fixture({ failAt: 'persist' })
    const result = await createControlledFreshCandidate(input(38), state.dependencies)
    assert.deepEqual(result.reasonCodes, ['PRIVATE_RECEIPT_PERSIST_FAILED'])
    assert.equal(state.events.includes('stock-lookup'), false)
    assert.equal(state.events.includes('product-create'), false)
  }

  {
    const state = fixture()
    const expanded = { ...state.dependencies, deleteProduct: async () => undefined }
    const result = await createControlledFreshCandidate(
      input(26),
      expanded as unknown as ControlledFreshCandidateCreationDependencies,
    )
    assert.deepEqual(result.reasonCodes, ['MUTATION_CAPABILITY_INVALID'])
    assert.deepEqual(state.events, [])
  }

  for (const malformed of [
    null,
    Object.assign(Object.create({ polluted: true }), input(30)),
    { ...input(31), unexpected: true },
    { ...input(32), manifest: null },
  ]) {
    const state = fixture()
    const result = await createControlledFreshCandidate(
      malformed as ControlledFreshCandidateCreationInput,
      state.dependencies,
    )
    assert.deepEqual(result.reasonCodes, ['CONTROLLED_INPUT_INVALID'])
    assert.deepEqual(state.events, [])
  }

  console.log('controlledFreshCandidateCreation: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
