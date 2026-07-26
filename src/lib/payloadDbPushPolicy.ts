export type PayloadDbPushEnvironment =
  | 'vercel_production'
  | 'vercel_preview'
  | 'vercel_development'
  | 'vercel_unknown'
  | 'ci'
  | 'production'
  | 'build'
  | 'test'
  | 'read_only'
  | 'local_development'
  | 'unknown'

export type PayloadDbPushReason =
  | 'default_disabled'
  | 'explicitly_disabled'
  | 'local_development_explicitly_enabled'

export type PayloadDbPushErrorCode =
  | 'invalid_value'
  | 'unsafe_environment'
  | 'missing_local_confirmation'

export interface PayloadDbPushPolicy {
  enabled: boolean
  environment: PayloadDbPushEnvironment
  reason: PayloadDbPushReason
}

export interface PayloadDbPushPolicyInput {
  env?: Record<string, string | undefined>
  argv?: readonly string[]
}

const LOCAL_CONFIRMATION = 'ALLOW_LOCAL_SCHEMA_MUTATION'

export class PayloadDbPushPolicyError extends Error {
  readonly code: PayloadDbPushErrorCode
  readonly environment: PayloadDbPushEnvironment

  constructor(code: PayloadDbPushErrorCode, environment: PayloadDbPushEnvironment) {
    super(`Payload database schema push configuration refused (${code}; ${environment}).`)
    this.name = 'PayloadDbPushPolicyError'
    this.code = code
    this.environment = environment
  }
}

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function isCiActive(value: string | undefined): boolean {
  if (!hasValue(value)) return false
  return value !== 'false' && value !== '0'
}

function isReadOnlyProcess(
  env: Record<string, string | undefined>,
  argv: readonly string[],
): boolean {
  if (argv.includes('--confirm-read-only')) return true
  if (env.READ_ONLY === 'true' || env.READ_ONLY === 'READ_ONLY') return true
  if (env.npm_lifecycle_event?.startsWith('smoke:')) return true

  return Object.entries(env).some(
    ([key, value]) => key.endsWith('_SMOKE_CONFIRM') && value === 'READ_ONLY',
  )
}

export function classifyPayloadDbPushEnvironment(
  env: Record<string, string | undefined>,
  argv: readonly string[] = [],
): PayloadDbPushEnvironment {
  const vercelDetected = hasValue(env.VERCEL) || hasValue(env.VERCEL_ENV) || hasValue(env.VERCEL_TARGET_ENV)
  if (vercelDetected) {
    const vercelEnvironment = env.VERCEL_ENV || env.VERCEL_TARGET_ENV
    if (vercelEnvironment === 'production') return 'vercel_production'
    if (vercelEnvironment === 'preview') return 'vercel_preview'
    if (vercelEnvironment === 'development') return 'vercel_development'
    return 'vercel_unknown'
  }

  if (isCiActive(env.CI)) return 'ci'
  if (env.NODE_ENV === 'production') return 'production'

  const lifecycle = env.npm_lifecycle_event || ''
  const nextPhase = env.NEXT_PHASE || ''
  if (lifecycle === 'build' || nextPhase.includes('build')) return 'build'
  if (env.NODE_ENV === 'test' || lifecycle === 'test' || lifecycle.startsWith('test:')) return 'test'
  if (isReadOnlyProcess(env, argv)) return 'read_only'
  if (env.NODE_ENV === 'development') return 'local_development'
  return 'unknown'
}

export function resolvePayloadDbPushPolicy(
  input: PayloadDbPushPolicyInput = {},
): PayloadDbPushPolicy {
  const env = input.env ?? process.env
  const argv = input.argv ?? process.argv
  const environment = classifyPayloadDbPushEnvironment(env, argv)
  const rawValue = env.PAYLOAD_DB_PUSH

  if (rawValue === undefined || rawValue.trim() === '') {
    return { enabled: false, environment, reason: 'default_disabled' }
  }

  if (rawValue === 'false') {
    return { enabled: false, environment, reason: 'explicitly_disabled' }
  }

  if (rawValue !== 'true') {
    throw new PayloadDbPushPolicyError('invalid_value', environment)
  }

  if (environment !== 'local_development') {
    throw new PayloadDbPushPolicyError('unsafe_environment', environment)
  }

  if (env.PAYLOAD_DB_PUSH_LOCAL_CONFIRM !== LOCAL_CONFIRMATION) {
    throw new PayloadDbPushPolicyError('missing_local_confirmation', environment)
  }

  return {
    enabled: true,
    environment,
    reason: 'local_development_explicitly_enabled',
  }
}
