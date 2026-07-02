/**
 * Read-only runtime smoke check for active channel provider health.
 *
 * This script connects to Payload only after READ_ONLY confirmation. It reads
 * AutomationSettings, evaluates Website/Instagram/Facebook/X/Shopier provider
 * health, and prints key names only. It never prints secret values, updates
 * Payload, dispatches channels, queues jobs, calls providers, calls Shopier, or
 * pushes schema changes.
 *
 * Usage:
 *   npm run smoke:provider-health:read -- --confirm-read-only
 *
 * Env alternative:
 *   UYAA_PROVIDER_HEALTH_SMOKE_CONFIRM=READ_ONLY
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { evaluateChannelProviderHealth, formatChannelProviderHealthLine } from '../src/lib/channelProviderHealth'
import type { AutomationSettingsSnapshot } from '../src/lib/automationDecision'
import type { ProviderHealthState } from '../src/lib/channelProviderHealth'

type SmokeArgs = {
  confirmReadOnly: boolean
  mutationRequested: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = false
  let mutationRequested = false

  for (const arg of argv) {
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (
      arg === '--mutate' ||
      arg === '--allow-mutation' ||
      arg === '--confirm' ||
      arg === '--apply' ||
      arg === '--publish' ||
      arg === '--queue'
    ) {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_PROVIDER_HEALTH_SMOKE_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_PROVIDER_HEALTH_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_PROVIDER_HEALTH_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Provider health runtime smoke check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Example:',
    '  npm run smoke:provider-health:read -- --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_PROVIDER_HEALTH_SMOKE_CONFIRM=READ_ONLY',
    '',
    'This command reads AutomationSettings, evaluates Website/Instagram/Facebook/X/Shopier provider health, and exits.',
    'It prints provider states and missing key names only; it never prints secret values.',
    'It does not update Payload, publish channels, queue jobs, call providers, call Shopier, or push schema changes.',
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
        details.push('Payload query failed while reading AutomationSettings (SQL omitted).')
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

  return [
    'Provider health smoke failed before completion.',
    '',
    'No writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed by this script.',
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

  const { AutomationSettings } = unwrapModule(await import('../src/globals/AutomationSettings'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
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
    globals: [AutomationSettings],
    secret: process.env.PAYLOAD_SECRET!,
    sharp: sharpMod.default,
  })

  return payloadMod.getPayload({ config })
}

function formatStateCounts(states: ProviderHealthState[]): string {
  const counts: Record<ProviderHealthState, number> = {
    ready: 0,
    fallback: 0,
    disabled: 0,
    missing: 0,
  }

  for (const state of states) counts[state] += 1

  return `ready ${counts.ready}, fallback ${counts.fallback}, disabled ${counts.disabled}, missing ${counts.missing}`
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

  console.log('Provider health runtime smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const automationSettings = await payload.findGlobal({
      slug: 'automation-settings',
    }) as AutomationSettingsSnapshot | null

    const healthRows = evaluateChannelProviderHealth(automationSettings, process.env)

    console.log('Channel providers')
    for (const row of healthRows) {
      console.log(`  - ${formatChannelProviderHealthLine(row)}`)
    }
    console.log('')
    console.log(`Summary: ${formatStateCounts(healthRows.map((row) => row.state))}`)
    console.log('Smoke result: provider health read completed. No writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed.')
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
