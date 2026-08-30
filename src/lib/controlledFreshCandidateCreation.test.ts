import assert from 'node:assert/strict'

import {
  createControlledFreshCandidateOperationScope,
  createControlledFreshCandidate,
  type ControlledFreshCandidateCreationDependencies,
  type ControlledFreshCandidateCreationInput,
} from './controlledFreshCandidateCreation'
import {
  authenticateControlledFreshCandidateReceipt,
  authenticateControlledFreshCandidateReceiptBytes,
  CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES,
  readControlledFreshCandidateCapability,
  resealControlledFreshCandidateReceipt,
  serializeControlledFreshCandidateReceipt,
} from './controlledFreshCandidateReceipt'

const RECEIPT_KEY = new Uint8Array(32).fill(17)
const COMMIT_IDENTITY = '14af0deb7e1825eb5d349c89e1d36897e75fc5a0'
const ENVIRONMENT_IDENTITY = 'controlled-test-environment'
const RECEIPT_DESTINATION_DIGEST = 'a'.repeat(64)

function input(seed = 0): ControlledFreshCandidateCreationInput {
  return {
    executionAuthorization: {
      identity: `owner-auth-${1000 + seed}`,
      token: new Uint8Array(32).fill(23 + seed),
    },
    executionId: `execution-${1000 + seed}`,
    authorizationContext: {
      runtimeCommitIdentity: COMMIT_IDENTITY,
      environmentIdentity: ENVIRONMENT_IDENTITY,
      approvedReceiptDestinationDigest: RECEIPT_DESTINATION_DIGEST,
    },
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

function authenticateReceipt(params: {
  serialized: string
  key?: Uint8Array
  consume?: (identity: string) => boolean
  expectedCommitIdentity?: string
  expectedEnvironmentIdentity?: string
}) {
  return authenticateControlledFreshCandidateReceipt({
    serialized: params.serialized,
    key: params.key ?? RECEIPT_KEY,
    expectedCommitIdentity: params.expectedCommitIdentity ?? COMMIT_IDENTITY,
    expectedEnvironmentIdentity: params.expectedEnvironmentIdentity ?? ENVIRONMENT_IDENTITY,
    consume: params.consume ?? (() => true),
  })
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
  lateBeforeUpload?: boolean
  hangAt?: 'product-create' | 'media-create' | 'relationship-update' | 'finalization-read' | 'finalization-update'
  finalizationInterleave?: 'before-qualification' | 'between-qualification-and-lock' | 'before-update' | 'after-commit'
  teardown?: boolean
  authorityClose?: boolean
  failFinalPersist?: boolean
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
  let teardownOccurred = false
  const now = options.now ?? (() => syntheticNow)
  const scope = createControlledFreshCandidateOperationScope({ now })
  let mutationRevoked = false
  const markMutationRevoked = () => {
    if (mutationRevoked) return
    mutationRevoked = true
    events.push('mutation-revoke')
  }
  scope.registerCancellation(async () => {
    markMutationRevoked()
  })
  const lateResult = <T>(phase: NonNullable<FixtureOptions['hangAt']>, result: T): Promise<T> | null => {
    if (options.hangAt !== phase) return null
    syntheticNow = scope.deadline
    return new Promise<T>((resolve) => {
      setTimeout(() => {
        events.push(`late-${phase}-settled`)
        resolve(result)
      }, 15)
    })
  }
  const productId = options.productId === undefined ? 77 : options.productId
  const mediaId = 501
  const dependencies: ControlledFreshCandidateCreationDependencies = {
    scope,
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
      const late = lateResult('product-create', null)
      if (late) return late
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
      const lateMedia = lateResult('media-create', null)
      if (lateMedia) return lateMedia
      if (options.mediaHang) {
        syntheticNow = 46_000
        return new Promise<null>((resolve) => {
          setTimeout(() => {
            events.push('late-media-settled')
            resolve(null)
          }, 15)
        })
      }
      if (options.lateBeforeUpload) {
        events.push('pre-upload-hook')
        syntheticNow = scope.deadline
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            events.push('late-pre-upload-settled')
            resolve()
          }, 15)
        })
      }
      await uploads.beforeUpload(file.name)
      events.push('storage-upload-dispatch')
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
      const late = lateResult('relationship-update', null)
      if (late) return late
      if (product) product.images = [{ image: imageId }]
      return { id }
    },
    finalizeProduct: async () => {
      events.push('product-finalize')
      if (options.failAt === 'finalize') throw new Error('synthetic finalization error')
      const qualification = lateResult('finalization-read', { affected: 0 })
      if (qualification) return qualification
      if (options.finalizationInterleave && options.finalizationInterleave !== 'after-commit') {
        events.push(`concurrent-${options.finalizationInterleave}`)
        if (product) product.featured = true
        return { affected: 0 }
      }
      if (product && typeof product.workflow === 'object' && product.workflow) {
        const update = lateResult('finalization-update', { affected: 0 })
        if (update) return update
        ;(product.workflow as Record<string, unknown>).confirmationStatus = 'pending'
      }
      events.push('product-finalize-update')
      if (options.finalizationInterleave === 'after-commit' && product) product.featured = true
      return { affected: 1 }
    },
    persistPrivateReceipt: async (serialized) => {
      events.push('receipt-persist')
      if (options.failFinalPersist && teardownOccurred) {
        events.push('final-receipt-persist-failed')
        throw new Error('synthetic final receipt persistence error')
      }
      if (options.failAt === 'persist') throw new Error('synthetic persistence error')
      receipts.push(serialized)
    },
    revokeMutationCapability: async () => { markMutationRevoked() },
    teardown: async () => {
      events.push('teardown')
      teardownOccurred = true
      return options.teardown === false ? { ok: false } : { ok: true }
    },
    closeAuthorityResources: async () => {
      events.push('authority-close')
      return options.authorityClose === false ? { ok: false } : { ok: true }
    },
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
    assert.ok(state.events.lastIndexOf('teardown') < state.events.lastIndexOf('receipt-persist'))
    assert.ok(state.events.lastIndexOf('receipt-persist') < state.events.lastIndexOf('authority-close'))

    const finalSerialized = state.receipts.at(-1)
    assert.ok(finalSerialized)
    const consumedReceipts = new Set<string>()
    const consume = (identity: string) => {
      if (consumedReceipts.has(identity)) return false
      consumedReceipts.add(identity)
      return true
    }
    const capability = authenticateReceipt({ serialized: finalSerialized, consume })
    const receipt = readControlledFreshCandidateCapability(capability)
    assert.equal(receipt.product.id, 77)
    assert.equal(receipt.media.id, 501)
    assert.equal(receipt.storageLedger.length, 1)
    assert.equal(receipt.storageLedger[0]?.state, 'known_present')
    assert.equal(receipt.teardown.completed, true)
    assert.throws(
      () => authenticateReceipt({ serialized: finalSerialized, consume }),
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
      () => authenticateReceipt({ serialized: JSON.stringify(edited) }),
      /AUTHENTICATION_FAILED/,
    )
    assert.throws(
      () => authenticateReceipt({ serialized, key: new Uint8Array(32).fill(99) }),
      /AUTHENTICATION_FAILED/,
    )
    assert.throws(
      () => authenticateReceipt({ serialized: '{' }),
      /NONCANONICAL|MALFORMED/,
    )
    const polluted = JSON.parse(serialized) as Record<string, unknown>
    polluted.unexpected = true
    assert.throws(
      () => authenticateReceipt({ serialized: JSON.stringify(polluted) }),
      /NONCANONICAL|MALFORMED/,
    )
    assert.equal(result.eligibleForPublishing, false)

    const parsed = JSON.parse(serialized) as Record<string, unknown>
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(parsed).reverse()))
    const duplicateKey = serialized.replace('{', '{"version":"duplicate",')
    for (const noncanonical of [
      ` ${serialized}`,
      `${serialized}\n`,
      `\uFEFF${serialized}`,
      JSON.stringify(parsed, null, 2),
      reordered,
      duplicateKey,
    ]) {
      assert.throws(() => authenticateReceipt({ serialized: noncanonical }), /NONCANONICAL|MALFORMED/)
    }

    const validBytes = Buffer.from(serialized, 'utf8')
    assert.doesNotThrow(() => authenticateControlledFreshCandidateReceiptBytes({
      bytes: validBytes,
      key: RECEIPT_KEY,
      expectedCommitIdentity: COMMIT_IDENTITY,
      expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
      expectedReceiptDestinationDigest: RECEIPT_DESTINATION_DIGEST,
      consume: () => true,
    }))
    for (const invalidBytes of [
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), validBytes]),
      Buffer.from([0xc0, 0xaf]),
      Buffer.from([0xe2, 0x82]),
      Buffer.from([0xed, 0xa0, 0x80]),
      Buffer.from([0xf4, 0x90, 0x80, 0x80]),
      Buffer.concat([validBytes, Buffer.from([0x80])]),
    ]) {
      let consumed = 0
      assert.throws(() => authenticateControlledFreshCandidateReceiptBytes({
        bytes: invalidBytes,
        key: RECEIPT_KEY,
        expectedCommitIdentity: COMMIT_IDENTITY,
        expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
        expectedReceiptDestinationDigest: RECEIPT_DESTINATION_DIGEST,
        consume: () => { consumed += 1; return true },
      }), /BYTES_INVALID/)
      assert.equal(consumed, 0)
    }

    for (const substitution of ['77', 77, true, null]) {
      const changed = structuredClone(parsed)
      changed.executionId = substitution
      assert.throws(
        () => authenticateReceipt({ serialized: JSON.stringify(changed) }),
        /NONCANONICAL|MALFORMED|AUTHENTICATION_FAILED/,
      )
    }
    const omitted = structuredClone(parsed)
    delete omitted.executionId
    assert.throws(() => authenticateReceipt({ serialized: JSON.stringify(omitted) }), /NONCANONICAL|MALFORMED/)

    const negativeZeroReceipt = readControlledFreshCandidateCapability(authenticateReceipt({ serialized }))
    assert.throws(
      () => resealControlledFreshCandidateReceipt(negativeZeroReceipt, RECEIPT_KEY, (draft) => {
        draft.budgets.stockCandidates = -0
      }),
      /SHAPE_INVALID/,
    )
    assert.throws(
      () => resealControlledFreshCandidateReceipt(negativeZeroReceipt, RECEIPT_KEY, (draft) => {
        draft.product.id = Number.MAX_SAFE_INTEGER + 1
      }),
      /SHAPE_INVALID/,
    )
    for (const nonFinite of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.throws(
        () => resealControlledFreshCandidateReceipt(negativeZeroReceipt, RECEIPT_KEY, (draft) => {
          draft.manifest.positivePrice = nonFinite
        }),
        /SHAPE_INVALID/,
      )
    }
    const inherited = Object.assign(Object.create({ inherited: true }), negativeZeroReceipt)
    assert.throws(
      () => serializeControlledFreshCandidateReceipt(inherited),
      /SHAPE_INVALID/,
    )
    assert.throws(
      () => authenticateReceipt({ serialized, expectedCommitIdentity: 'different-commit' }),
      /CONTEXT_MISMATCH/,
    )
    assert.throws(
      () => authenticateReceipt({ serialized, expectedEnvironmentIdentity: 'different-environment' }),
      /CONTEXT_MISMATCH/,
    )
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

  for (const finalizationInterleave of [
    'before-qualification',
    'between-qualification-and-lock',
    'before-update',
  ] as const) {
    const state = fixture({ finalizationInterleave })
    const result = await createControlledFreshCandidate(input(60 + finalizationInterleave.length), state.dependencies)
    assert.equal(result.verdict, 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['FINALIZATION_FAILED'])
    assert.equal(state.events.includes(`concurrent-${finalizationInterleave}`), true)
    assert.equal(state.events.includes('product-finalize-update'), false)
  }

  {
    const state = fixture({ finalizationInterleave: 'after-commit' })
    const result = await createControlledFreshCandidate(input(76), state.dependencies)
    assert.equal(result.verdict, 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['FINALIZATION_READBACK_UNCERTAIN'])
    assert.equal(state.events.filter((event) => event === 'product-finalize-update').length, 1)
  }

  {
    const state = fixture({ teardown: false })
    const result = await createControlledFreshCandidate(input(24), state.dependencies)
    assert.equal(result.verdict, 'CREATION_TEARDOWN_FAILED_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['TEARDOWN_FAILED'])
    assert.equal(result.cleanupStatus, 'failed')
  }

  {
    const state = fixture({ authorityClose: false })
    const result = await createControlledFreshCandidate(input(124), state.dependencies)
    assert.equal(result.verdict, 'CREATION_TEARDOWN_FAILED_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['AUTHORITY_CLOSURE_FAILED'])
    assert.equal(result.cleanupStatus, 'failed')
    assert.ok(state.events.lastIndexOf('receipt-persist') < state.events.lastIndexOf('authority-close'))
  }

  {
    const state = fixture({ failFinalPersist: true })
    const result = await createControlledFreshCandidate(input(125), state.dependencies)
    assert.equal(result.verdict, 'CREATION_RECOVERY_REQUIRED')
    assert.deepEqual(result.reasonCodes, ['PRIVATE_RECEIPT_PERSIST_FAILED'])
    assert.equal(state.events.filter((event) => event === 'final-receipt-persist-failed').length, 1)
    assert.equal(state.events.at(-1), 'authority-close')
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
    assert.equal(state.events.at(-1), 'authority-close')
  }

  {
    const lifecycle: string[] = []
    const scope = createControlledFreshCandidateOperationScope({
      timeoutMs: 5,
      onOperationRegistered: () => { lifecycle.push('operation-registered') },
      onCleanupRegistered: (generation) => { lifecycle.push(`cleanup-${generation}`) },
      onStateChange: (state) => { lifecycle.push(`state-${state}`) },
    })
    let cancellationAcknowledged = false
    let lateCleanupAcknowledged = false
    let lateMutationDispatches = 0
    let releaseCancellation!: () => void
    let releaseLateWork!: () => void
    let releaseLateCleanup!: () => void
    const cancellationGate = new Promise<void>((resolve) => { releaseCancellation = resolve })
    const lateWorkGate = new Promise<void>((resolve) => { releaseLateWork = resolve })
    const lateCleanupGate = new Promise<void>((resolve) => { releaseLateCleanup = resolve })
    scope.registerCancellation(async () => {
      await cancellationGate
      cancellationAcknowledged = true
    })
    await assert.rejects(() => scope.run(async (signal) => {
      lifecycle.push('operation-callback')
      await lateWorkGate
      lifecycle.push(`late-work-released-${scope.state}`)
      scope.registerTerminalization(async () => {
        lifecycle.push('late-cleanup-started')
        await lateCleanupGate
        lateCleanupAcknowledged = true
      })
      if (!signal.aborted) lateMutationDispatches += 1
      return true
    }), /DEADLINE_EXCEEDED/)
    assert.equal(cancellationAcknowledged, false)
    assert.equal(lateCleanupAcknowledged, false)
    let drained = false
    const drain = scope.drain().then(() => { drained = true })
    releaseCancellation()
    releaseLateWork()
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(drained, false, JSON.stringify(lifecycle))
    releaseLateCleanup()
    await drain
    assert.equal(cancellationAcknowledged, true)
    assert.equal(lateCleanupAcknowledged, true)
    assert.equal(lateMutationDispatches, 0)
    assert.equal(scope.state, 'CLOSED')
    scope.close()
  }

  {
    const events: string[] = []
    const cleanupGenerations: number[] = []
    const scope = createControlledFreshCandidateOperationScope({
      onOperationRegistered: () => { events.push('operation-registered') },
      onCleanupRegistered: (generation) => { cleanupGenerations.push(generation) },
      onStateChange: (state) => { events.push(`state:${state}`) },
    })
    await scope.run(async () => { events.push('operation-callback') })
    scope.registerCancellation(async () => {
      events.push('cleanup-one')
      scope.registerTerminalization(async () => { events.push('cleanup-two') })
    })
    await scope.drain()
    assert.ok(events.indexOf('operation-registered') < events.indexOf('operation-callback'))
    assert.deepEqual(cleanupGenerations.length, 2)
    assert.deepEqual(events.filter((event) => event.startsWith('state:')), [
      'state:CANCELLING',
      'state:SEALED_FOR_NON_CLEANUP',
      'state:DRAINING_CLEANUP',
      'state:CLOSED',
    ])
    let refusedCleanupRan = false
    assert.throws(() => scope.registerTerminalization(async () => { refusedCleanupRan = true }), /DEADLINE_EXCEEDED/)
    let refusedOperationRan = false
    await assert.rejects(() => scope.run(async () => { refusedOperationRan = true }), /DEADLINE_EXCEEDED/)
    assert.equal(refusedCleanupRan, false)
    assert.equal(refusedOperationRan, false)
  }

  {
    let consumed = 0
    assert.throws(() => authenticateControlledFreshCandidateReceiptBytes({
      bytes: new Uint8Array(CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES + 1),
      key: RECEIPT_KEY,
      expectedCommitIdentity: COMMIT_IDENTITY,
      expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
      consume: () => { consumed += 1; return true },
    }), /BYTES_INVALID/)
    assert.equal(consumed, 0)
  }

  {
    const state = fixture({ mediaHang: true })
    const result = await createControlledFreshCandidate(input(36), state.dependencies)
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.deepEqual(result.reasonCodes, ['DEADLINE_EXCEEDED'])
    assert.equal(state.events.includes('mutation-revoke'), true)
    assert.equal(state.events.includes('relationship-update'), false)
    assert.equal(state.events.filter((event) => event === 'teardown').length, 1)
  }

  for (const hangAt of [
    'product-create',
    'media-create',
    'relationship-update',
    'finalization-read',
    'finalization-update',
  ] as const) {
    const state = fixture({ hangAt })
    const result = await createControlledFreshCandidate(input(80 + hangAt.length), state.dependencies)
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.deepEqual(result.reasonCodes, ['DEADLINE_EXCEEDED'], hangAt)
    assert.equal(state.events.filter((event) => event === 'mutation-revoke').length, 1)
    assert.equal(state.events.includes(`late-${hangAt}-settled`), true)
    assert.ok(
      state.events.indexOf('mutation-revoke') < state.events.indexOf(`late-${hangAt}-settled`),
      hangAt,
    )
    if (hangAt === 'product-create') assert.equal(state.events.includes('transaction-commit'), false)
    if (hangAt === 'media-create') assert.equal(state.events.includes('relationship-update'), false)
    if (hangAt === 'relationship-update') assert.equal(state.events.includes('product-finalize'), false)
    if (hangAt.startsWith('finalization')) assert.equal(state.events.includes('product-finalize-update'), false)
    assert.equal(state.events.filter((event) => event === 'teardown').length, 1)
  }

  {
    const state = fixture({ lateBeforeUpload: true })
    const result = await createControlledFreshCandidate(input(98), state.dependencies)
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.deepEqual(result.reasonCodes, ['DEADLINE_EXCEEDED'])
    assert.equal(state.events.includes('pre-upload-hook'), true)
    assert.equal(state.events.includes('late-pre-upload-settled'), true)
    assert.equal(state.events.includes('storage-upload-dispatch'), false)
    assert.equal(state.events.includes('relationship-update'), false)
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
