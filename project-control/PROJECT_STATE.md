# PROJECT STATE — Uygunayakkabi

_Last updated: 2026-07-25 (D-501 mobile PDP CTA overflow correction, D-500 Meta provider configuration unification, approved read-only provider-health evidence, and verified Vercel Production deployment.)_

## D-501 mobile PDP CTA overflow correction - 2026-07-25 (LOCAL CODE/DOCS, not deployed)

- Read-only 390px production smoke found the Classic Loafer PDP at 440px document width: the fixed mobile CTA used a 40/60 flex split plus content-box padding, creating 50px of horizontal overflow. The homepage remained at 385px document width with no horizontal overflow.
- Both fixed CTA controls now use `boxSizing: 'border-box'` and `minWidth: 0`, so their padding remains inside the 40/60 split. `scripts/storefront-trust-governance.ts` asserts that contract alongside existing PDP conversion requirements.
- `npm run test:storefront-trust`, `npm run typecheck`, `npm run lint`, and `git diff --check` pass. This correction has not been deployed; repeat the 390px PDP smoke after an approved release. It makes no Payload write, provider call, Shopier call, Telegram action, n8n action, SupplierScout activation, retired-channel activation, or ad action.

## D-500 Meta provider configuration unification - 2026-07-25 (LOCAL CODE/DOCS, configured read passed, source release deployed)

- `src/lib/metaProviderCredentials.ts` is the one source for Meta direct dispatch and provider-health. Facebook resolves its Page ID from deployment env `INSTAGRAM_PAGE_ID`, rather than the intentionally removed Payload `facebookPageId` column. The old caller-side mutation in Products/redispatch was removed; legacy in-memory snapshots remain compatible.
- `.env.example` now excludes retired Dolap/Threads fallback variables and lists the four X OAuth 1.0a variables required by the current direct X adapter.
- Approved read-only provider-health smoke at 2026-07-25 20:04 Europe/Istanbul: Website `ready/native`, Instagram `disabled/none` by AutomationSettings, Facebook `ready/direct`, X missing its four OAuth 1.0a values and optional fallback webhook, Shopier missing `SHOPIER_PAT` and optional fallback webhook. No write, job, dispatch, provider call, Shopier call, or schema push occurred.
- `test:provider-health`, `test:meta-provider-credentials`, `test:channel-dispatch`, full `npm run validate`, `npm run build`, and the CRLF-aware `git diff --check` pass. Approved PR review merged the D-380-D-500 stack through PR #6; Vercel Production deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready and public homepage/PDP smoke checks pass. No live Telegram action or provider action occurred. Local release boundary: D-500.

## D-499 protected-brand per-product diagnostic alignment - 2026-07-25 (LOCAL CODE/DOCS, read-only recheck passed, not deployed)

- `src/lib/productFlowSnapshot.ts` and `src/lib/imageRegenerationPlan.ts` now give a protected-brand product only the preview-first provenance review path. They withhold Image QC, generation, activation, Shopier, redispatch, and ad-action suggestions until that review.
- They read the latest product provenance BotEvent too, so recorded `needs_evidence`, `unbranded_copy_fix`, and `not_approved_for_sale` decisions show the correct manual next step without changing the product or lifting the hard block.
- Rechecking active `SN0111` against configured Payload state now makes `/brandreview 448 needs-evidence` its primary Product Flow step and gives Image Plan state `brand_review_first`; no data or external action occurred.
- `test:product-flow-snapshot`, `test:image-regeneration-plan`, full `npm run validate`, `npm run build`, and `git diff --check` pass. No release action occurred.

## D-499 batch Image QC remediation queue - 2026-07-25 (LOCAL CODE/DOCS, configured read passed, not deployed)

- `src/lib/imageQcRemediationPlan.ts` powers read-only `/imageqcplan` and `smoke:image-qc-plan:read`. It sends protected-brand records to provenance review first and gives all other Image QC backlog rows only Image Plan/Product Flow handoffs.
- The approved 100-product read found 55 queue records: 13 brand-review-first, 28 QC failures, 14 QC decisions needed, no missing-original-media, and no explicit review rows. No Image QC decision, generation job, product write, provider/Shopier call, dispatch, or spend occurred.
- `test:image-qc-remediation-plan`, `test:operator-smoke-plan`, `test:runtime-smokes`, typecheck, `git diff --check`, full `npm run validate`, and `npm run build` pass. Local release boundary: D-499.

## D-498 brand remediation provenance-state workflow - 2026-07-25 (LOCAL CODE/DOCS, configured read passed, not deployed)

- `src/lib/brandSafetyRemediationPlan.ts` now retains each protected-brand item's recorded provenance state and derives one safe next step. Stored external exposure is always a manual verification cue; it does not prove a listing exists or authorize cleanup.
- The read-only plan counts both provenance state and products with stored Facebook/Instagram/X/Shopier history. The approved 100-product read found 13 blockers, all `not_recorded`, and 9 with external history.
- `test:brand-safety-plan`, `test:runtime-smokes`, typecheck, `git diff --check`, full `npm run validate`, and `npm run build` pass. Local release boundary: D-498.

## D-497 brand remediation external-exposure visibility - 2026-07-25 (LOCAL CODE/DOCS, configured read passed, not deployed)

- `src/lib/brandSafetyRemediationPlan.ts` now converts recorded dispatch notes into a deterministic external-exposure summary for Facebook, Instagram, X, and Shopier. It includes only `published`, `queued`, and `failed`; Website is native and excluded.
- `/brandplan` and `smoke:brand-safety:read` display the evidence as stored history only. They do not inspect a remote listing, change a product, clean up a remote post, retry, queue, publish, dispatch, call providers or Shopier, or spend on ads.
- Approved real-catalog read: 13 protected-brand records in the 100-product sample. `SN0111` records Facebook published, Shopier queued, and X failed; the operator must still verify provenance and remote state manually before any cleanup decision.
- `test:brand-safety-plan`, `test:runtime-smokes`, typecheck, `git diff --check`, full `npm run validate`, and `npm run build` pass. Local release boundary: D-497.

## D-496 lead-followup runtime smoke completeness - 2026-07-25 (LOCAL CODE/DOCS, configured read passed, not deployed)

- The temporary read-only Payload configuration for `smoke:lead-followup:read` now registers BlogPosts with Products, matching Products' `linkedBlogPost` relationship. This fixes a smoke-harness configuration failure; it is not database DDL or a product/lead behavior change.
- `test:runtime-smokes`, typecheck, full `npm run validate`, `npm run build`, and `git diff --check` pass. The approved read returns six open stale leads with PII-light manual next actions and performs no writes, messages, queues, provider calls, Shopier calls, schema pushes, or ad action. Local release boundary: D-496.

## D-495 Meta public-media dispatch preflight - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- Instagram/Facebook now return a media-specific failed dispatch result before direct Meta or optional n8n fallback when no public HTTPS gallery image exists. A configured fallback remains visible, but no relative-media request is sent.
- Mocked `test:channel-dispatch` coverage proves both Meta channels make zero fetch calls in this case. Full `npm run validate` and `npm run build` pass locally; production media reachability, provider permissions, and real delivery remain unproven.

## D-494 Meta gallery media selection alignment - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- Instagram and Facebook direct dispatch now select any public HTTPS gallery image. A relative or insecure first image no longer forces optional fallback when a later public image is available.
- Mocked `test:channel-dispatch` coverage proves both direct adapter branches use the later valid image without external access. Full `npm run validate` and `npm run build` pass locally; production media reachability, Meta permissions, and real delivery remain unproven.

## D-493 X direct/fallback provider readiness alignment - 2026-07-25 (LOCAL CODE/DOCS, focused validation passed, not deployed)

- X direct dispatch now requires the same complete OAuth set used by the provider-health evaluator: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET`. A partial configuration uses optional `N8N_CHANNEL_X_WEBHOOK` only when configured; without it, the dispatch records the missing credential names instead of calling X directly.
- `test:channel-dispatch`, `test:provider-health`, `test:redispatch`, `test:dispatch-status`, full `npm run validate`, and `npm run build` pass locally. No provider, webhook, Payload, queue, deploy, commit, branch, or PR action occurred. Production X provider readiness remains unproven.

## D-481 configured-database index applied and verified - 2026-07-25

- After approved preflight and dry-run review, the concurrent partial unique index `orders_shopier_order_id_unique_idx` was applied with SQL fingerprint `c79810ec7a084bfc`. The post-apply read-only check passes with zero duplicate non-empty IDs; PostgreSQL's canonical `btrim((shopier_order_id)::text)` predicate form is recognized by the verifier.
- `npm run test:shopier-webhook-local` passes locally. This completes database-side duplicate-delivery protection, but no live Shopier webhook/API delivery, application deploy, commit, branch, PR, provider call, or business-data write was performed.

## D-491 order-to-lead relationship schema governance - 2026-07-25 (LOCAL CODE/DOCS, focused validation passed, not deployed)

- A missing deployed `orders.related_inquiry_id` relationship now blocks manual lead conversion during its read-only idempotency lookup, before any order, lead-status, or BotEvent audit write. Telegram shows only the confirmation-gated `npm run smoke:lead-conversion-schema:read -- --confirm-read-only` handoff, never executable DDL.
- `npm run db:lead-conversion-schema:apply -- --dry-run --print-sql` opened no database connection. The approved 2026-07-25 read-only preflight confirms the nullable integer column and its `customer_inquiries.id` foreign key already exist, so no DDL was needed. The helper remains for future incomplete environments and refuses incompatible existing schema. `test:lead-conversion-schema`, full `npm run validate`, `npm run build`, and `git diff --check` pass; Telegram, provider, Shopier, deployment, commit, and PR actions remain unrun.

## D-490 lead-status enum schema governance - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- A CustomerInquiries enum-drift write now leaves the lead unchanged and creates no BotEvent audit record. Telegram shows only the confirmation-gated `npm run smoke:lead-status-schema:read -- --confirm-read-only` handoff, never raw DDL.
- `npm run db:lead-status-enum:apply -- --dry-run --print-sql` opened no database connection. The approved 2026-07-25 read-only preflight confirms every declared CustomerInquiries status enum value already exists, so no DDL was needed. The helper remains for future incomplete environments and refuses a missing or incompatible baseline enum. `test:lead-status-schema`, `test:lead-desk`, full `npm run validate`, `npm run build`, and `git diff --check` pass. Telegram, provider, Shopier, deployment, commit, and PR actions remain unrun.

## D-489 confirmation-wizard schema governance - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- Telegram confirmation no longer creates `wizard_sessions` or alters the product category enum. It reads and writes rows only after `public.wizard_sessions` is provisioned through the guarded deployment path; a missing table is logged with the D-489 remediation rather than created at request time.
- `npm run smoke:wizard-sessions:schema -- --confirm-read-only` is metadata-only and separate from normal validation. The approved 2026-07-25 read-only preflight confirms `public.wizard_sessions` is complete, so no DDL was needed. `npm run db:wizard-sessions:apply -- --dry-run --print-sql` remains available only for a future incomplete environment after explicit operator approval. `test:confirmation-wizard`, `test:runtime-smokes`, full `npm run validate`, `npm run build`, and `git diff --check` pass. Telegram, provider, Shopier, deployment, commit, and PR actions remain unrun.

## D-488 optional OpenClaw VPS deploy guard - 2026-07-25 (LOCAL CODE/DOCS, focused tests passed, not deployed)

- The historical `scripts/vps-deploy.sh` now refuses bare and one-flag calls before any VPS configuration write, skill copy, or container restart. Legacy OpenClaw sync requires both `--reactivate-openclaw` and `--confirm-vps-sync` after recorded read-only VPS verification and a separate operator reactivation decision. `test:openclaw-vps-verification`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally; Hermes/Mentix remains current and no VPS, Telegram, provider, Shopier, deploy, commit, or PR action occurred.

## D-487 shared Blog and PDP JSON-LD serialization - 2026-07-25 (LOCAL CODE/DOCS, focused tests passed, not deployed)

- Product/FAQ and Blog Article schema now use `src/lib/structuredData.ts` rather than raw `JSON.stringify` in an inline script. Stored content cannot terminate the schema script early while parsed JSON stays unchanged. `test:structured-data`, `test:blog-structured-data`, and typecheck pass locally. No database, Payload, Blog publication, provider, Shopier, dispatch, deploy, commit, or PR action occurred.

## D-486 storefront image fallback and structured data safety - 2026-07-25 (LOCAL CODE/DOCS, focused tests passed, not deployed)

- Public PDP and similar-product cards now prefer usable generated-gallery media but fall back to original product media. The same resolved gallery feeds Product JSON-LD; offer availability uses the shared sellable-stock summary rather than status alone, and inline Product/FAQ JSON-LD is safely serialized. `test:product-storefront-images`, `test:product-structured-data`, `test:storefront-trust`, and typecheck pass locally. No database, provider, Shopier, Telegram, dispatch, deploy, commit, or PR action occurred.

## D-485 Shopier atomic floor-at-zero decrement - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- D-482's webhook transaction now uses D-485 atomic floor-at-zero arithmetic for product totals and selected variants. Concurrent distinct Shopier orders cannot overwrite depletion and leave falsely high local stock; external paid orders and InventoryLogs remain intact at zero local stock. `test:shopier-webhook-local`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally. D-481's separate index is applied and post-apply verified.

## D-484 non-Shopier conditional stock reservation - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- D-483's transaction boundary now uses D-484 conditional PostgreSQL stock reservations. Product total, then selected variant, updates only when `stock >= quantity`; a concurrent last-unit loser gets no row and throws before InventoryLog creation. `npm run validate`, `npm run build`, and `git diff --check` pass locally. No live order, Shopier, Telegram, provider, dispatch, deploy, commit, or PR action occurred. D-481's separate index is applied and post-apply verified.

## D-483 non-Shopier order stock transaction boundary - 2026-07-25 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- The Orders collection now performs non-Shopier product/variant stock and InventoryLog work before the generic new-order alert, carrying the parent Payload request through the core mutation and stock reaction. Missing product/size, unknown variant, and insufficient-stock cases throw so Payload can roll back the parent Order create rather than persist stock drift.
- `test:order-stock-transaction`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally. No database access, Payload write, Telegram message, Shopier call, provider call, dispatch, deploy, commit, or PR was run. D-481's separate database index is applied and post-apply verified.

## D-482 Shopier order transaction boundary - 2026-07-24 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- `handleOrderCreated()` now creates the local Order and applies product/variant stock plus InventoryLog writes with one Payload adapter transaction request. The helper fails closed before writes when no transaction can start.
- A verified event that cannot complete returns `500` for Shopier retry. The generic Orders alert hook skips Shopier, and the webhook notification runs only after commit. `test:payload-transaction`, `test:shopier-order-transaction`, `test:shopier-order-stock`, `test:shopier-order-id-unique`, `test:shopier-webhook-local`, full `npm run validate`, and `npm run build` pass; no database metadata preflight, DDL, live webhook/API, or Payload write was run. D-481's unique index is applied and post-apply verified.

## D-481 Shopier order-ID duplicate-safety guard - 2026-07-24 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- `Orders.shopierOrderId` now declares `unique: true`, while the inbound Shopier handler narrows PostgreSQL duplicate-key handling to order creation and returns before stock decrement or Telegram notification.
- The reviewed partial `CREATE UNIQUE INDEX CONCURRENTLY` plan remains dry-run-first for other environments. Its approved 2026-07-25 apply is post-apply verified in the configured database with zero duplicate non-empty IDs; live webhook/API evidence remains unrun.

## D-480 Shopier webhook authenticity fail-closed guard - 2026-07-24 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- `shopierWebhookSecurity.ts` verifies the existing documented HMAC-SHA256 signature against the exact raw request body using constant-time comparison. Comma-separated `SHOPIER_WEBHOOK_TOKEN` rotation remains supported.
- The route returns `503` when signing configuration is absent and `401` for missing, malformed, or invalid signatures before JSON parsing, order writes, stock/refund mutation, or Telegram notification. `test:shopier-webhook-security`, `test:shopier-webhook-local`, full `npm run validate`, and `npm run build` pass; no live Shopier webhook or API call was run.

## D-479 Blog editorial preflight and first-publication guard - 2026-07-24 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- `evaluateBlogPublishingPreflight()` defines a shared editorial standard: title, slug, excerpt, readable body, placeholder refusal, AI/evidence-sensitive review items, and SEO/editorial warnings. First transitions to `published` refuse blockers, set a missing `publishedAt`, and leave legacy published edits alone.
- `/blogpreflight <id-or-slug>` and `smoke:blog-preflight:read` expose the same diagnostic without writing or publishing. The public blog detail query now filters to `published` before metadata generation. Blog evaluator/collection/route/runtime governance checks, full `npm run validate`, and `npm run build` pass; no live Telegram, Payload, provider, or publication action was run.

## D-478 provenance review delivery idempotency - 2026-07-24 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- A confirmed `/brandreview` now records an opaque Telegram delivery key with its BotEvent. When Telegram retries that same update, the command returns the original review instead of creating a second audit record.
- This changes audit reliability only. It does not update the product, clear brand safety, activate, publish, dispatch, queue Shopier, or call a provider. Focused provenance tests, full `npm run validate`, and `npm run build` pass. No live Telegram command or Payload write was run.

## D-477 protected-brand provenance review audit - 2026-07-24 (LOCAL CODE/DOCS, full validation/build passed, not deployed)

- `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` is preview-first. Only explicit confirmation creates one `brand_safety.provenance_reviewed` BotEvent for the selected protected-brand blocker.
- It does not update the product, clear brand safety, activate, publish, dispatch, queue Shopier, or call a provider. `/brandplan` and its read-only runtime smoke show the latest valid review record so operators can distinguish unreviewed work from a documented evidence decision.
- `test:brand-provenance-review`, `test:brand-provenance-command`, `test:brand-safety-plan`, full `npm run validate`, and `npm run build` pass locally. No live Telegram command or Payload write was run.

## D-476 Catalog risk-first loading-plan order - 2026-07-24 (LOCAL CODE, full validation/build passed, not deployed)

- The read-only loading plan now ranks an active protected-brand product ahead of a draft protected-brand product, even when the draft has more secondary blockers. This matches the existing brand-remediation plan's exposure-first review discipline.
- Worklist rows now display status. `test:loading-plan`, full `npm run validate`, and `npm run build` pass locally. No product record, queue, publish, dispatch, provider/Shopier integration, or ad spend is touched.

## D-475 Direct Telegram UTM guard - 2026-07-24 (LOCAL CODE, full validation/build passed, not deployed)

- `/utm` now resolves the product at `depth: 1` and checks a shared pure eligibility helper before it returns a URL. A product must have a slug, be active, and pass the placeholder/protected-brand public storefront gate.
- `test:utm-builder` covers the allowed/refused product states and `test:utm-command` pins the Telegram route to that guard before URL construction. Full `npm run validate` and `npm run build` pass locally. No product record, queue, publish, dispatch, provider/Shopier integration, or ad spend is touched.

## D-474 Safe public PDP link policy - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- `isPublicStorefrontProduct()` now owns the combined public-status and storefront-safety decision. Brand remediation, loading plans, Shopier previews, operator inbox, lead desk, order desk, and ad readiness retain admin links but no longer point an operator or ad UTM at a public PDP the storefront hides.
- Focused link/ad tests, full `npm run validate`, and `npm run build` pass locally. The change is display/diagnostic only: it does not alter products, create queues, publish, dispatch, contact a provider or Shopier, or spend on ads.

## D-473 Product Flow Website visibility truth - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- Product Flow previously treated a Website target as published even for a draft product. It now passes public status and shared storefront safety into the dispatch overview, which blocks Website for drafts, placeholder titles, and protected-brand records even if a legacy dispatch note says published.
- Product Flow PDP links use the same safe-public condition. `test:dispatch-status`, `test:product-flow-snapshot`, typecheck, lint, full validation, and production build pass locally. The read-only `SN0077` recheck reports Website `Blocked`, `published 0/4`, and no public URL, with no data mutation or external action.

## D-472 Verified storefront metrics gate - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- The homepage no longer falls back to `500+`, `200+`, or `%98` trust claims. The `SiteSettings.trustBadges.enabled` switch is default-off, all three values must be present before numeric metrics render, and the metrics card is omitted instead of leaving an empty decorative panel.
- This is a visibility guard, not an analytics implementation: it does not compute figures from Payload, change existing settings, call providers, publish, or spend. `test:storefront-trust`, typecheck, lint, full validation, and production build pass locally. A fresh production-server homepage response returned `200` without `500+`, `200+`, `%98`, the customer-metric label, or the metrics-panel caption; the temporary server was stopped.

## D-471 Public storefront safety gate - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- Shared merchandising now hides placeholder `Taslak`/`Draft`/`Test`/`Demo`/`Ornek` titles and protected-brand matches from the homepage, related-product rails, direct PDP rendering and metadata, and sitemap entries.
- It is a public display/indexing guard for legacy active records, not a product mutation or automatic catalog cleanup. `test:merchandising`, `test:storefront-trust`, typecheck, lint, full validation, and build pass. A fresh local production smoke confirmed the homepage no longer shows placeholder cards, a normal PDP returns `200`, the placeholder PDP returns `404`, and the sitemap omits its slug while retaining a safe product URL.

## D-470 Product Flow action-ID handoff - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- `src/lib/productFlowSnapshot.ts` now keeps a friendly `stockNumber` reference but uses `commandRef` (the numeric Payload ID) in action commands. This covers image, confirmation, content, audit, activation, Shopier, repair, and redispatch handoffs.
- The change closes a real operator loop: `/productflow SN0901` no longer recommends `/confirm SN0901` to a handler that parses only numeric IDs. `test:product-flow-snapshot`, `test:runtime-smokes`, typecheck, and lint pass; no live Telegram command or Payload write was run.

## D-469 Turbopack workspace-root pin - 2026-07-24 (LOCAL CONFIG, validated locally, not deployed)

- `next.config.ts` now sets `turbopack.root` to this repository's absolute root. Next no longer guesses `C:\\Users\\W11` from a parent lockfile when running the local production build.
- `npm run build` completes without the former workspace-root warning. The change affects only local build workspace discovery; it does not access Payload, Telegram, providers, Shopier, n8n, OpenClaw, or external channels.

## D-468 product workflow golden path - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- `src/lib/productWorkflowGoldenPath.test.ts` composes active-channel Telegram target normalization, Payload channel intent, clean original-media readiness, lifecycle progression, activation defaults, and protected-brand refusal in one no-database own-product scenario.
- `npm run test:product-workflow` is included in `test:safe`; it never creates a product, calls Telegram/providers/Shopier, queues jobs, publishes, dispatches, or pushes schema.
- Focused test, typecheck, lint, and diff checks pass. A real admin/Telegram workflow remains operator-present deployment evidence, not a substitute for this local contract test.

## D-467 protected-brand manual activation hard gate - 2026-07-24 (LOCAL CODE, validated locally, not deployed)

- The manual Publish Desk override still covers generic Image QC/audit review, but it no longer weakens protected-brand safety.
- `approveAndActivateProduct()` now refuses a protected-brand product before a Payload update, and `Products.beforeChange` independently rejects an active transition even with `manualPublishOverride` context.
- The own-products-only policy remains provenance-led: keep a protected-brand item excluded unless an operator verifies it is an unbranded own product and corrects stored wording.
- `test:publish-desk`, `test:activation-guard`, `typecheck`, lint, and full `npm run validate` pass. No product record, provider, Shopier, dispatch, schema, or deploy action occurred.

## D-466 protected-brand remediation plan - 2026-07-24 (LOCAL CODE/DOCS, read-only runtime proof, not deployed)

- `smoke:load-plan:read` found protected-brand cleanup as the first catalog blocker: 13 affected products in the 100-product sample, ahead of Image QC and category backlog work. It also showed 84 stale drafts over seven days; no catalog mutation was performed.
- `src/lib/brandSafetyRemediationPlan.ts`, Telegram `/brandplan [limit]`, and `smoke:brand-safety:read` now turn that count into a review queue with severity/brand grouping, matched text fields, safe product-flow commands, and admin/PDP links under the existing public-status rule.
- The queue is deliberately advisory: it does not rewrite product text, change status, retire, activate, publish, redispatch, queue jobs, call providers or Shopier, spend on ads, activate SupplierScout, revive retired channels, or push schema. An operator must verify an item is an unbranded own product before changing wording.
- The confirmed runtime smoke inspected 100 of 126 products and reported 13 blockers (12 critical, 1 high) without writes. `test:brand-safety-plan`, `test:loading-plan`, `test:operator-smoke-plan`, `typecheck`, lint, and full `npm run validate` pass.

## Current validation-signal refresh - 2026-07-24 (LOCAL ONLY, validated, not deployed)

- Removed unused local bindings and stale lint disables, migrated Blog and related PDP cards to optimized Next images, added a narrow legacy-shell adapter that optimizes configured product-media hosts while preserving data/blob fallbacks, consolidated shared font loading in the App Router layout, removed dead category/per-color image-engine code, and retired the unused direct Shopier-publish helper without changing Telegram command behavior, provider calls, database state, or external integrations.
- Shopier now has one supported publishing route: the shared guarded Payload job path. `test:shopier-commands` rejects reintroducing the retired helper.
- `npm run lint` now reports 0 errors / 0 warnings, down from 70. Inline SVG/blob product fallbacks remain explicit where `next/image` cannot process them.
- Full `npm run validate` passed after this local cleanup. The separately approved D-462 additive migration has now been applied to the configured database and rechecked read-only.
- Local production-build smoke passed on 2026-07-24: `/` and `/cart` returned HTTP 200, the homepage rendered 116 `/_next/image` references, and the temporary server was stopped after verification.

## D-465 Obsidian control-center alignment - 2026-07-24 (LOCAL CODE/DOCS, focused validation passed, not deployed)

- The root Obsidian notes existed but were stale, including June wording that treated OpenClaw as the current agent brain. `00_HOME.md` through `04_ACTIVE_DECISIONS.md` now provide the current project entry, architecture/release truth, phase status, bot ownership, and durable decisions.
- `scripts/obsidian-control-governance.ts` protects Payload/Next execution, Hermes/Mentix current control, optional OpenClaw/n8n, own-products-only scope, active channels, retired channels, SupplierScout dormancy, D-465 roadmap state, and approval gates across those notes.
- `test:story-dispatch` is restored to `test:safe`, retaining the protected-brand story hard gate in the baseline validation chain.
- Full local validation passed: `npm run validate` completed with `test:obsidian-control`, restored `test:story-dispatch`, the D-464 merchandising checks, and the existing safe suite at 0 lint errors / 70 warnings; `git diff --check` also passed. No Payload access, provider call, Shopier call, publish, dispatch, n8n run, OpenClaw sync, ad action, deployment, or commit occurred.

## D-464 Homepage merchandising rail wiring - 2026-07-24 (LOCAL CODE/DOCS, focused validation passed, not deployed)

- `src/app/(app)/page.tsx` already computed eligible `popular`, `bestSellers`, `deals`, and `discounted` IDs, but the homepage rendered only New Arrivals from that result. `UygunApp.jsx` now passes each curated list to the matching Editor Picks, Best Sellers, Deals, and Discounts rail.
- Best Sellers no longer presents an arbitrary `allProducts.slice(6, 18)` as a sales claim. Curated rails stay absent when fewer than two products qualify.
- `src/lib/merchandising.test.ts` covers eligibility, section membership, ordering, and toggles. `scripts/homepage-merchandising-governance.ts` protects the server-to-client rail handoff. Both are included in `test:safe`.
- Full local validation passed: `npm run validate` completed with `test:merchandising`, `test:homepage-merchandising`, the existing safe suite, and lint at 0 errors / 70 warnings; `git diff --check` also passed. No Payload access, provider call, Shopier call, publish, dispatch, ad action, deployment, or commit occurred.

## D-463 Mentix skill runtime-truth reconciliation - 2026-07-24 (LOCAL CODE/DOCS, validated locally, not deployed)

- Repo-side `mentix-skills` guidance, `ACTIVATION_CONFIG.md`, the skill dashboard, installation matrix, and optional deployment checklist now consistently describe Hermes/Mentix as current and OpenClaw as historical/optional until explicitly reactivated and verified.
- `product-flow-debugger` is diagnostic/read-only; `upload-post` and `research-cog` produce operator-reviewed drafts; `senior-backend` cannot imply a schema/deploy action; and `agent-memory` keeps only durable PII-light project decisions in `project-control/` plus the relevant source-pack file.
- `scripts/mentix-skill-governance.ts` now protects those runtime and action boundaries. Mentix/VPS, source/release/PR, retired-channel, n8n, ops, typecheck, lint, `git diff --check`, and full `npm run validate` passed locally with 0 lint errors / 71 warnings.
- No OpenClaw VPS sync, restart, live prompt, n8n workflow, provider call, Shopier action, dispatch, ad action, commit, branch, PR, or deployment has occurred.

## D-462 BlogPosts featured-image schema drift repair - 2026-07-24 (APPLIED TO CONFIGURED DATABASE, rechecked locally)

- A local `npm run build` originally reported that `blog_posts.featured_image_id` was missing while `src/collections/BlogPosts.ts` already declared `featuredImage -> media`; `src/app/sitemap.ts` safely omitted blog URLs while retaining static and product entries during that drift.
- `scripts/blog-featured-image-schema-check.ts` adds `npm run smoke:blog-schema:read -- --confirm-read-only`, a metadata-only preflight for the table, relationship column, and foreign key. It refuses mutation flags and does not import Payload.
- `scripts/sql/d462-blog-featured-image-schema.sql` is an additive, transactional plan limited to an existing `blog_posts`/`media` pair: missing column, foreign key, and index only.
- `scripts/blog-featured-image-schema-apply.ts` adds `npm run db:blog-featured-image:apply`, which is dry-run by default and does not open a database connection until both `--apply` and `--confirm-apply-d462-blog-featured-image-schema` are supplied.
- The approved 2026-07-24 apply created the nullable integer column, exact `ON DELETE SET NULL` foreign key, and supporting index. The post-apply metadata preflight now passes, and the subsequent `npm run build` completes without a blog-schema fallback warning. The helper stays dry-run by default; an apply in any other environment still requires explicit operator approval.

## D-461 Control-truth Memory Lock reconciliation - 2026-07-24 (LOCAL CODE/DOCS, validated locally, not deployed)

- `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md` now name Payload/Next as the execution layer, Hermes as the current agent-control layer, OpenClaw as historical/optional, n8n as optional glue with direct Payload/Next as default, and SupplierScout as dormant.
- The obsolete default Telegram-to-OpenClaw-to-n8n-to-Payload pipeline claim, current OpenClaw agent claim, and required n8n-workflow claim were removed from both session-start handoffs.
- `scripts/retired-channel-governance.ts` now protects that current control truth alongside the existing Dolap/Threads Memory Lock guard.
- `chatgpt-project-sources/08_N8N_ROLE_AND_DECISION.md` now records n8n as frozen optional glue rather than an outstanding architecture decision.
- Validation passed locally: `npm run test:retired-channels`, `npm run test:n8n-optional`, `npm run test:mentix-skills`, source/release/PR/ops governance, `git diff --check`, and full `npm run validate` with lint at 0 errors / 71 warnings.

## D-460 Product-flow dispatch recovery paths - 2026-07-24 (LOCAL CODE/DOCS, validated locally, not deployed)

- `src/lib/productFlowSnapshot.ts` now adds a deterministic `nextAction` to every non-published active-channel dispatch row.
- `/productflow`, `/flow`, and `formatProductFlowSnapshot()` render each row's state, recorded reason, and recovery path together; queued Shopier points to `/shopier dashboard`, while ready-but-unrecorded Shopier uses the shared guarded publish path.
- `scripts/product-flow-runtime-smoke.ts` prints the same row-level recovery path for operator-run read-only checks.
- `src/lib/productFlowSnapshot.test.ts` and `scripts/runtime-smoke-governance.ts` cover the recovery mapping and runtime smoke surface.
- Guardrails remain unchanged: the diagnostic itself performs no product/lead/order write, stock change, customer message, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- Validation passed locally: full `npm run validate`, `git diff --check`, and focused product-flow/runtime/source/release/PR/ops governance checks; lint has 0 errors and 71 warnings.

## D-459 Product-flow dispatch summary - 2026-07-18 (LOCAL CODE/DOCS, validated locally, not deployed)

- `src/lib/productFlowSnapshot.ts` now adds `channels.dispatchSummary` with active-channel published/queued/failed/blocked/not-configured/unrecorded counts derived from dispatch rows.
- `/productflow`, `/flow`, and `formatProductFlowSnapshot()` now show the compact dispatch summary before full dispatch rows.
- `scripts/product-flow-runtime-smoke.ts` prints `dispatchSummary` for operator-run read-only runtime checks.
- `src/lib/productFlowSnapshot.test.ts` and `scripts/runtime-smoke-governance.ts` cover the dispatch summary output and runtime smoke surface.
- Guardrails remain unchanged: no product/lead/order write, stock change, customer message, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- Validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-458 Product-flow checklist summary - 2026-07-18 (LOCAL CODE/DOCS, validated locally, not deployed)

- `src/lib/productFlowSnapshot.ts` now adds `checklistSummary` with done/next/blocked/needs-work counts derived from the staged operator checklist.
- `/productflow`, `/flow`, and `formatProductFlowSnapshot()` now show the compact checklist summary before the full checklist.
- `scripts/product-flow-runtime-smoke.ts` prints `checklistSummary` for operator-run read-only runtime checks.
- `src/lib/productFlowSnapshot.test.ts` and `scripts/runtime-smoke-governance.ts` cover the checklist summary output and runtime smoke surface.
- Guardrails remain unchanged: no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- Validation passed locally: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-457 Loading-plan focus details - 2026-07-18 (LOCAL CODE/DOCS, validated locally, not deployed)

- `src/lib/productLoadingPlan.ts` now adds `batchSummary.focus.queue` entries with each focus product ref, safe read command, and matching reason list.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` now show focus detail rows beside the D-456 focus queue.
- `scripts/load-plan-runtime-smoke.ts` prints `focusDetails` for operator-run read-only runtime checks.
- `src/lib/productLoadingPlan.test.ts` and `scripts/runtime-smoke-governance.ts` cover the focus detail output and runtime smoke surface.
- Guardrails remain unchanged: no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-456 Loading-plan focus queue - 2026-07-18 (LOCAL CODE/DOCS, validated locally, not deployed)

