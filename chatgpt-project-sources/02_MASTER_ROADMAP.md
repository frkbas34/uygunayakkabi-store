# Master Roadmap

Last updated: 2026-07-25

## Phase 0: Project Control Center

### At-A-Glance Completion Audit (2026-07-24)

| Phase | Local implementation evidence | Remaining proof or decision |
| --- | --- | --- |
| 0. Project control | D-465 Obsidian/agent/source-pack governance passes. | Commit/deploy when approved. |
| 1. Repo health | `validate` passes; D-462 BlogPosts relationship migration is applied and its post-apply check/build pass. | Keep the helper guarded for any other environment; continue normal validation. |
| 2. Product workflow | Shared readiness, Product Flow Snapshot, and Telegram/admin diagnostics are tested. | Operator-present admin/Telegram smoke after deploy. |
| 3. Mentix/Hermes | Hermes/Mentix current truth and skills are governed locally; OpenClaw is optional. | VPS evidence only if OpenClaw is explicitly reactivated. |
| 4. Publishing | Active-channel dispatch, status, recovery, and Shopier guards are tested. | Provider credentials and operator-approved real dispatch/retry evidence. |
| 5. AI/GEO | Image QC, regeneration plans, and provider-health visibility are tested. | Operator-approved provider quota/permission evidence and live workflow proof. |
| 6. Storefront | PDP conversion guardrails and curated homepage rails are tested. | Deployed browser/mobile smoke. |
| 7. Orders/leads/stock | Lifecycle, funnel, and Shopier stock/refund logic are tested. | Configured, operator-approved live Shopier webhook evidence. |
| 8. Ads | Manual readiness/copy/reporting tools are tested; autonomous spend is blocked. | Product/traffic readiness and separate operator approval; Pixel/CAPI/API stay deferred. |
| 9. Ops | Runbook, release-candidate, PR package, and smoke governance are tested. | Commit/PR, deploy, and operator-present live smoke. |

This audit is intentionally evidence-based: local tests do not substitute for production credentials, provider permissions, webhook deliveries, VPS state, or operator-approved external actions.

### D-473 - Product Flow Website Visibility Truth

Local-only Phase 2/6 operator correction. Product Flow now treats Website as blocked unless the product has a public status and passes the same storefront safety check that protects homepage/PDP/sitemap surfaces. Legacy website dispatch notes cannot make a draft or protected-brand product appear live, and unsafe products no longer receive a PDP link in Product Flow. `test:dispatch-status` and `test:product-flow-snapshot` cover the behavior.

### D-474 - Safe Public PDP Link Policy

Local-only Phase 2/6/8 policy consolidation. `isPublicStorefrontProduct()` now combines public status with the storefront's placeholder/protected-brand safety gate. Brand remediation, loading plans, Shopier previews, inbox, lead/order desks, and ad readiness keep admin visibility but withhold public PDP and UTM links when the storefront would hide the product. Focused link/ad policy tests, full `npm run validate`, and `npm run build` cover the behavior; no product data, queue, publish, provider, Shopier, or ad action occurs.

### D-475 - Direct Telegram UTM Guard

Local-only Phase 2/6/8 completion of the UTM boundary. The direct Telegram `/utm` command now uses `evaluateProductUtmEligibility()` before URL construction, requiring a slug, `status='active'`, and the shared placeholder/protected-brand public storefront safety condition. `test:utm-builder` and `test:utm-command` protect the pure rule and route wiring; the command only returns or refuses a link and does not mutate Payload or call external services.

### D-472 - Verified Storefront Metrics Gate

Local-only Phase 6 trust correction. Numeric homepage trust metrics now default to hidden and have no fallback values. They display only when an operator explicitly enables `SiteSettings.trustBadges.enabled` after entering all three verified values. This is not analytics automation and does not compute or change metrics from Payload. `test:storefront-trust` covers the behavior.

Goal: stop drift between ChatGPT, Claude, Codex, Obsidian, and old notes.

Deliverables:

- Create one clean Obsidian project brain.
- Maintain this `chatgpt-project-sources` folder.
- Add or maintain `AGENTS.md` for Codex.
- Add or maintain `CLAUDE.md` for Claude.
- Keep Dolap/Threads retired and SupplierScout dormant in all guidance.

Acceptance:

- All agents receive the same current truth.
- There is one obvious place to check active architecture and next work.

Current status: D-465 keeps the root Obsidian project-control notes aligned with the same active architecture: Payload/Next is the executing commerce layer, Hermes/Mentix is current, OpenClaw is historical/optional, n8n is optional glue with direct Payload/Next as default, SupplierScout is dormant, and Dolap/Threads remain retired. `test:retired-channels`, `test:n8n-optional`, `test:mentix-skills`, and `test:obsidian-control` cover this truth from complementary boundaries. The repo skills are advisory/draft/read-only guidance; they do not prove an OpenClaw VPS deployment.

## Phase 1: Repo Health And Validation

Goal: make the codebase trustworthy before adding features.

Deliverables:

- Fix broken lint command.
- Add working `typecheck`, `lint`, and `validate` scripts.
- Exclude or clean stale `sessions`, `tmp/next-build`, and broken soak scripts.
- Fix or isolate TypeScript blockers.
- Update `.gitignore` for generated junk.

Acceptance:

- One command gives reliable health signal.
- Claude/Codex stop chasing stale generated files.

Current status: usable as of 2026-07-24. `npm run validate` passes with 0 lint errors / 0 warnings. The safe tests cover brand safety, protected-brand remediation planning, product media readiness, product stock readiness, lifecycle, operator/admin readiness summary, source-pack governance, runtime-smoke governance, SupplierScout dormancy, Hermes/Mentix skill governance, admin visibility, product-channel normalization, product-flow snapshot diagnostics, publish readiness, catalog QA, category fill, product loading plan, image quality, Shopier command governance, state coherence, Telegram parsing and confirmation wizard handling, channel dispatch, dispatch state, provider health, story dispatch brand safety, redispatch, automation decisions, activation guard, Publish Desk activation wrapper, ad readiness, ad launch packs, and ad performance reporting. OpenClaw VPS verification remains a standalone optional guard for reactivation, not the current live control layer. D-462's approved additive migration repaired `blog_posts.featured_image_id` and its exact media foreign key in the configured database; post-apply metadata check and build pass, while the helper stays guarded for other environments.

Current validation signal: a post-D-465 local cleanup reduced `npm run lint` to 0 errors / 0 warnings, down from 70, without changing command behavior. Blog, related PDP cards, and configured legacy-shell product media now use optimized Next images; explicit data/blob fallbacks remain only where `next/image` cannot process the source. Shared font loading now lives in the App Router layout, while the retired per-color image engine, dead category-shell code, and unused direct Shopier-publish helper are removed; the guarded Payload job path is the only supported Shopier publishing route. Full `npm run validate` passed after this latest cleanup.

## Phase 2: Core Product Workflow

Goal: make product upload, review, image, stock, and publish flow smooth.

Target flow:

Telegram/admin upload -> Payload draft -> media attached -> confirmation wizard -> optional AI image/content -> operator approval -> publish.

Deliverables:

- Audit product schema.
- Polish admin product creation.
- Make photo upload reliable.
- Improve confirmation wizard.
- Clarify statuses: draft, needs review, ready to publish, active, sold out.
- Ensure incomplete products cannot publish.

Acceptance:

- A product can be added in under 2 minutes.
- Admin and Telegram flows create the same clean product shape.

Current status: active. The admin ReviewPanel now appears for admin/manual products and shows readiness, lifecycle, channels, brand safety, and activation-guard signals. Product channel targets and publish flags are normalized before activation so manual admin saves match dispatch gates. ReviewPanel and `/pipeline` media/stock diagnostics now use the same usable-media and stock-summary definitions as central activation/readiness, and ReviewPanel's ready banner depends on central six-dimension publish readiness. Telegram now also has read-only `/productflow <sn-or-id>` and `/flow <sn-or-id>` snapshots that combine lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state, summary, and row-level recovery paths, coherence issues, a checklist summary, an operator checklist, a primary operator step, and next actions without mutation. D-422 adds the checklist so drafts show the next missing Photos/Image QC, confirmation, content, audit, price/size/stock, target, approval, and Shopier steps directly in the product-flow handoff. D-423 makes those checklist commands dependency-aware so early drafts point back to confirmation before content/audit, and audit waits for content trigger or retry. D-424 derives a single primary operator step from the ordered checklist so the next command/manual step is visible before the full checklist. D-458 adds a compact done/next/blocked/needs-work checklist summary so product-flow progress is visible before the full checklist. D-459 adds a compact active-channel dispatch summary so published/queued/failed/blocked/not-configured/unrecorded publishing health is visible before the full dispatch rows. D-460 keeps each non-published row's state, failure/configuration reason, and deterministic next operator command together without running that command. D-443 extends direct operator-link discipline to `/inbox` product rows, showing Payload admin links and public-status-only PDP links across pending, publish, stock, failed, and today buckets without writing products. Runtime preflight exists at `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`, which reads real Payload state through the same helper and prints the same checklist summary, dispatch summary, row recovery paths, checklist, and dispatch rows without writes or provider calls. Live admin and Telegram operator smoke tests are still needed with the operator present.

D-444 extends the same direct-link discipline to lead desk rows/cards/alerts: `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts now show lead-admin, related product-admin, and public-status-only PDP links without writing leads or messaging customers.

D-445 extends the same direct-link discipline to order desk rows/cards/alerts: `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts now show order-admin, related product-admin, related lead-admin, and public-status-only PDP links without changing order status, restoring stock, or messaging customers.

D-446 makes `/business` more actionable while staying read-only: urgency counts now render `Next safe reads` pointing to `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock` as appropriate, without lead/order/product writes, stock changes, queues, provider calls, Shopier calls, or ad actions.

D-447 makes `/funnel` more actionable while staying read-only: lead-source, order, and UTM attribution signals now render `Next safe reads` pointing to `/leadplan`, `/orders`, and `/adreport week` as appropriate, without lead/order/product writes, stock changes, queues, provider calls, Shopier calls, or ad actions.

