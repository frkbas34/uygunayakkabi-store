/**
 * Obsidian control-center governance.
 *
 * The root notes are the human planning surface. They must carry the same
 * operating truth as the source pack and agent guidance, rather than preserve
 * a stale architecture snapshot.
 */
import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const files = {
  home: '00_HOME.md',
  truth: '01_CURRENT_TRUTH.md',
  roadmap: '02_MASTER_ROADMAP.md',
  bots: '03_BOT_OWNERSHIP.md',
  decisions: '04_ACTIVE_DECISIONS.md',
  projectQuestions: 'project-control/OPEN_QUESTIONS.md',
  projectState: 'project-control/PROJECT_STATE.md',
  claudeMemory: 'project-control/CLAUDE_MEMORY.md',
  projectDecisions: 'project-control/DECISIONS.md',
}

function read(path: string): string {
  assert.ok(existsSync(path), `Obsidian control note is missing: ${path}`)
  return readFileSync(path, 'utf8')
}

function assertIncludes(text: string, phrase: string, label: string) {
  assert.ok(text.includes(phrase), `${label} must include: ${phrase}`)
}

const home = read(files.home)
const truth = read(files.truth)
const roadmap = read(files.roadmap)
const bots = read(files.bots)
const decisions = read(files.decisions)
const projectQuestions = read(files.projectQuestions)
const projectState = read(files.projectState)
const claudeMemory = read(files.claudeMemory)
const projectDecisions = read(files.projectDecisions)

for (const link of ['[[01_CURRENT_TRUTH]]', '[[02_MASTER_ROADMAP]]', '[[03_BOT_OWNERSHIP]]', '[[04_ACTIVE_DECISIONS]]']) {
  assertIncludes(home, link, 'Obsidian home navigation')
}

for (const phrase of [
  'Payload/Next is the source of truth for products, media, orders, leads,',
  'Hermes is the current agent-control layer',
  'OpenClaw is historical/optional',
  'n8n is optional compatibility glue only.',
  'Active channels: Website, Instagram, Facebook, X, Shopier.',
  'Dolap and Threads are retired.',
  'SupplierScout is dormant.',
  'D-500 is the deployed master-build boundary.',
  'D-501 was merged through PR #7 as commit `8adfd1b`;',
  'Chrome DevTools responsive',
  'X direct publishing requires all four OAuth 1.0a values.',
  'Direct Instagram/Facebook dispatch scans the complete gallery for public',
  'If no public HTTPS media exists, Instagram/Facebook fail with a clear media',
  'D-481 concurrent duplicate protection;',
]) {
  assertIncludes(truth, phrase, 'Obsidian current truth')
}

assert.ok(
  !truth.includes('Mentix/OpenClaw is the operator agent layer.'),
  'Obsidian current truth must not describe OpenClaw as the current shared agent layer',
)

for (const phrase of [
  'Project control center',
  'Repo health',
  'Product workflow',
  'Mentix/Hermes',
  'Publishing reliability',
  'AI images and GEO',
  'Storefront conversion',
  'Orders, leads, stock, analytics',
  'Ads and growth',
  'Deployment and ops',
  'D-468',
  'D-469',
  'D-470',
  'D-471',
  'D-472',
  'D-473',
  'D-474',
  'D-475',
  'D-476',
  'D-477',
  'D-478',
  'D-479',
  'D-480',
  'D-481',
  'D-482',
  'D-483',
  'D-484',
  'D-485',
  'D-486',
  'D-487',
  'D-488',
  'D-489',
  'D-490',
  'D-491',
  'D-492',
  'D-493',
  'D-494',
  'D-495',
  'D-496',
  'D-497',
  'D-498',
  'D-499',
  'D-500',
  'D-501',
  "D-481's approved partial",
  'post-apply verified',
]) {
  assertIncludes(roadmap, phrase, 'Obsidian roadmap')
}

for (const phrase of [
  'Hermes is the current agent-control layer.',
  'Mentix/Uygunops is the Telegram',
  'Historical/optional skill host only.',
  'Optional fallback glue',
  'Dormant.',
]) {
  assertIncludes(bots, phrase, 'Obsidian bot ownership')
}
assert.ok(
  !bots.includes('Agent brain and skill host.'),
  'Obsidian bot ownership must not describe OpenClaw as the current agent brain',
)

for (const phrase of [
  'Sell and upload our own products only.',
  'Active: Website, Instagram, Facebook, X, Shopier.',
  'Retired: Dolap, Threads.',
  'SupplierScout is sleeping;',
  'Payload/Next is the source of truth and execution layer.',
  'Hermes/Mentix is the current agent-control',
  'OpenClaw is optional/history',
  'n8n is optional fallback glue',
  'Protected-brand cleanup is manual and provenance-gated',
  '`manualPublishOverride` may not bypass a protected-brand match',
  'same local change.',
]) {
  assertIncludes(decisions, phrase, 'Obsidian active decisions')
}

for (const phrase of [
  "D-481's approved partial unique Shopier order-ID index is applied and",
  'operator-approved live webhook smoke, not further index DDL.',
  'approved 2026-07-25 read-only preflights found all three contracts',
]) {
  assertIncludes(projectQuestions, phrase, 'Project control questions')
}
assert.ok(
  !projectQuestions.includes('### Q11: Shopier Order-ID Unique Index'),
  'Project control questions must not treat the applied D-481 index as an open DDL decision',
)

for (const phrase of [
  'D-481 configured-database index applied and verified',
  'This completes database-side duplicate-delivery protection',
  'approved 2026-07-25 read-only preflight confirms the nullable integer column',
  'every declared CustomerInquiries status enum value already exists',
  'preflight confirms `public.wizard_sessions` is complete',
]) {
  assertIncludes(projectState, phrase, 'Project control state')
}
assert.ok(
  !projectState.includes("D-481's separate index remains un-applied"),
  'Project control state must not describe the applied D-481 index as pending',
)

for (const phrase of [
  "D-481's index is applied and post-apply verified.",
  'D-467 makes protected-brand safety non-overridable.',
  'collectActivationBlockers()` always retains a protected-brand blocker.',
  'preflight confirmed the nullable integer relationship and exact foreign key already exist',
  'preflight confirmed every declared status enum value already exists',
  'preflight confirmed `public.wizard_sessions` is complete',
]) {
  assertIncludes(claudeMemory, phrase, 'Project control Claude memory')
}
assert.ok(
  !claudeMemory.includes('skips only Image QC and brand-safety blockers under this explicit context'),
  'Project control Claude memory must not allow manual override to skip brand safety',
)
assert.ok(
  !claudeMemory.includes('The confirmed preflight/apply remains unrun.'),
  'Project control Claude memory must not describe the completed D-489 preflight as unrun',
)

for (const phrase of [
  'It must **not** bypass protected-brand safety',
  'always preserves the protected-brand block',
]) {
  assertIncludes(projectDecisions, phrase, 'Project control decisions')
}

console.log('obsidianControlGovernance: root control notes and current architecture - ALL OK')