- `src/lib/productLoadingPlan.ts` now adds `batchSummary.focus.refs` and `batchSummary.focus.nextSafeReads`.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` now show top matching focus refs and safe read commands for the current D-455 bottleneck.
- `scripts/load-plan-runtime-smoke.ts` prints the same `focusRefs` and `focusQueue` fields for operator-run read-only runtime checks.
- `src/lib/productLoadingPlan.test.ts` and `scripts/runtime-smoke-governance.ts` cover the focus queue output and runtime smoke surface.
- Guardrails remain unchanged: no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-455 Loading-plan batch focus - 2026-07-18 (LOCAL CODE/DOCS, validated locally, not deployed)

- `src/lib/productLoadingPlan.ts` now derives `batchSummary.focus` from the first product worklist.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` now show a deterministic bottleneck label, reason, and next safe read before product rows.
- `scripts/load-plan-runtime-smoke.ts` prints the same focus kind, label, and next safe read for repo-side read-only checks.
- `src/lib/productLoadingPlan.test.ts` and `scripts/runtime-smoke-governance.ts` cover the focus output and runtime smoke surface.
- Guardrails remain unchanged: no product/lead/order write, stock change, customer message, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend.
- Validation passed locally: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-454 Loading-plan batch summary - 2026-07-18 (LOCAL CODE/DOCS, validated locally, not deployed)

Product loading now shows a batch-level command summary before operators inspect individual rows:

- `src/lib/productLoadingPlan.ts` adds `batchSummary` to the loading-plan result, derived from the existing first product worklist.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` now show candidate count, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first repo-side `smoke:product-flow:read` command.
- `scripts/load-plan-runtime-smoke.ts` prints the same batch summary fields for operator-run read-only runtime checks.
- `src/lib/productLoadingPlan.test.ts` covers the batch summary, formatter output, and existing no-mutation guardrails.
- Guardrails: read-only catalog planning only. No product/lead/order write, stock change, customer message, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-453 Source-pack latest-boundary guardrail - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Source-pack governance now blocks stale latest-boundary wording before ChatGPT Project source uploads:

- `scripts/source-pack-governance.ts` requires `17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md` to carry `Latest local boundary: D-453.`
- The same check keeps the actual `/smokeplan` title boundary at `Operator Live Smoke Plan (D-389/D-452)`.
- It requires the release/PR stack wording to say D-380-D-406 plus D-422-D-453.
- It rejects stale current-D-449 smoke-plan wording and D-422-D-451 stack wording in next-sprint notes.
- Guardrails: source-pack/docs governance only. No runtime behavior change, product/lead/order write, stock change, customer message, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-452 Ad-readiness storefront trust hint - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Ad readiness now points review/ready products back to the storefront/PDP trust guardrail before manual paid traffic:

- `src/lib/adReadiness.ts` adds `npm run test:storefront-trust` to `/adready` `Next safe reads` for review/ready products, before `/adpack <ref> manual_ads` and `/adreport week`.
- Blocked products still point to `/productflow <ref>` and `/imageplan <ref>` when relevant, without showing the ad-pack path.
- `src/lib/operatorSmokePlan.ts` now renders `Operator Live Smoke Plan (D-389/D-452)`.
- Purpose: keep D-451 PDP conversion/trust checks visible at the exact operator surface where manual ad decisions begin.
- Guardrails: read-only operator guidance only. No product/lead/order write, stock change, customer message, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:ad-readiness`, `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-451 PDP conversion trust guardrail - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Storefront trust governance now protects buyer-facing product detail page conversion essentials before paid traffic:

- `scripts/storefront-trust-governance.ts` now reads `src/app/(app)/products/[slug]/page.tsx` in addition to the homepage app file.
- `test:storefront-trust` still checks no fake reviews, no placeholder testimonial copy, and honest trust-section presence.
- It now also checks that draft products return `notFound()`, `ProductImages` remains mounted, size/stock clarity is variant-backed through `SizeChip` and `OOSChip`, `ContactForm` receives product/sold-out context, WhatsApp and Shopier CTAs remain present and safely gated, process FAQ fallback remains, and similar products stay active-status plus merchandising gated.
- Purpose: keep Phase 6 storefront conversion and Phase 8 paid-traffic preflight from silently losing the buyer path.
- Guardrails: no build, DB read, network call, product/lead/order write, stock change, customer message, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-450 Retired-channel memory-lock guardrail - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Retired-channel governance now covers the session-start Memory Lock handoff files:

- `scripts/retired-channel-governance.ts` now checks `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md`.
- Those files must include `CURRENT ACTIVE CHANNELS: Website/Instagram/Facebook/X/Shopier; Dolap/Threads retired`.
- The guardrail fails if those Memory Lock files describe Dolap/Threads as scaffolded, planned, active, future development, or remaining-channel work.
- Purpose: keep future Codex/Claude/ChatGPT sessions from inheriting old March channel scaffolding truth.
- Validation passed: `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-449 Operator smoke-plan latest-boundary label - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

The `/smokeplan` output now reflects the latest local operator-flow boundary without changing smoke order or adding live actions:

- `src/lib/operatorSmokePlan.ts` now renders `Operator Live Smoke Plan (D-389/D-449)`.
- `src/lib/operatorSmokePlan.test.ts` expects the D-449 title so formatter drift is caught.
- Purpose: keep the operator-facing plan aligned with the D-448 `/adready` next-read guidance and the latest local release/PR handoff boundary.
- Guardrails: no product/lead/order writes, stock changes, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-448 Ad-readiness next-action hints - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

The `/adready` manual ad readiness checklist now gives operators safer follow-up direction without creating ads:

- `src/lib/adReadiness.ts` now adds a `Next safe reads` block based on readiness state.
- Blocked products point to `/productflow <ref>` and, when media is not ad-ready, `/imageplan <ref>`.
- Review/ready products point to read-only `/adpack <ref> manual_ads` and `/adreport week`.
- `src/lib/adReadiness.test.ts` covers ready, blocked, and review formatter output plus absence of unsafe Shopier confirm/ad-launch commands.
- Guardrails: no product/lead/order writes, stock changes, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:ad-readiness`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-447 Funnel snapshot next-action hints - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

The `/funnel` source-performance snapshot now gives operators safer follow-up direction when lead-source, order, or attribution data implies a next read:

- `src/lib/funnelDesk.ts` now adds a `Next safe reads` block when there are open funnel leads, converted/direct orders, or UTM-attributed campaign signals.
- The hints are read-only commands only: `/leadplan`, `/orders`, and `/adreport week`.
- `src/lib/funnelDesk.test.ts` covers the new next-read block, keeps ad-report guidance tied to attribution detail, and asserts unsafe commands like Shopier confirm/ad launch are absent.
- Guardrails: no lead/order/product writes, stock changes, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:funnel-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-446 Business snapshot next-action hints - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

The `/business` owner snapshot now gives operators safer follow-up direction when counts show urgency:

- `src/lib/businessDesk.ts` now adds a `Next safe reads` block when there are open/stale leads, stale/open orders, sold-out products, or low-stock products.
- The hints are read-only commands only: `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock`.
- `src/lib/businessDesk.test.ts` covers the new next-read block, keeps clean busy days from showing lead-plan urgency, and asserts unsafe commands like Shopier confirm/ad launch are absent.
- Guardrails: no lead/order/product writes, stock changes, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:business-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-445 Order desk operator links - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Order desk surfaces now share direct operator links without changing the order action model:

- `src/lib/orderDesk.ts` now exposes `buildOrderOperatorLinks()` for Payload order-admin links, related product-admin links, related lead-admin links, and public PDP links only when the related product has a slug plus public status.
- `formatOrderLine()` now includes those links, so `/inbox orders`, `/orders`, `/orders today`, and `/orderreminders` rows give the operator direct context.
- `formatOrderCard()` and `formatNewOrderAlert()` now include the same links without changing the inline order-action button model.
- `src/lib/orderDesk.test.ts` and `npm run test:order-desk` cover public product links, draft admin-only links, list/card/alert formatter output, and absence of unsafe action commands.
- Guardrails: read-only operator visibility only; no order status writes, stock restores, customer messages, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-444 Lead desk operator links - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Lead desk surfaces now share the same direct-link discipline as lead follow-up:

- `src/lib/leadDesk.ts` now exposes `buildLeadOperatorLinks()` for Payload lead-admin links, related product-admin links, and public PDP links only when the related product has a slug plus public status.
- `formatLeadLine()` now includes those links, so `/inbox leads`, `/leadreminders`, `/leads`, and `/leads today` rows give the operator direct context.
- `formatLeadCard()` and `formatNewLeadAlert()` now include the same links without changing the inline lead-status button model.
- `src/lib/leadFollowupPlan.ts` now reuses the shared helper instead of carrying duplicate link logic.
- `src/lib/leadDesk.test.ts` and `npm run test:lead-desk` cover public product links, draft admin-only links, list/card/alert formatter output, and absence of unsafe action commands.
- `test:lead-desk` is now included in `test:safe`.
- Guardrails: read-only operator visibility only; no lead status writes, customer messages, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:lead-desk`, `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-443 Operator inbox product links - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Operator Inbox product queues now follow the same direct-link discipline as product-flow, load-plan, Shopier previews, and lead follow-up:

- `src/lib/operatorInbox.ts` now appends Payload admin links to product rows rendered by `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today`.
- Public PDP links appear only when a product has a slug plus public status (`active`, `soldout`, or `sold_out`).
- `src/lib/operatorInbox.test.ts` and `npm run test:operator-inbox` cover public product links, draft admin-only links, stock/failed/today formatter reuse, and absence of unsafe action commands.
- `test:operator-inbox` is now included in `test:safe`.
- Guardrails: read-only operator visibility only; no product writes, activation, job queueing, publish, external dispatch, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-inbox`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-442 Lead follow-up operator links - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Lead follow-up planning now gives operators direct context links without changing the lead workflow:

- `src/lib/leadDesk.ts` now preserves related product slug/status in normalized lead rows when Payload depth provides it.
- `src/lib/leadFollowupPlan.ts` adds `operatorLinks` to every plan item: lead admin, related product admin, and public PDP when the product is public.
- Public PDP links appear only for related products with a slug plus `active`, `soldout`, or `sold_out` status.
- Telegram `/leadplan` and `/followupplan` render the links beside the existing suggested manual command.
- `scripts/lead-followup-runtime-smoke.ts` prints the same lead/product links in the PII-light terminal summary.
- Guardrails: read-only lead visibility only; no lead status writes, customer messages, jobs, provider calls, Shopier calls, ad-platform API calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-441 Shopier preview credential holds - 2026-07-16 (LOCAL CODE/DOCS, validated locally, not deployed)

Shopier publish/retry preview rows now keep credential readiness visible before confirm actions:

- `src/lib/shopierPublishControl.ts` now adds a preview-only `Credential hold` line when `shopierPatConfigured` is supplied.
- Telegram `/shopier publish-ready` and `/shopier retry-errors` pass the current `SHOPIER_PAT` presence into preview formatters.
- `scripts/shopier-operator-smoke.ts` passes the same env readiness into `smoke:shopier:read` publish-ready and retry preview sections.
- Missing `SHOPIER_PAT` keeps preview available but tells the operator to configure it before confirm.
- Configured `SHOPIER_PAT` still tells the operator to verify webhook/account/quota outside chat before confirm.
- Confirmed queue/retry output stays free of preview-only credential hints and still uses the existing credential gate.
- Guardrails: preview guidance only; no secret values printed, no direct Shopier call, no provider call, no publish, no redispatch, no ad-platform API call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-440 Shopier preview/dashboard operator links - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Shopier preview/dashboard review rows now give operators direct read-only handoff links:

- `src/lib/shopierPublishControl.ts` now adds `operatorLinks.adminUrl` for products with an id.
- `operatorLinks.productUrl` is shown only when the product has a slug plus public status (`active`, `soldout`, or `sold_out`), so draft/blocked rows do not look publicly reachable.
- `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows now render `Links:` beside the existing `/productflow` and runtime smoke handoffs.
- Confirmed queue/retry output stays free of preview-only link lines.
- Guardrails: read-only preview/review handoff only; no product write outside existing explicit confirmed queue commands, no direct Shopier call, lead/order mutation, publish, redispatch, provider call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-439 Loading-plan worklist operator links - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Product Loading Plan first product worklist now gives operators direct read-only handoff links:

- `src/lib/productLoadingPlan.ts` now adds `operatorLinks.adminUrl` for products with an id.
- `operatorLinks.productUrl` is shown only when the product has a slug plus public status (`active`, `soldout`, or `sold_out`), so draft worklist rows do not look publicly reachable.
- `/loadplan` and `/loadingplan` now render a `links:` line beside the existing suggested command, `/productflow`, and runtime smoke command.
- `scripts/load-plan-runtime-smoke.ts` now prints the same admin/PDP link evidence in `smoke:load-plan:read`.
- Guardrails: read-only diagnostics/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:loading-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-438 Product Flow Snapshot operator links - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Product Flow Snapshot now gives operators direct read-only handoff links:

- `src/lib/productFlowSnapshot.ts` now adds `operatorLinks.adminUrl` when the product has an id.
- `operatorLinks.productUrl` is shown only when the product has a slug plus public status (`active`, `soldout`, or `sold_out`), so draft products do not look publicly reachable.
- `formatProductFlowSnapshot()` now renders an `Operator Links` block for Telegram `/productflow` and `/flow`.
- `scripts/product-flow-runtime-smoke.ts` now prints the same admin/PDP link evidence in `smoke:product-flow:read`.
- Guardrails: read-only diagnostics/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:product-flow-snapshot`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-437 Operator smoke-plan Telegram access preflight - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now checks Telegram operator access before live Telegram reads:

- `src/lib/operatorSmokePlan.ts` now runs `npm run test:telegram-access` after `smoke:load-plan:read` and before Telegram `/loadplan`.
- This ensures private Telegram DM allowlist behavior is verified before any live Telegram operator read in `/smokeplan`.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)`.
- Guardrails: read-only checklist/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:telegram-access`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-436 Operator smoke-plan sitemap preflight - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now checks sitemap coverage before manual ad readiness:

- `src/lib/operatorSmokePlan.ts` now runs `npm run test:sitemap-entries` after `npm run test:attribution` and before `smoke:ad-readiness:read`.
- This ensures static routes plus website-visible product and blog sitemap entries degrade safely before any paid-traffic readiness decision.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)`.
- Guardrails: read-only checklist/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:sitemap-entries`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-435 Operator smoke-plan attribution preflight - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now checks attribution capture before manual ad readiness:

- `src/lib/operatorSmokePlan.ts` now runs `npm run test:attribution` after `npm run test:inquiry-guard` and before `smoke:ad-readiness:read`.
- This ensures first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge behavior are verified before any paid-traffic readiness decision.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)`.
- Guardrails: read-only checklist/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:attribution`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-434 Operator smoke-plan inquiry guard preflight - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now checks the lead-form abuse guard before manual ad readiness:

- `src/lib/operatorSmokePlan.ts` now runs `npm run test:inquiry-guard` after `npm run test:storefront-trust` and before `smoke:ad-readiness:read`.
- This ensures honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior are verified before any paid-traffic readiness decision.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)`.
- Guardrails: read-only checklist/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:inquiry-guard`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-433 Operator smoke-plan storefront trust preflight - 2026-07-16 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now checks storefront trust before manual ad readiness:

- `src/lib/operatorSmokePlan.ts` now runs `npm run test:storefront-trust` after lead follow-up visibility and before `smoke:ad-readiness:read`.
- This ensures the fake-review/placeholder-testimonial guard runs before any paid-traffic readiness decision.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)`.
- Guardrails: read-only checklist/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-432 Operator smoke-plan manual ad preflight alignment - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now includes read-only manual ad evidence before Shopier queue preflights:

- `src/lib/operatorSmokePlan.ts` now runs `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only`, Telegram `/adready <id-or-sn>`, `npm run smoke:ad-performance:read -- --confirm-read-only`, and Telegram `/adreport week` after lead follow-up visibility and before Shopier webhook/queue checks.
- The sequence uses the existing read-only ad readiness and ad performance helpers; it does not introduce campaign creation, ad-platform APIs, pixels, CAPI, provider calls, Shopier calls, or ad spend.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)`.
- Guardrails: read-only checklist/handoff only; no product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-431 Operator smoke-plan Shopier credential hold - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now pauses for Shopier credential and webhook readiness before queue approval:

- `src/lib/operatorSmokePlan.ts` now adds a dedicated `shopier-credential-hold` after the Shopier row product-flow handoff and before the final queue/publish approval hold.
- The hold tells operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets.
- This makes the live-smoke checklist reflect the current real blocker: Shopier confirm commands must wait for credentials/webhooks and explicit operator approval.
- Guardrails: read-only checklist/handoff only; no secret read, no product write, no queue job, no publish, no redispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-430 Operator smoke-plan Shopier handoff alignment - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now pauses on Shopier row product-flow handoffs before queue decisions:

- `src/lib/operatorSmokePlan.ts` now adds a dedicated `shopier-flow-handoff` operator hold after `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` reads.
- The hold tells operators to use the row-provided `/productflow <ref>` and exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.
- The formatted plan title now reflects the latest local boundary as `Operator Live Smoke Plan (D-389/D-449)` so the smoke plan clearly includes the later Shopier handoff, credential readiness, manual ad preflight alignment, storefront trust preflight, and D-448 ad-readiness next-read guidance.
- Guardrails: read-only checklist/handoff only; no product write, no queue job, no publish, no redispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-429 Shopier preview product-flow handoff - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Shopier publish/retry previews now show product-flow preflights before confirm:

- `src/lib/shopierPublishControl.ts` now prints `/productflow <ref>` and exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs in `/shopier publish-ready` and `/shopier retry-errors` preview rows.
- Confirmed batch queue/retry output does not repeat the preflight rows after queueing.
- Telegram `/shopier publish-ready` and `/shopier retry-errors` previews can render without `SHOPIER_PAT`; only their `confirm` forms are blocked when `SHOPIER_PAT` is missing.
- Guardrails: read-only preview/preflight by default; no product write, no queue job outside explicit confirm, no publish, no redispatch, no provider call, no direct Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:shopier-commands`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-428 Shopier dashboard product-flow handoff - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Shopier dashboard batch review rows now hand each sample product into Product Flow Snapshot before queue decisions:

- `src/lib/shopierPublishControl.ts` now adds `flowCommand` and `runtimeFlowCommand` to each `ShopierDashboardReviewRow`.
- `/shopier dashboard` and `smoke:shopier:read` show each sample row's existing `nextAction` plus Telegram `/productflow <ref>` and exact repo preflight `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only`.
- This keeps ready, blocked, queued, and synced Shopier sample rows tied to read-only product-flow diagnostics before queueing or retry work.
- Guardrails: read-only visibility/preflight only; no product write, no queue job, no publish, no redispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, release/PR/source-pack governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-427 Load-plan runtime product-flow handoff - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Product Loading Plan now gives both Telegram and repo-smoke handoffs for each first worklist candidate:

- `src/lib/productLoadingPlan.ts` now adds `runtimeFlowCommand` to each `worklist` row.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` show the Telegram `/productflow <ref>` flow command plus the exact repo preflight command: `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only`.
- `scripts/load-plan-runtime-smoke.ts` prints `flow=` and `smoke=` lines for each first product worklist candidate.
- Guardrails: read-only planning/preflight only; no product write, no queue job, no publish, no redispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-426 Operator smoke-plan load-plan handoff alignment - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Operator Smoke Plan now consumes the D-425 load-plan handoff before provider diagnostics:

- `src/lib/operatorSmokePlan.ts` now places `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` immediately after repo/Telegram `/loadplan`.
- Provider-health runtime smoke and Telegram `/diagnostics` now happen after the worklist-selected product-flow preflight.
- The product-flow runtime reason explicitly tells the operator to use the first `/loadplan` worklist flow command.
- Guardrails: read-only checklist only; no product write, no queue job, no publish, no redispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-425 Load-plan product-flow handoff - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Product Loading Plan first product worklist now hands each candidate into Product Flow Snapshot:

- `src/lib/productLoadingPlan.ts` now adds `flowCommand` to each `worklist` row.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` render the suggested fix command plus `flow <code>/productflow <ref></code>`.
- This keeps catalog loading tied to the D-424 primary operator step before the operator runs follow-up commands.
- Guardrails: read-only planning only; no product write, no queue job, no publish, no external dispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:loading-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-424 Product-flow primary operator step - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Product Flow Snapshot now highlights the first operator step before the full checklist:

- `src/lib/productFlowSnapshot.ts` now derives `primaryOperatorStep` from the ordered operator checklist.
- Ready drafts surface `/activate <ref>` as the primary operator step.
- Confirmed products with pending content surface `/content <ref> trigger`; failed content surfaces `/content <ref> retry`.
- Active Shopier-ready products surface `/shopier publish <ref>`.
- Telegram `/productflow <sn-or-id>` and `/flow <sn-or-id>` show the primary step through the shared formatter.
- `scripts/product-flow-runtime-smoke.ts` prints the same primary step in `smoke:product-flow:read`.
- Guardrails: read-only diagnostics only; no product write, no queue job, no publish, no external dispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:product-flow-snapshot`, runtime-smoke governance, source-pack, Mentix skill, ops-runbook, release/PR governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-423 Product-flow checklist dependency ordering - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Product Flow Snapshot operator checklist commands now respect the product workflow order:

- Incomplete drafts keep content and audit blocked behind `/confirm <ref>`.
- Confirmed products with pending content point audit to `/content <ref> trigger`.
- Confirmed products with failed content point audit to `/content <ref> retry`.
- Telegram `/productflow <sn-or-id>` and `/flow <sn-or-id>` inherit this through `formatProductFlowSnapshot()`.
- `scripts/product-flow-runtime-smoke.ts` inherits the same helper output in `smoke:product-flow:read`.
- Guardrails: read-only diagnostics only; no product write, no queue job, no publish, no external dispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:product-flow-snapshot`, source-pack, Mentix skill, ops-runbook, runtime-smoke, release/PR governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-422 Product-flow operator checklist - 2026-07-12 (LOCAL CODE/DOCS, not deployed)

Product Flow Snapshot now gives the operator a staged product-workflow checklist:

- `src/lib/productFlowSnapshot.ts` now includes `operatorChecklist` rows for Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant.
- Telegram `/productflow <sn-or-id>` and `/flow <sn-or-id>` inherit the checklist through `formatProductFlowSnapshot()`.
- `scripts/product-flow-runtime-smoke.ts` prints the same checklist in `smoke:product-flow:read`.
- Guardrails: read-only diagnostics only; no product write, no queue job, no publish, no external dispatch, no provider call, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:product-flow-snapshot`, source-pack, Mentix skill, ops-runbook, runtime-smoke, release/PR governance, `npm run validate` with lint at 0 errors / 71 warnings, and `git diff --check`.

## 2026-07-11 Hermes control layer / optional OpenClaw reconciliation (LOCAL DOC/GOVERNANCE, not deployed)

Current agent-control truth is being reconciled across repo guidance, source-pack, and governance:

- Hermes is the current agent-control layer for UygunAyakkabi/Mentix operations.
- Mentix/Uygunops remains the Telegram-facing commerce operator identity/interface.
- Payload/Next remains the source of truth and execution layer.
- OpenClaw is historical/optional unless explicitly reactivated.
- `test:openclaw-vps-verification` remains as a standalone optional OpenClaw reactivation guard and is not part of normal `test:safe` while Hermes is current.
- Scope: docs/governance only; no Shopier/order/stock/lead/UTM/Telegram/image-provider/ad runtime code, no provider calls, no live Telegram, no deploy, no commit/PR, no SupplierScout activation, and no retired-channel activation.
- Verification passed: `npm run test:source-pack`, `npm run test:mentix-skills`, standalone `npm run test:openclaw-vps-verification`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-406 Shopier runtime-smoke batch review alignment - 2026-07-06 (LOCAL CODE, not deployed)

Shopier repo-side smoke now mirrors the Telegram dashboard batch review sample:

- Updated `scripts/shopier-operator-smoke.ts` to import `buildShopierDashboardReviewRows`.
- `smoke:shopier:read` now builds `reviewRows` from publish evaluations and passes them to `formatShopierOperatorDashboard()`, matching Telegram `/shopier dashboard`.
- Updated `scripts/runtime-smoke-governance.ts` so `test:runtime-smokes` requires the Shopier smoke script to keep the review-row alignment.
- Guardrails: no product write, no Shopier job queue, no Shopier API call, no provider call, no external dispatch, no SupplierScout activation, no retired-channel activation, no ad spend, and no schema push.
- Verification passed: `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.

## D-405 Image-plan runtime smoke - 2026-07-06 (LOCAL CODE, not deployed)

Repo-side image plan evidence now exists before live Telegram `/imageplan`:

- Added `scripts/image-plan-runtime-smoke.ts`.
- Added package script `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only`.
- The smoke reads one Payload product plus up to three recent `image-generation-jobs`, then builds the same `src/lib/imageRegenerationPlan.ts` output used by Telegram `/imageplan`.
- `/smokeplan` now runs `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before Telegram `/imageplan <id-or-sn>`.
- Guardrails: explicit READ_ONLY confirmation, `PAYLOAD_DB_PUSH=false`, no product write, no image-generation queue, no provider call, no publish, no dispatch, no Shopier call, no SupplierScout activation, no retired-channel activation, no ad spend, and no schema push.
- Verification passed: no-connect help path, `npm run test:runtime-smokes`, `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.

## D-404 Image regeneration plan - 2026-07-06 (LOCAL CODE, not deployed)

Image QC REVIEW/FAIL states now have a safe operator next-action bridge:

- Added `src/lib/imageRegenerationPlan.ts` and `src/lib/imageRegenerationPlan.test.ts`.
- Added Telegram `/imageplan <sn-or-id>` and `/regenplan <sn-or-id>`.
- `/imageplan` reads product media, `imageQuality`, workflow `visualStatus`, and recent `image-generation-jobs`, then suggests manual next commands for generation running, preview approval/regeneration, QC decision needed, REVIEW, FAIL, rejected visuals, and original-only products.
- `/smokeplan` now includes `/imageplan <id-or-sn>` after `/productflow` so the image plan is part of the safe operator read sequence.
- Added package script `npm run test:image-regeneration-plan` and included it in `test:safe`.
- Guardrails: no product write, no image-generation job queueing, no Gemini/provider call, no publish, no dispatch, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Focused verification passed: `npm run test:image-regeneration-plan` and `npm run test:operator-smoke-plan`.
- Verification passed: `npm run test:image-regeneration-plan`, `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.

## D-403 Provider reality audit - 2026-07-05 (LOCAL CODE, not deployed)

Provider readiness now has an explicit proof boundary:

- Added `project-control/PROVIDER_REALITY_AUDIT.md` to document that local env readiness is not production provider readiness.
- Added `scripts/provider-reality-governance.ts`, `npm run test:provider-reality`, and `test:safe` coverage.
- The audit covers Website, Instagram, Facebook, X, Shopier, Gemini, Google Vision, DataForSEO, SerpAPI, reverse-search selection, and n8n fallback webhooks.
- Guardrails: no env load, no secret print, no provider call, no credit spend, no queue write, no publish, no live Telegram action, no Shopier action, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Verification passed: `npm run test:provider-reality`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, Product Intelligence provider-health, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-402 Historical soak-script quarantine - 2026-07-05 (LOCAL CODE, not deployed)

Old soak scripts are now explicitly quarantined:

- Added `project-control/HISTORICAL_SOAK_SCRIPTS.md` to document `scripts/d*-soak*.ts` as historical live-data soak harnesses.
- Added `scripts/soak-script-governance.ts`, `npm run test:soak-scripts`, and `test:safe` coverage.
- The governance check keeps these scripts out of default package commands, `validate`, and read-only runtime smoke inventory.
- Guardrails: no soak run, no live data connection, no write, no provider call, no Shopier call, no queue write, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Verification passed: `npm run test:soak-scripts`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-401 OpenClaw VPS verification guardrail - 2026-07-05 (LOCAL CODE, not deployed)

OpenClaw sync is now verification-first:

- Added `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` as a read-only checklist before any skill copy, restart, or live Telegram/OpenClaw prompt.
- Rewrote `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` so repo skill files are not treated as proof of VPS deployment.
- Rewrote `mentix-skills/INSTALLATION_MATRIX.md` so VPS state stays `VERIFY ON VPS` unless current directory/log/prompt evidence exists.
- Added `scripts/openclaw-vps-verification-governance.ts` and standalone `npm run test:openclaw-vps-verification`; it is no longer part of normal `test:safe` while Hermes is current.
- Guardrails: no VPS command, no sync, no restart, no live Telegram/OpenClaw prompt, no provider call, no Shopier call, no queue write, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Verification passed: `npm run test:openclaw-vps-verification`, `npm run test:mentix-skills`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-400 Shopier dashboard batch review sample - 2026-07-05 (LOCAL CODE, not deployed)

`/shopier dashboard` now has a broader read-only batch review surface without adding a new admin UI:

- `src/lib/shopierPublishControl.ts` now builds and formats ready/blocked/queued/synced review rows from the shared Shopier/Web evaluator.
- `src/app/api/telegram/route.ts` passes those rows to `/shopier dashboard`.
- Review rows show product ref, title, state, detail/blocker, and suggested manual command.
- Suggested actions stay operator-controlled: `/shopier publish-ready`, `/imageqc <sn-or-id>`, or `/productflow <sn-or-id>`.
- Guardrails: no publish, no Shopier queue, no Shopier API call, no provider call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Verification passed: `npm run test:shopier-publish-control`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-399 Runtime smoke worklist alignment - 2026-07-05 (LOCAL CODE, not deployed)

The read-only load-plan runtime smoke now matches the D-399 claim:

- `scripts/load-plan-runtime-smoke.ts` now prints a "First product worklist" section from `plan.worklist`.
- `scripts/runtime-smoke-governance.ts` now requires the load-plan smoke script to keep that worklist output surface.
- Guardrails remain unchanged: no product write, no publish, no Shopier queue, no provider call, no SupplierScout activation, no retired-channel activation, no schema push, and no ad spend.
- Verification passed: `npm run test:runtime-smokes`, `npm run test:loading-plan`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-399 Loading-plan first product worklist - 2026-07-05 (LOCAL CODE, not deployed)

The read-only Product Loading Plan now tells the operator which products to fix first:

- `src/lib/productLoadingPlan.ts` now adds a `worklist` to the plan.
- `/loadplan` and `smoke:load-plan:read` now include a "First Product Worklist" section with product ref, title, priority, reasons, and suggested manual command.
- Worklist reasons include brand safety, failed/pending Image QC, Shopier errors, missing core fields, stale drafts, category backlog, and ready backlog.
- Suggested commands stay manual/read-only or preview-oriented: `/productflow <sn-or-id>`, `/imageqc <sn-or-id>`, or `/shopier errors`.
- Verification passed: `npm run test:loading-plan`, release/PR/source-pack/ops/retired-channel checks, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.
- Guardrails: no product write, no publish, no Shopier queue, no provider call, no SupplierScout activation, no retired-channel activation, and no ad spend.

## D-398 Local PR review package - 2026-07-05 (LOCAL DOC/GOVERNANCE, not deployed)

The current local D-380-D-404 stack now has a review package in addition to the release boundary:

- New `project-control/LOCAL_PR_REVIEW_PACKAGE.md` prepares human review notes for the local stack.
- New `scripts/local-pr-review-governance.ts` checks the package for proposed PR title, scope summary, reviewer focus, validation commands, source-pack count, active-channel rules, dormant-system rules, and not-run/not-done guardrails.
- New package script: `npm run test:local-pr-review`.
- `test:local-pr-review` is included in `test:safe`, so full `npm run validate` now checks the PR/review handoff notes.
- Production, live Telegram, live Shopier webhooks, provider calls, external dispatch, queue writes, ad spend, SupplierScout, retired channels, commit, push, branch creation, PR creation, deploy, and optional OpenClaw sync remain untouched until operator approval.

## D-397 Local release candidate boundary - 2026-07-05 (LOCAL DOC/GOVERNANCE, not deployed)

The current local D-380-D-404 stack now has one explicit handoff manifest:

