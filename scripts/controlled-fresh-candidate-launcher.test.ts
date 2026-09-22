import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as creationContract from '../src/lib/controlledFreshCandidateCreation'
import * as budgetContract from '../src/lib/controlledFreshCandidatePilotContract'

import {
  createControlledFreshCandidateOwnerAuthorization,
  validateControlledFreshCandidateOwnerAuthorization,
  authenticateControlledFreshCandidateReleaseAttestation,
  controlledFreshCandidateReleaseSigningBytes,
  CONTROLLED_FRESH_CANDIDATE_RELEASE_ATTESTATION_VERSION,
  CONTROLLED_FRESH_CANDIDATE_VERCEL_PROJECT,
  CONTROLLED_FRESH_CANDIDATE_CANONICAL_ALIAS,
  type ControlledFreshCandidateReleaseAttestation,
} from '../src/lib/controlledFreshCandidatePilotAuthorization'
import {
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY,
} from '../src/lib/controlledFreshCandidatePilotContract'
import {
  consumeControlledFreshCandidateOwnerAuthorization,
} from './controlled-fresh-candidate-owner-authorization'
import { loadControlledFreshCandidateReleaseAttestation,
  type ControlledFreshCandidateOperationPackageResult } from './controlled-fresh-candidate-secret-loader'

const key = new Uint8Array(32).fill(23)
const operationId = '12345678-1234-4123-8123-123456789abc'
const packageDigest = 'a'.repeat(64)
const candidateDigest = 'b'.repeat(64)
const commit = 'c'.repeat(40)
const environmentIdentity = 'uygunayakkabi-controlled-candidate-production-v1'
const issuedAt = '2026-09-14T10:00:00.000Z'

