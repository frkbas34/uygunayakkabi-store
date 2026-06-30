import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function read(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

const runbook = read('project-control/DEPLOYMENT_OPS_RUNBOOK.md')
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
]) {
  assertIncludes(runbook, phrase, 'deployment ops runbook guardrails')
}

for (const command of [
  'npm run typecheck',
  'npm run lint',
  'npm run validate',
  'npm run test:ops-runbook',
  'npm run smoke:activation:read -- --product=<id> --confirm-read-only',
  'npm run smoke:imageqc:schema -- --confirm-read-only',
  'npm run smoke:shopier:read -- --confirm-read-only',
  'npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema',
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
  'SUPPLIER_SCOUT_ENABLED',
]) {
  assertIncludes(runbook, envName, 'deployment ops runbook env inventory')
}

assertIncludes(
  packageJson.scripts?.['test:ops-runbook'] ?? '',
  'tsx scripts/ops-runbook-governance.ts',
  'package test:ops-runbook script',
)
assertIncludes(packageJson.scripts?.['test:safe'] ?? '', 'npm run test:ops-runbook', 'safe test suite')

assertIncludes(opsSourcePack, 'test:ops-runbook', 'source-pack ops validation')
assertIncludes(opsSourcePack, 'project-control/DEPLOYMENT_OPS_RUNBOOK.md', 'source-pack ops runbook pointer')
assertIncludes(nextSprint, 'Phase 9 Deployment/Ops Runbook implemented', 'next sprint ops milestone')
assertIncludes(nextSprint, 'test:ops-runbook', 'next sprint ops validation mention')

console.log('opsRunbookGovernance: deploy, rollback, env, webhook, cron, PR, and source-pack checks - ALL OK')
