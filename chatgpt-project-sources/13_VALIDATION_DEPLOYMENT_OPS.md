# Validation, Deployment, And Ops

Last updated: 2026-07-25

## D-500 Meta Provider Configuration And D-499 Image QC Preflight

D-500 makes Facebook direct dispatch and provider-health resolve the same
deployment value, `INSTAGRAM_PAGE_ID`. It must be verified by name in the
hosting environment; it is not a Payload AutomationSettings field. The shared
resolver is covered by `test:provider-health`, `test:meta-provider-credentials`,
and `test:channel-dispatch`. This does not read secrets, call a provider, or
prove production access.

The approved 2026-07-25 D-500 read-only provider-health smoke reports Website
`ready/native`, Facebook `ready/direct`, Instagram disabled by AutomationSettings,
and X/Shopier missing their current requirements. It performed no write, job,
dispatch, provider call, Shopier call, or schema push.

`npm run smoke:image-qc-plan:read -- --confirm-read-only` mirrors Telegram
`/imageqcplan` against real Payload products with `PAYLOAD_DB_PUSH=false`.
It groups protected-brand-first, missing-original, failed/review, and pending
Image QC items, then supplies only `/imageplan` and Product Flow handoffs. It
does not record Image QC, queue generation, call providers or Shopier, publish,
dispatch, change products, activate SupplierScout, revive retired channels, or
spend. Runtime-smoke governance checks this command and its confirmation gate.

## Daily Operator Runbook

`project-control/OPERATOR_RUNBOOK.md` is the current daily guide for catalog
and product work. It starts with `/smokeplan`, then uses read-only Product Flow,
Image Plan, provider-health, business/funnel, lead, manual-ad, and Shopier
preflights before any write or external action. Activation changes product
state but does not prove an external channel published; Shopier controls are
preview-first and require row-level Product Flow checks, out-of-chat credential
 verification, and explicit operator approval before a confirm command. The
 D-481 Shopier order-ID index is applied and read-only verified in the
 configured database; live Shopier webhook delivery remains a separate
 operator-approved step. `npm run test:ops-runbook` guards this runbook and the deployment
runbook against stale operating claims.

D-486 adds two local storefront checks to `npm run test:safe`:
`test:product-storefront-images` proves generated-first/original-fallback PDP
image resolution, and `test:product-structured-data` proves Product/FAQ schema
content, stock availability, and safe inline JSON serialization. The extended
`test:storefront-trust` checks the PDP integration. None of these tests reads
Payload, calls a provider, calls Shopier, publishes, or changes data.

D-487 adds `test:structured-data` and `test:blog-structured-data` to the safe
suite. They prove a single serializer escapes inline JSON-LD close-out data and
that Blog Article schema uses it instead of raw `JSON.stringify`. They do not
read or write Payload, publish articles, call providers, call Shopier, or spend.

D-488 extends standalone `test:openclaw-vps-verification` with a local
invocation guard for `scripts/vps-deploy.sh`. Bare and one-flag calls now exit
before any VPS configuration write, skill copy, or container restart; only the
explicit `--reactivate-openclaw --confirm-vps-sync` form can reach the legacy
sync steps after the separate read-only verification evidence is recorded.
Hermes/Mentix remains current, and the test is not in normal `test:safe`.
Focused D-488 checks, full `npm run validate`, `npm run build`, and `git diff
--check` pass locally; no VPS, Telegram, provider, Shopier, deployment, or
commit action was run.

D-489 removes request-time confirmation-wizard schema mutations. `test:confirmation-wizard`
now rejects `CREATE TABLE`, `ALTER TYPE`, and the former category-enum DDL in
the request path while checking that wizard values stay declared in the Payload
product schema. `npm run smoke:wizard-sessions:schema -- --confirm-read-only` is a
metadata-only preflight for the existing `public.wizard_sessions` table;
`db:wizard-sessions:apply` is dry-run without a connection and requires
`--apply --confirm-apply-d489-wizard-sessions-schema` plus separate operator
approval to create a missing table. No D-489 database preflight or apply ran
before the approved 2026-07-25 preflight. That metadata check passed:
`public.wizard_sessions`, its required text/jsonb/timestamp columns, and the
`session_key` primary key are present. No apply was run.

D-490 removes raw `ALTER TYPE` instructions from Telegram lead-status errors.
`test:lead-status-schema` simulates a deployed enum-drift failure and confirms
that no lead or audit event is written while the operator receives only the
guarded read-only command: `npm run smoke:lead-status-schema:read --
--confirm-read-only`. The smoke reads `pg_type`/`pg_enum` metadata only;
`db:lead-status-enum:apply` is dry-run without a connection and requires
`--apply --confirm-apply-d490-lead-status-enum` plus separate operator approval
to add only missing post-baseline values. No D-490 database preflight or apply
ran before the approved 2026-07-25 preflight. That metadata check passed:
`public.enum_customer_inquiries_status` contains every required value. No
apply was run.

D-491 removes the hidden schema assumption from manual lead conversion.
`test:lead-conversion-schema` simulates a missing `orders.related_inquiry_id`
column and confirms no order, lead-status, or audit write occurs while Telegram
receives only the guarded read-only command: `npm run smoke:lead-conversion-schema:read -- --confirm-read-only`. The smoke reads
`information_schema` and `pg_constraint` metadata only;
`db:lead-conversion-schema:apply` is dry-run without a connection and requires
`--apply --confirm-apply-d491-order-lead-relationship` plus separate operator
approval to add only an absent nullable relationship. No D-491 database
preflight or apply ran before the approved 2026-07-25 preflight. That metadata
check passed: `orders.related_inquiry_id` is nullable `integer` and its
`customer_inquiries.id` foreign key is present. No apply was run.

The approved 2026-07-25 D-481 preflight found `orders.shopier_order_id` nullable
`character varying` with zero duplicate non-empty values. The approved
concurrent partial unique-index apply then completed using the reviewed SQL
fingerprint `c79810ec7a084bfc`; its post-apply read-only check confirms
`orders_shopier_order_id_unique_idx` is present. PostgreSQL canonicalizes the
blank-ID predicate as `btrim((shopier_order_id)::text)`, which the read-only
checker now recognizes without weakening the required unique partial-index
predicate. `npm run test:shopier-webhook-local` passes locally. No live Shopier
webhook/API delivery was exercised.

## Current Validation Status

Latest documented feature boundary: D-500. The D-500 Meta configuration
unification and the batch Image QC remediation queue classify protected-brand-first,
missing-original, failed/review, and pending-decision Image QC backlog while
providing only Image Plan/Product Flow reads. The approved 2026-07-25 read
found 55 queue items: 13 brand first, 28 failed QC, and 14 needing a decision.
It does not record QC, queue generation, change a product, publish, dispatch,
call providers or Shopier, or spend. `test:image-qc-remediation-plan`,
`test:operator-smoke-plan`, `test:runtime-smokes`, typecheck, full
`npm run validate`, and `npm run build` pass locally. This is not deployed
Telegram or provider proof.

D-499's per-product diagnostic alignment is covered by
`test:product-flow-snapshot` and `test:image-regeneration-plan`. The approved
read-only recheck of `SN0111` confirms protected-brand provenance is the first
operator path; no Image QC, generation, publishing, Shopier, redispatch, ad,
provider, or data action occurred. Full `npm run validate` and `npm run build`
pass after that alignment; no approved release action occurred.

The same reads load the latest matching provenance BotEvent. Focused tests cover
recorded copy-fix and keep-excluded decisions: they advance only the diagnostic
next step, never product data, Image QC, activation, publishing, dispatch,
Shopier, provider calls, or ad action.

