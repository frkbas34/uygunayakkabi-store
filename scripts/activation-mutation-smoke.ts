/**
 * Guarded, reversible runtime smoke for the shared activation path.
 *
 * This script mutates one explicitly prepared smoke product, then rolls it
 * back. It refuses normal products and external-channel targets so it cannot
 * become an accidental publishing tool.
 *
 * Usage:
 *   npm run smoke:activation:mutate -- --product=123 --confirm-mutate-and-rollback
 *   npm run smoke:activation:mutate -- --create-temp-smoke --confirm-create-mutate-delete
 *   npm run smoke:activation:mutate -- --create-temp-smoke --admin-direct-update --confirm-create-mutate-delete
 *
 * Env alternative:
 *   UYAA_ACTIVATION_MUTATION_SMOKE_PRODUCT_ID=123
 *   UYAA_ACTIVATION_MUTATION_SMOKE_CONFIRM=MUTATE_AND_ROLLBACK
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  collectActivationBlockers,
  resolveConfiguredTargets,
} from '../src/lib/productActivationGuard'
import { evaluatePublishReadiness } from '../src/lib/publishReadiness'
import { getStockSnapshot } from '../src/lib/stockReaction'

type SmokeArgs = {
  productId?: string
  createTempProduct: boolean
  adminDirectUpdate: boolean
  confirmMutation: boolean
  confirmCreateTemp: boolean
}

type EnvLoadResult = {
  loaded: string[]
  skipped: string[]
}

type ProductSnapshot = {
  status: unknown
  workflow: unknown
  merchandising: unknown
  sourceMeta: unknown
}

function parseArgs(argv: string[]): SmokeArgs {
  let productId: string | undefined
  let createTempProduct = false
  let adminDirectUpdate = false
  let confirmMutation = false
  let confirmCreateTemp = false

  for (const arg of argv) {
    if (arg.startsWith('--product=')) productId = arg.slice('--product='.length).trim()
    if (arg === '--create-temp-smoke') createTempProduct = true
    if (arg === '--admin-direct-update') adminDirectUpdate = true
    if (arg === '--confirm-mutate-and-rollback') confirmMutation = true
    if (arg === '--confirm-create-mutate-delete') {
      confirmMutation = true
      confirmCreateTemp = true
    }
  }

  const envConfirm = process.env.UYAA_ACTIVATION_MUTATION_SMOKE_CONFIRM
  return {
    productId: productId || process.env.UYAA_ACTIVATION_MUTATION_SMOKE_PRODUCT_ID?.trim(),
    createTempProduct:
      createTempProduct ||
      process.env.UYAA_ACTIVATION_MUTATION_SMOKE_CREATE_TEMP === '1',
    adminDirectUpdate:
      adminDirectUpdate ||
      process.env.UYAA_ACTIVATION_MUTATION_SMOKE_ADMIN_DIRECT === '1',
    confirmMutation:
      confirmMutation ||
      envConfirm === 'MUTATE_AND_ROLLBACK' ||
      envConfirm === 'CREATE_MUTATE_DELETE',
    confirmCreateTemp:
      confirmCreateTemp ||
      envConfirm === 'CREATE_MUTATE_DELETE',
  }
}

function printUsage(): void {
  console.log([
    'Activation mutation smoke check (guarded + rollback)',
    '',
    'Required:',
    '  --product=<payload-product-id>',
    '  --confirm-mutate-and-rollback',
    '',
    'Example:',
    '  npm run smoke:activation:mutate -- --product=123 --confirm-mutate-and-rollback',
    '  npm run smoke:activation:mutate -- --create-temp-smoke --confirm-create-mutate-delete',
    '  npm run smoke:activation:mutate -- --create-temp-smoke --admin-direct-update --confirm-create-mutate-delete',
    '',
    'The product must be a prepared smoke draft:',
    '  - title, SKU, or stock number includes SMOKE or TEST',
    '  - status is draft',
    '  - publish readiness is ready',
    '  - channelTargets is exactly [website]',
    '  - external channel flags are not true',
    '  - storySettings.autoOnPublish is not true',
    '',
    'The existing-product mode activates through approveAndActivateProduct(), then restores product state.',
    'The temp-product mode creates a prepared website-only smoke draft, activates it, restores it, deletes smoke bot-events, then deletes the smoke product.',
    'Add --admin-direct-update in temp mode to test a direct Payload status update like an admin save.',
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

function cloneJson<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
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

async function getRuntimePayload() {
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
  const { BotEvents } = unwrapModule(await import('../src/collections/BotEvents'))
  const { AutomationSettings } = unwrapModule(await import('../src/globals/AutomationSettings'))

  const databaseUri = process.env.DATABASE_URI!
  const config = payloadMod.buildConfig({
    collections: [Products, Variants, MediaCollection, Brands, Categories, BlogPosts, BotEvents],
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
    globals: [AutomationSettings],
    secret: process.env.PAYLOAD_SECRET!,
    sharp: sharpMod.default,
  })

  return payloadMod.getPayload({ config })
}

function snapshotProduct(product: Record<string, any>): ProductSnapshot {
  return {
    status: cloneJson(product.status ?? 'draft'),
    workflow: cloneJson(product.workflow ?? {}),
    merchandising: cloneJson(product.merchandising ?? {}),
    sourceMeta: cloneJson(product.sourceMeta ?? {}),
  }
}

async function restoreProduct(payload: any, productId: number | string, snapshot: ProductSnapshot) {
  await payload.update({
    collection: 'products',
    id: productId as any,
    data: {
      status: snapshot.status,
      workflow: snapshot.workflow,
      merchandising: snapshot.merchandising,
      sourceMeta: snapshot.sourceMeta,
    },
  })
}

function smokeMarkerPresent(product: Record<string, any>): boolean {
  const text = [
    product.title,
    product.sku,
    product.stockNumber,
  ].filter(Boolean).join(' ').toUpperCase()

  return text.includes('SMOKE') || text.includes('TEST')
}

function collectPreflightBlockers(product: Record<string, any>): string[] {
  const blockers: string[] = []

  if (!smokeMarkerPresent(product)) {
    blockers.push('product title, SKU, or stock number must include SMOKE or TEST')
  }

  if ((product.status ?? 'draft') !== 'draft') {
    blockers.push(`product status must be draft (current: ${product.status ?? 'draft'})`)
  }

  const rawTargets = Array.isArray(product.channelTargets) ? product.channelTargets : []
  if (rawTargets.length !== 1 || rawTargets[0] !== 'website') {
    blockers.push('channelTargets must be exactly [website] for mutation smoke')
  }

  const channels = product.channels ?? {}
  const externalFlags = ['publishInstagram', 'publishShopier', 'publishX', 'publishFacebook']
    .filter((flag) => channels?.[flag] === true)
  if (externalFlags.length > 0) {
    blockers.push(`external channel flags must be false/unset (${externalFlags.join(', ')} are true)`)
  }

  if (channels?.publishWebsite !== true) {
    blockers.push('channels.publishWebsite must be true')
  }

  if (product.storySettings?.enabled === true && product.storySettings?.autoOnPublish === true) {
    blockers.push('storySettings.autoOnPublish must not be true')
  }

  const sourceMeta = product.sourceMeta ?? {}
  if (sourceMeta.forceRedispatch === true || sourceMeta.previewDispatch === true) {
    blockers.push('sourceMeta forceRedispatch/previewDispatch must be false before smoke')
  }

  const targets = resolveConfiguredTargets(product)
  if (targets.length !== 1 || targets[0] !== 'website') {
    blockers.push(`resolved active targets must be website only (current: ${targets.join(', ') || 'none'})`)
  }

  return blockers
}

function captureCreates(payload: any, capturedBotEventIds: Array<number | string>) {
  return new Proxy(payload, {
    get(target, prop) {
      if (prop === 'create') {
        return async (args: Record<string, any>) => {
          const doc = await target.create.bind(target)(args)
          if (args.collection === 'bot-events' && doc?.id !== undefined) {
            capturedBotEventIds.push(doc.id)
          }
          return doc
        }
      }

      const value = target[prop as keyof typeof target]
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

async function deleteCapturedEvents(payload: any, eventIds: Array<number | string>) {
  for (const id of [...eventIds].reverse()) {
    await payload.delete({ collection: 'bot-events', id: id as any })
  }
}

function buildSmokeSku(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const random = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `SMOKE-ACT-${stamp}-${random}`
}

async function createTempSmokeProduct(payload: any): Promise<Record<string, any>> {
  const mediaRes = await payload.find({
    collection: 'media',
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
  })
  const media = mediaRes.docs?.[0]
  if (!media?.id) {
    throw new Error('No media document exists. Upload or keep one media item before running temp mutation smoke.')
  }

  const sku = buildSmokeSku()
  return payload.create({
    collection: 'products',
    data: {
      title: `[SMOKE] Activation Runtime ${sku}`,
      description: 'Temporary activation smoke product. Created and deleted by scripts/activation-mutation-smoke.ts.',
      brand: 'Generic',
      price: 1,
      stockQuantity: 1,
      sku,
      status: 'draft',
      source: 'api',
      images: [{ image: media.id }],
      channels: {
        publishWebsite: true,
        publishInstagram: false,
        publishShopier: false,
        publishX: false,
        publishFacebook: false,
      },
      channelTargets: ['website'],
      storySettings: {
        enabled: false,
        autoOnPublish: false,
        skipApproval: false,
      },
      workflow: {
        workflowStatus: 'publish_ready',
        visualStatus: 'approved',
        confirmationStatus: 'confirmed',
        contentStatus: 'ready',
        auditStatus: 'not_required',
        publishStatus: 'not_requested',
        stockState: 'in_stock',
        sellable: true,
      },
      auditResult: {
        overallResult: 'approved',
        approvedForPublish: true,
      },
      sourceMeta: {
        dispatchedChannels: '[]',
        dispatchNotes: '[]',
        forceRedispatch: false,
        previewDispatch: false,
      },
    },
    depth: 2,
  })
}

async function deleteTempProduct(payload: any, productId: number | string) {
  await payload.delete({
    collection: 'products',
    id: productId as any,
  })
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.productId && args.createTempProduct) {
    console.error('Use either --product=<id> or --create-temp-smoke, not both.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (args.adminDirectUpdate && !args.createTempProduct) {
    console.error('--admin-direct-update is only allowed with --create-temp-smoke.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (!args.productId && !args.createTempProduct) {
    printUsage()
    return
  }

  if (args.createTempProduct && !args.confirmCreateTemp) {
    console.error('Refusing to create/mutate/delete a temp smoke product without CREATE_MUTATE_DELETE confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  if (!args.confirmMutation) {
    console.error('Refusing to mutate without MUTATE_AND_ROLLBACK confirmation.')
    printUsage()
    process.exitCode = 2
    return
  }

  const envLoad = loadEnvFiles(process.cwd())
  process.env.PAYLOAD_DB_PUSH = 'false'

  const missingEnv = ['DATABASE_URI', 'PAYLOAD_SECRET'].filter((key) => !process.env[key])
  if (missingEnv.length > 0) {
    console.error(`Missing required env var(s): ${missingEnv.join(', ')}`)
    process.exitCode = 2
    return
  }

  let productId: number | string | null = args.productId
    ? normalizeProductId(args.productId)
    : null

  console.log('Activation mutation smoke check')
  console.log(`Mode: ${args.createTempProduct ? 'create temp smoke product' : 'existing product'}`)
  console.log(`Activation path: ${args.adminDirectUpdate ? 'admin direct Payload update' : 'approveAndActivateProduct helper'}`)
  console.log(`Env files loaded: ${envLoad.loaded.length > 0 ? envLoad.loaded.join(', ') : 'none'}`)
  console.log('PAYLOAD_DB_PUSH: false')
  console.log(`Product id: ${productId === null ? '(will create temp smoke product)' : String(productId)}`)
  console.log('')

  const payload = await getRuntimePayload()
  const capturedBotEventIds: Array<number | string> = []
  let snapshot: ProductSnapshot | null = null
  let mutationStarted = false
  let createdTempProductId: number | string | null = null

  try {
    if (args.createTempProduct) {
      const created = await createTempSmokeProduct(payload)
      productId = created.id
      createdTempProductId = created.id
      console.log(`Created temp smoke product: ${String(created.id)} (${created.sku ?? created.title})`)
    }

    if (productId === null) {
      throw new Error('No product id available for activation mutation smoke.')
    }

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

    snapshot = snapshotProduct(product)

    const preflightBlockers = collectPreflightBlockers(product)
    const readiness = evaluatePublishReadiness(product as any)
    const activationBlockers = await collectActivationBlockers(product, {
      resolveStockSnapshot: (id, productLevelStock) =>
        getStockSnapshot(payload, id, productLevelStock),
    })

    if (readiness.level !== 'ready') {
      preflightBlockers.push(`publish readiness must be ready (${readiness.passedCount}/${readiness.totalCount})`)
      preflightBlockers.push(...readiness.blockers.map((blocker) => `readiness: ${blocker}`))
    }

    if (activationBlockers.length > 0) {
      preflightBlockers.push(...activationBlockers.map((blocker) => `activation guard: ${blocker}`))
    }

    if (preflightBlockers.length > 0) {
      console.error('Preflight refused mutation smoke:')
      for (const blocker of preflightBlockers) console.error(`- ${blocker}`)
      process.exitCode = 1
      return
    }

    if (args.adminDirectUpdate) {
      mutationStarted = true
      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          status: 'active',
        },
      })

      console.log('Activation result')
      console.log('  ok: true')
      console.log('  path: direct Payload update status=active')
    } else {
      const { approveAndActivateProduct } = await import('../src/lib/publishDesk')
      const wrappedPayload = captureCreates(payload, capturedBotEventIds)
      mutationStarted = true
      const result = await approveAndActivateProduct(
        wrappedPayload,
        product.id,
        'telegram_command',
        'runtime_mutation_smoke',
        'system',
      )

      console.log('Activation result')
      console.log(`  ok: ${result.ok}`)
      console.log(`  idempotent: ${result.idempotent}`)
      console.log(`  refusalReason: ${result.refusalReason ?? '(none)'}`)
      console.log(`  summary: ${result.summary}`)

      if (!result.ok || result.idempotent) {
        process.exitCode = 1
        return
      }
    }

    const activated = await payload.findByID({
      collection: 'products',
      id: product.id,
      depth: 0,
    }) as Record<string, any>

    if (activated.status !== 'active') {
      console.error(`Activation smoke failed: expected active, got ${activated.status}`)
      process.exitCode = 1
      return
    }

    console.log(`  post-activation status: ${activated.status}`)
    console.log(`  workflowStatus: ${activated.workflow?.workflowStatus ?? '(missing)'}`)
    console.log(`  publishStatus: ${activated.workflow?.publishStatus ?? '(missing)'}`)
    console.log(`  captured bot-events: ${capturedBotEventIds.length}`)

    if (activated.workflow?.workflowStatus !== 'active') {
      console.error(`Activation smoke failed: expected workflowStatus active, got ${activated.workflow?.workflowStatus}`)
      process.exitCode = 1
      return
    }

    if (activated.workflow?.publishStatus !== 'published') {
      console.error(`Activation smoke failed: expected publishStatus published, got ${activated.workflow?.publishStatus}`)
      process.exitCode = 1
      return
    }
  } finally {
    if (snapshot && mutationStarted) {
      try {
        await restoreProduct(payload, productId, snapshot)
        console.log('Rollback: product state restored')
      } catch (err) {
        console.error(`Rollback failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exitCode = 1
      }

      try {
        await deleteCapturedEvents(payload, capturedBotEventIds)
        console.log(`Rollback: deleted ${capturedBotEventIds.length} smoke bot-event(s)`)
      } catch (err) {
        console.error(`Bot-event cleanup failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exitCode = 1
      }
    }

    if (createdTempProductId !== null) {
      try {
        await deleteTempProduct(payload, createdTempProductId)
        console.log(`Cleanup: deleted temp smoke product ${String(createdTempProductId)}`)
      } catch (err) {
        console.error(`Temp smoke product cleanup failed: ${err instanceof Error ? err.message : String(err)}`)
        process.exitCode = 1
      }
    }

    await payload.destroy()
  }

  if (!process.exitCode) {
    console.log('')
    console.log(
      args.createTempProduct
        ? 'Smoke result: temp smoke product was created, activated, restored, and deleted.'
        : 'Smoke result: activation helper mutated and rollback restored the smoke product.',
    )
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
