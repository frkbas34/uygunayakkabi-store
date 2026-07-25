import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(text: string, needle: string, label: string): void {
  assert.ok(text.includes(needle), `${label} must include: ${needle}`)
}

const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
const scripts = packageJson.scripts ?? {}
assert.strictEqual(scripts['test:brand-provenance-review'], 'tsx src/lib/brandProvenanceReview.test.ts')
assert.ok(scripts['test:safe']?.includes('npm run test:brand-provenance-review'), 'test:safe must cover provenance review')

const route = read('src/app/api/telegram/route.ts')
const start = route.indexOf('// D-477/D-478: explicit operator provenance record.')
const end = route.indexOf('// D-466/D-477/D-478: protected-brand remediation queue.', start)
assert.ok(start >= 0 && end > start, 'brandreview command boundary must be present')
const commandBlock = route.slice(start, end)

for (const required of [
  "firstWordBrandReview === '/brandreview'",
  'parseBrandProvenanceReviewCommand',
  'findProductForBrandProvenanceReview',
  'formatBrandProvenanceReviewPreview',
  'if (!parsed.confirmed)',
  'recordBrandProvenanceReview',
  'formatRecordedBrandProvenanceReview',
  'idempotencyKey',
  'alreadyRecorded',
]) {
  assertIncludes(commandBlock, required, 'brandreview command')
}
assert.ok(
  commandBlock.indexOf('if (!parsed.confirmed)') < commandBlock.indexOf('const recordResult = await recordBrandProvenanceReview'),
  'brandreview must preview before recording an audit event',
)
assert.ok(!commandBlock.includes('payload.update('), 'brandreview must not update products')
assert.ok(!commandBlock.includes('queueShopierSync('), 'brandreview must not queue Shopier work')

const planStart = route.indexOf('// D-466/D-477/D-478: protected-brand remediation queue.')
const planEnd = route.indexOf("if (text.startsWith('/catalogqa'))", planStart)
assert.ok(planStart >= 0 && planEnd > planStart, 'brandplan evidence boundary must be present')
const planBlock = route.slice(planStart, planEnd)
assertIncludes(planBlock, "collection: 'bot-events'", 'brandplan provenance evidence read')
assertIncludes(planBlock, "eventType: { equals: 'brand_safety.provenance_reviewed' }", 'brandplan provenance event filter')
assertIncludes(planBlock, 'provenanceEvents: provenanceEvents.docs as any[]', 'brandplan provenance event handoff')
assert.ok(!planBlock.includes('payload.update('), 'brandplan must remain read-only')

const productFlowStart = route.indexOf('// Phase 2/3: /productflow <sn-or-id>')
const productFlowEnd = route.indexOf("if (text.startsWith('/adready'))", productFlowStart)
assert.ok(productFlowStart >= 0 && productFlowEnd > productFlowStart, 'product-flow provenance boundary must be present')
const productFlowBlock = route.slice(productFlowStart, productFlowEnd)
assertIncludes(productFlowBlock, "collection: 'bot-events'", 'product-flow provenance evidence read')
assertIncludes(productFlowBlock, "eventType: { equals: 'brand_safety.provenance_reviewed' }", 'product-flow provenance event filter')
assertIncludes(productFlowBlock, 'provenanceEvents: provenanceEvents.docs as any[]', 'product-flow provenance event handoff')
assert.ok(!productFlowBlock.includes('payload.update('), 'product-flow provenance read must remain read-only')

const imagePlanStart = route.indexOf('// D-404: Image regeneration plan.')
const imagePlanEnd = route.indexOf('// D-355: Product Image QC gate.', imagePlanStart)
assert.ok(imagePlanStart >= 0 && imagePlanEnd > imagePlanStart, 'image-plan provenance boundary must be present')
const imagePlanBlock = route.slice(imagePlanStart, imagePlanEnd)
assertIncludes(imagePlanBlock, "collection: 'bot-events'", 'image-plan provenance evidence read')
assertIncludes(imagePlanBlock, "eventType: { equals: 'brand_safety.provenance_reviewed' }", 'image-plan provenance event filter')
assertIncludes(imagePlanBlock, 'provenanceEvents: provenanceEvents.docs as any[]', 'image-plan provenance event handoff')
assert.ok(!imagePlanBlock.includes('payload.update('), 'image-plan provenance read must remain read-only')

console.log('brandProvenanceCommandGovernance: preview-first BotEvents evidence without product mutation - ALL OK')
