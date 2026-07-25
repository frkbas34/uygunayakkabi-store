# Runtime Smoke Checks

Last updated: 2026-07-16

Latest local smoke-plan governance note:

- D-485 does not add a runtime smoke. `test:shopier-webhook-local` now also
  proves the transaction-bound floor-at-zero Shopier stock decrement for product
  totals and variants. It does not connect to Payload, PostgreSQL, Shopier,
  Telegram, providers, or dispatch.

- D-484 does not add a runtime smoke. `test:order-stock-transaction` now also
  proves the conditional PostgreSQL reservation boundary for non-Shopier orders:
  zero-row `stock >= quantity` reservations throw before InventoryLog creation,
  and the helper refuses to run without the parent transaction. It does not
  connect to Payload, PostgreSQL, Shopier, Telegram, providers, or dispatch.

- D-483 does not add a runtime smoke. `test:order-stock-transaction` uses an
  in-memory Orders hook plus local Payload create-operation governance to prove
  that non-Shopier stock failures throw before the generic alert. It does not
  connect to Payload, PostgreSQL, Shopier, Telegram, providers, or dispatch.

- D-482 does not add a runtime smoke. It adds local `test:payload-transaction`
  and `test:shopier-order-transaction` checks to `test:shopier-webhook-local`
  so an operator proves the atomic Shopier order/stock boundary before any
  separately approved live webhook smoke. They do not connect to Payload,
  PostgreSQL, Shopier, Telegram, providers, or external dispatch.

- D-442 keeps `smoke:lead-followup:read` read-only while adding lead-admin, product-admin, and public-status-only PDP links to the PII-light lead action rows. It does not write leads, message customers, call providers, call Shopier, queue jobs, or spend on ads.
- D-441 keeps `smoke:shopier:read` read-only and adds preview-only Shopier credential holds to its publish-ready and retry preview sections. It reports whether `SHOPIER_PAT` is configured without printing secret values, does not call Shopier, and does not queue jobs.
- D-440 keeps `smoke:shopier:read` read-only and adds Shopier preview/dashboard operator links to its output: Payload admin for products with ids and public PDP only for products with public status. This does not add a new runtime smoke command, does not perform URL checks, and does not call Shopier.
- D-439 keeps `smoke:load-plan:read` read-only and adds loading-plan worklist operator links to its output: Payload admin for products with ids and public PDP only for products with public status. This does not add a new runtime smoke command and does not perform URL checks or live writes.
- D-454 keeps `smoke:load-plan:read` read-only and adds the same loading-plan batch summary as Telegram `/loadplan`: worklist candidate count, priority counts, blocker counts, first suggested command, first `/productflow` handoff, and first exact repo-side product-flow smoke command before the product rows.
- D-455 keeps `smoke:load-plan:read` read-only and adds the same loading-plan batch focus as Telegram `/loadplan`: bottleneck kind, operator label, reason, and next safe read before the product rows.
- D-456 keeps `smoke:load-plan:read` read-only and adds the same loading-plan focus queue as Telegram `/loadplan`: top matching focus refs and safe read commands before the product rows.
- D-457 keeps `smoke:load-plan:read` read-only and adds the same loading-plan focus details as Telegram `/loadplan`: reason details beside each focus-queue command so operators can see why each product appears.
- D-458 keeps `smoke:product-flow:read` read-only and adds the same Product Flow Snapshot checklist summary as Telegram `/productflow`: done/next/blocked/needs-work counts before the full staged checklist.
- D-459 keeps `smoke:product-flow:read` read-only and adds the same Product Flow Snapshot dispatch summary as Telegram `/productflow`: active-channel published/queued/failed/blocked/not-configured/unrecorded counts before the full dispatch rows.
- D-460 keeps `smoke:product-flow:read` read-only and adds the same deterministic recovery path as Telegram `/productflow` beside each non-published active-channel dispatch row; it prints the suggestion but never runs it.
- D-438 keeps `smoke:product-flow:read` read-only and adds Product Flow Snapshot operator links to its output: Payload admin for products with ids and public PDP only for products with public status. This does not add a new runtime smoke command and does not perform URL checks or live writes.
- D-437 keeps `/smokeplan` read-only and adds `npm run test:telegram-access` after `smoke:load-plan:read` and before the first Telegram `/loadplan` read, so private Telegram DM allowlist behavior is checked before any live Telegram operator read. This is a local preflight/governance check, not an operator runtime smoke command and not a live Telegram command.
- D-466 adds `smoke:brand-safety:read`, which mirrors Telegram `/brandplan` against real product text and reports protected-brand severity, matched fields, and product-flow handoffs without rewriting, retiring, activating, publishing, redispatching, or spending.
- D-479 adds `smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only`, which mirrors Telegram `/blogpreflight` for one article. It reads editorial blockers, review items, and warnings without editing or publishing the article, calling providers, spending, activating SupplierScout, reviving retired channels, or pushing schema.
- D-436 keeps `/smokeplan` read-only and adds `npm run test:sitemap-entries` after attribution and before manual ad-readiness checks, so static routes plus website-visible product and blog sitemap entries are checked before any paid-traffic readiness decision. This is a local preflight/governance check, not an operator runtime smoke command and not a live crawl.

