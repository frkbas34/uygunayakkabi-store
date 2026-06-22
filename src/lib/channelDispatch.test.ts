/**
 * channelDispatch.test.ts - standalone checks for channel eligibility and
 * dry-run dispatch behavior. No external API calls are made.
 */
import assert from 'node:assert'
import {
  SUPPORTED_CHANNELS,
  dispatchProductToChannels,
  evaluateChannelEligibility,
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

  console.log(`\nchannelDispatch: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
