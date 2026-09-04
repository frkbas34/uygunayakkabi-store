import assert from 'node:assert/strict'
import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
} from './controlled-fresh-candidate-runtime-resources'
import {
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST,
  controlledFreshCandidateSecretReadiness,
  parseControlledFreshCandidateSecretReadinessArgs,
  runControlledFreshCandidateSecretReadiness,
} from './controlled-fresh-candidate-secret-contract'
import {
  CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY,
  buildControlledFreshCandidateConfigurationEnvironment,
  buildControlledFreshCandidateExecutionEnvironment,
} from './controlled-fresh-candidate-secret-loader'
import {
  CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_VERSION,
  CONTROLLED_FRESH_CANDIDATE_PACKAGE_CONFIRMATION,
  ControlledFreshCandidatePackagePreparationError,
  parseControlledFreshCandidatePackageBuilderArgs,
  prepareControlledFreshCandidatePackage,
  runControlledFreshCandidatePackageBuilder,
} from './controlled-fresh-candidate-package-builder'
import { parseControlledFreshCandidateObserverArgs } from './controlled-fresh-candidate-observer'

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [
    key,
    stableValue((value as Record<string, unknown>)[key]),
  ]))
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

async function nativePackageTests(): Promise<void> {
  if (process.platform !== 'linux') return
  const root = mkdtempSync('/home/w11/.local/share/cfc-readiness-test-')
  chmodSync(root, 0o700)
  const authorizationKey = Buffer.alloc(32, 111)
  const receiptKey = Buffer.alloc(32, 112)
  const originalPath = path.join(root, 'original.png')
  const inputPath = path.join(root, 'owner-input.json')
  const sharp = (await import('sharp')).default
  const png = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).png().toBuffer()
  writeFileSync(originalPath, png, { mode: 0o600 })
  const now = Date.now()
  const ownerInput = {
    version: CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_VERSION,
    manifestIdentity: 'synthetic-manifest-0001',
    title: 'Synthetic offline package candidate',
    positivePrice: 1,
    provenanceStatement: 'Synthetic offline package-builder evidence only.',
    stockCandidate: 'SN9001',
    originalPath,
    originalMimeType: 'image/png',
    originalWidth: 1,
    originalHeight: 1,
    issuedAt: new Date(now - 1_000).toISOString(),
    notBefore: new Date(now - 1_000).toISOString(),
    expiresAt: new Date(now + 5 * 60_000).toISOString(),
  }
  writeFileSync(inputPath, canonicalJson(ownerInput), { mode: 0o600 })
  const environment = {
    [CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV]: root,
    [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: authorizationKey.toString('base64'),
    [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: receiptKey.toString('base64'),
    [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: '5daecabf304709c4106616c52fe971e315305dfb',
    [CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]: CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY,
    [CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH_ENV]: inputPath,
  } as NodeJS.ProcessEnv
  const previousFlag = process.env.CFC_NATIVE_EXT4_TEST_ONLY
  process.env.CFC_NATIVE_EXT4_TEST_ONLY = '1'
  try {
    const operationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const prepared = await prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => operationId,
      testOnlyLedgerRoot: root,
    })
    assert.equal(prepared.operationId, operationId)
    assert.equal(prepared.eligibleForPublishing, false)
    assert.equal(lstatSync(prepared.manifestPath).mode & 0o777, 0o600)
    assert.equal(lstatSync(prepared.observationPath).mode & 0o777, 0o600)
    assert.equal(lstatSync(path.dirname(prepared.manifestPath)).mode & 0o777, 0o700)
    assert.equal(lstatSync(prepared.receiptPath, { throwIfNoEntry: false }), undefined)
    const privateManifest = readFileSync(prepared.manifestPath, 'utf8')
    assert.equal(privateManifest.includes(authorizationKey.toString('base64')), false)
    assert.equal(privateManifest.includes(receiptKey.toString('base64')), false)
    assert.equal(privateManifest.includes('productId'), false)
    assert.equal(privateManifest.includes('mediaId'), false)

    const configurationEnvironment = buildControlledFreshCandidateConfigurationEnvironment({
      secrets: {
        [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: authorizationKey.toString('base64'),
        [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: receiptKey.toString('base64'),
        DATABASE_URI: 'postgres://synthetic.invalid/readiness-test',
        PAYLOAD_SECRET: 'synthetic-payload-secret',
        BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
      },
      deployedCommitIdentity: environment[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV] as string,
    })
    const executionEnvironment = await buildControlledFreshCandidateExecutionEnvironment({
      configurationEnvironment,
      packageResult: prepared,
      now,
      testOnlyLedgerRoot: root,
    })
    const executionReady = controlledFreshCandidateSecretReadiness(executionEnvironment, {
      stage: 'execution',
      ledgerReady: true,
      operationPackageAuthenticated: true,
    })
    assert.equal(executionReady.executionReady, true)
    assert.equal(executionReady.readyForSelectedStage, true)
    assert.equal(executionReady.packagePrepared, true)
    assert.equal(executionReady.authorizationCreated, true)
    assert.equal(executionReady.eligibleForPublishing, false)
    await assert.rejects(() => buildControlledFreshCandidateExecutionEnvironment({
      configurationEnvironment,
      packageResult: {
        ...prepared,
        receiptPath: path.join(root, 'operations-v1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'private-receipt.json'),
      },
      now,
      testOnlyLedgerRoot: root,
    }))

    const expiredOperationId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    writeFileSync(inputPath, canonicalJson({
      ...ownerInput,
      issuedAt: new Date(now - 60_000).toISOString(),
      notBefore: new Date(now - 60_000).toISOString(),
      expiresAt: new Date(now).toISOString(),
    }), { mode: 0o600 })
    await assert.rejects(() => prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => expiredOperationId,
      testOnlyLedgerRoot: root,
    }), (error: unknown) => {
      assert.ok(error instanceof ControlledFreshCandidatePackagePreparationError)
      assert.equal(error.partialOperation, false)
      assert.equal(error.operationId, null)
      return true
    })
    assert.equal(lstatSync(
      path.join(root, 'operations-v1', expiredOperationId),
      { throwIfNoEntry: false },
    ), undefined)
    writeFileSync(inputPath, canonicalJson(ownerInput), { mode: 0o600 })
    const partialOperationId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    await assert.rejects(() => prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => partialOperationId,
      testOnlyLedgerRoot: root,
      testOnlyBeforeFinalManifestWrite: () => { throw new Error('synthetic_final_manifest_write_failure') },
    }), (error: unknown) => {
      assert.ok(error instanceof ControlledFreshCandidatePackagePreparationError)
      assert.equal(error.partialOperation, true)
      assert.equal(error.operationId, partialOperationId)
      return true
    })
    const partialOperationPath = path.join(root, 'operations-v1', partialOperationId)
    assert.notEqual(lstatSync(path.join(partialOperationPath, 'observation.json'), { throwIfNoEntry: false }), undefined)
    assert.equal(lstatSync(path.join(partialOperationPath, 'runtime-input.json'), { throwIfNoEntry: false }), undefined)
    await assert.rejects(() => prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => operationId,
      testOnlyLedgerRoot: root,
    }))

    const linkedInput = { ...ownerInput, originalPath: path.join(root, 'linked-original.png') }
    symlinkSync(originalPath, linkedInput.originalPath)
    writeFileSync(inputPath, canonicalJson(linkedInput), { mode: 0o600 })
    await assert.rejects(() => prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      testOnlyLedgerRoot: root,
    }))

    rmSync(linkedInput.originalPath)
    const hardLinkedPath = path.join(root, 'hard-linked-original.png')
    linkSync(originalPath, hardLinkedPath)
    writeFileSync(inputPath, canonicalJson({ ...ownerInput, originalPath: hardLinkedPath }), { mode: 0o600 })
    await assert.rejects(() => prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      testOnlyLedgerRoot: root,
    }))

    writeFileSync(inputPath, canonicalJson(ownerInput), { mode: 0o600 })
    chmodSync(originalPath, 0o640)
    await assert.rejects(() => prepareControlledFreshCandidatePackage({
      environment,
      now: () => now,
      operationId: () => 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      testOnlyLedgerRoot: root,
    }))
  } finally {
    if (previousFlag === undefined) delete process.env.CFC_NATIVE_EXT4_TEST_ONLY
    else process.env.CFC_NATIVE_EXT4_TEST_ONLY = previousFlag
    rmSync(root, { recursive: true, force: true })
  }
}

