# Current Truth

Last updated: 2026-07-02

## North Star

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for selling and uploading our own products only.

Payload is the source of truth. Products, media, orders, leads, stock, bot events, AI jobs, and publishing status should resolve back to Payload data.

## Current Focus (2026-07-02): Catalog Scale-Up / Product Loading Factory

Strategic shift: we are NOT preparing to launch ads yet. Advertising is intentionally deferred until the catalog is much larger and product-image quality is stable (earliest ad phase is D-380+). The OLD focus "ads readiness" is replaced by the NEW primary focus: build the product catalog and image-QA factory first; advertising comes much later.

Business goal: scale from a small working storefront into a reliable product-loading system that can handle hundreds of shoe products with consistent studio-quality images, strong product QA, category coverage, and controlled publishing.

Top priorities, in order:

1. Product image quality control — no hallucinated defects; multi-angle references preferred; a 5-image studio pack target; a locked studio background.
2. Catalog depth and category balance.
3. Controlled, batch-safe publishing.
4. Ads only after the above are stable (D-380+).

The active roadmap for this phase is D-352 through D-357 in `02_MASTER_ROADMAP.md` (Phase 10). Image-QA standards live in `09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`.

Operator visibility now includes `/catalogqa [limit]` for product completeness, `/categoryfill [limit]` for category depth strategy, `/imageqc` for product image quality state, read-only product flow snapshots via `/productflow <sn-or-id>` or `/flow <sn-or-id>`, guarded Shopier operator dashboard via `/shopier dashboard`, guarded Shopier batch preview via `/shopier publish-ready`, first-pass Shopier sync error triage via `/shopier errors`, and safe retry preview via `/shopier retry-errors`. `/catalogqa`, `/categoryfill`, `/productflow`, `/flow`, and `/shopier dashboard` are read-only. `/imageqc` only writes Image QC metadata/workflow visual state. `/shopier publish-ready` and `/shopier retry-errors` are preview-only until their `confirm` forms are used. Confirmed Shopier commands queue only products that pass the shared Shopier/Web gate. None of these commands spend on ads.

## D-351 Lead Capture Repair (completed 2026-06-27)

- `/api/inquiries` returned 500 on product lead submit. Root cause: production DB schema drift — the `customer_inquiries.landing` column was missing (added in code via D-345 without its Neon DDL).
- DDL applied: the `customer_inquiries.landing` column was added.
- Route hardened with a staged fail-safe (full -> core+product -> minimal name+phone) so lead capture survives an optional-column or product-relation failure.
- Live test passed: the product inquiry form succeeded. Admin readback confirmed the lead saved with product relation, phone, size, source, UTM source/medium/campaign, and landing.
- Revenue lead capture is restored. Ads remain paused.

## Active Channels

- Website
- Instagram
- Facebook
- X
- Shopier

## Retired Or Dormant

- Dolap: removed from active channel model.
- Threads: removed from active channel model.
- SupplierScout: dormant. Code remains, but the business decision is own-products-only. Dormancy is mechanically checked by `npm run test:supplierscout-dormant`.
- n8n: optional glue, not the main system brain.

## Bot Roles

- Mentix/Uygunops: operator bot for product intake, stock, image generation, diagnostics, publishing helpers, leads, orders, funnel.
- GeoBot: content, GEO/SEO, audits, product intelligence handoff, preview/publish support.
- OpenClaw: intended agent brain and skill host for Mentix-style reasoning.
- Next/Payload Telegram route: operational bot API layer and product workflow executor.

## Main Strategy

Keep the system narrow and reliable before adding more automation:

1. Make product intake and admin review excellent.
2. Make active channel publishing explainable and retryable.
3. Make Mentix useful as an operator assistant.
4. Keep Obsidian and this source pack as current project memory.
5. Use GitHub/repo tasks for execution.

## Current Architecture Bias

Prefer direct app code for core commerce logic:

- Product state: Payload
- Website: Next.js
- Shopier: Payload jobs
- Instagram/Facebook/X: direct dispatch when credentials exist
- n8n: optional workflow bridge
- OpenClaw/Mentix: high-level agent behavior and skills

## Current Product Guard

Payload now defaults new products to `draft` and blocks active creates or new activation into `status='active'` unless the product has a valid price, image, stock, active target, and clean brand-safety scan. Successful activation also sets the workflow to active/sellable so homepage eligibility is coherent. Existing active products remain editable. Automation intake and content generation now stop at draft/ready state; activation requires an explicit operator action through admin, `/activate`, `/approvepublish`, Publish Desk, or the GeoBot `Yayına Al` button. The guard has code-level smoke coverage in `npm run validate`.

Direct Payload admin saves to `status='soldout'` now normalize workflow state too: `workflowStatus='soldout'`, `stockState='sold_out'`, and `sellable=false`. This keeps manual admin status changes aligned with Telegram/operator sold-out actions.

