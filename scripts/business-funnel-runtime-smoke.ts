/**
 * Read-only runtime smoke check for Phase 7 business and funnel diagnostics.
 *
 * This script connects to Payload only after READ_ONLY confirmation. It runs
 * the same helper surfaces used by Telegram /business and /funnel, but it never
 * updates products, leads, orders, stock, jobs, providers, Shopier, ads, or
 * schema.
 *
 * Usage:
 *   npm run smoke:business-funnel:read -- --confirm-read-only
 *   npm run smoke:business-funnel:read -- --period=week --confirm-read-only
 *
 * Env alternative:
 *   UYAA_BUSINESS_FUNNEL_SMOKE_CONFIRM=READ_ONLY
 *   UYAA_BUSINESS_FUNNEL_SMOKE_PERIOD=week
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { getBusinessSnapshot } from '../src/lib/businessDesk'
import { getFunnelSnapshot } from '../src/lib/funnelDesk'

type SmokeArgs = {
  confirmReadOnly: boolean
  mutationRequested: boolean
  period: 'today' | 'week'
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = false
  let mutationRequested = false
  let period: 'today' | 'week' =
    process.env.UYAA_BUSINESS_FUNNEL_SMOKE_PERIOD === 'week' ? 'week' : 'today'

  for (const arg of argv) {
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg.startsWith('--period=')) {
      const raw = arg.slice('--period='.length).trim().toLowerCase()
      if (raw === 'week' || raw === 'son7' || raw === 'hafta') period = 'week'
      if (raw === 'today' || raw === 'bugun' || raw === 'bugün') period = 'today'
    }
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
    confirmReadOnly: confirmReadOnly || process.env.UYAA_BUSINESS_FUNNEL_SMOKE_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_BUSINESS_FUNNEL_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_BUSINESS_FUNNEL_SMOKE_MUTATE === '1',
    period,
  }
}

function printUsage(): void {
  console.log([
    'Business/Funnel runtime smoke check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    '  --period=today|week',
    '',
    'Examples:',
    '  npm run smoke:business-funnel:read -- --confirm-read-only',
    '  npm run smoke:business-funnel:read -- --period=week --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_BUSINESS_FUNNEL_SMOKE_CONFIRM=READ_ONLY',
    '  UYAA_BUSINESS_FUNNEL_SMOKE_PERIOD=week',
    '',
    'This command reads business and funnel diagnostics using the same helpers as /business and /funnel.',
    'It does not update Payload, mutate leads/orders/stock, publish channels, queue jobs, call providers, call Shopier, spend on ads, or push schema changes.',
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

function collectErrorDetails(error: unknown): string[] {
  const details: string[] = []
  const seen = new Set<unknown>()
  let current: any = error
  let depth = 0

  while (current && typeof current === 'object' && !seen.has(current) && depth < 4) {
    seen.add(current)
    if (typeof current.message === 'string') {
      if (current.message.startsWith('Failed query:')) {
        details.push('Payload query failed while reading business/funnel diagnostics (SQL omitted).')
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
      'Business/Funnel smoke blocked before completion: Payload DB schema appears behind the current repo schema.',
      '',
      'What this means:',
      '- The script was read-only and did not write, queue jobs, dispatch channels, call providers, call Shopier, spend on ads, or push schema changes.',
      '- Apply/verify the required Payload DB migration or DDL, then rerun:',
      '  npm run smoke:business-funnel:read -- --confirm-read-only',
      '',
      'Evidence:',
      ...details.slice(0, 8),
    ].join('\n')
  }

  return [
    'Business/Funnel smoke failed before completion.',
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
  const { CustomerInquiries } = unwrapModule(await import('../src/collections/CustomerInquiries'))
  const { Orders } = unwrapModule(await import('../src/collections/Orders'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [
      Products,
      Variants,
      MediaCollection,
      Brands,
      Categories,
      BlogPosts,
      CustomerInquiries,
      Orders,
    ],
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to Payload without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, publish, queue, or spend flags.')
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

  console.log('Business/Funnel runtime smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Funnel period: ${args.period}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const [business, funnel] = await Promise.all([
      getBusinessSnapshot(payload),
      getFunnelSnapshot(payload, { period: args.period }),
    ])

    console.log('Business snapshot')
    console.log(`  leadsToday: new ${business.leadsNewToday}, contacted ${business.leadsContactedToday}, won ${business.leadsWonToday}, lost ${business.leadsLostToday}, spam ${business.leadsSpamToday}`)
    console.log(`  leadsOpen: ${business.leadsTotalOpen} (stale ${business.leadsTotalStale}, threshold ${business.leadStaleDays}d)`)
    console.log(`  ordersToday: created ${business.ordersCreatedToday}, fromLeads ${business.ordersFromLeadsToday}, revenue ${business.revenueToday}`)
    console.log(`  ordersOpen: ${business.ordersTotalOpen} (stale shipped ${business.ordersStaleShipped}, threshold ${business.orderStaleDays}d)`)
    console.log(`  stockUrgency: soldout ${business.stockSoldout}, lowStock ${business.stockLowStock}`)
    console.log('')

    console.log('Funnel snapshot')
    console.log(`  window: ${funnel.windowLabel} since ${funnel.windowStartISO}`)
    console.log(`  sources: ${funnel.sources.length}`)
    console.log(`  leadTotal: ${funnel.totals.stages.total}`)
    console.log(`  leadWon: ${funnel.totals.stages.closed_won}`)
    console.log(`  leadLost: ${funnel.totals.stages.closed_lost}`)
    console.log(`  ordersConverted: ${funnel.totals.ordersConverted}`)
    console.log(`  revenue: ${funnel.totals.revenue}`)
    console.log(`  directOrders: ${funnel.directOrders.count} revenue ${funnel.directOrders.revenue}`)
    console.log(`  attributionCoveredLeads: ${funnel.attributionDetail?.coveredLeads ?? 0}`)

    if (funnel.sources.length > 0) {
      console.log('  topSources:')
      for (const row of funnel.sources.slice(0, 5)) {
        console.log(`  - ${row.source}: leads ${row.stages.total}, orders ${row.ordersConverted}, revenue ${row.revenue}`)
      }
    }

    console.log('')
    console.log('Smoke result: business/funnel diagnostics completed. No writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes were performed.')
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
