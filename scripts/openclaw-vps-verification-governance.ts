import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `${label} must not include: ${needle}`)
}

const verificationPath = 'mentix-skills/OPENCLAW_VPS_VERIFICATION.md'
const syncPath = 'mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md'
const matrixPath = 'mentix-skills/INSTALLATION_MATRIX.md'
const deployPath = 'scripts/vps-deploy.sh'

for (const path of [verificationPath, syncPath, matrixPath, deployPath]) {
  assert.ok(existsSync(path), `${path} is missing`)
}

const verification = read(verificationPath)
const sync = read(syncPath)
const matrix = read(matrixPath)
const deploy = read(deployPath)
const sourcePack = read('chatgpt-project-sources/07_MENTIX_OPENCLAW_SKILLS.md')
const botsSourcePack = read('chatgpt-project-sources/04_BOTS_AND_AUTOMATIONS.md')
const opsSourcePack = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}

for (const phrase of [
  'This checklist is read-only',
  'Do not run `scp`, `rsync`, `docker compose restart`',
  'Do not print secret values',
  'Payload/Next as the source of truth',
  'Hermes is the current agent-control layer',
  'OpenClaw is historical/optional unless explicitly reactivated',
  'product-flow-debugger',
  'mentix-intake',
  'Dolap',
  'Threads',
  'SupplierScout',
  '/smokeplan',
  '--reactivate-openclaw',
  '--confirm-vps-sync',
]) {
  assertIncludes(verification, phrase, 'OpenClaw VPS verification checklist')
}

for (const phrase of [
  'D-401 Verification-First Rule',
  'OPENCLAW_VPS_VERIFICATION.md',
  'npm run test:openclaw-vps-verification',
  'The repo skill files are not proof that VPS OpenClaw is synced',
  'Do not claim that a skill is deployed on the VPS',
  'Do not run `scp`, `rsync`, `docker compose restart`',
  '--reactivate-openclaw',
  '--confirm-vps-sync',
]) {
  assertIncludes(sync, phrase, 'OpenClaw deployment sync checklist')
}

for (const phrase of [
  'VPS state must be verified',
  'VERIFY ON VPS',
  'This matrix describes the expected repo-side skill set',
  'OpenClaw is historical/optional unless explicitly reactivated',
  'product-flow-debugger',
  'Dolap and Threads are retired',
  'SupplierScout is dormant',
  '/smokeplan',
]) {
  assertIncludes(matrix, phrase, 'OpenClaw installation matrix')
}

for (const staleClaim of ['✅ Running', '✅ LIVE', 'Connected | OpenClaw Telegram channel']) {
  assertNotIncludes(matrix, staleClaim, 'OpenClaw installation matrix stale VPS claim')
}

assertIncludes(
  packageJson.scripts?.['test:openclaw-vps-verification'] ?? '',
  'tsx scripts/openclaw-vps-verification-governance.ts',
  'package test:openclaw-vps-verification script',
)
assert.ok(
  !(packageJson.scripts?.['test:safe'] ?? '').includes('npm run test:openclaw-vps-verification'),
  'safe test suite must not run optional OpenClaw VPS verification while Hermes is current',
)

for (const phrase of [
  'Hermes/Mentix is current',
  '--reactivate-openclaw',
  '--confirm-vps-sync',
  'Refusing OpenClaw VPS sync',
]) {
  assertIncludes(deploy, phrase, 'OpenClaw legacy VPS deploy guard')
}

for (const doc of [sourcePack, botsSourcePack, opsSourcePack]) {
  assertIncludes(doc, 'OPENCLAW_VPS_VERIFICATION.md', 'source-pack OpenClaw verification reference')
  assertIncludes(doc, 'test:openclaw-vps-verification', 'source-pack OpenClaw verification test reference')
  assertIncludes(doc, '--reactivate-openclaw', 'source-pack OpenClaw deploy reactivation flag')
}

console.log('openclawVpsVerificationGovernance: verification-first OpenClaw sync guardrails - ALL OK')