D-495 remains the active Meta safety rule: Instagram/Facebook dispatch fails
with a public-media reason before direct Meta or optional n8n fallback when the
gallery has no public HTTPS image. Mocked `test:channel-dispatch` proves both
channel results make zero fetch calls in that case; it is not provider proof.

Before a provider or webhook proof, use the secret-safe Operator Evidence
Record in `project-control/PROVIDER_REALITY_AUDIT.md`: record the deployed
revision, credential names rather than values, direct/fallback path,
permission/quota result, approved probe, outcome, and next safe action in the
project-control logs. This record does not authorize dispatch, queueing,
provider calls, live webhook delivery, or spend.

Latest documented feature boundary: D-494. Direct Instagram and Facebook
dispatch now select any public HTTPS gallery image rather than requiring the
first image to be HTTPS. `test:channel-dispatch` uses mocked fetch responses to
prove both direct adapters choose a later valid image; it does not call Meta.
Full `npm run validate` and `npm run build` pass locally. Production media
reachability, credentials, and real posting remain unproven.

Latest documented feature boundary: D-493. X direct publishing now requires
the same complete four-value OAuth contract used by provider health. A partial
configuration uses the optional X n8n webhook fallback when configured, or
reports the missing credential names without attempting a direct API call.
`test:channel-dispatch`, `test:provider-health`, `test:redispatch`, and
`test:dispatch-status`, full `npm run validate`, and `npm run build` pass
locally. No provider, webhook, Payload, queue, or deployment action occurred;
production X credentials and permissions remain unproven.

Latest documented feature boundary: D-492. The storefront announcement bar now
renders inside the fixed Navbar, and `Camper` is covered by the shared
protected-brand hard gate used across activation and public storefront
eligibility. `test:brand-safety`, `test:merchandising`, `test:storefront-trust`,
full `npm run validate`, `npm run build`, and `git diff --check` pass locally.
No product data, database metadata, Telegram, provider, Shopier, or deployment
action occurred.

Previous documented feature boundary: D-491. A missing order-to-lead
relationship now blocks conversion before an order write and guides the
operator only to its confirmation-gated metadata check. The dry-run
relationship helper opened no database connection. `test:lead-conversion-schema`,
full `npm run validate`, `npm run build`, and `git diff --check` pass locally;
the approved 2026-07-25 metadata preflight confirms the nullable relationship
and exact foreign key already exist, so no DDL was needed. The confirmed helper
remains approval-gated for a future incomplete environment.

Previous documented feature boundary: D-490. A lead-status enum drift now leaves
the lead unchanged, creates no audit event, and guides the operator to a
confirmation-gated metadata check instead of showing executable DDL in
Telegram. The dry-run enum helper opened no database connection.
`test:lead-status-schema`, full `npm run validate`, `npm run build`, and `git
diff --check` pass locally; the approved 2026-07-25 metadata preflight confirms
every declared status enum value already exists, so no DDL was needed. The
confirmed helper remains approval-gated for a future incomplete environment.

Latest documented feature boundary: D-489. Ordinary Telegram confirmation no
longer creates `wizard_sessions` or alters the product category enum. The
pre-provisioned session table has a confirmation-gated metadata-only preflight;
the reviewed create-only helper is dry-run-first and its dry run opened no
database connection. `test:confirmation-wizard`, `test:runtime-smokes`, full
`npm run validate`, `npm run build`, and `git diff --check` pass locally. The
approved 2026-07-25 metadata preflight confirms `public.wizard_sessions` is
complete, so no DDL was needed. The confirmed helper remains approval-gated
for a future incomplete environment; no Telegram, provider, Shopier,
deployment, or ad action was made.

Historical D-482 local-code boundary: D-480 keeps inbound Shopier webhooks fail-closed with exact raw-body HMAC verification. D-481 adds duplicate-order protection through a partial unique index, now applied and post-apply verified in the configured database on 2026-07-25. D-482 makes the local Order create plus product/variant stock and InventoryLog writes one Payload transaction; verified processing failures return `500` so Shopier can retry, and the order alert follows commit. Focused transaction, stock, idempotency, and webhook-local checks plus full `npm run validate` and `npm run build` pass; live Shopier webhook/API evidence remains unrun.

Latest documented feature boundary: D-479. `npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only` mirrors `/blogpreflight` with one real BlogPost and `PAYLOAD_DB_PUSH=false`. It reports first-publication blockers, AI/evidence-sensitive review items, and SEO/editorial warnings without updating or publishing an article, calling providers, spending, activating SupplierScout, reviving retired channels, or pushing schema. Evaluator, collection-hook, command-governance, full `npm run validate`, and `npm run build` pass locally. The command remains operator-run and has not been connected to Payload in this work session.

Latest documented feature boundary: D-478. Confirmed `/brandreview` events store an opaque Telegram delivery key. A retry of the same update returns the original evidence record instead of creating a duplicate BotEvent. The protection is event-only: it performs no product update, safety bypass, publication, dispatch, Shopier queue, provider call, or schema change. Focused provenance tests, full `npm run validate`, and `npm run build` pass locally. No live Telegram invocation or Payload write was run.

Latest documented feature boundary: D-477. `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` is preview-first and only its explicit confirmation writes one BotEvent audit record. `/brandplan` and `smoke:brand-safety:read` display that evidence without editing products or weakening the hard gate. `npm run test:brand-provenance-review`, `npm run test:brand-provenance-command`, `npm run test:brand-safety-plan`, full `npm run validate`, and `npm run build` pass locally. No live Telegram invocation or Payload write was run.

Latest documented feature boundary: D-476. The loading-plan worklist now prioritizes active protected-brand exposure ahead of a draft protected-brand record even when that draft has more secondary blockers, and displays product status on each row. `npm run test:loading-plan`, full `npm run validate`, and `npm run build` pass locally. It performs no product write, queue, publish, dispatch, provider call, Shopier call, or ad spend.

Latest documented feature boundary: D-475. The direct Telegram `/utm` command now uses `evaluateProductUtmEligibility()` before returning a customer-facing URL. The resolved product must have a slug, be active, and pass the public storefront placeholder/protected-brand safety gate; otherwise Telegram returns a read-only refusal with a `/productflow` pointer. `npm run test:utm-builder`, `npm run test:utm-command`, full `npm run validate`, and `npm run build` pass locally. It performs no product write, queue, publish, dispatch, provider call, Shopier call, or ad spend.

Latest documented feature boundary: D-474. Public PDP and ad landing links now use `isPublicStorefrontProduct()`, the same public-status plus storefront-safety policy used by the public website. Protected-brand and placeholder records retain admin visibility but cannot surface a dead public PDP or sample UTM from brand remediation, loading plans, Shopier previews, operator inbox, lead/order desks, or ad readiness. Focused policy tests, full `npm run validate`, and `npm run build` pass locally. It performs no product write, queue, publish, dispatch, provider call, Shopier call, or ad spend.

Latest documented feature boundary: D-473. Product Flow now carries public-status plus shared storefront-safety eligibility into Website dispatch state and PDP links, so a draft or unsafe product cannot appear Website-published because of its target or stale dispatch record. `test:dispatch-status`, `test:product-flow-snapshot`, typecheck, lint, full `npm run validate`, and `npm run build` pass locally. The follow-up read-only smoke for observed draft `SN0077` reports Website `Blocked`, `published 0/4`, and no public URL.

