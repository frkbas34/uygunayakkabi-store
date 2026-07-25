# TASK QUEUE — Uygunayakkabi

_Last updated: 2026-07-25 (D-500 Meta provider configuration unification and approved read-only provider-health evidence.)_

## D-500 Meta provider configuration unification - 2026-07-25 - LOCAL FIX READY, configured read passed

- [x] Resolve Facebook Page ID through one shared `INSTAGRAM_PAGE_ID` helper for direct dispatch and provider health.
- [x] Remove caller-side mutation of the removed Payload `facebookPageId` field while retaining legacy in-memory compatibility.
- [x] Remove retired Dolap/Threads fallback keys and stale X OAuth 2.0 setup guidance from `.env.example`.
- [x] Run provider-health, credential resolver, dispatch, source/release/PR/Obsidian governance, full `npm run validate`, `npm run build`, and `git diff --check`.
- [x] Run approved read-only provider-health smoke: Website and Facebook ready, Instagram disabled, X and Shopier missing requirements; no writes or provider calls.
- [ ] Review deployed credential names, token/session/account permissions, and quota outside chat; record the evidence before any explicit live probe.
- [ ] Commit/branch/PR/deploy only after operator approval.

## D-499 protected-brand per-product diagnostic alignment - 2026-07-25 - LOCAL FIX READY, configured read passed

- [x] Make Product Flow and Image Plan route protected-brand records to preview-first provenance review before any Image QC or generation action.
- [x] Withhold Image QC, generation, activation, Shopier, redispatch, and ad-action commands while the brand block remains.
- [x] Thread the latest provenance BotEvent through Product Flow and Image Plan so recorded decisions advance manual guidance without clearing the hard block.
- [x] Re-run the approved `SN0111` Product Flow and Image Plan reads: both now report brand-first ordering without writes or external calls.
- [x] Pass `test:product-flow-snapshot`, `test:image-regeneration-plan`, typecheck, and `git diff --check`.
- [x] Re-run final full `npm run validate` and `npm run build` locally.
- [ ] Commit/branch/PR/deploy only after operator approval.

## D-499 Batch Image QC remediation queue - 2026-07-25 - LOCAL FIX READY, configured read passed

- [x] Add read-only `/imageqcplan` and `smoke:image-qc-plan:read` batch triage.
- [x] Keep protected-brand rows in provenance review before image work; non-brand rows only receive Image Plan/Product Flow reads.
- [x] Run approved catalog read: 55 queue items, 13 brand first, 28 QC failures, 14 QC decisions needed, and 0 missing-original/review rows.
- [x] Pass `test:image-qc-remediation-plan`, `test:operator-smoke-plan`, `test:runtime-smokes`, typecheck, and `git diff --check`.
- [x] Run final full `npm run validate` and `npm run build` locally.
- [ ] Commit/branch/PR/deploy only after operator approval.

## D-498 Brand remediation provenance-state workflow - 2026-07-25 - LOCAL FIX READY, configured read passed

- [x] Classify protected-brand rows by recorded provenance state and show a safe manual next step.
- [x] Count unreviewed and external-history items at the queue level without changing records.
- [x] Re-run the approved brand smoke: 13 unreviewed blockers, 9 with stored external history.
- [x] Pass `test:brand-safety-plan`, `test:runtime-smokes`, typecheck, and `git diff --check`.
- [x] Run final full `npm run validate` and `npm run build` locally.
- [ ] Commit/branch/PR/deploy only after operator approval.

## D-497 Brand remediation external-exposure visibility - 2026-07-25 - LOCAL FIX READY, configured read passed

- [x] Surface recorded Facebook/Instagram/X/Shopier `published`, `queued`, and `failed` states in the protected-brand remediation plan.
- [x] Exclude Website from that external exposure record and keep unknown/blocked states out of it.
- [x] Keep the output read-only: no live listing check, cleanup, retry, publish, dispatch, provider call, Shopier call, or product write.
- [x] Run `test:brand-safety-plan`, `test:runtime-smokes`, typecheck, and the approved `smoke:brand-safety:read` catalog read.
- [x] Run final full `npm run validate` and `npm run build` locally.
- [ ] Commit/branch/PR/deploy only after operator approval.

## D-496 Lead-followup runtime smoke completeness - 2026-07-25 - LOCAL FIX READY, configured read passed

- [x] Reproduce the temporary read-only Payload configuration failure caused by Products referencing `blog-posts` while BlogPosts was not registered.
- [x] Register BlogPosts beside Products in the lead-followup smoke and pin that requirement in runtime-smoke governance.
- [x] Re-run `test:runtime-smokes`, typecheck, and `git diff --check` locally.
- [x] Re-run approved `smoke:lead-followup:read`: six open stale leads are returned as PII-light manual actions without writes or external calls.
- [x] Run full `npm run validate` and `npm run build` after the correction.
- [ ] Commit/branch/PR/deploy/live Telegram lead follow-up only after operator approval.

## D-495 Meta public-media dispatch preflight - 2026-07-25 - LOCAL FIX READY

- [x] Fail Instagram/Facebook before direct Meta or optional n8n fallback without public HTTPS media.
- [x] Keep configured fallback visible in the failed result without calling it.
- [x] Prove both Meta channels make zero mocked fetch calls for unusable media.
- [x] Pass full `npm run validate` and `npm run build` locally.
- [ ] Verify public production media plus one operator-approved real Meta dispatch per configured channel.

## D-494 Meta gallery media selection alignment - 2026-07-25 - LOCAL FIX READY

- [x] Make Meta direct selection scan the full gallery for a public HTTPS image.
- [x] Cover Instagram and Facebook direct branches with mocked later-image responses.
- [x] Run focused channel dispatch, dispatch-state, provider-health, and type checks plus full `npm run validate` and `npm run build` locally.
- [ ] Verify production media reachability plus one operator-approved real Meta dispatch per configured channel.

## D-493 X direct/fallback provider readiness alignment - 2026-07-25 - LOCAL FIX READY

- [x] Require all four X OAuth values before a direct X API call.
- [x] Use the optional X n8n webhook only as a fallback for incomplete OAuth.
- [x] Record missing OAuth keys and fallback requirement when neither path is ready.
- [x] Run focused dispatch/provider-health/redispatch/dispatch-state checks, full `npm run validate`, and `npm run build` locally.
- [ ] Verify production X credentials, account permissions, quota, and either direct or fallback delivery only with separate operator approval.

## D-481 Shopier order-ID duplicate-safety index - 2026-07-25 - APPLIED AND VERIFIED

- [x] Run approved preflight and no-connection SQL dry run.
- [x] Apply the reviewed concurrent partial unique index with explicit approval.
- [x] Verify `orders_shopier_order_id_unique_idx` is present and duplicate non-empty IDs are zero.
- [x] Run `npm run test:shopier-webhook-local` locally.
- [ ] Obtain separately approved live Shopier webhook delivery evidence.

## D-491 Order-To-Lead Relationship Schema Governance - 2026-07-25 - LOCAL FIX READY

- [x] Remove executable relationship DDL from Orders collection comments and request paths.
- [x] Block manual lead conversion before any order write when the idempotency lookup detects relationship schema drift.
- [x] Add a confirmation-gated metadata preflight plus dry-run-first absent-relationship helper.
- [x] Run focused conversion-schema checks and the dry-run helper without a database connection.
- [x] Run the approved read-only relationship preflight: the nullable integer column and its `customer_inquiries.id` foreign key already exist, so no DDL was needed.
- [ ] In a future incomplete environment only, apply an absent relationship with separate explicit operator approval.
- [ ] Commit/branch/PR/deploy/live lead-conversion validation only after operator approval.

## D-490 Lead-Status Enum Schema Governance - 2026-07-25 - LOCAL FIX READY

- [x] Remove executable enum DDL from the Telegram lead-status error path.
- [x] Keep enum-drift failures no-write and free of BotEvent audit records.
- [x] Add a confirmation-gated metadata preflight plus dry-run-first enum helper.
- [x] Run focused lead-schema/lead-desk checks, full `npm run validate`, `npm run build`, and `git diff --check` locally.
- [x] Run the approved read-only enum preflight: every declared CustomerInquiries status value already exists, so no DDL was needed.
- [ ] In a future incomplete environment only, apply missing enum values with separate explicit operator approval.
- [ ] Commit/branch/PR/deploy/live lead-status validation only after operator approval.

## D-489 Confirmation-Wizard Schema Governance - 2026-07-25 - LOCAL FIX READY

- [x] Remove request-time `CREATE TABLE` and `ALTER TYPE` behavior from ordinary Telegram confirmation.
- [x] Add static contract coverage for the category options plus pre-provisioned wizard-session row persistence.
- [x] Add a confirmation-gated, metadata-only schema check and a dry-run-first missing-table helper.
- [x] Run focused governance, full `npm run validate`, `npm run build`, and `git diff --check` locally.
- [x] Keep the confirmed database preflight/apply outside normal validation; the approved preflight found `public.wizard_sessions` complete, so no DDL was needed.
- [x] Run the approved read-only schema preflight: the configured environment already satisfies the wizard-session contract.
- [ ] In a future incomplete environment only, apply the missing-table helper with separate explicit operator approval.
- [ ] Commit/branch/PR/deploy/live Telegram validation only after operator approval.

## D-488 Optional OpenClaw VPS Deploy Guard - 2026-07-25 - LOCAL FIX READY

- [x] Make `scripts/vps-deploy.sh` refuse before any VPS write, skill copy, or restart unless both reactivation flags are present.
- [x] Prove bare and one-flag invocations fail locally through standalone `test:openclaw-vps-verification`.
- [x] Run full `npm run validate`, `npm run build`, and `git diff --check` after source-pack and handoff synchronization.
- [ ] VPS reactivation/sync only after a separate operator decision, recorded read-only verification evidence, and explicit approval.

## D-487 Shared Blog And PDP JSON-LD Serialization - 2026-07-25 - LOCAL FIX READY

- [x] Centralize safe inline JSON-LD serialization and use it for Blog Article and PDP schema.
- [x] Add helper and Blog integration tests to the safe validation suite.
- [ ] Commit/branch/PR/deploy/live browser action only after operator approval.

## D-486 Storefront Image Fallback And Structured Data Safety - 2026-07-25 - LOCAL FIX READY

- [x] Prefer usable generated gallery URLs while falling back to original product media on the public PDP and similar products.
- [x] Feed the resolved gallery into Product JSON-LD; derive availability from shared sellable-stock truth and safely serialize inline schema.
- [x] Cover image resolution, Product/FAQ structured data, and PDP integration locally.
- [ ] Commit/branch/PR/deploy/live browser action only after operator approval.

## D-485 Shopier atomic floor-at-zero decrement - 2026-07-25 - LOCAL FIX READY

- [x] Replace Shopier read-then-write decrement with transaction-bound floor-at-zero PostgreSQL arithmetic.
- [x] Keep external paid-order and InventoryLog behavior while preventing concurrent depletion loss.
- [x] Cover the stock path through `test:shopier-webhook-local`.
- [ ] Commit/branch/PR/deploy/live Shopier webhook action only after operator approval.

## D-484 non-Shopier conditional stock reservation - 2026-07-25 - LOCAL FIX READY

- [x] Replace non-Shopier read-then-write stock updates with conditional PostgreSQL reservations inside the parent transaction.
- [x] Fail closed on a zero-row reservation before InventoryLog creation.
- [x] Cover product, variant, missing-transaction, and zero-row paths in `test:order-stock-transaction`.
- [ ] Commit/branch/PR/deploy/live order action only after operator approval.

---

## D-483 non-Shopier order stock transaction boundary - 2026-07-25 - LOCAL FIX READY, full validation/build passed

- [x] Run product/variant stock mutation and InventoryLog creation before the generic non-Shopier alert.
- [x] Keep the parent Payload request on stock reads/writes and stock reaction work.
- [x] Reject missing product/size, unknown variant, and insufficient stock instead of swallowing the failure.
- [x] Add in-memory hook coverage plus Payload create transaction-order governance.
- [x] Run `npm run test:order-stock-transaction`, `npm run typecheck`, and `npm run lint`.
- [x] Run full `npm run validate`, `npm run build`, and `git diff --check` after source-pack and release-control synchronization.
- [ ] Commit/branch/PR/deploy/live order action only after operator approval.

---

## D-482 Shopier order transaction boundary - 2026-07-24 - LOCAL FIX READY, FULL VALIDATION/BUILD PASSED

- [x] Create a fail-closed Payload transaction helper for atomic commerce work.
- [x] Thread the same transaction request through Shopier product/variant stock and InventoryLog writes.
- [x] Return `500` for verified processing failure and keep the Shopier alert post-commit only.
- [x] Suppress the generic pre-commit Orders alert for Shopier-created orders.
- [x] Add focused transaction, stock-request, route-governance, and combined local webhook coverage.
- [x] Run full `npm run validate` and `npm run build` after source-pack and project-control synchronization.
- [ ] Commit/branch/PR/deploy/live Shopier webhook/API action only after operator approval.

---

## D-481 Shopier order-ID duplicate-safety guard - 2026-07-24 - LOCAL FIX READY, LATER APPLIED AND VERIFIED

- [x] Identify the concurrent `find` then `create` gap for duplicate Shopier `order.created` deliveries.
- [x] Declare `shopierOrderId` unique and return on a database duplicate-key create conflict before stock decrement.
- [x] Add a read-only column/index/duplicate preflight and a dry-run-first partial unique-index helper.
- [x] Run focused helper/governance checks, runtime-smoke governance, and the no-connection dry run.
- [x] Run full `npm run validate` and `npm run build` after source-pack and project-control sync.
- [x] Run the approved read-only database preflight; duplicate non-empty IDs were zero.
- [x] Apply the partial unique index after explicit approval; the post-apply schema check passes.
- [ ] Commit/branch/PR/deploy/live Shopier webhook/API action only after operator approval.

---

## D-480 Shopier webhook authenticity fail-closed guard - 2026-07-24 - LOCAL FIX READY, full validation/build passed

- [x] Identify that a missing `SHOPIER_WEBHOOK_TOKEN` skipped signature verification on a mutation-capable webhook.
- [x] Verify the documented HMAC-SHA256 signature against the exact raw request body with constant-time comparison and token rotation support.
- [x] Reject missing signing configuration with `503` and missing/malformed/invalid signatures with `401` before JSON parsing or side effects.
- [x] Fold pure security and route-governance checks into `test:shopier-webhook-local` and `test:safe`.
- [x] Run full `npm run validate` and `npm run build` after the project-control/source-pack governance refresh.
- [ ] Commit/branch/PR/deploy/live Shopier webhook/API action only after operator approval.

---

## D-479 Blog editorial preflight and first-publication guard - 2026-07-24 - LOCAL FIX READY, full validation/build passed

- [x] Define shared BlogPost readiness, AI/evidence-review, and SEO warning rules without provider calls.
- [x] Block incomplete or placeholder first transitions to `published`, set `publishedAt`, and preserve legacy published edits.
- [x] Add read-only `/blogpreflight` plus confirmation-gated `smoke:blog-preflight:read` diagnostics.
- [x] Filter public Blog detail fetches to published posts before metadata generation.
- [x] Add pure, collection-hook, Telegram-boundary, and runtime-smoke governance coverage.
- [x] Run full `npm run validate` and `npm run build` after the project-control/source-pack governance refresh.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-478 Provenance review delivery idempotency - 2026-07-24 - LOCAL FIX READY, full validation/build passed

- [x] Identify duplicate BotEvent risk when Telegram retries a confirmed `/brandreview` delivery.
- [x] Store an opaque delivery key in the event payload and return the original decision for the same delivery.
- [x] Keep the check event-only; no schema change, product update, safety bypass, publish, dispatch, or queue action.
- [x] Extend pure and Telegram command-boundary coverage.
- [x] Run final full validation/build after the project-control/source-pack governance refresh.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-477 Protected-brand provenance review audit - 2026-07-24 - LOCAL FIX READY, full validation/build passed

- [x] Add preview-first `/brandreview` parsing with explicit confirmation and bounded note support.
- [x] Record one BotEvent only after confirmation; keep products, activation safety, and publication unchanged.
- [x] Show the latest valid review evidence in `/brandplan` and the matching read-only runtime smoke.
- [x] Add pure review, Telegram boundary, and remediation-plan coverage to `test:safe`.
- [x] Run final full validation/build after the project-control/source-pack governance refresh.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-476 Catalog risk-first loading-plan order - 2026-07-24 - LOCAL FIX READY, full validation/build passed

- [x] Identify that a draft protected-brand product with more secondary blockers could outrank an active protected-brand exposure in `/loadplan`.
- [x] Rank active, then sold-out, then draft protected-brand worklist entries before secondary blocker count.
- [x] Show product status in each worklist row and add a loading-plan regression test.
- [x] Run focused loading-plan, typecheck, lint, and diff validation.
- [x] Run final full validation/build.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-475 Direct Telegram UTM guard - 2026-07-24 - LOCAL FIX READY, full validation/build passed

- [x] Identify that `/utm` built a customer-facing URL from a slug without checking product visibility or safety.
- [x] Add a shared active/public-storefront eligibility helper for product-resolved UTM output.
- [x] Require the Telegram command to use the guard before `buildProductUtmUrl()` and preserve its read-only behavior.
- [x] Add pure helper and route-governance tests, both in `test:safe`; run focused typecheck/lint/diff validation.
- [x] Run final full validation/build.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-474 Safe public PDP link policy - 2026-07-24 - LOCAL FIX READY, focused validation passed

- [x] Centralize public-status plus storefront-safety eligibility in `isPublicStorefrontProduct()`.
- [x] Apply the rule to brand remediation, loading plans, Shopier previews, operator inbox, lead/order desks, and ad UTM/readiness checks.
- [x] Keep all admin links available while withholding public PDP/UTM links for protected-brand or placeholder products.
- [x] Run focused policy tests, typecheck, and lint without product or integration mutations.
- [x] Run final full validation/build.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-473 Product Flow Website visibility truth - 2026-07-24 - LOCAL FIX READY, focused validation passed, runtime recheck pending

- [x] Reproduce a draft product incorrectly shown as Website published in read-only Product Flow.
- [x] Pass public-status and storefront-safety visibility into Website dispatch rows, including stale website notes.
- [x] Keep unsafe/draft PDP links out of Product Flow and cover draft plus protected-brand cases.
- [x] Run focused dispatch-status/product-flow tests, typecheck, lint, and diff validation.
- [x] Re-run the read-only Product Flow smoke for `SN0077`; Website is blocked with no public URL.
- [x] Run final full validation/build.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-472 Verified storefront metrics gate - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Remove hard-coded homepage fallback metrics and replace them with blank defaults.
- [x] Add a default-off Site Settings switch for deliberately verified metric values.
- [x] Require all three enabled metric values before public rendering.
- [x] Extend storefront-trust governance; run it with typecheck, lint, and diff validation.
- [x] Confirm a fresh production-server homepage response contains none of the legacy metric claims.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-471 Public storefront safety gate - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Exclude placeholder intake/test titles and protected-brand matches from public homepage merchandising and related-product rails.
- [x] Return `notFound()` and suppress metadata for unsafe direct PDP records; exclude them from the public sitemap.
- [x] Keep the guard read-only: it does not update, retire, publish, or otherwise mutate product records.
- [x] Run focused merchandising/storefront/homepage, typecheck, lint, and diff validation.
- [x] Confirm a fresh local desktop homepage navigation no longer exposes placeholder cards.
- [x] Reproduce fresh production-server route smoke: normal PDP returns `200`, placeholder PDP returns `404`, and sitemap omits the placeholder slug while retaining a safe product URL.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-470 Product Flow action-ID handoff - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Keep the stock number as the operator-facing product reference while deriving numeric `commandRef` for generated action commands.
- [x] Cover confirmation/content/audit/activation/Shopier/image/repair/redispatch command handoffs with the existing Product Flow Snapshot scenarios.
- [x] Print `commandRef` in the read-only Product Flow runtime smoke and protect it with runtime-smoke governance.
- [x] Run focused product-flow/runtime-smoke tests, typecheck, lint, and diff validation.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-469 Turbopack workspace-root pin - 2026-07-24 - LOCAL FIX READY, build passed, deployment pending

- [x] Pin `turbopack.root` to this repository so Next does not infer the parent home-directory lockfile as its workspace root.
- [x] Run `npm run build` and confirm the production build passes without the former workspace-root warning.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

---

## D-468 Product workflow golden path - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Add a no-database golden path across Telegram target normalization, Payload channel intent, lifecycle/readiness, activation defaults, and protected-brand refusal.
- [x] Keep the scenario own-products-only and active-channel-only; retired targets must fall out before activation.
- [x] Include the golden path in `test:safe` as `test:product-workflow`.
- [x] Run focused golden-path, typecheck, lint, and diff validation.
- [x] Re-run full `npm run validate` after source-pack/release/PR/Obsidian control sync.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

## D-467 Protected-brand manual activation hard gate - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Identify and close the `manualPublishOverride` path that could skip a protected-brand activation blocker.
- [x] Keep the generic Image QC/audit review override available while requiring a safe brand scan before Publish Desk can activate.
- [x] Make the Payload `Products.beforeChange` hook independently reject a protected-brand active transition even with override context.
- [x] Add Publish Desk and direct Payload-hook regression checks.
- [x] Run full `npm run validate` and `npm run build` after source-pack/release/PR/Obsidian control sync.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

## D-466 Protected-brand remediation plan - 2026-07-24 - LOCAL FIX READY, read-only runtime proof passed, deployment pending

