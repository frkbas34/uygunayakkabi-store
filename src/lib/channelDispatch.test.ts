/**
 * channelDispatch.test.ts - standalone checks for channel eligibility and
 * dry-run dispatch behavior. No external API calls are made.
 */
import assert from 'node:assert'
import {
  SUPPORTED_CHANNELS,
  dispatchProductToChannels,
  evaluateChannelEligibility,
  hasPublicHttpsMediaUrl,
  type SupportedChannel,
} from './channelDispatch'

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

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 701,
    slug: 'siyah-tokali-loafer-sn0701',
    title: 'Siyah Tokali Loafer',
    brand: 'Generic',
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
    images: [{ image: { url: 'https://cdn.example.com/p/701.jpg' } }],
    content: {
      commercePack: {
        instagramCaption: 'Siyah tokali loafer yayinda.',
        facebookCopy: 'Siyah tokali loafer yayinda.',
        xPost: 'Siyah tokali loafer yayinda. [Link]',
        shopierCopy: 'Siyah tokali loafer.',
      },
    },
    ...overrides,
  }
}

const allEnabledSettings = {
  channelPublishing: {
    publishInstagram: true,
    publishFacebook: true,
    publishX: true,
    publishShopier: true,
  },
}

const X_ENV_KEYS = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET', 'N8N_CHANNEL_X_WEBHOOK'] as const

