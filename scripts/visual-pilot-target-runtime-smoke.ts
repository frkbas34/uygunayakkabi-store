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

export type VisualPilotRuntimePayload = {
  find: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
  findByID: (args: Record<string, unknown>) => Promise<unknown>
  destroy: () => Promise<void>
}

type RuntimeResource = {
  dependencies: VisualPilotTargetVerifierDependencies
  destroy: () => Promise<void>
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

export function createVisualPilotRuntimeGateway(
  payload: VisualPilotRuntimePayload,
): VisualPilotTargetReadGateway {
  return {
    // Telegram preview receipts and product-correlated external advertising
    // history do not have authoritative persisted readers today. The optional
    // gateway methods are intentionally omitted so the verifier fails closed.
    async findProductCandidates(reference) {
      const stockNumber = /^\d+$/.test(reference)
        ? `SN${reference.padStart(4, '0')}`
        : reference
      const result = normalizedPage(await payload.find({
        collection: 'products',
        where: { stockNumber: { equals: stockNumber } },
        depth: 0,
        limit: 2,
        page: 1,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), 1, 2)
      if (result.docs.length > 0 || !/^\d+$/.test(reference)) return result.docs
      const productId = Number(reference)
      if (!Number.isSafeInteger(productId)) throw new Error('product_reference_out_of_range')
      const product = await payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      })
      return product ? [product] : []
    },
    async findMediaById(id) {
      return payload.findByID({
        collection: 'media',
        id,
        depth: 0,
        disableErrors: true,
        overrideAccess: true,
      })
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
      return normalizedPage(await payload.find({
        collection: 'payload-jobs',
        where: {
          and: [
            { taskSlug: { equals: 'image-gen' } },
            { 'input.jobId': { in: normalizedJobIds } },
          ],
        },
        select: {
          completedAt: true,
          hasError: true,
          input: true,
          processing: true,
          taskSlug: true,
          waitUntil: true,
        },
        depth: 0,
        page,
        limit,
        sort: 'id',
        overrideAccess: true,
        pagination: true,
      }), page, limit)
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
  const config = payloadModule.buildConfig({
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
    jobs: { tasks: [] },
    db: postgresModule.postgresAdapter({
      pool: {
        connectionString: databaseUri,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 1_000,
        ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      },
      push: false,
    }),
    editor: lexicalModule.lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET as string,
    sharp: sharpModule.default,
  })
  const payload = await payloadModule.getPayload({ config }) as unknown as VisualPilotRuntimePayload
  return {
    dependencies: {
      gateway: createVisualPilotRuntimeGateway(payload),
      mediaRead: {
        canonicalOrigin: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.uygunayakkabi.com',
      },
    },
    destroy: () => payload.destroy(),
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
    return result.exitCode
  } catch {
    io.stderr('VISUAL_PILOT_TARGET_INTERNAL_FAILURE')
    return 1
  } finally {
    if (resource) await resource.destroy().catch(() => undefined)
  }
}

const isMain = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isMain) {
  void runVisualPilotTargetRuntimeSmoke({ argv: process.argv.slice(2) })
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