- [x] Run read-only catalog diagnostics and identify protected-brand cleanup as the first catalog blocker.
- [x] Add `/brandplan [limit]` with severity/brand grouping, matched-field evidence, product-flow handoffs, and deterministic operator links.
- [x] Add `smoke:brand-safety:read` with confirmation, `PAYLOAD_DB_PUSH=false`, mutation-flag refusal, and no-write boundaries.
- [x] Keep automatic text rewrites, stop-sale, retirement, activation, publishing, redispatch, provider/Shopier calls, ad spend, SupplierScout, and retired-channel activation out of the plan.
- [x] Route the loading-plan brand-safety action to `/brandplan` and place brand diagnostics in `/smokeplan` before the selected product-flow remediation.
- [x] Run `test:brand-safety-plan`, `test:loading-plan`, `test:operator-smoke-plan`, `typecheck`, lint, and confirmed read-only runtime smoke.
- [x] Re-run full `npm run validate` after source-pack/release/PR/Obsidian control sync.
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

## D-465 Obsidian control-center alignment - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

## D-465 Obsidian control-center alignment - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Replace stale root Obsidian architecture, bot, roadmap, and decision notes with the current operating truth.
- [x] Add `test:obsidian-control` and include it in `test:safe`.
- [x] Restore `test:story-dispatch` to the baseline safe suite.
- [x] Sync agent guidance and the ChatGPT source pack with the control-center rule.
- [x] Run focused Obsidian/story/typecheck/diff checks.
- [x] Re-run full `npm run validate` after release/source-pack governance updates (0 lint errors / 70 warnings).
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

## D-464 Homepage merchandising rail wiring - 2026-07-24 - LOCAL FIX READY, focused validation passed, deployment pending

- [x] Feed server-resolved popular, best-seller, deal, and discount product IDs into the matching homepage rails.
- [x] Remove the arbitrary positional catalog slice from the Best Sellers rail.
- [x] Keep underfilled curated rails hidden instead of inventing popularity, deals, or discounts.
- [x] Add pure merchandising coverage plus a server-to-client homepage wiring guard, both in `test:safe`.
- [x] Run focused storefront, merchandising, typecheck, lint, and diff validation (0 lint errors / 70 warnings).
- [x] Re-run full `npm run validate` after release/source-pack governance updates (0 lint errors / 70 warnings).
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

## D-463 Mentix skill runtime-truth reconciliation - 2026-07-24 - LOCAL FIX READY, validated locally, deployment pending

- [x] Replace repo-skill claims that implied an active OpenClaw/VPS runtime with Hermes-current and optional-template guidance.
- [x] Keep product-flow debugging read-only, content/research drafting operator-reviewed, backend advice non-deploying, and durable memory PII-light.
- [x] Align activation configuration, dashboard, optional sync checklist, installation matrix, architecture, AGENTS/CLAUDE, and ChatGPT source pack.
- [x] Run `test:mentix-skills`, `test:openclaw-vps-verification`, and `git diff --check`.
- [x] Run source/release/PR/ops governance, typecheck, and full `npm run validate` after the documentation sync (0 lint errors / 71 warnings).
- [ ] Commit/branch/PR/deploy/live Telegram/OpenClaw/Shopier/provider/ad action only after operator approval.

## D-462 BlogPosts featured-image schema drift repair - 2026-07-24 - SCHEMA APPLIED TO CONFIGURED DATABASE, rechecked locally

- [x] Record the build-discovered `blog_posts.featured_image_id` drift without weakening sitemap fallback behavior.
- [x] Add a confirmation-gated, metadata-only schema preflight that refuses mutation flags.
- [x] Add reviewed transactional SQL limited to an existing BlogPosts-to-media relationship.
- [x] Add a dry-run-first apply helper that requires both explicit apply intent and confirmation before connecting.
- [x] Require integer relationship IDs and the exact `featured_image_id -> media.id ON DELETE SET NULL` contract; refuse conflicting existing constraints.
- [x] Sync AGENTS/CLAUDE, source pack, runtime/deployment runbooks, and local release/PR guardrails.
- [x] Run local governance, typecheck, dry-run/refusal checks, and full validation.
- [x] Run the approved pre-apply read-only database preflight: `blog_posts` and `media` exist; `media.id` is integer; `featured_image_id` and its foreign key were missing.
- [x] Refresh the local lint signal from 70 to 0 warnings without changing Telegram command behavior; Blog/PDP and legacy-shell product-media optimization, shared app-layout font loading, dead category/per-color image-engine removal, and direct Shopier-publish helper retirement are included. Full validation passed before commit/review.
- [x] Apply the separately approved additive DDL to the configured database, then rerun the read-only preflight: the column and exact `ON DELETE SET NULL` foreign key now pass.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-461 Control-truth Memory Lock reconciliation - 2026-07-24 - LOCAL FIX READY, validated locally, deployment pending

- [x] Replace stale default OpenClaw/n8n pipeline wording in both session-start Memory Lock files.
- [x] Record Payload/Next execution, Hermes-current control, optional OpenClaw/n8n, and dormant SupplierScout as current truth.
- [x] Record direct Payload/Next as the default n8n decision in the ChatGPT source pack.
- [x] Extend Memory Lock governance to reject the old pipeline/current-agent/current-workflow claims.
- [x] Sync AGENTS/CLAUDE, source pack, release/PR guardrails, project-control memory, and runbooks.
- [x] Run retired/n8n/Mentix/source/release/PR/ops checks, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-460 Product-flow dispatch recovery paths - 2026-07-24 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add deterministic `nextAction` recovery guidance to each non-published active-channel Product Flow Snapshot row.
- [x] Keep queued Shopier on `/shopier dashboard` and ready/unrecorded Shopier on the shared guarded publish path.
- [x] Show state, recorded reason, and recovery path together in `/productflow` and `/flow`.
- [x] Print the same recovery guidance in `smoke:product-flow:read`.
- [x] Add focused mixed-state coverage and runtime-smoke governance coverage.
- [x] Sync AGENTS/CLAUDE, source pack, release/PR guardrails, project-control memory, and runbooks.
- [x] Run source/release/PR/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-459 Product-flow dispatch summary - 2026-07-18 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add active-channel dispatch-summary counts to `buildProductFlowSnapshot()`.
- [x] Show published/queued/failed/blocked/not-configured/unrecorded counts in `/productflow` formatter output.
- [x] Print `dispatchSummary` in `smoke:product-flow:read`.
- [x] Add focused `test:product-flow-snapshot` coverage for mixed dispatch states.
- [x] Extend runtime-smoke governance to keep dispatch summary output visible.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-458 Product-flow checklist summary - 2026-07-18 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add checklist-summary counts to `buildProductFlowSnapshot()`.
- [x] Show done/next/blocked/needs-work counts in `/productflow` formatter output.
- [x] Print `checklistSummary` in `smoke:product-flow:read`.
- [x] Add focused `test:product-flow-snapshot` coverage for ready and incomplete products.
- [x] Extend runtime-smoke governance to keep checklist summary output visible.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run product-flow/runtime/source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-457 Loading-plan focus details - 2026-07-18 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add focus detail queue rows with product ref, safe read command, and reason list to `batchSummary.focus`.
- [x] Show focus detail lines beside the focus queue in `/loadplan` formatter output.
- [x] Print `focusDetails` in `smoke:load-plan:read`.
- [x] Add focused `test:loading-plan` coverage for reason details beside focus commands.
- [x] Extend runtime-smoke governance to keep focus detail output visible.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run loading/runtime/source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-456 Loading-plan focus queue - 2026-07-18 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add focus refs and matching safe read commands to `batchSummary.focus`.
- [x] Show focus refs and focus queue in `/loadplan` formatter output.
- [x] Print the same fields in `smoke:load-plan:read`.
- [x] Add focused `test:loading-plan` coverage for refs and queue commands.
- [x] Extend runtime-smoke governance to keep focus queue output visible.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run loading/runtime/source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-455 Loading-plan batch focus - 2026-07-18 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add `batchSummary.focus` to `buildProductLoadingPlan()` from the first product worklist.
- [x] Show deterministic focus label, reason, and next safe read in `/loadplan` formatter output.
- [x] Print the same focus fields in `smoke:load-plan:read`.
- [x] Add focused `test:loading-plan` coverage for focus kind/label/next safe read.
- [x] Extend runtime-smoke governance to keep focus output visible.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run loading/runtime/source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-454 Loading-plan batch summary - 2026-07-18 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add `batchSummary` to `buildProductLoadingPlan()` from the first product worklist.
- [x] Show candidate counts, priority counts, blocker counts, and first safe command in `/loadplan` formatter output.
- [x] Show first `/productflow` and exact repo-side product-flow smoke handoffs in the summary.
- [x] Print the same summary fields in `smoke:load-plan:read`.
- [x] Add focused `test:loading-plan` coverage for the summary and formatter output.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run loading/runtime/source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-453 Source-pack latest-boundary guardrail - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Update `test:source-pack` to require `Latest local boundary: D-453.` in next-sprint source-pack notes.
- [x] Keep the actual `/smokeplan` title boundary pinned to `Operator Live Smoke Plan (D-389/D-452)`.
- [x] Require release/PR stack wording to say D-380-D-406 plus D-422-D-453.
- [x] Reject stale current-D-449 smoke-plan wording and D-422-D-451 stack wording.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-452 Ad-readiness storefront trust hint - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add `npm run test:storefront-trust` to `/adready` `Next safe reads` for review/ready products.
- [x] Keep blocked products focused on `/productflow` and `/imageplan` diagnostics before any ad-prep path.
- [x] Update `/smokeplan` formatter title to `Operator Live Smoke Plan (D-389/D-452)`.
- [x] Add focused `test:ad-readiness` and `test:operator-smoke-plan` coverage for the new hints/title.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-451 PDP conversion trust guardrail - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Extend `scripts/storefront-trust-governance.ts` to check `src/app/(app)/products/[slug]/page.tsx`.
- [x] Keep existing homepage trust checks: no fake reviews, no placeholder testimonial copy, honest trust-section presence.
- [x] Check public PDP draft hiding through `notFound()`.
- [x] Check buyer gallery remains mounted through `ProductImages`.
- [x] Check size/stock clarity remains variant-backed through `SizeChip` and `OOSChip`.
- [x] Check `ContactForm` keeps product id/title/variants/sold-out context.
- [x] Check WhatsApp and Shopier CTAs remain present and safely gated.
- [x] Check process FAQ fallback and safe similar-products gating remain present.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run focused `npm run test:storefront-trust`.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-450 Retired-channel memory-lock guardrail - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Extend `scripts/retired-channel-governance.ts` to check `project-control/MEMORY_LOCK.md`.
- [x] Extend the same guardrail to `project-control/exports/MEMORY_LOCK.md`.
- [x] Require Memory Lock handoff files to say active channels are Website/Instagram/Facebook/X/Shopier and Dolap/Threads are retired.
- [x] Block Memory Lock wording that describes Dolap/Threads as scaffolded/planned/active/future work.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run `npm run test:retired-channels`, source/release/PR checks.
- [x] Run `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-449 Operator smoke-plan latest-boundary label - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Update `/smokeplan` formatter title to `Operator Live Smoke Plan (D-389/D-449)`.
- [x] Update focused `test:operator-smoke-plan` coverage for the D-449 title.
- [x] Keep smoke order unchanged and read-only/operator-controlled.
- [x] Sync AGENTS/CLAUDE, release/PR guardrails, project-control memory, and source-pack docs.
- [x] Run focused `npm run test:operator-smoke-plan`, source/release/PR checks.
- [x] Run `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-448 Ad-readiness next-action hints - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add safe next-read hints to `/adready` output based on blocked/review/ready readiness.
- [x] Point blocked products to `/productflow <ref>` before ad work.
- [x] Point media blockers/warnings to `/imageplan <ref>`.
- [x] Point review/ready products to read-only `/adpack <ref> manual_ads` and `/adreport week`.
- [x] Keep the hints read-only/operator-controlled: no writes, queue jobs, publish, Shopier/provider/ad calls, Pixel/CAPI, campaign/post creation, SupplierScout activation, or retired-channel activation.
- [x] Add focused `test:ad-readiness` coverage for next-read hints and absence of unsafe action commands.
- [x] Run focused `npm run test:ad-readiness` and `npm run typecheck`.
- [x] Run source/release/PR checks, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-447 Funnel snapshot next-action hints - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add safe next-read hints to `/funnel` output when source, order, or attribution counts imply follow-up.
- [x] Point open funnel lead work to `/leadplan`.
- [x] Point converted/direct order visibility to `/orders`.
- [x] Point UTM-attributed funnel evidence to `/adreport week`.
- [x] Keep the hints read-only: no writes, queue jobs, publish, Shopier/provider/ad calls, SupplierScout activation, or retired-channel activation.
- [x] Add focused `test:funnel-desk` coverage for next-read hints and absence of unsafe action commands.
- [x] Run focused `npm run test:funnel-desk` and `npm run typecheck`.
- [x] Run source/release/PR checks, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-446 Business snapshot next-action hints - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add safe next-read hints to `/business` output when urgency counts are present.
- [x] Point open/stale lead urgency to `/leadplan`.
- [x] Point stale shipped order urgency to `/orderreminders`, and open-order follow-up to `/orders`.
- [x] Point sold-out/low-stock urgency to `/inbox stock`.
- [x] Keep the hints read-only: no writes, queue jobs, publish, Shopier/provider/ad calls, SupplierScout activation, or retired-channel activation.
- [x] Add focused `test:business-desk` coverage for next-read hints and absence of unsafe action commands.
- [x] Run focused `npm run test:business-desk` and `npm run typecheck`.
- [x] Run source/release/PR checks, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-445 Order desk operator links - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add shared order-admin, product-admin, lead-admin, and public-status-only PDP links through `src/lib/orderDesk.ts`.
- [x] Apply the links to order list lines used by `/inbox orders`, `/orders`, `/orders today`, and `/orderreminders`.
- [x] Apply the links to `/order <id>` detail cards and new-order alerts.
- [x] Preserve public PDP gating: only products with a slug plus public status get public PDP links.
- [x] Add focused `test:order-desk` coverage for order/product/lead links, draft admin-only links, formatter output, and absence of unsafe action commands.
- [x] Preserve read-only order visibility: no order status write, stock restore, customer message, queue job, provider call, Shopier call, ad action, SupplierScout activation, or retired-channel activation.
- [x] Run focused `npm run test:order-desk` and `npm run typecheck`.
- [x] Run source/release/PR checks, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-444 Lead desk operator links - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add shared lead-admin, product-admin, and public-status-only PDP links through `src/lib/leadDesk.ts`.
- [x] Apply the links to lead list lines used by `/inbox leads`, `/leadreminders`, `/leads`, and `/leads today`.
- [x] Apply the links to `/lead <id>` detail cards and new-lead alerts.
- [x] Reuse the same link helper from `src/lib/leadFollowupPlan.ts` so lead follow-up and lead desk surfaces share one rule.
- [x] Add focused `test:lead-desk` coverage and include it in `test:safe`.
- [x] Preserve read-only lead visibility: no lead status write, customer message, queue job, provider call, Shopier call, ad action, SupplierScout activation, or retired-channel activation.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-443 Operator inbox product links - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add Payload admin links to product rows in `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today`.
- [x] Add public PDP links only for products with a slug plus public status.
- [x] Add focused `test:operator-inbox` coverage and include it in `test:safe`.
- [x] Preserve read-only inbox behavior: no product writes, activation, queue jobs, publish, dispatch, providers, Shopier calls, ad actions, SupplierScout activation, or retired-channel activation.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-442 Lead follow-up operator links - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add direct Payload lead-admin links to `/leadplan` and `/followupplan` rows.
- [x] Add related product-admin links when the lead is tied to a product.
- [x] Add public PDP links only for related products with a slug plus public status.
- [x] Mirror the same links in `smoke:lead-followup:read` without printing names or phones in terminal output.
- [x] Preserve read-only lead-plan behavior: no lead writes, customer messages, jobs, providers, Shopier calls, ad actions, SupplierScout activation, or retired-channel activation.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-441 Shopier preview credential holds - 2026-07-16 - LOCAL FIX READY, validated locally, deployment pending

- [x] Add preview-only `SHOPIER_PAT` credential hold hints to `/shopier publish-ready`.
- [x] Add preview-only `SHOPIER_PAT` credential hold hints to `/shopier retry-errors`.
- [x] Mirror the same hints in `smoke:shopier:read`.
- [x] Keep preview available when `SHOPIER_PAT` is missing.
- [x] Keep confirmed queue/retry output free of preview-only credential hints.
- [x] Preserve existing confirm credential gates and avoid secret printing.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-440 Shopier preview/dashboard operator links - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add deterministic `operatorLinks` to Shopier publish-control evaluations and dashboard review rows.
- [x] Show Payload admin links for products with an id.
- [x] Show public PDP links only for products with a slug and public status (`active`/sold-out).
- [x] Render the same links in `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows.
- [x] Keep confirmed queue/retry output free of preview-only link lines.
- [x] Add focused `test:shopier-publish-control` coverage for ready, draft/admin-only, preview, retry, and dashboard link behavior.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-439 Loading-plan worklist operator links - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add deterministic `operatorLinks` to `/loadplan` first product worklist rows.
- [x] Show Payload admin links for products with an id.
- [x] Show public PDP links only for products with a slug and public status (`active`/sold-out).
- [x] Print the same links in `smoke:load-plan:read`.
- [x] Add focused `test:loading-plan` coverage for draft/admin and active/PDP behavior.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-438 Product Flow Snapshot operator links - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add deterministic `operatorLinks` to `src/lib/productFlowSnapshot.ts`.
- [x] Show Payload admin links for products with an id.
- [x] Show public PDP links only for products with a slug and public status (`active`/sold-out).
- [x] Print the same links in `smoke:product-flow:read`.
- [x] Add focused `test:product-flow-snapshot` coverage for draft/admin and active/PDP behavior.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-437 Operator smoke-plan Telegram access preflight - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add `npm run test:telegram-access` to `/smokeplan` after the repo load-plan runtime smoke.
- [x] Place Telegram access governance before the first live Telegram `/loadplan` read.
- [x] Keep `/smokeplan` free of product writes, lead/order mutation, ad launch, campaign, pixel, CAPI, provider, Shopier, queue, publish, redispatch, SupplierScout, retired-channel, and ad-spend actions.
- [x] Add focused `test:operator-smoke-plan` coverage and rerun `test:telegram-access`.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-436 Operator smoke-plan sitemap preflight - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add `npm run test:sitemap-entries` to `/smokeplan` after attribution.
- [x] Place sitemap checks before `smoke:ad-readiness:read` and Telegram `/adready`.
- [x] Keep `/smokeplan` free of product writes, lead/order mutation, ad launch, campaign, pixel, CAPI, provider, Shopier, queue, publish, redispatch, SupplierScout, retired-channel, and ad-spend actions.
- [x] Add focused `test:operator-smoke-plan` coverage and rerun `test:sitemap-entries`.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-435 Operator smoke-plan attribution preflight - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add `npm run test:attribution` to `/smokeplan` after inquiry guard.
- [x] Place attribution before `smoke:ad-readiness:read` and Telegram `/adready`.
- [x] Keep `/smokeplan` free of lead writes, ad launch, campaign, pixel, CAPI, provider, Shopier, queue, publish, redispatch, SupplierScout, retired-channel, and ad-spend actions.
- [x] Add focused `test:operator-smoke-plan` coverage and rerun `test:attribution`.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-434 Operator smoke-plan inquiry guard preflight - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add `npm run test:inquiry-guard` to `/smokeplan` after storefront trust.
- [x] Place inquiry guard before `smoke:ad-readiness:read` and Telegram `/adready`.
- [x] Keep `/smokeplan` free of lead writes, ad launch, campaign, pixel, CAPI, provider, Shopier, queue, publish, redispatch, SupplierScout, retired-channel, and ad-spend actions.
- [x] Add focused `test:operator-smoke-plan` coverage and rerun `test:inquiry-guard`.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-433 Operator smoke-plan storefront trust preflight - 2026-07-16 - LOCAL FIX READY, deployment pending

- [x] Add `npm run test:storefront-trust` to `/smokeplan` after lead visibility.
- [x] Place storefront trust before `smoke:ad-readiness:read` and Telegram `/adready`.
- [x] Keep `/smokeplan` free of fake-review, ad-launch, campaign, pixel, CAPI, provider, Shopier, queue, publish, redispatch, SupplierScout, retired-channel, and ad-spend actions.
- [x] Add focused `test:operator-smoke-plan` coverage and rerun `test:storefront-trust`.
- [x] Run source/release/PR checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-432 Operator smoke-plan manual ad preflight alignment - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add read-only `smoke:ad-readiness:read` to `/smokeplan` after lead visibility.
- [x] Add Telegram `/adready <id-or-sn>` to `/smokeplan` after the repo-side ad-readiness smoke.
- [x] Add read-only `smoke:ad-performance:read` and Telegram `/adreport week` before Shopier queue preflights.
- [x] Keep `/smokeplan` free of `/adpack`, ad launch, campaign, pixel, CAPI, provider, Shopier, queue, publish, redispatch, SupplierScout, retired-channel, and ad-spend actions.
- [x] Add focused `test:operator-smoke-plan` coverage.
- [x] Run source/release/PR/runtime checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/ad action only after operator approval.

## D-431 Operator smoke-plan Shopier credential hold - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add a dedicated `/smokeplan` operator hold after Shopier row product-flow handoffs.
- [x] Tell operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets.
- [x] Keep the hold read-only and outside secret reads, queueing, publishing, dispatch, provider, Shopier API, SupplierScout, retired-channel, and ad surfaces.
- [x] Add focused `test:operator-smoke-plan` coverage.
- [x] Run source/release/PR/runtime checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-430 Operator smoke-plan Shopier handoff alignment - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add a dedicated `/smokeplan` operator hold after Shopier dashboard/publish-ready/error/retry previews.
- [x] Tell operators to use row-provided `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.
- [x] Keep the handoff read-only and outside queueing, publishing, dispatch, provider, Shopier API, SupplierScout, retired-channel, and ad surfaces.
- [x] Add focused `test:operator-smoke-plan` coverage.
- [x] Run source/release/PR/runtime checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-429 Shopier preview product-flow handoff - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add product-flow preflight handoffs to `/shopier publish-ready` preview rows.
- [x] Add product-flow preflight handoffs to `/shopier retry-errors` preview rows.
- [x] Keep confirmed queue/retry output from repeating preflight rows after queueing.
- [x] Allow `/shopier publish-ready` and `/shopier retry-errors` previews without `SHOPIER_PAT`; keep `confirm` blocked when `SHOPIER_PAT` is missing.
- [x] Add focused `test:shopier-publish-control` and `test:shopier-commands` coverage.
- [x] Run runtime/source/release/PR/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-428 Shopier dashboard product-flow handoff - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add `flowCommand` and `runtimeFlowCommand` to `ShopierDashboardReviewRow` in `src/lib/shopierPublishControl.ts`.
- [x] Show `/productflow <ref>` and exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` beside each `/shopier dashboard` batch review row.
- [x] Keep `smoke:shopier:read` aligned because it uses the same dashboard row builder and formatter.
- [x] Add focused `test:shopier-publish-control` coverage for the new commands and formatted output.
- [x] Run runtime-smoke, release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-427 Load-plan runtime product-flow handoff - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add `runtimeFlowCommand` to `src/lib/productLoadingPlan.ts` worklist rows.
- [x] Show the exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` command beside each Telegram `/productflow <ref>` handoff in `/loadplan`, `/loadingplan`, and `smoke:load-plan:read`.
- [x] Print `flow=` and `smoke=` lines in `scripts/load-plan-runtime-smoke.ts` first product worklist output.
- [x] Add focused `test:loading-plan` coverage for `runtimeFlowCommand` and formatted output.
- [x] Add runtime-smoke governance coverage for the runtime command handoff.
- [x] Sync AGENTS, CLAUDE, source-pack, release/PR manifests, and project-control docs with D-427.
- [x] Run focused `npm run test:loading-plan`, `npm run test:runtime-smokes`, and `npm run test:operator-smoke-plan`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-426 Operator smoke-plan load-plan handoff alignment - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Move `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` directly after repo/Telegram `/loadplan` in `src/lib/operatorSmokePlan.ts`.
- [x] Keep provider-health runtime smoke and Telegram `/diagnostics` after the worklist-selected product-flow preflight.
- [x] Update smoke-plan reasons so the operator uses the first `/loadplan` worklist flow command.
- [x] Add focused `test:operator-smoke-plan` coverage for the D-425 handoff order.
- [x] Sync AGENTS, CLAUDE, source-pack, release/PR manifests, and project-control docs with D-426.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-425 Load-plan product-flow handoff - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add `flowCommand` to `src/lib/productLoadingPlan.ts` worklist rows.
- [x] Show `/productflow <ref>` alongside each first product worklist suggested action in `/loadplan`, `/loadingplan`, and `smoke:load-plan:read`.
- [x] Keep the handoff read-only and operator-controlled; it suggests the Product Flow Snapshot preflight before manual fixes.
- [x] Add focused `test:loading-plan` coverage for `flowCommand` and formatted output.
- [x] Sync AGENTS, CLAUDE, source-pack, release/PR manifests, and project-control docs with D-425.
- [x] Run focused `npm run test:loading-plan`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-424 Product-flow primary operator step - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Add `primaryOperatorStep` to `src/lib/productFlowSnapshot.ts`, derived from the ordered checklist.
- [x] Show the primary step in Telegram `/productflow` and `/flow` through the shared formatter.
- [x] Print the same primary step in `smoke:product-flow:read`.
- [x] Add focused `test:product-flow-snapshot` coverage for activation, incomplete draft, content trigger/retry, Shopier handoff, and formatter output.
- [x] Sync AGENTS, CLAUDE, source-pack, Mentix skill, release/PR manifests, and project-control docs with D-424.
- [x] Run focused `npm run test:product-flow-snapshot`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-423 Product-flow checklist dependency ordering - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Make `src/lib/productFlowSnapshot.ts` checklist commands respect confirmation -> content -> audit dependencies.
- [x] Keep early drafts from suggesting `/content` or `/audit` before `/confirm`.
- [x] Keep audit from suggesting `/audit` until content is ready; point to `/content <ref> trigger` or `/content <ref> retry` as appropriate.
- [x] Add focused `test:product-flow-snapshot` coverage for incomplete drafts, pending content, failed content retry, and ready activation handoff.
- [x] Sync AGENTS, CLAUDE, source-pack, Mentix skill, release/PR manifests, and project-control docs with D-423.
- [x] Run focused `npm run test:product-flow-snapshot`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-422 Product-flow operator checklist - 2026-07-12 - LOCAL FIX READY, deployment pending