async function withEnvironment<T>(
  values: Record<string, string | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }

  try {
    return await run()
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

async function withXEnvironment<T>(
  values: Partial<Record<(typeof X_ENV_KEYS)[number], string>>,
  run: () => Promise<T>,
): Promise<T> {
  return withEnvironment(
    Object.fromEntries(X_ENV_KEYS.map((key) => [key, values[key]])),
    run,
  )
}

async function main() {
  await check('supported dispatch channels exclude website and retired channels', () => {
    assert.deepStrictEqual(
      SUPPORTED_CHANNELS,
      ['instagram', 'shopier', 'x', 'facebook'] satisfies SupportedChannel[],
    )
    assert.ok(!SUPPORTED_CHANNELS.includes('dolap' as SupportedChannel))
    assert.ok(!SUPPORTED_CHANNELS.includes('threads' as SupportedChannel))
    assert.ok(!SUPPORTED_CHANNELS.includes('website' as SupportedChannel))
  })

  await check('unsupported channelTargets never become eligible', () => {
    const { eligible, skipped } = evaluateChannelEligibility(product({
      channelTargets: ['website', 'dolap', 'threads', 'instagram'],
      channels: {
        publishInstagram: true,
        publishDolap: true,
        publishThreads: true,
        publishWebsite: true,
      },
    }), allEnabledSettings as any)

    assert.deepStrictEqual(eligible, ['instagram'])
    assert.ok(skipped.facebook.includes('not in channelTargets'), skipped.facebook)
    assert.ok(skipped.x.includes('not in channelTargets'), skipped.x)
    assert.ok(skipped.shopier.includes('not in channelTargets'), skipped.shopier)
  })

  await check('product channel flags can block a targeted channel', () => {
    const { eligible, skipped } = evaluateChannelEligibility(product({
      channels: {
        publishInstagram: true,
        publishFacebook: false,
        publishX: true,
        publishShopier: true,
      },
    }), allEnabledSettings as any)

    assert.deepStrictEqual(eligible.sort(), ['instagram', 'shopier', 'x'].sort())
    assert.strictEqual(skipped.facebook, 'channels.publishFacebook is explicitly false')
  })

  await check('global channel settings can block a targeted channel', () => {
    const { eligible, skipped } = evaluateChannelEligibility(product(), {
      channelPublishing: {
        publishInstagram: true,
        publishFacebook: true,
        publishX: false,
        publishShopier: true,
      },
    } as any)

    assert.deepStrictEqual(eligible.sort(), ['facebook', 'instagram', 'shopier'].sort())
    assert.strictEqual(skipped.x, 'AutomationSettings.channelPublishing.publishX globally disabled')
  })

  await check('website-only target does not dispatch externally', async () => {
    const result = await dispatchProductToChannels(product({
      channelTargets: ['website'],
    }), allEnabledSettings as any, 'test:website-only', { dryRun: true })

    assert.deepStrictEqual(result.dispatchedChannels, [])
    assert.strictEqual(result.results.length, 4)
    assert.ok(result.results.every((r) => !r.eligible && r.skippedReason?.includes('not in channelTargets')))
  })

  await check('dry-run onlyChannels previews exactly one eligible channel', async () => {
    const result = await dispatchProductToChannels(
      product(),
      allEnabledSettings as any,
      'test:dry-run',
      { dryRun: true, onlyChannels: ['x'] },
    )

    const preview = result.results.find((r) => r.channel === 'x')
    assert.strictEqual(preview?.eligible, true)
    assert.strictEqual(preview?.skippedReason, 'dry-run-preview')
    assert.strictEqual(preview?.publishResult?.mode, 'preview')

    const restricted = result.results.filter((r) => r.channel !== 'x')
    assert.strictEqual(restricted.length, 3)
    assert.ok(restricted.every((r) => r.eligible && r.skippedReason?.includes('not in onlyChannels')))
  })

  await check('brand safety blocks all otherwise eligible external channels', async () => {
    const result = await dispatchProductToChannels(product({
      title: 'Siyah Spor Ayakkabi',
      brand: 'Nike',
    }), allEnabledSettings as any, 'test:brand-block', { dryRun: true })

    assert.deepStrictEqual(result.dispatchedChannels, [])
    const blocked = result.results.filter((r) => r.skippedReason?.includes('brand_safety_block'))
    assert.strictEqual(blocked.length, 4)
    assert.ok(blocked.every((r) => !r.eligible))
  })

  await check('direct Meta media selection accepts a later public HTTPS gallery image', () => {
    assert.strictEqual(hasPublicHttpsMediaUrl(['http://local.test/first.jpg', 'https://cdn.example.test/second.jpg']), true)
    assert.strictEqual(hasPublicHttpsMediaUrl(['/api/media/file/first.jpg', 'http://local.test/second.jpg']), false)
  })

  await check('Instagram direct publish uses a later public HTTPS image instead of falling back', async () => {
    const originalFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = async (input) => {
      const url = String(input)
      calls.push(url)
      if (url === 'https://cdn.example.test/second.jpg') return new Response('', { status: 200 })
      if (url.includes('/media_publish?')) return new Response(JSON.stringify({ id: 'ig-post-701' }), { status: 200 })
      if (url.includes('/media?')) return new Response(JSON.stringify({ id: 'ig-container-701' }), { status: 200 })
      throw new Error(`Unexpected Instagram fetch: ${url}`)
    }

    try {
      const result = await dispatchProductToChannels(
        product({
          channelTargets: ['instagram'],
          images: [
            { image: { url: 'http://local.test/first.jpg' } },
            { image: { url: 'https://cdn.example.test/second.jpg' } },
          ],
        }),
        {
          channelPublishing: { publishInstagram: true },
          instagramTokens: { accessToken: 'ig-test-token', userId: 'ig-user-701' },
        } as any,
        'test:instagram-later-public-image',
        { onlyChannels: ['instagram'] },
      )
      const instagram = result.results.find((entry) => entry.channel === 'instagram')

      assert.strictEqual(instagram?.dispatched, true)
      assert.strictEqual(instagram?.publishResult?.mediaUrl, 'https://cdn.example.test/second.jpg')
      assert.ok(calls.some((url) => url.includes('graph.facebook.com')), 'expected Instagram direct Graph API calls')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await check('Facebook direct publish resolves its Page ID from INSTAGRAM_PAGE_ID', async () => {
    const originalFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = async (input) => {
      const url = String(input)
      calls.push(url)
      if (url === 'https://cdn.example.test/second.jpg') return new Response('', { status: 200 })
      if (url.includes('?fields=access_token,name,id&')) {
        return new Response(JSON.stringify({ access_token: 'fb-page-token', name: 'Test Page', id: 'fb-page-701' }), { status: 200 })
      }
      if (url.includes('/photos?')) return new Response(JSON.stringify({ id: 'fb-post-701' }), { status: 200 })
      throw new Error(`Unexpected Facebook fetch: ${url}`)
    }

    try {
      await withEnvironment({ INSTAGRAM_PAGE_ID: 'fb-page-701' }, async () => {
        const result = await dispatchProductToChannels(
          product({
            channelTargets: ['facebook'],
            images: [
              { image: { url: 'http://local.test/first.jpg' } },
              { image: { url: 'https://cdn.example.test/second.jpg' } },
            ],
          }),
          {
            channelPublishing: { publishFacebook: true },
            instagramTokens: { accessToken: 'fb-user-token' },
          } as any,
          'test:facebook-page-id-env',
          { onlyChannels: ['facebook'] },
        )
        const facebook = result.results.find((entry) => entry.channel === 'facebook')

        assert.strictEqual(facebook?.dispatched, true)
        assert.strictEqual(facebook?.publishResult?.mediaUrl, 'https://cdn.example.test/second.jpg')
        assert.ok(calls.some((url) => url.includes('graph.facebook.com')), 'expected Facebook direct Graph API calls')
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  await check('Meta dispatch refuses unusable media before an optional fallback can run', async () => {
    await withEnvironment({
      N8N_CHANNEL_INSTAGRAM_WEBHOOK: 'https://fallback.example.test/instagram',
      N8N_CHANNEL_FACEBOOK_WEBHOOK: 'https://fallback.example.test/facebook',
    }, async () => {
      const originalFetch = globalThis.fetch
      const calls: string[] = []
      globalThis.fetch = async (input) => {
        calls.push(String(input))
        throw new Error('Meta media preflight must prevent all fetch calls')
      }

      try {
        const result = await dispatchProductToChannels(
          product({
            channelTargets: ['instagram', 'facebook'],
            images: [{ image: { url: 'http://local.test/only-image.jpg' } }],
          }),
          {
            channelPublishing: { publishInstagram: true, publishFacebook: true },
            instagramTokens: {
              accessToken: 'meta-test-token',
              userId: 'ig-user-701',
              facebookPageId: 'fb-page-701',
            },
          } as any,
          'test:meta-no-public-media',
        )

        const metaResults = result.results.filter((entry) => entry.channel === 'instagram' || entry.channel === 'facebook')
        assert.strictEqual(metaResults.length, 2)
        assert.ok(metaResults.every((entry) => entry.dispatched === false && entry.webhookConfigured === true))
        assert.ok(metaResults.every((entry) => /public HTTPS media URL/.test(entry.error ?? '')))
        assert.deepStrictEqual(calls, [])
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  await check('partial X OAuth configuration uses the optional webhook fallback instead of direct publish', async () => {
    await withXEnvironment({
      X_ACCESS_TOKEN: 'partial-x-token',
      N8N_CHANNEL_X_WEBHOOK: 'https://fallback.example.test/x',
    }, async () => {
      const originalFetch = globalThis.fetch
      const calls: string[] = []
      globalThis.fetch = async (input) => {
        calls.push(String(input))
        return new Response(JSON.stringify({ received: true, channel: 'x' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      try {
        const result = await dispatchProductToChannels(
          product(),
          allEnabledSettings as any,
          'test:x-partial-fallback',
          { onlyChannels: ['x'] },
        )
        const x = result.results.find((entry) => entry.channel === 'x')

        assert.strictEqual(x?.dispatched, true)
        assert.strictEqual(x?.webhookConfigured, true)
        assert.deepStrictEqual(calls, ['https://fallback.example.test/x'])
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  await check('partial X OAuth configuration without a fallback records the missing credential names', async () => {
    await withXEnvironment({ X_ACCESS_TOKEN: 'partial-x-token' }, async () => {
      const result = await dispatchProductToChannels(
        product(),
        allEnabledSettings as any,
        'test:x-partial-no-fallback',
        { onlyChannels: ['x'] },
      )
      const x = result.results.find((entry) => entry.channel === 'x')

      assert.strictEqual(x?.dispatched, false)
      assert.match(x?.error ?? '', /X_API_KEY/)
      assert.match(x?.error ?? '', /X_ACCESS_TOKEN_SECRET/)
    })
  })

  console.log(`\nchannelDispatch: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
