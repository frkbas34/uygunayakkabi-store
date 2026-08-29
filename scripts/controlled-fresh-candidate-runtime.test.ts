import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  controlledFreshCandidateDigest,
  createControlledFreshCandidateManifestEvidence,
  createControlledFreshCandidateOperationScope,
  fixedControlledFreshCandidateProduct,
  type ControlledFreshCandidateCreationDependencies,
  type ControlledFreshCandidateExecutionGrant,
} from '../src/lib/controlledFreshCandidateCreation'
import {
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
  sealControlledFreshCandidateReceipt,
  serializeControlledFreshCandidateReceipt,
  type ControlledFreshCandidateTargetCapability,
} from '../src/lib/controlledFreshCandidateReceipt'
import {
  CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
  CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION,
  controlledFreshCandidateRuntimeUsage,
  parseControlledFreshCandidateRuntimeArgs,
  runControlledFreshCandidateRuntime,
} from './controlled-fresh-candidate-runtime'
import {
  createControlledFreshCandidateBoundaryLoggerConfiguration,
  createControlledFreshCandidateDurableReceiptConsumer,
  createControlledFreshCandidateExecutionGrantToken,
  createControlledFreshCandidateReceiptPersistence,
  controlledFreshCandidateFilenameIsApproved,
  controlledFreshCandidateReceiptDestinationDigest,
  finalizeControlledFreshCandidateProductAtomically,
  type ControlledRuntimePayload,
  type ControlledFreshCandidateOwnerLedger,
} from './controlled-fresh-candidate-runtime-resources'

function captureIo() {
  const stdout: string[] = []
  const stderr: string[] = []
  return {
    stdout,
    stderr,
    io: {
      stdout: (text: string) => { stdout.push(text) },
      stderr: (text: string) => { stderr.push(text) },
    },
  }
}

function sanitizedChildEnvironment(additional: Record<string, string> = {}): NodeJS.ProcessEnv {
  const inheritedOfflineNodeOptions = process.env.NODE_OPTIONS?.includes('--unhandled-rejections=strict')
    && process.env.NODE_OPTIONS.includes('--import=data:text/javascript;base64,')
    ? process.env.NODE_OPTIONS
    : '--unhandled-rejections=strict'

  return {
    Path: process.env.Path ?? '',
    SystemRoot: process.env.SystemRoot ?? 'C:\\Windows',
    TEMP: process.env.TEMP ?? 'C:\\Windows\\Temp',
    TMP: process.env.TMP ?? 'C:\\Windows\\Temp',
    NODE_OPTIONS: inheritedOfflineNodeOptions,
    NODE_ENV: 'test',
    PAYLOAD_DB_PUSH: 'false',
    ...additional,
  }
}

function child(args: string[]) {
  const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs')
  const script = path.resolve('scripts/controlled-fresh-candidate-runtime.ts')
  return spawnSync(process.execPath, [tsxCli, script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10_000,
    env: sanitizedChildEnvironment({ PAYLOAD_DB_PUSH: 'synthetic-sentinel' }),
  })
}


