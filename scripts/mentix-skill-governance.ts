import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

function assertNotIncludes(haystack: string, needle: string, label: string) {
  assert.ok(!haystack.includes(needle), `${label} must not include: ${needle}`)
}

const syncPath = 'mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md'
assert.ok(existsSync(syncPath), 'OpenClaw deployment sync checklist is missing')

const sync = read(syncPath)
for (const required of [
  'Payload/Next remains the source of truth',
  'OpenClaw/Mentix is the agent and skill layer',
  'n8n is optional glue only',
  'Website, Instagram, Facebook, X, and Shopier',
  'Dolap and Threads are retired',
  'SupplierScout remains dormant',
  'own-products-only',
  'npm run test:mentix-skills',
]) {
  assertIncludes(sync, required, 'OpenClaw deployment sync checklist')
}

const seniorBackend = read('mentix-skills/senior-backend/SKILL.md')
assertIncludes(seniorBackend, 'n8n is optional glue only when explicitly configured', 'senior-backend current data flow')
assertNotIncludes(seniorBackend, 'Telegram → OpenClaw → n8n → Payload', 'senior-backend default flow')

const mentixIntake = read('mentix-skills/mentix-intake/SKILL.md')
assertIncludes(mentixIntake, 'Payload remains the source of truth.', 'mentix-intake current truth')
assertIncludes(mentixIntake, 'n8n only as optional glue', 'mentix-intake n8n role')
assertIncludes(mentixIntake, 'Terlik', 'mentix-intake current categories')
assertNotIncludes(mentixIntake, 'mentix-intake → n8n webhook', 'mentix-intake default route')

const productFlowDebugger = read('mentix-skills/product-flow-debugger/SKILL.md')
assertIncludes(productFlowDebugger, 'Optional n8n bridge', 'product-flow-debugger current flow')
assertIncludes(productFlowDebugger, 'Instagram / Facebook / X direct, Shopier jobs', 'product-flow-debugger active channels')

const uploadPost = read('mentix-skills/upload-post/SKILL.md')
assertIncludes(uploadPost, 'Instagram, Facebook, X, or Shopier', 'upload-post active channels')
assertIncludes(uploadPost, 'NEVER auto-publish without explicit user approval', 'upload-post approval gate')

const researchCog = read('mentix-skills/research-cog/SKILL.md')
assertIncludes(researchCog, 'SupplierScout remains dormant.', 'research-cog supplier dormancy')
assertIncludes(researchCog, 'own-products-only strategy', 'research-cog own-products-only rule')

const installationMatrix = read('mentix-skills/INSTALLATION_MATRIX.md')
assertIncludes(installationMatrix, 'Current-truth sync required before VPS deployment', 'installation matrix status')
assertIncludes(installationMatrix, 'OPTIONAL / VERIFY', 'installation matrix n8n status')
assertIncludes(installationMatrix, 'Do not add Dolap/Threads/n8n stubs', 'installation matrix retired-channel guard')

const sourcePack = read('chatgpt-project-sources/07_MENTIX_OPENCLAW_SKILLS.md')
assertIncludes(sourcePack, 'OpenClaw should be the agent brain for Mentix.', 'source pack OpenClaw role')
assertIncludes(sourcePack, 'Skill sync checklist', 'source pack deployment requirement')

console.log('mentixSkillGovernance: OpenClaw/Mentix skill guardrails checked - ALL OK')
