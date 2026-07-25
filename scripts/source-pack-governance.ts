import assert from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SOURCE_PACK_DIR = 'chatgpt-project-sources'
const MAX_SOURCE_DOCS = 20

const REQUIRED_SOURCE_FILES = [
  '00_INDEX_AND_UPLOAD_GUIDE.md',
  '01_CURRENT_TRUTH.md',
  '02_MASTER_ROADMAP.md',
  '04_BOTS_AND_AUTOMATIONS.md',
  '13_VALIDATION_DEPLOYMENT_OPS.md',
  '15_UPDATE_PROTOCOL_FOR_AI_AGENTS.md',
  '16_CURRENT_DECISIONS_AND_RETIREMENTS.md',
  '17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md',
  '19_MASTER_PLAN_COMPLETION_AUDIT.md',
]

const ACTIVE_CONTROL_ARTIFACTS = [
  'mentix-memory/policies/PUBLISH_POLICY.md',
  'mentix-skill-stack-dashboard.html',
  'project-control/architecture-onion.html',
  'project-control/mimari-sogankatmani-tr.html',
]

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(
    haystack.includes(needle),
    `${label} must include: ${needle}`,
  )
}

function assertNoRetiredChannelMention(path: string) {
  const text = read(path)
  assert.ok(!/\b(dolap|threads)\b/i.test(text), `${path} must not present retired channels in active control artifacts`)
}

const mdFiles = readdirSync(SOURCE_PACK_DIR).filter((name) => name.endsWith('.md')).sort()

assert.ok(mdFiles.length > 0, 'source pack must contain Markdown files')
assert.ok(
  mdFiles.length <= MAX_SOURCE_DOCS,
  `source pack must stay under ${MAX_SOURCE_DOCS + 1} docs; found ${mdFiles.length}`,
)

for (const file of REQUIRED_SOURCE_FILES) {
  assert.ok(existsSync(join(SOURCE_PACK_DIR, file)), `required source-pack file is missing: ${file}`)
}

const index = read(join(SOURCE_PACK_DIR, '00_INDEX_AND_UPLOAD_GUIDE.md'))
assertIncludes(index, `Current document count: ${mdFiles.length}`, 'upload guide')
assertIncludes(index, 'do not exceed 20 documents', 'upload/update protocol')

