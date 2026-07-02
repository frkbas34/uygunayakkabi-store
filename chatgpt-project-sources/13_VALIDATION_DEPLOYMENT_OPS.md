# Validation, Deployment, And Ops

Last updated: 2026-07-02

## Current Validation Status

As of 2026-07-02, `npm run validate` passes. It runs TypeScript, ESLint, brand-safety assertions, product-media assertions, product-stock assertions, product-lifecycle assertions, operator-readiness summary assertions, source-pack governance assertions, retired-channel governance assertions, n8n optionality governance assertions, deployment ops runbook governance assertions, SupplierScout dormancy assertions, Mentix/OpenClaw skill-governance assertions, product-admin-visibility assertions, product-channel-normalization and channel-drift assertions, product-flow snapshot assertions, publish-readiness/coherence/pipeline-diagnostic assertions, business-desk assertions, funnel-desk assertions, catalog-QA assertions, category-fill assertions, image-quality assertions, Shopier publish-control, admin-gate, and safe-retry assertions, state-coherence repair assertions, Telegram caption parser assertions, Telegram confirmation-wizard channel assertions, channel-dispatch assertions, dispatch-state assertions, channel provider-health assertions, Product Intelligence provider-health assertions, redispatch assertions, automation-decision assertions, product-activation-guard assertions including direct sold-out admin-save normalization and generated-image QC gating, Publish Desk activation smoke assertions, and ad-readiness assertions. Lint warnings remain, but lint errors or failed assertions fail the command.

Runtime smoke checks are separate from validation because they may connect to the real Payload database. The first guarded runtime check is:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
```

It loads local env files without printing secrets, forces `PAYLOAD_DB_PUSH=false`, reads one product, and reports lifecycle/readiness/stock/targets/activation blockers/coherence without writing or dispatching.

The guarded mutation smoke is:

```powershell
npm run smoke:activation:mutate -- --product=<smoke-product-id> --confirm-mutate-and-rollback
npm run smoke:activation:mutate -- --create-temp-smoke --confirm-create-mutate-delete
npm run smoke:activation:mutate -- --create-temp-smoke --admin-direct-update --confirm-create-mutate-delete
```

It is operator-run only and not part of `validate`. Existing-product mode requires a `SMOKE`/`TEST` draft, website-only targets, no external channel flags, and explicit confirmation. Temp mode creates a prepared website-only smoke draft from an existing media item. Helper mode activates through `approveAndActivateProduct()`. Admin-direct mode activates through a plain Payload `status='active'` update. Both verify active status, then roll back the product snapshot and delete smoke bot-events. Temp mode also deletes the temp product.

The guarded Product Flow Snapshot read-only smoke is:

```powershell
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product by id or stock number, builds the same lifecycle/readiness/activation/Image-QC/Shopier/dispatch/coherence/next-action snapshot used by Telegram `/productflow`, and never updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, or pushes schema changes.

The guarded provider-health read-only smoke is:

```powershell
npm run smoke:provider-health:read -- --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads AutomationSettings, evaluates Website/Instagram/Facebook/X/Shopier provider health through the same helper used by Telegram `/diagnostics`, and prints provider states plus missing key names only. It never prints secret values, updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, or pushes schema changes.

The guarded Product Intelligence provider-health smoke is:

```powershell
npm run smoke:pi-provider-health:read -- --confirm-read-only
```

It is operator-run only and not part of `validate`. It loads env files, evaluates Gemini text/image readiness, Google Vision, DataForSEO, SerpAPI, and effective reverse-search provider selection, and prints provider states plus missing key names only. It does not connect to Payload, call providers, print secret values, update data, queue jobs, dispatch channels, call Shopier, or push schema changes.

The guarded ad-readiness smoke is:

```powershell
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, reads one Payload product by id or stock number, mirrors Telegram `/adready`, and reports product-page, clean-media, stock/size, channel-link, UTM, lead-visibility, brand-safety, risky-claim, and no-autonomous-spend checks. It never updates Payload, queues jobs, dispatches channels, calls providers, calls Shopier, spends on ads, or pushes schema changes.

