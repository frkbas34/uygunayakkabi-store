# Master Roadmap

Last updated: 2026-07-25

The complete uploadable roadmap is
[chatgpt-project-sources/02_MASTER_ROADMAP.md](chatgpt-project-sources/02_MASTER_ROADMAP.md).
This note is the Obsidian operating summary.

## Phase Status

1. Project control center: active truth is mirrored across agent guidance,
   source pack, and root Obsidian notes (D-468).
2. Repo health: `npm run validate` is the local health signal. D-462's additive BlogPosts relationship migration is applied and its read-only check/build pass; D-469 pins Turbopack workspace discovery to this repository.
3. Product workflow: upload/review/readiness/operator diagnostics are local-ready;
   D-470 keeps product-flow action handoffs valid for stock-number lookups; D-473/D-475
   keep Website dispatch, operator PDP links, ad landing links, and direct Telegram UTM output aligned with public storefront eligibility. D-476 puts active protected-brand exposure first in catalog review; D-477/D-478 give the operator a durable, preview-first and delivery-idempotent provenance audit trail without weakening the gate. Live
   admin and Telegram proof still needs the operator present. D-489 keeps
   confirmation handling schema-free at request time and moves its
   `wizard_sessions` table into the guarded deployment schema path. D-490
   similarly keeps lead-status enum drift out of Telegram and D-491 blocks
   a missing order-to-lead relationship before conversion, both behind
   separately approved deployment schema workflows.
4. Mentix/Hermes: Hermes/Mentix is current; OpenClaw remains optional/history,
   and its legacy VPS sync now requires explicit two-flag reactivation (D-488).
5. Publishing reliability: dispatch state, guarded redispatch, Shopier queue
   controls, and provider diagnostics exist. D-493 aligns X direct dispatch
   with provider health: all four OAuth values are required for direct X, while
   partial configuration falls back only to an explicit optional n8n webhook.
   D-494 aligns Meta selection with its adapters by scanning the whole gallery
   for public HTTPS media.
   D-495 makes no-public-media an explicit dispatch failure before either
   direct Meta or optional n8n fallback can receive unusable media.
   Real provider evidence is pending.
6. AI images and GEO: QC and read-only planning exist. D-479 adds Blog editorial
   readiness and AI/claim-review diagnostics before first publication; provider
   quota/permission checks still need explicit live verification.
7. Storefront conversion: D-471 keeps placeholder-title and protected-brand legacy
   records off public rails, PDPs, metadata, and sitemap URLs without data mutation;
   D-472 hides unverified numeric trust metrics by default, D-474/D-475 keep operator links and UTM commands from routing to hidden or unsellable records, D-476 puts active protected-brand exposure first in catalog review, D-486 keeps original-only PDPs, product schema images, and stock availability truthful, and D-487 safely serializes both PDP and Blog Article schema.
8. Orders, leads, stock, analytics: local lifecycle and funnel diagnostics exist;
   D-480 fails closed on unsigned Shopier webhooks, D-481's approved partial
   unique Shopier order-ID index is applied and post-apply verified, D-482 makes local
   Shopier order creation plus stock/inventory writes atomic, D-483 makes
   non-Shopier order stock fail closed under the parent Payload transaction, and
   D-484 makes the non-Shopier reservation conditional at PostgreSQL level so
   concurrent final-unit requests cannot both succeed. D-485 makes paid Shopier
   decrements floor-at-zero and atomic, so concurrent distinct external orders
   cannot leave falsely high local stock. Live Shopier
   verification remains pending.
9. Ads and growth: manual, operator-approved support only; no autonomous spend.
10. Deployment and ops: local runbooks and review package exist; commit, deploy,
    and live smoke actions require approval.
11. Catalog scale-up: D-466/D-467/D-476/D-477/D-478 keep protected-brand remediation
    manual, hard-gated, exposure-first, and auditable; stored wording changes
    remain a separate operator decision after evidence review.

## Next Safe Work

1. Use `/brandplan`, then preview-first `/brandreview`, to record protected-brand provenance decisions. Never use it for automatic text cleanup or manual-override activation; keep `npm run test:product-workflow` green before release review.
2. Follow `/smokeplan` with the operator after deployment and before any queue, publish, provider,
   Shopier, or advertising action.
3. Use `/blogpreflight` before first publishing a BlogPost, then keep catalog
   quality and controlled publication ahead of paid traffic.
4. Treat D-481's configured-database index as complete: its post-apply
   read-only check passes with zero duplicate non-empty IDs. Before any live
   Shopier webhook smoke, verify credentials and obtain separate operator approval.
5. Use `npm run test:shopier-webhook-local` to prove D-482's local transaction,
   stock, refund, and authenticity boundaries before any operator-approved
   Shopier webhook action.
