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

const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}
const scripts = packageJson.scripts ?? {}
const route = read('src/app/api/telegram/route.ts')
const channelDispatch = read('src/lib/channelDispatch.ts')
const shopierSync = read('src/lib/shopierSync.ts')
const validationOps = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
const nextSprint = read('chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md')
const agents = read('AGENTS.md')
const claude = read('CLAUDE.md')

const publishBlock = sliceBetween(
  route,
  "if (subCommand === 'publish' && arg) {",
  '// /shopier republish <sn-or-id>',
  '/shopier publish block',
)
const republishBlock = sliceBetween(
  route,
  "if (subCommand === 'republish' && arg) {",
  '// /shopier status <productId>',
  '/shopier republish block',
)
const publishReadyBlock = sliceBetween(
  route,
  "if (subCommand === 'publish-ready') {",
  '// /shopier retry-errors [confirm]',
  '/shopier publish-ready block',
)
const retryErrorsBlock = sliceBetween(
  route,
  "if (subCommand === 'retry-errors') {",
  '// /shopier errors',
  '/shopier retry-errors block',
)

assertIncludes(
  scripts['test:shopier-commands'] ?? '',
  'tsx scripts/shopier-command-governance.ts',
  'package test:shopier-commands script',
)
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:shopier-commands', 'safe test suite')

for (const [label, block] of [
  ['/shopier publish block', publishBlock],
  ['/shopier republish block', republishBlock],
] as const) {
  assertIncludes(block, 'resolveProductIdentifier', label)
  assertIncludes(block, 'formatIdentifierMissingMessage', label)
  assertIncludes(block, 'payload.findByID', label)
  assertIncludes(block, 'queueShopierSync(payload as any', label)
  assertIncludes(block, 'notifyTelegramChatId: chatId', label)
  assertExcludes(block, "task: 'shopier-sync'", label)
  assertExcludes(block, "shopierSyncStatus: 'queued'", label)
  assertExcludes(block, 'payload.update({', label)
}

for (const [label, block] of [
  ['/shopier publish-ready block', publishReadyBlock],
  ['/shopier retry-errors block', retryErrorsBlock],
] as const) {
  assertIncludes(block, 'queueShopierSync', label)
  assertIncludes(block, 'confirm', label)
  assertIncludes(block, 'confirmed && !process.env.SHOPIER_PAT', label)
  assertExcludes(block, 'if (!process.env.SHOPIER_PAT)', label)
}

assertExcludes(route, "task: 'shopier-sync'", 'Telegram route')
assertIncludes(channelDispatch, "skippedReason: 'queued-via-jobs-queue'", 'channel dispatch Shopier path')
assertExcludes(channelDispatch, 'publishShopierDirectly', 'channel dispatch')
assertExcludes(shopierSync, 'publishShopierDirectly', 'Shopier sync documentation')
assertIncludes(validationOps, 'test:shopier-commands', 'source-pack validation ops')
assertIncludes(nextSprint, 'D-386', 'source-pack next sprint')
assertIncludes(agents, 'test:shopier-commands', 'AGENTS validation guidance')
assertIncludes(claude, 'test:shopier-commands', 'CLAUDE validation guidance')

console.log('shopierCommandGovernance: Telegram Shopier commands use shared queue gate - ALL OK')
