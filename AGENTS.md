# AGENTS.md

Current truth for Codex and other repo agents. Last updated: 2026-06-21.

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

`npm run validate` currently runs typecheck and lint. Lint warnings are allowed; lint errors fail the command.

## Do Not Touch Without Explicit Reason

- Secrets or env files
- Raw chat archives
- Production credentials
- External posts/listings on the operator's behalf
- SupplierScout activation
- Dolap/Threads channel code

## First-Sprint Priority

Validation and project-control rails come before feature work. Product workflow polish starts after validation remains usable.

