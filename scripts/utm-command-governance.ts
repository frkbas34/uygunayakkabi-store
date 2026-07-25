import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertExcludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `${label} must not include: ${needle}`)
}

function sliceBetween(haystack: string, startNeedle: string, endNeedle: string, label: string): string {
  const start = haystack.indexOf(startNeedle)
  assert.ok(start >= 0, `${label} start marker missing: ${startNeedle}`)
  const end = haystack.indexOf(endNeedle, start)
  assert.ok(end > start, `${label} end marker missing: ${endNeedle}`)
  return haystack.slice(start, end)
}

const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
const scripts = packageJson.scripts ?? {}
const route = read('src/app/api/telegram/route.ts')
const utmBuilder = read('src/lib/utmBuilder.ts')
const utmBlock = sliceBetween(
  route,
  "if (firstWordUtm === '/utm') {",
  "if (firstWordCamp === '/campaigns') {",
  '/utm command block',
)

assertIncludes(scripts['test:utm-builder'] ?? '', 'tsx src/lib/utmBuilder.test.ts', 'package test:utm-builder script')
assertIncludes(scripts['test:utm-command'] ?? '', 'tsx scripts/utm-command-governance.ts', 'package test:utm-command script')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:utm-builder', 'safe test suite')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:utm-command', 'safe test suite')
assertIncludes(utmBuilder, 'export function evaluateProductUtmEligibility', 'UTM eligibility helper')
assertIncludes(utmBlock, 'evaluateProductUtmEligibility', '/utm command block')
assertIncludes(utmBlock, 'if (!utmEligibility.ok)', '/utm command block')
assertIncludes(utmBlock, 'depth: 1', '/utm command block')
assert.ok(
  utmBlock.indexOf('evaluateProductUtmEligibility') < utmBlock.indexOf('buildProductUtmUrl'),
  '/utm command must check product eligibility before building the URL',
)
assertExcludes(utmBlock, 'payload.update({', '/utm command block')
assertExcludes(utmBlock, 'payload.jobs.queue', '/utm command block')

console.log('utmCommandGovernance: direct UTM links require active storefront eligibility - ALL OK')
