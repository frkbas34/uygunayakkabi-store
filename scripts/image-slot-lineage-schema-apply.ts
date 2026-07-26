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
import { pathToFileURL } from 'node:url'

import { Client } from 'pg'

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'image-slot-lineage-schema-v1.sql')

export const SUPERSEDED_SQL_SHA256 = '45963ef7ff50cdb99f3ed95bfe2e1f86d456ca99c95a7a5b325b47d3200518ac'
export const EXPECTED_SQL_SHA256 = '06191f196144259fb1992245b29849aa9353645e2160a03fc13b2f3f654961e2'
export const TARGET_DATABASE_URI_ENV = 'IMAGE_SLOT_LINEAGE_DATABASE_URI'

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

function readSql(): string {
  if (!existsSync(SQL_PATH)) throw new Error(`Missing SQL plan: ${SQL_PATH}`)
  return readFileSync(SQL_PATH, 'utf8')
}

function sqlSha256(sql: string): string {
  return createHash('sha256').update(sql).digest('hex')
}

function verifySqlHash(sql: string): void {
  const actual = sqlSha256(sql)
  if (actual !== EXPECTED_SQL_SHA256) {
    throw new Error(`Blocked by SQL hash mismatch: expected ${EXPECTED_SQL_SHA256}, received ${actual}.`)
  }
}

function connectionIdentity(uri: string, label: string): string {
  try {
    const parsed = new URL(uri)
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      throw new Error('unsupported protocol')
    }
    const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
    if (!parsed.hostname || !database) throw new Error('missing host or database')
    return `${parsed.hostname.toLowerCase()}|${parsed.port || '5432'}|${database}`
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URI with a host and database name.`)
  }
}

export function assertDedicatedTarget(targetDatabaseUri: string, applicationDatabaseUri?: string): void {
  const targetIdentity = connectionIdentity(targetDatabaseUri, TARGET_DATABASE_URI_ENV)
  if (
    applicationDatabaseUri &&
    connectionIdentity(applicationDatabaseUri, 'DATABASE_URI') === targetIdentity
  ) {
    throw new Error(`${TARGET_DATABASE_URI_ENV} resolves to the configured application database.`)
  }
}

function redactErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[REDACTED_DATABASE_URI]')
}

function printPlan(sql: string): void {
  console.log('Image Slot Lineage Schema V1')
  console.log(`SQL file: ${SQL_PATH}`)
  console.log(`SQL bytes: ${Buffer.byteLength(sql, 'utf8')}`)
  console.log(`SQL sha256: ${sqlSha256(sql)}`)
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

export async function executeMigrationTransaction(client: Client, sql: string): Promise<void> {
  await client.query('BEGIN')
  try {
    await client.query(sql)

    const after = await readSchema(client)
    const postApplyProblems = verifySchema(after, true)
    if (postApplyProblems.length > 0) {
      throw new Error(`DDL verification failed: ${postApplyProblems.join('; ')}`)
    }

    await client.query('COMMIT')
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Migration failed and the caller-owned transaction could not be rolled back safely.',
      )
    }
    throw error
  }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const confirmed = args.has('--confirm-apply-image-slot-lineage-schema-v1')
  const dryRun = args.has('--dry-run')
  const printSql = args.has('--print-sql')

  if (!apply && !confirmed) {
    const dryRunSql = readSql()
    verifySqlHash(dryRunSql)
    printPlan(dryRunSql)
    if (printSql) console.log(`\n${dryRunSql.trim()}`)
    console.log('Dry-run only: no database connection opened and no DDL executed.')
    return
  }

  if (!apply || !confirmed || dryRun) {
    console.error('Refusing apply: require --apply --confirm-apply-image-slot-lineage-schema-v1 without --dry-run.')
    process.exitCode = 2
    return
  }

  const targetDatabaseUri = process.env[TARGET_DATABASE_URI_ENV]?.trim()
  if (!targetDatabaseUri) {
    console.error(`Missing required explicit env var: ${TARGET_DATABASE_URI_ENV}`)
    process.exitCode = 2
    return
  }

  const applicationDatabaseUri = process.env.DATABASE_URI?.trim()
  try {
    assertDedicatedTarget(targetDatabaseUri, applicationDatabaseUri)
  } catch (error) {
    console.error(`Refusing apply: ${redactErrorMessage(error)}`)
    process.exitCode = 2
    return
  }

  const sql = readSql()
  verifySqlHash(sql)

  printPlan(sql)
  console.log(`Target variable: ${TARGET_DATABASE_URI_ENV} (value redacted)`)
  console.log('Transaction owner: guarded apply helper')
  console.log('Target identity, backup completion, and operator approval must be verified outside this helper.')

  const client = new Client({
    connectionString: targetDatabaseUri,
    ssl: targetDatabaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
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

    await executeMigrationTransaction(client, sql)

    console.log('Transaction outcome: COMMIT')
    console.log('Schema result: PASS — all seven columns have the expected nullable, default-free types.')
  } finally {
    await client.end()
  }
}

const entryPoint = process.argv[1]
if (entryPoint && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href) {
  void main().catch((error) => {
    console.error(redactErrorMessage(error))
    process.exit(1)
  })
}
