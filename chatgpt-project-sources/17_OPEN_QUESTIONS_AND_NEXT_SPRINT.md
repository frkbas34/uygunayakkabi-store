# Open Questions And Next Sprint

Last updated: 2026-07-25

## Post-Merge Storefront Correction

D-501 is an uncommitted local mobile PDP correction. A read-only 390px
production smoke found the deployed Classic Loafer PDP at 440px document width:
the fixed 40/60 CTA controls added content-box padding outside their flex
basis. The homepage had no document overflow. Both controls now use
`boxSizing: 'border-box'` and `minWidth: 0`; `npm run test:storefront-trust`,
`npm run typecheck`, and `npm run lint` pass. An approved deploy and repeat
390px PDP smoke are required before Phase 6 storefront conversion is complete.
No provider, Shopier, Telegram, n8n, Payload, SupplierScout, retired-channel,
or ad action occurred.

## Local PR Preparation Checkpoint

The approved local PR preparation is complete. The D-380-D-500 stack is
committed on `codex/master-build-plan-d500` and rebased on the current
`origin/main`; `npm run validate`, `npm run build`, and the review diff check
pass. PR #6 is merged into `main`; Vercel Production deployment
`dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready. Read-only browser smoke confirms
the public homepage and a live PDP with Shopier and WhatsApp CTAs. No live
Telegram command, provider call, Shopier action, queue write, ad spend,
SupplierScout activation, retired-channel activation, or optional OpenClaw sync
has occurred. The next separate approval is an operator-present read-only smoke.

## Latest Approved Schema Result

D-481 Shopier duplicate-order database protection is complete in the configured
database. The approved 2026-07-25 concurrent partial unique-index apply used
reviewed SQL fingerprint `c79810ec7a084bfc`; the post-apply read-only check
passes with `orders_shopier_order_id_unique_idx` present and zero duplicate
non-empty IDs. `npm run test:shopier-webhook-local` passes locally. The next
remaining Shopier evidence is an operator-approved live webhook delivery smoke,
not another schema apply.

## Latest Approved Read-Only Readiness Result

The approved 2026-07-25 read-only smoke sequence found a 100/127 catalog
sample with zero ready products, 13 protected-brand blockers, 28 failed and 26
pending Image-QC records, and 84 stale drafts. `SN0111` is an active legacy
Camper record with a public-storefront block, Image-QC review, prior Facebook
publish state, a recorded X credits-depleted failure, and Shopier history; no
state was changed. Configured-environment provider health is Website ready,
Instagram disabled, Facebook ready/direct, and X/Shopier missing direct or
fallback requirements. Gemini text/image is ready, while no reverse-search provider is
configured. Business reads show six open stale leads, no open orders, one
sold-out and one low-stock product, and no seven-day funnel activity. Shopier
preview has no new queue/error/retry candidates and `SHOPIER_PAT` is absent.
The D-496 lead-followup harness repair made the lead read relation-complete;
none of these reads wrote data, queued work, called providers/Shopier, or spent
on ads.

## Immediate Next Sprint

Current sprint status:

1. `AGENTS.md` added.
2. `CLAUDE.md` added.
3. Obsidian control notes added at repo root.
4. Validation scripts fixed.
5. Stale generated/session artifacts excluded from validation.
6. `npm run validate` passes and now includes brand-safety, protected-brand remediation planning, product-media, product-stock, product-lifecycle, operator-readiness, source-pack governance, retired-channel governance, n8n optionality governance, deployment ops runbook governance, runtime-smoke governance, historical soak-script governance, SupplierScout dormancy, Hermes/Mentix skill governance, admin-visibility, product-channel-normalization, product-flow snapshot/operator-checklist, publish-readiness, catalog-QA, category-fill, product-loading-plan, lead-followup-plan, operator-smoke-plan, image-quality, Shopier command governance, Shopier publish-control/admin-gate/safe-retry, state-coherence repair, Telegram caption parsing, confirmation-wizard channel handling, channel-dispatch, dispatch-state, channel provider-health, story-dispatch brand-safety, Product Intelligence provider-health, redispatch, activation-guard, Publish Desk activation, ad-readiness, ad-launch-pack, and ad-performance assertions. `test:openclaw-vps-verification` remains standalone for optional OpenClaw reactivation review.
7. Product activation guard implemented: active creates and transitions into `status='active'` now require price, image, effective stock, active target, and brand-safety pass.
8. Code-level activation smoke test added at `src/lib/productActivationGuard.test.ts`, including actual `Products.beforeChange` hook behavior.
9. Product defaults changed to `draft`; content generation and automation intake no longer auto-activate. Ready products wait for explicit operator approval.
10. Admin ReviewPanel and Telegram activation help now explicitly describe the Payload activation guard instead of implying readiness alone is enough.
11. Product lifecycle vocabulary is now canonicalized in `src/lib/productLifecycle.ts` and surfaced in ReviewPanel without changing the Payload status schema.
12. Publish Desk activation smoke test added for readiness blocks, Payload guard blocks, idempotent active products, and successful activation events.
13. Central publish readiness tightened to include usable media, valid price, real stock, active channel targets only, and brand safety.
14. Per-channel dispatch state is now canonicalized in `src/lib/channelDispatchStatus.ts` and surfaced in ReviewPanel.
15. Channel dispatch eligibility now has direct tests proving Website is native, Dolap/Threads are not eligible, active external channels are limited to Instagram/Shopier/X/Facebook, and brand safety blocks dispatch.
16. Telegram redispatch is now tested for exact-one-channel behavior, other-channel note preservation, website refusal, inactive-product refusal, and Shopier queueing.
17. Read-only runtime activation smoke command added: `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. It reads one Payload product with `PAYLOAD_DB_PUSH=false` and reports readiness/stock/targets/blockers without writes.
18. Read-only runtime smoke verified on product `359`: readiness `6/6`, effective stock `10`, all active targets, no activation blockers, no coherence issues.
19. GeoBot `Yayına Al` activation now uses the same `approveAndActivateProduct()` helper as `/activate`, `/approvepublish`, and Publish Desk, with `sourceBot=geobot`.
20. Automation decision tests now prove n8n/API intake remains draft-first even when legacy auto-activate gates pass.
21. Guarded activation mutation smoke command added: `npm run smoke:activation:mutate`.
22. Mutation smoke usage and confirmation gates are verified; product `359` correctly refuses before mutation because it is a real active product with external targets.
23. Helper temp-smoke verified the runtime Telegram/Publish Desk activation path: product `363` was created as a website-only smoke draft, activated through `approveAndActivateProduct()`, verified active, restored, had `2` smoke bot-events deleted, and was deleted. No external channel dispatched and no Shopier job was queued.
24. Admin-direct temp-smoke verified direct Payload admin-save behavior: product `364` was created as a website-only smoke draft, activated through a plain Payload update, verified `status=active`, `workflowStatus=active`, `publishStatus=published`, restored, and deleted. No external channel dispatched and no Shopier job was queued.
25. Telegram caption parsing now recognizes all active channel targets, including X/Facebook aliases and legacy `Instagram: evet`; tests prove Dolap/Threads stay ignored.
26. Telegram legacy photo+caption fallback now uses `resolveChannelTargets()` and sets all active channel flags from the effective target list instead of the removed `postToInstagram` shape.
27. Automation-decision tests now prove all active channels pass when globally enabled, globally disabled active channels are reported as blocked, and retired/unknown channels are dropped.
28. Payload admin ReviewPanel now appears for admin/manual products too, so admin creation gets readiness, lifecycle, channel, brand-safety, and activation-guard visibility.
29. Admin/manual products now expose source/dispatch metadata after activation or when real dispatch/sync/story metadata exists, while fresh manual drafts keep that group hidden. Covered by `test:admin-visibility`.
30. Product channel selection now normalizes `channelTargets` and `channels.publish*` before activation, with shared helper coverage and direct `Products.beforeChange` hook coverage.
31. State-coherence diagnostics now detect channel drift on older records: unsupported targets, target selected while publish flag is false, or publish flag true while target is missing.
32. Direct Payload admin saves to `status='soldout'` now normalize workflow status, stock state, and sellable state, with direct `Products.beforeChange` hook coverage.
33. Media readiness now uses one shared usable-media helper across activation guard, central publish readiness, and ReviewPanel; empty placeholder rows do not count.
34. Stock readiness now uses one shared helper across central publish readiness and ReviewPanel; populated variants take precedence, unpopulated variant IDs fall back to `stockQuantity`, and sold-out/not-sellable workflow state blocks stock false greens. Covered by `test:product-stock`.
35. Active control artifacts were cleaned so the publish policy, skill dashboard, and current architecture diagrams no longer present Dolap/Threads as active channels. Historical decision/export archives may still mention them as old context.
36. ReviewPanel's ready banner now uses central six-dimension publish readiness plus field blockers/warnings, so confirmation/content/audit blockers cannot be hidden behind a basic-field green state. Covered by `test:operator-readiness`.
37. `/pipeline` diagnostics now use shared usable-media and stock-summary helpers, so placeholder media rows and top-level-only stock cannot produce misleading pipeline output. Covered by `test:publish-readiness`.
38. Source-pack governance is now mechanically tested by `test:source-pack`: document count stays at or below 20, required source files exist, active channel truth remains Website/Instagram/Facebook/X/Shopier, SupplierScout remains dormant in the decision pack, and active control artifacts do not re-list Dolap/Threads.
39. SupplierScout dormancy is now mechanically tested by `test:supplierscout-dormant`: the route must keep the `SUPPLIER_SCOUT_ENABLED=true` gate before webhook processing, daily reports, and webhook registration; Vercel must not register a SupplierScout cron; package scripts must not activate it; and source-pack guidance must still say it is dormant.
40. Telegram confirmation wizard channel handling is now tested by `test:confirmation-wizard`: the target picker includes the active channel set including X, retired/unknown targets are dropped from wizard checks and summaries, and spoofed `wz_tgt:*` callbacks are rejected before entering the session.
41. State-coherence repair is now tested by `test:state-coherence`: `/repair` preview remains dry-run, confirmed repair updates only derived workflow fields, archived products are skipped, confirmed repairs emit `state.repaired`, repeated repair is idempotent, and scan mode is read-only.
42. Hermes/Mentix skill governance is now tested by `test:mentix-skills`: repo skills must keep Hermes as the current agent-control layer, Payload/Next as source of truth, n8n optional, active channels Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, SupplierScout dormant, and OpenClaw historical/optional unless explicitly reactivated.
43. Dispatch overview now shows active targets even when no dispatch note exists: Website appears as native published, missing external results appear as `unrecorded`, and historical non-target notes stay visible. Covered by `test:dispatch-status`.
44. Provider health is now tested by `test:provider-health`, surfaced in Telegram `/diagnostics`, and available as read-only runtime smoke `npm run smoke:provider-health:read -- --confirm-read-only`: states are `ready`, `fallback`, `disabled`, or `missing`, and diagnostics/smoke print key names only, never secret values.
45. Next: smoke test the live admin UI and live Telegram operator path with an operator present, then continue product workflow polish and deeper retry handling.
46. Lead capture production repair (D-351) completed: `/api/inquiries` 500 root-caused to the missing `customer_inquiries.landing` column; DDL applied; route hardened with a staged fail-safe; live form success and admin readback confirmed (product relation, phone, size, source, UTM source/medium/campaign, landing). Revenue lead capture is restored.
47. Strategic focus shifted to catalog scale-up / product loading factory; ads deferred to D-380+. New roadmap D-352–D-357 is recorded in `02_MASTER_ROADMAP.md` Phase 10, and image-QA standards in `09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`.
48. D-352A Product Loading Factory Audit completed from code evidence. Result: controlled small-batch loading is feasible, but sustained 30-50 products/day still needs D-356 live smoke and any needed retry/error dashboard polish. D-355 structured Image QC is implemented, and D-356A now has guarded Shopier/Web queueing, first-pass error triage, and safe retry preview/confirm. Summary source: `18_D352_PRODUCT_LOADING_FACTORY_AUDIT.md`.
49. D-353 Bulk Product QA implemented as a read-only helper/test plus Telegram command. Use `/catalogqa [limit]` to inspect status/source/category distribution, derived lifecycle, missing completeness fields, readiness blockers, image-QC pending/rejected, content/audit pending, Shopier sync states, brand-safety blocks, draft age, and last updated time. It does not mutate, publish, retry, or spend. Covered by `test:catalog-qa`, included in `test:safe`.
50. D-354 Category Fill Strategy implemented as a read-only helper/test plus Telegram command. Use `/categoryfill [limit]` to inspect target gaps and next load order by category. Core baselines are Klasik 40-60, Spor 30-50, Günlük 30-50; seasonal baselines are Bot 10-25 and Terlik 8-20; Cüzdan is optional 0-15. Legacy/unknown categories are reported but not counted as active fill targets. Covered by `test:category-fill`, included in `test:safe`.

