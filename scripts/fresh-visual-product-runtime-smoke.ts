/**
 * Configured, bounded fresh-product discovery. This command is read-only: its
 * runtime gateway exposes fixed readers only and cannot accept selectors,
 * queries, limits, URLs, adapters, collections, or environment overrides.
 */
import { pathToFileURL } from 'node:url'

import {
  discoverFreshVisualProducts,
  parseFreshVisualDiscoveryArgs,
  type FreshVisualDiscoveryDependencies,
  type FreshVisualDiscoveryReadiness,
} from '../src/lib/freshVisualProductDiscovery'
import {
  createVisualPilotMinimalRuntimeConfig,
  type VisualPilotRuntimePayload,
} from './visual-pilot-target-runtime-smoke'
import {
  createVisualPilotRuntimeCleanup,
  createVisualPilotRuntimePostgresClientConstructor,
  destroyVisualPilotPayloadWithinBoundary,
  type VisualPilotRuntimePostgresPool,
  type VisualPilotRuntimeTeardownResult,
} from './visual-pilot-target-runtime-resources'
import { createFreshVisualDiscoveryRuntimeGateway } from './fresh-visual-product-runtime-resources'

type RuntimeResource = {
  dependencies: FreshVisualDiscoveryDependencies
  destroy: () => Promise<void | VisualPilotRuntimeTeardownResult>
}

type RuntimeOptions = {
  argv: readonly string[]
  initialize?: () => Promise<RuntimeResource>
  io?: { stdout(text: string): void; stderr(text: string): void }
}

const ioDefault = {
  stdout: (text: string) => console.log(text),
  stderr: (text: string) => console.error(text),
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function runtimePool(payload: VisualPilotRuntimePayload): VisualPilotRuntimePostgresPool {
  if (!isRecord(payload.db) || !isRecord(payload.db.pool)) throw new Error('runtime_postgres_pool_unavailable')
  const pool = payload.db.pool
  if (typeof pool.query !== 'function' || typeof pool.end !== 'function') throw new Error('runtime_postgres_pool_unavailable')
  return pool as unknown as VisualPilotRuntimePostgresPool
}

function unwrapModule<T>(value: T): T {
  return (value as T & { default?: T }).default ?? value
}

export function freshVisualDiscoveryUsage(): string {
  return [
    'Fresh Visual Product Discovery (read-only)',
    '',
    'Required: --confirm-read-only',
    '',
    'Example:',
    "  $env:PAYLOAD_DB_PUSH='false'; npm run smoke:visual-lock-fresh-candidates:read -- --confirm-read-only",
    '',
    'No product selector, query, limit, URL, collection, environment, or adapter override is accepted.',
  ].join('\n')
}

async function initializeRuntime(): Promise<RuntimeResource> {
  if (!process.env.DATABASE_URI || !process.env.PAYLOAD_SECRET) throw new Error('runtime_configuration_missing')
  if (process.env.PAYLOAD_DB_PUSH !== 'false') throw new Error('runtime_db_push_not_disabled')

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

  const databaseUri = process.env.DATABASE_URI
  const config = payloadModule.buildConfig(createVisualPilotMinimalRuntimeConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts, ImageGenerationJobs, BotEvents, StoryJobs],
    db: postgresModule.postgresAdapter({
      pool: {
        Client: createVisualPilotRuntimePostgresClientConstructor(),
        connectionString: databaseUri,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 1_000,
        ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      },
      push: false,
    }),
    editor: lexicalModule.lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET,
    sharp: sharpModule.default,
  }) as Parameters<typeof payloadModule.buildConfig>[0])
  const payload = await payloadModule.getPayload({ config }) as unknown as VisualPilotRuntimePayload
  let pool: VisualPilotRuntimePostgresPool
  try {
    pool = runtimePool(payload)
  } catch {
    const teardown = await destroyVisualPilotPayloadWithinBoundary({ payloadDestroy: () => payload.destroy() })
    if (!teardown.ok) throw new Error(teardown.code)
    throw new Error('runtime_postgres_pool_unavailable')
  }
  return {
    dependencies: {
      gateway: createFreshVisualDiscoveryRuntimeGateway(payload, pool),
      mediaRead: { canonicalOrigin: process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://www.uygunayakkabi.com' },
    },
    destroy: createVisualPilotRuntimeCleanup({ payloadDestroy: () => payload.destroy(), pool }),
  }
}

function readinessExitCode(readiness: FreshVisualDiscoveryReadiness): number {
  if (readiness === 'READY_FOR_EXACT_FRESH_GENERATION_AUTHORIZATION') return 0
  if (readiness === 'CANDIDATE_DISCOVERY_UNSUPPORTED') return 3
  if (readiness === 'NO_ELIGIBLE_FRESH_CANDIDATE') return 4
  return 6
}

export async function runFreshVisualProductRuntimeSmoke(options: RuntimeOptions): Promise<number> {
  const io = options.io ?? ioDefault
  const args = parseFreshVisualDiscoveryArgs(options.argv)
  if (args.ok && args.helpRequested) {
    io.stdout(freshVisualDiscoveryUsage())
    return 0
  }
  if (!args.ok) {
    io.stderr(`FRESH_VISUAL_DISCOVERY_REFUSED: ${args.code}`)
    io.stdout(freshVisualDiscoveryUsage())
    return 2
  }
  if (process.env.PAYLOAD_DB_PUSH !== 'false') {
    io.stderr('FRESH_VISUAL_DISCOVERY_REFUSED: PAYLOAD_DB_PUSH_FALSE_REQUIRED')
    return 2
  }

  let resource: RuntimeResource | null = null
  let exitCode = 1
  try {
    resource = await (options.initialize ?? initializeRuntime)()
    const report = await discoverFreshVisualProducts(resource.dependencies)
    io.stdout(JSON.stringify(report, null, 2))
    exitCode = readinessExitCode(report.readiness)
  } catch {
    io.stderr('FRESH_VISUAL_DISCOVERY_INTERNAL_FAILURE')
  }
  if (resource) {
    let teardown: void | VisualPilotRuntimeTeardownResult
    try {
      teardown = await resource.destroy()
    } catch {
      teardown = { ok: false, code: 'RUNTIME_PAYLOAD_TEARDOWN_FAILED' }
    }
    if (teardown && !teardown.ok) {
      io.stderr(`FRESH_VISUAL_DISCOVERY_TEARDOWN_FAILURE: ${teardown.code}`)
      return 5
    }
  }
  return exitCode
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false
if (isMain) {
  void runFreshVisualProductRuntimeSmoke({ argv: process.argv.slice(2) })
    .then((exitCode) => { process.exitCode = exitCode })
    .catch(() => { process.exitCode = 1 })
}
