# CLAUDE MEMORY — Uygunayakkabi (continuation summary)

_Created 2026-06-14. Compact handoff for future sessions. See PROJECT_STATE.md / DECISIONS.md / DEPLOYMENT_LOG.md / BUGS_AND_FIXES.md for detail. No secrets/PII._

## D-481 configured-database index applied and verified - 2026-07-25

- The approved concurrent partial unique index `orders_shopier_order_id_unique_idx` is now applied with SQL fingerprint `c79810ec7a084bfc`. Its post-apply read-only check passes with zero duplicate non-empty IDs, and `npm run test:shopier-webhook-local` passes locally. Live Shopier webhook delivery and application deployment remain unverified.

## D-491 order-to-lead relationship schema governance (2026-07-25) - LOCAL CODE/DOCS, NOT DEPLOYED

- `convertLeadToOrder()` now treats a missing `orders.related_inquiry_id` relationship as a safe no-write result before creating an Order, changing the lead, or recording a BotEvent. Telegram points only to the confirmation-gated relationship metadata preflight.
- `smoke:lead-conversion-schema:read` reads column/FK metadata only. The approved 2026-07-25 preflight confirmed the nullable integer relationship and exact foreign key already exist, so no DDL was needed. `db:lead-conversion-schema:apply` remains dry-run-first for a future incomplete environment and refuses incompatible existing schema. Focused test, full `npm run validate`, `npm run build`, and dry run pass; no Telegram, provider, Shopier, deployment, or commit action occurred.

## D-490 lead-status enum schema governance (2026-07-25) - LOCAL CODE/DOCS, NOT DEPLOYED

- Telegram lead-status enum drift no longer shows executable DDL. The attempted lead write stays a no-write result with no audit event and points only to the confirmation-gated read-only preflight.
- `smoke:lead-status-schema:read` reads enum metadata only. The approved 2026-07-25 preflight confirmed every declared status enum value already exists, so no DDL was needed. `db:lead-status-enum:apply` remains dry-run-first and approval-gated for a future incomplete environment. `test:lead-status-schema`, full `npm run validate`, `npm run build`, and `git diff --check` pass; no Telegram, provider, Shopier, deployment, or commit action occurred.

## D-489 confirmation-wizard schema governance (2026-07-25) - LOCAL CODE/DOCS, NOT DEPLOYED

- Ordinary Telegram confirmation no longer runs `CREATE TABLE` or `ALTER TYPE`. Wizard-session reads and row writes use the pre-provisioned `public.wizard_sessions` table; a missing table is logged as a deployment prerequisite, not created from a request.
- `smoke:wizard-sessions:schema` is confirmation-gated and metadata-only. The approved 2026-07-25 preflight confirmed `public.wizard_sessions` is complete, so no DDL was needed. `db:wizard-sessions:apply` remains dry-run-first and can create only a missing table in a future incomplete environment after separate explicit approval. `test:confirmation-wizard`, `test:runtime-smokes`, full `npm run validate`, `npm run build`, and `git diff --check` pass locally; no Telegram, provider, Shopier, deployment, or commit action occurred.

## D-488 optional OpenClaw VPS deploy guard (2026-07-25) - LOCAL CODE/DOCS, NOT DEPLOYED

- The historical `scripts/vps-deploy.sh` now refuses bare and one-flag calls before any VPS configuration write, skill copy, or container restart. It requires both `--reactivate-openclaw` and `--confirm-vps-sync` after read-only VPS verification plus a separate operator reactivation decision. `test:openclaw-vps-verification`, full `npm run validate`, `npm run build`, and `git diff --check` pass; no VPS, Telegram, provider, Shopier, deploy, or commit action occurred.

## D-487 shared Blog and PDP JSON-LD serialization (2026-07-25) - LOCAL CODE/DOCS, FOCUSED TESTS PASSED, NOT DEPLOYED

- `src/lib/structuredData.ts` now safely serializes Product/FAQ and Blog Article schema before inline rendering. `test:structured-data`, `test:blog-structured-data`, and typecheck pass; no Payload, Blog publication, provider, Shopier, dispatch, deploy, or commit action occurred.

## D-486 storefront image fallback and structured data safety (2026-07-25) - LOCAL CODE/DOCS, FOCUSED TESTS PASSED, NOT DEPLOYED

- The public PDP now prefers usable generated gallery media and falls back to original product media. Its Product JSON-LD uses the same resolved gallery and shared sellable-stock availability, while Product/FAQ schema is safely serialized. `test:product-storefront-images`, `test:product-structured-data`, `test:storefront-trust`, and typecheck pass; no database, Telegram, provider, Shopier, publish, dispatch, deploy, or commit action occurred.

## D-485 Shopier atomic floor-at-zero decrement (2026-07-25) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- The D-482 Shopier transaction now uses PostgreSQL `GREATEST(stock - quantity, 0)` arithmetic for product totals and matched variants. Concurrent distinct external orders cannot overwrite depletion and falsely retain stock; paid orders and InventoryLogs remain recorded at zero. `test:shopier-webhook-local`, full `npm run validate`, `npm run build`, and `git diff --check` pass; no live webhook, Shopier, Telegram, provider, dispatch, deploy, or commit action occurred. D-481's index is applied and post-apply verified.

## D-484 non-Shopier conditional stock reservation (2026-07-25) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- D-483's parent Payload transaction boundary now performs product-total then selected-variant conditional PostgreSQL reservations requiring `stock >= quantity`. A concurrent final-unit loss returns no row, throws, and rolls back the Order before InventoryLog creation. `test:order-stock-transaction`, full `npm run validate`, `npm run build`, and `git diff --check` pass; no live Telegram, Shopier, provider, dispatch, deploy, or commit action occurred. D-481's index is applied and post-apply verified.

## D-483 non-Shopier order stock transaction boundary (2026-07-25) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- The Orders collection now executes website/phone/Instagram/manual stock and InventoryLog work before its generic alert, retaining the parent Payload request. Missing product/size, unknown variant, and insufficient stock throw so the parent create can roll back. `test:order-stock-transaction`, full `npm run validate`, `npm run build`, and `git diff --check` pass; no DB, Telegram, Shopier, provider, dispatch, deploy, or commit action occurred.

## D-482 Shopier order transaction boundary (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- `handleOrderCreated()` now uses `runPayloadTransaction()` so the local Order create, product/variant stock decrement, and InventoryLog writes share one Payload request and commit or roll back together. It fails closed if a transaction cannot begin.
- A verified processing failure returns `500` for delivery retry. The generic Orders alert hook skips Shopier; the direct webhook Telegram alert follows commit. `test:payload-transaction`, `test:shopier-order-transaction`, `test:shopier-order-stock`, `test:shopier-order-id-unique`, `test:shopier-webhook-local`, full `npm run validate`, and `npm run build` pass. No database read, DDL, live Shopier/API, Payload write, provider, publish, or ad action occurred. D-481's index is applied and post-apply verified.

## D-481 Shopier order-ID duplicate-safety guard (2026-07-24) - INDEX APPLIED AND POST-APPLY VERIFIED, NOT DEPLOYED

- `Orders.shopierOrderId` declares uniqueness, and `handleOrderCreated()` handles a PostgreSQL duplicate-key only around `payload.create`, returning before stock decrement or Telegram notification. The approved matching partial unique index now exists in the configured database.
- `scripts/sql/d481-shopier-order-id-unique.sql` remains a dry-run-first plan for future environments. The approved apply completed with fingerprint `c79810ec7a084bfc`; its post-apply read-only check passes with zero duplicate non-empty IDs. Full `npm run validate` and `npm run build` pass. No live Shopier webhook/API, Payload write, provider, publish, or ad action occurred.

## D-480 Shopier webhook authenticity fail-closed guard (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- `src/lib/shopierWebhookSecurity.ts` verifies the existing documented HMAC-SHA256 header against the exact raw request body with constant-time comparison. Comma-separated token rotation remains supported.
- A missing `SHOPIER_WEBHOOK_TOKEN` returns `503`; missing, malformed, or invalid signatures return `401` before JSON parsing, order/stock/refund work, or Telegram notification. `test:shopier-webhook-security` is part of both `test:shopier-webhook-local` and `test:safe`; full `npm run validate` and `npm run build` pass. No live Shopier webhook/API call occurred.

## D-479 Blog editorial preflight and first-publication guard (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- `evaluateBlogPublishingPreflight()` now blocks incomplete/placeholder first BlogPost publications, sets `publishedAt` for a valid first transition, and flags AI/evidence-sensitive claim language and SEO/editorial gaps for manual review. It deliberately preserves edits to legacy already-published records.
- `/blogpreflight <id-or-slug>` and `smoke:blog-preflight:read` are read-only operator diagnostics. Public blog detail fetching now queries only published posts before metadata generation. Blog evaluator/collection/route/runtime governance checks, full `npm run validate`, and `npm run build` pass; no live Telegram, Payload, provider, publication, n8n, OpenClaw, Shopier, dispatch, or ad action occurred.

## D-478 provenance review delivery idempotency (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- Confirmed `/brandreview` now stores an opaque Telegram update key in the BotEvent payload. A replay of that delivery returns the existing review instead of adding a duplicate audit record.
- This is audit reliability only: it never updates a product, bypasses brand safety, publishes, dispatches, queues Shopier, calls providers, or spends. Focused provenance tests, full `npm run validate`, and `npm run build` pass; no live Telegram, Payload, provider, Shopier, n8n, OpenClaw, publish, dispatch, or ad action occurred.

## D-477 protected-brand provenance review audit (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` first returns a preview. Its explicit confirmation writes one PII-light `brand_safety.provenance_reviewed` BotEvent; it never updates a product or clears the protected-brand activation/public-storefront gate.
- `/brandplan` and `smoke:brand-safety:read` now surface the latest valid audit record beside each protected-brand queue item. `test:brand-provenance-review`, `test:brand-provenance-command`, `test:brand-safety-plan`, full `npm run validate`, and `npm run build` pass; no live Telegram invocation, Payload write, provider, Shopier, n8n, OpenClaw, publish, dispatch, or ad action occurred.

## D-476 Catalog risk-first loading-plan order (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- `/loadplan`, `/loadingplan`, and the matching read-only runtime smoke now rank active protected-brand exposure ahead of draft protected-brand backlog before considering secondary blocker count; rows show status for the same reason.
- `test:loading-plan`, full `npm run validate`, and `npm run build` pass. The plan remains read-only: no product write, queue, publish, dispatch, provider/Shopier call, Telegram live invocation, n8n action, OpenClaw action, or ad spend occurred.

## D-475 Direct Telegram UTM guard (2026-07-24) - LOCAL CODE/DOCS, FULL VALIDATION/BUILD PASSED, NOT DEPLOYED

- `/utm` previously created a copy-ready product URL from the matching slug alone. It now uses `evaluateProductUtmEligibility()` before URL construction, requiring a slug, `status='active'`, and the same public storefront safety condition used by PDPs and ad readiness.
- `test:utm-builder` and `test:utm-command` are part of `test:safe`; full `npm run validate` and `npm run build` pass. The command is still read-only; no product write, job queue, publish, dispatch, provider call, Shopier call, Telegram live invocation, n8n action, OpenClaw action, or ad spend occurred.

## D-474 Safe public PDP link policy (2026-07-24) - LOCAL CODE/DOCS, FOCUSED VALIDATION PASSED, NOT DEPLOYED

- `isPublicStorefrontProduct()` now centralizes the combined public lifecycle and storefront safety policy. Brand remediation, loading plans, Shopier previews, operator inbox, lead/order desks, and manual ad readiness keep Payload admin links but suppress public PDP and UTM examples for placeholder or protected-brand records.
- This is display/diagnostic safety alignment only: no Payload record changed, and no queue, publish, dispatch, provider call, Shopier call, Telegram command, n8n action, OpenClaw action, or ad spend occurred.
- Focused policy tests, full `npm run validate`, and `npm run build` pass.

## D-463 Mentix skill runtime-truth reconciliation (2026-07-24) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED

- Hermes/Mentix is the current operator-control layer. OpenClaw-related repo files are optional historical templates and do not prove a VPS service exists, is installed, or is running.
- Skill boundaries: product-flow diagnostic/read-only; upload/research operator-reviewed drafting; backend advisory/no deploy implication; memory limited to durable PII-light project decisions in `project-control/` plus the relevant ChatGPT source document.
- Mentix/VPS, source/release/PR, retired-channel, n8n, ops, typecheck, lint, `git diff --check`, and full `npm run validate` passed locally with 0 lint errors / 71 warnings; no OpenClaw VPS, live Telegram, n8n, provider, Shopier, publishing, or ad action occurred.

## D-462 BlogPosts featured-image schema drift repair (2026-07-24) - APPLIED TO CONFIGURED DATABASE, CODE NOT DEPLOYED

- A local build found `blog_posts.featured_image_id` missing although `BlogPosts.featuredImage -> media` is already declared. Sitemap blog routes safely omitted instead of failing while the schema drift existed.
- `smoke:blog-schema:read` is a confirmation-gated metadata-only PostgreSQL preflight; it never writes or imports Payload.
- `db:blog-featured-image:apply` is dry-run by default. Confirmed additive DDL requires `--apply --confirm-apply-d462-blog-featured-image-schema` and explicit operator approval.
- The approved 2026-07-24 migration added the nullable integer field, exact `ON DELETE SET NULL` foreign key, and supporting index to the configured database. The post-apply metadata preflight passes and the following build has no schema fallback warning. The helper remains dry-run by default for any other environment.