51. D-355 Product Image Quality Gate implemented as a structured helper/test, Payload schema group, admin ReviewPanel signal, Telegram `/imageqc` command, and publish/activation/ad readiness gate. AI/generated images require explicit QC PASS before publish readiness, activation, or ad readiness. Original-only product media can pass without generated-image QC. `/imageqc` writes only QC metadata/workflow visual state and performs no external publish, dispatch, retry, or ad action. Covered by `test:image-quality`, plus publish-readiness, activation-guard, ad-readiness, and catalog-QA assertions.
52. D-356A Shopier/Web queue guard implemented. `src/lib/shopierPublishControl.ts` blocks Shopier queueing unless the product is active/visible, has a slug, explicitly targets Shopier in both target and flag fields, has category, generated-gallery media, Image QC PASS, sellable stock, brand-safety pass, central publish readiness, and no duplicate queued/syncing job. `/shopier dashboard` is read-only and summarizes queue readiness, top blockers, error classes, and safe retry counts. `/shopier publish-ready` is preview-first; `/shopier publish-ready confirm` queues only passing products. Single `/shopier publish|republish` use the same guard. `/shopier errors` gives first-pass sync error triage by retryable, product data, configuration, remote state, or unknown class. `/shopier retry-errors` previews safe retry candidates; `/shopier retry-errors confirm` queues only retryable errors that still pass the shared gate. Read-only runtime smoke exists at `npm run smoke:shopier:read -- --confirm-read-only`. Covered by `test:shopier-publish-control`.
53. D-355 DB drift repair helper remains guarded: `npm run db:imageqc:apply` previews by default, `npm run db:imageqc:apply -- --dry-run --print-sql` prints the reviewed DDL, and `npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema` is the explicit operator-run apply path. Codex/Claude should not run confirmed apply mode without operator approval. Current read-only evidence on 2026-07-02: schema check PASS, product-flow smoke for product `359` completed, and Shopier read-only smoke completed.
54. Retired-channel governance is now mechanically tested by `test:retired-channels`: active code, n8n workflow stubs, package activation scripts, current decision docs, and D-450 Memory Lock handoff files must not reintroduce Dolap/Threads. Negative tests may still mention retired channels to prove they are rejected.
55. n8n optionality governance is now mechanically tested by `test:n8n-optional`: n8n remains optional glue, workflow JSON files stay limited to active-channel fallback paths, missing webhook env vars remain scaffold/no-throw behavior, package scripts cannot activate n8n workflows by default, and legacy automation intake stays Payload-first/draft-first.
56. Phase 9 Deployment/Ops Runbook implemented. `project-control/DEPLOYMENT_OPS_RUNBOOK.md` now records the current deploy, rollback, env-var, webhook-health, cron/job-runner, D-355 DB drift, n8n optionality, SupplierScout dormancy, retired-channel, source-pack, and GitHub PR workflow guardrails. Covered by `test:ops-runbook`, included in `test:safe`.
57. D-356B per-product admin Shopier gate implemented. Payload admin ReviewPanel now shows a read-only Shopier Queue Gate for the current product using `evaluateShopierPublishControl()`, distinguishing not-targeted, ready, queued, synced, and blocked states without queueing jobs or calling Shopier. Covered by `test:shopier-publish-control`.
58. Phase 2/3 Product Flow Snapshot implemented as `src/lib/productFlowSnapshot.ts`, Telegram `/productflow <sn-or-id>` and `/flow <sn-or-id>`, and `test:product-flow-snapshot`. It is read-only and combines lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state, channel/coherence drift, operator checklist, and next actions for operators and Hermes/Mentix diagnostics.
59. Product Flow Snapshot runtime smoke implemented as `scripts/product-flow-runtime-smoke.ts`, exposed by `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`. It reads one real Payload product by id or stock number, forces `PAYLOAD_DB_PUSH=false`, uses the same helper as Telegram `/productflow`, prints the same operator checklist, and performs no writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes.
60. Provider Health runtime smoke implemented as `scripts/provider-health-runtime-smoke.ts`, exposed by `npm run smoke:provider-health:read -- --confirm-read-only`. It reads AutomationSettings with `PAYLOAD_DB_PUSH=false`, uses the same secret-safe provider-health helper as Telegram `/diagnostics`, and performs no writes, jobs, dispatches, provider calls, Shopier calls, schema pushes, or secret-value printing.
61. Product Intelligence Provider Health implemented as `src/lib/productIntelligence/providerHealth.ts`, `src/lib/productIntelligence/providerHealth.test.ts`, and `scripts/pi-provider-health-runtime-smoke.ts`, exposed by `npm run test:pi-provider-health` and `npm run smoke:pi-provider-health:read -- --confirm-read-only`. It checks Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection without Payload access, provider calls, or secret-value printing.
62. Ad Readiness runtime smoke implemented as `scripts/ad-readiness-runtime-smoke.ts`, exposed by `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only`. It reads one real Payload product with `PAYLOAD_DB_PUSH=false`, mirrors Telegram `/adready`, and reports PDP/product-page, clean-media/Image-QC, stock/size, active-channel link, UTM, lead visibility, brand-safety, risky-claim, and no-autonomous-spend checks without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes.
63. Phase 7 Business/Funnel diagnostics hardened. `src/lib/businessDesk.test.ts` and `src/lib/funnelDesk.test.ts` now guard `/business` and `/funnel` formatter/math behavior, including urgency output, lead-source attribution, direct-order separation, legacy `completed` lead handling, UTM/referrer rollups, and formatter escaping. `scripts/business-funnel-runtime-smoke.ts` is exposed as `npm run smoke:business-funnel:read -- --confirm-read-only` and mirrors Telegram `/business` plus `/funnel` against real Payload state without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes.
64. Phase 7 Shopier order/refund stock reconciliation hardened. `src/lib/shopierOrderStock.ts` centralizes Shopier webhook stock mutation for `order.created` and `refund.requested`, and `src/app/api/webhooks/shopier/route.ts` now uses it. `npm run test:shopier-order-stock` covers product-level stock decrement, variant-size stock decrement, mismatched-size skip reasons, refund restore for variants, refund restore for product-only stock, inventory logs, and dispatch-loop-safe update context. Live webhook smoke still waits for configured Shopier credentials/webhooks and operator approval.
65. Phase 7 operator order lifecycle policy hardened. `src/lib/orderDesk.test.ts` and `npm run test:order-desk` now cover `/ship`, `/deliver`, and `/cancelorder` policy: shipping stamps `shippedAt`, delivery stamps `deliveredAt` and backfills `shippedAt`, delivered orders cannot be cancelled from Telegram, idempotent repeat actions do not write, missing orders do not write, and manual cancellation does not auto-restore stock but points the operator to `/restock`.
66. Phase 7 Shopier fulfilled lifecycle unified. Shopier `order.fulfilled` now routes through `applyOrderStatus(..., 'ship', 'shopier_webhook')` instead of directly overwriting order status, so fulfillment shares `/ship` timestamping, idempotency/refusal behavior, and `order.status_changed` audit source coverage.
67. D-380 manual ad launch-pack support added without starting ads. `src/lib/adLaunchPack.ts`, Telegram `/adpack <sn-or-id> [campaign]`, and `npm run test:ad-launch-pack` prepare operator-review copy drafts plus Meta paid-social UTM links only after hard blockers are clear. The helper creates no campaign, post, pixel, provider call, Shopier call, or ad spend. UTM vocabulary now accepts `meta`, `paid_social`, and optional `utm_content` for copy-angle tracking.
68. D-381 story dispatch brand-safety hardening added. `src/lib/storyDispatch.ts` now checks `scanProductBrandSafety()` before StoryJob creation; protected-brand products get `storyStatus='failed'`, `lastStoryError='brand_safety_block: ...'`, no StoryJob, and no future story/social queue. Covered by `npm run test:story-dispatch`, included in `test:safe`.
69. D-382 story dispatch lint cleanup removed stale unused imports from `src/lib/storyDispatch.ts` and clarified the `brand_safety_blocked` status comment. `npm run lint` now reports 0 errors and 70 warnings, down from 74 warnings.
70. D-383 manual ad performance reporting added. `src/lib/adPerformance.ts`, Telegram `/adreport [today|week|month]`, and `npm run test:ad-performance` summarize UTM-tagged Payload leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders without Pixel, CAPI, Ads API, campaign creation, external posting, provider calls, Shopier calls, or ad spend.
71. D-384 read-only ad-performance runtime smoke added. `scripts/ad-performance-runtime-smoke.ts` and `npm run smoke:ad-performance:read -- --confirm-read-only` mirror `/adreport` against real Payload leads/orders with `PAYLOAD_DB_PUSH=false` and explicit no-write/no-provider/no-Shopier/no-ad-spend guardrails. Local validation passed; no live smoke run has been performed yet.
72. D-385 runtime-smoke governance added and validated. `scripts/runtime-smoke-governance.ts` and `npm run test:runtime-smokes` keep the read-only smoke inventory aligned across package scripts, backing scripts, confirmation gates, no-write/mutation-refusal wording, Payload schema-push guards, and docs. It is included in `test:safe`; runtime smoke commands themselves remain operator-run and are not executed by validation. Local validation passed.
73. D-386 Shopier command governance added and validated. Telegram `/shopier publish` and `/shopier republish` no longer carry unreachable direct queue/update branches; they resolve the product and call the shared `queueShopierSync()` gate. `scripts/shopier-command-governance.ts` and `npm run test:shopier-commands` keep single-product publish/republish plus batch publish-ready/retry-errors on the shared Shopier/Web gate instead of route-level `shopier-sync` job writes. Local validation passed.
74. D-387 product loading plan added and validated locally. `src/lib/productLoadingPlan.ts`, Telegram `/loadplan [limit]` and `/loadingplan [limit]`, and `npm run test:loading-plan` combine Catalog QA and Category Fill into a read-only daily catalog loading/fix plan. It prioritizes brand-safety cleanup, Image QC, Shopier errors, category gaps, backlog finishing, completeness gaps, stale drafts, or live-smoke next steps. Full validation passed.
75. D-388 load-plan runtime smoke added and validated locally. `scripts/load-plan-runtime-smoke.ts` and `npm run smoke:load-plan:read -- --confirm-read-only` mirror `/loadplan` against real Payload products with `PAYLOAD_DB_PUSH=false` and no-write/no-publish/no-queue/no-provider/no-Shopier/no-SupplierScout/no-ad-spend guardrails. No live read-only run has been performed yet; full local validation passed.
76. D-389 operator live smoke plan added and validated locally. `src/lib/operatorSmokePlan.ts`, Telegram `/smokeplan`, and `npm run test:operator-smoke-plan` define the safe order for read-only repo smokes and Telegram reads before any queueing, publishing, redispatch, provider spend, Shopier API action, or ad work. `test:operator-smoke-plan`, source-pack governance, ops-runbook governance, retired-channel governance, typecheck, lint, `git diff --check`, and full `npm run validate` passed locally.
77. D-390 Hermes/Mentix live-smoke alignment added and validated locally. `mentix-intake` routes live-smoke planning requests to product-flow-debugger, product-flow-debugger tells the operator to run `/smokeplan` first, optional OpenClaw deployment notes stay verification-first, the installation matrix no longer claims the repo skill copy is proven-live on VPS, and the skill dashboard no longer presents n8n as the default product creation path. `test:mentix-skills`, `test:operator-smoke-plan`, and full `npm run validate` passed locally.
78. D-391 Shopier refund update traceability added and validated locally. `src/lib/shopierRefundLifecycle.ts`, `src/lib/shopierRefundLifecycle.test.ts`, and the Shopier webhook route now make `refund.updated` append an idempotent status note to the matching Payload order and emit `order.refund_updated` when possible. It does not change order status, restore stock a second time, call Shopier, dispatch channels, or spend on ads. `test:shopier-refund-lifecycle`, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally.
79. D-392 Shopier refund-request idempotency added and validated locally. The same `shopierRefundLifecycle` helper now records an idempotent `refund.requested` marker before stock restore, recognizes the legacy `Iade talebi:` marker, and returns `shouldRestoreStock=false` for duplicate or already-recorded refund requests. The Shopier webhook route restores stock only when that helper says this is the first request. `test:shopier-refund-lifecycle`, `test:shopier-order-stock`, `test:order-desk`, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
80. D-393 operator smoke-plan Shopier webhook preflight added and validated locally. New `npm run test:shopier-webhook-local` combines local Shopier order/refund stock reconciliation and refund lifecycle checks, and `/smokeplan` now places that preflight before `smoke:shopier:read`. `test:shopier-webhook-local`, `test:operator-smoke-plan`, `test:ops-runbook`, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
81. D-394 lead follow-up plan added and validated locally. `src/lib/leadFollowupPlan.ts`, Telegram `/leadplan`, Telegram `/followupplan`, and `npm run test:lead-followup-plan` prioritize open Payload leads by stale age/status/source and suggest existing manual lead commands only. It is read-only: no lead status write, no customer message, no ad action, no provider call, no Shopier call, no SupplierScout activation, and no retired-channel activation. `test:lead-followup-plan`, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
82. D-395 lead-followup runtime smoke added and validated locally. `scripts/lead-followup-runtime-smoke.ts` and `npm run smoke:lead-followup:read -- --confirm-read-only` mirror Telegram `/leadplan` and `/followupplan` against real Payload leads, print a PII-light summary, and refuse mutation/customer-message/provider/Shopier/ad/SupplierScout/retired-channel/schema-push paths. No-connect help, runtime-smoke governance, source-pack governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
83. D-396 operator smoke-plan lead-followup alignment added and validated locally. `/smokeplan` now runs `smoke:lead-followup:read` after business/funnel visibility and before Telegram `/leadplan`, then continues to the local Shopier webhook preflight and Shopier read-only runtime smoke. `test:operator-smoke-plan`, source-pack governance, retired-channel governance, runtime-smoke governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
84. D-397 local release candidate boundary added and governance-tested locally. `project-control/LOCAL_RELEASE_CANDIDATE.md` records the D-380-D-406 not-committed/not-deployed handoff boundary, active-channel and dormant-system invariants, latest validation boundary, 19-file source-pack count, and operator approval requirements before commit, PR, deploy, live smoke, Shopier/provider action, optional OpenClaw sync, or ad work. Covered by `test:local-release-candidate`, included in `test:safe`; focused governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
85. D-398 local PR review package added and governance-tested locally. `project-control/LOCAL_PR_REVIEW_PACKAGE.md` prepares the D-380-D-406 stack for human review with proposed PR title, scope summary, reviewer focus, validation commands, source-pack count, and explicit not-run/not-done guardrails. Covered by `test:local-pr-review`, included in `test:safe`; focused governance, release-candidate governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings.
86. D-399 loading-plan first product worklist added and validated locally. `src/lib/productLoadingPlan.ts` now adds a read-only `worklist` to `/loadplan`, and `scripts/load-plan-runtime-smoke.ts` prints the same worklist for `smoke:load-plan:read`, showing product ref, title, priority, reasons, and suggested existing manual command for the next catalog fixes. Covered by `test:loading-plan` and runtime-smoke governance; it performs no product writes, publishing, Shopier queueing, provider calls, SupplierScout activation, retired-channel activation, schema push, or ad spend.
87. D-400 Shopier dashboard batch review sample added and validated locally. `/shopier dashboard` now shows read-only ready/blocked/queued/synced sample rows built from the shared Shopier/Web evaluator, with product ref, detail/blocker, and suggested manual command. Covered by `test:shopier-publish-control`; release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings. It performs no publishing, Shopier queueing, Shopier API calls, provider calls, external dispatch, SupplierScout activation, retired-channel activation, or ad spend.
88. D-401 optional OpenClaw VPS verification guardrail added and validated locally. `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` defines the read-only evidence checklist before any optional OpenClaw skill copy, restart, or live prompt; `mentix-skills/INSTALLATION_MATRIX.md` now marks VPS state as `VERIFY ON VPS` unless current evidence exists; and standalone `test:openclaw-vps-verification` guards the verification-first rule. It performs no VPS command, sync, restart, live Telegram/OpenClaw prompt, provider call, Shopier call, queue write, SupplierScout activation, retired-channel activation, or ad action.
89. D-402 historical soak-script quarantine added and validated locally. `project-control/HISTORICAL_SOAK_SCRIPTS.md` documents `scripts/d*-soak*.ts` as historical live-data soak harnesses, not validation and not read-only runtime smokes. `test:soak-scripts` guards that they stay out of package scripts/default validation paths while `sessions`, `tmp`, `.next`, and old build output remain excluded from typecheck/lint defaults. `test:soak-scripts`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings. It performs no soak run, live data connection, write, provider call, Shopier call, queue write, SupplierScout activation, retired-channel activation, or ad action.
90. D-403 provider reality audit added and validated locally. `project-control/PROVIDER_REALITY_AUDIT.md` records that local env readiness is not production provider readiness for Website, Instagram, Facebook, X, Shopier, Gemini, Google Vision, DataForSEO, SerpAPI, reverse-search selection, and n8n fallback webhooks. `test:provider-reality` keeps this audit boundary aligned. `test:provider-reality`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, Product Intelligence provider-health, `typecheck`, `git diff --check`, and full `npm run validate` passed locally with lint at 0 errors / 70 warnings. It performs no env load, provider call, secret print, credit spend, queue write, publish, live Telegram action, Shopier action, SupplierScout activation, or retired-channel activation.
91. D-404 image regeneration plan added and validated locally. `src/lib/imageRegenerationPlan.ts`, Telegram `/imageplan <sn-or-id>`, Telegram `/regenplan <sn-or-id>`, and `npm run test:image-regeneration-plan` bridge product-level Image QC with recent `image-generation-jobs` state. `/smokeplan` includes the image-plan Telegram read after product-flow visibility. The plan suggests safe manual next commands for generation running, preview approval/regeneration, QC decision needed, REVIEW, FAIL, rejected visuals, and original-only products. It performs no product write, image-generation queue, provider/Gemini call, publish, dispatch, Shopier call, SupplierScout activation, retired-channel activation, or ad spend. `test:image-regeneration-plan`, `test:operator-smoke-plan`, release/PR/source-pack/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.
92. D-405 image-plan runtime smoke added and validated locally. `scripts/image-plan-runtime-smoke.ts` and `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` mirror Telegram `/imageplan` against one real Payload product plus recent `image-generation-jobs`, force `PAYLOAD_DB_PUSH=false`, and refuse mutation, queue, publish, dispatch, provider, Shopier, SupplierScout, retired-channel, spend, or schema-push paths. `/smokeplan` now places this repo smoke before Telegram `/imageplan`. No-connect help, runtime-smoke governance, operator-smoke-plan, release/PR/source-pack/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.
93. D-406 Shopier runtime-smoke batch review alignment added and validated locally. `scripts/shopier-operator-smoke.ts` now passes `buildShopierDashboardReviewRows()` output to `formatShopierOperatorDashboard()`, so `npm run smoke:shopier:read -- --confirm-read-only` mirrors Telegram `/shopier dashboard` batch review sample rows. `test:runtime-smokes` now guards the script-level review-row alignment. Runtime-smoke, source-pack, release/PR/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate` passed locally.
94. D-422 product-flow operator checklist added and validated locally. `src/lib/productFlowSnapshot.ts`, Telegram `/productflow`, Telegram `/flow`, and `scripts/product-flow-runtime-smoke.ts` now include a read-only operator checklist for Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant. `test:product-flow-snapshot` covers incomplete-draft command guidance and ready activation handoff. It performs no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
95. D-423 product-flow checklist dependency ordering added and validated locally. The same helper now avoids out-of-order next commands: incomplete drafts point content/audit back to `/confirm`, confirmed products with pending content point audit to `/content <ref> trigger`, and failed content points audit to `/content <ref> retry`. `test:product-flow-snapshot` covers all three cases. It performs no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
96. D-424 product-flow primary operator step added and validated locally. Product Flow Snapshot now derives `primaryOperatorStep` from the ordered checklist and surfaces it in Telegram `/productflow`, Telegram `/flow`, and `smoke:product-flow:read`, so operators and Hermes/Mentix can see the single next command/manual step before scanning the full checklist. `test:product-flow-snapshot` covers activation, incomplete draft, content trigger/retry, Shopier handoff, and formatter output. It performs no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
97. D-425 load-plan product-flow handoff added and validated locally. Product Loading Plan worklist rows now include `flowCommand`, and `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` show `/productflow <ref>` beside each suggested action, so daily catalog loading flows through the D-424 primary operator step before manual follow-up. `test:loading-plan` covers the data shape and formatter output. It performs no product write, queue job, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
98. D-426 operator smoke-plan load-plan handoff alignment added and validated locally. `/smokeplan` now runs the worklist-selected `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` checks immediately after repo/Telegram `/loadplan`, before provider diagnostics, so the D-425 flow handoff is the first live-smoke product preflight. `test:operator-smoke-plan` covers the order and formatter wording. It performs no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
99. D-427 load-plan runtime product-flow handoff added and validated locally. Product Loading Plan worklist rows now include `runtimeFlowCommand`, and `/loadplan`, `/loadingplan`, plus `smoke:load-plan:read` show the exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight beside Telegram `/productflow <ref>`, so repo and Telegram checks use the same selected product. `test:loading-plan` and `test:runtime-smokes` cover the shape, formatter, and runtime smoke surface. It performs no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
100. D-428 Shopier dashboard product-flow handoff added and validated locally. `/shopier dashboard` and `smoke:shopier:read` batch review rows now include `flowCommand` and `runtimeFlowCommand`, so each ready/blocked/queued/synced sample row shows `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` beside the existing next action before Shopier queue decisions. `test:shopier-publish-control` covers the shape and formatter; `test:runtime-smokes` guards the runtime smoke alignment. Focused Shopier/runtime/source/release/PR checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
101. D-429 Shopier preview product-flow handoff added and validated locally. `/shopier publish-ready` and `/shopier retry-errors` preview rows now show `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` before the operator runs a confirm command. Telegram previews can render without `SHOPIER_PAT`; only `/shopier publish-ready confirm` and `/shopier retry-errors confirm` remain blocked when `SHOPIER_PAT` is missing. `test:shopier-publish-control` covers preview handoffs and confirmed-output behavior; `test:shopier-commands` covers the confirm-only PAT guard. Focused Shopier/source/release/PR/runtime checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, queue job outside explicit confirm, publish, redispatch, provider call, direct Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
102. D-430 operator smoke-plan Shopier handoff alignment added and validated locally. `/smokeplan` now includes a dedicated operator hold after Shopier dashboard/publish-ready/error/retry preview reads, telling operators to use row-provided `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action. `test:operator-smoke-plan` covers the order, formatter wording, and absence of unsafe queue/publish/redispatch/ad commands. Focused operator-smoke-plan/source/release/PR/runtime checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
103. D-431 operator smoke-plan Shopier credential hold added and validated locally. `/smokeplan` now includes a dedicated operator hold after Shopier row product-flow handoffs and before final queue approval, telling operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action. `test:operator-smoke-plan` covers the order, formatter wording, and absence of unsafe queue/publish/redispatch/ad commands. Focused operator-smoke-plan/source/release/PR/runtime checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no secret read, product write, queue job, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad spend.
104. D-432 operator smoke-plan manual ad preflight alignment added and validated locally. `/smokeplan` now runs `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` after lead visibility and before Shopier queue preflights. `test:operator-smoke-plan` covers the order, formatter wording, read-only/no-launch wording, and absence of unsafe queue/publish/redispatch/ad commands including `/adpack`. Focused operator-smoke-plan/source/release/PR checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
105. D-433 operator smoke-plan storefront trust preflight added and validated locally. `/smokeplan` now runs `npm run test:storefront-trust` after lead visibility and before `smoke:ad-readiness:read`, so fake-review and placeholder-testimonial guardrails run before paid-traffic readiness. `test:operator-smoke-plan` covers the ordering and formatter wording; `test:storefront-trust` covers no fake review cards, removed placeholder testimonial copy, and honest trust-section presence. Focused operator-smoke-plan/storefront-trust/source/release/PR checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
106. D-434 operator smoke-plan inquiry guard preflight added locally. `/smokeplan` now runs `npm run test:inquiry-guard` after `npm run test:storefront-trust` and before `smoke:ad-readiness:read`, so honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback checks run before paid-traffic readiness. `test:operator-smoke-plan` covers the ordering and formatter wording; `test:inquiry-guard` covers the lead-form protection behavior. Focused operator-smoke-plan/inquiry-guard/source/release/PR checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
107. D-435 operator smoke-plan attribution preflight added locally. `/smokeplan` now runs `npm run test:attribution` after `npm run test:inquiry-guard` and before `smoke:ad-readiness:read`, so first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge checks run before paid-traffic readiness. `test:operator-smoke-plan` covers the ordering and formatter wording; `test:attribution` covers attribution behavior. Focused operator-smoke-plan/attribution/source/release/PR checks, `typecheck`, `lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
108. D-436 operator smoke-plan sitemap preflight added locally. `/smokeplan` now runs `npm run test:sitemap-entries` after `npm run test:attribution` and before `smoke:ad-readiness:read`, so static routes plus website-visible product and blog sitemap entries/degrade-safe behavior are checked before paid-traffic readiness. `test:operator-smoke-plan` covers the ordering and formatter wording; `test:sitemap-entries` covers sitemap behavior. `npm run test:operator-smoke-plan`, `npm run test:sitemap-entries`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
109. D-437 operator smoke-plan Telegram access preflight added locally. `/smokeplan` now runs `npm run test:telegram-access` after `smoke:load-plan:read` and before the first Telegram `/loadplan` read, so private Telegram DM allowlist behavior is checked before live Telegram operator reads. `test:operator-smoke-plan` covers the ordering before any `telegram_read` step; `test:telegram-access` covers allowlist/denial behavior. `npm run test:operator-smoke-plan`, `npm run test:telegram-access`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, lead/order mutation, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
110. D-438 Product Flow Snapshot operator links added locally. `/productflow`, `/flow`, and `smoke:product-flow:read` now show Payload admin links for products with ids and public PDP links only for products with slugs plus public status, so operators can jump to the right surface without implying draft products are public. `test:product-flow-snapshot` covers draft/admin-link behavior, active/PDP-link behavior, and formatter output. `npm run test:product-flow-snapshot`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
111. D-439 loading-plan worklist operator links added locally. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` first product worklist rows now show Payload admin links for products with ids and public PDP links only for products with slugs plus public status, so catalog loading candidates can be opened directly without implying draft products are public. `test:loading-plan` covers draft/admin-link behavior, active/PDP-link behavior, formatter output, and runtime-smoke link shape. `npm run test:loading-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, queue job, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
112. D-440 Shopier preview/dashboard operator links added locally. `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows now show Payload admin links for products with ids and public PDP links only for products with slugs plus public status, so Shopier queue candidates can be opened directly without implying draft products are public. Confirmed queue/retry output stays free of preview-only links. `test:shopier-publish-control` covers ready link behavior, draft/admin-only behavior, preview links, retry links, dashboard review-row links, and confirmed-output suppression. `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no direct Shopier call, provider call, publish, redispatch, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
113. D-441 Shopier preview credential holds added locally. `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview rows now show whether `SHOPIER_PAT` is configured before confirm commands. Missing credentials keep preview available but tell the operator to configure `SHOPIER_PAT`; configured credentials still tell the operator to verify webhook/account/quota outside chat before confirm. Confirmed queue/retry output stays free of preview-only credential hints and existing confirm gates remain. `test:shopier-publish-control` covers missing/available credential hints for publish and retry previews plus confirmed-output suppression. `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no secret print, direct Shopier call, provider call, publish, redispatch, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
114. D-442 lead follow-up operator links added locally. `/leadplan`, `/followupplan`, and `smoke:lead-followup:read` rows now show direct Payload lead-admin links, related product-admin links when available, and public PDP links only when the related product has a slug plus public status. `test:lead-followup-plan` covers link construction, public-status PDP gating, and formatter output. `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no lead write, customer message, job queue, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
115. D-443 operator inbox product links added locally. `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` product rows now show Payload admin links plus public PDP links only for products with public status. `test:operator-inbox` covers public product links, draft admin-only links, stock/failed/today formatter reuse, and absence of unsafe action commands, and is included in `test:safe`. `npm run test:operator-inbox`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no product write, activation, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
116. D-444 lead desk operator links added locally. `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts now show direct Payload lead-admin links, related product-admin links when available, and public PDP links only when the related product has a slug plus public status. `test:lead-desk` covers public product links, draft admin-only links, list/card/alert formatter output, and absence of unsafe action commands, and is included in `test:safe`. `npm run test:lead-desk`, `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no lead write, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.

