/**
 * brandSafety.test.ts — D-336A/B standalone validation (no test framework in repo).
 *
 * Run: bundle with esbuild → node, or `npx tsx src/lib/brandSafety.test.ts`.
 * Asserts the D-336 policy. Exits non-zero on any failure.
 */
import assert from 'node:assert'
import { scanBrandSafety, scanProductBrandSafety } from './brandSafety'

let passed = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

// 1. Clean #359-like product → safe, low, no brands.
check('clean loafer (359-like) passes', () => {
  const p = {
    title: 'Premium Kahve Püsküllü Loafer',
    description: 'Klasik stile modern dokunuş, mokasen dikişli, kaba taban.',
    content: {
      commercePack: { websiteDescription: 'Deri hissiyatı veren üst kısım, püsküllü.', highlights: ['Kaba taban', 'Püsküllü'] },
      discoveryPack: { articleTitle: 'Klasik Loafer Kombinleri', articleBody: 'Uzun makale...', faq: [{ q: 'Beden?', a: 'Standart' }], keywordEntities: ['loafer', 'klasik ayakkabı'] },
    },
  }
  const r = scanProductBrandSafety(p)
  assert.strictEqual(r.safe, true, `expected safe; got ${JSON.stringify(r)}`)
  assert.strictEqual(r.blockedBrands.length, 0)
  assert.strictEqual(r.severity, 'low')
})

// 2. #362-like product (brand + logo + özgünlük + 9060) → blocked, critical.
check('#362-like (New Balance + logo + özgünlük + 9060) is BLOCKED + critical', () => {
  const p = {
    title: 'New Balance Sneaker Çok Renkli',
    content: {
      commercePack: {
        websiteDescription: "Canlı renk blokları ve belirgin yan 'N' logosu... 'New Balance' yazısı, özgünlüğünü vurgular.",
        highlights: ["Canlı Renk Blokları ve Belirgin 'N' Logo"],
        xPost: 'Yeni New Balance Çok Renkli Sneaker! #NewBalance',
      },
      discoveryPack: { keywordEntities: ['New Balance 9060 modeli', 'unisex New Balance ayakkabı'] },
    },
  }
  const r = scanProductBrandSafety(p)
  assert.strictEqual(r.safe, false, `expected BLOCKED; got ${JSON.stringify(r)}`)
  assert.ok(r.blockedBrands.includes('New Balance'), 'should detect New Balance')
  assert.strictEqual(r.severity, 'critical', `brand+authenticity/logo/model should be critical; got ${r.severity}`)
})

// 3. Brand only (no claims) → blocked, high.
check('brand only (no claim terms) is BLOCKED + high', () => {
  const r = scanBrandSafety([{ field: 'title', text: 'Adidas Spor Ayakkabı' }])
  assert.strictEqual(r.safe, false)
  assert.ok(r.blockedBrands.includes('Adidas'))
  assert.strictEqual(r.severity, 'high', `brand-only should be high; got ${r.severity}`)
})

// 4. "model" alone (no brand) → NOT blocked (must not false-positive).
check('"model" alone does NOT block', () => {
  const r = scanBrandSafety([{ field: 'description', text: 'Bu model standart kalıptadır, kendi numaranızı seçin.' }])
  assert.strictEqual(r.safe, true, `"model" alone must not block; got ${JSON.stringify(r)}`)
  assert.strictEqual(r.blockedBrands.length, 0)
  assert.ok(r.riskyClaims.map((c) => c.toLowerCase()).includes('model'))
  assert.strictEqual(r.severity, 'medium')
})

// 5. Clean active set [353,354,355,359]-like generic titles → none blocked.
check('active set [353,354,355,359]-like generic titles pass', () => {
  for (const title of ['Erkek siyah loafer', 'Siyah Tokalı Püsküllü Loafer', 'Siyah Rugan Püsküllü Loafer', 'Premium Kahve Püsküllü Loafer']) {
    const r = scanBrandSafety([{ field: 'title', text: title }])
    assert.strictEqual(r.safe, true, `"${title}" should be safe; got ${JSON.stringify(r)}`)
    assert.strictEqual(r.blockedBrands.length, 0, `"${title}" should have no brand`)
  }
})

// 6. Counterfeit-admission claim alone (replica / 1:1) → warn (not block), high.
check('"replica"/"1:1" alone warns (high) but does NOT block', () => {
  const r = scanBrandSafety([{ field: 'description', text: 'Bu ürün 1:1 replica kalitesindedir.' }])
  assert.strictEqual(r.safe, true, 'claim-only must not hard-block')
  assert.strictEqual(r.severity, 'high', `counterfeit claim should be high; got ${r.severity}`)
})

// 7. Turkish-case + lowercase brand normalization works.
check('normalization: lowercase brand + Turkish chars detected', () => {
  const r1 = scanBrandSafety([{ field: 'x', text: 'yeni new balance modeli' }])
  assert.strictEqual(r1.safe, false, 'lowercase "new balance" must be detected')
  const r2 = scanBrandSafety([{ field: 'd', text: 'Ürünün özgünlüğü vurgulanır' }])
  assert.ok(r2.riskyClaims.length > 0, 'Turkish "özgün/özgünlük" should match a claim term')
})

// 8. Multi-word + escalation: Louis Vuitton + "orijinal" → critical.
check('Louis Vuitton + "orijinal" → critical block', () => {
  const r = scanBrandSafety([{ field: 'title', text: 'Louis Vuitton Loafer Bej' }, { field: 'desc', text: 'orijinal tasarım' }])
  assert.strictEqual(r.safe, false)
  assert.ok(r.blockedBrands.includes('Louis Vuitton'))
  assert.strictEqual(r.severity, 'critical')
})

// 9. Empty / malformed input is safe, never throws.
check('empty/malformed input is safe', () => {
  assert.strictEqual(scanBrandSafety([]).safe, true)
  assert.strictEqual(scanProductBrandSafety(null).safe, true)
  assert.strictEqual(scanProductBrandSafety({}).safe, true)
})

// 10. D-344A: Asics found live on storefront — must hard-block (Asics was missing from BLOCKED_BRANDS).
check('Asics Sneaker Bej is BLOCKED + Asics detected', () => {
  const r = scanBrandSafety([{ field: 'title', text: 'Asics Sneaker Bej' }])
  assert.strictEqual(r.safe, false, `"Asics Sneaker Bej" must block; got ${JSON.stringify(r)}`)
  assert.ok(r.blockedBrands.includes('Asics'), 'should detect Asics')
})

// 11. D-344A: each newly-added third-party brand blocks (Asics, Reebok, Skechers, Loro Piana).
check('newly-added brands each block', () => {
  for (const brand of ['Asics', 'Reebok', 'Skechers', 'Loro Piana']) {
    const r = scanBrandSafety([{ field: 'title', text: `${brand} Spor Ayakkabı` }])
    assert.strictEqual(r.safe, false, `"${brand}" should hard-block; got ${JSON.stringify(r)}`)
    assert.ok(r.blockedBrands.includes(brand), `should detect ${brand}`)
  }
})

console.log(`\nbrandSafety: ${passed} checks passed${process.exitCode ? ' — WITH FAILURES' : ' — ALL OK'}`)
