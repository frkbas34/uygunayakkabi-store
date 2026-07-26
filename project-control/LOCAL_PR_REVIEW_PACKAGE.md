# Local PR Review Package

Last updated: 2026-07-25

## D-398 Local PR review package

Status: PR #6 merged the reviewed `codex/master-build-plan-d500` stack into
`main`; PR #7 merged the D-501 follow-up as `8adfd1b`. Both Vercel Production
deployments completed successfully. Vercel Production deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready.

This file records the completed D-500 review package and the completed D-501
follow-up review. The public desktop smoke passes, and a Chrome DevTools
responsive `390 x 844` production screenshot visually confirms the fixed
controls fit without visible horizontal overflow. This archive is
not permission to deploy, run live Telegram commands, queue Shopier jobs, call
providers, sync optional OpenClaw, activate SupplierScout, revive retired
channels, or spend on ads.

## Proposed PR Title

chore: harden catalog ops, storefront merchandising, and local handoff guardrails

## Scope Summary

This local review package covers the D-380-D-406 plus D-422-D-500 stack:

- D-380 manual ad launch-pack support.
- D-381 story dispatch brand-safety hardening.
- D-382 story-dispatch lint cleanup.
- D-383 manual ad performance reporting.
- D-384 ad-performance runtime smoke.
- D-385 runtime-smoke governance.
- D-386 Shopier command governance.
- D-387 product loading plan.
- D-388 load-plan runtime smoke.
- D-389 operator live-smoke plan.
- D-390 Mentix/OpenClaw live-smoke alignment.
- D-391 Shopier refund update traceability.
- D-392 Shopier refund-request idempotency.
- D-393 operator smoke-plan Shopier webhook preflight.
- D-394 lead follow-up plan.
- D-395 lead-followup runtime smoke.
- D-396 operator smoke-plan lead-followup alignment.
- D-397 local release candidate boundary.
- D-398 local PR review package.
- D-399 loading-plan first product worklist.
- D-400 Shopier dashboard batch review sample.
- D-401 OpenClaw VPS verification guardrail.
- D-402 historical soak-script quarantine.
- D-403 provider reality audit.
- D-404 image regeneration plan.
- D-405 image-plan runtime smoke.
- D-406 Shopier runtime-smoke batch review alignment.
- D-422 product-flow operator checklist.
- D-423 product-flow checklist dependency ordering.
- D-424 product-flow primary operator step.
- D-425 load-plan product-flow handoff.
- D-426 operator smoke-plan load-plan handoff alignment.
- D-427 load-plan runtime product-flow handoff.
- D-428 Shopier dashboard product-flow handoff.
- D-429 Shopier preview product-flow handoff.
- D-430 operator smoke-plan Shopier handoff alignment.
- D-431 operator smoke-plan Shopier credential hold.
- D-432 operator smoke-plan manual ad preflight alignment.
- D-433 operator smoke-plan storefront trust preflight.
- D-434 operator smoke-plan inquiry guard preflight.
- D-435 operator smoke-plan attribution preflight.
- D-436 operator smoke-plan sitemap preflight.
- D-437 operator smoke-plan Telegram access preflight.
- D-438 Product Flow Snapshot operator links.
- D-439 loading-plan worklist operator links.
- D-440 Shopier preview/dashboard operator links.
- D-441 Shopier preview credential holds.
- D-442 lead follow-up operator links.
- D-443 operator inbox product links.
- D-444 lead desk operator links.
- D-445 order desk operator links.
- D-446 business snapshot next-action hints.
- D-447 funnel snapshot next-action hints.
- D-448 ad-readiness next-action hints.
- D-449 operator smoke-plan latest-boundary label.
- D-450 retired-channel memory-lock guardrail.
- D-451 PDP conversion trust guardrail.
- D-452 ad-readiness storefront trust hint.
- D-453 source-pack latest-boundary guardrail.
- D-454 loading-plan batch summary.
- D-455 loading-plan batch focus.
- D-456 loading-plan focus queue.
- D-457 loading-plan focus details.
- D-458 product-flow checklist summary.
- D-459 product-flow dispatch summary.
- D-460 product-flow dispatch recovery paths.
- D-461 control-truth Memory Lock reconciliation.
- D-462 BlogPosts featured-image schema drift repair.
- D-463 Mentix skill runtime-truth reconciliation.
- D-464 homepage merchandising rail wiring.
- D-465 Obsidian control-center alignment.
- D-466 protected-brand remediation plan.
- D-467 protected-brand manual activation hard gate.
- D-468 product workflow golden path.
- D-469 Turbopack workspace-root pin.
- D-470 Product Flow action-ID handoff.
- D-471 public storefront safety gate.
- D-472 verified storefront metrics gate.
- D-473 Product Flow Website visibility truth.
- D-474 safe public PDP link policy.
- D-475 direct Telegram UTM guard.
- D-476 catalog risk-first loading-plan order.
- D-477 protected-brand provenance review audit.
- D-478 provenance review delivery idempotency.
- D-479 Blog editorial preflight and first-publication guard.
- D-480 Shopier webhook authenticity fail-closed guard.
- D-481 Shopier order-ID duplicate-safety guard and applied, post-apply-verified index.
- D-482 Shopier order and stock transaction boundary.
- D-483 non-Shopier order stock transaction boundary.
- D-484 non-Shopier conditional stock reservation.
- D-485 Shopier atomic floor-at-zero decrement.
- D-486 storefront image fallback and structured data safety.
- D-487 shared Blog and PDP JSON-LD serialization.
- D-488 optional OpenClaw VPS deploy guard.
- D-489 confirmation-wizard schema governance.
- D-490 lead-status enum schema governance.
- D-491 order-to-lead relationship schema governance.
- D-492 storefront header and Camper brand-safety correction.
- D-493 X direct/fallback provider readiness alignment.
- D-494 Meta gallery media selection alignment.
- D-495 Meta public-media dispatch preflight.
- D-496 lead-followup runtime smoke completeness.
- D-497 brand remediation external-exposure visibility.
- D-498 brand remediation provenance-state workflow.
- D-499 batch Image QC remediation queue.
- D-500 Meta provider configuration unification.