- [x] Extend `src/lib/productFlowSnapshot.ts` with a read-only operator checklist.
- [x] Include Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant.
- [x] Show the checklist in Telegram `/productflow` and `/flow` through the shared formatter.
- [x] Print the same checklist in `smoke:product-flow:read`.
- [x] Add focused `test:product-flow-snapshot` coverage for incomplete-draft command guidance and ready activation handoff.
- [x] Sync AGENTS, CLAUDE, source-pack, release/PR manifests, and project-control docs with D-422.
- [x] Run focused `npm run test:product-flow-snapshot`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## 2026-07-11 Hermes current control layer reconciliation - LOCAL DOC/GOVERNANCE READY, deployment pending

- [x] Reconcile AGENTS/CLAUDE wording so Hermes is current and OpenClaw is historical/optional unless explicitly reactivated.
- [x] Update source-pack architecture, bots, roadmap, validation, and decision files for Hermes-current truth.
- [x] Update OpenClaw checklist/matrix wording so it is optional reactivation guidance, not current mandatory infrastructure.
- [x] Update governance scripts to assert Hermes-current and standalone optional `test:openclaw-vps-verification`.
- [x] Run focused source-pack, Mentix skill, OpenClaw optional guard, release/PR, and ops governance.
- [x] Run `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider/OpenClaw action only after operator approval.

## D-406 Shopier runtime-smoke batch review alignment - 2026-07-06 - LOCAL FIX READY, deployment pending

- [x] Update `scripts/shopier-operator-smoke.ts` to import and call `buildShopierDashboardReviewRows`.
- [x] Pass `reviewRows` to `formatShopierOperatorDashboard()` so `smoke:shopier:read` mirrors Telegram `/shopier dashboard`.
- [x] Add `test:runtime-smokes` guard needles for Shopier review-row alignment.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, runtime smoke docs, deployment runbook, and project-control docs with D-406.
- [x] Run focused `npm run test:runtime-smokes`.
- [x] Run focused source-pack, release/PR, and ops governance.
- [x] Run `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/Shopier/provider action only after operator approval.

## D-405 Image-plan runtime smoke - 2026-07-06 - LOCAL FIX READY, deployment pending

- [x] Add `scripts/image-plan-runtime-smoke.ts`.
- [x] Add package script `smoke:image-plan:read`.
- [x] Require `--product=<id-or-sn>` and `--confirm-read-only`.
- [x] Force `PAYLOAD_DB_PUSH=false` before Payload loads.
- [x] Read one product plus recent `image-generation-jobs` and mirror `src/lib/imageRegenerationPlan.ts`.
- [x] Insert the repo smoke into `/smokeplan` before Telegram `/imageplan`.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, runtime smoke docs, deployment runbook, and project-control docs with D-405.
- [x] Run no-connect help path: `npm run smoke:image-plan:read -- --help`.
- [x] Run focused `npm run test:runtime-smokes`.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/image generation/provider action only after operator approval.

## D-404 Image regeneration plan - 2026-07-06 - LOCAL FIX READY, deployment pending

- [x] Add pure read-only `src/lib/imageRegenerationPlan.ts`.
- [x] Add focused `src/lib/imageRegenerationPlan.test.ts`.
- [x] Add Telegram `/imageplan <sn-or-id>` and `/regenplan <sn-or-id>` to inspect Image QC plus recent image-generation job state.
- [x] Keep `/imageplan` guidance-only: suggest `onayla`, `yeniden uret`, `#gorsel`, `/imageqc`, and `/productflow` commands without running them.
- [x] Add `/imageplan <id-or-sn>` to `/smokeplan` after `/productflow`.
- [x] Add package script `test:image-regeneration-plan` and include it in `test:safe`.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, and project-control docs with D-404.
- [x] Run focused `npm run test:image-regeneration-plan`.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live Telegram/image generation/provider action only after operator approval.

## D-403 Provider reality audit - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Add `project-control/PROVIDER_REALITY_AUDIT.md` to document that local env readiness is not production provider readiness.
- [x] Add `scripts/provider-reality-governance.ts` and package script `test:provider-reality`.
- [x] Include `test:provider-reality` in `test:safe`.
- [x] Keep the audit out of provider calls, credit spend, env value printing, queue writes, publishing, live Telegram, Shopier actions, SupplierScout activation, and retired-channel activation.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, runbook, and project-control docs with D-403.
- [x] Run focused `npm run test:provider-reality`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live provider probe only after operator approval.

## D-402 Historical soak-script quarantine - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Add `project-control/HISTORICAL_SOAK_SCRIPTS.md` to document old `scripts/d*-soak*.ts` files as historical live-data soak harnesses.
- [x] Add `scripts/soak-script-governance.ts` and package script `test:soak-scripts`.
- [x] Include `test:soak-scripts` in `test:safe`.
- [x] Keep historical soak scripts out of default package commands, `validate`, and read-only runtime smoke inventory.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, runbook, and project-control docs with D-402.
- [x] Run focused `npm run test:soak-scripts`.
- [x] Run release/PR/source-pack/ops/runtime-smoke checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live soak/live smoke only after operator approval.

## D-401 OpenClaw VPS verification guardrail - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Add `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` as the read-only verification checklist before any OpenClaw skill copy, restart, or live prompt.
- [x] Update `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` with the verification-first rule.
- [x] Update `mentix-skills/INSTALLATION_MATRIX.md` so VPS state stays `VERIFY ON VPS` unless current evidence exists.
- [x] Add `scripts/openclaw-vps-verification-governance.ts` and package script `test:openclaw-vps-verification`.
- [x] Keep `test:openclaw-vps-verification` standalone for optional OpenClaw reactivation review while Hermes is current.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, runbook, architecture note, and project-control docs with D-401.
- [x] Run focused `npm run test:openclaw-vps-verification`.
- [x] Run focused `npm run test:mentix-skills`.
- [x] Run release/PR/source-pack/ops checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/VPS sync/live smoke only after operator approval.

## D-400 Shopier dashboard batch review sample - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Add read-only Shopier dashboard review rows to `src/lib/shopierPublishControl.ts`.
- [x] Wire Telegram `/shopier dashboard` to show ready/blocked/queued/synced sample rows using the shared Shopier/Web gate.
- [x] Keep suggested actions limited to existing manual commands such as `/shopier publish-ready`, `/imageqc <sn-or-id>`, and `/productflow <sn-or-id>`.
- [x] Add focused `test:shopier-publish-control` coverage for the batch review sample.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, and project-control docs with D-400.
- [x] Run focused `npm run test:shopier-publish-control`.
- [x] Run release/PR/source-pack/ops/retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live smoke only after operator approval.

## D-399 Runtime smoke worklist alignment - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Print `plan.worklist` rows in `scripts/load-plan-runtime-smoke.ts`.
- [x] Keep runtime output read-only and limited to product ref/title/category/reasons/suggested command.
- [x] Add `test:runtime-smokes` governance coverage for the load-plan worklist output surface.
- [x] Sync runtime smoke runbook and project-control memory docs.
- [x] Run focused `npm run test:runtime-smokes`.
- [x] Run focused `npm run test:loading-plan`.
- [x] Run source-pack/ops/retired-channel checks, `typecheck`, and `git diff --check`.
- [x] Run full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live smoke only after operator approval.

## D-399 Loading-plan first product worklist - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Extend `src/lib/productLoadingPlan.ts` with a read-only first product worklist.
- [x] Show product ref, title, priority, fix reasons, and suggested manual command in `/loadplan` output.
- [x] Keep suggestions limited to existing manual/operator commands such as `/productflow <sn-or-id>`, `/imageqc <sn-or-id>`, and `/shopier errors`.
- [x] Add focused `test:loading-plan` coverage for worklist priority and formatter output.
- [x] Sync AGENTS, CLAUDE, release/PR manifests, source-pack, and project-control docs with D-399.
- [x] Run focused `npm run test:loading-plan`.
- [x] Run release/PR/source-pack/ops checks, retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live smoke only after operator approval.

## D-398 Local PR review package - 2026-07-05 - LOCAL REVIEW READY, deployment pending

- [x] Add `project-control/LOCAL_PR_REVIEW_PACKAGE.md` for the D-380-D-404 local stack.
- [x] Record proposed PR title, scope summary, reviewer focus, validation commands, 19-file source-pack count, and explicit not-run/not-done guardrails.
- [x] Add `scripts/local-pr-review-governance.ts`.
- [x] Add package script `test:local-pr-review`.
- [x] Include `test:local-pr-review` in `test:safe`.
- [x] Sync AGENTS, CLAUDE, deployment runbook, source-pack, and project-control memory docs with D-398.
- [x] Run focused `npm run test:local-pr-review`.
- [x] Run release-candidate/source-pack/ops-runbook checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/branch/PR/deploy/live smoke only after operator approval.

## D-397 Local release candidate boundary - 2026-07-05 - LOCAL HANDOFF READY, deployment pending

- [x] Add `project-control/LOCAL_RELEASE_CANDIDATE.md` as the D-380-D-404 not-committed/not-deployed handoff manifest.
- [x] Record active-channel invariants, SupplierScout dormancy, n8n optionality, Shopier checkout default, latest validation boundary, and 19-file source-pack count.
- [x] Add `scripts/local-release-candidate-governance.ts`.
- [x] Add package script `test:local-release-candidate`.
- [x] Include `test:local-release-candidate` in `test:safe`.
- [x] Sync AGENTS, CLAUDE, deployment runbook, source-pack, and project-control memory docs with D-397.
- [x] Run focused `npm run test:local-release-candidate`.
- [x] Run source-pack/ops-runbook checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/PR/deploy/live smoke only after operator approval.

## D-396 Smokeplan lead-followup alignment - 2026-07-05 - LOCAL FIX READY, deployment pending

- [x] Add `smoke:lead-followup:read` to `/smokeplan` after business/funnel visibility.
- [x] Add Telegram `/leadplan` to `/smokeplan` after the repo-side lead-followup smoke.
- [x] Keep lead follow-up visibility before Shopier webhook/publish queue preflights.
- [x] Add `test:operator-smoke-plan` coverage for the new sequence.
- [x] Sync source-pack, AGENTS, CLAUDE, and project-control docs with D-396.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Run source-pack/retired-channel checks, runtime-smoke governance, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Live Telegram `/smokeplan` check only after deploy and operator approval.
- [ ] Commit/deploy only after operator approval.

## D-395 Lead-followup runtime smoke - 2026-07-04 - LOCAL FIX READY, deployment pending

- [x] Add guarded read-only `scripts/lead-followup-runtime-smoke.ts`.
- [x] Add package script `smoke:lead-followup:read`.
- [x] Include `smoke:lead-followup:read` in `test:runtime-smokes` governance inventory.
- [x] Mirror Telegram `/leadplan` and `/followupplan` through `getLeadFollowupPlan()` against real Payload leads only after `--confirm-read-only`.
- [x] Print a PII-light terminal summary instead of customer names/phones.
- [x] Refuse mutation, customer-message, publish, queue, provider, Shopier, SupplierScout, retired-channel, ad-spend, and schema-push paths.
- [x] Sync source-pack, runtime smoke, deployment ops, AGENTS, and CLAUDE docs with D-395.
- [x] Run no-connect help check.
- [x] Run focused `npm run test:runtime-smokes`.
- [x] Run source-pack/retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Live run only with operator approval: `npm run smoke:lead-followup:read -- --confirm-read-only`.
- [ ] Commit/deploy only after operator approval.

## D-394 Lead follow-up plan - 2026-07-04 - LOCAL FIX READY, deployment pending

- [x] Add pure read-only `src/lib/leadFollowupPlan.ts`.
- [x] Add Telegram `/leadplan` and `/followupplan`.
- [x] Add package script `test:lead-followup-plan`.
- [x] Include `test:lead-followup-plan` in `test:safe`.
- [x] Keep suggested actions limited to existing manual lead commands such as `/contacted`, `/followup`, and `/lead`.
- [x] Guard against lead writes, customer messages, ads, provider calls, Shopier calls, SupplierScout activation, and retired-channel activation.
- [x] Sync source-pack docs with Phase 7/8 lead-followup truth.
- [x] Run focused `npm run test:lead-followup-plan`.
- [x] Run `npm run typecheck`.
- [x] Run source-pack/retired-channel checks, `git diff --check`, and full `npm run validate`.
- [ ] Live Telegram `/leadplan` smoke only after deploy and operator approval.
- [ ] Commit/deploy only after operator approval.

## D-393 Operator smoke-plan Shopier webhook preflight - 2026-07-04 - LOCAL FIX READY, deployment pending

- [x] Add package script `npm run test:shopier-webhook-local`.
- [x] Add local Shopier webhook preflight step to `/smokeplan` before `smoke:shopier:read`.
- [x] Update `test:operator-smoke-plan` coverage for local-preflight-before-runtime ordering.
- [x] Update ops-runbook governance for the combined local Shopier webhook script.
- [x] Sync source-pack and project-control docs with D-393.
- [x] Run focused `npm run test:shopier-webhook-local`.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Run focused `npm run test:ops-runbook`.
- [x] Run source-pack/retired-channel checks, `typecheck`, `git diff --check`, and full `npm run validate`.
- [ ] Live Shopier webhook smoke only after deploy, configured credentials/webhooks, and operator approval.
- [ ] Commit/deploy only after operator approval.

## D-392 Shopier refund-request idempotency - 2026-07-04 - LOCAL FIX READY, deployment pending

- [x] Extend `src/lib/shopierRefundLifecycle.ts` to handle Shopier `refund.requested`.
- [x] Add idempotent `Shopier refund requested: ...` order-note marker.
- [x] Recognize legacy `Iade talebi: ...` markers so older notes do not trigger duplicate stock restore.
- [x] Return `shouldRestoreStock=false` for duplicate, missing-order, or unknown-local-order refund requests.
- [x] Wire `src/app/api/webhooks/shopier/route.ts` so stock restore runs only when the lifecycle helper marks the request first-seen.
- [x] Add tests for first request, duplicate request, legacy marker, missing order id, and unknown local order.
- [x] Run focused `npm run test:shopier-refund-lifecycle`.
- [x] Run focused `npm run test:shopier-order-stock`.
- [x] Run focused `npm run test:order-desk`.
- [x] Run `npm run typecheck`.
- [x] Sync final validation result after source-pack checks, ops checks, lint, `git diff --check`, and full `npm run validate`.
- [ ] Live Shopier refund webhook smoke only after deploy, configured credentials/webhooks, and operator approval.
- [ ] Commit/deploy only after operator approval.

## D-391 Shopier refund update traceability - 2026-07-04 - LOCAL FIX READY, deployment pending

- [x] Add pure `src/lib/shopierRefundLifecycle.ts` for Shopier `refund.updated`.
- [x] Add `src/lib/shopierRefundLifecycle.test.ts`.
- [x] Add package script `test:shopier-refund-lifecycle`.
- [x] Include `test:shopier-refund-lifecycle` in `test:safe`.
- [x] Wire `src/app/api/webhooks/shopier/route.ts` to record `refund.updated` order notes and audit events.
- [x] Preserve policy: `refund.updated` is note/audit only and does not change order status or restore stock a second time.
- [x] Run focused `npm run test:shopier-refund-lifecycle`.
- [x] Run focused `npm run test:shopier-order-stock`.
- [x] Run focused `npm run test:order-desk`.
- [x] Run `npm run typecheck`.
- [x] Sync final validation result after source-pack checks, ops checks, lint, `git diff --check`, and full `npm run validate`.
- [ ] Live Shopier refund webhook smoke only after deploy, configured credentials/webhooks, and operator approval.
- [ ] Commit/deploy only after operator approval.

## D-390 Mentix/OpenClaw live-smoke alignment - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Update product-flow-debugger to point live-smoke sequencing to `/smokeplan` first.
- [x] Update mentix-intake routing for live-smoke planning requests.
- [x] Update OpenClaw deployment sync checklist to require `test:operator-smoke-plan`.
- [x] Update installation matrix so repo skills are verify-before-sync, not assumed-current on VPS.
- [x] Update skill dashboard so n8n is optional glue and `/smokeplan` is part of read-only Telegram skill testing.
- [x] Add governance assertions in `scripts/mentix-skill-governance.ts`.
- [x] Run focused `npm run test:mentix-skills`.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Sync final validation result after source-pack checks, retired-channel checks, typecheck, lint, `git diff --check`, and full `npm run validate`.
- [ ] Optional OpenClaw sync only after explicit reactivation, operator approval, and skill directory verification.
- [ ] Commit/deploy only after operator approval.

## D-389 Operator live smoke plan - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add pure read-only `src/lib/operatorSmokePlan.ts`.
- [x] Add `src/lib/operatorSmokePlan.test.ts`.
- [x] Add package script `test:operator-smoke-plan`.
- [x] Include `test:operator-smoke-plan` in `test:safe`.
- [x] Add Telegram `/smokeplan`.
- [x] Keep `/smokeplan` as a checklist only: no Payload reads/writes, no queueing, no publishing, no redispatch, no provider calls, no Shopier calls, no ads.
- [x] Run focused `npm run test:operator-smoke-plan`.
- [x] Run `npm run test:retired-channels`.
- [x] Sync final validation result after `typecheck`, `lint`, `git diff --check`, source-pack checks, and full `npm run validate`.
- [ ] Live Telegram `/smokeplan` check only with operator present after deploy.
- [ ] Commit/deploy only after operator approval.