The guarded Business/Funnel read-only smoke is:

```powershell
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:business-funnel:read -- --period=week --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, runs the same helpers as Telegram `/business` and `/funnel`, and reports lead, order, revenue, stock-urgency, source/funnel, direct-order, and attribution coverage counts. It never updates Payload, mutates leads/orders/stock, queues jobs, dispatches channels, calls providers, calls Shopier, spends on ads, or pushes schema changes.

The guarded Shopier read-only smoke is:

```powershell
npm run smoke:shopier:read -- --confirm-read-only
npm run smoke:shopier:read -- --product=<id> --confirm-read-only
```

It is operator-run only and not part of `validate`. It forces `PAYLOAD_DB_PUSH=false`, mirrors `/shopier dashboard`, `/shopier publish-ready`, `/shopier errors`, and `/shopier retry-errors` against real Payload state, and never updates Payload, queues jobs, dispatches channels, calls Shopier, or pushes schema changes.

The guarded Image QC schema check is:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
```

It is operator-run only and not part of `validate`. It checks PostgreSQL `information_schema` only and never runs DDL, updates Payload, queues jobs, dispatches channels, calls Shopier, or pushes schema changes.

The guarded Image QC schema apply helper is:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

Default mode is dry-run only and does not connect to PostgreSQL. Confirmed apply mode is operator-run only: it reads `scripts/sql/d355-image-qc-schema.sql`, requires the explicit confirmation flag, runs the reviewed DDL, then checks the D-355 columns/relation through `information_schema`. Codex/Claude should not run confirmed apply mode without explicit operator approval.

Latest schema/smoke attempt (2026-07-02): `smoke:imageqc:schema` ran read-only and passed: all 5 `image_quality_*` product columns and the `products_image_quality_defect_flags` relation are present. `db:imageqc:apply -- --dry-run --print-sql` remains a dry-run preview only and now reports SQL bytes `2484` and sha256 `c22e5c5a9b701fc8`. `smoke:product-flow:read -- --product=359 --confirm-read-only` completed without writes and showed product `359` active with all active targets, no coherence/channel drift, Image QC review as the current readiness blocker, Shopier already synced, and X dispatch failed due to credits depleted. `smoke:provider-health:read -- --confirm-read-only` completed without writes/jobs/dispatch/provider calls/Shopier calls/schema push and found Website ready, Instagram disabled in AutomationSettings, Facebook missing Page ID/webhook, X missing OAuth/webhook, and Shopier missing `SHOPIER_PAT`/webhook. `smoke:pi-provider-health:read -- --confirm-read-only` completed without Payload connection, provider calls, writes, jobs, dispatch, Shopier calls, or schema push; it found Gemini text/image ready, `GEMINI_IMAGE_GEN_MODEL` override present, and reverse search missing because Google Vision, DataForSEO, and SerpAPI credentials are not configured locally. `smoke:shopier:read -- --confirm-read-only --limit=5` completed without writes/jobs/dispatch/API calls and found 0 new publish candidates, 0 sync errors, 0 retry candidates, and `SHOPIER_PAT configured: no`. `smoke:ad-readiness:read -- --product=359 --confirm-read-only` completed without writes/jobs/dispatch/provider calls/Shopier calls/ad spend/schema push and correctly blocked manual ads until generated-image QC PASS is recorded, with one risky-claim warning. `smoke:business-funnel:read -- --confirm-read-only` completed without writes/jobs/dispatch/API calls/ad spend/schema push and found 6 open leads, 5 stale leads, 1 sold-out product, no open orders, and no today funnel activity; `--period=week` found 2 website leads and 1 attributed lead with UTM/referrer detail.

