import { timingSafeEqual } from 'node:crypto'
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
  readdirSync,
  statfsSync,
} from 'node:fs'
import path from 'node:path'

import {
  assertControlledFreshCandidateAuthorizationActive,
  createControlledFreshCandidateOperationScope,
  deriveControlledFreshCandidateAuthorizationIdentity,
  prepareControlledFreshCandidateManifest,
  type ControlledFreshCandidateExecutionGrant,
  type ControlledFreshCandidateManifestInput,
  type ControlledFreshCandidateUnsignedExecutionGrant,
} from '../src/lib/controlledFreshCandidateCreation'
import { authenticateControlledFreshCandidateObservation } from '../src/lib/controlledFreshCandidateObservation'
import {
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
} from '../src/lib/controlledFreshCandidateReceipt'
import {
  CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT,
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC,
  CONTROLLED_FRESH_CANDIDATE_MAX_ORIGINAL_BYTES,
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV,
  CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION,
  controlledFreshCandidateReceiptDestinationDigest,
  createControlledFreshCandidateExecutionGrantToken,
  readControlledFreshCandidatePrivateFile,
} from './controlled-fresh-candidate-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_DIRECTORY =
  '/home/w11/.config/uygunayakkabi/controlled-fresh-candidate' as const
export const CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_PATH =
  '/home/w11/.config/uygunayakkabi/controlled-fresh-candidate/runtime-secrets.env' as const
export const CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY =
  'uygunayakkabi-controlled-candidate-production-v1' as const
export const CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL = 'https://www.uygunayakkabi.com' as const
export const CONTROLLED_FRESH_CANDIDATE_SECRET_FILE_MAX_BYTES = 32_768

export const CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST = Object.freeze([
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'BLOB_READ_WRITE_TOKEN',
] as const)

export type ControlledFreshCandidatePersistentSecretName =
  (typeof CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST)[number]

export type ControlledFreshCandidateConfigurationErrorCode =
  | 'CONTROLLED_CONFIGURATION_PLATFORM_UNSUPPORTED'
  | 'CONTROLLED_CONFIGURATION_PATH_INVALID'
  | 'CONTROLLED_CONFIGURATION_DIRECTORY_INVALID'
  | 'CONTROLLED_CONFIGURATION_FILESYSTEM_INVALID'
  | 'CONTROLLED_CONFIGURATION_FILE_INVALID'
  | 'CONTROLLED_CONFIGURATION_FILE_UNSTABLE'
  | 'CONTROLLED_CONFIGURATION_ENCODING_INVALID'
  | 'CONTROLLED_CONFIGURATION_FORMAT_INVALID'
  | 'CONTROLLED_CONFIGURATION_KEY_INVALID'
  | 'CONTROLLED_CONFIGURATION_KEYS_REUSED'
  | 'CONTROLLED_CONFIGURATION_COMMIT_INVALID'
  | 'CONTROLLED_CONFIGURATION_LEDGER_INVALID'
  | 'CONTROLLED_CONFIGURATION_LEDGER_NOT_EMPTY'
  | 'CONTROLLED_CONFIGURATION_OPERATION_INVALID'

export class ControlledFreshCandidateConfigurationError extends Error {
  readonly code: ControlledFreshCandidateConfigurationErrorCode

  constructor(code: ControlledFreshCandidateConfigurationErrorCode) {
    super(code)
    this.name = 'ControlledFreshCandidateConfigurationError'
    this.code = code
  }
}

type BigMetadata = ReturnType<typeof lstatSync> & {
  dev: bigint
  ino: bigint
  mode: bigint
  nlink: bigint
  uid: bigint
  gid: bigint
  size: bigint
  mtimeMs: bigint
  ctimeMs: bigint
}

type SecretReadTestHooks = {
  beforeOpen?(): void
  afterOpen?(handle: number): void
  beforeFinalStat?(handle: number): void
  observedFilesystemType?: bigint
  expectedUid?: number
  expectedGid?: number
}

