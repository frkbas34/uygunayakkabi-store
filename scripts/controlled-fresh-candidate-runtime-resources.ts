import { createHash } from 'node:crypto'
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
  createControlledFreshCandidate,
  defaultControlledFreshCandidateCreationDependenciesRandomBytes,
  type ControlledFreshCandidateCreationDependencies,
  type ControlledFreshCandidateCreationInput,
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
  createVisualPilotRuntimeCleanup,
  createVisualPilotRuntimePostgresClientConstructor,
  destroyVisualPilotPayloadWithinBoundary,
  type VisualPilotRuntimePostgresPool,
  type VisualPilotRuntimeTeardownResult,
} from './visual-pilot-target-runtime-resources'

export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION = 'controlled-fresh-candidate-runtime-input/v1' as const
export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS = 5_000
export const CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0

export function controlledFreshCandidateFilenameIsApproved(
  expectedFilename: string | null,
  actualFilename: unknown,
): actualFilename is string {
  return typeof actualFilename === 'string'
    && expectedFilename !== null
    && actualFilename === expectedFilename
}

type RecordValue = Record<string, unknown>

type ControlledRuntimePayload = FreshVisualDiscoveryRuntimePayload & {
  create(args: RecordValue): Promise<unknown>
  update(args: RecordValue): Promise<unknown>
  findByID(args: RecordValue): Promise<unknown>
  destroy(): Promise<void>
  db?: unknown
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
}

export type ControlledFreshCandidateRuntimeResource = {
  creationInput: ControlledFreshCandidateCreationInput
  creationDependencies: ControlledFreshCandidateCreationDependencies
  destroy(): Promise<{ ok: true } | { ok: false }>
}

export type ControlledFreshCandidateVerificationResource = {
  capability: ControlledFreshCandidateTargetCapability
  dependencies: ControlledFreshCandidateStrictTargetDependencies
  destroy(): Promise<{ ok: true } | { ok: false }>
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

function exactRuntimeInput(value: unknown): value is ControlledRuntimeInputFile {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, [
    'version', 'authorizationIdentity', 'authorizationTokenBase64', 'executionId',
    'manifestIdentity', 'title', 'positivePrice', 'provenanceStatement', 'stockCandidate',
    'originalPath', 'originalMimeType', 'originalWidth', 'originalHeight', 'receiptPath',
    'receiptKeyBase64',
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
): FreshVisualStrictTargetGateway {
  const discovery = createFreshVisualDiscoveryRuntimeGateway(payload, pool)
  return {
    async readOwnedProduct(productId) {
      return payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      })
    },
    readMediaPage: discovery.readMediaPage,
    readGeneratedGalleryOwnerPage: discovery.readGeneratedGalleryOwnerPage,
    readImageJobPage: discovery.readImageJobPage,
    readQueueReceiptPage: discovery.readQueueReceiptPage,
    readBotEventPage: discovery.readBotEventPage,
    readStoryJobPage: discovery.readStoryJobPage,
  }
}

