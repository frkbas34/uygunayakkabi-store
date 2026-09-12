import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  chmodSync,
  closeSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

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
const SYNTHETIC_DATABASE = 'postgresql://synthetic-user:synthetic-password@synthetic.invalid/offline'
const SYNTHETIC_PAYLOAD = 'literal-$(not-executed)-${HOME};offline'
const SYNTHETIC_BLOB = 'synthetic-blob-token-offline'
const VALID_DATABASE_URIS = Object.freeze([
  SYNTHETIC_DATABASE,
  `${SYNTHETIC_DATABASE}?channel_binding=require`,
  `${SYNTHETIC_DATABASE}?sslmode=verify-full`,
  `${SYNTHETIC_DATABASE}?channel_binding=require&sslmode=verify-full`,
  `${SYNTHETIC_DATABASE}?sslmode=verify-full&channel_binding=require`,
])

const ENCODED_PROHIBITED_COMPONENTS = Object.freeze({
  tab: '%09',
  carriageReturn: '%0D',
  lineFeed: '%0A',
  nul: '%00',
  unicodeWhitespace: '%E2%80%83',
  zeroWidthFormat: '%E2%80%8B',
})

const INVALID_DATABASE_URIS = Object.freeze({
  encodedUsernameSpaces: 'postgresql://%20%20:pass@synthetic.invalid/offline',
  encodedPasswordSpaces: 'postgresql://user:%20%20@synthetic.invalid/offline',
  encodedDatabaseSpaces: 'postgresql://user:pass@synthetic.invalid/%20%20',
  encodedHostnameSpace: 'postgresql://user:pass@synthetic%20.invalid/offline',
  malformedUsernamePercent: 'postgresql://%ZZ:pass@synthetic.invalid/offline',
  malformedPasswordPercent: 'postgresql://user:%@synthetic.invalid/offline',
  malformedHostnamePercent: 'postgresql://user:pass@synthetic%.invalid/offline',
  malformedDatabasePercent: 'postgresql://user:pass@synthetic.invalid/%A',
  doubleEncodedUsernameSpace: 'postgresql://%2520:pass@synthetic.invalid/offline',
  doubleEncodedPasswordSpace: 'postgresql://user:%2520@synthetic.invalid/offline',
  doubleEncodedHostnameSpace: 'postgresql://user:pass@synthetic%2520.invalid/offline',
  doubleEncodedDatabaseSpace: 'postgresql://user:pass@synthetic.invalid/%2520',
  emptyUsername: 'postgresql://:pass@synthetic.invalid/offline',
  emptyPassword: 'postgresql://user:@synthetic.invalid/offline',
  emptyHostname: 'postgresql://user:pass@/offline',
  emptyDatabase: 'postgresql://user:pass@synthetic.invalid/',
  parserNormalizedUsernameAt: 'postgresql://user@tenant:pass@synthetic.invalid/offline',
  parserNormalizedUsernameBrace: 'postgresql://us{er:pass@synthetic.invalid/offline',
  parserNormalizedPasswordColon: 'postgresql://user:pa:ss@synthetic.invalid/offline',
  parserNormalizedHost: 'postgresql://user:pass@synthetic.invalid:/offline',
  fragment: 'postgresql://user:pass@synthetic.invalid/offline#fragment',
  emptyQuery: 'postgresql://user:pass@synthetic.invalid/offline?',
  unknownQuery: 'postgresql://user:pass@synthetic.invalid/offline?application_name=unexpected',
  credentialQuery: 'postgresql://user:pass@synthetic.invalid/offline?password=unexpected',
  emptyQueryValue: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=',
  duplicateQuery: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify-full&sslmode=verify-full',
  conflictingQuery: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify-full&sslmode=require',
  wrongQueryCase: 'postgresql://user:pass@synthetic.invalid/offline?SSLMODE=verify-full',
  encodedQueryName: 'postgresql://user:pass@synthetic.invalid/offline?ssl%6dode=verify-full',
  encodedQueryValue: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify%2dfull',
  encodedQuerySpace: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify%20full',
  encodedQueryTab: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify%09full',
  doubleEncodedQuerySpace: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify%2520full',
  malformedQueryPercent: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=%',
  prohibitedTlsMode: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=require',
  tooManyQueryPairs: 'postgresql://user:pass@synthetic.invalid/offline?sslmode=verify-full&channel_binding=require&extra=value',
  oversizedEncodedUsername: `postgresql://${'%61'.repeat(2_049)}:pass@synthetic.invalid/offline`,
  oversizedDecodedUsername: `postgresql://${'u'.repeat(2_049)}:pass@synthetic.invalid/offline`,
  oversizedEncodedHostname: `postgresql://user:pass@${'%61'.repeat(2_049)}/offline`,
  oversizedDecodedHostname: `postgresql://user:pass@${'h'.repeat(2_049)}/offline`,
  oversizedQueryName: `postgresql://user:pass@synthetic.invalid/offline?${'s'.repeat(2_049)}=verify-full`,
  oversizedQueryValue: `postgresql://user:pass@synthetic.invalid/offline?sslmode=${'v'.repeat(2_049)}`,
  oversizedUri: `postgresql://user:pass@synthetic.invalid/${'d'.repeat(8_192)}`,
})

