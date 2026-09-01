import { pathToFileURL } from 'node:url'

import {
  CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT,
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
} from './controlled-fresh-candidate-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_SECRET_CONTRACT_VERSION = 'controlled-fresh-candidate-secret-contract/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_CONFIRMATION = '--readiness' as const

export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST = Object.freeze([
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'BLOB_READ_WRITE_TOKEN',
  'NEXT_PUBLIC_SERVER_URL',
  'PAYLOAD_DB_PUSH',
  'PAYLOAD_DROP_DATABASE',
] as const)

export type ControlledFreshCandidateRuntimeEnvironmentName =
  (typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST)[number]
export type ControlledFreshCandidateSecretStatus = 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'

export type ControlledFreshCandidateSecretReadinessReport = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_SECRET_CONTRACT_VERSION
  ready: boolean
  variables: Record<ControlledFreshCandidateRuntimeEnvironmentName, ControlledFreshCandidateSecretStatus>
}

function status(value: string | undefined): ControlledFreshCandidateSecretStatus {
  if (value === undefined) return 'ABSENT'
  return value.length === 0 ? 'PRESENT_EMPTY' : 'PRESENT_NONEMPTY'
}

export function controlledFreshCandidateSecretReadiness(
  environment: NodeJS.ProcessEnv,
): ControlledFreshCandidateSecretReadinessReport {
  const variables = Object.fromEntries(
    CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.map((name) => [name, status(environment[name])]),
  ) as ControlledFreshCandidateSecretReadinessReport['variables']
  const valuesArePresent = Object.values(variables).every((value) => value === 'PRESENT_NONEMPTY')
  const fixedValuesAreSafe = environment[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV]
      === CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
    && environment.PAYLOAD_DB_PUSH === 'false'
    && environment.PAYLOAD_DROP_DATABASE === 'false'
  return {
    version: CONTROLLED_FRESH_CANDIDATE_SECRET_CONTRACT_VERSION,
    ready: valuesArePresent && fixedValuesAreSafe,
    variables,
  }
}

export function buildControlledFreshCandidateChildEnvironment(
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const child: NodeJS.ProcessEnv = Object.create(null) as NodeJS.ProcessEnv
  for (const name of CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST) {
    const value = environment[name]
    if (value !== undefined) child[name] = value
  }
  child[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV] = CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
  child.PAYLOAD_DB_PUSH = 'false'
  child.PAYLOAD_DROP_DATABASE = 'false'
  return child
}

export function controlledFreshCandidateSecretReadinessUsage(): string {
  return [
    'Controlled Fresh Candidate Secret Readiness',
    '',
    `  ${CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_CONFIRMATION}`,
    '  --help',
    '',
    'Reports variable names and ABSENT/PRESENT_EMPTY/PRESENT_NONEMPTY only.',
    'It does not load .env files, connect to a network, or print values.',
  ].join('\n')
}

export function runControlledFreshCandidateSecretReadiness(
  argv: readonly string[],
  environment: NodeJS.ProcessEnv,
  write: (text: string) => void = (text) => console.log(text),
): number {
  if (argv.length === 1 && argv[0] === '--help') {
    write(controlledFreshCandidateSecretReadinessUsage())
    return 0
  }
  if (argv.length !== 1 || argv[0] !== CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_CONFIRMATION) {
    write('CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_REFUSED')
    return 2
  }
  const report = controlledFreshCandidateSecretReadiness(environment)
  write(JSON.stringify(report))
  return report.ready ? 0 : 3
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  process.exitCode = runControlledFreshCandidateSecretReadiness(process.argv.slice(2), process.env)
}
