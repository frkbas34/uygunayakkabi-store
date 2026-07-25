/**
 * Guarded D-491 Orders -> CustomerInquiries relationship apply helper.
 *
 * Usage:
 *   npm run db:lead-conversion-schema:apply
 *   npm run db:lead-conversion-schema:apply -- --dry-run --print-sql
 *   npm run db:lead-conversion-schema:apply -- --apply --confirm-apply-d491-order-lead-relationship
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'd491-order-lead-relationship.sql')
const ORDERS_TABLE = 'orders'
const LEADS_TABLE = 'customer_inquiries'
const RELATIONSHIP_COLUMN = 'related_inquiry_id'

type ExistingColumn = {
  data_type: string
}

type ForeignKeyInfo = {
  constraintdef: string
}

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
  console.log('D-491 order-to-lead relationship schema plan')
  console.log(`SQL file: ${SQL_PATH}`)
  console.log('Planned schema change: add only the nullable orders.related_inquiry_id relationship when absent.')
  console.log('Telegram and order request paths never create or alter this relationship.')
  console.log('')
  console.log('SQL plan')
  console.log('```sql')
  console.log(sql.trim())
  console.log('```')
}

function hasExpectedForeignKey(constraints: ForeignKeyInfo[]): boolean {
  return constraints.some((constraint) => {
    const definition = constraint.constraintdef.replace(/"/g, '').replace(/\s+/g, ' ').toLowerCase()
    const referencesLeads =
      definition.includes('references customer_inquiries(id)') ||
      definition.includes('references public.customer_inquiries(id)')
    return definition.includes('foreign key (related_inquiry_id)') &&
      referencesLeads &&
      definition.includes('on delete set null')
  })
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const confirmed = args.has('--confirm-apply-d491-order-lead-relationship')
  const dryRun = args.has('--dry-run')
  const sql = readFileSync(SQL_PATH, 'utf8')

  if (!apply && !confirmed) {
    printPlan(sql)
    console.log('Dry-run only: no database connection opened and no DDL executed.')
    return
  }
  if (!apply || !confirmed || dryRun) {
    console.error('Refusing apply: require --apply --confirm-apply-d491-order-lead-relationship without --dry-run.')
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
    const [tablesResult, columnResult, constraintResult] = await Promise.all([
      client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [[ORDERS_TABLE, LEADS_TABLE]],
      ),
      client.query<ExistingColumn>(
        `SELECT data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [ORDERS_TABLE, RELATIONSHIP_COLUMN],
      ),
      client.query<ForeignKeyInfo>(
        `SELECT pg_get_constraintdef(constraint_row.oid) AS constraintdef
         FROM pg_constraint constraint_row
         JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
         JOIN pg_namespace table_schema ON table_schema.oid = table_row.relnamespace
         WHERE table_schema.nspname = 'public' AND table_row.relname = $1 AND constraint_row.contype = 'f'`,
        [ORDERS_TABLE],
      ),
    ])
    const tables = new Set(tablesResult.rows.map((row) => row.table_name))
    if (!tables.has(ORDERS_TABLE) || !tables.has(LEADS_TABLE)) {
      throw new Error(`Blocked: required tables missing. Need public.${ORDERS_TABLE} and public.${LEADS_TABLE}.`)
    }

    const existingColumn = columnResult.rows[0]
    const foreignKeyPresent = hasExpectedForeignKey(constraintResult.rows)
    if (existingColumn) {
      if (existingColumn.data_type !== 'integer' || !foreignKeyPresent) {
        throw new Error(
          `Blocked: existing public.${ORDERS_TABLE}.${RELATIONSHIP_COLUMN} is incompatible or lacks the expected foreign key. Manual schema review is required; no DDL was run.`,
        )
      }
      console.log('D-491 relationship already matches the required schema. No DDL was run.')
      return
    }

    await client.query(sql)
    console.log('D-491 schema DDL applied. Rerun smoke:lead-conversion-schema:read to verify metadata.')
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
