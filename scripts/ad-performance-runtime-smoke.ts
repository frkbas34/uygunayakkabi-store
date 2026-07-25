/**
 * Read-only runtime smoke check for manual ad performance reporting.
 *
 * This script connects to Payload only after READ_ONLY confirmation. It runs
 * the same helper used by Telegram /adreport, but it never updates products,
 * leads, orders, jobs, providers, Shopier, ads, or schema.
 *
 * Usage:
 *   npm run smoke:ad-performance:read -- --confirm-read-only
 *   npm run smoke:ad-performance:read -- --period=month --confirm-read-only
 *
 * Env alternative:
 *   UYAA_AD_PERFORMANCE_SMOKE_CONFIRM=READ_ONLY
 *   UYAA_AD_PERFORMANCE_SMOKE_PERIOD=week
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  getAdPerformanceSnapshot,
  parseAdPerformancePeriod,
  type AdPerformancePeriod,
} from '../src/lib/adPerformance'

type SmokeArgs = {
  confirmReadOnly: boolean
  helpRequested: boolean
  mutationRequested: boolean
  period: AdPerformancePeriod
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = false
  let helpRequested = false
  let mutationRequested = false
  let period = parseAdPerformancePeriod(process.env.UYAA_AD_PERFORMANCE_SMOKE_PERIOD)

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') helpRequested = true
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg.startsWith('--period=')) {
      period = parseAdPerformancePeriod(arg.slice('--period='.length))
    }
    if (
      arg === '--mutate' ||
      arg === '--allow-mutation' ||
      arg === '--confirm' ||
      arg === '--apply' ||
      arg === '--publish' ||
      arg === '--queue' ||
      arg === '--spend' ||
      arg === '--call-provider' ||
      arg === '--call-shopier'
    ) {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_AD_PERFORMANCE_SMOKE_CONFIRM === 'READ_ONLY',
    helpRequested,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_AD_PERFORMANCE_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_AD_PERFORMANCE_SMOKE_MUTATE === '1',
    period,
  }
}

function printUsage(): void {
  console.log([
    'Ad performance runtime smoke check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    '  --period=today|week|month',
    '',
    'Examples:',
    '  npm run smoke:ad-performance:read -- --confirm-read-only',
    '  npm run smoke:ad-performance:read -- --period=month --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_AD_PERFORMANCE_SMOKE_CONFIRM=READ_ONLY',
    '  UYAA_AD_PERFORMANCE_SMOKE_PERIOD=week',
    '',
    'This command reads manual ad performance using the same helper as /adreport.',
    'It does not update Payload, mutate leads/orders, publish channels, queue jobs, call providers, call Shopier, spend on ads, or push schema changes.',
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
        details.push('Payload query failed while reading ad performance diagnostics (SQL omitted).')
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
      'Ad performance smoke blocked before completion: Payload DB schema appears behind the current repo schema.',
      '',
      'What this means:',
      '- The script was read-only and did not write, queue jobs, dispatch channels, call providers, call Shopier, spend on ads, or push schema changes.',
      '- Apply/verify the required Payload DB migration or DDL, then rerun:',
      '  npm run smoke:ad-performance:read -- --confirm-read-only',
      '',
      'Evidence:',
      ...details.slice(0, 8),
    ].join('\n')
  }

  return [
    'Ad performance smoke failed before completion.',
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

function money(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function rate(value: number): string {
  return `${Math.round(value * 100)}%`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.helpRequested) {
    printUsage()
    return
  }

  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to Payload without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, publish, queue, provider, Shopier, or spend flags.')
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

  console.log('Ad performance runtime smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Period: ${args.period}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const snapshot = await getAdPerformanceSnapshot(payload, { period: args.period })
    const t = snapshot.totals

    console.log('Ad performance snapshot')
    console.log(`  window: ${snapshot.windowLabel} since ${snapshot.windowStartISO}`)
    console.log(`  campaignRows: ${snapshot.rows.length}`)
    console.log(`  taggedLeads: ${t.leads}`)
    console.log(`  openLeads: ${t.openLeads}`)
    console.log(`  staleOpenLeads: ${t.staleOpenLeads} (threshold ${snapshot.staleDays}d)`)
    console.log(`  won/lost/spam: ${t.wonLeads}/${t.lostLeads}/${t.spamLeads}`)
    console.log(`  relatedOrders: ${t.orders}`)
    console.log(`  relatedRevenue: ${money(t.revenue)}`)
    console.log(`  conversionRate: ${rate(t.conversionRate)}`)
    console.log(`  averageOrderValue: ${money(t.averageOrderValue)}`)
    console.log(`  untaggedLeads: ${snapshot.untaggedLeads}`)
    console.log(`  directOrders: ${snapshot.directOrders.count} revenue ${money(snapshot.directOrders.revenue)}`)

    if (snapshot.rows.length > 0) {
      console.log('  topCampaignRows:')
      for (const row of snapshot.rows.slice(0, 5)) {
        console.log(
          `  - ${row.source}/${row.medium}/${row.campaign}: ` +
          `leads ${row.leads}, orders ${row.orders}, revenue ${money(row.revenue)}, cvr ${rate(row.conversionRate)}`,
        )
      }
    }

    console.log('')
    console.log('Guardrails')
    for (const guardrail of snapshot.guardrails) console.log(`  - ${guardrail}`)
    console.log('')
    console.log('Smoke result: ad-performance diagnostics completed. No writes, jobs, dispatches, provider calls, Shopier calls, ad spend, external ad API calls, or schema pushes were performed.')
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