Runtime smoke checks are operator-run diagnostics. They may connect to the real Payload database, so they are separate from `npm run validate`.

## Runtime Smoke Governance

The read-only smoke inventory is guarded locally by:

```powershell
npm run test:runtime-smokes
```

This test is included in `test:safe` and checks that each read-only smoke listed here has a package script, a backing script, explicit `--confirm-read-only`/`READ_ONLY` confirmation, mutation refusal, no-write wording, and schema-push protection where Payload is loaded. It also checks that `test:safe` does not run runtime smoke commands directly, because these commands are operator-run diagnostics that may connect to real Payload/PostgreSQL data.

### D-489 Confirmation Wizard Session Schema

```powershell
npm run smoke:wizard-sessions:schema -- --confirm-read-only
```

This reads only PostgreSQL metadata for `public.wizard_sessions`. It refuses
mutation flags and never creates a table, writes a session, updates Payload,
queues a job, calls a provider, or dispatches a channel.

### D-490 Lead-Status Enum Schema

```powershell
npm run smoke:lead-status-schema:read -- --confirm-read-only
```

This reads only `pg_type` and `pg_enum` metadata for
`public.enum_customer_inquiries_status`. It refuses mutation flags and never
updates a lead, writes Payload, runs DDL, queues a job, calls a provider, or
dispatches a channel.

### D-491 Order-To-Lead Relationship Schema

```powershell
npm run smoke:lead-conversion-schema:read -- --confirm-read-only
```

This reads only `information_schema` and `pg_constraint` metadata for the
nullable `public.orders.related_inquiry_id` relationship to
`public.customer_inquiries(id)`. It refuses mutation flags and never creates
an order, updates a lead, writes Payload, runs DDL, queues a job, calls a
provider, or dispatches a channel.

## Activation Read-Only Smoke

Command:

```powershell
npm run smoke:activation:read -- --product=359 --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_RUNTIME_SMOKE_PRODUCT_ID='359'
$env:UYAA_RUNTIME_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:activation:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before importing Payload config.
- Reads one product with `depth=2`.
- Prints derived lifecycle, readiness dimensions, resolved active targets, stock snapshot, activation blockers, and state-coherence issues.
- Exits non-zero if the activation guard would block that product.

What it never does:

- No product updates.
- No status changes.
- No external channel dispatch.
- No Shopier job queue writes.
- No schema push.

Use this before a manual admin/Telegram activation smoke so the product's current Payload shape is known.

Latest verification:

- 2026-06-22: Product `359` read-only smoke exited cleanly. Result: lifecycle `Active`, readiness `6/6`, targets `website, instagram, shopier, x, facebook`, effective stock `10`, no activation blockers, no state-coherence issues. No writes were performed.

## Product Flow Snapshot Read-Only Smoke

Command:

```powershell
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_PRODUCT_FLOW_SMOKE_PRODUCT='<id-or-sn>'
$env:UYAA_PRODUCT_FLOW_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:product-flow:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before importing Payload config.
- Reads one product by Payload id or `stockNumber` with `depth=2`.
- Builds the same `src/lib/productFlowSnapshot.ts` evidence shape used by Telegram `/productflow` and `/flow`.
- Prints lifecycle, readiness, activation blockers, image QC, Shopier queue gate, active-channel dispatch state, summary, and row-level recovery paths, channel/coherence drift, checklist summary, operator checklist, and next actions.

What it never does:

- No product updates.
- No status changes.
- No external channel dispatch.
- No provider calls.
- No Shopier API calls.
- No job queue writes.
- No schema push.

Use this before live Telegram `/productflow` smoke so the product's current Payload diagnostic shape is known.

Latest verification:

- 2026-07-02: Product `359` read-only smoke completed. Result: `SN0032`, active, targets `website, instagram, shopier, x, facebook`, no channel/coherence drift, Shopier already synced as `47902428`, Image QC review blocks full readiness, and X redispatch is blocked by credits-depleted provider failure. Historical Dolap/Threads dispatch notes were filtered out of the operator snapshot. No writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed.

## Image Regeneration Plan Read-Only Smoke

Command:

