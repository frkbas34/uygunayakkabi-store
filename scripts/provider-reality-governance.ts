import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const auditPath = 'project-control/PROVIDER_REALITY_AUDIT.md'
assert.ok(existsSync(auditPath), 'provider reality audit runbook is missing')

const audit = read(auditPath)
const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}
const scripts = packageJson.scripts ?? {}

const agents = read('AGENTS.md')
const claude = read('CLAUDE.md')
const aiSourcePack = read('chatgpt-project-sources/09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md')
const opsSourcePack = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
const nextSprint = read('chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md')
const release = read('project-control/LOCAL_RELEASE_CANDIDATE.md')
const review = read('project-control/LOCAL_PR_REVIEW_PACKAGE.md')

for (const phrase of [
  'D-403 Provider reality audit',
  'local-only audit guardrail, not a provider call, not production proof',
  'Local env presence checks are useful diagnostics, but they are not proof',
  'Website, Instagram, Facebook, X, Shopier',
  'Gemini, Google Vision, DataForSEO, SerpAPI',
  'N8N_CHANNEL_*_WEBHOOK',
  'npm run smoke:provider-health:read -- --confirm-read-only',
  'npm run smoke:pi-provider-health:read -- --confirm-read-only',
  'These checks do not verify production env values, account balance, quota, webhook reachability, provider permissions, OAuth validity, Shopier remote access, or actual content/search/image generation.',
  '## X Execution Contract',
  'Local code treats X OAuth as an all-or-nothing direct-provider contract:',
  'Without it, the dispatch result records the missing key names and makes no',
  '## Meta Media Contract',
  'Direct Instagram and Facebook dispatch select any public `https://` image',
  'When no public `https://` image exists, Instagram/Facebook dispatch fails before',
  '## Operator Evidence Record',
  'Before a provider is called, create one dated, secret-safe evidence record',
  'For Instagram/Facebook, also record the selected public HTTPS gallery URL',
  'For X, record whether all four OAuth key names were confirmed',
  'For Shopier, record',
  'webhook HMAC readiness, account permission, quota, and whether the test is',
  'This record is evidence, not authorization.',
  'Do not print, copy, commit, or paste secret values.',
  'Do not call Gemini, Google Vision, DataForSEO, SerpAPI, Meta, X, Shopier, or n8n from this audit without explicit operator approval.',
  'Do not spend credits or start paid provider work.',
  'Do not queue jobs, publish products, dispatch channels, or run live Telegram commands from this audit.',
  'Do not treat local env readiness as production readiness.',
  'Do not activate SupplierScout or revive Dolap/Threads while auditing providers.',
  'Production provider reality remains unproven until the operator records current production evidence.',
]) {
  assertIncludes(audit, phrase, 'provider reality audit runbook')
}

assertIncludes(
  scripts['test:provider-reality'] ?? '',
  'tsx scripts/provider-reality-governance.ts',
  'package test:provider-reality script',
)
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:provider-reality', 'safe test suite')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:provider-health:read'), 'test:safe must not run channel provider runtime smoke')
assert.ok(!(scripts['test:safe'] ?? '').includes('smoke:pi-provider-health:read'), 'test:safe must not run PI provider runtime smoke')

for (const doc of [agents, claude]) {
  assertIncludes(doc, 'D-403 provider reality audit is local-only', 'agent guidance')
  assertIncludes(doc, 'project-control/PROVIDER_REALITY_AUDIT.md', 'agent guidance provider audit pointer')
  assertIncludes(doc, 'test:provider-reality', 'agent guidance validation list')
  assertIncludes(doc, 'local env readiness is not production provider readiness', 'agent guidance provider boundary')
}

assertIncludes(aiSourcePack, 'D-403 provider reality audit', 'source-pack AI provider audit milestone')
assertIncludes(aiSourcePack, 'project-control/PROVIDER_REALITY_AUDIT.md', 'source-pack AI provider audit pointer')
assertIncludes(aiSourcePack, 'local env readiness is not production provider readiness', 'source-pack AI provider audit boundary')
assertIncludes(opsSourcePack, 'test:provider-reality', 'source-pack ops validation')
assertIncludes(opsSourcePack, 'project-control/PROVIDER_REALITY_AUDIT.md', 'source-pack ops provider audit pointer')
assertIncludes(opsSourcePack, 'Latest documented feature boundary: D-500.', 'source-pack ops latest boundary')
assertIncludes(opsSourcePack, 'D-495 remains the active Meta safety rule', 'source-pack ops Meta media preflight boundary')
assertIncludes(opsSourcePack, 'secret-safe Operator Evidence', 'source-pack provider evidence record')
assertIncludes(nextSprint, 'D-403 provider reality audit', 'next sprint provider audit milestone')
assertIncludes(release, 'D-403 provider reality audit', 'local release candidate provider audit checkpoint')
assertIncludes(review, 'D-403 provider reality audit', 'local PR package provider audit checkpoint')

console.log('providerRealityGovernance: provider reality audit boundary and source-pack sync - ALL OK')
