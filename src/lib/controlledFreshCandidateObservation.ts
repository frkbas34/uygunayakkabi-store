import { createHmac, timingSafeEqual } from 'node:crypto'

import {
  CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS,
  type ControlledFreshCandidateOperationScopeState,
  type ControlledFreshCandidatePublicCounts,
} from './controlledFreshCandidateCreation'

export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_VERSION = 'controlled-fresh-candidate-observation/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_DOMAIN = 'uygunayakkabi:controlled-fresh-candidate:observation:v1' as const
export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_MAX_BYTES = 16_384
export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_STALE_AFTER_MS = 60_000

export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PHASES = [
  'pre_start',
  'initializing',
  'authorization_consumed',
  'stock_qualified',
  'product_create_intended',
  'product_committed',
  'media_create_intended',
  'media_retained',
  'relationship_updated',
  'quarantine_observed',
  'finalization_intended',
  'finalization_observed',
  'teardown_observed',
  'verifying',
  'closed',
] as const

export type ControlledFreshCandidateObservationPhase =
  (typeof CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PHASES)[number]
export type ControlledFreshCandidateReceiptPersistenceState =
  'NOT_STARTED' | 'RESERVED' | 'PERSISTED' | 'FAILED' | 'UNKNOWN'
export type ControlledFreshCandidateStrictVerifierStatus =
  'NOT_AVAILABLE' | 'PENDING' | 'READY' | 'BLOCKED' | 'EVIDENCE_UNSUPPORTED'
export type ControlledFreshCandidateObservationOutcome =
  'IN_PROGRESS' | 'CLOSED_SUCCESS' | 'CLOSED_FAILURE' | 'TERMINAL_UNCERTAIN'
export type ControlledFreshCandidateNaturalExitExpectation = 'PENDING' | 'EXPECTED' | 'NOT_EXPECTED'

export type ControlledFreshCandidateObservationResources = {
  pendingAcquisitions: number
  checkedOutPoolClients: number
  standaloneClients: number
  destructiveReleaseRequested: number
  destructiveReleaseCompleted: number
  physicalRemovals: number
  poolShutdownStarted: boolean
  poolShutdownSettled: boolean
}

export type ControlledFreshCandidateObservation = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_OBSERVATION_VERSION
  operationId: string
  sequence: number
  observedAt: string
  phase: ControlledFreshCandidateObservationPhase
  resources: ControlledFreshCandidateObservationResources
  terminalScopeState: ControlledFreshCandidateOperationScopeState
  receiptPersistenceState: ControlledFreshCandidateReceiptPersistenceState
  strictVerifierStatus: ControlledFreshCandidateStrictVerifierStatus
  naturalExitExpectation: ControlledFreshCandidateNaturalExitExpectation
  counts: ControlledFreshCandidatePublicCounts
  outcome: ControlledFreshCandidateObservationOutcome
  eligibleForPublishing: false
  seal: string
}

export type ControlledFreshCandidateObservationPublic = Omit<ControlledFreshCandidateObservation, 'seal'> & {
  stale: boolean
}

export function controlledFreshCandidateObservationCanInitialize(params: {
  mode: 'create' | 'verify'
  observation: ControlledFreshCandidateObservationPublic
}): boolean {
  const observation = params.observation
  if (params.mode === 'create') {
    return observation.sequence === 0
      && observation.phase === 'pre_start'
      && observation.outcome === 'IN_PROGRESS'
      && observation.receiptPersistenceState === 'NOT_STARTED'
      && observation.strictVerifierStatus === 'NOT_AVAILABLE'
  }
  return observation.sequence > 0
    && observation.phase === 'closed'
    && observation.outcome === 'CLOSED_SUCCESS'
    && observation.terminalScopeState === 'CLOSED'
    && observation.receiptPersistenceState === 'PERSISTED'
    && observation.strictVerifierStatus === 'NOT_AVAILABLE'
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

function canonicalTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false
  const millis = Date.parse(value)
  return Number.isSafeInteger(millis) && new Date(millis).toISOString() === value
}

function exactCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 10_000
}

