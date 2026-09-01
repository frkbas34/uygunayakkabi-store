import { randomUUID } from 'node:crypto'
import { chmodSync, closeSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
  assertControlledFreshCandidateAuthorizationWindowActive,
  assertControlledFreshCandidateAuthorizationActive,
  deriveControlledFreshCandidateAuthorizationIdentity,
  prepareControlledFreshCandidateManifest,
  type ControlledFreshCandidateExecutionGrant,
  type ControlledFreshCandidateManifestInput,
  type ControlledFreshCandidateUnsignedExecutionGrant,
} from '../src/lib/controlledFreshCandidateCreation'
import {
  createControlledFreshCandidateObservationState,
  serializeControlledFreshCandidateObservation,
} from '../src/lib/controlledFreshCandidateObservation'
import {
  CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT,
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV,
  CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION,
  controlledFreshCandidateReceiptDestinationDigest,
  createControlledFreshCandidateExecutionGrantToken,
  createControlledFreshCandidateOperationDirectory,
  initializeControlledFreshCandidateOwnerLedger,
  openControlledFreshCandidatePhysicalReceiptDestination,
  readControlledFreshCandidatePrivateFile,
  validateControlledFreshCandidateApprovedLedgerRoot,
  writeControlledFreshCandidatePrivateFileExclusive,
} from './controlled-fresh-candidate-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_VERSION = 'controlled-fresh-candidate-offline-owner-input/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH' as const
export const CONTROLLED_FRESH_CANDIDATE_PACKAGE_CONFIRMATION = '--confirm-controlled-fresh-candidate-package-preparation' as const

type OfflineOwnerInput = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_VERSION
  manifestIdentity: string
  title: string
  positivePrice: number
  provenanceStatement: string
  stockCandidate: string
  originalPath: string
  originalMimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  originalWidth: number
  originalHeight: number
  issuedAt: string
  notBefore: string
  expiresAt: string
}

type PackageBuilderMode = 'readiness' | 'synthetic-dry-run' | 'prepare'

export class ControlledFreshCandidatePackagePreparationError extends Error {
  readonly operationId: string | null
  readonly partialOperation: boolean

  constructor(operationId: string | null) {
    super(operationId
      ? 'CONTROLLED_PACKAGE_PREPARATION_RECOVERY_REQUIRED'
      : 'CONTROLLED_PACKAGE_PREPARATION_REFUSED_NO_ARTIFACT')
    this.name = 'ControlledFreshCandidatePackagePreparationError'
    this.operationId = operationId
    this.partialOperation = operationId !== null
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactOwnKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!isPlainRecord(value)) return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(stableValue(value))
}

function exactContext(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && value.length >= 1 && value.length <= 160
    && /^[a-z0-9][a-z0-9._:/-]*$/iu.test(value)
}

function exactOfflineInput(value: unknown): value is OfflineOwnerInput {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'manifestIdentity', 'title', 'positivePrice', 'provenanceStatement',
    'stockCandidate', 'originalPath', 'originalMimeType', 'originalWidth', 'originalHeight',
    'issuedAt', 'notBefore', 'expiresAt',
  ])) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_VERSION
    && typeof value.manifestIdentity === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/iu.test(value.manifestIdentity)
    && typeof value.title === 'string' && value.title.trim() === value.title && value.title.length >= 1 && value.title.length <= 160
    && typeof value.positivePrice === 'number' && Number.isFinite(value.positivePrice) && value.positivePrice > 0 && !Object.is(value.positivePrice, -0)
    && typeof value.provenanceStatement === 'string' && value.provenanceStatement.trim() === value.provenanceStatement
    && value.provenanceStatement.length >= 1 && value.provenanceStatement.length <= 1_000
    && typeof value.stockCandidate === 'string' && /^SN\d{4}$/u.test(value.stockCandidate)
    && typeof value.originalPath === 'string' && path.isAbsolute(value.originalPath) && path.resolve(value.originalPath) === value.originalPath
    && ['image/jpeg', 'image/png', 'image/webp'].includes(String(value.originalMimeType))
    && typeof value.originalWidth === 'number' && Number.isSafeInteger(value.originalWidth) && value.originalWidth > 0 && value.originalWidth <= 20_000
    && typeof value.originalHeight === 'number' && Number.isSafeInteger(value.originalHeight) && value.originalHeight > 0 && value.originalHeight <= 20_000
    && value.originalWidth * value.originalHeight <= 40_000_000
    && typeof value.issuedAt === 'string'
    && typeof value.notBefore === 'string'
    && typeof value.expiresAt === 'string'
}

