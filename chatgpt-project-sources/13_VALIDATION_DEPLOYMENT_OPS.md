# Validation, Deployment, And Ops

Last updated: 2026-06-23

## Current Validation Status

As of 2026-06-23, `npm run validate` passes. It runs TypeScript, ESLint, brand-safety assertions, product-media assertions, product-stock assertions, product-lifecycle assertions, operator-readiness summary assertions, source-pack governance assertions, SupplierScout dormancy assertions, Mentix/OpenClaw skill-governance assertions, product-admin-visibility assertions, product-channel-normalization and channel-drift assertions, publish-readiness/coherence/pipeline-diagnostic assertions, state-coherence repair assertions, Telegram caption parser assertions, Telegram confirmation-wizard channel assertions, channel-dispatch assertions, dispatch-state assertions, provider-health assertions, redispatch assertions, automation-decision assertions, product-activation-guard assertions including direct sold-out admin-save normalization, and Publish Desk activation smoke assertions. Lint warnings remain (75 warnings in the latest run), but lint errors or failed assertions fail the command.

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
- `npm run test:supplierscout-dormant`
- `npm run test:mentix-skills`
- `npm run test:admin-visibility`
- `npm run test:product-channels`
- `npm run test:publish-readiness`
- `npm run test:state-coherence`
- `npm run test:telegram-parser`
- `npm run test:confirmation-wizard`
- `npm run test:channel-dispatch`
- `npm run test:dispatch-status`
- `npm run test:provider-health`
- `npm run test:redispatch`
- `npm run test:automation-decision`
- `npm run test:activation-guard`
- `npm run test:publish-desk`
- `npm run smoke:activation:read` (operator-run, read-only runtime smoke; not part of `validate`)
- `npm run smoke:activation:mutate` (operator-run, guarded mutation smoke with rollback; not part of `validate`)
- `npm run test:safe`
- `npm run validate`

Excluded from validation:

- `sessions`
- `tmp`
- stale generated Next validator files
- broken historical soak scripts

Source-pack governance now checks that `chatgpt-project-sources/` stays at or below 20 Markdown files, required current-truth/roadmap/bot/ops/update/retirement files exist, active channel decisions remain Website/Instagram/Facebook/X/Shopier, SupplierScout remains dormant in the decision pack, and active control artifacts do not re-list Dolap/Threads.

SupplierScout dormancy validation checks that `/api/supplier-scout` is gated by `SUPPLIER_SCOUT_ENABLED=true` before webhook processing, daily reports, or webhook registration can run; that Vercel has no SupplierScout cron; that package scripts do not activate it; and that the repo/source-pack guidance still says it is dormant.

Mentix/OpenClaw skill governance validation checks that repo-side skill docs keep OpenClaw/Mentix as the agent and skill layer, Payload/Next as the source of truth, n8n as optional glue only, active channels as Website/Instagram/Facebook/X/Shopier, Dolap/Threads retired, SupplierScout dormant, and `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md` as the deployment sync checklist.

## Deployment Checks

Before deploy:

- Typecheck/lint/validate pass or known exceptions are documented.
- Before deploying or syncing OpenClaw skills, run `npm run test:mentix-skills` and follow `mentix-skills/OPENCLAW_DEPLOYMENT_SYNC.md`.
- Env var changes are listed.
- Payload schema changes are understood.
- Vercel cron changes are checked.
- Telegram webhooks are checked when bot code changes.
- Shopier job processing is checked when publishing changes.
- For activation changes, run the read-only runtime smoke on one prepared product before manual admin/Telegram activation smoke. Product `359` is the current known-good read-only smoke baseline.
- For mutation-path proof, prefer the temp smoke commands. Use helper mode for Telegram/Publish Desk logic and `--admin-direct-update` for direct admin-save behavior. Existing-product mode is only for prepared website-only `SMOKE`/`TEST` drafts. Never use it on a real catalog product.

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
