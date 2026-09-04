import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import {
  controlledFreshCandidateSecretReadiness,
} from './controlled-fresh-candidate-secret-contract'
import {
  loadControlledFreshCandidateConfigurationEnvironment,
  validateControlledFreshCandidateEmptyLedger,
} from './controlled-fresh-candidate-secret-loader'
import {
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
} from './controlled-fresh-candidate-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_VERSION =
  'controlled-fresh-candidate-connectivity/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION =
  '--confirm-controlled-fresh-candidate-production-connectivity' as const
export const CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES = Object.freeze([
  'BEGIN TRANSACTION READ ONLY',
  'SHOW transaction_read_only',
  'SELECT 1 AS controlled_liveness',
  'ROLLBACK',
] as const)

const CONTROLLED_FRESH_CANDIDATE_WSL_REPOSITORY = '/mnt/c/Projects/uygunayakkabi-store' as const
const CONTROLLED_FRESH_CANDIDATE_CONNECT_TIMEOUT_MS = 10_000
const CONTROLLED_FRESH_CANDIDATE_QUERY_TIMEOUT_MS = 5_000
const CONTROLLED_FRESH_CANDIDATE_CLOSE_TIMEOUT_MS = 5_000

class ControlledFreshCandidateConnectivityTimeoutError extends Error {
  constructor() {
    super('CONTROLLED_CONNECTIVITY_TIMEOUT')
    this.name = 'ControlledFreshCandidateConnectivityTimeoutError'
  }
}

export type ControlledFreshCandidateConnectivityStatus =
  | 'VERIFIED'
  | 'REFUSED'
  | 'FAILED_CLOSED'
  | 'TERMINAL_UNCERTAIN'

export type ControlledFreshCandidateConnectivityReport = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_VERSION
  status: ControlledFreshCandidateConnectivityStatus
  configurationReady: boolean
  readOnlyConfirmed: boolean
  livenessConfirmed: boolean
  rollbackConfirmed: boolean
  connectAttempts: number
  queryCount: number
  rollbackAttempts: number
  closeCalls: number
  naturalClose: boolean
  zeroMutationAssertion: boolean
  eligibleForPublishing: false
}

export type ControlledFreshCandidatePgClient = {
  connect(): Promise<void>
  query(query: string): Promise<{ rows: Array<Record<string, unknown>> }>
  end(): Promise<void>
}

type ConnectivityDependencies = {
  platform?: NodeJS.Platform
  repositoryReady?(deployedCommitIdentity: string): boolean
  ledgerReady?(): boolean
  loadEnvironment?(deployedCommitIdentity: string): NodeJS.ProcessEnv
  createClient?(environment: NodeJS.ProcessEnv): Promise<ControlledFreshCandidatePgClient>
  connectTimeoutMs?: number
  queryTimeoutMs?: number
  closeTimeoutMs?: number
}

function baseReport(status: ControlledFreshCandidateConnectivityStatus): ControlledFreshCandidateConnectivityReport {
  return {
    version: CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_VERSION,
    status,
    configurationReady: false,
    readOnlyConfirmed: false,
    livenessConfirmed: false,
    rollbackConfirmed: false,
    connectAttempts: 0,
    queryCount: 0,
    rollbackAttempts: 0,
    closeCalls: 0,
    naturalClose: false,
    zeroMutationAssertion: true,
    eligibleForPublishing: false,
  }
}

async function bounded<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new ControlledFreshCandidateConnectivityTimeoutError()), timeoutMs)
        timer.unref()
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function exactReadOnlyResult(result: { rows: Array<Record<string, unknown>> }): boolean {
  return result.rows.length === 1 && result.rows[0]?.transaction_read_only === 'on'
}

function exactLivenessResult(result: { rows: Array<Record<string, unknown>> }): boolean {
  return result.rows.length === 1 && result.rows[0]?.controlled_liveness === 1
}

