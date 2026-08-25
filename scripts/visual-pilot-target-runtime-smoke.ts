/**
 * Target-specific Visual Lock pilot verifier.
 *
 * This command is read-only. It reads Payload records and performs bounded,
 * in-memory retrieval of the target product's original public Media. It does
 * not write Payload, queue work, call providers, send Telegram messages, or
 * retain downloaded bytes.
 */

import { pathToFileURL } from 'node:url'

import {
  executeVisualPilotTargetCommand,
  formatVisualPilotTargetSummary,
  parseVisualPilotTargetArgs,
  type VisualPilotPage,
  type VisualPilotTargetReadGateway,
  type VisualPilotTargetVerifierDependencies,
} from '../src/lib/visualPilotTargetVerifier'
import {
  createVisualPilotQueueReceiptReader,
  createVisualPilotRuntimePostgresClientConstructor,
  createVisualPilotRuntimeCleanup,
  destroyVisualPilotPayloadWithinBoundary,
  type VisualPilotQueueReceiptReader,
  type VisualPilotRuntimePostgresPool,
  type VisualPilotRuntimeTeardownCode,
  type VisualPilotRuntimeTeardownResult,
} from './visual-pilot-target-runtime-resources'

export type VisualPilotRuntimePayload = {
  find: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
  findByID: (args: Record<string, unknown>) => Promise<unknown>
  destroy: () => Promise<void>
  db?: unknown
}

type RuntimeResource = {
  dependencies: VisualPilotTargetVerifierDependencies
  destroy: () => Promise<void | VisualPilotRuntimeTeardownResult>
}

export type VisualPilotRuntimeIo = {
  stdout: (text: string) => void
  stderr: (text: string) => void
}

export type VisualPilotRuntimeOptions = {
  argv: readonly string[]
  initialize?: () => Promise<RuntimeResource>
  io?: VisualPilotRuntimeIo
}

export const VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE = 5

class VisualPilotRuntimeTeardownFailure extends Error {
  readonly code: VisualPilotRuntimeTeardownCode

  constructor(code: VisualPilotRuntimeTeardownCode) {
    super(code)
    this.code = code
  }
}

const defaultIo: VisualPilotRuntimeIo = {
  stdout: (text) => console.log(text),
  stderr: (text) => console.error(text),
}

export function visualPilotTargetUsage(): string {
  return [
    'Visual Pilot Target Verifier (read-only)',
    '',
    'Required:',
    '  --product=<payload-product-id-or-stock-number>',
    '  --confirm-read-only',
    '',
    'Example:',
    '  npm run smoke:visual-pilot-target:read -- --product=349 --confirm-read-only',
    '',
    'Reads Payload plus bounded public original Media only. No writes, queueing, provider/evaluator calls,',
    'Telegram actions, approvals, attachments, publishing, dispatch, Shopier actions, or schema push.',
  ].join('\n')
}

function normalizedPage(
  value: Record<string, unknown>,
  expectedPage: number,
  expectedLimit: number,
): VisualPilotPage {
  const docs = value.docs
  const totalDocs = value.totalDocs
  const page = value.page
  const totalPages = value.totalPages
  const hasNextPage = value.hasNextPage
  const limit = value.limit
  if (
    !Array.isArray(docs)
    || typeof totalDocs !== 'number' || !Number.isSafeInteger(totalDocs) || totalDocs < 0
    || typeof page !== 'number' || !Number.isSafeInteger(page) || page !== expectedPage
    || typeof totalPages !== 'number' || !Number.isSafeInteger(totalPages) || totalPages < 0
    || typeof hasNextPage !== 'boolean'
    || typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit !== expectedLimit
  ) throw new Error('payload_page_malformed')

  const normalizedTotalDocs = totalDocs
  const normalizedPage = page
  const normalizedTotalPages = totalPages
  const normalizedLimit = limit
  const acceptedEmptyTotalPages = normalizedTotalDocs === 0
    && (normalizedTotalPages === 0 || normalizedTotalPages === 1)
  const expectedTotalPages = normalizedTotalDocs === 0
    ? normalizedTotalPages
    : Math.ceil(normalizedTotalDocs / normalizedLimit)
  const expectedDocCount = normalizedTotalDocs === 0
    ? 0
    : Math.min(
        normalizedLimit,
        Math.max(0, normalizedTotalDocs - ((normalizedPage - 1) * normalizedLimit)),
      )
  const paginationIsConsistent = (acceptedEmptyTotalPages || normalizedTotalPages === expectedTotalPages)
    && (normalizedTotalDocs === 0 || normalizedPage <= normalizedTotalPages)
    && docs.length === expectedDocCount
    && hasNextPage === (normalizedPage < normalizedTotalPages)
  if (!paginationIsConsistent) throw new Error('payload_page_inconsistent')

  return {
    docs,
    totalDocs: normalizedTotalDocs,
    page: normalizedPage,
    totalPages: normalizedTotalPages,
    hasNextPage,
    limit: normalizedLimit,
  }
}

