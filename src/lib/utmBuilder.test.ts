import assert from 'node:assert'

import {
  buildProductUtmUrl,
  evaluateProductUtmEligibility,
  normalizeCampaign,
  validateUtmInputs,
} from './utmBuilder'

let passed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (error) {
    console.error(`  fail - ${name}\n    ${(error as Error).message}`)
    process.exitCode = 1
  }
}

const publicProduct = {
  title: 'Siyah Gunluk Loafer',
  brand: 'Generic',
  slug: 'siyah-gunluk-loafer-sn0901',
  status: 'active',
}

check('normalizes and validates a controlled UTM vocabulary', () => {
  const campaign = normalizeCampaign('First Loafers Test')
  assert.strictEqual(campaign, 'first_loafers_test')
  assert.deepStrictEqual(validateUtmInputs('instagram', 'social', campaign), [])
})

check('allows UTM links only for active storefront-safe products', () => {
  assert.deepStrictEqual(evaluateProductUtmEligibility(publicProduct), { ok: true, reason: null })
  const url = buildProductUtmUrl(publicProduct.slug, 'instagram', 'social', 'first_loafers_test', 'SN0901_comfort')
  assert.ok(url.includes('/products/siyah-gunluk-loafer-sn0901'))
  assert.ok(url.includes('utm_content=SN0901_comfort'))
})

check('refuses draft, protected-brand, placeholder, sold-out, and slug-less UTM targets', () => {
  assert.strictEqual(evaluateProductUtmEligibility({ ...publicProduct, status: 'draft' }).ok, false)
  assert.strictEqual(evaluateProductUtmEligibility({ ...publicProduct, title: 'Nike Gunluk Ayakkabi', brand: 'Nike' }).ok, false)
  assert.strictEqual(evaluateProductUtmEligibility({ ...publicProduct, description: 'Nike tarzinda urun' }).ok, false)
  assert.strictEqual(evaluateProductUtmEligibility({ ...publicProduct, title: 'Taslak Urun 5280' }).ok, false)
  assert.strictEqual(evaluateProductUtmEligibility({ ...publicProduct, status: 'soldout' }).ok, false)
  assert.strictEqual(evaluateProductUtmEligibility({ ...publicProduct, slug: '' }).ok, false)
})

console.log(`\nutmBuilder: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
