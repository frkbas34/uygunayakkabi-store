/**
 * operatorActionsRedispatch.test.ts - standalone checks for Telegram one-channel
 * redispatch behavior. Payload is faked and channel env vars are controlled so
 * no external API calls are made.
 */
import assert from 'node:assert'
import { resolveChannelAlias, triggerChannelRedispatch } from './operatorActions'

type PayloadCalls = {
  findByID: Array<Record<string, any>>
  findGlobal: Array<Record<string, any>>
  update: Array<Record<string, any>>
  queue: Array<Record<string, any>>
}

let passed = 0

async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

function activeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 801,
    slug: 'siyah-tokali-loafer-sn0801',
    title: 'Siyah Tokali Loafer',
    brand: 'Generic',
    status: 'active',
    price: 2099,
    stockQuantity: 4,
    description: 'Rahat gunluk loafer.',
    channelTargets: ['instagram', 'facebook', 'x', 'shopier'],
    channels: {
      publishInstagram: true,
      publishFacebook: true,
      publishX: true,
      publishShopier: true,
    },
    images: [{ image: { url: 'https://cdn.example.com/p/801.jpg' } }],
    sourceMeta: {
      dispatchNotes: JSON.stringify([
        { channel: 'instagram', eligible: true, dispatched: true, webhookConfigured: false, timestamp: 'old-ig' },
        { channel: 'x', eligible: true, dispatched: true, webhookConfigured: false, timestamp: 'old-x' },
        { channel: 'facebook', eligible: true, dispatched: true, webhookConfigured: false, timestamp: 'old-fb' },
        { channel: 'shopier', eligible: true, dispatched: false, skippedReason: 'queued-via-jobs-queue', webhookConfigured: false, timestamp: 'old-shopier' },
      ]),
    },
    ...overrides,
  }
}

const settings = {
  channelPublishing: {
    publishInstagram: true,
    publishFacebook: true,
    publishX: true,
    publishShopier: true,
  },
}

function fakePayload(product: Record<string, unknown> | null) {
  const calls: PayloadCalls = { findByID: [], findGlobal: [], update: [], queue: [] }
  return {
    calls,
    payload: {
      findByID: async (args: Record<string, any>) => {
        calls.findByID.push(args)
        return product
      },
      findGlobal: async (args: Record<string, any>) => {
        calls.findGlobal.push(args)
        return settings
      },
      update: async (args: Record<string, any>) => {
        calls.update.push(args)
        return { id: args.id, ...args.data }
      },
      jobs: {
        queue: async (args: Record<string, any>) => {
          calls.queue.push(args)
          return { id: calls.queue.length, ...args }
        },
      },
    },
  }
}

const ENV_KEYS = [
  'N8N_CHANNEL_INSTAGRAM_WEBHOOK',
  'N8N_CHANNEL_FACEBOOK_WEBHOOK',
  'N8N_CHANNEL_X_WEBHOOK',
  'N8N_CHANNEL_SHOPIER_WEBHOOK',
  'X_ACCESS_TOKEN',
  'X_API_KEY',
  'X_API_SECRET',
  'X_ACCESS_TOKEN_SECRET',
  'SHOPIER_PAT',
  'INSTAGRAM_PAGE_ID',
] as const

async function withCleanDispatchEnv<T>(fn: () => T | Promise<T>): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key])
    delete process.env[key]
  }
  try {
    return await fn()
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous.get(key)
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

async function main() {
  await check('channel aliases allow active channels and reject retired channels', () => {
    assert.strictEqual(resolveChannelAlias('ig'), 'instagram')
    assert.strictEqual(resolveChannelAlias('tweet'), 'x')
    assert.strictEqual(resolveChannelAlias('fb'), 'facebook')
    assert.strictEqual(resolveChannelAlias('shop'), 'shopier')
    assert.strictEqual(resolveChannelAlias('website'), 'website')
    assert.strictEqual(resolveChannelAlias('dolap'), null)
    assert.strictEqual(resolveChannelAlias('threads'), null)
  })

  await check('website redispatch is refused before product lookup', async () => {
    await withCleanDispatchEnv(async () => {
      const fake = fakePayload(activeProduct())
      const result = await triggerChannelRedispatch(fake.payload, 801, 'website')

      assert.strictEqual(result.ok, false)
      assert.strictEqual(result.refusalReason, 'website_no_dispatch_path')
      assert.strictEqual(fake.calls.findByID.length, 0)
      assert.strictEqual(fake.calls.update.length, 0)
    })
  })

  await check('inactive products are refused without updating dispatch notes', async () => {
    await withCleanDispatchEnv(async () => {
      const fake = fakePayload(activeProduct({ status: 'draft' }))
      const result = await triggerChannelRedispatch(fake.payload, 801, 'x')

      assert.strictEqual(result.ok, false)
      assert.strictEqual(result.refusalReason, 'product_not_active')
      assert.strictEqual(fake.calls.update.length, 0)
    })
  })

  await check('redispatch persists only the requested channel result and preserves other notes', async () => {
    await withCleanDispatchEnv(async () => {
      const fake = fakePayload(activeProduct())
      const result = await triggerChannelRedispatch(fake.payload, 801, 'x')

      assert.strictEqual(result.ok, true)
      assert.strictEqual(result.channel, 'x')
      assert.strictEqual(result.results?.length, 1)
      assert.strictEqual((result.results?.[0] as any).channel, 'x')
      assert.ok(!result.message.includes('not in onlyChannels'), result.message)

      assert.strictEqual(fake.calls.update.length, 1)
      assert.deepStrictEqual(fake.calls.update[0].context, { isDispatchUpdate: true })
      const notes = JSON.parse(fake.calls.update[0].data.sourceMeta.dispatchNotes)
      assert.strictEqual(notes.filter((n: any) => n.channel === 'x').length, 1)
      assert.strictEqual(notes.filter((n: any) => n.channel === 'instagram').length, 1)
      assert.strictEqual(notes.filter((n: any) => n.channel === 'facebook').length, 1)
      assert.strictEqual(notes.filter((n: any) => n.channel === 'shopier').length, 1)
      assert.ok(notes.find((n: any) => n.channel === 'x').skippedReason.includes('N8N_CHANNEL_X_WEBHOOK'))
      assert.strictEqual(fake.calls.queue.length, 0)
    })
  })

  await check('Shopier redispatch queues exactly one shopier-sync job when PAT exists', async () => {
    await withCleanDispatchEnv(async () => {
      process.env.SHOPIER_PAT = 'test-token'
      const fake = fakePayload(activeProduct())
      const result = await triggerChannelRedispatch(fake.payload, 801, 'shopier')

      assert.strictEqual(result.ok, true)
      assert.strictEqual(result.results?.length, 1)
      assert.strictEqual((result.results?.[0] as any).channel, 'shopier')
      assert.strictEqual((result.results?.[0] as any).skippedReason, 'queued-via-jobs-queue')
      assert.strictEqual(fake.calls.update.length, 1)
      assert.strictEqual(fake.calls.update[0].data.sourceMeta.shopierSyncStatus, 'queued')
      assert.strictEqual(fake.calls.queue.length, 1)
      assert.deepStrictEqual(fake.calls.queue[0], {
        task: 'shopier-sync',
        input: { productId: '801' },
        overrideAccess: true,
      })
    })
  })

  console.log(`\noperatorActionsRedispatch: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
