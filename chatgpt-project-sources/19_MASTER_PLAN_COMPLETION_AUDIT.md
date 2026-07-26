# Master Plan Completion Audit

Last reviewed: 2026-07-25

This is the evidence ledger for the UygunAyakkabi master build plan. Local
tests prove repository behavior only. A verified Vercel production deployment
and public browser smoke prove the storefront is live, but do not prove provider
permissions, webhook delivery, VPS state, or a real operator workflow.

## Scope Invariants

- Payload/Next is the source of truth and execution layer.
- Active channels: Website, Instagram, Facebook, X, Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- Hermes/Mentix is current for agent control; OpenClaw is optional/history.
- n8n is optional glue; direct Payload/Next is the default path.
- Shopier is the checkout bridge; native website checkout is deferred.

## Phase Evidence

| Phase | Local evidence | Completion still needs |
| --- | --- | --- |
| 0. Project control | `AGENTS.md`, `CLAUDE.md`, root Obsidian notes, 20-file source pack, and governance checks align. | Keep the source pack refreshed after future decisions. |
| 1. Repo health | `npm run validate` and `npm run build` pass; D-469 pins Turbopack workspace discovery to this repository; guarded D-462 BlogPosts relationship migration is applied to the configured database. | Normal validation before each approved release. |
| 2. Product workflow | Payload activation gate, review panel, Telegram/admin diagnostics, Product Flow Snapshot with D-470 action-ID handoff, D-473 Website visibility truth, D-474 safe operator PDP-link policy, D-475 direct Telegram UTM guard, D-467 protected-brand hard gate, D-477 provenance audit, D-478 delivery idempotency, D-489 request-time schema-DDL removal, and D-468 golden path are tested. Approved read-only Product Flow found legacy protected-brand record `SN0111` blocked from public storefront. | Operator-present admin and Telegram product-flow smoke after deploy; intentional legacy record cleanup. |
| 3. Mentix/Hermes | Hermes/Mentix responsibilities and safe skills are governed: product-flow-debugger is advisory regardless of confidence, and upload-post is copy-draft-only (no persistence, queue, or publish claim). OpenClaw remains optional and D-488 makes its legacy VPS sync explicitly reactivation-only. | VPS verification only if OpenClaw is explicitly reactivated. |
| 4. Publishing | Active-channel state, guarded Shopier controls, dispatch recovery, brand-safety blocks, D-493 X complete-OAuth/direct-or-optional-fallback alignment, D-494 Meta full-gallery public-media selection, D-495 no-public-media preflight, and D-500 shared Facebook `INSTAGRAM_PAGE_ID` configuration are tested. Latest local read shows Website ready, Instagram disabled, Facebook ready/direct, and X/Shopier missing requirements; it does not prove production. | Current provider credentials, account permissions, public-media reachability, and operator-approved real dispatch/retry evidence. |
| 5. AI/GEO | Image QC, regeneration planning, D-499 batch Image QC remediation queue and protected-brand per-product diagnostic alignment, Product Intelligence, provider-health checks, D-479 Blog editorial first-publication preflight, and D-487 safe Article schema serialization are present. Latest approved read finds 54 Image QC queue items: 12 held for provenance, 28 failures, and 14 non-brand decisions pending. Configured read shows Gemini text/image ready and no reverse-search provider selected. | Operator-approved provider quota/permission evidence and live workflow proof; manual review of AI/evidence-sensitive Blog claims. |
| 6. Storefront conversion | PDP trust/conversion checks, curated homepage rails, D-471 public safety filtering, D-472 default-hidden numeric trust metrics, D-474 safe operator/ad landing links, D-486 generated-first/original-fallback PDP images plus safe Product/FAQ schema, and D-492 fixed-header layout and Camper brand-safety coverage are tested. D-501 was merged through PR #7 (`8adfd1b`) and Vercel completed Production deployment successfully; desktop homepage/PDP smoke passes with Shopier/WhatsApp CTAs and no browser errors. | Repeat the exact 390px PDP smoke from a device-capable browser, then verify any metrics before enabling them. |
| 7. Orders/leads/stock | Lifecycle, funnel, stock, Shopier order/refund reconciliation/idempotency, D-480 raw-body fail-closed webhook authenticity, D-481 duplicate-order safety, D-482 atomic Shopier order/stock writes, D-483 atomic non-Shopier order handling, D-484 conditional non-Shopier stock reservations, D-485 atomic Shopier floor-at-zero decrements, D-490 guarded lead-status enum drift handling, D-491 guarded order-to-lead relationship drift handling, and D-496 relation-complete lead diagnostics are tested. Approved 2026-07-25 D-489/D-490/D-491 metadata preflights pass. D-481's approved concurrent partial unique index is applied and post-apply verified, with zero duplicate non-empty Shopier IDs; local `test:shopier-webhook-local` passes. Latest reads show six stale open leads, no open orders, and no seven-day funnel activity. | Obtain configured operator-approved live Shopier webhook evidence; complete manual lead follow-up. |
| 8. Ads and growth | Manual readiness, copy, UTM, and reporting support are tested; D-475 prevents direct Telegram UTM links for inactive or storefront-unsafe products, and autonomous spend is blocked. Approved `SN0111` read is blocked for public page, Image QC, and brand safety. | Sufficient catalog/image quality, traffic readiness, and separate operator approval. Pixel/CAPI/API stay deferred. |
| 9. Deployment and ops | Runbooks, release candidate, PR package, safe smoke governance, and a secret-safe provider/webhook Operator Evidence Record are tested. PR #6 merged the D-380-D-500 stack and PR #7 merged D-501 into `main`; both Vercel Production deployments completed successfully and the public desktop homepage/PDP smoke passes. | Rollback proof, exact-390px re-smoke, and operator-present live integration smoke. |
| 10. Catalog scale-up | D-466 protected-brand remediation, D-467 hard activation refusal, D-476 active-exposure-first loading-plan ordering, D-477 preview-first provenance audit records, D-478 retry-safe delivery handling, D-497 recorded external-dispatch visibility, D-498 provenance-state workflow, and D-499 batch Image QC remediation are tested locally. Latest approved sample finds 12 protected-brand blockers, all unreviewed, 8 with stored external history, 28 Image-QC failures, 14 non-brand QC decisions pending, and 83 stale drafts. This is historical evidence only; no product is auto-mutated. | Operator provenance and remote-state decisions, then intentional catalog edits; unresolved protected-brand products remain excluded. |