Latest documented feature boundary: D-472. The numeric homepage trust metrics are default-hidden and have no fallback social-proof values. An operator must deliberately enable `SiteSettings.trustBadges.enabled` and provide all three verified values before they render; otherwise the metrics card is omitted. This guard does not calculate metrics, mutate Payload, call external services, publish, dispatch, or spend. `test:storefront-trust`, typecheck, lint, full `npm run validate`, and `npm run build` pass locally. A fresh production-server homepage response returned `200` and contained no legacy `500+`, `200+`, `%98`, customer-metric label, or metrics-panel-caption output; its temporary server was stopped.

Latest documented feature boundary: D-471. A post-D-465 local validation-signal cleanup reduced current lint output to 0 errors / 0 warnings (from 70) without changing command behavior; it now uses optimized Next images for the Blog, related product cards, and configured legacy-shell product media while keeping explicit data/blob fallbacks where `next/image` cannot process the source. Shared font loading lives in the App Router layout. The cleanup also removes dead client-shell category code, the retired per-color image-background engine so the shared studio background is the only provider path, and the unused direct Shopier-publish helper so the guarded Payload job path is the only supported Shopier route. Full `npm run validate` and `npm run build` pass through D-471. D-469 pins Turbopack workspace discovery to this repository, removing the parent-lockfile inference warning from the local production build. D-470 makes Product Flow Snapshot command handoffs use numeric Payload IDs while preserving the operator's stock-number reference, so ID-only confirmation/content/audit handlers receive a valid command. D-471 keeps placeholder-title and protected-brand legacy records out of public homepage, PDP, metadata, related-product, and sitemap surfaces without mutating Payload. A local production-build smoke also returned HTTP 200 for `/` and `/cart`, with 116 homepage `/_next/image` references, and stopped its temporary server afterward. D-462 dry-run/refusal checks and focused Mentix/VPS, source/release/PR, retired-channel, n8n, and ops governance remain local-only. The separately approved 2026-07-24 D-462 migration is applied to the configured database; its post-apply metadata check passes and the latest build no longer uses the blog-schema fallback.

As of 2026-07-18, `npm run validate` passes after the D-459 product-flow dispatch summary update. `npm run validate` runs TypeScript, ESLint, brand-safety assertions, product-media assertions, product-stock assertions, product-lifecycle assertions, operator-readiness summary assertions, source-pack governance assertions including D-459 latest-boundary source-pack checks, retired-channel governance assertions including Memory Lock handoff files, n8n optionality governance assertions, deployment ops runbook governance assertions, local release candidate governance assertions, local PR review package governance assertions, runtime-smoke governance assertions, historical soak-script governance assertions, SupplierScout dormancy assertions, Hermes/Mentix skill-governance assertions, product-admin-visibility assertions, product-channel-normalization and channel-drift assertions, product-flow snapshot/operator-checklist dependency, checklist-summary, dispatch-summary, primary-step, and operator-link assertions, publish-readiness/coherence/pipeline-diagnostic assertions, business-desk assertions including D-446 safe next-read hints, funnel-desk assertions including D-447 safe next-read hints, lead-desk assertions including D-444 shared lead/operator links, lead-followup-plan assertions including D-442 lead/product operator links, operator-inbox assertions including D-443 product row links, operator order lifecycle and D-445 order-desk operator-link assertions, Shopier order/refund stock reconciliation assertions, Shopier refund request/update lifecycle assertions, catalog-QA assertions, category-fill assertions, product-loading-plan worklist/handoff/operator-link/batch-summary/batch-focus/focus-queue/focus-detail assertions, operator-smoke-plan assertions including D-452 latest-boundary title, D-437 Telegram access ordering, D-432 read-only manual ad preflight ordering, D-433 storefront trust ordering, D-434 inquiry guard ordering, D-435 attribution ordering, and D-436 sitemap ordering, image-quality assertions, image-regeneration-plan assertions, Shopier command-governance assertions, Shopier publish-control/admin-gate/safe-retry/operator-link/credential-hold assertions, state-coherence repair assertions, Telegram access assertions, Telegram caption parser assertions, Telegram confirmation-wizard channel assertions, channel-dispatch assertions, dispatch-state assertions, channel provider-health assertions, story-dispatch brand-safety assertions, Product Intelligence provider-health assertions, provider reality audit assertions, redispatch assertions, automation-decision assertions, product-activation-guard assertions including direct sold-out admin-save normalization and generated-image QC gating, Publish Desk activation smoke assertions, ad-readiness assertions including D-448/D-452 safe next-read hints, manual ad launch-pack assertions, manual ad performance assertions, inquiry-guard assertions, attribution assertions, sitemap-entry assertions, and storefront trust/PDP conversion assertions. Standalone `test:openclaw-vps-verification` remains available for optional OpenClaw reactivation review, but OpenClaw is not the current live control layer. Lint warnings are allowed; lint errors or failed assertions fail the command.

D-460 validation adds row-level Product Flow Snapshot dispatch recovery-path assertions and runtime-smoke output coverage. The read-only snapshot still only reports a suggested command; it never invokes it. Focused checks and full `npm run validate` passed locally.

D-461 validation strengthens session-start control truth: `test:retired-channels` now requires both Memory Lock files to state Payload/Next execution, Hermes-current agent control, OpenClaw optionality, n8n optionality, and SupplierScout dormancy while rejecting the old default Telegram-to-OpenClaw-to-n8n path. `test:n8n-optional` confirms direct Payload/Next is documented as the default and `test:mentix-skills` keeps the skill layer aligned. No external action was run.

D-462 adds a build-discovered BlogPosts schema-drift preflight. The approved 2026-07-24 pre-apply `npm run smoke:blog-schema:read -- --confirm-read-only` confirmed that `blog_posts` and `media` exist, `media.id` is PostgreSQL `integer (int4)`, but `blog_posts.featured_image_id` and its `media` foreign key were missing. The approved additive migration then created the nullable relationship column, exact `featured_image_id -> public.media.id ON DELETE SET NULL` foreign key, and supporting index in the configured database. The post-apply check passes, and the subsequent production build has no schema fallback. The local checker and apply guard still refuse incompatible ID types and conflicting foreign keys. `npm run db:blog-featured-image:apply` remains dry-run by default; a future environment requires `--apply --confirm-apply-d462-blog-featured-image-schema` and explicit operator approval. Neither command is part of `validate`; the read-only preflight may connect to the configured database, while the default apply dry-run does not connect.

D-466 adds a confirmation-gated protected-brand remediation smoke:

```powershell
npm run smoke:brand-safety:read -- --confirm-read-only
```

It mirrors Telegram `/brandplan` against a bounded real Payload product sample, grouping protected-brand blockers by severity and brand while exposing matched text fields and safe product-flow handoffs. It forces `PAYLOAD_DB_PUSH=false` and never rewrites product text, changes status, retires, activates, publishes, redispatches, queues jobs, calls providers or Shopier, spends on ads, activates SupplierScout, revives retired channels, or pushes schema. The 2026-07-24 confirmed run inspected 100 of 126 products and reported 13 blockers (12 critical, 1 high) without writes; focused checks and full `npm run validate` pass.

D-467 closes the manual-activation bypass for those blockers. The generic manual review path may still proceed when Image QC/audit are the only failed readiness dimensions, but `approveAndActivateProduct()` now refuses when `scanProductBrandSafety()` finds a protected brand. `Products.beforeChange` independently retains the same hard rejection even if the caller passes `context.manualPublishOverride=true`. `npm run test:publish-desk` and `npm run test:activation-guard` prove both paths; no product records were changed and no schema, provider, Shopier, dispatch, or ad action occurred.

