import assert from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const reviewPath = 'project-control/LOCAL_PR_REVIEW_PACKAGE.md'
const releasePath = 'project-control/LOCAL_RELEASE_CANDIDATE.md'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  assert.ok(haystack.includes(needle), `${label} must include: ${needle}`)
}

assert.ok(existsSync(reviewPath), 'local PR review package is missing')
assert.ok(existsSync(releasePath), 'local release candidate manifest is missing')

const review = read(reviewPath)
const release = read(releasePath)
const packageJson = JSON.parse(read('package.json')) as {
  scripts?: Record<string, string>
}
const agents = read('AGENTS.md')
const claude = read('CLAUDE.md')
const opsSourcePack = read('chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md')
const nextSprint = read('chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md')
const mdFiles = readdirSync('chatgpt-project-sources').filter((name) => name.endsWith('.md'))

for (const phrase of [
  'D-398 Local PR review package',
  'Status: draft PR #6 is open for `codex/master-build-plan-d500`, rebased on',
  'Proposed PR Title',
  'Scope Summary',
  'D-399 loading-plan first product worklist',
  'D-400 Shopier dashboard batch review sample',
  'D-401 OpenClaw VPS verification guardrail',
  'D-402 historical soak-script quarantine',
  'D-403 provider reality audit',
  'D-404 image regeneration plan',
  'D-405 image-plan runtime smoke',
  'D-406 Shopier runtime-smoke batch review alignment',
  'D-422 product-flow operator checklist',
  'D-423 product-flow checklist dependency ordering',
  'D-424 product-flow primary operator step',
  'D-425 load-plan product-flow handoff',
  'D-426 operator smoke-plan load-plan handoff alignment',
  'D-427 load-plan runtime product-flow handoff',
  'D-428 Shopier dashboard product-flow handoff',
  'D-429 Shopier preview product-flow handoff',
  'D-430 operator smoke-plan Shopier handoff alignment',
  'D-431 operator smoke-plan Shopier credential hold',
  'D-432 operator smoke-plan manual ad preflight alignment',
  'D-433 operator smoke-plan storefront trust preflight',
  'D-434 operator smoke-plan inquiry guard preflight',
  'D-435 operator smoke-plan attribution preflight',
  'D-436 operator smoke-plan sitemap preflight',
  'D-437 operator smoke-plan Telegram access preflight',
  'D-438 Product Flow Snapshot operator links',
  'D-439 loading-plan worklist operator links',
  'D-440 Shopier preview/dashboard operator links',
  'D-441 Shopier preview credential holds',
  'D-442 lead follow-up operator links',
  'D-443 operator inbox product links',
  'D-444 lead desk operator links',
  'D-445 order desk operator links',
  'D-446 business snapshot next-action hints',
  'D-447 funnel snapshot next-action hints',
  'D-448 ad-readiness next-action hints',
  'D-449 operator smoke-plan latest-boundary label',
  'D-450 retired-channel memory-lock guardrail',
  'D-451 PDP conversion trust guardrail',
  'D-452 ad-readiness storefront trust hint',
  'D-453 source-pack latest-boundary guardrail',
  'D-454 loading-plan batch summary',
  'D-455 loading-plan batch focus',
  'D-456 loading-plan focus queue',
  'D-457 loading-plan focus details',
  'D-458 product-flow checklist summary',
  'D-459 product-flow dispatch summary',
  'D-460 product-flow dispatch recovery paths',
  'D-461 control-truth Memory Lock reconciliation',
  'D-462 BlogPosts featured-image schema drift repair',
  'D-463 Mentix skill runtime-truth reconciliation',
  'D-464 homepage merchandising rail wiring',
  'D-465 Obsidian control-center alignment',
  'D-466 protected-brand remediation plan',
  'D-467 protected-brand manual activation hard gate',
  'D-468 product workflow golden path',
  'D-469 Turbopack workspace-root pin',
  'D-470 Product Flow action-ID handoff',
  'D-471 public storefront safety gate',
  'D-472 verified storefront metrics gate',
  'D-473 Product Flow Website visibility truth',
  'D-474 safe public PDP link policy',
  'D-475 direct Telegram UTM guard',
  'D-476 catalog risk-first loading-plan order',
  'D-477 protected-brand provenance review audit',
  'D-478 provenance review delivery idempotency',
  'D-479 Blog editorial preflight and first-publication guard',
  'D-480 Shopier webhook authenticity fail-closed guard',
  'D-481 Shopier order-ID duplicate-safety guard and applied, post-apply-verified index',
  'D-482 Shopier order and stock transaction boundary',
  'D-483 non-Shopier order stock transaction boundary',
  'D-484 non-Shopier conditional stock reservation',
  'D-485 Shopier atomic floor-at-zero decrement',
  'D-486 storefront image fallback and structured data safety',
  'D-487 shared Blog and PDP JSON-LD serialization',
  'D-488 optional OpenClaw VPS deploy guard',
  'D-489 confirmation-wizard schema governance',
  'D-490 lead-status enum schema governance',
  'D-491 order-to-lead relationship schema governance',
  'D-492 storefront header and Camper brand-safety correction',
  'D-493 X direct/fallback provider readiness alignment',
  'D-494 Meta gallery media selection alignment',
  'D-495 Meta public-media dispatch preflight',
  'D-496 lead-followup runtime smoke completeness',
  'D-497 brand remediation external-exposure visibility',
  'D-498 brand remediation provenance-state workflow',
  'D-499 batch Image QC remediation queue',
  'D-500 Meta provider configuration unification',
  'Reviewer Focus',
  'Validation To Include',
  'Not Run / Not Done',
  'Payload/Next remains the source of truth',
  'Active channels are Website, Instagram, Facebook, X, and Shopier.',
  'Dolap and Threads are retired.',
  'SupplierScout is dormant.',
  'n8n is optional glue only.',
  'Shopier remains the checkout/sales bridge',
  'npm run test:local-pr-review',
  'npm run test:local-release-candidate',
  'npm run test:shopier-publish-control',
  'npm run test:lead-followup-plan',
  'npm run test:lead-desk',
  'npm run test:order-desk',
  'npm run test:business-desk',
  'npm run test:funnel-desk',
  'npm run test:ad-readiness',
  'npm run test:utm-builder',
  'npm run test:brand-provenance-review',
  'npm run test:brand-provenance-command',
  'npm run test:blog-preflight',
  'npm run test:blog-publishing-guard',
  'npm run test:blog-preflight-command',
  'npm run test:shopier-webhook-security',
  'npm run test:shopier-webhook-local',
  'npm run test:order-stock-transaction',
  'npm run test:utm-command',
  'npm run test:operator-inbox',
  'npm run test:shopier-commands',
  'npm run test:openclaw-vps-verification',
  'npm run test:mentix-skills',
  'npm run test:soak-scripts',
  'npm run test:provider-reality',
  'npm run test:image-regeneration-plan',
  'npm run test:runtime-smokes',
  'npm run test:product-flow-snapshot',
  'npm run test:product-workflow',
  'npm run test:product-storefront-images',
  'npm run test:product-structured-data',
  'npm run test:structured-data',
  'npm run test:blog-structured-data',
  'npm run test:inquiry-guard',
  'npm run test:attribution',
  'npm run test:sitemap-entries',
  'npm run test:telegram-access',
  'npm run test:merchandising',
  'npm run test:homepage-merchandising',
  'npm run test:obsidian-control',
  'npm run test:story-dispatch',
  'npm run validate',
  'lint 0 errors / 0 warnings',
  `chatgpt-project-sources contains ${mdFiles.length} Markdown documents`,
  'The approved PR preparation pushed `codex/master-build-plan-d500` and created',
  'No merge, production deploy,',
]) {
  assertIncludes(review, phrase, 'local PR review package')
}