117. D-445 order desk operator links added locally. `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts now show direct Payload order-admin links, related product-admin and lead-admin links when available, and public PDP links only when the related product has a slug plus public status. `test:order-desk` covers public product links, draft admin-only links, list/card/alert formatter output, absence of unsafe action commands, and the existing order lifecycle policy checks. `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate` passed locally. It performs no order status write, stock restore, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.

118. D-446 business snapshot next-action hints added locally. `/business` now adds `Next safe reads` when Payload urgency counts imply follow-up: `/leadplan` for open/stale leads, `/orderreminders` for stale shipped orders, `/orders` for open order queue review, and `/inbox stock` for sold-out/low-stock products. `test:business-desk` covers the hints and absence of unsafe Shopier confirm/ad launch commands. Validation passed locally: `npm run test:business-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no lead/order/product write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.

119. D-447 funnel snapshot next-action hints added locally. `/funnel` now adds `Next safe reads` when Payload funnel evidence implies follow-up: `/leadplan` for open funnel leads, `/orders` for converted/direct order review, and `/adreport week` for UTM-attributed campaign review. `test:funnel-desk` covers the hints and absence of unsafe Shopier confirm/ad launch commands. Validation passed locally: `npm run test:funnel-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no lead/order/product write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.

120. D-448 ad-readiness next-action hints added locally. `/adready` now adds `Next safe reads` when manual ad readiness implies follow-up: `/productflow <ref>` for blockers, `/imageplan <ref>` for media/Image QC concerns, and read-only `/adpack <ref> manual_ads` plus `/adreport week` for review/ready products. `test:ad-readiness` covers the hints and absence of unsafe Shopier confirm/ad launch commands. Validation passed locally: `npm run test:ad-readiness`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
121. D-449 operator smoke-plan latest-boundary label added locally. `/smokeplan` rendered `Operator Live Smoke Plan (D-389/D-449)` so the operator-facing live-smoke checklist reflected the D-448 ad-readiness next-read guidance and local handoff boundary at that point. D-452 now advances the rendered title to `Operator Live Smoke Plan (D-389/D-452)`.
122. D-450 retired-channel memory-lock guardrail added locally. `test:retired-channels` now checks `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md`, requiring the session-start handoff files to keep active channels as Website/Instagram/Facebook/X/Shopier and Dolap/Threads retired. It blocks Memory Lock wording that describes Dolap/Threads as scaffolded, planned, active, future development, or remaining-channel work. Validation passed locally: `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no runtime behavior change, product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
123. D-451 PDP conversion trust guardrail added locally. `test:storefront-trust` now also checks `src/app/(app)/products/[slug]/page.tsx` for buyer-facing PDP essentials before paid traffic: draft products stay hidden, `ProductImages` remains mounted, size/stock clarity stays variant-backed through `SizeChip` and `OOSChip`, `ContactForm` keeps product/sold-out context, WhatsApp and Shopier CTAs stay present and safely gated, process FAQ fallback remains, and similar products stay active-status plus merchandising gated. Validation passed locally: `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no build, DB read, network call, product write, lead write, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

124. D-452 ad-readiness storefront trust hint added locally. `/adready` now points review/ready products to `npm run test:storefront-trust` before `/adpack <ref> manual_ads` and `/adreport week`, so D-451 storefront/PDP conversion guardrails stay visible at the manual paid-traffic decision point. Blocked products still point to `/productflow <ref>` and `/imageplan <ref>` diagnostics first. `/smokeplan` now renders `Operator Live Smoke Plan (D-389/D-452)`. Validation passed locally: `npm run test:ad-readiness`, `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