D-468 adds `npm run test:product-workflow` to the safe validation chain. It is an in-memory golden path covering Telegram target normalization, Payload channel intent, lifecycle/readiness progression, activation defaults, and protected-brand refusal. It makes no database, provider, Telegram, Shopier, job-queue, dispatch, or schema call.

D-469 sets `turbopack.root` to the repository root in `next.config.ts`. This keeps local production builds from selecting the unrelated `C:\\Users\\W11\\package-lock.json` as their workspace root when the repository already has its own lockfile. `npm run build` passes without that warning. No application route, Payload schema/data, provider, Telegram, Shopier, n8n, OpenClaw, or channel behavior changed.

D-470 adds `commandRef` to the read-only Product Flow Snapshot. Its display reference remains the stock number when available, but generated action commands use a numeric Payload ID when present. This prevents `/productflow SN...` from handing an operator `/confirm SN...`, `/content SN...`, or `/audit SN...` even though those legacy handlers parse numeric IDs. The runtime smoke prints `commandRef`; `test:product-flow-snapshot` and `test:runtime-smokes` guard the behavior. It performs no Payload read/write during unit tests and no provider, Telegram, Shopier, n8n, OpenClaw, or channel action.

D-471 adds a shared public-storefront safety gate. `isStorefrontProductSafe()` rejects placeholder intake/test titles and protected-brand matches; the homepage and similar-products filter use it through merchandising, while direct PDP rendering, metadata, and sitemap product URLs use it explicitly. This is a read-only visibility/indexing guard for legacy active records, not an automatic catalog cleanup. `test:merchandising` and `test:storefront-trust` cover it; it makes no Payload write, provider, Telegram, Shopier, n8n, OpenClaw, or channel action. A fresh local production-server smoke confirmed the homepage has no placeholder cards, a normal PDP returns `200`, a placeholder PDP returns `404`, and the sitemap omits the placeholder slug while retaining a safe product URL.

D-463 adds Mentix skill-runtime governance. `npm run test:mentix-skills` verifies Hermes-current, Payload-first, optional-OpenClaw wording plus read-only/draft/advisory and durable-memory boundaries across the skill files, activation template, and dashboard. Standalone `npm run test:openclaw-vps-verification` still checks optional reactivation evidence rules; neither test contacts a VPS. D-463 focused governance, typecheck, lint, `git diff --check`, and full validation pass locally.

D-464 adds `npm run test:merchandising` and `npm run test:homepage-merchandising` to `test:safe`. The first covers homepage eligibility plus curated section selection, ordering, and toggles; the second checks that server-resolved popular, best-seller, deal, and discounted IDs are actually passed to their rendered homepage rails. Neither command reads Payload, builds the app, calls providers, publishes, dispatches, calls Shopier, activates SupplierScout, revives retired channels, or spends.

D-465 adds `npm run test:obsidian-control` to `test:safe`, checking the root `00_HOME.md` through `04_ACTIVE_DECISIONS.md` notes against Payload/Next, Hermes/Mentix, optional OpenClaw/n8n, own-products-only, active-channel, retired-channel, SupplierScout, roadmap, and approval-gate truth. It also restores `npm run test:story-dispatch` to the safe chain so protected-brand story dispatch remains covered by the standard validation command. Both are local-only.

Order lifecycle coverage now includes Shopier `order.fulfilled` routing through the same `applyOrderStatus(..., 'ship', 'shopier_webhook')` helper as operator shipping actions, so shipment timestamps and audit-event source are checked locally before live webhook smoke.

Runtime smoke checks are separate from validation because they may connect to the real Payload database. The first guarded runtime check is:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
```

It loads local env files without printing secrets, forces `PAYLOAD_DB_PUSH=false`, reads one product, and reports lifecycle/readiness/stock/targets/activation blockers/coherence without writing or dispatching.

The guarded mutation smoke is:

```powershell
npm run smoke:activation:mutate -- --product=<smoke-product-id> --confirm-mutate-and-rollback
npm run smoke:activation:mutate -- --create-temp-smoke --confirm-create-mutate-delete
npm run smoke:activation:mutate -- --create-temp-smoke --admin-direct-update --confirm-create-mutate-delete
```

It is operator-run only and not part of `validate`. Existing-product mode requires a `SMOKE`/`TEST` draft, website-only targets, no external channel flags, and explicit confirmation. Temp mode creates a prepared website-only smoke draft from an existing media item. Helper mode activates through `approveAndActivateProduct()`. Admin-direct mode activates through a plain Payload `status='active'` update. Both verify active status, then roll back the product snapshot and delete smoke bot-events. Temp mode also deletes the temp product.

The guarded Product Flow Snapshot read-only smoke is:

```powershell
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product by id or stock number, builds the same lifecycle/readiness/activation/Image-QC/Shopier/dispatch/coherence/checklist-summary/dispatch-summary/operator-checklist/next-action snapshot used by Telegram `/productflow`, and never updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, or pushes schema changes.

The guarded Image Regeneration Plan read-only smoke is:

```powershell
npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product plus recent `image-generation-jobs`, builds the same Image QC/regeneration guidance used by Telegram `/imageplan`, and never updates Payload, queues image generation, dispatches channels, calls providers, calls Shopier, spends on ads, activates SupplierScout, activates retired channels, or pushes schema changes.

The guarded Product Loading Plan read-only smoke is:

```powershell
npm run smoke:load-plan:read -- --confirm-read-only
npm run smoke:load-plan:read -- --limit=200 --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads recent Payload products, builds the same prioritized loading/fix plan used by Telegram `/loadplan`, and never updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, spends on ads, activates SupplierScout, activates retired channels, or pushes schema changes.

The guarded provider-health read-only smoke is:

```powershell
npm run smoke:provider-health:read -- --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads AutomationSettings, evaluates Website/Instagram/Facebook/X/Shopier provider health through the same helper used by Telegram `/diagnostics`, and prints provider states plus missing key names only. It never prints secret values, updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, or pushes schema changes.

The guarded Product Intelligence provider-health smoke is:

```powershell
npm run smoke:pi-provider-health:read -- --confirm-read-only
```

It is operator-run only and not part of `validate`. It loads env files, evaluates Gemini text/image readiness, Google Vision, DataForSEO, SerpAPI, and effective reverse-search provider selection, and prints provider states plus missing key names only. It does not connect to Payload, call providers, print secret values, update data, queue jobs, dispatch channels, call Shopier, or push schema changes.

The guarded ad-readiness smoke is:

```powershell
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product by id or stock number, mirrors Telegram `/adready`, and reports product-page, clean-media, stock/size, channel-link, UTM, lead-visibility, brand-safety, risky-claim, no-autonomous-spend checks, and safe next-read hints including the D-452 storefront trust preflight for review/ready products. It never updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, spends on ads, or pushes schema changes.

The guarded ad-performance smoke is:

```powershell
npm run smoke:ad-performance:read -- --confirm-read-only
npm run smoke:ad-performance:read -- --period=month --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, mirrors Telegram `/adreport`, and reports UTM-tagged campaign rows, open/stale leads, won/lost/spam leads, related orders/revenue, conversion rate, average order value, untagged leads, and direct/unattributed orders from Payload. It never updates Payload, mutates leads/orders, queues jobs, dispatches channels, calls providers, calls Shopier, calls external ad APIs, spends on ads, or pushes schema changes.

The guarded Business/Funnel read-only smoke is:

```powershell
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:business-funnel:read -- --period=week --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, runs the same helpers as Telegram `/business` and `/funnel`, and reports lead, order, revenue, stock-urgency, source/funnel, direct-order, and attribution coverage counts. It never updates Payload, mutates leads/orders/stock, queues jobs, dispatches channels, calls providers, calls Shopier, spends on ads, or pushes schema changes.

