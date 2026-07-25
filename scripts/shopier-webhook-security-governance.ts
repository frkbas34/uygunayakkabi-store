import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertExcludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `${label} must not include: ${needle}`)
}

const route = read('src/app/api/webhooks/shopier/route.ts')
const helper = read('src/lib/shopierWebhookSecurity.ts')
const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }
const scripts = packageJson.scripts ?? {}

for (const needle of [
  "import { verifyShopierWebhookSignature } from '@/lib/shopierWebhookSecurity'",
  'const rawBody = await req.text()',
  'verifyShopierWebhookSignature({',
  'rawBody,',
  'signature: shopierSignature,',
  'tokenEnv: process.env.SHOPIER_WEBHOOK_TOKEN,',
  "verification.reason === 'missing_configuration' ? 503 : 401",
]) {
  assertIncludes(route, needle, 'Shopier webhook route')
}

assertExcludes(route, 'SHOPIER_WEBHOOK_TOKEN not set', 'Shopier webhook route')
assertExcludes(route, 'JSON.stringify(body)).digest', 'Shopier webhook route')

for (const needle of [
  "reason: 'missing_configuration'",
  'crypto.timingSafeEqual',
  "update(args.rawBody).digest('hex')",
  'configuredTokens',
]) {
  assertIncludes(helper, needle, 'Shopier webhook security helper')
}

assertIncludes(scripts['test:shopier-webhook-security'] ?? '', 'tsx src/lib/shopierWebhookSecurity.test.ts', 'security test script')
assertIncludes(scripts['test:shopier-webhook-security'] ?? '', 'tsx scripts/shopier-webhook-security-governance.ts', 'security governance script')
assertIncludes(scripts['test:shopier-webhook-local'] ?? '', 'npm run test:shopier-webhook-security', 'webhook local preflight')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:shopier-webhook-security', 'safe validation suite')

console.log('shopierWebhookSecurityGovernance: raw-body HMAC and fail-closed webhook boundary - ALL OK')
