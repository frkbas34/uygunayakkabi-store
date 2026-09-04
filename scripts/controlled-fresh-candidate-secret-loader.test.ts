import assert from 'node:assert/strict'
import {
  appendFileSync,
  chmodSync,
  closeSync,
  linkSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

import {
  CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL,
  CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST,
  CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY,
  ControlledFreshCandidateConfigurationError,
  buildControlledFreshCandidateConfigurationEnvironment,
  readControlledFreshCandidatePersistentSecrets,
  validateControlledFreshCandidateEmptyLedger,
} from './controlled-fresh-candidate-secret-loader'
import {
  CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT,
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
} from './controlled-fresh-candidate-runtime-resources'

const SYNTHETIC_COMMIT = 'a'.repeat(40)
const SYNTHETIC_AUTHORIZATION_KEY = Buffer.alloc(32, 11).toString('base64')
const SYNTHETIC_RECEIPT_KEY = Buffer.alloc(32, 12).toString('base64')
const SYNTHETIC_DATABASE = 'postgres://synthetic.invalid/offline'
const SYNTHETIC_PAYLOAD = 'literal-$(not-executed)-${HOME};offline'
const SYNTHETIC_BLOB = 'synthetic-blob-token-offline'

const canonicalValues = {
  [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: SYNTHETIC_AUTHORIZATION_KEY,
  [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: SYNTHETIC_RECEIPT_KEY,
  DATABASE_URI: SYNTHETIC_DATABASE,
  PAYLOAD_SECRET: SYNTHETIC_PAYLOAD,
  BLOB_READ_WRITE_TOKEN: SYNTHETIC_BLOB,
}

function serialize(overrides: Record<string, string> = {}, omit?: string): Buffer {
  const values = { ...canonicalValues, ...overrides } as Record<string, string>
  const names = CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST.filter((name) => name !== omit)
  return Buffer.from(`${names.map((name) => `${name}=${values[name]}`).join('\n')}\n`, 'utf8')
}

function expectConfigurationError(action: () => unknown): ControlledFreshCandidateConfigurationError {
  try {
    action()
  } catch (error) {
    assert.ok(error instanceof ControlledFreshCandidateConfigurationError)
    return error
  }
  assert.fail('expected controlled configuration failure')
}

function main(): void {
  if (process.platform !== 'linux') {
    console.log('controlledFreshCandidateSecretLoader: SKIPPED_NON_LINUX')
    return
  }
  const root = mkdtempSync('/home/w11/.local/share/cfc-secret-loader-test-')
  chmodSync(root, 0o700)
  const secretPath = path.join(root, 'runtime-secrets.env')
  const linkedPath = path.join(root, 'linked.env')
  const oldPath = path.join(root, 'old.env')
  const markerPath = path.join(root, 'must-not-exist')
  const writeCanonical = (bytes: Buffer = serialize()) => {
    rmSync(secretPath, { force: true })
    rmSync(linkedPath, { force: true })
    rmSync(oldPath, { force: true })
    writeFileSync(secretPath, bytes, { mode: 0o600 })
    chmodSync(secretPath, 0o600)
  }
  try {
    writeCanonical()
    const secrets = readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath })
    assert.deepEqual(Object.keys(secrets), [...CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST])
    assert.equal(secrets.PAYLOAD_SECRET, SYNTHETIC_PAYLOAD)
    assert.equal(rmSync(markerPath, { force: true }), undefined)

    writeCanonical()
    let successfulReadCloseCalls = 0
    const cleanupFailure = expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: {
        closeHandle: (handle) => {
          successfulReadCloseCalls += 1
          closeSync(handle)
          throw new Error(`${SYNTHETIC_PAYLOAD}:${secretPath}:raw-close-failure`)
        },
      },
    }))
    assert.equal(cleanupFailure.code, 'CONTROLLED_CONFIGURATION_FILE_CLEANUP_UNCERTAIN')
    assert.equal(successfulReadCloseCalls, 1)
    assert.equal(cleanupFailure.message.includes(SYNTHETIC_PAYLOAD), false)
    assert.equal(cleanupFailure.message.includes(secretPath), false)

    writeCanonical(Buffer.from('not-an-assignment\n'))
    let authoritativeFailureCloseCalls = 0
    const authoritativeFailure = expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: {
        closeHandle: (handle) => {
          authoritativeFailureCloseCalls += 1
          closeSync(handle)
          throw new Error(`${SYNTHETIC_PAYLOAD}:${secretPath}:raw-close-failure`)
        },
      },
    }))
    assert.equal(authoritativeFailure.code, 'CONTROLLED_CONFIGURATION_FORMAT_INVALID')
    assert.equal(authoritativeFailureCloseCalls, 1)
    assert.equal(authoritativeFailure.message.includes(SYNTHETIC_PAYLOAD), false)
    assert.equal(authoritativeFailure.message.includes(secretPath), false)

    const child = buildControlledFreshCandidateConfigurationEnvironment({
      secrets,
      deployedCommitIdentity: SYNTHETIC_COMMIT,
    })
    assert.equal(Object.getPrototypeOf(child), null)
    assert.equal(Object.keys(child).length, 11)
    assert.equal(child.UNRELATED_AMBIENT_SECRET, undefined)
    assert.equal(child.NODE_OPTIONS, undefined)
    assert.equal(child.LD_PRELOAD, undefined)
    assert.equal(child.HTTPS_PROXY, undefined)
    assert.equal(child.PATH, undefined)
    assert.equal(child[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV], SYNTHETIC_COMMIT)
    assert.equal(child[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV], CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY)
    assert.equal(child[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV], CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT)
    assert.equal(child.NEXT_PUBLIC_SERVER_URL, CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL)
    assert.equal(child.PAYLOAD_DB_PUSH, 'false')
    assert.equal(child.PAYLOAD_DROP_DATABASE, 'false')
    assert.equal(rmSync(markerPath, { force: true }), undefined)

    chmodSync(secretPath, 0o640)
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical()
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: { expectedUid: process.getuid!() + 1 },
    }))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: { expectedGid: process.getgid!() + 1 },
    }))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: { observedFilesystemType: 0x01021994n },
    }))

    writeCanonical()
    renameSync(secretPath, oldPath)
    symlinkSync(oldPath, secretPath)
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    rmSync(secretPath)
    renameSync(oldPath, secretPath)

    linkSync(secretPath, linkedPath)
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    rmSync(linkedPath)

    writeCanonical()
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: { afterOpen: () => linkSync(secretPath, linkedPath) },
    }))
    rmSync(linkedPath)

    writeCanonical()
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: {
        afterOpen: () => {
          renameSync(secretPath, oldPath)
          writeFileSync(secretPath, serialize(), { mode: 0o600 })
        },
      },
    }))
    rmSync(oldPath)

    writeCanonical()
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: { afterOpen: () => truncateSync(secretPath, 1) },
    }))
    writeCanonical()
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({
      testOnlySecretPath: secretPath,
      testOnly: { afterOpen: () => appendFileSync(secretPath, 'x') },
    }))

    writeCanonical(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), serialize()]))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(Buffer.from([0xc3, 0x28]))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(Buffer.concat([serialize(), Buffer.from([0])]))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(Buffer.concat([serialize(), Buffer.from(`DATABASE_URI=${SYNTHETIC_DATABASE}\n`)]))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(Buffer.concat([serialize(), Buffer.from('UNEXPECTED_KEY=value\n')]))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(serialize({}, 'DATABASE_URI'))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(serialize({ DATABASE_URI: '' }))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(Buffer.from('not-an-assignment\n'))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(serialize({ [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: 'not-base64!' }))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(serialize({ [CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]: Buffer.alloc(31, 1).toString('base64') }))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))
    writeCanonical(serialize({ [CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]: SYNTHETIC_AUTHORIZATION_KEY }))
    expectConfigurationError(() => readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: secretPath }))

    writeCanonical()
    expectConfigurationError(() => validateControlledFreshCandidateEmptyLedger({ testOnlyLedgerRoot: root }))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }

  const ledgerRoot = mkdtempSync('/home/w11/.local/share/cfc-empty-ledger-test-')
  chmodSync(ledgerRoot, 0o700)
  try {
    assert.equal(validateControlledFreshCandidateEmptyLedger({ testOnlyLedgerRoot: ledgerRoot }), true)
    writeFileSync(path.join(ledgerRoot, 'unexpected'), 'x', { mode: 0o600 })
    expectConfigurationError(() => validateControlledFreshCandidateEmptyLedger({ testOnlyLedgerRoot: ledgerRoot }))
  } finally {
    rmSync(ledgerRoot, { recursive: true, force: true })
  }

  const output = JSON.stringify({ code: expectConfigurationError(() => {
    buildControlledFreshCandidateConfigurationEnvironment({
      secrets: canonicalValues,
      deployedCommitIdentity: 'legacy',
    })
  }).code })
  for (const secret of Object.values(canonicalValues)) assert.equal(output.includes(secret), false)
  assert.equal(output.includes(SYNTHETIC_COMMIT), false)
  console.log('controlledFreshCandidateSecretLoader: ALL OK')
}

main()
