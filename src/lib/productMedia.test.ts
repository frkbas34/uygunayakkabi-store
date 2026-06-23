import assert from 'node:assert'
import { countUsableMediaRows, hasUsableMediaRow } from './productMedia'

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

check('empty or placeholder rows are not usable media', () => {
  assert.strictEqual(hasUsableMediaRow(undefined), false)
  assert.strictEqual(hasUsableMediaRow([]), false)
  assert.strictEqual(hasUsableMediaRow([{}]), false)
  assert.strictEqual(hasUsableMediaRow([{ image: null }]), false)
})

check('relationship ids and populated image rows are usable media', () => {
  assert.strictEqual(hasUsableMediaRow([1]), true)
  assert.strictEqual(hasUsableMediaRow(['media-id']), true)
  assert.strictEqual(hasUsableMediaRow([{ image: 42 }]), true)
  assert.strictEqual(hasUsableMediaRow([{ image: { id: 42, url: '/media/x.webp' } }]), true)
})

check('usable media count ignores placeholders', () => {
  assert.strictEqual(
    countUsableMediaRows([{}, { image: 1 }, null, { id: 'generated-1' }, { image: null }]),
    2,
  )
})

console.log(`\nproductMedia: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
