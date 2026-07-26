# Local Release Candidate Boundary

Last updated: 2026-07-25

## D-397/D-500 Local release candidate boundary

Status: D-380-D-500 merged to `main` via PR #6, with D-501 merged via PR #7
(`8adfd1b`); both Vercel Production deployments completed successfully. Live
integrations remain unverified.

This file is the archived D-500 handoff manifest plus the deployed D-501
follow-up record. Vercel deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready,
and the D-501 deployment also completed successfully. Public desktop homepage/PDP
smoke checks pass with Shopier and WhatsApp CTAs and no browser errors. The exact
390px PDP re-smoke still needs a device-capable browser. The individual checkpoint
sections record their local validation boundary; this is not proof that live
Telegram, live Shopier, provider calls, ad traffic, or optional OpenClaw sync have
been performed.

## Current Architecture Invariants

- Payload/Next remains the source of truth for products, media, orders, leads, stock, bot events, AI jobs, publishing status, and job queues.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- n8n is optional glue only.
- Shopier remains the checkout/sales bridge; website-native checkout is deferred.

## Local Stack Covered By This Candidate

The current D-380-D-406 plus D-422-D-500 local candidate includes these local, not-deployed checkpoints:

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

The D-499 per-product diagnostic alignment applies the protected-brand-first
rule to `/productflow` and `/imageplan`. They show preview-first
`/brandreview <id-or-sn> needs-evidence` and withhold Image QC, generation,
activation, Shopier, redispatch, and ad suggestions while the hard block
remains.

The same D-499 Product Flow and Image Plan reads now use the latest matching
provenance BotEvent. Recorded evidence, copy-fix, and keep-excluded decisions
advance only their manual diagnostic; they do not mutate products or lift the
protected-brand hard gate.

## D-500 Local Verification Boundary

D-500 was locally validated before PR #6 and is now in the deployed source
release. It unifies direct Facebook dispatch and
provider-health on deployment env `INSTAGRAM_PAGE_ID`, not the removed Payload
`facebookPageId` column. It also removes retired Dolap/Threads fallback keys
from `.env.example` and lists the active X OAuth 1.0a keys. The existing
`/imageqcplan` and its runtime smoke
batch Image QC blockers as protected-brand review first, missing originals, QC
failures, review, or missing decisions. They only give Image Plan/Product Flow
reads. The approved 2026-07-25 sample found 55 items: 13 brand first, 28 QC
failures, and 14 decision-needed. It cannot record QC, start generation, change
products, publish, dispatch, call providers or Shopier, or spend. Focused
`test:image-qc-remediation-plan`, `test:operator-smoke-plan`,
`test:runtime-smokes`, typecheck, diff checks, full `npm run validate`, and
`npm run build` pass locally.

The D-499 per-product diagnostic alignment is additionally covered by
`test:product-flow-snapshot` and `test:image-regeneration-plan`. The approved
read-only recheck of `SN0111` makes preview-first provenance its primary step
and makes Image Plan state `brand_review_first`; no data or external action
occurred. Full `npm run validate` and `npm run build` pass after that alignment.

## D-498 Local Verification Boundary

D-498 is local-only and not deployed. The protected-brand remediation plan now
groups recorded provenance state and displays one safe next step per row, while
recorded external history remains a manual remote-verification cue. The
approved 2026-07-25 sample found 13 unreviewed protected-brand records, 9 with
stored Facebook/Instagram/X/Shopier history. It does not record a decision,
change products, clean remote listings, retry, dispatch, publish, queue,
contact a provider or Shopier, or spend. Focused `test:brand-safety-plan`,
`test:runtime-smokes`, typecheck, diff checks, full `npm run validate`, and
`npm run build` pass locally.

## D-497 Local Verification Boundary

