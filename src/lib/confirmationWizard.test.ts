/**
 * confirmationWizard.test.ts - focused checks for the Telegram product wizard.
 *
 * Run: `tsx src/lib/confirmationWizard.test.ts`.
 */
import assert from 'node:assert'
import {
  CHANNEL_OPTIONS,
  formatConfirmationSummary,
  getNextWizardStep,
  getTargetsPrompt,
  isWizardChannelTarget,
  normalizeWizardChannelTargets,
} from './confirmationWizard'
import { ACTIVE_PRODUCT_CHANNELS } from './productChannels'

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

async function main() {
  await check('wizard channel options include exactly the active product channels', () => {
    const optionValues = CHANNEL_OPTIONS.map((option) => option.value)

    assert.deepStrictEqual(optionValues, [...ACTIVE_PRODUCT_CHANNELS])
    assert.ok(CHANNEL_OPTIONS.some((option) => option.value === 'x'))
    assert.ok(!CHANNEL_OPTIONS.some((option) => ['dolap', 'threads'].includes(option.value)))
  })

  await check('target prompt exposes every active channel callback', () => {
    const prompt = getTargetsPrompt()
    const callbacks = prompt.keyboard[0].map((button) => button.callback_data)

    assert.deepStrictEqual(
      callbacks,
      ACTIVE_PRODUCT_CHANNELS.map((channel) => `wz_tgt:${channel}`),
    )
  })

  await check('wizard target normalization drops retired and unknown channels', () => {
    assert.deepStrictEqual(
      normalizeWizardChannelTargets(['website', 'dolap', 'threads', 'x', 'website', 'tiktok']),
      ['website', 'x'],
    )
    assert.strictEqual(isWizardChannelTarget('x'), true)
    assert.strictEqual(isWizardChannelTarget('threads'), false)
  })

  await check('wizard step requires at least one active target', () => {
    const step = getNextWizardStep({
      id: 10,
      title: 'Smoke Loafer',
      category: 'Klasik',
      price: 1000,
      brand: 1,
      variants: [{ id: 1, size: '42', stock: 2 }],
      channelTargets: ['dolap'],
    }, { category: 'Klasik' })

    assert.strictEqual(step, 'targets')
  })

  await check('confirmation summary only shows active targets', () => {
    const summary = formatConfirmationSummary({
      id: 11,
      title: 'Smoke Loafer',
      sku: 'SN0011',
      category: 'Klasik',
      price: 1000,
      variants: [{ id: 1, size: '42', stock: 2 }],
      images: [{ id: 1 }],
    }, {
      brand: 'Generic',
      channelTargets: ['website', 'x', 'threads'],
    })

    assert.ok(summary.includes('website, x'), summary)
    assert.ok(!summary.includes('threads'), summary)
  })

  console.log(`\nconfirmationWizard: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