The guarded Lead Follow-up Plan read-only smoke is:

```powershell
npm run smoke:lead-followup:read -- --confirm-read-only
npm run smoke:lead-followup:read -- --limit=12 --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, runs the same helper as Telegram `/leadplan` and `/followupplan`, and reports open lead counts, priority counts, and PII-light next actions from Payload. It never updates Payload, mutates leads, messages customers, queues jobs, dispatches channels, calls providers, calls Shopier, spends on ads, activates SupplierScout, activates retired channels, or pushes schema changes.

The guarded Shopier read-only smoke is:

```powershell
npm run smoke:shopier:read -- --confirm-read-only
npm run smoke:shopier:read -- --product=<id> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, mirrors `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` against real Payload state, and never updates Payload, queues jobs, dispatches channels, calls Shopier, or pushes schema changes.

The guarded Image QC schema check is:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
```

It is operator-run only and not part of `validate`. It checks PostgreSQL `information_schema` only and never runs DDL, updates Payload, queues jobs, dispatches channels, calls Shopier, or pushes schema changes.

The guarded Image QC schema apply helper is:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

Default mode is dry-run only and does not connect to PostgreSQL. Confirmed apply mode is operator-run only: it reads `scripts/sql/d355-image-qc-schema.sql`, requires the explicit confirmation flag, runs the reviewed DDL, then checks the D-355 columns/relation through `information_schema`. Codex/Claude should not run confirmed apply mode without explicit operator approval.

Latest schema/smoke attempt (2026-07-02): `smoke:imageqc:schema` ran read-only and passed: all 5 `image_quality_*` product columns and the `products_image_quality_defect_flags` relation are present. `db:imageqc:apply -- --dry-run --print-sql` remains a dry-run preview only and now reports SQL bytes `2484` and sha256 `c22e5c5a9b701fc8`. `smoke:product-flow:read -- --product=359 --confirm-read-only` completed without writes and showed product `359` active with all active targets, no coherence/channel drift, Image QC review as the current readiness blocker, Shopier already synced, and X dispatch failed due to credits depleted. `smoke:provider-health:read -- --confirm-read-only` completed without writes/jobs/dispatch/provider calls/Shopier calls/schema push and found Website ready, Instagram disabled in AutomationSettings, Facebook missing Page ID/webhook, X missing OAuth/webhook, and Shopier missing `SHOPIER_PAT`/webhook. `smoke:pi-provider-health:read -- --confirm-read-only` completed without Payload connection, provider calls, writes, jobs, dispatch, Shopier calls, or schema push; it found Gemini text/image ready, `GEMINI_IMAGE_GEN_MODEL` override present, and reverse search missing because Google Vision, DataForSEO, and SerpAPI credentials are not configured locally. `smoke:shopier:read -- --confirm-read-only --limit=5` completed without writes/jobs/dispatch/API calls and found 0 new publish candidates, 0 sync errors, 0 retry candidates, and `SHOPIER_PAT configured: no`. `smoke:ad-readiness:read -- --product=359 --confirm-read-only` completed without writes/jobs/dispatch/provider calls/Shopier calls/ad spend/schema push and correctly blocked manual ads until generated-image QC PASS is recorded, with one risky-claim warning. `smoke:business-funnel:read -- --confirm-read-only` completed without writes/jobs/dispatch/API calls/ad spend/schema push and found 6 open leads, 5 stale leads, 1 sold-out product, no open orders, and no today funnel activity; `--period=week` found 2 website leads and 1 attributed lead with UTM/referrer detail.

Latest runtime smoke verification: product `359` passed the read-only smoke on 2026-06-23 with readiness `6/6`, effective stock `10`, all active targets, no activation blockers, and no coherence issues. Product `359` also correctly refused the mutation smoke before mutation because it is a real active product with external targets. Helper temp-smoke created product `363`, activated it, verified `status=active`, restored state, deleted `2` smoke bot-events, and deleted the temp product. Admin-direct temp-smoke created product `364`, activated it by direct Payload update, verified `status=active`, `workflowStatus=active`, and `publishStatus=published`, restored state, and deleted the temp product. Both paths evaluated external channels as skipped; no channels dispatched and no Shopier job queued.

## Previous Validation Problem

The repo has existing validation noise:

- `npm run lint` uses `next lint`, which is invalid for the current Next version.
- TypeScript and ESLint now exclude stale generated/session artifacts.
- `sessions`, `tmp`, `.next`, and old generated build output are excluded from default checks.
- Old soak scripts import stale absolute paths and are quarantined in `project-control/HISTORICAL_SOAK_SCRIPTS.md`.

## Phase 1 Fixes

Added reliable scripts:

- `npm run typecheck`
- `npm run lint`
- `npm run test:brand-safety`
- `npm run test:product-media`
- `npm run test:product-stock`
- `npm run test:lifecycle`
- `npm run test:operator-readiness`
- `npm run test:source-pack`
- `npm run test:retired-channels`
- `npm run test:n8n-optional`
- `npm run test:ops-runbook`
- `npm run test:local-release-candidate`
- `npm run test:local-pr-review`
- `npm run test:runtime-smokes`
- `npm run test:soak-scripts`
- `npm run test:supplierscout-dormant`
- `npm run test:mentix-skills`
- `npm run test:openclaw-vps-verification` (standalone optional OpenClaw reactivation guard, not part of normal `test:safe` while Hermes is current)
- `npm run test:admin-visibility`
- `npm run test:product-channels`
- `npm run test:product-flow-snapshot`
- `npm run test:publish-readiness`
- `npm run test:business-desk`
- `npm run test:funnel-desk`
- `npm run test:lead-followup-plan`
- `npm run test:shopier-webhook-local`
- `npm run test:shopier-order-stock`
- `npm run test:shopier-refund-lifecycle`
- `npm run test:order-desk`
- `npm run test:catalog-qa`
- `npm run test:category-fill`
- `npm run test:operator-smoke-plan`
- `npm run test:image-quality`
- `npm run test:image-regeneration-plan`
- `npm run test:shopier-commands`
- `npm run test:shopier-publish-control`
- `npm run test:state-coherence`
- `npm run test:telegram-parser`
- `npm run test:confirmation-wizard`
- `npm run test:channel-dispatch`
- `npm run test:dispatch-status`
- `npm run test:provider-health`
- `npm run test:story-dispatch`
- `npm run test:pi-provider-health`
- `npm run test:provider-reality`
- `npm run test:redispatch`
- `npm run test:automation-decision`
- `npm run test:activation-guard`
- `npm run test:publish-desk`
- `npm run test:ad-readiness`
- `npm run test:ad-launch-pack`
- `npm run test:ad-performance`
- `npm run test:inquiry-guard`
- `npm run test:storefront-trust`
- `npm run smoke:activation:read` (operator-run, read-only runtime smoke; not part of `validate`)
- `npm run smoke:activation:mutate` (operator-run, guarded mutation smoke with rollback; not part of `validate`)
- `npm run smoke:product-flow:read` (operator-run, read-only Product Flow Snapshot smoke; not part of `validate`)
- `npm run smoke:image-plan:read` (operator-run, read-only `/imageplan` runtime smoke; not part of `validate`)
- `npm run smoke:provider-health:read` (operator-run, read-only provider-health smoke; not part of `validate`)
- `npm run smoke:pi-provider-health:read` (operator-run, env-only Product Intelligence provider-health smoke; not part of `validate`)
- `npm run smoke:ad-readiness:read` (operator-run, read-only ad/PDP readiness smoke; not part of `validate`)
- `npm run smoke:ad-performance:read` (operator-run, read-only `/adreport` smoke; not part of `validate`)
- `npm run smoke:business-funnel:read` (operator-run, read-only `/business` and `/funnel` smoke; not part of `validate`)
- `npm run smoke:lead-followup:read` (operator-run, read-only `/leadplan` and `/followupplan` smoke; not part of `validate`)
- `npm run smoke:imageqc:schema` (operator-run, read-only DB schema check; not part of `validate`)
- `npm run smoke:shopier:read` (operator-run, read-only Shopier command smoke; not part of `validate`)
- `npm run db:imageqc:apply` (operator-run, guarded D-355 schema apply helper; dry-run by default; not part of `validate`)
- `npm run test:safe`
- `npm run validate`

Excluded from validation:

- `sessions`
- `tmp`
- stale generated Next validator files
- broken historical soak scripts

Source-pack governance now checks that `chatgpt-project-sources/` stays at or below 20 Markdown files, required current-truth/roadmap/bot/ops/update/retirement files exist, active channel decisions remain Website/Instagram/Facebook/X/Shopier, SupplierScout remains dormant in the decision pack, and active control artifacts do not re-list Dolap/Threads.

Retired-channel governance checks that active code, n8n workflow stubs, package activation scripts, current decision docs, and Memory Lock handoff files do not reintroduce Dolap/Threads. Negative tests may still mention retired channels to prove they are rejected. D-450 specifically requires `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md` to keep active channels as Website/Instagram/Facebook/X/Shopier and Dolap/Threads retired, never scaffolded/planned/active.

n8n optionality governance checks that n8n remains optional glue, workflow JSON files stay limited to active-channel fallback paths, missing webhook env vars remain scaffold/no-throw behavior, package scripts do not activate n8n workflows, and the legacy automation endpoint remains Payload-first/draft-first.

Deployment ops runbook governance checks `project-control/DEPLOYMENT_OPS_RUNBOOK.md` for the current deploy, rollback, env-var, webhook-health, cron/job-runner, D-355 DB drift, n8n optionality, SupplierScout dormancy, retired-channel, source-pack, and GitHub PR workflow guardrails. It also quarantines the older `project-control/DEPLOY_CHECKLIST.md` as historical reference only, so its stale schema/provider assumptions and former seven-webhook wording cannot be used as a deployment procedure.

The load-plan runtime smoke prints the same first product worklist as Telegram `/loadplan`, including the D-425 `/productflow <ref>` handoff, D-427 exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` repo handoff beside each suggested action, and D-457 focus details beside each focus-queue command. Runtime-smoke governance checks that the smoke script keeps this output surface while remaining read-only.

