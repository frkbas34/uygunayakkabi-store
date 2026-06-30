# CLAUDE.md

Current guidance for Claude Code. Last updated: 2026-06-30.

## Read This First

This project has a lot of old planning history. Treat this file, `AGENTS.md`, and `chatgpt-project-sources/` as the current truth.

Do not restart the architecture from old chat exports.

## What We Are Building

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for our own products only.

Payload is the source of truth. The app owns product data, storefront behavior, publishing state, jobs, orders, leads, and stock.

Mentix/OpenClaw is the operator agent layer. It should reason, diagnose, draft, and help the operator. It should not become the database or independent publishing source.

## Active And Inactive Channels

Active:

- Website
- Instagram
- Facebook
- X
- Shopier

Inactive:

- Dolap is retired.
- Threads is retired.
- SupplierScout is dormant.

Do not add Dolap/Threads UI, parser targets, n8n stubs, prompts, or task items.

## n8n Position

n8n is optional glue. Keep it frozen unless the user explicitly asks for n8n work or a current workflow clearly depends on it.

## Current Build Focus

Catalog scale-up is the active focus. D-355 structured Image QC is implemented. D-356 Shopier/Web batch publish control is in progress: `/shopier dashboard` is read-only operator visibility, `/shopier publish-ready` is preview-first, `/shopier publish-ready confirm` queues only products that pass the shared Shopier/Web gate, single `/shopier publish|republish` commands use the same guard, `/shopier errors` gives first-pass sync error triage, `/shopier retry-errors` previews safe retry candidates before `/shopier retry-errors confirm` queues them, and Payload admin ReviewPanel shows a read-only Shopier Queue Gate for the current product using the same evaluator.

## Validation

Use:

```powershell
npm run validate
```

This should pass before a change is considered ready. It runs typecheck, lint, and the safe assertion suite. Warnings are acceptable for now; errors are not.

The safe suite includes `test:retired-channels`, which blocks Dolap/Threads from active code, n8n workflow stubs, package activation scripts, and current decision docs.

It also includes `test:n8n-optional`, which keeps n8n as optional glue, checks the allowed active-channel workflow inventory, and blocks package scripts from activating n8n workflows by default.

It also includes `test:ops-runbook`, which keeps the deployment, rollback, env-var, webhook-health, cron/job-runner, and PR workflow runbook aligned with the current architecture rules.

Read-only runtime smoke checks:

```powershell
npm run smoke:activation:read -- --product=<id> --confirm-read-only
npm run smoke:imageqc:schema -- --confirm-read-only
npm run smoke:shopier:read -- --confirm-read-only
```

These require explicit read-only confirmation and must not write, queue jobs, dispatch channels, call Shopier, or push schema changes.

Guarded D-355 DB repair helper:

```powershell
npm run db:imageqc:apply
npm run db:imageqc:apply -- --dry-run --print-sql
npm run db:imageqc:apply -- --apply --confirm-apply-d355-image-qc-schema
```

Default mode is dry-run only. Do not run the confirmed apply mode unless the operator explicitly approves applying the reviewed D-355 Image QC DDL. After apply, rerun `smoke:imageqc:schema` and `smoke:shopier:read`.

## Documentation Sync

If a change affects roadmap, architecture, bot roles, active channels, validation, or major milestones, update `chatgpt-project-sources/` in the same task.

Keep that folder below 20 Markdown documents.

## Working Style

- Prefer incremental changes.
- Keep Payload as source of truth.
- Avoid broad refactors unless needed.
- Do not touch secrets.
- Do not mutate external systems without explicit operator approval.
