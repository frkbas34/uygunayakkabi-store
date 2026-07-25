/**
 * Read-only D-481 check for the concurrent Shopier order-ID uniqueness index.
 *
 * Usage:
 *   npm run smoke:shopier-order-id-schema:read -- --confirm-read-only
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

type Args = {
  confirmReadOnly: boolean
  mutationRequested: boolean
  verbose: boolean
}

type EnvLoadResult = {
  loaded: string[]
}

type ColumnInfo = {
  column_name: string
  data_type: string
  is_nullable: string
}

type IndexInfo = {
  indexname: string
  indexdef: string
}

type DuplicateOrderId = {
  shopier_order_id: string
  count: string
}

const ORDERS_TABLE = 'orders'
const SHOPIER_ORDER_ID_COLUMN = 'shopier_order_id'
const EXPECTED_INDEX = 'orders_shopier_order_id_unique_idx'

function parseArgs(argv: string[]): Args {
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
    confirmReadOnly: confirmReadOnly || process.env.UYAA_SHOPIER_ORDER_ID_SCHEMA_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_SHOPIER_ORDER_ID_SCHEMA_ALLOW_MUTATION === '1' ||
      process.env.UYAA_SHOPIER_ORDER_ID_SCHEMA_MUTATE === '1',
    verbose: verbose || process.env.UYAA_SHOPIER_ORDER_ID_SCHEMA_VERBOSE === '1',
  }
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
  const loaded: string[] = []

  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(cwd, fileName)
    if (!existsSync(filePath)) continue

    for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue
      const [key, value] = parsed
      if (process.env[key] === undefined) process.env[key] = value
    }
    loaded.push(fileName)
  }

  return { loaded }
}

function isExpectedIndex(index: IndexInfo): boolean {
  return /CREATE UNIQUE INDEX/i.test(index.indexdef) &&
    /\(shopier_order_id\)/i.test(index.indexdef) &&
    /WHERE/i.test(index.indexdef) &&
    /shopier_order_id IS NOT NULL/i.test(index.indexdef) &&
    // PostgreSQL may canonicalize btrim(shopier_order_id) as
    // btrim((shopier_order_id)::text) when it stores the partial-index predicate.
    /btrim\(\s*\(?\s*shopier_order_id\s*\)?(?:\s*::\s*text)?\s*\)/i.test(index.indexdef)
}

function isTextCompatibleColumn(column: ColumnInfo | undefined): boolean {
  return column?.data_type === 'text' || column?.data_type === 'character varying'
}

function printUsage(): void {
  console.log([
    'D-481 Shopier order-ID uniqueness schema check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Example:',
    '  npm run smoke:shopier-order-id-schema:read -- --confirm-read-only',
    '',
    'This inspects information_schema and pg_indexes plus duplicate non-empty Shopier IDs.',
    'It does not run DDL, update Payload, mutate orders, queue jobs, or call Shopier.',
  ].join('\n'))
}

function printRepairPath(): void {
  console.log('Schema result: BLOCKED')
  console.log('Repair helper (dry-run by default):')
  console.log('  npm run db:shopier-order-id-unique:apply -- --dry-run --print-sql')
  console.log('Operator-approved apply only:')
  console.log('  npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique')
  console.log('After an approved apply:')
  console.log('  npm run smoke:shopier-order-id-schema:read -- --confirm-read-only')
  console.log('  npm run test:shopier-webhook-local')
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

  console.log('D-481 Shopier order-ID uniqueness schema check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('Mode: read-only information_schema, pg_indexes, and duplicate-ID check')
  console.log('')

  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()
  try {
    const [columnsResult, indexResult, duplicateResult] = await Promise.all([
      client.query<ColumnInfo>(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [ORDERS_TABLE, SHOPIER_ORDER_ID_COLUMN],
      ),
      client.query<IndexInfo>(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = $1 AND indexname = $2`,
        [ORDERS_TABLE, EXPECTED_INDEX],
      ),
      client.query<DuplicateOrderId>(
        `SELECT shopier_order_id, count(*)::text AS count
         FROM public.orders
         WHERE shopier_order_id IS NOT NULL AND btrim(shopier_order_id) <> ''
         GROUP BY shopier_order_id
         HAVING count(*) > 1
         ORDER BY count(*) DESC, shopier_order_id ASC
         LIMIT 20`,
      ),
    ])

    const column = columnsResult.rows[0]
    const index = indexResult.rows[0]
    const indexIsExpected = Boolean(index && isExpectedIndex(index))

    console.log(`${ORDERS_TABLE}.${SHOPIER_ORDER_ID_COLUMN}: ${column ? `${column.data_type}, nullable=${column.is_nullable}` : 'missing'}`)
    console.log(`${EXPECTED_INDEX}: ${indexIsExpected ? 'present' : index ? 'present but incompatible' : 'missing'}`)
    console.log(`Duplicate non-empty Shopier IDs: ${duplicateResult.rows.length}`)
    if (args.verbose && index) console.log(`Index definition: ${index.indexdef}`)
    if (args.verbose && duplicateResult.rows.length > 0) {
      for (const duplicate of duplicateResult.rows) {
        console.log(`  ${duplicate.shopier_order_id}: ${duplicate.count}`)
      }
    }
    console.log('')

    if (isTextCompatibleColumn(column) && indexIsExpected && duplicateResult.rows.length === 0) {
      console.log('Schema result: PASS')
      console.log('Next: npm run test:shopier-webhook-local')
      return
    }

    if (!column) console.log(`Missing required column: ${ORDERS_TABLE}.${SHOPIER_ORDER_ID_COLUMN}`)
    if (column && !isTextCompatibleColumn(column)) {
      console.log(`Incompatible column type: ${column.data_type}; expected text or character varying`)
    }
    if (index && !indexIsExpected) console.log(`Incompatible index definition: ${EXPECTED_INDEX}`)
    if (duplicateResult.rows.length > 0) console.log('Duplicate IDs must be reconciled before a unique index can be applied.')
    console.log('')
    printRepairPath()
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
