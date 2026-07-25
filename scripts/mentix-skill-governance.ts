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
assert.ok(existsSync('mentix-skills/OPENCLAW_VPS_VERIFICATION.md'), 'OpenClaw VPS verification checklist is missing')

const sync = read(syncPath)
for (const required of [
  'Payload/Next remains the source of truth',
  'Hermes is the current agent-control layer',
  'OpenClaw is historical/optional unless explicitly reactivated',
  'n8n is optional glue only',
  'Website, Instagram, Facebook, X, and Shopier',
  'Dolap and Threads are retired',
  'SupplierScout remains dormant',
  'own-products-only',
  'npm run test:mentix-skills',
  'npm run test:operator-smoke-plan',
  'npm run test:openclaw-vps-verification',
  'OPENCLAW_VPS_VERIFICATION.md',
  'The repo skill files are not proof that VPS OpenClaw is synced',
  '/smokeplan',
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
assertIncludes(mentixIntake, 'live_smoke_plan', 'mentix-intake live smoke routing')
assertIncludes(mentixIntake, 'answer with `/smokeplan` first', 'mentix-intake smokeplan first rule')
assertNotIncludes(mentixIntake, 'mentix-intake → n8n webhook', 'mentix-intake default route')

const productFlowDebugger = read('mentix-skills/product-flow-debugger/SKILL.md')
assertIncludes(productFlowDebugger, 'Optional n8n bridge', 'product-flow-debugger current flow')
assertIncludes(productFlowDebugger, 'Instagram / Facebook / X direct, Shopier jobs', 'product-flow-debugger active channels')
assertIncludes(productFlowDebugger, 'Run `/smokeplan` first.', 'product-flow-debugger smokeplan first rule')
assertIncludes(productFlowDebugger, 'Stop before queue/publish variants', 'product-flow-debugger mutation boundary')
assertIncludes(productFlowDebugger, 'This skill reports evidence and proposes a next operator step.', 'product-flow-debugger advisory boundary')
assertIncludes(productFlowDebugger, 'no public image is a failed result rather', 'product-flow-debugger Meta media boundary')
assertIncludes(productFlowDebugger, 'Confidence calibrates the recommendation, not permission.', 'product-flow-debugger confidence boundary')
assertNotIncludes(productFlowDebugger, 'Proceed with fix', 'product-flow-debugger self-execution claim')

const uploadPost = read('mentix-skills/upload-post/SKILL.md')
assertIncludes(uploadPost, 'Instagram, Facebook, X, or Shopier', 'upload-post active channels')
assertIncludes(uploadPost, 'NEVER auto-publish without explicit user approval', 'upload-post approval gate')
assertIncludes(uploadPost, 'An operator approval of copy is not a publish approval.', 'upload-post approval distinction')
assertIncludes(uploadPost, 'draft was persisted, marked ready, queued, or published unless the app', 'upload-post app-confirmed state boundary')
assertIncludes(uploadPost, 'A blocked product is routed to Product Flow/brand', 'upload-post protected-brand draft gate')
assertNotIncludes(uploadPost, 'Approved drafts are stored with status `ready_to_publish`', 'upload-post unsupported draft persistence claim')

const researchCog = read('mentix-skills/research-cog/SKILL.md')
assertIncludes(researchCog, 'SupplierScout remains dormant.', 'research-cog supplier dormancy')
assertIncludes(researchCog, 'own-products-only strategy', 'research-cog own-products-only rule')

const installationMatrix = read('mentix-skills/INSTALLATION_MATRIX.md')
assertIncludes(installationMatrix, 'OpenClaw is historical/optional unless explicitly reactivated', 'installation matrix status')
assertIncludes(installationMatrix, 'VPS state must be verified before any optional OpenClaw sync or live use', 'installation matrix status')
assertIncludes(installationMatrix, 'n8n is optional glue only', 'installation matrix n8n status')
assertIncludes(installationMatrix, 'Dolap and Threads are retired', 'installation matrix retired-channel guard')
assertIncludes(installationMatrix, 'VERIFY ON VPS', 'installation matrix verification status')
assertIncludes(installationMatrix, 'OPENCLAW_VPS_VERIFICATION.md', 'installation matrix verification checklist')
assertIncludes(installationMatrix, '/smokeplan', 'installation matrix smokeplan test')

const dashboard = read('mentix-skills/mentix-skill-stack-dashboard.html')
assertIncludes(dashboard, 'n8n is optional glue only', 'skill dashboard n8n optionality')
assertIncludes(dashboard, '/smokeplan', 'skill dashboard smokeplan deployment test')
assertNotIncludes(dashboard, 'sends structured payload to n8n webhook', 'skill dashboard default n8n route')
assertNotIncludes(dashboard, 'POST to n8n', 'skill dashboard active n8n permission')
assertIncludes(dashboard, 'Current runtime: Hermes/Mentix on the operator PC', 'skill dashboard current control layer')
assertIncludes(dashboard, 'VPS State: Verify Before Optional Use', 'skill dashboard VPS verification boundary')
assertNotIncludes(dashboard, 'Already Live on VPS', 'skill dashboard stale VPS claim')

const sourcePack = read('chatgpt-project-sources/07_MENTIX_OPENCLAW_SKILLS.md')
assertIncludes(sourcePack, 'Hermes should be the current agent-control layer for Mentix/Uygunops operations.', 'source pack Hermes role')
assertIncludes(sourcePack, 'OpenClaw remains historical/optional unless explicitly reactivated.', 'source pack OpenClaw optionality')
assertIncludes(sourcePack, 'optional OpenClaw reactivation checklist', 'source pack deployment requirement')
assertIncludes(sourcePack, '/smokeplan', 'source pack smokeplan guidance')
assertIncludes(sourcePack, 'Never execute an action based on confidence', 'source pack debugger action boundary')
assertIncludes(sourcePack, 'Content approval is only approval of copy.', 'source pack upload approval boundary')

const openQuestions = read('project-control/OPEN_QUESTIONS.md')
assertIncludes(openQuestions, 'Hermes/Mentix is the current agent-control layer.', 'project-control Hermes role')
assertIncludes(openQuestions, 'OpenClaw is historical and', 'project-control OpenClaw optionality')

const seniorBackendD463 = read('mentix-skills/senior-backend/SKILL.md')
assertIncludes(seniorBackendD463, 'Hermes is the current Mentix/Uygunops agent-control layer.', 'senior-backend current control layer')
assertIncludes(seniorBackendD463, 'Production schema changes require a reviewed, operator-approved migration or guarded SQL plan', 'senior-backend schema policy')
assertIncludes(seniorBackendD463, 'D-462 read-only preflight', 'senior-backend blog schema guardrail')

const mentixIntakeD463 = read('mentix-skills/mentix-intake/SKILL.md')
assertIncludes(mentixIntakeD463, 'Hermes is the current Mentix/Uygunops agent-control layer.', 'mentix-intake current control layer')
assertIncludes(mentixIntakeD463, 'does not prove that an OpenClaw gateway receives every Telegram message', 'mentix-intake optional gateway boundary')

const productFlowDebuggerD463 = read('mentix-skills/product-flow-debugger/SKILL.md')
assertIncludes(productFlowDebuggerD463, 'Hermes is the current Mentix/Uygunops agent-control layer.', 'product-flow-debugger current control layer')
assertIncludes(productFlowDebuggerD463, 'optional OpenClaw template only after explicit reactivation and VPS verification', 'product-flow-debugger optional deployment boundary')

const uploadPostD463 = read('mentix-skills/upload-post/SKILL.md')
assertIncludes(uploadPostD463, 'Hermes is the current Mentix/Uygunops agent-control layer.', 'upload-post current control layer')
assertIncludes(uploadPostD463, 'Never bypass Product Flow Snapshot, activation, brand-safety, or Shopier/Web queue gates', 'upload-post shared gate policy')
assertIncludes(uploadPostD463, 'Never draft for Dolap or Threads', 'upload-post retired channel policy')

const researchCogD463 = read('mentix-skills/research-cog/SKILL.md')
assertIncludes(researchCogD463, 'Hermes is the current Mentix/Uygunops agent-control layer.', 'research-cog current control layer')
assertIncludes(researchCogD463, 'smoke:pi-provider-health:read', 'research-cog provider health guard')
assertIncludes(researchCogD463, 'ask for operator approval before any paid search', 'research-cog provider approval gate')

const agentMemoryD463 = read('mentix-skills/agent-memory/SKILL.md')
assertIncludes(agentMemoryD463, 'Hermes is the current Mentix/Uygunops agent-control layer.', 'agent-memory current control layer')
assertIncludes(agentMemoryD463, 'Durable project decisions belong in `project-control/`', 'agent-memory durable decision policy')
assertIncludes(agentMemoryD463, 'never store customer names, phones, addresses, raw Telegram messages, credentials, tokens', 'agent-memory PII policy')
assertIncludes(agentMemoryD463, 'not evidence that an OpenClaw memory service is deployed or running', 'agent-memory optional deployment boundary')

const activationConfigD463 = read('mentix-skills/ACTIVATION_CONFIG.md')
assertIncludes(activationConfigD463, 'Current Runtime Override (D-463)', 'activation config current override')
assertIncludes(activationConfigD463, 'OpenClaw is historical/optional unless the operator explicitly reactivates it', 'activation config OpenClaw boundary')
assertIncludes(activationConfigD463, 'not evidence of currently deployed or enabled OpenClaw behavior', 'activation config stale-mode guard')

console.log('mentixSkillGovernance: Hermes/Mentix skill guardrails checked - ALL OK')
