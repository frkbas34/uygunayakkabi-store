# UygunAyakkabi Project Home

Last updated: 2026-06-23

This is the Obsidian entry note for the project.

## Current Truth

UygunAyakkabi is a Telegram-first, AI-assisted commerce system for our own products only.

Active channels:

- Website
- Instagram
- Facebook
- X
- Shopier

Retired or dormant:

- Dolap retired
- Threads retired
- SupplierScout dormant
- n8n optional glue

## Main Sources

- [[01_CURRENT_TRUTH]]
- [[02_MASTER_ROADMAP]]
- [[03_BOT_OWNERSHIP]]
- [[04_ACTIVE_DECISIONS]]
- `chatgpt-project-sources/`
- `AGENTS.md`
- `CLAUDE.md`

## Current Build Focus

1. Keep validation usable.
2. Keep project control docs synced.
3. Continue Phase 2 product workflow polish.
4. Smoke-test live admin and Telegram operator paths with the operator present.

## Validation

```powershell
npm run validate
```

The command should pass before feature work is considered ready.

Latest verified state: `npm run validate` passes on 2026-06-23 with lint warnings only. Product `359` also passes the read-only activation smoke.
