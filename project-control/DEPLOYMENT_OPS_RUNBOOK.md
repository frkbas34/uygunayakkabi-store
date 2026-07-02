# Deployment And Ops Runbook

Last updated: 2026-06-30

This is the current Phase 9 deploy, rollback, env, webhook, cron, job-runner, and PR workflow runbook for UygunAyakkabi.

## Scope

Current product strategy:

- Own products only.
- Payload/Next is the source of truth for products, media, orders, leads, stock, bot events, AI jobs, publishing status, and job queues.
- Active channels are Website, Instagram, Facebook, X, and Shopier.
- Dolap and Threads are retired.
- SupplierScout is dormant.
- n8n is optional glue only; it is not the project brain or a required deploy dependency.
- Shopier remains the checkout/sales bridge; website-native checkout is deferred.

Do not deploy, register, cron, or operate Dolap, Threads, or SupplierScout unless the operator explicitly reverses the current decision.

## Pre-Deploy Validation

Run the local checks before a deploy is considered ready:

```powershell
npm run typecheck
npm run lint
npm run validate
```

`npm run validate` must give a real signal. Lint warnings are currently acceptable; lint errors or failed assertions are not.

The safe suite includes current governance checks:

- `npm run test:source-pack`
- `npm run test:retired-channels`
- `npm run test:n8n-optional`
- `npm run test:ops-runbook`
- `npm run test:supplierscout-dormant`
- `npm run test:mentix-skills`

If the change touches source-pack truth, roadmap, bot ownership, channels, validation, or major milestones, update `chatgpt-project-sources/` in the same change and keep the folder under 20 Markdown documents.

## Environment Review

Review env var names and presence without printing secret values.

Core app:

- `DATABASE_URI`
- `PAYLOAD_SECRET`
- `NEXT_PUBLIC_SERVER_URL`
- `BLOB_READ_WRITE_TOKEN`

Telegram/operator:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`

Automation and jobs:

- `AUTOMATION_SECRET`
- `CRON_SECRET`

AI/provider keys:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- Provider-specific optional keys only when the active feature needs them.

Commerce and publishing:

- `SHOPIER_PAT`
- `SHOPIER_WEBHOOK_TOKEN`
- Meta/Instagram/Facebook tokens or AutomationSettings records used by the direct publishers.
- Optional `N8N_CHANNEL_*_WEBHOOK` values only if n8n fallback dispatch is intentionally used.

Dormant/retired guard:

- Do not add SupplierScout env vars as a deploy prerequisite while SupplierScout is dormant.
- Do not add Dolap or Threads env vars.
- If `SUPPLIER_SCOUT_ENABLED` exists, it must remain unset or false unless the operator explicitly reactivates SupplierScout.

## Database And Schema Changes

Payload schema changes must be understood before deploy. Do not rely on production auto-push.

D-355 Image QC drift has a guarded repair helper:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

The default apply helper mode is dry-run only. Do not run confirmed apply mode without explicit operator approval.

After an approved D-355 apply:

```powershell
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:provider-health:read -- --confirm-read-only
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

Never run DDL, migrations, schema push, external dispatch, Shopier calls, or queue writes from a smoke command that is documented as read-only.

## Webhook Health

Check webhooks after code changes that affect Telegram, Shopier, Geo/Product Intelligence, or optional n8n fallback routing.

Telegram/Mentix:

- Verify webhook URL points to the current deployment.
- Verify secret/header validation is configured.
- Check pending update count and last error.
- Run `npm run smoke:provider-health:read -- --confirm-read-only` before using `/diagnostics` as provider/credential evidence.
- Send an operator-safe command such as `/diagnostics` only when an operator is present.

Shopier:

- Verify `SHOPIER_WEBHOOK_TOKEN` is configured.
- Check recent order webhook logs.
- Use read-only smoke before relying on publish queue commands:

```powershell
npm run smoke:shopier:read -- --confirm-read-only
```

Geo/Product Intelligence:

- Keep outputs operator-controlled.
- Do not let AI content activate or publish a product without the product readiness and brand-safety gates.
- Run `npm run smoke:pi-provider-health:read -- --confirm-read-only` before relying on Product Intelligence, GEO content, or comparison automation provider readiness.

Storefront/manual ads:

