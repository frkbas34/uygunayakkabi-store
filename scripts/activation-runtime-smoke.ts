/**
 * Read-only runtime smoke check for product activation readiness.
 *
 * This script connects to Payload only after an explicit product id and
 * READ_ONLY confirmation are provided. It never updates products, dispatches
 * channels, queues jobs, or pushes schema changes.
 *
 * Usage:
 *   npm run smoke:activation:read -- --product=359 --confirm-read-only
 *
 * Env alternative:
 *   UYAA_RUNTIME_SMOKE_PRODUCT_ID=359
 *   UYAA_RUNTIME_SMOKE_CONFIRM=READ_ONLY
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  collectActivationBlockers,
  resolveConfiguredTargets,
} from '../src/lib/productActivationGuard'
import {
  detectStateIncoherence,
  evaluatePublishReadiness,
} from '../src/lib/publishReadiness'
import { formatProductLifecycle } from '../src/lib/productLifecycle'
import { getStockSnapshot } from '../src/lib/stockReaction'

type SmokeArgs = {
  productId?: string
  confirmReadOnly: boolean
  mutationRequested: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

function parseArgs(argv: string[]): SmokeArgs {
  let productId: string | undefined
  let confirmReadOnly = false
  let mutationRequested = false

  for (const arg of argv) {
    if (arg.startsWith('--product=')) productId = arg.slice('--product='.length).trim()
    if (arg === '--confirm-read-only') confirmReadOnly = true
    if (arg === '--mutate' || arg === '--allow-mutation') mutationRequested = true
  }

  return {
    productId: productId || process.env.UYAA_RUNTIME_SMOKE_PRODUCT_ID?.trim(),
    confirmReadOnly: confirmReadOnly || process.env.UYAA_RUNTIME_SMOKE_CONFIRM === 'READ_ONLY',
    mutationRequested:
      mutationRequested ||
      process.env.UYAA_RUNTIME_SMOKE_ALLOW_MUTATION === '1' ||
      process.env.UYAA_RUNTIME_SMOKE_MUTATE === '1',
  }
}

function printUsage(): void {
  console.log([
    'Activation runtime smoke check (read-only)',
    '',
    'Required:',
    '  --product=<payload-product-id>',
    '  --confirm-read-only',
    '',
    'Example:',
    '  npm run smoke:activation:read -- --product=359 --confirm-read-only',
    '',
    'Env alternative:',
    '  UYAA_RUNTIME_SMOKE_PRODUCT_ID=359',
    '  UYAA_RUNTIME_SMOKE_CONFIRM=READ_ONLY',
    '',
    'This command reads one product, computes lifecycle/readiness/stock/activation blockers, and exits.',
    'It does not update Payload, publish channels, queue jobs, or push schema changes.',
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

function normalizeProductId(raw: string): number | string {
  const trimmed = raw.trim()
  const numeric = Number(trimmed)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : trimmed
}

function formatBool(value: boolean): string {
  return value ? 'yes' : 'no'
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.productId) {
    printUsage()
    return
  }

  if (args.mutationRequested) {
    console.error('Refusing to run: this smoke check is read-only and does not support mutation flags.')
    process.exitCode = 2
    return
  }

  if (!args.confirmReadOnly) {
    console.error('Refusing to connect to Payload without READ_ONLY confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  const envLoad = loadEnvFiles(process.cwd())

  // Payload config defaults db push to true. Runtime smoke must never apply schema changes.
  process.env.PAYLOAD_DB_PUSH = 'false'

  const missingEnv = ['DATABASE_URI', 'PAYLOAD_SECRET'].filter((key) => !process.env[key])
  if (missingEnv.length > 0) {
    console.error(`Missing required env var(s): ${missingEnv.join(', ')}`)
    process.exitCode = 2
    return
  }

  const productId = normalizeProductId(args.productId)

  console.log('Activation runtime smoke check')
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Product id: ${String(productId)}`)
  console.log('')

  const payload = await getReadOnlyPayload()
  try {
    const product = await payload.findByID({
      collection: 'products',
      id: productId as any,
      depth: 2,
    }) as Record<string, any> | null

    if (!product) {
      console.error(`Product not found: ${String(productId)}`)
      process.exitCode = 3
      return
    }

    const stock = await getStockSnapshot(payload, product.id, product.stockQuantity ?? 0)
    const readiness = evaluatePublishReadiness(product as any)
    const activationBlockers = await collectActivationBlockers(product, {
      resolveStockSnapshot: (id, productLevelStock) =>
        getStockSnapshot(payload, id, productLevelStock),
    })
    const coherenceIssues = detectStateIncoherence(product as any)
    const targets = resolveConfiguredTargets(product)

    console.log('Product')
    console.log(`  title: ${product.title ?? '(untitled)'}`)
    console.log(`  status: ${product.status ?? 'draft'}`)
    console.log(`  lifecycle: ${formatProductLifecycle(product as any)}`)
    console.log(`  price: ${product.price ?? '(missing)'}`)
    console.log(`  targets: ${targets.length > 0 ? targets.join(', ') : '(none)'}`)
    console.log('')

    console.log('Stock')
    console.log(`  effectiveStock: ${stock.effectiveStock}`)
    console.log(`  productLevelStock: ${stock.productLevelStock}`)
    console.log(`  hasVariants: ${formatBool(stock.hasVariants)}`)
    if (stock.hasVariants) {
      console.log(`  variants: ${stock.variantDetails.map((v) => `${v.size}:${v.stock}`).join(', ')}`)
    }
    console.log('')

    console.log('Publish readiness')
    console.log(`  level: ${readiness.level}`)
    console.log(`  dimensions: ${readiness.passedCount}/${readiness.totalCount}`)
    for (const dimension of readiness.dimensions) {
      console.log(`  - ${dimension.name}: ${dimension.passed ? 'pass' : 'block'} (${dimension.detail ?? dimension.status})`)
    }
    console.log('')

    console.log('Activation guard')
    if (activationBlockers.length === 0) {
      console.log('  pass: Payload activation guard has no blockers for this product shape.')
    } else {
      console.log(`  block: ${activationBlockers.length} blocker(s)`)
      for (const blocker of activationBlockers) console.log(`  - ${blocker}`)
    }
    console.log('')

    console.log('State coherence')
    if (coherenceIssues.length === 0) {
      console.log('  pass: no contradictions detected')
    } else {
      console.log(`  warn: ${coherenceIssues.length} issue(s)`)
      for (const issue of coherenceIssues) {
        console.log(`  - ${issue.severity}: ${issue.field} expected ${issue.expected}, got ${issue.actual}`)
      }
    }

    if (activationBlockers.length > 0) {
      process.exitCode = 1
      return
    }

    console.log('')
    console.log('Smoke result: activation guard would allow this product. No writes were performed.')
  } finally {
    await payload.destroy()
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
