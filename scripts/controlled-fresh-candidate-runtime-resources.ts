import {
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto'
import {
  closeSync,
  fsyncSync,
  openSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_DOMAIN,
  CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  controlledFreshCandidateDigest,
  controlledFreshCandidateProductMatches,
  createControlledFreshCandidate,
  createControlledFreshCandidateOperationScope,
  fixedControlledFreshCandidateProduct,
  serializeControlledFreshCandidateExecutionGrant,
  type ControlledFreshCandidateCreationDependencies,
  type ControlledFreshCandidateCreationInput,
  type ControlledFreshCandidateExecutionGrant,
  type ControlledFreshCandidateOperationScope,
  type ControlledFreshCandidatePublicReport,
} from '../src/lib/controlledFreshCandidateCreation'
import {
  authenticateControlledFreshCandidateReceipt,
  type ControlledFreshCandidateTargetCapability,
} from '../src/lib/controlledFreshCandidateReceipt'
import type {
  ControlledFreshCandidateStrictTargetDependencies,
} from '../src/lib/controlledFreshCandidateTargetVerifier'
import type { FreshVisualStrictTargetGateway } from '../src/lib/freshVisualProductDiscovery'
import {
  createFreshVisualDiscoveryRuntimeGateway,
  type FreshVisualDiscoveryRuntimePayload,
} from './fresh-visual-product-runtime-resources'
import {
  type VisualPilotRuntimePostgresPool,
} from './visual-pilot-target-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION = 'controlled-fresh-candidate-runtime-input/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS = 5_000
export const CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0
export const CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV = 'CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY' as const
export const CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV = 'CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64' as const
export const CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY' as const
export const CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY' as const

export function controlledFreshCandidateFilenameIsApproved(
  expectedFilename: string | null,
  actualFilename: unknown,
): actualFilename is string {
  return typeof actualFilename === 'string'
    && expectedFilename !== null
    && actualFilename === expectedFilename
}

type RecordValue = Record<string, unknown>

export type ControlledRuntimePayload = FreshVisualDiscoveryRuntimePayload & {
  create(args: RecordValue): Promise<unknown>
  update(args: RecordValue): Promise<unknown>
  findByID(args: RecordValue): Promise<unknown>
  destroy(): Promise<void>
  db?: unknown
}

export async function finalizeControlledFreshCandidateProductAtomically(params: {
  payload: ControlledRuntimePayload
  scope: ControlledFreshCandidateOperationScope
  mutationActive: { current: boolean }
  productId: number
  mediaId: number
  manifest: import('../src/lib/controlledFreshCandidateReceipt').ControlledFreshCandidateManifestEvidence
  blockedStateFingerprint: string
  signal: AbortSignal
  createRequest?: () => Promise<{ transactionID?: string }>
}): Promise<{ affected: number }> {
  const assertMutation = (): void => {
    params.scope.assertActive()
    if (params.signal.aborted || !params.mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
  }
  assertMutation()
  if (params.productId === 349) throw new Error('controlled_finalization_identity_invalid')
  const db = params.payload.db as Record<string, unknown>
  if (
    !isPlainRecord(db)
    || typeof db.beginTransaction !== 'function'
    || typeof db.commitTransaction !== 'function'
    || typeof db.rollbackTransaction !== 'function'
    || !(db.tableNameMap instanceof Map)
    || !isPlainRecord(db.schema)
    || !isPlainRecord(db.sessions)
  ) throw new Error('controlled_finalization_transaction_unavailable')
  const tableName = db.tableNameMap.get('products')
  if (typeof tableName !== 'string' || !tableName) throw new Error('controlled_finalization_table_unavailable')
  const productTable = db.schema[tableName] as Record<string, unknown> | undefined
  if (!productTable || !('id' in productTable)) throw new Error('controlled_finalization_table_unavailable')
  const [request, drizzleModule] = await Promise.all([
    params.createRequest
      ? params.createRequest()
      : import('payload').then((payloadModule) => payloadModule.createLocalReq({}, params.payload as never)) as Promise<{ transactionID?: string }>,
    import('drizzle-orm'),
  ])
  assertMutation()
  const transactionId = await (db.beginTransaction as () => Promise<unknown>)()
  if (typeof transactionId !== 'string' || !transactionId) throw new Error('controlled_finalization_transaction_unavailable')
  request.transactionID = transactionId
  let committed = false
  try {
    const session = (db.sessions as Record<string, unknown>)[transactionId]
    if (!isPlainRecord(session) || !isPlainRecord(session.db)) throw new Error('controlled_finalization_transaction_unavailable')
    const transaction = session.db as {
      select(selection: Record<string, unknown>): {
        from(table: Record<string, unknown>): {
          where(condition: unknown): { for(mode: 'update'): Promise<unknown[]> }
        }
      }
    }
    const locked = await transaction
      .select({ id: productTable.id })
      .from(productTable)
      .where(drizzleModule.eq(productTable.id as never, params.productId))
      .for('update')
    if (!Array.isArray(locked) || locked.length !== 1) throw new Error('controlled_finalization_cas_missed')
    assertMutation()
    const current = await params.payload.findByID({
      collection: 'products', id: params.productId, req: request, depth: 0, disableErrors: true, overrideAccess: true,
    })
    assertMutation()
    const expectedFingerprint = controlledFreshCandidateDigest(
      fixedControlledFreshCandidateProduct(params.manifest, 'blocked', params.mediaId),
    )
    if (
      params.blockedStateFingerprint !== expectedFingerprint
      || !controlledFreshCandidateProductMatches({
        product: current,
        manifest: params.manifest,
        confirmationStatus: 'blocked',
        mediaId: params.mediaId,
      })
      || !isPlainRecord(current)
      || !isPlainRecord(current.workflow)
    ) throw new Error('controlled_finalization_cas_missed')
    assertMutation()
    const updated = await params.payload.update({
      collection: 'products',
      id: params.productId,
      data: { workflow: { ...current.workflow, confirmationStatus: 'pending' } },
      req: request,
      depth: 0,
      overrideAccess: true,
    })
    assertMutation()
    if (!controlledFreshCandidateProductMatches({
      product: updated,
      manifest: params.manifest,
      confirmationStatus: 'pending',
      mediaId: params.mediaId,
    })) throw new Error('controlled_finalization_cas_missed')
    await (db.commitTransaction as (id: string) => Promise<void>)(transactionId)
    committed = true
    delete request.transactionID
    return { affected: 1 }
  } finally {
    if (!committed) {
      try { await (db.rollbackTransaction as (id: string) => Promise<void>)(transactionId) } catch { /* uncertainty stays fail closed */ }
      delete request.transactionID
    }
  }
}

type ControlledRuntimeInputFile = {
  version: typeof CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION
  authorizationIdentity: string
  authorizationTokenBase64: string
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
  receiptKeyBase64: string
  runtimeCommitIdentity: string
  environmentIdentity: string
}

export type ControlledFreshCandidateRuntimeResource = {
  creationInput: ControlledFreshCandidateCreationInput
  creationDependencies: ControlledFreshCandidateCreationDependencies
  destroy(): Promise<{ ok: true } | { ok: false }>
  scope: ControlledFreshCandidateOperationScope
}

export type ControlledFreshCandidateVerificationResource = {
  capability: ControlledFreshCandidateTargetCapability
  dependencies: ControlledFreshCandidateStrictTargetDependencies
  destroy(): Promise<{ ok: true } | { ok: false }>
  scope: ControlledFreshCandidateOperationScope
}

function isPlainRecord(value: unknown): value is RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasExactOwnKeys(value: RecordValue, expected: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function exactBase64(value: unknown, minimum: number, maximum: number): Buffer | null {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null
  const decoded = Buffer.from(value, 'base64')
  if (decoded.byteLength < minimum || decoded.byteLength > maximum || decoded.toString('base64') !== value) return null
  return decoded
}

function exactContextIdentity(value: unknown): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && value.length >= 1
    && value.length <= 160
    && /^[a-z0-9][a-z0-9._:/-]*$/i.test(value)
}

function exactRuntimeInput(value: unknown): value is ControlledRuntimeInputFile {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'authorizationIdentity', 'authorizationTokenBase64', 'executionId',
    'manifestIdentity', 'title', 'positivePrice', 'provenanceStatement', 'stockCandidate',
    'originalPath', 'originalMimeType', 'originalWidth', 'originalHeight', 'receiptPath',
    'receiptKeyBase64', 'runtimeCommitIdentity', 'environmentIdentity',
  ])) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION
    && typeof value.authorizationIdentity === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value.authorizationIdentity)
    && typeof value.authorizationTokenBase64 === 'string'
    && typeof value.executionId === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value.executionId)
    && typeof value.manifestIdentity === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value.manifestIdentity)
    && typeof value.title === 'string' && value.title.trim() === value.title && value.title.length >= 1 && value.title.length <= 160
    && typeof value.positivePrice === 'number' && Number.isFinite(value.positivePrice) && value.positivePrice > 0
    && typeof value.provenanceStatement === 'string' && value.provenanceStatement.trim() === value.provenanceStatement && value.provenanceStatement.length >= 1 && value.provenanceStatement.length <= 1_000
    && typeof value.stockCandidate === 'string' && /^SN\d{4}$/.test(value.stockCandidate)
    && typeof value.originalPath === 'string' && path.isAbsolute(value.originalPath)
    && ['image/jpeg', 'image/png', 'image/webp'].includes(String(value.originalMimeType))
    && typeof value.originalWidth === 'number' && Number.isSafeInteger(value.originalWidth) && value.originalWidth > 0 && value.originalWidth <= 20_000
    && typeof value.originalHeight === 'number' && Number.isSafeInteger(value.originalHeight) && value.originalHeight > 0 && value.originalHeight <= 20_000
    && value.originalWidth * value.originalHeight <= 40_000_000
    && typeof value.receiptPath === 'string' && path.isAbsolute(value.receiptPath)
    && path.resolve(value.receiptPath) !== path.resolve(value.originalPath)
    && typeof value.receiptKeyBase64 === 'string'
    && exactContextIdentity(value.runtimeCommitIdentity)
    && exactContextIdentity(value.environmentIdentity)
}

