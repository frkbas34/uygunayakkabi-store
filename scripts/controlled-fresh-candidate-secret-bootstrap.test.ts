import assert from 'node:assert/strict'
import { chmodSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import {
  bootstrapControlledFreshCandidateSecrets,
  parseControlledFreshCandidateBootstrapArgs,
} from './controlled-fresh-candidate-secret-bootstrap'
import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
} from './controlled-fresh-candidate-runtime-resources'
import { readControlledFreshCandidatePersistentSecrets } from './controlled-fresh-candidate-secret-loader'

const EXTERNAL = Object.freeze({
  DATABASE_URI: 'postgres://synthetic.invalid/bootstrap-test',
  PAYLOAD_SECRET: 'synthetic-payload-secret',
  BLOB_READ_WRITE_TOKEN: 'synthetic-blob-token',
})

function createFixture(): { root: string; destination: string } {
  const root = mkdtempSync('/home/w11/.local/share/cfc-bootstrap-test-')
  chmodSync(root, 0o700)
  return { root, destination: path.join(root, 'runtime-secrets.env') }
}

async function main(): Promise<void> {
  assert.deepEqual(parseControlledFreshCandidateBootstrapArgs(['--help']), { ok: true, help: true })
  assert.deepEqual(parseControlledFreshCandidateBootstrapArgs([
    '--bootstrap',
    '--confirm-controlled-fresh-candidate-secret-bootstrap',
  ]), { ok: true, help: false })
  assert.deepEqual(parseControlledFreshCandidateBootstrapArgs(['--bootstrap']), { ok: false })
  if (process.platform !== 'linux') {
    console.log('controlledFreshCandidateSecretBootstrap: SKIPPED_NON_LINUX')
    return
  }

  const approvedLedgerBefore = readdirSync('/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate')
  const fixtures: string[] = []
  try {
    const normal = createFixture()
    fixtures.push(normal.root)
    let keyCall = 0
    const created = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: normal.destination,
      randomBytesFn: () => Buffer.alloc(32, ++keyCall),
    })
    assert.deepEqual(created, {
      version: 'controlled-fresh-candidate-secret-bootstrap/v1',
      status: 'CREATED',
      secretFileCreated: true,
      keysIndependent: true,
      durable: true,
      eligibleForPublishing: false,
    })
    const values = readControlledFreshCandidatePersistentSecrets({ testOnlySecretPath: normal.destination })
    assert.notEqual(
      values[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV],
      values[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV],
    )
    const disclosed = JSON.stringify(created)
    for (const value of Object.values(EXTERNAL)) assert.equal(disclosed.includes(value), false)
    for (const value of Object.values(values)) assert.equal(disclosed.includes(value), false)
    const overwrite = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: normal.destination,
    })
    assert.equal(overwrite.status, 'REFUSED')

    const concurrent = createFixture()
    fixtures.push(concurrent.root)
    const [left, right] = await Promise.all([
      bootstrapControlledFreshCandidateSecrets({
        interactive: true,
        providedSecrets: EXTERNAL,
        testOnlyDestinationPath: concurrent.destination,
      }),
      bootstrapControlledFreshCandidateSecrets({
        interactive: true,
        providedSecrets: EXTERNAL,
        testOnlyDestinationPath: concurrent.destination,
      }),
    ])
    assert.equal([left, right].filter((entry) => entry.status === 'CREATED').length, 1)
    assert.equal([left, right].filter((entry) => entry.secretFileCreated).length, 1)

    const sameKeys = createFixture()
    fixtures.push(sameKeys.root)
    const reused = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: sameKeys.destination,
      randomBytesFn: () => Buffer.alloc(32, 7),
    })
    assert.equal(reused.status, 'REFUSED')
    assert.equal(readdirSync(sameKeys.root).length, 0)

    const nonInteractive = createFixture()
    fixtures.push(nonInteractive.root)
    const nonTty = await bootstrapControlledFreshCandidateSecrets({
      interactive: false,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: nonInteractive.destination,
    })
    assert.equal(nonTty.status, 'REFUSED')
    assert.equal(readdirSync(nonInteractive.root).length, 0)

    const wrongFs = createFixture()
    fixtures.push(wrongFs.root)
    const wrongFilesystem = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: wrongFs.destination,
      testOnlyObservedFilesystemType: 0x01021994n,
    })
    assert.equal(wrongFilesystem.status, 'REFUSED')

    const wrongMode = createFixture()
    fixtures.push(wrongMode.root)
    chmodSync(wrongMode.root, 0o750)
    const insecureMode = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: wrongMode.destination,
    })
    assert.equal(insecureMode.status, 'REFUSED')

    const wrongOwner = createFixture()
    fixtures.push(wrongOwner.root)
    const ownerMismatch = await bootstrapControlledFreshCandidateSecrets({
      interactive: true,
      providedSecrets: EXTERNAL,
      testOnlyDestinationPath: wrongOwner.destination,
      testOnlyExpectedUid: process.getuid!() + 1,
    })
    assert.equal(ownerMismatch.status, 'REFUSED')

    for (const fault of ['after-partial-write', 'file-fsync', 'after-final-link', 'directory-fsync'] as const) {
      const uncertain = createFixture()
      fixtures.push(uncertain.root)
      const failed = await bootstrapControlledFreshCandidateSecrets({
        interactive: true,
        providedSecrets: EXTERNAL,
        testOnlyDestinationPath: uncertain.destination,
        testOnlyFault: fault,
      })
      assert.equal(failed.status, 'RECOVERY_REQUIRED')
      assert.equal(failed.durable, false)
      assert.ok(readdirSync(uncertain.root).length >= 1)
    }

    assert.deepEqual(
      readdirSync('/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate'),
      approvedLedgerBefore,
    )
  } finally {
    for (const fixture of fixtures) rmSync(fixture, { recursive: true, force: true })
  }
  console.log('controlledFreshCandidateSecretBootstrap: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
