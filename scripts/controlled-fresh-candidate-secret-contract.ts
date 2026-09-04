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
import {
  CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL,
  CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY,
  loadControlledFreshCandidateConfigurationEnvironment,
  validateControlledFreshCandidateEmptyLedger,
} from './controlled-fresh-candidate-secret-loader'

export const CONTROLLED_FRESH_CANDIDATE_SECRET_CONTRACT_VERSION =
  'controlled-fresh-candidate-secret-contract/v2' as const
export const CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_CONFIRMATION = '--readiness' as const
export const CONTROLLED_FRESH_CANDIDATE_READINESS_STAGES = ['configuration', 'execution'] as const
export type ControlledFreshCandidateReadinessStage =
  (typeof CONTROLLED_FRESH_CANDIDATE_READINESS_STAGES)[number]

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

const OPERATION_BOUND_ENVIRONMENT_NAMES = new Set<string>([
    CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
    CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
    CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
])

export const CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST = Object.freeze(
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.filter((name) => (
    !OPERATION_BOUND_ENVIRONMENT_NAMES.has(name)
  )),
)

export type ControlledFreshCandidateRuntimeEnvironmentName =
  (typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST)[number]
export type ControlledFreshCandidateSecretStatus = 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'
export type ControlledFreshCandidateRequirementStatus = 'REQUIRED' | 'NOT_REQUIRED'

export type ControlledFreshCandidateReadinessVariable = {
  presence: ControlledFreshCandidateSecretStatus
  requirement: ControlledFreshCandidateRequirementStatus
}

export type ControlledFreshCandidateSecretReadinessReport = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_SECRET_CONTRACT_VERSION
  stage: ControlledFreshCandidateReadinessStage
  configurationReady: boolean
  executionReady: boolean
  readyForSelectedStage: boolean
  candidateSelected: boolean
  packagePrepared: boolean
  authorizationCreated: boolean
  additionalVariablesPresent: boolean
  variables: Record<ControlledFreshCandidateRuntimeEnvironmentName, ControlledFreshCandidateReadinessVariable>
  eligibleForPublishing: false
}

function status(value: string | undefined): ControlledFreshCandidateSecretStatus {
  if (value === undefined) return 'ABSENT'
  return value.length === 0 ? 'PRESENT_EMPTY' : 'PRESENT_NONEMPTY'
}

function exactFullGitSha(value: string | undefined): boolean {
  return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value)
}