## D-461 Control-truth Memory Lock reconciliation (2026-07-24) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- The two session-start Memory Lock files now agree with AGENTS/CLAUDE/source-pack truth: Payload/Next executes commerce work, Hermes is current, OpenClaw is historical/optional, n8n is optional glue with direct Payload/Next as default, and SupplierScout is dormant.
- `test:retired-channels` now rejects the stale live Telegram-to-OpenClaw-to-n8n-to-Payload claim plus current OpenClaw/n8n wording; `test:n8n-optional` and `test:mentix-skills` cover the adjacent boundaries.
- Validation passed: focused control checks, source/release/PR/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`. No live service, VPS, webhook, n8n, OpenClaw, SupplierScout, retired-channel, or ad action occurred.

## D-460 Product-flow dispatch recovery paths (2026-07-24) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productFlowSnapshot.ts` now returns a deterministic `nextAction` for every non-published active-channel dispatch row.
- `/productflow`, `/flow`, and `smoke:product-flow:read` show the recovery command beside the actual state/reason; queued Shopier stays on `/shopier dashboard`, ready-but-unrecorded Shopier stays on the shared guarded publish path, and failed external rows only suggest redispatch after the recorded cause is fixed.
- Guardrail: the diagnostic never executes its suggestion. No product/lead/order write, stock change, queue job, publish, redispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, PR, or optional OpenClaw sync.
- Validation passed: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, source/release/PR/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-459 Product-flow dispatch summary (2026-07-18) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productFlowSnapshot.ts` now returns `channels.dispatchSummary` with active-channel published/queued/failed/blocked/not-configured/unrecorded counts derived from dispatch rows.
- `/productflow`, `/flow`, and `formatProductFlowSnapshot()` show the dispatch summary before full dispatch rows.
- `scripts/product-flow-runtime-smoke.ts` prints `dispatchSummary` for `smoke:product-flow:read`.
- Guardrail: read-only product-flow diagnostics only. No product/lead/order write, stock change, queue job, publish, redispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, PR, or optional OpenClaw sync.
- Validation passed: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-458 Product-flow checklist summary (2026-07-18) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productFlowSnapshot.ts` now returns `checklistSummary` with done/next/blocked/needs-work counts derived from the staged operator checklist.
- `/productflow`, `/flow`, and `formatProductFlowSnapshot()` show the checklist summary before the full checklist.
- `scripts/product-flow-runtime-smoke.ts` prints `checklistSummary` for `smoke:product-flow:read`.
- Guardrail: read-only product-flow diagnostics only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, PR, or optional OpenClaw sync.
- Validation passed: `npm run test:product-flow-snapshot`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-457 Loading-plan focus details (2026-07-18) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productLoadingPlan.ts` now returns `batchSummary.focus.queue` entries with each focus product ref, safe read command, and reason list.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` show focus detail rows beside the D-456 focus queue so operators know why each product appears.
- `scripts/load-plan-runtime-smoke.ts` prints `focusDetails` for `smoke:load-plan:read`.
- Guardrail: read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-456 Loading-plan focus queue (2026-07-18) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productLoadingPlan.ts` now returns `batchSummary.focus.refs` and `batchSummary.focus.nextSafeReads`.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` show matching focus refs and a short safe-read command queue for the D-455 bottleneck.
- `scripts/load-plan-runtime-smoke.ts` prints the same `focusRefs` and `focusQueue` fields for `smoke:load-plan:read`.
- Guardrail: read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-455 Loading-plan batch focus (2026-07-18) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productLoadingPlan.ts` now returns `batchSummary.focus` derived from the first product worklist.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` show a deterministic focus kind, operator label, reason, and next safe read before product rows.
- `scripts/load-plan-runtime-smoke.ts` prints the same focus fields for `smoke:load-plan:read`.
- Guardrail: read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-454 Loading-plan batch summary (2026-07-18) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productLoadingPlan.ts` now returns a `batchSummary` derived from the first product worklist.
- `/loadplan`, `/loadingplan`, and `formatProductLoadingPlan()` show worklist candidate count, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first repo-side product-flow smoke command.
- `scripts/load-plan-runtime-smoke.ts` prints the same summary fields for `smoke:load-plan:read`.
- Guardrail: read-only catalog planning only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-453 Source-pack latest-boundary guardrail (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `test:source-pack` now requires `17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md` to say `Latest local boundary: D-453.`
- The guard keeps the actual `/smokeplan` title boundary at `Operator Live Smoke Plan (D-389/D-452)`.
- It requires the release/PR stack wording to say D-380-D-406 plus D-422-D-453.
- It rejects stale current-D-449 smoke-plan wording and D-422-D-451 stack wording in next-sprint notes.
- Guardrail: source-pack/docs governance only. No runtime behavior change, product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-452 Ad-readiness storefront trust hint (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/adready` now adds `npm run test:storefront-trust` to `Next safe reads` for review/ready products, before `/adpack <ref> manual_ads` and `/adreport week`.
- Blocked products still point to `/productflow <ref>` and `/imageplan <ref>` when relevant, without showing the ad-pack path.
- `/smokeplan` formatter now renders `Operator Live Smoke Plan (D-389/D-452)`.
- Purpose: keep the D-451 PDP conversion/trust guardrail visible at the manual ad decision surface.
- Guardrail: read-only operator guidance only. No product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:ad-readiness`, `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-451 PDP conversion trust guardrail (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `test:storefront-trust` now also checks `src/app/(app)/products/[slug]/page.tsx`.
- The guard pins buyer-facing PDP essentials: draft products stay hidden, `ProductImages` remains mounted, variant-backed size/stock clarity uses `SizeChip` and `OOSChip`, `ContactForm` receives product/sold-out context, WhatsApp and Shopier CTAs remain safely gated, FAQ fallback remains, and similar products stay active-status plus merchandising gated.
- Purpose: keep Phase 6 storefront conversion and Phase 8 paid-traffic preflight from silently losing the buyer path.
- Guardrail: local file-content validation only. No build, DB read, network call, product/lead/order write, stock change, queue job, publish, dispatch, provider call, Shopier call, ad-platform call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-450 Retired-channel memory-lock guardrail (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `test:retired-channels` now checks `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md`.
- The Memory Lock files must keep active channels as Website/Instagram/Facebook/X/Shopier and say Dolap/Threads are retired.
- The guardrail blocks Memory Lock wording that describes Dolap/Threads as scaffolded, planned, active, future development, or remaining-channel work.
- Purpose: prevent future sessions from inheriting old March channel scaffolding truth.
- Validation passed: `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-449 Operator smoke-plan latest-boundary label (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` formatter now renders `Operator Live Smoke Plan (D-389/D-449)`.
- `src/lib/operatorSmokePlan.test.ts` expects the D-449 title so stale smoke-plan labels are caught.
- Purpose: keep the operator-facing live-smoke checklist aligned with D-448 `/adready` safe next-read guidance and the latest local release/PR handoff boundary.
- Guardrail: read-only/operator-controlled visibility only. No smoke-order change, product/lead/order writes, stock changes, queue jobs, publish, dispatch, provider calls, Shopier calls, ad-platform calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-448 Ad-readiness next-action hints (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/adready` now adds `Next safe reads` based on readiness state.
- Blocked products point to `/productflow <ref>` and, when media is not ad-ready, `/imageplan <ref>`.
- Review/ready products point to read-only `/adpack <ref> manual_ads` and `/adreport week`.
- `src/lib/adReadiness.test.ts` covers the hints and blocks unsafe command suggestions.
- Guardrail: read-only/operator-controlled visibility only. No product/lead/order writes, stock changes, queue jobs, publish, dispatch, provider calls, Shopier calls, ad-platform calls, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:ad-readiness`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-447 Funnel snapshot next-action hints (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/funnel` now adds `Next safe reads` when lead-source, order, or UTM attribution evidence implies follow-up.
- Hints stay read-only: `/leadplan` for open funnel leads, `/orders` for converted/direct orders, and `/adreport week` for UTM-attributed campaign review.
- `src/lib/funnelDesk.test.ts` covers the hints and blocks unsafe command suggestions.
- Guardrail: read-only visibility only. No lead/order/product writes, stock changes, queue jobs, publish, dispatch, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:funnel-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-446 Business snapshot next-action hints (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/business` now adds `Next safe reads` when Payload urgency counts imply follow-up.
- Hints stay read-only: `/leadplan` for open/stale leads, `/orderreminders` for stale shipped orders, `/orders` for open orders, and `/inbox stock` for sold-out/low-stock products.
- `src/lib/businessDesk.test.ts` covers the hints and blocks unsafe command suggestions.
- Guardrail: read-only visibility only. No lead/order/product writes, stock changes, queue jobs, publish, dispatch, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:business-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-445 Order desk operator links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts now include direct operator context links.
- `src/lib/orderDesk.ts` owns `buildOrderOperatorLinks()` for order-admin, related product-admin, related lead-admin, and public-status-only PDP links.
- `src/lib/orderDesk.test.ts` covers public/draft link gating, formatter output, and no unsafe action commands alongside the existing order lifecycle policy checks.
- Guardrail: read-only visibility only. No order status writes, stock restores, customer messages, queue jobs, publish, dispatch, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-444 Lead desk operator links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts now include direct operator context links.
- `src/lib/leadDesk.ts` owns `buildLeadOperatorLinks()` for lead-admin, related product-admin, and public-status-only PDP links.
- `src/lib/leadFollowupPlan.ts` reuses the same helper, keeping lead follow-up and lead desk link behavior aligned.
- `src/lib/leadDesk.test.ts` and `npm run test:lead-desk` cover public/draft link gating, formatter output, and no unsafe action commands.
- `test:lead-desk` is included in `test:safe`.
- Guardrail: read-only visibility only. No lead writes, customer messages, queue jobs, publish, dispatch, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:lead-desk`, `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-443 Operator inbox product links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` product rows now include direct product context links.
- `src/lib/operatorInbox.ts` appends Payload admin links for product rows and public PDP links only for public product statuses.
- `src/lib/operatorInbox.test.ts` and `npm run test:operator-inbox` cover public/draft link gating, formatter reuse, and no unsafe action commands.
- `test:operator-inbox` is included in `test:safe`.
- Guardrail: read-only visibility only. No product writes, activation, queue jobs, publish, dispatch, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-inbox`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-442 Lead follow-up operator links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/leadplan` and `/followupplan` now render direct operator context links beside suggested manual lead commands.
- `src/lib/leadFollowupPlan.ts` adds `operatorLinks` with lead-admin, related product-admin, and public-status-only PDP links.
- `src/lib/leadDesk.ts` preserves related product slug/status when depth-loaded from Payload.
- `smoke:lead-followup:read` prints the same links in the PII-light terminal summary without customer names or phones.
- Guardrail: read-only visibility only. No lead writes, customer messages, provider calls, Shopier calls, ad-platform API calls, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-441 Shopier preview credential holds (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- Shopier publish/retry preview rows now show credential readiness before confirm actions.
- `src/lib/shopierPublishControl.ts` adds a preview-only `Credential hold` line when `shopierPatConfigured` is supplied.
- Telegram `/shopier publish-ready` and `/shopier retry-errors` pass `SHOPIER_PAT` presence into preview formatters.
- `smoke:shopier:read` mirrors the same credential hold hints for publish-ready and retry previews.
- Missing credentials keep preview available but tell operators to configure `SHOPIER_PAT`; configured credentials still tell operators to verify webhook/account/quota outside chat.
- Confirmed queue/retry output stays free of preview-only credential hints and still uses the existing credential gate.
- Guardrail: preview guidance only. No secret values printed, direct Shopier call, provider call, publish, redispatch, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-440 Shopier preview/dashboard operator links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- Shopier preview/dashboard review rows now include read-only operator handoff links.
- `src/lib/shopierPublishControl.ts` adds `operatorLinks.adminUrl` for products with an id.
- `operatorLinks.productUrl` is only present when the product has a slug and public status (`active`, `soldout`, or `sold_out`), so draft/blocked rows do not look public.
- `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows show a `Links:` line beside the existing `/productflow` and runtime smoke handoffs.
- Confirmed queue/retry output stays free of preview-only link lines.
- Guardrail: read-only preview/review handoff only. No direct Shopier call, provider call, publish, redispatch, ad-platform API call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-439 Loading-plan worklist operator links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- Product Loading Plan worklist rows now include read-only operator handoff links.
- `src/lib/productLoadingPlan.ts` adds `operatorLinks.adminUrl` for products with an id.
- `operatorLinks.productUrl` is only present when the product has a slug and public status (`active`, `soldout`, or `sold_out`), so draft rows do not look public.
- Telegram `/loadplan` and `/loadingplan` show a `links:` line beside the existing suggested command, `/productflow`, and runtime smoke command.
- `smoke:load-plan:read` prints the same admin/PDP link evidence.
- Guardrail: read-only diagnostics/handoff only. No product write, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-438 Product Flow Snapshot operator links (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- Product Flow Snapshot now includes read-only operator handoff links.
- `src/lib/productFlowSnapshot.ts` adds `operatorLinks.adminUrl` for products with an id.
- `operatorLinks.productUrl` is only present when the product has a slug and public status (`active`, `soldout`, or `sold_out`), so draft products do not look public.
- Telegram `/productflow` and `/flow` inherit the `Operator Links` block through `formatProductFlowSnapshot()`.
- `smoke:product-flow:read` prints the same admin/PDP link evidence.
- Guardrail: read-only diagnostics/handoff only. No product write, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:product-flow-snapshot`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-437 Operator smoke-plan Telegram access preflight (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes `npm run test:telegram-access` after the repo load-plan runtime smoke and before the first live Telegram `/loadplan` read.
- This keeps private Telegram DM allowlist behavior visible before any live Telegram operator read.
- Guardrail: read-only checklist/handoff only. No product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:telegram-access`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-436 Operator smoke-plan sitemap preflight (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes `npm run test:sitemap-entries` after `npm run test:attribution` and before manual ad-readiness checks.
- This keeps static route, website-visible product, and blog sitemap/degrade-safe checks in the paid-traffic preflight sequence.
- Guardrail: read-only checklist/handoff only. No product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:sitemap-entries`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-435 Operator smoke-plan attribution preflight (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes `npm run test:attribution` after `npm run test:inquiry-guard` and before manual ad-readiness checks.
- This keeps first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge checks in the paid-traffic preflight sequence.
- Guardrail: read-only checklist/handoff only. No product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:attribution`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-434 Operator smoke-plan inquiry guard preflight (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes `npm run test:inquiry-guard` after `npm run test:storefront-trust` and before manual ad-readiness checks.
- This keeps honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback checks in the paid-traffic preflight sequence.
- Guardrail: read-only checklist/handoff only. No product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:inquiry-guard`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-433 Operator smoke-plan storefront trust preflight (2026-07-16) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes `npm run test:storefront-trust` after lead visibility and before manual ad-readiness checks.
- This keeps the fake-review/placeholder-testimonial storefront guard in the paid-traffic preflight sequence.
- Guardrail: read-only checklist/handoff only. No product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:storefront-trust`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-432 Operator smoke-plan manual ad preflight alignment (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes read-only manual ad readiness and ad performance checks after lead visibility and before Shopier queue preflights.
- Sequence added: `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week`.
- Guardrail: read-only checklist/handoff only. No product write, lead/order mutation, job queue, publish, redispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-431 Operator smoke-plan Shopier credential hold (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes a dedicated operator hold after Shopier row product-flow handoffs and before final queue approval.
- The hold tells operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action.
- Guardrail: read-only checklist/handoff only. No secret read, product write, job queue, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-430 Operator smoke-plan Shopier handoff alignment (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/smokeplan` now includes a dedicated operator hold after Shopier dashboard/publish-ready/error/retry preview reads.
- The hold tells operators to run row-provided `/productflow <ref>` and repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.
- Guardrail: read-only checklist/handoff only. No product write, job queue, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-429 Shopier preview product-flow handoff (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `/shopier publish-ready` and `/shopier retry-errors` previews now show `/productflow <ref>` plus repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before confirm.
- Confirmed queue/retry outputs do not repeat the preflight rows after queueing.
- Telegram previews can render without `SHOPIER_PAT`; only the `confirm` forms are blocked when `SHOPIER_PAT` is missing.
- Guardrail: read-only preview/preflight by default. No product write, job queue outside explicit confirm, publish, redispatch, provider call, direct Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:shopier-commands`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:runtime-smokes`, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-428 Shopier dashboard product-flow handoff (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/shopierPublishControl.ts` now adds `flowCommand` and `runtimeFlowCommand` to each Shopier dashboard batch review row.
- `/shopier dashboard` and `smoke:shopier:read` show `/productflow <ref>` plus repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` beside the row's existing next action.
- Guardrail: read-only visibility/preflight only. No product write, job queue, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:shopier-publish-control`, `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, release/PR/source-pack governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-427 Load-plan runtime product-flow handoff (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productLoadingPlan.ts` now adds `runtimeFlowCommand` to each first product worklist item.
- `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` show both Telegram `/productflow <ref>` and repo `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight commands.
- `scripts/load-plan-runtime-smoke.ts` prints `flow=` and `smoke=` lines for each worklist item so terminal operators can copy the exact next read-only product-flow check.
- Guardrail: read-only planning/preflight only. No product write, job queue, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, `npm run test:runtime-smokes`, `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-426 Operator smoke-plan load-plan handoff alignment (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/operatorSmokePlan.ts` now places the worklist-selected `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` checks immediately after repo/Telegram `/loadplan`.
- Provider-health runtime smoke and Telegram `/diagnostics` now run after the D-425 `/loadplan` -> `/productflow` handoff, so the first live-smoke product preflight follows the daily loading worklist.
- Guardrail: read-only checklist only. No product write, job queue, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-425 Load-plan product-flow handoff (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productLoadingPlan.ts` now adds `flowCommand` to each first product worklist item.
- Telegram `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` show `/productflow <ref>` beside the suggested fix command, so catalog loading can move through the D-424 primary operator step before manual follow-up.
- Guardrail: read-only planning only. No product write, job queue, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:loading-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-424 Product-flow primary operator step (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productFlowSnapshot.ts` now derives `primaryOperatorStep` from the ordered checklist.
- Telegram `/productflow`, `/flow`, and `smoke:product-flow:read` inherit/surface the same primary step before the full checklist.
- Guardrail: read-only diagnostics only. No product write, job queue, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:product-flow-snapshot`, runtime-smoke governance, source-pack, Mentix skill, ops-runbook, release/PR governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-423 Product-flow checklist dependency ordering (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productFlowSnapshot.ts` now keeps checklist commands in workflow order: confirm before content, content trigger/retry before audit.
- Telegram `/productflow`, `/flow`, and `smoke:product-flow:read` inherit this because they use the same formatter/helper.
- Guardrail: read-only diagnostics only. No product write, job queue, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:product-flow-snapshot`, source-pack, Mentix skill, ops-runbook, runtime-smoke, release/PR governance, `npm run typecheck`, `npm run lint` with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-422 Product-flow operator checklist (2026-07-12) - LOCAL CODE/DOCS, VALIDATED, NOT DEPLOYED
- `src/lib/productFlowSnapshot.ts` now includes `operatorChecklist` rows for Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant.
- Telegram `/productflow` and `/flow` inherit the checklist through the shared formatter; `smoke:product-flow:read` prints it through `scripts/product-flow-runtime-smoke.ts`.
- Guardrail: read-only diagnostics only. No product write, job queue, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, ad spend, deploy, or PR.
- Validation passed: `npm run test:product-flow-snapshot`, source-pack, Mentix skill, ops-runbook, runtime-smoke, release/PR governance, `npm run validate` with lint at 0 errors / 71 warnings, and `git diff --check`.

## 2026-07-11 Hermes control layer reconciliation - LOCAL DOC/GOVERNANCE, VALIDATED, NOT DEPLOYED
- Current truth being enforced: Hermes is the current agent-control layer; Mentix/Uygunops is the Telegram-facing operator identity/interface; Payload/Next remains source of truth/execution; OpenClaw is historical/optional unless explicitly reactivated.
- `test:openclaw-vps-verification` remains standalone for optional OpenClaw reactivation review and is not part of normal `test:safe` while Hermes is current.
- Scope: docs/governance only. No runtime commerce/image/ads code, no provider/Shopier/Telegram live action, no deploy, no commit/PR.
- Validation passed: source-pack, Mentix skill, standalone optional OpenClaw verification, release/PR, ops governance, typecheck, lint with 0 errors / 71 warnings, `git diff --check`, and full `npm run validate`.

## D-413..D-419b Image system DEPLOYED + iterated live (2026-07-07) - IN PRODUCTION (remote main d4ec174)
- The whole D-407..D-419b image stack went to prod the same day via clean-worktree deploys (full records: DECISIONS.md D-413..D-419b). Chain: 718398b (regressed) → 97d3a9d (rollback) → fb5585a → 6c26607 → 9dbc0c0 → 993c229 → bf53eed → 53edf20 → 493fbea → b1eca9d → 65e1546 → d66bd32 → d4ec174.
- Final live state (operator-CONFIRMED on real #gorsel output): slot order `side(1, single, MAIN kanal görseli) · hero_3q(2, ÇİFT) · top(3, ÇİFT) · back(4, arka 3/4) · detail(5)`; pairs are MODEL-generated (PAIR_MODE_FINAL_BLOCK + colour lock — mirror/duplicate both rejected on real output); crop-window + density-bbox centering (no frame artifacts); normalizeBackground unifies bg across slots (partial correction, no overshoot); brand gate REMOVED per operator (D-415: markalı ürün → markalı üretilir; imageBrandGate.ts retained unused).
- NOT deployed: package.json test wiring (test:image-slot-contract/image-centering/image-brand-gate scripts are local-only; the .test.ts FILES are on remote), all project-control/docs, channelDispatch comment fix. Local main (8a9cfcb) far behind remote — reconcile carefully; working tree still carries the uncommitted D-380..D-406 stack (never blanket-commit).

## D-412 Second-shoe (anchor bleed) fix + detail sharpness + centering guarded off (2026-07-07) - LOCAL, SUPERSEDED (deployed & evolved via D-413..D-419b)
- 2nd/ghost shoe in Slot 4/5 → FIXED: removed D-355H/M anchor-image feeding (generated hero/side were fed as extra refs to later slots, Gemini composited them as a 2nd shoe). `generateByGeminiPro` now uses only the ORIGINAL reference(s) per slot; material consistency rests on prompt locks.
- Close-up blur → SHARPNESS clause added to `detail` slot compositionIntent (live-verify).
- Centering (D-408) → VERIFIED on operator's 5 real SN0088 images + RE-ENABLED (default on; `IMAGE_CENTERING_ENABLED=0` to disable). Net-positive: scales up small/off-center shoes + centers, safe no-op otherwise. Now samples actual corner bg (median, robust to SN-pill corner). Limits: does NOT remove image-in-image FRAME artifacts (generation/anti-frame concern), shadow inflates bbox slightly. Perfect centering would need @imgly segmentation (future, live-test). NOTE: the 5 real images (SN0088) are the DECENT-framed set (metal/blur/2nd-shoe defects) — the earlier "tiny floating" set was a different/older generation.
- `npm run validate` PASS. Nothing deployed; prod still rolled back. Redeploy only after live verification of the whole bundle.

## D-411 Brand-safety gate for image gen + hardware-consistency (2026-07-07) - LOCAL CODE, NOT DEPLOYED
- From real SN0088 output: generated images reproduce "BOSS" wordmark + metal logo plate, metal inconsistent across slots. `#gorsel` had NO brand gate (and protectedZones actively PRESERVES brand marks).
- Part A (deterministic, tested): new `src/lib/imageBrandGate.ts` `evaluateImageBrandGate()` → `imageGenTask` Step 2 BLOCKS gen for protected-brand products (BOSS/Nike/etc. via `scanProductBrandSafety`), marks job failed + Telegram notice, fails fast before provider calls. Mirrors storyDispatch D-381. `test:image-brand-gate` (6 checks). Limit: text scan only (can't catch photo-only marks).
- Part B (prompt, LIVE-VERIFY only): HARDWARE CONSISTENCY line in `VISUAL_FACT_LOCK_BLOCK` — hardware identical across all slots, never invented/omitted/varied.
- `npm run validate` PASS. NOT deployed (prod image system is rolled back). Open: hard-block vs de-brand policy — defaulted to block. Other open defects to fix next: 2nd-shoe anchor bleed (Slot 4/5), close-up blur.

## D-410 Slot set revised: 3/4 hero replaces dead-on front (2026-07-07) - LOCAL CODE, NOT DEPLOYED
- Operator delegated "do what's best". Revised the D-407 slot set to shoe-optimal angles: `hero_3q, side, top, back, detail` (was `front, side, top_pair, heel, material_detail`).
- Only real change: dead-on `front` → THREE-QUARTER hero (`hero_3q`) — a shoe head-on is flat; 3/4 (front+one side) is the strongest catalog hero. Others just renamed (top_pair→top, heel→back, material_detail→detail).
- Rejected `sole`/outsole for slot 5: model would risk fabricating tread not in the reference (forbidden). Kept visible-material `detail`.
- `imageSlotContract.ts` updated (hero_3q gets 3/4 intent, still geometry-free per D-407; D-408 centers it). Downstream keys updated: anchors, detail special-case, disabled SHOT_CRITERIA. Contract test updated. `npm run validate` PASS. Not committed/pushed/deployed.

## D-409 Faster preview: fewer Vision calls + slim keyboard (2026-07-07) - LOCAL CODE, NOT DEPLOYED
- Operator: live gen hits Gemini rate-limits ("model provider is rate-limiting") + approval flow has excess.
- (a) Removed per-slot `checkShotCompliance` from `generateByGeminiPro` (imageProviders.ts). Redundant after D-407 loose-composition + D-408 deterministic centering; it also drove extra regenerations. Retry now fires ONLY on colour drift or brand-zone drift. `checkShotCompliance`+`SHOT_CRITERIA` kept but disabled (eslint-ignored) for easy re-enable. OpenAI path already had no shot check. Colour + gated brand checks unchanged.
- (b) Slimmed Telegram approval keyboard (imageGenTask.ts `sendApprovalKeyboard`): removed legacy 1+2/1+3/2+3 combo row and "🌟 4-5 Gemini Pro Üret" up-sell row (dead now the standard pack always makes 5). Kept: Tümünü Onayla, per-image buttons, Yeniden Üret, Reddet. Partial approval still works via text `onayla 1,3,5`; route.ts unchanged.
- Net: fewer Gemini requests/run → fewer 429s + faster time-to-preview. `npm run validate` PASS. Not committed/pushed/deployed.

## D-408 Deterministic centering/scale lock (2026-07-07) - LOCAL CODE, NOT DEPLOYED
- Operator complaint from live Telegram output: shoes not equally centered/scaled across slots (biri çok yakın, biri çok uzak). Prompt-level centering (STUDIO_STANDARD) does NOT hold — model ignores it. Fix is pixel-level.
- New `src/lib/imageCentering.ts`: `normalizeProductCentering()` detects the product bbox vs the uniform ivory bg (#F4EFE6), rescales the longer side to the slot's locked `frameCoverage`, and centers it on a fresh ivory canvas. Pure sharp, deterministic, safe fallbacks (returns original on error / no subject / frame-filling detail / tiny noise).
- `imageSlotContract.ts`: each slot has locked `frameCoverage` (full-shoe 0.82; `material_detail` 0.94 → normally skipped, stays full-bleed) + `frameCoverageForIndex()`; validated.
- `imageGenTask.ts`: Step 6a2 runs the centering lock over every generated buffer (both providers) BEFORE the stock-number overlay (so the corner badge doesn't skew bbox).
- New `test:image-centering` (8 checks incl. proof that a too-close and a too-far shot normalize to the SAME scale). `npm run validate` PASS. Not committed/pushed/deployed.
- NEXT (operator priority): speed up preview/approval flow + remove redundant steps.

## D-407 Fixed 5-slot generated-image contract (2026-07-07) - LOCAL CODE, NOT DEPLOYED
- New single source of truth `src/lib/imageSlotContract.ts`: fixes the 5 slot types + order (`front, side, top_pair, heel, material_detail`), the shared centering/framing discipline (`CENTERING_FRAMING_BLOCK`), and `SLOT_PROMPT_VERSION='slotset-v1'`. Exact camera angle/geometry is deliberately left to the model (removed old hardcoded 90°/toe-LEFT/cm slot geometry).
- `src/lib/imageProviders.ts`: `EDITING_SCENES` now derives from `GENERATED_SCENES`; `SHOT_CRITERIA` rewritten to the 5 new keys with loose purpose/centering rules; anchor sources + D-201 side-orientation auto-fix remapped to `front`/`side`/`material_detail`.
- `src/jobs/imageGenTask.ts`: slot names/labels from the contract; captures `sourceImageId` (primary reference media id); stamps per-image metadata (slotIndex, slotKey, promptVersion, productId, sourceImageId, mediaId) into the job's existing `promptsUsed`/`providerResults` JSON — NO Payload schema change.
- New `src/lib/imageSlotContract.test.ts` wired as `test:image-slot-contract` in the safe suite (17 checks). `imagePromptBuilder.ts` marked legacy (not the generation path).
- Preserved: generated images stay in `generativeGallery` only; operator preview/approve/regenerate; all v50 lock + identity/material/visual-fact (D-355N)/protected-zone/anti-frame locks. `npm run validate` PASS. Not committed/pushed/deployed.

## D-406 Shopier runtime-smoke batch review alignment (2026-07-06) - LOCAL CODE, NOT DEPLOYED
- Updated `scripts/shopier-operator-smoke.ts` so `smoke:shopier:read` builds `reviewRows` with `buildShopierDashboardReviewRows()` and passes them to `formatShopierOperatorDashboard()`.
- The repo-side Shopier smoke now mirrors Telegram `/shopier dashboard` batch review sample rows before live Telegram reads.
- Updated `test:runtime-smokes` governance to require the Shopier smoke script to keep `buildShopierDashboardReviewRows`, `reviewRows`, and batch review sample wording.
- Guardrail: no product write, no Shopier job queue, no Shopier API call, no provider call, no external dispatch, no SupplierScout activation, no retired-channel activation, no ad spend, and no schema push.
- Validation passed: runtime-smoke governance, source-pack, release/PR/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.

## D-405 Image-plan runtime smoke (2026-07-06) - LOCAL CODE, NOT DEPLOYED
- Added `scripts/image-plan-runtime-smoke.ts` and package script `smoke:image-plan:read`.
- The smoke mirrors Telegram `/imageplan` by reading one Payload product plus recent `image-generation-jobs`, then building the shared `imageRegenerationPlan` output.
- It requires `--product=<id-or-sn>` and `--confirm-read-only`, forces `PAYLOAD_DB_PUSH=false`, and refuses mutation, queue, publish, dispatch, provider, Shopier, SupplierScout, retired-channel, spend, or schema-push paths.
- `/smokeplan` now places `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` before Telegram `/imageplan <id-or-sn>`.
- Guardrail: no product write, no image-generation queue, no provider call, no publish, no dispatch, no Shopier call, no SupplierScout activation, no retired-channel activation, no ad spend, and no schema push.
- Validation passed: no-connect help, runtime-smoke governance, operator-smoke-plan, release/PR/source-pack/ops governance, `typecheck`, `lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.

## D-404 Image regeneration plan (2026-07-06) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/imageRegenerationPlan.ts` and `src/lib/imageRegenerationPlan.test.ts`.
- Added Telegram `/imageplan <sn-or-id>` and `/regenplan <sn-or-id>` as read-only guidance for Image QC REVIEW/FAIL, rejected visuals, active generation jobs, preview approval/regeneration, and original-only products.
- `/imageplan` reads product media, `imageQuality`, workflow `visualStatus`, and recent `image-generation-jobs`, then suggests manual next commands such as `onayla`, `yeniden uret`, `#gorsel`, `/imageqc`, and `/productflow`.
- `/smokeplan` now includes `/imageplan <id-or-sn>` after `/productflow`.
- Added package script `test:image-regeneration-plan` and included it in `test:safe`.
- Guardrail: no product write, no image-generation queue, no Gemini/provider call, no publish, no dispatch, no Shopier call, no SupplierScout activation, no retired-channel activation, and no ad spend.
- Validation passed: `npm run test:image-regeneration-plan`, `npm run test:operator-smoke-plan`, release/PR/source-pack/ops governance, `npm run typecheck`, `npm run lint` with 0 errors / 70 warnings, `git diff --check`, and full `npm run validate`.

## D-403 Provider reality audit (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Added `project-control/PROVIDER_REALITY_AUDIT.md` to document that local env readiness is not production provider readiness.
- Added `scripts/provider-reality-governance.ts`, package script `test:provider-reality`, and `test:safe` coverage.
- Covers Website, Instagram, Facebook, X, Shopier, Gemini, Google Vision, DataForSEO, SerpAPI, reverse-search selection, and n8n fallback webhooks.
- Guardrail: no env load, secret print, provider call, credit spend, queue write, publish, live Telegram action, Shopier action, SupplierScout activation, retired-channel activation, external dispatch, or ad spend.
- Validation passed: `npm run test:provider-reality`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, Product Intelligence provider-health, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-402 Historical soak-script quarantine (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Added `project-control/HISTORICAL_SOAK_SCRIPTS.md` to document `scripts/d*-soak*.ts` as historical live-data soak harnesses, not validation and not read-only runtime smokes.
- Added `scripts/soak-script-governance.ts`, package script `test:soak-scripts`, and `test:safe` coverage.
- Guardrail: no soak run, live data connection, write, provider call, Shopier call, queue write, SupplierScout activation, retired-channel activation, external dispatch, or ad spend.
- Validation passed: `npm run test:soak-scripts`, release/PR governance, source-pack governance, ops-runbook governance, runtime-smoke governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-401 OpenClaw VPS verification guardrail (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Added `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` as the read-only verification checklist before any OpenClaw skill copy, restart, or live prompt.
- Updated `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` and `mentix-skills/INSTALLATION_MATRIX.md` so repo skill files are expected state, not proof of VPS deployment.
- Added `scripts/openclaw-vps-verification-governance.ts` and package script `test:openclaw-vps-verification`; it is now standalone optional OpenClaw reactivation coverage while Hermes is current.
- Guardrail: no VPS command, sync, restart, live Telegram/OpenClaw prompt, provider call, Shopier call, queue write, SupplierScout activation, retired-channel activation, external dispatch, or ad spend.
- Validation passed: `npm run test:openclaw-vps-verification`, `npm run test:mentix-skills`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-400 Shopier dashboard batch review sample (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Updated `src/lib/shopierPublishControl.ts` with `buildShopierDashboardReviewRows()` and dashboard formatting for ready/blocked/queued/synced sample rows.
- Updated Telegram `/shopier dashboard` to include the read-only batch review sample.
- Suggested actions stay manual/operator-controlled: `/shopier publish-ready`, `/imageqc <sn-or-id>`, or `/productflow <sn-or-id>`.
- Guardrail: no publish, Shopier queue, Shopier API call, provider call, SupplierScout activation, retired-channel activation, external dispatch, or ad spend.
- Validation passed: `npm run test:shopier-publish-control`, release/PR governance, source-pack governance, ops-runbook governance, retired-channel governance, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-399 Runtime smoke worklist alignment (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Fixed `scripts/load-plan-runtime-smoke.ts` so `smoke:load-plan:read` prints the D-399 first product worklist from `plan.worklist`.
- Updated `scripts/runtime-smoke-governance.ts` so `test:runtime-smokes` requires the load-plan smoke script to keep the worklist output surface.
- Guardrail remains read-only: no product write, publish, Shopier queue, provider call, SupplierScout activation, retired-channel activation, schema push, or ad spend.
- Validation passed: `npm run test:runtime-smokes`, `npm run test:loading-plan`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run test:retired-channels`, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-399 Loading-plan first product worklist (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Updated `src/lib/productLoadingPlan.ts`.
- Updated `src/lib/productLoadingPlan.test.ts`.
- `/loadplan` and `smoke:load-plan:read` now include a read-only "First Product Worklist" section.
- Worklist rows include product ref, title, priority, reasons, and suggested manual command.
- Reasons cover brand safety, Image QC fail/pending, Shopier error, missing core fields, stale draft, category backlog, and ready backlog.
- Suggested commands stay manual/operator-controlled: `/productflow <sn-or-id>`, `/imageqc <sn-or-id>`, or `/shopier errors`.
- Guardrail: no product writes, publish, Shopier queue, provider call, SupplierScout activation, retired-channel activation, or ad spend.
- Validation passed: `npm run test:loading-plan`, `npm run test:local-release-candidate`, `npm run test:local-pr-review`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run test:retired-channels`, `npm run typecheck`, `git diff --check`, and full `npm run validate` with lint at 0 errors / 70 warnings.

## D-398 Local PR review package (2026-07-05) - LOCAL DOC/GOVERNANCE, NOT DEPLOYED
- Added `project-control/LOCAL_PR_REVIEW_PACKAGE.md`.
- Added `scripts/local-pr-review-governance.ts`.
- Added package script `test:local-pr-review` and included it in `test:safe`.
- The package prepares review notes for the D-380-D-404 local stack: proposed PR title, scope summary, reviewer focus, validation commands, and not-run/not-done guardrails.
- Guardrail: no commit, branch, push, PR, deploy, live Telegram command, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, retired-channel activation, or optional OpenClaw sync has been performed.
- Source-pack and project-control docs were synced so Claude/Codex/ChatGPT Project see the same PR/review boundary.
- Focused check passed: `npm run test:local-pr-review`.
- Full local validation passed: local release-candidate governance, source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and `npm run validate`, with lint at 0 errors / 70 warnings.

## D-397 Local release candidate boundary (2026-07-05) - LOCAL DOC/GOVERNANCE, NOT DEPLOYED
- Added `project-control/LOCAL_RELEASE_CANDIDATE.md`.
- Added `scripts/local-release-candidate-governance.ts`.
- Added package script `test:local-release-candidate` and included it in `test:safe`.
- The manifest records the D-380-D-404 local stack as not committed and not deployed.
- It repeats the current invariants: Payload/Next is source of truth, active channels are Website/Instagram/Facebook/X/Shopier, Dolap/Threads are retired, SupplierScout is dormant, n8n is optional glue, and Shopier remains checkout.
- Guardrail: no commit, push, PR, deploy, live Telegram command, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, retired-channel activation, or optional OpenClaw sync has been performed.
- Source-pack and project-control docs were synced so Claude/Codex/ChatGPT Project see the same local handoff boundary.
- Focused check passed: `npm run test:local-release-candidate`.
- Full local validation passed: source-pack governance, ops-runbook governance, retired-channel governance, `typecheck`, `git diff --check`, and `npm run validate`, with lint at 0 errors / 70 warnings.

## D-396 Smokeplan lead-followup alignment (2026-07-05) - LOCAL CODE, NOT DEPLOYED
- Updated `src/lib/operatorSmokePlan.ts`.
- Updated `src/lib/operatorSmokePlan.test.ts`.
- `/smokeplan` now includes `npm run smoke:lead-followup:read -- --confirm-read-only` after business/funnel visibility and before Telegram `/leadplan`.
- `/leadplan` now appears before Shopier webhook/publish preflights in the operator sequence.
- Guardrail: this is still read-only sequencing only; it does not run live Telegram, write leads, queue jobs, call Shopier, dispatch channels, activate SupplierScout, revive retired channels, or spend on ads.
- Focused check passed: `npm run test:operator-smoke-plan`.
- Full local verification passed: `npm run test:source-pack`, `npm run test:retired-channels`, `npm run test:runtime-smokes`, `npm run typecheck`, `git diff --check`, and full `npm run validate`.
- Full validation completed with lint at 0 errors / 70 existing warnings. Production and live Telegram behavior are unchanged until commit/push/deploy and operator-approved smoke.

## D-395 Lead-followup runtime smoke (2026-07-04) - LOCAL CODE, NOT DEPLOYED
- Added `scripts/lead-followup-runtime-smoke.ts`.
- Added package script `smoke:lead-followup:read`.
- Added the smoke to `scripts/runtime-smoke-governance.ts`.
- The smoke mirrors Telegram `/leadplan` and `/followupplan` through `getLeadFollowupPlan()` against real Payload Customer Inquiries only after `--confirm-read-only`.
- It prints a PII-light summary and does not print customer names or phone numbers.
- Guardrail: no lead writes, customer messages, product writes, dispatch, provider calls, Shopier calls, job queue writes, ad spend, SupplierScout activation, retired-channel activation, or schema push.
- No-connect help passed: `npm run smoke:lead-followup:read -- --help`.
- Local checks passed: `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:retired-channels`, `npm run typecheck`, `git diff --check`, and full `npm run validate`.
- Full validation completed with lint at 0 errors / 70 existing warnings. Production and live Telegram behavior are unchanged until commit/push/deploy and operator-approved smoke.

## D-394 Lead follow-up plan (2026-07-04) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/leadFollowupPlan.ts`.
- Added Telegram `/leadplan` and `/followupplan`.
- Added package script `test:lead-followup-plan` and included it in `test:safe`.
- The plan reads open Payload Customer Inquiries through the existing Lead Desk helper, prioritizes stale never-touched leads, overdue follow-ups, quiet contacted leads, and fresh new leads, then suggests existing manual lead commands.
- Guardrail: read-only only. It does not write lead status, message customers, start ads, call providers, call Shopier, activate SupplierScout, or revive retired channels.
- Focused checks passed: `npm run test:lead-followup-plan`, `npm run test:source-pack`, `npm run test:retired-channels`, `npm run typecheck`, and `git diff --check`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and live Telegram behavior are unchanged until commit/push/deploy and operator-approved smoke.

## D-393 Operator smoke-plan Shopier webhook preflight (2026-07-04) - LOCAL CODE, NOT DEPLOYED
- Added package script `npm run test:shopier-webhook-local`.
- The script combines local Shopier order/refund stock reconciliation and refund lifecycle tests.
- Updated `src/lib/operatorSmokePlan.ts` so `/smokeplan` includes this local repo check before `smoke:shopier:read`.
- Updated `src/lib/operatorSmokePlan.test.ts` to prove the local check appears before Shopier runtime smoke.
- Updated `scripts/ops-runbook-governance.ts` to require the combined local script in the runbook/package script inventory.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production, Telegram live behavior, and Shopier live webhooks are unchanged until commit/push/deploy and operator-approved smoke.

## D-392 Shopier refund-request idempotency (2026-07-04) - LOCAL CODE, NOT DEPLOYED
- Extended `src/lib/shopierRefundLifecycle.ts` to handle Shopier `refund.requested` as well as `refund.updated`.
- The helper records an idempotent `Shopier refund requested: refund=<id>` note before stock restore and emits `order.refund_requested` when possible.
- Duplicate `refund.requested` events and legacy `Iade talebi: <refundId>` markers return `shouldRestoreStock=false`, preventing duplicate webhook delivery from restoring inventory twice.
- `src/app/api/webhooks/shopier/route.ts` now calls the lifecycle helper first and restores stock only for first-seen refund requests.
- Added tests for first request, duplicate request, legacy marker compatibility, missing order id no-write behavior, and unknown local order no-write behavior.
- Focused checks passed: `npm run test:shopier-refund-lifecycle`, `npm run test:shopier-order-stock`, `npm run test:order-desk`, and `npm run typecheck`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and live Shopier webhooks are unchanged until commit/push/deploy and operator-approved webhook smoke.

## D-391 Shopier refund update traceability (2026-07-04) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/shopierRefundLifecycle.ts`.
- Added `src/lib/shopierRefundLifecycle.test.ts`.
- Added package script `test:shopier-refund-lifecycle` and included it in `test:safe`.
- Wired Shopier webhook `refund.updated` to append an idempotent refund-status note to the matching Payload order.
- The helper emits `order.refund_updated` as a best-effort BotEvent when possible.
- Guardrail: `refund.updated` does not change order status, restore stock, call Shopier, dispatch channels, queue jobs, activate SupplierScout, revive retired channels, or spend on ads.
- Focused checks passed: `npm run test:shopier-refund-lifecycle`, `npm run test:shopier-order-stock`, `npm run test:order-desk`, and `npm run typecheck`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and live Shopier webhooks are unchanged until commit/push/deploy and operator-approved webhook smoke.

## D-390 Mentix/OpenClaw live-smoke alignment (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Updated `mentix-skills/product-flow-debugger/SKILL.md` so live-smoke/catalog-scale-up sequencing starts with Telegram `/smokeplan`.
- Updated `mentix-skills/mentix-intake/SKILL.md` so live-smoke planning routes to product-flow-debugger and answers with `/smokeplan` first.
- Updated `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` so OpenClaw sync requires `npm run test:operator-smoke-plan`.
- Updated `mentix-skills/INSTALLATION_MATRIX.md` so the repo skill copy is verify-before-sync instead of assumed-current on VPS.
- Updated `mentix-skills/mentix-skill-stack-dashboard.html` so n8n is optional glue, not the default product creation path, and `/smokeplan` is part of the read-only Telegram skill test.
- Updated `scripts/mentix-skill-governance.ts` to guard these rules.
- Focused checks passed: `npm run test:mentix-skills` and `npm run test:operator-smoke-plan`.
- Full local validation passed: `npm run validate` completed successfully with typecheck, lint (0 errors, 70 warnings), and `test:safe`.
- Production and VPS OpenClaw are unchanged until commit/push/deploy/VPS sync approval.

## D-389 operator live smoke plan (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/operatorSmokePlan.ts`.
- Added `src/lib/operatorSmokePlan.test.ts`.
- Added package script `test:operator-smoke-plan` and included it in `test:safe`.
- Added Telegram `/smokeplan` as a read-only checklist for the safe operator live-smoke order.
- The plan covers load-plan smoke/Telegram read, provider-health smoke plus `/diagnostics`, product-flow smoke plus `/productflow`, business/funnel smoke plus `/business` and `/funnel`, Shopier read-only smoke plus dashboard/publish-ready/errors/retry previews, then an explicit operator hold.
- Guardrail: no Payload writes, no product status changes, no dispatch, no redispatch, no Shopier queueing/API calls, no provider calls, no secret printing, no ad spend, no SupplierScout activation, and no retired-channel activation.
- Local checks passed: `npm run test:operator-smoke-plan`, `npm run test:retired-channels`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-388 load-plan runtime smoke (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `scripts/load-plan-runtime-smoke.ts`.
- Added package script `smoke:load-plan:read`.
- Added the smoke to `scripts/runtime-smoke-governance.ts`.
- The smoke mirrors Telegram `/loadplan` through `buildProductLoadingPlan()` against real Payload products only after `--confirm-read-only`.
- It forces `PAYLOAD_DB_PUSH=false` and refuses mutation, publish, queue, provider, Shopier, SupplierScout, and ad-spend flags.
- Guardrail: no product writes, status changes, dispatch, provider calls, Shopier calls, job queue writes, ad spend, SupplierScout activation, retired-channel activation, or schema push.
- Local checks passed: no-connect `npm run smoke:load-plan:read -- --help`, `npm run test:runtime-smokes`, `npm run test:ops-runbook`, `npm run test:source-pack`, `npm run test:retired-channels`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- No live read-only run has been performed yet. Production is unchanged until commit/push/deploy.

## D-387 product loading plan (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/productLoadingPlan.ts` and `src/lib/productLoadingPlan.test.ts`.
- Added package script `test:loading-plan` and included it in `test:safe`.
- Added Telegram `/loadplan [limit]` plus `/loadingplan [limit]`.
- `/loadplan` composes Catalog QA and Category Fill into a read-only daily loading/fix plan for catalog scale-up.
- It prioritizes brand-safety blockers, image QC pending/failure, Shopier sync errors, category load gaps, publish-ready/finish-backlog opportunities, catalog completeness gaps, and stale drafts.
- Guardrail: no product writes, publish, Shopier queueing, provider calls, SupplierScout activation, Dolap/Threads revival, or ad spend.
- Local checks passed: `npm run test:loading-plan`, `npm run test:retired-channels`, `npm run test:source-pack`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-386 Shopier command governance (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Removed unreachable direct queue/update branches from Telegram `/shopier publish` and `/shopier republish`.
- Single-product Shopier publish/republish now resolve the product and call the shared `queueShopierSync()` helper.
- Added `scripts/shopier-command-governance.ts` and package script `test:shopier-commands`.
- Included `test:shopier-commands` in `test:safe`.
- The guard checks that Telegram publish/republish do not directly write `sourceMeta.shopierSyncStatus` or enqueue `shopier-sync` jobs, and that publish-ready/retry-errors continue using `queueShopierSync()` behind preview/confirm flows.
- Local checks passed: `npm run test:shopier-commands`, `npm run test:shopier-publish-control`, `npm run test:source-pack`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-385 runtime-smoke governance (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `scripts/runtime-smoke-governance.ts` and package script `test:runtime-smokes`.
- Included `test:runtime-smokes` in `test:safe`; runtime smoke commands themselves stay operator-run and are not executed by validation.
- The governance check verifies read-only smoke package scripts, backing scripts, explicit `--confirm-read-only`/`READ_ONLY` gates, mutation refusal, no-write wording, Payload `PAYLOAD_DB_PUSH=false` guards where relevant, and synchronized docs.
- Docs checked include `AGENTS.md`, `CLAUDE.md`, `project-control/RUNTIME_SMOKE_CHECKS.md`, `project-control/DEPLOYMENT_OPS_RUNBOOK.md`, and `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`.
- Local checks passed: `npm run test:runtime-smokes`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-384 ad-performance runtime smoke (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `scripts/ad-performance-runtime-smoke.ts` and package script `smoke:ad-performance:read`.
- It mirrors Telegram `/adreport` through `getAdPerformanceSnapshot()` against real Payload leads/orders only after `--confirm-read-only`.
- It forces `PAYLOAD_DB_PUSH=false`, loads env files without printing secrets, and refuses mutation/publish/queue/provider/Shopier/spend flags.
- Guardrail: no writes, lead/order mutation, external dispatch, provider call, Shopier call, external ad API call, ad spend, job queue write, or schema push.
- Local checks passed: no-connect `npm run smoke:ad-performance:read -- --help`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- No live read-only smoke has been run yet.
- Production is unchanged until commit/push/deploy.

## D-383 manual ad performance report (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/adPerformance.ts`, `src/lib/adPerformance.test.ts`, package script `test:ad-performance`, and Telegram `/adreport [today|week|month]`.
- `/adreport` is read-only and summarizes UTM-tagged Payload leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders.
- Attribution uses existing CustomerInquiries UTM fields plus `orders.relatedInquiry`; no schema change.
- Guardrail: no campaign, post, pixel/CAPI/Ads API, provider call, Shopier call, external API call, or ad spend is created by this helper.
- Local checks passed: `npm run test:ad-performance`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-382 story dispatch lint cleanup (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Removed stale unused imports from `src/lib/storyDispatch.ts`.
- Clarified the Story dispatch status comment to include `brand_safety_blocked`.
- `npm run lint` now reports 0 errors and 70 warnings, down from 74 warnings.
- Local checks passed: `npm run test:story-dispatch`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, 70 warnings), `git diff --check`, and full `npm run validate`.

## D-381 story dispatch brand-safety hardening (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- `src/lib/storyDispatch.ts` now scans products with `scanProductBrandSafety()` before StoryJob creation.
- Protected-brand products do not create StoryJobs; sourceMeta records `storyStatus='failed'` and `lastStoryError='brand_safety_block: ...'`.
- Added `src/lib/storyDispatch.test.ts`, package script `test:story-dispatch`, and included it in `test:safe`.
- Local checks passed: `npm run test:story-dispatch`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`.
- Production is unchanged until commit/push/deploy.

## D-380 manual ad launch-pack support (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Added `src/lib/adLaunchPack.ts`, `src/lib/adLaunchPack.test.ts`, package script `test:ad-launch-pack`, and Telegram `/adpack <sn-or-id> [campaign]`.
- `/adpack` prepares operator-review copy drafts plus Meta paid-social UTM links only after hard blockers are clear.
- `utmBuilder` now accepts `meta`, `paid_social`, and optional `utm_content` for copy-angle tracking.
- Guardrail: no campaign, post, pixel/CAPI/Ads API, provider call, Shopier call, or ad spend is created by this helper.
- Local checks passed: `npm run test:ad-launch-pack`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`. Production is unchanged until commit/push/deploy.

## Phase 7 Shopier fulfilled lifecycle unification (2026-07-03) - LOCAL CODE, NOT DEPLOYED
- Shopier `order.fulfilled` in `src/app/api/webhooks/shopier/route.ts` now calls `applyOrderStatus(payload, orderId, 'ship', 'shopier_webhook')` instead of directly overwriting `status: 'shipped'`.
- Fulfillment now shares `/ship` timestamping, idempotency/refusal handling, and `order.status_changed` audit-event behavior.
- `src/lib/orderDesk.ts` now has `OrderStatusSource`, and `src/lib/orderDesk.test.ts` asserts that the audit payload preserves `source: 'shopier_webhook'`.
- Local checks passed: `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`.
- Production and live webhooks are unchanged until commit/push/deploy and operator-approved webhook smoke.

## Phase 7 Shopier order/refund stock reconciliation (2026-07-03) — LOCAL CODE, NOT DEPLOYED
- New `src/lib/shopierOrderStock.ts` centralizes Shopier webhook stock mutation for `order.created` and `refund.requested`.
- `src/app/api/webhooks/shopier/route.ts` now uses the shared helper instead of private inline product/refund stock logic.
- Sales decrement the matching normalized local size variant when variants exist, otherwise product-level `stockQuantity`. Refunds restore through the same product-or-variant rule and sync product-level stock to the variant total.
- If Shopier sends a product id or size that cannot be matched locally, the helper returns explicit skipped-item reasons; the route logs those reasons and avoids fake stock writes.
- Successful mutations create `inventory-logs` rows and use `context.isDispatchUpdate=true`.
- Added `src/lib/shopierOrderStock.test.ts`, package script `test:shopier-order-stock`, and included it in `test:safe`.
- Local checks passed: `npm run test:shopier-order-stock`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `npm run lint` (0 errors, existing warnings only), `git diff --check`, and full `npm run validate`. Production and live webhooks are unchanged until commit/push/deploy and operator-approved webhook smoke.

## Phase 7 operator order lifecycle policy (2026-07-03) — LOCAL CODE, NOT DEPLOYED
- Added `src/lib/orderDesk.test.ts`, package script `test:order-desk`, and included it in `test:safe`.
- The test locks `applyOrderStatus()` behavior for Telegram/operator orders: `/ship` stamps `shippedAt`; `/deliver` stamps `deliveredAt` and backfills `shippedAt`; delivered orders cannot be cancelled through Telegram; idempotent repeats and missing orders do not write.
- Manual `/cancelorder` is intentionally no-auto-restock. It marks the order cancelled and points the operator to `/restock`; Shopier refund webhooks remain the automatic stock-restore path.
- Local checks passed: `npm run test:order-desk`, `npm run test:source-pack`, `npm run test:ops-runbook`, `npm run typecheck`, `git diff --check`, and full `npm run validate` (0 errors, existing lint warnings only).

## Manual publish override fix (2026-07-02, superseded by D-467) — LOCAL CODE, NOT DEPLOYED
- Root cause from product **#410**: operator clicked **Yayına Al**, but `approveAndActivateProduct()` refused activation at `evaluatePublishReadiness()` when review-style blockers remained. Result: `publish.approved` was recorded, but `status` stayed non-active, so Website/X/Facebook/Shopier dispatch never ran.
- Current rule: manual approval may override generic Image QC/audit review only when the product passes protected-brand safety. Hard commerce/source-of-truth blockers still block activation: missing/zero price, no usable media, no active publish target, and no sellable stock. D-467 makes protected-brand safety non-overridable.
- Files changed: `src/lib/publishDesk.ts`, `src/lib/productActivationGuard.ts`, `src/collections/Products.ts`, `src/lib/publishDesk.test.ts`, `src/lib/productActivationGuard.test.ts`.
- Implementation detail: `approveAndActivateProduct()` computes `manualOverride` only when failed dimensions are limited to `visuals`/`audit` **and** `scanProductBrandSafety()` is safe, then passes `context.manualPublishOverride=true` into the Payload update and records the overridden review blockers in the `product.activated` bot-event. `Products.beforeChange` can skip Image QC under that context, but `collectActivationBlockers()` always retains a protected-brand blocker.
- Validation passed locally: `npm run test:publish-desk`, `npm run test:activation-guard`, `npm run test:publish-readiness`, `npm run test:image-quality`, `npm run typecheck`, and targeted ESLint on the touched files.
- Status: code is local only; production UygunOps will not change until this is committed/pushed/deployed with operator approval.

## Product copy fix (2026-06-21) — D-338A #354 genuine-leather claim softened, ad-safe
- Operator-approved DATA-only copy fix on product **#354** (resolves the D-338 advisory). Admin API PATCH `/api/products/354` **content group only** — title/slug/price/stock/images/status (`active`) all unchanged.
- **No external dispatch:** Products `afterChange` fires only on draft→active transition or `sourceMeta.forceRedispatch` (channelDispatch.ts L133). PATCH sent `content` only ⇒ no transition ⇒ no Shopier/X/FB/IG publish. Confirmed status stayed `active`.
- Removed ALL genuine-leather/material-certainty claims: "Gerçek deri malzemeden üretilen", "Gerçek deri materyali", "gerçek/hakiki deriden üretilmiştir", "yüksek kaliteli (hakiki) deri", "ana malzemesi/materyali olan deri", "deri malzeme(si)", "deri materyali", "deriye zarar", "deri loafer'ınızın", "Deri yüzeyi", "deri bakım kremi", `#DeriAyakkabı`. Spread across commercePack (website/IG/X/FB/Shopier/highlights[0]) + discoveryPack (articleBody 6 passages, metaTitle, metaDescription, faq[0]+faq[2]).
- Replaced with safe wording: "deri görünümlü yüzey(e sahip)", "(kaliteli) yüzey/yüzeyi/yüzeyin", "esnek iç yapısı", "ayakkabı bakım kremi", "Klasik Siyah Tokalı Erkek Loafer", "Klasik Tokalı Ayakkabı Modelleri", "Yüzey Kalitesi", "#KlasikLoafer". Now matches 359/355/353 style.
- **Preserved intentionally** (SEO/nav, not certainty claims): `keywordEntities` "deri loafer modelleri"/"deri loafer bakımı"; `internalLinkTargets` `/kategori/deri-erkek-ayakkabi`.
- Verified live: PDP 200, softened copy renders, title+slug+price ₺2.099+sizes 40–44 (stock 2)+WhatsApp CTA+lead form+ÜRÜN REHBERİ intact; programmatic scan = 0 leather claims + 0 bare "deri" outside "deri görünümlü"; active set still [353,354,355,359] (totalDocs 4), no other product changed.
- Reversible (copy-only; GeoBot can regenerate). Pattern for future claim fixes: PATCH content-only, omit status, never set forceRedispatch. Docs commit `docs: record D-338A product 354 claim softening`.

## Ad-relaunch readiness (2026-06-21) — D-338 first ad-test readiness check, GREEN (no blocker)
- Read-only confirmation before first paid ad test. ALL PASS:
  - 359/355/354/353: public PDP 200, brand-safe title/desc/meta, price + sizes + stock + WhatsApp CTA + lead form + ÜRÜN REHBERİ + single FAQ, no fake reviews. Prices: 359/355/354 = ₺2.099; 353 = ₺1.899 (stock "Son 4 adet!", backup only).
  - #362 still `draft`, PDP 404, homepage 0× brand/`ai-362`.
  - UTM: D-326 pack params (`utm_source=meta`/`utm_medium=paid_social`/`utm_campaign=first_loafers_test` + per-product `utm_content`); 359 UTM URL returns 200; slugs match live PDPs.
  - UTM persistence wired: client `captureFirstTouch()` (D-315, `@/lib/attribution`) + `/api/inquiries` stores utmSource/utmMedium/utmCampaign/referrer + `product:numericProductId` (D-320).
  - Lead form renders on all 4; code path intact. Did NOT submit a new live test lead (D-320/D-322 already verified end-to-end; avoids DB noise + operator Telegram ping).
  - **ADVISORY (operator, not a blocker):** product **354** copy asserts "Gerçek deri / Hakiki deriden üretilen" — the only one of the 4 making an explicit genuine-leather claim (359/355/353 use "deri görünümlü/hissiyatı"). Scanner = safe (claim-only warn, no brand). Operator should confirm substantiable or soften before advertising 354.
  - Verdict: GREEN, no blocker — ad test may start; creatives on 359/355/354, 353 backup, none deep-link #362; finish #362 external cleanup. Docs commit `docs: record D-338 first ad relaunch readiness`.

## Closure checkpoint (2026-06-21) — D-337 GEO + brand-safety closure audit, GREEN
- **D-337 (read-only, no code/status/PI/publish change).** Final verification before first paid ad test. ALL PASS:
  - Active set = `[353,354,355,359]` (4 clean loafers, `totalDocs:4`); homepage "Yeni Gelenler" rail shows only these; 0× "New Balance"/`ai-362`.
  - #362 `status:draft`; public PDP `…new-balance-sneaker-cok-renkli-tg-1781887306187` → HTTP 404 (body not-found). Cosmetic: `<title>` tag still emits brand string before `notFound()` — page is 404/non-indexable, no body exposure.
  - Visible GEO: PDP 359 + 355 SSR-render `ÜRÜN REHBERİ` (full article, clean `<h4>` headings, NO `##`/`**`, single FAQ, `ARAMA NOTLARI` chips, `BENZER MODELLER` clean).
  - Brand-safety guard: `brandSafety.ts` scanner + Layer 1 (`mentixAudit.ts` block→needs_revision) + Layer 2 (`channelDispatch.ts` eligible→skipped, `eligible.length=0`) wired; `brandSafety.test.ts` 9/9 PASS; `Products.ts` has NO brand ref ⇒ no Layer 3 (deferred, correct).
  - Reverse-search: PI report **id 47** (product 359) = `similar_style`, conf 70, **referenceProducts:4**, `rawProviderData.search` populated (google_vision_web_detection, onlineMatchesFound 4, `error:null`), `visibleBrand:null`. Nuance: original photo 0 matches; 4 refs from AI-generated detail image (supporting context, flagged in `imagesUsed.detectedConflicts`).
  - STILL MANUAL (operator, NOT Claude): external cleanup — Shopier `48281164`, X `#NewBalance` tweet, Facebook post. Website containment does not retract external posts.
  - Verdict: GREEN — first ad test may resume; keep creatives off #362; finish manual external cleanup. Docs-only commit `docs: record D-337 geo brand-safety closure audit`.

## Where things stand (2026-06-18)
- D-302 → D-320 are all merged to `main` and deployed (Vercel): an ad-readiness + conversion sweep (cards, hero, editorial section, category tiles, social proof, footer, claim cleanup) plus a lead-flow fix.
- **D-320 just shipped:** `/api/inquiries` now coerces `productId` string→number — product-page lead submissions (previously 500-ing) work again. Commit `9a8001b`; live re-test passed.
- **D-324 (2026-06-18) — catalog hygiene:** the single visible placeholder product `Taslak Ürün 16/06-4184` (id 361, ₺4.000, "Son 1 Adet!") was unpublished via Admin (`status: active → draft`). No rename, no delete, no code change, no external publishing (Products afterChange hooks fire only on `→ active`). Homepage verified clean; 6 real products remain active.
- **D-325/326/327 (2026-06-18) — first ad test prep (docs only):** plan + copy/UTM pack + pre-launch runbook. Ad-safe products 359/355/354 (+353 backup), all loafers, 10 units each (353=4). Packs in `project-control/campaigns/`. UTM-only test, no pixel yet. NEVER advertise 358/349 (trademark).
- **D-336A+B (2026-06-19) — brand-safety guard IMPLEMENTED (code).** NEW `src/lib/brandSafety.ts` = pure never-throws scanner (22 BLOCKED_BRANDS + 14 RISKY_CLAIM_TERMS; Turkish-aware normalize; whole-token + stem matching for özgün/orijinal; `scanProductBrandSafety(product)` → `{safe,severity,blockedBrands,riskyClaims,matchedFields,reasons}`). Layer 1 = `mentixAudit.ts` `runFullAudit`: `!safe` → revisionNote → overallResult `needs_revision`/approvedForPublish=false → NOT publish-ready → NOT activated (uses existing Telegram audit approve/revise UX). Layer 2 = `channelDispatch.ts` `dispatchProductToChannels`: after `evaluateChannelEligibility`, `!safe` → move eligible→skipped + empty eligible → NO external publish (Shopier/X/FB/IG). Policy: brand=hard block; claim-only ("model"/"logo"/"original")=warn not block; brand+claim=critical. `tsconfig.json` excludes `src/**/*.test.ts`. Validated: esbuild OK + 9/9 assertions (`tsx src/lib/brandSafety.test.ts`). NO schema change. LIMITATION: admin force-activate still flips storefront status (Layer 1 is audit-path) but Layer 2 blocks external publish; all-paths hard gate = optional Layer 3 (Products.ts beforeChange, D-336C, not done).
- **D-336 (2026-06-19) — brand-name guard PLAN (no code yet).** Pipeline: intake→content(GeoBot)→**Mentix audit (`mentixAudit.ts`)**→publish-ready(`publishReadiness.ts`)→activate(`Products.ts` →active hooks)→`channelDispatch.ts`. #362 slipped because the audit has NO brand rule. Plan: NEW `src/lib/brandSafety.ts` (BLOCKED_BRANDS + RISKY_CLAIM_TERMS + scanBrandSafety w/ co-occurrence risk + collectProductTexts), reused by Layer 1 = brand check in mentixAudit (blocked brand → overallResult `needs_revision`, approvedForPublish=false → not publish-ready → not activated; shows in existing Telegram approve/revise UX); Layer 2 = pre-dispatch block in channelDispatch (skip x/fb/shopier on brand hit); Layer 3 optional = Products.ts beforeChange →active. False-positive rule: brands hard-block; claim terms (model/logo/original) WARN only unless co-occurring with a brand. NO DB schema change (use auditResult.warnings/revisionNotes). Recommend D-336A (brandSafety.ts + audit) first. Implementation pending operator approval.
- **D-335A (2026-06-19) — visible "Ürün Rehberi" PDP section added.** `products/[slug]/page.tsx` now SSR-renders the existing discovery article: `discoveryPack.articleTitle` (Playfair h3) + `articleBody` (paragraphs) + `keywordEntities` as "Arama Notları" chips. Placed between the product detail section and "Benzer Modeller"; gated on `showProductGuide = articleParagraphs.length>0` (hides if no article); FAQ ("Merak Ettikleriniz") left as-is (no duplicate). No content generated, no product-data change, no "GEO"/"AI" customer wording. So the discovery article (previously stored-but-unrendered, per D-335) is now visible + indexable. #362 stays draft/404.
- **D-335C (2026-06-19) — #362 CONTAINED (set to draft).** Operator-approved Admin PATCH `active→draft` (only status; title/slug/price/stock/channels unchanged; reversible). Verified: PDP HTTP 404, homepage + /ayakkabilar 0× New Balance/ai-362, active set=[353,354,355,359]. Website brand exposure contained. **STILL OPEN (external, manual operator): Shopier (shopier.com/48281164), X tweet (#NewBalance), FB post — hiding the website product does NOT retract these. IG feed off.** No content rewrite yet (rename/rewrite generic if keeping = future). Systemic: still no brand-name guard in pipeline (D-336 candidate).
- **D-335B (2026-06-19) — #362 brand-safety HIGH→CRITICAL (await operator OK to hide).** #362 "New Balance Sneaker Çok Renkli" is `active` + published to website/shopier/x/facebook. Brand-as-identity everywhere + 'N' logo emphasis + specific model "New Balance 9060" + authenticity claim "...'New Balance' yazısı, özgünlüğünü vurgular" + X copy "#NewBalance". Worse than D-328 (no authenticity claim there). Recommend: hide to draft NOW (operator approval, reversible, like D-328) → then rename/rewrite generic + operator legal call. Hiding removes WEBSITE only; external cleanup (Shopier shopier.com/48281164, X tweet, FB post) is manual/operator (IG feed off). **RECURRENCE: no automated brand-name guard exists — #362 reached live despite D-328; needs a brand blocklist in intake/GeoBot/publish (future D-336).**
- **D-335 (2026-06-19) — GEO content placement clarified (product #362).** GeoBot writes GEO onto the PRODUCT: `product.content.commercePack` (websiteDescription, highlights[], ig/x/fb/shopier copy) + `product.content.discoveryPack` (articleTitle, articleBody, metaTitle, metaDescription, faq[], keywordEntities[]). The PDP (`products/[slug]/page.tsx`) renders VISIBLY: websiteDescription (description para), highlights ("Ürün Özellikleri"), faq ("Merak Ettikleriniz"); HIDDEN: meta + JSON-LD; NOT rendered: `discoveryPack.articleBody` + PI report geoPack (aiSearchSummary/comparison). #362 ("New Balance Sneaker Çok Renkli") live PDP confirms GEO IS applied+visible → operator's "can't see GEO" = visibility/expectation gap, not missing content. Fix path D-335A = add a visible PDP GEO/article section. NOTE: #362 is brand-named (New Balance) + near-authenticity claims → brand-safety review like D-328. `product-intelligence-reports` collection is upstream (feeds GeoBot), separate from `product.content`.
- **D-334A VERIFIED (2026-06-19/21) — OUTCOME A, fix works.** Operator triggers kept missing @Uygunops_bot (3x); with operator authorization Claude pressed "🔄 Yeniden Üret" on report 45 in the DM (NOT GeoBot'a Gönder/pi:sendgeo) → new **report id 47**: `matchType=similar_style`, confidence 70, **referenceProducts=4** (was 0), no imageUri error (rawProviderData keys = gemini/search/textSearch). 4 similar loafers/makosen from instagram.com (sim 61–70). So `51ef749` (base64 image content) CONFIRMED working — Google Vision Web Detection now returns reverse-image evidence. Reverse-search is no longer the PI weakness.
- **D-334A (2026-06-19) — Google Vision reverse-search FIX shipped.** `providers/googleVision.ts` `googleVisionSearch` now calls `fetchImageBase64(imageUrl)` (server-side fetch: 15s AbortController timeout, image/* content-type check, non-empty, 6MB cap, no secret/byte logging) and sends `image:{content:base64}` instead of `image:{source:{imageUri}}`. Preserves WEB_DETECTION + parseWebDetection ranking + fail-soft (image-fetch failure → ok:false `google_vision_image_fetch_failed`). Fixes D-334 ("can't access URL on your behalf" → referenceProducts=0). esbuild OK; free tier; no env/schema. Live verify pending operator `#geohazirla 359` (if Vision then returns 0 matches but NO error → "provider returning empty", a coverage limit not an input bug).
- **D-334 (2026-06-19) — reverse-search root cause = Google Vision imageUri not fetchable (code fix).** PI `referenceProducts=0` because `providers/googleVision.ts` `googleVisionSearch()` sends `image: { source: { imageUri } }` (the uygunayakkabi.com media URL) and Google Vision can't fetch it → per-image error "We're not allowed to access the URL on your behalf. Please download the content and pass it in." NOT env-missing (prod HAS GOOGLE_VISION_API_KEY — Vision responded), NOT provider-unsupported, NOT DataForSEO. Provider selection = 'auto' → Google Vision (free tier 1000/mo). **Fix (D-334A, pending approval): patch googleVisionSearch to fetch image bytes + send base64 `image: { content }` instead of `imageUri` (~10 lines, one function, reversible, NO paid credits).** Gemini SEO/GEO text generation is unaffected/strong.
- **D-333C (2026-06-19) — manual `#geohazirla` RESOLVED / WORKING.** Claude (operator-authorized) sent `#geohazirla 359` to the verified @Uygunops_bot DM (id 8702872700) via the operator's Telegram Web → bot replied "analiz başlatıldı — #359" then ~40s later posted a full PI report ready (SEO title/meta/desc/tags/FAQ/AI-summary/buyer-intent/comparison all ready; claim-safety enforced). NO approve/GeoBot'a-Gönder (pi:sendgeo) button pressed. **Root cause of every earlier failure = the command was not reaching the @Uygunops_bot DM (operator sending to wrong bot/chat); webhook (D-333A) + route code (D-333) were always healthy.** Reverse-image search still fails in prod (google_vision: "not allowed to access the URL on your behalf") — provider gap; SEO/GEO text unaffected. To trigger PI manually: DM `#geohazirla <id>` to @Uygunops_bot (NOT GeoBot). DB-confirmed: that run persisted report **id 45, triggerSource=`telegram`, ready, 2026-06-18T23:39** (first non-geo_auto report). Operator's later `/start`+`/pipeline` again did NOT reach the @Uygunops_bot DM (and those commands don't emit bot-events anyway) — confirming the only issue was ever wrong-bot/chat targeting; the DM itself is reachable.
- **D-333B (2026-06-19) — manual trigger cause ISOLATED = Telegram client/chat delivery.** Confirmed DM `#geohazirla 359` to @Uygunops_bot STILL produced no report/event. In a DM no gate drops `#geohazirla`, and a successful run creates a draft row + "starting" reply — neither exists → the update never reached `/api/telegram`. Webhook healthy (D-333A) + route code correct (D-333) → the break is between the operator's Telegram client and the bot (bot not /start-ed by this user, look-alike/wrong bot, or delivery anomaly). Cross-check: operator DMs `/pipeline` or `/start` to @Uygunops_bot — reply = PI-path-specific (code, D-334); no reply = bot unreachable for this user. PI still works via geo_auto bridge.
- **D-333A (2026-06-19) — Uygunops webhook is HEALTHY (not the cause).** Verified via getMe/getWebhookInfo (token from .env, never printed): getMe=@Uygunops_bot id 8702872700; webhook url=`https://www.uygunayakkabi.com/api/telegram` (correct, not GeoBot/?bot=geo/localhost/empty); pending=0; secret matching (no 401 — a mismatch would log 401, not read-timeout). Only stale error="Read timeout expired" @2026-06-16 15:02 UTC (the June-16 product-361 content-gen run). setWebhook → "Webhook is already set" (idempotent no-op). So webhook config is NOT the problem. Likely cause of failed manual trigger: command not actually delivered to @Uygunops_bot. Architecture note for later (D-334): handler runs PI/content synchronously in-request → can exceed Telegram read timeout; fix = fast 200 ack + background work. Token-in-URL Telegram API calls are acceptable ONLY for operator-authorized bot-admin (getMe/getWebhookInfo/setWebhook) with the value read from env and never printed.
- **D-333T (2026-06-19) — manual PI trigger VERIFIED BROKEN.** Operator DM'd `#geohazirla 359` to @Uygunops_bot → still NO report/event (anyEventToday=false; newest activity 2026-06-16, all geo_auto). Wrong-bot ruled out. The #geohazirla handler sends a "starting" reply + writes a draft row before work; neither happened → update never reached the handler. Cause = **Uygunops Telegram webhook delivery/config** (url unset/wrong, secret mismatch→401, or delivery error). No code defect (handler/parser/gates verified correct in D-333). Next: operator runs getWebhookInfo (Claude can't — token-in-URL prohibited); then D-333A = re-register Uygunops webhook to `/api/telegram` w/ matching secret (config, approval). PI currently works ONLY via the server-side geo_auto bridge.
- **D-333 (2026-06-19) — manual `#geohazirla` wiring audit (read-only).** `#geohazirla|#seoara|#productintel|#urunzeka` are Uygunops-owned (@Uygunops_bot, id 8702872700); GeoBot (@Geeeeobot, `?bot=geo`) REDIRECTS them — so sending a PI hashtag to GeoBot does nothing. `#geohazirla 359` IS a valid format (reply-to-product also works). Live cfg `telegram.groupEnabled=true`, `allowedUserIds` empty = OPEN (code only blocks when list non-empty). Root cause narrowed to (a) wrong bot or (b) Uygunops webhook not delivering in prod (no manual PI report has ever existed; all geo_auto). Correct usage: DM `#geohazirla 359` to @Uygunops_bot. getWebhookInfo not runnable here (token-in-URL prohibited). No code fix indicated; if webhook is the cause, re-register Uygunops webhook to `/api/telegram` (config).
- **D-332R (2026-06-19) — PI report review for 359: DONE.** Report id 43 (ready, geo_auto, 2026-06-09 — only report for 359). Gemini vision + SEO pack + GEO pack are STRONG (SEO already on the live PDP; claim-safety enforced — "Hakiki Deri"→"deri hissiyatı veren"). BUT reverse-image evidence = 0 (only Gemini ran; no Vision/DataForSEO/SerpAPI) → matchType=low_confidence. **2 findings:** (1) PI text quality is good but external/competitor evidence is missing due to provider gap; (2) manual `#geohazirla` is non-functional in prod — every PI report ever is `geo_auto`, today's manual command created nothing, bot last active 2026-06-16. The PI pipeline is currently ONLY driven by the GeoBot auto-bridge (resolvePiResearch), not by manual Telegram triggers.
- **D-332 (2026-06-19) — controlled PI dry-run for 359: PENDING OPERATOR.** No HTTP trigger exists — `createProductIntelligenceReport` is callable ONLY via the Telegram `#geohazirla` path (+ approval callback). Claude has no Telegram-send capability and won't spoof the webhook or run an ad-hoc prod harness, so the run must be operator-initiated: send `#geohazirla 359` in the GEO/PI bot, do NOT press the send-to-GeoBot (`pi:sendgeo`) button, then Claude reviews the `product-intelligence-reports` row read-only. Local env: GEMINI present, provider keys (DataForSEO/Vision/SerpAPI) missing LOCALLY but PROD Vercel env is authoritative + unknown. Chrome admin window was flaky/disconnected during this turn.
- **D-331A (2026-06-18) — source drift REVERTED before GEO work.** `main` had 2 uncommitted drift files (unknown provenance): `importMap.js` (Payload generated-regen drift) + `UygunApp.jsx` (cosmetic count-up/gradient polish BUT ALSO `DEMO_REVIEWS_ENABLED false→true` with 5 fake ★★★★★ testimonials + PreFooterCTA removal). The fake-reviews flip reverses LOCKED D-313 + the no-fake-review ad rule, so BOTH files were reverted via `git checkout -- .` (git stash failed on the parenthesized paths). Tree clean, main==origin/main. Full diff preserved in D-331A chat; count-up polish re-addable later as its own task. **Guard:** DEMO_REVIEWS_ENABLED must stay `false` in production (D-313); never ship fabricated reviews.
- **D-331 (2026-06-18) — GEO/PI re-entry audit (read-only).** Full PI subsystem present: `src/lib/productIntelligence/*` (createProductIntelligenceReport D-220, analyzeProduct Gemini vision, reverseImageSearch + providers GoogleVision/DataForSeo/SerpApi, generateSeoGeoPack, geoBotHandoff, telegramReport), `contentPack.ts` resolvePiResearch (D-225 PI→GeoBot auto-bridge) + triggerContentGeneration, collection `product-intelligence-reports`. Telegram triggers: `#geohazirla|#seoara|#productintel|#urunzeka` (route.ts:3735). **Publish boundary:** PI report run = internal (report row + bot-events + read-only external APIs); external publish ONLY on operator `pi:sendgeo:{id}` callback → geoBotHandoff → channelDispatch. DataForSEO runtime UNKNOWN (env-gated; historical Organic SERP 403). A controlled single-product PI run (e.g. 359) is feasible without publishing but is NOT read-only (writes report row + spends API credits) → needs approval. Provider env: REVERSE_SEARCH_PROVIDER auto → GoogleVision→DataForSeo→SerpApi.
- **D-329 (2026-06-18) — launch-day checklist: GO WITH WARNING.** All technical checks pass (4 ad products active+stocked, PDPs 200 w/ images/sizes/CTAs, 358/349 draft & absent, D-326 UTM URLs persist UTM through the www redirect). Remaining items are operational: WhatsApp <15-min staffing, thin stock, no pixel (UTM-only), open price-in-creative decision. Cleared to launch. Next: operator runs ads → D-330 read results in ~5–7 days (Admin→Customer Inquiries by utm_campaign=first_loafers_test + product relation + manual WhatsApp tally).
- **D-328 (2026-06-18) — brand-risk cleanup DONE:** products 358 `Louis Vuitton Loafer Bej` + 349 `BOSS Süet Loafer` set to `status: draft` (operator-approved; active→draft, reversible, no rename/delete). Storefront + all 3 ad PDPs verified 0× brand names; active set = `[353,354,355,359]`. D-327 trademark leak RESOLVED. **Guard:** keep brand-named products non-`active` before any campaign (re-check active titles for brand names; Telegram intake could re-activate).

## Active facts to remember
- Storefront = `src/app/(app)/UygunApp.jsx` (SPA). Active product card = its `Card`. `src/components/ProductCard.tsx`/`ProductGrid.tsx` are DEAD — don't edit. **Do NOT add WhatsApp icon buttons to product cards.**
- PDP = SSR `src/app/(app)/products/[slug]/page.tsx`. PDP footer = `src/components/StorefrontFooter.tsx` (separate from the SPA footer).
- Social-proof reviews are DEMO; `DEMO_REVIEWS_ENABLED=false` in prod (soft summary card only — never present fake reviews/counts).
- Attribution: `src/lib/attribution.ts` (first-touch UTM) + `src/lib/trackEvent.ts` (internal, no external pixels). No GA4/Meta/TikTok pixels — D-316B pending operator approval + KVKK decision.
- Push workflow: code on a feature branch in worktree `C:\Users\W11\Desktop\uygunayakkabi-website-sweep`; fast-forward push to `main` via `git -c credential.helper=manager`.

## Open / pending
- D-324 (2026-06-18): only ONE active placeholder existed (id 361). The other 16 `Taslak Ürün …` products were already `draft`. Telegram intake still mints `Taslak Ürün …` drafts — they stay `draft` (hidden) until promoted to `active`, so this can recur if one is ever published prematurely.
- D-322 (2026-06-14): D-320 verified end-to-end (product FK + UTM persisted in DB). D319/D320 test leads (id 10/11) marked `status=spam` (reversible; not hard-deleted per deletion guardrail — operator may hard-delete if wanted).
- Products hard-delete returns 500 (uninvestigated).
- D-316B external ad pixels — awaiting operator approval + consent/KVKK decision.

## Standing rule (operator, 2026-06-14)
After each Uygunayakkabi D-task, update the project-control memory files: PROJECT_STATE / DECISIONS / TASK_QUEUE / BUGS_AND_FIXES / DEPLOYMENT_LOG / CLAUDE_MEMORY. No secrets/PII; record only what actually happened.

## Standing rule update (operator, 2026-07-02)
After **every** Hermes-made repo change, without exception, update the relevant in-repo memory/context files in the same task so Claude/Codex inherit accurate state and do not hallucinate from stale project memory. At minimum consider `CLAUDE_MEMORY.md`, `PROJECT_STATE.md`, `TASK_QUEUE.md`, `BUGS_AND_FIXES.md`, `DEPLOYMENT_LOG.md`, `AGENTS.md`, `CLAUDE.md`, and relevant `chatgpt-project-sources/` files. Never record secrets.