function runtimePool(payload: ControlledRuntimePayload): VisualPilotRuntimePostgresPool {
  if (!isPlainRecord(payload.db) || !isPlainRecord(payload.db.pool)) throw new Error('controlled_runtime_pool_unavailable')
  const pool = payload.db.pool
  if (typeof pool.query !== 'function' || typeof pool.end !== 'function') throw new Error('controlled_runtime_pool_unavailable')
  return pool as unknown as VisualPilotRuntimePostgresPool
}

function configureBlobProcessBoundary(): void {
  process.env.PAYLOAD_DB_PUSH = 'false'
  process.env.VERCEL_BLOB_RETRIES = String(CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET)
  process.env.DEBUG = ''
  process.env.NEXT_PUBLIC_DEBUG = ''
  delete process.env.VERCEL_BLOB_API_URL
  delete process.env.NEXT_PUBLIC_VERCEL_BLOB_API_URL
  delete process.env.VERCEL_BLOB_API_VERSION_OVERRIDE
  delete process.env.NEXT_PUBLIC_VERCEL_BLOB_API_VERSION_OVERRIDE
}

export function createControlledFreshCandidateBoundaryLoggerConfiguration(): {
  options: { enabled: true; level: 'silent' }
  destination: { write(_chunk: unknown): void }
} {
  return {
    options: { enabled: true, level: 'silent' },
    destination: { write: () => undefined },
  }
}