125. D-453 source-pack latest-boundary guardrail added locally. `test:source-pack` now requires these source-pack notes to carry D-453 as the latest local boundary, retain the actual `/smokeplan` title boundary as `Operator Live Smoke Plan (D-389/D-452)`, describe the D-380-D-406 plus D-422-D-453 release/PR stack, and reject stale current-D-449 or D-422-D-451 stack wording. Validation passed locally: `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no runtime behavior change, product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

126. D-454 loading-plan batch summary added locally. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show a batch summary derived from the first product worklist: candidate count, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first exact repo-side product-flow smoke command. Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

127. D-455 loading-plan batch focus added locally. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show a deterministic batch focus derived from the first product worklist: bottleneck kind, operator label, reason, and next safe read. It points the operator toward brand safety, Image QC, Shopier error triage, core product fields, stale drafts, category backlog, or `/smokeplan` when no product-specific blocker exists. Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

128. D-456 loading-plan focus queue added locally. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show focus refs and a short focus queue of matching safe read commands for the D-455 bottleneck, so operators can act on the top affected products without guessing which worklist rows match the focus. Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

129. D-457 loading-plan focus details added locally. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show reason details beside each focus-queue command, so operators can see why each queued product matches the D-455/D-456 focus without cross-referencing the full worklist. Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

130. D-458 product-flow checklist summary added locally. `/productflow`, `/flow`, and `smoke:product-flow:read` now show done/next/blocked/needs-work checklist counts before the full staged checklist, so operators can scan product-flow progress faster. Validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
131. D-459 product-flow dispatch summary added locally. `/productflow`, `/flow`, and `smoke:product-flow:read` now show active-channel published/queued/failed/blocked/not-configured/unrecorded dispatch counts before the full dispatch rows, so operators can scan publishing health faster. Validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. It performs no product/lead/order write, stock change, customer message, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.

132. D-460 product-flow dispatch recovery paths added locally. `/productflow`, `/flow`, and `smoke:product-flow:read` now show a deterministic next operator action beside each non-published active-channel dispatch row, so a state/reason never has to be manually matched to a separate generic action list. Queued Shopier points to `/shopier dashboard`, ready-but-unrecorded Shopier points to shared `/shopier publish <ref>`, and failed redispatchable channels only suggest retry after the recorded cause is fixed. It remains read-only: the snapshot does not write, queue, publish, redispatch, call providers or Shopier, activate SupplierScout, revive retired channels, sync optional OpenClaw, or spend on ads.

133. D-461 control-truth Memory Lock reconciliation added locally. Both session-start Memory Lock files now name Payload/Next as the current execution layer, Hermes as current agent control, OpenClaw as optional/history, n8n as optional glue with direct Payload/Next as default, and SupplierScout as dormant. `test:retired-channels` rejects the stale live Telegram-to-OpenClaw-to-n8n-to-Payload claim, while `test:n8n-optional` and `test:mentix-skills` cover the adjacent architecture boundaries. No live service or external action was run.

134. D-462 BlogPosts featured-image schema drift repair is applied to the configured database. `npm run build` had exposed that `BlogPosts.featuredImage -> media` expected `blog_posts.featured_image_id`; the approved 2026-07-24 additive migration created that nullable integer column, its exact `ON DELETE SET NULL` media foreign key, and supporting index. The post-apply metadata preflight and next build pass. `db:blog-featured-image:apply` remains dry-run by default; explicit operator approval is still required before confirmed apply mode in another environment.

135. D-463 Mentix skill runtime-truth reconciliation added locally. The repo skill library, OpenClaw activation template, and dashboard now state Hermes/Mentix is current, OpenClaw is historical/optional, and Payload/Next remains the execution/source-of-truth layer. Skills are advisory/draft/read-only support; durable PII-light decisions go to `project-control/` plus the relevant source-pack file. No VPS sync, restart, or live OpenClaw prompt has run. Mentix/VPS, source/release/PR, retired-channel, n8n, ops, typecheck, lint, `git diff --check`, and full `npm run validate` pass locally with 0 lint errors / 71 warnings.

136. D-464 homepage merchandising rail wiring added locally. The homepage now carries server-resolved Editor Picks, Best Sellers, Deals, and Discounts memberships into their matching rendered rails. `test:merchandising` covers the pure eligibility/selection/order/toggle logic; `test:homepage-merchandising` keeps the server-to-client handoff from falling back to arbitrary catalog order. Full `npm run validate` and `git diff --check` pass locally with 0 lint errors / 70 warnings. No Payload access, external publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad action was run.

137. D-465 Obsidian control-center alignment added locally. The root vault notes `00_HOME.md` through `04_ACTIVE_DECISIONS.md` were refreshed from their stale June/OpenClaw-current wording into a compact current control center. `test:obsidian-control` now guards their Payload/Next, Hermes/Mentix, optional OpenClaw/n8n, own-products-only, channel, SupplierScout, roadmap, and approval-gate truth. `test:story-dispatch` was restored to `test:safe` so story brand-safety coverage cannot silently drop from baseline validation. Full `npm run validate` and `git diff --check` pass locally with 0 lint errors / 70 warnings. No Payload access, provider call, Shopier action, n8n run, OpenClaw sync, deployment, or ad action was run.

## Immediate Next Focus: Catalog Scale-Up

Current local lint signal: 0 errors / 0 warnings after a post-D-465 cleanup of unused local bindings, stale lint disables, stale dispatch-preview bindings, dead category-shell code, the retired per-color image engine, Blog/PDP image elements, configured legacy-shell product media, duplicate page-level font loading, and the unused direct Shopier-publish helper. Explicit data/blob image fallbacks remain where `next/image` cannot process the source, and shared fonts now load once in the App Router layout. The guarded Payload job path is now the only supported Shopier publishing route. The separately approved D-462 migration remains the only database-state change in this work session; D-466's confirmed runtime diagnostic read the catalog without mutations, and D-467 closes the manual protected-brand activation bypass without changing catalog records.

Latest local boundary: D-470. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show a batch summary, batch focus, focus refs, focus queue, and focus reason details before product rows, while `/productflow`, `/flow`, and `smoke:product-flow:read` now show checklist-summary counts before the full staged checklist, dispatch-summary counts before full dispatch rows, row-level recovery paths beside non-published channel states, and D-470's numeric `commandRef` for reliable ID-only action handoffs. D-461 makes the session-start Memory Lock agree with the current Hermes/Payload/optional-OpenClaw/optional-n8n architecture; D-463 carries the same runtime truth into all repo-side Mentix skills, their activation template, and dashboard. D-464 ensures homepage Editor Picks, Best Sellers, Deals, and Discounts consume those server-selected memberships instead of arbitrary catalog order. D-465 brings the root Obsidian control center into the same current truth and restores story-dispatch brand-safety coverage to `test:safe`. D-466 adds `/brandplan` plus `smoke:brand-safety:read`, turning the live protected-brand backlog into a manual provenance queue with severity/brand/field evidence and product-flow handoffs, never automatic rewriting or publication. D-467 makes that safety gate unconditional: manual Publish Desk review override cannot activate a protected-brand product, and the Payload activation hook rejects the same attempted bypass. D-468 adds `test:product-workflow`, an in-memory clean-own-product regression path from active-channel target normalization through publish-ready activation defaults, while retaining the protected-brand refusal. D-469 pins Turbopack workspace discovery to this repository so local production builds no longer infer the unrelated parent lockfile. D-470 ensures Product Flow action commands use numeric Payload IDs even when the diagnostic is opened by stock number. D-462's separately approved 2026-07-24 migration created the intended BlogPosts relationship column, exact `ON DELETE SET NULL` foreign key, and index in the configured database; its post-apply check and next build pass, while the dry-run-first helper continues to refuse incompatible IDs or conflicting foreign-key semantics in future environments. Source-pack governance keeps the actual `/smokeplan` title boundary at `Operator Live Smoke Plan (D-389/D-452)` and rejects stale current-D-449 wording plus older current-stack wording. `/adready` review/ready output points to `npm run test:storefront-trust` before `/adpack` or manual paid traffic, and blocked products still point to `/productflow` and `/imageplan` first. The local release/PR handoff boundary is now D-380-D-406 plus D-422-D-470. D-470 focused product-flow/runtime-smoke checks and full `npm run validate` pass. No commit, deploy, live Telegram, Shopier, provider, OpenClaw sync, SupplierScout, retired-channel, or ad action was performed.

D-355 schema drift is no longer the active blocker: `npm run smoke:imageqc:schema -- --confirm-read-only` passes as of 2026-07-02. Phase 7 now has local operator order-lifecycle proof through `test:order-desk`, D-445 shared order desk links in `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts, D-446 `/business` safe next-read hints, D-447 `/funnel` safe next-read hints, Shopier `order.fulfilled` lifecycle unification through the same helper, Shopier order/refund stock reconciliation proof through `test:shopier-order-stock`, refund webhook idempotency proof through `test:shopier-refund-lifecycle`, a combined local preflight at `npm run test:shopier-webhook-local`, read-only lead prioritization through `/leadplan`, D-442 direct lead/product operator links in `/leadplan`, `/followupplan`, and `smoke:lead-followup:read`, and D-444 shared lead desk links in `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts. Phase 8 now has D-448/D-452 `/adready` safe next-read hints before any manual paid-traffic decision, including `npm run test:storefront-trust` for review/ready products before `/adpack` or manual paid traffic, and D-452 makes `/smokeplan` render the current `Operator Live Smoke Plan (D-389/D-452)` title. D-450 extends retired-channel governance to Memory Lock handoff files so future sessions cannot inherit old Dolap/Threads scaffold/planned truth. D-451 extends storefront trust governance to public PDP conversion essentials so paid-traffic prep cannot silently lose the gallery, size/stock clarity, lead form context, WhatsApp CTA, Shopier CTA, FAQ fallback, draft hiding, or safe similar-products gate. D-397/D-406 plus D-422-D-459 now give the local release/PR handoff one boundary at `project-control/LOCAL_RELEASE_CANDIDATE.md` plus review notes at `project-control/LOCAL_PR_REVIEW_PACKAGE.md`; keep both current before asking Claude/Codex to commit, PR, deploy, run live smokes, or reactivate/sync OpenClaw. Live webhook smoke still requires configured Shopier credentials/webhooks and operator approval. Runtime smoke inventory is now guarded by `test:runtime-smokes`, while D-402 keeps old live-data soak scripts quarantined behind `test:soak-scripts`, D-403 keeps provider reality audit guidance behind `test:provider-reality`, D-404 keeps image-regeneration guidance behind `test:image-regeneration-plan`, D-405 adds repo-side `smoke:image-plan:read` before live Telegram `/imageplan`, D-406 aligns `smoke:shopier:read` with `/shopier dashboard` batch review rows, D-422 makes `/productflow` plus `smoke:product-flow:read` show the staged operator checklist for the next missing product-flow step, D-423 makes that checklist dependency-aware before content/audit suggestions, D-424 adds the single primary operator step before the full checklist, D-458 adds checklist-summary counts before the full Product Flow Snapshot checklist, D-459 adds dispatch-summary counts before the full Product Flow Snapshot dispatch rows, D-438 adds admin/PDP operator links to the same Product Flow Snapshot while keeping public PDP links limited to public product statuses, D-443 extends the same admin/PDP link discipline to `/inbox` product rows, D-425 makes `/loadplan` worklist rows point to `/productflow <ref>` before manual fixes, D-439 adds admin/PDP operator links to those loading-plan worklist rows with the same public-status rule, D-426 makes `/smokeplan` consume that handoff before provider diagnostics, D-427 prints the exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` command in the same worklist, D-428 adds the same product-flow handoffs to `/shopier dashboard` plus `smoke:shopier:read` batch review rows, D-429 adds product-flow handoffs to `/shopier publish-ready` plus `/shopier retry-errors` preview rows while keeping confirm credential-gated, D-440 adds admin/PDP operator links to Shopier dashboard/publish-ready/retry preview rows with the same public-status rule, D-441 adds preview credential holds to publish-ready/retry previews and `smoke:shopier:read` before confirm commands, D-430 makes `/smokeplan` pause on those Shopier row handoffs before any Shopier confirm action, D-431 makes `/smokeplan` pause again for `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness verification outside chat before final queue approval, D-432 adds read-only ad readiness plus ad-performance preflights before Shopier queue checks, D-433/D-451 add storefront trust and PDP conversion preflight coverage before ad readiness, D-452 makes the same trust check visible inside `/adready` review/ready output, D-434 adds inquiry guard preflight between storefront trust and ad readiness, D-435 adds attribution preflight between inquiry guard and ad readiness, D-436 adds sitemap preflight between attribution and ad readiness, and D-437 adds Telegram access preflight before any live Telegram read. The live smoke commands remain operator-run. Use `/smokeplan` as the operator checklist: run `smoke:load-plan:read`, then D-437 `test:telegram-access`, then `/loadplan`, use the D-427 first product worklist command for the next `smoke:product-flow:read` and Telegram `/productflow`, then run `smoke:image-plan:read`, `/imageplan`, and only then continue `/diagnostics`, `/business`, `/funnel`, `smoke:lead-followup:read`, `/leadplan`, D-433/D-451 `test:storefront-trust`, D-434 `test:inquiry-guard`, D-435 `test:attribution`, D-436 `test:sitemap-entries`, D-432 `smoke:ad-readiness:read`, `/adready`, D-452 `/adready` storefront-trust hint for review/ready products, `smoke:ad-performance:read`, `/adreport week`, then `smoke:shopier:read` and Shopier dashboard/publish-ready/errors/retry previews with the operator present, using the D-428/D-429 dashboard and preview row handoffs before queue/retry decisions, following the D-430 `/smokeplan` handoff hold, and following the D-431 credential/webhook hold before any confirm action. D-400 makes `/shopier dashboard` more useful before live queueing by showing sample ready/blocked/queued/synced products and suggested manual follow-up commands, D-406 makes the repo-side Shopier smoke print the same review rows, D-428 makes those rows point to both Telegram and repo-side product-flow preflights, D-429 applies the same preflight discipline to publish/retry previews, D-430 makes that discipline explicit in the live-smoke checklist, D-431 makes credential/webhook readiness explicit before queue approval, D-432 makes manual ad readiness/performance evidence explicit without launching ads, D-433/D-451 make storefront trust and PDP conversion explicit before ad readiness, D-452 makes the same trust guard explicit inside `/adready` before `/adpack`, D-434 makes inquiry guard explicit before ad readiness, D-435 makes attribution explicit before ad readiness, D-436 makes sitemap coverage explicit before ad readiness, and D-437 makes Telegram access explicit before live Telegram reads. D-438 makes product-flow snapshots faster to act on by adding the admin/PDP links without writing or checking URLs; D-459 now makes product-flow snapshots faster to scan by adding active-channel dispatch counts before rows; D-443 does the same for `/inbox` product rows; D-439 does the same for loading-plan worklist rows; D-454 adds the loading-plan batch summary for candidate counts, blocker totals, and the first safe command; D-455 adds the loading-plan batch focus for the safe bottleneck label, reason, and next safe read; D-456 adds focus refs and matching safe-read commands for the chosen bottleneck; D-457 adds reason details beside each focus-queue command so the operator sees why each top product appears; D-440 extends the same link discipline to Shopier preview/dashboard review rows while keeping confirmed queue/retry output free of preview-only links; D-441 adds credential readiness to Shopier previews without blocking preview or printing secrets; D-442 extends the same operator-link discipline to lead follow-up rows without lead writes or customer messages; D-444 extends it to lead desk rows/cards/alerts without lead writes or customer messages; D-445 extends it to order desk rows/cards/alerts without order writes, stock restores, or customer messages; D-446 extends business urgency output with safe next-read hints without writes or unsafe actions; D-447 extends funnel source/UTM output with safe next-read hints without writes or unsafe actions; D-448/D-452 extend ad-readiness output with safe next-read/check/copy-draft hints without writes or unsafe actions. D-401 keeps optional OpenClaw VPS sync verification-first through `OPENCLAW_VPS_VERIFICATION.md`; do not claim skills are deployed on VPS until OpenClaw is explicitly reactivated and directory, log, and read-only Telegram prompt evidence is recorded. D-403 adds `project-control/PROVIDER_REALITY_AUDIT.md`; do not claim production provider readiness from local env checks alone. D-404 adds `/imageplan` and `/regenplan`; use them to decide whether to approve, fail, regenerate, or inspect product flow before running any live image-generation command. D-405 adds `smoke:image-plan:read`; use it before live `/imageplan` when repo-side Payload evidence is needed. Product `359` currently needs generated-image QC review before full readiness, and X dispatch has a credits-depleted failure. Channel provider-health smoke currently shows Website ready, Instagram disabled in AutomationSettings, Facebook missing Page ID/webhook, X missing OAuth/webhook, and Shopier missing `SHOPIER_PAT`/webhook. PI provider-health smoke currently shows Gemini text/image ready but no reverse-search provider selectable because Google Vision, DataForSEO, and SerpAPI credentials are missing locally; run it before `#geohazirla` or comparison/GEO work to confirm local provider availability without spending credits, but production provider reality still requires operator-recorded production env/account/quota/permission evidence. Shopier read-only smoke found no current sync errors or retry candidates, but `SHOPIER_PAT` is not configured in the current smoke environment, so do not queue Shopier jobs until credentials and operator approval are confirmed. Business/funnel read-only smoke currently shows 6 open leads, 5 stale leads, 1 sold-out product, no open orders, and a 7-day website funnel count of 2 leads; use `smoke:lead-followup:read` and `/leadplan` to prioritize stale/open leads before campaign work. Ads stay paused until D-380+, but use `test:telegram-access`, D-433/D-451 `test:storefront-trust`, `test:inquiry-guard`, `test:attribution`, `test:sitemap-entries`, `smoke:ad-readiness:read`, `/adready`, D-452 `/adready` storefront-trust hints, `/adreport`, and `smoke:ad-performance:read` before considering or evaluating any manual paid traffic.