const currentTruth = read(join(SOURCE_PACK_DIR, '01_CURRENT_TRUTH.md'))
const roadmap = read(join(SOURCE_PACK_DIR, '02_MASTER_ROADMAP.md'))
const nextSprint = read(join(SOURCE_PACK_DIR, '17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md'))
const completionAudit = read(join(SOURCE_PACK_DIR, '19_MASTER_PLAN_COMPLETION_AUDIT.md'))
const ordersAnalytics = read(join(SOURCE_PACK_DIR, '11_ORDERS_LEADS_STOCK_ANALYTICS.md'))
const opsValidation = read(join(SOURCE_PACK_DIR, '13_VALIDATION_DEPLOYMENT_OPS.md'))
for (const channel of ['Website', 'Instagram', 'Facebook', 'X', 'Shopier']) {
  assertIncludes(currentTruth, `- ${channel}`, 'current truth active channel list')
}
assertIncludes(currentTruth, 'Dolap: removed from active channel model.', 'current truth retirement')
assertIncludes(currentTruth, 'Threads: removed from active channel model.', 'current truth retirement')
assertIncludes(currentTruth, 'SupplierScout: dormant.', 'current truth dormant system')
assertIncludes(currentTruth, 'Operator Live Smoke Plan (D-389/D-452)', 'current truth latest smoke-plan boundary')
assertIncludes(currentTruth, 'D-501 mobile PDP CTA overflow correction', 'current truth mobile PDP correction')
assertIncludes(currentTruth, 'PR #7 merged the correction as `8adfd1b`', 'current truth D-501 deployment')
assertIncludes(roadmap, 'D-452 - Ad-Readiness Storefront Trust Hint', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-453 - Source-Pack Latest-Boundary Guardrail', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-454 - Loading-Plan Batch Summary', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-455 - Loading-Plan Batch Focus', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-456 - Loading-Plan Focus Queue', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-457 - Loading-Plan Focus Details', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-458 - Product-Flow Checklist Summary', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-459 - Product-Flow Dispatch Summary', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-460 - Product-Flow Dispatch Recovery Paths', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-461 - Control-Truth Memory Lock Reconciliation', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-462 - BlogPosts Featured-Image Schema Drift Repair', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-463 - Mentix Skill Runtime-Truth Reconciliation', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-464 - Homepage Merchandising Rail Wiring', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-465 - Obsidian Control-Center Alignment', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-466 - Protected-Brand Remediation Plan', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-467 - Protected-Brand Manual Activation Hard Gate', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-468 - Product Workflow Golden Path', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-469 - Turbopack Workspace-Root Pin', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-470 - Product Flow Action-ID Handoff', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-471 - Public Storefront Safety Gate', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-472 - Verified Storefront Metrics Gate', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-473 - Product Flow Website Visibility Truth', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-474 - Safe Public PDP Link Policy', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-475 - Direct Telegram UTM Guard', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-476 - Catalog Risk-First Loading-Plan Order', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-477 - Protected-Brand Provenance Review Audit', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-478 - Provenance Review Delivery Idempotency', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-479 - Blog Editorial Preflight And First-Publication Guard', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-480 - Shopier Webhook Authenticity Fail-Closed Guard', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-481 - Shopier Order-ID Duplicate-Safety Guard', 'roadmap latest milestone')
assertIncludes(roadmap, 'SQL fingerprint `c79810ec7a084bfc`', 'roadmap D-481 post-apply evidence')
assertIncludes(roadmap, 'D-482 - Shopier Order And Stock Transaction Boundary', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-483 - Non-Shopier Order Stock Transaction Boundary', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-484 - Non-Shopier Conditional Stock Reservation', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-485 - Shopier Atomic Floor-At-Zero Decrement', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-486 - Storefront Image Fallback And Structured Data Safety', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-487 - Shared Blog And PDP JSON-LD Serialization', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-488 - Optional OpenClaw VPS Deploy Guard', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-489 - Confirmation-Wizard Schema Governance', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-490 - Lead-Status Enum Schema Governance', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-491 - Order-To-Lead Relationship Schema Governance', 'roadmap latest milestone')
assertIncludes(roadmap, '`public.wizard_sessions` already satisfies', 'roadmap D-489 configured-schema evidence')
assertIncludes(roadmap, 'every declared CustomerInquiries\nstatus enum value already exists', 'roadmap D-490 configured-schema evidence')
assertIncludes(roadmap, 'nullable integer relationship and\nits `customer_inquiries.id` foreign key already exist', 'roadmap D-491 configured-schema evidence')
assertIncludes(roadmap, 'D-492 - Storefront Header And Camper Brand-Safety Correction', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-493 - X Direct/Fallback Provider Readiness Alignment', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-494 - Meta Gallery Media Selection Alignment', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-495 - Meta Public-Media Dispatch Preflight', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-496 - Lead-Followup Runtime Smoke Completeness', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-497 - Brand Remediation External-Exposure Visibility', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-498 - Brand Remediation Provenance-State Workflow', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-499 - Batch Image QC Remediation Queue', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-500 - Meta Provider Configuration Unification', 'roadmap latest milestone')
assertIncludes(roadmap, 'D-501 - Mobile PDP CTA Overflow Guard', 'roadmap latest milestone')
assertIncludes(nextSprint, 'Latest local boundary: D-501.', 'next sprint latest boundary')
assertIncludes(nextSprint, 'D-501 is deployed through PR #7 as `8adfd1b`.', 'next sprint D-501 deployment')
assertIncludes(nextSprint, 'D-380-D-406 plus D-422-D-500', 'next sprint release boundary')
assertIncludes(nextSprint, 'Operator Live Smoke Plan (D-389/D-452)', 'next sprint smoke-plan title boundary')
assertIncludes(nextSprint, '### Catalog Provenance Review', 'next sprint catalog provenance decision')
assertIncludes(nextSprint, '`/brandplan` and `/productflow <id-or-sn>`', 'next sprint catalog provenance evidence')
assertIncludes(completionAudit, 'Payload/Next is the source of truth and execution layer.', 'completion audit architecture')
assertIncludes(completionAudit, 'Active channels: Website, Instagram, Facebook, X, Shopier.', 'completion audit channel boundary')
assertIncludes(completionAudit, 'D-467 makes that a hard', 'completion audit brand-safety boundary')
assertIncludes(completionAudit, '| 10. Catalog scale-up |', 'completion audit catalog phase')
assertIncludes(completionAudit, 'D-476 active-exposure-first loading-plan ordering', 'completion audit catalog priority')
assertIncludes(completionAudit, 'D-477 preview-first provenance audit records', 'completion audit provenance audit')
assertIncludes(completionAudit, 'D-478 retry-safe delivery handling', 'completion audit provenance idempotency')
assertIncludes(completionAudit, 'D-479 Blog editorial first-publication preflight', 'completion audit Blog preflight')
assertIncludes(completionAudit, 'D-480 raw-body fail-closed webhook authenticity', 'completion audit Shopier webhook security')
assertIncludes(completionAudit, 'D-481 duplicate-order safety', 'completion audit Shopier duplicate-order safety')
assertIncludes(completionAudit, 'D-481\'s approved concurrent partial unique index is applied and post-apply verified', 'completion audit D-481 configured-database evidence')
assertIncludes(completionAudit, 'D-482 atomic Shopier order/stock writes', 'completion audit Shopier transaction boundary')
assertIncludes(completionAudit, 'D-483 atomic non-Shopier order handling', 'completion audit non-Shopier transaction boundary')
assertIncludes(completionAudit, 'D-484 conditional non-Shopier stock reservations', 'completion audit non-Shopier reservation boundary')
assertIncludes(completionAudit, 'D-485 atomic Shopier floor-at-zero decrements', 'completion audit Shopier decrement boundary')
assertIncludes(completionAudit, 'D-486 generated-first/original-fallback PDP images', 'completion audit storefront image boundary')
assertIncludes(completionAudit, 'D-487 safe Article schema serialization', 'completion audit Blog schema boundary')
assertIncludes(completionAudit, 'D-488 makes its legacy VPS sync explicitly reactivation-only', 'completion audit OpenClaw deploy guard')
assertIncludes(completionAudit, 'D-489 request-time schema-DDL removal', 'completion audit confirmation schema guard')
assertIncludes(completionAudit, 'D-490 guarded lead-status enum drift handling', 'completion audit lead-status schema guard')
assertIncludes(completionAudit, 'D-491 guarded order-to-lead relationship drift handling', 'completion audit lead-conversion schema guard')
assertIncludes(completionAudit, 'D-492 fixed-header layout and Camper brand-safety coverage', 'completion audit storefront safety correction')
assertIncludes(completionAudit, 'D-493 X complete-OAuth/direct-or-optional-fallback alignment', 'completion audit X provider readiness correction')
assertIncludes(completionAudit, 'D-494 Meta full-gallery public-media selection', 'completion audit Meta gallery media correction')
assertIncludes(completionAudit, 'D-495 no-public-media preflight', 'completion audit Meta media preflight')
assertIncludes(completionAudit, 'D-496 relation-complete lead diagnostics', 'completion audit lead smoke completeness')
assertIncludes(completionAudit, 'D-497 recorded external-dispatch visibility', 'completion audit external dispatch visibility')
assertIncludes(completionAudit, 'D-498 provenance-state workflow', 'completion audit provenance-state workflow')
assertIncludes(completionAudit, 'D-499 batch Image QC remediation', 'completion audit batch Image QC remediation')
assertIncludes(completionAudit, 'D-500 unifies Facebook direct dispatch', 'completion audit Meta provider configuration')
assertIncludes(completionAudit, 'D-501 records the first deployed mobile storefront evidence', 'completion audit mobile PDP correction')
assertIncludes(completionAudit, 'PR #7 merged it as `8adfd1b`', 'completion audit D-501 deployment')
assertIncludes(completionAudit, '20-document limit', 'completion audit source-pack cap')
for (const phrase of [
  'approved 2026-07-25 metadata preflight confirms the nullable relationship',
  'every declared status enum value already exists, so no DDL was needed.',
  'metadata preflight confirms `public.wizard_sessions` is',
]) {
  assertIncludes(opsValidation, phrase, 'ops validation configured-schema evidence')
}
for (const stalePhrase of [
  'D-491 metadata preflight and confirmed relationship DDL path remain unrun',
  'D-490 metadata preflight and confirmed enum DDL\npath remain unrun',
  'D-489 metadata preflight and confirmed DDL path remain unrun',
]) {
  assert.ok(!opsValidation.includes(stalePhrase), `ops validation must not retain stale schema state: ${stalePhrase}`)
}
assertIncludes(ordersAnalytics, 'approved partial concurrent index is applied and post-apply verified', 'orders analytics D-481 configured-database evidence')
assert.ok(
  !ordersAnalytics.includes('partial concurrent index is not applied yet'),
  'orders analytics must not describe the applied D-481 index as pending',
)
assert.ok(
  !nextSprint.includes('current `Operator Live Smoke Plan (D-389/D-449)`'),
  'next sprint must not describe D-449 smoke-plan title as current',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-451 stack'),
  'next sprint must not describe D-422-D-451 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-454 stack'),
  'next sprint must not describe D-422-D-454 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-455 stack'),
  'next sprint must not describe D-422-D-455 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-478 stack'),
  'next sprint must not describe D-422-D-478 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-482 stack'),
  'next sprint must not describe D-422-D-482 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-456 stack'),
  'next sprint must not describe D-422-D-456 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-457 stack'),
  'next sprint must not describe D-422-D-457 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-458 stack'),
  'next sprint must not describe D-422-D-458 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-459 stack'),
  'next sprint must not describe D-422-D-459 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-460 stack'),
  'next sprint must not describe D-422-D-460 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-461 stack'),
  'next sprint must not describe D-422-D-461 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-462 stack'),
  'next sprint must not describe D-422-D-462 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-463 stack'),
  'next sprint must not describe D-422-D-463 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-464 stack'),
  'next sprint must not describe D-422-D-464 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-465 stack'),
  'next sprint must not describe D-422-D-465 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-466 stack'),
  'next sprint must not describe D-422-D-466 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-467 stack'),
  'next sprint must not describe D-422-D-467 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-468 stack'),
  'next sprint must not describe D-422-D-468 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-469 stack'),
  'next sprint must not describe D-422-D-469 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-473 stack'),
  'next sprint must not describe D-422-D-473 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-474 stack'),
  'next sprint must not describe D-422-D-474 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-475 stack'),
  'next sprint must not describe D-422-D-475 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-476 stack'),
  'next sprint must not describe D-422-D-476 as the current stack',
)
assert.ok(
  !nextSprint.includes('D-380-D-406 plus D-422-D-477 stack'),
  'next sprint must not describe D-422-D-477 as the current stack',
)

