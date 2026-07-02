# Open Questions And Next Sprint

Last updated: 2026-07-02

## Immediate Next Sprint

Current sprint status:

1. `AGENTS.md` added.
2. `CLAUDE.md` added.
3. Obsidian control notes added at repo root.
4. Validation scripts fixed.
5. Stale generated/session artifacts excluded from validation.
6. `npm run validate` passes with warnings and now includes brand-safety, product-media, product-stock, product-lifecycle, operator-readiness, source-pack governance, retired-channel governance, n8n optionality governance, deployment ops runbook governance, SupplierScout dormancy, Mentix/OpenClaw skill governance, admin-visibility, product-channel-normalization, product-flow snapshot, publish-readiness, catalog-QA, category-fill, image-quality, Shopier publish-control/admin-gate/safe-retry, state-coherence repair, Telegram caption parsing, confirmation-wizard channel handling, channel-dispatch, dispatch-state, channel provider-health, Product Intelligence provider-health, redispatch, activation-guard, Publish Desk activation, and ad-readiness assertions.
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
38. Source-pack governance is now mechanically tested by `test:source-pack`: document count stays under 20, required source files exist, active channel truth remains Website/Instagram/Facebook/X/Shopier, SupplierScout remains dormant in the decision pack, and active control artifacts do not re-list Dolap/Threads.
39. SupplierScout dormancy is now mechanically tested by `test:supplierscout-dormant`: the route must keep the `SUPPLIER_SCOUT_ENABLED=true` gate before webhook processing, daily reports, and webhook registration; Vercel must not register a SupplierScout cron; package scripts must not activate it; and source-pack guidance must still say it is dormant.
40. Telegram confirmation wizard channel handling is now tested by `test:confirmation-wizard`: the target picker includes the active channel set including X, retired/unknown targets are dropped from wizard checks and summaries, and spoofed `wz_tgt:*` callbacks are rejected before entering the session.
41. State-coherence repair is now tested by `test:state-coherence`: `/repair` preview remains dry-run, confirmed repair updates only derived workflow fields, archived products are skipped, confirmed repairs emit `state.repaired`, repeated repair is idempotent, and scan mode is read-only.
42. Mentix/OpenClaw skill governance is now tested by `test:mentix-skills`: repo skills must keep OpenClaw as Mentix's skill layer, Payload/Next as source of truth, n8n optional, active channels Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, SupplierScout dormant, and the OpenClaw deployment checklist present.
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
54. Retired-channel governance is now mechanically tested by `test:retired-channels`: active code, n8n workflow stubs, package activation scripts, and current decision docs must not reintroduce Dolap/Threads. Negative tests may still mention retired channels to prove they are rejected.
55. n8n optionality governance is now mechanically tested by `test:n8n-optional`: n8n remains optional glue, workflow JSON files stay limited to active-channel fallback paths, missing webhook env vars remain scaffold/no-throw behavior, package scripts cannot activate n8n workflows by default, and legacy automation intake stays Payload-first/draft-first.
56. Phase 9 Deployment/Ops Runbook implemented. `project-control/DEPLOYMENT_OPS_RUNBOOK.md` now records the current deploy, rollback, env-var, webhook-health, cron/job-runner, D-355 DB drift, n8n optionality, SupplierScout dormancy, retired-channel, source-pack, and GitHub PR workflow guardrails. Covered by `test:ops-runbook`, included in `test:safe`.
57. D-356B per-product admin Shopier gate implemented. Payload admin ReviewPanel now shows a read-only Shopier Queue Gate for the current product using `evaluateShopierPublishControl()`, distinguishing not-targeted, ready, queued, synced, and blocked states without queueing jobs or calling Shopier. Covered by `test:shopier-publish-control`.
58. Phase 2/3 Product Flow Snapshot implemented as `src/lib/productFlowSnapshot.ts`, Telegram `/productflow <sn-or-id>` and `/flow <sn-or-id>`, and `test:product-flow-snapshot`. It is read-only and combines lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state, channel/coherence drift, and next actions for operators and Mentix/OpenClaw diagnostics.
59. Product Flow Snapshot runtime smoke implemented as `scripts/product-flow-runtime-smoke.ts`, exposed by `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`. It reads one real Payload product by id or stock number, forces `PAYLOAD_DB_PUSH=false`, uses the same helper as Telegram `/productflow`, and performs no writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes.
60. Provider Health runtime smoke implemented as `scripts/provider-health-runtime-smoke.ts`, exposed by `npm run smoke:provider-health:read -- --confirm-read-only`. It reads AutomationSettings with `PAYLOAD_DB_PUSH=false`, uses the same secret-safe provider-health helper as Telegram `/diagnostics`, and performs no writes, jobs, dispatches, provider calls, Shopier calls, schema pushes, or secret-value printing.
61. Product Intelligence Provider Health implemented as `src/lib/productIntelligence/providerHealth.ts`, `src/lib/productIntelligence/providerHealth.test.ts`, and `scripts/pi-provider-health-runtime-smoke.ts`, exposed by `npm run test:pi-provider-health` and `npm run smoke:pi-provider-health:read -- --confirm-read-only`. It checks Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection without Payload access, provider calls, or secret-value printing.
62. Ad Readiness runtime smoke implemented as `scripts/ad-readiness-runtime-smoke.ts`, exposed by `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only`. It reads one real Payload product with `PAYLOAD_DB_PUSH=false`, mirrors Telegram `/adready`, and reports PDP/product-page, clean-media/Image-QC, stock/size, active-channel link, UTM, lead visibility, brand-safety, risky-claim, and no-autonomous-spend checks without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes.
63. Phase 7 Business/Funnel diagnostics hardened. `src/lib/businessDesk.test.ts` and `src/lib/funnelDesk.test.ts` now guard `/business` and `/funnel` formatter/math behavior, including urgency output, lead-source attribution, direct-order separation, legacy `completed` lead handling, UTM/referrer rollups, and formatter escaping. `scripts/business-funnel-runtime-smoke.ts` is exposed as `npm run smoke:business-funnel:read -- --confirm-read-only` and mirrors Telegram `/business` plus `/funnel` against real Payload state without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes.

