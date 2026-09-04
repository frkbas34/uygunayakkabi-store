import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import {
  chmodSync,
  closeSync,
  fstatSync,
  ftruncateSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
  controlledFreshCandidateDigest,
  createControlledFreshCandidateManifestEvidence,
  createControlledFreshCandidateOperationScope,
  deriveControlledFreshCandidateAuthorizationIdentity,
  fixedControlledFreshCandidateProduct,
  prepareControlledFreshCandidateManifest,
  type ControlledFreshCandidateCreationDependencies,
  type ControlledFreshCandidateCreationInput,
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
  authenticateControlledFreshCandidateObservation,
  createControlledFreshCandidateObservationState,
  serializeControlledFreshCandidateObservation,
} from '../src/lib/controlledFreshCandidateObservation'
import {
  CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
  CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION,
  controlledFreshCandidateRuntimeUsage,
  parseControlledFreshCandidateRuntimeArgs,
  runControlledFreshCandidateRuntime as runControlledFreshCandidateRuntimeProduction,
} from './controlled-fresh-candidate-runtime'
import {
  createControlledFreshCandidateBoundaryLoggerConfiguration,
  createControlledFreshCandidateAtomicSnapshotPersistence,
  createControlledFreshCandidateDurableMarker,
  createControlledFreshCandidateDurableReceiptConsumer,
  createControlledFreshCandidateExecutionGrantToken,
  createControlledFreshCandidateOperationDirectory,
  createControlledFreshCandidatePoolConstructor,
  createControlledFreshCandidateReceiptPersistence,
  createControlledFreshCandidateTerminalResourceRegistry,
  controlledFreshCandidateFilenameIsApproved,
  controlledFreshCandidateReceiptDestinationDigest,
  finalizeControlledFreshCandidateProductAtomically,
  initializeControlledFreshCandidateOwnerLedger,
  openControlledFreshCandidatePhysicalReceiptDestination,
  parseControlledFreshCandidateMountInfo,
  readControlledFreshCandidateMountInfo,
  readControlledFreshCandidatePrivateFile,
  readPhysicalReceiptBytes,
  writeControlledFreshCandidatePrivateFileExclusive,
  CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS,
  CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES,
  type ControlledRuntimePayload,
} from './controlled-fresh-candidate-runtime-resources'

let posixLedgerEvidence = false

function runControlledFreshCandidateRuntime(
  options: Parameters<typeof runControlledFreshCandidateRuntimeProduction>[0],
) {
  return runControlledFreshCandidateRuntimeProduction({
    ...options,
    testOnlyBypassExecutionReadiness: true,
  })
}

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

function inertObservationHooks() {
  return {
    completeObservation: (report: unknown, terminalOk: boolean) => { void report; void terminalOk },
    failObservation: () => undefined,
    closeObservation: () => undefined,
  }
}

function sanitizedChildEnvironment(additional: Record<string, string> = {}): NodeJS.ProcessEnv {
  const offlineGuardPath = process.env.CONTROLLED_FRESH_CANDIDATE_OFFLINE_GUARD_PATH
  if (offlineGuardPath && (!path.isAbsolute(offlineGuardPath) || /[\s"'\r\n]/u.test(offlineGuardPath))) {
    throw new Error('controlled_offline_guard_path_invalid')
  }
  return {
    Path: process.env.Path ?? process.env.PATH ?? '',
    PATH: process.env.PATH ?? process.env.Path ?? '',
    SystemRoot: process.env.SystemRoot ?? 'C:\\Windows',
    TEMP: process.env.TEMP ?? 'C:\\Windows\\Temp',
    TMP: process.env.TMP ?? 'C:\\Windows\\Temp',
    NODE_OPTIONS: offlineGuardPath
      ? `--unhandled-rejections=strict --require=${offlineGuardPath}`
      : '--unhandled-rejections=strict',
    NODE_ENV: 'test',
    CI: '1',
    NO_COLOR: '1',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_DROP_DATABASE: 'false',
    ...additional,
  }
}

function child(args: string[]) {
  const script = path.resolve('scripts/controlled-fresh-candidate-runtime.ts')
  return spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10_000,
    env: sanitizedChildEnvironment({ PAYLOAD_DB_PUSH: 'synthetic-sentinel' }),
  })
}