function exactBase64(value: string | undefined, minimum: number, maximum: number): Buffer | null {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) return null
  const decoded = Buffer.from(value, 'base64')
  return decoded.byteLength >= minimum
    && decoded.byteLength <= maximum
    && decoded.toString('base64') === value
    ? decoded
    : null
}

async function validateOriginalBytes(input: OfflineOwnerInput, bytes: Buffer): Promise<void> {
  const sharp = (await import('sharp')).default
  const decoded = await sharp(bytes, { failOn: 'error', limitInputPixels: 40_000_000 })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const format = (await sharp(bytes, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()).format
  const expectedFormat = input.originalMimeType === 'image/jpeg'
    ? 'jpeg'
    : input.originalMimeType === 'image/png' ? 'png' : 'webp'
  if (
    format !== expectedFormat
    || decoded.info.width !== input.originalWidth
    || decoded.info.height !== input.originalHeight
  ) throw new Error('controlled_package_original_invalid')
}

async function runSyntheticDryValidation(): Promise<void> {
  if (process.platform !== 'linux' || !validateControlledFreshCandidateApprovedLedgerRoot()) {
    throw new Error('controlled_package_synthetic_native_ledger_required')
  }
  const temporaryDirectory = mkdtempSync(path.join(CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT, '.synthetic-dry-'))
  chmodSync(temporaryDirectory, 0o700)
  try {
    const sharp = (await import('sharp')).default
    const bytes = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).png().toBuffer()
    const originalPath = path.join(temporaryDirectory, 'synthetic-original.png')
    writeFileSync(originalPath, bytes, { mode: 0o600, flag: 'wx' })
    const now = Date.now()
    const synthetic: OfflineOwnerInput = {
      version: CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_VERSION,
      manifestIdentity: 'synthetic-dry-validation',
      title: 'Synthetic dry validation',
      positivePrice: 1,
      provenanceStatement: 'Synthetic offline validation only.',
      stockCandidate: 'SN9000',
      originalPath,
      originalMimeType: 'image/png',
      originalWidth: 1,
      originalHeight: 1,
      issuedAt: new Date(now).toISOString(),
      notBefore: new Date(now).toISOString(),
      expiresAt: new Date(now + 60_000).toISOString(),
    }
    if (!exactOfflineInput(synthetic)) throw new Error('controlled_package_synthetic_input_invalid')
    assertControlledFreshCandidateAuthorizationWindowActive({ ...synthetic, observedAt: now })
    await validateOriginalBytes(synthetic, bytes)
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

export function controlledFreshCandidatePackageBuilderUsage(): string {
  return [
    'Controlled Fresh Candidate Offline Package Builder',
    '',
    '  --readiness',
    '  --synthetic-dry-run',
    `  --prepare ${CONTROLLED_FRESH_CANDIDATE_PACKAGE_CONFIRMATION}`,
    '  --help',
    '',
    'Preparation reads only the owner-supplied offline input path from the process environment.',
    'No Product/Media target, secret value, or provider/network selector is accepted as an argument.',
  ].join('\n')
}

export function parseControlledFreshCandidatePackageBuilderArgs(argv: readonly string[]):
  | { ok: true; help: true; mode: null }
  | { ok: true; help: false; mode: PackageBuilderMode }
  | { ok: false } {
  if (argv.length === 1 && argv[0] === '--help') return { ok: true, help: true, mode: null }
  if (argv.length === 1 && argv[0] === '--readiness') return { ok: true, help: false, mode: 'readiness' }
  if (argv.length === 1 && argv[0] === '--synthetic-dry-run') return { ok: true, help: false, mode: 'synthetic-dry-run' }
  if (
    argv.length === 2
    && new Set(argv).size === 2
    && argv.includes('--prepare')
    && argv.includes(CONTROLLED_FRESH_CANDIDATE_PACKAGE_CONFIRMATION)
  ) return { ok: true, help: false, mode: 'prepare' }
  return { ok: false }
}

export function controlledFreshCandidatePackageReadiness(environment: NodeJS.ProcessEnv): {
  ready: boolean
  ledger: 'PRESENT_NONEMPTY' | 'ABSENT'
  authorizationKey: 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'
  receiptKey: 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'
  offlineInput: 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'
  commitIdentity: 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'
  environmentIdentity: 'PRESENT_NONEMPTY' | 'PRESENT_EMPTY' | 'ABSENT'
} {
  const status = (value: string | undefined) => value === undefined ? 'ABSENT' as const : value.length === 0 ? 'PRESENT_EMPTY' as const : 'PRESENT_NONEMPTY' as const
  const report = {
    ready: false,
    ledger: validateControlledFreshCandidateApprovedLedgerRoot() ? 'PRESENT_NONEMPTY' as const : 'ABSENT' as const,
    authorizationKey: status(environment[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]),
    receiptKey: status(environment[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]),
    offlineInput: status(environment[CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH_ENV]),
    commitIdentity: status(environment[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]),
    environmentIdentity: status(environment[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]),
  }
  report.ready = report.ledger === 'PRESENT_NONEMPTY'
    && Object.entries(report).every(([name, value]) => name === 'ready' || value === 'PRESENT_NONEMPTY')
  return report
}

export async function prepareControlledFreshCandidatePackage(params: {
  environment: NodeJS.ProcessEnv
  now?: () => number
  operationId?: () => string
  testOnlyLedgerRoot?: string
  testOnlyBeforeFinalManifestWrite?: () => void
}): Promise<{
  operationId: string
  manifestPath: string
  receiptPath: string
  observationPath: string
  expiresAt: string
  eligibleForPublishing: false
}> {
  if (process.platform !== 'linux') throw new Error('controlled_package_posix_required')
  const expectedLedgerRoot = params.testOnlyLedgerRoot ?? CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT
  if (
    (params.testOnlyLedgerRoot !== undefined && process.env.CFC_NATIVE_EXT4_TEST_ONLY !== '1')
    || (params.testOnlyBeforeFinalManifestWrite !== undefined && (
      params.testOnlyLedgerRoot === undefined || process.env.CFC_NATIVE_EXT4_TEST_ONLY !== '1'
    ))
    || params.environment[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV] !== expectedLedgerRoot
  ) {
    throw new Error('controlled_package_ledger_binding_invalid')
  }
  const inputPath = params.environment[CONTROLLED_FRESH_CANDIDATE_OFFLINE_INPUT_PATH_ENV]
  const authorizationKey = exactBase64(params.environment[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV], 32, 128)
  const receiptKey = exactBase64(params.environment[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV], 32, 128)
  const runtimeCommitIdentity = params.environment[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  const environmentIdentity = params.environment[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
  if (!inputPath || !path.isAbsolute(inputPath) || !authorizationKey || !receiptKey || !exactContext(runtimeCommitIdentity) || !exactContext(environmentIdentity)) {
    throw new Error('controlled_package_configuration_invalid')
  }
  const scope = (await import('../src/lib/controlledFreshCandidateCreation')).createControlledFreshCandidateOperationScope({ timeoutMs: 30_000 })
  const ledger = await initializeControlledFreshCandidateOwnerLedger(
    scope,
    {
      ...(params.testOnlyLedgerRoot === undefined ? {} : { testOnlyApprovedRoot: params.testOnlyLedgerRoot }),
      authorizationKeyBase64: authorizationKey.toString('base64'),
    },
  )
  let operationHandle: number | null = null
  let operationId: string | null = null
  let operationCreated = false
  const destinations: Array<ReturnType<typeof openControlledFreshCandidatePhysicalReceiptDestination>> = []
  try {
    const inputBytes = await readControlledFreshCandidatePrivateFile(scope, inputPath, ledger.device, 'manifest')
    let parsed: unknown
    try {
      const serialized = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(inputBytes)
      parsed = JSON.parse(serialized)
      if (serialized !== canonicalJson(parsed)) throw new Error('noncanonical')
    } catch {
      throw new Error('controlled_package_input_invalid')
    }
    if (!exactOfflineInput(parsed)) throw new Error('controlled_package_input_invalid')
    const now = params.now ?? Date.now
    const initialObservedAt = now()
    assertControlledFreshCandidateAuthorizationWindowActive({
      issuedAt: parsed.issuedAt,
      notBefore: parsed.notBefore,
      expiresAt: parsed.expiresAt,
      observedAt: initialObservedAt,
    })
    const originalBytes = await readControlledFreshCandidatePrivateFile(scope, parsed.originalPath, ledger.device, 'original')
    await validateOriginalBytes(parsed, originalBytes)
    operationId = (params.operationId ?? randomUUID)()
    const operation = createControlledFreshCandidateOperationDirectory(ledger, operationId)
    operationCreated = true
    operationHandle = operation.handle
    const manifestPath = path.join(operation.path, 'runtime-input.json')
    const receiptPath = path.join(operation.path, 'private-receipt.json')
    const observationPath = path.join(operation.path, 'observation.json')
    const manifestDestination = openControlledFreshCandidatePhysicalReceiptDestination(manifestPath, ledger.device)
    const receiptDestination = openControlledFreshCandidatePhysicalReceiptDestination(receiptPath, ledger.device)
    const observationDestination = openControlledFreshCandidatePhysicalReceiptDestination(observationPath, ledger.device)
    destinations.push(manifestDestination, receiptDestination, observationDestination)
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
    const manifest = prepareControlledFreshCandidateManifest({ executionId: operationId, manifest: manifestInput })
    const destinationDigest = controlledFreshCandidateReceiptDestinationDigest({
      destination: receiptDestination,
      runtimeCommitIdentity,
      environmentIdentity,
    })
    const unsignedGrant: ControlledFreshCandidateUnsignedExecutionGrant = {
      version: CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_VERSION,
      executionIdentity: operationId,
      manifestDigest: manifest.digest,
      contractIdentity: (await import('../src/lib/controlledFreshCandidateReceipt')).CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
      runtimeIdentity: (await import('../src/lib/controlledFreshCandidateReceipt')).CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
      runtimeCommitIdentity,
      environmentIdentity,
      approvedReceiptDestinationDigest: destinationDigest,
      issuedAt: parsed.issuedAt,
      notBefore: parsed.notBefore,
      expiresAt: parsed.expiresAt,
    }
    const grant: ControlledFreshCandidateExecutionGrant = {
      ...unsignedGrant,
      authorizationIdentity: deriveControlledFreshCandidateAuthorizationIdentity(unsignedGrant),
    }
    assertControlledFreshCandidateAuthorizationActive({ grant, observedAt: now(), previousObservedAt: initialObservedAt })
    const token = createControlledFreshCandidateExecutionGrantToken(grant, authorizationKey)
    const observationState = createControlledFreshCandidateObservationState({
      operationId,
      key: receiptKey,
      persist: () => { throw new Error('controlled_package_prestart_unexpected_persist') },
    })
    writeControlledFreshCandidatePrivateFileExclusive({
      destination: observationDestination,
      bytes: Buffer.from(serializeControlledFreshCandidateObservation(observationState.current()), 'utf8'),
    })
    const runtimeInput = {
      version: CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION,
      authorizationIdentity: grant.authorizationIdentity,
      authorizationTokenBase64: token.toString('base64'),
      issuedAt: grant.issuedAt,
      notBefore: grant.notBefore,
      expiresAt: grant.expiresAt,
      executionId: operationId,
      manifestIdentity: parsed.manifestIdentity,
      title: parsed.title,
      positivePrice: parsed.positivePrice,
      provenanceStatement: parsed.provenanceStatement,
      stockCandidate: parsed.stockCandidate,
      originalPath: parsed.originalPath,
      originalMimeType: parsed.originalMimeType,
      originalWidth: parsed.originalWidth,
      originalHeight: parsed.originalHeight,
      receiptPath,
      observationPath,
      runtimeCommitIdentity,
      environmentIdentity,
    }
    params.testOnlyBeforeFinalManifestWrite?.()
    writeControlledFreshCandidatePrivateFileExclusive({
      destination: manifestDestination,
      bytes: Buffer.from(canonicalJson(runtimeInput), 'utf8'),
    })
    return { operationId, manifestPath, receiptPath, observationPath, expiresAt: grant.expiresAt, eligibleForPublishing: false }
  } catch {
    throw new ControlledFreshCandidatePackagePreparationError(operationCreated ? operationId : null)
  } finally {
    let cleanupUncertain = false
    for (const destination of destinations) {
      try { destination.close() } catch { cleanupUncertain = true }
    }
    if (operationHandle !== null) {
      try { closeSync(operationHandle) } catch { cleanupUncertain = true }
    }
    try { ledger.close() } catch { cleanupUncertain = true }
    try { await scope.cancel() } catch { cleanupUncertain = true }
    try { await scope.drain() } catch { cleanupUncertain = true }
    try { scope.close() } catch { cleanupUncertain = true }
    if (cleanupUncertain) {
      throw new ControlledFreshCandidatePackagePreparationError(operationCreated ? operationId : null)
    }
  }
}

export async function runControlledFreshCandidatePackageBuilder(params: {
  argv: readonly string[]
  environment: NodeJS.ProcessEnv
  write?: (text: string) => void
  writeError?: (text: string) => void
}): Promise<number> {
  const write = params.write ?? ((text: string) => console.log(text))
  const writeError = params.writeError ?? ((text: string) => console.error(text))
  const decision = parseControlledFreshCandidatePackageBuilderArgs(params.argv)
  if (decision.ok && decision.help) {
    write(controlledFreshCandidatePackageBuilderUsage())
    return 0
  }
  if (!decision.ok) {
    writeError('CONTROLLED_FRESH_CANDIDATE_PACKAGE_REFUSED')
    return 2
  }
  if (decision.mode === 'readiness') {
    const report = controlledFreshCandidatePackageReadiness(params.environment)
    write(JSON.stringify(report))
    return report.ready ? 0 : 3
  }
  if (decision.mode === 'synthetic-dry-run') {
    try {
      await runSyntheticDryValidation()
      write(JSON.stringify({ mode: 'SYNTHETIC_DRY_VALIDATION', valid: true, artifactsCreated: false, eligibleForPublishing: false }))
      return 0
    } catch {
      writeError('CONTROLLED_FRESH_CANDIDATE_SYNTHETIC_DRY_VALIDATION_FAILED')
      return 3
    }
  }
  try {
    const report = await prepareControlledFreshCandidatePackage({ environment: params.environment })
    write(JSON.stringify({ status: 'PACKAGE_PREPARED', ...report }))
    return 0
  } catch (error) {
    if (error instanceof ControlledFreshCandidatePackagePreparationError && error.partialOperation && error.operationId) {
      write(JSON.stringify({
        status: 'PACKAGE_PREPARATION_RECOVERY_REQUIRED',
        operationId: error.operationId,
        partialOperation: true,
        eligibleForPublishing: false,
      }))
    } else {
      writeError('CONTROLLED_FRESH_CANDIDATE_PACKAGE_PREPARATION_REFUSED_NO_ARTIFACT')
    }
    return 4
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  process.exitCode = 1
  void runControlledFreshCandidatePackageBuilder({ argv: process.argv.slice(2), environment: process.env })
    .then((code) => { process.exitCode = code })
    .catch(() => { process.exitCode = 1 })
}