Grouped review areas:

- Phase 7 orders, leads, stock, and analytics: order lifecycle assertions, D-445 shared order desk links for `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts, D-446 `/business` safe next-read hints for lead/order/stock urgency, D-447 `/funnel` safe next-read hints for lead/order/UTM follow-up, Shopier order/refund stock reconciliation, refund lifecycle idempotency, business/funnel diagnostics, lead follow-up plan, lead-followup runtime smoke, D-442 lead/product operator links, and D-444 shared lead desk links for `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts.
- Phase 8 manual ads and growth support: ad readiness with D-448/D-452 safe next-read hints, ad launch pack, ad performance report, UTM updates, storefront trust/PDP conversion guardrails, inquiry guard preflight, attribution preflight, sitemap preflight, read-only ad-readiness/ad-performance smokes, and D-432/D-449 `/smokeplan` ordering that places trust/lead-form/attribution/sitemap/ad evidence after lead visibility and before Shopier queue preflights. No autonomous ad spend.
- Phase 4/5/9/10 publishing and operations: D-493 keeps direct X publishing behind the same complete OAuth contract reported by provider health, with optional n8n fallback only for an explicit X webhook. D-494 makes Meta direct selection scan all gallery URLs for public HTTPS media, and D-495 fails Meta dispatch before direct/fallback requests when none exists. D-496 keeps the lead-followup runtime smoke relation-complete by registering BlogPosts with Products. D-497 makes protected-brand remediation show recorded Facebook/Instagram/X/Shopier dispatch history without treating it as live remote evidence or authorizing cleanup. D-498 turns those read-only facts into per-row provenance state and a safe manual next step without recording a decision. D-499 turns batch Image QC backlog into protected-brand-first, Image Plan/Product Flow reads without recording QC or queueing generation. D-500 makes Facebook direct dispatch and provider-health use the same `INSTAGRAM_PAGE_ID` deployment source, removes retired fallback keys from the environment template, and documents the current X OAuth 1.0a contract. Runtime-smoke governance, historical soak-script quarantine, provider reality audit, D-450 retired-channel Memory Lock guardrail, D-453 source-pack latest-boundary guardrail, operator `/smokeplan` with Telegram access preflight before the first live Telegram read, load-plan-selected product-flow preflight before provider diagnostics, storefront trust, inquiry guard, attribution, sitemap, and manual ad readiness/performance preflights before paid-traffic decisions, Shopier webhook local preflight, Shopier row product-flow handoff hold before queue decisions, Shopier credential/webhook readiness hold before queue approval, local release candidate manifest, and this local PR review package.
- Phase 1 schema hygiene: D-462 adds a confirmation-gated metadata preflight for the build-discovered `blog_posts.featured_image_id` drift and a dry-run-first, additive repair helper. The separately approved 2026-07-24 migration created the missing column, exact media foreign key, and supporting index in the configured database; its post-apply check passes. D-469 pins Turbopack workspace discovery to the repository root so a parent lockfile cannot alter local production-build inference. D-489 removes request-time wizard schema DDL and provides a read-only preflight plus dry-run-first helper for its pre-provisioned session table. D-490 removes raw enum DDL from Telegram lead-status failures, while D-491 blocks manual lead conversion before an order write when its relationship schema is missing; both provide read-only preflights and conservative dry-run-first helpers.
- Phase 3 control-layer truth: D-463 makes every repo-side Mentix skill, optional activation template, and dashboard name Hermes/Mentix as current. OpenClaw is historical/optional until explicit reactivation and VPS verification; skills stay advisory, draft, or read-only and cannot imply publishing, provider, schema, or durable-memory writes. D-488 makes the legacy VPS sync exit before any write/copy/restart unless both explicit reactivation flags are supplied after the verification evidence.
- Phase 6 storefront conversion: D-464 routes the homepage's server-selected editor-pick, best-seller, deal, and discount lists into their matching rails. It removes positional catalog slicing from the Best Sellers claim and keeps underfilled curated rails hidden. D-471 keeps placeholder-title and protected-brand legacy records out of public rails, direct PDPs/metadata, and sitemap URLs without changing product data. D-472 hides numeric trust metrics until an operator explicitly enables three verified values. D-474 applies the same public-safety gate to operator PDP links and ad UTM examples, while D-475 applies it to direct Telegram `/utm` output with the additional active-status marketing requirement. D-486 makes PDP image resolution generated-first with original-media fallback, aligns Product JSON-LD image/availability with that storefront truth, and safely serializes inline schema. D-492 gives the announcement bar a fixed-header row and extends the shared protected-brand gate to Camper.
- Phase 0 project control: D-465 refreshes the five root Obsidian control notes and protects their current architecture, bot, channel, roadmap, and approval-gate truth. It also restores story-dispatch brand-safety coverage to `test:safe`.
- Phase 10 catalog scale-up: product loading plan, D-454 batch summary with worklist priority/blocker counts plus first command, D-455 batch focus with a deterministic bottleneck label/reason/next safe read, D-456 focus refs and focus queue for matching safe read commands, D-457 focus details with the reason list beside each queued command, D-466 protected-brand remediation plan with `/brandplan`, matched-field evidence, and confirmation-gated runtime smoke, D-467 protected-brand manual activation hard gate across Publish Desk and the Payload hook, D-476 exposure-first ordering for active protected-brand worklist rows, D-477 preview-first provenance BotEvent audit records that do not change product eligibility, D-478 Telegram delivery idempotency for that audit record, first product worklist with `/productflow <ref>` plus exact `smoke:product-flow:read` handoffs and D-439 admin/PDP operator links, load-plan runtime smoke, Shopier/Web queue guardrails, Shopier dashboard and publish/retry previews with product-flow handoffs plus D-440 admin/PDP operator links and D-441 credential holds, Shopier runtime-smoke dashboard alignment, Shopier command governance, and story-dispatch brand-safety hardening.
- Phase 2 product workflow: `/productflow`, `/flow`, and `smoke:product-flow:read` now include a read-only operator checklist for the next missing Photos/Image QC, confirmation, content, audit, price/size/stock, target, approval, and Shopier queue step; D-423 makes content and audit suggestions dependency-aware, D-424 surfaces the single primary operator step before the full checklist, D-458 adds done/next/blocked/needs-work checklist-summary counts before the full checklist, D-459 adds active-channel dispatch-summary counts before dispatch rows, D-460 adds a deterministic recovery path beside every non-published active-channel row, D-470 uses the numeric Payload ID in all action handoffs while retaining stock-number display, D-468 adds a no-database golden path through target normalization, readiness, activation defaults, and protected-brand refusal, D-438 adds admin/PDP operator links without implying draft products are public, and D-443 extends the same link discipline to `/inbox` product rows.
- Phase 5 image workflow: read-only `/imageplan`, `/regenplan`, and `smoke:image-plan:read` bridge Image QC REVIEW/FAIL, preview approval, and manual regeneration next actions without queueing providers.
- Phase 5/6 Blog editorial safety: D-479 blocks incomplete/placeholder BlogPosts before their first publication, records `publishedAt` on a valid first publication, preserves legacy published edits, and flags AI/evidence-sensitive wording for manual operator claim review. `/blogpreflight` and `smoke:blog-preflight:read` are read-only diagnostics.
- Phase 5/6 inline-schema safety: D-487 moves Product/FAQ and Blog Article JSON-LD through one safe serializer, preventing stored content from closing an inline schema script without changing schema data or publishing behavior.
- Phase 7 inbound Shopier safety: D-480 verifies the documented HMAC-SHA256 signature against the exact raw body with constant-time comparison and configured token rotation. Missing configuration fails closed with `503`; invalid signatures return `401` before parsing, order/stock/refund writes, or Telegram notification.
- Phase 7 Shopier order idempotency: D-481 makes `shopierOrderId` unique and returns from a duplicate-key order create before stock decrement. The reviewed partial unique index was applied after explicit approval and its post-apply read-only check passes; reviewers should still distinguish configured-database schema evidence from live webhook delivery or provider action.
- Phase 7 Shopier transaction boundary: D-482 runs the local Order create, product/variant stock updates, and InventoryLog writes through one Payload transaction request. It fails closed before writes if no transaction starts; a verified processing failure returns `500` for retry, and the webhook alert follows commit while the generic Orders hook skips Shopier.
- Phase 7 non-Shopier order integrity: D-483 runs product/variant stock and InventoryLog work before the generic new-order alert under the parent Payload request. Missing product/size, unknown variant, and insufficient stock throw so Payload rolls back the Order create instead of retaining stock drift; lifecycle reactions remain advisory.
- Phase 7 non-Shopier concurrency: D-484 replaces stale read-then-write stock mutation with a conditional PostgreSQL `stock >= quantity` reservation inside the same parent transaction. A concurrent last-unit loss throws and rolls the Order create back before InventoryLog creation.
- Phase 7 Shopier concurrency: D-485 keeps paid external orders inside D-482's transaction while replacing literal stock writes with atomic floor-at-zero product/variant decrements. Concurrent distinct deliveries cannot leave falsely high local stock, while zero local stock does not erase a paid order or its audit.
- Hermes/Mentix alignment: repo-side skills point live-smoke planning to `/smokeplan`; Hermes is the current agent-control layer; OpenClaw remains historical/optional unless explicitly reactivated; optional OpenClaw sync is verification-first through `OPENCLAW_VPS_VERIFICATION.md`.

