# Knowledge Management Workflow

Last updated: 2026-07-24

## Recommended Tool Split

- Obsidian: project brain, decisions, architecture, roadmap.
- ChatGPT Project: use this source pack for current context.
- GitHub/repo: code, commits, branches, PRs, issues.
- Payload admin: products, orders, stock, content.
- Hermes/Mentix: current operator assistant and skills.
- OpenClaw: historical/optional skill host only if explicitly reactivated.
- n8n: optional workflow glue.

## Obsidian

The root vault notes are the compact project control center:

- `00_HOME.md`: entry point and daily control loop.
- `01_CURRENT_TRUTH.md`: architecture, channels, release, and approval gates.
- `02_MASTER_ROADMAP.md`: phase status and safe next work.
- `03_BOT_OWNERSHIP.md`: Payload/Next, Hermes/Mentix, GeoBot, OpenClaw, n8n, and SupplierScout ownership.
- `04_ACTIVE_DECISIONS.md`: durable business, channel, and operating decisions.

Keep richer historical material in `project-control/` and this source pack. Do not use Obsidian as a credential store, customer database, or proof that an optional service is deployed.

## ChatGPT Project Sources

Use this folder as the source set.

Do not upload raw transcripts or the whole repo.

## GitHub Issues Or Project Board

Use GitHub for executable tasks:

- bug
- feature
- refactor
- ops
- docs

Obsidian is for thinking. GitHub is for doing.

## AI Agent Guidance

Add or maintain:

- `AGENTS.md` for Codex.
- `CLAUDE.md` for Claude.

Those files should match the current truth in this folder.

## D-463 Durable Skill Memory Rule

Mentix/Hermes may retain only durable, PII-light project decisions in `project-control/` and the relevant document in this source pack. Do not treat product/customer data, raw Telegram messages, credentials, unverified VPS state, failed provider output, or agent drafts as durable system memory. OpenClaw skill files are optional templates unless reactivated and verified; they are not a second source of truth.

## D-465 Obsidian Control Rule

When architecture, bot, channel, roadmap, or approval-gate truth changes, update the root Obsidian control note and the matching source-pack document in the same local change. `npm run test:obsidian-control` protects the five root notes against the old OpenClaw-current wording and checks their shared Payload/Hermes/n8n/channel/SupplierScout truth. It is included in `npm run validate`.
