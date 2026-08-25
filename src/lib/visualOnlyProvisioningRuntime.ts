import { sql } from 'drizzle-orm'
import type { Payload, PayloadRequest } from 'payload'

import { runPayloadTransaction } from './payloadTransaction'
import {
  prepareVisualOnlyV01AtomicRuntime,
  resolveVisualOnlyV01TableAuthority,
} from './visualOnlyApprovalRuntime'
import type { VisualOnlyProvisioningAdapter } from './visualOnlyProvisioning'

type RecordValue = Record<string, unknown>
type RuntimePayload = {
  db: unknown
  jobs: {
    queue(args: RecordValue): Promise<unknown>
  }
  find(args: RecordValue): Promise<RecordValue>
  findByID(args: RecordValue): Promise<unknown>
  create(args: RecordValue): Promise<unknown>
  update(args: RecordValue): Promise<unknown>
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
  return {
    runAtomic(operation) {
      resolveVisualOnlyV01TableAuthority(runtime)
      return runPayloadTransaction(payload, (req) => {
        req.context = { ...(req.context ?? {}), isVisualOnlyProvisioning: true }
        return operation(req)
      })
    },
    async lockProduct(req, productId) {
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
    readQueueReceipt(req, receiptId) {
      return runtime.findByID({
        collection: 'payload-jobs',
        id: Number(receiptId),
        depth: 0,
        overrideAccess: true,
        req,
      })
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