Local release candidate governance checks `project-control/LOCAL_RELEASE_CANDIDATE.md` for the D-380-D-406 not-committed/not-deployed handoff boundary, current active-channel and dormant-system invariants, source-pack count, latest validation boundary, and explicit operator approval requirements before commit, PR, deploy, live smoke, Shopier/provider action, optional OpenClaw sync, or ad work.

Local PR review package governance checks `project-control/LOCAL_PR_REVIEW_PACKAGE.md` for the proposed PR title, scope summary, reviewer focus, validation commands, source-pack count, active-channel and dormant-system invariants, and explicit not-run/not-done claims before any commit, PR, deploy, live smoke, Shopier/provider action, optional OpenClaw sync, or ad work.

Runtime smoke governance checks that every documented read-only smoke command has a package script, a backing script, explicit `--confirm-read-only`/`READ_ONLY` confirmation, mutation refusal, no-write wording, schema-push protection where Payload is loaded, and synchronized docs in `AGENTS.md`, `CLAUDE.md`, `project-control/RUNTIME_SMOKE_CHECKS.md`, `project-control/DEPLOYMENT_OPS_RUNBOOK.md`, and this source-pack file. It also checks that `test:safe` does not run runtime smoke commands directly, because those checks are operator-run and may connect to real Payload/PostgreSQL data.

D-406 adds a runtime-smoke governance check that `smoke:shopier:read` includes the same `/shopier dashboard` batch review rows as Telegram. The smoke now passes `buildShopierDashboardReviewRows()` output to `formatShopierOperatorDashboard()`, so repo-side Shopier preview covers ready/blocked/queued/synced sample rows without writes, queueing, Shopier calls, provider calls, dispatch, ad spend, SupplierScout activation, retired-channel activation, or schema push. D-428 extends those rows with `flowCommand` and `runtimeFlowCommand`, so Telegram and repo-side Shopier dashboard samples show `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` before queue decisions.

D-429 extends `/shopier publish-ready`, `/shopier retry-errors`, and the matching runtime-smoke formatter output with product-flow preflight handoffs before confirm. `test:shopier-publish-control` checks preview rows and confirmed-output behavior; `test:shopier-commands` checks that missing `SHOPIER_PAT` blocks `confirm` queue/retry actions rather than read-only previews.

D-430 extends `/smokeplan` with a dedicated operator hold after Shopier dashboard/publish-ready/error/retry preview reads. `test:operator-smoke-plan` checks that the hold tells operators to use row-provided `/productflow <ref>` and exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.

D-431 extends `/smokeplan` with a dedicated Shopier credential/webhook readiness hold after row product-flow handoffs and before final queue approval. `test:operator-smoke-plan` checks that the hold tells operators to verify `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness outside chat without pasting secrets.

Historical soak-script governance checks `project-control/HISTORICAL_SOAK_SCRIPTS.md`, package scripts, `test:safe`, TypeScript/ESLint excludes, `.gitignore`, and source-pack references so old live-data `scripts/d*-soak*.ts` files stay quarantined. They are not read-only runtime smokes and must not be run without explicit operator approval.

Pointer: `project-control/HISTORICAL_SOAK_SCRIPTS.md`.

Operator smoke-plan validation checks that Telegram `/smokeplan` remains a read-only checklist for the safe live-smoke order, puts the D-437 Telegram access preflight before the first live Telegram read, puts the D-425 load-plan `/productflow <ref>` handoff before provider diagnostics, includes `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before `/imageplan <id-or-sn>`, includes the D-433 storefront trust preflight, D-434 inquiry guard preflight, D-435 attribution preflight, and D-436 sitemap preflight before manual ad-readiness checks, includes the local Shopier webhook preflight before Shopier runtime smoke, includes the D-430 Shopier row-handoff hold, includes the D-431 Shopier credential/webhook hold before the final queue approval hold, and does not include unsafe queue, publish, redispatch, or ad command variants. D-438 Product Flow Snapshot link behavior, D-458 checklist-summary behavior, and D-459 dispatch-summary behavior are covered by `npm run test:product-flow-snapshot`, including admin links for products with ids, public PDP links only for public statuses, done/next/blocked/needs-work summary counts before the full checklist, and active-channel dispatch-health counts before the dispatch rows. D-439 loading-plan worklist link behavior, D-454 batch-summary behavior, D-455 batch-focus behavior, D-456 focus-queue behavior, and D-457 focus-detail behavior are covered by `npm run test:loading-plan`, including the same public-status rule, priority/blocker counts, first-command handoff, focus label/reason, next safe read, focus refs, matching focus queue commands, and reason details beside queued commands. D-440 Shopier preview/dashboard link behavior is covered by `npm run test:shopier-publish-control`, including admin links, public-status PDP links, preview output, dashboard output, and confirmed-output suppression. D-441 Shopier preview credential-hold behavior is covered by `npm run test:shopier-publish-control`, including missing/available `SHOPIER_PAT` hints and confirmed-output suppression. D-442 lead follow-up link behavior is covered by `npm run test:lead-followup-plan`, including lead-admin links, related product-admin links, public-status PDP gating, and formatter output. D-443 operator inbox link behavior is covered by `npm run test:operator-inbox`, including admin links, public-status PDP gating, formatter reuse, and absence of unsafe action commands. D-444 lead desk link behavior is covered by `npm run test:lead-desk`, including shared lead-admin/product-admin/PDP links for lead list lines, detail cards, new-lead alerts, public-status PDP gating, and absence of unsafe action commands. D-445 order desk link behavior is covered by `npm run test:order-desk`, including shared order-admin/product-admin/lead-admin/PDP links for order list lines, detail cards, new-order alerts, public-status PDP gating, and absence of unsafe action commands. D-446 business snapshot hint behavior is covered by `npm run test:business-desk`, including safe next-read hints and absence of unsafe Shopier confirm/ad launch commands. D-447 funnel snapshot hint behavior is covered by `npm run test:funnel-desk`, including safe next-read hints and absence of unsafe Shopier confirm/ad launch commands. It is covered by `npm run test:operator-smoke-plan` and included in `test:safe`.

