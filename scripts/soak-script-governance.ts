import assert from 'node:assert'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(!haystack.includes(needle), `${label} must not include: ${needle}`)
}

const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}

const scripts = packageJson.scripts ?? {}
const soakFiles = readdirSync('scripts')
  .filter((name) => /^d\d+-soak.*\.ts$/.test(name))
  .sort()

assert.ok(soakFiles.length > 0, 'historical soak files should be detected')
assert.ok(existsSync('project-control/HISTORICAL_SOAK_SCRIPTS.md'), 'historical soak runbook is missing')

const runbook = read('project-control/HISTORICAL_SOAK_SCRIPTS.md')
const opsRunbook = read('project-control/DEPLOYMENT_OPS_RUNBOOK.md')
const validationOps = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
const nextSprint = read('chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md')
const tsconfig = read('tsconfig.json')
const eslintConfig = read('eslint.config.mjs')
const gitignore = read('.gitignore')

for (const phrase of [
  'historical live-data soak harnesses',
  'not part of normal validation',
  'not part of `npm run validate`',
  'not part of `test:safe`',
  'not read-only runtime smokes',
  'operator explicitly approves a live-data soak',
  'stale absolute `/sessions/...` paths',
  'Do not add package scripts that run these soak files by default.',
]) {
  assertIncludes(runbook, phrase, 'historical soak runbook')
}

for (const file of soakFiles) {
  assertIncludes(runbook, `scripts/${file}`, 'historical soak runbook file list')
}

assertIncludes(scripts['test:soak-scripts'] ?? '', 'tsx scripts/soak-script-governance.ts', 'package test:soak-scripts script')
assertIncludes(scripts['test:safe'] ?? '', 'npm run test:soak-scripts', 'safe test suite')
assertNotIncludes(scripts.validate ?? '', 'soak', 'validate command')

for (const [name, command] of Object.entries(scripts)) {
  if (name === 'test:soak-scripts') continue
  for (const file of soakFiles) {
    assertNotIncludes(command, file, `package script ${name}`)
  }
}

assertIncludes(tsconfig, '"scripts"', 'tsconfig exclude list')
assertIncludes(tsconfig, '"sessions"', 'tsconfig exclude list')
assertIncludes(tsconfig, '"tmp"', 'tsconfig exclude list')
assertIncludes(eslintConfig, '"scripts/**"', 'ESLint global ignores')
assertIncludes(eslintConfig, '"sessions/**"', 'ESLint global ignores')
assertIncludes(eslintConfig, '"tmp/**"', 'ESLint global ignores')
assertIncludes(gitignore, 'sessions/', 'gitignore generated/session artifacts')
assertIncludes(gitignore, 'tmp/', 'gitignore generated/temp artifacts')

assertIncludes(opsRunbook, 'project-control/HISTORICAL_SOAK_SCRIPTS.md', 'deployment ops runbook soak quarantine')
assertIncludes(opsRunbook, 'npm run test:soak-scripts', 'deployment ops runbook soak governance')
assertIncludes(validationOps, 'historical soak-script governance assertions', 'source-pack validation status')
assertIncludes(validationOps, 'project-control/HISTORICAL_SOAK_SCRIPTS.md', 'source-pack soak runbook pointer')
assertIncludes(nextSprint, 'D-402 historical soak-script quarantine', 'next sprint soak milestone')

console.log(`soakScriptGovernance: ${soakFiles.length} historical soak scripts quarantined - ALL OK`)