D-448 makes `/adready` more actionable while staying read-only: blocked products now render `Next safe reads` pointing to `/productflow <ref>` and `/imageplan <ref>` when relevant, while review/ready products point to read-only `/adpack <ref> manual_ads` and `/adreport week`, without product/lead/order writes, stock changes, queues, provider calls, Shopier calls, campaign/post/pixel creation, or ad spend.

D-449 keeps the live-smoke operator checklist label current by rendering `/smokeplan` as `Operator Live Smoke Plan (D-389/D-449)`. This is a title/governance alignment only: smoke order remains unchanged and no live Telegram, Shopier, provider, queue, publish, or ad action is performed.

D-450 hardens the project memory layer: retired-channel governance now checks both Memory Lock handoff files so future sessions cannot inherit old Dolap/Threads scaffold/planned wording. D-451 hardens the storefront conversion layer: storefront-trust governance now pins buyer-facing PDP essentials before paid traffic. Together they preserve the current channel set and buyer path before new product-flow, Shopier, or ad work.

## Phase 3: Mentix, Hermes, And Optional OpenClaw Brain

Goal: make Mentix useful and clearly owned.

Deliverables:

- Define Hermes as the current agent-control layer.
- Keep OpenClaw historical/optional unless explicitly reactivated.
- Define Payload/Next as system of record and execution layer.
- Improve active skills: product-flow-debugger, upload-post, senior-backend, research-cog, agent-memory.
- Add skill deployment checklist.
- Decide whether n8n remains in intake.

Acceptance:

- Mentix can explain product failures and prepare channel content.
- Hermes, optional OpenClaw, and the app-side Telegram route are not confused with each other.

Current status: repo-side guardrails added and reconciled for Hermes-current truth. `npm run test:mentix-skills` checks that skill guidance stays Payload-first, own-products-only, active-channel-only, n8n-optional, and `/smokeplan`-first. The product-flow-debugger skill can ground operator answers in the app-side Product Flow Snapshot helper and `/productflow` Telegram surface. D-390 aligns repo-side Hermes/Mentix live-smoke guidance: `mentix-intake`, `product-flow-debugger`, the installation matrix, optional OpenClaw sync notes, and skill dashboard point live-smoke planning to `/smokeplan` first and stop before queue/publish actions. D-401 retains `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` and standalone `npm run test:openclaw-vps-verification` as optional OpenClaw reactivation guardrails only. D-488 makes the legacy VPS script refuse before any configuration write, skill copy, or restart unless both explicit reactivation flags are supplied after that verification.

## Phase 4: Publishing Reliability

Goal: make active channel publishing dependable.

Deliverables:

- Harden Instagram, Facebook, X, and Shopier paths.
- Add readable per-channel status.
- Improve redispatch buttons.
- Add retry handling.
- Add brand-safety hard gate before activation.

Acceptance:

- Each active product shows where it published and why any channel failed.

Current status: in progress. Shared dispatch-state summaries now cover `published`, `queued`, `failed`, `blocked`, `preview`, `unrecorded`, `not_configured`, and `skipped`. ReviewPanel builds an overview from active targets plus recorded dispatch notes, so Website shows as native published, external targets with no result show as unrecorded, and historical non-target notes remain visible. D-459 extends the same visibility discipline into Product Flow Snapshot with active-channel dispatch counts before row details; D-460 then places deterministic recovery guidance on every non-published active-channel row, including guarded Shopier queue/publish paths and redispatch only after the recorded issue is fixed. ReviewPanel also shows a read-only Shopier Queue Gate for the current product using the same D-356 evaluator as Telegram queue commands. Telegram `/diagnostics` now reports secret-safe provider health for Website, Instagram, Facebook, X, and Shopier. D-493 aligns direct X dispatch with complete OAuth or explicit optional-n8n fallback; D-494 and D-495 ensure Meta dispatch selects public gallery media and refuses before any direct/fallback call when none exists. Story dispatch now has a brand-safety guard too: protected-brand products do not create StoryJobs, and the failed story status records the reason. Broader retry handling and real provider/dispatch evidence still need operator approval.
- Unsafe products cannot accidentally go external.

## Phase 5: AI Images And GEO Content

Goal: make AI output useful for selling.

Deliverables:

- Stabilize `#gorsel` image workflow.
- Keep generated images separate from originals.
- Improve approval/regenerate flow.
- Keep GEO/SEO content operator-controlled.
- Decide real provider set: Gemini, Google Vision, DataForSEO, SerpAPI.

Acceptance:

- AI images are consistently usable.
- GEO content improves pages without hallucinated claims.

Current status: Image QC gates are implemented, the regeneration bridge is now read-only/operator-guided, and provider visibility exists for Product Intelligence/GEO. `src/lib/imageRegenerationPlan.ts`, Telegram `/imageplan <sn-or-id>`, Telegram `/regenplan <sn-or-id>`, `npm run test:image-regeneration-plan`, and `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only` now turn Image QC REVIEW/FAIL, rejected visuals, and preview-job states into safe manual next actions without queueing image generation or calling providers. The runtime smoke mirrors `/imageplan` from real Payload product/job reads before live Telegram smoke while staying read-only. `src/lib/productIntelligence/providerHealth.ts` and `npm run smoke:pi-provider-health:read -- --confirm-read-only` report Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection readiness from env without Payload access, provider calls, or secret values. D-403 adds `project-control/PROVIDER_REALITY_AUDIT.md` and `npm run test:provider-reality` so local env readiness is not production provider readiness. Live provider quota/balance/permission checks still require operator-approved evidence.

## Phase 6: Storefront Conversion

Goal: improve the sales surface.

Deliverables:

- Better product detail page.
- Better mobile gallery.
- Clear sizes, stock, WhatsApp CTA, Shopier CTA.
- Trust, shipping, returns, authenticity wording.
- Homepage sections for new arrivals, best sellers, deals, editor picks.

Acceptance:

- Product pages are ready for ad traffic.
- Buying path is obvious on mobile.

Current status: product detail pages already include price, size/stock chips, lead form, WhatsApp CTA, Shopier CTA when available, trust messaging, FAQ, product guide content, and mobile sticky CTA. D-464 closes the homepage merchandising handoff: server-selected Editor Picks, Best Sellers, Deals, and Discounts now render their matching curated product lists rather than arbitrary positional catalog slices. `test:merchandising` covers eligibility, ordering, toggles, and section selection; `test:homepage-merchandising` verifies the server-to-client rail wiring; both are in `test:safe`. New read-only preflight exists at `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only`; it mirrors Telegram `/adready` against real Payload data and checks PDP/product-page status, Image QC/media, stock/size, active-channel linkability, UTM, lead visibility, brand safety, risky claims, and no-autonomous-spend without writing or publishing.

## Phase 7: Orders, Leads, Stock, Analytics

Goal: know what sells and keep stock coherent.

Deliverables:

- Lead capture cleanup.
- UTM/funnel review.
- Order lifecycle polish.
- Stock decrement/restore verification.
- Decide analytics path.

Acceptance:

- Leads and campaign source are visible.
- Stock drift is diagnosable.

Current status: core operator visibility exists and is now guarded by tests/runtime smoke. Telegram `/business` gives the daily owner snapshot across leads, sales, orders, and stock urgency; D-446 adds safe next-read hints for `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock` when urgency counts need follow-up. Telegram `/funnel`, `/funnel today`, `/funnel week`, and `/huni` group lead demand by source, attribute converted orders through `relatedInquiry`, separate direct orders without a lead, show UTM/referrer detail when present, and D-447 adds safe next-read hints for `/leadplan`, `/orders`, and `/adreport week` when lead/order/UTM evidence needs follow-up. Telegram `/leadplan` and `/followupplan` now build a read-only lead follow-up plan from open Payload leads, prioritizing never-touched stale leads, overdue follow-ups, contacted quiet leads, and fresh new leads while suggesting only existing manual lead commands. D-442 adds direct operator context links to those rows: lead admin, related product admin, and public PDP only for related products with public status. Validation now includes `test:business-desk`, `test:funnel-desk`, `test:lead-followup-plan`, `test:order-desk`, `test:shopier-order-stock`, and `test:shopier-refund-lifecycle`; runtime smoke exists at `npm run smoke:business-funnel:read -- --confirm-read-only` for `/business` plus `/funnel` and `npm run smoke:lead-followup:read -- --confirm-read-only` for `/leadplan` plus `/followupplan`, both without writes, provider calls, Shopier calls, ad spend, or schema push. `test:order-desk` locks the operator lifecycle policy: ship/deliver stamp order timeline fields, Shopier `order.fulfilled` uses the same `ship` helper with source `shopier_webhook`, delivered orders cannot be cancelled through Telegram, idempotent actions do not write, and manual `/cancelorder` points to `/restock` instead of auto-restoring stock. Shopier `order.created` and `refund.requested` stock mutation now share `src/lib/shopierOrderStock.ts`: sales decrement the matching local variant when variants exist, otherwise product-level stock; refunds restore through the same rule; mismatched Shopier sizes are skipped with an explicit reason instead of silently drifting stock. Shopier refund webhooks now also use `src/lib/shopierRefundLifecycle.ts`: `refund.requested` records an idempotent request marker before stock restore so duplicate delivery cannot restore stock twice, while `refund.updated` appends idempotent status notes and emits `order.refund_updated` without changing status or stock. `/smokeplan` now includes `smoke:lead-followup:read` after business/funnel visibility and before Telegram `/leadplan`, then `npm run test:shopier-webhook-local` before `smoke:shopier:read`, so lead next-action and Shopier webhook preflights happen before live Telegram/Shopier operations. Latest 2026-07-02 smoke found 6 open leads, 5 stale leads, 1 sold-out product, and 2 website leads in the 7-day funnel. Still needed: live Shopier webhook smoke after credentials/webhooks are configured and operator-approved verification of the cancellation/refund policy in real operations.