export type ControlledFreshCandidateSecretReadOptions = {
  testOnlySecretPath?: string
  testOnly?: SecretReadTestHooks
}

export type ControlledFreshCandidateConfigurationLoadOptions = ControlledFreshCandidateSecretReadOptions & {
  deployedCommitIdentity: string
}

export type ControlledFreshCandidateOperationPackageResult = Readonly<{
  operationId: string
  manifestPath: string
  receiptPath: string
  observationPath: string
  expiresAt: string
  eligibleForPublishing: false
}>

type RuntimeInput = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION
  authorizationIdentity: string
  authorizationTokenBase64: string
  issuedAt: string
  notBefore: string
  expiresAt: string
  executionId: string
  manifestIdentity: string
  title: string
  positivePrice: number
  provenanceStatement: string
  stockCandidate: string
  originalPath: string
  originalMimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  originalWidth: number
  originalHeight: number
  receiptPath: string
  observationPath: string
  runtimeCommitIdentity: string
  environmentIdentity: string
}

const authenticatedExecutionEnvironments = new WeakSet<object>()

const RUNTIME_INPUT_KEYS = Object.freeze([
  'version', 'authorizationIdentity', 'authorizationTokenBase64', 'issuedAt', 'notBefore', 'expiresAt',
  'executionId', 'manifestIdentity', 'title', 'positivePrice', 'provenanceStatement', 'stockCandidate',
  'originalPath', 'originalMimeType', 'originalWidth', 'originalHeight', 'receiptPath', 'observationPath',
  'runtimeCommitIdentity', 'environmentIdentity',
] as const)

function fail(code: ControlledFreshCandidateConfigurationErrorCode): never {
  throw new ControlledFreshCandidateConfigurationError(code)
}

function assertLinux(): void {
  if (
    process.platform !== 'linux'
    || typeof process.getuid !== 'function'
    || typeof process.getgid !== 'function'
  ) fail('CONTROLLED_CONFIGURATION_PLATFORM_UNSUPPORTED')
}

function exactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function exactBase64Key(value: unknown): Buffer | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) return null
  const decoded = Buffer.from(value, 'base64')
  if (
    decoded.byteLength < 32
    || decoded.byteLength > 128
    || decoded.toString('base64') !== value
  ) return null
  return decoded
}

function exactFullGitSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value)
}

function metadataStable(left: BigMetadata, right: BigMetadata): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.uid === right.uid
    && left.gid === right.gid
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs
}

function assertSymlinkFreeAbsolutePath(targetPath: string): void {
  if (!path.isAbsolute(targetPath) || path.resolve(targetPath) !== targetPath || targetPath.includes('\0')) {
    fail('CONTROLLED_CONFIGURATION_PATH_INVALID')
  }
  let current = path.parse(targetPath).root
  for (const part of targetPath.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part)
    let metadata: BigMetadata
    try {
      metadata = lstatSync(current, { bigint: true }) as BigMetadata
    } catch {
      fail('CONTROLLED_CONFIGURATION_PATH_INVALID')
    }
    if (metadata.isSymbolicLink()) fail('CONTROLLED_CONFIGURATION_PATH_INVALID')
  }
}

