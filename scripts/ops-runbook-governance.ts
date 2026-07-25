import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const runbook = read('project-control/DEPLOYMENT_OPS_RUNBOOK.md')
const dailyOperatorRunbook = read('project-control/OPERATOR_RUNBOOK.md')
const historicalDeployChecklist = read('project-control/DEPLOY_CHECKLIST.md')
const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}
const opsSourcePack = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
const nextSprint = read('chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md')

for (const heading of [
  '## Scope',
  '## Pre-Deploy Validation',
  '## Environment Review',
  '## Database And Schema Changes',
  '## Webhook Health',
  '## Cron And Job Runner Health',
  '## Deploy Sequence',
  '## Post-Deploy Smoke',
  '## Rollback Sequence',
  '## GitHub PR Workflow',
]) {
  assertIncludes(runbook, heading, 'deployment ops runbook headings')
}

for (const phrase of [
  'Active channels are Website, Instagram, Facebook, X, and Shopier.',
  'Dolap and Threads are retired.',
  'SupplierScout is dormant.',
  'n8n is optional glue only',
  'Shopier remains the checkout/sales bridge',
  'Do not deploy, register, cron, or operate Dolap, Threads, or SupplierScout',
  'Do not run confirmed apply mode without explicit operator approval.',
  'Do not import or activate new n8n workflows as part of a normal app deploy.',
  'Do not stage, commit, push, or open a PR unless the operator asks for it.',
  'D-480 rejects the webhook before JSON parsing or any order/stock/refund/Telegram side effect',
  'secret-safe `## Operator Evidence\nRecord` format in `project-control/PROVIDER_REALITY_AUDIT.md`',
]) {
  assertIncludes(runbook, phrase, 'deployment ops runbook guardrails')
}

for (const phrase of [
  '# UygunAyakkabi Operator Runbook',
  'Payload/Next is the source of truth',
  'Hermes is the current agent-control layer.',
  'OpenClaw is historical/optional',
  'Sell and upload our own products only.',
  'Active channels: Website, Instagram, Facebook, X, Shopier.',
  'Dolap and Threads are retired. SupplierScout is dormant.',
  'n8n is optional glue only.',
  '/smokeplan',
  '/productflow <id-or-sn>',
  'npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only',
  'npm run smoke:image-qc-plan:read -- --confirm-read-only',
  '/imageqcplan',
  '/shopier dashboard',
  '/shopier publish-ready',
  '/shopier retry-errors',
  'verify `SHOPIER_PAT`, webhook URL/token, account permissions, and quota',
  'The D-481 unique order-ID',
  'project-control/DEPLOYMENT_OPS_RUNBOOK.md',
  'Keep the pack at 20 Markdown',
]) {
  assertIncludes(dailyOperatorRunbook, phrase, 'daily operator runbook current truth')
}

for (const stalePhrase of [
  'After activation: product is LIVE',
  'Instagram token expires 2026-05-21',
  'Instagram and Facebook direct dispatch are confirmed working',
  'Triggers: channel dispatch (Instagram, Facebook)',
]) {
  assert.ok(
    !dailyOperatorRunbook.includes(stalePhrase),
    `daily operator runbook must not retain stale claim: ${stalePhrase}`,
  )
}

for (const command of [
  'npm run typecheck',
  'npm run lint',
  'npm run validate',
  'npm run test:ops-runbook',
  'npm run test:local-release-candidate',
  'npm run test:local-pr-review',
  'npm run test:provider-reality',
  'npm run test:operator-smoke-plan',
  'npm run test:product-flow-snapshot',
  'npm run test:product-storefront-images',
  'npm run test:product-structured-data',
  'npm run test:structured-data',
  'npm run test:blog-structured-data',
  'npm run test:image-qc-remediation-plan',
  'npm run test:image-regeneration-plan',
  'npm run test:shopier-webhook-local',
  'npm run test:shopier-webhook-security',
  'npm run test:payload-transaction',
  'npm run test:shopier-order-transaction',
  'npm run test:order-stock-transaction',
  'npm run test:lead-status-schema',
  'npm run test:lead-conversion-schema',
  'npm run smoke:activation:read -- --product=<id> --confirm-read-only',
  'npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only',
  'npm run smoke:imageqc:schema -- --confirm-read-only',
  'npm run smoke:blog-schema:read -- --confirm-read-only',
  'npm run smoke:wizard-sessions:schema -- --confirm-read-only',
  'npm run smoke:lead-status-schema:read -- --confirm-read-only',
  'npm run smoke:lead-conversion-schema:read -- --confirm-read-only',
  'npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only',
  'npm run smoke:shopier-order-id-schema:read -- --confirm-read-only',
  'npm run smoke:shopier:read -- --confirm-read-only',
  'npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only',
  'npm run smoke:image-qc-plan:read -- --confirm-read-only',
  'npm run smoke:load-plan:read -- --confirm-read-only',
  'npm run smoke:brand-safety:read -- --confirm-read-only',
  '/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]',
  'npm run smoke:ad-performance:read -- --confirm-read-only',
  'npm run test:utm-builder',
  'npm run test:utm-command',
  'npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema',
  'npm run db:blog-featured-image:apply -- --apply --confirm-apply-d462-blog-featured-image-schema',
  'npm run db:wizard-sessions:apply -- --apply --confirm-apply-d489-wizard-sessions-schema',
  'npm run db:lead-status-enum:apply -- --apply --confirm-apply-d490-lead-status-enum',
  'npm run db:lead-conversion-schema:apply -- --apply --confirm-apply-d491-order-lead-relationship',
  'npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique',
  'bash scripts/vps-deploy.sh --reactivate-openclaw --confirm-vps-sync',
]) {
  assertIncludes(runbook, command, 'deployment ops runbook commands')
}