async function main(): Promise<void> {
  const secret = 'do-not-disclose-secret-value'
  const environment = buildControlledFreshCandidateConfigurationEnvironment({
    secrets: {
      [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: Buffer.alloc(32, 31).toString('base64'),
      [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: Buffer.alloc(32, 32).toString('base64'),
      DATABASE_URI: 'postgres://synthetic.invalid/readiness',
      PAYLOAD_SECRET: secret,
      BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
    },
    deployedCommitIdentity: 'c'.repeat(40),
  })
  const report = controlledFreshCandidateSecretReadiness(environment, { stage: 'configuration', ledgerReady: true })
  assert.equal(report.configurationReady, true)
  assert.equal(report.executionReady, false)
  assert.equal(report.readyForSelectedStage, true)
  assert.equal(report.candidateSelected, false)
  assert.equal(report.packagePrepared, false)
  assert.equal(report.authorizationCreated, false)
  assert.equal(report.eligibleForPublishing, false)
  for (const name of [
    'CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH',
    'CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH',
    'CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH',
  ] as const) {
    assert.equal(report.variables[name].presence, 'ABSENT')
    assert.equal(report.variables[name].requirement, 'NOT_REQUIRED')
  }
  assert.equal(JSON.stringify(report).includes(secret), false)

  const absent = controlledFreshCandidateSecretReadiness({}, { stage: 'configuration', ledgerReady: false })
  assert.equal(absent.configurationReady, false)
  assert.ok(Object.values(absent.variables).every((value) => value.presence === 'ABSENT'))
  const empty = controlledFreshCandidateSecretReadiness(Object.fromEntries(
    CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.map((name) => [name, '']),
  ), { stage: 'execution', ledgerReady: true, operationPackageAuthenticated: true })
  assert.ok(Object.values(empty.variables).every((value) => value.presence === 'PRESENT_EMPTY'))
  assert.equal(empty.executionReady, false)

  const additional = controlledFreshCandidateSecretReadiness({ ...environment, UNEXPECTED: secret }, {
    stage: 'configuration',
    ledgerReady: true,
  })
  assert.equal(additional.configurationReady, false)
  assert.equal(additional.additionalVariablesPresent, true)
  const unsafeFlags = controlledFreshCandidateSecretReadiness({ ...environment, PAYLOAD_DB_PUSH: 'true' }, {
    stage: 'configuration',
    ledgerReady: true,
  })
  assert.equal(unsafeFlags.configurationReady, false)
  const mutatedIdentity = controlledFreshCandidateSecretReadiness({
    ...environment,
    [CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]: 'caller-controlled',
  }, { stage: 'configuration', ledgerReady: true })
  assert.equal(mutatedIdentity.configurationReady, false)
  const commitMismatch = controlledFreshCandidateSecretReadiness({
    ...environment,
    [CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]: 'legacy',
  }, { stage: 'configuration', ledgerReady: true })
  assert.equal(commitMismatch.configurationReady, false)

  const readinessOutput: string[] = []
  assert.equal(runControlledFreshCandidateSecretReadiness({
    argv: ['--readiness', '--stage=configuration'],
    environment: {},
    ledgerReady: false,
    write: (text) => readinessOutput.push(text),
  }), 3)
  assert.equal(readinessOutput.join('').includes(secret), false)
  assert.equal(runControlledFreshCandidateSecretReadiness({
    argv: ['--help'], environment: {}, ledgerReady: false, write: () => undefined,
  }), 0)
  assert.equal(runControlledFreshCandidateSecretReadiness({
    argv: ['--readiness', secret], environment: {}, ledgerReady: false, write: () => undefined,
  }), 2)
  assert.deepEqual(parseControlledFreshCandidateSecretReadinessArgs(['--readiness']), { ok: false })
  assert.deepEqual(parseControlledFreshCandidateSecretReadinessArgs(['--readiness', '--stage=legacy']), { ok: false })

  assert.deepEqual(parseControlledFreshCandidatePackageBuilderArgs(['--help']), { ok: true, help: true, mode: null })
  assert.deepEqual(parseControlledFreshCandidatePackageBuilderArgs(['--readiness']), { ok: true, help: false, mode: 'readiness' })
  assert.deepEqual(parseControlledFreshCandidatePackageBuilderArgs(['--synthetic-dry-run']), { ok: true, help: false, mode: 'synthetic-dry-run' })
  assert.deepEqual(parseControlledFreshCandidatePackageBuilderArgs(['--prepare', CONTROLLED_FRESH_CANDIDATE_PACKAGE_CONFIRMATION]), { ok: true, help: false, mode: 'prepare' })
  assert.deepEqual(parseControlledFreshCandidatePackageBuilderArgs(['--prepare']), { ok: false })
  assert.deepEqual(parseControlledFreshCandidatePackageBuilderArgs(['--prepare', secret]), { ok: false })
  assert.deepEqual(parseControlledFreshCandidateObserverArgs(['--observe', '--operation=11111111-1111-4111-8111-111111111111']), {
    ok: true,
    help: false,
    operationId: '11111111-1111-4111-8111-111111111111',
  })
  assert.deepEqual(parseControlledFreshCandidateObserverArgs(['--observe', `--key=${secret}`]), { ok: false })

  const builderOutput: string[] = []
  assert.equal(await runControlledFreshCandidatePackageBuilder({
    argv: ['--readiness'],
    environment: {},
    write: (text) => builderOutput.push(text),
    writeError: (text) => builderOutput.push(text),
  }), 3)
  assert.equal(builderOutput.join('').includes(secret), false)
  assert.equal(await runControlledFreshCandidatePackageBuilder({ argv: ['--help'], environment: {}, write: () => undefined }), 0)

  const secretSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-secret-contract.ts'), 'utf8')
  const builderSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-package-builder.ts'), 'utf8')
  const observerSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-observer.ts'), 'utf8')
  for (const source of [secretSource, builderSource, observerSource]) {
    assert.equal(source.includes('dotenv'), false)
    assert.equal(source.includes('exec('), false)
    assert.equal(source.includes('spawn('), false)
    assert.equal(source.includes('fetch('), false)
    assert.equal(source.includes('console.log(process.env'), false)
    assert.equal(source.includes('JSON.stringify(process.env'), false)
  }
  assert.ok(builderSource.indexOf('writeControlledFreshCandidatePrivateFileExclusive({\n      destination: observationDestination')
    < builderSource.indexOf('destination: manifestDestination'))
  assert.equal(builderSource.includes('Product 349'), false)
  assert.equal(observerSource.includes('consume'), false)

  await nativePackageTests()
  console.log('controlledFreshCandidateReadiness: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