Image regeneration plan validation checks that `/imageplan` and `/regenplan` remain read-only guidance for Image QC REVIEW/FAIL, rejected visuals, active generation jobs, and preview approval/regeneration states. It is covered by `npm run test:image-regeneration-plan` and included in `test:safe`; the helper suggests manual commands but does not write products, queue image-generation jobs, call providers, publish, dispatch, call Shopier, or spend on ads.

Image-plan runtime smoke governance checks that `smoke:image-plan:read` has a package script, explicit read-only confirmation, mutation refusal, no-write wording, `PAYLOAD_DB_PUSH=false`, and synchronized docs. It is covered by `npm run test:runtime-smokes`; the smoke is operator-run only and not executed by `validate`.

Shopier command governance checks that Telegram `/shopier publish` and `/shopier republish` resolve product identifiers and call the shared `queueShopierSync()` gate, rather than directly updating `sourceMeta.shopierSyncStatus` or enqueueing `shopier-sync` jobs inside the Telegram route. It also checks `/shopier publish-ready` and `/shopier retry-errors` continue to use the same helper behind preview/confirm flows.

SupplierScout dormancy validation checks that `/api/supplier-scout` is gated by `SUPPLIER_SCOUT_ENABLED=true` before webhook processing, daily reports, or webhook registration can run; that Vercel has no SupplierScout cron; that package scripts do not activate it; and that the repo/source-pack guidance still says it is dormant.

Hermes/Mentix skill governance validation checks that repo-side skill docs keep Hermes as the current agent-control layer, Payload/Next as the source of truth, n8n as optional glue only, active channels as Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, SupplierScout dormant, and OpenClaw as historical/optional unless explicitly reactivated.

After D-390 it also checks that Hermes/Mentix live-smoke guidance points to `/smokeplan` first, that the skill dashboard does not present n8n as the default product creation path, and that optional OpenClaw sync notes stay verification-first rather than mandatory live infrastructure.

D-401 adds `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` and standalone `npm run test:openclaw-vps-verification`. This keeps optional OpenClaw reactivation verification-first: repo skill files are expected state/history, not proof of deployed VPS state, and no copy/restart/live prompt should happen until OpenClaw is explicitly reactivated and read-only VPS directory, log, and Telegram prompt evidence is recorded.

D-403 adds `project-control/PROVIDER_REALITY_AUDIT.md` and `npm run test:provider-reality`. This keeps provider reality audit guidance aligned: local env readiness is not production provider readiness, and no Gemini, Google Vision, DataForSEO, SerpAPI, Meta, X, Shopier, n8n, credit-spend, queue, publish, live Telegram, SupplierScout, or retired-channel action should happen from the audit without explicit operator approval.

## D-481 Shopier Order-ID Schema Guard

Inbound Shopier `order.created` receives a narrow duplicate-key exit before any
stock mutation, and `Orders.shopierOrderId` now declares uniqueness. The
reviewed PostgreSQL partial unique index is applied and verified in the
configured database, completing the database-side concurrent-delivery guard.

The operator-run metadata preflight is read-only and refuses mutation flags:

```powershell
npm run smoke:shopier-order-id-schema:read -- --confirm-read-only
```

It checks `information_schema`, `pg_indexes`, and duplicate non-empty
`orders.shopier_order_id` values only. The separate migration command defaults
to dry-run without a database connection:

```powershell
npm run db:shopier-order-id-unique:apply -- --dry-run --print-sql
npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique
```

Never run the confirmed command without explicit operator approval. It rejects
the migration when duplicate IDs exist; the approved 2026-07-25 apply has
already been followed by a passing read-only preflight and
`npm run test:shopier-webhook-local`. A live webhook smoke still needs separate
configured operator approval.

## D-482 Shopier Order Transaction Guard

The local `order.created` core now creates the Order and applies its product or
variant stock updates plus InventoryLog writes through one Payload adapter
transaction request. It fails closed before writes when a transaction cannot
start. A valid, verified webhook event that cannot complete returns `500`, which
asks Shopier to retry instead of acknowledging a partial order. The direct
Telegram order alert runs after commit; the generic Orders alert hook skips
Shopier orders so it cannot send an early or duplicate alert.

Use these local-only checks before any separately approved live webhook work:

```powershell
npm run test:payload-transaction
npm run test:shopier-order-transaction
npm run test:shopier-webhook-local
```

These checks do not connect to PostgreSQL, call Shopier, dispatch a channel, or
send Telegram. D-482 does not replace the D-481 partial unique index; that
index is now applied and read-only verified. Live webhook delivery still needs
separate configured operator approval.

## D-483/D-484 Non-Shopier Order Stock Guard

The Orders collection runs non-Shopier stock mutation before its generic
new-order alert and uses the parent Payload request for product/variant stock,
InventoryLog, and stock-reaction operations. A missing product or size, unknown
variant, or insufficient stock throws rather than being swallowed, so the parent
Payload create transaction rolls back the order. Lifecycle reactions stay
advisory after the core mutation.

D-484 also keeps the stock threshold in the PostgreSQL update itself: the
reservation succeeds only when `stock >= quantity` in the active Payload
transaction. This prevents two concurrent non-Shopier requests from both
overwriting the same last unit after stale reads. A zero-row reservation throws
before the InventoryLog write, so the parent create rolls back.

## D-485 Shopier Atomic Floor-At-Zero Decrement

Shopier `order.created` remains transactional under D-482. D-485 replaces its
read-then-write decrement with transaction-bound PostgreSQL arithmetic for the
product total and selected variant: `GREATEST(stock - quantity, 0)`. Paid
external orders remain recorded and audited even when local stock has already
reached zero, while concurrent distinct deliveries cannot overwrite each
other's depletion and leave a falsely high local count.

Run the local-only guard before releasing an order-flow change:

```powershell
npm run test:order-stock-transaction
```

It uses in-memory hook tests plus local Payload implementation governance; it
does not connect to PostgreSQL, write Payload data, send Telegram, call Shopier,
or dispatch a channel.

## Deployment Checks

Current runbook: `project-control/DEPLOYMENT_OPS_RUNBOOK.md`.

Before deploy:

- Typecheck/lint/validate pass or known exceptions are documented.
- `project-control/LOCAL_RELEASE_CANDIDATE.md` is current when a local stack is being prepared for commit/PR/deploy review.
- `project-control/LOCAL_PR_REVIEW_PACKAGE.md` is current when a local stack needs Claude/Codex/GitHub review notes.
- Before reactivating, deploying, or syncing OpenClaw skills, run `npm run test:mentix-skills`, run standalone `npm run test:openclaw-vps-verification`, follow `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md`, and use `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` before any copy, restart, or live prompt.
- Before claiming provider readiness, run `npm run test:provider-reality` and follow `project-control/PROVIDER_REALITY_AUDIT.md`; local env readiness is not production provider readiness.
- Env var changes are listed.
- Payload schema changes are understood.
- Vercel cron changes are checked.
- Telegram webhooks are checked when bot code changes.
- Shopier job processing is checked when publishing changes.
- For activation/product-flow changes, run the read-only runtime smoke on one prepared product before manual admin/Telegram activation smoke. Product `359` is the current known-good activation read-only smoke baseline. Use `smoke:product-flow:read` when the change affects `/productflow`, readiness summaries, Shopier gate summaries, dispatch summaries, or next-action guidance.
- For loading-plan worklist changes, run `npm run test:loading-plan` and, before live Telegram use, `npm run smoke:load-plan:read -- --confirm-read-only`; D-427 expects first product rows to show the suggested action, `/productflow <ref>` handoff, and exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` repo handoff. D-439 also expects admin/PDP operator links on worklist rows, with PDP links limited to public product statuses. D-454/D-455/D-456/D-457 expect the batch summary, batch focus, focus refs, focus queue, and focus reason details to stay aligned between Telegram `/loadplan` and the repo-side smoke.
- For Shopier preview/dashboard changes, run `npm run test:shopier-publish-control` and, before live Telegram use, `npm run smoke:shopier:read -- --confirm-read-only`; D-440 expects preview/review rows to show admin/PDP operator links with PDP links limited to public product statuses, while confirmed queue/retry output stays free of preview-only links.
- For Shopier credential-preview changes, run `npm run test:shopier-publish-control` and, before live Telegram use, `npm run smoke:shopier:read -- --confirm-read-only`; D-441 expects publish-ready/retry previews to show `SHOPIER_PAT` configured yes/no without printing secret values, while confirmed queue/retry output stays free of preview-only credential hints.
- For lead follow-up link changes, run `npm run test:lead-followup-plan` and, before live Telegram use, `npm run smoke:lead-followup:read -- --confirm-read-only`; D-442 expects lead-admin links for every row, product-admin links when a related product exists, and public PDP links only for related products with public status.
- For lead desk link changes, run `npm run test:lead-desk`; D-444 expects lead-admin links, related product-admin links, public PDP links only for public related products, and no unsafe action commands.
- For order desk link changes, run `npm run test:order-desk`; D-445 expects order-admin links, related product-admin links, related lead-admin links, public PDP links only for public related products, and no unsafe action commands.
- For business snapshot next-action changes, run `npm run test:business-desk`; D-446 expects safe next-read hints only and no unsafe Shopier confirm/ad launch commands.
- For funnel snapshot next-action changes, run `npm run test:funnel-desk`; D-447 expects safe next-read hints only and no unsafe Shopier confirm/ad launch commands.
- For ad-readiness next-action changes, run `npm run test:ad-readiness`; D-448 expects safe next-read/copy-draft hints only and no unsafe Shopier confirm/ad launch commands.
- For smoke-plan title/boundary changes, run `npm run test:operator-smoke-plan`; D-449 expects the formatted plan to show `Operator Live Smoke Plan (D-389/D-449)` without changing the read-only command order.
- For operator inbox link changes, run `npm run test:operator-inbox`; D-443 expects product admin links for `/inbox` product rows, public PDP links only for public product statuses, and no unsafe action commands.
- For Shopier dashboard batch review changes, run `npm run test:shopier-publish-control` and `npm run test:runtime-smokes`; D-428 expects each sample row to keep `nextAction`, `/productflow <ref>`, and exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` repo handoff without queueing.
- For Shopier publish-ready or retry preview changes, run `npm run test:shopier-publish-control` and `npm run test:shopier-commands`; D-429 expects preview rows to show product-flow handoffs and missing `SHOPIER_PAT` to block only confirmed queue/retry actions.
- For `/smokeplan` Shopier handoff changes, run `npm run test:operator-smoke-plan`; D-430 expects the plan to pause on Shopier row `/productflow <ref>` plus exact repo product-flow smoke handoffs before any Shopier confirm action.
- For `/smokeplan` Shopier credential-hold changes, run `npm run test:operator-smoke-plan`; D-431 expects the plan to verify `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness outside chat before any Shopier confirm action.
- For operator smoke-plan ordering changes, run `npm run test:operator-smoke-plan`; D-426 expects the load-plan-selected product-flow runtime and Telegram checks to happen before provider diagnostics.
- For Image QC, image regeneration guidance, or `/imageplan` changes, run `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before relying on live Telegram `/imageplan` or deciding whether to run manual `#gorsel`.
- For provider or external-channel dispatch changes, run `npm run smoke:provider-health:read -- --confirm-read-only` before relying on `/diagnostics`, redispatch, Shopier queueing, or external-channel publishing checks.
- For Product Intelligence, GEO, comparison, or provider-selection changes, run `npm run smoke:pi-provider-health:read -- --confirm-read-only` before relying on Gemini, Google Vision, DataForSEO, SerpAPI, or reverse-search capability.
- For PDP conversion, UTM, manual ad checklist, or lead-path changes, run `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` before treating a product as ready for manual ads or paid traffic.
- For lead/order/funnel/stock-urgency visibility changes, run `npm run smoke:business-funnel:read -- --confirm-read-only` and, when source attribution matters, `npm run smoke:business-funnel:read -- --period=week --confirm-read-only`.
- For open-lead next-action changes, run `npm run smoke:lead-followup:read -- --confirm-read-only` before relying on Telegram `/leadplan` or `/followupplan`.
- For Shopier webhook order/refund changes, run `npm run test:shopier-webhook-local` before any live webhook smoke. It combines the local stock reconciliation and refund lifecycle checks.
- `npm run test:shopier-order-stock` is local-only and covers product-level stock, variant stock, refund restore, skipped mismatched sizes, inventory logs, and dispatch-loop-safe update context.
- `npm run test:shopier-refund-lifecycle` is local-only and covers `refund.requested` idempotency before stock restore, `refund.updated` idempotent order-note updates, missing-order no-write behavior, and audit-event best effort without duplicate stock mutation.
- For mutation-path proof, prefer the temp smoke commands. Use helper mode for Telegram/Publish Desk logic and `--admin-direct-update` for direct admin-save behavior. Existing-product mode is only for prepared website-only `SMOKE`/`TEST` drafts. Never use it on a real catalog product.
- For D-355 Image QC DB drift, preview with `npm run db:imageqc:apply -- --dry-run --print-sql`; run confirmed apply mode only with explicit operator approval, then rerun `smoke:imageqc:schema`, `smoke:provider-health:read`, `smoke:pi-provider-health:read`, `smoke:product-flow:read`, `smoke:image-plan:read`, `smoke:ad-readiness:read`, and `smoke:shopier:read`.

## Webhook Health

Track:

- Telegram webhook URL
- pending update count
- last error
- secret/header status
- slow handler/read-timeout risk

## Rollback Needs

Maintain:

- deployment log
- last known good commit
- env var map
- manual rollback steps