## Current Catalog Safety Boundary

`/brandplan` and `smoke:brand-safety:read` found 12 protected-brand blockers
in the 100-product runtime sample on 2026-07-25. D-467 makes that a hard
activation gate in both Publish Desk and the Payload hook; manual override
cannot activate those products. D-471 also hides protected-brand and
placeholder-title legacy records from public storefront and sitemap surfaces
without mutating them. Do not auto-rewrite product text. An operator must
verify provenance and only correct wording when the item is confirmed as an
unbranded own product.

D-472 keeps unverified numeric trust claims off the homepage by default. Do not enable the Site Settings metrics switch until all three displayed values have been checked against real business evidence. D-476 makes the general loading plan surface active protected-brand exposure before lower-risk draft backlog, without writing any product data. D-477 makes the human provenance decision durable as a BotEvent audit record, without changing the product or the hard gate. D-478 prevents Telegram retry delivery from duplicating that audit record.

D-497 adds stored external-dispatch context to the protected-brand remediation
queue: Facebook, Instagram, X, and Shopier `published`, `queued`, and `failed`
notes only. It excludes native Website state and does not call a provider or
prove that a remote item still exists. Treat it as a manual provenance/cleanup
triage aid, never automatic remediation authority.

D-498 adds a provenance-state count and one safe next step to every protected-
brand queue row. The approved sample has 13 unreviewed rows, 9 with external
history. That classification is advisory only: no decision is recorded and no
product or remote content is changed.

D-499 makes the Image QC backlog batch-readable before any Image QC decision or
generation. It routes protected-brand products back to provenance first, then
uses read-only Image Plan and Product Flow diagnostics for the remaining Image
QC work. Per-product diagnostics now enforce the same order by withholding
Image QC, generation, activation, Shopier, redispatch, and ad suggestions until
preview-first provenance review. They load the latest provenance BotEvent so a
recorded decision advances only the manual next step and never lifts the hard
gate. The approved sample contains 55 queue records; nothing was written.

D-500 unifies Facebook direct dispatch and provider-health configuration on
deployment env `INSTAGRAM_PAGE_ID`, replacing the stale expectation of a
Payload `facebookPageId` field. It also cleans retired Dolap/Threads fallback
variables and documents the four required direct X OAuth 1.0a values. Local
tests prove only this configuration contract; deployment/provider evidence is
still required.

D-501 records the first deployed mobile storefront evidence: the homepage had
no horizontal document overflow at 390px, but the live Classic Loafer PDP was
440px wide because fixed 40/60 CTA controls added content-box padding. The
source fix changes both controls to border-box sizing with `minWidth: 0`; the
correction was deployed when PR #7 merged it as `8adfd1b`, and Vercel completed
Production deployment successfully.
The expanded storefront-trust check, typecheck, lint, full validation, and build
pass, while desktop public smoke has no errors. A clean exact-390px smoke from a
device-capable browser is still needed before it counts as fully mobile-verified
Phase 6 evidence.

## Operator Evidence Queue

1. Review the protected-brand queue in Payload and resolve each item with real
   provenance evidence; keep unresolved items excluded from publication.
2. Run and record a clean exact-390px D-501 PDP re-smoke from a device-capable
   browser.
3. With the operator present, run `/smokeplan`, then the listed read-only
   Telegram/admin checks against the deployed system.
4. Verify active-channel provider configuration and Shopier webhook/account
   behavior without exposing secrets in chat or source files. Capture the
   deployed revision, credential names, direct/fallback path, permission/quota,
   approved probe, outcome, and next safe action using the Operator Evidence
   Record in `project-control/PROVIDER_REALITY_AUDIT.md`.
5. Run deployed storefront desktop and mobile checks before considering ads.

## Source-Pack Rule

This pack is at the 20-document limit. Update an existing source document for
future architecture or milestone changes; do not add a twenty-first file.