D-444 adds `test:lead-desk` to protect shared lead-admin/product-admin/public-status-only PDP links in the older lead desk surfaces. `src/lib/leadFollowupPlan.ts` now reuses the same helper so lead follow-up and lead desk link behavior cannot drift.

D-445 extends `test:order-desk` to protect shared order-admin/product-admin/lead-admin/public-status-only PDP links in the order desk surfaces while preserving the existing order lifecycle mutation tests and inline button action model.

D-446 extends `test:business-desk` to protect `/business` safe next-read hints and to ensure urgency guidance does not suggest unsafe queue, publish, Shopier confirm, or ad-launch commands.

D-447 extends `test:funnel-desk` to protect `/funnel` safe next-read hints and to ensure funnel guidance does not suggest unsafe queue, publish, Shopier confirm, or ad-launch commands.

D-448 extends `test:ad-readiness` to protect `/adready` safe next-read hints and to ensure ad-readiness guidance does not suggest unsafe Shopier confirm, ad launch, queue, publish, Pixel/CAPI, provider, or spend commands.

D-449 extends `test:operator-smoke-plan` to protect the current smoke-plan boundary label, so the operator-facing checklist does not lag behind the local D-448+ handoff state.

D-452 extends the same ad-readiness guidance so review/ready products point operators to `npm run test:storefront-trust` before `/adpack` or manual paid traffic, and updates the `/smokeplan` title to the current `Operator Live Smoke Plan (D-389/D-452)` boundary.

D-450 extends `test:retired-channels` to cover `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md`, blocking Dolap/Threads from being described as scaffolded, planned, active, future development, or remaining-channel work in session-start handoffs.

## Phase 8: Ads And Growth

Goal: support ads manually first, automate later.

Deliverables:

- Campaign readiness checklist.
- Ad copy generator for active products.
- UTM builder.
- Product/ad safety check.
- Manual performance report.
- Later: Meta Pixel, CAPI, Ads API.

Acceptance:

- We can choose an ad product confidently.
- No autonomous ad spend until tracking is reliable.

Current status (2026-07-16): deferred, with safer manual-support tooling in place for later operator-approved work. Ads are paused until catalog depth and image quality are strong. Manual ad helpers now include the UTM builder, Telegram `/adready`, Telegram `/adpack <sn-or-id> [campaign]`, Telegram `/adreport [today|week|month]`, read-only `smoke:ad-readiness:read`, read-only `smoke:ad-performance:read`, local `test:ad-launch-pack`, local `test:ad-performance`, local `test:storefront-trust`, local `test:inquiry-guard`, local `test:attribution`, and local `test:sitemap-entries`. D-432 aligns `/smokeplan` so ad readiness and ad performance evidence runs after lead visibility and before Shopier queue preflights, while still excluding `/adpack`, campaign launch, pixels, CAPI, ad-platform APIs, and ad spend from the live-smoke checklist. D-433 adds the storefront trust check before ad readiness so fake reviews and placeholder testimonial copy stay out of paid-traffic prep. D-451 extends that trust guard to buyer-facing PDP conversion essentials. D-452 makes `/adready` review/ready output point to `npm run test:storefront-trust` before `/adpack` or manual paid traffic. D-434 adds the inquiry guard check after storefront trust and before ad readiness so honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior are part of paid-traffic prep. D-435 adds the attribution check after inquiry guard and before ad readiness so first-touch UTM/referrer capture and lead-submit attribution merge behavior are part of paid-traffic prep. D-436 adds the sitemap check after attribution and before ad readiness so static route, website-visible product, and blog sitemap/degrade-safe behavior are part of paid-traffic prep. `/adpack` produces operator-review copy drafts and Meta paid-social UTM links only when hard blockers are clear; `/adreport` summarizes UTM-tagged Payload leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders. Neither command creates campaigns, posts, pixels, provider calls, Shopier calls, external API calls, or ad spend.

## Phase 9: Deployment And Ops

Goal: reduce production chaos.

Deliverables:

- Deploy checklist.
- Env var map.
- Webhook health checklist.
- Vercel cron/job runner checks.
- Hermes/operator health checks, plus optional OpenClaw/n8n VPS checks only when those systems are explicitly in scope.
- Rollback guide.
- GitHub PR workflow.

Acceptance:

- Deploy, verify, diagnose, and rollback steps are clear.

Current status: Phase 9 guardrails are active. `project-control/DEPLOYMENT_OPS_RUNBOOK.md` covers deploy, rollback, env-var, webhook-health, cron/job-runner, D-355 DB drift, n8n optionality, SupplierScout dormancy, retired-channel, source-pack, and GitHub PR workflow rules. D-397 adds `project-control/LOCAL_RELEASE_CANDIDATE.md` as the local not-committed/not-deployed handoff boundary for D-380-D-406, including the latest validation boundary, source-pack count, and operator approval requirements before commit, PR, deploy, live smoke, Shopier/provider action, optional OpenClaw sync, or ad work. D-398 adds `project-control/LOCAL_PR_REVIEW_PACKAGE.md` as the local PR/review note package for the same stack. D-401 retains optional OpenClaw VPS verification-first guardrails for explicit reactivation only. D-402 adds historical soak-script quarantine governance. D-403 adds provider reality audit governance. D-404 adds image regeneration plan governance through `test:image-regeneration-plan` and `/smokeplan` discoverability. D-405 adds `smoke:image-plan:read` and inserts it into `/smokeplan` before Telegram `/imageplan`. D-406 aligns `smoke:shopier:read` with Telegram `/shopier dashboard` batch review rows. D-426 aligns `/smokeplan` with the D-425 load-plan handoff by moving worklist-selected product-flow checks before provider diagnostics. D-430 aligns `/smokeplan` with D-428/D-429 Shopier row handoffs by adding a dedicated operator hold before any Shopier confirm action. D-431 adds the credential/webhook readiness hold before final Shopier queue approval. D-441 adds preview-level credential holds to Shopier publish-ready/retry previews and runtime smoke output. Covered by `test:ops-runbook`, `test:local-release-candidate`, `test:local-pr-review`, `test:soak-scripts`, `test:provider-reality`, `test:image-regeneration-plan`, `test:runtime-smokes`, `test:shopier-publish-control`, and `test:operator-smoke-plan`; standalone `test:openclaw-vps-verification` remains for optional OpenClaw reactivation review.

## Phase 10: Catalog Scale-Up / Product Loading Factory (CURRENT PRIMARY FOCUS, 2026-06-27)

Goal: scale from a small working storefront into a reliable product-loading system for hundreds of shoe products, with consistent studio-quality images, strong product QA, category coverage, and controlled publishing. Ads are deferred to D-380+.

### D-352 — Product Loading Factory Audit

Audit the current Telegram/admin product upload flow and find bottlenecks before scaling.
Questions: where products enter (Telegram vs admin), time from photo to active listing, most-often-missing fields, which steps need humans, which can be automated, and whether the flow can support 30–50 products/day.
Flow to audit: photo -> title -> category -> description -> size/stock -> price -> image generation -> QA -> publish.

Current status (2026-07-16): D-352A code-evidence audit complete. Result: safe enough for controlled single-product or small-batch loading, but not ready for sustained 30-50 products/day until D-356 is live-smoked and retry/error visibility is proven in operator use. D-355 structured Image QC is implemented. D-356A has a guarded Shopier/Web queue path, first-pass error triage, safe retry preview/confirm, and read-only `/shopier dashboard` visibility. D-356B adds a read-only Payload admin Shopier Queue Gate for the current product. D-387 adds `/loadplan`, a read-only daily loading/fix plan that combines Catalog QA and Category Fill for operator prioritization. D-399 extends `/loadplan` and `smoke:load-plan:read` with a first product worklist: product ref, title, priority, reasons, and suggested manual command for the next catalog fixes. D-425 adds `/productflow <ref>` beside each worklist action, D-426 makes `/smokeplan` run that worklist-selected product-flow preflight before provider diagnostics, and D-427 adds the exact repo-side `smoke:product-flow:read -- --product=<ref> --confirm-read-only` command beside the same worklist action. D-400 extends `/shopier dashboard` with a read-only batch review sample so operators can see ready/blocked/queued/synced product examples before deciding whether a broader admin batch review surface is still needed. D-428 adds `/productflow <ref>` and exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs to those Shopier dashboard sample rows before queue decisions. D-429 adds the same product-flow handoffs to `/shopier publish-ready` and `/shopier retry-errors` preview rows, while keeping confirm queue/retry actions credential-gated. D-440 adds admin/PDP operator links to those preview/dashboard rows with public PDP links limited to public products. D-441 adds preview-level credential holds so publish-ready/retry previews and `smoke:shopier:read` show whether `SHOPIER_PAT` is configured before confirm commands without blocking preview or printing secrets. D-430 adds the same handoff discipline to `/smokeplan` with a dedicated operator hold before any Shopier confirm action, and D-431 adds the credential/webhook readiness hold before final queue approval. Full note: `project-control/D-352A_PRODUCT_LOADING_FACTORY_AUDIT.md`; source-pack summary: `18_D352_PRODUCT_LOADING_FACTORY_AUDIT.md`.

### D-353 — Bulk Product QA Dashboard

Create visibility for product completeness at scale.
Metrics: active, draft, missing price, missing category, missing image, missing size/stock, missing slug/publish-readiness, Shopier-ready, brand-safety blocked, image-QC pending, publish-ready.

Current status (2026-06-28): implemented as a read-only catalog QA layer. Code: `src/lib/catalogQa.ts` and `src/lib/catalogQa.test.ts`; operator command: `/catalogqa [limit]`; validation script: `npm run test:catalog-qa` included in `test:safe`. It reports raw status, derived lifecycle, source/category distribution, missing price/category/media/stock/stock-number/slug/targets, readiness blockers, image-QC pending/rejected, content/audit pending, Shopier queue/error/sync state, brand-safety blocks, draft age, and last updated time. It does not mutate, publish, retry, or spend.