```powershell
npm run smoke:image-plan:read -- --product=<id-or-sn> --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_IMAGE_PLAN_SMOKE_PRODUCT='<id-or-sn>'
$env:UYAA_IMAGE_PLAN_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:image-plan:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Reads one product by Payload id or `stockNumber` with `depth=1`.
- Reads up to three recent `image-generation-jobs` rows for that product.
- Builds the same `src/lib/imageRegenerationPlan.ts` guidance used by Telegram `/imageplan` and `/regenplan`.
- Prints Image QC status, visual status, latest image-generation job state, next actions, suggested manual commands, and the Telegram-formatted output.

What it never does:

- No product updates.
- No status changes.
- No image-generation queue writes.
- No provider API calls.
- No external channel dispatch.
- No Shopier API calls.
- No ad spend.
- No SupplierScout activation.
- No retired-channel activation.
- No schema push.

Use this before live Telegram `/imageplan` smoke or before deciding whether a product needs approval, Image QC, or a manual `#gorsel` regeneration command.

Latest verification:

- 2026-07-06: Script added as `smoke:image-plan:read`, included in runtime-smoke governance, and inserted into `/smokeplan` before Telegram `/imageplan`. No live read-only run has been performed yet; run only with `--product=<id-or-sn> --confirm-read-only`.

## Product Loading Plan Read-Only Smoke

Command:

```powershell
npm run smoke:load-plan:read -- --confirm-read-only
npm run smoke:load-plan:read -- --limit=200 --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_LOAD_PLAN_SMOKE_CONFIRM='READ_ONLY'
$env:UYAA_LOAD_PLAN_SMOKE_LIMIT='100'
npm run smoke:load-plan:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Reads recent products with `depth=1`.
- Runs the same read-only helper as Telegram `/loadplan`.
- Prints sample coverage, prioritized loading/fix actions, category load order, first product worklist with suggested action, `/productflow <ref>` flow handoff, exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` repo handoff, readiness counts, Image QC counts, Shopier error counts, brand-safety blocker count, and stale draft count.

What it never does:

- No product updates.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No job queue writes.
- No ad spend.
- No SupplierScout activation.
- No retired-channel activation.
- No schema push.

Use this before live Telegram `/loadplan` smoke so the catalog loading/fix priority view is known from real Payload data without mutation.

Latest verification:

- 2026-07-12: D-425 load-plan product-flow handoff, D-426 smoke-plan ordering alignment, and D-427 runtime command handoff added and validated locally. The load-plan output now shows `/productflow <ref>` plus exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` beside each first product worklist action, and `/smokeplan` uses that worklist-selected product-flow preflight before provider diagnostics. Focused loading-plan/runtime-smoke/operator-smoke-plan checks and full `npm run validate` passed. No live read-only run has been performed yet; run only with `--confirm-read-only`.
- 2026-07-05: D-399 runtime output alignment added and validated locally. The script now prints the first product worklist from `plan.worklist`, and `test:runtime-smokes` checks that the worklist surface stays in the smoke script. Focused runtime-smoke/loading-plan checks and full `npm run validate` passed. No live read-only run has been performed yet; run only with `--confirm-read-only`.
- 2026-07-03: Script added and included as `smoke:load-plan:read`. No-connect help path, runtime smoke governance, ops runbook governance, source-pack governance, retired-channel governance, TypeScript, lint, `git diff --check`, and full `npm run validate` passed.

## Brand-Safety Remediation Plan Read-Only Smoke

Command:

```powershell
npm run smoke:brand-safety:read -- --confirm-read-only
npm run smoke:brand-safety:read -- --limit=200 --confirm-read-only
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before opening Payload.
- Reads a bounded product sample plus prior `brand_safety.provenance_reviewed` BotEvents and mirrors Telegram `/brandplan`.
- Groups protected-brand blockers by severity and brand, and prints matched fields, the latest recorded provenance decision when present, plus `/productflow <ref>` and exact runtime product-flow handoffs.

What it never does:

- No product writes, text rewrites, status changes, stopsale action, activation, publish, or redispatch.
- No job queue writes, provider calls, Shopier calls, ad spend, SupplierScout activation, retired-channel activation, or schema push.

Latest verification:

- 2026-07-24: Confirmed read-only run against 100 of 126 products found 13 protected-brand blockers (12 critical, 1 high). The plan reported New Balance 7, BOSS 2, and the remaining protected-brand counts without mutating products. No writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes were performed.
- 2026-07-24: D-477/D-478 locally add the same prior-review evidence surface as `/brandplan`; the smoke reads provenance-review BotEvents only and does not invoke `/brandreview` or create an event. Confirmed command deliveries carry an opaque idempotency key so replayed Telegram updates do not create duplicate review evidence.

## Blog Editorial Preflight Read-Only Smoke

Command:

```powershell
npm run smoke:blog-preflight:read -- --post=<id-or-slug> --confirm-read-only
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before opening Payload.
- Reads one BlogPost and mirrors Telegram `/blogpreflight`: first-publication blockers, AI/evidence-sensitive review items, and SEO/editorial warnings.

What it never does:

- No article write, publication, provider call, Shopier call, ad spend, SupplierScout activation, retired-channel activation, or schema push.

Latest verification:

- 2026-07-24: D-479 added locally. The smoke is confirmation-gated and was not connected to Payload in this work session.

## Provider Health Read-Only Smoke

Command:

```powershell
npm run smoke:provider-health:read -- --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_PROVIDER_HEALTH_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:provider-health:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the read-only Payload runtime config.
- Reads AutomationSettings only.
- Evaluates Website, Instagram, Facebook, X, and Shopier through `src/lib/channelProviderHealth.ts`.
- Prints provider states, modes, notes, and missing key names only.

What it never does:

- No product updates.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No job queue writes.
- No schema push.

Use this before live `/diagnostics`, redispatch, Shopier queueing, or external-channel publishing checks so credential and global-toggle readiness is visible without exposing tokens.

Latest verification:

- 2026-07-02: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-07-02: Confirmed read-only run loaded `.env.local` and `.env`, forced `PAYLOAD_DB_PUSH=false`, read AutomationSettings, and completed. Result: Website `ready/native`; Instagram `disabled/none` by AutomationSettings; Facebook `missing/none` for `AutomationSettings.instagramTokens.facebookPageId` and `N8N_CHANNEL_FACEBOOK_WEBHOOK`; X `missing/none` for OAuth key names and `N8N_CHANNEL_X_WEBHOOK`; Shopier `missing/none` for `SHOPIER_PAT` and `N8N_CHANNEL_SHOPIER_WEBHOOK`. No writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed.

## Product Intelligence Provider Health Smoke

Command:

```powershell
npm run smoke:pi-provider-health:read -- --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_PI_PROVIDER_HEALTH_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:pi-provider-health:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Does not connect to Payload.
- Evaluates Gemini text/content generation, Gemini image generation, Google Vision, DataForSEO, SerpAPI, and the effective reverse-search provider selection.
- Prints provider states, modes, notes, and missing key names only.

What it never does:

- No Payload connection.
- No product updates.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No job queue writes.
- No schema push.

Use this before Product Intelligence/GEO work such as `#geohazirla`, GeoBot content generation, comparison drafts, or provider debugging. It is capability visibility only; it does not prove provider quota, balance, or remote permissions.

Latest verification:

- 2026-07-02: Usage mode refused without `--confirm-read-only` before loading env.
- 2026-07-02: Confirmed env-only run loaded `.env.local` and `.env`, used no Payload connection, and made no provider calls. Result: Gemini text `ready/direct`; Gemini image `ready/direct` with `GEMINI_IMAGE_GEN_MODEL` override present; Google Vision `missing/none` for `GOOGLE_VISION_API_KEY`; DataForSEO `missing/none` for `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`; SerpAPI `missing/none` for `SERPAPI_API_KEY`; reverse search `missing/none` because no reverse-search provider can be selected in auto mode. No writes, jobs, dispatches, provider calls, Shopier calls, or schema pushes were performed.

## Ad Readiness Read-Only Smoke

Command:

```powershell
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_AD_READINESS_SMOKE_PRODUCT='<id-or-sn>'
$env:UYAA_AD_READINESS_SMOKE_CONFIRM='READ_ONLY'
npm run smoke:ad-readiness:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Reads one product by Payload id or `stockNumber` with `depth=2`.
- Runs the same manual ad/PDP readiness evaluator used by Telegram `/adready`.
- Prints product-page, clean-media, stock/size, channel-link, UTM, lead-visibility, brand-safety, risky-claim, and no-autonomous-spend checks.
- Exits non-zero only when the product is hard-blocked for manual ads.
- For copy/UTM draft review after this check, use Telegram `/adpack <sn-or-id> [campaign]`; it is read-only and must not launch ads.

What it never does:

- No product updates.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No job queue writes.
- No ad spend.
- No schema push.

Use this before manual ad traffic or PDP conversion changes so the product's current landing-page, image, stock, UTM, lead, and brand-safety state is visible from real Payload data.

Latest verification:

- 2026-07-02: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-07-02: Confirmed read-only run for product `359` loaded `.env.local` and `.env`, forced `PAYLOAD_DB_PUSH=false`, and completed without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes. Result: product page, stock/size, channel link, UTM, lead visibility, brand safety, and no-autonomous-spend checks passed; generated-image media blocked because Image QC PASS is not recorded; risky-claim warning reported terms `ozgun`/`model`; sample UTM URL was generated.

## Ad Performance Read-Only Smoke

Command:

```powershell
npm run smoke:ad-performance:read -- --confirm-read-only
npm run smoke:ad-performance:read -- --period=month --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_AD_PERFORMANCE_SMOKE_CONFIRM='READ_ONLY'
$env:UYAA_AD_PERFORMANCE_SMOKE_PERIOD='week'
npm run smoke:ad-performance:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Runs the same read-only helper as Telegram `/adreport`.
- Prints UTM-tagged campaign rows, open/stale leads, won/lost/spam leads, related orders, related revenue, conversion rate, average order value, untagged leads, and direct/unattributed orders.

