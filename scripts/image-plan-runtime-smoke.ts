/**
 * Read-only runtime smoke check for the Image Regeneration Plan.
 *
 * This script connects to Payload only after an explicit product reference and
 * READ_ONLY confirmation are provided. It mirrors Telegram /imageplan output
 * through the shared helper, but it never updates products, queues image
 * generation, calls providers, publishes, dispatches channels, calls Shopier,
 * spends on ads, activates SupplierScout, or pushes schema changes.
 *
 * Usage:
 *   npm run smoke:image-plan:read -- --product=359 --confirm-read-only
 *   npm run smoke:image-plan:read -- --product=SN0359 --confirm-read-only
 *
 * Env alternative:
 *   UYAA_IMAGE_PLAN_SMOKE_PRODUCT=359
 *   UYAA_IMAGE_PLAN_SMOKE_CONFIRM=READ_ONLY
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { buildImageRegenerationPlan, formatImageRegenerationPlan } from '../src/lib/imageRegenerationPlan'

type SmokeArgs = {
  productRef?: string
  confirmReadOnly: boolean
  helpRequested: boolean
  mutationRequested: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let productRef: string | undefined
  let confirmReadOnly = false
  let helpRequested = false
  let mutationRequested = false

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') helpRequested = true
    if (arg.startsWith('--product=')) productRef = arg.slice('--product='.length).trim()
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (
      arg === '--mutate' ||
      arg === '--allow-mutation' ||
      arg === '--confirm' ||
      arg === '--apply' ||
      arg === '--publish' ||
      arg === '--queue' ||
      arg === '--dispatch' ||
      arg === '--spend' ||
      arg === '--ads' ||
      arg === '--call-provider' ||
      arg === '--call-shopier' ||
      arg === '--activate-supplier-scout' ||
      arg === '--retired-channel'
    ) {
      mutationRequested = true
    }
  }

  return {
    productRef: productRef || process.env.UYAA_IMAGE_PLAN_SMOKE_PRODUCT?.trim(),
    confirmReadOnly: confirmReadOnly || process.env.UYAA_IMAGE_PLAN_SMOKE_CONFIRM === 'READ_ONLY',
    helpRequested,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_IMAGE_PLAN_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_IMAGE_PLAN_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Image Regeneration Plan runtime smoke check (read-only)',
    '',
    'Required:',
    '  --product=<payload-product-id-or-stock-number>',
    '  --confirm-read-only',
    '',
    'Examples:',
    '  npm run smoke:image-plan:read -- --product=359 --confirm-read-only',
    '  npm run smoke:image-plan:read -- --product=SN0359 --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_IMAGE_PLAN_SMOKE_PRODUCT=359',
    '  UYAA_IMAGE_PLAN_SMOKE_CONFIRM=READ_ONLY',
    '',
    'This command reads one product, recent image-generation job rows, and builds the same Image Regeneration Plan used by /imageplan.',
    'It does not update Payload, queue image generation, call providers, publish channels, dispatch channels, call Shopier, spend on ads, activate SupplierScout, or push schema changes.',
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
        details.push('Payload query failed while reading image plan diagnostics (SQL omitted).')
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
      'Image Regeneration Plan smoke blocked before completion: Payload DB schema appears behind the current repo schema.',
      '',
      'What this means:',
      '- The script was read-only and did not write, queue image generation, dispatch channels, call providers, call Shopier, spend on ads, activate SupplierScout, or push schema changes.',
      '- Apply/verify the required Payload DB migration or DDL, then rerun:',
      '  npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only',
      '',
      'Evidence:',
      ...details.slice(0, 8),
    ].join('\n')
  }

  return [
    'Image Regeneration Plan smoke failed before completion.',
    '',
    'No writes, image-generation jobs, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed by this script.',
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
  const { ImageGenerationJobs } = unwrapModule(await import('../src/collections/ImageGenerationJobs'))
  const { BotEvents } = unwrapModule(await import('../src/collections/BotEvents'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts, ImageGenerationJobs, BotEvents],
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
      depth: 1,
    }) as Record<string, any> | null
    if (byId) return byId
  }

  const byStockNumber = await payload.find({
    collection: 'products',
    where: { stockNumber: { equals: rawRef.trim() } },
    depth: 1,
    limit: 1,
  })

  return (byStockNumber.docs?.[0] ?? null) as Record<string, any> | null
}

function printPlan(plan: Awaited<ReturnType<typeof buildImageRegenerationPlan>>): void {
  console.log('Image Regeneration Plan')
  console.log(`  id: ${String(plan.productId ?? '(missing)')}`)
  console.log(`  ref: ${plan.ref}`)
  console.log(`  title: ${plan.title}`)
  console.log(`  state: ${plan.state} (${plan.severity})`)
  console.log(`  visualStatus: ${plan.visualStatus}`)
  console.log(`  imageQC: ${plan.imageQuality.level} - ${plan.imageQuality.detail}`)
  console.log(`  media: originals=${plan.imageQuality.originalCount}, generated=${plan.imageQuality.generatedCount}`)
  console.log(
    `  latest image-generation job: ${
      plan.latestJob
        ? `${plan.latestJob.status ?? 'unknown'} #${plan.latestJob.id ?? '?'} generated=${plan.latestJob.generatedCount}`
        : 'none'
    }`,
  )
  console.log(`  summary: ${plan.summary}`)
  console.log('')

  console.log('Next actions')
  for (const action of plan.nextActions) console.log(`  - ${action}`)
  console.log('')

  console.log('Suggested commands')
  for (const command of plan.suggestedCommands) console.log(`  - ${command}`)
  console.log('')

  console.log('Telegram formatted output')
  console.log(formatImageRegenerationPlan(plan))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.helpRequested) {
    printUsage()
    return
  }

  if (!args.productRef) {
    printUsage()
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, queue, publish, dispatch, provider, Shopier, SupplierScout, retired-channel, or spend flags.')
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

  console.log('Image Regeneration Plan runtime smoke check')
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

    const { docs: jobs } = await payload.find({
      collection: 'image-generation-jobs',
      where: { product: { equals: product.id } },
      sort: '-updatedAt',
      limit: 3,
      depth: 0,
    })
    const provenanceEvents = await payload.find({
      collection: 'bot-events',
      where: {
        and: [
          { eventType: { equals: 'brand_safety.provenance_reviewed' } },
          { product: { equals: product.id } },
        ],
      },
      limit: 100,
      depth: 0,
      sort: '-createdAt',
    })

    const plan = buildImageRegenerationPlan(product as any, jobs as any[], {
      provenanceEvents: provenanceEvents.docs as any[],
    })
    printPlan(plan)
    console.log('')
    console.log('Smoke result: image-plan diagnostics completed. No writes, image-generation jobs, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed.')
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
