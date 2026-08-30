import { sql } from 'drizzle-orm'
import type { Payload, PayloadRequest } from 'payload'

import { runPayloadTransaction } from './payloadTransaction'
import {
  createVisualMutationLockSequence,
  VISUAL_MUTATION_LOCK_ORDER,
} from './visualMutationLockOrder'
import {
  parseVisualOnlyV01Callback,
  planVisualOnlyV01Decision,
  VisualOnlyV01BoundaryError,
  type VisualOnlyV01AtomicAdapter,
  type VisualOnlyV01CallbackContext,
} from './visualOnlyApprovalV01'

type AtomicDatabase = { execute(statement: unknown): Promise<unknown> }
type RuntimeTable = Record<string, unknown>
type RuntimePayload = {
  db: {
    sessions?: Record<string, { db?: AtomicDatabase }>
    tables?: Record<string, RuntimeTable | undefined>
    tableNameMap?: Map<string, string>
  }
  collections?: Record<string, { config?: { slug?: unknown; dbName?: unknown } } | undefined>
  findByID(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<Record<string, unknown>>
  update(args: Record<string, unknown>): Promise<unknown>
}

type VisualOnlyTableAuthority = {
  jobTable: RuntimeTable
  productTable: RuntimeTable
}

const IMAGE_JOB_COLLECTION_SLUG = 'image-generation-jobs'
const IMAGE_JOB_DEFAULT_TABLE_NAME = 'image_generation_jobs'
const PRODUCT_COLLECTION_SLUG = 'products'
const PRODUCT_DEFAULT_TABLE_NAME = 'products'
export const VISUAL_ONLY_APPROVAL_LOCK_ORDER = Object.freeze(
  VISUAL_MUTATION_LOCK_ORDER.slice(0, 2),
) as readonly ['image-generation-jobs', 'products']

function unavailable(): never {
  throw new Error('VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE')
}

function resolveDefaultCollectionTable(params: {
  payload: RuntimePayload
  collectionSlug: string
  defaultTableName: string
}): RuntimeTable {
  const collection = params.payload.collections?.[params.collectionSlug]?.config
  const tableNameMap = params.payload.db.tableNameMap
  if (
    collection?.slug !== params.collectionSlug
    || collection.dbName !== undefined
    || !(tableNameMap instanceof Map)
  ) return unavailable()
  const physicalName = tableNameMap.get(params.defaultTableName)
  if (physicalName !== params.defaultTableName) return unavailable()
  const owners = [...tableNameMap.entries()]
    .filter(([, mappedName]) => mappedName === physicalName)
  if (owners.length !== 1 || owners[0]?.[0] !== params.defaultTableName) return unavailable()
  const table = params.payload.db.tables?.[physicalName]
  if (!table) return unavailable()
  return table
}

export function resolveVisualOnlyV01TableAuthority(payload: unknown): VisualOnlyTableAuthority {
  const runtime = payload as RuntimePayload
  const jobTable = resolveDefaultCollectionTable({
    payload: runtime,
    collectionSlug: IMAGE_JOB_COLLECTION_SLUG,
    defaultTableName: IMAGE_JOB_DEFAULT_TABLE_NAME,
  })
  const productTable = resolveDefaultCollectionTable({
    payload: runtime,
    collectionSlug: PRODUCT_COLLECTION_SLUG,
    defaultTableName: PRODUCT_DEFAULT_TABLE_NAME,
  })
  if (!jobTable.id || !jobTable.status || !jobTable.updatedAt || !productTable.id) return unavailable()
  return { jobTable, productTable }
}

function rowsFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  const rows = (value as { rows?: unknown }).rows
  return Array.isArray(rows) ? rows : []
}

export async function prepareVisualOnlyV01AtomicRuntime(payload: unknown, req: PayloadRequest): Promise<{
  db: AtomicDatabase
  jobTable: RuntimeTable
  productTable: RuntimeTable
}> {
  const runtime = payload as RuntimePayload
  const { jobTable, productTable } = resolveVisualOnlyV01TableAuthority(runtime)
  const transactionID = await req.transactionID
  const db = transactionID ? runtime.db.sessions?.[String(transactionID)]?.db : undefined
  if (!db) return unavailable()
  return { db, jobTable, productTable }
}

