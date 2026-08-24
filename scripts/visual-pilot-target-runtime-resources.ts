import type { VisualPilotPage } from '../src/lib/visualPilotTargetVerifier'

export const VISUAL_PILOT_RUNTIME_TEARDOWN_TIMEOUT_MS = 5_000

export type VisualPilotRuntimeTeardownCode =
  | 'RUNTIME_PAYLOAD_TEARDOWN_FAILED'
  | 'RUNTIME_PAYLOAD_TEARDOWN_TIMEOUT'
  | 'RUNTIME_POSTGRES_CLIENT_CLEANUP_FAILED'
  | 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
  | 'RUNTIME_POSTGRES_POOL_CLOSE_FAILED'
  | 'RUNTIME_POSTGRES_POOL_CLOSE_TIMEOUT'

export type VisualPilotRuntimeTeardownResult =
  | { ok: true }
  | { ok: false; code: VisualPilotRuntimeTeardownCode }

type RuntimePostgresClient = {
  release: () => void
}

type RuntimePostgresIdleClient = {
  client?: unknown
}

export type VisualPilotRuntimePostgresPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows?: unknown }>
  end: () => Promise<void>
  /** Runtime-owned pg Pool internals pinned by the installed adapter. */
  _clients?: unknown
  /** Runtime-owned pg Pool internals pinned by the installed adapter. */
  _idle?: unknown
}

export type VisualPilotQueueReceiptReader = {
  readPage: (
    imageJobIds: readonly (string | number)[],
    page: number,
    limit: number,
  ) => Promise<VisualPilotPage>
}

const QUEUE_RECEIPT_PAGE_SQL = `
WITH target_receipts AS (
  SELECT
    id,
    task_slug,
    input,
    processing,
    completed_at,
    has_error,
    wait_until
  FROM payload_jobs
  WHERE task_slug = 'image-gen'
    AND input ->> 'jobId' = ANY($1::text[])
), page_receipts AS (
  SELECT
    id,
    task_slug,
    input,
    processing,
    completed_at,
    has_error,
    wait_until
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
      )
      ORDER BY id ASC
    ),
    '[]'::jsonb
  ) AS docs
FROM page_receipts
`.trim()

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function exactNonnegativeIntegerText(value: unknown): number | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function createVisualPilotQueueReceiptReader(
  pool: VisualPilotRuntimePostgresPool,
): VisualPilotQueueReceiptReader {
  return {
    async readPage(imageJobIds, page, limit) {
      if (!exactPositiveInteger(page) || !exactPositiveInteger(limit)) {
        throw new Error('queue_receipt_page_boundary_invalid')
      }
      const rawJobIds = imageJobIds.map((id) => String(id))
      if (rawJobIds.some((id) => !/^\d+$/.test(id))) {
        throw new Error('queue_receipt_job_ids_invalid')
      }
      const normalizedJobIds = [...new Set(rawJobIds)]
      if (normalizedJobIds.length === 0) {
        return { docs: [], totalDocs: 0, page, totalPages: 0, hasNextPage: false, limit }
      }

      const offset = (page - 1) * limit
      if (!Number.isSafeInteger(offset)) throw new Error('queue_receipt_page_boundary_invalid')
      const result = await pool.query(QUEUE_RECEIPT_PAGE_SQL, [normalizedJobIds, limit, offset])
      if (!Array.isArray(result.rows) || result.rows.length !== 1 || !isRecord(result.rows[0])) {
        throw new Error('queue_receipt_page_malformed')
      }
      const totalDocs = exactNonnegativeIntegerText(result.rows[0].total_docs)
      const docs = result.rows[0].docs
      if (totalDocs === null || !Array.isArray(docs) || !docs.every(isRecord)) {
        throw new Error('queue_receipt_page_malformed')
      }
      const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
      const expectedDocCount = totalDocs === 0
        ? 0
        : Math.min(limit, Math.max(0, totalDocs - offset))
      if (
        page > Math.max(1, totalPages)
        || docs.length !== expectedDocCount
      ) {
        throw new Error('queue_receipt_page_inconsistent')
      }
      return {
        docs,
        totalDocs,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        limit,
      }
    },
  }
}

function isRuntimePostgresClient(value: unknown): value is RuntimePostgresClient {
  return isRecord(value) && typeof value.release === 'function'
}

function releaseRuntimeOwnedCheckedOutClients(pool: VisualPilotRuntimePostgresPool): VisualPilotRuntimeTeardownCode | null {
  if (!Array.isArray(pool._clients) || !Array.isArray(pool._idle)) {
    return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
  }
  const idleClients = new Set(
    pool._idle
      .filter(isRecord)
      .map((entry: RuntimePostgresIdleClient) => entry.client),
  )
  try {
    for (const client of pool._clients) {
      if (idleClients.has(client)) continue
      if (!isRuntimePostgresClient(client)) return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
      client.release()
    }
    return null
  } catch {
    return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_FAILED'
  }
}

async function boundedStep(
  step: () => Promise<void>,
  timeoutMs: number,
): Promise<'ok' | 'failed' | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve().then(step).then(() => 'ok' as const, () => 'failed' as const),
      new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function destroyVisualPilotPayloadWithinBoundary(params: {
  payloadDestroy: () => Promise<void>
  timeoutMs?: number
}): Promise<VisualPilotRuntimeTeardownResult> {
  const timeoutMs = params.timeoutMs ?? VISUAL_PILOT_RUNTIME_TEARDOWN_TIMEOUT_MS
  if (!exactPositiveInteger(timeoutMs)) throw new Error('runtime_teardown_timeout_invalid')
  const state = await boundedStep(params.payloadDestroy, timeoutMs)
  if (state === 'timeout') return { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_TIMEOUT' }
  if (state === 'failed') return { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_FAILED' }
  return { ok: true }
}

export function createVisualPilotRuntimeCleanup(params: {
  payloadDestroy: () => Promise<void>
  pool: VisualPilotRuntimePostgresPool
  timeoutMs?: number
}): () => Promise<VisualPilotRuntimeTeardownResult> {
  const timeoutMs = params.timeoutMs ?? VISUAL_PILOT_RUNTIME_TEARDOWN_TIMEOUT_MS
  if (!exactPositiveInteger(timeoutMs)) throw new Error('runtime_teardown_timeout_invalid')
  let cleanupPromise: Promise<VisualPilotRuntimeTeardownResult> | null = null

  return () => {
    cleanupPromise ??= (async () => {
      const payloadState = await boundedStep(params.payloadDestroy, timeoutMs)
      const clientFailure = releaseRuntimeOwnedCheckedOutClients(params.pool)
      const poolState = await boundedStep(() => params.pool.end(), timeoutMs)

      if (payloadState === 'timeout') return { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_TIMEOUT' }
      if (payloadState === 'failed') return { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_FAILED' }
      if (clientFailure) return { ok: false, code: clientFailure }
      if (poolState === 'timeout') return { ok: false, code: 'RUNTIME_POSTGRES_POOL_CLOSE_TIMEOUT' }
      if (poolState === 'failed') return { ok: false, code: 'RUNTIME_POSTGRES_POOL_CLOSE_FAILED' }
      return { ok: true }
    })()
    return cleanupPromise
  }
}
