# Runtime Smoke Checks

Last updated: 2026-07-02

Runtime smoke checks are operator-run diagnostics. They may connect to the real Payload database, so they are separate from `npm run validate`.

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
- Prints lifecycle, readiness, activation blockers, image QC, Shopier queue gate, active-channel dispatch state, channel/coherence drift, and next actions.

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

Latest verification:

- 2026-07-02: Usage mode refused without `--confirm-read-only` before database connection.
- 2026-07-02: Confirmed read-only `today` run loaded `.env.local` and `.env`, forced `PAYLOAD_DB_PUSH=false`, and completed without writes, jobs, dispatches, provider calls, Shopier calls, ad spend, or schema pushes. Result: 6 open leads, 5 stale leads, 0 open orders, 1 sold-out product, 0 low-stock products, and no today funnel activity.
- 2026-07-02: Confirmed read-only `week` run completed with the same business snapshot and a 7-day funnel of 2 website leads, 0 converted orders, 0 direct orders, and 1 lead with attribution detail.

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

## Next Manual Runtime Smoke

After the read-only smoke and both temp mutation smoke paths pass:

1. Try activation from Payload admin UI on a prepared non-smoke product when an operator is ready.
2. Try activation through the Telegram operator path when an operator is ready.
3. Run `smoke:provider-health:read`, then live-smoke `/diagnostics` with an operator present.
4. Live-smoke `/productflow`, `/adready`, `/business`, `/funnel`, `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` with an operator present.
5. Verify `SHOPIER_PAT` before queueing or retrying Shopier jobs.
6. Confirm the product becomes active only when Payload's activation guard passes.
7. Confirm dispatch notes show Website as native and only Instagram, Facebook, X, or Shopier as external results.
8. Record failures in `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`.
