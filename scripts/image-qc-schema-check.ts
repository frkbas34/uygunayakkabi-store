/**
 * Read-only schema check for D-355 Image QC fields.
 *
 * This script inspects PostgreSQL information_schema only. It never writes,
 * migrates, queues jobs, calls external APIs, or imports Payload.
 *
 * Usage:
 *   npm run smoke:imageqc:schema -- --confirm-read-only
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

type CheckArgs = {
  confirmReadOnly: boolean
  mutationRequested: boolean
  verbose: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

type ColumnInfo = {
  column_name: string
  data_type: string
  udt_name: string
  is_nullable: string
  column_default: string | null
}

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

function parseArgs(argv: string[]): CheckArgs {
  let confirmReadOnly = false
  let mutationRequested = false
  let verbose = false

  for (const arg of argv) {
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg === '--verbose') verbose = true
    if (arg === '--mutate' || arg === '--allow-mutation' || arg === '--apply' || arg === '--ddl') {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_IMAGE_QC_SCHEMA_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_IMAGE_QC_SCHEMA_ALLOW_MUTATION === '1' ||
      process.env.UYAA_IMAGE_QC_SCHEMA_MUTATE === '1',
    verbose: verbose || process.env.UYAA_IMAGE_QC_SCHEMA_VERBOSE === '1',
  }
}

function printUsage(): void {
  console.log([
    'D-355 Image QC schema check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    '  --verbose',
    '',
    'Example:',
    '  npm run smoke:imageqc:schema -- --confirm-read-only',
    '',
    'This command checks information_schema for Image QC product columns and the defect-flags relation.',
    'It does not run DDL, update Payload, queue jobs, dispatch channels, call Shopier, or push schema changes.',
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

function formatBool(value: boolean): string {
  return value ? 'yes' : 'no'
}

async function getTableColumns(client: Client, tableName: string): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnInfo>(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
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

function printColumns(title: string, columns: ColumnInfo[], required: readonly string[], verbose = false): string[] {
  const missing = required.filter((column) => !hasColumn(columns, column))
  const observedRequired = columns.filter((column) => required.includes(column.column_name))
  console.log(title)
  console.log(`  table exists: ${formatBool(columns.length > 0)}`)
  console.log(`  observed total columns: ${columns.length}`)
  console.log(`  required: ${required.length}`)
  console.log(`  present: ${required.length - missing.length}`)
  console.log(`  missing: ${missing.length > 0 ? missing.join(', ') : '(none)'}`)
  if (observedRequired.length > 0 || verbose) {
    console.log(verbose ? '  observed columns:' : '  observed required columns:')
    for (const column of (verbose ? columns : observedRequired)) {
      const marker = required.includes(column.column_name) ? '*' : '-'
      console.log(`  ${marker} ${column.column_name}: ${column.data_type}${column.column_default ? ` default=${column.column_default}` : ''}`)
    }
  }
  console.log('')
  return missing
}

function printSuggestedDDL(): void {
  console.log('Reference DDL sketch to verify before applying')
  console.log([
    '```sql',
    "DO $$ BEGIN CREATE TYPE enum_products_image_quality_status AS ENUM ('pending', 'pass', 'review', 'fail'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
    "DO $$ BEGIN CREATE TYPE enum_products_image_quality_defect_flags AS ENUM ('torn_or_cracked', 'peeling_texture', 'deformed_toe_or_heel', 'wrong_stitching', 'fake_stains', 'distorted_sole_join', 'color_drift', 'invented_logo_or_brand', 'background_drift', 'crop_or_scale_issue', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
    '',
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_status enum_products_image_quality_status DEFAULT 'pending';",
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_notes text;',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_checked_at timestamptz;',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_checked_by varchar;',
    'ALTER TABLE products ADD COLUMN IF NOT EXISTS image_quality_source varchar;',
    '',
    '-- Verify exact columns/types/indexes against Payload/Drizzle output before production.',
    'CREATE TABLE IF NOT EXISTS products_image_quality_defect_flags (',
    '  "order" integer NOT NULL,',
    '  parent_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,',
    '  value enum_products_image_quality_defect_flags,',
    '  id SERIAL PRIMARY KEY',
    ');',
    '```',
  ].join('\n'))
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to the database without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this schema check is read-only and does not support mutation or DDL flags.')
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

  console.log('D-355 Image QC schema check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('Mode: read-only information_schema check')
  console.log('')

  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()
  try {
    const productColumns = await getTableColumns(client, PRODUCTS_TABLE)
    const defectColumns = await getTableColumns(client, DEFECT_FLAGS_TABLE)

    const missingProductColumns = printColumns('Products Image QC columns', productColumns, REQUIRED_PRODUCT_COLUMNS, args.verbose)
    const missingDefectColumns = printColumns('Image QC defect flags relation', defectColumns, REQUIRED_DEFECT_COLUMNS, args.verbose)
    const missingDefectTable = defectColumns.length === 0

    if (missingProductColumns.length === 0 && missingDefectColumns.length === 0 && !missingDefectTable) {
      console.log('Schema result: PASS')
      console.log('Next: npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only')
      console.log('Next: npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only')
      console.log('Next: npm run smoke:shopier:read -- --confirm-read-only')
      return
    }

    console.log('Schema result: BLOCKED')
    if (missingProductColumns.length > 0) {
      console.log(`Missing products columns: ${missingProductColumns.join(', ')}`)
    }
    if (missingDefectTable) {
      console.log(`Missing relation: ${DEFECT_FLAGS_TABLE}`)
    } else if (missingDefectColumns.length > 0) {
      console.log(`Missing defect relation columns: ${missingDefectColumns.join(', ')}`)
    }
    console.log('')
    printSuggestedDDL()
    process.exitCode = 1
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
