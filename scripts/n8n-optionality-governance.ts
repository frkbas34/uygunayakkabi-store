import assert from 'node:assert'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ALLOWED_WORKFLOW_JSON = new Set([
  'n8n-workflows/channel-instagram-real.json',
  'n8n-workflows/stubs/channel-facebook.json',
  'n8n-workflows/stubs/channel-instagram.json',
  'n8n-workflows/stubs/channel-shopier.json',
  'n8n-workflows/stubs/channel-x.json',
])

const ACTIVE_WEBHOOK_ENV_VARS = [
  'N8N_CHANNEL_INSTAGRAM_WEBHOOK',
  'N8N_CHANNEL_SHOPIER_WEBHOOK',
  'N8N_CHANNEL_FACEBOOK_WEBHOOK',
  'N8N_CHANNEL_X_WEBHOOK',
]

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertNotMatches(haystack: string, pattern: RegExp, label: string) {
  assert.ok(!pattern.test(haystack), `${label} must not match: ${pattern}`)
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return []

  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...walkFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function assertWorkflowInventory(): void {
  const workflowFiles = walkFiles('n8n-workflows')
    .filter((filePath) => path.extname(filePath).toLowerCase() === '.json')
    .map(toPosix)
    .sort()

  assert.ok(workflowFiles.length > 0, 'n8n workflow inventory should be explicit')

  for (const filePath of workflowFiles) {
    assert.ok(
      ALLOWED_WORKFLOW_JSON.has(filePath),
      `n8n workflow JSON must be explicitly allowed and active-channel-only: ${filePath}`,
    )
    assertNotMatches(filePath, /\b(dolap|threads|supplier)\b/i, 'n8n workflow file path')
  }
}

function assertOptionalityDocs(): void {
  assertIncludes(read('AGENTS.md'), 'n8n is optional glue only.', 'AGENTS n8n boundary')
  assertIncludes(read('CLAUDE.md'), 'n8n is optional glue.', 'CLAUDE n8n boundary')
  assertIncludes(
    read('chatgpt-project-sources/08_N8N_ROLE_AND_DECISION.md'),
    'n8n is optional glue, not the main project brain.',
    'source-pack n8n role',
  )
  assertIncludes(
    read('chatgpt-project-sources/08_N8N_ROLE_AND_DECISION.md'),
    'Do not invest in new n8n channel workflows until product intake and publishing reliability are stable.',
    'source-pack n8n freeze',
  )
  assertIncludes(
    read('chatgpt-project-sources/04_BOTS_AND_AUTOMATIONS.md'),
    'Status: optional glue.',
    'bot source-pack n8n status',
  )
}

function assertDispatchFallbackIsOptional(): void {
  const dispatch = read('src/lib/channelDispatch.ts')
  assertIncludes(dispatch, 'Env vars (all optional', 'channel dispatch optional env vars')
  assertIncludes(dispatch, 'Returns result with dispatched=false, webhookConfigured=false', 'channel dispatch scaffold fallback')
  assertIncludes(dispatch, 'Does NOT throw', 'channel dispatch scaffold no-throw fallback')

  const contract = read('n8n-workflows/CHANNEL_DISPATCH_CONTRACT.md')
  assertIncludes(
    contract,
    'If an env var is absent or empty, the dispatch for that channel is skipped',
    'n8n contract optional env handling',
  )
  assertIncludes(contract, 'No error is thrown.', 'n8n contract no-throw fallback')
  assertIncludes(contract, 'optional fallback stubs', 'n8n contract optional stubs')

  for (const envVar of ACTIVE_WEBHOOK_ENV_VARS) {
    assertIncludes(dispatch, envVar, 'channel dispatch active webhook env vars')
    assertIncludes(contract, envVar, 'n8n contract active webhook env vars')
  }
}

function assertAutomationIntakeIsDraftFirst(): void {
  const route = read('src/app/api/automation/products/route.ts')
  assertIncludes(route, 'automation intake is draft-first; activation is an operator action.', 'automation intake draft-first rule')
  assertIncludes(route, 'resolveProductStatus', 'automation intake status decision layer')
  assertIncludes(route, "workflow: 'n8n-automation'", 'automation intake legacy workflow label')
}

function assertNoScriptsActivateN8n(): void {
  const packageJson = JSON.parse(read('package.json')) as Record<string, unknown>
  const scripts = typeof packageJson.scripts === 'object' && packageJson.scripts !== null
    ? packageJson.scripts as Record<string, unknown>
    : {}

  for (const [name, command] of Object.entries(scripts)) {
    if (name === 'test:n8n-optional' || name === 'test:safe' || name === 'validate') continue
    assert.ok(
      typeof command !== 'string' || !/\b(n8n|N8N_CHANNEL_|channel-instagram-real|channel-facebook|channel-shopier|channel-x)\b/i.test(command),
      `package script must not activate n8n workflows while n8n is optional: ${name}`,
    )
  }
}

assertWorkflowInventory()
assertOptionalityDocs()
assertDispatchFallbackIsOptional()
assertAutomationIntakeIsDraftFirst()
assertNoScriptsActivateN8n()

console.log('n8nOptionalityGovernance: optional glue, workflow inventory, fallback, and scripts checked - ALL OK')
