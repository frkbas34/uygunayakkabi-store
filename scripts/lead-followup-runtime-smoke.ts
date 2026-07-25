/**
 * Read-only runtime smoke check for the Lead Follow-up Plan.
 *
 * This script connects to Payload only after READ_ONLY confirmation. It runs
 * the same helper used by Telegram /leadplan and /followupplan, but it prints
 * a PII-light summary and never updates leads, messages customers, queues jobs,
 * calls providers, calls Shopier, spends on ads, activates SupplierScout, or
 * pushes schema changes.
 *
 * Usage:
 *   npm run smoke:lead-followup:read -- --confirm-read-only
 *   npm run smoke:lead-followup:read -- --limit=12 --confirm-read-only
 *
 * Env alternative:
 *   UYAA_LEAD_FOLLOWUP_SMOKE_CONFIRM=READ_ONLY
 *   UYAA_LEAD_FOLLOWUP_SMOKE_LIMIT=8
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { getLeadFollowupPlan } from '../src/lib/leadFollowupPlan'

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

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 25

function parseLimit(raw: string | undefined): number {
  if (!raw) return DEFAULT_LIMIT
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = false
  let helpRequested = false
  let limit = parseLimit(process.env.UYAA_LEAD_FOLLOWUP_SMOKE_LIMIT)
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
      arg === '--message-customer' ||
      arg === '--call-provider' ||
      arg === '--call-shopier' ||
      arg === '--activate-supplier-scout'
    ) {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_LEAD_FOLLOWUP_SMOKE_CONFIRM === 'READ_ONLY',
    helpRequested,
    limit,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_LEAD_FOLLOWUP_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_LEAD_FOLLOWUP_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Lead Follow-up Plan runtime smoke check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    `  --limit=1..${MAX_LIMIT}`,
    '',
    'Examples:',
    '  npm run smoke:lead-followup:read -- --confirm-read-only',
    '  npm run smoke:lead-followup:read -- --limit=12 --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_LEAD_FOLLOWUP_SMOKE_CONFIRM=READ_ONLY',
    '  UYAA_LEAD_FOLLOWUP_SMOKE_LIMIT=8',
    '',
    'This command reads open leads and builds the same Lead Follow-up Plan used by /leadplan and /followupplan.',
    'It prints a PII-light summary and does not update Payload, mutate leads, message customers, queue jobs, call providers, call Shopier, spend on ads, activate SupplierScout, or push schema changes.',
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
        details.push('Payload query failed while reading lead follow-up diagnostics (SQL omitted).')
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
      'Lead Follow-up Plan smoke blocked before completion: Payload DB schema appears behind the current repo schema.',
      '',
      'What this means:',
      '- The script was read-only and did not write, mutate leads, message customers, queue jobs, dispatch channels, call providers, call Shopier, spend on ads, activate SupplierScout, or push schema changes.',
      '- Apply/verify the required Payload DB migration or DDL, then rerun:',
      '  npm run smoke:lead-followup:read -- --confirm-read-only',
      '',
      'Evidence:',
      ...details.slice(0, 8),
    ].join('\n')
  }

  return [
    'Lead Follow-up Plan smoke failed before completion.',
    '',
    'No writes, lead mutations, customer messages, jobs, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, or schema pushes were performed by this script.',
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

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts, CustomerInquiries],
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

  if (args.helpRequested) {
    printUsage()
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, customer messages, publish, queue, provider, Shopier, SupplierScout, or spend flags.')
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

  console.log('Lead Follow-up Plan runtime smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Limit: ${args.limit}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const plan = await getLeadFollowupPlan(payload, { limit: args.limit })

    console.log('Lead follow-up snapshot')
    console.log(`  openLeads: ${plan.totalOpen}`)
    console.log(`  sampledOpen: ${plan.sampledOpen}`)
    console.log(`  staleThresholdDays: ${plan.staleDays}`)
    console.log(`  counts: callNow ${plan.counts.call_now}, followUpDue ${plan.counts.follow_up_due}, checkContacted ${plan.counts.check_contacted}, freshNew ${plan.counts.fresh_new}, monitor ${plan.counts.monitor}`)
    console.log('')

    console.log('Top lead actions (PII-light)')
    if (plan.items.length === 0) {
      console.log('  - No open lead rows in the current sample.')
    } else {
      for (const item of plan.items) {
        const source = item.lead.utmCampaign || item.lead.utmSource || item.lead.source || 'unknown'
        console.log(`  - lead #${item.lead.id}: status=${item.lead.status} action=${item.action} age=${item.ageDays}d ageSource=${item.ageSource} source=${source} command="${item.suggestedCommand}"`)
        console.log(`    leadAdminUrl=${item.operatorLinks.leadAdminUrl}`)
        if (item.operatorLinks.productAdminUrl || item.operatorLinks.productUrl) {
          console.log(`    productAdminUrl=${item.operatorLinks.productAdminUrl ?? '(missing)'}`)
          console.log(`    productUrl=${item.operatorLinks.productUrl ?? '(not public)'}`)
        }
      }
    }

    console.log('')
    console.log('Smoke result: lead follow-up diagnostics completed. No writes, lead mutations, customer messages, jobs, dispatches, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema pushes were performed.')
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
