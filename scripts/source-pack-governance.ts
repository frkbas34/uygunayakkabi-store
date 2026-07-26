import assert from 'node:assert'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_PACK_DIR = 'chatgpt-project-sources'
const EXPECTED_FILES = [
  '00_INDEX_AND_UPLOAD_GUIDE.md',
  '01_CURRENT_TRUTH.md',
  '02_MASTER_ROADMAP.md',
  '03_SYSTEM_ARCHITECTURE.md',
  '04_BOTS_AND_AUTOMATIONS.md',
  '05_ACTIVE_CHANNELS_AND_PUBLISHING.md',
  '06_PRODUCT_INTAKE_AND_OPERATOR_FLOW.md',
  '07_MENTIX_OPENCLAW_SKILLS.md',
  '08_N8N_ROLE_AND_DECISION.md',
  '09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md',
  '10_STOREFRONT_AND_CONVERSION.md',
  '11_ORDERS_LEADS_STOCK_ANALYTICS.md',
  '12_ADS_AND_GROWTH.md',
  '13_VALIDATION_DEPLOYMENT_OPS.md',
  '14_KNOWLEDGE_MANAGEMENT_WORKFLOW.md',
  '15_UPDATE_PROTOCOL_FOR_AI_AGENTS.md',
  '16_CURRENT_DECISIONS_AND_RETIREMENTS.md',
  '17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md',
  '18_D352_PRODUCT_LOADING_FACTORY_AUDIT.md',
  '19_MASTER_PLAN_COMPLETION_AUDIT.md',
] as const

function read(name: string): string {
  return readFileSync(join(SOURCE_PACK_DIR, name), 'utf8')
}

function includes(name: string, phrase: string): void {
  assert.ok(read(name).includes(phrase), `${name} must include: ${phrase}`)
}

const actualFiles = readdirSync(SOURCE_PACK_DIR)
  .filter((name) => name.endsWith('.md'))
  .sort()

assert.deepStrictEqual(actualFiles, [...EXPECTED_FILES].sort(), 'source pack must contain the canonical 20 Markdown files only')

let totalBytes = 0
for (const name of EXPECTED_FILES) {
  const bytes = statSync(join(SOURCE_PACK_DIR, name)).size
  const body = read(name)
  totalBytes += bytes
  assert.ok(body.startsWith('# '), `${name} must start with one H1`)
  assert.ok(bytes <= 20_000, `${name} is too large for current-truth use: ${bytes} bytes`)
  assert.ok(!body.includes('\uFFFD'), `${name} contains a replacement-character encoding artifact`)
}
assert.ok(totalBytes <= 100_000, `source pack exceeds the 100 KB current-truth budget: ${totalBytes} bytes`)

includes('00_INDEX_AND_UPLOAD_GUIDE.md', 'do not exceed 20 documents')
includes('01_CURRENT_TRUTH.md', 'Active channels:')
includes('01_CURRENT_TRUTH.md', 'protected-brand')
includes('02_MASTER_ROADMAP.md', 'Telegram message and callback authorization paths')
includes('02_MASTER_ROADMAP.md', 'Remove rejected protected-brand generation restrictions')
includes('03_SYSTEM_ARCHITECTURE.md', 'Payload')
includes('03_SYSTEM_ARCHITECTURE.md', 'every 30 minutes')
includes('04_BOTS_AND_AUTOMATIONS.md', 'SupplierScout')
includes('04_BOTS_AND_AUTOMATIONS.md', 'Status: optional glue.')
includes('05_ACTIVE_CHANNELS_AND_PUBLISHING.md', 'Dolap and Threads are not active targets')
includes('06_PRODUCT_INTAKE_AND_OPERATOR_FLOW.md', 'Image QC')
includes('07_MENTIX_OPENCLAW_SKILLS.md', 'Hermes')
includes('07_MENTIX_OPENCLAW_SKILLS.md', 'OpenClaw')
includes('08_N8N_ROLE_AND_DECISION.md', 'optional glue')
includes('09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md', 'imageGenTask')
includes('09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md', 'IMAGE_GENERATION_BLUEPRINT_V1.md')
includes('09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md', 'local env readiness is not production provider readiness')
includes('10_STOREFRONT_AND_CONVERSION.md', 'test:storefront-trust')
includes('11_ORDERS_LEADS_STOCK_ANALYTICS.md', 'Payload owns lead, order, product, stock')
includes('12_ADS_AND_GROWTH.md', 'must not create campaigns')
includes('13_VALIDATION_DEPLOYMENT_OPS.md', 'runtime-smoke governance assertions')
includes('13_VALIDATION_DEPLOYMENT_OPS.md', '--confirm-read-only')
includes('14_KNOWLEDGE_MANAGEMENT_WORKFLOW.md', 'Truth hierarchy')
includes('15_UPDATE_PROTOCOL_FOR_AI_AGENTS.md', 'Never execute an action based on confidence')
includes('16_CURRENT_DECISIONS_AND_RETIREMENTS.md', 'SupplierScout is dormant')
includes('17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md', 'P0 — Telegram and image correctness')
includes('18_D352_PRODUCT_LOADING_FACTORY_AUDIT.md', 'Protected-brand classification is deliberately not')
includes('19_MASTER_PLAN_COMPLETION_AUDIT.md', 'Repository health: 74/100')

const decisions = read('16_CURRENT_DECISIONS_AND_RETIREMENTS.md')
for (const phrase of [
  'Dolap and Threads are not part of the project anymore.',
  'SupplierScout is sleeping.',
  'n8n is optional glue.',
  'Hermes is the current agent-control layer for UygunAyakkabi/Mentix operations.',
  'OpenClaw is historical/optional unless the operator explicitly reactivates it.',
]) {
  assert.ok(decisions.includes(phrase), `current decisions must include: ${phrase}`)
}

console.log(`sourcePackGovernance: 20 current-truth documents, ${totalBytes} bytes - ALL OK`)
