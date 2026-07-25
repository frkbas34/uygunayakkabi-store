/**
 * Guarded D-489 wizard_sessions schema apply helper.
 *
 * Usage:
 *   npm run db:wizard-sessions:apply
 *   npm run db:wizard-sessions:apply -- --dry-run --print-sql
 *   npm run db:wizard-sessions:apply -- --apply --confirm-apply-d489-wizard-sessions-schema
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { Client } from 'pg'

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'd489-wizard-sessions-schema.sql')

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
  console.log('D-489 wizard_sessions schema plan')
  console.log(`SQL file: ${SQL_PATH}`)
  console.log('Planned schema change: create public.wizard_sessions only if it is missing.')
  console.log('The request path never creates or alters this table.')
  console.log('')
  console.log('SQL plan')
  console.log('```sql')
  console.log(sql.trim())
  console.log('```')
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const confirmed = args.has('--confirm-apply-d489-wizard-sessions-schema')
  const dryRun = args.has('--dry-run')
  const sql = readFileSync(SQL_PATH, 'utf8')

  if (!apply && !confirmed) {
    printPlan(sql)
    console.log('Dry-run only: no database connection opened and no DDL executed.')
    return
  }
  if (!apply || !confirmed || dryRun) {
    console.error('Refusing apply: require --apply --confirm-apply-d489-wizard-sessions-schema without --dry-run.')
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
    await client.query(sql)
    console.log('D-489 schema DDL applied. Rerun smoke:wizard-sessions:schema to verify metadata.')
  } finally {
    await client.end()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
