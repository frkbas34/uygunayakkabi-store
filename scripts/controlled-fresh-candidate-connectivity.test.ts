import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'

import {
  CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION,
  CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES,
  executeControlledFreshCandidateConnectivity,
  parseControlledFreshCandidateConnectivityArgs,
  runControlledFreshCandidateConnectivity,
  type ControlledFreshCandidatePgClient,
} from './controlled-fresh-candidate-connectivity'
import { buildControlledFreshCandidateConfigurationEnvironment } from './controlled-fresh-candidate-secret-loader'
import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
} from './controlled-fresh-candidate-runtime-resources'

const SYNTHETIC_COMMIT = 'b'.repeat(40)
const SYNTHETIC_SECRET = 'synthetic-connectivity-secret-never-output'

class SyntheticClient implements ControlledFreshCandidatePgClient {
  readonly calls: string[] = []
  readonly failAt: string | null
  readonly neverAt: string | null
  readonly wrongReadOnly: boolean
  readonly wrongLiveness: boolean

  constructor(options: {
    failAt?: string
    neverAt?: string
    wrongReadOnly?: boolean
    wrongLiveness?: boolean
  } = {}) {
    this.failAt = options.failAt ?? null
    this.neverAt = options.neverAt ?? null
    this.wrongReadOnly = options.wrongReadOnly === true
    this.wrongLiveness = options.wrongLiveness === true
  }

  private async step(name: string): Promise<void> {
    this.calls.push(name)
    if (this.neverAt === name) await new Promise<void>(() => undefined)
    if (this.failAt === name) throw new Error(`${SYNTHETIC_SECRET}:${name}`)
  }

  async connect(): Promise<void> {
    await this.step('connect')
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
    await this.step('end')
  }
}

function configurationEnvironment(): NodeJS.ProcessEnv {
  return buildControlledFreshCandidateConfigurationEnvironment({
    secrets: {
      [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: Buffer.alloc(32, 21).toString('base64'),
      [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: Buffer.alloc(32, 22).toString('base64'),
      DATABASE_URI: 'postgres://synthetic.invalid/connectivity-test',
      PAYLOAD_SECRET: SYNTHETIC_SECRET,
      BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
    },
    deployedCommitIdentity: SYNTHETIC_COMMIT,
  })
}

async function execute(client: SyntheticClient, timeoutMs = 100): Promise<Awaited<ReturnType<typeof executeControlledFreshCandidateConnectivity>>> {
  return await executeControlledFreshCandidateConnectivity({
    client,
    configurationReady: true,
    connectTimeoutMs: timeoutMs,
    queryTimeoutMs: timeoutMs,
    closeTimeoutMs: timeoutMs,
  })
}

async function main(): Promise<void> {
  assert.deepEqual(parseControlledFreshCandidateConnectivityArgs(['--help']), { ok: true, help: true })
  assert.deepEqual(parseControlledFreshCandidateConnectivityArgs([CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION]), { ok: true, help: false })
  assert.deepEqual(parseControlledFreshCandidateConnectivityArgs([]), { ok: false })
  assert.deepEqual(parseControlledFreshCandidateConnectivityArgs([CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION, 'extra']), { ok: false })

  const ledgerBefore = process.platform === 'linux'
    ? readdirSync('/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate')
    : []
  const client = new SyntheticClient()
  const success = await execute(client)
  assert.equal(success.status, 'VERIFIED')
  assert.equal(success.readOnlyConfirmed, true)
  assert.equal(success.livenessConfirmed, true)
  assert.equal(success.rollbackConfirmed, true)
  assert.equal(success.closeCalls, 1)
  assert.equal(success.naturalClose, true)
  assert.equal(success.zeroMutationAssertion, true)
  assert.equal(success.eligibleForPublishing, false)
  assert.deepEqual(client.calls, [
    'connect',
    ...CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES,
    'end',
  ])

  const connectFailure = new SyntheticClient({ failAt: 'connect' })
  const connectFailed = await execute(connectFailure)
  assert.equal(connectFailed.status, 'FAILED_CLOSED')
  assert.deepEqual(connectFailure.calls, ['connect', 'end'])
  assert.equal(connectFailed.closeCalls, 1)

  const queryFailure = new SyntheticClient({ failAt: 'SHOW transaction_read_only' })
  const queryFailed = await execute(queryFailure)
  assert.equal(queryFailed.status, 'FAILED_CLOSED')
  assert.deepEqual(queryFailure.calls, [
    'connect',
    'BEGIN TRANSACTION READ ONLY',
    'SHOW transaction_read_only',
    'ROLLBACK',
    'end',
  ])
  assert.equal(queryFailed.rollbackConfirmed, true)
  assert.equal(queryFailed.closeCalls, 1)

  const rollbackFailure = new SyntheticClient({ failAt: 'ROLLBACK' })
  const rollbackFailed = await execute(rollbackFailure)
  assert.equal(rollbackFailed.status, 'TERMINAL_UNCERTAIN')
  assert.equal(rollbackFailed.rollbackConfirmed, false)
  assert.equal(rollbackFailed.closeCalls, 1)

  const closeFailure = new SyntheticClient({ failAt: 'end' })
  const closeFailed = await execute(closeFailure)
  assert.equal(closeFailed.status, 'TERMINAL_UNCERTAIN')
  assert.equal(closeFailed.naturalClose, false)
  assert.equal(closeFailed.closeCalls, 1)

  const readOnlyFailure = await execute(new SyntheticClient({ wrongReadOnly: true }))
  assert.equal(readOnlyFailure.status, 'FAILED_CLOSED')
  assert.equal(readOnlyFailure.readOnlyConfirmed, false)
  const livenessFailure = await execute(new SyntheticClient({ wrongLiveness: true }))
  assert.equal(livenessFailure.status, 'FAILED_CLOSED')
  assert.equal(livenessFailure.livenessConfirmed, false)

  const timeoutClient = new SyntheticClient({ neverAt: 'connect' })
  const timeout = await execute(timeoutClient, 5)
  assert.equal(timeout.status, 'TERMINAL_UNCERTAIN')
  assert.equal(timeout.closeCalls, 1)
  assert.deepEqual(timeoutClient.calls, ['connect', 'end'])

  const output: string[] = []
  const cliClient = new SyntheticClient()
  const exitCode = await runControlledFreshCandidateConnectivity({
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
    write: (text) => output.push(text),
  })
  assert.equal(exitCode, 0)
  assert.equal(output.join('').includes(SYNTHETIC_SECRET), false)
  assert.equal(output.join('').includes('synthetic.invalid'), false)

  const operationInputOutput: string[] = []
  assert.equal(await runControlledFreshCandidateConnectivity({
    argv: [CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_CONFIRMATION],
    ambientEnvironment: {
      [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: SYNTHETIC_COMMIT,
      [CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV]: '/not/accepted',
    },
    dependencies: { platform: 'linux' },
    write: (text) => operationInputOutput.push(text),
  }), 2)
  assert.equal(operationInputOutput.join('').includes('/not/accepted'), false)

  assert.equal(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES.length, 4)
  assert.deepEqual(CONTROLLED_FRESH_CANDIDATE_CONNECTIVITY_QUERIES, [
    'BEGIN TRANSACTION READ ONLY',
    'SHOW transaction_read_only',
    'SELECT 1 AS controlled_liveness',
    'ROLLBACK',
  ])
  if (process.platform === 'linux') {
    assert.deepEqual(
      readdirSync('/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate'),
      ledgerBefore,
    )
  }
  console.log('controlledFreshCandidateConnectivity: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