const decisions = read(join(SOURCE_PACK_DIR, '16_CURRENT_DECISIONS_AND_RETIREMENTS.md'))
assertIncludes(decisions, 'Dolap and Threads are not part of the project anymore.', 'retirement decisions')
assertIncludes(decisions, 'SupplierScout is sleeping.', 'retirement decisions')
assertIncludes(decisions, 'n8n is optional glue.', 'retirement decisions')
assertIncludes(decisions, 'Hermes is the current agent-control layer for UygunAyakkabi/Mentix operations.', 'retirement decisions')
assertIncludes(decisions, 'OpenClaw is historical/optional unless the operator explicitly reactivates it.', 'retirement decisions')

const productChannels = read('src/lib/productChannels.ts')
assertIncludes(
  productChannels,
  "export const ACTIVE_PRODUCT_CHANNELS = ['website', 'instagram', 'shopier', 'x', 'facebook'] as const",
  'product channel source of truth',
)
assert.ok(!productChannels.includes("'dolap'"), 'product channel source of truth must not include dolap')
assert.ok(!productChannels.includes("'threads'"), 'product channel source of truth must not include threads')

for (const artifact of ACTIVE_CONTROL_ARTIFACTS) {
  assert.ok(existsSync(artifact), `active control artifact is missing: ${artifact}`)
  assertNoRetiredChannelMention(artifact)
}

console.log(`sourcePackGovernance: ${mdFiles.length} docs checked - ALL OK`)
