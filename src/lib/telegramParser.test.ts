/**
 * telegramParser.test.ts - focused checks for Telegram caption intake parsing.
 *
 * Run: `tsx src/lib/telegramParser.test.ts`.
 */
import assert from 'node:assert'
import { parseTelegramCaption } from './telegram'

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
  await check('caption parser recognizes all active channel targets', () => {
    const parsed = parseTelegramCaption([
      'Baslik: Smoke Test Loafer',
      'Fiyat: 1000',
      'Marka: Generic',
      'Kategori: Klasik',
      'Kanallar: website, instagram, shopier, x, facebook',
    ].join('\n'))

    assert.ok(parsed)
    assert.deepStrictEqual(parsed.channelTargets, ['website', 'instagram', 'shopier', 'x', 'facebook'])
  })

  await check('caption parser supports common X and Facebook aliases', () => {
    const parsed = parseTelegramCaption([
      'Baslik: Smoke Test Loafer',
      'Fiyat: 1000',
      'Marka: Generic',
      'Kategori: Klasik',
      'Channels: site, twitter, fb',
    ].join('\n'))

    assert.ok(parsed)
    assert.deepStrictEqual(parsed.channelTargets, ['website', 'x', 'facebook'])
  })

  await check('caption parser preserves legacy Instagram yes shorthand', () => {
    const parsed = parseTelegramCaption([
      'Baslik: Smoke Test Loafer',
      'Fiyat: 1000',
      'Marka: Generic',
      'Kategori: Klasik',
      'Instagram: evet',
    ].join('\n'))

    assert.ok(parsed)
    assert.deepStrictEqual(parsed.channelTargets, ['website', 'instagram'])
    assert.strictEqual(parsed.publishRequested, true)
  })

  await check('caption parser does not reintroduce retired channels', () => {
    const parsed = parseTelegramCaption([
      'Baslik: Smoke Test Loafer',
      'Fiyat: 1000',
      'Marka: Generic',
      'Kategori: Klasik',
      'Kanallar: dolap, threads, website',
    ].join('\n'))

    assert.ok(parsed)
    assert.deepStrictEqual(parsed.channelTargets, ['website'])
  })

  console.log(`\ntelegramParser: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
}

void main()