function exactObservation(value: unknown): value is ControlledFreshCandidateObservation {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'operationId', 'sequence', 'observedAt', 'phase', 'resources',
    'terminalScopeState', 'receiptPersistenceState', 'strictVerifierStatus',
    'naturalExitExpectation', 'counts', 'outcome', 'eligibleForPublishing', 'seal',
  ])) return false
  if (!isPlainRecord(value.resources) || !hasExactOwnKeys(value.resources, [
    'pendingAcquisitions', 'checkedOutPoolClients', 'standaloneClients',
    'destructiveReleaseRequested', 'destructiveReleaseCompleted', 'physicalRemovals',
    'poolShutdownStarted', 'poolShutdownSettled',
  ])) return false
  if (!isPlainRecord(value.counts) || !hasExactOwnKeys(value.counts, CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS)) return false
  const resources = value.resources
  const counters = [
    resources.pendingAcquisitions,
    resources.checkedOutPoolClients,
    resources.standaloneClients,
    resources.destructiveReleaseRequested,
    resources.destructiveReleaseCompleted,
    resources.physicalRemovals,
  ]
  if (!counters.every(exactCount) || !Object.values(value.counts).every(exactCount)) return false
  const exactResources = resources as ControlledFreshCandidateObservationResources
  const closedSuccess = value.outcome === 'CLOSED_SUCCESS'
  if (closedSuccess && (
    value.phase !== 'closed'
    || value.terminalScopeState !== 'CLOSED'
    || value.naturalExitExpectation !== 'EXPECTED'
    || exactResources.pendingAcquisitions !== 0
    || exactResources.checkedOutPoolClients !== 0
    || exactResources.standaloneClients !== 0
    || exactResources.destructiveReleaseRequested !== exactResources.destructiveReleaseCompleted
    || exactResources.physicalRemovals < exactResources.destructiveReleaseCompleted
    || exactResources.poolShutdownStarted !== true
    || exactResources.poolShutdownSettled !== true
    || !['PERSISTED', 'NOT_STARTED'].includes(String(value.receiptPersistenceState))
  )) return false
  if (value.outcome === 'TERMINAL_UNCERTAIN' && value.naturalExitExpectation === 'EXPECTED') return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_OBSERVATION_VERSION
    && typeof value.operationId === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/iu.test(value.operationId)
    && exactCount(value.sequence)
    && canonicalTimestamp(value.observedAt)
    && CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PHASES.includes(value.phase as ControlledFreshCandidateObservationPhase)
    && ['OPEN', 'CANCELLING', 'SEALED_FOR_NON_CLEANUP', 'DRAINING_CLEANUP', 'TERMINAL_UNCERTAIN', 'CLOSED'].includes(String(value.terminalScopeState))
    && ['NOT_STARTED', 'RESERVED', 'PERSISTED', 'FAILED', 'UNKNOWN'].includes(String(value.receiptPersistenceState))
    && ['NOT_AVAILABLE', 'PENDING', 'READY', 'BLOCKED', 'EVIDENCE_UNSUPPORTED'].includes(String(value.strictVerifierStatus))
    && ['PENDING', 'EXPECTED', 'NOT_EXPECTED'].includes(String(value.naturalExitExpectation))
    && ['IN_PROGRESS', 'CLOSED_SUCCESS', 'CLOSED_FAILURE', 'TERMINAL_UNCERTAIN'].includes(String(value.outcome))
    && typeof resources.poolShutdownStarted === 'boolean'
    && typeof resources.poolShutdownSettled === 'boolean'
    && value.eligibleForPublishing === false
    && typeof value.seal === 'string' && /^[0-9a-f]{64}$/u.test(value.seal)
}

function keyBuffer(key: Uint8Array): Buffer {
  const buffer = Buffer.from(key)
  if (buffer.byteLength < 32 || buffer.byteLength > 128) throw new Error('CONTROLLED_OBSERVATION_KEY_INVALID')
  return buffer
}

function seal(unsigned: Omit<ControlledFreshCandidateObservation, 'seal'>, key: Uint8Array): string {
  return createHmac('sha256', keyBuffer(key))
    .update(CONTROLLED_FRESH_CANDIDATE_OBSERVATION_DOMAIN)
    .update('\0')
    .update(canonicalJson(unsigned))
    .digest('hex')
}

export function sealControlledFreshCandidateObservation(
  unsigned: Omit<ControlledFreshCandidateObservation, 'seal'>,
  key: Uint8Array,
): ControlledFreshCandidateObservation {
  const candidate = { ...structuredClone(unsigned), seal: seal(unsigned, key) }
  if (!exactObservation(candidate)) throw new Error('CONTROLLED_OBSERVATION_INVALID')
  return candidate
}

export function serializeControlledFreshCandidateObservation(
  observation: ControlledFreshCandidateObservation,
): string {
  if (!exactObservation(observation)) throw new Error('CONTROLLED_OBSERVATION_INVALID')
  return canonicalJson(observation)
}

