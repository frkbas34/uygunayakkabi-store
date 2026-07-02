import assert from 'node:assert'
import { buildSitemapEntries, buildStaticEntries, buildProductEntries } from './sitemapEntries'

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

const BASE = 'https://uygunayakkabi.com'
const NOW = new Date('2026-07-02T12:00:00.000Z')

check('static routes are always present: /, /blog, /yardim (in that order)', () => {
  const entries = buildStaticEntries(BASE, NOW)
  assert.deepStrictEqual(
    entries.map((e) => e.url),
    [`${BASE}/`, `${BASE}/blog`, `${BASE}/yardim`],
  )
  assert.strictEqual(entries[0]!.priority, 1)
})

check('active products with a slug appear as /products/<slug> at priority 0.8', () => {
  const entries = buildProductEntries(BASE, NOW, [
    { slug: 'suet-loafer-yuksek-taban-tg-1', updatedAt: '2026-06-30T10:00:00.000Z' },
    { slug: 'erkek-siyah-loafer-tg-2', updatedAt: null },
  ])
  assert.strictEqual(entries.length, 2)
  assert.strictEqual(entries[0]!.url, `${BASE}/products/suet-loafer-yuksek-taban-tg-1`)
  assert.strictEqual(entries[0]!.priority, 0.8)
  assert.strictEqual(entries[0]!.lastModified.toISOString(), '2026-06-30T10:00:00.000Z')
  // missing updatedAt falls back to the provided "now"
  assert.strictEqual(entries[1]!.lastModified.toISOString(), NOW.toISOString())
})

check('slug-less docs are skipped (never emit a broken /products/undefined URL)', () => {
  const entries = buildProductEntries(BASE, NOW, [{ slug: null }, { slug: '' }, {}, { slug: 'ok-1' }])
  assert.deepStrictEqual(
    entries.map((e) => e.url),
    [`${BASE}/products/ok-1`],
  )
})

check('full sitemap = static + products + blog in expected structure', () => {
  const entries = buildSitemapEntries({
    baseUrl: BASE,
    now: NOW,
    products: [{ slug: 'p-1' }, { slug: 'p-2' }],
    posts: [{ slug: 'yazi-1' }],
  })
  assert.strictEqual(entries.length, 3 + 2 + 1)
  assert.ok(entries.some((e) => e.url === `${BASE}/products/p-2`))
  const blogEntry = entries.find((e) => e.url === `${BASE}/blog/yazi-1`)
  assert.ok(blogEntry)
  assert.strictEqual(blogEntry!.priority, 0.5)
})

check('empty/failed data degrades safely to the static routes only (no throw)', () => {
  const entries = buildSitemapEntries({ baseUrl: BASE, now: NOW, products: [], posts: [] })
  assert.strictEqual(entries.length, 3)
  // defensive: null-ish arrays from a failed fetch path also degrade safely
  const entries2 = buildSitemapEntries({
    baseUrl: BASE,
    now: NOW,
    products: null as unknown as [],
    posts: undefined as unknown as [],
  })
  assert.strictEqual(entries2.length, 3)
})

console.log(`\nsitemapEntries: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
