import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto'

import {
  CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE,
  CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE,
  CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_MS,
  CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_VERSION,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY,
  controlledFreshCandidateCanonicalJson,
  controlledFreshCandidatePilotDigest,
} from './controlledFreshCandidatePilotContract'

const AUTHORIZATION_DOMAIN = 'uygunayakkabi:controlled-fresh-candidate:owner-authorization:v1'

export const CONTROLLED_FRESH_CANDIDATE_RELEASE_ATTESTATION_VERSION = 'controlled-fresh-candidate-release-attestation/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_VERCEL_PROJECT = 'prj_2eCrDWsYcYLMMY8AsHVIOxPh1gQr' as const
export const CONTROLLED_FRESH_CANDIDATE_CANONICAL_ALIAS = 'www.uygunayakkabi.com' as const
export const CONTROLLED_FRESH_CANDIDATE_RELEASE_VALIDITY_MS = 30 * 60 * 1_000
const RELEASE_DOMAIN = 'uygunayakkabi:controlled-fresh-candidate:release-attestation:v1\0'
export type ControlledFreshCandidateReleaseAttestation = Readonly<{
  version: typeof CONTROLLED_FRESH_CANDIDATE_RELEASE_ATTESTATION_VERSION
  sourceCommit: string
  vercelProject: typeof CONTROLLED_FRESH_CANDIDATE_VERCEL_PROJECT
  deploymentId: string
  environment: 'Production'
  state: 'READY'
  canonicalAlias: typeof CONTROLLED_FRESH_CANDIDATE_CANONICAL_ALIAS
  issuedAt: string
  verifiedAt: string
  expiresAt: string
  operationId: string
  packageDigest: string
  authorizationIdentity: string
  authorizationDigest: string
  signature: string
}>
const verifiedReleases = new WeakSet<object>()

export function controlledFreshCandidateReleaseSigningBytes(
  value: Omit<ControlledFreshCandidateReleaseAttestation, 'signature'>,
): Buffer {
  return Buffer.from(RELEASE_DOMAIN + controlledFreshCandidateCanonicalJson(value), 'utf8')
}

export function authenticateControlledFreshCandidateReleaseAttestation(
  value: unknown,
  trustedPublicKeyDerBase64: string,
  expected: { sourceCommit: string; operationId: string; packageDigest: string; authorizationIdentity: string; authorizationDigest: string; now?: number },
): ControlledFreshCandidateReleaseAttestation {
  if (!isPlainRecord(value) || !exactKeys(value, [
    'version', 'sourceCommit', 'vercelProject', 'deploymentId', 'environment', 'state',
    'canonicalAlias', 'issuedAt', 'verifiedAt', 'expiresAt', 'operationId',
    'packageDigest', 'authorizationIdentity', 'authorizationDigest', 'signature',
  ])) throw new Error('CONTROLLED_RELEASE_ATTESTATION_INVALID')
  const now = expected.now ?? Date.now()
  const issued = Date.parse(String(value.issuedAt))
  const verified = Date.parse(String(value.verifiedAt))
  const expires = Date.parse(String(value.expiresAt))
  if (value.version !== CONTROLLED_FRESH_CANDIDATE_RELEASE_ATTESTATION_VERSION
    || value.vercelProject !== CONTROLLED_FRESH_CANDIDATE_VERCEL_PROJECT
    || value.canonicalAlias !== CONTROLLED_FRESH_CANDIDATE_CANONICAL_ALIAS
    || value.environment !== 'Production' || value.state !== 'READY'
    || typeof value.deploymentId !== 'string' || !/^dpl_[a-zA-Z0-9]{8,100}$/u.test(value.deploymentId)
    || !/^[a-f0-9]{40}$/u.test(String(value.sourceCommit))
    || !exactTimestamp(value.issuedAt) || !exactTimestamp(value.verifiedAt) || !exactTimestamp(value.expiresAt)
    || issued > verified || verified > now || now >= expires
    || expires - issued > CONTROLLED_FRESH_CANDIDATE_RELEASE_VALIDITY_MS || expires <= verified
    || ['sourceCommit', 'operationId', 'packageDigest', 'authorizationIdentity', 'authorizationDigest']
      .some((key) => value[key] !== expected[key as keyof typeof expected])
    || typeof value.signature !== 'string' || !/^[a-zA-Z0-9+/]{86}==$/u.test(value.signature)
    || !/^[a-zA-Z0-9+/]{59}=$/u.test(trustedPublicKeyDerBase64)) {
    throw new Error('CONTROLLED_RELEASE_ATTESTATION_INVALID')
  }
  try {
    const key = createPublicKey({ key: Buffer.from(trustedPublicKeyDerBase64, 'base64'), format: 'der', type: 'spki' })
    const { signature, ...unsigned } = value as unknown as ControlledFreshCandidateReleaseAttestation
    if (key.asymmetricKeyType !== 'ed25519'
      || !verify(null, controlledFreshCandidateReleaseSigningBytes(unsigned), key, Buffer.from(signature, 'base64'))) {
      throw new Error('invalid signature')
    }
  } catch { throw new Error('CONTROLLED_RELEASE_ATTESTATION_INVALID') }
  const result = Object.freeze({ ...value }) as ControlledFreshCandidateReleaseAttestation
  verifiedReleases.add(result)
  return result
}