### D-471 Public Storefront Safety Gate Update

Latest local boundary: D-471.

The current local boundary supersedes the prior D-470 handoff note above. The local release/PR range is `D-380-D-406 plus D-422-D-471`. D-471 rejects placeholder intake/test titles and protected-brand matches before the public homepage, related-product cards, direct PDP rendering/metadata, and sitemap product URLs. It is deliberately a display/indexing guard for legacy active records: it does not rewrite, retire, activate, publish, dispatch, call providers or Shopier, spend on ads, or alter Payload data. Focused `test:merchandising`, `test:storefront-trust`, homepage-merchandising, typecheck, lint, and diff checks pass locally; full validation/build pass. A fresh local production-server smoke showed no placeholder cards, a normal PDP `200`, a placeholder PDP `404`, and a sitemap without the placeholder slug while retaining a safe product URL.

### D-472 Verified Storefront Metrics Gate Update

Latest local boundary: D-472.

The current local boundary supersedes the D-471 handoff note above. The local release/PR range is `D-380-D-406 plus D-422-D-472`. D-472 removes the `500+`, `200+`, and `%98` homepage fallback claims. Trust metrics stay hidden until an operator enters all three verified values and explicitly enables the Site Settings switch; the entire metrics panel is omitted otherwise. It is a display guard only: it does not calculate metrics, update Payload, contact providers, publish, dispatch, or spend. `test:storefront-trust`, typecheck, lint, diff checks, full `npm run validate`, and `npm run build` pass locally. A fresh production-server homepage response returned `200` and contained none of the legacy metric values, customer-metric label, or metrics-panel caption; the temporary server was stopped. The remaining evidence is operator verification of any figures before they are enabled, plus the existing deployed browser/mobile smoke.