function asyncChild(code: string) {
  return new Promise<{ status: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolve, reject) => {
    const processHandle = spawn(process.execPath, ['--import', 'tsx', '--eval', code], {
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

function asyncPosixPrimitiveChild(additional: Record<string, string>) {
  return new Promise<{ status: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }>((resolve, reject) => {
    const testEntryPath = process.env.CFC_POSIX_TEST_ENTRY_PATH ?? process.argv[1]
    if (!testEntryPath) throw new Error('posix_child_entry_unavailable')
    const processHandle = spawn(process.execPath, ['--import', 'tsx', testEntryPath], {
      cwd: process.cwd(),
      env: sanitizedChildEnvironment(additional),
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

let posixChildCheckpoint = 'configuration'

async function runPosixPrimitiveChildMode(): Promise<boolean> {
  const mode = process.env.CFC_POSIX_CHILD_MODE
  if (!mode) return false
  const root = process.env.CFC_POSIX_LEDGER_ROOT
  const authorizationKey = process.env.CFC_POSIX_AUTHORIZATION_KEY_BASE64
  const identity = process.env.CFC_POSIX_MARKER_IDENTITY
  if (!root || !authorizationKey || !identity) throw new Error('posix_child_configuration_invalid')
  process.env.CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY = root
  process.env.CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64 = authorizationKey
  process.env.CFC_NATIVE_EXT4_TEST_ONLY = '1'
  const scope = createControlledFreshCandidateOperationScope()
  posixChildCheckpoint = 'ledger-open'
  const ledger = await initializeControlledFreshCandidateOwnerLedger(scope, { testOnlyApprovedRoot: root })
  try {
    if (mode === 'consume') {
      posixChildCheckpoint = 'marker-consume'
      const consumed = createControlledFreshCandidateDurableReceiptConsumer(ledger)(identity)
      process.stdout.write(consumed ? 'CONSUMED\n' : 'REJECTED\n')
      return true
    }
    const consumed = createControlledFreshCandidateDurableMarker({
      directoryHandle: ledger.receiptHandle,
      markerDigest: identity,
      content: 'controlled crash marker\n',
      syncDirectory: (handle) => {
        if (mode === 'crash-before-directory-sync') process.kill(process.pid, 'SIGKILL')
        fsyncSync(handle)
        if (mode === 'crash-after-directory-sync') process.kill(process.pid, 'SIGKILL')
      },
    })
    process.stdout.write(consumed ? 'CONSUMED\n' : 'REJECTED\n')
    return true
  } finally {
    posixChildCheckpoint = 'ledger-close'
    ledger.close()
    posixChildCheckpoint = 'scope-close'
    scope.close()
  }
}

async function createTestLedger(root: string, authorizationKey: Buffer) {
  mkdirSync(root, { recursive: true, mode: 0o700 })
  chmodSync(root, 0o700)
  return openTestLedger(root, authorizationKey)
}

async function openTestLedger(root: string, authorizationKey: Buffer) {
  process.env.CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY = root
  process.env.CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64 = authorizationKey.toString('base64')
  process.env.CFC_NATIVE_EXT4_TEST_ONLY = '1'
  const scope = createControlledFreshCandidateOperationScope()
  const ledger = await initializeControlledFreshCandidateOwnerLedger(scope, { testOnlyApprovedRoot: root })
  return { ledger, scope }
}

function executionGrant(destinationDigest: string, seed: number): ControlledFreshCandidateExecutionGrant {
  const issuedAt = new Date(Date.now() - 1_000).toISOString()
  const unsigned = {
    version: CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
    executionIdentity: `runtime-execution-${seed}`,
    manifestDigest: controlledFreshCandidateDigest({ seed, stockCandidate: `SN${String(3000 + seed).padStart(4, '0')}` }),
    contractIdentity: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
    runtimeIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
    runtimeCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
    environmentIdentity: 'runtime-test-environment',
    approvedReceiptDestinationDigest: destinationDigest,
    issuedAt,
    notBefore: issuedAt,
    expiresAt: new Date(Date.parse(issuedAt) + 30 * 60 * 1_000).toISOString(),
  }
  return { ...unsigned, authorizationIdentity: deriveControlledFreshCandidateAuthorizationIdentity(unsigned) }
}

function sealedRuntimeReceipt(seed: number, receiptDestinationDigest = 'd'.repeat(64)): string {
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
      issuedAt: new Date(Date.now() - 1_000).toISOString(),
      notBefore: new Date(Date.now() - 1_000).toISOString(),
      expiresAt: new Date(Date.now() + 29 * 60 * 1_000).toISOString(),
      consumed: true,
    },
    executionId: `runtime-execution-${seed}`,
    manifest,
    runtime: {
      identity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      contract: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
      commit: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
      environment: 'runtime-test-environment',
      receiptDestinationDigest,
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
    finalization: { requested: false, observed: false },
    mutationResourceTeardown: { attempted: false, completed: false, status: 'not_started' },
    authorityClosure: { status: 'pending_not_attested', boundary: 'outside_durable_receipt' },
  }, new Uint8Array(32).fill(61)))
}

async function main(): Promise<void> {
  if (await runPosixPrimitiveChildMode()) return
  if (process.env.CONTROLLED_FRESH_CANDIDATE_OFFLINE_GUARD_PATH) {
    assert.throws(() => fetch('https://transport.invalid'), /CONTROLLED_FRESH_CANDIDATE_OFFLINE_TRANSPORT_BLOCKED/)
  }
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

  if (process.platform === 'win32') {
    for (const argv of [
      [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      [CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION],
    ]) {
      const io = captureIo()
      let initialized = 0
      process.env.PAYLOAD_DB_PUSH = 'windows-refusal-sentinel'
      process.env.PAYLOAD_DROP_DATABASE = 'windows-drop-refusal-sentinel'
      const code = await runControlledFreshCandidateRuntime({
        argv,
        io: io.io,
        initializeCreation: async () => { initialized += 1; throw new Error('must not initialize') },
        initializeVerification: async () => { initialized += 1; throw new Error('must not initialize') },
      })
      assert.equal(code, 2)
      assert.equal(initialized, 0)
      assert.equal(process.env.PAYLOAD_DB_PUSH, 'windows-refusal-sentinel')
      assert.equal(process.env.PAYLOAD_DROP_DATABASE, 'windows-drop-refusal-sentinel')
      assert.deepEqual(io.stdout, [])
      assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_REFUSED: POSIX_RUNTIME_REQUIRED'])
    }
  } else {
  {
    const io = captureIo()
    let initialized = 0
    const code = await runControlledFreshCandidateRuntimeProduction({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async () => { initialized += 1; throw new Error('must not initialize') },
    })
    assert.equal(code, 2)
    assert.equal(initialized, 0)
    assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_REFUSED: EXECUTION_READINESS_REQUIRED'])
  }
  {
    const io = captureIo()
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
    })
    assert.equal(code, 2)
    assert.deepEqual(io.stdout, [])
    assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_REFUSED: EXECUTION_READINESS_REQUIRED'])
  }
  {
    const io = captureIo()
    let destroyed = 0
    process.env.PAYLOAD_DB_PUSH = 'synthetic-not-false'
    process.env.PAYLOAD_DROP_DATABASE = 'true'
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async (scope) => {
        assert.equal(process.env.PAYLOAD_DB_PUSH, 'false')
        assert.equal(process.env.PAYLOAD_DROP_DATABASE, 'false')
        return {
          ...inertObservationHooks(),
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
    let observedScope: ReturnType<typeof createControlledFreshCandidateOperationScope> | null = null
    const outputStates: string[] = []
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: {
        stdout: () => { outputStates.push(observedScope?.state ?? 'missing') },
        stderr: () => { outputStates.push(observedScope?.state ?? 'missing') },
      },
      initializeCreation: async (scope) => {
        observedScope = scope
        return {
          ...inertObservationHooks(),
          creationInput: null as never,
          creationDependencies: {} as ControlledFreshCandidateCreationDependencies,
          scope,
          destroy: async () => ({ ok: true }),
        }
      },
    })
    assert.equal(code, 3)
    assert.deepEqual(outputStates, ['CLOSED'])
  }

  {
    const io = captureIo()
    const code = await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      io: io.io,
      initializeCreation: async (scope) => {
        const unreachable = async () => { throw new Error('unreachable controlled mutation') }
        const creationInput: ControlledFreshCandidateCreationInput = {
          executionAuthorization: {
            identity: 'runtime-authority-close-test',
            token: new Uint8Array(32).fill(41),
            issuedAt: new Date(Date.now() - 1_000).toISOString(),
            notBefore: new Date(Date.now() - 1_000).toISOString(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
          executionId: 'runtime-authority-close-execution',
          authorizationContext: {
            runtimeCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
            environmentIdentity: 'runtime-authority-close-environment',
            approvedReceiptDestinationDigest: 'f'.repeat(64),
          },
          manifest: {
            identity: 'runtime-authority-close-manifest',
            title: 'Synthetic offline controlled candidate',
            positivePrice: 1,
            provenanceStatement: 'Synthetic offline owner evidence.',
            stockCandidate: 'SN9901',
            original: {
              bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
              mimeType: 'image/png',
              width: 1,
              height: 1,
            },
          },
          receiptKey: new Uint8Array(32).fill(42),
        }
        const preparedManifest = prepareControlledFreshCandidateManifest({
          executionId: creationInput.executionId,
          manifest: creationInput.manifest,
        })
        creationInput.executionAuthorization.identity = deriveControlledFreshCandidateAuthorizationIdentity({
          version: CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
          executionIdentity: creationInput.executionId,
          manifestDigest: preparedManifest.digest,
          contractIdentity: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
          runtimeIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
          runtimeCommitIdentity: creationInput.authorizationContext.runtimeCommitIdentity,
          environmentIdentity: creationInput.authorizationContext.environmentIdentity,
          approvedReceiptDestinationDigest: creationInput.authorizationContext.approvedReceiptDestinationDigest,
          issuedAt: creationInput.executionAuthorization.issuedAt,
          notBefore: creationInput.executionAuthorization.notBefore,
          expiresAt: creationInput.executionAuthorization.expiresAt,
        })
        const creationDependencies: ControlledFreshCandidateCreationDependencies = {
          scope,
          consumeExecutionAuthorization: async () => false,
          stockExists: unreachable,
          createTransactionRequest: unreachable,
          beginProductTransaction: unreachable,
          createProduct: unreachable,
          commitProductTransaction: unreachable,
          rollbackProductTransaction: unreachable,
          readProduct: unreachable,
          createMedia: unreachable,
          readMedia: unreachable,
          updateProductRelationship: unreachable,
          finalizeProduct: unreachable,
          persistPrivateReceipt: unreachable,
          revokeMutationCapability: async () => undefined,
          teardown: async () => ({ ok: true }),
          closeAuthorityResources: async () => ({ ok: false }),
        }
        return {
          ...inertObservationHooks(),
          creationInput,
          creationDependencies,
          scope,
          destroy: async () => ({ ok: false }),
        }
      },
    })
    assert.equal(code, 3)
    assert.equal(io.stderr.length, 0)
    assert.equal(io.stdout.length, 1)
    const report = JSON.parse(io.stdout[0] ?? '{}') as { reasonCodes?: unknown }
    assert.deepEqual(report.reasonCodes, ['AUTHORITY_CLOSURE_FAILED'])
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
        ...inertObservationHooks(),
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
    let releaseInitialization: (() => void) | null = null
    const started = Date.now()
    const execution = runControlledFreshCandidateRuntime({
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
        return new Promise<never>((resolve) => { releaseInitialization = resolve })
      },
    })
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.deepEqual(io.stdout, [])
    assert.deepEqual(io.stderr, [])
    assert.ok(releaseInitialization)
    releaseInitialization()
    const code = await execution
    assert.equal(code, 1)
    assert.equal(cancellationEstablished, true)
    assert.ok(Date.now() - started >= 30)
    assert.deepEqual(io.stderr, ['CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE'])
  }
  }

  if (process.platform === 'linux') {
    const exactMountInfo = (size: number): Buffer => {
      const prefix = '36 25 0:32 / / rw - ext4 '
      const suffix = ' rw\n'
      const padding = size - Buffer.byteLength(prefix) - Buffer.byteLength(suffix)
      assert.ok(padding >= 1)
      return Buffer.from(`${prefix}${'x'.repeat(padding)}${suffix}`, 'utf8')
    }
    const mountInfoOperations = (bytes: Buffer, options: {
      declaredSize?: number
      changeMetadata?: boolean
      closeFails?: boolean
    } = {}) => {
      let offset = 0
      let statCalls = 0
      return {
        open: () => 91,
        stat: () => {
          statCalls += 1
          return {
            dev: 4n,
            ino: 91n,
            uid: BigInt(process.getuid!()),
            mode: 0o100444n,
            size: BigInt(options.declaredSize ?? 0),
            nlink: 1n,
            ctimeNs: options.changeMetadata && statCalls > 1 ? 2n : 1n,
            mtimeNs: 1n,
            isFile: () => true,
          }
        },
        read: (_handle: number, buffer: Buffer, targetOffset: number, length: number) => {
          const count = Math.min(length, bytes.byteLength - offset)
          if (count <= 0) return 0
          bytes.copy(buffer, targetOffset, offset, offset + count)
          offset += count
          return count
        },
        close: () => {
          if (options.closeFails) throw new Error('RAW_MOUNTINFO_CLOSE_SENTINEL')
        },
      }
    }
    const exactCeilingMountInfo = exactMountInfo(CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES)
    const boundedMountInfo = readControlledFreshCandidateMountInfo(mountInfoOperations(exactCeilingMountInfo))
    assert.equal(Buffer.byteLength(boundedMountInfo), CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES)
    assert.equal(parseControlledFreshCandidateMountInfo(boundedMountInfo)[0]?.filesystem, 'ext4')
    await assert.rejects(async () => readControlledFreshCandidateMountInfo(
      mountInfoOperations(exactMountInfo(CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES + 1)),
    ), /filesystem_unsupported/)
    await assert.rejects(async () => readControlledFreshCandidateMountInfo(
      mountInfoOperations(exactMountInfo(512), { changeMetadata: true }),
    ), /filesystem_unsupported/)
    await assert.rejects(async () => readControlledFreshCandidateMountInfo(
      mountInfoOperations(exactMountInfo(512), { declaredSize: 513 }),
    ), /filesystem_unsupported/)
    await assert.rejects(async () => readControlledFreshCandidateMountInfo(
      mountInfoOperations(Buffer.from([0xff, 0xfe, 0xfd])),
    ), /filesystem_unsupported/)
    await assert.rejects(async () => readControlledFreshCandidateMountInfo(
      mountInfoOperations(exactMountInfo(512), { closeFails: true }),
    ), /filesystem_unsupported/)
    assert.throws(() => parseControlledFreshCandidateMountInfo('malformed mountinfo\n'), /filesystem_unsupported/)
    assert.throws(() => parseControlledFreshCandidateMountInfo('x 25 0:32 / / rw - ext4 /dev/root rw\n'), /filesystem_unsupported/)
    assert.throws(() => parseControlledFreshCandidateMountInfo('36 25 0:32 / / rw unknown - ext4 /dev/root rw\n'), /filesystem_unsupported/)
    assert.throws(() => parseControlledFreshCandidateMountInfo('36 25 0:32 / / rw - ext4 /dev/root rw\n\n'), /filesystem_unsupported/)
    const nativeMountInfo = readControlledFreshCandidateMountInfo()
    assert.ok(Buffer.byteLength(nativeMountInfo) <= CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES)
    assert.ok(parseControlledFreshCandidateMountInfo(nativeMountInfo).length > 0)

    const nativeTestParent = process.env.CFC_POSIX_TEST_NATIVE_ROOT ?? process.cwd()
    const temporaryRoot = mkdtempSync(path.join(nativeTestParent, '.uygunayakkabi-cfc-posix-test-'))
    chmodSync(temporaryRoot, 0o700)
    const authorizationKey = Buffer.alloc(32, 71)
    const ledgerState = await createTestLedger(path.join(temporaryRoot, 'owner-ledger'), authorizationKey)
    const { ledger, scope } = ledgerState
    try {
      const receiptParent = path.join(temporaryRoot, 'receipts')
      mkdirSync(receiptParent, { mode: 0o700 })
      chmodSync(receiptParent, 0o700)
      const destination = (basename: string) => openControlledFreshCandidatePhysicalReceiptDestination(
        path.join(receiptParent, basename),
        ledger.device,
      )
      const digest = (physical: ReturnType<typeof destination>) => controlledFreshCandidateReceiptDestinationDigest({
        destination: physical,
        runtimeCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
        environmentIdentity: 'runtime-test-environment',
      })
      const signal = new AbortController().signal

      const observationOperationId = '11111111-1111-4111-8111-111111111111'
      const observationOperation = createControlledFreshCandidateOperationDirectory(ledger, observationOperationId)
      const observationPath = path.join(observationOperation.path, 'observation.json')
      const observationDestination = openControlledFreshCandidatePhysicalReceiptDestination(
        observationPath,
        ledger.device,
      )
      const observationKey = new Uint8Array(32).fill(72)
      let observationNow = Date.now()
      const initialObservationState = createControlledFreshCandidateObservationState({
        operationId: observationOperationId,
        key: observationKey,
        now: () => observationNow,
        persist: () => undefined,
      })
      writeControlledFreshCandidatePrivateFileExclusive({
        destination: observationDestination,
        bytes: Buffer.from(serializeControlledFreshCandidateObservation(initialObservationState.current())),
      })
      const observationState = createControlledFreshCandidateObservationState({
        operationId: observationOperationId,
        key: observationKey,
        now: () => observationNow,
        persist: createControlledFreshCandidateAtomicSnapshotPersistence(observationDestination),
      })
      const observedSequences: number[] = []
      const readers = Array.from({ length: 4 }, async () => {
        const { readFile } = await import('node:fs/promises')
        for (let index = 0; index < 30; index += 1) {
          const report = authenticateControlledFreshCandidateObservation({
            bytes: await readFile(observationPath),
            key: observationKey,
            expectedOperationId: observationOperationId,
            now: observationNow,
          })
          observedSequences.push(report.sequence)
          await new Promise<void>((resolve) => setImmediate(resolve))
        }
      })
      const writer = (async () => {
        for (let index = 0; index < 20; index += 1) {
          observationNow += 1
          observationState.publish((draft) => {
            draft.phase = 'initializing'
            draft.resources.pendingAcquisitions = index % 2
          })
          await new Promise<void>((resolve) => setImmediate(resolve))
        }
      })()
      await Promise.all([...readers, writer])
      assert.equal(observedSequences.length, 120)
      assert.ok(observedSequences.every((sequence) => Number.isSafeInteger(sequence) && sequence >= 0 && sequence <= 20))
      assert.equal(readdirSync(observationOperation.path).some((entry) => entry.endsWith('.next')), false)
      observationDestination.close()
      closeSync(observationOperation.handle)

      const receiptA = destination('a.receipt.json')
      const receiptB = destination('b.receipt.json')
      const grant = executionGrant(digest(receiptA), 1)
      const token = createControlledFreshCandidateExecutionGrantToken(grant, authorizationKey)
      const first = createControlledFreshCandidateReceiptPersistence({
        receiptDestination: receiptA, destinationDigest: digest(receiptA), executionId: grant.executionIdentity, ledger,
      })
      const alternate = createControlledFreshCandidateReceiptPersistence({
        receiptDestination: receiptB, destinationDigest: digest(receiptB), executionId: grant.executionIdentity, ledger,
      })
      assert.equal(await first.consume(grant, token, signal, Date.now()), true)
      assert.equal(await alternate.consume(grant, token, signal, Date.now()), false)
      assert.equal(await createControlledFreshCandidateReceiptPersistence({
        receiptDestination: receiptA, destinationDigest: digest(receiptA), executionId: grant.executionIdentity, ledger,
      }).consume(grant, token, signal, Date.now()), false)

      const receiptC = destination('c.receipt.json')
      const concurrentGrant = executionGrant(digest(receiptC), 2)
      const concurrentToken = createControlledFreshCandidateExecutionGrantToken(concurrentGrant, authorizationKey)
      const concurrentResults = await Promise.all([
        createControlledFreshCandidateReceiptPersistence({
          receiptDestination: receiptC, destinationDigest: digest(receiptC), executionId: concurrentGrant.executionIdentity, ledger,
        }).consume(concurrentGrant, concurrentToken, signal, Date.now()),
        createControlledFreshCandidateReceiptPersistence({
          receiptDestination: receiptC, destinationDigest: digest(receiptC), executionId: concurrentGrant.executionIdentity, ledger,
        }).consume(concurrentGrant, concurrentToken, signal, Date.now()),
      ])
      assert.deepEqual([...concurrentResults].sort(), [false, true])

      const receiptD = destination('d.receipt.json')
      const boundGrant = executionGrant(digest(receiptD), 3)
      const boundToken = createControlledFreshCandidateExecutionGrantToken(boundGrant, authorizationKey)
      const boundPersistence = createControlledFreshCandidateReceiptPersistence({
        receiptDestination: receiptD, destinationDigest: digest(receiptD), executionId: boundGrant.executionIdentity, ledger,
      })
      for (const changed of [
        { ...boundGrant, manifestDigest: 'e'.repeat(64) },
        { ...boundGrant, environmentIdentity: 'changed-environment' },
        { ...boundGrant, runtimeCommitIdentity: 'changed-commit' },
        { ...boundGrant, approvedReceiptDestinationDigest: 'f'.repeat(64) },
      ]) assert.equal(await boundPersistence.consume(changed, boundToken, signal, Date.now()), false)
      assert.equal(await boundPersistence.consume(boundGrant, boundToken, signal, Date.now()), true)

      const receiptExpired = destination('expired.receipt.json')
      const expiredGrant = executionGrant(digest(receiptExpired), 30)
      const expiredToken = createControlledFreshCandidateExecutionGrantToken(expiredGrant, authorizationKey)
      const authorizationMarkersBeforeExpiry = readdirSync(ledger.authorizationDirectory).length
      const expiredPersistence = createControlledFreshCandidateReceiptPersistence({
        receiptDestination: receiptExpired,
        destinationDigest: digest(receiptExpired),
        executionId: expiredGrant.executionIdentity,
        ledger,
        now: () => Date.parse(expiredGrant.expiresAt),
      })
      assert.equal(await expiredPersistence.consume(
        expiredGrant,
        expiredToken,
        signal,
        Date.parse(expiredGrant.expiresAt) - 1,
      ), false)
      assert.equal(readdirSync(ledger.authorizationDirectory).length, authorizationMarkersBeforeExpiry)
      assert.equal(lstatSync(path.join(receiptParent, 'expired.receipt.json'), { throwIfNoEntry: false }), undefined)
      receiptExpired.close()

      const consume = createControlledFreshCandidateDurableReceiptConsumer(ledger)
      const firstIdentity = controlledFreshCandidateDigest({ receipt: 0 })
      assert.equal(consume(firstIdentity), true)
      for (let index = 1; index <= 1_025; index += 1) {
        assert.equal(consume(controlledFreshCandidateDigest({ receipt: index })), true)
      }
      assert.equal(consume(firstIdentity), false)
      assert.equal(readdirSync(ledger.receiptDirectory).length >= 1_026, true)
      const firstMarkerStat = lstatSync(path.join(ledger.receiptDirectory, `${firstIdentity}.used`), { bigint: true })
      assert.equal(firstMarkerStat.uid, BigInt(process.getuid!()))
      assert.equal(firstMarkerStat.mode & 0o777n, 0o600n)

      const crossProcessIdentity = controlledFreshCandidateDigest({ crossProcess: true })
      const childEnvironment = {
        CFC_POSIX_CHILD_MODE: 'consume',
        CFC_POSIX_TEST_ENTRY_PATH: process.env.CFC_POSIX_TEST_ENTRY_PATH ?? (process.argv[1] as string),
        CFC_POSIX_LEDGER_ROOT: ledger.root,
        CFC_POSIX_AUTHORIZATION_KEY_BASE64: authorizationKey.toString('base64'),
        CFC_POSIX_MARKER_IDENTITY: crossProcessIdentity,
      }
      const concurrentChildren = await Promise.all([
        asyncPosixPrimitiveChild(childEnvironment),
        asyncPosixPrimitiveChild(childEnvironment),
      ])
      assert.equal(
        concurrentChildren.every((result) => result.status === 0 && result.signal === null && result.stderr === ''),
        true,
        JSON.stringify(concurrentChildren),
      )
      assert.equal(concurrentChildren.filter((result) => result.stdout.trim() === 'CONSUMED').length, 1)
      assert.equal(concurrentChildren.filter((result) => result.stdout.trim() === 'REJECTED').length, 1)
      const restarted = await asyncPosixPrimitiveChild(childEnvironment)
      assert.equal(restarted.status, 0)
      assert.equal(restarted.stdout.trim(), 'REJECTED')

      for (const [label, syncFile, syncDirectory] of [
        ['file-sync-failure', () => { throw new Error('synthetic_file_sync_failure') }, undefined],
        ['directory-sync-failure', fsyncSync, () => { throw new Error('synthetic_directory_sync_failure') }],
      ] as const) {
        const identity = controlledFreshCandidateDigest({ label })
        assert.equal(createControlledFreshCandidateDurableMarker({
          directoryHandle: ledger.receiptHandle,
          markerDigest: identity,
          content: 'complete marker content\n',
          syncFile,
          syncDirectory,
        }), false)
        assert.equal(consume(identity), false)
      }
      const partialIdentity = controlledFreshCandidateDigest({ partial: true })
      const partialPath = path.join(ledger.receiptDirectory, `${partialIdentity}.used`)
      writeFileSync(partialPath, 'partial', { mode: 0o600 })
      assert.equal(consume(partialIdentity), false)

      let directorySyncAcknowledged = false
      const acknowledgedIdentity = controlledFreshCandidateDigest({ acknowledged: true })
      const acknowledged = createControlledFreshCandidateDurableMarker({
        directoryHandle: ledger.receiptHandle,
        markerDigest: acknowledgedIdentity,
        content: 'complete marker content\n',
        syncDirectory: (handle) => {
          fsyncSync(handle)
          directorySyncAcknowledged = true
        },
      })
      assert.equal(acknowledged, true)
      assert.equal(directorySyncAcknowledged, true)

      for (const mode of ['crash-before-directory-sync', 'crash-after-directory-sync']) {
        const identity = controlledFreshCandidateDigest({ mode })
        const crashed = await asyncPosixPrimitiveChild({
          ...childEnvironment,
          CFC_POSIX_CHILD_MODE: mode,
          CFC_POSIX_MARKER_IDENTITY: identity,
        })
        assert.notEqual(crashed.signal, null)
        assert.equal(consume(identity), false)
      }

      const replacedParent = path.join(temporaryRoot, 'replace-parent')
      mkdirSync(replacedParent, { mode: 0o700 })
      const replacedDestination = openControlledFreshCandidatePhysicalReceiptDestination(
        path.join(replacedParent, 'replace.receipt.json'), ledger.device,
      )
      renameSync(replacedParent, `${replacedParent}.old`)
      mkdirSync(replacedParent, { mode: 0o700 })
      const replacementGrant = executionGrant(controlledFreshCandidateReceiptDestinationDigest({
        destination: replacedDestination,
        runtimeCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
        environmentIdentity: 'runtime-test-environment',
      }), 4)
      assert.equal(await createControlledFreshCandidateReceiptPersistence({
        receiptDestination: replacedDestination,
        destinationDigest: replacementGrant.approvedReceiptDestinationDigest,
        executionId: replacementGrant.executionIdentity,
        ledger,
      }).consume(replacementGrant, createControlledFreshCandidateExecutionGrantToken(replacementGrant, authorizationKey), signal, Date.now()), false)
      replacedDestination.close()

      const linkedParent = path.join(temporaryRoot, 'linked-parent')
      symlinkSync(receiptParent, linkedParent, 'dir')
      assert.throws(() => openControlledFreshCandidatePhysicalReceiptDestination(
        path.join(linkedParent, 'linked.receipt.json'), ledger.device,
      ), /linked|authority|noncanonical/)

      const physicalInputRoot = path.join(temporaryRoot, 'physical-inputs')
      mkdirSync(physicalInputRoot, { mode: 0o700 })
      chmodSync(physicalInputRoot, 0o700)
      const createSizedPrivateFile = (filePath: string, size: number): void => {
        const descriptor = openSync(filePath, 'w', 0o600)
        try { ftruncateSync(descriptor, size) } finally { closeSync(descriptor) }
        chmodSync(filePath, 0o600)
      }
      const markersBeforeInputFailures = readdirSync(ledger.authorizationDirectory).length
        + readdirSync(ledger.receiptDirectory).length
      for (const kind of ['authority', 'manifest', 'original'] as const) {
        const oversizedPath = path.join(physicalInputRoot, `${kind}-oversized.bin`)
        createSizedPrivateFile(oversizedPath, CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS[kind] + 1)
        await assert.rejects(
          () => readControlledFreshCandidatePrivateFile(scope, oversizedPath, ledger.device, kind),
          /file_authority_invalid/,
        )

        const linkedPath = path.join(physicalInputRoot, `${kind}-linked.bin`)
        createSizedPrivateFile(linkedPath, 1)
        linkSync(linkedPath, `${linkedPath}.alias`)
        await assert.rejects(
          () => readControlledFreshCandidatePrivateFile(scope, linkedPath, ledger.device, kind),
          /file_authority_invalid/,
        )
      }

      const oversizedReceiptPath = path.join(receiptParent, 'oversized.receipt.json')
      const oversizedReceipt = openControlledFreshCandidatePhysicalReceiptDestination(
        oversizedReceiptPath,
        ledger.device,
      )
      createSizedPrivateFile(oversizedReceiptPath, CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS.receipt + 1)
      await assert.rejects(() => readPhysicalReceiptBytes(scope, oversizedReceipt), /receipt_authority_invalid/)
      oversizedReceipt.close()

      const linkedReceiptPath = path.join(receiptParent, 'hard-linked.receipt.json')
      const linkedReceipt = openControlledFreshCandidatePhysicalReceiptDestination(linkedReceiptPath, ledger.device)
      createSizedPrivateFile(linkedReceiptPath, 1)
      linkSync(linkedReceiptPath, `${linkedReceiptPath}.alias`)
      await assert.rejects(() => readPhysicalReceiptBytes(scope, linkedReceipt), /receipt_authority_invalid/)
      linkedReceipt.close()

      const linkRacePath = path.join(physicalInputRoot, 'link-race.bin')
      createSizedPrivateFile(linkRacePath, 32 * 1024)
      const linkRace = readControlledFreshCandidatePrivateFile(scope, linkRacePath, ledger.device, 'manifest')
      linkSync(linkRacePath, `${linkRacePath}.alias`)
      await assert.rejects(() => linkRace, /file_authority_invalid/)

      const removedLinkRacePath = path.join(physicalInputRoot, 'removed-link-race.bin')
      const removedLinkRaceAlias = `${removedLinkRacePath}.alias`
      createSizedPrivateFile(removedLinkRacePath, 32 * 1024)
      const removedLinkRace = readControlledFreshCandidatePrivateFile(scope, removedLinkRacePath, ledger.device, 'manifest')
      linkSync(removedLinkRacePath, removedLinkRaceAlias)
      unlinkSync(removedLinkRaceAlias)
      await assert.rejects(() => removedLinkRace, /file_authority_invalid/)

      const replacementPath = path.join(physicalInputRoot, 'replacement-race.bin')
      createSizedPrivateFile(replacementPath, 256 * 1024)
      const replacementRead = readControlledFreshCandidatePrivateFile(scope, replacementPath, ledger.device, 'original')
      renameSync(replacementPath, `${replacementPath}.old`)
      createSizedPrivateFile(replacementPath, 256 * 1024)
      await assert.rejects(() => replacementRead, /file_authority_invalid/)

      const sizeRacePath = path.join(physicalInputRoot, 'size-race.bin')
      createSizedPrivateFile(sizeRacePath, 256 * 1024)
      const sizeRace = readControlledFreshCandidatePrivateFile(scope, sizeRacePath, ledger.device, 'original')
      const sizeRaceDescriptor = openSync(sizeRacePath, 'r+')
      try { ftruncateSync(sizeRaceDescriptor, 128 * 1024) } finally { closeSync(sizeRaceDescriptor) }
      await assert.rejects(() => sizeRace, /file_authority_invalid/)

      const linkedFileTarget = path.join(physicalInputRoot, 'symlink-target.bin')
      createSizedPrivateFile(linkedFileTarget, 1)
      const linkedFilePath = path.join(physicalInputRoot, 'symlink-input.bin')
      symlinkSync(linkedFileTarget, linkedFilePath, 'file')
      await assert.rejects(
        () => readControlledFreshCandidatePrivateFile(scope, linkedFilePath, ledger.device, 'manifest'),
        /ELOOP|authority_invalid|linked/,
      )
      assert.equal(
        readdirSync(ledger.authorizationDirectory).length + readdirSync(ledger.receiptDirectory).length,
        markersBeforeInputFailures,
      )

      const unsafeRoot = path.join(temporaryRoot, 'unsafe-root')
      mkdirSync(unsafeRoot, { mode: 0o700 })
      chmodSync(unsafeRoot, 0o750)
      await assert.rejects(() => openTestLedger(unsafeRoot, authorizationKey), /authority_invalid/)
      const symlinkRoot = path.join(temporaryRoot, 'symlink-root')
      symlinkSync(ledger.root, symlinkRoot, 'dir')
      await assert.rejects(() => openTestLedger(symlinkRoot, authorizationKey), /linked/)

      const temporaryFilesystemRoot = mkdtempSync(path.join(tmpdir(), 'cfc-non-ext4-'))
      try {
        chmodSync(temporaryFilesystemRoot, 0o700)
        await assert.rejects(() => openTestLedger(temporaryFilesystemRoot, authorizationKey), /filesystem_unsupported/)
      } finally { rmSync(temporaryFilesystemRoot, { recursive: true, force: true }) }
      const windowsMountTestParent = process.env.CFC_NON_EXT4_TEST_PARENT
      if (windowsMountTestParent) {
        const windowsMountRoot = mkdtempSync(path.join(windowsMountTestParent, 'cfc-non-ext4-'))
        try {
          chmodSync(windowsMountRoot, 0o700)
          await assert.rejects(() => openTestLedger(windowsMountRoot, authorizationKey), /filesystem_unsupported/)
        } finally { rmSync(windowsMountRoot, { recursive: true, force: true }) }
      }

      const persistenceIntegrationRoot = path.join(temporaryRoot, 'production-persistence-ledger')
      const persistenceLedgerState = await createTestLedger(persistenceIntegrationRoot, Buffer.alloc(32, 83))
      const persistenceLedger = persistenceLedgerState.ledger
      const persistenceScope = persistenceLedgerState.scope
      const persistenceReceiptParent = path.join(temporaryRoot, 'production-persistence-receipts')
      mkdirSync(persistenceReceiptParent, { mode: 0o700 })
      chmodSync(persistenceReceiptParent, 0o700)
      const persistenceReceiptPath = path.join(persistenceReceiptParent, 'final.receipt.json')
      const persistenceDestination = openControlledFreshCandidatePhysicalReceiptDestination(
        persistenceReceiptPath,
        persistenceLedger.device,
      )
      const persistenceDigest = controlledFreshCandidateReceiptDestinationDigest({
        destination: persistenceDestination,
        runtimeCommitIdentity: '14af0deb7e1825eb5d349c89e1d36897e75fc5a0',
        environmentIdentity: 'runtime-test-environment',
      })
      const persistenceGrant = executionGrant(persistenceDigest, 150)
      const persistenceToken = createControlledFreshCandidateExecutionGrantToken(
        persistenceGrant,
        persistenceLedger.authorizationKey,
      )
      const productionPersistence = createControlledFreshCandidateReceiptPersistence({
        receiptDestination: persistenceDestination,
        destinationDigest: persistenceDigest,
        executionId: persistenceGrant.executionIdentity,
        ledger: persistenceLedger,
      })
      const persistenceEvents: string[] = []
      const persistenceMutationActive = { current: true }
      const persistenceRegistry = createControlledFreshCandidateTerminalResourceRegistry({
        scope: persistenceScope,
        mutationActive: persistenceMutationActive,
        dispatcher: {
          destroy: async () => { persistenceEvents.push('mutation-resources-torn-down') },
        },
      })
      persistenceScope.registerCancellation(persistenceRegistry.terminalizeOwnedResources)
      assert.equal(await productionPersistence.consume(persistenceGrant, persistenceToken, signal, Date.now()), true)
      persistenceMutationActive.current = false
      await persistenceRegistry.terminalizeOwnedResources()
      const finalReceipt = sealedRuntimeReceipt(150, persistenceDigest)
      await productionPersistence.persist(finalReceipt, signal)
      persistenceEvents.push('final-receipt-durable')
      assert.equal(readFileSync(persistenceReceiptPath, 'utf8'), finalReceipt)
      assert.equal(readdirSync(persistenceReceiptParent).some((entry) => entry.endsWith('.next')), false)
      persistenceDestination.close()
      persistenceLedger.close()
      persistenceEvents.push('authority-closed')
      await persistenceScope.cancel()
      await persistenceScope.drain()
      persistenceScope.close()
      assert.deepEqual(persistenceEvents, [
        'mutation-resources-torn-down',
        'final-receipt-durable',
        'authority-closed',
      ])

      const rootStat = fstatSync(ledger.rootHandle, { bigint: true })
      assert.equal(rootStat.uid, BigInt(process.getuid!()))
      assert.equal(rootStat.mode & 0o777n, 0o700n)
      assert.equal(rootStat.dev, ledger.device)
      assert.ok(rootStat.ino > 0n)
      posixLedgerEvidence = true

      receiptA.close()
      receiptB.close()
      receiptC.close()
      receiptD.close()
    } finally {
      ledger.close()
      scope.close()
      rmSync(temporaryRoot, { recursive: true, force: true })
    }
  }

  if (process.env.CFC_POSIX_PRIMITIVE_ONLY === '1') {
    assert.equal(posixLedgerEvidence, true)
    console.log(JSON.stringify({
      result: 'controlledFreshCandidateRuntime POSIX primitives: ALL OK',
      filesystem: 'ext4',
      ledger: 'verified',
    }))
    return
  }

  {
    const { integer, jsonb, pgTable, serial, text } = await import('drizzle-orm/pg-core')
    const tables = {
      products: pgTable('products', { id: serial('id').primaryKey() }),
      products_rels: pgTable('products_rels', {
        id: serial('id').primaryKey(),
        order: integer('order'),
        parent: integer('parent_id'),
        path: text('path'),
        mediaID: integer('media_id'),
      }),
      media: pgTable('media', { id: serial('id').primaryKey(), product: integer('product_id') }),
      image_generation_jobs: pgTable('image_generation_jobs', { id: serial('id').primaryKey(), product: integer('product_id') }),
      payload_jobs: pgTable('payload_jobs', { id: serial('id').primaryKey(), taskSlug: text('task_slug'), input: jsonb('input') }),
      bot_events: pgTable('bot_events', { id: serial('id').primaryKey(), product: integer('product_id') }),
      story_jobs: pgTable('story_jobs', { id: serial('id').primaryKey(), product: integer('product_id') }),
    }
    const tableNameMap = new Map(Object.keys(tables).map((name) => [name, name]))
    const collections = Object.fromEntries([
      ['products', 'products'],
      ['media', 'media'],
      ['image-generation-jobs', 'image-generation-jobs'],
      ['payload-jobs', 'payload-jobs'],
      ['bot-events', 'bot-events'],
      ['story-jobs', 'story-jobs'],
    ].map(([key, slug]) => [key, { config: { slug } }]))
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
      duplicateMapping?: boolean
      missingColumn?: boolean
      inconsistentCollection?: boolean
      evidence?: 'media' | 'gallery' | 'image-job' | 'bot-event' | 'story-job' | 'queue'
    } = {}) => {
      const events: string[] = []
      let executeCalls = 0
      let product = {
        ...fixedControlledFreshCandidateProduct(manifest, 'blocked', mediaId),
        id: productId,
      }
      if (options.unsafeBeforeLock) product.featured = true
      const transaction = {
        execute: async () => {
          executeCalls += 1
          events.push(executeCalls <= 3 ? 'transaction-timeout' : executeCalls <= 10 ? 'table-lock' : 'queue-read')
          return executeCalls === 11
            ? { rows: [{ total_docs: options.evidence === 'queue' ? '1' : '0' }] }
            : { rows: [] }
        },
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
      const mappings = new Map(options.missingMapping ? [] : tableNameMap)
      if (options.duplicateMapping) mappings.set('ambiguous_media_alias', 'media')
      const effectiveTables = options.missingColumn
        ? { ...tables, media: { ...tables.media, product: undefined } }
        : tables
      const db = {
        tableNameMap: mappings,
        tables: effectiveTables,
        sessions,
        beginTransaction: async (configuration: Record<string, unknown>) => {
          events.push('transaction-begin')
          assert.deepEqual(configuration, {
            isolationLevel: 'read committed', accessMode: 'read write', deferrable: false,
          })
          return 'tx-1'
        },
        commitTransaction: async () => { events.push('transaction-commit') },
        rollbackTransaction: async () => { events.push('transaction-rollback') },
      }
      const payload = {
        collections: options.inconsistentCollection
          ? { ...collections, media: { config: { slug: 'media', dbName: 'guessed_media' } } }
          : collections,
        db,
        findByID: async () => {
          events.push('qualified-read')
          return structuredClone(product)
        },
        find: async (args: { collection?: string }) => {
          events.push(`relational-read:${args.collection}`)
          const docs = args.collection === 'media'
            ? [{
              id: mediaId,
              product: productId,
              type: 'original',
              generationLineage: null,
              altText: manifest.title,
              filename: manifest.original.filename,
              mimeType: manifest.original.mimeType,
            }]
            : []
          const evidenceMatches = (args.collection === 'media' && options.evidence === 'media')
            || (args.collection === 'products' && options.evidence === 'gallery')
            || (args.collection === 'image-generation-jobs' && options.evidence === 'image-job')
            || (args.collection === 'bot-events' && options.evidence === 'bot-event')
            || (args.collection === 'story-jobs' && options.evidence === 'story-job')
          if (evidenceMatches) docs.push({ id: 999 } as never)
          return {
            docs,
            totalDocs: docs.length,
            page: 1,
            totalPages: docs.length ? 1 : 0,
            hasNextPage: false,
            limit: 2,
          }
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
      assert.equal(state.events.filter((event) => event === 'table-lock').length, 7)
      assert.ok(state.events.indexOf('row-lock') < state.events.indexOf('qualified-read'))
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
      assert.equal(state.events.filter((event) => event === 'transaction-timeout').length, 3)
      assert.equal(state.events.filter((event) => event === 'table-lock').length, 7)
      assert.ok(state.events.indexOf('table-lock') < state.events.indexOf('row-lock'))
      assert.ok(state.events.indexOf('relational-read:story-jobs') < state.events.indexOf('queue-read'))
      assert.ok(state.events.indexOf('queue-read') < state.events.indexOf('canonical-update'))
      assert.deepEqual(state.events.slice(-2), ['canonical-update', 'transaction-commit'])
      state.scope.close()
    }

    for (const evidence of ['media', 'gallery', 'image-job', 'bot-event', 'story-job', 'queue'] as const) {
      const state = await atomicFixture({ evidence })
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
      }), /cas_missed/, evidence)
      assert.equal(state.events.includes('canonical-update'), false, evidence)
      assert.equal(state.events.at(-1), 'transaction-rollback', evidence)
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
      const state = await atomicFixture({ duplicateMapping: true })
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

    for (const configuration of [
      { missingColumn: true },
      { inconsistentCollection: true },
    ]) {
      const state = await atomicFixture(configuration)
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

  {
    const runtimeResourcesUrl = pathToFileURL(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts')).href
    const creationUrl = pathToFileURL(path.resolve('src/lib/controlledFreshCandidateCreation.ts')).href
    const installedAdapterCode = `
      let checkpoint = 'environment';
      void (async () => {
        const assert = (await import('node:assert/strict')).default;
        const { EventEmitter } = await import('node:events');
        checkpoint = 'resource-import';
        const resourcesImport = await import(${JSON.stringify(runtimeResourcesUrl)});
        const resources = resourcesImport.default ?? resourcesImport;
        const creationImport = await import(${JSON.stringify(creationUrl)});
        const creation = creationImport.default ?? creationImport;
        const { createControlledFreshCandidateOperationScope } = creation;
        checkpoint = 'environment-neutralization';
        for (const hostile of ['true', 'TRUE', '1', 'yes']) {
          checkpoint = 'environment-' + hostile.toLowerCase();
          process.env.PAYLOAD_DROP_DATABASE = hostile;
          process.env.PAYLOAD_DB_PUSH = hostile;
          resources.configureControlledFreshCandidateProcessBoundary();
          checkpoint = 'environment-' + hostile.toLowerCase() + '-assert';
          assert.equal(process.env.PAYLOAD_DROP_DATABASE, 'false');
          assert.equal(process.env.PAYLOAD_DB_PUSH, 'false');
        }
        checkpoint = 'adapter-import';
        const postgresModule = await import('@payloadcms/db-postgres');
        checkpoint = 'timer-isolation';
        const nativeSetTimeout = globalThis.setTimeout;
        let reconnectTimers = 0;
        const scheduledReconnects = [];
        globalThis.setTimeout = ((callback, _delay, ...args) => {
          reconnectTimers += 1;
          scheduledReconnects.push(() => callback(...args));
          return { ref() { return this; }, unref() { return this; }, hasRef() { return false; } };
        });
        try {
          checkpoint = 'faulted-reconnect-control';
          const faultCounters = { connects: 0, reconnects: 0, poolEnds: 0 };
          let faultedPool;
          class FaultedClient extends EventEmitter {
            constructor() { super(); this.release = () => undefined; }
            async end() {}
            unref() {}
          }
          class FaultedPool extends EventEmitter {
            constructor() { super(); this.client = new FaultedClient(); faultedPool = this; }
            async connect() {
              faultCounters.connects += 1;
              if (faultCounters.connects > 1) {
                faultCounters.reconnects += 1;
                throw new Error('RAW_RECONNECT_REJECTION');
              }
              return this.client;
            }
            async end() { faultCounters.poolEnds += 1; }
          }
          const faultedFactory = resources.createControlledFreshCandidateDatabaseAdapter({
            postgresModule,
            // Deliberately omit the production PoolClient prependListener refusal
            // so the installed adapter's former recurring timer chain is observable.
            pg: { Pool: FaultedPool, Client: FaultedClient },
            pool: {},
          });
          const faultedAdapter = faultedFactory.init({ payload: { logger: { info() {}, error() {} } } });
          faultedAdapter.rejectInitializing = () => undefined;
          await faultedAdapter.connect();
          assert.ok(faultedPool);
          faultedPool.client.emit('error', Object.assign(new Error('RAW_RECONNECT_CONTROL'), { code: 'ECONNRESET' }));
          await Promise.resolve();
          await Promise.resolve();
          assert.equal(faultCounters.connects, 2);
          assert.equal(faultCounters.reconnects, 1);
          assert.equal(reconnectTimers, 1);
          assert.equal(scheduledReconnects.length, 1);
          scheduledReconnects.shift()();
          await Promise.resolve();
          await Promise.resolve();
          assert.equal(faultCounters.connects, 3);
          assert.equal(faultCounters.reconnects, 2);
          assert.equal(reconnectTimers, 2);
          assert.equal(scheduledReconnects.length, 1);
          faultedPool.client.removeAllListeners();
          await faultedPool.end();

          reconnectTimers = 0;
          scheduledReconnects.length = 0;
          for (const phase of ['initialization', 'normal-work', 'finalization', 'cancellation', 'teardown']) {
            checkpoint = phase + '-setup';
            const scope = createControlledFreshCandidateOperationScope();
            const mutationActive = { current: true };
            const counters = {
              connects: 0, reconnects: 0, lateConnections: 0,
              poolEnds: 0, clientEnds: 0, clientRemovals: 0, dispatcherEnds: 0, ddlQueries: 0,
            };
            let lastPool;
            class FakeClient extends EventEmitter {
              constructor() { super(); this.release = () => undefined; }
              async end() { counters.clientEnds += 1; }
              unref() {}
            }
            class FakePool extends EventEmitter {
              constructor(options) {
                super();
                this.options = options;
                this.client = new FakeClient();
                this.checkedOut = false;
                lastPool = this;
              }
              async connect() {
                if (scope.state !== 'OPEN') counters.lateConnections += 1;
                counters.connects += 1;
                if (counters.connects > 1) {
                  counters.reconnects += 1;
                  throw new Error('RAW_RECONNECT_REJECTION');
                }
                if (this.options.missing) throw new Error('database RAW_DATABASE_IDENTITY does not exist');
                this.checkedOut = true;
                let released = false;
                this.client.release = (error) => {
                  if (released) throw new Error('RAW_DOUBLE_RELEASE');
                  released = true;
                  this.checkedOut = false;
                  if (error) void this.client.end().then(() => {
                    counters.clientRemovals += 1;
                    this.emit('remove', this.client);
                  });
                };
                this.emit('connect', this.client);
                return this.client;
              }
              async end() {
                if (this.checkedOut) throw new Error('RAW_POOL_END_WITH_CHECKOUT');
                if (counters.clientRemovals !== 1) throw new Error('RAW_POOL_END_BEFORE_CLIENT_REMOVAL');
                counters.poolEnds += 1;
              }
              async query() { counters.ddlQueries += 1; throw new Error('RAW_DDL_QUERY_SENTINEL'); }
            }
            const registry = resources.createControlledFreshCandidateTerminalResourceRegistry({
              scope,
              mutationActive,
              dispatcher: { destroy: async () => { counters.dispatcherEnds += 1; } },
            });
            scope.registerCancellation(registry.terminalizeOwnedResources);
            const ControlledPool = resources.createControlledFreshCandidatePoolConstructor({
              basePool: FakePool,
              onClient: registry.registerPoolClient,
              onClientAcquired: registry.registerPoolClientAcquisition,
              onClientReleased: registry.registerPoolClientRelease,
              onClientDestroyed: registry.registerPoolClientDestruction,
              onConstructed: registry.registerPool,
              onPoolAcquisitionStarted: registry.registerPoolAcquisition,
              onUnexpectedError: () => {
                mutationActive.current = false;
                scope.cancel().then(() => undefined, () => undefined);
              },
              canConstruct: () => scope.state !== 'CLOSED',
              canConnect: () => scope.state === 'OPEN',
            });
            const databaseFactory = resources.createControlledFreshCandidateDatabaseAdapter({
              postgresModule,
              pg: { Pool: ControlledPool, Client: FakeClient },
              pool: { phase },
            });
            const adapter = databaseFactory.init({ payload: { logger: { info() {}, error() {} } } });
            assert.equal(adapter.disableCreateDatabase, true);
            assert.equal(adapter.push, false);
            assert.deepEqual(Object.keys(adapter.extensions), []);
            assert.equal(Object.getOwnPropertyDescriptor(adapter, 'disableCreateDatabase').writable, false);
            assert.equal(Object.getOwnPropertyDescriptor(adapter, 'push').writable, false);
            await assert.rejects(() => adapter.createDatabase(), /database_management_forbidden/);
            await assert.rejects(() => adapter.dropDatabase(), /database_management_forbidden/);
            adapter.rejectInitializing = () => undefined;
            checkpoint = phase + '-connect';
            await adapter.connect();
            const pool = lastPool;
            assert.ok(pool);
            const emitReconnectError = () => pool.client.emit(
              'error', Object.assign(new Error('RAW_RECONNECT_ERROR'), { code: 'ECONNRESET' }),
            );
            if (phase === 'initialization' || phase === 'normal-work' || phase === 'finalization') emitReconnectError();
            if (phase === 'cancellation') { await scope.cancel(); emitReconnectError(); }
            if (phase === 'teardown') { await registry.terminalizeOwnedResources(); emitReconnectError(); }
            checkpoint = phase + '-drain';
            await scope.cancel();
            await scope.drain();
            scope.close();
            checkpoint = phase + '-assert';
            const connectsBeforeRefusal = counters.connects;
            await assert.rejects(() => pool.connect(), /pool_revoked/);
            assert.equal(counters.connects, connectsBeforeRefusal);
            assert.equal(counters.connects, 1);
            assert.equal(counters.reconnects, 0);
            assert.equal(counters.lateConnections, 0);
            assert.equal(reconnectTimers, 0);
            assert.equal(counters.ddlQueries, 0);
            assert.equal(counters.dispatcherEnds, 1);
            assert.equal(counters.clientEnds, 1);
            assert.equal(counters.clientRemovals, 1);
            assert.equal(counters.poolEnds, 1);
            assert.equal(scope.state, 'CLOSED');
          }

          checkpoint = 'missing-database';
          const scope = createControlledFreshCandidateOperationScope();
          let poolConstructions = 0;
          let connectAttempts = 0;
          class MissingClient extends EventEmitter { async end() {} unref() {} }
          class MissingPool extends EventEmitter {
            constructor() { super(); poolConstructions += 1; }
            async connect() { connectAttempts += 1; throw new Error('database RAW_MISSING_DATABASE does not exist'); }
            async end() {}
          }
          const ControlledMissingPool = resources.createControlledFreshCandidatePoolConstructor({
            basePool: MissingPool,
              onClient: () => undefined,
            onClientAcquired: () => undefined,
            onClientReleased: () => undefined,
            onClientDestroyed: () => undefined,
            onConstructed: () => undefined,
            onPoolAcquisitionStarted: () => () => undefined,
            onUnexpectedError: () => undefined,
            canConstruct: () => scope.state !== 'CLOSED',
            canConnect: () => scope.state === 'OPEN',
          });
          const missingFactory = resources.createControlledFreshCandidateDatabaseAdapter({
            postgresModule,
            pg: { Pool: ControlledMissingPool, Client: MissingClient },
            pool: {},
          });
          const missingAdapter = missingFactory.init({ payload: { logger: { info() {}, error() {} } } });
          missingAdapter.rejectInitializing = () => undefined;
          await assert.rejects(() => missingAdapter.connect(), /cannot connect to Postgres/);
          await scope.cancel();
          await scope.drain();
          scope.close();
          assert.equal(poolConstructions, 1);
          assert.equal(connectAttempts, 1);
          assert.equal(missingAdapter.disableCreateDatabase, true);
          assert.equal(Object.getOwnPropertyDescriptor(missingAdapter, 'createDatabase').writable, false);
          assert.equal(Object.getOwnPropertyDescriptor(missingAdapter, 'dropDatabase').writable, false);
          assert.equal(reconnectTimers, 0);
          console.log('CONTROLLED_INSTALLED_ADAPTER_BOUNDARY_OK');
        } finally {
          globalThis.setTimeout = nativeSetTimeout;
        }
      })().catch(() => { console.log('CONTROLLED_INSTALLED_ADAPTER_BOUNDARY_FAILED_' + checkpoint); process.exitCode = 1; });
    `
    const result = await asyncChild(installedAdapterCode)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(result.signal, null)
    assert.equal(result.stdout.trim(), 'CONTROLLED_INSTALLED_ADAPTER_BOUNDARY_OK')
    assert.equal(result.stderr, '')
    for (const sentinel of ['RAW_DATABASE', 'RAW_DDL', 'RAW_RECONNECT', 'RAW_INITIALIZATION']) {
      assert.equal(`${result.stdout}\n${result.stderr}`.includes(sentinel), false)
    }
  }

  {
    const runtimeResourcesUrl = pathToFileURL(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts')).href
    const creationUrl = pathToFileURL(path.resolve('src/lib/controlledFreshCandidateCreation.ts')).href
    const realPoolTeardownCode = `
      void (async () => {
        const assert = (await import('node:assert/strict')).default;
        const { EventEmitter } = await import('node:events');
        const pgImport = await import('pg');
        const pg = pgImport.default ?? pgImport;
        const resourcesImport = await import(${JSON.stringify(runtimeResourcesUrl)});
        const resources = resourcesImport.default ?? resourcesImport;
        const creationImport = await import(${JSON.stringify(creationUrl)});
        const creation = creationImport.default ?? creationImport;
        let physicalEnds = 0;
        class SyntheticClient extends EventEmitter {
          constructor() {
            super();
            this._queryable = true;
            this._ending = false;
          }
          connect(callback) { queueMicrotask(() => callback()); }
          end(callback) {
            physicalEnds += 1;
            this._ending = true;
            if (callback) queueMicrotask(callback);
            queueMicrotask(() => this.emit('end'));
            return Promise.resolve();
          }
          unref() {}
        }

        const formerPool = new pg.Pool({ Client: SyntheticClient, max: 1, idleTimeoutMillis: 0 });
        let formerReleaseEvents = 0;
        formerPool.on('release', () => { formerReleaseEvents += 1; });
        const formerlyCheckedOut = await formerPool.connect();
        await formerlyCheckedOut.end();
        let formerPoolEndSettled = false;
        void formerPool.end().then(() => { formerPoolEndSettled = true; });
        await Promise.resolve();
        await Promise.resolve();
        assert.equal(formerPoolEndSettled, false);
        assert.equal(formerPool.totalCount, 1);
        assert.equal(formerReleaseEvents, 0);

        const scope = creation.createControlledFreshCandidateOperationScope();
        const mutationActive = { current: true };
        const registry = resources.createControlledFreshCandidateTerminalResourceRegistry({
          scope,
          mutationActive,
          dispatcher: { destroy: async () => undefined },
        });
        scope.registerCancellation(registry.terminalizeOwnedResources);
        const ControlledPool = resources.createControlledFreshCandidatePoolConstructor({
          basePool: pg.Pool,
          onClient: registry.registerPoolClient,
          onClientAcquired: registry.registerPoolClientAcquisition,
          onClientReleased: registry.registerPoolClientRelease,
          onClientDestroyed: registry.registerPoolClientDestruction,
          onConstructed: registry.registerPool,
          onPoolAcquisitionStarted: registry.registerPoolAcquisition,
          onUnexpectedError: () => {
            mutationActive.current = false;
            scope.cancel().then(() => undefined, () => undefined);
          },
          canConstruct: () => scope.state !== 'CLOSED',
          canConnect: () => scope.state === 'OPEN',
        });
        const pool = new ControlledPool({ Client: SyntheticClient, max: 1, idleTimeoutMillis: 0 });
        let controlledReleaseEvents = 0;
        let controlledRemoveEvents = 0;
        pool.on('release', (error) => {
          assert.ok(error instanceof Error);
          controlledReleaseEvents += 1;
        });
        pool.on('remove', () => { controlledRemoveEvents += 1; });
        const nativeControlledPoolEnd = pool.end.bind(pool);
        pool.end = async () => {
          assert.equal(controlledRemoveEvents, 1);
          await nativeControlledPoolEnd();
        };
        const checkedOut = await pool.connect();
        assert.equal(pool.totalCount, 1);
        assert.equal(pool.idleCount, 0);
        const directEndBefore = physicalEnds;
        await scope.cancel();
        await scope.drain();
        assert.equal(scope.state, 'CLOSED');
        assert.equal(pool.ending, true);
        assert.equal(pool.ended, true);
        assert.equal(pool.totalCount, 0);
        assert.equal(pool.idleCount, 0);
        assert.equal(pool.waitingCount, 0);
        assert.equal(controlledReleaseEvents, 1);
        assert.equal(controlledRemoveEvents, 1);
        assert.equal(physicalEnds, directEndBefore + 1);
        assert.doesNotThrow(() => checkedOut.release());
        console.log('CONTROLLED_REAL_PG_POOL_TEARDOWN_CLOSED');
      })().catch(() => { process.exitCode = 1; });
    `
    const result = await asyncChild(realPoolTeardownCode)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(result.signal, null)
    assert.equal(result.stdout.trim(), 'CONTROLLED_REAL_PG_POOL_TEARDOWN_CLOSED')
    assert.equal(result.stderr, '')
  }

  {
    const runtimeResourcesUrl = pathToFileURL(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts')).href
    const creationUrl = pathToFileURL(path.resolve('src/lib/controlledFreshCandidateCreation.ts')).href
    const inFlightPoolCode = `
      void (async () => {
        const assert = (await import('node:assert/strict')).default;
        const { EventEmitter } = await import('node:events');
        const pgImport = await import('pg');
        const pg = pgImport.default ?? pgImport;
        const resourcesImport = await import(${JSON.stringify(runtimeResourcesUrl)});
        const resources = resourcesImport.default ?? resourcesImport;
        const creationImport = await import(${JSON.stringify(creationUrl)});
        const creation = creationImport.default ?? creationImport;

        const turn = () => new Promise((resolve) => setImmediate(resolve));
        const delayedClient = (delayRemoval = false) => {
          const pendingConnections = [];
          const pendingEnds = [];
          const state = { starts: 0, endRequests: 0, endCompletions: 0 };
          class SyntheticClient extends EventEmitter {
            constructor() {
              super();
              this._queryable = true;
              this._ending = false;
            }
            connect(callback) {
              state.starts += 1;
              pendingConnections.push({ client: this, callback });
            }
            end(callback) {
              state.endRequests += 1;
              this._ending = true;
              const complete = () => {
                state.endCompletions += 1;
                if (callback) callback();
                queueMicrotask(() => this.emit('end'));
              };
              if (delayRemoval) pendingEnds.push(complete);
              else queueMicrotask(complete);
              return Promise.resolve();
            }
            unref() {}
          }
          return {
            SyntheticClient,
            state,
            get pendingConnections() { return pendingConnections.length; },
            succeed() {
              const pending = pendingConnections.shift();
              assert.ok(pending);
              queueMicrotask(() => pending.callback());
            },
            fail() {
              const pending = pendingConnections.shift();
              assert.ok(pending);
              queueMicrotask(() => pending.callback(new Error('SYNTHETIC_CONNECT_FAILURE')));
            },
            completeEnds() {
              for (const complete of pendingEnds.splice(0)) complete();
            },
          };
        };

        const harness = (clientControl, PoolBase = pg.Pool) => {
          const states = [];
          const scope = creation.createControlledFreshCandidateOperationScope({
            onStateChange: (state) => states.push(state),
          });
          const mutationActive = { current: true };
          const registry = resources.createControlledFreshCandidateTerminalResourceRegistry({
            scope,
            mutationActive,
            dispatcher: { destroy: async () => undefined },
          });
          scope.registerCancellation(registry.terminalizeOwnedResources);
          let pendingAcquisitions = 0;
          let maximumPendingAcquisitions = 0;
          let releaseEvents = 0;
          let removeEvents = 0;
          let poolEndCalls = 0;
          let unexpectedErrors = 0;
          let clientRegistrations = 0;
          let acquisitionRegistrations = 0;
          const ControlledPool = resources.createControlledFreshCandidatePoolConstructor({
            basePool: PoolBase,
            onClient(client, pool) {
              clientRegistrations += 1;
              registry.registerPoolClient(client, pool);
            },
            onClientAcquired(client, pool, release) {
              acquisitionRegistrations += 1;
              registry.registerPoolClientAcquisition(client, pool, release);
            },
            onClientReleased: registry.registerPoolClientRelease,
            onClientDestroyed: registry.registerPoolClientDestruction,
            onConstructed: registry.registerPool,
            onPoolAcquisitionStarted(pool) {
              pendingAcquisitions += 1;
              maximumPendingAcquisitions = Math.max(maximumPendingAcquisitions, pendingAcquisitions);
              const settle = registry.registerPoolAcquisition(pool);
              let settled = false;
              return () => {
                if (settled) return;
                settled = true;
                pendingAcquisitions -= 1;
                settle();
              };
            },
            onUnexpectedError: () => {
              unexpectedErrors += 1;
              mutationActive.current = false;
              scope.cancel().then(() => undefined, () => undefined);
            },
            canConstruct: () => scope.state !== 'CLOSED',
            canConnect: () => scope.state === 'OPEN',
          });
          const pool = new ControlledPool({ Client: clientControl.SyntheticClient, max: 1, idleTimeoutMillis: 0 });
          pool.on('release', (error) => {
            assert.ok(error instanceof Error);
            releaseEvents += 1;
          });
          pool.on('remove', () => { removeEvents += 1; });
          const nativeEnd = pool.end.bind(pool);
          pool.end = async () => {
            poolEndCalls += 1;
            assert.equal(pendingAcquisitions, 0);
            await nativeEnd();
          };
          return {
            scope,
            registry,
            mutationActive,
            pool,
            states,
            get pendingAcquisitions() { return pendingAcquisitions; },
            get maximumPendingAcquisitions() { return maximumPendingAcquisitions; },
            get releaseEvents() { return releaseEvents; },
            get removeEvents() { return removeEvents; },
            get poolEndCalls() { return poolEndCalls; },
            get unexpectedErrors() { return unexpectedErrors; },
            get clientRegistrations() { return clientRegistrations; },
            get acquisitionRegistrations() { return acquisitionRegistrations; },
          };
        };

        {
          const control = delayedClient(true);
          const state = harness(control);
          const acquired = state.pool.connect();
          assert.equal(control.state.starts, 1);
          assert.equal(control.pendingConnections, 1);
          assert.equal(state.pendingAcquisitions, 1);
          assert.equal(state.maximumPendingAcquisitions, 1);
          let cancellationSettled = false;
          const cancellation = state.scope.cancel().then(() => { cancellationSettled = true; });
          await turn();
          assert.equal(cancellationSettled, false);
          assert.equal(state.poolEndCalls, 0);
          assert.equal(state.pool.ending, false);
          control.succeed();
          const client = await acquired;
          await turn();
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 1);
          assert.equal(state.removeEvents, 0);
          assert.equal(control.state.endRequests, 1);
          assert.equal(control.state.endCompletions, 0);
          assert.equal(state.poolEndCalls, 0);
          assert.equal(cancellationSettled, false);
          control.completeEnds();
          await cancellation;
          await state.scope.drain();
          assert.equal(state.scope.state, 'CLOSED');
          assert.equal(state.mutationActive.current, false);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.pool.ending, true);
          assert.equal(state.pool.ended, true);
          assert.equal(state.pool.totalCount, 0);
          assert.equal(state.pool.idleCount, 0);
          assert.equal(state.pool.waitingCount, 0);
          assert.equal(state.releaseEvents, 1);
          assert.equal(state.removeEvents, 1);
          assert.equal(control.state.endRequests, 1);
          assert.equal(control.state.endCompletions, 1);
          assert.doesNotThrow(() => client.release());
          assert.equal(state.states.at(-1), 'CLOSED');
        }

        {
          const control = delayedClient();
          const state = harness(control);
          let callbackCalls = 0;
          let callbackClient;
          const callbackCompleted = new Promise((resolve, reject) => {
            state.pool.connect((error, client) => {
              callbackCalls += 1;
              if (error || !client) return reject(error ?? new Error('CLIENT_MISSING'));
              callbackClient = client;
              resolve();
            });
          });
          assert.equal(state.pendingAcquisitions, 1);
          const firstCancellation = state.scope.cancel();
          const repeatedCancellation = state.scope.cancel();
          queueMicrotask(() => control.succeed());
          await callbackCompleted;
          await Promise.all([firstCancellation, repeatedCancellation]);
          await state.scope.drain();
          assert.equal(callbackCalls, 1);
          assert.ok(callbackClient);
          assert.equal(state.maximumPendingAcquisitions, 1);
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 1);
          assert.equal(state.removeEvents, 1);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.pool.totalCount, 0);
          assert.equal(state.scope.state, 'CLOSED');
          assert.doesNotThrow(() => callbackClient.release());
        }

        {
          const control = delayedClient();
          const state = harness(control);
          let rejected = 0;
          const acquisition = state.pool.connect().then(
            () => { throw new Error('UNEXPECTED_CONNECT_SUCCESS'); },
            () => { rejected += 1; },
          );
          const cancellation = state.scope.cancel();
          control.fail();
          await acquisition;
          await cancellation;
          await state.scope.drain();
          assert.equal(rejected, 1);
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 0);
          assert.equal(state.removeEvents, 0);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.pool.totalCount, 0);
          assert.equal(state.scope.state, 'CLOSED');
        }

        {
          const control = delayedClient();
          const state = harness(control);
          let callbackCalls = 0;
          let errorDeliveries = 0;
          let callbackObserved;
          const observed = new Promise((resolve) => { callbackObserved = resolve; });
          state.pool.connect((error, client) => {
            callbackCalls += 1;
            if (error) errorDeliveries += 1;
            assert.equal(client, undefined);
            callbackObserved();
            throw new Error('RAW_CALLBACK_ACQUISITION_ERROR_THROW_SENTINEL');
          });
          control.fail();
          await observed;
          await state.scope.cancel();
          await state.scope.drain();
          assert.equal(callbackCalls, 1);
          assert.equal(errorDeliveries, 1);
          assert.equal(state.unexpectedErrors, 1);
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 0);
          assert.equal(state.removeEvents, 0);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.scope.state, 'CLOSED');
        }

        {
          const control = delayedClient();
          class SynchronousConnectFailurePool extends pg.Pool {
            connect() { throw new Error('RAW_SYNCHRONOUS_CONNECT_FAILURE_SENTINEL'); }
          }
          const state = harness(control, SynchronousConnectFailurePool);
          let callbackCalls = 0;
          let errorDeliveries = 0;
          state.pool.connect((error, client) => {
            callbackCalls += 1;
            if (error) errorDeliveries += 1;
            assert.equal(client, undefined);
          });
          assert.equal(callbackCalls, 1);
          assert.equal(errorDeliveries, 1);
          assert.equal(state.pendingAcquisitions, 0);
          await state.scope.cancel();
          await state.scope.drain();
          assert.equal(state.releaseEvents, 0);
          assert.equal(state.removeEvents, 0);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.scope.state, 'CLOSED');
        }

        {
          const control = delayedClient();
          const state = harness(control);
          let callbackCalls = 0;
          let successDeliveries = 0;
          let errorDeliveries = 0;
          let callbackObserved;
          const observed = new Promise((resolve) => { callbackObserved = resolve; });
          state.pool.connect((error, client) => {
            callbackCalls += 1;
            if (error) errorDeliveries += 1;
            else {
              successDeliveries += 1;
              assert.ok(client);
            }
            callbackObserved();
            throw new Error('RAW_CALLBACK_THROW_SENTINEL');
          });
          control.succeed();
          await observed;
          await turn();
          await state.scope.cancel();
          await state.scope.drain();
          assert.equal(callbackCalls, 1);
          assert.equal(successDeliveries, 1);
          assert.equal(errorDeliveries, 0);
          assert.equal(state.unexpectedErrors, 1);
          assert.equal(state.clientRegistrations, 1);
          assert.equal(state.acquisitionRegistrations, 1);
          assert.equal(state.maximumPendingAcquisitions, 1);
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 1);
          assert.equal(state.removeEvents, 1);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.pool.totalCount, 0);
          assert.equal(state.scope.state, 'CLOSED');
        }

        {
          const control = delayedClient();
          const state = harness(control);
          let callbackCalls = 0;
          let callbackObserved;
          const observed = new Promise((resolve) => { callbackObserved = resolve; });
          state.pool.connect((error, client) => {
            callbackCalls += 1;
            assert.equal(error, undefined);
            assert.ok(client);
            void state.scope.cancel().then(() => undefined, () => undefined);
            callbackObserved();
            throw new Error('RAW_CALLBACK_CANCEL_THROW_SENTINEL');
          });
          control.succeed();
          await observed;
          await state.scope.cancel();
          await state.scope.cancel();
          await state.scope.drain();
          assert.equal(callbackCalls, 1);
          assert.equal(state.unexpectedErrors, 1);
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 1);
          assert.equal(state.removeEvents, 1);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.scope.state, 'CLOSED');
        }

        {
          const control = delayedClient();
          const state = harness(control);
          let callbackCalls = 0;
          const callbackCompleted = new Promise((resolve) => {
            state.pool.connect((error, client) => {
              callbackCalls += 1;
              assert.ok(error instanceof Error);
              assert.equal(client, undefined);
              resolve();
            });
          });
          const cancellation = state.scope.cancel();
          control.fail();
          await callbackCompleted;
          await cancellation;
          await state.scope.drain();
          assert.equal(callbackCalls, 1);
          assert.equal(state.pendingAcquisitions, 0);
          assert.equal(state.releaseEvents, 0);
          assert.equal(state.removeEvents, 0);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.pool.totalCount, 0);
          assert.equal(state.scope.state, 'CLOSED');
        }

        {
          const control = delayedClient();
          const state = harness(control);
          const acquired = state.pool.connect();
          assert.doesNotThrow(() => state.pool.emit('error', new Error('RAW_PENDING_POOL_ERROR_SENTINEL')));
          const drained = state.scope.drain();
          control.succeed();
          const client = await acquired;
          await drained;
          assert.equal(state.unexpectedErrors, 1);
          assert.equal(state.releaseEvents, 1);
          assert.equal(state.removeEvents, 1);
          assert.equal(state.poolEndCalls, 1);
          assert.equal(state.pool.totalCount, 0);
          assert.equal(state.scope.state, 'CLOSED');
          assert.doesNotThrow(() => client.release());
        }

        {
          let failedRelease;
          class OneShotReleaseFailurePool extends pg.Pool {
            _release(client, idleListener, error) {
              if (!failedRelease) {
                failedRelease = { client, idleListener, error };
                throw new Error('SYNTHETIC_RELEASE_FAILURE');
              }
              return super._release(client, idleListener, error);
            }
            completeFailedReleaseForTest() {
              assert.ok(failedRelease);
              return super._release(failedRelease.client, failedRelease.idleListener, failedRelease.error);
            }
          }
          const control = delayedClient();
          const state = harness(control, OneShotReleaseFailurePool);
          const acquisition = state.pool.connect();
          control.succeed();
          await acquisition;
          let authoritativeFailure;
          await assert.rejects(() => state.scope.cancel(), (error) => {
            authoritativeFailure = error;
            assert.equal(error.message, 'CONTROLLED_TERMINAL_CLEANUP_UNCERTAIN');
            return true;
          });
          assert.equal(state.unexpectedErrors, 1);
          assert.equal(state.mutationActive.current, false);
          assert.equal(state.releaseEvents, 0);
          assert.equal(state.removeEvents, 0);
          assert.equal(state.poolEndCalls, 0);
          assert.equal(state.pool.totalCount, 1);
          assert.equal(state.pool.ending, false);
          assert.equal(state.scope.state, 'TERMINAL_UNCERTAIN');
          await assert.rejects(() => state.scope.cancel(), (error) => error === authoritativeFailure);
          await assert.rejects(() => state.scope.drain(), (error) => error === authoritativeFailure);
          assert.throws(() => state.scope.close(), (error) => error === authoritativeFailure);
          await assert.rejects(() => state.registry.terminalizeOwnedResources(), /controlled_runtime_teardown_failed/);
          assert.equal(state.scope.state, 'TERMINAL_UNCERTAIN');
          assert.equal(state.pool.totalCount, 1);
          assert.equal(state.poolEndCalls, 0);
        }

        {
          const control = delayedClient();
          const scope = creation.createControlledFreshCandidateOperationScope();
          const mutationActive = { current: true };
          const registry = resources.createControlledFreshCandidateTerminalResourceRegistry({
            scope,
            mutationActive,
            dispatcher: { destroy: async () => undefined },
          });
          scope.registerCancellation(registry.terminalizeOwnedResources);
          let releaseEvents = 0;
          let removeEvents = 0;
          let checkedOut;
          class VulnerablePool extends pg.Pool {
            constructor(options) {
              super(options);
              this.on('connect', (client) => registry.registerPoolClient(client, this));
              this.on('remove', (client) => registry.registerPoolClientDestruction(client, this));
              registry.registerPool(this);
            }
            connect() {
              return super.connect().then((client) => {
                const nativeRelease = client.release.bind(client);
                let released = false;
                const controlledRelease = (error) => {
                  if (released) return;
                  released = true;
                  let succeeded = false;
                  try {
                    nativeRelease(error);
                    succeeded = true;
                  } finally {
                    registry.registerPoolClientRelease(client, this, succeeded, Boolean(error));
                  }
                };
                client.release = controlledRelease;
                registry.registerPoolClientAcquisition(client, this, controlledRelease);
                return client;
              });
            }
          }
          const pool = new VulnerablePool({ Client: control.SyntheticClient, max: 1, idleTimeoutMillis: 0 });
          pool.on('release', () => { releaseEvents += 1; });
          pool.on('remove', () => { removeEvents += 1; });
          const acquisition = pool.connect();
          let cancellationSettled = false;
          const cancellation = scope.cancel().then(() => { cancellationSettled = true; });
          await turn();
          assert.equal(pool.ending, true);
          assert.equal(cancellationSettled, false);
          control.succeed();
          checkedOut = await acquisition;
          await turn();
          assert.equal(pool.totalCount, 1);
          assert.equal(pool.idleCount, 0);
          assert.equal(releaseEvents, 0);
          assert.equal(removeEvents, 0);
          assert.equal(control.state.endRequests, 0);
          assert.equal(cancellationSettled, false);
          checkedOut.release(new Error('TEST_ONLY_FAULT_CLEANUP'));
          await cancellation;
          await scope.drain();
          assert.equal(scope.state, 'CLOSED');
          assert.equal(pool.totalCount, 0);
          assert.equal(releaseEvents, 1);
          assert.equal(removeEvents, 1);
          assert.equal(control.state.endRequests, 1);
        }

        {
          let reviewedCallbackCalls = 0;
          const reviewedCatchAndReinvoke = (callback) => {
            try {
              callback(undefined, {});
            } catch {
              callback(new Error('controlled_runtime_pool_client_registration_failed'));
            }
          };
          reviewedCatchAndReinvoke((error) => {
            reviewedCallbackCalls += 1;
            if (!error) throw new Error('RAW_REVIEWED_CALLBACK_THROW_SENTINEL');
          });
          assert.equal(reviewedCallbackCalls, 2);
        }

        {
          const control = delayedClient();
          const scope = creation.createControlledFreshCandidateOperationScope();
          const pool = new pg.Pool({ Client: control.SyntheticClient, max: 1, idleTimeoutMillis: 0 });
          const acquisition = pool.connect();
          await scope.drain();
          assert.equal(scope.state, 'CLOSED');
          control.succeed();
          const ungovernedClient = await acquisition;
          assert.equal(pool.totalCount, 1);
          assert.equal(pool.idleCount, 0);
          ungovernedClient.release(new Error('TEST_ONLY_MISSING_CENSUS_DISPOSAL'));
          await turn();
          await pool.end();
          assert.equal(pool.totalCount, 0);
        }

        console.log('CONTROLLED_REAL_PG_POOL_IN_FLIGHT_GOVERNANCE_VERIFIED');
      })().catch(() => { process.stderr.write('CONTROLLED_CHILD_ASSERTION_FAILED'); process.exitCode = 1; });
    `
    const result = await asyncChild(inFlightPoolCode)
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.equal(result.signal, null)
    assert.equal(result.stdout.trim(), 'CONTROLLED_REAL_PG_POOL_IN_FLIGHT_GOVERNANCE_VERIFIED')
    assert.equal(result.stderr, '')
  }

  {
    const runtimeUrl = pathToFileURL(path.resolve('scripts/controlled-fresh-candidate-runtime.ts')).href
    const unresolvedTerminalCode = `
      void (async () => {
        const runtimeImport = await import(${JSON.stringify(runtimeUrl)});
        const runtime = runtimeImport.default ?? runtimeImport;
        process.exitCode = 1;
        void runtime.runControlledFreshCandidateRuntime({
          argv: [runtime.CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
          operationTimeoutMs: 5,
          io: { stdout() {}, stderr() {} },
          initializeCreation: async () => new Promise(() => undefined),
        });
      })();
    `
    const result = await asyncChild(unresolvedTerminalCode)
    assert.equal(result.status, 1)
    assert.equal(result.signal, null)
    assert.equal(result.stdout, '')
    assert.equal(result.stderr, '')
  }

  {
    const pgPackage = JSON.parse(readFileSync(path.resolve('node_modules/pg/package.json'), 'utf8')) as { version?: string }
    assert.equal(pgPackage.version, '8.16.3')
    const pgModule = await import('pg')
    const scope = createControlledFreshCandidateOperationScope()
    const mutationActive = { current: true }
    let cancellationAcknowledgements = 0
    scope.registerCancellation(async () => { cancellationAcknowledgements += 1 })
    const ownedPools = new Set<InstanceType<typeof pgModule.Pool>>()
    const ControlledPool = createControlledFreshCandidatePoolConstructor({
      basePool: pgModule.Pool,
      onClient: () => undefined,
      onClientAcquired: () => undefined,
      onClientReleased: () => undefined,
      onClientDestroyed: () => undefined,
      onConstructed: (pool) => ownedPools.add(pool),
      onPoolAcquisitionStarted: () => () => undefined,
      onUnexpectedError: () => {
        mutationActive.current = false
        scope.cancel().then(() => undefined, () => undefined)
      },
    })
    const pool = new ControlledPool({ max: 1 })
    assert.equal(ownedPools.has(pool), true)
    assert.ok(pool.listenerCount('error') >= 1)
    assert.doesNotThrow(() => pool.emit('error', new Error('RAW_POOL_ERROR_IDENTITY_SENTINEL')))
    assert.doesNotThrow(() => pool.emit('error', new Error('SECOND_RAW_POOL_ERROR_IDENTITY_SENTINEL')))
    await scope.cancel()
    assert.equal(mutationActive.current, false)
    assert.equal(cancellationAcknowledgements, 1)
    assert.ok(pool.listenerCount('error') >= 1)
    await pool.end()
    assert.ok(pool.listenerCount('error') >= 1)
    scope.close()
  }

  {
    const scope = createControlledFreshCandidateOperationScope()
    const mutationActive = { current: true }
    const events: string[] = []
    let releaseDispatcher: (() => void) | null = null
    const registry = createControlledFreshCandidateTerminalResourceRegistry({
      scope,
      mutationActive,
      dispatcher: {
        destroy: () => new Promise<void>((resolve) => {
          events.push('dispatcher-destroy')
          releaseDispatcher = resolve
        }),
      },
    })
    scope.registerCancellation(registry.terminalizeOwnedResources)
    registry.registerPool({ end: async () => { events.push('initial-pool-end') } })
    const cancellation = scope.cancel()
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(mutationActive.current, false)
    assert.ok(releaseDispatcher)
    registry.registerPayload({ destroy: async () => { events.push('late-payload-destroy') } })
    registry.registerPool({ end: async () => { events.push('late-pool-end') } })
    registry.registerClient({
      end: async () => { events.push('late-client-end') },
      unref: () => { events.push('late-client-unref') },
    })
    scope.registerTerminalization(async () => { events.push('late-cleanup-ack') })
    let terminal = false
    const drained = scope.drain().then(() => { terminal = true })
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(terminal, false)
    releaseDispatcher()
    await cancellation
    await drained
    assert.equal(scope.state, 'CLOSED')
    assert.deepEqual(events.sort(), [
      'dispatcher-destroy', 'initial-pool-end', 'late-cleanup-ack', 'late-client-end',
      'late-client-unref', 'late-payload-destroy', 'late-pool-end',
    ].sort())
    assert.equal(events.filter((event) => event === 'dispatcher-destroy').length, 1)
    scope.close()
  }

  {
    const scope = createControlledFreshCandidateOperationScope()
    const mutationActive = { current: true }
    const registry = createControlledFreshCandidateTerminalResourceRegistry({
      scope,
      mutationActive,
      dispatcher: { destroy: async () => undefined },
    })
    scope.registerCancellation(registry.terminalizeOwnedResources)
    await scope.drain()
    assert.equal(scope.state, 'CLOSED')
    let poolConstructions = 0
    class RefusedPool extends (await import('node:events')).EventEmitter {
      constructor() { super(); poolConstructions += 1 }
      async connect() { throw new Error('must not connect') }
      async end() { throw new Error('must not end') }
    }
    const ControlledRefusedPool = createControlledFreshCandidatePoolConstructor({
      basePool: RefusedPool as unknown as typeof import('pg').Pool,
      onClient: () => undefined,
      onClientAcquired: () => undefined,
      onClientReleased: () => undefined,
      onClientDestroyed: () => undefined,
      onConstructed: registry.registerPool as (pool: InstanceType<typeof import('pg').Pool>) => void,
      onPoolAcquisitionStarted: () => () => undefined,
      onUnexpectedError: () => undefined,
      canConstruct: () => scope.state !== 'CLOSED',
      canConnect: () => scope.state === 'OPEN',
    })
    assert.throws(() => new ControlledRefusedPool(), /pool_revoked/)
    assert.equal(poolConstructions, 0)
  }

  for (const phase of ['initialization', 'normal-work', 'finalization', 'cancellation', 'teardown'] as const) {
    const pgModule = await import('pg')
    const scope = createControlledFreshCandidateOperationScope()
    const mutationActive = { current: true }
    let teardownStarts = 0
    const registry = createControlledFreshCandidateTerminalResourceRegistry({
      scope,
      mutationActive,
      dispatcher: { destroy: async () => { teardownStarts += 1 } },
    })
    scope.registerCancellation(registry.terminalizeOwnedResources)
    const ControlledPool = createControlledFreshCandidatePoolConstructor({
      basePool: pgModule.Pool,
      onClient: registry.registerPoolClient,
      onClientAcquired: registry.registerPoolClientAcquisition,
      onClientReleased: registry.registerPoolClientRelease,
      onClientDestroyed: registry.registerPoolClientDestruction,
      onConstructed: registry.registerPool,
      onPoolAcquisitionStarted: registry.registerPoolAcquisition,
      onUnexpectedError: () => {
        mutationActive.current = false
        scope.cancel().then(() => undefined, () => undefined)
      },
    })
    const pool = new ControlledPool({ max: 1 })
    if (phase === 'teardown') {
      pool.end = async () => {
        assert.doesNotThrow(() => pool.emit('error', new Error(`RAW_POOL_${phase}_SENTINEL`)))
      }
    }
    if (phase === 'cancellation') {
      const cancellation = scope.cancel()
      assert.doesNotThrow(() => pool.emit('error', new Error(`RAW_POOL_${phase}_SENTINEL`)))
      await cancellation
    } else if (phase === 'teardown') {
      await scope.cancel()
    } else {
      assert.doesNotThrow(() => pool.emit('error', new Error(`RAW_POOL_${phase}_SENTINEL`)))
      await scope.cancel()
    }
    await scope.drain()
    assert.equal(mutationActive.current, false, phase)
    assert.equal(teardownStarts, 1, phase)
    assert.ok(pool.listenerCount('error') >= 1, phase)
    scope.close()
  }

  {
    const governanceSource = readFileSync(path.resolve('scripts/runtime-smoke-governance.ts'), 'utf8')
    const receiptSource = readFileSync(path.resolve('src/lib/controlledFreshCandidateReceipt.ts'), 'utf8')
    const replaceProtection = (source: string, active: string, weakened: string): string => {
      assert.equal(source.includes(active), true, active)
      const result = source.replace(active, weakened)
      assert.notEqual(result, source)
      return result
    }
    const completedTeardownGate = `  const completedTeardownEligible = (
    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'
  )
  if (!completedTeardownEligible) {
    throw new Error('CONTROLLED_RECEIPT_TEARDOWN_INCOMPLETE')
  }
`
    const replayRefusal = "  if (!consumed) throw new Error('CONTROLLED_RECEIPT_REPLAYED')\n"
    const moveGateAfterConsumption = (): string => {
      const withoutGate = replaceProtection(receiptSource, completedTeardownGate, '')
      return replaceProtection(withoutGate, replayRefusal, `${replayRefusal}${completedTeardownGate}`)
    }
    const faults = [
      {
        name: 'private-v3-disconnected-token',
        source: replaceProtection(
          receiptSource,
          "export const CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION = 'controlled-fresh-candidate-private/v3' as const",
          "export const CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION = 'controlled-fresh-candidate-private/v1' as const // controlled-fresh-candidate-private/v3",
        ),
      },
      {
        name: 'private-v1-comment-preserved-rejection',
        source: replaceProtection(
          receiptSource,
          'return value.version === CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION',
          'return true /* value.version === CONTROLLED_FRESH_CANDIDATE_PRIVATE_VERSION */',
        ),
      },
      {
        name: 'mutation-teardown-comment-preserved-predicate',
        source: replaceProtection(
          receiptSource,
          "&& ['not_started', 'complete', 'failed', 'unknown'].includes(String(value.mutationResourceTeardown.status))",
          "&& true /* ['not_started', 'complete', 'failed', 'unknown'].includes(String(value.mutationResourceTeardown.status)) */",
        ),
      },
      {
        name: 'completed-teardown-gate-removed',
        source: replaceProtection(receiptSource, completedTeardownGate, ''),
      },
      {
        name: 'completed-teardown-gate-after-consumption',
        source: moveGateAfterConsumption(),
      },
      {
        name: 'completed-teardown-gate-structural-only',
        source: replaceProtection(
          receiptSource,
          completedTeardownGate,
          completedTeardownGate.replace(
            `  const completedTeardownEligible = (
    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'
  )`,
            '  const completedTeardownEligible = exactReceiptShape(parsed)',
          ),
        ),
      },
      {
        name: 'completed-teardown-gate-attempted-only',
        source: replaceProtection(
          receiptSource,
          completedTeardownGate,
          completedTeardownGate.replace(
            `    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'`,
            '    parsed.mutationResourceTeardown.attempted === true',
          ),
        ),
      },
      {
        name: 'completed-teardown-gate-completed-only',
        source: replaceProtection(
          receiptSource,
          completedTeardownGate,
          completedTeardownGate.replace(
            `    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'`,
            '    parsed.mutationResourceTeardown.completed === true',
          ),
        ),
      },
      {
        name: 'completed-teardown-gate-status-only',
        source: replaceProtection(
          receiptSource,
          completedTeardownGate,
          completedTeardownGate.replace(
            `    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'`,
            "    parsed.mutationResourceTeardown.status === 'complete'",
          ),
        ),
      },
      {
        name: 'completed-teardown-gate-comment-preserved-true',
        source: replaceProtection(
          receiptSource,
          completedTeardownGate,
          completedTeardownGate.replace(
            `  const completedTeardownEligible = (
    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'
  )`,
            `  const completedTeardownEligible = true /*
    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'
  */`,
          ),
        ),
      },
      {
        name: 'completed-teardown-gate-disconnected',
        source: replaceProtection(
          receiptSource,
          completedTeardownGate,
          `  const disconnectedCompletedTeardownEligible = (
    parsed.mutationResourceTeardown.attempted === true
    && parsed.mutationResourceTeardown.completed === true
    && parsed.mutationResourceTeardown.status === 'complete'
  )
  void disconnectedCompletedTeardownEligible
  const completedTeardownEligible = true
  if (!completedTeardownEligible) {
    throw new Error('CONTROLLED_RECEIPT_TEARDOWN_INCOMPLETE')
  }
`,
        ),
      },
      {
        name: 'pending-status-comment-preserved-predicate',
        source: replaceProtection(
          receiptSource,
          "&& value.authorityClosure.status === 'pending_not_attested'",
          "&& true /* value.authorityClosure.status === 'pending_not_attested' */",
        ),
      },
      {
        name: 'outside-boundary-comment-preserved-predicate',
        source: replaceProtection(
          receiptSource,
          "&& value.authorityClosure.boundary === 'outside_durable_receipt'",
          "&& true /* value.authorityClosure.boundary === 'outside_durable_receipt' */",
        ),
      },
    ] as const
    const runGovernanceCopy = (candidateReceiptSource: string) => {
      const root = mkdtempSync(path.join(tmpdir(), 'cfc-semantic-governance-'))
      try {
        const scriptDirectory = path.join(root, 'scripts')
        const libraryDirectory = path.join(root, 'src', 'lib')
        mkdirSync(scriptDirectory, { recursive: true })
        mkdirSync(libraryDirectory, { recursive: true })
        const governancePath = path.join(scriptDirectory, 'runtime-smoke-governance.ts')
        writeFileSync(governancePath, governanceSource, 'utf8')
        writeFileSync(path.join(libraryDirectory, 'controlledFreshCandidateReceipt.ts'), candidateReceiptSource, 'utf8')
        return spawnSync(process.execPath, [
          path.resolve('node_modules/tsx/dist/cli.mjs'),
          governancePath,
        ], {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: sanitizedChildEnvironment(),
        })
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    }
    const baseline = runGovernanceCopy(receiptSource)
    assert.equal(baseline.status, 0, `${baseline.stdout}\n${baseline.stderr}`)
    assert.equal(baseline.signal, null)
    assert.equal(baseline.stdout.includes('runtimeSmokeGovernance: 21 read-only smoke commands checked - ALL OK'), true)
    assert.equal(baseline.stderr, '')
    for (const fault of faults) {
      const result = runGovernanceCopy(fault.source)
      assert.notEqual(result.status, 0, `${fault.name} must fail semantic governance`)
      assert.equal(result.signal, null, fault.name)
      assert.equal(result.stdout.includes('ALL OK'), false, fault.name)
    }
  }

  {
    const creationSource = readFileSync(path.resolve('src/lib/controlledFreshCandidateCreation.ts'), 'utf8')
    const receiptSource = readFileSync(path.resolve('src/lib/controlledFreshCandidateReceipt.ts'), 'utf8')
    const replaceProtection = (source: string, active: string, weakened: string): string => {
      assert.equal(source.includes(active), true, active)
      const result = source.replace(active, weakened)
      assert.notEqual(result, source)
      return result
    }
    const rejectionObserver = `      () => {
        recordCleanupFailure(tracked)
        terminalizations.delete(tracked)
      },`
    const settledInspection = `  const settleAndInspect = async (pending: Promise<unknown>[]): Promise<void> => {
    const results = await Promise.allSettled(pending)
    for (let index = 0; index < results.length; index += 1) {
      if (results[index]?.status === 'rejected' && knownTerminalizations.has(pending[index])) {
        recordCleanupFailure(pending[index])
      }
    }
  }`
    const ignoreSettledRejections = `  const settleAndInspect = async (pending: Promise<unknown>[]): Promise<void> => {
    await Promise.allSettled(pending)
  }`
    const withoutRejectedObserver = (source: string): string => replaceProtection(
      source,
      rejectionObserver,
      '      () => terminalizations.delete(tracked),',
    )
    const terminalFaults = [
      {
        name: 'rejected-terminalization-deleted-without-record',
        source: replaceProtection(
          withoutRejectedObserver(creationSource),
          '    knownTerminalizations.add(tracked)\n',
          '',
        ),
      },
      {
        name: 'all-settled-rejections-ignored',
        source: replaceProtection(
          withoutRejectedObserver(creationSource),
          settledInspection,
          ignoreSettledRejections,
        ),
      },
      {
        name: 'sticky-terminal-failure-cleared-by-success',
        source: replaceProtection(
          creationSource,
          '      () => terminalizations.delete(tracked),',
          `      () => {
        cleanupFailureCount = 0
        terminalizations.delete(tracked)
      },`,
        ),
      },
      {
        name: 'closed-despite-retained-terminal-failure',
        source: replaceProtection(
          creationSource,
          `        throwIfCleanupUncertain()
        transition('CLOSED')`,
          `        transition('CLOSED')
        throwIfCleanupUncertain()`,
        ),
      },
    ] as const
    const runTerminalGovernanceCopy = (candidateCreationSource: string) => {
      const root = mkdtempSync(path.join(tmpdir(), 'cfc-terminal-governance-'))
      try {
        const libraryDirectory = path.join(root, 'src', 'lib')
        mkdirSync(libraryDirectory, { recursive: true })
        const creationPath = path.join(libraryDirectory, 'controlledFreshCandidateCreation.ts')
        writeFileSync(creationPath, candidateCreationSource, 'utf8')
        writeFileSync(path.join(libraryDirectory, 'controlledFreshCandidateReceipt.ts'), receiptSource, 'utf8')
        const harnessPath = path.join(root, 'terminal-governance.mjs')
        writeFileSync(harnessPath, `
          import assert from 'node:assert/strict';
          const imported = await import(${JSON.stringify(pathToFileURL(creationPath).href)});
          const creation = imported.default ?? imported;
          const states = [];
          const scope = creation.createControlledFreshCandidateOperationScope({ onStateChange: (state) => states.push(state) });
          let mutationActive = true;
          scope.registerCancellation(async () => { mutationActive = false; throw new Error('RAW_TERMINAL_FAULT_SENTINEL'); });
          let authoritativeFailure;
          await assert.rejects(() => scope.cancel(), (error) => {
            authoritativeFailure = error;
            return error.message === 'CONTROLLED_TERMINAL_CLEANUP_UNCERTAIN';
          });
          scope.registerTerminalization(async () => undefined);
          await assert.rejects(() => scope.cancel(), (error) => error === authoritativeFailure);
          await assert.rejects(() => scope.drain(), (error) => error === authoritativeFailure);
          assert.throws(() => scope.close(), (error) => error === authoritativeFailure);
          assert.equal(scope.state, 'TERMINAL_UNCERTAIN');
          assert.equal(states.includes('CLOSED'), false);
          assert.equal(mutationActive, false);
          process.stdout.write('CONTROLLED_TERMINAL_GOVERNANCE_ALL_OK');
        `, 'utf8')
        return spawnSync(process.execPath, ['--import', 'tsx', harnessPath], {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: sanitizedChildEnvironment(),
        })
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    }
    const baseline = runTerminalGovernanceCopy(creationSource)
    assert.equal(baseline.status, 0, `${baseline.stdout}\n${baseline.stderr}`)
    assert.equal(baseline.signal, null)
    assert.equal(baseline.stdout, 'CONTROLLED_TERMINAL_GOVERNANCE_ALL_OK')
    assert.equal(baseline.stderr, '')
    for (const fault of terminalFaults) {
      const result = runTerminalGovernanceCopy(fault.source)
      assert.notEqual(result.status, 0, `${fault.name} must fail terminal governance`)
      assert.equal(result.signal, null, fault.name)
      assert.equal(result.stdout.includes('ALL_OK'), false, fault.name)
    }
  }

  {
    const malformedRoot = mkdtempSync(path.join(tmpdir(), 'cfc-malformed-json-lint-'))
    try {
      const malformedPackage = path.join(malformedRoot, 'package.json')
      writeFileSync(malformedPackage, '{"name":', 'utf8')
      const eslint = spawnSync(process.execPath, [
        path.resolve('node_modules/eslint/bin/eslint.js'),
        '--config', path.resolve('eslint.config.mjs'),
        '--no-ignore',
        '--max-warnings=0',
        malformedPackage,
      ], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: sanitizedChildEnvironment(),
      })
      assert.notEqual(eslint.status, 0)
      assert.equal(`${eslint.stdout}\n${eslint.stderr}`.includes('package.json'), true)
    } finally {
      rmSync(malformedRoot, { recursive: true, force: true })
    }
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
  assert.equal(resourcesSource.includes("process.env.PAYLOAD_DROP_DATABASE = 'false'"), true)
  assert.equal(resourcesSource.includes('disableCreateDatabase: true'), true)
  assert.equal(resourcesSource.includes('push: false'), true)
  assert.equal(resourcesSource.includes('VERCEL_BLOB_RETRIES'), true)
  assert.equal(resourcesSource.includes('CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0'), true)
  assert.equal(resourcesSource.includes('multipart: false'), true)
  assert.equal(resourcesSource.includes("handleDelete: async () => { throw"), true)
  assert.equal(resourcesSource.includes('blobModule.del'), false)
  assert.equal(resourcesSource.includes('blobModule.list'), false)
  assert.equal(resourcesSource.includes('fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW'), true)
  assert.equal(resourcesSource.includes('syncDirectory(params.directoryHandle)'), true)
  assert.equal(resourcesSource.includes('openControlledFreshCandidatePhysicalReceiptDestination'), true)
  assert.equal(resourcesSource.includes('createControlledFreshCandidatePoolConstructor'), true)
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
  if (process.env.CFC_POSIX_CHILD_MODE) {
    console.error(`CONTROLLED_POSIX_CHILD_FAILED_${posixChildCheckpoint}`)
    process.exit(1)
  }
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