### D-354 — Category Fill Strategy

Plan category depth before ads. Known underfilled: SPOR, GÜNLÜK, BOT, TERLİK, CÜZDAN.
Initial depth targets: classic/loafer 40–60; sneaker/sport 30–50; daily 30–50; boots/winter seasonal; slippers seasonal; wallets optional/lower priority.

Current status (2026-06-28): implemented as a read-only category-depth strategy layer. Code: `src/lib/categoryFill.ts` and `src/lib/categoryFill.test.ts`; operator command: `/categoryfill [limit]`; validation script: `npm run test:category-fill` included in `test:safe`. It reports active, publish-ready, blocked backlog, sold-out, target gaps, and next load order for active planning categories. Planning baselines: Klasik 40-60, Spor 30-50, Günlük 30-50, Bot 10-25 seasonal, Terlik 8-20 seasonal, Cüzdan optional 0-15. Legacy/unknown categories are surfaced but not treated as active fill targets.

### D-355 — Product Image Quality Gate

Prevent AI images from inventing defects (tears, cracks, peeling, damaged texture, deformed toe/heel, wrong stitching, fake stains, distorted sole join, color drift, invented logos).
QC states: PASS (publishable), REVIEW (human review), FAIL (regenerate/reject). Full defect checklist and standards live in `09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`.

Current status (2026-07-06): implemented as a structured product-level gate plus a read-only regeneration planning bridge. Code: `src/lib/imageQualityGate.ts`, `src/lib/imageQualityGate.test.ts`, `src/lib/imageRegenerationPlan.ts`, `src/lib/imageRegenerationPlan.test.ts`, and `scripts/image-plan-runtime-smoke.ts`; schema: `Products.imageQuality`; operator surfaces: Payload admin ReviewPanel, Telegram `/imageqc`, Telegram `/imageplan <sn-or-id>`, and Telegram `/regenplan <sn-or-id>`; validation scripts: `npm run test:image-quality`, `npm run test:image-regeneration-plan`, and `npm run test:runtime-smokes`; runtime smoke: `npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only`. Generated/AI images require explicit QC PASS before publish readiness, activation, or ad readiness. Original-only product media can pass without generated-image QC. `/imageqc` writes only QC metadata/workflow visual state; `/imageplan`, `/regenplan`, and `smoke:image-plan:read` are read-only and suggest safe next manual commands. No external publish, dispatch, retry, provider queue, provider call, Shopier call, SupplierScout activation, retired-channel activation, schema push, or ad action is performed by these commands.

### D-355A — Multi-Angle Product Reference Standard

Treat multiple photos of one shoe as the SAME product from different angles, not different products. Reference depth by risk: low 1–2 angles; medium side+back; high side+back+front/top; premium adds detail close-up. The required prompt concept is recorded in 09.

### D-355B — 5-Image Studio Pack Standard

Move from 3 to 5 generated studio images: hero side profile, pair composition, front/top angle, back/heel view, material/craft detail OR outsole. Defaults: image 4 = back/heel, image 5 = detail close-up (outsole may suit sneaker/bot).

### D-355C — Background Lock Standardization

Single background: soft warm ivory seamless studio. Same tone across all 5 images, no grey/yellow/pink drift, consistent lighting/shadow/crop/scale, product ~74–80% of the frame, one coherent studio set.

### D-356 — Shopier/Web Publish Batch Control

Before hundreds of products go live, ensure incomplete/low-quality products cannot publish: active website visibility, Shopier queue readiness, missing-image block, missing price/category block, brand-safety hard block, channel target clarity, batch publish/retry safety. Builds on the existing activation guard (`productActivationGuard` / `publishReadiness`).

Current status (2026-07-16): first guard, read-only operator dashboard, first-pass error triage, safe retry preview/confirm, per-product admin visibility, read-only dashboard batch review sample, read-only runtime smoke support, read-only Product Flow Snapshot smoke, read-only Image QC schema checking, a guarded D-355 SQL repair helper, and D-386 Shopier command governance implemented locally. Code: `src/lib/shopierPublishControl.ts`, `src/lib/shopierPublishControl.test.ts`, `scripts/shopier-command-governance.ts`, `src/lib/productFlowSnapshot.ts`, `scripts/product-flow-runtime-smoke.ts`, `src/components/admin/ReviewPanel.tsx`, `scripts/shopier-operator-smoke.ts`, `scripts/image-qc-schema-check.ts`, `scripts/image-qc-schema-apply.ts`, and `scripts/sql/d355-image-qc-schema.sql`; Telegram surfaces: `/productflow`, `/flow`, `/shopier dashboard`, `/shopier publish`, `/shopier republish`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors`; admin surface: ReviewPanel read-only Shopier Queue Gate for the current product; smoke commands: `npm run smoke:imageqc:schema -- --confirm-read-only`, `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`, and `npm run smoke:shopier:read -- --confirm-read-only`. D-406 now makes `smoke:shopier:read` pass `buildShopierDashboardReviewRows()` into the same dashboard formatter as Telegram `/shopier dashboard`, so the repo-side preview includes ready/blocked/queued/synced sample rows. D-428 adds `flowCommand` and `runtimeFlowCommand` to those rows, so Telegram and repo-side Shopier dashboard samples show `/productflow <ref>` plus exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` before queue decisions. D-429 adds the same handoffs to `/shopier publish-ready` and `/shopier retry-errors` preview rows, and Telegram previews now render without `SHOPIER_PAT` while `confirm` remains blocked without credentials. D-440 adds deterministic admin/PDP operator links to dashboard/publish-ready/retry preview rows, with PDP links limited to public product statuses and confirmed output free of preview-only links. D-441 adds preview-level credential holds to publish-ready/retry previews and `smoke:shopier:read`, showing whether `SHOPIER_PAT` is configured before confirm commands without printing secrets or blocking preview. D-430 updates `/smokeplan` so the live-smoke checklist pauses on those Shopier row handoffs before any confirm action. D-431 adds a second `/smokeplan` hold to verify `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness outside chat before final queue approval. D-355 schema now passes read-only verification. `/shopier dashboard` combines publish-ready counts, top blocker groups, sample ready/blocked/queued/synced product rows, product-flow handoffs, error classes, and safe retry counts without mutation. Batch `/shopier publish-ready` is preview-first and requires `/shopier publish-ready confirm` to queue jobs. Single-product `/shopier publish` and `/shopier republish` now rely only on `queueShopierSync()` after product identifier resolution; `test:shopier-commands` blocks direct Telegram route-level `shopier-sync` job writes. The shared gate requires active website visibility, slug, explicit Shopier target/flag alignment, category, generated-gallery media, Image QC PASS, sellable stock, brand-safety pass, central publish readiness, and no duplicate queued/syncing Shopier job. Latest read-only smokes completed: product `359` product-flow snapshot reports Image QC review and X credits-depleted as the next operator issues; Shopier read-only preview found 0 new publish candidates, 0 sync errors, and `SHOPIER_PAT configured: no`. Still needed: live-smoke Telegram commands with the operator present, configure/verify Shopier credentials before confirm queueing, then decide whether the read-only Telegram batch review sample is enough or a broader Payload admin batch review surface is still needed.

### D-387 - Product Loading Plan

Before scaling product intake, operators need one "what should I do today?" view. D-387 adds `src/lib/productLoadingPlan.ts`, `src/lib/productLoadingPlan.test.ts`, package script `test:loading-plan`, and Telegram `/loadplan [limit]` plus `/loadingplan [limit]`. It composes D-353 Catalog QA and D-354 Category Fill into prioritized read-only actions: brand-safety cleanup, Image QC review/regeneration, Shopier error triage, category load gaps, backlog finishing, catalog completeness gaps, stale drafts, or live-smoke next steps. Guardrails: own-products-only, no SupplierScout activation, no Dolap/Threads, no product writes, no publish, no Shopier queue, no provider calls, and no ads. Local validation passed.

### D-388 - Load Plan Runtime Smoke

D-388 adds `scripts/load-plan-runtime-smoke.ts` and package script `smoke:load-plan:read`. It mirrors Telegram `/loadplan` through `buildProductLoadingPlan()` against real Payload products only after `--confirm-read-only`, forces `PAYLOAD_DB_PUSH=false`, and refuses mutation/publish/queue/provider/Shopier/SupplierScout/ad-spend flags. It prints loading actions, category load order, readiness, Image QC, Shopier error, brand-safety, and stale-draft counts. No live read-only run has been performed yet; run only with operator approval.

### D-399 - Loading Plan First Product Worklist

D-399 extends the D-387/D-388 loading plan with a read-only first product worklist. `/loadplan` and `smoke:load-plan:read` now show up to five product refs/titles with priority, fix reasons, and suggested existing manual commands such as `/productflow <sn-or-id>`, `/imageqc <sn-or-id>`, or `/shopier errors`. The worklist is derived from the same Payload sample as Catalog QA and Category Fill, and it does not write products, publish, queue Shopier jobs, call providers, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan`.

### D-425 - Loading Plan Product Flow Handoff

D-425 extends the D-399 worklist with an explicit read-only `flowCommand`. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show `/productflow <ref>` beside the suggested fix command, so daily catalog loading flows through the D-424 primary operator step before manual follow-up. It does not write products, publish, queue Shopier jobs, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan`.

### D-426 - Operator Smoke Plan Load-Plan Handoff Alignment

D-426 aligns `/smokeplan` with D-425. The operator smoke plan now runs the worklist-selected `smoke:product-flow:read` and Telegram `/productflow <id-or-sn>` checks immediately after repo/Telegram `/loadplan`, and before provider diagnostics. This keeps the first live-smoke product preflight tied to the daily loading worklist and the D-424 primary operator step. It does not write products, publish, queue jobs, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:operator-smoke-plan`.

### D-427 - Loading Plan Runtime Product Flow Handoff

