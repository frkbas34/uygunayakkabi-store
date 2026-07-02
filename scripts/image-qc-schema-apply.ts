/**
 * Guarded D-355 Image QC schema repair runner.
 *
 * Default mode is dry-run only. The script will not connect to PostgreSQL or
 * run DDL unless the operator supplies the explicit apply confirmation.
 *
 * Usage:
 *   npm run db:imageqc:apply
 *   npm run db:imageqc:apply -- --dry-run --print-sql
 *   npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
 *
 * Env alternative for apply:
 *   UYAA_IMAGE_QC_SCHEMA_APPLY_CONFIRM=APPLY_D355_IMAGE_QC_SCHEMA
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

type ApplyArgs = {
  confirmApply: boolean
  dryRun: boolean
  printSql: boolean
  mutationRequested: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

type ColumnInfo = {
  column_name: string
}

type SchemaVerification = {
  ok: boolean
  missingProductColumns: string[]
  missingDefectColumns: string[]
  missingDefectTable: boolean
}

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'd355-image-qc-schema.sql')
const PRODUCTS_TABLE = 'products'
const DEFECT_FLAGS_TABLE = 'products_image_quality_defect_flags'

const REQUIRED_PRODUCT_COLUMNS = [
  'image_quality_status',
  'image_quality_notes',
  'image_quality_checked_at',
  'image_quality_checked_by',
  'image_quality_source',
] as const

const REQUIRED_DEFECT_COLUMNS = ['order', 'parent_id', 'value', 'id'] as const

function parseArgs(argv: string[]): ApplyArgs {
  let confirmApply = false
  let dryRun = false
  let printSql = false
  let mutationRequested = false

  for (const arg of argv) {
    if (arg === '--confirm-apply-d355-image-qc-schema') confirmApply = true
    if (arg === '--dry-run') dryRun = true
    if (arg === '--print-sql') printSql = true
    if (arg === '--apply' || arg === '--ddl' || arg === '--mutate') mutationRequested = true
  }

  const envConfirm = process.env.UYAA_IMAGE_QC_SCHEMA_APPLY_CONFIRM

  return {
    confirmApply: confirmApply || envConfirm === 'APPLY_D355_IMAGE_QC_SCHEMA',
    dryRun,
    printSql,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_IMAGE_QC_SCHEMA_APPLY === '1' ||
      process.env.UYAA_IMAGE_QC_SCHEMA_ALLOW_MUTATION === '1',
  }
}

function printUsage(): void {
  console.log([
    'D-355 Image QC schema apply helper',
    '',
    'Default:',
    '  npm run db:imageqc:apply',
    '  Prints a dry-run plan only. It does not connect to PostgreSQL or run DDL.',
    '',
    'Optional dry-run:',
    '  npm run db:imageqc:apply -- --dry-run --print-sql',
    '',
    'Apply, operator-run only:',
    '  npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema',
    '',
    'Env alternative:',
    '  UYAA_IMAGE_QC_SCHEMA_APPLY_CONFIRM=APPLY_D355_IMAGE_QC_SCHEMA',
    '',
    'After apply:',
    '  npm run smoke:imageqc:schema -- --confirm-read-only',
    '  npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only',
    '  npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only',
    '  npm run smoke:shopier:read -- --confirm-read-only',
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

function readSqlPlan(): string {
  if (!existsSync(SQL_PATH)) {
    throw new Error(`Missing D-355 SQL plan: ${SQL_PATH}`)
  }

  return readFileSync(SQL_PATH, 'utf8')
}

function hashSql(sql: string): string {
  return createHash('sha256').update(sql).digest('hex').slice(0, 16)
}

function printPlan(sql: string, mode: 'dry-run' | 'apply', envLoad?: EnvLoadResult): void {
  console.log('D-355 Image QC schema repair')
  console.log(`Mode: ${mode}`)
  console.log(`SQL file: ${SQL_PATH}`)
  console.log(`SQL bytes: ${Buffer.byteLength(sql, 'utf8')}`)
  console.log(`SQL sha256: ${hashSql(sql)}`)
  if (envLoad) {
    console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  }
  console.log('')
  console.log('Planned schema changes:')
  console.log('- create Image QC status enum if missing')
  console.log('- create Image QC defect-flags enum if missing')
  console.log('- add image_quality_* columns to products if missing')
  console.log('- create products_image_quality_defect_flags if missing')
  console.log('- add parent foreign key and supporting indexes if missing')
  console.log('')
}

function printSql(sql: string): void {
  console.log('SQL plan')
  console.log('```sql')
  console.log(sql.trim())
  console.log('```')
  console.log('')
}

async function getTableColumns(client: Client, tableName: string): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnInfo>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position ASC`,
    [tableName],
  )
  return result.rows
}

function hasColumn(columns: ColumnInfo[], name: string): boolean {
  return columns.some((column) => column.column_name === name)
}

async function verifyImageQcSchema(client: Client): Promise<SchemaVerification> {
  const productColumns = await getTableColumns(client, PRODUCTS_TABLE)
  const defectColumns = await getTableColumns(client, DEFECT_FLAGS_TABLE)

  const missingProductColumns = REQUIRED_PRODUCT_COLUMNS.filter((column) => !hasColumn(productColumns, column))
  const missingDefectColumns = REQUIRED_DEFECT_COLUMNS.filter((column) => !hasColumn(defectColumns, column))
  const missingDefectTable = defectColumns.length === 0

  return {
    ok: missingProductColumns.length === 0 && missingDefectColumns.length === 0 && !missingDefectTable,
    missingProductColumns,
    missingDefectColumns,
    missingDefectTable,
  }
}

function printVerification(verification: SchemaVerification): void {
  console.log('Post-apply schema verification')
  console.log(`  products columns: ${REQUIRED_PRODUCT_COLUMNS.length - verification.missingProductColumns.length}/${REQUIRED_PRODUCT_COLUMNS.length}`)
  console.log(`  defect relation: ${verification.missingDefectTable ? 'missing' : 'present'}`)
  console.log(`  defect columns: ${REQUIRED_DEFECT_COLUMNS.length - verification.missingDefectColumns.length}/${REQUIRED_DEFECT_COLUMNS.length}`)

  if (verification.ok) {
    console.log('Schema result: PASS')
    return
  }

  console.log('Schema result: BLOCKED')
  if (verification.missingProductColumns.length > 0) {
    console.log(`Missing products columns: ${verification.missingProductColumns.join(', ')}`)
  }
  if (verification.missingDefectTable) {
    console.log(`Missing relation: ${DEFECT_FLAGS_TABLE}`)
  } else if (verification.missingDefectColumns.length > 0) {
    console.log(`Missing defect relation columns: ${verification.missingDefectColumns.join(', ')}`)
  }
}

function buildClient(databaseUri: string): Client {
  return new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const sql = readSqlPlan()

  if (!args.confirmApply) {
    printPlan(sql, 'dry-run')
    if (args.printSql) printSql(sql)

    if (args.mutationRequested) {
      console.error('Refusing to apply D-355 Image QC schema without explicit apply confirmation.')
      console.error('Required flag: --confirm-apply-d355-image-qc-schema')
      process.exitCode = 2
      return
    }

    console.log('Dry-run only: no database connection opened and no DDL executed.')
    console.log('Use --apply --confirm-apply-d355-image-qc-schema only when the operator is ready to run the reviewed DDL.')
    return
  }

  if (!args.mutationRequested && process.env.UYAA_IMAGE_QC_SCHEMA_APPLY !== '1') {
    console.error('Apply confirmation was supplied, but no apply intent was supplied.')
    console.error('Add --apply with --confirm-apply-d355-image-qc-schema.')
    process.exitCode = 2
    return
  }

  if (args.dryRun) {
    console.error('Refusing conflicting flags: --dry-run cannot be combined with apply confirmation.')
    process.exitCode = 2
    return
  }

  const envLoad = loadEnvFiles(process.cwd())
  const databaseUri = process.env.DATABASE_URI
  if (!databaseUri) {
    console.error('Missing required env var: DATABASE_URI')
    process.exitCode = 2
    return
  }

  printPlan(sql, 'apply', envLoad)
  console.log('Applying D-355 Image QC schema DDL now.')
  console.log('')

  const client = buildClient(databaseUri)
  await client.connect()
  try {
    await client.query(sql)
    console.log('DDL execution completed.')
    console.log('')

    const verification = await verifyImageQcSchema(client)
    printVerification(verification)
    if (!verification.ok) process.exitCode = 1
  } finally {
    await client.end()
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0)
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
