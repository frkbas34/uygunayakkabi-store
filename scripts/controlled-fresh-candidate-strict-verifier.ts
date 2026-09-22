import { pathToFileURL } from 'node:url'

import {
  CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  createControlledFreshCandidateOperationScope,
  controlledFreshCandidateBoundedShutdown,
} from '../src/lib/controlledFreshCandidateCreation'
import { createControlledFreshCandidateRuntimeBudget, bindControlledFreshCandidateBudget, type ControlledFreshCandidateRuntimeBudget } from '../src/lib/controlledFreshCandidatePilotContract'
import { finalizeControlledFreshCandidateRuntimeReport } from './controlled-fresh-candidate-runtime'
import { verifyControlledFreshCandidateTarget } from '../src/lib/controlledFreshCandidateTargetVerifier'
import { initializeControlledFreshCandidateVerificationRuntime } from './controlled-fresh-candidate-runtime-resources'
import { CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST } from './controlled-fresh-candidate-secret-contract'
import {
  buildControlledFreshCandidateExecutionEnvironment,
  controlledFreshCandidateExecutionEnvironmentIsAuthenticated,
  loadControlledFreshCandidateConfigurationEnvironment,
  resolveControlledFreshCandidateOperationPackage,
  loadControlledFreshCandidateReleaseAttestation,
  assertControlledFreshCandidateNoAmbientPgOverrides,
} from './controlled-fresh-candidate-secret-loader'
import { controlledFreshCandidateCanonicalRepositoryCommit } from './controlled-fresh-candidate-owner-authorization'

export const CONTROLLED_FRESH_CANDIDATE_STRICT_VERIFY_CONFIRMATION =
  '--confirm-controlled-fresh-candidate-strict-read-only-verification' as const

function parseArgs(argv: readonly string[]): string | null {
  if (argv.length !== 2 || new Set(argv).size !== 2) return null
  if (!argv.includes(CONTROLLED_FRESH_CANDIDATE_STRICT_VERIFY_CONFIRMATION)) return null
  const operation = argv.find((arg) => arg.startsWith('--operation='))?.slice('--operation='.length)
  return operation && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(operation)
    ? operation
    : null
}

function refused(budget: ControlledFreshCandidateRuntimeBudget = createControlledFreshCandidateRuntimeBudget()): void {
  budget.markUncertain()
  console.log(JSON.stringify({
    version: 'controlled-fresh-candidate-strict-verifier-result/v1',
    verdict: 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED',
    runtimeBudget: budget.report(),
    eligibleForPublishing: false,
    eligibleForVisualOnlyGeneration: false,
  }))
}

function remainingVerifierMs(deadlineAt: number): number {
  const remaining = deadlineAt - Date.now()
  if (!Number.isSafeInteger(remaining) || remaining <= 0) throw new Error('controlled_verifier_deadline')
  return remaining
}

export async function runControlledFreshCandidateStrictVerifier(argv: readonly string[]): Promise<number> {
  const startedAt = Date.now()
  const deadlineAt = startedAt + CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS
  const budget = createControlledFreshCandidateRuntimeBudget()
  if (process.platform !== 'linux') { refused(budget); return 2 }
  const operationId = parseArgs(argv)
  const commit = controlledFreshCandidateCanonicalRepositoryCommit()
  if (!operationId || !commit) { refused(budget); return 2 }
  let scope: ReturnType<typeof createControlledFreshCandidateOperationScope> | null = null
  let resource: Awaited<ReturnType<typeof initializeControlledFreshCandidateVerificationRuntime>> | null = null
  try {
    assertControlledFreshCandidateNoAmbientPgOverrides()
    budget.setup()
    const packageResult = await resolveControlledFreshCandidateOperationPackage({
      operationId,
      timeoutMs: Math.min(remainingVerifierMs(deadlineAt), 30_000),
    })
    if (packageResult.runtimeCommitIdentity !== commit) throw new Error('controlled_verifier_commit_mismatch')
    budget.setup()
    const releaseAttestation = await loadControlledFreshCandidateReleaseAttestation({ packageResult,
      authorizationState: 'consumed', timeoutMs: Math.min(remainingVerifierMs(deadlineAt), 30_000) })
    budget.setup()
    const configurationEnvironment = loadControlledFreshCandidateConfigurationEnvironment({ deployedCommitIdentity: releaseAttestation.sourceCommit })
    budget.setup()
    const executionEnvironment = await buildControlledFreshCandidateExecutionEnvironment({
      configurationEnvironment,
      packageResult,
      authorizationState: 'consumed',
      releaseAttestation,
      timeoutMs: Math.min(remainingVerifierMs(deadlineAt), 30_000),
    })
    if (!controlledFreshCandidateExecutionEnvironmentIsAuthenticated(executionEnvironment)) {
      throw new Error('controlled_verifier_environment_invalid')
    }
    for (const name of CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST) {
      const value = executionEnvironment[name]
      if (value === undefined) throw new Error('controlled_verifier_environment_invalid')
      process.env[name] = value
    }
    process.env.PAYLOAD_DB_PUSH = 'false'
    process.env.PAYLOAD_DROP_DATABASE = 'false'
    remainingVerifierMs(deadlineAt)
    scope = createControlledFreshCandidateOperationScope({ deadlineAt })
    bindControlledFreshCandidateBudget(scope, budget)
    resource = await scope.run(() => initializeControlledFreshCandidateVerificationRuntime(scope))
    const report = await verifyControlledFreshCandidateTarget({
      capability: resource.capability,
      dependencies: resource.dependencies,
    })
    const terminal = await controlledFreshCandidateBoundedShutdown(scope, resource.destroy())
    await scope.cancel()
    await scope.drain()
    if (!terminal.ok) throw new Error('controlled_verifier_terminalization_failed')
    scope.close()
    resource.completeObservation(report, true)
    resource.closeObservation()
    remainingVerifierMs(deadlineAt)
    const result = finalizeControlledFreshCandidateRuntimeReport(report, budget)
    resource = null
    console.log(JSON.stringify(result))
    return report.verdict === 'STRICT_FRESH_TARGET_READY' ? 0 : 4
  } catch {
    budget.markUncertain()
    if (resource) {
      try { await controlledFreshCandidateBoundedShutdown(scope as NonNullable<typeof scope>, resource.destroy()) } catch {
        budget.markUncertain()
      }
      try { resource.failObservation() } catch { /* sanitized failure */ }
      try { resource.closeObservation() } catch { /* sanitized failure */ }
    }
    try { await scope?.cancel() } catch { /* recovery remains required */ }
    try { await scope?.drain() } catch { /* recovery remains required */ }
    try { scope?.close() } catch { /* recovery remains required */ }
    refused(budget)
    return 3
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false
if (isMain) {
  process.exitCode = 1
  void runControlledFreshCandidateStrictVerifier(process.argv.slice(2))
    .then((code) => { process.exitCode = code })
    .catch(() => { process.exitCode = 1 })
}