function assertPrivateDirectory(
  directoryPath: string,
  options: { observedFilesystemType?: bigint; expectedUid?: number; expectedGid?: number } = {},
): BigMetadata {
  assertLinux()
  assertSymlinkFreeAbsolutePath(directoryPath)
  const expectedUid = BigInt(options.expectedUid ?? process.getuid!())
  const expectedGid = BigInt(options.expectedGid ?? process.getgid!())
  let before: BigMetadata
  let filesystemType: bigint
  try {
    before = lstatSync(directoryPath, { bigint: true }) as BigMetadata
    filesystemType = options.observedFilesystemType
      ?? (statfsSync(directoryPath, { bigint: true }).type as bigint)
  } catch {
    fail('CONTROLLED_CONFIGURATION_DIRECTORY_INVALID')
  }
  if (filesystemType !== BigInt(CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC)) {
    fail('CONTROLLED_CONFIGURATION_FILESYSTEM_INVALID')
  }
  if (
    !before.isDirectory()
    || before.isSymbolicLink()
    || before.uid !== expectedUid
    || before.gid !== expectedGid
    || (before.mode & 0o777n) !== 0o700n
    || realpathSync(directoryPath) !== directoryPath
  ) fail('CONTROLLED_CONFIGURATION_DIRECTORY_INVALID')
  return before
}

function parsePersistentSecrets(bytes: Buffer): Record<ControlledFreshCandidatePersistentSecretName, string> {
  if (
    bytes.byteLength < 1
    || bytes.byteLength > CONTROLLED_FRESH_CANDIDATE_SECRET_FILE_MAX_BYTES
    || bytes.includes(0)
    || (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
  ) fail('CONTROLLED_CONFIGURATION_ENCODING_INVALID')
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
  } catch {
    fail('CONTROLLED_CONFIGURATION_ENCODING_INVALID')
  }
  if (Buffer.from(text, 'utf8').compare(bytes) !== 0 || text.includes('\r')) {
    fail('CONTROLLED_CONFIGURATION_ENCODING_INVALID')
  }
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop()
  if (lines.length !== CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST.length) {
    fail('CONTROLLED_CONFIGURATION_FORMAT_INVALID')
  }
  const values: Partial<Record<ControlledFreshCandidatePersistentSecretName, string>> = Object.create(null) as Partial<Record<ControlledFreshCandidatePersistentSecretName, string>>
  const allowed = new Set<string>(CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST)
  for (const line of lines) {
    const separator = line.indexOf('=')
    if (separator <= 0) fail('CONTROLLED_CONFIGURATION_FORMAT_INVALID')
    const name = line.slice(0, separator)
    const value = line.slice(separator + 1)
    if (!allowed.has(name) || Object.hasOwn(values, name) || value.length === 0) {
      fail('CONTROLLED_CONFIGURATION_FORMAT_INVALID')
    }
    values[name as ControlledFreshCandidatePersistentSecretName] = value
  }
  if (!exactOwnKeys(values as Record<string, unknown>, CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST)) {
    fail('CONTROLLED_CONFIGURATION_FORMAT_INVALID')
  }
  const authorizationKey = exactBase64Key(values[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV])
  const receiptKey = exactBase64Key(values[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV])
  if (!authorizationKey || !receiptKey) fail('CONTROLLED_CONFIGURATION_KEY_INVALID')
  try {
    if (
      authorizationKey.byteLength === receiptKey.byteLength
      && timingSafeEqual(authorizationKey, receiptKey)
    ) fail('CONTROLLED_CONFIGURATION_KEYS_REUSED')
  } finally {
    authorizationKey.fill(0)
    receiptKey.fill(0)
  }
  return values as Record<ControlledFreshCandidatePersistentSecretName, string>
}

