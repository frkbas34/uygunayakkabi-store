import { pathToFileURL } from 'node:url'

import {
  CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  createControlledFreshCandidateOperationScope,
  controlledFreshCandidateBoundedShutdown,
  CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS,
  CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION,
  type ControlledFreshCandidateOperationScope,
  type ControlledFreshCandidatePublicReport,
} from '../src/lib/controlledFreshCandidateCreation'
import {
  verifyControlledFreshCandidateTarget,
  type ControlledFreshCandidateStrictTargetReport,
} from '../src/lib/controlledFreshCandidateTargetVerifier'
import {
  executeControlledCreationResource,
  initializeControlledFreshCandidateCreationRuntime,
  initializeControlledFreshCandidateVerificationRuntime,
  type ControlledFreshCandidateRuntimeResource,
  type ControlledFreshCandidateVerificationResource,
} from './controlled-fresh-candidate-runtime-resources'
import {
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST,
  controlledFreshCandidateSecretReadiness,
} from './controlled-fresh-candidate-secret-contract'
import {
  controlledFreshCandidateExecutionEnvironmentIsAuthenticated,
  assertControlledFreshCandidateNoAmbientPgOverrides,
  controlledFreshCandidateExecutionReleaseIsVerified,
} from './controlled-fresh-candidate-secret-loader'
import {
  bindControlledFreshCandidateBudget,
  controlledFreshCandidateBudgetForScope,
  type ControlledFreshCandidateRuntimeBudget,
  type ControlledFreshCandidateRuntimeBudgetReport,
} from '../src/lib/controlledFreshCandidatePilotContract'

export const CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION = '--confirm-controlled-fresh-candidate-create' as const
export const CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION = '--confirm-controlled-fresh-candidate-receipt-verification' as const

export type ControlledFreshCandidateRuntimeMode = 'create' | 'verify'
export type ControlledFreshCandidateRuntimeArgDecision =
  | { ok: true; helpRequested: true; mode: null }
  | { ok: true; helpRequested: false; mode: ControlledFreshCandidateRuntimeMode }
  | { ok: false; code: 'RUNTIME_CONFIRMATION_REQUIRED' | 'RUNTIME_ARGUMENT_DUPLICATED' | 'RUNTIME_ARGUMENT_UNKNOWN' | 'RUNTIME_MODES_MIXED' }

export type ControlledFreshCandidateRuntimeIo = {
  stdout(text: string): void
  stderr(text: string): void
}

export type ControlledFreshCandidateRuntimeOptions = {
  argv: readonly string[]
  io?: ControlledFreshCandidateRuntimeIo
  executionEnvironment?: NodeJS.ProcessEnv
  testOnlyBypassExecutionReadiness?: boolean
  initializeCreation?: (scope: ControlledFreshCandidateOperationScope) => Promise<ControlledFreshCandidateRuntimeResource>
  initializeVerification?: (scope: ControlledFreshCandidateOperationScope) => Promise<ControlledFreshCandidateVerificationResource>
  operationTimeoutMs?: number
  deadlineAt?: number
  runtimeBudget?: ControlledFreshCandidateRuntimeBudget
}

const defaultIo: ControlledFreshCandidateRuntimeIo = {
  stdout: (text) => console.log(text),
  stderr: (text) => console.error(text),
}

export function controlledFreshCandidateRuntimeUsage(): string {
  return [
    'Controlled Fresh Candidate Boundary',
    '',
    'Exactly one private confirmation is required:',
    `  ${CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION}`,
    `  ${CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION}`,
    '',
    'The two modes are mutually exclusive. No Product, Media, stock, filename, URL,',
    'collection, query, provider, Telegram, queue, publishing, or dispatch selector is accepted.',
  ].join('\n')
}