export function authenticateControlledFreshCandidateObservation(params: {
  bytes: Uint8Array
  key: Uint8Array
  expectedOperationId: string
  now?: number
}): ControlledFreshCandidateObservationPublic {
  if (!(params.bytes instanceof Uint8Array) || params.bytes.byteLength < 1 || params.bytes.byteLength > CONTROLLED_FRESH_CANDIDATE_OBSERVATION_MAX_BYTES) {
    throw new Error('CONTROLLED_OBSERVATION_BYTES_INVALID')
  }
  const bytes = Buffer.from(params.bytes)
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error('CONTROLLED_OBSERVATION_BYTES_INVALID')
  }
  let serialized: string
  let parsed: unknown
  try {
    serialized = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
    if (!Buffer.from(serialized, 'utf8').equals(bytes)) throw new Error('invalid')
    parsed = JSON.parse(serialized)
  } catch {
    throw new Error('CONTROLLED_OBSERVATION_MALFORMED')
  }
  if (serialized !== canonicalJson(parsed) || !exactObservation(parsed)) {
    throw new Error('CONTROLLED_OBSERVATION_MALFORMED')
  }
  if (parsed.operationId !== params.expectedOperationId) throw new Error('CONTROLLED_OBSERVATION_OPERATION_MISMATCH')
  const { seal: supplied, ...unsigned } = parsed
  const expected = seal(unsigned, params.key)
  const suppliedBytes = Buffer.from(supplied, 'hex')
  const expectedBytes = Buffer.from(expected, 'hex')
  if (suppliedBytes.byteLength !== expectedBytes.byteLength || !timingSafeEqual(suppliedBytes, expectedBytes)) {
    throw new Error('CONTROLLED_OBSERVATION_AUTHENTICATION_FAILED')
  }
  const now = params.now ?? Date.now()
  if (!Number.isSafeInteger(now) || Object.is(now, -0)) throw new Error('CONTROLLED_OBSERVATION_CLOCK_INVALID')
  return {
    ...structuredClone(unsigned),
    stale: parsed.outcome === 'IN_PROGRESS'
      && now - Date.parse(parsed.observedAt) > CONTROLLED_FRESH_CANDIDATE_OBSERVATION_STALE_AFTER_MS,
  }
}

export function emptyControlledFreshCandidatePublicCounts(): ControlledFreshCandidatePublicCounts {
  return Object.fromEntries(CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.map((key) => [key, 0])) as ControlledFreshCandidatePublicCounts
}

export function createControlledFreshCandidateObservationState(params: {
  operationId: string
  key: Uint8Array
  now?: () => number
  initial?: Omit<ControlledFreshCandidateObservation, 'seal'>
  persist(serialized: string): void
}): {
  publish(transform: (draft: Omit<ControlledFreshCandidateObservation, 'seal'>) => void): ControlledFreshCandidateObservation
  current(): ControlledFreshCandidateObservation
} {
  const now = params.now ?? Date.now
  let previousNow: number | undefined
  const initial = params.initial ?? {
    version: CONTROLLED_FRESH_CANDIDATE_OBSERVATION_VERSION,
    operationId: params.operationId,
    sequence: 0,
    observedAt: new Date(now()).toISOString(),
    phase: 'pre_start' as const,
    resources: {
      pendingAcquisitions: 0,
      checkedOutPoolClients: 0,
      standaloneClients: 0,
      destructiveReleaseRequested: 0,
      destructiveReleaseCompleted: 0,
      physicalRemovals: 0,
      poolShutdownStarted: false,
      poolShutdownSettled: false,
    },
    terminalScopeState: 'OPEN' as const,
    receiptPersistenceState: 'NOT_STARTED' as const,
    strictVerifierStatus: 'NOT_AVAILABLE' as const,
    naturalExitExpectation: 'PENDING' as const,
    counts: emptyControlledFreshCandidatePublicCounts(),
    outcome: 'IN_PROGRESS' as const,
    eligibleForPublishing: false as const,
  }
  if (initial.operationId !== params.operationId) throw new Error('CONTROLLED_OBSERVATION_OPERATION_MISMATCH')
  let current = sealControlledFreshCandidateObservation(initial, params.key)
  previousNow = Date.parse(current.observedAt)
  return {
    publish(transform) {
      const observedAt = now()
      if (!Number.isSafeInteger(observedAt) || observedAt < (previousNow ?? observedAt)) {
        throw new Error('CONTROLLED_OBSERVATION_CLOCK_INVALID')
      }
      const unsigned = Object.fromEntries(
        Object.entries(structuredClone(current)).filter(([key]) => key !== 'seal'),
      ) as Omit<ControlledFreshCandidateObservation, 'seal'>
      transform(unsigned)
      unsigned.sequence += 1
      unsigned.observedAt = new Date(observedAt).toISOString()
      current = sealControlledFreshCandidateObservation(unsigned, params.key)
      params.persist(serializeControlledFreshCandidateObservation(current))
      previousNow = observedAt
      return structuredClone(current)
    },
    current: () => structuredClone(current),
  }
}