D-497 is local-only and not deployed. `/brandplan` and
`smoke:brand-safety:read` now summarize recorded Facebook, Instagram, X, and
Shopier notes as `published`, `queued`, or `failed` for protected-brand
products; Website is native and excluded. The approved 2026-07-25 read found
13 protected-brand records, with `SN0111` recording Facebook published,
Shopier queued, and X failed. This is stored historical evidence only: it does
not call a provider, prove a remote listing exists, clean up a remote listing,
retry, publish, dispatch, queue, or change a product. Focused
`test:brand-safety-plan`, `test:runtime-smokes`, typecheck, diff checks, full
`npm run validate`, and `npm run build` pass locally.

## D-496 Local Verification Boundary

D-496 is local-only and not deployed. The lead-followup runtime smoke now
registers BlogPosts with Products, matching the Product `linkedBlogPost`
relationship. `test:runtime-smokes`, typecheck, and the approved read-only
lead smoke pass, alongside full `npm run validate` and `npm run build`. The
read returned six open stale leads with PII-light manual
actions only; it did not write leads, message customers, queue work, call
providers or Shopier, push schema, or spend on ads.

## D-495 Local Verification Boundary

D-495 is local-only and not deployed. Instagram/Facebook now return a clear
media failure before direct Meta or optional n8n fallback when the gallery has
no public HTTPS image. Mocked `test:channel-dispatch` coverage proves both
channels make zero fetch calls while preserving fallback visibility for triage.
Full `npm run validate` and `npm run build` pass locally. Production media
reachability and real Meta delivery remain pending.

## D-494 Local Verification Boundary

D-494 is local-only and not deployed. Instagram and Facebook direct dispatch
now scan the whole gallery for public HTTPS media, rather than requiring the
first image to be usable. Mocked `test:channel-dispatch` coverage proves both
direct adapters select a later valid image without a Meta or n8n call.
Full `npm run validate` and `npm run build` pass locally. Production media
reachability and real Meta delivery remain pending.

## D-493 Local Verification Boundary

D-493 is local-only and not deployed. Direct X dispatch now requires all four
OAuth 1.0a values: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and
`X_ACCESS_TOKEN_SECRET`. Partial configuration uses optional
`N8N_CHANNEL_X_WEBHOOK` only when configured; otherwise it records missing
credential names and avoids a direct provider call. `test:channel-dispatch`,
`test:provider-health`, `test:redispatch`, and `test:dispatch-status` pass
locally alongside full `npm run validate` and `npm run build`. No provider,
webhook, Payload, queue, deployment, or commit action was run; production
provider evidence remains pending.

## D-492 Local Verification Boundary

D-492 is local-only and not deployed. The storefront announcement bar now
renders inside the fixed Navbar, so it cannot overlap the wordmark. The shared
protected-brand scanner also recognizes `Camper`; activation, public storefront
eligibility, dispatch, Shopier readiness, and ad checks reuse that hard gate.
`test:brand-safety`, `test:merchandising`, `test:storefront-trust`, full
`npm run validate`, `npm run build`, and `git diff --check` pass locally. No
Payload data, database metadata, Telegram, provider, Shopier, deployment, or
commit action was run.

## D-491 Local Verification Boundary

D-491 is local-only and not deployed. A missing deployed order-to-lead
relationship now blocks manual conversion before an Order, lead-status, or audit
write and points only to a confirmation-gated metadata preflight. The reviewed
relationship helper is dry-run by default, adds only an absent nullable column
plus foreign key after separate approval, and refuses incompatible existing
schema for manual review. Focused conversion-schema checks, full `npm run
validate`, `npm run build`, `git diff --check`, and the dry-run pass locally.
The approved 2026-07-25 metadata preflight passed: the nullable integer column
and its `customer_inquiries.id` foreign key are present. No DDL, Telegram,
provider, Shopier, deployment, or commit action was run.

## D-490 Local Verification Boundary