export function controlledFreshCandidateSecretReadiness(
  environment: Readonly<Record<string, string | undefined>>,
  options: {
    stage: ControlledFreshCandidateReadinessStage
    ledgerReady: boolean
    operationPackageAuthenticated?: boolean
  },
): ControlledFreshCandidateSecretReadinessReport {
  const configurationNames = new Set<string>(CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST)
  const selectedNames = options.stage === 'configuration'
    ? configurationNames
    : new Set<string>(CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST)
  const variables = Object.fromEntries(
    CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.map((name) => [name, {
      presence: status(environment[name]),
      requirement: selectedNames.has(name) ? 'REQUIRED' : 'NOT_REQUIRED',
    }]),
  ) as ControlledFreshCandidateSecretReadinessReport['variables']
  const allowedNames = new Set<string>(CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST)
  const additionalVariablesPresent = Object.keys(environment).some((name) => !allowedNames.has(name))
  const configurationValuesPresent = CONTROLLED_FRESH_CANDIDATE_CONFIGURATION_ENVIRONMENT_ALLOWLIST.every(
    (name) => variables[name].presence === 'PRESENT_NONEMPTY',
  )
  const fixedValuesAreSafe = environment[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV]
      === CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
    && environment[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
      === CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY
    && environment.NEXT_PUBLIC_SERVER_URL === CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL
    && environment.PAYLOAD_DB_PUSH === 'false'
    && environment.PAYLOAD_DROP_DATABASE === 'false'
    && exactFullGitSha(environment[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV])
  const configurationReady = configurationValuesPresent
    && fixedValuesAreSafe
    && options.ledgerReady
    && !additionalVariablesPresent
  const executionValuesPresent = CONTROLLED_FRESH_CANDIDATE_RUNTIME_ENVIRONMENT_ALLOWLIST.every(
    (name) => variables[name].presence === 'PRESENT_NONEMPTY',
  )
  const operationPackageAuthenticated = options.operationPackageAuthenticated === true
  const executionReady = configurationReady
    && executionValuesPresent
    && operationPackageAuthenticated
  return {
    version: CONTROLLED_FRESH_CANDIDATE_SECRET_CONTRACT_VERSION,
    stage: options.stage,
    configurationReady,
    executionReady,
    readyForSelectedStage: options.stage === 'configuration' ? configurationReady : executionReady,
    candidateSelected: operationPackageAuthenticated,
    packagePrepared: operationPackageAuthenticated,
    authorizationCreated: operationPackageAuthenticated,
    additionalVariablesPresent,
    variables,
    eligibleForPublishing: false,
  }
}

export function controlledFreshCandidateSecretReadinessUsage(): string {
  return [
    'Controlled Fresh Candidate Secret Readiness',
    '',
    '  --readiness --stage=configuration',
    '  --readiness --stage=execution',
    '  --help',
    '',
    'Configuration mode uses the canonical native-WSL secret loader.',
    'Execution mode remains false until an authenticated operation package is supplied programmatically.',
    'Output contains fixed statuses, booleans, variable names, and presence states only.',
  ].join('\n')
}

export function parseControlledFreshCandidateSecretReadinessArgs(argv: readonly string[]):
  | { ok: true; help: true; stage: null }
  | { ok: true; help: false; stage: ControlledFreshCandidateReadinessStage }
  | { ok: false } {
  if (argv.length === 1 && argv[0] === '--help') return { ok: true, help: true, stage: null }
  if (argv.length !== 2 || new Set(argv).size !== 2 || !argv.includes('--readiness')) return { ok: false }
  if (argv.includes('--stage=configuration')) return { ok: true, help: false, stage: 'configuration' }
  if (argv.includes('--stage=execution')) return { ok: true, help: false, stage: 'execution' }
  return { ok: false }
}

export function runControlledFreshCandidateSecretReadiness(params: {
  argv: readonly string[]
  environment: Readonly<Record<string, string | undefined>>
  ledgerReady: boolean
  operationPackageAuthenticated?: boolean
  write?: (text: string) => void
}): number {
  const write = params.write ?? ((text: string) => console.log(text))
  const decision = parseControlledFreshCandidateSecretReadinessArgs(params.argv)
  if (decision.ok && decision.help) {
    write(controlledFreshCandidateSecretReadinessUsage())
    return 0
  }
  if (!decision.ok) {
    write('CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_REFUSED')
    return 2
  }
  const report = controlledFreshCandidateSecretReadiness(params.environment, {
    stage: decision.stage,
    ledgerReady: params.ledgerReady,
    operationPackageAuthenticated: params.operationPackageAuthenticated,
  })
  write(JSON.stringify(report))
  return report.readyForSelectedStage ? 0 : 3
}

async function runMain(): Promise<number> {
  const decision = parseControlledFreshCandidateSecretReadinessArgs(process.argv.slice(2))
  if (decision.ok && decision.help) {
    console.log(controlledFreshCandidateSecretReadinessUsage())
    return 0
  }
  if (!decision.ok) {
    console.log('CONTROLLED_FRESH_CANDIDATE_SECRET_READINESS_REFUSED')
    return 2
  }
  let environment: NodeJS.ProcessEnv = Object.create(null) as NodeJS.ProcessEnv
  let ledgerReady = false
  if (decision.stage === 'configuration') {
    try {
      const deployedCommitIdentity = process.env[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
      environment = loadControlledFreshCandidateConfigurationEnvironment({
        deployedCommitIdentity: deployedCommitIdentity ?? '',
      })
      ledgerReady = validateControlledFreshCandidateEmptyLedger()
    } catch {
      environment = Object.create(null) as NodeJS.ProcessEnv
      ledgerReady = false
    }
  }
  return runControlledFreshCandidateSecretReadiness({
    argv: process.argv.slice(2),
    environment,
    ledgerReady,
  })
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  process.exitCode = 1
  void runMain()
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
