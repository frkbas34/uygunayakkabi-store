import { checkServerIdentity } from 'node:tls'
type SecureLoaderBoundary = {
  assertNoAmbientOverrides(): void
  isCanonical(value: unknown): value is string
  validatedConnection(uri: string): Readonly<{ normalizedUri: string }>
}
let secureLoaderBoundary: SecureLoaderBoundary | null = null
export function installControlledFreshCandidateSecureLoaderBoundary(boundary: SecureLoaderBoundary): void {
  if (secureLoaderBoundary) throw new Error('CONTROLLED_SECURE_LOADER_BOUNDARY_REPLACEMENT_FORBIDDEN')
  secureLoaderBoundary = Object.freeze({ ...boundary })
}
export function controlledFreshCandidateDatabaseUriIsCanonical(value: unknown): value is string {
  return secureLoaderBoundary?.isCanonical(value) ?? false
}
const validatedConfiguration = Symbol('controlled validated pg configuration')
const configurations = new WeakMap<object, string>()
export type ControlledFreshCandidateValidatedPgConfig = Record<string, unknown> & {
  readonly [validatedConfiguration]: object
}

export const CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM = 'SCRAM-SHA-256-PLUS' as const
export const CONTROLLED_FRESH_CANDIDATE_CONNECTION_TIMEOUT_MS = 10_000

export type ControlledFreshCandidatePgSecurityHooks = {
  clientConstructed?(): void
  connectionAttempted?(): void
  sql?(query: unknown): void
  channelBindingConfirmed?(): void
  securityRejected?(): void
}

type SaslMessage = { mechanisms: readonly string[] }

type PgClientInternals = {
  connection: { emit(event: 'error', error: Error): boolean; stream?: { destroy(): unknown } }
  saslSession?: { mechanism?: unknown } | null
  _handleAuthSASL(message: SaslMessage): void
  _handleAuthSASLContinue?(message: unknown): unknown
  _handleAuthSASLFinal?(message: unknown): unknown
  connect(...args: unknown[]): unknown
  query(...args: unknown[]): unknown
}

export type ControlledFreshCandidatePgClientConstructor = {
  new(config: Record<string, unknown>): PgClientInternals
  readonly prototype: PgClientInternals
}

function fail(code: string): never {
  throw new Error(code)
}

export function controlledFreshCandidateSecurePgConfig(
  connectionString: string,
  overrides: Record<string, unknown> = {},
): ControlledFreshCandidateValidatedPgConfig {
  if (!secureLoaderBoundary) fail('CONTROLLED_SECURE_LOADER_BOUNDARY_MISSING')
  secureLoaderBoundary.assertNoAmbientOverrides()
  const allowed = new Set(['connectionString', 'connectionTimeoutMillis', 'enableChannelBinding', 'keepAlive', 'ssl',
    'Client', 'max', 'min', 'idleTimeoutMillis', 'statement_timeout', 'query_timeout', 'lock_timeout',
    'idle_in_transaction_session_timeout', 'application_name', 'maxUses', 'allowExitOnIdle', 'maxLifetimeSeconds', 'Promise'])
  if (Object.keys(overrides).some((key) => !allowed.has(key))) fail('CONTROLLED_RUNTIME_STARTUP_OVERRIDE_FORBIDDEN')
  const token = (overrides as Record<symbol, unknown>)[validatedConfiguration]
  if (token && typeof token === 'object') {
    if (configurations.get(token) !== connectionString) fail('CONTROLLED_RUNTIME_DATABASE_URI_POLICY_INVALID')
    return { ...overrides, [validatedConfiguration]: token, connectionString, enableChannelBinding: true, keepAlive: false,
      ssl: Object.freeze({ rejectUnauthorized: true, checkServerIdentity }) }
  }
  const validated = secureLoaderBoundary.validatedConnection(connectionString)
  const brand = Object.freeze({})
  configurations.set(brand, validated.normalizedUri)
  return {
    ...overrides,
    // Enumerable symbols survive the installed pg-pool Object.assign clone.
    [validatedConfiguration]: brand,
    connectionString: validated.normalizedUri,
    connectionTimeoutMillis: CONTROLLED_FRESH_CANDIDATE_CONNECTION_TIMEOUT_MS,
    enableChannelBinding: true,
    keepAlive: false,
    ssl: Object.freeze({
      rejectUnauthorized: true,
      checkServerIdentity,
    }),
  }
}

