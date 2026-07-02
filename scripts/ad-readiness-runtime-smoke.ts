/**
 * Read-only runtime smoke check for manual ad/PDP readiness.
 *
 * This script connects to Payload only after an explicit product reference and
 * READ_ONLY confirmation are provided. It mirrors Telegram /adready through the
 * shared evaluator, but it never updates products, dispatches channels, queues
 * jobs, calls providers, calls Shopier, or pushes schema changes.
 *
 * Usage:
 *   npm run smoke:ad-readiness:read -- --product=359 --confirm-read-only
 *   npm run smoke:ad-readiness:read -- --product=SN0032 --confirm-read-only
 *
 * Env alternative:
 *   UYAA_AD_READINESS_SMOKE_PRODUCT=359
 *   UYAA_AD_READINESS_SMOKE_CONFIRM=READ_ONLY
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { evaluateAdReadiness } from '../src/lib/adReadiness'

type SmokeArgs = {
  productRef?: string
  confirmReadOnly: boolean
  mutationRequested: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let productRef: string | undefined
  let confirmReadOnly = false
  let mutationRequested = false

  for (const arg of argv) {
    if (arg.startsWith('--product=')) productRef = arg.slice('--product='.length).trim()
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (
      arg === '--mutate' ||
      arg === '--allow-mutation' ||
      arg === '--confirm' ||
      arg === '--apply' ||
      arg === '--publish' ||
      arg === '--queue' ||
      arg === '--spend'
    ) {
      mutationRequested = true
    }
  }

  return {
    productRef: productRef || process.env.UYAA_AD_READINESS_SMOKE_PRODUCT?.trim(),
    confirmReadOnly: confirmReadOnly || process.env.UYAA_AD_READINESS_SMOKE_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_AD_READINESS_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_AD_READINESS_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Ad readiness runtime smoke check (read-only)',
    '',
    'Required:',
    '  --product=<payload-product-id-or-stock-number>',
    '  --confirm-read-only',
    '',
    'Examples:',
    '  npm run smoke:ad-readiness:read -- --product=359 --confirm-read-only',
    '  npm run smoke:ad-readiness:read -- --product=SN0032 --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_AD_READINESS_SMOKE_PRODUCT=359',
    '  UYAA_AD_READINESS_SMOKE_CONFIRM=READ_ONLY',
    '',
    'This command reads one product, evaluates the manual ad/PDP readiness checklist used by /adready, and exits.',
    'It does not update Payload, publish channels, queue jobs, call providers, call Shopier, spend on ads, or push schema changes.',
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

function normalizeProductRef(raw: string): number | string {
  const trimmed = raw.trim()
  const numeric = Number(trimmed)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : trimmed
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
    depth += 1
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
      'Ad readiness smoke blocked before completion: Payload DB schema appears behind the current repo schema.',
      '',
      'What this means:',
      '- The script was read-only and did not write, queue jobs, dispatch channels, call providers, call Shopier, spend on ads, or push schema changes.',
      '- Apply/verify the required Payload DB migration or DDL, then rerun:',
      '  npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only',
      '',
      'Evidence:',
      ...details.slice(0, 8),
    ].join('\n')
  }

  return [
    'Ad readiness smoke failed before completion.',
    '',
    'No writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes were performed by this script.',
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

async function findProduct(payload: any, rawRef: string): Promise<Record<string, any> | null> {
  const normalized = normalizeProductRef(rawRef)

  if (typeof normalized === 'number') {
    const byId = await payload.findByID({
      collection: 'products',
      id: normalized as any,
      depth: 2,
    }) as Record<string, any> | null
    if (byId) return byId
  }

  const byStockNumber = await payload.find({
    collection: 'products',
    where: { stockNumber: { equals: rawRef.trim() } },
    depth: 2,
    limit: 1,
  })

  return (byStockNumber.docs?.[0] ?? null) as Record<string, any> | null
}

function printAdReadiness(product: Record<string, any>): ReturnType<typeof evaluateAdReadiness> {
  const result = evaluateAdReadiness(product)

  console.log('Product')
  console.log(`  id: ${String(product.id ?? '(missing)')}`)
  console.log(`  stockNumber: ${product.stockNumber ?? '(missing)'}`)
  console.log(`  title: ${product.title ?? '(untitled)'}`)
  console.log(`  status: ${product.status ?? '(missing)'}`)
  console.log(`  slug: ${product.slug ?? '(missing)'}`)
  console.log('')

  console.log('Ad/PDP readiness')
  console.log(`  level: ${result.level}`)
  console.log(`  checks: ${result.passedCount}/${result.totalCount}`)
  for (const check of result.checks) {
    const state = check.ok ? 'pass' : check.warn ? 'warn' : 'block'
    console.log(`  - ${check.key}: ${state} (${check.detail})`)
  }
  console.log('')

  if (result.blockers.length > 0) {
    console.log('Blockers')
    for (const blocker of result.blockers) console.log(`  - ${blocker}`)
    console.log('')
  }

  if (result.warnings.length > 0) {
    console.log('Warnings')
    for (const warning of result.warnings) console.log(`  - ${warning}`)
    console.log('')
  }

  if (result.sampleUtmUrl) {
    console.log(`Sample UTM URL: ${result.sampleUtmUrl}`)
    console.log('')
  }

  return result
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.productRef) {
    printUsage()
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, publish, queue, or spend flags.')
    process.exitCode = 2
    return
  }

  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to Payload without READ_ONLY confirmation.')
    printUsage()
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

  console.log('Ad readiness runtime smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Product ref: ${args.productRef}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const product = await findProduct(payload, args.productRef)
    if (!product) {
      console.error(`Product not found: ${args.productRef}`)
      process.exitCode = 3
      return
    }

    const result = printAdReadiness(product)
    console.log('Smoke result: ad-readiness evaluation completed. No writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes were performed.')

    if (result.level === 'blocked') process.exitCode = 1
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
