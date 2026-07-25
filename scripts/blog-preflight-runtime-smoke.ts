/**
 * Read-only runtime smoke for Blog editorial preflight.
 *
 * It mirrors Telegram /blogpreflight for one real BlogPost. It does not update
 * an article, publish, call a provider, spend, activate SupplierScout,
 * revives retired channels, or pushes schema.
 *
 * Usage:
 *   npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  evaluateBlogPublishingPreflight,
  findBlogPostForPreflight,
} from '../src/lib/blogPublishingPreflight'

type SmokeArgs = {
  confirmReadOnly: boolean
  helpRequested: boolean
  mutationRequested: boolean
  postRef: string | null
}

function parseArgs(argv: string[]): SmokeArgs {
  let confirmReadOnly = false
  let helpRequested = false
  let mutationRequested = false
  let postRef: string | null = null

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') helpRequested = true
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg.startsWith('--post=')) postRef = arg.slice('--post='.length).trim() || null
    if (
      arg === '--mutate' ||
      arg === '--allow-mutation' ||
      arg === '--confirm' ||
      arg === '--apply' ||
      arg === '--publish' ||
      arg === '--queue' ||
      arg === '--spend' ||
      arg === '--call-provider' ||
      arg === '--activate-supplier-scout'
    ) {
      mutationRequested = true
    }
  }

  return {
    confirmReadOnly: confirmReadOnly || process.env.UYAA_BLOG_PREFLIGHT_SMOKE_CONFIRM === 'READ_ONLY',
    helpRequested,
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_BLOG_PREFLIGHT_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_BLOG_PREFLIGHT_SMOKE_MUTATE === '1',
    postRef,
  }
}

function printUsage(): void {
  console.log([
    'Blog editorial preflight runtime smoke (read-only)',
    '',
    'Required:',
    '  --post=<id-or-slug>',
    '  --confirm-read-only',
    '',
    'Example:',
    '  npm run smoke:blog-preflight:read -- --post=123 --confirm-read-only',
    '',
    'This command reads one BlogPost and evaluates the same editorial preflight used by /blogpreflight.',
    'It does not update or publish the article, call providers, spend, activate SupplierScout, revive retired channels, or push schema changes.',
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
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) value = value.slice(1, -1)
  return [match[1], value]
}

function loadEnvFiles(cwd: string): string[] {
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
  return loaded
}

function unwrapModule<T extends Record<string, unknown>>(mod: T): T {
  if (
    mod.default &&
    typeof mod.default === 'object' &&
    !Array.isArray(mod.default) &&
    'module.exports' in mod
  ) {
    return mod.default as T
  }
  return mod
}

async function getReadOnlyPayload() {
  const payloadMod = await import('payload')
  const dbMod = await import('@payloadcms/db-postgres')
  const editorMod = await import('@payloadcms/richtext-lexical')
  const sharpMod = await import('sharp')
  const { Products } = unwrapModule(await import('../src/collections/Products'))
  const { Variants } = unwrapModule(await import('../src/collections/Variants'))
  const { MediaCollection } = unwrapModule(await import('../src/collections/Media'))
  const { Brands } = unwrapModule(await import('../src/collections/Brands'))
  const { Categories } = unwrapModule(await import('../src/collections/Categories'))
  const { BlogPosts } = unwrapModule(await import('../src/collections/BlogPosts'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts],
    db: dbMod.postgresAdapter({
      pool: {
        connectionString: databaseUri,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 1000,
        ssl: databaseUri.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
      },
      push: false,
    }),
    editor: editorMod.lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET!,
    sharp: sharpMod.default,
  })

  return payloadMod.getPayload({ config })
}

function printPreflight(preflight: ReturnType<typeof evaluateBlogPublishingPreflight>): void {
  console.log('Blog editorial preflight snapshot')
  console.log(`  post: ${preflight.ref} ${preflight.title}`)
  console.log(`  source: ${preflight.source}; status: ${preflight.status}; readableBodyChars: ${preflight.contentLength}`)
  console.log(`  result: ${preflight.readiness}`)
  console.log(`  blockers: ${preflight.blockers.join(' | ') || 'none'}`)
  console.log(`  review: ${preflight.reviewItems.join(' | ') || 'none'}`)
  console.log(`  warnings: ${preflight.warnings.join(' | ') || 'none'}`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.helpRequested) {
    printUsage()
    return
  }
  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation, publish, queue, provider, SupplierScout, or spend flags.')
    process.exitCode = 2
    return
  }
  if (!args.postRef || !args.confirmReadOnly) {
    console.error('Refusing to connect without an article reference and READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  const loaded = loadEnvFiles(process.cwd())
  process.env.PAYLOAD_DB_PUSH = 'false'
  const missingEnv = ['DATABASE_URI', 'PAYLOAD_SECRET'].filter((key) => !process.env[key])
  if (missingEnv.length > 0) {
    console.error(`Missing required env var(s): ${missingEnv.join(', ')}`)
    process.exitCode = 2
    return
  }

  console.log('Blog editorial preflight runtime smoke')
  console.log(`Env files loaded: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const post = await findBlogPostForPreflight(payload, args.postRef)
    if (!post) {
      console.error(`Blog post not found: ${args.postRef}`)
      process.exitCode = 2
      return
    }
    printPreflight(evaluateBlogPublishingPreflight(post))
    console.log('')
    console.log('Smoke result: Blog editorial diagnostics completed. No article write, publication, provider call, ad spend, SupplierScout activation, retired-channel activation, or schema push was performed.')
  } finally {
    await payload.db.destroy()
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    console.error('No article write, publication, provider call, ad spend, SupplierScout activation, retired-channel activation, or schema push was performed.')
    process.exit(1)
  })