export function readControlledFreshCandidatePersistentSecrets(
  options: ControlledFreshCandidateSecretReadOptions = {},
): Record<ControlledFreshCandidatePersistentSecretName, string> {
  assertLinux()
  const secretPath = options.testOnlySecretPath ?? CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_PATH
  if (options.testOnlySecretPath === undefined && secretPath !== CONTROLLED_FRESH_CANDIDATE_SECRET_SOURCE_PATH) {
    fail('CONTROLLED_CONFIGURATION_PATH_INVALID')
  }
  const directoryPath = path.dirname(secretPath)
  const directoryBefore = assertPrivateDirectory(directoryPath, options.testOnly)
  assertSymlinkFreeAbsolutePath(secretPath)
  let pathBefore: BigMetadata
  try {
    pathBefore = lstatSync(secretPath, { bigint: true }) as BigMetadata
  } catch {
    fail('CONTROLLED_CONFIGURATION_FILE_INVALID')
  }
  const expectedUid = BigInt(options.testOnly?.expectedUid ?? process.getuid!())
  const expectedGid = BigInt(options.testOnly?.expectedGid ?? process.getgid!())
  if (
    !pathBefore.isFile()
    || pathBefore.isSymbolicLink()
    || pathBefore.uid !== expectedUid
    || pathBefore.gid !== expectedGid
    || (pathBefore.mode & 0o777n) !== 0o600n
    || pathBefore.nlink !== 1n
    || pathBefore.dev !== directoryBefore.dev
    || pathBefore.size < 1n
    || pathBefore.size > BigInt(CONTROLLED_FRESH_CANDIDATE_SECRET_FILE_MAX_BYTES)
    || realpathSync(secretPath) !== secretPath
  ) fail('CONTROLLED_CONFIGURATION_FILE_INVALID')

  options.testOnly?.beforeOpen?.()
  const noFollow = fsConstants.O_NOFOLLOW
  if (!Number.isSafeInteger(noFollow)) {
    fail('CONTROLLED_CONFIGURATION_PLATFORM_UNSUPPORTED')
  }
  let handle: number
  try {
    handle = openSync(secretPath, fsConstants.O_RDONLY | noFollow)
  } catch {
    fail('CONTROLLED_CONFIGURATION_FILE_INVALID')
  }
  try {
    const openedBefore = fstatSync(handle, { bigint: true }) as BigMetadata
    if (!metadataStable(pathBefore, openedBefore) || !openedBefore.isFile()) {
      fail('CONTROLLED_CONFIGURATION_FILE_UNSTABLE')
    }
    options.testOnly?.afterOpen?.(handle)
    const expectedSize = Number(openedBefore.size)
    const bytes = Buffer.alloc(expectedSize + 1)
    let offset = 0
    while (offset < bytes.byteLength) {
      const count = readSync(handle, bytes, offset, bytes.byteLength - offset, offset)
      if (count === 0) break
      offset += count
    }
    options.testOnly?.beforeFinalStat?.(handle)
    const openedAfter = fstatSync(handle, { bigint: true }) as BigMetadata
    let pathAfter: BigMetadata
    let directoryAfter: BigMetadata
    try {
      pathAfter = lstatSync(secretPath, { bigint: true }) as BigMetadata
      directoryAfter = lstatSync(directoryPath, { bigint: true }) as BigMetadata
    } catch {
      fail('CONTROLLED_CONFIGURATION_FILE_UNSTABLE')
    }
    if (
      offset !== expectedSize
      || !metadataStable(openedBefore, openedAfter)
      || !metadataStable(pathBefore, pathAfter)
      || !metadataStable(directoryBefore, directoryAfter)
      || realpathSync(secretPath) !== secretPath
    ) fail('CONTROLLED_CONFIGURATION_FILE_UNSTABLE')
    return parsePersistentSecrets(bytes.subarray(0, expectedSize))
  } finally {
    closeSync(handle)
  }
}

export function validateControlledFreshCandidateEmptyLedger(options: {
  testOnlyLedgerRoot?: string
  testOnly?: { observedFilesystemType?: bigint; expectedUid?: number; expectedGid?: number }
} = {}): true {
  const ledgerRoot = options.testOnlyLedgerRoot ?? CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
  if (options.testOnlyLedgerRoot === undefined && ledgerRoot !== CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT) {
    fail('CONTROLLED_CONFIGURATION_LEDGER_INVALID')
  }
  const before = assertPrivateDirectory(ledgerRoot, options.testOnly)
  let entries: string[]
  try {
    entries = readdirSync(ledgerRoot)
  } catch {
    fail('CONTROLLED_CONFIGURATION_LEDGER_INVALID')
  }
  const after = lstatSync(ledgerRoot, { bigint: true }) as BigMetadata
  if (!metadataStable(before, after)) fail('CONTROLLED_CONFIGURATION_LEDGER_INVALID')
  if (entries.length !== 0) fail('CONTROLLED_CONFIGURATION_LEDGER_NOT_EMPTY')
  return true
}

