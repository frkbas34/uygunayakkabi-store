import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { createControlledFreshCandidateOperationScope } from './controlledFreshCandidateCreation'
import {
  authenticateControlledFreshCandidateObservation,
  createControlledFreshCandidateObservationState,
  controlledFreshCandidateObservationCanInitialize,
  emptyControlledFreshCandidatePublicCounts,
  serializeControlledFreshCandidateObservation,
} from './controlledFreshCandidateObservation'
import { createControlledFreshCandidateTerminalResourceRegistry } from '../../scripts/controlled-fresh-candidate-runtime-resources'

const KEY = new Uint8Array(32).fill(101)
const OPERATION_ID = '11111111-1111-4111-8111-111111111111'
const START = Date.parse('2030-01-01T00:00:00.000Z')

async function main(): Promise<void> {
  let now = START
  const persisted: string[] = []
  const state = createControlledFreshCandidateObservationState({
    operationId: OPERATION_ID,
    key: KEY,
    now: () => now,
    persist: (serialized) => { persisted.push(serialized) },
  })
  const preStart = state.current()
  const preStartReport = authenticateControlledFreshCandidateObservation({
    bytes: Buffer.from(serializeControlledFreshCandidateObservation(preStart)),
    key: KEY,
    expectedOperationId: OPERATION_ID,
    now: START,
  })
  assert.equal(preStartReport.phase, 'pre_start')
  assert.equal(preStartReport.outcome, 'IN_PROGRESS')
  assert.equal(preStartReport.eligibleForPublishing, false)
  assert.equal(controlledFreshCandidateObservationCanInitialize({ mode: 'create', observation: preStartReport }), true)
  assert.equal(controlledFreshCandidateObservationCanInitialize({ mode: 'verify', observation: preStartReport }), false)

  now += 1
  const acquisition = state.publish((draft) => {
    draft.phase = 'initializing'
    draft.resources.pendingAcquisitions = 1
  })
  assert.equal(acquisition.resources.pendingAcquisitions, 1)
  now += 1
  const checkedOut = state.publish((draft) => {
    draft.resources.pendingAcquisitions = 0
    draft.resources.checkedOutPoolClients = 1
  })
  assert.equal(checkedOut.resources.checkedOutPoolClients, 1)
  now += 1
  state.publish((draft) => {
    draft.terminalScopeState = 'CANCELLING'
    draft.resources.destructiveReleaseRequested = 1
  })
  now += 1
  state.publish((draft) => {
    draft.terminalScopeState = 'DRAINING_CLEANUP'
    draft.resources.checkedOutPoolClients = 0
    draft.resources.destructiveReleaseCompleted = 1
  })
  now += 1
  state.publish((draft) => {
    draft.resources.physicalRemovals = 1
    draft.resources.poolShutdownStarted = true
  })
  now += 1
  state.publish((draft) => { draft.resources.poolShutdownSettled = true })

  assert.throws(() => {
    now += 1
    state.publish((draft) => {
      draft.phase = 'closed'
      draft.outcome = 'CLOSED_SUCCESS'
      draft.naturalExitExpectation = 'EXPECTED'
    })
  }, /CONTROLLED_OBSERVATION_INVALID/)
  now += 1
  const closed = state.publish((draft) => {
    draft.phase = 'closed'
    draft.terminalScopeState = 'CLOSED'
    draft.receiptPersistenceState = 'PERSISTED'
    draft.naturalExitExpectation = 'EXPECTED'
    draft.outcome = 'CLOSED_SUCCESS'
  })
  const closedBytes = Buffer.from(serializeControlledFreshCandidateObservation(closed))
  const firstRead = authenticateControlledFreshCandidateObservation({ bytes: closedBytes, key: KEY, expectedOperationId: OPERATION_ID, now })
  const secondRead = authenticateControlledFreshCandidateObservation({ bytes: closedBytes, key: KEY, expectedOperationId: OPERATION_ID, now })
  assert.deepEqual(firstRead, secondRead)
  assert.equal(firstRead.outcome, 'CLOSED_SUCCESS')
  assert.equal(firstRead.naturalExitExpectation, 'EXPECTED')
  assert.equal(controlledFreshCandidateObservationCanInitialize({ mode: 'create', observation: firstRead }), false)
  assert.equal(controlledFreshCandidateObservationCanInitialize({ mode: 'verify', observation: firstRead }), true)

  const closedContinuation = Object.fromEntries(
    Object.entries(firstRead).filter(([key]) => key !== 'stale'),
  ) as NonNullable<Parameters<typeof createControlledFreshCandidateObservationState>[0]['initial']>
  now += 1
  const verifierState = createControlledFreshCandidateObservationState({
    operationId: OPERATION_ID,
    key: KEY,
    now: () => now,
    initial: closedContinuation,
    persist: (serialized) => { persisted.push(serialized) },
  })
  const verifying = verifierState.publish((draft) => {
    draft.phase = 'verifying'
    draft.terminalScopeState = 'OPEN'
    draft.strictVerifierStatus = 'PENDING'
    draft.naturalExitExpectation = 'PENDING'
    draft.outcome = 'IN_PROGRESS'
  })
  assert.equal(verifying.sequence, closed.sequence + 1)
  assert.equal(verifying.phase, 'verifying')
  assert.equal(verifying.strictVerifierStatus, 'PENDING')
  assert.equal(verifying.operationId, OPERATION_ID)
  assert.throws(() => createControlledFreshCandidateObservationState({
    operationId: '55555555-5555-4555-8555-555555555555',
    key: KEY,
    initial: closedContinuation,
    persist: () => undefined,
  }), /OPERATION_MISMATCH/)

  assert.throws(() => authenticateControlledFreshCandidateObservation({
    bytes: closedBytes.subarray(0, closedBytes.byteLength - 1),
    key: KEY,
    expectedOperationId: OPERATION_ID,
  }), /MALFORMED/)
  assert.throws(() => authenticateControlledFreshCandidateObservation({
    bytes: closedBytes,
    key: KEY,
    expectedOperationId: '22222222-2222-4222-8222-222222222222',
  }), /OPERATION_MISMATCH/)
  const tampered = Buffer.from(closedBytes)
  tampered[tampered.indexOf(Buffer.from('CLOSED_SUCCESS'))] ^= 1
  assert.throws(() => authenticateControlledFreshCandidateObservation({
    bytes: tampered,
    key: KEY,
    expectedOperationId: OPERATION_ID,
  }))

  const staleState = createControlledFreshCandidateObservationState({
    operationId: '33333333-3333-4333-8333-333333333333',
    key: KEY,
    now: () => START,
    persist: () => undefined,
  }).current()
  const stale = authenticateControlledFreshCandidateObservation({
    bytes: Buffer.from(serializeControlledFreshCandidateObservation(staleState)),
    key: KEY,
    expectedOperationId: staleState.operationId,
    now: START + 60_001,
  })
  assert.equal(stale.stale, true)

  const uncertainState = createControlledFreshCandidateObservationState({
    operationId: '44444444-4444-4444-8444-444444444444',
    key: KEY,
    now: () => START,
    persist: () => undefined,
  })
  const uncertain = uncertainState.publish((draft) => {
    draft.terminalScopeState = 'TERMINAL_UNCERTAIN'
    draft.outcome = 'TERMINAL_UNCERTAIN'
    draft.naturalExitExpectation = 'NOT_EXPECTED'
  })
  assert.notEqual(uncertain.outcome, 'CLOSED_SUCCESS')
  assert.equal(uncertain.eligibleForPublishing, false)

  const scope = createControlledFreshCandidateOperationScope({ timeoutMs: 5_000 })
  const mutationActive = { current: true }
  const resourceSnapshots: Array<{
    pendingAcquisitions: number
    checkedOutPoolClients: number
    destructiveReleaseRequested: number
    destructiveReleaseCompleted: number
    physicalRemovals: number
    poolShutdownStarted: boolean
    poolShutdownSettled: boolean
  }> = []
  const registry = createControlledFreshCandidateTerminalResourceRegistry({
    scope,
    mutationActive,
    dispatcher: { destroy: async () => undefined },
    observeResources: (resources) => {
      resourceSnapshots.push({
        pendingAcquisitions: resources.pendingAcquisitions,
        checkedOutPoolClients: resources.checkedOutPoolClients,
        destructiveReleaseRequested: resources.destructiveReleaseRequested,
        destructiveReleaseCompleted: resources.destructiveReleaseCompleted,
        physicalRemovals: resources.physicalRemovals,
        poolShutdownStarted: resources.poolShutdownStarted,
        poolShutdownSettled: resources.poolShutdownSettled,
      })
    },
  })
  const pool = { end: async () => undefined }
  registry.registerPool(pool)
  const settle = registry.registerPoolAcquisition(pool)
  assert.equal(resourceSnapshots.at(-1)?.pendingAcquisitions, 1)
  settle()
  assert.equal(resourceSnapshots.at(-1)?.pendingAcquisitions, 0)
  const client = { end: async () => undefined }
  registry.registerPoolClient(client, pool)
  registry.registerPoolClientAcquisition(client, pool, (error) => {
    registry.registerPoolClientRelease(client, pool, true, Boolean(error))
    if (error) registry.registerPoolClientDestruction(client, pool)
  })
  assert.equal(resourceSnapshots.at(-1)?.checkedOutPoolClients, 1)
  scope.registerCancellation(registry.terminalizeOwnedResources)
  await scope.cancel()
  await scope.drain()
  const terminalResources = resourceSnapshots.at(-1)
  assert.equal(terminalResources?.pendingAcquisitions, 0)
  assert.equal(terminalResources?.checkedOutPoolClients, 0)
  assert.equal(terminalResources?.destructiveReleaseRequested, 1)
  assert.equal(terminalResources?.destructiveReleaseCompleted, 1)
  assert.equal(terminalResources?.physicalRemovals, 1)
  assert.equal(terminalResources?.poolShutdownStarted, true)
  assert.equal(terminalResources?.poolShutdownSettled, true)
  assert.equal(mutationActive.current, false)

  const publicJson = JSON.stringify(firstRead)
  for (const forbidden of ['password', 'postgres://', 'DATABASE_URI', 'stack', 'raw error', 'Product 349']) {
    assert.equal(publicJson.includes(forbidden), false, forbidden)
  }
  assert.deepEqual(firstRead.counts, emptyControlledFreshCandidatePublicCounts())

  const source = readFileSync(path.resolve('src/lib/controlledFreshCandidateObservation.ts'), 'utf8')
  const runtimeSource = readFileSync(path.resolve('scripts/controlled-fresh-candidate-runtime-resources.ts'), 'utf8')
  assert.ok(source.includes("value.outcome === 'CLOSED_SUCCESS'"))
  assert.ok(source.includes('exactResources.physicalRemovals < exactResources.destructiveReleaseCompleted'))
  assert.ok(source.includes('exactResources.poolShutdownSettled !== true'))
  assert.ok(source.includes("value.outcome === 'TERMINAL_UNCERTAIN' && value.naturalExitExpectation === 'EXPECTED'"))
  assert.ok(source.includes("parsed.operationId !== params.expectedOperationId"))
  assert.ok(runtimeSource.includes('params.observeResources?.({'))
  assert.ok(runtimeSource.includes('void params.scope.cancel().catch'))
  assert.ok(runtimeSource.includes('controlledFreshCandidateObservationCanInitialize({ mode: params.mode, observation: preStart })'))
  assert.equal(runtimeSource.includes('rawError'), false)

  console.log('controlledFreshCandidateObservation: ALL OK')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
