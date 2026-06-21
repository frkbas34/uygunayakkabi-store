# CLAUDE.md

Current guidance for Claude Code. Last updated: 2026-06-21.

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

## Validation

Use:

```powershell
npm run validate
```

This should pass before a change is considered ready. Warnings are acceptable for now; errors are not.

## Documentation Sync

If a change affects roadmap, architecture, bot roles, active channels, validation, or major milestones, update `chatgpt-project-sources/` in the same task.

Keep that folder below 20 Markdown documents.

## Working Style

- Prefer incremental changes.
- Keep Payload as source of truth.
- Avoid broad refactors unless needed.
- Do not touch secrets.
- Do not mutate external systems without explicit operator approval.