D-490 is local-only and not deployed. A missing deployed lead-status enum value
now leaves the lead unchanged, creates no audit event, and points only to a
confirmation-gated metadata preflight. The reviewed enum helper is dry-run by
default, verifies baseline values before its confirmed mutation path, and still
awaits separate database approval. Focused lead-schema/lead-desk checks, full
`npm run validate`, `npm run build`, and `git diff --check` pass locally. The
approved 2026-07-25 metadata preflight passed with every required enum value
present. No DDL, Telegram, provider, Shopier, deployment, or commit action was
run.

## D-489 Local Verification Boundary

D-489 is local-only and not deployed. Confirmation handling no longer creates
the session table or alters the category enum at request time. The added
metadata smoke is confirmation-gated and read-only; the reviewed table helper
is dry-run by default and still awaits separate database approval. Focused
wizard/runtime governance, full `npm run validate`, `npm run build`, and `git
diff --check` pass locally. The approved 2026-07-25 metadata preflight passed:
the required table, columns, and primary key are present. No DDL, Telegram,
provider, Shopier, deployment, or commit action was run.

## D-488 Local Verification Boundary

D-488 is local-only and not deployed. The historical `scripts/vps-deploy.sh`
now refuses bare or partially confirmed calls before any VPS configuration
write, skill copy, or container restart. It reaches legacy OpenClaw sync steps
only with both `--reactivate-openclaw` and `--confirm-vps-sync`, after separate
read-only VPS verification and operator reactivation. `npm run
test:openclaw-vps-verification`, full `npm run validate`, `npm run build`, and
`git diff --check` are local evidence only and the optional test remains outside
normal `test:safe`; no VPS, Telegram, provider, Shopier, deployment, or commit
action was run.

## D-487 Local Verification Boundary

D-487 is local-only and not deployed. Product/FAQ and Blog Article JSON-LD now
use the shared safe serializer rather than raw `JSON.stringify`, preventing
stored content from closing an inline schema script. `npm run test:structured-data`,
`npm run test:blog-structured-data`, full `npm run validate`, `npm run build`,
and `git diff --check` are local evidence only. No Payload, Blog publication,
provider, Shopier, Telegram, dispatch, deploy, or commit action was run.

## D-486 Local Verification Boundary

D-486 is local-only and not deployed. The public product detail page now
prefers usable generated gallery media but falls back to original media, uses
the resolved gallery in Product JSON-LD, derives offer availability from shared
sellable-stock truth, and safely serializes Product/FAQ schema. `npm run
test:product-storefront-images`, `npm run test:product-structured-data`,
`npm run test:storefront-trust`, full `npm run validate`, `npm run build`, and
`git diff --check` are local evidence only. No Payload, provider, Shopier,
Telegram, dispatch, deploy, or commit action was run.

## D-485 Local Verification Boundary

D-485 is local-only and not deployed. Paid Shopier orders retain the D-482
transaction while product total and matched variant stock use atomic
floor-at-zero PostgreSQL decrements. Concurrent distinct external orders cannot
overwrite depletion and leave a falsely high local count; already-paid orders
and InventoryLog records remain intact at zero local stock. `npm run
test:shopier-webhook-local`, full `npm run validate`, `npm run build`, and
`git diff --check` are local evidence only. No live webhook, Shopier, Telegram,
provider, dispatch, deploy, or commit action was run.

## D-484 Local Verification Boundary

D-484 is local-only and not deployed. Non-Shopier Orders use a conditional
PostgreSQL `stock >= quantity` reservation inside the parent Payload
transaction: product total first, then the selected variant. A losing
final-unit request returns no row, throws, and rolls back before InventoryLog
creation. The helper fails closed without the active transaction. `npm run
test:order-stock-transaction`, full `npm run validate`, `npm run build`, and
`git diff --check` are local evidence only. No database, Shopier, Telegram,
provider, dispatch, deploy, or commit action was run.

## D-483 Local Verification Boundary