export function parseControlledFreshCandidateRuntimeArgs(
  argv: readonly string[],
): ControlledFreshCandidateRuntimeArgDecision {
  const allowed = new Set([
    CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
    CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION,
    '--help',
  ])
  const seen = new Set<string>()
  for (const arg of argv) {
    if (!allowed.has(arg)) return { ok: false, code: 'RUNTIME_ARGUMENT_UNKNOWN' }
    if (seen.has(arg)) return { ok: false, code: 'RUNTIME_ARGUMENT_DUPLICATED' }
    seen.add(arg)
  }
  if (seen.has('--help')) {
    if (seen.size !== 1) return { ok: false, code: 'RUNTIME_ARGUMENT_UNKNOWN' }
    return { ok: true, helpRequested: true, mode: null }
  }
  const create = seen.has(CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION)
  const verify = seen.has(CONTROLLED_FRESH_CANDIDATE_VERIFY_CONFIRMATION)
  if (create && verify) return { ok: false, code: 'RUNTIME_MODES_MIXED' }
  if (!create && !verify) return { ok: false, code: 'RUNTIME_CONFIRMATION_REQUIRED' }
  return { ok: true, helpRequested: false, mode: create ? 'create' : 'verify' }
}

function creationExitCode(report: ControlledFreshCandidatePublicReport): number {
  return report.verdict === 'CREATION_COMMITTED_QUARANTINED' ? 0 : 3
}

function verificationExitCode(report: ControlledFreshCandidateStrictTargetReport): number {
  return report.verdict === 'STRICT_FRESH_TARGET_READY' ? 0 : 4
}

export function finalizeControlledFreshCandidateRuntimeReport<T extends Record<string, unknown>>(
  report: T,
  budget: ControlledFreshCandidateRuntimeBudget,
): T & { runtimeBudget: ControlledFreshCandidateRuntimeBudgetReport } {
  // Default deny: only a complete, known success or a proven local validation
  // refusal may retain OBSERVED. Cleanup can never undo sticky business UNKNOWN.
  const knownSuccess = report.version === CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION
    && report.eligibleForPublishing === false
    && report.cleanupStatus === 'complete'
    && report.quarantineCertainty === 'pending_observed'
    && report.commitCertainty === 'committed_observed'
    && report.ownerInputManifestMatch === true
    && Array.isArray(report.reasonCodes) && report.reasonCodes.length === 1
    && ((report.verdict === 'CREATION_COMMITTED_QUARANTINED' && report.reasonCodes[0] === 'CREATION_COMPLETE')
      || (report.verdict === 'STRICT_FRESH_TARGET_READY' && report.reasonCodes[0] === 'STRICT_TARGET_READY'
        && report.eligibleForVisualOnlyGeneration === true))
  const counts = report.counts as Record<string, unknown> | undefined
  const actual = budget.report().actual
  const provenLocalRefusal = report.version === CONTROLLED_FRESH_CANDIDATE_PUBLIC_VERSION
    && report.verdict === 'CREATION_BLOCKED' && report.phase === 'not_started'
    && report.cleanupStatus === 'not_started' && report.eligibleForPublishing === false
    && Array.isArray(report.reasonCodes) && report.reasonCodes.length === 1
    && ['CONTROLLED_INPUT_INVALID', 'MUTATION_CAPABILITY_INVALID'].includes(String(report.reasonCodes[0]))
    && counts && Object.keys(counts).length === CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.length
    && CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS.every((key) => counts[key] === 0)
    && actual.applicationMutations === 0 && actual.blobCalls === 0 && actual.transactions === 0
    && Object.entries(actual).every(([key, value]) => key === 'cleanupOperations' || value === 0)
  if (!knownSuccess && !provenLocalRefusal) budget.markUncertain()
  return {
    ...report,
    runtimeBudget: budget.report(),
  }
}