## Immediate Next Focus: Catalog Scale-Up

D-355 schema drift is no longer the active blocker: `npm run smoke:imageqc:schema -- --confirm-read-only` passes as of 2026-07-02. Continue D-356 Shopier/Web Publish Batch Control by live-smoking `/diagnostics`, `/productflow`, `/business`, `/funnel`, `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` with the operator present. Product `359` currently needs generated-image QC review before full readiness, and X dispatch has a credits-depleted failure. Channel provider-health smoke currently shows Website ready, Instagram disabled in AutomationSettings, Facebook missing Page ID/webhook, X missing OAuth/webhook, and Shopier missing `SHOPIER_PAT`/webhook. PI provider-health smoke currently shows Gemini text/image ready but no reverse-search provider selectable because Google Vision, DataForSEO, and SerpAPI credentials are missing locally; run it before `#geohazirla` or comparison/GEO work to confirm provider availability without spending credits. Shopier read-only smoke found no current sync errors or retry candidates, but `SHOPIER_PAT` is not configured in the current smoke environment, so do not queue Shopier jobs until credentials and operator approval are confirmed. Business/funnel read-only smoke currently shows 6 open leads, 5 stale leads, 1 sold-out product, no open orders, and a 7-day website funnel count of 2 leads; follow up on stale leads before campaign work. Ads stay paused until D-380+, but use `smoke:ad-readiness:read` before considering any product for manual paid traffic.

## Open Questions

### n8n Intake

Should optional n8n intake remain after the product flow is stable, or should intake stay app-side through Payload/Next by default?

Recommended: keep n8n frozen unless it proves useful for a current operator need.

### OpenClaw Skill Deployment

Which skills are actually deployed on the VPS, and which only exist in the repo?

Repo-side checklist now exists at `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` and is guarded by `npm run test:mentix-skills`. Still needed: verify which skills are deployed on the VPS and test read-only Telegram/OpenClaw prompts before any live operator use.

### Validation Cleanup

Which old soak scripts should be archived, fixed, or excluded?

Needed: prevent TypeScript/lint from failing on stale historical artifacts.

### AI Provider Reality

Which AI/search providers are truly configured in production?

Needed: provider/env audit without exposing secrets.

### Pixel And Ads

When should Meta Pixel/CAPI be added?

Recommended: after product pages, lead tracking, and privacy/KVKK wording are stable.

### Checkout

Should website-native checkout be built, or should Shopier remain the checkout path for now?

Recommended: keep Shopier as main checkout until product/publishing flow is stable.