- New `project-control/LOCAL_RELEASE_CANDIDATE.md` records the not-committed/not-deployed boundary for D-380 through D-398.
- New `scripts/local-release-candidate-governance.ts` checks the manifest, source-pack count, active-channel rules, SupplierScout dormancy, local validation boundary, and operator approval guardrails.
- New package script: `npm run test:local-release-candidate`.
- `test:local-release-candidate` is included in `test:safe`, so full `npm run validate` now checks the release/PR handoff boundary.
- Source-pack validation/ops and next-sprint docs now point to the manifest.
- Focused local verification passed: `npm run test:local-release-candidate`.
- Full local verification passed: `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run test:retired-channels`, `npm run typecheck`, `git diff --check`, and full `npm run validate`.
- Full validation completed with lint at 0 errors / 70 existing warnings.
- Production, live Telegram, live Shopier webhooks, provider calls, external dispatch, queue writes, ad spend, SupplierScout, retired channels, commit, push, PR, deploy, and optional OpenClaw sync remain untouched until operator approval.

## D-396 Smokeplan lead-followup alignment - 2026-07-05 (LOCAL CODE, not deployed)

The operator live-smoke plan now includes the D-395 lead-followup runtime smoke before live Telegram `/leadplan`:

- `src/lib/operatorSmokePlan.ts` now adds `lead-followup-runtime` after business/funnel visibility.
- `/smokeplan` now tells the operator to run `npm run smoke:lead-followup:read -- --confirm-read-only` before Telegram `/leadplan`.
- The new `/leadplan` read step happens before Shopier webhook/publish preflights.
- `src/lib/operatorSmokePlan.test.ts` now checks the ordering: business/funnel visibility -> lead-followup runtime smoke -> Telegram `/leadplan` -> Shopier preflight.
- Focused local verification passed: `npm run test:operator-smoke-plan`.
- Full local verification passed: `npm run test:source-pack`, `npm run test:retired-channels`, `npm run test:runtime-smokes`, `npm run typecheck`, `git diff --check`, and full `npm run validate`.
- Full validation completed with lint at 0 errors / 70 existing warnings.
- Production and live Telegram behavior are unchanged until commit/push/deploy and operator-approved smoke.

## D-395 Lead-followup runtime smoke - 2026-07-04 (LOCAL CODE, not deployed)

Operators now have a read-only repo-side preflight for `/leadplan` before live Telegram use:

- New `scripts/lead-followup-runtime-smoke.ts` mirrors Telegram `/leadplan` and `/followupplan` through `getLeadFollowupPlan()`.
- New package script: `npm run smoke:lead-followup:read -- --confirm-read-only`.
- Optional sample limit: `--limit=12`, capped at 25.
- The script loads env files without printing secrets, forces `PAYLOAD_DB_PUSH=false`, reads open Payload Customer Inquiries, and prints a PII-light summary instead of names/phones.
- Guardrails: no lead writes, no customer messages, no product writes, no dispatch, no provider calls, no Shopier calls, no job queue writes, no ad spend, no SupplierScout activation, no retired-channel activation, and no schema push.
- No-connect help passed: `npm run smoke:lead-followup:read -- --help`.
- Local verification passed: `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:retired-channels`, `npm run typecheck`, `git diff --check`, and full `npm run validate`.
- Full validation completed with lint at 0 errors / 70 existing warnings.
- Production and live Telegram behavior are unchanged until commit/push/deploy and operator-approved smoke.

## D-394 Lead follow-up plan - 2026-07-04 (LOCAL CODE, not deployed)

Operators now have a read-only priority plan for open leads before campaign work:

- New `src/lib/leadFollowupPlan.ts` builds a follow-up plan from Payload Customer Inquiries returned by the existing Lead Desk open-lead reader.
- New Telegram commands `/leadplan` and `/followupplan` show stale/new lead priority, reason, and suggested existing manual lead command.
- New package script `npm run test:lead-followup-plan` covers priority sorting, stale/fresh classification, capped open-list disclosure, formatter guardrails, and no-write Payload reads.
- The plan is read-only: no lead status write, no customer message, no ad campaign, no provider call, no Shopier call, no SupplierScout activation, and no retired-channel activation.
- Focused local verification passed: `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:retired-channels`, `npm run typecheck`, and `git diff --check`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and live Telegram behavior are unchanged until commit/push/deploy and operator-approved smoke.

## D-393 Operator smoke-plan Shopier webhook preflight - 2026-07-04 (LOCAL CODE, not deployed)

The operator smoke plan now runs local Shopier webhook assertions before Shopier runtime smoke:

- New package script `npm run test:shopier-webhook-local` combines `test:shopier-order-stock` and `test:shopier-refund-lifecycle`.
- `src/lib/operatorSmokePlan.ts` now inserts that local repo check before `smoke:shopier:read`.
- `src/lib/operatorSmokePlan.test.ts` checks ordering: local Shopier webhook tests must appear before Shopier read-only runtime smoke.
- `scripts/ops-runbook-governance.ts` now checks the package script and runbook mention.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production, Telegram live behavior, Shopier live webhooks, and deployment are unchanged until commit/push/deploy and operator-approved smoke.

## D-392 Shopier refund-request idempotency - 2026-07-04 (LOCAL CODE, not deployed)

Shopier `refund.requested` now records a local marker before stock restore:

- `src/lib/shopierRefundLifecycle.ts` now extracts and applies `refund.requested` events in addition to `refund.updated`.
- The helper records `Shopier refund requested: refund=<id>` and emits `order.refund_requested` when possible.
- Duplicate `refund.requested` delivery returns `shouldRestoreStock=false`, so stock cannot be restored twice by repeated webhooks.
- Legacy `Iade talebi: <refundId>` order notes are recognized as an already-recorded refund request.
- `src/app/api/webhooks/shopier/route.ts` now restores stock only when the lifecycle helper says the request is first-seen.
- Focused verification passed: `npm run test:shopier-refund-lifecycle`, `npm run test:shopier-order-stock`, `npm run test:order-desk`, and `npm run typecheck`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and live Shopier webhooks are unchanged until commit/push/deploy and operator-approved webhook smoke.

## D-391 Shopier refund update traceability - 2026-07-04 (LOCAL CODE, not deployed)

Shopier `refund.updated` now records traceability on the matching Payload order:

- New `src/lib/shopierRefundLifecycle.ts` extracts refund id, order id, and status from flat or nested Shopier payloads.
- New `src/lib/shopierRefundLifecycle.test.ts` covers idempotent note append, missing order id no-write behavior, unknown local order no-write behavior, and non-fatal bot-event write failure.
- `src/app/api/webhooks/shopier/route.ts` now calls the helper for `refund.updated`.
- Behavior is note/audit only: it appends `Shopier refund update: ...` to `orders.notes` and emits `order.refund_updated` when possible.
- It does not change order status, restore stock, call Shopier, dispatch channels, queue jobs, activate SupplierScout, revive retired channels, or spend on ads.
- Focused verification passed: `npm run test:shopier-refund-lifecycle`, `npm run test:shopier-order-stock`, `npm run test:order-desk`, and `npm run typecheck`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and live Shopier webhooks are unchanged until commit/push/deploy and operator-approved webhook smoke.

## D-390 Mentix/OpenClaw live-smoke alignment - 2026-07-03 (LOCAL CODE, not deployed)

Repo-side Mentix/OpenClaw skill guidance now aligns with D-389 `/smokeplan`:

- `mentix-skills/product-flow-debugger/SKILL.md` now tells operators to run `/smokeplan` first for live-smoke/catalog-scale-up sequencing.
- `mentix-skills/mentix-intake/SKILL.md` routes live-smoke planning requests to product-flow-debugger and says to answer with `/smokeplan` first.
- `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` now requires `npm run test:operator-smoke-plan` before VPS skill sync.
- `mentix-skills/INSTALLATION_MATRIX.md` now marks the repo copy as verify-before-sync instead of assuming the VPS skill copy is current.
- `mentix-skills/mentix-skill-stack-dashboard.html` no longer presents n8n as the default product creation path and includes `/smokeplan` in Level A Telegram test guidance.
- `scripts/mentix-skill-governance.ts` now guards the new `/smokeplan` alignment and dashboard n8n optionality.
- Focused verification passed: `npm run test:mentix-skills` and `npm run test:operator-smoke-plan`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and VPS OpenClaw are unchanged until commit/push/deploy/VPS sync approval.

## D-389 Operator live smoke plan - 2026-07-03 (LOCAL CODE, not deployed)

Operators now have a read-only checklist command for the safe live-smoke order:

- New `src/lib/operatorSmokePlan.ts` builds and formats the operator smoke plan.
- New Telegram command: `/smokeplan`.
- New validation: `npm run test:operator-smoke-plan`, included in `test:safe`.
- The plan orders read-only repo smokes and Telegram reads for load plan, the worklist-selected product-flow check, image-plan read, provider diagnostics, business/funnel visibility, and Shopier dashboard/error/retry previews.
- Guardrails: no Payload writes, no product status changes, no external dispatch, no redispatch, no Shopier queueing/API calls, no provider calls, no secret printing, no ad spend, no SupplierScout activation, and no retired-channel activation.
- Local verification passed: `npm run test:operator-smoke-plan`, `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-388 Load-plan runtime smoke - 2026-07-03 (LOCAL CODE, not deployed)

Product Loading Plan now has an operator-run read-only runtime smoke:

- New `scripts/load-plan-runtime-smoke.ts` mirrors Telegram `/loadplan`.
- New package script: `npm run smoke:load-plan:read -- --confirm-read-only`.
- Optional sample limit: `--limit=200` up to 300.
- The script loads env files without printing secrets, forces `PAYLOAD_DB_PUSH=false`, reads recent Payload products, builds `buildProductLoadingPlan()`, and prints top actions plus category load order.
- Guardrails: no product writes, no status changes, no dispatch, no provider calls, no Shopier calls, no job queue writes, no ad spend, no SupplierScout activation, no retired-channel activation, and no schema push.
- `test:runtime-smokes` now covers this smoke inventory item.
- No live read-only run has been performed yet.
- Local verification passed: no-connect `npm run smoke:load-plan:read -- --help`, `npm run test:runtime-smokes`, `npm run test:ops-runbook`, `npm run test:source-pack`, `npm run test:retired-channels`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-387 Product loading plan - 2026-07-03 (LOCAL CODE, not deployed)

Catalog scale-up now has a read-only daily loading/fix plan surface:

- New `src/lib/productLoadingPlan.ts` composes Catalog QA and Category Fill into prioritized actions.
- New Telegram commands: `/loadplan [limit]` and `/loadingplan [limit]`.
- The plan prioritizes brand-safety blockers, generated-image QC pending/failures, Shopier sync errors, category load gaps, publish-ready/finish-backlog opportunities, completeness gaps, and stale drafts.
- New validation: `npm run test:loading-plan`, included in `test:safe`.
- Guardrails: own-products-only, no SupplierScout activation, no Dolap/Threads, no product writes, no publishing, no Shopier queueing, no provider calls, and no ad spend.
- Local verification passed: `npm run test:loading-plan`, `npm run test:retired-channels`, `npm run test:source-pack`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-386 Shopier command governance - 2026-07-03 (LOCAL CODE, not deployed)

Telegram Shopier queue commands now have a static governance guard:

- Removed unreachable direct queue/update branches from `/shopier publish` and `/shopier republish` in `src/app/api/telegram/route.ts`.
- Those single-product commands now resolve product identifiers, read the product, and call `queueShopierSync()`.
- New `scripts/shopier-command-governance.ts` checks that publish/republish do not directly update `sourceMeta.shopierSyncStatus` or enqueue `shopier-sync` jobs from the Telegram route.
- New package script: `npm run test:shopier-commands`.
- `test:shopier-commands` is included in `test:safe`.
- The guard also checks that `/shopier publish-ready` and `/shopier retry-errors` continue to use `queueShopierSync()` behind preview/confirm flows.
- Local verification passed: `test:shopier-commands`, `test:shopier-publish-control`, `test:source-pack`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-385 runtime-smoke governance - 2026-07-03 (LOCAL CODE, not deployed)

Read-only runtime smoke coverage now has a local governance check:

- New `scripts/runtime-smoke-governance.ts` checks the read-only smoke inventory.
- New package script: `npm run test:runtime-smokes`.
- `test:runtime-smokes` is included in `test:safe`, but runtime smoke commands themselves remain outside direct validation execution.
- The governance check verifies package scripts, backing scripts, `--confirm-read-only`/`READ_ONLY` confirmation, mutation refusal, no-write wording, Payload `PAYLOAD_DB_PUSH=false` guards where relevant, and synchronized smoke docs.
- Docs checked: `AGENTS.md`, `CLAUDE.md`, `project-control/RUNTIME_SMOKE_CHECKS.md`, `project-control/DEPLOYMENT_OPS_RUNBOOK.md`, and `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`.
- Local verification passed: `test:runtime-smokes`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-384 ad-performance runtime smoke - 2026-07-03 (LOCAL CODE, not deployed)

Manual ad performance reporting now has an operator-run runtime smoke:

- New `scripts/ad-performance-runtime-smoke.ts` mirrors Telegram `/adreport` through `getAdPerformanceSnapshot()`.
- Package script: `npm run smoke:ad-performance:read -- --confirm-read-only`.
- Optional period: `--period=today|week|month`.
- It loads env files without printing secrets, forces `PAYLOAD_DB_PUSH=false`, requires explicit read-only confirmation, and refuses mutation/publish/queue/provider/Shopier/spend flags.
- It reads Payload CustomerInquiries and Orders only, then prints UTM-tagged campaign rows, related orders/revenue, stale open leads, untagged leads, and direct/unattributed orders.
- Guardrails: no writes, no lead/order mutation, no job queue writes, no external dispatch, no provider calls, no Shopier calls, no external ad API calls, no ad spend, and no schema push.
- Local verification passed: no-connect `smoke:ad-performance:read -- --help`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- No live read-only smoke has been run yet.
- Production is unchanged until commit/push/deploy.

## D-383 manual ad performance report - 2026-07-03 (LOCAL CODE, not deployed)

Manual ad reporting now has a read-only Payload-backed operator surface:

- New `src/lib/adPerformance.ts` groups UTM-tagged CustomerInquiries by source/medium/campaign.
- Telegram `/adreport [today|week|month]` reports tagged leads, open/stale leads, won/lost/spam leads, related orders, revenue, unattributed leads, and direct/unattributed orders.
- Attribution uses existing lead UTM fields plus `orders.relatedInquiry`; no new schema, no ad-platform API, and no pixel/CAPI requirement.
- New validation: `npm run test:ad-performance` is included in `test:safe`.
- Guardrails: no campaign is created, no post is published, no pixel/CAPI/Ads API is touched, no provider/Shopier/external API call is made, and no ad spend happens.
- Local verification passed: `test:ad-performance`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-382 story dispatch lint cleanup - 2026-07-03 (LOCAL CODE, not deployed)

Validation noise was reduced in the Story pipeline:

- Removed stale unused imports from `src/lib/storyDispatch.ts`.
- Clarified the Story dispatch result status comment to include `brand_safety_blocked`.
- `npm run lint` now reports 0 errors and 70 warnings, down from 74 warnings.
- Local verification passed: `test:story-dispatch`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.

## D-381 story dispatch brand-safety hardening - 2026-07-03 (LOCAL CODE, not deployed)

The non-blocking Story pipeline now has its own brand-safety defense:

- `src/lib/storyDispatch.ts` scans products with `scanProductBrandSafety()` before StoryJob creation.
- Protected-brand products do not create StoryJobs, even if they reached active status through a manual review override.
- The product sourceMeta is updated with `storyStatus='failed'`, empty story asset/caption, failed target list, and `lastStoryError='brand_safety_block: ...'`.
- New validation: `npm run test:story-dispatch` is included in `test:safe`.
- Local verification passed: `test:story-dispatch`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy; no external story/social publishing is performed by this local change.

## D-380 manual ad launch-pack support - 2026-07-03 (LOCAL CODE, not deployed)

Manual ad support remains read-only and operator-controlled:

- New `src/lib/adLaunchPack.ts` builds a launch pack from the existing ad-readiness gate.
- Telegram `/adpack <sn-or-id> [campaign]` returns operator-review copy drafts and UTM links only after hard blockers are clear.
- UTM vocabulary now accepts `meta` and `paid_social`; `buildProductUtmUrl()` can add `utm_content` for copy-angle tracking.
- New validation: `npm run test:ad-launch-pack` is included in `test:safe`.
- Guardrails: no campaign is created, no post is published, no pixel/CAPI/Ads API is touched, no provider/Shopier call is made, and no ad spend happens.
- Local verification passed: `test:ad-launch-pack`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy; real ad launch remains operator-only and deferred until D-380+ readiness.

## Phase 7 Shopier fulfilled lifecycle unification - 2026-07-03 (LOCAL CODE, not deployed)

Shopier `order.fulfilled` no longer directly overwrites Payload order status:

- `src/app/api/webhooks/shopier/route.ts` now calls `applyOrderStatus(payload, orderId, 'ship', 'shopier_webhook')`.
- Fulfillment now shares `/ship` behavior: `shippedAt` stamping, idempotent no-op for already shipped orders, invalid-transition refusal, and `order.status_changed` audit event payload.
- `src/lib/orderDesk.ts` now exposes `OrderStatusSource` with `shopier_webhook`.
- `src/lib/orderDesk.test.ts` now asserts that Shopier fulfillment preserves `source: 'shopier_webhook'` in the audit payload.
- Local verification passed: `test:order-desk`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy; live webhook smoke still requires configured Shopier credentials/webhooks and operator approval.

## Phase 7 Shopier order/refund stock reconciliation — 2026-07-03 (LOCAL CODE, not deployed)

Shopier webhook stock mutation is now centralized and testable:

- New `src/lib/shopierOrderStock.ts` owns Shopier `order.created` and `refund.requested` stock changes.
- `src/app/api/webhooks/shopier/route.ts` now calls the shared helper for order-created stock decrement and refund stock restore.
- Behavior: if local variants exist, sales/refunds mutate the matching normalized size variant and sync product-level `stockQuantity` to the variant total; if no variants exist, they mutate product-level stock directly; mismatched Shopier sizes are skipped with explicit reasons instead of silently drifting.
- Inventory logs are written for successful stock mutations, and updates use `context.isDispatchUpdate=true` to avoid dispatch-loop side effects.
- New validation: `npm run test:shopier-order-stock` is included in `test:safe`.
- Local verification passed: `test:shopier-order-stock`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy; live webhook smoke still requires configured Shopier credentials/webhooks and operator approval.

## Phase 7 operator order lifecycle policy — 2026-07-03 (LOCAL CODE, not deployed)

Telegram order status policy is now test-covered:

- New `src/lib/orderDesk.test.ts` covers `applyOrderStatus()` without touching Payload.
- `/ship` stamps `shippedAt`.
- `/deliver` stamps `deliveredAt` and backfills `shippedAt` when the operator skips `/ship`.
- Delivered orders cannot be cancelled through Telegram; refund/admin handling stays separate.
- Repeated/idempotent status actions and missing-order actions do not write.
- Manual `/cancelorder` does not auto-restore stock. It tells the operator to use `/restock` when inventory should be restored.
- New validation: `npm run test:order-desk` is included in `test:safe`.
- Local verification passed: `test:order-desk`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `git diff --check`, and full `npm run validate`.

## Pre-traffic hardening — 2026-07-02 (LOCAL CODE, not deployed)

One controlled pass closing the P0/P1 code items from the project analysis report, before any ad test:

- **Telegram DM operator allowlist:** private chats now enforce the same `telegram.allowedUserIds` allowlist as the Phase I group gate (previously DMs skipped it — anyone finding the bot could run every command). Non-allowlisted DM senders get a polite refusal before any handler runs; an EMPTY allowlist keeps legacy-open behavior but logs a loud warning (no lockout for unconfigured setups). Decision logic in `src/lib/telegramAccess.ts` (pure, tested); route diff surgical. Also: a loud `console.warn` when `TELEGRAM_WEBHOOK_SECRET` is unset (the signature gate used to disable itself silently). Group behavior unchanged. **Residual:** inline-button callbacks are not separately gated — strangers can no longer obtain buttons; pre-existing operator chats unaffected.
- **Lead-form abuse protection (`/api/inquiries` + ContactForm):** hidden `company` honeypot (silent success, no lead created); best-effort per-IP (10/10min) + per-phone (4/10min, digits-normalized) sliding-window rate limit (per-serverless-instance memory — documented best-effort, no new dependency); duplicate collapse — same phone + same product within 10 min returns the existing lead id instead of a new row + operator re-ping (existing collection query, **no schema change**, FAIL-OPEN so a guard error can never block lead capture). D-350 staged create, attribution fields, and Turkish copy preserved; 429 shows Turkish copy with WhatsApp fallback.
- **Sitemap fix (`src/app/sitemap.ts`):** prod `/sitemap.xml` served the app's 404 page although the file was in the deployed tree → route never REGISTERED at build (not a runtime error). Prime suspect: `force-dynamic` on a metadata route under Next 16 canary (robots.ts, identical minus that config, registers fine). Switched to ISR `revalidate = 3600`; per-collection try/catch (a blog fetch failure no longer drops product URLs); pure entry builder extracted to `src/lib/sitemapEntries.ts`. Needs post-deploy verification: `/sitemap.xml` must return 200 XML.
- **/yardim mobile:** "NASIL ÇALIŞIR?" steps grid gets `.help-steps-grid` → 2×2 at ≤768px (desktop unchanged).
- **New assertions wired into `test:safe`:** `test:telegram-access` (7), `test:inquiry-guard` (12), `test:sitemap-entries` (5), `test:attribution` (7 — first-touch survives homepage→PDP; submit merge pinned via new pure `resolveSubmitAttribution` in `src/lib/attribution.ts`, behavior unchanged), `test:storefront-trust` (3 — `DEMO_REVIEWS_ENABLED=false` + placeholder copy stays removed). `npm run validate` GREEN (typecheck + lint + full suite).
- **Explicitly NOT in this pass (separate/operator-only):** #362 external cleanup (Shopier/X/FB), Loro Piana data cleanup in Payload admin, Vercel env verification (`TELEGRAM_WEBHOOK_SECRET`, `SHOPIER_WEBHOOK_TOKEN`, `CRON_SECRET`), Shopier webhook idempotency, stock sync-back, Telegram confirmation-gate redesign, cart page. Production unchanged until commit is pushed/deployed.

## Manual publish override — 2026-07-02 (superseded by D-467; LOCAL CODE, not deployed)

Product #410 exposed a manual-publish semantics bug: **Yayına Al** recorded `publish.approved` but activation was refused when generic review blockers remained. Current local code permits explicit manual approval only for generic Image QC/audit review after protected-brand safety passes; D-467 forbids bypassing a protected-brand match. Hard commerce requirements still block activation: valid price, usable media, active target, and sellable stock. Touched files: `publishDesk.ts`, `productActivationGuard.ts`, `Products.ts`, and tests. Local validation passed: `test:publish-desk`, `test:activation-guard`, `test:publish-readiness`, `test:image-quality`, `typecheck`, targeted ESLint. Production is unchanged until commit/push/deploy.

## Product copy fix — 2026-06-21 (D-338A: #354 genuine-leather claim softened — DONE, ad-safe)

Operator-approved DATA-only copy fix on product #354 via Admin API PATCH (`content` group only; title/slug/price/stock/images/status unchanged; no external dispatch — no status transition). Removed all "Gerçek deri / Hakiki deri / deri malzeme(si)" certainty claims across commercePack (website/IG/X/FB/Shopier/highlights) + discoveryPack (articleBody, metaTitle, metaDescription, faq[0]+faq[2]); replaced with "deri görünümlü yüzey / yüzey" wording (matches 359/355/353). SEO `keywordEntities` + category nav links preserved. Verified live: PDP 200, softened copy renders, all CTAs/sizes/price/lead form/Ürün Rehberi intact, 0 leather claims in prose, active set still [353,354,355,359]. #354 now ad-safe on material wording. Docs commit `docs: record D-338A product 354 claim softening`.

## Ad-relaunch readiness — 2026-06-21 (D-338: first ad-test readiness check — GREEN, no blocker)

Read-only confirmation that the first paid ad test can run on the clean loafers. All PASS:
- 4 products (359/355/354/353) public PDP 200, brand-safe, price + sizes + stock + WhatsApp CTA + lead form + ÜRÜN REHBERİ + single FAQ, no fake reviews.
- #362 still `draft`, PDP 404, homepage 0× brand/`ai-362`.
- UTM landing URLs resolve (359 verified 200 w/ query string); D-326 params correct.
- UTM persistence wired: client `captureFirstTouch()` (D-315) + `/api/inquiries` stores utmSource/Medium/Campaign + product (D-320).
- Lead form renders on all 4; code path intact (did not submit a new live test lead — D-320/D-322 already verified).
- **Advisory (not a blocker):** product **354** copy claims "Gerçek/Hakiki deri" — only SKU with an explicit genuine-leather claim; operator should confirm substantiable or soften before advertising it.
- **Verdict:** ad test MAY START. Caveats: finish #362 external cleanup (Shopier/X/FB); resolve 354 leather claim; lead creatives on 359/355/354, 353 backup, none deep-link #362. Docs commit `docs: record D-338 first ad relaunch readiness`.

## Closure checkpoint — 2026-06-21 (D-337: GEO + brand-safety + reverse-search closure audit — GREEN, ad test may resume)

Read-only verification before first paid ad test. All checks PASS:
- **Active set = `[353,354,355,359]`** (4 clean loafers); homepage rail shows only these; 0× brand / `ai-362`.
- **#362 contained:** `status:draft`, public PDP → HTTP 404 (only cosmetic `<title>` brand string remains; body is 404).
- **Visible GEO:** PDP 359 + 355 SSR-render `ÜRÜN REHBERİ` (clean headings, no `##`/`**`, single FAQ, `ARAMA NOTLARI` chips).
- **Brand-safety guard:** scanner + Layer 1 (mentixAudit) + Layer 2 (channelDispatch) wired; 9/9 tests pass; no Layer 3 (deferred).
- **Reverse-search:** PI report 47 (product 359) = `similar_style`, confidence 70, **referenceProducts:4**, imageUri error gone, `visibleBrand:null`.
- **STILL MANUAL (operator-only):** external cleanup of Shopier `48281164`, X `#NewBalance` tweet, Facebook post — website containment does not retract external posts.
- **Verdict:** first ad test may resume; keep creatives off #362; finish manual external cleanup. Docs-only commit `docs: record D-337 geo brand-safety closure audit`.

## Current status — 2026-06-14 (D-302 → D-320, all deployed to production `main`)

Ad-readiness / conversion sweep + lead-flow fix (Vercel, live):
- D-302/D-303: product-card image bg + `object-fit:contain`; image-gen unified studio bg, 74–80% scale, suede material branch.
- D-304→D-308 (Phase 1 conversion): card hover, hero ad-copy + CTAs, homepage mobile sticky WhatsApp, "Nasıl Sipariş Verilir?", product-first reorder; PDP CTA polish.
- D-310/D-311/D-312: full-width editorial section + "Tarzına Göre Seç" tiles + social-proof section (DEMO reviews; `DEMO_REVIEWS_ENABLED=false` in prod) + premium footer.
- D-313 demo reviews OFF; D-314/D-314b ad-readiness cleanup (external Unsplash removed, duplicate WhyUs removed, About shortened, editorial→gradient, safer tiles, typo); D-315 first-touch UTM attribution survives homepage→PDP; D-316A internal `trackEvent` foundation (no external pixels); D-317/D-318 PDP footer + trust-strip claim cleanup.
- **D-320 (latest):** fixed product-page lead-form **HTTP 500** — `/api/inquiries` now coerces `productId` string→number for the numeric `product` relationship (fail-soft). Deployed `9a8001b`; live controlled re-test confirmed product-linked submission now succeeds.

**Pending:** D-320 **verified end-to-end** (D-322: product FK + UTM persisted in DB); D319/D320 test leads (id 10/11) marked `spam` (reversible). D-316B external pixels awaiting operator approval; IG feed publishing OFF in live AutomationSettings.

**D-323 pre-ad readiness audit (2026-06-14): READY WITH WARNINGS.** Verified live: homepage (hero/tiles/rails/editorial/footer), PDP (image/title/price/sizes/lead form/WhatsApp/trust strip), lead capture (product FK + UTM persist), WhatsApp flows, no external pixels, no demo reviews, no fast-shipping claims, no card WhatsApp icons. SHOULD-FIX-before-ads: ~~placeholder product "Taslak Ürün 16/06-4184" publicly visible~~ **RESOLVED in D-324**; thin catalog (~6 products) remains. OPTIONAL: D-316B pixel for ad-platform conversion tracking (needs approval + KVKK).

**D-324 catalog hygiene (2026-06-18): DONE.** Unpublished the single visible placeholder product `Taslak Ürün 16/06-4184` (id 361) via Admin (`status active → draft`). It was the only `active` row of 17 `Taslak Ürün …` products (other 16 already `draft`); the 6 real products stayed `active`. No rename, no delete, no code change, no external publishing (Products afterChange dispatch fires only on `→ active`). Live homepage re-verified clean across all rails. Storefront now shows only real products → catalog clean for ad traffic.

**D-336A+B brand-safety guard IMPLEMENTED (2026-06-19): CODE, validated.** Layers 1+2 shipped (no Layer 3). NEW `src/lib/brandSafety.ts` (22 brands + 14 claim terms, Turkish-aware, whole-token + stem matching, never-throws). Layer 1 in `mentixAudit.ts`: brand → `needs_revision`/approvedForPublish=false → not publish-ready → not activated (shown in existing Telegram approve/revise UX). Layer 2 in `channelDispatch.ts`: brand → all external channels skipped (no Shopier/X/FB/IG publish). False-positive-aware (brand hard-blocks; "model"/"logo" warn only; brand+claim=critical). tsconfig excludes test. Validated: esbuild OK + 9/9 assertions (clean 359-like pass; 362-like blocked critical; active [353,354,355,359] pass; "model" alone not blocked). No schema change. Limitation: admin force-activate bypasses Layer 1 but Layer 2 still blocks external publish; Layer 3 (Products.ts hard gate) optional/later. Detail: DECISIONS D-336A+B.