export function buildControlledFreshCandidateConfigurationEnvironment(params: {
  secrets: Readonly<Record<ControlledFreshCandidatePersistentSecretName, string>>
  deployedCommitIdentity: string
}): NodeJS.ProcessEnv {
  if (!exactFullGitSha(params.deployedCommitIdentity)) fail('CONTROLLED_CONFIGURATION_COMMIT_INVALID')
  if (!exactOwnKeys(params.secrets as Record<string, unknown>, CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST)) {
    fail('CONTROLLED_CONFIGURATION_FORMAT_INVALID')
  }
  const authorizationKey = exactBase64Key(params.secrets[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV])
  const receiptKey = exactBase64Key(params.secrets[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV])
  if (!authorizationKey || !receiptKey) fail('CONTROLLED_CONFIGURATION_KEY_INVALID')
  try {
    if (authorizationKey.byteLength === receiptKey.byteLength && timingSafeEqual(authorizationKey, receiptKey)) {
      fail('CONTROLLED_CONFIGURATION_KEYS_REUSED')
    }
  } finally {
    authorizationKey.fill(0)
    receiptKey.fill(0)
  }
  const child = Object.create(null) as NodeJS.ProcessEnv
  for (const name of CONTROLLED_FRESH_CANDIDATE_PERSISTENT_SECRET_ALLOWLIST) {
    const value = params.secrets[name]
    if (typeof value !== 'string' || value.length === 0) fail('CONTROLLED_CONFIGURATION_FORMAT_INVALID')
    child[name] = value
  }
  child[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV] = params.deployedCommitIdentity
  child[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV] = CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY
  child[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV] = CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
  child.NEXT_PUBLIC_SERVER_URL = CONTROLLED_FRESH_CANDIDATE_CANONICAL_SERVER_URL
  child.PAYLOAD_DB_PUSH = 'false'
  child.PAYLOAD_DROP_DATABASE = 'false'
  return child
}

export function loadControlledFreshCandidateConfigurationEnvironment(
  options: ControlledFreshCandidateConfigurationLoadOptions,
): NodeJS.ProcessEnv {
  const secrets = readControlledFreshCandidatePersistentSecrets(options)
  return buildControlledFreshCandidateConfigurationEnvironment({
    secrets,
    deployedCommitIdentity: options.deployedCommitIdentity,
  })
}

function exactRuntimeInput(value: unknown): value is RuntimeInput {
  if (!isPlainRecord(value) || !exactOwnKeys(value, RUNTIME_INPUT_KEYS)) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION
    && typeof value.authorizationIdentity === 'string'
    && typeof value.authorizationTokenBase64 === 'string'
    && typeof value.issuedAt === 'string'
    && typeof value.notBefore === 'string'
    && typeof value.expiresAt === 'string'
    && typeof value.executionId === 'string'
    && typeof value.manifestIdentity === 'string'
    && typeof value.title === 'string'
    && typeof value.positivePrice === 'number'
    && Number.isFinite(value.positivePrice)
    && value.positivePrice > 0
    && typeof value.provenanceStatement === 'string'
    && typeof value.stockCandidate === 'string'
    && typeof value.originalPath === 'string'
    && path.isAbsolute(value.originalPath)
    && ['image/jpeg', 'image/png', 'image/webp'].includes(String(value.originalMimeType))
    && typeof value.originalWidth === 'number'
    && Number.isSafeInteger(value.originalWidth)
    && typeof value.originalHeight === 'number'
    && Number.isSafeInteger(value.originalHeight)
    && typeof value.receiptPath === 'string'
    && typeof value.observationPath === 'string'
    && typeof value.runtimeCommitIdentity === 'string'
    && typeof value.environmentIdentity === 'string'
}

