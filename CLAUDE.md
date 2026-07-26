# CLAUDE.md

Current guidance for Claude Code. Last updated: 2026-07-24.

## Read This First

This project has a lot of old planning history. Treat this file, `AGENTS.md`, and `chatgpt-project-sources/` as the current truth.

Do not restart the architecture from old chat exports.

## What We Are Building

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for our own products only.

Payload is the source of truth. The app owns product data, storefront behavior, publishing state, jobs, orders, leads, and stock.

Hermes is the current agent-control layer for UygunAyakkabı/Mentix operations (installed on the operator's main PC and already in the Telegram group). Mentix/Uygunops is the Telegram-facing commerce operator identity/interface. Payload/Next remains the source of truth and execution layer. OpenClaw is historical/optional unless explicitly reactivated. The agent-control layer should reason, diagnose, draft, and help the operator; it must not become the database or an independent publishing source.

## Active And Inactive Channels

Active:

- Website
- Instagram
- Facebook
- X
- Shopier

Inactive:

- Dolap is retired.
- Threads is retired.
- SupplierScout is dormant.

Do not add Dolap/Threads UI, parser targets, n8n stubs, prompts, or task items.

The protected-brand catalog backlog is deferred by the operator as of 2026-07-26.
Do not automatically rewrite, unpublish, archive, redispatch, or remove those
records. Existing brand-safety, storefront, activation, and dispatch guards stay
enforced until the operator explicitly reopens the review.

## n8n Position

n8n is optional glue. Keep it frozen unless the user explicitly asks for n8n work or a current workflow clearly depends on it.

## Current Build Focus

Catalog scale-up is the active focus. D-355 structured Image QC is implemented and the latest read-only schema smoke passes. D-356 Shopier/Web batch publish control is in progress: `/shopier dashboard` is read-only operator visibility, `/shopier publish-ready` is preview-first, `/shopier publish-ready confirm` queues only products that pass the shared Shopier/Web gate, single `/shopier publish|republish` commands use the same guard, `/shopier errors` gives first-pass sync error triage, `/shopier retry-errors` previews safe retry candidates before `/shopier retry-errors confirm` queues them, and Payload admin ReviewPanel shows a read-only Shopier Queue Gate for the current product using the same evaluator. Phase 2/3 operator diagnostics now include read-only `/productflow <sn-or-id>` and `/flow <sn-or-id>`, backed by `src/lib/productFlowSnapshot.ts`, to summarize lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state, coherence issues, and next actions without writing or publishing. Phase 7 business/funnel diagnostics are now covered by `test:business-desk`, `test:funnel-desk`, and read-only `smoke:business-funnel:read`, mirroring Telegram `/business` and `/funnel`. Phase 7 operator order lifecycle is now covered by `test:order-desk`: ship/deliver stamp timeline fields, Shopier `order.fulfilled` uses the same helper with source `shopier_webhook`, delivered orders cannot be cancelled through Telegram, idempotent actions do not write, and manual cancellation points to `/restock` instead of auto-restoring stock. Phase 7 Shopier order/refund stock reconciliation is now covered by `src/lib/shopierOrderStock.ts` and `test:shopier-order-stock`; D-391/D-392 add `src/lib/shopierRefundLifecycle.ts` and `test:shopier-refund-lifecycle` so Shopier refund webhooks are idempotent: `refund.requested` records a request marker before stock restore so duplicate deliveries cannot restore stock twice, and `refund.updated` records note/audit traceability without changing status or stock. Live webhook smoke still waits for configured Shopier credentials/webhooks and operator approval. Latest read-only smokes on 2026-07-02: D-355 schema PASS, product-flow smoke for product `359` completed, channel provider-health smoke completed with Website ready, Instagram disabled, Facebook/X/Shopier missing provider requirements, PI provider-health smoke completed with Gemini ready but no reverse-search provider configured locally, Shopier read-only smoke completed with no publish/error/retry candidates but `SHOPIER_PAT` not configured, ad-readiness smoke for product `359` completed but blocked manual ads until generated-image QC PASS is recorded, and business/funnel smoke completed with 6 open leads, 5 stale leads, 1 sold-out product, and a 7-day website funnel count of 2 leads.

D-381 story dispatch brand-safety hardening is local-only. `src/lib/storyDispatch.ts` now blocks protected-brand products before StoryJob creation and records a failed story status with a brand-safety reason instead of queueing a future social/story job. Covered by `test:story-dispatch`.

D-380 manual ad launch-pack support is local-only and operator-controlled. `/adpack <sn-or-id> [campaign]` prepares copy drafts plus Meta paid-social UTM links only after hard blockers are clear. It must not create campaigns, posts, pixels, provider calls, Shopier calls, or ad spend.

D-383 manual ad performance reporting is local-only and read-only. `/adreport [today|week|month]` summarizes UTM-tagged leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders from Payload only. It must not create campaigns, posts, pixels, provider calls, Shopier calls, external API calls, or ad spend.

D-385 runtime-smoke governance is local-only and validated. `test:runtime-smokes` keeps read-only smoke package scripts, docs, and script guardrails aligned, while ensuring `test:safe` does not run runtime smoke commands that may connect to production data.

D-386 Shopier command governance is local-only and validated. Single-product Telegram `/shopier publish` and `/shopier republish` must resolve products and call the shared `queueShopierSync()` gate. They must not directly update `sourceMeta.shopierSyncStatus` or enqueue `shopier-sync` jobs inside the Telegram route. The unused `channelDispatch` direct-publish helper is retired, so the guarded Payload job path is the only supported Shopier publishing route.

D-387 product loading plan is local-only. `/loadplan [limit]` and `/loadingplan [limit]` combine Catalog QA and Category Fill into a read-only daily loading/fix plan for catalog scale-up. It must not write products, publish, queue Shopier jobs, call providers, activate SupplierScout, revive Dolap/Threads, or spend on ads. Covered by `test:loading-plan`.

D-388 load-plan runtime smoke is local-only. `smoke:load-plan:read` mirrors `/loadplan` against real Payload products only after `--confirm-read-only`; it must not write products, publish, queue jobs, call providers, call Shopier, activate SupplierScout, revive retired channels, spend on ads, or push schema changes. Covered by `test:runtime-smokes`.

D-389 operator live smoke plan is local-only and validated. `/smokeplan` returns the safe operator sequence for read-only repo smokes and Telegram reads before any queueing, publishing, redispatch, provider spend, Shopier action, or ad work. It is backed by `src/lib/operatorSmokePlan.ts` and covered by `test:operator-smoke-plan`.

D-390 Mentix/Hermes live-smoke alignment is local-only. Repo-side `product-flow-debugger`, `mentix-intake`, optional OpenClaw sync notes, installation matrix, and skill dashboard now teach that live-smoke planning starts with `/smokeplan`, while Hermes is the current agent-control layer and OpenClaw is historical/optional unless explicitly reactivated. n8n stays optional glue. Covered by `test:mentix-skills`.

D-391/D-392 Shopier refund lifecycle hardening is local-only. `refund.requested` now records an idempotent request marker before stock restore, preventing duplicate webhook delivery from restoring stock twice; `refund.updated` remains note/audit only and emits `order.refund_updated` when possible without changing order status or stock. Covered by `test:shopier-refund-lifecycle`.

D-393 operator smoke-plan Shopier webhook preflight is local-only. `/smokeplan` now includes `npm run test:shopier-webhook-local` before `smoke:shopier:read`, so local stock/refund webhook assertions run before any read-only Shopier runtime smoke or operator-approved live webhook smoke. Covered by `test:operator-smoke-plan` and `test:ops-runbook`.

D-394 lead follow-up plan is local-only and read-only. `/leadplan` and `/followupplan` prioritize open leads by age/status/source and suggest existing manual lead commands without writing lead status, messaging customers, starting ads, calling providers, calling Shopier, activating SupplierScout, or reviving retired channels. Covered by `test:lead-followup-plan`.

D-395 lead-followup runtime smoke is local-only. `smoke:lead-followup:read` mirrors `/leadplan` and `/followupplan` against real Payload leads only after `--confirm-read-only`; it prints a PII-light summary and must not write leads, message customers, queue jobs, call providers, call Shopier, activate SupplierScout, revive retired channels, spend on ads, or push schema changes. Covered by `test:runtime-smokes`.

D-396 operator smoke-plan lead follow-up alignment is local-only. `/smokeplan` now runs `smoke:lead-followup:read` after business/funnel visibility and before Telegram `/leadplan`, then continues to Shopier preflights. Covered by `test:operator-smoke-plan`.

D-397 local release candidate boundary is local-only. `project-control/LOCAL_RELEASE_CANDIDATE.md` now records the D-380-D-406 plus D-422-D-491 not-committed/not-deployed handoff boundary, current architecture invariants, latest validation boundary, 20-file source-pack count, and operator approval requirements before commit, PR, deploy, live smoke, Shopier/provider action, optional OpenClaw sync, or ad work. Covered by `test:local-release-candidate`.

D-398 local PR review package is local-only. `project-control/LOCAL_PR_REVIEW_PACKAGE.md` now prepares the D-380-D-406 plus D-422-D-491 stack for human review with proposed PR title, scope summary, reviewer focus, validation commands, and explicit not-run/not-done guardrails. It does not stage, commit, branch, push, open a PR, deploy, run live Telegram, call Shopier/providers, sync optional OpenClaw, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:local-pr-review`.

D-399 loading-plan first product worklist is local-only and read-only. `/loadplan` and `smoke:load-plan:read` now include a prioritized first product worklist that names the product ref, title, priority, reasons, and suggested manual command for the next catalog fixes. It must not write products, publish, queue Shopier jobs, call providers, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan`.

D-400 Shopier dashboard batch review sample is local-only and read-only. `/shopier dashboard` now includes a batch review sample using the shared Shopier/Web evaluator, showing ready/blocked/queued/synced rows with product ref, blocker/detail, and suggested manual command. It must not publish, queue Shopier jobs, call Shopier, call providers, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:shopier-publish-control`.

D-401 optional OpenClaw VPS verification guardrail is local-only. `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` is retained as the read-only checklist only if OpenClaw is explicitly reactivated; `mentix-skills/INSTALLATION_MATRIX.md` marks any OpenClaw VPS state as `VERIFY ON VPS` unless current evidence exists. Repo skill files are expected state, not proof of deployed VPS state. It must not run VPS commands, sync files, restart OpenClaw, run live Telegram/OpenClaw prompts, call providers, call Shopier, queue jobs, activate SupplierScout, revive retired channels, or spend on ads. Covered by standalone `test:openclaw-vps-verification`; it is optional/historical, not part of the normal `test:safe` chain while Hermes is current.

D-402 historical soak-script quarantine is local-only. `project-control/HISTORICAL_SOAK_SCRIPTS.md` documents `scripts/d*-soak*.ts` as historical live-data soak harnesses, not normal validation and not read-only runtime smokes. They must not be added to package scripts, `validate`, or operator-safe smoke flows unless rewritten and explicitly approved. Covered by `test:soak-scripts`.

D-403 provider reality audit is local-only. `project-control/PROVIDER_REALITY_AUDIT.md` records that local env readiness is not production provider readiness for Website, Instagram, Facebook, X, Shopier, Gemini, Google Vision, DataForSEO, SerpAPI, reverse search, and n8n fallback webhooks. It must not print secrets, call providers, spend credits, queue jobs, publish, run live Telegram, activate SupplierScout, or revive retired channels. Covered by `test:provider-reality`.

D-404 image regeneration plan is local-only and read-only. `/imageplan <sn-or-id>` and `/regenplan <sn-or-id>` inspect product Image QC plus recent `image-generation-jobs` state and suggest safe next manual commands for PASS/REVIEW/FAIL, preview approval, rejection, and regeneration. It must not write products, queue image generation, call Gemini/providers, publish, call Shopier, dispatch channels, activate SupplierScout, revive retired channels, or spend on ads. `/smokeplan` includes `/imageplan <id-or-sn>` as a Telegram read step after `/productflow`. Covered by `test:image-regeneration-plan` and `test:operator-smoke-plan`.

D-405 image-plan runtime smoke is local-only and read-only. `smoke:image-plan:read` mirrors Telegram `/imageplan` against one real Payload product and recent `image-generation-jobs` only after `--confirm-read-only`; it must not write products, queue image generation, call providers, publish, dispatch, call Shopier, activate SupplierScout, revive retired channels, spend on ads, or push schema changes. `/smokeplan` now runs this repo smoke before the Telegram `/imageplan` read. Covered by `test:runtime-smokes` and `test:operator-smoke-plan`.

D-406 Shopier runtime-smoke batch review alignment is local-only and read-only. `smoke:shopier:read` now passes the same `buildShopierDashboardReviewRows()` output to the dashboard formatter that Telegram `/shopier dashboard` uses, so the repo-side smoke mirrors the ready/blocked/queued/synced batch review sample before live Telegram use. It must not write products, queue Shopier jobs, call Shopier, dispatch channels, call providers, activate SupplierScout, revive retired channels, spend on ads, or push schema changes. Covered by `test:runtime-smokes`.

D-422 product-flow operator checklist is local-only and read-only. `/productflow <sn-or-id>`, `/flow <sn-or-id>`, and `smoke:product-flow:read` now include an operator checklist for Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:product-flow-snapshot`.

D-423 product-flow checklist dependency ordering is local-only and read-only. The same operator checklist now waits for confirmation before suggesting content generation, and waits for content trigger/retry before suggesting audit, so `/productflow`, `/flow`, and `smoke:product-flow:read` do not present impossible next commands on early drafts or failed-content products. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:product-flow-snapshot`.

D-424 product-flow primary operator step is local-only and read-only. Product Flow Snapshot now derives one primary operator step from the ordered checklist, so `/productflow`, `/flow`, and `smoke:product-flow:read` can show the single next command or manual step before the full checklist. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:product-flow-snapshot`.

D-425 load-plan product-flow handoff is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` first product worklist rows now include `flowCommand` / `/productflow <ref>` alongside the suggested action command, so catalog loading flows through the D-424 primary operator step before manual follow-up. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan`.

D-426 operator smoke-plan load-plan handoff alignment is local-only and read-only. `/smokeplan` now puts the worklist-selected `smoke:product-flow:read` and Telegram `/productflow` checks immediately after repo/Telegram `/loadplan`, and before provider diagnostics, so the D-425 flow handoff is the first live-smoke product preflight. It must not write products, queue jobs, publish, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan`.

D-427 load-plan runtime product-flow handoff is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` first product worklist rows now include `runtimeFlowCommand` with the exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight beside the Telegram `flowCommand`, so terminal and Telegram operators use the same selected product. It must not write products, queue jobs, publish, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan` and `test:runtime-smokes`.

D-428 Shopier dashboard product-flow handoff is local-only and read-only. `/shopier dashboard` and `smoke:shopier:read` batch review rows now include `flowCommand` with `/productflow <ref>` and `runtimeFlowCommand` with the exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` preflight beside the existing next action, so Shopier queue decisions get product-flow diagnostics first. It must not write products, queue jobs, publish, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:shopier-publish-control` and `test:runtime-smokes`.

D-429 Shopier preview product-flow handoff is local-only and read-only. `/shopier publish-ready` and `/shopier retry-errors` preview output now includes `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs for ready/safe and blocked sample rows, while confirmed queue/retry commands remain blocked when `SHOPIER_PAT` is missing. It must not write products, queue jobs outside explicit confirm, publish, redispatch, call providers, call Shopier directly, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:shopier-publish-control` and `test:shopier-commands`.

D-430 operator smoke-plan Shopier handoff alignment is local-only and read-only. `/smokeplan` now includes a dedicated operator hold after Shopier dashboard/publish-ready/error/retry previews that tells operators to run the row-provided `/productflow <ref>` and exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action. It must not write products, queue jobs, publish, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan`.

D-431 operator smoke-plan Shopier credential hold is local-only and read-only. `/smokeplan` now includes a dedicated operator hold after Shopier row product-flow handoffs and before final queue approval, telling operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action. It must not read secrets, write products, queue jobs, publish, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan`.

D-432 operator smoke-plan manual ad preflight alignment is local-only and read-only. `/smokeplan` now runs `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` after lead visibility and before Shopier queue preflights, so manual paid-traffic decisions get Payload evidence without launching ads. It must not write products, mutate leads/orders, queue jobs, publish, redispatch, call providers, call Shopier, call ad-platform APIs, create campaigns/posts/pixels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan`.

D-433 operator smoke-plan storefront trust preflight is local-only and read-only. `/smokeplan` now runs `npm run test:storefront-trust` after lead visibility and before manual ad-readiness checks, so the storefront fake-review/placeholder-testimonial guard runs before any paid-traffic readiness decision. It must not write products, mutate leads/orders, queue jobs, publish, redispatch, call providers, call Shopier, call ad-platform APIs, create campaigns/posts/pixels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan` and `test:storefront-trust`.

D-434 operator smoke-plan inquiry guard preflight is local-only and read-only. `/smokeplan` now runs `npm run test:inquiry-guard` after storefront trust and before manual ad-readiness checks, so honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior are verified before any paid-traffic readiness decision. It must not write products, mutate leads/orders, queue jobs, publish, redispatch, call providers, call Shopier, call ad-platform APIs, create campaigns/posts/pixels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan` and `test:inquiry-guard`.

D-435 operator smoke-plan attribution preflight is local-only and read-only. `/smokeplan` now runs `npm run test:attribution` after inquiry guard and before manual ad-readiness checks, so first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge behavior are verified before any paid-traffic readiness decision. It must not write products, mutate leads/orders, queue jobs, publish, redispatch, call providers, call Shopier, call ad-platform APIs, create campaigns/posts/pixels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan` and `test:attribution`.

D-436 operator smoke-plan sitemap preflight is local-only and read-only. `/smokeplan` now runs `npm run test:sitemap-entries` after attribution and before manual ad-readiness checks, so static routes plus website-visible product and blog sitemap entries are checked before any paid-traffic readiness decision. It must not write products, mutate leads/orders, queue jobs, publish, redispatch, call providers, call Shopier, call ad-platform APIs, create campaigns/posts/pixels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan` and `test:sitemap-entries`.

D-437 operator smoke-plan Telegram access preflight is local-only and read-only. `/smokeplan` now runs `npm run test:telegram-access` after the repo load-plan runtime smoke and before the first Telegram `/loadplan` read, so private Telegram DM allowlist behavior is checked before any live Telegram operator read. It must not write products, mutate leads/orders, queue jobs, publish, redispatch, call providers, call Shopier, call ad-platform APIs, create campaigns/posts/pixels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan` and `test:telegram-access`.

D-438 Product Flow Snapshot operator links is local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now include deterministic operator links: Payload admin when the product has an id, and public PDP only when the product has a slug plus a public status. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:product-flow-snapshot`.

D-439 loading-plan worklist operator links is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` first product worklist rows now include the same deterministic operator-link discipline: Payload admin when the product has an id, and public PDP only when the product has a slug plus a public status. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan`.

D-440 Shopier preview/dashboard operator links is local-only and read-only. `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows now include deterministic operator links: Payload admin when the product has an id, and public PDP only when the product has a slug plus a public status. Confirmed queue/retry output stays free of preview-only links. It must not write products except through existing explicit confirmed queue commands, call Shopier directly, call providers, publish, dispatch channels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:shopier-publish-control`.

D-441 Shopier preview credential holds is local-only and read-only. `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview rows now show whether `SHOPIER_PAT` is configured before displaying confirm commands. Missing credentials keep preview available but tell the operator to configure `SHOPIER_PAT`; configured credentials still tell the operator to verify webhook/account/quota outside chat before confirm. Confirmed queue/retry output stays free of preview-only credential hints and still uses the existing credential gate. It must not read or print secrets, call Shopier directly, call providers, publish, dispatch channels, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:shopier-publish-control`.

D-442 lead follow-up operator links is local-only and read-only. `/leadplan`, `/followupplan`, and `smoke:lead-followup:read` now include direct Payload lead-admin links plus related product-admin links when a lead has a product, and public PDP links only when the related product has a slug plus public status. It must not write lead status, message customers, queue jobs, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:lead-followup-plan`.

D-443 operator inbox product links is local-only and read-only. `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` product rows now include Payload admin links, plus public PDP links only when the product has a slug plus public status. It must not write products, activate products, queue jobs, publish, dispatch channels, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:operator-inbox`.

D-444 lead desk operator links is local-only and read-only. `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts now share `leadDesk` operator links: Payload lead-admin links, related product-admin links when present, and public PDP links only for public related products. It must not write lead status, message customers, queue jobs, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:lead-desk` and reused by `test:lead-followup-plan`.

D-445 order desk operator links is local-only and read-only. `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts now share `orderDesk` operator links: Payload order-admin links, related product-admin and lead-admin links when present, and public PDP links only for public related products. It must not change order status, restore stock, queue jobs, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:order-desk`.

D-446 business snapshot next-action hints is local-only and read-only. `/business` now adds a `Next safe reads` block when Payload urgency counts imply follow-up: `/leadplan` for open/stale leads, `/orderreminders` or `/orders` for order follow-up, and `/inbox stock` for sold-out/low-stock products. It must not write leads/orders/products, queue jobs, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:business-desk`.

D-447 funnel snapshot next-action hints is local-only and read-only. `/funnel` now adds a `Next safe reads` block when lead-source, order, or attribution evidence implies safe follow-up: `/leadplan` for open funnel leads, `/orders` for converted/direct order review, and `/adreport week` for UTM-attributed campaign review. It must not write leads/orders/products, queue jobs, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:funnel-desk`.

D-448 ad-readiness next-action hints is local-only and read-only. `/adready` now adds a `Next safe reads` block: blocked products point to `/productflow` and `/imageplan` when relevant, while review/ready products point to read-only `/adpack <ref> manual_ads` and `/adreport week`. It must not write products/leads/orders, queue jobs, call providers, call Shopier, create campaigns/posts/pixels, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:ad-readiness`.

D-449 operator smoke-plan latest-boundary label is local-only and read-only. `/smokeplan` now renders `Operator Live Smoke Plan (D-389/D-449)` so the operator-facing plan reflects the current D-448 ad-readiness next-read guidance and the latest local handoff boundary. It must not change smoke order, write products/leads/orders, queue jobs, call providers, call Shopier, launch ads, activate SupplierScout, or revive retired channels. Covered by `test:operator-smoke-plan`.

D-450 retired-channel memory-lock guardrail is local-only. `test:retired-channels` now checks `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md` so the session-start handoff files keep active channels as Website/Instagram/Facebook/X/Shopier and describe Dolap/Threads only as retired, never scaffolded/planned/active. Covered by `test:retired-channels`.

D-451 PDP conversion trust guardrail is local-only. `test:storefront-trust` now also checks the public product detail page for buyer-critical conversion essentials: draft products return `notFound()`, `ProductImages` remains mounted, variant-backed size/stock clarity uses `SizeChip` and `OOSChip`, `ContactForm` receives product/sold-out context, WhatsApp and Shopier CTAs remain present and safely gated, process FAQ fallback remains, and similar products stay active-status plus merchandising gated. It performs no build, DB read, network call, product write, lead write, Shopier call, provider call, ad-platform call, SupplierScout activation, retired-channel activation, or ad spend.

D-452 ad-readiness storefront trust hint is local-only and read-only. `/adready` now adds `npm run test:storefront-trust` to review/ready products before `/adpack` and `/adreport`, so manual paid-traffic prep points operators back to the storefront/PDP conversion guardrail. Blocked products still point to blocker/image diagnostics first. `/smokeplan` now renders `Operator Live Smoke Plan (D-389/D-452)`. It performs no product/lead/order write, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend. Covered by `test:ad-readiness` and `test:operator-smoke-plan`.

D-453 source-pack latest-boundary guardrail is local-only. `test:source-pack` now checks that source-pack next-sprint notes carry D-453 as the latest local boundary, retain the D-452 smoke-plan title boundary, describe the D-380-D-406 plus D-422-D-453 release/PR stack, and reject stale current-D-449 or D-422-D-451 stack wording. It performs no runtime behavior change, product/lead/order write, job queue, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend. Covered by `test:source-pack`.

D-454 loading-plan batch summary is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now include a batch summary derived from the first product worklist: candidate count, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first repo-side product-flow smoke command. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan`.

D-455 loading-plan batch focus is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add a deterministic focus label, reason, and next safe read derived from the same first product worklist, so operators can see whether today's catalog bottleneck is brand safety, Image QC, Shopier errors, core fields, stale drafts, backlog, or live smoke. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan` and `test:runtime-smokes`.

D-456 loading-plan focus queue is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add focus refs and a short focus queue of matching safe read commands for the D-455 bottleneck, so operators can act on the top affected products without guessing which rows match the focus. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan` and `test:runtime-smokes`.

D-457 loading-plan focus details is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add reason details beside each focus-queue command, so operators can see why each top product appears in the D-456 queue without cross-referencing the full worklist. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan` and `test:runtime-smokes`.

D-458 product-flow checklist summary is local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now include a compact checklist summary with done/next/blocked/needs-work counts before the full staged checklist, so operators can judge product-flow progress faster. It must not write products, queue jobs, publish, dispatch channels, call providers, call Shopier, activate SupplierScout, revive retired channels, sync optional OpenClaw, or spend on ads. Covered by `test:product-flow-snapshot` and `test:runtime-smokes`.

D-459 product-flow dispatch summary is local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now include compact active-channel dispatch counts for published/queued/failed/blocked/not-configured/unrecorded states before the full dispatch rows, so operators can judge publishing health faster. It must not write products, queue jobs, publish, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, sync optional OpenClaw, or spend on ads. Covered by `test:product-flow-snapshot` and `test:runtime-smokes`.

D-460 product-flow dispatch recovery paths are local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now show the deterministic next operator action on each non-published active-channel dispatch row, keeping its state, reason, and recovery path together. Shopier queued rows point to `/shopier dashboard`; ready-but-unrecorded Shopier rows use the shared `/shopier publish <ref>` path; failures only suggest redispatch after the recorded cause is fixed. The snapshot itself performs no write, queue, publish, redispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, optional OpenClaw sync, or ad spend. Covered by `test:product-flow-snapshot` and `test:runtime-smokes`.

D-461 control-truth Memory Lock reconciliation is local-only. `project-control/MEMORY_LOCK.md` and its export now state the current architecture: Payload/Next executes commerce workflows, Hermes is the current agent-control layer, OpenClaw is historical/optional, n8n is optional glue with direct Payload/Next as default, and SupplierScout is dormant. `test:retired-channels` rejects the stale live Telegram-to-OpenClaw-to-n8n-to-Payload claim and current-agent/current-workflow wording. Covered with `test:n8n-optional` and `test:mentix-skills`. No live service, VPS, webhook, n8n workflow, OpenClaw sync, SupplierScout, retired channel, or ad action is performed.

D-462 BlogPosts featured-image schema drift repair was operator-approved and applied to the configured database on 2026-07-24. The additive migration created `blog_posts.featured_image_id`, its exact `featured_image_id -> public.media.id ON DELETE SET NULL` foreign key, and the supporting index; the post-apply read-only preflight passes with `npm run smoke:blog-schema:read -- --confirm-read-only`, and `npm run build` now completes without the prior blog-sitemap schema fallback. The local checker and apply guard still require integer IDs and reject incompatible types or conflicting foreign keys rather than coercing or replacing them. `npm run db:blog-featured-image:apply` remains dry-run by default; any apply in another environment still requires `--apply --confirm-apply-d462-blog-featured-image-schema` and explicit operator approval. It does not alter active channels, publishing, Mentix/Hermes, n8n, OpenClaw, SupplierScout, or retired-channel policy.

D-463 Mentix skill runtime-truth reconciliation is local-only. Repo-side `mentix-skills` files, the optional OpenClaw activation template, and the skill dashboard now state that Hermes/Mentix is the current operator-control layer; OpenClaw skill files are historical templates unless explicitly reactivated and verified on the VPS. Skills remain advisory, draft, and read-only support: Payload/Next remains the commerce source of truth and execution layer; durable, PII-light decisions belong in `project-control/` and the relevant `chatgpt-project-sources/` document. `test:mentix-skills` protects the shared boundary. It does not sync, restart, or invoke OpenClaw; run a VPS verification checklist only after explicit reactivation approval.

D-464 homepage merchandising rail wiring is local-only. Homepage section membership resolved by `resolveHomepageSections()` now reaches the rendered Editor Picks, Best Sellers, Deals, and Discounts rails instead of falling back to arbitrary catalog order. `test:merchandising` covers eligibility, curated sections, ordering, and toggles; `test:homepage-merchandising` protects the server-to-client wiring; both run in `test:safe`. It does not read or write Payload, publish, dispatch, call providers or Shopier, activate SupplierScout, revive retired channels, or spend on ads.

D-465 Obsidian control-center alignment is local-only. The root Obsidian notes `00_HOME.md` through `04_ACTIVE_DECISIONS.md` now reflect Payload/Next execution, Hermes/Mentix current control, optional OpenClaw/n8n, own-products-only scope, active channels, retired/dormant systems, current roadmap, and approval gates. `test:obsidian-control` keeps those human-facing notes synchronized; `test:story-dispatch` is restored to `test:safe` so story brand-safety coverage cannot fall out of the baseline validation chain. No Payload, provider, Shopier, n8n, OpenClaw, deployment, or ad action is performed.

D-466 protected-brand remediation planning is local-only and read-only. `/brandplan [limit]` and `npm run smoke:brand-safety:read -- --confirm-read-only` group protected-brand blockers by severity and brand, expose matched fields plus safe `/productflow <ref>` handoffs and operator links, and never rewrite, retire, activate, publish, redispatch, call providers or Shopier, spend on ads, activate SupplierScout, revive retired channels, or push schema changes. It is a manual provenance decision aid: wording may be changed only after an operator confirms the item is an unbranded own product. Covered by `test:brand-safety-plan`, `test:operator-smoke-plan`, and `test:runtime-smokes`.

D-467 makes protected-brand safety an unconditional activation gate. The manual Publish Desk override may still cover generic Image QC/audit review cases, but it cannot bypass a protected-brand match: both `approveAndActivateProduct()` and the Payload `Products.beforeChange` hook refuse activation even when `manualPublishOverride` is present. Resolve provenance by keeping the item excluded or by correcting wording only after confirming it is an unbranded own product. Covered by `test:publish-desk` and `test:activation-guard`.

D-468 adds a no-database product-workflow golden path to `test:safe`. `test:product-workflow` proves active-channel-only Telegram target normalization, clean original-media progression from intake review to publish-ready, coherent activation defaults, and protected-brand refusal even with manual override intent. It does not create products, call Telegram/providers/Shopier, queue jobs, publish, dispatch, or push schema changes.

D-469 pins `turbopack.root` to this repository in `next.config.ts`, so local builds do not infer `C:\\Users\\W11` from its unrelated parent lockfile. `npm run build` passes without the former workspace-root warning; this changes build workspace discovery only and does not contact Payload, providers, Shopier, Telegram, n8n, OpenClaw, or external channels.

D-470 makes Product Flow Snapshot action commands use the numeric Payload ID while retaining the stock number as the displayed product reference. This prevents `/productflow SN...` from suggesting ID-only `/confirm`, `/content`, or `/audit` commands that would fail to parse. Covered by `test:product-flow-snapshot` and `test:runtime-smokes`; it is read-only diagnostic behavior and does not call Payload, providers, Telegram, Shopier, n8n, OpenClaw, or external channels.

D-471 public storefront safety gate is local-only. `src/lib/merchandising.ts` now excludes placeholder intake/test titles and protected-brand matches from public homepage rails, related-product cards, direct PDP rendering/metadata, and sitemap URLs. It protects legacy active records without mutating Payload data; activation and catalog remediation remain operator-controlled. Covered by `test:merchandising` and `test:storefront-trust`.

D-472 verified storefront metrics gate is local-only. Numeric homepage trust metrics are disabled by default and have no fallback social-proof values; `SiteSettings.trustBadges.enabled` must be explicitly enabled only after all three values are verified. `test:storefront-trust` guards the default-off behavior. It does not read or compute customer metrics, mutate Payload data, call providers, publish, dispatch, or spend on ads.

D-473 Product Flow website visibility truth is local-only. `buildProductFlowSnapshot()` now reports Website as blocked for draft, placeholder, protected-brand, or other storefront-unsafe products even when legacy website dispatch notes say published; public PDP links use the same storefront-safety eligibility. Covered by `test:dispatch-status` and `test:product-flow-snapshot`. It does not mutate product data, publish, redispatch, call providers/Shopier, or spend on ads.

D-474 safe public PDP link policy is local-only. `isPublicStorefrontProduct()` centralizes public-status plus storefront-safety eligibility for operator PDP links and ad landing links. Brand remediation, loading plans, Shopier previews, inbox, lead/order desks, and ad readiness now retain admin links but withhold a public PDP or UTM when the storefront would hide the product. Covered by `test:merchandising`, `test:brand-safety-plan`, `test:loading-plan`, `test:shopier-publish-control`, `test:operator-inbox`, `test:lead-desk`, `test:order-desk`, and `test:ad-readiness`; full `npm run validate` and `npm run build` pass. It does not mutate products, publish, queue, call providers/Shopier, or spend on ads.

D-475 direct Telegram UTM guard is local-only. `/utm <sn-or-id> <source> <medium> <campaign>` now checks `evaluateProductUtmEligibility()` before returning a link: the product must have a slug, be active, and pass the shared public storefront safety policy. `test:utm-builder` and `test:utm-command` are in `test:safe`; the command remains read-only and cannot update products, queue jobs, publish, dispatch, call providers/Shopier, or spend on ads.

D-476 catalog risk-first loading-plan order is local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now rank an active protected-brand product before a draft protected-brand product regardless of secondary blocker count, and show status beside each worklist row. `test:loading-plan` covers the order. It does not write products, publish, dispatch, queue Shopier jobs, call providers, activate SupplierScout, revive retired channels, or spend on ads.

D-477 protected-brand provenance review audit is preview-first and operator-confirmed. `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` previews before an explicit `confirm` records one `brand_safety.provenance_reviewed` BotEvent. It never edits a product, clears the protected-brand gate, activates, publishes, dispatches, queues Shopier, calls providers, activates SupplierScout, revives retired channels, or spends on ads. `/brandplan` and `smoke:brand-safety:read` display the latest valid review evidence read-only. Covered by `test:brand-provenance-review`, `test:brand-provenance-command`, `test:brand-safety-plan`, and `test:runtime-smokes`.

D-478 provenance review delivery idempotency is local-only. A repeated Telegram delivery of the same confirmed `/brandreview` command uses its update ID (with chat/message fallback) to return the original review instead of creating a second BotEvent. It still never writes a product or changes any brand-safety, publishing, dispatch, Shopier, provider, SupplierScout, retired-channel, or ad state. Covered by `test:brand-provenance-review` and `test:brand-provenance-command`.

D-479 Blog editorial preflight is local-only. `evaluateBlogPublishingPreflight()` blocks first publication of incomplete/placeholder BlogPosts, preserves legacy published edits, sets `publishedAt` on a valid first publication, and flags AI/evidence-sensitive copy for manual review. `/blogpreflight <id-or-slug>` and `npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only` are read-only diagnostics; they never edit or publish an article, call providers, spend, activate SupplierScout, revive retired channels, or push schema changes. Covered by `test:blog-preflight`, `test:blog-publishing-guard`, `test:blog-preflight-command`, and `test:runtime-smokes`.

D-480 Shopier webhook authenticity hardening is local-only. `src/lib/shopierWebhookSecurity.ts` verifies the documented HMAC-SHA256 format against the exact raw request body with constant-time comparison and comma-separated token rotation support. The webhook route fails closed with `503` when `SHOPIER_WEBHOOK_TOKEN` is absent and `401` for missing/malformed/invalid signatures before JSON parsing, order writes, stock mutation, or Telegram notification. `test:shopier-webhook-security` is included in `test:shopier-webhook-local` and `test:safe`; no live webhook or Shopier call is run by these checks.

D-407 fixed 5-slot generated-image contract is DEPLOYED (with the D-408..D-419b stack, remote main `d4ec174`). `src/lib/imageSlotContract.ts` is the single source of truth for the generated-image slots: it fixes the 5 slot types + order (current per D-419: `side` [main image, single], `hero_3q` [pair], `top` [pair], `back`, `detail`), the shared centering/framing discipline (`CENTERING_FRAMING_BLOCK`), and `SLOT_PROMPT_VERSION`. It deliberately does NOT hardcode camera angles/degrees/strict geometry — the model/provider chooses the best exact composition per slot. `imageProviders.ts` `EDITING_SCENES` now derives from the contract; `SHOT_CRITERIA` uses the 5 new keys with loose purpose/centering rules; anchors + the D-201 side-orientation auto-fix are remapped. `imageGenTask.ts` stamps per-image metadata (slotIndex, slotKey, promptVersion, productId, sourceImageId, mediaId) into the job's existing `promptsUsed`/`providerResults` JSON — no Payload schema push. Generated images still land in `product.generativeGallery` only (never `product.images`), the operator preview/approve/regenerate flow is unchanged, and all v50/identity/material/visual-fact/protected-zone/anti-frame locks are preserved. Covered by `test:image-slot-contract`. It must not push schema changes, call providers, publish, or attach generated images to `product.images`.

D-408 deterministic centering/scale lock is DEPLOYED (rewritten by D-413 after the first version created frame artifacts: now a CROP-WINDOW extracted straight from the original — continuous gradient background, no seam — with a DENSITY-based bbox so shadows don't inflate the box). Fixes the operator-reported inconsistent framing (shoe too close in one slot, too far in another) that prompt-level centering could not hold. `src/lib/imageCentering.ts` `normalizeProductCentering()` detects the product against the uniform ivory studio background, rescales its longer side to the slot's locked `frameCoverage` (in `imageSlotContract.ts`), and centers it on a fresh ivory canvas — so every slot shares the exact same scale + centering regardless of the model's composition. It runs in `imageGenTask.ts` (Step 6a2) over every generated buffer, for both providers, BEFORE the stock-number overlay, and is safe (returns the original buffer on error, no-subject, tiny/noise detection, or an already frame-filling detail). Covered by `test:image-centering`. It must not push schema changes, call providers, or publish; it takes effect on the live `#gorsel` flow only after an operator-approved deploy.

D-410 slot-set revision is local-only (amends D-407). The canonical set became `hero_3q, side, top, back, detail`: the dead-on `front` slot was replaced by a THREE-QUARTER hero (a shoe head-on reads flat; 3/4 shows front + one side and is the strongest catalog hero), and the other three were renamed for clarity (`top_pair→top`, `heel→back`, `material_detail→detail`). `sole`/outsole was rejected for slot 5 to avoid the model fabricating tread not in the reference; the visible-material `detail` is kept. `imageSlotContract.ts` (keys/labels/meanings/`compositionIntent`), the downstream anchors, the detail special-case, and the disabled `SHOT_CRITERIA` keys were updated; still geometry-free (model picks composition, D-408 centers it). Covered by `test:image-slot-contract`.

D-409 faster-preview cleanup is local-only. To cut provider rate-limiting and slim the approval flow: (a) the per-slot `checkShotCompliance` Vision check was removed from `generateByGeminiPro` — redundant after D-407 (model chooses composition) and D-408 (deterministic centering), and a major source of extra Gemini calls + regenerations; retry now fires only on colour drift or brand-zone drift (`checkShotCompliance`/`SHOT_CRITERIA` retained but disabled for easy re-enable; the OpenAI `generateByEditing` path already had no shot check; colour and gated brand checks are unchanged). (b) The Telegram approval keyboard dropped the legacy `1+2/1+3/2+3` combo row and the `🌟 4-5 Gemini Pro Üret` up-sell row (dead now the standard pack always makes 5 slots); it keeps Approve-all, per-image buttons, Regenerate, Reject, and partial approval still works via the text command `onayla 1,3,5` (route.ts unchanged). No new tests (behavioural provider/Telegram change); covered by typecheck/lint + the existing suite. It must not push schema changes or publish, and reaches the live flow only after an operator-approved deploy.

D-411..D-419b (2026-07-07) — the image system was DEPLOYED to production the same day (final remote main `d4ec174`) after live iteration on real `#gorsel` output; full records in `project-control/DECISIONS.md`. Summary: D-413 crop-window + density-bbox centering (the first centering version created frame artifacts and was rolled back — `718398b` → revert `97d3a9d`); D-414 slot 4 = rear three-quarter; D-415 brand gate REMOVED per operator ("markalı ürün gönderiliyorsa markalı üretilecek") — `imageBrandGate.ts` retained but not called; D-416→D-418 pair slots evolved from deterministic mirror (text flipped) → duplicate (copy-paste look) → MODEL-GENERATED matched pair via `PAIR_MODE_FINAL_BLOCK` (natural, readable branding, not pixel-identical); D-419/D-419b `side` became Slot 1 (single, the main channel image), `normalizeBackground()` unifies the studio background across slots (partial correction, no overshoot), and a pair COLOUR LOCK stops two-colour pairs. Operator confirmed on real output: pair colours consistent, backgrounds consistent, slot order correct. Deploys used the clean-worktree method (the working tree carries the uncommitted D-380..D-406 stack — never blanket-commit); local `package.json` test wiring (`test:image-slot-contract`, `test:image-centering`, `test:image-brand-gate`) is NOT yet on the remote.

## Validation

Use:

```powershell
npm run validate
```

This should pass before a change is considered ready. It runs typecheck, lint, and the safe assertion suite. Warnings are acceptable for now; errors are not.

The safe suite includes `test:retired-channels`, which blocks Dolap/Threads from active code, n8n workflow stubs, package activation scripts, current decision docs, and Memory Lock handoff files.

It also includes `test:n8n-optional`, which keeps n8n as optional glue, checks the allowed active-channel workflow inventory, and blocks package scripts from activating n8n workflows by default.

It also includes `test:ops-runbook`, which keeps the deployment, rollback, env-var, webhook-health, cron/job-runner, and PR workflow runbook aligned with the current architecture rules.

It also includes `test:local-release-candidate`, which keeps the local handoff manifest aligned with the not-deployed release boundary, source-pack count, active-channel rules, SupplierScout dormancy, and operator-approval guardrails.

It also includes `test:local-pr-review`, which keeps the local PR review package aligned with the release boundary, validation notes, active-channel rules, dormant-system rules, and no-live-action guardrails.

It also includes `test:runtime-smokes`, which keeps read-only runtime smoke commands documented, script-backed, confirmation-gated, and outside direct validation execution.

It also includes `test:soak-scripts`, which keeps old live-data `scripts/d*-soak*.ts` files quarantined as historical harnesses, outside default package scripts and read-only smoke inventory.

It also includes `test:provider-reality`, which keeps provider reality audit guidance aligned and blocks local env readiness from being treated as production provider readiness.

It also includes `test:product-flow-snapshot`, which keeps the read-only `/productflow` helper, operator checklist, primary step, and admin/PDP operator links aligned with the current product workflow and active-channel rules.

It also includes `test:shopier-order-stock`, which keeps Shopier order/refund stock reconciliation aligned with product-level stock, variant-level stock, refund restore, inventory logs, and safe skipped-size behavior.

It also includes `test:shopier-refund-lifecycle`, which keeps Shopier `refund.requested` idempotent before stock restore and keeps `refund.updated` note-only, audit-event-backed, and separate from stock mutation.

It also includes `test:business-desk`, which keeps `/business` summary, urgency, and D-446 safe next-read hints aligned without writes or unsafe action commands.

It also includes `test:funnel-desk`, which keeps `/funnel` math, attribution detail, and D-447 safe next-read hints aligned without writes or unsafe ad/Shopier commands.

It also includes `test:ad-readiness`, which keeps `/adready` product-page/media/stock/channel/UTM/lead/brand/no-spend gates and D-448/D-452 safe next-read hints aligned without writes, Shopier confirms, or ad-launch commands.

It also includes `test:order-desk`, which keeps Telegram order lifecycle, Shopier fulfilled lifecycle routing, manual cancellation/no-auto-restock policy, and D-445 order-admin/product-admin/lead-admin/PDP operator links aligned.

It also includes `test:lead-followup-plan`, which keeps `/leadplan` and `/followupplan` read-only, priority-sorted, and limited to suggested manual lead commands.

It also includes `test:shopier-commands`, which keeps Telegram `/shopier publish|republish`, `/shopier publish-ready`, and `/shopier retry-errors` on the shared Shopier/Web queue gate instead of direct route-level job writes.

It also includes `test:loading-plan`, which keeps `/loadplan` as a read-only catalog scale-up planner composed from Catalog QA and Category Fill, with batch summary, worklist handoffs, admin/PDP operator links, and own-products-only/no-publish/no-Shopier-queue/no-provider/no-ads guardrails.

It also includes `test:brand-safety-plan`, which keeps `/brandplan` as a read-only protected-brand remediation queue with severity/brand grouping, matched-field visibility, product-flow handoffs, and no automatic product changes.

It also includes `test:operator-smoke-plan`, which keeps `/smokeplan` as a read-only operator checklist, puts the D-437 Telegram access preflight before any live Telegram read, adds D-466 protected-brand diagnostics before the selected product-flow handoff, includes the image-plan runtime smoke before `/imageplan`, the lead-followup runtime smoke, storefront trust/PDP conversion, inquiry-guard, attribution, and sitemap preflights, read-only manual ad readiness/performance preflights, and local Shopier webhook preflight, and blocks unsafe queue/publish/redispatch/ad command variants from the formatted plan.

It also includes `test:image-regeneration-plan`, which keeps `/imageplan` and `/regenplan` as read-only Image QC regeneration guidance without provider calls, queueing, publishing, Shopier calls, external dispatch, or ad spend.

It also includes `test:image-slot-contract`, which keeps the fixed 5-slot generated-image contract intact: exactly 5 slots, valid unique slot keys only, the deterministic canonical order (`side, hero_3q, top, back, detail` — D-419; side is the single main image, hero_3q + top are the pair slots), a centering/framing rule present in every slot prompt template, no hardcoded camera degrees/geometry in the slot scenes, a locked per-slot `frameCoverage` and `layout`, and a stamped prompt version.

It also includes `test:image-centering`, which keeps the deterministic centering/scale lock correct: subject detection against the ivory background, equal scale across a too-close vs a too-far shot, true centering, and the safe skip paths (frame-filling detail, no subject, invalid coverage).

It also includes `test:image-brand-gate`, which keeps the `imageBrandGate.ts` library correct (protected-brand detection, fail-open on bad input). NOTE (D-415, operator decision): the gate is NOT wired into image generation anymore — branded products sent by the operator are generated branded, deliberately. The library + test are retained only in case policy reverses.

It also includes `test:ad-launch-pack`, which keeps manual ad pack copy drafts, Meta paid-social UTM links, protected-brand blocking, risky-claim fallback wording, invalid UTM blocking, and no-autonomous-spend guardrails aligned.

It also includes `test:story-dispatch`, which keeps the non-blocking Story pipeline from creating StoryJobs for protected-brand products.

It also includes `test:ad-performance`, which keeps manual campaign performance reporting read-only and tied to Payload leads/orders plus UTM/relatedInquiry attribution.

Pre-traffic hardening (2026-07-02) added five suites to the safe suite: `test:telegram-access` (DM operator allowlist denial semantics), `test:inquiry-guard` (lead-form honeypot / rate-limit / duplicate-collapse), `test:sitemap-entries` (sitemap structure + safe degrade), `test:attribution` (first-touch UTM survives homepage/PDP; submit merge pinned), and `test:storefront-trust` (DEMO_REVIEWS_ENABLED stays false; placeholder review copy stays removed; PDP conversion essentials stay present).

Read-only runtime smoke checks:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:load-plan:read -- --confirm-read-only
npm run smoke:brand-safety:read -- --confirm-read-only
npm run smoke:provider-health:read -- --confirm-read-only
npm run smoke:pi-provider-health:read -- --confirm-read-only
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:ad-performance:read -- --confirm-read-only
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:lead-followup:read -- --confirm-read-only
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

These require explicit read-only confirmation and must not write, queue jobs, dispatch channels, call providers, call Shopier, spend on ads, or push schema changes. Image-plan smoke reads one real product plus recent `image-generation-jobs` and mirrors Telegram `/imageplan` without queueing image generation. Load-plan smoke reads product samples and mirrors Telegram `/loadplan` for catalog loading/fix priorities without mutation. Brand-safety smoke reads product text already stored in Payload and mirrors `/brandplan` severity/brand/field evidence without rewriting text or changing status. Channel provider-health smoke reads AutomationSettings and prints provider states plus missing key names only, never secret values. PI provider-health smoke is env-only and checks Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection without connecting to Payload or calling providers. Ad-readiness smoke reads one real product and mirrors Telegram `/adready` for product-page, media, stock/size, UTM, lead visibility, and brand-safety checks. Ad-performance smoke reads leads/orders and mirrors Telegram `/adreport` for UTM-tagged campaign rows, related orders/revenue, stale open leads, untagged leads, and direct/unattributed orders. Business/funnel smoke reads lead, order, product, and stock diagnostics through the same helpers as Telegram `/business` and `/funnel`. Lead-followup smoke reads open leads and mirrors Telegram `/leadplan`/`/followupplan` as a PII-light next-action summary without customer messages or lead writes.

Guarded D-355 DB repair helper:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

Default mode is dry-run only. Do not run the confirmed apply mode unless the operator explicitly approves applying the reviewed D-355 Image QC DDL. After apply, rerun `smoke:imageqc:schema`, `smoke:provider-health:read`, `smoke:pi-provider-health:read`, `smoke:product-flow:read`, `smoke:image-plan:read`, `smoke:ad-readiness:read`, and `smoke:shopier:read`.

## Documentation Sync

If a change affects roadmap, architecture, bot roles, active channels, validation, or major milestones, update `chatgpt-project-sources/` in the same task.

## Memory Sync

Frank requires every repo change made by Hermes/agents to be recorded in the relevant in-repo memory/context files in the same task, without exception, so future Claude/Codex sessions inherit accurate state. At minimum consider `project-control/CLAUDE_MEMORY.md`, `PROJECT_STATE.md`, `TASK_QUEUE.md`, `BUGS_AND_FIXES.md`, `DEPLOYMENT_LOG.md`, `AGENTS.md`, this `CLAUDE.md`, and relevant `chatgpt-project-sources/` files. Record only facts and verification results; never record secrets.

Keep that folder at or below 20 Markdown documents. It is currently at the limit, so update or merge an existing source file before adding another.

## Working Style

- Prefer incremental changes.
- Keep Payload as source of truth.
- Avoid broad refactors unless needed.
- Do not touch secrets.
- Do not mutate external systems without explicit operator approval.

## D-481 Shopier Order-ID Migration

`Orders.shopierOrderId` now declares uniqueness, and an inbound duplicate-key
failure returns before Shopier stock mutation. The backing PostgreSQL partial
unique index was approved, applied, and post-apply verified on 2026-07-25.
It protects non-empty Shopier IDs in the configured database; live Shopier
webhook delivery still needs separate evidence.

Read-only preflight:

```powershell
npm run smoke:shopier-order-id-schema:read -- --confirm-read-only
```

Dry-run first; confirmed DDL needs explicit operator approval:

```powershell
npm run db:shopier-order-id-unique:apply -- --dry-run --print-sql
npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique
```

## D-482 Shopier Order Transaction Boundary

`order.created` now creates the local order and applies its stock/inventory-log
changes through one Payload adapter transaction using the same request. It fails
closed when a transaction cannot start, and a verified processing failure returns
`500` so Shopier can retry. The generic Orders alert hook skips Shopier orders;
the webhook alert is sent only after the transaction commits. D-481's reviewed
unique index is applied and read-only verified in the configured database; do
not claim live webhook-delivery proof until a separate approved smoke runs.

Run the local proof without a database or Shopier call:

```powershell
npm run test:shopier-webhook-local
```

## D-483 Non-Shopier Order Stock Transaction Boundary

Website, phone, Instagram, and other non-Shopier order creates now run their
stock mutation before the generic new-order alert. The existing Payload create
transaction carries the same request through product/variant stock, InventoryLog,
and stock-reaction reads/writes. A missing product or size, unknown variant, or
insufficient stock throws so Payload rolls back the parent order create instead
of recording stock drift. Lifecycle reaction/notification work remains advisory.

Run the local proof without a database or external call:

```powershell
npm run test:order-stock-transaction
```

## D-484 Non-Shopier Conditional Stock Reservation

Non-Shopier Orders now reserve stock with a conditional PostgreSQL update inside
the active parent Payload transaction. Product total is reserved before the
selected variant, and each reservation requires `stock >= quantity`. A competing
last-unit request receives no updated row, throws, and rolls the whole Order
create back before InventoryLog creation. The helper fails closed without the
active transaction; it does not touch Shopier's separate webhook path. D-481's
index is a separate configured-database guard. Covered by
`test:order-stock-transaction`.

## D-485 Shopier Atomic Floor-At-Zero Decrement

Shopier `order.created` retains its D-482 transaction but now uses atomic
floor-at-zero PostgreSQL decrement arithmetic for product total and matched
variant stock. Paid external orders stay recorded and audited when local stock
is depleted; concurrent distinct deliveries cannot overwrite depletion and
leave a falsely high local count. The D-481 duplicate-order index is applied
and post-apply verified separately. Covered by `test:shopier-webhook-local`.

## D-486 Storefront Image Fallback And Structured Data Safety

The public PDP now resolves usable generated-gallery URLs first and falls back
to original product media when no generated URL is usable. The same resolved
gallery feeds Product JSON-LD, offer availability uses shared sellable-stock
truth, and Product/FAQ JSON-LD is safely serialized before inline rendering.
Covered by `test:product-storefront-images`, `test:product-structured-data`,
and `test:storefront-trust`. It does not read or write Payload, call a provider
or Shopier, publish, dispatch, or spend.

## D-487 Shared Blog And PDP JSON-LD Serialization

`src/lib/structuredData.ts` is the one safe serializer for inline JSON-LD. Both
the public PDP and Blog Article page use it, rather than raw `JSON.stringify`,
so stored editorial/product content cannot terminate a schema script. Covered
by `test:structured-data` and `test:blog-structured-data`; no Payload, Blog,
provider, Shopier, publishing, dispatch, or ad action occurs.

## D-488 Optional OpenClaw VPS Deploy Guard

`scripts/vps-deploy.sh` is now a reactivation-only legacy sync path. It exits
before any VPS configuration write, skill copy, or container restart unless the
operator supplies both `--reactivate-openclaw` and `--confirm-vps-sync` after
the read-only `OPENCLAW_VPS_VERIFICATION.md` evidence is recorded. Hermes/Mentix
remains current; this does not sync, restart, or invoke OpenClaw. Covered by
standalone `test:openclaw-vps-verification`, which remains outside `test:safe`.

## D-489 Confirmation-Wizard Schema Governance

Telegram confirmation handling now only reads or writes rows in the existing
`public.wizard_sessions` table; it never runs `CREATE TABLE`, `ALTER TYPE`, or
other schema DDL. `npm run smoke:wizard-sessions:schema -- --confirm-read-only`
is a confirmation-gated read-only metadata check. `db:wizard-sessions:apply` prints the reviewed SQL
without a database connection by default and requires
`--apply --confirm-apply-d489-wizard-sessions-schema` plus explicit operator
approval to create a missing table. Covered by `test:confirmation-wizard` and
`test:runtime-smokes`; no database action was run in this change.

## D-490 Lead-Status Enum Schema Governance

Lead-status request handling never exposes or runs enum DDL. If a deployed
CustomerInquiries enum lacks a declared status, Telegram leaves the lead
unchanged and points the operator to:

```powershell
npm run smoke:lead-status-schema:read -- --confirm-read-only
```

The check reads `pg_type`/`pg_enum` metadata only. `db:lead-status-enum:apply`
is dry-run by default and requires
`--apply --confirm-apply-d490-lead-status-enum` plus separate explicit
approval before it can add missing post-baseline statuses. Covered by
`test:lead-status-schema` and `test:runtime-smokes`; do not run the preflight
or confirmed apply without operator approval.

## D-491 Order-to-Lead Relationship Schema Governance

Lead conversion checks its existing `orders.related_inquiry_id` relationship
before any order write. A missing deployed relationship leaves the order, lead
status, and audit trail unchanged and points the operator only to:

```powershell
npm run smoke:lead-conversion-schema:read -- --confirm-read-only
```

The check reads column and foreign-key metadata only. `db:lead-conversion-schema:apply`
is dry-run by default and requires
`--apply --confirm-apply-d491-order-lead-relationship` plus separate explicit
approval before it can add an absent nullable relationship. It refuses an
incompatible existing column or foreign key for manual schema review. Covered
by `test:lead-conversion-schema` and `test:runtime-smokes`; do not run the
preflight or confirmed apply without operator approval.

## D-492 Storefront Header And Camper Brand-Safety Correction

The storefront announcement bar now renders inside the fixed Navbar, so it has
its own header row instead of overlapping the wordmark. The shared protected-
brand scanner now includes `Camper`; activation, public storefront eligibility,
dispatch, Shopier readiness, and ad checks therefore reuse the existing hard
block. Covered by `test:brand-safety`, `test:merchandising`, and
`test:storefront-trust`; no Payload data, provider, Shopier, Telegram, or
deployment action occurred.

## D-493 X Direct/Fallback Provider Readiness Alignment

Direct X dispatch requires all four OAuth 1.0a environment values:
`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET`.
Partial configuration must not attempt a direct X API call. It may use optional
`N8N_CHANNEL_X_WEBHOOK` fallback when configured; otherwise it records the
missing OAuth key names and fallback requirement for operator triage. Covered
by `test:channel-dispatch`, `test:provider-health`, `test:redispatch`, and
`test:dispatch-status`; full `npm run validate` and `npm run build` pass. This
local coverage is not production provider proof.

## D-494 Meta Gallery Media Selection Alignment

Instagram and Facebook direct dispatch must scan the full gallery for public
HTTPS media, not only the first URL. A relative or insecure first item must not
force optional fallback when a later public image is available. Covered by
mocked direct-adapter checks in `test:channel-dispatch`; full `npm run validate`
and `npm run build` pass. It is not real Meta delivery proof.

## D-495 Meta Public-Media Dispatch Preflight

If an Instagram/Facebook product has no public HTTPS gallery image, record a
media-specific failed result before direct Meta or optional n8n fallback can be
called. Keep configured fallback visibility for triage, but never send it
relative/unreachable media. Covered by mocked `test:channel-dispatch` checks.
Full `npm run validate` and `npm run build` pass locally; this is not live Meta
or n8n delivery proof.

## D-496 Lead-Followup Runtime Smoke Completeness

The read-only lead-followup smoke must register `BlogPosts` beside `Products`,
because the Product schema declares `linkedBlogPost`. Do not mistake a missing
collection in a temporary smoke configuration for configured-database drift.
The approved 2026-07-25 read completed with six open stale leads and no writes,
messages, queues, provider calls, Shopier calls, schema pushes, or ad action.
Full `npm run validate` and `npm run build` pass after this correction.

## D-497 Brand Remediation External-Exposure Visibility

`/brandplan` and `smoke:brand-safety:read` now summarize recorded external
dispatch notes as `published`, `queued`, or `failed` for Facebook, Instagram,
X, and Shopier. Website is intentionally excluded because it is native rather
than an external dispatch. This is read-only historical evidence, not proof a
remote listing still exists and not authorization to clean up, retry, publish,
or change a product. The approved 2026-07-25 smoke found 13 protected-brand
records; `SN0111` records Facebook published, Shopier queued, and X failed.
Covered by `test:brand-safety-plan` and `test:runtime-smokes`.

## D-498 Brand Remediation Provenance-State Workflow

The protected-brand remediation plan now classifies every row as not reviewed,
needs provenance evidence, confirmed unbranded copy fix, or not approved for
sale. It also supplies one safe next action: verify recorded external state,
preview a provenance decision, collect evidence, correct copy manually, or keep
the product excluded. The approved 2026-07-25 read found 13 unreviewed
protected-brand records; 9 have recorded external dispatch history. This is
read-only triage, not a product update, remote cleanup, provider call, Shopier
action, redispatch, or publishing authorization. Covered by
`test:brand-safety-plan` and `test:runtime-smokes`.

## D-499 Batch Image QC Remediation Queue

`/imageqcplan` and `npm run smoke:image-qc-plan:read -- --confirm-read-only`
group catalog Image QC blockers into protected-brand review first, missing
original media, QC fail, QC review, and missing QC decision. They only provide
`/imageplan` and Product Flow handoffs; they never record QC, queue generation,
call providers, publish, dispatch, or alter products. Protected-brand rows must
return to provenance review before any image work. Covered by
`test:image-qc-remediation-plan`, `test:operator-smoke-plan`, and
`test:runtime-smokes`.

D-499 per-product diagnostic alignment is local-only. Product Flow Snapshot
and Image Regeneration Plan now make protected-brand provenance the first and
only actionable step; they withhold Image QC, generation, activation, Shopier,
redispatch, and ad suggestions until the existing preview-first
`/brandreview <id-or-sn> needs-evidence` review. Covered by
`test:product-flow-snapshot` and `test:image-regeneration-plan`.

D-499 provenance continuity is local-only and read-only. `/productflow`,
`/imageplan`, and their runtime smokes load the latest matching provenance
BotEvent. A recorded `needs_evidence`, `unbranded_copy_fix`, or
`not_approved_for_sale` decision changes the diagnostic's manual next step but
never clears the protected-brand gate or permits Image QC, generation,
activation, dispatch, Shopier, or ads.

## D-500 Meta Provider Configuration Unification

Facebook direct dispatch and provider-health now use the same shared Meta
credential resolver. The Facebook Page ID is read from deployment env
`INSTAGRAM_PAGE_ID`; it is not a Payload AutomationSettings field because that
column was intentionally removed from the schema. Legacy in-memory snapshots
remain compatible. `.env.example` lists only active n8n fallback keys and the
four direct X OAuth 1.0a keys. Covered by `test:provider-health`,
`test:meta-provider-credentials`, and `test:channel-dispatch`. This is local
configuration behavior only, not proof of deployed credentials, Meta account
permissions, or a live post. PR #6 merged the reviewed D-380-D-500 stack into
`main`, and Vercel Production deployment `dpl_5L6CXiNjKBiqS8sp7DAuRabcG1cj`
is Ready; public homepage/PDP smoke checks pass. Do not run live integration
actions without a separate operator approval.

## D-501 Mobile PDP CTA Overflow Guard

The deployed PDP mobile smoke at a 390px viewport found the fixed 40/60 CTA
bar expanding the document to 440px because both controls added padding outside
their flex basis. PR #7 merged D-501 as `8adfd1b`, and Vercel completed its
Production deployment successfully. Both controls use `boxSizing: 'border-box'`
and `minWidth: 0`, and `test:storefront-trust` guards that contract. Desktop
public smoke passes, and a Chrome DevTools responsive `390 x 844` production
screenshot visually confirms the fixed controls fit with no visible horizontal
overflow. D-501 does not call
providers, Shopier, Telegram, n8n, or make a data write.
