import { pathToFileURL } from 'node:url'

import type { ControlledFreshCandidatePublicReport } from '../src/lib/controlledFreshCandidateCreation'
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
  initializeCreation?: () => Promise<ControlledFreshCandidateRuntimeResource>
  initializeVerification?: () => Promise<ControlledFreshCandidateVerificationResource>
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

  if (process.env.PAYLOAD_DB_PUSH !== 'false') {
    process.env.PAYLOAD_DB_PUSH = 'false'
  }
  if (process.env.PAYLOAD_DB_PUSH !== 'false') {
    io.stderr('CONTROLLED_FRESH_CANDIDATE_REFUSED: PAYLOAD_DB_PUSH_FALSE_REQUIRED')
    return 2
  }

  if (decision.mode === 'create') {
    let resource: ControlledFreshCandidateRuntimeResource | null = null
    try {
      resource = await (options.initializeCreation ?? initializeControlledFreshCandidateCreationRuntime)()
      const report = await executeControlledCreationResource(resource)
      io.stdout(JSON.stringify(report))
      await resource.destroy()
      return creationExitCode(report)
    } catch {
      if (resource) {
        try { await resource.destroy() } catch { /* sanitized terminal failure */ }
      }
      io.stderr('CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE')
      return 1
    }
  }

  let resource: ControlledFreshCandidateVerificationResource | null = null
  try {
    resource = await (options.initializeVerification ?? initializeControlledFreshCandidateVerificationRuntime)()
    const report = await verifyControlledFreshCandidateTarget({
      capability: resource.capability,
      dependencies: resource.dependencies,
    })
    io.stdout(JSON.stringify(report))
    await resource.destroy()
    return verificationExitCode(report)
  } catch {
    if (resource) {
      try { await resource.destroy() } catch { /* sanitized terminal failure */ }
    }
    io.stderr('CONTROLLED_FRESH_CANDIDATE_INTERNAL_FAILURE')
    return 1
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  void runControlledFreshCandidateRuntime({ argv: process.argv.slice(2) })
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