### D-473 Product Flow Website Visibility Truth Update

Latest local boundary: D-473.

The current local boundary supersedes D-472 above. The local release/PR range is `D-380-D-406 plus D-422-D-473`. A read-only Product Flow check for `SN0077` exposed a diagnostic contradiction: a draft product was shown as Website-published. D-473 passes public status and shared storefront-safety eligibility into the Website dispatch row, overriding stale website notes when needed, and removes the Product Flow PDP link for unsafe products. Focused dispatch-status/product-flow tests, typecheck, lint, diff checks, full `npm run validate`, and `npm run build` pass locally. The repeat read-only smoke shows Website `Blocked`, `published 0/4`, and no public URL for `SN0077`. No product, queue, dispatch, provider, or Shopier action was performed.

### D-474 Safe Public PDP Link Policy Update

Latest local boundary: D-474.

The current local boundary supersedes D-473 above. The local release/PR range is `D-380-D-406 plus D-422-D-474`. `isPublicStorefrontProduct()` centralizes public lifecycle plus storefront-safety eligibility and is now used by the brand remediation plan, loading plan, Shopier preview/dashboard links, operator inbox, lead desk, order desk, and manual ad-readiness UTM examples. Admin links remain available, while a protected-brand or placeholder record receives no public PDP or UTM link because the public site intentionally hides it. Focused policy tests, full `npm run validate`, and `npm run build` pass locally. No product, queue, dispatch, provider, Shopier, or ad action was performed.

