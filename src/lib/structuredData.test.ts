import assert from 'node:assert'
import { serializeJsonLd } from './structuredData'

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

check('preserves data while preventing an inline script close-out', () => {
  const input = { headline: '</script><img src=x>', text: 'A & B' }
  const serialized = serializeJsonLd(input)

  assert.ok(!serialized.includes('</script>'))
  assert.ok(!serialized.includes('<img'))
  assert.ok(!serialized.includes('A & B'))
  assert.deepStrictEqual(JSON.parse(serialized), input)
})

check('escapes JavaScript line separators without changing parsed data', () => {
  const input = { text: `one\u2028two\u2029three` }
  const serialized = serializeJsonLd(input)

  assert.ok(!serialized.includes('\u2028'))
  assert.ok(!serialized.includes('\u2029'))
  assert.deepStrictEqual(JSON.parse(serialized), input)
})

console.log(`\nstructuredData: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