async function bounded<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('controlled_runtime_deadline')), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function normalizePayloadPage(value: RecordValue, page: number, limit: number): {
  docs: unknown[]
  totalDocs: number
  page: number
  totalPages: number
  hasNextPage: boolean
  limit: number
} {
  if (
    !Array.isArray(value.docs)
    || typeof value.totalDocs !== 'number' || !Number.isSafeInteger(value.totalDocs) || value.totalDocs < 0
    || value.page !== page
    || typeof value.totalPages !== 'number' || !Number.isSafeInteger(value.totalPages) || value.totalPages < 0
    || typeof value.hasNextPage !== 'boolean'
    || value.limit !== limit
  ) throw new Error('controlled_runtime_page_malformed')
  return {
    docs: value.docs,
    totalDocs: value.totalDocs,
    page,
    totalPages: value.totalPages,
    hasNextPage: value.hasNextPage,
    limit,
  }
}

function createStrictGateway(
  payload: ControlledRuntimePayload,
  pool: VisualPilotRuntimePostgresPool,
  scope: ControlledFreshCandidateOperationScope,
): FreshVisualStrictTargetGateway {
  const discovery = createFreshVisualDiscoveryRuntimeGateway(payload, pool)
  const read = async <T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> => {
    scope.assertActive()
    if (signal.aborted) throw new Error('controlled_runtime_deadline')
    const result = await operation()
    scope.assertActive()
    if (signal.aborted) throw new Error('controlled_runtime_deadline')
    return result
  }
  return {
    async readOwnedProduct(productId, signal) {
      return read(signal, () => payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      }))
    },
    readMediaPage: (productId, page, limit, signal) => read(signal, () => discovery.readMediaPage(productId, page, limit)),
    readGeneratedGalleryOwnerPage: (mediaIds, page, limit, signal) => read(signal, () => discovery.readGeneratedGalleryOwnerPage(mediaIds, page, limit)),
    readImageJobPage: (productId, page, limit, signal) => read(signal, () => discovery.readImageJobPage(productId, page, limit)),
    readQueueReceiptPage: (productId, page, limit, signal) => read(signal, () => discovery.readQueueReceiptPage(productId, page, limit)),
    readBotEventPage: (productId, page, limit, signal) => read(signal, () => discovery.readBotEventPage(productId, page, limit)),
    readStoryJobPage: (productId, page, limit, signal) => read(signal, () => discovery.readStoryJobPage(productId, page, limit)),
  }
}

export function controlledFreshCandidateReceiptDestinationDigest(receiptPath: string): string {
  if (!path.isAbsolute(receiptPath)) throw new Error('controlled_runtime_input_invalid')
  const canonicalPath = process.platform === 'win32'
    ? path.resolve(receiptPath).replaceAll('\\', '/').toLowerCase()
    : path.resolve(receiptPath)
  return createHash('sha256')
    .update('uygunayakkabi:controlled-fresh-candidate:receipt-destination:v1')
    .update('\0')
    .update(canonicalPath)
    .digest('hex')
}

export function createControlledFreshCandidateExecutionGrantToken(
  grant: ControlledFreshCandidateExecutionGrant,
  authorizationKey: Uint8Array,
): Buffer {
  const key = Buffer.from(authorizationKey)
  if (key.byteLength < 32 || key.byteLength > 128) throw new Error('controlled_runtime_authorization_key_invalid')
  return createHmac('sha256', key)
    .update(CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_DOMAIN)
    .update('\0')
    .update(serializeControlledFreshCandidateExecutionGrant(grant))
    .digest()
}

