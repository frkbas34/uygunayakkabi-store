import {
  createHash,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from 'node:crypto'
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  realpathSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from 'node:fs'
import {
  mkdtemp,
  open,
  readdir,
  rename,
  rm,
} from 'node:fs/promises'
import path from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'

import {
  CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_DOMAIN,
  CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS,
  assertControlledFreshCandidateAuthorizationActive,
  controlledFreshCandidateExecutionGrantIsCanonical,
  controlledFreshCandidateDigest,
  controlledFreshCandidateBoundedShutdown,
  registerControlledFreshCandidatePhysicalShutdown,
  controlledFreshCandidateMediaMatches,
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
  CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY,
  CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES,
  CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY,
  authenticateControlledFreshCandidateReceiptBytes,
  readControlledFreshCandidateCapability,
  type ControlledFreshCandidateTargetCapability,
  type ControlledFreshCandidateBlobDescriptor,
} from '../src/lib/controlledFreshCandidateReceipt'
import type {
  ControlledFreshCandidateStrictTargetDependencies,
} from '../src/lib/controlledFreshCandidateTargetVerifier'
import {
  CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PHASES,
  authenticateControlledFreshCandidateObservation,
  controlledFreshCandidateObservationCanInitialize,
  createControlledFreshCandidateObservationState,
  type ControlledFreshCandidateObservationResources,
} from '../src/lib/controlledFreshCandidateObservation'
import {
  orderVisualMutationLocks,
  type VisualMutationLockSurface,
} from '../src/lib/visualMutationLockOrder'
import type { FreshVisualStrictTargetGateway } from '../src/lib/freshVisualProductDiscovery'
import { readVisualPilotMediaEvidence } from '../src/lib/visualPilotMediaEvidence'
import {
  createFreshVisualDiscoveryRuntimeGateway,
  type FreshVisualDiscoveryRuntimePayload,
} from './fresh-visual-product-runtime-resources'
import {
  type VisualPilotRuntimePostgresPool,
} from './visual-pilot-target-runtime-resources'
import {
  controlledFreshCandidateBudgetForScope,
  CONTROLLED_FRESH_CANDIDATE_QUEUE_RECEIPTS_SQL,
  validateControlledFreshCandidatePilotManifest,
  type ControlledFreshCandidatePilotManifest,
  type ControlledFreshCandidateRuntimeBudget,
  type ControlledFreshCandidateRuntimeBudgetReport,
} from '../src/lib/controlledFreshCandidatePilotContract'
import {
  createControlledFreshCandidateSecurePgClientConstructor,
  controlledFreshCandidateSecurePgConfig,
} from './controlled-fresh-candidate-pg-security'

export const CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION = 'controlled-fresh-candidate-runtime-input/v3' as const
export const CONTROLLED_FRESH_CANDIDATE_BLOB_RETRY_BUDGET = 0
export const CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT = '/home/w11/.local/share/uygunayakkabi/controlled-fresh-candidate' as const
export const CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV = 'CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY' as const
export const CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV = 'CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_BASE64' as const
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV = 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_BASE64' as const
export const CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_DEPLOYED_COMMIT_IDENTITY' as const
export const CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV = 'CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY' as const
export const CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH' as const
export const CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH' as const
export const CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV = 'CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH' as const
export const CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC = 0xef53
export const CONTROLLED_FRESH_CANDIDATE_MAX_ORIGINAL_BYTES = 10_000_000
export const CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES = 65_536

export function serializeControlledFreshCandidateUploads<T>(handler: (input: T) => Promise<undefined>) {
  let tail = Promise.resolve<undefined>(undefined)
  let requested = 0
  return (input: T): Promise<undefined> => {
    requested += 1
    if (requested > 4) return Promise.reject(new Error('CONTROLLED_BLOB_WRITE_BUDGET_EXHAUSTED'))
    // Installed storage hooks dispatch Promise.all; serializing here keeps
    // intent ordinals deterministic and stops all later writes after failure.
    const next = tail.then(() => handler(input))
    tail = next
    next.catch(() => undefined)
    return next
  }
}

export type ControlledFreshCandidateBlobObservationIo = {
  list(prefix: string): Promise<{ keys: readonly string[]; hasMore: boolean }>
  head(key: string): Promise<{ key: string; url: string; byteSize: number; mimeType: string; contentDigest?: string; width?: number; height?: number }>
  read(key: string, url: string, signal: AbortSignal): Promise<{ contentDigest: string; byteSize: number; mimeType: string; width: number; height: number }>
}

export async function observeControlledFreshCandidateBlobSet(params: {
  expected: readonly ControlledFreshCandidateBlobDescriptor[]
  origin: string
  signal: AbortSignal
  budget: ControlledFreshCandidateRuntimeBudget
  io: ControlledFreshCandidateBlobObservationIo
}): Promise<readonly ControlledFreshCandidateBlobDescriptor[]> {
  const original = params.expected[0]
  if (!original || params.expected.length > 4 || new Set(params.expected.map((item) => item.key)).size !== params.expected.length) {
    throw new Error('CONTROLLED_BLOB_EXPECTED_SET_INVALID')
  }
  const prefix = original.key.slice(0, original.key.lastIndexOf('.'))
  const assertActive = () => { if (params.signal.aborted) throw new Error('CONTROLLED_BLOB_OBSERVATION_ABORTED') }
  assertActive()
  params.budget.blobObservation()
  const listed = await params.io.list(prefix)
  if (listed.hasMore || listed.keys.length !== params.expected.length || new Set(listed.keys).size !== listed.keys.length
    || listed.keys.some((key) => !params.expected.some((item) => item.key === key))) throw new Error('CONTROLLED_BLOB_OBSERVED_SET_INVALID')
  const observed: ControlledFreshCandidateBlobDescriptor[] = []
  for (const expected of [...params.expected].sort((a, b) => a.key.localeCompare(b.key))) {
    assertActive()
    params.budget.blobObservation()
    const head = await params.io.head(expected.key)
    if (head.key !== expected.key || head.url !== `${params.origin}/${expected.key}`
      || head.byteSize !== expected.byteSize || head.mimeType !== expected.mimeType) throw new Error('CONTROLLED_BLOB_HEAD_MISMATCH')
    let evidence = head
    if (!/^[a-f0-9]{64}$/u.test(head.contentDigest ?? '') || !head.width || !head.height) {
      assertActive()
      params.budget.blobObservation()
      evidence = { ...head, ...await params.io.read(expected.key, head.url, params.signal) }
    }
    assertActive()
    if (evidence.contentDigest !== expected.contentDigest || evidence.byteSize !== expected.byteSize
      || evidence.mimeType !== expected.mimeType || evidence.width !== expected.width || evidence.height !== expected.height) {
      throw new Error('CONTROLLED_BLOB_CONTENT_MISMATCH')
    }
    observed.push({ ...expected, key: head.key, contentDigest: evidence.contentDigest, byteSize: evidence.byteSize,
      mimeType: expected.mimeType, width: evidence.width, height: evidence.height })
  }
  return observed
}

export const CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS = Object.freeze({
  authority: CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES,
  manifest: CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES,
  receipt: CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES,
  original: CONTROLLED_FRESH_CANDIDATE_MAX_ORIGINAL_BYTES,
})

export type ControlledFreshCandidatePhysicalInputKind = keyof typeof CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS

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
  collections?: Record<string, { config?: { slug?: unknown; dbName?: unknown } } | undefined>
}

type ControlledRelationalTable = Record<string, unknown>

type ControlledFinalizationTableAuthority = {
  products: ControlledRelationalTable
  productRelationships: ControlledRelationalTable
  media: ControlledRelationalTable
  imageJobs: ControlledRelationalTable
  queueReceipts: ControlledRelationalTable
  botEvents: ControlledRelationalTable
  storyJobs: ControlledRelationalTable
}

const CONTROLLED_FINALIZATION_COLLECTION_TABLES = [
  ['products', 'products'],
  ['media', 'media'],
  ['image-generation-jobs', 'image_generation_jobs'],
  ['payload-jobs', 'payload_jobs'],
  ['bot-events', 'bot_events'],
  ['story-jobs', 'story_jobs'],
] as const

export function resolveControlledFinalizationTableAuthority(
  payload: ControlledRuntimePayload,
  db: Record<string, unknown>,
): ControlledFinalizationTableAuthority {
  if (!(db.tableNameMap instanceof Map) || !isPlainRecord(db.tables)) {
    throw new Error('controlled_finalization_table_unavailable')
  }
  const tables = db.tables as Record<string, ControlledRelationalTable | undefined>
  const resolved = new Map<string, ControlledRelationalTable>()
  for (const [collectionSlug, defaultTableName] of CONTROLLED_FINALIZATION_COLLECTION_TABLES) {
    const collection = payload.collections?.[collectionSlug]?.config
    const physicalName = db.tableNameMap.get(defaultTableName)
    const owners = [...db.tableNameMap.entries()].filter(([, mapped]) => mapped === physicalName)
    if (
      collection?.slug !== collectionSlug
      || collection.dbName !== undefined
      || physicalName !== defaultTableName
      || owners.length !== 1
      || owners[0]?.[0] !== defaultTableName
      || !tables[physicalName]
    ) throw new Error('controlled_finalization_table_unavailable')
    resolved.set(defaultTableName, tables[physicalName])
  }
  // Installed Drizzle build derives root relationship tables from the resolved
  // collection table and relationshipsSuffix; it does NOT add a map entry.
  const relationshipName = `${db.tableNameMap.get('products')}${db.relationshipsSuffix}`
  if (
    db.relationshipsSuffix !== '_rels'
    || relationshipName !== 'products_rels'
    || !tables[relationshipName]
    || [...db.tableNameMap.values()].some((mapped) => mapped === relationshipName)
  ) throw new Error('controlled_finalization_table_unavailable')
  const imageName = db.tableNameMap.get('products_images')
  const imageOwners = [...db.tableNameMap.entries()].filter(([, mapped]) => mapped === imageName)
  if (imageName !== 'products_images' || imageOwners.length !== 1
    || imageOwners[0]?.[0] !== 'products_images' || !tables[imageName]) {
    throw new Error('controlled_finalization_table_unavailable')
  }
  const requireColumns = (name: string, required: Record<string, string>): void => {
    const table = tables[name]
    try {
      if (!table || getTableName(table as never) !== name) throw new Error()
      const columns = getTableColumns(table as never) as Record<string, { name: string }>
      if (Object.entries(required).some(([key, physical]) => columns[key]?.name !== physical || table[key] !== columns[key])) {
        throw new Error()
      }
    } catch { throw new Error('controlled_finalization_table_unavailable') }
  }
  requireColumns(relationshipName, {}) // The operation locks this table, not its variant columns.
  requireColumns(imageName, { image: 'image_id', _parentID: '_parent_id', _order: '_order', id: 'id' })
  requireColumns('products', { id: 'id' })
  requireColumns('media', { id: 'id', product: 'product_id' })
  requireColumns('image_generation_jobs', { id: 'id', product: 'product_id' })
  requireColumns('payload_jobs', { taskSlug: 'task_slug', input: 'input' })
  requireColumns('bot_events', { id: 'id', product: 'product_id' })
  requireColumns('story_jobs', { id: 'id', product: 'product_id' })
  const products = resolved.get('products') as ControlledRelationalTable
  const media = resolved.get('media') as ControlledRelationalTable
  const imageJobs = resolved.get('image_generation_jobs') as ControlledRelationalTable
  const queueReceipts = resolved.get('payload_jobs') as ControlledRelationalTable
  const botEvents = resolved.get('bot_events') as ControlledRelationalTable
  const storyJobs = resolved.get('story_jobs') as ControlledRelationalTable
  if (
    !products.id
    || !media.id || !media.product
    || !imageJobs.id || !imageJobs.product
    || !queueReceipts.taskSlug || !queueReceipts.input
    || !botEvents.id || !botEvents.product
    || !storyJobs.id || !storyJobs.product
  ) throw new Error('controlled_finalization_table_unavailable')
  return {
    products,
    productRelationships: tables.products_rels,
    media,
    imageJobs,
    queueReceipts,
    botEvents,
    storyJobs,
  }
}

