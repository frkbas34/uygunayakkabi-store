import assert from 'node:assert/strict'
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import {
  chmodSync,
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
  CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION,
  CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES,
  executeControlledFreshCandidateConnectivity,
  parseControlledFreshCandidateConnectivityArgs,
  runControlledFreshCandidateConnectivity,
  type ControlledFreshCandidatePgClient,
} from './controlled-fresh-candidate-connectivity'
import {
  CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST,
  buildControlledFreshCandidateConfigurationEnvironment,
  loadControlledFreshCandidateConfigurationEnvironment,
} from './controlled-fresh-candidate-secret-loader'
import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
} from './controlled-fresh-candidate-runtime-resources'

const SYNTHETIC_COMMIT = 'b'.repeat(40)
const SYNTHETIC_SECRET = 'synthetic-connectivity-secret-never-output'
const TEST_MODE_ENV = 'CFC_CONNECTIVITY_TEST_MODE'
const MUTATION_MODE_ENV = 'CFC_CONNECTIVITY_MUTATION_MODE'
const BEHAVIORAL_CASE_COUNT = 30
const READINESS_MUTATION_CASE_COUNT = 9
const RUNTIME_MUTATION_CASE_COUNT = 1
const CONNECTIVITY_MUTATION_CASE_COUNT = 24
const CORE_CASE_COUNT = BEHAVIORAL_CASE_COUNT
  + READINESS_MUTATION_CASE_COUNT
  + RUNTIME_MUTATION_CASE_COUNT
  + CONNECTIVITY_MUTATION_CASE_COUNT
const PARENT_COMPLETION_CASE_COUNT = 2
const DIRECT_CASE_COUNT = CORE_CASE_COUNT + PARENT_COMPLETION_CASE_COUNT
const RUNNER_TIMEOUT_MS = 180_000
const COMPLETION_PREFIX = 'controlledFreshCandidateConnectivity'
const NATURAL_CHILD_SENTINEL = 'controlledFreshCandidateConnectivityNaturalChild: ALL OK'

let activeGovernedClients = 0
let pendingGovernedOperations = 0
let unexpectedRejections = 0
let currentCaseName = 'runner-initialization'

type Deferred = {
  resolve(): void
  reject(error: Error): void
}

type SyntheticClientOptions = {
  failAt?: string | readonly string[]
  failOnceAt?: string
  neverAt?: string
  boundaryAt?: string
  boundaryDelayMs?: number
  wrongReadOnly?: boolean
  wrongLiveness?: boolean
}

class SyntheticClient implements ControlledFreshCandidatePgClient {
  readonly calls: string[] = []
  readonly failAt: Set<string>
  readonly failOnceAt: string | null
  readonly neverAt: string | null
  readonly boundaryAt: string | null
  readonly boundaryDelayMs: number
  readonly wrongReadOnly: boolean
  readonly wrongLiveness: boolean
  readonly stepCounts = new Map<string, number>()
  endCalls = 0
  reconnectListenerCalls = 0
  private deferred: Deferred | null = null
  private active = false
  private closeRequested = false

  constructor(options: SyntheticClientOptions = {}) {
    this.failAt = new Set(typeof options.failAt === 'string' ? [options.failAt] : options.failAt ?? [])
    this.failOnceAt = options.failOnceAt ?? null
    this.neverAt = options.neverAt ?? null
    this.boundaryAt = options.boundaryAt ?? null
    this.boundaryDelayMs = options.boundaryDelayMs ?? 0
    this.wrongReadOnly = options.wrongReadOnly === true
    this.wrongLiveness = options.wrongLiveness === true
  }

  private async step(name: string): Promise<void> {
    this.calls.push(name)
    const count = (this.stepCounts.get(name) ?? 0) + 1
    this.stepCounts.set(name, count)
    pendingGovernedOperations += 1
    try {
      if (this.boundaryAt === name) {
        await new Promise<void>((resolve) => setTimeout(resolve, this.boundaryDelayMs))
      }
      if (this.neverAt === name && count === 1) {
        await new Promise<void>((resolve, reject) => {
          this.deferred = { resolve, reject }
        })
      }
      if (this.failOnceAt === name && count === 1) throw new Error(`${SYNTHETIC_SECRET}:${name}:once`)
      if (this.failAt.has(name)) throw new Error(`${SYNTHETIC_SECRET}:${name}`)
    } finally {
      pendingGovernedOperations -= 1
    }
  }

  settleNever(): void {
    const deferred = this.deferred
    this.deferred = null
    deferred?.resolve()
  }

  rejectNever(): void {
    const deferred = this.deferred
    this.deferred = null
    deferred?.reject(new Error(`${SYNTHETIC_SECRET}:late-rejection`))
  }

  async connect(): Promise<void> {
    await this.step('connect')
    if (!this.active && !this.closeRequested) {
      this.active = true
      activeGovernedClients += 1
    }
  }

  async query(query: string): Promise<{ rows: Array<Record<string, unknown>> }> {
    assert.ok(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES.includes(
      query as (typeof CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES)[number],
    ))
    assert.equal(/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|MERGE)\b/iu.test(query), false)
    assert.equal(/\b(?:products?|media|349)\b/iu.test(query), false)
    await this.step(query)
    if (query === 'SHOW transaction_read_only') {
      return { rows: [{ transaction_read_only: this.wrongReadOnly ? 'off' : 'on' }] }
    }
    if (query === 'SELECT 1 AS controlled_liveness') {
      return { rows: [{ controlled_liveness: this.wrongLiveness ? 0 : 1 }] }
    }
    return { rows: [] }
  }

  async end(): Promise<void> {
    this.endCalls += 1
    this.closeRequested = true
    try {
      await this.step('end')
    } finally {
      if (this.active) {
        this.active = false
        activeGovernedClients -= 1
      }
    }
  }

  on(): this {
    this.reconnectListenerCalls += 1
    return this
  }
}

