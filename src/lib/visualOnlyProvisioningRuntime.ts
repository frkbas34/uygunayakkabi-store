import { sql } from 'drizzle-orm'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import { runPayloadTransaction } from './payloadTransaction'
import {
  prepareVisualOnlyV01AtomicRuntime,
  resolveVisualOnlyV01TableAuthority,
  VISUAL_ONLY_APPROVAL_LOCK_ORDER,
} from './visualOnlyApprovalRuntime'
import { createVisualMutationLockSequence } from './visualMutationLockOrder'
import type {
  VisualOnlyProvisioningAdapter,
  VisualOnlyQueueReceiptCensusIdentity,
  VisualOnlyQueueReceiptCensusPage,
} from './visualOnlyProvisioning'

type RecordValue = Record<string, unknown>
type AtomicDatabase = { execute(statement: unknown): Promise<unknown> }
type RuntimeTable = Record<string, unknown>
type RuntimePayload = {
  db: {
    drizzle?: AtomicDatabase
    sessions?: Record<string, { db?: AtomicDatabase }>
    tables?: Record<string, RuntimeTable | undefined>
    tableNameMap?: Map<string, string>
  }
  collections?: Record<string, { config?: { slug?: unknown; dbName?: unknown } } | undefined>
  jobs: {
    queue(args: RecordValue): Promise<unknown>
  }
  find(args: RecordValue): Promise<RecordValue>
  findByID(args: RecordValue): Promise<unknown>
  create(args: RecordValue): Promise<unknown>
  update(args: RecordValue): Promise<unknown>
}

const QUEUE_RECEIPT_COLLECTION_SLUG = 'payload-jobs'
const QUEUE_RECEIPT_DEFAULT_TABLE_NAME = 'payload_jobs'
const QUEUE_RECEIPT_CENSUS_PAGE_LIMIT = 2
const QUEUE_RECEIPT_CENSUS_MAX_PAGES = 2
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const NONCE_PATTERN = /^[0-9a-f]{32}$/

function queueCensusUnavailable(): never {
  throw new Error('VISUAL_ONLY_PROVISIONING_QUEUE_CENSUS_UNAVAILABLE')
}

export function resolveVisualOnlyQueueReceiptTableAuthority(payload: unknown): RuntimeTable {
  const runtime = payload as RuntimePayload
  const collection = runtime.collections?.[QUEUE_RECEIPT_COLLECTION_SLUG]?.config
  const tableNameMap = runtime.db?.tableNameMap
  if (
    collection?.slug !== QUEUE_RECEIPT_COLLECTION_SLUG
    || collection.dbName !== undefined
    || !(tableNameMap instanceof Map)
  ) return queueCensusUnavailable()
  const physicalName = tableNameMap.get(QUEUE_RECEIPT_DEFAULT_TABLE_NAME)
  if (physicalName !== QUEUE_RECEIPT_DEFAULT_TABLE_NAME) return queueCensusUnavailable()
  const owners = [...tableNameMap.entries()].filter(([, mappedName]) => mappedName === physicalName)
  if (owners.length !== 1 || owners[0]?.[0] !== QUEUE_RECEIPT_DEFAULT_TABLE_NAME) {
    return queueCensusUnavailable()
  }
  const table = runtime.db.tables?.[physicalName]
  if (
    !table?.id
    || !table.taskSlug
    || !table.input
    || !table.processing
    || !table.completedAt
    || !table.hasError
    || !table.waitUntil
  ) return queueCensusUnavailable()
  return table
}

function exactPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function exactNonnegativeIntegerText(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function validCensusIdentity(identity: VisualOnlyQueueReceiptCensusIdentity): boolean {
  return identity.taskSlug === 'image-gen'
    && Number.isSafeInteger(identity.productId) && identity.productId > 0
    && /^[1-9]\d*$/.test(identity.imageJobId)
    && identity.provisioningVersion === 'visual-only-provisioning/v1'
    && SHA256_PATTERN.test(identity.deliveryDigest)
    && SHA256_PATTERN.test(identity.manifestDigest)
    && NONCE_PATTERN.test(identity.manifestNonce)
    && /^SN\d{4}$/.test(identity.stockNumber)
}

function normalizeQueueReceiptCensusPage(
  value: unknown,
  page: number,
  limit: number,
): VisualOnlyQueueReceiptCensusPage {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { rows?: unknown }).rows)) {
    return queueCensusUnavailable()
  }
  const rows = (value as { rows: unknown[] }).rows
  const row = rows.length === 1 && rows[0] && typeof rows[0] === 'object' && !Array.isArray(rows[0])
    ? rows[0] as RecordValue
    : null
  const totalDocs = row ? exactNonnegativeIntegerText(row.total_docs) : null
  if (totalDocs === null || !Array.isArray(row?.docs)) return queueCensusUnavailable()
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  return {
    docs: row.docs,
    totalDocs,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    limit,
  }
}

async function receiptCensusDatabase(runtime: RuntimePayload, req: PayloadRequest): Promise<AtomicDatabase> {
  const transactionID = await req.transactionID
  const database = transactionID
    ? runtime.db.sessions?.[String(transactionID)]?.db
    : runtime.db.drizzle
  if (!database || typeof database.execute !== 'function') return queueCensusUnavailable()
  return database
}

