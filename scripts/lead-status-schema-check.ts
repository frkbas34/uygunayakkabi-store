/**
 * Read-only D-490 check for the CustomerInquiries status enum.
 *
 * Usage:
 *   npm run smoke:lead-status-schema:read -- --confirm-read-only
 *
 * It does not run DDL, update Payload, mutate leads, or call a provider.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

const ENUM_SCHEMA = 'public'
const ENUM_NAME = 'enum_customer_inquiries_status'
const REQUIRED_VALUES = ['new', 'contacted', 'follow_up', 'closed_won', 'closed_lost', 'spam', 'completed'] as const

function loadEnvFiles(): string[] {
  const loaded: string[] = []
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), fileName)
    if (!existsSync(filePath)) continue

    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
      if (!match || line.trim().startsWith('#')) continue
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (process.env[match[1]] === undefined) process.env[match[1]] = value
    }
    loaded.push(fileName)
  }
  return loaded
}

function parseArgs(argv: string[]): { confirmReadOnly: boolean; mutationRequested: boolean } {
  const args = new Set(argv)
  return {
    confirmReadOnly: args.has('--confirm-read-only') || process.env.UYAA_LEAD_STATUS_SCHEMA_CONFIRM === 'READ_ONLY',
    mutationRequested:
      ['--apply', '--ddl', '--mutate', '--allow-mutation'].some((arg) => args.has(arg)) ||
      process.env.UYAA_LEAD_STATUS_SCHEMA_ALLOW_MUTATION === '1',
  }
}

function buildClient(databaseUri: string): Client {
  return new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })
}

async function inspectEnum(client: Client): Promise<string[]> {
  const result = await client.query<{ enumlabel: string }>(
    `SELECT enum_value.enumlabel
     FROM pg_type enum_type
     JOIN pg_namespace enum_schema ON enum_schema.oid = enum_type.typnamespace
     JOIN pg_enum enum_value ON enum_value.enumtypid = enum_type.oid
     WHERE enum_schema.nspname = $1 AND enum_type.typname = $2
     ORDER BY enum_value.enumsortorder ASC`,
    [ENUM_SCHEMA, ENUM_NAME],
  )
  return result.rows.map((row) => row.enumlabel)
}

function printResult(values: string[]): boolean {
  const missing = REQUIRED_VALUES.filter((value) => !values.includes(value))
  const enumExists = values.length > 0

  console.log('D-490 customer-inquiries status enum check')
  console.log(`  public.${ENUM_NAME}: ${enumExists ? 'present' : 'missing'}`)
  console.log(`  declared values: ${values.length > 0 ? values.join(', ') : 'none'}`)
  console.log(`  required values: ${REQUIRED_VALUES.join(', ')}`)
  console.log(`  missing values: ${missing.length > 0 ? missing.join(', ') : 'none'}`)
  console.log(`Schema result: ${enumExists && missing.length === 0 ? 'PASS' : 'BLOCKED'}`)

  return enumExists && missing.length === 0
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args.confirmReadOnly) {
    console.error('Refusing to connect without --confirm-read-only.')
    process.exitCode = 2
    return
  }
  if (args.mutationRequested) {
    console.error('Refusing mutation flags: this D-490 check is read-only.')
    process.exitCode = 2
    return
  }

  const loaded = loadEnvFiles()
  const databaseUri = process.env.DATABASE_URI
  if (!databaseUri) {
    console.error('Missing required env var: DATABASE_URI')
    process.exitCode = 2
    return
  }

  console.log(`Env files loaded: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`)
  console.log('Mode: read-only pg_type and pg_enum metadata check; no writes or DDL')

  const client = buildClient(databaseUri)
  await client.connect()
  try {
    if (!printResult(await inspectEnum(client))) process.exitCode = 1
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