export function createControlledFreshCandidateSecurePgClientConstructor<T extends ControlledFreshCandidatePgClientConstructor>(
  BaseClient: T,
  hooks: ControlledFreshCandidatePgSecurityHooks = {},
): T {
  if (
    typeof BaseClient !== 'function'
    || typeof BaseClient.prototype?._handleAuthSASL !== 'function'
    || typeof BaseClient.prototype?.connect !== 'function'
    || typeof BaseClient.prototype?.query !== 'function'
  ) fail('CONTROLLED_RUNTIME_CHANNEL_BINDING_BOUNDARY_UNSUPPORTED')

  class ControlledSecurePgClient extends BaseClient {
    private securityFailure: Error | null = null
    private authenticationVerified = false
    constructor(config: Record<string, unknown>) {
      hooks.clientConstructed?.()
      const connectionString = config.connectionString
      if (typeof connectionString !== 'string') fail('CONTROLLED_RUNTIME_DATABASE_URI_POLICY_INVALID')
      super(controlledFreshCandidateSecurePgConfig(connectionString, config))
      const connection = this.connection as { emit(event: string, ...args: unknown[]): boolean }
      const emit = connection.emit.bind(connection)
      connection.emit = (event, ...args) => {
        if (event !== 'error') return emit(event, ...args)
        const supplied = args[0]
        const safe = supplied instanceof Error && /^CONTROLLED_RUNTIME_[A-Z_]+$/u.test(supplied.message)
          ? supplied : new Error('CONTROLLED_RUNTIME_CONNECTION_REJECTED')
        this.securityFailure ??= safe
        try { hooks.securityRejected?.() } catch { /* sticky rejected state */ }
        try { this.connection.stream?.destroy() } catch { /* sticky uncertainty; never disclose transport errors */ }
        try { return emit('error', safe) } catch { return false }
      }
    }

    private rejectAuthentication(code: string): void {
      if (this.securityFailure) return
      const error = new Error(code)
      this.securityFailure = error
      try { hooks.securityRejected?.() } catch { /* rejection remains sticky */ }
      // Installed pg's connection listener settles Client.connect(). Never let
      // an EventEmitter listener exception escape the authentication dispatch.
      try { this.connection.emit('error', error) } catch { /* no raw callback throw */ }
      try { this.connection.stream?.destroy() } catch { /* cleanup reports uncertainty */ }
    }

    _handleAuthSASL(message: SaslMessage): void {
      if (
        !Array.isArray(message?.mechanisms)
        || !message.mechanisms.includes(CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM)
      ) {
        this.rejectAuthentication('CONTROLLED_RUNTIME_CHANNEL_BINDING_REQUIRED')
        return
      }
      try { BaseClient.prototype._handleAuthSASL.call(this, message) } catch {
        this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID')
        return
      }
      if (this.saslSession?.mechanism !== CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM) {
        this.rejectAuthentication('CONTROLLED_RUNTIME_CHANNEL_BINDING_DOWNGRADE_REJECTED')
        return
      }
    }

    _handleAuthCleartextPassword(): void { this.rejectAuthentication('CONTROLLED_RUNTIME_CHANNEL_BINDING_REQUIRED') }
    _handleAuthMD5Password(): void { this.rejectAuthentication('CONTROLLED_RUNTIME_CHANNEL_BINDING_REQUIRED') }

    _handleAuthSASLContinue(message: unknown): void {
      if (this.securityFailure) return
      if (this.saslSession?.mechanism !== CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM
        || typeof BaseClient.prototype._handleAuthSASLContinue !== 'function') {
        this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID'); return
      }
      try {
        Promise.resolve(BaseClient.prototype._handleAuthSASLContinue.call(this, message))
          .catch(() => this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID'))
      } catch { this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID') }
    }

    _handleAuthSASLFinal(message: unknown): void {
      if (this.securityFailure) return
      if (this.saslSession?.mechanism !== CONTROLLED_FRESH_CANDIDATE_REQUIRED_SASL_MECHANISM
        || typeof BaseClient.prototype._handleAuthSASLFinal !== 'function') {
        this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID'); return
      }
      try {
        BaseClient.prototype._handleAuthSASLFinal.call(this, message)
        if (!this.securityFailure && this.saslSession === null) { this.authenticationVerified = true; hooks.channelBindingConfirmed?.() }
        else this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID')
      } catch { this.rejectAuthentication('CONTROLLED_RUNTIME_SASL_STATE_INVALID') }
    }

    connect(...args: unknown[]): unknown {
      if (this.securityFailure) return Promise.reject(this.securityFailure)
      hooks.connectionAttempted?.()
      return BaseClient.prototype.connect.apply(this, args)
    }

    query(...args: unknown[]): unknown {
      if (this.securityFailure) throw new Error('CONTROLLED_RUNTIME_AUTHENTICATION_REJECTED')
      if (!this.authenticationVerified) throw new Error('CONTROLLED_RUNTIME_CHANNEL_BINDING_NOT_CONFIRMED')
      hooks.sql?.(typeof args[0] === 'string' ? { text: args[0], values: args[1] ?? [] } : args[0])
      return BaseClient.prototype.query.apply(this, args)
    }
  }

  return ControlledSecurePgClient as T
}