for (const checkpoint of [
  'D-380',
  'D-381',
  'D-382',
  'D-383',
  'D-384',
  'D-385',
  'D-386',
  'D-387',
  'D-388',
  'D-389',
  'D-390',
  'D-391',
  'D-392',
  'D-393',
  'D-394',
  'D-395',
  'D-396',
  'D-397',
  'D-398',
  'D-399',
  'D-400',
  'D-401',
  'D-402',
  'D-403',
  'D-404',
  'D-405',
  'D-406',
  'D-422',
  'D-423',
  'D-424',
  'D-425',
  'D-426',
  'D-427',
  'D-428',
  'D-429',
  'D-430',
  'D-431',
  'D-432',
  'D-433',
  'D-434',
  'D-435',
  'D-436',
  'D-437',
  'D-438',
  'D-439',
  'D-440',
  'D-441',
  'D-442',
  'D-443',
  'D-444',
  'D-445',
  'D-446',
  'D-447',
  'D-448',
  'D-449',
  'D-450',
  'D-451',
  'D-452',
  'D-453',
  'D-454',
  'D-455',
  'D-456',
  'D-457',
  'D-458',
  'D-459',
  'D-460',
  'D-461',
  'D-462',
  'D-463',
  'D-464',
  'D-465',
  'D-466',
  'D-467',
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
]) {
  assertIncludes(review, checkpoint, 'local PR review checkpoint list')
}

