/**
 * Read-only runtime smoke check for Product Intelligence / GEO providers.
 *
 * This script loads env files only after READ_ONLY confirmation. It evaluates
 * Gemini, Google Vision, DataForSEO, SerpAPI, and the effective reverse-search
 * selection without connecting to Payload and without calling external APIs.
 * It prints key names only, never secret values.
 *
 * Usage:
 *   npm run smoke:pi-provider-health:read -- --confirm-read-only
 *
 * Env alternative:
 *   UYAA_PI_PROVIDER_HEALTH_SMOKE_CONFIRM=READ_ONLY
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  evaluateProductIntelligenceProviderHealth,
  formatProductIntelligenceProviderHealthLine,
  type PiProviderHealthState,
} from '../src/lib/productIntelligence/providerHealth'

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
      arg === '--queue' ||
      arg === '--call-provider'
    ) {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_PI_PROVIDER_HEALTH_SMOKE_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_PI_PROVIDER_HEALTH_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_PI_PROVIDER_HEALTH_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Product Intelligence provider health smoke check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Example:',
    '  npm run smoke:pi-provider-health:read -- --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_PI_PROVIDER_HEALTH_SMOKE_CONFIRM=READ_ONLY',
    '',
    'This command loads env files and evaluates Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection.',
    'It prints provider states and missing key names only; it never prints secret values.',
    'It does not connect to Payload, update data, publish channels, queue jobs, call providers, call Shopier, or push schema changes.',
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

function formatStateCounts(states: PiProviderHealthState[]): string {
  const counts: Record<PiProviderHealthState, number> = {
    ready: 0,
    partial: 0,
    missing: 0,
  }

  for (const state of states) counts[state] += 1

  return `ready ${counts.ready}, partial ${counts.partial}, missing ${counts.missing}`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.confirmReadOnly) {
    console.error('Refusing to load runtime env without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation/provider-call flags.')
    process.exitCode = 2
    return
  }

  const envLoad = loadEnvFiles(process.cwd())
  const rows = evaluateProductIntelligenceProviderHealth(process.env)

  console.log('Product Intelligence provider health smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('Payload connection: not used')
  console.log('External provider calls: none')
  console.log('')

  console.log('Product Intelligence / GEO providers')
  for (const row of rows) {
    console.log(`  - ${formatProductIntelligenceProviderHealthLine(row)}`)
  }
  console.log('')
  console.log(`Summary: ${formatStateCounts(rows.map((row) => row.state))}`)
  console.log('Smoke result: PI provider health read completed. No Payload connection, writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed.')
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0)
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
