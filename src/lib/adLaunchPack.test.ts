/**
 * adLaunchPack.test.ts - D-380 manual ad launch-pack checks.
 */
import assert from 'node:assert'
import { buildAdLaunchPack, formatAdLaunchPackMessage } from './adLaunchPack'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

const readyProduct = {
  id: 201,
  stockNumber: 'SN0201',
  title: 'Siyah Gunluk Loafer',
  slug: 'siyah-gunluk-loafer-sn0201',
  status: 'active',
  description: 'Gunluk kullanim icin sade loafer.',
  generativeGallery: [{ image: 1 }, { image: 2 }],
  imageQuality: { status: 'pass' },
  variants: [{ size: '42', stock: 4 }, { size: '43', stock: 2 }],
  channelTargets: ['website', 'instagram'],
  channels: { publishWebsite: true, publishInstagram: true },
}

const blockedBrandProduct = {
  ...readyProduct,
  id: 202,
  stockNumber: 'SN0202',
  title: 'Nike Air Max Siyah',
  slug: 'nike-air-max-siyah-sn0202',
  brand: 'Nike',
}

const reviewProduct = {
  id: 203,
  stockNumber: 'SN0203',
  title: 'Orijinal Deri Gunluk',
  slug: 'orijinal-deri-gunluk-sn0203',
  status: 'active',
  productType: 'Loafer',
  color: 'Siyah',
  description: 'Orijinal deri gorunumlu rahat model.',
  generativeGallery: [{ image: 9 }],
  imageQuality: { status: 'pass' },
  stockQuantity: 3,
  channelTargets: ['website', 'instagram'],
  channels: { publishWebsite: true, publishInstagram: true },
}

check('ready product builds Meta paid-social copy drafts and UTM content links', () => {
  const pack = buildAdLaunchPack(readyProduct, { campaign: 'first loafers test' })

  assert.strictEqual(pack.level, 'ready')
  assert.strictEqual(pack.canLaunchManually, true)
  assert.strictEqual(pack.campaign.source, 'meta')
  assert.strictEqual(pack.campaign.medium, 'paid_social')
  assert.strictEqual(pack.campaign.name, 'first_loafers_test')
  assert.ok(pack.copyDrafts.length >= 3)
  assert.ok(pack.copyDrafts.every((draft) => draft.utmUrl.includes('utm_source=meta')))
  assert.ok(pack.copyDrafts.every((draft) => draft.utmUrl.includes('utm_medium=paid_social')))
  assert.ok(pack.copyDrafts.every((draft) => draft.utmUrl.includes('utm_content=')))
})

check('protected brand blocks launch pack copy drafts', () => {
  const pack = buildAdLaunchPack(blockedBrandProduct)

  assert.strictEqual(pack.level, 'blocked')
  assert.strictEqual(pack.canLaunchManually, false)
  assert.strictEqual(pack.copyDrafts.length, 0)
  assert.ok(pack.blockers.some((line) => line.includes('Nike')), pack.blockers.join('\n'))
})

check('review product gets safe fallback title without risky claim wording', () => {
  const pack = buildAdLaunchPack(reviewProduct)

  assert.strictEqual(pack.level, 'review')
  assert.strictEqual(pack.canLaunchManually, false)
  assert.strictEqual(pack.product.safeTitle, 'Siyah Loafer')
  assert.ok(pack.copyDrafts.length >= 3)
  const allCopy = pack.copyDrafts.map((draft) => `${draft.headline} ${draft.primaryText}`).join(' ')
  assert.ok(!/orijinal/i.test(allCopy), allCopy)
})

check('invalid UTM options hard-block the pack', () => {
  const pack = buildAdLaunchPack(readyProduct, {
    source: 'unknown_source',
    medium: 'paid_social',
    campaign: 'first loafers test',
  })

  assert.strictEqual(pack.level, 'blocked')
  assert.strictEqual(pack.canLaunchManually, false)
  assert.strictEqual(pack.copyDrafts.length, 0)
  assert.ok(pack.campaign.validationErrors.length > 0)
})

check('formatter is explicit that nothing is launched automatically', () => {
  const pack = buildAdLaunchPack(readyProduct)
  const msg = formatAdLaunchPackMessage(pack)

  assert.ok(msg.includes('Manual Ad Pack'))
  assert.ok(msg.includes('utm_source=meta'))
  assert.ok(msg.includes('no campaign is created'))
  assert.ok(msg.includes('No autonomous ad spend'))
})

console.log(`\nadLaunchPack: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
if (process.exitCode) process.exit(process.exitCode)
