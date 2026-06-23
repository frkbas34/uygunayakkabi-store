import assert from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_PACK_DIR = 'chatgpt-project-sources'
const MAX_SOURCE_DOCS = 20

const REQUIRED_SOURCE_FILES = [
  '00_INDEX_AND_UPLOAD_GUIDE.md',
  '01_CURRENT_TRUTH.md',
  '02_MASTER_ROADMAP.md',
  '04_BOTS_AND_AUTOMATIONS.md',
  '13_VALIDATION_DEPLOYMENT_OPS.md',
  '15_UPDATE_PROTOCOL_FOR_AI_AGENTS.md',
  '16_CURRENT_DECISIONS_AND_RETIREMENTS.md',
  '17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md',
]

const ACTIVE_CONTROL_ARTIFACTS = [
  'mentix-memory/policies/PUBLISH_POLICY.md',
  'mentix-skill-stack-dashboard.html',
  'project-control/architecture-onion.html',
  'project-control/mimari-sogankatmani-tr.html',
]

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(
    haystack.includes(needle),
    `${label} must include: ${needle}`,
  )
}

function assertNoRetiredChannelMention(path: string) {
  const text = read(path)
  assert.ok(!/\b(dolap|threads)\b/i.test(text), `${path} must not present retired channels in active control artifacts`)
}

const mdFiles = readdirSync(SOURCE_PACK_DIR).filter((name) => name.endsWith('.md')).sort()

assert.ok(mdFiles.length > 0, 'source pack must contain Markdown files')
assert.ok(
  mdFiles.length <= MAX_SOURCE_DOCS,
  `source pack must stay under ${MAX_SOURCE_DOCS + 1} docs; found ${mdFiles.length}`,
)

for (const file of REQUIRED_SOURCE_FILES) {
  assert.ok(existsSync(join(SOURCE_PACK_DIR, file)), `required source-pack file is missing: ${file}`)
}

const index = read(join(SOURCE_PACK_DIR, '00_INDEX_AND_UPLOAD_GUIDE.md'))
assertIncludes(index, `Current document count: ${mdFiles.length}`, 'upload guide')
assertIncludes(index, 'do not exceed 20 documents', 'upload/update protocol')

const currentTruth = read(join(SOURCE_PACK_DIR, '01_CURRENT_TRUTH.md'))
for (const channel of ['Website', 'Instagram', 'Facebook', 'X', 'Shopier']) {
  assertIncludes(currentTruth, `- ${channel}`, 'current truth active channel list')
}
assertIncludes(currentTruth, 'Dolap: removed from active channel model.', 'current truth retirement')
assertIncludes(currentTruth, 'Threads: removed from active channel model.', 'current truth retirement')
assertIncludes(currentTruth, 'SupplierScout: dormant.', 'current truth dormant system')

const decisions = read(join(SOURCE_PACK_DIR, '16_CURRENT_DECISIONS_AND_RETIREMENTS.md'))
assertIncludes(decisions, 'Dolap and Threads are not part of the project anymore.', 'retirement decisions')
assertIncludes(decisions, 'SupplierScout is sleeping.', 'retirement decisions')
assertIncludes(decisions, 'n8n is optional glue.', 'retirement decisions')
assertIncludes(decisions, 'OpenClaw remains useful as the Mentix agent/skill layer.', 'retirement decisions')

const productChannels = read('src/lib/productChannels.ts')
assertIncludes(
  productChannels,
  "export const ACTIVE_PRODUCT_CHANNELS = ['website', 'instagram', 'shopier', 'x', 'facebook'] as const",
  'product channel source of truth',
)
assert.ok(!productChannels.includes("'dolap'"), 'product channel source of truth must not include dolap')
assert.ok(!productChannels.includes("'threads'"), 'product channel source of truth must not include threads')

for (const artifact of ACTIVE_CONTROL_ARTIFACTS) {
  assert.ok(existsSync(artifact), `active control artifact is missing: ${artifact}`)
  assertNoRetiredChannelMention(artifact)
}

console.log(`sourcePackGovernance: ${mdFiles.length} docs checked - ALL OK`)
