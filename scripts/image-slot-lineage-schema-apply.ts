/**
 * Guarded Image Slot Lineage Schema V1 apply helper.
 *
 * Default mode is a static dry run. It does not load env files, connect to a
 * database, or execute DDL. Applying requires both explicit flags and must be
 * performed only against an operator-verified target.
 *
 * Usage:
 *   npm run db:image-slot-lineage:apply
 *   npm run db:image-slot-lineage:apply -- --dry-run --print-sql
 *   npm run db:image-slot-lineage:apply -- --apply --confirm-apply-image-slot-lineage-schema-v1
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'image-slot-lineage-schema-v1.sql')

const EXPECTED_COLUMNS = [
  { table: 'image_generation_jobs', column: 'generation_contract_version', dataType: 'character varying', udtName: 'varchar' },
  { table: 'image_generation_jobs', column: 'active_attempt_id', dataType: 'character varying', udtName: 'varchar' },
  { table: 'image_generation_jobs', column: 'generation_attempts', dataType: 'jsonb', udtName: 'jsonb' },
  { table: 'media', column: 'generation_lineage_contract_version', dataType: 'character varying', udtName: 'varchar' },
  { table: 'media', column: 'generation_lineage_job_id', dataType: 'character varying', udtName: 'varchar' },
  { table: 'media', column: 'generation_lineage_attempt_id', dataType: 'character varying', udtName: 'varchar' },
  { table: 'media', column: 'generation_lineage_slot_id', dataType: 'character varying', udtName: 'varchar' },
] as const

type ColumnInfo = {
  table_name: string
  column_name: string
  data_type: string
  udt_name: string
  is_nullable: string
  column_default: string | null
}

function loadEnvFiles(): string[] {
  const loaded: string[] = []
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), fileName)
    if (!existsSync(filePath)) continue
    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed)
      if (!match || trimmed.startsWith('#')) continue
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

function readSql(): string {
  if (!existsSync(SQL_PATH)) throw new Error(`Missing SQL plan: ${SQL_PATH}`)
  return readFileSync(SQL_PATH, 'utf8')
}

function printPlan(sql: string): void {
  console.log('Image Slot Lineage Schema V1')
  console.log(`SQL file: ${SQL_PATH}`)
  console.log(`SQL bytes: ${Buffer.byteLength(sql, 'utf8')}`)
  console.log(`SQL sha256: ${createHash('sha256').update(sql).digest('hex').slice(0, 16)}`)
  console.log('Planned change: seven nullable, default-free columns across image_generation_jobs and media.')
  console.log('No index, foreign key, backfill, data conversion, or destructive operation is included.')
}

async function readSchema(client: Client): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnInfo>(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name, ordinal_position`,
    [['image_generation_jobs', 'media']],
  )
  return result.rows
}

function verifySchema(rows: ColumnInfo[], requireAll: boolean): string[] {
  const problems: string[] = []

  for (const table of ['image_generation_jobs', 'media']) {
    if (!rows.some((row) => row.table_name === table)) problems.push(`missing table public.${table}`)
  }

  for (const expected of EXPECTED_COLUMNS) {
    const actual = rows.find(
      (row) => row.table_name === expected.table && row.column_name === expected.column,
    )
    if (!actual) {
      if (requireAll) problems.push(`missing public.${expected.table}.${expected.column}`)
      continue
    }
    if (actual.data_type !== expected.dataType || actual.udt_name !== expected.udtName) {
      problems.push(
        `incompatible public.${expected.table}.${expected.column}: ${actual.data_type}/${actual.udt_name}`,
      )
    }
    if (actual.is_nullable !== 'YES') {
      problems.push(`incompatible public.${expected.table}.${expected.column}: must be nullable`)
    }
    if (actual.column_default !== null) {
      problems.push(`incompatible public.${expected.table}.${expected.column}: must not have a default`)
    }
  }

  return problems
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const confirmed = args.has('--confirm-apply-image-slot-lineage-schema-v1')
  const dryRun = args.has('--dry-run')
  const printSql = args.has('--print-sql')
  const sql = readSql()

  if (!apply && !confirmed) {
    printPlan(sql)
    if (printSql) console.log(`\n${sql.trim()}`)
    console.log('Dry-run only: no database connection opened and no DDL executed.')
    return
  }

  if (!apply || !confirmed || dryRun) {
    console.error('Refusing apply: require --apply --confirm-apply-image-slot-lineage-schema-v1 without --dry-run.')
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
  console.log('Target identity, backup completion, and operator approval must be verified outside this helper.')

  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()
  try {
    const before = await readSchema(client)
    const preflightProblems = verifySchema(before, false)
    if (preflightProblems.length > 0) {
      throw new Error(
        `Blocked by incompatible existing schema: ${preflightProblems.join('; ')}. Manual schema review is required; no DDL was run.`,
      )
    }

    await client.query(sql)

    const after = await readSchema(client)
    const postApplyProblems = verifySchema(after, true)
    if (postApplyProblems.length > 0) {
      throw new Error(`DDL completed but verification failed: ${postApplyProblems.join('; ')}`)
    }

    console.log('Schema result: PASS — all seven columns have the expected nullable, default-free types.')
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
