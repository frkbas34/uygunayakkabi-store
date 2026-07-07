import assert from 'node:assert'
import { evaluateImageBrandGate } from './imageBrandGate'

let passed = 0
function check(name: string, fn: () => void): void {
  try {
    fn()
    passed += 1
    console.log(`  ok - ${name}`)
  } catch (e) {
    console.error(`  fail - ${name}\n    ${(e as Error).message}`)
    process.exitCode = 1
  }
}

check('a protected-brand product (BOSS in title) is blocked', () => {
  const g = evaluateImageBrandGate({ title: 'BOSS Süet Loafer', description: 'bordo süet' })
  assert.strictEqual(g.blocked, true)
  assert.ok(g.brands.includes('BOSS'), `brands=${g.brands.join(',')}`)
  assert.ok(g.reason.startsWith('brand_safety_block:'))
  assert.ok(g.operatorMessage.includes('marka güvenliği'))
  assert.ok(g.operatorMessage.includes('BOSS'))
})

check('brand in the description alone still blocks', () => {
  const g = evaluateImageBrandGate({ title: 'Bordo Loafer', description: 'Nike taban teknolojisi' })
  assert.strictEqual(g.blocked, true)
  assert.ok(g.brands.includes('Nike'))
})

check('a clean own-product is NOT blocked', () => {
  const g = evaluateImageBrandGate({ title: 'Bordo Süet Loafer', description: 'El yapımı, hakiki süet' })
  assert.strictEqual(g.blocked, false)
  assert.deepStrictEqual(g.brands, [])
  assert.strictEqual(g.reason, '')
  assert.strictEqual(g.operatorMessage, '')
})

check('multi-word brand (Hugo Boss / Louis Vuitton) is caught', () => {
  assert.strictEqual(evaluateImageBrandGate({ title: 'Hugo Boss ayakkabı' }).blocked, true)
  assert.strictEqual(evaluateImageBrandGate({ title: 'Louis Vuitton loafer' }).brands.includes('Louis Vuitton'), true)
})

check('a risky claim WITHOUT a brand does not block (matches brandSafety policy)', () => {
  // "orijinal" alone is a warning in scanBrandSafety, not a hard block.
  const g = evaluateImageBrandGate({ title: 'Orijinal el yapımı loafer', description: 'gerçek süet' })
  assert.strictEqual(g.blocked, false)
})

check('bad / empty input fails open (not blocked, never throws)', () => {
  assert.strictEqual(evaluateImageBrandGate(null).blocked, false)
  assert.strictEqual(evaluateImageBrandGate(undefined).blocked, false)
  assert.strictEqual(evaluateImageBrandGate(42).blocked, false)
  assert.strictEqual(evaluateImageBrandGate({}).blocked, false)
})

console.log(`\nimageBrandGate: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