Latest runtime smoke verification: product `359` passed the read-only smoke on 2026-06-23 with readiness `6/6`, effective stock `10`, all active targets, no activation blockers, and no coherence issues. Product `359` also correctly refused the mutation smoke before mutation because it is a real active product with external targets. Helper temp-smoke created product `363`, activated it, verified `status=active`, restored state, deleted `2` smoke bot-events, and deleted the temp product. Admin-direct temp-smoke created product `364`, activated it by direct Payload update, verified `status=active`, `workflowStatus=active`, and `publishStatus=published`, restored state, and deleted the temp product. Both paths evaluated external channels as skipped; no channels dispatched and no Shopier job queued.

## Previous Validation Problem

The repo has existing validation noise:

- `npm run lint` uses `next lint`, which is invalid for the current Next version.
- TypeScript is blocked by stale generated files and old scripts.
- `sessions` and `tmp/next-build` can mislead type checks.
- Old soak scripts import stale absolute paths.

## Phase 1 Fixes

Added reliable scripts:

- `npm run typecheck`
- `npm run lint`
- `npm run test:brand-safety`
- `npm run test:product-media`
- `npm run test:product-stock`
- `npm run test:lifecycle`
- `npm run test:operator-readiness`
- `npm run test:source-pack`
- `npm run test:retired-channels`
- `npm run test:n8n-optional`
- `npm run test:ops-runbook`
- `npm run test:supplierscout-dormant`
- `npm run test:mentix-skills`
- `npm run test:admin-visibility`
- `npm run test:product-channels`
- `npm run test:product-flow-snapshot`
- `npm run test:publish-readiness`
- `npm run test:business-desk`
- `npm run test:funnel-desk`
- `npm run test:catalog-qa`
- `npm run test:category-fill`
- `npm run test:image-quality`
- `npm run test:shopier-publish-control`
- `npm run test:state-coherence`
- `npm run test:telegram-parser`
- `npm run test:confirmation-wizard`
- `npm run test:channel-dispatch`
- `npm run test:dispatch-status`
- `npm run test:provider-health`
- `npm run test:pi-provider-health`
- `npm run test:redispatch`
- `npm run test:automation-decision`
- `npm run test:activation-guard`
- `npm run test:publish-desk`
- `npm run smoke:activation:read` (operator-run, read-only runtime smoke; not part of `validate`)
- `npm run smoke:activation:mutate` (operator-run, guarded mutation smoke with rollback; not part of `validate`)
- `npm run smoke:product-flow:read` (operator-run, read-only Product Flow Snapshot smoke; not part of `validate`)
- `npm run smoke:provider-health:read` (operator-run, read-only provider-health smoke; not part of `validate`)
- `npm run smoke:pi-provider-health:read` (operator-run, env-only Product Intelligence provider-health smoke; not part of `validate`)
- `npm run smoke:ad-readiness:read` (operator-run, read-only ad/PDP readiness smoke; not part of `validate`)
- `npm run smoke:business-funnel:read` (operator-run, read-only `/business` and `/funnel` smoke; not part of `validate`)
- `npm run smoke:imageqc:schema` (operator-run, read-only DB schema check; not part of `validate`)
- `npm run smoke:shopier:read` (operator-run, read-only Shopier command smoke; not part of `validate`)
- `npm run db:imageqc:apply` (operator-run, guarded D-355 schema apply helper; dry-run by default; not part of `validate`)
- `npm run test:safe`
- `npm run validate`

Excluded from validation:

- `sessions`
- `tmp`
- stale generated Next validator files
- broken historical soak scripts

Source-pack governance now checks that `chatgpt-project-sources/` stays at or below 20 Markdown files, required current-truth/roadmap/bot/ops/update/retirement files exist, active channel decisions remain Website/Instagram/Facebook/X/Shopier, SupplierScout remains dormant in the decision pack, and active control artifacts do not re-list Dolap/Threads.