export async function executeControlledFreshCandidateConnectivity(params: {
  client: ControlledFreshCandidatePgClient
  configurationReady: true
  connectTimeoutMs?: number
  queryTimeoutMs?: number
  closeTimeoutMs?: number
}): Promise<ControlledFreshCandidateConnectivityReport> {
  const result = baseReport('FAILED_CLOSED')
  result.configurationReady = true
  let transactionStarted = false
  let rollbackAttempted = false
  let terminalUncertain = false
  try {
    result.connectAttempts = 1
    await bounded(params.client.connect(), params.connectTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CONNECT_TIMEOUT_MS)
    result.queryCount += 1
    await bounded(
      params.client.query(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES[0]),
      params.queryTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_QUERY_TIMEOUT_MS,
    )
    transactionStarted = true
    result.queryCount += 1
    const readOnly = await bounded(
      params.client.query(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES[1]),
      params.queryTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_QUERY_TIMEOUT_MS,
    )
    if (!exactReadOnlyResult(readOnly)) throw new Error('CONTROLLED_CONNECTIVITY_READ_ONLY_NOT_CONFIRMED')
    result.readOnlyConfirmed = true
    result.queryCount += 1
    const liveness = await bounded(
      params.client.query(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES[2]),
      params.queryTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_QUERY_TIMEOUT_MS,
    )
    if (!exactLivenessResult(liveness)) throw new Error('CONTROLLED_CONNECTIVITY_LIVENESS_NOT_CONFIRMED')
    result.livenessConfirmed = true
    rollbackAttempted = true
    result.rollbackAttempts = 1
    result.queryCount += 1
    await bounded(
      params.client.query(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES[3]),
      params.queryTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_QUERY_TIMEOUT_MS,
    )
    transactionStarted = false
    result.rollbackConfirmed = true
  } catch (error) {
    result.status = 'FAILED_CLOSED'
    if (error instanceof ControlledFreshCandidateConnectivityTimeoutError) terminalUncertain = true
    if (transactionStarted && !rollbackAttempted) {
      rollbackAttempted = true
      result.rollbackAttempts = 1
      result.queryCount += 1
      try {
        await bounded(
          params.client.query(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES[3]),
          params.queryTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_QUERY_TIMEOUT_MS,
        )
        transactionStarted = false
        result.rollbackConfirmed = true
      } catch (rollbackError) {
        if (rollbackError instanceof ControlledFreshCandidateConnectivityTimeoutError) terminalUncertain = true
        terminalUncertain = true
      }
    }
  } finally {
    result.closeCalls = 1
    try {
      await bounded(params.client.end(), params.closeTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_CLOSE_TIMEOUT_MS)
      result.naturalClose = true
    } catch {
      terminalUncertain = true
      result.naturalClose = false
    }
  }
  if (terminalUncertain || transactionStarted) result.status = 'TERMINAL_UNCERTAIN'
  else if (
    result.readOnlyConfirmed
    && result.livenessConfirmed
    && result.rollbackConfirmed
    && result.naturalClose
  ) result.status = 'VERIFIED'
  return result
}

function canonicalRepositoryReady(deployedCommitIdentity: string): boolean {
  if (!/^[0-9a-f]{40}$/u.test(deployedCommitIdentity)) return false
  const childEnvironment = Object.create(null) as NodeJS.ProcessEnv
  childEnvironment.HOME = '/home/w11'
  childEnvironment.LC_ALL = 'C'
  childEnvironment.GIT_OPTIONAL_LOCKS = '0'
  const common = {
    cwd: CONTROLLED_FRESH_CANDIDATE_WSL_REPOSITORY,
    env: childEnvironment,
    encoding: 'utf8' as const,
    timeout: 5_000,
    windowsHide: true,
  }
  const head = spawnSync('/usr/bin/git', ['--no-optional-locks', 'rev-parse', 'HEAD'], common)
  const branch = spawnSync('/usr/bin/git', ['--no-optional-locks', 'branch', '--show-current'], common)
  const status = spawnSync('/usr/bin/git', ['--no-optional-locks', 'status', '--porcelain=v1', '-uall'], common)
  return head.status === 0
    && branch.status === 0
    && status.status === 0
    && head.stdout.trim() === deployedCommitIdentity
    && branch.stdout.trim() === 'main'
    && status.stdout.length === 0
}