- Ads remain deferred until catalog depth and image quality are strong.
- Run `npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only` before treating any product as ready for manual paid traffic.
- The command mirrors Telegram `/adready` and must not write, publish, queue jobs, call providers, call Shopier, spend on ads, or push schema changes.

Orders/leads/funnel:

- Run `npm run smoke:business-funnel:read -- --confirm-read-only` before relying on `/business`, `/funnel`, lead source visibility, order counts, stock urgency, or basic funnel analytics.
- Use `--period=week` when source attribution or 7-day funnel visibility matters.
- The command must not mutate leads, orders, stock, products, jobs, channels, providers, Shopier, ads, or schema.

n8n:

- Treat n8n webhooks as optional fallback paths.
- Missing `N8N_CHANNEL_*_WEBHOOK` values should skip dispatch without throwing.
- Do not import or activate new n8n workflows as part of a normal app deploy.

SupplierScout:

- SupplierScout webhook registration must stay disabled while SupplierScout is dormant.
- Do not call `/api/supplier-scout?action=register_webhook` unless SupplierScout is explicitly reactivated.

## Cron And Job Runner Health

Before deploy:

- Confirm `CRON_SECRET` is present if Payload jobs are expected to run.
- Confirm Vercel cron or the chosen runner is configured for `/api/payload-jobs/run`.
- Confirm no SupplierScout cron is registered while SupplierScout is dormant.
- Confirm no retired Dolap or Threads jobs are registered.

After deploy:

- Check the latest job-runner response.
- Check failed Payload jobs.
- Check Shopier sync queue counts.
- Check image/AI job queues if the change touched AI images, GEO, or product intelligence.

## Deploy Sequence

1. Review code diff and ensure no secrets or raw chat archives are included.
2. Run `npm run validate`.
3. Run targeted read-only smoke checks if the change affects runtime behavior.
4. Confirm env var changes are documented without exposing values.
5. Confirm schema/DDL steps are documented and approved if needed.
6. Deploy through the normal hosting path.
7. Watch build logs until success or failure is clear.
8. Verify storefront loads.
9. Verify Payload admin loads.
10. Verify Telegram/operator health only with safe commands.

## Post-Deploy Smoke

Use read-only smoke first:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
npm run smoke:product-flow:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:provider-health:read -- --confirm-read-only
npm run smoke:pi-provider-health:read -- --confirm-read-only
npm run smoke:ad-readiness:read -- --product=<id-or-sn> --confirm-read-only
npm run smoke:business-funnel:read -- --confirm-read-only
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

Then, with the operator present, run only the relevant manual checks:

- `/diagnostics`
- `/pipeline <id>`
- `/productflow <id-or-sn>`
- `/catalogqa`
- `/categoryfill`
- `/adready <id-or-sn>`
- `/business`
- `/funnel`
- `/shopier dashboard`
- `/shopier publish-ready`
- `/shopier errors`
- `/shopier retry-errors`

Do not use confirm variants such as `/shopier publish-ready confirm` or `/shopier retry-errors confirm` unless the operator approves queueing.

## Rollback Sequence

1. Identify the last known good deployment or commit.
2. Record what failed: build, schema, webhook, job queue, dispatch, storefront, admin, or checkout.
3. Disable risky feature flags or optional env vars first when that stops the incident safely.
4. Redeploy the last known good version or revert the specific PR.
5. If schema changed, use the reviewed rollback SQL or documented manual repair. Do not improvise destructive SQL.
6. Re-run read-only smoke checks.
7. Log the incident and recovery in `project-control/DEPLOYMENT_LOG.md`.

## GitHub PR Workflow

For Codex/Claude changes:

- Work in small branches when possible.
- Keep the source pack synced when current truth changes.
- Run `npm run validate` before asking for review.
- Include validation output and known warnings in the PR notes.
- Mention any operator-only smoke checks that were not run.
- Do not stage, commit, push, or open a PR unless the operator asks for it.
- Do not merge while D-355 DB drift or another live DB blocker is unresolved unless the PR is explicitly documentation-only or validation-only.

## After Action

After each meaningful deploy or rollback:

- Update `project-control/DEPLOYMENT_LOG.md`.
- Update `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md` if validation/deploy rules changed.
- Update `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md` if a milestone or blocker changed.
- Leave retired channels retired, SupplierScout dormant, and n8n optional unless the operator explicitly changes strategy.
