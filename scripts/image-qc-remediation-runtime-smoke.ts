/**
 * Read-only runtime smoke for the batch Image QC remediation queue.
 *
 * Mirrors Telegram /imageqcplan against Payload products. It never writes a
 * product, records Image QC, queues generation, calls providers/Shopier,
 * dispatches channels, activates SupplierScout, revives retired channels, or
 * pushes schema.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { buildImageQcRemediationPlan } from '../src/lib/imageQcRemediationPlan'

type SmokeArgs = {
  confirmReadOnly: boolean
  helpRequested: boolean
  limit: number
  mutationRequested: boolean
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 300

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = process.env.UYAA_IMAGE_QC_PLAN_SMOKE_CONFIRM === 'READ_ONLY'
  let helpRequested = false
  let limit = parseLimit(process.env.UYAA_IMAGE_QC_PLAN_SMOKE_LIMIT)
  let mutationRequested = process.env.UYAA_IMAGE_QC_PLAN_SMOKE_ALLOW_MUTATION === '1'

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') helpRequested = true
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg.startsWith('--limit=')) limit = parseLimit(arg.slice('--limit='.length))
    if ([
      '--mutate', '--allow-mutation', '--confirm', '--apply', '--publish',
      '--queue', '--spend', '--call-provider', '--call-shopier',
      '--activate-supplier-scout',
    ].includes(arg)) {
      mutationRequested = true
    }
  }

  return { confirmReadOnly, helpRequested, limit, mutationRequested }
}

function printUsage(): void {
  console.log([
    'Image QC remediation runtime smoke (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    `  --limit=1..${MAX_LIMIT}`,
    '',
    'Examples:',
    '  npm run smoke:image-qc-plan:read -- --confirm-read-only',
    '  npm run smoke:image-qc-plan:read -- --limit=200 --confirm-read-only',
    '',
    'This reads products and builds the same queue used by /imageqcplan.',
    'It does not record Image QC, queue generation, publish, dispatch, call providers or Shopier, or push schema changes.',
  ].join('\n'))
}

function loadEnvFiles(cwd: string): string[] {
  const loaded: string[] = []
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(cwd, fileName)
    if (!existsSync(filePath)) continue
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
      if (!match || line.trim().startsWith('#')) continue
      let value = match[2]
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (process.env[match[1]] === undefined) process.env[match[1]] = value
    }
    loaded.push(fileName)
  }
  return loaded
}

function unwrapModule<T extends Record<string, unknown>>(mod: T): T {
  if (mod.default && typeof mod.default === 'object' && !Array.isArray(mod.default) && 'module.exports' in mod) {
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

function printPlan(plan: ReturnType<typeof buildImageQcRemediationPlan>): void {
  console.log('Image QC Remediation Queue snapshot')
  console.log(`  sample: ${plan.sampleSize}/${plan.totalProducts ?? plan.sampleSize}`)
  console.log(`  queueCount: ${plan.queueCount}`)
  console.log(`  states: ${Object.entries(plan.stateCounts).map(([state, count]) => `${state}=${count}`).join(' ')}`)
  console.log(`  brandBlockedCount: ${plan.brandBlockedCount}`)

  for (const item of plan.items.slice(0, 12)) {
    console.log(`  - [${item.state}] ${item.ref} ${item.title}`)
    console.log(`    status=${item.status} qc=${item.imageQuality.status} originals=${item.imageQuality.originalCount} generated=${item.imageQuality.generatedCount}`)
    console.log(`    brands=${item.blockedBrands.join(',') || 'none'}`)
    console.log(`    imagePlan=${item.imagePlanCommand}`)
    console.log(`    runtimeImagePlan=${item.runtimeImagePlanCommand}`)
    console.log(`    flow=${item.flowCommand}`)
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.helpRequested) return printUsage()
  if (args.mutationRequested) {
    console.error('Refusing to run: this Image QC queue smoke is read-only and does not support mutation, generation, publish, queue, provider, Shopier, SupplierScout, or spend flags.')
    process.exitCode = 2
    return
  }
  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to Payload without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  const loaded = loadEnvFiles(process.cwd())
  process.env.PAYLOAD_DB_PUSH = 'false'
  const missingEnv = ['DATABASE_URI', 'PAYLOAD_SECRET'].filter((key) => !process.env[key])
  if (missingEnv.length > 0) {
    console.error(`Missing required env var(s): ${missingEnv.join(', ')}`)
    process.exitCode = 2
    return
  }

  console.log('Image QC Remediation Queue runtime smoke')
  console.log(`Env files loaded: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Limit: ${args.limit}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const result = await payload.find({
      collection: 'products',
      limit: args.limit,
      depth: 1,
      sort: '-updatedAt',
    })
    printPlan(buildImageQcRemediationPlan(result.docs as any[], {
      sampleLimit: args.limit,
      totalProducts: result.totalDocs,
    }))
    console.log('')
    console.log('Smoke result: Image QC remediation diagnostics completed. No writes, Image QC decisions, generation queues, publishes, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed.')
  } finally {
    await payload.db.destroy()
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    console.error('No writes, Image QC decisions, generation queues, publishes, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed.')
    process.exit(1)
  })