Runtime activation diagnostics now have a read-only command: `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product, and reports lifecycle, readiness, stock, targets, activation blockers, and coherence issues without writing or dispatching. Product `359` passed this read-only smoke on 2026-06-22 with readiness `6/6`, effective stock `10`, all active targets, no activation blockers, and no coherence issues.

Runtime activation mutation proof now exists through `npm run smoke:activation:mutate`. Existing-product mode requires a website-only `SMOKE`/`TEST` draft plus `--confirm-mutate-and-rollback`. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete`; it creates a website-only smoke draft, activates through `approveAndActivateProduct()`, verifies `status=active`, restores, deletes captured smoke bot-events, and deletes the temp product. Temp admin-direct mode adds `--admin-direct-update`; it activates through a plain Payload `status='active'` update, matching a direct admin save. Both temp paths passed on 2026-06-22: helper path product `363` cleaned up two smoke bot-events, admin-direct path product `364` normalized `workflowStatus=active` and `publishStatus=published`, no external channel dispatched, and no Shopier job queued. Manual operator UI/Telegram smoke remains next.

Per-channel dispatch state is summarized by `src/lib/channelDispatchStatus.ts` and shown in ReviewPanel as published, queued, failed, blocked, preview, not configured, or skipped.

External dispatch eligibility is covered by `src/lib/channelDispatch.test.ts`. The only external dispatch channels are Instagram, Shopier, X, and Facebook; Website is native; Dolap and Threads cannot become dispatch-eligible.

Telegram redispatch is covered by `src/lib/operatorActionsRedispatch.test.ts`; it is one-channel only and preserves other channel notes.

Telegram caption parsing now recognizes all active channel targets: Website, Instagram, Shopier, X, and Facebook. `twitter` maps to X, `fb` maps to Facebook, and legacy `Instagram: evet` maps to Website + Instagram. Parser and automation-decision tests prove Dolap/Threads do not come back through caption/channel target handling. The Telegram legacy photo+caption fallback uses `resolveChannelTargets()` and sets all active channel flags from effective targets.

The Telegram confirmation wizard target picker now includes X and is covered by `src/lib/confirmationWizard.test.ts`. Wizard target handling accepts only the active channel set, drops retired/unknown targets from summaries and confirmation updates, and rejects spoofed callback targets before they enter the session.

The Payload admin ReviewPanel now appears for admin-created products too. Admin/manual product creation gets the same readiness, lifecycle, channel target, brand-safety, and activation-guard hints that Telegram/n8n products get.

Admin/manual products now reveal source/dispatch metadata once they are active, sold out, or have real dispatch/sync/story metadata. Fresh admin drafts keep that group hidden. This makes redispatch, dry-run preview, Shopier sync state, story state, and dispatch notes reachable for manual products after publish. The rule is covered by `src/lib/productAdminVisibility.test.ts`.

Product channel intent is normalized in `Products.beforeChange`: `channelTargets` and `channels.publish*` are synced to the same active channel set before activation. This prevents manual admin products from appearing ready while external dispatch later skips a channel because the target and flag disagreed. The shared logic is covered by `src/lib/productChannels.test.ts` and hook coverage in `src/lib/productActivationGuard.test.ts`.

State-coherence diagnostics now also detect older channel drift: unsupported targets, target selected while its publish flag is false, or publish flag true while the target is missing. This helps clean old catalog records that predate channel normalization.

Telegram `/repair` is the operator-controlled state-coherence repair path. It defaults to dry-run, requires `confirm` to write, updates only derived workflow fields, skips archived products, writes a `state.repaired` bot event on confirmed repair, and is covered by `src/lib/stateCoherence.test.ts`.

Media readiness uses one shared usable-media definition across activation guard, central publish readiness, and the Payload admin ReviewPanel. Empty placeholder rows no longer count as product visuals. Covered by `src/lib/productMedia.test.ts`.

Stock readiness now uses one shared stock summary across central publish readiness and the Payload admin ReviewPanel. Populated variant stock takes precedence over product-level stock, unpopulated variant IDs fall back to `stockQuantity`, and `workflow.stockState='sold_out'` or `workflow.sellable=false` blocks the stock check even when a positive quantity exists. Covered by `src/lib/productStock.test.ts`.

The Payload admin ReviewPanel ready/not-ready banner now depends on central six-dimension `evaluatePublishReadiness()`, not only its local field checklist. Confirmation, content, audit, media, sellable stock, target channels, and brand safety must all pass before the panel says a draft is ready to publish. Covered by `src/lib/operatorReadiness.test.ts`.

Telegram/operator pipeline diagnostics now use the same usable-media and stock-summary helpers. `/pipeline` no longer counts empty media placeholders as visuals, and its stock stage reports effective variant stock plus sold-out/not-sellable blockers instead of only top-level `stockQuantity`. Covered by `src/lib/publishReadiness.test.ts`.

Read-only Product Flow Snapshot diagnostics now exist at `/productflow <sn-or-id>` and `/flow <sn-or-id>`, backed by `src/lib/productFlowSnapshot.ts`. The snapshot combines lifecycle, publish readiness, activation blockers, image QC, Shopier queue gate, active-channel dispatch state, channel/coherence drift, and suggested next actions without writing, publishing, queueing jobs, calling Shopier, or spending on ads. Covered by `src/lib/productFlowSnapshot.test.ts` and `npm run test:product-flow-snapshot`. A matching read-only runtime smoke exists at `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`; it reads one real Payload product with `PAYLOAD_DB_PUSH=false`, uses the same helper as `/productflow`, and performs no writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes.

