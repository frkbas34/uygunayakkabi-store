import { pathToFileURL } from 'node:url'

import {
  createControlledFreshCandidateOperationScope,
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
  initializeCreation?: (scope: ControlledFreshCandidateOperationScope) => Promise<ControlledFreshCandidateRuntimeResource>
  initializeVerification?: (scope: ControlledFreshCandidateOperationScope) => Promise<ControlledFreshCandidateVerificationResource>
  operationTimeoutMs?: number
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

export async function runControlledFreshCandidateRuntime(
  options: ControlledFreshCandidateRuntimeOptions,
): Promise<number> {
  const io = options.io ?? defaultIo
  const decision = parseControlledFreshCandidateRuntimeArgs(options.argv)
  if (decision.ok && decision.helpRequested) {
    io.stdout(controlledFreshCandidateRuntimeUsage())
    return 0
  }
  if (!decision.ok) {
    io.stderr(`CONTROLLED_FRESH_CANDIDATE_REFUSED: ${decision.code}`)
    io.stdout(controlledFreshCandidateRuntimeUsage())
    return 2
  }

  if (process.platform !== 'linux') {
    io.stderr('CONTROLLED_FRESH_CANDIDATE_REFUSED: POSIX_RUNTIME_REQUIRED')
    return 2
  }

  process.env.PAYLOAD_DB_PUSH = 'false'
  process.env.PAYLOAD_DROP_DATABASE = 'false'
  if (
    process.env.PAYLOAD_DB_PUSH !== 'false'
    || process.env.PAYLOAD_DROP_DATABASE !== 'false'
  ) {
    io.stderr('CONTROLLED_FRESH_CANDIDATE_REFUSED: DATABASE_MANAGEMENT_DISABLED_REQUIRED')
    return 2
  }

  if (decision.mode === 'create') {
    const scope = createControlledFreshCandidateOperationScope({ timeoutMs: options.operationTimeoutMs })
    let resource: ControlledFreshCandidateRuntimeResource | null = null
    try {
      resource = await scope.run(() => (options.initializeCreation ?? initializeControlledFreshCandidateCreationRuntime)(scope))
      if (resource.scope !== scope) throw new Error('controlled_runtime_scope_mismatch')
      const report = await executeControlledCreationResource(resource)
      const terminal = await resource.destroy()
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
      io.stdout(JSON.stringify(report))
      return creationExitCode(report)
    } catch {
      if (resource) {
        try { await resource.destroy() } catch { /* sanitized terminal failure */ }
      }
      try { await scope.cancel() } catch { /* sanitized terminal failure */ }
      try { await scope.drain() } catch { /* terminal uncertainty remains non-successful */ }
      try { scope.close() } catch { /* terminal uncertainty remains non-successful */ }
      try { resource?.failObservation() } catch { /* observation failure is sticky */ }
      try { resource?.closeObservation() } catch { /* sanitized observation closure */ }
      io.stderr('CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE')
      return 1
    }
  }

  const scope = createControlledFreshCandidateOperationScope({ timeoutMs: options.operationTimeoutMs })
  let resource: ControlledFreshCandidateVerificationResource | null = null
  try {
    resource = await scope.run(() => (options.initializeVerification ?? initializeControlledFreshCandidateVerificationRuntime)(scope))
    if (resource.scope !== scope) throw new Error('controlled_runtime_scope_mismatch')
    const report = await verifyControlledFreshCandidateTarget({
      capability: resource.capability,
      dependencies: resource.dependencies,
    })
    const terminal = await resource.destroy()
    await scope.cancel()
    await scope.drain()
    if (!terminal.ok) throw new Error('controlled_runtime_terminalization_failed')
    scope.close()
    resource.completeObservation(report, terminal.ok)
    resource.closeObservation()
    resource = null
    io.stdout(JSON.stringify(report))
    return verificationExitCode(report)
  } catch {
    if (resource) {
      try { await resource.destroy() } catch { /* sanitized terminal failure */ }
    }
    try { await scope.cancel() } catch { /* sanitized terminal failure */ }
    try { await scope.drain() } catch { /* terminal uncertainty remains non-successful */ }
    try { scope.close() } catch { /* terminal uncertainty remains non-successful */ }
    try { resource?.failObservation() } catch { /* observation failure is sticky */ }
    try { resource?.closeObservation() } catch { /* sanitized observation closure */ }
    io.stderr('CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE')
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
