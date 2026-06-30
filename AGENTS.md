# AGENTS.md

Current truth for Codex and other repo agents. Last updated: 2026-06-30.

## Project Direction

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for selling and uploading our own products only.

Payload is the source of truth for products, media, orders, leads, stock, bot events, AI jobs, and publishing status.

## Active Channels

- Website
- Instagram
- Facebook
- X
- Shopier

Do not reintroduce Dolap or Threads. They are retired.

SupplierScout is dormant. Do not activate it, add cron for it, register its webhook, or build around supplier products unless the user explicitly reverses the decision.

## Architecture Boundaries

- Next/Payload executes product, storefront, publishing, jobs, and database workflows.
- Mentix/OpenClaw is the agent and skill layer for reasoning, diagnostics, drafting, and operator support.
- n8n is optional glue only. Do not build new n8n workflows unless there is a clear current need.
- Shopier remains the checkout/sales bridge for now. Website-native checkout is deferred.

## Current Build Focus

Catalog scale-up is the active focus. D-355 structured Image QC is implemented. D-356 Shopier/Web batch publish control is in progress: `/shopier dashboard` is read-only operator visibility, `/shopier publish-ready` is preview-first, `/shopier publish-ready confirm` queues only products that pass the shared Shopier/Web gate, single `/shopier publish|republish` commands use the same guard, `/shopier errors` gives first-pass sync error triage, `/shopier retry-errors` previews safe retry candidates before `/shopier retry-errors confirm` queues them, and Payload admin ReviewPanel shows a read-only Shopier Queue Gate for the current product using the same evaluator.

## Required Source-Pack Rule

The ChatGPT Project source pack lives in `chatgpt-project-sources/` and must stay under 20 Markdown files.

If you change roadmap, current truth, architecture, bot roles, channel decisions, validation, or major milestones, update the source pack in the same change.

Most important files:

- `chatgpt-project-sources/01_CURRENT_TRUTH.md`
- `chatgpt-project-sources/02_MASTER_ROADMAP.md`
- `chatgpt-project-sources/04_BOTS_AND_AUTOMATIONS.md`
- `chatgpt-project-sources/13_VALIDATION_DEPLOYMENT_OPS.md`
- `chatgpt-project-sources/17_OPEN_QUESTIONS_AND_NEXT_SPRINT.md`

## Validation Commands

Use these before claiming a change is healthy:

```powershell
npm run typecheck
npm run lint
npm run validate
```

`npm run validate` currently runs typecheck, lint, and `test:safe`. Lint warnings are allowed; lint errors or failed assertions fail the command.

`test:safe` includes `test:retired-channels`, which blocks Dolap/Threads from active code, n8n workflow stubs, package activation scripts, and current decision docs.

`test:safe` also includes `test:n8n-optional`, which keeps n8n as optional glue, checks the allowed active-channel workflow inventory, and blocks package scripts from activating n8n workflows by default.

`test:safe` also includes `test:ops-runbook`, which keeps the deployment, rollback, env-var, webhook-health, cron/job-runner, and PR workflow runbook aligned with the current architecture rules.

Read-only runtime smoke checks:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

These connect to Payload only with explicit read-only confirmation and must not write, queue jobs, dispatch channels, call Shopier, or push schema changes.

Guarded D-355 DB repair helper:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

The default mode is dry-run only. Do not run the confirmed apply mode unless the operator explicitly approves applying the reviewed D-355 Image QC DDL. After apply, rerun `smoke:imageqc:schema` and `smoke:shopier:read`.

## Do Not Touch Without Explicit Reason

- Secrets or env files
- Raw chat archives
- Production credentials
- External posts/listings on the operator's behalf
- SupplierScout activation
- Dolap/Threads channel code

## First-Sprint Priority

Validation and project-control rails come before feature work. Product workflow polish starts after validation remains usable.