const enteredFinalizationPhases = new WeakSet<object>()
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
  runtimeBudget?: ControlledFreshCandidateRuntimeBudget
}): Promise<{ affected: number }> {
  if (params.runtimeBudget && !enteredFinalizationPhases.has(params)) {
    const entered = { ...params }
    enteredFinalizationPhases.add(entered)
    return params.runtimeBudget.withSqlPhase({ phase: 'finalize', table: 'products', identity: params.productId,
      maximumStatements: 14, data: { workflow: fixedControlledFreshCandidateProduct(params.manifest, 'pending').workflow } }, () =>
      finalizeControlledFreshCandidateProductAtomically(entered))
  }
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
    || !isPlainRecord(db.sessions)
  ) throw new Error('controlled_finalization_transaction_unavailable')
  const tables = resolveControlledFinalizationTableAuthority(params.payload, db)
  const [request, drizzleModule] = await Promise.all([
    params.createRequest
      ? params.createRequest()
      : import('payload').then((payloadModule) => payloadModule.createLocalReq({}, params.payload as never)) as Promise<{ transactionID?: string }>,
    import('drizzle-orm'),
  ])
  assertMutation()
  const transactionId = await (db.beginTransaction as (options: Record<string, unknown>) => Promise<unknown>)({
    isolationLevel: 'read committed',
    accessMode: 'read write',
    deferrable: false,
  })
  if (typeof transactionId !== 'string' || !transactionId) throw new Error('controlled_finalization_transaction_unavailable')
  assertMutation()
  request.transactionID = transactionId
  ;(request as { context?: RecordValue }).context = { ...((request as { context?: RecordValue }).context ?? {}), isVisualStatusUpdate: true }
  let committed = false
  try {
    const session = (db.sessions as Record<string, unknown>)[transactionId]
    if (!isPlainRecord(session) || !isPlainRecord(session.db)) throw new Error('controlled_finalization_transaction_unavailable')
    const transaction = session.db as {
      execute(statement: unknown): Promise<unknown>
      select(selection: Record<string, unknown>): {
        from(table: Record<string, unknown>): {
          where(condition: unknown): { for(mode: 'update'): Promise<unknown[]> }
        }
      }
    }
    if (typeof transaction.execute !== 'function' || typeof transaction.select !== 'function') {
      throw new Error('controlled_finalization_transaction_unavailable')
    }
    const sql = drizzleModule.sql
    for (const setting of [
      "SET LOCAL statement_timeout = '40000ms'",
      "SET LOCAL lock_timeout = '10000ms'",
      "SET LOCAL idle_in_transaction_session_timeout = '40000ms'",
    ]) {
      await transaction.execute(sql.raw(setting))
      assertMutation()
    }
    const lockAuthority = new Map<VisualMutationLockSurface, ControlledRelationalTable>([
      ['image-generation-jobs', tables.imageJobs],
      ['products', tables.products],
      ['products-rels', tables.productRelationships],
      ['media', tables.media],
      ['payload-jobs', tables.queueReceipts],
      ['bot-events', tables.botEvents],
      ['story-jobs', tables.storyJobs],
    ])
    for (const table of orderVisualMutationLocks(lockAuthority)) {
      await transaction.execute(sql`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`)
      assertMutation()
    }
    const locked = await transaction
      .select({ id: tables.products.id })
      .from(tables.products)
      .where(drizzleModule.eq(tables.products.id as never, params.productId))
      .for('update')
    if (!Array.isArray(locked) || locked.length !== 1) throw new Error('controlled_finalization_cas_missed')
    assertMutation()
    params.runtimeBudget?.applicationRead('products')
    const currentRead = () => params.payload.findByID({
      collection: 'products', id: params.productId, req: request, depth: 0, disableErrors: true, overrideAccess: true,
    })
    const current = await (params.runtimeBudget ? params.runtimeBudget.withSqlPhase({ phase: 'read', table: 'products', identity: params.productId }, currentRead) : currentRead())
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
    const readSurface = async (collection: string, where: Record<string, unknown>) => {
      params.runtimeBudget?.applicationRead(collection)
      const performRead = () => params.payload.find({
        collection,
        where,
        ...(['image-generation-jobs', 'bot-events', 'story-jobs'].includes(collection) ? { select: { id: true, product: true } } : {}),
        req: request,
        depth: 0,
        page: 1,
        limit: 2,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      })
      const page = normalizePayloadPage(await (params.runtimeBudget ? params.runtimeBudget.withSqlPhase({
        phase: collection === 'products' ? 'gallery' : 'read', table: collection.replaceAll('-', '_'),
        identity: collection === 'products' ? params.mediaId : params.productId,
      }, performRead) : performRead()), 1, 2)
      assertMutation()
      return page
    }
    const media = await readSurface('media', { product: { equals: params.productId } })
    if (
      media.totalDocs !== 1
      || media.docs.length !== 1
      || !controlledFreshCandidateMediaMatches({
        media: media.docs[0],
        manifest: params.manifest,
        productId: params.productId,
        mediaId: params.mediaId,
      })
    ) throw new Error('controlled_finalization_cas_missed')
    const galleryOwners = await readSurface('products', { 'generativeGallery.image': { equals: params.mediaId } })
    const imageJobs = await readSurface('image-generation-jobs', { product: { equals: params.productId } })
    const botEvents = await readSurface('bot-events', { product: { equals: params.productId } })
    const storyJobs = await readSurface('story-jobs', { product: { equals: params.productId } })
    if (
      galleryOwners.totalDocs !== 0
      || imageJobs.totalDocs !== 0
      || botEvents.totalDocs !== 0
      || storyJobs.totalDocs !== 0
    ) throw new Error('controlled_finalization_cas_missed')
    const queueRead = () => transaction.execute(sql`
      SELECT count(*)::text AS total_docs
      FROM ${tables.queueReceipts}
      INNER JOIN ${tables.imageJobs}
        ON ${tables.imageJobs.id}::text = (${tables.queueReceipts.input} ->> 'jobId')
      WHERE ${tables.queueReceipts.taskSlug} = 'image-gen'
        AND ${tables.imageJobs.product} = ${params.productId}
    `)
    const queueResult = await (params.runtimeBudget ? params.runtimeBudget.withSqlPhase({ phase: 'queue', table: 'payload_jobs', identity: params.productId, maximumStatements: 1 }, queueRead) : queueRead())
    const queueRows = isPlainRecord(queueResult) && Array.isArray(queueResult.rows)
      ? queueResult.rows
      : Array.isArray(queueResult) ? queueResult : []
    if (
      queueRows.length !== 1
      || !isPlainRecord(queueRows[0])
      || queueRows[0].total_docs !== '0'
    ) throw new Error('controlled_finalization_cas_missed')
    assertMutation()
    params.runtimeBudget?.applicationMutation('products')
    const update = () => params.payload.update({
      collection: 'products',
      id: params.productId,
      data: { workflow: { ...current.workflow, confirmationStatus: 'pending' } },
      req: request,
      depth: 0,
      overrideAccess: true,
    })
    const updated = await (params.runtimeBudget ? params.runtimeBudget.withSqlPhase({ phase: 'finalize', table: 'products',
      identity: params.productId, maximumStatements: 4, data: { workflow: fixedControlledFreshCandidateProduct(params.manifest, 'pending').workflow } }, update) : update())
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
  pilotManifest: ControlledFreshCandidatePilotManifest
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

export type ControlledFreshCandidateRuntimeResource = {
  creationInput: ControlledFreshCandidateCreationInput
  creationDependencies: ControlledFreshCandidateCreationDependencies
  destroy(): Promise<{ ok: true } | { ok: false }>
  claimAuthorityClosure?(): void
  completeObservation(report: ControlledFreshCandidatePublicReport, terminalOk: boolean): void
  failObservation(): void
  closeObservation(): void
  runtimeBudgetReport?(): ControlledFreshCandidateRuntimeBudgetReport
  scope: ControlledFreshCandidateOperationScope
}

export type ControlledFreshCandidateVerificationResource = {
  capability: ControlledFreshCandidateTargetCapability
  dependencies: ControlledFreshCandidateStrictTargetDependencies
  destroy(): Promise<{ ok: true } | { ok: false }>
  completeObservation(report: import('../src/lib/controlledFreshCandidateTargetVerifier').ControlledFreshCandidateStrictTargetReport, terminalOk: boolean): void
  failObservation(): void
  closeObservation(): void
  runtimeBudgetReport?(): ControlledFreshCandidateRuntimeBudgetReport
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
    'version', 'pilotManifest', 'authorizationIdentity', 'authorizationTokenBase64', 'executionId',
    'issuedAt', 'notBefore', 'expiresAt',
    'manifestIdentity', 'title', 'positivePrice', 'provenanceStatement', 'stockCandidate',
    'originalPath', 'originalMimeType', 'originalWidth', 'originalHeight', 'receiptPath',
    'observationPath', 'runtimeCommitIdentity', 'environmentIdentity',
  ])) return false
  return value.version === CONTROLLED_FRESH_CANDIDATE_RUNTIME_INPUT_VERSION
    && validateControlledFreshCandidatePilotManifest(value.pilotManifest, {
      expectedCommitIdentity: typeof value.runtimeCommitIdentity === 'string' ? value.runtimeCommitIdentity : undefined,
    })
    && typeof value.authorizationIdentity === 'string' && /^[a-z0-9][a-z0-9:_-]{7,127}$/i.test(value.authorizationIdentity)
    && typeof value.authorizationTokenBase64 === 'string'
    && typeof value.issuedAt === 'string'
    && typeof value.notBefore === 'string'
    && typeof value.expiresAt === 'string'
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
    && typeof value.observationPath === 'string' && path.isAbsolute(value.observationPath)
    && path.resolve(value.observationPath) !== path.resolve(value.originalPath)
    && path.resolve(value.observationPath) !== path.resolve(value.receiptPath)
    && exactContextIdentity(value.runtimeCommitIdentity)
    && exactContextIdentity(value.environmentIdentity)
    && value.manifestIdentity === value.pilotManifest.candidateIdentity
    && value.title === value.pilotManifest.title
    && value.positivePrice === value.pilotManifest.positivePrice
    && value.provenanceStatement === value.pilotManifest.provenance
    && value.stockCandidate === value.pilotManifest.stockCandidate
    && value.originalMimeType === value.pilotManifest.original.mimeType
    && value.originalWidth === value.pilotManifest.original.width
    && value.originalHeight === value.pilotManifest.original.height
}

function runtimePool(payload: ControlledRuntimePayload): VisualPilotRuntimePostgresPool {
  if (!isPlainRecord(payload.db) || !isPlainRecord(payload.db.pool)) throw new Error('controlled_runtime_pool_unavailable')
  const pool = payload.db.pool
  if (typeof pool.query !== 'function' || typeof pool.end !== 'function') throw new Error('controlled_runtime_pool_unavailable')
  return pool as unknown as VisualPilotRuntimePostgresPool
}

export function configureControlledFreshCandidateProcessBoundary(): void {
  process.env.PAYLOAD_DB_PUSH = 'false'
  process.env.PAYLOAD_DROP_DATABASE = 'false'
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

export function createControlledFreshCandidatePoolConstructor(params: {
  basePool: typeof import('pg').Pool
  onClient(client: InstanceType<typeof import('pg').Client>, pool: InstanceType<typeof import('pg').Pool>): void
  onClientAcquired(
    client: InstanceType<typeof import('pg').Client>,
    pool: InstanceType<typeof import('pg').Pool>,
    release: (error?: Error | boolean) => void,
  ): void
  onClientReleased(
    client: InstanceType<typeof import('pg').Client>,
    pool: InstanceType<typeof import('pg').Pool>,
    succeeded: boolean,
    destructionRequested: boolean,
  ): void
  onClientDestroyed(client: InstanceType<typeof import('pg').Client>, pool: InstanceType<typeof import('pg').Pool>): void
  onConstructed(pool: InstanceType<typeof import('pg').Pool>): void
  onPoolAcquisitionStarted(pool: InstanceType<typeof import('pg').Pool>): () => void
  onUnexpectedError(): void
  canConstruct?: () => boolean
  canConnect?: () => boolean
}): typeof import('pg').Pool {
  type PoolConnectCallback = Parameters<InstanceType<typeof import('pg').Pool>['connect']>[0]
  const governedClients = new WeakSet<object>()
  const governClient = (client: InstanceType<typeof import('pg').Client>): void => {
    if (governedClients.has(client)) return
    governedClients.add(client)
    const nativePrependListener = client.prependListener.bind(client)
    nativePrependListener('error', params.onUnexpectedError)
    Object.defineProperty(client, 'prependListener', {
      configurable: false,
      enumerable: false,
      writable: false,
      value(event: string | symbol, listener: (...args: unknown[]) => void) {
        // The installed adapter prepends an anonymous ECONNRESET listener whose
        // only behavior is an unowned recursive reconnect timer. This boundary
        // owns the first error listener and refuses later prepended error hooks.
        if (event === 'error') return this
        return nativePrependListener(event, listener)
      },
    })
  }
  class ControlledPostgresPool extends params.basePool {
    constructor(options?: import('pg').PoolConfig) {
      if (!(params.canConstruct?.() ?? true)) throw new Error('controlled_runtime_pool_revoked')
      super(options)
      this.prependListener('error', params.onUnexpectedError)
      this.on('connect', (client) => {
        governClient(client)
        params.onClient(client, this)
      })
      this.on('remove', (client) => params.onClientDestroyed(client, this))
      params.onConstructed(this)
    }

    private governAcquisition(
      client: import('pg').PoolClient,
      nativeRelease: (error?: Error | boolean) => void,
    ): import('pg').PoolClient {
      governClient(client)
      let released = false
      const controlledRelease = (error?: Error | boolean): void => {
        if (released) return
        released = true
        let succeeded = false
        try {
          nativeRelease(error)
          succeeded = true
        } catch {
          params.onUnexpectedError()
        } finally {
          params.onClientReleased(client, this, succeeded, Boolean(error))
        }
      }
      client.release = controlledRelease
      try {
        params.onClientAcquired(client, this, controlledRelease)
      } catch {
        controlledRelease(new Error('controlled_runtime_pool_client_registration_failed'))
        throw new Error('controlled_runtime_pool_client_registration_failed')
      }
      return client
    }

    connect(): Promise<import('pg').PoolClient>
    connect(callback: PoolConnectCallback): void
    connect(callback?: PoolConnectCallback): Promise<import('pg').PoolClient> | void {
      const reportCallbackException = (): void => {
        try { params.onUnexpectedError() } catch { /* remain inside the governed callback boundary */ }
      }
      if (!(params.canConnect?.() ?? true)) {
        const error = new Error('controlled_runtime_pool_revoked')
        if (callback) {
          queueMicrotask(() => {
            try { callback(error, undefined as never, () => undefined) } catch { reportCallbackException() }
          })
          return
        }
        return Promise.reject(error)
      }
      const settlePoolAcquisition = params.onPoolAcquisitionStarted(this)
      let poolAcquisitionSettled = false
      const settlePoolAcquisitionOnce = (): void => {
        if (poolAcquisitionSettled) return
        poolAcquisitionSettled = true
        settlePoolAcquisition()
      }
      if (callback) {
        let installedCallbackObserved = false
        let consumerCallbackDelivered = false
        const deliverConsumerCallback = (
          error: Error | undefined,
          client: import('pg').PoolClient | undefined,
          release: (error?: Error | boolean) => void,
        ): void => {
          if (consumerCallbackDelivered) {
            reportCallbackException()
            return
          }
          consumerCallbackDelivered = true
          try {
            callback(error, client as never, release)
          } catch {
            reportCallbackException()
          }
        }
        try {
          return super.connect((error, client, release) => {
            if (installedCallbackObserved) {
              reportCallbackException()
              settlePoolAcquisitionOnce()
              return
            }
            installedCallbackObserved = true
            let deliveryError = error ?? (
              client ? undefined : new Error('controlled_runtime_pool_connection_failed')
            )
            let deliveryClient = client
            let deliveryRelease = release
            try {
              if (!error && client) {
                const governed = this.governAcquisition(client, release)
                deliveryClient = governed
                deliveryRelease = governed.release
              }
            } catch {
              deliveryError = new Error('controlled_runtime_pool_client_registration_failed')
              deliveryClient = undefined as never
              deliveryRelease = () => undefined
            } finally {
              settlePoolAcquisitionOnce()
            }
            deliverConsumerCallback(deliveryError, deliveryClient, deliveryRelease)
          })
        } catch {
          settlePoolAcquisitionOnce()
          deliverConsumerCallback(
            new Error('controlled_runtime_pool_connection_failed'),
            undefined,
            () => undefined,
          )
          return
        }
      }
      let pending: Promise<import('pg').PoolClient>
      try {
        pending = super.connect()
      } catch (error) {
        settlePoolAcquisitionOnce()
        return Promise.reject(error)
      }
      return pending.then(
        (client) => {
          try {
            return this.governAcquisition(client, client.release.bind(client))
          } finally {
            settlePoolAcquisitionOnce()
          }
        },
        (error: unknown) => {
          settlePoolAcquisitionOnce()
          throw error
        },
      )
    }
  }
  return ControlledPostgresPool
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
  runtimeBudget: ControlledFreshCandidateRuntimeBudget,
): FreshVisualStrictTargetGateway {
  const discovery = createFreshVisualDiscoveryRuntimeGateway(payload, pool)
  const census = (collection: string, productId: number, page: number, limit: number) => payload.find({
    collection, where: { product: { equals: productId } }, select: { id: true, product: true },
    depth: 0, page, limit, sort: 'id', overrideAccess: true, pagination: true,
  }).then((result) => normalizePayloadPage(result, page, limit))
  const read = async <T>(collection: string, signal: AbortSignal, operation: () => Promise<T>, identity: number, phase: 'read' | 'gallery' | 'queue' = 'read'): Promise<T> => {
    scope.assertActive()
    if (signal.aborted) throw new Error('controlled_runtime_deadline')
    runtimeBudget.applicationRead(collection)
    const result = await runtimeBudget.withSqlPhase({ phase, table: collection.replaceAll('-', '_'), identity }, operation)
    scope.assertActive()
    if (signal.aborted) throw new Error('controlled_runtime_deadline')
    return result
  }
  return {
    async readOwnedProduct(productId, signal) {
      return read('products', signal, () => payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      }), productId)
    },
    readMediaPage: (productId, page, limit, signal) => read('media', signal, () => discovery.readMediaPage(productId, page, limit), productId),
    readGeneratedGalleryOwnerPage: (mediaIds, page, limit, signal) => {
      if (mediaIds.length !== 1 || typeof mediaIds[0] !== 'number') throw new Error('CONTROLLED_SQL_GALLERY_IDENTITY_INVALID')
      return read('products', signal, () => payload.find({ collection: 'products',
        where: { 'generativeGallery.image': { equals: mediaIds[0] } }, depth: 0, page, limit,
        sort: 'id', overrideAccess: true, pagination: true }).then((result) => normalizePayloadPage(result, page, limit)), mediaIds[0], 'gallery')
    },
    readImageJobPage: (productId, page, limit, signal) => read('image-generation-jobs', signal, () => census('image-generation-jobs', productId, page, limit), productId),
    readQueueReceiptPage: (productId, page, limit, signal) => read('payload-jobs', signal, async () => {
      if (page !== 1 || limit !== 100) throw new Error('CONTROLLED_SQL_QUEUE_WINDOW_INVALID')
      const result = await pool.query(CONTROLLED_FRESH_CANDIDATE_QUEUE_RECEIPTS_SQL, [productId, limit, 0])
      if (!isPlainRecord(result) || !Array.isArray(result.rows) || result.rows.length !== 1 || !isPlainRecord(result.rows[0])) throw new Error('CONTROLLED_SQL_QUEUE_RESULT_INVALID')
      const row = result.rows[0]
      if (row.total_docs !== '0' || !Array.isArray(row.docs) || row.docs.length) throw new Error('CONTROLLED_SQL_QUEUE_NOT_EMPTY')
      return { docs: [], totalDocs: 0, page: 1, totalPages: 0, hasNextPage: false, limit }
    }, productId, 'queue'),
    readBotEventPage: (productId, page, limit, signal) => read('bot-events', signal, () => census('bot-events', productId, page, limit), productId),
    readStoryJobPage: (productId, page, limit, signal) => read('story-jobs', signal, () => census('story-jobs', productId, page, limit), productId),
  }
}

