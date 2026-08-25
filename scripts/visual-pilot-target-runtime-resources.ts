import {
  Client as InstalledPostgresClient,
  Connection as InstalledPostgresConnection,
  TypeOverrides as InstalledPostgresTypeOverrides,
} from 'pg'

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
  _ending: boolean
  end: () => Promise<void> | void
  release: () => void
  unref: () => void
}

type RuntimePostgresClientOwnership = {
  constructor: typeof InstalledPostgresClient
  prototype: typeof InstalledPostgresClient.prototype
  constructedClients: WeakSet<object>
}

type RuntimePostgresIdleItem = {
  client: RuntimePostgresClient
  idleListener: (...args: unknown[]) => unknown
  timeoutId: unknown
}

export type VisualPilotRuntimePostgresPool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows?: unknown }>
  end: () => Promise<void>
  /** Exact Client constructor pinned by the installed pg Pool. */
  Client?: unknown
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

const runtimePostgresClientConstructionProvenance = new WeakMap<
  typeof InstalledPostgresClient,
  WeakSet<object>
>()

export function createVisualPilotRuntimePostgresClientConstructor(): typeof InstalledPostgresClient {
  const constructedClients = new WeakSet<object>()
  let RuntimePostgresClient: typeof InstalledPostgresClient
  RuntimePostgresClient = new Proxy(InstalledPostgresClient, {
    construct(target, args, newTarget) {
      const client = Reflect.construct(target, args, newTarget) as object
      if (newTarget === RuntimePostgresClient) constructedClients.add(client)
      return client
    },
  })
  runtimePostgresClientConstructionProvenance.set(RuntimePostgresClient, constructedClients)
  return RuntimePostgresClient
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

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === sortedExpected[index])
}

function optionalDateIsValid(value: unknown): boolean {
  return value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)))
}

function exactQueueReceiptDocument(
  value: unknown,
  requestedJobIds: ReadonlySet<string>,
): value is Record<string, unknown> {
  if (!isRecord(value) || !hasExactKeys(value, [
    'completedAt',
    'hasError',
    'id',
    'input',
    'processing',
    'taskSlug',
    'waitUntil',
  ])) return false
  if (!exactPositiveInteger(value.id) || value.taskSlug !== 'image-gen') return false
  if (typeof value.processing !== 'boolean' || typeof value.hasError !== 'boolean') return false
  if (!optionalDateIsValid(value.completedAt) || !optionalDateIsValid(value.waitUntil)) return false
  if (!isRecord(value.input) || !hasExactKeys(value.input, ['jobId'])) return false
  return typeof value.input.jobId === 'string'
    && /^\d+$/.test(value.input.jobId)
    && requestedJobIds.has(value.input.jobId)
}