D-483 is local-only and not deployed. Non-Shopier Orders now perform stock and
InventoryLog work before the generic new-order alert under the parent Payload
request. Missing product/size, unknown variant, and insufficient-stock cases
throw so the surrounding Payload create transaction can roll back the Order.
`npm run test:order-stock-transaction`, full `npm run validate`, `npm run build`,
and `git diff --check` pass locally. No database access, live order, Shopier,
Telegram, provider, dispatch, or deploy action was run.

## D-482 Local Verification Boundary

D-482 is local-only and not deployed. The inbound Shopier `order.created`
handler now creates the local Order and applies product/variant stock plus
InventoryLog changes under one Payload transaction request. It fails closed if
the transaction cannot begin and returns `500` for a verified processing failure
so Shopier can retry. The generic Orders alert hook skips Shopier; the webhook
alert follows commit. Focused transaction, stock, idempotency, combined local
webhook checks, full `npm run validate`, and `npm run build` pass. No database
metadata read, DDL, live webhook/API, Payload write, provider call, external
dispatch, or deployment was run for D-482. D-481's partial unique index was
subsequently applied and post-apply verified in the configured database.

## D-481 Configured-Database Verification Boundary

D-481 has configured-database schema evidence and no application deployment.
`Orders.shopierOrderId` declares a unique contract; the Shopier webhook handles
the resulting duplicate-key create failure before it can decrement stock or send
an order notification. The approved concurrent partial unique index was applied
with SQL fingerprint `c79810ec7a084bfc`, then the read-only schema check passed
with zero duplicate non-empty IDs and a present index. The PostgreSQL canonical
`btrim((shopier_order_id)::text)` predicate is accepted by the checker, and
`npm run test:shopier-webhook-local` passes locally. Live webhook/API evidence,
Payload business-data writes, and deployment were not run for D-481.

## Latest Local Validation Boundary

The latest completed D-500 local validation/read boundary includes:

- `npm run test:channel-dispatch`
- `npm run test:dispatch-status`
- `npm run test:provider-health`
- `npm run test:meta-provider-credentials`
- `npm run test:brand-safety-plan`
- `npm run test:image-qc-remediation-plan`
- `npm run test:operator-smoke-plan`
- `npm run test:runtime-smokes`
- `npm run typecheck`
- `npm run validate`
- `npm run build`
- `npm run smoke:lead-followup:read -- --confirm-read-only` (operator-approved read only)

No deployment, live provider, n8n, Payload, queue, Telegram, or Shopier action
was performed for this local verification.

The latest completed D-494 local validation/build boundary includes:

- `npm run test:channel-dispatch`
- `npm run test:dispatch-status`
- `npm run test:provider-health`
- `npm run typecheck`
- `npm run validate`
- `npm run build`

No Meta or n8n request occurred during this local validation boundary.

The latest completed D-493 local validation/build boundary includes:

- `npm run test:channel-dispatch`
- `npm run test:provider-health`
- `npm run test:redispatch`
- `npm run test:dispatch-status`
- `npm run validate`
- `npm run build`

No provider or webhook call occurred during this local validation boundary.

The latest completed D-491 local verification boundary includes:

- `npm run test:lead-conversion-schema`
- `npm run db:lead-conversion-schema:apply -- --dry-run --print-sql`
- `npm run validate`
- `npm run build`
- `git diff --check`

The confirmation-gated D-491 metadata preflight and confirmed relationship apply
were deliberately not run.

The latest completed D-490 full local validation/build boundary includes:

- `npm run test:lead-status-schema`
- `npm run test:lead-desk`
- `npm run typecheck`
- `npm run db:lead-status-enum:apply -- --dry-run --print-sql`
- `git diff --check`
- `npm run validate`
- `npm run build`

The confirmation-gated D-490 metadata preflight and confirmed enum apply were
deliberately not run.

The latest completed D-489 full local validation/build boundary includes the
runtime-DDL regression guard, source-pack/ops/release governance, and the
normal safe suite:

- `npm run test:confirmation-wizard`
- `npm run test:runtime-smokes`
- `npm run test:source-pack`
- `npm run test:ops-runbook`
- `npm run test:local-release-candidate`
- `npm run test:local-pr-review`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
- `npm run validate`
- `npm run build`

