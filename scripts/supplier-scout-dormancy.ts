import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(
    haystack.includes(needle),
    `${label} must include: ${needle}`,
  )
}

function assertBefore(text: string, first: string, second: string, label: string) {
  const firstIndex = text.indexOf(first)
  const secondIndex = text.indexOf(second)

  assert.ok(firstIndex !== -1, `${label} missing first marker: ${first}`)
  assert.ok(secondIndex !== -1, `${label} missing second marker: ${second}`)
  assert.ok(firstIndex < secondIndex, `${label} must check ${first} before ${second}`)
}

const routePath = 'src/app/api/supplier-scout/route.ts'
assert.ok(existsSync(routePath), 'SupplierScout route must exist while dormant code remains')

const route = read(routePath)
assertIncludes(
  route,
  "process.env.SUPPLIER_SCOUT_ENABLED === 'true'",
  'SupplierScout env gate',
)
assertIncludes(route, 'dormant: true', 'SupplierScout dormant response')
assertIncludes(route, 'SupplierScout is sleeping.', 'SupplierScout GET dormant message')
assertIncludes(route, 'SupplierScout is disabled; webhook update ignored.', 'SupplierScout POST dormant message')

const postStart = route.indexOf('export async function POST')
assert.ok(postStart !== -1, 'SupplierScout POST handler must exist')
const postBody = route.slice(postStart)
assertBefore(
  postBody,
  'if (!isSupplierScoutEnabled())',
  'await processUpdate(body)',
  'SupplierScout POST dormancy',
)

const getStart = route.indexOf('export async function GET')
assert.ok(getStart !== -1, 'SupplierScout GET handler must exist')
const getBody = route.slice(getStart)
assertBefore(
  getBody,
  'if (!isSupplierScoutEnabled())',
  'return handleDailyReportCron()',
  'SupplierScout daily report dormancy',
)
assertBefore(
  getBody,
  'if (!isSupplierScoutEnabled())',
  'await registerScoutWebhook(webhookUrl)',
  'SupplierScout webhook registration dormancy',
)

if (existsSync('vercel.json')) {
  const vercelText = read('vercel.json')
  const vercel = JSON.parse(vercelText) as Record<string, unknown>
  const crons = Array.isArray(vercel.crons) ? vercel.crons : []

  for (const cron of crons) {
    const cronPath = typeof cron === 'object' && cron !== null && 'path' in cron
      ? (cron as { path?: unknown }).path
      : undefined

    assert.ok(
      typeof cronPath !== 'string' || !cronPath.includes('/api/supplier-scout'),
      `SupplierScout must not be registered as a Vercel cron path: ${String(cronPath)}`,
    )
  }

  assert.ok(
    !vercelText.includes('/api/supplier-scout'),
    'vercel.json must not reference SupplierScout while it is dormant',
  )
}

const packageJson = JSON.parse(read('package.json')) as Record<string, unknown>
const scripts = typeof packageJson.scripts === 'object' && packageJson.scripts !== null
  ? packageJson.scripts as Record<string, unknown>
  : {}

for (const [name, command] of Object.entries(scripts)) {
  if (name === 'test:supplierscout-dormant') continue
  assert.ok(
    typeof command !== 'string' || !/SUPPLIER_SCOUT_ENABLED\s*=\s*true|register_webhook|daily_report/i.test(command),
    `package script must not activate SupplierScout while dormant: ${name}`,
  )
}

assertIncludes(read('AGENTS.md'), 'SupplierScout is dormant.', 'AGENTS.md dormant rule')
assertIncludes(read('CLAUDE.md'), 'SupplierScout is dormant.', 'CLAUDE.md dormant rule')
assertIncludes(
  read('chatgpt-project-sources/04_BOTS_AND_AUTOMATIONS.md'),
  '/api/supplier-scout` ignores actions unless `SUPPLIER_SCOUT_ENABLED=true`.',
  'bot source pack SupplierScout handling',
)
assertIncludes(
  read('chatgpt-project-sources/16_CURRENT_DECISIONS_AND_RETIREMENTS.md'),
  'SupplierScout is sleeping.',
  'decision source pack SupplierScout handling',
)

console.log('supplierScoutDormancy: route gate, cron absence, scripts, and docs checked - ALL OK')