D-427 extends D-425 with an exact repo-side preflight command. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` worklist rows now show both Telegram `/productflow <ref>` and `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only`, so terminal and Telegram operators verify the same selected product before manual fixes. It does not write products, publish, queue jobs, redispatch, call providers, call Shopier, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:loading-plan` and `test:runtime-smokes`.

### D-400 - Shopier Dashboard Batch Review Sample

D-400 extends `/shopier dashboard` with a read-only batch review sample built from the same shared Shopier/Web evaluator used by `/shopier publish-ready`, `/shopier retry-errors`, `/shopier publish`, `/shopier republish`, and the Payload admin per-product gate. The dashboard now shows sample ready/blocked/queued/synced rows with product ref, title, detail/blocker, and suggested manual command such as `/shopier publish-ready`, `/imageqc <sn-or-id>`, or `/productflow <sn-or-id>`. It does not publish, queue Shopier jobs, call Shopier, call providers, activate SupplierScout, revive retired channels, or spend on ads. Covered by `test:shopier-publish-control`.

### D-406 - Shopier Runtime Smoke Batch Review Alignment

D-406 aligns `scripts/shopier-operator-smoke.ts` with Telegram `/shopier dashboard`. The runtime smoke now calls `buildShopierDashboardReviewRows(publishEvaluations)` and passes `reviewRows` to `formatShopierOperatorDashboard()`, so operator-run `npm run smoke:shopier:read -- --confirm-read-only` shows the same batch review sample rows before any live Telegram smoke. It remains read-only: no product writes, no Shopier job queueing, no Shopier API calls, no provider calls, no dispatch, no SupplierScout activation, no retired-channel activation, no ad spend, and no schema push. Covered by `test:runtime-smokes`.

### D-428 - Shopier Dashboard Product Flow Handoff

D-428 extends the `/shopier dashboard` and `smoke:shopier:read` batch review rows with the same product-flow preflight discipline used by D-427. Each ready/blocked/queued/synced sample row now shows its existing next action, `/productflow <ref>`, and exact repo command `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only`, so operators inspect the product-flow snapshot before queueing publish-ready products or retrying Shopier work. It remains read-only: no product writes, no queue jobs, no publishing, no redispatch, no provider calls, no Shopier calls, no SupplierScout activation, no retired-channel activation, and no ad spend. Covered by `test:shopier-publish-control` and `test:runtime-smokes`.

### D-429 - Shopier Preview Product Flow Handoff

D-429 extends `/shopier publish-ready` and `/shopier retry-errors` previews with the same product-flow preflight handoffs. Ready/safe and blocked sample rows now show `/productflow <ref>` plus exact repo command `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` before the operator runs a confirm command. Telegram previews can render without `SHOPIER_PAT`; only `/shopier publish-ready confirm` and `/shopier retry-errors confirm` remain blocked when `SHOPIER_PAT` is missing. It remains read-only by default: no product writes, no queue jobs outside explicit confirm, no publishing, no redispatch, no provider calls, no direct Shopier calls, no SupplierScout activation, no retired-channel activation, and no ad spend. Covered by `test:shopier-publish-control` and `test:shopier-commands`.

### D-430 - Operator Smoke-Plan Shopier Handoff Alignment

D-430 aligns `/smokeplan` with the D-428/D-429 Shopier row handoffs. After Shopier dashboard/publish-ready/error/retry preview reads, the plan now adds an operator hold telling the operator to use the row-provided `/productflow <ref>` and exact repo command `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` before any Shopier confirm action. It remains read-only: no product writes, no queue jobs, no publishing, no redispatch, no provider calls, no Shopier calls, no SupplierScout activation, no retired-channel activation, and no ad spend. Covered by `test:operator-smoke-plan`.

### D-431 - Operator Smoke-Plan Shopier Credential Hold

D-431 adds the next `/smokeplan` hold after the Shopier row product-flow handoffs and before the final queue/publish approval hold. The plan tells the operator to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action. It remains read-only: no secret reads, product writes, queue jobs, publishing, redispatch, provider calls, Shopier calls, SupplierScout activation, retired-channel activation, or ad spend. Covered by `test:operator-smoke-plan`.

### D-401 - Optional OpenClaw VPS Verification Guardrail

D-401 adds a read-only OpenClaw VPS verification checklist at `mentix-skills/OPENCLAW_VPS_VERIFICATION.md`, updates the deployment sync checklist and installation matrix, and adds standalone `npm run test:openclaw-vps-verification`. Repo-side skill files are expected state/history, not proof that VPS OpenClaw is synced, loaded, or live. Because Hermes is now the current agent-control layer, this checklist is optional/historical unless the operator explicitly reactivates OpenClaw. Before any optional copy, restart, or live Telegram/OpenClaw prompt, the operator must record VPS skill-directory evidence, log evidence, and read-only prompt evidence. It performs no VPS command, sync, restart, live prompt, provider call, Shopier call, queue write, SupplierScout activation, retired-channel activation, or ad action by itself.

### D-402 - Historical Soak-Script Quarantine

D-402 documents old `scripts/d*-soak*.ts` files in `project-control/HISTORICAL_SOAK_SCRIPTS.md` and adds `npm run test:soak-scripts`. These scripts are historical live-data soak harnesses, not normal validation and not read-only runtime smokes. The governance check keeps them out of package scripts, `validate`, and the read-only smoke inventory while preserving them as historical evidence. It performs no soak run, live data connection, write, provider call, Shopier call, queue write, SupplierScout activation, retired-channel activation, or ad action.

### D-403 - Provider Reality Audit

D-403 adds `project-control/PROVIDER_REALITY_AUDIT.md` and `npm run test:provider-reality`. It records that local env readiness is not production provider readiness for Website, Instagram, Facebook, X, Shopier, Gemini, Google Vision, DataForSEO, SerpAPI, reverse-search selection, and n8n fallback webhooks. The audit performs no env load, secret print, provider call, credit spend, queue write, publish, live Telegram action, Shopier action, SupplierScout activation, retired-channel activation, or ad action. Production provider reality remains unproven until the operator records current production env/account/quota/permission evidence without exposing secrets.

### D-389 - Operator Live Smoke Plan

D-389 adds `src/lib/operatorSmokePlan.ts`, `src/lib/operatorSmokePlan.test.ts`, package script `test:operator-smoke-plan`, and Telegram `/smokeplan`. The command is a pure read-only checklist: it orders the safe repo smokes and Telegram reads for `/loadplan`, worklist-selected `/productflow`, `/diagnostics`, `/business`, `/funnel`, and Shopier dashboards before any queueing, publishing, redispatch, provider spend, Shopier API action, or ad work. D-426 keeps the D-425 load-plan flow handoff before provider diagnostics, D-430 adds the Shopier row product-flow handoff hold before any Shopier confirm action, and D-431 adds the Shopier credential/webhook readiness hold before final queue approval. Local validation passed; live smokes still require operator approval.

### D-357 — SEO/GEO Blog & Product Comparison Automation

After catalog scale begins, use product data for SEO/GEO and comparison content. Operator approval required; no automatic external publishing; no risky or hallucinated authenticity/material/origin claims.

Current status (2026-07-05): preflight provider visibility added. `npm run test:pi-provider-health` and `npm run smoke:pi-provider-health:read -- --confirm-read-only` make Gemini/reverse-search capability visible before running `#geohazirla`, GeoBot content generation, or comparison drafts. D-403 adds `npm run test:provider-reality` and `project-control/PROVIDER_REALITY_AUDIT.md` so local env readiness is not production provider readiness. These checks do not call providers or spend credits; actual SEO/GEO generation remains operator-controlled.

### D-380+ — First Controlled Ad Test (earliest ad phase)

Paid ads are deferred until catalog depth and image quality are strong. Do NOT start Meta ads, Pixel, CAPI, Ads API, autonomous ad spend, or budget automation before then. Ads become relevant only after: a large enough catalog, category balance, product image QC, stable lead capture, stable UTM/admin readback, and enough publish-ready products. This supersedes the earlier Phase 8 framing as the next ad step.

Current supporting tooling: when ads are eventually reconsidered, run `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` before treating a product as a paid-traffic candidate, then use `/adpack <sn-or-id> [campaign]` only as an operator-reviewed draft pack. Latest product `359` run on 2026-07-02 blocked manual ads until generated-image QC PASS is recorded.

### D-432 - Operator Smoke-Plan Manual Ad Preflight Alignment

Local-only and read-only. `/smokeplan` now runs `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` after lead visibility and before Shopier queue preflights. This gives the operator product-readiness and Payload UTM/order evidence before any manual paid-traffic decision without launching ads, creating campaigns/posts/pixels, calling ad-platform APIs, calling providers, calling Shopier, queueing jobs, or spending.

### D-433 - Operator Smoke-Plan Storefront Trust Preflight

Local-only and read-only. `/smokeplan` now runs `npm run test:storefront-trust` after lead visibility and before `smoke:ad-readiness:read`. This keeps production storefront trust guardrails, especially no fake reviews and no placeholder testimonial copy, in the paid-traffic preflight sequence without writing products, mutating leads/orders, queueing jobs, publishing, calling providers, calling Shopier, calling ad-platform APIs, creating campaigns/posts/pixels, or spending.

### D-451 - PDP Conversion Trust Guardrail

Local-only and read-only. `npm run test:storefront-trust` now also pins buyer-facing PDP conversion essentials before paid traffic: draft products stay hidden, `ProductImages` remains mounted, size/stock clarity stays variant-backed through `SizeChip` and `OOSChip`, `ContactForm` keeps product/sold-out context, WhatsApp and Shopier CTAs stay present and safely gated, process FAQ fallback remains, and similar products stay active-status plus merchandising gated. This performs no build, DB read, network call, product write, lead write, Shopier/provider/ad-platform call, campaign/post/pixel creation, SupplierScout activation, retired-channel activation, or ad spend.

### D-452 - Ad-Readiness Storefront Trust Hint