assertIncludes(release, 'D-398 local PR review package', 'local release candidate manifest')
assertIncludes(release, 'D-399 loading-plan first product worklist', 'local release candidate manifest')
assertIncludes(release, 'D-400 Shopier dashboard batch review sample', 'local release candidate manifest')
assertIncludes(release, 'D-401 OpenClaw VPS verification guardrail', 'local release candidate manifest')
assertIncludes(release, 'D-402 historical soak-script quarantine', 'local release candidate manifest')
assertIncludes(release, 'D-403 provider reality audit', 'local release candidate manifest')
assertIncludes(release, 'D-404 image regeneration plan', 'local release candidate manifest')
assertIncludes(release, 'D-405 image-plan runtime smoke', 'local release candidate manifest')
assertIncludes(release, 'D-406 Shopier runtime-smoke batch review alignment', 'local release candidate manifest')
assertIncludes(release, 'D-380-D-406 plus D-422-D-500', 'local release candidate range')
assertIncludes(release, 'D-422 product-flow operator checklist', 'local release candidate manifest')
assertIncludes(release, 'D-423 product-flow checklist dependency ordering', 'local release candidate manifest')
assertIncludes(release, 'D-424 product-flow primary operator step', 'local release candidate manifest')
assertIncludes(release, 'D-425 load-plan product-flow handoff', 'local release candidate manifest')
assertIncludes(release, 'D-426 operator smoke-plan load-plan handoff alignment', 'local release candidate manifest')
assertIncludes(release, 'D-427 load-plan runtime product-flow handoff', 'local release candidate manifest')
assertIncludes(release, 'D-428 Shopier dashboard product-flow handoff', 'local release candidate manifest')
assertIncludes(release, 'D-429 Shopier preview product-flow handoff', 'local release candidate manifest')
assertIncludes(release, 'D-430 operator smoke-plan Shopier handoff alignment', 'local release candidate manifest')
assertIncludes(release, 'D-431 operator smoke-plan Shopier credential hold', 'local release candidate manifest')
assertIncludes(release, 'D-432 operator smoke-plan manual ad preflight alignment', 'local release candidate manifest')
assertIncludes(release, 'D-433 operator smoke-plan storefront trust preflight', 'local release candidate manifest')
assertIncludes(release, 'D-434 operator smoke-plan inquiry guard preflight', 'local release candidate manifest')
assertIncludes(release, 'D-435 operator smoke-plan attribution preflight', 'local release candidate manifest')
assertIncludes(release, 'D-436 operator smoke-plan sitemap preflight', 'local release candidate manifest')
assertIncludes(release, 'D-437 operator smoke-plan Telegram access preflight', 'local release candidate manifest')
assertIncludes(release, 'D-438 Product Flow Snapshot operator links', 'local release candidate manifest')
assertIncludes(release, 'D-439 loading-plan worklist operator links', 'local release candidate manifest')
assertIncludes(release, 'D-440 Shopier preview/dashboard operator links', 'local release candidate manifest')
assertIncludes(release, 'D-441 Shopier preview credential holds', 'local release candidate manifest')
assertIncludes(release, 'D-442 lead follow-up operator links', 'local release candidate manifest')
assertIncludes(release, 'D-443 operator inbox product links', 'local release candidate manifest')
assertIncludes(release, 'D-444 lead desk operator links', 'local release candidate manifest')
assertIncludes(release, 'D-445 order desk operator links', 'local release candidate manifest')
assertIncludes(release, 'D-446 business snapshot next-action hints', 'local release candidate manifest')
assertIncludes(release, 'D-447 funnel snapshot next-action hints', 'local release candidate manifest')
assertIncludes(release, 'D-448 ad-readiness next-action hints', 'local release candidate manifest')
assertIncludes(release, 'D-449 operator smoke-plan latest-boundary label', 'local release candidate manifest')
assertIncludes(release, 'D-450 retired-channel memory-lock guardrail', 'local release candidate manifest')
assertIncludes(release, 'D-451 PDP conversion trust guardrail', 'local release candidate manifest')
assertIncludes(release, 'D-452 ad-readiness storefront trust hint', 'local release candidate manifest')
assertIncludes(release, 'D-453 source-pack latest-boundary guardrail', 'local release candidate manifest')
assertIncludes(release, 'D-454 loading-plan batch summary', 'local release candidate manifest')
assertIncludes(release, 'D-455 loading-plan batch focus', 'local release candidate manifest')
assertIncludes(release, 'D-456 loading-plan focus queue', 'local release candidate manifest')
assertIncludes(release, 'D-457 loading-plan focus details', 'local release candidate manifest')
assertIncludes(release, 'D-458 product-flow checklist summary', 'local release candidate manifest')
assertIncludes(release, 'D-459 product-flow dispatch summary', 'local release candidate manifest')
assertIncludes(release, 'D-460 product-flow dispatch recovery paths', 'local release candidate manifest')
assertIncludes(release, 'D-461 control-truth Memory Lock reconciliation', 'local release candidate manifest')
assertIncludes(release, 'D-462 BlogPosts featured-image schema drift repair', 'local release candidate manifest')
assertIncludes(release, 'D-463 Mentix skill runtime-truth reconciliation', 'local release candidate manifest')
assertIncludes(release, 'D-464 homepage merchandising rail wiring', 'local release candidate manifest')
assertIncludes(release, 'D-465 Obsidian control-center alignment', 'local release candidate manifest')
assertIncludes(release, 'D-466 protected-brand remediation plan', 'local release candidate manifest')
assertIncludes(release, 'D-467 protected-brand manual activation hard gate', 'local release candidate manifest')
assertIncludes(release, 'D-468 product workflow golden path', 'local release candidate manifest')
assertIncludes(release, 'D-469 Turbopack workspace-root pin', 'local release candidate manifest')
assertIncludes(release, 'D-470 Product Flow action-ID handoff', 'local release candidate manifest')
assertIncludes(release, 'D-471 public storefront safety gate', 'local release candidate manifest')
assertIncludes(release, 'D-472 verified storefront metrics gate', 'local release candidate manifest')
assertIncludes(release, 'D-473 Product Flow Website visibility truth', 'local release candidate manifest')
assertIncludes(release, 'D-474 safe public PDP link policy', 'local release candidate manifest')
assertIncludes(release, 'D-475 direct Telegram UTM guard', 'local release candidate manifest')
assertIncludes(release, 'D-476 catalog risk-first loading-plan order', 'local release candidate manifest')
assertIncludes(release, 'D-477 protected-brand provenance review audit', 'local release candidate manifest')
assertIncludes(release, 'D-478 provenance review delivery idempotency', 'local release candidate manifest')
assertIncludes(release, 'D-479 Blog editorial preflight and first-publication guard', 'local release candidate manifest')
assertIncludes(release, 'D-480 Shopier webhook authenticity fail-closed guard', 'local release candidate manifest')
assertIncludes(release, 'D-481 Shopier order-ID duplicate-safety guard and applied, post-apply-verified index', 'local release candidate manifest')
assertIncludes(release, 'D-482 Shopier order and stock transaction boundary', 'local release candidate manifest')
assertIncludes(release, 'D-483 non-Shopier order stock transaction boundary', 'local release candidate manifest')
assertIncludes(release, 'D-484 non-Shopier conditional stock reservation', 'local release candidate manifest')
assertIncludes(release, 'D-485 Shopier atomic floor-at-zero decrement', 'local release candidate manifest')
assertIncludes(release, 'D-486 storefront image fallback and structured data safety', 'local release candidate manifest')
assertIncludes(release, 'D-487 shared Blog and PDP JSON-LD serialization', 'local release candidate manifest')
assertIncludes(release, 'D-488 optional OpenClaw VPS deploy guard', 'local release candidate manifest')
assertIncludes(release, 'D-489 confirmation-wizard schema governance', 'local release candidate manifest')
assertIncludes(release, 'D-490 lead-status enum schema governance', 'local release candidate manifest')
assertIncludes(release, 'D-491 order-to-lead relationship schema governance', 'local release candidate manifest')
assertIncludes(release, 'D-492 storefront header and Camper brand-safety correction', 'local release candidate manifest')
assertIncludes(release, 'D-493 X direct/fallback provider readiness alignment', 'local release candidate manifest')
assertIncludes(release, 'D-494 Meta gallery media selection alignment', 'local release candidate manifest')
assertIncludes(release, 'D-495 Meta public-media dispatch preflight', 'local release candidate manifest')
assertIncludes(release, 'D-496 lead-followup runtime smoke completeness', 'local release candidate manifest')
assertIncludes(release, 'D-497 brand remediation external-exposure visibility', 'local release candidate manifest')
assertIncludes(release, 'D-498 brand remediation provenance-state workflow', 'local release candidate manifest')
assertIncludes(release, 'D-499 batch Image QC remediation queue', 'local release candidate manifest')
assertIncludes(release, 'D-500 Meta provider configuration unification', 'local release candidate manifest')

assert.ok(mdFiles.length <= 20, `source pack must stay under 21 docs; found ${mdFiles.length}`)

assertIncludes(
  packageJson.scripts?.['test:local-pr-review'] ?? '',
  'tsx scripts/local-pr-review-governance.ts',
  'package test:local-pr-review script',
)
assertIncludes(
  packageJson.scripts?.['test:safe'] ?? '',
  'npm run test:local-pr-review',
  'safe test suite',
)

for (const doc of [agents, claude]) {
  assertIncludes(doc, 'D-398 local PR review package is local-only', 'agent guidance')
  assertIncludes(doc, 'test:local-pr-review', 'agent guidance validation list')
}

assertIncludes(opsSourcePack, 'test:local-pr-review', 'source-pack ops validation')
assertIncludes(opsSourcePack, 'project-control/LOCAL_PR_REVIEW_PACKAGE.md', 'source-pack PR package pointer')
assertIncludes(nextSprint, 'D-398 local PR review package added and governance-tested locally.', 'next sprint PR package')

console.log('localPrReviewGovernance: local PR package, validation notes, and review guardrails - ALL OK')
