# Current Truth

Last updated: 2026-07-25

## North Star

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for selling and uploading our own products only.

Payload is the source of truth. Products, media, orders, leads, stock, bot events, AI jobs, and publishing status should resolve back to Payload data.

Agent-control layer (2026-07-07): Hermes is the current agent-control layer for UygunAyakkabı/Mentix operations (installed on the operator's main PC, already in the Telegram group). Mentix/Uygunops is the Telegram-facing commerce operator identity/interface. Payload/Next remains the source of truth and execution layer. OpenClaw is historical/optional unless explicitly reactivated. Its legacy VPS sync exits before any write or restart unless the operator supplies both `--reactivate-openclaw` and `--confirm-vps-sync` after recording read-only VPS verification evidence. D-489 keeps Telegram confirmation handling schema-free with pre-provisioned `public.wizard_sessions` storage, D-490 keeps missing lead-status enum values as a safe no-write result, and D-491 blocks lead conversion before an order write when its deployed `related_inquiry_id` relationship is incomplete. Each has a separate guarded schema workflow.

X provider rule (D-493): direct X publishing requires all four OAuth 1.0a environment values: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, and `X_ACCESS_TOKEN_SECRET`. A partial configuration uses the optional `N8N_CHANNEL_X_WEBHOOK` fallback when present; otherwise dispatch records the missing credential names and does not attempt a direct X API call. This is local behavior coverage, not production credential or permission proof.

Meta media rule (D-494): direct Instagram and Facebook dispatch scan the full
gallery for public `https://` media. A relative or insecure first image no
longer sends a product to fallback when a later public image is available.
Mocked adapter coverage is local only; it is not a real Meta post.

Meta media preflight (D-495): when no public HTTPS image exists, Instagram and
Facebook record a clear failed dispatch result before either Meta or optional
n8n can be called. A configured fallback stays visible for diagnosis but is not
sent unusable relative media. Local tests use mocks only.

Lead-followup smoke completeness (D-496): the temporary read-only Payload
configuration registers BlogPosts with Products because Products declares a
`linkedBlogPost` relationship. The approved 2026-07-25 read found six open,
stale leads and returned only PII-light operator actions; it performed no
writes, messages, queues, provider calls, Shopier calls, schema pushes, or ad
action.

Brand remediation external-exposure visibility (D-497): `/brandplan` and
`smoke:brand-safety:read` now display recorded Facebook, Instagram, X, and
Shopier dispatch notes as `published`, `queued`, or `failed`. Website is
excluded because it is native. These are historical stored notes, not a live
remote listing check or permission to clean up, retry, publish, dispatch, call
providers or Shopier, or mutate a product. The approved 2026-07-25 read found
13 protected-brand records; `SN0111` records Facebook published, Shopier
queued, and X failed.

Brand remediation provenance-state workflow (D-498): the same read-only plan
now counts every protected-brand record as not reviewed, needs evidence,
unbranded copy fix, or not approved, and gives one safe next step. Recorded
external history always calls for manual remote verification first. The
approved 2026-07-25 read found 13 blockers, all with no provenance decision;
9 have stored Facebook/Instagram/X/Shopier history. The plan does not record a
decision, update products, clean a remote listing, dispatch, publish, call a
provider or Shopier, or spend.

Batch Image QC remediation (D-499): `/imageqcplan` and
`smoke:image-qc-plan:read` turn catalog Image QC backlog into a read-only
queue. Protected-brand products return to provenance review first; all other
rows receive only Image Plan/Product Flow handoffs. The approved 2026-07-25
sample found 55 queue items: 13 brand first, 28 QC failures, and 14 needing a
QC decision. No QC record, generation job, product, provider/Shopier action,
dispatch, or spend was changed.

D-499 per-product diagnostic alignment: protected-brand `/productflow` and
`/imageplan` now point first to preview-first `/brandreview <id-or-sn>
needs-evidence` and withhold Image QC, generation, activation, Shopier,
redispatch, and ad suggestions until provenance is reviewed. A recheck of
active `SN0111` confirmed this ordering with no write or external action.
The same per-product reads now load the latest provenance BotEvent, so a
recorded evidence, copy-fix, or keep-excluded decision advances only the manual
next step and never clears the protected-brand gate.

## Current Focus (2026-07-02): Catalog Scale-Up / Product Loading Factory

Strategic shift: we are NOT preparing to launch ads yet. Advertising is intentionally deferred until the catalog is much larger and product-image quality is stable (earliest ad phase is D-380+). The OLD focus "ads readiness" is replaced by the NEW primary focus: build the product catalog and image-QA factory first; advertising comes much later.

Business goal: scale from a small working storefront into a reliable product-loading system that can handle hundreds of shoe products with consistent studio-quality images, strong product QA, category coverage, and controlled publishing.

Top priorities, in order:

1. Product image quality control — no hallucinated defects; multi-angle references preferred; a 5-image studio pack target; a locked studio background.
2. Catalog depth and category balance.
3. Controlled, batch-safe publishing.
4. Ads only after the above are stable (D-380+).

The active roadmap for this phase is D-352 through D-357 in `02_MASTER_ROADMAP.md` (Phase 10). Image-QA standards live in `09_AI_IMAGES_GEO_PRODUCT_INTELLIGENCE.md`.

Operator visibility now includes `/catalogqa [limit]` for product completeness, `/categoryfill [limit]` for category depth strategy, `/loadplan [limit]` or `/loadingplan [limit]` for a daily catalog loading/fix plan, `/smokeplan` for the safe live-smoke checklist, `/imageqc` for product image quality state, read-only product flow snapshots via `/productflow <sn-or-id>` or `/flow <sn-or-id>`, guarded Shopier operator dashboard via `/shopier dashboard`, guarded Shopier batch preview via `/shopier publish-ready`, first-pass Shopier sync error triage via `/shopier errors`, and safe retry preview via `/shopier retry-errors`. `/catalogqa`, `/categoryfill`, `/loadplan`, `/loadingplan`, `/smokeplan`, `/productflow`, `/flow`, and `/shopier dashboard` are read-only. D-422 adds an operator checklist to `/productflow`, `/flow`, and `smoke:product-flow:read` so Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state are visible in one handoff. D-423 makes that checklist dependency-aware: it guides confirmation before content generation, then content trigger/retry before audit, instead of suggesting commands out of order. D-424 derives one primary operator step from the ordered checklist so the first command or manual step appears before the full checklist. D-438 adds deterministic operator links to the same Product Flow Snapshot: Payload admin when the product has an id, and a public PDP link only when the product has a slug plus public status. D-425 adds a `flowCommand` handoff to `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` worklist rows, so each daily loading candidate also points to `/productflow <ref>` before manual follow-up. D-439 adds deterministic operator links to the same loading-plan worklist rows: Payload admin when the product has an id, and public PDP only when the product has a slug plus public status. D-426 aligns `/smokeplan` with that handoff: the worklist-selected `smoke:product-flow:read` and Telegram `/productflow` checks now run immediately after repo/Telegram `/loadplan`, before provider diagnostics. D-437 adds `npm run test:telegram-access` after the repo load-plan runtime smoke and before the first Telegram `/loadplan` read, so private Telegram DM allowlist behavior is checked before live Telegram operator reads. D-427 adds `runtimeFlowCommand` to the same worklist rows and prints the exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` command, so terminal and Telegram operators preflight the same product. `/shopier dashboard` now includes a read-only batch review sample with ready/blocked/queued/synced product examples and suggested manual follow-up commands. D-428 adds `flowCommand` and `runtimeFlowCommand` to those Shopier dashboard rows too, so `/shopier dashboard` and `smoke:shopier:read` show `/productflow <ref>` plus exact `npm run smoke:product-flow:read -- --product=<ref> --confirm-read-only` before queue decisions. D-429 adds the same product-flow preflight handoffs to `/shopier publish-ready` and `/shopier retry-errors` preview rows, and keeps `SHOPIER_PAT` required for `confirm` queue/retry actions rather than read-only previews. D-440 adds deterministic operator links to `/shopier dashboard`, `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` preview/review rows: Payload admin when the product has an id, and public PDP only when the product has a slug plus public status. Confirmed queue/retry output stays free of preview-only links. D-430 adds a dedicated `/smokeplan` operator hold after Shopier preview reads, telling operators to use the row-provided `/productflow <ref>` and exact repo product-flow smoke handoffs before any Shopier confirm action. D-431 adds a second `/smokeplan` hold before final queue approval, telling operators to verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action. D-432 adds read-only manual ad preflights to `/smokeplan`: `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` now run after lead visibility and before Shopier queue preflights, without launching ads. D-433 adds `npm run test:storefront-trust` to `/smokeplan` after lead visibility and before ad-readiness checks, so fake-review and placeholder-testimonial guardrails run before paid-traffic readiness. D-451 extends the same storefront-trust check to PDP conversion essentials: draft hiding, gallery, variant-backed size/stock clarity, lead form context, WhatsApp/Shopier CTAs, FAQ fallback, and similar-products gating. D-434 adds `npm run test:inquiry-guard` after storefront trust and before ad-readiness checks, so honeypot, rate-limit, duplicate-collapse, and safe lead-form fallback behavior are verified before paid-traffic readiness. D-435 adds `npm run test:attribution` after inquiry guard and before ad-readiness checks, so first-touch UTM/referrer capture, storefront navigation preservation, and lead-submit attribution merge behavior are verified before paid-traffic readiness. D-436 adds `npm run test:sitemap-entries` after attribution and before ad-readiness checks, so static routes plus website-visible product and blog sitemap entries/degrade-safe behavior are verified before paid-traffic readiness. Runtime preflight for the loading plan now exists at `npm run smoke:load-plan:read -- --confirm-read-only`; it mirrors `/loadplan` against real Payload products without writes. `/smokeplan` does not read Payload; it prints the read-only repo-smoke and Telegram-read order and stops before queueing, publishing, redispatch, provider spend, Shopier action, ad-platform API calls, campaign creation, or ad spend. `/imageqc` only writes Image QC metadata/workflow visual state. `/shopier publish-ready` and `/shopier retry-errors` are preview-only until their `confirm` forms are used. Confirmed Shopier commands queue only products that pass the shared Shopier/Web gate. None of these commands spend on ads.

D-441 adds preview-only Shopier credential holds: `/shopier publish-ready`, `/shopier retry-errors`, and `smoke:shopier:read` now show whether `SHOPIER_PAT` is configured before confirm commands. Missing credentials keep previews available, configured credentials still require webhook/account/quota verification outside chat, and no secret values are printed.

D-442 adds read-only lead follow-up operator links: `/leadplan`, `/followupplan`, and `smoke:lead-followup:read` now show direct Payload lead-admin links, related product-admin links when present, and public PDP links only when the related product has a slug plus public status. No lead status write or customer message is performed.

D-443 adds read-only Operator Inbox product links: `/inbox pending`, `/inbox publish`, `/inbox stock`, `/inbox failed`, and `/inbox today` product rows now show direct Payload admin links, plus public PDP links only when the product has a slug plus public status. No product write, activation, publish, dispatch, or queue action is performed by these links.

D-444 adds shared read-only lead desk operator links: `/inbox leads`, `/leadreminders`, `/leads`, `/lead <id>`, and new-lead alerts now show direct Payload lead-admin links, related product-admin links when present, and public PDP links only when the related product has a slug plus public status. No lead status write or customer message is performed by these links.

D-445 adds shared read-only order desk operator links: `/inbox orders`, `/orders`, `/orders today`, `/orderreminders`, `/order <id>`, and new-order alerts now show direct Payload order-admin links, related product-admin and lead-admin links when present, and public PDP links only when the related product has a slug plus public status. No order status write, stock restore, or customer message is performed by these links.

D-446 adds read-only `/business` next-action hints: when Payload urgency counts show open/stale leads, stale/open orders, sold-out products, or low-stock products, the summary points to safe reads such as `/leadplan`, `/orderreminders`, `/orders`, and `/inbox stock`. No lead/order/product write, stock change, queue, provider call, Shopier call, customer message, or ad action is performed by these hints.

D-447 adds read-only `/funnel` next-action hints: when Payload funnel evidence shows open lead work, converted/direct orders, or UTM-attributed campaign signals, the summary points to safe reads such as `/leadplan`, `/orders`, and `/adreport week`. No lead/order/product write, stock change, queue, provider call, Shopier call, customer message, ad-platform call, campaign creation, or ad action is performed by these hints.

D-448/D-452 add read-only `/adready` next-action hints: blocked products point to `/productflow <ref>` and `/imageplan <ref>` when relevant, while review/ready products point to `npm run test:storefront-trust`, read-only `/adpack <ref> manual_ads`, and `/adreport week`. No product/lead/order write, stock change, queue, provider call, Shopier call, customer message, ad-platform call, campaign/post/pixel creation, Pixel/CAPI action, or ad spend is performed by these hints.

D-449/D-452 update the operator-facing `/smokeplan` title to `Operator Live Smoke Plan (D-389/D-452)` so the live-smoke checklist reflects the latest ad-readiness guidance and current local handoff boundary. It does not change smoke order, write data, queue jobs, call providers, call Shopier, or launch ads.

D-450 extends retired-channel governance to the session-start Memory Lock handoff files. `test:retired-channels` now checks `project-control/MEMORY_LOCK.md` and `project-control/exports/MEMORY_LOCK.md`, requiring active channels to remain Website/Instagram/Facebook/X/Shopier and Dolap/Threads to be described only as retired.

D-451 extends storefront trust governance to buyer-facing PDP conversion essentials. `test:storefront-trust` now also checks that public product pages hide drafts, keep the gallery mounted, keep variant-backed size/stock clarity, keep the lead form product context, keep WhatsApp and Shopier CTAs safely gated, keep FAQ fallback rendering, and keep similar products active-status plus merchandising gated.

D-472 extends the same storefront-trust boundary to numeric social-proof. Homepage trust metrics are blank and hidden by default; they render only when an operator enables `SiteSettings.trustBadges.enabled` and supplies all three verified values. This does not calculate business figures or change existing Payload data.

D-473 keeps operator diagnostics truthful about Website visibility. Product Flow blocks the Website row for draft or storefront-unsafe products and withholds their PDP link, even if old dispatch metadata says Website published. It remains read-only and does not rewrite products or call external services.

D-474 applies that same public-storefront rule to all remaining operator-facing PDP links and ad landing examples. Brand remediation, loading plans, Shopier previews, inbox, lead/order desks, and ad readiness keep their Payload admin links but do not offer a PDP or UTM for a protected-brand or placeholder record the storefront hides. It is local-only, read-only policy alignment with no product rewrite, queue, publish, provider call, Shopier call, or ad spend.

D-475 closes the direct Telegram UTM path: `/utm` now requires a slug, active status, and the same public storefront safety policy before returning a copy-ready marketing URL. It is tested locally and remains read-only; it never changes a product, queues work, publishes, dispatches, calls providers/Shopier, or spends on ads.

D-476 makes the catalog worklist risk-first: an active protected-brand product now appears before a draft protected-brand product even when the draft has more secondary blockers. `/loadplan`, `/loadingplan`, and the matching read-only smoke show status beside each worklist row. It changes review order only; it never writes products, queues work, publishes, dispatches, calls providers/Shopier, or spends on ads.

D-477 adds a durable operator provenance-review audit without weakening any safety rule. `/brandreview <id-or-sn> needs-evidence|unbranded-copy-fix|not-approved [confirm] [note]` previews first; only explicit confirmation records one `brand_safety.provenance_reviewed` BotEvent. It never edits the product, clears the protected-brand gate, activates, publishes, dispatches, queues Shopier, calls a provider, or spends. `/brandplan` and `smoke:brand-safety:read` show the latest valid review record read-only.

D-478 makes that confirmed audit delivery-idempotent. The BotEvent stores an opaque Telegram delivery key; a retry of the same delivery returns the original review and does not create a second event. This does not add a product write, schema change, safety bypass, publishing action, or provider call.

D-479 adds shared Blog editorial preflight before a first publication. Incomplete or placeholder posts are blocked, valid first publications receive `publishedAt`, and legacy published edits remain compatible. AI-authored or evidence-sensitive copy is flagged for an operator to review rather than auto-approved. `/blogpreflight <id-or-slug>` and `npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only` are diagnostics only: they do not write, publish, call providers, spend, or change schema.

D-480 makes the Shopier webhook authenticity boundary fail closed. The documented HMAC-SHA256 signature is checked against the exact raw body with constant-time comparison; a missing `SHOPIER_WEBHOOK_TOKEN` now returns `503`, while missing/malformed/invalid signatures return `401` before parsing JSON, creating orders, changing stock, or notifying Telegram. Token rotation remains supported through comma-separated configured tokens. `test:shopier-webhook-security` is part of the local Shopier webhook preflight and safe suite; it does not call Shopier.

D-452 connects that PDP trust guardrail back into `/adready`: review/ready products now list `npm run test:storefront-trust` before `/adpack` or `/adreport`, while blocked products keep pointing to blocker/image diagnostics first.

D-453 tightens source-pack governance around latest-boundary wording. `test:source-pack` now requires next-sprint notes to say D-453 is the latest local boundary, keep the actual `/smokeplan` title boundary at `Operator Live Smoke Plan (D-389/D-452)`, carry the D-380-D-406 plus D-422-D-453 release/PR stack, and reject stale current-D-449 or D-422-D-451 stack wording.

D-454 improves daily catalog scale-up visibility. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now include a read-only batch summary derived from the first product worklist: candidate count, critical/high/medium/low counts, blocker counts, first suggested command, first `/productflow` handoff, and first repo-side product-flow smoke command. The actual `/smokeplan` title remains `Operator Live Smoke Plan (D-389/D-452)`.

D-455 improves daily catalog operator focus. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add a read-only batch focus derived from the same first product worklist: safe bottleneck kind, operator label, reason, and next safe read. The focus can point to brand-safety cleanup, Image QC, Shopier errors, core product fields, stale drafts, category backlog, or `/smokeplan` when no product-specific blocker exists. The actual `/smokeplan` title remains `Operator Live Smoke Plan (D-389/D-452)`.

D-456 improves daily catalog execution. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add read-only focus refs and a short focus queue of matching safe read commands for the D-455 bottleneck, so the operator can see which top products match the focus. The actual `/smokeplan` title remains `Operator Live Smoke Plan (D-389/D-452)`.

D-457 improves focus-queue explainability. `/loadplan`, `/loadingplan`, and `smoke:load-plan:read` now add read-only reason details beside each focus-queue command, so the operator can see why each top product appears in the queue without cross-referencing the full worklist. The actual `/smokeplan` title remains `Operator Live Smoke Plan (D-389/D-452)`.

D-458 improves Product Flow Snapshot scanability. `/productflow`, `/flow`, and `smoke:product-flow:read` now include a read-only checklist summary with done/next/blocked/needs-work counts before the staged checklist, so operators can judge product-flow progress faster. The actual `/smokeplan` title remains `Operator Live Smoke Plan (D-389/D-452)`.

D-459 improves Product Flow Snapshot publishing visibility. `/productflow`, `/flow`, and `smoke:product-flow:read` now include a read-only dispatch summary with active-channel counts for published, queued, failed, blocked, not configured, and unrecorded states before the full dispatch rows. This helps operators see publishing health at a glance without writing, queueing, publishing, redispatching, calling providers, calling Shopier, syncing optional OpenClaw, or spending. The actual `/smokeplan` title remains `Operator Live Smoke Plan (D-389/D-452)`.

D-460 makes the same Product Flow Snapshot actionable without making it mutating: every non-published active-channel dispatch row now includes its deterministic next operator action beside the state and reason. Queued Shopier points to `/shopier dashboard`, ready-but-unrecorded Shopier points to shared `/shopier publish <ref>`, and failed external channels only suggest `/redispatch <channel> <ref>` after the recorded cause is fixed. The snapshot and runtime smoke still only read Payload.

D-461 reconciles the session-start Memory Lock with current operating truth. Payload/Next is the executing commerce layer, Hermes is current for Mentix/Uygunops operator support, OpenClaw is historical/optional unless explicitly reactivated, and n8n is frozen optional glue with direct Payload/Next as the default path. SupplierScout stays dormant; Dolap and Threads stay retired. The guardrails now reject the stale claim that the live default path is Telegram to OpenClaw to n8n to Payload.

D-462 repaired a build-discovered database schema drift: `BlogPosts.featuredImage` is declared as a relationship to `media`, and the approved 2026-07-24 additive migration created the missing `blog_posts.featured_image_id`, exact `ON DELETE SET NULL` media foreign key, and supporting index in the configured database. The post-apply read-only preflight passes, and the following build completed without a blog sitemap schema fallback. `npm run db:blog-featured-image:apply` remains dry-run by default and only runs additive DDL after `--apply --confirm-apply-d462-blog-featured-image-schema` plus explicit operator approval in another environment.

D-463 reconciles the repo-side Mentix skill library with that same runtime truth. Hermes/Mentix is current on the operator PC; OpenClaw files are optional historical templates and cannot be treated as proof of a running VPS deployment. The skills provide advisory, drafting, and read-only diagnostic support only: Payload/Next executes commerce work, and durable PII-light decisions are recorded in `project-control/` and this source pack. No OpenClaw sync, restart, or live prompt was run.

D-464 closes a storefront conversion gap locally: the homepage now renders Editor Picks, Best Sellers, Deals, and Discounts from the same server-side curated memberships that select eligible products. `test:merchandising` covers selection/order/toggle behavior and `test:homepage-merchandising` keeps the membership handoff connected to the rendered rails. No Payload access, publish, dispatch, provider call, Shopier call, SupplierScout activation, retired-channel activation, or ad action is involved.

D-465 aligns the root Obsidian control center with this same truth. `00_HOME.md`, `01_CURRENT_TRUTH.md`, `02_MASTER_ROADMAP.md`, `03_BOT_OWNERSHIP.md`, and `04_ACTIVE_DECISIONS.md` now describe Payload/Next execution, Hermes/Mentix current control, optional OpenClaw/n8n, own-products-only scope, active/retired channels, SupplierScout dormancy, current roadmap, and explicit approval gates. `test:obsidian-control` protects the alignment; `test:story-dispatch` is restored to `test:safe` so story brand-safety coverage remains in baseline validation.

Manual ad tooling is also operator-controlled and read-only: `/adready <sn-or-id>` checks whether one product is suitable for manual ads, `/adpack <sn-or-id> [campaign]` prepares safe copy drafts plus UTM links, and `/adreport [today|week|month]` summarizes UTM-tagged leads, related orders, revenue, stale open leads, unattributed leads, and direct/unattributed orders from Payload only. `smoke:ad-performance:read` mirrors `/adreport` against real Payload leads/orders with explicit read-only confirmation. These commands do not create campaigns, posts, pixels, provider calls, Shopier calls, external API calls, or ad spend.

D-481 adds a duplicate-delivery guard for Shopier order creation: the collection
declares `shopierOrderId` unique, and a PostgreSQL duplicate-key result exits
before the stock decrement. The approved concurrent partial unique database
index is applied and post-apply verified on 2026-07-25 with zero duplicate
non-empty IDs. `smoke:shopier-order-id-schema:read` is operator-run and
read-only; its current result is PASS. This does not prove live webhook delivery.

D-482 makes the local `order.created` core atomic: the local Order create plus
product/variant stock updates and InventoryLog writes share one Payload adapter
transaction request. It fails closed when no transaction can start; a verified
processing failure returns `500` for Shopier retry, while the webhook's Telegram
alert runs only after commit. The generic Orders alert hook skips Shopier orders
to avoid an early or duplicate alert. D-481's partial unique index is applied
and read-only verified in the configured database; live webhook delivery remains
separately unverified.

D-483 closes the matching non-Shopier order transaction gap. Website, phone, Instagram, and
other standard Order creates now execute stock mutation before the generic
new-order alert, retaining the parent Payload request for product/variant stock,
InventoryLog, and stock-reaction operations. A missing product or size, unknown
variant, or insufficient stock throws and lets Payload roll back the order create
instead of leaving stock drift. `npm run test:order-stock-transaction` is an
in-memory/local governance proof only: it does not connect to PostgreSQL, send
Telegram, call Shopier, dispatch, or write production data.

D-484 closes the concurrent stale-read gap inside that same non-Shopier path.
Product and selected-variant reservations use a conditional PostgreSQL update
with `stock >= quantity` in the active Payload transaction. If a competing
order takes the final unit first, the second update returns no row, the Order
create throws, and the parent transaction rolls back before an InventoryLog is
written. This is local code/test evidence only; it does not run against the
configured database or replace D-481's separately verified database guard.

D-485 applies matching arithmetic safety to paid Shopier order delivery. The
Shopier transaction uses a floor-at-zero PostgreSQL decrement for product totals
and selected variants, so concurrent distinct orders cannot overwrite each
other's depletion and leave a falsely high local stock value. It deliberately
keeps the paid external order and its InventoryLog even when local stock is
already depleted. D-481's separate duplicate-order index is applied and
post-apply verified in the configured database.

D-486 hardens the public product detail page without changing Payload data. A
usable generated gallery remains preferred, but original product media is used
when generated rows have no usable URL. The resolved gallery now supplies
Product JSON-LD images, offer availability follows shared sellable-stock truth,
and inline JSON-LD is safely serialized. `test:product-storefront-images`,
`test:product-structured-data`, and `test:storefront-trust` cover the local
boundary; it does not call Payload, a provider, Shopier, or an ad platform.

D-487 moves inline JSON-LD escaping into `src/lib/structuredData.ts` and uses
it for both Product/FAQ and Blog Article schema. Article title, excerpt, or
other editor content cannot close the schema script early. `test:structured-data`
and `test:blog-structured-data` are local-only checks; they do not read or
write Payload, publish BlogPosts, call providers, or spend.

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
- Hermes: current agent-control layer for reasoning, diagnostics, drafting, and operator support. Hermes is installed on the operator's main PC and is already in the Telegram group.
- OpenClaw: historical/optional skill host. Do not treat it as current live infrastructure unless the operator explicitly reactivates it. Repo-side OpenClaw skill files are retained as expected-state/history only, not proof of VPS deployment; use `mentix-skills/OPENCLAW_VPS_VERIFICATION.md` before any copy, restart, or live prompt if OpenClaw is reactivated.
- Next/Payload Telegram route: operational bot API layer and product workflow executor.

## Main Strategy

Keep the system narrow and reliable before adding more automation:

1. Make product intake and admin review excellent.
2. Make active channel publishing explainable and retryable.
3. Make Hermes/Mentix useful as an operator assistant.
4. Keep Obsidian and this source pack as current project memory.
5. Use GitHub/repo tasks for execution.

## Current Architecture Bias

Prefer direct app code for core commerce logic:

- Product state: Payload
- Website: Next.js
- Shopier: Payload jobs
- Instagram/Facebook/X: direct dispatch when credentials exist
- n8n: optional workflow bridge
- Hermes/Mentix: high-level agent behavior and skills
- OpenClaw: historical/optional skill host only if explicitly reactivated

## Current Product Guard

Payload now defaults new products to `draft` and blocks active creates or new activation into `status='active'` unless the product has a valid price, image, stock, active target, and clean brand-safety scan. Successful activation also sets the workflow to active/sellable so homepage eligibility is coherent. Existing active products remain editable. Automation intake and content generation now stop at draft/ready state; activation requires an explicit operator action through admin, `/activate`, `/approvepublish`, Publish Desk, or the GeoBot `Yayına Al` button. The guard has code-level smoke coverage in `npm run validate`.

Direct Payload admin saves to `status='soldout'` now normalize workflow state too: `workflowStatus='soldout'`, `stockState='sold_out'`, and `sellable=false`. This keeps manual admin status changes aligned with Telegram/operator sold-out actions.

Runtime activation diagnostics now have a read-only command: `npm run smoke:activation:read -- --product=<id> --confirm-read-only`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product, and reports lifecycle, readiness, stock, targets, activation blockers, and coherence issues without writing or dispatching. Product `359` passed this read-only smoke on 2026-06-22 with readiness `6/6`, effective stock `10`, all active targets, no activation blockers, and no coherence issues.

Runtime activation mutation proof now exists through `npm run smoke:activation:mutate`. Existing-product mode requires a website-only `SMOKE`/`TEST` draft plus `--confirm-mutate-and-rollback`. Temp helper mode uses `--create-temp-smoke --confirm-create-mutate-delete`; it creates a website-only smoke draft, activates through `approveAndActivateProduct()`, verifies `status=active`, restores, deletes captured smoke bot-events, and deletes the temp product. Temp admin-direct mode adds `--admin-direct-update`; it activates through a plain Payload `status='active'` update, matching a direct admin save. Both temp paths passed on 2026-06-22: helper path product `363` cleaned up two smoke bot-events, admin-direct path product `364` normalized `workflowStatus=active` and `publishStatus=published`, no external channel dispatched, and no Shopier job queued. Manual operator UI/Telegram smoke remains next.

Per-channel dispatch state is summarized by `src/lib/channelDispatchStatus.ts` and shown in ReviewPanel as published, queued, failed, blocked, preview, not configured, or skipped.

External dispatch eligibility is covered by `src/lib/channelDispatch.test.ts`. The only external dispatch channels are Instagram, Shopier, X, and Facebook; Website is native; Dolap and Threads cannot become dispatch-eligible.

Story dispatch is also guarded. The non-blocking Story pipeline must not create StoryJobs for protected-brand products; `src/lib/storyDispatch.ts` records a failed story status with a brand-safety reason instead. Covered by `npm run test:story-dispatch`.

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

Read-only Product Flow Snapshot diagnostics now exist at `/productflow <sn-or-id>` and `/flow <sn-or-id>`, backed by `src/lib/productFlowSnapshot.ts`. The snapshot combines lifecycle, publish readiness, activation blockers, image QC, Shopier queue gate, active-channel dispatch state, summary, and row-level recovery paths, channel/coherence drift, a checklist summary, an operator checklist, a primary operator step, and suggested next actions without writing, publishing, queueing jobs, calling Shopier, or spending on ads. The D-422 checklist stages the product handoff across Photos/Image QC, confirmation, content, audit, price/size/stock, channel targets, operator approval, and Shopier queue state when relevant. D-423 makes those staged commands dependency-aware: incomplete drafts point content and audit back to `/confirm`, confirmed products with pending content point audit to `/content <ref> trigger`, and failed content points audit to `/content <ref> retry`. D-424 surfaces the first actionable checklist item as `primaryOperatorStep` in the snapshot, Telegram formatter, and runtime smoke. D-458 adds `checklistSummary` with done/next/blocked/needs-work counts so operators can understand product-flow progress before reading the full checklist. D-459 adds `dispatchSummary` with active-channel published/queued/failed/blocked/not-configured/unrecorded counts so operators can understand publishing health before reading every dispatch row. D-460 keeps each non-published dispatch state, reason, and recovery command together; it does not execute the suggested command. D-425 connects the loading plan to this view by adding `/productflow <ref>` as the flow preflight beside each first product worklist action. Covered by `src/lib/productFlowSnapshot.test.ts`, `src/lib/productLoadingPlan.test.ts`, `npm run test:product-flow-snapshot`, and `npm run test:loading-plan`. A matching read-only runtime smoke exists at `npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only`; it reads one real Payload product with `PAYLOAD_DB_PUSH=false`, uses the same helper as `/productflow`, prints the same checklist summary, dispatch summary, per-row recovery paths, checklist, and dispatch rows, and performs no writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes.

Provider-health diagnostics are also available as an operator-run smoke: `npm run smoke:provider-health:read -- --confirm-read-only`. It reads AutomationSettings with `PAYLOAD_DB_PUSH=false`, evaluates Website/Instagram/Facebook/X/Shopier through the same secret-safe provider-health helper used by Telegram `/diagnostics`, and prints provider states plus missing key names only. It performs no writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes.

Product Intelligence/GEO provider diagnostics are available as `npm run smoke:pi-provider-health:read -- --confirm-read-only`. It loads env files only, evaluates Gemini text/image readiness, Google Vision, DataForSEO, SerpAPI, and effective reverse-search selection, and prints provider states plus missing key names only. It does not connect to Payload, call providers, spend credits, queue jobs, dispatch, or print secret values.

Orders, leads, stock, and analytics visibility exist through Telegram `/business` and `/funnel`. `/business` composes lead, sales, order, and stock urgency helpers, and D-446 adds safe next-read hints for urgency counts. `/funnel` groups demand by lead source, attributes converted orders through `relatedInquiry`, separates direct orders without a lead, shows UTM/referrer detail when available, and D-447 adds safe next-read hints for lead/order/UTM follow-up. These Phase 7 surfaces are now covered by `npm run test:business-desk`, `npm run test:funnel-desk`, and read-only runtime smoke `npm run smoke:business-funnel:read -- --confirm-read-only`; the smoke reads real Payload lead/order/product/stock state without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema push.

Operator order lifecycle is covered by `npm run test:order-desk`. The current policy is: `/ship` stamps shipment, `/deliver` stamps delivery and backfills shipment when needed, delivered orders cannot be cancelled through Telegram, repeated actions are no-op/idempotent, and manual `/cancelorder` does not auto-restore stock. Manual cancellation points the operator to `/restock` when stock should be restored. Shopier `order.fulfilled` now calls the same lifecycle helper as source `shopier_webhook`, so fulfillment stamps/audits shipment and keeps idempotency/refusal behavior aligned with `/ship` instead of directly overwriting status.

Shopier order/refund stock reconciliation is now centralized in `src/lib/shopierOrderStock.ts` and wired into `src/app/api/webhooks/shopier/route.ts`. Sales decrement the matching local variant when variants exist, otherwise product-level stock; refunds restore through the same rule. Mismatched Shopier sizes are skipped with an explicit reason. Covered by `npm run test:shopier-order-stock`; live webhook smoke still requires configured Shopier credentials/webhooks and operator approval.

Shopier refund lifecycle traceability is now covered by `src/lib/shopierRefundLifecycle.ts` and `npm run test:shopier-refund-lifecycle`. Shopier `refund.requested` records an idempotent request marker on the matching Payload order before stock restore, so duplicate webhook delivery cannot restore stock twice. Shopier `refund.updated` appends an idempotent note and emits `order.refund_updated` when possible. It does not change order status, restore stock, call Shopier, dispatch channels, or spend on ads; `refund.requested` remains the only automatic refund stock-restore signal.

D-355 structured Image QC is implemented. Products now have an `imageQuality` group with PASS/REVIEW/FAIL state, defect flags, notes, checkedAt, checkedBy, and source. AI/generated product images require explicit QC PASS before publish readiness, activation, or ad readiness. Original-only product media can pass the image QC gate without generated-image QC. Operator visibility exists in the Payload admin ReviewPanel and Telegram `/imageqc`. Covered by `src/lib/imageQualityGate.test.ts`, plus publish-readiness, activation-guard, ad-readiness, and catalog-QA assertions.

D-356 Shopier/Web batch control is in progress. The shared gate in `src/lib/shopierPublishControl.ts` blocks Shopier queueing unless the product is active/visible on the website, has a slug, explicitly targets Shopier in both `channelTargets` and `channels.publishShopier`, has category, sellable stock, generated-gallery media, Image QC PASS, brand-safety pass, and central publish readiness. `/shopier dashboard` is read-only and combines publish-ready counts, top blocker groups, sample ready/blocked/queued/synced product rows, error classes, and safe retry counts. `/shopier publish-ready` previews eligible/blocked products; `/shopier publish-ready confirm` queues only eligible products. Single `/shopier publish <sn-or-id>` and `/shopier republish <sn-or-id>` resolve product identifiers and call the same `queueShopierSync()` gate; `test:shopier-commands` blocks direct Telegram route-level `shopier-sync` job writes. `/shopier errors` summarizes products with Shopier sync errors by retryable, product data, configuration, remote state, or unknown class and gives the next operator action. `/shopier retry-errors` previews only retryable errors that still pass the same queue gate; `/shopier retry-errors confirm` queues only those safe retry candidates. D-440 adds deterministic admin/PDP operator links to dashboard, publish-ready, retry, and read-only smoke preview/review rows while keeping confirmed queue/retry output free of preview-only links. `npm run smoke:shopier:read -- --confirm-read-only` mirrors dashboard, publish-ready, errors, and retry-errors against real Payload state without writes, jobs, dispatch, Shopier API calls, or schema push. Covered by `src/lib/shopierPublishControl.test.ts` and `scripts/shopier-command-governance.ts`; runtime smoke is operator-run and not part of `validate`.

D-441 extends D-356 with preview-level credential visibility. Publish-ready and retry previews now report `SHOPIER_PAT` presence without printing secret values, keep preview available when credentials are missing, and keep confirmed queue/retry output free of preview-only credential hints. Existing confirm credential gates remain in place.

Manual ads remain deferred until D-380+, but the read-only support layer now includes Telegram `/adready <sn-or-id>` and `/adpack <sn-or-id> [campaign]`. `/adpack` uses `src/lib/adLaunchPack.ts` to produce operator-review copy drafts and Meta paid-social UTM links only after hard blockers are clear. It creates no campaign, post, pixel, provider call, Shopier call, or ad spend. Covered by `npm run test:ad-launch-pack`; UTM vocabulary now accepts `meta` and `paid_social` plus optional `utm_content` for copy-angle tracking.

Latest read-only schema/check smokes on 2026-07-02 show D-355 Image QC DB drift is resolved: all 5 `image_quality_*` product columns and the `products_image_quality_defect_flags` relation are present. `npm run smoke:product-flow:read -- --product=359 --confirm-read-only` completed with no writes, jobs, dispatches, provider calls, Shopier calls, or schema push; product `359` is active, targets all active channels, has no channel/coherence drift, but is now blocked by generated-image QC review and X has a credits-depleted dispatch failure. `npm run smoke:provider-health:read -- --confirm-read-only` completed read-only with Website `ready/native`, Instagram `disabled/none`, Facebook missing Page ID/webhook, X missing OAuth/webhook, and Shopier missing `SHOPIER_PAT`/webhook. `npm run smoke:pi-provider-health:read -- --confirm-read-only` completed env-only with Gemini text/image ready, `GEMINI_IMAGE_GEN_MODEL` override present, and no reverse-search provider selectable because Google Vision, DataForSEO, and SerpAPI credentials are missing locally. `npm run smoke:shopier:read -- --confirm-read-only --limit=5` completed read-only with 0 new publish candidates, 0 sync errors, 0 retry candidates, and `SHOPIER_PAT configured: no`. `npm run smoke:ad-readiness:read -- --product=359 --confirm-read-only` completed read-only and blocked manual ads until generated-image QC PASS is recorded; it also reported one risky-claim warning. `npm run smoke:business-funnel:read -- --confirm-read-only` completed read-only with 6 open leads, 5 stale leads, 1 sold-out product, no open orders, and no today funnel activity; `--period=week` found 2 website leads and 1 attributed lead with UTM/referrer detail. Confirmed DB apply mode remains operator-only if drift ever reappears.

D-500 Meta provider configuration unification: direct Facebook dispatch and
read-only provider health now resolve the same Page ID from deployment env
`INSTAGRAM_PAGE_ID`, rather than a removed Payload `facebookPageId` column.
Legacy in-memory snapshots remain compatible. `.env.example` now excludes
retired Dolap/Threads n8n fallback variables and lists the four X OAuth 1.0a
keys required for direct X publishing. This is local configuration alignment,
not proof of production credentials, account permissions, quota, or a live
provider call. The approved 2026-07-25 D-500 read reports Website ready,
Facebook ready/direct, Instagram disabled by AutomationSettings, and X plus
Shopier missing their current requirements; it made no write or provider call.
Approved local PR preparation committed and rebased
`codex/master-build-plan-d500` on `origin/main`; it is not pushed, has no PR,
and is not deployed.