**D-336 brand-name guard plan (2026-06-19): PLAN, no code.** Designed a layered guard so brand-named products (like #362/#358/#349) can't reach public channels. Flow: intake→content→**Mentix audit**→publish-ready→activate→channelDispatch. #362 slipped because the audit has no brand rule. Plan: NEW `src/lib/brandSafety.ts` (blocklist + claim detector + co-occurrence risk) reused by Layer 1 = brand check in `mentixAudit.ts` (blocked brand → needs_revision → not activated, surfaced in existing Telegram approve/revise UX); Layer 2 = pre-dispatch block in `channelDispatch.ts`; Layer 3 (optional) = `Products.ts` beforeChange →active. False-positive-aware (brands hard-block; claim terms warn unless co-occurring with a brand). No DB schema change. Recommend D-336A (brandSafety.ts + audit) first, operator approval needed. Detail: DECISIONS D-336.

**D-335A visible "Ürün Rehberi" PDP section (2026-06-19): CODE.** Added a server-rendered discovery section to `products/[slug]/page.tsx` showing existing `discoveryPack.articleTitle` + `articleBody` (paragraphs) + `keywordEntities` (as "Arama Notları" chips), placed between the product section and "Benzer Modeller". Gated on article presence (hides if none); FAQ left as-is (no duplicate); no "GEO"/AI wording; Turkish labels; existing content only (no generation, no product-data change); mobile-first SSR. esbuild TSX OK; live verify post-deploy. #362 unaffected (draft/404). Detail: DECISIONS D-335A.

**D-335C product #362 containment (2026-06-19): DONE.** Operator-approved: set #362 `active→draft` via Admin API (only status changed; title/slug/price/stock/channels unchanged; reversible). Verified: status=draft, PDP HTTP 404, homepage + /ayakkabilar show 0× New Balance/ai-362, active set=[353,354,355,359]. Website brand exposure CONTAINED. External cleanup STILL required (manual operator): Shopier shopier.com/48281164, X tweet #NewBalance, FB post (IG off). No rewrite yet. Detail: DECISIONS D-335C.

**D-335B product #362 brand-safety audit (2026-06-19): READ-ONLY — HIGH→CRITICAL risk.** #362 "New Balance Sneaker Çok Renkli" is `active` + published to website/shopier/x/facebook. Pervasive brand wording (title/meta/keywords/highlights/FAQ/channel copy) + logo emphasis ("'N' logosu") + specific model ("9060") + **authenticity claim "özgünlüğünü vurgular"** + X copy "#NewBalance". Worse than D-328. Recommend: A) set #362 to draft NOW (operator approval, like D-328); B) rename/rewrite generic; E) operator legal/business call. External cleanup NEEDED (draft hides website only): Shopier link (shopier.com/48281164), X tweet (#NewBalance, live), FB post; IG likely off. RECURRENCE: no brand-name guard in pipeline (reached live despite D-328). Detail: DECISIONS D-335B.

**D-335 product #362 GEO visibility audit (2026-06-19): READ-ONLY.** #362 = "New Balance Sneaker Çok Renkli" (₺4.444, Spor, active/published). Live PDP CONFIRMS GEO content is generated + applied + VISIBLE: GEO description, 5 highlights ("Ürün Özellikleri"), 5 FAQ ("Merak Ettikleriniz"), 14 keywords + full SEO meta. GEO lives on `product.content.commercePack`+`discoveryPack`; PDP renders websiteDescription/highlights/faq visibly + meta/JSON-LD hidden; does NOT render `discoveryPack.articleBody` or PI geoPack (AI-summary/comparison). So operator's "no GEO content" = visibility gap (woven-in + unlabeled; long-form GEO not surfaced). Fix = D-335A add visible PDP GEO section (article/AI-summary) + runbook note. SECONDARY: #362 is brand-named ("New Balance") + near-authenticity claims → brand-safety review like D-328. PI report row not checked (admin 403). Detail: DECISIONS D-335.

**D-334A VERIFIED (2026-06-19/21): OUTCOME A — fixed + evidence improved.** After 3 operator triggers failed to land on @Uygunops_bot, Claude (operator-authorized) pressed "Yeniden Üret" on report 45 (NOT pi:sendgeo) → new report **id 47**: `matchType: similar_style`, confidence 70, **referenceProducts: 4** (was 0), no imageUri error (rawProviderData keys gemini/search/textSearch). 4 similar loafers from instagram.com. D-334A base64 fix CONFIRMED working — Google Vision reverse-image now returns evidence. No external publish.

**D-334A Google Vision reverse-search fix (2026-06-19): CODE.** Patched `providers/googleVision.ts` to fetch image bytes server-side and send `image.content` base64 instead of `image.source.imageUri` (fixes the "can't access URL on your behalf" error → referenceProducts=0). Guardrails: 15s timeout, content-type/size/non-empty checks, fail-soft, no secret/byte logging. esbuild OK; free tier; no env/schema change. Live verify pending operator `#geohazirla 359`. Detail: DECISIONS D-334A.

**D-334 reverse-search provider audit (2026-06-19): READ-ONLY, root cause found.** PI reports have `referenceProducts=0` because the Google Vision provider (`googleVision.ts`) sends `image.source.imageUri` (the uygunayakkabi.com media URL) and Google can't fetch it → per-image error "We're not allowed to access the URL on your behalf. Please download the content and pass it in." NOT env-missing (prod HAS GOOGLE_VISION_API_KEY — Vision responded), NOT provider-unsupported. Classification = image input/query issue (code). Recommended fix = keep Google Vision + code patch to send base64 `image.content` instead of `imageUri` (~10 lines, one function, free tier, no paid credits). Implementation pending approval (D-334A). Detail: DECISIONS D-334.

**D-333C manual PI trigger RESOLVED (2026-06-19): WORKING.** Claude (operator-authorized, via operator's Telegram Web) sent `#geohazirla 359` to the verified @Uygunops_bot DM (id 8702872700). Bot acknowledged ("analiz başlatıldı — #359") and ~40s later posted full report ready (SEO title/meta/desc/tags/FAQ/AI-summary/buyer-intent/comparison all ready; claim-safety enforced). NO approval/sendgeo button pressed. ROOT CAUSE of all earlier failures CONFIRMED = command wasn't reaching the @Uygunops_bot DM (wrong bot/chat); webhook + code were always healthy. Reverse-image search still fails in prod (google_vision "not allowed to access URL" — provider gap, SEO/GEO text unaffected). Manual trigger now FUNCTIONAL. Detail: DECISIONS D-333C.

**D-333B manual trigger verify after confirmed DM (2026-06-19): CAUSE ISOLATED — client/chat delivery.** Confirmed DM `#geohazirla 359` to @Uygunops_bot STILL produced no report/event (newest report id 44 + newest event both 2026-06-16). In a DM, no gate can drop `#geohazirla` and a successful run would create a draft row + "starting" reply — neither exists → the update never reached `/api/telegram`. Webhook config healthy (D-333A); route code correct (D-333). So cause = Telegram client/chat delivery (bot not /start-ed for this user, wrong/look-alike bot, or delivery anomaly). Smallest next: operator DMs `/pipeline` or `/start` to @Uygunops_bot — reply → PI-path-specific (D-334 code); no reply → bot unreachable for this user (start it / verify username). Auto-bridge unaffected. Detail: DECISIONS D-333B.

**D-333A Uygunops webhook diagnosis (2026-06-19): WEBHOOK HEALTHY, no repair needed.** getMe=@Uygunops_bot (8702872700); webhook url = `https://www.uygunayakkabi.com/api/telegram` (correct); pending=0; secret matching (no 401s); only stale error = "Read timeout expired" from 2026-06-16 15:02 UTC (the June-16 content-gen run). setWebhook → "Webhook is already set" (idempotent no-op). Conclusion: webhook is NOT the cause; today's command most likely never landed on @Uygunops_bot (no row/event/error/pending). Separate architecture note: slow handler can exceed Telegram read timeout (fast-ack + background PI = future D-334). Next: operator DMs `#geohazirla 359` to @Uygunops_bot, reports reply. Detail: DECISIONS D-333A.

**D-333T manual PI trigger confirmation (2026-06-19): VERIFIED BROKEN.** After operator DM'd `#geohazirla 359` to @Uygunops_bot, STILL no fresh report/event (newest report id 44 + newest event both 2026-06-16; anyEventToday=false). "Wrong bot" RULED OUT. Handler sends a "starting" reply + creates a draft row before work — neither happened → update never reached handler. Cause = Uygunops Telegram webhook delivery/config (url unset/wrong, secret mismatch→401, or delivery error). No code defect. Smallest next: operator runs getWebhookInfo (read-only; Claude can't — token-in-URL) → then D-333A re-register webhook (config, approval). Detail: DECISIONS D-333T.

**D-333 GEO manual-trigger audit (2026-06-19): READ-ONLY, root cause narrowed.** `#geohazirla` is Uygunops-owned (@Uygunops_bot); GeoBot redirects it. Parser accepts `#geohazirla 359`. Live config: `telegram.groupEnabled=true`, `allowedUserIds` empty (=open). Ruled out: format/parser, group-disabled, allowlist, DM-auth. Live candidates: (a) wrong bot (sent to GeoBot → redirected) or (b) Uygunops webhook not delivering in prod. No manual PI report has ever existed (all geo_auto); handler creates a draft row early yet none exists today → message never reached the handler. getWebhookInfo NOT run (secret-in-URL prohibited). Smallest fix: operator re-sends `#geohazirla 359` as DM to @Uygunops_bot; if silent → re-register Uygunops webhook (config, no code). No code fix needed. Detail: DECISIONS D-333.

**D-332R PI report review for 359 (2026-06-19): DONE.** Reviewed report id 43 (ready, `geo_auto`, 2026-06-09 — only report for 359). Vision analysis STRONG + accurate; SEO pack STRONG and already reflected on the live PDP; GEO pack STRONG with claim-safety enforced. Reverse-image evidence ABSENT (0 reference products; only Gemini ran — provider gap) → matchType=low_confidence/exactProductFound=false. Verdict: usable for SEO + GEO + safe for GeoBot; weak only on external/competitor evidence. SECONDARY: today's manual `#geohazirla 359` produced NO report/event (all PI reports are geo_auto; bot last active 2026-06-16) → manual Telegram PI trigger looks non-functional in prod (logged in BUGS). Detail: DECISIONS D-332R.

**D-332 controlled PI dry-run for 359 (2026-06-19): PREP DONE, EXECUTION PENDING OPERATOR.** Read-only prep complete (git clean 342d75d; local env presence checked — GEMINI/TELEGRAM_BOT/DB present, provider keys missing locally but PROD Vercel env is authoritative + unknown). Trigger-path VERIFIED: `createProductIntelligenceReport` is callable ONLY via the Telegram `#geohazirla` path — no HTTP endpoint — so the run must be started by the operator sending `#geohazirla 359` (Claude won't spoof the webhook or run an ad-hoc prod harness). Chrome admin window was down this turn → couldn't read existing reports. Nothing triggered/published. Detail: DECISIONS D-332.

**D-331 GEO/PI re-entry audit (2026-06-18): READ-ONLY, no change.** Re-entered GEO/Product Intelligence track. Full subsystem present under `src/lib/productIntelligence/` (createProductIntelligenceReport D-220, analyzeProduct/Gemini vision, reverseImageSearch + 3 providers GoogleVision/DataForSeo/SerpApi, generateSeoGeoPack, geoBotHandoff) + orchestration `contentPack.ts` (resolvePiResearch D-225 auto-bridge) + collection `product-intelligence-reports`. Telegram triggers VERIFIED: `#geohazirla|#seoara|#productintel|#urunzeka` (aliases). Publish boundary VERIFIED: PI report = internal (report row + bot-events + read-only external APIs); external publish only on operator `pi:sendgeo` callback. DataForSEO runtime UNKNOWN (env-gated; historical Organic SERP 403). Safe controlled single-product PI run (e.g. 359) is feasible without publishing but is NOT read-only (writes report row + spends API credits) → needs approval. Detail in DECISIONS.md (D-331).

**D-329 launch-day checklist (2026-06-18): GO WITH WARNING.** Final verify: 4 ad products active w/ stock (359/355/354=10, 353=4); all 4 PDPs HTTP 200, images+sizes+WhatsApp+lead form+Shopier present, 0 brand text, 0 placeholder product text; 358/349 confirmed draft & absent from rails; D-326 UTM URLs resolve and UTM params persist through the www redirect. Warnings (operational only): WhatsApp <15-min staffing (operator confirm), thin stock, no pixel (UTM-only), open price-in-creative call. Cleared to launch the small UTM-only test.

**D-328 brand-risk catalog cleanup (2026-06-18): DONE.** Operator-approved. Set products 358 `Louis Vuitton Loafer Bej` + 349 `BOSS Süet Loafer` to `status: draft` (active→draft, reversible, no rename/delete, no publishing hooks). Verified live (cache-busted): homepage + all 3 ad PDPs now show 0× "Louis Vuitton" / "BOSS"; Benzer Modeller rails clean. Active set = exactly the 4 ad loafers `[353,354,355,359]`. Storefront now brand-name-free → trademark leak from D-327 RESOLVED.

**D-327 pre-launch readiness + runbook (2026-06-18): AUDIT, no change.** Stock verified: 359/355/354 = 10 units each (40–44 @2), 353 backup = 4 (40–43 @1, no 44) — thin but OK for a small test. 3 ad PDPs functionally ready (images/WhatsApp/lead form/Shopier, no fake claims, no placeholder text). **SHOULD-FIX-BEFORE-ADS:** "Benzer Modeller" rail on all 3 ad PDPs shows brand-named `Louis Vuitton Loafer Bej` (358) → recommend operator hide/rename 358 (+349) before launch (needs approval; not done). Lead-response runbook + result-tracking plan written. Verdict: READY for small UTM-only test, conditional on resolving the brand leak + fast WhatsApp response. Full doc: `campaigns/D-327-pre-launch-runbook.md`.

**D-325 first ad campaign plan (2026-06-18): PLAN, no site change.** Verdict: READY for a small, manual, UTM-only first test. Catalog = 6 active loafers (₺1.750–2.099, 3 studio imgs, 40–44 @ 2/size). Ad-safe set excludes brand-named products `Louis Vuitton Loafer Bej` (358) + `BOSS Süet Loafer` (349) — trademark/counterfeit ad-policy risk. Recommend: advertise Premium Kahve Püsküllü (359) + a black loafer (355/354); land on the product PDP (backup homepage); WhatsApp-primary CTA with lead form as the trackable UTM signal; UTM-only tracking now, D-316B pixel/KVKK AFTER first validation + BEFORE scaling. Budget ₺150–300/day, 5–7 days, TR/men ~25–45, broad. Key risks: thin catalog + low stock (~10 units/product), no pixel = manual attribution, manual WhatsApp workload + response speed. Full plan in DECISIONS.md (D-325).

---

## 🔒 LOCK CHECKPOINT — 2026-04-28 — Production Baseline

**Operator confirmation:** "it's working perfectly now". This checkpoint freezes D-227 → D-231 as the **stable production baseline**. Future sessions must continue from this state, not redesign it.

### LOCKED — Production-validated and treated as authoritative

- **PI auto-bridge into GeoBot** is working in production. `resolvePiResearch()` in `src/lib/contentPack.ts` runs inside `triggerContentGeneration()`; auto-creates a PI report when none exists; falls back to legacy product-only prompt on any failure.
- **`trigger_source='geo_auto'`** is the recorded value for auto-bridge runs (Neon `enum_product_intelligence_reports_trigger_source` was manually altered with `ADD VALUE IF NOT EXISTS 'geo_auto'`).
- **`pi.auto_trigger_failed` bot-event** surfaces silent auto-bridge failures — D-227 observability layer.
- **`detectedVisualNotes`** reaches the GeoBot prompt as a citable evidence field. Was previously dropped at the translation layer.
- **Mandatory prompt rules** in `buildPiResearchBlock` + `buildCommercePrompt` + `buildDiscoveryPrompt` produce visibly product-specific output (brand/type/color/material/style/visualNotes referenced explicitly; generic phrasing banned).
- **Duplicate-confirm race protection (D-228)** — `applyConfirmation` short-circuits when the product was confirmed within the last 5 minutes. Kills the 2× pipeline runs and the commerce-pack-nulling race seen on products 304 and 305.
- **Commerce pack token budget** raised 4096 → 8192 (D-231). Prevented MAX_TOKENS-mid-JSON silent failures after D-229's tighter rules.
- **Commerce + discovery generation parallelized** via `Promise.allSettled`. Wall time drops from ~100 s sequential to ~50–60 s parallel; one failure no longer blocks the other.
- **D-229 richness levers** all live: wider vision schema (soleType, closureType, brandTechnologies[], distinctiveFeatures[], colorAccents[], constructionNotes), deeper SEO/GEO pack (brandTechnologyExplainer, careAndMaintenance, sizingGuidance, styleGuide, technicalSpecs[], useCaseExplainer, alternativeSearchQueries[]), 1200–2000 word discovery article with 8 mandatory sections.
- **Wizard vision autofill (D-230)** — one Gemini vision call at wizard initialization detects category + productType + brand+model+color. High confidence ≥70% silently fills `collected` and skips the prompt. Low confidence 40–69% renders a `🤖 PI önerisi: …` hint inline. Below 40% prompt as before. Operator can always override via the Düzenle button. `tamam` shortcut accepts the brand suggestion.
- **Image wrapper fix (`no_image` bug)** — `getProductPrimaryImage` now correctly unwraps the Payload `array → { image: <media> }` shape and falls back to a direct `media` collection query. Was returning null for every product before the fix.
- **Diagnostic surface** — vision autofill failures emit a one-line `🤖 PI Bot: görsel analiz çalıştı ama kullanılabilir sonuç dönmedi (<reason>)` message in Telegram so silent failures are now visible.

### DEFERRED / OPTIONAL — not blocking the locked baseline

- **DataForSEO Organic SERP 403** — text-search fallback returns 403 because the DataForSEO account doesn't have Organic SERP enabled. Not blocking; the wider vision + deeper pack already produce rich PI output without competitor snippets. Either enable Organic SERP in DataForSEO dashboard later or leave as-is.
- **Discovery `metaDescription` occasionally exceeds 160 chars** — warning only, not a hard failure.
- **Old open-task investigations** (task #10 product 288 forceRedispatch hook no-op, task #15 duplicate wizard-apply variants on 297, task #29 D-223 #geohazirla 298 validation, task #9 D-208b churn) — explicitly **not required for the current locked flow**. Lower priority backlog. Do NOT reopen as part of any D-227 → D-231 follow-up work.
- **Future enhancements** (e.g. mid-confidence button-click suggestions, multi-image vision aggregation, brand-confidence display in summary) should not be mixed into this locked checkpoint. New scope = new D-number.

### Lessons recorded in memory

- Enum/select-field changes on Neon can silently skip the `ALTER TYPE … ADD VALUE` migration under `push:true` — incident #5 in `feedback_push_true_drift.md`. Always verify enum values manually on prod after select-field option additions.
- When Gemini prompt requirements grow (more mandatory fields, stricter wording, longer prose), `maxOutputTokens` MUST be revisited. 2.5-flash thinking-token overhead consumes the budget before the visible output. 4 incidents recorded in `feedback_gemini_token_budget.md`. Current floors: vision 6144, commerce 8192, discovery 16384, SEO/GEO pack 10240, wizard brand-autofill 3072.
- Wizard autofill depends on the **actual product image shape** in Payload — `products.images` is an array of `{ image: <media> }` wrappers, NOT a flat media array. Always unwrap before reading `.url` / `.sizes`.
- **Silent failures must surface visible events / diagnostics** — every step that can quietly drop output should emit a bot-event or send a one-line Telegram diagnostic so the operator can see WHY autofill / vision / generation didn't help.

### How to extend safely from this baseline

- New work should branch from `main` at the lock commit and add new `D-23x` numbers, not modify locked behaviour.
- Schema changes still require manual Neon DDL + post-deploy verification (Blocker 0 still applies).
- Token-budget changes for any Gemini call should look at `feedback_gemini_token_budget.md` first.

---

## Current Status

**D-284 Homepage End-of-Page Exit Recovery — SHIPPED** (2026-05-11) — Added `PreFooterCTA` component as a compact final CTA strip between `DiscountedSection` and `Footer`. Root problem: `DiscountedSection` ended cold (its "Tümünü Gör →" button is in the section header, not the bottom); after scrolling all discounted products, visitors hit the dark footer with no action prompt. Additionally, if `discounted.length === 0`, `DiscountedSection` returns null and visitors jumped from `TrustValueSection` to `Footer` with the TrustValueSection CTAs already scrolled past. Fix: `PreFooterCTA` renders unconditionally — catches both paths. Centered layout: "KOLEKSİYON" eyebrow → "Beğendiğiniz Bir Şey Buldunuz mu?" heading → brief honest subtext → filled dark "Tüm Ürünlere Göz At →" primary button (→ catalog) → "Yardım Merkezi →" text link (→ contact page). Browse hierarchy preserved. No redesign, no new architecture. Commit `de41f625`. D-284.

**D-283 Homepage Mid-Page Conversion Bridge — SHIPPED** (2026-05-11) — Added CTA bridges to WhyUsSection and StepsSection so mid-page informational sections route visitors back into action. Both sections were passive dead ends — WhyUsSection explained credibility but left visitors nowhere to go; StepsSection walked through the full 4-step order process ending at Step 1 (browse products) with no return path to the catalog. Changes: `WhyUsSection({ onNav })` — added `onNav` prop + outline button "Koleksiyonu Keşfet →" below credibility cards (guard: `onNav && ...`). `StepsSection({ onNav })` — added `onNav` prop + filled primary button "Ürünleri Keşfet" + helper text "Adım 1'den başlayın — göz atmak ücretsiz" below step cards. Both render calls updated to pass `onNav={nav}`. Browse hierarchy preserved: product browsing primary, inquiry secondary, WhatsApp tertiary. No redesign, no new architecture, no schema change. Commit `9ac8174`. D-283.

**D-282 Homepage Product-Section Hierarchy/Redundancy Polish — SHIPPED** (2026-05-10) — Fixed duplicate-eyebrow, data-overlap, and authenticity problems in BestSellersScroll. Both Popular Products and BestSellersScroll were labelled "POPÜLER" — identical framing on two sections. BestSellersScroll data (`slice(0,10)`) overlapped completely with Popular grid's first 6 products. "Çok Satanlar" (Bestsellers) label was not backed by actual sales data. Changes: eyebrow → "KOLEKSİYON", title → "Daha Fazlasını Keşfet" (honest discovery framing), data → `slice(6,18)` (products 7–18, no overlap with Popular grid), empty guard added. Three product section roles now clearly distinct: Popular (featured picks) → Koleksiyon/Daha Fazlası (discover more) → Fırsatlar (deals). Commits `1fb915ea` + `e1d06c17`. D-282.

**D-281 Homepage Product-First Scroll Path Polish — SHIPPED** (2026-05-10) — Moved Popular Products section from homepage position 4 to position 3 (after CategoryOverlay, before WhyUsSection). Mobile scroll depth to first product card reduced from ~3020px (~3.5 viewport heights) to ~1404px (~1.7 viewport heights). Popular Products top padding reduced 100px→60px since section is now adjacent to CategoryOverlay. WhyUsSection becomes credibility reinforcement after visitor has seen real products. New homepage order: Hero → CategoryOverlay → Popular Products → WhyUsSection → Steps → BestSellers → About → Trust → Discounted → Footer. Commit `0e6222ff`. D-281.

**D-280 Homepage Discovery Hierarchy Polish — SHIPPED** (2026-05-10) — Polished the top-of-homepage discovery hierarchy so Hero CTA, quick-start search, and category entry feel ordered and intentional. Moved `CategoryOverlay` (search + category chips) immediately after Hero, before `WhyUsSection` — discovery tools now appear before credibility content. On mobile WhyUsSection's 6 stacked cards were blocking access to search. Eyebrow label changed `KATEGORİ` → `KEŞFET` to signal both search + category entry modes. Helper copy updated to explicitly name all 3 entry modes (search / category / browse all). "Tüm Ürünler →" demoted from heavy dark chip to subtle muted text link below chip row — removes redundant 3rd catalog CTA near Hero's primary CTA. No redesign, no new architecture. Commit `1bcc10ef`. D-280.

**D-279 Homepage Quick-Start Search Shortcut — SHIPPED** (2026-05-09) — Compact search form added to `CategoryOverlay` on homepage so visitors who know what they want can search directly without navigating to Catalog first. `initQuery` state added to App, seeded from the homepage form; `nav()` extended with optional `q` third param; `Catalog` accepts `initQuery` prop and seeds `query` state from it. `CategoryOverlay` subtext updated to reflect dual search + category entry. Commits `18bc66a` + `934b856` on main (origin/main confirmed at `934b856`). D-279.

**D-278 SupplierScout Phase 3A Fix 1 — COMPLETE + VERIFIED** (2026-05-13, commits 0950a579 + ed3a95e9) — Fixed 5 bugs in `autoCreateProduct()` that caused product creation to silently fail after the Phase 1B/1C nested-group schema repair. Root causes: (1) all `supplierMeta`, `automationMeta`, `workflow`, `channels` fields were passed as dot-notation flat keys (e.g. `'supplierMeta.stockMode': value`) which Payload v3 silently ignores — replaced with proper nested objects; (2) variant fields were `stockQuantity` (→ `stock`) and `sku` (→ `variantSku`) — both wrong field names per Variants.ts schema; (3) `channels.publishWebsite` was not explicitly forced to `false` — Products.ts defaultValue is `true`, meaning every draft was being published to website; (4) `workflowStatus: 'intake'` is not a valid Payload select option (valid: `draft`, `visual_pending`, etc.) — was triggering a silent ValidationError on `payload.create()`; (5) `contentStatus: 'not_started'` is not a valid option (valid: `pending`, etc.) — same cause. All five fixed. Controlled test: WO#31 (Nike Air Jordan 1 Retro High OG Chicago, 2500 TRY, 6 sizes, group=2 test data, parseScore=95) → Product #330 created. All 20 verification conditions passed: draft status, source=supplier_scout, publishWebsite=false, all 7 channels false, supplierMeta fully populated (stockMode=supplier_virtual_stock, wholesalePrice=2500, wholesaleCurrency=TRY, marginApplied=15, supplierGroupId=2, wholesaleOpportunityId=31, autoCreatedAt set), automationMeta populated (telegramMessageId='1104', telegramChatId='-5263995053'), workflow all pending, 6 variants (sizes 40-45) each stock=10 variantSku='SS-NIKEA-{size}', WO#31 status=product_created createdProduct=330, action log row added, real RolvoDropIthal WOs product_created=0. autoPauseActive=true and all SupplierGroups autoCreateEnabled=false throughout. D-278.

**D-278 SupplierScout Autonomous Supplier Bot — CODE COMPLETE, partial Neon DDL applied, pending 9-table supplier DDL + activation** (2026-05-09) — Fully autonomous Telegram bot that monitors wholesaler groups, classifies Turkish supplier messages with Gemini 2.5 Flash NLP (11 message classes), auto-creates draft products when confidence ≥ 75 and 9-condition gate passes, detects and applies sold-out signals using 6-signal scored matching, and delivers a nightly private Telegram report to Frank at 23:30 Istanbul. Completely separate from Uygunops/GeoBot (separate token SUPPLIER_SCOUT_BOT_TOKEN, separate route /api/supplier-scout, 9 dedicated collections, own global settings). Key design decisions: fire-and-forget webhook pattern (returns 200 to Telegram immediately, processes async); supplier_virtual_stock mode (stockQty=10, exactStockKnown=false); pricing = wholesale + defaultMarginUSD (default $15); Turkish NLP uses Gemini with full language memory dictionary + Frank's corrections as few-shot context; sold-out auto-apply threshold 80, DM-warn 50-79, report-only <50. Frank teaches the bot new terms via /teach command (e.g. /teach RC = Rain Cloud for New Balance). 14 private DM commands including /pause_auto, /resume_auto, /teach, /corrections, /learning_today. Immutable audit log (SupplierActionsLog) for every autonomous action. Files: src/lib/supplierScout/{types,classifier,parser,soldoutMatcher,productCreator,memory,reportGenerator,commands,telegram}.ts + src/app/api/supplier-scout/route.ts + 9 collections in src/collections/supplier/ + SupplierScoutSettings global. All registered in payload.config.ts. Full documentation: project-control/SUPPLIER_SCOUT.md (architecture + Neon DDL) + project-control/SUPPLIER_SCOUT_RUNBOOK.md (operator runbook). **DDL APPLIED (2026-05-09)**: 16 statements for the `supplierMeta` group on the existing `products` table (enum `supplier_scout` value + `supplier_meta_*` columns) — applied directly to Neon to fix main-group schema error. Products 324+325 created post-fix confirm bot is operational. **REMAINING BLOCKER before SupplierScout activation**: apply 9-table Neon DDL for the supplier/* collections from SUPPLIER_SCOUT.md, add 3 Vercel env vars (SUPPLIER_SCOUT_BOT_TOKEN, SUPPLIER_SCOUT_CHAT_IDS, SUPPLIER_SCOUT_OWNER_CHAT_ID), deploy, register webhook, send /start to bot. D-278.

**D-249 Funnel / Source Performance Snapshot v1 SHIPPED — soak passed** (2026-05-01) — Telegram-first read-only funnel surface that groups demand by source and shows how each source flows through stage→conversion→revenue. **Attribution rule (the only judgement call):** funnel groups by **lead source** (`customer-inquiries.source`), not order source. Reason: `/convert` always sets `order.source='telegram'` regardless of where the lead came from, so order.source can't tell us "where did demand originate". Lead.source IS that answer. Orders attributed via `relatedInquiry` FK back to the lead. Orders WITHOUT a relatedInquiry (direct website/admin/Shopier orders that didn't go through a lead) get a separate "Doğrudan Sipariş (lead-siz)" group with order count + revenue only — no funnel stages because there's no lead to stage. **New helper** `src/lib/funnelDesk.ts` (~270 LOC): `getFunnelSnapshot(payload, {period})` — runs 2 `payload.find` queries (leads in window + orders in window), groups in memory by lead source, computes per-source stage counts (new/contacted/follow_up/closed_won/closed_lost/spam) + ordersConverted + revenue. Direct-orders bucket separate. Totals row aggregates lead-attributed only. Period switch: `today` (UTC day boundary) or `week` (trailing 7 UTC days). Defensive numeric coercion via `toNumber()` for pg's string-numeric quirk. Source labels mapped to operator-friendly names (website→Website, telegram→Telegram, instagram→Instagram, phone→Telefon, shopier→Shopier, manual_entry→Manuel, bilinmiyor→Bilinmeyen) — unknown sources passed through HTML-escaped. **Concise render**: per-source blocks omit zero-stage rows (no `Spam: 0` clutter); zero-revenue rows omitted; direct-orders block only renders when count > 0; legacy `completed` status rolled into `closed_won` for funnel display. **Empty short-circuit**: when window has zero leads + zero orders → single-line `✅ Bu pencerede lead/sipariş hareketi yok.` with pointer at `/business · /leads summary · /sales today`. **Telegram surface registered in SHARED_CMDS:** `/funnel` (default = today), `/funnel today`, `/funnel week` (alias: `hafta`, `son7`), TR alias `/huni`. **Convergence with prior D-NNs:** uses the same lead.source field added in D-241; same closed_* status set from D-241 enum extension; same relatedInquiry FK from D-244; same order.totalPrice as D-244/D-247; same UTC-day boundary as D-244 getSalesToday and D-247 getDailyOrderSummary. No parallel rules anywhere. **Read-only by construction** — every helper called is `payload.find`; no mutations. Verified in soak: lead+order row counts identical pre/post (3→3, 3→3). **Soak (against live Neon, 6 assertions all pass):** live `/funnel today` composes in **162ms** (2 parallel queries, well under Lambda budget) ✓; live `/funnel week` same logic with 7-day window ✓; read-only verified — lead/order counts unchanged ✓; fully-empty render → `✅` short-circuit ✓; busy-day multi-source render matches spec example shape exactly (Website/Telegram/Instagram blocks + Toplam) ✓; direct-orders bucket renders separately with explanatory footer ✓. Soak harness committed at `scripts/d249-soak.ts`. Typecheck: zero new errors. **Out of scope (v1)**: ratio metrics (conversion rate per source, win rate per source) — small-number interpretation risk; per-product source attribution; cohort analysis (lead created day X → converted day Y); per-stage time-to-progression averages; multi-touch attribution (one lead bouncing between sources); CSV export; comparison with previous period. D-249.

**D-248 Business Snapshot / KPI Desk v1 SHIPPED — soak passed** (2026-04-28) — Operator/owner now has a one-tap Telegram surface that summarizes the entire daily business state. **Pure composition layer**, zero new queries. Every metric comes from an existing helper: `getDailyLeadSummary` (D-243), `getSalesToday` (D-244), `getDailyOrderSummary` (D-247), `getInboxStock` (D-236). New file `src/lib/businessDesk.ts` (~140 LOC) — `getBusinessSnapshot(payload)` runs all four in parallel via `Promise.all` and returns one structured snapshot; `formatBusinessSnapshot(s)` renders concise grouped sections. **Sections rendered:** `📥 Talep (bugün)` — yeni lead, iletişim kuruldu, kazanıldı, kaybedildi (+ 🚮 Spam inline if present), açık lead toplam · `💰 Satış (bugün)` — sipariş count (with `(N lead'den)` split if >0), ciro (kayıtlı or —) · `📦 Operasyon` — açık sipariş, kargolanan bugün, teslim edilen bugün (+ ❌ İptal inline if present) · `⚠️ Aciliyet` (only renders when there's actual urgency) — bayat lead, geç kargo, tükenmiş ürün, az stok. **Empty-state shortcut**: when all 16 signals are zero → single-line `✅ Bugün hiçbir hareket yok ve bekleyen aciliyet yok.` so calm days don't dump a wall of zeros. **No parallel rules** — every count traces back to an existing single source of truth: open lead set from `getOpenLeads`, stale leads from `getStaleLeads`, sales from `getSalesToday`, open orders from `getOpenOrders`, stale shipped from `getStaleShippedOrders`, stock urgency from `getInboxStock`. **Read-only by construction** — every helper called is already read-only; `getBusinessSnapshot` itself does no mutations. **Telegram surface (registered in SHARED_CMDS):** `/business` (default = today snapshot), `/business today` (explicit; same render), TR aliases `/iş` and `/is`. /business week intentionally NOT shipped in v1 — would need new week-scoped queries against existing helpers; defer until volume warrants. **Soak (against live Neon, 6 assertions all pass):** live composition in 1832ms (under 2s with 4 parallel helper calls; matches Vercel Lambda budget) ✓; live snapshot rendered showing 3 open leads + 2 low-stock products from real data ✓; fully-empty short-circuit (`✅ Temiz`) ✓; busy day with no urgency renders correctly with urgency block hidden ✓; quiet day with mounting urgency renders all 4 urgency lines ✓; mixed realistic scenario with optional inline bits (🚮 Spam, ❌ İptal) ✓. Soak harness committed at `scripts/d248-soak.ts`. Typecheck: zero new errors. **Out of scope (v1)**: `/business week` (new week-scoped queries needed); ratio metrics (conversion rate, win rate); historical charts/graphs; per-source breakdown; alerts when KPIs cross thresholds; export to CSV; comparison with yesterday/last week. D-248.

**D-247 Order Alerts / Delivery Reminder Layer v1 SHIPPED — soak passed** (2026-04-28) — Symmetric to D-243 lead alerts, but for orders. Three-pronged lightweight reminder layer on top of D-245/D-246. **A) Push: new-order Telegram alert.** Wired into `Orders.afterChange` as a parallel hook entry (separate from the existing stock-decrement entry). Fires on `operation === 'create'` for **EVERY** source EXCEPT `source === 'telegram'` (operator already saw `/convert` response from D-244 — no double-notification). Skip flags: `req.context.isDispatchUpdate` and `source === 'telegram'`. Fires for: shopier (webhook), website (storefront form), admin (manual), instagram, phone — every channel where the operator hasn't already seen the order. Same `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` env + dispatch pattern as `stockReaction.ts` and `leadDesk.sendNewLeadAlert` so chat routing stays consistent. Alert content: `🚨 YENİ SİPARİŞ · <orderNumber>` + customer name + phone + product SN/title + size/qty + total price (with `✅ ödendi` badge if isPaid) + source + lead link tag if `relatedInquiry` set + `Detay: /order <id>` hint. Full D-245 `orderButtonsKeyboard` attached so operator can ship/deliver/cancel from the alert directly. Wrapped in `void (async ()=>{...})()` so a Telegram failure never blocks order persistence. Audit trail: `order.new_alert_sent` bot-event with `{orderId, orderNumber, source, sentAt, chatId}` payload. **B) Pull: /orderreminders for stale-shipped orders.** New slash command (aliases: `/orderreminder`, `/siparishatirla`, `/sipariş_hatirla`, `/siparis_hatirla`) returns oldest-first stale-shipped orders as cards with full action keyboards. "Stale" = SAME rule as D-246 inbox aging signal (`status='shipped'` AND `(shippedAt ?? createdAt)` older than 3 days). Empty state `✅ Geç teslim olan kargo yok`. Delivered/cancelled excluded by reusing `getOpenOrders`. **C) /orders summary (alias: özet, ozet).** Concise daily snapshot — bugün yeni/kargolanan/teslim/iptal counts + açık total + stale signal. Wraps `getTodayOrders` (D-245) + `getOpenOrders` + `getStaleShippedOrders` so single source of truth preserved. **No new architecture, no new collection, no schema change, no scheduler/cron.** All three surfaces reuse existing helpers; ~210 LOC appended to `orderDesk.ts`. **Noise / dedup behaviour:** new-order alert fires once per successful create — fire-and-forget on a single transactional event; duplicate POST → duplicate row → duplicate alert (same as existing semantics, no new dedup risk). `/orderreminders` is operator-pulled, no spam. No proactive cron — defer until `/orderreminders` cadence is confirmed; future cron can dedup via `order.stale_reminder_sent` bot-event keyed on `(orderId, day)`. **Soak evidence (against live Neon, 9 assertions all pass):** sendNewOrderAlert captures correct Telegram payload (URL, chat_id, parse_mode, text body with all fields, full inline_keyboard with action+nav rows) ✓; `order.new_alert_sent` audit-event delta = 1 ✓; missing TELEGRAM env safely noops with warn ✓; missing order id safely noops with warn ✓; getStaleShippedOrders correctly finds 1 backdated 5-day-old shipped ✓; formatOrderRemindersHeader populated render ✓; delivered orders correctly excluded from reminders after status flip ✓; formatOrderRemindersHeader empty render ✓; daily summary counts + format correct ✓. Soak harness committed at `scripts/d247-soak.ts`. Typecheck: zero new errors. **Out of scope (v1):** proactive stale-reminder cron (operator-pulled is sufficient v1; cron would need dedup via `order.stale_reminder_sent` bot-event); per-order mute / snooze; SLA breach alerts beyond stale threshold; multi-chat dispatch routing (single TELEGRAM_CHAT_ID like every other system alert); rich media in alerts (product image preview); customer-facing notifications (admin only). D-247.

**D-246 Order Integration into /inbox SHIPPED — soak passed** (2026-04-28) — Operator can now triage products + leads + orders from a single Telegram surface (`/inbox`). Symmetric extension of D-242 — same pattern, no new architecture, no new collection, no schema change. **Inbox overview** (`getInboxOverview` + `formatInboxOverview`) extended with an `orders` bucket using D-245's `getOpenOrders` as the single source of truth (no parallel rules — same `OPEN_STATUSES = {new, confirmed, shipped}` net `/orders` uses). New section between 📬 Lead and ❌ Hatalar: `📦 Sipariş: <total> · Yeni: N · Onaylı (kargo bekliyor): N · Kargoda: N · ⏰ Geç teslim (3+ gün kargoda): N`. Stale-shipping row only renders when `staleShippedCount > 0` so the inbox stays concise on clean days. **Aging signal** (late-delivery early warning): shipped orders whose `shippedAt` (or `createdAt` fallback) is older than 3 days. Computed in-memory from the same query result — no schema change, no extra DB hit. Total-zero short-circuit (`✅ Aksiyon gerektiren bir şey yok. Temiz.`) still fires when ALL buckets are zero, now including orders. **New `/inbox orders` sub-command** (aliases: `/inbox order`, `/inbox sipariş`, `/inbox siparis`) sends the header text via new `formatInboxOrdersHeader`, then streams the priority-sorted top-5 open orders as individual messages each with the full D-245 `orderButtonsKeyboard` (📦 Kargola / 🏠 Teslim / ❌ İptal action row + 🆔 Lead / 🔍 Ürün nav row when applicable). Overflow above 5 → `+ N daha — tüm liste için /orders` hint. Empty state renders the same `📦 Inbox · Sipariş — ✅ Açık sipariş yok` message with pointers at `/orders today` and `/order <id>`. Detail/help text in `/inbox help` updated to advertise the new sub-command + `/ship /deliver` action paths. **Action path**: tapping a button on an `/inbox orders` card lands on the existing `oract:` callback (D-245) which converges on `applyOrderStatus` — slash and button paths are identical and idempotent. **No publish/lead semantics weakened** — orders are completely separate from publish gates and lead pipeline; both untouched. **Soak (against live Neon, 8 assertions all pass):** seeded 4 orders (1 new + 1 confirmed + 1 fresh shipped + 1 backdated 5-day-old shipped) → `getInboxOrders` correctly reports `totalOpen=4 staleShippedCount=1` ✓; `formatInboxOrdersHeader` populated render with all 4 status counts + stale highlight ✓; `formatInboxOrdersHeader` empty render ✓; per-order card rendering with correct `oract:<id>:ship` callbacks ✓; `formatInboxOverview` rendered against 3 synthetic scenarios — with leads+orders+stale, with orders but no stale (stale row hidden), fully empty (Temiz short-circuit) — all render correctly ✓. Soak harness committed at `scripts/d246-soak.ts`. Typecheck: zero new errors. **Out of scope (v1)**: per-order inline action buttons inside the overview itself (kept as concise text — actions live one tap deeper at `/inbox orders`); SLA/breach alerts beyond the 3-day stale shipping count; order bulk-selection mirroring D-240; `/inbox stale-shipping` filter view (current `/orders` already prioritizes shipped oldest-first); per-customer or per-cargo-firma filter. D-246.

**D-245 Order Fulfillment / Post-Sale Status Controls v1 SHIPPED — soak passed** (2026-04-28) — Routine post-sale order handling can now happen from Telegram. Reused the existing `Orders` collection AS-IS — no schema change, no new collection, no new architecture. The schema was already fulfillment-ready: `status ∈ {new, confirmed, shipped, delivered, cancelled}`, `shippedAt`/`deliveredAt`/`shippingCompany`/`trackingNumber` fields all exist. The only gap was Telegram surface. **New helper** `src/lib/orderDesk.ts` (~360 LOC): `getOpenOrders(payload)` (status ∈ {new, confirmed, shipped} — terminal states excluded; sort: new newest-first → confirmed newest-first → shipped oldest-first so late-shipping orders bubble up); `getTodayOrders(payload)` (created/shipped/delivered/cancelled today + open total + last 5 created); `getOrderById(payload, id)`; `applyOrderStatus(payload, orderId, action, source)` (single source of truth — idempotent, stamps shippedAt/deliveredAt, refuses pathological transitions); `formatOrderLine`, `formatOpenOrdersList`, `formatOrdersToday`, `formatOrderCard`, `orderButtonsKeyboard`. **Telegram surface registered in SHARED_CMDS:** `/orders` (open queue with priority sort + status counts), `/orders today` (snapshot), `/order <id>` (detail card with action buttons + lead/product nav), `/ship <id>` / `/deliver <id>` / `/cancelorder <id>` (single-item slash actions; identical helper as inline buttons). **Inline buttons via `oract:<orderId>:<action>` callback** — `📦 Kargola · 🏠 Teslim · ❌ İptal` action row + `🆔 Lead #<n> · 🔍 Ürün` nav row (only rendered when relatedInquiry/product present). Lead-card jump button uses new `ldcard:<leadId>` callback that renders the D-241 lead card with full leadButtonsKeyboard. **Refusal rules — protect timeline truthfulness:** `/ship` from cancelled/delivered → refuse with concrete reason; `/cancelorder` from delivered → refuse with admin-refund hint; `/ship` from cancelled → refuse with "yeni sipariş için /convert" hint. **Backfill**: `/deliver` from confirmed (skipping shipped — same-day local courier case) auto-stamps shippedAt = deliveredAt so timeline is never broken. **No fake stock restoration on cancel** — repo has no order-cancel restore-stock path; `/cancelorder` response surfaces a `<code>/restock <sn> <qty></code>` pointer (using SN from product if available, otherwise generic) so operator restores stock explicitly via D-234 if needed. **No mutation of Orders.afterChange hook** — that hook only fires on `operation==='create'` and handles the existing stock-decrement path; status updates use `context: { isDispatchUpdate: true }` for defensive belt-and-suspenders. **Audit trail**: `order.status_changed` bot-event with `{orderId, orderNumber, fromStatus, toStatus, action, source, changedAt}` payload. Best-effort, non-fatal on failure. **Soak (against live Neon, 17 assertions all pass):** open queue render with priority sort ✓; detail card with lead/product nav ✓; /ship first run + idempotency on second press ✓; /deliver after shipped + idempotency ✓; /ship after delivered correctly refused ✓; /cancelorder after delivered refused with refund hint ✓; /deliver from confirmed allowed + auto-stamps shippedAt ✓; /cancelorder allowed + /restock pointer rendered ✓; /cancelorder idempotency ✓; /ship after cancelled refused ✓; missing-id refusal ✓; empty-state render ✓; today snapshot counts ✓; 6 order.status_changed bot-events written ✓. Soak harness committed at `scripts/d245-soak.ts`. Typecheck: zero new errors. **Out of scope (v1)**: editing shippingCompany/trackingNumber via Telegram (admin); refund/return flow (admin); bulk operations across orders; per-cargo-firma routing; auto-stock-restore on cancel (architectural decision — kept explicit). D-245.

**D-244 Lead → Sale Conversion Logging v1 SHIPPED — Neon DDL applied + soak passed** (2026-04-28) — Lead-to-sale conversions are now first-class records linked back to the originating lead. **Reused existing Orders collection** rather than inventing a parallel sales/conversion table — the Orders schema already has rich, truthful fields (orderNumber/customer/product/size/quantity/totalPrice/status/source/paymentMethod/isPaid/notes/shipping) plus an existing afterChange hook that decrements stock + emits inventory log + triggers stock reaction. The only gap was provenance — no link from `customer-inquiries` (lead) to `orders`. Closed with one additive nullable FK: **`relatedInquiry`** (relationship → customer-inquiries) on Orders. **Neon DDL applied directly in this session**: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_inquiry_id integer REFERENCES customer_inquiries(id) ON DELETE SET NULL`. Verified post-apply. **New helpers in `src/lib/leadDesk.ts` (~330 LOC appended):** `convertLeadToOrder(payload, leadId, opts)` (idempotent — refuses with `already_converted` if an Order already links to this lead; pre-fills customer + product + size from the lead; optionally accepts `totalPrice` and `notes`; default-flips lead to `closed_won` afterward via `applyLeadStatus(won)` for free; emits `lead.converted` bot-event); `getConversionForLead(payload, leadId)`; `getSalesToday(payload, {topN})` (counts today's orders, splits `countFromLeads`, sums `totalRevenue` with defensive numeric coercion since pg returns `numeric` as string); `formatConversionCard`, `formatSalesTodaySnapshot`. Numeric coercion via new `toNumber()` helper handles both Payload-coerced numbers and raw pg strings. **Telegram surface registered in SHARED_CMDS:** `/convert <lead-id> [tutar] [not...]` — single-line entry, idempotent, smallest path; `/conversion <lead-id>` — full Order card or `Kayıt yok` empty state with "Oluşturmak için: /convert <id> [tutar] [not...]" hint; `/sales today` (alias: `bugun`, `bugün`) — count + lead-converted split + total revenue + last 5 with order number, customer, product SN, amount, lead link tag. **`/won` and `/convert` no longer ambiguous**: `applyLeadStatus` now appends `💰 Satış kaydetmek için: /convert <id> [tutar] [not...]` to every `closed_won` transition (whether via `/won`, the inline 🏆 button, or convertLeadToOrder's auto-flip), so the operator always knows the next step. Verified inline. **No duplicate stock/inventory writes**: `convertLeadToOrder` only calls `payload.create('orders', ...)` — Orders' existing `afterChange` hook handles stock decrement, inventory log, and stock reaction exactly as for direct website orders. Source set to `'telegram'` so the hook's "skip Shopier" guard runs the proper non-Shopier path. **Audit trail**: each conversion emits `lead.converted` bot-event (uygunops sourceBot) with `{leadId, orderId, orderNumber, totalPrice, source}` payload — best-effort and non-fatal on failure. **Soak (against live Neon, 10 assertions all pass)**: empty-state /conversion render ✓; /convert first run creates Order with all fields populated + flips lead to closed_won + writes audit event ✓; /convert second run returns `idempotent=true` with the existing order's number (no duplicate row) ✓; lead status auto-flipped to closed_won post-convert ✓; /conversion populated render shows full Order card ✓; missing lead refusal `lead_not_found` ✓; second test lead converts cleanly with no amount/notes (smallest path) ✓; /sales today aggregates correctly (count=2, fromLeads=2, totalRevenue=1500) ✓; lead.converted bot-events written for both ✓; cleanup leaves the test data baseline intact ✓. Soak harness committed at `scripts/d244-soak.ts`. Typecheck: zero new errors. **Out of scope (v1)**: editing an existing Order's amount via Telegram (operator uses admin if they need to change it — `/convert` is for the initial record); marking an Order shipped/delivered/cancelled via Telegram (Orders has those statuses but they're admin-driven); refund/cancellation flow; multi-product Orders (Order schema supports one product per row already, matching the lead model); `/sales week` / `/sales month` / per-source breakdown (defer until daily volume warrants); auto-creating Order on `/won` (intentionally separate — operator may not have the price yet at the moment of /won). D-244.

**D-243 Lead Alerts / Follow-Up Reminder Layer v1 SHIPPED — soak passed** (2026-04-28) — Three-pronged lightweight reminder layer on top of D-241/D-242. **A) Push: new-lead Telegram alert.** When the storefront `POST /api/inquiries` succeeds, it fires a fire-and-forget Telegram message to `TELEGRAM_CHAT_ID` (same env + dispatch pattern as `src/lib/stockReaction.ts` so chat routing stays consistent). Alert content: `🚨 YENİ LEAD · #<id>` + name + phone + product (SN tag if linked) + size + message preview (200-char cap) + source + `Detay: /lead <id>` hint + the full 5-button D-241 `leadButtonsKeyboard` (📞 Arandı / 🔁 Takip / 🏆 Kazanıldı / ❌ Kaybedildi / 🚮 Spam) so the operator can act in-place without typing a slash command. Alert dispatch is wrapped in `void (async ()=>{...})()` so a Telegram failure never blocks the storefront response — the lead is already saved. Audit trail emitted as `lead.new_alert_sent` bot-event with `{leadId, sentAt, chatId}` payload (best-effort; non-fatal on failure). **B) Pull: /leadreminders for stale open leads.** New slash command (aliases: `/hatirla`, `/hatırla`) returns priority-sorted top-5 stale-and-open leads as cards with action keyboards. "Stale" = SAME rule as D-242 inbox (`status ∈ {new, contacted, follow_up}` AND `(lastContactedAt ?? createdAt)` older than 3 days). Header renders separate counts: `🆕 hiç dokunulmamış: N · 🔁 takip gecikti: N` so the operator can see urgency at a glance. Empty state `✅ Bayat lead yok (3 günden eski açık lead bulunamadı)`. Closed leads (`closed_won`/`closed_lost`/`spam`/`completed`) explicitly excluded by reusing `getOpenLeads`. **C) /leads summary (alias: özet, ozet).** Concise daily snapshot — bugün yeni/arandı/kazanıldı/kaybedildi/spam counts + açık total + stale signal in one block. Wraps `getTodayLeads` (D-241) + `getOpenLeads` + `getStaleLeads` so single source of truth is preserved. **No new architecture, no new collection, no schema change, no scheduler/cron.** All three surfaces reuse existing helpers; the new file additions live inside `src/lib/leadDesk.ts` (~210 LOC appended). Storefront route extended to also accept `message` and `source` from the body (existing form should already pass these). **Noise / dedup behaviour:** new-lead alert fires once per successful create — fire-and-forget on a single transactional event, so duplicate POSTs would create duplicate rows AND duplicate alerts (not different from existing /api/inquiries semantics). `/leadreminders` is operator-pulled, no spam. No proactive cron — defer until the operator confirms `/leadreminders` cadence is right. **Soak evidence (against live Neon, 9 assertions all pass):** alert capture verifies exact Telegram payload (URL, chat_id, parse_mode, text body, full inline_keyboard); audit-event delta = 1; missing-env safely noops; missing-lead-id safely noops; empty-stale state rendered; backdated leads correctly surface (2 stale: 1 never-touched + 1 needs-followup; oldest-first sort); closed lead correctly excluded; daily summary counts + format correct. Soak harness committed at `scripts/d243-soak.ts`. **Out of scope (v1):** proactive stale-reminder cron (operator-pulled `/leadreminders` is sufficient for v1; cron would need dedup via `lead.stale_reminder_sent` bot-event — easy to add later); per-customer mute / snooze; SLA breach alerts beyond stale threshold; multi-chat dispatch routing (single TELEGRAM_CHAT_ID like every other system alert). D-243.

**D-242 Lead Integration into /inbox SHIPPED — soak passed** (2026-04-28) — Operator can now triage product actions and customer leads from a single Telegram surface (`/inbox`). Smallest extension of D-236 + D-241 — no new architecture, no new collection, no schema change. **Inbox overview** (`getInboxOverview` + `formatInboxOverview` in `src/lib/operatorInbox.ts`) extended with a `leads` bucket using `getOpenLeads` from D-241 as the single source of truth (no parallel rules — same `OPEN_STATUSES = {new, contacted, follow_up}` net `/leads` uses). New section in the overview: `📬 Lead: <total> · Yeni: N · Takip: N · Arandı (açık): N · ⏰ Bayat (3+gün): N`. Stale row only renders when `staleCount > 0` so the inbox stays concise on clean days. Aging signal: contacted/follow_up leads whose `lastContactedAt` (or `createdAt` if never contacted) is older than 3 days. Computed in-memory — no schema change. Full empty short-circuit still fires when ALL buckets are zero (now including leads). **New `/inbox leads` sub-command** (alias: `/inbox lead`, `/inbox müşteri`, `/inbox musteri`) renders the priority-sorted top-5 open leads as individual messages, each with the full D-241 `leadButtonsKeyboard` (📞 Arandı / 🔁 Takip / 🏆 Kazanıldı / ❌ Kaybedildi / 🚮 Spam) so the operator can action in-place via the existing `ldact:` callback. Overflow above 5 surfaces a `+ N daha — tüm liste için /leads` hint to keep the surface concise. Empty state renders the same `📬 Inbox · Lead — Açık lead yok` message with a pointer at `/leads today` and `/lead <id>`. Detail/help text in the `/inbox help` switch updated to advertise the new sub-command + `/contacted /won` actions. **Action path**: jumping to a single lead from inbox uses the in-place inline buttons (one tap → applyLeadStatus via ldact: callback). Operator can also slash-command `/lead <id>` from anywhere for the full detail card. **Idempotency preserved end-to-end** — every action button still routes through `applyLeadStatus` (D-241), which is idempotent and emits the audit event. **No publish safety weakened** — leads are fully separate from publish gates; publish desk + readiness rules untouched. **Soak evidence (against live Neon, 5 assertions)**: getInboxLeads counts match getOpenLeads ✓; formatInboxLeadsHeader renders correctly when populated AND when empty ✓; per-lead cards rendered with correct `ldact:<id>:contacted` callback prefixes ✓; backdated lead correctly marked stale (staleCount=1, threshold=3 days) ✓. Plus 4 synthetic-input scenarios for `formatInboxOverview`: with leads + stale signal, with leads + no stale, fully empty (falls through to the `Temiz` short-circuit). **Out of scope (v1)**: per-lead inline action buttons inside the overview itself (kept as concise text — actions live one tap deeper at `/inbox leads`); SLA/breach alerts beyond the simple stale count; lead bulk-selection mirroring D-240 (defer until volume warrants); `/inbox stale` filter view (current `/leads` already does that with priority sort). D-242.

**D-241 Lead Desk / Customer Inquiry Pipeline v1 SHIPPED — Neon DDL pending + soak pending** (2026-04-28) — Operator can now triage website inquiries from Telegram without an admin visit. Reused the existing `customer-inquiries` collection — no new collection. **Schema extension** in `src/collections/CustomerInquiries.ts`: status enum extended from `[new, contacted, completed]` to `[new, contacted, follow_up, closed_won, closed_lost, spam, completed]` (`completed` kept as legacy alias for `closed_won` so pre-D-241 rows surface cleanly). Added 4 new fields: `source` (text, default 'website'), `lastContactedAt` (date), `handledAt` (date), `assignedTo` (relationship → users). **Neon DDL required** (per recurring `feedback_push_true_drift.md` lesson — push:true silently skips ALTER TYPE ADD VALUE for select-field options): operator must run on prod after deploy: `ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'follow_up'; ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_won'; ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'closed_lost'; ALTER TYPE enum_customer_inquiries_status ADD VALUE IF NOT EXISTS 'spam';`. **Defensive surface**: `applyLeadStatus` catches the "invalid input value for enum" error and returns a clear Telegram-friendly message with the exact DDL one-liner so an operator who runs `/contacted` etc. before the DDL gets a useful refusal instead of a silent failure. **New helper** `src/lib/leadDesk.ts` (~330 LOC): `getOpenLeads` (status ∈ {new, contacted, follow_up}, prioritized: new newest-first, then follow_up oldest-contact-first, then contacted oldest-contact-first, capped at 10), `getTodayLeads` (today's snapshot with counts), `getLeadById`, `applyLeadStatus(payload, leadId, action, source)` (single source of truth — idempotent, stamps `lastContactedAt` on contacted/follow_up, stamps `handledAt` on closed_*/spam, clears `handledAt` on closed→open reopen, emits `lead.status_changed` bot-event), formatters and `leadButtonsKeyboard`. **Telegram surface** registered in `SHARED_CMDS`: `/leads` (open list with priority sort + status counts), `/leads today` (snapshot with counts: new/contacted/won/lost/spam), `/lead <id>` (detail card with inline 5-button keyboard), `/contacted <id>`, `/followup <id>`, `/won <id>`, `/lost <id>`, `/spam <id>` (single-item slash actions). All commands use word-boundary matching (`firstWord === '/lead'`) instead of `startsWith` so future `/leadassign` etc. won't false-match. **Inline buttons** (`ldact:<leadId>:<action>` callback) converge on the same `applyLeadStatus` helper as the slash commands — slash and button paths are identical and idempotent. **Audit trail** lives in `bot-events` with `eventType='lead.status_changed'` and lead ID in the payload (no schema change to bot-events; product field stays null since the subject is the lead). **Idempotency**: pressing the same status action twice returns `🟰 zaten <status>` without writing. **HTML safety verified** in formatters (smoke tested with `<script>` injection in name + message). **Storefront capture path unchanged** — existing `/api/inquiries` POST route still creates rows with `status='new'`, source defaults to 'website'. **Out of scope (v1)**: bulk lead actions via D-239 runBatch (per-lead is fast enough for current volume; can layer on later); `/leadsearch` by phone/name (defer until volume warrants); `/leadassign` UI (collection field is there for future use). D-241.

**D-240 Selection-Based Bulk Actions v1 SHIPPED — soak pending** (2026-04-28) — Operator can now tap-select multiple products from `/publishready` and run a single bulk action against the selection without retyping comma lists. Ephemeral selection state lives in a per-(chat,user) in-memory Map (`src/lib/operatorSelection.ts`, ~190 LOC) with a 30-minute TTL — same isolation key shape as the wizard sessions (`${chatId}:${userId}` in groups, `${chatId}` in DMs). Cold-start clears the Map; the operator just re-selects. **UI surface:** publish desk cards now carry a second-row `☑ Seç` button (`selt:<id>` callback). After all cards, `/publishready` sends a footer control message with a 4-row keyboard: `☑ Tümünü Seç`+`🗑 Temizle` / `🚀 Aktif Et (N)`+`🚫 Reddet (N)` / `🔴 Tükendi (N)`+`📦 Stop (N)`+`▶ Devam (N)` / `📋 Seçimi Göster`. Counts in labels are rendered at message-send time; the actual selection size is consulted live when the action runs so a stale label can't cause a wrong target. **New slash commands:** `/selection` (shows current selection list + control keyboard from anywhere), `/clearselection` (drop selection). Both registered in SHARED_CMDS. **New callbacks:** `selt:<id>` (toggle, answers via answerCallbackQuery with new total — no per-card visual update needed), `seladd:pr` (re-fetches publishready and adds all visible IDs, deduping), `selclr`, `selshow`, `selrun:<action>` (executes against current selection). **Execution path:** `selrun:act` → `approveAndActivateProduct` per item; `selrun:rej` → `recordPublishDecision('rejected')`; `selrun:soldout|oneleft|twoleft|stopsale|restartsale` → `applyOperatorAction`. All wrapped in `runBatch` from D-239 — per-item refusals/idempotency/notFound are surfaced via `formatBatchSummary`. After a successful publish action (`act`/`rej`), successfully-actioned items are dropped from the selection so the next bulk press doesn't re-target them; failed/refused items stay so the operator can investigate without re-selecting. **Idempotency preserved end-to-end** — every underlying helper was already idempotent; pressing the same bulk action twice produces `🟰 zaten ...` for items already in target state. Selection isolation verified via smoke test (toggle/addMany/dedup/per-user-isolation/DM-vs-group/clear/format/keyboard shape all pass). **Hard publish rule preserved** — every bulk action is one explicit operator gesture; no auto-publish anywhere; the same readiness gate refuses ineligible items via `evaluatePublishReadiness`. **Out of scope (v1):** /inbox publish bulk-select (text-list surface, no per-item keyboards yet — operator can still use `/find` then `☑ Seç` from the resulting card); persistent selection across cold-starts (in-memory Map is sufficient — operator re-runs `/publishready` if the selection expired); `/restock` bulk via selection (qty disambiguation needs UI — operator uses slash command for restock). D-240.

**D-239 Batch Actions / Bulk Queue Handling v1 SHIPPED — soak pending** (2026-04-28) — Operator commands now accept comma-separated identifiers so bulk queue work doesn't require per-product retyping. New shared layer `src/lib/operatorBatch.ts` (~210 LOC) — `parseBatchIdentifiers` (whitespace-stripping, dedup-preserving, case-insensitive), `isBatch` (>1 distinct ident), `runBatch(payload, command, idents, fn)` generic per-item executor that routes each ident through the existing `resolveProductIdentifier` (D-234) and per-item helper, accumulates `{succeeded, failed, refused, notFound}`, never throws across the batch, catches resolution failures as `notFound` and per-item exceptions as `failed`. `formatBatchSummary` renders Telegram-friendly: header line + per-entry status with badge + tail (capped at 25 lines with overflow hint). **Per-command coverage:** `/approvepublish`, `/rejectpublish`, `/activate` accept `<sn1,sn2,sn3>`; the unified D-234 state-write block (`/soldout`, `/oneleft`, `/twoleft`, `/restock`, `/stopsale`, `/restartsale`) all accept the same comma-separated input. `/find` explicitly refused in batch mode (one full card per item is too chatty; operator pointed at `/sn`). `/restock` batch validates qty before per-item loop. **Convergence on a single helper:** new `approveAndActivateProduct` exported from `src/lib/publishDesk.ts` (~125 LOC; extracted verbatim from the legacy inlined `/activate` block). Single-item `/approvepublish`, batch `/approvepublish`, single-item `/activate`, batch `/activate`, AND the inline button `pdesk_act:<id>` all now route through this one helper. Behaviour identical: refuse-already-active idempotent, emit publish.approved audit-trail event, evaluatePublishReadiness gate (refuse with concrete blockers if !ready), apply update (status=active + workflowStatus=active + publishStatus=published + merchandising dates), emit product.activated. **Idempotency is preserved end-to-end** — every underlying helper (`applyOperatorAction`, `recordPublishDecision`, `approveAndActivateProduct`) was already idempotent; running the same batch twice is safe. Per-product result lines clearly distinguish `✅ aktive edildi` vs `🟰 zaten aktif` vs `⚠️ engellendi: <blockers>` vs `❓ bulunamadı` vs `❌ hata: <message>`. **Out of scope:** parallelism across batch items (sequential per-item to keep failures isolated and per-product audit-event ordering deterministic); cross-channel batch redispatch (`/redispatch` stays single-target — channel + product); auto-retries on per-item failures (operator decides to retry the failed subset). D-239.

**D-238 State Coherence Sweep + Repair SHIPPED — soak pending** (2026-04-28) — Detect, repair, and prevent product state-coherence drift so `/publishready`, `/inbox`, `/find`, `/pipeline` stay truthful. Real production drift confirmed via raw-SQL scan: 1 product `workflow=active+status=draft` (SN0032 — exactly the case observed in the D-237 screenshot), 3 products `status=active+publishStatus=not_requested` (SN0013, SN0002, SN0033 — older activations). **Detection**: extended `detectStateIncoherence` in `publishReadiness.ts` with two new rules — Rule 8 (`workflowStatus='active' AND status!='active'`, severity error) and Rule 9 (`status='active' AND publishStatus IN ('not_requested','pending')`, severity warning). **Repair**: new `src/lib/stateCoherence.ts` (~250 LOC) with `normalizeProductState(payload, productId, {dryRun})` that derives correct values from ground truth (status, contentStatus, auditStatus, stockState, confirmationStatus, visualStatus) and rewrites only fields that disagree. Rules: workflowStatus derived from full pipeline progression with soldout/active taking precedence over earlier stages; publishStatus='published' only when status='active' (does NOT downgrade existing 'published' on rollback to preserve audit trail); sellable=true when status='active' AND stockState!='sold_out', false when soldout. Idempotent (running twice is a no-op the second time). Skips archived products. `scanCoherenceDrift` provides the catalog-wide read-only drift overview. **Prevention**: patched `applyOperatorAction` in `operatorActions.ts` so soldout/oneleft/twoleft/restartsale/restock now align `workflow.workflowStatus` alongside `status`. Soldout sets workflowStatus='soldout'; restartsale/oneleft/twoleft/restock revert workflowStatus from 'soldout' back to 'active' on the way out. Closes the most likely future drift source — the action helpers were the ones leaving workflowStatus stale on status flips. **Surface**: new `/repair` slash command with three modes — `/repair` (help), `/repair scan` (whole-catalog drift list), `/repair <sn-or-id>` (single-product preview, dry-run by default), `/repair <sn-or-id> confirm` (apply). Audit-trail event `state.repaired` emitted on every applied repair. Verified against current Neon: simulating the rules against the 4 drifted products produces exactly the expected patches (3 products get `workflowStatus → active` + `publishStatus → published`; SN0032 gets `workflowStatus active → publish_ready`). **Out of scope:** auto-running normalize on every mutation (kept as explicit operator-callable to avoid masking new bugs); historical drift cleanup beyond /repair (operator runs scan + per-product repair); no PI/wizard/image-pipeline mutation. D-238.

**D-237 Publish Desk / Approval Gate v1 SHIPPED — soak pending** (2026-04-28) — Operator can now approve, reject, and activate publish-ready products from Telegram without an admin visit. New helper `src/lib/publishDesk.ts` (~250 LOC) owns the queue + decision recording. Hard publish rule preserved: every operation is an explicit operator gesture (slash command or inline button); no auto-publish anywhere. Surface: `/publishready [today]` lists ready items (uses existing `evaluatePublishReadiness` — must pass all 6 dimensions; rejected-in-last-30-days items filtered out via `bot_events`); each item rendered as its own card with `🚀 Aktif Et / 🚫 Reddet / 🔍 Bul` inline buttons; `/approvepublish <sn-or-id>` emits a `publish.approved` audit-trail bot-event AND runs the full activation path (calls evaluatePublishReadiness, refuses with concrete blockers if not 6/6, otherwise flips status=active + publishStatus=published, sets merchandising.publishedAt + newUntil, emits product.activated, lets afterChange hook trigger channel dispatch); `/rejectpublish <sn-or-id>` emits `publish.rejected` only — NO state mutation, product stays in publish_ready limbo, surfaced as filtered out of /publishready for 30 days. **Approve = Activate semantically** (no separate persisted "approved-but-not-activated" state was ever in the schema; persisted decisions live in bot-events as the single source of truth, mirroring how stockState is derived from stock events). Existing `/activate <id>` patched to accept SN-or-ID via the shared `resolveProductIdentifier` (D-234 pattern); guards unchanged (refuses already-active, refuses if readiness != 6/6). Inline button callbacks: `pdesk_act:<id>` (delegates to activation path; emits both `publish.approved` audit + `product.activated` events) and `pdesk_rej:<id>` (recordPublishDecision rejected). All four publish-desk slash commands registered in SHARED_CMDS; `/activate` stays GEO-owned per D-144 bot-role split. Smoke evidence on current Neon: broad pre-filter caught 8 candidates, of which 6 should pass full readiness (2 with audit=pending fail). **Out of scope:** auto-publish (forbidden by hard rule), per-channel approve gates, scheduled approval, reviewer multi-stage flows. D-237.

**D-236 Operator Inbox / Queue v1 SHIPPED — soak pending** (2026-04-28) — Read-only Telegram surface that surfaces what needs operator attention without an admin visit. New module `src/lib/operatorInbox.ts` (~290 LOC) with six query/format pairs reusing the existing schema fields (`workflow.{visualStatus,confirmationStatus,contentStatus,workflowStatus,auditStatus,stockState}`, `status`, `sourceMeta.shopierSyncStatus`, `bot_events.eventType`). Single `/inbox` command with sub-commands: `/inbox` overview (counts across all buckets), `/inbox pending` (visual-approval needed + wizard incomplete), `/inbox publish` (publish_ready + content-ready-not-active), `/inbox stock` (soldout + low_stock), `/inbox failed` (content_failed + audit_failed/needs_revision + shopier error + last-24h failure events from bot_events), `/inbox today` (created/confirmed/content-ready/activated/soldout today + today's failure event count). Each list capped at 10 items with overflow `+N more` hint. Empty buckets show "yok". Hard read-only — every helper uses `payload.find` only, no mutations. Smoke-tested against current Neon: every bucket returned a truthful count, total of 17 actionable items surfaced for the current product corpus (2 visual-approval, 3 wizard-incomplete, 4 publish-ready, 6 content-ready-not-active, 2 low-stock). Registered in `SHARED_CMDS` so both Uygunops and GeoBot accept it. **Out of scope:** mutations (operator still uses /soldout, /restock, /redispatch, etc. for action), pagination beyond 10 items per bucket, archived-product filters, dolap/threads channels in failed bucket. D-236.

**D-235 Per-Channel Redispatch SHIPPED — soak pending** (2026-04-28) — Operator can now re-fire EXACTLY one channel from Telegram (X / Instagram / Facebook / Shopier) without re-triggering the others. New helper `triggerChannelRedispatch` in `src/lib/operatorActions.ts` calls `dispatchProductToChannels(..., {onlyChannels:[channel]})` directly — bypassing the afterChange hook entirely. **Why bypass:** D-202 wired `sourceMeta.forceRedispatchChannels` into the hook but the field was NEVER persisted as a real PG column on Neon (`information_schema.columns` shows the column does not exist), so the hook's "explicit channels" branch has been silently dead code; the fallback branch ("skip already-dispatched non-shopier channels") is what actually ran and that's why X-only retests on product 294 also re-posted IG+FB. Direct invocation avoids that dead path entirely without needing a schema migration. Per-channel result note merged into `sourceMeta.dispatchNotes` preserving notes for other channels (no audit-trail loss). Shopier path: when `dispatchProductToChannels` returns `eligible+queued-via-jobs-queue` for Shopier, the helper itself enqueues the `shopier-sync` job (mirrors the afterChange hook). Product update uses `context: { isDispatchUpdate: true }` so the hook does NOT fire on the sourceMeta write. Refusal cases handled clearly: product not found, product not active (operator told to /restartsale or activate first), website (no dispatch path — storefront renders live; operator told to use Vercel revalidation if cache invalidation is needed), unknown channel alias. **Surface:** new `/redispatch <channel> <sn-or-id>` slash command (added to SHARED_CMDS), accepts aliases x/twitter, instagram/ig/insta, facebook/fb, shopier/shop. Plus a third row of 4 inline buttons on every operator card — `𝕏 Tekrar` `📸 IG Tekrar` `📘 FB Tekrar` `🛒 Shopier` — backed by new `redis_*` callback prefix. Both surfaces converge on `triggerChannelRedispatch`. `dolap` and `threads` (also `SupportedChannel`s) intentionally NOT exposed; out of v1.5 scope. Single shared source of truth across button + command paths. D-LOCK-2026-04-28 / D-234 / D-LOCK image-pipeline boundaries unaffected — no PI/wizard/image code touched. Single-file additive helper + 3 small route.ts edits. D-235.

**D-234 Operator Pack v1 SHIPPED — soak pending** (2026-04-28) — Telegram is now the daily control surface for stock/state ops. Single shared helper `src/lib/operatorActions.ts` owns identifier resolution (SN-or-ID) + the 6 operator actions; the inline-button callback handler, the `/sn` sub-actions handler, and 7 new slash-command aliases (`/find`, `/soldout`, `/oneleft`, `/twoleft`, `/restock <qty>`, `/stopsale`, `/restartsale`) all delegate to `applyOperatorAction()` so behaviour is identical no matter how the operator triggers it. Three real bugs fixed in the refactor: (1) `sn_1kaldi`/`sn_2kaldi` previously set product-level `stockQuantity` which is silently ignored on variant products (effective stock = variant total) — now refuses with a clear pointer to per-size update. (2) `sn_tukendi` on variant products didn't zero variants → effective stock stayed positive → `reactToStockChange` flipped the state back — now zeros every variant first. (3) `sn_durdur` clobbered `status='draft'` on soldout products, losing soldout state — now sets `sellable=false` only and preserves status. Plus `/stok` and `/pipeline` previously ID-only, now accept SN. Idempotency: every action checks before-state vs. would-be-after; if equal, short-circuits with `idempotent:true` and skips both the update and the bot-event emit. Commit: see git log. **Out of scope:** per-size variant editing from Telegram (still uses admin or `/sn ... stok N`); external publishing still requires explicit human approval. D-234.

**D-233 Background Palette Expansion PROD-VALIDATED** (2026-04-28) — Storefront grid was visibly monotone — every product backdrop in the `#E0DDD8`–`#FFFFFF` band, two products of the same shoe color got byte-identical backgrounds. `getBackgroundForColor` rewritten as a per-family palette (12 families × 5 premium tones) with deterministic per-product variant selection (productId-mod-paletteLength). Cross-slot consistency invariant from v43 preserved: every slot in a single batch still uses the same backdrop; the variant differs only between products. ProductId now threaded through `generateByEditing` / `generateByGeminiPro`. Single-file change in `src/lib/imageProviders.ts` + 1 thread-through in `src/jobs/imageGenTask.ts`. v50 prompt bodies untouched. Commit `bf3968c`. D-233.

**D-232 Image-Gen IdentityLock Enrichment PROD-VALIDATED** (2026-04-28) — After the operator reported AI-generated slots "close to but slightly different" from the source photo, the smallest correct enrichment of the existing pre-generation Gemini vision pass: extended `extractIdentityLock` schema with PI-Bot-style fields — `brandTechnologies[]`, `colorAccents[]`, `constructionNotes`, free-form `visualNotes`. `IdentityLock` interface gained those four optional fields. `extractIdentityLock` `maxOutputTokens` bumped 900 → 2048 (`feedback_gemini_token_budget.md` incident #5; thinking-token overhead consumes the budget before visible output for richer schemas). Each non-empty field renders a "preserve exactly" anchor line in `identityLock.promptBlock`, plus two new conditionally-rendered forbidden-list lines (drop/relocate brand-tech text; move/recolor accents). Diagnostic log line gained populated-counts (`tech=N accents=N build=y/n visual=Nc`). v50 EDITING_SCENES prompt bodies untouched. Single-file change in `src/lib/imageProviders.ts`. Cannot eliminate gpt-image-1's silhouette/proportion drift (model-capability ceiling); narrows describable-feature drift only. Commit `7ecbd9e`. D-232.

**D-231 Commerce Token Bump + GeoBot Parallelization PROD-VALIDATED** (2026-04-28) — Two follow-up fixes after D-229 enrichment exposed a silent commerce-pack failure on product 306. (1) Commerce silent failure: D-229 tightened the PI-enabled commerce prompt rules (≥3 detected attributes per surface, brand-tech mandatory, ≥2 concrete visual details, generic-phrase ban) but `generateCommercePack` still called `callGeminiText(prompt)` with the 4096-token default. With 2.5-flash's thinking-token overhead the JSON ran past the cap → `parseGeminiJson` threw → `generateFullContentPack` catch left `commercePack=undefined` → no `content.commerce_generated` event → commerce columns in DB stayed null. **Fix:** raised commerce `maxOutputTokens` 4096 → 8192. Same class as D-226 vision (1024→6144) and D-229 SEO/GEO (4096→10240). (2) Perceived 30 s step latency: `generateFullContentPack` was running commerce THEN discovery sequentially. Post-D-229 sizes pushed total wall time to ~90–100 s on PI-enabled runs and the operator read this as "stopped working". **Fix:** commerce + discovery now run in parallel via `Promise.allSettled`. Wall time drops to `max(commerce, discovery) ≈ 50–60 s`; one pack failing no longer blocks the other from being persisted. Single-file diff in `src/lib/geobotRuntime.ts`. Commit `832baf3`. D-231.

**D-230 Wizard Vision Autofill PROD-VALIDATED** (2026-04-28) — One Gemini vision call at wizard initialization auto-fills the wizard's category + productType + brand+model+color steps. HIGH confidence (≥70%) fills `collected` directly and skips the prompt. LOW-MED (40–69%) leaves `collected` empty but stashes a suggestion in `session.autofillPreview`; the prompt builders render a `🤖 PI önerisi: <value> (güven %X)` hint inline; `tamam` text shortcut accepts the brand suggestion. Below 40% the prompt appears as before. One "🤖 PI Bot Görsel Tespitleri" summary message is sent at wizard start so the operator can see at a glance what was filled vs suggested. wz_edit (Düzenle button) re-runs the autofill so editing produces the same UX as a fresh start. Defends with multiple follow-up fixes shipped before stabilization: drop `!product.category`/`!product.productType` gating (the wizard's `determineNextStep` always asks for category regardless of product.category, so the autofill must mirror that), surface autofill failures with a diagnostic line so silent failures stop looking like "feature not deployed", relax category mapping with substring/alias matching (vision often returns "Spor Ayakkabı" or "Sneaker" instead of one of the 6 valid labels), and unwrap the Payload `array → { image: <media> }` shape (the strict pickUrl was returning null for every product → `no_image` reason was emitted on production). Feature-flag `WIZARD_BRAND_AUTOFILL=false` opts out without a code rollback. Token budget 3072. Commits `fa3b57d`, `4f1321e`, `58256ea`, `5131417`, `f32018a`. D-230.

**D-229 PI Output Enrichment PROD-VALIDATED** (2026-04-27) — Four compounding richness levers shipped in one batch on top of the D-227-validated pipeline. (1) Wider vision evidence — expanded Gemini vision JSON schema with `soleType`, `closureType`, `brandTechnologies[]`, `distinctiveFeatures[]`, `colorAccents[]`, `constructionNotes` alongside the existing 9 fields. Vision token budget bumped 4096 → 6144. (2) Deeper SEO/GEO pack — `PiSeoPack` gained `brandTechnologyExplainer`, `careAndMaintenance`, `sizingGuidance`, `styleGuide`, `technicalSpecs[]`. `PiGeoPack` gained `useCaseExplainer`, `alternativeSearchQueries[]`. Prompt imposes mandatory-fill rules (e.g. brandTechnologyExplainer required when brandTechnologies detected). Pack token budget bumped 4096 → 10240. (3) Longer sectioned discovery article — when PI is available, target is now 1200–2000 words with 8 mandatory `##` sections (Giriş, Tasarım ve Görünüm, Marka Teknolojisi ve Konfor, Kullanım Senaryoları, Bakım ve Dayanıklılık, Numara ve Kalıp Notları, Stil Rehberi, Benzer Ürünlerle Farkı). FAQ count 3→5, keywordEntities 10→15. Non-PI path unchanged. (4) External text-search fallback — new `providers/dataForSeoText.ts` runs DataForSEO Google Organic Live SERP when image search returns 0 matches AND vision has a strong signal. Feature-flagged via `PI_TEXT_SEARCH_FALLBACK` (default on). Reuses existing `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD`. Validated on product 305 "Adidas Spezial": vision returned `distinctiveFeatures=["Üç şeritli tasarım","yan kısımda 'SPEZIAL' yazısı","dokulu kauçuk taban"]`, `colorAccents=["beyaz bağcıklar","beyaz yan şeritler","beyaz topuk detayı","bej iç astar","kahverengi kauçuk taban"]`, and the final article body cited every detected signal. Commit `89acf4f`. D-229.

**D-228 Idempotent applyConfirmation PROD-VALIDATED** (2026-04-25) — Two screenshots (products 304, 305) showed every wizard run producing two `product.confirmed` events, two `triggerContentGeneration` calls, two parallel GeoBot Gemini runs, and on 304 the second run nulled the first run's commerce pack via a stale `product.content` snapshot read. Root cause: the `wz_confirm` callback handler didn't debounce. Operator double-tap or Telegram webhook replay or in-flight callback race all produced two parallel `applyConfirmation` invocations. **Fix:** at `applyConfirmation` entry, re-read `product.workflow.confirmationStatus` + `productConfirmedAt` from the DB. If confirmed within the last 5 minutes, short-circuit with `{success: true, variantsCreated: 0}`. The Telegram UI still shows a green check; the duplicate work is skipped. Window is wide enough to catch retries and delayed re-taps but narrow enough that a legitimate re-confirm via wz_edit works naturally. Single-file diff in `src/lib/confirmationWizard.ts`. Validated on product 306 — exactly one `product.confirmed` event fired. Commit `20d399e`. D-228.

**D-227 PI Signal Strengthening + Observability PROD-VALIDATED** (2026-04-24) — Three targeted fixes after a prod observation that final content was still reading generic on real products even when PI ran successfully. (1) Observability — `resolvePiResearch` catch block now emits a `pi.auto_trigger_failed` bot-event with the error payload `{error, failedAt, autoEnabled}`. Silent bridge failures became observable; this caught the D-227-DDL drift incident on product 303 with the exact PG `22P02 invalid input value for enum` message. (2) `detectedVisualNotes` surfaced into the prompt — added to `GeobotPiResearch`, rendered in `buildPiResearchBlock` as "Görsel Detaylar (logo/yazı/taban/kumaş)". The richest vision signal (e.g. on product 301 vision read "Skechers Air-Cooled Memory Foam" off the tongue) was previously dropped at the translation layer in `resolvePiResearch`. Now mapped from `attrs.visualNotes` → `detectedVisualNotes`. (3) Mandatory PI usage in prompts — block header promoted from "TESPİT EDİLEN ÖZELLİKLER" to **"ÜRÜN KİMLİĞİ — ZORUNLU KULLANIM"**. `buildCommercePrompt`: brand/type/color/material/style/visualNotes MUST appear in `websiteDescription`, `instagramCaption`, `shopierCopy`, `facebookCopy` when present; generic phrases ("kaliteli malzeme", "şık tasarımıyla") explicitly banned as a fallback. `buildDiscoveryPrompt`: ÜRÜN KİMLİĞİ must appear in the article intro and at least one section body; metaTitle and articleTitle must combine brand + type + color, not echo the operator title. Validated on product 304 "Skechers SC": vision read "Air-Cooled Memory Foam" off the insole and the Skechers 'S' logo off the side; final article cited every detected signal verbatim ("ikonik Skechers 'S' logosu", "dil kısmında da marka yazısı", "'Air-Cooled Memory Foam' ibaresi", "sentetik deri ve file malzemelerin mükemmel uyumu", "lacivert ve siyah renkli kaba tabanı"). Generic fallback phrasing eliminated. Commit `0fffd38`. **DDL follow-up the same day:** `ALTER TYPE enum_product_intelligence_reports_trigger_source ADD VALUE IF NOT EXISTS 'geo_auto'` applied directly to Neon — Payload `push:true` had silently skipped the PG enum migration shipped in D-226. See `feedback_push_true_drift.md` incident #5. D-227.

**D-225 PI Bot → GeoBot Automatic Bridge PROD-VALIDATED** (2026-04-24) — Product Intelligence Bot is no longer a parallel manual tool. During automatic content generation (`triggerContentGeneration` in `src/lib/contentPack.ts`), GeoBot now calls a new `resolvePiResearch()` helper that (a) looks up the freshest PI report in status ready/approved/sent_to_geo for the product, (b) if none exists, auto-invokes `createProductIntelligenceReport()` — the same pipeline `#geohazirla` uses — emitting a `bot-events` row `eventType=pi.auto_triggered_by_geo`, (c) translates the stored PiReport (detectedAttributes + seoPack + geoPack + top references + matchType/confidence + riskWarnings) into a narrow `GeobotPiResearch` shape, and (d) drops it into the Gemini prompt context via `buildPiResearchBlock()` plus `hasPi`-conditional rule sets added to both `buildCommercePrompt` and `buildDiscoveryPrompt` in `src/lib/geobotRuntime.ts`. On any failure (PI crash, no provider, API/DB error) the helper returns `null` and GeoBot falls back to the legacy product-only prompt — **PI never blocks publishing**. Gated by env flag `PI_AUTO_FOR_GEOBOT` (default ON; set to `false`/`0`/`off` to disable without a code rollback). Manual `#geohazirla`/`#seoara`/`#productintel`/`#urunzeka` paths and the PI operator-approval gate are unchanged. Validated E2E on product #296 via a synthetic `/content 296 retry` to production (`https://uygunayakkabi-store.vercel.app/api/telegram?bot=geo`): full event trail `content.requested → pi.auto_triggered_by_geo (reportId=4) → content.commerce_generated → content.discovery_generated → content.ready`, product ends at `contentStatus=ready`, both packs at 100% confidence, generated copy references `#SporŞıklığı` and "Şehir Hayatının Spor Şıklığı ve Konforu" — both mirror PI's `geoPack.comparisonAngles` and `aiSearchSummary`, confirming PI signal reached the prompt and shaped the output. Two orthogonal PI-pipeline quality issues surfaced (not D-225 regressions, filed as follow-ups): (1) `analyzeProduct.ts` Gemini-vision returned non-JSON so `detected_attributes` fell to `{visualNotes: "Gemini yanıtı JSON formatında değildi."}` — the D-224 parser should be reused here, (2) Google Cloud Vision reverse-search failed with "Unsupported URI protocol specified: /api/media/file/…" — image URL builder is handing a relative path where an absolute URL is required. Neither blocked the bridge; the full SEO/GEO pack was still generated and consumed. Merged to `main` as commit `fbeeab2`. D-225.
**D-224 Gemini JSON Parser Hardening PROD-VALIDATED** (2026-04-24) — Replaced brittle "strip-fences + JSON.parse" logic in `generateCommercePack` and `generateDiscoveryPack` (`src/lib/geobotRuntime.ts`) with a layered `parseGeminiJson<T>(raw, finishReason, label)` that tolerates ```` ```json ``` ```` fences, prose preambles, and partial responses — direct-parse first, balanced-brace extraction fallback, explicit truthful error on failure (never fabricates fields; surfaces `finishReason` + 300-char sample). `callGeminiText()` now returns `{text, finishReason}` so MAX_TOKENS vs STOP is visible to the parser. Discovery-pack `maxOutputTokens` raised 8192 → 16384; Turkish SEO articles were regularly hitting the 8192 ceiling mid-JSON, producing unclosed braces that the old parser reported as silent "content generation failed". Scope is one file; prompt structure, model ID (`gemini-2.5-flash`), and output contract unchanged; successful 8192-token runs still succeed identically. Validated by the same D-225 E2E run: product #296 (which had been stuck on `contentStatus=failed` since D-218 flagged it) regenerated cleanly, commerce + discovery confidence both 100%, `contentStatus=ready`, `workflowStatus=content_ready`. Merged to `main` as commit `fbeeab2`. D-224.
**D-220 Product Intelligence Bot + GeoBot Handoff MVP IMPLEMENTED — LOCAL** (2026-04-21) — New photo-first content workflow triggered by Turkish hashtags `#geohazirla`, `#seoara`, `#productintel`, `#urunzeka`. Pipeline: collect originals-first images → Gemini 2.5 Flash vision (type/color/material/style/gender/useCases/visibleBrand) → optional reverse image search (SerpAPI Google Lens; returns `visual_only_no_external_search` if `SERPAPI_API_KEY` missing — not a blocker) → classify match (`exact_match` requires both provider classification AND vision-detected visibleBrand, never ordering-alone) → generate original Turkish SEO + GEO pack (strict "do not copy references" rule) → Telegram summary with 2×2 inline keyboard (`pi:approve`/`pi:sendgeo`/`pi:regen`/`pi:reject`). On operator approval, pack is merged into existing `product.content.{commercePack, discoveryPack}` — no new publishing path, GeoBot/channelDispatch consume as today. Preserve-existing merge: curated operator content never blind-overwritten. Every attempt persists to new `product-intelligence-reports` collection (JSON-heavy schema to sidestep Neon `push:true` drift). Handoff emits `bot-events` row `eventType='pi.sent_to_geo'`. New files under `src/lib/productIntelligence/` (8 files) + one collection + 4 surgical splices in `route.ts` + one import in `payload.config.ts`. `tsc --noEmit` clean (zero new errors; 4 baseline errors unchanged). Requires `GEMINI_API_KEY` (already configured), `SERPAPI_API_KEY` optional. Fully additive — existing flows untouched. D-220.
**D-218 Product-Diagnostic Endpoint DEPLOYED** (2026-04-21) — Operator reported product #296 blocker: `/publish 296` audit returned `PARTIALLY READY (5/6)` with `❌ content: Content generation failed` as sole unmet gate. Prior Geo events (per operator screenshot): `content.commerce_generated` at 08:57 → audit at 09:15 flagged content failure. Implication: commerce pack is present; discovery pack (or a revalidation step) failed between commerce success and audit. Diagnosis path initially blocked because admin session cookie had expired; built transient endpoint `GET /api/admin/product-diagnostic?productId=<id>` accepting EITHER `x-admin-secret: $GENERATE_API_KEY_SECRET` header OR a valid Payload admin session cookie. Returns workflow statuses + commercePack/discoveryPack presence summary + last 25 `bot-events` for the product (including `payload.error` from `content.failed` entries). Commits `ae7765b` (initial) + `9925d23` (added session alt-auth). Endpoint confirmed live (HTTP 401 without auth = routing correct). **Smallest correct next step for product 296:** send `/content 296 retry` in GeoBot Telegram — `canRetriggerContent()` in `src/lib/contentPack.ts:282` permits failed→retry. Transient tool, safe to remove after content/audit failure patterns stabilize. D-218.
**D-217 Shopier Wizard Categories Seeded + Admin-Auth Endpoint DEPLOYED** (2026-04-21) — Added new admin route `GET/POST /api/admin/shopier-categories` that lists and ensures Shopier categories. Uses Payload session auth (`payload.auth({ headers })`), not the D-214 secret-header pattern — callable directly from the authenticated admin tab with `credentials: 'include'`. Seeded 5 missing operator-wizard categories into Shopier: **Spor** (`dd158ac4ccd8d5ec`), **Klasik** (`fc356eea18a4aa98`), **Bot** (`7cd3c86a052248e8`), **Terlik** (`39231418b67404e0`), **Cüzdan** (`a707d600ac9ca58d`). **Günlük** (`6b59e27730d800f7`) already existed. Pre-existing `ayakkab` row (operator typo) left alone. Closes the silent "fall back to first available" warning in `resolveShopierCategories()` when Payload product category is Spor/Klasik/Bot/Terlik/Cüzdan. Gotcha: Shopier `/categories` has the same 50-cap as `/selections` (D-213 lesson re-learned on first deploy). Commits `1ed5a97`, `3f3e165`, `064204d`. Endpoint is transient, safe to remove after seed stabilizes. D-217.
**D-216 Shopier Bulk Backfill Findings INVESTIGATION-CLOSED** (2026-04-21) — After D-215 deploy, re-dispatched 7 previously-synced Shopier-linked products (285, 286, 288, 289, 290, 293, 295) via admin REST PATCH. Cron ticks 05:30 and 05:40 UTC processed the queued jobs. Observed: (a) **Only product 294 has variants in Payload** (sizes 43/44/45) — the other 7 products have `variants: []`, so their Shopier storefronts correctly show no size selector (not a sync bug, reflects Payload reality). (b) **D-208b fallback churn:** Re-syncing variant-less products consistently triggers the D-208b CREATE fallback (Shopier UPDATE returns 403/404) — 6 products ended up with brand-new Shopier IDs (old IDs orphaned, e.g. 285: 46148178 → 46376224; 293 churned twice because a duplicate PATCH fired twice: 46373596 → 46376215 → 46376286). Only product 294 (with variants) preserved its Shopier ID 46375838 across UPDATE. (c) **Hook stuck on product 288:** `forceRedispatch: true → true` is a no-op change, so the afterChange hook's change-detection skipped re-firing for 288; it remains on stale Shopier ID 46176930 (redirects to seller root = orphaned). Non-blocking; low-impact. No code change applied — documented as D-216 investigation note. Follow-up items: investigate root cause of UPDATE failure for variant-less products (Vercel log capture), add variant-count guard to `publishProductToShopier()` to avoid churn, manually unstick 288. D-216.
**D-215 Shopier Variant Payload Fix PROD-VALIDATED** (2026-04-21) — After D-213 unblocked the selections Map, the first re-dispatch of product 294 failed with `HTTP 400 — variants[0].selectionId must be an array`. Shopier's REST API is asymmetric: `POST`/`PUT /products` bodies require `variants[].selectionId` as `string[]`, while `GET` responses return it as a single `string`. `ShopierVariantInput` had been typed off the response shape. Fix: `selectionId: string → string[]` in `src/lib/shopierApi.ts`, and `selectionId: [selectionId]` in `src/lib/shopierSync.ts::buildShopierVariants()`. Response type untouched. After D-215 deploy (`E7NE2aJZw`) + re-dispatch via admin REST PATCH (`sourceMeta.forceRedispatch: true`, `forceRedispatchChannels: ['shopier']`), cron tick 04:30:28 UTC marked product 294 `shopierSyncStatus: synced`. Public page https://www.shopier.com/46374845 now renders `<select name="size">` with options `43, 44, 45` matching Payload variants 86/87/88. End-to-end Shopier size selector flow validated on product 294. D-215.
**D-214 Admin-Triggered Shopier Re-Sync Endpoint DEPLOYED** (2026-04-21) — Secret-guarded `GET /api/admin/shopier-resync?productId=<id>` and `?all=true` paths, using the same `GENERATE_API_KEY_SECRET` guard as `/api/generate-api-key`. Calls `syncProductToShopier()` directly and returns per-product result JSON. Not strictly required for the product 294 fix (the admin REST PATCH + cron path worked) but kept as a transient operator tool for bulk backfill or disaster-recovery scenarios. Deploy `3WoeLYjZY` Ready. Safe to remove after bulk backfill completes. D-214.
**D-213 Shopier `listSelections` Limit Cap DEPLOYED** (2026-04-21) — Root cause of the missing size selector on Shopier product pages for recently-synced items (e.g. product 294 → Shopier 46374845): `src/lib/shopierSync.ts:67` passed `limit=100` to `GET /selections`, which Shopier rejects with HTTP 400 `"Input should be less than or equal to 50"`. Because `getShopierMappings()` wraps all three mapping fetches in `Promise.all` and treats any failure as "mappings unavailable", the selections Map was silently empty on every cron tick; `buildShopierVariants()` resolved `variationId` (Numara) but returned `selectionId=null` for every size, so Shopier products were created without variants. Fix: single-line diff `listSelections(100) → listSelections(50)` — `50` is already the default in `src/lib/shopierApi.ts::listSelections()`, no other call site was affected. Pushed directly to `main` as commit `f75de51` from a fresh clone (local workspace `/mnt/uygunayakkabi-store` was on `chore/project-memory-cleanup` and diverged). Vercel production deploy `CjiKMqyXZ` = Ready / 28s build. Does NOT retroactively fix products that were synced while selections were empty — those need a `sourceMeta.forceRedispatch` re-dispatch (or a bulk admin-triggered backfill) before their Shopier records pick up the `Numara` variation. D-213.
**Phase 1 One-Product Full Pipeline Validation CLOSED — PROD-VALIDATED** (2026-04-21) — Full Telegram → website/homepage → Instagram carousel → Facebook multi-photo → X-with-image pipeline validated end-to-end on product 294. Final blocker resolved by D-211: X media upload now sends `media_category=tweet_image` in the multipart body (required by X API v2 `/2/media/upload` after the v1.1 sunset on 2025-06-09). Retest on product 294: `x.mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`, image rendered on tweet. Instagram carousel (D-188) and Facebook multi-photo dispatch remained green; no code paths outside `uploadImageToX()` were touched. Known follow-up (not a regression): force-redispatching a single channel via `sourceMeta.forceRedispatch` re-fires every channel that was not yet dispatched, so the X retest also re-posted IG+FB on product 294 — captured as a Phase 2 backlog item (per-channel redispatch selector), not a Phase 1 blocker. Roadmap now advances to **Phase 2 — Telegram SN/operator controls**. D-212.
**D-211 X Media Upload Fix DEPLOYED + PROD-VALIDATED** (2026-04-21) — Root cause of the text-only tweet on product 294: X API v2 `/2/media/upload` rejects multipart uploads without `media_category`. Vercel production logs showed 400 `{"media_category":["Attribute not allowed."]}` on the old path, then 201 + `media_key` after the patch. Fix: added a `media_category=tweet_image` form-data part to `uploadImageToX()` in `src/lib/channelDispatch.ts` (+9 lines, single function, single file). OAuth 1.0a signature unaffected (RFC 5849 §3.4.1.3.1: multipart body parameters are excluded from the signature base string). Merged to main as commit `fc0b3ed` via PR #3. Instagram and Facebook dispatch paths untouched. D-211.
**Phase Z — Golden-Path Pre-Run Diagnostic PARTIAL** (2026-04-10) — Before a full 14-stage real-product run, inspected DB state of all recent test products. Only 3 products have EVER reached past stage 5 in the database (180, 125, 123 — all from 2026-04-05). Since then, no fresh end-to-end validation. Root cause of stuck state: `updateProductVisualStatus()` supports the state machine `pending | generating | preview | approved | rejected` but was never called with `'preview'` — the job-level transition to `preview` happens correctly but product-level mirror stays at `'generating'` forever. Fixed via additive afterChange hook on `image-generation-jobs` collection (D-154) that flips `workflow.visualStatus → preview` when the job enters preview state. Non-blocking hook, only advances from `generating`/`pending` so it cannot clobber `approved`/`rejected`. Zero touch to v50-locked files. Backfilled products 234-238 directly in DB. Code-level scan of stages 6-14 confirmed all handlers wired (wz_start, wz_confirm, applyConfirmation, GeoBot handoff via sendTelegramMessageAs, triggerContentGeneration auto-fire, geo_content/geo_auditrun/geo_activate). Full stage 1→14 real-photo validation pending operator execution. D-154.
**D-153 Runtime v50 Lock-Rules Reminder DEPLOYED** (2026-04-10) — Per operator request after D-152 restoration: every image generation prompt now has `LOCK_REMINDER_BLOCK` prepended at the top, reinforcing 5 hard rules (no frames, background match across slots, identity lock, follow slot prompt exactly, full-bleed output). New file `src/lib/imageLockReminder.ts`. Wired into both `generateByEditing` and `generateByGeminiPro` via a single import + two concat lines. Each generation logs `[lock-reminder D-153] v50 LOCKED rules prepended to every slot prompt — XXXXb reminder block active` in Vercel runtime logs. Purely additive, no existing locked logic modified. Rebaselined sealed lock commit to include this additive integration. D-153.
**D-152 v50 Image Pipeline Lock RESTORED** (2026-04-10) — Incident: commit `773c03b` on 2026-04-08 (disguised as "storefront redesign — light beige theme") silently rewrote 3413 lines of `imageProviders.ts` and 2354 lines of `imageGenTask.ts` one day after the v50 lock was established (D-129, 2026-04-07). Caused operator-visible regressions: visible frames on all slots, missing PIXEL_FONT stock number overlay, wrong background on slot 3 (close-up). Root cause: the violating commit DELETED `ANTI_FRAME_FINAL_BLOCK`, reverted input padding from `bgRGB` (v49 ROOT CAUSE FIX) back to hardcoded white, weakened anti-frame language, removed `ANTI_FRAME_FINAL_BLOCK` from prompt assembly. Restored via `git show e99e9cb:<file> > <file>` (bit-exact match verified by empty diff). Non-image changes from `773c03b` (storefront UI, routing, docs) preserved. Guardrails proposed but not yet implemented: CI check, CODEOWNERS, daily drift-check. D-152.
**Phase 1 COMPLETE** (2026-03-13) — Storefront, admin panel, and core integrations live.
**Phase 2 Steps 1–19 COMPLETE** (2026-03-22) — Instagram and Facebook direct publishing via Graph API fully operational. Mentix intelligence layer deployed with 13 skills on VPS.
**Step 20 COMPLETE** (2026-03-23) — Shopier marketplace integration fully live. Non-blocking jobs queue pipeline, GitHub Actions 5-min cron, 4 registered webhooks with HMAC verification.
**Step 21 COMPLETE** (2026-03-23) — Shopier order fulfillment flow live. Incoming orders create Payload CMS Order documents. Status updates on fulfilled/refund events. End-to-end verified.
**Steps 22–24 COMPLETE** (2026-03-28) — Full Telegram bot product intake (direct webhook, no OpenClaw/n8n), AI image generation pipeline with Gemini Vision + Gemini Flash image generation. All bugs resolved and verified deployed.
**Step 25 DEPLOYED — NOT YET PROVEN** (2026-04-01) — v18 Gemini-only debug mode active. `#gorsel` → Gemini Pro (model: `gemini-2.0-flash-preview-image-generation`). OpenAI and Luma disabled at route level. NO successful end-to-end image gen job confirmed in production.
**Step 26 DEPLOYED — DISABLED** (2026-04-01) — Luma AI integration code complete (`lumaGenTask`, `lumaApi`, `lumaPrompts`). Route handler for `#luma` deactivated in v18. Can restore from commit `a27b78a`.
**Step 27 DEPLOYED — NOT YET TESTED** (2026-04-01) — Claid.ai product photo enhancement integrated. `#claid {productId}` → 3-mode keyboard → `claid-enhance` job. `CLAID_API_KEY` set in Vercel. No live test performed yet.
**Phase 1 Schema Foundation DEPLOYED** (2026-04-03) — Workflow state fields (10 fields in `workflow` group), merchandising fields (12 fields in `merchandising` group) added to Products. New `HomepageMerchandisingSettings` global and `BotEvents` collection created. Schema-only — no query engine or automation logic yet. D-102.
**Phase 2 Merchandising Logic DEPLOYED** (2026-04-04) — `src/lib/merchandising.ts` created with pure helper functions for all 5 homepage sections (Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli). Includes bestseller scoring, new-window calculation, soldout exclusion, and membership resolution with section toggles + limits. Legacy-safe with null fallbacks. D-103.
**Phase 3 Story Pipeline Foundation DEPLOYED** (2026-04-04) — Non-blocking Telegram Story pipeline foundation. Products.storySettings (6 fields), Products.sourceMeta story tracking (8 fields), StoryJobs collection, AutomationSettings.storyTargets array, `src/lib/storyTargets.ts`, `src/lib/storyDispatch.ts`. WhatsApp marked blocked_officially. D-104.
**Phase 4 Story Pipeline Wiring DEPLOYED** (2026-04-04) — Story dispatch wired into Products afterChange hook (non-blocking, after channel dispatch). Telegram operator commands: `/story`, `/restory`, `/targets`, `/approve_story`, `/reject_story`. Inline keyboard callbacks for story approval/reject/retry. CRITICAL: No fake Telegram story publishing — Bot API does not support stories. All statuses truthful (queued, approved, awaiting_approval — never falsely "published"). D-105.
**Phase 5 Product Confirmation Wizard DEPLOYED** (2026-04-04) — Telegram-based product confirmation flow. `/confirm {id}` starts wizard that guides operator through missing fields (category, price, sizes, stock, publish targets). Inline keyboards for category/targets, text input for price/sizes/stock. Structured summary before final confirmation. Sets confirmationStatus=confirmed, productConfirmedAt, lastHandledByBot=uygunops. Emits BotEvent(product.confirmed). D-106.
**Phase 7 Geobot AI Runtime Wiring DEPLOYED** (2026-04-04) — Real AI content generation via Gemini 2.5 Flash. `src/lib/geobotRuntime.ts` generates commerce pack (5 channel-specific copies + highlights) and discovery pack (SEO article, meta, FAQ, keywords, internal links). `triggerContentGeneration()` now calls real AI, writes results to product fields, emits truthful BotEvents (content.commerce_generated, content.discovery_generated, content.ready/failed). Auto-creates draft BlogPost from discovery pack (linked via content.linkedBlogPost). Partial success supported — if one pack fails, the other is preserved. D-108.
**Phase 6 Geobot Content Pack Foundation DEPLOYED** (2026-04-04) — Content schema added to Products: `content.commercePack` (9 fields: websiteDescription, instagramCaption, xPost, facebookCopy, shopierCopy, highlights, confidence, warnings, generatedAt) and `content.discoveryPack` (10 fields: articleTitle, articleBody, metaTitle, metaDescription, faq, keywordEntities, internalLinkTargets, confidence, warnings, generatedAt). Blog linkage via `content.linkedBlogPost`. `src/lib/contentPack.ts` helper library with readiness checks, state transition helpers, BotEvent emission. Auto-trigger after confirmation (non-blocking). `/content {id}` Telegram command. Geobot runtime NOT yet wired — statuses truthful (pending, not fake-generated). D-107.
**Phase 8 Mentix Audit + Content Review DEPLOYED** (2026-04-04) — 4-dimension audit layer for product quality review. `auditResult` group added to Products (9 fields: visualAudit, commerceAudit, discoveryAudit, overallResult, approvedForPublish, warnings, revisionNotes, auditedAt, auditedByBot). `src/lib/mentixAudit.ts` audit runtime with dimension checks (visual, commerce, discovery, overall). Auto-triggered non-blocking after content.ready in contentPack.ts. `/audit {id}` and `/audit {id} run` Telegram commands. BotEvents: audit.requested, audit.started, audit.approved/approved_with_warning/needs_revision/failed. approvedForPublish=true only on approved/approved_with_warning. D-109.
**Phase 10 Homepage + Order + Stock Recovery DEPLOYED** (2026-04-04) — Homepage now uses merchandising engine server-side: `isHomepageEligible()` filters soldout/non-sellable products before reaching client. `resolveHomepageSections()` called for section computation. Variants.ts afterChange hook triggers `reactToStockChange()` on admin stock edits. Orders.ts afterChange hook auto-decrements stock on non-Shopier order creation (website, phone, manual). Shopier refund handler now restores stock on order cancellation (product + variant level). Low-stock/soldout/restock Telegram alerts sent automatically via `sendStockAlertToTelegram()`. D-111.
**Phase 13 Prep — Production Hardening Execution** (2026-04-04) — Hardcoded secret cleanup: `generate-api-key/route.ts` migrated from hardcoded `'uygun-setup-2026-mentix'` to `GENERATE_API_KEY_SECRET` env var with guard. `.env.example` rewritten: 7 missing vars added, 3 stale vars removed, classified sections. MIGRATION_NOTES.md improved with exact DDL capture procedure (5-step). DEPLOY_CHECKLIST.md and PRODUCTION_TRUTH_MATRIX.md updated with D-115 status. No production mutations — prep only. D-115.
**Phase 13 Production Hardening + Migration Pack DEPLOYED** (2026-04-04) — Production readiness documentation layer. MIGRATION_NOTES.md: complete schema inventory (14 collections, 3 globals, 80+ Products columns) with SQL DDL and migration order. DEPLOY_CHECKLIST.md: 43+ env vars classified, deploy sequence, security checklist. SMOKE_TESTS.md: 15 test scenarios + full e2e 12-step plan. PRODUCTION_TRUTH_MATRIX.md: honest status of every subsystem (22 prod-validated, 28 implemented not validated, 2 blocked, 4 scaffolded). `/diagnostics` Telegram command: DB connectivity, env check, event/order/product counts, runtime info. D-114.
**Phase 18 Post-Publish Stock Lifecycle Validation PROD-VALIDATED** (2026-04-05) — Full stock lifecycle validated on product 125: in_stock → low_stock (threshold ≤3) → sold_out → restocked → in_stock. Soldout transition sets status=soldout, sellable=false, workflowStatus=soldout, emits product.soldout BotEvent. Homepage correctly excludes soldout products. Product page stays live with "Tükendi" badge. Restock recovery bugfix: stockReaction.ts workflow spread (`...product.workflow`) included Payload internal fields causing silent update failure — fixed with explicit field enumeration. After fix: restock correctly sets status=active, sellable=true, stockState=in_stock (settled from restocked), emits product.restocked. Homepage re-includes product. Full BotEvent trail: stock.changed (18), product.soldout (1), product.restocked (1). D-116.
**Phase 19 External Channel Dispatch Validation COMPLETED** (2026-04-05) — Full audit of all 7 external channels + website. Website: PROD-VALIDATED (implicit via status=active, homepage visibility confirmed Phase 17-18). Instagram: DEPLOYED NOT VALIDATED — direct Graph API path ready (accessToken valid until 2026-05-21, userId present, N8N webhook also set), but product 125 has channels_publish_instagram=false so never dispatched. Facebook: DEPLOYED NOT VALIDATED — same Meta token, facebookPageId injected from INSTAGRAM_PAGE_ID env var (1040379692491003), but product 125 has channels_publish_facebook=false. Shopier: BLOCKED — global flag disabled + SHOPIER_PAT status unknown. Dolap/X/Threads: BLOCKED — global flags disabled, no N8N webhooks configured, n8n-only dispatch path. Global AutomationSettings: only website/instagram/facebook enabled. Instagram tokens connected 2026-03-22, expire 2026-05-21. No automated token refresh mechanism. Historical note: Instagram and Facebook were verified working on 2026-03-22 with live posts, but no dispatch has occurred through the current Phase 1-19 pipeline flow. To validate: add instagram/facebook to a product's channelTargets and trigger dispatch. D-116.
**Phase 16 Telegram Bot End-to-End Validation PROD-VALIDATED** (2026-04-05) — Full end-to-end Telegram bot validation. Webhook secret token fixed (missing from registration). 8 missing DB columns added (push:true silent failure on sourceMeta story fields). Telegram 4096 char limit handled with message truncation. Size selector UX: inline keyboard multi-select with 39-45 range, toggle/all/clear/done. /confirm wizard fully validated on products 123, 124, 125. Bugs fixed: (1) sellable=false after confirmation — Variants afterChange hook only fires on update, not create; added explicit reactToStockChange() call in applyConfirmation(). (2) Discovery pack NULL — maxOutputTokens 4096 too low for Turkish SEO article; raised to 8192; added canRetriggerContent() + /content retry command; contentStatus determination now accounts for existing packs on retry. Product 125 fully pipeline-complete: confirmed, content ready (100% confidence both packs), audit approved_with_warning, sellable=true, 6/6 readiness. D-116.
**Phase 17 Product Activation Validation PROD-VALIDATED** (2026-04-05) — Safe product activation via Telegram. /activate command added: validates all 6 publish readiness dimensions, sets status=active, merchandising.publishedAt/newUntil (7-day Yeni window), workflow.workflowStatus=active, publishStatus=published. Triggers afterChange hook for channel dispatch. Product 125 activated: status=active, visible on homepage in Yeni section, product page accessible, all pipeline stages green. First full end-to-end product lifecycle completed: Telegram intake → confirmation → content generation → audit → activation → homepage visibility. D-116.
**VF-7 Legacy Backlog Normalization COMPLETED** (2026-04-05) — Normalized 61 pre-VF-2 products whose visualStatus was inconsistent with their actual image-gen evidence. Three rules applied: (1) 5 products with approved jobs + gallery → vis=approved, wf=visual_ready. (2) 54 products with preview jobs → vis=preview, wf=visual_pending. (3) 2 products (#123, #125) already confirmed pre-VF-2 with original images → retroactive vis=approved. Post-normalization: 0 remaining inconsistencies. Distribution: 8 approved (5 ready for /confirm), 53 preview (need operator visual approval), 34 pending (no image gen yet). D-117b.
**Image Pipeline v34 — Background Lock + Slot Reorder DEPLOYED** (2026-04-07) — Product-level background lock and image standardization. (1) EDITING_SCENES reordered: side_angle now index 0 (primary hero), commerce_front index 1. Standard generation produces: side_angle→commerce_front→detail_closeup. (2) Website + homepage now show generativeGallery images before product.images — AI side-angle becomes hero everywhere. (3) Channel dispatch (Instagram/Facebook/Shopier) prefers generativeGallery[0] as cover. (4) enforceSlotBackground v34: dual-mode detection — corner-only sampling for macro/closeup (fixes edge contamination), edge strips for full-shoe. Contamination guard: if detected bg >120 distance from target, uses direct target-based correction. (5) Batch background consistency check: after all slots generated, measures each buffer's corners vs target and re-enforces if drift >30. (6) Strengthened prompts: "same studio backdrop, camera just moved" framing, explicit common-mistakes list for slot 3. (7) DB hotfix: 3 missing PostgreSQL enum types created for hasMany select join tables (products_story_settings_story_targets, products_channel_targets, story_jobs_targets) — push:true drift incident #4. Commits: f28da2a (slot reorder + generativeGallery on website), 85012a5 (v34 bg lock).
**Phase L — Mention Normalization for Group Command Routing DEPLOYED** (2026-04-08) — Strip bot mentions from group text after gates pass, before command routing. `@Uygunops_bot /preview 180` and `/preview@Uygunops_bot 180` now route correctly. DM text unchanged. D-138.
**Multi-Bot Support — Geo_bot (@Geeeeobot) DEPLOYED + LIVE** (2026-04-08) — Separate Geo_bot shares same webhook handler via `?bot=geo` URL parameter. Per-request token resolution (`getBotToken()` pattern), dynamic BOT_ID/BOT_USERNAME_LC, all 5 helpers updated. Webhook set with secret_token. Geo_bot added to Mentix group. 7 live tests passed: DM commands, group slash/mention/reply activation, plain text silence, cross-bot isolation. D-139.
**Phase R — Command Ownership Split DEPLOYED** (2026-04-09) — Ops Bot and GeoBot now have distinct command surfaces. Ops owns intake/images/confirm/stock, GeoBot owns content/audit/preview/activate/publish/story. Wrong-bot commands get a clear Turkish redirect message. `/pipeline` shared on both. 18 webhook tests passed. D-144.
**Phase X — Telegram Content Preview + Wrong-Bot Redirect DEPLOYED** (2026-04-09) — Part A: GeoBot now shows actual generated channel copy (Instagram, Facebook, website, Shopier, X, SEO) in Telegram before publish via `formatContentPreviewMessage()`. Content-ready notification includes Instagram caption snippet. `geo_content` callback and `/content` command send preview with action buttons. Part B: Photos sent to GeoBot (DM or group) get explicit redirect to Ops Bot with role explanation instead of generic error. 4 webhook tests passed. D-151.
**Phase P — Group Wizard Session Isolation VERIFIED** (2026-04-09) — Refactored wizard session keying from `chatId`-only to `chatId:userId` for per-operator isolation in group context. `sessionKey()` helper in confirmationWizard.ts, 36 call sites updated in route.ts. In group: each operator gets own wizard (`-5197796539:111` vs `-5197796539:222`). In DM: userId still passed, backward compatible. Phase Q validation: 28/28 unit tests passed + 12 production webhook simulations all 200 OK. D-143.
**Phase O — Group Workflow Parity DEPLOYED** (2026-04-09) — Fixed 3 group activation gate gaps: (1) caption_entities now checked for @mentions in photo captions, (2) #gorsel/#geminipro hashtag triggers pass gate without needing @mention, (3) STOCK SKU: batch commands pass gate. onayla/reddet correctly require reply-to-bot in group. 12 tests passed. D-142.
**Vercel Build Optimization DEPLOYED** (2026-04-09) — `ignoreCommand` in vercel.json skips builds when only non-runtime files changed (project-control, ai-knowledge, docs, mentix-*, n8n-workflows, scripts, media, root .md/.html/.docx). Saves ~40% of wasted builds. Safety: always builds on first deploy, empty diff, or mixed commits. D-141.
**Phase N — Bot Role Separation DEPLOYED** (2026-04-08) — Clean context separation enforced. Geo_bot (@Geeeeobot) = group-only operator bot (DMs redirect to @Uygunops_bot). Uygunops (@Uygunops_bot) = DM-only operator bot (group messages silently ignored). Both bots share full command surface but each only operates in its designated context. 8 webhook tests passed. D-140.
**Phase K — @Mention + Reply-to-Bot Group Activation DEPLOYED** (2026-04-08) — Extended group activation filter to allow @Uygunops_bot mentions and reply-to-bot messages in addition to slash commands. All three triggers require allowlisting. Plain text, photos, and unauthorized users still silently ignored. Live-validated with 7 webhook scenarios. D-137.
**Phase I — Mentix Group Onboarding DEPLOYED** (2026-04-08) — Added two safety gates for Telegram group/supergroup chats: (1) command-only filter — only `/commands` processed, photos/text/wizard input silently ignored; (2) group allowlisting — checks `telegram.groupEnabled` and `telegram.allowedUserIds` from AutomationSettings, fail-closed. Private DM behavior unchanged. Neon DB updated: group mode enabled, Furkan (5450039553) in allowlist. D-136.
**Phase G — Dry-Run Preview Mode DEPLOYED** (2026-04-08) — Safe preview/dry-run mode for direct-publish channels. `previewDispatch` checkbox in sourceMeta, used alongside `forceRedispatch`. Runs full dispatch pipeline including Geobot caption selection but skips all external APIs. Results in `dispatchNotes` with `mode: "preview"`, caption text, source attribution (geobot vs fallback). Telegram operator notification with formatted preview. D-135.
**Phase D — Channel Dispatch Geobot Wiring DEPLOYED** (2026-04-08) — Wired Geobot commerce pack content into all channel dispatch paths. `ChannelDispatchPayload` extended with `geobot` field containing 6 commerce pack fields. `buildDispatchPayload()` extracts `product.content.commercePack` into payload. Direct publish paths patched: Instagram prefers `geobot.instagramCaption`, Facebook prefers `geobot.facebookCopy`, Shopier prefers `geobot.shopierCopy`. All n8n webhook payloads now include `geobot` for downstream `xPost`/`facebookCopy` usage. Graceful fallback to existing logic when Geobot content absent. D-134.
**Phase C — Blog Discoverability DEPLOYED + VERIFIED** (2026-04-08) — Blog link added to storefront navigation (desktop + mobile) and footer. Uses `<a href="/blog">` since blog is server-rendered, not part of SPA. Verified live in production. D-133.
**Image Pipeline v38 — Slot 3 Rebuild + Global Background Lock DEPLOYED** (2026-04-07) — Replaced unstable `detail_closeup` macro slot with production-stable `back_hero` (3/4 rear hero: camera 30-45° behind shoe, heel counter dominant, full shoe visible). Removed all macro-specific code paths: corner-only bg sampling, tighter enforcement thresholds, centering skip. New slot 3 gets full post-processing pipeline including centering QC (12% threshold). Formalized global background-lock in TASK_FRAMING_BLOCK: slot 1 is background-family source, slots 2-5 must match exactly. Removed macro/editorial/lifestyle background exceptions. Unified bg enforcement thresholds (90/50 for all slots). No-frame rule verified hardened at prompt + QC + post-processing levels. Zero type errors. D-124.
**Image Pipeline v37 — Centering QC Hard Gate + Sharp Chaining Bugfix DEPLOYED** (2026-04-07) — Fixed critical Sharp library chaining bug where `.extract().extend().resize()` computed resize from post-extract dims instead of post-extend dims, silently undoing v36 centering corrections. Fix: split into two separate Sharp instances. Added `measureCentering()` QC function and centering retry loop (up to 3 cycles) for hero slots (side_angle, commerce_front). Threshold: 12% offset on either axis. V37 verification (Product #194, Job #171): both hero slots pass centering QC on first cycle with 0% offset. No batch BG re-enforcement triggered. Post-download pixel analysis confirmed 0% offset when SKU overlay region excluded. Commit: cd02c19. D-123.
**Image Pipeline v36 — Deterministic Centering + Tighter Brightness DEPLOYED** (2026-04-07) — Added unconditional `centerProduct()` post-processing to correct Gemini's systematic lower-right shoe placement. Detects product bounding box via non-bg pixel envelope, measures offset from image center, shifts composition by cropping excess bg + extending opposite side. Skips detail_closeup (macro). Tightened brightness band: TARGET_HIGH 170→145, TARGET_LOW 100→85, TARGET_MID 135→115. Added CENTERING—CRITICAL prompt block. Pipeline order: bg enforcement → frame crop → brightness norm → centering. V36 verification (product #194): brightness PASS (product lum 92-109), centering PARTIAL (function operational but Gemini generation variance limits effectiveness — residual 7-18% offset), no new regressions. Commit: 8c3904d. D-122.
**Image Pipeline v35 — Deterministic Brightness Normalization DEPLOYED** (2026-04-07) — Production brightness consistency fix. (1) Audit confirmed: NO DM/group code divergence — both paths use identical `#gorsel → image-gen → generateByGeminiPro()` pipeline. (2) Root cause of washed-out outputs: v33/v34 brightness enforcement was conditional (only after retry failure), measured whole-image mean (light backgrounds inflated it), and used `sharp.modulate()` which affected background too. (3) New `normalizeBrightness()` function: measures PRODUCT pixel luminance only (excludes bg via color distance), applies selective gamma correction only to product pixels (bg preserved), target band 100-170 product mean lum, soft blend at product/bg boundary. (4) Normalization is now UNCONDITIONAL on every slot (like bg enforcement), running after bg enforcement + frame detection. (5) Tightened QC thresholds: mean > 200 (was 210), highlight > 30% (was 35%). (6) Prompt exposure instructions maintained from v34. Commit: 88c4d5f.
**Phase 20A Instagram/Facebook Dispatch — PROD-VALIDATED** (2026-04-05) — Full automated Instagram + Facebook dispatch validated on product #180. Three root causes found and fixed: (1) Facebook Page "UygunAyakkabı" (ID: 1040379692491003) was DEACTIVATED — re-activated via Meta Business Suite. (2) afterChange hook passed `doc` at depth=0 — images were bare IDs, extractMediaUrls() returned []. FIX: findByID({ depth: 1 }) before dispatch (commit ca4ccad). (3) Missing `automation_settings_story_targets` table in Neon — fetchAutomationSettings() failed silently, returned null, so instagramTokens was undefined and direct API path skipped. FIX: Table created manually via DDL. AUTOMATED DISPATCH RESULT: Instagram postId=18085404884600056 (mode=direct), Facebook postId=122103938528884171 (mode=direct, tokenMode=page-token). dispatchedChannels=["instagram","facebook"]. D-118.
**Phase 21 Operator Runbook — COMPLETED** (2026-04-06) — Comprehensive operator-facing daily SOP created at `project-control/OPERATOR_RUNBOOK.md`. Covers: daily operator flow (morning routine + core pipeline work), command-by-command reference (14 slash commands, 1 hash command, stock batch format, merchandising commands, story commands, system commands), full pipeline stage map with state matrix, automated behavior inventory (8 auto-fire triggers), exception handling for 7 failure scenarios (image gen, content gen, audit, activation, IG/FB dispatch, Shopier, stock), 7 critical warnings (never-skip items including visual approval gate, activation irreversibility, dispatch field protection, Instagram token expiry 2026-05-21, Facebook Page activation requirement, manual DDL requirement), bot responsibilities, daily checklist, and key operational thresholds. Based on verified code inspection of all Telegram handlers and afterChange hooks.
**VF-2 through VF-5: Visual-First Pipeline DEPLOYED + PROD-VALIDATED** (2026-04-05) — Full visual-first enforcement layer. VF-2: visualStatus written truthfully during image-gen lifecycle (pending→generating→preview→approved/rejected) across 9 transition points in route.ts and imageGenTask.ts. VF-3: /confirm gated on visualStatus===approved with per-state operator messages. VF-4: content generation gated on visualStatus===approved for all 3 paths (auto-trigger, manual, retry). VF-5: confirmation wizard UX polish — productType inline buttons (Erkek/Kadın/Çocuk/Unisex), brand manual text input with find-or-create in brands collection. Wizard step order: category→productType→price→sizes→stock→brand→targets→summary. Bug found during VF-6 validation: brands collection uses `name` field not `title` — fixed in 619c20d. D-117.
**VF-6 Visual-First Pipeline E2E Validation PROD-VALIDATED** (2026-04-05) — Full end-to-end visual-first pipeline validated on product #180 (Job #147). Every pipeline stage tested via live Telegram webhook calls to production. Results: (A) Intake PASS — product created from photo, correct draft/pending state. (B) Image Gen PASS — visualStatus transitions: pending→approved, workflowStatus: draft→visual_ready, 6 generative gallery images attached. (C) Visual Gate PASS — /confirm 180 blocked when visualStatus=pending ("Henüz görsel üretimi yapılmamış"), /content 180 trigger also blocked. (D) Confirmation Wizard PASS — productType button (Erkek), price text (999), sizes multi-select (40-43), stock (3/size), brand text (TestMarka), targets (website+instagram), summary+confirm all worked. 4 variants created, stockQuantity=12, sellable=true. (E) Content Gen PASS — auto-triggered after confirmation, commerce+discovery packs generated at 100% confidence, contentStatus=ready, workflowStatus=content_ready. (F) Audit PASS — approved_with_warning, all 3 dimensions pass (visual/commerce/discovery), approvedForPublish=true, workflowStatus=publish_ready. Minor warnings: no linked blog, meta description too long. (G) Activation PASS — status=active, workflowStatus=active, merchandising dates set, 7-day Yeni window. (H) Homepage PASS — product visible with "Yeni" badge, correct price/image. 11 bot events created across full lifecycle. One bug found+fixed: brand field name mismatch (name vs title). One pre-existing note: homepage size array shows default range instead of DB variants — storefront rendering issue, not VF regression. This validates the visual-first pipeline as the production operating model. D-117.
**Phase 12 Final Publish Autonomy + Orchestration Polish DEPLOYED** (2026-04-04) — Central publish readiness evaluation layer (`src/lib/publishReadiness.ts`) with 6-dimension check (confirmation, visuals, content, audit, sellable, publish targets). Readiness wired into mentixAudit: workflowStatus='publish_ready' only when ALL dimensions pass (not just audit approval). `/pipeline {id}` Telegram command shows full 10-stage lifecycle with readiness breakdown and state coherence check. `detectStateIncoherence()` catches contradictory states (e.g., soldout+sellable, publish_ready without confirmation). BotEvent `product.publish_ready` emitted on full readiness. D-113.
**Phase 11 Homepage Merchandising UI + Telegram Merch Commands DEPLOYED** (2026-04-04) — UygunApp client now renders 5 real merchandising sections (Yeni, Popüler, Çok Satanlar, Fırsatlar, İndirimli) from server-resolved data via `resolveHomepageSections()`. page.tsx builds section ID arrays and passes as `sections` prop. Client-side fallbacks when server data empty. Comprehensive `/merch` Telegram commands: preview (section summaries), status (per-product merchandising state), popular add/remove, deal add/remove, bestseller pin/unpin/exclude/include. All merchandising field updates use existing D-102 schema. D-112.
**Phase 9 Order/Stock/Soldout Autonomy DEPLOYED** (2026-04-04) — Central stock-change reaction logic. `src/lib/stockReaction.ts` computes effective stock from variants, determines state transitions (in_stock/low_stock/sold_out/restocked), updates workflow fields + product.status, emits BotEvents (stock.changed, product.soldout, product.restocked). Wired into Shopier webhook (after stock decrement) and Telegram STOCK command (after variant updates). Merchandising exclusion works via existing `isHomepageEligible()` gates — no changes needed to merchandising.ts. Soldout = visible but not sellable. Restock = automatic re-eligibility. `/stok {id}` Telegram command for stock status. D-110.

---

## What Is Working

### Storefront
- Next.js customer-facing site with Payload CMS integration
- Product catalog fully functional
- Paytr payment integration live
- Image hosting via Cloudinary

### Admin Panel
- Payload CMS editorial interface
- Product creation/editing with media upload
- Dispatch review panel with direct publish controls
- Admin dashboard with analytics

### Automation Pipeline (UPDATED 2026-03-28)
- ~~OpenClaw → n8n → Payload~~ **REPLACED** by direct Telegram webhook
- Telegram photo → `POST /api/telegram` → Payload Media + Product (direct, no VPS dependency)
- `X-Telegram-Bot-Api-Secret-Token` verified on all incoming requests
- Bot privacy mode OFF — receives all group messages including plain photos
- Duplicate guard working
- Admin review step before publish
- `#gorsel` command triggers AI image generation pipeline

### Instagram/Facebook Publishing
- **Instagram Direct Publish** — `src/lib/channelDispatch.ts::publishInstagramDirectly()`
  - Bypasses n8n entirely
  - Creates container + publishes media via Graph API
  - Returns `instagramPostId`, caption with dynamic hashtags
  - Verified live on @uygunayakkabi342026 (2026-03-22)
  - Phase 19: Token valid until 2026-05-21. No auto-refresh. Ready but not dispatched via pipeline yet.

- **Facebook Page Direct Publish** — `src/lib/channelDispatch.ts::publishFacebookDirectly()`
  - Uses Page Access Token (not user token)
  - Posts to UygunAyakkabı page (`1040379692491003`)
  - Verified with facebookPostId `122093848160884171` (2026-03-22)
  - Phase 19: facebookPageId injected from INSTAGRAM_PAGE_ID env var (not in DB). Ready but not dispatched via pipeline yet.

### External Channel Summary (Phase W — 2026-04-09)
| Channel | Status | Path | Global Flag | Credentials |
|---------|--------|------|-------------|-------------|
| Website | PROD-VALIDATED | implicit | true | — |
| Instagram | PROD-VALIDATED | Direct Graph API | true | Token valid (2026-05-21) |
| Facebook | DEPLOYED, NOT VALIDATED | Direct Graph API | true | Shared IG token |
| Shopier | BLOCKED | Jobs Queue | false | Unknown |
| Dolap | BLOCKED | n8n only | false | No webhook |
| X | BLOCKED | n8n only | false | No webhook |
| Threads | BLOCKED | n8n only | false | No webhook |

**Phase W Instagram Live Publish (2026-04-09)**:
- First real Instagram post via Graph API: postId=18337760137169144
- Permalink: https://www.instagram.com/p/DW6nLC_DgQP/
- Product #180, single image post, test caption
- Token + API path fully validated

**Phase W1 Automated Instagram Dispatch Reliability (2026-04-09)**:
- Pre-warm fix deployed: `prewarmMediaUrl()` fetches image before Graph API call, populates Vercel CDN cache
- Retry on error 9004 (media download failure) with 3s delay between attempts
- Automated dispatch now succeeds end-to-end: postId=18111402145693915
- Permalink: https://www.instagram.com/p/DW6qQFwEl8T/
- GeoBot caption used (not fallback template)
- dispatchedChannels=["instagram"], mode=direct, success=true
- Same pre-warm applied to Facebook direct publish path for future readiness
- Vercel Blob migration NOT required for Instagram — pre-warm is sufficient

### Mentix Intelligence Layer
- **13 skills deployed** on VPS (Hetzner 2-CPU)
- All Mentix skills active and responding
- Ops group created with full mention-trigger capability
- Bahriyar added as 3rd authorized user (security rotation complete)

---

## Collections & Schema

### Products
- Fields: id, title, price, originalPrice, brand, category, color, description, images, dispatchStatus
- Dispatch lifecycle: draft → dispatched (with publishResult metadata)
- Images stored via Cloudinary integration

### Brands & Categories
- Collections exist in schema but **remain empty** — manual population needed
- Will drive product filtering and dynamic hashtag generation

### Dispatch Targets (`products_channel_targets`)
- **Migration 2026-03-17**: `id` column changed from `varchar` to `SERIAL`
- Stores: productId, channelId, dispatchedAt, dispatchNotes, publishResult
- PublishResult schema includes mode (direct/webhook), success flag, and channel-specific IDs

---

## Database (Neon PostgreSQL)

### Current Schema
- `products` — main product catalog
- `products_channel_targets` — dispatch history and results
- `automation_settings` — global config (Instagram tokens, Facebook page ID, etc.)
- `users`, `accounts`, `sessions` — Payload CMS auth

### Migration History
| Date | Migration | Change |
|------|-----------|--------|
| 2026-03-17 | `products_channel_targets` | Converted `id` from `varchar` to `SERIAL` for stability |
| 2026-03-23 | `orders` | Added `shopier_order_id VARCHAR` column |
| 2026-03-23 | `enum_orders_source` | Added `shopier` enum value via `ALTER TYPE ... ADD VALUE` |
| 2026-03-23 | `payload_jobs` | Created manually (push:true unreliable in serverless) |
| 2026-03-23 | `products` | Added 5 `source_meta_shopier_*` columns manually |

### Known Issues
- Brands/Categories collections unpopulated
- Dolap integration stub only; no real API calls executed

---

## Production Environment (Vercel)

### Key Environment Variables
| Variable | Value | Usage |
|----------|-------|-------|
| `NEXT_PUBLIC_CMS_URL` | `https://cms.uygunayakkabi.com` | Payload CMS endpoint |
| `PAYLOAD_SECRET` | Set in Vercel | Encryption for CMS payloads |
| `INSTAGRAM_APP_ID` | `1452165060016519` | Meta OAuth client ID |
| `INSTAGRAM_APP_SECRET` | Set in Vercel | Meta OAuth secret |
| `INSTAGRAM_USER_ID` | `43139245629` | Instagram Business Account ID |
| `INSTAGRAM_PAGE_ID` | `1040379692491003` | **Facebook Page ID** (UygunAyakkabı) — corrected 2026-03-22 |
| `NEXT_PUBLIC_N8N_WEBHOOK_INSTAGRAM` | Set in Vercel | Fallback webhook (not primary path) |
| `NODE_ENV` | `production` | Guards: `push: true` blocks, logging, etc. |

### Step 20 — Shopier Integration (VERIFIED WORKING — 2026-03-23)
| Component | Status |
|-----------|--------|
| `src/lib/shopierApi.ts` | IMPLEMENTED — Shopier REST API v1 client, Bearer JWT auth |
| `src/lib/shopierSync.ts` | IMPLEMENTED — product mapping, jobs queue orchestration |
| `src/app/api/webhooks/shopier/route.ts` | IMPLEMENTED — HMAC-SHA256 multi-token verification |
| `src/app/api/payload-jobs/run/route.ts` | IMPLEMENTED — jobs runner endpoint |
| `.github/workflows/process-jobs.yml` | IMPLEMENTED — cron `*/5 * * * *`, calls jobs runner |
| `payload_jobs` table | MANUALLY CREATED in Neon (push:true unreliable in serverless) |
| `source_meta_shopier_*` (5 columns on products) | MANUALLY CREATED in Neon |
| 4 Shopier webhooks | REGISTERED — order.created, order.fulfilled, refund.requested, refund.updated |
| Product 11 smoke test | VERIFIED SYNCED — Shopier ID `45456186` |
| Webhook sig verification | VERIFIED — valid sig → 200, bad sig → 401 |

### Key Env Vars (Step 20)
| Variable | Purpose |
|----------|---------|
| `SHOPIER_PAT` | Shopier REST API Bearer JWT |
| `SHOPIER_WEBHOOK_TOKEN` | Comma-separated HMAC tokens (one per webhook registration) |

### Deployment Status
- **Vercel deployment**: v8 pending push (2026-03-29) — OpenAI-first strict pipeline: input validation, structured identity lock, no silent Gemini fallback, per-slot logs
- **Custom domain**: `uygunayakkabi.com` (CNAME configured)

### Instagram OAuth Routes
- `GET /api/auth/instagram/initiate` — Starts Meta consent flow
- `GET /api/auth/instagram/callback` — Exchanges code for tokens, stores in Payload CMS
- Scopes: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
- Long-lived token expires ~2026-05-20

---

## VPS Infrastructure (Hetzner)

### Mentix Skills
All deployed and operational:
1. mentix-intake-v3 (OpenClaw → Telegram integration)
2. 12 additional operator-facing skills

### n8n Workflows
- `channel-instagram-real.json` — Instagram publish (now fallback only)
- `channel-dispatch-webhook.ts` — Main entry point for product dispatch

### Docker Network
- Persistence configured for Telegram bot state
- Operator allowlist: Furkan + Sabri + Bahriyar

---

## Instagram/Facebook Credentials

### Instagram
| Config | Value | Location | Notes |
|--------|-------|----------|-------|
| User ID | `43139245629` | Vercel env + Payload CMS | Business Account ID |
| Access Token | `EAAUovIaOuYc...` | Payload CMS `automation-settings.instagramTokens.accessToken` | Long-lived (~60 days) |
| Token Expiry | 2026-05-20 | Payload CMS `automation-settings.instagramTokens.expiresAt` | Refresh via `/api/auth/instagram/initiate` |
| App ID | `1452165060016519` | Vercel env | Meta developer app |
| Username | `@uygunayakkabi342026` | Instagram | Professional account |

### Facebook Page (UygunAyakkabI)
| Config | Value | Notes |
|--------|-------|-------|
| Page ID | `1040379692491003` | **Correct Graph API ID** — stored as `INSTAGRAM_PAGE_ID` |
| Legacy ID | `61576525131424` | Old NPE profile ID (non-functional with Graph API) |
| Page Type | New Pages Experience (NPE) | Requires page-token fallback for publish |
| Access Token | Derived from OAuth flow | Obtained via GET `/{pageId}?fields=access_token` |

### Token Refresh Process
To refresh Instagram token: navigate to `https://uygunayakkabi.com/api/auth/instagram/initiate`, approve Meta consent, callback automatically updates Payload CMS.

---

## Known Constraints

### Instagram Publishing
- Direct Graph API used exclusively; n8n webhook available only as fallback
- Long-lived token valid ~60 days, then requires manual refresh

### Facebook Publishing
- Requires page-token obtained from Graph API (not user token)
- New Pages Experience (NPE) pages require correct numeric ID (`1040379692491003`)
- Posts to page only, not user timeline

### Automation
- `push: true` in dispatch does NOT execute in production (`NODE_ENV === 'production'` guard)
- Telegram group allowlist: Furkan, Sabri, Bahriyar only
- Duplicate guard checks for products with same title within 24 hours

### Collections
- Brands and Categories empty — must be manually populated for optimal filtering/metadata
- Shopier and Dolap integrations stub-only; no real API calls executed

### n8n Environment Variables (Deprecated)
| Variable | Purpose | Status |
|----------|---------|--------|
| `INSTAGRAM_USER_ID` | Legacy n8n workflow | Not used (direct publish active) |
| `INSTAGRAM_ACCESS_TOKEN` | Legacy n8n workflow | Not used (direct publish active) |
| `N8N_CHANNEL_INSTAGRAM_WEBHOOK` | Fallback webhook URL | Available but not primary |

---

## Phase 1 Completion Record

**Completed 2026-03-13** — Storefront and admin infrastructure delivered.

### Deliverables
- Next.js storefront with Payload CMS backend
- Admin product management panel
- Image upload and media management (Cloudinary)
- Paytr payment integration
- Basic product schema with dispatch tracking

---

## Phase 2 Completion Record (Steps 1–19)

**Completed 2026-03-22** — Full Instagram and Facebook integration.

### Key Milestones
- **Steps 1–6** — n8n webhook scaffolding, Telegram integration, OpenClaw mentix skill
- **Steps 7–8** — Payload global automation settings, Instagram OAuth foundation
- **Steps 9–11** — Duplicate guard, media attachment, admin review panel
- **Steps 12–15** — Mentix deployment v2, 13 skills live, security rotation
- **Steps 16–17** — Instagram real integration, OAuth token exchange (long-lived)
- **Steps 18–19** — Instagram direct Graph API publish (bypass n8n), Facebook direct publish

### Systems Verified Live
- Telegram mention → draft product → admin review → direct publish to Instagram/Facebook
- End-to-end tested with real posts (Instagram ID `18115629052647099`, Facebook ID `122093848160884171`)

---

## Deferred / Cleanup Items

- **Brands & Categories** — Empty collections; manual population needed
- **Dolap** — Stub only, no real API integration; ready for future development
- **n8n Instagram workflow** — Superseded by direct Graph API, kept as reference
- **Phase 1 cleanup** — Reusable design system components (deferred to Phase 3)

## Step 21 — Shopier Order Fulfillment (VERIFIED WORKING — 2026-03-23)
| Component | Status |
|-----------|--------|
| `Orders.ts` | `shopierOrderId` field added, `shopier` source option added |
| `enum_orders_source` | `shopier` added via SQL — MANUALLY APPLIED to Neon |
| `orders.shopier_order_id` column | MANUALLY CREATED in Neon |
| `order.created` webhook | Creates Payload Order document with customer info + product link |
| `order.fulfilled` webhook | Uses `applyOrderStatus(..., 'ship', 'shopier_webhook')` to stamp/audit shipment |
| `refund.requested` webhook | Updates Order status → `cancelled`, appends refund ID to notes |
| Idempotency guard | Skips duplicate orders (checks `shopierOrderId` before create) |
| Product auto-link | Matches `sourceMeta.shopierProductId` to local product |
| Smoke test | Order `SIM-ORDER-21-001` created in Neon — id=1, ORD-861452 ✅ |

---

## Steps 22–24 — Telegram Bot + AI Image Generation (VERIFIED WORKING — 2026-03-28)

### Architecture Change (Step 22): Direct Telegram Webhook (n8n/OpenClaw REMOVED from intake)
| Component | Status | Notes |
|-----------|--------|-------|
| `src/app/api/telegram/route.ts` | IMPLEMENTED | Direct Payload CMS webhook handler — no n8n/OpenClaw dependency |
| Photo intake | VERIFIED WORKING | Receives photo → downloads from Telegram → uploads to Vercel Blob → creates Media + Product |
| `TELEGRAM_BOT_TOKEN` | SET in Vercel | Bot token used for all Telegram API calls |
| `TELEGRAM_WEBHOOK_SECRET` | SET in Vercel | `X-Telegram-Bot-Api-Secret-Token` header verified on all incoming requests |
| Telegram group privacy mode | VERIFIED OFF | Disabled via BotFather — bot receives plain photos without @mention |
| Webhook registration | VERIFIED | Registered with `secret_token` parameter to match `TELEGRAM_WEBHOOK_SECRET` |

### Bug Fixes Applied and Verified (2026-03-28)
| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| Bot not receiving plain photos | Telegram group privacy mode ON | Disabled via BotFather `/mybots → Group Privacy → Turn Off` | VERIFIED FIXED |
| All `/api/telegram` calls → 401 | Webhook registered without `secret_token` but env var set | Re-registered webhook with matching `secret_token` via JS console | VERIFIED FIXED |
| "Satış Fiyatı zorunludur" on Telegram product create | `validate()` on price field didn't include `telegram` source | Added `data?.source === 'telegram'` bypass in `Products.ts` | VERIFIED FIXED |
| "Hiç görsel üretilemedi" (no images generated) | `GEMINI_FLASH_MODEL` set to `gemini-2.0-flash-exp-image-generation` (404) | Changed env var to `gemini-2.5-flash-image` in Vercel | VERIFIED FIXED |
| Generated images = completely wrong product | `gemini-2.5-flash-image` is text-to-image only — ignores image input | Two-step vision pipeline: Gemini Vision describes product → text prompt drives generation | VERIFIED DEPLOYED |

### Step 24 — AI Image Generation Pipeline (IMPLEMENTED — 2026-03-28)
| Component | File | Status |
|-----------|------|--------|
| Image generation task | `src/jobs/imageGenTask.ts` | IMPLEMENTED — Payload Jobs queue task |
| Vision analysis step | `describeProductImage()` in imageGenTask.ts | IMPLEMENTED — calls `gemini-2.5-flash` (vision) to describe product photo |
| Prompt builder | `src/lib/imagePromptBuilder.ts` | IMPLEMENTED — 5 concept prompts, uses `visualDescription` when available |
| Image providers | `src/lib/imageProviders.ts` | IMPLEMENTED — Gemini Flash (hizli), GPT Image (dengeli), Gemini Pro (premium), Karma |
| ImageGenerationJobs collection | `src/collections/ImageGenerationJobs.ts` | IMPLEMENTED |
| Telegram `#gorsel` command | `src/app/api/telegram/route.ts` | IMPLEMENTED — triggers image gen job |

### AI Image Generation — Key Architecture Decisions

#### Step 25 — Full Attempt History (2026-03-28 → 2026-03-29)

**User requirement (explicit):** Generated images must show the EXACT SAME shoe from the Telegram photo — different angles/scenes/compositions. NOT "just changing the background."

**Approach v1 — `fit:contain` at 1024×1024 (commit `ece33d2`)**
- Resize reference image to 1024×1024 with `fit:contain` (letterboxing for non-square)
- Result: Square shoe photos get ZERO padding → all 5 output images identical to original
- User outcome: "it's not generating at all" (images looked unchanged)
- Status: ❌ REJECTED — invisible on square photos

**Approach v2 — `fit:inside` 800×800 + `extend(112px)` (commit `8f866b2`)**
- Resize to 800×800 `fit:inside` then extend with 112px border on all sides → guaranteed 1024×1024 with visible border
- Result: Shoe visible with colored border, but all 5 images = same shoe same angle
- User outcome: "it s only changing the background. I don't want that"
- Status: ❌ REJECTED — user wants different compositions, not just colored borders

**Approach v3 — ML background removal + solid color fills (commit `0b4cbd3`)**
- `@imgly/background-removal` (isnet_quint8 model) strips shoe from background → transparent PNG
- Resize cutout to 780×780, composite centred onto 5 different solid-color 1024×1024 canvases (white, cream, charcoal, marble-grey, warm-beige)
- Result: Clean shoe cutout on 5 different background colors
- User outcome: "it s only cyhanging the background. ! ı dont want that" (repeated, emphatic)
- Status: ❌ REJECTED — user explicitly does not want background color changes

**Approach v4 — ML background removal + Gemini-generated scene backgrounds (commit `d2994b3`)**
**CURRENT DEPLOYED STATE** (as of 2026-03-29)
- `@imgly/background-removal` strips shoe → transparent cutout (780×780)
- For each of 5 scenes: call Gemini Flash to generate a realistic background image (white studio, cream backdrop, dark charcoal, marble surface, oak floor with bokeh)
- Composite shoe cutout centred onto generated background → JPEG output
- Falls back to solid color if Gemini background generation fails
- Result: Shoe on 5 different AI-generated scene backgrounds — but still same shoe, same angle, same direction
- User outcome: same rejection — "only changing the background"
- Status: ❌ REJECTED — fundamental problem unresolved

**Root cause identified:**
All approaches above share the same flaw: they take the original shoe photo at its original angle and paste/composite it onto different backgrounds. The user wants **different camera angles and compositions** (front view, side view, close-up texture, tabletop shot, lifestyle worn shot) — not the same photo on different backgrounds.

**What's needed (NOT YET IMPLEMENTED):**
An AI model that can take a reference shoe photo and genuinely **reconstruct it in 5 different poses/angles/scenes** while maintaining exact visual fidelity (same design, color, sole, details). This requires either:
1. A model with true image-editing capability (not text-to-image)
2. gpt-image-1 `/v1/images/edits` with stronger prompting (PARTIALLY IMPLEMENTED — commit `196c419` — not yet verified effective)
3. Stability AI ControlNet (shape-conditioned generation)
4. Fine-tuning / DreamBooth style subject preservation

#### Current Architecture — v8 (2026-03-29)

**ARCHITECTURE CHANGE: OpenAI-first, strict product-preserving pipeline.**

Pipeline A is now the ONLY path when a reference image exists.
No silent Gemini fallback when Pipeline A fails — failure is explicit.

```
STEP A — Input Validation (NEW)
  validateProductImage() in imageProviders.ts
  - Calls Gemini Vision to classify if image is a valid shoe/footwear photo
  - If invalid → job status='failed', Telegram rejection message, no generation
  - If validation API fails → defaults to valid=true (don't block on transient errors)

STEP B — Identity Lock Extraction (NEW — replaces describeProductImage)
  extractIdentityLock() in imageProviders.ts
  - Calls Gemini Vision to extract STRUCTURED identity: productClass, mainColor,
    accentColor, material, toeShape, soleProfile, heelProfile, closureType, distinctiveFeatures
  - Builds a formatted promptBlock with MUST NOT ALTER constraints for each field
  - On extraction failure → minimal fallback lock block used

STEP C — Pipeline A: OpenAI gpt-image-1 editing (PRIMARY + ONLY reference-image path)
  generateByEditing(referenceBuffer, mime, identityLockBlock) in imageProviders.ts
  - sharp converts photo to PNG 1024×1024 (fit:contain, white bg)
  - For each of 5 scene slots (sequential, 1 retry each, 1s between slots):
      fullPrompt = identityLockBlock + scene.sceneInstructions
      callGPTImageEdit(pngBuffer, fullPrompt, apiKey) — quality: 'medium'
      Convert result to JPEG q92
  - Returns buffers + slotLogs (per-slot: slot, attempts, success, outputSizeBytes)
  - If 0 images → job fails explicitly. NO Gemini fallback.

EDITING_SCENES v8 (5 physically distinct slots — each has FORBIDDEN list):
  slot 1 commerce_front      → dead-straight front, camera at lacing height, white bg,
                                toe+vamp+laces visible, NO side profile
  slot 2 side_angle          → EXACTLY 90° lateral, camera at sole level, cream bg,
                                full sole profile, heel on right, NO toe front
  slot 3 detail_closeup      → 15-20cm macro, 20-30° down, shallow DoF, raking sidelight,
                                texture/stitching sharp, NO wide shot
  slot 4 tabletop_editorial  → 55-65° overhead, marble surface, window light upper-left,
                                top face of shoe visible, Scandi editorial style
  slot 5 worn_lifestyle      → ground-level (10-15cm), one foot wearing shoe, bokeh bg,
                                golden light, NO face/body, NOT studio

PIPELINE B — Text-to-image fallback (DEGRADED PATH — only when no reference image)
  - Trigger: referenceImage = undefined (literally no product photo exists)
  - Flow: productContext text → buildPromptSet() → generateByMode()
  - Logged as 'Pipeline B — text-to-image, product identity not guaranteed'
  - NOT triggered when Pipeline A fails with a reference image (fail explicitly instead)

KEY IMPROVEMENTS in v8 vs v7:
  - Input validation gate: non-shoe images rejected before generation
  - Structured identity lock: 9-field extraction vs. single-sentence description
  - identityLockBlock now includes field-specific MUST NOT constraints (color, material, etc.)
  - No silent Gemini fallback when Pipeline A fails with reference image
  - slotLogs returned per slot: attempts, success, outputSizeBytes, rejectionReason
  - Telegram notification includes per-slot status icons (✅/❌)
  - describeProductImage() removed — replaced by extractIdentityLock() in imageProviders.ts
  - TypeScript: VERIFIED compiles clean (tsc --noEmit, 2026-03-29)
```

#### Pipeline B: Text-to-Image Fallback (DEGRADED — no reference image only)
- **Trigger**: `referenceImage === undefined` — product has no photo attached
- **Flow**: `productContext` text → `buildPromptSet()` → `generateByMode()`
- **Providers**: Gemini Flash (#hizli), GPT Image (#dengeli), Gemini Pro (#premium), Karma
- **Known limitation**: Text-to-image cannot guarantee exact product reproduction
- **CHANGED**: No longer triggered when Pipeline A fails with a reference image — failure is explicit

#### Key Technical Findings (2026-03-28 → 2026-03-29 session)
- **`/v1/images/edits` with gpt-image-1**: Requires `image[]` field name (NOT `image`). Using `image` returns 400 "Value must be 'dall-e-2'"
- **OpenAI Responses API (`/v1/responses`) with `image_generation` tool**: Does NOT do true editing — generates loosely inspired new images. NOT suitable for product fidelity.
- **`response_format: 'b64_json'`**: NOT a valid parameter for gpt-image-1 `/v1/images/generations` — causes 400 "Unknown parameter". Removed.
- **OPENAI_API_KEY**: Rotated 2026-03-28 (old key expired/401). Updated via Vercel internal API.
- **`gemini-2.0-flash-exp-image-generation`**: DEPRECATED — returns 404, not available in models list
- **Gemini image models ignore `inlineData`**: All Gemini image models are text-to-image only
- **`@imgly/background-removal-node`**: FAILED to install (requires its own sharp binary download, blocked by sandbox proxy). Universal version installed but approach ABANDONED.
- **Square photo problem**: `fit:contain` at 1024×1024 adds zero padding to square photos — all 5 outputs look identical to original
- **Compositing approach ABANDONED**: User explicitly rejected ALL background-swap approaches. Commit `b668ac4` removed all compositing code and switched to gpt-image-1 AI editing

#### Git Workaround (RECURRING)
- Workspace repo has persistent `index.lock` preventing direct git operations
- All git operations use temp clone at `/tmp/imgfix_tmp` with GitHub remote
- Remote: `https://ghp_***@github.com/frkbas34/uygunayakkabi-store.git`
- Commit config: `-c user.name="Yavuz" -c user.email="y.selimbulut38@gmail.com"`

### Environment Variables — Current Production State (Vercel)
| Variable | Value / Notes | Status |
|----------|--------------|--------|
| `GEMINI_API_KEY` | Set in Vercel | ACTIVE |
| `GEMINI_FLASH_MODEL` | `gemini-2.5-flash-image` | CORRECTED 2026-03-28 |
| `GEMINI_PRO_MODEL` | `imagen-4.0-ultra-generate-001` | ACTIVE |
| `OPENAI_API_KEY` | Rotated 2026-03-28 | ACTIVE — new key set via Vercel internal API (env ID `764gO7z42RX0uvI0`) |
| `TELEGRAM_BOT_TOKEN` | Set in Vercel | ACTIVE |
| `TELEGRAM_WEBHOOK_SECRET` | Set in Vercel | ACTIVE — must match webhook `secret_token` registration |
| `AUTOMATION_SECRET` | Set in Vercel | ACTIVE |

### Telegram Command Reference (VERIFIED WORKING)
| Command | Action |
|---------|--------|
| Send photo | Creates draft product with photo |
| `bunu ürüne çevir` + reply to photo | Converts photo to product |
| `#gorsel` / `#gorsel <id>` | Triggers AI image generation for last/specified product |
| `#gorsel #hizli` | Gemini Flash (fast) |
| `#gorsel #dengeli` | GPT Image (falls back to Gemini Flash) |
| `#gorsel #premium` | Gemini Pro / Imagen 4 Ultra |
| `#gorsel #karma` | All providers (hybrid) |

---

## Image Pipeline v39 — Visual Standard Reset (DEPLOYED — 2026-04-07)

**Operator Requirement:** Remove bright/washed look from all slots. Backgrounds must be visibly colored (not near-white). Slot 3 must NOT be back_hero — must be a close shot hero.

| Change | Before (v38) | After (v39) |
|--------|-------------|-------------|
| Background hex luminance | ~93-98% (near-white) | ~75-80% (visibly colored) |
| Brightness normalization band | 85-145 (mid 115) | 70-120 (mid 95) |
| QC brightness mean threshold | >200 | >185 |
| QC highlight threshold | >30% | >25% |
| Slot 3 | back_hero (3/4 rear) | close_shot_hero (3/4 front close) |
| TASK_FRAMING_BLOCK tone | Neutral | "Rich, warm, slightly dark. NOT bright or airy." |

**Slot Map (v39):**
| Slot | Name | Stage |
|------|------|-------|
| 1 | side_angle | standard |
| 2 | commerce_front | standard |
| 3 | close_shot_hero | standard |
| 4 | tabletop_editorial | premium |
| 5 | worn_lifestyle | premium |

**Status:** DEPLOYED — tsc clean, zero type errors

---

## Recommended Next Steps

**Step 25 — AI Product Photography Pipeline (IN PROGRESS — awaiting v8 test results)**
- v8 deployed: input validation gate, structured 9-field identity lock, strict 5-slot prompts, no silent Gemini fallback, per-slot slotLogs
- **NEXT ACTION**: Test with `#gorsel #dengeli` on a real shoe product — score each of 5 outputs
- **If Case A** (different compositions + sho
---

## Image Pipeline v50 — PRODUCTION BASELINE LOCKED (2026-04-07)

**Status:** LOCKED — Operator Approved — D-129

**DO NOT MODIFY without explicit operator approval.**

### Locked Visual Baseline
- Raw Gemini 2.5 Flash output — NO post-processing (no brightness, sharpness, softness adjustments)
- Input image padding uses background color (NOT white) — eliminates frame artifact
- v32 bitmap pixel font SN overlay (SVG rects, zero font dependencies, Vercel-safe)

### Locked Slot Map
| Slot | Index | Name | Stage | Description |
|------|-------|------|-------|-------------|
| 1 | 0 | side_angle | standard (PRIMARY) | 90° lateral profile, hero image |
| 2 | 1 | commerce_front | standard | Front studio hero |
| 3 | 2 | detail_closeup | standard | 3/4 angle close-up (18-25cm), toe/vamp |
| 4 | 3 | tabletop_editorial | premium | Overhead 55-65°, seamless studio floor |
| 5 | 4 | worn_lifestyle | premium | Ground-level lifestyle, worn on foot |

### Locked Background Color Map
| Shoe Color | Backdrop | Hex |
|-----------|----------|-----|
| Black/Siyah | Warm beige | #F5F0E8 |
| White/Beyaz | Light grey | #E8E8E8 |
| Brown/Kahve | Warm cream | #F5F1E6 |
| Tan/Taba | Off-white | #FAF8F5 |
| Grey/Gri | Clean white | #FFFFFF |
| Navy/Lacivert | Light grey | #EDEDED |
| Red/Kırmızı/Bordo | Neutral off-white | #F7F5F3 |
| Green/Yeşil/Olive | Warm cream | #F5F0E8 |
| Blue/Mavi | Warm off-white | #F5F2ED |
| Pink/Pembe | Light grey | #ECECEC |
| Beige/Krem | Warm grey | #E0DDD8 |
| Default | Neutral light grey | #EDEDED |

### Anti-Frame System (Triple Layer)
1. TASK_FRAMING_BLOCK — global "ANTI-FRAME RULE (ZERO TOLERANCE)" section
2. Per-slot CRITICAL ANTI-FRAME block in every sceneInstructions
3. ANTI_FRAME_FINAL_BLOCK — end-of-prompt verification checklist

### Key Files (DO NOT MODIFY)
- `src/lib/imageProviders.ts` — EDITING_SCENES, TASK_FRAMING_BLOCK, ANTI_FRAME_FINAL_BLOCK, getBackgroundForColor(), getBackgroundRGB(), generation functions
- `src/jobs/imageGenTask.ts` — Job orchestration, PIXEL_FONT, renderBitmapText(), overlayStockNumber()

### Commit Reference
Locked at commit e99e9cb (v50) on main branch.


---

## Content Architecture — Audit Complete (2026-04-07)

**Status:** ARCHITECTURE DEFINED — Awaiting operator approval for implementation phases

### What EXISTS (VERIFIED IMPLEMENTED)
- **geobotRuntime.ts**: Real Gemini 2.5 Flash content generation (commerce + discovery packs)
- **contentPack.ts**: Full lifecycle — trigger, write to product, blog creation, audit handoff
- **Product schema**: commercePack (5 channel copies) + discoveryPack (SEO article, FAQ, meta, keywords)
- **BlogPosts collection**: Auto-created from discoveryPack as draft
- **Telegram `/content` command**: show, trigger, retry
- **Auto-trigger**: Fires after product confirmation
- **BotEvent tracking**: content.requested → commerce_generated → discovery_generated → ready
- **Mentix audit**: Auto-triggered when content reaches 'ready'

### What Is NOT WIRED (gap)
- Storefront uses `product.description`, NOT `commercePack.websiteDescription`
- Channel dispatch uses `product.description`, NOT AI-generated captions
- No blog frontend pages (`/blog`, `/blog/[slug]`)
- No SEO meta tags from discoveryPack in page `<head>`
- No FAQ rendering on product pages
- No JSON-LD structured data
- No sitemap for blog posts

### Content Outputs Per Approved Product
| # | Output | Source | Consumer | Status |
|---|--------|--------|----------|--------|
| 1 | Website description | commercePack.websiteDescription | Product page | NOT WIRED |
| 2 | Product highlights | commercePack.highlights | Product page | NOT WIRED |
| 3 | Instagram caption | commercePack.instagramCaption | channelDispatch | NOT WIRED |
| 4 | Facebook copy | commercePack.facebookCopy | channelDispatch | NOT WIRED |
| 5 | X/Twitter post | commercePack.xPost | channelDispatch | NOT WIRED |
| 6 | Shopier description | commercePack.shopierCopy | channelDispatch | NOT WIRED |
| 7 | SEO meta title | discoveryPack.metaTitle | Product page head | NOT WIRED |
| 8 | SEO meta description | discoveryPack.metaDescription | Product page head | NOT WIRED |
| 9 | SEO article / blog post | discoveryPack.articleBody → BlogPost | Blog pages | NO FRONTEND |
| 10 | FAQ | discoveryPack.faq | Product page | NOT WIRED |
| 11 | Keywords | discoveryPack.keywordEntities | Structured data | NOT WIRED |
| 12 | JSON-LD Product schema | All content fields | Product page | NOT IMPLEMENTED |
| 13 | JSON-LD FAQ schema | discoveryPack.faq | Product page | NOT IMPLEMENTED |

### Geobot Ownership
Geobot owns ALL AI content generation:
- Commerce pack (5 channel-specific copies + highlights)
- Discovery pack (SEO article, meta, FAQ, keywords, internal links)
- BlogPost auto-creation (draft status, operator reviews)
- Content status tracking and BotEvent emission
- Content retry on partial/failed states

Geobot does NOT own:
- Content rendering on storefront (frontend responsibility)
- Content dispatch to channels (channelDispatch responsibility)
- Content approval/editing (operator responsibility via admin panel)
- Blog publishing (operator sets status from draft → published)


---

## Phase A — Storefront Content Wiring (2026-04-07)

**Status:** IMPLEMENTED — D-131

Product page now renders Geobot content with safe fallbacks:

| Content | Source | Fallback | Rendering |
|---------|--------|----------|-----------|
| Description | commercePack.websiteDescription | product.description | Paragraph text |
| Highlights | commercePack.highlights | hidden | Checkmark list |
| FAQ | discoveryPack.faq | hidden | Accordion (ProductFAQ component) |
| Meta title | discoveryPack.metaTitle | "{title} — UygunAyakkabı" | `<head>` via generateMetadata |
| Meta description | discoveryPack.metaDescription | websiteDescription[:160] | `<head>` via generateMetadata |
| Keywords | discoveryPack.keywordEntities | omitted | `<meta keywords>` |
| JSON-LD Product | All product fields | basic fields | `<script type="application/ld+json">` |
| JSON-LD FAQPage | discoveryPack.faq | omitted | `<script type="application/ld+json">` |

**Files:**
- `src/app/(app)/products/[slug]/page.tsx` — Rewritten
- `src/components/ProductFAQ.tsx` — New component


---

## Phase B — Blog Frontend (2026-04-07)

**Status:** IMPLEMENTED — D-132

| Route | What | SEO |
|-------|------|-----|
| `/blog` | Published posts listing, date-sorted | Static meta |
| `/blog/[slug]` | Full article, featured image, related products | Dynamic meta from seo fields, JSON-LD Article |

**Rendering:** Lexical richText → text extraction → paragraph/heading/list rendering with basic Markdown detection.

**Operator workflow:** Geobot creates posts as `draft` → operator sets `published` in admin → appears on `/blog`.

**Files:** `src/app/(app)/blog/page.tsx`, `src/app/(app)/blog/[slug]/page.tsx`


---

## Phase C — Attribution Chain (2026-05-07) [D-250 through D-256]

**Status:** COMPLETE — all 7 decisions shipped and prod-validated.

| D# | What | Key files |
|----|------|-----------|
| D-250 | Order source attribution hygiene — `convertLeadToOrder` maps lead.source → order.source enum via `mapLeadSourceToOrderSource()` instead of hardcoding `'telegram'` | `src/lib/leadDesk.ts` |
| D-251 | UTM + referrer capture on inquiries — 4 new nullable Neon columns (`utm_source/medium/campaign`, `referrer`), `ContactForm.tsx` captures at submit time | `src/app/api/inquiries/route.ts`, `src/components/ContactForm.tsx` |
| D-252 | Attribution visibility in Telegram lead workflow — `/lead <id>` card + new-lead alert show source / UTM / referrer block | `src/lib/leadDesk.ts` |
| D-253 | Attribution roll-up in `/funnel` — footer block shows top UTM sources, campaigns, referrers for the window | `src/lib/funnelDesk.ts` |
| D-254 | `/utm` Telegram command — UTM link builder with source/medium/campaign guardrails, SN lookup | `src/lib/utmBuilder.ts`, `src/app/api/telegram/route.ts` |
| D-255 | `/campaigns` + `/campaign <name>` — campaign QA surface, heuristic signals for untagged/singleton traffic | `src/lib/campaignDesk.ts`, `src/app/api/telegram/route.ts` |
| D-256 | Product page lead conversion polish — interactive size chips in ContactForm, success state with product title, sticky mobile CTA, `id="inquiry-form"` anchor | `src/components/ContactForm.tsx`, `src/app/(app)/products/[slug]/page.tsx` |
| D-257 | Homepage/listing → PDP clickthrough polish — sticky CTA on mobile, product card detail button, category chips on homepage | `src/app/(app)/UygunApp.jsx` |
| D-258 | Homepage trust / order flow clarity — 3-step inquiry flow strip, brand copy applied | `src/app/(app)/UygunApp.jsx` |
| D-259 | Catalog browse clarity polish — dynamic heading per filter, always-visible count, sort controls, category-scoped size filter | `src/app/(app)/UygunApp.jsx` |
| D-260 | Mobile catalog filter drawer — sticky compact bar + bottom sheet, active filter pills, body scroll lock | `src/app/(app)/UygunApp.jsx` |
| D-261 | PDP trust/delivery/FAQ clarity — 4-item trust strip grid, 3-step process strip, always-on FAQ fallback, success state next-steps, ProductFAQ restyle | `src/app/(app)/products/[slug]/page.tsx`, `src/components/ContactForm.tsx`, `src/components/ProductFAQ.tsx` |
| D-262 | Sitewide contact/WhatsApp fast-path polish V1 — catalog contact nudge strip below grid, WA label "WhatsApp'tan Bilgi Al" on PDP+ProductDetail, sz-prefilled WA message in ProductDetail, PDP WA message clearer intent, mobile sticky CTA split 40% WA + 60% inquiry | `src/app/(app)/UygunApp.jsx`, `src/app/(app)/products/[slug]/page.tsx` |
| D-263 | Size guidance / fit confidence polish V1 — size-help reassurance note below size chips, inquiry heading "Sipariş Ver veya Beden Sor" + subtitle, process step 2 relabeled "Beden & Teslimat Netleşir", ContactForm chip label "(opsiyonel)" + "proceed without size" hint | `src/app/(app)/products/[slug]/page.tsx`, `src/components/ContactForm.tsx` |
| D-264 | OOS size recovery / alternative inquiry path V1 — OOS chips converted to `<a href="#inquiry-form">` anchors (dashed border, pointer), context-aware size-help note (mixed-stock aware), ContactForm: `chipSelected` state separates chip vs typed size, OOS recovery text input shown when no chip selected | `src/app/(app)/products/[slug]/page.tsx`, `src/components/ContactForm.tsx` |
| D-265 | OOS size auto-prefill / recovery UX polish V1 — new `OOSChip.tsx` client component fires `CustomEvent('oosChipClicked')` + smooth-scrolls to `#inquiry-form`; ContactForm `useEffect` listener auto-prefills size + sets `oosContext`; amber banner + amber input border when OOS context active; clears on manual edit or success | `src/components/OOSChip.tsx` (new), `src/components/ContactForm.tsx`, `src/app/(app)/products/[slug]/page.tsx` |
| D-266 | Catalog / site search & quick-find V1 — client-side keyword search: `query` state, `searchFiltered` pipeline (name/title/stockNumber match), search bar above controls (always visible desktop+mobile), mobile search pill in sticky bar with tap-to-clear, search-aware empty state, `resetFilters` clears search | `src/app/(app)/UygunApp.jsx` |
| D-267 | PDP similar products recovery path V1 — server-side Payload query (same category, exclude current, exclude drafts, max 6, sort -createdAt); "Benzer Modeller" section after FAQ, responsive auto-fill grid (minmax 200px); each card: 1:1 image, title, price tr-TR; zero-state safe (hidden when no results) | `src/app/(app)/products/[slug]/page.tsx` |
| D-268 | Price/discount/stock clarity polish V1 — card originalPrice 12→13px + 0.3→0.4 opacity; discount badge `%N` → `%N indirim` on cards+ProductDetail+PDP; PDP stock badge "Stokta" → "Stokta · N beden"; PDP BEDEN label shows available count | `src/app/(app)/UygunApp.jsx`, `src/app/(app)/products/[slug]/page.tsx` |
| D-269 | PDP gallery usa
