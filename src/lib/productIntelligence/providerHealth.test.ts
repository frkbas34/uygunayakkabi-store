/**
 * providerHealth.test.ts - secret-safe Product Intelligence / GEO provider
 * visibility checks. No external APIs are called and no secret values are
 * printed.
 */
import assert from 'node:assert'
import {
  evaluateProductIntelligenceProviderHealth,
  formatProductIntelligenceProviderHealthLine,
  type PiProviderHealth,
  type PiProviderHealthName,
} from './providerHealth'

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

function byName(rows: PiProviderHealth[], name: PiProviderHealthName): PiProviderHealth {
  const row = rows.find((entry) => entry.name === name)
  assert.ok(row, `missing health row for ${name}`)
  return row
}

check('empty env reports missing Gemini and reverse search providers', () => {
  const rows = evaluateProductIntelligenceProviderHealth({})

  assert.strictEqual(byName(rows, 'gemini_text').state, 'missing')
  assert.strictEqual(byName(rows, 'gemini_image').state, 'missing')
  assert.strictEqual(byName(rows, 'reverse_search').state, 'missing')
  assert.ok(byName(rows, 'reverse_search').missing.includes('GOOGLE_VISION_API_KEY'))
  assert.ok(byName(rows, 'reverse_search').missing.includes('SERPAPI_API_KEY'))
})

check('Gemini key makes text and image generation ready without reverse search', () => {
  const rows = evaluateProductIntelligenceProviderHealth({
    GEMINI_API_KEY: 'secret-gemini',
  })

  assert.strictEqual(byName(rows, 'gemini_text').state, 'ready')
  assert.strictEqual(byName(rows, 'gemini_image').state, 'ready')
  assert.strictEqual(byName(rows, 'reverse_search').state, 'missing')
})

check('auto reverse search selects Google Vision before paid fallbacks', () => {
  const rows = evaluateProductIntelligenceProviderHealth({
    GOOGLE_VISION_API_KEY: 'secret-vision',
    DATAFORSEO_LOGIN: 'secret-login',
    DATAFORSEO_PASSWORD: 'secret-password',
    SERPAPI_API_KEY: 'secret-serp',
  })
  const reverse = byName(rows, 'reverse_search')

  assert.strictEqual(reverse.state, 'ready')
  assert.strictEqual(reverse.mode, 'auto')
  assert.ok(reverse.notes.some((note) => note.includes('Google Vision')), reverse.notes.join('\n'))
})

check('DataForSEO partial credentials are visible but not selected', () => {
  const rows = evaluateProductIntelligenceProviderHealth({
    DATAFORSEO_LOGIN: 'secret-login',
  })
  const dataForSeo = byName(rows, 'dataforseo')
  const reverse = byName(rows, 'reverse_search')

  assert.strictEqual(dataForSeo.state, 'partial')
  assert.ok(dataForSeo.missing.includes('DATAFORSEO_PASSWORD'))
  assert.strictEqual(reverse.state, 'partial')
  assert.strictEqual(reverse.mode, 'none')
})

check('explicit reverse provider preference does not silently fall back', () => {
  const rows = evaluateProductIntelligenceProviderHealth({
    REVERSE_SEARCH_PROVIDER: 'dataforseo',
    GOOGLE_VISION_API_KEY: 'secret-vision',
  })
  const reverse = byName(rows, 'reverse_search')

  assert.strictEqual(reverse.state, 'missing')
  assert.strictEqual(reverse.mode, 'none')
  assert.ok(reverse.missing.includes('DATAFORSEO_LOGIN'))
  assert.ok(reverse.missing.includes('DATAFORSEO_PASSWORD'))
})

check('unrecognized reverse provider preference follows runtime auto behavior', () => {
  const rows = evaluateProductIntelligenceProviderHealth({
    REVERSE_SEARCH_PROVIDER: 'mystery-provider',
    SERPAPI_API_KEY: 'secret-serp',
  })
  const reverse = byName(rows, 'reverse_search')

  assert.strictEqual(reverse.state, 'ready')
  assert.strictEqual(reverse.mode, 'auto')
  assert.ok(reverse.notes.some((note) => note.includes('Unrecognized REVERSE_SEARCH_PROVIDER')), reverse.notes.join('\n'))
  assert.ok(reverse.notes.some((note) => note.includes('SerpAPI')), reverse.notes.join('\n'))
})

check('formatted health lines expose key names but not secret values', () => {
  const line = formatProductIntelligenceProviderHealthLine(byName(evaluateProductIntelligenceProviderHealth({
    DATAFORSEO_LOGIN: 'secret-login',
  }), 'dataforseo'))

  assert.ok(line.includes('DATAFORSEO_PASSWORD'))
  assert.ok(!line.includes('secret-login'))
})

console.log(`\nproductIntelligenceProviderHealth: ${passed} checks passed${process.exitCode ? ' - WITH FAILURES' : ' - ALL OK'}`)