## Architecture Invariants For Review

- Payload/Next remains the source of truth for products, media, orders, leads, stock, bot events, AI jobs, publishing status, and job queues.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- n8n is optional glue only.
- Shopier remains the checkout/sales bridge; website-native checkout is deferred.

## Reviewer Focus

Reviewers should focus on:

1. Whether each new operator command remains read-only unless explicitly documented as a guarded queue/action path.
2. Whether Shopier order/refund lifecycle changes are idempotent and do not double-mutate stock.
3. Whether D-482 uses the same Payload transaction request for Order, stock, and InventoryLog writes, returns `500` for a verified processing failure, and remains consistent with D-481's applied, post-apply-verified database index.
4. Whether D-483 keeps non-Shopier order stock and InventoryLog writes on the parent Payload request, rejects unresolved or insufficient stock before persistence, and leaves lifecycle reaction work advisory.
3. Whether `/smokeplan` orders local/read-only checks before any live Telegram, Shopier, provider, publish, redispatch, or ad action.
4. Whether docs and `chatgpt-project-sources` stay aligned with current truth.
5. Whether no retired channel or SupplierScout activation path was reintroduced.
6. Whether Product Flow Snapshot, loading-plan worklist, and Shopier preview/dashboard links are deterministic, read-only, and only show public PDP links for public product statuses.
7. Whether Shopier preview credential holds keep preview available, do not print secrets, and still leave confirm queue/retry actions credential-gated.
8. Whether lead follow-up links stay read-only, expose direct lead/product context, and only show public PDP links for public product statuses.
9. Whether `/inbox` product links stay read-only and only show public PDP links for public product statuses.
10. Whether shared lead desk links stay read-only across `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts.
11. Whether shared order desk links stay read-only across `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts without changing order status or stock.
12. Whether `/business` next-action hints stay limited to safe read commands and do not suggest queue/publish/ad actions.
13. Whether `/funnel` next-action hints stay limited to safe read commands and do not suggest Shopier confirm, ad launch, queue, or publish actions.
14. Whether `/adready` next-action hints stay limited to safe read/check/copy-draft commands, include the storefront/PDP trust preflight for review/ready products, and do not suggest Shopier confirm, ad launch, queue, publish, Pixel/CAPI, or provider actions.
15. Whether `/smokeplan` renders the current D-452 boundary label without changing the safe read/check order.
16. Whether Memory Lock handoff files keep Dolap/Threads retired and do not describe them as scaffolded/planned/active work.
17. Whether `test:storefront-trust` keeps buyer-facing PDP essentials pinned: draft 404 behavior, gallery, size/stock clarity, lead form, WhatsApp CTA, Shopier CTA, FAQ fallback, and safe similar-products gating.
18. Whether D-486 keeps original-media fallback, Product schema image and availability truth, and inline JSON-LD serialization covered without a live storefront action.
18. Whether `test:source-pack` rejects stale latest-boundary wording such as current D-449 smoke-plan text or a D-422-D-451 stack description.
19. Whether `/loadplan` and `smoke:load-plan:read` keep the D-454 batch summary read-only, deterministic, and aligned with the first worklist command.
20. Whether the D-455 batch focus chooses a deterministic safe bottleneck label and next safe read without mutating products, queueing jobs, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending on ads.
21. Whether the D-456 focus refs and focus queue only include matching worklist products and safe read commands.
22. Whether the D-457 focus details explain the matching product reasons beside each safe focus-queue command without writing products, queueing jobs, calling providers, calling Shopier, or spending on ads.
23. Whether the D-458 Product Flow Snapshot checklist summary counts done/next/blocked/needs-work rows correctly and stays read-only across Telegram and runtime smoke output.
24. Whether the D-459 Product Flow Snapshot dispatch summary counts active-channel published/queued/failed/blocked/not-configured/unrecorded states correctly and stays read-only across Telegram and runtime smoke output.
25. Whether D-460 keeps each non-published Product Flow Snapshot dispatch row's state, recorded reason, and deterministic recovery path together without executing or bypassing the guarded Shopier/redispatch flows.
26. Whether D-461 Memory Lock files keep Payload/Next and Hermes current, OpenClaw/n8n optional, SupplierScout dormant, and reject the old live Telegram-to-OpenClaw-to-n8n path.
27. Whether D-462 keeps the BlogPosts schema preflight read-only, refuses mutation flags, and keeps the additive repair helper dry-run by default for any future environment until an operator explicitly confirms DDL.
28. Whether D-463 keeps Hermes/Mentix current, treats OpenClaw as optional historical templates until verified, and confines skill output to advisory, draft, or read-only support with PII-light durable decision handling.
29. Whether D-464 keeps homepage merchandising labels backed by their server-curated memberships, preserves eligibility/section toggles, and avoids arbitrary positional catalog slices for Best Sellers, Deals, or Editor Picks.
30. Whether D-465 keeps the root Obsidian notes synchronized with Payload/Next execution, Hermes/Mentix current control, optional OpenClaw/n8n, own-products-only scope, active/retired channels, SupplierScout dormancy, roadmap state, and approval gates; and whether story-dispatch coverage remains in `test:safe`.
31. Whether D-466 keeps protected-brand remediation read-only, shows severity/brand/matched-field evidence and safe product-flow links, and never rewrites product text, changes status, retires, activates, publishes, redispatches, or calls external services.
32. Whether D-467 keeps protected-brand safety as a hard activation gate in both Publish Desk and the Payload hook, including when manual override intent is supplied.
33. Whether D-468 composes active-channel-only target normalization, clean readiness, activation defaults, and protected-brand refusal without connecting to Payload or an external service.
34. Whether D-469 pins Turbopack to this repository without changing application routes or external integration behavior.
35. Whether D-470 keeps the stock-number display reference while all Product Flow action commands use a numeric Payload ID that legacy ID-only Telegram handlers can parse.
36. Whether D-471 consistently keeps placeholder-title and protected-brand legacy records out of public rails, PDPs, metadata, and sitemap URLs without changing the corresponding Payload records.
37. Whether D-472 keeps numeric trust metrics hidden by default, without fallback claims, and renders them only when the operator enables complete verified values.
38. Whether D-473 keeps Website dispatch and Product Flow PDP links blocked for drafts and storefront-unsafe products, even with stale historical website dispatch notes.
39. Whether D-474 keeps every operator PDP link and ad landing/UTM example behind the same public-storefront safety policy while preserving the corresponding Payload admin link.
40. Whether D-475 refuses direct Telegram UTM output for a product without a slug, without active status, or failing public storefront safety before any URL is constructed.
41. Whether D-476 surfaces active protected-brand exposure before draft protected-brand backlog in the read-only loading plan, regardless of secondary blocker count.
42. Whether D-477 keeps `/brandreview` preview-first, writes only one BotEvent after explicit confirmation, never edits a product or weakens the protected-brand hard gate, and lets `/brandplan` plus its smoke show the latest valid evidence read-only.
43. Whether D-478 recognizes a retried Telegram delivery for the same confirmed `/brandreview`, returns the original record, and does not create a duplicate audit event or any product/integration mutation.
44. Whether D-479 blocks incomplete or placeholder BlogPosts only on their first publication, sets `publishedAt` for a valid first publication, preserves legacy published edits, and keeps `/blogpreflight` plus its read-only smoke free of article writes, publication, provider calls, and spend.
45. Whether D-480 fails closed when `SHOPIER_WEBHOOK_TOKEN` is missing, verifies the exact raw body in constant time for configured rotation tokens, and refuses invalid deliveries before any JSON parsing, order/stock/refund mutation, or Telegram notification.
46. Whether D-481 confines duplicate-key handling to `payload.create`, skips stock mutation after that conflict, and keeps its partial unique-index helper dry-run-first for future environments while recording the approved configured-database apply as post-apply verified.
47. Whether D-483 keeps generic order alert work after fail-closed stock mutation and retains Shopier's separate transactional webhook path.
48. Whether D-489 keeps all `CREATE TABLE` and `ALTER TYPE` work out of Telegram confirmation, preserves row-level session persistence against a pre-provisioned table, and keeps the metadata preflight and create-only helper explicitly approval-gated.
49. Whether D-490 keeps lead-status enum drift as a no-write/no-audit Telegram result, exposes no executable DDL, and retains its metadata preflight plus baseline-guarded apply helper behind separate approval.
50. Whether D-491 detects a missing order-to-lead relationship before manual conversion writes an Order, lead status, or audit event, exposes no executable DDL, and retains its metadata preflight plus absent-only apply helper behind separate approval.
51. Whether D-493 requires all four X OAuth values before direct dispatch, uses `N8N_CHANNEL_X_WEBHOOK` only as explicit optional fallback, and records a readable configuration failure without a provider call when neither path is ready.
52. Whether D-494 selects a later public HTTPS gallery image for direct Instagram/Facebook dispatch instead of falling through to optional n8n because the first image is insecure or relative.
53. Whether D-495 records a media-specific Meta failure and makes no direct or optional fallback request when a gallery has no public HTTPS image.
54. Whether D-496 registers BlogPosts with Products in the lead-followup read-only smoke so the Product relationship cannot prevent PII-light lead diagnostics.
55. Whether D-497 shows only recorded Facebook/Instagram/X/Shopier `published`, `queued`, and `failed` dispatch notes for protected-brand triage, excludes native Website state, and never treats those notes as live remote evidence or cleanup authority.
56. Whether D-498 classifies every protected-brand row by recorded provenance state, prioritizes manual verification for stored external history, and keeps its suggested step read-only unless the operator separately confirms a provenance decision.
57. Whether D-499 routes protected-brand Image QC rows to provenance first, gives non-brand backlog only Image Plan/Product Flow reads, and never records QC, queues generation, or publishes from the batch queue.
58. Whether D-499 per-product Product Flow and Image Plan diagnostics offer only preview-first provenance review for protected-brand records and withhold Image QC, generation, activation, Shopier, redispatch, and ad suggestions.
59. Whether D-499 Product Flow and Image Plan reads use the latest product provenance BotEvent to advance evidence, copy-fix, or keep-excluded guidance without weakening the protected-brand gate.
60. Whether D-500 keeps Facebook direct dispatch and provider-health on `INSTAGRAM_PAGE_ID`, never asks operators to create the removed Payload field, and keeps retired fallback keys out of `.env.example`.

