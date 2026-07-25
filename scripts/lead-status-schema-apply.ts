/**
 * Guarded D-490 CustomerInquiries status-enum apply helper.
 *
 * Usage:
 *   npm run db:lead-status-enum:apply
 *   npm run db:lead-status-enum:apply -- --dry-run --print-sql
 *   npm run db:lead-status-enum:apply -- --apply --confirm-apply-d490-lead-status-enum
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'd490-lead-status-enum.sql')
const ENUM_SCHEMA = 'public'
const ENUM_NAME = 'enum_customer_inquiries_status'
const BASELINE_VALUES = ['new', 'contacted', 'completed'] as const

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

function printPlan(sql: string): void {
  console.log('D-490 customer-inquiries status enum plan')
  console.log(`SQL file: ${SQL_PATH}`)
  console.log('Planned schema change: add only the four post-baseline lead statuses when missing.')
  console.log('Telegram and lead-status request paths never change enum values.')
  console.log('')
  console.log('SQL plan')
  console.log('```sql')
  console.log(sql.trim())
  console.log('```')
}

async function getEnumValues(client: Client): Promise<string[]> {
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

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const confirmed = args.has('--confirm-apply-d490-lead-status-enum')
  const dryRun = args.has('--dry-run')
  const sql = readFileSync(SQL_PATH, 'utf8')

  if (!apply && !confirmed) {
    printPlan(sql)
    console.log('Dry-run only: no database connection opened and no DDL executed.')
    return
  }
  if (!apply || !confirmed || dryRun) {
    console.error('Refusing apply: require --apply --confirm-apply-d490-lead-status-enum without --dry-run.')
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

  printPlan(sql)
  console.log(`Env files loaded: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`)
  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()
  try {
    const values = await getEnumValues(client)
    const missingBaseline = BASELINE_VALUES.filter((value) => !values.includes(value))
    if (values.length === 0 || missingBaseline.length > 0) {
      throw new Error(
        `Blocked: public.${ENUM_NAME} is missing or incompatible. Missing baseline values: ${missingBaseline.join(', ') || 'none'}.`,
      )
    }

    await client.query(sql)
    console.log('D-490 schema DDL applied. Rerun smoke:lead-status-schema:read to verify metadata.')
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