The confirmation-gated D-489 database preflight and confirmed missing-table
apply were deliberately not run.

The latest completed D-482 full local validation/build boundary includes the
prior D-481 coverage plus the transaction helper, shared-request stock test, and
route governance coverage:

- `npm run test:payload-transaction`
- `npm run test:shopier-order-transaction`
- `npm run test:shopier-webhook-local`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
- `npm run validate`
- `npm run build`

The latest completed D-481 full local validation/build boundary includes the prior D-480 coverage below plus D-481 helper/governance/dry-run coverage:

- `npm run test:shopier-webhook-security`
- `npm run test:shopier-webhook-local`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
- `npm run validate`
- `npm run build`

The latest completed D-479 full local validation/build boundary includes the prior D-478 coverage below plus:

- `npm run test:blog-preflight`
- `npm run test:blog-publishing-guard`
- `npm run test:blog-preflight-command`
- `npm run test:runtime-smokes`
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
- `npm run validate`
- `npm run build`

The latest completed D-478 full local validation/build boundary in this work session includes:

- `npm run test:local-pr-review`
- `npm run test:local-release-candidate`
- `npm run test:loading-plan`
- `npm run test:brand-safety-plan`
- `npm run test:brand-provenance-review`
- `npm run test:brand-provenance-command`
- `npm run test:activation-guard`
- `npm run test:publish-desk`
- `npm run test:product-workflow`
- `npm run test:shopier-publish-control`
- `npm run test:lead-followup-plan`
- `npm run test:lead-desk`
- `npm run test:order-desk`
- `npm run test:business-desk`
- `npm run test:funnel-desk`
- `npm run test:ad-readiness`
- `npm run test:utm-builder`
- `npm run test:utm-command`
- `npm run test:operator-smoke-plan`
- `npm run test:operator-inbox`
- `npm run test:shopier-commands`
- `npm run test:openclaw-vps-verification`
- `npm run test:mentix-skills`
- `npm run test:soak-scripts`
- `npm run test:provider-reality`
- `npm run test:image-regeneration-plan`
- `npm run test:runtime-smokes`
- `npm run smoke:brand-safety:read -- --confirm-read-only`
- `npm run db:blog-featured-image:apply -- --dry-run --print-sql`
- `npm run smoke:blog-schema:read` refusal-path check
- `npm run test:product-flow-snapshot`
- `npm run test:loading-plan`
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
- `npm run test:operator-smoke-plan`
- `npm run test:runtime-smokes`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- `npm run validate`

Result: D-466 adds protected-brand remediation planning: `/brandplan` and its confirmation-gated Payload smoke give operators severity, brand, matched-field, product-flow, and admin/PDP evidence without any automatic product mutation. D-467 closes the manual activation bypass: protected-brand matches now refuse in both Publish Desk and the Payload hook even when override context is supplied, while generic QC/audit review can still follow the existing manual path. D-468 adds a no-database golden path that composes active-channel target normalization, clean original-media readiness, activation defaults, and protected-brand refusal. D-469 pins Turbopack workspace discovery to this repository so the local production build no longer emits the parent-lockfile warning. D-470 makes Product Flow action commands use numeric Payload IDs while retaining the stock-number display reference, closing the legacy ID-only command mismatch. D-471 uses the same protected-brand policy and placeholder-title recognition to keep legacy active records out of public rails, PDPs, metadata, and sitemap URLs without mutating catalog data. A fresh local production-server smoke confirmed homepage cleanup, normal PDP `200`, placeholder PDP `404`, and sitemap exclusion while retaining a safe product URL. D-475 blocks direct Telegram UTM output unless the target has a slug, active status, and the shared public storefront safety pass. D-476 makes the catalog worklist rank active protected-brand exposure before draft protected-brand backlog, independent of secondary blocker count. D-477 adds preview-first `/brandreview`: only explicit confirmation records a provenance BotEvent, and it neither edits the product nor bypasses protected-brand safety. D-478 records an opaque Telegram delivery key and returns the original review on retry instead of creating a second audit event. D-479 adds shared Blog editorial preflight: incomplete/placeholder first publications are blocked, valid first publications gain `publishedAt`, legacy published edits remain compatible, and AI/evidence-sensitive claims remain an operator review item. D-480 verifies the existing documented Shopier HMAC signature against the exact raw body in constant time, fails closed with `503` when unconfigured, and returns `401` for invalid deliveries before any JSON/order/stock/refund/Telegram side effect. D-480 security/lifecycle checks, full `npm run validate`, and `npm run build` pass with lint 0 errors / 0 warnings. The confirmed 2026-07-24 runtime smoke found 13 blockers without writes. The separately approved D-462 migration remains applied to the configured database and its post-apply read-only check/build pass.