// Execute the actual entry-point bodies in memory. Only external dependencies
// are synthetic; no checkout, credentials, files, transport or real authority.
async function deadlineFixture(options: {
  mode?: 'create' | 'verify'; preparation?: number; consumption?: number; work?: number; cleanup?: number;
  verdict?: string; launcherSource?: string; runtimeSource?: string; verifierSource?: string; expireAtScopeEntry?: boolean;
} = {}) {
  let clock = 100_000
  const startedAt = clock
  const deadlineAt = startedAt + 45_000
  const budgets: ReturnType<typeof budgetContract.createControlledFreshCandidateRuntimeBudget>[] = []
  const scopes: { inherited: number | undefined; terminal: number }[] = []
  const output: string[] = []
  let runtimeEnteredAt: number | undefined
  let cleanupRemaining: number | undefined
  let cleanupStarted = false
  const counts = Object.fromEntries(creationContract.CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.map((name) => [name, 0]))
  const report = { version: creationContract.CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION,
    verdict: options.verdict ?? (options.mode === 'verify' ? 'STRICT_FRESH_TARGET_READY' : 'CREATION_COMMITTED_QUARANTINED'),
    reasonCodes: [options.verdict ? 'FINALIZATION_READBACK_UNCERTAIN' : options.mode === 'verify' ? 'STRICT_TARGET_READY' : 'CREATION_COMPLETE'],
    counts, phase: 'teardown_observed', quarantineCertainty: 'pending_observed', commitCertainty: 'committed_observed',
    cleanupStatus: 'complete', ownerInputManifestMatch: true, eligibleForPublishing: false, eligibleForVisualOnlyGeneration: true }
  const resource = (scope: creationContract.ControlledFreshCandidateOperationScope) => ({ scope,
    creationInput: {}, creationDependencies: {}, capability: {}, dependencies: {},
    destroy: async () => {
      if (!cleanupStarted) { cleanupStarted = true; cleanupRemaining = deadlineAt - clock; clock += options.cleanup ?? 5_000 }
      return { ok: true }
    }, completeObservation() {}, closeObservation() {}, failObservation() {},
  })
  const nativeRequire = createRequire(path.resolve('scripts/controlled-fresh-candidate-launcher.test.ts'))
  const shared = {
    contract: { ...creationContract, createControlledFreshCandidateOperationScope(params: { deadlineAt?: number }) {
      if (options.expireAtScopeEntry) clock = deadlineAt
      runtimeEnteredAt = clock
      const scope = creationContract.createControlledFreshCandidateOperationScope({ ...params, now: () => clock })
      scopes.push({ inherited: params.deadlineAt, terminal: creationContract.controlledFreshCandidateTerminalDeadlineAt(scope) })
      return scope
    } },
    budget: { ...budgetContract, createControlledFreshCandidateRuntimeBudget() {
      const budget = budgetContract.createControlledFreshCandidateRuntimeBudget(); budgets.push(budget); return budget
    } },
    loader: {
      assertControlledFreshCandidateNoAmbientPgOverrides() {},
      controlledFreshCandidateExecutionEnvironmentIsAuthenticated: () => true,
      controlledFreshCandidateExecutionReleaseIsVerified: () => true,
      resolveControlledFreshCandidateOperationPackage: async () => { clock += options.preparation ?? 12_000; return { runtimeCommitIdentity: commit } },
      loadControlledFreshCandidateReleaseAttestation: async () => ({ sourceCommit: commit }),
      loadControlledFreshCandidateConfigurationEnvironment: () => ({}),
      buildControlledFreshCandidateExecutionEnvironment: async () => ({}),
    },
    resources: {
      initializeControlledFreshCandidateCreationRuntime: async (scope: creationContract.ControlledFreshCandidateOperationScope) => resource(scope),
      initializeControlledFreshCandidateVerificationRuntime: async (scope: creationContract.ControlledFreshCandidateOperationScope) => resource(scope),
      executeControlledCreationResource: async () => { clock += options.work ?? 25_000; return report },
    },
  }
  let runtime: Record<string, (...args: never[]) => Promise<number>>
  const load = (source: string): Record<string, (...args: never[]) => Promise<number>> => {
    const fixtureModule = { exports: {} }
    const code = ts.transpileModule(source.replaceAll('import.meta.url', '"synthetic-not-main"'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    runInNewContext(code, { module: fixtureModule, exports: fixtureModule.exports, Date: { now: () => clock }, Number, Math, Set, Map,
      process: { platform: 'linux', argv: [], env: { NODE_ENV: 'test' } },
      console: { log: (text: string) => output.push(text), error() {} },
      require(name: string) {
        if (name.startsWith('node:')) return nativeRequire(name)
        if (name.endsWith('/controlledFreshCandidateCreation')) return shared.contract
        if (name.endsWith('/controlledFreshCandidatePilotContract')) return shared.budget
        if (name.endsWith('/controlledFreshCandidateTargetVerifier')) return { verifyControlledFreshCandidateTarget: async () => { clock += options.work ?? 25_000; return report } }
        if (name.endsWith('/controlled-fresh-candidate-runtime-resources')) return shared.resources
        if (name.endsWith('/controlled-fresh-candidate-secret-loader')) return shared.loader
        if (name.endsWith('/controlled-fresh-candidate-secret-contract')) return { CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST: [], controlledFreshCandidateSecretReadiness: () => ({ executionReady: true }) }
        if (name.endsWith('/controlled-fresh-candidate-owner-authorization')) return {
          controlledFreshCandidateCanonicalRepositoryCommit: () => commit,
          consumeControlledFreshCandidateOwnerAuthorization: () => { clock += options.consumption ?? 2_000 },
        }
        if (name.endsWith('/controlled-fresh-candidate-runtime')) return runtime
        throw new Error(`unexpected offline dependency: ${name}`)
      },
    })
    return fixtureModule.exports as typeof runtime
  }
  runtime = load(options.runtimeSource ?? readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime.ts'), 'utf8'))
  const source = options.mode === 'verify'
    ? options.verifierSource ?? readFileSync(path.resolve('scripts/controlled-fresh-candidate-strict-verifier.ts'), 'utf8')
    : options.launcherSource ?? readFileSync(path.resolve('scripts/controlled-fresh-candidate-launcher.ts'), 'utf8')
  const entry = load(source)
  const run = entry[options.mode === 'verify' ? 'runControlledFreshCandidateStrictVerifier' : 'runControlledFreshCandidateLauncher']
  const confirmation = options.mode === 'verify' ? '--confirm-controlled-fresh-candidate-strict-read-only-verification' : '--confirm-controlled-fresh-candidate-one-shot-execution'
  const code = await run([`--operation=${operationId}`, confirmation] as never)
  return { code, startedAt, deadlineAt, clock, scopes, runtimeEnteredAt, cleanupRemaining, output, budgets }
}

function assertAnchored(state: Awaited<ReturnType<typeof deadlineFixture>>): void {
  assert.equal(state.scopes.length, 1)
  assert.equal(state.scopes[0].inherited, state.startedAt + 45_000)
  assert.equal(state.scopes[0].terminal, state.startedAt + 45_000)
}

function packageResult(directory: string): ControlledFreshCandidateOperationPackageResult {
  return Object.freeze({
    operationId,
    manifestPath: path.join(directory, 'runtime-input.json'),
    receiptPath: path.join(directory, 'private-receipt.json'),
    observationPath: path.join(directory, 'observation.json'),
    authorizationPath: path.join(directory, 'owner-authorization.json'),
    candidateDigest,
    packageDigest,
    runtimeCommitIdentity: commit,
    environmentIdentity,
    expiresAt: '2026-09-14T10:20:00.000Z',
    eligibleForPublishing: false,
  })
}

async function main(): Promise<void> {
  {
    const state = await deadlineFixture()
    assert.equal(state.code, 0)
    assertAnchored(state)
    assert.equal(state.deadlineAt - state.runtimeEnteredAt!, 31_000, '12s setup + 2s consumption leaves 31s, not 33s')
    assert.equal(state.cleanupRemaining, 6_000)
    assert.equal(state.clock - state.startedAt, 44_000)
    assert.equal(JSON.parse(state.output[0]).runtimeBudget.completionCertainty, 'OBSERVED')
    const scopeExpiry = await deadlineFixture({ expireAtScopeEntry: true })
    assert.equal(scopeExpiry.code, 2)
    assert.equal(scopeExpiry.scopes.length, 0)
    assert.equal(JSON.parse(scopeExpiry.output[0]).runtimeBudget.completionCertainty, 'UNKNOWN')
    const exhausted = await deadlineFixture({ consumption: 33_000 })
    assert.equal(exhausted.code, 3)
    assert.deepEqual(exhausted.scopes, [], 'exhausted consumption refuses before runtime initialization/mutation')
    assert.equal(JSON.parse(exhausted.output[0]).status, 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED')
    assert.equal(JSON.parse(exhausted.output[0]).runtimeBudget.completionCertainty, 'UNKNOWN')
    const cleanup = await deadlineFixture({ cleanup: 7_000 })
    assertAnchored(cleanup)
    assert.equal(cleanup.code, 1)
    assert.equal(cleanup.cleanupRemaining, 6_000)
    assert.equal(JSON.parse(cleanup.output[0]).status, 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED')
    const uncertain = await deadlineFixture({ verdict: 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED' })
    assert.equal(uncertain.code, 3)
    assert.equal(JSON.parse(uncertain.output[0]).runtimeBudget.completionCertainty, 'UNKNOWN')
    const strict = await deadlineFixture({ mode: 'verify' })
    assert.equal(strict.code, 0)
    assertAnchored(strict)
    assert.equal(JSON.parse(strict.output[0]).runtimeBudget.completionCertainty, 'OBSERVED')
    const strictUnknown = await deadlineFixture({ mode: 'verify', verdict: 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED' })
    assert.equal(strictUnknown.code, 4)
    assertAnchored(strictUnknown)
    assert.equal(JSON.parse(strictUnknown.output[0]).runtimeBudget.completionCertainty, 'UNKNOWN')
    const launcherSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-launcher.ts'), 'utf8')
    const runtimeSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime.ts'), 'utf8')
    const verifierSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-strict-verifier.ts'), 'utf8')
    await assert.rejects(async () => assertAnchored(await deadlineFixture({ launcherSource: launcherSource.replace('      deadlineAt,', '      operationTimeoutMs: 33_000,') })), /Assertion/u,
      'mutation control detects the old 47-second allowance')
    await assert.rejects(async () => assertAnchored(await deadlineFixture({ runtimeSource: runtimeSource.replaceAll('createControlledFreshCandidateOperationScope({ deadlineAt })',
      'createControlledFreshCandidateOperationScope({ timeoutMs: 33_000, totalTimeoutMs: 33_000 })') })), /Assertion/u,
      'mutation control detects runtime duration re-anchoring')
    await assert.rejects(async () => assertAnchored(await deadlineFixture({ mode: 'verify', verifierSource: verifierSource.replace('createControlledFreshCandidateOperationScope({ deadlineAt })',
      'createControlledFreshCandidateOperationScope({ timeoutMs: 33_000, totalTimeoutMs: 33_000 })') })), /Assertion/u)
    const runtimeMutant = runtimeSource.replace('if (!knownSuccess && !provenLocalRefusal) budget.markUncertain()', '')
    const mutated = await deadlineFixture({ verdict: 'CREATION_FINALIZATION_UNCERTAIN_RECOVERY_REQUIRED', runtimeSource: runtimeMutant })
    assert.throws(() => assert.equal(JSON.parse(mutated.output[0]).runtimeBudget.completionCertainty, 'UNKNOWN'), /Assertion/u,
      'mutation control detects removal of runtime uncertainty propagation')
    const verifierMutant = verifierSource.replace('const result = finalizeControlledFreshCandidateRuntimeReport(report, budget)', 'const result = { ...report, runtimeBudget: budget.report() }')
    const mutatedVerifier = await deadlineFixture({ mode: 'verify', verdict: 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED', verifierSource: verifierMutant })
    assert.throws(() => assert.equal(JSON.parse(mutatedVerifier.output[0]).runtimeBudget.completionCertainty, 'UNKNOWN'), /Assertion/u,
      'mutation control detects strict-entry propagation bypass')
  }
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const trusted = publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
  const now = Date.now()
  const unsigned: Omit<ControlledFreshCandidateReleaseAttestation, 'signature'> = {
    version: CONTROLLED_FRESH_CANDIDATE_RELEASE_ATTESTATION_VERSION, sourceCommit: commit,
    vercelProject: CONTROLLED_FRESH_CANDIDATE_VERCEL_PROJECT, deploymentId: 'dpl_SYNTHETICONLY0001',
    environment: 'Production', state: 'READY', canonicalAlias: CONTROLLED_FRESH_CANDIDATE_CANONICAL_ALIAS,
    issuedAt: new Date(now - 2_000).toISOString(), verifiedAt: new Date(now - 1_000).toISOString(), expiresAt: new Date(now + 60_000).toISOString(),
    operationId, packageDigest, authorizationIdentity: 'synthetic-owner-identity', authorizationDigest: 'd'.repeat(64),
  }
  const evidence = { ...unsigned, signature: sign(null, controlledFreshCandidateReleaseSigningBytes(unsigned), privateKey).toString('base64') }
  const expected = { sourceCommit: commit, operationId, packageDigest, authorizationIdentity: unsigned.authorizationIdentity, authorizationDigest: unsigned.authorizationDigest, now }
  assert.equal(authenticateControlledFreshCandidateReleaseAttestation(evidence, trusted, expected).sourceCommit, commit)
  for (const [key, value] of Object.entries({ sourceCommit: 'e'.repeat(40), vercelProject: 'foreign-project', deploymentId: '',
    environment: 'Preview', state: 'BUILDING', canonicalAlias: 'foreign.invalid', issuedAt: new Date(now + 1).toISOString(), verifiedAt: new Date(now + 1).toISOString(),
    expiresAt: new Date(now).toISOString(), packageDigest: 'e'.repeat(64), operationId: 'foreign-operation', authorizationIdentity: 'foreign-owner', authorizationDigest: 'f'.repeat(64), signature: 'a'.repeat(88) })) {
    assert.throws(() => authenticateControlledFreshCandidateReleaseAttestation({ ...evidence, [key]: value }, trusted, expected), /ATTESTATION_INVALID/u)
  }
  const otherTrust = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  assert.throws(() => authenticateControlledFreshCandidateReleaseAttestation(evidence, otherTrust, expected), /ATTESTATION_INVALID/u)
  assert.throws(() => authenticateControlledFreshCandidateReleaseAttestation(null, trusted, expected), /ATTESTATION_INVALID/u)
  if (process.platform === 'linux') {
    const nativeRoot = process.env.CFC_POSIX_TEST_NATIVE_ROOT ?? tmpdir()
    assert.ok(path.isAbsolute(nativeRoot) && !nativeRoot.startsWith('/mnt/') && !nativeRoot.startsWith(process.cwd()))
    const root = mkdtempSync(path.join(nativeRoot, 'cfc-release-boundary-'))
    chmodSync(root, 0o700)
    const directory = path.join(root, 'operations-v1', operationId)
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    const owner = createControlledFreshCandidateOwnerAuthorization({ operationId, packageDigest, candidateDigest,
      runtimeCommitIdentity: commit, environmentIdentity, issuedAt: unsigned.issuedAt, notBefore: unsigned.issuedAt,
      expiresAt: unsigned.expiresAt, key })
    const ownerBytes = JSON.stringify(Object.fromEntries(Object.entries(owner).sort(([a], [b]) => a.localeCompare(b))))
    const boundUnsigned = { ...unsigned, authorizationIdentity: owner.authorizationIdentity,
      authorizationDigest: createHash('sha256').update(ownerBytes).digest('hex') }
    const boundEvidence = { ...boundUnsigned, signature: sign(null, controlledFreshCandidateReleaseSigningBytes(boundUnsigned), privateKey).toString('base64') }
    const canonical = (value: unknown) => JSON.stringify(Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))))
    try {
      writeFileSync(path.join(root, 'release-trust.json'), canonical({ version: 'controlled-fresh-candidate-release-trust/v1', ed25519PublicKeyDerBase64: trusted }), { mode: 0o600 })
      writeFileSync(path.join(directory, 'owner-authorization.json'), ownerBytes, { mode: 0o600 })
      writeFileSync(path.join(directory, 'owner-authorization.consumed.json'), ownerBytes, { mode: 0o600 })
      writeFileSync(path.join(directory, 'release-attestation.json'), canonical(boundEvidence), { mode: 0o600 })
      const input = { packageResult: packageResult(directory), authorizationState: 'available' as const, timeoutMs: 2_000, testOnlyLedgerRoot: root }
      assert.equal((await loadControlledFreshCandidateReleaseAttestation(input)).sourceCommit, commit)
      assert.equal((await loadControlledFreshCandidateReleaseAttestation({ ...input, authorizationState: 'consumed' })).sourceCommit, commit)
      await assert.rejects(loadControlledFreshCandidateReleaseAttestation({ ...input, timeoutMs: 0 }), /ATTESTATION_INVALID/u)
      await assert.rejects(loadControlledFreshCandidateReleaseAttestation({ ...input, packageResult: { ...input.packageResult, operationId: '../foreign' } }), /ATTESTATION_INVALID/u)
      writeFileSync(path.join(directory, 'release-attestation.json'), canonical({ ...boundEvidence, state: 'BUILDING' }), { mode: 0o600 })
      await assert.rejects(loadControlledFreshCandidateReleaseAttestation(input), /ATTESTATION_INVALID/u)
    } finally { rmSync(root, { recursive: true, force: true }) }
  }
  const importedLauncher = await import('./controlled-fresh-candidate-launcher')
  const importedVerifier = await import('./controlled-fresh-candidate-strict-verifier')
  assert.equal(typeof importedLauncher.runControlledFreshCandidateLauncher, 'function')
  assert.equal(typeof importedVerifier.runControlledFreshCandidateStrictVerifier, 'function')
  const authorization = createControlledFreshCandidateOwnerAuthorization({
    operationId,
    packageDigest,
    candidateDigest,
    runtimeCommitIdentity: commit,
    environmentIdentity,
    issuedAt,
    notBefore: issuedAt,
    expiresAt: '2026-09-14T10:20:00.000Z',
    key,
  })
  assert.equal(authorization.runtimeBudgetIdentity, CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY)
  assert.equal(validateControlledFreshCandidateOwnerAuthorization(authorization, {
    key,
    observedAt: Date.parse('2026-09-14T10:01:00.000Z'),
    expected: { operationId, packageDigest, candidateDigest, runtimeCommitIdentity: commit, environmentIdentity },
  }), true)
  assert.equal(validateControlledFreshCandidateOwnerAuthorization(authorization, {
    key,
    observedAt: Date.parse('2026-09-14T10:20:00.000Z'),
  }), false)
  assert.equal(validateControlledFreshCandidateOwnerAuthorization(authorization, {
    key,
    observedAt: Date.parse('2026-09-14T10:01:00.000Z'),
    expected: { packageDigest: 'd'.repeat(64) },
  }), false)
  assert.equal(validateControlledFreshCandidateOwnerAuthorization({ ...authorization, seal: 'invalid' }, {
    key,
    observedAt: Date.parse('2026-09-14T10:01:00.000Z'),
  }), false)

  const launcherSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-launcher.ts'), 'utf8')
  const verifierSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-strict-verifier.ts'), 'utf8')
  for (const source of [launcherSource, verifierSource]) {
    const body = source.slice(source.indexOf('    const packageResult ='))
    assert.ok(body.indexOf('await loadControlledFreshCandidateReleaseAttestation') < body.indexOf('loadControlledFreshCandidateConfigurationEnvironment('))
    assert.ok(body.includes('deployedCommitIdentity: releaseAttestation.sourceCommit'))
  }
  assert.ok(launcherSource.indexOf('buildControlledFreshCandidateExecutionEnvironment') < launcherSource.indexOf('consumeControlledFreshCandidateOwnerAuthorization(packageResult)'))
  assert.ok(launcherSource.indexOf('consumeControlledFreshCandidateOwnerAuthorization(packageResult)') < launcherSource.indexOf('runControlledFreshCandidateRuntime({'))
  assert.equal(/(?:eval|Function|--loader|clientFactory|socket|callback)/u.test(launcherSource), false)
  assert.equal(verifierSource.includes('runControlledFreshCandidateRuntime'), false)

  if (process.platform === 'linux') {
    const directory = mkdtempSync(path.join(process.env.HOME ?? tmpdir(), '.local/share/cfc-owner-auth-replay-'))
    chmodSync(directory, 0o700)
    try {
      const result = packageResult(directory)
      writeFileSync(result.authorizationPath, JSON.stringify(authorization), { mode: 0o600, flag: 'wx' })
      consumeControlledFreshCandidateOwnerAuthorization(result)
      assert.throws(() => consumeControlledFreshCandidateOwnerAuthorization(result), /REPLAY|ENOENT/u)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  console.log('controlledFreshCandidateLauncher: ALL OK')
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