async function readQueueReceiptCensusPage(
  runtime: RuntimePayload,
  req: PayloadRequest,
  identity: VisualOnlyQueueReceiptCensusIdentity,
  page: number,
  limit: number,
): Promise<VisualOnlyQueueReceiptCensusPage> {
  if (
    !validCensusIdentity(identity)
    || !exactPositiveInteger(page) || page > QUEUE_RECEIPT_CENSUS_MAX_PAGES
    || limit !== QUEUE_RECEIPT_CENSUS_PAGE_LIMIT
  ) {
    return queueCensusUnavailable()
  }
  const offset = (page - 1) * limit
  if (!Number.isSafeInteger(offset)) return queueCensusUnavailable()
  const table = resolveVisualOnlyQueueReceiptTableAuthority(runtime)
  const database = await receiptCensusDatabase(runtime, req)
  let result: unknown
  try {
    result = await database.execute(sql`
      WITH target_receipts AS (
        SELECT
          ${table.id} AS id,
          ${table.taskSlug} AS task_slug,
          ${table.input} AS input,
          ${table.processing} AS processing,
          ${table.completedAt} AS completed_at,
          ${table.hasError} AS has_error,
          ${table.waitUntil} AS wait_until
        FROM ${table}
        WHERE ${table.taskSlug} = ${identity.taskSlug}
          AND ${table.input} ->> 'jobId' = ${identity.imageJobId}
      ), page_receipts AS (
        SELECT id, task_slug, input, processing, completed_at, has_error, wait_until
        FROM target_receipts
        ORDER BY id ASC
        LIMIT ${limit} OFFSET ${offset}
      )
      SELECT
        (SELECT count(*)::text FROM target_receipts) AS total_docs,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', id,
              'taskSlug', task_slug,
              'input', input,
              'processing', processing,
              'completedAt', completed_at,
              'hasError', has_error,
              'waitUntil', wait_until
            ) ORDER BY id ASC
          ),
          '[]'::jsonb
        ) AS docs
      FROM page_receipts
    `)
  } catch {
    return queueCensusUnavailable()
  }
  return normalizeQueueReceiptCensusPage(result, page, limit)
}

function rowsFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  const rows = (value as { rows?: unknown }).rows
  return Array.isArray(rows) ? rows : []
}

async function readAllProductJobs(
  runtime: RuntimePayload,
  req: PayloadRequest,
  productId: number,
): Promise<unknown[]> {
  const docs: unknown[] = []
  let page = 1
  for (;;) {
    const result = await runtime.find({
      collection: 'image-generation-jobs',
      where: { product: { equals: productId } },
      sort: 'id',
      limit: 100,
      page,
      depth: 0,
      overrideAccess: true,
      pagination: true,
      req,
    })
    if (!Array.isArray(result.docs)) throw new Error('VISUAL_ONLY_PROVISIONING_JOB_CENSUS_UNAVAILABLE')
    docs.push(...result.docs)
    if (result.hasNextPage === false) return docs
    if (result.hasNextPage !== true) throw new Error('VISUAL_ONLY_PROVISIONING_JOB_CENSUS_UNAVAILABLE')
    page += 1
  }
}

export function createVisualOnlyV01PayloadProvisioningAdapter(
  payload: Payload,
): VisualOnlyProvisioningAdapter<PayloadRequest> {
  const runtime = payload as unknown as RuntimePayload
  const lockSequences = new WeakMap<PayloadRequest, ReturnType<typeof createVisualMutationLockSequence>>()
  return {
    runAtomic(operation) {
      resolveVisualOnlyV01TableAuthority(runtime)
      return runPayloadTransaction(payload, (req) => {
        req.context = { ...(req.context ?? {}), isVisualOnlyProvisioning: true }
        return operation(req)
      })
    },
    createPostCommitRequest() {
      return createLocalReq({}, payload)
    },
    async requestHasTransaction(req) {
      return Boolean(await req.transactionID)
    },
    async lockGenerationHistory(req) {
      const sequence = createVisualMutationLockSequence(VISUAL_ONLY_APPROVAL_LOCK_ORDER)
      sequence.acquire('image-generation-jobs')
      lockSequences.set(req, sequence)
      const { db, jobTable } = await prepareVisualOnlyV01AtomicRuntime(runtime, req)
      await db.execute(sql`LOCK TABLE ${jobTable} IN SHARE ROW EXCLUSIVE MODE`)
      return true
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
    readProduct(req, productId) {
      return runtime.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        overrideAccess: true,
        req,
      })
    },
    readProductJobs(req, productId) {
      return readAllProductJobs(runtime, req, productId)
    },
    createImageJob(req, data) {
      return runtime.create({
        collection: 'image-generation-jobs',
        data,
        depth: 0,
        overrideAccess: true,
        req,
      })
    },
    async updateImageJob(req, jobId, data) {
      await runtime.update({
        collection: 'image-generation-jobs',
        id: Number(jobId),
        data,
        depth: 0,
        overrideAccess: true,
        req,
      })
    },
    readImageJob(req, jobId) {
      return runtime.findByID({
        collection: 'image-generation-jobs',
        id: Number(jobId),
        depth: 0,
        overrideAccess: true,
        req,
      })
    },
    queueImageJob(req, input) {
      return runtime.jobs.queue({
        task: 'image-gen',
        input,
        overrideAccess: true,
        req,
      })
    },
    readQueueReceiptCensusPage(req, identity, page, limit) {
      return readQueueReceiptCensusPage(runtime, req, identity, page, limit)
    },
    async updateProduct(req, productId, data) {
      req.context = {
        ...(req.context ?? {}),
        isDispatchUpdate: true,
        isVisualStatusUpdate: true,
        isVisualOnlyProvisioning: true,
      }
      await runtime.update({
        collection: 'products',
        id: productId,
        data,
        depth: 0,
        overrideAccess: true,
        req,
      })
    },
  }
}
