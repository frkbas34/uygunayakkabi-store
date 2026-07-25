/**
 * Read-only schema check for the BlogPosts featuredImage relationship.
 *
 * This script inspects PostgreSQL metadata only. It never writes, migrates,
 * imports Payload, queues work, or calls external providers.
 *
 * Usage:
 *   npm run smoke:blog-schema:read -- --confirm-read-only
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
}

type ForeignKeyInfo = {
  target_schema: string
  target_table: string
  target_column: string
  delete_action: string
}

const BLOG_POSTS_TABLE = 'blog_posts'
const MEDIA_TABLE = 'media'
const FEATURED_IMAGE_COLUMN = 'featured_image_id'

function isIntegerColumn(column: ColumnInfo | undefined): boolean {
  return column?.data_type === 'integer' && column.udt_name === 'int4'
}

function isExpectedFeaturedImageForeignKey(foreignKey: ForeignKeyInfo): boolean {
  return foreignKey.target_schema === 'public' &&
    foreignKey.target_table === MEDIA_TABLE &&
    foreignKey.target_column === 'id' &&
    foreignKey.delete_action === 'n'
}

function formatDeleteAction(action: string): string {
  return ({ a: 'no action', r: 'restrict', c: 'cascade', n: 'set null', d: 'set default' } as Record<string, string>)[action] ?? action
}

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
    confirmReadOnly: confirmReadOnly || process.env.UYAA_BLOG_SCHEMA_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_BLOG_SCHEMA_ALLOW_MUTATION === '1' ||
      process.env.UYAA_BLOG_SCHEMA_MUTATE === '1',
    verbose: verbose || process.env.UYAA_BLOG_SCHEMA_VERBOSE === '1',
  }
}

function printUsage(): void {
  console.log([
    'D-462 BlogPosts featured-image schema check (read-only)',
    '',
    'Required:',
    '  --confirm-read-only',
    '',
    'Optional:',
    '  --verbose',
    '',
    'Example:',
    '  npm run smoke:blog-schema:read -- --confirm-read-only',
    '',
    'This command checks blog_posts.featured_image_id and its media foreign key.',
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

async function getTableColumns(client: Client, tableName: string): Promise<ColumnInfo[]> {
  const result = await client.query<ColumnInfo>(
    `SELECT column_name, data_type, udt_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position ASC`,
    [tableName],
  )
  return result.rows
}

async function getFeaturedImageForeignKeys(client: Client): Promise<ForeignKeyInfo[]> {
  const result = await client.query<ForeignKeyInfo>(
    `SELECT
       target_schema.nspname AS target_schema,
       target_table.relname AS target_table,
       target_column.attname AS target_column,
       constraint_info.confdeltype AS delete_action
     FROM pg_constraint constraint_info
     JOIN pg_class source_table ON source_table.oid = constraint_info.conrelid
     JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
     JOIN pg_class target_table ON target_table.oid = constraint_info.confrelid
     JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
     JOIN LATERAL unnest(constraint_info.conkey, constraint_info.confkey) AS key_pair(source_attnum, target_attnum) ON TRUE
     JOIN pg_attribute source_column
       ON source_column.attrelid = source_table.oid
      AND source_column.attnum = key_pair.source_attnum
     JOIN pg_attribute target_column
       ON target_column.attrelid = target_table.oid
      AND target_column.attnum = key_pair.target_attnum
     WHERE constraint_info.contype = 'f'
       AND source_schema.nspname = 'public'
       AND source_table.relname = $1
       AND source_column.attname = $2`,
    [BLOG_POSTS_TABLE, FEATURED_IMAGE_COLUMN],
  )
  return result.rows
}

function printColumns(columns: ColumnInfo[], verbose: boolean): void {
  const featuredImage = columns.find((column) => column.column_name === FEATURED_IMAGE_COLUMN)
  console.log('BlogPosts featured-image relationship')
  console.log(`  ${BLOG_POSTS_TABLE} table exists: ${columns.length > 0 ? 'yes' : 'no'}`)
  console.log(`  ${FEATURED_IMAGE_COLUMN}: ${featuredImage ? `${featuredImage.data_type} (${featuredImage.udt_name}), nullable=${featuredImage.is_nullable}` : 'missing'}`)

  if (verbose && columns.length > 0) {
    console.log('  observed columns:')
    for (const column of columns) {
      console.log(`  - ${column.column_name}: ${column.data_type} (${column.udt_name}), nullable=${column.is_nullable}`)
    }
  }
  console.log('')
}

function printRepairPath(): void {
  console.log('Schema result: BLOCKED')
  console.log('Repair helper (dry-run by default):')
  console.log('  npm run db:blog-featured-image:apply -- --dry-run --print-sql')
  console.log('Operator-approved apply only:')
  console.log('  npm run db:blog-featured-image:apply -- --apply --confirm-apply-d462-blog-featured-image-schema')
  console.log('After apply:')
  console.log('  npm run smoke:blog-schema:read -- --confirm-read-only')
  console.log('  npm run build')
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

  console.log('D-462 BlogPosts featured-image schema check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('Mode: read-only information_schema and pg_constraint check')
  console.log('')

  const client = new Client({
    connectionString: databaseUri,
    ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()
  try {
    const blogColumns = await getTableColumns(client, BLOG_POSTS_TABLE)
    const mediaColumns = await getTableColumns(client, MEDIA_TABLE)
    const tableExists = blogColumns.length > 0
    const mediaTableExists = mediaColumns.length > 0
    const featuredImageColumn = blogColumns.find((column) => column.column_name === FEATURED_IMAGE_COLUMN)
    const mediaIdColumn = mediaColumns.find((column) => column.column_name === 'id')
    const hasFeaturedImageColumn = Boolean(featuredImageColumn)
    const mediaIdIsInteger = isIntegerColumn(mediaIdColumn)
    const featuredImageIdIsInteger = !featuredImageColumn || isIntegerColumn(featuredImageColumn)
    const featuredImageForeignKeys = hasFeaturedImageColumn
      ? await getFeaturedImageForeignKeys(client)
      : []
    const foreignKeyExists = featuredImageForeignKeys.some(isExpectedFeaturedImageForeignKey)
    const hasForeignKeyConflict = featuredImageForeignKeys.some((foreignKey) => !isExpectedFeaturedImageForeignKey(foreignKey))

    printColumns(blogColumns, args.verbose)
    console.log(`${MEDIA_TABLE} table exists: ${mediaTableExists ? 'yes' : 'no'}`)
    console.log(`media.id: ${mediaIdColumn ? `${mediaIdColumn.data_type} (${mediaIdColumn.udt_name})` : 'missing'}${mediaIdIsInteger ? '' : ' - requires integer (int4)'}`)
    console.log(`${FEATURED_IMAGE_COLUMN} -> ${MEDIA_TABLE}.id foreign key (ON DELETE SET NULL): ${foreignKeyExists ? 'present' : 'missing'}`)
    console.log('')

    if (tableExists && mediaTableExists && mediaIdIsInteger && hasFeaturedImageColumn && featuredImageIdIsInteger && foreignKeyExists && !hasForeignKeyConflict) {
      console.log('Schema result: PASS')
      console.log('Next: npm run build')
      return
    }

    if (!tableExists) console.log(`Missing table: ${BLOG_POSTS_TABLE}`)
    if (!mediaTableExists) console.log(`Missing table: ${MEDIA_TABLE}`)
    if (mediaTableExists && !mediaIdColumn) console.log(`Missing required column: ${MEDIA_TABLE}.id`)
    if (mediaIdColumn && !mediaIdIsInteger) console.log(`Incompatible column: ${MEDIA_TABLE}.id must be integer (int4) for this relationship repair`)
    if (tableExists && !hasFeaturedImageColumn) console.log(`Missing column: ${BLOG_POSTS_TABLE}.${FEATURED_IMAGE_COLUMN}`)
    if (featuredImageColumn && !featuredImageIdIsInteger) {
      console.log(`Incompatible column: ${BLOG_POSTS_TABLE}.${FEATURED_IMAGE_COLUMN} must be integer (int4) for this relationship repair`)
    }
    for (const foreignKey of featuredImageForeignKeys.filter((foreignKey) => !isExpectedFeaturedImageForeignKey(foreignKey))) {
      console.log(`Incompatible foreign key: ${BLOG_POSTS_TABLE}.${FEATURED_IMAGE_COLUMN} -> ${foreignKey.target_schema}.${foreignKey.target_table}.${foreignKey.target_column} (ON DELETE ${formatDeleteAction(foreignKey.delete_action)})`)
    }
    if (hasFeaturedImageColumn && mediaTableExists && !foreignKeyExists) {
      console.log(`Missing foreign key: ${BLOG_POSTS_TABLE}.${FEATURED_IMAGE_COLUMN} -> ${MEDIA_TABLE}.id`)
    }
    console.log('')
    printRepairPath()
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