function asyncChild(code: string) {
  const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs')
  return new Promise<{ status: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolve, reject) => {
    const processHandle = spawn(process.execPath, [tsxCli, '--eval', code], {
      cwd: process.cwd(),
      env: sanitizedChildEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    processHandle.stdout.setEncoding('utf8')
    processHandle.stderr.setEncoding('utf8')
    processHandle.stdout.on('data', (chunk: string) => { stdout += chunk })
    processHandle.stderr.on('data', (chunk: string) => { stderr += chunk })
    processHandle.once('error', reject)
    processHandle.once('close', (status, signal) => resolve({ status, signal, stdout, stderr }))
  })
}

function createTestLedger(root: string, authorizationKey: Buffer): ControlledFreshCandidateOwnerLedger {
  const authorizationDirectory = path.join(root, 'creation-authorizations-v2')
  const receiptDirectory = path.join(root, 'receipt-consumptions-v1')
  mkdirSync(authorizationDirectory, { recursive: true })
  mkdirSync(receiptDirectory, { recursive: true })
  return { root, authorizationDirectory, receiptDirectory, authorizationKey }
}

function executionGrant(destinationDigest: string, seed: number): ControlledFreshCandidateExecutionGrant {
  return {
    authorizationIdentity: `runtime-owner-grant-${seed}`,
    executionIdentity: `runtime-execution-${seed}`,
    manifestDigest: controlledFreshCandidateDigest({ seed, stockCandidate: `SN${String(3000 + seed).padStart(4, '0')}` }),
    contractIdentity: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
    runtimeIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
    runtimeCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
    environmentIdentity: 'runtime-test-environment',
    approvedReceiptDestinationDigest: destinationDigest,
  }
}

function sealedRuntimeReceipt(seed: number): string {
  const expectedFilename = `cfc-runtime-execution-${seed}-${String(seed).padStart(32, 'c')}.png`
  const manifest = createControlledFreshCandidateManifestEvidence({
    input: {
      identity: `runtime-manifest-${seed}`,
      title: `Runtime synthetic candidate ${seed}`,
      positivePrice: 750,
      provenanceStatement: 'Synthetic offline receipt replay evidence.',
      stockCandidate: `SN${String(4000 + seed).padStart(4, '0')}`,
      original: {
        bytes: new Uint8Array([1, 2, 3, seed]),
        mimeType: 'image/png',
        width: 20,
        height: 20,
      },
    },
    expectedFilename,
  })
  return serializeControlledFreshCandidateReceipt(sealControlledFreshCandidateReceipt({
    version: CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION,
    executionAuthorization: {
      identity: `runtime-owner-${seed}`,
      digest: controlledFreshCandidateDigest(`runtime-token-${seed}`),
      consumed: true,
    },
    executionId: `runtime-execution-${seed}`,
    manifest,
    runtime: {
      identity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      contract: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
      commit: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
      environment: 'runtime-test-environment',
      receiptDestinationDigest: 'd'.repeat(64),
    },
    stockCandidate: manifest.stockCandidate,
    expectedStateFingerprint: controlledFreshCandidateDigest(fixedControlledFreshCandidateProduct(manifest, 'pending')),
    product: { state: 'not_created', id: null, fingerprint: null },
    media: {
      state: 'not_created',
      id: null,
      productId: null,
      expectedFilename,
      actualFilename: null,
    },
    storageLedger: [],
    transactions: {
      productCreate: { intent: 'not_started', certainty: 'unknown' },
      mediaCreate: { intent: 'not_started', certainty: 'unknown' },
      relationshipUpdate: { intent: 'not_started', certainty: 'unknown' },
      finalization: { intent: 'not_started', certainty: 'unknown' },
    },
    phase: 'authorization_consumed',
    budgets: {
      stockCandidates: 0,
      stockLookups: 0,
      productCreates: 0,
      mediaCreates: 0,
      productRelationshipUpdates: 0,
      productFinalizationUpdates: 0,
      explicitMediaUpdates: 0,
      canonicalMediaMetadataUpdates: 0,
      logicalStorageUploads: 0,
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
    quarantineCertainty: 'unknown',
    commitCertainty: 'unknown',
    cleanupStatus: 'not_started',
    finalization: { requested: false, observed: false },
    teardown: { attempted: false, completed: false },
  }, new Uint8Array(32).fill(61)))
}

async function main(): Promise<void> {
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs([]), {
    ok: false,
    code: 'RUNTIME_CONFIRMATION_REQUIRED',
  })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs(['--help']), {
    ok: true,
    helpRequested: true,
    mode: null,
  })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs([
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
    CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION,
  ]), { ok: false, code: 'RUNTIME_MODES_MIXED' })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs([
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
  ]), { ok: false, code: 'RUNTIME_ARGUMENT_DUPLICATED' })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs(['--product=77']), {
    ok: false,
    code: 'RUNTIME_ARGUMENT_UNKNOWN',
  })
  assert.deepEqual(parseControlledFreshCandidateRuntimeArgs(['--help', CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION]), {
    ok: false,
    code: 'RUNTIME_ARGUMENT_UNKNOWN',
  })
  const usage = controlledFreshCandidateRuntimeUsage()
  assert.match(usage, /mutually exclusive/)
  assert.doesNotMatch(usage, /SN\d{4}|Product 77|349/)
  assert.equal(controlledFreshCandidateFilenameIsApproved('approved-random-name.png', 'approved-random-name.png'), true)
  assert.equal(controlledFreshCandidateFilenameIsApproved('approved-random-name.png', 'approved-random-name-1.png'), false)
  assert.equal(controlledFreshCandidateFilenameIsApproved(null, 'approved-random-name.png'), false)

  for (const argv of [
    [],
    ['--help'],
    ['--unknown'],
    [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION, CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION],
  ]) {
    let initialized = 0
    const io = captureIo()
    const code = await runControlledFreshCandidateRuntime({
      argv,
      io: io.io,
      initializeCreation: async () => { initialized += 1; throw new Error('must not initialize') },
      initializeVerification: async () => { initialized += 1; throw new Error('must not initialize') },
    })
    assert.equal(initialized, 0)
    assert.equal(code, argv.length === 1 && argv[0] === '--help' ? 0 : 2)
  }

  {
    const io = captureIo()
    let destroyed = 0
    process.env.PAYLOAD_DB_PUSH = 'synthetic-not-false'
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async (scope) => {
        assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
        return {
          creationInput: null as never,
          creationDependencies: {} as ControlledFreshCandidateCreationDependencies,
          scope,
          destroy: async () => { destroyed += 1; scope.close(); return { ok: true } },
        }
      },
    })
    assert.equal(code, 3)
    assert.equal(destroyed, 1)
    assert.equal(io.stdout.length, 1)
    const report = JSON.parse(io.stdout[0] ?? '{}') as Record<string, unknown>
    assert.equal(report.eligibleForPublishing, false)
    assert.equal(JSON.stringify(report).includes('synthetic-not-false'), false)
  }

  {
    const io = captureIo()
    let teardownCalls = 0
    let teardownResult: Promise<{ ok: true }> | null = null
    const teardown = () => {
      if (!teardownResult) {
        teardownCalls += 1
        teardownResult = Promise.resolve({ ok: true as const })
      }
      return teardownResult
    }
    const unexpected = async () => { throw new Error('gateway must not be called for forged capability') }
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION],
      io: io.io,
      initializeVerification: async (scope) => ({
        capability: Object.freeze(Object.create(null)) as ControlledFreshCandidateTargetCapability,
        dependencies: {
          gateway: {
            readOwnedProduct: unexpected,
            readMediaPage: unexpected,
            readGeneratedGalleryOwnerPage: unexpected,
            readImageJobPage: unexpected,
            readQueueReceiptPage: unexpected,
            readBotEventPage: unexpected,
            readStoryJobPage: unexpected,
          },
          operationScope: scope,
          teardown,
        },
        scope,
        destroy: async () => { const result = await teardown(); scope.close(); return result },
      }),
    })
    assert.equal(code, 4)
    assert.equal(teardownCalls, 1)
    const report = JSON.parse(io.stdout[0] ?? '{}') as Record<string, unknown>
    assert.equal(report.eligibleForPublishing, false)
    assert.equal(report.eligibleForVisualOnlyGeneration, false)
    assert.equal(JSON.stringify(report).includes('gateway must not be called'), false)
  }

  {
    const io = captureIo()
    let destroyCalls = 0
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async () => {
        const resource = {
          destroy: async () => { destroyCalls += 1; return { ok: true as const } },
        }
        throw Object.assign(new Error('sensitive-sentinel'), { resource })
      },
    })
    assert.equal(code, 1)
    assert.equal(destroyCalls, 0)
    assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE'])
    assert.equal(JSON.stringify(io).includes('sensitive-sentinel'), false)
  }

  {
    const io = captureIo()
    let cancellationEstablished = false
    const started = Date.now()
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      operationTimeoutMs: 15,
      initializeCreation: async (scope) => {
        scope.registerCancellation(() => new Promise<void>((resolve) => {
          setTimeout(() => {
            cancellationEstablished = true
            resolve()
          }, 30)
        }))
        return new Promise<never>(() => undefined)
      },
    })
    assert.equal(code, 1)
    assert.equal(cancellationEstablished, true)
    assert.ok(Date.now() - started >= 30)
    assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE'])
  }

  {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'uygunayakkabi-cfc-ledger-test-'))
    try {
      const receiptParent = path.join(temporaryRoot, 'receipts')
      mkdirSync(receiptParent, { recursive: true })
      const authorizationKey = Buffer.alloc(32, 71)
      const ledger = createTestLedger(path.join(temporaryRoot, 'owner-ledger'), authorizationKey)
      const receiptA = path.join(receiptParent, 'a.receipt.json')
      const receiptB = path.join(receiptParent, 'b.receipt.json')
      const grant = executionGrant(controlledFreshCandidateReceiptDestinationDigest(receiptA), 1)
      const token = createControlledFreshCandidateExecutionGrantToken(grant, authorizationKey)
      const first = createControlledFreshCandidateReceiptPersistence({ receiptPath: receiptA, executionId: grant.executionIdentity, ledger })
      const alternate = createControlledFreshCandidateReceiptPersistence({ receiptPath: receiptB, executionId: grant.executionIdentity, ledger })
      const signal = new AbortController().signal
      assert.equal(await first.consume(grant, token, signal), true)
      assert.equal(await alternate.consume(grant, token, signal), false)
      const restarted = createControlledFreshCandidateReceiptPersistence({ receiptPath: receiptA, executionId: grant.executionIdentity, ledger })
      assert.equal(await restarted.consume(grant, token, signal), false)

      const receiptC = path.join(receiptParent, 'c.receipt.json')
      const receiptD = path.join(receiptParent, 'd.receipt.json')
      const concurrentGrant = executionGrant(controlledFreshCandidateReceiptDestinationDigest(receiptC), 2)
      const concurrentToken = createControlledFreshCandidateExecutionGrantToken(concurrentGrant, authorizationKey)
      const concurrentResults = await Promise.all([
        createControlledFreshCandidateReceiptPersistence({ receiptPath: receiptC, executionId: concurrentGrant.executionIdentity, ledger })
          .consume(concurrentGrant, concurrentToken, signal),
        createControlledFreshCandidateReceiptPersistence({ receiptPath: receiptD, executionId: concurrentGrant.executionIdentity, ledger })
          .consume(concurrentGrant, concurrentToken, signal),
      ])
      assert.deepEqual([...concurrentResults].sort(), [false, true])

      const receiptE = path.join(receiptParent, 'e.receipt.json')
      const boundGrant = executionGrant(controlledFreshCandidateReceiptDestinationDigest(receiptE), 3)
      const boundToken = createControlledFreshCandidateExecutionGrantToken(boundGrant, authorizationKey)
      const boundPersistence = createControlledFreshCandidateReceiptPersistence({ receiptPath: receiptE, executionId: boundGrant.executionIdentity, ledger })
      for (const changed of [
        { ...boundGrant, manifestDigest: 'e'.repeat(64) },
        { ...boundGrant, environmentIdentity: 'changed-environment' },
        { ...boundGrant, runtimeCommitIdentity: 'changed-commit' },
        { ...boundGrant, approvedReceiptDestinationDigest: 'f'.repeat(64) },
      ]) assert.equal(await boundPersistence.consume(changed, boundToken, signal), false)
      assert.equal(await boundPersistence.consume(boundGrant, boundToken, signal), true)
      assert.equal(readFileSync(receiptA, 'utf8'), '')
      assert.equal(readFileSync(receiptC, 'utf8'), '')
      assert.equal(readFileSync(receiptE, 'utf8'), '')
      assert.equal(readdirSync(receiptParent).some((name) => name.includes('authorization') || name.endsWith('.used')), false)
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true })
    }
  }

  {
    const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'uygunayakkabi-cfc-replay-test-'))
    try {
      const receiptDirectory = path.join(temporaryRoot, 'receipt-consumptions-v1')
      mkdirSync(receiptDirectory, { recursive: true })
      const receiptPath = path.join(temporaryRoot, 'receipt.json')
      writeFileSync(receiptPath, sealedRuntimeReceipt(7), 'utf8')
      const receiptModuleUrl = pathToFileURL(path.resolve('src/lib/controlledFreshCandidateReceipt.ts')).href
      const runtimeResourcesUrl = pathToFileURL(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts')).href
      const replayCode = `
        import { readFileSync } from 'node:fs';
        import { authenticateControlledFreshCandidateReceipt } from ${JSON.stringify(receiptModuleUrl)};
        import { createControlledFreshCandidateDurableReceiptConsumer } from ${JSON.stringify(runtimeResourcesUrl)};
        try {
          authenticateControlledFreshCandidateReceipt({
            serialized: readFileSync(${JSON.stringify(receiptPath)}, 'utf8'),
            key: new Uint8Array(32).fill(61),
            expectedCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
            expectedEnvironmentIdentity: 'runtime-test-environment',
            consume: createControlledFreshCandidateDurableReceiptConsumer(${JSON.stringify(receiptDirectory)}),
          });
          console.log('CAPABILITY_MINTED');
        } catch {
          console.log('RECEIPT_REJECTED');
        }
      `
      const concurrent = await Promise.all([asyncChild(replayCode), asyncChild(replayCode)])
      assert.equal(concurrent.every((result) => result.status === 0 && result.signal === null && result.stderr === ''), true)
      assert.equal(concurrent.filter((result) => result.stdout.trim() === 'CAPABILITY_MINTED').length, 1)
      assert.equal(concurrent.filter((result) => result.stdout.trim() === 'RECEIPT_REJECTED').length, 1)
      const restarted = await asyncChild(replayCode)
      assert.equal(restarted.status, 0)
      assert.equal(restarted.stdout.trim(), 'RECEIPT_REJECTED')

      const noEvictionDirectory = path.join(temporaryRoot, 'no-eviction')
      mkdirSync(noEvictionDirectory, { recursive: true })
      const consume = createControlledFreshCandidateDurableReceiptConsumer(noEvictionDirectory)
      const firstIdentity = controlledFreshCandidateDigest({ receipt: 0 })
      assert.equal(consume(firstIdentity), true)
      for (let index = 1; index <= 1_025; index += 1) {
        assert.equal(consume(controlledFreshCandidateDigest({ receipt: index })), true)
      }
      assert.equal(consume(firstIdentity), false)
      assert.equal(readdirSync(noEvictionDirectory).length, 1_026)
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true })
    }
  }

  {
    const { pgTable, serial } = await import('drizzle-orm/pg-core')
    const productTable = pgTable('products', { id: serial('id').primaryKey() })
    const sealed = JSON.parse(sealedRuntimeReceipt(9)) as {
      manifest: ReturnType<typeof createControlledFreshCandidateManifestEvidence>
    }
    const manifest = sealed.manifest
    const productId = 77
    const mediaId = 501
    const blockedFingerprint = controlledFreshCandidateDigest(
      fixedControlledFreshCandidateProduct(manifest, 'blocked', mediaId),
    )
    const atomicFixture = (options: {
      lockRows?: number
      unsafeBeforeLock?: boolean
      missingMapping?: boolean
    } = {}) => {
      const events: string[] = []
      let product = {
        ...fixedControlledFreshCandidateProduct(manifest, 'blocked', mediaId),
        id: productId,
      }
      if (options.unsafeBeforeLock) product.featured = true
      const transaction = {
        select: () => ({
          from: () => ({
            where: () => ({
              for: async () => {
                events.push('row-lock')
                return Array.from({ length: options.lockRows ?? 1 }, () => ({ id: productId }))
              },
            }),
          }),
        }),
      }
      const sessions: Record<string, unknown> = { 'tx-1': { db: transaction } }
      const db = {
        tableNameMap: new Map(options.missingMapping ? [] : [['products', 'products']]),
        schema: { products: productTable },
        sessions,
        beginTransaction: async () => { events.push('transaction-begin'); return 'tx-1' },
        commitTransaction: async () => { events.push('transaction-commit') },
        rollbackTransaction: async () => { events.push('transaction-rollback') },
      }
      const payload = {
        db,
        findByID: async () => {
          events.push('qualified-read')
          return structuredClone(product)
        },
        update: async (args: { data?: { workflow?: Record<string, unknown> } }) => {
          events.push('canonical-update')
          product = {
            ...product,
            workflow: { ...(product.workflow as Record<string, unknown>), ...args.data?.workflow },
          }
          return structuredClone(product)
        },
      } as unknown as ControlledRuntimePayload
      const scope = createControlledFreshCandidateOperationScope()
      return { events, payload, scope }
    }

    for (const lockRows of [0, 2]) {
      const state = await atomicFixture({ lockRows })
      await assert.rejects(() => finalizeControlledFreshCandidateProductAtomically({
        payload: state.payload,
        scope: state.scope,
        mutationActive: { current: true },
        productId,
        mediaId,
        manifest,
        blockedStateFingerprint: blockedFingerprint,
        signal: state.scope.signal,
        createRequest: async () => ({}),
      }), /cas_missed/)
      assert.equal(state.events.includes('canonical-update'), false)
      assert.equal(state.events.filter((event) => event === 'transaction-rollback').length, 1)
      state.scope.close()
    }

    {
      const state = await atomicFixture({ unsafeBeforeLock: true })
      await assert.rejects(() => finalizeControlledFreshCandidateProductAtomically({
        payload: state.payload,
        scope: state.scope,
        mutationActive: { current: true },
        productId,
        mediaId,
        manifest,
        blockedStateFingerprint: blockedFingerprint,
        signal: state.scope.signal,
        createRequest: async () => ({}),
      }), /cas_missed/)
      assert.deepEqual(state.events.slice(0, 3), ['transaction-begin', 'row-lock', 'qualified-read'])
      assert.equal(state.events.includes('canonical-update'), false)
      state.scope.close()
    }

    {
      const state = await atomicFixture()
      const result = await finalizeControlledFreshCandidateProductAtomically({
        payload: state.payload,
        scope: state.scope,
        mutationActive: { current: true },
        productId,
        mediaId,
        manifest,
        blockedStateFingerprint: blockedFingerprint,
        signal: state.scope.signal,
        createRequest: async () => ({}),
      })
      assert.deepEqual(result, { affected: 1 })
      assert.deepEqual(state.events, [
        'transaction-begin', 'row-lock', 'qualified-read', 'canonical-update', 'transaction-commit',
      ])
      state.scope.close()
    }

    {
      const state = await atomicFixture({ missingMapping: true })
      await assert.rejects(() => finalizeControlledFreshCandidateProductAtomically({
        payload: state.payload,
        scope: state.scope,
        mutationActive: { current: true },
        productId,
        mediaId,
        manifest,
        blockedStateFingerprint: blockedFingerprint,
        signal: state.scope.signal,
        createRequest: async () => ({}),
      }), /table_unavailable/)
      assert.deepEqual(state.events, [])
      state.scope.close()
    }

    {
      const state = await atomicFixture()
      await assert.rejects(() => finalizeControlledFreshCandidateProductAtomically({
        payload: state.payload,
        scope: state.scope,
        mutationActive: { current: true },
        productId: 349,
        mediaId,
        manifest,
        blockedStateFingerprint: blockedFingerprint,
        signal: state.scope.signal,
        createRequest: async () => ({}),
      }), /identity_invalid/)
      assert.deepEqual(state.events, [])
      state.scope.close()
    }
  }

  {
    const runtimeResourcesUrl = pathToFileURL(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts')).href
    const loggerSentinels = [
      'IDENTITY_SENTINEL_77',
      'FILENAME_SENTINEL.png',
      'https://storage.invalid/URL_SENTINEL',
      'DATABASE_DETAIL_SENTINEL',
      'CREDENTIAL_SENTINEL',
      'EXCEPTION_STACK_SENTINEL',
      'TRANSACTION_COMMIT_SENTINEL',
      'TRANSACTION_ROLLBACK_SENTINEL',
      'TEARDOWN_FAILURE_SENTINEL',
    ]
    const loggerCode = `
      void (async () => {
      const [{ pino }, { beginTransaction, commitTransaction, rollbackTransaction }, { cloudStoragePlugin }, { createControlledFreshCandidateBoundaryLoggerConfiguration }] = await Promise.all([
        import('pino'),
        import('@payloadcms/drizzle'),
        import('@payloadcms/plugin-cloud-storage'),
        import(${JSON.stringify(runtimeResourcesUrl)}),
      ]);
      const loggerConfig = createControlledFreshCandidateBoundaryLoggerConfiguration();
      const logger = pino(loggerConfig.options, loggerConfig.destination);
      const uploadFailureAdapter = {
        generateURL: () => 'https://storage.invalid/URL_SENTINEL',
        handleDelete: async () => {},
        staticHandler: async () => {},
        handleUpload: async () => { throw new Error('CREDENTIAL_SENTINEL EXCEPTION_STACK_SENTINEL'); },
      };
      const uploadConfig = cloudStoragePlugin({ collections: { media: { adapter: () => uploadFailureAdapter } } })({
        collections: [{ slug: 'media', fields: [], upload: true }],
      });
      const uploadHook = uploadConfig.collections[0].hooks.afterChange.at(-1);
      const request = {
        context: {},
        file: { data: Buffer.from([1]), size: 1 },
        payload: { logger, update: async () => { throw new Error('DATABASE_DETAIL_SENTINEL'); } },
      };
      try {
        await uploadHook({
          doc: { id: 'IDENTITY_SENTINEL_77', filename: 'FILENAME_SENTINEL.png', mimeType: 'image/png' },
          operation: 'create', previousDoc: null, req: request,
        });
      } catch {}
      const metadataAdapter = { ...uploadFailureAdapter, handleUpload: async () => ({ storageKey: 'https://storage.invalid/URL_SENTINEL' }) };
      const metadataConfig = cloudStoragePlugin({ collections: { media: { adapter: () => metadataAdapter } } })({
        collections: [{ slug: 'media', fields: [], upload: true }],
      });
      const metadataHook = metadataConfig.collections[0].hooks.afterChange.at(-1);
      try {
        await metadataHook({
          doc: { id: 'IDENTITY_SENTINEL_77', filename: 'FILENAME_SENTINEL.png', mimeType: 'image/png' },
          operation: 'create', previousDoc: null, req: request,
        });
      } catch {}
      try {
        await beginTransaction.call({
          initializing: Promise.reject(new Error('DATABASE_DETAIL_SENTINEL EXCEPTION_STACK_SENTINEL')),
          payload: { logger },
        });
      } catch {}
      try {
        await commitTransaction.call({
          sessions: {
            'commit-sentinel': {
              resolve: async () => { throw new Error('TRANSACTION_COMMIT_SENTINEL'); },
              reject: async () => { throw new Error('TRANSACTION_ROLLBACK_SENTINEL'); },
            },
          },
        }, 'commit-sentinel');
      } catch (error) { logger.error({ err: error, msg: 'CONTROLLED_TRANSACTION_FAILURE' }); }
      try {
        await rollbackTransaction.call({
          sessions: {
            'rollback-sentinel': {
              reject: async () => { throw new Error('TRANSACTION_ROLLBACK_SENTINEL'); },
            },
          },
        }, 'rollback-sentinel');
      } catch (error) { logger.error({ err: error, msg: 'CONTROLLED_TRANSACTION_FAILURE' }); }
      try {
        await (async () => { throw new Error('TEARDOWN_FAILURE_SENTINEL'); })();
      } catch (error) { logger.error({ err: error, msg: 'CONTROLLED_TEARDOWN_FAILURE' }); }
      logger.error({ err: new Error('CREDENTIAL_SENTINEL'), id: 'IDENTITY_SENTINEL_77' });
      console.log('SANITIZED_INSTALLED_FAILURES');
      })().catch(() => { console.log('SANITIZED_INSTALLED_FAILURES'); });
    `
    const result = await asyncChild(loggerCode)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(result.signal, null)
    assert.equal(result.stdout.trim(), 'SANITIZED_INSTALLED_FAILURES')
    assert.equal(result.stderr, '')
    for (const sentinel of loggerSentinels) {
      assert.equal(`${result.stdout}\n${result.stderr}`.includes(sentinel), false)
    }
    const loggerConfig = createControlledFreshCandidateBoundaryLoggerConfiguration()
    assert.equal(loggerConfig.options.level, 'silent')
    assert.equal(loggerConfig.options.enabled, true)
  }

  for (const args of [['--help'], ['--unknown'], []]) {
    const result = child(args)
    assert.equal(result.error, undefined)
    assert.equal(result.signal, null)
    assert.equal(result.status, args[0] === '--help' ? 0 : 2)
    assert.equal(result.stderr.includes('DATABASE_URI'), false)
    assert.equal(result.stderr.includes('BLOB_READ_WRITE_TOKEN'), false)
  }

  const runtimeSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime.ts'), 'utf8')
  const resourcesSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts'), 'utf8')
  assert.equal(runtimeSource.includes('process.exit('), false)
  assert.equal(runtimeSource.includes("parseControlledFreshCandidateRuntimeArgs(options.argv)"), true)
  assert.ok(runtimeSource.indexOf('parseControlledFreshCandidateRuntimeArgs(options.argv)') < runtimeSource.indexOf('options.initializeCreation ??'))
  assert.equal(resourcesSource.includes("process.env.PAYLOAD_DB_PUSH = 'false'"), true)
  assert.equal(resourcesSource.includes('push: false'), true)
  assert.equal(resourcesSource.includes('VERCEL_BLOB_RETRIES'), true)
  assert.equal(resourcesSource.includes('CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0'), true)
  assert.equal(resourcesSource.includes('multipart: false'), true)
  assert.equal(resourcesSource.includes("handleDelete: async () => { throw"), true)
  assert.equal(resourcesSource.includes('blobModule.del'), false)
  assert.equal(resourcesSource.includes('blobModule.list'), false)
  assert.equal(resourcesSource.includes("await open(markerPath, 'wx'"), true)
  assert.equal(resourcesSource.includes("await open(temporaryPath, 'wx'"), true)
  assert.equal(resourcesSource.includes('controlled_media_filename_changed'), true)
  assert.equal(resourcesSource.includes('controlledFreshCandidateFilenameIsApproved(expected, data.filename)'), true)
  assert.equal(resourcesSource.includes('overwriteExistingFiles: false'), true)
  assert.equal(resourcesSource.includes('tasks: []'), true)
  assert.equal(resourcesSource.includes('dotenv'), false)
  assert.equal(resourcesSource.includes('telegram'), false)
  assert.equal(resourcesSource.includes('openai'), false)
  assert.equal(resourcesSource.includes('gemini'), false)
  assert.equal(resourcesSource.includes('shopier'), false)
  assert.ok(resourcesSource.indexOf("if (process.env.PAYLOAD_DB_PUSH !== 'false')") < resourcesSource.indexOf("import('@vercel/blob')"))

  console.log('controlledFreshCandidateRuntime: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
