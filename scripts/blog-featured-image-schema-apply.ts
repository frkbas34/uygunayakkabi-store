/**
 * Guarded D-462 BlogPosts featured-image relationship repair runner.
 *
 * Default mode is dry-run only. The script does not connect to PostgreSQL or
 * run DDL unless the operator supplies both explicit apply flags.
 *
 * Usage:
 *   npm run db:blog-featured-image:apply
 *   npm run db:blog-featured-image:apply -- --dry-run --print-sql
 *   npm run db:blog-featured-image:apply -- --apply --confirm-apply-d462-blog-featured-image-schema
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
  data_type: string
  udt_name: string
}

type ForeignKeyInfo = {
  target_schema: string
  target_table: string
  target_column: string
  delete_action: string
}

type SchemaVerification = {
  blogPostsTableExists: boolean
  mediaTableExists: boolean
  mediaIdColumnExists: boolean
  mediaIdIsInteger: boolean
  featuredImageColumnExists: boolean
  featuredImageColumnTypeCompatible: boolean
  featuredImageForeignKeyExists: boolean
  featuredImageForeignKeyConflict: boolean
}

const SQL_PATH = path.join(process.cwd(), 'scripts', 'sql', 'd462-blog-featured-image-schema.sql')
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

function parseArgs(argv: string[]): ApplyArgs {
  let confirmApply = false
  let dryRun = false
  let printSql = false
  let mutationRequested = false

  for (const arg of argv) {
    if (arg === '--confirm-apply-d462-blog-featured-image-schema') confirmApply = true
    if (arg === '--dry-run') dryRun = true
    if (arg === '--print-sql') printSql = true
    if (arg === '--apply' || arg === '--ddl' || arg === '--mutate') mutationRequested = true
  }

  const envConfirm = process.env.UYAA_BLOG_SCHEMA_APPLY_CONFIRM

  return {
    confirmApply: confirmApply || envConfirm === 'APPLY_D462_BLOG_FEATURED_IMAGE_SCHEMA',
    dryRun,
    printSql,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_BLOG_SCHEMA_APPLY === '1' ||
      process.env.UYAA_BLOG_SCHEMA_ALLOW_MUTATION === '1',
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
    throw new Error(`Missing D-462 SQL plan: ${SQL_PATH}`)
  }

  return readFileSync(SQL_PATH, 'utf8')
}

function hashSql(sql: string): string {
  return createHash('sha256').update(sql).digest('hex').slice(0, 16)
}

function printPlan(sql: string, mode: 'dry-run' | 'apply', envLoad?: EnvLoadResult): void {
  console.log('D-462 BlogPosts featured-image schema repair')
  console.log(`Mode: ${mode}`)
  console.log(`SQL file: ${SQL_PATH}`)
  console.log(`SQL bytes: ${Buffer.byteLength(sql, 'utf8')}`)
  console.log(`SQL sha256: ${hashSql(sql)}`)
  if (envLoad) {
    console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  }
  console.log('')
  console.log('Planned schema changes:')
  console.log('- require the existing blog_posts and media tables')
  console.log('- add blog_posts.featured_image_id only if missing')
  console.log('- add the blog_posts.featured_image_id -> media.id foreign key only if missing')
  console.log('- add a supporting featured-image index only if missing')
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
    `SELECT column_name, data_type, udt_name
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

async function verifyBlogFeaturedImageSchema(client: Client): Promise<SchemaVerification> {
  const [blogColumns, mediaColumns] = await Promise.all([
    getTableColumns(client, BLOG_POSTS_TABLE),
    getTableColumns(client, MEDIA_TABLE),
  ])
  const blogPostsTableExists = blogColumns.length > 0
  const mediaTableExists = mediaColumns.length > 0
  const mediaIdColumn = mediaColumns.find((column) => column.column_name === 'id')
  const featuredImageColumn = blogColumns.find((column) => column.column_name === FEATURED_IMAGE_COLUMN)
  const mediaIdColumnExists = Boolean(mediaIdColumn)
  const mediaIdIsInteger = isIntegerColumn(mediaIdColumn)
  const featuredImageColumnExists = Boolean(featuredImageColumn)
  const featuredImageColumnTypeCompatible = !featuredImageColumn || isIntegerColumn(featuredImageColumn)
  const featuredImageForeignKeys = featuredImageColumnExists
    ? await getFeaturedImageForeignKeys(client)
    : []
  const featuredImageForeignKeyExists = featuredImageForeignKeys.some(isExpectedFeaturedImageForeignKey)
  const featuredImageForeignKeyConflict = featuredImageForeignKeys.some((foreignKey) => !isExpectedFeaturedImageForeignKey(foreignKey))

  return {
    blogPostsTableExists,
    mediaTableExists,
    mediaIdColumnExists,
    mediaIdIsInteger,
    featuredImageColumnExists,
    featuredImageColumnTypeCompatible,
    featuredImageForeignKeyExists,
    featuredImageForeignKeyConflict,
  }
}

function verificationPassed(verification: SchemaVerification): boolean {
  return verification.blogPostsTableExists &&
    verification.mediaTableExists &&
    verification.mediaIdColumnExists &&
    verification.mediaIdIsInteger &&
    verification.featuredImageColumnExists &&
    verification.featuredImageColumnTypeCompatible &&
    verification.featuredImageForeignKeyExists &&
    !verification.featuredImageForeignKeyConflict
}

function printVerification(verification: SchemaVerification): void {
  console.log('Post-apply schema verification')
  console.log(`  blog_posts table: ${verification.blogPostsTableExists ? 'present' : 'missing'}`)
  console.log(`  media table: ${verification.mediaTableExists ? 'present' : 'missing'}`)
  console.log(`  media.id: ${verification.mediaIdColumnExists ? (verification.mediaIdIsInteger ? 'integer' : 'incompatible (requires integer)') : 'missing'}`)
  console.log(`  blog_posts.featured_image_id: ${verification.featuredImageColumnExists ? 'present' : 'missing'}`)
  if (verification.featuredImageColumnExists && !verification.featuredImageColumnTypeCompatible) {
    console.log('  featured-image column type: incompatible (requires integer)')
  }
  console.log(`  featured-image foreign key to media.id (set null): ${verification.featuredImageForeignKeyExists ? 'present' : 'missing'}`)
  if (verification.featuredImageForeignKeyConflict) {
    console.log('  featured-image foreign key: incompatible existing constraint detected')
  }
  console.log(`Schema result: ${verificationPassed(verification) ? 'PASS' : 'BLOCKED'}`)
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
      console.error('Refusing to apply D-462 BlogPosts featured-image schema without explicit apply confirmation.')
      console.error('Required flag: --confirm-apply-d462-blog-featured-image-schema')
      process.exitCode = 2
      return
    }

    console.log('Dry-run only: no database connection opened and no DDL executed.')
    console.log('Use --apply --confirm-apply-d462-blog-featured-image-schema only when the operator is ready to run the reviewed DDL.')
    return
  }

  if (!args.mutationRequested && process.env.UYAA_BLOG_SCHEMA_APPLY !== '1') {
    console.error('Apply confirmation was supplied, but no apply intent was supplied.')
    console.error('Add --apply with --confirm-apply-d462-blog-featured-image-schema.')
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

  const client = buildClient(databaseUri)
  await client.connect()
  try {
    const before = await verifyBlogFeaturedImageSchema(client)
    if (
      !before.blogPostsTableExists ||
      !before.mediaTableExists ||
      !before.mediaIdIsInteger ||
      !before.featuredImageColumnTypeCompatible ||
      before.featuredImageForeignKeyConflict
    ) {
      printVerification(before)
      throw new Error('D-462 requires existing blog_posts/media tables, media.id integer, any existing featured_image_id typed as integer, and no conflicting foreign key. It will not create tables, coerce ID types, or replace an existing constraint.')
    }

    console.log('Applying D-462 BlogPosts featured-image schema DDL now.')
    console.log('')
    await client.query(sql)

    const after = await verifyBlogFeaturedImageSchema(client)
    printVerification(after)
    if (!verificationPassed(after)) process.exitCode = 1
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