export function controlledFreshCandidateReleaseIsAuthenticated(value: ControlledFreshCandidateReleaseAttestation): boolean {
  return verifiedReleases.has(value) && Date.now() < Date.parse(value.expiresAt)
}

export type ControlledFreshCandidateOwnerAuthorization = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_VERSION
  authorizationIdentity: string
  operationId: string
  packageDigest: string
  candidateDigest: string
  runtimeBudgetIdentity: typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY
  creationEnvelopeDigest: string
  externalEffectEnvelopeDigest: string
  runtimeCommitIdentity: string
  environmentIdentity: string
  issuedAt: string
  notBefore: string
  expiresAt: string
  seal: string
}

export type ControlledFreshCandidateUnsignedOwnerAuthorization = Omit<
  ControlledFreshCandidateOwnerAuthorization,
  'authorizationIdentity' | 'seal'
>

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
}

function exactTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false
  const millis = Date.parse(value)
  return Number.isSafeInteger(millis) && new Date(millis).toISOString() === value
}

function keyBuffer(key: Uint8Array): Buffer {
  const result = Buffer.from(key)
  if (result.byteLength < 32 || result.byteLength > 128) {
    throw new Error('CONTROLLED_OWNER_AUTHORIZATION_KEY_INVALID')
  }
  return result
}

export function controlledFreshCandidateOwnerAuthorizationIdentity(
  authorization: ControlledFreshCandidateUnsignedOwnerAuthorization,
): string {
  return `cfc-owner-auth-${controlledFreshCandidatePilotDigest({
    domain: AUTHORIZATION_DOMAIN,
    authorization,
  })}`
}

function seal(
  authorization: Omit<ControlledFreshCandidateOwnerAuthorization, 'seal'>,
  key: Uint8Array,
): string {
  return createHmac('sha256', keyBuffer(key))
    .update(AUTHORIZATION_DOMAIN)
    .update('\0')
    .update(controlledFreshCandidateCanonicalJson(authorization))
    .digest('hex')
}

export function createControlledFreshCandidateOwnerAuthorization(params: {
  operationId: string
  packageDigest: string
  candidateDigest: string
  runtimeCommitIdentity: string
  environmentIdentity: string
  issuedAt: string
  notBefore: string
  expiresAt: string
  key: Uint8Array
}): ControlledFreshCandidateOwnerAuthorization {
  const unsigned: ControlledFreshCandidateUnsignedOwnerAuthorization = {
    version: CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_VERSION,
    operationId: params.operationId,
    packageDigest: params.packageDigest,
    candidateDigest: params.candidateDigest,
    runtimeBudgetIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY,
    creationEnvelopeDigest: controlledFreshCandidatePilotDigest(CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE),
    externalEffectEnvelopeDigest: controlledFreshCandidatePilotDigest(CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE),
    runtimeCommitIdentity: params.runtimeCommitIdentity,
    environmentIdentity: params.environmentIdentity,
    issuedAt: params.issuedAt,
    notBefore: params.notBefore,
    expiresAt: params.expiresAt,
  }
  const authorizationIdentity = controlledFreshCandidateOwnerAuthorizationIdentity(unsigned)
  const withoutSeal = { ...unsigned, authorizationIdentity }
  const authorization = { ...withoutSeal, seal: seal(withoutSeal, params.key) }
  if (!validateControlledFreshCandidateOwnerAuthorization(authorization, {
    key: params.key,
    observedAt: Date.parse(params.issuedAt),
  })) throw new Error('CONTROLLED_OWNER_AUTHORIZATION_INVALID')
  return authorization
}