## D-388 Load-plan runtime smoke - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add guarded read-only `scripts/load-plan-runtime-smoke.ts`.
- [x] Add package script `smoke:load-plan:read`.
- [x] Include `smoke:load-plan:read` in `test:runtime-smokes` governance inventory.
- [x] Mirror Telegram `/loadplan` through `buildProductLoadingPlan()` against real Payload products only after `--confirm-read-only`.
- [x] Force `PAYLOAD_DB_PUSH=false`.
- [x] Refuse mutation, publish, queue, provider, Shopier, SupplierScout, and ad-spend flags.
- [x] Document the command in `AGENTS.md`, `CLAUDE.md`, runtime smoke runbook, deployment runbook, and source pack.
- [x] Run focused no-connect help check, `test:runtime-smokes`, `test:ops-runbook`, `test:source-pack`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Live run only with operator approval: `npm run smoke:load-plan:read -- --confirm-read-only`.
- [ ] Commit/deploy only after operator approval.

## D-387 Product loading plan - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add read-only `src/lib/productLoadingPlan.ts`.
- [x] Add `src/lib/productLoadingPlan.test.ts`.
- [x] Add package script `test:loading-plan`.
- [x] Include `test:loading-plan` in `test:safe`.
- [x] Add Telegram `/loadplan [limit]` and `/loadingplan [limit]`.
- [x] Combine Catalog QA and Category Fill into a daily catalog loading/fix plan.
- [x] Keep guardrails explicit: own-products-only, no SupplierScout, no Dolap/Threads, no product writes, no publish, no Shopier queue, no provider calls, no ads.
- [x] Run focused `npm run test:loading-plan`.
- [x] Run `npm run typecheck`.
- [x] Run `test:source-pack`, `lint`, `git diff --check`, and full `npm run validate` after docs sync.
- [ ] Commit/deploy only after operator approval.

## D-386 Shopier command governance - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Remove unreachable direct queue/update branches from Telegram `/shopier publish` and `/shopier republish`.
- [x] Add `scripts/shopier-command-governance.ts`.
- [x] Add package script `test:shopier-commands`.
- [x] Include `test:shopier-commands` in `test:safe`.
- [x] Check that single-product Shopier publish/republish resolve products and call `queueShopierSync()`.
- [x] Check that Telegram `/shopier publish|republish` do not directly write `sourceMeta.shopierSyncStatus` or enqueue `shopier-sync` jobs.
- [x] Check that `/shopier publish-ready` and `/shopier retry-errors` continue using the shared helper behind preview/confirm flows.
- [x] Run focused `npm run test:shopier-commands`.
- [x] Run `test:shopier-publish-control`, `test:source-pack`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/deploy only after operator approval.

## D-385 runtime-smoke governance - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add `scripts/runtime-smoke-governance.ts`.
- [x] Add package script `test:runtime-smokes`.
- [x] Include `test:runtime-smokes` in `test:safe`.
- [x] Check read-only smoke package scripts, backing scripts, confirmation flags, mutation refusal, no-write wording, and Payload schema-push guards.
- [x] Check runtime smoke documentation in `AGENTS.md`, `CLAUDE.md`, `project-control/RUNTIME_SMOKE_CHECKS.md`, `project-control/DEPLOYMENT_OPS_RUNBOOK.md`, and source-pack validation docs.
- [x] Run focused `npm run test:runtime-smokes`.
- [x] Run `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/deploy only after operator approval.

## D-384 ad-performance runtime smoke - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add guarded read-only `scripts/ad-performance-runtime-smoke.ts`.
- [x] Add package script `smoke:ad-performance:read`.
- [x] Mirror Telegram `/adreport` against real Payload leads/orders only after `--confirm-read-only`.
- [x] Force `PAYLOAD_DB_PUSH=false` and refuse mutation/publish/queue/provider/Shopier/spend flags.
- [x] Document the smoke in `project-control/RUNTIME_SMOKE_CHECKS.md` and source-pack validation/ads docs.
- [x] Validate locally: no-connect usage check, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Live run only with operator approval: `npm run smoke:ad-performance:read -- --confirm-read-only`.
- [ ] Commit/deploy only after operator approval.

## D-383 manual ad performance report - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add read-only `src/lib/adPerformance.ts`.
- [x] Add Telegram `/adreport [today|week|month]`.
- [x] Summarize UTM-tagged Payload leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders.
- [x] Add `test:ad-performance` and include it in `test:safe`.
- [x] Run focused `npm run test:ad-performance`.
- [x] Validate locally: `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate`.
- [ ] Commit/deploy only after operator approval.
- [ ] Real paid ads remain operator-only; `/adreport` is Payload/UTM visibility, not ad-platform truth.

## D-382 story dispatch lint cleanup - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Remove stale unused imports from `src/lib/storyDispatch.ts`.
- [x] Clarify Story dispatch result status comment for `brand_safety_blocked`.
- [x] Verify `npm run lint` drops from 74 warnings to 70 warnings with 0 errors.
- [x] Validate locally: `test:story-dispatch`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `git diff --check`, and full `npm run validate` passed.
- [ ] Commit/deploy only after operator approval.

## D-381 story dispatch brand-safety hardening - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add brand-safety scan before StoryJob creation in `src/lib/storyDispatch.ts`.
- [x] Record blocked story attempts as `storyStatus='failed'` with `lastStoryError='brand_safety_block: ...'`.
- [x] Prevent protected-brand products from queueing a future story/social job.
- [x] Add `test:story-dispatch` and include it in `test:safe`.
- [x] Run focused `npm run test:story-dispatch`.
- [x] Validate locally: `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate` passed.
- [ ] Commit/deploy only after operator approval.

## D-380 manual ad launch-pack support - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Add pure read-only `src/lib/adLaunchPack.ts`.
- [x] Add Telegram `/adpack <sn-or-id> [campaign]`.
- [x] Generate operator-review copy drafts only when hard blockers are clear.
- [x] Generate Meta paid-social UTM links with `utm_content` copy-angle tracking.
- [x] Block protected brands and use safer fallback titles for risky-claim review products.
- [x] Add `test:ad-launch-pack` and include it in `test:safe`.
- [x] Validate locally: `test:ad-launch-pack`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate` passed.
- [ ] Commit/deploy only after operator approval.
- [ ] Real paid ads remain operator-only and deferred until D-380+ readiness.

## Phase 7 Shopier fulfilled lifecycle unification - 2026-07-03 - LOCAL FIX READY, deployment pending

- [x] Replace direct `status: 'shipped'` update in Shopier `order.fulfilled`.
- [x] Route fulfilled webhook through `applyOrderStatus(payload, orderId, 'ship', 'shopier_webhook')`.
- [x] Preserve shipment timestamping, idempotency/refusal behavior, and `order.status_changed` audit payload.
- [x] Add test coverage for the `shopier_webhook` audit source.
- [x] Validate locally: `test:order-desk`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `lint`, `git diff --check`, and full `npm run validate` passed.
- [ ] Commit/deploy only after operator approval.
- [ ] Live-smoke Shopier fulfilled webhook only after credentials/webhooks are configured and the operator approves.

## Phase 7 Shopier order/refund stock reconciliation — 2026-07-03 — LOCAL FIX READY, deployment pending

- [x] Extract Shopier order/refund stock mutation into `src/lib/shopierOrderStock.ts`.
- [x] Wire `src/app/api/webhooks/shopier/route.ts` to use the shared helper for `order.created` and `refund.requested`.
- [x] Make stock mutation variant-aware: use matching normalized size variant when variants exist, otherwise product-level stock.
- [x] Sync product-level `stockQuantity` to variant total after variant mutation.
- [x] Return/log skipped reasons for unmatched Shopier product IDs or sizes instead of silently drifting stock.
- [x] Add `test:shopier-order-stock` and include it in `test:safe`.
- [x] Validate locally: `test:shopier-order-stock`, `typecheck`, `lint` passed.
- [x] Run full `npm run validate` after docs sync.
- [ ] Commit/deploy only after operator approval.
- [ ] Live-smoke Shopier webhooks only after `SHOPIER_PAT`/webhook token/provider requirements are configured and the operator approves.

## Phase 7 operator order lifecycle policy — 2026-07-03 — LOCAL FIX READY, deployment pending

- [x] Add `src/lib/orderDesk.test.ts`.
- [x] Add `test:order-desk` and include it in `test:safe`.
- [x] Cover `/ship` timeline stamping.
- [x] Cover `/deliver` `deliveredAt` stamping and `shippedAt` backfill.
- [x] Cover delivered-order cancellation refusal.
- [x] Cover idempotent and missing-order no-write behavior.
- [x] Cover manual `/cancelorder` no-auto-restock policy and `/restock` operator hint.
- [x] Validate locally: `test:order-desk`, `test:source-pack`, `test:ops-runbook`, `typecheck`, `git diff --check`, and full `npm run validate` passed.
- [ ] Commit/deploy only after operator approval.

## Pre-traffic hardening — 2026-07-02 — LOCAL FIX READY, deployment pending

