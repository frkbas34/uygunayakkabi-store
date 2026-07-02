# AGENTS.md

Current truth for Codex and other repo agents. Last updated: 2026-07-02.

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

Catalog scale-up is the active focus. D-355 structured Image QC is implemented and the latest read-only schema smoke passes. D-356 Shopier/Web batch publish control is in progress: `/shopier dashboard` is read-only operator visibility, `/shopier publish-ready` is preview-first, `/shopier publish-ready confirm` queues only products that pass the shared Shopier/Web gate, single `/shopier publish|republish` commands use the same guard, `/shopier errors` gives first-pass sync error triage, `/shopier retry-errors` previews safe retry candidates before `/shopier retry-errors confirm` queues them, and Payload admin ReviewPanel shows a read-only Shopier Queue Gate for the current product using the same evaluator. Phase 2/3 operator diagnostics now include read-only `/productflow <sn-or-id>` and `/flow <sn-or-id>`, backed by `src/lib/productFlowSnapshot.ts`, to summarize lifecycle, readiness, activation blockers, image QC, Shopier gate, dispatch state, coherence issues, and next actions without writing or publishing. Phase 7 business/funnel diagnostics are now covered by `test:business-desk`, `test:funnel-desk`, and read-only `smoke:business-funnel:read`, mirroring Telegram `/business` and `/funnel`. Latest read-only smokes on 2026-07-02: D-355 schema PASS, product-flow smoke for product `359` completed, channel provider-health smoke completed with Website ready, Instagram disabled, Facebook/X/Shopier missing provider requirements, PI provider-health smoke completed with Gemini ready but no reverse-search provider configured locally, Shopier read-only smoke completed with no publish/error/retry candidates but `SHOPIER_PAT` not configured, ad-readiness smoke for product `359` completed but blocked manual ads until generated-image QC PASS is recorded, and business/funnel smoke completed with 6 open leads, 5 stale leads, 1 sold-out product, and a 7-day website funnel count of 2 leads.

## Required Source-Pack Rule

The ChatGPT Project source pack lives in `chatgpt-project-sources/` and must stay under 20 Markdown files.

If you change roadmap, current truth, architecture, bot roles, channel decisions, validation, or major milestones, update the source pack in the same change.

## Required Memory Sync Rule

Frank explicitly requires every repo change made by Hermes/agents to be recorded in the relevant in-repo memory/context files in the same task, without exception. This prevents Claude/Codex from hallucinating stale project state. At minimum consider `project-control/CLAUDE_MEMORY.md`, `PROJECT_STATE.md`, `TASK_QUEUE.md`, `BUGS_AND_FIXES.md`, `DEPLOYMENT_LOG.md`, this `AGENTS.md`, `CLAUDE.md`, and relevant `chatgpt-project-sources/` files. Record only what actually happened; never record secrets.

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

`test:safe` also includes `test:product-flow-snapshot`, which keeps the read-only `/productflow` helper aligned with the current product workflow and active-channel rules.

Read-only runtime smoke checks:

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

These require explicit read-only confirmation and must not write, queue jobs, dispatch channels, call providers, call Shopier, spend on ads, or push schema changes. Channel provider-health smoke reads AutomationSettings and prints provider states plus missing key names only, never secret values. PI provider-health smoke is env-only and checks Gemini, Google Vision, DataForSEO, SerpAPI, and reverse-search selection without connecting to Payload or calling providers. Ad-readiness smoke reads one real product and mirrors Telegram `/adready` for product-page, media, stock/size, UTM, lead visibility, and brand-safety checks. Business/funnel smoke reads lead, order, product, and stock diagnostics through the same helpers as Telegram `/business` and `/funnel`.

Guarded D-355 DB repair helper:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

The default mode is dry-run only. Do not run the confirmed apply mode unless the operator explicitly approves applying the reviewed D-355 Image QC DDL. After apply, rerun `smoke:imageqc:schema`, `smoke:provider-health:read`, `smoke:pi-provider-health:read`, `smoke:product-flow:read`, `smoke:ad-readiness:read`, and `smoke:shopier:read`.

## Do Not Touch Without Explicit Reason

- Secrets or env files
- Raw chat archives
- Production credentials
- External posts/listings on the operator's behalf
- SupplierScout activation
- Dolap/Threads channel code

## First-Sprint Priority

Validation and project-control rails come before feature work. Product workflow polish starts after validation remains usable.
