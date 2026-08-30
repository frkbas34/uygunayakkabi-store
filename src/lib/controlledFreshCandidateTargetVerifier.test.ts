import assert from 'node:assert/strict'

import {
  controlledFreshCandidateDigest,
  createControlledFreshCandidateOperationScope,
  createControlledFreshCandidateManifestEvidence,
  fixedControlledFreshCandidateProduct,
} from './controlledFreshCandidateCreation'
import {
  authenticateControlledFreshCandidateReceipt,
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
  sealControlledFreshCandidateReceipt,
  serializeControlledFreshCandidateReceipt,
  type ControlledFreshCandidatePrivateReceipt,
  type ControlledFreshCandidateTargetCapability,
} from './controlledFreshCandidateReceipt'
import {
  validateControlledFreshCandidateStrictTargetReport,
  verifyControlledFreshCandidateTarget,
  type ControlledFreshCandidateStrictTargetDependencies,
} from './controlledFreshCandidateTargetVerifier'
import type { FreshVisualDiscoveryPage } from './freshVisualProductDiscovery'

const KEY = new Uint8Array(32).fill(41)
const COMMIT_IDENTITY = '14af0deb7e1825eb5d349c89e1d36897e75fc5a0'
const ENVIRONMENT_IDENTITY = 'strict-test-environment'

function page(docs: unknown[], requestedPage = 1, limit = 100): FreshVisualDiscoveryPage {
  return {
    docs,
    totalDocs: docs.length,
    page: requestedPage,
    totalPages: docs.length === 0 ? 0 : 1,
    hasNextPage: false,
    limit,
  }
}

function receipt(seed: number, options: {
  productId?: number
  mediaId?: number
  incomplete?: boolean
} = {}): ControlledFreshCandidatePrivateReceipt {
  const productId = options.productId ?? 77
  const mediaId = options.mediaId ?? 501
  const manifest = createControlledFreshCandidateManifestEvidence({
    input: {
      identity: `strict-manifest-${seed}`,
      title: `Strict synthetic candidate ${seed}`,
      positivePrice: 875,
      provenanceStatement: 'Synthetic owner evidence for offline target verification.',
      stockCandidate: `SN${String(2000 + seed).padStart(4, '0')}`,
      original: {
        bytes: new Uint8Array([1, 2, 3, 4, seed]),
        mimeType: 'image/png',
        width: 40,
        height: 30,
      },
    },
    expectedFilename: `cfc-strict-execution-${seed}-${String(seed).padStart(32, 'a')}.png`,
  })
  return sealControlledFreshCandidateReceipt({
    version: CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
    executionAuthorization: {
      identity: `strict-owner-${seed}`,
      digest: controlledFreshCandidateDigest(`strict-token-${seed}`),
      consumed: true,
    },
    executionId: `strict-execution-${seed}`,
    manifest,
    runtime: {
      identity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      contract: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
      commit: COMMIT_IDENTITY,
      environment: ENVIRONMENT_IDENTITY,
      receiptDestinationDigest: 'b'.repeat(64),
    },
    stockCandidate: manifest.stockCandidate,
    expectedStateFingerprint: controlledFreshCandidateDigest(fixedControlledFreshCandidateProduct(manifest, 'pending')),
    product: { state: 'retained', id: productId, fingerprint: controlledFreshCandidateDigest({ id: productId }) },
    media: {
      state: 'retained',
      id: mediaId,
      productId,
      expectedFilename: manifest.original.filename,
      actualFilename: manifest.original.filename,
    },
    storageLedger: [{ ordinal: 1, filename: manifest.original.filename, state: 'known_present' }],
    transactions: {
      productCreate: { intent: 'dispatched', certainty: 'observed' },
      mediaCreate: { intent: 'dispatched', certainty: 'observed' },
      relationshipUpdate: { intent: 'dispatched', certainty: 'observed' },
      finalization: { intent: 'dispatched', certainty: options.incomplete ? 'unknown' : 'observed' },
    },
    phase: 'teardown_observed',
    budgets: {
      stockCandidates: 1,
      stockLookups: 1,
      productCreates: 1,
      mediaCreates: 1,
      productRelationshipUpdates: 1,
      productFinalizationUpdates: 1,
      explicitMediaUpdates: 0,
      canonicalMediaMetadataUpdates: 1,
      logicalStorageUploads: 1,
      productDeletes: 0,
      mediaDeletes: 0,
      variantMutations: 0,
      storageDeletes: 0,
      automaticMediaDetachUpdates: 0,
      automaticRequarantineUpdates: 0,
      otherRecordMutations: 0,
      operatorRetries: 0,
      replacementExecutions: 0,
    },
    quarantineCertainty: 'pending_observed',
    commitCertainty: 'committed_observed',
    finalization: { requested: true, observed: !options.incomplete },
    mutationResourceTeardown: { attempted: true, completed: true, status: 'complete' },
    authorityClosure: { status: 'pending_not_attested', boundary: 'outside_durable_receipt' },
  }, KEY)
}