async function readRuntimeInput(scope: ControlledFreshCandidateOperationScope): Promise<{
  input: ControlledFreshCandidateCreationInput
  receiptPath: string
}> {
  const manifestPath = process.env.CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH
  if (!manifestPath || !path.isAbsolute(manifestPath)) throw new Error('controlled_runtime_configuration_missing')
  let parsed: unknown
  try {
    parsed = JSON.parse(await scope.run((signal) => readFile(manifestPath, { encoding: 'utf8', signal })))
  } catch {
    throw new Error('controlled_runtime_input_unavailable')
  }
  if (!exactRuntimeInput(parsed)) throw new Error('controlled_runtime_input_invalid')
  const token = exactBase64(parsed.authorizationTokenBase64, 32, 32)
  const key = exactBase64(parsed.receiptKeyBase64, 32, 128)
  if (!token || !key) throw new Error('controlled_runtime_input_invalid')
  const configuredCommit = process.env[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  const configuredEnvironment = process.env[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
  if (
    !exactContextIdentity(configuredCommit)
    || !exactContextIdentity(configuredEnvironment)
    || parsed.runtimeCommitIdentity !== configuredCommit
    || parsed.environmentIdentity !== configuredEnvironment
  ) throw new Error('controlled_runtime_context_mismatch')
  const original = await scope.run((signal) => readFile(parsed.originalPath, { signal }))
  if (original.byteLength < 1 || original.byteLength > 10_000_000) {
    throw new Error('controlled_runtime_input_invalid')
  }
  return {
    receiptPath: parsed.receiptPath,
    input: {
      executionAuthorization: { identity: parsed.authorizationIdentity, token },
      executionId: parsed.executionId,
      authorizationContext: {
        runtimeCommitIdentity: parsed.runtimeCommitIdentity,
        environmentIdentity: parsed.environmentIdentity,
        approvedReceiptDestinationDigest: controlledFreshCandidateReceiptDestinationDigest(parsed.receiptPath),
      },
      manifest: {
        identity: parsed.manifestIdentity,
        title: parsed.title,
        positivePrice: parsed.positivePrice,
        provenanceStatement: parsed.provenanceStatement,
        stockCandidate: parsed.stockCandidate,
        original: {
          bytes: original,
          mimeType: parsed.originalMimeType,
          width: parsed.originalWidth,
          height: parsed.originalHeight,
        },
      },
      receiptKey: key,
    },
  }
}

export type ControlledFreshCandidateOwnerLedger = {
  root: string
  authorizationDirectory: string
  receiptDirectory: string
  authorizationKey: Buffer
}

function normalizedOwnerPath(value: string): string {
  const resolved = path.resolve(value)
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved
}

async function initializeOwnerLedger(scope: ControlledFreshCandidateOperationScope): Promise<ControlledFreshCandidateOwnerLedger> {
  const configuredRoot = process.env[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV]
  const authorizationKeyText = process.env[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]
  if (!configuredRoot || !path.isAbsolute(configuredRoot) || !authorizationKeyText) {
    throw new Error('controlled_runtime_owner_ledger_missing')
  }
  const authorizationKey = exactBase64(authorizationKeyText, 32, 128)
  if (!authorizationKey) throw new Error('controlled_runtime_owner_ledger_invalid')
  const root = path.resolve(configuredRoot)
  const authorizationDirectory = path.join(root, 'creation-authorizations-v2')
  const receiptDirectory = path.join(root, 'receipt-consumptions-v1')
  await scope.run(async () => {
    await mkdir(root, { recursive: true, mode: 0o700 })
    await mkdir(authorizationDirectory, { recursive: true, mode: 0o700 })
    await mkdir(receiptDirectory, { recursive: true, mode: 0o700 })
  })
  let actualRoot: string
  try {
    actualRoot = realpathSync(root)
  } catch {
    throw new Error('controlled_runtime_owner_ledger_invalid')
  }
  if (normalizedOwnerPath(actualRoot) !== normalizedOwnerPath(root)) {
    throw new Error('controlled_runtime_owner_ledger_invalid')
  }
  return { root, authorizationDirectory, receiptDirectory, authorizationKey }
}

export function createControlledFreshCandidateDurableReceiptConsumer(
  receiptDirectory: string,
): (consumptionIdentity: string) => boolean {
  const fixedDirectory = path.resolve(receiptDirectory)
  return (consumptionIdentity) => {
    if (!/^[0-9a-f]{64}$/.test(consumptionIdentity)) return false
    const markerPath = path.join(fixedDirectory, `${consumptionIdentity}.used`)
    let descriptor: number | null = null
    try {
      descriptor = openSync(markerPath, 'wx', 0o600)
      writeFileSync(descriptor, 'controlled receipt consumed v1\n', 'utf8')
      fsyncSync(descriptor)
      return true
    } catch {
      return false
    } finally {
      if (descriptor !== null) {
        try { closeSync(descriptor) } catch { /* persistence uncertainty fails closed on replay */ }
      }
    }
  }
}

export function createControlledFreshCandidateReceiptPersistence(params: {
  receiptPath: string
  executionId: string
  ledger: ControlledFreshCandidateOwnerLedger
}): {
  persist(serialized: string, signal: AbortSignal): Promise<void>
  consume(grant: ControlledFreshCandidateExecutionGrant, token: Uint8Array, signal: AbortSignal): Promise<boolean>
} {
  const { receiptPath, executionId, ledger } = params
  const safeExecution = executionId.replace(/[^a-z0-9-]/gi, '-').slice(0, 80)
  const temporaryPath = `${receiptPath}.${safeExecution}.next`
  const destinationDigest = controlledFreshCandidateReceiptDestinationDigest(receiptPath)
  let receiptOwned = false
  return {
    async persist(serialized, signal) {
      if (!receiptOwned || signal.aborted) throw new Error('controlled_receipt_not_owned')
      const temporaryReceipt = await open(temporaryPath, 'wx', 0o600)
      try {
        await temporaryReceipt.writeFile(serialized, 'utf8')
        await temporaryReceipt.sync()
      } finally {
        await temporaryReceipt.close()
      }
      if (signal.aborted) throw new Error('controlled_receipt_persist_revoked')
      await rename(temporaryPath, receiptPath)
    },
    async consume(grant, token, signal) {
      if (signal.aborted || grant.approvedReceiptDestinationDigest !== destinationDigest) return false
      const expectedToken = createControlledFreshCandidateExecutionGrantToken(grant, ledger.authorizationKey)
      const suppliedToken = Buffer.from(token)
      if (suppliedToken.byteLength !== expectedToken.byteLength || !timingSafeEqual(suppliedToken, expectedToken)) return false
      const markerDigest = createHmac('sha256', ledger.authorizationKey)
        .update(CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_DOMAIN)
        .update('\0consumption\0')
        .update(serializeControlledFreshCandidateExecutionGrant(grant))
        .digest('hex')
      const markerPath = path.join(ledger.authorizationDirectory, `${markerDigest}.used`)
      try {
        const marker = await open(markerPath, 'wx', 0o600)
        try {
          await marker.writeFile('controlled creation authorization consumed v2\n', 'utf8')
          await marker.sync()
        } finally {
          await marker.close()
        }
        if (signal.aborted) return false
        const reservedReceipt = await open(receiptPath, 'wx', 0o600)
        await reservedReceipt.close()
        receiptOwned = true
        return true
      } catch {
        return false
      }
    },
  }
}

async function createPayloadBoundary(params: {
  uploadCallbacks: { current: import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  expectedFilename: { current: string | null }
  mutationActive: { current: boolean }
  scratchDirectory: string
  scope: ControlledFreshCandidateOperationScope
}): Promise<{
  payload: ControlledRuntimePayload
  pool: VisualPilotRuntimePostgresPool
  dispatcher: { destroy(): Promise<void> }
  terminalizeOwnedResources(): Promise<void>
}> {
  if (process.env.PAYLOAD_DB_PUSH !== 'false') throw new Error('controlled_runtime_db_push_not_disabled')
  const required = ['DATABASE_URI', 'PAYLOAD_SECRET', 'BLOB_READ_WRITE_TOKEN']
  if (required.some((key) => !process.env[key])) throw new Error('controlled_runtime_configuration_missing')
  const databaseUri = process.env.DATABASE_URI as string
  const payloadSecret = process.env.PAYLOAD_SECRET as string
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN as string
  const storeId = blobToken.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
  if (!storeId) throw new Error('controlled_runtime_blob_configuration_invalid')

  const [payloadModule, postgresModule, lexicalModule, sharpModule, cloudModule, blobModule, undiciModule, pgModule] = await Promise.all([
    import('payload'),
    import('@payloadcms/db-postgres'),
    import('@payloadcms/richtext-lexical'),
    import('sharp'),
    import('@payloadcms/plugin-cloud-storage'),
    import('@vercel/blob'),
    import('undici'),
    import('pg'),
  ])
  params.scope.assertActive()
  const [{ Products }, { Variants }, { MediaCollection }, { Brands }, { Categories }, { BlogPosts }, { ImageGenerationJobs }, { BotEvents }, { StoryJobs }] = await Promise.all([
    import('../src/collections/Products'),
    import('../src/collections/Variants'),
    import('../src/collections/Media'),
    import('../src/collections/Brands'),
    import('../src/collections/Categories'),
    import('../src/collections/BlogPosts'),
    import('../src/collections/ImageGenerationJobs'),
    import('../src/collections/BotEvents'),
    import('../src/collections/StoryJobs'),
  ])
  params.scope.assertActive()

  const dispatcher = new undiciModule.Agent({
    connections: 1,
    pipelining: 0,
    connect: { timeout: 10_000 },
    headersTimeout: 15_000,
    bodyTimeout: 15_000,
  })
  undiciModule.setGlobalDispatcher(dispatcher)
  const ownedClients = new Set<InstanceType<typeof pgModule.Client>>()
  let ControlledPostgresClient: typeof pgModule.Client
  ControlledPostgresClient = new Proxy(pgModule.Client, {
    construct(target, args, newTarget) {
      params.scope.assertActive()
      const client = Reflect.construct(target, args, newTarget) as InstanceType<typeof pgModule.Client>
      if (newTarget === ControlledPostgresClient) ownedClients.add(client)
      return client
    },
  })
  let transportClose: Promise<void> | null = null
  const destroyTransport = () => {
    transportClose ??= dispatcher.destroy()
    return transportClose
  }
  let payloadForCancellation: ControlledRuntimePayload | null = null
  let poolForCancellation: VisualPilotRuntimePostgresPool | null = null
  let payloadDestroyStarted = false
  let poolEndStarted = false
  const terminalizeOwnedResources = async (): Promise<void> => {
    params.mutationActive.current = false
    const clients = [...ownedClients]
    let ok = true
    const terminalResults = await Promise.allSettled([
      destroyTransport(),
      ...clients.filter((client) => !(client as { _ending?: boolean })._ending).map(async (client) => {
        try { await client.end() } finally {
          try { client.unref() } catch { /* the socket was already made terminal */ }
        }
      }),
    ])
    if (terminalResults.some((result) => result.status === 'rejected')) ok = false
    if (payloadForCancellation && !payloadDestroyStarted) {
      payloadDestroyStarted = true
      try { await bounded(payloadForCancellation.destroy(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS) } catch { ok = false }
    }
    if (poolForCancellation && !poolEndStarted) {
      poolEndStarted = true
      try { await bounded(poolForCancellation.end(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS) } catch { ok = false }
    }
    if (!ok) throw new Error('controlled_runtime_teardown_failed')
  }
  params.scope.registerCancellation(terminalizeOwnedResources)
  const baseUrl = `https://${storeId}.public.blob.vercel-storage.com`
  const controlledAdapter = () => ({
    name: 'controlled-vercel-blob',
    generateURL: ({ filename }: { filename: string }) => `${baseUrl}/${encodeURIComponent(filename)}`,
    handleDelete: async () => { throw new Error('controlled_storage_delete_denied') },
    handleUpload: async ({ file }: { file: { buffer: Buffer; filename: string; mimeType: string } }) => {
      if (!params.mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      const callbacks = params.uploadCallbacks.current
      if (!callbacks) throw new Error('controlled_upload_callbacks_missing')
      await callbacks.beforeUpload(file.filename)
      params.scope.assertActive()
      if (!params.mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      let completed = false
      try {
        const result = await blobModule.put(file.filename, file.buffer, {
          access: 'public',
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          contentType: file.mimeType,
          multipart: false,
          token: blobToken,
        })
        params.scope.assertActive()
        if (!params.mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
        if (result.pathname !== file.filename || result.url !== `${baseUrl}/${file.filename}`) {
          throw new Error('controlled_storage_identity_mismatch')
        }
        await callbacks.afterUpload(file.filename)
        completed = true
        return { filename: file.filename }
      } finally {
        if (!completed) {
          try { await callbacks.uploadUncertain(file.filename) } catch { /* receipt failure already closes the boundary */ }
        }
      }
    },
    staticHandler: async () => { throw new Error('controlled_runtime_server_disabled') },
  })

  const mediaBeforeChange = async ({ data }: { data: RecordValue }) => {
    const expected = params.expectedFilename.current
    if (!controlledFreshCandidateFilenameIsApproved(expected, data.filename)) {
      throw new Error('controlled_media_filename_changed')
    }
    return data
  }
  const isolatedMedia = {
    ...MediaCollection,
    hooks: {
      ...MediaCollection.hooks,
      beforeChange: [...(MediaCollection.hooks?.beforeChange ?? []), mediaBeforeChange],
    },
    upload: {
      ...(typeof MediaCollection.upload === 'object' ? MediaCollection.upload : {}),
      staticDir: params.scratchDirectory,
    },
  }
  const poolOptions = {
    Client: ControlledPostgresClient,
    connectionString: databaseUri,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 1_000,
    statement_timeout: 40_000,
    query_timeout: 42_000,
    lock_timeout: 10_000,
    idle_in_transaction_session_timeout: 40_000,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  }
  const baseConfig = {
    collections: [Products, Variants, isolatedMedia, Brands, Categories, BlogPosts, ImageGenerationJobs, BotEvents, StoryJobs],
    jobs: { tasks: [] },
    db: postgresModule.postgresAdapter({ logger: false, pool: poolOptions, push: false }),
    editor: lexicalModule.lexicalEditor(),
    secret: payloadSecret,
    sharp: sharpModule.default,
    logger: createControlledFreshCandidateBoundaryLoggerConfiguration(),
  }
  const storageConfig = cloudModule.cloudStoragePlugin({
    collections: { media: { adapter: controlledAdapter } },
  })(baseConfig as Parameters<typeof payloadModule.buildConfig>[0])
  const config = payloadModule.buildConfig(storageConfig as Parameters<typeof payloadModule.buildConfig>[0])
  let payload: ControlledRuntimePayload
  try {
    payload = await payloadModule.getPayload({ config }) as unknown as ControlledRuntimePayload
    payloadForCancellation = payload
    if (params.scope.signal.aborted) {
      await terminalizeOwnedResources()
      throw new Error('controlled_runtime_deadline')
    }
  } catch (error) {
    try { await terminalizeOwnedResources() } catch { /* initialization remains failed closed */ }
    throw error
  }
  let pool: VisualPilotRuntimePostgresPool
  try {
    pool = runtimePool(payload)
    poolForCancellation = pool
  } catch {
    try { await terminalizeOwnedResources() } catch { /* initialization remains failed closed */ }
    throw new Error('controlled_runtime_pool_unavailable')
  }
  return { payload, pool, dispatcher, terminalizeOwnedResources }
}

function createCachedTeardown(params: {
  terminalizeOwnedResources(): Promise<void>
  scratchDirectory: string
  mutationActive: { current: boolean }
}): () => Promise<{ ok: true } | { ok: false }> {
  let cached: Promise<{ ok: true } | { ok: false }> | null = null
  return () => {
    if (cached) return cached
    cached = (async () => {
      params.mutationActive.current = false
      let ok = true
      try {
        await bounded(params.terminalizeOwnedResources(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS * 3)
      } catch { ok = false }
      try {
        await bounded(rm(params.scratchDirectory, { recursive: true, force: true }), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS)
      } catch { ok = false }
      return ok ? { ok: true } : { ok: false }
    })()
    return cached
  }
}

export async function initializeControlledFreshCandidateCreationRuntime(
  providedScope?: ControlledFreshCandidateOperationScope,
): Promise<ControlledFreshCandidateRuntimeResource> {
  const scope = providedScope ?? createControlledFreshCandidateOperationScope({
    timeoutMs: CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  })
  configureBlobProcessBoundary()
  const { input, receiptPath } = await readRuntimeInput(scope)
  const ledger = await initializeOwnerLedger(scope)
  const persistence = createControlledFreshCandidateReceiptPersistence({
    receiptPath,
    executionId: input.executionId,
    ledger,
  })
  const uploadCallbacks = { current: null as import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  const expectedFilename = { current: null as string | null }
  const mutationActive = { current: false }
  let scratchDirectory: string | null = null
  let payloadBoundaryPromise: Promise<Awaited<ReturnType<typeof createPayloadBoundary>>> | null = null
  const assertMutation = (signal: AbortSignal): void => {
    scope.assertActive()
    if (signal.aborted || !mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
  }
  const ensurePayloadBoundary = async (signal: AbortSignal) => {
    assertMutation(signal)
    if (!payloadBoundaryPromise) {
      payloadBoundaryPromise = (async () => {
        scratchDirectory = await mkdtemp(path.join(tmpdir(), 'uygunayakkabi-cfc-'))
        if ((await readdir(scratchDirectory)).length !== 0) throw new Error('controlled_runtime_scratch_not_empty')
        return createPayloadBoundary({ uploadCallbacks, expectedFilename, mutationActive, scratchDirectory, scope })
      })()
    }
    const boundary = await payloadBoundaryPromise
    assertMutation(signal)
    return boundary
  }
  let teardownPromise: Promise<{ ok: true } | { ok: false }> | null = null
  const teardown = () => {
    teardownPromise ??= (async () => {
      mutationActive.current = false
      let ok = true
      if (payloadBoundaryPromise) {
        try {
          const boundary = await bounded(payloadBoundaryPromise, CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS)
          const boundaryTeardown = createCachedTeardown({
            terminalizeOwnedResources: boundary.terminalizeOwnedResources,
            scratchDirectory: scratchDirectory as string,
            mutationActive,
          })
          if (!(await boundaryTeardown()).ok) ok = false
        } catch { ok = false }
      }
      if (scratchDirectory) {
        try {
          await bounded(
            rm(scratchDirectory, { recursive: true, force: true }),
            CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS,
          )
        } catch { ok = false }
      }
      return ok ? { ok: true as const } : { ok: false as const }
    })()
    return teardownPromise
  }
  const dependencies: ControlledFreshCandidateCreationDependencies = {
    scope,
    async consumeExecutionAuthorization(grant, token, signal) {
      const consumed = await persistence.consume(grant, token, signal)
      if (consumed && !signal.aborted) mutationActive.current = true
      return consumed
    },
    async stockExists(stockCandidate, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      const result = normalizePayloadPage(await payload.find({
        collection: 'products',
        where: { stockNumber: { equals: stockCandidate } },
        depth: 0,
        page: 1,
        limit: 2,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), 1, 2)
      assertMutation(signal)
      return result.totalDocs > 0
    },
    async createTransactionRequest(signal) {
      const [{ payload }, payloadModule] = await Promise.all([ensurePayloadBoundary(signal), import('payload')])
      assertMutation(signal)
      return payloadModule.createLocalReq({}, payload as never)
    },
    async beginProductTransaction(request, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      const req = request as { transactionID?: unknown }
      if (!isPlainRecord(payload.db) || typeof payload.db.beginTransaction !== 'function') return false
      const transactionId = await payload.db.beginTransaction()
      assertMutation(signal)
      if (typeof transactionId !== 'string' || !transactionId) return false
      req.transactionID = transactionId
      return true
    },
    async createProduct(request, data, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      return payload.create({ collection: 'products', data, req: request, depth: 0, overrideAccess: true })
    },
    async commitProductTransaction(request, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      const req = request as { transactionID?: unknown }
      if (!isPlainRecord(payload.db) || typeof payload.db.commitTransaction !== 'function' || typeof req.transactionID !== 'string') {
        throw new Error('controlled_transaction_unavailable')
      }
      await payload.db.commitTransaction(req.transactionID)
      assertMutation(signal)
      delete req.transactionID
    },
    async rollbackProductTransaction(request) {
      const boundary = payloadBoundaryPromise ? await payloadBoundaryPromise : null
      const payload = boundary?.payload
      const req = request as { transactionID?: unknown }
      if (!payload || !isPlainRecord(payload.db) || typeof payload.db.rollbackTransaction !== 'function' || typeof req.transactionID !== 'string') {
        throw new Error('controlled_transaction_unavailable')
      }
      const transactionId = req.transactionID
      delete req.transactionID
      await payload.db.rollbackTransaction(transactionId)
    },
    async readProduct(productId, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      const result = await payload.findByID({ collection: 'products', id: productId, depth: 0, disableErrors: true, overrideAccess: true })
      assertMutation(signal)
      return result
    },
    async createMedia(params) {
      const { payload } = await ensurePayloadBoundary(params.signal)
      assertMutation(params.signal)
      uploadCallbacks.current = params.uploads
      expectedFilename.current = params.file.name
      try {
        return await payload.create({
          collection: 'media',
          data: params.data,
          file: params.file,
          depth: 0,
          overrideAccess: true,
          overwriteExistingFiles: false,
        })
      } finally {
        uploadCallbacks.current = null
        expectedFilename.current = null
      }
    },
    async readMedia(mediaId, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      const result = await payload.findByID({ collection: 'media', id: mediaId, depth: 0, disableErrors: true, overrideAccess: true })
      assertMutation(signal)
      return result
    },
    async updateProductRelationship(productId, mediaId, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      return payload.update({ collection: 'products', id: productId, data: { images: [{ image: mediaId }] }, depth: 0, overrideAccess: true })
    },
    async finalizeProduct(params) {
      const { payload } = await ensurePayloadBoundary(params.signal)
      return finalizeControlledFreshCandidateProductAtomically({
        payload,
        scope,
        mutationActive,
        ...params,
      })
    },
    persistPrivateReceipt: persistence.persist,
    async revokeMutationCapability() {
      mutationActive.current = false
      await scope.cancel()
    },
    teardown,
  }
  return {
    creationInput: input,
    creationDependencies: dependencies,
    scope,
    async destroy() {
      const result = await teardown()
      scope.close()
      return result
    },
  }
}

export async function initializeControlledFreshCandidateVerificationRuntime(
  providedScope?: ControlledFreshCandidateOperationScope,
): Promise<ControlledFreshCandidateVerificationResource> {
  const scope = providedScope ?? createControlledFreshCandidateOperationScope({
    timeoutMs: CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  })
  configureBlobProcessBoundary()
  const receiptPath = process.env.CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH
  const keyText = process.env.CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_BASE64
  if (!receiptPath || !path.isAbsolute(receiptPath) || !keyText) throw new Error('controlled_runtime_configuration_missing')
  const key = exactBase64(keyText, 32, 128)
  const commitIdentity = process.env[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  const environmentIdentity = process.env[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
  if (!key || !exactContextIdentity(commitIdentity) || !exactContextIdentity(environmentIdentity)) {
    throw new Error('controlled_runtime_configuration_missing')
  }
  const ledger = await initializeOwnerLedger(scope)
  const capability = authenticateControlledFreshCandidateReceipt({
    serialized: await scope.run((signal) => readFile(receiptPath, { encoding: 'utf8', signal })),
    key,
    expectedCommitIdentity: commitIdentity,
    expectedEnvironmentIdentity: environmentIdentity,
    consume: createControlledFreshCandidateDurableReceiptConsumer(ledger.receiptDirectory),
  })
  const scratchDirectory = await mkdtemp(path.join(tmpdir(), 'uygunayakkabi-cfc-verify-'))
  const uploadCallbacks = { current: null as import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  const expectedFilename = { current: null as string | null }
  const mutationActive = { current: false }
  let payloadBoundary: Awaited<ReturnType<typeof createPayloadBoundary>>
  try {
    payloadBoundary = await scope.run(() => createPayloadBoundary({ uploadCallbacks, expectedFilename, mutationActive, scratchDirectory, scope }))
  } catch (error) {
    await rm(scratchDirectory, { recursive: true, force: true })
    throw error
  }
  const { payload, pool, terminalizeOwnedResources } = payloadBoundary
  const teardown = createCachedTeardown({ terminalizeOwnedResources, scratchDirectory, mutationActive })
  return {
    capability,
    dependencies: {
      gateway: createStrictGateway(payload, pool, scope),
      mediaRead: { canonicalOrigin: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.uygunayakkabi.com' },
      operationScope: scope,
      teardown,
    },
    scope,
    async destroy() {
      const result = await teardown()
      scope.close()
      return result
    },
  }
}

export async function executeControlledCreationResource(
  resource: ControlledFreshCandidateRuntimeResource,
): Promise<ControlledFreshCandidatePublicReport> {
  return createControlledFreshCandidate(resource.creationInput, resource.creationDependencies)
}