- [x] Telegram DM operator allowlist (mirror group semantics; polite refusal; empty-allowlist loud warning) + `TELEGRAM_WEBHOOK_SECRET` unset warning — `src/lib/telegramAccess.ts` + surgical `route.ts` diff.
- [x] Lead-form abuse protection: honeypot + per-IP/per-phone rate limit + 10-min phone+product duplicate collapse (fail-open, no schema change) — `src/lib/inquiryGuard.ts`, `/api/inquiries`, ContactForm.
- [x] Sitemap: `force-dynamic` → `revalidate=3600` (route wasn't registering in prod build under Next 16 canary); per-collection fail-safety; pure builder `src/lib/sitemapEntries.ts`.
- [x] `/yardim` "NASIL ÇALIŞIR?" grid → 2×2 at ≤768px.
- [x] 34 new assertions in 5 suites wired into `test:safe`; `npm run validate` GREEN.
- [ ] Push/deploy after operator confirmation; then verify prod `/sitemap.xml` returns 200 XML and a non-allowlisted DM gets the refusal.
- [ ] OPERATOR-ONLY (unchanged): verify `TELEGRAM_WEBHOOK_SECRET` / `SHOPIER_WEBHOOK_TOKEN` / `CRON_SECRET` set in Vercel.

## Brand-risk cleanup — 2026-07-02 (Prompt 4A/4B) — 2 resolved, 2 blocked on operator auth
- [x] Shopier listing `48281164` — RESOLVED (live public not-found today).
- [x] X `#NewBalance` post — RESOLVED per D-341 deleted-posts list (optional operator eyeball).
- [ ] **Facebook — OPERATOR (Page admin):** delete 7 live New Balance posts (Çok Renkli ×2, 530 ×2, 9060, 1906R, 990) + the Asics Bej Sneaker post on page `61576525131424`; sweep Adidas/Nike/Jordan/Skechers/Converse/Loro Piana too. Claude session was a personal profile (Save/Report only, no Delete) + renderer unstable → not executed.
- [ ] **Loro Piana `TG-1779223963653` de-brand — OPERATOR:** log into Payload admin, apply prepared values (title `Bej Süet Loafer`, clear brand, meta/OG/description/article/FAQ/keywords per 4A report) or draft the record; Claude cannot enter admin credentials.
- [x] Facebook direct publishing is covered by the shared D-336B `channelDispatch` brand-safety guard: protected-brand products clear the entire external eligible set before any Instagram, Facebook, X, or Shopier path is reached. Covered by `test:channel-dispatch`. Legacy Facebook posts above remain an operator cleanup task.

## Manual publish override — 2026-07-02 — LOCAL FIX READY, deployment pending

- [x] Root-cause product #410 publish failure: manual **Yayına Al** was blocked by Image QC PASS + brand/audit readiness despite operator approval.
- [x] Add regression tests proving manual approval activates when only `visuals`/`audit` fail, but does not bypass price/stock/media/target blockers.
- [x] Implement local fix in `publishDesk.ts`, `productActivationGuard.ts`, and `Products.ts` using `context.manualPublishOverride=true`.
- [x] Validate locally: `test:publish-desk`, `test:activation-guard`, `test:publish-readiness`, `test:image-quality`, `typecheck`, targeted ESLint.
- [ ] Commit and deploy after operator confirmation; production UygunOps is unchanged until then.

## Product copy fix — 2026-06-21 — D-338A #354 leather claim softened COMPLETE (data, ad-safe)

- [x] D-338A: Admin API PATCH `/api/products/354` content-only (status/title/slug/price/stock/images unchanged).
- [x] D-338A: no external dispatch (no status transition; forceRedispatch not set) — verified status stayed `active`.
- [x] D-338A: removed all "Gerçek/Hakiki deri", "deri malzeme(si)/materyali", "deriye zarar", "Deri yüzeyi", "deri bakım kremi", `#DeriAyakkabı` across commercePack + discoveryPack (articleBody/metaTitle/metaDescription/faq[0]+faq[2]).
- [x] D-338A: replaced with "deri görünümlü yüzey / yüzey / ayakkabı bakım kremi / Klasik Siyah Tokalı / Klasik Tokalı Ayakkabı Modelleri / Yüzey Kalitesi / #KlasikLoafer".
- [x] D-338A: preserved SEO `keywordEntities` + category nav links (search-intent terms, not claims).
- [x] D-338A: verified — PDP 200, softened copy live, CTA/sizes/price/lead form/Ürün Rehberi intact, 0 leather claims in prose, active set still [353,354,355,359].
- [x] D-338A: #354 ad-safe on material wording. Docs commit `docs: record D-338A product 354 claim softening`.

## Readiness — 2026-06-21 — D-338 first ad-test relaunch readiness check COMPLETE (read-only, GREEN)

- [x] D-338: canonical folder + `main` in sync + single worktree (`418e239`).
- [x] D-338: 359/355/354/353 — public PDP 200, brand-safe, price + sizes + stock + WhatsApp CTA + lead form + ÜRÜN REHBERİ + single FAQ, no fake reviews.
- [x] D-338: #362 still `draft`, PDP 404, homepage 0× brand/`ai-362`.
- [x] D-338: UTM landing URLs resolve (359 verified 200 w/ query string); D-326 params correct.
- [x] D-338: UTM persistence wired — client `captureFirstTouch()` (D-315) + `/api/inquiries` stores utmSource/Medium/Campaign + product (D-320).
- [x] D-338: lead form renders on all 4; code path intact (did NOT submit a new live test lead — already verified D-320/D-322).
- [ ] D-338 ADVISORY (operator): product **354** copy claims "Gerçek/Hakiki deri" — confirm substantiable or soften to "deri görünümlü" before advertising that SKU.
- [ ] D-338 (operator manual, carried from D-337): external cleanup — Shopier `48281164`, X `#NewBalance`, FB post.
- [x] D-338: verdict GREEN, no blocker — ad test may start (creatives on 359/355/354, 353 backup, none deep-link #362). Docs commit `docs: record D-338 first ad relaunch readiness`.

## Closure — 2026-06-21 — D-337 GEO + brand-safety closure audit COMPLETE (read-only, GREEN)

- [x] D-337: canonical folder + `main` in sync + single worktree confirmed.
- [x] D-337: commits present — D-335A `1c2476d`/`c0714fa`, D-336A+B `204c897`, D-334A `51ef749`, verify `907e5cb`.
- [x] D-337: active set = `[353,354,355,359]` (4 clean loafers); homepage 0× brand/`ai-362`.
- [x] D-337: #362 `draft` + public PDP HTTP 404 (cosmetic `<title>` brand string only).
- [x] D-337: visible GEO on PDP 359 + 355 — `ÜRÜN REHBERİ` SSR, clean headings, single FAQ, ARAMA NOTLARI chips.
- [x] D-337: brand guard verified — scanner + Layer 1 + Layer 2 wired; 9/9 tests pass; no Layer 3 (deferred).
- [x] D-337: reverse-search report 47 — `similar_style`, conf 70, referenceProducts 4, imageUri error gone, `visibleBrand:null`.
- [ ] D-337 (operator manual, NOT Claude): external cleanup — Shopier `48281164`, X `#NewBalance` tweet, Facebook post.
- [x] D-337: verdict GREEN — first ad test may resume (keep creatives off #362). Docs commit `docs: record D-337 geo brand-safety closure audit`.

## Recent — 2026-06-14 — D-302 → D-320 COMPLETED & deployed

- D-302..D-318: image normalization, Phase 1 conversion, editorial/tiles/social-proof/footer, demo-reviews-off, ad-readiness cleanup, UTM attribution, internal `trackEvent`, PDP claim cleanup — all merged to `main` + deployed.
- **D-320 COMPLETED:** product-linked inquiry HTTP 500 fixed (`productId` coercion in `/api/inquiries`); deployed `9a8001b`; live re-test passed.
- **D-322 DONE (2026-06-14):** D-320 verified end-to-end (product FK + UTM persisted); D319/D320 test leads (id 10/11) marked `status=spam`.
- **D-323 pre-ad audit (2026-06-14): READY WITH WARNINGS** — lead flow/attribution/WhatsApp/no-pixels/no-demo verified live. Flag: placeholder product "Taslak Ürün 16/06-4184" publicly visible (operator should rename/unpublish before ads).
- **D-324 DONE (2026-06-18):** placeholder product `Taslak Ürün 16/06-4184` (id 361) unpublished via Admin (`status active → draft`) — the only active placeholder of 17 `Taslak Ürün …` rows; 6 real products stayed active. Homepage re-verified clean. No rename/delete/code change. Catalog now clean for ad traffic.
- **D-336A+B DONE (2026-06-19):** brand-safety guard IMPLEMENTED (code, validated). NEW `src/lib/brandSafety.ts` + Layer 1 (`mentixAudit.ts`: brand → needs_revision → not activated) + Layer 2 (`channelDispatch.ts`: brand → skip all external channels). tsconfig excludes test. 9/9 assertions pass; esbuild OK; clean [353,354,355,359] still pass, 362-like blocked. No schema change. Limitation: admin force-activate bypasses Layer 1 (storefront) but Layer 2 still blocks external publish → optional Layer 3 (D-336C) for all-paths hard gate. Commit `feat: add brand-safety guard for audit and channel dispatch`.
- **D-336 PLAN (2026-06-19):** brand-name guard design (no code). Insertion = Mentix audit (`mentixAudit.ts`) — the gate #362 passed unguarded. Plan: NEW `src/lib/brandSafety.ts` (BLOCKED_BRANDS + RISKY_CLAIM_TERMS + scan w/ co-occurrence risk + collectProductTexts) → Layer 1 audit check (blocked brand → needs_revision → not activated, via existing Telegram approve/revise UX); Layer 2 channelDispatch pre-dispatch block; Layer 3 optional Products.ts beforeChange. False-positive-aware (brands hard, claims warn unless co-occur). No schema change. NEXT = D-336A (brandSafety.ts + audit Layer 1) — operator approval to implement. Detail: DECISIONS D-336.
- **D-335A DONE (2026-06-19):** added visible "Ürün Rehberi" discovery section to PDP (`products/[slug]/page.tsx`) — renders existing `discoveryPack.articleTitle`+`articleBody`+`keywordEntities` ("Arama Notları" chips), SSR, between product section and Benzer Modeller; gated on article presence; FAQ untouched; Turkish labels, no GEO/AI wording, existing content only. esbuild TSX OK; live verify post-deploy. Commit `feat: surface discovery content on product pages`.
- **D-335C DONE (2026-06-19):** #362 contained — set `active→draft` via Admin (operator-approved; only status; reversible). Verified: PDP 404, homepage + /ayakkabilar 0× New Balance/ai-362, active set=[353,354,355,359]. Website exposure contained. STILL NEEDED (operator, external): remove Shopier (shopier.com/48281164), X tweet (#NewBalance), FB post. No rewrite yet. NEXT options: D-335D rename/rewrite generic (if keeping product); D-336 brand-name guard in pipeline.
- **D-335B AUDIT (2026-06-19):** #362 brand-safety = HIGH→CRITICAL. "New Balance Sneaker Çok Renkli" active + published to website/shopier/x/facebook; brand-as-identity + 'N' logo + "9060" model + authenticity claim "özgünlüğünü vurgular" + X "#NewBalance". Recommend A) hide #362 to draft NOW (operator approval → D-335C), B) rename/rewrite generic, E) operator legal call. External cleanup needed: Shopier (shopier.com/48281164), X tweet, FB post (IG off). RECURRENCE: no brand-name guard → future task D-336 (intake/publish brand blocklist). NEXT = await operator OK to hide #362.
- **D-335 AUDIT (2026-06-19):** product #362 ("New Balance Sneaker Çok Renkli") GEO visibility. Live PDP CONFIRMS GEO content generated+applied+VISIBLE (description, highlights, FAQ, 14 keywords, SEO meta). GEO stored on `product.content.commercePack`+`discoveryPack`. PDP does NOT render `discoveryPack.articleBody` or PI geoPack (AI-summary/comparison). Operator's "no GEO" = visibility/expectation gap. FIX: D-335A add visible PDP GEO section (article/AI-summary, code+approval) + runbook note. SECONDARY: #362 brand-named (New Balance) + authenticity claims → brand-safety review (D-328). PI report row not checked (admin 403). Detail: DECISIONS D-335.
- **D-334A VERIFIED (2026-06-19/21): OUTCOME A.** Operator authorized Claude to press "Yeniden Üret" (not pi:sendgeo) → new report id 47: `similar_style`/conf 70, **referenceProducts 4** (was 0), imageUri error GONE (rawProviderData gemini/search/textSearch). 4 similar loafers from instagram.com. Google Vision reverse-image fix CONFIRMED working. Optional next (D-337): expand reverse-search depth/providers, or accept current as sufficient. @Uygunops_bot DM shows no new `#geohazirla 359` today → trigger didn't reach the right bot (D-333 pattern). Outcome E (not yet verifiable). ACTION (operator): send `#geohazirla 359` in the "Uygunops · bot" chat OR tap "Yeniden Üret" on report 45 → then Claude reads the new report (expect imageUri error gone; if 0 matches w/o error → outcome B "provider returning empty").
- **D-334A DONE (2026-06-19):** fixed Google Vision reverse-search input — `providers/googleVision.ts` now fetches image bytes server-side + sends `image.content` base64 (was `image.source.imageUri`, which Google couldn't fetch). Guardrails: 15s timeout, content-type/size(6MB)/non-empty checks, fail-soft, no secret logging. esbuild OK; free tier; no env/schema change. NEXT (operator): send `#geohazirla 359` to @Uygunops_bot → read new report → confirm imageUri error gone + referenceProducts improve (if 0 matches w/o error → "provider returning empty"). Commit `fix: send google vision image content for reverse search`.
- **D-334 AUDIT (2026-06-19):** reverse-search quality root cause found. Google Vision provider passes `image.source.imageUri` (uygunayakkabi.com media URL); Google can't fetch it → "We're not allowed to access the URL on your behalf" → referenceProducts=0. NOT env-missing (prod HAS GOOGLE_VISION_API_KEY), NOT provider-unsupported → image input/query issue (code). FIX = keep Google Vision + patch `googleVision.ts` to send base64 `image.content` not `imageUri` (~10 lines, free tier, no paid credits). NEXT = D-334A code patch (operator approval) → re-run `#geohazirla 359` to verify. Detail: DECISIONS D-334.
- **D-333C RESOLVED (2026-06-19):** manual `#geohazirla` CONFIRMED WORKING. Claude (operator-authorized, via operator Telegram Web) sent `#geohazirla 359` to verified @Uygunops_bot DM (id 8702872700) → bot acknowledged + posted full report ready (~40s). No sendgeo/approve pressed. Root cause of earlier failures = command wasn't reaching the @Uygunops_bot DM (wrong bot/chat); webhook+code always healthy. Reverse-image search still fails in prod (google_vision URL-access gap) → optional NEXT: enable reverse-search provider creds in Vercel. Manual trigger FUNCTIONAL.
- **D-333B CAUSE-ISOLATED (2026-06-19):** confirmed DM `#geohazirla 359` to @Uygunops_bot STILL no report/event (newest 2026-06-16). DM has no drop-gate + success would create a draft row + reply → update never reached `/api/telegram`. Webhook healthy + code correct → cause = Telegram CLIENT/CHAT delivery (bot not /start-ed for this user / wrong bot / delivery anomaly). NEXT (operator, no webhook change): DM `/pipeline` or `/start` to @Uygunops_bot → reply = PI-path-specific (then D-334 code); no reply = bot unreachable for this user (start it, verify @Uygunops_bot). Auto-bridge fine.
- **D-333A WEBHOOK-HEALTHY (2026-06-19):** diagnosed Uygunops webhook via getMe/getWebhookInfo. getMe=@Uygunops_bot; url=`https://www.uygunayakkabi.com/api/telegram` (correct); pending=0; secret OK (no 401); only stale "Read timeout" error from 2026-06-16 (June-16 content-gen). setWebhook=idempotent "already set". Webhook NOT the cause → today's command likely never reached @Uygunops_bot. Architecture note: slow handler → read-timeout risk (future D-334 = fast-ack + background PI). NEXT = operator DMs `#geohazirla 359` to @Uygunops_bot + reports reply → Claude verifies.
- **D-333T VERIFIED-BROKEN (2026-06-19):** operator DM'd `#geohazirla 359` to @Uygunops_bot → STILL no report/event (anyEventToday=false; newest 2026-06-16). Wrong-bot RULED OUT. Cause = Uygunops webhook delivery/config (url/secret/delivery). No code defect. NEXT = operator runs getWebhookInfo (read-only) on Uygunops bot → check url/pending_update_count/last_error → then D-333A re-register webhook (config, approval). Also useful: did @Uygunops_bot reply anything? (no reply→delivery; "starting" reply→createReport runtime fail).
- **D-333 AUDIT DONE (2026-06-19):** manual `#geohazirla` wiring audit (read-only). `#geohazirla` is Uygunops-owned; GeoBot redirects it. `#geohazirla 359` is a valid format. Live cfg `groupEnabled=true`/allowlist empty(open) → not blocking. Root cause narrowed to (a) wrong bot or (b) Uygunops webhook not delivering in prod. No code fix needed; smallest step = operator re-send `#geohazirla 359` as DM to @Uygunops_bot, report reply. If silent → D-333A = re-register Uygunops webhook (config, with approval). (Detail: DECISIONS D-333, BUGS.)
- **D-332R DONE (2026-06-19):** reviewed PI report id 43 for product 359 (ready, geo_auto, 2026-06-09 — only report). Vision + SEO + GEO output STRONG (SEO already live on PDP, claim-safety enforced); reverse-image evidence ABSENT (0 refs, only Gemini ran — provider gap). Usable for SEO/GEO + GeoBot-safe; weak on external evidence. SECONDARY: manual `#geohazirla 359` produced nothing today (all reports geo_auto; bot last active 2026-06-16) → manual trigger non-functional in prod (BUGS). NEXT = D-333: investigate (a) why manual #geohazirla doesn't fire (GEO bot/webhook wiring) and/or (b) enable reverse-search provider creds (Vision/DataForSEO) in Vercel for stronger evidence.
- **D-332 PENDING-OPERATOR (2026-06-19):** controlled PI dry-run for product 359. Read-only prep done (env presence, trigger-path map). VERIFIED: no HTTP trigger — `createProductIntelligenceReport` only callable via Telegram `#geohazirla`. Claude cannot send the Telegram command (no send capability; webhook spoof + ad-hoc prod harness both rejected as unsafe). Chrome admin window down this turn. ACTION NEEDED: operator sends `#geohazirla 359` in GEO/PI bot (do NOT press send-to-GeoBot) + ensure Chrome reconnected → Claude reviews report read-only. (Detail: DECISIONS D-332.)
- **D-331A DONE (2026-06-18):** reverted 2 pre-existing source-drift files on main (`importMap.js` generated drift + `UygunApp.jsx` which had cosmetic count-up polish BUT ALSO fake-reviews activation reversing locked D-313 + PreFooterCTA removal). Reverted via `git checkout -- .` (operator said "don't know" → safest). Tree clean, main==origin/main. Full diff in D-331A chat; count-up polish re-addable as its own task. D-332 unblocked.
- **D-331 AUDIT (2026-06-18):** GEO/Product Intelligence re-entry (read-only). Subsystem fully present (`src/lib/productIntelligence/*`, `contentPack.ts` resolvePiResearch auto-bridge, collection `product-intelligence-reports`). Triggers `#geohazirla|#seoara|#productintel|#urunzeka`. PI report = internal (no external publish until operator `pi:sendgeo`). DataForSEO runtime UNKNOWN (env-gated; historical 403). Controlled single-product PI run feasible (not read-only → needs approval). NEXT = D-332: operator-approved controlled PI dry-run for product 359, STOP before sendgeo, review SEO/GEO pack quality + check provider env availability. (Detail: DECISIONS D-331.)
- **D-329 GO-WITH-WARNING (2026-06-18):** launch-day checklist passed. 4 ad products active+stocked, PDPs HTTP 200 w/ images/sizes/WhatsApp/lead-form/Shopier, 0 brand text, 358/349 draft & absent from rails, D-326 UTM URLs resolve + UTM persists through www redirect. Operational warnings only (WhatsApp staffing, thin stock, no pixel, price-in-creative call). CLEARED to launch small UTM-only test. NEXT = operator launches ads; then D-330 = read results after ~5–7 days.
- **D-328 DONE (2026-06-18):** operator-approved brand-risk cleanup — products 358 (Louis Vuitton Loafer Bej) + 349 (BOSS Süet Loafer) set to `status: draft` (active→draft, reversible, no rename/delete/code change). Verified: homepage + 3 ad PDPs show 0× brand names; active set = `[353,354,355,359]`. D-327 trademark leak RESOLVED. Storefront brand-name-free for ads.
- **D-327 AUDIT (2026-06-18):** pre-launch readiness + lead-response runbook (`campaigns/D-327-pre-launch-runbook.md`). Stock verified (359/355/354=10 units, 353=4); 3 ad PDPs functionally ready. SHOULD-FIX: brand-named `Louis Vuitton Loafer Bej` (358) leaks into "Benzer Modeller" rail on all 3 ad PDPs → recommend hide/rename 358 (+349) before ads (operator approval). Verdict: READY for small UTM-only test, conditional. NEXT candidate = D-328 (operator-approved hide/rename of 358+349).
- **D-326 ASSET (2026-06-18):** first ad copy + UTM URL pack (`campaigns/D-326-first-ad-copy-pack.md`) — copy/headlines/descriptions/CTAs/UTM URLs/creative ranking, brand-named products excluded. Commit 4ba482b.
- **D-325 PLAN (2026-06-18):** first paid-ad campaign landing plan (planning + light live audit, no site change). Verdict READY for small UTM-only test. Ad-safe products = generic loafers (359/355/354/353); EXCLUDE brand-named 358 (Louis Vuitton) + 349 (BOSS) from ads. Land on PDP, WhatsApp-primary CTA, lead form = trackable signal, UTM-only now, D-316B pixel after first validation. Full plan in DECISIONS.md.
- **NEXT / pending:** execute first ad build (outside repo, operator); D-316B external pixels + KVKK consent (BEFORE scaling); grow catalog beyond ~6 loafers + raise stock depth; Products hard-delete-500 still uninvestigated; optional operator hard-delete of test-lead ids 10/11.

---

## 🔒 LOCK CHECKPOINT — 2026-04-28 — Production Baseline

This is a **stabilization checkpoint**. Do not reopen D-227 → D-231 implementation. Future work in the PI / wizard / GeoBot space must come in as a new D-23x or D-24x decision and must not modify the locked behaviour without explicit operator authorization.

### LOCKED — production-validated, treated as authoritative

- D-227 — PI observability (`pi.auto_trigger_failed`), `detectedVisualNotes` in prompt, mandatory prompt rules ("ÜRÜN KİMLİĞİ — ZORUNLU KULLANIM").
- D-227 Neon DDL — `ALTER TYPE enum_product_intelligence_reports_trigger_source ADD VALUE 'geo_auto'`.
- D-228 — applyConfirmation idempotency / duplicate-confirm race protection.
- D-229 — wider vision evidence (soleType, closureType, brandTechnologies[], distinctiveFeatures[], colorAccents[], constructionNotes), deeper SEO/GEO pack (brandTechnologyExplainer, careAndMaintenance, sizingGuidance, styleGuide, technicalSpecs[], useCaseExplainer, alternativeSearchQueries[]), 1200–2000 word discovery article with 8 mandatory sections, DataForSEO text-search fallback.
- D-230 — wizard vision autofill for category + productType + brand+model+color (one Gemini call at wizard init; HIGH ≥70% silently fills, LOW-MED 40–69% renders hint, <40% prompts as before; `tamam` shortcut accepts brand suggestion; wz_edit re-runs autofill).
- D-230 follow-up fixes: category/productType gate aligned with wizard flow; wz_edit re-runs autofill correctly; diagnostic surface for silent failures; image wrapper / `no_image` bug fixed (`products.images` is `{ image: <media> }` wrapper, not flat media doc).
- D-231 — commerce `maxOutputTokens` 4096 → 8192; commerce + discovery now run in parallel via `Promise.allSettled` (wall time ~50–60 s vs ~100 s sequential).
- Operator confirmation 2026-04-28: "it's working perfectly now."

### DEFERRED / OPTIONAL — not blocking the lock

- **DataForSEO Organic SERP 403** (D-229 text-search fallback). The DataForSEO account has Google Lens enabled but not Organic SERP. Wider vision + deeper pack already produce rich output without competitor snippets. **Action:** later, optionally enable Organic SERP in the DataForSEO dashboard. Not blocking the lock.
- **Discovery `metaDescription` occasionally exceeds 160-char cap** — warning only, not a hard failure. **Action:** later, tighten the prompt rule. Not blocking.
- **Task #10 — product 288 forceRedispatch hook no-op.** Pre-existing Shopier dispatch issue. Not in PI/wizard scope. **Action:** investigate in a separate sprint. Lower priority.
- **Task #15 — duplicate wizard-apply variants on product 297.** Likely covered by D-228 idempotency, but never explicitly verified on 297. **Action:** spot-check next time the operator runs that product, or write a one-off DB diagnostic. Not blocking.
- **Task #29 — D-223 #geohazirla 298 validation.** Pre-D-227 task; the pipeline that this would have validated has since been replaced by D-225 + D-227's auto-bridge. **Action:** mark as superseded by the D-227 product 304 validation. Not blocking.
- **Task #9 — D-208b churn root cause for variant-less Shopier UPDATE.** Pre-existing Shopier issue documented in D-216. Not in PI/wizard scope. **Action:** keep on backlog. Not blocking.

### Future-work guardrails

- New scope = new D-number. Do not extend D-227, D-228, D-229, D-230, D-231 sections retroactively.
- Schema or enum changes still require manual Neon DDL + post-deploy verification (Blocker 0 still applies).
- Token-budget changes require consulting `feedback_gemini_token_budget.md` first.
- Wizard image-shape changes must respect the `{ image: <media> }` wrapper rule (D-230 follow-up #4).

---

## ⚠️ Active Blockers

### Blocker Z-1: Phase Z Full Golden-Path Stage 1→14 — RESOLVED (2026-04-21)
~~No real product has been pushed through the full 14-stage operator flow since 2026-04-05.~~ RESOLVED by Phase 1 one-product full-pipeline validation on product 294 (D-212, 2026-04-21). Full Telegram intake → image gen → visual approval → wizard → confirmation → GeoBot handoff → content generation → audit → activation → website/IG carousel/FB multi-photo/X-with-image dispatch all verified green. Final remaining gap (X image rendering) closed by D-211 (`media_category=tweet_image` form-data part added to `uploadImageToX()`). Re-dispatch retest on product 294: `x.mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`. See PROJECT_STATE.md and DECISIONS.md D-211/D-212.

### Blocker 0: push:true Does NOT Run in Production — ONGOING RISK
`push: true` is guarded by `NODE_ENV !== 'production'` in `@payloadcms/db-postgres/dist/connect.js`.
**All schema changes on Neon MUST be applied manually via SQL.**
Before adding any new collection/global: manually verify the new table + `payload_locked_documents_rels` column exist in Neon after deploy.

### Blocker 1: Workspace Folder Out of Sync with Remote — ACTIVE
The workspace folder (`/mnt/uygunayakkabi-store`) is on a diverged history from remote main.
Remote is at `8089dde` (Step 27 + fixes). Workspace is at `beb681a` (pre-Step 25).
The workspace CANNOT be updated with a simple `git pull` — histories have diverged.
**Fix (requires explicit operator authorization):** `git fetch origin && git reset --hard origin/main`
This will discard local uncommitted changes and diverged local commits — IRREVERSIBLE.
Do NOT execute without operator confirmation.

### Blocker 2: No AI Image Gen Job Proven End-to-End — RESOLVED
~~No AI image generation job proven in production.~~ RESOLVED by VF-6 validation (2026-04-05). Product #180 / Job #147: Gemini image gen → preview → approval → generative gallery attached (6 images). visualStatus transitions verified: pending→approved. Full pipeline proven end-to-end.

---

## 🟢 NOW — Current Sprint (PHASE 2 — TELEGRAM SN / OPERATOR CONTROLS — 2026-04-21)

### 🆕 D-220 — Product Intelligence Bot + GeoBot Handoff MVP IMPLEMENTED LOCAL (2026-04-21)
New photo-first content workflow — no existing pipeline touched. Triggered by Turkish hashtags `#geohazirla`, `#seoara`, `#productintel`, `#urunzeka` (reply-to-product or explicit `\d+`). Pipeline:

1. **Images** (`collectImages.ts`) — originals first (`product.images[]`), then generated (`product.generativeGallery[]`), then fallback `media` scan. Caps supporting at 6. Writes `conflicts` note if originals + 2+ generated coexist.
2. **Vision** (`analyzeProduct.ts`) — Gemini 2.5 Flash with `inlineData` base64 parts (up to 3 images). Detects productType, color, material, style, gender, useCases, visibleBrand, visualNotes.
3. **Reverse search** (`reverseImageSearch.ts`) — SerpAPI Google Lens. Ordering-based similarity capped at 85 so provider alone can never claim exact. Primary-image first, falls back to supporting[0] with a 10-point downgrade. Missing `SERPAPI_API_KEY` → `available: false` → matchType `visual_only_no_external_search` (not an error).
4. **Classification** (`decideMatchType` in `createProductIntelligenceReport.ts`) — `exact_match` requires BOTH provider `exact_match` AND vision-detected `visibleBrand`. Otherwise downgrades to `high_similarity`/`similar_style`/`low_confidence`.
5. **SEO + GEO pack** (`generateSeoGeoPack.ts`) — Gemini 2.5 Flash text, temperature 0.6, strict "do NOT copy reference-product sentences" rule in prompt. Produces `{seoPack: {seoTitle, metaDescription, productDescription, shortDescription, tags[], keywords[], faq[]}, geoPack: {aiSearchSummary, buyerIntentKeywords[], comparisonAngles[], productComparisonText, blogDraftIdea, publishNotes}, riskWarnings[]}`.
6. **Persistence** (`product-intelligence-reports` collection) — every attempt is a row (`status: draft → ready | failed`), so even crashes are traceable. JSON-typed columns for heavy structured fields to sidestep Neon `push:true` drift.
7. **Telegram** (`telegramReport.ts`) — Turkish HTML summary with 2×2 inline keyboard: `[✅ SEO Paketini Onayla | 📤 GeoBot'a Gönder] / [🔄 Yeniden Üret | 🚫 Reddet]`. Callbacks: `pi:approve:{id}`, `pi:sendgeo:{id}`, `pi:regen:{id}`, `pi:reject:{id}`.
8. **Handoff** (`geoBotHandoff.ts`) — on operator approval, preserve-existing merge into `product.content.{commercePack, discoveryPack}`: seoPack.productDescription → websiteDescription, seoPack.shortDescription → shopierCopy, seoPack.seoTitle → metaTitle, seoPack.metaDescription → metaDescription, seoPack.faq → faq, seoPack.keywords → keywordEntities, geoPack.blogDraftIdea → articleTitle. Sets `content.contentGenerationSource = 'product_intelligence'` if empty. Emits `bot-events` row `eventType='pi.sent_to_geo'`. GeoBot/channelDispatch publish as today — no new publishing path.

**Why it's safe to land:**
- Fully additive — no existing lib modified behaviorally.
- Four surgical splices in `route.ts`: `OPS_CB_PREFIXES += 'pi:'`, `isHashtagTrigger` regex adds four aliases, `OPS_HASHTAGS` adds four aliases, + new hashtag handler + new callback handler. No branch rewrite.
- `tsc --noEmit` clean: zero new errors, 4 pre-existing errors unchanged.
- Gated behind operator-typed Turkish hashtags — cannot auto-trigger on any existing flow.
- If Gemini key is missing, reports fail soft with a warning (not a throw).
- If SerpAPI key is missing, matchType is honestly `visual_only_no_external_search`.
- If reverse search returns no hits for primary, retries with supporting[0] (downgraded).
- Handoff never overwrites non-empty `content` fields — operator curation preserved.

**What's needed before first production run:**
- Neon DDL: `CREATE TABLE product_intelligence_reports (...)` with `payload_locked_documents_rels` column — per Blocker 0, `push:true` will NOT create this on prod. Capture DDL from local schema after merge.
- Optional: set `SERPAPI_API_KEY` if reverse image search is wanted. Without it, the bot still works — reports are honestly labeled `visual_only_no_external_search`.

**Follow-ups (LATER):**
- Wire SerpAPI key in Vercel env when operator is ready to activate reverse search.
- Optional: add an admin panel view over `product-intelligence-reports` for historical browsing.
- Optional: extend `createProductIntelligenceReport()` with a second reverse-search provider (e.g. Bing Visual Search) behind the same `available: false` graceful-fallback contract.
- Consider adding a `pi:regen` variant that lets the operator supply hint text (e.g. "this is a running shoe, not a hiking boot") — out of MVP scope.

### 🟡 Product #296 Content Generation Failed — Diagnostic Endpoint Deployed (2026-04-21, D-218)
Operator reported "blocker hatası alıyormn" — Telegram `/publish 296` audit returned `PARTIALLY READY (5/6)` with `❌ content: Content generation failed` as sole blocker. Prior Geo events (from operator screenshot): `content.commerce_generated` at 08:57 → audit at 09:15 flagged content failure, implying discovery pack generation (or revalidation) failed between commerce success and audit.

Diagnosis path blocked initially: admin session cookie had expired, so Payload REST couldn't be queried. Built transient endpoint `/api/admin/product-diagnostic?productId=<id>` (commit `ae7765b` + `9925d23`) accepting EITHER `x-admin-secret: $GENERATE_API_KEY_SECRET` header OR a valid Payload admin session cookie. Returns: workflow statuses, commercePack/discoveryPack presence summary, sourceMeta.shopierProductId, last 25 `bot-events` for the product including `payload.error` from `content.failed` records.

**Smallest correct next step for 296:** send `/content 296 retry` in GeoBot Telegram — `canRetriggerContent()` in `src/lib/contentPack.ts:282` permits `failed → retry` when `isContentEligible(product)` passes. If the failure was transient (Gemini rate limit / token issue), retry succeeds and the audit re-runs clean. If structural, the retry surfaces the concrete error string which we then inspect via D-218 to decide the real fix.

D-218 is transient — safe to remove after content/audit debugging stabilizes.

### ✅ Shopier Size Selector Flow PROD-VALIDATED on Product 294 (2026-04-21)
**Live:** https://www.shopier.com/46374845 renders `<select name="size">` with options `43, 44, 45` matching Payload variants 86/87/88. `sourceMeta.shopierSyncStatus=synced`, `shopierLastError=null` as of cron tick 04:30:28 UTC.

Three-part fix:
- **D-213** (commit `f75de51`, Vercel `CjiKMqyXZ`): `listSelections(100) → listSelections(50)` in `src/lib/shopierSync.ts:67`. Shopier `/selections` caps at 50 → previous `limit=100` returned HTTP 400 → `selections` Map was silently empty → `buildShopierVariants()` returned empty variants → Shopier products created without size selector.
- **D-214** (commit `af0437a`, Vercel `3WoeLYjZY`): Secret-guarded `GET /api/admin/shopier-resync?productId=<id>` or `?all=true` — stand-by operator tool for bulk backfill / disaster recovery. Same `GENERATE_API_KEY_SECRET` guard as `/api/generate-api-key`. Not used in the product 294 fix (the admin REST PATCH path worked), but kept available.
- **D-215** (commit `dd999a3`, Vercel `E7NE2aJZw`): `ShopierVariantInput.selectionId: string → string[]` and `buildShopierVariants()` emits `[selectionId]`. Shopier's REST API accepts `selectionId` as `string[]` on POST/PUT bodies but returns it as `string` on GET responses; input type was mistakenly modeled on the response shape. Surfaced only after D-213 started resolving real selection IDs.

**Trigger path used:** admin REST PATCH on `/api/products/294` with `sourceMeta: { forceRedispatch: true, forceRedispatchChannels: ['shopier'] }` → afterChange hook queued `shopier-sync` job → next cron tick (10-min cadence) ran `syncProductToShopier()` → Shopier accepted the update.

### ✅ Shopier Wizard Categories Seeded (2026-04-21, D-217)
Operator requested adding the 6 Telegram wizard categories to Shopier so product syncs stop silently falling back to "first available". Added admin-auth endpoint `/api/admin/shopier-categories` (GET list, POST ensure). Seeded 5 missing categories; **Günlük** already existed.

Current Shopier categories:

| title   | id                 | placement |
|---------|--------------------|-----------|
| Günlük  | `6b59e27730d800f7` | 1         |
| ayakkab | `f440b506ca57b2d1` | 1         |
| Spor    | `dd158ac4ccd8d5ec` | 2         |
| Klasik  | `fc356eea18a4aa98` | 3         |
| Bot     | `7cd3c86a052248e8` | 4         |
| Terlik  | `39231418b67404e0` | 5         |
| Cüzdan  | `a707d600ac9ca58d` | 6         |

Notes:
- `ayakkab` is an operator typo from Shopier admin UI — left as-is; rename/delete manually on Shopier if desired.
- `getShopierMappings()` has a 5-min cache TTL, so new product syncs pick up the new categories on next cold start or after TTL expires.
- Existing synced products still point to the old `Günlük` default; re-syncing them to switch categories would still hit the D-216 churn for variant-less products.
- D-217 endpoint is transient — safe to remove once Shopier category list is considered stable.

---

**Bulk backfill DONE (2026-04-21, D-216):** 7 previously-synced products (285, 286, 288, 289, 290, 293, 295) were re-dispatched via admin REST PATCH; cron ticks 05:30 + 05:40 UTC processed the queue. Findings:
- Only product 294 has variants in Payload — the 7 others have `variants: []`, so their Shopier pages correctly have no size selector (reflects Payload reality, not a sync bug).
- **D-208b fallback churn:** variant-less UPDATE returns 403/404 → CREATE fallback fires → new Shopier ID every re-sync cycle. Old Shopier IDs become orphans (redirect to seller root). Only product 294 preserved its ID 46375838.
- **Product 288 stuck:** `forceRedispatch` didn't reset (hook no-op on `true → true` transition); 288 still on stale Shopier ID 46176930 (orphaned).

Follow-up items (LATER):
- Investigate root cause of UPDATE failure for variant-less products (capture one failing PUT body + Shopier response from Vercel logs).
- Add variant-count guard in `publishProductToShopier()` to avoid D-208b churn (e.g. if `variants.length === 0`, skip UPDATE or pass a sentinel).
- Manually unstick product 288 (PATCH `forceRedispatch: false` first, then `true`) when Shopier sync is next touched.
- D-214 endpoint cleanup still OK to defer — no bulk operations active.

### ✅ Phase 1 — One-Product Full Pipeline Validation: CLOSED (2026-04-21)
- Product 294 end-to-end green: Website/homepage ✅, Instagram carousel ✅, Facebook multi-photo ✅, X with image ✅
- Final blocker resolved by D-211: `media_category=tweet_image` now sent to X API v2 `/2/media/upload`
- Retest confirmation: `x.mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`
- D-212 closes Phase 1; D-211 is the underlying code change (commit `fc0b3ed`, PR #3)
- Scope of Phase 1 closure: docs-only — no runtime code touched beyond D-211 X fix
- See PROJECT_STATE.md + DECISIONS.md D-211 + D-212

### 🎯 Phase 2 — Telegram SN / Operator Controls: NEW PRIORITY (2026-04-21)
Now that the one-product pipeline is proven end-to-end, the next phase is operator control surfaces:
- Stock-number / SN based operator commands (details to be scoped per operator session)
- Operator-facing controls for day-to-day pipeline steering from Telegram
- Explicitly OUT OF SCOPE for Phase 2: image pipeline (v50 stays LOCKED), GEO/blog engine, Shopier automation

### ✅ Image Pipeline v38 — Slot 3 Rebuild + Global Background Lock: DEPLOYED (2026-04-07)
- Replaced `detail_closeup` (macro) with `back_hero` (3/4 rear hero: heel counter, back stitching)
- New slot 3 is a full-shoe shot → all post-processing works: bg enforcement, frame crop, brightness, centering, centering QC
- Removed all macro-specific code: corner-only bg sampling, tighter thresholds, centering skip
- Global background-lock formalized: slot 1 is bg-family source, slots 2-5 must match exactly
- Removed macro/editorial/lifestyle background exceptions from TASK_FRAMING_BLOCK
- Unified bg enforcement thresholds (90/50) for all slots
- No-frame rule verified hardened at all 3 levels (prompt, QC, post-processing)
- D-124

### ✅ Image Pipeline v37 — Centering QC Hard Gate + Sharp Bugfix: DEPLOYED (2026-04-07)
- Fixed Sharp chaining bug: `.extract().extend().resize()` computed resize from post-extract dims, undoing centering
- Fix: split into two separate Sharp instances (extract+extend first, conditional resize second)
- measureCentering() QC function added: 12% offset threshold on either axis
- Centering retry loop: up to 3 full gen cycles per hero slot (side_angle, commerce_front)
- V37 verification: both heroes pass QC first cycle, 0% offset confirmed via pixel analysis
- SKU stamp (overlayStockNumber) causes false positives in naive post-download bbox analysis — not a real offset
- D-123, commit cd02c19

### ✅ Image Pipeline v36 — Centering + Tighter Brightness: DEPLOYED (2026-04-07)
- centerProduct(): detects product bbox, measures offset from image center, shifts composition
- Tightened brightness band: TARGET_HIGH 170→145, TARGET_LOW 100→85, TARGET_MID 135→115
- Added CENTERING—CRITICAL prompt block to all studio slot prompts
- Pipeline order: bg enforcement → frame crop → brightness norm → centering
- V36 verification: brightness PASS (product lum 92-109), centering PARTIAL (operational but limited by Gemini generation variance)
- Known: slot 3 frame + surface bg persists (pre-existing, not v36 regression)
- D-122, commit 8c3904d

### ✅ Image Pipeline v35 — Brightness Normalization: DEPLOYED (2026-04-07)
- Deterministic product-aware brightness normalization added to all outputs
- normalizeBrightness(): measures PRODUCT pixel luminance only, selective gamma correction
- Runs unconditionally on every slot after bg enforcement + frame detection
- Background pixels preserved (not affected by gamma correction)
- Target band: product mean luminance 100-170 (was no real enforcement before)
- Tightened QC thresholds: mean>200 (was 210), highlight>30% (was 35%)
- Audit confirmed: NO DM/group code divergence — same pipeline for all

### ✅ Image Pipeline v34 — Background Lock + Slot Reorder: DEPLOYED (2026-04-07)
- Side-angle is now the primary hero (index 0) across website, channels, Telegram
- generativeGallery shown on product page + homepage (AI images first, originals as fallback)
- enforceSlotBackground v34: corner-only sampling for macro, contamination guard, batch consistency check
- DB hotfix: 3 missing enum types for hasMany select join tables

### ✅ Phase 21 Operator Runbook: COMPLETED (2026-04-06)
Comprehensive operator-facing daily SOP created: `project-control/OPERATOR_RUNBOOK.md`.
Covers daily flow, all commands, pipeline stages, automated behaviors, exception handling, critical warnings, daily checklist, and key thresholds.

### ✅ Visual-First Pipeline: PROD-VALIDATED (D-117)
Full end-to-end pipeline proven on product #180:
- Intake → Image Gen → Visual Approval → /confirm Wizard → Content Gen → Audit → Activation → Homepage
- All gates enforced: /confirm blocked pre-approval, /content blocked pre-approval
- Confirmation wizard: category buttons, productType buttons, sizes multi-select, stock manual, brand text, targets multi-select, summary+confirm
- Content: commerce+discovery packs generated at 100% confidence
- Audit: approved_with_warning, all 3 dimensions pass
- Activation: status=active, Yeni badge, homepage visible
- 11 bot events across full lifecycle

### ✅ Phase O — Group Workflow Parity: DEPLOYED (2026-04-09)
- Fixed 3 group gate gaps: caption_entities, hashtag triggers, STOCK prefix
- `#gorsel 180` now works in group without @mention
- Photo + `@Geeeeobot` caption now passes gate (caption_entities checked)
- `STOCK SKU:...` now passes gate without @mention
- `onayla`/`reddet` correctly require reply-to-bot (contextual — operator replies to preview)
- Wizard chatId limitation RESOLVED — Phase P session isolation deployed (D-143)
- 12 tests passed (8 gate + 4 real-data)
- D-142

### ✅ Phase X — Telegram Content Preview + Wrong-Bot Redirect: DEPLOYED (2026-04-09)
- Part A: `formatContentPreviewMessage()` shows actual channel copy (IG, FB, web, Shopier, X) + SEO summary
- Content-ready notification now includes Instagram caption snippet preview
- `geo_content` callback and `/content {id}` command show preview + action buttons (Audit / Yayına Al)
- Part B: Photo → GeoBot DM gets "send to @Uygunops_bot" with role explanation
- Photo → GeoBot group with @mention gets same redirect
- 4 webhook tests passed (content preview, DM photo, group photo, /content command)
- Commit: c50517f
- D-151

### ✅ Phase W — Instagram Live Publish Validation: PROD-VALIDATED (2026-04-09)
- First REAL Instagram post via manual Graph API: postId=18337760137169144
- Permalink: https://www.instagram.com/p/DW6nLC_DgQP/
- Token + API path validated. Cold-start media URL issue identified.
- D-149

### ✅ Phase W1 — Automated Instagram Dispatch Reliability: PROD-VALIDATED (2026-04-09)
- `prewarmMediaUrl()` added to channelDispatch.ts — fetches image URL before Graph API call
- Populates Vercel CDN edge cache so Instagram's fetch gets cache HIT (no cold-start)
- Retry on error 9004 (media download failure) with 3s delay
- Same pre-warm applied to Facebook direct publish path
- Automated dispatch confirmed working: postId=18111402145693915
- Permalink: https://www.instagram.com/p/DW6qQFwEl8T/
- GeoBot instagramCaption used, dispatchedChannels=["instagram"], mode=direct
- No manual fallback needed — fully automated end-to-end
- Vercel Blob migration NOT required — pre-warm sufficient for reliability
- Commit: f0fd0eb
- D-150

### ✅ Phase U — GeoBot One-Tap Post-Handoff: DEPLOYED (2026-04-09)
- GeoBot handoff/content messages now have inline action buttons
- 5 new callback handlers: geo_content, geo_audit, geo_auditrun, geo_activate, geo_retry
- Full publish workflow navigable via buttons: content status → audit → activate
- Content-failed shows retry button
- All slash commands remain as fallback
- 9 webhook tests passed
- D-148

### ✅ Phase T2 — One-Tap Wizard Launch: DEPLOYED (2026-04-09)
- Image approval now shows inline button "📋 Bilgileri Gir → Onaya Gönder" instead of text nudge
- `wz_start:{productId}` callback launches wizard with same logic as `/confirm {id}`
- Visual gate, already-confirmed, nonexistent product — all handled
- Manual `/confirm` remains as fallback
- `wz_start:` added to OPS_CB_PREFIXES for Phase R routing
- 9 webhook tests passed
- D-147

### ✅ Phase T1 — Title + Stock Code Intake: DEPLOYED (2026-04-09)
- Wizard now asks for real product title (if placeholder "Taslak Ürün ...")
- Wizard asks for operator's own stock code (stored in `sku` field, skip with `-`)
- Image approval success message now shows `/confirm {id}` next step
- Updated wizard flow: title → stockCode → category → productType → price → sizes → stock → brand → targets → summary → confirm
- No schema changes — uses existing `title` and `sku` fields
- 9 webhook tests passed
- D-146

### ✅ Phase S — GeoBot Visible Handoff: DEPLOYED (2026-04-09)
- After Ops Bot confirms a product, GeoBot visibly takes over via Mentix group notification
- GeoBot reports content generation results (ready/failed) with actionable next steps
- `sendTelegramMessageAs(token, chatId, text)` helper for cross-bot messages in route.ts
- `notifyGeoBot(chatId, text)` helper in contentPack.ts with Mentix group ID constant
- Operators now see the two-bot workflow: Ops Bot confirms → GeoBot announces takeover → GeoBot reports content results
- 9 validation tests passed (token, send capability, 6 routing tests)
- D-145

### ✅ Phase R — Command Ownership Split: DEPLOYED (2026-04-09)
- Ops Bot owns: /confirm, /stok, /diagnostics, #gorsel, #geminipro, image/wizard callbacks, STOCK
- GeoBot owns: /content, /audit, /preview, /activate, /shopier, /merch, /story, story callbacks
- /pipeline shared on both bots
- Wrong-bot commands return clear Turkish redirect messages
- 18 webhook tests passed (5 redirect ops, 6 redirect geo, 2 shared, 5 correct-bot)
- D-144

### ✅ Phase P — Group Wizard Session Isolation: VERIFIED (2026-04-09)
- Refactored wizard session key from `chatId` to `chatId:userId`
- Each operator gets isolated wizard session in group context
- No breaking change: DM behavior preserved (userId still passed, key just has redundant suffix)
- `sessionKey()` helper in confirmationWizard.ts, 36 call sites updated in route.ts
- Phase Q validation: 28/28 unit tests + 12 production webhook simulations passed
- D-143

### ✅ Vercel Build Optimization: DEPLOYED (2026-04-09)
- `ignoreCommand` in vercel.json skips builds for docs-only commits
- Runtime paths: `src/`, `public/`, config files (`payload.config.ts`, `next.config.ts`, `package.json`, etc.)
- Non-runtime paths: `project-control/`, `ai-knowledge/`, `docs/`, `mentix-*`, `n8n-workflows/`, `scripts/`, `media/`, root `.md`/`.html`
- Saves ~40% of wasted build minutes based on recent commit history
- Safety: always builds on first deploy, empty diff, or mixed (docs+runtime) commits
- To force a build: use Vercel dashboard Redeploy, or touch any `src/` file
- D-141

### ✅ Phase N — Bot Role Separation: DEPLOYED (2026-04-08)
- Geo_bot (@Geeeeobot) = GROUP ONLY operator bot → DMs redirect to @Uygunops_bot
- Uygunops (@Uygunops_bot) = DM ONLY operator bot → group messages silently ignored
- Both bots share same full command surface, context gates prevent overlap
- 8 webhook tests passed: DM/group × message/callback × both bots
- D-140

### ✅ Multi-Bot Support — Geo_bot (@Geeeeobot) Live in Mentix Group: DEPLOYED (2026-04-08)
- Geo_bot (`@Geeeeobot`, ID `8728094008`) shares same webhook handler via `?bot=geo`
- Webhook: `https://www.uygunayakkabi.com/api/telegram?bot=geo` with shared secret_token
- Geo_bot added to Mentix Grup Bot group, privacy mode disabled
- D-139

### ✅ Geobot Group Onboarding Phases I/J/K/L: DEPLOYED + VALIDATED (2026-04-08)
- Phase I (D-136): Two safety gates for group chats — command-only filter + group allowlisting
- Phase J: Live Mentix group validation — all 5 scenarios passed in production
- Phase K (D-137): @mention and reply-to-bot activation alongside slash commands
- Phase L (D-138): Mention normalization — `@Bot /cmd` routes correctly, DM unchanged

### Remaining Geo_bot Group Limitations (Post Phase O)
1. ~~**Wizard session key**~~ — RESOLVED by Phase P (D-143). Session key now `chatId:userId`, each operator gets their own wizard in group context.
2. **Error noise** — error messages from failed workflows are sent to the group (visible to all members). Low impact since Mentix group is operator-only.
3. **Free-text routing** — `@Geeeeobot bu kaç lira` passes gates but has no handler (falls through harmlessly). Not a bug — just no free-text NLU.

### Priority 1: Operator Visual Approval of 53 Preview Products
VF-7 normalized the backlog. 53 products now have vis=preview (images generated, awaiting operator approval). 5 products already vis=approved and ready for /confirm. 34 products have no image gen yet (vis=pending).
Operator action: review preview images for the 53 products and approve/reject via Telegram buttons.

### Priority 2: Homepage Size Display Fix
Homepage JSON shows default size range [38-45] instead of actual DB variants.
Pre-existing storefront rendering issue — not a VF regression.
Investigate `page.tsx` or product serialization logic.

### ~~Blocker 3: Media Storage~~ — RESOLVED (2026-04-05)
`BLOB_READ_WRITE_TOKEN` was set in Vercel since Mar 10. Vercel Blob storage operational — files uploaded and publicly accessible. Payload `/api/media/file/` static handler proxies from Blob correctly (HTTP 200). Previous 404 was a transient cold-start issue.

### ~~Blocker 4: Instagram/Facebook Dispatch~~ — RESOLVED (2026-04-05, Phase 20A)
Root causes found and fixed:
- **P20-1 RESOLVED**: Facebook Page was DEACTIVATED in Meta Business Suite — re-activated. Instagram userId `17841443128892405` confirmed valid (uygunayakkabi_34). All env vars were present.
- **P20-2 RESOLVED**: Code bug — afterChange hook passed `doc` at depth=0, so images[].image was bare ID (686) not populated object. extractMediaUrls() returned empty array → direct API paths skipped. Fixed with `findByID({ depth: 1 })` before dispatch (commit ca4ccad).
- **P20-3 RESOLVED**: Manual API verification — Instagram container+publish and Facebook page photo post both succeeded on product #180.

### Step 21b — Shopier Stock Decrement on Order
1. On `order.created` webhook: decrement `products.stockQuantity`
2. Create `InventoryLog` entry with reason `shopier_order`
3. Optional: Telegram notification to ops group

---

## 🔜 NEXT — After Current Sprint

### Per-Channel Redispatch Selector (Phase 1 closure follow-up — 2026-04-21)
- **Context:** During product 294 X retest, `sourceMeta.forceRedispatch=true` re-fired every channel not already marked `dispatched=true`. That re-posted IG + FB as a side effect while re-testing X.
- **Observed mechanics:** `forceRedispatchChannels` is read from `sourceMeta` by the afterChange hook (Products.ts:175) but is NOT a declared Payload schema field — a PATCH via Payload REST silently discards the unknown key (D-202 fallback logic then resolves to "channels not yet successfully dispatched").
- **Smallest correct fix (proposed, not yet scheduled):** declare `sourceMeta.forceRedispatchChannels` as an explicit `array` of select values in `src/collections/Products.ts` so Payload persists it cleanly, then honor it as an allow-list inside the afterChange hook.
- **Acceptance:** operator can redispatch only `['x']` without triggering IG/FB reposts; existing `forceRedispatch=true` path remains as an "all" shortcut.
- **Blast radius:** single schema field + single filter in dispatch selection. No publish code paths affected.
- **Status:** BACKLOG IMPROVEMENT (not a regression — existing behavior documented and understood)

### Instagram Carousel Posts
- When `mediaUrls.length > 1`, publish all images as carousel
- Graph API: create child containers → `media_type=CAROUSEL` + `children[]`
- Update `publishInstagramDirectly()` in `channelDispatch.ts`

### Token Expiry Monitoring
- Instagram long-lived token expires ~2026-05-20
- Options: implement n8n scheduled refresh OR switch to System User token (no expiry)
- Manual fallback: visit `https://uygunayakkabi.com/api/auth/instagram/initiate`

### Phase 4 — Story Pipeline Wiring: Remaining Items
- ✅ Wire dispatchStory() into Products afterChange hook (non-blocking) — D-105
- ✅ Telegram Story operator commands: `/story`, `/restory`, `/targets`, `/approve_story`, `/reject_story` — D-105
- ✅ Story approval flow via Telegram inline keyboards (approve/reject/retry callbacks) — D-105
- Story asset transformation (portrait crop/resize for story format) — DEFERRED
- Story scheduled publishing (scheduledFor field) — DEFERRED
- DB migration: create story_jobs table + products story columns + storyTargets array in Neon — REQUIRED BEFORE PRODUCTION USE

### Phase 7 — Geobot AI Runtime: Completed + Remaining
- ✅ Content schema + state model — D-107
- ✅ Auto-trigger after confirmation — D-107
- ✅ BotEvent flow — D-107/D-108
- ✅ Geobot AI runtime (Gemini 2.5 Flash) — real commerce + discovery generation — D-108
- ✅ Auto-create BlogPost from discovery pack — draft with SEO fields — D-108
- ✅ Truthful state transitions (partial success, graceful GEMINI_API_KEY absence) — D-108

### Phase 8 — Mentix Audit + Content Review (Builds on D-108) — PARTIALLY DONE (D-109)
- ✅ Mentix audit layer: auditStatus flow for content quality before publish — D-109
- ✅ 4-dimension audit (visual, commerce, discovery, overall) with auto-trigger — D-109
- ✅ /audit Telegram command: show status + force run — D-109
- ✅ BotEvents: audit.requested/started/approved/needs_revision/failed — D-109
- Telegram content preview: operator can view generated content inline — DEFERRED
- Content approval/rejection inline keyboards — DEFERRED
- Content regeneration: retry individual packs — DEFERRED
- workflowStatus progression: content_ready → audit_pending → approved → publish_ready — ✅ IMPLEMENTED
- Publish-ready automation: after audit approval, product eligible for autonomous publish — ✅ approvedForPublish flag
- DB migration: create auditResult columns + content group columns + blog linkage in products table in Neon — REQUIRED BEFORE PRODUCTION USE

### Merchandising Integration (Builds on D-102 Schema + D-103 Logic + D-110 Stock Autonomy)
- ✅ Merchandising helper library: `src/lib/merchandising.ts` (D-103 — DONE)
- ✅ Soldout automation: stockState → soldout flow via stockReaction.ts (D-110 — DONE)
- ✅ Merchandising exclusion: soldout products excluded via isHomepageEligible() (D-103 + D-110 — DONE)
- Homepage API route: call `resolveHomepageSections()` with real Payload data
- Storefront UI: render Yeni / Popüler / Çok Satanlar / Fırsatlar / İndirimli sections
- Merchandising sync cron: periodic job to update bestSellerScore on products from order data
- Telegram merchandising commands: `#yeni`, `#populer`, `#deal` etc.
- BotEvents orchestration: event-driven workflow transitions
- Mentix audit integration: auditStatus flow via BotEvents
- DB migration: manually create new columns/tables in Neon production after deploy

### Phase 10 — Homepage + Order + Stock Recovery (D-111) — DONE
- ✅ Homepage integration: page.tsx uses isHomepageEligible() + resolveHomepageSections() server-side
- ✅ Admin stock edit hook: Variants.ts afterChange triggers reactToStockChange
- ✅ Orders afterChange: auto-decrements stock on non-Shopier order creation
- ✅ Refund stock restoration: Shopier webhook restores stock on order cancellation
- ✅ Low-stock Telegram alerts: sendStockAlertToTelegram on soldout/restock/low_stock

### Phase 11 — Homepage Merchandising UI + Telegram Merch Commands (D-112) — DONE
- ✅ Server → client section data: page.tsx builds sectionIds, passes as prop to App
- ✅ UygunApp renders 5 real merchandising sections with client-side fallbacks
- ✅ /merch preview: section summaries with product counts and names
- ✅ /merch status: per-product merchandising state and section membership
- ✅ /merch popular/deal/bestseller commands: operator control of merchandising fields

### Phase 12 — Final Publish Autonomy + Orchestration Polish (D-113) — DONE
- ✅ Central publish readiness evaluation: `src/lib/publishReadiness.ts` with 6-dimension check
- ✅ Readiness wired into mentixAudit: workflowStatus='publish_ready' only when ALL dimensions pass
- ✅ /pipeline Telegram command: full 10-stage lifecycle view + readiness + coherence check
- ✅ State coherence validation: detectStateIncoherence() catches contradictory states
- ✅ product.publish_ready BotEvent emitted when fully ready

### Phase 13 — Production Hardening + Migration Pack (D-114) — DONE
- ✅ MIGRATION_NOTES.md: 14 collections, 3 globals, 80+ Products columns, SQL DDL, migration order
- ✅ DEPLOY_CHECKLIST.md: 43+ env vars, deploy sequence, security, post-deploy validation
- ✅ SMOKE_TESTS.md: 15 test scenarios + 12-step e2e plan
- ✅ PRODUCTION_TRUTH_MATRIX.md: honest status of every subsystem
- ✅ /diagnostics Telegram command: DB, env, events, orders, products, runtime

### Phase 13 Prep — Production Hardening Execution (D-115) — DONE
- ✅ Hardcoded secret cleanup: generate-api-key/route.ts migrated to GENERATE_API_KEY_SECRET env var
- ✅ .env.example rewrite: 7 missing vars added, 3 stale vars removed, classified sections
- ✅ MIGRATION_NOTES.md: exact DDL capture procedure (5-step)
- ✅ DEPLOY_CHECKLIST.md + PRODUCTION_TRUTH_MATRIX.md: updated with D-115 status
- ✅ No production mutations — prep only

### Phase 14 — Next Steps (Builds on D-114/D-115)
- Deploy Phases 1-13 to production with proper Neon migration
- Run smoke test plan and validate all subsystems
- Shopier stock sync-back: poll Shopier inventory → update local stock
- Merchandising sync cron: periodic bestSellerScore recalculation from order data
- Website checkout/cart/payment integration (PayTR or equivalent)
- Auto-publish operator approval flow: publish_ready → operator confirms → activate

### D-056–D-059 Duplicate ID Cleanup
- DECISIONS.md has two definitions each for D-056, D-057, D-058, D-059
- Later definitions take precedence by file position (low operational risk)
- Needs a renumbering pass when time permits

---

## 📋 LATER — Planned but Not Scheduled

### Phase 2B Active Channels

**X (Twitter) Integration:** — PROD-VALIDATED (2026-04-21)
- Status: OAuth 1.0a user-context publishing live (D-195c). Media upload via v2 `/2/media/upload` with `media_category=tweet_image` (D-211).
- Prod-validated on product 294: `mediaUploaded=true`, `responseStatus=201`, `tweetId=2046379952245776422`.
- Tweet text source: `commercePack.xPost` if present, otherwise fallback (see `src/lib/channelDispatch.ts`).
- ~~Real integration needs: X API v2 POST /2/tweets + OAuth 2.0 PKCE~~ (superseded by OAuth 1.0a path).
- Token refresh: access ~2hr, refresh ~6mo

**Retired channels (2026-06-21):**
- Dolap and Threads are no longer part of the project.
- Runtime channel types, Payload toggles, parser targets, and n8n stubs were removed.

### Phase 2C — Content Growth Layer

**AI SEO Blog Engine:**
- BlogPosts collection scaffolded (2026-03-15)
- Needs: n8n workflow or direct generation from Payload
- Needs: `/blog` + `/blog/[slug]` frontend routes
- Needs: SEO meta tags, internal linking to product pages

### Phase 3 — Visual & Experience

**Visual Expansion Engine:**
- AI-generated additional product angles (2-4 per product)
- Needs: provider selection (EachLabs? Stability AI? Custom?)
- Needs: media type tracking (original / enhanced / generated_angle)

**Photo-Based AI Try-On (D-093):**
- Product page widget: "Kendi fotoğrafında dene"
- UX layer only — no data model changes needed
- Needs: provider selection + privacy (auto-delete user photos)

---

## 🚫 BLOCKED — Waiting on External

### Mentix Level B Skills Activation
- **Blocked on**: Level A skills being ops-tested first (see NOW section)
- Skills waiting: eachlabs-image-edit, upload-post, research-cog, senior-backend

### Learning Engine (Mentix)
- **Blocked on**: 7+ days of Level A operation data
- Observe-only mode, then weekly reports + golden case regression (GC-001, GC-002, GC-003)

---

## ⏳ WAITING FOR INPUT — Operator Actions

### Historical OpenClaw VPS Plan - Superseded
- [x] Do not deploy, configure, restart, or test the old OpenClaw VPS plan by default. Hermes/Mentix is the current agent-control layer; OpenClaw is historical/optional and requires an explicit owner reactivation decision plus the verification-first checklist in `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`.
- [x] n8n remains optional glue; direct Payload/Next product flow is the default.

### Deferred Cleanup (Non-Blocking)
- [ ] Add favicon.ico to `src/app/`
- [ ] Re-implement admin dark mode without `!important` overrides
- [ ] Switch `push: true` to Payload migrations (recommended before Phase 3)
- [ ] Promote `publishResult.instagramPostId` to `sourceMeta.externalSyncId` field

---

## ✅ COMPLETED — Reference Only

<details>
<summary>Phase 1 — Core Admin + Storefront (2026-03-10 → 2026-03-13) ✅</summary>

All Phase 1 production validation tasks passed. See PROJECT_STATE.md Phase 1 Completion Record.
Infrastructure, collections, schema, storefront — all validated in production.
</details>

<details>
<summary>Phase 2A — Steps 1-15 (2026-03-15 → 2026-03-16) ✅</summary>

- Step 1: Security rotation
- Step 2: Persistent Docker network fix
- Step 3: Telegram group access policy
- Step 4: OpenClaw → n8n intake webhook
- Step 5: n8n → Payload draft product creation
- Step 6: Media pipeline (Telegram → Vercel Blob → Payload)
- Step 7: Duplicate protection / idempotency
- Step 8: Admin review / approval flow (SourceBadge, StatusCell, ReviewPanel)
- Step 9: Inventory / variant readiness (stockQuantity, color, TG-SKU)
- Step 10: Publishing flow / commerce activation (draft → active guard)
- Step 11: Caption parser enhancement (Turkish/English, confidence, warnings)
- Step 12: Automation settings / global toggle layer
- Step 13: Channel adapter scaffolding (channelDispatch.ts)
- Step 14: Channel workflow stubs + admin dispatch visibility
- Step 15: E2E verification pass + media URL hardening
</details>

<details>
<summary>Steps 16-20 (2026-03-18 → 2026-03-23) ✅</summary>

- Step 16: First real channel integration (n8n Instagram Graph API workflow)
- Step 17: Instagram token exchange + hardening (OAuth flow)
- Step 18: Instagram direct publish from Payload (n8n bypassed — D-088)
- Step 19: Facebook direct publish from Payload (Graph API — D-089)
- Step 20: Shopier integration (REST API v1, webhook HMAC, jobs queue, GitHub Actions cron)
</details>

<details>
<summary>Mentix Intelligence Layer — v1 + v2 Design ✅</summary>

- 13 skills designed and created (7 Level A + 4 Level B + 1 Level C + mentix-intake)
- mentix-memory/ 12-layer directory system
- Decision policy, write policy, publish policy, memory policy, skill gating policy
- 6 runbooks, 3 golden cases, trace schema
- Dashboard v2 (7-tab HTML)
- Governance: SYSTEM_PROMPT.md + MENTIX_SYSTEM_PROMPT.md
</details>

<details>
<summary>Phase 1–5 Schema + Merchandising + Story Pipeline + Confirmation Wizard (2026-04-03 → 2026-04-04) ✅</summary>

- Phase 1 (D-102): Workflow + merchandising fields on Products, HomepageMerchandisingSettings global, BotEvents collection
- Phase 2 (D-103): Merchandising logic library — 5 homepage sections, bestseller scoring, new window, membership resolution
- Phase 3 (D-104): Story pipeline foundation — StoryJobs collection, storySettings, storyTargets, storyDispatch, storyTargets libs
- Phase 4 (D-105): Story pipeline wiring — afterChange hook trigger, Telegram operator commands, approval keyboards, no-fake-publish rule
- Phase 5 (D-106): Product confirmation wizard — `/confirm` command, guided field collection, inline keyboards, BotEvent emission
- Phase 6 (D-107): Geobot content pack foundation — content schema, contentPack.ts helpers, auto-trigger after confirmation, `/content` command
- Phase 7 (D-108): Geobot AI runtime wiring — real Gemini generation, commerce+discovery packs, BlogPost auto-creation, truthful states
- Phase 8 (D-109): Mentix audit + content review — 4-dimension audit runtime, auto-trigger after content.ready, `/audit` command, BotEvents
- Phase 9 (D-110): Order/stock/soldout autonomy — central stockReaction.ts, Shopier/Telegram integration, BotEvents, `/stok` command
- Phase 10 (D-111): Homepage + order + stock recovery — merchandising server-side filtering, Variants/Orders afterChange hooks, refund restoration, low-stock alerts
- Phase 11 (D-112): Homepage merchandising UI + Telegram merch commands — UygunApp renders 5 real sections from server data, /merch operator commands for popular/deal/bestseller control
- Phase 12 (D-113): Final publish autonomy + orchestration polish — central readiness evaluation (6 dimensions), /pipeline command, state coherence validation, readiness wired into audit flow
- Phase 13 (D-114): Production hardening + migration pack — MIGRATION_NOTES.md, DEPLOY_CHECKLIST.md, SMOKE_TESTS.md, PRODUCTION_TRUTH_MATRIX.md, /diagnostics command
</details>

<details>
<summary>Active Channel History ✅</summary>

- X (Twitter): direct OAuth 1.0a posting live
- Facebook Page: real integration live via Step 19
- Dolap/Threads: retired on 2026-06-21
</details>

<details>
<summary>Image Pipeline v39 — Visual Standard Reset (2026-04-07) ✅</summary>

- Background hex map shifted from near-white (~95%) to visibly colored (~78%)
- Brightness normalization band shifted darker (70-120, mid 95)
- QC brightness thresholds tightened (mean>185, highlight>25%)
- Slot 3 rebuilt: back_hero → close_shot_hero (3/4 front close hero)
- TASK_FRAMING_BLOCK updated: darker/richer visual emphasis
- Decision: D-125
</details>

<details>
<summary>Resolved Blockers ✅</summary>

- Blocker 1: Instagram credentials → OAuth completed (2026-03-22)
- Blocker 2: Mentix VPS deployment → resolved (2026-03-17)
- Blocker 3: Git push pending → resolved (2026-03-17)
- Blocker 4: Product save 500 (products_channel_targets) → id column fixed to SERIAL (2026-03-17)
- Blocker 5: Instagram publish error 100/33 → direct publish bypass (2026-03-22)
</details>

---

## IMAGE GENERATION — FROZEN (2026-04-07)

**Status:** BASELINE LOCKED — D-129

The image generation pipeline is frozen at v50 (commit e99e9cb). All components listed below are NOT to be modified without explicit operator approval:

### Frozen Items
- [ ] ~~Image pipeline slot prompts~~ — LOCKED
- [ ] ~~Background color mappings~~ — LOCKED
- [ ] ~~Anti-frame instructions~~ — LOCKED
- [ ] ~~Input image padding logic~~ — LOCKED
- [ ] ~~SN overlay (bitmap pixel font)~~ — LOCKED
- [ ] ~~QC checks (color/brand/shot)~~ — LOCKED
- [ ] ~~Visual quality parameters~~ — LOCKED

### Requires Explicit Operator Approval To Change
Any modification to `src/lib/imageProviders.ts` or `src/jobs/imageGenTask.ts` that affects:
- Slot ordering or slot prompt text
- Background color hex values or color-to-backdrop logic
- Anti-frame prompt blocks
- Input image resize/padding behavior
- Stock number overlay rendering
- Brightness, sharpness, contrast, or any visual post-processing
- QC check thresholds or pass/fail logic

### What CAN Still Be Changed (without image-gen approval)
- Telegram command handling (non-prompt logic)
- Product data flow / job orchestration (non-visual)
- New features unrelated to image generation
- Bug fixes that don't alter visual output


---

## CONTENT ARCHITECTURE — Implementation Phases (2026-04-07)

**Status:** Phase A-C implementation complete; Phase D remains deferred unless an operator asks for more content tooling.

### Phase A — Wire Content to Storefront (HIGHEST PRIORITY)
- [x] Product page: render `commercePack.websiteDescription` (fallback to `description` if empty)
- [x] Product page: render `commercePack.highlights` as feature bullet list
- [x] Product page: render `discoveryPack.faq` as expandable FAQ accordion
- [x] Product page <head>: use discoveryPack.metaTitle + metaDescription for SEO meta
- [x] Product page: add JSON-LD Product structured data
- [x] Product page: add JSON-LD FAQPage structured data (if FAQ exists)

### Phase B — Blog Frontend
- [x] Create `/blog` listing page (published BlogPosts, paginated)
- [x] Create `/blog/[slug]` detail page (article body, featured image, SEO fields)
- [x] Blog detail page: proper `<head>` meta from BlogPost.seo fields
- [x] Blog listing: category filter (category badge display — filter UI deferred)
- [x] Add published blog posts to sitemap.xml with static/product fallback; the implementation safely omits blog rows when the D-462 BlogPosts schema drift blocks the query.

### Phase C — Channel Dispatch Wiring
- [x] Instagram dispatch prefers `commercePack.instagramCaption`, then falls back to a structured product caption.
- [x] Shopier dispatch prefers `commercePack.shopierCopy`, then falls back to the product description/title.
- [x] X dispatch prefers `commercePack.xPost`, fills its product-link placeholder, and then applies stock/length safeguards.
- [x] Facebook dispatch prefers `commercePack.facebookCopy`, then falls back to the Instagram caption builder.

### Phase D — Content Quality (DEFERRED)
- [ ] Operator content review UI in admin (preview all 5 channel copies)
- [ ] Content regeneration on product field update
- [ ] Analytics feedback loop (click-through, engagement)

### Dependencies
- Phase A has NO blockers — can start immediately
- Phase B has NO blockers — can run parallel with Phase A
- Phase C depends on channel integrations being live
- Phase D is future enhancement


---

## Storefront UX Polish (D-257 → D-261) — COMPLETED 2026-05-07

- [x] D-257: Homepage/listing → PDP clickthrough polish
- [x] D-258: Homepage trust / order flow clarity, brand copy
- [x] D-259: Catalog browse clarity — dynamic heading, sort, count, scoped size filter
- [x] D-260: Mobile catalog filter drawer — sticky bar + bottom sheet
- [x] D-261: PDP trust/delivery/FAQ clarity — trust grid, process steps, always-on FAQ, success state

## OOS Size Recovery / Alternative Inquiry Path (D-264) — COMPLETED 2026-05-08

- [x] D-264: OOS size chips → `<a href="#inquiry-form">` anchors (dashed border, pointer cursor)
- [x] D-264: Context-aware size-help note — mixed-stock variant ("Üzeri çizili bedenler için...")
- [x] D-264: ContactForm `chipSelected` state separates chip vs typed size
- [x] D-264: OOS recovery text input shown when no chip selected ("Stokta olmayan beden mi arıyorsunuz?")

## Size Guidance / Fit Confidence Polish (D-263) — COMPLETED 2026-05-08

- [x] D-263: Size-help reassurance note below size display chips (page.tsx)
- [x] D-263: Inquiry form heading → "Sipariş Ver veya Beden Sor" + subtitle (page.tsx)
- [x] D-263: Process step 2 → "Beden & Teslimat Netleşir" (page.tsx)
- [x] D-263: ContactForm size chip label "(opsiyonel)" + "proceed without size" hint (ContactForm.tsx)

## Sitewide Contact / WhatsApp Fast-Path Polish (D-262) — COMPLETED 2026-05-08

- [x] D-262: Catalog contact nudge strip below product grid
- [x] D-262: ProductDetail WA label → "WhatsApp'tan Bilgi Al" + sz in message
- [x] D-262: PDP WA label + message intent clarified
- [x] D-262: Mobile sticky CTA split — 40% WA / 60% inquiry form

## Production Data Cleanup — COMPLETED 2026-05-07
- [x] 38 test products + 164 variants + 161 media + 20 PI reports deleted (scripts/production-cleanup.mjs)
- [ ] Manual cleanup pending: Shopier panel, Meta Business Suite, X test tweets, Payload Admin media


## OOS Size Auto-Prefill / Recovery UX Polish (D-265) — COMPLETED 2026-05-08

- [x] D-265: New `OOSChip.tsx` client component — fires `CustomEvent('oosChipClicked')` + smooth-scrolls to `#inquiry-form`
- [x] D-265: ContactForm `useEffect` listener → auto-prefills `size` state + sets `oosContext` when OOS chip tapped
- [x] D-265: Amber contextual banner in ContactForm — "{size} numara şu an stokta görünmüyor. Talep bırakın..."
- [x] D-265: Amber input border when `oosContext` active; clears on manual edit or success reset
- [x] D-265: page.tsx OOS `<a href="#inquiry-form">` chips replaced with `<OOSChip size={variant.size} />`
- [x] D-265: Commit `e8ea373` pushed to main

## Catalog / Site Search & Quick-Find (D-266) — COMPLETED 2026-05-08

- [x] D-266: Audit catalog discovery flow — confirmed zero search existed, all product data loaded client-side
- [x] D-266: Add `query` state + `searchFiltered` pipeline to `Catalog` component
- [x] D-266: Search bar JSX — pill-shaped, search icon, ✕ clear, always visible above desktop controls (also on mobile)
- [x] D-266: Result count shows `· "query"` when search active
- [x] D-266: Mobile sticky bar — search active pill `🔍 "query" ✕` appears in pills row; tap to clear
- [x] D-266: Search-aware empty state — custom heading/body/CTA when query is active; "Aramayı Temizle" CTA
- [x] D-266: `resetFilters` now also clears `query`
- [x] D-266: Commit `6e796c2` pushed to main

## PDP Alternative Product / Similar Model Recovery Path (D-267) — COMPLETED 2026-05-08

- [x] D-267: Audit PDP layout — confirmed zero alternative-product path existed
- [x] D-267: Server-side Payload query in page.tsx — same category, exclude current, exclude drafts, max 6, sort -createdAt
- [x] D-267: "Benzer Modeller" JSX section — responsive auto-fill grid, image+title+price cards, zero-state safe
- [x] D-267: Commit `b87a5ef` pushed to main

## PDP & Card Price / Stock / Discount Clarity Polish (D-268) — COMPLETED 2026-05-08

- [x] D-268: Audit card + PDP price/discount/stock display — identified 4 weak points
- [x] D-268: Card originalPrice readability (size 12→13px, color 0.3→0.4 opacity)
- [x] D-268: Discount badge everywhere: `%{N}` → `%{N} indirim` (cards + ProductDetail + PDP)
- [x] D-268: PDP stock badge: "Stokta" → "Stokta · N beden" with available size count
- [x] D-268: PDP BEDEN section label: "BEDEN — N stokta" count when sizes available
- [x] D-268: Commit `fc21ecd` pushed to main

## PDP Product Image / Gallery Usability Polish (D-269) — COMPLETED 2026-05-08

- [x] D-269: Audit PDP gallery — confirmed 5 weak points (swipe, opacity, overflow, ring, transition)
- [x] D-269: Mobile touch swipe (onTouchStart/End, 50px delta, left=next, right=prev)
- [x] D-269: Image fade-in on change (key={activeIndex} + @keyframes pdpImgFadeIn 0.22s)
- [x] D-269: Thumbnail row overflowX auto + scrollbar hidden (no clip on narrow screens)
- [x] D-269: Active thumbnail outer glow ring (boxShadow 0 0 0 3px)
- [x] D-269: Inactive thumbnail opacity 0.5→0.65, border transparent→rgba(0.12)
- [x] D-269: Commit `420e60d` pushed to main

## PDP Zoom / Fullscreen Image Inspection (D-270) — COMPLETED 2026-05-08

- [x] D-270: Audit D-269 gallery — confirmed no tap-to-fullscreen path existed
- [x] D-270: isFullscreen state + useEffect (Escape key + body scroll lock)
- [x] D-270: Fullscreen overlay — fixed, dark backdrop, fade-in animation, tap to close
- [x] D-270: Fullscreen prev/next arrows + swipe reused from D-269
- [x] D-270: Close: X button (44px), tap backdrop, Escape key
- [x] D-270: Inline: cursor zoom-in, Büyüt hint, arrow stopPropagation
- [x] D-270: Commit `c01b3ec` pushed to main

## Mobile Image Loading Performance (D-271) — COMPLETED 2026-05-08

- [x] D-271: Audit — confirmed no `loading` attributes on any storefront `<img>` tags; no `fetchPriority` on critical above-fold images
- [x] D-271: `ProductImages.tsx` — PDP hero image: `fetchPriority="high"` + `loading="eager"`; thumbnails: `loading="lazy"`
- [x] D-271: `page.tsx` — similar products section `<img>`: `loading="lazy"` (below-fold)
- [x] D-271: `UygunApp.jsx` — card product images: `loading="lazy"`; hero Unsplash image: `fetchpriority="high"`; cart drawer thumbnails: `loading="lazy"`; ProductDetail thumbnails: `loading="lazy"`; ProductDetail main image: `fetchPriority="high"` + `loading="eager"`
- [x] D-271: Commit `38d5f0d` pushed to main

## Cart / Checkout Expectation Clarity (D-272) — COMPLETED 2026-05-08

- [x] D-272: Audit — VERIFIED `page.tsx` "SEPETE EKLE" button had no `onClick` (dead-end); cart drawer had no process explanation; WA button said "SİPARİŞ VER" (implies instant order); ProductDetail had no process note
- [x] D-272: `UygunApp.jsx` cart drawer — added process note between total and WA button: "Talebiniz WhatsApp'tan ekibimize iletilir — ekibimiz sizi arar ve siparişi birlikte tamamlar."
- [x] D-272: `UygunApp.jsx` cart CTA — "WHATSAPP İLE SİPARİŞ VER" → "WHATSAPP İLE TALEBİNİZİ İLETİN" (honest: it's a request, not a completed order)
- [x] D-272: `UygunApp.jsx` ProductDetail trust badges — added process hint: "Sepete ekleyip WhatsApp'tan sipariş talebinizi iletebilirsiniz — ekibimiz sizi arar ve süreci tamamlar."
- [x] D-272: `page.tsx` — replaced non-functional "SEPETE EKLE" `<button>` (no onClick) with `<a href="#inquiry-form">` labeled "TALEBİNİZİ OLUŞTURUN"; STOKTA YOK disabled state preserved
- [x] D-272: Commit `50785a9` pushed to main

## Contact Form Validation / Submission Confidence (D-273) — COMPLETED 2026-05-08

- [x] D-273: Audit — VERIFIED no client-side validation; API error body discarded; no "(zorunlu)" on required fields; error message rendered below submit (invisible on mobile); generic error regardless of cause
- [x] D-273: Added `phoneError` + `nameError` state; `phoneRegex` constant mirrors server-side rule
- [x] D-273: Client-side validation before fetch — name ≥2 chars → "Adınızı eksiksiz girin."; phone regex fail → "Lütfen geçerli bir telefon numarası girin (Örn: 0533 123 45 67)."
- [x] D-273: API 400 phone error now read from response body and shown as field-level error; status reset to idle so user can fix and resubmit
- [x] D-273: Added "(zorunlu)" label suffix on Name + Phone fields (matches existing "(opsiyonel)" on Beden)
- [x] D-273: Phone helper text: "Sizi arayabilmemiz için güncel numaranızı girin."
- [x] D-273: Error box moved above submit button; styled with bg-red-50 border; distinguishes network vs server errors
- [x] D-273: Loading text: "Gönderiliyor…" → "Talebiniz gönderiliyor…"
- [x] D-273: Field borders turn red on error; cleared automatically when user edits
- [x] D-273: All D-251 attribution, D-265 OOS flow, D-264 chip flow — fully preserved
- [x] D-273: Commit `ea870d8` pushed to main

## Header / Navigation / Sitewide Entry Clarity (D-274) — COMPLETED 2026-05-08

- [x] D-274: Audit — VERIFIED desktop nav had no active-state visual indicator; mobile menu items were all same color (no active highlight); mobile menu had bare WA button with no section label; footer "Sipariş" column name was misleading (just a WA link)
- [x] D-274: Desktop nav links — added `borderBottom: 1.5px solid` indicator (transparent when inactive, `T.text` when active page); `paddingBottom: 4` for clean underline spacing
- [x] D-274: Mobile menu items — `color: pg === l.k ? T.text : "rgba(28,26,22,0.52)"` (inactive items visually muted); active item underline mirrors desktop; `›` chevron added on right for visual path hint; flex layout for label + chevron
- [x] D-274: Mobile menu — "Yardım & İletişim" section label added above WA button; WA button text "WhatsApp ile Yaz" → "WhatsApp ile İletişim Kur"
- [x] D-274: Footer "Sipariş" column heading → "Yardım" (honest label for what is actually a WA contact link)
- [x] D-274: Commit `9e5a087` pushed to main

## Help / FAQ / Contact Destination Polish V1 (D-275) — COMPLETED 2026-05-09

- [x] D-275: Audit — VERIFIED no standalone help/contact destination in SPA; footer "Yardım" column = lone WA button; mobile menu = lone WA button; no grouped help topics outside PDP; `ProductFAQ` and `ContactForm` exist only on PDP
- [x] D-275: New `HelpContactPage` component (`pg === "contact"` SPA view) — header "Yardım Merkezi / Sıkça Sorulan Sorular"; compact 4-step process summary (reuses `STEPS_DATA`); 3 FAQ groups (Ürün & Beden, Sipariş & Ödeme, Teslimat & Süreç) with accordion items; CTA block — primary "Ürünleri İncele" → catalog, secondary WA fast-help; `Footer` included
- [x] D-275: `HelpFAQItem` accordion component — `+`/`−` expand toggle, beige card style consistent with `ProductFAQ`
- [x] D-275: Nav `links` array — added `{ k: "contact", l: "YARDIM" }` (desktop active-underline + mobile active-state patterns from D-274 applied automatically)
- [x] D-275: Mobile menu "Yardım & İletişim" section — added navigable "YARDIM MERKEZİ" entry with D-274 active-state style + `›` chevron; WA button preserved below
- [x] D-275: Footer "Yardım" column — added `S.S.S. & Yardım Merkezi` nav link above WA button
- [x] D-275: URL sync — `nav("contact")` → `/yardim`; mount path detection `path === "/yardim"` → `sPg("contact")`
- [x] D-275: Commit `7a1915e` pushed to main

## Store Credibility / About / Why-Us Polish V1 (D-276) — COMPLETED 2026-05-09

- [x] D-276: Audit — VERIFIED WHY_US_CARDS 4+5 were internal-ops language (AI system, digital presence) with zero buyer relevance; AboutSection had 2 AI/digital-ops paragraphs; TrustValueSection opening had "modern dijital satış sistemi" jargon; last trust bullet was vague
- [x] D-276: `WHY_US_CARDS` — card 4 (🤖 "Yapay Zekâ Destekli Sistem") → (🤝 "Kişisel Alışveriş Desteği") with personal callback support copy; card 5 (🌐 "Güçlü Dijital Varlık") → (📦 "Anlaşılır Sipariş Süreci") with step-by-step process copy
- [x] D-276: `WhyUsSection` subtitle — "modern dijital sistemleri bir araya getirmemizden" → "kaynağından seçilmiş ürünleri, kişisel destek ve anlaşılır bir süreçle buluşturuyoruz"
- [x] D-276: `AboutSection` — removed AI/digital-ops pivot paragraphs; replaced with buyer support copy ("Talep bıraktığınızda ekibimiz sizi kısa sürede arar..."); closing "daha akıllı bir modelle" → "kişisel destekle"; brand badge "akıllıca sunulmuş" → "kişisel destek"
- [x] D-276: `TrustValueSection` — opening "modern bir dijital satış sistemiyle" → "kişisel destek ve anlaşılır bir alışveriş deneyimiyle"; last bullet "Sipariş sürecinde baştan sona destek" → "Beden seçiminden teslikata kadar adım adım destek"
- [x] D-276: Commit `a37e808` pushed to main

## Homepage Category / Intent Entry Polish V1 (D-277) — COMPLETED 2026-05-09

- [x] D-277: Audit — VERIFIED `CategoryOverlay` was at homepage position 8 (after Hero, WhyUs, Popular, Steps, BestSellers, About, Trust) — most visitors never reached it; no heading or intent framing; chips had tiny padding (9px 20px); no "Tüm Ürünler" fallback for undecided visitors
- [x] D-277: `CategoryOverlay` upgraded — proper section with `KATEGORİ` eyebrow + `Ne Arıyorsunuz?` heading + subtext; chip padding 9px→13px; chip icons 15→18px; `Tüm Ürünler →` dark button added as fallback CTA
- [x] D-277: `CategoryOverlay` moved from position 8 → position 3 (right after `WhyUsSection`, before Popular grid) — category entry is now 3rd thing a visitor sees, not 8th
- [x] D-277: Commit `9050542` pushed to main

## SupplierScout Autonomous Supplier Bot (D-278) — DORMANT 2026-06-21

### Code Complete — Parked Because Current Strategy Is Own Products Only

- [x] D-278: types.ts — all SupplierScout TypeScript types (MessageClass, ParsedProductOffer, SoldOutMatchResult, AutoCreateGateResult, etc.)
- [x] D-278: 9 Payload collections created in src/collections/supplier/
  - SupplierGroups, WholesaleOpportunities, SupplierActionsLog, SupplierDailyReports, SupplierTrustScores
  - SupplierGroupMemory, SupplierSellerMemory, SupplierLanguageMemory, SupplierCorrectionMemory
- [x] D-278: SupplierScoutSettings global created (frankChatId, margin, thresholds, pause toggle)
- [x] D-278: Products.ts extended — supplier_scout source + supplierMeta group (stockMode, wholesalePrice, etc.)
- [x] D-278: classifier.ts — Gemini 2.5 Flash NLP, 11 message classes, Turkish slang seed, heuristic fallback
- [x] D-278: parser.ts — price/size/name extraction, computeWebsitePrice, parseSoldOutSignal
- [x] D-278: soldoutMatcher.ts — 6-signal scored matching, applySoldOut, threshold routing
- [x] D-278: productCreator.ts — 9-condition auto-create gate, buildSizeList, autoCreateProduct
- [x] D-278 Phase 3A Fix 1 — autoCreateProduct() 5-bug fix VERIFIED 2026-05-13 (commits 0950a579 + ed3a95e9):
  - Nested group fields: all supplierMeta/automationMeta/workflow/channels were dot-notation flat keys (Payload v3 silently drops) → now proper nested objects
  - Variant field names: stockQuantity→stock, sku→variantSku (per Variants.ts schema)
  - channels.publishWebsite: forced false (Products.ts defaultValue=true would publish drafts to website)
  - workflowStatus: 'intake'→'draft' (invalid Payload select value → ValidationError on create)
  - contentStatus: 'not_started'→'pending' (invalid Payload select value → ValidationError on create)
  - Controlled test: WO#31 → Product #330, 20/20 verification conditions passed, RolvoDropIthal untouched
- [x] D-278: memory.ts — language/seller/correction CRUD, trust score, action logger
- [x] D-278: reportGenerator.ts — buildDailyReport, formatDailyReport (9 sections), saveDailyReport
- [x] D-278: commands.ts — 14 DM commands including /teach, /memory, /seller, /corrections, /learning_today
- [x] D-278: telegram.ts — scoutSendMessage, scoutAnswerCallback, scoutGetFileUrl, scoutDownloadPhoto, registerScoutWebhook
- [x] D-278: /api/supplier-scout/route.ts — full webhook + cron + health endpoint
- [x] D-278: payload.config.ts updated — all 9 collections + SupplierScoutSettings global registered
- [x] D-278: project-control/SUPPLIER_SCOUT.md — architecture, design decisions, Neon DDL, env vars
- [x] D-278: project-control/SUPPLIER_SCOUT_RUNBOOK.md — operator runbook, setup steps, commands, troubleshooting

### Dormant State

- [x] SupplierScout daily Vercel cron removed.
- [x] `/api/supplier-scout` now ignores webhook/GET actions unless `SUPPLIER_SCOUT_ENABLED=true`.
- [x] Collections/settings remain registered so old records and code are not lost.
- [ ] Reactivation requires a fresh owner decision, env vars, webhook registration, and likely Neon DDL verification.

## Homepage Quick-Start Search Shortcut (D-279) — COMPLETED 2026-05-09

- [x] D-279: Audit — VERIFIED no search input anywhere on homepage; D-266 catalog search lives only in `Catalog` component's local `query` state (inaccessible from homepage); `CategoryOverlay` (D-277) had category chips + "Tüm Ürünler →" but no text search
- [x] D-279: `initQuery` state added to App (`useState("")`) — seeds Catalog search query on navigation from homepage
- [x] D-279: `nav()` extended with `q` third param — `if (q !== undefined) sInitQuery(q); else sInitQuery("")` — clears query cleanly on bare `nav("catalog")` calls
- [x] D-279: `Catalog` render call updated — `initQuery={initQuery}` prop added
- [x] D-279: `Catalog` component signature updated — accepts `initQuery` prop; `query` state seeded from `useState(initQuery || "")`
- [x] D-279: `CategoryOverlay` upgraded with search form — `searchVal` local state, `handleSearch` form submit, `<form>` with red Ara button; on submit with non-empty val calls `onNav("catalog", null, q)`; CategoryOverlay subtext updated to "Bir kategori seçin veya model ara"
- [x] D-279: Commit `2fa6084` — push pending (GitHub unreachable at time of commit; push when network recovers)


## Homepage Discovery Hierarchy Polish (D-280) — COMPLETED 2026-05-10

- [x] D-280: Audit — VERIFIED homepage order was: Hero → WhyUsSection (6 credibility cards) → CategoryOverlay (search + chips) → Popular. WhyUs was blocking access to search/category on mobile (6 stacked cards = significant scroll). CategoryOverlay eyebrow was "KATEGORİ" (too narrow — section has search too). "Tüm Ürünler →" was a heavy dark chip competing with Hero's primary CTA. 3 catalog CTAs near each other (Hero + CategoryOverlay chip + Popular's Tümünü Gör).
- [x] D-280: `CategoryOverlay` moved immediately after Hero (before `WhyUsSection`) — discovery zone now comes before credibility. New homepage order: Hero → CategoryOverlay → WhyUs → Popular.
- [x] D-280: Eyebrow label: `KATEGORİ` → `KEŞFET` — signals both search AND category entry, not just categories
- [x] D-280: Helper copy updated: "Model veya beden arayın, bir kategori seçin ya da tüm koleksiyona göz atın" — all 3 entry modes named explicitly
- [x] D-280: "Tüm Ürünler →" demoted from heavy dark equal-weight chip to subtle muted text link below the chip row — reduces CTA noise near Hero
- [x] D-280: Commit `1bcc10ef` pushed to main (GitHub REST API; also includes classifier.ts D-278 isActionable fix + PROJECT_STATE.md updates)


## Homepage Product-First Scroll Path Polish (D-281) — COMPLETED 2026-05-10

- [x] D-281: Audit — VERIFIED mobile scroll depth to first product was ~3020px (~3.5 viewport heights). Order was: Hero → CategoryOverlay → WhyUsSection (6 stacked mobile cards ~1576px) → Popular Products. WhyUsSection was the main blocker on mobile. Desktop ~720px of credibility before first product.
- [x] D-281: Popular Products moved from position 4 → position 3 (after CategoryOverlay, before WhyUsSection). Mobile scroll to first product: ~3020px → ~1404px (~1.7 viewport heights). Visitors see real products before credibility content.
- [x] D-281: Popular Products top padding reduced: `100px 40px` → `60px 40px 100px` — section now adjacent to CategoryOverlay (72px section), tighter transition.
- [x] D-281: WhyUsSection becomes credibility reinforcement *after* visitor has seen real products — trust supports discovery, no longer delays it.
- [x] D-281: New homepage order: Hero → CategoryOverlay → Popular Products → WhyUsSection → Steps → BestSellers → About → Trust → Discounted → Footer
- [x] D-281: Commit `0e6222ff` pushed to main


## Homepage End-of-Page Exit Recovery (D-284) — COMPLETED 2026-05-11

- [x] D-284: Audit — VERIFIED: DiscountedSection ends cold (no bottom CTA — "Tümünü Gör →" is in header, not footer of section). Footer "Ayakkabılar" link is rgba(240,236,228,0.45) — near-invisible. If discounted=0, DiscountedSection returns null; visitor jumps TrustValueSection → Footer with CTAs already scrolled past.
- [x] D-284: PreFooterCTA component added (new function, ~40 lines) — compact centered strip between DiscountedSection and Footer
- [x] D-284: Renders unconditionally — catches both the discounted-products path and the null-discounted path
- [x] D-284: Primary CTA: "Tüm Ürünlere Göz At →" filled dark button → catalog
- [x] D-284: Secondary: "Yardım Merkezi →" text link → contact/help page
- [x] D-284: Eyebrow "KOLEKSİYON", heading "Beğendiğiniz Bir Şey Buldunuz mu?", warm tinted background
- [x] D-284: PreFooterCTA wired into homepage render with `onNav={nav}` and `settings={S}`
- [x] D-284: Browse hierarchy preserved: catalog primary, help secondary, WhatsApp in footer tertiary
- [x] D-284: Commit `de41f625` pushed to main

## Homepage Mid-Page Conversion Bridge (D-283) — COMPLETED 2026-05-11

- [x] D-283: Audit — VERIFIED: WhyUsSection and StepsSection were passive dead ends. WhyUsSection ends after 6 credibility cards with no forward path. StepsSection describes the 4-step order process starting with "browse products" but provided no link back to the catalog. Both sections explained well but left visitors stranded mid-page.
- [x] D-283: WhyUsSection: add `onNav` prop to function signature
- [x] D-283: WhyUsSection: add outline "Koleksiyonu Keşfet →" bridge button below credibility cards (guarded with `onNav &&`)
- [x] D-283: StepsSection: add `onNav` prop to function signature
- [x] D-283: StepsSection: add filled "Ürünleri Keşfet" primary button + helper text "Adım 1'den başlayın — göz atmak ücretsiz" below step cards (guarded with `onNav &&`)
- [x] D-283: WhyUsSection render call updated to pass `onNav={nav}` — bridge now active
- [x] D-283: StepsSection render call updated to pass `onNav={nav}` — bridge now active
- [x] D-283: Browse hierarchy preserved: product browsing primary, inquiry secondary, WhatsApp tertiary — no CTA conflict introduced
- [x] D-283: Both bridges guarded — zero risk if prop absent or section used outside homepage context
- [x] D-283: Commit `9ac8174` pushed to main

## Homepage Product-Section Hierarchy/Redundancy Polish (D-282) — COMPLETED 2026-05-10

- [x] D-282: Audit — VERIFIED: Popular Products and BestSellersScroll both used "POPÜLER" eyebrow. BestSellersScroll data was `slice(0,10)` — first 6 products identical to Popular grid. "Çok Satanlar" (Bestsellers) label not backed by actual sales data (risky authenticity). DiscountedSection already well-differentiated.
- [x] D-282: BestSellersScroll eyebrow: `POPÜLER` → `KOLEKSİYON` — eliminates duplicate-eyebrow confusion
- [x] D-282: BestSellersScroll title: `Çok Satanlar` → `Daha Fazlasını Keşfet` — honest discovery framing; removes unverified bestseller claim
- [x] D-282: BestSellersScroll data: `slice(0,10)` → `slice(6,18)` — shows products 7–18, zero overlap with Popular grid's first 6
- [x] D-282: BestSellersScroll empty guard added: `if (moreProducts.length === 0) return null` — consistent with DiscountedSection
- [x] D-282: Product section roles are now clearly distinct: Popular (top picks) → Koleksiyon/Daha Fazlası (discover more) → Fırsatlar (deals)
- [x] D-282: Commits `1fb915ea` (main change) + `e1d06c17` (comment fix) pushed to main