function virtualPage(docs: readonly Record<string, unknown>[], page: number, limit: number): VisualPilotPage {
  const totalDocs = docs.length
  const totalPages = totalDocs === 0 ? 0 : Math.ceil(totalDocs / limit)
  const start = (page - 1) * limit
  return {
    docs: docs.slice(start, start + limit),
    totalDocs,
    page,
    totalPages,
    hasNextPage: page < totalPages,
    limit,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function runtimePostgresPool(payload: VisualPilotRuntimePayload): VisualPilotRuntimePostgresPool {
  if (!isRecord(payload.db) || !isRecord(payload.db.pool)) {
    throw new Error('runtime_postgres_pool_unavailable')
  }
  const pool = payload.db.pool
  if (typeof pool.query !== 'function' || typeof pool.end !== 'function') {
    throw new Error('runtime_postgres_pool_unavailable')
  }
  return pool as VisualPilotRuntimePostgresPool
}

export function createVisualPilotMinimalRuntimeConfig(params: {
  collections: readonly unknown[]
  db: unknown
  editor: unknown
  secret: string
  sharp: unknown
}): Record<string, unknown> {
  return {
    collections: [...params.collections],
    jobs: { tasks: [] },
    db: params.db,
    editor: params.editor,
    secret: params.secret,
    sharp: params.sharp,
  }
}

export function createVisualPilotRuntimeGateway(
  payload: VisualPilotRuntimePayload,
  queueReceiptReader?: VisualPilotQueueReceiptReader,
): VisualPilotTargetReadGateway {
  return {
    // Telegram preview receipts and product-correlated external advertising
    // history do not have authoritative persisted readers today. The optional
    // gateway methods are intentionally omitted so the verifier fails closed.
    async findProductCandidates(reference) {
      if (/^\d+$/.test(reference)) {
        const productId = Number(reference)
        if (!Number.isSafeInteger(productId) || productId <= 0) throw new Error('product_reference_out_of_range')
        const product = await payload.findByID({
          collection: 'products',
          id: productId,
          depth: 0,
          disableErrors: true,
          overrideAccess: true,
        })
        return product ? [product] : []
      }
      return normalizedPage(await payload.find({
        collection: 'products',
        where: { stockNumber: { equals: reference } },
        depth: 0,
        limit: 2,
        page: 1,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), 1, 2).docs
    },
    async readProductMediaPage(productId, page, limit) {
      return normalizedPage(await payload.find({
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
    async readImageJobPage(productId, page, limit) {
      return normalizedPage(await payload.find({
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
    async readPayloadJobPage(imageJobIds, page, limit) {
      if (imageJobIds.length === 0) return virtualPage([], page, limit)
      const normalizedJobIds = [...new Set(imageJobIds.map((id) => String(id)))]
      if (!queueReceiptReader) throw new Error('queue_receipt_authority_unavailable')
      return queueReceiptReader.readPage(normalizedJobIds, page, limit)
    },
    async readBotEventPage(productId, page, limit) {
      return normalizedPage(await payload.find({
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
      return normalizedPage(await payload.find({
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

function unwrapModule<T>(value: T): T {
  const candidate = value as T & { default?: T }
  return candidate.default ?? value
}

async function initializeRuntime(): Promise<RuntimeResource> {
  const missing = ['DATABASE_URI', 'PAYLOAD_SECRET'].filter((key) => !process.env[key])
  if (missing.length > 0) throw new Error('runtime_configuration_missing')
  process.env.PAYLOAD_DB_PUSH = 'false'

  const payloadModule = await import('payload')
  const postgresModule = await import('@payloadcms/db-postgres')
  const lexicalModule = await import('@payloadcms/richtext-lexical')
  const sharpModule = await import('sharp')
  const { Products } = unwrapModule(await import('../src/collections/Products'))
  const { Variants } = unwrapModule(await import('../src/collections/Variants'))
  const { MediaCollection } = unwrapModule(await import('../src/collections/Media'))
  const { Brands } = unwrapModule(await import('../src/collections/Brands'))
  const { Categories } = unwrapModule(await import('../src/collections/Categories'))
  const { BlogPosts } = unwrapModule(await import('../src/collections/BlogPosts'))
  const { ImageGenerationJobs } = unwrapModule(await import('../src/collections/ImageGenerationJobs'))
  const { BotEvents } = unwrapModule(await import('../src/collections/BotEvents'))
  const { StoryJobs } = unwrapModule(await import('../src/collections/StoryJobs'))

  const databaseUri = process.env.DATABASE_URI as string
  const poolOptions = {
    Client: createVisualPilotRuntimePostgresClientConstructor(),
    connectionString: databaseUri,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 1_000,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  }
  const configInput = createVisualPilotMinimalRuntimeConfig({
    collections: [
      Products,
      Variants,
      MediaCollection,
      Brands,
      Categories,
      BlogPosts,
      ImageGenerationJobs,
      BotEvents,
      StoryJobs,
    ],
    db: postgresModule.postgresAdapter({
      pool: poolOptions,
      push: false,
    }),
    editor: lexicalModule.lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET as string,
    sharp: sharpModule.default,
  })
  const config = payloadModule.buildConfig(
    configInput as Parameters<typeof payloadModule.buildConfig>[0],
  )
  const payload = await payloadModule.getPayload({ config }) as unknown as VisualPilotRuntimePayload
  let pool: VisualPilotRuntimePostgresPool
  try {
    pool = runtimePostgresPool(payload)
  } catch {
    const teardown = await destroyVisualPilotPayloadWithinBoundary({
      payloadDestroy: () => payload.destroy(),
    })
    if (!teardown.ok) throw new VisualPilotRuntimeTeardownFailure(teardown.code)
    throw new Error('runtime_postgres_pool_unavailable')
  }
  const destroy = createVisualPilotRuntimeCleanup({
    payloadDestroy: () => payload.destroy(),
    pool,
  })
  return {
    dependencies: {
      gateway: createVisualPilotRuntimeGateway(payload, createVisualPilotQueueReceiptReader(pool)),
      mediaRead: {
        canonicalOrigin: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.uygunayakkabi.com',
      },
    },
    destroy,
  }
}

export async function runVisualPilotTargetRuntimeSmoke(options: VisualPilotRuntimeOptions): Promise<number> {
  const io = options.io ?? defaultIo
  const parsed = parseVisualPilotTargetArgs(options.argv)
  if (parsed.ok && parsed.helpRequested) {
    io.stdout(visualPilotTargetUsage())
    return 0
  }
  if (!parsed.ok) {
    io.stderr(`VISUAL_PILOT_TARGET_REFUSED: ${parsed.code}`)
    io.stdout(visualPilotTargetUsage())
    return 2
  }

  let resource: RuntimeResource | null = null
  let executionExitCode = 1
  try {
    const result = await executeVisualPilotTargetCommand({
      argv: options.argv,
      initialize: async () => {
        resource = await (options.initialize ?? initializeRuntime)()
        return resource.dependencies
      },
    })
    if (result.report) {
      io.stdout(JSON.stringify(result.report, null, 2))
      io.stdout(formatVisualPilotTargetSummary(result.report))
    }
    executionExitCode = result.exitCode
  } catch (error) {
    if (error instanceof VisualPilotRuntimeTeardownFailure) {
      io.stderr(`VISUAL_PILOT_TARGET_TEARDOWN_FAILURE: ${error.code}`)
      executionExitCode = VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE
    } else {
      io.stderr('VISUAL_PILOT_TARGET_INTERNAL_FAILURE')
      executionExitCode = 1
    }
  }

  if (resource) {
    let teardown: void | VisualPilotRuntimeTeardownResult
    try {
      teardown = await resource.destroy()
    } catch {
      teardown = { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_FAILED' }
    }
    if (teardown && !teardown.ok) {
      io.stderr(`VISUAL_PILOT_TARGET_TEARDOWN_FAILURE: ${teardown.code}`)
      return VISUAL_PILOT_TARGET_TEARDOWN_EXIT_CODE
    }
  }
  return executionExitCode
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  void runVisualPilotTargetRuntimeSmoke({ argv: process.argv.slice(2) })
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