const INVALID_OPAQUE_SECRETS = Object.freeze({
  embeddedSpace: 'synthetic payload secret',
  embeddedTab: 'synthetic\tpayload-secret',
  embeddedCarriageReturn: 'synthetic\rpayload-secret',
  embeddedLineFeed: 'synthetic\npayload-secret',
  embeddedNul: 'synthetic\0payload-secret',
  unicodeLineSeparator: 'synthetic\u2028payload-secret',
  unicodeParagraphSeparator: 'synthetic\u2029payload-secret',
  zeroWidthFormat: 'synthetic\u200Bpayload-secret',
  byteOrderMark: 'synthetic\uFEFFpayload-secret',
  whitespaceOnly: '                    ',
  oversized: 'x'.repeat(8_193),
})

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

function replaceExact(source: string, from: string, to: string): string {
  const parts = source.split(from)
  assert.equal(parts.length, 2, `mutation anchor count for ${from.slice(0, 48)}`)
  return `${parts[0]}${to}${parts[1]}`
}

function validationModule(source: string): string {
  const begin = '// CONTROLLED_FRESH_CANDIDATE_SECRET_VALIDATION_BLOCK_BEGIN'
  const end = '// CONTROLLED_FRESH_CANDIDATE_SECRET_VALIDATION_BLOCK_END'
  const start = source.indexOf(begin)
  const finish = source.indexOf(end)
  assert.ok(start >= 0 && finish > start)
  return `
function exactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
const CONTROLLED_FRESH_CANDIDATE_EXTERNAL_SECRET_ALLOWLIST = Object.freeze([
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'BLOB_READ_WRITE_TOKEN',
] as const)
${source.slice(start, finish + end.length)}
`
}

