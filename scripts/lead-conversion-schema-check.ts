/**
 * Read-only D-491 check for the Orders -> CustomerInquiries relationship.
 *
 * Usage:
 *   npm run smoke:lead-conversion-schema:read -- --confirm-read-only
 *
 * It does not run DDL, create orders, update leads, or call a provider.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

const ORDERS_TABLE = 'orders'
const LEADS_TABLE = 'customer_inquiries'
const RELATIONSHIP_COLUMN = 'related_inquiry_id'

type ColumnInfo = {
  data_type: string
  is_nullable: string
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

function parseArgs(argv: string[]): { confirmReadOnly: boolean; mutationRequested: boolean } {
  const args = new Set(argv)
  return {
    confirmReadOnly: args.has('--confirm-read-only') || process.env.UYAA_LEAD_CONVERSION_SCHEMA_CONFIRM === 'READ_ONLY',
    mutationRequested:
      ['--apply', '--ddl', '--mutate', '--allow-mutation'].some((arg) => args.has(arg)) ||
      process.env.UYAA_LEAD_CONVERSION_SCHEMA_ALLOW_MUTATION === '1',
  }
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

function printRepairPath(): void {
  console.log('Schema result: BLOCKED')
  console.log('Repair helper (dry-run by default):')
  console.log('  npm run db:lead-conversion-schema:apply -- --dry-run --print-sql')
  console.log('Operator-approved apply only:')
  console.log('  npm run db:lead-conversion-schema:apply -- --apply --confirm-apply-d491-order-lead-relationship')
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args.confirmReadOnly) {
    console.error('Refusing to connect without --confirm-read-only.')
    process.exitCode = 2
    return
  }
  if (args.mutationRequested) {
    console.error('Refusing mutation flags: this D-491 check is read-only.')
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

  console.log('D-491 order-to-lead relationship schema check')
  console.log(`Env files loaded: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`)
  console.log('Mode: read-only information_schema and pg_constraint metadata check; no writes or DDL')

  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()
  try {
    const [columnResult, constraintResult] = await Promise.all([
      client.query<ColumnInfo>(
        `SELECT data_type, is_nullable
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

    const column = columnResult.rows[0]
    const columnCompatible = column?.data_type === 'integer' && column.is_nullable === 'YES'
    const foreignKeyPresent = hasExpectedForeignKey(constraintResult.rows)

    console.log(`${ORDERS_TABLE}.${RELATIONSHIP_COLUMN}: ${column ? `${column.data_type}, nullable=${column.is_nullable}` : 'missing'}`)
    console.log(`${ORDERS_TABLE}.${RELATIONSHIP_COLUMN} -> ${LEADS_TABLE}.id FK: ${foreignKeyPresent ? 'present' : 'missing or incompatible'}`)
    if (columnCompatible && foreignKeyPresent) {
      console.log('Schema result: PASS')
      return
    }

    if (column && !columnCompatible) console.log('Column must be a nullable integer relationship field.')
    printRepairPath()
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