export function createVisualPilotQueueReceiptReader(
  pool: VisualPilotRuntimePostgresPool,
): VisualPilotQueueReceiptReader {
  let activePagination: {
    requestKey: string
    limit: number
    totalDocs: number
    totalPages: number
    nextPage: number
    lastId: number | null
    seenIds: Set<number>
  } | null = null

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

      const requestKey = normalizedJobIds.join(',')
      if (page !== 1 && (
        !activePagination
        || activePagination.requestKey !== requestKey
        || activePagination.limit !== limit
        || activePagination.nextPage !== page
      )) {
        throw new Error('queue_receipt_page_sequence_invalid')
      }

      const offset = (page - 1) * limit
      if (!Number.isSafeInteger(offset)) throw new Error('queue_receipt_page_boundary_invalid')
      let result: { rows?: unknown }
      try {
        result = await pool.query(QUEUE_RECEIPT_PAGE_SQL, [normalizedJobIds, limit, offset])
      } catch {
        throw new Error('queue_receipt_query_failed')
      }
      if (!isRecord(result) || !Array.isArray(result.rows) || result.rows.length !== 1 || !isRecord(result.rows[0])) {
        throw new Error('queue_receipt_page_malformed')
      }
      const totalDocs = exactNonnegativeIntegerText(result.rows[0].total_docs)
      const docs = result.rows[0].docs
      const requestedJobIds = new Set(normalizedJobIds)
      if (totalDocs === null || !Array.isArray(docs) || !docs.every((doc) => exactQueueReceiptDocument(doc, requestedJobIds))) {
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

      const previous = page === 1 ? null : activePagination
      if (previous && (previous.totalDocs !== totalDocs || previous.totalPages !== totalPages)) {
        throw new Error('queue_receipt_page_inconsistent')
      }
      const seenIds = previous ? new Set(previous.seenIds) : new Set<number>()
      let lastId = previous?.lastId ?? null
      for (const doc of docs) {
        const id = doc.id as number
        if (seenIds.has(id) || (lastId !== null && id <= lastId)) {
          throw new Error('queue_receipt_page_inconsistent')
        }
        seenIds.add(id)
        lastId = id
      }
      if (seenIds.size > totalDocs) throw new Error('queue_receipt_page_inconsistent')
      activePagination = {
        requestKey,
        limit,
        totalDocs,
        totalPages,
        nextPage: page < totalPages ? page + 1 : 0,
        lastId,
        seenIds,
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

function ownDataProperty(value: object, property: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, property)
  return descriptor && 'value' in descriptor ? descriptor.value : undefined
}

function runtimePostgresClientOwnership(
  pool: VisualPilotRuntimePostgresPool,
): RuntimePostgresClientOwnership | null {
  try {
    const poolClient = ownDataProperty(pool, 'Client')
    if (typeof poolClient !== 'function') return null
    const constructedClients = runtimePostgresClientConstructionProvenance.get(
      poolClient as typeof InstalledPostgresClient,
    )
    if (!constructedClients) return null
    const prototype = ownDataProperty(poolClient, 'prototype')
    if (prototype !== InstalledPostgresClient.prototype) return null
    if (ownDataProperty(prototype, 'constructor') !== InstalledPostgresClient) return null
    if (ownDataProperty(prototype, 'end') !== InstalledPostgresClient.prototype.end) return null
    if (ownDataProperty(prototype, 'unref') !== InstalledPostgresClient.prototype.unref) return null
    return {
      constructor: poolClient as typeof InstalledPostgresClient,
      prototype,
      constructedClients,
    }
  } catch {
    return null
  }
}

function isRuntimePostgresClient(
  value: unknown,
  ownership: RuntimePostgresClientOwnership,
): value is RuntimePostgresClient {
  try {
    if (!isRecord(value) || !ownership.constructedClients.has(value)) return false
    if (Object.getPrototypeOf(value) !== ownership.prototype) return false
    if (!Function.prototype[Symbol.hasInstance].call(ownership.constructor, value)) return false
    if (Object.hasOwn(value, 'end') || Object.hasOwn(value, 'unref')) return false
    if (value.end !== InstalledPostgresClient.prototype.end || value.unref !== InstalledPostgresClient.prototype.unref) {
      return false
    }

    const password = Object.getOwnPropertyDescriptor(value, 'password')
    const connection = ownDataProperty(value, 'connection')
    const connectionParameters = ownDataProperty(value, 'connectionParameters')
    const typeOverrides = ownDataProperty(value, '_types')
    return typeof ownDataProperty(value, '_ending') === 'boolean'
      && typeof ownDataProperty(value, '_Promise') === 'function'
      && Array.isArray(ownDataProperty(value, 'queryQueue'))
      && typeof ownDataProperty(value, 'release') === 'function'
      && Boolean(password)
      && password?.enumerable === false
      && password.configurable === true
      && password.writable === true
      && isRecord(connectionParameters)
      && isRecord(connection)
      && Object.getPrototypeOf(connection) === InstalledPostgresConnection.prototype
      && Function.prototype[Symbol.hasInstance].call(InstalledPostgresConnection, connection)
      && Object.getPrototypeOf(typeOverrides) === InstalledPostgresTypeOverrides.prototype
      && Function.prototype[Symbol.hasInstance].call(InstalledPostgresTypeOverrides, typeOverrides)
  } catch {
    return false
  }
}

function isRuntimePostgresIdleItem(
  value: unknown,
  ownership: RuntimePostgresClientOwnership,
): value is RuntimePostgresIdleItem {
  return isRecord(value)
    && hasExactKeys(value, ['client', 'idleListener', 'timeoutId'])
    && isRuntimePostgresClient(value.client, ownership)
    && typeof value.idleListener === 'function'
}

function releaseRuntimeOwnedCheckedOutClients(
  pool: VisualPilotRuntimePostgresPool,
  ownership: RuntimePostgresClientOwnership | null,
): VisualPilotRuntimeTeardownCode | null {
  let checkedOutClients: RuntimePostgresClient[]
  try {
    if (!ownership || !Array.isArray(pool._clients) || !Array.isArray(pool._idle)) {
      return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
    }
    if (
      !pool._clients.every((client) => isRuntimePostgresClient(client, ownership))
      || !pool._idle.every((item) => isRuntimePostgresIdleItem(item, ownership))
    ) {
      return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
    }
    const clients = pool._clients as RuntimePostgresClient[]
    const idleItems = pool._idle as RuntimePostgresIdleItem[]
    const clientSet = new Set(clients)
    const idleClients = new Set(idleItems.map((entry) => entry.client))
    if (
      clientSet.size !== clients.length
      || idleClients.size !== idleItems.length
      || [...idleClients].some((client) => !clientSet.has(client))
    ) {
      return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
    }
    checkedOutClients = clients.filter((client) => !idleClients.has(client))
  } catch {
    return 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
  }
  try {
    for (const client of checkedOutClients) {
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

function runtimeOwnedTerminalClients(
  pool: VisualPilotRuntimePostgresPool,
  ownership: RuntimePostgresClientOwnership | null,
): RuntimePostgresClient[] {
  if (!ownership || !Array.isArray(pool._clients)) return []
  return [...new Set(pool._clients.filter((client) => isRuntimePostgresClient(client, ownership)))]
}

async function terminalizeRuntimeOwnedClients(
  clients: readonly RuntimePostgresClient[],
  timeoutMs: number,
): Promise<void> {
  const clientsToEnd = clients.filter((client) => !client._ending)
  if (clientsToEnd.length > 0) {
    await boundedStep(
      async () => {
        await Promise.all(clientsToEnd.map(async (client) => client.end()))
      },
      timeoutMs,
    )
  }
  for (const client of clients) {
    try {
      client.unref()
    } catch {
      // The stable teardown result is selected by the owning cleanup step.
    }
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
      const ownership = runtimePostgresClientOwnership(params.pool)
      const terminalClients = runtimeOwnedTerminalClients(params.pool, ownership)
      const payloadState = await boundedStep(params.payloadDestroy, timeoutMs)
      const clientFailure = releaseRuntimeOwnedCheckedOutClients(params.pool, ownership)
      const incompatiblePoolShape = clientFailure === 'RUNTIME_POSTGRES_CLIENT_CLEANUP_UNSUPPORTED'
      // Pinned pg-pool end() dereferences every _idle entry as an IdleItem.
      // Never invoke that path after the exact private-shape proof fails.
      const poolState = incompatiblePoolShape
        ? 'skipped' as const
        : await boundedStep(() => params.pool.end(), timeoutMs)
      if (incompatiblePoolShape || clientFailure || poolState !== 'ok') {
        await terminalizeRuntimeOwnedClients(terminalClients, timeoutMs)
      }

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