export async function runControlledFreshCandidateRuntime(
  options: ControlledFreshCandidateRuntimeOptions,
): Promise<number> {
  const startedAt = Date.now()
  const deadlineAt = options.deadlineAt ?? startedAt + Math.min(
    options.operationTimeoutMs ?? CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
    CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  )
  const io = options.io ?? defaultIo
  const refuseBeforeInitialization = (code: string): number => {
    io.stderr(`CONTROLLED_FRESH_CANDIDATE_REFUSED: ${code}`)
    // A launcher may already have consumed authorization and performed setup.
    // Preserve that authoritative accounting even when runtime preflight fails.
    if (options.runtimeBudget) {
      options.runtimeBudget.markUncertain()
      io.stdout(JSON.stringify({ status: 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED',
        eligibleForPublishing: false, runtimeBudget: options.runtimeBudget.report() }))
    }
    return 2
  }
  try { assertControlledFreshCandidateNoAmbientPgOverrides() } catch {
    return refuseBeforeInitialization('AMBIENT_PG_OVERRIDE_FORBIDDEN')
  }
  const decision = parseControlledFreshCandidateRuntimeArgs(options.argv)
  if (decision.ok && decision.helpRequested) {
    io.stdout(controlledFreshCandidateRuntimeUsage())
    return 0
  }
  if ('code' in decision) {
    io.stderr(`CONTROLLED_FRESH_CANDIDATE_REFUSED: ${decision.code}`)
    io.stdout(controlledFreshCandidateRuntimeUsage())
    return 2
  }

  if (process.platform !== 'linux') {
    return refuseBeforeInitialization('POSIX_RUNTIME_REQUIRED')
  }

  const testOnlyBypassExecutionReadiness = options.testOnlyBypassExecutionReadiness === true
    && process.env.NODE_ENV === 'test'
    && (options.initializeCreation !== undefined || options.initializeVerification !== undefined)
  const requiresExecutionReadiness = !testOnlyBypassExecutionReadiness
  if (requiresExecutionReadiness) {
    const environment = options.executionEnvironment
    if (!environment || !controlledFreshCandidateExecutionEnvironmentIsAuthenticated(environment)
      || !controlledFreshCandidateExecutionReleaseIsVerified(environment)) {
      return refuseBeforeInitialization('EXECUTION_READINESS_REQUIRED')
    }
    const readiness = controlledFreshCandidateSecretReadiness(environment, {
      stage: 'execution',
      ledgerReady: true,
      operationPackageAuthenticated: true,
    })
    if (!readiness.executionReady) {
      return refuseBeforeInitialization('EXECUTION_READINESS_REQUIRED')
    }
    for (const name of CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST) {
      const value = environment[name]
      if (value === undefined) {
        return refuseBeforeInitialization('EXECUTION_READINESS_REQUIRED')
      }
      process.env[name] = value
    }
  }

  process.env.PAYLOAD_DB_PUSH = 'false'
  process.env.PAYLOAD_DROP_DATABASE = 'false'
  if (
    process.env.PAYLOAD_DB_PUSH !== 'false'
    || process.env.PAYLOAD_DROP_DATABASE !== 'false'
  ) {
    return refuseBeforeInitialization('DATABASE_MANAGEMENT_DISABLED_REQUIRED')
  }
  if (!Number.isSafeInteger(deadlineAt) || deadlineAt <= Date.now()
    || deadlineAt > startedAt + CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS) {
    return refuseBeforeInitialization('ABSOLUTE_DEADLINE_REQUIRED')
  }
  const assertTerminalDeadline = (): void => {
    if (Date.now() >= deadlineAt) throw new Error('controlled_runtime_terminal_deadline')
  }
  let scope: ReturnType<typeof createControlledFreshCandidateOperationScope>
  try {
    scope = createControlledFreshCandidateOperationScope({ deadlineAt })
  } catch {
    // The clock can expire between preflight and scope construction. Preserve
    // the launcher's consumed-authority accounting rather than detach a throw.
    return refuseBeforeInitialization('ABSOLUTE_DEADLINE_REQUIRED')
  }
  if (options.runtimeBudget) bindControlledFreshCandidateBudget(scope, options.runtimeBudget)
  const budget = controlledFreshCandidateBudgetForScope(scope)

  if (decision.mode === 'create') {
    let resource: ControlledFreshCandidateRuntimeResource | null = null
    try {
      resource = await scope.run(() => (options.initializeCreation ?? initializeControlledFreshCandidateCreationRuntime)(scope))
      if (resource.scope !== scope) throw new Error('controlled_runtime_scope_mismatch')
      const report = await executeControlledCreationResource(resource)
      const terminal = await controlledFreshCandidateBoundedShutdown(scope, resource.destroy())
      await scope.cancel()
      await scope.drain()
      const terminalFailureAlreadyReported = report.reasonCodes.some((reason) => (
        reason === 'TEARDOWN_FAILED' || reason === 'AUTHORITY_CLOSURE_FAILED'
      ))
      if (!terminal.ok && !terminalFailureAlreadyReported) {
        throw new Error('controlled_runtime_terminalization_failed')
      }
      scope.close()
      resource.completeObservation(report, terminal.ok)
      resource.closeObservation()
      resource = null
      assertTerminalDeadline()
      io.stdout(JSON.stringify(finalizeControlledFreshCandidateRuntimeReport(report, budget)))
      return creationExitCode(report)
    } catch {
      budget.markUncertain()
      if (resource) {
        try { await controlledFreshCandidateBoundedShutdown(scope, resource.destroy()) } catch { budget.markUncertain() }
      }
      try { await scope.cancel() } catch { /* sanitized terminal failure */ }
      try { await scope.drain() } catch { /* terminal uncertainty remains non-successful */ }
      try { scope.close() } catch { /* terminal uncertainty remains non-successful */ }
      try { resource?.failObservation() } catch { /* observation failure is sticky */ }
      try { resource?.closeObservation() } catch { /* sanitized observation closure */ }
      const runtimeBudget = budget.report()
      io.stderr('CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE')
      io.stdout(JSON.stringify({
        version: 'controlled-fresh-candidate-runtime-terminal/v1',
        status: 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED',
        runtimeBudget,
        eligibleForPublishing: false,
      }))
      return 1
    }
  }

  let resource: ControlledFreshCandidateVerificationResource | null = null
  try {
    resource = await scope.run(() => (options.initializeVerification ?? initializeControlledFreshCandidateVerificationRuntime)(scope))
    if (resource.scope !== scope) throw new Error('controlled_runtime_scope_mismatch')
    const report = await verifyControlledFreshCandidateTarget({
      capability: resource.capability,
      dependencies: resource.dependencies,
    })
    const terminal = await controlledFreshCandidateBoundedShutdown(scope, resource.destroy())
    await scope.cancel()
    await scope.drain()
    if (!terminal.ok) throw new Error('controlled_runtime_terminalization_failed')
    scope.close()
    resource.completeObservation(report, terminal.ok)
    resource.closeObservation()
    resource = null
    assertTerminalDeadline()
    io.stdout(JSON.stringify(finalizeControlledFreshCandidateRuntimeReport(report, budget)))
    return verificationExitCode(report)
  } catch {
    budget.markUncertain()
    if (resource) {
      try { await controlledFreshCandidateBoundedShutdown(scope, resource.destroy()) } catch { budget.markUncertain() }
    }
    try { await scope.cancel() } catch { /* sanitized terminal failure */ }
    try { await scope.drain() } catch { /* terminal uncertainty remains non-successful */ }
    try { scope.close() } catch { /* terminal uncertainty remains non-successful */ }
    try { resource?.failObservation() } catch { /* observation failure is sticky */ }
    try { resource?.closeObservation() } catch { /* sanitized observation closure */ }
    const runtimeBudget = budget.report()
    io.stderr('CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE')
    io.stdout(JSON.stringify({
      version: 'controlled-fresh-candidate-runtime-terminal/v1',
      status: 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED',
      runtimeBudget,
      eligibleForPublishing: false,
    }))
    return 1
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  // A promise that cannot reach terminal certainty must never fall through to
  // Node's default successful exit merely because no referenced handles remain.
  process.exitCode = 1
  void runControlledFreshCandidateRuntime({ argv: process.argv.slice(2) })
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