## Validation To Include

Before asking for a human PR review, include the latest output summary for:

- `npm run test:local-pr-review`
- `npm run test:local-release-candidate`
- `npm run test:confirmation-wizard`
- `npm run test:runtime-smokes`
- `npm run test:lead-status-schema`
- `npm run test:lead-conversion-schema`
- `npm run validate`
- `npm run build`
- `npm run test:loading-plan`
- `npm run test:brand-safety-plan`
- `npm run test:brand-provenance-review`
- `npm run test:brand-provenance-command`
- `npm run test:blog-preflight`
- `npm run test:blog-publishing-guard`
- `npm run test:blog-preflight-command`
- `npm run test:shopier-webhook-security`
- `npm run test:shopier-webhook-local`
- `npm run test:order-stock-transaction`
- `npm run test:lead-followup-plan`
- `npm run test:lead-desk`
- `npm run test:order-desk`
- `npm run test:business-desk`
- `npm run test:funnel-desk`
- `npm run test:ad-readiness`
- `npm run test:utm-builder`
- `npm run test:utm-command`
- `npm run test:operator-inbox`
- `npm run test:shopier-publish-control`
- `npm run test:shopier-commands`
- `npm run test:openclaw-vps-verification`
- `npm run test:mentix-skills`
- `npm run test:soak-scripts`
- `npm run test:provider-reality`
- `npm run test:channel-dispatch`
- `npm run test:provider-health`
- `npm run test:meta-provider-credentials`
- `npm run test:redispatch`
- `npm run test:dispatch-status`
- `npm run test:image-regeneration-plan`
- `npm run test:runtime-smokes`
- `npm run test:product-flow-snapshot`
- `npm run test:product-workflow`
- `npm run test:operator-smoke-plan`
- `npm run test:telegram-access`
- `npm run test:inquiry-guard`
- `npm run test:attribution`
- `npm run test:sitemap-entries`
- `npm run test:storefront-trust`
- `npm run test:product-storefront-images`
- `npm run test:product-structured-data`
- `npm run test:structured-data`
- `npm run test:blog-structured-data`
- `npm run test:merchandising`
- `npm run test:homepage-merchandising`
- `npm run test:obsidian-control`
- `npm run test:story-dispatch`
- `npm run test:source-pack`
- `npm run test:ops-runbook`
- `npm run test:retired-channels`
- `npm run typecheck`
- `git diff --check`
- `npm run validate`