Local-only and read-only. `/adready` now points review/ready products to `npm run test:storefront-trust` before `/adpack <ref> manual_ads` or `/adreport week`, so D-451 PDP conversion/trust guardrails stay visible at the manual paid-traffic decision point. Blocked products still point to `/productflow <ref>` and `/imageplan <ref>` diagnostics first. `/smokeplan` now renders `Operator Live Smoke Plan (D-389/D-452)`. This performs no product write, lead/order mutation, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

### D-453 - Source-Pack Latest-Boundary Guardrail

Local-only governance. `test:source-pack` now checks that the ChatGPT Project source pack carries D-453 as the latest local boundary, keeps the D-452 `/smokeplan` title boundary explicit, describes the D-380-D-406 plus D-422-D-453 release/PR stack, and rejects stale current-D-449 or D-422-D-451 stack wording in next-sprint notes. This performs no runtime behavior change, product write, lead/order mutation, queue job, publish, dispatch, provider call, Shopier call, ad-platform API call, campaign/post/pixel creation, Pixel/CAPI action, SupplierScout activation, retired-channel activation, or ad spend.

### D-454 - Loading-Plan Batch Summary

Local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show a batch summary before product rows: total worklist candidates, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first exact repo-side `smoke:product-flow:read` command. This makes the daily catalog-loading loop easier to execute from the first screen without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending on ads.

### D-455 - Loading-Plan Batch Focus

Local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now show a deterministic batch focus before product rows: bottleneck kind, operator label, reason, and next safe read derived from the first product worklist. This tells the operator whether to start with brand safety, Image QC, Shopier errors, core product fields, stale drafts, backlog, or `/smokeplan` without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending on ads.

### D-456 - Loading-Plan Focus Queue

Local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add focus refs and a short focus queue of matching safe read commands for the D-455 bottleneck. This lets the operator act on the top affected products for the chosen focus without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending on ads.

### D-457 - Loading-Plan Focus Details

Local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add reason details beside each focus-queue command, so operators can see why each queued product matches the D-455/D-456 focus. This improves daily catalog execution without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending on ads.

### D-458 - Product-Flow Checklist Summary

Local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now add a compact checklist summary with done/next/blocked/needs-work counts before the full staged checklist. This helps operators judge whether a product is nearly ready, blocked, or still missing core work without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, syncing optional OpenClaw, or spending on ads.

### D-459 - Product-Flow Dispatch Summary

Local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now add a compact active-channel dispatch summary with published/queued/failed/blocked/not-configured/unrecorded counts before the full dispatch rows. This helps operators judge publishing health and channel failure pressure faster without writing products, queueing jobs, publishing, redispatching, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, syncing optional OpenClaw, or spending on ads.

### D-460 - Product-Flow Dispatch Recovery Paths

Local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now add a deterministic next operator action directly to each non-published active-channel dispatch row. This keeps the recorded state and reason with its recovery path: queued Shopier points to `/shopier dashboard`, ready-but-unrecorded Shopier points to the shared guarded publish command, provider/configuration rows point to diagnostics, and failed redispatchable channels only suggest retry after the recorded cause is fixed. The snapshot never executes those commands or writes products, queues jobs, publishes, redispatches, calls providers or Shopier, activates SupplierScout, revives retired channels, syncs optional OpenClaw, or spends on ads.

### D-461 - Control-Truth Memory Lock Reconciliation

Local-only control-center hardening. Both session-start Memory Lock files now describe the actual current operating architecture rather than the historical Telegram-to-OpenClaw-to-n8n pipeline: Payload/Next executes commerce workflows, Hermes is current for agent control, OpenClaw is historical/optional, direct Payload/Next is the n8n-default path, SupplierScout is dormant, and Dolap/Threads remain retired. `test:retired-channels` rejects stale current-agent/current-workflow claims; `test:n8n-optional` and `test:mentix-skills` retain the optionality and skill-layer boundaries. No VPS, webhook, provider, Shopier, n8n, OpenClaw, SupplierScout, retired-channel, or ad action is performed.

### D-462 - BlogPosts Featured-Image Schema Drift Repair

Phase 1 schema hygiene. A local build found that `BlogPosts.featuredImage -> media` is declared in Payload while the configured database lacked `blog_posts.featured_image_id`, so the sitemap deliberately omitted only blog URLs rather than failing. The separately approved 2026-07-24 migration added the nullable integer relationship column, exact `ON DELETE SET NULL` foreign key, and supporting index. The post-apply metadata check passes, and the following build completes without the prior fallback. `npm run db:blog-featured-image:apply` still prints a dry-run by default; any confirmed apply in another environment requires both `--apply --confirm-apply-d462-blog-featured-image-schema` and explicit operator approval.

### D-463 - Mentix Skill Runtime-Truth Reconciliation

Local-only Phase 3 control-layer hardening. The `mentix-skills` library, activation configuration, and dashboard now distinguish the current Hermes/Mentix operator layer from optional historical OpenClaw templates. Product debugging remains read-only, upload and research skills produce operator-reviewed drafts, backend advice cannot imply schema deployment, and agent memory records only durable PII-light decisions in the repo control center/source pack. `test:mentix-skills` protects the boundary. No OpenClaw VPS sync, restart, live prompt, n8n workflow, provider call, Shopier action, dispatch, or ad action is performed.

### D-464 - Homepage Merchandising Rail Wiring

Local-only Phase 6 conversion correction. `src/app/(app)/page.tsx` already resolved eligible `yeni`, `popular`, `bestSellers`, `deals`, and `discounted` memberships, but only the new-arrivals rail consumed that output. `UygunApp.jsx` now maps the curated IDs into the Editor Picks, Best Sellers, Deals, and Discounts rails; curated labels no longer use arbitrary catalog slices. `test:merchandising` checks selection behavior and `test:homepage-merchandising` checks the server-to-client handoff. This runs only local assertions and does not access Payload, publish, dispatch, call providers or Shopier, activate SupplierScout, revive retired channels, or spend on ads.

### D-465 - Obsidian Control-Center Alignment

Local-only Phase 0 control correction. The existing root vault notes were stale, including an OpenClaw-current claim from June. `00_HOME.md` through `04_ACTIVE_DECISIONS.md` are now a compact Obsidian control center for current architecture, roadmap, bot ownership, active decisions, and approval gates. `test:obsidian-control` protects those notes, and `test:story-dispatch` is restored to `test:safe` to retain story brand-safety coverage. This performs no Payload read/write, provider call, Telegram action, Shopier action, n8n run, OpenClaw sync, deployment, or ad action.

### D-466 - Protected-Brand Remediation Plan

Local-only Phase 10 catalog scale-up improvement. `/brandplan [limit]` and `smoke:brand-safety:read` turn the catalog's protected-brand count into a review queue grouped by severity and detected brand, with matched fields, safe `/productflow <ref>` handoffs, and admin/PDP links under the same public-status discipline. It is deliberately not an automatic cleanup tool: text may be rewritten only after an operator confirms the product is an unbranded own product; it never rewrites text, retires, activates, publishes, redispatches, calls providers or Shopier, spends on ads, activates SupplierScout, revives Dolap/Threads, or pushes schema. `test:brand-safety-plan`, `test:operator-smoke-plan`, and `test:runtime-smokes` cover the boundary.

### D-467 - Protected-Brand Manual Activation Hard Gate

Local-only Phase 2/4 safety correction. A manual Publish Desk review override may still cover generic Image QC/audit review cases, but no longer bypasses a protected-brand match. `approveAndActivateProduct()` now rejects that state before a Payload update, and `Products.beforeChange` independently rejects an active transition even when `manualPublishOverride` is supplied. This preserves the own-products-only policy: keep the product excluded unless an operator first confirms it is unbranded and corrects its stored wording. `test:publish-desk` and `test:activation-guard` cover both paths. No product content/status changed, no dispatch or provider/Shopier call occurred, and no schema change is required.

### D-468 - Product Workflow Golden Path

Local-only Phase 2 regression proof. `test:product-workflow` composes the existing Telegram target normalization, channel intent normalization, central readiness, lifecycle, activation guard, and protected-brand safety helpers into one no-database clean-own-product path. It proves retired targets are dropped, a clean original-media product progresses from review to `publish_ready`, activation defaults become coherent, and a protected-brand product stays blocked even when manual override intent is supplied. The test runs in `test:safe`; it does not create product records, call Telegram/providers/Shopier, queue jobs, publish, dispatch, or change schema.

### D-469 - Turbopack Workspace-Root Pin

Local-only Phase 1 build hygiene. `next.config.ts` now pins `turbopack.root` to this repository's absolute root, preventing Next from selecting the unrelated parent `C:\\Users\\W11\\package-lock.json` when the project already has its own lockfile. `npm run build` passes without the former workspace-root warning. This changes only local build workspace discovery; it does not change routes, Payload data/schema, providers, Telegram, Shopier, n8n, OpenClaw, or channel dispatch.

### D-470 - Product Flow Action-ID Handoff

Local-only Phase 2 operator reliability correction. Product Flow Snapshot keeps `ref` as the friendly stock number but derives `commandRef` from the numeric Payload product ID whenever it exists. Its generated confirmation, content, audit, activation, Shopier, image, repair, and redispatch commands now use that actionable ID. This closes the mismatch where `/productflow SN0901` could suggest `/confirm SN0901` to a legacy command that parses only numbers. The runtime smoke prints `commandRef`; `test:product-flow-snapshot` and `test:runtime-smokes` cover the handoff. No Payload write, provider, Telegram, Shopier, n8n, OpenClaw, or channel action is performed.

### D-471 - Public Storefront Safety Gate

Local-only Phase 6 storefront safety correction. The shared merchandising gate now rejects placeholder intake/test titles (`Taslak`, `Draft`, `Test`, `Demo`, `Ornek`) and protected-brand matches before public presentation. Homepage rails and related-product cards use it already; direct PDP rendering, page metadata, and sitemap product URLs now use the same gate. This protects visitors and indexing from legacy records that became active before the current activation hard gate, without changing product data, retiring products, publishing, dispatching, calling providers/Shopier, or spending. `test:merchandising` and `test:storefront-trust` cover the behavior.