for (const envName of [
  'DATABASE_URI',
  'PAYLOAD_SECRET',
  'NEXT_PUBLIC_SERVER_URL',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'AUTOMATION_SECRET',
  'CRON_SECRET',
  'SHOPIER_PAT',
  'SHOPIER_WEBHOOK_TOKEN',
  'N8N_CHANNEL_*_WEBHOOK',
  'GOOGLE_VISION_API_KEY',
  'DATAFORSEO_LOGIN',
  'DATAFORSEO_PASSWORD',
  'SERPAPI_API_KEY',
  'REVERSE_SEARCH_PROVIDER',
  'SUPPLIER_SCOUT_ENABLED',
]) {
  assertIncludes(runbook, envName, 'deployment ops runbook env inventory')
}

for (const phrase of [
  '# Historical Deploy Checklist (Reference Only)',
  'This is a historical reference, not an executable deployment procedure.',
  'project-control/DEPLOYMENT_OPS_RUNBOOK.md',
  'n8n is optional fallback glue',
  'four optional fallback webhooks for Instagram, Facebook, X, and Shopier',
  'Do not run `push: true`, confirmed schema DDL, live provider probes, or deployment steps',
]) {
  assertIncludes(historicalDeployChecklist, phrase, 'historical deploy checklist quarantine')
}

assertIncludes(
  packageJson.scripts?.['test:ops-runbook'] ?? '',
  'tsx scripts/ops-runbook-governance.ts',
  'package test:ops-runbook script',
)
assertIncludes(packageJson.scripts?.['test:safe'] ?? '', 'npm run test:ops-runbook', 'safe test suite')
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:local-release-candidate',
  'safe test suite',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:local-pr-review',
  'safe test suite',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:image-qc-remediation-plan',
  'safe test suite',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:image-regeneration-plan',
  'safe test suite',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:lead-status-schema',
  'npm run test:lead-conversion-schema',
  'safe test suite',
)
assertIncludes(
  packageJson.scripts?.['test:shopier-webhook-local'] ?? '',
  'npm run test:shopier-order-stock && npm run test:shopier-refund-lifecycle',
  'package test:shopier-webhook-local script',
)

assertIncludes(opsSourcePack, 'test:ops-runbook', 'source-pack ops validation')
assertIncludes(opsSourcePack, 'project-control/DEPLOYMENT_OPS_RUNBOOK.md', 'source-pack ops runbook pointer')
assertIncludes(opsSourcePack, 'project-control/OPERATOR_RUNBOOK.md', 'source-pack daily operator runbook pointer')
assertIncludes(opsSourcePack, 'test:provider-reality', 'source-pack provider reality validation')
assertIncludes(opsSourcePack, 'project-control/PROVIDER_REALITY_AUDIT.md', 'source-pack provider audit pointer')
assertIncludes(opsSourcePack, 'test:product-flow-snapshot', 'source-pack product-flow validation')
assertIncludes(opsSourcePack, 'load-plan-selected product-flow runtime and Telegram checks', 'source-pack operator smoke-plan ordering')
assertIncludes(opsSourcePack, 'test:image-regeneration-plan', 'source-pack image regeneration validation')
assertIncludes(opsSourcePack, 'test:image-qc-remediation-plan', 'source-pack batch Image QC validation')
assertIncludes(opsSourcePack, 'test:lead-status-schema', 'source-pack lead-status schema validation')
assertIncludes(opsSourcePack, 'test:lead-conversion-schema', 'source-pack lead-conversion schema validation')
assertIncludes(opsSourcePack, 'project-control/DEPLOY_CHECKLIST.md` as historical reference only', 'source-pack historical deploy checklist quarantine')
assertIncludes(nextSprint, 'Phase 9 Deployment/Ops Runbook implemented', 'next sprint ops milestone')
assertIncludes(nextSprint, 'test:ops-runbook', 'next sprint ops validation mention')

console.log('opsRunbookGovernance: deploy, rollback, env, webhook, cron, PR, and source-pack checks - ALL OK')