Current validation result: D-480 Shopier webhook authenticity passes raw-body/constant-time/fail-closed security checks, the combined Shopier stock/refund lifecycle preflight, full `npm run validate`, and `npm run build` with lint 0 errors / 0 warnings. It makes no Shopier API call, live webhook delivery, automatic order/product mutation, or external action. D-479 Blog editorial preflight and D-462 default-dry-run/read-only-refusal paths remain verified; the separately approved 2026-07-24 schema apply still passes its post-apply check and the subsequent production build.

D-482 validation result: the local Order create, product/variant stock updates,
and InventoryLog writes share one Payload transaction request; transaction setup
fails closed, and a verified processing failure returns `500` for Shopier retry.
`test:payload-transaction`, `test:shopier-order-transaction`,
`test:shopier-webhook-local`, full `npm run validate`, and `npm run build` pass.
No database metadata read, DDL, live Shopier webhook/API, Payload write,
provider call, external dispatch, or deployment was run. D-481's reviewed index
is now applied and post-apply verified separately in the configured database.

D-483 validation result: non-Shopier Orders now run product/variant stock and
InventoryLog writes before the generic alert with the parent Payload request.
Missing product/size, unknown variant, and insufficient stock throw so Payload
can roll back the parent create. `npm run test:order-stock-transaction`, full
`npm run validate`, `npm run build`, and `git diff --check` pass locally. No
database, Shopier, Telegram, provider, Payload runtime write, dispatch, or
deployment was run.