What it never does:

- No product updates.
- No lead/order mutations.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No external ad API calls.
- No job queue writes.
- No ad spend.
- No schema push.

Use this after manual UTM campaigns or before campaign review so Payload's lead/order attribution reality is visible without depending on Meta Pixel, CAPI, or Ads API.

Latest verification:

- 2026-07-03: Script added and included as `smoke:ad-performance:read`. No-connect help path passed, and full local validation passed. No live read-only run has been performed yet; run only with `--confirm-read-only`.

## Business/Funnel Read-Only Smoke

Command:

```powershell
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:business-funnel:read -- --period=week --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_BUSINESS_FUNNEL_SMOKE_CONFIRM='READ_ONLY'
$env:UYAA_BUSINESS_FUNNEL_SMOKE_PERIOD='week'
npm run smoke:business-funnel:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Runs the same read-only helpers as Telegram `/business` and `/funnel`.
- Prints lead, order, revenue, open/stale, stock urgency, source/funnel, direct-order, and attribution coverage counts.

What it never does:

- No product updates.
- No lead/order/stock mutations.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No job queue writes.
- No ad spend.
- No schema push.

Use this before relying on Phase 7 lead/source/funnel/stock-urgency visibility, especially after changes to Customer Inquiries, Orders, attribution, stock summaries, `/business`, or `/funnel`.
After the read-only counts are visible, use Telegram `/leadplan` or `/followupplan` as the read-only next-action view for open leads before campaign work.

Latest verification:

- 2026-07-02: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-07-02: Confirmed read-only `today` run loaded `.env.local` and `.env`, forced `PAYLOAD_DB_PUSH=false`, and completed without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes. Result: 6 open leads, 5 stale leads, 0 open orders, 1 sold-out product, 0 low-stock products, and no today funnel activity.
- 2026-07-02: Confirmed read-only `week` run completed with the same business snapshot and a 7-day funnel of 2 website leads, 0 converted orders, 0 direct orders, and 1 lead with attribution detail.

## Lead Follow-up Read-Only Smoke

Command:

```powershell
npm run smoke:lead-followup:read -- --confirm-read-only
npm run smoke:lead-followup:read -- --limit=12 --confirm-read-only
```

Env alternative:

```powershell
$env:UYAA_LEAD_FOLLOWUP_SMOKE_CONFIRM='READ_ONLY'
$env:UYAA_LEAD_FOLLOWUP_SMOKE_LIMIT='8'
npm run smoke:lead-followup:read
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Reads open Customer Inquiries with product relationship depth.
- Runs the same read-only helper as Telegram `/leadplan` and `/followupplan`.
- Prints a PII-light summary: open/sample counts, priority counts, lead id, status, action, age, source label, and suggested manual command.

What it never does:

- No product updates.
- No lead mutations.
- No customer messages.
- No status changes.
- No external channel dispatch.
- No provider API calls.
- No Shopier API calls.
- No job queue writes.
- No ad spend.
- No SupplierScout activation.
- No retired-channel activation.
- No schema push.

Use this after `smoke:business-funnel:read` and before live Telegram `/leadplan` smoke so open-lead follow-up priorities are known from real Payload data without exposing customer names/phones in terminal logs.

Latest verification:

- 2026-07-04: Script added and included as `smoke:lead-followup:read`. No-connect help path, runtime smoke governance, source-pack governance, retired-channel governance, TypeScript, `git diff --check`, and full `npm run validate` passed. No live read-only run has been performed yet; run only with `--confirm-read-only`.

## Activation Mutation Smoke

Command:

```powershell
npm run smoke:activation:mutate -- --product=<smoke-product-id> --confirm-mutate-and-rollback
npm run smoke:activation:mutate -- --create-temp-smoke --confirm-create-mutate-delete
npm run smoke:activation:mutate -- --create-temp-smoke --admin-direct-update --confirm-create-mutate-delete
```

Env alternative:

```powershell
$env:UYAA_ACTIVATION_MUTATION_SMOKE_PRODUCT_ID='<smoke-product-id>'
$env:UYAA_ACTIVATION_MUTATION_SMOKE_CONFIRM='MUTATE_AND_ROLLBACK'
npm run smoke:activation:mutate

$env:UYAA_ACTIVATION_MUTATION_SMOKE_CREATE_TEMP='1'
$env:UYAA_ACTIVATION_MUTATION_SMOKE_CONFIRM='CREATE_MUTATE_DELETE'
npm run smoke:activation:mutate
```

What it does:

- Requires explicit mutate-and-rollback confirmation.
- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Refuses normal products unless title, SKU, or stock number includes `SMOKE` or `TEST`.
- Refuses products unless they are `draft`, publish-ready, activation-guard clean, and website-only.
- Refuses external channel flags, story auto-publish, force redispatch, or preview dispatch.
- Activates through `approveAndActivateProduct()`, verifies the product becomes `active`, then restores the original product state and deletes smoke bot-events captured during the run.
- In temp mode, creates a prepared website-only smoke draft from an existing media item, activates it, restores it, deletes captured smoke bot-events, and deletes the temp smoke product.
- With `--admin-direct-update`, temp mode activates through a plain Payload `status='active'` update, matching a direct admin save rather than the Telegram/Publish Desk helper.

What it is not:

- It is not part of `npm run validate`.
- It is not for real catalog products.
- It is not allowed to dispatch Instagram, Facebook, X, or Shopier.

Latest verification:

- 2026-06-22: Usage mode prints instructions and exits cleanly.
- 2026-06-22: Product `359` without confirmation refused before database connection.
- 2026-06-22: Product `359` with confirmation refused at preflight before mutation because it is a real active product with external targets. No rollback write was attempted.
- 2026-06-22: Telegram/Publish Desk helper temp-smoke mode created product `363`, activated it through `approveAndActivateProduct()`, verified `status=active`, captured and deleted `2` bot-events, restored product state, and deleted the temp product. Channel dispatch evaluated `instagram, shopier, x, facebook` as skipped with no dispatched channels and no Shopier queue.
- 2026-06-22: Admin-direct temp-smoke mode created product `364`, activated it through a plain Payload update, verified `status=active`, `workflowStatus=active`, and `publishStatus=published`, restored product state, and deleted the temp product. It captured `0` bot-events, dispatched no external channels, and queued no Shopier job.

## Shopier Read-Only Smoke

Command:

```powershell
npm run smoke:shopier:read -- --confirm-read-only
npm run smoke:shopier:read -- --product=<id> --confirm-read-only
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Forces `PAYLOAD_DB_PUSH=false` before building the minimal Payload runtime config.
- Mirrors `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` against real Payload state.
- Includes the same `/shopier dashboard` batch review sample rows as Telegram: ready, blocked, queued, or synced product examples with suggested manual next commands plus `/productflow <ref>` and exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs.
- Includes D-429 product-flow handoffs in publish-ready and retry preview rows before any confirm queue/retry action.
- `/smokeplan` includes a D-430 operator hold that tells the operator to use those Shopier row handoffs before any Shopier confirm action.
- `/smokeplan` includes a D-431 operator hold that tells the operator to verify `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness outside chat without pasting secrets before any Shopier confirm action.
- With `--product=<id>`, evaluates one product against the shared Shopier/Web queue gate.

What it never does:

- No product updates.
- No Shopier API calls.
- No external channel dispatch.
- No `shopier-sync` job queue writes.
- No schema push.

Latest verification:

- 2026-06-30: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-06-30: Confirmed read-only run loaded env files, forced `PAYLOAD_DB_PUSH=false`, and stopped before preview because DB schema was behind repo schema. Evidence: missing relation `products_image_quality_defect_flags` (`code=42P01`). No writes, jobs, dispatches, Shopier calls, or schema pushes were performed.
- 2026-07-02: Confirmed read-only run with `--limit=5` completed. Result: 0 new publish candidates, 0 sync errors, 0 safe retries, `SHOPIER_PAT configured: no`. No writes, jobs, dispatches, Shopier calls, or schema pushes were performed.
- 2026-07-06: D-406 local alignment added so this smoke passes `buildShopierDashboardReviewRows()` into the same dashboard formatter as Telegram `/shopier dashboard`. Focused governance and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-12: D-428 local handoff added so the shared Shopier dashboard rows also print `/productflow <ref>` and exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` commands before queue decisions. Focused Shopier/runtime/source/release/PR checks and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-12: D-429 local handoff added so `/shopier publish-ready`, `/shopier retry-errors`, and the matching runtime-smoke formatter output print product-flow preflight commands before confirm. Focused Shopier formatter/command/source/release/PR/runtime checks and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-12: D-430 local smoke-plan alignment added so `/smokeplan` has a dedicated hold for Shopier row `/productflow <ref>` and exact repo product-flow smoke handoffs before any Shopier confirm action. Focused operator-smoke-plan/source/release/PR/runtime checks and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-12: D-431 local smoke-plan credential hold added so `/smokeplan` pauses for `SHOPIER_PAT`, webhook readiness, account permission, and quota/readiness verification outside chat before any Shopier confirm action. Focused operator-smoke-plan/source/release/PR/runtime checks and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-12: D-432 local smoke-plan manual ad preflight alignment added so `/smokeplan` runs `smoke:ad-readiness:read`, Telegram `/adready`, `smoke:ad-performance:read`, and Telegram `/adreport week` after lead visibility and before Shopier queue preflights. Focused operator-smoke-plan/source/release/PR checks and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-16: D-433 local smoke-plan storefront trust preflight added so `/smokeplan` runs `npm run test:storefront-trust` after lead visibility and before manual ad-readiness checks. Focused operator-smoke-plan/storefront-trust/source/release/PR checks and full `npm run validate` passed locally; no live read-only run has been performed yet.
- 2026-07-16: D-434 local smoke-plan inquiry guard preflight added so `/smokeplan` runs `npm run test:inquiry-guard` after storefront trust and before manual ad-readiness checks. Focused operator-smoke-plan/inquiry-guard/source/release/PR checks and full `npm run validate` passed locally. No live read-only run has been performed yet.
- 2026-07-16: D-435 local smoke-plan attribution preflight added so `/smokeplan` runs `npm run test:attribution` after inquiry guard and before manual ad-readiness checks. Focused operator-smoke-plan/attribution/source/release/PR checks and full `npm run validate` passed locally. No live read-only run has been performed yet.

## Image QC Schema Check

Command:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
```

What it does:

- Loads `.env.local` and `.env` without printing secret values.
- Connects directly to PostgreSQL.
- Reads only `information_schema.columns`.
- Checks D-355 Image QC product columns and the `products_image_quality_defect_flags` relation.

What it never does:

- No DDL.
- No Payload updates.
- No external channel dispatch.
- No Shopier API calls.
- No job queue writes.

Latest verification:

- 2026-06-30: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-06-30: Confirmed read-only run found missing product columns `image_quality_status`, `image_quality_notes`, `image_quality_checked_at`, `image_quality_checked_by`, `image_quality_source`, plus missing relation `products_image_quality_defect_flags` with expected columns `order`, `parent_id`, `value`, `id`. Repair plan file: `scripts/sql/d355-image-qc-schema.sql`.
- 2026-07-02: Confirmed read-only run passed. All 5 required `image_quality_*` product columns are present and the `products_image_quality_defect_flags` relation has all 4 required columns. The command now points next to `smoke:product-flow:read`, `smoke:ad-readiness:read`, and `smoke:shopier:read`.

## Image QC Schema Apply Helper

Command:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

What it does:

- Reads the reviewed SQL plan at `scripts/sql/d355-image-qc-schema.sql`.

## BlogPosts Featured-Image Schema Check

The D-462 check is operator-run only and is not part of `validate` because it may connect to the configured PostgreSQL database:

```powershell
npm run smoke:blog-schema:read -- --confirm-read-only
```

- Reads only `information_schema` and `pg_constraint` metadata for `blog_posts.featured_image_id`, `media.id`, and their foreign key; the reviewed repair requires PostgreSQL `integer` IDs plus the exact `featured_image_id -> public.media.id ON DELETE SET NULL` contract, and reports incompatible types or existing conflicting constraints before any apply can be considered.
- Refuses to connect unless `--confirm-read-only` or `UYAA_BLOG_SCHEMA_CONFIRM=READ_ONLY` is supplied.
- Refuses mutation, apply, and DDL flags.
- Does not import Payload, write data, push schema, queue jobs, publish, dispatch channels, call Shopier/providers, activate SupplierScout, revive retired channels, sync OpenClaw, or spend on ads.
- D-462 was created after `npm run build` safely fell back from blog sitemap routes when the configured database reported `blog_posts.featured_image_id` missing. The pre-apply 2026-07-24 read-only check confirmed that `blog_posts` and `media` exist while the relationship column and foreign key were missing. The separately approved additive migration has since been applied to the configured database; the post-apply read-only check passes.

## BlogPosts Featured-Image Schema Apply Helper

The D-462 repair helper is dry-run by default:

```powershell
npm run db:blog-featured-image:apply
npm run db:blog-featured-image:apply -- --dry-run --print-sql
```

It does not connect to PostgreSQL or execute DDL in dry-run mode. The reviewed additive SQL lives at `scripts/sql/d462-blog-featured-image-schema.sql`. It requires the existing `blog_posts` and `media` tables, then adds the missing `featured_image_id`, foreign key, and index only when absent.

Confirmed apply mode is operator-approved only:

```powershell
npm run db:blog-featured-image:apply -- --apply --confirm-apply-d462-blog-featured-image-schema
```

After an approved apply, run the read-only preflight and then `npm run build`. Do not run confirmed apply mode without explicit operator approval.
- Defaults to dry-run only and does not connect to PostgreSQL.
- Prints the SQL file path, byte count, short SHA-256 fingerprint, and planned schema changes.
- With `--print-sql`, prints the reviewed SQL plan for operator review.
- With explicit apply confirmation, loads env files, connects directly to PostgreSQL, runs the reviewed DDL, then verifies the D-355 columns/relation through `information_schema`.

What it must not do without explicit operator approval:

- No confirmed apply mode.
- No production DDL.
- No database mutation.

Latest verification:

- 2026-06-30: Added as a guarded helper. Codex should test only dry-run/refusal paths unless the operator explicitly approves the confirmed apply command.
- 2026-07-02: Dry-run with `--dry-run --print-sql` completed without opening a database connection or executing DDL. Current SQL bytes: `2484`; sha256: `c22e5c5a9b701fc8`.

## Shopier Order-ID Uniqueness Schema Check

D-481 adds an operator-run, read-only PostgreSQL preflight for the partial
unique index that protects non-empty Shopier order IDs:

```powershell
npm run smoke:shopier-order-id-schema:read -- --confirm-read-only
```

It inspects `information_schema`, `pg_indexes`, and duplicate non-empty
`orders.shopier_order_id` values. It refuses mutation flags, does not import
Payload, and does not run DDL. A missing or incompatible index is a blocked
result, not permission to apply it automatically.

Latest approved result, 2026-07-25: `orders.shopier_order_id` is nullable
`character varying`, duplicate non-empty IDs are `0`, and the approved
concurrent partial unique-index apply completed. The post-apply read-only check
confirms `orders_shopier_order_id_unique_idx` is present. PostgreSQL's canonical
`btrim((shopier_order_id)::text)` predicate form is accepted by the checker;
this preserves the same non-empty-ID constraint. `npm run test:shopier-webhook-local`
also passes. Do not infer permission for a live Shopier webhook smoke from this
database verification.

The separate helper is dry-run by default and opens no database connection in
that mode:

```powershell
npm run db:shopier-order-id-unique:apply -- --dry-run --print-sql
npm run db:shopier-order-id-unique:apply -- --apply --confirm-apply-d481-shopier-order-id-unique
```

The confirmed command must be used only after an explicit operator decision.
After an approved apply, rerun this read-only preflight and
`npm run test:shopier-webhook-local` before any live Shopier webhook smoke.

## Next Manual Runtime Smoke

After the read-only smoke and both temp mutation smoke paths pass:

1. Use Telegram `/smokeplan` as the operator checklist for the safe order.
2. Try activation from Payload admin UI on a prepared non-smoke product when an operator is ready.
3. Try activation through the Telegram operator path when an operator is ready.
4. Run `smoke:load-plan:read` and live-smoke `/loadplan`, then use the first worklist flow command for `smoke:product-flow:read` and live-smoke `/productflow` with an operator present.
5. Run `smoke:provider-health:read`, then live-smoke `/diagnostics` with an operator present.
6. Run `npm run test:shopier-webhook-local` before any Shopier live webhook smoke.
7. Live-smoke `/adready`, `/adpack`, `/business`, `/funnel`, `smoke:lead-followup:read`, `/leadplan`, `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` with an operator present.
8. Use the Shopier row `/productflow <ref>` and exact `smoke:product-flow:read -- --product=<ref> --confirm-read-only` handoffs before any Shopier confirm action.
9. Verify `SHOPIER_PAT`, Shopier webhook readiness, account permission, and quota/readiness outside chat before queueing or retrying Shopier jobs.
10. Confirm the product becomes active only when Payload's activation guard passes.
11. Confirm dispatch notes show Website as native and only Instagram, Facebook, X, or Shopier as external results.
12. Record failures in `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`.
# D-499 Image QC Remediation Queue Smoke

Run `npm run smoke:image-qc-plan:read -- --confirm-read-only` before a batch
Image QC decision or any manual generation work. It reads real Payload products
with `PAYLOAD_DB_PUSH=false`, groups blockers, and prints only read-only
`/imageplan`/Product Flow handoffs. It never records QC, queues image work,
calls providers or Shopier, publishes, dispatches, activates SupplierScout,
revives retired channels, or spends.

For protected-brand products, `smoke:product-flow:read` and
`smoke:image-plan:read` also read the latest matching provenance BotEvent. A
recorded evidence, copy-fix, or keep-excluded decision advances the manual
diagnostic only; it never records QC, changes a product, clears the hard gate,
queues, publishes, dispatches, calls a provider or Shopier, or spends.
