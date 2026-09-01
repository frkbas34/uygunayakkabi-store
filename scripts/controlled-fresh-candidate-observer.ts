import { pathToFileURL } from 'node:url'

import { authenticateControlledFreshCandidateObservation } from '../src/lib/controlledFreshCandidateObservation'
import { createControlledFreshCandidateOperationScope } from '../src/lib/controlledFreshCandidateCreation'
import {
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  readControlledFreshCandidateObservationFile,
} from './controlled-fresh-candidate-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_OBSERVER_CONFIRMATION = '--observe' as const

export function controlledFreshCandidateObserverUsage(): string {
  return [
    'Controlled Fresh Candidate Read-Only Observer',
    '',
    `  ${CONTROLLED_FRESH_CANDIDATE_OBSERVER_CONFIRMATION} --operation=<immutable-operation-id>`,
    '  --help',
    '',
    'Reads one operation-bound local snapshot. It has no runtime control or mutation command.',
  ].join('\n')
}

export function parseControlledFreshCandidateObserverArgs(argv: readonly string[]):
  | { ok: true; help: true }
  | { ok: true; help: false; operationId: string }
  | { ok: false } {
  if (argv.length === 1 && argv[0] === '--help') return { ok: true, help: true }
  if (argv.length !== 2 || argv[0] !== CONTROLLED_FRESH_CANDIDATE_OBSERVER_CONFIRMATION) return { ok: false }
  const match = argv[1]?.match(/^--operation=([a-z0-9][a-z0-9:_-]{7,127})$/iu)
  return match?.[1] ? { ok: true, help: false, operationId: match[1] } : { ok: false }
}

export async function runControlledFreshCandidateObserver(params: {
  argv: readonly string[]
  environment: NodeJS.ProcessEnv
  write?: (text: string) => void
  writeError?: (text: string) => void
}): Promise<number> {
  const write = params.write ?? ((text: string) => console.log(text))
  const writeError = params.writeError ?? ((text: string) => console.error(text))
  const decision = parseControlledFreshCandidateObserverArgs(params.argv)
  if (decision.ok && decision.help) {
    write(controlledFreshCandidateObserverUsage())
    return 0
  }
  if (!decision.ok) {
    writeError('CONTROLLED_FRESH_CANDIDATE_OBSERVER_REFUSED')
    return 2
  }
  if (process.platform !== 'linux') {
    writeError('CONTROLLED_FRESH_CANDIDATE_OBSERVER_REFUSED: POSIX_RUNTIME_REQUIRED')
    return 2
  }
  const observationPath = params.environment[CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV]
  const keyText = params.environment[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]
  if (!observationPath || !keyText) {
    writeError('CONTROLLED_FRESH_CANDIDATE_OBSERVER_UNAVAILABLE')
    return 3
  }
  let key: Buffer
  try {
    key = Buffer.from(keyText, 'base64')
    if (key.byteLength < 32 || key.byteLength > 128 || key.toString('base64') !== keyText) throw new Error('invalid')
  } catch {
    writeError('CONTROLLED_FRESH_CANDIDATE_OBSERVER_UNAVAILABLE')
    return 3
  }
  const scope = createControlledFreshCandidateOperationScope({ timeoutMs: 5_000 })
  try {
    const report = authenticateControlledFreshCandidateObservation({
      bytes: await readControlledFreshCandidateObservationFile({
        scope,
        observationPath,
        expectedOperationId: decision.operationId,
      }),
      key,
      expectedOperationId: decision.operationId,
    })
    write(JSON.stringify(report))
    return report.outcome === 'CLOSED_SUCCESS' ? 0 : 4
  } catch {
    writeError('CONTROLLED_FRESH_CANDIDATE_OBSERVER_UNAVAILABLE')
    return 3
  } finally {
    try { await scope.cancel() } catch { /* read-only observer remains failed closed */ }
    try { await scope.drain() } catch { /* read-only observer remains failed closed */ }
    try { scope.close() } catch { /* read-only observer remains failed closed */ }
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  process.exitCode = 1
  void runControlledFreshCandidateObserver({ argv: process.argv.slice(2), environment: process.env })
    .then((code) => { process.exitCode = code })
    .catch(() => { process.exitCode = 1 })
}
