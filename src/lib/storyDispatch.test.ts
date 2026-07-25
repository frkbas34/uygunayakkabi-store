/**
 * storyDispatch.test.ts - Story dispatch safety checks.
 */
import assert from 'node:assert'
import { dispatchStory, generateStoryCaption } from './storyDispatch'

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
    id: 901,
    status: 'active',
    title: 'Siyah Tokali Loafer',
    brand: 'Generic',
    price: 2199,
    images: [{ image: { url: 'https://cdn.example.com/p/901.jpg' } }],
    variants: [{ size: '40' }, { size: '41' }, { size: '42' }],
    storySettings: {
      enabled: true,
      autoOnPublish: true,
      skipApproval: true,
    },
    sourceMeta: { storyStatus: 'none' },
    ...overrides,
  }
}

function payloadMock() {
  const createCalls: Array<Record<string, unknown>> = []
  const updateCalls: Array<Record<string, unknown>> = []

  return {
    createCalls,
    updateCalls,
    payload: {
      async create(args: Record<string, unknown>) {
        createCalls.push(args)
        return { id: 1234 }
      },
      async update(args: Record<string, unknown>) {
        updateCalls.push(args)
        return { id: args.id }
      },
    },
  }
}

const targets = [
  { id: 'tg', platform: 'telegram', label: 'Telegram', enabled: true, priority: 1, requiresApproval: false },
  { id: 'ig', platform: 'instagram', label: 'Instagram', enabled: true, priority: 2, requiresApproval: false },
]

async function main() {
  await check('clean product creates a queued StoryJob and sourceMeta update', async () => {
    const mock = payloadMock()
    const result = await dispatchStory(product(), targets, mock.payload as any, 'telegram_command')

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.jobCreated, true)
    assert.strictEqual(result.status, 'queued')
    assert.strictEqual(mock.createCalls.length, 1)
    assert.strictEqual(mock.updateCalls.length, 1)
    assert.deepStrictEqual((mock.createCalls[0].data as any).targets, ['telegram', 'instagram'])
  })

  await check('protected-brand product does not create a StoryJob', async () => {
    const mock = payloadMock()
    const result = await dispatchStory(product({
      title: 'Nike Air Max Spor Ayakkabi',
      brand: 'Nike',
      content: {
        commercePack: {
          facebookCopy: 'Nike Air Max yeni sezon.',
        },
      },
    }), targets, mock.payload as any, 'auto_publish')

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.jobCreated, false)
    assert.strictEqual(result.status, 'brand_safety_blocked')
    assert.deepStrictEqual(result.blockedTargets, ['telegram', 'instagram'])
    assert.ok(result.error?.includes('brand_safety_block'))
    assert.strictEqual(mock.createCalls.length, 0)
    assert.strictEqual(mock.updateCalls.length, 1)

    const updateData = (mock.updateCalls[0].data as any).sourceMeta
    assert.strictEqual(updateData.storyStatus, 'failed')
    assert.ok(updateData.lastStoryError.includes('brand_safety_block'))
    assert.strictEqual(updateData.lastStoryCaption, '')
    assert.deepStrictEqual(JSON.parse(updateData.storyTargetsFailed), ['telegram', 'instagram'])
  })

  await check('story caption remains simple for clean products', () => {
    const caption = generateStoryCaption(product())
    assert.ok(caption.includes('Siyah Tokali Loafer'))
    assert.ok(caption.includes('2199'))
    assert.ok(caption.includes('40-42'))
  })

  console.log(`\nstoryDispatch: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
