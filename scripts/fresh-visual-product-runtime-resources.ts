import type {
  FreshVisualDiscoveryGateway,
  FreshVisualDiscoveryPage,
} from '../src/lib/freshVisualProductDiscovery'
import type { VisualPilotRuntimePostgresPool } from './visual-pilot-target-runtime-resources'

export type FreshVisualDiscoveryRuntimePayload = {
  find(args: Record<string, unknown>): Promise<Record<string, unknown>>
}

const QUEUE_RECEIPTS_BY_PRODUCT_SQL = `
WITH target_receipts AS (
  SELECT pj.id, pj.task_slug, pj.input, pj.processing, pj.completed_at, pj.has_error, pj.wait_until
  FROM payload_jobs pj
  INNER JOIN image_generation_jobs igj
    ON igj.id::text = pj.input ->> 'jobId'
  WHERE pj.task_slug = 'image-gen'
    AND igj.product_id = $1
), page_receipts AS (
  SELECT id, task_slug, input, processing, completed_at, has_error, wait_until
  FROM target_receipts
  ORDER BY id ASC
  LIMIT $2 OFFSET $3
)
SELECT
  (SELECT count(*)::text FROM target_receipts) AS total_docs,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'taskSlug', task_slug,
        'input', jsonb_build_object('jobId', input ->> 'jobId'),
        'processing', processing,
        'completedAt', completed_at,
        'hasError', has_error,
        'waitUntil', wait_until
      ) ORDER BY id ASC
    ),
    '[]'::jsonb
  ) AS docs
FROM page_receipts
`.trim()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nonnegativeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return null
  return value
}

function nonnegativeIntegerText(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function normalizeFreshVisualDiscoveryPage(
  value: Record<string, unknown>,
  expectedPage: number,
  expectedLimit: number,
): FreshVisualDiscoveryPage {
  const totalDocs = nonnegativeInteger(value.totalDocs)
  const totalPages = nonnegativeInteger(value.totalPages)
  if (
    !Array.isArray(value.docs)
    || totalDocs === null
    || value.page !== expectedPage
    || totalPages === null
    || typeof value.hasNextPage !== 'boolean'
    || value.limit !== expectedLimit
  ) throw new Error('payload_page_malformed')
  return {
    docs: value.docs,
    totalDocs,
    page: expectedPage,
    totalPages,
    hasNextPage: value.hasNextPage,
    limit: expectedLimit,
  }
}

function queueReceiptPage(
  value: unknown,
  page: number,
  limit: number,
): FreshVisualDiscoveryPage {
  if (!isRecord(value) || !Array.isArray(value.rows) || value.rows.length !== 1 || !isRecord(value.rows[0])) {
    throw new Error('queue_receipt_page_malformed')
  }
  const totalDocs = nonnegativeIntegerText(value.rows[0].total_docs)
  const docs = value.rows[0].docs
  if (totalDocs === null || !Array.isArray(docs) || docs.some((entry) => !isRecord(entry))) {
    throw new Error('queue_receipt_page_malformed')
  }
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  return { docs, totalDocs, page, totalPages, hasNextPage: page < totalPages, limit }
}

export function createFreshVisualDiscoveryRuntimeGateway(
  payload: FreshVisualDiscoveryRuntimePayload,
  pool: VisualPilotRuntimePostgresPool,
): FreshVisualDiscoveryGateway {
  return {
    async readProductPage(page, limit) {
      return normalizeFreshVisualDiscoveryPage(await payload.find({
        collection: 'products',
        where: {
          and: [
            { id: { not_equals: 349 } },
            { status: { equals: 'draft' } },
            { 'workflow.workflowStatus': { in: ['draft', 'visual_pending'] } },
            { 'workflow.visualStatus': { equals: 'pending' } },
            { 'workflow.confirmationStatus': { equals: 'pending' } },
            { 'workflow.publishStatus': { equals: 'not_requested' } },
            { 'workflow.sellable': { equals: false } },
            { 'channels.publishWebsite': { equals: false } },
            { 'channels.publishInstagram': { equals: false } },
            { 'channels.publishFacebook': { equals: false } },
            { 'channels.publishX': { equals: false } },
            { 'channels.publishShopier': { equals: false } },
          ],
        },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
    },
    async readMediaPage(productId, page, limit) {
      return normalizeFreshVisualDiscoveryPage(await payload.find({
        collection: 'media',
        where: { product: { equals: productId } },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
    },
    async readGeneratedGalleryOwnerPage(mediaIds, page, limit) {
      if (mediaIds.length < 1 || mediaIds.length > 508) throw new Error('generated_gallery_owner_boundary_invalid')
      return normalizeFreshVisualDiscoveryPage(await payload.find({
        collection: 'products',
        where: { 'generativeGallery.image': { in: [...mediaIds] } },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
    },
    async readImageJobPage(productId, page, limit) {
      return normalizeFreshVisualDiscoveryPage(await payload.find({
        collection: 'image-generation-jobs',
        where: { product: { equals: productId } },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
    },
    async readQueueReceiptPage(productId, page, limit) {
      if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(limit) || limit <= 0) {
        throw new Error('queue_receipt_boundary_invalid')
      }
      const offset = (page - 1) * limit
      if (!Number.isSafeInteger(offset)) throw new Error('queue_receipt_boundary_invalid')
      return queueReceiptPage(
        await pool.query(QUEUE_RECEIPTS_BY_PRODUCT_SQL, [productId, limit, offset]),
        page,
        limit,
      )
    },
    async readBotEventPage(productId, page, limit) {
      return normalizeFreshVisualDiscoveryPage(await payload.find({
        collection: 'bot-events',
        where: { product: { equals: productId } },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
    },
    async readStoryJobPage(productId, page, limit) {
      return normalizeFreshVisualDiscoveryPage(await payload.find({
        collection: 'story-jobs',
        where: { product: { equals: productId } },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
    },
  }
}