async function createInstalledPgClient(environment: NodeJS.ProcessEnv): Promise<ControlledFreshCandidatePgClient> {
  const databaseUri = environment.DATABASE_URI
  if (typeof databaseUri !== 'string' || databaseUri.length === 0) throw new Error('CONTROLLED_CONNECTIVITY_CONFIGURATION_INVALID')
  const pg = await import('pg')
  const Client = pg.Client
  return new Client({
    connectionString: databaseUri,
    connectionTimeoutMillis: CONTROLLED_FRESH_CANDIDATE_CONNECT_TIMEOUT_MS,
    application_name: 'controlled-fresh-candidate-connectivity-v1',
    options: '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=5000',
  }) as unknown as ControlledFreshCandidatePgClient
}

export function parseControlledFreshCandidateConnectivityArgs(argv: readonly string[]):
  | { ok: true; help: true }
  | { ok: true; help: false }
  | { ok: false } {
  if (argv.length === 1 && argv[0] === '--help') return { ok: true, help: true }
  if (argv.length === 1 && argv[0] === CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION) {
    return { ok: true, help: false }
  }
  return { ok: false }
}

function usage(): string {
  return [
    'Controlled Fresh Candidate Production Connectivity',
    '',
    `  ${CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION}`,
    '  --help',
    '',
    'One direct pg client; constant-query read-only transaction; no Payload, pool, or retry.',
  ].join('\n')
}

export async function runControlledFreshCandidateConnectivity(params: {
  argv: readonly string[]
  ambientEnvironment: Readonly<Record<string, string | undefined>>
  dependencies?: ConnectivityDependencies
  write?: (text: string) => void
}): Promise<number> {
  const write = params.write ?? ((text: string) => console.log(text))
  const decision = parseControlledFreshCandidateConnectivityArgs(params.argv)
  if (decision.ok && decision.help) {
    write(usage())
    return 0
  }
  if (!decision.ok) {
    write(JSON.stringify(baseReport('REFUSED')))
    return 2
  }
  const dependencies = params.dependencies ?? {}
  if ((dependencies.platform ?? process.platform) !== 'linux') {
    write(JSON.stringify(baseReport('REFUSED')))
    return 2
  }
  if ([
    CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
    CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
    CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  ].some((name) => params.ambientEnvironment[name] !== undefined)) {
    write(JSON.stringify(baseReport('REFUSED')))
    return 2
  }
  const deployedCommitIdentity = params.ambientEnvironment[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  if (typeof deployedCommitIdentity !== 'string' || !/^[0-9a-f]{40}$/u.test(deployedCommitIdentity)) {
    write(JSON.stringify(baseReport('REFUSED')))
    return 2
  }
  try {
    const repositoryReady = (dependencies.repositoryReady ?? canonicalRepositoryReady)(deployedCommitIdentity)
    const ledgerReady = (dependencies.ledgerReady ?? (() => validateControlledFreshCandidateEmptyLedger()))()
    if (!repositoryReady || !ledgerReady) throw new Error('CONTROLLED_CONNECTIVITY_PREFLIGHT_REFUSED')
    const environment = (dependencies.loadEnvironment
      ?? ((identity: string) => loadControlledFreshCandidateConfigurationEnvironment({ deployedCommitIdentity: identity })))(deployedCommitIdentity)
    const readiness = controlledFreshCandidateSecretReadiness(environment, {
      stage: 'configuration',
      ledgerReady: true,
    })
    if (!readiness.configurationReady || readiness.executionReady) {
      throw new Error('CONTROLLED_CONNECTIVITY_CONFIGURATION_REFUSED')
    }
    const client = await (dependencies.createClient ?? createInstalledPgClient)(environment)
    const result = await executeControlledFreshCandidateConnectivity({
      client,
      configurationReady: true,
      connectTimeoutMs: dependencies.connectTimeoutMs,
      queryTimeoutMs: dependencies.queryTimeoutMs,
      closeTimeoutMs: dependencies.closeTimeoutMs,
    })
    write(JSON.stringify(result))
    return result.status === 'VERIFIED' ? 0 : 3
  } catch {
    write(JSON.stringify(baseReport('FAILED_CLOSED')))
    return 3
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  process.exitCode = 1
  void runControlledFreshCandidateConnectivity({
    argv: process.argv.slice(2),
    ambientEnvironment: process.env,
  }).then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
