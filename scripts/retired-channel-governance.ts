import assert from 'node:assert'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const RETIRED_CHANNELS = ['dolap', 'threads'] as const
const ACTIVE_CHANNELS = ['website', 'instagram', 'shopier', 'x', 'facebook'] as const

const ACTIVE_CODE_DIRS = ['src']
const ACTIVE_CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertNotRetired(text: string, label: string) {
  for (const channel of RETIRED_CHANNELS) {
    assert.ok(!new RegExp(`\\b${channel}\\b`, 'i').test(text), `${label} must not include retired channel: ${channel}`)
  }
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return []

  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'sessions', 'tmp'].includes(entry)) continue
      files.push(...walkFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

function isActiveCodeFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.endsWith('.test.ts') || normalized.endsWith('.test.tsx')) return false
  return ACTIVE_CODE_EXTENSIONS.has(path.extname(filePath))
}

function assertNoRetiredChannelsInActiveCode(): void {
  for (const dir of ACTIVE_CODE_DIRS) {
    for (const filePath of walkFiles(dir).filter(isActiveCodeFile)) {
      assertNotRetired(read(filePath), filePath)
    }
  }
}

function assertNoRetiredWorkflowStubs(): void {
  const workflowDir = 'n8n-workflows'
  if (!existsSync(workflowDir)) return

  for (const filePath of walkFiles(workflowDir)) {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase()
    assert.ok(
      !normalized.includes('channel-dolap') && !normalized.includes('channel-threads'),
      `n8n workflow stubs must not include retired channel files: ${filePath}`,
    )
  }
}

function assertPackageScriptsDoNotActivateRetiredChannels(): void {
  const packageJson = JSON.parse(read('package.json')) as Record<string, unknown>
  const scripts = typeof packageJson.scripts === 'object' && packageJson.scripts !== null
    ? packageJson.scripts as Record<string, unknown>
    : {}

  for (const [name, command] of Object.entries(scripts)) {
    if (name === 'test:retired-channels') continue
    assert.ok(
      typeof command !== 'string' || !/\b(dolap|threads|channel-dolap|channel-threads|publishDolap|publishThreads)\b/i.test(command),
      `package script must not activate retired channels: ${name}`,
    )
  }
}

function assertSourceOfTruth(): void {
  const productChannels = read('src/lib/productChannels.ts')
  assertIncludes(
    productChannels,
    "export const ACTIVE_PRODUCT_CHANNELS = ['website', 'instagram', 'shopier', 'x', 'facebook'] as const",
    'active product channel source of truth',
  )
  for (const channel of ACTIVE_CHANNELS) {
    assertIncludes(productChannels, `'${channel}'`, 'active product channel source of truth')
  }
  assertNotRetired(productChannels, 'active product channel source of truth')

  const channelDispatch = read('src/lib/channelDispatch.ts')
  for (const channel of ['instagram', 'shopier', 'x', 'facebook']) {
    assertIncludes(channelDispatch, `'${channel}'`, 'external dispatch channel source of truth')
  }
  assertNotRetired(channelDispatch, 'external dispatch channel source of truth')

  const confirmationWizard = read('src/lib/confirmationWizard.ts')
  assertNotRetired(confirmationWizard, 'confirmation wizard active target options')
}

function assertDecisionDocs(): void {
  assertIncludes(read('AGENTS.md'), 'Do not reintroduce Dolap or Threads. They are retired.', 'AGENTS retired-channel rule')
  assertIncludes(read('CLAUDE.md'), 'Do not add Dolap/Threads UI, parser targets, n8n stubs, prompts, or task items.', 'CLAUDE retired-channel rule')
  assertIncludes(
    read('chatgpt-project-sources/16_CURRENT_DECISIONS_AND_RETIREMENTS.md'),
    'Dolap and Threads are not part of the project anymore.',
    'source-pack retirement decision',
  )
}

assertNoRetiredChannelsInActiveCode()
assertNoRetiredWorkflowStubs()
assertPackageScriptsDoNotActivateRetiredChannels()
assertSourceOfTruth()
assertDecisionDocs()

console.log('retiredChannelGovernance: active code, workflows, scripts, and docs checked - ALL OK')