This D-397/D-484 manifest keeps `npm run test:local-release-candidate` and `npm run test:local-pr-review` in the safe validation suite so the local handoff and PR review boundaries stay visible. Re-run `npm run validate` after changing this file, package scripts, source-pack latest-boundary governance, root Obsidian control notes, Turbopack workspace-root configuration, Mentix skill runtime boundaries, homepage merchandising selection/wiring guardrails, public storefront placeholder/brand-safety eligibility or verified-metrics display, Product Flow Website visibility, safe public PDP/operator/ad-link policy, direct Telegram UTM eligibility, product-workflow golden-path coverage, loading-plan worklist/link/batch-summary/focus/focus-queue/focus-detail/exposure-priority logic, protected-brand remediation/provenance-audit/delivery-idempotency/manual-activation guardrails, Blog editorial preflight/first-publication guardrails, Shopier raw-body signature/fail-closed webhook, order-ID uniqueness, Shopier transaction handling, or non-Shopier order/stock transaction guardrails, lead follow-up link logic, lead desk link logic, order desk link logic, business snapshot next-action logic, funnel snapshot next-action logic, ad-readiness next-action logic, operator inbox link logic, operator smoke-plan ordering/title behavior, Telegram access preflight ordering, Shopier preview/dashboard review/link/credential-hold logic, Shopier runtime-smoke preview behavior, storefront trust/PDP conversion guardrails, inquiry guard preflight ordering, attribution preflight ordering, sitemap preflight ordering, manual ad readiness/performance preflight ordering, retired-channel and Memory Lock current-control guardrails, Product Flow Snapshot operator command-ID/checklist/summary/dispatch-summary/recovery-path/link behavior, OpenClaw VPS verification guardrails, historical soak-script quarantine rules, provider reality audit rules, image regeneration planning, image-plan runtime smoke behavior, BlogPosts schema drift preflight/repair guardrails, or release/PR readiness docs.

chatgpt-project-sources contains 20 Markdown documents and is at the 20-document source-pack limit; update or merge an existing source file before adding another.

## Explicitly Not Done

Vercel Production deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj` is Ready, and public homepage/PDP smoke checks pass. No live Telegram command, optional OpenClaw sync, live Shopier webhook smoke, provider call, external dispatch, queue write, ad spend, SupplierScout activation, or retired-channel activation has been performed.

The approved PR review merged PR #6 into `main`. Do not run live integration smokes unless the operator asks.

## Next Operator Decision

The D-462 schema decision is complete for the configured database. Its strengthened preflight now confirms `media.id` is integer and the exact `featured_image_id -> media.id ON DELETE SET NULL` relationship is present; it still refuses incompatible IDs or conflicting existing foreign keys. Commit/PR preparation remains a separate decision for the validated local stack.

Before any deploy or live smoke:

1. Review the diff and confirm no secrets or raw chat archives are included.
2. Run `npm run validate`.
3. Use `/smokeplan` only after deploy and only with the operator present.
4. Run live Shopier webhook smoke only after credentials/webhooks are configured and explicitly approved.