export type PosixDirectoryAuthority = {
  path: string
  handle: number
  device: bigint
  inode: bigint
}

export function createControlledFreshCandidateOperationDirectory(
  ledger: Pick<ControlledFreshCandidateOwnerLedger, 'root' | 'rootHandle' | 'device'>,
  operationId: string,
): PosixDirectoryAuthority {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(operationId)) {
    throw new Error('controlled_operation_identity_invalid')
  }
  const rootAuthority: PosixDirectoryAuthority = {
    path: ledger.root,
    handle: ledger.rootHandle,
    device: ledger.device,
    inode: fstatSync(ledger.rootHandle, { bigint: true }).ino,
  }
  if (!directoryAuthorityIsCurrent(rootAuthority)) throw new Error('controlled_runtime_directory_authority_invalid')
  const operations = ensurePrivateChildDirectory(rootAuthority, 'operations-v1')
  try {
    const operationPath = path.join(operations.path, operationId)
    try {
      mkdirSync(`/proc/self/fd/${operations.handle}/${operationId}`, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error('controlled_operation_identity_conflict')
      }
      throw error
    }
    fsyncSync(operations.handle)
    return openPrivatePosixDirectory(operationPath, ledger.device)
  } finally {
    closeSync(operations.handle)
  }
}

// Threat model: the fixed root is current-UID controlled at 0700, markers are
// 0600, and no untrusted same-UID process is authorized to alter the root. The
// checks below additionally reject observable link, mount, path, device, and
// inode substitution; they do not claim protection from a hostile same-UID peer.

export type ControlledFreshCandidatePhysicalReceiptDestination = PosixDirectoryAuthority & {
  basename: string
  close(): void
}

function assertControlledPosixRuntime(): void {
  if (process.platform !== 'linux' || typeof process.getuid !== 'function') {
    throw new Error('controlled_runtime_platform_unsupported')
  }
}

function decodeMountInfoField(value: string): string {
  if (/\\(?![0-7]{3})/u.test(value)) throw new Error('controlled_runtime_filesystem_unsupported')
  return value.replace(/\\([0-7]{3})/gu, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)))
}

type ControlledMountInfoOperations = {
  open(): number
  stat(handle: number): ControlledPhysicalMetadata & { isFile(): boolean }
  read(handle: number, buffer: Buffer, offset: number, length: number): number
  close(handle: number): void
}

export function readControlledFreshCandidateMountInfo(
  operations: ControlledMountInfoOperations = {
    open: () => openSync('/proc/self/mountinfo', fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW),
    stat: (handle) => fstatSync(handle, { bigint: true }),
    read: (handle, buffer, offset, length) => readSync(handle, buffer, offset, length, null),
    close: closeSync,
  },
): string {
  let handle: number | null = null
  let result: string | null = null
  let failed = false
  try {
    handle = operations.open()
    const before = operations.stat(handle)
    if (
      !before.isFile()
      || before.ino <= 0n
      || before.uid !== BigInt(process.getuid!())
      || before.size < 0n
      || before.size > BigInt(CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES)
      || before.nlink !== 1n
    ) throw new Error('controlled_runtime_filesystem_unsupported')
    const chunks: Buffer[] = []
    let total = 0
    for (;;) {
      const remaining = CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES + 1 - total
      if (remaining <= 0) throw new Error('controlled_runtime_filesystem_unsupported')
      const chunk = Buffer.alloc(Math.min(16 * 1024, remaining))
      const count = operations.read(handle, chunk, 0, chunk.byteLength)
      if (!Number.isSafeInteger(count) || count < 0 || count > chunk.byteLength) {
        throw new Error('controlled_runtime_filesystem_unsupported')
      }
      if (count === 0) break
      chunks.push(chunk.subarray(0, count))
      total += count
      if (total > CONTROLLED_FRESH_CANDIDATE_MAX_MOUNTINFO_BYTES) {
        throw new Error('controlled_runtime_filesystem_unsupported')
      }
    }
    const after = operations.stat(handle)
    if (
      !samePhysicalMetadata(before, after)
      || (before.size > 0n && before.size !== BigInt(total))
    ) throw new Error('controlled_runtime_filesystem_unsupported')
    const bytes = Buffer.concat(chunks, total)
    result = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
    if (!Buffer.from(result, 'utf8').equals(bytes)) throw new Error('controlled_runtime_filesystem_unsupported')
  } catch {
    failed = true
  } finally {
    if (handle !== null) {
      try { operations.close(handle) } catch { failed = true }
    }
  }
  if (failed || result === null) throw new Error('controlled_runtime_filesystem_unsupported')
  return result
}

export function parseControlledFreshCandidateMountInfo(contents: string): Array<{
  device: string
  root: string
  mountPoint: string
  filesystem: string
}> {
  if (contents.length === 0 || contents.includes('\r')) {
    throw new Error('controlled_runtime_filesystem_unsupported')
  }
  const lines = contents.split('\n')
  if (lines.at(-1) === '') lines.pop()
  if (lines.length === 0) throw new Error('controlled_runtime_filesystem_unsupported')
  return lines.map((line) => {
    if (line.length === 0) throw new Error('controlled_runtime_filesystem_unsupported')
    const separators = line.match(/ - /gu)
    if (separators?.length !== 1) throw new Error('controlled_runtime_filesystem_unsupported')
    const [before, after] = line.split(' - ')
    const fields = before?.split(' ') ?? []
    const trailing = after?.split(' ') ?? []
    if (
      fields.length < 6
      || trailing.length < 3
      || fields.some((field) => field.length === 0)
      || trailing.some((field) => field.length === 0)
      || !/^[1-9]\d*$/u.test(fields[0] ?? '')
      || !/^[1-9]\d*$/u.test(fields[1] ?? '')
      || !/^\d+:\d+$/u.test(fields[2] ?? '')
      || !(fields[3] ?? '')
      || !(fields[4] ?? '').startsWith('/')
      || (fields.slice(6).some((field) => !/^(?:(?:shared|master|propagate_from):[1-9]\d*|unbindable)$/u.test(field)))
      || !/^[a-z0-9._-]+$/iu.test(trailing[0] ?? '')
    ) throw new Error('controlled_runtime_filesystem_unsupported')
    const root = decodeMountInfoField(fields[3] as string)
    const mountPoint = decodeMountInfoField(fields[4] as string)
    if (!root || !mountPoint.startsWith('/') || root.includes('\0') || mountPoint.includes('\0')) {
      throw new Error('controlled_runtime_filesystem_unsupported')
    }
    return {
      device: fields[2] as string,
      root,
      mountPoint,
      filesystem: trailing[0] as string,
    }
  })
}

function assertNativeExt4Mount(targetPath: string): void {
  const resolved = path.resolve(targetPath)
  const entries = parseControlledFreshCandidateMountInfo(readControlledFreshCandidateMountInfo())
    .filter((entry) => resolved === entry.mountPoint || resolved.startsWith(`${entry.mountPoint.replace(/\/$/u, '')}/`))
    .sort((left, right) => right.mountPoint.length - left.mountPoint.length)
  const authority = entries[0]
  if (!authority || authority.filesystem !== 'ext4' || authority.root !== '/') {
    throw new Error('controlled_runtime_filesystem_unsupported')
  }
  if (
    authority.mountPoint !== '/'
    && entries.some((entry) => entry !== authority && entry.device === authority.device)
  ) throw new Error('controlled_runtime_filesystem_unsupported')
  const statfs = statfsSync(resolved)
  if (Number(statfs.type) !== CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC) {
    throw new Error('controlled_runtime_filesystem_unsupported')
  }
}

function assertNoLinkedPathComponents(targetPath: string): void {
  const resolved = path.resolve(targetPath)
  if (!path.isAbsolute(targetPath) || targetPath !== resolved) {
    throw new Error('controlled_runtime_path_noncanonical')
  }
  const parsed = path.parse(resolved)
  let cursor = parsed.root
  for (const component of resolved.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, component)
    const stat = lstatSync(cursor, { bigint: true })
    if (stat.isSymbolicLink()) throw new Error('controlled_runtime_path_linked')
  }
  if (realpathSync(resolved) !== resolved) throw new Error('controlled_runtime_path_noncanonical')
}

function openPrivatePosixDirectory(directoryPath: string, expectedDevice?: bigint): PosixDirectoryAuthority {
  assertControlledPosixRuntime()
  assertNoLinkedPathComponents(directoryPath)
  assertNativeExt4Mount(directoryPath)
  const before = lstatSync(directoryPath, { bigint: true })
  if (
    !before.isDirectory()
    || before.isSymbolicLink()
    || before.uid !== BigInt(process.getuid!())
    || (before.mode & 0o777n) !== 0o700n
    || (expectedDevice !== undefined && before.dev !== expectedDevice)
  ) throw new Error('controlled_runtime_directory_authority_invalid')
  const handle = openSync(
    directoryPath,
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY | fsConstants.O_NOFOLLOW,
  )
  try {
    const opened = fstatSync(handle, { bigint: true })
    const descriptorPath = `/proc/self/fd/${handle}`
    if (
      opened.dev !== before.dev
      || opened.ino !== before.ino
      || !opened.isDirectory()
      || opened.uid !== BigInt(process.getuid!())
      || (opened.mode & 0o777n) !== 0o700n
      || realpathSync(descriptorPath) !== directoryPath
    ) throw new Error('controlled_runtime_directory_authority_invalid')
    return { path: directoryPath, handle, device: opened.dev, inode: opened.ino }
  } catch (error) {
    closeSync(handle)
    throw error
  }
}

export function validateControlledFreshCandidateApprovedLedgerRoot(): boolean {
  if (process.platform !== 'linux') return false
  let authority: PosixDirectoryAuthority | null = null
  try {
    authority = openPrivatePosixDirectory(CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT)
    return true
  } catch {
    return false
  } finally {
    if (authority) closeSync(authority.handle)
  }
}

