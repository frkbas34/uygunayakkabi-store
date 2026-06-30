/**
 * adReadiness.test.ts — D-348 standalone checks for the manual ad-readiness
 * checklist. No test framework required (matches publishReadiness/channelDispatchStatus).
 */
import assert from 'node:assert'
import { evaluateAdReadiness, formatAdReadinessMessage } from './adReadiness'

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

// ── Fixtures ───────────────────────────────────────────────────────────────────

const readyProduct = {
  id: 101,
  title: 'Rahat Gunluk Ayakkabi',
  slug: 'rahat-gunluk-ayakkabi-sn0101',
  status: 'active',
  description: 'Gunluk kullanim icin hafif ve rahat ayakkabi.',
  generativeGallery: [{ image: 1 }, { image: 2 }],
  imageQuality: { status: 'pass' },
  variants: [{ size: '42', stock: 5 }, { size: '43', stock: 3 }],
  channelTargets: ['website', 'instagram'],
  channels: { publishWebsite: true, publishInstagram: true },
}

const blockedProduct = {
  id: 102,
  title: 'Nike Air Max Spor',           // protected brand → hard block
  status: 'draft',                       // page not live
  // no slug, no media, no stock
  stockQuantity: 0,
}

const reviewProduct = {
  id: 103,
  title: 'Orijinal Deri Gunluk',         // 'orijinal' risky claim (no brand) → warn
  slug: 'orijinal-deri-gunluk-sn0103',
  status: 'active',
  description: 'Orijinal deri gorunumlu rahat model.',
  generativeGallery: [{ image: 9 }],
  imageQuality: { status: 'pass' },
  // no variants + product-level stock → size-clarity warning
  stockQuantity: 4,
  channelTargets: ['website', 'instagram'],
  channels: { publishWebsite: true, publishInstagram: true },
}

// ── Checks ─────────────────────────────────────────────────────────────────────

check('fully ready product is ready with no blockers/warnings', () => {
  const r = evaluateAdReadiness(readyProduct)
  assert.strictEqual(r.level, 'ready')
  assert.strictEqual(r.blockers.length, 0)
  assert.strictEqual(r.warnings.length, 0)
  assert.strictEqual(r.passedCount, r.totalCount)
  assert.ok(r.sampleUtmUrl && r.sampleUtmUrl.includes('utm_campaign=manual_ads'))
})

check('draft + brand + no media/stock is blocked', () => {
  const r = evaluateAdReadiness(blockedProduct)
  assert.strictEqual(r.level, 'blocked')
  const keys = r.checks.filter((c) => !c.ok && !c.warn).map((c) => c.key)
  assert.ok(keys.includes('product_page'))
  assert.ok(keys.includes('media_clean'))
  assert.ok(keys.includes('stock_size'))
  assert.ok(keys.includes('brand_safety'))
  assert.strictEqual(r.sampleUtmUrl, null) // no slug
})

check('single-stock + risky claim is review (warnings, no blockers)', () => {
  const r = evaluateAdReadiness(reviewProduct)
  assert.strictEqual(r.level, 'review')
  assert.strictEqual(r.blockers.length, 0)
  const warnKeys = r.checks.filter((c) => c.warn === true).map((c) => c.key)
  assert.ok(warnKeys.includes('stock_size'))
  assert.ok(warnKeys.includes('risky_claims'))
})

check('no-autonomous-spend guardrail always passes', () => {
  for (const p of [readyProduct, blockedProduct, reviewProduct]) {
    const r = evaluateAdReadiness(p)
    const spend = r.checks.find((c) => c.key === 'no_autonomous_spend')
    assert.ok(spend && spend.ok === true)
  }
})

check('null/odd product fails soft (blocked, no throw)', () => {
  const r = evaluateAdReadiness(null)
  assert.strictEqual(r.level, 'blocked')
  assert.ok(Array.isArray(r.checks))
})

check('formatter returns Turkish HTML with level label + sample link', () => {
  const r = evaluateAdReadiness(readyProduct)
  const msg = formatAdReadinessMessage(readyProduct, r)
  assert.ok(msg.includes('REKLAMA HAZIR'))
  assert.ok(msg.includes('Örnek UTM linki'))
  assert.ok(msg.includes('hiçbir reklam yayınlanmaz'))
})

console.log(`\nadReadiness: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