D-481 validation result: its pure duplicate-key classifier, schema/apply governance, safe-suite preflight, runtime-smoke inventory, `npm run validate`, and `npm run build` pass locally. After the approved 2026-07-25 preflight and no-connection dry run, the concurrent partial unique index was applied with SQL fingerprint `c79810ec7a084bfc`. The post-apply read-only check confirms zero duplicate non-empty IDs and present `orders_shopier_order_id_unique_idx`; `npm run test:shopier-webhook-local` passes. Live Shopier webhook/API delivery and Payload business-data mutation remain not run.

chatgpt-project-sources contains 20 Markdown documents and is at the 20-document source-pack limit; update or merge an existing source file before adding another.

## Not Run / Not Done

The approved PR review merged PR #6 into `main`. Vercel Production deployment
`dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready and public homepage/PDP smoke
checks pass. No live Telegram command, live Shopier webhook smoke, provider
call, external dispatch, queue write, ad spend, SupplierScout activation,
retired-channel activation, or optional OpenClaw sync has been performed.

## Suggested PR Notes

Summary:

- Added local-only catalog operations guardrails, read-only smoke planning, lead follow-up visibility, Shopier order/refund lifecycle hardening, manual ad support surfaces, and release/PR handoff governance.
- Added protected-brand remediation planning so `/brandplan` and `smoke:brand-safety:read` turn catalog blockers into a manual provenance queue without rewriting or publishing products.
- Added preview-first `/brandreview` provenance audit records so an operator can document an evidence decision without editing a product or bypassing its safety gate.
- Made confirmed `/brandreview` audit records retry-safe by returning the prior BotEvent for the same Telegram delivery instead of writing a duplicate.
- Added shared Blog editorial preflight so incomplete or placeholder first publications are rejected, while AI/evidence-sensitive claims remain explicitly operator-reviewed.
- Added OpenClaw VPS verification-first guardrails so repo skill files are not mistaken for deployed VPS state.
- Added historical soak-script quarantine guardrails so old live-data soak harnesses are not mistaken for validation or read-only runtime smokes.
- Added provider reality audit guardrails so local env readiness is not mistaken for production provider readiness.
- Added image regeneration planning so Image QC REVIEW/FAIL and preview states have safe operator next actions before any provider queue.
- Added image-plan runtime smoke so repo-side Payload evidence can mirror `/imageplan` before live Telegram reads.
- Aligned the Shopier runtime smoke so repo-side Payload evidence mirrors `/shopier dashboard` batch review rows before live Telegram reads.
- Added Shopier dashboard product-flow handoffs so `/shopier dashboard` and `smoke:shopier:read` show `/productflow <ref>` plus exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` beside each batch review row before queue decisions.
- Added Shopier publish/retry preview handoffs so `/shopier publish-ready` and `/shopier retry-errors` show `/productflow <ref>` plus exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` before confirm, while confirm remains blocked without `SHOPIER_PAT`.
- Aligned `/smokeplan` with the Shopier row handoffs so operators pause on `/productflow <ref>` plus exact repo product-flow smoke commands before any Shopier confirm action.
- Added a `/smokeplan` Shopier credential hold so operators verify `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness outside chat before any confirm action.
- Added `/smokeplan` manual ad preflights so operators run `smoke:ad-readiness:read`, `/adready`, `smoke:ad-performance:read`, and `/adreport week` after lead visibility and before Shopier queue checks without launching ads.
- Added a `/smokeplan` storefront trust preflight so `npm run test:storefront-trust` runs before ad-readiness checks, keeping fake reviews and placeholder testimonials out of paid-traffic prep.
- Added a `/smokeplan` sitemap preflight so `npm run test:sitemap-entries` runs after attribution and before ad-readiness checks, keeping static route, website-visible product, and blog sitemap/degrade-safe checks in paid-traffic prep.
- Added a source-pack latest-boundary guardrail so `test:source-pack` rejects stale current D-449 smoke-plan wording and older D-422-D-451 stack descriptions.
- Added a loading-plan batch summary so `/loadplan` and `smoke:load-plan:read` show worklist candidate counts, priority/blocker totals, and the first safe command before the product rows.
- Added a loading-plan batch focus so `/loadplan` and `smoke:load-plan:read` show the dominant safe bottleneck label, reason, and next safe read before product rows.
- Added a loading-plan focus queue so `/loadplan` and `smoke:load-plan:read` show matching focus refs and safe read commands before product rows.
- Added loading-plan focus details so `/loadplan` and `smoke:load-plan:read` show each focus-queue product's reason list beside its safe read command.
- Added a `/smokeplan` Telegram access preflight so `npm run test:telegram-access` runs before the first live Telegram read, keeping private DM allowlist behavior visible before operator reads.
- Added a `/smokeplan` inquiry guard preflight so `npm run test:inquiry-guard` runs after storefront trust and before ad-readiness checks, keeping honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback checks in paid-traffic prep.
- Added a `/smokeplan` attribution preflight so `npm run test:attribution` runs after inquiry guard and before ad-readiness checks, keeping first-touch UTM/referrer capture and lead-submit attribution merge checks in paid-traffic prep.
- Updated the `/smokeplan` rendered title to `Operator Live Smoke Plan (D-389/D-452)` so the operator-facing checklist reflects the current D-452 ad-readiness guidance and latest local handoff boundary.
- Extended retired-channel governance to cover `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md`, so Dolap/Threads stay retired in the session-start handoff files and cannot drift back to scaffold/planned/active wording.
- Extended storefront trust governance to pin buyer-facing PDP essentials before paid traffic: draft products stay hidden, gallery remains mounted, size/stock clarity stays variant-backed, lead form carries product context, WhatsApp and Shopier CTAs stay present and gated, FAQ fallback remains, and similar products stay public-status/merchandising gated.
- Added a `/adready` storefront trust hint so review/ready products point operators to `npm run test:storefront-trust` before `/adpack` or manual paid traffic, while blocked products still point to blocker/image diagnostics first.
- Added a product-flow operator checklist so `/productflow` and the matching runtime smoke show the staged next product workflow step before activation or Shopier queueing, with dependency-aware confirmation/content/audit command ordering and one primary operator step.
- Wired homepage Editor Picks, Best Sellers, Deals, and Discounts to the server-selected merchandising memberships, with local guards against arbitrary catalog-order claims.
- Refreshed the root Obsidian control center and guarded it against stale OpenClaw-current architecture wording; restored story-dispatch coverage to baseline validation.
- Added a product-flow checklist summary so `/productflow`, `/flow`, and `smoke:product-flow:read` show done/next/blocked/needs-work counts before the full staged checklist.
- Added Product Flow Snapshot operator links so `/productflow`, `/flow`, and `smoke:product-flow:read` show the Payload admin link and only show the PDP link for public products.
- Added a load-plan product-flow handoff so `/loadplan`, `/loadingplan`, and the matching runtime smoke show `/productflow <ref>` beside each first product worklist action.
- Added loading-plan worklist operator links so `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` show Payload admin links and public PDP links only for public products.
- Added Shopier preview/dashboard operator links so `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows show Payload admin links and public PDP links only for public products, while confirmed queue/retry output stays free of preview-only links.
- Added Shopier preview credential holds so `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview rows show whether `SHOPIER_PAT` is configured before confirm commands, without blocking preview or printing secrets.
- Added lead follow-up operator links so `/leadplan`, `/followupplan`, and `smoke:lead-followup:read` surface lead-admin, product-admin, and public-status-only PDP links without writing leads or messaging customers.
- Added operator inbox product links so `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` product rows surface admin/PDP handoffs without product writes or publish actions.
- Added shared lead desk operator links so `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts surface lead-admin/product-admin/PDP handoffs without lead writes or customer messages.
- Added shared order desk operator links so `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts surface order-admin/product-admin/lead-admin/PDP handoffs without order writes or stock changes.
- Added business snapshot next-action hints so `/business` points urgency counts to safe read commands like `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock` without writes or unsafe actions.
- Aligned `/smokeplan` so the load-plan-selected `smoke:product-flow:read` and Telegram `/productflow` checks run before provider diagnostics.
- Added exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` commands to load-plan worklist rows so repo and Telegram product-flow preflights use the same selected product.
- Kept Payload/Next as source of truth, Hermes as the current agent-control layer, OpenClaw historical/optional unless explicitly reactivated, n8n optional, active channels limited to Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, and SupplierScout dormant.

Validation:

- `npm run validate` passes locally.
- Lint has 0 errors and 0 warnings.
- Runtime smoke commands remain operator-run and are not executed by validation.

Not run:

- No live Telegram smoke.
- No live Shopier webhook smoke.
- No provider/API spend.
- No deploy, commit, push, or PR.
