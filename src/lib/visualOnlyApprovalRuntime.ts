import { sql } from 'drizzle-orm'
import type { Payload, PayloadRequest } from 'payload'

import { runPayloadTransaction } from './payloadTransaction'
import type { VisualOnlyV01AtomicAdapter } from './visualOnlyApprovalV01'

type AtomicDatabase = { execute(statement: unknown): Promise<unknown> }
type RuntimeTable = Record<string, unknown>
type RuntimePayload = {
  db: {
    sessions?: Record<string, { db?: AtomicDatabase }>
    tables?: Record<string, RuntimeTable | undefined>
  }
  findByID(args: Record<string, unknown>): Promise<unknown>
  find(args: Record<string, unknown>): Promise<Record<string, unknown>>
  update(args: Record<string, unknown>): Promise<unknown>
}

function rowsFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return []
  const rows = (value as { rows?: unknown }).rows
  return Array.isArray(rows) ? rows : []
}

async function activeTransaction(payload: RuntimePayload, req: PayloadRequest): Promise<{
  db: AtomicDatabase
  jobTable: RuntimeTable
  productTable: RuntimeTable
}> {
  const transactionID = await req.transactionID
  const db = transactionID ? payload.db.sessions?.[String(transactionID)]?.db : undefined
  const jobTable = payload.db.tables?.['image-generation-jobs'] ?? payload.db.tables?.imageGenerationJobs
  const productTable = payload.db.tables?.products
  if (
    !db
    || !jobTable?.id || !jobTable.status || !jobTable.updatedAt
    || !productTable?.id
  ) throw new Error('VISUAL_ONLY_ATOMIC_RUNTIME_UNAVAILABLE')
  return { db, jobTable, productTable }
}

export function createVisualOnlyV01PayloadAdapter(
  payload: Payload,
): VisualOnlyV01AtomicAdapter<PayloadRequest> {
  const runtime = payload as unknown as RuntimePayload
  return {
    runAtomic: (operation) => runPayloadTransaction(payload, operation),
    async claimJob(req, jobId) {
      const { db, jobTable } = await activeTransaction(runtime, req)
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
      const { db, productTable } = await activeTransaction(runtime, req)
      const result = await db.execute(sql`
        SELECT ${productTable.id}
        FROM ${productTable}
        WHERE ${productTable.id} = ${productId}
        FOR UPDATE
      `)
      return rowsFrom(result).length === 1
    },
    readJob(req, jobId) {
      return runtime.findByID({
        collection: 'image-generation-jobs',
        id: Number(jobId),
        depth: 0,
        overrideAccess: true,
        req,
      })
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
    async readMedia(req, mediaIds) {
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
        req,
      })
      return Array.isArray(result.docs) ? result.docs : []
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
