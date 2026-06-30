/**
 * Read-only runtime smoke check for guarded Shopier operator commands.
 *
 * This script connects to Payload only after READ_ONLY confirmation. It mirrors
 * the shared D-356 Shopier/Web gate used by Telegram commands, but it never
 * updates products, dispatches channels, queues jobs, calls Shopier, or pushes
 * schema changes.
 *
 * Usage:
 *   npm run smoke:shopier:read -- --confirm-read-only
 *   npm run smoke:shopier:read -- --product=359 --confirm-read-only
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  buildShopierDashboardSummary,
  buildShopierRetryPlan,
  evaluateShopierPublishControl,
  formatShopierBatchPlan,
  formatShopierErrorSummary,
  formatShopierOperatorDashboard,
  formatShopierRetryPlan,
  hasShopierIntent,
} from '../src/lib/shopierPublishControl'

type SmokeArgs = {
  productId?: string
  confirmReadOnly: boolean
  mutationRequested: boolean
  limit: number
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let productId: string | undefined
  let confirmReadOnly = false
  let mutationRequested = false
  let limit = Number(process.env.UYAA_SHOPIER_SMOKE_LIMIT ?? 50)

  for (const arg of argv) {
    if (arg.startsWith('--product=')) productId = arg.slice('--product='.length).trim()
    if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length).trim())
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg === '--mutate' || arg === '--allow-mutation' || arg === '--confirm') mutationRequested = true
  }

  return {
    productId: productId || process.env.UYAA_SHOPIER_SMOKE_PRODUCT_ID?.trim(),
    confirmReadOnly: confirmReadOnly || process.env.UYAA_SHOPIER_SMOKE_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_SHOPIER_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_SHOPIER_SMOKE_MUTATE === '1',
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 50,
  }
}

function printUsage(): void {
  console.log([
    'Shopier operator smoke check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    '  --product=<payload-product-id>  Check one product against the Shopier queue gate',
    '  --limit=<1-100>                Product limit for batch/error previews',
    '',
    'Examples:',
    '  npm run smoke:shopier:read -- --confirm-read-only',
    '  npm run smoke:shopier:read -- --product=359 --confirm-read-only',
    '',
    'This command mirrors /shopier publish-ready, /shopier errors, and /shopier retry-errors in read-only mode.',
    'It does not update Payload, call Shopier, publish channels, queue jobs, or push schema changes.',
  ].join('\n'))
}

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null

  const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed)
  if (!match) return null

  let value = match[2].trim()
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    value = value.slice(1, -1)
  }

  return [match[1], value]
}

function loadEnvFiles(cwd: string): EnvLoadResult {
  const result: EnvLoadResult = { loaded: [], skipped: [] }

  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(cwd, fileName)
    if (!existsSync(filePath)) {
      result.skipped.push(fileName)
      continue
    }

    const text = readFileSync(filePath, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue
      const [key, value] = parsed
      if (process.env[key] === undefined) process.env[key] = value
    }
    result.loaded.push(fileName)
  }

  return result
}

function normalizeProductId(raw: string): number | string {
  const trimmed = raw.trim()
  const numeric = Number(trimmed)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : trimmed
}

function formatBool(value: boolean): string {
  return value ? 'yes' : 'no'
}

function collectErrorDetails(error: unknown): string[] {
  const details: string[] = []
  const seen = new Set<unknown>()
  let current: any = error
  let depth = 0

  while (current && typeof current === 'object' && !seen.has(current) && depth < 4) {
    seen.add(current)
    if (typeof current.message === 'string') {
      if (current.message.startsWith('Failed query:')) {
        details.push('Payload query failed while reading products (SQL omitted).')
      } else {
        details.push(current.message.length > 300 ? `${current.message.slice(0, 300)}...` : current.message)
      }
    }
    if (typeof current.code === 'string') details.push(`code=${current.code}`)
    if (typeof current.relation === 'string') details.push(`relation=${current.relation}`)
    if (typeof current.table === 'string') details.push(`table=${current.table}`)
    if (typeof current.column === 'string') details.push(`column=${current.column}`)
    if (typeof current.detail === 'string') details.push(`detail=${current.detail}`)
    if (typeof current.hint === 'string') details.push(`hint=${current.hint}`)
    current = current.cause
    depth++
  }

  if (typeof error === 'string') details.push(error)
  return [...new Set(details.filter((line) => line.trim().length > 0))]
}

function formatRuntimeSmokeError(error: unknown): string {
  const details = collectErrorDetails(error)
  const joined = details.join('\n')
  const looksLikeSchemaDrift =
    joined.includes('code=42703') ||
    joined.includes('code=42P01') ||
    joined.toLowerCase().includes('does not exist') ||
    joined.toLowerCase().includes('relation=') ||
    joined.toLowerCase().includes('missing column')

  if (looksLikeSchemaDrift) {
    return [
      'Shopier smoke blocked before preview: Payload DB schema appears behind the current repo schema.',
      '',
      'What this means:',
      '- The script was read-only and did not write, queue jobs, dispatch channels, call Shopier, or push schema changes.',
      '- Apply/verify the required Payload DB migration or DDL, then rerun:',
      '  npm run smoke:shopier:read -- --confirm-read-only',
      '',
      'Evidence:',
      ...details.slice(0, 8),
    ].join('\n')
  }

  return [
    'Shopier smoke failed before completion.',
    '',
    'No writes, jobs, dispatches, Shopier calls, or schema pushes were performed by this script.',
    '',
    'Evidence:',
    ...(details.length > 0 ? details.slice(0, 8) : [error instanceof Error ? error.message : String(error)]),
  ].join('\n')
}

function unwrapModule<T extends Record<string, unknown>>(mod: T): T {
  if (
    mod.default &&
    typeof mod.default === 'object' &&
    !Array.isArray(mod.default) &&
    'module.exports' in mod
  ) {
    return mod.default as T
  }
  return mod
}

async function getReadOnlyPayload() {
  const payloadMod = await import('payload')
  const dbMod = await import('@payloadcms/db-postgres')
  const editorMod = await import('@payloadcms/richtext-lexical')
  const sharpMod = await import('sharp')

  const { Products } = unwrapModule(await import('../src/collections/Products'))
  const { Variants } = unwrapModule(await import('../src/collections/Variants'))
  const { MediaCollection } = unwrapModule(await import('../src/collections/Media'))
  const { Brands } = unwrapModule(await import('../src/collections/Brands'))
  const { Categories } = unwrapModule(await import('../src/collections/Categories'))
  const { BlogPosts } = unwrapModule(await import('../src/collections/BlogPosts'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts],
    db: dbMod.postgresAdapter({
      pool: {
        connectionString: databaseUri,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 1000,
        ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      },
      push: false,
    }),
    editor: editorMod.lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET!,
    sharp: sharpMod.default,
  })

  return payloadMod.getPayload({ config })
}

function printSingleProductEvaluation(product: Record<string, any>): boolean {
  const evaluation = evaluateShopierPublishControl(product)
  const sourceMeta = product.sourceMeta && typeof product.sourceMeta === 'object' ? product.sourceMeta : {}

  console.log('Single product gate')
  console.log(`  id: ${String(product.id)}`)
  console.log(`  stockNumber: ${product.stockNumber ?? '(missing)'}`)
  console.log(`  title: ${product.title ?? '(untitled)'}`)
  console.log(`  status: ${product.status ?? '(missing)'}`)
  console.log(`  slug: ${product.slug ?? '(missing)'}`)
  console.log(`  queueStatus: ${evaluation.queueStatus}`)
  console.log(`  shopierProductId: ${sourceMeta.shopierProductId ?? '(none)'}`)
  console.log(`  readiness: ${evaluation.readinessScore}`)
  console.log(`  gate: ${evaluation.ok ? 'pass' : 'block'}`)
  if (evaluation.blockers.length > 0) {
    console.log('  blockers:')
    for (const blocker of evaluation.blockers) console.log(`  - ${blocker}`)
  }
  if (evaluation.warnings.length > 0) {
    console.log('  warnings:')
    for (const warning of evaluation.warnings) console.log(`  - ${warning}`)
  }
  console.log('')

  return evaluation.ok
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to Payload without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation flags.')
    process.exitCode = 2
    return
  }

  const envLoad = loadEnvFiles(process.cwd())

  // Payload config defaults db push to true. Runtime smoke must never apply schema changes.
  process.env.PAYLOAD_DB_PUSH = 'false'

  const missingEnv = ['DATABASE_URI', 'PAYLOAD_SECRET'].filter((key) => !process.env[key])
  if (missingEnv.length > 0) {
    console.error(`Missing required env var(s): ${missingEnv.join(', ')}`)
    process.exitCode = 2
    return
  }

  console.log('Shopier operator smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`SHOPIER_PAT configured: ${formatBool(Boolean(process.env.SHOPIER_PAT))}`)
  console.log(`Limit: ${args.limit}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    if (args.productId) {
      const productId = normalizeProductId(args.productId)
      const product = await payload.findByID({
        collection: 'products',
        id: productId as any,
        depth: 1,
      }) as Record<string, any> | null

      if (!product) {
        console.error(`Product not found: ${String(productId)}`)
        process.exitCode = 3
        return
      }

      const ok = printSingleProductEvaluation(product)
      if (!ok) process.exitCode = 1
    }

    const activeRes = await payload.find({
      collection: 'products',
      where: { status: { equals: 'active' } },
      depth: 1,
      limit: args.limit,
      sort: '-updatedAt',
    })
    const publishCandidates = (activeRes.docs as Record<string, any>[]).filter((product) => {
      const sourceMeta = product.sourceMeta && typeof product.sourceMeta === 'object' ? product.sourceMeta : {}
      return hasShopierIntent(product) && !sourceMeta.shopierProductId
    })
    const publishEvaluations = publishCandidates.map((product) => evaluateShopierPublishControl(product))

    console.log('Read-only /shopier publish-ready preview')
    console.log(formatShopierBatchPlan(publishEvaluations))
    console.log('')

    const errorRes = await payload.find({
      collection: 'products',
      where: { 'sourceMeta.shopierSyncStatus': { equals: 'error' } },
      depth: 1,
      limit: args.limit,
      sort: '-updatedAt',
    })
    const errorProducts = errorRes.docs as Record<string, any>[]

    console.log('Read-only /shopier dashboard preview')
    console.log(formatShopierOperatorDashboard(
      buildShopierDashboardSummary(publishEvaluations, errorProducts),
      { shopierPatConfigured: Boolean(process.env.SHOPIER_PAT) },
    ))
    console.log('')

    console.log('Read-only /shopier errors preview')
    console.log(formatShopierErrorSummary(errorProducts))
    console.log('')

    console.log('Read-only /shopier retry-errors preview')
    console.log(formatShopierRetryPlan(buildShopierRetryPlan(errorProducts)))
    console.log('')
    console.log('Smoke result: read-only Shopier previews completed. No writes, jobs, dispatches, or Shopier calls were performed.')
  } finally {
    await payload.destroy()
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0)
  })
  .catch((error) => {
    console.error(formatRuntimeSmokeError(error))
    process.exit(1)
  })