function runValidationMutationSource(source: string, label: string): ReturnType<typeof spawnSync> {
  const root = mkdtempSync('/home/w11/.local/share/cfc-secret-validation-mutation-')
  chmodSync(root, 0o700)
  try {
    const modulePath = path.join(root, 'validation.ts')
    const harnessPath = path.join(root, 'harness.mjs')
    writeFileSync(modulePath, validationModule(source), 'utf8')
    writeFileSync(harnessPath, `
import assert from 'node:assert/strict';
const candidate = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
const label = ${JSON.stringify(label)};
const values = {
  DATABASE_URI: label === 'decoded-component-validation'
    ? 'postgresql://%20%20:pass@synthetic.invalid/offline'
    : label === 'query-validation'
      ? 'postgresql://user:pass@synthetic.invalid/offline?password=unexpected'
      : 'postgresql://user:pass@synthetic.invalid/offline',
  PAYLOAD_SECRET: label === 'opaque-whitespace-validation'
    ? 'synthetic payload secret'
    : 'synthetic-payload-secret',
  BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
};
assert.equal(candidate.controlledFreshCandidateExternalSecretsAreValid(values), false, label);
process.stdout.write('MUTATION_HARNESS_OK:' + label);
`, 'utf8')
    return spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), harnessPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10_000,
      env: {
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
        PAYLOAD_DB_PUSH: 'false',
        PAYLOAD_DROP_DATABASE: 'false',
      },
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function runValidationMutationControls(): void {
  const source = readFileSync(path.resolve('scripts/controlled-fresh-candidate-secret-loader.ts'), 'utf8')
  const faults = [
    {
      label: 'decoded-component-validation',
      mutant: replaceExact(
        source,
        `  return boundedSecretString(decoded, 1, CONTROLLED_FRESH_CANDIDATE_DATABASE_COMPONENT_MAX_LENGTH)
    && !CONTROLLED_FRESH_CANDIDATE_NESTED_PERCENT_ESCAPE.test(decoded)
    ? decoded
    : null`,
        '  return encoded',
      ),
    },
    {
      label: 'query-validation',
      mutant: replaceExact(
        source,
        '      || !validDatabaseUriQuery(rawQuery, parsed)',
        '      || false /* query validation removed by mutation */',
      ),
    },
    {
      label: 'opaque-whitespace-validation',
      mutant: replaceExact(
        source,
        '    && !CONTROLLED_FRESH_CANDIDATE_PROHIBITED_SECRET_CHARACTER.test(value)',
        '    && true /* prohibited-character validation removed by mutation */',
      ),
    },
  ]
  for (const fault of faults) {
    const baseline = runValidationMutationSource(source, fault.label)
    assert.equal(baseline.status, 0, `${fault.label} baseline: ${baseline.stderr}`)
    assert.equal(baseline.stdout, `MUTATION_HARNESS_OK:${fault.label}`, fault.label)
    assert.equal(baseline.stderr, '', fault.label)
    const mutant = runValidationMutationSource(fault.mutant, fault.label)
    assert.notEqual(mutant.status, 0, `${fault.label} mutant must fail`)
    assert.equal(mutant.stdout.includes('MUTATION_HARNESS_OK'), false, fault.label)
    assert.equal(`${mutant.stdout}${mutant.stderr}`.includes(SYNTHETIC_PAYLOAD), false, fault.label)
  }
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

    for (const [name, databaseUri] of Object.entries(INVALID_DATABASE_URIS)) {
      const invalid = expectConfigurationError(() => buildControlledFreshCandidateConfigurationEnvironment({
        secrets: { ...canonicalValues, DATABASE_URI: databaseUri },
        deployedCommitIdentity: SYNTHETIC_COMMIT,
      }))
      assert.equal(invalid.code, 'CONTROLLED_CONFIGURATION_SECRET_VALUE_INVALID', name)
    }
    for (const [encodingName, encoding] of Object.entries(ENCODED_PROHIBITED_COMPONENTS)) {
      for (const [componentName, databaseUri] of Object.entries({
        username: `postgresql://${encoding}:pass@synthetic.invalid/offline`,
        password: `postgresql://user:${encoding}@synthetic.invalid/offline`,
        hostname: `postgresql://user:pass@synthetic${encoding}.invalid/offline`,
        database: `postgresql://user:pass@synthetic.invalid/${encoding}`,
        queryName: `postgresql://user:pass@synthetic.invalid/offline?ssl${encoding}mode=verify-full`,
        queryValue: `postgresql://user:pass@synthetic.invalid/offline?sslmode=verify${encoding}full`,
      })) {
        const invalid = expectConfigurationError(() => buildControlledFreshCandidateConfigurationEnvironment({
          secrets: { ...canonicalValues, DATABASE_URI: databaseUri },
          deployedCommitIdentity: SYNTHETIC_COMMIT,
        }))
        assert.equal(invalid.code, 'CONTROLLED_CONFIGURATION_SECRET_VALUE_INVALID', `${componentName}-${encodingName}`)
      }
    }
    for (const [name, opaqueSecret] of Object.entries(INVALID_OPAQUE_SECRETS)) {
      const invalidPayload = expectConfigurationError(() => buildControlledFreshCandidateConfigurationEnvironment({
        secrets: { ...canonicalValues, PAYLOAD_SECRET: opaqueSecret },
        deployedCommitIdentity: SYNTHETIC_COMMIT,
      }))
      assert.equal(invalidPayload.code, 'CONTROLLED_CONFIGURATION_SECRET_VALUE_INVALID', `payload-${name}`)
      const invalidBlob = expectConfigurationError(() => buildControlledFreshCandidateConfigurationEnvironment({
        secrets: { ...canonicalValues, BLOB_READ_WRITE_TOKEN: opaqueSecret },
        deployedCommitIdentity: SYNTHETIC_COMMIT,
      }))
      assert.equal(invalidBlob.code, 'CONTROLLED_CONFIGURATION_SECRET_VALUE_INVALID', `blob-${name}`)
    }
    for (const [name, overrides] of Object.entries({
      controlCharacter: { DATABASE_URI: '\u0016' },
      shortPayloadSecret: { PAYLOAD_SECRET: 'short' },
      shortBlobToken: { BLOB_READ_WRITE_TOKEN: 'short' },
      pastedEscapeSequence: { BLOB_READ_WRITE_TOKEN: '\u001b[2~' },
      surroundingWhitespace: { PAYLOAD_SECRET: ` ${SYNTHETIC_PAYLOAD}` },
    })) {
      const invalid = expectConfigurationError(() => buildControlledFreshCandidateConfigurationEnvironment({
        secrets: { ...canonicalValues, ...overrides },
        deployedCommitIdentity: SYNTHETIC_COMMIT,
      }))
      assert.equal(invalid.code, 'CONTROLLED_CONFIGURATION_SECRET_VALUE_INVALID', name)
    }

    for (const [name, databaseUri] of VALID_DATABASE_URIS.entries()) {
      const valid = buildControlledFreshCandidateConfigurationEnvironment({
        secrets: { ...canonicalValues, DATABASE_URI: databaseUri },
        deployedCommitIdentity: SYNTHETIC_COMMIT,
      })
      assert.equal(valid.DATABASE_URI, databaseUri, `valid-query-policy-${name}`)
    }

    runValidationMutationControls()

    const extraExternalKey = expectConfigurationError(() => buildControlledFreshCandidateConfigurationEnvironment({
      secrets: { ...canonicalValues, UNEXPECTED_SECRET: 'must-fail-closed' } as typeof canonicalValues,
      deployedCommitIdentity: SYNTHETIC_COMMIT,
    }))
    assert.equal(extraExternalKey.code, 'CONTROLLED_CONFIGURATION_FORMAT_INVALID')

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