export function createVisualOnlyV01PayloadAdapter(
  payload: Payload,
): VisualOnlyV01AtomicAdapter<PayloadRequest> {
  const runtime = payload as unknown as RuntimePayload
  const lockSequences = new WeakMap<PayloadRequest, ReturnType<typeof createVisualMutationLockSequence>>()
  const readJob = (jobId: string, req?: PayloadRequest) => runtime.findByID({
    collection: IMAGE_JOB_COLLECTION_SLUG,
    id: Number(jobId),
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  const readProduct = (productId: number, req?: PayloadRequest) => runtime.findByID({
    collection: PRODUCT_COLLECTION_SLUG,
    id: productId,
    depth: 0,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  const readMedia = async (mediaIds: readonly number[], req?: PayloadRequest): Promise<unknown[]> => {
    if (mediaIds.length !== 5 || new Set(mediaIds).size !== mediaIds.length) return []
    const result = await runtime.find({
      collection: 'media',
      where: { id: { in: [...mediaIds] } },
      sort: 'id',
      limit: 5,
      page: 1,
      depth: 0,
      overrideAccess: true,
      pagination: true,
      ...(req ? { req } : {}),
    })
    return Array.isArray(result.docs) ? result.docs : []
  }
  return {
    async authorizeCallback(callback: VisualOnlyV01CallbackContext) {
      const parsed = parseVisualOnlyV01Callback(callback.data)
      if (!parsed) throw new Error('VISUAL_ONLY_CALLBACK_MALFORMED')
      const job = await readJob(parsed.jobId)
      if (
        job && typeof job === 'object' && 'status' in job
        && job.status !== 'preview' && job.status !== 'review'
      ) throw new VisualOnlyV01BoundaryError('VISUAL_ONLY_CALLBACK_REPLAYED_OR_TERMINAL')
      const evidence = job && typeof job === 'object' && 'generatedImages' in job
        ? (job as { generatedImages?: unknown }).generatedImages
        : undefined
      const mediaIds = Array.isArray(evidence)
        ? evidence.map((entry) => Number(typeof entry === 'object' && entry && 'id' in entry ? entry.id : entry))
        : []
      const jobProduct = job && typeof job === 'object' && 'product' in job
        ? (job as { product?: unknown }).product
        : undefined
      const productId = Number(typeof jobProduct === 'object' && jobProduct && 'id' in jobProduct ? jobProduct.id : jobProduct)
      const product = Number.isSafeInteger(productId) && productId > 0 ? await readProduct(productId) : null
      const media = await readMedia(mediaIds)
      planVisualOnlyV01Decision({ callback, job, product, media })
    },
    runAtomic: async (operation) => {
      resolveVisualOnlyV01TableAuthority(runtime)
      return runPayloadTransaction(payload, operation)
    },
    async claimJob(req, jobId) {
      const sequence = createVisualMutationLockSequence(VISUAL_ONLY_APPROVAL_LOCK_ORDER)
      sequence.acquire('image-generation-jobs')
      lockSequences.set(req, sequence)
      const { db, jobTable } = await prepareVisualOnlyV01AtomicRuntime(runtime, req)
      const result = await db.execute(sql`
        UPDATE ${jobTable}
        SET ${jobTable.status} = 'review',
            ${jobTable.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${jobTable.id} = ${Number(jobId)}
          AND ${jobTable.status} IN ('preview', 'review')
        RETURNING ${jobTable.id}
      `)
      return rowsFrom(result).length === 1
    },
    async lockProduct(req, productId) {
      const sequence = lockSequences.get(req)
      if (!sequence) throw new Error('VISUAL_MUTATION_LOCK_ORDER_VIOLATION')
      sequence.acquire('products')
      const { db, productTable } = await prepareVisualOnlyV01AtomicRuntime(runtime, req)
      const result = await db.execute(sql`
        SELECT ${productTable.id}
        FROM ${productTable}
        WHERE ${productTable.id} = ${productId}
        FOR UPDATE
      `)
      return rowsFrom(result).length === 1
    },
    readJob(req, jobId) {
      return readJob(jobId, req)
    },
    readProduct(req, productId) {
      return readProduct(productId, req)
    },
    async readMedia(req, mediaIds) {
      return readMedia(mediaIds, req)
    },
    async updateProduct(req, productId, data) {
      req.context = {
        ...(req.context ?? {}),
        isDispatchUpdate: true,
        isVisualOnlyApproval: true,
        isVisualStatusUpdate: true,
      }
      await runtime.update({
        collection: 'products',
        id: productId,
        data,
        overrideAccess: true,
        req,
      })
    },
    async updateJob(req, jobId, data) {
      req.context = { ...(req.context ?? {}), isVisualOnlyApproval: true }
      await runtime.update({
        collection: 'image-generation-jobs',
        id: Number(jobId),
        data,
        overrideAccess: true,
        req,
      })
    },
  }
}
