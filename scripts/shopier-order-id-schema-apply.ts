/**
 * Guarded D-481 Shopier order-ID unique-index runner.
 *
 * Default mode is dry-run only. It does not connect to PostgreSQL or run DDL
 * until both explicit apply flags are supplied.
 *
 * Usage:
 *   npm run db:shopier-order-id-unique:apply
 *   npm run db:shopier-order-id-unique:apply -- --dry-run --print-sql
 *   npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

type Args = {
  apply: boolean
  confirmApply: boolean
  dryRun: boolean
  printSql: boolean
}

type EnvLoadResult = {
  loaded: string[]
}

type DuplicateOrderId = {
  shopier_order_id: string
  count: string
}

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'd481-shopier-order-id-unique.sql')
const APPLY_CONFIRMATION = 'APPLY_D481_SHOPIER_ORDER_ID_UNIQUE'

function parseArgs(argv: string[]): Args {
  let apply = false
  let confirmApply = false
  let dryRun = false
  let printSql = false

  for (const arg of argv) {
    if (arg === '--apply' || arg === '--ddl' || arg === '--mutate') apply = true
    if (arg === '--confirm-apply-d481-shopier-order-id-unique') confirmApply = true
    if (arg === '--dry-run') dryRun = true
    if (arg === '--print-sql') printSql = true
  }

  return {
    apply: apply || process.env.UYAA_SHOPIER_ORDER_ID_SCHEMA_APPLY === '1',
    confirmApply:
      confirmApply || process.env.UYAA_SHOPIER_ORDER_ID_SCHEMA_APPLY_CONFIRM === APPLY_CONFIRMATION,
    dryRun,
    printSql,
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

function readSqlPlan(): string {
  if (!existsSync(SQL_PATH)) throw new Error(`Missing D-481 SQL plan: ${SQL_PATH}`)
  return readFileSync(SQL_PATH, 'utf8')
}

function printPlan(sql: string, mode: 'dry-run' | 'apply', envLoad?: EnvLoadResult): void {
  console.log('D-481 Shopier order-ID unique-index migration')
  console.log(`Mode: ${mode}`)
  console.log(`SQL file: ${SQL_PATH}`)
  console.log(`SQL sha256: ${createHash('sha256').update(sql).digest('hex').slice(0, 16)}`)
  if (envLoad) console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('')
  console.log('Planned schema change:')
  console.log('- create a partial unique index for non-empty orders.shopier_order_id values')
  console.log('- run CREATE INDEX CONCURRENTLY outside a transaction')
  console.log('- reject the apply if duplicate non-empty Shopier IDs already exist')
  console.log('')
}

function printSql(sql: string): void {
  console.log('SQL plan')
  console.log('```sql')
  console.log(sql.trim())
  console.log('```')
  console.log('')
}

async function findDuplicateOrderIds(client: Client): Promise<DuplicateOrderId[]> {
  const result = await client.query<DuplicateOrderId>(
    `SELECT shopier_order_id, count(*)::text AS count
     FROM public.orders
     WHERE shopier_order_id IS NOT NULL AND btrim(shopier_order_id) <> ''
     GROUP BY shopier_order_id
     HAVING count(*) > 1
     ORDER BY count(*) DESC, shopier_order_id ASC
     LIMIT 20`,
  )
  return result.rows
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const sql = readSqlPlan()

  if (args.apply && !args.confirmApply) {
    console.error('Refusing to run DDL without --confirm-apply-d481-shopier-order-id-unique.')
    process.exitCode = 2
    return
  }

  if (args.confirmApply && !args.apply) {
    console.error('Refusing confirmed apply without --apply.')
    process.exitCode = 2
    return
  }

  if (!args.apply || args.dryRun) {
    printPlan(sql, 'dry-run')
    console.log('No database connection was opened and no DDL was run.')
    if (args.printSql) printSql(sql)
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
  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()
  try {
    const duplicates = await findDuplicateOrderIds(client)
    if (duplicates.length > 0) {
      console.error('Refusing D-481 apply: duplicate non-empty Shopier order IDs exist.')
      for (const duplicate of duplicates) console.error(`  ${duplicate.shopier_order_id}: ${duplicate.count}`)
      process.exitCode = 1
      return
    }

    // The SQL contains CREATE INDEX CONCURRENTLY, which PostgreSQL rejects in a transaction.
    await client.query(sql)
    console.log('D-481 index command completed. Verify with:')
    console.log('  npm run smoke:shopier-order-id-schema:read -- --confirm-read-only')
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