function capability(seed: number, options?: Parameters<typeof receipt>[1]): {
  capability: ControlledFreshCandidateTargetCapability
  receipt: ControlledFreshCandidatePrivateReceipt
} {
  const sealed = receipt(seed, options)
  return {
    capability: authenticateControlledFreshCandidateReceipt({
      serialized: serializeControlledFreshCandidateReceipt(sealed),
      key: KEY,
      expectedCommitIdentity: COMMIT_IDENTITY,
      expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
      consume: () => true,
    }),
    receipt: sealed,
  }
}

type Surface = 'product' | 'media' | 'gallery' | 'jobs' | 'receipts' | 'botEvents' | 'storyJobs' | 'evidence'

function verifierFixture(sealed: ControlledFreshCandidatePrivateReceipt, options: {
  product?: Record<string, unknown>
  media?: Record<string, unknown>[]
  gallery?: Record<string, unknown>[]
  jobs?: Record<string, unknown>[]
  receipts?: Record<string, unknown>[]
  botEvents?: Record<string, unknown>[]
  storyJobs?: Record<string, unknown>[]
  evidenceOk?: boolean
  evidenceOverride?: Partial<{
    contentDigest: string
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
    byteSize: number
    width: number
    height: number
  }>
  malformedPagination?: boolean
  drift?: Surface
  hang?: Surface
  teardown?: boolean
} = {}) {
  const reads: string[] = []
  const calls = new Map<Surface, number>()
  const count = (surface: Surface) => {
    const value = (calls.get(surface) ?? 0) + 1
    calls.set(surface, value)
    return value
  }
  const productId = sealed.product.id as number
  const mediaId = sealed.media.id as number
  const baseProduct = options.product ?? {
    ...fixedControlledFreshCandidateProduct(sealed.manifest, 'pending', mediaId),
    id: productId,
  }
  const baseMedia = options.media ?? [{
    id: mediaId,
    product: productId,
    type: 'original',
    generationLineage: null,
    altText: sealed.manifest.title,
    filename: sealed.manifest.original.filename,
    mimeType: sealed.manifest.original.mimeType,
  }]
  const surfacePage = (surface: Surface, docs: Record<string, unknown>[], requestedPage: number, limit: number) => {
    const call = count(surface)
    if (options.malformedPagination && surface === 'jobs') {
      return { ...page(docs, requestedPage, limit), totalDocs: docs.length + 1 }
    }
    if (options.drift === surface && call >= 2) {
      if (surface === 'media') return page([{ ...baseMedia[0], altText: 'drifted' }], requestedPage, limit)
      return page([{ id: 9_000 + call }], requestedPage, limit)
    }
    return page(docs, requestedPage, limit)
  }
  const dependencies: ControlledFreshCandidateStrictTargetDependencies = {
    gateway: {
      readOwnedProduct: async (id) => {
        reads.push(`product:${id}`)
        if (options.hang === 'product') return new Promise<never>(() => undefined)
        const call = count('product')
        return options.drift === 'product' && call >= 2 ? { ...baseProduct, title: 'drifted' } : structuredClone(baseProduct)
      },
      readMediaPage: async (id, requestedPage, limit) => {
        reads.push(`media:${id}`)
        if (options.hang === 'media') return new Promise<never>(() => undefined)
        return surfacePage('media', baseMedia, requestedPage, limit)
      },
      readGeneratedGalleryOwnerPage: async (_ids, requestedPage, limit) => {
        reads.push('gallery')
        if (options.hang === 'gallery') return new Promise<never>(() => undefined)
        return surfacePage('gallery', options.gallery ?? [], requestedPage, limit)
      },
      readImageJobPage: async (_id, requestedPage, limit) => options.hang === 'jobs'
        ? new Promise<never>(() => undefined)
        : surfacePage('jobs', options.jobs ?? [], requestedPage, limit),
      readQueueReceiptPage: async (_id, requestedPage, limit) => options.hang === 'receipts'
        ? new Promise<never>(() => undefined)
        : surfacePage('receipts', options.receipts ?? [], requestedPage, limit),
      readBotEventPage: async (_id, requestedPage, limit) => options.hang === 'botEvents'
        ? new Promise<never>(() => undefined)
        : surfacePage('botEvents', options.botEvents ?? [], requestedPage, limit),
      readStoryJobPage: async (_id, requestedPage, limit) => options.hang === 'storyJobs'
        ? new Promise<never>(() => undefined)
        : surfacePage('storyJobs', options.storyJobs ?? [], requestedPage, limit),
    },
    readMediaEvidence: async () => {
      if (options.hang === 'evidence') return new Promise<never>(() => undefined)
      const evidenceCall = count('evidence')
      if (options.evidenceOk === false) return { ok: false, code: 'ORIGINAL_DECODE_FAILED' }
      const evidence = {
          ok: true,
          contentDigest: sealed.manifest.original.contentDigest,
          mimeType: sealed.manifest.original.mimeType,
          byteSize: sealed.manifest.original.byteSize,
          width: sealed.manifest.original.width,
          height: sealed.manifest.original.height,
          ...options.evidenceOverride,
        } as const
      return options.drift === 'evidence' && evidenceCall >= 2
        ? { ...evidence, width: evidence.width + 1 }
        : evidence
    },
    now: () => 1_000,
    operationScope: options.hang
      ? createControlledFreshCandidateOperationScope({ timeoutMs: 20 })
      : undefined,
    teardown: async () => {
      reads.push('teardown')
      return options.teardown === false ? { ok: false } : { ok: true }
    },
  }
  return { dependencies, reads }
}

