/**
 * Read-only D-489 schema check for Telegram confirmation-wizard sessions.
 *
 * Usage:
 *   npm run smoke:wizard-sessions:schema -- --confirm-read-only
 *
 * It does not run DDL, update Payload, create a session row, or call a provider.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

type ColumnInfo = {
  column_name: string
  data_type: string
  udt_name: string
  is_nullable: string
}

const TABLE_NAME = 'wizard_sessions'
const REQUIRED_COLUMNS: Record<string, { dataType: string; nullable: string }> = {
  session_key: { dataType: 'text', nullable: 'NO' },
  state: { dataType: 'jsonb', nullable: 'NO' },
  started_at: { dataType: 'timestamp with time zone', nullable: 'NO' },
  updated_at: { dataType: 'timestamp with time zone', nullable: 'NO' },
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

function buildClient(databaseUri: string): Client {
  return new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })
}

async function inspect(client: Client): Promise<{ columns: ColumnInfo[]; primaryKey: boolean }> {
  const [columnsResult, primaryKeyResult] = await Promise.all([
    client.query<ColumnInfo>(
      `SELECT column_name, data_type, udt_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position ASC`,
      [TABLE_NAME],
    ),
    client.query<{ column_name: string }>(
      `SELECT attribute.attname AS column_name
       FROM pg_constraint constraint_info
       JOIN pg_class relation ON relation.oid = constraint_info.conrelid
       JOIN pg_namespace schema_info ON schema_info.oid = relation.relnamespace
       JOIN unnest(constraint_info.conkey) AS key(attnum) ON TRUE
       JOIN pg_attribute attribute ON attribute.attrelid = relation.oid AND attribute.attnum = key.attnum
       WHERE constraint_info.contype = 'p'
         AND schema_info.nspname = 'public'
         AND relation.relname = $1`,
      [TABLE_NAME],
    ),
  ])

  return {
    columns: columnsResult.rows,
    primaryKey: primaryKeyResult.rows.length === 1 && primaryKeyResult.rows[0].column_name === 'session_key',
  }
}

function printResult(result: { columns: ColumnInfo[]; primaryKey: boolean }): boolean {
  const byName = new Map(result.columns.map((column) => [column.column_name, column]))
  const tableExists = result.columns.length > 0
  let valid = tableExists && result.primaryKey

  console.log('D-489 wizard_sessions schema check')
  console.log(`  public.${TABLE_NAME} table: ${tableExists ? 'present' : 'missing'}`)
  for (const [name, expected] of Object.entries(REQUIRED_COLUMNS)) {
    const column = byName.get(name)
    const actual = column ? `${column.data_type}, nullable=${column.is_nullable}` : 'missing'
    const matches = Boolean(column && column.data_type === expected.dataType && column.is_nullable === expected.nullable)
    valid &&= matches
    console.log(`  ${name}: ${actual}${matches ? '' : ` (requires ${expected.dataType}, nullable=${expected.nullable})`}`)
  }
  console.log(`  primary key (session_key): ${result.primaryKey ? 'present' : 'missing or incompatible'}`)
  console.log(`Schema result: ${valid ? 'PASS' : 'BLOCKED'}`)
  return valid
}

function parseArgs(argv: string[]): { confirmReadOnly: boolean; mutationRequested: boolean } {
  const args = new Set(argv)
  return {
    confirmReadOnly: args.has('--confirm-read-only') || process.env.UYAA_WIZARD_SESSIONS_SCHEMA_CONFIRM === 'READ_ONLY',
    mutationRequested:
      ['--apply', '--ddl', '--mutate', '--allow-mutation'].some((arg) => args.has(arg)) ||
      process.env.UYAA_WIZARD_SESSIONS_SCHEMA_ALLOW_MUTATION === '1',
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args.confirmReadOnly) {
    console.error('Refusing to connect without --confirm-read-only.')
    process.exitCode = 2
    return
  }
  if (args.mutationRequested) {
    console.error('Refusing mutation flags: this D-489 check is read-only.')
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
  console.log('Mode: read-only information_schema and primary-key metadata check')

  const client = buildClient(databaseUri)
  await client.connect()
  try {
    if (!printResult(await inspect(client))) process.exitCode = 1
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