### D-475 Direct Telegram UTM Guard Update

Latest local boundary: D-475.

The current local boundary supersedes D-474 above. The local release/PR range is `D-380-D-406 plus D-422-D-475`. A follow-up audit found that direct `/utm` still constructed a link from a resolved slug without checking its customer-facing eligibility. It now uses `evaluateProductUtmEligibility()` before URL construction: the product needs a slug, active status, and the shared public storefront safety pass. `test:utm-builder` covers active/draft/protected-brand/placeholder/sold-out/slug-less cases; `test:utm-command` pins the Telegram wiring and no-write boundary. Focused tests, full `npm run validate`, and `npm run build` pass locally. No product, queue, dispatch, provider, Shopier, or ad action was performed.

### D-476 Catalog Risk-First Loading-Plan Update

Latest local boundary: D-476.

The current local boundary supersedes D-475 above. The local release/PR range is `D-380-D-406 plus D-422-D-476`. The general loading plan now shares the protected-brand remediation queue's exposure-first logic: active protected-brand products sort ahead of sold-out and draft protected-brand entries before secondary blocker count is considered. It also prints each worklist product's status. `test:loading-plan`, full `npm run validate`, and `npm run build` pass locally. No product, queue, dispatch, provider, Shopier, or ad action was performed.

### D-477 Protected-Brand Provenance Review Audit Update

Latest local boundary: D-477.

The current local boundary supersedes D-476 above. The local release/PR range is `D-380-D-406 plus D-422-D-477`. `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` is preview-first. Only its explicit `confirm` form creates one `brand_safety.provenance_reviewed` BotEvent for an incomplete protected-brand product. It never changes stored product data, clears the hard gate, activates, publishes, dispatches, queues Shopier, calls providers, or spends. `/brandplan` and `smoke:brand-safety:read` surface the latest valid review event read-only. Focused review/route/plan checks, full `npm run validate`, and `npm run build` pass locally. No live Telegram command or Payload write was run.

### D-478 Provenance Review Delivery Idempotency Update

Latest local boundary: D-478.

The current local boundary supersedes D-477 above. The local release/PR range is `D-380-D-406 plus D-422-D-478`. A confirmed `/brandreview` now stores an opaque Telegram delivery key in the evidence event. Replaying that same Telegram update returns the original decision rather than creating a duplicate audit event. It does not update the product, weaken the protected-brand gate, activate, publish, dispatch, queue Shopier, call providers, or spend. Focused duplicate-delivery/route/plan checks, full `npm run validate`, and `npm run build` pass locally. No live Telegram command or Payload write was run.

### D-479 Blog Editorial Preflight Update

Latest local boundary: D-479.

The current local boundary supersedes D-478 above. The local release/PR range is `D-380-D-406 plus D-422-D-479`. Shared Blog preflight now blocks incomplete or placeholder posts on their first transition to `published`, sets `publishedAt` for a valid first publication, and preserves legacy published edits. AI-authored or evidence-sensitive copy is surfaced for manual claim review rather than auto-published. `/blogpreflight <id-or-slug>` and `smoke:blog-preflight:read` are read-only diagnostics; evaluator/collection/command checks, full `npm run validate`, and `npm run build` pass locally. No live Telegram command, Payload write, publication, provider call, or spend was run.

### D-480 Shopier Webhook Authenticity Update

Latest local boundary: D-480.

The current local boundary supersedes D-479 above. The local release/PR range is `D-380-D-406 plus D-422-D-480`. The inbound Shopier route now verifies the existing documented HMAC-SHA256 signature over the exact raw request body with constant-time comparison and comma-separated token rotation support. Missing `SHOPIER_WEBHOOK_TOKEN` fails closed with `503`; missing, malformed, or invalid signatures return `401` before JSON parsing, order writes, stock/refund changes, or Telegram notification. Security/lifecycle checks, full `npm run validate`, and `npm run build` pass locally. No live Shopier webhook, API call, Payload write, or deployment was run.

### D-481 Shopier Order-ID Duplicate-Safety Guard Update

Latest local boundary: D-481.

The current local boundary supersedes D-480 above. The local release/PR range
is `D-380-D-406 plus D-422-D-481`. `Orders.shopierOrderId` now declares
uniqueness, and the inbound Shopier route handles PostgreSQL duplicate-key
creation as an idempotent delivery before stock mutation or Telegram
notification. The reviewed partial unique index only covers non-empty external
IDs. Its dry-run completed without a database connection, and the subsequently
approved apply is now post-apply verified in the configured database. Do not
infer permission for a live webhook, Shopier API call, Payload write, or
deployment from that schema evidence.

### D-482 Shopier Order Transaction Boundary Update

Latest local boundary: D-482.

The current local boundary supersedes D-481 above. The local release/PR range
is `D-380-D-406 plus D-422-D-482`. `order.created` now wraps the local Order
create, product/variant stock decrement, and InventoryLog writes in one Payload
transaction request. It fails closed when no transaction can begin. A verified
processing failure returns `500` to preserve Shopier retry, and the direct
Telegram alert runs only after commit; the generic Orders alert hook skips
Shopier to prevent an early or duplicate notification. Focused transaction,
stock, idempotency, and webhook-local checks plus full `npm run validate` and
`npm run build` pass. No database metadata read, DDL, live Shopier webhook/API
call, Payload write, provider call, external dispatch, or deployment was
performed. Since that local boundary, D-481's reviewed index has been applied
and post-apply verified in the configured database; live webhook evidence is
still pending.

### D-483 Non-Shopier Order Stock Transaction Boundary Update

Latest local boundary: D-483.

The current local boundary supersedes D-482 above. The local release/PR range
is `D-380-D-406 plus D-422-D-483`. Website, phone, Instagram, and other
non-Shopier Order creates now run product/variant stock plus InventoryLog work
before the generic new-order alert under the parent Payload request. Missing
product/size, unknown variant, and insufficient-stock cases throw so Payload
rolls back the Order create instead of retaining stock drift. Lifecycle reaction
work stays advisory after the core mutation. `npm run test:order-stock-transaction`,
full `npm run validate`, `npm run build`, and `git diff --check` pass locally;
no database, Shopier, Telegram, provider, or live order action was run. Since
that local boundary, D-481's reviewed index has been applied and post-apply
verified in the configured database.

### D-484 Non-Shopier Conditional Stock Reservation Update

Latest local boundary: D-484.

The current local boundary supersedes D-483 above. The local release/PR range
is `D-380-D-406 plus D-422-D-484`. D-483 keeps non-Shopier Order, stock, and
InventoryLog writes inside the parent Payload transaction; D-484 adds a
conditional PostgreSQL reservation update with `stock >= quantity` for product
stock and selected variants. A concurrent final-unit request that loses the
race gets no updated row, throws, and rolls the order create back before an
InventoryLog exists. `npm run test:order-stock-transaction`, full
`npm run validate`, `npm run build`, and `git diff --check` are the local
verification boundary. No database, Shopier, Telegram, provider, or live order
action was run. Since that local boundary, D-481's reviewed index has been
applied and post-apply verified in the configured database.

### D-485 Shopier Atomic Floor-At-Zero Decrement Update

Latest local boundary: D-485.

The current local boundary supersedes D-484 above. The local release/PR range
is `D-380-D-406 plus D-422-D-485`. D-482 keeps Shopier Order, stock, and
InventoryLog writes in one Payload transaction. D-485 changes paid Shopier
sales to conditional database arithmetic: product totals and matched variants
decrement through `GREATEST(stock - quantity, 0)`. Distinct concurrent
deliveries cannot overwrite each other's depletion and leave falsely high local
stock; paid orders remain recorded and audited when local stock is zero.
`npm run test:shopier-webhook-local`, full `npm run validate`, `npm run build`,
and `git diff --check` are the local verification boundary. No database,
Shopier, Telegram, provider, or live order action was run. Since that local
boundary, D-481's reviewed index has been applied and post-apply verified in
the configured database.

### D-486 Storefront Image Fallback And Structured Data Safety Update

Latest local boundary: D-486.

The current local boundary supersedes D-485. The local release/PR range is
`D-380-D-406 plus D-422-D-486`. The public PDP now falls back to original
product media whenever generated-gallery rows have no usable URL, and the same
resolved gallery feeds Product JSON-LD. Schema offer availability now follows
shared sellable-stock truth, and inline Product/FAQ JSON-LD is safely
serialized. `npm run test:product-storefront-images`,
`npm run test:product-structured-data`, `npm run test:storefront-trust`, full
`npm run validate`, `npm run build`, and `git diff --check` are the local
verification boundary. No database, provider, Shopier, Telegram, publication,
dispatch, deployment, or live storefront action was run.

### D-487 Shared Blog And PDP JSON-LD Serialization Update

Latest local boundary: D-487.

The current local boundary supersedes D-486. The local release/PR range is
`D-380-D-406 plus D-422-D-487`. The public PDP and Blog Article page now use
the same safe inline JSON-LD serializer. It prevents stored product or
editorial text from closing the schema script while preserving parsed schema
data. `npm run test:structured-data`, `npm run test:blog-structured-data`,
full `npm run validate`, `npm run build`, and `git diff --check` are the local
verification boundary. No database, Payload, Blog publication, provider,
Shopier, Telegram, dispatch, deployment, or live action was run.

## Open Questions

### Catalog Provenance Review

The next catalog scale-up work is operational rather than a new supplier or
publishing integration: the latest confirmed read-only sample found 13
protected-brand blockers. An operator must verify each product's provenance,
then either correct wording for a confirmed unbranded own product or keep it
excluded. `/brandplan` and `/productflow <id-or-sn>` are evidence-only review
tools; they must not auto-rewrite, activate, publish, redispatch, or advertise
the item.

### n8n Intake

Should optional n8n intake remain after the product flow is stable, or should intake stay app-side through Payload/Next by default?

Recommended: keep n8n frozen unless it proves useful for a current operator need.

### Optional OpenClaw Skill Reactivation

If OpenClaw is explicitly reactivated, which skills are actually deployed on the VPS, and which only exist in the repo?

Repo-side optional checklist now exists at `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` and is guarded by `npm run test:mentix-skills`. D-401 adds `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` and standalone `npm run test:openclaw-vps-verification` so repo skill files are not confused with proven VPS state. Still needed only if OpenClaw is explicitly reactivated: operator-run VPS directory/log verification and read-only Telegram/OpenClaw prompt evidence before any live operator use.

### Validation Cleanup

Which old soak scripts should be archived, fixed, or excluded?

Current answer: D-402 quarantines the old `scripts/d*-soak*.ts` files as historical live-data soak harnesses and guards the boundary with `test:soak-scripts`. Still needed only if the operator wants to delete, rewrite, or replace a specific old soak with a modern read-only smoke.

### AI Provider Reality