function configurationEnvironment(): NodeJS.ProcessEnv {
  return buildControlledFreshCandidateConfigurationEnvironment({
    secrets: {
      [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: Buffer.alloc(32, 21).toString('base64'),
      [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: Buffer.alloc(32, 22).toString('base64'),
      DATABASE_URI: 'postgresql://synthetic-user:synthetic-password@synthetic.invalid/connectivity-test',
      PAYLOAD_SECRET: SYNTHETIC_SECRET,
      BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
    },
    deployedCommitIdentity: SYNTHETIC_COMMIT,
  })
}

const CONNECTIVITY_SECRET_VALUES = Object.freeze({
  [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: Buffer.alloc(32, 21).toString('base64'),
  [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: Buffer.alloc(32, 22).toString('base64'),
  DATABASE_URI: 'postgresql://synthetic-user:synthetic-password@synthetic.invalid/connectivity-test?sslmode=verify-full',
  PAYLOAD_SECRET: SYNTHETIC_SECRET,
  BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
})

function serializeConnectivitySecrets(overrides: Record<string, string> = {}): string {
  const values = { ...CONNECTIVITY_SECRET_VALUES, ...overrides } as Record<string, string>
  return `${CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST
    .map((name) => `${name}=${values[name]}`)
    .join('\n')}\n`
}

async function execute(
  client: SyntheticClient,
  timeoutMs = 100,
): Promise<Awaited<ReturnType<typeof executeControlledFreshCandidateConnectivity>>> {
  return await executeControlledFreshCandidateConnectivity({
    client,
    configurationReady: true,
    connectTimeoutMs: timeoutMs,
    queryTimeoutMs: timeoutMs,
    closeTimeoutMs: timeoutMs,
  })
}

async function flushContinuations(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

function sanitizedChildEnvironment(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    HOME: '/home/w11',
    USER: 'w11',
    LOGNAME: 'w11',
    PATH: process.env.PATH ?? '/home/w11/.local/bin:/usr/bin:/bin',
    TEMP: '/tmp',
    TMP: '/tmp',
    NODE_ENV: 'test',
    CI: '1',
    NO_COLOR: '1',
    NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--unhandled-rejections=strict',
    ...extra,
  }
}

function spawnTsx(
  scriptPath: string,
  environment: NodeJS.ProcessEnv,
  timeout = RUNNER_TIMEOUT_MS,
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [
    path.resolve('node_modules/tsx/dist/cli.mjs'),
    scriptPath,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: environment,
    timeout,
    windowsHide: true,
  })
}

function spawnSelf(mode: string): SpawnSyncReturns<string> {
  return spawnTsx(path.resolve(process.argv[1] as string), sanitizedChildEnvironment({ [TEST_MODE_ENV]: mode }))
}

function completionSentinel(expectedCases: number): string {
  return `${COMPLETION_PREFIX}: ${expectedCases}/${expectedCases} cases - ALL OK`
}

function childCompleted(result: SpawnSyncReturns<string>, expectedCases: number): boolean {
  return result.status === 0
    && result.signal === null
    && result.error === undefined
    && result.stderr === ''
    && result.stdout.includes(completionSentinel(expectedCases))
    && !result.stdout.includes(SYNTHETIC_SECRET)
}

function replaceExact(source: string, active: string, mutated: string): string {
  assert.equal(source.includes(active), true, `mutation anchor missing: ${active}`)
  const result = source.replace(active, mutated)
  assert.notEqual(result, source)
  return result
}

const CONNECTIVITY_CONTRACT_STUB = `
export function controlledFreshCandidateSecretReadiness() {
  return { configurationReady: true, executionReady: false }
}
`

const CONNECTIVITY_LOADER_STUB = `
export function loadControlledFreshCandidateConfigurationEnvironment() { return Object.create(null) }
export function validateControlledFreshCandidateEmptyLedger() { return true }
`

const CONNECTIVITY_RESOURCES_STUB = `
export const CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY'
export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH'
export const CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH'
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH'
`

function connectivityMutationHarness(modulePath: string, label: string, mode: string): string {
  return `
import assert from 'node:assert/strict';
const imported = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
const candidate = imported.default ?? imported;
const label = ${JSON.stringify(label)};
const mode = ${JSON.stringify(mode)};
let connectCalls = 0;
let endCalls = 0;
let reconnectListeners = 0;
const calls = [];
class Client {
  on() { reconnectListeners += 1; return this; }
  async connect() {
    connectCalls += 1;
    calls.push('connect');
    if (mode === 'unref-early-exit') await new Promise(() => undefined);
    if (mode === 'retry' && connectCalls === 1) throw new Error('synthetic-connect-failure');
  }
  async query(query) {
    calls.push(query);
    if (mode === 'rollback-failure' && query === 'ROLLBACK') throw new Error('synthetic-rollback-failure');
    if (query === 'SHOW transaction_read_only') {
      return { rows: [{ transaction_read_only: mode === 'wrong-read-only' ? 'off' : 'on' }] };
    }
    if (query === 'SELECT 1 AS controlled_liveness') return { rows: [{ controlled_liveness: 1 }] };
    return { rows: [] };
  }
  async end() {
    endCalls += 1;
    calls.push('end');
    if (mode === 'close-failure') throw new Error('synthetic-close-failure');
  }
}
if (mode === 'prevalidation-order') {
  let clientFactoryCalls = 0;
  const output = [];
  const exitCode = await candidate.runControlledFreshCandidateConnectivity({
    argv: ['--confirm-controlled-fresh-candidate-production-connectivity'],
    ambientEnvironment: { CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY: 'b'.repeat(40) },
    dependencies: {
      platform: 'linux',
      repositoryReady: () => true,
      ledgerReady: () => true,
      loadEnvironment: () => { throw new Error('synthetic-invalid-secret'); },
      createClient: async () => { clientFactoryCalls += 1; return new Client(); },
    },
    write: (text) => output.push(text),
  });
  const failure = JSON.parse(output.join(''));
  assert.equal(exitCode, 3, label);
  assert.equal(failure.failureStage, 'SECRET_CONFIGURATION', label);
  assert.equal(clientFactoryCalls, 0, label);
  assert.equal(connectCalls, 0, label);
  assert.equal(calls.length, 0, label);
} else {
  const report = await candidate.executeControlledFreshCandidateConnectivity({
    client: new Client(),
    configurationReady: true,
    connectTimeoutMs: 15,
    queryTimeoutMs: 15,
    closeTimeoutMs: 15,
  });
  if (mode === 'wrong-read-only') {
    assert.notEqual(report.status, 'VERIFIED', label);
    assert.equal(report.readOnlyConfirmed, false, label);
  } else if (mode === 'retry') {
    assert.equal(report.status, 'FAILED_CLOSED', label);
    assert.equal(connectCalls, 1, label);
  } else if (mode === 'reconnect') {
    assert.equal(report.status, 'VERIFIED', label);
    assert.equal(reconnectListeners, 0, label);
  } else if (mode === 'rollback-failure') {
    assert.equal(report.status, 'TERMINAL_UNCERTAIN', label);
    assert.equal(report.rollbackConfirmed, false, label);
  } else if (mode === 'close-failure') {
    assert.equal(report.status, 'TERMINAL_UNCERTAIN', label);
    assert.equal(report.naturalClose, false, label);
  } else if (mode === 'unref-early-exit') {
    assert.equal(report.status, 'TERMINAL_UNCERTAIN', label);
  } else {
    assert.equal(report.status, 'VERIFIED', label);
    assert.deepEqual(calls, [
      'connect',
      'BEGIN TRANSACTION READ ONLY',
      'SHOW transaction_read_only',
      'SELECT 1 AS controlled_liveness',
      'ROLLBACK',
      'end',
    ], label);
  }
  assert.equal(endCalls, 1, label);
}
assert.notEqual(globalThis.__CFC_PAYLOAD_IMPORTED__, true, label);
process.stdout.write('MUTATION_HARNESS_OK:' + label);
`
}

function runConnectivitySource(source: string, label: string, mode: string): SpawnSyncReturns<string> {
  const root = mkdtempSync(path.join(tmpdir(), 'cfc-connectivity-mutation-'))
  try {
    const scriptsDirectory = path.join(root, 'scripts')
    const payloadDirectory = path.join(root, 'node_modules', 'payload')
    mkdirSync(scriptsDirectory, { recursive: true })
    mkdirSync(payloadDirectory, { recursive: true })
    const modulePath = path.join(scriptsDirectory, 'controlled-fresh-candidate-connectivity.ts')
    writeFileSync(modulePath, source, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-secret-contract.ts'), CONNECTIVITY_CONTRACT_STUB, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-secret-loader.ts'), CONNECTIVITY_LOADER_STUB, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-runtime-resources.ts'), CONNECTIVITY_RESOURCES_STUB, 'utf8')
    writeFileSync(path.join(payloadDirectory, 'package.json'), JSON.stringify({ type: 'module', exports: './index.js' }), 'utf8')
    writeFileSync(
      path.join(payloadDirectory, 'index.js'),
      'globalThis.__CFC_PAYLOAD_IMPORTED__ = true; export const getPayload = async () => ({})',
      'utf8',
    )
    const harnessPath = path.join(root, 'connectivity-harness.mjs')
    writeFileSync(harnessPath, connectivityMutationHarness(modulePath, label, mode), 'utf8')
    return spawnTsx(harnessPath, sanitizedChildEnvironment({ [MUTATION_MODE_ENV]: label }), 10_000)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const READINESS_LOADER_STUB = `
export const CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL = 'https://www.uygunayakkabi.com'
export const CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY = 'uygunayakkabi-controlled-candidate-production-v1'
export function loadControlledFreshCandidateConfigurationEnvironment() { return Object.create(null) }
export function validateControlledFreshCandidateEmptyLedger() { return true }
`

const READINESS_RESOURCES_STUB = `
export const CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT = '/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate'
export const CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV = 'CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64'
export const CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT'
export const CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY'
export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH'
export const CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV = 'CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY'
export const CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH'
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV = 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_BASE64'
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH'
`

function readinessMutationHarness(modulePath: string, label: string): string {
  return `
import assert from 'node:assert/strict';
const imported = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
const candidate = imported.default ?? imported;
const label = ${JSON.stringify(label)};
const base = Object.create(null);
for (const name of [
  'CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64',
  'CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_BASE64',
  'CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT',
  'CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY',
  'CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY',
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'BLOB_READ_WRITE_TOKEN',
  'NEXT_PUBLIC_SERVER_URL',
  'PAYLOAD_DB_PUSH',
  'PAYLOAD_DROP_DATABASE',
]) base[name] = 'synthetic';
base.CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY = '/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate';
base.CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY = 'uygunayakkabi-controlled-candidate-production-v1';
base.CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT = 'c'.repeat(40);
base.NEXT_PUBLIC_SERVER_URL = 'https://www.uygunayakkabi.com';
base.PAYLOAD_DB_PUSH = 'false';
base.PAYLOAD_DROP_DATABASE = 'false';
const full = { ...base,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH: '/tmp/manifest.json',
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH: '/tmp/receipt.json',
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH: '/tmp/observation.json',
};
const readiness = (environment, stage, authenticated = false) => candidate.controlledFreshCandidateSecretReadiness(
  environment,
  { stage, ledgerReady: true, operationPackageAuthenticated: authenticated },
);
if (label === 'readiness-additional-variable') {
  assert.equal(readiness({ ...base, UNEXPECTED: 'x' }, 'configuration').configurationReady, false, label);
} else if (label === 'readiness-required-base-value') {
  const missing = { ...base }; delete missing.DATABASE_URI;
  assert.equal(readiness(missing, 'configuration').configurationReady, false, label);
} else if (label === 'readiness-configuration-operation-paths') {
  assert.equal(readiness(base, 'configuration').configurationReady, true, label);
} else if (label === 'readiness-execution-complete-conjunction') {
  assert.equal(readiness({}, 'execution', true).executionReady, false, label);
} else if (label === 'readiness-authenticated-package') {
  assert.equal(readiness(full, 'execution', false).executionReady, false, label);
} else if (label.startsWith('readiness-missing-')) {
  const missing = { ...full };
  const key = label.endsWith('manifest') ? 'CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH'
    : label.endsWith('receipt') ? 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH'
      : 'CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH';
  delete missing[key];
  assert.equal(readiness(missing, 'execution', true).executionReady, false, label);
} else if (label === 'readiness-configuration-never-execution') {
  assert.equal(readiness(base, 'configuration').executionReady, false, label);
} else {
  throw new Error('unknown readiness mutation scenario');
}
process.stdout.write('MUTATION_HARNESS_OK:' + label);
`
}

function runReadinessSource(source: string, label: string): SpawnSyncReturns<string> {
  const root = mkdtempSync(path.join(tmpdir(), 'cfc-readiness-mutation-'))
  try {
    const scriptsDirectory = path.join(root, 'scripts')
    mkdirSync(scriptsDirectory, { recursive: true })
    const modulePath = path.join(scriptsDirectory, 'controlled-fresh-candidate-secret-contract.ts')
    writeFileSync(modulePath, source, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-secret-loader.ts'), READINESS_LOADER_STUB, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-runtime-resources.ts'), READINESS_RESOURCES_STUB, 'utf8')
    const harnessPath = path.join(root, 'readiness-harness.mjs')
    writeFileSync(harnessPath, readinessMutationHarness(modulePath, label), 'utf8')
    return spawnTsx(harnessPath, sanitizedChildEnvironment({ [MUTATION_MODE_ENV]: label }), 10_000)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function runtimeMutationHarness(modulePath: string, label: string): string {
  return `
import assert from 'node:assert/strict';
const imported = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
const candidate = imported.default ?? imported;
const label = ${JSON.stringify(label)};
let initialized = 0;
const output = [];
const exitCode = await candidate.runControlledFreshCandidateRuntime({
  argv: ['--confirm-controlled-fresh-candidate-create'],
  executionEnvironment: { REQUIRED: 'synthetic' },
  initializeCreation: async () => { initialized += 1; throw new Error('synthetic initializer must remain unreachable'); },
  io: { stdout: (text) => output.push(text), stderr: (text) => output.push(text) },
});
assert.equal(globalThis.__CFC_READINESS_STAGE__, 'execution', label);
assert.equal(exitCode, 2, label);
assert.equal(initialized, 0, label);
process.stdout.write('MUTATION_HARNESS_OK:' + label);
`
}

function runRuntimeSource(source: string, label: string): SpawnSyncReturns<string> {
  const root = mkdtempSync(path.join(tmpdir(), 'cfc-runtime-stage-mutation-'))
  try {
    const scriptsDirectory = path.join(root, 'scripts')
    const libraryDirectory = path.join(root, 'src', 'lib')
    mkdirSync(scriptsDirectory, { recursive: true })
    mkdirSync(libraryDirectory, { recursive: true })
    const modulePath = path.join(scriptsDirectory, 'controlled-fresh-candidate-runtime.ts')
    writeFileSync(modulePath, source, 'utf8')
    writeFileSync(path.join(libraryDirectory, 'controlledFreshCandidateCreation.ts'), `
export function createControlledFreshCandidateOperationScope() {
  return {
    run: async (operation) => await operation(),
    cancel: async () => undefined,
    drain: async () => undefined,
    close: () => undefined,
  }
}
`, 'utf8')
    writeFileSync(path.join(libraryDirectory, 'controlledFreshCandidateTargetVerifier.ts'), `
export async function verifyControlledFreshCandidateTarget() { throw new Error('verifier must remain unreachable') }
`, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-runtime-resources.ts'), `
export async function executeControlledCreationResource() { throw new Error('execution must remain unreachable') }
export async function initializeControlledFreshCandidateCreationRuntime() { throw new Error('initializer must remain unreachable') }
export async function initializeControlledFreshCandidateVerificationRuntime() { throw new Error('initializer must remain unreachable') }
`, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-secret-contract.ts'), `
export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST = ['REQUIRED']
export function controlledFreshCandidateSecretReadiness(_environment, options) {
  globalThis.__CFC_READINESS_STAGE__ = options.stage
  return { configurationReady: true, executionReady: false }
}
`, 'utf8')
    writeFileSync(path.join(scriptsDirectory, 'controlled-fresh-candidate-secret-loader.ts'), `
export function controlledFreshCandidateExecutionEnvironmentIsAuthenticated() { return true }
`, 'utf8')
    const harnessPath = path.join(root, 'runtime-harness.mjs')
    writeFileSync(harnessPath, runtimeMutationHarness(modulePath, label), 'utf8')
    return spawnTsx(harnessPath, sanitizedChildEnvironment({ [MUTATION_MODE_ENV]: label }), 10_000)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

type SourceFault = {
  name: string
  mode: string
  mutate(source: string): string
}

const readinessFaults: SourceFault[] = [
  {
    name: 'readiness-additional-variable',
    mode: 'readiness',
    mutate: (source) => replaceExact(source, '    && !additionalVariablesPresent', '    && true /* !additionalVariablesPresent */'),
  },
  {
    name: 'readiness-required-base-value',
    mode: 'readiness',
    mutate: (source) => replaceExact(
      source,
      'const configurationValuesPresent = CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST.every(',
      'const configurationValuesPresent = CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST.some(',
    ),
  },
  {
    name: 'readiness-configuration-operation-paths',
    mode: 'readiness',
    mutate: (source) => replaceExact(
      source,
      `export const CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST = Object.freeze(
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.filter((name) => (
    !OPERATION_BOUND_ENVIRONMENT_NAMES.has(name)
  )),
)`,
      'export const CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST = Object.freeze([...CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST])',
    ),
  },
  {
    name: 'readiness-execution-complete-conjunction',
    mode: 'readiness',
    mutate: (source) => replaceExact(
      source,
      `const executionReady = configurationReady
    && executionValuesPresent
    && operationPackageAuthenticated`,
      `const executionReady = configurationReady
    || executionValuesPresent
    || operationPackageAuthenticated`,
    ),
  },
  {
    name: 'readiness-authenticated-package',
    mode: 'readiness',
    mutate: (source) => replaceExact(source, '    && operationPackageAuthenticated', '    && true /* operationPackageAuthenticated */'),
  },
  ...[
    ['readiness-missing-manifest', 'CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV'],
    ['readiness-missing-receipt', 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV'],
    ['readiness-missing-observation', 'CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV'],
  ].map(([name, environmentName]) => ({
    name,
    mode: 'readiness',
    mutate: (source: string) => replaceExact(
      source,
      `const executionValuesPresent = CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.every(
    (name) => variables[name].presence === 'PRESENT_NONEMPTY',`,
      `const executionValuesPresent = CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.every(
    (name) => name === ${environmentName} || variables[name].presence === 'PRESENT_NONEMPTY',`,
    ),
  })),
  {
    name: 'readiness-configuration-never-execution',
    mode: 'readiness',
    mutate: (source) => replaceExact(
      source,
      `const executionReady = configurationReady
    && executionValuesPresent
    && operationPackageAuthenticated`,
      `const executionReady = options.stage === 'configuration'
    ? configurationReady
    : configurationReady && executionValuesPresent && operationPackageAuthenticated`,
    ),
  },
]

const connectivityFaults: SourceFault[] = [
  {
    name: 'connectivity-begin-removed',
    mode: 'safe-sequence',
    mutate: (source) => replaceExact(source, "  'BEGIN TRANSACTION READ ONLY',\n", ''),
  },
  {
    name: 'connectivity-writable-transaction',
    mode: 'safe-sequence',
    mutate: (source) => replaceExact(source, "  'BEGIN TRANSACTION READ ONLY',", "  'BEGIN',"),
  },
  {
    name: 'connectivity-read-only-assertion-removed',
    mode: 'wrong-read-only',
    mutate: (source) => replaceExact(
      source,
      "    if (!exactReadOnlyResult(readOnly)) throw new Error('CONTROLLED_CONNECTIVITY_READ_ONLY_NOT_CONFIRMED')",
      '    void readOnly',
    ),
  },
  ...[
    ['connectivity-insert', 'INSERT INTO audit_log DEFAULT VALUES'],
    ['connectivity-update', 'UPDATE settings SET value = value'],
    ['connectivity-delete', 'DELETE FROM audit_log'],
    ['connectivity-merge', 'MERGE INTO audit_log USING audit_log ON false WHEN NOT MATCHED THEN INSERT DEFAULT VALUES'],
    ['connectivity-create', 'CREATE TEMP TABLE cfc_probe(id integer)'],
    ['connectivity-alter', 'ALTER TABLE audit_log ADD COLUMN cfc_probe integer'],
    ['connectivity-drop', 'DROP TABLE audit_log'],
    ['connectivity-truncate', 'TRUNCATE TABLE audit_log'],
    ['connectivity-copy', 'COPY audit_log TO STDOUT'],
    ['connectivity-writable-cte', 'WITH changed AS (UPDATE audit_log SET id = id RETURNING 1) SELECT 1'],
    ['connectivity-product-query', 'SELECT id FROM products LIMIT 1'],
    ['connectivity-media-query', 'SELECT id FROM media LIMIT 1'],
    ['connectivity-product-349', 'SELECT 349 AS product_id'],
  ].map(([name, query]) => ({
    name,
    mode: 'safe-sequence',
    mutate: (source: string) => replaceExact(source, "  'SELECT 1 AS controlled_liveness',", `  '${query}',`),
  })),
  {
    name: 'connectivity-payload-import',
    mode: 'safe-sequence',
    mutate: (source) => replaceExact(
      source,
      '  try {\n    result.connectAttempts = 1',
      "  try {\n    await import('payload')\n    result.connectAttempts = 1",
    ),
  },
  {
    name: 'connectivity-retry',
    mode: 'retry',
    mutate: (source) => replaceExact(
      source,
      '    await bounded(params.client.connect(), params.connectTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CONNECT_TIMEOUT_MS)',
      `    try {
      await bounded(params.client.connect(), params.connectTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CONNECT_TIMEOUT_MS)
    } catch {
      result.connectAttempts += 1
      await bounded(params.client.connect(), params.connectTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CONNECT_TIMEOUT_MS)
    }`,
    ),
  },
  {
    name: 'connectivity-reconnect-listener',
    mode: 'reconnect',
    mutate: (source) => replaceExact(
      source,
      '    result.connectAttempts = 1\n    await bounded(',
      "    result.connectAttempts = 1\n    ;(params.client as ControlledFreshCandidatePgClient & { on(event: string, listener: () => void): unknown }).on('error', () => undefined)\n    await bounded(",
    ),
  },
  {
    name: 'connectivity-rollback-failure-success',
    mode: 'rollback-failure',
    mutate: (source) => replaceExact(
      source,
      "  } catch (error) {\n    result.status = 'FAILED_CLOSED'",
      "  } catch (error) {\n    if (rollbackAttempted) { transactionStarted = false; result.rollbackConfirmed = true }\n    result.status = 'FAILED_CLOSED'",
    ),
  },
  {
    name: 'connectivity-close-failure-success',
    mode: 'close-failure',
    mutate: (source) => replaceExact(
      source,
      `    } catch {
      terminalUncertain = true
      result.failureStage = 'CLOSE'
      result.naturalClose = false
    }`,
      `    } catch {
      terminalUncertain = false
      result.failureStage = 'NONE'
      result.naturalClose = true
    }`,
    ),
  },
  {
    name: 'connectivity-close-not-exactly-once',
    mode: 'safe-sequence',
    mutate: (source) => replaceExact(
      source,
      '      await bounded(params.client.end(), params.closeTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CLOSE_TIMEOUT_MS)',
      `      await bounded(params.client.end(), params.closeTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CLOSE_TIMEOUT_MS)
      await bounded(params.client.end(), params.closeTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CLOSE_TIMEOUT_MS)`,
    ),
  },
  {
    name: 'connectivity-unref-early-exit',
    mode: 'unref-early-exit',
    mutate: (source) => replaceExact(
      source,
      '        timer = setTimeout(() => reject(new ControlledFreshCandidateConnectivityTimeoutError()), timeoutMs)',
      `        timer = setTimeout(() => reject(new ControlledFreshCandidateConnectivityTimeoutError()), timeoutMs)
        timer.unref()`,
      ),
  },
  {
    name: 'connectivity-client-before-secret-validation',
    mode: 'prevalidation-order',
    mutate: (source) => replaceExact(
      source,
      '  let environment: NodeJS.ProcessEnv',
      `  await (dependencies.createClient ?? createInstalledPgClient)(Object.create(null) as NodeJS.ProcessEnv)
  let environment: NodeJS.ProcessEnv`,
    ),
  },
]

assert.equal(readinessFaults.length, READINESS_MUTATION_CASE_COUNT)
assert.equal(connectivityFaults.length, CONNECTIVITY_MUTATION_CASE_COUNT)

async function runSourceMutationCases(check: (name: string, body: () => void | Promise<void>) => Promise<void>): Promise<void> {
  const readinessSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-secret-contract.ts'), 'utf8')
  for (const fault of readinessFaults) {
    await check(`semantic mutation ${fault.name}`, () => {
      const baseline = runReadinessSource(readinessSource, fault.name)
      assert.equal(baseline.status, 0, fault.name)
      assert.equal(baseline.stderr, '', fault.name)
      assert.equal(baseline.stdout, `MUTATION_HARNESS_OK:${fault.name}`, fault.name)
      const mutant = runReadinessSource(fault.mutate(readinessSource), fault.name)
      assert.notEqual(mutant.status, 0, `${fault.name} mutant must fail`)
      assert.equal(mutant.stdout.includes('MUTATION_HARNESS_OK'), false, fault.name)
      assert.equal(mutant.stderr.includes(fault.name), true, fault.name)
      assert.equal(`${mutant.stdout}${mutant.stderr}`.includes(SYNTHETIC_SECRET), false, fault.name)
    })
  }

  await check('semantic mutation runtime-accepts-configuration-stage', () => {
    const label = 'runtime-accepts-configuration-stage'
    const runtimeSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime.ts'), 'utf8')
    const baseline = runRuntimeSource(runtimeSource, label)
    assert.equal(baseline.status, 0, label)
    assert.equal(baseline.stderr, '', label)
    assert.equal(baseline.stdout, `MUTATION_HARNESS_OK:${label}`, label)
    const mutated = replaceExact(
      replaceExact(runtimeSource, "      stage: 'execution',", "      stage: 'configuration',"),
      '    if (!readiness.executionReady) {',
      '    if (!readiness.configurationReady) {',
    )
    const mutant = runRuntimeSource(mutated, label)
    assert.notEqual(mutant.status, 0, `${label} mutant must fail`)
    assert.equal(mutant.stdout.includes('MUTATION_HARNESS_OK'), false, label)
    assert.equal(mutant.stderr.includes(label), true, label)
  })

  const connectivitySource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-connectivity.ts'), 'utf8')
  for (const fault of connectivityFaults) {
    await check(`semantic mutation ${fault.name}`, () => {
      const baseline = runConnectivitySource(connectivitySource, fault.name, fault.mode)
      assert.equal(baseline.status, 0, `${fault.name} baseline: ${baseline.stderr}`)
      assert.equal(baseline.stderr, '', fault.name)
      assert.equal(baseline.stdout, `MUTATION_HARNESS_OK:${fault.name}`, fault.name)
      const mutant = runConnectivitySource(fault.mutate(connectivitySource), fault.name, fault.mode)
      assert.equal(`${mutant.stdout}${mutant.stderr}`.includes(SYNTHETIC_SECRET), false, fault.name)
      assert.equal(mutant.stdout.includes('MUTATION_HARNESS_OK'), false, fault.name)
      if (fault.name === 'connectivity-unref-early-exit') {
        assert.equal(mutant.status, 13)
        assert.equal(mutant.stdout, '')
        assert.equal(mutant.signal, null)
        assert.equal(mutant.error, undefined)
      } else {
        assert.notEqual(mutant.status, 0, `${fault.name} mutant must fail`)
        assert.equal(mutant.stderr.includes(fault.name), true, fault.name)
      }
    })
  }
}

async function runNaturalChild(): Promise<void> {
  const client = new SyntheticClient()
  const result = await execute(client, 50)
  assert.equal(result.status, 'VERIFIED')
  assert.equal(client.endCalls, 1)
  assert.equal(activeGovernedClients, 0)
  assert.equal(pendingGovernedOperations, 0)
}

async function runSuite(includeParentCompletionCases: boolean): Promise<{ completed: number; expected: number }> {
  const completedNames = new Set<string>()
  let completed = 0
  const expected = includeParentCompletionCases ? DIRECT_CASE_COUNT : CORE_CASE_COUNT
  const check = async (name: string, body: () => void | Promise<void>): Promise<void> => {
    assert.equal(completedNames.has(name), false, `duplicate case completion: ${name}`)
    currentCaseName = name
    await body()
    completedNames.add(name)
    completed += 1
    assert.ok(completed <= expected, 'completed case count exceeded exact expectation')
    console.log(`ok ${completed} - ${name}`)
    currentCaseName = 'between-cases'
  }

  const ledgerBefore = process.platform === 'linux'
    ? readdirSync('/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate')
    : []

  await check('strict CLI argument parsing', () => {
    assert.deepEqual(parseControlledFreshCandidateConnectivityArgs(['--help']), { ok: true, help: true })
    assert.deepEqual(parseControlledFreshCandidateConnectivityArgs([CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION]), { ok: true, help: false })
    assert.deepEqual(parseControlledFreshCandidateConnectivityArgs([]), { ok: false })
    assert.deepEqual(parseControlledFreshCandidateConnectivityArgs([CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION, 'extra']), { ok: false })
  })

  const successClient = new SyntheticClient()
  const success = await execute(successClient)
  await check('successful connect read-only liveness rollback and close', () => {
    assert.equal(success.status, 'VERIFIED')
    assert.equal(success.failureStage, 'NONE')
    assert.equal(success.readOnlyConfirmed, true)
    assert.equal(success.livenessConfirmed, true)
    assert.equal(success.rollbackConfirmed, true)
    assert.equal(success.closeCalls, 1)
    assert.equal(success.naturalClose, true)
    assert.equal(success.zeroMutationAssertion, true)
    assert.equal(success.eligibleForPublishing, false)
  })

  const connectFailure = new SyntheticClient({ failAt: 'connect' })
  const connectFailed = await execute(connectFailure)
  await check('connect rejection is sanitized and closed', () => {
    assert.equal(connectFailed.status, 'FAILED_CLOSED')
    assert.equal(connectFailed.failureStage, 'CONNECT')
    assert.deepEqual(connectFailure.calls, ['connect', 'end'])
    assert.equal(connectFailure.endCalls, 1)
  })

  const connectTimeoutClient = new SyntheticClient({ neverAt: 'connect' })
  const connectTimeout = await execute(connectTimeoutClient, 5)
  connectTimeoutClient.settleNever()
  await flushContinuations()
  await check('never-settling connect reaches explicit timeout', () => {
    assert.equal(connectTimeout.status, 'TERMINAL_UNCERTAIN')
    assert.equal(connectTimeout.closeCalls, 1)
    assert.equal(pendingGovernedOperations, 0)
  })

  const beginFailureClient = new SyntheticClient({ failAt: 'BEGIN TRANSACTION READ ONLY' })
  const beginFailure = await execute(beginFailureClient)
  await check('begin failure stops before application queries', () => {
    assert.equal(beginFailure.status, 'FAILED_CLOSED')
    assert.equal(beginFailure.failureStage, 'BEGIN')
    assert.deepEqual(beginFailureClient.calls, ['connect', 'BEGIN TRANSACTION READ ONLY', 'end'])
  })

  const readOnlyQueryClient = new SyntheticClient({ failAt: 'SHOW transaction_read_only' })
  const readOnlyQueryFailure = await execute(readOnlyQueryClient)
  await check('read-only-state query failure rolls back', () => {
    assert.equal(readOnlyQueryFailure.status, 'FAILED_CLOSED')
    assert.equal(readOnlyQueryFailure.failureStage, 'READ_ONLY')
    assert.equal(readOnlyQueryFailure.rollbackConfirmed, true)
    assert.deepEqual(readOnlyQueryClient.calls, [
      'connect', 'BEGIN TRANSACTION READ ONLY', 'SHOW transaction_read_only', 'ROLLBACK', 'end',
    ])
  })

  const wrongReadOnly = await execute(new SyntheticClient({ wrongReadOnly: true }))
  await check('read-only response must equal on', () => {
    assert.equal(wrongReadOnly.status, 'FAILED_CLOSED')
    assert.equal(wrongReadOnly.readOnlyConfirmed, false)
  })

  const livenessQueryClient = new SyntheticClient({ failAt: 'SELECT 1 AS controlled_liveness' })
  const livenessQueryFailure = await execute(livenessQueryClient)
  await check('liveness query failure rolls back', () => {
    assert.equal(livenessQueryFailure.status, 'FAILED_CLOSED')
    assert.equal(livenessQueryFailure.failureStage, 'LIVENESS')
    assert.equal(livenessQueryFailure.rollbackConfirmed, true)
  })

  const wrongLiveness = await execute(new SyntheticClient({ wrongLiveness: true }))
  await check('unexpected liveness value fails closed', () => {
    assert.equal(wrongLiveness.status, 'FAILED_CLOSED')
    assert.equal(wrongLiveness.livenessConfirmed, false)
  })

  const rollbackFailureClient = new SyntheticClient({ failAt: 'ROLLBACK' })
  const rollbackFailure = await execute(rollbackFailureClient)
  await check('rollback rejection is terminal uncertainty', () => {
    assert.equal(rollbackFailure.status, 'TERMINAL_UNCERTAIN')
    assert.equal(rollbackFailure.failureStage, 'ROLLBACK')
    assert.equal(rollbackFailure.rollbackConfirmed, false)
    assert.equal(rollbackFailureClient.endCalls, 1)
  })

  const rollbackTimeoutClient = new SyntheticClient({ neverAt: 'ROLLBACK' })
  const rollbackTimeout = await execute(rollbackTimeoutClient, 5)
  rollbackTimeoutClient.settleNever()
  await flushContinuations()
  await check('never-settling rollback reaches terminal timeout', () => {
    assert.equal(rollbackTimeout.status, 'TERMINAL_UNCERTAIN')
    assert.equal(rollbackTimeout.rollbackConfirmed, false)
    assert.equal(pendingGovernedOperations, 0)
  })

  const closeFailureClient = new SyntheticClient({ failAt: 'end' })
  const closeFailure = await execute(closeFailureClient)
  await check('close rejection prevents success', () => {
    assert.equal(closeFailure.status, 'TERMINAL_UNCERTAIN')
    assert.equal(closeFailure.failureStage, 'CLOSE')
    assert.equal(closeFailure.naturalClose, false)
    assert.equal(closeFailureClient.endCalls, 1)
  })

  const closeTimeoutClient = new SyntheticClient({ neverAt: 'end' })
  const closeTimeout = await execute(closeTimeoutClient, 5)
  closeTimeoutClient.settleNever()
  await flushContinuations()
  await check('never-settling close reaches terminal timeout', () => {
    assert.equal(closeTimeout.status, 'TERMINAL_UNCERTAIN')
    assert.equal(closeTimeout.naturalClose, false)
    assert.equal(closeTimeoutClient.endCalls, 1)
    assert.equal(pendingGovernedOperations, 0)
  })

  const boundaryClient = new SyntheticClient({ boundaryAt: 'connect', boundaryDelayMs: 10 })
  const boundary = await execute(boundaryClient, 10)
  await check('operation settlement at timeout boundary settles once', () => {
    assert.ok(boundary.status === 'VERIFIED' || boundary.status === 'TERMINAL_UNCERTAIN')
    assert.equal(boundaryClient.stepCounts.get('connect'), 1)
    assert.equal(boundaryClient.endCalls, 1)
  })

  const lateRejectClient = new SyntheticClient({ neverAt: 'connect' })
  const lateReject = await execute(lateRejectClient, 5)
  lateRejectClient.rejectNever()
  await flushContinuations()
  await check('late rejection after timeout is observed without unhandled rejection', () => {
    assert.equal(lateReject.status, 'TERMINAL_UNCERTAIN')
    assert.equal(unexpectedRejections, 0)
    assert.equal(pendingGovernedOperations, 0)
  })

  const multipleFailureClient = new SyntheticClient({ failAt: ['ROLLBACK', 'end'] })
  const multipleFailure = await execute(multipleFailureClient)
  await check('multiple failure paths issue one cleanup request', () => {
    assert.equal(multipleFailure.status, 'TERMINAL_UNCERTAIN')
    assert.equal(multipleFailureClient.endCalls, 1)
  })

  await check('client end is exactly once on success', () => {
    assert.equal(successClient.endCalls, 1)
    assert.equal(success.closeCalls, 1)
  })

  const stickyClient = new SyntheticClient({ neverAt: 'end' })
  const sticky = await execute(stickyClient, 5)
  stickyClient.settleNever()
  await flushContinuations()
  await check('terminal uncertainty remains sticky after late cleanup settlement', () => {
    assert.equal(sticky.status, 'TERMINAL_UNCERTAIN')
    assert.equal(sticky.naturalClose, false)
  })

  await check('rollback or close uncertainty never becomes success', () => {
    assert.notEqual(rollbackFailure.status, 'VERIFIED')
    assert.notEqual(rollbackTimeout.status, 'VERIFIED')
    assert.notEqual(closeFailure.status, 'VERIFIED')
    assert.notEqual(closeTimeout.status, 'VERIFIED')
  })

  const noRetryClient = new SyntheticClient({ failOnceAt: 'connect' })
  const noRetry = await execute(noRetryClient)
  await check('connect failure is not retried', () => {
    assert.equal(noRetry.status, 'FAILED_CLOSED')
    assert.equal(noRetryClient.stepCounts.get('connect'), 1)
  })

  const noReconnectClient = new SyntheticClient()
  await execute(noReconnectClient)
  await check('no reconnect listener is registered', () => {
    assert.equal(noReconnectClient.reconnectListenerCalls, 0)
  })

  await check('no Payload module is initialized', () => {
    assert.notEqual((globalThis as Record<string, unknown>).__CFC_PAYLOAD_IMPORTED__, true)
  })

  await check('exact fixed SQL sequence is the only query sequence', () => {
    assert.deepEqual(successClient.calls, [
      'connect',
      ...CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES,
      'end',
    ])
    assert.deepEqual(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES, [
      'BEGIN TRANSACTION READ ONLY',
      'SHOW transaction_read_only',
      'SELECT 1 AS controlled_liveness',
      'ROLLBACK',
    ])
  })

  await check('zero ledger package receipt observation or data mutation artifact', () => {
    if (process.platform === 'linux') {
      assert.deepEqual(readdirSync('/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate'), ledgerBefore)
    }
    assert.equal(success.zeroMutationAssertion, true)
    assert.equal(success.eligibleForPublishing, false)
  })

  const cliOutput: string[] = []
  const cliClient = new SyntheticClient()
  const cliExit = await runControlledFreshCandidateConnectivity({
    argv: [CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION],
    ambientEnvironment: {
      [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: SYNTHETIC_COMMIT,
      NODE_OPTIONS: `--require=${SYNTHETIC_SECRET}`,
      HTTPS_PROXY: SYNTHETIC_SECRET,
    },
    dependencies: {
      platform: 'linux',
      repositoryReady: () => true,
      ledgerReady: () => true,
      loadEnvironment: () => configurationEnvironment(),
      createClient: async (environment) => {
        assert.equal(environment.NODE_OPTIONS, undefined)
        assert.equal(environment.HTTPS_PROXY, undefined)
        assert.equal(environment.PATH, undefined)
        return cliClient
      },
    },
    write: (text) => cliOutput.push(text),
  })
  await check('CLI adapters preserve environment isolation and nondisclosure', () => {
    assert.equal(cliExit, 0)
    assert.equal(cliOutput.join('').includes(SYNTHETIC_SECRET), false)
    assert.equal(cliOutput.join('').includes('synthetic.invalid'), false)
  })

  await check('pre-connect failures expose only stable sanitized stages', async () => {
    const cases = [
      { stage: 'REPOSITORY', dependencies: { repositoryReady: () => false } },
      { stage: 'LEDGER', dependencies: { repositoryReady: () => true, ledgerReady: () => false } },
      {
        stage: 'SECRET_CONFIGURATION',
        dependencies: { repositoryReady: () => true, ledgerReady: () => true, loadEnvironment: () => { throw new Error(SYNTHETIC_SECRET) } },
      },
      {
        stage: 'CONFIGURATION_READINESS',
        dependencies: { repositoryReady: () => true, ledgerReady: () => true, loadEnvironment: () => Object.create(null) },
      },
      {
        stage: 'CLIENT_CONSTRUCTION',
        configurationReady: true,
        dependencies: {
          repositoryReady: () => true,
          ledgerReady: () => true,
          loadEnvironment: () => configurationEnvironment(),
          createClient: async () => { throw new Error(SYNTHETIC_SECRET) },
        },
      },
    ] as const
    for (const entry of cases) {
      const output: string[] = []
      const exit = await runControlledFreshCandidateConnectivity({
        argv: [CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION],
        ambientEnvironment: { [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: SYNTHETIC_COMMIT },
        dependencies: { platform: 'linux', ...entry.dependencies },
        write: (text) => output.push(text),
      })
      const report = JSON.parse(output.join('')) as Record<string, unknown>
      assert.equal(exit, 3, entry.stage)
      assert.equal(report.status, 'FAILED_CLOSED', entry.stage)
      assert.equal(report.failureStage, entry.stage, entry.stage)
      assert.equal(report.configurationReady, entry.configurationReady === true, entry.stage)
      assert.equal(report.connectAttempts, 0, entry.stage)
      assert.equal(report.queryCount, 0, entry.stage)
      assert.equal(output.join('').includes(SYNTHETIC_SECRET), false, entry.stage)
    }
  })

  await check('real temporary secret loader rejects invalid configuration before client construction', async () => {
    if (process.platform !== 'linux') return
    const root = mkdtempSync('/home/w11/.local/share/cfc-connectivity-secret-validation-')
    chmodSync(root, 0o700)
    const secretPath = path.join(root, 'runtime-secrets.env')
    try {
      const invalidCases = {
        encodedUsernameWhitespace: { DATABASE_URI: 'postgresql://%20%20:pass@synthetic.invalid/connectivity-test' },
        encodedPasswordUnicodeWhitespace: { DATABASE_URI: 'postgresql://user:%E2%80%83@synthetic.invalid/connectivity-test' },
        doubleEncodedDatabaseWhitespace: { DATABASE_URI: 'postgresql://user:pass@synthetic.invalid/%2520' },
        malformedQueryEncoding: { DATABASE_URI: 'postgresql://user:pass@synthetic.invalid/connectivity-test?sslmode=%' },
        unknownCredentialQuery: { DATABASE_URI: 'postgresql://user:pass@synthetic.invalid/connectivity-test?password=unexpected' },
        duplicateQuery: { DATABASE_URI: 'postgresql://user:pass@synthetic.invalid/connectivity-test?sslmode=verify-full&sslmode=verify-full' },
        embeddedOpaqueWhitespace: { PAYLOAD_SECRET: 'synthetic payload secret' },
        oversizedOpaqueSecret: { BLOB_READ_WRITE_TOKEN: 'x'.repeat(8_193) },
      }
      for (const [label, overrides] of Object.entries(invalidCases)) {
        writeFileSync(secretPath, serializeConnectivitySecrets(overrides), { mode: 0o600 })
        chmodSync(secretPath, 0o600)
        let clientFactoryCalls = 0
        let clientObjectsConstructed = 0
        const output: string[] = []
        const exit = await runControlledFreshCandidateConnectivity({
          argv: [CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION],
          ambientEnvironment: { [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: SYNTHETIC_COMMIT },
          dependencies: {
            platform: 'linux',
            repositoryReady: () => true,
            ledgerReady: () => true,
            loadEnvironment: (identity) => loadControlledFreshCandidateConfigurationEnvironment({
              deployedCommitIdentity: identity,
              testOnlySecretPath: secretPath,
            }),
            createClient: async () => {
              clientFactoryCalls += 1
              clientObjectsConstructed += 1
              return new SyntheticClient()
            },
          },
          write: (text) => output.push(text),
        })
        const report = JSON.parse(output.join('')) as Record<string, unknown>
        assert.equal(exit, 3, label)
        assert.equal(report.status, 'FAILED_CLOSED', label)
        assert.equal(report.failureStage, 'SECRET_CONFIGURATION', label)
        assert.equal(report.configurationReady, false, label)
        assert.equal(report.connectAttempts, 0, label)
        assert.equal(report.queryCount, 0, label)
        assert.equal(report.rollbackAttempts, 0, label)
        assert.equal(report.closeCalls, 0, label)
        assert.equal(clientFactoryCalls, 0, label)
        assert.equal(clientObjectsConstructed, 0, label)
        const publicFailure = output.join('')
        for (const value of Object.values({ ...CONNECTIVITY_SECRET_VALUES, ...overrides })) {
          assert.equal(publicFailure.includes(value), false, label)
        }
        assert.equal(publicFailure.includes('synthetic.invalid'), false, label)
        assert.equal(publicFailure.includes('password'), false, label)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  await check('real temporary secret loader permits valid policy before the synthetic client phase', async () => {
    if (process.platform !== 'linux') return
    const root = mkdtempSync('/home/w11/.local/share/cfc-connectivity-secret-valid-')
    chmodSync(root, 0o700)
    const secretPath = path.join(root, 'runtime-secrets.env')
    try {
      writeFileSync(secretPath, serializeConnectivitySecrets(), { mode: 0o600 })
      chmodSync(secretPath, 0o600)
      let clientFactoryCalls = 0
      let clientObjectsConstructed = 0
      const client = new SyntheticClient()
      const output: string[] = []
      const exit = await runControlledFreshCandidateConnectivity({
        argv: [CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION],
        ambientEnvironment: { [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: SYNTHETIC_COMMIT },
        dependencies: {
          platform: 'linux',
          repositoryReady: () => true,
          ledgerReady: () => true,
          loadEnvironment: (identity) => loadControlledFreshCandidateConfigurationEnvironment({
            deployedCommitIdentity: identity,
            testOnlySecretPath: secretPath,
          }),
          createClient: async () => {
            clientFactoryCalls += 1
            clientObjectsConstructed += 1
            return client
          },
        },
        write: (text) => output.push(text),
      })
      const report = JSON.parse(output.join('')) as Record<string, unknown>
      assert.equal(exit, 0)
      assert.equal(report.status, 'VERIFIED')
      assert.equal(report.failureStage, 'NONE')
      assert.equal(clientFactoryCalls, 1)
      assert.equal(clientObjectsConstructed, 1)
      assert.deepEqual(client.calls, [
        'connect',
        'BEGIN TRANSACTION READ ONLY',
        'SHOW transaction_read_only',
        'SELECT 1 AS controlled_liveness',
        'ROLLBACK',
        'end',
      ])
      for (const value of Object.values(CONNECTIVITY_SECRET_VALUES)) {
        assert.equal(output.join('').includes(value), false)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  const refusedOutput: string[] = []
  const refusedExit = await runControlledFreshCandidateConnectivity({
    argv: [CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION],
    ambientEnvironment: {
      [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: SYNTHETIC_COMMIT,
      [CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV]: '/not/accepted',
      [CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV]: '/not/accepted',
      [CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV]: '/not/accepted',
    },
    dependencies: { platform: 'linux' },
    write: (text) => refusedOutput.push(text),
  })
  await check('operation-bound inputs are refused before initialization', () => {
    assert.equal(refusedExit, 2)
    assert.equal(refusedOutput.join('').includes('/not/accepted'), false)
  })

  const naturalChild = spawnSelf('natural-success')
  await check('complete success exits naturally with explicit child sentinel', () => {
    assert.equal(naturalChild.status, 0, naturalChild.stderr)
    assert.equal(naturalChild.signal, null)
    assert.equal(naturalChild.error, undefined)
    assert.equal(naturalChild.stdout, NATURAL_CHILD_SENTINEL)
    assert.equal(naturalChild.stderr, '')
  })

  await runSourceMutationCases(check)

  if (includeParentCompletionCases) {
    const completeChild = spawnSelf('suite-only')
    await check('parent accepts only exact child case count and sentinel', () => {
      assert.equal(childCompleted(completeChild, CORE_CASE_COUNT), true, completeChild.stderr)
    })

    const vulnerableChild = spawnSelf('fault-early-exit')
    await check('parent rejects reproduced empty-output exit-zero vulnerability', () => {
      assert.equal(vulnerableChild.status, 0)
      assert.equal(vulnerableChild.stdout, '')
      assert.equal(vulnerableChild.stderr, '')
      assert.equal(childCompleted(vulnerableChild, CORE_CASE_COUNT), false)
    })
  }

  assert.equal(completed, expected)
  assert.equal(completedNames.size, expected)
  assert.equal(activeGovernedClients, 0)
  assert.equal(pendingGovernedOperations, 0)
  assert.equal(unexpectedRejections, 0)
  return { completed, expected }
}

function runVulnerableEarlyExitFault(): void {
  const vulnerableTimeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new Error('vulnerable timeout fired')), 25)
    timer.unref()
  })
  void vulnerableTimeout.catch(() => {
    process.stdout.write('VULNERABLE_TIMEOUT_UNEXPECTEDLY_FIRED')
  })
}

const mode = process.env[TEST_MODE_ENV] ?? 'direct'
if (mode === 'fault-early-exit') {
  runVulnerableEarlyExitFault()
} else {
  const onUnhandledRejection = (): void => {
    unexpectedRejections += 1
    process.exitCode = 1
    process.stderr.write('CONTROLLED_CONNECTIVITY_TEST_UNEXPECTED_REJECTION\n')
  }
  process.on('unhandledRejection', onUnhandledRejection)
  const runnerWatchdog = setTimeout(() => {
    process.exitCode = 1
    process.stderr.write('CONTROLLED_CONNECTIVITY_TEST_INCOMPLETE\n')
  }, RUNNER_TIMEOUT_MS)
  const execution = mode === 'natural-success'
    ? runNaturalChild().then(() => ({ completed: 0, expected: 0 }))
    : runSuite(mode !== 'suite-only')
  execution.then(({ completed, expected }) => {
    assert.equal(unexpectedRejections, 0)
    assert.equal(activeGovernedClients, 0)
    assert.equal(pendingGovernedOperations, 0)
    if (mode === 'natural-success') process.stdout.write(NATURAL_CHILD_SENTINEL)
    else process.stdout.write(completionSentinel(expected))
    assert.equal(completed, expected)
  }).catch(() => {
    process.exitCode = 1
    process.stderr.write(`CONTROLLED_CONNECTIVITY_TEST_FAILURE:${currentCaseName}\n`)
  }).finally(() => {
    clearTimeout(runnerWatchdog)
    process.removeListener('unhandledRejection', onUnhandledRejection)
  })
}