### D-476 - Catalog Risk-First Loading-Plan Order

Local-only Phase 10 catalog-scale-up correction. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now order active protected-brand exposure ahead of draft protected-brand backlog even when the draft has more secondary blockers. Worklist rows show the product status, and `test:loading-plan` locks the exposure-first ordering. The plan remains read-only: it does not write products, publish, dispatch, queue Shopier jobs, call providers, activate SupplierScout, revive retired channels, or spend on ads.

### D-477 - Protected-Brand Provenance Review Audit

Local-only Phase 10 operator-evidence improvement. `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` is a preview-first command. Only explicit confirmation records one `brand_safety.provenance_reviewed` BotEvent for an incomplete protected-brand item. It neither edits the product nor clears brand safety, and cannot activate, publish, dispatch, queue Shopier, call providers, revive retired channels, activate SupplierScout, or spend. `/brandplan` and `smoke:brand-safety:read` read and show the latest valid review evidence; `test:brand-provenance-review` and `test:brand-provenance-command` guard parsing and route boundaries.

### D-478 - Provenance Review Delivery Idempotency

Local-only Phase 10 audit-reliability improvement. A confirmed `/brandreview` stores an opaque Telegram delivery key in its BotEvent. If the same Telegram update is retried, the helper returns the original evidence record rather than creating another one. This is not a product mutation and cannot clear brand safety, activate, publish, dispatch, queue Shopier, call providers, revive retired channels, activate SupplierScout, or spend. The existing provenance-review and route-governance tests cover the no-duplicate path.

### D-479 - Blog Editorial Preflight And First-Publication Guard

Local-only Phase 5/6 editorial safety improvement. `evaluateBlogPublishingPreflight()` is shared by the BlogPosts first-publication hook, Telegram `/blogpreflight <id-or-slug>`, and `smoke:blog-preflight:read`. It blocks incomplete, placeholder, or malformed posts before their first published transition; records `publishedAt` for a valid first publication; and preserves edits to historical published posts. AI-authored or evidence-sensitive wording remains a manual operator review item, never an automatic publish decision. The Telegram command and runtime smoke are read-only, with no provider call, spend, article write, publication, schema push, SupplierScout activation, or retired-channel activation.

### D-480 - Shopier Webhook Authenticity Fail-Closed Guard

Local-only Phase 7 security improvement. The Shopier webhook now verifies the existing documented HMAC-SHA256 scheme against the exact raw request body with a constant-time comparison and supports comma-separated token rotation. If `SHOPIER_WEBHOOK_TOKEN` is absent it returns `503`; missing, malformed, or invalid signatures return `401`. Those refusals occur before JSON parsing, order creation, stock mutation, refund handling, or Telegram notification. `test:shopier-webhook-security` joins `test:shopier-webhook-local` and `test:safe`. No live webhook or Shopier API call is made.

### D-481 - Shopier Order-ID Duplicate-Safety Guard

Phase 7 duplicate-delivery reliability improvement. `Orders.shopierOrderId`
declares a unique contract; Shopier order creation treats a PostgreSQL
duplicate-key result as an idempotent delivery and returns before stock decrement
or notification. The approved `CREATE UNIQUE INDEX CONCURRENTLY` statement
applies only to non-empty external order IDs and was applied on 2026-07-25 with
SQL fingerprint `c79810ec7a084bfc`. The post-apply
`smoke:shopier-order-id-schema:read` check passes with a present index and zero
duplicate non-empty IDs. No live Shopier webhook, provider call, dispatch, or ad
action is implied by this database evidence.

### D-482 - Shopier Order And Stock Transaction Boundary

Local-only Phase 7 reliability improvement. Shopier `order.created` now creates
the local Order and applies product/variant stock plus InventoryLog changes with
one shared Payload transaction request. Transaction setup fails closed, and a
verified event that cannot complete returns `500` so Shopier can retry. The
generic Orders notification hook skips Shopier; the webhook alert is sent only
after commit. `test:payload-transaction`, `test:shopier-order-transaction`, and
`test:shopier-webhook-local` prove the boundary without a database connection,
Shopier API call, external dispatch, or live webhook. D-481's reviewed partial
unique index is applied and post-apply verified in the configured database;
live webhook delivery still needs separate operator-approved evidence.

### D-483 - Non-Shopier Order Stock Transaction Boundary

Local-only Phase 7 integrity improvement. Non-Shopier Order creates now run
stock mutation before the generic alert and retain the parent Payload request for
product/variant stock, InventoryLog, and stock-reaction work. A missing product
or size, unknown variant, or insufficient stock throws, allowing Payload's
existing create transaction to roll back the order instead of persisting a sale
without matching inventory movement. `test:order-stock-transaction` covers
product-only and variant stock, request propagation, missing-size/unknown-stock
refusals, Shopier bypass, and the Payload create hook/commit ordering. No
database, Shopier, Telegram, provider, deployment, or live order action occurs.

### D-484 - Non-Shopier Conditional Stock Reservation

Local-only Phase 7 concurrency hardening. D-483 keeps each non-Shopier Order
create and its stock/inventory work in one parent Payload transaction. D-484
adds the missing database-level reservation condition: product stock, then the
selected variant where applicable, is updated only when `stock >= quantity`.
A concurrent request that loses the last unit receives no updated row, throws,
and rolls the parent Order create back before InventoryLog creation. The helper
fails closed when the active Payload transaction or PostgreSQL schema table is
unavailable. `test:order-stock-transaction` covers product and variant
reservation calls, zero-row refusal, missing transaction refusal, Shopier
bypass, and Payload hook/commit ordering. No database, Shopier, Telegram,
provider, deployment, or live order action occurs.

### D-485 - Shopier Atomic Floor-At-Zero Decrement

Local-only Phase 7 concurrent-stock hardening. Shopier cannot reject an
already-paid external sale merely because local stock is depleted. D-485 keeps
the D-482 webhook transaction but replaces literal stock writes with atomic
PostgreSQL floor-at-zero arithmetic for product totals and selected variants.
Concurrent distinct Shopier orders therefore accumulate depletion rather than
overwriting it and leaving a falsely high local stock value. Missing local rows
fail the webhook transaction for retry; mismatched size mapping remains the
existing skipped-item operator diagnostic. `test:shopier-order-stock`,
`test:shopier-order-transaction`, and `test:shopier-webhook-local` cover the
local boundary without a database, Shopier API call, external dispatch, or live
webhook.

### D-486 - Storefront Image Fallback And Structured Data Safety

Local-only Phase 6 storefront hardening. The public PDP now prefers usable
generated-gallery media but falls back to original product media when generated
rows are missing or unusable. The resolved gallery drives both the buyer gallery
and Product JSON-LD. Offer availability now follows the shared sellable-stock
summary rather than inferring stock from status alone, and Product/FAQ JSON-LD
is safely serialized before inline rendering. `test:product-storefront-images`,
`test:product-structured-data`, and `test:storefront-trust` cover the behavior
without a Payload read/write, provider call, Shopier call, publication,
dispatch, deployment, or ad action.

### D-487 - Shared Blog And PDP JSON-LD Serialization

Local-only Phase 5/6 rendering hardening. Inline schema markup now uses one
safe serializer for Product, FAQ, and Blog Article JSON-LD rather than raw
`JSON.stringify` at each page. Stored product or editorial content cannot close
the script tag early, while JSON parses to the original schema values.
`test:structured-data` and `test:blog-structured-data` cover the helper and
Blog integration without a Payload read/write, Blog publication, provider call,
Shopier call, dispatch, deployment, or ad action.

### D-434 - Operator Smoke-Plan Inquiry Guard Preflight

Local-only and read-only. `/smokeplan` now runs `npm run test:inquiry-guard` after `npm run test:storefront-trust` and before `smoke:ad-readiness:read`. This keeps honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback checks in the paid-traffic preflight sequence without writing products, mutating leads/orders, queueing jobs, publishing, calling providers, calling Shopier, calling ad-platform APIs, creating campaigns/posts/pixels, or spending.

### D-435 - Operator Smoke-Plan Attribution Preflight

Local-only and read-only. `/smokeplan` now runs `npm run test:attribution` after `npm run test:inquiry-guard` and before `smoke:ad-readiness:read`. This keeps first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge checks in the paid-traffic preflight sequence without writing products, mutating leads/orders, queueing jobs, publishing, calling providers, calling Shopier, calling ad-platform APIs, creating campaigns/posts/pixels, or spending.

### D-436 - Operator Smoke-Plan Sitemap Preflight

Local-only and read-only. `/smokeplan` now runs `npm run test:sitemap-entries` after `npm run test:attribution` and before `smoke:ad-readiness:read`. This keeps static route, website-visible product, and blog sitemap/degrade-safe checks in the paid-traffic preflight sequence without writing products, mutating leads/orders, queueing jobs, publishing, calling providers, calling Shopier, calling ad-platform APIs, creating campaigns/posts/pixels, or spending.

### D-437 - Operator Smoke-Plan Telegram Access Preflight

Local-only and read-only. `/smokeplan` now runs `npm run test:telegram-access` after the repo load-plan runtime smoke and before the first Telegram `/loadplan` read. This keeps private Telegram DM allowlist behavior visible before any live Telegram operator read without writing products, mutating leads/orders, queueing jobs, publishing, calling providers, calling Shopier, calling ad-platform APIs, creating campaigns/posts/pixels, activating SupplierScout, reviving retired channels, or spending.

### D-438 - Product Flow Snapshot Operator Links

Local-only and read-only. `/productflow`, `/flow`, and `smoke:product-flow:read` now include deterministic operator links: Payload admin for products with ids, and public PDP links only for products with slugs plus public status. This speeds catalog review without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending.

### D-439 - Loading-Plan Worklist Operator Links