Which AI/search providers are truly configured in production?

Current answer: D-403 adds `project-control/PROVIDER_REALITY_AUDIT.md` and `test:provider-reality` so local env readiness is not production provider readiness. Still needed: operator-recorded production env/account/quota/permission evidence without exposing secrets before any provider is treated as production-ready.

### Pixel And Ads

When should Meta Pixel/CAPI be added?

Recommended: after product pages, lead tracking, and privacy/KVKK wording are stable.

### Checkout

Should website-native checkout be built, or should Shopier remain the checkout path for now?

Recommended: keep Shopier as main checkout until product/publishing flow is stable.

### D-488 Optional OpenClaw VPS Deploy Guard Update

Latest local boundary: D-488.

The current local boundary supersedes D-487. The local release/PR range is
`D-380-D-406 plus D-422-D-488`. The legacy `scripts/vps-deploy.sh` now refuses
before any configuration write, skill copy, or container restart unless both
`--reactivate-openclaw` and `--confirm-vps-sync` are supplied after read-only
VPS verification evidence is recorded. `test:openclaw-vps-verification` proves
bare and one-flag invocations stop locally. Hermes/Mentix remains current; no
VPS, Telegram, provider, Shopier, n8n, SupplierScout, retired-channel, deploy,
or ad action was performed.

### D-489 Confirmation-Wizard Schema Governance Update

Latest local boundary: D-489.

The current local boundary supersedes D-488. The local release/PR range is
`D-380-D-406 plus D-422-D-489`. A core workflow audit found that ordinary
Telegram confirmation could create `wizard_sessions` or alter the product
category enum. D-489 removes that request-time DDL, keeps session storage
ephemeral and pre-provisioned, adds a confirmation-gated metadata preflight,
and a dry-run-first table helper. `test:confirmation-wizard`,
`test:runtime-smokes`, full `npm run validate`, `npm run build`, and `git diff
--check` pass locally. The dry-run helper opened no database connection. No
D-489 database preflight, confirmed DDL, Telegram, provider, Shopier,
deployment, or ad action was run.

### D-490 Lead-Status Enum Schema Governance Update

Latest local boundary: D-490.

The current local boundary supersedes D-489. The local release/PR range is
`D-380-D-406 plus D-422-D-490`. A CustomerInquiries enum-drift failure had
previously shown raw enum DDL in Telegram. D-490 leaves the lead unchanged,
does not create an audit event, and directs the operator only to the
confirmation-gated `smoke:lead-status-schema:read` metadata check. Its enum
apply helper is dry-run-first, validates baseline values before mutation, and
needs separate explicit approval. `test:lead-status-schema`, full `npm run
validate`, `npm run build`, and `git diff --check` pass locally; no D-490
database preflight, DDL, Telegram, provider, Shopier, deployment, or ad action
was run.

### D-491 Order-To-Lead Relationship Schema Governance Update

Latest local boundary: D-491.

The current local boundary supersedes D-490. The local release/PR range is
`D-380-D-406 plus D-422-D-491`. Lead conversion had depended on a historical
manual `orders.related_inquiry_id` migration. D-491 makes the existing
idempotency lookup detect a missing relationship before it attempts an order
write, leaving the order, lead status, and audit trail unchanged. The
confirmation-gated `smoke:lead-conversion-schema:read` reads column/FK metadata
only; its apply helper is dry-run-first, adds only an absent nullable
relationship after separate approval, and refuses incompatible existing schema
for manual review. `test:lead-conversion-schema`, full `npm run validate`,
`npm run build`, `git diff --check`, and the dry-run helper pass; no D-491
database preflight, DDL, Telegram, provider, Shopier, deployment, or ad action
was run.

### D-492 Storefront Header And Camper Brand-Safety Correction Update

Latest local boundary: D-492.

The current local boundary supersedes D-491. The local release/PR range is
`D-380-D-406 plus D-422-D-492`. The announcement bar now lives inside the
fixed Navbar, so it cannot overlap the storefront wordmark. The shared
protected-brand scanner now includes `Camper`, which keeps the existing hard
activation, public-storefront, dispatch, Shopier, and ad gates consistent.
`test:brand-safety`, `test:merchandising`, `test:storefront-trust`, full
`npm run validate`, `npm run build`, and `git diff --check` pass. No Payload
data, database metadata, Telegram, provider, Shopier, deployment, or ad action
was performed.

### 2026-07-25 Approved Schema-Preflight Evidence

The approved read-only metadata checks resolved three deployment questions:
D-489 `public.wizard_sessions` is complete, D-490 contains every required
CustomerInquiries enum value, and D-491 has nullable integer
`orders.related_inquiry_id` plus its `customer_inquiries.id` foreign key. D-481
found zero duplicate non-empty `orders.shopier_order_id` values in its preflight.
The subsequently approved partial unique-index apply completed and its
post-apply check passes; no live Shopier webhook or business-data write occurred.

### D-493 X Direct/Fallback Provider Readiness Alignment Update

Latest local boundary: D-493.

The current local boundary supersedes D-492. The local release/PR range is
`D-380-D-406 plus D-422-D-493`. Direct X publishing now requires all four OAuth
1.0a values: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and
`X_ACCESS_TOKEN_SECRET`. Partial configuration goes through optional
`N8N_CHANNEL_X_WEBHOOK` fallback only when it is configured; otherwise the
dispatch result names the missing OAuth keys and the missing fallback webhook
instead of attempting a direct provider call. Focused dispatch/provider-health/
redispatch/dispatch-status checks, full `npm run validate`, and `npm run build`
pass locally. No provider, webhook, Payload, queue, deployment, or ad action
was run. Production X credentials, permission, quota, and real-dispatch
evidence remain separate operator work.

### D-494 Meta Gallery Media Selection Alignment Update

Latest local boundary: D-494.

The current local boundary supersedes D-493. The local release/PR range is
`D-380-D-406 plus D-422-D-494`. Instagram and Facebook direct dispatch now
scan all gallery URLs for public HTTPS media, rather than treating an insecure
or relative first URL as a reason to fall through to optional n8n. Mocked
direct-adapter coverage proves a later public image is selected for both
channels without a Meta call; full `npm run validate` and `npm run build` pass
locally. Production media reachability, credentials, permissions, and
real-dispatch evidence remain separate operator work.

### D-495 Meta Public-Media Dispatch Preflight Update

Latest local boundary: D-495.

The current local boundary supersedes D-494. The local release/PR range is
`D-380-D-406 plus D-422-D-495`. Instagram and Facebook now fail before direct
Meta or optional n8n fallback dispatch when their gallery lacks public HTTPS
media. Their per-channel result tells the operator to attach public media while
leaving fallback configuration visible for diagnosis. Mocked coverage proves no
fetch is attempted in this case; production media reachability, credentials,
permissions, and real dispatch remain separate operator work. Full `npm run
validate` and `npm run build` pass locally.

### D-496 Lead-Followup Runtime Smoke Completeness Update

Latest local boundary: D-496.

The current local boundary supersedes D-495. The local release/PR range is
`D-380-D-406 plus D-422-D-496`. The temporary read-only Payload configuration
for `smoke:lead-followup:read` now registers BlogPosts with Products, matching
the Product `linkedBlogPost` relationship. `test:runtime-smokes`, typecheck,
full `npm run validate`, `npm run build`, and the approved real-data lead read
pass. The read reports six open stale
leads with PII-light actions only; it does not mutate leads, message customers,
queue work, call providers/Shopier, push schema, or spend on ads.

### D-497 Brand Remediation External-Exposure Visibility Update

Latest local boundary: D-497.

The current local boundary supersedes D-496. The local release/PR range is
`D-380-D-406 plus D-422-D-497`. `/brandplan` and
`smoke:brand-safety:read` now expose stored Facebook, Instagram, X, and
Shopier dispatch notes as `published`, `queued`, or `failed` for protected-
brand products. Website is not an external channel. The 2026-07-25 approved
read found 13 protected-brand records; `SN0111` shows Facebook published,
Shopier queued, and X failed. This does not contact any provider, prove a
remote listing exists, or authorize cleanup, retry, publish, dispatch, product
updates, or spend. Next: verify real provenance and remote state manually,
then make intentional operator-approved remediation decisions.

### D-498 Brand Remediation Provenance-State Workflow Update

Latest local boundary: D-498.

The current local boundary supersedes D-497. The local release/PR range is
`D-380-D-406 plus D-422-D-498`. The read-only brand remediation queue now
counts provenance state and gives one next safe step per protected-brand row.
The 2026-07-25 approved sample contains 13 blockers, all unreviewed; 9 have
stored external dispatch history and require manual remote-state verification
before any cleanup decision. Next: review evidence and external state outside
chat, then explicitly confirm an appropriate `/brandreview` record only when
the operator has made a real decision. No catalog or remote action occurred.

### D-499 Batch Image QC Remediation Queue Update

Latest local boundary: D-499.

The current local boundary supersedes D-498. The local release/PR range is
`D-380-D-406 plus D-422-D-499`. The read-only Image QC queue gives batch
visibility before any generation or QC decision. The approved 2026-07-25 sample
contains 55 queue records: 13 protected-brand rows routed back to provenance
review, 28 QC failures, and 14 pending decisions. Next: resolve protected-brand
provenance, then inspect the non-brand failed/decision rows with the row-provided
Image Plan reads before any explicit QC or generation action.

The D-499 per-product diagnostic alignment closes one ordering gap: protected-
brand `/productflow` and `/imageplan` now offer only preview-first provenance
review while the hard gate remains unresolved. Next: make real provenance and
remote-state decisions for the 13 protected-brand records, then work only the
non-brand Image QC backlog.

Once a decision is confirmed, re-run `/productflow` or `/imageplan`: the latest
provenance BotEvent now advances the manual diagnostic to evidence collection,
copy correction, or exclusion. It never removes the protected-brand gate.

### D-500 Meta Provider Configuration Unification Update

The deployed release boundary is D-500. D-501 is the current local follow-up.

The deployed release boundary superseded D-499. The completed release/PR range is
`D-380-D-406 plus D-422-D-500`. Direct Facebook dispatch and provider health
now resolve their Page ID from the same deployment value, `INSTAGRAM_PAGE_ID`;
operators must not try to add a removed `facebookPageId` field to Payload.
The environment template also removes retired Dolap/Threads fallback variables
and lists all four direct X OAuth 1.0a variables. Next: review the deployed
environment by credential name only, record the provider evidence, then obtain
separate approval before any live probe, queue, or post.

### D-501 Mobile PDP CTA Overflow Correction

Latest local boundary: D-501.

The current local follow-up is D-501, outside the already-deployed D-500
release range. A read-only 390px production smoke found the Classic Loafer PDP
at 440px document width while the homepage remained within its viewport. The
fixed CTA's 40/60 flex children used content-box padding; both now use
`boxSizing: 'border-box'` and `minWidth: 0`. `test:storefront-trust`, typecheck,
and lint pass locally. The next required evidence is a new approved deployment
and clean 390px PDP smoke; no provider, Shopier, Telegram, n8n, Payload, or ad
action is part of this correction.
