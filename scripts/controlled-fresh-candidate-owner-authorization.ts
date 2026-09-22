import { spawnSync } from 'node:child_process'
import { fsyncSync, lstatSync, renameSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_MS,
  controlledFreshCandidateCanonicalJson,
} from '../src/lib/controlledFreshCandidatePilotContract'
import {
  createControlledFreshCandidateOwnerAuthorization,
} from '../src/lib/controlledFreshCandidatePilotAuthorization'
import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  initializeControlledFreshCandidateOwnerLedger,
  openControlledFreshCandidatePhysicalReceiptDestination,
  writeControlledFreshCandidatePrivateFileExclusive,
} from './controlled-fresh-candidate-runtime-resources'
import {
  CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY,
  loadControlledFreshCandidateConfigurationEnvironment,
  resolveControlledFreshCandidateOperationPackage,
  type ControlledFreshCandidateOperationPackageResult,
} from './controlled-fresh-candidate-secret-loader'
import { createControlledFreshCandidateOperationScope } from '../src/lib/controlledFreshCandidateCreation'

export const CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_CONFIRMATION =
  '--confirm-controlled-fresh-candidate-owner-authorization' as const
const WSL_REPOSITORY = '/mnt/c/Projects/uygunayakkabi-store'

function exactBase64Key(value: string | undefined): Buffer | null {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) return null
  const key = Buffer.from(value, 'base64')
  return key.byteLength >= 32 && key.byteLength <= 128 && key.toString('base64') === value ? key : null
}

export function controlledFreshCandidateCanonicalRepositoryCommit(): string | null {
  const environment = Object.create(null) as NodeJS.ProcessEnv
  environment.HOME = '/home/w11'
  environment.LC_ALL = 'C'
  environment.GIT_OPTIONAL_LOCKS = '0'
  const common = { cwd: WSL_REPOSITORY, env: environment, encoding: 'utf8' as const, timeout: 5_000, windowsHide: true }
  const root = spawnSync('/usr/bin/git', ['--no-optional-locks', 'rev-parse', '--show-toplevel'], common)
  const branch = spawnSync('/usr/bin/git', ['--no-optional-locks', 'branch', '--show-current'], common)
  const head = spawnSync('/usr/bin/git', ['--no-optional-locks', 'rev-parse', 'HEAD'], common)
  const upstream = spawnSync('/usr/bin/git', ['--no-optional-locks', 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], common)
  const originMain = spawnSync('/usr/bin/git', ['--no-optional-locks', 'rev-parse', 'origin/main'], common)
  const status = spawnSync('/usr/bin/git', ['--no-optional-locks', 'status', '--porcelain=v1', '-uall'], common)
  if (
    root.status !== 0 || root.stdout.trim() !== WSL_REPOSITORY
    || branch.status !== 0 || branch.stdout.trim() !== 'main'
    || head.status !== 0 || !/^[0-9a-f]{40}$/u.test(head.stdout.trim())
    || upstream.status !== 0 || upstream.stdout.trim() !== 'origin/main'
    || originMain.status !== 0 || originMain.stdout.trim() !== head.stdout.trim()
    || status.status !== 0 || status.stdout.length !== 0
  ) return null
  return head.stdout.trim()
}