export function validateControlledFreshCandidateOwnerAuthorization(
  value: unknown,
  params: {
    key: Uint8Array
    observedAt?: number
    previousObservedAt?: number
    expected?: Partial<Pick<ControlledFreshCandidateOwnerAuthorization,
      'operationId' | 'packageDigest' | 'candidateDigest' | 'runtimeCommitIdentity' | 'environmentIdentity'>>
  },
): value is ControlledFreshCandidateOwnerAuthorization {
  if (!isPlainRecord(value) || !exactKeys(value, [
    'version', 'authorizationIdentity', 'operationId', 'packageDigest', 'candidateDigest',
    'runtimeBudgetIdentity', 'creationEnvelopeDigest', 'externalEffectEnvelopeDigest',
    'runtimeCommitIdentity', 'environmentIdentity', 'issuedAt', 'notBefore', 'expiresAt', 'seal',
  ])) return false
  const issuedAt = Date.parse(String(value.issuedAt))
  const notBefore = Date.parse(String(value.notBefore))
  const expiresAt = Date.parse(String(value.expiresAt))
  const observedAt = params.observedAt ?? Date.now()
  if (
    value.version !== CONTROLLED_FRESH_CANDIDATE_OWNER_AUTHORIZATION_VERSION
    || typeof value.authorizationIdentity !== 'string' || !/^cfc-owner-auth-[0-9a-f]{64}$/u.test(value.authorizationIdentity)
    || typeof value.operationId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(value.operationId)
    || typeof value.packageDigest !== 'string' || !/^[0-9a-f]{64}$/u.test(value.packageDigest)
    || typeof value.candidateDigest !== 'string' || !/^[0-9a-f]{64}$/u.test(value.candidateDigest)
    || value.runtimeBudgetIdentity !== CONTROLLED_FRESH_CANDIDATE_RUNTIME_BUDGET_IDENTITY
    || value.creationEnvelopeDigest !== controlledFreshCandidatePilotDigest(CONTROLLED_FRESH_CANDIDATE_CREATION_ENVELOPE)
    || value.externalEffectEnvelopeDigest !== controlledFreshCandidatePilotDigest(CONTROLLED_FRESH_CANDIDATE_EXTERNAL_EFFECT_ENVELOPE)
    || typeof value.runtimeCommitIdentity !== 'string' || !/^[0-9a-f]{40}$/u.test(value.runtimeCommitIdentity)
    || typeof value.environmentIdentity !== 'string' || value.environmentIdentity.length < 1 || value.environmentIdentity.length > 160
    || typeof value.seal !== 'string' || !/^[0-9a-f]{64}$/u.test(value.seal)
    || !exactTimestamp(value.issuedAt) || !exactTimestamp(value.notBefore) || !exactTimestamp(value.expiresAt)
    || issuedAt > notBefore || notBefore > observedAt || observedAt >= expiresAt
    || expiresAt - issuedAt <= 0 || expiresAt - issuedAt > CONTROLLED_FRESH_CANDIDATE_MAX_AUTHORIZATION_MS
    || (params.previousObservedAt !== undefined && observedAt < params.previousObservedAt)
  ) return false
  const authorization = value as unknown as ControlledFreshCandidateOwnerAuthorization
  const { seal: suppliedSeal, authorizationIdentity, ...unsigned } = authorization
  if (controlledFreshCandidateOwnerAuthorizationIdentity(unsigned) !== authorizationIdentity) return false
  for (const [key, expected] of Object.entries(params.expected ?? {})) {
    if (authorization[key as keyof ControlledFreshCandidateOwnerAuthorization] !== expected) return false
  }
  const expectedSeal = seal({ ...unsigned, authorizationIdentity }, params.key)
  return timingSafeEqual(Buffer.from(suppliedSeal, 'hex'), Buffer.from(expectedSeal, 'hex'))
}