Provider-health diagnostics are also available as an operator-run smoke: `npm run smoke:provider-health:read -- --confirm-read-only`. It reads AutomationSettings with `PAYLOAD_DB_PUSH=false`, evaluates Website/Instagram/Facebook/X/Shopier through the same secret-safe provider-health helper used by Telegram `/diagnostics`, and prints provider states plus missing key names only. It performs no writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes.

Product Intelligence/GEO provider diagnostics are available as `npm run smoke:pi-provider-health:read -- --confirm-read-only`. It loads env files only, evaluates Gemini text/image readiness, Google Vision, DataForSEO, SerpAPI, and effective reverse-search selection, and prints provider states plus missing key names only. It does not connect to Payload, call providers, spend credits, queue jobs, dispatch, or print secret values.

Orders, leads, stock, and analytics visibility exist through Telegram `/business` and `/funnel`. `/business` composes lead, sales, order, and stock urgency helpers. `/funnel` groups demand by lead source, attributes converted orders through `relatedInquiry`, separates direct orders without a lead, and shows UTM/referrer detail when available. These Phase 7 surfaces are now covered by `npm run test:business-desk`, `npm run test:funnel-desk`, and read-only runtime smoke `npm run smoke:business-funnel:read -- --confirm-read-only`; the smoke reads real Payload lead/order/product/stock state without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema push.

D-355 structured Image QC is implemented. Products now have an `imageQuality` group with PASS/REVIEW/FAIL state, defect flags, notes, checkedAt, checkedBy, and source. AI/generated product images require explicit QC PASS before publish readiness, activation, or ad readiness. Original-only product media can pass the image QC gate without generated-image QC. Operator visibility exists in the Payload admin ReviewPanel and Telegram `/imageqc`. Covered by `src/lib/imageQualityGate.test.ts`, plus publish-readiness, activation-guard, ad-readiness, and catalog-QA assertions.

D-356 Shopier/Web batch control is in progress. The shared gate in `src/lib/shopierPublishControl.ts` blocks Shopier queueing unless the product is active/visible on the website, has a slug, explicitly targets Shopier in both `channelTargets` and `channels.publishShopier`, has category, sellable stock, generated-gallery media, Image QC PASS, brand-safety pass, and central publish readiness. `/shopier dashboard` is read-only and combines publish-ready counts, top blocker groups, error classes, and safe retry counts. `/shopier publish-ready` previews eligible/blocked products; `/shopier publish-ready confirm` queues only eligible products. `/shopier errors` summarizes products with Shopier sync errors by retryable, product data, configuration, remote state, or unknown class and gives the next operator action. `/shopier retry-errors` previews only retryable errors that still pass the same queue gate; `/shopier retry-errors confirm` queues only those safe retry candidates. `npm run smoke:shopier:read -- --confirm-read-only` mirrors dashboard, publish-ready, errors, and retry-errors against real Payload state without writes, jobs, dispatch, Shopier API calls, or schema push. Covered by `src/lib/shopierPublishControl.test.ts`; runtime smoke is operator-run and not part of `validate`.

Latest read-only schema/check smokes on 2026-07-02 show D-355 Image QC DB drift is resolved: all 5 `image_quality_*` product columns and the `products_image_quality_defect_flags` relation are present. `npm run smoke:product-flow:read -- --product=359 --confirm-read-only` completed with no writes, jobs, dispatches, provider calls, Shopier calls, or schema push; product `359` is active, targets all active channels, has no channel/coherence drift, but is now blocked by generated-image QC review and X has a credits-depleted dispatch failure. `npm run smoke:provider-health:read -- --confirm-read-only` completed read-only with Website `ready/native`, Instagram `disabled/none`, Facebook missing Page ID/webhook, X missing OAuth/webhook, and Shopier missing `SHOPIER_PAT`/webhook. `npm run smoke:pi-provider-health:read -- --confirm-read-only` completed env-only with Gemini text/image ready, `GEMINI_IMAGE_GEN_MODEL` override present, and no reverse-search provider selectable because Google Vision, DataForSEO, and SerpAPI credentials are missing locally. `npm run smoke:shopier:read -- --confirm-read-only --limit=5` completed read-only with 0 new publish candidates, 0 sync errors, 0 retry candidates, and `SHOPIER_PAT configured: no`. `npm run smoke:ad-readiness:read -- --product=359 --confirm-read-only` completed read-only and blocked manual ads until generated-image QC PASS is recorded; it also reported one risky-claim warning. `npm run smoke:business-funnel:read -- --confirm-read-only` completed read-only with 6 open leads, 5 stale leads, 1 sold-out product, no open orders, and no today funnel activity; `--period=week` found 2 website leads and 1 attributed lead with UTM/referrer detail. Confirmed DB apply mode remains operator-only if drift ever reappears.
