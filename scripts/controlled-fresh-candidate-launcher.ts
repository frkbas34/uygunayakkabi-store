import { pathToFileURL } from 'node:url'

import { createControlledFreshCandidateRuntimeBudget, type ControlledFreshCandidateRuntimeBudget } from '../src/lib/controlledFreshCandidatePilotContract'
import { CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS } from '../src/lib/controlledFreshCandidateCreation'
import {
  CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION,
  runControlledFreshCandidateRuntime,
} from './controlled-fresh-candidate-runtime'
import {
  buildControlledFreshCandidateExecutionEnvironment,
  loadControlledFreshCandidateConfigurationEnvironment,
  resolveControlledFreshCandidateOperationPackage,
  loadControlledFreshCandidateReleaseAttestation,
  assertControlledFreshCandidateNoAmbientPgOverrides,
} from './controlled-fresh-candidate-secret-loader'
import {
  consumeControlledFreshCandidateOwnerAuthorization,
  controlledFreshCandidateCanonicalRepositoryCommit,
} from './controlled-fresh-candidate-owner-authorization'

export const CONTROLLED_FRESH_CANDIDATE_LAUNCH_CONFIRMATION =
  '--confirm-controlled-fresh-candidate-one-shot-execution' as const
function parseArgs(argv: readonly string[]): { operationId: string } | null {
  if (argv.length !== 2 || new Set(argv).size !== 2) return null
  const operation = argv.find((arg) => arg.startsWith('--operation='))?.slice('--operation='.length)
  if (!operation || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(operation)) return null
  if (!argv.includes(CONTROLLED_FRESH_CANDIDATE_LAUNCH_CONFIRMATION)) return null
  return { operationId: operation }
}

function refused(budget: ControlledFreshCandidateRuntimeBudget, consumptionStarted = false): void {
  if (consumptionStarted) budget.markUncertain()
  console.log(JSON.stringify({
    version: 'controlled-fresh-candidate-launcher-result/v1',
    status: consumptionStarted ? 'UNKNOWN_OUTCOME_RECOVERY_REQUIRED' : 'REFUSED',
    runtimeBudget: budget.report(),
    eligibleForPublishing: false,
  }))
}

function remainingRuntimeMs(deadlineAt: number): number {
  const remaining = deadlineAt - Date.now()
  if (!Number.isSafeInteger(remaining) || remaining <= 0) throw new Error('controlled_launcher_deadline')
  return remaining
}

export async function runControlledFreshCandidateLauncher(argv: readonly string[]): Promise<number> {
  const startedAt = Date.now()
  const deadlineAt = startedAt + CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS
  let consumptionStarted = false
  const budget = createControlledFreshCandidateRuntimeBudget()
  if (process.platform !== 'linux') { refused(budget); return 2 }
  const decision = parseArgs(argv)
  const commit = controlledFreshCandidateCanonicalRepositoryCommit()
  if (!decision || !commit) { refused(budget); return 2 }
  try {
    assertControlledFreshCandidateNoAmbientPgOverrides()
    budget.setup()
    const packageResult = await resolveControlledFreshCandidateOperationPackage({
      operationId: decision.operationId,
      timeoutMs: Math.min(remainingRuntimeMs(deadlineAt), 30_000),
    })
    if (packageResult.runtimeCommitIdentity !== commit) throw new Error('controlled_launcher_commit_mismatch')
    budget.setup()
    const releaseAttestation = await loadControlledFreshCandidateReleaseAttestation({ packageResult,
      authorizationState: 'available', timeoutMs: Math.min(remainingRuntimeMs(deadlineAt), 30_000) })
    budget.setup()
    const configurationEnvironment = loadControlledFreshCandidateConfigurationEnvironment({ deployedCommitIdentity: releaseAttestation.sourceCommit })
    budget.setup()
    const executionEnvironment = await buildControlledFreshCandidateExecutionEnvironment({
      configurationEnvironment,
      packageResult,
      authorizationState: 'available',
      releaseAttestation,
      timeoutMs: Math.min(remainingRuntimeMs(deadlineAt), 30_000),
    })
    remainingRuntimeMs(deadlineAt)
    budget.setup()
    consumptionStarted = true
    consumeControlledFreshCandidateOwnerAuthorization(packageResult)
    remainingRuntimeMs(deadlineAt)
    return await runControlledFreshCandidateRuntime({
      argv: [CONTROLLED_FRESH_CANDIDATE_CREATE_CONFIRMATION],
      executionEnvironment,
      deadlineAt,
      runtimeBudget: budget,
    })
  } catch {
    refused(budget, consumptionStarted)
    return 3
  }
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false
if (isMain) {
  process.exitCode = 1
  void runControlledFreshCandidateLauncher(process.argv.slice(2))
    .then((code) => { process.exitCode = code })
    .catch(() => { process.exitCode = 1 })
}