Retired-channel governance checks that active code, n8n workflow stubs, package activation scripts, and current decision docs do not reintroduce Dolap/Threads. Negative tests may still mention retired channels to prove they are rejected.

n8n optionality governance checks that n8n remains optional glue, workflow JSON files stay limited to active-channel fallback paths, missing webhook env vars remain scaffold/no-throw behavior, package scripts do not activate n8n workflows, and the legacy automation endpoint remains Payload-first/draft-first.

Deployment ops runbook governance checks `project-control/DEPLOYMENT_OPS_RUNBOOK.md` for the current deploy, rollback, env-var, webhook-health, cron/job-runner, D-355 DB drift, n8n optionality, SupplierScout dormancy, retired-channel, source-pack, and GitHub PR workflow guardrails.

SupplierScout dormancy validation checks that `/api/supplier-scout` is gated by `SUPPLIER_SCOUT_ENABLED=true` before webhook processing, daily reports, or webhook registration can run; that Vercel has no SupplierScout cron; that package scripts do not activate it; and that the repo/source-pack guidance still says it is dormant.

Mentix/OpenClaw skill governance validation checks that repo-side skill docs keep OpenClaw/Mentix as the agent and skill layer, Payload/Next as the source of truth, n8n as optional glue only, active channels as Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, SupplierScout dormant, and `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` as the deployment sync checklist.

## Deployment Checks

Current runbook: `project-control/DEPLOYMENT_OPS_RUNBOOK.md`.

Before deploy:

- Typecheck/lint/validate pass or known exceptions are documented.
- Before deploying or syncing OpenClaw skills, run `npm run test:mentix-skills` and follow `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md`.
- Env var changes are listed.
- Payload schema changes are understood.
- Vercel cron changes are checked.
- Telegram webhooks are checked when bot code changes.
- Shopier job processing is checked when publishing changes.
- For activation/product-flow changes, run the read-only runtime smoke on one prepared product before manual admin/Telegram activation smoke. Product `359` is the current known-good activation read-only smoke baseline. Use `smoke:product-flow:read` when the change affects `/productflow`, readiness summaries, Shopier gate summaries, dispatch summaries, or next-action guidance.
- For provider or external-channel dispatch changes, run `npm run smoke:provider-health:read -- --confirm-read-only` before relying on `/diagnostics`, redispatch, Shopier queueing, or external-channel publishing checks.
- For Product Intelligence, GEO, comparison, or provider-selection changes, run `npm run smoke:pi-provider-health:read -- --confirm-read-only` before relying on Gemini, Google Vision, DataForSEO, SerpAPI, or reverse-search capability.
- For PDP conversion, UTM, manual ad checklist, or lead-path changes, run `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` before treating a product as ready for manual ads or paid traffic.
- For lead/order/funnel/stock-urgency visibility changes, run `npm run smoke:business-funnel:read -- --confirm-read-only` and, when source attribution matters, `npm run smoke:business-funnel:read -- --period=week --confirm-read-only`.
- For mutation-path proof, prefer the temp smoke commands. Use helper mode for Telegram/Publish Desk logic and `--admin-direct-update` for direct admin-save behavior. Existing-product mode is only for prepared website-only `SMOKE`/`TEST` drafts. Never use it on a real catalog product.
- For D-355 Image QC DB drift, preview with `npm run db:imageqc:apply -- --dry-run --print-sql`; run confirmed apply mode only with explicit operator approval, then rerun `smoke:imageqc:schema`, `smoke:provider-health:read`, `smoke:pi-provider-health:read`, `smoke:product-flow:read`, `smoke:ad-readiness:read`, and `smoke:shopier:read`.

## Webhook Health

Track:

- Telegram webhook URL
- pending update count
- last error
- secret/header status
- slow handler/read-timeout risk

## Rollback Needs

Maintain:

- deployment log
- last known good commit
- env var map
- manual rollback steps
