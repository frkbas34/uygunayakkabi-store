import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
  CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS,
  assertControlledFreshCandidateAuthorizationActive,
  controlledFreshCandidateExecutionGrantIsCanonical,
  deriveControlledFreshCandidateAuthorizationIdentity,
  serializeControlledFreshCandidateExecutionGrant,
  type ControlledFreshCandidateExecutionGrant,
  type ControlledFreshCandidateUnsignedExecutionGrant,
} from './controlledFreshCandidateCreation'
import {
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
} from './controlledFreshCandidateReceipt'
import { createControlledFreshCandidateExecutionGrantToken } from '../../scripts/controlled-fresh-candidate-runtime-resources'

const BASE = Date.parse('2030-01-01T00:00:00.000Z')
const KEY = new Uint8Array(32).fill(91)

function grant(overrides: Partial<ControlledFreshCandidateUnsignedExecutionGrant> = {}): ControlledFreshCandidateExecutionGrant {
  const unsigned: ControlledFreshCandidateUnsignedExecutionGrant = {
    version: CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
    executionIdentity: 'authorization-execution-0001',
    manifestDigest: '1'.repeat(64),
    contractIdentity: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
    runtimeIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
    runtimeCommitIdentity: '5daecabf304709c4106616c52fe971e315305dfb',
    environmentIdentity: 'authorization-test-environment',
    approvedReceiptDestinationDigest: '2'.repeat(64),
    issuedAt: new Date(BASE).toISOString(),
    notBefore: new Date(BASE).toISOString(),
    expiresAt: new Date(BASE + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS).toISOString(),
    ...overrides,
  }
  return { ...unsigned, authorizationIdentity: deriveControlledFreshCandidateAuthorizationIdentity(unsigned) }
}

function rejected(candidate: unknown, observedAt = BASE): void {
  assert.equal(controlledFreshCandidateExecutionGrantIsCanonical(candidate), false)
  assert.throws(() => assertControlledFreshCandidateAuthorizationActive({
    grant: candidate as ControlledFreshCandidateExecutionGrant,
    observedAt,
  }))
}

function main(): void {
  const exactThirtyMinutes = grant()
  assert.equal(controlledFreshCandidateExecutionGrantIsCanonical(exactThirtyMinutes), true)
  assert.doesNotThrow(() => assertControlledFreshCandidateAuthorizationActive({ grant: exactThirtyMinutes, observedAt: BASE }))
  assert.doesNotThrow(() => assertControlledFreshCandidateAuthorizationActive({
    grant: exactThirtyMinutes,
    observedAt: BASE + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS - 1,
  }))
  assert.throws(() => assertControlledFreshCandidateAuthorizationActive({
    grant: exactThirtyMinutes,
    observedAt: BASE + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS,
  }), /INACTIVE/)

  const shorter = grant({ expiresAt: new Date(BASE + 60_000).toISOString() })
  assert.doesNotThrow(() => assertControlledFreshCandidateAuthorizationActive({ grant: shorter, observedAt: BASE + 1 }))
  const future = grant({ notBefore: new Date(BASE + 5_000).toISOString() })
  assert.throws(() => assertControlledFreshCandidateAuthorizationActive({ grant: future, observedAt: BASE }), /INACTIVE/)
  const alreadyExpired = grant({ issuedAt: new Date(BASE - 60_000).toISOString(), notBefore: new Date(BASE - 60_000).toISOString(), expiresAt: new Date(BASE).toISOString() })
  assert.throws(() => assertControlledFreshCandidateAuthorizationActive({ grant: alreadyExpired, observedAt: BASE }), /INACTIVE/)

  rejected(grant({ expiresAt: new Date(BASE + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS + 1).toISOString() }))
  rejected(grant({ expiresAt: new Date(BASE).toISOString() }))
  rejected(grant({ notBefore: new Date(BASE + 10_000).toISOString(), expiresAt: new Date(BASE + 5_000).toISOString() }))
  rejected({ ...grant(), issuedAt: '2030-01-01T00:00:00Z' })
  rejected({ ...grant(), issuedAt: '2030-01-01T03:00:00.000+03:00' })
  const missing = { ...grant() } as Record<string, unknown>
  delete missing.expiresAt
  rejected(missing)
  rejected({ ...grant(), unexpected: true })
  rejected({
    version: 'controlled-fresh-candidate-execution-authorization/v2',
    authorizationIdentity: 'legacy-authorization-0001',
    executionIdentity: 'authorization-execution-0001',
    manifestDigest: '1'.repeat(64),
    contractIdentity: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
    runtimeIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
    runtimeCommitIdentity: 'legacy-commit',
    environmentIdentity: 'legacy-environment',
    approvedReceiptDestinationDigest: '2'.repeat(64),
  })
  assert.throws(() => assertControlledFreshCandidateAuthorizationActive({
    grant: exactThirtyMinutes,
    observedAt: BASE + 1,
    previousObservedAt: BASE + 2,
  }), /CLOCK_INVALID/)

  const originalToken = createControlledFreshCandidateExecutionGrantToken(exactThirtyMinutes, KEY)
  for (const [field, changes] of [
    ['issuedAt', {
      issuedAt: new Date(BASE - 1).toISOString(),
      expiresAt: new Date(BASE + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS - 1).toISOString(),
    }],
    ['notBefore', { notBefore: new Date(BASE + 1).toISOString() }],
    ['expiresAt', { expiresAt: new Date(BASE + CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS - 1).toISOString() }],
  ] as const) {
    const changedGrant = grant(changes)
    assert.notEqual(changedGrant.authorizationIdentity, exactThirtyMinutes.authorizationIdentity, field)
    assert.equal(createControlledFreshCandidateExecutionGrantToken(changedGrant, KEY).equals(originalToken), false, field)
    assert.notEqual(serializeControlledFreshCandidateExecutionGrant(changedGrant), serializeControlledFreshCandidateExecutionGrant(exactThirtyMinutes), field)
  }

  const creationSource = readFileSync(path.resolve('src/lib/controlledFreshCandidateCreation.ts'), 'utf8')
  const resourcesSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts'), 'utf8')
  assert.ok(creationSource.indexOf('const authorizationObservedAt = observeAuthorization()') < creationSource.indexOf('dependencies.consumeExecutionAuthorization('))
  assert.ok(creationSource.indexOf('observeAuthorization()\n      stockCollision') < creationSource.indexOf('dependencies.stockExists('))
  const consumptionRecheck = resourcesSource.indexOf('previousObservedAt: authorizationObservedAt')
  assert.ok(consumptionRecheck >= 0)
  assert.ok(consumptionRecheck < resourcesSource.indexOf('createControlledFreshCandidateDurableMarker({', consumptionRecheck))
  assert.ok(resourcesSource.includes('expiresAt - issuedAt <= CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS') === false)
  assert.ok(creationSource.includes('expiresAt - issuedAt <= CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_WINDOW_MS'))
  assert.ok(creationSource.includes("throw new Error('CONTROLLED_EXECUTION_AUTHORIZATION_CLOCK_INVALID')"))
  assert.ok(creationSource.includes('deriveControlledFreshCandidateAuthorizationIdentity'))

  console.log('controlledFreshCandidateAuthorization: ALL OK')
}

main()