function ensurePrivateChildDirectory(parent: PosixDirectoryAuthority, basename: string): PosixDirectoryAuthority {
  if (!/^[a-z0-9-]+$/u.test(basename)) throw new Error('controlled_runtime_directory_authority_invalid')
  const childPath = path.join(parent.path, basename)
  let created = false
  try {
    mkdirSync(`/proc/self/fd/${parent.handle}/${basename}`, { mode: 0o700 })
    created = true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
  if (created) fsyncSync(parent.handle)
  return openPrivatePosixDirectory(childPath, parent.device)
}

type ControlledPhysicalMetadata = {
  dev: bigint
  ino: bigint
  uid: bigint
  mode: bigint
  size: bigint
  nlink: bigint
  ctimeNs: bigint
  mtimeNs: bigint
}

function physicalMetadata(stat: ControlledPhysicalMetadata): readonly bigint[] {
  return [stat.dev, stat.ino, stat.uid, stat.mode, stat.size, stat.nlink, stat.ctimeNs, stat.mtimeNs]
}

function samePhysicalMetadata(left: ControlledPhysicalMetadata, right: ControlledPhysicalMetadata): boolean {
  const leftValues = physicalMetadata(left)
  const rightValues = physicalMetadata(right)
  return leftValues.every((value, index) => value === rightValues[index])
}

async function readBoundedPrivateDescriptor(params: {
  scope: ControlledFreshCandidateOperationScope
  handle: number
  descriptorPath: string
  expectedDevice: bigint
  maximumBytes: number
  failureCode: string
}): Promise<Buffer> {
  const before = fstatSync(params.handle, { bigint: true })
  if (
    !before.isFile()
    || before.dev !== params.expectedDevice
    || before.ino <= 0n
    || before.uid !== BigInt(process.getuid!())
    || (before.mode & 0o777n) !== 0o600n
    || before.size < 0n
    || before.size > BigInt(params.maximumBytes)
    || before.nlink !== 1n
  ) throw new Error(params.failureCode)

  params.scope.assertActive()
  const size = Number(before.size)
  const bytes = Buffer.alloc(size)
  let offset = 0
  while (offset < size) {
    params.scope.assertActive()
    const requested = Math.min(64 * 1024, size - offset)
    const count = readSync(params.handle, bytes, offset, requested, offset)
    if (!Number.isSafeInteger(count) || count <= 0 || count > requested) {
      throw new Error(params.failureCode)
    }
    offset += count
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  const extra = Buffer.alloc(1)
  if (readSync(params.handle, extra, 0, 1, size) !== 0) throw new Error(params.failureCode)

  const after = fstatSync(params.handle, { bigint: true })
  const current = lstatSync(params.descriptorPath, { bigint: true })
  if (
    !samePhysicalMetadata(before, after)
    || !current.isFile()
    || current.isSymbolicLink()
    || !samePhysicalMetadata(before, current)
  ) throw new Error(params.failureCode)
  params.scope.assertActive()
  return bytes
}

export async function readControlledFreshCandidatePrivateFile(
  scope: ControlledFreshCandidateOperationScope,
  filePath: string,
  expectedDevice: bigint,
  kind: ControlledFreshCandidatePhysicalInputKind,
): Promise<Buffer> {
  if (!path.isAbsolute(filePath) || path.resolve(filePath) !== filePath) {
    throw new Error('controlled_runtime_path_noncanonical')
  }
  const basename = path.basename(filePath)
  if (!basename || basename === '.' || basename === '..') throw new Error('controlled_runtime_path_noncanonical')
  const parent = openPrivatePosixDirectory(path.dirname(filePath), expectedDevice)
  let handle: number | null = null
  try {
    handle = openSync(
      `/proc/self/fd/${parent.handle}/${basename}`,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    return await readBoundedPrivateDescriptor({
      scope,
      handle,
      descriptorPath: `/proc/self/fd/${parent.handle}/${basename}`,
      expectedDevice,
      maximumBytes: CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS[kind],
      failureCode: 'controlled_runtime_file_authority_invalid',
    })
  } finally {
    if (handle !== null) closeSync(handle)
    closeSync(parent.handle)
  }
}

export function openControlledFreshCandidatePhysicalReceiptDestination(
  receiptPath: string,
  expectedDevice: bigint,
): ControlledFreshCandidatePhysicalReceiptDestination {
  if (!path.isAbsolute(receiptPath) || path.resolve(receiptPath) !== receiptPath) {
    throw new Error('controlled_runtime_path_noncanonical')
  }
  const basename = path.basename(receiptPath)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(basename) || basename.endsWith('.')) {
    throw new Error('controlled_runtime_path_noncanonical')
  }
  const parent = openPrivatePosixDirectory(path.dirname(receiptPath), expectedDevice)
  return {
    ...parent,
    basename,
    close: (() => {
      let closed = false
      return () => {
        if (closed) return
        closed = true
        closeSync(parent.handle)
      }
    })(),
  }
}

export function writeControlledFreshCandidatePrivateFileExclusive(params: {
  destination: ControlledFreshCandidatePhysicalReceiptDestination
  bytes: Uint8Array
}): void {
  if (
    !(params.bytes instanceof Uint8Array)
    || params.bytes.byteLength < 1
    || params.bytes.byteLength > CONTROLLED_FRESH_CANDIDATE_MAX_CANONICAL_JSON_BYTES
    || !directoryAuthorityIsCurrent(params.destination)
  ) throw new Error('controlled_private_file_invalid')
  const finalPath = `/proc/self/fd/${params.destination.handle}/${params.destination.basename}`
  let handle: number | null = null
  try {
    handle = openSync(
      finalPath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
      0o600,
    )
    writeFileSync(handle, Buffer.from(params.bytes))
    fsyncSync(handle)
    const stat = fstatSync(handle, { bigint: true })
    if (
      !stat.isFile()
      || stat.dev !== params.destination.device
      || stat.uid !== BigInt(process.getuid!())
      || (stat.mode & 0o777n) !== 0o600n
      || stat.nlink !== 1n
    ) throw new Error('controlled_private_file_invalid')
    closeSync(handle)
    handle = null
    fsyncSync(params.destination.handle)
  } catch {
    throw new Error('controlled_private_file_persistence_failed')
  } finally {
    if (handle !== null) {
      try { closeSync(handle) } catch { /* durable state is recovery-required */ }
    }
  }
}

export async function readPhysicalReceiptBytes(
  scope: ControlledFreshCandidateOperationScope,
  destination: ControlledFreshCandidatePhysicalReceiptDestination,
): Promise<Buffer> {
  if (!directoryAuthorityIsCurrent(destination)) throw new Error('controlled_runtime_receipt_authority_invalid')
  let handle: number | null = null
  try {
    handle = openSync(
      `/proc/self/fd/${destination.handle}/${destination.basename}`,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    return await readBoundedPrivateDescriptor({
      scope,
      handle,
      descriptorPath: `/proc/self/fd/${destination.handle}/${destination.basename}`,
      expectedDevice: destination.device,
      maximumBytes: CONTROLLED_FRESH_CANDIDATE_PHYSICAL_INPUT_LIMITS.receipt,
      failureCode: 'controlled_runtime_receipt_authority_invalid',
    })
  } finally {
    if (handle !== null) closeSync(handle)
  }
}

export async function readControlledFreshCandidateObservationFile(params: {
  scope: ControlledFreshCandidateOperationScope
  observationPath: string
  expectedOperationId: string
}): Promise<Buffer> {
  const expectedDirectory = path.join(
    CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT,
    'operations-v1',
    params.expectedOperationId,
  )
  if (
    !/^[a-z0-9][a-z0-9:_-]{7,127}$/iu.test(params.expectedOperationId)
    || path.dirname(params.observationPath) !== expectedDirectory
    || path.basename(params.observationPath) !== 'observation.json'
  ) throw new Error('controlled_observation_path_invalid')
  const parent = openPrivatePosixDirectory(expectedDirectory)
  const destination: ControlledFreshCandidatePhysicalReceiptDestination = {
    ...parent,
    basename: 'observation.json',
    close: (() => {
      let closed = false
      return () => {
        if (closed) return
        closed = true
        closeSync(parent.handle)
      }
    })(),
  }
  try {
    return await readPhysicalReceiptBytes(params.scope, destination)
  } finally {
    destination.close()
  }
}

export function controlledFreshCandidateReceiptDestinationDigest(params: {
  destination: Pick<ControlledFreshCandidatePhysicalReceiptDestination, 'device' | 'inode' | 'basename'>
  runtimeCommitIdentity: string
  environmentIdentity: string
}): string {
  if (
    params.destination.device < 0n
    || params.destination.inode <= 0n
    || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/u.test(params.destination.basename)
    || !exactContextIdentity(params.runtimeCommitIdentity)
    || !exactContextIdentity(params.environmentIdentity)
  ) throw new Error('controlled_runtime_input_invalid')
  return createHash('sha256')
    .update('uygunayakkabi:controlled-fresh-candidate:receipt-destination:v2')
    .update('\0')
    .update(params.destination.device.toString())
    .update('\0')
    .update(params.destination.inode.toString())
    .update('\0')
    .update(params.destination.basename)
    .update('\0')
    .update(CONTROLLED_FRESH_CANDIDATE_CONTRACT_IDENTITY)
    .update('\0')
    .update(CONTROLLED_FRESH_CANDIDATE_RUNTIME_IDENTITY)
    .update('\0')
    .update(params.runtimeCommitIdentity)
    .update('\0')
    .update(params.environmentIdentity)
    .digest('hex')
}

export function createControlledFreshCandidateExecutionGrantToken(
  grant: ControlledFreshCandidateExecutionGrant,
  authorizationKey: Uint8Array,
): Buffer {
  const key = Buffer.from(authorizationKey)
  if (key.byteLength < 32 || key.byteLength > 128) throw new Error('controlled_runtime_authorization_key_invalid')
  if (!controlledFreshCandidateExecutionGrantIsCanonical(grant)) {
    throw new Error('controlled_runtime_authorization_grant_invalid')
  }
  return createHmac('sha256', key)
    .update(CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_DOMAIN)
    .update('\0')
    .update(serializeControlledFreshCandidateExecutionGrant(grant))
    .digest()
}

async function readRuntimeInput(
  scope: ControlledFreshCandidateOperationScope,
  ledger: ControlledFreshCandidateOwnerLedger,
): Promise<{
  input: ControlledFreshCandidateCreationInput
  receiptDestination: ControlledFreshCandidatePhysicalReceiptDestination
  observationDestination: ControlledFreshCandidatePhysicalReceiptDestination
}> {
  const manifestPath = process.env[CONTROLLED_FRESH_CANDIDATE_PRIVATE_MANIFEST_PATH_ENV]
  if (!manifestPath || !path.isAbsolute(manifestPath)) throw new Error('controlled_runtime_configuration_missing')
  let parsed: unknown
  try {
    const manifestBytes = await readControlledFreshCandidatePrivateFile(scope, manifestPath, ledger.device, 'manifest')
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes))
  } catch {
    throw new Error('controlled_runtime_input_unavailable')
  }
  if (!exactRuntimeInput(parsed)) throw new Error('controlled_runtime_input_invalid')
  const token = exactBase64(parsed.authorizationTokenBase64, 32, 32)
  const key = exactBase64(process.env[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV], 32, 128)
  if (!token || !key) throw new Error('controlled_runtime_input_invalid')
  const configuredCommit = process.env[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  const configuredEnvironment = process.env[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
  if (
    !exactContextIdentity(configuredCommit)
    || !exactContextIdentity(configuredEnvironment)
    || parsed.runtimeCommitIdentity !== configuredCommit
    || parsed.environmentIdentity !== configuredEnvironment
  ) throw new Error('controlled_runtime_context_mismatch')
  const receiptDestination = openControlledFreshCandidatePhysicalReceiptDestination(parsed.receiptPath, ledger.device)
  let observationDestination: ControlledFreshCandidatePhysicalReceiptDestination
  try {
    observationDestination = openControlledFreshCandidatePhysicalReceiptDestination(parsed.observationPath, ledger.device)
  } catch (error) {
    receiptDestination.close()
    throw error
  }
  let original: Buffer
  try {
    original = await readControlledFreshCandidatePrivateFile(scope, parsed.originalPath, ledger.device, 'original')
  } catch (error) {
    receiptDestination.close()
    observationDestination.close()
    throw error
  }
  if (original.byteLength < 1 || original.byteLength > CONTROLLED_FRESH_CANDIDATE_MAX_ORIGINAL_BYTES) {
    receiptDestination.close()
    observationDestination.close()
    throw new Error('controlled_runtime_input_invalid')
  }
  if (
    path.basename(parsed.originalPath) !== parsed.pilotManifest.original.filename
    || createHash('sha256').update(original).digest('hex') !== parsed.pilotManifest.original.contentDigest
  ) {
    receiptDestination.close()
    observationDestination.close()
    throw new Error('controlled_runtime_input_invalid')
  }
  return {
    receiptDestination,
    observationDestination,
    input: {
      executionAuthorization: {
        identity: parsed.authorizationIdentity,
        token,
        issuedAt: parsed.issuedAt,
        notBefore: parsed.notBefore,
        expiresAt: parsed.expiresAt,
      },
      executionId: parsed.executionId,
      authorizationContext: {
        runtimeCommitIdentity: parsed.runtimeCommitIdentity,
        environmentIdentity: parsed.environmentIdentity,
        approvedReceiptDestinationDigest: controlledFreshCandidateReceiptDestinationDigest({
          destination: receiptDestination,
          runtimeCommitIdentity: parsed.runtimeCommitIdentity,
          environmentIdentity: parsed.environmentIdentity,
        }),
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

export function createControlledFreshCandidateAtomicSnapshotPersistence(
  destination: ControlledFreshCandidatePhysicalReceiptDestination,
): (serialized: string) => void {
  let sequence = 0
  return (serialized) => {
    if (!directoryAuthorityIsCurrent(destination)) throw new Error('controlled_observation_authority_invalid')
    sequence += 1
    const temporaryBasename = `.${createHash('sha256')
      .update(destination.basename)
      .update('\0')
      .update(String(sequence))
      .digest('hex')}.next`
    const directoryPath = `/proc/self/fd/${destination.handle}`
    const temporaryPath = `${directoryPath}/${temporaryBasename}`
    const finalPath = `${directoryPath}/${destination.basename}`
    let handle: number | null = null
    try {
      handle = openSync(
        temporaryPath,
        fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
        0o600,
      )
      writeFileSync(handle, serialized, 'utf8')
      fsyncSync(handle)
      closeSync(handle)
      handle = null
      const temporaryStat = lstatSync(temporaryPath, { bigint: true })
      if (
        !temporaryStat.isFile()
        || temporaryStat.isSymbolicLink()
        || temporaryStat.dev !== destination.device
        || temporaryStat.uid !== BigInt(process.getuid!())
        || (temporaryStat.mode & 0o777n) !== 0o600n
        || temporaryStat.nlink !== 1n
      ) throw new Error('controlled_observation_persistence_failed')
      // POSIX rename replaces only the operation-bound snapshot name. Readers
      // see either the prior complete fsynced snapshot or the new one.
      renameSync(temporaryPath, finalPath)
      fsyncSync(destination.handle)
    } catch {
      throw new Error('controlled_observation_persistence_failed')
    } finally {
      if (handle !== null) {
        try { closeSync(handle) } catch { /* sticky observation failure */ }
      }
    }
  }
}

type ControlledFreshCandidateObservationController = {
  observeResources(resources: ControlledFreshCandidateObservationResources): void
  observeAuthorizationConsumed(): void
  observeReceipt(serialized: string): void
  completeCreation(report: ControlledFreshCandidatePublicReport, terminalOk: boolean): void
  completeVerification(
    report: import('../src/lib/controlledFreshCandidateTargetVerifier').ControlledFreshCandidateStrictTargetReport,
    terminalOk: boolean,
  ): void
  fail(): void
  close(): void
}

async function initializeControlledFreshCandidateObservation(params: {
  scope: ControlledFreshCandidateOperationScope
  destination: ControlledFreshCandidatePhysicalReceiptDestination
  operationId: string
  key: Uint8Array
  mode: 'create' | 'verify'
}): Promise<ControlledFreshCandidateObservationController> {
  const preStart = authenticateControlledFreshCandidateObservation({
    bytes: await readPhysicalReceiptBytes(params.scope, params.destination),
    key: params.key,
    expectedOperationId: params.operationId,
  })
  if (!controlledFreshCandidateObservationCanInitialize({ mode: params.mode, observation: preStart })) {
    throw new Error('controlled_observation_prestart_invalid')
  }
  const authenticatedInitial = Object.fromEntries(
    Object.entries(preStart).filter(([key]) => key !== 'stale'),
  ) as Omit<import('../src/lib/controlledFreshCandidateObservation').ControlledFreshCandidateObservation, 'seal'>
  const state = createControlledFreshCandidateObservationState({
    operationId: params.operationId,
    key: params.key,
    initial: authenticatedInitial,
    persist: createControlledFreshCandidateAtomicSnapshotPersistence(params.destination),
  })
  let healthy = true
  let closed = false
  const publish = (transform: Parameters<typeof state.publish>[0]): void => {
    if (!healthy || closed) throw new Error('controlled_observation_unavailable')
    try {
      state.publish((draft) => {
        draft.terminalScopeState = params.scope.state
        transform(draft)
      })
    } catch {
      healthy = false
      throw new Error('controlled_observation_persistence_failed')
    }
  }
  publish((draft) => {
    draft.phase = params.mode === 'create' ? 'initializing' : 'verifying'
    draft.terminalScopeState = params.scope.state
    draft.strictVerifierStatus = params.mode === 'create' ? 'NOT_AVAILABLE' : 'PENDING'
    draft.naturalExitExpectation = 'PENDING'
    draft.outcome = 'IN_PROGRESS'
  })
  return {
    observeResources(resources) {
      publish((draft) => { draft.resources = structuredClone(resources) })
    },
    observeAuthorizationConsumed() {
      publish((draft) => {
        draft.phase = 'authorization_consumed'
        draft.receiptPersistenceState = 'RESERVED'
      })
    },
    observeReceipt(serialized) {
      let receipt: Record<string, unknown>
      try {
        receipt = JSON.parse(serialized) as Record<string, unknown>
      } catch {
        throw new Error('controlled_observation_receipt_invalid')
      }
      if (!isPlainRecord(receipt.budgets) || typeof receipt.phase !== 'string') {
        throw new Error('controlled_observation_receipt_invalid')
      }
      publish((draft) => {
        if ((CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PHASES as readonly string[]).includes(receipt.phase as string)) {
          draft.phase = receipt.phase as typeof draft.phase
        }
        for (const key of CONTROLLED_FRESH_CANDIDATE_PUBLIC_COUNT_KEYS) {
          const count = receipt.budgets?.[key]
          if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
            throw new Error('controlled_observation_receipt_invalid')
          }
          draft.counts[key] = count
        }
        draft.receiptPersistenceState = 'PERSISTED'
      })
    },
    completeCreation(report, terminalOk) {
      publish((draft) => {
        draft.phase = 'closed'
        draft.terminalScopeState = params.scope.state
        draft.counts = structuredClone(report.counts)
        draft.strictVerifierStatus = 'NOT_AVAILABLE'
        draft.naturalExitExpectation = terminalOk ? 'EXPECTED' : 'NOT_EXPECTED'
        draft.outcome = !terminalOk || params.scope.state === 'TERMINAL_UNCERTAIN'
          ? 'TERMINAL_UNCERTAIN'
          : report.verdict === 'CREATION_COMMITTED_QUARANTINED'
            ? 'CLOSED_SUCCESS'
            : 'CLOSED_FAILURE'
      })
    },
    completeVerification(report, terminalOk) {
      publish((draft) => {
        draft.phase = 'closed'
        draft.terminalScopeState = params.scope.state
        draft.strictVerifierStatus = report.verdict === 'STRICT_FRESH_TARGET_READY'
          ? 'READY'
          : report.verdict === 'STRICT_FRESH_TARGET_BLOCKED'
            ? 'BLOCKED'
            : 'EVIDENCE_UNSUPPORTED'
        draft.naturalExitExpectation = terminalOk ? 'EXPECTED' : 'NOT_EXPECTED'
        draft.outcome = !terminalOk || params.scope.state === 'TERMINAL_UNCERTAIN'
          ? 'TERMINAL_UNCERTAIN'
          : report.verdict === 'STRICT_FRESH_TARGET_READY'
            ? 'CLOSED_SUCCESS'
            : 'CLOSED_FAILURE'
      })
    },
    fail() {
      if (!healthy || closed) return
      try {
        publish((draft) => {
          draft.terminalScopeState = params.scope.state
          draft.naturalExitExpectation = 'NOT_EXPECTED'
          draft.outcome = params.scope.state === 'CLOSED' ? 'CLOSED_FAILURE' : 'TERMINAL_UNCERTAIN'
          if (params.scope.state === 'CLOSED') draft.phase = 'closed'
        })
      } catch { /* sticky observation failure remains non-successful */ }
    },
    close() {
      if (closed) return
      closed = true
      params.destination.close()
    },
  }
}

export type ControlledFreshCandidateOwnerLedger = {
  root: string
  authorizationDirectory: string
  receiptDirectory: string
  authorizationKey: Buffer
  device: bigint
  rootHandle: number
  authorizationHandle: number
  receiptHandle: number
  close(): void
}

export async function initializeControlledFreshCandidateOwnerLedger(
  scope: ControlledFreshCandidateOperationScope,
  options: { testOnlyApprovedRoot?: string; authorizationKeyBase64?: string } = {},
): Promise<ControlledFreshCandidateOwnerLedger> {
  assertControlledPosixRuntime()
  const configuredRoot = options.testOnlyApprovedRoot
    ?? process.env[CONTROLLED_FRESH_CANDIDATE_OWNER_LEDGER_DIRECTORY_ENV]
  if (!configuredRoot || !path.isAbsolute(configuredRoot)) {
    throw new Error('controlled_runtime_owner_ledger_missing')
  }
  if (options.testOnlyApprovedRoot !== undefined) {
    if (process.env.CFC_NATIVE_EXT4_TEST_ONLY !== '1') {
      throw new Error('controlled_runtime_owner_ledger_test_override_forbidden')
    }
  } else if (configuredRoot !== CONTROLLED_FRESH_CANDIDATE_APPROVED_LEDGER_ROOT) {
    throw new Error('controlled_runtime_owner_ledger_binding_mismatch')
  }
  const rootAuthority = openPrivatePosixDirectory(configuredRoot)
  let authorizationAuthority: PosixDirectoryAuthority | null = null
  let receiptAuthority: PosixDirectoryAuthority | null = null
  try {
    authorizationAuthority = ensurePrivateChildDirectory(rootAuthority, 'creation-authorizations-v3')
    receiptAuthority = ensurePrivateChildDirectory(rootAuthority, 'receipt-consumptions-v2')
  } catch (error) {
    if (authorizationAuthority) closeSync(authorizationAuthority.handle)
    if (receiptAuthority) closeSync(receiptAuthority.handle)
    closeSync(rootAuthority.handle)
    throw error
  }
  scope.assertActive()
  const authorizationKeyText = options.authorizationKeyBase64
    ?? process.env[CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_KEY_ENV]
  if (!authorizationKeyText) {
    closeSync(authorizationAuthority.handle)
    closeSync(receiptAuthority.handle)
    closeSync(rootAuthority.handle)
    throw new Error('controlled_runtime_owner_ledger_missing')
  }
  const authorizationKey = exactBase64(authorizationKeyText, 32, 128)
  if (!authorizationKey) {
    closeSync(authorizationAuthority.handle)
    closeSync(receiptAuthority.handle)
    closeSync(rootAuthority.handle)
    throw new Error('controlled_runtime_owner_ledger_invalid')
  }
  let closed = false
  return {
    root: rootAuthority.path,
    authorizationDirectory: authorizationAuthority.path,
    receiptDirectory: receiptAuthority.path,
    authorizationKey,
    device: rootAuthority.device,
    rootHandle: rootAuthority.handle,
    authorizationHandle: authorizationAuthority.handle,
    receiptHandle: receiptAuthority.handle,
    close() {
      if (closed) return
      closed = true
      closeSync(receiptAuthority.handle)
      closeSync(authorizationAuthority.handle)
      closeSync(rootAuthority.handle)
    },
  }
}

export function createControlledFreshCandidateDurableReceiptConsumer(
  ledger: Pick<ControlledFreshCandidateOwnerLedger, 'receiptDirectory' | 'receiptHandle' | 'device'>,
): (consumptionIdentity: string) => boolean {
  return (consumptionIdentity) => {
    if (!/^[0-9a-f]{64}$/.test(consumptionIdentity)) return false
    if (!directoryAuthorityIsCurrent({
      path: ledger.receiptDirectory,
      handle: ledger.receiptHandle,
      device: ledger.device,
    })) return false
    return createControlledFreshCandidateDurableMarker({
      directoryHandle: ledger.receiptHandle,
      markerDigest: consumptionIdentity,
      content: 'controlled receipt consumed v1\n',
    })
  }
}

function directoryAuthorityIsCurrent(
  authority: Pick<PosixDirectoryAuthority, 'path' | 'handle' | 'device'> & Partial<Pick<PosixDirectoryAuthority, 'inode'>>,
): boolean {
  try {
    const opened = fstatSync(authority.handle, { bigint: true })
    const current = lstatSync(authority.path, { bigint: true })
    return opened.isDirectory()
      && !current.isSymbolicLink()
      && opened.dev === authority.device
      && current.dev === opened.dev
      && current.ino === opened.ino
      && (authority.inode === undefined || opened.ino === authority.inode)
      && opened.uid === BigInt(process.getuid!())
      && (opened.mode & 0o777n) === 0o700n
      && realpathSync(`/proc/self/fd/${authority.handle}`) === authority.path
      && Number(statfsSync(`/proc/self/fd/${authority.handle}`).type) === CONTROLLED_FRESH_CANDIDATE_EXT4_MAGIC
  } catch {
    return false
  }
}

export function createControlledFreshCandidateDurableMarker(params: {
  directoryHandle: number
  markerDigest: string
  content: string
  syncFile?: (handle: number) => void
  syncDirectory?: (handle: number) => void
}): boolean {
  if (!/^[0-9a-f]{64}$/u.test(params.markerDigest) || !params.content) return false
  const markerPath = `/proc/self/fd/${params.directoryHandle}/${params.markerDigest}.used`
  const syncFile = params.syncFile ?? fsyncSync
  const syncDirectory = params.syncDirectory ?? fsyncSync
  let descriptor: number | null = null
  try {
    descriptor = openSync(
      markerPath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
      0o600,
    )
    writeFileSync(descriptor, params.content, 'utf8')
    syncFile(descriptor)
    closeSync(descriptor)
    descriptor = null
    syncDirectory(params.directoryHandle)
    return true
  } catch {
    return false
  } finally {
    if (descriptor !== null) {
      try { closeSync(descriptor) } catch { /* persistence uncertainty fails closed on replay */ }
    }
  }
}

export function createControlledFreshCandidateReceiptPersistence(params: {
  receiptDestination: ControlledFreshCandidatePhysicalReceiptDestination
  destinationDigest: string
  executionId: string
  ledger: ControlledFreshCandidateOwnerLedger
  onAuthorizationConsumed?: () => void
  onReceiptPersisted?: (serialized: string) => void
  now?: () => number
}): {
  persist(serialized: string, signal: AbortSignal): Promise<void>
  consume(
    grant: ControlledFreshCandidateExecutionGrant,
    token: Uint8Array,
    signal: AbortSignal,
    authorizationObservedAt: number,
  ): Promise<boolean>
} {
  const { receiptDestination, destinationDigest, executionId, ledger } = params
  if (receiptDestination.device !== ledger.device || !/^[0-9a-f]{64}$/u.test(destinationDigest)) {
    throw new Error('controlled_runtime_receipt_filesystem_mismatch')
  }
  const temporaryBasename = `.${createHash('sha256').update(executionId).digest('hex')}.next`
  const receiptDirectoryPath = `/proc/self/fd/${receiptDestination.handle}`
  const temporaryPath = `${receiptDirectoryPath}/${temporaryBasename}`
  const receiptPath = `${receiptDirectoryPath}/${receiptDestination.basename}`
  let receiptOwned = false
  return {
    async persist(serialized, signal) {
      if (
        !receiptOwned
        || signal.aborted
        || !directoryAuthorityIsCurrent(receiptDestination)
      ) throw new Error('controlled_receipt_not_owned')
      const temporaryReceipt = await open(
        temporaryPath,
        fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
        0o600,
      )
      try {
        await temporaryReceipt.writeFile(serialized, 'utf8')
        await temporaryReceipt.sync()
      } finally {
        await temporaryReceipt.close()
      }
      if (signal.aborted) throw new Error('controlled_receipt_persist_revoked')
      await rename(temporaryPath, receiptPath)
      fsyncSync(receiptDestination.handle)
      params.onReceiptPersisted?.(serialized)
    },
    async consume(grant, token, signal, authorizationObservedAt) {
      if (
        signal.aborted
        || grant.approvedReceiptDestinationDigest !== destinationDigest
        || !directoryAuthorityIsCurrent(receiptDestination)
        || !directoryAuthorityIsCurrent({
          path: ledger.authorizationDirectory,
          handle: ledger.authorizationHandle,
          device: ledger.device,
        })
      ) return false
      try {
        assertControlledFreshCandidateAuthorizationActive({
          grant,
          observedAt: (params.now ?? Date.now)(),
          previousObservedAt: authorizationObservedAt,
        })
      } catch {
        return false
      }
      const expectedToken = createControlledFreshCandidateExecutionGrantToken(grant, ledger.authorizationKey)
      const suppliedToken = Buffer.from(token)
      if (suppliedToken.byteLength !== expectedToken.byteLength || !timingSafeEqual(suppliedToken, expectedToken)) return false
      const markerDigest = createHmac('sha256', ledger.authorizationKey)
        .update(CONTROLLED_FRESH_CANDIDATE_AUTHORIZATION_DOMAIN)
        .update('\0consumption\0')
        .update(serializeControlledFreshCandidateExecutionGrant(grant))
        .digest('hex')
      try {
        if (!createControlledFreshCandidateDurableMarker({
          directoryHandle: ledger.authorizationHandle,
          markerDigest,
          content: 'controlled creation authorization consumed v3\n',
        })) return false
        if (signal.aborted) return false
        const reservedReceipt = await open(
          receiptPath,
          fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | fsConstants.O_NOFOLLOW,
          0o600,
        )
        try { await reservedReceipt.sync() } finally { await reservedReceipt.close() }
        fsyncSync(receiptDestination.handle)
        if (signal.aborted || !directoryAuthorityIsCurrent(receiptDestination)) return false
        receiptOwned = true
        params.onAuthorizationConsumed?.()
        return true
      } catch {
        return false
      }
    },
  }
}

type ControlledTerminalClient = {
  end(): Promise<unknown>
  unref?(): void
  connection?: { stream?: { destroy(): unknown; destroyed?: boolean } }
}

type ControlledTerminalPool = {
  end(): Promise<unknown>
}

type ControlledTerminalPoolClientRelease = (error?: Error | boolean) => void

type ControlledTerminalPayload = {
  destroy(): Promise<void>
}

export function createControlledFreshCandidateTerminalResourceRegistry(params: {
  scope: ControlledFreshCandidateOperationScope
  mutationActive: { current: boolean }
  dispatcher: { destroy(): Promise<void> }
  observeResources?: (resources: ControlledFreshCandidateObservationResources) => void
}): {
  registerClient(client: ControlledTerminalClient): void
  registerPool(pool: ControlledTerminalPool): void
  registerPoolAcquisition(pool: ControlledTerminalPool): () => void
  registerPoolClient(client: ControlledTerminalClient, pool: ControlledTerminalPool): void
  registerPoolClientAcquisition(
    client: ControlledTerminalClient,
    pool: ControlledTerminalPool,
    release: ControlledTerminalPoolClientRelease,
  ): void
  registerPoolClientRelease(
    client: ControlledTerminalClient,
    pool: ControlledTerminalPool,
    succeeded: boolean,
    destructionRequested: boolean,
  ): void
  registerPoolClientDestruction(client: ControlledTerminalClient, pool: ControlledTerminalPool): void
  registerPayload(payload: ControlledTerminalPayload): void
  registerFallbackPool(pool: ControlledTerminalPool): void
  terminalizeOwnedResources(): Promise<void>
} {
  const clients = new Set<ControlledTerminalClient>()
  const pools = new Set<ControlledTerminalPool>()
  const startedClients = new Set<ControlledTerminalClient>()
  const startedPools = new Set<ControlledTerminalPool>()
  const pendingPoolAcquisitions = new Map<ControlledTerminalPool, Set<{
    settled: Promise<void>
    resolve(): void
  }>>()
  const poolClients = new Map<ControlledTerminalClient, {
    pool: ControlledTerminalPool
    acquisitionPending: boolean
    acquisitionSettled: Promise<void>
    settleAcquisition(): void
    checkedOut: boolean
    release: ControlledTerminalPoolClientRelease | null
    releaseStarted: boolean
    releaseFailed: boolean
    destroyed: boolean
    destructionPending: boolean
    destructionSettled: Promise<void>
    settleDestruction(): void
  }>()
  let payload: ControlledTerminalPayload | null = null
  let fallbackPool: ControlledTerminalPool | null = null
  let dispatcherStarted = false
  let payloadStarted = false
  let fallbackPoolStarted = false
  let terminalizationFailed = false
  let running: Promise<void> | null = null
  let destructiveReleaseRequested = 0
  let destructiveReleaseCompleted = 0
  let physicalRemovals = 0
  let poolShutdownStarted = false
  let poolShutdownSettled = false
  let poolShutdownPending = 0
  const cleanupBudget = controlledFreshCandidateBudgetForScope(params.scope)
  const cleanupClients = new Set<ControlledTerminalClient>()
  const countClientCleanup = (client: ControlledTerminalClient) => {
    if (!cleanupClients.has(client)) { cleanupClients.add(client); cleanupBudget.cleanup() }
  }
  registerControlledFreshCandidatePhysicalShutdown(params.scope, () => {
    terminalizationFailed = true
    params.mutationActive.current = false
    controlledFreshCandidateBudgetForScope(params.scope).markUncertain()
    for (const client of new Set([...clients, ...poolClients.keys()])) {
      countClientCleanup(client)
      try { client.connection?.stream?.destroy() } catch { /* physical certainty is never inferred */ }
    }
    if (!dispatcherStarted) { dispatcherStarted = true; cleanupBudget.cleanup(); void Promise.resolve().then(() => params.dispatcher.destroy()).catch(() => undefined) }
    for (const pool of new Set([...pools, ...(fallbackPool ? [fallbackPool] : [])])) {
      if (!startedPools.has(pool)) { startedPools.add(pool); cleanupBudget.cleanup(); void Promise.resolve().then(() => pool.end()).catch(() => undefined) }
    }
  })

  const observeResources = (): void => {
    try {
      params.observeResources?.({
        pendingAcquisitions: [...pendingPoolAcquisitions.values()]
          .reduce((total, acquisitions) => total + acquisitions.size, 0),
        checkedOutPoolClients: [...poolClients.values()].filter((state) => state.checkedOut).length,
        standaloneClients: clients.size,
        destructiveReleaseRequested,
        destructiveReleaseCompleted,
        physicalRemovals,
        poolShutdownStarted,
        poolShutdownSettled,
      })
    } catch {
      terminalizationFailed = true
      params.mutationActive.current = false
      void params.scope.cancel().catch(() => undefined)
    }
  }

  const terminalizeOwnedResources = (): Promise<void> => {
    params.mutationActive.current = false
    if (running) return running
    const pass = (async () => {
      for (;;) {
        const resourceOperations: Promise<unknown>[] = []
        if (!dispatcherStarted) {
          dispatcherStarted = true
          cleanupBudget.cleanup()
          resourceOperations.push(Promise.resolve().then(() => params.dispatcher.destroy()))
        }
        for (const client of clients) {
          if (poolClients.has(client)) continue
          if (startedClients.has(client)) continue
          startedClients.add(client)
          countClientCleanup(client)
          resourceOperations.push(Promise.resolve().then(async () => {
            try { await client.end() } finally {
              clients.delete(client)
              try { client.unref?.() } catch { /* the client is already terminal */ }
              observeResources()
            }
          }))
        }
        for (const acquisitions of pendingPoolAcquisitions.values()) {
          for (const acquisition of acquisitions) resourceOperations.push(acquisition.settled)
        }
        for (const state of poolClients.values()) {
          if (state.destructionPending) {
            resourceOperations.push(state.destructionSettled)
            continue
          }
          if (state.acquisitionPending) {
            resourceOperations.push(state.acquisitionSettled)
            continue
          }
          if (!state.checkedOut || state.releaseStarted) continue
          state.releaseStarted = true
          for (const [client, clientState] of poolClients) if (clientState === state) countClientCleanup(client)
          destructiveReleaseRequested += 1
          observeResources()
          resourceOperations.push(Promise.resolve().then(() => {
            const release = state.release
            if (!release) throw new Error('controlled_runtime_pool_client_release_missing')
            release(new Error('controlled_runtime_pool_client_destroyed'))
            if (state.checkedOut || state.releaseFailed) {
              throw new Error('controlled_runtime_pool_client_release_failed')
            }
          }))
        }
        if (payload && !payloadStarted) {
          payloadStarted = true
          cleanupBudget.cleanup()
          resourceOperations.push(Promise.resolve().then(() => payload?.destroy()))
        }
        if (resourceOperations.length > 0) {
          const results = await controlledFreshCandidateBoundedShutdown(params.scope, Promise.allSettled(resourceOperations), () => {
            for (const client of new Set([...clients, ...poolClients.keys()])) {
              try { client.connection?.stream?.destroy() } catch { /* physical closure uncertain */ }
            }
          })
          if (results.some((result) => result.status === 'rejected')) terminalizationFailed = true
          continue
        }

        const poolOperations: Promise<unknown>[] = []
        for (const pool of pools) {
          if (startedPools.has(pool)) continue
          if ((pendingPoolAcquisitions.get(pool)?.size ?? 0) > 0) continue
          const governed = [...poolClients.values()].filter((state) => state.pool === pool)
          if (governed.some((state) => state.acquisitionPending || state.checkedOut)) continue
          startedPools.add(pool)
          cleanupBudget.cleanup()
          for (const [client, state] of poolClients) if (state.pool === pool) countClientCleanup(client)
          poolShutdownStarted = true
          poolShutdownPending += 1
          poolShutdownSettled = false
          observeResources()
          const awaitingRemoval = governed.filter((state) => !state.destroyed)
          for (const state of awaitingRemoval) state.destructionPending = true
          poolOperations.push(Promise.resolve().then(async () => {
            try {
              await pool.end()
            } catch {
              for (const state of awaitingRemoval) {
                state.destructionPending = false
                state.settleDestruction()
              }
              throw new Error('controlled_runtime_pool_end_failed')
            } finally {
              poolShutdownPending -= 1
              poolShutdownSettled = poolShutdownStarted && poolShutdownPending === 0
              observeResources()
            }
          }))
        }
        if (fallbackPool && !pools.has(fallbackPool) && !fallbackPoolStarted) {
          fallbackPoolStarted = true
          cleanupBudget.cleanup()
          poolShutdownStarted = true
          poolShutdownPending += 1
          poolShutdownSettled = false
          observeResources()
          poolOperations.push(Promise.resolve().then(() => fallbackPool?.end()).finally(() => {
            poolShutdownPending -= 1
            poolShutdownSettled = poolShutdownStarted && poolShutdownPending === 0
            observeResources()
          }))
        }
        if (poolOperations.length === 0) break
        const results = await controlledFreshCandidateBoundedShutdown(params.scope, Promise.allSettled(poolOperations), () => {
          for (const client of poolClients.keys()) {
            try { client.connection?.stream?.destroy() } catch { /* physical closure uncertain */ }
          }
        })
        if (results.some((result) => result.status === 'rejected')) terminalizationFailed = true
      }
      if (terminalizationFailed) throw new Error('controlled_runtime_teardown_failed')
    })()
    running = pass
    pass.then(
      () => { if (running === pass) running = null },
      () => { terminalizationFailed = true },
    )
    return pass
  }
  const joinAfterCancellation = (): void => {
    if (!params.scope.signal.aborted) return
    params.scope.registerTerminalization(terminalizeOwnedResources)
  }
  const registerPoolClient = (client: ControlledTerminalClient, pool: ControlledTerminalPool): void => {
    if (params.scope.state === 'CLOSED') throw new Error('controlled_runtime_resource_registration_closed')
    const existing = poolClients.get(client)
    if (existing) {
      if (existing.pool !== pool) throw new Error('controlled_runtime_pool_client_reassignment_forbidden')
      return
    }
    if (startedClients.has(client)) throw new Error('controlled_runtime_pool_client_registration_late')
    clients.delete(client)
    let settleAcquisition = (): void => undefined
    const acquisitionSettled = new Promise<void>((resolve) => { settleAcquisition = resolve })
    let settleDestruction = (): void => undefined
    const destructionSettled = new Promise<void>((resolve) => { settleDestruction = resolve })
    poolClients.set(client, {
      pool,
      acquisitionPending: true,
      acquisitionSettled,
      settleAcquisition,
      checkedOut: false,
      release: null,
      releaseStarted: false,
      releaseFailed: false,
      destroyed: false,
      destructionPending: false,
      destructionSettled,
      settleDestruction,
    })
    joinAfterCancellation()
  }
  return {
    registerClient(client) {
      if (params.scope.state === 'CLOSED') throw new Error('controlled_runtime_resource_registration_closed')
      clients.add(client)
      observeResources()
      joinAfterCancellation()
    },
    registerPool(pool) {
      if (params.scope.state === 'CLOSED') throw new Error('controlled_runtime_resource_registration_closed')
      pools.add(pool)
      observeResources()
      joinAfterCancellation()
    },
    registerPoolAcquisition(pool) {
      if (
        params.scope.state !== 'OPEN'
        || !pools.has(pool)
        || startedPools.has(pool)
      ) throw new Error('controlled_runtime_pool_revoked')
      let resolve = (): void => undefined
      const settled = new Promise<void>((complete) => { resolve = complete })
      const acquisition = { settled, resolve }
      let acquisitions = pendingPoolAcquisitions.get(pool)
      if (!acquisitions) {
        acquisitions = new Set()
        pendingPoolAcquisitions.set(pool, acquisitions)
      }
      acquisitions.add(acquisition)
      let completed = false
      joinAfterCancellation()
      observeResources()
      return () => {
        if (completed) return
        completed = true
        acquisitions?.delete(acquisition)
        if (acquisitions?.size === 0) pendingPoolAcquisitions.delete(pool)
        acquisition.resolve()
        observeResources()
        joinAfterCancellation()
      }
    },
    registerPoolClient,
    registerPoolClientAcquisition(client, pool, release) {
      if (params.scope.state === 'CLOSED') throw new Error('controlled_runtime_resource_registration_closed')
      let state = poolClients.get(client)
      if (!state) {
        registerPoolClient(client, pool)
        state = poolClients.get(client)
      }
      if (!state || state.pool !== pool) throw new Error('controlled_runtime_pool_client_reassignment_forbidden')
      if (state.checkedOut) throw new Error('controlled_runtime_pool_client_double_acquisition')
      state.checkedOut = true
      state.release = release
      state.releaseStarted = false
      state.releaseFailed = false
      state.destroyed = false
      state.destructionPending = false
      let settleDestruction = (): void => undefined
      state.destructionSettled = new Promise<void>((resolve) => { settleDestruction = resolve })
      state.settleDestruction = settleDestruction
      state.acquisitionPending = false
      state.settleAcquisition()
      observeResources()
      joinAfterCancellation()
    },
    registerPoolClientRelease(client, pool, succeeded, destructionRequested) {
      const state = poolClients.get(client)
      if (!state || state.pool !== pool) {
        terminalizationFailed = true
        return
      }
      state.acquisitionPending = false
      state.settleAcquisition()
      const firstDestructiveCompletion = succeeded
        && destructionRequested
        && !state.destructionPending
        && !state.destroyed
      if (succeeded) {
        state.checkedOut = false
        state.release = null
        state.releaseStarted = true
        state.destructionPending = destructionRequested && !state.destroyed
        if (firstDestructiveCompletion) destructiveReleaseCompleted += 1
      } else {
        state.releaseFailed = true
      }
      observeResources()
      joinAfterCancellation()
    },
    registerPoolClientDestruction(client, pool) {
      const state = poolClients.get(client)
      if (!state || state.pool !== pool) {
        terminalizationFailed = true
        return
      }
      if (state.destroyed) return
      state.destroyed = true
      state.destructionPending = false
      state.settleDestruction()
      physicalRemovals += 1
      observeResources()
      joinAfterCancellation()
    },
    registerPayload(value) {
      if (params.scope.state === 'CLOSED') throw new Error('controlled_runtime_resource_registration_closed')
      if (payload && payload !== value) throw new Error('controlled_runtime_payload_replacement_forbidden')
      payload = value
      joinAfterCancellation()
    },
    registerFallbackPool(value) {
      if (params.scope.state === 'CLOSED') throw new Error('controlled_runtime_resource_registration_closed')
      if (fallbackPool && fallbackPool !== value) throw new Error('controlled_runtime_pool_replacement_forbidden')
      fallbackPool = value
      joinAfterCancellation()
    },
    terminalizeOwnedResources,
  }
}

export function createControlledFreshCandidateDatabaseAdapter(params: {
  postgresModule: typeof import('@payloadcms/db-postgres')
  pg: typeof import('pg')
  pool: import('pg').PoolConfig
  runtimeBudget?: ControlledFreshCandidateRuntimeBudget
}) {
  configureControlledFreshCandidateProcessBoundary()
  const installedDatabaseAdapter = params.postgresModule.postgresAdapter({
    disableCreateDatabase: true,
    logger: false,
    pg: params.pg,
    pool: params.pool,
    push: false,
  })
  return {
    ...installedDatabaseAdapter,
    init(...args: Parameters<typeof installedDatabaseAdapter.init>) {
      const adapter = installedDatabaseAdapter.init(...args)
      if (
        !isPlainRecord(adapter)
        || adapter.disableCreateDatabase !== true
        || adapter.push !== false
        || !isPlainRecord(adapter.extensions)
        || Object.keys(adapter.extensions).length !== 0
        || adapter.prodMigrations !== undefined
        || adapter.readReplicaOptions !== undefined
        || typeof adapter.connect !== 'function'
      ) throw new Error('controlled_runtime_database_management_contract_missing')
      const refuseDatabaseManagement = async () => {
        throw new Error('controlled_runtime_database_management_forbidden')
      }
      try {
        Object.defineProperties(adapter, {
          disableCreateDatabase: { configurable: false, enumerable: true, value: true, writable: false },
          push: { configurable: false, enumerable: true, value: false, writable: false },
          createDatabase: { configurable: false, enumerable: true, value: refuseDatabaseManagement, writable: false },
          dropDatabase: { configurable: false, enumerable: true, value: refuseDatabaseManagement, writable: false },
        })
      } catch {
        throw new Error('controlled_runtime_database_management_contract_missing')
      }
      const installedConnect = adapter.connect as (...connectArgs: unknown[]) => Promise<unknown>
      adapter.connect = async function controlledConnect(...connectArgs: unknown[]) {
        process.env.PAYLOAD_DB_PUSH = 'false'
        process.env.PAYLOAD_DROP_DATABASE = 'false'
        if (this.disableCreateDatabase !== true || this.push !== false) {
          throw new Error('controlled_runtime_database_management_contract_missing')
        }
        if (this.pool) throw new Error('controlled_runtime_adapter_reconnect_forbidden')
        if (params.runtimeBudget) {
          const { getTableName, getTableColumns } = await import('drizzle-orm')
          if (!isPlainRecord(this.tables)) throw new Error('CONTROLLED_SQL_SCHEMA_MISSING')
          const columns = new Map<string, ReadonlySet<string>>()
          const encoders = new Map<string, ReadonlyMap<string, (value: unknown) => unknown>>()
          for (const table of Object.values(this.tables)) {
            const name = getTableName(table as never)
            const names = Object.values(getTableColumns(table as never)).map((column) => (column as { name: string }).name)
            if (columns.has(name)) throw new Error('CONTROLLED_SQL_SCHEMA_AMBIGUOUS')
            columns.set(name, new Set(names))
            encoders.set(name, new Map(Object.values(getTableColumns(table as never)).map((column) => {
              const encoder = column as { name: string; mapToDriverValue(value: unknown): unknown }
              return [encoder.name, (value: unknown) => encoder.mapToDriverValue(value)]
            })))
          }
          params.runtimeBudget.registerSqlColumns(columns, encoders)
        }
        const acquired = new Set<import('pg').PoolClient>()
        const restore: Array<() => void> = []
        const BasePool = this.pg.Pool
        // Only the installed bootstrap checkout receives this short-lived
        // facade. Suppress its unbounded ECONNRESET reconnect listener.
        const BootstrapPool = new Proxy(BasePool, { construct(target, args, newTarget) {
          const pool = Reflect.construct(target, args, newTarget) as import('pg').Pool
          const connect = pool.connect
          pool.connect = (async () => {
            const client = await connect.call(pool)
            acquired.add(client)
            // A separate facade avoids Proxy invariant violations against the
            // controlled client's immutable prependListener property.
            return Object.freeze({ prependListener(event: string) {
              if (event !== 'error') throw new Error('controlled_runtime_bootstrap_contract_changed')
              return this
            } }) as unknown as import('pg').PoolClient
          }) as typeof pool.connect
          restore.push(() => { pool.connect = connect })
          return pool
        } })
        this.pg = { ...this.pg, Pool: BootstrapPool }
        try { return await (params.runtimeBudget
          ? params.runtimeBudget.withSqlPhase({ phase: 'bootstrap', maximumStatements: 8 }, () => installedConnect.apply(this, connectArgs))
          : installedConnect.apply(this, connectArgs)) } finally {
          // Restore normal acquisition before any application work. Capacity
          // stays exactly one; bootstrap success AND failure release ownership.
          this.pg = { ...this.pg, Pool: BasePool }
          for (const restoreConnect of restore) restoreConnect()
          for (const client of acquired) client.release()
        }
      }
      return adapter
    },
  }
}

async function createPayloadBoundary(params: {
  uploadCallbacks: { current: import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  expectedFilename: { current: string | null }
  mutationActive: { current: boolean }
  scratchDirectory: string
  scope: ControlledFreshCandidateOperationScope
  runtimeBudget: ControlledFreshCandidateRuntimeBudget
  observeResources?: (resources: ControlledFreshCandidateObservationResources) => void
}): Promise<{
  payload: ControlledRuntimePayload
  pool: VisualPilotRuntimePostgresPool
  dispatcher: { destroy(): Promise<void> }
  terminalizeOwnedResources(): Promise<void>
}> {
  if (
    process.env.PAYLOAD_DB_PUSH !== 'false'
    || process.env.PAYLOAD_DROP_DATABASE !== 'false'
  ) throw new Error('controlled_runtime_database_management_not_disabled')
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
  const terminalResources = createControlledFreshCandidateTerminalResourceRegistry({
    scope: params.scope,
    mutationActive: params.mutationActive,
    dispatcher,
    observeResources: params.observeResources,
  })
  params.scope.registerCancellation(terminalResources.terminalizeOwnedResources)
  const governedPoolError = (): void => {
    params.mutationActive.current = false
    params.scope.cancel().then(
      () => undefined,
      () => undefined,
    )
  }
  const SecurePostgresClient = createControlledFreshCandidateSecurePgClientConstructor(
    pgModule.Client as unknown as import('./controlled-fresh-candidate-pg-security').ControlledFreshCandidatePgClientConstructor,
    {
      clientConstructed: params.runtimeBudget.clientConstructed,
      connectionAttempted: params.runtimeBudget.connectionAttempted,
      sql: params.runtimeBudget.sql,
      channelBindingConfirmed: params.runtimeBudget.channelBindingConfirmed,
      securityRejected: governedPoolError,
    },
  ) as unknown as typeof pgModule.Client
  let ControlledPostgresClient: typeof pgModule.Client
  ControlledPostgresClient = new Proxy(SecurePostgresClient, {
    construct(target, args, newTarget) {
      params.scope.assertActive()
      const client = Reflect.construct(target, args, newTarget) as InstanceType<typeof pgModule.Client>
      if (newTarget === ControlledPostgresClient) {
        client.prependListener('error', governedPoolError)
        terminalResources.registerClient(client)
      }
      return client
    },
  })
  const ControlledPostgresPool = createControlledFreshCandidatePoolConstructor({
    basePool: pgModule.Pool,
    onClient: terminalResources.registerPoolClient,
    onClientAcquired(client, pool, release) {
      params.runtimeBudget.clientAcquired()
      terminalResources.registerPoolClientAcquisition(client, pool, release)
    },
    onClientReleased(client, pool, succeeded, destructionRequested) {
      params.runtimeBudget.clientReleased()
      terminalResources.registerPoolClientRelease(client, pool, succeeded, destructionRequested)
    },
    onClientDestroyed: terminalResources.registerPoolClientDestruction,
    onConstructed(pool) {
      params.runtimeBudget.poolConstructed()
      terminalResources.registerPool(pool)
    },
    onPoolAcquisitionStarted: terminalResources.registerPoolAcquisition,
    onUnexpectedError: governedPoolError,
    canConstruct: () => params.scope.state === 'OPEN',
    canConnect: () => params.scope.state === 'OPEN',
  })
  const controlledPgModule = {
    ...pgModule,
    Client: ControlledPostgresClient,
    Pool: ControlledPostgresPool,
  } as unknown as typeof import('pg')
  const baseUrl = `https://${storeId}.public.blob.vercel-storage.com`
  const controlledAdapter = () => ({
    name: 'controlled-vercel-blob',
    generateURL: ({ filename }: { filename: string }) => `${baseUrl}/${encodeURIComponent(filename)}`,
    handleDelete: async () => { throw new Error('controlled_storage_delete_denied') },
    handleUpload: serializeControlledFreshCandidateUploads(async ({ file }: { file: { buffer: Buffer; filename: string; mimeType: string } }) => {
      if (!params.mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      const callbacks = params.uploadCallbacks.current
      if (!callbacks) throw new Error('controlled_upload_callbacks_missing')
      const metadata = await sharpModule.default(file.buffer, { limitInputPixels: 40_000_000 }).metadata()
      if (!metadata.width || !metadata.height) throw new Error('controlled_blob_dimensions_missing')
      await callbacks.beforeUpload(file.filename, {
        key: file.filename, contentDigest: createHash('sha256').update(file.buffer).digest('hex'),
        byteSize: file.buffer.byteLength, mimeType: file.mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        width: metadata.width, height: metadata.height,
      })
      params.scope.assertActive()
      if (!params.mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
      let completed = false
      try {
        params.runtimeBudget.blobCall()
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
        // The installed cloud afterChange hook calls payload.update() whenever
        // a handler returns metadata. Blob evidence lives in the receipt only.
        return undefined
      } finally {
        if (!completed) {
          try { await callbacks.uploadUncertain(file.filename) } catch { /* receipt failure already closes the boundary */ }
        }
      }
    }),
    staticHandler: async () => { throw new Error('controlled_runtime_server_disabled') },
  })

  const mediaBeforeChange = async ({ data }: { data: RecordValue }) => {
    const expected = params.expectedFilename.current
    if (!controlledFreshCandidateFilenameIsApproved(expected, data.filename)) {
      throw new Error('controlled_media_filename_changed')
    }
    params.runtimeBudget.capturePreparedDocument(data)
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
  const poolOptions = controlledFreshCandidateSecurePgConfig(databaseUri, {
    Client: ControlledPostgresClient,
    max: 1,
    min: 0,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 1_000,
    statement_timeout: 40_000,
    query_timeout: 42_000,
    lock_timeout: 10_000,
    idle_in_transaction_session_timeout: 40_000,
  }) as import('pg').PoolConfig
  const controlledDatabaseAdapter = createControlledFreshCandidateDatabaseAdapter({
    postgresModule,
    pg: controlledPgModule,
    pool: poolOptions,
    runtimeBudget: params.runtimeBudget,
  })
  const baseConfig = {
    collections: [{ ...Products, hooks: { ...Products.hooks, beforeChange: [...(Products.hooks?.beforeChange ?? []),
      async ({ data, operation }: { data: RecordValue; operation: string }) => {
        if (operation === 'create') params.runtimeBudget.capturePreparedDocument(data)
        return data
      }] } }, Variants, isolatedMedia, Brands, Categories, BlogPosts, ImageGenerationJobs, BotEvents, StoryJobs],
    jobs: { tasks: [] },
    typescript: { autoGenerate: false },
    telemetry: false,
    db: controlledDatabaseAdapter,
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
    const ownedPayload = new payloadModule.BasePayload()
    payload = ownedPayload as unknown as ControlledRuntimePayload
    terminalResources.registerPayload(payload)
    await ownedPayload.init({ config, disableOnInit: true })
    if (params.scope.signal.aborted) {
      await terminalResources.terminalizeOwnedResources()
      throw new Error('controlled_runtime_deadline')
    }
  } catch (error) {
    try { await terminalResources.terminalizeOwnedResources() } catch { /* initialization remains failed closed */ }
    throw error
  }
  let pool: VisualPilotRuntimePostgresPool
  try {
    pool = runtimePool(payload)
    terminalResources.registerFallbackPool(pool)
  } catch {
    try { await terminalResources.terminalizeOwnedResources() } catch { /* initialization remains failed closed */ }
    throw new Error('controlled_runtime_pool_unavailable')
  }
  return { payload, pool, dispatcher, terminalizeOwnedResources: terminalResources.terminalizeOwnedResources }
}

export async function initializeControlledFreshCandidateCreationRuntime(
  providedScope?: ControlledFreshCandidateOperationScope,
): Promise<ControlledFreshCandidateRuntimeResource> {
  assertControlledPosixRuntime()
  const scope = providedScope ?? createControlledFreshCandidateOperationScope({
    timeoutMs: CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  })
  const runtimeBudget = controlledFreshCandidateBudgetForScope(scope)
  const uploadCallbacks = { current: null as import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  const expectedFilename = { current: null as string | null }
  const mutationActive = { current: false }
  let ledger: ControlledFreshCandidateOwnerLedger | null = null
  let receiptDestination: ControlledFreshCandidatePhysicalReceiptDestination | null = null
  let observationDestination: ControlledFreshCandidatePhysicalReceiptDestination | null = null
  let observation: ControlledFreshCandidateObservationController | null = null
  let scratchDirectory: string | null = null
  let payloadBoundaryPromise: Promise<Awaited<ReturnType<typeof createPayloadBoundary>>> | null = null
  let teardownPromise: Promise<{ ok: true } | { ok: false }> | null = null
  let authorityClosurePromise: Promise<{ ok: true } | { ok: false }> | null = null
  let creationOwnsAuthorityClosure = false
  const teardown = () => {
    teardownPromise ??= (async () => {
      mutationActive.current = false
      let ok = true
      if (payloadBoundaryPromise) {
        try {
          const boundary = await controlledFreshCandidateBoundedShutdown(scope, payloadBoundaryPromise)
          await controlledFreshCandidateBoundedShutdown(scope, boundary.terminalizeOwnedResources())
        } catch { ok = false }
      }
      if (scratchDirectory) {
        runtimeBudget.cleanup()
        try { await controlledFreshCandidateBoundedShutdown(scope, rm(scratchDirectory, { recursive: true, force: true })) } catch { ok = false; runtimeBudget.markUncertain() }
      }
      return ok ? { ok: true as const } : { ok: false as const }
    })()
    return teardownPromise
  }
  const closeAuthorityResources = () => {
    authorityClosurePromise ??= (async () => {
      let ok = true
      if (receiptDestination) runtimeBudget.cleanup()
      try { receiptDestination?.close() } catch { ok = false }
      if (ledger) runtimeBudget.cleanup()
      try { ledger?.close() } catch { ok = false }
      receiptDestination = null
      ledger = null
      return ok ? { ok: true as const } : { ok: false as const }
    })()
    return authorityClosurePromise
  }
  const closeObservationResources = () => {
    const ownedObservation = observation
    const ownedDestination = observationDestination
    observation = null
    observationDestination = null
    if (ownedObservation || ownedDestination) runtimeBudget.cleanup()
    try {
      if (ownedObservation) ownedObservation.close()
      else ownedDestination?.close()
    } catch { runtimeBudget.markUncertain(); throw new Error('controlled_observation_close_failed') }
  }
  registerControlledFreshCandidatePhysicalShutdown(scope, () => {
    mutationActive.current = false
    // Synchronous private-handle closure must be accounted before the terminal
    // deadline report, even when asynchronous pool/dispatcher cleanup stalls.
    void closeAuthorityResources().then((result) => { if (!result.ok) runtimeBudget.markUncertain() })
      .catch(() => runtimeBudget.markUncertain())
    closeObservationResources()
  })
  // This owner is installed before the first authority read or initialization.
  scope.registerCancellation(async () => {
    const teardownResult = await teardown()
    const closureResult = creationOwnsAuthorityClosure
      ? { ok: true as const }
      : await closeAuthorityResources()
    if (!teardownResult.ok || !closureResult.ok) throw new Error('controlled_runtime_teardown_failed')
  })
  ledger = await initializeControlledFreshCandidateOwnerLedger(scope)
  let runtimeInput: Awaited<ReturnType<typeof readRuntimeInput>>
  try {
    runtimeInput = await readRuntimeInput(scope, ledger)
  } catch (error) {
    await teardown()
    await closeAuthorityResources()
    throw error
  }
  const { input } = runtimeInput
  receiptDestination = runtimeInput.receiptDestination
  observationDestination = runtimeInput.observationDestination
  try {
    observation = await initializeControlledFreshCandidateObservation({
      scope,
      destination: observationDestination,
      operationId: input.executionId,
      key: input.receiptKey,
      mode: 'create',
    })
  } catch (error) {
    closeObservationResources()
    await teardown()
    await closeAuthorityResources()
    throw error
  }
  configureControlledFreshCandidateProcessBoundary()
  const persistence = createControlledFreshCandidateReceiptPersistence({
    receiptDestination,
    destinationDigest: input.authorizationContext.approvedReceiptDestinationDigest,
    executionId: input.executionId,
    ledger,
    onAuthorizationConsumed: () => observation?.observeAuthorizationConsumed(),
    onReceiptPersisted: (serialized) => observation?.observeReceipt(serialized),
  })
  const assertMutation = (signal: AbortSignal): void => {
    scope.assertActive()
    if (signal.aborted || !mutationActive.current) throw new Error('controlled_mutation_capability_revoked')
  }
  const ensurePayloadBoundary = async (signal: AbortSignal) => {
    assertMutation(signal)
    if (!payloadBoundaryPromise) {
      payloadBoundaryPromise = (async () => {
        scratchDirectory = await mkdtemp(path.join(ledger.root, '.uygunayakkabi-cfc-'))
        const scratchAuthority = openPrivatePosixDirectory(scratchDirectory, ledger.device)
        closeSync(scratchAuthority.handle)
        if ((await readdir(scratchDirectory)).length !== 0) throw new Error('controlled_runtime_scratch_not_empty')
        return createPayloadBoundary({
          uploadCallbacks,
          expectedFilename,
          mutationActive,
          scratchDirectory,
          scope,
          runtimeBudget,
          observeResources: (resources) => observation?.observeResources(resources),
        })
      })()
    }
    const boundary = await payloadBoundaryPromise
    // The real schema is available after read-only adapter initialization and
    // must pass before stock qualification, transactions or application writes.
    resolveControlledFinalizationTableAuthority(boundary.payload, boundary.payload.db as Record<string, unknown>)
    assertMutation(signal)
    return boundary
  }
  const dependencies: ControlledFreshCandidateCreationDependencies = {
    scope,
    async consumeExecutionAuthorization(grant, token, signal, authorizationObservedAt) {
      const consumed = await persistence.consume(grant, token, signal, authorizationObservedAt)
      if (consumed && !signal.aborted) mutationActive.current = true
      return consumed
    },
    async stockExists(stockCandidate, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      runtimeBudget.applicationRead('products')
      const result = normalizePayloadPage(await runtimeBudget.withSqlPhase({ phase: 'stock', table: 'products', identity: stockCandidate }, () => payload.find({
        collection: 'products',
        where: { stockNumber: { equals: stockCandidate } },
        depth: 0,
        page: 1,
        limit: 2,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      })), 1, 2)
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
      const transactionId = await runtimeBudget.withSqlPhase({ phase: 'begin', maximumStatements: 1 }, () => (payload.db as { beginTransaction(): Promise<unknown> }).beginTransaction())
      assertMutation(signal)
      if (typeof transactionId !== 'string' || !transactionId) return false
      req.transactionID = transactionId
      return true
    },
    async createProduct(request, data, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      runtimeBudget.applicationMutation('products')
      const created = await runtimeBudget.withSqlPhase({ phase: 'product-create', table: 'products', data }, () =>
        payload.create({ collection: 'products', data, req: request, depth: 0, overrideAccess: true }))
      runtimeBudget.recordCreatedIdentity('products', isPlainRecord(created) ? created.id : null)
      return created
    },
    async commitProductTransaction(request, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      const req = request as { transactionID?: unknown }
      if (!isPlainRecord(payload.db) || typeof payload.db.commitTransaction !== 'function' || typeof req.transactionID !== 'string') {
        throw new Error('controlled_transaction_unavailable')
      }
      await runtimeBudget.withSqlPhase({ phase: 'commit', maximumStatements: 1 }, () => (payload.db as { commitTransaction(id: string): Promise<void> }).commitTransaction(req.transactionID as string))
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
      await runtimeBudget.withSqlPhase({ phase: 'rollback', maximumStatements: 1 }, () => (payload.db as { rollbackTransaction(id: string): Promise<void> }).rollbackTransaction(transactionId))
    },
    async readProduct(productId, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      runtimeBudget.applicationRead('products')
      const result = await runtimeBudget.withSqlPhase({ phase: 'read', table: 'products', identity: productId }, () =>
        payload.findByID({ collection: 'products', id: productId, depth: 0, disableErrors: true, overrideAccess: true }))
      assertMutation(signal)
      return result
    },
    async createMedia(params) {
      const { payload } = await ensurePayloadBoundary(params.signal)
      assertMutation(params.signal)
      uploadCallbacks.current = params.uploads
      expectedFilename.current = params.file.name
      try {
        runtimeBudget.applicationMutation('media')
        const created = await runtimeBudget.withSqlPhase({ phase: 'media-create', table: 'media',
          data: { ...params.data, filename: params.file.name, mimeType: params.file.mimetype, filesize: params.file.size } }, () => payload.create({
          collection: 'media',
          data: params.data,
          file: params.file,
          depth: 0,
          overrideAccess: true,
          overwriteExistingFiles: false,
        }))
        runtimeBudget.recordCreatedIdentity('media', isPlainRecord(created) ? created.id : null)
        return created
      } finally {
        uploadCallbacks.current = null
        expectedFilename.current = null
      }
    },
    async readMedia(mediaId, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      runtimeBudget.applicationRead('media')
      const result = await runtimeBudget.withSqlPhase({ phase: 'read', table: 'media', identity: mediaId, identityField: 'id' }, () =>
        payload.findByID({ collection: 'media', id: mediaId, depth: 0, disableErrors: true, overrideAccess: true }))
      assertMutation(signal)
      return result
    },
    async updateProductRelationship(productId, mediaId, signal) {
      const { payload } = await ensurePayloadBoundary(signal)
      assertMutation(signal)
      runtimeBudget.applicationMutation('products')
      const { createLocalReq } = await import('payload')
      const req = await createLocalReq({ context: { isVisualStatusUpdate: true } }, payload as never)
      return runtimeBudget.withSqlPhase({ phase: 'relationship', table: 'products', identity: productId, maximumStatements: 12 }, () =>
        payload.update({ collection: 'products', id: productId, data: { images: { $push: [{ id: randomUUID(), image: mediaId }] } }, req, depth: 0, overrideAccess: true }))
    },
    async finalizeProduct(params) {
      const { payload } = await ensurePayloadBoundary(params.signal)
      return finalizeControlledFreshCandidateProductAtomically({
        payload,
        scope,
        mutationActive,
        runtimeBudget,
        ...params,
      })
    },
    persistPrivateReceipt: persistence.persist,
    async revokeMutationCapability() {
      mutationActive.current = false
    },
    teardown,
    closeAuthorityResources,
  }
  return {
    creationInput: input,
    creationDependencies: dependencies,
    scope,
    claimAuthorityClosure() {
      if (creationOwnsAuthorityClosure) throw new Error('controlled_runtime_authority_closure_already_claimed')
      creationOwnsAuthorityClosure = true
    },
    completeObservation(report, terminalOk) {
      observation?.completeCreation(report, terminalOk)
    },
    failObservation() {
      observation?.fail()
    },
    closeObservation: closeObservationResources,
    runtimeBudgetReport: runtimeBudget.report,
    async destroy() {
      let ok = true
      try { await scope.cancel() } catch { ok = false }
      const teardownResult = await teardown()
      const closureResult = await closeAuthorityResources()
      try { await scope.drain() } catch { ok = false }
      return ok && teardownResult.ok && closureResult.ok ? { ok: true } : { ok: false }
    },
  }
}

export async function initializeControlledFreshCandidateVerificationRuntime(
  providedScope?: ControlledFreshCandidateOperationScope,
): Promise<ControlledFreshCandidateVerificationResource> {
  assertControlledPosixRuntime()
  const scope = providedScope ?? createControlledFreshCandidateOperationScope({
    timeoutMs: CONTROLLED_FRESH_CANDIDATE_EXECUTION_TIMEOUT_MS,
  })
  const runtimeBudget = controlledFreshCandidateBudgetForScope(scope)
  const uploadCallbacks = { current: null as import('../src/lib/controlledFreshCandidateCreation').ControlledFreshCandidateUploadCallbacks | null }
  const expectedFilename = { current: null as string | null }
  const mutationActive = { current: false }
  let ledger: ControlledFreshCandidateOwnerLedger | null = null
  let receiptDestination: ControlledFreshCandidatePhysicalReceiptDestination | null = null
  let observationDestination: ControlledFreshCandidatePhysicalReceiptDestination | null = null
  let observation: ControlledFreshCandidateObservationController | null = null
  let scratchDirectory: string | null = null
  let payloadBoundaryPromise: Promise<Awaited<ReturnType<typeof createPayloadBoundary>>> | null = null
  let teardownPromise: Promise<{ ok: true } | { ok: false }> | null = null
  let authorityClosureResult: { ok: true } | { ok: false } | null = null
  const closeAuthorityResources = () => {
    if (authorityClosureResult) return authorityClosureResult
    let ok = true
    const ownedReceipt = receiptDestination
    const ownedLedger = ledger
    receiptDestination = null
    ledger = null
    if (ownedReceipt) runtimeBudget.cleanup()
    try { ownedReceipt?.close() } catch { ok = false; runtimeBudget.markUncertain() }
    if (ownedLedger) runtimeBudget.cleanup()
    try { ownedLedger?.close() } catch { ok = false; runtimeBudget.markUncertain() }
    authorityClosureResult = ok ? { ok: true as const } : { ok: false as const }
    return authorityClosureResult
  }
  const closeObservationResources = () => {
    const ownedObservation = observation
    const ownedDestination = observationDestination
    observation = null
    observationDestination = null
    if (ownedObservation || ownedDestination) runtimeBudget.cleanup()
    try {
      if (ownedObservation) ownedObservation.close()
      else ownedDestination?.close()
    } catch { runtimeBudget.markUncertain(); throw new Error('controlled_observation_close_failed') }
  }
  registerControlledFreshCandidatePhysicalShutdown(scope, () => {
    mutationActive.current = false
    closeAuthorityResources()
    closeObservationResources()
  })
  const teardown = () => {
    teardownPromise ??= (async () => {
      mutationActive.current = false
      let ok = true
      if (payloadBoundaryPromise) {
        try {
          const boundary = await controlledFreshCandidateBoundedShutdown(scope, payloadBoundaryPromise)
          await controlledFreshCandidateBoundedShutdown(scope, boundary.terminalizeOwnedResources())
        } catch { ok = false }
      }
      if (scratchDirectory) {
        runtimeBudget.cleanup()
        try { await controlledFreshCandidateBoundedShutdown(scope, rm(scratchDirectory, { recursive: true, force: true })) } catch { ok = false; runtimeBudget.markUncertain() }
      }
      if (!closeAuthorityResources().ok) ok = false
      return ok ? { ok: true as const } : { ok: false as const }
    })()
    return teardownPromise
  }
  scope.registerCancellation(async () => {
    if (!(await teardown()).ok) throw new Error('controlled_runtime_teardown_failed')
  })
  ledger = await initializeControlledFreshCandidateOwnerLedger(scope)
  const receiptPath = process.env[CONTROLLED_FRESH_CANDIDATE_RECEIPT_PATH_ENV]
  const observationPath = process.env[CONTROLLED_FRESH_CANDIDATE_OBSERVATION_PATH_ENV]
  const keyText = process.env[CONTROLLED_FRESH_CANDIDATE_RECEIPT_KEY_ENV]
  if (
    !receiptPath || !path.isAbsolute(receiptPath)
    || !observationPath || !path.isAbsolute(observationPath)
    || path.resolve(receiptPath) === path.resolve(observationPath)
    || !keyText
  ) {
    await teardown()
    throw new Error('controlled_runtime_configuration_missing')
  }
  const key = exactBase64(keyText, 32, 128)
  const commitIdentity = process.env[CONTROLLED_FRESH_CANDIDATE_COMMIT_IDENTITY_ENV]
  const environmentIdentity = process.env[CONTROLLED_FRESH_CANDIDATE_ENVIRONMENT_IDENTITY_ENV]
  if (!key || !exactContextIdentity(commitIdentity) || !exactContextIdentity(environmentIdentity)) {
    await teardown()
    throw new Error('controlled_runtime_configuration_missing')
  }
  let capability: ControlledFreshCandidateTargetCapability
  try {
    receiptDestination = openControlledFreshCandidatePhysicalReceiptDestination(receiptPath, ledger.device)
    const destinationDigest = controlledFreshCandidateReceiptDestinationDigest({
      destination: receiptDestination,
      runtimeCommitIdentity: commitIdentity,
      environmentIdentity,
    })
    capability = authenticateControlledFreshCandidateReceiptBytes({
      bytes: await readPhysicalReceiptBytes(scope, receiptDestination),
      key,
      expectedCommitIdentity: commitIdentity,
      expectedEnvironmentIdentity: environmentIdentity,
      expectedReceiptDestinationDigest: destinationDigest,
      consume: createControlledFreshCandidateDurableReceiptConsumer(ledger),
    })
    const authorizedReceipt = readControlledFreshCandidateCapability(capability)
    runtimeBudget.recordCreatedIdentity('products', authorizedReceipt.product.id)
    runtimeBudget.recordCreatedIdentity('media', authorizedReceipt.media.id)
  } catch (error) {
    await teardown()
    throw error
  }
  runtimeBudget.cleanup()
  receiptDestination.close()
  receiptDestination = null
  try {
    observationDestination = openControlledFreshCandidatePhysicalReceiptDestination(observationPath, ledger.device)
    const receipt = readControlledFreshCandidateCapability(capability)
    observation = await initializeControlledFreshCandidateObservation({
      scope,
      destination: observationDestination,
      operationId: receipt.executionId,
      key,
      mode: 'verify',
    })
    observation.observeResources({
      pendingAcquisitions: 0,
      checkedOutPoolClients: 0,
      standaloneClients: 0,
      destructiveReleaseRequested: 0,
      destructiveReleaseCompleted: 0,
      physicalRemovals: 0,
      poolShutdownStarted: false,
      poolShutdownSettled: false,
    })
  } catch (error) {
    try { closeObservationResources() } catch { /* sanitized initialization failure */ }
    await teardown()
    throw error
  }
  configureControlledFreshCandidateProcessBoundary()
  try {
    scratchDirectory = await mkdtemp(path.join(ledger.root, '.uygunayakkabi-cfc-verify-'))
    const scratchAuthority = openPrivatePosixDirectory(scratchDirectory, ledger.device)
    closeSync(scratchAuthority.handle)
    payloadBoundaryPromise = createPayloadBoundary({
      uploadCallbacks,
      expectedFilename,
      mutationActive,
      scratchDirectory: scratchDirectory as string,
      scope,
      runtimeBudget,
      observeResources: (resources) => observation?.observeResources(resources),
    })
  } catch (error) {
    await teardown()
    throw error
  }
  let payloadBoundary: Awaited<ReturnType<typeof createPayloadBoundary>>
  try { payloadBoundary = await payloadBoundaryPromise } catch (error) {
    await teardown()
    throw error
  }
  const { payload, pool } = payloadBoundary
  return {
    capability,
    dependencies: {
      gateway: createStrictGateway(payload, pool, scope, runtimeBudget),
      async readBlobSet(expected, signal, snapshot) {
        const token = process.env.BLOB_READ_WRITE_TOKEN ?? ''
        const storeId = token.match(/^vercel_blob_rw_([a-z\d]+)_[a-z\d]+$/iu)?.[1]?.toLowerCase()
        if (!storeId) throw new Error('CONTROLLED_BLOB_STORE_INVALID')
        const origin = `https://${storeId}.public.blob.vercel-storage.com`
        const blob = await import('@vercel/blob')
        return observeControlledFreshCandidateBlobSet({ expected, origin, signal, budget: runtimeBudget, io: {
          async list(prefix) {
            const result = await blob.list({ prefix, limit: 5, token })
            return { keys: result.blobs.map((item) => item.pathname), hasMore: result.hasMore }
          },
          async head(key) {
            const result = await blob.head(`${origin}/${key}`, { token })
            return { key: result.pathname, url: result.url, byteSize: result.size, mimeType: result.contentType }
          },
          async read(key, url, readSignal) {
            if (key === snapshot.media[0]?.filename && snapshot.originalEvidence?.ok) return snapshot.originalEvidence
            const evidence = await readVisualPilotMediaEvidence({ url, mimeType: expected.find((item) => item.key === key)?.mimeType }, {
              signal: readSignal, maxRedirects: 0, maxBytes: expected.find((item) => item.key === key)?.byteSize,
              canonicalOrigin: origin, timeoutMs: Math.max(1, Math.min(15_000, scope.deadline - Date.now())),
            })
            if (!evidence.ok) throw new Error('CONTROLLED_BLOB_CONTENT_UNAVAILABLE')
            return evidence
          },
        } })
      },
      mediaRead: { canonicalOrigin: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.uygunayakkabi.com' },
      operationScope: scope,
      teardown,
    },
    scope,
    completeObservation(report, terminalOk) {
      observation?.completeVerification(report, terminalOk)
    },
    failObservation() {
      observation?.fail()
    },
    closeObservation: closeObservationResources,
    runtimeBudgetReport: runtimeBudget.report,
    async destroy() {
      let ok = true
      try { await scope.cancel() } catch { ok = false }
      const result = await teardown()
      try { await scope.drain() } catch { ok = false }
      return ok && result.ok ? { ok: true } : { ok: false }
    },
  }
}

export async function executeControlledCreationResource(
  resource: ControlledFreshCandidateRuntimeResource,
): Promise<ControlledFreshCandidatePublicReport> {
  resource.claimAuthorityClosure?.()
  return createControlledFreshCandidate(resource.creationInput, resource.creationDependencies)
}