function exactOperationPackageShape(value: ControlledFreshCandidateOperationPackageResult): boolean {
  return exactOwnKeys(value as unknown as Record<string, unknown>, [
    'operationId', 'manifestPath', 'receiptPath', 'observationPath', 'expiresAt', 'eligibleForPublishing',
  ])
    && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(value.operationId)
    && typeof value.expiresAt === 'string'
    && value.eligibleForPublishing === false
}

function decodeExactToken(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) return null
  const decoded = Buffer.from(value, 'base64')
  return decoded.byteLength === 32 && decoded.toString('base64') === value ? decoded : null
}

export async function buildControlledFreshCandidateExecutionEnvironment(params: {
  configurationEnvironment: NodeJS.ProcessEnv
  packageResult: ControlledFreshCandidateOperationPackageResult
  now?: number
  testOnlyLedgerRoot?: string
}): Promise<NodeJS.ProcessEnv> {
  assertLinux()
  if (!exactOperationPackageShape(params.packageResult)) fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  const ledgerRoot = params.testOnlyLedgerRoot ?? CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
  if (params.testOnlyLedgerRoot === undefined && ledgerRoot !== CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT) {
    fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  }
  const expectedDirectory = path.join(ledgerRoot, 'operations-v1', params.packageResult.operationId)
  const expectedManifest = path.join(expectedDirectory, 'runtime-input.json')
  const expectedReceipt = path.join(expectedDirectory, 'private-receipt.json')
  const expectedObservation = path.join(expectedDirectory, 'observation.json')
  if (
    params.packageResult.manifestPath !== expectedManifest
    || params.packageResult.receiptPath !== expectedReceipt
    || params.packageResult.observationPath !== expectedObservation
  ) fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  const ledgerMetadata = assertPrivateDirectory(ledgerRoot)
  const operationMetadata = assertPrivateDirectory(expectedDirectory)
  if (operationMetadata.dev !== ledgerMetadata.dev) fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  try {
    lstatSync(expectedReceipt)
    fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  } catch (error) {
    if (error instanceof ControlledFreshCandidateConfigurationError) throw error
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  }

  const authorizationKey = exactBase64Key(params.configurationEnvironment[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV])
  const receiptKey = exactBase64Key(params.configurationEnvironment[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV])
  const configuredCommit = params.configurationEnvironment[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  const configuredEnvironment = params.configurationEnvironment[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
  if (
    !authorizationKey
    || !receiptKey
    || !exactFullGitSha(configuredCommit)
    || configuredEnvironment !== CONTROLLED_FRESH_CANDIDATE_PRODUCTION_ENVIRONMENT_IDENTITY
  ) fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')

  const scope = createControlledFreshCandidateOperationScope({ timeoutMs: 30_000 })
  try {
    const manifestBytes = await readControlledFreshCandidatePrivateFile(
      scope,
      expectedManifest,
      ledgerMetadata.dev,
      'manifest',
    )
    let parsed: unknown
    try {
      parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes))
    } catch {
      fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
    }
    if (!exactRuntimeInput(parsed)) fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
    if (
      parsed.executionId !== params.packageResult.operationId
      || parsed.expiresAt !== params.packageResult.expiresAt
      || parsed.receiptPath !== expectedReceipt
      || parsed.observationPath !== expectedObservation
      || parsed.runtimeCommitIdentity !== configuredCommit
      || parsed.environmentIdentity !== configuredEnvironment
    ) fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
    const originalBytes = await readControlledFreshCandidatePrivateFile(
      scope,
      parsed.originalPath,
      ledgerMetadata.dev,
      'original',
    )
    if (originalBytes.byteLength < 1 || originalBytes.byteLength > CONTROLLED_FRESH_CANDIDATE_MAX_ORIGINAL_BYTES) {
      fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
    }
    const manifestInput: ControlledFreshCandidateManifestInput = {
      identity: parsed.manifestIdentity,
      title: parsed.title,
      positivePrice: parsed.positivePrice,
      provenanceStatement: parsed.provenanceStatement,
      stockCandidate: parsed.stockCandidate,
      original: {
        bytes: originalBytes,
        mimeType: parsed.originalMimeType,
        width: parsed.originalWidth,
        height: parsed.originalHeight,
      },
    }
    const manifest = prepareControlledFreshCandidateManifest({
      executionId: parsed.executionId,
      manifest: manifestInput,
    })
    const destinationDigest = controlledFreshCandidateReceiptDestinationDigest({
      destination: {
        device: operationMetadata.dev,
        inode: operationMetadata.ino,
        basename: path.basename(expectedReceipt),
      },
      runtimeCommitIdentity: configuredCommit,
      environmentIdentity: configuredEnvironment,
    })
    const unsignedGrant: ControlledFreshCandidateUnsignedExecutionGrant = {
      version: 'controlled-fresh-candidate-execution-authorization/v3',
      executionIdentity: parsed.executionId,
      manifestDigest: manifest.digest,
      contractIdentity: CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
      runtimeIdentity: CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      runtimeCommitIdentity: configuredCommit,
      environmentIdentity: configuredEnvironment,
      approvedReceiptDestinationDigest: destinationDigest,
      issuedAt: parsed.issuedAt,
      notBefore: parsed.notBefore,
      expiresAt: parsed.expiresAt,
    }
    const grant: ControlledFreshCandidateExecutionGrant = {
      ...unsignedGrant,
      authorizationIdentity: deriveControlledFreshCandidateAuthorizationIdentity(unsignedGrant),
    }
    if (grant.authorizationIdentity !== parsed.authorizationIdentity) {
      fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
    }
    assertControlledFreshCandidateAuthorizationActive({
      grant,
      observedAt: params.now ?? Date.now(),
    })
    const suppliedToken = decodeExactToken(parsed.authorizationTokenBase64)
    const expectedToken = createControlledFreshCandidateExecutionGrantToken(grant, authorizationKey)
    try {
      if (!suppliedToken || !timingSafeEqual(suppliedToken, expectedToken)) {
        fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
      }
    } finally {
      suppliedToken?.fill(0)
      expectedToken.fill(0)
    }
    const observationBytes = await readControlledFreshCandidatePrivateFile(
      scope,
      expectedObservation,
      ledgerMetadata.dev,
      'receipt',
    )
    authenticateControlledFreshCandidateObservation({
      bytes: observationBytes,
      key: receiptKey,
      expectedOperationId: parsed.executionId,
      now: params.now,
    })
    const child = Object.create(null) as NodeJS.ProcessEnv
    for (const [name, value] of Object.entries(params.configurationEnvironment)) {
      if (typeof value === 'string') child[name] = value
    }
    child[CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV] = expectedManifest
    child[CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV] = expectedReceipt
    child[CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV] = expectedObservation
    authenticatedExecutionEnvironments.add(child)
    return child
  } catch (error) {
    if (error instanceof ControlledFreshCandidateConfigurationError) throw error
    fail('CONTROLLED_CONFIGURATION_OPERATION_INVALID')
  } finally {
    authorizationKey.fill(0)
    receiptKey.fill(0)
    try { await scope.cancel() } catch { /* fail-closed caller result */ }
    try { await scope.drain() } catch { /* fail-closed caller result */ }
    try { scope.close() } catch { /* fail-closed caller result */ }
  }
}

export function controlledFreshCandidateExecutionEnvironmentIsAuthenticated(
  environment: NodeJS.ProcessEnv,
): boolean {
  return authenticatedExecutionEnvironments.has(environment)
}