function assertSanitized(value: unknown, sealed: ControlledFreshCandidatePrivateReceipt): void {
  assert.equal(validateControlledFreshCandidateStrictTargetReport(value), true)
  assert.deepEqual(Object.keys(value as object).sort(), [
    'cleanupStatus', 'commitCertainty', 'counts', 'eligibleForPublishing',
    'eligibleForVisualOnlyGeneration', 'ownerInputManifestMatch', 'phase',
    'quarantineCertainty', 'reasonCodes', 'verdict', 'version',
  ].sort())
  const output = JSON.stringify(value)
  for (const sentinel of [
    sealed.manifest.title,
    sealed.stockCandidate,
    sealed.manifest.original.filename,
    String(sealed.product.id),
    String(sealed.media.id),
    sealed.manifest.digest,
  ]) assert.equal(output.includes(sentinel), false)
}

async function main(): Promise<void> {
  {
    const authenticated = capability(1)
    const state = verifierFixture(authenticated.receipt)
    const result = await verifyControlledFreshCandidateTarget({
      capability: authenticated.capability,
      dependencies: state.dependencies,
    })
    assert.equal(result.verdict, 'STRICT_FRESH_TARGET_READY')
    assert.deepEqual(result.reasonCodes, ['STRICT_TARGET_READY'])
    assert.equal(result.eligibleForVisualOnlyGeneration, true)
    assert.equal(result.eligibleForPublishing, false)
    assert.deepEqual(authenticated.receipt.authorityClosure, {
      status: 'pending_not_attested',
      boundary: 'outside_durable_receipt',
    })
    assert.equal('authorityClosure' in result, false)
    assert.equal(state.reads.filter((entry) => entry === 'product:77').length, 2)
    assert.equal(state.reads.at(-1), 'teardown')
    assertSanitized(result, authenticated.receipt)
  }

  {
    const authenticated = capability(2)
    const state = verifierFixture(authenticated.receipt, {
      media: [{
        id: 501,
        product: 77,
        type: 'original',
        generationLineage: { parentMediaId: 999 },
        altText: authenticated.receipt.manifest.title,
        filename: authenticated.receipt.manifest.original.filename,
        mimeType: authenticated.receipt.manifest.original.mimeType,
      }],
    })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_MEDIA_OWNERSHIP_INVALID'))
  }

  {
    const authenticated = capability(3)
    const original = {
      id: 501, product: 77, type: 'original', generationLineage: null,
      altText: authenticated.receipt.manifest.title,
      filename: authenticated.receipt.manifest.original.filename,
      mimeType: authenticated.receipt.manifest.original.mimeType,
    }
    const state = verifierFixture(authenticated.receipt, {
      media: [original, { id: 502, product: 77, type: 'document', filename: 'synthetic.pdf' }],
    })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_MEDIA_COUNT_INVALID'))
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
  }

  {
    const authenticated = capability(4)
    const state = verifierFixture(authenticated.receipt, {
      media: [{
        id: 501, product: 88, type: 'original', generationLineage: null,
        altText: authenticated.receipt.manifest.title,
        filename: authenticated.receipt.manifest.original.filename,
        mimeType: authenticated.receipt.manifest.original.mimeType,
      }],
    })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_MEDIA_OWNERSHIP_INVALID'))
  }

  {
    const authenticated = capability(5)
    const state = verifierFixture(authenticated.receipt, { gallery: [{ id: 801 }] })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_MEDIA_OWNERSHIP_INVALID'))
  }

  {
    const authenticated = capability(6)
    const state = verifierFixture(authenticated.receipt, {
      product: {
        ...fixedControlledFreshCandidateProduct(authenticated.receipt.manifest, 'pending'),
        id: 77,
      },
    })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_ORDERED_ORIGINAL_INVALID'))
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
  }

  for (const [index, [key, code]] of ([
    ['jobs', 'STRICT_TARGET_GENERATION_HISTORY_PRESENT'],
    ['receipts', 'STRICT_TARGET_QUEUE_RECEIPT_PRESENT'],
    ['botEvents', 'STRICT_TARGET_BOT_EVENT_PRESENT'],
    ['storyJobs', 'STRICT_TARGET_STORY_JOB_PRESENT'],
  ] as const).entries()) {
    const authenticated = capability(10 + index)
    const state = verifierFixture(authenticated.receipt, { [key]: [{ id: 900 }] })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes(code))
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
  }

  for (const [index, surface] of (['product', 'media', 'gallery', 'jobs', 'receipts', 'botEvents', 'storyJobs', 'evidence'] as Surface[]).entries()) {
    const authenticated = capability(30 + index)
    const state = verifierFixture(authenticated.receipt, { drift: surface })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.deepEqual(result.reasonCodes, ['STRICT_TARGET_STATE_DRIFTED'])
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
  }

  {
    const authenticated = capability(50)
    const state = verifierFixture(authenticated.receipt, { evidenceOk: false })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_ORIGINAL_EVIDENCE_INVALID'))
  }

  for (const [index, evidenceOverride] of ([
    { contentDigest: '0'.repeat(64) },
    { mimeType: 'image/jpeg' as const },
    { byteSize: 999 },
    { width: 999 },
    { height: 999 },
  ]).entries()) {
    const authenticated = capability(60 + index)
    const state = verifierFixture(authenticated.receipt, { evidenceOverride })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_ORIGINAL_EVIDENCE_INVALID'))
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
  }

  {
    const base = receipt(70)
    const unsigned = structuredClone(base) as Partial<ControlledFreshCandidatePrivateReceipt>
    delete unsigned.seal
    unsigned.expectedStateFingerprint = '0'.repeat(64)
    const modified = sealControlledFreshCandidateReceipt(
      unsigned as Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
      KEY,
    )
    const modifiedCapability = authenticateControlledFreshCandidateReceipt({
      serialized: serializeControlledFreshCandidateReceipt(modified),
      key: KEY,
      expectedCommitIdentity: COMMIT_IDENTITY,
      expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
      consume: () => true,
    })
    const state = verifierFixture(modified)
    const result = await verifyControlledFreshCandidateTarget({ capability: modifiedCapability, dependencies: state.dependencies })
    assert.deepEqual(result.reasonCodes, ['STRICT_TARGET_MANIFEST_MISMATCH'])
    assert.equal(state.reads.some((entry) => entry.startsWith('product:')), false)
  }

  {
    const base = receipt(71)
    const unsigned = structuredClone(base) as Partial<ControlledFreshCandidatePrivateReceipt>
    delete unsigned.seal
    if (!unsigned.media) throw new Error('synthetic receipt Media missing')
    unsigned.media.productId = 88
    const modified = sealControlledFreshCandidateReceipt(
      unsigned as Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
      KEY,
    )
    const modifiedCapability = authenticateControlledFreshCandidateReceipt({
      serialized: serializeControlledFreshCandidateReceipt(modified),
      key: KEY,
      expectedCommitIdentity: COMMIT_IDENTITY,
      expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
      consume: () => true,
    })
    const state = verifierFixture(modified)
    const result = await verifyControlledFreshCandidateTarget({ capability: modifiedCapability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('RECEIPT_TARGET_INVALID'))
    assert.equal(state.reads.some((entry) => entry.startsWith('product:')), false)
  }

  {
    const authenticated = capability(51)
    const state = verifierFixture(authenticated.receipt, { malformedPagination: true })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.equal(result.verdict, 'STRICT_FRESH_TARGET_UNSUPPORTED')
    assert.deepEqual(result.reasonCodes, ['STRICT_TARGET_CAPTURE_UNSUPPORTED'])
  }

  {
    const authenticated = capability(52, { incomplete: true })
    const state = verifierFixture(authenticated.receipt)
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('RECEIPT_CONSTRUCTION_INCOMPLETE'))
    assert.equal(state.reads.some((entry) => entry.startsWith('product:')), false)
  }

  {
    const base = receipt(72)
    const unsigned = structuredClone(base) as Partial<ControlledFreshCandidatePrivateReceipt>
    delete unsigned.seal
    if (!unsigned.storageLedger) throw new Error('synthetic storage ledger missing')
    unsigned.storageLedger[0].state = 'uncertain'
    const modified = sealControlledFreshCandidateReceipt(
      unsigned as Omit<ControlledFreshCandidatePrivateReceipt, 'seal'>,
      KEY,
    )
    const modifiedCapability = authenticateControlledFreshCandidateReceipt({
      serialized: serializeControlledFreshCandidateReceipt(modified),
      key: KEY,
      expectedCommitIdentity: COMMIT_IDENTITY,
      expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
      consume: () => true,
    })
    const state = verifierFixture(modified)
    const result = await verifyControlledFreshCandidateTarget({ capability: modifiedCapability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('RECEIPT_CONSTRUCTION_INCOMPLETE'))
    assert.equal(state.reads.some((entry) => entry.startsWith('product:')), false)
  }

  {
    const authenticated = capability(53, { productId: 349 })
    const state = verifierFixture(authenticated.receipt)
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('RECEIPT_TARGET_INVALID'))
    assert.equal(state.reads.some((entry) => entry.startsWith('product:')), false)
  }

  {
    const authenticated = capability(54)
    const state = verifierFixture(authenticated.receipt, { teardown: false })
    const result = await verifyControlledFreshCandidateTarget({ capability: authenticated.capability, dependencies: state.dependencies })
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_TEARDOWN_FAILED'))
    assert.equal(result.eligibleForVisualOnlyGeneration, false)
  }

  {
    const sealed = receipt(55)
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({
        serialized: serializeControlledFreshCandidateReceipt(sealed),
        key: KEY,
        expectedRuntimeIdentity: 'cross-context' as typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
        expectedCommitIdentity: COMMIT_IDENTITY,
        expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
        consume: () => true,
      }),
      /CONTEXT_MISMATCH/,
    )
    assert.throws(
      () => authenticateControlledFreshCandidateReceipt({
        serialized: serializeControlledFreshCandidateReceipt(sealed),
        key: KEY,
        expectedContractIdentity: 'cross-contract',
        expectedCommitIdentity: COMMIT_IDENTITY,
        expectedEnvironmentIdentity: ENVIRONMENT_IDENTITY,
        consume: () => true,
      }),
      /CONTEXT_MISMATCH/,
    )
    const state = verifierFixture(sealed)
    const result = await verifyControlledFreshCandidateTarget({
      capability: Object.freeze(Object.create(null)) as ControlledFreshCandidateTargetCapability,
      dependencies: state.dependencies,
    })
    assert.deepEqual(result.reasonCodes, ['RECEIPT_CAPABILITY_INVALID'])
    assert.equal(state.reads.some((entry) => entry.startsWith('product:')), false)
    assert.equal(state.reads.at(-1), 'teardown')
  }

  for (const hang of ['product', 'media', 'jobs', 'evidence'] as const) {
    const authenticated = capability(80 + hang.length)
    const state = verifierFixture(authenticated.receipt, { hang })
    const started = Date.now()
    const result = await verifyControlledFreshCandidateTarget({
      capability: authenticated.capability,
      dependencies: state.dependencies,
    })
    assert.equal(result.verdict, 'STRICT_FRESH_TARGET_UNSUPPORTED')
    assert.ok(result.reasonCodes.includes('STRICT_TARGET_CAPTURE_UNSUPPORTED'))
    assert.ok(Date.now() - started < 1_000)
    assert.equal(state.reads.at(-1), 'teardown')
    assert.throws(
      () => state.dependencies.operationScope?.close(),
      /CONTROLLED_TERMINAL_SCOPE_NOT_DRAINED/,
    )
  }

  console.log('controlledFreshCandidateTargetVerifier: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