export async function authorizeControlledFreshCandidateOperation(params: {
  configurationEnvironment: NodeJS.ProcessEnv
  packageResult: ControlledFreshCandidateOperationPackageResult
  now?: number
  testOnlyLedgerRoot?: string
}): Promise<{ operationId: string; authorizationIdentity: string; expiresAt: string; eligibleForPublishing: false }> {
  const resolved = await resolveControlledFreshCandidateOperationPackage({
    operationId: params.packageResult.operationId,
    ...(params.testOnlyLedgerRoot === undefined ? {} : { testOnlyLedgerRoot: params.testOnlyLedgerRoot }),
  })
  if (controlledFreshCandidateCanonicalJson(resolved) !== controlledFreshCandidateCanonicalJson(params.packageResult)) {
    throw new Error('CONTROLLED_OWNER_AUTHORIZATION_PACKAGE_MISMATCH')
  }
  const configuredCommit = params.configurationEnvironment.CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY
  const configuredEnvironment = params.configurationEnvironment.CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY
  const key = exactBase64Key(params.configurationEnvironment[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV])
  if (
    !key
    || configuredCommit !== resolved.runtimeCommitIdentity
    || configuredEnvironment !== resolved.environmentIdentity
    || configuredEnvironment !== CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY
  ) throw new Error('CONTROLLED_OWNER_AUTHORIZATION_CONTEXT_MISMATCH')
  const now = params.now ?? Date.now()
  const packageExpiry = Date.parse(resolved.expiresAt)
  const expiresAtMs = Math.min(packageExpiry, now + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_MS)
  if (!Number.isSafeInteger(now) || expiresAtMs <= now) throw new Error('CONTROLLED_OWNER_AUTHORIZATION_EXPIRED')
  const scope = createControlledFreshCandidateOperationScope({ timeoutMs: 30_000 })
  const ledger = await initializeControlledFreshCandidateOwnerLedger(scope, {
    ...(params.testOnlyLedgerRoot === undefined ? {} : { testOnlyApprovedRoot: params.testOnlyLedgerRoot }),
    authorizationKeyBase64: key.toString('base64'),
  })
  let destination: ReturnType<typeof openControlledFreshCandidatePhysicalReceiptDestination> | null = null
  try {
    destination = openControlledFreshCandidatePhysicalReceiptDestination(resolved.authorizationPath, ledger.device)
    const issuedAt = new Date(now).toISOString()
    const authorization = createControlledFreshCandidateOwnerAuthorization({
      operationId: resolved.operationId,
      packageDigest: resolved.packageDigest,
      candidateDigest: resolved.candidateDigest,
      runtimeCommitIdentity: resolved.runtimeCommitIdentity,
      environmentIdentity: resolved.environmentIdentity,
      issuedAt,
      notBefore: issuedAt,
      expiresAt: new Date(expiresAtMs).toISOString(),
      key,
    })
    writeControlledFreshCandidatePrivateFileExclusive({
      destination,
      bytes: Buffer.from(controlledFreshCandidateCanonicalJson(authorization), 'utf8'),
    })
    return {
      operationId: resolved.operationId,
      authorizationIdentity: authorization.authorizationIdentity,
      expiresAt: authorization.expiresAt,
      eligibleForPublishing: false,
    }
  } finally {
    key.fill(0)
    try { destination?.close() } catch { /* caller fails closed */ }
    try { ledger.close() } catch { /* caller fails closed */ }
    try { await scope.cancel() } catch { /* caller fails closed */ }
    try { await scope.drain() } catch { /* caller fails closed */ }
    try { scope.close() } catch { /* caller fails closed */ }
  }
}

export function consumeControlledFreshCandidateOwnerAuthorization(
  packageResult: ControlledFreshCandidateOperationPackageResult,
): void {
  const consumedPath = path.join(path.dirname(packageResult.authorizationPath), 'owner-authorization.consumed.json')
  try { lstatSync(consumedPath); throw new Error('CONTROLLED_OWNER_AUTHORIZATION_REPLAY') } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const source = lstatSync(packageResult.authorizationPath)
  if (!source.isFile() || source.isSymbolicLink() || (source.mode & 0o777) !== 0o600) {
    throw new Error('CONTROLLED_OWNER_AUTHORIZATION_INVALID')
  }
  renameSync(packageResult.authorizationPath, consumedPath)
  const directory = openControlledFreshCandidatePhysicalReceiptDestination(packageResult.authorizationPath, BigInt(source.dev))
  try { fsyncSync(directory.handle) } finally { directory.close() }
}

function parseArgs(argv: readonly string[]): { operationId: string } | null {
  if (argv.length !== 2 || !argv.includes(CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_CONFIRMATION)) return null
  const operationArg = argv.find((arg) => arg.startsWith('--operation='))
  const operationId = operationArg?.slice('--operation='.length)
  return operationId && /^[a-f0-9-]{36}$/u.test(operationId) ? { operationId } : null
}

export async function runControlledFreshCandidateOwnerAuthorization(argv: readonly string[]): Promise<number> {
  if (process.platform !== 'linux') return 2
  const parsed = parseArgs(argv)
  const commit = controlledFreshCandidateCanonicalRepositoryCommit()
  if (!parsed || !commit) return 2
  try {
    const packageResult = await resolveControlledFreshCandidateOperationPackage({ operationId: parsed.operationId })
    const configurationEnvironment = loadControlledFreshCandidateConfigurationEnvironment({ deployedCommitIdentity: commit })
    const report = await authorizeControlledFreshCandidateOperation({ configurationEnvironment, packageResult })
    console.log(JSON.stringify({ version: 'controlled-fresh-candidate-owner-authorization-result/v1', status: 'AUTHORIZED_ONCE', ...report }))
    return 0
  } catch {
    console.error('CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_REFUSED')
    return 3
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false
if (isMain) {
  process.exitCode = 1
  void runControlledFreshCandidateOwnerAuthorization(process.argv.slice(2))
    .then((code) => { process.exitCode = code })
    .catch(() => { process.exitCode = 1 })
}