Local-only and read-only. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` first product worklist rows now include deterministic operator links: Payload admin for products with ids, and public PDP links only for products with slugs plus public status. This speeds catalog loading review without writing products, queueing jobs, publishing, dispatching channels, calling providers, calling Shopier, activating SupplierScout, reviving retired channels, or spending.

### D-440 - Shopier Preview/Dashboard Operator Links

Local-only and read-only. `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows now include deterministic operator links: Payload admin for products with ids, and public PDP links only for products with slugs plus public status. Confirmed queue/retry output stays free of preview-only links. This speeds Shopier queue review without direct Shopier calls, provider calls, publishing, dispatching channels, activating SupplierScout, reviving retired channels, or spending.

### D-441 - Shopier Preview Credential Holds

Local-only and read-only. `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview rows now show whether `SHOPIER_PAT` is configured before confirm commands. Missing credentials keep previews available while telling the operator to configure `SHOPIER_PAT`; configured credentials still tell the operator to verify webhook/account/quota outside chat before confirm. Confirmed queue/retry output stays free of preview-only credential hints and still uses the existing credential gate. This prints no secret values and performs no direct Shopier call, provider call, publish, dispatch, SupplierScout activation, retired-channel activation, or ad spend.

### D-488 - Optional OpenClaw VPS Deploy Guard

Local-only Phase 3/9 control hardening. The historical `scripts/vps-deploy.sh`
now exits before any OpenClaw configuration write, skill copy, or container
restart unless an operator supplies both `--reactivate-openclaw` and
`--confirm-vps-sync` after completing the read-only VPS verification checklist.
`test:openclaw-vps-verification` proves bare and one-flag calls are refused.
Hermes/Mentix remains the current control layer; this does not contact a VPS or
sync OpenClaw, and the standalone test remains outside normal `test:safe`.

### D-489 - Confirmation-Wizard Schema Governance

Local-only Phase 2/9 safety correction. Telegram confirmation requests no
longer run `CREATE TABLE`, `ALTER TYPE`, or any other PostgreSQL schema DDL.
They use the pre-provisioned `public.wizard_sessions` table for ephemeral
session state only. `test:confirmation-wizard` guards the no-DDL rule and the
Payload category-option contract. `smoke:wizard-sessions:schema` is read-only;
`db:wizard-sessions:apply` is dry-run by default and requires explicit separate
operator approval before it can create a missing table. The approved 2026-07-25
read-only preflight confirmed that `public.wizard_sessions` already satisfies
the contract, so no DDL was needed. The preflight/apply remains outside normal
validation and future incomplete environments still require separate approval.

### D-490 - Lead-Status Enum Schema Governance

Local-only Phase 7/9 safety correction. A `customer_inquiries` status enum
drift can no longer hand Telegram operators executable DDL. The failed lead
write remains a no-write result with no BotEvent audit record and points only to
`smoke:lead-status-schema:read`. That preflight reads `pg_type`/`pg_enum`
metadata after explicit confirmation; `db:lead-status-enum:apply` is dry-run
by default, refuses an absent/incompatible baseline enum, and needs separate
explicit approval before it adds missing post-baseline statuses. The approved
2026-07-25 read-only preflight confirmed every declared CustomerInquiries
status enum value already exists, so no DDL was needed. The preflight/apply
remains outside normal validation and future incomplete environments still
require separate approval.

### D-491 - Order-To-Lead Relationship Schema Governance

Local-only Phase 7/9 safety correction. `convertLeadToOrder()` now stops before
an order write when its read-only idempotency lookup detects that
`orders.related_inquiry_id` or the `customer_inquiries` relationship is absent.
The safe result leaves the order, lead status, and audit trail unchanged and
points only to `smoke:lead-conversion-schema:read`. The smoke reads column and
foreign-key metadata after explicit confirmation; `db:lead-conversion-schema:apply`
is dry-run by default, adds only an absent nullable relationship, and refuses
an incompatible existing column or foreign key for manual review. The approved
2026-07-25 read-only preflight confirmed the nullable integer relationship and
its `customer_inquiries.id` foreign key already exist, so no DDL was needed.
The preflight/apply remains outside normal validation and future incomplete
environments still require separate approval.

### D-492 - Storefront Header And Camper Brand-Safety Correction

Local-only Phase 6/10 correction. The announcement bar is rendered inside the
fixed storefront Navbar, giving it a dedicated header row instead of allowing
it to overlap the wordmark. `Camper` is now covered by the same shared
protected-brand scanner already used by activation, public storefront
eligibility, dispatch, Shopier readiness, and ad readiness. The correction
does not mutate products or call Payload, Telegram, providers, Shopier, or a
deployment. `test:brand-safety`, `test:merchandising`, and
`test:storefront-trust` cover the rule; full local validation and build pass.

### D-493 - X Direct/Fallback Provider Readiness Alignment

Local-only Phase 4 reliability correction. X direct dispatch now uses the same
complete OAuth 1.0a requirement as provider health: `X_API_KEY`,
`X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET`. A partial X
configuration no longer attempts a direct API call. It uses the optional
`N8N_CHANNEL_X_WEBHOOK` fallback when configured, or records the missing OAuth
key names plus the fallback-webhook requirement when it is not. Focused
`test:channel-dispatch`, `test:provider-health`, `test:redispatch`, and
`test:dispatch-status`, full `npm run validate`, and `npm run build` pass
locally; no provider, webhook, Payload, queue, or deployment action occurred.

### D-494 - Meta Gallery Media Selection Alignment

Local-only Phase 4 reliability correction. Instagram and Facebook direct
dispatch now scan the complete gallery for a public `https://` image instead of
checking only position zero. A relative or insecure first image therefore no
longer forces an otherwise publishable product into the fallback path when a
later public image exists. Mocked direct-adapter coverage in
`test:channel-dispatch` proves both paths without calling Meta; production
media reachability and real posting remain separate operator evidence. Full
`npm run validate` and `npm run build` pass locally.

### D-495 - Meta Public-Media Dispatch Preflight

Local-only Phase 4 reliability correction. Instagram and Facebook now fail
before direct Meta or optional n8n fallback dispatch when no public HTTPS media
exists. The result keeps the fallback configuration visible but tells the
operator to attach public media instead of sending relative media to an
unreachable external workflow. Mocked `test:channel-dispatch` coverage proves
zero fetch/provider calls for this case; real production media and Meta/n8n
delivery remain separate operator evidence. Full `npm run validate` and
`npm run build` pass locally.

### D-496 - Lead-Followup Runtime Smoke Completeness

Local-only Phase 7/9 diagnostics correction. The lead-followup runtime smoke
registers `BlogPosts` alongside `Products`, preventing the Product
`linkedBlogPost` relationship from making the temporary read-only Payload
configuration fail before it can read leads. `test:runtime-smokes`, typecheck,
full `npm run validate`, `npm run build`, and the approved
`smoke:lead-followup:read` pass. The configured-state read
found six open, stale leads and returned PII-light next actions only; it did not
write leads, message customers, queue work, call providers or Shopier, push
schema, or spend on ads. That read is not deployed Telegram or production
provider proof.

### D-497 - Brand Remediation External-Exposure Visibility

Local-only Phase 10 catalog-safety improvement. `/brandplan` and
`smoke:brand-safety:read` now show stored external dispatch evidence for
protected-brand products: Facebook, Instagram, X, and Shopier states of
`published`, `queued`, or `failed`. Website stays out because it is native.
The evidence is historical and read-only, so it neither proves that an external
listing is live nor authorizes cleanup, retry, publishing, dispatch, provider
or Shopier calls, or product changes. The approved 2026-07-25 read found 13
protected-brand records and showed `SN0111` as Facebook published, Shopier
queued, and X failed. `test:brand-safety-plan` and `test:runtime-smokes` pass
locally; full `npm run validate` and `npm run build` also pass locally.

### D-498 - Brand Remediation Provenance-State Workflow

Local-only Phase 10 remediation workflow improvement. `/brandplan` and
`smoke:brand-safety:read` now classify each protected-brand row as unreviewed,
needs evidence, confirmed-unbranded copy correction, or not approved for sale,
and present one safe next step. Any stored external dispatch record remains a
manual remote-verification priority; it is never treated as proof a remote
listing exists. The approved 2026-07-25 read found 13 unreviewed blockers, 9
with stored external history. This action plan writes no decision or product,
does not clean remote content, dispatch, publish, call providers or Shopier,
or spend. Focused checks, full `npm run validate`, and `npm run build` pass locally.

### D-499 - Batch Image QC Remediation Queue

Local-only Phase 5/10 backlog workflow. `/imageqcplan` and
`smoke:image-qc-plan:read` classify catalog products as brand-review-first,
missing-original-media, QC failed, QC review, or QC decision needed. They only
hand operators to `/imageplan` and `/productflow`; no Image QC decision,
generation, product write, dispatch, provider/Shopier call, or spend is
possible from the queue. The approved 2026-07-25 sample found 55 items: 13
brand first, 28 failures, and 14 awaiting a QC decision. Focused checks pass;
full `npm run validate` and `npm run build` pass locally.

The D-499 per-product diagnostic alignment makes `/productflow` and
`/imageplan` follow the same protected-brand-first order. They offer only the
preview-first `/brandreview <id-or-sn> needs-evidence` review path and withhold
Image QC, regeneration, activation, Shopier, redispatch, and ad suggestions
while the hard brand block remains.
They also load the latest provenance BotEvent so recorded evidence, copy-fix,
or keep-excluded decisions advance the manual diagnostic without weakening that
hard block.

### D-500 - Meta Provider Configuration Unification

Local-only Phase 4 configuration correction. Direct Facebook dispatch and
provider-health now share one resolver: the Facebook Page ID is sourced from
deployment env `INSTAGRAM_PAGE_ID`, not a removed AutomationSettings field.
The environment template removes retired Dolap/Threads fallback variables and
lists the four direct X OAuth 1.0a variables. Focused provider-health,
credential-resolver, and channel-dispatch checks pass locally. This neither
proves production configuration nor calls Meta, X, n8n, Shopier, or any other
provider.
