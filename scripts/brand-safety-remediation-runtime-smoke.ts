/**
 * Read-only runtime smoke for the Brand-Safety Remediation Plan.
 *
 * It mirrors Telegram /brandplan against Payload products. It never updates a
 * product, rewrites text, changes visibility, queues jobs, publishes, calls a
 * provider or Shopier, spends on ads, activates SupplierScout, or pushes schema.
 *
 * Usage:
 *   npm run smoke:brand-safety:read -- --confirm-read-only
 *   npm run smoke:brand-safety:read -- --limit=200 --confirm-read-only
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { buildBrandSafetyRemediationPlan } from '../src/lib/brandSafetyRemediationPlan'

type SmokeArgs = {
  confirmReadOnly: boolean
  helpRequested: boolean
  limit: number
  mutationRequested: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 300

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = false
  let helpRequested = false
  let limit = parseLimit(process.env.UYAA_BRAND_SAFETY_PLAN_SMOKE_LIMIT)
  let mutationRequested = false

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') helpRequested = true
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg.startsWith('--limit=')) limit = parseLimit(arg.slice('--limit='.length))
    if (
      arg === '--mutate' ||
      arg === '--allow-mutation' ||
      arg === '--confirm' ||
      arg === '--apply' ||
      arg === '--publish' ||
      arg === '--queue' ||
      arg === '--spend' ||
      arg === '--call-provider' ||
      arg === '--call-shopier' ||
      arg === '--activate-supplier-scout'
    ) {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_BRAND_SAFETY_PLAN_SMOKE_CONFIRM === 'READ_ONLY',
    helpRequested,
    limit,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_BRAND_SAFETY_PLAN_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_BRAND_SAFETY_PLAN_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Brand-Safety Remediation Plan runtime smoke (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    `  --limit=1..${MAX_LIMIT}`,
    '',
    'Examples:',
    '  npm run smoke:brand-safety:read -- --confirm-read-only',
    '  npm run smoke:brand-safety:read -- --limit=200 --confirm-read-only',
    '',
    'This command reads products and provenance-review audit events, then builds the same protected-brand queue used by /brandplan.',
    'It does not update Payload, rewrite product text, publish, queue jobs, call providers, call Shopier, spend on ads, activate SupplierScout, or push schema changes.',
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
  const { BotEvents } = unwrapModule(await import('../src/collections/BotEvents'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts, BotEvents],
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

function printPlan(plan: ReturnType<typeof buildBrandSafetyRemediationPlan>): void {
  console.log('Brand-Safety Remediation Plan snapshot')
  console.log(`  sample: ${plan.sampleSize}/${plan.totalProducts ?? plan.sampleSize}`)
  console.log(`  blockedCount: ${plan.blockedCount}`)
  console.log(`  severity: critical=${plan.severityCounts.critical} high=${plan.severityCounts.high}`)
  console.log(`  brands: ${Object.entries(plan.brandCounts).map(([brand, count]) => `${brand}=${count}`).join(', ') || 'none'}`)
  console.log(`  provenance: ${Object.entries(plan.provenanceCounts).map(([state, count]) => `${state}=${count}`).join(' ')}`)
  console.log(`  externalExposureCount: ${plan.externalExposureCount} (stored notes only; manual remote verification required)`)

  if (plan.items.length === 0) return

  console.log('')
  console.log('Priority review queue')
  for (const item of plan.items.slice(0, 12)) {
    console.log(`  - [${item.severity}] ${item.ref} ${item.title}`)
    console.log(`    status=${item.status} brands=${item.blockedBrands.join(', ') || 'none'} claims=${item.riskyClaims.join(', ') || 'none'}`)
    console.log(`    fields=${item.matchedFields.join(', ') || 'none'}`)
    console.log(`    externalDispatch=published:${item.externalExposure.published.join(',') || 'none'} queued:${item.externalExposure.queued.join(',') || 'none'} failed:${item.externalExposure.failed.join(',') || 'none'}`)
    console.log(`    review=${item.provenanceReview ? `${item.provenanceReview.decision}@${item.provenanceReview.recordedAt}` : 'not_recorded'}`)
    console.log(`    nextSafeAction=${item.nextSafeAction.kind}${item.nextSafeAction.previewCommand ? ` command:${item.nextSafeAction.previewCommand}` : ''}`)
    console.log(`    flow=${item.flowCommand}`)
    console.log(`    smoke=${item.runtimeFlowCommand}`)
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.helpRequested) {
    printUsage()
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, rewrite, publish, queue, provider, Shopier, SupplierScout, or spend flags.')
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

  console.log('Brand-Safety Remediation Plan runtime smoke')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
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
    const provenanceEvents = await payload.find({
      collection: 'bot-events',
      where: {
        eventType: {
          equals: 'brand_safety.provenance_reviewed',
        },
      },
      limit: 1000,
      depth: 0,
      sort: '-createdAt',
    })
    const plan = buildBrandSafetyRemediationPlan(result.docs as any[], {
      sampleLimit: args.limit,
      totalProducts: result.totalDocs,
      provenanceEvents: provenanceEvents.docs as any[],
    })
    printPlan(plan)
    console.log('')
    console.log('Smoke result: brand-safety remediation diagnostics completed. No writes, product rewrites, status changes, jobs, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed.')
  } finally {
    await payload.db.destroy()
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    console.error('No writes, product rewrites, status changes, jobs, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed.')
    process.exit(1)
  })