async function readRuntimeInput(): Promise<{
  input: ControlledFreshCandidateCreationInput
  receiptPath: string
}> {
  const manifestPath = process.env.CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH
  if (!manifestPath || !path.isAbsolute(manifestPath)) throw new Error('controlled_runtime_configuration_missing')
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    throw new Error('controlled_runtime_input_unavailable')
  }
  if (!exactRuntimeInput(parsed)) throw new Error('controlled_runtime_input_invalid')
  const token = exactBase64(parsed.authorizationTokenBase64, 16, 128)
  const key = exactBase64(parsed.receiptKeyBase64, 32, 128)
  if (!token || !key) throw new Error('controlled_runtime_input_invalid')
  const original = await readFile(parsed.originalPath)
  if (original.byteLength < 1 || original.byteLength > 10_000_000) {
    throw new Error('controlled_runtime_input_invalid')
  }
  return {
    receiptPath: parsed.receiptPath,
    input: {
      executionAuthorization: { identity: parsed.authorizationIdentity, token },
      executionId: parsed.executionId,
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

function receiptPersistence(receiptPath: string, executionId: string): {
  persist(serialized: string): Promise<void>
  consume(identity: string, token: Uint8Array): Promise<boolean>
} {
  const safeExecution = executionId.replace(/[^a-z0-9-]/gi, '-').slice(0, 80)
  const temporaryPath = `${receiptPath}.${safeExecution}.next`
  let receiptOwned = false
  return {
    async persist(serialized) {
      if (!receiptOwned) throw new Error('controlled_receipt_not_owned')
      const temporaryReceipt = await open(temporaryPath, 'wx', 0o600)
      try {
        await temporaryReceipt.writeFile(serialized, 'utf8')
        await temporaryReceipt.sync()
      } finally {
        await temporaryReceipt.close()
      }
      await rename(temporaryPath, receiptPath)
    },
    async consume(identity, token) {
      const markerDigest = createHash('sha256')
        .update('uygunayakkabi:controlled-fresh-candidate:execution-authorization:v1')
        .update('\0')
        .update(identity)
        .update('\0')
        .update(token)
        .digest('hex')
      const markerPath = `${receiptPath}.authorization-${markerDigest}.used`
      try {
        const marker = await open(markerPath, 'wx', 0o600)
        try {
          await marker.writeFile('consumed\n', 'utf8')
          await marker.sync()
        } finally {
          await marker.close()
        }
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
}): Promise<{
  payload: ControlledRuntimePayload
  pool: VisualPilotRuntimePostgresPool
  dispatcher: { destroy(): Promise<void> }
}> {
  if (process.env.PAYLOAD_DB_PUSH !== 'false') throw new Error('controlled_runtime_db_push_not_disabled')
  const required = ['DATABASE_URI', 'PAYLOAD_SECRET', 'BLOB_READ_WRITE_TOKEN']
  if (required.some((key) => !process.env[key])) throw new Error('controlled_runtime_configuration_missing')
  const databaseUri = process.env.DATABASE_URI as string
  const payloadSecret = process.env.PAYLOAD_SECRET as string
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN as string
  const storeId = blobToken.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/i)?.[1]?.toLowerCase()
  if (!storeId) throw new Error('controlled_runtime_blob_configuration_invalid')

  const [payloadModule, postgresModule, lexicalModule, sharpModule, cloudModule, blobModule, undiciModule] = await Promise.all([
    import('payload'),
    import('@payloadcms/db-postgres'),
    import('@payloadcms/richtext-lexical'),
    import('sharp'),
    import('@payloadcms/plugin-cloud-storage'),
    import('@vercel/blob'),
    import('undici'),
  ])
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

  const dispatcher = new undiciModule.Agent({
    connections: 1,
    pipelining: 0,
    connect: { timeout: 10_000 },
    headersTimeout: 15_000,
    bodyTimeout: 15_000,
  })
  undiciModule.setGlobalDispatcher(dispatcher)
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
    Client: createVisualPilotRuntimePostgresClientConstructor(),
    connectionString: databaseUri,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 1_000,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  }
  const baseConfig = {
    collections: [Products, Variants, isolatedMedia, Brands, Categories, BlogPosts, ImageGenerationJobs, BotEvents, StoryJobs],
    jobs: { tasks: [] },
    db: postgresModule.postgresAdapter({ pool: poolOptions, push: false }),
    editor: lexicalModule.lexicalEditor(),
    secret: payloadSecret,
    sharp: sharpModule.default,
  }
  const storageConfig = cloudModule.cloudStoragePlugin({
    collections: { media: { adapter: controlledAdapter } },
  })(baseConfig as Parameters<typeof payloadModule.buildConfig>[0])
  const config = payloadModule.buildConfig(storageConfig as Parameters<typeof payloadModule.buildConfig>[0])
  let payload: ControlledRuntimePayload
  try {
    payload = await payloadModule.getPayload({ config }) as unknown as ControlledRuntimePayload
  } catch (error) {
    try { await bounded(dispatcher.destroy(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS) } catch { /* initialization remains failed closed */ }
    throw error
  }
  let pool: VisualPilotRuntimePostgresPool
  try {
    pool = runtimePool(payload)
  } catch {
    const teardown = await destroyVisualPilotPayloadWithinBoundary({ payloadDestroy: () => payload.destroy() })
    try { await bounded(dispatcher.destroy(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS) } catch { /* initialization remains failed closed */ }
    if (!teardown.ok) throw new Error(teardown.code)
    throw new Error('controlled_runtime_pool_unavailable')
  }
  return { payload, pool, dispatcher }
}

function createCachedTeardown(params: {
  payload: ControlledRuntimePayload
  pool: VisualPilotRuntimePostgresPool
  destroyTransport(): Promise<void>
  scratchDirectory: string
  mutationActive: { current: boolean }
}): () => Promise<{ ok: true } | { ok: false }> {
  let cached: Promise<{ ok: true } | { ok: false }> | null = null
  return () => {
    if (cached) return cached
    cached = (async () => {
      params.mutationActive.current = false
      let ok = true
      try { await bounded(params.destroyTransport(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS) } catch { ok = false }
      const payloadCleanup = createVisualPilotRuntimeCleanup({
        payloadDestroy: () => params.payload.destroy(),
        pool: params.pool,
        timeoutMs: CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS,
      })
      let teardown: VisualPilotRuntimeTeardownResult
      try { teardown = await payloadCleanup() } catch { teardown = { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_FAILED' } }
      if (!teardown.ok) ok = false
      try {
        await bounded(rm(params.scratchDirectory, { recursive: true, force: true }), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS)
      } catch { ok = false }
      return ok ? { ok: true } : { ok: false }
    })()
    return cached
  }
}

export async function initializeControlledFreshCandidateCreationRuntime(): Promise<ControlledFreshCandidateRuntimeResource> {
  configureBlobProcessBoundary()
  const { input, receiptPath } = await readRuntimeInput()
  const scratchDirectory = await mkdtemp(path.join(tmpdir(), 'uygunayakkabi-cfc-'))
  await mkdir(scratchDirectory, { recursive: false }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error
  })
  if ((await readdir(scratchDirectory)).length !== 0) throw new Error('controlled_runtime_scratch_not_empty')
  const uploadCallbacks = { current: null as import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  const expectedFilename = { current: null as string | null }
  const mutationActive = { current: true }
  let payloadBoundary: Awaited<ReturnType<typeof createPayloadBoundary>>
  try {
    payloadBoundary = await createPayloadBoundary({ uploadCallbacks, expectedFilename, mutationActive, scratchDirectory })
  } catch (error) {
    await rm(scratchDirectory, { recursive: true, force: true })
    throw error
  }
  const { payload, pool, dispatcher } = payloadBoundary
  let transportClose: Promise<void> | null = null
  const destroyTransport = () => {
    transportClose ??= dispatcher.destroy()
    return transportClose
  }
  const teardown = createCachedTeardown({ payload, pool, destroyTransport, scratchDirectory, mutationActive })
  const persistence = receiptPersistence(receiptPath, input.executionId)
  const payloadModule = await import('payload')
  const dependencies: ControlledFreshCandidateCreationDependencies = {
    consumeExecutionAuthorization: persistence.consume,
    async stockExists(stockCandidate) {
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
      return result.totalDocs > 0
    },
    createTransactionRequest: () => payloadModule.createLocalReq({}, payload as never),
    async beginProductTransaction(request) {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      const req = request as { transactionID?: unknown }
      if (!isPlainRecord(payload.db) || typeof payload.db.beginTransaction !== 'function') return false
      const transactionId = await payload.db.beginTransaction()
      if (typeof transactionId !== 'string' || !transactionId) return false
      req.transactionID = transactionId
      return true
    },
    createProduct: (request, data) => {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      return payload.create({ collection: 'products', data, req: request, depth: 0, overrideAccess: true })
    },
    async commitProductTransaction(request) {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      const req = request as { transactionID?: unknown }
      if (!isPlainRecord(payload.db) || typeof payload.db.commitTransaction !== 'function' || typeof req.transactionID !== 'string') {
        throw new Error('controlled_transaction_unavailable')
      }
      await payload.db.commitTransaction(req.transactionID)
      delete req.transactionID
    },
    async rollbackProductTransaction(request) {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      const req = request as { transactionID?: unknown }
      if (!isPlainRecord(payload.db) || typeof payload.db.rollbackTransaction !== 'function' || typeof req.transactionID !== 'string') {
        throw new Error('controlled_transaction_unavailable')
      }
      const transactionId = req.transactionID
      delete req.transactionID
      await payload.db.rollbackTransaction(transactionId)
    },
    readProduct: (productId) => payload.findByID({ collection: 'products', id: productId, depth: 0, disableErrors: true, overrideAccess: true }),
    async createMedia(params) {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
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
    readMedia: (mediaId) => payload.findByID({ collection: 'media', id: mediaId, depth: 0, disableErrors: true, overrideAccess: true }),
    updateProductRelationship: (productId, mediaId) => {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      return payload.update({ collection: 'products', id: productId, data: { images: [{ image: mediaId }] }, depth: 0, overrideAccess: true })
    },
    async finalizeProduct(productId) {
      if (!mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      const current = await payload.findByID({ collection: 'products', id: productId, depth: 0, disableErrors: true, overrideAccess: true })
      if (!isPlainRecord(current) || !isPlainRecord(current.workflow) || current.workflow.confirmationStatus !== 'blocked') {
        throw new Error('controlled_finalization_state_invalid')
      }
      return payload.update({
        collection: 'products',
        id: productId,
        data: { workflow: { ...current.workflow, confirmationStatus: 'pending' } },
        depth: 0,
        overrideAccess: true,
      })
    },
    persistPrivateReceipt: persistence.persist,
    async revokeMutationCapability() {
      mutationActive.current = false
      await bounded(destroyTransport(), CONTROLLED_FRESH_CANDIDATE_RUNTIME_TEARDOWN_TIMEOUT_MS)
    },
    teardown,
    randomBytes: defaultControlledFreshCandidateCreationDependenciesRandomBytes,
    now: Date.now,
  }
  return { creationInput: input, creationDependencies: dependencies, destroy: teardown }
}

export async function initializeControlledFreshCandidateVerificationRuntime(): Promise<ControlledFreshCandidateVerificationResource> {
  configureBlobProcessBoundary()
  const receiptPath = process.env.CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH
  const keyText = process.env.CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_BASE64
  if (!receiptPath || !path.isAbsolute(receiptPath) || !keyText) throw new Error('controlled_runtime_configuration_missing')
  const key = exactBase64(keyText, 32, 128)
  if (!key) throw new Error('controlled_runtime_configuration_missing')
  const capability = authenticateControlledFreshCandidateReceipt({
    serialized: await readFile(receiptPath, 'utf8'),
    key,
  })
  const scratchDirectory = await mkdtemp(path.join(tmpdir(), 'uygunayakkabi-cfc-verify-'))
  const uploadCallbacks = { current: null as import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  const expectedFilename = { current: null as string | null }
  const mutationActive = { current: false }
  let payloadBoundary: Awaited<ReturnType<typeof createPayloadBoundary>>
  try {
    payloadBoundary = await createPayloadBoundary({ uploadCallbacks, expectedFilename, mutationActive, scratchDirectory })
  } catch (error) {
    await rm(scratchDirectory, { recursive: true, force: true })
    throw error
  }
  const { payload, pool, dispatcher } = payloadBoundary
  let transportClose: Promise<void> | null = null
  const destroyTransport = () => {
    transportClose ??= dispatcher.destroy()
    return transportClose
  }
  const teardown = createCachedTeardown({ payload, pool, destroyTransport, scratchDirectory, mutationActive })
  return {
    capability,
    dependencies: {
      gateway: createStrictGateway(payload, pool),
      mediaRead: { canonicalOrigin: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.uygunayakkabi.com' },
      teardown,
    },
    destroy: teardown,
  }
}

export async function executeControlledCreationResource(
  resource: ControlledFreshCandidateRuntimeResource,
): Promise<ControlledFreshCandidatePublicReport> {
  return createControlledFreshCandidate(resource.creationInput, resource.creationDependencies)
}