6. Use `npm run test:order-stock-transaction` before releasing non-Shopier
   website, phone, or operator order workflows; it has no database or external call.

## D-492 Local Correction

The storefront announcement bar is now inside the fixed Navbar, eliminating
wordmark overlap. `Camper` is also covered by the existing shared protected-
brand hard gate across activation and public storefront eligibility. The change
is local-only and verified by `test:brand-safety`, `test:merchandising`,
`test:storefront-trust`, `npm run validate`, and `npm run build`.

## D-493 X Provider Readiness Alignment

Direct X publishing now requires the complete OAuth 1.0a credential set. A
partial configuration uses `N8N_CHANNEL_X_WEBHOOK` only when it exists;
otherwise the result reports missing configuration rather than attempting X.
Focused dispatch/provider-health/redispatch/dispatch-state tests, full
`npm run validate`, and `npm run build` pass locally; provider proof remains
pending.

## D-494 Meta Gallery Media Selection

Instagram and Facebook direct dispatch now use a valid later public HTTPS
gallery image when the first image is not usable. Mocked adapter tests cover
the routing decision; full `npm run validate` and `npm run build` pass locally.
Live Meta media reachability and posts remain pending.

## D-495 Meta Public-Media Dispatch Preflight

Instagram/Facebook now report a media-specific failure and make no provider or
n8n call when no public HTTPS gallery image exists. Mocked checks cover this
preflight, and full `npm run validate` plus `npm run build` pass locally; live
provider proof remains pending.

## D-496 Lead-Followup Runtime Smoke Completeness

The lead-followup runtime smoke now registers BlogPosts with Products, matching
the Product `linkedBlogPost` relationship and preventing a temporary read-only
Payload configuration failure. `test:runtime-smokes`, typecheck, and the
approved `smoke:lead-followup:read` pass. The configured-state read found six
open stale leads and returned PII-light manual actions only; it performed no
writes, messages, queues, provider/Shopier calls, schema pushes, or ad action.

## D-497 Brand Remediation External-Exposure Visibility

Phase 10 catalog-safety diagnostics now expose recorded external dispatch
states in `/brandplan` and `smoke:brand-safety:read`. The plan reports only
Facebook, Instagram, X, and Shopier notes as `published`, `queued`, or
`failed`; Website is excluded because it is native. This is a read-only
historical record, not confirmation of a live remote listing and never a
cleanup, retry, publish, provider, Shopier, or product-write action. The
approved 2026-07-25 runtime read found 13 protected-brand records and showed
`SN0111` as Facebook published, Shopier queued, and X failed. Focused plan and
runtime-smoke governance checks pass locally.

## D-498 Brand Remediation Provenance-State Workflow

Phase 10 now turns the protected-brand queue into a read-only decision workflow.
`/brandplan` and `smoke:brand-safety:read` report each item's provenance state
and one safe next step: manual external-state verification, preview a
provenance decision, collect evidence, manually correct proven-unbranded copy,
or keep it excluded. The approved 2026-07-25 sample has 13 unreviewed blockers;
9 include stored Facebook/Instagram/X/Shopier history. No action is executed:
the output cannot change products, record a decision, clean remote listings,
dispatch, publish, call providers or Shopier, or spend on ads.

## D-499 Batch Image QC Remediation Queue

Phase 5/10 now has batch Image QC triage through `/imageqcplan` and
`smoke:image-qc-plan:read`. It separates brand-review-first products from
missing-original-media, failed QC, review, and missing-decision cases, and
gives only read-only `/imageplan` and Product Flow handoffs. The approved
2026-07-25 sample contains 55 queue items: 13 brand-first, 28 QC failures, and
14 needing a decision. It cannot record QC, start generation, publish,
dispatch, call providers/Shopier, change a product, or spend.

The D-499 per-product diagnostic alignment applies the same precedence to
`/productflow` and `/imageplan`: a protected-brand record first offers only
the preview-first `/brandreview <id-or-sn> needs-evidence` path and withholds
Image QC, regeneration, activation, Shopier, redispatch, and ad suggestions.
They also consume the latest recorded provenance review, so completed evidence,
copy-fix, or keep-excluded decisions advance the manual diagnostic without
lifting the brand-safety gate.

## D-500 Meta Provider Configuration Unification

Phase 4 provider diagnostics and direct Facebook dispatch now resolve the
same Page ID source: deployment env `INSTAGRAM_PAGE_ID`. Payload no longer
stores `facebookPageId`, so operators must not attempt to add it in
AutomationSettings. The environment template now removes retired Dolap/Threads
fallback webhooks and lists the four active X OAuth 1.0a keys. This is local
configuration alignment only; production credential, permission, quota, and
live-post evidence remain operator work.
